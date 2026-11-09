#!/usr/bin/env python3
"""Extract HiC rollouts for SkillOpt from what the system actually produced.

2026-10-30 (WS-5 R3, plan harness-capability-curve-uplift): the previous extractor scanned
`hic-workspace/sample-artifacts/` (deleted) and `hic-workspace/artifacts/` by a filename regex that
matched 0 of 77 saved artifacts, so every SkillOpt batch SKIPped. The sources are now the records
the harness writes on every run:

  1. AIR records      hic-workspace/sessions/<slug>/artifacts/*.air.json  (artifactPayload.content, the chain's
                      post-chain verdict and review scores, the deterministic failures; scored by the chain)
  2. saved artifacts  hic-workspace/artifacts/*.json (kind read from the JSON body, not the filename)
  3. the event sink   hic-workspace/telemetry/events.jsonl (rescore rows refresh an artifact's pass/score)
  4. legacy names     NN-kind-BRAND.html under artifacts/ or sample-artifacts/ (kept for old fixtures)

Usage:
    python scripts/extract-rollouts.py --workspace hic-workspace --out-dir ../tmp/skillopt-rollouts
        [--since-hours 0] [--max-per-kind 60] [--min-rollouts 1]

Output: <out-dir>/<kind>-rollouts.json, one list of {id, task_summary, output, score, sub_scores,
failures, brand, source, run_id, artifact_id, chain_pass} per training kind.
"""
import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import util as _imp_util
_score_spec = _imp_util.spec_from_file_location('score_rollouts', os.path.join(os.path.dirname(__file__), 'score-rollouts.py'))
score_mod = _imp_util.module_from_spec(_score_spec)
_score_spec.loader.exec_module(score_mod)


FILENAME_KIND_RE = re.compile(r'^\d+[a-z]?-([a-z\-]+?)(?:-(NU|NXT|nu|nxt|deciem|DECIEM))?\.(html|json|md)$', re.I)

# every spelling the AIR, the saved artifacts and the old filenames use -> the training kind the batch expects
KIND_ALIASES = {
    'journey': 'journey', 'journey-map': 'journey', 'blueprint': 'blueprint', 'service-blueprint': 'blueprint',
    'persona': 'persona', 'personas': 'persona', 'gap-analysis': 'gap-analysis', 'gap': 'gap-analysis',
    'roadmap': 'roadmap', 'timeline': 'roadmap', 'strategy-slide': 'strategy-slide', 'slides': 'strategy-slide',
    'strategy': 'strategy-slide', 'presentation': 'strategy-slide', 'deck': 'strategy-slide',
    'recommendation': 'recommendation', 'recs': 'recommendation', 'recommendations': 'recommendation',
    'org': 'org', 'org-chart': 'org', 'arch': 'arch', 'architecture-map': 'arch', 'prd': 'prd',
    'tech-audit': 'tech-audit', 'audit': 'tech-audit', 'systems-inventory': 'tech-audit',
    'competitive': 'competitive', 'compete': 'competitive', 'competitive-matrix': 'competitive',
    'heuristic-ux': 'heuristic-ux', 'mindmap': 'mindmap', 'mind-map': 'mindmap', 'brief-dialog': 'brief-dialog',
    'meta-themes': 'meta-themes', 'themes': 'meta-themes', 'research-plan': 'research-plan', 'case-study': 'strategy-slide',
    'report': 'strategy-slide',
}


def norm_kind(raw):
    k = str(raw or '').strip().lower().lstrip('#')
    return KIND_ALIASES.get(k)


def classify_filename(fn):
    m = FILENAME_KIND_RE.match(fn)
    if not m:
        return None, None
    return norm_kind(m.group(1)), ((m.group(2) or '').lower() or None)


def task_summary_for(path, kind, content, title=''):
    if title:
        return f'Generate {kind} artifact: {str(title)[:200]}'
    m = re.search(r'<title[^>]*>([^<]+)</title>', content, re.I) or re.search(r'<h[12][^>]*>([^<]+)</h[12]>', content, re.I)
    if m:
        return f'Generate {kind} artifact: {m.group(1).strip()[:200]}'
    m = re.search(r'"title"\s*:\s*"([^"]{8,200})"', content)
    if m:
        return f'Generate {kind} artifact: {m.group(1)[:200]}'
    return f'Generate {kind} artifact from {os.path.basename(path)}'


def _mean(values):
    vals = [float(v) for v in values if isinstance(v, (int, float)) and not isinstance(v, bool)]
    return sum(vals) / len(vals) if vals else None


# ----------------------------------------------------------------------------- sources
def rollouts_from_air(workspace, since_ts):
    """AIR records: the artifact text plus the chain's own verdict."""
    base = os.path.join(workspace, 'sessions')
    if not os.path.isdir(base):
        return []
    out = []
    for root, _dirs, files in os.walk(base):
        if os.path.basename(root) != 'artifacts':
            continue
        slug = os.path.basename(os.path.dirname(root))
        for fn in files:
            if not fn.endswith('.air.json'):
                continue
            fp = os.path.join(root, fn)
            try:
                if since_ts and os.path.getmtime(fp) < since_ts:
                    continue
                with open(fp, 'r', encoding='utf-8') as f:
                    air = json.load(f)
            except Exception:
                continue
            if not isinstance(air, dict):
                continue
            kind = norm_kind(air.get('artifactType') or air.get('trigger') or (air.get('artifactPayload') or {}).get('kind'))
            if not kind:
                continue
            payload = air.get('artifactPayload') if isinstance(air.get('artifactPayload'), dict) else {}
            content = payload.get('content')
            if not isinstance(content, str):
                content = json.dumps(payload.get('slides') or payload, ensure_ascii=False)[:60000]
            if len(content) < 200:
                continue
            pc = air.get('postChain') if isinstance(air.get('postChain'), dict) else {}
            qr = air.get('qualityReport') if isinstance(air.get('qualityReport'), dict) else {}
            chain_pass = pc.get('chainPass', qr.get('chainPass'))
            review = {k: v for k, v in (qr.get('reviewScores') or {}).items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
            rubric = score_mod.score_output(content, kind)
            sub_scores = dict(rubric['sub_scores'])
            for k in ('p0_coverage', 'prose_overall'):
                if k in review and 0 <= float(review[k]) <= 1:
                    sub_scores[k] = float(review[k])
            chain_mean = _mean([v for k, v in review.items() if k in ('p0_coverage', 'prose_overall')])
            composite = rubric['composite'] if chain_mean is None else (0.5 * rubric['composite'] + 0.5 * chain_mean)
            if chain_pass is True:
                composite = max(composite, 0.6)
            elif chain_pass is False:
                composite = min(composite, 0.59)
            failures = list(rubric['failures']) + [str(x) for x in (qr.get('deterministicFailures') or [])][:12]
            obj = air.get('objective') if isinstance(air.get('objective'), dict) else {}
            out.append({
                'id': f'air:{slug}/{fn[:-9]}',
                'task_summary': f'Generate {kind} artifact: {str(obj.get("userObjective") or "")[:200]}' if obj.get('userObjective') else task_summary_for(fp, kind, content),
                'output': content[:60000],
                'score': round(float(composite), 4),
                'sub_scores': sub_scores,
                'failures': failures,
                'brand': None,
                'source': 'air',
                'run_id': air.get('runId'),
                'artifact_id': air.get('artifactId'),
                'chain_pass': chain_pass,
                'epoch_id': air.get('epochId'),
                'mtime': os.path.getmtime(fp),
            })
    return out


def rollouts_from_saved_artifacts(workspace, since_ts):
    """hic-workspace/artifacts/*.json: the kind is in the body."""
    base = os.path.join(workspace, 'artifacts')
    if not os.path.isdir(base):
        return []
    out = []
    for fn in os.listdir(base):
        fp = os.path.join(base, fn)
        if not os.path.isfile(fp):
            continue
        try:
            if since_ts and os.path.getmtime(fp) < since_ts:
                continue
            with open(fp, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            continue
        kind, brand = classify_filename(fn)
        title = ''
        output_text = content
        if fn.endswith('.json'):
            try:
                data = json.loads(content)
            except Exception:
                data = None
            if isinstance(data, dict):
                kind = kind or norm_kind(data.get('kind') or data.get('type') or data.get('artifactType') or data.get('template'))
                brand = brand or (str(data.get('brand') or '').lower() or None)
                title = data.get('title') or data.get('name') or data.get('headline') or ''
                if isinstance(data.get('html'), str):
                    output_text = data['html']
                elif isinstance(data.get('content'), str):
                    output_text = data['content']
        if not kind or len(output_text) < 200:
            continue
        rubric = score_mod.score_output(output_text, kind)
        out.append({
            'id': f'artifact:{fn}', 'task_summary': task_summary_for(fp, kind, content, title), 'output': output_text[:60000],
            'score': rubric['composite'], 'sub_scores': rubric['sub_scores'], 'failures': rubric['failures'],
            'brand': brand, 'source': 'saved-artifact', 'run_id': None, 'artifact_id': None, 'chain_pass': None,
            'mtime': os.path.getmtime(fp),
        })
    return out


def rollouts_from_legacy_names(workspace, since_ts):
    out = []
    for base in (os.path.join(workspace, 'sample-artifacts'),):
        if not os.path.isdir(base):
            continue
        for root, _d, files in os.walk(base):
            for fn in files:
                kind, brand = classify_filename(fn)
                if not kind:
                    continue
                fp = os.path.join(root, fn)
                try:
                    if since_ts and os.path.getmtime(fp) < since_ts:
                        continue
                    content = open(fp, 'r', encoding='utf-8').read()
                except Exception:
                    continue
                rubric = score_mod.score_output(content, kind)
                out.append({'id': os.path.relpath(fp, workspace), 'task_summary': task_summary_for(fp, kind, content), 'output': content[:60000],
                            'score': rubric['composite'], 'sub_scores': rubric['sub_scores'], 'failures': rubric['failures'], 'brand': brand,
                            'source': 'legacy', 'run_id': None, 'artifact_id': None, 'chain_pass': None, 'mtime': os.path.getmtime(fp)})
    return out


def apply_sink_rescores(workspace, rollouts):
    """The newest `rescore` row per artifact in the event sink overrides the stored verdict."""
    p = os.path.join(workspace, 'telemetry', 'events.jsonl')
    if not os.path.exists(p):
        return 0
    latest = {}
    try:
        with open(p, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except Exception:
                    continue
                if row.get('kind') == 'rescore' and row.get('artifact_id'):
                    latest[str(row['artifact_id'])] = row
    except Exception:
        return 0
    touched = 0
    for r in rollouts:
        row = latest.get(str(r.get('artifact_id') or ''))
        if not row:
            continue
        if row.get('pass') is True:
            r['score'] = max(r['score'], 0.6)
        elif row.get('pass') is False:
            r['score'] = min(r['score'], 0.59)
        if isinstance(row.get('judge_scores'), dict):
            r['sub_scores'] = {**r['sub_scores'], **{k: v for k, v in row['judge_scores'].items() if isinstance(v, (int, float))}}
        r['rescored_at'] = row.get('ts')
        touched += 1
    return touched


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--workspace', default='humans-in-control-research/hic-workspace')
    p.add_argument('--out-dir', required=True)
    p.add_argument('--min-rollouts', type=int, default=1, help='Skip kinds with fewer than this many rollouts')
    p.add_argument('--since-hours', type=float, default=0, help='Only records modified in the last N hours (0 = all)')
    p.add_argument('--max-per-kind', type=int, default=60, help='Newest N rollouts per kind')
    args = p.parse_args()

    if not os.path.isdir(args.workspace):
        print(f'workspace not found: {args.workspace}', file=sys.stderr)
        sys.exit(1)
    os.makedirs(args.out_dir, exist_ok=True)
    since_ts = (time.time() - args.since_hours * 3600) if args.since_hours > 0 else 0

    rollouts = []
    for fn in (rollouts_from_air, rollouts_from_saved_artifacts, rollouts_from_legacy_names):
        try:
            rollouts.extend(fn(args.workspace, since_ts))
        except Exception as e:
            print(f'  {fn.__name__} failed: {e}', file=sys.stderr)
    rescored = apply_sink_rescores(args.workspace, rollouts)

    by_kind = {}
    for r in rollouts:
        kind = norm_kind(r.get('kind')) if r.get('kind') else None
        # the kind rides in the id prefix for AIR/legacy; re-derive from the summary line
        m = re.match(r'Generate ([a-z\-]+) artifact', r['task_summary'])
        kind = kind or (m.group(1) if m else None)
        if not kind:
            continue
        by_kind.setdefault(kind, []).append(r)

    if not by_kind:
        print('no rollouts found under', args.workspace, file=sys.stderr)
        sys.exit(1)

    print(f'Found {len(rollouts)} rollouts across {len(by_kind)} kinds ({rescored} refreshed from the event sink):')
    for kind, items in sorted(by_kind.items()):
        src = {}
        for it in items:
            src[it['source']] = src.get(it['source'], 0) + 1
        print(f'  {kind}: {len(items)} ({", ".join(f"{k}={v}" for k, v in sorted(src.items()))})')

    for kind, items in sorted(by_kind.items()):
        if len(items) < args.min_rollouts:
            print(f'SKIP {kind}: only {len(items)} rollouts (min={args.min_rollouts})')
            continue
        items.sort(key=lambda r: r.get('mtime') or 0, reverse=True)
        items = items[:args.max_per_kind]
        for it in items:
            it.pop('mtime', None)
        out_path = os.path.join(args.out_dir, f'{kind}-rollouts.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        scores = [r['score'] for r in items]
        print(f'{kind}: {len(items)} rollouts -> {out_path}')
        print(f'  scores: min={min(scores):.2f} avg={sum(scores)/len(scores):.2f} max={max(scores):.2f}; '
              f'failures={sum(1 for s in scores if s < 0.6)} successes={sum(1 for s in scores if s >= 0.6)}')

    print(f'\nDone. Output: {args.out_dir}')


if __name__ == '__main__':
    main()
