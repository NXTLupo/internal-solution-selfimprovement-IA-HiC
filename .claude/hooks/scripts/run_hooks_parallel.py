#!/usr/bin/env python3
"""run_hooks_parallel.py — Parallel Stop-hook dispatcher (2026-05-26)

Replaces the sequential per-hook entries in hooks.json with a single
parallel runner. Reads the same Stop event from stdin once, fans it out
to N hook scripts concurrently (subprocess.Popen with bounded parallelism),
aggregates exit codes, and exits non-zero if ANY hook failed.

Why:
  hooks.json registers 24 Stop hooks. Sequential execution with 10-30s
  per-hook timeouts means worst-case ~6 minutes of validation per chat
  turn. Most hooks are independent and parallelizable. 4-way parallelism
  cuts wall-clock by ~75% with identical semantics — same checks, same
  exit codes, same blocking behavior on failure.

Contract:
  - stdin: the Stop event JSON from Claude Code
  - stdout: streamed combined output of all hooks (interleaved)
  - stderr: aggregated error output
  - exit 0 if ALL hooks exit 0, exit 2 if ANY hook exits non-zero
    (preserves the existing block-on-failure semantics)
  - Argument: optional --concurrency N (default 4)

Hooks invoked (must match hooks.json Stop list):
  See HOOK_SCRIPTS below. Update when adding/removing Stop hooks.
"""

from __future__ import annotations
import argparse
import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Tuple

# Hooks to run in parallel. Each entry: (script-path-relative-to-repo, timeout-seconds).
# Keep this list in sync with the Stop block in hooks.json — the JSON entry
# now invokes this dispatcher with the full list embedded here.
HOOK_SCRIPTS: list[Tuple[str, int]] = [
    ("validate_citations.py", 30),
    ("validate_evidence.py", 30),
    ("validate_titles.py", 15),
    ("validate_source_diversity.py", 15),
    ("validate_budgets.py", 15),
    ("validate_quantification.py", 15),
    ("validate_evidence_recency.py", 15),
    ("validate_deliverable_coherence.py", 15),
    ("validate_ai_output_syntax.py", 15),
    ("validate_citation_resolution.py", 15),
    ("validate_minimum_yield.py", 10),
    ("validate_slide_variety.py", 10),
    ("pre_export_dom_audit.py", 15),
    ("validate_no_silent_fallback.py", 10),
    ("validate_topic_model_completion.py", 10),
    ("validate_framework_page_exists.py", 10),
    ("validate_corpus_relevance_distribution.py", 10),
    ("validate_theme_yield.py", 10),
    ("validate_evidence_tier_distribution.py", 10),
    ("validate_theme_reproducibility.py", 10),
    ("validate_claim_grounding.py", 15),
    ("validate_ai_slop.py", 10),
    ("validate_freeform_structure.py", 10),
    ("validate_no_em_dashes.py", 10),
    ("validate_no_emoji.py", 10),
    ("validate_speculative_claims.py", 10),
]


def run_one(script_name: str, timeout: int, event_bytes: bytes) -> Tuple[str, int, str, str, float]:
    """Run one hook script with the same stdin payload. Returns
    (script_name, returncode, stdout, stderr, elapsed_s)."""
    script_path = Path(__file__).parent / script_name
    if not script_path.exists():
        return (script_name, 0, "", f"[run_hooks_parallel] script not found, skipping: {script_path}", 0.0)
    start = time.time()
    try:
        proc = subprocess.run(
            ["python", str(script_path)],
            input=event_bytes,
            capture_output=True,
            timeout=timeout,
        )
        elapsed = time.time() - start
        return (
            script_name,
            proc.returncode,
            proc.stdout.decode("utf-8", errors="replace"),
            proc.stderr.decode("utf-8", errors="replace"),
            elapsed,
        )
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        return (
            script_name,
            124,  # standard timeout exit code
            "",
            f"[run_hooks_parallel] {script_name} TIMEOUT after {timeout}s",
            elapsed,
        )
    except Exception as e:
        elapsed = time.time() - start
        return (script_name, 1, "", f"[run_hooks_parallel] {script_name} CRASHED: {e}", elapsed)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()

    event_bytes = sys.stdin.buffer.read()
    if not event_bytes:
        # No event — nothing to validate. Exit clean.
        return 0

    total_start = time.time()
    failed: list[str] = []
    output_lock = threading.Lock()

    with ThreadPoolExecutor(max_workers=max(1, args.concurrency)) as ex:
        futures = {
            ex.submit(run_one, name, timeout, event_bytes): name
            for name, timeout in HOOK_SCRIPTS
        }
        for fut in as_completed(futures):
            name, rc, out, err, elapsed = fut.result()
            with output_lock:
                if out:
                    sys.stdout.write(out)
                if err:
                    sys.stderr.write(err)
                if rc != 0:
                    failed.append(f"{name} (rc={rc}, {elapsed:.1f}s)")

    total_elapsed = time.time() - total_start
    sys.stderr.write(
        f"\n[run_hooks_parallel] {len(HOOK_SCRIPTS)} hooks, "
        f"concurrency={args.concurrency}, total={total_elapsed:.1f}s, "
        f"failed={len(failed)}\n"
    )
    if failed:
        sys.stderr.write("[run_hooks_parallel] FAILED hooks:\n")
        for f in failed:
            sys.stderr.write(f"  - {f}\n")
        return 2  # block, preserving existing semantics
    return 0


if __name__ == "__main__":
    sys.exit(main())
