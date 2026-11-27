"""Autonomy modes (harness WS-H17; Harness Engineering R9): ask waits on the card, auto-research starts research and
listening at once, auto starts every artifact at once. The approval floor (send, delete, spend, learn) is untouched."""
from fastapi.testclient import TestClient

from ia_next import app as app_module, plan


def _proposed(pid="plan_x"):
    return {"plan": "proposed", "plan_id": pid, "started": False, "message": "card"}


def test_each_mode_gates_as_it_says(tmp_path, monkeypatch):
    monkeypatch.setattr(plan, "AUTONOMY_FILE", str(tmp_path / "autonomy.json"))
    started = []
    monkeypatch.setattr(plan, "start", lambda pid, **k: started.append(pid))
    assert plan.autonomy() == "ask"
    assert plan.autostart("start_research_report", _proposed())["plan"] == "proposed" and started == []
    plan.set_autonomy("auto-research")
    assert plan.autostart("start_deck", _proposed("p_deck"))["plan"] == "proposed"
    assert plan.autostart("start_research_report", _proposed("p_r"))["plan"] == "started" and started == ["p_r"]
    plan.set_autonomy("auto")
    assert plan.autostart("start_deck", _proposed("p_deck"))["started"] is True and started == ["p_r", "p_deck"]
    assert plan.autostart("start_deck", {"error": "a question"}) == {"error": "a question"}     # refusals pass through


def test_the_mode_is_read_and_set_through_the_api(tmp_path, monkeypatch):
    monkeypatch.setattr(plan, "AUTONOMY_FILE", str(tmp_path / "autonomy.json"))
    c = TestClient(app_module.app)
    assert c.get("/api/autonomy").json()["mode"] == "ask"
    assert c.post("/api/autonomy", json={"mode": "auto"}).json() == {"mode": "auto"}
    assert c.post("/api/autonomy", json={"mode": "yolo"}).status_code == 400
