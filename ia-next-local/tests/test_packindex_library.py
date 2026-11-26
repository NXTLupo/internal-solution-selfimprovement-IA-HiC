"""The local pack index (S7) and the Library's dates and search by meaning (Gap 1)."""
import pytest

from ia_next import hic, libraryview, packindex, store


@pytest.fixture()
def db(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.db"))


ITEMS = [
    {"title": "Students fear AI detectors", "url": "https://pub.example/a", "date": "2026-11-20", "content": "College students change their writing to avoid detectors.",
     "publisher": "Pub", "pack": "higher_ed", "tier": 2},
    {"title": "Endowment returns", "url": "https://pub.example/b", "date": "2026-11-18", "content": "Endowment returns fell this year.", "publisher": "Pub", "pack": "higher_ed", "tier": 2},
    {"title": "Old detectors story", "url": "https://pub.example/c", "date": "2025-01-02", "content": "Detectors were new then.", "publisher": "Pub", "pack": "higher_ed", "tier": 2},
    {"title": "Retail detectors", "url": "https://shop.example/d", "date": "2026-11-20", "content": "Shoplifting detectors in stores.", "publisher": "Shop", "pack": "retail", "tier": 3},
]


def test_remembered_pack_items_are_searched_by_the_questions_words_within_the_packs_and_the_period(db):
    assert packindex.remember(ITEMS) == 4 and packindex.remember(ITEMS) == 0 and packindex.count() == 4
    got = packindex.search(["higher_ed"], "students AI detectors", since="2026-10-25")
    assert [x["url"] for x in got] == ["https://pub.example/a"] and got[0]["local"] is True and got[0]["publisher"] == "Pub"
    assert {x["url"] for x in packindex.search(["higher_ed"], "detectors")} == {"https://pub.example/a", "https://pub.example/c"}
    assert packindex.search(["higher_ed"], "") == [] and packindex.search([], "detectors") == []


def test_the_idle_pass_reads_more_of_each_feed_for_the_packs_work_uses(db):
    calls = []

    def call(method, path, timeout, **kw):
        calls.append((path, (kw.get("params") or {}).get("limit")))
        if path.startswith("/api/source-packs/"):
            return {"name": "Higher Ed", "sourceIds": ["s1", "s2"]}
        return {"results": [{"source": "Feed One", "credibilityTier": 2, "items": [
            {"title": "A", "url": "https://one.example/a", "date": "2026-11-21", "content": "advising and students"}]}, {"source": "Feed Two", "items": []}]}
    assert packindex.maybe_ingest(call, now=1000.0) is None                      # nothing uses a pack yet
    packindex.used(["higher_ed"])
    out = packindex.maybe_ingest(call, now=10_000_000.0)
    assert out["items"] == 1 and out["sources"] == 2 and ("/api/multi-search", packindex.PER_SOURCE) in calls
    assert packindex.maybe_ingest(call, now=10_000_100.0) is None                # not again within six hours
    assert packindex.maybe_ingest(call, now=10_100_000.0, idle=lambda: False) is None      # nor while work is running
    assert packindex.search(["higher_ed"], "advising")[0]["publisher"] == "Feed One"


def test_a_pack_search_adds_local_hits_and_answers_when_hic_is_down(db, monkeypatch):
    packindex.remember(ITEMS)

    def down(method, path, timeout, **kw):
        if path.startswith("/api/source-packs/"):
            return {"sourceIds": ["s1"]}
        raise hic.HicUnavailable("timed out")
    monkeypatch.setattr(hic, "_call", down)
    rep = {}
    got = hic.pack_items(["higher_ed"], "students AI detectors", keep=10, report=rep)
    assert [x["url"] for x in got][:1] == ["https://pub.example/a"] and rep["local"] >= 1 and rep["skipped"] == 1


def test_library_rows_get_dates_and_are_found_by_meaning(db):
    eid = store.create_engagement("Lib", "o")
    store.add_evidence(eid, "S1", "https://news.example/2026/11/14/detectors", "Detector accusations grow", "Students say they were wrongly flagged.")
    store.add_evidence(eid, "S2", "https://news.example/story", "Budget", "Published November 3, 2026. The state budget passed.")
    store.add_evidence(eid, "S3", "https://news.example/x", "Undated", "No date here at all.")
    vec = {"Detector": [1.0, 0.0], "Budget": [0.0, 1.0], "Undated": [0.6, 0.8]}
    embed = lambda texts: [next((v for k, v in vec.items() if t.startswith(k)), [1.0, 0.0] if "cheating" in t else [0.5, 0.5]) for t in texts]
    got = libraryview.backfill(limit=10, embed=embed)
    assert got == {"checked": 3, "dated": 2, "vectors": 3} and libraryview.backfill(limit=10, embed=embed)["checked"] == 0
    rows = {it["title"]: it for it in libraryview.search("")["items"]}
    assert rows["Detector accusations grow"]["date"] == "2026-11-14" and rows["Budget"]["date"] == "2026-11-03" and rows["Undated"]["date"] == ""
    near = libraryview.by_meaning("cheating software", embed=embed)
    ids = {r["id"]: r["title"] for r in store.conn().execute("SELECT id, title FROM evidence")}
    assert [ids[i] for i, _ in near] == ["Detector accusations grow", "Undated"]          # the budget page is not close


def test_a_feed_that_hangs_alone_is_set_aside_and_the_good_feeds_of_its_batch_are_cleared(db, monkeypatch):
    def call(method, path, timeout, **kw):
        if path.startswith("/api/source-packs/"):
            return {"sourceIds": ["good1", "hangs", "good2"] if path.endswith("higher_ed") else []}
        if path == "/api/sources":
            return {"categories": {}}
        ids = kw["params"]["sources"].split(",")
        if "hangs" in ids:
            raise hic.HicUnavailable("timed out")
        return {"results": [{"source": s, "items": [{"title": f"From {s}", "url": f"https://{s}.example/a", "date": "2026-11-20",
                                                    "content": "students and detectors"}]} for s in ids]}
    monkeypatch.setattr(hic, "_call", call)
    monkeypatch.setattr(hic, "PACK_BATCH", 3)
    monkeypatch.setattr(hic, "general_source_ids", lambda: [])
    packindex.remember([{"title": "Earlier", "url": "https://old.example/x", "date": "2026-11-01", "content": "students detectors", "publisher": "Old", "pack": "higher_ed"}])
    monkeypatch.setattr(hic, "PACKS", {"higher_ed": "Higher Ed", "retail": "Retail"})
    rep = {}
    hic.pack_items(["higher_ed", "retail"], "students detectors", report=rep)          # the one batch fails; the index answers
    assert rep["skipped"] == 3 and rep["local"] == 1
    packindex.suspects(["good1", "hangs", "good2"])                                     # (a mixed run marks them itself)
    got = packindex.probe(call, owner={"good1": "higher_ed", "good2": "higher_ed", "hangs": "higher_ed"}, now=1_000_000.0)
    assert got["cleared"] == 2 and got["set_aside"] == 1 and got["items"] == 2 and packindex.suspects() == []
    assert list(packindex.set_aside(now=1_000_100.0)) == ["hangs"] and packindex.set_aside(now=1_000_000.0 + 8 * 86400) == {}
    monkeypatch.setattr(packindex, "set_aside", lambda now=None: {"hangs": 1.0})
    rep = {}
    items = hic.pack_items(["higher_ed"], "students detectors", report=rep, loose=("higher_ed",))
    assert rep["set_aside"] == 1 and rep["skipped"] == 0 and rep["searched"] == 2 and len(items) >= 2
