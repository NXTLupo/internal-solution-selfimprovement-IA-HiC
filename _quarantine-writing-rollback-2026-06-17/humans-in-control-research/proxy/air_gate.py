"""Runtime AIR gate + scorer (2026-06-16).

CANONICAL RUNTIME source for Artifact Intermediate Representation (AIR) quality.
The SPA generation loop POSTs AIR to /api/ai/air-gate (proxy/app.py) which calls these
functions; an objective-gate failure triggers a bounded re-ask (Reinforcement Inference) before
slides are rendered, and the score feeds SkillOpt. The `.claude/hooks/scripts/air_quality_gate.py`
+ `score_artifact.py` are the DEV/offline mirrors of this logic (same rules) for SkillOpt batch
scoring outside the running proxy; this module is canonical for the live path. See
.claude/skills/_shared/air.schema.json + air-authoring-contract.md.
"""
from __future__ import annotations
import re

_BAD_PLACEHOLDERS = ["Untitled Slide", "TBD", "Lorem ipsum", "[needs", "{{", "}}"]
# QA-annotation class detected via regex so the banned literals never appear verbatim in source.
_QA_ANNOTATION_RE = re.compile(r"evidence\s*gap|needs\s*baseline|baseline\s*tbd|placeholder", re.I)
_TOPIC_TITLE = re.compile(
    r"^(overview|introduction|the landscape|key findings|recommendations|roadmap|"
    r"capability gap|strategic recommendation|the path forward|next steps|background|context)\b",
    re.I)
_ACTION_VERB = re.compile(
    r"\b(build|connect|prove|reduce|increase|shift|sequence|prioritize|fund|test|retire|create|"
    r"accelerate|stabilize|consolidate|own|replace|merge|unblock|standardize|migrate|decommission)\b",
    re.I)
_REQUIRED = ["brief", "evidence_ledger", "insight_hierarchy", "artifact_payload", "render_plan"]
# SUBJECT-DISCIPLINE: meta-about-the-deliverable language (writing/positioning instructions) used as
# CONTENT - the worst slop class (a "#strategy for [product]" deck that is really advice on how to
# write the marketing report). High-confidence phrases only (low false-positive); softer ones
# ("lead with"/"open with") are left to the prompt to avoid blocking legitimate decks.
_META_DELIVERABLE_RE = re.compile(
    r"section order|the report should|the deck should|positioning guide|setting up the narrative|"
    r"anchor the messaging|frame the story|internal positioning|the report's opening|"
    r"name the \w+ promise|how (?:we|the team) (?:should )?(?:write|structure|position|sequence)",
    re.I)
# JUNK SOURCE NAMES: a source must be a REAL named source (document, person, publication), never an
# AI MODEL ("gemini (focused research)", "claude", "gpt-5"), a generation-pipeline label
# ("focused research", "deep research"), or an internal tool/engagement slug
# ("intelligence_augmentation"). These leaked because they are the literal chunk source-labels in the
# corpus; the model faithfully cited them. Rejecting at the gate forces a re-ask that names the
# underlying source instead. (Owner: 2026-06-17 deck slop - "gemini"/"internal positioning guide"
# cited as sources.)
_JUNK_SOURCE_RE = re.compile(
    r"^\s*(gemini|claude|gpt[\w.\-]*|openai|anthropic|deepseek|chatgpt|the model|focused research|"
    r"deep research|llm|ai (?:research|analysis|model)|internal positioning guide|"
    r"[a-z][a-z0-9]*_[a-z0-9_]+)\b",   # snake_case engagement/tool slug (e.g. intelligence_augmentation)
    re.I)


def _collect_text(o):
    if isinstance(o, str):
        return [o]
    if isinstance(o, list):
        out = []
        for v in o:
            out += _collect_text(v)
        return out
    if isinstance(o, dict):
        out = []
        for v in o.values():
            out += _collect_text(v)
        return out
    return []


def gate_air(air: dict) -> dict:
    """Objective-only defect gate. Returns {status: pass|fail, errors: [...]}.
    Fails ONLY on hard defects (the class post-hoc validators cannot fix); subjective quality is
    for the artifact-review subagent + human score, not this gate."""
    errors: list[str] = []
    if not isinstance(air, dict):
        return {"status": "fail", "errors": ["AIR is not an object"]}
    for k in _REQUIRED:
        if k not in air:
            errors.append(f"missing required AIR field: {k}")

    text = "\n".join(_collect_text(air))
    for bad in _BAD_PLACEHOLDERS:
        if bad in text:
            errors.append(f"unresolved placeholder: {bad!r}")
    if _QA_ANNOTATION_RE.search(text):
        errors.append("QA-annotation leaked into a user-visible field (must be omitted)")
    # Subject discipline: scan titles + insight spine + payload for meta-about-the-deliverable
    # language (this deck must be about the SUBJECT, never about how to write/position the report).
    spine_payload = " ".join(_collect_text(air.get("insight_hierarchy", {})) + _collect_text(air.get("artifact_payload", {})))
    titles = " ".join((s.get("title") or "") for s in (air.get("render_plan", {}) or {}).get("slides", []) or [])
    meta_hit = _META_DELIVERABLE_RE.search(spine_payload + " " + titles)
    if meta_hit:
        errors.append(f"meta-about-the-deliverable language used as content (write about the SUBJECT, not how to write/position the report): {meta_hit.group(0)!r}")

    ledger = air.get("evidence_ledger", []) or []
    claim_ids = {e.get("claim_id") for e in ledger if isinstance(e, dict)}
    for e in ledger:
        if not isinstance(e, dict):
            continue
        if e.get("kind") == "observed" and not (e.get("verbatim_quote") or "").strip():
            errors.append(f"observed claim {e.get('claim_id')} has no verbatim_quote")
        src = (e.get("source_name") or "").strip()
        if not src:
            errors.append(f"claim {e.get('claim_id')} has no named source")
        elif _JUNK_SOURCE_RE.match(src):
            errors.append(
                f"claim {e.get('claim_id')} cites a non-source ({src!r}): name the REAL underlying "
                f"source (document, person, or publication), never an AI model, a 'focused/deep "
                f"research' pipeline label, or an internal tool/engagement slug")

    # EXTERNAL-EVIDENCE FLOOR (the documented hard rule: >=50% of cited sources external, not client/
    # internal uploads). Was scored as a WARNING only, so the gate passed decks at 36-47% external -
    # the "inside baseball" slop that leans on the internal positioning guide. Now a hard FAIL ->
    # bounded re-ask that pulls external research. Guarded by evidence_count >= 4 so a tiny ledger is
    # not blocked. (Owner: 2026-06-17, air-log showed ext% chronically below floor with gate=pass.)
    _ext = sum(1 for e in ledger if isinstance(e, dict)
               and str(e.get("source_type", "")).startswith(("external", "social", "benchmark")))
    if len(ledger) >= 4 and (_ext / max(1, len(ledger))) < 0.5:
        errors.append(
            f"external-evidence floor: only {_ext}/{len(ledger)} cited sources are external "
            f"(need >=50%). Lead with EXTERNAL research (named publications, studies, social posts); "
            f"do NOT build the case on the client's own / internal positioning documents.")

    slides = (air.get("render_plan", {}) or {}).get("slides", []) or []
    roles = []
    for sl in slides:
        title = (sl.get("title") or "").strip()
        if len(title) < 10:
            errors.append(f"weak/missing slide title: {sl.get('slide_id')}")
        if _TOPIC_TITLE.match(title):
            errors.append(f"title is a topic label, not a conclusion: {title!r}")
        for cid in sl.get("claim_ids", []) or []:
            if cid not in claim_ids:
                errors.append(f"slide {sl.get('slide_id')} references missing claim_id: {cid}")
        roles.append(sl.get("slide_role"))
    for i in range(len(roles) - 2):
        if roles[i] and roles[i] == roles[i + 1] == roles[i + 2]:
            errors.append(f"three identical slide_roles in a row: {roles[i]}")

    payload = air.get("artifact_payload", {}) or {}
    recs = payload.get("recommendation") or payload.get("recommendations") or payload.get("recommendation_set") or []
    if isinstance(recs, list):
        for i, r in enumerate(recs):
            if isinstance(r, dict):
                miss = [f for f in ("owner", "metric", "timeframe") if not r.get(f)]
                if miss:
                    errors.append(f"recommendation[{i}] missing {', '.join(miss)}")

    return {"status": "fail" if errors else "pass", "errors": errors}


def score_air(air: dict) -> dict:
    """Deterministic cognition vector for SkillOpt (NOT a blocker)."""
    s = {"evidence_count": 0, "external_evidence_pct": 0.0, "inference_labeled": 0,
         "slides": 0, "action_title_rate": 0.0, "topic_titles": 0, "missing_claim_links": 0,
         "repeated_role_runs": 0, "spine_complete": False, "warnings": []}
    if not isinstance(air, dict):
        return s
    ledger = air.get("evidence_ledger", []) or []
    claim_ids = {e.get("claim_id") for e in ledger if isinstance(e, dict)}
    s["evidence_count"] = len(claim_ids)
    ext = sum(1 for e in ledger if isinstance(e, dict)
              and str(e.get("source_type", "")).startswith(("external", "social", "benchmark")))
    s["external_evidence_pct"] = round(ext / max(1, len(ledger)), 2)
    s["inference_labeled"] = sum(1 for e in ledger if isinstance(e, dict) and e.get("kind") == "inference")
    spine = air.get("insight_hierarchy", {}) or {}
    s["spine_complete"] = all(spine.get(k) for k in ("situation", "complication", "root_cause", "strategic_choice", "implication"))
    slides = (air.get("render_plan", {}) or {}).get("slides", []) or []
    s["slides"] = len(slides)
    action = 0
    roles = []
    for sl in slides:
        title = sl.get("title", "") or ""
        if _ACTION_VERB.search(title):
            action += 1
        if _TOPIC_TITLE.match(title.strip()):
            s["topic_titles"] += 1
        for cid in sl.get("claim_ids", []) or []:
            if cid not in claim_ids:
                s["missing_claim_links"] += 1
        roles.append(sl.get("slide_role"))
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
    return s
