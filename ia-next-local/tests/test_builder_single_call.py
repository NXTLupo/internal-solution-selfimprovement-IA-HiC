"""The single-call builders on the one engine (uplift plan 2026-11-23, WS-6): the deck (one long compose, one rewrite
when the asked-for sources are missing) and the study pages (one write, up to two top-ups below the floor) must send
the model exactly what they sent before the move (tests/fixtures/builder_golden_single.json, recorded from the old code
with BUILDER_GOLDEN_WRITE=1) and finish the same way."""
import json
import os

import pytest

from ia_next import deck, deckstudio, localstudy, providers, store
from test_requested_sources import _deck, _engagement

HERE = os.path.dirname(os.path.abspath(__file__))
GOLDEN = os.path.join(HERE, "fixtures", "builder_golden_single.json")


def _deck_scenario(monkeypatch, second_cites):
    eid = _engagement()
    sent = []

    def fake(model, system, messages, ledger, **kw):
        if kw.get("json_schema") in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG):
            sent.append({"system": system, "msg": messages[0]["content"].replace(eid, "<eid>"), "max_tokens": kw.get("max_tokens"),
                         "effort": kw.get("effort"), "schema": "long" if kw["json_schema"] is deckstudio.SCHEMA_LONG else "short"})
            return _deck(cite_posts=second_cites and len(sent) > 1), None, None
        return json.dumps({"titles": []}), None, None
    monkeypatch.setattr(providers, "claude", fake)
    tok = store.TURN.set({"request": "create a Northeastern deck of #slides on the latest themes on r/neu (reddit) about AI"})
    tid, _ = store.create_task(eid, "deck", {"audience": "Northeastern leadership", "outline": [], "brand": "nu"}, 3.0)
    store.TURN.reset(tok)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    return {"calls": sent, "status": t["status"], "error": (t["error"] or "").replace(eid, "<eid>"),
            "summary": (t["summary"] or "").replace(tid, "<tid>")}


WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"]
ITEM = lambda n: {"question": f"How do students reach an advisor in the {WORDS[n]} week?", "answer": "They book through the portal.",
                  "source_id": "S1", "quote": "Students book advising appointments through the online portal each term."}


def _study_scenario(monkeypatch):
    sent = []

    def fake(model, system, messages, ledger=None, **kw):
        sent.append({"system": system, "msg": messages[0]["content"], "max_tokens": kw.get("max_tokens"), "effort": kw.get("effort")})
        start = 4 * (len(sent) - 1)
        return json.dumps({"title": "Advising questions", "standfirst": "What students ask about advising.",
                           "items": [ITEM(start + i) for i in range(4 if len(sent) == 1 else 3)]}), providers.Usage("qwen", 1, 1, 0, 0.1), None
    monkeypatch.setattr(providers, "chat", fake)
    corpus = '<source id="S1" title="Advising handbook">Students book advising appointments through the online portal each term.</source>'
    out = localstudy.generate("faq", "nxt", "How students reach advising", corpus, {"S1": "Advising handbook"})
    return {"calls": sent, "counts": out["counts"], "short": out["short"], "data": json.loads(out["data"])}


def scenarios(monkeypatch):
    return {"deck_rewritten": _deck_scenario(monkeypatch, second_cites=True),
            "deck_not_shipped": _deck_scenario(monkeypatch, second_cites=False),
            "faq_topped_up": _study_scenario(monkeypatch)}


def test_the_single_call_builders_send_what_they_sent_before(monkeypatch):
    now = json.loads(json.dumps(scenarios(monkeypatch), sort_keys=True))
    if os.environ.get("BUILDER_GOLDEN_WRITE"):
        with open(GOLDEN, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(now, fh, indent=1, ensure_ascii=False, sort_keys=True)
        pytest.skip("golden written")
    old = json.load(open(GOLDEN, encoding="utf-8"))
    assert set(now) == set(old)
    for name in old:
        assert now[name] == old[name], name
    assert len(old["deck_rewritten"]["calls"]) == 2 and old["deck_not_shipped"]["status"] == "failed"
    assert len(old["faq_topped_up"]["calls"]) == 3                          # the write and both top-ups
