#!/usr/bin/env python3
"""Capability parity ledger for the Intelligence Augmentation transformation (Phase 0).

Reads the CURRENT platform out of the working tree (compose services, artifact catalog, hashtag
directives, MCP tools, proxy route families, skills, subagents) and assigns every capability to
its owner in the target architecture (docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md,
Sections 6.2 and 7). Exits non-zero when any capability has no owner, so "all current
functionality survives" is a checked claim instead of a sentence.

Usage (from the repo root):
    python docs/ia-transformation/build_parity_ledger.py            # write the ledger, check it
    python docs/ia-transformation/build_parity_ledger.py --check    # check only, write nothing

It reads files and writes one JSON file beside itself. It calls no service and no model.
"""
import io
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HIC = os.path.join(ROOT, 'humans-in-control-research')
OUT = os.path.join(os.path.dirname(__file__), 'capability-parity-ledger.json')


def read(path):
    return io.open(path, encoding='utf-8', errors='replace').read()


# --- target owners -------------------------------------------------------------------------------

# compose service -> (disposition, target component)
SERVICE_OWNER = {
    'agent': ('becomes', 'ia-agent'),
    'launchpad': ('folded-in', 'workspace-ui (Operations view)'),
    'research-generator': ('becomes', 'workspace-ui; engine imported by studio-worker'),
    'research-proxy': ('stays', 'research-proxy'),
    'reddit-mcp': ('consolidated', 'tool-gateway'),
    'social-mcp': ('consolidated', 'tool-gateway'),
    'journey-mcp': ('consolidated', 'tool-gateway'),
    'research-mcp': ('consolidated', 'tool-gateway'),
    'video-mcp': ('consolidated', 'tool-gateway'),
    'video-render-mcp': ('consolidated', 'tool-gateway'),
    'journey-mapper': ('tool-then-merged', 'journey-engine -> studio-worker'),
    'reddit-ripper': ('becomes', 'collector plugin (Research Lead)'),
    'social-research-frontend': ('retired', 'workspace-ui canvas views'),
    'social-research-backend': ('becomes', 'nlp'),
    'social-research-db': ('stays', 'nlp-db'),
    'video-analyzer': ('becomes', 'media-intake'),
    'miro-generator': ('becomes', 'export adapter (Journey Cartographer)'),
    'consistent-character-generator': ('becomes', 'Media Producer tools behind the proxy'),
    'copilot-recipe-generator': ('becomes', 'Automation Engineer'),
    'presentation-renderer': ('stays', 'presentation-renderer'),
    'video-renderer': ('stays', 'video-renderer'),
    'nxt-agency-backend': ('split', 'ia-agent contracts + sandbox + specialist catalog'),
    'nxt-agency-launchpad': ('retired', 'workspace-ui'),
    'nxt-agency-db': ('retired-after-migration', 'engagement workspace'),
}

# catalog owner skill -> specialist
SKILL_SPECIALIST = {
    'gap-analysis-evaluator': 'Strategist', 'competitive-analyst': 'Strategist',
    'roadmap-builder': 'Strategist', 'recommendation-architect': 'Strategist',
    'strategy-author': 'Strategist', 'prd-compiler': 'Strategist',
    'case-study-analyst': 'Strategist', 'org-chart': 'Strategist',
    'tech-audit-inspector': 'Strategist', 'tech-arch-generator': 'Strategist',
    'journey-illustrator': 'Journey Cartographer', 'service-blueprint-mapper': 'Journey Cartographer',
    'persona-architect': 'Journey Cartographer',
    'theme-analyst': 'Analyst', 'meta-themes': 'Analyst', 'mind-map-architect': 'Analyst',
    'research-planner': 'Research Lead',
    'html-deliverable-composer': 'Writer', 'strategic-report-writer': 'Writer',
    'questionnaire-author': 'Writer',
    'deck-composer': 'Deck Composer',
    'brief-dialog': 'Media Producer', 'infographic-composer': 'Media Producer',
    'experience-prototype-composer': 'Prototyper',
}

# catalog ids whose specialist differs from their owner skill's default
CATALOG_OVERRIDE = {'video-overview': 'Media Producer'}

# directives that are not catalog artifacts: handled by the Agent itself or a named specialist
DIRECTIVE_OWNER = {
    '#help': 'Agent', '#artifacts': 'Agent', '#refine': 'Agent', '#dense': 'Agent',
    '#slide': 'Deck Composer', '#presentations': 'Deck Composer', '#prototypes': 'Prototyper',
    '#design': 'Designer',
}

# MCP tool-name prefix -> specialist
TOOL_PREFIX_OWNER = [
    ('reddit_', 'Research Lead'), ('social_', 'Analyst'), ('journey_', 'Journey Cartographer'),
    ('video_', 'Research Lead'), ('lint_composition', 'Media Producer'),
    ('render_composition', 'Media Producer'), ('render_status', 'Media Producer'),
    ('recall_memory', 'Librarian'), ('admit_memory', 'Librarian'),
    ('list_skills', 'Librarian'), ('get_skill', 'Librarian'),
    ('run_deliverable', 'Agent'), ('get_job', 'Agent'), ('get_run_state', 'Agent'),
    ('list_artifacts', 'Agent'), ('get_run_telemetry', 'Coach'), ('get_digest', 'Agent'),
    ('launch_research_app', 'Agent'),
]

# proxy route family (/api/<family>) -> target owner
ROUTE_OWNER = {
    'ai': 'provider door', 'models': 'provider door', 'pacer': 'provider door', 'cache': 'provider door',
    'proto-ai': 'provider door', 'embed': 'provider door', 'tts': 'Media Producer',
    'transcribe': 'Research Lead', 'transcribe-youtube': 'Research Lead', 'youtube': 'Research Lead',
    'video': 'Media Producer', 'search': 'Research Lead', 'multi-search': 'Research Lead',
    'sources': 'Research Lead', 'source': 'Research Lead', 'source-packs': 'Research Lead',
    'deep-research': 'Research Lead', 'reddit-deep': 'Research Lead', 'cx': 'Research Lead',
    'extract-pdf': 'Brief Lead', 'parse-upload': 'Brief Lead', 'extract-content': 'Brief Lead',
    'tabular': 'Brief Lead', 'pii': 'Brief Lead',
    'topic-model': 'Analyst', 'topic-cache': 'Analyst', 'themes': 'Analyst', 'knowledge-gaps': 'Analyst',
    'wiki': 'Librarian', 'manifest': 'Librarian', 'memory': 'Librarian', 'facts': 'Librarian',
    'brain': 'Librarian', 'corpus': 'Librarian', 'skills': 'Librarian', 'skill': 'Librarian',
    'retention': 'Librarian',
    'sessions': 'Agent', 'session': 'Agent', 'engagement': 'Agent', 'jobs': 'Agent',
    'step-result': 'Agent', 'run-receipts': 'Agent', 'digest': 'Agent', 'webhooks': 'Agent',
    'scheduler': 'Agent', 'user-selection': 'Agent', 'telemetry': 'Agent',
    'artifacts': 'studio-worker', 'artifact': 'studio-worker', 'air': 'studio-worker',
    'prd': 'Strategist', 'journey-map': 'Journey Cartographer', 'prototypes': 'Prototyper',
    'presentations': 'Deck Composer', 'gold': 'Deck Composer', 'export-pptx': 'Deck Composer',
    'layout': 'Verifier', 'audit': 'Verifier', 'heuristic': 'Verifier',
    'design-tokens': 'Designer', 'design-assets': 'Designer', 'fonts': 'Designer',
    'epochs': 'Coach', 'eval': 'Coach', 'feedback': 'Coach', 'skillopt': 'Coach', 'golden-set': 'Coach',
}


# --- readers -------------------------------------------------------------------------------------

def compose_services():
    text = '\n' + read(os.path.join(ROOT, 'docker-compose-all.yml')).replace('\r\n', '\n')
    body = text.split('\nservices:', 1)[1]
    for stop in ('\nnetworks:', '\nvolumes:'):
        body = body.split(stop, 1)[0]
    return re.findall(r'^  ([a-z0-9-]+):\s*$', body, flags=re.M)


def catalog_entries():
    text = read(os.path.join(HIC, 'services', 'artifactCatalog.ts'))
    out = []
    for cid, body in re.findall(r"\{\s*id:\s*'([^']+)'(.*?)\}", text, flags=re.S):
        def field(k):
            m = re.search(k + r":\s*'([^']+)'", body)
            return m.group(1) if m else None
        out.append({'id': cid, 'ownerSkill': field('ownerSkill'), 'tier': field('tier'),
                    'modality': field('modality'), 'routingClass': field('routingClass')})
    return out


def directives():
    text = read(os.path.join(HIC, 'services', 'hashtagRegistry.ts'))
    return sorted(set(re.findall(r"^\s{8}id:\s*'(#[a-z-]+)'", text, flags=re.M)))


def catalog_aliases():
    """alias -> catalog id, from the catalog's aliases arrays (plus the id itself)."""
    text = read(os.path.join(HIC, 'services', 'artifactCatalog.ts'))
    out = {}
    for cid, body in re.findall(r"\{\s*id:\s*'([^']+)'(.*?)\}", text, flags=re.S):
        out[cid] = cid
        m = re.search(r'aliases:\s*\[([^\]]*)\]', body)
        if m:
            for alias in re.findall(r"'([^']+)'", m.group(1)):
                out[alias] = cid
    return out


def mcp_tools():
    out = {}
    base = os.path.join(ROOT, 'mcp-services')
    for svc in ('reddit-mcp', 'social-mcp', 'journey-mcp', 'video-mcp', 'research-mcp', 'video-render-mcp'):
        text = read(os.path.join(base, svc, 'app.py'))
        names = sorted(set(re.findall(r'"name":\s*"([a-z_]+)"', text)))
        out[svc] = names
    return out


def proxy_route_families():
    text = read(os.path.join(HIC, 'proxy', 'app.py'))
    fams = {}
    for _method, fam in re.findall(r'@app\.(get|post|put|delete|patch)\("/api/([a-z0-9_-]+)', text):
        fams[fam] = fams.get(fam, 0) + 1
    return fams


def skills():
    base = os.path.join(ROOT, '.claude', 'skills')
    return sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)))


def subagents():
    base = os.path.join(ROOT, '.claude', 'agents')
    return sorted(f[:-3] for f in os.listdir(base) if f.endswith('.md'))


# source directory -> target owner of every HTTP route that directory serves
DIR_OWNER = {
    'launchpad': 'workspace-ui (Operations view)',
    'mcp-services': 'ia-agent + tool-gateway',
    'NXT-Agency': 'ia-agent (orchestration API) + sandbox',
    'internal-solutions-journeymapper': 'Journey Cartographer (journey-engine)',
    'internal-solutions-socialresearch': 'Analyst (nlp)',
    'internal-solutions-video-analyzer': 'Research Lead (media-intake)',
    'internal-solutions-miro-generator': 'Journey Cartographer (export adapter)',
    'internal-solutions-consistent-character-generator': 'Media Producer',
    'internal-solutions-copilot-recipe-generator': 'Automation Engineer',
    'internal-solutions-presentation-renderer': 'Deck Composer (render target)',
    'internal-solutions-video-renderer': 'Media Producer (render target)',
    'internal-solutions-reddit-ripper': 'Research Lead (collector plugin)',
    'humans-in-control-research': 'research-proxy + studio-worker + workspace-ui',
}

SKIP_DIRS = {'node_modules', 'venv', '.venv', 'dist', 'build', '__pycache__', '.git', 'hic-workspace',
             'static', 'coverage', 'renders', 'logs', 'uploads', 'output'}
PY_ROUTE = re.compile(r'@(?:\w+)\.(get|post|put|delete|patch|route|websocket)\(\s*["\']([^"\']+)')
JS_ROUTE = re.compile(r'\b(?:app|router)\.(get|post|put|delete|patch)\(\s*["\'`]([^"\'`]+)')

# behaviors that are not features but must survive, each pinned by a test that has to exist
INVARIANTS = [
    ('no hardcoded Claude model id at any call site', 'services/modelIdLiterals.test.ts'),
    ('/api/models seats equal the TypeScript router', 'services/modelSeats.test.ts'),
    ('slide chain stage order', 'services/artifactChain.test.ts'),
    ('every directive has a catalog entry', 'services/artifactCatalog.coverage.test.ts'),
    ('learning pass never writes a skill without APPROVE', 'services/learningEngineProposals.test.ts'),
    ('memory lifecycle parity, TypeScript side', 'services/memoryParity.test.ts'),
    ('memory lifecycle parity, Python side', 'proxy/tests/test_memory_store.py'),
    ('scrubs never damage CSS', 'services/artifactCssIntegrity.test.ts'),
    ('a question stays a question through repair', 'services/quizStemIntegrity.test.ts'),
    ('PRD visual slots', 'services/prdVisualSlots.test.ts'),
]


def tree_scan():
    """Every source file of every service: files, lines, test files and the HTTP routes it serves."""
    out = {}
    for d in DIR_OWNER:
        files = lines = tests = 0
        routes = set()
        test_text = []
        for dp, dn, fn in os.walk(os.path.join(ROOT, d)):
            dn[:] = [x for x in dn if x not in SKIP_DIRS]
            for f in fn:
                if not f.endswith(('.py', '.ts', '.tsx', '.js', '.jsx', '.mjs')):
                    continue
                text = read(os.path.join(dp, f))
                if len(text) > 3_000_000:
                    continue
                files += 1
                lines += text.count('\n')
                if '.test.' in f or f.startswith('test_'):
                    tests += 1
                    test_text.append(text)
                    continue
                found = PY_ROUTE.findall(text) if f.endswith('.py') else JS_ROUTE.findall(text)
                for method, path in found:
                    if path.startswith('/'):
                        routes.add((method.upper(), path))
        out[d] = {'files': files, 'lines': lines, 'test_files': tests, 'routes': sorted(routes), '_test_text': chr(10).join(test_text)}
    return out


def _route_tested(path, test_text):
    """2026-11-11: a route counts as tested only if a test in its own tree names it. Having test files is not
    enough: Social Research's merge tests and the Miro CLI tests exercise no HTTP route."""
    if not test_text:
        return False
    static = re.split(r'[<{]', path, maxsplit=1)[0].rstrip('/')
    if not static:
        return bool(re.search(r'''(get|post|request|fetch|client)\(\s*["']/["']''', test_text))
    return static in test_text


def _fixture_index():
    try:
        d = json.load(io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'index.json'), encoding='utf-8'))
    except Exception:
        return {}, {}
    rec = {(f['service'], f['route']): f for f in d.get('fixtures', []) if f.get('status') is not None}
    return rec, d.get('not_called', {})


def _not_called_reason(method, path, not_called):
    for reason, keys in not_called.items():
        for k in keys:
            if k == method or (k.startswith('/') and (path == k or (k.endswith('/') and path.startswith(k)) or path.endswith(k))):
                return reason
    return None


# --- build ---------------------------------------------------------------------------------------

def build():
    unowned = []
    ledger = {'generated_from': 'working tree', 'plan': 'docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md'}

    svc_rows = []
    for name in compose_services():
        owner = SERVICE_OWNER.get(name)
        if not owner:
            unowned.append(('service', name))
        svc_rows.append({'service': name, 'disposition': owner[0] if owner else None,
                         'target': owner[1] if owner else None})
    ledger['services'] = svc_rows

    cat_rows = []
    for e in catalog_entries():
        spec = CATALOG_OVERRIDE.get(e['id']) or SKILL_SPECIALIST.get(e['ownerSkill'] or '')
        if not spec:
            unowned.append(('artifact', e['id']))
        cat_rows.append(dict(e, specialist=spec))
    ledger['artifacts'] = cat_rows
    spec_by_catalog = {r['id']: r['specialist'] for r in cat_rows}

    aliases = catalog_aliases()
    # '#studyguide' names catalog id 'study-guide': compare with hyphens removed on both sides
    squashed = {k.replace('-', ''): v for k, v in aliases.items()}
    dir_rows = []
    for d in directives():
        bare = d[1:]
        cid = (aliases.get(bare) or squashed.get(bare.replace('-', ''))
               or aliases.get(bare.rstrip('s')))
        owner = DIRECTIVE_OWNER.get(d) or (spec_by_catalog.get(cid) if cid else None)
        if not owner:
            unowned.append(('directive', d))
        dir_rows.append({'directive': d, 'catalog_id': cid, 'owner': owner})
    ledger['directives'] = dir_rows

    tool_rows = []
    for svc, names in mcp_tools().items():
        for n in names:
            owner = next((o for p, o in TOOL_PREFIX_OWNER if n.startswith(p)), None)
            if not owner:
                unowned.append(('mcp_tool', f'{svc}.{n}'))
            tool_rows.append({'wrapper': svc, 'tool': n, 'owner': owner})
    ledger['mcp_tools'] = tool_rows

    route_rows = []
    for fam, n in sorted(proxy_route_families().items()):
        owner = ROUTE_OWNER.get(fam)
        if not owner:
            unowned.append(('proxy_route_family', fam))
        route_rows.append({'family': fam, 'routes': n, 'owner': owner})
    ledger['proxy_route_families'] = route_rows

    # every HTTP route of every service, with the proof of parity each one needs
    scan = tree_scan()
    svc_route_rows = []
    fixtures, not_called = _fixture_index()
    for d, info in scan.items():
        for method, path in info['routes']:
            if _route_tested(path, info['_test_text']):
                proof = 'existing unit tests'
            elif (d, path) in fixtures:
                proof = 'recorded fixture: fixtures/' + fixtures[(d, path)]['file']
            else:
                why = _not_called_reason(method, path, not_called)
                proof = 'recorded request/response fixture required' + (' (not recorded read-only: %s)' % why if why else '')
            svc_route_rows.append({'source': d, 'method': method, 'path': path,
                                   'owner': DIR_OWNER[d], 'parity_proof': proof})
    ledger['service_routes'] = svc_route_rows
    ledger['tree'] = {d: {k: v for k, v in info.items() if k not in ('routes', '_test_text')} for d, info in scan.items()}

    inv_rows = []
    for name, rel in INVARIANTS:
        exists = os.path.isfile(os.path.join(HIC, rel))
        if not exists:
            unowned.append(('invariant_test_missing', rel))
        inv_rows.append({'invariant': name, 'pinned_by': rel, 'test_exists': exists})
    ledger['invariants'] = inv_rows

    ledger['skills'] = skills()
    ledger['subagents'] = subagents()
    ledger['counts'] = {
        'source_files': sum(v['files'] for v in scan.values()),
        'source_lines': sum(v['lines'] for v in scan.values()),
        'service_routes': len(svc_route_rows),
        'routes_without_tests': sum(1 for r in svc_route_rows if r['parity_proof'] != 'existing unit tests'),
        'routes_with_recorded_fixture': sum(1 for r in svc_route_rows if r['parity_proof'].startswith('recorded fixture')),
        'routes_still_needing_proof': sum(1 for r in svc_route_rows if r['parity_proof'].startswith('recorded request')),
        'invariants': len(inv_rows),
        'services': len(svc_rows), 'artifacts': len(cat_rows), 'directives': len(dir_rows),
        'mcp_tools': len(tool_rows), 'proxy_route_families': len(route_rows),
        'proxy_routes': sum(r['routes'] for r in route_rows),
        'skills': len(ledger['skills']), 'subagents': len(ledger['subagents']),
        'unowned': len(unowned),
    }
    ledger['unowned'] = [{'kind': k, 'name': n} for k, n in unowned]
    return ledger


def main():
    ledger = build()
    c = ledger['counts']
    print('services %(services)d | artifacts %(artifacts)d | directives %(directives)d | mcp tools '
          '%(mcp_tools)d | proxy route families %(proxy_route_families)d (%(proxy_routes)d routes) | '
          'skills %(skills)d | subagents %(subagents)d' % c)
    print('whole tree: %(source_files)d source files, %(source_lines)d lines | %(service_routes)d HTTP '
          'routes across all services, %(routes_without_tests)d without a route test, '
          '%(routes_with_recorded_fixture)d of those with a recorded fixture, %(routes_still_needing_proof)d still needing proof | '
          '%(invariants)d pinned invariants' % c)
    if '--check' not in sys.argv:
        with io.open(OUT, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(ledger, f, indent=2, sort_keys=False)
            f.write('\n')
        print('wrote', os.path.relpath(OUT, ROOT))
    if ledger['unowned']:
        print('UNOWNED CAPABILITIES (%d):' % len(ledger['unowned']))
        for u in ledger['unowned']:
            print('  %-20s %s' % (u['kind'], u['name']))
        return 1
    print('PASS: every capability has an owner')
    return 0


if __name__ == '__main__':
    sys.exit(main())
