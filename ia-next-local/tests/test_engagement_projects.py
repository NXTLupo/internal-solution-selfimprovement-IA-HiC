"""Engagements managed as projects (field test 23 Nov, Gap 3; owner, 24 Nov: "managing engagements like projects,
naming them, editing their settings"): name, client, description, tags, pin, archive, per-engagement defaults, bulk
changes and a merge that can be undone."""
import json

import pytest
from fastapi.testclient import TestClient

from ia_next import app as appmod, plan, store


@pytest.fixture()
def db(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.db"))
    return TestClient(appmod.app)


def test_an_engagement_is_edited_like_a_project(db):
    eid = store.create_engagement("Untitled", "first objective")
    r = db.post(f"/api/engagements/{eid}/settings", json={
        "title": "  Northeastern   advising ", "client": "Northeastern University", "description": "How students use advising",
        "tags": ["higher ed", "Higher Ed", "advising, 2026"], "pinned": True,
        "settings": {"packs": ["higher_ed"], "period": "90", "depth": "deep", "brand": "nu", "audience": "The provost", "unknown": "x"}})
    assert r.status_code == 200
    e = db.get(f"/api/engagements/{eid}/settings").json()
    assert e["title"] == "Northeastern advising" and e["client"] == "Northeastern University"
    assert e["description"] == "How students use advising" and store.get_engagement(eid)["objective"] == "How students use advising"
    assert e["tags"] == ["higher ed", "advising 2026"] and e["pinned"] == 1
    assert e["settings"] == {"packs": ["higher_ed"], "period": "90", "depth": "deep", "brand": "nu", "audience": "The provost"}
    # one field changes, the others stay; an empty value clears a default
    db.post(f"/api/engagements/{eid}/settings", json={"settings": {"depth": ""}})
    assert "depth" not in store.get_engagement(eid)["settings"] and store.get_engagement(eid)["settings"]["period"] == "90"
    assert db.post(f"/api/engagements/{eid}/settings", json={"title": "  "}).status_code == 400
    assert db.post(f"/api/engagements/{eid}/settings", json={"settings": {"period": "12"}}).status_code == 400
    assert db.post("/api/engagements/eng_missing/settings", json={"title": "x"}).status_code == 404


def test_new_work_starts_from_the_engagements_defaults_unless_the_request_says_otherwise(db):
    eid = store.create_engagement("Advising", "o")
    store.update_engagement(eid, {"settings": {"packs": ["higher_ed"], "depth": "deep", "audience": "The provost", "brand": "nu", "period": "90"}})
    tid, _ = store.create_task(eid, "research_report", {"goal": "g", "audience": "The person who asked for this work", "brand": "nxt"}, 1.0)
    b = json.loads(store.conn().execute("SELECT brief FROM tasks WHERE id = ?", (tid,)).fetchone()["brief"])
    assert (b["selected_packs"], b["depth"], b["audience"], b["brand"]) == (["higher_ed"], "deep", "The provost", "nu")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g", "selected_packs": ["retail"], "depth": "fast", "audience": "The board"}, 1.0)
    b = json.loads(store.conn().execute("SELECT brief FROM tasks WHERE id = ?", (tid,)).fetchone()["brief"])
    assert (b["selected_packs"], b["depth"], b["audience"]) == (["retail"], "fast", "The board")
    # the plan card opens on the engagement's period and depth; words in the request win
    opts = {o["key"]: o["value"] for o in plan._evidence_options("start_research_report", {"engagement_id": eid, "goal": "advising"}, "a report on advising")}
    assert opts == {"period": "90", "depth": "deep"}
    opts = {o["key"]: o["value"] for o in plan._evidence_options("start_research_report", {"engagement_id": eid}, "a report on advising this week")}
    assert opts["period"] == "7"


def test_archive_pin_and_tags_apply_to_several_at_once_and_pinned_come_first(db):
    a, b, c = (store.create_engagement(n, "o") for n in ("A", "B", "C"))
    r = db.post("/api/engagements/bulk", json={"ids": [a, b], "add_tags": ["pilot"], "pinned": True})
    assert r.json()["updated"] == [a, b]
    db.post("/api/engagements/bulk", json={"ids": [b], "archived": True, "remove_tags": ["PILOT"]})
    shown = db.get("/api/engagements").json()
    assert [e["title"] for e in shown["engagements"]][0] == "A" and {e["title"] for e in shown["engagements"]} == {"A", "C"}
    assert shown["hidden_count"] == 1
    all_ = {e["title"]: e for e in db.get("/api/engagements?include_hidden=1").json()["engagements"]}
    assert all_["B"]["archived"] == 1 and all_["B"]["tags"] == [] and all_["A"]["tags"] == ["pilot"]
    db.post("/api/engagements/bulk", json={"ids": [b], "archived": False})
    assert len(db.get("/api/engagements").json()["engagements"]) == 3


def test_merging_shows_the_others_work_under_one_engagement_and_can_be_undone(db):
    keep, other = store.create_engagement("Students and AI", "o"), store.create_engagement("Students and AI (second run)", "o")
    t1, _ = store.create_task(keep, "themes", {"goal": "g"}, 1.0)
    t2, _ = store.create_task(other, "deck", {"goal": "g"}, 1.0)
    store.add_evidence(other, "S1", "https://example.org/a", "A page", "Text of the page about students.")
    store.add_evidence(keep, "S1", "https://example.org/b", "B page", "Other text.")
    r = db.post("/api/engagements/merge", json={"ids": [keep, other], "into": keep})
    assert r.status_code == 200 and r.json() == {"into": keep, "merged": [other], "sources_copied": 1}
    rows = db.get("/api/engagements").json()["engagements"]
    assert [e["id"] for e in rows] == [keep] and rows[0]["merged"] == [other] and rows[0]["task_count"] == 2
    assert {t["id"] for t in db.get(f"/api/tasks?engagement_id={keep}").json()["tasks"]} == {t1, t2}
    assert store.get_task(t2)["engagement_id"] == other                    # nothing moved: files and links keep working
    urls = {r["url"] for r in store.conn().execute("SELECT url FROM evidence WHERE engagement_id = ?", (keep,))}
    assert urls == {"https://example.org/a", "https://example.org/b"}
    assert db.post(f"/api/engagements/{other}/unmerge").status_code == 200
    assert len(db.get("/api/engagements").json()["engagements"]) == 2
    assert db.post(f"/api/engagements/{other}/unmerge").status_code == 404


def test_merging_into_a_new_named_engagement(db):
    a, b = store.create_engagement("A", "o"), store.create_engagement("B", "o")
    r = db.post("/api/engagements/merge", json={"ids": [a, b], "title": "Combined", "copy_sources": False}).json()
    assert sorted(r["merged"]) == sorted([a, b])
    rows = db.get("/api/engagements").json()["engagements"]
    assert [e["title"] for e in rows] == ["Combined"]
    assert db.post("/api/engagements/merge", json={"ids": [a]}).status_code == 400


def test_failed_slow_and_soft_failing_work_reaches_the_improvement_loop(db):
    from ia_next import improve
    eid = store.create_engagement("Loop", "o")
    for _ in range(2):
        tid, _new = store.create_task(eid, "deck", {"goal": "g"}, 1.0)
        store.update_task(tid, status="failed", error="the composer returned no slides")
    slow, _new = store.create_task(eid, "research_report", {"goal": "g"}, 1.0)
    store.update_task(slow, status="done")
    store.conn().execute("UPDATE tasks SET created = updated - 3300 WHERE id = ?", (slow,))
    ok, _new = store.create_task(eid, "themes", {"goal": "g"}, 1.0)
    store.update_task(ok, status="done")
    store.event("scorecard", {"hard_failed": [], "soft_failed": ["source_quality"]}, eid, ok)
    g = improve.groups()
    assert len(g[("deck", "task_failed")]["tasks"]) == 2 and "no slides" in g[("deck", "task_failed")]["details"][0]
    assert g[("research_report", "took_too_long")]["tasks"] == [slow] and "55 minutes" in g[("research_report", "took_too_long")]["details"][0]
    assert g[("themes", "source_quality")]["tasks"] == [ok]
    got = improve.run()
    assert {"kind": "deck", "check": "task_failed", "tasks": 2} in got["attention"]


def test_a_plan_estimate_grows_when_the_card_is_measured_slow(db, monkeypatch):
    import time
    from ia_next import config, providers
    writer = config.SEATS["artifact"]["primary"]
    monkeypatch.setattr(providers, "_SPEED", {})
    assert providers.slow_factor() == 1.0 and plan.expected("Nobody", 100) == (100, 0)
    monkeypatch.setattr(providers, "_SPEED", {writer: {"tps": 7.0, "at": time.time()}})
    assert providers.slow_factor() == 4.0 and plan.expected("Nobody", 100) == (400, 0)
    monkeypatch.setattr(providers, "_SPEED", {writer: {"tps": 14.0, "at": time.time()}})
    assert providers.slow_factor() == 2.0
    monkeypatch.setattr(providers, "_SPEED", {writer: {"tps": 7.0, "at": time.time() - 3600}})       # an old reading says nothing
    assert providers.slow_factor() == 1.0
    monkeypatch.setattr(providers, "_SPEED", {writer: {"tps": 26.0, "at": time.time()}})
    assert providers.slow_factor() == 1.0


def test_packs_are_picked_from_the_requests_words_and_offered_as_a_choice_on_the_plan_card(db):
    from ia_next import hic
    assert hic.quick_packs("how higher education students use AI and how they feel about it") in (["higher_ed", "ai_trends"], ["ai_trends", "higher_ed"])
    assert hic.quick_packs("nurse staffing levels and patient outcomes in US hospitals") == ["healthcare"]
    assert hic.quick_packs("a poem about autumn") == []
    assert hic.packs_for_choice("none", "students and AI") == ([], True)
    assert hic.packs_for_choice("only:higher_ed", "students and AI") == (["higher_ed"], False)
    eid = store.create_engagement("Students", "o")
    opts = plan._evidence_options("start_research_report", {"engagement_id": eid}, "a report on how university students use AI")
    pack = next(o for o in opts if o["key"] == "pack_choice")
    assert pack["value"] == "auto" and [c["value"] for c in pack["choices"]][-1] == "none" and "Higher Ed" in pack["choices"][0]["label"]
    assert any(c["value"] == "only:higher_ed" for c in pack["choices"])
    # the person's own choice, or the engagement's default packs, leave nothing to offer
    # packs the agent picked are offered the same way, and "auto" keeps them
    agent_opts = plan._evidence_options("start_research_report", {"engagement_id": eid, "packs": ["retail"]}, "university students and AI")
    assert next(o for o in agent_opts if o["key"] == "pack_choice")["choices"][0]["label"] == "Retail & Commerce"
    assert hic.packs_for_choice("auto", "students and AI", ["retail"]) == (["retail"], False)
    tok = store.TURN.set({"packs": ["retail"]})                                    # the person's own selection: nothing to offer
    assert not any(o["key"] == "pack_choice" for o in plan._evidence_options("start_research_report", {"engagement_id": eid}, "university students and AI"))
    store.TURN.reset(tok)
    store.update_engagement(eid, {"settings": {"packs": ["higher_ed"]}})
    assert not any(o["key"] == "pack_choice" for o in plan._evidence_options("start_research_report", {"engagement_id": eid}, "university students and AI"))
    assert not any(o["key"] == "pack_choice" for o in plan._evidence_options("start_research_report", {}, "a poem about autumn"))


def test_stopped_or_failed_work_can_be_asked_for_again_and_finished_work_is_returned(db):
    eid = store.create_engagement("Again", "o")
    first, new = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="k1")
    assert new and store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="k1") == (first, False)     # running: the same task
    store.update_task(first, status="stopped")
    second, new = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="k1")
    assert new and second != first and store.get_task(first)["status"] == "stopped"
    store.update_task(second, status="failed", error="x")
    third, new = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="k1")
    assert new and third not in (first, second)
    store.update_task(third, status="done")
    assert store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="k1") == (third, False)             # finished: returned


def test_the_packs_shown_on_the_card_are_searched_when_the_choice_is_left_alone(db):
    eid = store.create_engagement("Nurses", "o")
    args = plan.apply_options("start_research_report", {"engagement_id": eid, "goal": "hospital nurse staffing and patient safety"}, {})
    assert args["pack_choice"] == "auto"
    assert plan._choice(args, "hospital nurse staffing and patient safety") == (["healthcare"], False)
    assert plan.apply_options("start_research_report", {"engagement_id": eid, "goal": "hospital nurse staffing"}, {"pack_choice": "none"})["pack_choice"] == "none"
    assert "pack_choice" not in plan.apply_options("start_research_report", {"engagement_id": eid, "goal": "a poem about autumn"}, {})
