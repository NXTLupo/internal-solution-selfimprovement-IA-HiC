"""Plan Part 8, P7: one governed expert skill per creator: seeded from code, read by the builder, edited only as a
candidate that passes a held-out evaluation (replays of recorded messages), and promoted by the person."""
import json
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import app as app_module, config, control, providers, skills, store, verify  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def test_every_creator_has_a_governed_skill():
    d = TestClient(app_module.app).get("/api/skills").json()
    names = [s["skill"] for s in d["skills"]]
    assert names == sorted(["writer", "deck_composer", "prototyper", "creative_director", "journey_cartographer",
                            "social_analyst", "transcript_analyst", "theme_namer"])
    assert all(s["active_version"] == 1 for s in d["skills"])


def test_a_candidate_must_keep_the_rules_and_fit():
    skills.seed_all()
    base = skills.default_text("deck_composer")
    assert "drops the required rule about 'quote'" in " ".join(skills.propose("deck_composer", "x" * 400, "test")["why"])
    assert "contains an em-dash" in skills.propose("deck_composer", base + " —", "test")["why"]
    big = skills.default_text("prototyper")
    assert len(big) > 6000 and skills.propose("prototyper", big + " Keep the brand.", "longer is fine")["accepted"]


def _record_case(skill):
    eid = store.create_engagement("e", "o")
    with open(store.safe_path(eid, "results/sources.json"), "w", encoding="utf-8") as fh:
        json.dump({"sources": [{"id": "S1", "title": "brief", "url": "", "text": "Annual Giving cannot see retention by cohort."}]}, fh)
    tid, _ = store.create_task(eid, "deck", {"audience": "a"}, 1.0)
    skills.record_prompt(eid, tid, skill, "claude-opus-5-5", "Audience: a\nSOURCES: [S1] Annual Giving cannot see retention by cohort.", 32000, "high")
    store.update_task(tid, status="done")
    return eid, tid


def test_a_creator_candidate_is_evaluated_on_replayed_messages_then_promoted(monkeypatch):
    skills.seed_all()
    eid, tid = _record_case("deck_composer")
    assert skills.prompt_cases("deck_composer")[0]["task_id"] == tid
    cand = skills.propose("deck_composer", skills.default_text("deck_composer") + " Prefer one quote per slide.", "owner edit")
    seen = []

    def fake_claude(model, system, messages, ledger, **kw):
        seen.append((system[-30:], messages[0]["content"][:9], kw.get("json_schema") is not None, kw.get("effort")))
        better = "Prefer one quote per slide." in system
        return json.dumps({"slides": [{"title": "Annual Giving cannot see retention" if better else "Retention"}]}), None, None
    monkeypatch.setattr(providers, "claude", fake_claude)
    monkeypatch.setattr(verify, "judge", lambda text, brief, sources, author, ledger: {"score": 0.9 if "cannot see" in text else 0.5, "items": []})
    first = skills.evaluate(cand["id"], writer_fn=None)
    assert first["approval"] == "pending"                                     # evaluating spends: the person approves it
    control.decide(first["approval_id"], True)
    ev = skills.evaluate(cand["id"], writer_fn=None)
    assert ev["passed"] and ev["cases"][0]["candidate"] > ev["cases"][0]["incumbent"]
    assert {s[1] for s in seen} == {"Audience:"} and all(s[2] and s[3] == "high" for s in seen)   # same message, same settings
    assert skills.promote(cand["id"])["version"] == 2
    assert "Prefer one quote per slide." in skills.active_text("deck_composer", "unused default")


def test_a_failing_candidate_cannot_be_promoted(monkeypatch):
    skills.seed_all()
    _record_case("deck_composer")
    cand = skills.propose("deck_composer", skills.default_text("deck_composer") + " Use longer titles.", "test")
    control.decide(skills.evaluate(cand["id"], writer_fn=None)["approval_id"], True)
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (json.dumps({"slides": [{"title": "t"}]}), None, None))
    monkeypatch.setattr(verify, "judge", lambda *a, **k: {"score": 0.5, "items": []})
    assert skills.evaluate(cand["id"], writer_fn=None)["passed"] is False
    assert "has not passed" in skills.promote(cand["id"])["error"]
