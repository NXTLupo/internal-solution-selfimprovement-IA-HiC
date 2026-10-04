"""Evidence hygiene helpers for upload ingestion and manifest admission (2026-10-02).

Pure functions, no FastAPI or app-state imports, so they are unit-testable in
isolation (proxy/tests/test_evidence_hygiene.py) and reusable from every route.

Phases advanced (hic-unified-vision): 2 (collect ALL uploads, including decks and
workbooks), 3 (clean per-type text before chunking), 5 (anti-RAG admission that
does not spend its budget on duplicate copies or other engagements' synthesis).

Contents
  repair_mojibake(text)            UTF-8 bytes that were decoded as latin-1/cp1252
  decode_text_bytes(raw)           strict UTF-8 first, then cp1252, then repair
  parse_docx_bytes(raw)            paragraphs + tables from word/document.xml
  parse_xlsx_bytes(raw)            every sheet, every non-empty row (openpyxl)
  doc_stem(title_or_path)          filename stem used to collapse duplicate uploads
  is_upload_family(path)           client-uploads / cached-reuse-* / uploads/ pages
  synthesis_engagement(path, ...)  engagement slug a theme-synthesis/insight page belongs to
  engagement_matches(a, b)         prefix-tolerant slug equality (60 vs 80 char slugs)
  choose_canonical(candidates, engagement)
  dedupe_pages(page_infos, engagement)
"""
from __future__ import annotations

import io
import re
import zipfile
from typing import Iterable, Optional

# ---------------------------------------------------------------------------
# Mojibake repair
# ---------------------------------------------------------------------------
# The failure class (a .docx upload, 2026-10-01): mammoth produced
# correct UTF-8, the browser base64'd it, and a later `atob()` turned each UTF-8
# byte into one latin-1 code point. "student's" (U+2019 = E2 80 99) landed as
# "studentâ\x80\x99s" and a non-breaking space (C2 A0) as "Â\xa0". The repair
# maps each suspicious run back to bytes (latin-1 for U+0000..U+00FF, the cp1252
# table for the 0x80..0x9F printable glyphs such as "€" and "™") and decodes it as
# UTF-8. A run is rewritten only when it is a COMPLETE, valid UTF-8 sequence of
# the length its lead byte declares, so ordinary accented prose ("café", "à la")
# is never touched.

_CP1252_GLYPH_TO_BYTE: dict[str, int] = {}
for _b in range(0x80, 0xA0):
    try:
        _CP1252_GLYPH_TO_BYTE[bytes([_b]).decode("cp1252")] = _b
    except UnicodeDecodeError:
        pass

_CONT = "[\u0080-¿" + "".join(re.escape(c) for c in _CP1252_GLYPH_TO_BYTE) + "]"
_MOJIBAKE_RE = re.compile(
    "(?:[Â-ß]" + _CONT + ")"
    "|(?:[à-ï]" + _CONT + "{2})"
    "|(?:[ð-ô]" + _CONT + "{3})"
)


def _char_to_byte(ch: str) -> Optional[int]:
    o = ord(ch)
    if o < 0x100:
        return o
    return _CP1252_GLYPH_TO_BYTE.get(ch)


def _fix_run(m: "re.Match[str]") -> str:
    run = m.group(0)
    bs = [_char_to_byte(c) for c in run]
    if any(b is None for b in bs):
        return run
    try:
        fixed = bytes(bs).decode("utf-8")  # type: ignore[arg-type]
    except UnicodeDecodeError:
        return run
    # A repaired non-breaking space reads as a normal space in prose.
    return fixed.replace(" ", " ")


def has_mojibake(text: str) -> bool:
    return bool(text) and bool(_MOJIBAKE_RE.search(text))


def repair_mojibake(text: str) -> str:
    """Return text with UTF-8-decoded-as-latin-1/cp1252 runs repaired.
    Idempotent; two passes cover a double mis-decode."""
    if not text or not isinstance(text, str):
        return text
    out = text
    for _ in range(2):
        if not _MOJIBAKE_RE.search(out):
            break
        new = _MOJIBAKE_RE.sub(_fix_run, out)
        if new == out:
            break
        out = new
    return out


def decode_text_bytes(raw: bytes) -> str:
    """Decode uploaded text bytes. Strict UTF-8 (BOM-aware) first; a file that is
    genuinely cp1252 falls back to cp1252; anything else to latin-1. The result
    is passed through repair_mojibake so text that was already mis-decoded
    upstream (and re-encoded as UTF-8) is healed too."""
    if not raw:
        return ""
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return repair_mojibake(raw.decode(enc))
        except UnicodeDecodeError:
            continue
    return repair_mojibake(raw.decode("latin-1", errors="replace"))


# ---------------------------------------------------------------------------
# Office extractors
# ---------------------------------------------------------------------------
_W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def parse_docx_bytes(raw: bytes) -> dict:
    """Paragraphs and tables from a .docx (zip + word/document.xml), in document
    order. No python-docx dependency. The previous path ran a printable-ASCII
    regex over the COMPRESSED zip bytes, which recovered almost nothing and
    dropped every non-ASCII character."""
    try:
        import xml.etree.ElementTree as ET
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            xml = zf.read("word/document.xml")
        root = ET.fromstring(xml)
        body = root.find(f"{_W_NS}body")
        if body is None:
            return {"text": "", "error": "docx has no body", "method": "docx-xml"}
        blocks: list[str] = []

        def _para_text(p) -> str:
            parts = []
            for node in p.iter():
                if node.tag == f"{_W_NS}t" and node.text:
                    parts.append(node.text)
                elif node.tag == f"{_W_NS}tab":
                    parts.append("\t")
                elif node.tag in (f"{_W_NS}br", f"{_W_NS}cr"):
                    parts.append("\n")
            return "".join(parts).strip()

        for child in body:
            if child.tag == f"{_W_NS}p":
                t = _para_text(child)
                if t:
                    blocks.append(t)
            elif child.tag == f"{_W_NS}tbl":
                rows = []
                for tr in child.iter(f"{_W_NS}tr"):
                    cells = []
                    for tc in tr.iter(f"{_W_NS}tc"):
                        ct = " ".join(_para_text(p) for p in tc.iter(f"{_W_NS}p")).strip()
                        if ct:
                            cells.append(ct)
                    if cells:
                        rows.append(" | ".join(cells))
                if rows:
                    blocks.append("TABLE:\n" + "\n".join(rows))
        text = repair_mojibake("\n\n".join(blocks))
        return {"text": text[:400_000], "method": "docx-xml", "paragraphs": len(blocks)}
    except Exception as e:  # corrupt zip, not a docx, etc.
        return {"text": "", "error": f"docx parse failed: {str(e)[:160]}", "method": "docx-xml"}


def parse_xlsx_bytes(raw: bytes, max_rows_per_sheet: int = 5000) -> dict:
    """Every sheet, every non-empty row, as `cell | cell | cell` lines under a
    `[Sheet N: name]` header. Uses openpyxl read-only + cached values (formula
    results, not formulas)."""
    try:
        from openpyxl import load_workbook
    except ImportError:
        return {"text": "", "error": "openpyxl not installed", "method": "openpyxl"}
    try:
        wb = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        blocks: list[str] = []
        total_rows = 0
        for si, ws in enumerate(wb.worksheets, start=1):
            lines: list[str] = []
            for ri, row in enumerate(ws.iter_rows(values_only=True)):
                if ri >= max_rows_per_sheet:
                    lines.append(f"(sheet truncated after {max_rows_per_sheet} rows)")
                    break
                cells = [str(v).strip() for v in row if v is not None and str(v).strip()]
                if cells:
                    lines.append(" | ".join(cells))
            total_rows += len(lines)
            if lines:
                blocks.append(f"[Sheet {si}: {ws.title}]\n" + "\n".join(lines))
        try:
            wb.close()
        except Exception:
            pass
        text = repair_mojibake("\n\n".join(blocks))
        return {"text": text[:400_000], "method": "openpyxl", "sheetCount": len(blocks), "rowCount": total_rows}
    except Exception as e:
        return {"text": "", "error": f"xlsx parse failed: {str(e)[:160]}", "method": "openpyxl"}


# ---------------------------------------------------------------------------
# Duplicate-document collapse
# ---------------------------------------------------------------------------
_UPLOAD_FAMILY_RE = re.compile(r"^(?:articles/client-uploads/|articles/cached-reuse[^/]*/|uploads/|sources/uploads)", re.I)


def is_upload_family(path: str) -> bool:
    return bool(_UPLOAD_FAMILY_RE.match((path or "").replace("\\", "/")))


def doc_stem(title_or_path: str) -> str:
    """Normalize an uploaded document's title or filename to a stem that is equal
    across its copies: drops directories, extensions, "(1)" copy suffixes,
    REDACTED/Final markers and punctuation. "SOW_Intake_Pilot_Final_REDACTED.txt"
    and "SOW_Intake_Pilot_Final" both map to "sow intake pilot"."""
    t = (title_or_path or "").strip().replace("\\", "/").split("/")[-1].lower()
    for _ in range(2):
        t = re.sub(r"\.(pdf|txt|md|docx?|pptx?|xlsx?|csv|json)$", "", t)
    t = re.sub(r"\s*\(\d+\)$", "", t)
    t = re.sub(r"[^a-z0-9]+", " ", t).strip()
    t = re.sub(r"(?:\s+(?:redacted|final|copy|v\d+))+$", "", t).strip()
    return t


def engagement_matches(a: str, b: str) -> bool:
    """Slug equality that tolerates the historical 40/50/60-character truncations
    (the 2026-10-01 Stage 0.1 slug unification moved everything to 80)."""
    a = (a or "").strip().lower()
    b = (b or "").strip().lower()
    if not a or not b:
        return False
    if a == b:
        return True
    short, long_ = (a, b) if len(a) <= len(b) else (b, a)
    return len(short) >= 30 and long_.startswith(short)


def _engagement_tags(eng_field) -> list[str]:
    if isinstance(eng_field, (list, tuple)):
        return [str(x) for x in eng_field if x]
    return [t for t in re.split(r"[\s,]+", str(eng_field or "")) if t]


def choose_canonical(candidates: list[dict], engagement: str = "") -> dict:
    """Pick the one copy of a duplicated document to keep. Preference order:
    1. tagged to THIS engagement,
    2. the original upload page over a `cached-reuse-*` excerpt alias,
    3. more manifest chunks (the fuller copy),
    4. newest mtime.
    Each candidate: {path, engagement, mtime, chunk_count}."""
    def key(c: dict):
        tagged = any(engagement_matches(t, engagement) for t in _engagement_tags(c.get("engagement")))
        is_alias = "/cached-reuse" in ("/" + (c.get("path") or ""))
        return (
            1 if tagged else 0,
            0 if is_alias else 1,
            int(c.get("chunk_count") or 0),
            float(c.get("mtime") or 0.0),
        )
    return max(candidates, key=key)


def dedupe_pages(page_infos: Iterable[dict], engagement: str = "") -> dict[str, str]:
    """Group duplicate copies of the same document and return {dropped_path: kept_path}.

    Grouping keys, in order:
      - an alias page whose url is `wiki://<target>` joins its target's group
        (cached-reuse pages carry that pointer explicitly),
      - an upload-family page joins the group of its doc_stem(title or filename),
      - a page with a content hash joins the group of that hash.
    Pages outside the upload family with no hash are never grouped."""
    infos = [dict(p) for p in page_infos if p and p.get("path")]
    by_path = {p["path"]: p for p in infos}
    parent: dict[str, str] = {p: p for p in by_path}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    first_by_key: dict[str, str] = {}

    def bucket(key: str, path: str) -> None:
        if not key:
            return
        if key in first_by_key:
            union(first_by_key[key], path)
        else:
            first_by_key[key] = path

    for p in infos:
        path = p["path"]
        url = str(p.get("url") or "")
        if url.startswith("wiki://"):
            target = url[len("wiki://"):].split("#", 1)[0]
            bucket("path:" + target, path)
        bucket("path:" + path, path)
        if is_upload_family(path):
            stem = doc_stem(p.get("title") or "") or doc_stem(p.get("filename") or "")
            if len(stem) >= 6:
                bucket("stem:" + stem, path)
        ch = str(p.get("content_hash") or "")
        if ch:
            bucket("hash:" + ch, path)

    groups: dict[str, list[dict]] = {}
    for path, p in by_path.items():
        groups.setdefault(find(path), []).append(p)
    dropped: dict[str, str] = {}
    for members in groups.values():
        if len(members) < 2:
            continue
        keep = choose_canonical(members, engagement)["path"]
        for m in members:
            if m["path"] != keep:
                dropped[m["path"]] = keep
    return dropped


# ---------------------------------------------------------------------------
# Engagement scoping for generated synthesis
# ---------------------------------------------------------------------------
_THEME_SYNTH_PREFIX = "articles/hic-theme-synthesis/"
_INSIGHT_RE = re.compile(r"^synthesis/insights/([^/]+)/")
_SYNTH_URL_RE = re.compile(r"^nxt://(?:synthesis/themes|insights)/([^/]+)/")


def is_generated_synthesis(path: str) -> bool:
    p = (path or "").replace("\\", "/")
    return p.startswith(_THEME_SYNTH_PREFIX) or bool(_INSIGHT_RE.match(p))


def synthesis_engagement(path: str, url: str = "", engagement_field="", read_url=None) -> Optional[str]:
    """The engagement slug a generated-synthesis page was CREATED for, or None when
    the page is not generated synthesis. Returns "" when the owner cannot be
    determined (callers treat that as foreign).

    Field that distinguishes them: theme-synthesis pages are written with url
    `nxt://synthesis/themes/<engagement-slug>/<timestamp>`; insight pages live at
    `synthesis/insights/<engagement-slug>/...`. A content-duplicate synthesis page is
    written as an ALIAS whose url is the canonical page's wiki path
    ("articles/hic-theme-synthesis/<hash>.md" or "wiki://..."), so the owner is found
    by following that pointer (`read_url(path) -> url`, up to 3 hops).

    The `engagement:` frontmatter field is deliberately NOT trusted: the write path
    re-tags a canonical page with every engagement that re-writes or reuses it, so a
    synthesis page from another client carries the current engagement's slug too
    (observed live: 124 foreign synthesis pages tagged with the current slug). It is
    accepted only by callers that pass it AND have no url at all. There is no field
    marking a page as NXT's own product material: an internal run is simply another
    engagement slug, so the ownership check covers it."""
    p = (path or "").replace("\\", "/")
    m = _INSIGHT_RE.match(p)
    if m:
        return m.group(1)
    if not p.startswith(_THEME_SYNTH_PREFIX):
        return None
    u = str(url or "").strip()
    seen = {p}
    for _ in range(3):
        um = _SYNTH_URL_RE.match(u)
        if um:
            return um.group(1)
        target = u[len("wiki://"):] if u.startswith("wiki://") else u
        target = target.split("#", 1)[0].lstrip("/")
        if read_url is None or not target.startswith(_THEME_SYNTH_PREFIX) or target in seen:
            break
        seen.add(target)
        try:
            u = str(read_url(target) or "").strip()
        except Exception:
            break
    if not u and engagement_field:
        tags = _engagement_tags(engagement_field)
        return tags[0] if len(tags) == 1 else ""
    return ""


_FM_LINE_RE = re.compile(r'^(url|engagement|title)\s*:\s*"?(.*?)"?\s*$', re.M)


def read_head_fields(text_head: str) -> dict:
    """Pull url / engagement / title out of a page's raw frontmatter head. Used
    when a manifest record was written from a truncated head and lost them."""
    out: dict = {}
    if not text_head:
        return out
    fm = text_head
    if fm.startswith("---"):
        end = fm.find("\n---", 4)
        if end > 0:
            fm = fm[:end]
    for k, v in _FM_LINE_RE.findall(fm):
        if k not in out:
            out[k] = v
    return out


# ---------------------------------------------------------------------------
# One-off page repair (explicit, per page; never a sweep)
# ---------------------------------------------------------------------------
def repair_page_mojibake(page_text: str, page_path: str) -> dict:
    """Repair mojibake in ONE existing wiki page and re-chunk it, so the
    frontmatter `chunks:` char_spans address the repaired body (a repair shortens
    every fixed run from 2-4 characters to 1, which would otherwise shift spans).

    Returns {changed, fixed_runs, text, before_samples, after_samples, chunk_count}.
    The caller decides whether to write `text` back."""
    before_runs = _MOJIBAKE_RE.findall(page_text or "")
    if not before_runs:
        return {"changed": False, "fixed_runs": 0, "text": page_text,
                "before_samples": [], "after_samples": [], "chunk_count": None}
    repaired = repair_mojibake(page_text)
    samples_before: list[str] = []
    samples_after: list[str] = []
    for m in list(_MOJIBAKE_RE.finditer(page_text))[:6]:
        a, b = max(0, m.start() - 30), min(len(page_text), m.end() + 30)
        frag = page_text[a:b]
        samples_before.append(frag)
        samples_after.append(repair_mojibake(frag))
    chunk_count = None
    chunk_error = ""
    try:
        from wiki_chunker import chunk_for_manifest, upsert_chunks_into_frontmatter
        chunks = chunk_for_manifest(repaired, page_path)
        if chunks:
            repaired = upsert_chunks_into_frontmatter(repaired, chunks, page_id=page_path)
            chunk_count = len(chunks)
    except Exception as e:  # never write a repaired body whose spans are stale
        chunk_error = str(e)[:200]
    return {"changed": repaired != page_text and not chunk_error, "fixed_runs": len(before_runs),
            "text": repaired if not chunk_error else page_text, "chunk_error": chunk_error,
            "before_samples": samples_before, "after_samples": samples_after, "chunk_count": chunk_count}
