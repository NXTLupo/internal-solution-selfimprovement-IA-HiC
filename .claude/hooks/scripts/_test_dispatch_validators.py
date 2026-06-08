#!/usr/bin/env python
"""Smoke test for dispatch_validators.py — proves the Hook Bus correctly
identifies deliverables, dispatches to validators, and rejects bad output.

Run: python .claude/hooks/scripts/_test_dispatch_validators.py
Exit 0 = all assertions pass; exit 1 = any assertion fails.

Tests the contract end-to-end (real subprocess invocation, real ARCHITECTURE.md
parse, real validator scripts). No mocks. If this passes, the bus works.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
DISPATCHER = HERE / "dispatch_validators.py"


def run_bus(payload: dict) -> tuple[int, str]:
    """Invoke the dispatcher with `payload` on stdin; return (rc, stdout)."""
    proc = subprocess.run(
        ["python", str(DISPATCHER)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        timeout=30,
    )
    return (proc.returncode, (proc.stdout or "") + (proc.stderr or ""))


def assert_eq(name: str, got, expected):
    if got != expected:
        print(f"  FAIL  {name}: got={got!r} expected={expected!r}")
        return False
    print(f"  PASS  {name}")
    return True


def assert_contains(name: str, haystack: str, needle: str):
    if needle not in haystack:
        print(f"  FAIL  {name}: '{needle}' not in:\n    {haystack[:400]}")
        return False
    print(f"  PASS  {name}")
    return True


def main() -> int:
    passed = 0
    failed = 0

    print("=== T1: empty payload passes ===")
    rc, _ = run_bus({})
    if assert_eq("empty -> rc=0", rc, 0): passed += 1
    else: failed += 1

    print("\n=== T2: non-deliverable message passes ===")
    rc, _ = run_bus({"output": "Just a normal chat reply, nothing to validate."})
    if assert_eq("conversational -> rc=0", rc, 0): passed += 1
    else: failed += 1

    print("\n=== T3: BAD journey deck (no overview slide, has metaphor title) ===")
    # A journey deck with phases but NO overview-diagram slide in positions 1-3,
    # AND a slide title that uses the clock metaphor (per the 2026-06-06 user
    # report). Should be rejected by validate_journey_overview_slide.py.
    bad_journey = """
The user asked #journey #slides. Here is the deck.

<section class="nxt-slide nxt-slide--title">
<h2 class="nxt-slide__title">Co-op preparation journey</h2>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">PHASE ONE</p>
<h2 class="nxt-slide__title">First-year prep feels abstract until the clock is already running</h2>
<p class="nxt-slide__body">Incoming students meet co-op as a promise.</p>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">PHASE TWO</p>
<h2 class="nxt-slide__title">Job Search</h2>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">PHASE THREE</p>
<h2 class="nxt-slide__title">Application</h2>
</section>
"""
    rc, out = run_bus({"output": bad_journey})
    if assert_eq("bad journey -> rc=2 (reject)", rc, 2): passed += 1
    else: failed += 1
    if assert_contains("rejection message mentions journey validator", out,
                       "validate_journey_overview_slide.py"): passed += 1
    else: failed += 1

    print("\n=== T4: GOOD journey deck (overview slide names match per-phase slides) ===")
    # Validator rule R1: overview slide must reference 80%+ of the phase NAMES
    # used in the per-phase deep-dive titles. Fixture has 3 per-phase titles —
    # overview must mention at least 3 of them (or 2 with 80% relaxation).
    good_journey = """
The user asked #journey #slides. Here is the deck.

<section class="nxt-slide nxt-slide--title">
<h2 class="nxt-slide__title">Co-op preparation journey</h2>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">JOURNEY OVERVIEW</p>
<h2 class="nxt-slide__title">Students move through three phases from preparation to placement</h2>
<div class="nxt-process">
  <div>Students learn the placement timeline. First-year orientation.</div>
  <div>Students apply to 100 plus positions. Resume and cover letters.</div>
  <div>Students interview and accept offers. Three-day acceptance window.</div>
</div>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">PHASE ONE</p>
<h2 class="nxt-slide__title">Students learn the placement timeline</h2>
<p class="nxt-slide__body">Incoming students meet co-op as a promise.</p>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">PHASE TWO</p>
<h2 class="nxt-slide__title">Students apply to 100 plus positions</h2>
</section>

<section class="nxt-slide">
<p class="nxt-slide__kicker">PHASE THREE</p>
<h2 class="nxt-slide__title">Students interview and accept offers</h2>
</section>
"""
    rc, out = run_bus({"output": good_journey})
    if assert_eq("good journey -> rc=0 (pass)", rc, 0): passed += 1
    else:
        print(f"  (bus stdout for good_journey: {out[:600]})")
        failed += 1

    print("\n=== T5: ARCHITECTURE.md YAML parses without error ===")
    sys.path.insert(0, str(HERE))
    try:
        from dispatch_validators import load_architecture, detect_deliverables
        contract = load_architecture()
        if assert_eq("contract entry count >= 18", len(contract) >= 18, True): passed += 1
        else: failed += 1
        # Check #journey entry has validate_journey_overview_slide.py
        journey = next((c for c in contract if c.get("hashtag") == "#journey"), None)
        if assert_eq("#journey entry exists", journey is not None, True): passed += 1
        else: failed += 1
        if journey:
            v = journey.get("validators") or []
            if assert_contains("#journey has overview-slide validator", str(v),
                              "validate_journey_overview_slide.py"): passed += 1
            else: failed += 1
    except Exception as e:
        print(f"  FAIL  ARCHITECTURE.md parse: {type(e).__name__}: {e}")
        failed += 1

    print(f"\n{passed}/{passed+failed} assertions passed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
