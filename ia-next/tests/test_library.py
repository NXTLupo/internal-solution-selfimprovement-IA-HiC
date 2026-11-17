"""Offline tests for the one-time library import and research seeding."""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, library, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _wiki(tmp_path):
    root = tmp_path / "wiki"
    (root / "articles" / "higher-ed-dive").mkdir(parents=True)
    (root / "articles" / "higher-ed-dive" / "co-op-readiness.md").write_text(
        "---\ntitle: Co-op readiness in first year\nurl: https://example.edu/coop\n---\n"
        + "Career services teams start co-op preparation in the first semester so students arrive ready. " * 6, encoding="utf-8")
    (root / "articles" / "higher-ed-dive" / "stub.md").write_text("too short", encoding="utf-8")
    (root / "articles" / "hic-theme-synthesis").mkdir()
    (root / "articles" / "hic-theme-synthesis" / "coop-themes.md").write_text(
        "# Theme synthesis" + chr(10) + "Co-op preparation for first-year students through career services is the top theme. " * 8,
        encoding="utf-8")
    (root / "frameworks").mkdir()
    (root / "frameworks" / "jtbd.md").write_text("# Jobs to be done\n" + "A [[framework]] for [mapping](x) customer jobs and outcomes. " * 10, encoding="utf-8")
    return root


def test_import_keeps_provenance_skips_stubs_and_is_idempotent(tmp_path):
    root = _wiki(tmp_path)
    first = library.import_tree(str(root))
    assert first["added"] == 3 and first["skipped_too_short"] == 1
    rows = {r["source_id"]: dict(r) for r in store.conn().execute("SELECT * FROM evidence")}
    assert rows["L:articles/higher-ed-dive/co-op-readiness.md"]["url"] == "https://example.edu/coop"
    assert rows["L:frameworks/jtbd.md"]["url"] == "library:frameworks/jtbd.md"
    assert "[[" not in rows["L:frameworks/jtbd.md"]["text"] and "](x)" not in rows["L:frameworks/jtbd.md"]["text"]
    again = library.import_tree(str(root))
    assert again["added"] == 0 and again["already_present"] == 3


def test_import_never_writes_to_the_source_tree(tmp_path):
    root = _wiki(tmp_path)
    before = {p: os.path.getmtime(p) for p in map(str, root.rglob("*.md"))}
    library.import_tree(str(root))
    assert {p: os.path.getmtime(p) for p in map(str, root.rglob("*.md"))} == before


def test_research_seeding_returns_relevant_library_pages_with_provenance(tmp_path):
    library.import_tree(str(_wiki(tmp_path)))
    seeds = library.seed_sources("first year co-op preparation career services", set())
    assert seeds and seeds[0]["title"].startswith("HiC library:") and seeds[0]["url"] == "https://example.edu/coop"
    assert library.seed_sources("first year co-op preparation", {seeds[0]["library"]}) != seeds[:1]


def test_no_library_means_no_seeds():
    assert library.seed_sources("anything at all", set()) == []


def test_seeding_never_offers_model_written_pages(tmp_path):
    library.import_tree(str(_wiki(tmp_path)))
    seeds = library.seed_sources("first-year co-op preparation career services students", set())
    assert [s["library"] for s in seeds] == ["L:articles/higher-ed-dive/co-op-readiness.md"]
    assert library.is_primary("L:articles/reddit-deep-r-neu/x.md") and library.is_primary("L:uploads/brief.md")
    assert not library.is_primary("L:articles/nxt-insight/x.md") and not library.is_primary("L:synthesis/themes.md")


def test_hyphenated_terms_stay_whole():
    terms = library.key_terms("How do first-year students prepare for co-op?")
    assert "co op" in terms and "first year" in terms


def test_the_relevance_screen_decides_and_may_return_nothing(tmp_path):
    library.import_tree(str(_wiki(tmp_path)))
    seen = []

    def none_relevant(goal, cands):
        seen.append([c["library"] for c in cands])
        return []
    assert library.seed_sources("first-year co-op preparation career services", set(), pick=none_relevant) == []
    assert seen and seen[0] == ["L:articles/higher-ed-dive/co-op-readiness.md"]


def test_model_pick_keeps_only_valid_page_numbers():
    cands = [{"title": "HiC library: a", "text": "x"}, {"title": "HiC library: b", "text": "y"}]
    calls = []

    def fake_claude(model, system, messages, ledger=None, **kw):
        calls.append((model, kw.get("json_schema")))
        return '{"relevant": [1, 1, 7, -1, "0"]}', None, None
    assert library.model_pick("goal", cands, None, call=fake_claude) == [1]
    assert calls[0][0] == config.SEATS["fast"]["secondary"] and calls[0][1] == library.PICK_SCHEMA
    assert library.model_pick("goal", [], None, call=fake_claude) == [] and len(calls) == 1


def test_duplicate_uploads_are_offered_once(tmp_path):
    root = _wiki(tmp_path)
    page = "# Vision roadmap" + chr(10) + "First-year co-op preparation through career services for every student. " * 8
    for eng in ("a", "b"):
        (root / "uploads" / eng).mkdir(parents=True)
        (root / "uploads" / eng / "roadmap.md").write_text(page, encoding="utf-8")
    library.import_tree(str(root))
    seeds = library.seed_sources("first-year co-op preparation career services", set(), limit=5)
    assert sum(1 for s in seeds if s["library"].startswith("L:uploads/")) == 1
