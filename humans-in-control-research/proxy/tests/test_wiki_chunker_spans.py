"""
2026-10-20: char_span coordinates must be the body `upsert_chunks_into_frontmatter` and the TypeScript resolver
read back. A page written as `---\n...\n---\n\n# Title` used to carry spans shifted by one character (the chunker
kept the blank line after the fence, the upsert and the resolver dropped it), so the resolver dropped the last chunk
of about half the article pages and every chunk of single-chunk pages.
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from wiki_chunker import _FRONTMATTER_RE, _strip_frontmatter, chunk_for_manifest, upsert_chunks_into_frontmatter  # noqa: E402


PAGE = (
    "---\n"
    "title: A short article\n"
    "source: Example Outlet\n"
    "kind: article\n"
    "---\n"
    "\n"
    "# A short article\n"
    "\n"
    "Source: Example Outlet\n"
    "\n"
    "The advising office logs each visit in the student record. Advisors review the no-show list every Friday. "
    "Students who miss the second visit rarely return that term.\n"
)


def _resolver_body(page: str) -> str:
    m = _FRONTMATTER_RE.match(page)
    assert m, "page has frontmatter"
    return m.group(2)


def test_stripped_body_matches_the_resolver_body():
    assert _strip_frontmatter(PAGE) == _resolver_body(PAGE)
    assert _strip_frontmatter(PAGE).startswith("# A short article")


def test_every_span_slices_its_own_chunk_text_in_resolver_coordinates():
    chunks = chunk_for_manifest(PAGE, "articles/example/abc.md")
    assert chunks, "a short page yields one chunk"
    body = _resolver_body(upsert_chunks_into_frontmatter(PAGE, chunks))
    for c in chunks:
        a, b = c["char_span"]
        assert 0 <= a < b <= len(body), (a, b, len(body))
        assert body[a:b].strip()
    first_a, _ = chunks[0]["char_span"]
    assert first_a == 0 and body.startswith("# A short article")
    # The furthest span ends ON the body, never one past it (the pre-fix signature).
    assert max(c["char_span"][1] for c in chunks) <= len(body)


def test_no_blank_line_after_fence_is_unchanged():
    page = PAGE.replace("---\n\n# A short article", "---\n# A short article")
    assert _strip_frontmatter(page) == _resolver_body(page)
    chunks = chunk_for_manifest(page, "articles/example/def.md")
    body = _resolver_body(page)
    a, b = chunks[-1]["char_span"]
    assert b <= len(body)
