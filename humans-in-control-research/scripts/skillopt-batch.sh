#!/usr/bin/env bash
# SkillOpt batch trainer - runs the full optimization loop for all Tier-1 skills.
#
# Usage:
#   bash scripts/skillopt-batch.sh [--dry-run] [--auto-promote] [--budget=N] [--epochs=N]
#   bash scripts/skillopt-batch.sh --promote-only --skill=<name> --candidate=<path> --skill-path=<path>
#
# Flow per skill:
#   1. Find SKILL.md path
#   2. Locate matching training rollouts
#   3. Run run-skillopt.py -> candidate SKILL.md
#   4. Run validate-candidate.py -> ACCEPT / REJECT  (rung 1-2 structural + hygiene checks)
#   5. ACCEPT -> write a PROPOSAL file:
#        hic-workspace/skillopt/proposals/<batch>/<skill>.proposal.json
#      The proposal is what the held-out gate (goldenSetRunner.compareReports / the
#      skillopt-validation-gate review) reads to produce a VERDICT file next to it:
#        hic-workspace/skillopt/proposals/<batch>/<skill>.verdict.json
#        {"verdict": "APPROVE", "discrimination_before": .., "discrimination_after": .., "golden_set_version": ..}
#   6. --auto-promote copies the candidate over the live SKILL.md ONLY when that verdict file
#      exists with "verdict": "APPROVE" AND the regression obligations are green. No verdict,
#      no cp. (2026-10-01, plan Stage 5.1, audit C6/C7: promotion used to be a bare `cp` after
#      a text-only validator; a rung-3 signal alone never writes a skill.)
#
# Scheduler: there is ONE. The proxy's disk-authoritative job counter (GET /api/epochs/status)
# enqueues the batch (POST /api/epochs/run-batch) when an epoch is due; see README-skillopt.md.
# The Task Scheduler XML / weekly cron wrapper were deleted (never registered).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HIC_DIR="$REPO_ROOT/humans-in-control-research"
# 2026-10-30 (WS-5 R3): the training set lives where this script can SEE it. Inside the proxy
# container that is /hic-workspace/skillopt/training (the workspace mount); on a dev host it is
# ../tmp/skillopt-training (what `npm run skillopt:build-training` writes). The old default
# /d/tmp/training existed on no machine, so every skill SKIPped. When the directory is empty the
# set is BUILT here from the AIR records, traces and the event sink (extract + build-training).
HIC_WORKSPACE="${HIC_WORKSPACE:-$HIC_DIR/hic-workspace}"
if [ -z "${TRAINING_DIR:-}" ]; then
  if [ -d "/hic-workspace" ]; then TRAINING_DIR="/hic-workspace/skillopt/training"; else TRAINING_DIR="$HIC_DIR/../tmp/skillopt-training"; fi
fi
OUT_DIR="${OUT_DIR:-${TMPDIR:-/tmp}/skillopt-batch-$(date +%Y%m%d-%H%M%S)}"
POOL="${SKILLOPT_POOL:-8}"
SCORE_MODE="${SKILLOPT_SCORE_MODE:-text}"
PROXY_BASE="${HIC_PROXY_BASE:-http://127.0.0.1:5012}"
# The proxy requires x-proxy-token on /api/* (auth on by default). The token is read from the runtime config
# the proxy publishes, never passed through the environment by the caller (2026-10-31).
PROXY_TOKEN="${HIC_PROXY_TOKEN:-}"
if [ -z "$PROXY_TOKEN" ]; then
  for _cfg in "${HIC_WORKSPACE:-/hic-workspace}/.runtime/config.json" "$HIC_DIR/hic-workspace/.runtime/config.json"; do
    if [ -f "$_cfg" ]; then PROXY_TOKEN="$(python -c "import json,sys;print((json.load(open(sys.argv[1])) or {}).get('proxyToken',''))" "$_cfg" 2>/dev/null)"; fi
    [ -n "$PROXY_TOKEN" ] && break
  done
fi
export HIC_PROXY_TOKEN="$PROXY_TOKEN"
BATCH_ID="${BATCH_ID:-$(basename "$OUT_DIR")}"
PROPOSALS_ROOT="${PROPOSALS_ROOT:-$HIC_DIR/hic-workspace/skillopt/proposals}"
PROPOSALS_DIR="$PROPOSALS_ROOT/$BATCH_ID"
DRY_RUN=0
AUTO_PROMOTE=0
PROMOTE_ONLY=0
BUDGET=4
EPOCHS=1
PO_SKILL=""
PO_CANDIDATE=""
PO_SKILL_PATH=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --auto-promote) AUTO_PROMOTE=1 ;;
    --promote-only) PROMOTE_ONLY=1 ;;
    --budget=*) BUDGET="${arg#--budget=}" ;;
    --epochs=*) EPOCHS="${arg#--epochs=}" ;;
    --skill=*) PO_SKILL="${arg#--skill=}" ;;
    --candidate=*) PO_CANDIDATE="${arg#--candidate=}" ;;
    --skill-path=*) PO_SKILL_PATH="${arg#--skill-path=}" ;;
    --pool=*) POOL="${arg#--pool=}" ;;
    --score-mode=*) SCORE_MODE="${arg#--score-mode=}" ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done
# In batch mode --skill= is a FILTER (the proxy's run-batch passes it; it used to be rejected as unknown).
ONLY_SKILLS="$PO_SKILL"

ensure_training_set() {
  # Build the training set when the directory has no rollouts (WS-5 R3).
  if ls "$TRAINING_DIR"/*-training.json >/dev/null 2>&1; then return 0; fi
  echo "  Training set missing at $TRAINING_DIR; building it from the workspace ($HIC_WORKSPACE)"
  local rollouts_dir="$TRAINING_DIR/../rollouts"
  mkdir -p "$TRAINING_DIR" "$rollouts_dir"
  PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/extract-rollouts.py" --workspace "$HIC_WORKSPACE" --out-dir "$rollouts_dir" --max-per-kind 60 || return 1
  PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/build-training-set.py" --real-rollouts-dir "$rollouts_dir" --out-dir "$TRAINING_DIR" \
    --kinds journey,blueprint,persona,gap-analysis,roadmap,recommendation,strategy-slide --feedback-base "$HIC_WORKSPACE/wiki/feedback" || return 1
}

set_canary() {
  # $1 = skill id, $2 = kind, $3 = candidate path. The SPA trials the candidate as a RunState instruction
  # override for this deliverable kind BEFORE the held-out gate lets it reach the skill file (WS-5 R5).
  python - "$PROXY_BASE" "$1" "$2" "$3" "$BATCH_ID" "$PROXY_TOKEN" <<'PY' 2>/dev/null || echo "  (canary not set: proxy unreachable)"
import json, sys, urllib.request
base, skill, kind, path, batch, tok = sys.argv[1:7]
text = open(path, "r", encoding="utf-8").read()
hdrs = {"Content-Type": "application/json"}
if tok: hdrs["x-proxy-token"] = tok
req = urllib.request.Request(f"{base}/api/epochs/canary", data=json.dumps({"skill_id": skill, "kind": kind, "candidate_path": path, "text": text, "batch_id": batch}).encode("utf-8"), headers=hdrs, method="POST")
with urllib.request.urlopen(req, timeout=15) as r:
    print("  CANARY set:", json.loads(r.read().decode("utf-8")).get("canary", {}).get("sha"))
PY
}

record_epoch() {
  # $1 = skill, $2 = kind, $3 = candidate, $4 = live path, $5 = verdict file. Appends the "## Epoch N" record the job
  # counter resets on and the SPA binds production outcomes to (/api/epochs/active), with its json block.
  local ledger="$HIC_WORKSPACE/wiki/synthesis/improvement-epochs.md"
  python - "$ledger" "$1" "$2" "$3" "$4" "$5" "$BATCH_ID" <<'PY'
import json, os, re, sys, datetime
ledger, skill, kind, candidate, live, verdict_file, batch = sys.argv[1:8]
text = open(ledger, "r", encoding="utf-8").read() if os.path.exists(ledger) else "# Improvement epochs\n"
ids = [int(m.group(1)) for m in re.finditer(r"^##\s+Epoch\s+(\d+)\s", text, re.M)]
eid = (max(ids) + 1) if ids else 1
try:
    v = json.load(open(verdict_file, "r", encoding="utf-8"))
except Exception:
    v = {}
stamp = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
rec = {"epoch_id": eid, "layer": "skill", "skill": skill, "file_path": live, "deliverable_class": "#" + kind.replace("strategy-slide", "slides").replace("-", ""),
       "candidate_path": candidate, "batch_id": batch, "hypothesis": str(v.get("reason") or "")[:300],
       "baseline_vector": {"held_out": v.get("discrimination_before")}, "target_dims": ["held_out"], "floor_dims": [],
       "discrimination_before": v.get("discrimination_before"), "discrimination_after": v.get("discrimination_after")}
block = f"\n\n## Epoch {eid} - {stamp} UTC\n\nSkill: `{live}` promoted from `{candidate}` (batch `{batch}`, verdict APPROVE).\n\n```json\n{json.dumps(rec, indent=2)}\n```\n"
with open(ledger, "a", encoding="utf-8") as f:
    f.write(block)
print(f"  EPOCH {eid} recorded in {ledger}")
PY
}

# ---------------------------------------------------------------------------
# Promotion gate (C6/C7). Returns 0 and copies ONLY when
#   $PROPOSALS_DIR/<skill>.verdict.json exists and carries "verdict": "APPROVE".
# Everything else (missing file, REJECT, HUMAN-REVIEW, malformed JSON) refuses.
# ---------------------------------------------------------------------------
verdict_of() {
  # $1 = verdict file. Prints the verdict string or nothing.
  python - "$1" <<'PY' 2>/dev/null
import json, sys
try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        v = json.load(f)
    print(str(v.get("verdict", "")).strip() if isinstance(v, dict) else "")
except Exception:
    print("")
PY
}

promote_candidate() {
  # $1 = skill name, $2 = candidate path, $3 = live SKILL.md path
  local skill="$1" candidate="$2" skill_path="$3"
  local verdict_file="$PROPOSALS_DIR/$skill.verdict.json"
  if [ ! -f "$candidate" ]; then
    echo "  PROMOTION REFUSED: candidate not found: $candidate"
    return 1
  fi
  if [ ! -f "$verdict_file" ]; then
    echo "  PROMOTION REFUSED: no verdict file at $verdict_file (the held-out gate has not ruled; a validator ACCEPT is not a verdict)"
    return 1
  fi
  local verdict
  verdict="$(verdict_of "$verdict_file")"
  if [ "$verdict" != "APPROVE" ]; then
    echo "  PROMOTION REFUSED: verdict is '${verdict:-unreadable}', not APPROVE ($verdict_file)"
    return 1
  fi
  cp "$candidate" "$skill_path"
  echo "  PROMOTED to $skill_path (verdict APPROVE from $verdict_file)"
  # the epoch record (counter reset + production attribution) and the canary is retired: the skill file carries it now
  record_epoch "$skill" "${KINDS[$skill]:-strategy-slide}" "$candidate" "$skill_path" "$verdict_file" || true
  python - "$PROXY_BASE" "$PROXY_TOKEN" <<'PY' 2>/dev/null || true
import sys, urllib.request
req = urllib.request.Request(f"{sys.argv[1]}/api/epochs/canary", method="DELETE", headers=({"x-proxy-token": sys.argv[2]} if len(sys.argv) > 2 and sys.argv[2] else {}))
urllib.request.urlopen(req, timeout=10)
PY
  return 0
}

write_proposal() {
  # $1 = skill, $2 = kind, $3 = candidate, $4 = live SKILL.md path, $5 = rollouts path
  mkdir -p "$PROPOSALS_DIR"
  python - "$PROPOSALS_DIR/$1.proposal.json" "$1" "$2" "$3" "$4" "$5" "$BATCH_ID" <<'PY'
import json, sys, datetime
out, skill, kind, candidate, skill_path, rollouts, batch = sys.argv[1:8]
rec = {
    "kind": "skill_patch",
    "batch_id": batch,
    "skill": skill,
    "deliverable_kind": kind,
    "candidate_path": candidate,
    "target_path": skill_path,
    "rollouts_path": rollouts,
    "validator": "validate-candidate.py ACCEPT (rung 1-2 structural; NOT a promotion signal)",
    "verdict_file": out.replace(".proposal.json", ".verdict.json"),
    "status": "pending_gate",
    "created_at": datetime.datetime.utcnow().isoformat() + "Z",
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(rec, f, indent=2)
print(f"  PROPOSAL written: {out}")
PY
}

if [ "$PROMOTE_ONLY" = "1" ]; then
  if [ -z "$PO_SKILL" ] || [ -z "$PO_CANDIDATE" ] || [ -z "$PO_SKILL_PATH" ]; then
    echo "--promote-only needs --skill=, --candidate=, --skill-path=" >&2
    exit 2
  fi
  echo "SkillOpt promote-only: skill=$PO_SKILL batch=$BATCH_ID"
  promote_candidate "$PO_SKILL" "$PO_CANDIDATE" "$PO_SKILL_PATH"
  exit $?
fi

echo "SkillOpt batch trainer"
echo "  Repo root:    $REPO_ROOT"
echo "  Training dir: $TRAINING_DIR"
echo "  Output dir:   $OUT_DIR"
echo "  Batch id:     $BATCH_ID"
echo "  Proposals:    $PROPOSALS_DIR"
echo "  Budget:       $BUDGET edits/epoch"
echo "  Epochs:       $EPOCHS"
echo "  Pool:         $POOL candidates ($SCORE_MODE scorer)"
echo "  Skills:       ${ONLY_SKILLS:-all}"
echo "  Dry-run:      $DRY_RUN"
echo "  Auto-promote: $AUTO_PROMOTE"
echo ""
if [ "$DRY_RUN" != "1" ]; then ensure_training_set || echo "  WARN: training set could not be built; skills without rollouts will SKIP"; fi

# Skill name -> (path, training-rollouts-file)
declare -A SKILLS=(
  # NOTE: journey-illustrator is served by Vite middleware from .claude/skills/diagrams/
  # NOT from humans-in-control-research/exemplar-skills/ - see vite.config.ts.
  [journey-illustrator]="$REPO_ROOT/.claude/skills/diagrams/journey-illustrator/SKILL.md|journey-training.json"
  [persona-architect]="$REPO_ROOT/.claude/skills/persona-architect/SKILL.md|persona-training.json"
  [gap-analysis-evaluator]="$REPO_ROOT/.claude/skills/gap-analysis-evaluator/SKILL.md|gap-analysis-training.json"
  [roadmap-builder]="$REPO_ROOT/.claude/skills/roadmap-builder/SKILL.md|roadmap-training.json"
  [recommendation-architect]="$REPO_ROOT/.claude/skills/recommendation-architect/SKILL.md|recommendation-training.json"
  [strategy-author]="$REPO_ROOT/.claude/skills/strategy-author/SKILL.md|strategy-slide-training.json"
  [service-blueprint-mapper]="$REPO_ROOT/.claude/skills/service-blueprint-mapper/SKILL.md|blueprint-training.json"
  [deck-composer]="$REPO_ROOT/.claude/skills/deck-composer/SKILL.md|strategy-slide-training.json"
  # 2026-06-14 - writing-quality skills are SkillOpt targets so their voice rules
  # self-improve from rollouts + user feedback (NOT a static hardcoded map).
  # human-voice-editor composes onto EVERY deliverable, so it trains on the broad
  # strategy-slide rollout set; the lexicon trains on the same.
  [human-voice-editor]="$REPO_ROOT/.claude/skills/human-voice-editor/SKILL.md|strategy-slide-training.json"
)

# Kind map (used by validate-candidate)
declare -A KINDS=(
  [journey-illustrator]=journey
  [persona-architect]=persona
  [gap-analysis-evaluator]=gap-analysis
  [roadmap-builder]=roadmap
  [recommendation-architect]=recommendation
  [strategy-author]=strategy-slide
  [service-blueprint-mapper]=blueprint
  [deck-composer]=strategy-slide
  [human-voice-editor]=strategy-slide
)

SUCCESS_COUNT=0
REJECT_COUNT=0
SKIP_COUNT=0
PROMOTED_COUNT=0
REFUSED_COUNT=0

# Dry-run plans only: it must not create output or proposal directories.
if [ "$DRY_RUN" = "1" ]; then
  for SKILL in "${!SKILLS[@]}"; do
    IFS='|' read -r SKILL_PATH ROLLOUTS_FILE <<< "${SKILLS[$SKILL]}"
    ROLLOUTS_PATH="$TRAINING_DIR/$ROLLOUTS_FILE"
    if [ ! -f "$SKILL_PATH" ]; then echo "[$SKILL] SKIP: skill file not found"; SKIP_COUNT=$((SKIP_COUNT + 1)); continue; fi
    if [ ! -f "$ROLLOUTS_PATH" ]; then echo "[$SKILL] SKIP: rollouts file not found"; SKIP_COUNT=$((SKIP_COUNT + 1)); continue; fi
    echo "[$SKILL] DRY-RUN: would train with budget=$BUDGET epochs=$EPOCHS -> proposal at $PROPOSALS_DIR/$SKILL.proposal.json"
  done
  echo "DRY-RUN complete (no directories created). Skipped: $SKIP_COUNT"
  exit 0
fi

mkdir -p "$OUT_DIR"

for SKILL in "${!SKILLS[@]}"; do
  if [ -n "$ONLY_SKILLS" ] && [ "$ONLY_SKILLS" != "$SKILL" ]; then continue; fi
  IFS='|' read -r SKILL_PATH ROLLOUTS_FILE <<< "${SKILLS[$SKILL]}"
  KIND="${KINDS[$SKILL]}"
  ROLLOUTS_PATH="$TRAINING_DIR/$ROLLOUTS_FILE"

  echo "============================================================"
  echo "[$SKILL] kind=$KIND"
  echo "  skill:    $SKILL_PATH"
  echo "  rollouts: $ROLLOUTS_PATH"

  if [ ! -f "$SKILL_PATH" ]; then
    echo "  SKIP: skill file not found"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi
  if [ ! -f "$ROLLOUTS_PATH" ]; then
    echo "  SKIP: rollouts file not found"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi

  # Train: a GEPA pool of $POOL scored candidates (WS-5 R4); --pool=0 restores the single-candidate loop
  PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/run-skillopt.py" \
    --skill "$SKILL_PATH" \
    --rollouts "$ROLLOUTS_PATH" \
    --kind "$KIND" \
    --epochs "$EPOCHS" \
    --budget "$BUDGET" \
    --pool "$POOL" \
    --score-mode "$SCORE_MODE" \
    --skill-id "$SKILL" \
    --out-dir "$OUT_DIR" 2>&1 | tee "$OUT_DIR/$SKILL.log"

  # Locate the most recent candidate
  SKILL_BASE=$(basename "$SKILL_PATH" .md)
  CANDIDATE=$(ls -t "$OUT_DIR/$SKILL_BASE.candidate-"*.md 2>/dev/null | head -1)

  if [ -z "$CANDIDATE" ] || [ ! -f "$CANDIDATE" ]; then
    echo "  REJECT: no candidate produced"
    REJECT_COUNT=$((REJECT_COUNT + 1))
    continue
  fi

  echo ""
  echo "  Validating $CANDIDATE ..."
  if PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/validate-candidate.py" \
       --baseline "$SKILL_PATH" \
       --candidate "$CANDIDATE" \
       --rollouts "$ROLLOUTS_PATH" 2>&1 | tee "$OUT_DIR/$SKILL.validation.log"; then
    echo ""
    echo "  ACCEPTED by validate-candidate.py (rung 1-2). Writing proposal for the held-out gate."
    write_proposal "$SKILL" "$KIND" "$CANDIDATE" "$SKILL_PATH" "$ROLLOUTS_PATH"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    # WS-5 R5: the candidate trials as the deliverable kind's instruction override until the gate rules
    set_canary "$SKILL" "$KIND" "$CANDIDATE"
    if [ "$AUTO_PROMOTE" = "1" ]; then
      # L2 REGRESSION OBLIGATIONS (2026-08-07, sota-elevation plan, layer 4):
      # previously-passing obligations must stay green before ANY promotion.
      # Run once per batch (first promotion attempt) and cache the verdict.
      if [ -z "${_REG_OBLIGATIONS_VERDICT:-}" ]; then
        echo "  [layer 4] regression obligations (once per batch)..."
        if (cd "$HIC_DIR" && node scripts/regression-obligations.mjs); then
          _REG_OBLIGATIONS_VERDICT=pass
        else
          _REG_OBLIGATIONS_VERDICT=fail
        fi
      fi
      if [ "$_REG_OBLIGATIONS_VERDICT" = "pass" ]; then
        if promote_candidate "$SKILL" "$CANDIDATE" "$SKILL_PATH"; then
          PROMOTED_COUNT=$((PROMOTED_COUNT + 1))
        else
          REFUSED_COUNT=$((REFUSED_COUNT + 1))
        fi
      else
        echo "  PROMOTION BLOCKED: regression obligations failed (candidate kept at $CANDIDATE)"
        REFUSED_COUNT=$((REFUSED_COUNT + 1))
      fi
    else
      echo "  Candidate at $CANDIDATE (not auto-promoted; awaiting $PROPOSALS_DIR/$SKILL.verdict.json)"
    fi
  else
    echo ""
    echo "  REJECTED by validation gate"
    REJECT_COUNT=$((REJECT_COUNT + 1))
  fi
done

echo "============================================================"
echo "BATCH SUMMARY"
echo "  Accepted (proposals): $SUCCESS_COUNT"
echo "  Rejected:             $REJECT_COUNT"
echo "  Skipped:              $SKIP_COUNT"
echo "  Promoted (APPROVE):   $PROMOTED_COUNT"
echo "  Promotion refused:    $REFUSED_COUNT"
echo "  Logs:                 $OUT_DIR"
echo "  Proposals:            $PROPOSALS_DIR"
