"""E14 for every kind of work (owner's goal, 26 Nov): a question about running, finished or failed work is answered
about that work, in plain words, from its records; a failure never shows a parser's, a server's or a setting's own words."""
import time

import pytest

from ia_next import agent, config, providers, store


@pytest.fixture
def db(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _task(eid, kind, request, status, error=None, cid=None):
    tid, _ = store.create_task(eid, kind, {"request": request}, 1.0, "k" + str(time.time()))
    store.update_task(tid, status=status, error=error)
    if cid:
        store.link_task_to_conversation(cid, tid) if hasattr(store, "link_task_to_conversation") else None
    return tid


def test_status_questions_are_told_apart_from_orders_and_from_questions_about_the_world():
    for said in ("is my deck done?", "how is the journey map going", "why did the prototype fail?", "where is my report",
                 "what happened to the infographic", "is it ready yet?", "did the themes finish", "status of my work"):
        assert agent.asks_about_work(said), said
    for said in ("make a deck on nurse staffing", "what are the themes in AI this week", "how is AI used by students",
                 "why did students fail the course", "where are the best co-op jobs", "summarize the transcripts"):
        assert not agent.asks_about_work(said), said
    assert agent.kinds_named("is the deck or the report done") == ("deck", "research_report", "artifact")


def test_a_failure_is_said_in_words_a_person_can_act_on():
    f = agent.plain_task_failure
    assert "cut short" in f("Expecting ',' delimiter: line 81 column 10 (char 7297)")
    assert "stopped answering" in f("qwen3.8:27b-q4_K_M unreachable on the local model server (ReadTimeout)")
    out = f("this request needs about 68,264 tokens of context, over the local limit of 65,536; use fewer or shorter sources, or raise IA_NEXT_MAX_CTX")
    assert "too large" in out and "IA_NEXT" not in out
    out = f("the prototype's script fails in the browser (Failed to execute 'write' on 'Document': Unexpected end of input) and two repairs did not fix it")
    assert "did not run in the browser" in out and "Document" not in out
    out = f("this engagement has no evidence yet. Collect the kind the person asked for first: social listening (start_social_analysis) for Reddit")
    assert "start_social_analysis" not in out and "no evidence yet" in out
    assert f("the journey came back with fewer than three phases") == "the journey came back with fewer than three phases"
    assert "restarted" in f("interrupted by a restart; start it again")
    assert f("") .startswith("it stopped without a reason")


def test_a_question_about_the_engagements_work_is_answered_from_its_records(db):
    eid = store.create_engagement("Clinic staffing", "o")
    _task(eid, "deck", "Make a deck on clinic staffing #slides", "done")
    _task(eid, "journey_map", "Map the journey of a night-shift nurse", "failed",
          error="qwen3.8:27b-q4_K_M unreachable on the local model server (ReadTimeout)")
    said = agent.work_status_reply("conv_x", "is my deck done?", eid)
    assert said.startswith('The deck on "clinic staffing" is ready') and "#slides" not in said
    said = agent.work_status_reply("conv_x", "why did the journey map fail?", eid)
    assert said.startswith('The journey map on "a night-shift nurse" did not finish')
    assert "stopped answering" in said and "ReadTimeout" not in said and "Try again" in said
    said = agent.work_status_reply("conv_x", "where is my prototype?", eid)
    assert said.startswith("I find no prototype from the last day")
    assert agent.work_status_reply("conv_x", "make a deck on clinic staffing", eid) == ""


def test_finished_work_of_one_kind_is_one_sentence_with_its_subjects(db):
    eid = store.create_engagement("Higher ed", "o")
    for who in ("a curriculum committee", "faculty senate members", "provosts"):
        _task(eid, "deck", f"Make a detailed slide deck in the Northeastern brand from this engagement for [{who}] #slides", "done")
    said = agent.work_status_reply("conv_x", "is my deck done?", eid)
    assert said.startswith("Three decks are ready: ") and said.count("are ready") == 1
    assert 'for "provosts"' in said and "[" not in said and "#slides" not in said
    assert agent._ago(698 * 60) == "about 12 hours" and agent._ago(3 * 86400) == "about 3 days" and agent._ago(300) == "5 minutes"


def test_running_work_is_described_where_it_stands_and_a_repeat_request_is_not_called_in_the_way(db):
    eid = store.create_engagement("Clinic staffing", "o")
    tid = _task(eid, "deck", "Make a deck on clinic staffing", "running")
    store.start_node(tid, "Deck Composer", "m", 1)
    said = agent.work_status_reply("conv_x", "how is the deck going?", "")
    assert "still working on a deck" in said and "Deck Composer has been working" in said and "Say stop" in said
    again = agent.desk_reply([store.get_task(tid)], "make a deck on clinic staffing")
    assert "already being made" in again and "Deck Composer has been working" in again
    other = agent.desk_reply([store.get_task(tid)], "make a journey map of a night-shift nurse")
    assert "still working on a deck" in other and "I can plan new work" not in other


def test_a_status_question_never_calls_a_model(db, monkeypatch):
    eid = store.create_engagement("Clinic staffing", "o")
    _task(eid, "themes", "Find the themes", "failed", error="Expecting value: line 1 column 1 (char 0)")
    monkeypatch.setattr(providers, "is_loaded", lambda m: True)

    def no_model(*a, **k):
        raise AssertionError("a model was called for a status question")
    monkeypatch.setattr(providers, "claude", no_model)
    out = agent.turn(agent.new_conversation(), "did the themes finish?", focus=eid)
    assert "did not finish" in out["reply"] and "cut short" in out["reply"] and out["trace"] == []
