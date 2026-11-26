"""Field test 2026-11-23, Gap 1: the Library answers from the local index, with filters, and adds picked sources."""
import json

from ia_next import libraryview, store


def _eng(title, rows):
    eid = store.create_engagement(title, "o")
    import os
    p = store.safe_path(eid, "results/sources.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"sources": rows}, fh)
    for s in rows:
        store.add_evidence(eid, s["id"], s["url"], s["title"], s["text"])
    return eid


def test_the_library_searches_everything_collected_and_filters_it():
    a = _eng("Students and AI", [
        {"id": "S1", "url": "https://ihe.example/a", "title": "Students draft essays with chatbots", "text": "Undergraduates report drafting essays with chatbots. " * 20,
         "publisher": "Inside Higher Ed", "date": "2026-11-20", "pack": "higher_ed"},
        {"id": "S2", "url": "https://vb.example/b", "title": "Agents reach the enterprise", "text": "Enterprises deploy agents in finance teams. " * 20,
         "publisher": "VentureBeat AI", "date": "2025-03-01", "pack": "ai_trends"}])
    b = _eng("Nurse staffing", [
        {"id": "S1", "url": "https://hosp.example/c", "title": "Hospitals track nurse turnover", "text": "Hospitals track turnover among nurses each quarter. " * 20,
         "publisher": "Health Affairs", "date": "", "pack": ""}])
    got = libraryview.search("chatbots essays")
    assert [it["title"] for it in got["items"]] == ["Students draft essays with chatbots"] and got["seconds"] < 1
    assert got["items"][0]["publisher"] == "Inside Higher Ed" and got["items"][0]["engagement"] == "Students and AI"
    everything = libraryview.search("")
    assert everything["total"] >= 3
    packs = {f["value"]: f["count"] for f in everything["facets"]["pack"]}
    assert packs.get("higher_ed") == 1 and packs.get("ai_trends") == 1 and packs.get("none", 0) >= 1
    assert [it["title"] for it in libraryview.search("", pack="ai_trends")["items"]] == ["Agents reach the enterprise"]
    assert all(it["engagement_id"] == b for it in libraryview.search("", engagement=b)["items"])
    assert libraryview.search("turn")["items"][0]["title"] == "Hospitals track nurse turnover"        # a prefix matches as typed
    assert libraryview.search("zzzzqq")["items"] == []


def test_picked_sources_join_an_engagement_with_their_origin():
    a = _eng("Origin", [{"id": "S1", "url": "https://x.example/1", "title": "A dated page", "text": "Body text of the page. " * 30,
                         "publisher": "Pub", "date": "2026-11-18", "pack": "ai_trends"}])
    b = store.create_engagement("Target", "o")
    ev = libraryview.search("dated page")["items"][0]["id"]
    out = libraryview.add([ev], b)
    assert out == {"added": ["S1"], "skipped": 0}
    rows = json.load(open(store.safe_path(b, "results/sources.json"), encoding="utf-8"))["sources"]
    assert rows[0]["publisher"] == "Pub" and rows[0]["date"] == "2026-11-18" and rows[0]["from_library"]["engagement_id"] == a
    assert libraryview.add([ev], b) == {"added": [], "skipped": 1}                                   # already there
    assert libraryview.item("ev_missing") is None
