import { describe, it, expect } from 'vitest';
import { budgetGroundingSections } from './corpusChatService';

describe('budgetGroundingSections (2026-10-06)', () => {
    const doc = [
        '=== ANSWER SCOPE (CRITICAL) ===', 'Respond to the latest message.',
        '=== RESEARCH CONTEXT ===', 'Research Goal: first-year readiness',
        '=== MANIFEST EVIDENCE ===', 'E'.repeat(120_000),
        '=== KNOWLEDGE GRAPH (900 nodes, 2000 edges) ===', 'K'.repeat(200_000), '=== END KNOWLEDGE GRAPH ===',
        '=== RESEARCH METHODOLOGIES ===', 'M'.repeat(90_000),
        '=== PRIOR ENGAGEMENT CONTEXT ===', 'P'.repeat(60_000),
    ].join('\n');

    it('trims low-priority sections first and never the evidence', () => {
        const out = budgetGroundingSections(doc, 240_000);
        expect(out.length).toBeLessThanOrEqual(240_000 + 2_000);
        expect(out).toContain('E'.repeat(120_000));
        expect(out).toContain('Research Goal: first-year readiness');
        expect(out).toMatch(/KNOWLEDGE GRAPH \(900 nodes, 2000 edges\) shortened for this turn/);
    });

    it('leaves a prompt under budget untouched', () => {
        expect(budgetGroundingSections('=== RESEARCH CONTEXT ===\nGoal', 240_000)).toBe('=== RESEARCH CONTEXT ===\nGoal');
    });
});
