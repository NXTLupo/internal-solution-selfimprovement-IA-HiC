"""Every HiC data pack, and every external HiC source, reachable from IA Next research (2026-11-19). Before: only the
first 120 sources of the chosen packs were searched (379 of the retail pack's 499 never were), one slow batch threw
away a whole pack's results (the healthcare pack's 72 items were lost to a single timeout), HiC's sources outside every
pack were unreachable, and a pack was used only when the agent thought to name it. Now: every source of the chosen packs
is searched in tolerant batches, the person can pick packs in the composer (their choice wins), a fast model picks them
from the question otherwise, and the sources in no pack are searched on every run. No network: HiC and the models are
replaced."""
import json
import os
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import agent, config, hic, providers, store, studio  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    monkeypatch.setattr("ia_next.library.seed_sources", lambda *a, **k: [])
    yield


PACK_IDS = {"retail": [f"r{i}" for i in range(300)], "healthcare": [f"h{i}" for i in range(60)]}
REGISTRY = [{"id": "retail", "name": "Retail & Commerce", "kind": "industry", "industries": ["retail"], "description": "Retail.", "sourceCount": 300},
            {"id": "healthcare", "name": "Healthcare & Life Sciences", "kind": "industry", "industries": ["healthcare"],
             "description": "Hospitals, nurses.", "sourceCount": 60}]


def _fake_hic(calls, fail_batch_with=None):
    def call(method, path, timeout, **kw):
        calls.append((path, kw.get("params")))
        if path == "/api/source-packs":
            return {"packs": REGISTRY}
        if path.startswith("/api/source-packs/"):
            return {"sourceIds": PACK_IDS.get(path.rsplit("/", 1)[1], [])}
        if path == "/api/sources":
            return {"categories": {"News": {"sources": [{"id": s} for s in ["gdelt", "prnewswire_retail", "wayback_cdx"] + PACK_IDS["retail"][:3]]}}}
        if path == "/api/multi-search":
            ids = kw["params"]["sources"].split(",")
            if fail_batch_with and fail_batch_with in ids:
                raise hic.HicUnavailable("timed out")
            # most feeds return their latest, unrelated item; a few (and GDELT) match the query
            def item(sid):
                hit = sid == "gdelt" or sid.endswith("0")
                return {"title": f"Update from {sid}", "url": f"https://{sid}.example/a", "date": "2026-11-01",
                        "content": "retail loyalty programs personalization" if hit else "store hours this week"}
            return {"results": [{"source": sid, "items": [item(sid)]} for sid in ids]}
        raise AssertionError(path)
    return call


def test_every_source_of_the_chosen_packs_is_searched_and_one_failed_batch_is_skipped(monkeypatch):
    calls = []
    monkeypatch.setattr(hic, "_call", _fake_hic(calls, fail_batch_with="r100"))
    rep = {}
    items = hic.pack_items(["retail", "healthcare"], "retail loyalty programs personalization", keep=500, report=rep,
                           extra_ids=["gdelt"])
    searched = [p["sources"].split(",") for path, p in calls if path == "/api/multi-search"]
    assert sum(len(b) for b in searched) == 361 and max(len(b) for b in searched) == hic.PACK_BATCH   # no 120 cap
    assert rep["sources"] == 361 and rep["skipped"] == hic.PACK_BATCH and rep["skipped_batches"] == 1 and rep["searched"] == 361 - hic.PACK_BATCH
    assert any(x["pack"] == "general" for x in items) and items                                      # extra sources join
    assert not any("r100" in x["url"] for x in items)


def test_the_pack_search_fails_only_when_every_batch_fails(monkeypatch):
    def down(method, path, timeout, **kw):
        if path.startswith("/api/source-packs/"):
            return {"sourceIds": ["a", "b"]}
        raise hic.HicUnavailable("HiC is not running")
    monkeypatch.setattr(hic, "_call", down)
    monkeypatch.setitem(hic.PACKS, "x", "X")
    with pytest.raises(hic.HicUnavailable):
        hic.pack_items(["x"], "query")


def test_general_sources_are_the_registry_minus_every_pack(monkeypatch):
    monkeypatch.setattr(hic, "_call", _fake_hic([]))
    assert hic.general_source_ids() == ["gdelt", "prnewswire_retail"]        # archival lookups are not search sources


def test_the_fast_model_picks_packs_from_the_live_registry(monkeypatch):
    monkeypatch.setattr(hic, "_call", _fake_hic([]))
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen.update(model=model, msg=messages[0]["content"], schema=kw.get("json_schema"))
        return json.dumps({"packs": ["healthcare", "bogus", "healthcare"]}), None, None

    monkeypatch.setattr(providers, "claude", fake)
    assert hic.pick_packs("nurse staffing shortages at hospitals") == ["healthcare"]
    assert seen["model"] == config.SEATS["fast"]["secondary"] and "Healthcare & Life Sciences" in seen["msg"]
    assert seen["schema"]["properties"]["packs"]["items"]["enum"] == ["retail", "healthcare"]
    monkeypatch.setattr(hic, "_call", lambda *a, **k: (_ for _ in ()).throw(hic.HicUnavailable("down")))
    assert hic.pick_packs("nurse staffing") == []


def _research(monkeypatch, brief, picked=("healthcare",)):
    used = {}

    def fake_items(packs, query, keep=12, report=None, extra_ids=None, loose=()):
        used.update(packs=list(packs), extra=list(extra_ids or []))
        report.update(sources=100, searched=90, answered=40, skipped=10)
        return []

    monkeypatch.setattr(hic, "pack_items", fake_items)
    monkeypatch.setattr(hic, "general_source_ids", lambda: ["gdelt"])
    monkeypatch.setattr(hic, "pick_packs", lambda text, ledger=None: list(picked))
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("s", None, {"candidates": [{"groundingMetadata": {
        "groundingChunks": [{"web": {"uri": "https://example.org/x", "title": "example.org"}}]}}]}))
    monkeypatch.setattr(studio, "_fetch", lambda uri: ("Hospitals report nurse staffing shortages. " * 20, uri, "Staffing"))
    monkeypatch.setattr("ia_next.secondbrain.reuse", lambda *a, **k: [])
    monkeypatch.setattr("ia_next.secondbrain.archive_all", lambda *a, **k: {})
    monkeypatch.setattr("ia_next.secondbrain.known", lambda *a, **k: False)
    eid = store.create_engagement("Nursing", "o")
    path, summary, _ = studio.research_lead(eid, dict({"goal": "nurse staffing", "scope": "US hospitals", "audience": "a"}, **brief),
                                            providers.Ledger(limit_usd=1))
    return used, summary, json.load(open(path, encoding="utf-8"))["data_packs"]


def test_the_persons_packs_win_then_the_agents_then_the_fast_models(monkeypatch):
    # field test 23 Nov (E3): a pack the person selected that contributes nothing stops the run and says why; it used to
    # be reported as searched while web pages silently took its place
    with pytest.raises(providers.ProviderError) as stop:
        _research(monkeypatch, {"selected_packs": ["workforce"], "packs": ["retail"]})
    assert "the data pack you selected (Workforce & Careers) returned nothing on this subject" in str(stop.value)
    assert "40 of 90 sources answered the search \"nurse staffing US hospitals\"" in str(stop.value)
    used, summary, rec = _research(monkeypatch, {"packs": ["retail"]})
    assert used["packs"] == ["retail"] and rec["chosen_by"] == "the agent" and used["extra"] == ["gdelt"]
    assert "0 kept from HiC data packs (Retail & Commerce 0; chosen by the agent; 90 of 100 sources searched, 40 returned items, 10 skipped" in summary
    used, summary, rec = _research(monkeypatch, {})
    assert used["packs"] == ["healthcare"] and rec["chosen_by"] == "IA Next" and rec["coverage"]["answered"] == 40
    used, summary, rec = _research(monkeypatch, {}, picked=())
    assert used["packs"] == [] and used["extra"] == ["gdelt"] and "no pack fitted" in summary   # general sources still run


def test_packs_chosen_in_the_composer_reach_the_agent_and_every_brief(monkeypatch):
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen["text"] = messages[-1]["content"]
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": "ok"}])

    agent.turn(agent.new_conversation(), "research nurse staffing", call=fake, packs=["healthcare", "nope"])
    assert "Data packs the person selected for research: Healthcare & Life Sciences [healthcare]" in seen["text"]
    tok = store.TURN.set({"request": "r", "packs": ["healthcare"]})
    try:
        eid = store.create_engagement("e", "o")
        tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0)
    finally:
        store.TURN.reset(tok)
    assert store.get_task(tid)["brief"]["selected_packs"] == ["healthcare"]


def test_the_workspace_lists_hics_packs(monkeypatch):
    from fastapi.testclient import TestClient
    from ia_next import app as app_module
    monkeypatch.setattr(hic, "_call", _fake_hic([]))
    r = TestClient(app_module.app).get("/api/packs").json()
    assert r["available"] is True and [p["id"] for p in r["packs"]] == ["retail", "healthcare"] and r["general_sources"] == 2
    assert r["pack_sources"] == 3          # the registry's sources that sit in a pack (r0..r2), each counted once
    monkeypatch.setattr(hic, "_call", lambda *a, **k: (_ for _ in ()).throw(hic.HicUnavailable("down")))
    assert TestClient(app_module.app).get("/api/packs").json()["available"] is False
