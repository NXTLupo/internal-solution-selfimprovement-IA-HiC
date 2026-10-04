/**
 * GENERALITY proof for the coverage contracts of every hashtag other than #prd (2026-10-02 owner rules: "these rules
 * should also be enforced with ALL other hashtag outputs"; "generalized for ANY RESEARCH PROJECT"). Two projects
 * from different industries (synthetic hospital intake portal; the real university engagement pages on disk) run
 * every contract on a deck and on an HTML document; each must reach 100% coverage of its universe with every rule
 * passing, fill only from ledger items (verbatim quotes, no em dash), and bind ids deterministically.
 */
import { describe, it, expect } from 'vitest';
import {
    buildEngagementLedger, loadBoardThemes, mergeBoardThemes, themeLedgerItems, assignAreas, scopeThemeQuotesToEngagement,
    dropForeignThemeQuotes, type ThemeInput,
} from './engagementLedger';
import { themesFromContext } from './prdInputs';
import {
    COVERAGE_SPECS, coverageKindForQuery, coverageKindForTemplates, coverageUniverse, deckCoverageDoc, htmlCoverageDoc,
    runCoverageContract, formatCoverageSummary, matchTerms, presentationCoverageDoc, protoBriefCoverageDoc, type CoverageKind, type CoverageSlide,
} from './deliverableCoverage';
import { hospitalFixture, universityFixture, mockFetch, extractionGen, type Fixture } from './__fixtures__/coverageProjects';

async function inputsFor(fx: Fixture) {
    const store = new Map<string, string>();
    const io = { proxyBase: 'http://proxy.test', fetchImpl: mockFetch(fx, store) };
    const led = await buildEngagementLedger({ ...io, engagement: fx.engagement, requestText: fx.request, gen: extractionGen as any });
    const merged = mergeBoardThemes(fx.boardThemes, themesFromContext(await loadBoardThemes(fx.engagement, io)) as ThemeInput[]);
    const scoped = await scopeThemeQuotesToEngagement(merged, fx.engagement, io);
    const ledger = [...led.items, ...themeLedgerItems(scoped.themes)];
    const areas = assignAreas(ledger);
    return { led, ledger, areas, scoped, stats: { engagement: fx.engagement, documents: led.documentStats, foreignPages: scoped.foreignPages } };
}

/** A small model-written deck: it carries a few items by name so binding (not only fill) is exercised. */
function modelDeck(kind: CoverageKind, names: string[]): CoverageSlide[] {
    return [
        { id: 'm1', template: 'executive-brief', title: 'The core argument', executiveBrief: { sections: names.slice(0, 2).map(n => ({ heading: n, body: `${n} shapes the first release.` })) } },
        { id: 'm2', template: kind === 'personas' ? 'persona-card' : 'theme-overview', title: 'Who is affected', persona: { name: 'Pat', role: 'User', quote: '', painPoints: [{ label: names[2] || 'x', quote: '', source: '' }] } },
    ];
}

const KINDS = Object.keys(COVERAGE_SPECS) as CoverageKind[];

const fixtures: Array<[string, () => Fixture | null]> = [
    ['hospital (synthetic)', () => ({ ...hospitalFixture(), foreignSynthesis: ['articles/hic-theme-synthesis/hosp0.md'] })],
    ['university (real pages)', universityFixture],
];

describe.each(fixtures)('coverage contracts: %s', (name, make) => {
    const fx = make();
    const run = fx ? it : it.skip;

    run('scopes theme quotes to the engagement and builds a non-empty universe for every kind', async () => {
        const inp = await inputsFor(fx!);
        if (fx!.foreignSynthesis) {
            expect(inp.scoped.foreignPages).toEqual(fx!.foreignSynthesis);
            expect(inp.scoped.dropped).toBe(1);
            expect(inp.scoped.themes.some(t => t.quotes.some(q => /hosp0\.md/.test(q.pointer || '')))).toBe(false);
            // The theme whose quote was dropped is kept.
            expect(inp.scoped.themes.length).toBe(fx!.boardThemes.length);
        }
        for (const k of KINDS) {
            const u = coverageUniverse(COVERAGE_SPECS[k], inp.ledger, inp.areas);
            // Every kind except org (people) and arch (systems) has a universe on both projects.
            if (k !== 'org' && k !== 'arch' && k !== 'questionnaire') expect({ k, n: u.length > 0 }).toEqual({ k, n: true });
        }
    }, 120_000);

    run.each(KINDS)('deck contract %s reaches 100% coverage with every rule passing', async (kind) => {
        const inp = await inputsFor(fx!);
        const universe = coverageUniverse(COVERAGE_SPECS[kind], inp.ledger, inp.areas);
        const names = inp.ledger.filter(l => universe.some(u => u.id === l.id)).map(l => l.item);
        const doc = deckCoverageDoc(kind, modelDeck(kind, names), { idPrefix: `t_${kind}`, timestamp: 1 });
        const r = await runCoverageContract(doc, inp.ledger, inp.areas, inp.stats);
        const cov = r.receipt.rules.find(x => x.ruleId === 'coverage')!;
        expect(cov.checked).toBe(universe.length);
        expect(cov.violations).toEqual([]);
        for (const rule of r.receipt.rules) expect({ rule: rule.ruleId, open: rule.violations.slice(0, 3) }).toEqual({ rule: rule.ruleId, open: [] });
        // Binding found the items the model deck names (not everything is a fill).
        if (names.length >= 2) expect(r.boundByModel).toBeGreaterThan(0);
        // Every universe item is bound on some unit.
        const bound = new Set([...doc.slides, ...doc.added].flatMap(s => s._coverageIds || []));
        const areaOf = new Map(inp.ledger.map(l => [l.id, l.featureArea] as const));
        for (const id of [...bound]) { const a = areaOf.get(id); if (a) bound.add(a); }
        for (const u of universe) expect(bound.has(u.id)).toBe(true);
        // Fill slides honor the template ceilings and quote verbatim from the ledger.
        const ledgerQuotes = new Set(inp.ledger.flatMap(l => [l.quote, ...(l.sources || []).map(s => s.quote)]).filter(Boolean));
        for (const s of doc.added) {
            expect(s._coverageFill).toBe(true);
            expect(JSON.stringify(s)).not.toMatch(/—/);
            if (s.executiveBrief) {
                expect(s.executiveBrief.sections.length).toBeLessThanOrEqual(6);
                for (const sec of s.executiveBrief.sections) if (sec.evidence) expect([...ledgerQuotes].some(q => q.replace(/\s*—\s*/g, ' - ').startsWith(sec.evidence.quote.replace(/\.\.\.$/, '')))).toBe(true);
            }
            if (s.themeCluster) expect(s.themeCluster.themes.length).toBeLessThanOrEqual(4);
        }
        expect(formatCoverageSummary(r).join(' ')).toMatch(/^Coverage: the /);
    }, 120_000);

    run('the HTML contract appends an appendix that accounts for every missing item', async () => {
        const inp = await inputsFor(fx!);
        const html = '<html><body><h1>Report</h1><h2>Findings</h2><p>Nothing specific.</p></body></html>';
        const doc = htmlCoverageDoc('report', html);
        const r = await runCoverageContract(doc, inp.ledger, inp.areas, inp.stats);
        expect(r.receipt.pass).toBe(true);
        const out = doc.html();
        expect(out).toMatch(/<section class="hic-coverage-index" data-coverage="fill"[^>]*>/);
        expect(out.indexOf('hic-coverage-index')).toBeLessThan(out.indexOf('</body>'));
        // Content-free generic clusters ("Cluster 12", no statement, no quote) are outside every universe by design.
        const generic = /^(?:cluster|topic|theme|group)\s*#?\d+\.?$/i;
        const themes = inp.ledger.filter(l => l.type === 'theme' && !(generic.test(l.item.trim()) && (!l.statement || generic.test(l.statement.replace(/[.!?]$/, '').trim())) && !String(l.quote || '').trim()));
        for (const t of themes) expect(out).toContain(`data-covers="${t.id}`);
        expect(out).not.toMatch(/—/);
        // Deterministic: the same input binds and fills identically.
        const doc2 = htmlCoverageDoc('report', html);
        await runCoverageContract(doc2, inp.ledger, inp.areas, inp.stats);
        expect(doc2.html()).toBe(out);
    }, 120_000);
});

describe('coverage contract helpers', () => {
    it('routes hashtags to contracts, leaving #prd and #case-study to their own paths', () => {
        expect(coverageKindForQuery('#personas for first-year students')).toBe('personas');
        expect(coverageKindForQuery('#journey #NU')).toBe('journey');
        expect(coverageKindForQuery('#strategy #slides')).toBe('deck');
        expect(coverageKindForQuery('#report #slides on retention')).toBe('report');
        expect(coverageKindForQuery('#meta-themes')).toBe('mindmap');
        expect(coverageKindForQuery('#prd #slides')).toBeNull();
        expect(coverageKindForQuery('#case-study acme')).toBeNull();
        expect(coverageKindForQuery('what do students say?')).toBeNull();
        expect(coverageKindForTemplates(['persona-card', 'persona-card', 'slides:cover'])).toBe('personas');
        expect(coverageKindForTemplates(['prd-feature'])).toBeNull();
    });

    it('drops only foreign theme quotes, never themes', () => {
        const themes: ThemeInput[] = [{ id: 'a', name: 'A', quotes: [{ text: 'x', source: 's', pointer: 'articles/hic-theme-synthesis/f.md#c1' }, { text: 'y', source: 's', pointer: 'articles/client-uploads/u.md#c0' }] }];
        const r = dropForeignThemeQuotes(themes, ['articles/hic-theme-synthesis/f.md']);
        expect(r.dropped).toBe(1);
        expect(r.themes[0].quotes.map(q => q.text)).toEqual(['y']);
    });

    it('match terms are generic (no industry vocabulary in the stop list)', () => {
        expect([...matchTerms('Students need advising before co-op')]).toEqual(expect.arrayContaining(['student', 'advising', 'before']));
    });
});

describe('presentation and prototype-brief contracts', () => {
    const fx = hospitalFixture();
    it('a presentation gains native theme sections before the CTA, every rule passing', async () => {
        const inp = await inputsFor(fx);
        const payload: any = { sections: [{ kind: 'hero', data: { title: 'Patients finish intake before arrival' } }, { kind: 'cta', data: { title: 'Approve the pilot' } }] };
        const doc = presentationCoverageDoc(payload);
        const r = await runCoverageContract(doc, inp.ledger, inp.areas, inp.stats);
        expect(r.receipt.pass).toBe(true);
        expect(payload.sections[payload.sections.length - 1].kind).toBe('cta');
        const added = payload.sections.filter((s: any) => s.kind === 'themes');
        expect(added.length).toBeGreaterThan(0);
        for (const s of added) { expect(s.data.layout).toBe('mosaic'); expect(s.data.themes.length).toBeLessThanOrEqual(4); }
    }, 60_000);

    it('a prototype brief carries every stated feature and feedback item, with dispositions', async () => {
        const inp = await inputsFor(fx);
        const brief: any = { id: 'b1', title: 'Intake companion', one_line_thesis: 'Patients finish intake at home', use_cases: [], key_screens: [], success_criteria: [] };
        const r = await runCoverageContract(protoBriefCoverageDoc(brief, inp.ledger), inp.ledger, inp.areas, inp.stats);
        expect(r.receipt.pass).toBe(true);
        const ids = new Set(brief.client_scope.flatMap((e: any) => e.ledgerIds));
        for (const li of inp.ledger.filter(l => l.type !== 'theme')) expect(ids.has(li.id)).toBe(true);
        expect(brief.client_scope.some((e: any) => e.disposition)).toBe(true);
    }, 60_000);
});

describe('HTML appendix survives a truncated document', () => {
    it('closes an unterminated <style> before appending, so the appendix renders', async () => {
        const fx = hospitalFixture();
        const inp = await inputsFor(fx);
        const html = '<html><head><style>body{color:red} .a{';
        const doc = htmlCoverageDoc('report', html);
        await runCoverageContract(doc, inp.ledger, inp.areas, inp.stats);
        const out = doc.html();
        expect(out.indexOf('</style>')).toBeGreaterThan(0);
        expect(out.indexOf('</style>')).toBeLessThan(out.indexOf('hic-coverage-index'));
    }, 60_000);
});

describe('fill figures (live run 6)', () => {
    it('a figure is sourced only when its quote carries it', async () => {
        const { figuresSourced } = await import('./deliverableCoverage');
        expect(figuresSourced('Hurricane Helene dropped up to 30 inches of rain', 'Helene dropped up to 30 inches of rain on the region')).toBe(true);
        expect(figuresSourced('Students operate at a 95% adoption rate', 'Students rely on AI tools daily')).toBe(false);
        expect(figuresSourced('No figures here', undefined)).toBe(true);
    });
});

describe('softening unsourced figures (live run 7 strings)', () => {
    it('keeps the meaning without the figure and never writes a placeholder', async () => {
        const { softenFigures } = await import('./deliverableCoverage');
        const cases: Array<[string, string]> = [
            ['Federal funding now gates on 70% job placement within 180 days', 'Federal funding now gates on job placement within a set period'],
            ['Advisor AI fluency lags a 95%-adopted student baseline', 'Advisor AI fluency lags a widely adopted student baseline'],
            ['95% generative AI adoption outpaces official systems', 'Most generative AI adoption outpaces official systems'],
            ['Students draw an ethical line at AI authorship: 80% refuse to claim AI work', 'Students draw an ethical line at AI authorship: most refuse to claim AI work'],
            ['40,000 combine inventory glut is unwinding', 'Combine inventory glut is unwinding'],
        ];
        for (const [input, want] of cases) expect(softenFigures(input)).toBe(want);
        for (const [input] of cases) expect(softenFigures(input)).not.toMatch(/stated threshold|\d/);
    });
});
