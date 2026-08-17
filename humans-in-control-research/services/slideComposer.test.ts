import { describe, it, expect } from 'vitest';
import { composeSlide, archetypeKeys, fitTextToBox, clauseTrunc } from './slideComposer';
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

    it('registers all 24 SLIDES archetypes (incl. the 2026-07-09 native diagram tier)', () => {
        expect(archetypeKeys().sort()).toEqual([
            'agenda', 'aggregate-roadmap', 'block-quote', 'comparison-panels', 'cover', 'evidence-table',
            'flow-arc', 'infographic-exhibit', 'means-matters', 'milestone-timeline', 'numbered-themes',
            'org-model', 'problem-diptych', 'quadrant', 'ranked-bars',
            'role-needs', 'role-recommendation', 'role-roadmap',
            'scene', 'screen-critique', 'screen-redesign', 'section-divider', 'stat-row', 'thesis-interstitial',
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
        'infographic-exhibit': { kicker: 'RISK PRIORITIZATION', title: 'Five moves take a farm from static plan to living coverage', exhibitImage: 'data:image/png;base64,AAAA', takeaway: { label: 'PATTERN', statement: 'The plan survives because review cadence is built into the product.' }, sourceLine: 'Source: client discussion notes' },
        'aggregate-roadmap': { eyebrow: 'PROGRAM ROADMAP', title: 'Every role on one timeline', horizons: ['FOUNDATION', 'ENGAGE', 'OPTIMIZE', 'LAUNCH · 2028'], roles: [{ name: 'Analysts', cells: ['Ingest', 'Cluster', 'Compose', 'Ship'] }, { name: 'Strategists', cells: ['Frame', 'Draft', 'Refine', 'Present'] }, { name: 'Ops', cells: ['Wire', 'Monitor', 'Tune', 'Scale'] }] },
        // ---- native diagram tier (2026-07-09, WS-1b) ----
        'quadrant': {
            kicker: 'PORTFOLIO POSITIONING',
            title: 'Advisory work clusters where effort outruns client value',
            xAxis: 'DELIVERY EFFORT (LOW TO HIGH)', yAxis: 'CLIENT VALUE (LOW TO HIGH)',
            quadrants: [
                { title: 'Protect', items: ['High value at low effort', 'Defend pricing'] },
                { title: 'Systematize', items: ['High value at high effort', 'Turn craft into pipeline'] },
                { title: 'Automate', items: ['Low value at low effort', 'Self-serve tooling'] },
                { title: 'Exit', items: ['Low value at high effort', 'Sunset or reprice'] },
            ],
            subjects: [
                { label: 'Research retainers', quadrant: 1 },
                { label: 'Strategy sprints', quadrant: 2 },
                { label: 'Status reporting', quadrant: 3 },
                { label: 'Custom integrations', quadrant: 4 },
                { label: 'Deck production', quadrant: 3 },
            ],
            sourceLine: 'Sources: engagement ledger review, partner interviews',
        },
        'flow-arc': {
            kicker: 'INTAKE TO DELIVERY',
            title: 'One pipeline carries a brief from intake to a shipped deck',
            steps: [
                { title: 'Ingest', description: 'Client uploads and research packs land in one corpus with per-source provenance.' },
                { title: 'Ground', description: 'The manifest graph ranks every chunk of evidence against the stated objective.' },
                { title: 'Compose', description: 'Archetype specs assemble the deck from registered bricks and brand tokens.' },
                { title: 'Export', description: 'The stage walker emits native, editable PowerPoint shapes and text runs.' },
            ],
            outcome: 'A defensible deck in one pass, with every claim traceable to a named source.',
            sourceLine: 'Source: platform architecture review',
        },
        'milestone-timeline': {
            kicker: 'ROLLOUT',
            title: 'Four gates take the platform from pilot to firm-wide default',
            milestones: [
                { date: 'JAN 2026', title: 'Pilot cohort', detail: 'Two engagement teams run live briefs.' },
                { date: 'MAR 2026', title: 'Quality gate', detail: 'Deck output clears the partner review bar.' },
                { date: 'JUN 2026', title: 'Practice rollout', detail: 'Every CX engagement defaults to the pipeline.' },
                { date: 'OCT 2026', title: 'Firm default', detail: 'Legacy tooling is retired.' },
            ],
            sourceLine: 'Source: rollout plan working session',
        },
        'means-matters': {
            kicker: 'WHAT THE FIGURES CARRY',
            title: 'Three figures explain why the practice reorganized',
            stats: [
                { figure: '1 IN 3', caption: 'briefs stall at synthesis', means: 'Analysts spend the middle of every engagement re-keying evidence between tools.', matters: 'Synthesis, not collection, is where engagements lose their margin.' },
                { figure: '5', caption: 'tools per analyst', means: 'Each handoff between tools drops context the next stage has to rebuild.', matters: 'Tool sprawl is a quality problem before it is a cost problem.' },
                { figure: '1', caption: 'workflow after the merge', means: 'Collection, synthesis, and composition now share one corpus and one state.', matters: 'The workflow, not any single model, is the durable asset.' },
            ],
            sourceLine: 'Source: "One in three briefs stalls before synthesis." (Practice operations review)',
        },
        'ranked-bars': {
            kicker: 'WHERE THE HOURS GO',
            title: 'Evidence re-keying dominates the analyst week',
            bars: [
                { label: 'Re-keying evidence', value: 100, note: '"Most of my week is moving quotes between tools." (Analyst interviews)' },
                { label: 'Source reading', value: 62, note: 'Concentrated in the opening weeks of the engagement.' },
                { label: 'Synthesis', value: 45, note: 'The highest-value hour is the scarcest one.' },
                { label: 'Client sessions', value: 30, note: 'Steady across the engagement arc.' },
            ],
            sourceLine: 'Sources: analyst time diaries, practice operations review',
        },
        'comparison-panels': {
            kicker: 'BUILD, BUY, OR ASSEMBLE',
            title: 'Assembling on the platform beats building or buying outright',
            criteria: ['TIME TO FIRST DECK', 'EVIDENCE RIGOR', 'BRAND CONTROL', 'OPERATING COST'],
            panels: [
                { name: 'Build in-house', cells: ['Quarters of engineering before first value', 'Custom, if the team builds it', 'Total, at a high price', 'Highest, and recurring'] },
                { name: 'Buy point tools', cells: ['Days, per tool', 'Varies by vendor', 'Limited to vendor themes', 'Per-seat sprawl'] },
                { name: 'Assemble on platform', cells: ['A brief away', 'Citation-gated by default', 'Token-governed, both brands', 'Marginal per engagement'] },
            ],
            sourceLine: 'Sources: vendor evaluations, platform architecture review',
        },
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

    for (const arch of ['cover', 'agenda', 'section-divider', 'thesis-interstitial', 'block-quote', 'evidence-table', 'problem-diptych', 'org-model', 'role-needs', 'role-recommendation', 'role-roadmap', 'aggregate-roadmap', 'quadrant', 'flow-arc', 'milestone-timeline', 'means-matters', 'ranked-bars', 'comparison-panels']) {
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
                expect(html).not.toContain('NaN');
            });
        }
    }

    // ---- NATIVE DIAGRAM TIER (2026-07-09, WS-1b): content + geometry sanity per archetype ----
    describe('slides:quadrant', () => {
        it('renders axes, all 4 quadrant cells, and subject chips inside the right cells (NXT)', () => {
            const html = composeSlide('quadrant', SAMPLES['quadrant'], 'nxt')!;
            expect(html).toContain('DELIVERY EFFORT (LOW TO HIGH)');
            expect(html).toContain('CLIENT VALUE (LOW TO HIGH)');
            for (const q of SAMPLES['quadrant'].quadrants) expect(html).toContain(q.title);
            for (const s of SAMPLES['quadrant'].subjects) expect(html).toContain(s.label);
            // geometry: plot dividers present (vertical at x1006, horizontal at y609)
            expect(html).toContain('left:1006px');
            expect(html).toContain('top:609px');
            // the quadrant-4 (BR) chip anchors at the BR origin
            expect(html).toContain('left:1027px;top:793px');
            // chips are accent-bordered (token, not hex literal in the spec)
            expect(html.toLowerCase()).toContain('border:2px solid #b8b800');
        });
        it('overflow: extra subjects in one quadrant drop after 3 (graceful, no overlap)', () => {
            const payload = {
                ...SAMPLES['quadrant'],
                subjects: Array.from({ length: 8 }, (_, i) => ({ label: `Crowded subject ${i + 1}`, quadrant: 1 })),
            };
            const html = composeSlide('quadrant', payload, 'nxt')!;
            expect(html).toContain('Crowded subject 1');
            expect(html).toContain('Crowded subject 3');
            expect(html).not.toContain('Crowded subject 4'); // perGroupMax 3
            expect(html).not.toContain('undefined');
        });
        it('overflow: a 5th quadrant and an out-of-range quadrant index degrade gracefully', () => {
            const payload = {
                ...SAMPLES['quadrant'],
                quadrants: [...SAMPLES['quadrant'].quadrants, { title: 'Fifth cell', items: ['Dropped'] }],
                subjects: [{ label: 'Wild index', quadrant: 9 }],
            };
            const html = composeSlide('quadrant', payload, 'nxt')!;
            expect(html).not.toContain('Fifth cell');      // count cap 4
            expect(html).toContain('Wild index');          // clamped into the last zone, not lost
        });
    });

    describe('slides:flow-arc', () => {
        it('auto-numbers steps in order and draws connectors between consecutive cards', () => {
            const html = composeSlide('flow-arc', SAMPLES['flow-arc'], 'nxt')!;
            for (const n of ['01', '02', '03', '04']) expect(html).toContain(`>${n}</div>`);
            for (const s of SAMPLES['flow-arc'].steps) { expect(html).toContain(s.title); expect(html).toContain(s.description); }
            // 4 steps -> exactly 3 connector bars (h6 accent rects; card rules are h4, distinct)
            expect((html.match(/height:6px;background:#B8B800/gi) || []).length).toBe(3);
            // outcome variant: accent band + OUTCOME label + statement
            expect(html).toContain('OUTCOME');
            expect(html).toContain(SAMPLES['flow-arc'].outcome);
        });
        it('without outcome, the base layout renders (no band, steps centered)', () => {
            const { outcome: _o, ...rest } = SAMPLES['flow-arc'];
            const html = composeSlide('flow-arc', rest, 'nxt')!;
            expect(html).not.toContain('OUTCOME');
            expect(html).toContain('Ingest');
        });
        it('overflow: 8 steps clamp to 6; steps spread across the full zone at any count', () => {
            const payload = {
                ...SAMPLES['flow-arc'],
                steps: Array.from({ length: 8 }, (_, i) => ({ title: `Step ${i + 1}`, description: 'One sentence of substance for the card body.' })),
            };
            const html = composeSlide('flow-arc', payload, 'nxt')!;
            expect(html).toContain('Step 6');
            expect(html).not.toContain('Step 7'); // count cap 6
            // 3-step payload FILLS: cards widen to (1622 - 2*56)/3 = 503px with constant 56px
            // gutters (2026-07-10 balance fix - fillW widens cards instead of inflating gaps),
            // so the last card origin lands at 196 + 2*(503+56) = 1314 and spans to the right edge.
            const three = composeSlide('flow-arc', { ...SAMPLES['flow-arc'], steps: payload.steps.slice(0, 3) }, 'nxt')!;
            expect(three).toContain('left:1314px');
            expect(three).toContain('width:503px');
        });
    });

    describe('slides:milestone-timeline', () => {
        it('renders the axis, nodes, and alternates content above/below (dyOdd)', () => {
            const html = composeSlide('milestone-timeline', SAMPLES['milestone-timeline'], 'nxt')!;
            for (const m of SAMPLES['milestone-timeline'].milestones) {
                expect(html).toContain(m.date); expect(html).toContain(m.title); expect(html).toContain(m.detail);
            }
            // the time axis hairline + accent node dots on it
            expect(html).toContain('top:609px');
            expect(html).toContain('top:601px');
            // alternation: even titles at 440, odd titles at 676
            expect(html).toContain('top:440px');
            expect(html).toContain('top:676px');
        });
        it('overflow: 9 milestones clamp to 6; long detail is fitted, never raw-overflowed', () => {
            const payload = {
                ...SAMPLES['milestone-timeline'],
                milestones: Array.from({ length: 9 }, (_, i) => ({
                    date: `M${i + 1} 2026`, title: `Gate ${i + 1}`,
                    detail: 'A deliberately overlong detail line that keeps going well past the one-line budget so the measured clamp has to intervene and cut it at a clause boundary.',
                })),
            };
            const html = composeSlide('milestone-timeline', payload, 'nxt')!;
            expect(html).toContain('Gate 6');
            expect(html).not.toContain('Gate 7');
            expect(html).not.toContain('clause boundary.'); // tail truncated away
            expect(html).not.toContain('undefined');
        });
    });

    describe('slides:means-matters', () => {
        it('renders figure + caption + MEANS/MATTERS anatomy with the dark MATTERS card (NXT)', () => {
            const html = composeSlide('means-matters', SAMPLES['means-matters'], 'nxt')!;
            expect(html).toContain('1 IN 3');
            expect(html).toContain('MEANS');
            expect(html).toContain('MATTERS');
            for (const s of SAMPLES['means-matters'].stats) { expect(html).toContain(s.means); expect(html).toContain(s.matters); }
            // dark card: rail-filled block 240px tall; matters text rides accent on it
            expect(html.toLowerCase()).toContain('height:240px;background:#0d0d0d');
            expect(html).toContain(SAMPLES['means-matters'].sourceLine);
        });
        it('two stats FILL the content zone: columns widen to 779px, second at x1039 (balance fix)', () => {
            const payload = { ...SAMPLES['means-matters'], stats: SAMPLES['means-matters'].stats.slice(0, 2) };
            const html = composeSlide('means-matters', payload, 'nxt')!;
            // (1622 - 64) / 2 = 779px columns with a constant 64px gutter - no mid-slide hole.
            expect(html).toContain('left:1039px');
            expect(html).toContain('width:779px');
        });
        it('a single stat caps at 2.2x width and CENTERS in the zone (readable measure)', () => {
            const payload = { ...SAMPLES['means-matters'], stats: SAMPLES['means-matters'].stats.slice(0, 1) };
            const html = composeSlide('means-matters', payload, 'nxt')!;
            // cap: 500 * 2.2 = 1100; centered: 196 + (1622 - 1100) / 2 = 457
            expect(html).toContain('left:457px');
            expect(html).toContain('width:1100px');
        });
        it('overflow: an over-budget means body steps down at most 2 tiers, then clause-truncates', () => {
            const long = 'The synthesis stage is where the engagement economics actually break, because every analyst re-keys the same evidence between collection tools, note stores, and the deck, and each of those handoffs silently drops the context the next stage then has to rebuild from scratch at partner review rates, and the partners themselves then re-verify each citation by hand against the original source material one more time, which is precisely the hour the practice can least afford to spend twice on the same quote.';
            const payload = { ...SAMPLES['means-matters'], stats: [SAMPLES['means-matters'].stats[1], { ...SAMPLES['means-matters'].stats[0], means: long }] };
            const html = composeSlide('means-matters', payload, 'nxt')!;
            expect(html).not.toContain('spend twice on the same quote'); // truncated tail gone
            expect(html).not.toContain('undefined');
        });
    });

    describe('slides:ranked-bars', () => {
        it('scales accent bars proportionally to value over the 800px track', () => {
            const html = composeSlide('ranked-bars', SAMPLES['ranked-bars'], 'nxt')!;
            for (const b of SAMPLES['ranked-bars'].bars) { expect(html).toContain(b.label); expect(html).toContain(b.note); }
            // value 100 -> 800px, 62 -> 496px, 45 -> 360px, 30 -> 240px (accent fills)
            for (const w of [800, 496, 360, 240]) {
                expect(html.toLowerCase()).toContain(`width:${w}px;height:28px;background:#b8b800`);
            }
            // the raw value never renders as text (naked-number ban)
            expect(html).not.toContain('>62<');
        });
        it('overflow: values clamp to 0..100, near-zero stays visible, 9 rows clamp to 6', () => {
            const payload = {
                ...SAMPLES['ranked-bars'],
                bars: Array.from({ length: 9 }, (_, i) => ({ label: `Driver ${i + 1}`, value: i === 0 ? 250 : (i === 1 ? -5 : 40), note: 'Steady.' })),
            };
            const html = composeSlide('ranked-bars', payload, 'nxt')!;
            expect(html.toLowerCase()).toContain('width:800px;height:28px;background:#b8b800'); // 250 -> clamp 100
            expect(html.toLowerCase()).toContain('width:6px;height:28px;background:#b8b800');   // -5 -> visible floor
            expect(html).toContain('Driver 6');
            expect(html).not.toContain('Driver 7');
        });
    });

    describe('slides:comparison-panels', () => {
        it('renders panel header bands + criterion rows aligned across panels', () => {
            const html = composeSlide('comparison-panels', SAMPLES['comparison-panels'], 'nxt')!;
            for (const c of SAMPLES['comparison-panels'].criteria) expect(html).toContain(c);
            for (const p of SAMPLES['comparison-panels'].panels) {
                expect(html).toContain(p.name);
                for (const cell of p.cells) expect(html).toContain(cell);
            }
            // alignment: first criterion label row and first panel cell row share y344
            // (2026-08-07 uplift: table pulled up, rows at pitch 132)
            expect((html.match(/top:344px/g) || []).length).toBeGreaterThanOrEqual(2);
            // full-width row separators drawn per real criterion (4 rows -> 4 hairlines at w1622)
            expect((html.match(/width:1622px;height:1px/g) || []).length).toBe(4);
            // previous-vs-proposed identity: the incumbent band is muted, the proposal band
            // carries the accent top rule, and an accent connector bridges the panels
            expect(html).toMatch(/height:64px;background:#666666/i);
            expect((html.match(/height:3px;background:#b8b800/gi) || []).length).toBeGreaterThanOrEqual(1);
        });
        it('overflow: a 6th criterion and 7 panel cells drop cleanly (5-row ceiling)', () => {
            const payload = {
                ...SAMPLES['comparison-panels'],
                criteria: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'],
                panels: [{ name: 'Option A', cells: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'] }],
            };
            const html = composeSlide('comparison-panels', payload, 'nxt')!;
            expect(html).toContain('FIVE');
            expect(html).not.toContain('SIX');  // criteria count cap 5
            expect(html).toContain('c5');
            expect(html).not.toContain('c6');   // cells.5+ have no spec slot
        });
    });

    // ---- WS-1g measured clamp (deterministic unit tests) ----
    describe('fitTextToBox (WS-1g measured clamp)', () => {
        const SC = { caption: 18, body: 21, kicker: 22, deckHeading: 24, lead: 25, bodyReadable: 28, name: 30, subhead: 36, title: 46, deckTitle: 58, hero: 120 };
        it('leaves fitting text untouched at its tier', () => {
            const r = fitTextToBox('Short line of body copy.', 28, 500, 150, 1.15, SC);
            expect(r).toEqual({ text: 'Short line of body copy.', size: 28 });
        });
        it('steps down within 2 scale tiers when that makes the text fit', () => {
            const text = 'x'.repeat(118) + 'y.'; // 120 chars: overflows at 28 in 380x150, fits at 25
            const r = fitTextToBox(text, 28, 380, 150, 1.15, SC);
            expect(r.size).toBe(25);
            expect(r.text).toBe(text);
        });
        it('clause-truncates at the 2-tier floor when stepping down is not enough, never below caption', () => {
            const long = 'First clause of the sentence, second clause that keeps going, third clause with more substance, and a fourth clause that certainly cannot fit inside the box at any legal tier of the deck scale ladder no matter how it wraps.';
            const r = fitTextToBox(long, 28, 500, 100, 1.15, SC);
            expect(r.size).toBe(24);                    // 2 tiers below 28 (25, 24)
            expect(r.size).toBeGreaterThanOrEqual(18);  // never below caption
            expect(r.text.length).toBeLessThan(long.length);
            expect(r.text).not.toContain('...');
            expect(r.text).not.toMatch(/[,;:]$/);       // clean clause cut
        });
        it('already at the caption floor: truncates without shrinking further', () => {
            const long = 'A dense tabular cell body that runs far past its two-line capacity and must be cut at a boundary.'.repeat(3);
            const r = fitTextToBox(long, 18, 540, 52, 1.3, SC);
            expect(r.size).toBe(18);
            expect(r.text.length).toBeLessThan(long.length);
        });
        it('is deterministic (same input, same output)', () => {
            const a = fitTextToBox('Some middling sentence that may or may not fit the given box budget.', 28, 380, 90, 1.15, SC);
            const b = fitTextToBox('Some middling sentence that may or may not fit the given box budget.', 28, 380, 90, 1.15, SC);
            expect(a).toEqual(b);
        });
    });

    describe('clauseTrunc (trunc conventions: no ellipsis, boundary-aware)', () => {
        it('returns short strings unchanged', () => {
            expect(clauseTrunc('Fits fine.', 40)).toBe('Fits fine.');
        });
        it('finishes an in-flight sentence slightly over budget rather than mutilating it', () => {
            const s = 'The workflow is the product and the deck proves it.';
            expect(clauseTrunc(s, 45)).toBe(s); // sentence end within 1.35x budget
        });
        it('cuts at a clause boundary and never emits an ellipsis', () => {
            const s = 'One long clause without any sentence end, another clause after the comma that runs much much much further along without ever stopping for a period anywhere near';
            const out = clauseTrunc(s, 60);
            expect(out.length).toBeLessThanOrEqual(60);
            expect(out).not.toContain('...');
            expect(out).not.toMatch(/[\s,;:.\-("']$/);
        });
    });

    // WS-1g wired into the existing archetypes: numbered-themes bodies + evidence-table cells
    describe('measured clamp wiring (numbered-themes, evidence-table)', () => {
        it('numbered-themes: an over-budget item body steps down and never collides with the quote slot', () => {
            const long = 'This synthesis body deliberately blows through the one-hundred-fifty character generation budget by a very wide margin, stacking clause after clause of real-sounding engagement detail about intake friction, evidence re-keying, context loss at every handoff, and partner review economics, so that even after the measured clamp steps the tier down twice the estimated line count still exceeds the 310 pixel box and the composer is forced to intervene because the clamp has to act.';
            const payload = { ...ntPayload, items: [{ number: '01', name: 'Overlong', body: long, quote: 'still intact' }, ...ntPayload.items.slice(1)] };
            const html = composeSlide('numbered-themes', payload, 'nxt')!;
            expect(html).toContain('still intact');
            expect(html).not.toContain('clamp has to act'); // tail truncated
            expect(html).not.toContain('undefined');
        });
        it('evidence-table: an over-budget prove cell truncates to its 2-line capacity at the caption floor', () => {
            const base = SAMPLES['evidence-table'];
            const long = 'Proves that service obsession compounds into a distribution moat, that the operating cadence is the mechanism, and that none of it survives without a named owner reviewing the loop every single week without fail.';
            const payload = { ...base, rows: [{ ...base.rows[0], prove: long }, ...base.rows.slice(1)] };
            const html = composeSlide('evidence-table', payload, 'nxt')!;
            expect(html).not.toContain('every single week without fail'); // tail truncated
            expect(html).toContain('font-size:18px'); // stays at the caption floor, never smaller
        });
    });
});

// S5b (2026-08-14): a payload/spec mismatch must never render a void.
describe('fail-visible guard', () => {
    it('renders a fallback title instead of an all-white body', () => {
        const html = composeSlide('stat-row', { headline: 'Screening misses persist in a low-fire market', notes: 'Assessment and interview signals diverge for executive hires.' } as any, 'nxt')!;
        const text = html.replace(/<[^>]+>/g, ' ');
        expect(text).toContain('Screening misses persist');
    });
    it('does not fire on a correctly-filled archetype', () => {
        const html = composeSlide('section-divider', { number: '01', title: 'THE MARKET', supporting: 'Search firms compete on data now.' } as any, 'nxt')!;
        expect(html).not.toContain('fail-visible');
        expect(html).toContain('THE MARKET');
    });
});

// S5c (2026-08-14): the exhibit zone must never render as a void.
describe('infographic-exhibit fail-visible', () => {
    it('renders native text cards from steps[] when no exhibitImage', () => {
        const html = composeSlide('infographic-exhibit', { kicker: 'INDUSTRY CONTEXT', title: 'Adoption concentrates in evaluation', steps: [
            { number: '01', title: 'Screening first', description: 'Resume screening leads adoption across surveyed teams.' },
            { number: '02', title: 'Outreach flat', description: 'AI outreach stays flat while screening rises.' },
        ], takeaway: { label: 'OUTCOME', statement: 'Evaluation is where the tools land first.' }, sourceLine: 'Source: survey' } as any, 'nxt')!;
        expect(html).toContain('Screening first');
        expect(html).toContain('Resume screening leads adoption');
    });
    it('renders the image variant when exhibitImage fills', () => {
        const html = composeSlide('infographic-exhibit', { title: 'T', exhibitImage: 'http://x/y.png', steps: [{ number: '01', title: 'Hidden', description: 'd' }], takeaway: { label: 'L', statement: 'S' } } as any, 'nxt')!;
        expect(html).toContain('http://x/y.png');
        expect(html).not.toContain('Hidden');
    });
});
