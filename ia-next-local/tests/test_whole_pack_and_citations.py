"""Deep research reads the whole pack; every finished page names publication, date and address (QA 25 Nov, E2)."""
from ia_next import citations, config, hic, packindex, store


def _fresh(monkeypatch, tmp_path):
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))


def _fake_hic(n_sources, asked):
    ids = [f"feed{i}" for i in range(n_sources)]

    def call(method, path, timeout, **kw):
        if path.startswith("/api/source-packs/"):
            return {"sourceIds": ids, "name": "Logistics"}
        part = kw["params"]["sources"].split(",")
        asked.append((kw["params"]["q"], tuple(part), kw["params"]["limit"]))
        return {"results": [{"source": f"Publisher {s[4:]}", "credibilityTier": 2, "items": [] if s == "feed3" else [
            {"title": f"Port delays at {s} {k}", "url": f"https://example.org/{s}/{kw['params']['q'].replace(' ', '-')}/{k}",
             "date": "2026-11-20", "content": f"Port delays and container dwell time at terminal {s}, item {k}. " * 4}
            for k in range(2)]} for s in part]}
    return call


def test_every_source_of_the_pack_is_asked_for_ten_items_per_question(monkeypatch, tmp_path):
    _fresh(monkeypatch, tmp_path)
    asked = []
    out = packindex.read_whole(["logistics"], _fake_hic(23, asked), ["port delays container", "dwell time terminals"], budget_seconds=30)
    first = [a for a in asked if a[0] == "port delays container"]
    assert sorted(s for _, part, _ in first for s in part) == sorted(f"feed{i}" for i in range(23))
    assert all(limit == packindex.PER_SOURCE for _, _, limit in asked)
    assert out["sources"] == 23 and out["answered"] == 22 and out["complete"] and out["items"] > 40
    second = {s for q, part, _ in asked if q == "dwell time terminals" for s in part}
    assert "feed3" not in second and len(second) == 22          # later questions go to the feeds that answer
    asked.clear()
    again = packindex.read_whole(["logistics"], _fake_hic(23, asked), ["port delays container"], budget_seconds=30)
    assert not asked and again["complete"] and again["fresh"] == 23          # read within the last hours: not read again


def test_the_index_is_searched_with_every_question(monkeypatch, tmp_path):
    _fresh(monkeypatch, tmp_path)
    packindex.remember([
        {"title": "Port delays grow", "url": "https://example.org/a", "date": "2026-11-20", "content": "Port delays grew at the terminal. " * 20, "publisher": "A", "pack": "logistics", "tier": 2},
        {"title": "Dwell time", "url": "https://example.org/b", "date": "2026-11-21", "content": "Container dwell time rose for importers. " * 20, "publisher": "B", "pack": "logistics", "tier": 2}])
    monkeypatch.setitem(hic.PACKS, "logistics", "Logistics")
    monkeypatch.setattr(hic, "_call", lambda method, path, timeout, **kw: {"sourceIds": ["feed1"]})
    got = hic.pack_items(["logistics"], "port delays", keep=20, loose=["logistics"], queries=["container dwell importers"], live=False)
    assert {g["url"] for g in got} == {"https://example.org/a", "https://example.org/b"}


def test_a_sources_row_gains_publication_date_and_address_once():
    page = '<ol><li id="src-S1"><b>1</b>Freight Weekly: Port delays grow</li><li id="src-S9">x</li></ol>'
    src = [{"id": "S1", "title": "Freight Weekly: Port delays grow", "publisher": "freightweekly.example", "date": "2026-11-20",
            "url": "https://www.freightweekly.example/port-delays"}]
    out = citations.enrich(page, src)
    assert "Freight Weekly" in out and "20 November 2026" in out and 'href="https://www.freightweekly.example/port-delays"' in out
    assert "freightweekly.example/port-delays</a>" in out
    assert citations.enrich(out, src) == out and '<li id="src-S9">x</li>' in out


def test_an_undated_source_says_so():
    assert "undated" in citations.meta_html({"id": "S2", "title": "A page", "publisher": "The Register", "url": ""})
