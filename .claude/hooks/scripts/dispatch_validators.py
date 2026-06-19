#!/usr/bin/env python
"""dispatch_validators.py — Hook Bus (C1 of the 2026-06-06 architecture build).

Registered in `.claude/settings.json` as the SINGLE per-deliverable Stop hook.
Reads `.claude/ARCHITECTURE.md`'s YAML contract on every Stop event, identifies
which deliverable types the assistant just emitted, and dispatches to the
appropriate validators in `.claude/hooks/scripts/validate_*.py`.

Architecture position:
  - SKILL — per-deliverable expert (the model's HOW)
  - HOOK (this file + the validators it dispatches to) — guardrails that
    REJECT non-compliant output
  - SUBAGENT — async deep auditors (NOT invoked from here; too expensive)
  - SELF-IMPROVEMENT — every rejection is logged to
    hic-workspace/wiki/synthesis/hook-rejection-log.md (JSONL) so the
    epoch-proposer skill mines them on Step-2b

Why one bus + per-deliverable validators (not one monolithic hook):
  - Each validator stays focused, testable, ownable.
  - Adding a new deliverable = add an entry to ARCHITECTURE.md + drop a
    validate_X.py file; no settings.json edit, no bus edit.
  - The bus is the ONLY thing registered in settings, so the existing
    settings hierarchy (which still calls validate_output.py separately)
    is unchanged.

Exit codes:
  0 — no rejection (either no deliverable detected, or all validators passed)
  2 — at least one validator rejected the output (Claude must respond)
  Other — internal hook error (never blocks the user; pass-through)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional


REPO_ROOT = Path(__file__).resolve().parents[3]
ARCHITECTURE_FILE = REPO_ROOT / ".claude" / "ARCHITECTURE.md"
VALIDATORS_DIR = REPO_ROOT / ".claude" / "hooks" / "scripts"
REJECTION_LOG = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "hook-rejection-log.md"


# ---------------------------------------------------------------------------
# 1. Parse the YAML contract from ARCHITECTURE.md
# ---------------------------------------------------------------------------

def _extract_yaml_block(md_text: str) -> str:
    """Extract the YAML code block following `## YAML contract`. We use a
    simple regex rather than a markdown parser so this file stays dependency-
    free (no pyyaml/markdown-it import needed for the bus to run)."""
    m = re.search(r"```yaml\s*\n(deliverables:[\s\S]*?)```", md_text)
    return m.group(1) if m else ""


def _parse_deliverables_yaml(yaml_text: str) -> list[dict[str, Any]]:
    """Minimal hand-rolled YAML parser for the specific shape we emit in
    ARCHITECTURE.md. Dependency-free intentionally. Supports:
      - top-level `deliverables:` list
      - each item is a dict with string and list-of-string values
      - leading `- ` starts a new entry
      - nested keys with 4-space indent (e.g. `validators:`)
      - list items with `- ` at indent 6 (under a 4-space key)
      - null value `null`
    Fail-quiet: returns [] on parse error so a malformed YAML can't blow up
    the Stop hook (which would block every user message)."""
    out: list[dict[str, Any]] = []
    cur: Optional[dict[str, Any]] = None
    cur_list_key: Optional[str] = None
    try:
        for raw_line in yaml_text.splitlines():
            if not raw_line.strip() or raw_line.lstrip().startswith("#"):
                continue
            # Top-level "deliverables:" header — ignore; we already know we're inside it.
            if raw_line.startswith("deliverables:"):
                continue
            # New deliverable entry: starts with "  - " at indent 2
            if re.match(r"^\s{2}-\s+", raw_line):
                if cur is not None:
                    out.append(cur)
                cur = {}
                cur_list_key = None
                # Continue parsing the rest of the line as `key: value`
                rest = re.sub(r"^\s{2}-\s+", "", raw_line)
                m = re.match(r"^([a-z_]+):\s*(.*)$", rest)
                if m:
                    k, v = m.group(1), m.group(2).strip()
                    if v:
                        cur[k] = _unquote(v)
                    else:
                        cur[k] = None
                continue
            # In-entry simple `key: value` at indent 4
            if cur is not None and re.match(r"^\s{4}[a-z_]+:", raw_line):
                m = re.match(r"^\s{4}([a-z_]+):\s*(.*)$", raw_line)
                if m:
                    k, v = m.group(1), m.group(2).strip()
                    if v == "" or v is None:
                        cur[k] = []  # assume list; will be filled by subsequent `      - ` lines
                        cur_list_key = k
                    else:
                        cur[k] = _unquote(v)
                        cur_list_key = None
                continue
            # List item under a key: `      - value` at indent 6
            if cur is not None and cur_list_key and re.match(r"^\s{6}-\s+", raw_line):
                v = re.sub(r"^\s{6}-\s+", "", raw_line).strip()
                if cur_list_key in cur and isinstance(cur[cur_list_key], list):
                    cur[cur_list_key].append(_unquote(v))
                continue
        if cur is not None:
            out.append(cur)
    except Exception as e:
        _log_internal(f"YAML parse error: {type(e).__name__}: {e}")
        return []
    return out


def _unquote(v: str) -> Any:
    """Strip surrounding quotes; convert `null` to None."""
    if v == "null":
        return None
    if (v.startswith("'") and v.endswith("'")) or (v.startswith('"') and v.endswith('"')):
        return v[1:-1]
    return v


def load_architecture() -> list[dict[str, Any]]:
    """Read + parse ARCHITECTURE.md's YAML contract. Returns [] on failure."""
    if not ARCHITECTURE_FILE.exists():
        _log_internal(f"ARCHITECTURE.md not found at {ARCHITECTURE_FILE}; bus running in pass-through")
        return []
    try:
        md = ARCHITECTURE_FILE.read_text(encoding="utf-8")
        yaml = _extract_yaml_block(md)
        if not yaml:
            _log_internal("ARCHITECTURE.md has no `yaml` code block; bus running in pass-through")
            return []
        return _parse_deliverables_yaml(yaml)
    except Exception as e:
        _log_internal(f"ARCHITECTURE.md load failed: {type(e).__name__}: {e}")
        return []


# ---------------------------------------------------------------------------
# 2. Detect which deliverables the assistant emitted
# ---------------------------------------------------------------------------

def detect_deliverables(text: str, contract: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return the subset of `contract` whose `detection_patterns` appear in
    `text`. A single message can match multiple (e.g. a deck with #journey
    + #recommendations both)."""
    matched: list[dict[str, Any]] = []
    text_lower = text.lower()
    for entry in contract:
        pats = entry.get("detection_patterns") or []
        if not isinstance(pats, list):
            continue
        for pat in pats:
            if pat and isinstance(pat, str) and pat.lower() in text_lower:
                matched.append(entry)
                break
    return matched


# ---------------------------------------------------------------------------
# 3. Dispatch to each validator + collect results
# ---------------------------------------------------------------------------

def run_validator(validator_filename: str, payload: dict[str, Any]) -> tuple[int, str]:
    """Invoke one validator script as a subprocess. Pass the original Stop
    event payload via stdin (so existing validators that expect the same
    contract work unchanged). Return (exit_code, captured_stderr_or_stdout).

    Hard ceiling: 5s per validator. A hung validator must NEVER block the
    user — exit -1 = treated as pass-through with a warning."""
    script = VALIDATORS_DIR / validator_filename
    if not script.exists():
        return (-1, f"validator script not found: {validator_filename}")
    try:
        proc = subprocess.run(
            ["python", str(script)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            timeout=5.0,
        )
        # Validators may emit structured JSON on stdout or plain text on stderr.
        msg = (proc.stdout or "").strip()
        if proc.returncode != 0 and not msg:
            msg = (proc.stderr or "").strip()
        return (proc.returncode, msg or "")
    except subprocess.TimeoutExpired:
        return (-1, f"validator timed out (>5s): {validator_filename}")
    except Exception as e:
        return (-1, f"validator invocation error ({type(e).__name__}): {validator_filename}: {e}")


# ---------------------------------------------------------------------------
# 4. Self-improvement signal — append every rejection to the log
# ---------------------------------------------------------------------------

def append_rejection_log(record: dict[str, Any]) -> None:
    """JSONL append to hic-workspace/wiki/synthesis/hook-rejection-log.md.
    Never raises; the log is best-effort observability for the epoch-proposer."""
    try:
        REJECTION_LOG.parent.mkdir(parents=True, exist_ok=True)
        if not REJECTION_LOG.exists():
            REJECTION_LOG.write_text(
                "---\ntitle: Hook Rejection Log\ntype: synthesis\n"
                "purpose: One JSONL line per Hook Bus rejection. Read by "
                "epoch-proposer Step-2b to identify recurring validator "
                "failures as intervention candidates.\n---\n\n",
                encoding="utf-8",
            )
        with open(REJECTION_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        pass  # never break the bus on logging failure


# ---------------------------------------------------------------------------
# 5. Internal hook diagnostics — never emitted to user-facing output
# ---------------------------------------------------------------------------

_INTERNAL_LOG = REPO_ROOT / ".claude" / "hooks" / "dispatch_validators.diag.log"


def _log_internal(msg: str) -> None:
    """Append one line to the diagnostic log so when the bus has problems we
    can grep for them without polluting the user-visible Stop reply."""
    try:
        _INTERNAL_LOG.parent.mkdir(parents=True, exist_ok=True)
        with open(_INTERNAL_LOG, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {msg}\n")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# 6. Stop hook entry point
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Design-desk artifact visibility (added 2026-06-06)
# ---------------------------------------------------------------------------
# Per the architecture audit: the Stop hook scans the chat transcript, but
# design-desk artifacts (#journey, #blueprint, #proto outputs) go to
# IndexedDB on the SPA side AND to disk under
# humans-in-control-research/hic-workspace/prototypes/ + the journey-mapper
# service's output dir. The chat reply just says "Generated #journey ..." —
# the actual artifact HTML never appears in the transcript, so dispatcher
# can't validate it. This helper supplements the chat transcript with the
# N most-recent design-desk artifact bodies so the validators see what
# the user actually consumed.

DESIGN_DESK_ARTIFACT_DIRS = [
    REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "prototypes",
]


def _read_recent_design_desk_artifacts(window_seconds: int = 600) -> list[str]:
    """Read every design-desk artifact file modified in the last
    `window_seconds`. The dispatcher concatenates this with the chat transcript
    so per-deliverable validators (e.g. validate_journey_overview_slide.py)
    can fire on artifacts that never appeared in the chat reply."""
    import time as _time
    out: list[str] = []
    cutoff = _time.time() - window_seconds
    for dir_path in DESIGN_DESK_ARTIFACT_DIRS:
        if not dir_path.is_dir():
            continue
        try:
            for entry in dir_path.iterdir():
                if not entry.is_file():
                    continue
                try:
                    if entry.stat().st_mtime < cutoff:
                        continue
                    body = entry.read_text(encoding="utf-8", errors="ignore")
                    if body and body.strip():
                        out.append(body)
                except Exception:
                    continue
        except Exception:
            continue
    return out


def extract_last_assistant_message(payload: dict[str, Any]) -> str:
    """Stop hook payloads vary by harness version. We accept:
      - {'output': '<text>'}                    — direct text
      - {'text': '<text>'}                      — direct text alt
      - {'transcript_path': '/path/to/jsonl'}   — locate file, read last assistant turn
      - {'messages': [{'role': ..., 'content': ...}]} — inline message array
    Returns "" if none recoverable.

    2026-06-06 — Concatenates any recent design-desk artifacts found on disk
    so per-deliverable validators can fire on freeform-HTML artifacts that
    never appeared in the chat transcript."""
    if isinstance(payload, str):
        return payload
    if not isinstance(payload, dict):
        return ""
    for k in ("output", "text", "content"):
        v = payload.get(k)
        if isinstance(v, str) and v.strip():
            return v
    # transcript_path support — read JSONL, find last assistant
    tp = payload.get("transcript_path") or payload.get("transcriptPath")
    if isinstance(tp, str) and os.path.exists(tp):
        try:
            with open(tp, encoding="utf-8") as f:
                lines = f.readlines()
            for line in reversed(lines):
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                # SDK transcript shape: {"role":"assistant","content":[{"text":"..."}, ...]}
                if entry.get("role") == "assistant" or entry.get("type") == "assistant":
                    c = entry.get("content") or entry.get("text") or ""
                    if isinstance(c, list):
                        parts = [b.get("text", "") for b in c if isinstance(b, dict)]
                        return "\n".join(p for p in parts if p)
                    if isinstance(c, str):
                        return c
        except Exception as e:
            _log_internal(f"transcript read failed: {type(e).__name__}: {e}")
    # messages list
    msgs = payload.get("messages")
    base_text = ""
    if isinstance(msgs, list):
        for m in reversed(msgs):
            if isinstance(m, dict) and m.get("role") == "assistant":
                c = m.get("content", "")
                if isinstance(c, str):
                    base_text = c
                    break
                if isinstance(c, list):
                    base_text = "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
                    break

    # 2026-06-06 — Append recent design-desk artifact bodies so journey/
    # blueprint/proto outputs that don't appear in the chat get validated.
    try:
        recent_artifacts = _read_recent_design_desk_artifacts(window_seconds=600)
        if recent_artifacts:
            base_text = base_text + "\n\n" + "\n\n".join(recent_artifacts)
    except Exception:
        pass

    return base_text


def main() -> int:
    # 1. Read payload (never raises; pass-through on parse failure)
    try:
        raw = sys.stdin.read()
        payload: Any = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    text = extract_last_assistant_message(payload if isinstance(payload, dict) else {})
    if not text:
        return 0  # nothing to validate

    # 2. Load contract
    contract = load_architecture()
    if not contract:
        return 0  # pass-through; no contract loaded

    # 3. Detect which deliverables were emitted
    matched = detect_deliverables(text, contract)
    if not matched:
        return 0  # not a deliverable-typed message

    # 4. Dispatch to validators
    # 2026-06-06 — Universal validators (from _globals.validators_universal in
    # ARCHITECTURE.md) run on every matched deliverable IN ADDITION to its
    # per-entry validators. Currently the only universal is
    # validate_cached_selection_honored.py — the Knowledge Library curation
    # gate. Adds the validator silently to every deliverable's stack so we
    # don't have to edit 22 YAML entries when introducing a new universal.
    UNIVERSAL_VALIDATORS = [
        "validate_cached_selection_honored.py",
        # 2026-06-06 — Self-referential meta-narration ("this release stays
        # focused on...", "so no feature ships without...", "this PRD
        # captures..."). Universal because EVERY artifact kind emits prose
        # and none of them should explain their own sections. See
        # validate_self_referential_freeform.py header for the 6-layer trace.
        "validate_self_referential_freeform.py",
        # 2026-06-06 — Manifest-pointer citation discipline. Every evidence
        # statement in a deliverable MUST end with a [<wikiPath>#cN] pointer
        # to a real manifest chunk. Rejects fabricated pointers + un-cited
        # evidence sentences. See validate_chunk_citations.py header for
        # the 6-layer trace and the matching SKILL contract.
        "validate_chunk_citations.py",
        # 2026-06-06 — Persisted-insight provenance check. After
        # emitDeliverable persists insights back to the wiki as chunks,
        # this hook confirms their generation_provenance.source_chunks
        # reference real manifest chunks (catches model drift between
        # what it claimed to cite and what's actually addressable).
        "validate_insight_provenance.py",
        # 2026-06-14 - Text-hierarchy / typographic-doctrine gate. The renderer
        # enforces size+weight from the Figma type system; this enforces the
        # content-side rules only the model controls: hero values stay short
        # evidence (not headlines that out-rank the title), and prose is
        # sentence-case (no ALL-CAPS shouting). See validate_text_hierarchy.py
        # + the nxt-visual-renderer/references/typographic-system.md contract.
        "validate_text_hierarchy.py",
        # 2026-06-14 - Writing-quality / structural-tell gate (Anti-Slop Field Guide).
        # Reads the single canonical lexicon (_lexicon.py), sanitize-first, weighted
        # slop-score; catches negative parallelism, triads, dangling -ing, stacked
        # hedging, Tier-2 clusters, same-opener cadence, low burstiness - the tells
        # only the shadow detector logged before. SHADOW MODE today (exit 0); promote
        # high-precision checks to blocking after the FPR ramp. The hic-output-qa
        # sub-agent rubric cites this hook as its writing-tell source.
        "validate_writing_quality.py",
        # 2026-06-15 - No-truncation gate. Flags any slide field that exceeds its
        # per-field export budget (would force the renderer/export to cut it) or
        # already ends in an ellipsis. Both signals are exact (deterministic char
        # count / suffix), so it BLOCKS. Single budget source shared with the TS
        # summarize-to-budget re-ask: services/slideFieldBudgets.json. The runtime
        # enforcement is the re-ask in corpusChatService; this is the regression guard.
        "validate_no_truncation.py",
    ]

    all_failures: list[str] = []
    validators_run = 0
    for entry in matched:
        deliverable = entry.get("hashtag") or "(unknown)"
        # Per-entry + universal validators (deduped, preserving order)
        per_entry = [v for v in (entry.get("validators") or []) if isinstance(v, str)]
        seen = set(per_entry)
        all_validators = per_entry + [v for v in UNIVERSAL_VALIDATORS if v not in seen]
        for v in all_validators:
            if not isinstance(v, str):
                continue
            validators_run += 1
            rc, msg = run_validator(v, payload if isinstance(payload, dict) else {"output": text})
            if rc == 2:
                # Validator-level rejection
                all_failures.append(f"[{deliverable}/{v}] {msg or '(no message)'}")
                append_rejection_log({
                    "ts_ms": int(time.time() * 1000),
                    "deliverable": deliverable,
                    "validator": v,
                    "fail_reason": msg or "(no message)",
                    "transcript_excerpt": text[:400],
                })
            elif rc not in (0, -1):
                # Treat unexpected exit codes as soft failures (log + continue,
                # don't block the user — the validator likely has a bug)
                _log_internal(f"validator {v} returned unexpected rc={rc}: {msg[:120]}")

    _log_internal(
        f"dispatched {validators_run} validators across {len(matched)} deliverables; "
        f"failures={len(all_failures)}"
    )

    if not all_failures:
        return 0  # all passed

    # 5. Emit structured rejection
    out = {
        "ok": False,
        "block": True,
        "reason": (
            "Hook Bus REJECTED the deliverable. Validator failures:\n\n  - "
            + "\n  - ".join(all_failures)
            + "\n\nFix per the named SKILL in .claude/ARCHITECTURE.md and resubmit. "
            + "Each rejection is logged to hic-workspace/wiki/synthesis/"
            + "hook-rejection-log.md for the epoch-proposer to mine."
        ),
    }
    print(json.dumps(out))
    return 2


if __name__ == "__main__":
    sys.exit(main())
