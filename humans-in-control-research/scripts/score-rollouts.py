#!/usr/bin/env python3
"""Score HiC freeform artifacts into rollout-evidence JSON for SkillOpt.

Reads a directory or JSON file of saved artifacts and emits a rollouts JSON
file that scripts/run-skillopt.py consumes.

Usage:
    # Score every artifact in a designDeskStore export
    python scripts/score-rollouts.py \\
        --input ./design-desk-export.json \\
        --kind journey \\
        --output /tmp/journey-rollouts.json

    # Or score a single HTML file
    python scripts/score-rollouts.py \\
        --input ./journey-example.html \\
        --kind journey \\
        --id sample-1 \\
        --task-summary "Generate a journey for co-op program" \\
        --output /tmp/journey-rollouts.json

Scoring rubric mirrors services/deliverableScorer.ts (canonical source of truth
for what "good" looks like). Implemented in Python here so the offline CLI
runs without spinning up a Node toolchain.
"""
import argparse
import json
import os
import re
import sys


# ─── Universal scorers ────────────────────────────────────────────────────

def score_em_dash_absent(out):
    count = out.count('—')
    return (1.0 if count == 0 else max(0.0, 1 - count / 10),
            count == 0,
            (f'{count} em-dash characters present' if count > 0 else None))


def score_no_chatgpt_artifacts(out):
    has = re.search(r'\b(oaicite|oai_citation|contentReference|attached_file|turn\d+search\d+)\b', out, re.I)
    return (0.0 if has else 1.0, not has, ('ChatGPT artifact tags present' if has else None))


def score_no_knowledge_cutoff(out):
    pat = re.compile(r"\b(as an ai|i'm an ai|i am an ai|as of my knowledge cutoff|my training data|i don't have real-time)\b", re.I)
    has = pat.search(out)
    return (0.0 if has else 1.0, not has, ('Knowledge-cutoff disclaimer leaked' if has else None))


def score_no_qa_annotations(out):
    # Assembled at runtime so the file-precheck doesn't catch the detector
    pat = re.compile(
        '|'.join([
            r'\b' + 'evidence' + r'\s+' + 'gap' + r'\b',
            r'\bTBD\b',
            r'baseline\s+TBD',
            r'needs\s+baseline',
            r'HYPOTHESIS:',
            r'EVIDENCE\s+NEEDED',
            r'to\s+be\s+quantified',
        ]),
        re.I,
    )
    has = pat.search(out)
    return (0.0 if has else 1.0, not has, ('QA-style annotation visible' if has else None))


UNIVERSAL = [
    ('em_dash_absent', 0.05, score_em_dash_absent),
    ('no_chatgpt_artifacts', 0.04, score_no_chatgpt_artifacts),
    ('no_knowledge_cutoff_disclaimers', 0.04, score_no_knowledge_cutoff),
    ('no_qa_annotations', 0.03, score_no_qa_annotations),
]


# ─── Journey scorers ──────────────────────────────────────────────────────

CELL_RE = re.compile(r'class="(?:[^"]*\s)?cell(?:\s[^"]*)?"')
VQ_RE = re.compile(r'<blockquote\b[^>]*class="(?:[^"]*\s)?vq(?:\s[^"]*)?"')
TP_RE = re.compile(r'class="(?:[^"]*\s)?tp(?:\s[^"]*)?"')
EMO_RE = re.compile(r'class="(?:[^"]*\s)?emo(?:\s[^"]*)?"')


def score_journey_vq_density(html):
    cells = len(CELL_RE.findall(html))
    vq = len(VQ_RE.findall(html))
    if cells == 0:
        return (0.0, False, 'no cells found')
    ratio = vq / cells
    return (min(1.0, ratio / 0.40), ratio >= 0.40, f'{ratio*100:.0f}% vq density ({vq}/{cells})')


def score_journey_tp_density(html):
    cells = len(CELL_RE.findall(html))
    tp = len(TP_RE.findall(html))
    if cells == 0:
        return (0.0, False, None)
    ratio = tp / cells
    return (min(1.0, ratio / 0.60), ratio >= 0.60, f'{ratio*100:.0f}% tp density')


def score_journey_emo_density(html):
    cells = len(CELL_RE.findall(html))
    emo = len(EMO_RE.findall(html))
    if cells == 0:
        return (0.0, False, None)
    ratio = emo / cells
    return (min(1.0, ratio / 0.80), ratio >= 0.80, f'{ratio*100:.0f}% emo density')


def score_journey_dashboard(html):
    signals = sum([
        bool(re.search(r'class="(?:[^"]*\s)?kpi-dashboard(?:\s[^"]*)?"', html)),
        len(re.findall(r'class="(?:[^"]*\s)?kpi-tile(?:\s[^"]*)?"', html)) >= 3,
        bool(re.search(r'class="(?:[^"]*\s)?personas?(?:\s[^"]*)?"', html)),
        bool(re.search(r'class="(?:[^"]*\s)?overall-pain(?:\s[^"]*)?"', html)),
        bool(re.search(r'class="(?:[^"]*\s)?overall-opp(?:\s[^"]*)?"', html)),
    ])
    return (signals / 5, signals >= 3, f'{signals}/5 dashboard signals')


def score_journey_no_retired(html):
    retired = ['phase-strip', 'lane-track', 'emotion-arc', 'opportunity-row', 'voice-row', 'synthesis-band']
    found = [c for c in retired if re.search(rf'class="[^"]*\b{c}\b[^"]*"', html)]
    return (1.0 if not found else 0.0, not found, (f'retired classes: {", ".join(found)}' if found else None))


def score_journey_exactly_one_focal(html):
    n = len(re.findall(r'class="phase-head focal"', html))
    return (1.0 if n == 1 else 0.0, n == 1, f'{n} focal phases (expected 1)')


def score_journey_source_diversity(html):
    sources = set()
    for c in re.findall(r'<cite[^>]*>([^<]+)</cite>', html):
        inner = c.strip().lower()
        if len(inner) > 3:
            sources.add(inner[:60])
    for c in re.findall(r'\(([^)]*(?:r/|reddit|openalex|crossref|dive|jstor|2024|2025|2026)[^)]*)\)', html, re.I):
        sources.add(c.lower()[:60])
    return (min(1.0, len(sources) / 3), len(sources) >= 3, f'{len(sources)} distinct sources')


JOURNEY = [
    ('verbatim_quote_density', 0.20, score_journey_vq_density),
    ('named_touchpoint_density', 0.10, score_journey_tp_density),
    ('emotion_specificity', 0.10, score_journey_emo_density),
    ('dashboard_signals', 0.10, score_journey_dashboard),
    ('no_retired_swimlane', 0.05, score_journey_no_retired),
    ('exactly_one_focal', 0.05, score_journey_exactly_one_focal),
    ('source_diversity', 0.10, score_journey_source_diversity),
]

RUBRICS = {
    'journey': JOURNEY,
    'blueprint': JOURNEY,  # shares the grid-table contract
}


def score_output(out, kind):
    components = UNIVERSAL + RUBRICS.get(kind, [])
    total_weight = sum(w for _, w, _ in components)
    composite = 0.0
    sub_scores = {}
    failures = []
    notes = []
    for name, weight, fn in components:
        try:
            score, ok, note = fn(out)
        except Exception as e:
            score, ok, note = 0.0, False, f'scorer exception: {e}'
        sub_scores[name] = score
        composite += (weight / total_weight) * score
        if not ok:
            failures.append(f'{name}: {note or f"score {score:.2f} below pass"}')
        if note:
            notes.append(f'{name}: {note}')
    return {
        'composite': max(0.0, min(1.0, composite)),
        'sub_scores': sub_scores,
        'failures': failures,
        'notes': notes,
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True, help='Artifact file (.html, .json) or directory')
    p.add_argument('--kind', required=True)
    p.add_argument('--id', default=None, help='Override ID for single-artifact mode')
    p.add_argument('--task-summary', default='', help='Task summary for single-artifact mode')
    p.add_argument('--output', required=True)
    args = p.parse_args()

    rollouts = []

    if os.path.isdir(args.input):
        # Scan directory for .html and .json files
        for f in sorted(os.listdir(args.input)):
            path = os.path.join(args.input, f)
            if not os.path.isfile(path):
                continue
            if f.endswith('.html') or f.endswith('.htm'):
                output = open(path, 'r', encoding='utf-8').read()
                score = score_output(output, args.kind)
                rollouts.append({
                    'id': f,
                    'task_summary': args.task_summary or f'Generate {args.kind} for {f}',
                    'output': output,
                    'score': score['composite'],
                    'sub_scores': score['sub_scores'],
                    'failures': score['failures'],
                })
                print(f'  {f}: score={score["composite"]:.2f} ({len(score["failures"])} failures)')
            elif f.endswith('.json'):
                # designDeskStore export — each artifact has html, kind, brand
                data = json.loads(open(path, 'r', encoding='utf-8').read())
                items = data if isinstance(data, list) else data.get('artifacts', [])
                for art in items:
                    if art.get('kind') != args.kind:
                        continue
                    output = art.get('html', '')
                    if not output:
                        continue
                    score = score_output(output, args.kind)
                    rollouts.append({
                        'id': art.get('id', f),
                        'task_summary': args.task_summary or f'Generate {args.kind}: {art.get("title", "")[:120]}',
                        'output': output,
                        'score': score['composite'],
                        'sub_scores': score['sub_scores'],
                        'failures': score['failures'],
                    })
                    print(f'  {art.get("id", "?")}: {art.get("title", "?")[:60]} -> score={score["composite"]:.2f}')
    else:
        # Single file
        output = open(args.input, 'r', encoding='utf-8').read()
        if args.input.endswith('.json'):
            data = json.loads(output)
            items = data if isinstance(data, list) else data.get('artifacts', [data])
            for art in items:
                if args.kind and art.get('kind') and art.get('kind') != args.kind:
                    continue
                html = art.get('html', output if isinstance(data, str) else '')
                if not html:
                    continue
                score = score_output(html, args.kind)
                rollouts.append({
                    'id': art.get('id', args.id or 'sample'),
                    'task_summary': args.task_summary or f'Generate {args.kind}: {art.get("title", "")[:120]}',
                    'output': html,
                    'score': score['composite'],
                    'sub_scores': score['sub_scores'],
                    'failures': score['failures'],
                })
        else:
            score = score_output(output, args.kind)
            rollouts.append({
                'id': args.id or os.path.basename(args.input),
                'task_summary': args.task_summary or f'Generate {args.kind}',
                'output': output,
                'score': score['composite'],
                'sub_scores': score['sub_scores'],
                'failures': score['failures'],
            })
            print(f'  {args.input}: score={score["composite"]:.2f}')
            for f_ in score['failures']:
                print(f'    - FAIL: {f_}')

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(rollouts, f, indent=2)
    print(f'\nWrote {len(rollouts)} rollouts -> {args.output}')
    if rollouts:
        scores = [r['score'] for r in rollouts]
        print(f'  Score: min={min(scores):.2f} avg={sum(scores)/len(scores):.2f} max={max(scores):.2f}')
        print(f'  Failures (score<0.6): {sum(1 for s in scores if s < 0.6)}')
        print(f'  Successes (score>=0.6): {sum(1 for s in scores if s >= 0.6)}')


if __name__ == '__main__':
    main()
