#!/usr/bin/env bash
# Weekly SkillOpt cron runner.
#
# Designed for both Unix cron and Windows Task Scheduler (the .xml in the
# same directory invokes this script via Git Bash).
#
# Flow per week:
#   1. Extract latest rollouts from hic-workspace/{artifacts,sample-artifacts}
#   2. Build training set (real + synthetic failures)
#   3. Run optimizer on every Tier-1 skill
#   4. Validate each candidate
#   5. Auto-promote candidates that pass validation
#   6. Write a weekly summary to humans-in-control-research/hic-workspace/wiki/synthesis/
#
# Schedule:
#   - Unix cron: 0 6 * * 0 /path/to/skillopt-weekly.sh   (Sundays 6am)
#   - Windows Task Scheduler: trigger every Sunday 06:00 local
#
# At ~$0.02 per skill per epoch × 8 Tier-1 skills × 1 epoch = ~$0.16/week
# Annual cost: ~$8.32. Effectively free for the quality lift.
set -e

# Resolve repo root (works from any invocation directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HIC_DIR="$REPO_ROOT/humans-in-control-research"

# Output directory for this run's artifacts (rollouts, candidates, logs)
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$REPO_ROOT/tmp/skillopt-weekly-$TIMESTAMP"
ROLLOUTS_DIR="$RUN_DIR/rollouts"
TRAINING_DIR="$RUN_DIR/training"
CANDIDATES_DIR="$RUN_DIR/candidates"

mkdir -p "$ROLLOUTS_DIR" "$TRAINING_DIR" "$CANDIDATES_DIR"

echo "=== SkillOpt weekly run: $TIMESTAMP ==="
echo "  Repo root:     $REPO_ROOT"
echo "  HiC dir:       $HIC_DIR"
echo "  Run dir:       $RUN_DIR"
echo ""

# Pre-flight: proxy must be reachable
if ! curl -s -m 5 http://127.0.0.1:5012/health > /dev/null 2>&1; then
  echo "ERROR: research-proxy not reachable at http://127.0.0.1:5012/health" >&2
  echo "       Start docker compose -f $REPO_ROOT/docker-compose-all.yml up -d research-proxy" >&2
  exit 1
fi

# ─── Step 1: Extract rollouts from current artifacts ─────────────────────
echo "[1/5] Extracting rollouts from sample-artifacts/ + artifacts/ ..."
PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/extract-rollouts.py" \
  --workspace "$HIC_DIR/hic-workspace" \
  --out-dir "$ROLLOUTS_DIR" 2>&1 | tee "$RUN_DIR/extract.log" || {
    echo "ERROR: rollout extraction failed; see $RUN_DIR/extract.log" >&2
    exit 1
}

# ─── Step 2: Build training set (real + synthetic failures) ──────────────
echo ""
echo "[2/5] Building training sets with synthetic failure cases ..."
PYTHONIOENCODING=utf-8 python "$HIC_DIR/scripts/build-training-set.py" \
  --real-rollouts-dir "$ROLLOUTS_DIR" \
  --out-dir "$TRAINING_DIR" 2>&1 | tee "$RUN_DIR/build-training.log" || {
    echo "ERROR: training-set build failed" >&2
    exit 1
}

# ─── Step 3: Run SkillOpt batch with auto-promote ────────────────────────
echo ""
echo "[3/5] Training all Tier-1 skills with auto-promotion ..."
TRAINING_DIR="$TRAINING_DIR" \
OUT_DIR="$CANDIDATES_DIR" \
  bash "$HIC_DIR/scripts/skillopt-batch.sh" --auto-promote 2>&1 | tee "$RUN_DIR/batch.log"

# ─── Step 4: Rebuild HiC container so promoted skills take effect ────────
echo ""
echo "[4/5] Rebuilding research-generator with promoted skills ..."
docker compose -f "$REPO_ROOT/docker-compose-all.yml" up -d --build research-generator 2>&1 | tail -10 | tee "$RUN_DIR/rebuild.log" || {
    echo "WARN: docker rebuild failed; promoted skills will not be live until manual rebuild" >&2
}

# ─── Step 5: Write weekly summary to wiki ────────────────────────────────
echo ""
echo "[5/5] Writing weekly summary to wiki/synthesis/ ..."
SUMMARY_PATH="$HIC_DIR/hic-workspace/wiki/synthesis/skillopt-weekly-log.md"
mkdir -p "$(dirname "$SUMMARY_PATH")"

{
  echo ""
  echo "## $TIMESTAMP"
  echo ""
  echo "- Run directory: \`$RUN_DIR\`"
  echo "- Rollouts extracted: $(ls "$ROLLOUTS_DIR"/*.json 2>/dev/null | wc -l)"
  echo "- Training sets: $(ls "$TRAINING_DIR"/*.json 2>/dev/null | wc -l)"
  echo "- Candidates: $(ls "$CANDIDATES_DIR"/SKILL.candidate-*.md 2>/dev/null | wc -l)"
  echo ""
  echo "### Batch summary"
  echo '```'
  tail -10 "$RUN_DIR/batch.log" 2>/dev/null
  echo '```'
} >> "$SUMMARY_PATH"

echo ""
echo "=== DONE ==="
echo "Run artifacts: $RUN_DIR"
echo "Summary: $SUMMARY_PATH"
