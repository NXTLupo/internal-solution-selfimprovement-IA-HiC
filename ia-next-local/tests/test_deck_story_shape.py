"""The storyline's shape is checked before any slide is written (26 Nov: 14 of 20 storyline slides became CASE slides,
13 of them as three-column cards, and the decisions dropped out; the six decks before carried no CASE slide)."""
import collections

from ia_next import deckstudio

BAD = ([{"layout": "cover", "kicker": "COVER"}, {"layout": "statement", "kicker": "SITUATION"}, {"layout": "cards", "kicker": "IMPACT"},
        {"layout": "quote", "kicker": "FINDING"}] + [{"layout": "cards", "kicker": "CASE"} for _ in range(14)]
       + [{"layout": "quote", "kicker": "IN THEIR WORDS"}, {"layout": "cards", "kicker": "CASE"}])


def test_the_bad_storyline_is_caught():
    probs = " | ".join(deckstudio.story_problems(BAD, 3))
    assert "15 slides have the kicker CASE" in probs and "times in a row" in probs and "no closing slide" in probs
    assert "'cards' is used on" in probs


def test_a_storyline_that_still_fails_is_repaired_in_code():
    plan = deckstudio.repair_story([dict(p) for p in BAD], 3)
    lays = [p["layout"] for p in plan]
    runs = max(len(list(g)) for _k, g in __import__("itertools").groupby(lays))
    assert runs <= deckstudio.MAX_RUN and lays[-1] == "closing"
    assert sum(1 for p in plan if p["kicker"] == "CASE") == 3
    assert collections.Counter(lays)["cards"] < 15


def test_a_sound_storyline_passes():
    good = [{"layout": l, "kicker": k} for l, k in (("cover", "COVER"), ("statement", "SITUATION"), ("cards", "FINDING"),
            ("bullets", "FINDING"), ("flow", "CASE"), ("quote", "VOICE"), ("cards", "FINDING"), ("statement", "CASE"),
            ("bullets", "DECISIONS"), ("closing", "NEXT STEPS"))]
    assert deckstudio.story_problems(good, 3) == []


def test_repeated_slides_in_the_plan_are_named():
    plan = [{"layout": "cover", "kicker": "COVER", "title": "Answer", "purpose": "the answer"},
            {"layout": "bullets", "kicker": "ACTION", "title": "Standardize product data for AI assistants", "purpose": "clean product data"},
            {"layout": "cards", "kicker": "FINDING", "title": "Shoppers compare with AI but buy themselves", "purpose": "trust"},
            {"layout": "bullets", "kicker": "ACTION", "title": "Standardize product data for AI consumption", "purpose": "clean product data feeds"},
            {"layout": "closing", "kicker": "NEXT", "title": "Decisions", "purpose": "the decisions"}]
    probs = " | ".join(deckstudio.story_problems(plan, 3))
    assert "slides 2 and 4 make the same point" in probs


def test_repeats_left_out_are_counted():
    from ia_next import deckstudio as ds
    raw = [{"layout": "cover", "title": "The answer"}, {"layout": "bullets", "title": "Standardize product data for AI assistants"},
           {"layout": "bullets", "title": "Standardize product data for AI assistants"}, {"layout": "closing", "title": "Decide now"}]
    kept = ds.normalize(raw, [])
    assert len(kept) == 3 and ds._DEDUP.n == 1
