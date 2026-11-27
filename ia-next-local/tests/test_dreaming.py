"""Dreaming (harness WS-H12, 26 Nov): recent turns reviewed out of band; observations keep only evidence quoted exactly
from the turn they name; a pattern needs enough occurrences across enough turns; each pattern becomes an approval card;
an accepted note is written as a version by "dreaming", even when memory changed since it was drafted. A fake model
stands in."""
import json

import pytest

from ia_next import config, control, dreaming, memory, papercuts, store


@pytest.fixture(autouse=True)
def _own_store(tmp_path, monkeypatch):
    """Each test reads only its own turns, papercuts and approvals."""
    store.reset_for_tests(str(tmp_path / "dream.sqlite3"))
    monkeypatch.setattr(config, "MEMORY_DIR", str(tmp_path / "memory"))
    config.ensure_dirs()


def _turns():
    rows = [("tr_000000000001", "conv_a", "Make the deck twelve slides, not thirty", "Here is a 30-slide deck."),
            ("tr_000000000002", "conv_a", "Again: twelve slides at most please", "Revised to 28 slides."),
            ("tr_000000000003", "conv_b", "Keep decks to twelve slides as I said before", "Made a 24-slide deck."),
            ("tr_000000000004", "conv_b", "What is in my Library on grocery?", "Three reports.")]
    for tr, conv, said, reply in rows:
        store.save_transcript(tr, conv, memory.OWNER, said, [], reply, "answered", 3.0)


def _fake(observations):
    return lambda model, system, messages, ledger, **kw: (json.dumps({"observations": observations}), None, None)


DECK_OBS = [{"kind": "preference", "summary": "The person wants decks of at most twelve slides", "note": "Keep decks to twelve slides or fewer.",
             "evidence": [{"trace": "tr_000000000001", "quote": "twelve slides, not thirty"},
                          {"trace": "tr_000000000002", "quote": "twelve slides at most"},
                          {"trace": "tr_000000000003", "quote": "Keep decks to twelve slides"},
                          {"trace": "tr_000000000004", "quote": "I hate long decks"}]}]          # the last quote is invented


def test_a_repeated_correction_becomes_one_proposal_and_an_invented_quote_is_dropped():
    _turns()
    out = dreaming.run(since=0, call=_fake(DECK_OBS))
    # one reviewer per conversation (27 Nov): conv_a's batch keeps turns 1 and 2, conv_b's keeps turn 3
    assert out["turns"] == 4 and len(out["observations"]) == 2
    assert sorted(e["trace"] for o in out["observations"] for e in o["evidence"]) == ["tr_000000000001", "tr_000000000002", "tr_000000000003"]
    pats = out["patterns"]
    assert len(pats) == 1 and pats[0]["occurrences"] == 3 and pats[0]["turns"] == 3 and pats[0]["conversations"] == 2
    assert len(out["proposals"]) == 1
    pending = [a for a in control.pending() if a["tool"] == "apply_dream"]
    assert len(pending) == 1 and "Seen 3 times across 3 turns" in pending[0]["reason"]
    t = store.get_task(out["task_id"])
    assert t["status"] == "done" and "1 proposals waiting" in t["summary"]
    assert [n["specialist"] for n in t["nodes"]] == ["Gathering", "Reviewing", "Finding patterns", "Organizing", "Proposals"]


def test_two_occurrences_are_not_enough():
    _turns()
    obs = [dict(DECK_OBS[0], evidence=DECK_OBS[0]["evidence"][:2])]
    out = dreaming.run(since=0, call=_fake(obs))
    assert out["patterns"] == [] and out["proposals"] == []


def test_an_accepted_note_is_a_dreaming_version_even_after_memory_changed():
    _turns()
    out = dreaming.run(since=0, call=_fake(DECK_OBS))
    args = json.loads([a for a in control.pending() if a["tool"] == "apply_dream"][0]["args_json"])
    memory.remember_now("Reports cite the Library first", "workspace")          # memory changes before the person accepts
    got = dreaming.apply(args)
    assert got["ok"]
    text = memory._read("MEMORY.md")
    assert "Keep decks to twelve slides or fewer." in text and "Reports cite the Library first" in text
    assert memory.versions("MEMORY.md")[0]["author"] == "dreaming"


def test_forgotten_and_already_known_notes_are_not_proposed():
    _turns()
    memory.forget("twelve slides")
    assert dreaming.run(since=0, call=_fake(DECK_OBS))["proposals"] == []


def test_a_recurring_papercut_is_offered_for_triage():
    for _ in range(3):
        papercuts.file("page reader", "read a page", "its text", "the site answered 403")
    out = dreaming.run(since=0, call=_fake([]))
    cut = [p for p in out["patterns"] if p["type"] == "papercut"]
    assert cut and cut[0]["occurrences"] == 3
    args = json.loads([a for a in control.pending() if a["tool"] == "apply_dream"][0]["args_json"])
    assert dreaming.apply(args)["triaged"] == cut[0]["papercut"]


STALE_TURNS = [("tr_000000000011", "conv_c", "No, decks are twelve slides now, not thirty", "Made a 30-slide deck."),
               ("tr_000000000012", "conv_c", "Again, twelve slides, the thirty-slide rule is old", "Revised to 30 slides."),
               ("tr_000000000013", "conv_d", "Stop making thirty slides, twelve is the rule", "Here are 30 slides.")]


def _stale_obs(note):
    return [{"kind": "stale_note", "summary": "The thirty-slide note no longer holds", "note": note,
             "evidence": [{"trace": "tr_000000000011", "quote": "decks are twelve slides now, not thirty"},
                          {"trace": "tr_000000000012", "quote": "the thirty-slide rule is old"},
                          {"trace": "tr_000000000013", "quote": "Stop making thirty slides"}]}]


def test_a_note_recent_turns_contradict_is_retired_as_a_version():
    """The talk: dreaming also cuts what no longer holds. A retirement needs the same prevalence as an addition, names a
    note memory holds now, and is applied as a version authored by dreaming."""
    memory.remember_now("Make decks thirty slides long by default", "memory")
    for tr, conv, said, reply in STALE_TURNS:
        store.save_transcript(tr, conv, memory.OWNER, said, [], reply, "answered", 3.0)
    out = dreaming.run(since=0, call=_fake(_stale_obs("Make decks thirty slides long by default")))
    assert [p["type"] for p in out["patterns"]] == ["retire"]
    args = json.loads([a for a in control.pending() if a["tool"] == "apply_dream"][0]["args_json"])
    got = dreaming.apply(args)
    assert got["ok"] and "thirty slides" not in memory._read("MEMORY.md")
    assert memory.versions("MEMORY.md")[0]["author"] == "dreaming"


def test_a_stale_note_memory_does_not_hold_is_dropped():
    for tr, conv, said, reply in STALE_TURNS:
        store.save_transcript(tr, conv, memory.OWNER, said, [], reply, "answered", 3.0)
    out = dreaming.run(since=0, call=_fake(_stale_obs("Always write reports in French for every reader")))
    assert out["observations"] == [] and out["proposals"] == []


def test_dreaming_reads_only_the_turns_of_the_person_whose_memory_it_changes():
    """The talk: a dreaming job attaches only the transcripts that share the memory store's permissions."""
    _turns()
    store.save_transcript("tr_000000000099", "conv_z", "someone_else", "Make the deck ninety slides", [], "ok", "answered", 3.0)
    turns, _cuts, _failed = dreaming.gather(memory.OWNER, 0)
    assert "tr_000000000099" not in {t["trace"] for t in turns} and len(turns) == 4
    other, _c, _f = dreaming.gather("someone_else", 0)
    assert [t["trace"] for t in other] == ["tr_000000000099"]


def test_one_reviewer_per_conversation():
    """The talk's dreaming pass runs one subagent per session: a batch never mixes conversations."""
    turns = [{"trace": f"t{i}", "conversation": c} for i, c in enumerate(["a", "a", "b", "a", "c", "c", "c"])]
    got = dreaming.by_conversation(turns, size=2)
    assert [[t["conversation"] for t in b] for b in got] == [["a", "a"], ["a"], ["b"], ["c", "c"], ["c"]]


def _merge_call(merged, keep_separate=False):
    def call(model, system, messages, ledger, **kw):
        if system == dreaming.MERGE_SYSTEM:
            return json.dumps({"merged": merged, "keep_separate": keep_separate}), None, None
        return json.dumps({"observations": []}), None, None
    return call


def test_overlapping_notes_are_merged_into_one_as_a_version():
    """The talk: dreaming organizes; duplicates that disagree become one note, the newer one winning."""
    memory.remember_now("Keep decks to twelve slides for the retail leadership team", "memory")
    memory.remember_now("Keep decks to fifteen slides for the retail leadership team", "memory")
    memory.remember_now("Cite Reddit posts by subreddit name", "memory")
    store.save_transcript("tr_m1", "conv_m", memory.OWNER, "hello", [], "hi", "answered", 1.0)
    out = dreaming.run(since=0, call=_merge_call("Keep decks to fifteen slides for the retail leadership team"))
    merges = [p for p in out["patterns"] if p["type"] == "merge"]
    assert len(merges) == 1 and len(merges[0]["notes"]) == 2
    args = json.loads([a for a in control.pending() if a["tool"] == "apply_dream"][0]["args_json"])
    got = dreaming.apply(args)
    held = memory.entries("MEMORY.md")
    assert got["ok"] and len(held) == 2 and any("fifteen slides" in h and "merged from 2 notes" in h for h in held)
    assert not any("twelve slides" in h for h in held) and any("subreddit" in h for h in held)
    assert memory.versions("MEMORY.md")[0]["author"] == "dreaming"


def test_a_merge_that_invents_content_is_dropped():
    memory.remember_now("Keep decks to twelve slides for the retail leadership team", "memory")
    memory.remember_now("Keep decks to fifteen slides for the retail leadership team", "memory")
    store.save_transcript("tr_m2", "conv_m", memory.OWNER, "hello", [], "hi", "answered", 1.0)
    out = dreaming.run(since=0, call=_merge_call("Always open every deck with a provocative customer anecdote from Walmart executives"))
    assert not [p for p in out["patterns"] if p["type"] == "merge"]


def test_template_notes_about_different_things_are_not_merged():
    """27 Nov, live: nine notes 'The recording "X" is transcribed and held in engagement "Y" as source Sn' share a
    template, not a subject; word overlap alone grouped all nine."""
    notes = [f'The recording "clip{i}.mp4" ({i}:00) is transcribed and held in the engagement "Recordings check" as source S{i} '
             f'(source: conversation, 2026-11-25)' for i in range(1, 4)]
    assert dreaming.overlap_clusters(notes) == []
    same = ['Keep decks to 12 slides for "Retail leadership" (source: conversation, 2026-11-20)',
            'Keep decks to 15 slides for "Retail leadership" (source: conversation, 2026-11-26)']
    assert dreaming.overlap_clusters(same) == [same]


def test_a_merge_must_keep_the_names_and_the_newest_numbers():
    memory.remember_now('Keep decks to 12 slides for "Retail leadership"', "memory")
    memory.remember_now('Keep decks to 15 slides for "Retail leadership"', "memory")
    store.save_transcript("tr_m3", "conv_m", memory.OWNER, "hello", [], "hi", "answered", 1.0)
    dropped = dreaming.run(since=0, call=_merge_call("Keep decks to 15 slides for the leadership team"))   # loses the name
    assert not [p for p in dropped["patterns"] if p["type"] == "merge"]
    kept = dreaming.run(since=0, call=_merge_call('Keep decks to 15 slides for "Retail leadership"'))       # newer number wins
    assert [p for p in kept["patterns"] if p["type"] == "merge"]
