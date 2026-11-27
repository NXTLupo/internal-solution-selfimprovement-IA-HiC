"""Passages for retrieval (26 Nov 2026), written from the audit of the old research system's chunker.

The old chunker cut 512-token windows that ended mid-sentence and mid-word, merged short chunks across sections, kept
no heading with its text, and 60% of its chunks were longer than its embedder could read. Here:
- a passage is built from whole paragraphs, up to TARGET characters (about 350 tokens, well inside the embedder's window);
- a heading starts a new passage and stays with the text under it, so a passage never spans two sections;
- a paragraph longer than MAX_CHARS is split at sentence ends only, and the next piece repeats the last sentence of the
  one before it, so a claim cut at a boundary can still be read whole;
- a sentence longer than MAX_CHARS (tables, lists without stops) is split at the last space, never inside a word;
- a short tail joins the passage before it.
chunk() returns [{"text", "section"}] in document order.
"""
import re

TARGET = 1400
MAX_CHARS = 1800
MIN_CHARS = 250
_SENT = re.compile(r"(?<=[.!?])[\"'”)\]]?\s+(?=[\"'“(\[A-Z0-9])")
_END = re.compile(r"[.!?:;,\"'”)]$")


def is_heading(block):
    """A markdown heading, or a short single line with no closing punctuation (a title line of a scraped page)."""
    b = block.strip()
    if "\n" in b or len(b) > 120:
        return False
    if b.startswith("#"):
        return True
    return len(b.split()) <= 12 and not _END.search(b) and b[:1].isupper() and not b.startswith(("- ", "* "))


def sentences(paragraph):
    return [s.strip() for s in _SENT.split(paragraph) if s.strip()]


def _hard_split(s, size):
    out = []
    while len(s) > size:
        cut = s.rfind(" ", 0, size)
        cut = cut if cut > size // 3 else size
        out.append(s[:cut].strip())
        s = s[cut:].strip()
    if s:
        out.append(s)
    return out


def _pieces(paragraph, target, max_chars):
    """A long paragraph as sentence-packed pieces, each after the first repeating the previous piece's last sentence."""
    sents = []
    for s in sentences(paragraph):
        sents += _hard_split(s, max_chars) if len(s) > max_chars else [s]
    out, cur = [], []
    for s in sents:
        if cur and len(" ".join(cur)) + 1 + len(s) > target:
            out.append(" ".join(cur))
            cur = [cur[-1]] if len(cur[-1]) < target // 3 else []
        cur.append(s)
    if cur:
        out.append(" ".join(cur))
    return out


def chunk(text, target=TARGET, max_chars=MAX_CHARS, min_chars=MIN_CHARS):
    blocks = [b.strip() for b in re.split(r"\n\s*\n", str(text or "")) if b.strip()]
    out, cur, size, section = [], [], 0, ""

    def flush():
        nonlocal cur, size
        body = "\n\n".join(cur).strip()
        if body:
            out.append({"text": body, "section": section})
        cur, size = [], 0

    for b in blocks:
        if is_heading(b):
            if size >= min_chars or (cur and not all(is_heading(x) for x in cur)):
                flush()
            section = b.lstrip("#").strip()[:120]
            cur.append(b)
            size += len(b) + 2
            continue
        parts = _pieces(b, target, max_chars) if len(b) > max_chars else [b]
        for p in parts:
            if cur and size + len(p) + 2 > target and size >= min_chars:
                head = [x for x in cur if is_heading(x)]
                flush()
                if head and len(parts) > 1:      # a section split over passages keeps its heading in view
                    cur, size = [head[-1]], len(head[-1]) + 2
            cur.append(p)
            size += len(p) + 2
    flush()
    if (len(out) > 1 and len(out[-1]["text"]) < min_chars and out[-1]["section"] == out[-2]["section"]
            and len(out[-2]["text"]) + len(out[-1]["text"]) + 2 <= max_chars):          # a short tail joins its own section only
        last = out.pop()
        out[-1]["text"] += "\n\n" + last["text"]
    return out
