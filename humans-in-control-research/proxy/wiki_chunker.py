"""Markdown-aware chunker for wiki articles.

Splits a markdown body into ~512-token chunks with 64-token overlap, respecting
h2/h3 boundaries and paragraph breaks. Each chunk knows its parent section
header so retrieval can cite the precise passage instead of just the article.

Used at:
  - article write time (_embed_and_cache_article in app.py): chunk → embed each.
  - backfill (/api/wiki/embed-rebuild): walks all articles + transcripts +
    uploads + sources, chunks each, embeds, stores.

Constants (tunable per-quality-vs-cost):
  CHUNK_TOKENS = 512   # max tokens per chunk; text-embedding-3-small accepts 8192
  OVERLAP_TOKENS = 64  # carry-over between consecutive chunks (~12.5%)
  MIN_CHUNK_TOKENS = 64  # below this, merge with neighbor (avoid tiny noise chunks)

Return shape per chunk:
  {
    "text": str,           # the chunk content (sent to embedding API + stored)
    "section": str,        # nearest h2/h3 ancestor, or "" if none
    "char_start": int,     # offset within original (frontmatter-stripped) body
    "char_end": int,
    "token_count": int,
    "idx": int,            # 0..N within the article
  }
"""
from __future__ import annotations

import re
from typing import Iterable

import tiktoken

CHUNK_TOKENS = 512
OVERLAP_TOKENS = 64
MIN_CHUNK_TOKENS = 64
STRIDE_TOKENS = CHUNK_TOKENS - OVERLAP_TOKENS  # 448

# text-embedding-3-small uses cl100k_base (verified)
_ENC = tiktoken.get_encoding("cl100k_base")


def _strip_frontmatter(content: str) -> str:
    """Strip a YAML frontmatter block delimited by --- if present at the start."""
    if content.startswith("---\n") or content.startswith("---\r\n"):
        idx = content.find("\n---\n", 4)
        if idx == -1:
            idx = content.find("\n---\r\n", 4)
            if idx != -1:
                return content[idx + 7:]
            return content
        return content[idx + 5:]
    return content


def _count_tokens(text: str) -> int:
    if not text:
        return 0
    return len(_ENC.encode(text, disallowed_special=()))


# Header detection: h1/h2/h3 markdown headers. We track h2 + h3 as section
# context (h1 is usually the article title — already in metadata).
_H2_RE = re.compile(r"^(?P<hashes>##)\s+(?P<title>.+?)\s*$", re.MULTILINE)
_H3_RE = re.compile(r"^(?P<hashes>###)\s+(?P<title>.+?)\s*$", re.MULTILINE)


def _split_on_headers(body: str) -> list[tuple[str, int, str]]:
    """Return list of (section_title, char_start, section_text) tuples.

    Uses h2 boundaries first; sections without h2 break on h3. If neither
    exists, returns [("", 0, body)] so downstream can still chunk by paragraph.
    """
    matches = list(_H2_RE.finditer(body))
    if not matches:
        # Try h3 if no h2 anywhere
        matches = list(_H3_RE.finditer(body))
    if not matches:
        return [("", 0, body)]

    sections: list[tuple[str, int, str]] = []
    # Content before the first header (preamble) goes in an unnamed section
    if matches[0].start() > 0:
        preamble = body[: matches[0].start()].strip()
        if preamble:
            sections.append(("", 0, preamble))

    for i, m in enumerate(matches):
        title = m.group("title").strip()
        section_start = m.end()
        section_end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        section_text = body[section_start:section_end].strip()
        if section_text:
            sections.append((title, section_start, section_text))

    return sections


def _split_paragraphs(text: str) -> list[tuple[str, int]]:
    """Return [(paragraph_text, char_offset_within_input)] split on blank lines."""
    out: list[tuple[str, int]] = []
    cursor = 0
    for para in re.split(r"\n\s*\n", text):
        if not para.strip():
            cursor = text.find(para, cursor) + len(para)
            continue
        offset = text.find(para, cursor)
        if offset == -1:
            offset = cursor
        out.append((para, offset))
        cursor = offset + len(para)
    return out


def _token_window_split(text: str, base_offset: int) -> Iterable[tuple[str, int, int, int]]:
    """Yield (chunk_text, char_start_in_body, char_end_in_body, token_count) for
    a single oversized text via overlapping token windows."""
    tokens = _ENC.encode(text, disallowed_special=())
    if len(tokens) <= CHUNK_TOKENS:
        yield text, base_offset, base_offset + len(text), len(tokens)
        return

    # Map char offsets per token by re-decoding incrementally; less work than
    # tiktoken's offset API which doesn't exist as of 0.12.
    # We slice by token count and use decoded length as an approximation of
    # char span — good enough for citation, not load-bearing.
    pos = 0
    while pos < len(tokens):
        chunk_tokens = tokens[pos : pos + CHUNK_TOKENS]
        chunk_text = _ENC.decode(chunk_tokens)
        # char span: approximate by cumulative decode of preceding + this
        prefix_len = len(_ENC.decode(tokens[:pos])) if pos > 0 else 0
        char_start = base_offset + prefix_len
        char_end = char_start + len(chunk_text)
        yield chunk_text, char_start, char_end, len(chunk_tokens)
        pos += STRIDE_TOKENS
        if pos + OVERLAP_TOKENS >= len(tokens):
            break


def chunk_markdown(content: str) -> list[dict]:
    """Chunk a wiki article body into a list of chunk dicts.

    Pipeline:
      1. Strip YAML frontmatter.
      2. Split on h2 (or h3 if no h2) headers → sections.
      3. For each section: if it fits in one chunk, emit as-is.
         Else split on paragraphs (blank-line); pack greedy until limit.
         Paragraph that itself exceeds limit → token-window split with overlap.
      4. Merge any chunks below MIN_CHUNK_TOKENS into the next neighbor.

    Frontmatter offsets are NOT preserved — char_start/char_end are relative to
    the post-frontmatter body. That's the canonical addressable space for
    retrieval (the LLM sees this text, not the metadata).
    """
    body = _strip_frontmatter(content)
    if not body.strip():
        return []

    raw_chunks: list[dict] = []  # {text, section, char_start, char_end, token_count}

    for section_title, section_offset, section_text in _split_on_headers(body):
        section_tokens = _count_tokens(section_text)

        if section_tokens <= CHUNK_TOKENS:
            # Whole section fits — one chunk
            raw_chunks.append({
                "text": section_text,
                "section": section_title,
                "char_start": section_offset,
                "char_end": section_offset + len(section_text),
                "token_count": section_tokens,
            })
            continue

        # Section is large — pack paragraphs greedily until limit
        paras = _split_paragraphs(section_text)
        buf_text: list[str] = []
        buf_tokens = 0
        buf_start: int | None = None
        buf_end: int | None = None

        def flush():
            nonlocal buf_text, buf_tokens, buf_start, buf_end
            if buf_text and buf_start is not None and buf_end is not None:
                joined = "\n\n".join(buf_text)
                raw_chunks.append({
                    "text": joined,
                    "section": section_title,
                    "char_start": section_offset + buf_start,
                    "char_end": section_offset + buf_end,
                    "token_count": _count_tokens(joined),
                })
            buf_text = []
            buf_tokens = 0
            buf_start = None
            buf_end = None

        for para_text, para_offset_within_section in paras:
            para_tokens = _count_tokens(para_text)

            if para_tokens > CHUNK_TOKENS:
                # Oversized paragraph — flush buffer, then token-window split
                flush()
                for chunk_text, c_start, c_end, t_count in _token_window_split(
                    para_text, section_offset + para_offset_within_section
                ):
                    raw_chunks.append({
                        "text": chunk_text,
                        "section": section_title,
                        "char_start": c_start,
                        "char_end": c_end,
                        "token_count": t_count,
                    })
                continue

            if buf_tokens + para_tokens > CHUNK_TOKENS and buf_text:
                flush()

            if buf_start is None:
                buf_start = para_offset_within_section
            buf_end = para_offset_within_section + len(para_text)
            buf_text.append(para_text)
            buf_tokens += para_tokens

        flush()

    # Merge chunks below MIN_CHUNK_TOKENS into the next neighbor
    merged: list[dict] = []
    pending: dict | None = None
    for c in raw_chunks:
        if pending is not None:
            combined_tokens = pending["token_count"] + c["token_count"]
            if combined_tokens <= CHUNK_TOKENS:
                pending["text"] = pending["text"] + "\n\n" + c["text"]
                pending["token_count"] = combined_tokens
                pending["char_end"] = c["char_end"]
                # Keep section from pending if same, else concat
                if c["section"] and c["section"] != pending["section"]:
                    pending["section"] = (pending["section"] + " / " + c["section"]).strip(" /")
                continue
            else:
                merged.append(pending)
                pending = None

        if c["token_count"] < MIN_CHUNK_TOKENS:
            pending = c
        else:
            merged.append(c)

    if pending is not None:
        if merged:
            last = merged[-1]
            if last["token_count"] + pending["token_count"] <= CHUNK_TOKENS:
                last["text"] = last["text"] + "\n\n" + pending["text"]
                last["token_count"] += pending["token_count"]
                last["char_end"] = pending["char_end"]
            else:
                merged.append(pending)
        else:
            merged.append(pending)

    # Assign idx, drop empty
    final: list[dict] = []
    for i, c in enumerate(merged):
        if not c["text"].strip():
            continue
        c["idx"] = len(final)
        final.append(c)

    return final


# ============================================================================
# 2026-06-06 — Manifest-frontmatter contract layer.
# The chunk_markdown() function above produces embedding-ready chunks with
# `{text, section, char_start, char_end, token_count, idx}`. The contract
# below adapts those chunks into the wiki's MANIFEST POINTER shape:
#   - stable id = <source_path>#c<idx>
#   - char_span = [char_start, char_end]
#   - sentence_count + key_terms for fast pre-retrieval ranking
# The frontmatter helpers upsert a `chunks:` block at the top of each wiki
# page so the manifest can address sub-document spans by pointer at
# generation time (replaces RAG-style full-body injection).
# ============================================================================

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)
_WORD_KT_RE = re.compile(r"\b[a-z][a-z0-9'-]{2,}\b")
_SENT_KT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"'])")

_KT_STOPWORDS = frozenset({
    "the", "and", "for", "are", "but", "not", "you", "your", "with", "this",
    "that", "from", "have", "has", "had", "was", "were", "will", "would",
    "could", "should", "they", "them", "their", "there", "these", "those",
    "what", "when", "where", "which", "while", "who", "whom", "why", "how",
    "into", "onto", "upon", "about", "after", "before", "between", "during",
    "than", "then", "very", "much", "more", "most", "some", "any", "all",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "first", "second", "third", "also", "just", "only", "even", "ever",
    "every", "each", "other", "such", "same", "both", "many", "few", "over",
    "under", "again", "once", "still", "yet", "may", "might", "must", "can",
    "well", "way", "make", "made", "say", "said", "see", "know", "think",
    "his", "her", "him", "she", "its", "our", "out", "off", "now", "yes",
    "really", "actually", "basically", "literally", "thing", "things", "stuff",
})


def _kt_extract(text: str, top_n: int = 8) -> list[str]:
    """Deterministic key-term extraction (count * mild length bonus, alpha
    tie-break). Used to surface a chunk's topic shape into the manifest so
    generators can pre-rank candidate chunks by relevance before fetching."""
    if not text:
        return []
    tokens = _WORD_KT_RE.findall(text.lower())
    counts: dict[str, int] = {}
    for t in tokens:
        if t in _KT_STOPWORDS:
            continue
        counts[t] = counts.get(t, 0) + 1
    if not counts:
        return []
    scored = [
        (cnt * (1.0 + max(0, len(tok) - 4) * 0.08), tok)
        for tok, cnt in counts.items()
    ]
    scored.sort(key=lambda kv: (-kv[0], kv[1]))
    return [tok for _, tok in scored[:top_n]]


def _kt_count_sentences(text: str) -> int:
    if not text:
        return 0
    return max(1, len(_SENT_KT_RE.split(text)))


def _concept_extract(text: str, top_n: int = 5) -> list[str]:
    """WS-G (2026-06-30): coarser than key_terms - fewer, longer, higher-frequency tokens = the
    chunk's dominant CONCEPTS. These seed the manifest CONCEPT GRAPH: related_chunks (intra-doc
    concept adjacency, computed here) and, in WS-G(traversal)/Stage 2, cross-doc concept-walk
    retrieval. Deterministic (same input -> same output). Requires >=2 mentions + length >=5 so a
    concept is a real recurring topic, not an extraction artifact."""
    if not text:
        return []
    tokens = _WORD_KT_RE.findall(text.lower())
    counts: dict[str, int] = {}
    for t in tokens:
        if len(t) >= 5 and t not in _KT_STOPWORDS:
            counts[t] = counts.get(t, 0) + 1
    if not counts:
        return []
    scored = [
        (cnt * (1.0 + max(0, len(tok) - 5) * 0.1), tok)
        for tok, cnt in counts.items() if cnt >= 2
    ]
    scored.sort(key=lambda kv: (-kv[0], kv[1]))
    return [tok for _, tok in scored[:top_n]]


_INLINE_SRC_LABEL_RE = __import__("re").compile(r"\bSources?:\s*(.+?)(?:\n|$)", __import__("re").IGNORECASE)
_INLINE_SRC_LINK_RE = __import__("re").compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
# D3 guard (2026-07-01): reject junk "source names" - provider buckets (never cite "gemini"/"openai" per the
# citation rules) and URL-as-name (raw redirect links). Deep-research pages carry "Source: [gemini](vertexai
# redirect)" placeholders in the body; those are NOT real sources - the doc-level resolved_sources frontmatter
# (read via the #14 page-level tier at cite time) is their real attribution, so inline junk must be dropped.
_PROVIDER_BUCKET_NAMES = {
    "gemini", "openai", "claude", "anthropic", "deepseek", "gpt", "chatgpt",
    "vertex", "vertexai", "model", "ai", "bot", "source", "sources", "n/a", "na",
}


def _is_junk_source_name(name: str) -> bool:
    n = (name or "").strip().lower()
    if not n or n.startswith("http://") or n.startswith("https://"):
        return True
    return n in _PROVIDER_BUCKET_NAMES


def _extract_inline_sources(text: str) -> list[dict]:
    """D3/#15 (2026-07-01): recover per-chunk real sources from an inline "Source: [Name](url)" line in the
    chunk body, so re-chunking populates the `sources:` frontmatter that resolveChunks/the evidence ledger
    read. Mirrors services/evidenceLedgerService.ts extractInlineSources. HIGH-PRECISION: only on a
    "Source(s):" label, so bot/boilerplate text is never mis-read. Returns [{"n":name,"u":url}]."""
    if not text:
        return []
    out: list[dict] = []
    seen: set[str] = set()
    for m in _INLINE_SRC_LABEL_RE.finditer(text):
        clause = m.group(1)
        had_link = False
        for lm in _INLINE_SRC_LINK_RE.finditer(clause):
            had_link = True
            name = (lm.group(1) or "").strip()
            url = (lm.group(2) or "").strip()
            key = name.lower()
            if name and key not in seen and not _is_junk_source_name(name):
                seen.add(key)
                out.append({"n": name, "u": url})
        if not had_link:
            # 1.5 (2026-10-01): a markdown link whose target is NOT http(s) (a wiki-path dedupe
            # pointer like "[agr_reddit](articles/x.md)") used to leak the raw "[name](path" string
            # as the source name. Take the link TEXT; the page frontmatter carries the real locator.
            _mlink = re.match(r"\s*\[([^\]]+)\]\(", clause)
            name = ((_mlink.group(1) if _mlink else clause.rstrip(")]")).strip())[:80]
            key = name.lower()
            if len(name) >= 2 and key not in seen and not _is_junk_source_name(name):
                seen.add(key)
                out.append({"n": name, "u": ""})
        if len(out) >= 6:
            break
    return out



# ============================================================================
# 1.5 PROVENANCE EVERYWHERE (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, B4,
# phase 3). Per-chunk `sources` used to be written ONLY when a chunk body carried an inline
# "Source: [Name](url)" line or a Gemini groundingSupports match, so Tier 1 of the citation
# resolver fired on roughly a quarter of chunks and every other quote fell back to the page
# title. Every chunk now defaults to the PAGE's real provenance {n, u, kind, date} read from
# the page frontmatter; the inline / grounding paths still win when present (more specific).
# ============================================================================

_FM_SCALAR_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$")


def _fm_unquote(v: str) -> str:
    v = (v or "").strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        inner = v[1:-1]
        if v[0] == '"':
            inner = inner.replace('\\"', '"').replace("\\\\", "\\")
        return inner
    return v


def parse_page_frontmatter(page_text: str) -> dict[str, str]:
    """Flat top-level SCALAR frontmatter -> {key: value}. Nested blocks (`chunks:`, block lists)
    and indented lines are skipped. Hand-rolled on purpose: the writer (`_yaml_scalar`) is
    hand-rolled too and the proxy carries no PyYAML dependency. Returns {} without frontmatter."""
    if not isinstance(page_text, str):
        return {}
    m = _FRONTMATTER_RE.match(page_text)
    if not m:
        return {}
    out: dict[str, str] = {}
    for raw in m.group(1).splitlines():
        if not raw or raw[0] in (" ", "\t"):
            continue
        mm = _FM_SCALAR_RE.match(raw.rstrip())
        if not mm:
            continue
        key, val = mm.group(1), mm.group(2).strip()
        if not val or val in ("|", ">", "|-", ">-"):
            continue  # block scalar / nested mapping or list -> not a flat scalar
        out[key] = _fm_unquote(val)
    return out


_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3, "apr": 4, "april": 4,
    "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "sept": 9,
    "september": 9, "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
_ISO_DATE_RE = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)")
_SLASH_DATE_RE = re.compile(r"^(\d{4})/(\d{1,2})/(\d{1,2})(?:\D|$)")
# "Tue, 25 Aug 2026 00:57:21 GMT" / "25 August 2026"
_DMY_RE = re.compile(r"^(?:[A-Za-z]{3,9},?\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})")
# "August 25, 2026" / "Aug 25 2026" / "Tuesday, August 25, 2026"
_MDY_RE = re.compile(r"^(?:[A-Za-z]{3,9},?\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})")
_EPOCH_RE = re.compile(r"^(\d{10})(?:\d{3})?(?:\.\d+)?$")


def iso_date(raw) -> str | None:
    """Normalize a publication date string to ISO 8601 `YYYY-MM-DD`, or None when it cannot be
    parsed. Handles RFC 2822 / RSS ("Tue, 25 Aug 2026 00:57:21 GMT"), ISO datetimes with offsets
    or a trailing Z, bare `YYYY-MM-DD`, `YYYY/MM/DD`, "August 25, 2026", "25 August 2026" and
    unix epoch seconds / milliseconds (Reddit `created_utc`). The STATED calendar date is kept;
    no timezone conversion is applied (a GMT timestamp at 00:57 stays on its own day)."""
    import datetime as _dt
    s = str(raw if raw is not None else "").strip()
    if not s:
        return None

    def _mk(y, mo, d):
        try:
            return _dt.date(int(y), int(mo), int(d)).isoformat()
        except (TypeError, ValueError):
            return None

    m = _ISO_DATE_RE.match(s)
    if m:
        return _mk(*m.groups())
    m = _SLASH_DATE_RE.match(s)
    if m:
        return _mk(*m.groups())
    m = _DMY_RE.match(s)
    if m and m.group(2).lower() in _MONTHS:
        return _mk(m.group(3), _MONTHS[m.group(2).lower()], m.group(1))
    m = _MDY_RE.match(s)
    if m and m.group(1).lower() in _MONTHS:
        return _mk(m.group(3), _MONTHS[m.group(1).lower()], m.group(2))
    m = _EPOCH_RE.match(s)
    if m:
        try:
            return _dt.datetime.fromtimestamp(int(m.group(1)), tz=_dt.timezone.utc).date().isoformat()
        except (OverflowError, OSError, ValueError):
            return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s).date().isoformat()
    except Exception:
        return None


_PAGE_SOURCE_KEYS = ("source", "source_name", "publisher", "feed", "site")
_PAGE_KIND_KEYS = ("kind", "type", "source_type")
_PAGE_DATE_KEYS = ("date", "published", "published_at", "pubDate", "pub_date", "created_utc", "created")
_GENERIC_UPLOAD_BUCKETS = {"client uploads", "client-uploads", "client_uploads", "uploads", "upload"}
_SUBREDDIT_RE = re.compile(r"\br/([A-Za-z0-9_]+)")


# Model / provider names only. Placeholders ("n/a", "source", "") are NOT here on purpose: a page whose
# source is a placeholder still has a real identity in its URL or author; a page whose source is a MODEL
# has none at page level (its real sources are resolved_sources + per-chunk grounding).
_PROVIDER_MODEL_NAMES = {"gemini", "openai", "claude", "anthropic", "deepseek", "gpt", "chatgpt", "vertex", "vertexai"}


def _is_provider_bucket_page_source(name: str) -> bool:
    """A page whose `source` is a model/provider bucket ("gemini", "gemini (focused research)")
    has no citable page-level provenance: its real sources live in `resolved_sources` and in the
    per-chunk grounding attribution. A subreddit ABOUT a provider ("reddit-deep: r/gemini") is a
    real source and is NOT a bucket."""
    n = re.sub(r"\(.*?\)", "", (name or "")).strip().lower()
    return n in _PROVIDER_MODEL_NAMES


def page_source_from_frontmatter(fm: dict, source_path: str = "") -> dict | None:
    """Build the page-level provenance record `{n, u, kind?, date?|date_raw?, author?, subreddit?}`
    from flat frontmatter. Returns None when the page has no citable identity (no source name
    and no http URL, a provider-bucket source, or a deep-research synthesis page whose chunks are
    attributed from groundingSupports instead)."""
    if not isinstance(fm, dict):
        return None
    method = (fm.get("method") or "").strip().lower()
    if method == "deep-research":
        return None
    if _is_provider_bucket_page_source(fm.get("source") or ""):
        return None
    url = (fm.get("url") or fm.get("link") or "").strip()
    if not url.lower().startswith(("http://", "https://")):
        url = ""
    name = ""
    for k in _PAGE_SOURCE_KEYS:
        v = (fm.get(k) or "").strip()
        if v and not _is_junk_source_name(v):
            name = v
            break
    title = (fm.get("title") or "").strip()
    # A client upload's `source` is the bucket ("Client Uploads"); the DOCUMENT title is the
    # provenance a reader can check ("(Source: filename)" per the citation protocol).
    if (method == "upload" or name.lower() in _GENERIC_UPLOAD_BUCKETS) and title:
        name = title
    author = (fm.get("author") or "").strip()
    if not name and author and not _is_junk_source_name(author):
        name = author
    if not name and url:
        name = _publisher_from_url(url)
    if not name and source_path and "/" in source_path:
        parts = [p for p in source_path.split("/") if p]
        if len(parts) >= 2:
            name = parts[-2].replace("-", " ").replace("_", " ").strip()
    if not name and not url:
        return None
    rec: dict = {"n": name[:120], "u": url}
    for k in _PAGE_KIND_KEYS:
        v = (fm.get(k) or "").strip().lower()
        if v:
            rec["kind"] = v[:40]
            break
    raw_date = ""
    for k in _PAGE_DATE_KEYS:
        v = (fm.get(k) or "").strip()
        if v:
            raw_date = v
            break
    if raw_date:
        iso = iso_date(raw_date)
        if iso:
            rec["date"] = iso
        else:
            rec["date_raw"] = raw_date[:60]
    if author and not _is_junk_source_name(author) and author.lower() != name.lower():
        rec["author"] = author[:120]
    sub = (fm.get("subreddit") or "").strip()
    if sub.lower().startswith("r/"):
        sub = sub[2:]
    if not sub:
        msub = _SUBREDDIT_RE.search((fm.get("source") or "") + " " + (fm.get("source_name") or ""))
        if msub:
            sub = msub.group(1)
    if sub:
        rec["subreddit"] = sub[:60]
    return rec


def _merge_page_provenance(inline: list[dict], page_src: dict | None) -> list[dict]:
    """Inline sources win (more specific), but when an inline entry IS the page's own source
    (same URL, or same name with no URL) it inherits the page's url / kind / date so Tier 1
    resolution carries the full record instead of a bare name."""
    if not page_src:
        return inline
    pu = (page_src.get("u") or "").strip().lower()
    pn = (page_src.get("n") or "").strip().lower()
    out: list[dict] = []
    for e in inline:
        if not isinstance(e, dict):
            continue
        eu = (e.get("u") or "").strip().lower()
        en = (e.get("n") or "").strip().lower()
        same = bool((eu and eu == pu) or (not eu and en and en == pn))
        if same:
            merged = dict(e)
            if not merged.get("u") and page_src.get("u"):
                merged["u"] = page_src["u"]
            for k in ("kind", "date", "date_raw", "author", "subreddit"):
                if k not in merged and k in page_src:
                    merged[k] = page_src[k]
            out.append(merged)
        else:
            out.append(e)
    return out

def chunk_for_manifest(body: str, source_path: str) -> list[dict]:
    """Manifest-shape chunker. Wraps `chunk_markdown` (the existing
    embedding-aware chunker) and remaps every chunk to the contract shape:

        {
            "id": "<source_path>#c<idx>",   # stable pointer
            "char_span": [start, end],       # span into post-frontmatter body
            "sentence_count": N,
            "key_terms": [...],
            "section": str,                  # nearest h2/h3 ancestor or ""
            "token_count": int,              # passthrough for cost budgeting
        }

    The `source_path` is the WIKI PATH the page lives at, e.g.
    "articles/openalex/2024-smith-coop.md". Combining with #c<idx> yields a
    globally unique pointer the resolver can dereference.

    Returns [] when body is empty. Returns one chunk for tiny bodies.
    Deterministic: same input -> same output across runs.
    """
    if not body or not source_path:
        return []
    chunks = chunk_markdown(body)
    # 1.5: page-level provenance, read once from the frontmatter the callers pass in with the body
    # (write-article, wiki-write and the retrofit walker all hand over the FULL page text).
    _page_src = page_source_from_frontmatter(parse_page_frontmatter(body), source_path)
    out: list[dict] = []
    for c in chunks:
        _ctext = c.get("text", "")
        _chunk = {
            "id": f"{source_path}#c{c['idx']}",
            "char_span": [int(c.get("char_start", 0)), int(c.get("char_end", 0))],
            "sentence_count": _kt_count_sentences(_ctext),
            "key_terms": _kt_extract(_ctext, top_n=8),
            # WS-G: dominant concepts for the manifest concept graph.
            "concepts": _concept_extract(_ctext, top_n=5),
            "section": c.get("section", "") or "",
            "token_count": int(c.get("token_count", 0)),
        }
        # D3/#15: populate per-chunk real sources from the chunk's inline "Source:" line so re-chunked pages
        # carry structured `sources:` frontmatter (raises the AIR well-formed ratio; deep-research chunks that
        # already set sources via groundingSupports keep those - this only fills the gap for other pages).
        _inline = _extract_inline_sources(_ctext)
        if _inline:
            _chunk["sources"] = _merge_page_provenance(_inline, _page_src)
        elif _page_src:
            # 1.5: no inline attribution -> the page's own {n,u,kind,date}. attribute_chunks_to_grounding
            # (run by write-article AFTER this) still overrides matched chunks with the grounding source.
            _chunk["sources"] = [dict(_page_src)]
        out.append(_chunk)
    # WS-G: intra-doc concept adjacency. Two chunks that share >=2 concepts are related_chunks
    # (the seed edges of the concept graph WS-G-traversal walks; cross-doc edges are Stage 2).
    for i, ci in enumerate(out):
        si = set(ci.get("concepts") or [])
        if len(si) < 2:
            continue
        rel = [cj["id"] for j, cj in enumerate(out)
               if j != i and len(si & set(cj.get("concepts") or [])) >= 2]
        if rel:
            ci["related_chunks"] = rel[:5]
    return out


# ---------------------------------------------------------------------------
# Frontmatter helpers — read / merge chunks into existing wiki-page text
# ---------------------------------------------------------------------------

def _yaml_scalar(s) -> str:
    """Render a scalar safe to embed as a YAML value. Hand-rolled (no PyYAML
    dep) since the shape is fixed and trivial. Quote on YAML-special chars."""
    if isinstance(s, (int, float)):
        return str(s)
    s = str(s)
    if not s:
        return '""'
    if re.search(r"[,\[\]\{\}:#&*!|>'\"%@`\n]", s):
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    if s.lower() in ("null", "true", "false", "yes", "no", "on", "off"):
        return '"' + s + '"'
    return s


def _serialize_chunks_yaml(chunks: list[dict]) -> str:
    """Emit the chunks list as a YAML sub-block. Flat shape, no nesting."""
    if not chunks:
        return "chunks: []\n"
    lines = ["chunks:"]
    for c in chunks:
        cs = c.get("char_span") or [0, 0]
        terms = c.get("key_terms") or []
        terms_yaml = "[" + ", ".join(_yaml_scalar(t) for t in terms) + "]"
        lines.append(f"  - id: {_yaml_scalar(c.get('id', ''))}")
        lines.append(f"    char_span: [{int(cs[0])}, {int(cs[1])}]")
        lines.append(f"    sentence_count: {int(c.get('sentence_count', 0))}")
        lines.append(f"    key_terms: {terms_yaml}")
        # WS-G: concept graph fields.
        if c.get("concepts"):
            concepts_yaml = "[" + ", ".join(_yaml_scalar(t) for t in c["concepts"]) + "]"
            lines.append(f"    concepts: {concepts_yaml}")
        if c.get("related_chunks"):
            rc_yaml = "[" + ", ".join(_yaml_scalar(r) for r in c["related_chunks"]) + "]"
            lines.append(f"    related_chunks: {rc_yaml}")
        if c.get("section"):
            lines.append(f"    section: {_yaml_scalar(c.get('section', ''))}")
        if c.get("token_count"):
            lines.append(f"    token_count: {int(c.get('token_count', 0))}")
        # 2026-06-30 - PER-CHUNK REAL SOURCE ATTRIBUTION. For deep-research synthesis
        # docs, each chunk's actual supporting source(s) (from Gemini groundingSupports)
        # are stored here so a quote from THIS chunk resolves to its REAL source, not
        # the whole-doc synthesis bucket. 1.5 (2026-10-01): every other chunk carries the
        # page's own provenance by default. Compact JSON:
        # [{"n":name,"u":url,"kind":kind,"date":"YYYY-MM-DD"|"date_raw":raw,"author"?,"subreddit"?}].
        if c.get("sources"):
            import json as _json
            lines.append(f"    sources: {_json.dumps(c['sources'], separators=(',', ':'), ensure_ascii=True)}")
    lines.append("")
    return "\n".join(lines)


def _publisher_from_url(url: str) -> str:
    """Lightweight publisher label from a URL host (fallback when no page title)."""
    try:
        from urllib.parse import urlparse
        host = (urlparse(url).netloc or "").lower()
        if host.startswith("www."):
            host = host[4:]
        parts = [p for p in host.split(".") if p]
        if not parts:
            return ""
        stem = parts[0] if len(parts) <= 2 else parts[-2]
        return stem.replace("-", " ").replace("_", " ").title()
    except Exception:
        return ""


def attribute_chunks_to_grounding(chunks: list[dict], body: str, grounding_supports: list) -> list[dict]:
    """Attach each chunk's REAL source(s) by overlapping the chunk's body span with
    the grounding segments' verbatim text (offset-robust: matches by text, not index,
    so it survives re-chunking + frontmatter offset shifts).

    grounding_supports: [{"text": str, "sources": [{"url","title"}], ...}, ...]
    Mutates + returns `chunks`, setting chunk["sources"] = [{"n":name,"u":url}] (<=5).
    """
    if not grounding_supports or not body:
        return chunks
    segs = []
    for g in grounding_supports:
        if not isinstance(g, dict):
            continue
        t = (g.get("text") or "").strip()
        srcs = g.get("sources") or []
        if len(t) >= 12 and isinstance(srcs, list) and srcs:
            segs.append((t, srcs))
    if not segs:
        return chunks
    for c in chunks:
        cs = c.get("char_span") or [0, 0]
        try:
            a, b = int(cs[0]), int(cs[1])
        except Exception:
            continue
        ctext = body[a:b] if 0 <= a < b <= len(body) else ""
        if len(ctext) < 12:
            continue
        found, seen = [], set()
        for (t, srcs) in segs:
            probe = t[:120]
            # segment falls inside this chunk, or the chunk falls inside a long segment
            if probe in ctext or ctext[:120] in t:
                for s in srcs:
                    if not isinstance(s, dict):
                        continue
                    url = (s.get("url") or "").strip()
                    name = (s.get("title") or "").strip() or _publisher_from_url(url)
                    key = url or name
                    if key and key not in seen:
                        seen.add(key)
                        found.append({"n": name[:120], "u": url})
        if found:
            c["sources"] = found[:5]
    return chunks


# ============================================================================
# 1.7 CONCEPT GRAPH, chunker half (plan 2026-09-30, B2, phase 4). `related_chunks` written by
# chunk_for_manifest are INTRA-document only (one page in hand at chunk time). The backfill job
# holds every page, so it can propose CROSS-document edges from the per-chunk `concepts` already
# in frontmatter plus any named entities the caller supplies. Pure: nothing is written here.
# ============================================================================

_ENTITY_KEYS = ("entities", "named_entities", "key_entities", "named_institutions", "tags")


def _norm_term(s) -> str:
    return re.sub(r"\s+", " ", str(s if s is not None else "").strip().lower())


def _doc_of_chunk_id(chunk_id: str) -> str:
    return str(chunk_id or "").split("#c", 1)[0]


def _terms_of(d: dict, keys: tuple[str, ...]) -> set[str]:
    out: set[str] = set()
    for k in keys:
        v = d.get(k)
        if isinstance(v, str):
            v = [p for p in re.split(r"[,;|]", v)]
        if isinstance(v, (list, tuple, set)):
            for t in v:
                n = _norm_term(t)
                if len(n) >= 3:
                    out.add(n)
    return out


def _iter_chunk_rows(records_or_pages) -> "Iterable[tuple[str, set[str], set[str], str]]":
    """Yield (chunk_id, concepts, entities, doc) from either CHUNK RECORDS
    ({"id","concepts",["entities"|...],["doc"|"source_path"]}) or PAGES
    ({"id"|"path", "chunks":[...], ["entities"|"named_entities"|"key_entities"|"tags"]}).
    Page-level entities apply to every chunk of that page."""
    for item in records_or_pages or []:
        if not isinstance(item, dict):
            continue
        if isinstance(item.get("chunks"), list):
            page_id = str(item.get("id") or item.get("path") or item.get("source_path") or "")
            page_entities = _terms_of(item, _ENTITY_KEYS)
            for c in item["chunks"]:
                if not isinstance(c, dict) or not c.get("id"):
                    continue
                cid = str(c["id"])
                yield cid, _terms_of(c, ("concepts",)), (_terms_of(c, _ENTITY_KEYS) | page_entities), (page_id or _doc_of_chunk_id(cid))
        elif item.get("id"):
            cid = str(item["id"])
            doc = str(item.get("doc") or item.get("source_path") or item.get("page") or _doc_of_chunk_id(cid))
            yield cid, _terms_of(item, ("concepts",)), _terms_of(item, _ENTITY_KEYS), doc


def build_cross_document_edges(
    records_or_pages,
    max_per_chunk: int = 5,
    *,
    jaccard_threshold: float = 0.25,
    min_shared_concepts: int = 2,
    neighbors: "dict[str, list[str]] | None" = None,
) -> dict[str, list[str]]:
    """Propose cross-document `related_chunks` edges. Returns {chunk_id: [related_ids]} for every
    chunk that has at least one edge; nothing is written.

    An edge between two chunks of DIFFERENT documents exists when either
      - they share >= `min_shared_concepts` concepts AND Jaccard(concepts) >= `jaccard_threshold`
        (two top-5 concept lists sharing 2 give 2/8 = 0.25, the same bar the intra-document rule
        applies in absolute terms), or
      - they share at least one exact named entity.
    Edges are ranked by jaccard + 0.5 * shared_entities, then id (deterministic), and capped at
    `max_per_chunk`. `neighbors` ({chunk_id: [chunk_id, ...]} from the vector store, best first)
    is merged in as a lower tier: a neighbour not already matched by concepts/entities fills the
    remaining slots in its own order; same-document neighbours are dropped (this map is
    cross-document by contract; the intra-document edges already exist on the page).

    Complexity is bounded by an inverted index over concepts and entities, never an n^2 scan.
    """
    rows = list(_iter_chunk_rows(records_or_pages))
    by_id: dict[str, tuple[set[str], set[str], str]] = {}
    order: list[str] = []
    for cid, cs, es, doc in rows:
        if cid in by_id:
            continue
        by_id[cid] = (cs, es, doc)
        order.append(cid)
    c_index: dict[str, list[str]] = {}
    e_index: dict[str, list[str]] = {}
    for cid in order:
        cs, es, _ = by_id[cid]
        for c in cs:
            c_index.setdefault(c, []).append(cid)
        for e in es:
            e_index.setdefault(e, []).append(cid)

    scores: dict[str, dict[str, float]] = {}
    for cid in order:
        cs, es, doc = by_id[cid]
        candidates: set[str] = set()
        for c in cs:
            candidates.update(c_index.get(c, ()))
        for e in es:
            candidates.update(e_index.get(e, ()))
        for other in candidates:
            if other == cid:
                continue
            ocs, oes, odoc = by_id[other]
            if odoc == doc:
                continue
            shared_c = len(cs & ocs)
            union = len(cs | ocs)
            jac = (shared_c / union) if union else 0.0
            shared_e = len(es & oes)
            concept_ok = shared_c >= min_shared_concepts and jac >= jaccard_threshold
            if not concept_ok and shared_e == 0:
                continue
            scores.setdefault(cid, {})[other] = (jac if concept_ok else 0.0) + 0.5 * shared_e

    # Embedding-neighbour tier (optional): fills remaining slots, ranked below any concept/entity edge.
    for cid, nbrs in (neighbors or {}).items():
        if not isinstance(nbrs, (list, tuple)):
            continue
        doc = by_id[cid][2] if cid in by_id else _doc_of_chunk_id(cid)
        for rank, nid in enumerate(nbrs):
            nid = str(nid or "")
            if not nid or nid == cid:
                continue
            ndoc = by_id[nid][2] if nid in by_id else _doc_of_chunk_id(nid)
            if ndoc == doc:
                continue
            bucket = scores.setdefault(cid, {})
            if nid not in bucket:
                bucket[nid] = -1.0 - rank  # strictly below every concept/entity score (>= 0), in neighbour order

    out: dict[str, list[str]] = {}
    for cid, bucket in scores.items():
        if not bucket:
            continue
        ranked = sorted(bucket.items(), key=lambda kv: (-kv[1], kv[0]))
        out[cid] = [oid for oid, _ in ranked[: max(0, int(max_per_chunk))]]
    return out


def has_chunks_frontmatter(page_text: str) -> bool:
    """Quick check: does the page already carry a chunks: frontmatter block?
    Used by the retrofit pass to skip already-chunked pages (idempotency)."""
    if not isinstance(page_text, str):
        return False
    m = _FRONTMATTER_RE.match(page_text)
    if not m:
        return False
    fm = m.group(1)
    return bool(re.search(r"(^|\n)chunks:\s*\n[ \t]+- id:", fm))


def upsert_chunks_into_frontmatter(
    page_text: str,
    chunks: list[dict],
    page_id: str | None = None,
) -> str:
    """Return page_text with the `chunks:` block inserted/replaced inside its
    YAML frontmatter. Idempotent: re-running on a page that already has
    chunks: replaces the block (so re-chunking with a new chunker version
    cleanly updates the frontmatter without leaving stale entries).

    If the page has no frontmatter at all, one is synthesized. `page_id`
    (optional) is added as `id:` when no id is already present.
    """
    if not isinstance(page_text, str):
        return page_text
    chunks_yaml = _serialize_chunks_yaml(chunks)
    m = _FRONTMATTER_RE.match(page_text)
    if not m:
        fm_lines: list[str] = []
        if page_id:
            fm_lines.append(f"id: {_yaml_scalar(page_id)}")
        fm_lines.append(chunks_yaml.rstrip())
        return "---\n" + "\n".join(fm_lines) + "\n---\n" + page_text
    fm = m.group(1)
    body = m.group(2)
    # Strip any existing chunks: block (sequence form, 2-space indent).
    # [ \t]* (NOT \s*) after the key: \s* greedily ate the newline plus the
    # first item's indent, which satisfied the match before the items group
    # ran, so every item line survived as an orphan above the re-inserted
    # block. That single character class corrupted 8,367 wiki pages between
    # 2026-06-10 and 2026-06-11 (repaired in bulk on 2026-06-11).
    fm_no_chunks = re.sub(
        r"(^|\n)chunks:[ \t]*(?:\n[ \t]+.+)*",
        r"\1",
        fm,
    )
    # Belt-and-suspenders: drop any orphaned chunk-item lines left behind by
    # the pre-fix writer so re-chunking a previously corrupted page heals it.
    fm_no_chunks = "\n".join(
        ln for ln in fm_no_chunks.split("\n")
        if not (re.match(r'^\s*-\s+id:\s+"[^"\n]*#c\d+', ln)
                or re.match(r"^[ \t]+(char_span|sentence_count|key_terms|section|token_count):", ln))
    )
    fm_no_chunks = fm_no_chunks.rstrip()
    if page_id and not re.search(r"^id\s*:", fm_no_chunks, re.MULTILINE):
        fm_no_chunks = f"id: {_yaml_scalar(page_id)}\n" + fm_no_chunks
    new_fm = (fm_no_chunks + "\n" + chunks_yaml).rstrip()
    return f"---\n{new_fm}\n---\n{body}"


def extract_chunk_spans(page_text: str) -> list[dict]:
    """Parse the chunks: block out of a page's frontmatter. Returns dicts
    with keys: id, char_span, sentence_count, key_terms (and section/
    token_count when present). Used by the resolver to dereference chunk
    pointers without re-chunking. Returns [] when no chunks block exists."""
    if not isinstance(page_text, str):
        return []
    m = _FRONTMATTER_RE.match(page_text)
    if not m:
        return []
    fm = m.group(1)
    chunks: list[dict] = []
    cur: dict | None = None
    inside_chunks = False
    for raw_line in fm.splitlines():
        line = raw_line.rstrip()
        if not inside_chunks:
            if re.match(r"^chunks:\s*$", line):
                inside_chunks = True
            continue
        # Inside the chunks block.
        if line.startswith("  - id:"):
            if cur is not None:
                chunks.append(cur)
            cur = {"id": _yaml_strip(line.split("id:", 1)[1])}
        elif cur is not None and line.startswith("    char_span:"):
            v = line.split("char_span:", 1)[1].strip()
            mm = re.match(r"\[\s*(\d+)\s*,\s*(\d+)\s*\]", v)
            if mm:
                cur["char_span"] = [int(mm.group(1)), int(mm.group(2))]
        elif cur is not None and line.startswith("    sentence_count:"):
            v = line.split("sentence_count:", 1)[1].strip()
            try:
                cur["sentence_count"] = int(v)
            except ValueError:
                pass
        elif cur is not None and line.startswith("    key_terms:"):
            v = line.split("key_terms:", 1)[1].strip()
            mm = re.match(r"\[(.*)\]", v)
            if mm:
                inner = mm.group(1)
                # Split: quoted strings or bare tokens separated by commas.
                parts = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"|([^,]+)', inner)
                cur["key_terms"] = [
                    (q or b).strip().strip('"').strip()
                    for q, b in parts if (q or b)
                ]
        elif cur is not None and (line.startswith("    concepts:") or line.startswith("    related_chunks:")):
            # WS-G: concept graph fields, same list shape as key_terms.
            field = "concepts" if line.startswith("    concepts:") else "related_chunks"
            v = line.split(":", 1)[1].strip()
            mm = re.match(r"\[(.*)\]", v)
            if mm:
                parts = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"|([^,]+)', mm.group(1))
                cur[field] = [(q or b).strip().strip('"').strip() for q, b in parts if (q or b)]
        elif cur is not None and line.startswith("    section:"):
            cur["section"] = _yaml_strip(line.split("section:", 1)[1])
        elif cur is not None and line.startswith("    token_count:"):
            try:
                cur["token_count"] = int(line.split("token_count:", 1)[1].strip())
            except ValueError:
                pass
        elif cur is not None and line.startswith("    sources:"):
            # WS-A: per-chunk REAL source attribution, written as compact JSON [{"n":name,"u":url}].
            # Previously dropped here, so a quote resolved to the page title, not its real source.
            v = line.split("sources:", 1)[1].strip()
            try:
                import json as _json
                arr = _json.loads(v)
                if isinstance(arr, list):
                    cur["sources"] = [s for s in arr if isinstance(s, dict) and (s.get("n") or s.get("u"))]
            except Exception:
                pass
        elif not line.startswith(" ") and not line.startswith("\t"):
            # Top-level key terminates the chunks block.
            if cur is not None:
                chunks.append(cur)
                cur = None
            break
    if cur is not None:
        chunks.append(cur)
    return chunks


def _yaml_strip(v: str) -> str:
    v = v.strip()
    if v.startswith('"') and v.endswith('"') and len(v) >= 2:
        return v[1:-1].replace('\\"', '"').replace("\\\\", "\\")
    return v


def extract_chunk_text(page_text: str, chunk_id: str) -> str | None:
    """Look up a chunk by id and return the corresponding text span from the
    page body (post-frontmatter). Returns None when the id is not in the
    page's chunks: block or when the char_span is invalid."""
    if not page_text or not chunk_id:
        return None
    spans = extract_chunk_spans(page_text)
    if not spans:
        return None
    target = next((s for s in spans if s.get("id") == chunk_id), None)
    if not target:
        return None
    cs = target.get("char_span") or [0, 0]
    body = _strip_frontmatter(page_text)
    try:
        a, b = int(cs[0]), int(cs[1])
    except (TypeError, ValueError):
        return None
    if a < 0 or b > len(body) or a >= b:
        return None
    return body[a:b]


def extract_chunk_sources(page_text: str, chunk_id: str) -> list[dict]:
    """WS-A: return the REAL source(s) for a specific chunk from its frontmatter `sources:` field
    ([{"n":name,"u":url}], up to 5). Used by proxy-side citation resolution to attribute a quote to its
    actual source, not the page title. Returns [] when the chunk carries no per-chunk attribution."""
    if not page_text or not chunk_id:
        return []
    target = next((s for s in extract_chunk_spans(page_text) if s.get("id") == chunk_id), None)
    if not target:
        return []
    srcs = target.get("sources") or []
    return srcs if isinstance(srcs, list) else []


__all__ = [
    "chunk_markdown",
    "chunk_for_manifest",
    "parse_page_frontmatter",
    "page_source_from_frontmatter",
    "iso_date",
    "build_cross_document_edges",
    "attribute_chunks_to_grounding",
    "extract_chunk_sources",
    "has_chunks_frontmatter",
    "upsert_chunks_into_frontmatter",
    "extract_chunk_spans",
    "extract_chunk_text",
    "CHUNK_TOKENS",
    "OVERLAP_TOKENS",
    "MIN_CHUNK_TOKENS",
]


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if path:
        with open(path, encoding="utf-8") as f:
            content = f.read()
        chunks = chunk_markdown(content)
        print(f"file: {path}")
        print(f"chars (post-frontmatter): {len(_strip_frontmatter(content)):,}")
        print(f"total chunks: {len(chunks)}")
        for c in chunks:
            print(f"  [{c['idx']:>3}] tokens={c['token_count']:>4} chars={c['char_start']:>6}-{c['char_end']:>6} section={c['section']!r:<40} preview={c['text'][:80]!r}")
    else:
        # Self-test
        sample = """---
title: Test Article
---

# Introduction
Brief preamble here.

## Background
Some background paragraph.

Another paragraph in the background section.

## Findings
""" + ("Key finding text. " * 200) + """

### Sub-finding
A nested sub-finding.

## Conclusion
The end.
"""
        chunks = chunk_markdown(sample)
        for c in chunks:
            print(f"[{c['idx']}] tok={c['token_count']} sec={c['section']!r} preview={c['text'][:60]!r}")
