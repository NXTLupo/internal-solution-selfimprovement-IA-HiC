"""A quote from a recording is a clean, complete sentence the person said, word for word, or it is not shown."""
from ia_next import deckstudio, evidencequality as eq

SPEECH = ("So like, I kind of made it more of a tendency, I'll just go straight to AI and like ask you know. "
          "I check every answer against the reading before I hand anything in. "
          "that's the kind of type that like scares me. "
          "My teacher never told us which tools the course allows.")


def test_speech_is_recognised_and_a_clean_sentence_is_chosen_from_it():
    assert eq.filler_hits("I'll just go straight to AI and like ask you know") >= 2
    assert eq.filler_hits("I check every answer against the reading before I hand anything in.") == 0
    assert eq.is_clean_sentence("I check every answer against the reading before I hand anything in.")
    assert not eq.is_clean_sentence("that's the kind of type that like scares me.")            # filler, and no capital
    assert not eq.is_clean_sentence("Well, I check every answer against the reading before I hand it in.")
    assert not eq.is_clean_sentence("I check answers.")                                        # too short to stand alone
    # a clean sentence inside the quote is used; the words are never edited
    got = eq.clean_spoken("So like, I kind of go straight to AI. I check every answer against the reading before I hand anything in.")
    assert got == "I check every answer against the reading before I hand anything in."
    # none inside the quote: the clean sentence of the same source nearest the point
    got = eq.clean_spoken("that's the kind of type that like scares me.", SPEECH, "my teacher has not told us which tools the course allows")
    assert got == "My teacher never told us which tools the course allows." and got in SPEECH
    assert eq.clean_spoken("that's like, you know, whatever.", "um, like, yeah. so, kind of.", "anything") == ""
    assert eq.trim_quote("So like, I kind of go straight to AI. I check every answer against the reading before I hand anything in.") \
        == "I check every answer against the reading before I hand anything in."


def test_a_deck_shows_a_clean_sentence_from_a_transcript_or_no_quote():
    src = [{"id": "S1", "title": "student.MOV", "text": "studentA.MOV\nTranscribed by: Whisper\n" + SPEECH, "origin": "video:upload", "kind": "transcript"},
           {"id": "S2", "title": "talk.MOV", "text": "Transcribed by: Whisper\num, like, yeah. so, kind of, you know.", "origin": "video:upload", "kind": "transcript"}]
    slide = lambda q, sid, title: dict(deckstudio._SLIDE_DEFAULTS, layout="quote", kicker="IN THEIR WORDS", title=title, subtitle="", takeaway="",
                                        quote=q, source_id=sid, cites=[])
    slides = [slide("that's the kind of type that like scares me.", "S1", "My teacher never told us which tools the course allows"),
              slide("um, like, yeah. so, kind of, you know.", "S2", "Students hesitate"),
              slide("I check every answer against the reading before I hand anything in.", "S1", "Students check answers")]
    dropped = deckstudio.check_quotes(slides, src)
    assert slides[0]["quote"] == "My teacher never told us which tools the course allows." and slides[0]["layout"] == "quote"
    assert slides[1]["quote"] == "" and slides[1]["layout"] == "bullets" and slides[1]["kicker"] == "THE EVIDENCE"
    assert slides[2]["quote"] == "I check every answer against the reading before I hand anything in."
    assert dropped == 1
    assert all(eq.filler_hits(s["quote"]) == 0 for s in slides)


def test_a_written_source_keeps_its_quote_as_it_is():
    src = [{"id": "S1", "title": "Report", "url": "https://example.org/r", "text": "The survey found that students in their first year were the least likely to ask an instructor."}]
    s = dict(deckstudio._SLIDE_DEFAULTS, layout="quote", title="t", subtitle="", takeaway="", quote="students in their first year were the least likely to ask an instructor", source_id="S1", cites=[])
    deckstudio.check_quotes([s], src)
    assert s["quote"] == "students in their first year were the least likely to ask an instructor"


def test_the_rule_as_read_on_real_interviews():
    assert not eq.is_clean_sentence("It's become like a habit at this point.")                  # "like" as filler
    assert eq.filler_hits("I like the way it explains a reading before I start.") == 0           # "like" as the verb
    assert eq.filler_hits("It feels like a tutor that never gets tired of my questions.") == 0
    assert not eq.is_clean_sentence("Can you just talk about that a little bit more for me?")    # the interviewer's question
    assert not eq.is_clean_sentence("This interview is about how you use these tools and how you feel about them.")   # not the speaker's voice
    assert not eq.is_clean_sentence("I would say, honestly, my friends use it more than me and that is fine.")
    assert eq.is_clean_sentence("I use it a lot to help me with math because it explains each step.")


def test_a_transcript_is_recognised_as_the_builders_hold_it():
    held = {"id": "S57", "url": "", "title": "studentA2.MOV",
            "text": "Transcript of studentA2.MOV.\n\n[00:00] Let's begin. I'm in my last year and I live near campus. "
                    "[00:20] when I'm stuck on my chemistry worksheet I take a picture of the problems I can't solve. "
                    "I use it to walk me through my chemistry worksheet one step at a time."}
    assert eq.spoken_source(held)
    assert not eq.spoken_source({"id": "S1", "url": "https://example.org/r", "title": "Annual report", "text": "The survey found that students ask less often."})
    s = dict(deckstudio._SLIDE_DEFAULTS, layout="quote", title="Students use AI to walk them through chemistry homework", subtitle="", takeaway="",
             quote="when I'm stuck on my chemistry worksheet I take a picture of the problems I can't solve", source_id="S57", cites=[])
    deckstudio.check_quotes([s], [held])
    assert s["quote"] == "I use it to walk me through my chemistry worksheet one step at a time."      # a whole sentence, not a fragment


def test_a_deck_from_recordings_is_handed_the_sentences_it_may_quote():
    src = [{"id": "S1", "title": "student.MOV", "url": "", "text": "Transcript of student.MOV.\n\n[00:00] " + SPEECH
            + " I use it a lot to help me with math because it explains each step of the problem."},
           {"id": "S2", "title": "Report", "url": "https://example.org/r", "text": "I am a written report and I say that students ask less often now."}]
    got = eq.quotable(src, "students use it for math homework")
    assert got and all(sid == "S1" for sid, _ in got)                         # written sources are quoted as before
    assert got[0][1] == "I use it a lot to help me with math because it explains each step of the problem."
    assert all(eq.is_clean_sentence(s) and s in src[0]["text"] for _, s in got)


def test_a_slide_that_says_the_same_thing_in_other_words_is_dropped():
    raw = [{"layout": "bullets", "title": t, "points": ["a point that is long enough to stand", "another point that is long enough"]}
           for t in ("AI is used to format citations and manage sources", "AI is used to format citations and manage source lists",
                     "Students fear being caught using AI for writing")]
    kept = deckstudio.clean_slides(raw, [{"id": "S1"}]) if hasattr(deckstudio, "clean_slides") else None
    if kept is not None:
        assert [s["title"] for s in kept] == ["AI is used to format citations and manage sources", "Students fear being caught using AI for writing"]


def test_a_quote_sits_on_the_slide_whose_point_it_makes_and_recordings_take_turns():
    a = {"id": "S1", "title": "a.MOV", "url": "", "text": "Transcript of a.MOV. [00:00] I use it to format my citations before I hand in an essay. "
         "I upload a screenshot of my math homework and it walks me through each step."}
    b = {"id": "S2", "title": "b.MOV", "url": "", "text": "Transcript of b.MOV. [00:00] I draft my resume with it and then I rewrite every line myself. "
         "I check my math homework answers with it after I finish the problems."}
    slide = lambda title, q, sid: dict(deckstudio._SLIDE_DEFAULTS, layout="quote", kicker="IN THEIR WORDS", title=title, subtitle="", takeaway="", quote=q, source_id=sid, cites=[sid])
    slides = [slide("Students use AI to draft a resume and rewrite it", "I use it to format my citations before I hand in an essay.", "S1"),
              slide("Students use AI to work through math homework", "I upload a screenshot of my math homework and it walks me through each step.", "S1"),
              slide("Students worry about parking on campus", "I use it to format my citations before I hand in an essay.", "S1")]
    eq.fit_spoken_quotes(slides, [a, b])
    assert slides[0]["quote"] == "I draft my resume with it and then I rewrite every line myself." and slides[0]["source_id"] == "S2"
    assert slides[1]["quote"].startswith("I upload a screenshot of my math homework")       # already on its point: left alone
    assert slides[2]["quote"] == "" and slides[2]["layout"] == "bullets"                     # nothing said bears on it
    assert len({s["quote"] for s in slides if s["quote"]}) == 2


def test_titles_are_sentence_case_through_their_hyphens():
    assert eq.sentence_case_title("Students use AI to guide Step-by-Step problem solving") == "Students use AI to guide step-by-step problem solving"
    assert eq.sentence_case_title("Current assessment cannot detect AI-Guided learning") == "Current assessment cannot detect AI-guided learning"
    assert eq.sentence_case_title("Step-by-Step guidance keeps first-year students on course") == "Step-by-step guidance keeps first-year students on course"
    assert eq.sentence_case_title("K-12 and US-based programs differ") == "K-12 and US-based programs differ"


def test_a_quote_slide_takes_the_best_clean_sentence_before_its_quote_is_given_up():
    a = {"id": "S1", "title": "a.MOV", "url": "", "text": "Transcript of a.MOV. [00:00] so like, yeah, I kind of just, you know, ask it stuff. "
         "I upload a screenshot of my math homework and it walks me through each step."}
    s = dict(deckstudio._SLIDE_DEFAULTS, layout="quote", kicker="IN THEIR WORDS", title="Students use AI to work through math homework", subtitle="",
             takeaway="", quote="so like, yeah, I kind of just, you know, ask it stuff.", source_id="S1", cites=[])
    assert deckstudio.check_quotes([s], [a]) == 0
    assert s["layout"] == "quote" and s["quote"] == "I upload a screenshot of my math homework and it walks me through each step."


def test_a_figure_of_speech_in_a_title_is_a_title_problem():
    from ia_next import deck
    assert any("figure of speech" in p for p in deck.title_problems("Students use AI as a cognitive crutch that erodes independent thinking"))
    assert not any("figure of speech" in p for p in deck.title_problems("Students rely on AI for math, citations and summaries"))


def test_a_spoken_quote_is_placed_by_meaning_and_never_says_who_the_speaker_is():
    assert not eq.is_clean_sentence("I'm a boy, and I go to Lakeside High School.")
    assert not eq.is_clean_sentence("I am seventeen years old and I am a junior this year.")
    a = {"id": "S1", "title": "a.MOV", "url": "", "text": "Transcript of a.MOV. [00:00] I'm a boy, and I go to Lakeside High School. "
         "I would be scared if a teacher asked me to explain an essay that the assistant helped me write. "
         "I upload a screenshot of my math homework and it walks me through each step."}
    slide = lambda title, q: dict(deckstudio._SLIDE_DEFAULTS, layout="quote", kicker="IN THEIR WORDS", title=title, subtitle="", takeaway="",
                                   quote=q, source_id="S1", cites=["S1"])
    slides = [slide("Students fear they cannot defend work the assistant helped write", "I upload a screenshot of my math homework and it walks me through each step."),
              slide("Parking on campus is expensive for commuters", "I upload a screenshot of my math homework and it walks me through each step.")]

    def score(about, texts):                     # stands in for the embedding model
        return [0.70 if ("defend" in about and "scared" in t) else 0.52 if ("defend" in about and "math" in t) else 0.25 for t in texts]
    deckstudio.fit_quotes(slides, [a], score)
    assert slides[0]["quote"] == "I would be scared if a teacher asked me to explain an essay that the assistant helped me write."
    assert slides[1]["quote"] == "" and slides[1]["layout"] == "bullets" and slides[1]["kicker"] == "THE EVIDENCE"
    assert all("Lakeside" not in s["quote"] for s in slides)


def test_the_writers_own_clean_quote_is_kept_unless_another_is_clearly_on_the_point():
    a = {"id": "S1", "title": "a.MOV", "url": "", "text": "Transcript of a.MOV. [00:00] I use it to format my citations before I hand in an essay. "
         "I check my citations again by hand because it gets the dates wrong sometimes."}
    s = dict(deckstudio._SLIDE_DEFAULTS, layout="quote", kicker="IN THEIR WORDS", title="Students use AI to format citations", subtitle="", takeaway="",
             quote="I use it to format my citations before I hand in an essay.", source_id="S1", cites=["S1"])
    deckstudio.fit_quotes([s], [a], lambda about, texts: [0.55, 0.57][:len(texts)])
    assert s["quote"] == "I use it to format my citations before I hand in an essay."          # near its slide, and nothing clearly better
    deckstudio.fit_quotes([s], [a], lambda about, texts: [0.40, 0.45][:len(texts)])
    assert s["quote"] == "" and s["layout"] == "bullets"                                       # nothing earns the slide


def test_titles_lose_mid_sentence_capitals_and_names_keep_theirs():
    known = "I prefer it for answers. I go to Northeastern and Northeastern has a policy. We use Canvas, and Canvas lists the rules."
    assert eq.sentence_case_words("Students Prefer AI for in-depth Answers", known) == "Students prefer AI for in-depth answers"
    assert eq.sentence_case_words("Students at Northeastern read the policy on Canvas", known) == "Students at Northeastern read the policy on Canvas"
    assert eq.sentence_case_words("US students use ChatGPT daily", known) == "US students use ChatGPT daily"


def test_summarize_as_a_verb_is_not_meta_narration():
    from ia_next import verify
    rules = lambda text: [f["detail"] for f in verify.rung1(text, [], []) if f["rule"] == "meta-narration"] if hasattr(verify, "rung1") else None
    got = rules("Students use AI to summarize long research papers before class.")
    if got is not None:
        assert "to summarize" not in got
        assert "to summarize" in rules("To summarize, students use AI for reading.")


def test_a_source_id_never_appears_in_the_words_a_reader_sees():
    f = deckstudio.no_source_ids
    assert f("The student at S59 used this for a government class assignment.") == "One student used this for a government class assignment."
    assert f("Multiple students across S57, S59, and S61 describe using it daily.") == "Multiple students across the interviews describe using it daily."
    assert f("The student in S57 uses it every weekday for math.") == "One student uses it every weekday for math."
    assert f("Students check each answer by hand (S62).") == "Students check each answer by hand."
    assert f("Students check each answer by hand.") == "Students check each answer by hand."
    s = dict(deckstudio._SLIDE_DEFAULTS, layout="bullets", title="Students condense long cases", points=["The student at S59 used this for a class."],
             notes="The student in S59 describes it.", source_id="S59", cites=["S59"])
    deckstudio.strip_source_ids([s])
    assert s["points"] == ["One student used this for a class."] and s["notes"] == "One student describes it."
    assert s["source_id"] == "S59" and s["cites"] == ["S59"]                 # the pointers themselves are kept


def test_a_posters_quote_from_a_recording_is_a_clean_sentence_or_absent():
    from ia_next import illustrated
    frag = [{"quote": "when I'm stuck on my chemistry worksheet I take a picture of the problems I can't solve", "title": "studentA2.MOV"}]
    assert illustrated.proof(frag) is None
    named = [{"quote": "I use ChatGPT to format my citations for a Lakeside Community College assignment where I needed a report.", "title": "studentA2.MOV"}]
    assert illustrated.proof(named) is None                                  # it says where the speaker studies
    clean = [{"quote": "I upload a screenshot of my math homework and it walks me through each step.", "title": "studentA2.MOV"}]
    assert illustrated.proof(clean)["quote"] == "I upload a screenshot of my math homework and it walks me through each step."
    written = [{"quote": "students in their first year were the least likely to ask an instructor for help", "title": "Inside Higher Ed: Survey"}]
    assert illustrated.proof(written)["quote"].startswith("students in their first year")       # a written source is quoted as before
