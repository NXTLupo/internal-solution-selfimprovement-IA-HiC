"""Skills re-checked on today's model (harness WS-H9, Uber: compile per model, re-check when the model changes): the
active version is scored twice on the model its work runs on now and compared with the score it earned when judged;
a drop beyond the noise band files a papercut and changes nothing; a hold clears the recheck flag; a version never
judged gets a baseline; the check pauses for the person's work and runs as a visible task."""
import json
import os

from ia_next import config, papercuts, providers, skills, store, verify


def _case(tmp_eid, model="old-model"):
    tid, _ = store.create_task(tmp_eid, "themes", {"goal": "g"}, 0.0)
    store.update_task(tid, status="done")
    skills.record_prompt(tmp_eid, tid, "theme_namer", model, "name these themes", 4000, "medium")
    p = store.safe_path(tmp_eid, "results/sources.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"sources": []}, fh)
    return tid


def _judged(score, model):
    skills.seed("theme_namer", skills.default_text("theme_namer"))
    act = skills._active_row("theme_namer")
    ev = {"cases": [{"candidate": score}], "model": model}
    skills._db().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps(ev), act["id"]))
    return act


def _scores(monkeypatch, values):
    it = iter(values)
    monkeypatch.setattr(providers, "claude", lambda *a, **k: ('{"name": "x"}', None, None))
    monkeypatch.setattr(verify, "deterministic", lambda text, sources: [])
    monkeypatch.setattr(verify, "judge", lambda *a, **k: {})
    monkeypatch.setattr(verify, "score", lambda f, v: next(it))
    monkeypatch.setattr(skills, "current_model", lambda skill: "new-model")


def test_a_drop_on_the_new_model_files_a_papercut_and_keeps_the_version(monkeypatch):
    eid = store.create_engagement("recheck drop", "o")
    _case(eid)
    act = _judged(0.9, "old-model")
    _scores(monkeypatch, [0.60, 0.62])
    filed = []
    monkeypatch.setattr(papercuts, "file", lambda *a, **k: filed.append(a))
    rec = skills.recheck("theme_namer", cases=skills.prompt_cases("theme_namer", limit=1))
    assert rec["holds"] is False and rec["score"] == 0.6 and rec["noise_band"] == 0.02 and filed
    after = skills._active_row("theme_namer")
    assert after["id"] == act["id"] and json.loads(after["eval_json"])["model"] == "old-model"      # nothing promoted or moved


def test_a_hold_clears_the_recheck_flag(monkeypatch):
    eid = store.create_engagement("recheck hold", "o")
    _case(eid)
    _judged(0.80, "old-model")
    _scores(monkeypatch, [0.81, 0.79])
    assert skills.quality("theme_namer")["recheck"] is True
    rec = skills.recheck("theme_namer", cases=skills.prompt_cases("theme_namer", limit=1))
    assert rec["holds"] is True and json.loads(skills._active_row("theme_namer")["eval_json"])["model"] == "new-model"
    assert skills.quality("theme_namer")["recheck"] is False


def test_a_version_never_judged_gets_a_baseline(monkeypatch):
    eid = store.create_engagement("recheck baseline", "o")
    _case(eid)
    skills.seed("theme_namer", skills.default_text("theme_namer"))
    act = skills._active_row("theme_namer")
    skills._db().execute("UPDATE skill_versions SET eval_json = NULL WHERE id = ?", (act["id"],))
    assert "theme_namer" in skills.recheck_due()
    _scores(monkeypatch, [0.7, 0.7])
    rec = skills.recheck("theme_namer", cases=skills.prompt_cases("theme_namer", limit=1))
    assert rec["baseline"] and rec["holds"] and "theme_namer" not in skills.recheck_due()


def test_the_check_pauses_for_the_persons_work(monkeypatch):
    eid = store.create_engagement("recheck pause", "o")
    _case(eid)
    _judged(0.8, "old-model")
    _scores(monkeypatch, [0.8, 0.8])
    assert skills.recheck("theme_namer", cases=skills.prompt_cases("theme_namer", limit=1), idle=lambda: False) == {"paused": True}


def test_the_recheck_runs_as_a_visible_task(monkeypatch):
    eid = store.create_engagement("recheck task", "o")
    _case(eid)
    _judged(0.8, "old-model")
    _scores(monkeypatch, [0.82, 0.8])
    monkeypatch.setattr(skills, "RECHECK_CASES", 1)
    rec = skills.run_recheck("theme_namer")
    t = store.get_task(rec["task_id"])
    assert t["kind"] == "skill_check" and t["status"] == "done" and t["summary"].startswith("Holds:")
    node = t["nodes"][0]
    assert node["specialist"].startswith("Scoring the theme namer skill") and "against 0.80 when judged" in (node["summary"] or ""), node


def test_background_checks_are_not_the_persons_work_and_can_be_paused(monkeypatch):
    from ia_next import hicmigrate
    assert {"dreaming", "skill_check", "model_check"} <= set(hicmigrate.BACKGROUND_KINDS)
    skills.pause_rechecks(10)
    try:
        assert skills.recheck_paused() and skills.recheck_pass(lambda: True) is None
    finally:
        skills.pause_rechecks(0)
    assert not skills.recheck_paused()


def test_the_repeat_run_uses_another_seed(monkeypatch):
    """27 Nov: every local call used seed 7, so two runs were identical and every noise band read 0.00."""
    eid = store.create_engagement("recheck seed", "o")
    _case(eid)
    _judged(0.8, "old-model")
    seeds = []

    def claude(*a, **k):
        seeds.append(providers.SEED.get())
        return '{"name": "x"}', None, None
    monkeypatch.setattr(providers, "claude", claude)
    monkeypatch.setattr(verify, "deterministic", lambda text, sources: [])
    monkeypatch.setattr(verify, "judge", lambda *a, **k: {})
    monkeypatch.setattr(verify, "score", lambda f, v: 0.8)
    monkeypatch.setattr(skills, "current_model", lambda skill: "new-model")
    skills.recheck("theme_namer", cases=skills.prompt_cases("theme_namer", limit=1))
    assert seeds == [7, 8] and providers.SEED.get() == 7
