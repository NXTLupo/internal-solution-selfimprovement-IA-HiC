import { describe, it, expect } from 'vitest';
import { chooseArtifactModel, artifactModelFor, OPUS_CAP_ACTIVE } from './aiRouter';

// WS-E/D13: eval-backed router policy engine. Behavioral asserts (pure fn, no live run).
// 2026-07-01 (D7 revert): OPUS_CAP_ACTIVE flipped to false - the evidence tier returns to Claude Opus 4.8;
// the schema tier stays Flash (bake-off-validated, cap-independent). Cap-era behavior remains guarded via
// explicit quotaExhausted opts so the workaround path stays tested even while the flag is off.

describe('WS-E/D13 chooseArtifactModel (eval-backed policy engine)', () => {
    it('the Opus cap is REVERTED (D7, 2026-07-01) - flip this test with the flag, never silently', () => {
        expect(OPUS_CAP_ACTIVE).toBe(false);
    });

    it('schema deliverable -> flash wins (eval tie, cost tilt), pro is an alternative', () => {
        const d = chooseArtifactModel('#gap');
        expect(d.selectedModel).toBe('gemini-3.5-flash');
        expect(d.alternatives).toContain('gemini-3.1-pro-preview');
        expect(d.reason).toMatch(/schema tier/);
    });

    it('personas -> Opus wins post-cap (eval 1.0); Pro when Opus quota is exhausted (cap-era path)', () => {
        const d = chooseArtifactModel('#personas');
        expect(d.selectedModel).toBe('claude-opus-4-8');
        expect(d.evalBasis).toBe('personas');
        const capped = chooseArtifactModel('#personas', { quotaExhausted: ['claude-opus-4-8'] });
        expect(capped.selectedModel).toBe('gemini-3.1-pro-preview');   // NOT flash (bake-off Part B: Flash failed)
    });

    it('artifactModelFor delegates + honors the post-cap tier', () => {
        expect(artifactModelFor('#gap')).toBe('gemini-3.5-flash');
        expect(artifactModelFor('#strategy')).toBe('claude-opus-4-8');   // evidence tier, cap lifted
        expect(artifactModelFor('#personas')).toBe('claude-opus-4-8');
    });

    it('provider health degradation re-routes away from the degraded model', () => {
        // post-cap evidence tier = [opus, pro]; degrade opus -> pro should win despite lower eval
        const d = chooseArtifactModel('#strategy', { healthDegraded: ['claude-opus-4-8'] });
        expect(d.selectedModel).toBe('gemini-3.1-pro-preview');
        expect(d.reason).toMatch(/health-adjusted/);
    });

    it('cap-era combination: Opus exhausted + Pro degraded -> Pro still serves (degraded beats nothing)', () => {
        const d = chooseArtifactModel('#strategy', { quotaExhausted: ['claude-opus-4-8'], healthDegraded: ['gemini-3.1-pro-preview'] });
        expect(d.selectedModel).toBe('gemini-3.1-pro-preview');
    });

    it('returns a scored rationale + alternatives (auditable routing)', () => {
        const d = chooseArtifactModel('#compete');
        expect(typeof d.reason).toBe('string');
        expect(d.reason.length).toBeGreaterThan(0);
        expect(Array.isArray(d.alternatives)).toBe(true);
    });
});
