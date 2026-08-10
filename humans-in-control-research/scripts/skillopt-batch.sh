#!/usr/bin/env bash
# SkillOpt batch trainer — runs the full optimization loop for all Tier-1 skills.
#
# Usage:
#   bash scripts/skillopt-batch.sh [--dry-run] [--auto-promote]
#
# Flow per skill:
#   1. Find SKILL.md path
#   2. Locate matching training rollouts
#   3. Run run-skillopt.py → candidate SKILL.md
#   4. Run validate-candidate.py → ACCEPT / REJECT
#   5. If ACCEPT and --auto-promote: cp candidate to baseline
#   6. Otherwise: leave candidate in place for manual review
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TRAINING_DIR="${TRAINING_DIR:-/d/tmp/training}"
OUT_DIR="${OUT_DIR:-/d/tmp/skillopt-batch-$(date +%Y%m%d-%H%M%S)}"
DRY_RUN=0
AUTO_PROMOTE=0
BUDGET=4
EPOCHS=1

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --auto-promote) AUTO_PROMOTE=1 ;;
    --budget=*) BUDGET="${arg#--budget=}" ;;
    --epochs=*) EPOCHS="${arg#--epochs=}" ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

mkdir -p "$OUT_DIR"
echo "SkillOpt batch trainer"
echo "  Repo root:    $REPO_ROOT"
echo "  Training dir: $TRAINING_DIR"
echo "  Output dir:   $OUT_DIR"
echo "  Budget:       $BUDGET edits/epoch"
echo "  Epochs:       $EPOCHS"
echo "  Dry-run:      $DRY_RUN"
echo "  Auto-promote: $AUTO_PROMOTE"
echo ""

# Skill name → (path, training-rollouts-file)
declare -A SKILLS=(
  # NOTE: journey-illustrator is served by Vite middleware from .claude/skills/diagrams/
  # NOT from humans-in-control-research/exemplar-skills/ — see vite.config.ts.
  [journey-illustrator]="$REPO_ROOT/.claude/skills/diagrams/journey-illustrator/SKILL.md|journey-training.json"
  [persona-architect]="$REPO_ROOT/.claude/skills/persona-architect/SKILL.md|persona-training.json"
  [gap-analysis-evaluator]="$REPO_ROOT/.claude/skills/gap-analysis-evaluator/SKILL.md|gap-analysis-training.json"
  [roadmap-builder]="$REPO_ROOT/.claude/skills/roadmap-builder/SKILL.md|roadmap-training.json"
  [recommendation-architect]="$REPO_ROOT/.claude/skills/recommendation-architect/SKILL.md|recommendation-training.json"
  [strategy-author]="$REPO_ROOT/.claude/skills/strategy-author/SKILL.md|strategy-slide-training.json"
  [service-blueprint-mapper]="$REPO_ROOT/.claude/skills/service-blueprint-mapper/SKILL.md|blueprint-training.json"
  [deck-narrative-composer]="$REPO_ROOT/.claude/skills/deck-narrative-composer/SKILL.md|strategy-slide-training.json"
  # 2026-06-14 - writing-quality skills are SkillOpt targets so their voice rules
  # self-improve weekly from rollouts + user feedback (NOT a static hardcoded map).
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
  [deck-narrative-composer]=strategy-slide
  [human-voice-editor]=strategy-slide
)

TOTAL_COST=0
SUCCESS_COUNT=0
REJECT_COUNT=0
SKIP_COUNT=0

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

  if [ "$DRY_RUN" = "1" ]; then
    echo "  DRY-RUN: would train $SKILL with budget=$BUDGET epochs=$EPOCHS"
    continue
  fi

  # Train
  PYTHONIOENCODING=utf-8 python "$REPO_ROOT/humans-in-control-research/scripts/run-skillopt.py" \
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
  if PYTHONIOENCODING=utf-8 python "$REPO_ROOT/humans-in-control-research/scripts/validate-candidate.py" \
       --baseline "$SKILL_PATH" \
       --candidate "$CANDIDATE" \
       --rollouts "$ROLLOUTS_PATH" 2>&1 | tee "$OUT_DIR/$SKILL.validation.log"; then
    echo ""
    echo "  ACCEPTED"
    if [ "$AUTO_PROMOTE" = "1" ]; then
      # L2 REGRESSION OBLIGATIONS (2026-08-07, sota-elevation plan, layer 4):
      # previously-passing obligations must stay green before ANY promotion.
      # Run once per batch (first promotion) and cache the verdict.
      if [ -z "${_REG_OBLIGATIONS_VERDICT:-}" ]; then
        echo "  [layer 4] regression obligations (once per batch)..."
        if (cd "$REPO_ROOT/humans-in-control-research" && node scripts/regression-obligations.mjs); then
          _REG_OBLIGATIONS_VERDICT=pass
        else
          _REG_OBLIGATIONS_VERDICT=fail
        fi
      fi
      if [ "$_REG_OBLIGATIONS_VERDICT" = "pass" ]; then
        cp "$CANDIDATE" "$SKILL_PATH"
        echo "  PROMOTED to $SKILL_PATH"
      else
        echo "  PROMOTION BLOCKED: regression obligations failed (candidate kept at $CANDIDATE)"
      fi
    else
      echo "  Candidate at $CANDIDATE (not auto-promoted)"
    fi
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo ""
    echo "  REJECTED by validation gate"
    REJECT_COUNT=$((REJECT_COUNT + 1))
  fi
done

echo "============================================================"
echo "BATCH SUMMARY"
echo "  Accepted: $SUCCESS_COUNT"
echo "  Rejected: $REJECT_COUNT"
echo "  Skipped:  $SKIP_COUNT"
echo "  Logs:     $OUT_DIR"
