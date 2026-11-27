"""Self-improvement repaired (harness WS-H10, 26 Nov): in the local build a promoted skill version reaches the work it
was written for (the local writer and the local journey map read their governed skills), report and journey failures
improve those skills, and a candidate is never scored on the tasks it was drafted from."""
from ia_next import config, improve, journeymap, localwriter, skills, store, studio


def test_the_local_writer_reads_its_promoted_skill(monkeypatch):
    monkeypatch.setattr(config, "LOCAL", True)
    seen = {}
    monkeypatch.setattr(localwriter, "write", lambda brief, f, s, led, feedback=None, system=None: (seen.update(system=system) or ("text", "m", {})))
    store.event  # noqa: B018  (the store is ready)
    skills.seed("local_writer", localwriter.SYSTEM)
    new = localwriter.SYSTEM + "\n- Name the decision in the first sentence of every section; every block names its evidence and keeps the quote whole; never an em-dash."
    got = skills.propose("local_writer", new, "test; tasks: t_x")
    skills._db().execute("UPDATE skill_versions SET status = 'archived' WHERE skill = 'local_writer' AND status = 'active'")
    skills._db().execute("UPDATE skill_versions SET status = 'active' WHERE id = ?", (got["id"],))
    eid = store.create_engagement("e", "o")
    studio.writer(eid, {"goal": "g"}, [], [], None)
    assert seen["system"] == new


def test_the_local_journey_map_reads_its_promoted_skill():
    skills.seed("local_journey", journeymap.SYSTEM)
    marker = "\n- Begin each phase with the moment the person notices they need help; keep every quote verbatim with its evidence."
    got = skills.propose("local_journey", journeymap.SYSTEM + marker, "test")
    skills._db().execute("UPDATE skill_versions SET status = 'archived' WHERE skill = 'local_journey' AND status = 'active'")
    skills._db().execute("UPDATE skill_versions SET status = 'active' WHERE id = ?", (got["id"],))
    assert marker.strip() in journeymap.spec("persona").system


def test_local_failures_improve_the_skills_the_local_build_reads(monkeypatch):
    if config.LOCAL:
        assert improve.SKILL_FOR_KIND["research_report"] == "local_writer"
        assert improve.SKILL_FOR_KIND["journey_map"] == "local_journey"


def test_a_candidate_is_never_scored_on_the_tasks_it_was_drafted_from():
    eid = store.create_engagement("e", "o")
    ids = []
    for _ in range(3):
        tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0, idem_key=None)
        store.update_task(tid, status="done")
        ids.append(tid)
    cand = {"reason": f"from 2 research_report tasks failing quotes_in_sources; tasks: {ids[0]}, {ids[1]}"}
    assert skills.drafted_from(cand) == ids[:2]
    held = [t["id"] for t in skills.held_out_cases(limit=5, exclude=skills.drafted_from(cand))]
    assert ids[0] not in held and ids[1] not in held and ids[2] in held
