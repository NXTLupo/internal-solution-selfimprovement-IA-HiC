"""WS-B B1 (2026-10-31): the Python memory door (proxy/memory_store.py) is held to the SAME expected outputs as the
TS reference (services/memoryParity.test.ts) over evals/fixtures/memory-parity.json, plus the store's concurrency
contract (lock + atomic write)."""
from __future__ import annotations

import json
import os
import sys
import threading

import pytest

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(_HERE, "..")))

import memory_store as ms  # noqa: E402

_FIXTURES = [os.path.join("/evals", "fixtures", "memory-parity.json"),                       # container mount
             os.path.join(_HERE, "..", "..", "evals", "fixtures", "memory-parity.json")]      # host


def _doc():
    for p in _FIXTURES:
        if os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
    pytest.skip("memory-parity.json not reachable")


def _r10(x):
    return ms._js_round(x * 1e10) / 1e10


def compute(doc):
    now = doc["now"]
    I = doc["inputs"]

    def cfg(o=None):
        return {**ms.DEFAULT_CONFIG, **(o or {})}

    ev = ms.evict_to_capacity(I["evict"]["store"], cfg(), now)
    evh = ms.evict_to_capacity(I["evictHybrid"]["store"], cfg(I["evictHybrid"].get("cfg")), now)
    st = ms.apply_staleness_decisions(I["staleness"]["store"], I["staleness"]["decisions"], cfg(I["staleness"].get("cfg")), now)
    co = ms.apply_consolidation(I["consolidation"]["store"], I["consolidation"]["proposals"], cfg(), now)
    r_conf = ms.apply_reinforcement(I["reinforce"]["store"], I["reinforce"]["nominated"], I["reinforce"]["confirming"], now)
    r_silent = ms.apply_reinforcement(I["reinforce"]["store"], I["reinforce"]["nominated"], I["reinforce"]["silent"], now)
    life = ms.run_lifecycle_pass(I["lifecycle"]["store"], {**I["lifecycle"]["input"], "nowIso": now})
    return {
        "factId": [ms.fact_id(s) for s in I["factId"]],
        "admit": ms.admit_facts(I["admit"]["proposed"], I["admit"]["runId"], cfg(), now),
        "merge": ms.merge_facts(I["merge"]["store"], I["merge"]["incoming"]),
        "evict": {"kept": [f["id"] for f in ev["facts"]], "evicted": ev["evicted"], "shadowDisagreement": ev["shadowDisagreement"]},
        "evictHybrid": {"kept": [f["id"] for f in evh["facts"]], "evicted": evh["evicted"], "shadowDisagreement": evh["shadowDisagreement"]},
        "staleCandidates": [f["id"] for f in ms.select_stale_candidates(I["staleness"]["store"], cfg(I["staleness"].get("cfg")), now)],
        "staleness": st,
        "consolidation": co,
        "consolidationGroups": ms.select_consolidation_groups(I["consolidationGroups"]["store"], cfg(I["consolidationGroups"].get("cfg"))),
        "reinforceConfirmed": r_conf,
        "reinforceSilent": r_silent,
        "salient": [sorted(ms.salient_terms(t)) for t in I["salient"]],
        "select": [[{"id": r["fact"]["id"], "relevance": _r10(r["relevance"]), "score": _r10(r["score"])}
                    for r in ms.select_memory_facts(I["select"]["facts"], o, now=now)] for o in I["select"]["objectives"]],
        "lifecycle": {"facts": life["facts"], "report": life["report"]},
        "render": ms.render_facts_for_injection(I["render"]["facts"], I["render"]["maxChars"]),
    }


@pytest.mark.parametrize("key", ["factId", "admit", "merge", "evict", "evictHybrid", "staleCandidates", "staleness", "consolidation",
                                 "consolidationGroups", "reinforceConfirmed", "reinforceSilent", "salient", "select", "lifecycle", "render"])
def test_python_port_matches_the_ts_reference(key):
    doc = _doc()
    assert "expected" in doc, "run the TS reference with UPDATE_MEMORY_PARITY=1 first"
    got = json.loads(json.dumps(compute(doc)))
    assert got[key] == doc["expected"][key]


def test_mutate_store_is_atomic_under_concurrent_writers(tmp_path):
    path = str(tmp_path / "memory-facts.json")
    n = 24

    def admit(i):
        def fn(facts):
            res = ms.run_lifecycle_pass(facts, {"runId": f"run_{i}", "proposed": [{
                "content": f"Concurrent fact {i} about sourcing tools", "category": "knowledge", "confidence": 0.8,
                "scope": "engagement", "durability": "durable", "authority": "descriptive"}]})
            return res["facts"], res["report"]
        ms.mutate_store(path, fn)

    threads = [threading.Thread(target=admit, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    facts = ms.load_store(path)
    assert len(facts) == n                       # no admission lost to a racing writer
    assert not os.path.exists(path + ".lock")    # the lock is released
