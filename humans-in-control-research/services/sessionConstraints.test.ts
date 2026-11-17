// V4 (2026-08-07, sota-elevation plan) - directive-to-constraint compiler tests.
// The acceptance contract from the plan: "create slides, do not use anything
// from the transcript" yields ZERO citations resolving to the excluded upload
// (deterministic exclusion before ranking), and "include more graphics"
// measurably raises the visual floor the deck gate enforces.
import { describe, it, expect, beforeEach } from 'vitest';
import {
    compileDirectives,
    getSessionConstraints,
    clearSessionConstraints,
    isSourceExcluded,
    describeEnforcement,
} from './sessionConstraints';
import { evaluateDeckPlan } from './deckPlanGate';

const SLUG = 'test-engagement-v4';

beforeEach(() => clearSessionConstraints(SLUG));

describe('compileDirectives - exclusions (colleague finding F5)', () => {
    it('compiles "do not use anything from the transcript" into an exclusion', () => {
        const r = compileDirectives('Create slides on retention. Do not use anything from the transcript.', SLUG);
        expect(r.changed).toBe(true);
        expect(r.constraints.excludeSources.some(s => s.includes('transcript'))).toBe(true);
    });

    it("compiles \"don't include the uploaded documents\"", () => {
        const r = compileDirectives("Please don't include the uploaded documents in the deck.", SLUG);
        expect(r.changed).toBe(true);
        expect(r.constraints.excludeSources.length).toBeGreaterThan(0);
    });

    it('compiles a quoted named source: exclude "Palmetto Ridge notes"', () => {
        const r = compileDirectives('Exclude "Palmetto Ridge notes" from the analysis.', SLUG);
        expect(r.constraints.excludeSources).toContain('palmetto ridge notes');
    });

    it('persists across turns (whole-session scope, owner decision 7)', () => {
        compileDirectives('Ignore the transcript.', SLUG);
        const later = getSessionConstraints(SLUG);
        expect(later.excludeSources.length).toBeGreaterThan(0);
    });

    it('lifts an exclusion with "you can use the transcript again"', () => {
        compileDirectives('Do not use the transcript.', SLUG);
        const r = compileDirectives('Actually you can use the transcript again.', SLUG);
        expect(r.changed).toBe(true);
        expect(r.constraints.excludeSources.length).toBe(0);
    });

    it('lifts everything with "lift the exclusions"', () => {
        compileDirectives('No content from the transcript. Exclude "board memo".', SLUG);
        const r = compileDirectives('Lift the exclusions.', SLUG);
        expect(r.constraints.excludeSources.length).toBe(0);
    });

    it('a plain question changes nothing', () => {
        const r = compileDirectives('What are the top retention themes?', SLUG);
        expect(r.changed).toBe(false);
        expect(r.turnActions.length).toBe(0);
    });
});

describe('compileDirectives - visual density (colleague finding F1/F5)', () => {
    it('"include more graphics" raises the visual floor above the 0.4 default', () => {
        const r = compileDirectives('This is good but include more graphics please.', SLUG);
        expect(r.changed).toBe(true);
        expect(r.constraints.visualQuotaFloor).toBeGreaterThan(0.4);
        expect(r.constraints.visualQuotaFloor).toBeLessThanOrEqual(0.7);
    });

    it('repeated asks clamp at 0.7 (a bad parse can never demand an all-visual deck)', () => {
        compileDirectives('more graphics', SLUG);
        compileDirectives('even more charts', SLUG);
        const r = compileDirectives('add more visuals', SLUG);
        expect(r.constraints.visualQuotaFloor).toBeLessThanOrEqual(0.7);
    });

    it('"fewer graphics" resets to the gate default', () => {
        compileDirectives('more graphics', SLUG);
        const r = compileDirectives('fewer graphics on this one', SLUG);
        expect(r.constraints.visualQuotaFloor).toBeUndefined();
    });
});

describe('isSourceExcluded - rung-1 retrieval enforcement', () => {
    it('generic "transcript" exclusion matches an upload-titled chunk', () => {
        const { constraints } = compileDirectives('Do not use the transcript.', SLUG);
        expect(isSourceExcluded(constraints, {
            title: 'Interview transcript - stakeholder session',
            wikiPath: 'sources/uploads/interview-transcript.md',
        })).toBe(true);
    });

    it('generic upload exclusion matches by upload path even with an unrelated title', () => {
        const { constraints } = compileDirectives("Don't use the uploaded documents.", SLUG);
        expect(isSourceExcluded(constraints, {
            title: 'Q3 Board Overview',
            wikiPath: 'sources/uploads/q3-board-overview.pdf.md',
        })).toBe(true);
    });

    it('does NOT exclude external research articles', () => {
        const { constraints } = compileDirectives('Do not use the transcript.', SLUG);
        expect(isSourceExcluded(constraints, {
            title: 'Higher Ed Dive: retention trends',
            wikiPath: 'articles/highereddive/abc123.md',
        })).toBe(false);
    });

    it('named exclusion matches only that source', () => {
        const { constraints } = compileDirectives('Exclude "Palmetto Ridge notes".', SLUG);
        expect(isSourceExcluded(constraints, { title: 'Palmetto Ridge notes v2', wikiPath: 'sources/uploads/pr.md' })).toBe(true);
        expect(isSourceExcluded(constraints, { title: 'OpenAlex: Smith 2024', wikiPath: 'articles/openalex/s.md' })).toBe(false);
    });

    it('no constraints = nothing excluded', () => {
        expect(isSourceExcluded(undefined, { title: 'anything' })).toBe(false);
        expect(isSourceExcluded(getSessionConstraints(SLUG), { title: 'anything' })).toBe(false);
    });
});

describe('describeEnforcement - the visible echo-back', () => {
    it('reports turn actions and the undo affordance', () => {
        const r = compileDirectives('Do not use the transcript.', SLUG);
        const echo = describeEnforcement(r.constraints, r.turnActions);
        expect(echo).toMatch(/^Enforcing:/);
        expect(echo).toContain('lift the exclusions');
    });

    it('is empty when nothing is enforced', () => {
        expect(describeEnforcement(getSessionConstraints(SLUG))).toBe('');
    });
});

describe('deckPlanGate visualQuotaFloor parameterization (V2)', () => {
    // 2026-11-09 (owner directive): the default floor moved 0.4 -> 0.7 and the ceiling 0.7 -> 1.0,
    // because the measured Gemini deck carries artwork on 15 of 15 slides and a 40% floor let a
    // majority-text deck pass. This fixture clears the new default and fails a raised one.
    const deck = [
        'slides:cover',
        'slides:stat-row', 'slides:evidence-table', 'slides:ranked-bars',
        'slides:quadrant', 'slides:flow-arc', 'slides:means-matters',
        'slides:milestone-timeline', 'slides:comparison-panels', 'slides:block-quote',
        'slides:recommendation',
    ].map(t => `:::slide template=${t}\n{}\n:::`).join('\n');

    it('passes the visual quota at the 0.7 default', () => {
        const plan = evaluateDeckPlan(deck);
        expect(plan.isDeck).toBe(true);
        expect(plan.visualFloorApplied).toBe(0.7);
        expect(plan.violations.some(v => v.includes('are visual'))).toBe(false);
    });

    it('fails the visual quota when the session floor is raised to 0.9', () => {
        const plan = evaluateDeckPlan(deck, { visualQuotaFloor: 0.9 });
        expect(plan.visualFloorApplied).toBe(0.9);
        expect(plan.violations.some(v => v.includes('are visual'))).toBe(true);
        expect(plan.violations.some(v => v.includes("user's explicit request"))).toBe(true);
    });

    it('clamps an out-of-range floor into [0.4, 1.0]', () => {
        expect(evaluateDeckPlan(deck, { visualQuotaFloor: 0.1 }).visualFloorApplied).toBe(0.4);
        expect(evaluateDeckPlan(deck, { visualQuotaFloor: 1.4 }).visualFloorApplied).toBe(1);
    });
});
