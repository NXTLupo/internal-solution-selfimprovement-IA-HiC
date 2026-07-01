#!/usr/bin/env python3
"""HiC unified quality gate (WS-0) — one gate, scoped checks.

Replaces hook sprawl with a single dispatcher over independently-testable checks in ./checks/. Per the v2 plan
(Part IV), objective defects BLOCK (exit 2); judgment calls emit review findings (exit 0). Checks are added as
each workstream lands its feature; nothing here gates an absent feature.

Usage:
  python quality_gate.py --scope air --scope catalog <path-to-air.json>
  python quality_gate.py --scope air --scope catalog            # reads AIR JSON from stdin (hook mode)

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

from checks import air_schema_integrity, artifact_catalog_coverage, citation_resolution, mcp_tool_governance, corpus_reuse_provenance  # noqa: E402

SCOPES = {
    "air": air_schema_integrity.check,
    "catalog": artifact_catalog_coverage.check,
    "citations": citation_resolution.check,      # WS-A
    "mcp-governance": mcp_tool_governance.check,  # WS-J
    "corpus-reuse": corpus_reuse_provenance.check,  # D8 — fail silent cached reuse
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


def main() -> int:
    ap = argparse.ArgumentParser(description="HiC unified quality gate")
    ap.add_argument("--scope", action="append", default=[], help="check scope (repeatable)")
    ap.add_argument("target", nargs="?", help="path to an AIR JSON file (else stdin)")
    args = ap.parse_args()

    scopes = args.scope or list(SCOPES.keys())
    unknown = [s for s in scopes if s not in SCOPES]
    if unknown:
        print(json.dumps({"error": f"unknown scope(s): {unknown}", "known": list(SCOPES)}))
        return 1

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

    print(json.dumps({"gate": "hic-quality-gate", "blocking": any_block, "results": results}, indent=2))
    return 2 if any_block else 0


if __name__ == "__main__":
    sys.exit(main())
