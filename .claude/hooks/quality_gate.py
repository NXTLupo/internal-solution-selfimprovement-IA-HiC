#!/usr/bin/env python3
"""HiC unified quality gate (WS-0) — one gate, scoped checks.

Replaces hook sprawl with a single dispatcher over independently-testable checks in ./checks/. Per the v2 plan
(Part IV), objective defects BLOCK (exit 2); judgment calls emit review findings (exit 0). Checks are added as
each workstream lands its feature; nothing here gates an absent feature.

Usage:
  python quality_gate.py --scope air --scope catalog <path-to-air.json>
  python quality_gate.py --scope air --scope catalog            # reads AIR JSON from stdin (hook mode)
  python quality_gate.py --stop-hook --scope citations --scope editorial
        # Claude Code Stop hook: stdin is the Stop payload; the gate resolves `transcript_path`
        # to the last assistant text and runs the TEXT scopes on it (2026-10-01, plan Stage 5).

Scopes (WS-0 set; more land per workstream):
  air      -> checks.air_schema_integrity      (AIR contract; ramped shadow->block)
  catalog  -> checks.artifact_catalog_coverage (artifactType is a known catalog id; none omitted)

Future scopes (built with their workstream): citations, designer-grounding, corpus-reuse, epoch-gate,
source-diversity, figma-parity, pptx-native, mcp-tool-governance.
"""
from __future__ import annotations

import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from checks import air_schema_integrity, artifact_catalog_coverage, citation_resolution, mcp_tool_governance, corpus_reuse_provenance, editorial_quality  # noqa: E402

SCOPES = {
    "air": air_schema_integrity.check,
    "catalog": artifact_catalog_coverage.check,
    "citations": citation_resolution.check,      # WS-A
    "mcp-governance": mcp_tool_governance.check,  # WS-J
    "corpus-reuse": corpus_reuse_provenance.check,  # D8 — fail silent cached reuse
    "editorial": editorial_quality.check,        # E2 (2026-07-02) — deck-level writing gate
}


def _load_target(path: str | None) -> object:
    """Load the gate target. Prefer JSON (an AIR dict); fall back to the raw string so text-based checks
    (e.g. citations, run against rendered prose) work too. Never raises on non-JSON input."""
    if path:
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()
    raw = raw.strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw  # raw text target (e.g. rendered prose for the citations scope)


def _last_assistant_text(transcript_path: str) -> str:
    """The final assistant text in a Claude Code transcript (JSONL). Same extractor the
    stop_chat_antislop hook uses; a Stop payload carries the path, never the text."""
    text = ""
    try:
        with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                msg = entry.get("message") or {}
                if entry.get("type") != "assistant" and msg.get("role") != "assistant":
                    continue
                content = msg.get("content")
                if not isinstance(content, list):
                    continue
                parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
                joined = "\n".join(p for p in parts if p)
                if joined.strip():
                    text = joined
    except Exception:
        return ""
    return text


def main() -> int:
    ap = argparse.ArgumentParser(description="HiC unified quality gate")
    ap.add_argument("--scope", action="append", default=[], help="check scope (repeatable)")
    ap.add_argument("--stop-hook", action="store_true",
                    help="stdin is a Claude Code Stop payload; run the scopes on the last assistant text")
    ap.add_argument("target", nargs="?", help="path to an AIR JSON file (else stdin)")
    args = ap.parse_args()

    scopes = args.scope or list(SCOPES.keys())
    unknown = [s for s in scopes if s not in SCOPES]
    if unknown:
        print(json.dumps({"error": f"unknown scope(s): {unknown}", "known": list(SCOPES)}))
        return 1

    if args.stop_hook:
        try:
            payload = json.load(sys.stdin)
        except Exception:
            return 0
        if not isinstance(payload, dict) or payload.get("stop_hook_active"):
            return 0
        text = _last_assistant_text(str(payload.get("transcript_path") or ""))
        if len(text.strip()) < 40:
            return 0
        target: object = text
    else:
        try:
            target = _load_target(args.target)
        except (OSError, json.JSONDecodeError) as e:
            print(json.dumps({"error": f"could not load target: {e}"}))
            return 1

    results = {}
    any_block = False
    for s in scopes:
        try:
            r = SCOPES[s](target, {})
        except Exception as e:  # a check must never crash the gate
            r = {"ok": False, "blocking": False, "severity": "review", "failures": [f"check raised: {e}"]}
        results[s] = r
        if r.get("blocking"):
            any_block = True

    out = json.dumps({"gate": "hic-quality-gate", "blocking": any_block, "results": results}, indent=2)
    if args.stop_hook and any_block:
        # A Stop hook's exit-2 stderr is what the model reads back; stdout is discarded.
        sys.stderr.write(out + "\n")
    else:
        print(out)
    return 2 if any_block else 0


if __name__ == "__main__":
    sys.exit(main())
