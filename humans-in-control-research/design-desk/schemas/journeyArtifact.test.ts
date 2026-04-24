import { describe, it, expect } from 'vitest';
import { validateJourneyArtifact } from './journeyArtifact';
import validFixture from '../__fixtures__/journey.valid.json';

describe('JourneyArtifactSchema', () => {
    it('accepts a well-formed journey', () => {
        expect(validateJourneyArtifact(validFixture).ok).toBe(true);
    });

    it('rejects journey with no stages', () => {
        const bad = { ...validFixture, stages: [] };
        expect(validateJourneyArtifact(bad).ok).toBe(false);
    });

    it('rejects stage with invalid emotion', () => {
        const bad = { ...validFixture, stages: [{ ...validFixture.stages[0], emotion: 'ecstatic' }, ...validFixture.stages.slice(1)] };
        expect(validateJourneyArtifact(bad).ok).toBe(false);
    });

    it('rejects connection referencing nonexistent stage id', () => {
        const bad = { ...validFixture, connections: [{ from: 'nope', to: 's1' }] };
        const r = validateJourneyArtifact(bad);
        expect(r.ok).toBe(false);
    });

    it('accepts journey without explicit layout (FossFLOW can auto-layout)', () => {
        const { layout, ...rest } = validFixture as any;
        expect(validateJourneyArtifact(rest).ok).toBe(true);
    });
});
