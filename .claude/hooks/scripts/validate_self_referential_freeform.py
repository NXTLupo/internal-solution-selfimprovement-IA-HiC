#!/usr/bin/env python
"""validate_self_referential_freeform.py — Stop hook (guardrail, UNIVERSAL).

Catches the self-referential prose pattern that leaked into the 2026-06-06 PRD
artifact: "this release stays focused on...", "Sign-off pairs each role to the
part of the assistant it owns, so no feature ships without...".

Architecture position (per the 6-layer rule):
  1. WIKI         — N/A (live-text validator, not a wiki gate)
  2. MANIFEST     — N/A
  3. SKILL        — proxy artifact prompt enumerates the banned synonyms
                    (proxy/app.py _artifact_generation_prompt) so the model
                    has no excuse
  4. HOOK         — THIS FILE. Stop-event chokepoint that rejects any emission
                    carrying the pattern; registered as UNIVERSAL_VALIDATORS
                    in dispatch_validators.py so it runs on every deliverable
                    without per-entry YAML edits.
  5. SUBAGENT     — N/A (this is fast structural pattern matching, not a deep
                    deliverable audit)
  6. SELF-IMPROVE — dispatch_validators.py appends rejections to
                    hook-rejection-log.md (JSONL) that the epoch-proposer
                    skill mines on Step-2b

Universal vs. per-deliverable:
  Universal. Every artifact kind (PRD, blueprint, org chart, journey,
  competitive, persona, recommendation, strategy, audit, gap, prd, roadmap)
  emits prose. None of them should explain why their own sections exist.

Exit codes:
  0 — pass (no self-referential prose, OR the message isn't a deliverable)
  2 — reject (one or more banned phrasings detected; JSON rejection emitted)
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any


# Nouns that, when preceded by "this", refer to the artifact ITSELF (a
# meta-narration tell). NOT exhaustive of every English noun a model could
# choose, but covers the 20+ aliases observed in HiC failures. The pattern is
# CONSERVATIVE: we only match "this <noun>" followed by a verb of EXISTENCE,
# DEFINITION, or DESCRIPTION (so legitimate product-domain "this release"
# inside an evidence quote isn't false-positively flagged).
_ARTIFACT_NOUNS = r"(?:release|version|artifact|deliverable|document|output|report|analysis|brief|prd|deck|slide|page|chart|matrix|map|blueprint|persona|persona\s+set|journey|roadmap|gap|audit|chapter|section|summary|recap|exhibit|table|view|frame|panel|tab|view\s+model|note|recommendation\s+set)"

# Self-referential framing where the artifact is the subject of a meta-statement.
# Pattern: "this <artifact-noun> <META-DESCRIPTION-VERB>". We ONLY match verbs
# that describe the artifact's OWN structure, scope, content, or rhetorical
# position. Generic verbs (is/are/will/serves/provides/offers/includes) are
# excluded because they appear inside legitimate evidence quotes about an
# actual product release (e.g. "this release will include X"). The verbs below
# only make sense when the subject is a DOCUMENT or DELIVERABLE describing
# itself.
_META_VERBS = r"(?:stays|remains|focuses|covers|presents|explains|describes|outlines|details|captures|addresses|illustrates|maps|tracks|frames|summarizes|recaps|highlights|argues|posits|asserts|claims|emphasizes|underscores|hones\s+in|zeroes\s+in|drills\s+down)"

_SELF_REFERENTIAL_PATTERNS = [
    # "this <artifact-noun> <meta-verb> ..."
    re.compile(rf"\bthis\s+{_ARTIFACT_NOUNS}\s+{_META_VERBS}\b", re.I),
    # "...so this <artifact-noun>..." (justification tail)
    re.compile(rf"\bso\s+(?:that\s+)?this\s+{_ARTIFACT_NOUNS}\b", re.I),
    # "so no feature/item/release ships without..." (sign-off justification chrome)
    re.compile(r"\bso\s+no\s+(?:feature|item|line|deliverable|release|artifact)\s+(?:ships|goes\s+out|moves\s+forward|gets\s+approved)\b", re.I),
    # "is/are deferred so..." (out-of-scope justification chrome)
    re.compile(r"\b(?:is|are)\s+(?:deferred|out\s+of\s+scope)\s+so\b", re.I),
]


# Limit how much text we strip-quote in the rejection reason so the message
# stays useful but doesn't dump the whole artifact back to the model.
_QUOTE_WINDOW = 160


def _strip_html(html: str) -> str:
    """Crude HTML strip — good enough for pattern matching against prose."""
    if not html:
        return ""
    # Drop <script> and <style> blocks entirely (their JS strings can match).
    html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    # Replace tags with spaces so text from different elements doesn't smash together.
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text)


def _detect(text: str) -> list[tuple[str, str]]:
    """Return list of (pattern_label, matched_phrase) hits."""
    hits: list[tuple[str, str]] = []
    for pat in _SELF_REFERENTIAL_PATTERNS:
        for m in pat.finditer(text):
            start = max(0, m.start() - 40)
            end = min(len(text), m.end() + 40)
            ctx = text[start:end].strip()
            if len(ctx) > _QUOTE_WINDOW:
                ctx = ctx[:_QUOTE_WINDOW] + "..."
            hits.append((pat.pattern[:80], ctx))
            if len(hits) >= 5:
                return hits  # Cap so the rejection reason is reviewable
    return hits


def _read_payload_text(payload: Any) -> str:
    text = ""
    if isinstance(payload, dict):
        text = (payload.get("output") or payload.get("text") or "")
        if not text and payload.get("transcript_path") and os.path.isfile(payload["transcript_path"]):
            try:
                lines = Path(payload["transcript_path"]).read_text(encoding="utf-8").splitlines()
                for line in reversed(lines):
                    try:
                        entry = json.loads(line)
                    except Exception:
                        continue
                    if entry.get("role") == "assistant" or entry.get("type") == "assistant":
                        c = entry.get("content") or ""
                        if isinstance(c, list):
                            text = "\n".join(b.get("text", "") for b in c if isinstance(b, dict))
                        elif isinstance(c, str):
                            text = c
                        break
            except Exception:
                pass
    elif isinstance(payload, str):
        text = payload
    return text


def main() -> int:
    try:
        raw = sys.stdin.read()
        payload: Any = json.loads(raw) if raw.strip() else {}
    except Exception:
        return 0

    text = _read_payload_text(payload)
    if not text:
        return 0

    # Strip HTML so pattern matching reads natural prose, not tag soup.
    prose = _strip_html(text)
    hits = _detect(prose)
    if not hits:
        return 0

    quoted = "; ".join(f"\"{phrase}\"" for _, phrase in hits[:3])
    reason = (
        f"Self-referential meta-narration detected ({len(hits)} hit(s)): the "
        f"artifact contains prose that EXPLAINS its own sections or scope, "
        f"which is banned per .claude/CLAUDE.md (No Self-Referential or "
        f"Process Language). Examples flagged: {quoted}. "
        f"A finished consulting deliverable never says 'this release stays "
        f"focused on...', 'this PRD captures...', 'so no feature ships...'. "
        f"List the items and the insight; do not justify why the section "
        f"exists. Re-emit with all 'this <artifact-noun>' / 'so this <noun>' "
        f"/ '...so no feature ships' phrasings removed."
    )
    rejection = {"ok": False, "block": True, "reason": reason}
    print(json.dumps(rejection))
    return 2


if __name__ == "__main__":
    sys.exit(main())
