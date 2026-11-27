"""Asking again for finished work makes new work after a short window (26 Nov: the owner asked again for a deck after a
fix and was handed the finished deck from an hour before). A double click inside the window still gets the same task."""
from ia_next import store


def test_finished_work_blocks_the_same_request_only_briefly():
    eid = store.create_engagement("e", "o")
    tid, made = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="same-request")
    assert made
    store.update_task(tid, status="done")
    again, made2 = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="same-request")
    assert again == tid and not made2                                          # inside the window: the same task
    store.conn().execute("UPDATE tasks SET updated = updated - ? WHERE id = ?", (store.IDEM_DONE_SECONDS + 5, tid))
    third, made3 = store.create_task(eid, "deck", {"goal": "g"}, 1.0, idem_key="same-request")
    assert made3 and third != tid                                              # later: new work
    assert store.get_task(tid)["status"] == "done"                              # the old one keeps its record
