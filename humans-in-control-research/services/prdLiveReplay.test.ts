/**
 * prdLiveReplay: offline replay of the 2026-10-01 live #prd run (Northeastern Experiential Learning
 * Hub, Opus 5.5) through compile -> projection -> HTML artifact chain, with no model call and no proxy.
 *
 * The live console logged "validation 117 error(s)" and "372 claim rows, 0 pointers resolved, 0
 * independent origins, 38 blocking, 60 warning(s): UNSOURCED_FACT 98". This file rebuilds the
 * compiler inputs from the saved compile trace (the exact prompt the model saw: personas, themes,
 * journey pains, gaps and every evidence item), recompiles the saved model reply, projects the
 * document, and runs the chain with a disk-backed page fetcher in place of the proxy. The repair
 * step is off (it calls a model); the ledger line printed is the gate's verdict on the projection.
 *
 * Two input variants are replayed:
 *   AS-RUN       theme quotes carry no pointer, exactly as `prdInputs.themesFromContext` built them
 *                (it reads `chunkId` / `pointer`; the session's theme citations carry `sourceFile`).
 *   THEME-PTR    theme quotes carry the `sourceFile` pointer from the session state, which is what the
 *                inputs adapter would pass once it reads that field.
 *
 * The session lives in hic-workspace (not in git); when it is absent the suite skips.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { compilePrdAir, type PrdCompilerInputs, type PrdPersonaInput, type PrdThemeInput, type PrdJourneyPainInput, type PrdCompetitiveGapInput, type PrdEvidenceChunk } from './prdCompiler';
import { projectPrdAirToHtml, pointersOf } from './prdProjection';
import { quotesForRequirement, requirementRootTypes } from './prdAir';
import { runHtmlArtifactChain } from './htmlArtifactChain';
import type { GateChunk } from './claimLedgerGate';

const ROOT = path.resolve(__dirname, '..', 'hic-workspace');
const SESSION = path.join(ROOT, 'sessions', 'generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ');
const TRACE = path.join(SESSION, 'traces', 'prd-compile-prdair-contract-000002-claude-opus-5-5.json');
const AIR = path.join(SESSION, 'artifacts', 'prd_1790897912417.air.json');
const STATE = path.join(SESSION, 'state.json');
const WIKI = path.join(ROOT, 'wiki');
const HAVE = fs.existsSync(TRACE) && fs.existsSync(AIR) && fs.existsSync(STATE);

interface EvLine { id: string; source: string; date?: string; text: string }

function parseEvidence(lines: string[]): Map<string, EvLine> {
    const out = new Map<string, EvLine>();
    for (const l of lines) {
        const m = /^\[([^\]]+)\] \((.*?)\) (.*)$/.exec(l);
        if (!m) continue;
        const head = m[2];
        const dm = /^(.*), (\d{4}-\d{2}-\d{2})$/.exec(head);
        out.set(m[1], { id: m[1], source: dm ? dm[1] : head, date: dm ? dm[2] : undefined, text: m[3] });
    }
    return out;
}

function pageBody(rel: string): string | null {
    const file = path.join(WIKI, rel);
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file, 'utf8');
}

function chunkText(pointer: string): string | null {
    const [page, cid] = pointer.split('#');
    const raw = pageBody(page);
    if (!raw) return null;
    const fm = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(raw);
    if (!fm) return null;
    const body = raw.slice(fm[0].length);
    const re = new RegExp(`- id: "${page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#${cid}"\\s*\\n\\s*char_span: \\[(\\d+), (\\d+)\\]`);
    const sm = re.exec(fm[1]);
    return sm ? body.slice(+sm[1], +sm[2]) : null;
}

/** Rebuild the typed compiler inputs from the prompt the model saw. */
function inputsFromTrace(prompt: string, themePointers: Map<string, string> | null): PrdCompilerInputs {
    const lines = prompt.split('\n');
    const at = (label: string) => lines.findIndex(l => l.startsWith(label));
    const iPe = at('APPROVED PERSONAS'), iT = at('APPROVED THEMES'), iJ = at('JOURNEY PAIN POINTS'), iG = at('COMPETITIVE GAPS'), iE = at('EVIDENCE.');
    const ev = parseEvidence(lines.slice(iE + 1));
    const objective = (lines[0] || '').replace(/^OBJECTIVE:\s*/, '');
    const decision = lines.find(l => l.startsWith('DECISION TO SUPPORT:'))?.replace(/^DECISION TO SUPPORT:\s*/, '');

    const personas: PrdPersonaInput[] = [];
    for (const l of lines.slice(iPe + 1, iT)) {
        const pm = /^- (\S+) \| (.*)$/.exec(l);
        if (pm) {
            const parts = pm[2].split(' | ');
            const stage = parts.find(p => p.startsWith('stage of struggle:'));
            personas.push({ id: pm[1], name: parts[0], role: parts[1] && !parts[1].startsWith('stage of') && parts[1] !== 'PRIMARY' ? parts[1] : undefined, primary: parts.includes('PRIMARY'), stageOfStruggle: stage?.replace('stage of struggle: ', ''), painPoints: [] });
            continue;
        }
        const pp = /^\s+- pain: (.*?)(?: \[evidenceId (\S+)\])?$/.exec(l);
        if (pp && personas.length) {
            const e = pp[2] ? ev.get(pp[2]) : undefined;
            personas[personas.length - 1].painPoints.push({ text: pp[1], quote: e?.text, source: e?.source });
        }
    }
    const themes: PrdThemeInput[] = [];
    for (const l of lines.slice(iT + 1, iJ)) {
        const tm = /^- (\S+) \| (.*)$/.exec(l);
        if (!tm) continue;
        const parts = tm[2].split(' | ');
        const qpart = parts[parts.length - 1].startsWith('quotes:') ? parts.pop()! : 'quotes: none';
        const qids = qpart.replace('quotes: ', '').split(', ').filter(x => x && x !== 'none');
        themes.push({
            id: tm[1], name: parts[0], insight: parts.slice(1).join(' | ') || undefined,
            quotes: qids.map(q => ev.get(q)).filter((e): e is EvLine => !!e).map(e => ({ text: e.text, source: e.source, pointer: themePointers?.get(e.text) })),
        });
    }
    const journeyPains: PrdJourneyPainInput[] = [];
    for (const l of lines.slice(iJ + 1, iG)) {
        const jm = /^- (\S+) \| stage (.*?) \| (.*?)(?: \[evidenceId (\S+)\])?(?: \| personas (.*))?$/.exec(l);
        if (!jm) continue;
        const e = jm[4] ? ev.get(jm[4]) : undefined;
        journeyPains.push({ id: jm[1], stage: jm[2], text: jm[3], quote: e?.text, source: e?.source, personaIds: jm[5] ? jm[5].split(', ') : [] });
    }
    const competitiveGaps: PrdCompetitiveGapInput[] = [];
    for (const l of lines.slice(iG + 1, iE)) {
        const gm = /^- (\S+) \| (.*?)(?: \[evidenceId (\S+)\])?$/.exec(l);
        if (!gm) continue;
        const e = gm[3] ? ev.get(gm[3]) : undefined;
        const cm = /^([^:]{2,40}): (.*)$/.exec(gm[2]);
        competitiveGaps.push({ id: gm[1], text: cm ? cm[2] : gm[2], competitor: cm ? cm[1] : undefined, quote: e?.text, source: e?.source });
    }
    const evidenceChunks: PrdEvidenceChunk[] = [...ev.values()].filter(e => e.id.includes('/')).map(e => ({
        id: e.id, text: chunkText(e.id) || e.text, sources: [{ n: e.source }], date: e.date,
    }));
    return { artifactId: 'prd_1790897912417', runId: 'replay', objective, decisionToSupport: decision, brand: 'nu', personas, themes, journeyPains, competitiveGaps, evidenceChunks };
}

function themePointerMap(): Map<string, string> {
    const st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    const m = new Map<string, string>();
    for (const t of st?.themes?.themes || []) {
        for (const c of [...(t.citations || []), ...(t.keyQuotes || []), ...(t.quotes || [])]) {
            const text = String(typeof c === 'string' ? c : (c?.quote || c?.text) || '').trim();
            const p = typeof c === 'object' ? String(c?.sourceFile || c?.chunkId || c?.pointer || '') : '';
            if (text && /\.md#c\d+$/.test(p) && !m.has(text)) m.set(text, p);
        }
    }
    return m;
}

async function replay(label: string, themePointers: Map<string, string> | null) {
    const trace = JSON.parse(fs.readFileSync(TRACE, 'utf8'));
    const air = JSON.parse(fs.readFileSync(AIR, 'utf8'));
    const inputs = inputsFromTrace(trace.prompt, themePointers);
    const compiled = compilePrdAir(trace.response, inputs);
    const rep = compiled.report;
    const html = projectPrdAirToHtml(compiled.air, { brand: 'nu' });
    const chunks: GateChunk[] = (air.evidenceLedger || []).map((e: any) => ({ id: e.pointer, text: chunkText(e.pointer) || e.quote, sources: e.sources }));
    const chain = await runHtmlArtifactChain(html, {
        goalText: `${inputs.decisionToSupport || ''}. ${inputs.objective}`,
        chunks, repair: false, recordAir: false,
        fetchPage: async (p: string) => pageBody(p),
    });
    const sourceNameErrors = rep.validation.errors.filter(e => /graph\.sources\.\d+\.name/.test(e));
    console.log(`[replay ${label}] compiled PrdAir: ${rep.droppedQuotes.length} unverifiable quote(s) dropped, ${rep.hypothesisRequirementIds.length} requirement(s) typed HYPOTHESIS, validation ${rep.validation.ok ? 'ok' : `${rep.validation.errors.length} error(s)`}`);
    console.log(`[replay ${label}] validation errors: ${JSON.stringify(rep.validation.errors)}`);
    console.log(`[replay ${label}] html artifact chain (gate, before repair): ${chain.summaryLine}`);
    console.log(`[replay ${label}] compile checks: must ${compiled.air.graph.requirements.filter(q => q.tier === 'must').length}/${compiled.air.graph.requirements.length}; singularity ${rep.singularityFlags.map(f => `${f.id} ("${f.joint}")`).join(', ') || 'none'}; problem names solution ${rep.problemNamesSolution.map(x => `${x.field} ("${x.match}")`).join(', ') || 'none'}; rationales restated ${rep.rationalesRestated.length}, bound to a pointer ${rep.rationalesSourced.length}; names replaced by role ${rep.namesReplacedByRole.map(x => x.name).join(', ') || 'none'}; re-pointed to primary ${rep.repointedToPrimary.length}; privacy regime ${rep.privacyRegime.origin}: ${rep.privacyRegime.value || '(none)'}`);
    if (process.env.PRD_REPLAY_DUMP) {
        const out = path.join(process.env.PRD_REPLAY_DUMP, `prd-replay-${label}`);
        fs.writeFileSync(`${out}.html`, chain.html);
        fs.writeFileSync(`${out}.findings.json`, JSON.stringify({ before: chain.ledgerBefore.findings, rows: chain.ledgerBefore.rows.map(r => ({ id: r.id, tag: r.tag, kind: r.kind, claimType: r.claimType, pointers: r.pointers, text: r.text })) }, null, 1));
    }
    // Per traced requirement: does its trace row carry at least one pointer, and did every pointer resolve?
    const ledger = chain.ledgerBefore;
    // A requirement rooted on a theme alone is no longer a bet (2026-10-02), but a theme reference carries no
    // quote of its own; "traced" here means rooted on a quote-bearing node (pain, gap, stated item, feedback).
    const traced = compiled.air.graph.requirements.filter(q => q.claimType !== 'HYPOTHESIS' && requirementRootTypes(q, compiled.air).some(t => t !== 'theme' && t !== 'bet'));
    const resolvedTraced = traced.filter(q => {
        const ps = pointersOf(quotesForRequirement(q, compiled.air));
        if (!ps.length) return false;
        const row = ledger.rows.find(x => /^Trace: /.test(x.text) && ps.every(p => x.pointers.includes(p)));
        return !!row && !row.pointers.some(p => ledger.unresolvedPointers.includes(p));
    });
    console.log(`[replay ${label}] traced requirements ${traced.length}; with a trace row whose pointers all resolved ${resolvedTraced.length}`);
    return { compiled, html, chain, sourceNameErrors, traced, resolvedTraced };
}

describe.skipIf(!HAVE)('live #prd replay (2026-10-01 Northeastern session)', () => {
    it('AS-RUN inputs: quotes that carry a manifest pointer resolve through the chain; source names raise no naked-number error', async () => {
        const r = await replay('AS-RUN', null);
        expect(r.sourceNameErrors).toEqual([]);
        expect(r.chain.ledgerBefore.resolvedPointers).toBeGreaterThan(0);
    });

    it('THEME-PTR inputs: every traced requirement resolves at least one pointer', async () => {
        const r = await replay('THEME-PTR', themePointerMap());
        expect(r.sourceNameErrors).toEqual([]);
        const ledger = r.chain.ledgerBefore;
        expect(ledger.resolvedPointers).toBeGreaterThan(0);
        expect(r.traced.length).toBeGreaterThan(0);
        expect(r.resolvedTraced.length).toBe(r.traced.length);
        // Every rendered quotation carries a pointer that resolved, and none failed the verbatim check.
        const quoteRows = ledger.rows.filter(x => x.tag === 'blockquote');
        expect(quoteRows.length).toBeGreaterThan(0);
        for (const q of quoteRows) expect(q.pointers.length, q.text).toBeGreaterThan(0);
        expect(ledger.summary.UNVERIFIED_QUOTE).toBe(0);
        expect(ledger.unresolvedPointers).toEqual([]);
    });
});
