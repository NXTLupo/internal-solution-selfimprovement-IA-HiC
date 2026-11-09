// WS-4 L4 (2026-10-30): the repair pass narrows to the evidence it has, not away from it.
import { describe, it, expect } from 'vitest';
import { evidenceBlockFor } from './artifactRepair';

describe('evidenceBlockFor', () => {
    const slide = { id: 's1', template: 'slides:means-matters', title: 'Re-keying delays receipts [articles/ops/aa11.md#c2]', composerPayload: { means: 'Staff re-key gifts weekly [articles/ops/aa11.md#c2]', matters: 'Receipts slip a week [articles/ops/bb22.md#c5]' } };
    it('lists the verbatim passage behind every pointer the slide carries, with its source names', () => {
        const block = evidenceBlockFor(slide as any, [
            { id: 'articles/ops/aa11.md#c2', text: 'Gift officers re-key every pledge into the CRM by hand each Friday.', sourceNames: ['Advancement ops review'] },
            { id: 'articles/ops/bb22.md#c5', text: 'Receipts went out eight days after the gift on average last quarter.', sourceNames: ['Finance memo'] },
            { id: 'articles/ops/cc33.md#c1', text: 'unrelated', sourceNames: [] },
        ]);
        expect(block.startsWith('EVIDENCE AVAILABLE')).toBe(true);
        expect(block).toContain('[articles/ops/aa11.md#c2] (Advancement ops review): "Gift officers re-key every pledge');
        expect(block).toContain('[articles/ops/bb22.md#c5] (Finance memo)');
        expect(block).not.toContain('cc33');
    });
    it('is empty when the slide carries no pointer or the pool has no passage for it', () => {
        expect(evidenceBlockFor({ id: 'x', template: 'slides:cover', title: 'No pointer' } as any, [{ id: 'a.md#c1', text: 'x' }])).toBe('');
        expect(evidenceBlockFor(slide as any, [])).toBe('');
        expect(evidenceBlockFor(slide as any, [{ id: 'other.md#c9', text: 'y' }])).toBe('');
    });
});
