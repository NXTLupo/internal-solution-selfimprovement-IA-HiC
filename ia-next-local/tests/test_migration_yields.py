"""Background migration work waits while the person's work runs (26 Nov: the restore phase shared the page reader and
the embedder with a deep research run for 21 of its 24 collecting minutes). The pause is visible: a progress line, a
paused event, a resumed event with the seconds waited."""
from ia_next import hicmigrate, store


def test_the_migration_waits_for_the_persons_work_and_says_so():
    answers = iter([True, True, True, False])
    asked = []
    notes = []
    hicmigrate.yield_to_foreground(notes.append, poll=0.01, busy=lambda: asked.append(1) or next(answers))
    assert len(asked) == 4                                  # it kept asking until the person's work was done
    assert notes == ["paused while your work runs; the migration continues when it finishes"]
    kinds = [e["kind"] for e in store.conn().execute(
        "SELECT kind FROM events WHERE kind LIKE 'library_migration_%' ORDER BY id").fetchall()]
    assert kinds[-2:] == ["library_migration_paused", "library_migration_resumed"]
    assert "paused" in hicmigrate.STATE and "paused_since" not in hicmigrate.STATE


def test_nothing_waits_when_the_person_is_idle():
    assert hicmigrate.yield_to_foreground(poll=0.01, busy=lambda: False) == 0.0


def test_a_running_task_counts_as_the_persons_work_but_dreaming_does_not(monkeypatch):
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "dreaming", {"goal": "g"}, 0.0, idem_key=None)
    store.update_task(tid, status="running")
    hicmigrate._BUSY["at"] = 0.0
    assert hicmigrate.foreground_busy() is False
    tid2, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
    store.update_task(tid2, status="running")
    hicmigrate._BUSY["at"] = 0.0
    assert hicmigrate.foreground_busy() is True
    store.update_task(tid2, status="done")
    store.update_task(tid, status="done")
    hicmigrate._BUSY["at"] = 0.0


def test_the_systems_own_checks_are_not_the_persons_work():
    """27 Nov: a skill re-check counted its own task as the person's work and paused after its first case."""
    eid = store.create_engagement("e", "o")
    ids = []
    for kind in ("skill_check", "model_check"):
        tid, _ = store.create_task(eid, kind, {"goal": "g"}, 0.0, idem_key=None)
        store.update_task(tid, status="running")
        ids.append(tid)
    hicmigrate._BUSY["at"] = 0.0
    assert hicmigrate.foreground_busy() is False
    for tid in ids:
        store.update_task(tid, status="done")
    hicmigrate._BUSY["at"] = 0.0
