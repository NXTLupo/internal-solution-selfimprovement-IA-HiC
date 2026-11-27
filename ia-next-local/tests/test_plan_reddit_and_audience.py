"""Plan card fixes found on 26 Nov: a subreddit the work needs is collected as the card's first step (the WS-H9 skill
trials: one card per turn left the report unplanned); the audience the person names is the audience, never the subject
(the owner's 50-slide deck card said "Subject understood as: retail leadership team"); and the period offered is the
engagement's own research period when the request names none (that card offered "Last 30 days" for a 90-day engagement)."""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, config, plan, router, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _engagement(sources=(), window=None):
    eid = store.create_engagement("Co-op at Northeastern", "o")
    p = store.safe_path(eid, "results/findings.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"findings": [{"claim": "Co-op placements are hard to find.", "quote": "Co-op placements are hard to find.", "source_id": "S1"}]}, fh)
    with open(store.safe_path(eid, "results/sources.json"), "w", encoding="utf-8") as fh:
        json.dump({"sources": list(sources) or [{"id": "S1", "title": "Campus news", "url": "https://news.example/a"}],
                   **({"window": window} if window else {})}, fh)
    return eid


def _proposed(eid, request, tool="start_deck"):
    tok_c = agent._CONV.set("conv_r")
    tok_t = store.TURN.set({"request": request, "packs": []})
    try:
        return agent.execute_tool(tool, {"engagement_id": eid, "request": request})["plan_id"]
    finally:
        store.TURN.reset(tok_t)
        agent._CONV.reset(tok_c)


def test_a_named_subreddit_the_engagement_lacks_is_the_first_step():
    eid = _engagement()
    pid = _proposed(eid, "Make a deck on what r/NEU says about co-op placements")
    steps = plan.get(pid)["steps"]
    red = next(s for s in steps if s["key"] == "reddit")
    assert red["required"] and red["subreddits"] == ["neu"] and red["query"] == "co-op placements"
    assert [s["key"] for s in steps][:2] == ["material", "reddit"]


def test_no_reddit_step_when_the_engagement_holds_the_posts():
    eid = _engagement(sources=[{"id": "S1", "title": "r/NEU: co-op", "url": "https://www.reddit.com/r/NEU/comments/abc/coop/"}])
    pid = _proposed(eid, "Make a deck on what r/NEU says about co-op placements")
    assert not any(s["key"] == "reddit" for s in plan.get(pid)["steps"])


def test_the_reddit_step_runs_before_the_work(monkeypatch):
    eid = _engagement()
    pid = _proposed(eid, "Make a deck on what r/NEU says about co-op placements")
    calls = []

    def fake_tool(name, args):
        calls.append((name, args))
        tid, _ = store.create_task(eid, "social" if name == "start_social_analysis" else "deck", {}, 1.0, f"k{len(calls)}")
        store.update_task(tid, status="done")
        return {"task_id": tid, "engagement_id": eid}

    monkeypatch.setattr(agent, "execute_tool", fake_tool)
    monkeypatch.setattr(agent, "launch_research", lambda a: {"task_id": ""})
    monkeypatch.setattr(plan, "_needs_findings", lambda e: False)
    p = plan.start(pid, skip=["research"], background=False)
    names = [c[0] for c in calls]
    assert names == ["start_social_analysis", "start_deck"], names
    social = calls[0][1]
    assert social["subreddits"] == ["neu"] and social["query"] == "co-op placements" and social["engagement_id"] == eid
    assert next(s for s in p["steps"] if s["key"] == "reddit")["state"] == "done"


def test_reddit_query_takes_the_subject_words():
    assert plan.reddit_query("Research what r/NEU says about co-op placements, plus the higher ed pack") == "co-op placements"
    assert plan.reddit_query("Listen to r/nursing on staffing ratios") == "staffing ratios"


def test_the_named_audience_is_the_audience_not_the_subject():
    req = "Make a comprehensive, 50 slide deck from this research for retail leadership team (C-suite and senior retail executives)."
    rest, aud = router.presentation_free(req)
    assert aud == "retail leadership team (C-suite and senior retail executives)"
    assert "leadership" not in rest and "from this research" in rest
    assert router._audience(req) == aud
    rest2, aud2 = router.presentation_free("Make a deck for operations leaders on grocery retail")
    assert aud2 == "operations leaders" and "grocery retail" in rest2


def test_the_period_offered_is_the_engagements_own_when_the_request_names_none():
    eid = _engagement(window={"days": 90, "since": "2026-08-29", "until": "2026-11-26", "label": "the last 3 months"})
    opts = {o["key"]: o for o in plan.options_for("start_deck", {"engagement_id": eid}, "Make a deck from this research")}
    assert opts["period"]["value"] == "90"
    named = {o["key"]: o for o in plan.options_for("start_deck", {"engagement_id": eid}, "Make a deck on the last 7 days")}
    assert named["period"]["value"] == "7"                                   # a period in the request still wins


def test_a_stated_slide_count_sets_the_deck_estimate(monkeypatch):
    eid = _engagement()
    monkeypatch.setattr(plan, "deck_seconds_per_slide", lambda: (30.0, 3))
    from ia_next import providers
    monkeypatch.setattr(providers, "slow_factor", lambda: 1.0)
    steps, _ = plan.build_steps("start_deck", {"engagement_id": eid}, {"request": "Make a 50 slide deck from this research"})
    deck = next(s for s in steps if s["name"] == "Deck Composer")
    assert deck["seconds"] == 1500 and deck["runs"] == 3 and "50 slides as asked" in deck["does"]
    steps2, _ = plan.build_steps("start_deck", {"engagement_id": eid}, {"request": "Make a deck from this research"})
    assert next(s for s in steps2 if s["name"] == "Deck Composer")["seconds"] != 1500     # no count stated: the usual median


def test_a_for_clause_after_a_comma_is_the_audience():
    req = ("Deep research: how shoppers and retailers are experiencing AI shopping assistants in the last 90 days, for a retail "
           "leadership team. Use the Retail data pack, YouTube and Reddit.")
    rest, aud = router.presentation_free(req)
    assert aud == "a retail leadership team" and "leadership" not in rest
    assert "leadership" not in router.subject_of(req, "", outputs=True)
    assert router.presentation_free("Strategies for nursing staff retention")[1] == ""          # no comma: the subject keeps it


def test_new_deep_research_is_fresh_and_its_label_is_not_the_subject():
    req = ("Run new deep research: how shoppers and retailers are experiencing AI shopping assistants in the last 90 days, "
           "for a retail leadership team. Use the Retail data pack, YouTube and Reddit.")
    assert plan._FRESH.search(req)
    subj = router.subject_of(req, "", outputs=True)
    assert not subj.lower().startswith(("run", "new", "deep")) and subj.lower().startswith("how shoppers"), subj
