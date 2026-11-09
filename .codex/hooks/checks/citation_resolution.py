"""citation_resolution — WS-A gate. Rendered output must cite REAL named sources, never a provider bucket,
a single false-primary, or a leaked raw pointer.

Fires on the three credibility failures the WS-A per-chunk-sources fix targets:
  1. provider-bucket attribution: "(Source: gemini ...)", "gemini (focused research)", "Source: openai", etc.
  2. false-primary synthesis: the old "Dakota +15 sources" pattern (one source falsely credited for many claims).
  3. leaked raw chunk pointers: "articles/x.md#c3" reaching a rendered surface.
Accepts an AIR dict (scans its serialized text) or a raw string. Objective defect -> BLOCK.
"""
from __future__ import annotations

import json
import re
from typing import Any

_PROVIDER_BUCKET = re.compile(
    r"\(\s*sources?\s*:\s*(gemini|openai|deepseek|anthropic|claude|gpt)\b[^)]*\)"
    r"|gemini\s*\(\s*focused\s+research\s*\)"
    r"|\bsource\s*:\s*(gemini|openai|deepseek)\b",
    re.IGNORECASE,
)
_FALSE_PRIMARY = re.compile(r"\+\s*\d+\s+sources?\b", re.IGNORECASE)
_LEAKED_POINTER = re.compile(r"[\w./\\-]+\.md#c\d+", re.IGNORECASE)


def _as_text(target: Any) -> str:
    if isinstance(target, str):
        return target
    try:
        return json.dumps(target, ensure_ascii=False)
    except Exception:
        return str(target)


def check(target: Any, ctx: dict | None = None) -> dict:
    text = _as_text(target)
    failures: list[str] = []

    bucket = _PROVIDER_BUCKET.findall(text)
    if bucket:
        failures.append(f"{len(bucket)} provider-bucket citation(s) (e.g. 'gemini (focused research)') - resolve to the REAL source via the chunk's sources: field")
    fp = _FALSE_PRIMARY.findall(text)
    if fp:
        failures.append(f"{len(fp)} false-primary '+N sources' label(s) - a synthesis must name its sources (\"Synthesis of A, B, C\"), never credit one for many")
    leaked = _LEAKED_POINTER.findall(text)
    if leaked:
        failures.append(f"{len(leaked)} leaked raw chunk pointer(s) (e.g. {leaked[0]}) - resolveManifestPointers must swap these for named sources")

    return {
        "ok": len(failures) == 0,
        "blocking": len(failures) > 0,
        "severity": "block" if failures else "ok",
        "failures": failures,
    }
