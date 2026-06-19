#!/usr/bin/env python3
"""Objective AIR quality gate (2026-06-16). Fails ONLY on hard, objective defects -
the class our 350-phrase blocklist + post-processors cannot catch and should not try
to. Subjective quality (sharper frame, better synthesis) is for the artifact-review
subagent + human score, NOT this gate.

Reads AIR JSON on stdin. Exit 0 = pass, exit 2 = fail (with the defect list).
Origin: nxt-consulting-artifact-architect proposal; converged onto the HiC AIR schema.
"""
import json, re, sys

BAD_PLACEHOLDERS = ["Untitled Slide", "TBD", "Lorem ipsum", "[needs", "EVIDENCE GAP", "{{", "}}"]
TOPIC_TITLE = re.compile(r"^(overview|introduction|the landscape|key findings|recommendations|"
                         r"roadmap|capability gap|strategic recommendation|the path forward|"
                         r"next steps|background|context)\b", re.I)
REQUIRED = ["brief", "evidence_ledger", "insight_hierarchy", "artifact_payload", "render_plan"]
# Mirror of proxy/air_gate.py _META_DELIVERABLE_RE (keep in sync) - meta-about-the-deliverable
# language used as content (the artifact must be about its SUBJECT, never how to write/position it).
META_DELIVERABLE = re.compile(
    r"section order|the report should|the deck should|positioning guide|setting up the narrative|"
    r"anchor the messaging|frame the story|internal positioning|the report's opening|"
    r"name the \w+ promise|how (?:we|the team) (?:should )?(?:write|structure|position|sequence)",
    re.I)


def collect_text(o):
    if isinstance(o, str): return [o]
    if isinstance(o, list):
        out = []
        for v in o: out += collect_text(v)
        return out
    if isinstance(o, dict):
        out = []
        for v in o.values(): out += collect_text(v)
        return out
    return []


def main():
    raw = sys.stdin.read().strip()
    try:
        air = json.loads(raw)
    except Exception as e:
        print(json.dumps({"status": "fail", "errors": [f"invalid AIR json: {e}"]})); sys.exit(2)

    errors = []
    for k in REQUIRED:
        if k not in air:
            errors.append(f"missing required AIR field: {k}")

    text = "\n".join(collect_text(air))
    for bad in BAD_PLACEHOLDERS:
        if bad in text:
            errors.append(f"unresolved placeholder / QA annotation: {bad!r}")
    _meta = META_DELIVERABLE.search(text)
    if _meta:
        errors.append(f"meta-about-the-deliverable language used as content (write about the SUBJECT, not how to write/position the report): {_meta.group(0)!r}")

    ledger = air.get("evidence_ledger", []) or []
    claim_ids = {e.get("claim_id") for e in ledger if isinstance(e, dict)}
    # anything labeled Evidence must carry a verbatim quote
    for e in ledger:
        if isinstance(e, dict) and e.get("kind") == "observed" and not (e.get("verbatim_quote") or "").strip():
            errors.append(f"observed claim {e.get('claim_id')} has no verbatim_quote")
        if isinstance(e, dict) and not (e.get("source_name") or "").strip():
            errors.append(f"claim {e.get('claim_id')} has no named source")

    slides = (air.get("render_plan", {}) or {}).get("slides", []) or []
    roles = []
    for sl in slides:
        title = (sl.get("title") or "").strip()
        if len(title) < 10:
            errors.append(f"weak/missing slide title: {sl.get('slide_id')}")
        if TOPIC_TITLE.match(title):
            errors.append(f"title is a topic label, not a conclusion: {title!r}")
        for cid in sl.get("claim_ids", []) or []:
            if cid not in claim_ids:
                errors.append(f"slide {sl.get('slide_id')} references missing claim_id: {cid}")
        roles.append(sl.get("slide_role"))
    for i in range(len(roles) - 2):
        if roles[i] and roles[i] == roles[i + 1] == roles[i + 2]:
            errors.append(f"three identical slide_roles in a row: {roles[i]}")

    # recommendations must carry owner + metric + timeframe
    payload = air.get("artifact_payload", {}) or {}
    recs = payload.get("recommendation") or payload.get("recommendations") or payload.get("recommendation_set") or []
    if isinstance(recs, list):
        for i, r in enumerate(recs):
            if isinstance(r, dict):
                miss = [f for f in ("owner", "metric", "timeframe") if not r.get(f)]
                if miss:
                    errors.append(f"recommendation[{i}] missing {', '.join(miss)}")

    if errors:
        print(json.dumps({"status": "fail", "errors": errors}, indent=2)); sys.exit(2)
    print(json.dumps({"status": "pass", "errors": []}, indent=2))


if __name__ == "__main__":
    main()
