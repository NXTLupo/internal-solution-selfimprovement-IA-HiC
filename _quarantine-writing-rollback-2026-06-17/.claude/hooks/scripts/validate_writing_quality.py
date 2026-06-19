#!/usr/bin/env python3
"""
Writing-Quality Validator (2026-06-14, Anti-Slop Field Guide Stages 2+4+5).

The structural-tell + burstiness gate the audit found missing: the only structural rule
actually BLOCKING today is the em-dash. This adds negative parallelism (the guide's single
most reliable tell), rule-of-three triads, dangling "-ing" significance clauses, stacked
hedging, dramatic colon/fragment, bold-colon labels, Tier-2 word CLUSTERS, same-opener
cadence, and low burstiness - all reading from the SINGLE canonical lexicon (_lexicon.py),
sanitize-first (Rule 97), with a weighted slop score (structural 3x word hits, Rule 95).

SHADOW MODE (exit 0 always) until the false-positive rate is measured on real output, then
promote the high-precision checks to blocking (Field Guide staged plan; RI revision). Logs
every finding + the weighted score to wiki/synthesis/writing-quality-shadow-log.md so the
sub-agent rubric (hic-output-qa) and SkillOpt can mine recurring tells.
"""
import sys
import os
import json
import re
import time

sys.path.insert(0, os.path.dirname(__file__))
try:
    import _lexicon as LEX
except Exception:
    LEX = None

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
_WORD = re.compile(r"[A-Za-z']+")


def _collect_text(payload):
    """Gather user-facing prose from a Stop payload: chat reply, slide fields, theme text."""
    chunks = []

    def walk(v, key=""):
        if isinstance(v, str):
            # skip obviously-structural keys
            if key in ("template", "id", "source", "url", "brand", "layout"):
                return
            if len(v) >= 12:
                chunks.append(v)
        elif isinstance(v, dict):
            for k, val in v.items():
                walk(val, k)
        elif isinstance(v, list):
            for it in v:
                walk(it, key)

    if isinstance(payload, dict):
        # common chat shapes
        for k in ("output", "text", "message", "content", "response"):
            if isinstance(payload.get(k), str):
                chunks.append(payload[k])
        walk(payload.get("slides", []))
        walk(payload.get("themes", []))
        walk(payload.get("data", {}))
    elif isinstance(payload, str):
        chunks.append(payload)
    return "\n\n".join(chunks)


def analyze(text):
    findings = []
    score = 0.0
    if not LEX or not text:
        return findings, score
    clean = LEX.sanitize(text)

    # 1) Tier-1 words (1 pt each, capped contribution)
    t1 = LEX.tier1_words()
    t1_hits = []
    for w in t1:
        if re.search(r"\b" + re.escape(w) + r"\b", clean, re.I):
            t1_hits.append(w)
    if t1_hits:
        score += min(len(t1_hits), 8)
        findings.append(f"Tier-1 lexicon ({len(t1_hits)}): {', '.join(t1_hits[:8])}")

    # 2) Tier-2 CLUSTER (per paragraph; only flag 2+ in one paragraph) - 1 pt per cluster
    t2 = set(w.lower() for w in LEX.tier2_words())
    thr = LEX.tier2_threshold()
    for para in clean.split("\n\n"):
        present = [w for w in t2 if re.search(r"\b" + re.escape(w) + r"\b", para, re.I)]
        if len(present) >= thr:
            score += 1
            findings.append(f"Tier-2 cluster ({len(present)} in one paragraph): {', '.join(sorted(present)[:6])}")

    # 3) multiword + copula phrases (1 pt each)
    mw_hits = [p for p in LEX.multiword_phrases() if p.lower() in clean.lower()]
    if mw_hits:
        score += len(mw_hits)
        findings.append(f"multiword slop ({len(mw_hits)}): {', '.join(mw_hits[:6])}")

    # 4) openers/closers (position-aware: sentence start / text end)
    sents = [s.strip() for s in _SENT_SPLIT.split(clean) if s.strip()]
    op_hits = []
    for s in sents:
        low = s.lower()
        for o in LEX.openers():
            if low.startswith(o.lower()):
                op_hits.append(o)
                break
    if op_hits:
        score += min(len(op_hits), 4)
        findings.append(f"banned openers ({len(op_hits)}): {', '.join(op_hits[:5])}")
    cl_hits = [c for c in LEX.closers() if c.lower() in clean.lower()]
    if cl_hits:
        score += len(cl_hits)
        findings.append(f"banned closers: {', '.join(cl_hits[:4])}")

    # 5) STRUCTURAL regex (3x weight - the highest-signal tells)
    for name, rx in LEX.structural_regex().items():
        m = rx.search(clean)
        if m:
            # rule-of-three triad is noisy; weight it lower and only count once
            w = 1 if name == "rule_of_three_triad" else 3
            score += w
            findings.append(f"structural[{name}] (x{w}): \"{m.group(0)[:60]}\"")

    # 6) same-opener cadence: 3+ consecutive sentences starting with the same word
    starts = []
    for s in sents:
        m = _WORD.search(s)
        starts.append(m.group(0).lower() if m else "")
    run = 1
    for i in range(1, len(starts)):
        if starts[i] and starts[i] == starts[i - 1]:
            run += 1
            if run >= 3:
                score += 1
                findings.append(f"same-opener cadence: 3+ sentences start with \"{starts[i]}\"")
                run = 1
        else:
            run = 1

    # 7) burstiness: low sentence-length variance over a substantial passage
    if len(sents) >= 6:
        lens = [len(_WORD.findall(s)) for s in sents]
        mean = sum(lens) / len(lens)
        var = sum((x - mean) ** 2 for x in lens) / len(lens)
        sd = var ** 0.5
        if sd < 4.0 and mean > 8:  # uniform medium-length sentences
            score += 1
            findings.append(f"low burstiness (sentence-length sd={sd:.1f}; mix short and long sentences)")

    return findings, score


# 2026-06-14 - PROMOTED TO BLOCKING after a measured FPR ramp on 298 real clean wiki
# articles: these five structural tells fired on <=0.7% of clean human prose, so a hard
# block is safe (the field guide's staged-promotion gate). Everything else (negative
# parallelism 3.0%, tier1 19%, same-opener 38.6%, triad 6.7%, bold-colon 11.7%, ...) stays
# SHADOW/scored - logged + fed to the slop-repair pass, never a hard block, because their
# clean-prose false-positive rate is too high to gate on.
BLOCKING_STRUCTURAL = {
    "dramatic_colon_fragment",
    "dangling_ing_significance",
    "false_balance",
    "rhetorical_midsentence_question",
    "stacked_hedging",
}


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    text = _collect_text(payload)
    findings, score = analyze(text)
    if not findings:
        sys.exit(0)

    # split blocking vs shadow findings
    blocking = []
    for fi in findings:
        m = re.match(r"structural\[(\w+)\]", fi)
        if m and m.group(1) in BLOCKING_STRUCTURAL:
            blocking.append(fi)

    try:
        log = "humans-in-control-research/hic-workspace/wiki/synthesis/writing-quality-shadow-log.md"
        os.makedirs(os.path.dirname(log), exist_ok=True)
        with open(log, "a", encoding="utf-8") as f:
            f.write(f"\n## {time.strftime('%Y-%m-%dT%H:%M:%S')} score={score:.1f} blocking={len(blocking)}\n")
            for fi in findings:
                f.write(f"- {fi}\n")
    except Exception:
        pass

    if blocking:
        sys.stderr.write("WRITING-QUALITY VALIDATION FAILED (high-precision structural tells):\n")
        for b in blocking:
            sys.stderr.write(f"  - {b}\n")
        sys.stderr.write(
            "\nThese tells fire on <1% of clean human prose, so they are blocking. Rewrite the "
            "offending sentence(s) plainly: state the point directly (no dramatic colon/fragment, "
            "no rhetorical-question-then-answer, no false-balance both-sides, no dangling '-ing' "
            "significance clause, no stacked hedges). See the human-voice-editor skill.\n"
        )
        sys.exit(2)

    # remaining findings are scored/shadow only - surface but do not block.
    sys.stderr.write(f"[writing-quality SHADOW] slop-score={score:.1f}; {len(findings)} finding(s) (no blocking tell).\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
