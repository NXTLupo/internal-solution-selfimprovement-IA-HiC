#!/usr/bin/env python3
"""Record and re-check read-only request/response fixtures for the routes in services with no tests.

Phase 0 of the Intelligence Augmentation transformation plan (Section 7.6): the 120 routes in the
eight untested services need a recorded "before" so each can be proven unchanged when the Studio
absorbs its service. The owner approved READ-ONLY recording on 2026-11-11: only GET requests, no
route that writes, generates, spends model or image credits, or calls an outside site.

    python docs/ia-transformation/record_fixtures.py record   # writes fixtures/ and fixtures/index.json
    python docs/ia-transformation/record_fixtures.py check    # re-requests and compares status and shape

A fixture stores the status, the content type, a location header if any, and the body: JSON is
kept with secrets masked and long arrays shortened (its full shape is kept separately); HTML and
binary bodies are kept as length plus SHA-256 plus page title. "check" passes when every route
returns the same status and the same JSON shape (keys and value types), because the data itself
changes from day to day. Routes that were deliberately not called are listed with the reason.
"""
import hashlib
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'fixtures')
HOST = os.environ.get('IA_FIXTURE_HOST', 'http://localhost')

PORTS = {
    'launchpad': 8000, 'internal-solutions-journeymapper': 8080, 'internal-solutions-reddit-ripper': 5001,
    'internal-solutions-socialresearch': 8081, 'internal-solutions-video-analyzer': 5002,
    'internal-solutions-miro-generator': 5004, 'internal-solutions-consistent-character-generator': 5010,
    'internal-solutions-copilot-recipe-generator': 5013,
}
MISSING = 'ia-fixture-nonexistent-0000'
# Inside the compose network, for when a host port forward is broken (seen on Windows for miro-generator:
# the app listened on 0.0.0.0:5004 and Docker reported the mapping, yet the host refused connections).
INTERNAL = {
    'launchpad': 'http://launchpad:8000', 'internal-solutions-journeymapper': 'http://journey-mapper:8000',
    'internal-solutions-reddit-ripper': 'http://reddit-ripper:5000', 'internal-solutions-socialresearch': 'http://social-research-backend:8081',
    'internal-solutions-video-analyzer': 'http://video-analyzer:5000', 'internal-solutions-miro-generator': 'http://miro-generator:5004',
    'internal-solutions-consistent-character-generator': 'http://consistent-character-generator:5010',
    'internal-solutions-copilot-recipe-generator': 'http://copilot-recipe-generator:5013',
}
COMPOSE = os.path.abspath(os.path.join(HERE, '..', '..', 'docker-compose-all.yml'))
_VIA_SCRIPT = r'''
import base64, json, sys, urllib.request, urllib.error
class N(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
url, follow = sys.argv[1], sys.argv[2] == "1"
op = urllib.request.build_opener() if follow else urllib.request.build_opener(N)
try:
    r = op.open(urllib.request.Request(url, headers={"User-Agent": "ia-phase0-fixture-recorder"}), timeout=25); s, h, b = r.status, dict(r.headers), r.read()
except urllib.error.HTTPError as e:
    s, h, b = e.code, dict(e.headers or {}), e.read() or b""
print(json.dumps({"s": s, "h": h, "b": base64.b64encode(b).decode()}))
'''


def fetch_via_network(svc, path, follow):
    import base64, subprocess
    url = INTERNAL[svc] + path
    try:
        out = subprocess.run(['docker', 'compose', '-f', COMPOSE, 'exec', '-T', 'launchpad', 'python', '-c', _VIA_SCRIPT, url,
                              '1' if follow else '0'], capture_output=True, text=True, timeout=60).stdout
        d = json.loads(out.strip().splitlines()[-1])
        return d['s'], d['h'], base64.b64decode(d['b'])
    except Exception as e:
        return None, {}, ('via-network %s: %s' % (type(e).__name__, e)).encode()

# (service, route pattern as in the ledger, concrete path, how). how: 'json' default, 'shape' = keep shape
# only (body may carry operational detail such as container logs), 'noredirect' = record the redirect.
# Paths with {from:...} take an id from an earlier response; MISSING records the not-found contract.
SAFE = [
    ('launchpad', '/', '/', 'json'),
    ('launchpad', '/agent', '/agent', 'json'),
    ('launchpad', '/status', '/status', 'json'),
    ('launchpad', '/mcp-chat', '/mcp-chat', 'json'),
    ('launchpad', '/api/status', '/api/status', 'json'),
    ('launchpad', '/api/urls', '/api/urls', 'json'),
    ('launchpad', '/api/metrics', '/api/metrics', 'json'),
    ('launchpad', '/api/threads', '/api/threads', 'json'),
    ('launchpad', '/api/threads/<thread_id>', '/api/threads/' + MISSING, 'json'),
    ('launchpad', '/api/agency/reviews', '/api/agency/reviews', 'json'),
    ('launchpad', '/api/agency/history/<conversation_id>', '/api/agency/history/' + MISSING, 'json'),
    ('launchpad', '/api/digest', '/api/digest', 'json'),
    ('launchpad', '/api/chat/models', '/api/chat/models', 'json'),
    ('launchpad', '/api/mcp/servers', '/api/mcp/servers', 'json'),
    ('launchpad', '/api/mcp/tools', '/api/mcp/tools', 'shape'),
    ('launchpad', '/api/logs', '/api/logs?service=agent&lines=3', 'shape'),
    ('launchpad', '/redirect/<service>', '/redirect/journey-mapper', 'noredirect'),
    ('launchpad', '/api/chat/ws/<conversation_id>', '/api/chat/ws/' + MISSING, 'noredirect'),
    ('internal-solutions-journeymapper', '/', '/', 'json'),
    ('internal-solutions-journeymapper', '/api/models', '/api/models', 'json'),
    ('internal-solutions-journeymapper', '/sw.js', '/sw.js', 'json'),
    ('internal-solutions-journeymapper', '/dev-sw.js', '/dev-sw.js', 'json'),
    ('internal-solutions-journeymapper', '/api/export-pdf/{journey_id}', '/api/export-pdf/' + MISSING, 'json'),
    ('internal-solutions-reddit-ripper', '/', '/', 'json'),
    ('internal-solutions-reddit-ripper', '/api/sources', '/api/sources', 'json'),
    ('internal-solutions-reddit-ripper', '/api/status/<job_id>', '/api/status/' + MISSING, 'json'),
    ('internal-solutions-reddit-ripper', '/api/download/<job_id>/<filename>', '/api/download/%s/none.csv' % MISSING, 'json'),
    ('internal-solutions-reddit-ripper', '/static/<path:filename>', '/static/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/health', '/health', 'json'),
    ('internal-solutions-socialresearch', '/subreddits', '/api/reddit/subreddits', 'json'),
    ('internal-solutions-socialresearch', '/subreddit/<string:subreddit_name>', '/api/reddit/subreddit/{from:subreddit}', 'shape'),
    ('internal-solutions-socialresearch', '/subreddit-stats/<subreddit>', '/api/llm-analyzer/subreddit-stats/{from:subreddit}', 'json'),
    ('internal-solutions-socialresearch', '/projects/<user_id>', '/api/user/projects/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/<user_id>', '/api/user/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/project/<project_id>', '/api/user/project/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/job-status/<job_id>', '/api/topic-model/job-status/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/jobs/user/<user_id>', '/api/topic-model/jobs/user/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/jobs/analysis/<analysis_id>', '/api/topic-model/jobs/analysis/' + MISSING, 'json'),
    ('internal-solutions-socialresearch', '/jobs/project/<project_id>', '/api/topic-model/jobs/project/' + MISSING, 'json'),
    ('internal-solutions-video-analyzer', '/', '/', 'json'),
    ('internal-solutions-video-analyzer', '/api', '/api', 'json'),
    ('internal-solutions-video-analyzer', '/health', '/health', 'json'),
    ('internal-solutions-video-analyzer', '/jobs', '/jobs', 'shape'),
    ('internal-solutions-video-analyzer', '/jobs/{job_id}', '/jobs/{from:video_job}', 'shape'),
    ('internal-solutions-video-analyzer', '/transcript/{job_id}', '/transcript/' + MISSING, 'json'),
    ('internal-solutions-miro-generator', '/', '/', 'json'),
    ('internal-solutions-miro-generator', '/health', '/health', 'json'),
    ('internal-solutions-miro-generator', '/api/config', '/api/config', 'json'),
    ('internal-solutions-miro-generator', '/api/files', '/api/files', 'shape'),
    ('internal-solutions-miro-generator', '/api/download/<path:output_dir>/<path:filename>', '/api/download/%s/none.json' % MISSING, 'json'),
    ('internal-solutions-consistent-character-generator', '/', '/', 'json'),
    ('internal-solutions-consistent-character-generator', '/health', '/health', 'json'),
    ('internal-solutions-consistent-character-generator', '/api/status', '/api/status', 'json'),
    ('internal-solutions-consistent-character-generator', '/api/video-status', '/api/video-status', 'json'),
    ('internal-solutions-consistent-character-generator', '/api/video-debug', '/api/video-debug', 'json'),
    ('internal-solutions-consistent-character-generator', '/vite.svg', '/vite.svg', 'json'),
    ('internal-solutions-consistent-character-generator', '/assets/<path:filename>', '/assets/' + MISSING, 'json'),
    ('internal-solutions-consistent-character-generator', '/static/<path:filename>', '/static/' + MISSING, 'json'),
    ('internal-solutions-copilot-recipe-generator', '/', '/', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/health', '/health', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/api/templates', '/api/templates', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/api/templates/{template_id}', '/api/templates/{from:template}', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/api/entities', '/api/entities', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/api/entities/{template_id}', '/api/entities/{from:template}', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/api/triggers', '/api/triggers', 'json'),
    ('internal-solutions-copilot-recipe-generator', '/{full_path:path}', '/some/client/route', 'json'),
]

NOT_CALLED = {
    'writes or deletes data': ['POST', 'DELETE', '/api/clear-data', '/api/digest/seen'],
    'spends model, image or video credits': ['/api/check-key', '/send_hi', '/api/analyze', '/api/generate-map',
                                            '/api/generate', '/api/generate-figma', '/api/generate-recipe',
                                            '/api/topic-yaml', '/chat', '/query', '/embed', '/ai-summary'],
    'calls an outside site': ['/subreddit/<subreddit>/about', '/subreddit/<subreddit>/icon', '/api/test'],
    'opens a socket or forwards to another service (covered by that service)': ['/ws-proxy/<conversation_id>', '/proxy/'],
    'needs an id the owner has not chosen to expose': ['/api/chat/image/<image_id>'],
}

SECRET_VALUE = re.compile(r'(sk-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|'
                          r'ghp_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._~+/-]{12,}|'
                          r'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})')
SECRET_KEY = re.compile(r'(token|secret|password|passwd|api[_-]?key|apikey|authorization|cookie|credential)', re.I)


def mask(v, key=''):
    if isinstance(v, dict):
        return {k: mask(x, k) for k, x in v.items()}
    if isinstance(v, list):
        return [mask(x, key) for x in v]
    if isinstance(v, str):
        if SECRET_KEY.search(key) and v and v.lower() not in ('true', 'false', 'none', 'null', 'configured', 'missing', 'set', 'not set'):
            return '***'
        return SECRET_VALUE.sub('***', v)
    return v


def shorten(v, depth=0):
    if isinstance(v, dict):
        return {k: shorten(x, depth + 1) for k, x in v.items()}
    if isinstance(v, list):
        head = [shorten(x, depth + 1) for x in v[:3]]
        return head + (['... %d more' % (len(v) - 3)] if len(v) > 3 else [])
    if isinstance(v, str) and len(v) > 400:
        return v[:400] + '... (%d chars)' % len(v)
    return v


def shape(v):
    """Keys and value types, merged across list items, so day-to-day data changes do not matter."""
    if isinstance(v, dict):
        return {k: shape(x) for k, x in sorted(v.items())}
    if isinstance(v, list):
        merged = {}
        kinds = set()
        for x in v[:50]:
            s = shape(x)
            if isinstance(s, dict):
                merged.update(s)
            else:
                kinds.add(json.dumps(s))
        if merged:
            return [merged]
        return ['|'.join(sorted(kinds))] if kinds else []
    return {bool: 'bool', int: 'number', float: 'number', str: 'string', type(None): 'null'}.get(type(v), type(v).__name__)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch(url, follow):
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, method='GET', headers={'User-Agent': 'ia-phase0-fixture-recorder', 'Accept': '*/*'})
    try:
        r = opener.open(req, timeout=25)
        return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read() or b''
    except Exception as e:  # connection refused, timeout
        return None, {}, ('%s: %s' % (type(e).__name__, e)).encode()


def first_id(bodies, key):
    try:
        if key == 'subreddit':
            d = bodies['/api/reddit/subreddits']
            items = d.get('subreddits', d) if isinstance(d, dict) else d
            it = items[0]
            return it.get('name') or it.get('subreddit') or it.get('subreddit_name') if isinstance(it, dict) else str(it)
        if key == 'video_job':
            d = bodies['/jobs']
            items = d.get('jobs', d) if isinstance(d, dict) else d
            if isinstance(items, dict):
                return next(iter(items))
            return items[0].get('job_id') or items[0].get('id')
        if key == 'template':
            d = bodies['/api/templates']
            items = d.get('templates', d) if isinstance(d, dict) else d
            it = items[0]
            return it.get('id') or it.get('template_id') or it.get('name') if isinstance(it, dict) else str(it)
    except Exception:
        return None
    return None


def run_one(svc, pattern, path, how, bodies):
    m = re.search(r'\{from:(\w+)\}', path)
    if m:
        ident = first_id(bodies, m.group(1))
        path = path.replace(m.group(0), urllib.request.quote(str(ident), safe='') if ident else MISSING)
    url = '%s:%d%s' % (HOST, PORTS[svc], path)
    status, headers, raw = fetch(url, follow=(how != 'noredirect'))
    via = 'host port'
    if status is None and b'refused' in raw:
        status, headers, raw = fetch_via_network(svc, path, follow=(how != 'noredirect'))
        via = 'compose network (host port refused)'
    h = {k.lower(): v for k, v in headers.items()}
    ctype = h.get('content-type', '')
    rec = {'service': svc, 'route': pattern, 'method': 'GET', 'path': path, 'status': status,
           'content_type': ctype.split(';')[0], 'location': h.get('location'), 'via': via}
    body = None
    if status is None:
        rec['error'] = raw.decode('utf-8', 'replace')[:300]
    elif 'json' in ctype:
        try:
            body = json.loads(raw.decode('utf-8', 'replace'))
            rec['shape'] = shape(body)
            if how != 'shape':
                rec['body'] = shorten(mask(body))
        except ValueError:
            rec['body_sha256'] = hashlib.sha256(raw).hexdigest()
    else:
        rec['bytes'] = len(raw)
        rec['body_sha256'] = hashlib.sha256(raw).hexdigest()
        t = re.search(rb'<title[^>]*>([^<]{0,200})', raw, re.I)
        if t:
            rec['title'] = t.group(1).decode('utf-8', 'replace').strip()
    bodies[path.split('?')[0]] = body
    return rec


def slug(svc, path):
    s = (svc.replace('internal-solutions-', '') + path).replace('/', '_').replace('?', '_').replace('&', '_')
    return re.sub(r'[^A-Za-z0-9_.=-]', '-', s)[:150] + '.json'


def record(only=None):
    """Record every SAFE route, or with `only` (a substring of the service name) re-record that service's
    routes and keep the rest of the index as it was, so a first recording stays the true "before"."""
    os.makedirs(OUT, exist_ok=True)
    bodies, index = {}, []
    if only:
        try:
            index = [i for i in json.load(io.open(os.path.join(OUT, 'index.json'), encoding='utf-8'))['fixtures']
                     if only not in i['service']]
        except Exception:
            index = []
    for svc, pattern, path, how in SAFE:
        if only and only not in svc:
            continue
        rec = run_one(svc, pattern, path, how, bodies)
        name = slug(svc, rec['path'])
        with io.open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(rec, fh, indent=1, ensure_ascii=False)
            fh.write('\n')
        index.append({'service': svc, 'route': pattern, 'path': rec['path'], 'status': rec['status'], 'file': name})
        print('%-4s %-28s %s' % (rec['status'], svc.replace('internal-solutions-', '')[:28], rec['path'][:90]))
    with io.open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8', newline='\n') as fh:
        json.dump({'recorded_with': 'record_fixtures.py record', 'policy': 'GET only; no writes, no paid calls, no outside sites',
                   'fixtures': index, 'not_called': NOT_CALLED}, fh, indent=1)
        fh.write('\n')
    down = [i for i in index if i['status'] is None]
    print('recorded %d fixtures, %d unreachable' % (len(index), len(down)))
    return 1 if down else 0


def check():
    idx = json.load(io.open(os.path.join(OUT, 'index.json'), encoding='utf-8'))
    bodies, bad = {}, 0
    for svc, pattern, path, how in SAFE:
        old = json.load(io.open(os.path.join(OUT, slug(svc, path if '{from:' not in path else
                                                       next(i['path'] for i in idx['fixtures'] if i['route'] == pattern and i['service'] == svc))), encoding='utf-8'))
        new = run_one(svc, pattern, path, how, bodies)
        diffs = []
        if new['status'] != old['status']:
            diffs.append('status %s -> %s' % (old['status'], new['status']))
        if 'shape' in old and new.get('shape') != old['shape']:
            diffs.append('JSON shape changed')
        if diffs:
            bad += 1
            print('DIFF %-28s %-50s %s' % (svc.replace('internal-solutions-', '')[:28], path[:50], '; '.join(diffs)))
    print('checked %d fixtures, %d differ' % (len(SAFE), bad))
    return 1 if bad else 0


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'record'
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    sys.exit(record(only) if mode == 'record' else check())
