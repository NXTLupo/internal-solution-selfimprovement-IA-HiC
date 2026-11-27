"""One rework pass on finished work (harness WS-H7, 26 Nov): a seeded failure the rework fixes is repaired and the mark
goes; one it cannot fix stays labelled with the earlier files restored; never a second rework; no deck text under 10 pt;
stale verdicts scored again by the idle pass."""
import json
import os

from ia_next import deckstudio, rework, scorecard, store


def _deck(tmp_titles):
    eid = store.create_engagement("rework", "o")
    tid, _ = store.create_task(eid, "deck", {"goal": "g"}, 1.0)
    folder = store.safe_path(eid, f"results/decks/{tid}")
    os.makedirs(folder, exist_ok=True)
    slides = [{"layout": "bullets", "title": t, "points": ["p"]} for t in tmp_titles]
    with open(os.path.join(folder, "deck.json"), "w", encoding="utf-8") as fh:
        json.dump({"deck_title": "D", "brand": "nxt", "slides": slides}, fh)
    for name in ("deck.pptx", "deck.html"):
        with open(os.path.join(folder, name), "w", encoding="utf-8") as fh:
            fh.write("original " + name)
    store.update_task(tid, status="done", result_path=os.path.join(folder, "deck.html"), summary="5 slides")
    return store.get_task(tid), folder


def _titles(folder):
    with open(os.path.join(folder, "deck.json"), encoding="utf-8") as fh:
        return [s["title"] for s in json.load(fh)["slides"]]


def test_repeated_slides_are_left_out_and_the_better_version_kept(monkeypatch):
    t, folder = _deck(["Cover", "Alumni drop off at three stages", "Alumni drop off at three stages",
                       "Sources, continued", "Sources, continued"])
    rerendered = []
    monkeypatch.setattr(deckstudio, "rerender", lambda eid, tid, brand: rerendered.append(tid))
    sc = {"hard_failed": ["no_repeated_slides"], "checks": []}
    got = rework.run(t, sc, lambda task: {"hard_failed": [], "checks": []})
    assert got["hard_failed"] == [] and got["rework"]["kept"] == "repaired"
    assert got["rework"]["fixed"] == ["no_repeated_slides"]
    assert _titles(folder) == ["Cover", "Alumni drop off at three stages", "Sources, continued", "Sources, continued"]
    assert os.path.isfile(os.path.join(folder, "deck.v1.json")) and rerendered == [t["id"]]


def test_a_failure_the_rework_cannot_fix_stays_labelled_and_the_files_come_back(monkeypatch):
    t, folder = _deck(["Cover", "Same point", "Same point"])

    def rerender(eid, tid, brand):
        with open(os.path.join(folder, "deck.pptx"), "w", encoding="utf-8") as fh:
            fh.write("rewritten")
    monkeypatch.setattr(deckstudio, "rerender", rerender)
    sc = {"hard_failed": ["no_repeated_slides", "pptx_text_size"], "checks": []}
    got = rework.run(t, sc, lambda task: {"hard_failed": ["no_repeated_slides", "pptx_text_size"], "checks": []})
    assert got["hard_failed"] == ["no_repeated_slides", "pptx_text_size"] and got["rework"]["kept"] == "original"
    assert _titles(folder) == ["Cover", "Same point", "Same point"]                   # the earlier slides restored
    with open(os.path.join(folder, "deck.pptx"), encoding="utf-8") as fh:
        assert fh.read() == "original deck.pptx"
    assert not os.path.isdir(os.path.join(folder, ".rework-backup"))


def test_never_a_second_rework(monkeypatch):
    t, folder = _deck(["Cover", "Same point", "Same point"])
    monkeypatch.setattr(deckstudio, "rerender", lambda *a: (_ for _ in ()).throw(AssertionError("no second rework")))
    sc = {"hard_failed": ["no_repeated_slides"], "checks": [], "rework": {"kept": "original"}}
    assert rework.run(t, sc, lambda task: {"hard_failed": []}) is sc


def test_other_kinds_and_unfixable_checks_are_not_reworked():
    t, folder = _deck(["Cover"])
    assert rework.fixable(t, ["sources_current"]) == set()
    assert rework.fixable(dict(t, kind="research_report"), ["no_repeated_slides"]) == set()


def test_the_scorecard_runs_the_rework_and_the_card_says_so(monkeypatch):
    t, folder = _deck(["Cover", "Same point", "Same point"])
    monkeypatch.setattr(deckstudio, "rerender", lambda *a: None)
    calls = []

    def fake_score(task):
        calls.append(1)
        return {"checks": [], "judge": None, "checked_at": 0, "version": scorecard.VERSION,
                "hard_failed": ["no_repeated_slides"] if len(calls) == 1 else []}
    monkeypatch.setattr(scorecard, "score", fake_score)
    from ia_next import improve
    monkeypatch.setattr(improve, "maybe_run", lambda: None)
    sc = scorecard.run(t["id"])
    assert sc["hard_failed"] == [] and sc["rework"]["fixed"] == ["no_repeated_slides"]
    summary = store.get_task(t["id"])["summary"]
    assert "Repaired after the checks: no_repeated_slides" in summary and not summary.startswith("Needs review")


def test_deck_text_never_goes_under_10_pt():
    assert deckstudio._fit("x" * 900, 15, 260) >= deckstudio.MIN_PT
    assert deckstudio._fit("x" * 160, 11, 90) >= deckstudio.MIN_PT
    assert deckstudio._fit_box("word " * 200, 2.0, 1.0, 13) >= deckstudio.MIN_PT
    long_body = ("Advisors carry too many students to follow each one. " * 6).strip()
    text, size = deckstudio._fit_text(long_body, 2.0, 1.2, 13)
    assert size >= deckstudio.MIN_PT and text.endswith(".") and long_body.startswith(text) and len(text) < len(long_body)
    pts = ["a" * 300, "b" * 200, "c" * 200]
    assert deckstudio._points_within(pts, deckstudio._room(15, 260)) == pts[:2]
    assert deckstudio._sentences_within("One. Two. Three.", 9) == "One. Two."


def test_stale_verdicts_are_scored_again_once(monkeypatch):
    t, folder = _deck(["Cover"])
    with open(os.path.join(folder, "scorecard.json"), "w", encoding="utf-8") as fh:
        json.dump({"hard_failed": ["no_repeated_slides"], "version": 1}, fh)
    ran = []
    monkeypatch.setattr(scorecard, "run", lambda tid: ran.append(tid))
    monkeypatch.setattr(scorecard, "RESCORE_PER_PASS", 400)
    assert t["id"] in scorecard.rescore_stale(limit=400) and t["id"] in ran
    with open(os.path.join(folder, "scorecard.json"), "w", encoding="utf-8") as fh:
        json.dump({"hard_failed": ["no_repeated_slides"], "version": scorecard.VERSION}, fh)
    ran.clear()
    scorecard.rescore_stale(limit=400)
    assert t["id"] not in ran


def test_the_needs_review_list_follows_todays_checks(monkeypatch):
    t, folder = _deck(["Cover"])
    store.update_task(t["id"], summary="Needs review (no_cut_sentences, sources_current). Deck ready")
    monkeypatch.setattr(scorecard, "score", lambda task: {"checks": [], "judge": None, "checked_at": 0,
                                                         "version": scorecard.VERSION, "hard_failed": ["sources_current"]})
    from ia_next import improve
    monkeypatch.setattr(improve, "maybe_run", lambda: None)
    scorecard.run(t["id"])
    assert store.get_task(t["id"])["summary"] == "Needs review (sources_current). Deck ready"
