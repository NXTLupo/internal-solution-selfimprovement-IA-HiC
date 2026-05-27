#!/usr/bin/env python3
"""Extract HiC freeform-artifact rollouts from hic-workspace/sample-artifacts/
and the saved artifacts/ directory.

Walks the artifact directories, classifies each file by kind (parsed from
filename: NN-kind-BRAND.html / NN-kind.json), scores it via score-rollouts'
rubric, and emits per-kind rollouts JSON files.

Usage:
    python scripts/extract-rollouts.py \\
        --workspace humans-in-control-research/hic-workspace \\
        --out-dir /d/tmp/rollouts \\
        --min-rollouts 1

Output: <out-dir>/<kind>-rollouts.json
"""
import argparse
import json
import os
import re
import sys

# Reuse scoring from score-rollouts
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import util as _imp_util
_score_spec = _imp_util.spec_from_file_location('score_rollouts', os.path.join(os.path.dirname(__file__), 'score-rollouts.py'))
score_mod = _imp_util.module_from_spec(_score_spec)
_score_spec.loader.exec_module(score_mod)


FILENAME_KIND_RE = re.compile(r'^\d+[a-z]?-([a-z\-]+?)(?:-(NU|NXT|nu|nxt))?\.(html|json|md)$', re.I)


KIND_ALIASES = {
    'journey': 'journey',
    'blueprint': 'blueprint',
    'persona': 'persona',
    'gap-analysis': 'gap-analysis',
    'gap': 'gap-analysis',
    'roadmap': 'roadmap',
    'strategy-slide': 'strategy-slide',
    'recommendation': 'recommendation',
    'org': 'org',
    'arch': 'arch',
    'prd': 'prd',
    'tech-audit': 'tech-audit',
    'competitive': 'competitive',
    'heuristic-ux': 'heuristic-ux',
    'mindmap': 'mindmap',
    'mind-map': 'mindmap',
    'brief-dialog': 'brief-dialog',
    'meta-themes': 'meta-themes',
    'research-plan': 'research-plan',
}


def classify_filename(fn):
    """Return (kind, brand) or (None, None) if not a recognized artifact filename."""
    m = FILENAME_KIND_RE.match(fn)
    if not m:
        return None, None
    raw_kind = m.group(1).lower()
    brand = (m.group(2) or '').lower() or None
    kind = KIND_ALIASES.get(raw_kind, raw_kind)
    return kind, brand


def scan_directory(workspace_dir):
    """Yield (file_path, kind, brand) for every artifact under workspace_dir."""
    candidate_dirs = [
        os.path.join(workspace_dir, 'sample-artifacts'),
        os.path.join(workspace_dir, 'artifacts'),
    ]
    for base in candidate_dirs:
        if not os.path.isdir(base):
            continue
        for root, _, files in os.walk(base):
            for fn in files:
                kind, brand = classify_filename(fn)
                if kind:
                    yield os.path.join(root, fn), kind, brand


def task_summary_for(path, kind, content):
    """Best-effort summary from filename + content."""
    fn = os.path.basename(path)
    # Look for title tag in HTML
    m = re.search(r'<title[^>]*>([^<]+)</title>', content, re.I)
    if m:
        title = m.group(1).strip()
        return f'Generate {kind} artifact: {title[:200]}'
    # Look for h1/h2 in HTML
    m = re.search(r'<h[12][^>]*>([^<]+)</h[12]>', content, re.I)
    if m:
        return f'Generate {kind} artifact: {m.group(1).strip()[:200]}'
    # JSON: pull a title-like field
    if path.endswith('.json'):
        try:
            data = json.loads(content)
            if isinstance(data, dict):
                title = data.get('title') or data.get('name') or data.get('headline') or ''
                if title:
                    return f'Generate {kind} artifact: {str(title)[:200]}'
        except json.JSONDecodeError:
            pass
    return f'Generate {kind} artifact from {fn}'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--workspace', default='humans-in-control-research/hic-workspace')
    p.add_argument('--out-dir', required=True)
    p.add_argument('--min-rollouts', type=int, default=1, help='Skip kinds with fewer than this many artifacts')
    args = p.parse_args()

    if not os.path.isdir(args.workspace):
        print(f'workspace not found: {args.workspace}', file=sys.stderr)
        sys.exit(1)
    os.makedirs(args.out_dir, exist_ok=True)

    # Group by kind
    by_kind = {}
    for path, kind, brand in scan_directory(args.workspace):
        by_kind.setdefault(kind, []).append((path, brand))

    if not by_kind:
        print('no artifacts found under', args.workspace, file=sys.stderr)
        sys.exit(1)

    print(f'Found artifacts across {len(by_kind)} kinds:')
    for kind, items in sorted(by_kind.items()):
        print(f'  {kind}: {len(items)} artifacts')

    # Score per kind, emit per-kind rollouts file
    for kind, items in sorted(by_kind.items()):
        if len(items) < args.min_rollouts:
            print(f'SKIP {kind}: only {len(items)} artifacts (min={args.min_rollouts})')
            continue
        rollouts = []
        for path, brand in items:
            try:
                content = open(path, 'r', encoding='utf-8').read()
            except Exception as e:
                print(f'  read failed {path}: {e}')
                continue
            # JSON artifacts: extract the html field if present, else use the raw JSON
            output_text = content
            if path.endswith('.json'):
                try:
                    data = json.loads(content)
                    if isinstance(data, dict) and isinstance(data.get('html'), str):
                        output_text = data['html']
                except json.JSONDecodeError:
                    pass
            score = score_mod.score_output(output_text, kind)
            rollouts.append({
                'id': os.path.relpath(path, args.workspace),
                'task_summary': task_summary_for(path, kind, content),
                'output': output_text,
                'score': score['composite'],
                'sub_scores': score['sub_scores'],
                'failures': score['failures'],
                'brand': brand,
            })
        if not rollouts:
            continue
        out_path = os.path.join(args.out_dir, f'{kind}-rollouts.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(rollouts, f, indent=2)
        scores = [r['score'] for r in rollouts]
        print(f'{kind}: {len(rollouts)} rollouts -> {out_path}')
        print(f'  scores: min={min(scores):.2f} avg={sum(scores)/len(scores):.2f} max={max(scores):.2f}')

    print(f'\nDone. Output: {args.out_dir}')


if __name__ == '__main__':
    main()
