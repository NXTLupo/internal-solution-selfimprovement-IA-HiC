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
