"""A skill's quality and the model it was judged on (harness WS-H9, from the Uber article: a skill quality score from
evaluations and usage; skills compiled per model and checked again when the model changes)."""
import json

import pytest
from fastapi.testclient import TestClient

from ia_next import app as app_module, config, skills, store


@pytest.fixture(autouse=True)
def _own_store(tmp_path):
    """Each test sees only its own skill versions and events."""
    store.reset_for_tests(str(tmp_path / "skills.sqlite3"))
    config.ensure_dirs()


def test_quality_counts_use_verdicts_and_flags_a_model_change(monkeypatch):
    skills.seed("local_writer", "Write the report. Keep evidence, quote, no em-dash.")
    cand = skills.propose("local_writer", "Write the report. Name the decision first. Keep evidence, quote, no em-dash." * 3, "test")
    skills._db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps(
        {"passed": True, "model": "qwen-old", "cases": [{"candidate": 0.8, "incumbent": 0.7}, {"candidate": 0.9, "incumbent": 0.8}]}), cand["id"]))
    assert skills.promote(cand["id"])["promoted"] == cand["id"]
    eid = store.create_engagement("e", "o")
    for verdict in ("accept", "accept", "reject"):
        tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
        store.event("skill_used", {"skill": "local_writer", "version": 2}, eid, tid)
        store.event("task_feedback", {"verdict": verdict}, eid, tid)
    monkeypatch.setitem(config.SEATS, "artifact", dict(config.SEATS["artifact"], primary="qwen-new"))
    q = skills.quality("local_writer")
    assert q == {"version": 2, "held_out": 0.85, "evaluated_on": "qwen-old", "model_now": "qwen-new", "recheck": True,
                 "uses": 3, "accepted": 2, "rejected": 1}
    listed = {s["skill"]: s for s in TestClient(app_module.app).get("/api/skills").json()["skills"]}
    assert listed["local_writer"]["quality"]["recheck"] is True


def test_a_seed_version_has_no_score_yet():
    skills.seed("local_journey", "Map the journey. Keep verbatim quote evidence.")
    q = skills.quality("local_journey")
    assert q["version"] == 1 and q["held_out"] is None and q["recheck"] is False


def _task_using(skill, version, eid, verdict=None):
    tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
    store.update_task(tid, status="done")
    store.event("skill_used", {"skill": skill, "version": version}, eid, tid)
    if verdict:
        store.event("task_feedback", {"verdict": verdict}, eid, tid)
    return tid


def test_a_canary_serves_one_call_in_three_and_is_kept_when_no_worse(monkeypatch):
    """Uber: canary a skill change. A canary that has shaped enough work, no worse than the active version, is kept."""
    skills.seed("local_writer", "Write the report. Keep evidence, quote, no em-dash.")
    cand = skills.propose("local_writer", "Write the report as a finding. Name the decision first. Keep evidence, quote, no em-dash." * 3, "test")
    skills._db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps({"passed": True, "cases": []}), cand["id"]))
    assert skills.promote(cand["id"], canary=True)["canary"] == cand["id"]
    eid = store.create_engagement("e", "o")
    monkeypatch.setattr(store, "current_task", lambda: (_task_using("local_writer", 0, eid), eid))
    served = [skills.active_text("local_writer", "x") for _ in range(6)]
    assert sum(1 for t in served if "as a finding" in t) == 2                    # one call in three
    monkeypatch.setattr(store, "current_task", lambda: (None, None))
    for _ in range(3):
        _task_using("local_writer", 2, eid)
    _task_using("local_writer", 1, eid, verdict="reject")
    d = skills.review_canaries()
    assert d and d[0]["kept"] is True and skills.quality("local_writer")["version"] == 2


def test_a_canary_with_more_rejections_is_retired():
    skills.seed("local_writer", "Write the report. Keep evidence, quote, no em-dash.")
    cand = skills.propose("local_writer", "Write the report loosely. Name the decision first. Keep evidence, quote, no em-dash." * 3, "test")
    skills._db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps({"passed": True, "cases": []}), cand["id"]))
    skills.promote(cand["id"], canary=True)
    eid = store.create_engagement("e", "o")
    for v in ("reject", "reject", None):
        _task_using("local_writer", 2, eid, verdict=v)
    _task_using("local_writer", 1, eid)
    d = skills.review_canaries()
    assert d and d[0]["kept"] is False and skills.quality("local_writer")["version"] == 1


def test_a_candidate_must_beat_the_noise_band():
    """Uber: run each case twice to learn how much two identical runs differ. A gain inside that band is not a pass."""
    rows = [{"incumbent": 0.70, "candidate": 0.72, "incumbent_again": 0.75}, {"incumbent": 0.80, "candidate": 0.82, "incumbent_again": 0.76}]
    passed, noise, gain = skills._verdict(rows)
    assert (passed, noise, gain) == (False, 0.045, 0.02)
    rows = [{"incumbent": 0.70, "candidate": 0.80, "incumbent_again": 0.71}, {"incumbent": 0.80, "candidate": 0.88, "incumbent_again": 0.80}]
    passed, noise, gain = skills._verdict(rows)
    assert passed is True and noise == 0.005 and gain == 0.09
