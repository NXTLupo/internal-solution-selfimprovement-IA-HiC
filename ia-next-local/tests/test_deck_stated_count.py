"""A slide count the person states is the count (26 Nov: "I asked for a 50 slide deck, but the system says it is only
making a 20 slide deck"). The level's range is only the default; the number is not part of the subject."""
from ia_next import depthlevel, router

ASK = "Make a comprehensive, 50 slide deck from this research for retail leadership team (C-suite and senior retail executives)."


def test_the_stated_count_is_read():
    assert depthlevel.stated_slides(ASK) == 50
    assert depthlevel.stated_slides("a 40-slide deck for the board") == 40
    assert depthlevel.stated_slides("a deck on 2026 retail trends") is None
    assert depthlevel.stated_slides("a 500 slide deck") == depthlevel.MAX_STATED_SLIDES


def test_the_count_is_not_the_subject():
    assert "50" not in router.subject_of(ASK, outputs=True)


def test_a_local_deck_makes_a_picture_for_every_slide_that_takes_one(monkeypatch):
    """26 Nov: "it only says that it is making 5 pictures" for a 20-slide deck. The local picture engine is free."""
    from ia_next import config, deckstudio
    slides = [{"image_prompt": "a store floor at opening time" if i % 2 == 0 else ""} for i in range(20)]
    monkeypatch.setattr(config, "LOCAL", True)
    assert deckstudio.image_cap(slides) == 10
    monkeypatch.setattr(config, "LOCAL", False)
    assert deckstudio.image_cap(slides) == deckstudio.MAX_IMAGES == 5
