"""WS-A A3 (2026-10-31, plan agent-stack-shared-memory-skills-uplift): SkillOpt trains METHOD, never the contract.

run-skillopt.py protects the YAML frontmatter and EVERY SLOW_UPDATE_START/END block (the old check protected only
the first pair), and the GEPA pool refuses a skill that declares no protected block. Pure functions plus one
refusal path; no network, no optimizer call."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os

import pytest

_HERE = os.path.dirname(os.path.abspath(__file__))
_CANDIDATES = [os.path.join(_HERE, "..", "scripts", "run-skillopt.py"),          # container: /app/scripts (mounted)
               os.path.join(_HERE, "..", "..", "scripts", "run-skillopt.py")]    # host: humans-in-control-research/scripts


def _load():
    for p in _CANDIDATES:
        if os.path.isfile(p):
            spec = importlib.util.spec_from_file_location("run_skillopt_under_test", p)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    pytest.skip("run-skillopt.py not reachable from this test location")


SKILL = """---
name: demo
description: Demo skill.
version: "1.0"
---

# Demo

## You Are

A method paragraph the proposer may rewrite.

<!-- SLOW_UPDATE_START -->
## Output Contract

Emit JSON with fields a, b, c.
<!-- SLOW_UPDATE_END -->

## Methodology

Step one. Step two.

<!-- SLOW_UPDATE_START -->
## Hard rules

Never invent a source.
<!-- SLOW_UPDATE_END -->
"""


def test_every_block_and_the_frontmatter_are_protected():
    m = _load()
    spans = m.protected_regions(SKILL)
    assert len(spans) == 3                      # frontmatter + two blocks
    assert len(m.slow_update_blocks(SKILL)) == 2
    assert m.in_protected_region(SKILL, "Emit JSON with fields a, b, c.")
    assert m.in_protected_region(SKILL, "Never invent a source.")          # the SECOND block: the old check missed it
    assert m.in_protected_region(SKILL, "description: Demo skill.")       # frontmatter
    assert not m.in_protected_region(SKILL, "Step one. Step two.")
    assert not m.in_protected_region(SKILL, "A method paragraph the proposer may rewrite.")


def test_apply_edit_refuses_protected_targets_and_allows_method_edits():
    m = _load()
    out, ok, why = m.apply_edit(SKILL, {"op": "replace", "target": "Never invent a source.", "content": "Sources optional."})
    assert not ok and "protected" in why and out == SKILL
    out, ok, why = m.apply_edit(SKILL, {"op": "replace", "target": "Step one. Step two.", "content": "Step one. Check. Step two."})
    assert ok and why is None and "Step one. Check. Step two." in out


def test_pool_refuses_a_skill_without_a_protected_block(tmp_path, capsys):
    m = _load()
    skill = tmp_path / "SKILL.md"
    skill.write_text("---\nname: open\ndescription: x\n---\n\n## Output Contract\n\nAnything goes.\n", encoding="utf-8")
    rollouts = tmp_path / "rollouts.json"
    rollouts.write_text(json.dumps([{"id": "r1", "output": "x", "score": 0.1}]), encoding="utf-8")
    args = argparse.Namespace(skill=str(skill), rollouts=str(rollouts), kind="strategy-slide", pool=4, epochs=1, budget=2,
                              minibatch=2, out_dir=str(tmp_path), skill_id=None, score_mode="text", live_model="x", budget_usd=1.0)
    with pytest.raises(SystemExit) as exc:
        m.main_pool(args)
    assert exc.value.code == 3
    assert "REFUSED" in capsys.readouterr().err
