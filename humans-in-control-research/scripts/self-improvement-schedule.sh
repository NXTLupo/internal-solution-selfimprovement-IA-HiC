#!/usr/bin/env bash
# Unified self-improvement cadence runner (2026-06-16).
#
# Implements the "second brain" cadence (Karpathy / Matt Wolfe pattern): a
# nightly ingest, a weekly maintenance pass, and a monthly health check. This
# script runs ONLY the HEADLESS (CLI) jobs that do not need the Claude runtime.
# The Claude-driven jobs (wiki-curator, cross-engagement-pattern-miner,
# epoch-proposer, orphan/schema auditors) are scheduled separately via Claude
# Code /schedule or /loop - see humans-in-control-research/SELF_IMPROVEMENT_SCHEDULE.md.
#
# Usage:
#   self-improvement-schedule.sh nightly    # ingest + manifest-parity audit
#   self-improvement-schedule.sh weekly     # nightly jobs + SkillOpt retrain
#   self-improvement-schedule.sh monthly    # weekly jobs + full health-check summary
#
# Cadence (install via Windows Task Scheduler XMLs or Unix cron):
#   nightly  : 0 1 * * *      (01:00 daily)
#   weekly   : 0 6 * * 0      (Sun 06:00 - delegates to skillopt-weekly.sh)
#   monthly  : 0 5 1 * *      (1st of month 05:00)
set -uo pipefail   # NOT -e: a single job failing must not abort the cadence

MODE="${1:-nightly}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HIC_DIR="$REPO_ROOT/humans-in-control-research"
PROXY="http://127.0.0.1:5012"
TS="$(date +%Y-%m-%dT%H:%M:%S)"
LOG="$HIC_DIR/hic-workspace/wiki/synthesis/self-improvement-health-log.md"
mkdir -p "$(dirname "$LOG")"

note() { echo "$1"; echo "$1" >> "$LOG"; }

{
  echo ""
  echo "## $TS  mode=$MODE"
} >> "$LOG"

# ─── NIGHTLY: ingest new sources + manifest-parity audit ───────────────────
run_nightly() {
  note "[nightly] proactive ingest: poll youtube channels"
  if curl -s -m 5 "$PROXY/health" >/dev/null 2>&1; then
    code=$(curl -s -m 600 -o /tmp/_si_ingest.json -w '%{http_code}' \
      -X POST "$PROXY/api/scheduler/poll-youtube-channels" \
      -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo "000")
    note "[nightly] poll-youtube-channels -> HTTP $code"
  else
    note "[nightly] SKIP ingest - proxy not reachable at $PROXY"
  fi

  note "[nightly] manifest-chunk parity audit"
  if [ -f "$HIC_DIR/hic-workspace/wiki/.manifest.json" ]; then
    # validate_manifest_chunk_parity.py is a Stop-hook validator; invoked here
    # in standalone mode with an empty event so it audits the live manifest and
    # reports parity drift to stderr (best-effort; never aborts the cadence).
    echo '{}' | PYTHONIOENCODING=utf-8 python "$REPO_ROOT/.claude/hooks/scripts/validate_manifest_chunk_parity.py" \
      >> "$LOG" 2>&1 && note "[nightly] manifest parity OK" || note "[nightly] manifest parity reported drift (see above)"
  else
    note "[nightly] SKIP parity - no .manifest.json"
  fi
}

# ─── WEEKLY: nightly jobs + SkillOpt retrain (its own runner + gate) ───────
run_weekly() {
  run_nightly
  note "[weekly] SkillOpt retrain (delegates to skillopt-weekly.sh; has its own held-out validate-candidate.py gate)"
  bash "$HIC_DIR/scripts/skillopt-weekly.sh" >> "$LOG" 2>&1 \
    && note "[weekly] skillopt-weekly OK" || note "[weekly] skillopt-weekly failed (see log)"

  # E6.3 (2026-07-02, artifact-total-elevation): #proto manifest <-> Figma parity, weekly.
  # HEADLESS TIER: audits the proto component manifest the pipeline actually composes from
  # (design-system/proto-component-manifest.md) for staleness + vocabulary collapse - the two
  # drift symptoms a dead mirror shows. The LIVE Figma comparison (5 proto-pattern pages vs the
  # manifest ids) is a Claude-driven job via /schedule, same split as wiki-curator above.
  note "[weekly] proto manifest<->Figma parity (headless tier)"
  MANIFEST_FILE="$HIC_DIR/hic-workspace/wiki/design-system/proto-component-manifest.md"
  if [ -f "$MANIFEST_FILE" ]; then
    PROTO_COUNT=$(grep -c "proto/" "$MANIFEST_FILE" 2>/dev/null || echo 0)
    AGE_DAYS=$(( ( $(date +%s) - $(date -r "$MANIFEST_FILE" +%s) ) / 86400 ))
    if [ "$PROTO_COUNT" -lt 100 ]; then
      note "[weekly] PROTO PARITY DRIFT: only $PROTO_COUNT proto/<Name> refs (expected 150+; vocabulary collapse?)"
    elif [ "$AGE_DAYS" -gt 21 ]; then
      note "[weekly] PROTO PARITY WARN: manifest untouched for ${AGE_DAYS}d - run the live Figma parity pass (5 proto pages) via Claude /schedule"
    else
      note "[weekly] proto manifest OK ($PROTO_COUNT proto refs, ${AGE_DAYS}d old)"
    fi
  else
    note "[weekly] PROTO PARITY FAIL: $MANIFEST_FILE missing - #proto builds are composing blind"
  fi
}

# ─── MONTHLY: weekly jobs + health-check summary ───────────────────────────
run_monthly() {
  run_weekly
  note "[monthly] health-check summary written. Claude-driven audits (wiki-curator,"
  note "[monthly] orphan/schema auditors, cross-engagement-pattern-miner, epoch-proposer)"
  note "[monthly] run via Claude Code /schedule - see SELF_IMPROVEMENT_SCHEDULE.md."
}

case "$MODE" in
  nightly) run_nightly ;;
  weekly)  run_weekly ;;
  monthly) run_monthly ;;
  *) echo "Unknown mode: $MODE (use nightly|weekly|monthly)" >&2; exit 2 ;;
esac

note "[$MODE] done $TS"
