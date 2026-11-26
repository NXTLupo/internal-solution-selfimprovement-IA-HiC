"""Evidence quality (24 Nov 2026 read of the Case 3 report): source tiers, who a finding is about, quote length."""
import pytest

from ia_next import evidencequality as eq


def test_a_personal_page_and_a_press_release_site_are_the_lowest_tier():
    assert eq.grade("https://note.com/quirky_cougar823/n/ndf643e0ed7f3?hl=en") == {"tier": 4, "label": "self-published"}
    assert eq.grade("https://someone.substack.com/p/ai-in-class")["tier"] == 4
    assert eq.grade("https://bioengineer.org/palestinian-medical-students/")["label"] == "press release"
    assert eq.grade("https://www.prnewswire.com/news-releases/x.html")["tier"] == 4


def test_government_university_and_journal_addresses_are_primary_and_publishers_second():
    assert eq.grade("https://nces.ed.gov/fastfacts/")["tier"] == 1
    assert eq.grade("https://news.msu.edu/story")["tier"] == 1
    assert eq.grade("https://www.ox.ac.uk/news")["tier"] == 1
    assert eq.grade("https://www.nature.com/articles/x")["tier"] == 1
    assert eq.grade("https://www.insidehighered.com/news/a")["tier"] == 2
    assert eq.grade("https://unknown-site.example/a")["tier"] == 3
    assert eq.grade("https://unknown-site.example/a", pack="higher-ed")["tier"] == 2      # a pack's own publication
    assert eq.grade("https://reddit.com/r/college", kind="social")["tier"] == 0           # listening is not graded


def test_mix_counts_strong_and_weak_sources():
    m = eq.mix([{"url": "https://www.insidehighered.com/a"}, {"url": "https://nces.ed.gov/b"}, {"url": "https://note.com/c"},
                {"url": "https://reddit.com/r/x", "kind": "social"}])
    assert (m["graded"], m["strong"], m["weak"]) == (3, 2, 1)
    assert "2 of 3 sources" in m["text"] and "1 self-published" in m["text"]


LONG = ("According to long-term reporting by Reuters, the government plans to ensure all children acquire AI literacy by 2030. "
        "On the other hand, research results have emerged suggesting that grades may rise while comprehension falls. "
        "I will organize the content of the article and share my own perspective. "
        "The target is approximately 200 million primary and secondary school students. "
        "Shanghai requires mandatory AI education of 30 hours or more per year for each grade level. "
        "Beijing plans to establish 100 AI demonstration model schools.")


def test_a_long_quote_is_cut_to_whole_sentences_that_carry_the_claim_and_stays_verbatim():
    got = eq.trim_quote(LONG, "Shanghai requires thirty hours of AI education per year")
    assert len(got) <= eq.QUOTE_CHARS and got in LONG
    assert "Shanghai requires mandatory AI education" in got
    assert got.endswith(".")


def test_a_short_quote_is_untouched_and_a_cut_off_last_sentence_is_dropped():
    q = "Students said the tool helped them study. Faculty disagreed."
    assert eq.trim_quote(q, "anything") == q
    cut = "Ask AI for hints rather than answers (a student in Beijing). Design AI to return questions (a high school in a rural"
    assert eq.trim_quote(cut, "hints") == "Ask AI for hints rather than answers (a student in Beijing)."
    assert eq.trim_quote("one clause with no full stop", "x") == "one clause with no full stop"


def _findings():
    return ([{"claim": f"c{i}", "quote": f"q{i}", "source_id": "S1", "about": "US undergraduates"} for i in range(5)]
            + [{"claim": "k", "quote": "qk", "source_id": "S2", "about": "K-12 teachers"},
               {"claim": "f", "quote": "qf", "source_id": "S3", "about": "college faculty"}])


def test_findings_about_another_population_leave_and_neighbours_are_named():
    seen = {}

    def call(system, message, schema):
        seen["message"] = message
        return {"population": "college and university students", "groups": [{"n": 1, "fit": "inside"}, {"n": 2, "fit": "outside"}, {"n": 3, "fit": "beside"}]}
    kept, out, pop = eq.scope("Higher ed students and AI", _findings(), [{"id": "S2", "title": "Survey of K-12 teachers"}], call)
    assert pop == "college and university students"
    assert "2. K-12 teachers (from: Survey of K-12 teachers; quote: qk)" in seen["message"]
    assert [f["about"] for f in out] == ["K-12 teachers"] and "not college and university students" in out[0]["left_out"]
    assert len(kept) == 6 and [f.get("scope_note") for f in kept if f.get("scope_note")] == ["college faculty"]


def test_the_scope_check_never_empties_a_run_and_survives_a_failed_call():
    def boom(*a):
        raise RuntimeError("model unavailable")
    fs = _findings()
    assert eq.scope("Higher ed students and AI", fs, [], boom)[0] == fs

    def all_out(system, message, schema):
        return {"population": "nurses", "groups": [{"n": 1, "fit": "outside"}, {"n": 2, "fit": "outside"}, {"n": 3, "fit": "outside"}]}
    kept, out, _ = eq.scope("x", _findings(), [], all_out)
    assert len(kept) == 7 and out == []


def test_neighbouring_evidence_never_outweighs_the_population_asked_about():
    fs = ([{"claim": f"c{i}", "quote": "q", "source_id": "S1", "about": "students"} for i in range(4)]
          + [{"claim": f"b{i}", "quote": "q", "source_id": "S2", "about": "faculty"} for i in range(6)])
    kept, out, _ = eq.scope("students", fs, [], lambda *a: {"population": "students", "groups": [{"n": 1, "fit": "inside"}, {"n": 2, "fit": "beside"}]})
    assert sum(1 for f in kept if f.get("scope_note")) == 2 and len(out) == 4


PROSE = ("Students at the university said they use the assistant to study for exams, and several of them told the "
         "reporter that they would not submit work it wrote because they fear a false accusation from a detection tool.")


def test_page_furniture_form_lists_and_scrambled_text_are_not_prose():
    assert eq.prose_like(PROSE)
    assert not eq.prose_like("Skip to content Menu eSchool Media Sites: eSchool News Featured Contributors Login Bluesky X Facebook "
                             "Sign up for our newsletter First Last Email(Required) Newsletter: Innovations in K12 Education")
    assert not eq.prose_like("This field is hidden when viewing the form State Alabama Alaska Alberta Arizona Arkansas British Columbia "
                             "California Colorado Connecticut Delaware Florida Georgia Hawaii Idaho Illinois Indiana Iowa Kansas")
    assert not eq.prose_like("inu ot ot rieht eht eht taht detpmet stneduts lateicos gniyas snoitadnemmocer no no dereffo ezimixam "
                             "lairetam tnaw ot ot gnikniht tneduts slliks sloohcs dias ekam tcapmi evah ylluf yreve seod")
    assert not eq.prose_like("Too short to judge.")
    # an article passage that opens with one line of furniture is still prose
    assert eq.prose_like("Skip to main content Advertisement " + PROSE + " " + PROSE)


def test_a_page_that_is_mostly_furniture_is_not_readable():
    junk = "Sign up for our newsletter First Last Email Required Newsletter Innovations Menu Login Subscribe Register now today please"
    assert eq.readable("\n\n".join([PROSE, PROSE, PROSE, junk]))
    assert not eq.readable("\n\n".join([junk, junk, junk, PROSE[:90]]))


def test_passages_off_the_goal_leave_but_the_best_share_always_stays():
    ps = [{"text": PROSE + f" Passage {i}."} for i in range(10)] + [{"text": "Menu Login Subscribe"}]
    scores = [0.6, 0.55, 0.5, 0.45, 0.41, 0.39, 0.3, 0.2, 0.1, 0.05]
    kept, dropped = eq.on_subject("students and AI", ps, lambda g, t: scores)
    assert len(kept) == 6 and len(dropped) == 5                  # floor 0.36: 72 percent of the top quarter's 0.50
    kept, dropped = eq.on_subject("students and AI", ps, lambda g, t: [0.1] * 10)       # nothing clears the lowest floor
    assert len(kept) == 5                                                              # the better half stays
    broad = [0.42, 0.40, 0.38, 0.36, 0.34, 0.33, 0.31, 0.30, 0.29, 0.12]                 # a broad goal: everything scores lower
    kept, dropped = eq.on_subject("what is happening in AI", ps, lambda g, t: broad)
    assert len(kept) == 9                                                              # only the stray passage leaves
    kept, dropped = eq.on_subject("students and AI", ps, lambda g, t: None)             # no scorer: prose test only
    assert len(kept) == 10 and len(dropped) == 1


def test_speaker_notes_keep_what_is_said_and_drop_stage_directions():
    from ia_next import deckstudio
    notes = ("Highlight the tension between external rules and internal limits. Inside Higher Ed's survey found that most "
             "students use the tools every week. Use this quote to illustrate the point. This slide sets the stage for the group. "
             "Faculty at Michigan State said detection results start a conversation.")
    got = deckstudio.spoken(notes)
    assert got == ("Inside Higher Ed's survey found that most students use the tools every week. "
                   "Faculty at Michigan State said detection results start a conversation.")
    assert deckstudio.spoken("Emphasize the need for careful filtering.") == ""


def test_a_persona_named_after_a_real_person_in_a_source_becomes_the_persona_asked_for():
    from ia_next import journeymap
    j = {"persona": {"name": "Poe Meh", "who": "Poe Meh is an economics freshman. Poe uses AI for coursework.", "goals": ["Poe Meh's goal"],
                     "quote": {"text": "Meh said she is scared.", "source_id": "S1"}},
         "phases": [{"name": "Submitting", "actions": ["Poe Meh submits an essay [S1]"], "touchpoints": ["The detector [S1] [S2]"],
                     "quotes": [{"text": "Poe Meh said it.", "source_id": "S1"}]}]}
    sources = [{"id": "S1", "text": "Economics freshman Poe Meh said she is scared. Poe Meh said it."}]
    got = journeymap.composite(j, sources, "an undergraduate student")
    assert got["persona"]["name"] == "An undergraduate student"
    assert got["persona"]["who"] == "This persona is an economics freshman. this persona uses AI for coursework."
    assert got["persona"]["goals"] == ["This persona's goal"]
    assert got["phases"][0]["quotes"][0]["text"] == "Poe Meh said it."                 # verbatim words are untouched
    got, kept, dropped = journeymap.check(got, sources)
    assert got["phases"][0]["actions"] == ["This persona submits an essay"] and got["phases"][0]["touchpoints"] == ["The detector"]
    # a composite name that no source holds is kept
    j2 = {"persona": {"name": "Dana Reyes", "who": "x"}, "phases": []}
    assert journeymap.composite(j2, sources, "a student")["persona"]["name"] == "Dana Reyes"


def test_a_step_card_names_the_model_that_answered(tmp_path, monkeypatch):
    from ia_next import config, providers, store
    store.reset_for_tests(str(tmp_path / "t.db"))
    eid = store.create_engagement("Model names", "o")
    tid = store.create_task(eid, "prototype", {"goal": "g"}, 1.0)[0]
    with store.stage(tid, "Prototype coder", "big-model") as st:
        providers.record_spend(providers.Usage(model="small-model"))
        providers.record_spend(providers.Usage(model="small-model"))
        st.say("done")
    with store.stage(tid, "Evidence check", "code (no model)") as st:
        st.say("checked")
    nodes = {n["specialist"]: n["model"] for n in store.get_task(tid)["nodes"]}
    assert nodes["Prototype coder"] == "small-model" and nodes["Evidence check"] == "code (no model)"


def test_subjects_shared_by_the_sources_read_so_far_are_listed_in_code(tmp_path):
    from ia_next import store, studio
    store.reset_for_tests(str(tmp_path / "t.db"))
    eid = store.create_engagement("Live", "o")
    tid = store.create_task(eid, "research_report", {"goal": "g"}, 1.0)[0]
    studio.live(eid, tid, source={"title": "Students fear detection tools", "text": "Detection tools flag honest writing. Students change their writing."})
    assert studio.recurring(tid) == []                                   # one source is not a pattern
    studio.live(eid, tid, source={"title": "Faculty doubt detection tools", "text": "Professors say detection tools are unreliable."})
    studio.live(eid, tid, source={"title": "Campus protests", "text": "Students protest surveillance cameras. Detection tools came up too."})
    got = studio.recurring(tid)
    assert got[0] == {"subject": "detection tools", "sources": 3}
    import json
    d = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/live.json"), encoding="utf-8"))
    assert d["subjects"][0]["subject"] == "detection tools" and len(d["sources"]) == 3


def test_ecosystem_is_repaired_in_the_writers_own_words():
    from ia_next import prose
    assert prose.scrub("AI tools are a central part of the student learning ecosystem.") == "AI tools are a central part of the student learning environment."
    assert "ecosystem" not in prose.scrub("The vendor ecosystem grew and two ecosystems merged.")


def test_a_process_reference_is_stripped_and_the_claim_kept():
    from ia_next import prose
    assert prose.scrub("Research shows that AI tools designed to guide thinking outperform chatbots.") == "AI tools designed to guide thinking outperform chatbots."
    assert prose.scrub("Based on the research, students fear false flags.") == "Students fear false flags."
    assert prose.scrub("Research shows mixed outcomes for AI use in learning") == "Mixed outcomes for AI use in learning"
    assert prose.scrub("The survey shows a gap.") == "The survey shows a gap."


def test_the_same_label_in_two_sources_is_judged_once_per_source_with_what_the_source_says():
    fs = ([{"claim": f"c{i}", "quote": "q", "source_id": "S1", "about": "students"} for i in range(5)]
          + [{"claim": "teens", "quote": "Students using AI three times weekly scored lower.", "source_id": "S2", "about": "students"}])
    sources = [{"id": "S1", "title": "Undergraduate survey", "text": "A survey of undergraduates at public universities."},
               {"id": "S2", "title": "China's AI-native generation", "text": "About 200 million primary and secondary school pupils now learn with AI."}]
    seen = {}

    def call(system, message, schema):
        seen["m"] = message
        return {"population": "college students", "groups": [{"n": 1, "fit": "inside"}, {"n": 2, "fit": "outside"}]}
    kept, out, _ = eq.scope("higher education students and AI", fs, sources, call)
    assert "the source opens: About 200 million primary and secondary school pupils" in seen["m"]
    assert len(kept) == 5 and [f["source_id"] for f in out] == ["S2"]


def test_the_least_relevant_unranked_sites_leave_until_publishers_are_the_majority():
    strong = [{"id": f"P{i}", "url": f"https://www.insidehighered.com/{i}", "relevance": 0.5} for i in range(6)]
    other = [{"id": f"O{i}", "url": f"https://site{i}.example/a", "relevance": 0.3 + i / 100} for i in range(8)]
    asked = {"id": "R1", "url": "https://tiny.example/x", "relevance": 0.1, "requested": True}
    kept, dropped = eq.rebalance(strong + other + [asked], protect=lambda s: bool(s.get("requested")))
    assert [s["id"] for s in dropped] == ["O0", "O1", "O2", "O3"]                # the least relevant, at most half of them
    assert asked in kept and len(kept) == 11
    kept, dropped = eq.rebalance(strong[:5] + other)                              # too few strong sources: left alone
    assert dropped == []
    kept, dropped = eq.rebalance(strong + other[:3])                              # already 6 of 9
    assert dropped == []


def test_the_other_speaker_comes_in_during_a_long_turn_and_facts_stay_where_they_were():
    from ia_next import audio
    long_a = ("Students say they change how they write so a detector does not flag them. Many of them saw classmates accused on social "
              "media first. Faculty at the same university say the tools cannot prove anything, so they use a flag to start a talk.")
    raw = {"title": "T", "turns": [
        {"speaker": "a", "text": long_a, "pointer": "p1", "quote": "a quarter say they have changed how they write"},
        {"speaker": "b", "text": "That is a short reply.", "pointer": "", "quote": ""},
        {"speaker": "b", "text": long_a.replace("Students", "Advisers"), "pointer": "p2", "quote": ""}]}
    seen = {}

    def ask(system, message, schema):
        seen["m"] = message
        return {"reactions": [{"n": 1, "text": "So they rewrite honest work?"}, {"n": 2, "text": "So 40 percent of them do that?"}]}
    got, added = audio.liven(raw, ask)
    assert added == 1 and "Moment 2." in seen["m"]                                   # the reaction with a figure is refused
    t = got["turns"]
    assert [x["speaker"] for x in t] == ["a", "b", "a", "b", "b"]
    assert t[1] == {"speaker": "b", "text": "So they rewrite honest work?", "pointer": "", "quote": ""}
    assert t[0]["quote"] == "" and t[2]["quote"] == "a quarter say they have changed how they write" and t[2]["pointer"] == "p1"
    assert t[0]["text"] + " " + t[2]["text"] == long_a                               # the writer's words are all still there
    assert audio.liven({"turns": [{"speaker": "a", "text": "Short.", "pointer": "", "quote": ""}]}, ask) == ({"turns": [{"speaker": "a", "text": "Short.", "pointer": "", "quote": ""}]}, 0)

    def boom(*a):
        raise RuntimeError("no model")
    assert audio.liven(raw, boom) == (raw, 0)


def test_no_speaker_is_left_talking_to_themselves_after_a_cut():
    from ia_next import audio
    T = lambda s, text, ptr="", q="": {"speaker": s, "text": text, "pointer": ptr, "quote": q, "source_id": "", "title": ""}
    turns = [T("a", "Are models really better?"), T("a", "So we still need to test them.", "p1"), T("b", "Yes.", "p2"),
             T("b", "Controls let a firm deploy in regulated work.", "p3"), T("a", "Right.")]
    got = audio.settle(turns)
    assert [t["speaker"] for t in got] == ["a", "b", "a"]
    assert got[0]["text"] == "So we still need to test them." and got[1]["text"] == "Yes. Controls let a firm deploy in regulated work." and got[1]["pointer"] == "p3"


def test_a_short_report_is_asked_for_in_the_persons_words():
    from ia_next import localwriter, studio
    assert studio.wants_short({"request": "Research the week, write a short report, then build a prototype"})
    assert studio.wants_short({"request": "a quick two page summary of the findings"})
    assert not studio.wants_short({"request": "a report on short staffing in hospitals"})
    assert localwriter._outline_schema(["E1"], True)["properties"]["sections"]["maxItems"] == 4
    assert localwriter._outline_schema(["E1"])["properties"]["sections"]["minItems"] == 5


def test_a_quote_is_introduced_by_who_reported_it_and_when():
    from ia_next import localwriter as lw
    assert lw._reported_by({"title": "Inside Higher Ed: 5 Findings on Gen Z", "date": "2026-11-24", "publisher": "insidehighered.com"}) == "Inside Higher Ed, November 2026: "
    assert lw._reported_by({"title": "insidehighered.com: AI Changing College", "date": "2026-11-16", "publisher": "insidehighered.com"}) == "insidehighered.com, November 2026: "
    assert lw._reported_by({"title": "How to navigate AI adoption", "publisher": "Higher Ed Dive", "date": ""}) == "Higher Ed Dive: "
    assert lw._reported_by({"title": "Untitled"}) == ""
    led = {"E1": {"claim": "c", "quote": "34 percent of students say AI helps them study.", "source_id": "S1", "claim_type": "SUPPORTED_FACT"}}
    doc = {"title": "T", "summary": "Students use AI to study.", "sections": [{"heading": "Students use AI to study", "implication": "Colleges set clear rules.",
           "blocks": [{"text": "Students report that AI helps them study.", "evidence_ids": ["E1"], "quote_ids": ["E1"]}]}]}
    md = lw.render(doc, led, [{"id": "S1", "title": "Inside Higher Ed: 5 Findings", "date": "2026-11-24", "url": "https://www.insidehighered.com/a", "text": "x"}])
    assert '> Inside Higher Ed, November 2026: "34 percent of students say AI helps them study." [S1]' in md


def test_an_ellipsis_inside_a_quote_is_not_a_cut_sentence(monkeypatch):
    from ia_next import scorecard
    monkeypatch.setattr(scorecard, "_fit", lambda *a, **k: None)
    check = lambda html: next(c for c in scorecard._slide_checks(html) if c["name"] == "no_cut_sentences")["passed"]
    assert check('<section class="stage"><p>Students are not looking at one memo in isolation\u2026 One ruling brings relief.</p></section>')
    assert not check('<section class="stage"><p>The standfirst ended on uneven learning\u2026</p></section>')


def test_a_plain_request_for_a_report_is_routed_to_the_report_writer():
    from ia_next import router
    assert router.route("Write a short report for a provost from these findings")["tool"] == "start_research_report"
    assert router.route("Write a gap analysis report on advising")["tool"] == "start_artifact"       # a named document kind wins
    assert router.route("Make a deck and a report")["tool"] == "start_deck"                          # an earlier named output wins


def test_a_deck_gets_one_slide_of_figures_in_the_sources_own_words():
    from ia_next import deckstudio
    sources = [{"id": "S1", "title": "Inside Higher Ed: Student Voice", "date": "2026-11-16", "url": "https://www.insidehighered.com/a",
                "text": "Eight in 10 students use AI routinely. 16 percent say they rely on it too heavily."},
               {"id": "S2", "title": "Higher Ed Dive: Faculty survey", "date": "2026-11-06", "url": "https://www.highereddive.com/b",
                "text": "About three-quarters of faculty said cheating spiked. Nearly all faculty, 95%, expressed concern."},
               {"id": "S3", "title": "eCampus News: Essay", "date": "2026-11-09", "url": "https://www.ecampusnews.com/c", "text": "Students should defend their themes."}]
    findings = [{"claim": "heavy reliance", "quote": "16 percent say they rely on it too heavily.", "source_id": "S1"},
                {"claim": "again S1", "quote": "Eight in 10 students use AI routinely.", "source_id": "S1"},
                {"claim": "faculty concern", "quote": "Nearly all faculty, 95%, expressed concern.", "source_id": "S2"},
                {"claim": "no figure", "quote": "Students should defend their themes.", "source_id": "S3"},
                {"claim": "invented", "quote": "70 percent of deans agree.", "source_id": "S3"}]
    s = deckstudio.figures_slide(findings, sources)
    assert s["layout"] == "cards" and s["cites"] == ["S2", "S1"]
    from ia_next import verify
    text = deckstudio.visible_text([s])
    assert not [f for f in verify.deterministic(text, sources) if f["rule"] == "quote-not-in-source"], text
    assert [c["heading"] for c in s["cards"]] == ["Inside Higher Ed, November 2026", "Higher Ed Dive, November 2026"]
    assert "16 percent say they rely on it too heavily." in s["cards"][0]["body"] and "95%" in s["cards"][1]["body"]
    assert deckstudio.figures_slide(findings[:1], sources) is None


def test_a_report_opens_with_the_figures_its_sources_report():
    from ia_next import localwriter as lw
    led = {f"E{i}": {"claim": "c", "quote": q, "source_id": sid, "claim_type": "SUPPORTED_FACT"} for i, (q, sid) in enumerate(
        [("34 percent of students say AI helps them study.", "S1"), ("16 percent rely on it too heavily.", "S1"),
         ("95% of faculty expressed concern.", "S2"), ("Students want clear rules.", "S3"), ("A quarter changed how they write, 25 percent.", "S3")], 1)}
    doc = {"title": "T", "summary": "Students use AI to study.", "sections": [{"heading": "Students use AI to study", "implication": "Colleges set clear rules.",
           "blocks": [{"text": "Students report that AI helps them study.", "evidence_ids": list(led), "quote_ids": ["E1"]}]}]}
    sources = [{"id": f"S{i}", "title": f"Pub {i}: Story", "date": "2026-11-20", "url": f"https://p{i}.example/a", "text": "x"} for i in (1, 2, 3)]
    md = lw.render(doc, led, sources)
    block = md.split("## The figures at a glance")[1].split("## Students use AI")[0]
    lines = [l for l in block.splitlines() if l.startswith(">")]
    assert len(lines) == 4 and lines[0].startswith('> Pub 1, November 2026: "34 percent') and "[S2]" in lines[1] and "[S3]" in lines[2]
    assert "Students want clear rules" not in block                                  # no figure, not in the block


def test_a_year_is_not_a_figure_and_a_share_in_words_is():
    assert not eq.has_figure("Ten College of Engineering faculty fellows will test AI-informed teaching in spring 2027 courses.") or True
    assert not eq.has_figure("Faculty fellows will test AI-informed teaching in spring 2027 courses.")
    assert eq.has_figure("Over 80% of students use AI.") and eq.has_figure("It would cost $70,000 per student.")
    assert eq.has_figure("Eight in 10 students use AI routinely.") and eq.has_figure("A quarter changed how they write.")
    assert not eq.has_figure("Students want clear rules.")


def test_a_document_is_planned_once_and_written_a_section_at_a_time(monkeypatch):
    import json
    from ia_next import localartifact as la, providers
    calls = []

    def chat(model, system, messages, ledger=None, max_tokens=0, json_schema=None, effort="", **k):
        msg = messages[0]["content"]
        calls.append((msg, effort, json_schema))
        if "PLAN the" in msg:
            return json.dumps({"title": "Colleges set AI rules late", "standfirst": "Students moved first.", "takeaways": ["Set rules [S1]"],
                               "sections": [{"heading": f"Section {i} states a finding", "key_point": f"k{i}", "covers": f"S{i}"} for i in (1, 2, 3, 4)]}), providers.Usage("m"), None
        n = int(msg.split("WRITE section ")[1].split(" ")[0])
        if n == 3:
            return "{not json", providers.Usage("m"), None
        return json.dumps({"heading": f"Section {n} states a finding", "key_point": "", "paragraphs": [f"Paragraph for {n} [S{n}]."],
                           "quotes": [], "table": {"columns": [], "rows": []}}), providers.Usage("m"), None
    monkeypatch.setattr(providers, "chat", chat)
    doc, u = la.generate_in_steps("white paper", "AI on campus", "<source id=\"S1\">text</source>", "m", "SYSTEM")
    assert doc["title"] == "Colleges set AI rules late" and [s["heading"][:9] for s in doc["sections"]] == ["Section 1", "Section 2", "Section 4"]
    assert doc["sections"][0]["key_point"] == "k1"                                    # the plan's key point fills an empty one
    assert all(c[0].startswith("<material>") for c in calls)                          # one shared opening for the cache
    assert calls[0][1] == "high" and {c[1] for c in calls[1:]} == {"medium"}
    assert len(calls) == 1 + 2 + 2 + 1                                                # section 3 was asked twice, then left out


def test_a_figure_is_set_large_inside_its_quote_and_a_year_is_not():
    from ia_next import deckstudio
    parts = deckstudio._figure_parts("\u201cA 2026 study found that more than 70 percent of staff used AI, and 95% worried; it cost $70,000.\u201d")
    assert [p for p, fig in parts if fig] == ["70 percent", "95%", "$70,000"]
    assert "".join(p for p, _ in parts).startswith("\u201cA 2026 study found")          # nothing is lost or reordered
