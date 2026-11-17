"""Offline tests for enhancement plan B4: a Stop the server confirms, Try again with the same budget, and asking before
paid research when an engagement already has findings. No network and no model calls."""
import json
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, app as app_module, config, control, deck, lifecycle, providers, store, studio  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


@pytest.fixture
def client():
    return TestClient(app_module.app)


@pytest.fixture
def runners(monkeypatch):
    """Replace the real task runners with recorders, so a retry starts no thread that calls a model."""
    ran = []
    monkeypatch.setattr(lifecycle, "_runners", lambda: {k: (lambda tid: ran.append(tid)) for k in
                                                       ("research_report", "journey_map", "deck", "prototype", "social", "transcript")})
    return ran


def _task(kind="deck", status="failed", budget=2.5, brief=None):
    eid = store.create_engagement("Advancement", "Where do alumni drop off?")
    tid, _ = store.create_task(eid, kind, brief or {"audience": "leaders", "outline": [], "brand": "nu"}, budget)
    store.update_task(tid, status=status, error="model timed out" if status == "failed" else None)
    return eid, tid


# ---- Stop ------------------------------------------------------------------------------------------
def test_stop_moves_a_running_task_to_stopping_and_a_runner_cannot_undo_it():
    _, tid = _task(status="running")
    assert store.request_stop(tid) is True and store.get_task(tid)["status"] == "stopping"
    assert store.request_stop(tid) is False                       # a second press changes nothing
    store.update_task(tid, status="running")                      # a late "running" from the runner
    assert store.get_task(tid)["status"] == "stopping"
    store.update_task(tid, status="failed", error="anything")     # the runner's failure after the stop
    t = store.get_task(tid)
    assert t["status"] == "stopped" and t["error"] == store.STOPPED_BY_YOU


def test_work_that_finishes_after_a_stop_is_still_done():
    _, tid = _task(status="running")
    store.request_stop(tid)
    store.update_task(tid, status="done", summary="Deck ready")
    assert store.get_task(tid)["status"] == "done"


def test_stop_is_refused_for_work_that_already_ended():
    _, tid = _task(status="done")
    with pytest.raises(ValueError, match="already finished"):
        lifecycle.stop(tid)
    with pytest.raises(KeyError):
        lifecycle.stop("task_nope")


def test_the_ledger_raises_a_stop_that_ordinary_error_handlers_cannot_swallow():
    _, tid = _task(status="running")
    led = providers.Ledger(limit_usd=5.0, task_id=tid)
    led.add(providers.Usage(model="claude-opus-5-5", input_tokens=1000))          # running: no stop
    store.request_stop(tid)
    swallowed = False
    with pytest.raises(store.TaskStopped) as e:
        try:
            led.add(providers.Usage(model="claude-opus-5-5", input_tokens=1000))
        except Exception:                                                        # a per-page catch-all
            swallowed = True
    assert not swallowed and e.value.spent_usd == led.spent_usd > 0
    assert providers.Ledger(limit_usd=5.0).add(providers.Usage(model="x")) is None  # no task id: no stop check


def test_a_stopped_runner_ends_stopped_with_its_spend_and_open_step_closed():
    _, tid = _task(status="running")

    @store.stoppable
    def runner(task_id):
        store.start_node(task_id, "Deck Composer", "m", 1)
        store.request_stop(task_id)
        raise store.TaskStopped(1.25)

    runner(tid)
    t = store.get_task(tid)
    assert t["status"] == "stopped" and t["spent_usd"] == 1.25 and t["error"] == store.STOPPED_BY_YOU
    assert [(n["state"], n["error"]) for n in t["nodes"]] == [("failed", store.STOPPED_BY_YOU)]


def test_stop_pressed_during_a_real_deck_run_stops_it_after_the_call_in_flight(monkeypatch):
    """The deck runner end to end: the person presses Stop while the composer call is in flight; when that call is
    metered the run ends 'stopped', no image is made and nothing is published."""
    eid = store.create_engagement("Advancement", "o")
    for name, data in (("findings.json", {"findings": [{"claim": "c", "quote": "q", "source_id": "S1"}]}),
                       ("sources.json", {"sources": [{"id": "S1", "title": "t", "url": "u", "text": "q"}]})):
        with open(store.safe_path(eid, f"results/{name}"), "w", encoding="utf-8") as fh:
            json.dump(data, fh)
    tid, _ = store.create_task(eid, "deck", {"audience": "a", "outline": [], "brand": "nxt"}, 2.5)

    def composer(model, system, messages, ledger, **kw):
        store.request_stop(tid)                                          # the person presses Stop mid-call
        ledger.add(providers.Usage(model=model, input_tokens=20000, output_tokens=4000))
        raise AssertionError("the ledger should have stopped the run")

    monkeypatch.setattr(providers, "claude", composer)
    monkeypatch.setattr(providers, "openai_image", lambda *a, **k: pytest.fail("an image was made after Stop"))
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "stopped" and t["spent_usd"] > 0 and t["nodes"][0]["state"] == "failed"
    assert not os.path.exists(store.safe_path(eid, f"results/decks/{tid}/deck.pptx"))


def test_a_restart_finishes_a_stopping_task_as_stopped():
    _, tid = _task(status="running")
    store.request_stop(tid)
    store.finish_stopped(tid)
    assert store.get_task(tid)["status"] == "stopped"


# ---- Try again -------------------------------------------------------------------------------------
def test_try_again_starts_the_same_task_with_the_same_budget(runners):
    eid, tid = _task(budget=2.5)
    out = lifecycle.retry(tid)
    new = store.get_task(out["task_id"])
    assert out["started"] and out["retry_of"] == tid and runners == [new["id"]]
    assert (new["kind"], new["brief"], new["budget_usd"], new["engagement_id"]) == ("deck", store.get_task(tid)["brief"], 2.5, eid)
    again = lifecycle.retry(tid)                                    # a double click while the retry runs
    assert again["task_id"] == new["id"] and not again["started"] and runners == [new["id"]]
    store.update_task(new["id"], status="failed", error="x")       # that attempt failed too: a new attempt is allowed
    third = lifecycle.retry(tid)
    assert third["task_id"] != new["id"] and third["started"] and len(runners) == 2


def test_try_again_works_for_stopped_work_and_refuses_finished_work(runners):
    _, tid = _task(status="stopped")
    assert lifecycle.retry(tid)["started"]
    _, done = _task(status="done")
    with pytest.raises(ValueError, match="did not finish"):
        lifecycle.retry(done)


def test_try_again_above_the_threshold_waits_for_a_fresh_approval_then_launches_once(client, runners):
    _, tid = _task(budget=config.TASK_SPEND_APPROVAL_USD + 2)
    out = lifecycle.retry(tid)
    assert out["approval"] == "pending" and runners == []
    assert lifecycle.retry(tid)["approval_id"] == out["approval_id"]          # one pending card, not two
    r = client.post(f"/api/approvals/{out['approval_id']}", json={"approve": True})
    assert r.status_code == 200 and r.json()["started"]["started"] and len(runners) == 1
    assert store.get_task(runners[0])["budget_usd"] == config.TASK_SPEND_APPROVAL_USD + 2
    client.post(f"/api/approvals/{out['approval_id']}", json={"approve": True})   # pressed again
    assert len(runners) == 1


def test_stop_and_retry_routes(client, runners):
    _, running = _task(status="running")
    r = client.post(f"/api/tasks/{running}/stop")
    assert r.status_code == 200 and r.json()["status"] == "stopping"
    assert client.post(f"/api/tasks/{running}/retry").status_code == 409      # still stopping: nothing to retry yet
    _, done = _task(status="done")
    assert client.post(f"/api/tasks/{done}/stop").status_code == 409
    assert client.post("/api/tasks/task_nope/stop").status_code == 404
    _, failed = _task(status="failed")
    r = client.post(f"/api/tasks/{failed}/retry")
    assert r.status_code == 200 and r.json()["task_id"] in runners


def test_agent_tools_stop_and_retry(runners):
    _, running = _task(status="running")
    assert agent.execute_tool("stop_task", {"task_id": running})["status"] == "stopping"
    _, failed = _task(status="failed")
    assert agent.execute_tool("retry_task", {"task_id": failed})["started"]
    assert "no such task" in agent.execute_tool("retry_task", {"task_id": "task_nope"})["error"]
    names = {t["name"] for t in agent.TOOLS}
    assert {"stop_task", "retry_task"} <= names


# ---- ask before paid research when findings exist ------------------------------------------------------
def _research_args(eid, confirmed):
    return {"engagement_title": "t", "engagement_id": eid, "audience": "a", "goal": "g", "scope": "s", "structure": "st",
            "constraints": "c", "success": [], "budget_usd": 1.0, "new_research_confirmed": confirmed}


def test_research_with_existing_findings_asks_first_and_runs_only_when_confirmed(monkeypatch):
    started = []
    monkeypatch.setattr(studio, "start_research_task", lambda *a, **k: (started.append(a) or ("task_x", True)))
    eid = store.create_engagement("Advancement", "o")
    with open(store.safe_path(eid, "results/findings.json"), "w", encoding="utf-8") as fh:
        json.dump({"findings": [{"claim": "c"}, {"claim": "d"}]}, fh)
    out = agent.execute_tool("start_research_report", _research_args(eid, False))
    assert out["needs_confirmation"] and out["existing_findings"] == 2 and "build on them" in out["message"] and not started
    assert agent.execute_tool("start_research_report", _research_args(eid, True))["task_id"] == "task_x" and started
    fresh_eid = store.create_engagement("New", "o")                  # no findings yet: no question needed
    assert agent.execute_tool("start_research_report", _research_args(fresh_eid, False))["task_id"] == "task_x"


def test_research_tool_requires_the_confirmation_field():
    spec = next(t for t in agent.TOOLS if t["name"] == "start_research_report")
    assert "new_research_confirmed" in spec["input_schema"]["required"]
    assert spec["input_schema"]["properties"]["new_research_confirmed"]["type"] == "boolean"


# The Messages API compiles every strict tool schema into one grammar and rejects the request when it is too large
# ("The compiled grammar is too large", seen live on 17 Nov after stop_task and retry_task were added as strict).
# Seventeen strict tools plus the research confirmation field were verified live; new tools stay non-strict
# unless one is removed.
STRICT_TOOLS_VERIFIED_LIVE = 17


def test_the_strict_tool_grammar_stays_within_what_the_api_accepted():
    strict = [t["name"] for t in agent.TOOLS if t.get("strict")]
    assert len(strict) <= STRICT_TOOLS_VERIFIED_LIVE, strict
    for t in agent.TOOLS:
        s = t["input_schema"]
        assert s["additionalProperties"] is False and set(s["required"]) <= set(s["properties"]), t["name"]


def test_finished_analysis_is_used_instead_of_analysing_the_same_files_again(monkeypatch):
    """Part 1: the owner's #diagram prompt started a new paid analysis instead of reading the 15 verified findings.
    With nothing uploaded since the last finished analysis, the tool asks first."""
    from ia_next import transcripts
    monkeypatch.setattr(transcripts, "run_transcript_task", lambda tid: None)
    eid = store.create_engagement("Advancement", "o")
    transcripts.add_text_source(eid, "Interview A", "Donors said the follow-up came too late to matter.", "transcript")
    args = {"engagement_id": eid, "objective": "What do donors say about follow-up?", "reanalyze_confirmed": False}
    first = transcripts.execute("analyze_uploads", args)
    store.update_task(first["task_id"], status="done")
    with open(store.safe_path(eid, "results/findings.json"), "w", encoding="utf-8") as fh:
        json.dump({"findings": [{"claim": "c"}] * 15}, fh)
    asked = transcripts.execute("analyze_uploads", dict(args, objective="Draw the donor journey as a diagram"))
    assert asked["needs_confirmation"] and asked["existing_findings"] == 15 and asked["existing_task_id"] == first["task_id"]
    again = transcripts.execute("analyze_uploads", dict(args, objective="Draw the donor journey as a diagram", reanalyze_confirmed=True))
    assert again["started"] and again["task_id"] != first["task_id"]
    store.update_task(again["task_id"], status="done")
    transcripts.add_text_source(eid, "Interview B", "A second donor described a different experience entirely.", "transcript")
    fresh = transcripts.execute("analyze_uploads", dict(args, objective="Anything new?"))
    assert fresh.get("started")                                     # new uploads: no question needed
