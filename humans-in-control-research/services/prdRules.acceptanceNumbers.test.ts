/**
 * 2026-10-20 (root-cause audit A7, plan item 9): acceptance criteria are specifications, not claims. The number rule
 * used to turn "within 2 seconds for 95% of requests" into "the stated threshold" twice over, leaving a test no one
 * can run. Given / When / Then, a threshold and a signal target keep their figures; requirement text and pains stay
 * under the rule.
 */
import { describe, it, expect } from 'vitest';
import { makePrdAirFixture } from './prdAir.fixture';
import { enforcePrdRules } from './prdRulesContract';
import type { PrdCompilerInputs } from './prdCompiler';

const inputs: PrdCompilerInputs = {
    artifactId: 'prd-fixture', objective: 'Decide whether to build a mid-season coverage review',
    personas: [], themes: [], journeyPains: [], competitiveGaps: [], evidenceChunks: [], areas: [],
};

describe('number rule: acceptance tests and targets are exempt, requirements and pains are not', () => {
    it('keeps Given / When / Then figures and a signal target; rewrites a requirement and a pain', async () => {
        const air = makePrdAirFixture();
        const g = air.graph;
        const at = g.acceptanceTests[0];
        expect(at).toBeTruthy();
        at.given = 'the grower has 3 active policies on file';
        at.when = 'the review runs 30 days before renewal';
        at.then = 'the page renders within 2 seconds for 95% of requests';
        (at as any).threshold = 'p95 latency under 2 seconds';
        const req = g.requirements[0];
        req.text = `${req.text.replace(/[.]$/, '')} and reaches 95% of growers in 30 days.`;
        const pain = g.pains[0];
        if (pain) pain.text = 'Growers wait 14 days for a callback after a hail claim.';
        const sig = g.signals[0];
        if (sig) (sig as any).target = 'review completion above 60% within 90 days';

        await enforcePrdRules(air, { inputs });

        expect(at.given).toBe('the grower has 3 active policies on file');
        expect(at.when).toBe('the review runs 30 days before renewal');
        expect(at.then).toBe('the page renders within 2 seconds for 95% of requests');
        expect((at as any).threshold).toBe('p95 latency under 2 seconds');
        if (sig) expect((sig as any).target).toBe('review completion above 60% within 90 days');

        const reqNow = g.requirements.find(r => r.id === req.id)!;
        expect(reqNow.text).not.toMatch(/\b95%|\b30 days\b/);
        expect(reqNow.text).not.toMatch(/\d/);
        if (pain) {
            expect(pain.text).not.toMatch(/\b14 days\b/);
            expect(pain.text).not.toMatch(/\d/);
        }
    });
});
