"""Field test 2026-11-23, A1, A2 and S3: several outputs in one request, the subject as the goal, shared evidence."""
import pytest

from ia_next import router


def test_a_request_that_names_several_outputs_is_split_in_order():
    said = "Now make an audio overview, a research report, a themes PowerPoint deck and a student journey map from these findings"
    got = router.split(said)
    assert [r["tool"] for r in got] == ["start_audio_overview", "start_research_report", "start_deck", "start_journey_map"]
    tags = router.split("#themes and #slides on how students use AI")
    assert [r["tool"] for r in tags] == ["start_themes", "start_deck"]
    assert router.split("#themes how students use AI") == []                       # one output: the single route handles it
    assert router.split("What themes came out of the report?") == []                # a question makes nothing
    assert router.split("build a deck") == []


def test_the_goal_is_the_subject_never_the_whole_sentence(monkeypatch):
    from ia_next import store
    monkeypatch.setattr(store, "get_engagement", lambda eid: {"id": eid, "title": "Higher ed students and AI",
                                                              "objective": "How higher-ed students use AI and how they feel about it"})
    said = "I don't see any plan cards. Start with the audio overview of these findings"
    assert router.subject_of(said, "eng_1") == "How higher-ed students use AI and how they feel about it"
    assert router.subject_of("#themes What are the main themes and trends in AI right now? Be exhaustive.", "eng_1") == \
        "What are the main themes and trends in AI right now"
    assert router.subject_of("Use the AI Trends data pack. Build a deck on nurse staffing ratios in US hospitals", "eng_1") == \
        "nurse staffing ratios in US hospitals"
    assert router.persona_near("an audio overview and a student journey map") == "student"
    assert router.persona_near("map the journey of a transfer student through advising") == "transfer student"


def test_each_named_output_gets_its_own_arguments(monkeypatch):
    from ia_next import store
    monkeypatch.setattr(store, "get_engagement", lambda eid: {"id": eid, "title": "T", "objective": "How students use AI"})
    said = "Now make an audio overview, a research report, a themes PowerPoint deck and a student journey map from these findings"
    many = router.fill_many(router.split(said), "eng_1", said)
    assert [r["tool"] for r, _ in many] == ["start_audio_overview", "start_research_report", "start_deck", "start_journey_map"]
    by = {r["tool"]: a for r, a in many}
    assert by["start_audio_overview"]["goal"] == "How students use AI"
    assert by["start_research_report"]["goal"] == "How students use AI" and by["start_research_report"]["new_research_confirmed"] is False
    assert by["start_journey_map"]["persona"] == "student" and by["start_journey_map"]["engagement_id"] == "eng_1"
    made = [(r, {"plan_id": f"plan_{i}"}) for i, (r, _) in enumerate(many)]
    msg = router.reply_many(made, [])
    assert msg.startswith("Four plans are ready for you to review, one card each: an audio overview, a research report, a deck and a journey map.")
    assert "research runs once" in msg


def test_a_reply_cannot_claim_cards_that_do_not_exist():
    from ia_next import agent
    assert agent.unbacked_claim("All four are planned and ready for you to review on their cards.", [])
    assert agent.unbacked_claim("I have set up the plans.", []) or agent.unbacked_claim("The plans have been prepared.", [])
    assert not agent.unbacked_claim("All four are planned and ready for you to review on their cards.",
                                    [{"tool": "start_deck", "output": {"plan_id": "plan_1"}}])
    assert not agent.unbacked_claim("Students mostly use AI for drafting.", [])


@pytest.mark.deck_steps
def test_the_deck_is_planned_then_written_three_slides_at_a_time_and_resumes(monkeypatch, tmp_path):
    """S2: one storyline call, then batches of three; a failure in the last batch keeps the earlier ones, and the
    next attempt starts where it stopped."""
    from ia_next import deckstudio, providers, store
    monkeypatch.setattr(store, "safe_path", lambda eid, rel: str(tmp_path / rel))
    monkeypatch.setattr(store, "say", lambda text: said.append(text))
    said, calls = [], []
    sources = [{"id": f"S{i}", "title": f"Source {i}", "date": "2026-11-20"} for i in range(1, 4)]
    chunks = [{"source_id": f"S{i}", "title": f"Source {i}", "text": f"Passage {i} " * 40, "pointer": f"a/{i}.md#c0"} for i in range(1, 4)]
    plan = [{"layout": "cover", "kicker": "", "title": "Answer", "purpose": "the answer", "cites": ["S1"]}] + \
           [{"layout": lay, "kicker": f"K{i}", "title": f"Title {i}", "purpose": f"claim {i}", "cites": [f"S{1 + i % 3}"]}
            for i, lay in enumerate(("cards", "bullets", "statement", "flow", "quote", "closing"), 1)]     # a sound shape (26 Nov check)
    fail = {"on": True}

    def ask_small(system, message, schema, max_tokens):
        calls.append(message)
        if "PLAN THE DECK" in message:
            return {"deck_title": "D", "answer": "A", "slides": plan}
        n = schema["properties"]["slides"]["maxItems"]
        if "WRITE slides 7 to 7" in message and fail["on"]:
            raise providers.ProviderError("the model stopped")
        start = int(message.split("WRITE slides ")[1].split(" ")[0])
        return {"slides": [{"layout": "cards", "title": f"Written {start + k}", "subtitle": "s", "points": []} for k in range(n)]}

    args = ("eng_1", "", "SYSTEM", "Audience: a\nFINDINGS: f", [], chunks, sources, ask_small)
    with pytest.raises(providers.ProviderError):
        deckstudio.compose_in_steps(*args)
    assert sum("PLAN THE DECK" in c for c in calls) == 1 and sum("WRITE slides" in c for c in calls) == 4      # 1-3, 4-6, 7 twice
    assert any(s.startswith("writing slides 4 to 6 of 7; last written: Written 3") for s in said)
    calls.clear()
    fail["on"] = False
    got = deckstudio.compose_in_steps(*args)
    assert [c.split("WRITE slides ")[1][:6] for c in calls] == ["7 to 7"]            # resumed: no plan, no earlier batch again
    assert [s["title"] for s in got["slides"]] == [f"Written {i}" for i in range(1, 8)] and got["deck_title"] == "D"
    assert "STORYLINE (the whole deck, already decided)" in calls[0] and '<source id="S1"' in calls[0]


def test_themes_as_a_subject_is_not_a_second_output():
    assert router.split("#slides Build a themes deck for an executive team on the main AI themes and trends right now") == []
    got = router.split("Find exhaustive themes on how students use AI, then make an audio overview and a research report")
    assert [r["tool"] for r in got] == ["start_themes", "start_audio_overview", "start_research_report"]


def test_an_engagement_can_be_renamed_and_counts_come_from_the_table():
    from ia_next import store
    eid = store.create_engagement("Untitled", "How students use AI")
    assert store.rename_engagement(eid, "  Higher ed   students and AI ") == "Higher ed students and AI"
    assert store.get_engagement(eid)["title"] == "Higher ed students and AI"
    assert store.rename_engagement("eng_missing", "x") is None
    with pytest.raises(ValueError):
        store.rename_engagement(eid, "   ")
    for i in range(3):
        store.create_task(eid, "themes", {"goal": f"g{i}"}, 1.0)
    row = next(e for e in store.list_engagements(include_hidden=True) if e["id"] == eid)
    assert row["task_count"] == 3


@pytest.mark.report_steps
def test_the_report_is_outlined_then_written_a_section_at_a_time(monkeypatch):
    """One outline call assigns every finding to a section (coverage decided in code), then one short call per section."""
    import json
    from ia_next import localwriter, providers, store
    monkeypatch.setattr(store, "say", lambda text: None)
    findings = [{"claim": f"Claim {i} about students and AI tools in coursework", "quote": f"Quote number {i} from the source text.",
                 "source_id": f"S{1 + i % 3}", "claim_type": "SUPPORTED_FACT"} for i in range(1, 9)]
    sources = [{"id": f"S{i}", "title": f"Source {i}", "url": f"https://s{i}.example", "text": " ".join(f["quote"] for f in findings)} for i in (1, 2, 3)]
    calls = []

    class U:
        model = "m"

    def fake(model, system, messages, ledger, **kw):
        m = messages[0]["content"]
        calls.append((m, kw.get("max_tokens"), kw.get("effort")))
        if "PLAN THE REPORT" in m:
            return json.dumps({"title": "Students lean on AI for drafting", "summary": "Students use AI tools widely.", "sections": [
                {"heading": "Students use AI for drafting", "evidence_ids": ["E1", "E2", "E2"]},
                {"heading": "Faculty rules differ by course", "evidence_ids": ["E3", "E1"]},
                {"heading": "Universities should set one policy", "evidence_ids": ["E4"]}]}), U(), None
        ids = [w for w in ("E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8") if f"\n{w} |" in m or m.split("<ledger>\n")[1].startswith(w + " |")]
        return json.dumps({"heading": "A heading", "implication": "The university should act.", "blocks": [
            {"text": "Students draft with these tools and revise the result themselves, which changes how instructors read their work.",
             "evidence_ids": ids[:2] or ids, "quote_ids": ids[:1]},
            {"text": "Instructors respond with course rules that differ from one class to the next, so students cannot rely on one answer.",
             "evidence_ids": ids[-1:], "quote_ids": []}]}), U(), None

    monkeypatch.setattr(providers, "claude", fake)
    md, model, stats = localwriter.write({"audience": "a provost", "goal": "how students use AI", "scope": "s", "structure": "x", "constraints": "y"},
                                         findings, sources, None)
    assert sum("PLAN THE REPORT" in c[0] for c in calls) == 1 and sum("WRITE section" in c[0] for c in calls) == 3
    assert all(c[1] <= 3000 and c[2] == "medium" for c in calls)                 # no long call, no high effort
    led = localwriter.ledger_of(findings)
    got = localwriter.assign([{"heading": "A", "evidence_ids": ["E1", "E2", "E2"]}, {"heading": "B", "evidence_ids": ["E3", "E1"]},
                              {"heading": "C", "evidence_ids": ["E4"]}], led)
    assert sorted(e for s in got for e in s["evidence_ids"]) == sorted(led)      # every finding placed exactly once
    assert got[1]["evidence_ids"][0] == "E3" and "E1" not in got[1]["evidence_ids"]
    assert "Students lean on AI for drafting" in md and stats["coverage_retry"] is False


def test_the_subject_is_the_clause_that_names_no_output_and_an_order_to_research_is_never_reuse():
    from ia_next import plan, router
    said = ("Research what changed this week in nurse staffing levels and patient outcomes, write a short report, "
            "then build a prototype of a staffing planner for a nurse manager")
    assert router.subject_of(said, outputs=True) == "what changed this week in nurse staffing levels and patient outcomes"
    # a request made only of output names keeps the old behaviour (the engagement supplies the subject)
    many = "Now make an audio overview, a research report, a themes PowerPoint deck and a student journey map from these findings"
    assert "report" not in router.subject_of(many, outputs=True).lower()
    for fresh in (said, "what has changed in nurse staffing?", "a report on staffing today", "find out how hospitals staff nights"):
        assert plan._FRESH.search(fresh), fresh
    assert not plan._FRESH.search("a research report from these findings")
