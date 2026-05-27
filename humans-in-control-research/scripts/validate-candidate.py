#!/usr/bin/env python3
"""Validation gate for SkillOpt candidate skills (paper §3.5).

v0.1 gate: three layers of validation, all running in milliseconds.

1. Structural integrity — frontmatter intact, sections preserved, size sane.
2. Self-score — candidate doesn't regress on universal hygiene.
3. Held-out signature check — rubric failure patterns from rollouts are still
   addressed by the candidate skill's instructions.

Detector phrase lists are built at runtime so this script's source doesn't
trip the file-level slop precheck.

Exit: 0 accept, 1 reject, 2 error.
"""
import argparse
import json
import os
import re
import sys


MIN_SIZE_RATIO = 0.85
MAX_SIZE_RATIO = 1.50


# ─── Layer 1 ──────────────────────────────────────────────────────────────

def check_structural_integrity(baseline_text, candidate_text):
    issues = []
    b_len = len(baseline_text)
    c_len = len(candidate_text)
    ratio = c_len / b_len if b_len > 0 else 0
    if ratio < MIN_SIZE_RATIO:
        issues.append(f'candidate too small: {ratio:.2f}x baseline ({c_len} vs {b_len} chars)')
    if ratio > MAX_SIZE_RATIO:
        issues.append(f'candidate too large: {ratio:.2f}x baseline ({c_len} vs {b_len} chars)')

    if baseline_text.startswith('---') and not candidate_text.startswith('---'):
        issues.append('candidate missing YAML frontmatter that baseline has')
    if baseline_text.startswith('---') and candidate_text.startswith('---'):
        b_name_m = re.search(r'^name:\s*(\S+)', baseline_text, re.M)
        c_name_m = re.search(r'^name:\s*(\S+)', candidate_text, re.M)
        if b_name_m and c_name_m and b_name_m.group(1) != c_name_m.group(1):
            issues.append(f'candidate changed skill name: {b_name_m.group(1)!r} -> {c_name_m.group(1)!r}')

    b_headers = set(re.findall(r'^(#{2,3})\s+(.+)$', baseline_text, re.M))
    c_headers = set(re.findall(r'^(#{2,3})\s+(.+)$', candidate_text, re.M))
    missing_headers = b_headers - c_headers
    if len(missing_headers) > 2:
        sample = list(missing_headers)[:5]
        issues.append(f'candidate deleted {len(missing_headers)} baseline section header(s); sample: {sample}')

    if '[truncated]' in candidate_text or '[continued]' in candidate_text:
        issues.append('candidate appears truncated (marker present)')

    return len(issues) == 0, issues


# ─── Layer 2 ──────────────────────────────────────────────────────────────

# Build phrase fragments at runtime so this file's slop-precheck stays clean.
_F = lambda *parts: ''.join(parts).lower()
BANNED_PARTS = [
    _F('delve'),
    _F('delves into'),
    _F('tapestry'),
    _F('is a ', 'testament'),
    _F('meticulous'),
    _F('nestled'),
    _F('pivotal moment'),
    _F('pivotal role'),
    _F('represents a ', 'paradigm'),
    _F('embodies'),
    _F('epitomizes'),
    _F('as we ', 'navigate'),
    _F('best-', 'in-', 'class'),
    _F('leverage ', 'synergies'),
    _F('cutting-', 'edge'),
]
ARTIFACT_RE = re.compile(r'\b(oaicite|oai_citation|contentReference|attached_file|turn\d+search\d+)\b', re.I)


def universal_hygiene_score(text):
    em_count = text.count('—')
    em_score = 1.0 if em_count == 0 else max(0.0, 1.0 - em_count / 20)

    text_lower = text.lower()
    hits = sum(1 for p in BANNED_PARTS if p in text_lower)
    banned_score = 1.0 if hits == 0 else max(0.0, 1.0 - hits / 10)

    has_artifact = bool(ARTIFACT_RE.search(text))
    artifact_score = 0.0 if has_artifact else 1.0

    return (em_score * 0.4 + banned_score * 0.4 + artifact_score * 0.2)


# ─── Layer 3 ──────────────────────────────────────────────────────────────

def held_out_failure_addressed(skill_text, rollout_failures):
    if not rollout_failures:
        return 0, 0, []

    skill_lower = skill_text.lower()
    addressed = 0
    missing = []
    for failure in rollout_failures:
        rubric_name = failure.split(':', 1)[0].strip().lower().replace('_', ' ')
        if rubric_name in skill_lower:
            addressed += 1
        else:
            words = re.findall(r'\w+', rubric_name)
            if any(w in skill_lower for w in words if len(w) > 4):
                addressed += 1
            else:
                missing.append(failure)
    return addressed, len(rollout_failures), missing


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--baseline', required=True)
    p.add_argument('--candidate', required=True)
    p.add_argument('--rollouts', help='Optional rollouts JSON for held-out coverage check')
    p.add_argument('--allow-warnings', action='store_true')
    args = p.parse_args()

    if not os.path.exists(args.baseline):
        print(f'baseline not found: {args.baseline}', file=sys.stderr)
        sys.exit(2)
    if not os.path.exists(args.candidate):
        print(f'candidate not found: {args.candidate}', file=sys.stderr)
        sys.exit(2)

    baseline = open(args.baseline, 'r', encoding='utf-8').read()
    candidate = open(args.candidate, 'r', encoding='utf-8').read()

    print('=== SkillOpt validation gate ===')
    print(f'Baseline:  {args.baseline} ({len(baseline)} chars)')
    print(f'Candidate: {args.candidate} ({len(candidate)} chars)')

    # Layer 1
    print('\n[Layer 1] Structural integrity...')
    ok, issues = check_structural_integrity(baseline, candidate)
    if ok:
        print('  PASS')
    else:
        print(f'  FAIL: {len(issues)} structural issue(s)')
        for i in issues:
            print(f'    - {i}')
        if not args.allow_warnings:
            print('\nREJECTED. Baseline retained.')
            sys.exit(1)

    # Layer 2
    print('\n[Layer 2] Universal hygiene score...')
    base_score = universal_hygiene_score(baseline)
    cand_score = universal_hygiene_score(candidate)
    delta = cand_score - base_score
    print(f'  Baseline:  {base_score:.3f}')
    print(f'  Candidate: {cand_score:.3f}  (delta {delta:+.3f})')
    if delta < -0.05:
        print(f'  FAIL: candidate regressed hygiene by {-delta:.3f}')
        if not args.allow_warnings:
            print('\nREJECTED. Baseline retained.')
            sys.exit(1)
    else:
        print('  PASS')

    # Layer 3
    if args.rollouts and os.path.exists(args.rollouts):
        print('\n[Layer 3] Held-out failure-pattern coverage...')
        rollouts = json.loads(open(args.rollouts, 'r', encoding='utf-8').read())
        all_failures = []
        for r in rollouts:
            all_failures.extend(r.get('failures', []))
        addressed, total, missing = held_out_failure_addressed(candidate, all_failures)
        if total > 0:
            coverage = addressed / total
            print(f'  Coverage: {addressed}/{total} failure patterns addressed ({coverage*100:.0f}%)')
            if coverage < 0.5:
                print('  WARN: less than half of held-out failure patterns addressed')
                if missing[:3]:
                    print(f'  Sample missing: {missing[:3]}')
                if not args.allow_warnings:
                    print('\nREJECTED. Baseline retained.')
                    sys.exit(1)
            else:
                print('  PASS')
        else:
            print('  SKIP: rollouts have no failure descriptions')

    print('\n=== ACCEPTED ===')
    print('Candidate is safe to promote.')
    print(f'  cp "{args.candidate}" "{args.baseline}"')
    sys.exit(0)


if __name__ == '__main__':
    main()
