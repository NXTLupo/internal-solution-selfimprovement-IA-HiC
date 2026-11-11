#!/usr/bin/env python3
"""Freeze the measured baseline the transformation is compared against (Phase 0).

Reads only what is already on disk under humans-in-control-research/hic-workspace: the usage
ledgers, the telemetry event sink, the session folders and the saved artifacts. It generates
nothing and calls nothing. Output: baseline-<date>.json beside this script, holding

  platform   spend, calls, cache share per model, chain pass rate, per-judge pass rates, labels
  sessions   per engagement: runs, model calls, spend, chain verdicts, last activity
  regression the ten most active engagements, PROPOSED as the regression set (the owner confirms)

Usage (from the repo root):
    python docs/ia-transformation/build_baseline.py [YYYY-MM-DD]
"""
import collections
import datetime as dt
import glob
import io
import json
import os
import statistics
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WS = os.path.join(ROOT, 'humans-in-control-research', 'hic-workspace')


def jsonl(path):
    out = []
    try:
        for line in io.open(path, encoding='utf-8', errors='replace'):
            line = line.strip()
            if line.startswith('{'):
                try:
                    out.append(json.loads(line))
                except ValueError:
                    pass
    except OSError:
        pass
    return out


def main():
    stamp = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().isoformat()
    events = jsonl(os.path.join(WS, 'telemetry', 'events.jsonl'))
    usage = []
    usage_by_session = collections.defaultdict(list)
    for f in glob.glob(os.path.join(WS, 'sessions', '**', 'usage.jsonl'), recursive=True):
        slug = os.path.relpath(f, os.path.join(WS, 'sessions')).split(os.sep)[0]
        rows = jsonl(f)
        usage += rows
        usage_by_session[slug] += rows

    by_model = collections.defaultdict(lambda: {'calls': 0, 'input': 0, 'output': 0, 'cache_read': 0, 'cost': 0.0})
    for r in usage:
        m = by_model[r.get('model') or '?']
        m['calls'] += 1
        m['input'] += r.get('input_tokens') or 0
        m['output'] += r.get('output_tokens') or 0
        m['cache_read'] += r.get('cache_read_tokens') or 0
        m['cost'] += r.get('cost_usd') or 0
    for m in by_model.values():
        m['cache_read_share'] = round(m['cache_read'] / max(1, m['cache_read'] + m['input']), 3)
        m['cost'] = round(m['cost'], 2)
    total_cost = round(sum(m['cost'] for m in by_model.values()), 2)

    run_cost = collections.defaultdict(float)
    for r in usage:
        run_cost[r.get('run_id')] += r.get('cost_usd') or 0
    costs = sorted(run_cost.values())

    post = [e for e in events if e.get('kind') == 'post_chain']
    judges = collections.defaultdict(lambda: [0, 0])
    for e in events:
        if e.get('kind') == 'verdict':
            judges[e.get('judge_id')][0] += 1
            judges[e.get('judge_id')][1] += 1 if e.get('pass') else 0

    platform = {
        'window': [min((r['ts'] for r in usage), default=None), max((r['ts'] for r in usage), default=None)],
        'model_calls': len(usage), 'spend_usd': total_cost,
        'by_model': dict(sorted(by_model.items(), key=lambda kv: -kv[1]['cost'])),
        'cost_per_run': {'runs': len(costs), 'median': round(statistics.median(costs), 2) if costs else None,
                         'p90': round(costs[int(len(costs) * .9)], 2) if costs else None,
                         'max': round(costs[-1], 2) if costs else None},
        'post_chain': {'n': len(post), 'pass': sum(1 for e in post if e.get('pass'))},
        'judge_pass_rate': {j: {'n': n, 'pass_rate': round(p / n, 2)} for j, (n, p) in
                            sorted(judges.items(), key=lambda kv: kv[1][1] / max(1, kv[1][0]))},
        'event_kinds': dict(collections.Counter(e.get('kind') for e in events)),
        'human_labels': sum(1 for e in events if e.get('kind') == 'label'),
        'skills_fired': dict(collections.Counter(e.get('skill_id') for e in events if e.get('kind') == 'skill')),
        'agent_turns': sum(1 for e in events if e.get('kind') == 'agent_turn'),
    }

    chain_by_slug = collections.defaultdict(lambda: [0, 0])
    for e in post:
        slug = str(e.get('run_id') or '')
        chain_by_slug[slug][0] += 1
        chain_by_slug[slug][1] += 1 if e.get('pass') else 0

    sessions = []
    base = os.path.join(WS, 'sessions')
    for slug in sorted(os.listdir(base)):
        d = os.path.join(base, slug)
        if not os.path.isdir(d) or slug.startswith(('_', '.')):
            continue
        states = glob.glob(os.path.join(d, '**', 'state.json'), recursive=True)
        files = [os.path.join(dp, f) for dp, _dn, fn in os.walk(d) for f in fn]
        last = max((os.path.getmtime(f) for f in files), default=0)
        rows = usage_by_session.get(slug, [])
        cp = [0, 0]   # assigned below, once per truncated slug
        sessions.append({
            'slug': slug, 'runs': len(states), 'files': len(files),
            'model_calls': len(rows), 'spend_usd': round(sum(r.get('cost_usd') or 0 for r in rows), 2),
            'post_chain': {'n': cp[0], 'pass': cp[1]},
            'merged_into_other': os.path.exists(os.path.join(d, 'MERGED_INTO.txt')),
            'last_activity': dt.datetime.fromtimestamp(last).strftime('%Y-%m-%d') if last else None,
        })

    # The event sink keys post-chain rows by a truncated engagement slug, and several session folders can
    # share that prefix. Each key's verdicts go to ONE session: the one with the most recorded work.
    for key, (n, passed) in chain_by_slug.items():
        match = [s for s in sessions if key and s['slug'].startswith(key[:60])]
        if match:
            best = max(match, key=lambda s: (s['model_calls'], s['runs']))
            best['post_chain'] = {'n': best['post_chain']['n'] + n, 'pass': best['post_chain']['pass'] + passed}

    live = [s for s in sessions if not s['merged_into_other']]
    ranked = sorted(live, key=lambda s: (s['post_chain']['n'] * 5 + s['model_calls'] / 20 + s['runs'] * 2, s['last_activity'] or ''), reverse=True)
    regression, seen_topics = [], set()
    for s in ranked:
        topic = s['slug'][:40]          # one engagement per subject, so the set is not ten copies of one
        if topic in seen_topics:
            continue
        seen_topics.add(topic)
        regression.append({'slug': s['slug'], 'why': 'runs=%d, model calls=%d, chain verdicts=%d (pass %d), last active %s' % (
            s['runs'], s['model_calls'], s['post_chain']['n'], s['post_chain']['pass'], s['last_activity'])})
        if len(regression) == 10:
            break

    artifacts = glob.glob(os.path.join(WS, 'artifacts', '*.json'))
    out = {'frozen': stamp, 'source': 'hic-workspace on disk; nothing generated, nothing called',
           'platform': platform, 'saved_artifacts': len(artifacts), 'sessions': sessions,
           'regression_set_proposed': regression,
           'note': 'The regression set is a proposal ranked by recorded activity. The owner confirms or replaces it.'}
    path = os.path.join(os.path.dirname(__file__), 'baseline-%s.json' % stamp)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(out, fh, indent=1)
        fh.write('\n')
    print('spend USD %s over %d calls | chain pass %d of %d | labels %d | sessions %d (live %d) | artifacts %d' % (
        total_cost, len(usage), platform['post_chain']['pass'], platform['post_chain']['n'],
        platform['human_labels'], len(sessions), len(live), len(artifacts)))
    print('proposed regression set:')
    for r in regression:
        print('  %-70s %s' % (r['slug'][:70], r['why']))
    print('wrote', os.path.relpath(path, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
