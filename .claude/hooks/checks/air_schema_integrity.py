"""air_schema_integrity — validate an ArtifactAIR against the WS-0 contract.

Dependency-free structural validation (mirrors services/artifactAirService.ts validateAir). The TS type is
authoritative; this check is the runtime gate. RAMPED ENFORCEMENT: when the AIR's qualityReport.shadowMode is
true (default pre-migration), failures are REPORTED but do not block; when a path is migrated and shadowMode is
false, any failure BLOCKS. See plan Part VI (AIR enforcement is ramped, not flag-day).
"""
from __future__ import annotations

import re
from typing import Any

AIR_VERSION = "hic-air-2026-06-30"
_POINTER_RE = re.compile(r"#c\d+$", re.IGNORECASE)

# D12 (2026-07-01): evidence grounding-collapse floor — mirrors services/artifactAirService.ts
# MIN_WELLFORMED_RATIO. Pointer well-formedness is a RATIO, not all-or-nothing: pre-migration corpus
# pages legitimately lack structured `sources:` frontmatter, so 100% well-formed is unrealizable until the
# D3 re-chunk. Block only below this floor (genuine grounding collapse); warn otherwise. Raise toward 0.9
# after the corpus re-chunk populates sources.
MIN_WELLFORMED_RATIO = 0.10


def _pointer_well_formed(p: dict) -> bool:
    ptr = p.get("pointer") or ""
    srcs = p.get("sources") or []
    has_named = isinstance(srcs, list) and any(isinstance(s, dict) and (s.get("sourceName") or "").strip() for s in srcs)
    return bool(ptr) and bool(_POINTER_RE.search(ptr)) and has_named


def check(target: Any, ctx: dict | None = None) -> dict:
    """target: the parsed AIR dict. Returns {ok, blocking, failures[], warnings[], severity}.

    Two tiers (mirrors TS validateAir): STRUCTURAL failures (airVersion / ids / objective / renderPlan)
    always block when not shadow; evidence well-formedness is a RATIO that blocks only below
    MIN_WELLFORMED_RATIO (grounding collapse) and is otherwise a warning.
    """
    failures: list[str] = []
    warnings: list[str] = []
    if not isinstance(target, dict):
        return {"ok": False, "blocking": True, "severity": "block", "failures": ["AIR is not an object"], "warnings": []}

    qr = target.get("qualityReport") or {}
    shadow = qr.get("shadowMode", True) is not False

    # STRUCTURAL contract — a real AIR always satisfies these.
    if target.get("airVersion") != AIR_VERSION:
        failures.append(f"airVersion mismatch: {target.get('airVersion')!r} (want {AIR_VERSION})")
    for key in ("runId", "artifactId", "artifactType", "trigger"):
        if not target.get(key):
            failures.append(f"missing {key}")

    obj = target.get("objective") or {}
    if not obj.get("userObjective"):
        failures.append("missing objective.userObjective")

    rp = target.get("renderPlan") or {}
    if "imageSlots" not in rp or "density" not in rp:
        failures.append("renderPlan missing imageSlots/density")

    # EVIDENCE well-formedness as a RATIO (see MIN_WELLFORMED_RATIO).
    ledger = target.get("evidenceLedger")
    if not isinstance(ledger, list):
        failures.append("evidenceLedger missing or not a list")
    elif ledger:
        bad = [i for i, p in enumerate(ledger) if not (isinstance(p, dict) and _pointer_well_formed(p))]
        ratio = (len(ledger) - len(bad)) / len(ledger)
        if ratio < MIN_WELLFORMED_RATIO:
            failures.append(
                f"evidence grounding collapse: {round(ratio * 100)}% well-formed "
                f"({len(bad)}/{len(ledger)} pointers not well-formed; floor {round(MIN_WELLFORMED_RATIO * 100)}%)"
            )
        elif bad:
            warnings.append(
                f"{len(bad)}/{len(ledger)} evidence pointer(s) not well-formed "
                f"(no named source: pre-migration source-lag): idx {bad[:8]}"
            )

    ok = True if shadow else (len(failures) == 0)
    return {
        "ok": ok,
        "blocking": (not shadow) and len(failures) > 0,
        "severity": "review" if shadow else "block",
        "shadowMode": shadow,
        "failures": failures,
        "warnings": warnings,
    }
