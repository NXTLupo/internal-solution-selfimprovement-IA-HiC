/**
 * DF-V3/V4. The tests that matter are the LADDER TERMINATION proof and the
 * dangling-reference refusal. A downgrade chain with a cycle would hang the repair
 * pass, and a "see the chart below" on a slide with no chart is the exact failure
 * the exhibits-before-prose rule exists to stop.
 */
import { describe, it, expect } from 'vitest';
import {
    EXHIBIT_CATALOG, exhibitFitRules, checkExhibitFit, resolveDowngrade,
    buildExhibitCatalogBlock, findsDanglingExhibitReference, evaluateExhibits,
    buildExhibitInstruction, countExhibitField, checkExhibitReference,
} from './exhibitCatalog';

const slide = (id: string, template: string, payload: any) => ({ id, template, composerPayload: payload });

describe('the downgrade ladder always terminates', () => {
    it('every entry downgrades to something that needs STRICTLY less data', () => {
        for (const spec of Object.values(EXHIBIT_CATALOG)) {
            if (!spec.downgradeTo) continue;
            const target = EXHIBIT_CATALOG[spec.downgradeTo];
            expect(target, `${spec.id} downgrades to unknown archetype ${spec.downgradeTo}`).toBeTruthy();
            expect(target.min, `${spec.id} -> ${spec.downgradeTo} does not reduce the floor`).toBeLessThan(spec.min);
        }
    });

    it('walking every chain from every entry reaches a floor without cycling', () => {
        for (const id of Object.keys(EXHIBIT_CATALOG)) {
            const seen = new Set<string>();
            let cursor: string | null = id;
            while (cursor) {
                expect(seen.has(cursor), `cycle through ${cursor}`).toBe(false);
                seen.add(cursor);
                cursor = EXHIBIT_CATALOG[cursor].downgradeTo;
            }
        }
    });

    it('resolves a two-item payload to the archetype that carries two items', () => {
        // ranked-bars needs 3 -> comparison-panels needs 2. Stops there.
        expect(resolveDowngrade('slides:ranked-bars', 2)).toBe('slides:comparison-panels');
    });

    it('resolves a one-item payload all the way to the floor exhibit', () => {
        expect(resolveDowngrade('slides:ranked-bars', 1)).toBe('slides:block-quote');
    });

    it('returns null when even the floor cannot be filled', () => {
        expect(resolveDowngrade('slides:ranked-bars', 0)).toBeNull();
        expect(resolveDowngrade('slides:problem-diptych', 0)).toBeNull();
    });
});

describe('the gate derives from the catalog', () => {
    it('exports a fit rule for every exhibit except the narrative floor', () => {
        const rules = exhibitFitRules();
        // Excluded by the explicit flag, NOT by "has no downgrade target": two
        // entries terminate the ladder and only one is exempt from the gate.
        expect(Object.keys(rules)).toHaveLength(Object.keys(EXHIBIT_CATALOG).length - 1);
        expect(rules['slides:block-quote']).toBeUndefined();
        expect(rules['slides:problem-diptych']).toEqual({
            field: 'left', min: 1, why: 'a diptych needs both halves populated',
        });
        expect(rules['slides:ranked-bars']).toEqual({
            field: 'bars', min: 3, why: 'a ranking needs at least three entries to show a rank',
        });
    });
});

describe('fit verdicts', () => {
    it('passes an exhibit that carries its data', () => {
        const v = checkExhibitFit('slides:ranked-bars', { bars: [1, 2, 3] });
        expect(v.fits).toBe(true);
    });

    it('fails an underfilled exhibit and names the downgrade', () => {
        const v = checkExhibitFit('slides:quadrant', { subjects: [1, 2] });
        expect(v.fits).toBe(false);
        expect(v.downgradeTo).toBe('slides:comparison-panels');
        expect(v.detail).toMatch(/carries 2 subjects \(needs 3\)/);
    });

    it('fails an OVERFULL exhibit without offering a downgrade', () => {
        const v = checkExhibitFit('slides:ranked-bars', { bars: new Array(14).fill('x') });
        expect(v.fits).toBe(false);
        expect(v.overfull).toBe(true);
        expect(v.downgradeTo).toBeNull();
        expect(v.detail).toMatch(/readable maximum 8/);
    });

    it('abstains when the field is absent: the payload contract owns that', () => {
        const v = checkExhibitFit('slides:ranked-bars', { title: 'no bars key' });
        expect(v.fits).toBe(true);
        expect(v.count).toBeNull();
    });

    it('abstains on an archetype it does not know', () => {
        expect(checkExhibitFit('slides:some-new-thing', { x: 1 }).known).toBe(false);
    });

    it('counts a nested items collection and a non-empty string', () => {
        expect(countExhibitField({ left: { items: [1, 2] } }, 'left')).toBe(2);
        expect(countExhibitField({ quote: 'a real quote' }, 'quote')).toBe(1);
        expect(countExhibitField({ quote: '   ' }, 'quote')).toBe(0);
    });
});

describe('dangling exhibit references', () => {
    it('catches a pointer at a visual the reader cannot see', () => {
        expect(findsDanglingExhibitReference('The matrix below plots each vendor.')).toBe(true);
        expect(findsDanglingExhibitReference('As the chart above shows, adoption lags.')).toBe(true);
        expect(findsDanglingExhibitReference('The table opposite lists every system.')).toBe(true);
    });

    it('does NOT flag a sentence that merely uses the word', () => {
        expect(findsDanglingExhibitReference('The firm keeps a table of every mandate it has run.')).toBe(false);
        expect(findsDanglingExhibitReference('Recruiters maintain a candidate matrix in the CRM.')).toBe(false);
    });

    it('matches the referenced NOUN against what the archetype renders', () => {
        // A timeline slide may say "the timeline below"; a quote slide may not.
        expect(findsDanglingExhibitReference('The timeline below shows each phase.', 'slides:milestone-timeline')).toBe(false);
        expect(findsDanglingExhibitReference('The timeline below shows each phase.', 'slides:block-quote')).toBe(true);
        // A table reference on a quadrant slide is still dangling: different visual.
        expect(findsDanglingExhibitReference('The table below lists each vendor.', 'slides:quadrant')).toBe(true);
        expect(findsDanglingExhibitReference('The matrix below plots each vendor.', 'slides:quadrant')).toBe(false);
    });

    it('lets a generic word pass on any real exhibit, and fails it on a prose slide', () => {
        expect(findsDanglingExhibitReference('The exhibit below breaks this out.', 'slides:ranked-bars')).toBe(false);
        expect(findsDanglingExhibitReference('The exhibit below breaks this out.', 'slides:cover')).toBe(true);
    });

    it('reports which noun dangled, so the repair text can name it', () => {
        expect(checkExhibitReference('The roadmap below sequences the work.', 'slides:block-quote')).toEqual({ dangling: true, noun: 'roadmap' });
        expect(checkExhibitReference('No reference here.', 'slides:block-quote')).toEqual({ dangling: false, noun: null });
    });
});

describe('the exhibits stage', () => {
    it('passes a deck whose exhibits carry their data', () => {
        const report = evaluateExhibits([
            slide('s1', 'slides:ranked-bars', { bars: [1, 2, 3] }),
            slide('s2', 'slides:evidence-table', { rows: [1, 2, 3] }),
        ]);
        expect(report.pass).toBe(true);
        expect(report.exhibitsChecked).toBe(2);
        expect(report.fitted).toBe(2);
    });

    it('names the downgrade for an underfilled exhibit', () => {
        const report = evaluateExhibits([slide('s1', 'slides:quadrant', { subjects: [1, 2] })]);
        expect(report.pass).toBe(false);
        expect(report.findings[0].kind).toBe('misfit');
        expect(report.findings[0].remedy).toMatch(/Re-map this slide to slides:comparison-panels/);
    });

    it('walks a one-item timeline down to the archetype that carries one item', () => {
        const report = evaluateExhibits([slide('s1', 'slides:milestone-timeline', { milestones: [1] })]);
        expect(report.findings[0].remedy).toMatch(/Re-map this slide to slides:block-quote/);
    });

    it('refuses to call an EMPTY exhibit an exhibit at all', () => {
        const report = evaluateExhibits([slide('s1', 'slides:milestone-timeline', { milestones: [] })]);
        expect(report.findings[0].remedy).toMatch(/not an exhibit/);
    });

    it('flags prose pointing at an exhibit the slide does not render', () => {
        const report = evaluateExhibits([
            slide('s1', 'slides:block-quote', {
                quote: 'A real quote.',
                narrative: 'The timeline below shows when each phase lands.',
            }),
        ]);
        expect(report.findings.some(f => f.kind === 'dangling_reference')).toBe(true);
    });

    it('does NOT flag a reference on a slide whose exhibit DID render', () => {
        const report = evaluateExhibits([
            slide('s1', 'slides:milestone-timeline', {
                milestones: [1, 2, 3],
                narrative: 'The timeline below shows when each phase lands.',
            }),
        ]);
        expect(report.pass).toBe(true);
    });

    it('ignores a reference inside a sourceLine, which is the source\'s wording', () => {
        const report = evaluateExhibits([
            slide('s1', 'slides:block-quote', {
                quote: 'A real quote.',
                sourceLine: 'Source: Acme Report, table 3 above',
            }),
        ]);
        expect(report.pass).toBe(true);
    });

    it('is a no-op on an empty deck', () => {
        expect(evaluateExhibits([]).pass).toBe(true);
        expect(evaluateExhibits(null as any).pass).toBe(true);
    });
});

describe('the model-facing catalog block', () => {
    it('names every exhibit with its floor and its alternative', () => {
        const block = buildExhibitCatalogBlock();
        for (const spec of Object.values(EXHIBIT_CATALOG)) {
            expect(block).toContain(spec.id);
        }
        expect(block).toMatch(/never invent a row, a phase, or a figure/);
    });

    it('carries no em-dash and no banned padding advice', () => {
        const block = buildExhibitCatalogBlock() + buildExhibitInstruction(
            evaluateExhibits([slide('s1', 'slides:quadrant', { subjects: [1] })]),
        );
        expect(block).not.toMatch(/—/);
        expect(block.toLowerCase()).not.toMatch(/leverage|utilize|robust|seamless/);
    });
});
