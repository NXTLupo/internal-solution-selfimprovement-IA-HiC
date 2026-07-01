"""corpus_reuse_provenance — D8: fail SILENT cached reuse.

WS-C auto-reuses cached second-brain archives into a run's corpus (services/wikiCacheLoader.ts
loadCachedItemsByGoal). Each reused item is tagged source:'cached' + cachedProvenance {path, goalSimilarity}
so the reuse is DECLARED, never silent. This gate enforces that contract: every cached item in a run's
corpus MUST carry provenance. A cached item with no provenance is "silent reuse" — the deliverable leans on
prior-engagement data the run never disclosed, which breaks the evidence-audit trail.

Target: the run's corpus item list (or a dict with an `items`/`corpus` array). Mirrors the two-tier shape of
air_schema_integrity: structural absence of provenance BLOCKS (when not shadow); shadow reports only.
"""
from __future__ import annotations

from typing import Any


def _items(target: Any) -> list:
    if isinstance(target, list):
        return target
    if isinstance(target, dict):
        for k in ("items", "corpus", "corpusItems", "sources"):
            v = target.get(k)
            if isinstance(v, list):
                return v
    return []


def _is_cached(it: dict) -> bool:
    # WS-C fold marker: source == 'cached' (real uploads/connectors have other source values).
    return isinstance(it, dict) and str(it.get("source") or "").lower() == "cached"


def _has_provenance(it: dict) -> bool:
    p = it.get("cachedProvenance")
    return isinstance(p, dict) and bool(p.get("path"))


def check(target: Any, ctx: dict | None = None) -> dict:
    ctx = ctx or {}
    shadow = bool(ctx.get("shadowMode", False))
    items = _items(target)
    cached = [it for it in items if _is_cached(it)]
    silent = [it for it in cached if not _has_provenance(it)]

    failures: list[str] = []
    warnings: list[str] = []
    if silent:
        ids = [str((it or {}).get("id") or (it or {}).get("title") or "?")[:60] for it in silent[:8]]
        msg = f"{len(silent)}/{len(cached)} cached-reuse item(s) missing cachedProvenance (silent reuse): {ids}"
        (warnings if shadow else failures).append(msg)

    return {
        "ok": True if shadow else (len(failures) == 0),
        "blocking": (not shadow) and len(failures) > 0,
        "severity": "review" if shadow else "block",
        "shadowMode": shadow,
        "failures": failures,
        "warnings": warnings,
        # observability: how much of the corpus is reused vs fresh
        "cached_count": len(cached),
        "corpus_count": len(items),
    }
