#!/usr/bin/env python3
"""
UserPromptSubmit Hook - Inject the learned context RELEVANT to this prompt.

2026-10-30 (WS-6 M1, plan harness-capability-curve-uplift): the hook used to inject the first three
entries of every section of wiki/synthesis/cross-engagement-patterns.md plus the deduped
learned-constraints ledger on EVERY prompt, whatever the prompt was about. It now:

  1. reads the prompt from stdin (Claude Code hands UserPromptSubmit hooks `{"prompt": ...}` JSON),
  2. splits the patterns page into `## ` sections and keeps only the sections that share salient
     terms with the prompt (the Python twin of services/memoryRetrieval.ts rankSectionsByRelevance),
  3. injects ONLY constraints that WON on the held-out split: rows with status "active" and
     heldout_win true in wiki/synthesis/constraint-records.json, falling back to the ledger's
     CONSTRAINT lines (which, since WS-5 R7, list winners only),
  4. emits a <learned_context> block on stdout, at most 6 KB.

A prompt with no salient overlap with any pattern section injects no patterns; an empty winner set
injects no constraints; an empty payload emits nothing and exits 0.

2026-10-31 (agent-stack plan WS-B B2): the hook is on the ONE memory door too. When the research proxy is up it
recalls the long-term facts relevant to the prompt through /api/memory/recall (the same ranking the SPA, the
platform agent and NXT-Agency get; 1.5 s budget, loopback only). When the proxy is down it ranks
wiki/synthesis/memory-facts.json itself with the same salient-term overlap. Claude Code's own memory directory
stays separate (plan B5: a different owner and contract); this injects HiC's facts, it does not merge the stores.
"""
import sys
import os
import re
import json
import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
WIKI_DIR = os.path.join(REPO_ROOT, 'humans-in-control-research', 'hic-workspace', 'wiki', 'synthesis')
PATTERNS_FILE = os.path.join(WIKI_DIR, 'cross-engagement-patterns.md')
CONSTRAINTS_FILE = os.path.join(WIKI_DIR, 'learned-constraints.md')
RECORDS_FILE = os.path.join(WIKI_DIR, 'constraint-records.json')
FACTS_FILE = os.path.join(WIKI_DIR, 'memory-facts.json')
RUNTIME_CONFIG = os.path.join(REPO_ROOT, 'humans-in-control-research', 'hic-workspace', '.runtime', 'config.json')
PROXY_URL = os.environ.get('HIC_PROXY_URL', 'http://127.0.0.1:5012')
MAX_FACTS = 6

MAX_BYTES = 6 * 1024  # 6 KB budget for the injection
MAX_CONSTRAINTS = 12  # cap distinct constraints injected
MAX_SECTIONS = 4
MIN_SHARED_TERMS = 2
STALE_DAYS = 30

_STOP = set(('a an the and or of to in for on with by from as at is are be was were this that these those it its into over under '
             'how what which who whom when where why can could should would will shall may might must do does did done not no yes vs versus '
             'about across after against along among around before behind below beneath beside between beyond but down during except inside '
             'near off out outside through toward up upon within without analyze analysis analyse deliver define identify evaluate assess '
             'report strategy strategic recommendations recommendation outlook comprehensive state current trends trend key insights insight '
             'research findings finding deliverable deck slides patterns pattern engagement engagements prior runs run industry industries '
             'organization organisation organizations business businesses company companies market markets data based using use new 2025 2026 2027 '
             'implement fix please make code file files function test tests plan').split())


def _stem(w):
    w2 = re.sub(r'(ations?|izations?|isations?)$', 'at', w)
    w2 = re.sub(r'(ies)$', 'y', w2)
    m = re.search(r'(ing|ers?|ed|es|s)$', w2)
    if m and len(w2) - len(m.group(1)) >= 4:
        w2 = w2[:-len(m.group(1))]
    return w2


def salient_terms(text):
    out = set()
    for raw in re.findall(r'[A-Za-z][A-Za-z0-9-]{2,}', text or ''):
        acronym = len(raw) >= 3 and raw == raw.upper()
        w = raw.lower()
        if w in _STOP:
            continue
        if not acronym and len(w) < 4:
            continue
        out.add(_stem(w))
    return out


def is_fresh(path):
    if not os.path.exists(path):
        return False
    try:
        mtime = os.path.getmtime(path)
        age_days = (datetime.datetime.now().timestamp() - mtime) / 86400
        return age_days <= STALE_DAYS
    except Exception:
        return False


def read_or_empty(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ''


def read_prompt():
    """The prompt Claude Code hands the hook on stdin; empty when run by hand."""
    try:
        if sys.stdin is None or sys.stdin.isatty():
            return ''
        raw = sys.stdin.read()
    except Exception:
        return ''
    raw = (raw or '').strip()
    if not raw:
        return ''
    try:
        d = json.loads(raw)
        if isinstance(d, dict):
            return str(d.get('prompt') or d.get('user_prompt') or d.get('text') or '')
    except Exception:
        pass
    return raw


def split_sections(markdown):
    body = re.sub(r'^---[\s\S]*?\n---\s*\n', '', markdown or '', count=1)
    sections = []
    cur = None
    for line in body.splitlines():
        m = re.match(r'^##\s+(.+)$', line)
        if m:
            heading = m.group(1).strip()
            if cur and cur[0] == heading:
                continue  # the duplicated heading the miner emits
            if cur:
                sections.append((cur[0], '\n'.join(cur[1]).strip()))
            cur = (heading, [])
            continue
        if line.startswith('# '):
            continue
        if cur:
            cur[1].append(line.rstrip())
    if cur:
        sections.append((cur[0], '\n'.join(cur[1]).strip()))
    return [s for s in sections if s[1]]


def relevant_sections(markdown, prompt):
    obj = salient_terms(prompt)
    if not obj:
        return []
    ranked = []
    for heading, body in split_sections(markdown):
        terms = salient_terms(heading + ' ' + body)
        shared = sorted(t for t in terms if t in obj)
        if len(shared) < MIN_SHARED_TERMS:
            continue
        head_hit = 0.15 if any(t in obj for t in salient_terms(heading)) else 0.0
        score = min(1.0, len(shared) / max(3, len(obj)) + head_hit)
        ranked.append((score, len(shared), heading, body, shared))
    ranked.sort(key=lambda r: (-r[0], -r[1]))
    out = []
    used = 0
    for score, _n, heading, body, shared in ranked:
        cost = len(heading) + len(body) + 4
        if len(out) >= MAX_SECTIONS or used + cost > 3000:
            continue
        out.append((heading, body, shared))
        used += cost
    return out


# Constraints that contradict the master Quantitative Claim Rule in .claude/CLAUDE.md. Mirrors
# services/constraintQualityGate.ts so the agent session and the SPA enforce the SAME bar.
_MASTER_RULE_PATTERNS = [
    re.compile(r'quantif\w*.{0,60}(dollar|financial|monetary|\$)', re.I),
    re.compile(r'\b(in|with|using|provide|state|give|express)\s+(precise\s+|concrete\s+|specific\s+)?(dollar|financial|monetary)\b', re.I),
    re.compile(r'(concrete|precise|specific|hard)\s+financial\s+metric', re.I),
    re.compile(r'\bdollar\s+(figure|amount|value|impact|metric)', re.I),
    re.compile(r'(include|add|put|place|state|use|insert|lead with).{0,40}(percentage|percent|statistic|number|figure|metric|dollar).{0,40}(title|heading|headline)', re.I),
]
_GENERIC_STUB_PATTERNS = [
    re.compile(r'needs attention', re.I), re.compile(r'user edits detected', re.I), re.compile(r'requires more accuracy', re.I),
    re.compile(r'review factual claims and specificity', re.I), re.compile(r'\badd more detail', re.I), re.compile(r'clean up the output', re.I),
    re.compile(r'\bmake it clear(er)?\b', re.I), re.compile(r'free of jargon', re.I), re.compile(r'structure needs revision', re.I),
]
_LEXICON_RULE_PATTERNS = [
    re.compile(r"\b(never|don'?t|do not|stop|avoid|ban)\s+(use|using|say|saying|write|writing|reword|rephrase)\b", re.I),
    re.compile(r"\bis (slop|fine|acceptable|allowed|banned|forbidden|the correct term)\b", re.I),
    re.compile(r"\b(prefer|replace)\s+[\"'\w-]+\s+(with|over)\s+[\"'\w-]+", re.I),
]


def _rule_body(line):
    s = re.sub(r'^[-*]\s*', '', line.strip())
    s = re.sub(r'^CONSTRAINT\s*(\[[^\]]*\])?\s*:\s*', '', s, flags=re.I)
    s = re.sub(r'\(source:.*?\)\s*$', '', s, flags=re.I)
    return s.strip()


def _is_acceptable(body):
    is_lexicon = any(rx.search(body) for rx in _LEXICON_RULE_PATTERNS)
    if not is_lexicon and len(body) < 40:
        return False
    if any(rx.search(body) for rx in _MASTER_RULE_PATTERNS):
        return False
    if any(rx.search(body) for rx in _GENERIC_STUB_PATTERNS):
        return False
    return True


def winning_constraints():
    """Rules that won on the held-out split (WS-5 R7); the ledger's CONSTRAINT lines as the fallback."""
    rules = []
    try:
        if os.path.exists(RECORDS_FILE):
            with open(RECORDS_FILE, 'r', encoding='utf-8') as f:
                rows = json.load(f)
            for r in rows if isinstance(rows, list) else []:
                if not isinstance(r, dict) or r.get('retired'):
                    continue
                if r.get('status') == 'active' and r.get('heldout_win') is True:
                    rules.append((str(r.get('deliverableType') or (r.get('scope') or {}).get('kind') or ''), str(r.get('text') or '')))
    except Exception:
        rules = []
    if not rules and is_fresh(CONSTRAINTS_FILE):
        for line in read_or_empty(CONSTRAINTS_FILE).splitlines():
            if not line.strip().startswith('- CONSTRAINT'):
                continue
            m = re.match(r'^-\s*CONSTRAINT(?:\s*\[([^\]]+)\])?:\s*(.+)$', line.strip())
            if m:
                rules.append((str(m.group(1) or '').split('/')[0], m.group(2).strip()))
    seen = set()
    out = []
    for scope, text in rules:
        body = _rule_body(text)
        key = re.sub(r'\s+', ' ', body).lower()[:80]
        if not body or key in seen or not _is_acceptable(body):
            continue
        seen.add(key)
        out.append(f'- CONSTRAINT{" [" + scope + "]" if scope else ""}: {body}')
        if len(out) >= MAX_CONSTRAINTS:
            break
    return out


def _proxy_token():
    tok = os.environ.get('PROXY_AUTH_TOKEN', '').strip()
    if tok:
        return tok
    try:
        with open(RUNTIME_CONFIG, 'r', encoding='utf-8') as f:
            return str((json.load(f) or {}).get('proxyToken') or '')
    except Exception:
        return ''


def recall_facts(prompt):
    """(lines, source): the facts relevant to the prompt, from the proxy's memory door, else from the store file."""
    obj = salient_terms(prompt)
    if not obj:
        return [], ''
    try:
        import urllib.parse
        import urllib.request
        q = urllib.parse.urlencode({'objective': prompt[:1500], 'limit': MAX_FACTS, 'surface': 'claude-code', 'max_chars': 1800})
        req = urllib.request.Request(f'{PROXY_URL}/api/memory/recall?{q}', headers={'x-proxy-token': _proxy_token()})
        with urllib.request.urlopen(req, timeout=1.5) as r:
            d = json.loads(r.read().decode('utf-8'))
        lines = [f"- [{f.get('category')}] {f.get('content')}" for f in (d.get('facts') or [])][:MAX_FACTS]
        return lines, 'proxy'
    except Exception:
        pass
    try:
        with open(FACTS_FILE, 'r', encoding='utf-8') as f:
            facts = json.load(f)
    except Exception:
        return [], ''
    ranked = []
    for fct in facts if isinstance(facts, list) else []:
        if not isinstance(fct, dict):
            continue
        shared = len([t for t in salient_terms(fct.get('content', '')) if t in obj])
        rel = min(1.0, shared / max(2, min(len(obj), 6)))
        if rel >= 0.2:
            ranked.append((rel * (0.6 + 0.4 * float(fct.get('confidence') or 0)), fct))
    ranked.sort(key=lambda r: -r[0])
    return [f"- [{f.get('category')}] {f.get('content')}" for _s, f in ranked[:MAX_FACTS]], 'file'


def build_payload(prompt):
    parts = []
    if is_fresh(PATTERNS_FILE):
        sections = relevant_sections(read_or_empty(PATTERNS_FILE), prompt)
        if sections:
            parts.append('CROSS-ENGAGEMENT PATTERNS (prior runs; only the sections that share this prompt\'s terms):')
            for heading, body, shared in sections:
                parts.append(f'## {heading}  (shared: {", ".join(shared[:6])})')
                parts.append(body)
    facts, source = recall_facts(prompt)
    if facts:
        if parts:
            parts.append('')
        parts.append(f'HIC MEMORY (facts every HiC agent shares, relevant to this prompt; recalled via {source}):')
        parts.extend(facts)
    constraints = winning_constraints()
    if constraints:
        if parts:
            parts.append('')
        parts.append('LEARNED CONSTRAINTS (rules that beat the incumbent on the held-out split):')
        parts.extend(constraints)
    if not parts:
        return None
    text = '\n'.join(parts)
    encoded = text.encode('utf-8')
    if len(encoded) > MAX_BYTES:
        text = encoded[:MAX_BYTES].decode('utf-8', errors='ignore').rstrip() + '\n[truncated]'
    return text


def main():
    prompt = read_prompt()
    payload = build_payload(prompt)
    if not payload:
        sys.exit(0)
    # Claude Code UserPromptSubmit hook contract: additionalContext joins the prompt's system context.
    output = {
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": (
                "<learned_context>\n"
                f"{payload}\n"
                "</learned_context>\n"
                "Apply the constraints and patterns above to any HiC research-generation work in this session. "
                "The patterns were selected for THIS prompt's subject; the constraints beat the incumbent on the held-out split."
            )
        }
    }
    sys.stdout.write(json.dumps(output))
    sys.exit(0)


if __name__ == '__main__':
    main()
