import { describe, it, expect } from 'vitest';
import { countStructuralItems } from './slideFieldBudgets';

// 2026-06-16 - Regression guard for the "No org tiers" bug: the summarize-to-budget
// re-ask re-emitted an org-chart that DROPPED its tiers[] array, and the old guard
// (slide-count + over-budget-count) accepted it. The fix counts nested array items;
// the re-ask is rejected (original kept) when its structural item count falls below
// the original's. These tests prove the detector.

// The ORIGINAL #org slide the model produced (had tiers + nodes; 3 role fields slightly
// over budget). Shape mirrors the SLIDE OUTPUT PROTOCOL org-chart payload.
const ORIGINAL_ORG = {
    template: 'org-chart',
    title: 'Northeastern centralized fundraising under the CDO, but the data team that feeds every team sits at delivery tier',
    sources: ['Eleanor - NU Advancement Engagement', 'Bruce - NU Advancement Engagement', 'Riley Quinn - NU Advancement Engagement'],
    orgChart: {
        subject: 'NORTHEASTERN ADVANCEMENT · AS-IS',
        tiers: [
            { label: 'TIER 1 · DECIDES', nodes: [{ title: 'Chief Development Officer', role: 'Owns the philanthropic and engagement goals; since July 1 all fundraising reports here, not to the deans', source: 'Eleanor', emphasis: true }] },
            { label: 'TIER 2 · DIRECTS', nodes: [
                { title: 'VP, Major & Principal Gifts', role: 'Runs the gifts-of-100K-and-up officers', source: 'Eleanor' },
                { title: 'Alumni Relations & Annual Giving', role: 'Owns 17 alumni-relations staff against a 360,000 network', source: 'Bruce' },
            ] },
            { label: 'TIER 3 · DELIVERS', nodes: [
                { title: 'Data Strategy & Analytics', role: 'Records management; owns the Ascend migration and the trusted-data layer', source: 'Avery Stone' },
                { title: 'Events & Giving Day', role: 'Runs 400-plus events a year', source: 'Daniel' },
            ] },
        ],
        keyInsight: 'Centralizing fundraising under the CDO lifted giving, yet Data Strategy sits at delivery level with no records team.',
    },
};

// The non-compliant budget RE-ASK output: it shortened the role fields BUT dropped the
// entire tiers array (or emptied it) - exactly the gutted shape that rendered "No org tiers".
const GUTTED_REASK = {
    template: 'org-chart',
    title: ORIGINAL_ORG.title,
    sources: ORIGINAL_ORG.sources,
    orgChart: {
        subject: 'NORTHEASTERN ADVANCEMENT · AS-IS',
        tiers: [],
        keyInsight: ORIGINAL_ORG.orgChart.keyInsight,
    },
};

// A COMPLIANT re-ask: same structure, only role strings shortened.
const COMPLIANT_REASK = JSON.parse(JSON.stringify(ORIGINAL_ORG));
COMPLIANT_REASK.orgChart.tiers[0].nodes[0].role = 'Owns the goals; all fundraising now reports here';

describe('countStructuralItems - summarize-to-budget structural-preservation guard', () => {
    it('counts nested array items (tiers + nodes + sources)', () => {
        // 3 sources + 3 tiers + (1+2+2)=5 nodes = 11 array items.
        expect(countStructuralItems(ORIGINAL_ORG)).toBe(11);
    });

    it('detects a re-ask that DROPPED the tiers array (gutted slide)', () => {
        const orig = countStructuralItems(ORIGINAL_ORG);
        const gutted = countStructuralItems(GUTTED_REASK);
        // gutted = 3 sources + 0 tiers + 0 nodes = 3; far below original.
        expect(gutted).toBeLessThan(orig);
        // the guard accepts ONLY when reItems >= origItems -> this re-ask is REJECTED.
        expect(gutted >= orig).toBe(false);
    });

    it('accepts a compliant re-ask that only shortened strings (structure intact)', () => {
        const orig = countStructuralItems(ORIGINAL_ORG);
        const compliant = countStructuralItems(COMPLIANT_REASK);
        // string edits do not change array counts -> structure preserved -> accepted.
        expect(compliant).toBe(orig);
        expect(compliant >= orig).toBe(true);
    });

    it('is robust to empty / primitive input', () => {
        expect(countStructuralItems(null)).toBe(0);
        expect(countStructuralItems({})).toBe(0);
        expect(countStructuralItems({ a: 'x', b: 2 })).toBe(0);
    });
});
