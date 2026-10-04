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
TRAINING_DIR="${TRAINING_DIR:-/d/tmp/training}"
OUT_DIR="${OUT_DIR:-/d/tmp/skillopt-batch-$(date +%Y%m%d-%H%M%S)}"
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
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

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
echo "  Dry-run:      $DRY_RUN"
echo "  Auto-promote: $AUTO_PROMOTE"
echo ""

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

  # Train
  PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/run-skillopt.py" \
    --skill "$SKILL_PATH" \
    --rollouts "$ROLLOUTS_PATH" \
    --kind "$KIND" \
    --epochs "$EPOCHS" \
    --budget "$BUDGET" \
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
