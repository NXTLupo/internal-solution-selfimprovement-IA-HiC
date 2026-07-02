/**
 * model-bakeoff-2026-06-30 — REAL non-Anthropic cost/quality bake-off.
 *
 * Answers the open questions the Gemini-only bake-off never tested:
 *   • EVIDENCE tier: is DeepSeek-V4-pro or GPT-5.5 a viable primary vs Gemini 3.1 Pro?
 *   • SCHEMA   tier: is DeepSeek-V4-flash or GPT-5.4-mini cheaper-and-equal vs Gemini 3.5 Flash?
 * Anthropic (Opus/Sonnet/Haiku) is account-capped until 2026-07-01 (probed live), so the
 * Claude arm is DEFERRED — re-run with the claude ids after the cap lifts.
 *
 * Method (mirrors plans/model-bakeoff-*-2026-06-28): identical grounded evidence + identical
 * prompt per task, temp 0, via the proxy AI endpoints. Scores: JSON parse, citation
 * faithfulness (every cited source name must exist in the grounding), structural completeness,
 * anti-slop (em-dash/banned), naked-number leakage, output tokens, measured $ (costMeter prices).
 *
 * Run:  npx tsx scripts/eval/model-bakeoff-2026-06-30.mts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const WIKI = path.join(ROOT, 'hic-workspace', 'wiki');
const ENG = path.join(WIKI, 'engagements', 'define-the-2026-state-of-the-art-operational-and-technologic', 'themes.json');
const PROXY = 'http://127.0.0.1:5012';

// Verified $/1M tokens (services/costMeter.ts, "verified against vendor pricing pages").
const PRICE: Record<string, { in: number; out: number }> = {
    'gemini-3.5-flash': { in: 0.30, out: 1.20 },
    'gemini-3.1-pro-preview': { in: 3.50, out: 10.50 },
    'deepseek-v4-flash': { in: 0.27, out: 1.10 },
    'deepseek-v4-pro': { in: 0.55, out: 2.20 },
    'gpt-5.4-mini': { in: 0.25, out: 2.00 },
    'gpt-5.5': { in: 5.00, out: 20.00 },
};
const ENDPOINT = (m: string) => m.startsWith('gpt-') ? 'openai' : m.startsWith('deepseek') ? 'deepseek' : 'gemini';

// ---- 1. Grounding: real evidence from the live engagement (themes.json). -----------------
const doc = JSON.parse(fs.readFileSync(ENG, 'utf-8'));
const themes = (doc?.data?.themes || doc?.themes || []) as any[];
const validSources = new Set<string>();
const evLines: string[] = [];
for (const t of themes.slice(0, 22)) {
    const cites = Array.isArray(t.citations) ? t.citations : [];
    const names = cites.map((c: any) => String(c.sourceName || c.source || '').trim()).filter(Boolean);
    names.forEach((n: string) => validSources.add(n));
    const quote = (t.quote || cites[0]?.text || '').toString().slice(0, 200);
    evLines.push(`- THEME: ${t.name}\n  EVIDENCE: "${quote}" [${names[0] || 'unattributed'}]\n  DETAIL: ${(t.description || '').toString().slice(0, 260)}`);
}
const GROUNDING = evLines.join('\n');
const SOURCE_LIST = [...validSources].slice(0, 30);
console.log(`[bakeoff] grounding: ${themes.length} themes, ${SOURCE_LIST.length} distinct sources, ${GROUNDING.length} chars`);

// ---- 2. Tasks (compact but faithful to the real contract). -------------------------------
const RULES = `Output ONLY valid JSON (no prose, no markdown fences). Cite ONLY source names that appear in the EVIDENCE. Do NOT invent sources. No em-dash characters. No standalone numbers/percentages outside a cited quote.`;
const TASKS = {
    schema: {
        tier: 'schema', candidates: ['gemini-3.5-flash', 'deepseek-v4-flash', 'gpt-5.4-mini'],
        system: `You are a CX strategy analyst producing a GAP-MATRIX deliverable. ${RULES}\nSHAPE: {"rows":[{"capability":str,"current":str,"target":str,"severity":"high"|"med"|"low","evidence":{"quote":str,"source":str}}]} with EXACTLY 5 rows.`,
        required: ['rows'], rowKey: 'rows', rowFields: ['capability', 'current', 'target', 'severity', 'evidence'],
    },
    evidence: {
        tier: 'evidence', candidates: ['gemini-3.1-pro-preview', 'deepseek-v4-pro', 'gpt-5.5'],
        system: `You are a CX strategy analyst producing a CASE-STUDY deliverable grounded in the evidence. ${RULES}\nSHAPE: {"title":str,"subject":str,"challenge":str,"approach":str,"outcome":str,"evidence":[{"quote":str,"source":str,"shows":str}]} with 3-4 evidence items, each quote drawn from the EVIDENCE.`,
        required: ['title', 'subject', 'challenge', 'approach', 'outcome', 'evidence'], rowKey: 'evidence', rowFields: ['quote', 'source', 'shows'],
    },
} as const;
const USER = `EVIDENCE (cite only these sources):\n${GROUNDING}\n\nValid source names: ${SOURCE_LIST.join(' | ')}\n\nGenerate the deliverable now as JSON.`;

// ---- 3. Call one model via the proxy at temp 0. ------------------------------------------
async function callModel(model: string, system: string): Promise<{ text: string; inTok: number; outTok: number; httpOk: boolean; err?: string }> {
    const ep = ENDPOINT(model);
    let url: string, body: any, headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ep === 'gemini') {
        url = `${PROXY}/api/ai/gemini`;
        body = { model, systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: USER }] }], config: { temperature: 0, maxOutputTokens: 4096, responseMimeType: 'application/json' } };
    } else if (ep === 'openai') {
        url = `${PROXY}/api/ai/openai`; headers['x-openai-endpoint'] = 'chat';
        body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: USER }], response_format: { type: 'json_object' }, max_completion_tokens: 4096 };
        // gpt-5.5 ONLY supports the default temperature (1); 5.4-mini accepts 0. Omit for 5.5.
        if (model !== 'gpt-5.5') (body as any).temperature = 0;
    } else {
        url = `${PROXY}/api/ai/deepseek`;
        body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: USER }], max_tokens: 4096, temperature: 0 };
    }
    try {
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        const d: any = await r.json();
        if (!r.ok) return { text: '', inTok: 0, outTok: 0, httpOk: false, err: JSON.stringify(d?.error || d).slice(0, 160) };
        let text = '', inTok = 0, outTok = 0;
        if (ep === 'gemini') {
            text = (d?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
            inTok = d?.usageMetadata?.promptTokenCount || 0; outTok = (d?.usageMetadata?.candidatesTokenCount || 0) + (d?.usageMetadata?.thoughtsTokenCount || 0);
        } else {
            text = d?.choices?.[0]?.message?.content || '';
            inTok = d?.usage?.prompt_tokens || 0; outTok = d?.usage?.completion_tokens || 0;
        }
        return { text, inTok, outTok, httpOk: true };
    } catch (e: any) {
        return { text: '', inTok: 0, outTok: 0, httpOk: false, err: String(e?.message || e).slice(0, 160) };
    }
}

// ---- 4. Score one output. ----------------------------------------------------------------
function score(task: any, raw: string) {
    const s: any = { jsonOk: false, citeFaithful: null, citeTotal: 0, citeBad: 0, structural: 0, structuralMax: 0, emDash: 0, nakedNum: 0 };
    s.emDash = (raw.match(/[‒–—―]/g) || []).length;
    let obj: any = null;
    try { obj = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()); s.jsonOk = true; } catch { return s; }
    // structural completeness
    const reqPresent = task.required.filter((k: string) => obj[k] != null && (Array.isArray(obj[k]) ? obj[k].length > 0 : String(obj[k]).trim())).length;
    const rows = Array.isArray(obj[task.rowKey]) ? obj[task.rowKey] : [];
    let rowFieldHits = 0, rowFieldMax = 0;
    for (const row of rows) { for (const f of task.rowFields) { rowFieldMax++; if (row && row[f] != null && String(typeof row[f] === 'object' ? JSON.stringify(row[f]) : row[f]).trim()) rowFieldHits++; } }
    s.structural = reqPresent + rowFieldHits; s.structuralMax = task.required.length + rowFieldMax;
    s.rows = rows.length;
    // citation faithfulness: every cited source must be in validSources
    const cited: string[] = [];
    const collect = (o: any) => { if (!o) return; if (Array.isArray(o)) return o.forEach(collect); if (typeof o === 'object') { if (o.source) cited.push(String(o.source)); Object.values(o).forEach(collect); } };
    collect(obj);
    s.citeTotal = cited.length;
    s.citeBad = cited.filter(c => ![...validSources].some(v => v.toLowerCase().includes(c.toLowerCase().slice(0, 12)) || c.toLowerCase().includes(v.toLowerCase().slice(0, 12)))).length;
    s.citeFaithful = s.citeTotal > 0 ? Math.round(100 * (s.citeTotal - s.citeBad) / s.citeTotal) : null;
    // naked numbers in top-level string fields (not inside evidence quotes)
    const topStr = task.required.filter((k: string) => typeof obj[k] === 'string').map((k: string) => obj[k]).join(' ');
    s.nakedNum = (topStr.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
    return s;
}

// ---- 5. Run. -----------------------------------------------------------------------------
(async () => {
    const results: any[] = [];
    for (const task of [TASKS.schema, TASKS.evidence]) {
        for (const model of task.candidates) {
            process.stdout.write(`[bakeoff] ${task.tier} :: ${model} ... `);
            const t0 = Date.now();
            const r = await callModel(model, task.system);
            const ms = Date.now() - t0;
            if (!r.httpOk) { console.log(`HTTP FAIL (${r.err})`); results.push({ tier: task.tier, model, httpOk: false, err: r.err, ms }); continue; }
            const sc = score(task, r.text);
            const p = PRICE[model];
            const cost = (r.inTok / 1e6) * p.in + (r.outTok / 1e6) * p.out;
            console.log(`ok json=${sc.jsonOk} cite=${sc.citeFaithful}% struct=${sc.structural}/${sc.structuralMax} rows=${sc.rows} emdash=${sc.emDash} naked=${sc.nakedNum} ${r.outTok}tok $${cost.toFixed(5)} ${ms}ms`);
            results.push({ tier: task.tier, model, httpOk: true, ms, inTok: r.inTok, outTok: r.outTok, cost, ...sc });
        }
    }
    const out = path.join(WIKI, 'eval', 'model-bakeoff-2026-06-30.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ ran_at: new Date().toISOString(), grounding_sources: SOURCE_LIST.length, results }, null, 2));
    console.log(`\n[bakeoff] wrote ${out}`);
    // scorecard
    console.log('\n=== SCORECARD ===');
    for (const tier of ['schema', 'evidence']) {
        console.log(`\n-- ${tier.toUpperCase()} tier --`);
        for (const r of results.filter(x => x.tier === tier)) {
            if (!r.httpOk) { console.log(`  ${r.model.padEnd(24)} HTTP FAIL: ${r.err}`); continue; }
            console.log(`  ${r.model.padEnd(24)} json=${r.jsonOk} cite=${r.citeFaithful}% struct=${Math.round(100 * r.structural / r.structuralMax)}% rows=${r.rows} emdash=${r.emDash} naked=${r.nakedNum} | ${r.outTok}tok $${r.cost.toFixed(5)}`);
        }
    }
})();
