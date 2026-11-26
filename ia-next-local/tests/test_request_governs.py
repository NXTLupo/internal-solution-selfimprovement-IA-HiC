"""The request governs (QA 25 Nov, E9): the subject is never the brand, the audience or a setting word, for any
brand, audience and subject; and what a request states in words sets the plan card's choices."""
import pytest

from ia_next import router

SUBJECTS = ["trends in AI adoption with students across major US universities",
            "nurse staffing levels and patient outcomes in US hospitals",
            "loyalty programme redemption among grocery shoppers",
            "claims automation at mid-sized insurers",
            "donor retention in regional arts organizations"]
BRANDS = ["in the Northeastern brand", "in the DECIEM brand", "using the NXT Humans brand", "with Acme Health branding", ""]
AUDIENCES = ["for faculty to understand", "for the board to decide on", "for a provost to review", "for store managers to learn about", ""]


@pytest.mark.parametrize("subject", SUBJECTS)
def test_the_subject_is_the_same_whatever_the_brand_and_the_audience(subject):
    got = set()
    for brand in BRANDS:
        for aud in AUDIENCES:
            if aud:
                said = f"Make a detailed slide deck {brand} from this engagement {aud} {subject}"
            else:
                said = f"Make a detailed slide deck {brand} from this engagement on {subject}"
            got.add(router.subject_of(said, outputs=True).lower().strip(" .").removeprefix("on ").strip())
    assert got == {subject.lower()}, got


def test_the_owners_request_keeps_its_subject_and_names_its_audience():
    said = ("Make a detailed slide deck in the Northeastern brand from this engagement for [faculty to understand trends "
            "in AI Adoption with Students across major US Universities]")
    assert router.subject_of(said, outputs=True) == "trends in AI Adoption with Students across major US Universities"
    assert router.presentation_free(said)[1] == "faculty"
    assert "northeastern" not in router.subject_of(said, outputs=True).lower()


def test_a_brand_word_that_is_the_subject_stays():
    assert "brand loyalty" in router.subject_of("Write a report on retailers with strong brand loyalty", outputs=False)
    assert "Northeastern" in router.subject_of("Write a report on how Northeastern University students use AI", outputs=False)


def test_setting_words_leave_the_subject_and_set_the_cards_choices():
    said = "Make a portrait infographic (detailed detail) of [AI Adoption in Higher Ed] from this engagement #infographic"
    subj = router.subject_of(said, outputs=True)
    assert subj == "AI Adoption in Higher Ed", subj
    st = router.stated(said)
    assert st["orientation"] == "portrait" and st["density"] == "detailed" and st["depth"] == "deep" and "brand" not in st
    assert router.stated("a concise landscape poster in the DECIEM brand") == {"orientation": "landscape", "density": "concise", "brand": "deciem"}
    assert router.stated("a report on short-term rentals") == {}


@pytest.mark.new_engagement
def test_with_no_engagement_chosen_work_is_filed_in_a_new_empty_one(tmp_path, monkeypatch):
    from ia_next import agent, config, store
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    old = store.create_engagement("Universities and AI this week", "an earlier question")
    tok = store.TURN.set({"request": "Make a deck in the DECIEM brand for the board to review claims automation at mid-sized insurers",
                          "packs": [], "focus": ""})
    try:
        a = agent.repair_engagement("start_deck", {"engagement_id": old, "goal": "x", "brand": "deciem"})
        b = agent.repair_engagement("start_deck", {"engagement_id": old, "goal": "x", "brand": "deciem"})
        r = agent.repair_engagement("start_research_report", {"engagement_id": old, "engagement_title": "", "goal": "x"})
    finally:
        store.TURN.reset(tok)
    assert a["engagement_id"] != old and a["engagement_id"] == b["engagement_id"]
    assert store.get_engagement(a["engagement_id"])["title"] == "Claims automation at mid-sized insurers"
    assert r["engagement_id"] == ""
    tok = store.TURN.set({"request": "Make a deck on claims automation", "packs": [], "focus": old})
    try:
        assert agent.repair_engagement("start_deck", {"engagement_id": old})["engagement_id"] == old
    finally:
        store.TURN.reset(tok)


def test_the_subject_picks_the_data_packs_not_the_audience():
    from ia_next import hic
    a = hic.quick_packs("Make an infographic for the board to review claims automation at mid-sized insurers")
    b = hic.quick_packs("Make an infographic on claims automation at mid-sized insurers")
    assert a == b


def test_the_goal_of_a_routed_output_is_its_subject():
    r = router.route("Make a detailed portrait infographic in the DECIEM brand for the board to review claims automation at mid-sized insurers #infographic")
    args = router.fill(r, "eng_x", "Make a detailed portrait infographic in the DECIEM brand for the board to review claims automation at mid-sized insurers #infographic")
    assert args["goal"] == "claims automation at mid-sized insurers", args


def test_a_period_and_an_audience_named_after_an_output_are_not_the_subject():
    said = "Do deep research going back 90 days on warehouse automation in grocery retail and make a deck for operations leaders"
    assert router.subject_of(said, "", outputs=True) == "warehouse automation in grocery retail"
    assert router.presentation_free(said)[1] == "operations leaders"
    assert router.subject_of("a detailed infographic on clinic no-shows with a 90-day window", "", outputs=True) == "clinic no-shows"
    assert router.subject_of("collect data 90 days out on freight pricing for a board report", "", outputs=True) == "freight pricing for a board"
    # a "for" that belongs to the subject stays, and so does a number that is not a period
    assert router.presentation_free("retention strategies for nursing staff")[1] == ""
    assert "nurses with over 5 years of experience" in router.subject_of("a report on nurses with over 5 years of experience", "")
    said = "Make a detailed portrait infographic in the DECIEM brand for store operations leaders on warehouse automation in grocery retail, going back 90 days"
    assert router.subject_of(said, "", outputs=True) == "warehouse automation in grocery retail"
    assert router.presentation_free(said)[1] == "store operations leaders"
