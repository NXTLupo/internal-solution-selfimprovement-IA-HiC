#!/usr/bin/env python3
"""Deterministic AIR scorer (2026-06-16). Scores an Artifact Intermediate
Representation (see .claude/skills/_shared/air.schema.json) on COGNITION signals,
not format symptoms. Output is a numeric vector consumed by the SkillOpt
self-improvement loop (held-out artifact scoring), NOT a Stop-hook blocker.

Usage:  score_artifact.py air.json      (or pipe AIR JSON on stdin)
Origin: nxt-consulting-artifact-architect proposal; converged onto HiC AIR schema.
"""
import json, sys, re

ACTION_VERB = re.compile(
    r"\b(build|connect|prove|reduce|increase|shift|sequence|prioritize|fund|test|"
    r"retire|create|accelerate|stabilize|consolidate|own|replace|merge|unblock|"
    r"standardize|migrate|decommission)\b", re.I)
# A title that is a topic label, not a conclusion (heuristic).
TOPIC_TITLE = re.compile(r"^(overview|introduction|the landscape|key findings|"
                         r"recommendations|roadmap|capability gap|strategic recommendation|"
                         r"the path forward|next steps|background|context)\b", re.I)


def words(s): return len(re.findall(r"\b\w+\b", s or ""))


def main():
    data = json.load(open(sys.argv[1], encoding="utf-8")) if len(sys.argv) > 1 else json.load(sys.stdin)
    s = {"evidence_count": 0, "external_evidence_pct": 0.0, "inference_labeled": 0,
         "slides": 0, "action_title_rate": 0.0, "topic_titles": 0,
         "missing_claim_links": 0, "repeated_role_runs": 0,
         "spine_complete": False, "warnings": []}

    ledger = data.get("evidence_ledger", []) or []
    claim_ids = {e.get("claim_id") for e in ledger if isinstance(e, dict)}
    s["evidence_count"] = len(claim_ids)
    ext = sum(1 for e in ledger if isinstance(e, dict) and str(e.get("source_type", "")).startswith(("external", "social", "benchmark")))
    s["external_evidence_pct"] = round(ext / max(1, len(ledger)), 2)
    s["inference_labeled"] = sum(1 for e in ledger if isinstance(e, dict) and e.get("kind") == "inference")

    spine = data.get("insight_hierarchy", {}) or {}
    s["spine_complete"] = all(spine.get(k) for k in ("situation", "complication", "root_cause", "strategic_choice", "implication"))

    slides = (data.get("render_plan", {}) or {}).get("slides", []) or []
    s["slides"] = len(slides)
    action = 0
    roles = []
    for sl in slides:
        title = sl.get("title", "") or ""
        if ACTION_VERB.search(title):
            action += 1
        if TOPIC_TITLE.match(title.strip()):
            s["topic_titles"] += 1
        for cid in sl.get("claim_ids", []) or []:
            if cid not in claim_ids:
                s["missing_claim_links"] += 1
        roles.append(sl.get("slide_role"))
        if words(json.dumps(sl)) > 180:
            s["warnings"].append(f"slide {sl.get('slide_id')} may exceed template density")
    s["action_title_rate"] = round(action / max(1, len(slides)), 2)
    for i in range(len(roles) - 2):
        if roles[i] and roles[i] == roles[i + 1] == roles[i + 2]:
            s["repeated_role_runs"] += 1

    if s["evidence_count"] < 3:
        s["warnings"].append("low evidence count (<3 linked claims)")
    if s["external_evidence_pct"] < 0.5 and len(ledger) > 0:
        s["warnings"].append("external evidence below 50% floor")
    if not s["spine_complete"]:
        s["warnings"].append("insight_hierarchy spine incomplete")
    print(json.dumps(s, indent=2))


if __name__ == "__main__":
    main()
