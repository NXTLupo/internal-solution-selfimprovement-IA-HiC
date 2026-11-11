#!/usr/bin/env python3
"""Static behavior contracts for every Python HTTP route in the platform (Phase 0).

The parity ledger proves each route has an owner. This file records WHAT each route does, read
from its handler with the Python AST and without running anything: the handler name, its
parameters, the request fields it reads (form, query, JSON body, uploaded files), the keys of the
JSON objects it returns, the status codes it sets, the outbound hosts it calls and its docstring.

That is the "before" half of a behavior comparison. It is weaker than a recorded request and
response (it cannot see values), and stronger than nothing: ten of the thirteen service trees have
no tests at all, so for them this is the only written statement of behavior that exists.

Usage (from the repo root):
    python docs/ia-transformation/build_route_contracts.py
"""
import ast
import io
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(os.path.dirname(__file__), 'route-contracts.json')
TREES = ['launchpad', 'mcp-services', 'NXT-Agency', 'internal-solutions-journeymapper',
         'internal-solutions-socialresearch', 'internal-solutions-video-analyzer',
         'internal-solutions-miro-generator', 'internal-solutions-consistent-character-generator',
         'internal-solutions-copilot-recipe-generator', 'internal-solutions-reddit-ripper',
         'humans-in-control-research']
SKIP = {'node_modules', 'venv', '.venv', 'dist', 'build', '__pycache__', '.git', 'hic-workspace', 'static',
        'tests', 'logs', 'uploads', 'output'}
METHODS = {'get', 'post', 'put', 'delete', 'patch', 'route', 'websocket'}


def route_of(dec):
    """(method, path) when a decorator is @x.get('/p') / @x.route('/p', methods=[...])."""
    if not (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.func.attr in METHODS):
        return None
    if not dec.args or not isinstance(dec.args[0], ast.Constant) or not isinstance(dec.args[0].value, str):
        return None
    path = dec.args[0].value
    if not path.startswith('/'):
        return None
    method = dec.func.attr.upper()
    if method == 'ROUTE':
        method = 'GET'
        for kw in dec.keywords:
            if kw.arg == 'methods' and isinstance(kw.value, (ast.List, ast.Tuple)):
                method = '|'.join(e.value for e in kw.value.elts if isinstance(e, ast.Constant))
    return method, path


def dict_keys(node):
    return [k.value for k in node.keys if isinstance(k, ast.Constant) and isinstance(k.value, str)]


def contract(fn, src):
    reads, returns, statuses, hosts = set(), set(), set(), set()
    for n in ast.walk(fn):
        # request.form.get('x') / request.args.get('x') / data.get('x') / body['x']
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'get' and n.args \
                and isinstance(n.args[0], ast.Constant) and isinstance(n.args[0].value, str):
            base = ast.unparse(n.func.value)
            if re.search(r'form|args|json|data|body|payload|params|req|files|headers', base):
                reads.add(n.args[0].value)
        if isinstance(n, ast.Subscript) and isinstance(n.slice, ast.Constant) and isinstance(n.slice.value, str):
            base = ast.unparse(n.value)
            if re.search(r'^(data|body|payload|params|args|request\.\w+|req\w*)$', base):
                reads.add(n.slice.value)
        if isinstance(n, ast.Return) and n.value is not None:
            for d in ast.walk(n.value):
                if isinstance(d, ast.Dict):
                    returns.update(dict_keys(d))
        if isinstance(n, ast.keyword) and n.arg == 'status_code' and isinstance(n.value, ast.Constant):
            statuses.add(n.value.value)
        if isinstance(n, ast.Return) and isinstance(n.value, ast.Tuple) and len(n.value.elts) == 2 \
                and isinstance(n.value.elts[1], ast.Constant) and isinstance(n.value.elts[1].value, int):
            statuses.add(n.value.elts[1].value)
        if isinstance(n, ast.Constant) and isinstance(n.value, str):
            m = re.match(r'https?://([A-Za-z0-9.-]+)', n.value)
            if m and m.group(1) not in ('localhost', '127.0.0.1'):
                hosts.add(m.group(1))
    params = [a.arg for a in fn.args.args + fn.args.kwonlyargs if a.arg not in ('self', 'request', 'req')]
    doc = (ast.get_docstring(fn) or '').strip().split('\n')[0][:160]
    return {'handler': fn.name, 'params': params, 'reads': sorted(reads)[:40], 'returns': sorted(returns)[:40],
            'status_codes': sorted(statuses), 'outbound_hosts': sorted(hosts)[:8], 'doc': doc,
            'lines': (fn.end_lineno or fn.lineno) - fn.lineno + 1}


def main():
    out, stats = [], {}
    for tree in TREES:
        n = documented = 0
        for dp, dn, fn in os.walk(os.path.join(ROOT, tree)):
            dn[:] = [d for d in dn if d not in SKIP]
            for f in fn:
                if not f.endswith('.py') or f.startswith('test_'):
                    continue
                path = os.path.join(dp, f)
                try:
                    src = io.open(path, encoding='utf-8', errors='replace').read()
                    mod = ast.parse(src)
                except (SyntaxError, ValueError):
                    continue
                for node in ast.walk(mod):
                    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        continue
                    for dec in node.decorator_list:
                        r = route_of(dec)
                        if not r:
                            continue
                        c = contract(node, src)
                        c.update({'tree': tree, 'file': os.path.relpath(path, ROOT).replace('\\', '/'),
                                  'line': node.lineno, 'method': r[0], 'path': r[1]})
                        out.append(c)
                        n += 1
                        documented += 1 if (c['doc'] or c['returns'] or c['reads']) else 0
        stats[tree] = {'routes': n, 'with_observable_contract': documented}
    out.sort(key=lambda c: (c['tree'], c['path'], c['method']))
    with io.open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump({'generated_from': 'working tree (Python AST, nothing executed)', 'stats': stats, 'routes': out},
                  fh, indent=1)
        fh.write('\n')
    total = sum(s['routes'] for s in stats.values())
    seen = sum(s['with_observable_contract'] for s in stats.values())
    for t, s in stats.items():
        print('%-52s routes %4d  with observable contract %4d' % (t, s['routes'], s['with_observable_contract']))
    print('TOTAL %d Python route handlers, %d with an observable contract; wrote %s' % (total, seen, os.path.relpath(OUT, ROOT)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
