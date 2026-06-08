import { describe, it, expect } from 'vitest';
import { PersonaArtifactSchema, validatePersonaArtifact } from './personaArtifact';
import validFixture from '../__fixtures__/persona.valid.json';

describe('PersonaArtifactSchema', () => {
    it('accepts a well-formed persona', () => {
        const r = validatePersonaArtifact(validFixture);
        expect(r.ok).toBe(true);
    });

    it('rejects persona missing required fields', () => {
        const bad = { id: 'p1', type: 'persona', brand: 'nxt' };
        const r = validatePersonaArtifact(bad);
        expect(r.ok).toBe(false);
        if (!r.ok && 'error' in r) {
            expect(r.error).toMatch(/name|role|goals/i);
        }
    });

    it('rejects persona with invalid brand', () => {
        const bad = { ...validFixture, brand: 'acme' };
        const r = validatePersonaArtifact(bad);
        expect(r.ok).toBe(false);
    });

    it('rejects persona with empty goals array', () => {
        const bad = { ...validFixture, goals: [] };
        expect(validatePersonaArtifact(bad).ok).toBe(false);
    });

    it('rejects quote without source attribution', () => {
        const bad = { ...validFixture, quotes: [{ text: 'quoted text' }] };
        expect(validatePersonaArtifact(bad).ok).toBe(false);
    });
});
