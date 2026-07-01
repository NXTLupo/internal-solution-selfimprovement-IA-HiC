"""mcp_tool_governance — WS-J gate. A run's tool calls must stay within a signed, bounded tool pack.

Validates AIR.toolTrace (runTraceService ToolTraceStep: {toolName, toolPack, approved?}) against
config/mcp-tool-packs.json: every call names a known pack; the tool is in that pack's allowed set (or is
an approval-gated write/publish/delete tool WITH a recorded approval); no denied tool is called; per-context
tool budget not exceeded. Dependency-free (JSON, not yaml). An AIR with no toolTrace passes trivially - the
contract + enforcement primitive are established; enforcement bites once agents record toolPack in traces.
"""
from __future__ import annotations

import json
import os
from typing import Any


def _repo_root() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(here, "..", "..", ".."))


def _load_packs() -> dict:
    path = os.path.join(_repo_root(), "humans-in-control-research", "config", "mcp-tool-packs.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {p["id"]: p for p in data.get("packs", []) if isinstance(p, dict) and p.get("id")}
    except Exception:
        return {}


def check(target: Any, ctx: dict | None = None) -> dict:
    packs = _load_packs()
    if not packs:
        return {"ok": True, "blocking": False, "severity": "review",
                "failures": ["config/mcp-tool-packs.json missing or unreadable (skipped)"]}
    if not isinstance(target, dict):
        return {"ok": True, "blocking": False, "severity": "ok", "failures": []}

    steps = target.get("toolTrace") or []
    failures: list[str] = []
    per_pack_counts: dict[str, int] = {}
    for step in steps:
        if not isinstance(step, dict):
            continue
        tool = step.get("toolName", "")
        pack_id = step.get("toolPack", "")
        per_pack_counts[pack_id] = per_pack_counts.get(pack_id, 0) + 1
        if not pack_id or pack_id not in packs:
            failures.append(f"tool {tool!r} used with unknown/absent toolPack {pack_id!r}")
            continue
        pack = packs[pack_id]
        if tool in (pack.get("denied_tools") or []):
            failures.append(f"DENIED tool {tool!r} called (pack {pack_id})")
        elif tool in (pack.get("requires_human_approval") or []) and not step.get("approved"):
            failures.append(f"tool {tool!r} requires human approval (pack {pack_id}) but none recorded")
        elif tool not in (pack.get("allowed_tools") or []) and tool not in (pack.get("requires_human_approval") or []):
            failures.append(f"tool {tool!r} not in pack {pack_id} allowed set")
    for pack_id, n in per_pack_counts.items():
        cap = (packs.get(pack_id) or {}).get("max_tools_per_context")
        if isinstance(cap, int) and n > cap:
            failures.append(f"pack {pack_id} exceeded tool budget: {n} > {cap}")

    return {"ok": len(failures) == 0, "blocking": len(failures) > 0,
            "severity": "block" if failures else "ok", "failures": failures, "packs": len(packs)}
