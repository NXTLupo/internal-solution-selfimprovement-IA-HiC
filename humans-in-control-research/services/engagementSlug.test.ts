/**
 * The parity this pins is the whole point: the SPA and the proxy must derive the
 * SAME folder name from the same goal. A mismatch does not throw, it silently
 * files one engagement under two names, which is exactly what the 2026-08-21
 * audit found (artifacts in one folder, chat and state in another).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setEngagementSlug, setResearchGoal, _resetRunStateForTests } from './runState';
import { engagementSlugFor, currentEngagementSlugOrDerive, ENGAGEMENT_SLUG_MAX } from './engagementSlug';

/** Mirror of proxy `_safe_session_slug`, transcribed for the parity assertion. */
function proxySafeSessionSlug(raw: string): string {
    let s = (raw || 'untitled-session').toLowerCase();
    s = Array.from(s).filter(c => /[a-z0-9]/.test(c) || c === ' ' || c === '-' || c === '_').join('');
    s = s.split(/\s+/).filter(Boolean).join('-');
    s = s.replace(/^-+|-+$/g, '');
    s = s.slice(0, 80).replace(/^-+|-+$/g, '');
    return s || 'untitled-session';
}

const GOALS = [
    "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points",
    'Deliver a 2026 risk and market analysis report evaluating how emerging property risks impact underwriting',
    'Define the 2026 "state of the Art" operational and technological benchmarks for data & distribution',
    'short goal',
    'Goal   with    irregular      spacing',
    'punctuation!!! goal, with; colons: and (parens)',
];

describe('engagementSlugFor', () => {
    it('agrees with the proxy derivation on every real goal shape', () => {
        for (const g of GOALS) {
            expect(engagementSlugFor(g), `mismatch for: ${g}`).toBe(proxySafeSessionSlug(g));
        }
    });

    it('truncates at 80, matching the proxy, not at 60 like the old copies', () => {
        const long = 'a'.repeat(200);
        expect(engagementSlugFor(long)).toHaveLength(ENGAGEMENT_SLUG_MAX);
        expect(ENGAGEMENT_SLUG_MAX).toBe(80);
    });

    it('never leaves a trailing dash when the cut lands mid-token', () => {
        const goal = 'x'.repeat(78) + ' tail';
        const slug = engagementSlugFor(goal);
        expect(slug.endsWith('-')).toBe(false);
    });

    it('is stable: the same goal always produces the same slug', () => {
        expect(engagementSlugFor(GOALS[0])).toBe(engagementSlugFor(GOALS[0]));
    });

    it('handles an empty goal without inventing a folder', () => {
        expect(engagementSlugFor('')).toBe('');
        expect(engagementSlugFor('   ')).toBe('');
    });
});

describe('currentEngagementSlugOrDerive', () => {
    it('derives from the goal fallback rather than returning empty', () => {
        expect(currentEngagementSlugOrDerive('Analyze the retained search market')).toBe('analyze-the-retained-search-market');
    });

    it('prefers the run state slug when it is set', () => {
        setEngagementSlug('explicit-slug');
        try {
            expect(currentEngagementSlugOrDerive('some other goal')).toBe('explicit-slug');
        } finally {
            _resetRunStateForTests();
        }
    });

    it('falls back to the run objective when only that is set', () => {
        setResearchGoal('Map the executive search market');
        try {
            expect(currentEngagementSlugOrDerive()).toBe('map-the-executive-search-market');
        } finally {
            _resetRunStateForTests();
        }
    });
});

describe('the App.tsx call site', () => {
    it('no longer truncates the engagement slug at 60', () => {
        const app = readFileSync(join(process.cwd(), 'App.tsx'), 'utf8');
        // The derivation is the only line that slugifies the goal and assigns the
        // engagement slug; find it by its own shape rather than by proximity to a
        // name that appears in several places.
        const line = app.split(/\r?\n/).find(l => l.includes(".replace(/-+/g, '-').substring("));
        expect(line, 'engagement slug derivation not found in App.tsx').toBeTruthy();
        expect(line!).toContain('substring(0, 80)');
        expect(line!).not.toContain('substring(0, 60)');
    });
});
