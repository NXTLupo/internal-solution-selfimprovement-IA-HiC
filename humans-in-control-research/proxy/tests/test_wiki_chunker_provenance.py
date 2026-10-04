"""Stage 1 items 1.5 + 1.7 (chunker half) of plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md.

1.5 (B4, phase 3): every chunk carries the PAGE's real provenance {n, u, kind, date} unless a more
specific inline / grounding attribution exists. Before this, `sources` appeared on ~23.5% of
chunks and Tier 1 of the citation resolver fell back to the page title everywhere else.

1.7 (B2, phase 4): `build_cross_document_edges` proposes cross-document `related_chunks` from
shared concepts (Jaccard) and exact shared named entities, with an optional vector-store
neighbour tier merged in. Pure function; the backfill job owns the write.

Run: "C:/Program Files/Python312/python.exe" -m pytest proxy/tests -q   (needs tiktoken)
"""
from __future__ import annotations

import os
import sys

import pytest

_PROXY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _PROXY_DIR not in sys.path:
    sys.path.insert(0, _PROXY_DIR)

import wiki_chunker as wc  # noqa: E402


# ---------------------------------------------------------------------------
# fixtures
# ---------------------------------------------------------------------------

def _long_body(seed: str, paragraphs: int = 14) -> str:
    """Enough distinct prose to force several 512-token chunks, with h2 sections."""
    out = []
    for i in range(paragraphs):
        if i % 5 == 0:
            out.append(f"## Section {i // 5 + 1} on {seed}")
        out.append(
            f"The {seed} programme at the institution changed how advisors schedule outreach to students in "
            f"cohort {i}. Advisors described the workload as uneven across the academic year and asked for a "
            f"shared calendar. Students in the {seed} cohort reported that reminders arrived after deadlines "
            f"had passed, and the registrar confirmed the timing in paragraph {i} of the review. "
            f"Retention staff compared the {seed} figures against the previous intake and found the same pattern "
            f"in three departments. The dean's office asked for a monthly report instead of a yearly one."
        )
    return "\n\n".join(out) + "\n"


def _page(fm: dict, body: str, inline_source_line: str | None = None) -> str:
    fm_lines = ["---"] + [f'{k}: "{v}"' if isinstance(v, str) else f"{k}: {v}" for k, v in fm.items()] + ["---", ""]
    head = "# " + fm.get("title", "Untitled") + "\n\n"
    if inline_source_line:
        head += inline_source_line + "\n\n"
    return "\n".join(fm_lines) + head + body


ARTICLE_FM = {
    "id": "articles/amazon-science/abc123.md",
    "url": "https://www.amazon.science/blog/a-new-benchmark",
    "kind": "article",
    "source": "amazon_science",
    "title": "A new benchmark for evaluating patient-facing health AI agents",
    "author": "",
    "date": "Tue, 25 Aug 2026 00:57:21 GMT",
    "method": "source-native",
}


# ---------------------------------------------------------------------------
# 1.5 page-default provenance
# ---------------------------------------------------------------------------

def test_every_chunk_defaults_to_page_provenance_with_iso_date_and_kind():
    page = _page(ARTICLE_FM, _long_body("advising"))  # NO inline Source line anywhere
    chunks = wc.chunk_for_manifest(page, ARTICLE_FM["id"])
    assert len(chunks) >= 3, "fixture must span several chunks to prove the default applies to all"
    for c in chunks:
        assert c.get("sources"), f"chunk {c['id']} has no sources"
        src = c["sources"][0]
        assert src["n"] == "amazon_science"
        assert src["u"] == "https://www.amazon.science/blog/a-new-benchmark"
        assert src["kind"] == "article"
        assert src["date"] == "2026-08-25"          # RSS string -> ISO 8601, stated date kept (no tz shift)
        assert "date_raw" not in src


def test_inline_source_wins_and_inherits_page_date_kind_when_it_is_the_page_source():
    inline = f"Source: [amazon_science]({ARTICLE_FM['url']})"
    page = _page(ARTICLE_FM, _long_body("coaching"), inline_source_line=inline)
    chunks = wc.chunk_for_manifest(page, ARTICLE_FM["id"])
    first = chunks[0]["sources"]
    assert first[0]["n"] == "amazon_science" and first[0]["u"] == ARTICLE_FM["url"]
    # the inline record is the page's own source -> it inherits the page's date + kind
    assert first[0]["date"] == "2026-08-25" and first[0]["kind"] == "article"
    # later chunks (no inline line) fall back to the page default
    assert all(c["sources"][0]["date"] == "2026-08-25" for c in chunks[1:])


def test_foreign_inline_source_is_left_untouched():
    page = _page(ARTICLE_FM, _long_body("tutoring"),
                 inline_source_line="Source: [Higher Ed Dive](https://www.highereddive.com/news/x)")
    chunks = wc.chunk_for_manifest(page, ARTICLE_FM["id"])
    first = chunks[0]["sources"][0]
    assert first == {"n": "Higher Ed Dive", "u": "https://www.highereddive.com/news/x"}, (
        "an inline source that is NOT the page's own source must not inherit the page's date/kind")


def test_unparseable_date_is_kept_verbatim_in_date_raw():
    fm = dict(ARTICLE_FM, date="sometime last spring")
    chunks = wc.chunk_for_manifest(_page(fm, _long_body("mentoring")), fm["id"])
    src = chunks[-1]["sources"][0]
    assert "date" not in src
    assert src["date_raw"] == "sometime last spring"


def test_empty_date_yields_neither_date_nor_date_raw():
    fm = dict(ARTICLE_FM, date="")
    chunks = wc.chunk_for_manifest(_page(fm, _long_body("mentoring")), fm["id"])
    src = chunks[-1]["sources"][0]
    assert "date" not in src and "date_raw" not in src


@pytest.mark.parametrize("raw,expected", [
    ("Tue, 25 Aug 2026 00:57:21 GMT", "2026-08-25"),
    ("2026-09-10T17:35:41.195606+00:00", "2026-09-10"),
    ("2026-07-03T01:17:19.276Z", "2026-07-03"),
    ("2026-04-23", "2026-04-23"),
    ("2026/4/3", "2026-04-03"),
    ("August 25, 2026", "2026-08-25"),
    ("Tuesday, August 25, 2026", "2026-08-25"),
    ("25 August 2026", "2026-08-25"),
    ("1756080000", "2025-08-25"),          # epoch seconds (Reddit created_utc)
    ("1756080000000", "2025-08-25"),       # epoch milliseconds
    ("2026-13-45", None),                  # impossible calendar date
    ("", None),
    (None, None),
    ("sometime last spring", None),
])
def test_iso_date_table(raw, expected):
    assert wc.iso_date(raw) == expected


def test_deep_research_synthesis_page_gets_no_page_default():
    fm = {
        "id": "articles/gemini-focused-research/fc8af2b4a0.md",
        "url": "deepresearch://18b49349217835",
        "kind": "article",
        "source": "gemini (focused research)",
        "title": "AI Research (gemini): Gen Z cosmetics email design trends 2026",
        "date": "",
        "method": "deep-research",
    }
    chunks = wc.chunk_for_manifest(_page(fm, _long_body("cosmetics")), fm["id"])
    assert chunks and all("sources" not in c for c in chunks), (
        "a provider bucket is never a citable source; grounding attribution owns these chunks")


def test_provider_bucket_source_is_rejected_but_subreddit_about_a_provider_is_real():
    assert wc.page_source_from_frontmatter({"source": "gemini", "url": "https://x.example/a"}) is None
    rec = wc.page_source_from_frontmatter({
        "source": "reddit-deep: r/gemini", "url": "https://www.reddit.com/r/gemini/comments/abc",
        "kind": "social", "date": "1756080000",
    })
    assert rec["n"] == "reddit-deep: r/gemini"
    assert rec["subreddit"] == "gemini"
    assert rec["kind"] == "social" and rec["date"] == "2025-08-25"


def test_client_upload_uses_the_document_title_as_its_name():
    fm = {
        "id": "articles/client-uploads/01047ed756.md",
        "url": "upload://deep-dive/Stakeholder%20Interview.txt",
        "kind": "article",
        "source": "Client Uploads",
        "title": "Drew Parker - NU Advancement Engagement Stakeholder Interview_anonymized.txt",
        "date": "2026-04-23",
        "method": "upload",
    }
    rec = wc.page_source_from_frontmatter(fm, fm["id"])
    assert rec["n"].startswith("Drew Parker - NU Advancement")
    assert rec["u"] == ""                      # upload:// is not a URL a reader can open
    assert rec["date"] == "2026-04-23"


def test_author_is_carried_when_present_and_distinct():
    rec = wc.page_source_from_frontmatter(dict(ARTICLE_FM, author="J. Smith"))
    assert rec["author"] == "J. Smith"
    rec2 = wc.page_source_from_frontmatter(dict(ARTICLE_FM, author="amazon_science"))
    assert "author" not in rec2


def test_page_without_identity_yields_none():
    assert wc.page_source_from_frontmatter({"title": "x", "date": "2026-01-01"}) is None
    assert wc.page_source_from_frontmatter({}) is None
    assert wc.page_source_from_frontmatter(None) is None  # type: ignore[arg-type]


def test_parse_page_frontmatter_reads_flat_scalars_and_skips_nested_blocks():
    page = _page(ARTICLE_FM, _long_body("x"))
    chunks = wc.chunk_for_manifest(page, ARTICLE_FM["id"])
    with_chunks = wc.upsert_chunks_into_frontmatter(page, chunks, page_id=ARTICLE_FM["id"])
    fm = wc.parse_page_frontmatter(with_chunks)
    assert fm["source"] == "amazon_science"
    assert fm["url"] == ARTICLE_FM["url"]
    assert "chunks" not in fm                      # the nested block is not a flat scalar
    assert wc.parse_page_frontmatter("no frontmatter here") == {}


def test_inline_fallback_strips_a_broken_non_http_markdown_link():
    # Real wiki case: "Source: [agr_reddit_agriculture](articles/agr-reddit-agriculture/e6c0fa37d5.md)"
    out = wc._extract_inline_sources(
        "Source: [agr_reddit_agriculture](articles/agr-reddit-agriculture/e6c0fa37d5.md)\n\nBody.")
    assert out == [{"n": "agr_reddit_agriculture", "u": ""}]


def test_sources_with_date_and_kind_round_trip_through_frontmatter():
    page = _page(ARTICLE_FM, _long_body("retention"))
    chunks = wc.chunk_for_manifest(page, ARTICLE_FM["id"])
    with_chunks = wc.upsert_chunks_into_frontmatter(page, chunks, page_id=ARTICLE_FM["id"])
    last_id = chunks[-1]["id"]
    srcs = wc.extract_chunk_sources(with_chunks, last_id)
    assert srcs == [{"n": "amazon_science", "u": ARTICLE_FM["url"], "kind": "article", "date": "2026-08-25"}]
    # and the body text is still addressable by the same pointer
    assert wc.extract_chunk_text(with_chunks, last_id)


def test_grounding_attribution_still_overrides_the_page_default():
    page = _page(ARTICLE_FM, _long_body("outreach"))
    body = wc._strip_frontmatter(page)
    chunks = wc.chunk_for_manifest(page, ARTICLE_FM["id"])
    # take a verbatim segment from the LAST chunk's span
    a, b = chunks[-1]["char_span"]
    seg = body[a:a + 160]
    wc.attribute_chunks_to_grounding(chunks, body, [
        {"text": seg, "sources": [{"url": "https://www.chronicle.com/article/x", "title": "The Chronicle"}]},
    ])
    assert chunks[-1]["sources"][0]["n"] == "The Chronicle"       # grounding wins (more specific)
    assert chunks[0]["sources"][0]["n"] == "amazon_science"       # unmatched chunks keep the page default


# ---------------------------------------------------------------------------
# 1.7 cross-document edges
# ---------------------------------------------------------------------------

def _pages_three():
    """A and B share 3 of 5 concepts (Jaccard 3/7 = 0.43); C is disjoint."""
    return [
        {"path": "articles/a.md", "chunks": [
            {"id": "articles/a.md#c0", "concepts": ["retention", "advising", "coaching", "cohort", "registrar"]},
            {"id": "articles/a.md#c1", "concepts": ["retention", "advising", "coaching", "budget", "deans"]},
        ]},
        {"path": "articles/b.md", "chunks": [
            {"id": "articles/b.md#c0", "concepts": ["retention", "advising", "coaching", "alumni", "donors"]},
        ]},
        {"path": "articles/c.md", "chunks": [
            {"id": "articles/c.md#c0", "concepts": ["pricing", "shipping", "returns", "checkout", "catalog"]},
        ]},
    ]


def test_cross_document_edges_link_the_two_pages_that_share_concepts_and_skip_the_third():
    edges = wc.build_cross_document_edges(_pages_three())
    assert edges["articles/a.md#c0"] == ["articles/b.md#c0"]
    assert edges["articles/a.md#c1"] == ["articles/b.md#c0"]
    assert sorted(edges["articles/b.md#c0"]) == ["articles/a.md#c0", "articles/a.md#c1"]
    assert "articles/c.md#c0" not in edges
    # intra-document pairs are NOT proposed here (they already exist on the page)
    assert "articles/a.md#c1" not in edges["articles/a.md#c0"]


def test_jaccard_threshold_and_min_shared_are_both_required():
    pages = [
        {"path": "p1.md", "chunks": [{"id": "p1.md#c0", "concepts": ["alpha", "beta", "gamma", "delta", "epsilon"]}]},
        # shares only ONE concept -> below min_shared_concepts
        {"path": "p2.md", "chunks": [{"id": "p2.md#c0", "concepts": ["alpha", "zeta", "eta", "theta", "iota"]}]},
        # shares two concepts: Jaccard 2/8 = 0.25 -> at the default threshold -> edge
        {"path": "p3.md", "chunks": [{"id": "p3.md#c0", "concepts": ["alpha", "beta", "kappa", "lambda", "mu"]}]},
    ]
    edges = wc.build_cross_document_edges(pages)
    assert edges["p1.md#c0"] == ["p3.md#c0"]
    assert "p2.md#c0" not in edges
    strict = wc.build_cross_document_edges(pages, jaccard_threshold=0.5)
    assert strict == {}


def test_exact_shared_named_entity_links_chunks_with_no_concept_overlap():
    pages = [
        {"path": "p1.md", "named_entities": ["Northeastern University"], "chunks": [
            {"id": "p1.md#c0", "concepts": ["coop", "placement", "employers", "interview", "offers"]}]},
        {"path": "p2.md", "chunks": [
            {"id": "p2.md#c0", "concepts": ["endowment", "donors", "campaign", "pledges", "stewardship"],
             "entities": ["northeastern university"]}]},  # case-insensitive exact match
    ]
    edges = wc.build_cross_document_edges(pages)
    assert edges == {"p1.md#c0": ["p2.md#c0"], "p2.md#c0": ["p1.md#c0"]}


def test_chunk_record_input_shape_is_accepted():
    records = [
        {"id": "x.md#c0", "concepts": ["one", "two", "three", "four", "five"]},
        {"id": "y.md#c0", "concepts": ["one", "two", "three", "six", "seven"]},
        {"id": "x.md#c1", "concepts": ["one", "two", "three", "eight", "nine"]},  # same doc as x.md#c0
    ]
    edges = wc.build_cross_document_edges(records)
    assert edges["x.md#c0"] == ["y.md#c0"]
    assert sorted(edges["y.md#c0"]) == ["x.md#c0", "x.md#c1"]


def test_vector_neighbours_merge_below_concept_edges_and_drop_same_document():
    pages = _pages_three()
    neighbors = {
        "articles/a.md#c0": ["articles/a.md#c1", "articles/c.md#c0", "articles/b.md#c0", "articles/zz.md#c4"],
    }
    edges = wc.build_cross_document_edges(pages, neighbors=neighbors)
    # concept edge first; same-doc neighbour dropped; the rest follow in neighbour order; duplicate deduped
    assert edges["articles/a.md#c0"] == ["articles/b.md#c0", "articles/c.md#c0", "articles/zz.md#c4"]


def test_max_per_chunk_caps_and_ordering_is_deterministic():
    pages = [{"path": "hub.md", "chunks": [{"id": "hub.md#c0", "concepts": ["alpha", "beta", "gamma", "delta", "epsilon"]}]}]
    for i in range(8):
        pages.append({"path": f"s{i}.md", "chunks": [
            {"id": f"s{i}.md#c0", "concepts": ["alpha", "beta", "gamma", f"unique{i}", f"vary{i}"]}]})
    e1 = wc.build_cross_document_edges(pages, max_per_chunk=3)
    e2 = wc.build_cross_document_edges(list(reversed(pages)), max_per_chunk=3)
    assert len(e1["hub.md#c0"]) == 3
    assert e1["hub.md#c0"] == e2["hub.md#c0"] == ["s0.md#c0", "s1.md#c0", "s2.md#c0"]


def test_empty_and_junk_input_yield_no_edges():
    assert wc.build_cross_document_edges([]) == {}
    assert wc.build_cross_document_edges(None) == {}
    assert wc.build_cross_document_edges([None, 3, {"nope": 1}]) == {}
