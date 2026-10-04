#!/usr/bin/env node
// Theme-breadth BAKE-OFF (plan Stage 4.5 / D9, owner decision 4, budget ~$15-25).
//
// Same source-diverse corpus slice, same theme-analyst contract, three models through the live
// proxy: the Claude reasoning model in service, the Claude structured model, and Gemini Flash.
// Measures what the routing authority needs to re-tier theme breadth honestly:
//   - themes returned, themes with >= 2 distinct ORIGINS (the Independence Rule),
//   - evidence-gate flags (hedge promotion, identifiers absent from the quoted evidence),
//   - banned-phrase hits (the detect-only lexicon subset below),
//   - cost from the proxy's usage receipt (input/output/cache tokens x list price).
// Writes plans/audit-2026-09-30/bakeoff-themes-<date>.json and .md. It changes NO routing by
// itself: the decision rule is printed and the owner (or the next tranche) applies it to
// ARTIFACT_EVAL_REGISTRY['themes'] with the numbers attached.
//
//   node scripts/bakeoff-themes.mjs                 # 2 repetitions per model
//   node scripts/bakeoff-themes.mjs --reps 3 --models claude-opus-5-5,claude-sonnet-5-5,gemini-3.5-flash
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'hic-workspace', 'wiki', 'articles');
const OUT_DIR = path.join(ROOT, 'plans', 'audit-2026-09-30');
const PROXY = process.env.HIC_PROXY || 'http://127.0.0.1:5012';
const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const REPS = parseInt(argOf('--reps', '2'), 10);
const MODELS = argOf('--models', 'claude-opus-5-5,claude-sonnet-5-5,gemini-3.5-flash').split(',').map(s => s.trim()).filter(Boolean);

// List prices per 1M tokens (mirrors services/costMeter.ts / proxy/model_registry.py PRICES).
const PRICE = {
    'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
    'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5 },
    'gemini-3.5-flash': { in: 0.30, out: 2.50, cacheRead: 0.075, cacheWrite: 0.30 },
    'gemini-3.1-pro-preview': { in: 2, out: 12, cacheRead: 0.5, cacheWrite: 2 },
};
const HEDGE_RE = /\b(or something|i think|something like|if i recall|iirc|not sure|maybe|i believe|i guess|kind of|sort of)\b/i;
// Detect-only lexicon subset (the full list is services/slidePostProcessor.ts SLOP_PHRASES).
const SLOP = ['delve', 'tapestry', 'testament', 'meticulous', 'nestled', 'vibrant', 'garner', 'interplay', 'intricate', 'showcase', 'bolster', 'foster', 'enhance', 'paramount', 'utilize', 'comprehensive', 'foundational', 'multifaceted', 'leverag', 'facilitate', 'pivotal', 'ecosystem', 'synergy', 'disruptive', 'transformative', 'unprecedented', 'seamless', 'holistic', 'cutting-edge', 'game-changer', 'robust', 'actionable insights'];

function stripFm(s) { const m = s.match(/^---\n[\s\S]*?\n---\n?/); return m ? s.slice(m[0].length) : s; }
function fm(s, key) { const m = s.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, 'm')); return m ? m[1].trim() : ''; }
function originKey(url, name) {
    try { if (url) { const u = new URL(url); return `${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '') || '/'}`; } } catch { /* name */ }
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function extractJson(text) {
    let t = String(text || '').replace(/```(?:json)?/gi, '').trim();
    const first = t.indexOf('{'); if (first === -1) return null;
    const last = t.lastIndexOf('}');
    if (last > first) { try { return JSON.parse(t.slice(first, last + 1)); } catch { /* repair */ } }
    let r = t.slice(first).replace(/,\s*([}\]])/g, '$1');
    const o = (r.match(/\{/g) || []).length, c = (r.match(/\}/g) || []).length;
    const oa = (r.match(/\[/g) || []).length, ca = (r.match(/\]/g) || []).length;
    if (ca < oa) r += ']'.repeat(oa - ca); if (c < o) r += '}'.repeat(o - c);
    try { return JSON.parse(r); } catch { return null; }
}
function collectCorpus() {
    const out = [];
    let dirs = [];
    try { dirs = fs.readdirSync(ART, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { /* */ }
    const pick = ['client-uploads', ...dirs.filter(d => /^reddit-/.test(d)).slice(0, 7), ...dirs.filter(d => /jina|gemini-focused|hfa|higher/.test(d)).slice(0, 3)];
    for (const d of pick) {
        let files = [];
        try { files = fs.readdirSync(path.join(ART, d)).filter(f => f.endsWith('.md')).slice(0, 2); } catch { continue; }
        for (const f of files) {
            try {
                const raw = fs.readFileSync(path.join(ART, d, f), 'utf8');
                const src = (fm(raw, 'source') || d).replace(/\s+/g, ' ').trim();
                const url = fm(raw, 'url') || fm(raw, 'source_url') || '';
                const title = (fm(raw, 'title') || f).slice(0, 80);
                const body = stripFm(raw).replace(/\s+/g, ' ').trim().slice(0, 1200);
                if (body.length > 120) out.push({ source: src, url, title, body, origin: originKey(url, src) });
            } catch { /* skip */ }
        }
    }
    return out.slice(0, 18);
}

const corpus = collectCorpus();
if (corpus.length < 6) { console.error(`corpus too small (${corpus.length}); need the wiki articles on disk`); process.exit(1); }
const distinctOrigins = new Set(corpus.map(c => c.origin)).size;
const corpusBlock = corpus.map((c, i) => `[SOURCE ${i + 1}] source="${c.source}" | url="${c.url}" | title="${c.title}"\n${c.body}`).join('\n\n');
const SYSTEM = [
    'You are a CX research analyst extracting THEMES (a finding: a pattern, tension or condition the evidence reveals; never a product, feature or recommendation) from a multi-source corpus.',
    'Every theme cites at least 2 DIFFERENT sources by their exact source="..." value and quotes ONE verbatim span (24+ characters) from each cited excerpt.',
    'Write plain business language. Name the actor. No figures of speech. No numbers outside a quoted span. Never state as fact what a source only hedges ("I think", "or something"); quote the recollection instead.',
    'Return ONLY a JSON object: {"themes":[{"name":"<one plain sentence stating the finding>","description":"<2-3 sentences>","citations":[{"sourceName":"<source= value>","quote":"<verbatim span>"},{"sourceName":"<a different source= value>","quote":"<verbatim span>"}]}]}',
].join('\n');
const USER = `CORPUS (${corpus.length} excerpts across ${distinctOrigins} distinct origins):\n\n${corpusBlock}\n\nExtract 8-12 themes. JSON only.`;

async function callModel(model, rep) {
    const t0 = Date.now();
    // The proxy keeps an exact-match LLM cache (plans/prompt-caching-stack); an identical repeat is a
    // cache hit, not a second sample. A per-run token makes every repetition a real call.
    const USER_RUN = `${USER}

(run token ${rep}-${Date.now().toString(36)}; ignore this line)`;
    if (model.startsWith('claude')) {
        const resp = await fetch(`${PROXY}/api/ai/anthropic`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, max_tokens: 16000, system: SYSTEM, messages: [{ role: 'user', content: USER_RUN }], _hicKind: 'theme-breadth' }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(`${model} HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
        const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
        return { text, usage: data.usage || {}, ms: Date.now() - t0 };
    }
    const resp = await fetch(`${PROXY}/api/ai/gemini`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: USER_RUN }] }], config: { temperature: 0.2, maxOutputTokens: 16000, responseMimeType: 'application/json' } }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(`${model} HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 300)}`);
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
    const um = data.usageMetadata || {};
    return { text, usage: { input_tokens: um.promptTokenCount, output_tokens: um.candidatesTokenCount, cache_read_input_tokens: um.cachedContentTokenCount || 0 }, ms: Date.now() - t0 };
}

function costOf(model, u) {
    const p = PRICE[model] || PRICE['gemini-3.1-pro-preview'];
    const inp = Number(u.input_tokens || 0), out = Number(u.output_tokens || 0);
    const cr = Number(u.cache_read_input_tokens || 0), cw = Number(u.cache_creation_input_tokens || 0);
    return ((inp - cr) * p.in + out * p.out + cr * p.cacheRead + cw * p.cacheWrite) / 1e6;
}

function score(themes, bySource) {
    const n = themes.length;
    let thick = 0, hedged = 0, unverified = 0, slopHits = 0, quoteVerified = 0, quotesTotal = 0;
    for (const t of themes) {
        const cits = Array.isArray(t.citations) ? t.citations : [];
        const origins = new Set(cits.map(c => bySource.get(String(c.sourceName || '').trim()) || originKey('', c.sourceName)).filter(Boolean));
        if (origins.size >= 2) thick++;
        const prose = `${t.name || ''}. ${t.description || ''}`;
        if (HEDGE_RE.test(prose)) hedged++;
        const quotes = cits.map(c => String(c.quote || '')).filter(q => q.length >= 24);
        for (const q of quotes) {
            quotesTotal++;
            const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (corpus.some(c => norm(c.body).includes(norm(q).slice(0, 60)))) quoteVerified++;
        }
        const idents = (prose.match(/\b[A-Z][a-zA-Z0-9]+(?:[ -][A-Z][a-zA-Z0-9]+)+\b/g) || []);
        const evidence = quotes.join(' ').toLowerCase();
        if (idents.filter(i => !evidence.includes(i.toLowerCase())).length >= 2) unverified++;
        const lower = prose.toLowerCase();
        slopHits += SLOP.filter(w => lower.includes(w)).length;
    }
    const quality = n === 0 ? 0 : Math.max(0, Math.min(1,
        0.35 * (thick / n) + 0.35 * (quotesTotal ? quoteVerified / quotesTotal : 0) + 0.15 * (1 - hedged / n) + 0.15 * (1 - Math.min(1, slopHits / Math.max(1, n)))));
    return { themes: n, thick, hedged, unverifiedIdentifiers: unverified, slopHits, quotesTotal, quoteVerified, quality: Number(quality.toFixed(3)) };
}

const bySource = new Map(corpus.map(c => [c.source, c.origin]));
const runs = [];
for (const model of MODELS) {
    for (let r = 1; r <= REPS; r++) {
        process.stdout.write(`${model} rep ${r}/${REPS} ... `);
        try {
            const { text, usage, ms } = await callModel(model, r);
            const parsed = extractJson(text);
            const themes = Array.isArray(parsed?.themes) ? parsed.themes : [];
            const s = score(themes, bySource);
            const cost = costOf(model, usage);
            runs.push({ model, rep: r, ms, usage, costUsd: Number(cost.toFixed(4)), ...s, parsed: !!parsed });
            console.log(`${s.themes} themes, ${s.thick} thick, ${s.quoteVerified}/${s.quotesTotal} quotes verbatim, hedged ${s.hedged}, slop ${s.slopHits}, quality ${s.quality}, $${cost.toFixed(3)}, ${(ms / 1000).toFixed(1)}s`);
        } catch (e) {
            console.log(`FAILED: ${e.message}`);
            runs.push({ model, rep: r, error: String(e.message).slice(0, 300), themes: 0, quality: 0, costUsd: 0 });
        }
    }
}

const agg = {};
for (const m of MODELS) {
    const rs = runs.filter(r => r.model === m);
    const ok = rs.filter(r => !r.error);
    const mean = k => ok.length ? ok.reduce((a, r) => a + (r[k] || 0), 0) / ok.length : 0;
    agg[m] = { runs: rs.length, failed: rs.length - ok.length, quality: Number(mean('quality').toFixed(3)), themes: Number(mean('themes').toFixed(1)), thick: Number(mean('thick').toFixed(1)),
        quoteVerbatimRate: ok.length && ok.reduce((a, r) => a + r.quotesTotal, 0) ? Number((ok.reduce((a, r) => a + r.quoteVerified, 0) / ok.reduce((a, r) => a + r.quotesTotal, 0)).toFixed(3)) : 0,
        costUsd: Number(mean('costUsd').toFixed(4)), seconds: Number((mean('ms') / 1000).toFixed(1)) };
}
const reasoning = MODELS[0];
const base = agg[reasoning]?.quality || 0;
const decisionRule = 'a cheaper model may take theme breadth only if its mean quality is at least 0.90 of the reasoning model and its failed-run count is 0';
const candidates = MODELS.filter(m => m !== reasoning && agg[m].failed === 0 && base > 0 && agg[m].quality >= 0.9 * base).sort((a, b) => agg[a].costUsd - agg[b].costUsd);
const recommendation = candidates.length ? `re-tier theme breadth to ${candidates[0]} (quality ${agg[candidates[0]].quality} vs ${base}, cost ${agg[candidates[0]].costUsd} vs ${agg[reasoning].costUsd} per run)` : `keep ${reasoning} for theme breadth (no cheaper model reached 0.90 of its quality with zero failures)`;
const stamp = new Date().toISOString().slice(0, 10);
fs.mkdirSync(OUT_DIR, { recursive: true });
const result = { date: new Date().toISOString(), corpus: { excerpts: corpus.length, distinctOrigins }, reps: REPS, models: MODELS, runs, aggregate: agg, decisionRule, recommendation, totalCostUsd: Number(runs.reduce((a, r) => a + (r.costUsd || 0), 0).toFixed(4)) };
fs.writeFileSync(path.join(OUT_DIR, `bakeoff-themes-${stamp}.json`), JSON.stringify(result, null, 2));
const md = [
    `# Theme-breadth bake-off ${stamp}`, '',
    `Corpus: ${corpus.length} excerpts across ${distinctOrigins} distinct origins. ${REPS} repetition(s) per model. Total spend $${result.totalCostUsd}.`, '',
    '| model | runs | failed | quality | themes | thick | quote verbatim rate | cost per run | seconds |', '|---|---|---|---|---|---|---|---|---|',
    ...MODELS.map(m => `| ${m} | ${agg[m].runs} | ${agg[m].failed} | ${agg[m].quality} | ${agg[m].themes} | ${agg[m].thick} | ${agg[m].quoteVerbatimRate} | $${agg[m].costUsd} | ${agg[m].seconds} |`),
    '', `Decision rule: ${decisionRule}.`, '', `Recommendation: ${recommendation}.`, '',
    'Quality = 0.35 share of themes with two or more distinct origins + 0.35 share of quoted spans found verbatim in the corpus + 0.15 share free of hedge promotion + 0.15 share free of banned phrasing.',
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, `bakeoff-themes-${stamp}.md`), md);
console.log('\n' + md);
