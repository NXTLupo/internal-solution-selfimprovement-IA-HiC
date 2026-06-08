#!/usr/bin/env python
"""validate_cached_selection_honored.py — Stop hook (guardrail).

Dispatched by the Hook Bus (`.claude/hooks/scripts/dispatch_validators.py`)
on every #themes / #personas / #recommendations / #strategy emission. Reads
the engagement's manifest, checks the user's Knowledge Library selection,
and REJECTS the deliverable if the model regenerated items from scratch
instead of honoring the user's curation.

Architecture position:
  - SKILL (theme-analyst, recommendation-architect, persona-architect)
    instructs the model to tag every emission with source: cached|extended|new
  - WIKI (loadGenerationContext) reads engagement.manifest.cached_selection
    and injects PRIOR CACHED SELECTION block into the model's system prompt
  - This HOOK enforces the floor: ≥60% of the user's selected ids must appear
    as source: cached or source: extended
  - SUBAGENT (per-deliverable auditor) extends rubric with
    cached_selection_coverage_pct dim
  - SELF-IMPROVEMENT: rejection appends to hook-rejection-log.md; recurring
    rejections become candidate skill-edit interventions for the epoch
    proposer

Closes Gap 1 from the 2026-06-06 architecture audit: the user curated 360
themes / 506 items in the KL, but only socialSubreddits was consumed by
generators. The other 4 fields silently dropped. This hook is the last line
of defense — if the contract isn't honored end-to-end, this rejects.

Exit codes:
  0 — pass (no cached_selection set in manifest, OR coverage ≥60%, OR no
      deliverable in the assistant message that this hook validates)
  2 — reject (coverage <60%; structured rejection emitted as JSON)
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
SESSIONS_BASE = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "sessions"
ENGAGEMENTS_BASE = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "engagements"
USER_SELECTION_PATH = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "user-selections" / "active.json"

# 2026-06-06 — NO FLOORS. User explicit: every selected cached item MUST
# appear in the emission as source=cached or source=extended. 100% coverage.
# A "floor" of anything less is a silent omission of user curation. Set to
# 100 so any drop triggers rejection.
COVERAGE_FLOOR_PCT = 100.0


def _read_user_level_selection() -> dict | None:
    """Read the user-level KL selection store. This is the PRIMARY source
    of truth (selection follows the user across goal changes). Returns None
    if the file is absent or unreadable; the hook then falls back to the
    engagement manifest snapshot."""
    if not USER_SELECTION_PATH.is_file():
        return None
    try:
        data = json.loads(USER_SELECTION_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict) and not data.get("_uncommitted"):
            return data
    except Exception:
        pass
    return None


def _read_manifest(engagement_slug: str) -> dict | None:
    """Read manifest from EITHER the engagements wiki path OR the sessions
    path. Both are valid manifest locations in HiC (sessions is per-run,
    engagements is the cross-run home). Sessions takes precedence."""
    for base in (SESSIONS_BASE, ENGAGEMENTS_BASE):
        p = base / engagement_slug / "manifest.json"
        if p.is_file():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                continue
    return None


def _extract_engagement_slug(text: str, payload: dict) -> str | None:
    """Best-effort engagement slug extraction. Check payload first (the
    dispatcher passes through the original Stop payload), then look for a
    slug pattern in the transcript itself."""
    if isinstance(payload, dict):
        for k in ("engagement_slug", "engagement", "session_slug"):
            v = payload.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
    # Look for a deliverable=<hashtag> tagged trace turn that mentions engagement
    m = re.search(r'engagement[=:"\'\s]+([a-z0-9][-a-z0-9]{4,80})', text or "", re.IGNORECASE)
    if m:
        return m.group(1)
    return None


def _is_relevant_deliverable(text: str) -> tuple[bool, str]:
    """Returns (is_relevant, deliverable_tag). The hook only runs when the
    emission is a themes / personas / recommendations / strategy output —
    those are the four deliverables whose skills carry the cached-selection
    contract (per the 2026-06-06 SKILL.md updates)."""
    t = (text or "").lower()
    if "themecluster" in t or "template=theme-cluster" in t or "template=theme-spotlight" in t or '#themes' in t:
        return (True, "#themes")
    if "template=persona-card" in t or '#personas' in t or '#persona' in t:
        return (True, "#personas")
    if "concepts_defensible_consensus" in t or "concepts_non_obvious_bets" in t or '#recommendations' in t:
        return (True, "#recommendations")
    if '#strategy' in t and "rumelt" in t:
        return (True, "#strategy")
    return (False, "")


def _extract_emitted_source_tags(text: str) -> list[str]:
    """Pull every `"source": "cached"|"extended"|"new"` tag from the emitted
    JSON. The skills' new contract requires this field on every item; if
    none are present, the model entirely ignored the cached-selection
    contract."""
    return re.findall(r'"source"\s*:\s*"(cached|extended|new)"', text or "")


def _append_rejection_log(record: dict) -> None:
    """Best-effort JSONL append for epoch-proposer mining."""
    log = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "hook-rejection-log.md"
    try:
        log.parent.mkdir(parents=True, exist_ok=True)
        with open(log, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass


def main() -> int:
    # Parse Stop payload from stdin
    try:
        raw = sys.stdin.read()
        payload: Any = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    text = ""
    if isinstance(payload, dict):
        text = (payload.get("output") or payload.get("text") or "")
        if not text and payload.get("transcript_path") and os.path.isfile(payload["transcript_path"]):
            try:
                lines = Path(payload["transcript_path"]).read_text(encoding="utf-8").splitlines()
                for line in reversed(lines):
                    try:
                        entry = json.loads(line)
                    except Exception:
                        continue
                    if entry.get("role") == "assistant" or entry.get("type") == "assistant":
                        c = entry.get("content") or ""
                        if isinstance(c, list):
                            text = "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
                        elif isinstance(c, str):
                            text = c
                        break
            except Exception:
                pass
    elif isinstance(payload, str):
        text = payload

    if not text:
        return 0

    # Only validate relevant deliverables
    is_rel, deliverable = _is_relevant_deliverable(text)
    if not is_rel:
        return 0

    # 2026-06-06 (architectural correction): read user-level store FIRST.
    # KL selection is user-level, not engagement-bound. The engagement
    # manifest is a snapshot, not the source of truth.
    cached_sel: dict | None = _read_user_level_selection()

    # Fallback: legacy engagement-manifest path (only if no user-level store
    # exists yet, e.g. on engagements that were curated before this fix).
    if not cached_sel:
        slug = _extract_engagement_slug(text, payload if isinstance(payload, dict) else {})
        if slug:
            manifest = _read_manifest(slug)
            if manifest and isinstance(manifest.get("cached_selection"), dict):
                cached_sel = manifest["cached_selection"]

    if not isinstance(cached_sel, dict):
        return 0  # user did not curate; nothing to validate
    slug = (cached_sel.get("source_engagement_slug") or "active-user-selection")

    selected_theme_ids = cached_sel.get("theme_cluster_ids") or []
    selected_engagements = cached_sel.get("engagement_slugs") or []
    selected_total = len(selected_theme_ids) + len(selected_engagements)
    if selected_total == 0:
        return 0  # user opened KL but selected nothing

    # Count source tags in the emission
    source_tags = _extract_emitted_source_tags(text)
    cached_count = sum(1 for t in source_tags if t in ("cached", "extended"))
    new_count = sum(1 for t in source_tags if t == "new")
    total_tags = len(source_tags)

    if total_tags == 0:
        # Model ignored the contract entirely (no source field emitted at all)
        reason = (
            f"Cached-selection contract IGNORED: the user curated "
            f"{selected_total} item(s) via the Knowledge Library, but the "
            f"emitted {deliverable} deliverable does NOT carry the required "
            f"`source: cached|extended|new` field on any item. "
            f"Per .claude/skills/<skill>/SKILL.md §N (Cached-selection "
            f"contract), every emitted item MUST be tagged. Engagement: {slug}."
        )
        _append_rejection_log({
            "ts_ms": int(__import__("time").time() * 1000),
            "deliverable": deliverable,
            "engagement_slug": slug,
            "validator": "validate_cached_selection_honored.py",
            "fail_reason": "no_source_tags",
            "selected_items": selected_total,
            "emitted_tags": 0,
        })
        print(json.dumps({"ok": False, "block": True, "reason": reason}))
        return 2

    # Compute coverage — relative to selected items, not relative to emission size
    # (the user cares about whether THEIR selection was honored, not whether
    # most emitted items were cached).
    coverage_pct = (cached_count / max(1, selected_total)) * 100.0

    if coverage_pct < COVERAGE_FLOOR_PCT:
        missing = selected_total - cached_count
        reason = (
            f"Cached-selection coverage INCOMPLETE: {cached_count}/{selected_total} "
            f"selected item(s) carried forward as source=cached|extended "
            f"({coverage_pct:.1f}%). {missing} selected id(s) are silently missing. "
            f"NO FLOORS, NO OMISSIONS: every item the user explicitly curated in "
            f"the Knowledge Library MUST appear in the emission as source=cached "
            f"or source=extended. Re-emit with EVERY selected id present. New "
            f"themes the corpus reveals go in as source=new IN ADDITION to "
            f"(not in place of) the cached ones. Engagement: {slug}, "
            f"deliverable: {deliverable}, new items emitted: {new_count}."
        )
        _append_rejection_log({
            "ts_ms": int(__import__("time").time() * 1000),
            "deliverable": deliverable,
            "engagement_slug": slug,
            "validator": "validate_cached_selection_honored.py",
            "fail_reason": "incomplete_coverage_no_floors_allowed",
            "coverage_pct": coverage_pct,
            "selected_items": selected_total,
            "cached_count": cached_count,
            "new_count": new_count,
            "missing_count": missing,
        })
        print(json.dumps({"ok": False, "block": True, "reason": reason}))
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
