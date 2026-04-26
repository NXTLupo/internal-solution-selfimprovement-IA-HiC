import { describe, it, expect } from 'vitest';
import { validateFreeformArtifact, FreeformArtifactSchema } from './freeformArtifact';
import valid from '../__fixtures__/freeform.valid.json';

describe('freeformArtifact schema', () => {
    it('accepts a valid artifact', () => {
        const r = validateFreeformArtifact(valid);
        expect(r.ok).toBe(true);
    });

    it('rejects unknown kind', () => {
        const r = validateFreeformArtifact({ ...valid, kind: 'unknown' });
        expect(r.ok).toBe(false);
    });

    it('rejects unknown brand', () => {
        const r = validateFreeformArtifact({ ...valid, brand: 'apple' });
        expect(r.ok).toBe(false);
    });

    it('accepts empty citations array', () => {
        const r = validateFreeformArtifact({ ...valid, citations: [] });
        expect(r.ok).toBe(true);
    });

    it('treats html as opaque string (does not parse it)', () => {
        const r = validateFreeformArtifact({ ...valid, html: '<<<not html>>>' });
        expect(r.ok).toBe(true);
    });

    it('rejects empty html', () => {
        const r = validateFreeformArtifact({ ...valid, html: '' });
        expect(r.ok).toBe(false);
    });

    it('rejects missing required title field', () => {
        const { title, ...withoutTitle } = valid as Record<string, unknown>;
        const r = validateFreeformArtifact(withoutTitle);
        expect(r.ok).toBe(false);
    });
});
