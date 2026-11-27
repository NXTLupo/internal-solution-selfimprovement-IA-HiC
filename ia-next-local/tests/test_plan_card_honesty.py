"""The plan card says what the work is about and how long it takes (26 Nov). "Use the Retail data pack, YouTube and
Reddit" is which sources to read, never the subject; "How teams use Reddit" is a subject and stays whole. A deep run's
card estimated "about 15 min" from fast runs' timings when the deep run took 58: the estimate now uses runs of the
same depth."""
import os

from ia_next import config, plan, router, store


def test_a_sources_clause_is_not_the_subject():
    r = ("Deep research: how shoppers and retailers are experiencing AI shopping assistants in the last 90 days, for a "
         "retail leadership team. Use the Retail data pack, YouTube and Reddit.")
    got = router.subject_of(r, outputs=True)
    assert "YouTube" not in got and "data pack" not in got and ".," not in got and not got.lower().startswith("deep research")
    assert "shoppers and retailers are experiencing AI shopping assistants" in got
    assert router.subject_of("Research nurse staffing trends using the Healthcare data pack and Reddit", outputs=True) == "Research nurse staffing trends"
    assert router.subject_of("What do students say about AI tutors? Draw on Reddit and YouTube as evidence.", outputs=True) == "What do students say about AI tutors"


def test_sources_named_as_content_stay_in_the_subject():
    assert router.subject_of("How teams use Reddit", outputs=True) == "How teams use Reddit"
    assert router.subject_of("how teams are using Reddit", outputs=True) == "how teams are using Reddit"
    assert "YouTube videos" in router.subject_of("Report on how retailers use YouTube videos for product launches", outputs=True)


def _run(depth, seconds, specialist="Analyst"):
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g", "depth": depth}, 1.0, idem_key=None)
    nid = store.start_node(tid, specialist, "m", 1)
    p = store.safe_path(eid, f"results/tasks/{tid}/r.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w").write("{}")
    store.finish_node(nid, p, "done")
    store.conn().execute("UPDATE nodes SET started = finished - ? WHERE id = ?", (seconds, nid))


def test_a_deep_runs_estimate_comes_from_deep_runs(monkeypatch):
    from ia_next import providers
    monkeypatch.setattr(providers, "slow_factor", lambda: 1.0)
    for s in (300, 320, 310):
        _run("fast", s)
    _run("deep", 1280)
    assert plan.expected("Analyst", 540, "deep") == (1280, 1)
    assert plan.expected("Analyst", 540, "fast") == (310, 3)
    assert plan.expected("Analyst", 540)[0] in (310, 320, 1280)         # no depth: the last three runs of any depth
