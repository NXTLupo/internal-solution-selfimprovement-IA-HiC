"""Where a task's time went (harness WS-H18, 26 Nov): each line a step says closes the one before with its seconds, the
step's last line closes when it finishes, lines under a second are not recorded, and the totals per step come back from
/api/tasks/{id}/timeline. A deep research run took 58 minutes and nothing said where 24 of them went."""
from fastapi.testclient import TestClient

from ia_next import app as app_module, store


def test_a_steps_lines_are_timed_in_order(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(store.time, "time", lambda: clock[0])
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
    nid = store.start_node(tid, "Research Lead", "qwen", 1)
    clock[0] += 2
    store.say("searching the packs")
    clock[0] += 300
    store.say("reading 40 web pages")
    clock[0] += 0.4                                        # this line lasted under a second: not recorded
    store.say("a moment")
    clock[0] += 120
    p = store.safe_path(eid, f"results/tasks/{tid}/r.json")
    import os
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w").write("{}")
    store.finish_node(nid, p, "done")
    store.say("after the end")                             # a finished step is not timed again
    lines = store.timeline(tid)
    assert [(x["doing"], x["seconds"]) for x in lines] == [("getting ready", 2.0), ("searching the packs", 300.0),
                                                           ("a moment", 120.0)]
    d = TestClient(app_module.app).get(f"/api/tasks/{tid}/timeline").json()
    assert d["seconds_by_step"] == {"Research Lead": 422.0}
