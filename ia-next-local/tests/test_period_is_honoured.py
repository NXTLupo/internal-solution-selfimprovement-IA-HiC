"""The period a person chooses for the evidence is the period the run uses (owner, 25 Nov: "if I want to collect data
for a research run 90 days out and select it, it should be honored"). The choice can come from the request's own words,
from the plan card, or from the engagement's settings; none of them is replaced by the 30-day default."""
import json

import pytest

from ia_next import agent, currency, plan, store, studio


@pytest.fixture()
def db(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.db"))


def _brief(tid):
    return json.loads(store.conn().execute("SELECT brief FROM tasks WHERE id = ?", (tid,)).fetchone()["brief"])


@pytest.mark.period
def test_a_period_said_in_any_common_way_is_read():
    for said, days in (("collect data 90 days out on freight pricing", 90), ("a 90-day window on retail media", 90),
                       ("going back six months on clinic staffing", 180), ("three months of coverage on battery recycling", 90),
                       ("in the last 60 days", 60), ("a deck on pricing over the past quarter", 91)):
        w = currency.window(said)
        assert w["days"] == days and "no period" not in w["why"], said
    # a number that belongs to the subject is not a period
    assert currency.window("nurses with over 5 years of experience")["days"] == currency.RESEARCH_DAYS


@pytest.mark.period
def test_the_engagements_own_period_is_used_by_its_work_unless_the_request_names_one(db):
    eid = store.create_engagement("Freight", "o")
    store.update_engagement(eid, {"settings": {"period": "90"}})
    for kind in ("research_report", "deck", "themes", "journey_map"):
        tid, _ = store.create_task(eid, kind, {"goal": "freight pricing", "scope": "", "request": f"a {kind} on freight pricing"}, 1.0)
        w = _brief(tid)["window"]
        assert w["days"] == 90 and w["why"] == "the engagement's own period", kind
    tid, _ = store.create_task(eid, "research_report", {"goal": "g", "scope": "", "request": "what changed this week in freight pricing"}, 1.0)
    assert "window" not in _brief(tid)                                       # the request's own words win
    assert currency.window(_brief(tid)["request"])["days"] == 7
    chosen = currency.for_choice("365")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g2", "scope": "", "window": chosen}, 1.0)
    assert _brief(tid)["window"]["days"] == 365                               # a choice on the plan card wins over the engagement's


@pytest.mark.period
def test_a_period_chosen_on_the_plan_card_reaches_the_research_brief_and_the_findings(db):
    got = plan.apply_options("start_research_report", {"engagement_id": "", "goal": "freight pricing"}, {"period": "90"})
    assert got["period"] == "90"
    assert plan._research_args(dict(got, engagement_id=""), {}, "a deck on freight pricing")["period"] == "90"
    w = currency.for_choice("90")
    assert w["days"] == 90 and w["why"] == "chosen on the plan card"
    day = lambda n: (currency.today() - __import__("datetime").timedelta(days=n)).isoformat()
    sources = [{"id": f"S{i}", "date": day(d), "url": f"https://example.org/{i}"} for i, d in enumerate((3, 20, 45, 70, 85, 120), 1)]
    kept = [s["id"] for s in studio.in_period({"goal": "g", "scope": "", "window": w}, sources)]
    assert kept == ["S1", "S2", "S3", "S4", "S5"]                             # everything inside 90 days, nothing cut at 30


def test_a_longer_period_reads_further_back_into_each_feed():
    assert studio.per_source_for(currency.for_choice("30")) == 10
    assert studio.per_source_for(currency.for_choice("90")) == 20
    assert studio.per_source_for(currency.for_choice("365")) == 30 and studio.per_source_for(currency.for_choice("any")) == 30
    assert "Evidence from" in studio.WIDEN and "used as chosen" in studio.WIDEN
