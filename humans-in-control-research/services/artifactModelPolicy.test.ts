import { describe, it, expect } from 'vitest';
import { chooseArtifactModel, artifactModelFor } from './aiRouter';

// WS-E/D13: eval-backed router policy engine. Behavioral asserts (pure fn, no live run).

describe('WS-E/D13 chooseArtifactModel (eval-backed policy engine)', () => {
    it('schema deliverable -> flash wins (eval tie, cost tilt), pro is an alternative', () => {
        const d = chooseArtifactModel('#gap');
        expect(d.selectedModel).toBe('gemini-3.5-flash');
        expect(d.alternatives).toContain('gemini-3.1-pro-preview');
        expect(d.reason).toMatch(/schema tier/);
    });

    it('personas -> Pro wins over Flash on eval (bake-off Part B: Flash failed)', () => {
        const d = chooseArtifactModel('#personas');
        expect(d.selectedModel).toBe('gemini-3.1-pro-preview');   // NOT flash, despite cost
        expect(d.evalBasis).toBe('personas');
    });

    it('artifactModelFor delegates + stays behavior-preserving', () => {
        expect(artifactModelFor('#gap')).toBe('gemini-3.5-flash');
        expect(artifactModelFor('#strategy')).toBe('gemini-3.1-pro-preview');   // capped evidence tier
        expect(artifactModelFor('#personas')).toBe('gemini-3.1-pro-preview');
    });

    it('provider health degradation re-routes away from the degraded model', () => {
        // evidence tier capped = [pro, flash]; degrade pro -> flash should win despite lower eval
        const d = chooseArtifactModel('#strategy', { healthDegraded: ['gemini-3.1-pro-preview'] });
        expect(d.selectedModel).toBe('gemini-3.5-flash');
        expect(d.reason).toMatch(/health-adjusted/);
    });

    it('returns a scored rationale + alternatives (auditable routing)', () => {
        const d = chooseArtifactModel('#compete');
        expect(typeof d.reason).toBe('string');
        expect(d.reason.length).toBeGreaterThan(0);
        expect(Array.isArray(d.alternatives)).toBe(true);
    });
});
