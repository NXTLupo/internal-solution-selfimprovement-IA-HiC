#!/usr/bin/env python3
"""skillopt_trajectory_miner.py — SkillOpt trajectory analysis (2026-05-26)

Reads rollouts from hic-workspace/sessions/_journey-rollouts/ + feedback
signals from hic-workspace/wiki/feedback/, mines patterns where user
behavior signals a deliverable quality miss (rejected edits, low ratings,
manual rewrites), and emits proposed_edits.json files into
hic-workspace/skillopt/proposals/{batch-id}/.

The proposals are then audited by the `skillopt-validation-gate` subagent
(shipped 2026-05-26) before any of them land in the skill library. This
script is the upstream miner — the gate is the downstream filter.

Designed to run on a /loop weekly cadence. Idempotent: skips rollouts
that have already been mined (tracked via .mined-rollouts.txt).

Usage:
  python skillopt_trajectory_miner.py [--batch-id YYYY-MM-DD]
                                       [--limit N]
                                       [--workspace /path/to/hic-workspace]
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


def find_workspace(start: Path) -> Optional[Path]:
    """Walk up from start looking for hic-workspace/."""
    p = start.resolve()
    for _ in range(8):
        candidate = p / "hic-workspace"
        if candidate.is_dir():
            return candidate
        if p.parent == p:
            break
        p = p.parent
    return None


def load_mined_set(workspace: Path) -> set[str]:
    """Track which rollout ids have already been processed."""
    track_file = workspace / "skillopt" / ".mined-rollouts.txt"
    if not track_file.exists():
        return set()
    return {line.strip() for line in track_file.read_text(encoding="utf-8").splitlines() if line.strip()}


def append_mined(workspace: Path, ids: list[str]) -> None:
    track_file = workspace / "skillopt" / ".mined-rollouts.txt"
    track_file.parent.mkdir(parents=True, exist_ok=True)
    with track_file.open("a", encoding="utf-8") as f:
        for i in ids:
            f.write(i + "\n")


def load_rollouts(workspace: Path, already_mined: set[str], limit: int) -> list[dict]:
    """Yield rollout records the miner hasn't seen yet."""
    rollout_dir = workspace / "sessions" / "_journey-rollouts"
    if not rollout_dir.is_dir():
        return []
    out: list[dict] = []
    for f in sorted(rollout_dir.glob("*.json")):
        if f.stem in already_mined:
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            data["_rollout_file"] = f.name
            data["_rollout_id"] = f.stem
            out.append(data)
        except Exception as e:
            print(f"[miner] skipping malformed rollout {f.name}: {e}", file=sys.stderr)
        if len(out) >= limit:
            break
    return out


def load_feedback_signals(workspace: Path) -> list[dict]:
    """Read aggregated feedback signals from wiki/feedback/_index.json
    plus per-engagement msg_*.jsonl files."""
    feedback_dir = workspace / "wiki" / "feedback"
    if not feedback_dir.is_dir():
        return []
    signals: list[dict] = []
    index_file = feedback_dir / "_index.json"
    if index_file.exists():
        try:
            data = json.loads(index_file.read_text(encoding="utf-8"))
            if isinstance(data, list):
                signals.extend(data)
            elif isinstance(data, dict) and isinstance(data.get("signals"), list):
                signals.extend(data["signals"])
        except Exception:
            pass
    # Per-engagement signal logs
    for jsonl in feedback_dir.rglob("msg_*.jsonl"):
        try:
            for line in jsonl.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    signals.append(json.loads(line))
                except Exception:
                    continue
        except Exception:
            continue
    return signals


def _to_instinct(p: dict) -> dict:
    """ECC-adopted instinct schema (2026-07-01): enrich a raw proposal with confidence / trigger /
    domain / source_repo so the validation gate + applier reason about it as a confidence-scored
    behavioral instinct (not just an edit diff), and so clustering can group related instincts.
    confidence rises with severity AND with attribution breadth (independent sources = more trust)."""
    sev = int(p.get("severity") or 3)
    n_src = len(p.get("source_rollouts") or []) + len(p.get("source_feedback_ids") or [])
    conf = min(0.95, 0.30 + 0.11 * sev + 0.05 * min(n_src, 6))
    q = dict(p)
    q["confidence"] = round(conf, 2)
    q["trigger"] = p.get("pattern") or "unspecified"          # the situation that fires the instinct
    q["domain"] = p.get("skill_id") or "(infer)"              # the skill/area it governs
    q["source_repo"] = "hic-workspace/sessions/_journey-rollouts"
    return q


def cluster_instincts(proposals: list[dict]) -> list[dict]:
    """ECC /evolve-style clustering (2026-07-01): group instincts by (domain, trigger) so N fragmented
    proposals for the same skill + situation consolidate into ONE higher-level proposal, with unioned
    attribution, max confidence, and every member summary preserved (nothing lost). This is what keeps
    the batch small + coherent BEFORE it reaches the validation gate (whose check-8 blocks bulk /
    duplicate / contradictory batches). Sorted strongest-first by confidence x cluster_size."""
    clusters: dict[tuple, dict] = {}
    for p in proposals:
        key = (p.get("domain"), p.get("trigger"))
        c = clusters.get(key)
        if not c:
            c = dict(p, cluster_size=1, cluster_members=[p.get("proposed_diff_summary", "")])
            clusters[key] = c
        else:
            c["cluster_size"] += 1
            c["confidence"] = max(c.get("confidence", 0), p.get("confidence", 0))
            c["severity"] = max(c.get("severity", 0), p.get("severity", 0))
            c["source_rollouts"] = list(dict.fromkeys((c.get("source_rollouts") or []) + (p.get("source_rollouts") or [])))
            c["source_feedback_ids"] = list(dict.fromkeys((c.get("source_feedback_ids") or []) + (p.get("source_feedback_ids") or [])))
            c["cluster_members"].append(p.get("proposed_diff_summary", ""))
    out = list(clusters.values())
    out.sort(key=lambda x: (x.get("confidence", 0) * x.get("cluster_size", 1)), reverse=True)
    return out


def classify_pattern(rollouts: list[dict], signals: list[dict]) -> list[dict]:
    """Apply pattern templates to the trajectory data. Each pattern returns
    a proposal dict shaped for the validation gate:
      {
        skill_id: 'persona-architect',
        source_rollouts: ['journey_abc123'],
        source_feedback_ids: ['feedback_xyz'],
        proposed_diff: '...',
        rationale: '...',
        severity: 1-5
      }
    """
    proposals: list[dict] = []

    # PATTERN 1 — Deliverables where the user heavily edited the same field
    # across >=3 rollouts. The constraint-extractor already flags these for
    # auto-approval; the miner proposes a SKILL.md amendment that bakes the
    # constraint into the skill itself, not just the prompt context.
    field_edits: dict[tuple[str, str], list[str]] = {}
    for s in signals:
        if not isinstance(s, dict):
            continue
        deliverable = s.get("deliverable_type") or s.get("deliverable") or ""
        section = s.get("section") or s.get("field") or ""
        if not deliverable or not section:
            continue
        signal_id = s.get("id") or s.get("signal_id") or f"sig_{s.get('timestamp', '')}"
        field_edits.setdefault((deliverable, section), []).append(signal_id)
    for (deliverable, section), sig_ids in field_edits.items():
        if len(sig_ids) < 3:
            continue
        skill_id = {
            "personas": "persona-architect",
            "gap_analysis": "gap-analysis-evaluator",
            "roadmap": "roadmap-builder",
            "recommendations": "recommendation-architect",
            "themes": "theme-analyst",
            "strategy": "strategy-author",
            "competitive": "competitive-analyst",
            "tech_audit": "tech-audit-inspector",
            "tech_architecture": "tech-arch-generator",
            "prd": "prd-compiler",
            "journey_map": "service-blueprint-mapper",
        }.get(deliverable, None)
        if not skill_id:
            continue
        proposals.append({
            "skill_id": skill_id,
            "source_rollouts": [],
            "source_feedback_ids": sig_ids[:6],
            "proposed_diff_summary": (
                f"Add a SKILL.md rule that the {section} section of "
                f"{deliverable} deliverables must satisfy a domain-specific "
                f"constraint (user has edited this section {len(sig_ids)} "
                f"times across recent rollouts)."
            ),
            "rationale": (
                f"{len(sig_ids)} feedback signals on {deliverable}.{section} "
                f"in the last training window — pattern indicates the "
                f"current SKILL.md guidance for this section is producing "
                f"output that users routinely rewrite."
            ),
            "severity": 4,
            "pattern": "repeated_field_edits",
        })

    # PATTERN 2 — Rollouts with validation failures that recur on the same
    # field. These are quality-floor breaches that the SKILL.md should
    # pre-empt.
    failure_freq: dict[str, dict] = {}
    for r in rollouts:
        for f in (r.get("validation_failures") or []):
            if isinstance(f, str):
                key = f[:80]
                entry = failure_freq.setdefault(key, {"count": 0, "rollouts": []})
                entry["count"] += 1
                entry["rollouts"].append(r["_rollout_id"])
    for failure_key, info in failure_freq.items():
        if info["count"] < 3:
            continue
        proposals.append({
            "skill_id": "(infer-from-failure)",
            "source_rollouts": info["rollouts"][:6],
            "source_feedback_ids": [],
            "proposed_diff_summary": (
                f"Add an upfront constraint to the relevant SKILL.md that "
                f"would have prevented the validation failure: \"{failure_key}\""
            ),
            "rationale": (
                f"This validation failure has fired on {info['count']} "
                f"recent rollouts. The SKILL.md should specify the "
                f"constraint up-front rather than catching it post-hoc."
            ),
            "severity": 5,
            "pattern": "repeated_validation_failure",
        })

    # PATTERN 3 — User-edited Updated Slide / Updated Section patterns
    # captured by the existing constraint-extractor.
    updated_section_freq: dict[str, list[str]] = {}
    for s in signals:
        if not isinstance(s, dict):
            continue
        action = s.get("action") or s.get("constraint_text") or ""
        if isinstance(action, str) and action.startswith("Updated "):
            key = action[:100]
            updated_section_freq.setdefault(key, []).append(s.get("id") or "")
    for key, ids in updated_section_freq.items():
        if len(ids) < 5:
            continue
        proposals.append({
            "skill_id": "deck-composer",
            "source_rollouts": [],
            "source_feedback_ids": ids[:6],
            "proposed_diff_summary": (
                f"Add a render-time check matching the pattern: \"{key}\". "
                f"User has corrected this {len(ids)} times — bake the "
                f"correction into the skill rules."
            ),
            "rationale": (
                f"5+ user corrections on the same edit pattern. The skill "
                f"should produce the corrected form on first pass."
            ),
            "severity": 4,
            "pattern": "recurring_user_correction",
        })

    # ECC-adopted: stamp each raw proposal with the instinct schema, then cluster related instincts
    # into consolidated, confidence-ranked proposals before handing off to the validation gate.
    return cluster_instincts([_to_instinct(p) for p in proposals])


def write_proposals(workspace: Path, proposals: list[dict], batch_id: str) -> Path:
    """Write each proposal as its own .md file in the batch directory.
    The validation gate reads these and emits per-proposal verdict files."""
    batch_dir = workspace / "skillopt" / "proposals" / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)

    for idx, prop in enumerate(proposals, start=1):
        skill_id = prop["skill_id"].replace("(", "").replace(")", "").replace("-", "_")
        out_file = batch_dir / f"{idx:03d}-{skill_id}.md"
        members = prop.get("cluster_members") or []
        members_block = ""
        if len(members) > 1:
            members_block = "\n## Clustered members (consolidated by /evolve-style clustering)\n" + \
                "".join(f"- {m}\n" for m in members if m)
        body = (
            f"# Proposal: {prop['skill_id']} — {batch_id}\n\n"
            f"## Instinct\n"
            f"- Domain: {prop.get('domain', prop['skill_id'])}\n"
            f"- Trigger: {prop.get('trigger', prop['pattern'])}\n"
            f"- Confidence: {prop.get('confidence', 'n/a')}\n"
            f"- Cluster size: {prop.get('cluster_size', 1)}\n"
            f"- Source repo: {prop.get('source_repo', '(n/a)')}\n\n"
            f"## Source attribution\n"
            f"- Rollouts: {', '.join(prop['source_rollouts'][:6]) or '(none)'}\n"
            f"- Feedback signals: {', '.join(prop['source_feedback_ids'][:6]) or '(none)'}\n"
            f"- Pattern: {prop['pattern']}\n"
            f"- Severity: {prop['severity']}\n\n"
            f"## Proposed change\n{prop['proposed_diff_summary']}\n"
            f"{members_block}\n"
            f"## Trajectory analysis summary\n{prop['rationale']}\n"
        )
        out_file.write_text(body, encoding="utf-8")

    # Manifest for the validation-gate subagent (carries the instinct schema for check-8 batch curation)
    manifest = {
        "batch_id": batch_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "proposal_count": len(proposals),
        "patterns": sorted({p["pattern"] for p in proposals}),
        "instincts": [
            {"domain": p.get("domain"), "trigger": p.get("trigger"),
             "confidence": p.get("confidence"), "cluster_size": p.get("cluster_size", 1)}
            for p in proposals
        ],
        "status": "pending-gate-audit",
    }
    (batch_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return batch_dir


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-id", default=None,
                        help="Override the batch id (default: today's date in UTC)")
    parser.add_argument("--limit", type=int, default=200,
                        help="Max rollouts to process per pass")
    parser.add_argument("--workspace", default=None,
                        help="Path to hic-workspace/ (auto-detected if omitted)")
    args = parser.parse_args()

    workspace = Path(args.workspace) if args.workspace else find_workspace(Path.cwd())
    if not workspace or not workspace.is_dir():
        print("[miner] could not locate hic-workspace/ — pass --workspace explicitly", file=sys.stderr)
        return 2

    batch_id = args.batch_id or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    already = load_mined_set(workspace)
    rollouts = load_rollouts(workspace, already, args.limit)
    signals = load_feedback_signals(workspace)

    print(f"[miner] workspace={workspace}")
    print(f"[miner] batch_id={batch_id}")
    print(f"[miner] new rollouts: {len(rollouts)}  feedback signals: {len(signals)}  already mined: {len(already)}")

    proposals = classify_pattern(rollouts, signals)
    if not proposals:
        print("[miner] no patterns met the proposal threshold — exiting clean")
        return 0

    batch_dir = write_proposals(workspace, proposals, batch_id)
    append_mined(workspace, [r["_rollout_id"] for r in rollouts])

    print(f"[miner] wrote {len(proposals)} proposals to {batch_dir}")
    print(f"[miner] NEXT: run the skillopt-validation-gate subagent against {batch_dir} to audit before any edits land")
    return 0


if __name__ == "__main__":
    sys.exit(main())
