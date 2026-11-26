"""The plan before the work (ia_next/plan.py): an artifact asked for in a conversation is planned, not started. The plan
states what the engagement holds, offers research when the material does not cover the request, marks the making steps
as required, and gives each step a time measured on this machine. Start runs the chosen steps in order."""
import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, config, plan, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _engagement(findings):
    eid = store.create_engagement("Nurse staffing levels and patient outcomes", "o")
    p = store.safe_path(eid, "results/findings.json")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        json.dump({"findings": [{"claim": c, "quote": c} for c in findings]}, fh)
    return eid


NURSE = ["Hospitals with more nurses per patient report lower mortality.", "Nurse staffing ratios changed patient outcomes in California."]


def test_request_words_drop_filler_hashtags_and_artifact_names():
    assert plan.request_words("Draw a mind map of students in college usage of AI from this engagement #mindmap") == ["students", "college", "ai"]
    assert plan.request_words("(Focused engagement: Nurse staffing [eng_1].)\nMake a deck on nurse staffing") == ["nurse", "staffing"]


def test_coverage_is_a_word_check_stated_as_fact():
    eid = _engagement(NURSE)
    off = plan.coverage(eid, "Draw a mind map of students in college usage of AI")
    assert not off["covered"] and off["missing"] == ["students", "college", "ai"] and off["findings"] == 2
    on = plan.coverage(eid, "A mind map of nurse staffing and patient outcomes")
    assert on["covered"] and on["missing"] == []
    empty = plan.coverage(store.create_engagement("New", "o"), "nurse staffing")
    assert empty["empty"] and not empty["covered"]


def test_an_artifact_asked_for_in_a_conversation_is_planned_not_started():
    eid = _engagement(NURSE)
    tok_c = agent._CONV.set("conv_1")
    tok_t = store.TURN.set({"request": "Draw a mind map of students in college usage of AI #mindmap", "packs": ["higher_ed"]})
    try:
        out = agent.execute_tool("start_diagram", {"engagement_id": eid, "request": "mind map of students in college usage of AI"})
    finally:
        store.TURN.reset(tok_t)
        agent._CONV.reset(tok_c)
    assert out["plan"] == "proposed" and out["started"] is False and "task_id" not in out
    assert store.list_tasks() == []                                       # nothing ran
    p = plan.get(out["plan_id"])
    keys = [s["key"] for s in p["steps"]]
    assert keys == ["material", "research", "make0"] and p["status"] == "proposed" and p["label"] == "Picture"
    material, research, make = p["steps"]
    assert "do not mention: students, college, ai" in material["does"].lower()
    assert research["required"] is False and research["on"] is True       # recommended, still the person's choice
    assert "Higher Ed" in research["does"] or "higher" in research["does"].lower()   # the pack they chose is named
    assert make["required"] is True and make["name"] == "Information Designer"
    assert research["seconds"] and research["runs"] == 0                   # the set-up measurement until runs finish here


def test_research_is_off_by_default_when_the_material_covers_the_request():
    eid = _engagement(NURSE)
    tok = agent._CONV.set("conv_1")
    try:
        out = agent.execute_tool("start_diagram", {"engagement_id": eid, "request": "mind map of nurse staffing and patient outcomes"})
    finally:
        agent._CONV.reset(tok)
    research = plan.get(out["plan_id"])["steps"][1]
    assert research["key"] == "research" and research["on"] is False and research["required"] is False


def test_work_started_outside_a_conversation_is_not_planned():
    eid = _engagement(NURSE)
    assert plan.gate("start_diagram", {"engagement_id": eid}, "") is None          # a schedule, an approval card, a retry
    assert plan.gate("recall", {"query": "x"}, "conv_1") is None                    # not an artifact


def test_expected_time_is_the_median_of_finished_runs_on_this_machine():
    assert plan.expected("Deck Composer", 840) == (840, 0)
    assert plan.expected("Journey Cartographer", None) == (None, 0)               # never timed: the card says so
    eid = store.create_engagement("e", "o")
    for took in (100, 300, 200):
        tid, _ = store.create_task(eid, "deck", {}, 1.0, f"k{took}")
        nid = store.start_node(tid, "Deck Composer", "m", 1)
        store.conn().execute("UPDATE nodes SET state = 'available', started = ?, finished = ? WHERE id = ?", (1000.0, 1000.0 + took, nid))
    assert plan.expected("Deck Composer", 840) == (200, 3)


def _proposed(eid, request, tool="start_diagram"):
    tok_c = agent._CONV.set("conv_1")
    tok_t = store.TURN.set({"request": request, "packs": ["higher_ed"]})
    try:
        return agent.execute_tool(tool, {"engagement_id": eid, "request": request})["plan_id"]
    finally:
        store.TURN.reset(tok_t)
        agent._CONV.reset(tok_c)


def test_start_runs_research_first_then_the_artifact_and_only_once(monkeypatch):
    eid = _engagement(NURSE)
    pid = _proposed(eid, "mind map of students in college usage of AI")
    calls = []

    def fake_research(args):
        calls.append(("research", args["goal"], tuple(args["packs"])))
        tid, _ = store.create_task(eid, "research_report", {}, 1.0, "r1")
        store.update_task(tid, status="done")
        return {"task_id": tid, "started": True}

    def fake_tool(name, args):
        assert plan.FROM_PLAN.get() is True                                # so the gate does not plan it again
        calls.append((name, args["engagement_id"]))
        tid, _ = store.create_task(eid, "diagram", {}, 1.0, "d1")
        store.update_task(tid, status="done")
        return {"task_id": tid, "started": True}

    monkeypatch.setattr(agent, "launch_research", fake_research)
    monkeypatch.setattr(agent, "execute_tool", fake_tool)
    p = plan.start(pid, skip=[], background=False)
    assert [c[0] for c in calls] == ["research", "start_diagram"]
    assert calls[0][1].lower().startswith("students in college usage of ai") and calls[0][2] == ("higher_ed",)
    assert p["status"] == "done" and p["research_task"] and p["task_id"]
    assert [s["state"] for s in p["steps"]] == ["done", "done", "done"]
    plan.start(pid, skip=[], background=False)                             # a second click
    assert len(calls) == 2


def test_a_switched_off_research_step_is_skipped_and_a_required_step_cannot_be(monkeypatch):
    eid = _engagement(NURSE)
    pid = _proposed(eid, "mind map of students in college usage of AI")
    calls = []
    monkeypatch.setattr(agent, "launch_research", lambda a: calls.append("research") or {"task_id": ""})

    def fake_tool(name, args):
        calls.append(name)
        tid, _ = store.create_task(eid, "diagram", {}, 1.0, "d2")
        store.update_task(tid, status="done")
        return {"task_id": tid}

    monkeypatch.setattr(agent, "execute_tool", fake_tool)
    p = plan.start(pid, skip=["research", "make0", "material"], background=False)
    assert calls == ["start_diagram"]                                      # research skipped; the making step still ran
    states = {s["key"]: s["state"] for s in p["steps"]}
    assert states == {"material": "done", "research": "skipped", "make0": "done"}


def test_failed_research_stops_the_plan_and_says_why(monkeypatch):
    eid = _engagement(NURSE)
    pid = _proposed(eid, "mind map of students in college usage of AI")

    def failing(args):
        tid, _ = store.create_task(eid, "research_report", {}, 1.0, "r9")
        store.update_task(tid, status="failed", error="no sources")
        return {"task_id": tid}

    made = []
    monkeypatch.setattr(agent, "launch_research", failing)
    monkeypatch.setattr(agent, "execute_tool", lambda n, a: made.append(n) or {"task_id": ""})
    p = plan.start(pid, background=False)
    assert p["status"] == "failed" and "artifact was not started" in p["note"] and made == []


def test_dismiss_and_recover():
    eid = _engagement(NURSE)
    pid = _proposed(eid, "mind map of nurse staffing")
    assert plan.dismiss(pid)["status"] == "dismissed"
    assert plan.start(pid, background=False)["status"] == "dismissed"      # a dismissed plan does not start
    pid2 = _proposed(eid, "mind map of nurse staffing")
    plan._set(pid2, status="running")
    plan.recover()
    after = plan.get(pid2)
    assert after["status"] == "failed" and "restarted" in after["note"]
    assert time.time() - after["updated"] < 5


def test_a_topic_the_engagement_does_not_hold_is_researched_in_a_new_engagement(monkeypatch):
    """19 Nov: a journey of a student looking for a co-op was researched inside the nurse staffing engagement."""
    eid = _engagement(NURSE)
    assert plan.subject("Map the journey of [student looking for a co-op] from this engagement #journey") == "The journey of student looking for a co-op"
    pid = _proposed(eid, "Map the journey of [student looking for a co-op] from this engagement")
    research = plan.get(pid)["steps"][1]
    assert research["new_engagement"] == "The journey of student looking for a co-op" and "new engagement" in research["note"]
    seen = {}

    def fake_research(args):
        seen["research"] = args
        new = store.create_engagement(args["engagement_title"], args["goal"])
        tid, _ = store.create_task(new, "research_report", {}, 1.0, "r-new")
        store.update_task(tid, status="done")
        return {"task_id": tid, "engagement_id": new}

    def fake_tool(name, args):
        seen["make"] = args
        tid, _ = store.create_task(args["engagement_id"], "diagram", {}, 1.0, "d-new")
        store.update_task(tid, status="done")
        return {"task_id": tid}

    monkeypatch.setattr(agent, "launch_research", fake_research)
    monkeypatch.setattr(agent, "execute_tool", fake_tool)
    p = plan.start(pid, background=False)
    assert seen["research"]["engagement_id"] == "" and seen["research"]["engagement_title"] == "The journey of student looking for a co-op"
    assert seen["research"]["goal"].startswith("The journey of student looking for a co-op") and "this engagement" not in seen["research"]["goal"]
    assert seen["make"]["engagement_id"] != eid and seen["make"]["engagement_id"] == p["engagement_id"]
    assert store.list_tasks(eid) == []                                     # nothing was added to the nurse engagement


def test_material_on_the_topic_keeps_the_work_in_its_engagement():
    eid = _engagement(NURSE)
    pid = _proposed(eid, "mind map of nurse staffing and patient outcomes")
    assert plan.get(pid)["steps"][1]["new_engagement"] == ""


def test_the_card_offers_only_the_choices_the_tool_takes_and_applies_them(monkeypatch):
    eid = _engagement(NURSE)
    pid = _proposed(eid, "mind map of nurse staffing and patient outcomes")
    opts = {o["key"]: o for o in plan.get(pid)["options"]}
    assert {"orientation", "density", "brand", "mode"} <= set(opts) and "format" not in opts      # a picture has no audio format
    assert [c["value"] for c in opts["density"]["choices"]] == ["concise", "standard", "detailed"]
    assert opts["orientation"]["value"] == "landscape" and opts["brand"]["choices"][0]["label"] == "NXT"
    seen = {}

    def fake_tool(name, args):
        seen.update(args)
        tid, _ = store.create_task(eid, "diagram", {}, 1.0, "opt")
        store.update_task(tid, status="done")
        return {"task_id": tid}

    monkeypatch.setattr(agent, "execute_tool", fake_tool)
    plan.start(pid, skip=["research"], background=False, options={"orientation": "portrait", "density": "detailed",
                                                                  "format": "debate", "brand": "not-a-brand"})
    assert seen["orientation"] == "portrait" and seen["density"] == "detailed"
    assert "format" not in seen and seen.get("brand") != "not-a-brand"                            # ignored: not this tool's, not a value
    audio = {o["key"] for o in plan.options_for("start_audio_overview", {})}
    assert {"format", "length"} <= audio


def test_a_made_up_or_missing_engagement_id_becomes_the_focused_engagement():
    eid = _engagement(NURSE)
    tok = store.TURN.set({"request": "map the journey", "packs": [], "focus": eid})
    try:
        assert agent.repair_engagement("start_journey_map", {"engagement_id": "this engagement", "persona": "p"})["engagement_id"] == eid
        assert agent.repair_engagement("start_deck", {"engagement_id": "", "audience": "a"})["engagement_id"] == eid
        assert agent.repair_engagement("start_research_report", {"engagement_id": "", "goal": "g"})["engagement_id"] == ""   # may open a new one
        assert agent.repair_engagement("start_research_report", {"engagement_id": "eng_made_up", "goal": "g"})["engagement_id"] == eid
        other = store.create_engagement("Other", "o")
        assert agent.repair_engagement("start_deck", {"engagement_id": other})["engagement_id"] == other       # a real id is kept
        assert agent.repair_engagement("recall", {"query": "x"}) == {"query": "x"}                              # no engagement to repair
    finally:
        store.TURN.reset(tok)
    assert agent.repair_engagement("start_deck", {"engagement_id": "nope"})["engagement_id"] == "nope"          # no focus: the tool's own error


def test_the_card_shows_what_was_asked_for_so_it_can_be_read_before_starting():
    b = plan.brief_for({"engagement_id": "e", "audience": "a provost", "outline": ["Students use assistants weekly", {"title": "Faculty are less ready"}, ""],
                        "brand": "nxt", "source_ids": [], "whole_engagement": True})
    assert b == [{"label": "For", "value": "a provost"}, {"label": "Slides planned", "items": ["Students use assistants weekly", "Faculty are less ready"]}]
    assert plan.brief_for({"engagement_id": "e", "brand": "nxt"}) == []


def test_a_question_is_answered_and_never_turned_into_work():
    q = plan.is_question
    assert q("Why do students say their instructors cannot guide them on AI? Cite the sources.")
    assert q("(Focused engagement: X [eng_1]. Work: none)\nWhat did the UC study find about daily users?")
    assert q("Is the evidence on cheating strong")
    assert q("From this engagement's sources: why do students say their instructors cannot guide them on AI? Cite the sources.")
    assert not q("Can you make a deck on this?") and not q("What would a mind map of this look like? #mindmap")
    assert not q("Draw a mind map of student AI use") and not q("How about a quiz for instructors?")
    assert not q("Research how students use AI")
    eid = _engagement(NURSE)
    tok_c = agent._CONV.set("conv_q")
    tok_t = store.TURN.set({"request": "Why do nurses leave? Cite the sources.", "packs": []})
    try:
        out = agent.execute_tool("start_diagram", {"engagement_id": eid, "goal": "why nurses leave"})
    finally:
        store.TURN.reset(tok_t)
        agent._CONV.reset(tok_c)
    assert "error" in out and "Answer the question" in out["error"] and "plan_id" not in out
    assert plan._db().execute("SELECT COUNT(*) FROM plans").fetchone()[0] == 0          # nothing was planned


def test_a_reply_cannot_claim_a_plan_or_started_work_that_no_tool_returned():
    from types import SimpleNamespace
    assert agent.unbacked_claim("The plan is ready to review.", [])
    assert agent.unbacked_claim("I have started the deck.", [{"tool": "recall", "output": {"memory": []}}])
    assert not agent.unbacked_claim("The plan card is ready for your review.", [{"tool": "start_deck", "output": {"plan_id": "plan_1"}}])
    assert not agent.unbacked_claim("Most students use assistants weekly [S3].", [])
    said = iter(["The plan is ready to review.", "The plan is ready for your review."])
    seen = []

    def fake(model, system, messages, ledger, **kw):
        seen.append(messages[-1])
        text = next(said)
        return text, None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": text}])
    out = agent.turn(agent.new_conversation(), "Listen to what students say on Reddit #reddit", call=fake)
    assert out["reply"] == agent.NOTHING_MADE and len(seen) == 2          # told once what is true, then not allowed to repeat the claim
    assert "no plan exists" in json.dumps(seen[1])


def test_a_hashtag_whose_tool_was_never_called_is_pointed_out_once():
    from types import SimpleNamespace
    assert agent.hashtag_tool("Listen to Reddit on this #reddit") == ("#reddit", "start_social_analysis")
    assert agent.hashtag_tool("make a quiz #quiz")[1] == "start_artifact" and agent.hashtag_tool("what did they say?") is None
    seen = []

    def fake(model, system, messages, ledger, **kw):
        seen.append(json.dumps(messages[-1]))
        return "Here is a summary of your work.", None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": "x"}])
    real = agent.providers.claude
    agent.providers.claude = fake                       # the nudge is for the real agent path
    try:
        agent.turn(agent.new_conversation(), "Listen to what students say on Reddit #reddit")
    finally:
        agent.providers.claude = real
    assert len(seen) == 2 and "start_social_analysis" in seen[1] and "#reddit" in seen[1]


def test_the_pages_context_note_is_never_read_as_what_the_person_asked_for():
    from types import SimpleNamespace
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen["turn"] = dict(store.TURN.get() or {})
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": "ok"}])
    nl = chr(10)
    note = "(Focused engagement: X [eng_1]. Its work, newest first:" + nl + "- social (done): Reddit listening ready)" + nl + "Make a deck for the board"
    agent.turn(agent.new_conversation(), note, call=fake, said="Make a deck for the board")
    assert seen["turn"]["request"] == "Make a deck for the board" and "Reddit" not in seen["turn"]["request"]


def test_a_request_that_names_a_prototype_is_never_planned_as_a_research_report():
    from ia_next import plan
    said = "Build a clickable prototype of a syllabus AI policy lookup where a student finds the rule for one assignment"
    assert plan.named_instead_of_report("start_research_report", said) == ("start_prototype", "a prototype")
    assert plan.named_instead_of_report("start_prototype", said) is None
    assert plan.named_instead_of_report("start_research_report", "Research AI policy and build a prototype") is None
    assert plan.named_instead_of_report("start_research_report", "What do students say about AI rules") is None


def test_a_making_request_that_names_its_output_in_plain_words_points_at_its_tool():
    assert agent.named_tool("Build a clickable prototype of an AI policy finder") == ("a prototype", "start_prototype")
    assert agent.named_tool("Please make a deck for the board") == ("a deck", "start_deck")
    assert agent.named_tool("What does the prototype show?") is None
    assert agent.named_tool("Tell me about the deck") is None


def test_a_brand_the_person_did_not_name_falls_back_to_the_house_brand():
    from ia_next import plan
    assert plan.brand_asked("deciem", "Write recommendations for a dean #recommendations") == "nxt"
    assert plan.brand_asked("deciem", "Write recommendations #recommendations #deciem") == "deciem"
    assert plan.brand_asked("nu", "A deck for Northeastern") == "nu"
    assert plan.brand_asked("nu", "A deck about menu design") == "nxt"
    assert plan.brand_asked("nxt", "anything") == "nxt"


def test_the_local_author_document_is_tidied_by_code():
    from ia_next import localartifact
    first = "A student assigns each tool to one task because no single platform does everything the coursework needs [S81]."
    doc = {"title": "Personas", "standfirst": first, "sections": [
        {"heading": "The daily practitioner uses several tools as study support",
         "paragraphs": [first, "The mechanism is straightforward: the student checks each answer against the textbook [S34]."]},
        {"heading": "The cautious student avoids tools the syllabus does not name", "paragraphs": [first, "A second point [S2]."]}]}
    out = localartifact.tidy(doc, "personas")
    assert out["title"] == "The daily practitioner uses several tools as study support" and out["standfirst"] == ""
    assert out["sections"][0]["paragraphs"][1] == "The student checks each answer against the textbook [S34]."
    assert out["sections"][1]["paragraphs"] == ["A second point [S2]."]


def test_a_quote_that_differs_only_in_typography_is_found_in_its_source():
    from ia_next import artifacts
    src = [{"id": "S1", "text": "He said: I\u2019ve lost connection with the field \u2014 not because of AI, but because of time. They used it \u201cjust a little bit.\u201d"}]
    page = ("<blockquote><q>I&#x27;ve lost connection with the field, not because of AI, but because of time.</q><cite>Reddit</cite></blockquote>"
            "<blockquote><q>They used it &quot;just a little bit.</q></blockquote>"
            "<blockquote><q>Students never used the tool for anything at all in any course.</q></blockquote>")
    assert artifacts.unverified_quotes(page, src) == ["Students never used the tool for anything at all in any course."]
    out, restored, unquoted = artifacts.repair_quotes(page, src, artifacts.unverified_quotes(page, src))
    assert unquoted == 1 and "<q>Students never" not in out and "Students never used the tool" in out


def test_a_figure_in_the_writers_own_voice_is_rewritten_or_its_sentence_removed(monkeypatch):
    from ia_next import localartifact, providers
    corpus = "Students pay for Microsoft 365 themselves."
    assert localartifact.figure_in("Nine in ten students use it weekly [S3].") == ""       # a lone small word is prose
    assert localartifact.figure_in("About 92% of students use it [S3].") == "92"
    assert localartifact.figure_in("Seven percent of students pay [S3].")
    assert localartifact.figure_in("The policy changed in 2025 [S12].") == ""
    assert localartifact.figure_in("Students pay for Microsoft 365 themselves [S4].", (), corpus) == ""
    doc = {"title": "Students pay for tools the university does not license", "standfirst": "", "sections": [{
        "heading": "Most students pay themselves", "table": {"columns": [], "rows": []}, "quotes": [],
        "paragraphs": ["About 92% of students use it [S3]. The registrar has no record of which tools they pay for [S4].",
                       "Roughly 40 advisors serve the college [S5]."]}]}
    monkeypatch.setattr(providers, "chat", lambda *a, **k: ('{"items":[{"n":1,"text":"Most students use it [S3]. The registrar has no record of which tools they pay for [S4]."},{"n":2,"text":"About 40 advisors serve the college [S5]."}]}', None, None))
    out = localartifact.no_figures(doc, corpus, "m")
    assert out["sections"][0]["paragraphs"] == ["Most students use it [S3]. The registrar has no record of which tools they pay for [S4]."]
    doc["sections"][0]["paragraphs"] = ["About 92% of students use it [S3]. The registrar has no record of which tools they pay for [S4]."]
    monkeypatch.setattr(providers, "chat", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))
    out = localartifact.no_figures(doc, corpus, "m")
    assert out["sections"][0]["paragraphs"] == ["The registrar has no record of which tools they pay for [S4]."]


def test_an_infographic_idea_shows_a_checked_quote_that_carries_the_figure():
    from ia_next import illustrated
    ev = [{"quote": "Students described using several tools side by side for one assignment.", "title": "aiandhowweteach.substack.com: How Are Students Using AI?", "pointer": "a#c1"},
          {"quote": "A global survey found that 86% of students use AI in their studies. More than half use it weekly, and a quarter use it daily, the council reported in its annual review of practice.",
           "title": "Survey: 86% of Students Already Use AI in Their Studies -- Campus Technology", "pointer": "b#c2"}]
    p = illustrated.proof(ev)
    assert p["quote"] == "A global survey found that 86% of students use AI in their studies." and p["pointer"] == "b#c2"
    assert illustrated.proof([{"quote": "x" * 400, "title": "T"}]) is None                 # never trimmed mid-sentence
    assert illustrated.proof([ev[0]])["source"] == "How Are Students Using AI?"
    doc = illustrated.page({"title": "T", "groups": [{"heading": "", "nodes": [{"label": "L", "caption": "C.", "proof": p}]}]}, "nxt")
    assert "86% of students" in doc and "<cite>" in doc


def test_a_competitive_gap_analysis_always_searches_the_web(monkeypatch):
    from ia_next import plan
    monkeypatch.setattr(plan, "coverage", lambda eid, request: {"empty": False, "covered": True, "findings": 9, "sources": 4, "title": "T", "missing": []})
    steps, _ = plan.build_steps("start_artifact", {"engagement_id": "e", "kind": "gap", "goal": "Compare us with peers"}, {"request": "gap analysis"})
    r = next(s for s in steps if s["key"] == "research")
    assert r["required"] and r["on"] and "peers and competitors" in r["name"]
    steps, _ = plan.build_steps("start_artifact", {"engagement_id": "e", "kind": "personas", "goal": "g"}, {"request": "personas"})
    r = next(s for s in steps if s["key"] == "research")
    assert not r["required"] and not r["on"]                                  # other documents: research stays a choice
    a = plan._research_args({"goal": "AI policy at universities"}, {}, "AI policy at universities", "Document", "", rivals=True)
    assert "peers and competitors" in a["goal"] and "case studies" in a["scope"]
    long = "Write a competitive gap analysis for a provost: how a typical university compares with named peer universities on responding to student AI use #gap"
    a = plan._research_args({"goal": long}, {}, long, "Document", "", rivals=True)
    assert "responding to student AI use" in a["goal"] and "#gap" not in a["goal"]


def test_a_page_is_read_as_its_words_never_its_picture_data(tmp_path, monkeypatch):
    from ia_next import agent, store
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "artifact", {"kind": "personas", "goal": "g"}, 1.0)
    p = store.safe_path(eid, f"results/tasks/{tid}/artifact.html")
    import os
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write('<html><body><img src="data:image/jpeg;base64,' + "A" * 300000 + '"><h1>The rule-checking first-year</h1></body></html>')
    store.update_task(tid, status="done", result_path=p)
    out = agent._read_report({"task_id": tid})
    assert "rule-checking first-year" in out["report"] and len(out["report"]) < 200


def test_a_document_hashtag_fixes_the_kind_not_only_the_tool():
    from ia_next import agent
    said = "Draw the technical architecture of how students, AI tools and policies connect #architecture"
    assert agent.hashtag_tool(said)[1] == "start_artifact"
    assert agent.hashtag_kind(said) == ("#architecture", "arch")
    assert agent.hashtag_kind("Build the persona set #personas") == ("#personas", "personas")
    assert agent.hashtag_kind("a tech audit #audit") == ("#audit", "tech-audit")
    assert agent.hashtag_kind("no tags here") is None

