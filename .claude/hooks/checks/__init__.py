# HiC unified quality gate — check modules (WS-0).
# Each check is an independently-testable function check(target: dict, ctx: dict) -> CheckResult.
# Registered + dispatched by ../quality_gate.py with --scope. Objective defects BLOCK; judgment calls
# emit review findings (severity "review") and do not block. New checks are added here as each workstream
# lands its feature (never gate an absent feature). Plan: humans-in-control-research/plans/
# hic-definitive-vision-and-100-percent-plan-v2-2026-07-01.md (Part IV).
