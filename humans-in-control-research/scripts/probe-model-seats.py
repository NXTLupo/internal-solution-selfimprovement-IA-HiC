#!/usr/bin/env python3
"""Probe every model in the owner's seat matrix through the proxy's OWN routes (IA plan 6.10, step 2).

A model id answering the provider directly is not enough: the platform sends bodies through
/api/ai/anthropic, /api/ai/openai and /api/ai/gemini, each with its own defaults (temperature,
thinking, cache controls). This sends the body shape the app sends, per family, and records what
came back. One short request per model; the cost is a few hundred tokens in total.

    python scripts/probe-model-seats.py [--out plans/ia-phase0/model-seat-probe-<date>.json]

The proxy token is read in-process from hic-workspace/.runtime/config.json and never printed.
"""
import datetime as dt
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PROXY = os.environ.get('HIC_PROXY_URL', 'http://localhost:5012')


def token():
    t = os.environ.get('PROXY_AUTH_TOKEN', '')
    if t:
        return t
    try:
        cfg = json.load(io.open(os.path.join(ROOT, 'hic-workspace', '.runtime', 'config.json'), encoding='utf-8'))
        return cfg.get('proxyToken') or cfg.get('proxy_token') or cfg.get('PROXY_AUTH_TOKEN') or ''
    except Exception:
        return ''


PROMPT = 'Reply with the single word: ready'

# (seat, model, route, body). Bodies mirror what the SPA sends on each route.
PROBES = [
    ('deep_reasoning', 'claude-fable-5-2', 'anthropic', {'max_tokens': 2048, 'temperature': 0.2,
        'messages': [{'role': 'user', 'content': PROMPT}]}),
    ('deep_reasoning (secondary)', 'gpt-6-astra', 'openai', {'input': PROMPT, 'temperature': 0.2, 'max_output_tokens': 2048}),
    ('research', 'gemini-4-carbon', 'gemini', {'contents': PROMPT, 'config': {'temperature': 0.2, 'maxOutputTokens': 2048}}),
    ('artifact / orchestration', 'claude-opus-5-5', 'anthropic', {'max_tokens': 2048, 'temperature': 0.2,
        'messages': [{'role': 'user', 'content': PROMPT}]}),
    ('artifact (secondary) / analysis', 'claude-sonnet-5-5', 'anthropic', {'max_tokens': 2048, 'temperature': 0.2,
        'messages': [{'role': 'user', 'content': PROMPT}]}),
    ('search', 'gemini-4-argon', 'gemini', {'contents': PROMPT, 'config': {'temperature': 0.2, 'maxOutputTokens': 2048}}),
    ('analysis (secondary)', 'gpt-6.1-terra', 'openai', {'input': PROMPT, 'temperature': 0.2, 'max_output_tokens': 2048}),
    ('fast', 'gpt-6-luna', 'openai', {'input': PROMPT, 'temperature': 0.2, 'max_output_tokens': 512}),
    ('fast (secondary)', 'claude-haiku-5-5', 'anthropic', {'max_tokens': 512, 'temperature': 0.2,
        'messages': [{'role': 'user', 'content': PROMPT}]}),
]


def text_of(route, d):
    try:
        if route == 'anthropic':
            return ''.join(b.get('text', '') for b in d.get('content', []) if b.get('type') == 'text')
        if route == 'openai':
            if d.get('output_text'):
                return d['output_text']
            out = []
            for it in d.get('output', []):
                for c in it.get('content', []) or []:
                    if c.get('type') in ('output_text', 'text'):
                        out.append(c.get('text', ''))
            return ''.join(out)
        if route == 'gemini':
            if isinstance(d.get('text'), str):
                return d['text']
            c = (d.get('candidates') or [{}])[0]
            return ''.join(p.get('text', '') for p in (c.get('content') or {}).get('parts', []))
    except Exception:
        return ''
    return ''


def probe(tok, seat, model, route, body):
    body = dict(body, model=model)
    req = urllib.request.Request('%s/api/ai/%s' % (PROXY, route), data=json.dumps(body).encode(), method='POST',
                                 headers={'Content-Type': 'application/json', 'x-proxy-token': tok,
                                          'x-hic-session': 'ia-phase0-seat-probe'})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            status, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    except Exception as e:
        return {'seat': seat, 'model': model, 'route': route, 'status': None, 'error': str(e)[:200]}
    secs = round(time.time() - t0, 1)
    try:
        d = json.loads(raw.decode('utf-8', 'replace'))
    except ValueError:
        d = {}
    txt = text_of(route, d).strip()
    rec = {'seat': seat, 'model': model, 'route': route, 'status': status, 'seconds': secs,
           'answered': bool(txt) and status == 200, 'reply': txt[:40],
           'served_model': d.get('model') or d.get('modelVersion')}
    if status != 200:
        err = d.get('error') if isinstance(d, dict) else None
        rec['error'] = (json.dumps(err) if err else raw.decode('utf-8', 'replace'))[:400]
    return rec


def main():
    tok = token()
    if not tok:
        print('no proxy token available (set PROXY_AUTH_TOKEN or start the stack)')
        return 2
    out = None
    if '--out' in sys.argv:
        out = sys.argv[sys.argv.index('--out') + 1]
    results = [probe(tok, *p) for p in PROBES]
    for r in results:
        print('%-32s %-20s %-9s %-4s %-6s %s' % (r['seat'][:32], r['model'], r['route'], r['status'],
                                                   'OK' if r.get('answered') else 'FAIL',
                                                   (r.get('error') or r.get('reply') or '')[:150]))
    if out:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        with io.open(out, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump({'probed': dt.datetime.now().isoformat(timespec='seconds'), 'proxy': PROXY, 'results': results}, fh, indent=1)
            fh.write('\n')
    return 0 if all(r.get('answered') for r in results) else 1


if __name__ == '__main__':
    sys.exit(main())
