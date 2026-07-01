"""artifact_catalog_coverage — every artifact path resolves to a known catalog entry (none omitted).

Reads the canonical id set from services/artifactCatalog.ts (authoritative). At runtime it asserts an AIR's
artifactType is a known catalog id, so a directive can never silently slip through unrouted/uncatalogued.
This is the runtime half of the omission-proofing; the static half is services/artifactCatalogCoverage.test.ts
(which asserts the ARTIFACT_TPL template ids + the directive->skill map are all covered). Dependency-free.
"""
from __future__ import annotations

import os
import re
from typing import Any

_ID_RE = re.compile(r"\bid:\s*'([^']+)'")


def _repo_root() -> str:
    # .claude/hooks/checks/ -> repo root is three levels up
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(here, "..", "..", ".."))


def _catalog_ids() -> set[str]:
    path = os.path.join(_repo_root(), "humans-in-control-research", "services", "artifactCatalog.ts")
    try:
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
    except OSError:
        return set()
    # Only scan the ARTIFACT_CATALOG array region to avoid catching unrelated `id:` occurrences.
    start = src.find("export const ARTIFACT_CATALOG")
    region = src[start:] if start >= 0 else src
    return {m.group(1).strip().lower() for m in _ID_RE.finditer(region)}


def check(target: Any, ctx: dict | None = None) -> dict:
    """target: the parsed AIR dict. Fails (blocking) if artifactType is not a known catalog id."""
    ids = _catalog_ids()
    if not ids:
        return {"ok": True, "blocking": False, "severity": "review",
                "failures": ["could not read artifactCatalog.ts to load ids (skipped)"]}
    if not isinstance(target, dict):
        return {"ok": False, "blocking": True, "severity": "block", "failures": ["AIR is not an object"]}

    atype = str(target.get("artifactType") or "").strip().lower()
    trigger = str(target.get("trigger") or "").lstrip("#").rstrip("s").strip().lower()
    failures: list[str] = []
    if atype and atype not in ids and trigger not in ids:
        failures.append(
            f"artifactType {atype!r} (trigger {trigger!r}) is not in the artifact catalog ({len(ids)} known ids) "
            f"- add it to services/artifactCatalog.ts so it is routed + AIR-tracked, none omitted"
        )
    return {"ok": len(failures) == 0, "blocking": len(failures) > 0,
            "severity": "block" if failures else "ok", "failures": failures, "knownIds": len(ids)}
