"""Offline tests: scheduled work, the channel webhook's signature and identity links, the skill gate."""
import hashlib
import hmac
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import channels, config, control, schedule, skills, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _approved_schedule(tool="task_status", args=None, every=15):
    args = args or {"task_id": "x"}
    first = schedule.create(tool, args, every)
    assert first["approval"] == "pending"
    control.decide(first["approval_id"], True)
    return schedule.create(tool, args, every)


def test_schedule_needs_approval_then_fires_once_and_advances_first():
    s = _approved_schedule()
    calls = []
    fired = schedule.tick(lambda tool, args: calls.append((tool, args)) or {"ok": True}, now=s["next_run"] + 1)
    assert fired == [s["id"]] and len(calls) == 1
    again = schedule.tick(lambda *a: calls.append(a) or {"ok": True}, now=s["next_run"] + 2)
    assert again == [] and len(calls) == 1            # the next run was advanced before the call fired


def test_schedule_backs_off_then_pauses_itself():
    s = _approved_schedule()
    now = s["next_run"] + 1
    for _ in range(schedule.MAX_FAILURES):
        schedule.tick(lambda *a: {"error": "source down"}, now=now)
        now = schedule.get(s["id"])["next_run"] + 1
    row = schedule.get(s["id"])
    assert row["status"] == "paused" and row["failures"] == schedule.MAX_FAILURES and "source down" in row["last_error"]


def test_webhook_signature(monkeypatch):
    monkeypatch.setenv("IA_NEXT_CHANNEL_SECRET", "s3cret")
    raw = json.dumps({"person_key": "p1", "text": "hi"}).encode()
    good = hmac.new(b"s3cret", raw, hashlib.sha256).hexdigest()
    assert channels.verify_signature(raw, good)
    assert not channels.verify_signature(raw, "0" * 64)
    monkeypatch.setenv("IA_NEXT_CHANNEL_SECRET", "")
    assert not channels.verify_signature(raw, good)    # off when no secret is configured


def test_one_person_one_conversation_across_channels():
    made = []
    new = lambda: made.append(1) or f"conv_{len(made)}"
    a = channels.conversation_for("jonathan", "slack", new)
    b = channels.conversation_for("jonathan", "teams", new)
    c = channels.conversation_for("someone-else", "slack", new)
    assert a == b != c and len(made) == 2


GOOD = "Write the report. Cite every claim with its source id. Copy each quote exactly. Never use the em-dash character. " * 3


def test_skill_candidate_never_takes_effect_on_write():
    skills.seed("writer", GOOD)
    out = skills.propose("writer", GOOD + " Prefer short sections.", "shorter sections")
    assert out["accepted"] and out["status"] == "candidate"
    assert skills.active_text("writer", GOOD) == GOOD


def test_skill_lint_rejects_dropping_required_rules():
    skills.seed("writer", GOOD)
    out = skills.propose("writer", "Write whatever reads well. " * 20, "freer")
    assert not out["accepted"] and any("cite" in w for w in out["why"])


def test_promotion_requires_a_passing_held_out_evaluation():
    skills.seed("writer", GOOD)
    cand = skills.propose("writer", GOOD + " Lead with the decision.", "lead with the decision")
    assert "error" in skills.promote(cand["id"])
    store.conn().execute("UPDATE skill_versions SET eval_json = ? WHERE id = ?", (json.dumps({"passed": True}), cand["id"]))
    assert skills.promote(cand["id"])["version"] == cand["version"]
    assert skills.active_text("writer", GOOD).endswith("Lead with the decision.")


def test_skill_evaluation_waits_for_spend_approval():
    skills.seed("writer", GOOD)
    cand = skills.propose("writer", GOOD + " Lead with the decision.", "x")
    called = []
    out = skills.evaluate(cand["id"], lambda *a: called.append(a), cases=[])
    assert out["approval"] == "pending" and not called
