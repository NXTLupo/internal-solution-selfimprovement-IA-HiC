import { describe, it, expect } from 'vitest';
import { projectPrdAirToDeck, projectPrdAirToHtml, PRD_DECK_ARCHETYPES, isTargetCarrier } from './prdProjection';
import { hasNakedNumber, isRequirementTarget } from './prdAir';
import { makePrdAirFixture, FIXTURE_POINTERS } from './prdAir.fixture';
import { composeSlide, archetypeKeys } from './slideComposer';
import { slideDataToStageHtml, PRD_PROJECTION_ARCHETYPES } from './slideToStageHtml';
import { getBrand } from '../components/slideTemplates/brands';
import { evaluateClaimLedger, extractClaimRows, type GateChunk } from './claimLedgerGate';
import { quotesForRequirement } from './prdAir';

// Stage 3.3: the #prd deck is a projection of PrdAir onto REGISTERED composer archetypes (no generic
// fallback), and the document is the two-tier HTML the artifact chain gates.
const CONNECTIVE = new Set(['cover', 'agenda', 'section-divider', 'thesis-interstitial', 'scene']);

function walkStrings(v: any, path: string, out: Array<{ path: string; text: string }>) {
    if (v == null) return;
    if (isRequirementTarget(v)) return;
    if (typeof v === 'string') { out.push({ path, text: v }); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walkStrings(x, `${path}.${i}`, out)); return; }
    if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walkStrings(x, `${path}.${k}`, out);
}

describe('deck projection', () => {
    const air = makePrdAirFixture();
    const deck = projectPrdAirToDeck(air, 'nxt');

    it('emits eight to ten slides, every one on a registered slides: archetype, cover first and trace last', () => {
        expect(deck.length).toBeGreaterThanOrEqual(8);
        expect(deck.length).toBeLessThanOrEqual(10);
        const keys = new Set(archetypeKeys());
        for (const s of deck) {
            expect(s.template.startsWith('slides:')).toBe(true);
            expect(keys.has(s.template.slice('slides:'.length)), s.template).toBe(true);
        }
        expect(deck[0].template).toBe('slides:cover');
        expect(deck[deck.length - 1].template).toBe('slides:prd-trace');
    });

    it('uses all four PRD archetypes and both twins agree on the set', () => {
        const used = new Set(deck.map(s => s.template.slice('slides:'.length)));
        for (const a of PRD_DECK_ARCHETYPES) expect(used.has(a), a).toBe(true);
        expect([...PRD_PROJECTION_ARCHETYPES].sort()).toEqual([...PRD_DECK_ARCHETYPES].sort());
    });

    it('never places the same body archetype on consecutive slides (deck gate adjacency rule)', () => {
        const body = deck.map(s => s.template.slice('slides:'.length)).filter(a => !CONNECTIVE.has(a));
        for (let i = 1; i < body.length; i++) expect(body[i], `slide ${i}`).not.toBe(body[i - 1]);
    });

    for (const brand of ['nxt', 'nu'] as const) {
        it(`every slide composes for ${brand} with no generic fallback and no leaked placeholders`, () => {
            const d = projectPrdAirToDeck(air, brand);
            for (const s of d) {
                const inner = composeSlide(s.template.slice('slides:'.length), s.composerPayload, brand);
                expect(inner, s.template).toBeTruthy();
                const doc = slideDataToStageHtml({ template: s.template, brand, title: s.title, composerPayload: s.composerPayload } as any);
                expect(doc).toContain('<!DOCTYPE html>');
                expect(doc).not.toContain('generic fallback');
                expect(doc).not.toContain('undefined');
                expect(doc).not.toContain('[object Object]');
                expect(doc).not.toContain('NaN');
                expect(doc).not.toContain('\u2014');
            }
        });
    }

    it('the ledger renders the HYPOTHESIS requirement as a BET and carries the typed target', () => {
        const ledger = deck.find(s => s.template === 'slides:prd-ledger')!;
        const rows: any[] = ledger.composerPayload.rows;
        const bet = rows.find(r => r.id === 'R-3');
        expect(bet.tier).toBe('BET');
        expect(bet.traces).toMatch(/^NON-OBVIOUS BET/);
        const r4 = rows.find(r => r.id === 'R-4');
        expect(isTargetCarrier(r4.target)).toBe(true);
        expect(r4.target.label).toBe('review latency: 2 s p95');
        const html = composeSlide('prd-ledger', ledger.composerPayload, 'nxt')!;
        expect(html).toContain('review latency: 2 s p95');
        expect(html).toContain('NON-OBVIOUS BET');
    });

    it('the goals slide carries the appetite as a typed target in the band, and the problem slide cites pointers', () => {
        const goals = deck.find(s => s.id.endsWith('-goals'))!;
        expect(isTargetCarrier(goals.composerPayload.band)).toBe(true);
        expect(composeSlide('prd-story', goals.composerPayload, 'nu')).toContain('appetite: 6 weeks');
        const problem = deck.find(s => s.id.endsWith('-problem'))!;
        expect(problem.composerPayload.cards).toHaveLength(3);
        expect(problem.composerPayload.sourceLine).toContain(`[${FIXTURE_POINTERS.weekly}]`);
        expect(problem.composerPayload.band.label).toBe('WHY NOW');
    });

    it('the signals slide carries the seven fields per row and the trace slide one row per requirement', () => {
        const signals = deck.find(s => s.template === 'slides:prd-signals')!;
        expect(signals.composerPayload.columns).toHaveLength(7);
        for (const row of signals.composerPayload.rows) for (const k of ['signal', 'instrument', 'population', 'direction', 'baseline', 'type', 'guardrail']) expect(row[k], k).toBeTruthy();
        const trace = deck.find(s => s.template === 'slides:prd-trace')!;
        expect(trace.composerPayload.rows.map((r: any) => r.id)).toEqual(['R-1', 'R-2', 'R-3', 'R-4']);
        expect(trace.composerPayload.rows[0].quote.length).toBeLessThanOrEqual(80);
    });

    it('no composer payload string carries a naked number outside quote cards and typed targets', () => {
        const strings: Array<{ path: string; text: string }> = [];
        for (const s of deck) walkStrings(s.composerPayload, s.id, strings);
        // Exempt: verbatim quote bodies (cards / challenges) and the archetype's structural ordinal
        // numerals (the same autoNumber labels every registered archetype paints).
        const offenders = strings.filter(x => !/\.cards\.\d+\.body$/.test(x.path) && !/challenges\.\d+\.(body|numeral)$/.test(x.path) && hasNakedNumber(x.text));
        expect(offenders).toEqual([]);
    });
});

describe('HTML document projection (the HTML artifact chain input)', () => {
    const air = makePrdAirFixture();
    const html = projectPrdAirToHtml(air, { brand: 'nxt', generatedAtIso: '2026-10-01T00:00:00Z' });

    it('is a self-contained two-tier document with a <main>, twelve sections and the trace matrix', () => {
        expect(html).toContain('<main');
        expect(html).toContain('</main>');
        expect((html.match(/class="prd-section/g) || []).length).toBe(13);   // twelve sections + the matrix
        expect(html).toContain('Tier one');
        expect(html).toContain('Tier two');
        expect(html).toContain('Traceability matrix');
        expect(html).toContain('<h1 class="prd-h1">Growers decide coverage from a static plan the agent never revisits</h1>');
    });

    it('quotes keep their pointers in brackets so the chain can render dated citations', () => {
        expect(html).toContain(`[${FIXTURE_POINTERS.weekly}#c3]`);
        expect(html).toContain(`[${FIXTURE_POINTERS.reddit}#c1]`);
        expect((html.match(/<figure class="prd-quote"><blockquote>/g) || []).length).toBeGreaterThanOrEqual(4);
        // A quote id that never reached a manifest page is not a pointer and never prints.
        expect(html).not.toMatch(/\[Q-\d+\]|\[P\d+\.pain\.\d+\]|\[T\d+\.q\.\d+\]/);
    });

    it('renders requirement targets as typed spans, the HYPOTHESIS requirement as a bet, and no em-dash', () => {
        expect((html.match(/data-requirement-target="1"/g) || []).length).toBeGreaterThanOrEqual(3);
        expect(html).toContain('Non-obvious bet');
        expect(html).toContain('The alternative wins when:');
        expect(html).not.toContain('\u2014');
    });

    it('resolves colors and fonts from brand tokens, not literals in the projection', () => {
        expect(html).toContain('--color-accent:#B8B800');
        const nu = projectPrdAirToHtml(air, { brand: 'nu' });
        expect(nu).toContain('--color-accent:#C8102E');
        expect(nu).toContain("--font-body:'Lato'");
    });

    // 2026-10-01 - third brand mode. `#prd #deciem` must render the DECIEM skin (black ink, white
    // paper, pink accent, Poppins uppercase headlines, Josefin Sans body), never fall back to NXT.
    it('DECIEM renders from the DECIEM tokens, never the NXT fallback', () => {
        const deciem = projectPrdAirToHtml(air, { brand: 'deciem' });
        expect(deciem).toContain('data-brand="deciem"');
        expect(deciem).toContain('--color-accent:#FB48C4');
        expect(deciem).toContain("--font-title:'Poppins'");
        expect(deciem).toContain("--font-body:'Josefin Sans'");
        // template audit: labels are Poppins Bold, tables / data / meta take the FONT_MONO face (Nunito)
        expect(deciem).toContain("--font-label:'Poppins'");
        expect(deciem).toContain('--weight-label:700');
        expect(deciem).toContain(`--font-data:'${getBrand('deciem').FONT_MONO}'`);
        expect(deciem).toContain(`--font-mono:'${getBrand('deciem').FONT_MONO}'`);
        expect(deciem).not.toContain('IBM Plex Mono');
        // NXT keeps its mono label face and body-face table cells
        expect(html).toContain("--font-label:'IBM Plex Mono'");
        expect(deciem).toContain('--color-ink:#000000');
        expect(deciem).toContain('--title-transform:uppercase');
        expect(deciem).not.toContain('#B8B800');
        expect(deciem).not.toContain('Saira Condensed');
        // NXT and NU keep their headline case
        expect(html).toContain('--title-transform:none');
        const deck = projectPrdAirToDeck(air, 'deciem');
        expect(deck[0].composerPayload.wordmark).toBe('DECIEM');
        expect(deck.every(s => s.brand === 'deciem')).toBe(true);
        expect(projectPrdAirToDeck(air, 'nu')[0].composerPayload.wordmark).toBe('NORTHEASTERN');
        expect(projectPrdAirToDeck(air, 'nxt')[0].composerPayload.wordmark).toBe('NXT HUMANS');
    });

    it('visible prose carries no naked number outside quotes, typed targets and section numerals', () => {
        const stripped = html
            .replace(/<style[\s\S]*?<\/style>/g, '')
            .replace(/<blockquote[\s\S]*?<\/blockquote>/g, '')
            .replace(/<span class="prd-target"[^>]*>[\s\S]*?<\/span>/g, '')
            .replace(/<span class="prd-num"[^>]*>[^<]*<\/span>/g, '')
            .replace(/<figcaption>[\s\S]*?<\/figcaption>/g, '')
            .replace(/<[^>]+>/g, ' ');
        expect(hasNakedNumber(stripped)).toBe(false);
    });
});

// 2026-10-01 live replay: the chain bound 0 of 372 rows to evidence because every pointer sat in a <cite>
// outside the quote's <p>, and the gate never visits a block nested in another block. These tests pin
// the binding contract from the projection side: what the claim ledger actually extracts.
describe('HTML projection meets the claim ledger binding contract', () => {
    const air = makePrdAirFixture();
    const html = projectPrdAirToHtml(air, { brand: 'nxt' });
    const rows = extractClaimRows(html);
    const chunks: GateChunk[] = air.graph.quotes.map(q => ({ id: String(q.pointer), text: `Context before. ${q.text} Context after.` }));

    it('every rendered quotation is a claim row that carries its own chunk pointer', () => {
        const quoteRows = rows.filter(r => r.tag === 'blockquote');
        expect(quoteRows.length).toBeGreaterThanOrEqual(4);
        for (const r of quoteRows) {
            const q = air.graph.quotes.find(x => r.text.includes(x.text));
            expect(q, r.text).toBeTruthy();
            expect(r.pointers).toEqual([q!.pointer]);
        }
    });

    it('every traced requirement has a Trace row carrying the pointers of the quotes behind its pains and gaps', () => {
        for (const req of air.graph.requirements.filter(r => r.claimType !== 'HYPOTHESIS')) {
            const expected = quotesForRequirement(req, air).map(q => q.pointer!);
            const row = rows.find(r => r.text.startsWith('Trace: ') && expected.every(p => r.pointers.includes(p)));
            expect(row, req.id).toBeTruthy();
        }
        // persona and theme labels ride in a separate row with no pointer (scope match)
        for (const r of rows.filter(x => x.text.startsWith('Serves: '))) expect(r.pointers).toEqual([]);
    });

    it('problem, why-now and job-story prose carry the pointers of their own quotes', () => {
        const problemPtrs = air.sections.problem.quoteIds.map(id => air.graph.quotes.find(q => q.id === id)!.pointer!);
        const problemRow = rows.find(r => r.tag === 'p' && problemPtrs.every(p => r.pointers.includes(p)) && !r.text.startsWith('Trace'));
        expect(problemRow).toBeTruthy();
        for (const j of air.sections.usersAndJobs.jobStories.filter(x => x.quoteIds.length)) {
            const ptrs = j.quoteIds.map(id => air.graph.quotes.find(q => q.id === id)!.pointer!);
            expect(rows.some(r => r.text.startsWith('When ') && ptrs.every(p => r.pointers.includes(p))), j.id).toBe(true);
        }
    });

    it('every signal row names the evidence behind the requirements it measures', () => {
        for (const m of air.graph.signals) {
            const ptrs = m.requirementIds.flatMap(id => quotesForRequirement(air.graph.requirements.find(r => r.id === id)!, air).map(q => q.pointer!));
            if (!ptrs.length) continue;
            expect(rows.some(r => r.tag === 'td' && r.text.startsWith(m.signal) && r.pointers.length > 0), m.id).toBe(true);
        }
    });

    it('typed targets and section numbers never enter a claim row', () => {
        for (const r of rows) {
            expect(r.rawInner, r.text).not.toContain('data-requirement-target');
            if (/^h[1-6]$/.test(r.tag)) expect(/\d/.test(r.text.replace(/[\w.\-]+\/[\w./\-]+\.md(?:#c\d+)?/g, '')), r.text).toBe(false);
        }
        // no claim block nests another claim block (the gate would skip both)
        expect(html).not.toMatch(/<(?:blockquote|li|td|dd)\b[^>]*>(?:(?!<\/(?:blockquote|li|td|dd)>)[\s\S])*?<(?:p|li|td|blockquote|h[1-6])\b/);
    });

    it('the claim ledger resolves every pointer and verifies every quotation verbatim', async () => {
        const ledger = await evaluateClaimLedger(html, { goalText: air.objective, chunks });
        expect(ledger.resolvedPointers).toBeGreaterThan(0);
        expect(ledger.unresolvedPointers).toEqual([]);
        expect(ledger.summary.UNVERIFIED_QUOTE).toBe(0);
        expect(ledger.independentOrigins).toBeGreaterThanOrEqual(3);
    });
});

// 2026-10-01 consulting-grade pass: specification is marked so the gate never asks a requirement or an
// acceptance test for a source (and the repair model never "narrows" one); evidence prose stays gated.
describe('claim kinds in the projected document', () => {
    const air = makePrdAirFixture();
    air.objective = 'Generate a comprehensive product requirements document for the coverage review';
    air.sections.quality.privacy.regime = 'State insurance privacy law';
    const html = projectPrdAirToHtml(air, { brand: 'nxt' });

    it('marks requirements, acceptance tests, guardrails, flows, goals and delivery as spec, and graph names as ref', () => {
        expect(html).toMatch(/<h3 class="prd-h3" data-claim-kind="spec">/);
        expect(html).toMatch(/<div class="prd-tests" data-claim-kind="spec">/);
        expect(html).toMatch(/<section class="prd-section prd-tier-2" id="prd-s8" data-claim-kind="spec">/);
        expect(html).toMatch(/<p class="prd-meta prd-trace-refs" data-claim-kind="ref">Serves:/);
        // evidence prose carries no mark: the problem paragraph and the trace row
        expect(html).toMatch(/<section class="prd-section prd-tier-1" id="prd-s2"><h2[^>]*>.*?<\/h2><p class="prd-prose">/);
        expect(html).toMatch(/<p class="prd-meta prd-trace">Trace:/);
    });
    it('the gate exempts every spec row and still reads the evidence rows', async () => {
        const rows = extractClaimRows(html);
        const exempt = rows.filter(r => r.kind === 'spec' || r.kind === 'ref');
        expect(exempt.length).toBeGreaterThan(10);
        expect(rows.filter(r => /^Given /.test(r.text)).every(r => r.kind === 'spec')).toBe(true);
        expect(rows.some(r => /^Trace: /.test(r.text) && r.kind !== 'spec' && r.kind !== 'ref')).toBe(true);
        const ledger = await evaluateClaimLedger(html, { goalText: air.objective, chunks: [] });
        const exemptIds = new Set(exempt.map(r => r.id));
        expect(ledger.findings.filter(f => exemptIds.has(f.rowId) && f.repair === 'narrow')).toEqual([]);
        expect(ledger.exemptRows).toBe(exempt.length);
    });
    it('names the privacy regime and never prints GDPR article numbers by default', () => {
        expect(html).toContain('<strong>Applicable regime:</strong> State insurance privacy law');
        expect(html).not.toMatch(/Article 25|Article 35|DPIA/);
        expect(html).toContain('Privacy impact assessment:');
    });
    it('does not echo a prompt-style objective into the reader document', () => {
        expect(html).not.toContain('Generate a comprehensive product requirements document');
        const plain = projectPrdAirToHtml({ ...air, objective: 'Decide whether to build a mid-season coverage review' }, { brand: 'nxt' });
        expect(plain).toContain('Decide whether to build a mid-season coverage review');
    });
    it('declares a reader-facing source label for every cited pointer', () => {
        const m = /<script type="application\/json" id="hic-source-labels">([\s\S]*?)<\/script>/.exec(html);
        expect(m).toBeTruthy();
        const labels = JSON.parse(m![1]);
        const cited = air.graph.quotes.map(q => q.pointer).filter((p): p is string => !!p && /\.md#c\d+$/.test(p));
        for (const p of cited) expect(labels[p]?.n, p).toBeTruthy();
        expect(Object.values(labels).every((v: any) => !/\.md|#c\d/.test(v.n))).toBe(true);
    });
});

describe('brief projects only citable quotations (2026-10-03 live)', () => {
    it('a quote whose pointer is not a wiki chunk (a corpus headline with a URL) stays out of the brief', () => {
        const air = makePrdAirFixture();
        const q = air.graph.quotes[0];
        const orphanText = 'Students did not get answers from the tutor and did not want its questions either';
        air.graph.quotes.push({ ...q, id: 'Q-99', text: orphanText, pointer: 'G5.q' } as any);
        const r = air.graph.requirements[0];
        const pain = air.graph.pains.find(p => r.painIds.includes(p.id));
        if (pain) pain.quoteIds = [...pain.quoteIds, 'Q-99'];
        const html = projectPrdAirToHtml(air, { brand: 'nxt' });
        expect(html).not.toContain(orphanText);
        expect(html).toContain(q.text.slice(0, 30));
    });
});
