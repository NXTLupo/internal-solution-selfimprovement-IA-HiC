import { describe, it, expect } from 'vitest';
import { composeSlide, archetypeKeys } from './slideComposer';
import { slideDataToStageHtml } from './slideToStageHtml';

// Registry-driven composer (Method A): a slide is composed from its archetype SPEC + tokens +
// payload, NOT a hand-coded renderX. These assert the engine materializes real, token-bound content
// from the registry spec for both brands.
describe('slideComposer (registry-driven, Method A)', () => {
    const ntPayload = {
        kicker: 'THE INTELLIGENCE AUGMENTATION SUITE',
        title: 'Nine apps, three jobs, one workflow',
        items: [
            { number: '01', name: 'Review Collector', body: 'Pulls voice of customer from three platforms in one batched job.', quote: 'one interface, three sources' },
            { number: '02', name: 'Video Analyzer', body: 'Turns hours of interviews into timestamped, searchable transcripts.', quote: 'search a two-hour session in seconds' },
            { number: '03', name: 'Social Research', body: 'Clusters community chatter into named themes with sentiment.', quote: 'the pattern, not the pile' },
            { number: '04', name: 'Journey Mapper', body: 'Turns uploaded research into a self-contained interactive map.', quote: 'a map that opens in any browser' },
        ],
        sourceLine: 'Sources: Intelligence Augmentation positioning guide',
    };

    it('composes numbered-themes with all 4 items + title + chrome (NXT)', () => {
        const html = composeSlide('numbered-themes', ntPayload, 'nxt')!;
        expect(html).toContain('Nine apps, three jobs, one workflow');
        for (const it of ntPayload.items) { expect(html).toContain(it.name); expect(html).toContain(it.number); }
        expect(html).toContain('1920px'); expect(html).toContain('128px'); // canvas + rail
        expect(html.toLowerCase()).toContain('#b8b800'); // NXT accent token bound
        expect(html).not.toContain('__'); // no leftover markers
    });

    it('flips brand by token (NU rail navy + red accent), identical structure', () => {
        const nu = composeSlide('numbered-themes', ntPayload, 'nu')!;
        expect(nu).toContain('Nine apps, three jobs, one workflow');
        expect(nu.toLowerCase()).toContain('#0e1626'); // NU navy rail
        expect(nu.toLowerCase()).toContain('#c8102e'); // NU red accent
    });

    it('stat-row composes 3 stats with MEANS/MATTERS labels', () => {
        const html = composeSlide('stat-row', { kicker: 'BY THE NUMBERS', title: 'Three numbers anchor the suite', stats: [
            { figure: '9', headline: 'products, one workflow', means: 'collect to present', matters: 'no re-keying' },
            { figure: '1,275', headline: 'external sources', means: 'curated base', matters: 'holds up in the room' },
            { figure: '60%', headline: 'external floor', means: 'enforced', matters: 'defensible' },
        ], sourceLine: 'Source: positioning guide' }, 'nxt')!;
        expect(html).toContain('1,275'); expect(html).toContain('MEANS'); expect(html).toContain('MATTERS');
    });

    it('unknown archetype returns null (fail-safe)', () => {
        expect(composeSlide('does-not-exist', {}, 'nxt')).toBeNull();
    });

    it('registers all 15 SLIDES archetypes', () => {
        expect(archetypeKeys().sort()).toEqual([
            'agenda', 'aggregate-roadmap', 'block-quote', 'cover', 'evidence-table', 'numbered-themes',
            'org-model', 'problem-diptych', 'role-needs', 'role-recommendation', 'role-roadmap',
            'scene', 'section-divider', 'stat-row', 'thesis-interstitial',
        ]);
    });

    // Every archetype must compose a non-trivial, branded, non-empty stage for BOTH brands from a
    // representative payload - this is the contract the #slides generation path depends on.
    const SAMPLES: Record<string, any> = {
        'cover': { wordmark: 'NXT HUMANS', title: 'Intelligence Augmentation', subtitle: 'Nine apps, one workflow' },
        'agenda': { title: 'TABLE OF CONTENTS', groups: [{ label: 'WHAT WE LEARNED', items: ['01: Signal', '02: Pattern'] }, { label: 'WHAT WE RECOMMEND', items: ['03: Move', '04: Roadmap'] }] },
        'section-divider': { number: '01', title: 'THE LANDSCAPE', supporting: 'Where the suite sits today.' },
        'thesis-interstitial': { kicker: 'WHAT WE LEARNED', thesis: 'The workflow, not the model, is the product.' },
        'stat-row': { kicker: 'BY THE NUMBERS', title: 'Three numbers anchor the suite', stats: [{ figure: '9', headline: 'products', means: 'collect to present', matters: 'no re-keying' }, { figure: '1,275', headline: 'sources', means: 'curated', matters: 'defensible' }, { figure: '60%', headline: 'external', means: 'enforced', matters: 'holds up' }], sourceLine: 'Source: positioning guide' },
        'block-quote': { topicKicker: 'VOICE OF THE ANALYST', quote: 'I stopped re-keying between five tools.', attributionName: 'Research lead', attributionRole: 'CX practice', corroborating: [{ figure: '5', label: 'tools collapsed', source: 'internal' }, { figure: '2h', label: 'saved per run', source: 'internal' }, { figure: '1', label: 'workflow', source: 'positioning guide' }], sourceLine: 'Source: interviews' },
        'numbered-themes': ntPayload,
        'evidence-table': { kicker: 'PEERS', title: 'How comparable suites prove it', intro: 'Named subjects, one comparison axis.', columns: ['SUITE', 'WHAT THEY PROVE', 'IMPLICATION', 'EVIDENCE'], rows: [{ subject: 'Zappos', prove: 'service as moat', implication: 'workflow wins', evidenceGrade: 'A', featured: true }, { subject: 'Stripe', prove: 'docs as product', implication: 'clarity sells', evidenceGrade: 'A', featured: true }, { subject: 'Amazon', prove: 'mechanism over goal', implication: 'systematize', evidenceGrade: 'B' }], takeaway: { label: 'PEER PATTERN', statement: 'The workflow is the moat.' }, sourceLine: 'Sources: case files' },
        'problem-diptych': { eyebrow: 'OUR PERSPECTIVE', title: 'Two forces pull the analyst apart', subhead: 'Speed versus rigor.', cards: [{ numeral: '01', heading: 'Tool sprawl', body: 'Five tools, no shared state.' }, { numeral: '02', heading: 'Re-keying tax', body: 'Every handoff loses context.' }] },
        'org-model': { eyebrow: 'OPERATING MODEL', title: 'Three roles, one pipeline', columns: [{ name: 'Collect', definition: 'Voice of customer in.', teams: { label: 'TEAMS', items: ['Research', 'Ops'] }, outcomes: { label: 'OWNED OUTCOMES', lines: ['Coverage', 'Freshness'] } }, { name: 'Synthesize', definition: 'Pattern from pile.', teams: { label: 'TEAMS', items: ['Analysts'] }, outcomes: { label: 'OWNED OUTCOMES', lines: ['Themes', 'Evidence'] } }, { name: 'Present', definition: 'Decision-ready.', teams: { label: 'TEAMS', items: ['Strategy'] }, outcomes: { label: 'OWNED OUTCOMES', lines: ['Decks', 'Asks'] } }] },
        'role-needs': { eyebrow: 'ADVANCEMENT · ANALYST', title: 'The analyst is the bottleneck', role: 'Analyst', challenges: [{ numeral: '01', heading: 'Context loss', body: 'Handoffs drop nuance.' }, { numeral: '02', heading: 'Tool sprawl', body: 'Five interfaces.' }, { numeral: '03', heading: 'Slow synthesis', body: 'Manual clustering.' }], persona: { needsLabel: 'PERSONA NEEDS', name: 'Mid-career analyst', needs: [{ kind: 'EXPERIENCE', body: 'One surface.' }, { kind: 'FUNCTIONAL', body: 'Searchable corpus.' }, { kind: 'PERSONAL', body: 'Credit for rigor.' }] } },
        'role-recommendation': { eyebrow: 'STRATEGIC RECOMMENDATION · ANALYST', title: 'Collapse the toolchain', role: 'Analyst', thesis: 'One workflow beats five tools.', actions: [{ numeral: '01', heading: 'Unify intake', body: 'Single ingest.' }, { numeral: '02', heading: 'Shared corpus', body: 'One source of truth.' }, { numeral: '03', heading: 'Composed output', body: 'Registry-driven.' }], impact: [{ label: 'REVENUE', headline: 'Faster cycles', body: 'More engagements.' }, { label: 'C-SAT', headline: 'Higher trust', body: 'Defensible decks.' }, { label: 'SERVICE NEEDS', headline: 'Less rework', body: 'No re-keying.' }] },
        'role-roadmap': { eyebrow: 'ROADMAP · ANALYST', title: 'Six months to one workflow', role: 'Analyst', phases: [{ label: 'PHASE 01 · MONTHS 1-2', name: 'Foundation', items: ['Ingest', 'Corpus'] }, { label: 'PHASE 02 · MONTHS 3-4', name: 'Synthesis', items: ['Themes', 'Evidence'] }, { label: 'PHASE 03 · MONTHS 5', name: 'Compose', items: ['Registry', 'Slides'] }, { label: 'PHASE 04 · MONTH 6', name: 'Launch', items: ['Ship', 'Measure'] }] },
        'aggregate-roadmap': { eyebrow: 'PROGRAM ROADMAP', title: 'Every role on one timeline', horizons: ['FOUNDATION', 'ENGAGE', 'OPTIMIZE', 'LAUNCH · 2028'], roles: [{ name: 'Analysts', cells: ['Ingest', 'Cluster', 'Compose', 'Ship'] }, { name: 'Strategists', cells: ['Frame', 'Draft', 'Refine', 'Present'] }, { name: 'Ops', cells: ['Wire', 'Monitor', 'Tune', 'Scale'] }] },
    };

    // END-TO-END: the deck render path. `template=slides:<archetype>` must route through
    // slideDataToStageHtml -> composeSlide and return a full, branded HTML document (no circular-import
    // breakage, no GOLD-template collision for the shared names stat-row/block-quote/section-divider).
    it('slideDataToStageHtml dispatches slides:numbered-themes to the composer (full doc)', () => {
        const doc = slideDataToStageHtml({ template: 'slides:numbered-themes', brand: 'nxt', ...ntPayload } as any);
        expect(doc).toContain('<!DOCTYPE html>');
        expect(doc).toContain('Nine apps, three jobs, one workflow');
        expect(doc).toContain('Review Collector');
        expect(doc.toLowerCase()).toContain('#b8b800');
    });
    it('slides: namespace does NOT hijack the GOLD stat-row template', () => {
        // bare "stat-row" must still hit the GOLD renderer (not the composer), proving zero collision.
        const gold = slideDataToStageHtml({ template: 'stat-row', brand: 'nxt', title: 'X', stats: [] } as any);
        const composed = slideDataToStageHtml({ template: 'slides:stat-row', brand: 'nxt', title: 'X', stats: [{ figure: '9', headline: 'apps', means: 'a', matters: 'b' }] } as any);
        expect(gold).toContain('<!DOCTYPE html>');
        expect(composed).toContain('<!DOCTYPE html>');
        expect(composed).not.toBe(gold);
    });

    for (const arch of ['cover', 'agenda', 'section-divider', 'thesis-interstitial', 'block-quote', 'evidence-table', 'problem-diptych', 'org-model', 'role-needs', 'role-recommendation', 'role-roadmap', 'aggregate-roadmap']) {
        for (const brand of ['nxt', 'nu'] as const) {
            it(`composes ${arch} for ${brand} (branded, non-empty, key content present)`, () => {
                const html = composeSlide(arch, SAMPLES[arch], brand)!;
                expect(html).toBeTruthy();
                expect(html.length).toBeGreaterThan(400);
                expect(html).toContain('1920px');
                // brand token bound: NXT chartreuse OR NU red appears
                const lc = html.toLowerCase();
                expect(brand === 'nu' ? lc.includes('#c8102e') : lc.includes('#b8b800')).toBe(true);
                expect(html).not.toContain('undefined');
                expect(html).not.toContain('[object Object]');
            });
        }
    }
});
