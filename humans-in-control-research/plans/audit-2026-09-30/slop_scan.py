"""Read-only slop scan over every stored HiC generated artifact.
Outputs a per-kind summary table, per-check counts, worst examples, deck-quality
analysis, and the CLAUDE.md vs slidePostProcessor.ts banned-list gap."""
import json, re, os, glob, sys, collections, html as htmlmod

ROOT = r'D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research'
CLAUDE_MD = r'D:\NXT-HUMANS_AI_CX_WORKBENCH\.claude\CLAUDE.md'
SPP = os.path.join(ROOT, 'services', 'slidePostProcessor.ts')
OUT = os.path.dirname(os.path.abspath(__file__))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def rd(p):
    with open(p, encoding='utf-8', errors='replace') as f:
        return f.read()

# ---------------------------------------------------------------- banned lists
md = rd(CLAUDE_MD)
sec = md.split('## Banned Slop Phrases', 1)[1].split('### Copula Avoidance', 1)[0]
claude_phrases = set()
for line in sec.splitlines():
    s = line.strip()
    if not s or s.startswith('#') or s.startswith('-') or s.startswith('Ingested') or s.startswith('Avoid'):
        continue
    if s.count(',') >= 3:
        for ph in s.split(','):
            ph = ph.strip().strip('.').lower()
            if ph and len(ph) > 2:
                claude_phrases.add(ph)
COPULA = ['serves as', 'stands as', 'marks a', 'marks the', 'represents a', 'represents the', 'embodies', 'epitomizes', 'emerges as', 'functions as', 'acts as']
COLLOC = ['overarching', 'undergird', 'undergirds', 'undergirding', 'nestled amid', 'what it buys you', 'point it at a problem', 'point them at a problem', 'the move here is', 'sure thing', 'great question', 'and that matters', 'quietly reshaping', 'quietly transforming', 'quietly becoming', 'amid a year of', 'quietly amid']
TITLE_METAPHOR = ['front door', 'trust ceiling', 'the meter', 'margin closes', 'closes the margin', 'where value leaks', 'bleeds', 'bleed', 'eats it', 'eat it', 'opens the door', 'walk through first', 'redrawing the map', 'leaks', 'unlock', 'unlocks', 'unlocking', 'north star', 'double-edged sword', 'silver bullet', 'tip of the iceberg', 'moving target', 'table stakes', 'sea change', 'inflection point', 'at a crossroads', 'perfect storm']
META_NARR = []
for m in re.finditer(r'"([^"]{4,60})"', md.split('## Meta-Narration Ban', 1)[1].split('## No Self-Referential', 1)[0]):
    META_NARR.append(m.group(1).lower())
PROCESS = []
for m in re.finditer(r'"([^"]{4,60})"', md.split('## No Self-Referential or Process Language', 1)[1].split('### Subject Discipline', 1)[0]):
    PROCESS.append(m.group(1).lower())
PROCESS = [p for p in PROCESS if '→' not in p and 'churn' not in p]
META_NARR = [p for p in META_NARR if ' ' in p]
PROCESS = [p for p in PROCESS if ' ' in p]
SUBJECT = ['lead with', 'open with', 'the report should', 'the deck should', 'section order', 'positioning guide', 'anchor the messaging', 'setting up the narrative', 'frame the story', 'how this deck', 'where to ideate', 'from diagnosis to ideation', 'the through-line', 'the pattern behind', 'how might we questions']
CUTOFF = ['as an ai', "i'm an ai", 'i am an ai', 'knowledge cutoff', 'my training data', "i don't have real-time", 'i cannot provide', 'i should note', 'please note that']
CHROME = [r'\bRun ID\b', r'\bPipeline version\b', r'\bFramework version\b', r'\bReproducibility hash\b', r'\bConfidence:\s*(HYPOTHESIS|EMERGING|VERIFIED|high|medium|low)', r'\bSegment size:', r'\bMental model:', r'\bNon-goal:', r'\bPersona type:', r'\(composite\)', r'\(synthetic\)', r'\bPhase 0\d\s*[·•]', r'\bPass 1[A-C]\b', r'\bPhase 1[A-C]\b']
QA = [r'\bTBD\b', r'\bEVIDENCE\s+GAP\b', r'\bEvidence\s+Gap\b', r'needs\s+baseline', r'\[needs', r'\bHYPOTHESIS:', r'EVIDENCE\s+NEEDED', r'to\s+be\s+quantified', r'\bN/A\b', r'\bplaceholder\b', r'\blorem ipsum\b']
POINTER = [r'\[CHUNK_\w+', r'\[articles/', r'\[sources/', r'\[wiki/', r'\[[a-z0-9_/-]+\.md#c\d+\]', r'\.md#c\d+', r'\[FILE\s*\d', r'\[\s*\]']
ANTITHESIS = [r"\bnot (?:just|only|merely|simply) [^,.;:]{2,60}[,;:]\s*(?:it'?s|but|it is|rather|they'?re)\b", r"\bisn'?t [^,.;:]{2,40}[,;]\s*it'?s\b", r"\bis not (?:a |an |the )?[^,.;:]{2,40};\s*it is\b"]
EMOJI_RE = re.compile('[\U0001F000-\U0001FAFF\u2600-\u26FF\u2700-\u27BF\u2B00-\u2BFF]')
MATHBOLD_RE = re.compile('[\U0001D400-\U0001D7FF]')
PROVIDER_TAG = re.compile(r'oaicite|oai_citation|contentReference|attached_file|turn\d+search\d+|vertexaisearch\.cloud\.google\.com', re.I)
NAKED_NUM = re.compile(r'(?<![\w.#/-])(?:\d+(?:\.\d+)?\s?%|\$\s?\d[\d,.]*\s?(?:[kKmMbB]|million|billion|trillion)?\b|\b\d+(?:\.\d+)?x\b|\b\d{1,3}(?:,\d{3})+\b|\b(?:one|two|three|four|five|six|seven|eight|nine) in (?:two|three|four|five|six|seven|eight|nine|ten)\b)')
YEAR_RE = re.compile(r'^(19|20)\d\d$')

# TS SLOP_PHRASES
ts = rd(SPP)
ts_phrases = set(p.lower() for p in re.findall(r"\{ phrase: '([^']+)'", ts))
ts_lower = ts.lower()
BANNED = sorted(claude_phrases | ts_phrases | set(COPULA) | set(COLLOC))
BANNED_RE = {ph: re.compile(r'(?<![\w-])' + re.escape(ph).replace(r'\ ', r'\s+') + r'(?![\w-])', re.I) for ph in BANNED}

QUOTE_KEYS = {'quote', 'quotes', 'keyquote', 'pullquote', 'evidence', 'evidencebasis', 'corroborating', 'quotetext', 'text', 'sourceline', 'source', 'sources', 'attribution', 'attributionname', 'attributionrole', 'citation', 'citations', 'author', 'speaker', 'by', 'figure', 'value', 'kpi', 'stat', 'stats', 'verbatim', 'excerpt', 'keyquotes'}
TITLE_KEYS = {'title', 'heading', 'thesis', 'headline', 'actiontitle'}

VERB_HINT = set('is are was were be been being has have had do does did can cannot could will would should must may might need needs lose loses lost lack lacks fail fails failed make makes made drive drives cut cuts raise raises force forces leave leaves turn turns keep keeps run runs set sets show shows shift shifts move moves grow grows fall falls rise rises win wins beat beats cost costs pay pays buy buys sell sells use uses spend spends save saves build builds break breaks hold holds stall stalls block blocks slow slows speed speeds convert converts outperform outperforms replace replaces require requires depend depends reduce reduces add adds remove removes change changes create creates reach reaches miss misses gain gains let lets start starts stop stops exceed exceeds limit limits prefer prefers expect expects want wants demand demands reward rewards punish punishes trust trusts ignore ignores skip skips abandon abandons return returns remain remains stay stays become becomes get gets go goes come comes bring brings take takes give gives put puts tell tells say says know knows see sees find finds think thinks look looks seem seems feel feels try tries ask asks work works call calls mean means own owns compete competes lead leads lag lags own owns offers offer deliver delivers treat treats earn earns capture captures matter matters outgrow outgrows decide decides choose chooses carry carries push pushes pull pulls split splits widen widens narrow narrows erode erodes double doubles triple triples squeeze squeezes'.split())

# ---------------------------------------------------------------- checks
def strip_pointers(s):
    return re.sub(r'\s*\[[^\]]*\.md#c\d+\]', '', s or '')

def is_topic_title(t):
    t2 = strip_pointers(t).strip().rstrip('.')
    w = re.findall(r"[A-Za-z']+", t2.lower())
    if not w:
        return False
    if any(x in VERB_HINT for x in w):
        return False
    if re.search(r"\b\w+(?:ed|ing)\b", t2.lower()) and len(w) > 4:
        return False   # likely has a participial verb
    return len(w) <= 7

def check_text(s, in_quote=False, is_title=False, key=''):
    """returns list of (check, snippet)"""
    hits = []
    if not s or not isinstance(s, str):
        return hits
    snip = lambda m: s[max(0, m.start()-50):m.end()+50].replace('\n', ' ')
    if '\u2014' in s:
        hits.append(('em_dash', s[max(0, s.find('\u2014')-60):s.find('\u2014')+60].replace('\n', ' ')))
    if '\u2013' in s:
        hits.append(('en_dash', s[max(0, s.find('\u2013')-40):s.find('\u2013')+40].replace('\n', ' ')))
    if EMOJI_RE.search(s):
        hits.append(('emoji', snip(EMOJI_RE.search(s))))
    if MATHBOLD_RE.search(s):
        hits.append(('unicode_bold', snip(MATHBOLD_RE.search(s))))
    if PROVIDER_TAG.search(s):
        hits.append(('provider_tag', snip(PROVIDER_TAG.search(s))))
    for p in POINTER:
        m = re.search(p, s)
        if m:
            hits.append(('raw_pointer', snip(m))); break
    for p in QA:
        m = re.search(p, s)
        if m:
            hits.append(('qa_annotation', snip(m))); break
    for p in CHROME:
        m = re.search(p, s)
        if m:
            hits.append(('chrome_metadata', snip(m))); break
    low = s.lower()
    if not in_quote:
        for ph in BANNED:
            m = BANNED_RE[ph].search(s)
            if m:
                sev = 'copula' if ph in COPULA else ('colloc' if ph in COLLOC else 'banned_phrase')
                hits.append((sev, f'<{ph}> ' + snip(m)))
        for ph in META_NARR:
            if ph in low:
                i = low.find(ph); hits.append(('meta_narration', f'<{ph}> ' + s[max(0, i-40):i+80].replace('\n', ' '))); break
        for ph in PROCESS:
            if ph in low:
                i = low.find(ph); hits.append(('process_language', f'<{ph}> ' + s[max(0, i-40):i+80].replace('\n', ' '))); break
        for ph in SUBJECT:
            if ph in low:
                i = low.find(ph); hits.append(('subject_discipline', f'<{ph}> ' + s[max(0, i-40):i+80].replace('\n', ' '))); break
        for ph in CUTOFF:
            if ph in low:
                i = low.find(ph); hits.append(('knowledge_cutoff', s[max(0, i-40):i+80].replace('\n', ' '))); break
        for p in ANTITHESIS:
            m = re.search(p, s, re.I)
            if m:
                hits.append(('antithesis', snip(m))); break
        for ph in TITLE_METAPHOR:
            m = re.search(r'\b' + re.escape(ph) + r'\b', low)
            if m:
                hits.append(('metaphor_tell', f'<{ph}> ' + s[max(0, m.start()-40):m.end()+60].replace('\n', ' '))); break
        # naked numbers outside quote fields: skip years, skip text inside quotation marks
        unq = re.sub(r'["\u201c][^"\u201d]{10,}["\u201d]', ' ', s)
        unq = strip_pointers(unq)
        m = NAKED_NUM.search(unq)
        if m and not YEAR_RE.match(m.group(0).strip()):
            hits.append(('naked_number_title' if is_title else 'naked_number', snip(m)))
    if is_title:
        t = strip_pointers(s).strip()
        if len(t) > 120:
            hits.append(('title_gt120', t[:160]))
        elif len(t) > 70:
            hits.append(('title_gt70', t))
        if is_topic_title(t):
            hits.append(('topic_title', t))
    return hits

def walk_json(obj, kind_fn, path=''):
    """yield (key, string, in_quote_context)"""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.startswith('_'):
                continue
            yield from walk_json(v, kind_fn, path + '.' + k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_json(v, kind_fn, path + f'[{i}]')
    elif isinstance(obj, str):
        keys = [p.lower() for p in re.findall(r'\.([A-Za-z_]+)', path)]
        in_quote = any(k in QUOTE_KEYS for k in keys[-2:]) if keys else False
        last = keys[-1] if keys else ''
        yield (last, obj, in_quote, path)

# ---------------------------------------------------------------- collection
Hit = collections.namedtuple('Hit', 'kind file where check snippet')
hits = []
units = collections.Counter()          # per kind: number of text units scanned
files_by_kind = collections.Counter()
fence_parse_fail = collections.Counter()
decks = []                              # deck-level reports

FENCE_RE = re.compile(r':::slide([^\n]*)\n([\s\S]*?):::', re.M)

def scan_fences(content, kind, file, where):
    out = []
    for m in FENCE_RE.finditer(content):
        attrs, body = m.group(1), m.group(2).strip()
        tpl = (re.search(r'template=([a-z:-]+)', attrs or '') or [None, ''])[1] if attrs else ''
        try:
            payload = json.loads(body)
        except Exception:
            # try trimming trailing commas
            try:
                payload = json.loads(re.sub(r',\s*([}\]])', r'\1', body))
            except Exception:
                fence_parse_fail[kind] += 1
                hits.append(Hit(kind, file, where, 'fence_json_parse_fail', body[:160].replace('\n', ' ')))
                out.append((tpl, None)); continue
        out.append((tpl, payload))
        for key, s, in_quote, path in walk_json(payload, None):
            units[kind] += 1
            is_title = key in TITLE_KEYS and not in_quote and '[' not in path and path.count('.') <= 1
            for c, sn in check_text(s, in_quote=in_quote, is_title=is_title, key=key):
                hits.append(Hit(kind, file, f'{where}:{tpl}{path}', c, sn))
    return out

def scan_plain(text, kind, file, where, titles=None):
    units[kind] += 1
    for c, sn in check_text(text):
        hits.append(Hit(kind, file, where, c, sn))
    for t in titles or []:
        for c, sn in check_text(t, is_title=True):
            if c.startswith('title') or c.startswith('topic') or c.startswith('naked_number'):
                hits.append(Hit(kind, file, where + ':heading', c, sn))

def html_text(h):
    h = re.sub(r'<(script|style)[\s\S]*?</\1>', ' ', h, flags=re.I)
    t = re.sub(r'<[^>]+>', ' ', h)
    return htmlmod.unescape(re.sub(r'\s+', ' ', t))

def html_headings(h):
    return [htmlmod.unescape(re.sub(r'<[^>]+>', '', x)).strip() for x in re.findall(r'<h[1-3][^>]*>([\s\S]*?)</h[1-3]>', h, flags=re.I)]

# deck classes per deck-composer skill
CONNECTIVE = {'slides:cover', 'slides:agenda', 'slides:section-divider', 'slides:thesis-interstitial', 'slides:scene'}
VISUAL = {'slides:stat-row', 'slides:evidence-table', 'slides:aggregate-roadmap', 'slides:infographic-exhibit', 'slides:quadrant', 'slides:flow-arc', 'slides:milestone-timeline', 'slides:means-matters', 'slides:ranked-bars', 'slides:comparison-panels'}
EVIDENCE = {'slides:block-quote', 'slides:evidence-table', 'slides:stat-row', 'slides:means-matters'}
IMG_CARRIERS = ['backgroundImage', 'itemImages', 'portraitImage', 'heroImage', 'exhibitImage', 'panelImage', 'imageUrl', 'themeImages', 'featureImages']
IMG_EXPECTED = {'slides:cover': ['backgroundImage'], 'slides:agenda': ['backgroundImage'], 'slides:numbered-themes': ['itemImages'], 'slides:role-needs': ['portraitImage'], 'slides:infographic-exhibit': ['exhibitImage'], 'slides:scene': ['heroImage', 'backgroundImage']}

def deck_report(fences, file, label):
    tpls = [t for t, p in fences]
    if len(tpls) < 3:
        return None
    body = [t for t in tpls if t not in CONNECTIVE]
    vis = [t for t in body if t in VISUAL]
    legacy = [t for t in tpls if not t.startswith('slides:')]
    counts = collections.Counter(tpls)
    consec = []
    for i in range(1, len(tpls)):
        if tpls[i] == tpls[i-1] and tpls[i] not in CONNECTIVE:
            consec.append((i, tpls[i]))
    titles = []
    budget = collections.Counter()
    empty_img = []
    has_quote = 0
    for idx, (t, p) in enumerate(fences):
        if not isinstance(p, dict):
            titles.append('<unparsed>'); continue
        title = p.get('title') or p.get('thesis') or p.get('heading') or ''
        titles.append(strip_pointers(str(title)))
        if len(strip_pointers(str(title))) > 120: budget['title>120'] += 1
        for key, s, in_quote, path in walk_json(p, None):
            k = key.lower()
            if k in ('quote',) and len(s) > 250: budget['quote>250'] += 1
            elif k in ('narrative',) and len(s) > 400: budget['narrative>400'] += 1
            elif k in ('speakernotes', 'notes') and len(s) > 600: budget['speakerNotes>600'] += 1
            elif k in ('body', 'description', 'content', 'supporting', 'intro', 'takeaway', 'means', 'matters', 'definition', 'detail', 'caption', 'subhead', 'subtitle') and len(strip_pointers(s)) > 200: budget['content>200'] += 1
        if any(isinstance(p.get(q), str) and p.get(q).strip() for q in ('quote',)) or any(isinstance(it, dict) and it.get('quote') for it in (p.get('items') or []) if isinstance(p.get('items'), list)):
            has_quote += 1
        exp = IMG_EXPECTED.get(t)
        if exp:
            present = any((isinstance(p.get(c), str) and p.get(c)) or (isinstance(p.get(c), list) and any(p.get(c))) for c in IMG_CARRIERS)
            if not present:
                empty_img.append((idx + 1, t))
    return {
        'file': file, 'label': label, 'n': len(tpls), 'distinct': len(set(tpls)), 'templates': tpls,
        'body': len(body), 'visual': len(vis), 'visual_ratio': (len(vis) / len(body)) if body else None,
        'evidence_slides': sum(1 for t in tpls if t in EVIDENCE) + has_quote, 'evidence_ratio': (sum(1 for t in tpls if t in EVIDENCE) / len(tpls)) if tpls else 0,
        'consecutive_repeats': consec, 'has_cover': 'slides:cover' in tpls, 'has_agenda': 'slides:agenda' in tpls, 'has_thesis': 'slides:thesis-interstitial' in tpls,
        'legacy_templates': legacy, 'numbered_themes': counts.get('slides:numbered-themes', 0), 'max_same': max(counts.values()),
        'titles': titles, 'budget': dict(budget), 'empty_image_slots': empty_img,
    }

# ---- 1. AIR files
air_files = glob.glob(os.path.join(ROOT, 'hic-workspace', 'sessions', '*', 'artifacts', '*.air.json'))
for f in air_files:
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception as e:
        hits.append(Hit('air', f, '', 'air_parse_fail', str(e))); continue
    kind = 'air:' + str(d.get('artifactType') or 'unknown')
    files_by_kind[kind] += 1
    content = (d.get('artifactPayload') or {}).get('content') or ''
    rel = os.path.relpath(f, ROOT)
    if ':::slide' in content:
        fences = scan_fences(content, kind, rel, 'content')
        dr = deck_report(fences, rel, 'content')
        if dr: decks.append(dr)
    elif content.lstrip().startswith('<'):
        scan_plain(html_text(content), kind, rel, 'content:html', titles=html_headings(content))
        # raw-html checks for leaked chrome
        for p in [r'Generation audit', r'verbalized[- ]sampling', r'<vs_thinking', r'commit_to', r'Run ID']:
            if re.search(p, content, re.I):
                hits.append(Hit(kind, rel, 'content:html-raw', 'chrome_metadata', p))
    elif content:
        scan_plain(content, kind, rel, 'content:text')
    # shipped payload (post-chain)
    shipped = ((d.get('postChain') or {}).get('shippedPayload')) or []
    if isinstance(shipped, dict) and shipped.get('html'):
        h = shipped['html']
        scan_plain(html_text(h), kind + '/shipped', rel, 'shipped:html', titles=html_headings(h))
        files_by_kind[kind + '/shipped'] += 1
    elif isinstance(shipped, list) and shipped:
        files_by_kind[kind + '/shipped'] += 1
        fences = []
        for s in shipped:
            tpl = s.get('template') or ''
            cp = s.get('composerPayload') or {}
            if s.get('title'):
                cp = dict(cp); cp.setdefault('title', s.get('title'))
            fences.append((tpl, cp))
            for key, st, in_quote, path in walk_json(cp, None):
                units[kind + '/shipped'] += 1
                is_title = key in TITLE_KEYS and not in_quote and '[' not in path and path.count('.') <= 1
                for c, sn in check_text(st, in_quote=in_quote, is_title=is_title, key=key):
                    hits.append(Hit(kind + '/shipped', rel, f'shipped:{tpl}{path}', c, sn))
        dr = deck_report(fences, rel, 'shipped')
        if dr: decks.append(dr)

# ---- 2. _artifact-html
for f in glob.glob(os.path.join(ROOT, 'hic-workspace', 'sessions', '_artifact-html', '*.html')):
    h = rd(f); rel = os.path.relpath(f, ROOT); files_by_kind['artifact-html'] += 1
    scan_plain(html_text(h), 'artifact-html', rel, 'html', titles=html_headings(h))
    for p in [r'Generation audit', r'verbalized[- ]sampling', r'<vs_thinking', r'commit_to', r'Run ID', r'Save as PDF']:
        if re.search(p, h, re.I):
            hits.append(Hit('artifact-html', rel, 'html-raw', 'chrome_metadata', p))
# ---- 3. _artifact-rollouts
for f in glob.glob(os.path.join(ROOT, 'hic-workspace', 'sessions', '_artifact-rollouts', '*.json')):
    rel = os.path.relpath(f, ROOT); files_by_kind['artifact-rollouts'] += 1
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception:
        continue
    for key, s, in_quote, path in walk_json(d, None):
        if len(s) < 20: continue
        units['artifact-rollouts'] += 1
        txt = html_text(s) if '<' in s and '>' in s else s
        for c, sn in check_text(txt, in_quote=in_quote):
            if c in ('en_dash',): continue
            hits.append(Hit('artifact-rollouts', rel, path[:80], c, sn))
# ---- 4. _journey-html
for f in glob.glob(os.path.join(ROOT, 'hic-workspace', 'sessions', '_journey-html', '*.html')):
    h = rd(f); rel = os.path.relpath(f, ROOT); files_by_kind['journey-html'] += 1
    scan_plain(html_text(h), 'journey-html', rel, 'html', titles=html_headings(h))
# ---- 5. chat.json assistant turns (live sessions only)
for f in glob.glob(os.path.join(ROOT, 'hic-workspace', 'sessions', '*', 'chat.json')):
    rel = os.path.relpath(f, ROOT)
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception:
        continue
    msgs = d if isinstance(d, list) else (d.get('messages') or [])
    files_by_kind['chat'] += 1
    for i, m in enumerate(msgs):
        if not isinstance(m, dict) or m.get('role') != 'assistant':
            continue
        c = str(m.get('content') or '')
        if ':::slide' in c:
            fences = scan_fences(c, 'chat:slide-fences', rel, f'msg[{i}]')
            dr = deck_report(fences, rel, f'chat msg[{i}]')
            if dr: decks.append(dr)
            prose = FENCE_RE.sub(' ', c)
            if prose.strip():
                scan_plain(prose, 'chat:prose', rel, f'msg[{i}]:around-fences')
        else:
            scan_plain(c, 'chat:prose', rel, f'msg[{i}]')
# ---- 6. wiki/eval + exemplars
for f in glob.glob(os.path.join(ROOT, 'hic-workspace', 'wiki', 'eval', '*.json')):
    rel = os.path.relpath(f, ROOT); files_by_kind['wiki-eval'] += 1
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception:
        continue
    for key, s, in_quote, path in walk_json(d, None):
        if len(s) < 20: continue
        units['wiki-eval'] += 1
        for c, sn in check_text(s, in_quote=in_quote):
            if c in ('en_dash', 'banned_phrase', 'copula', 'colloc', 'naked_number'): continue   # eval files describe rules; only hard tells count
            hits.append(Hit('wiki-eval', rel, path[:80], c, sn))
for f in glob.glob(os.path.join(ROOT, 'hic-workspace', 'wiki', 'exemplars', '**', '*.*'), recursive=True):
    if not f.endswith(('.md', '.html', '.json', '.txt')): continue
    rel = os.path.relpath(f, ROOT); files_by_kind['wiki-exemplars'] += 1
    t = rd(f)
    txt = html_text(t) if f.endswith('.html') else t
    scan_plain(txt, 'wiki-exemplars', rel, 'file', titles=html_headings(t) if f.endswith('.html') else re.findall(r'^#{1,3}\s+(.+)$', t, flags=re.M))

# ---------------------------------------------------------------- report
SEV = {'em_dash': 10, 'raw_pointer': 10, 'qa_annotation': 9, 'chrome_metadata': 9, 'provider_tag': 9, 'knowledge_cutoff': 9, 'fence_json_parse_fail': 8, 'meta_narration': 8, 'process_language': 8, 'subject_discipline': 7, 'naked_number_title': 7, 'antithesis': 6, 'metaphor_tell': 6, 'copula': 5, 'colloc': 6, 'banned_phrase': 5, 'emoji': 5, 'unicode_bold': 5, 'title_gt120': 5, 'title_gt70': 3, 'topic_title': 3, 'naked_number': 3, 'en_dash': 1}

by_kind_check = collections.defaultdict(collections.Counter)
for h in hits:
    by_kind_check[h.kind][h.check] += 1

checks = ['em_dash', 'en_dash', 'banned_phrase', 'copula', 'colloc', 'meta_narration', 'process_language', 'subject_discipline', 'naked_number_title', 'naked_number', 'qa_annotation', 'raw_pointer', 'chrome_metadata', 'metaphor_tell', 'antithesis', 'title_gt70', 'title_gt120', 'topic_title', 'emoji', 'provider_tag', 'fence_json_parse_fail']
lines = []
P = lines.append
P('# SLOP SCAN SUMMARY (files scanned per kind)')
for k in sorted(files_by_kind): P(f'  {k:28s} files={files_by_kind[k]:4d} text_units={units.get(k,0)}')
P('')
hdr = 'kind'.ljust(28) + ''.join(c[:12].rjust(13) for c in checks)
P(hdr)
for k in sorted(by_kind_check):
    P(k.ljust(28) + ''.join(str(by_kind_check[k][c]).rjust(13) for c in checks))
P('')
tot = collections.Counter(h.check for h in hits)
P('TOTALS: ' + ', '.join(f'{c}={tot[c]}' for c in checks))
P(f'fence_json_parse_fail by kind: {dict(fence_parse_fail)}')
P('')
# banned phrase frequency
bp = collections.Counter(re.match(r'<([^>]+)>', h.snippet).group(1) for h in hits if h.check in ('banned_phrase', 'copula', 'colloc') and h.snippet.startswith('<'))
P('TOP BANNED PHRASES ACTUALLY SHIPPING: ' + ', '.join(f'{p}={n}' for p, n in bp.most_common(40)))
P('')
P('# WORST EXAMPLES (severity-ranked, deduped by file+check)')
seen = set(); worst = []
for h in sorted(hits, key=lambda h: -SEV.get(h.check, 0)):
    if h.kind.startswith('wiki-eval'): continue
    key = (h.file, h.check)
    if key in seen: continue
    seen.add(key); worst.append(h)
for h in worst[:60]:
    P(f'[{h.check}] ({h.kind}) {h.file} @ {h.where}\n    {h.snippet[:260]}')
P('')
P('# PER-CHECK SAMPLES (3 each, non-eval)')
for c in checks:
    ex = [h for h in hits if h.check == c and not h.kind.startswith('wiki-eval')][:3]
    for h in ex:
        P(f'[{c}] {h.file} @ {h.where}\n    {h.snippet[:220]}')
P('')
P('# DECK-LEVEL REPORTS')
for dr in decks:
    P(f"-- {dr['file']} [{dr['label']}] n={dr['n']} distinct={dr['distinct']} body={dr['body']} visual={dr['visual']} visual_ratio={None if dr['visual_ratio'] is None else round(dr['visual_ratio'],2)} evidence_ratio={round(dr['evidence_ratio'],2)} cover={dr['has_cover']} agenda={dr['has_agenda']} thesis={dr['has_thesis']} numbered_themes={dr['numbered_themes']} max_same={dr['max_same']} consecutive={dr['consecutive_repeats']} legacy={dr['legacy_templates']} budget={dr['budget']} empty_img={dr['empty_image_slots']}")
    P('   seq: ' + ' > '.join(t.replace('slides:', '') for t in dr['templates']))
    for i, t in enumerate(dr['titles'], 1):
        P(f'   {i:2d}. {t[:140]}')
P('')
# gap analysis
P('# CLAUDE.md vs slidePostProcessor.ts BANNED LIST GAP')
not_in_array = sorted(p for p in claude_phrases if p not in ts_phrases)
not_anywhere = [p for p in not_in_array if p not in ts_lower and p.replace(' ', '-') not in ts_lower and p.replace('-', ' ') not in ts_lower]
P(f'CLAUDE.md phrases parsed: {len(claude_phrases)}; TS SLOP_PHRASES: {len(ts_phrases)}')
P(f'In CLAUDE.md but NOT in SLOP_PHRASES array ({len(not_in_array)}): ' + ', '.join(not_in_array))
P(f'Of those, not matched ANYWHERE in slidePostProcessor.ts text ({len(not_anywhere)}): ' + ', '.join(not_anywhere))
only_ts = sorted(p for p in ts_phrases if p not in claude_phrases)
P(f'In SLOP_PHRASES but not in CLAUDE.md ({len(only_ts)}): ' + ', '.join(only_ts))
P(f'META_NARR phrases parsed from CLAUDE.md: {len(META_NARR)}; PROCESS phrases: {len(PROCESS)}')
P('META_NARR=' + str(META_NARR))
P('PROCESS=' + str(PROCESS))
missing_meta = [p for p in META_NARR if p not in ts_lower]
P(f'Meta-narration phrases absent (literal) from TS: {missing_meta}')
missing_proc = [p for p in PROCESS if p not in ts_lower]
P(f'Process phrases absent (literal) from TS: {missing_proc}')

report = '\n'.join(lines)
open(os.path.join(OUT, 'slop_scan_report.txt'), 'w', encoding='utf-8').write(report)
json.dump([h._asdict() for h in hits], open(os.path.join(OUT, 'slop_hits.json'), 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
json.dump(decks, open(os.path.join(OUT, 'deck_reports.json'), 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
print(report)
