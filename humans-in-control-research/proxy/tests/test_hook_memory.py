"""WS-B B2 (2026-10-31): the Claude Code UserPromptSubmit hook recalls HiC memory. With the proxy unreachable it ranks
wiki/synthesis/memory-facts.json itself (salient-term overlap) and injects only the relevant facts. Host-only: the
hook lives in .claude/hooks, which the proxy container does not mount."""
import importlib.util
import json
import os

import pytest

HOOK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".claude", "hooks", "scripts",
                                    "inject_active_constraints_and_patterns.py"))


def _load():
    if not os.path.isfile(HOOK):
        pytest.skip("hook not reachable from here")
    spec = importlib.util.spec_from_file_location("prompt_hook_under_test", HOOK)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_recall_falls_back_to_the_store_file_and_keeps_only_relevant_facts(tmp_path, monkeypatch):
    m = _load()
    facts = [
        {"id": "f1", "content": "Executive search firms adopt AI sourcing tools for candidate longlists", "category": "knowledge", "confidence": 0.9},
        {"id": "f2", "content": "Retail shoppers convert better through AI shopping assistants", "category": "knowledge", "confidence": 0.9},
    ]
    store = tmp_path / "memory-facts.json"
    store.write_text(json.dumps(facts), encoding="utf-8")
    monkeypatch.setattr(m, "FACTS_FILE", str(store))
    monkeypatch.setattr(m, "PROXY_URL", "http://127.0.0.1:9")          # nothing listens: the proxy path fails fast
    monkeypatch.setattr(m, "PATTERNS_FILE", str(tmp_path / "none.md"))
    monkeypatch.setattr(m, "RECORDS_FILE", str(tmp_path / "none.json"))
    monkeypatch.setattr(m, "CONSTRAINTS_FILE", str(tmp_path / "none2.md"))
    lines, source = m.recall_facts("How are executive search firms adopting AI sourcing for candidates?")
    assert source == "file" and len(lines) == 1 and "Executive search firms" in lines[0]
    payload = m.build_payload("How are executive search firms adopting AI sourcing for candidates?")
    assert "HIC MEMORY" in payload and "Retail shoppers" not in payload
    assert m.recall_facts("the of and") == ([], "")
