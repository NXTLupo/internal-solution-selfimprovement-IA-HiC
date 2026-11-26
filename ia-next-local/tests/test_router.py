"""Routing in code (uplift plan WS-4): the misroutes of 19 to 23 Nov and the requests sent through the chat that week.
Pure functions: no model is called."""
import pytest

from ia_next import router

FOCUS = "eng_test"

# (request, expected tool, expected kind or "", expected args that must be present) - None tool means "the model decides"
CASES = [
    # the misroutes, each once patched by a separate guard
    ("Build a clickable prototype of a syllabus AI policy lookup for students", "start_prototype", "", {}),
    ("Draw the technical architecture of how college students, AI tools, course policies and assessment systems connect #architecture",
     "start_artifact", "arch", {"kind": "arch"}),
    ("Please transcribe this talk and keep it in the second brain: https://www.youtube.com/watch?v=UF8uR6Z6KLc",
     "transcribe_video", "", {"url": "https://www.youtube.com/watch?v=UF8uR6Z6KLc"}),
    ("Make a slide deck for a provost: how college students use AI today and what the university should do about it #slides",
     "start_deck", "", {"audience": "provost", "outline": []}),
    ("Write a competitive gap analysis for a provost on responding to student AI use #gap", "start_artifact", "gap", {"kind": "gap"}),
    # requests sent through the chat, 19 to 23 Nov
    ("Build the persona set of the college students in this evidence, grouped by how they use AI, for a provost #personas",
     "start_artifact", "personas", {"kind": "personas"}),
    ("Draw a four-level mind map of how college students use AI and how their universities respond #mindmap", "start_diagram", "", {"mode": "diagram"}),
    ("Make an infographic of how students use AI in coursework", "start_diagram", "", {"mode": "infographic"}),
    ("Map the journey of [student looking for a co-op] from this engagement", "start_journey_map", "", {"persona": "student looking for a co-op"}),
    ("Transcribe this clip into the second brain: https://www.youtube.com/watch?v=jNQXAC9IVRw", "transcribe_video", "", {}),
    ("Create a slide deck for a provost about how college students use AI in their coursework now and what the university should do next #slides",
     "start_deck", "", {"audience": "provost"}),
    ("Write a competitive gap analysis for a provost comparing how a typical university and named peer universities respond to student AI use",
     "start_artifact", "gap", {}),
    ("Make flashcards from these sources #flashcards", "start_artifact", "flashcards", {}),
    ("Write a study guide on student AI use", "start_artifact", "studyguide", {}),
    ("Make a podcast debate about AI in coursework #audio", "start_audio_overview", "", {"format": "debate"}),
    ("Build a data table comparing universities' AI policies #datatable", "start_datatable", "", {}),
    ("Find the themes in this evidence #themes", "start_themes", "", {}),
    ("Prepare a roadmap for the provost #roadmap", "start_artifact", "roadmap", {}),
    ("Write recommendations for the dean #recs", "start_artifact", "recommendations", {}),
    ("Make a deck in the Northeastern brand for the board #slides", "start_deck", "", {"brand": "nu", "audience": "board"}),
    ("Draft an executive brief for DECIEM's leadership #brief #deciem", "start_artifact", "brief", {"brand": "deciem"}),
    ("Transcribe https://example.com/talks/keynote.mp4 for me", "transcribe_video", "", {"url": "https://example.com/talks/keynote.mp4"}),
    # questions and conversation: the model (or the answer desk) decides
    ("What did the speaker say about failure?", None, "", None),
    ("Why do students hide their AI use from instructors?", None, "", None),
    ("thanks, that looks good", "", "", None),
    ("Listen to what students say on Reddit about AI tutors", "", "", None),      # Reddit listening: the model writes the brief
    ("Research how universities set AI policy #research", "start_research_report", "", None),   # routed, but filled by the model
]


@pytest.mark.parametrize("said,tool,kind,want", CASES)
def test_requests_route_in_code(said, tool, kind, want):
    r = router.route(said)
    if tool == "":
        assert r is None, (said, r)
        return
    assert r is not None and r["tool"] == tool, (said, r)
    if kind:
        assert r["kind"] == kind or router.kind_from_words(said) == kind, (said, r)
    if want is None:
        return
    args = router.fill(r, FOCUS, said)
    assert args is not None and args["engagement_id"] == FOCUS, (said, args)
    for k, v in want.items():
        assert args.get(k) == v, (said, k, args.get(k))


def test_a_request_whose_arguments_need_judgement_is_left_to_the_model():
    # field test 23 Nov (S5): a report's brief and a journey's persona are now written in code, so their plan cards
    # appear at once; they used to wait four to six minutes for the model to write them
    r = router.route("Research how universities set AI policy #research")
    got = router.fill(r, FOCUS, "Research how universities set AI policy #research")
    assert r["tool"] == "start_research_report" and got["goal"] == "Research how universities set AI policy"
    assert got["new_research_confirmed"] is False and got["structure"] and got["constraints"]
    r = router.route("Map the journey from this engagement #journey")
    assert router.fill(r, FOCUS, "Map the journey from this engagement #journey")["persona"] == "the people this engagement is about"
    r = router.route("Listen to what students say about AI on Reddit #reddit")
    assert router.fill(r, FOCUS, "Listen to what students say about AI on Reddit #reddit") is None      # the model reads the subreddit
    assert router.fill(router.route("Make a deck #slides"), "", "Make a deck #slides") is None  # no engagement in focus


def test_the_agent_still_offers_the_hashtag_readers():
    from ia_next import agent
    assert agent.hashtag_tool is router.hashtag_tool and agent.HASHTAG_KINDS is router.HASHTAG_KINDS
