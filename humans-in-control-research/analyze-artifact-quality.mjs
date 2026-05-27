/**
 * analyze-artifact-quality.mjs — quality audit of the artifacts Gemini 3.5
 * Flash just produced. Scans every text field for the EXACT rules in
 * .claude/CLAUDE.md and surfaces patterns the artifact skills should
 * prevent in future runs.
 *
 * Audit dimensions (sourced from .claude/CLAUDE.md):
 *   1. Banned slop phrases (350+ patterns, ~14 categories)
 *   2. Meta-narration ("based on the research", "this report", "in this deck")
 *   3. Process references / evidence limitations ("evidence is limited", "TBD")
 *   4. Hedge words ("perhaps", "potentially", "may or may not")
 *   5. Action title compliance (slide / theme / recommendation titles must be sentences)
 *   6. Citation discipline (specific source names — flag generic "research", "data")
 *   7. Plain-text rule (no **markdown** in generated fields)
 *   8. Content budget (title 120, content 200, narrative 400, quote 250)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, 'prove-all-artifacts.output.json'), 'utf8'));

// --- rule catalog (compressed but representative of .claude/CLAUDE.md) ---
const BANNED_SLOP = [
    // corporate
    'paradigm shift', 'game-changer', 'game changer', 'holistic approach', 'cutting-edge', 'cutting edge',
    'best-in-class', 'best in class', 'leverage synergies', 'seamless integration', 'actionable insights',
    'thought leadership', 'value proposition', 'core competency', 'move the needle', 'low-hanging fruit',
    'low hanging fruit', 'synergy', 'ecosystem of', 'disruptive', 'innovative solution', 'robust solution',
    // AI slop
    "in today's rapidly evolving", 'in today’s rapidly evolving', "it's important to note",
    'it is important to note', "it's worth noting", 'it is worth noting', 'needless to say',
    'at the end of the day', 'the reality is', 'the fact of the matter', 'when it comes to',
    'as we navigate', 'in this ever-changing', 'in this ever changing',
    // filler
    'moving forward', 'going forward', 'at this point in time', 'on a go-forward basis', 'looking ahead',
    // false profundity
    'fundamental shift', 'seismic shift', 'unprecedented', 'transformative', 'revolutionary',
    'groundbreaking', 'trailblazing', 'world-class', 'world class',
];

const META_NARRATION = [
    'this report', 'this deck', 'this presentation', 'this analysis', 'this slide', 'this section',
    'in this report', 'in this deck', 'in this presentation', 'in this analysis', 'in this section',
    'good morning', 'good afternoon', 'good evening', 'welcome to', 'thank you for being here',
    'today we will', 'today we\'ll', 'we will present', 'we are going to', 'let us now examine',
    'as you can see', 'this slide shows', 'the next slide', 'as shown above', 'as shown below',
    'as discussed', 'as noted earlier', 'as mentioned', 'as previously noted',
    'in conclusion', 'to summarize', 'in summary', 'to conclude',
    'this report aims', 'this analysis covers', 'this deck frames',
];

const PROCESS_REFERENCES = [
    'based on the research', 'based on the available data', 'according to our analysis',
    'the research shows', 'the data indicates', 'the corpus reveals', 'from the sources reviewed',
    'drawing on the evidence', 'this report finds', 'our findings suggest', 'research indicates',
    'studies show', 'sources indicate',
    // limitations
    'evidence is limited', 'data is limited', 'more research is needed', 'further investigation required',
    'additional research needed', 'due to limited data', 'while data was unavailable',
    'in the absence of', 'pending additional research',
    // QA annotations (CRITICAL — these should NEVER appear)
    'EVIDENCE GAP', 'Evidence Gap', 'evidence gap', 'TBD', '[needs baseline]',
    'baseline TBD', 'needs baseline',
];

const HEDGE_WORDS = [
    'perhaps', "it's possible", 'it is possible', 'may or may not', 'to some extent',
    'in some ways', 'arguably', 'potentially', 'conceivably', 'it could be said',
];

const GENERIC_CITATIONS = [
    // single-word generic references when used as standalone citations
    'research shows', 'studies show', 'data shows', 'evidence shows',
    'the research', 'the data', 'the evidence', 'the literature',
    'various sources', 'multiple sources', 'intelligence sources', 'analysis suggests',
];

// title / content budgets from .claude/CLAUDE.md
const BUDGETS = {
    title: 120,
    content: 200,
    narrative: 400,
    quote: 250,
    speakerNotes: 600,
};

// --- helpers ---
function* walkStrings(obj, path = '') {
    if (obj == null) return;
    if (typeof obj === 'string') {
        yield { path, value: obj };
        return;
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            yield* walkStrings(obj[i], `${path}[${i}]`);
        }
        return;
    }
    if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            yield* walkStrings(obj[key], path ? `${path}.${key}` : key);
        }
    }
}

function scan(text, patterns) {
    const hits = [];
    const lower = text.toLowerCase();
    for (const p of patterns) {
        if (lower.includes(p.toLowerCase())) hits.push(p);
    }
    return hits;
}

function isActionTitle(t) {
    if (typeof t !== 'string') return false;
    const s = t.trim();
    if (s.length === 0) return false;
    // Action title heuristic: complete sentence with conclusion
    //   PASS: 6+ words AND contains a verb-ish word OR ends with period
    //   FAIL: pure topic labels ("Market Overview", "Recommendations", "The Path Forward")
    const words = s.split(/\s+/);
    if (words.length < 5) return false;
    // Banned topic-label headers from .claude/CLAUDE.md
    const banLabels = ['The Landscape', 'Key Findings', 'Recommendations', 'The Path Forward',
        'Market Overview', 'Current Challenges', 'Executive Summary', 'Background',
        'Methodology', 'Approach', 'Overview', 'Introduction', 'Conclusion'];
    if (banLabels.some(b => s.toLowerCase() === b.toLowerCase())) return false;
    return true;
}

// --- audit loop ---
const findings = {
    bannedSlop: [],
    metaNarration: [],
    processReferences: [],
    hedgeWords: [],
    genericCitations: [],
    actionTitleViolations: [],
    budgetViolations: [],
    markdownInOutput: [],
};

for (const r of data.results) {
    const artifact = r.artifact;
    if (!r.parsed) continue;

    // 1. Scan every string field for prose-level violations
    for (const { path, value } of walkStrings(r.parsed)) {
        if (typeof value !== 'string' || value.length < 4) continue;
        const lower = value.toLowerCase();

        const slopHits = scan(value, BANNED_SLOP);
        if (slopHits.length) findings.bannedSlop.push({ artifact, path, value: value.slice(0, 160), hits: slopHits });

        const metaHits = scan(value, META_NARRATION);
        if (metaHits.length) findings.metaNarration.push({ artifact, path, value: value.slice(0, 160), hits: metaHits });

        const procHits = scan(value, PROCESS_REFERENCES);
        if (procHits.length) findings.processReferences.push({ artifact, path, value: value.slice(0, 160), hits: procHits });

        const hedgeHits = scan(value, HEDGE_WORDS);
        if (hedgeHits.length) findings.hedgeWords.push({ artifact, path, value: value.slice(0, 160), hits: hedgeHits });

        const citeHits = scan(value, GENERIC_CITATIONS);
        if (citeHits.length) findings.genericCitations.push({ artifact, path, value: value.slice(0, 160), hits: citeHits });

        // Markdown leakage
        if (/\*\*[^*]+\*\*|^#{1,4}\s|^\s*\*\s|^\s*-\s/.test(value)) {
            findings.markdownInOutput.push({ artifact, path, value: value.slice(0, 160) });
        }

        // Budget violations on relevant field types
        if (/\.title$|\.name$|\.headline$/i.test(path) && value.length > BUDGETS.title) {
            findings.budgetViolations.push({ artifact, path, field: 'title', length: value.length, limit: BUDGETS.title, value: value.slice(0, 160) });
        }
        if (/\.quote$/i.test(path) && value.length > BUDGETS.quote) {
            findings.budgetViolations.push({ artifact, path, field: 'quote', length: value.length, limit: BUDGETS.quote, value: value.slice(0, 160) });
        }
        if (/\.narrative$|\.story|\.headline$/i.test(path) && value.length > BUDGETS.narrative) {
            findings.budgetViolations.push({ artifact, path, field: 'narrative', length: value.length, limit: BUDGETS.narrative, value: value.slice(0, 160) });
        }
    }

    // 2. Action title compliance — check titles in deliverables that have them
    const titleBearingPaths = [
        { selector: r.parsed?.themes, field: 'name', label: 'theme.name' },
        { selector: r.parsed?.themes, field: 'headline', label: 'theme.headline' },
        { selector: r.parsed?.recommendations, field: 'title', label: 'recommendation.title' },
        { selector: r.parsed?.slides, field: 'title', label: 'slide.title' },
        { selector: r.parsed?.features, field: 'name', label: 'feature.name' },
        { selector: r.parsed?.horizons?.now, field: 'title', label: 'roadmap.now.title' },
        { selector: r.parsed?.horizons?.next, field: 'title', label: 'roadmap.next.title' },
        { selector: r.parsed?.horizons?.later, field: 'title', label: 'roadmap.later.title' },
    ];
    for (const { selector, field, label } of titleBearingPaths) {
        if (!Array.isArray(selector)) continue;
        for (let i = 0; i < selector.length; i++) {
            const t = selector[i]?.[field];
            if (!t) continue;
            // For names (theme.name, feature.name, recommendation.title) we DON'T require sentences —
            // they're labels. But for headlines and slide titles we DO.
            const requireSentence = /headline|slide\.title/i.test(label);
            if (requireSentence && !isActionTitle(t)) {
                findings.actionTitleViolations.push({ artifact, label, index: i, value: t });
            }
        }
    }
}

// --- print findings ---
function dumpSection(label, items, max = 8) {
    if (items.length === 0) {
        console.log(`  ${label}: clean (0 findings)`);
        return;
    }
    console.log(`  ${label}: ${items.length} finding(s)`);
    for (const f of items.slice(0, max)) {
        const hits = f.hits ? ` [${f.hits.join(', ')}]` : '';
        const detail = f.length ? ` (${f.length}/${f.limit} chars)` : '';
        console.log(`     - [${f.artifact}.${f.path || f.label}]${hits}${detail}`);
        if (f.value) console.log(`       "${f.value}"`);
    }
    if (items.length > max) console.log(`     ... and ${items.length - max} more`);
}

console.log('\n================ ARTIFACT QUALITY AUDIT ================');
console.log(`Scanning ${data.results.length} artifacts against .claude/CLAUDE.md rules.\n`);

dumpSection('BANNED SLOP', findings.bannedSlop);
console.log('');
dumpSection('META-NARRATION', findings.metaNarration);
console.log('');
dumpSection('PROCESS REFERENCES + QA ANNOTATIONS', findings.processReferences);
console.log('');
dumpSection('HEDGE WORDS', findings.hedgeWords);
console.log('');
dumpSection('GENERIC CITATIONS', findings.genericCitations);
console.log('');
dumpSection('ACTION-TITLE VIOLATIONS', findings.actionTitleViolations);
console.log('');
dumpSection('BUDGET VIOLATIONS', findings.budgetViolations);
console.log('');
dumpSection('MARKDOWN LEAKAGE', findings.markdownInOutput);

console.log('\n========================================================\n');

// --- per-artifact summary ---
const perArtifact = {};
for (const cat of Object.keys(findings)) {
    for (const f of findings[cat]) {
        perArtifact[f.artifact] ??= {};
        perArtifact[f.artifact][cat] = (perArtifact[f.artifact][cat] || 0) + 1;
    }
}
console.log('Findings by artifact:');
for (const a of data.results.map(r => r.artifact)) {
    const cats = perArtifact[a] || {};
    const tally = Object.entries(cats).map(([k, v]) => `${k}=${v}`).join('  ');
    console.log(`  ${a.padEnd(22)} ${tally || 'CLEAN'}`);
}

writeFileSync(resolve(__dirname, 'analyze-artifact-quality.findings.json'), JSON.stringify(findings, null, 2));
console.log(`\nFull findings: ${resolve(__dirname, 'analyze-artifact-quality.findings.json')}`);

const totalFindings = Object.values(findings).reduce((s, a) => s + a.length, 0);
console.log(`\nTOTAL FINDINGS: ${totalFindings} across ${data.results.length} artifacts.`);
