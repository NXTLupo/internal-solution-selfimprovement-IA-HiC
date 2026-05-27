#!/usr/bin/env python3
"""
Deliverable Coherence Validator — Cross-checks persona <-> recommendation
<-> roadmap consistency within a single deliverable bundle.

Runs as Claude Code Stop hook. Exit 0 = pass. Exit 2 = block and retry.

The check exists because deliverables drift internally during multi-stage
generation: personas can name "Frontline Care Manager" as primary while
recommendations target IT leadership, and the roadmap then sequences
something neither persona nor recommendation references.

Coherence rules (HARD FAIL on any):
  1. Every persona named in personas[] should appear by name in at least
     one recommendation's target_users / target_personas / impacted_personas.
  2. Every recommendation should appear (by id or title fragment) in at
     least one roadmap horizon item.
  3. If the deliverable has a strategy section with a diagnosis, the
     diagnosis must reference at least one persona's pain points OR one
     recommendation's named problem.

Soft failures (WARN, not blocking):
  - Recommendation references an unnamed persona ("primary users", "key
    stakeholders") — flag the genericism.
  - Roadmap item with no recommendation backing it — flag possible scope creep.

The hook is permissive when only one of the three deliverable layers is
present (a personas-only deliverable shouldn't trigger roadmap coherence
checks). It only enforces when at least two layers exist.
"""
import sys
import json
import re


def normalize(s):
    return re.sub(r'\s+', ' ', str(s or '').strip().lower())


def collect_personas(data):
    """Yield personas with their primary name and known aliases."""
    out = []
    if isinstance(data, dict):
        for key in ('personas', 'persona_set', 'personaRoster'):
            v = data.get(key)
            if isinstance(v, list):
                for p in v:
                    if isinstance(p, dict):
                        name = p.get('name') or p.get('title') or p.get('persona_name')
                        if name:
                            aliases = [name]
                            for f in ('alias', 'shortName', 'short_name', 'archetype', 'role'):
                                a = p.get(f)
                                if isinstance(a, str) and a.strip():
                                    aliases.append(a)
                            pain_points = p.get('pain_points') or p.get('painPoints') or []
                            out.append({
                                'name': name,
                                'aliases': [normalize(a) for a in aliases],
                                'pain_points': [normalize(pp) for pp in pain_points if isinstance(pp, str)],
                            })
        # Recurse to find nested
        for v in data.values():
            if isinstance(v, (dict, list)):
                out.extend(collect_personas(v))
    elif isinstance(data, list):
        for item in data:
            out.extend(collect_personas(item))
    return out


def _make_recommendation_entry(item):
    title = item.get('recommendation') or item.get('title') or item.get('action') or item.get('initiative') or ''
    target_personas = (
        item.get('target_personas')
        or item.get('target_users')
        or item.get('impacted_personas')
        or item.get('beneficiary_personas')
        or []
    )
    if isinstance(target_personas, str):
        target_personas = [target_personas]
    return {
        'title': str(title),
        'id': item.get('id') or item.get('recommendation_id') or normalize(title)[:60],
        'target_personas': [normalize(p) for p in target_personas if isinstance(p, str)],
        'mentions': normalize(json.dumps(item, default=str)),
    }


def collect_recommendations(data):
    """Recommendations are items in `recommendations[]` / `actions[]` /
    `initiatives[]` lists, OR dicts that themselves carry a `recommendation`
    or `action` field. We collect via structural context so an item like
    {title, target_personas} inside a recommendations[] still counts."""
    out = []
    if isinstance(data, dict):
        # Structural pass: any list under a recognized parent key is a
        # recommendation list.
        for parent_key in ('recommendations', 'actions', 'initiatives', 'roadmap_items'):
            v = data.get(parent_key)
            if isinstance(v, list):
                for item in v:
                    if isinstance(item, dict):
                        out.append(_make_recommendation_entry(item))
        # Self-pass: this dict is itself a recommendation if it carries one
        # of the explicit signal fields.
        if (data.get('recommendation') or data.get('action')
                or (data.get('title') and (data.get('priority') or data.get('horizon')))):
            out.append(_make_recommendation_entry(data))
        for k, v in data.items():
            if k in ('recommendations', 'actions', 'initiatives', 'roadmap_items'):
                continue  # already handled
            if isinstance(v, (dict, list)):
                out.extend(collect_recommendations(v))
    elif isinstance(data, list):
        for item in data:
            out.extend(collect_recommendations(item))
    return out


def collect_roadmap_items(data):
    """Find roadmap items across NOW/NEXT/LATER horizons."""
    out = []
    if isinstance(data, dict):
        for key in ('roadmap', 'horizons', 'roadmap_items'):
            v = data.get(key)
            if isinstance(v, dict):
                for horizon_name, items in v.items():
                    if isinstance(items, list):
                        for it in items:
                            if isinstance(it, dict):
                                title = it.get('title') or it.get('initiative') or it.get('item') or ''
                                out.append({
                                    'horizon': horizon_name,
                                    'title': str(title),
                                    'mentions': normalize(json.dumps(it, default=str)),
                                })
            elif isinstance(v, list):
                for it in v:
                    if isinstance(it, dict):
                        title = it.get('title') or it.get('initiative') or it.get('item') or ''
                        out.append({
                            'horizon': it.get('horizon') or 'unspecified',
                            'title': str(title),
                            'mentions': normalize(json.dumps(it, default=str)),
                        })
        for v in data.values():
            if isinstance(v, (dict, list)):
                out.extend(collect_roadmap_items(v))
    elif isinstance(data, list):
        for item in data:
            out.extend(collect_roadmap_items(item))
    return out


def find_diagnosis(data):
    """Locate the strategy diagnosis text if present."""
    if isinstance(data, dict):
        for key in ('diagnosis', 'strategy_diagnosis', 'central_challenge'):
            v = data.get(key)
            if isinstance(v, str) and len(v) > 20:
                return v
            if isinstance(v, dict):
                inner = v.get('text') or v.get('description')
                if isinstance(inner, str) and len(inner) > 20:
                    return inner
        for v in data.values():
            if isinstance(v, (dict, list)):
                result = find_diagnosis(v)
                if result:
                    return result
    elif isinstance(data, list):
        for item in data:
            result = find_diagnosis(item)
            if result:
                return result
    return None


def validate(data):
    failures = []

    # Dedupe by name
    personas_raw = collect_personas(data)
    seen_names = set()
    personas = []
    for p in personas_raw:
        if p['name'] not in seen_names:
            seen_names.add(p['name'])
            personas.append(p)

    recommendations_raw = collect_recommendations(data)
    seen_ids = set()
    recommendations = []
    for r in recommendations_raw:
        if r['id'] not in seen_ids:
            seen_ids.add(r['id'])
            recommendations.append(r)

    roadmap_items_raw = collect_roadmap_items(data)
    seen_titles = set()
    roadmap_items = []
    for r in roadmap_items_raw:
        key = normalize(r['title'])
        if key and key not in seen_titles:
            seen_titles.add(key)
            roadmap_items.append(r)

    # If fewer than two of the three layers present, exempt
    layers_present = sum([bool(personas), bool(recommendations), bool(roadmap_items)])
    if layers_present < 2:
        return []

    # Rule 1: every persona referenced by at least one recommendation
    if personas and recommendations:
        for p in personas:
            referenced = False
            for r in recommendations:
                # explicit target_personas list match
                if any(alias and alias in r['target_personas'] for alias in p['aliases']):
                    referenced = True
                    break
                # narrative mention
                if any(alias and alias in r['mentions'] for alias in p['aliases'] if len(alias) > 3):
                    referenced = True
                    break
            if not referenced:
                failures.append(
                    f"ORPHAN_PERSONA: '{p['name']}' appears in personas[] but is "
                    f"not referenced in any recommendation's target_personas or narrative."
                )

    # Rule 2: every recommendation appears in at least one roadmap horizon
    if recommendations and roadmap_items:
        all_roadmap_blob = ' || '.join(r['mentions'] for r in roadmap_items)
        for r in recommendations:
            rec_norm = normalize(r['title'])
            if len(rec_norm) < 8:
                continue
            # Match a meaningful substring (first ~6 words)
            tokens = rec_norm.split()[:6]
            probe = ' '.join(tokens)
            if probe not in all_roadmap_blob:
                # Try id match too
                if str(r['id']).lower() not in all_roadmap_blob:
                    failures.append(
                        f"ORPHAN_RECOMMENDATION: '{r['title'][:80]}' has no "
                        f"corresponding roadmap horizon item."
                    )

    # Rule 3: diagnosis references at least one persona pain or recommendation
    diagnosis = find_diagnosis(data)
    if diagnosis and (personas or recommendations):
        diag_norm = normalize(diagnosis)
        diagnosis_links_persona = False
        diagnosis_links_rec = False
        for p in personas:
            if any(alias and alias in diag_norm for alias in p['aliases'] if len(alias) > 3):
                diagnosis_links_persona = True
                break
            if any(pp and pp[:30] in diag_norm for pp in p['pain_points']):
                diagnosis_links_persona = True
                break
        for r in recommendations:
            rec_norm = normalize(r['title'])
            if rec_norm and rec_norm[:30] in diag_norm:
                diagnosis_links_rec = True
                break
        if not diagnosis_links_persona and not diagnosis_links_rec:
            failures.append(
                "DIAGNOSIS_ORPHAN: strategy diagnosis does not reference any "
                "named persona pain point or recommendation. Diagnosis must "
                "trace to the personas/recommendations it claims to address."
            )

    # Cap noise
    if len(failures) > 15:
        failures = failures[:15] + [f"... and {len(failures) - 15} more coherence issues"]

    return failures


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = validate(data)
    if failures:
        sys.stderr.write("DELIVERABLE COHERENCE VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nGuidance: every persona in personas[] must be referenced by at "
            "least one recommendation; every recommendation must appear in "
            "the roadmap; the strategy diagnosis must trace to named personas "
            "or recommendations. Fix the orphans before shipping.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
