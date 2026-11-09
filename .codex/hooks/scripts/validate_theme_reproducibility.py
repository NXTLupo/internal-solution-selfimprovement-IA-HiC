#!/usr/bin/env python3
"""
Theme Reproducibility Validator — Stop hook.

Per the standing rule (feedback_determinism_first_for_cached_runs 2026-05-24):
same cached corpus + same research goal MUST produce the same deliverable
identity (theme names + cluster memberships + structural shape) across runs.

This hook computes the deliverable's reproducibility_hash and compares it
against a stored baseline for the same hash. If the identity fields drift,
fail and surface the diff. Catches accidental non-determinism that the
deterministic-naming-pass contract was supposed to prevent.

The baseline lives at:
  humans-in-control-research/hic-workspace/sessions/_reproducibility-baselines/
  <hash>.json

Schema of each baseline file:
  {
    "reproducibility_hash": "<sha256>",
    "first_observed_at": "<ISO>",
    "deliverable_type": "themes" | "personas" | "recommendations" | ...,
    "identity_fingerprint": {
      "themes": ["theme-name-1", "theme-name-2", ...] (sorted),
      ...
    },
    "run_count": <int>
  }

When a new deliverable matches a known hash, compare identity_fingerprint.
On mismatch, fail.

Exit 0 = pass (matches baseline OR no baseline exists yet — first observation).
Exit 2 = block (drift detected against stored baseline).
"""
import sys
import os
import json
import hashlib

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
BASELINE_DIR = os.path.join(
    REPO_ROOT, 'humans-in-control-research',
    'hic-workspace', 'sessions', '_reproducibility-baselines'
)


def compute_reproducibility_hash(data):
    """If the deliverable carries a reproducibility_hash field, use it.
    Otherwise compute one from corpus_hash + goal + framework_versions.
    """
    if isinstance(data, dict):
        existing = data.get('reproducibility_hash')
        if isinstance(existing, str) and len(existing) >= 8:
            return existing

        corpus_hash = data.get('corpus_hash') or data.get('corpusHash') or ''
        goal = data.get('goal') or data.get('research_goal') or ''
        framework_versions = data.get('framework_versions') or {}

        if not corpus_hash or not goal:
            return None  # cannot compute hash; skip the reproducibility check

        h = hashlib.sha256()
        h.update(corpus_hash.encode('utf-8'))
        h.update(b'|')
        h.update(goal.encode('utf-8'))
        h.update(b'|')
        h.update(json.dumps(framework_versions, sort_keys=True).encode('utf-8'))
        return h.hexdigest()
    return None


def extract_identity_fingerprint(data):
    """Pull the identity fields whose stability we care about."""
    fingerprint = {}

    if isinstance(data, dict):
        # Themes — names + cluster_ids
        themes = data.get('themes')
        if isinstance(themes, list):
            theme_names = sorted([
                str(t.get('name') or t.get('title') or '').strip()
                for t in themes if isinstance(t, dict)
            ])
            cluster_ids = sorted([
                t.get('cluster_id') for t in themes
                if isinstance(t, dict) and t.get('cluster_id') is not None
            ])
            fingerprint['theme_names'] = theme_names
            if cluster_ids:
                fingerprint['theme_cluster_ids'] = cluster_ids

        # Personas — names
        personas = data.get('personas')
        if isinstance(personas, list):
            persona_names = sorted([
                str(p.get('name') or '').strip()
                for p in personas if isinstance(p, dict)
            ])
            fingerprint['persona_names'] = persona_names

        # Recommendations — titles
        recs = data.get('recommendations')
        if isinstance(recs, list):
            rec_titles = sorted([
                str(r.get('title') or r.get('recommendation') or '').strip()
                for r in recs if isinstance(r, dict)
            ])
            fingerprint['recommendation_titles'] = rec_titles

    return fingerprint


def load_baseline(hash_value):
    path = os.path.join(BASELINE_DIR, f"{hash_value}.json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def save_baseline(hash_value, deliverable_type, fingerprint):
    try:
        os.makedirs(BASELINE_DIR, exist_ok=True)
        path = os.path.join(BASELINE_DIR, f"{hash_value}.json")
        from datetime import datetime
        with open(path, 'w', encoding='utf-8') as f:
            json.dump({
                'reproducibility_hash': hash_value,
                'first_observed_at': datetime.utcnow().isoformat() + 'Z',
                'deliverable_type': deliverable_type,
                'identity_fingerprint': fingerprint,
                'run_count': 1,
            }, f, indent=2)
    except Exception as e:
        sys.stderr.write(f"[validate_theme_reproducibility] could not save baseline: {e}\n")


def update_baseline_run_count(hash_value, baseline):
    try:
        baseline['run_count'] = baseline.get('run_count', 1) + 1
        path = os.path.join(BASELINE_DIR, f"{hash_value}.json")
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(baseline, f, indent=2)
    except Exception:
        pass


def fingerprint_diff(baseline_fp, current_fp):
    """Return a list of (field, baseline_value, current_value) for differences."""
    diffs = []
    keys = set(baseline_fp.keys()) | set(current_fp.keys())
    for k in sorted(keys):
        b = baseline_fp.get(k, [])
        c = current_fp.get(k, [])
        if b != c:
            # Compute symmetric diff for list-shaped values
            if isinstance(b, list) and isinstance(c, list):
                only_in_baseline = sorted(set(b) - set(c))
                only_in_current = sorted(set(c) - set(b))
                diffs.append({
                    'field': k,
                    'only_in_baseline': only_in_baseline,
                    'only_in_current': only_in_current,
                })
            else:
                diffs.append({
                    'field': k,
                    'baseline': b,
                    'current': c,
                })
    return diffs


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    hash_value = compute_reproducibility_hash(data)
    if not hash_value:
        # Can't compute hash — deliverable doesn't carry corpus_hash + goal.
        # Skip rather than false-fail.
        sys.exit(0)

    fingerprint = extract_identity_fingerprint(data)
    if not fingerprint:
        sys.exit(0)

    # Identify the deliverable type from the fingerprint
    deliverable_type = (
        'themes' if 'theme_names' in fingerprint
        else 'personas' if 'persona_names' in fingerprint
        else 'recommendations' if 'recommendation_titles' in fingerprint
        else 'mixed'
    )

    baseline = load_baseline(hash_value)

    if baseline is None:
        # First observation of this hash — store as baseline, pass through
        save_baseline(hash_value, deliverable_type, fingerprint)
        sys.stderr.write(
            f"[validate_theme_reproducibility] First observation for hash "
            f"{hash_value[:12]}… — baseline stored.\n"
        )
        sys.exit(0)

    diffs = fingerprint_diff(baseline['identity_fingerprint'], fingerprint)
    if not diffs:
        # Reproduced perfectly — increment run count
        update_baseline_run_count(hash_value, baseline)
        sys.exit(0)

    # DRIFT DETECTED
    sys.stderr.write("THEME REPRODUCIBILITY VALIDATION FAILED:\n")
    sys.stderr.write(
        f"  Same reproducibility hash ({hash_value[:12]}…) but different identity fields.\n"
        f"  Baseline first observed: {baseline.get('first_observed_at', 'unknown')}\n"
        f"  Previous runs that matched: {baseline.get('run_count', 1)}\n"
        f"  Deliverable type: {deliverable_type}\n\n"
    )
    for d in diffs[:5]:
        field = d['field']
        sys.stderr.write(f"  Field: {field}\n")
        if 'only_in_baseline' in d:
            ob = d['only_in_baseline'][:8]
            oc = d['only_in_current'][:8]
            if ob:
                sys.stderr.write(f"    Lost vs baseline: {ob}\n")
            if oc:
                sys.stderr.write(f"    Newly appeared: {oc}\n")
        else:
            sys.stderr.write(f"    Baseline: {d['baseline']}\n")
            sys.stderr.write(f"    Current:  {d['current']}\n")
    sys.stderr.write(
        "\nPer feedback_determinism_first_for_cached_runs (2026-05-24): same "
        "corpus + same goal MUST produce the same identity fields. Drift "
        "indicates a non-deterministic LLM call (temperature > 0 without "
        "seed) or a clustering algorithm without random_state set.\n"
        "Investigate:\n"
        "  1. services/geminiService.ts — naming-class LLM calls at temperature > 0\n"
        "  2. proxy/topic_modeling.py — UMAP/HDBSCAN random_state (should be 42)\n"
        "  3. Any ordering-dependent dedup logic that doesn't sort first\n"
        "  4. The deterministic-naming-pass skill spec for the 12 call sites that need temperature=0\n"
    )
    sys.exit(2)


if __name__ == '__main__':
    main()
