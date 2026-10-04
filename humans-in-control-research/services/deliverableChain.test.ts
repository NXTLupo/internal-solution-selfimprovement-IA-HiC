/**
 * The hole this closes: `:::deliverable:` artifacts met NO gate. The tests that
 * matter are the safety ones. A deliverable the chain drops must not vanish from
 * the user's screen, the deck-shape stage must not run (its findings would be
 * nonsense and it would poison the real cross-deck comparison), and a persona
 * must never be mistaken for a registered exhibit archetype.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    toChainSubjects, fromChainSubjects, runDeliverableChain, deliverableChainSummary,
    DELIVERABLE_SKIP,
} from './deliverableChain';
import { STAGE_ORDER } from './artifactChain';
import { checkExhibitFit } from './exhibitCatalog';
import { enumerateTextFields } from './slideTextEditing';
import { resetGroundingChunks, noteGroundingChunks } from './pointerBinder';

const persona = (id: string, over: any = {}) => ({
    id, type: 'persona', timestamp: 1,
    data: {
        name: 'Retained search principal',
        jtbd: 'Present a credible shortlist before the client loses patience.',
        painPoints: ['Research absorbs the week before a shortlist exists.'],
        source: 'Clockwork',
        ...over,
    },
});

beforeEach(() => {
    resetGroundingChunks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('adapting a deliverable into a chain subject', () => {
    it('carries the payload where the edit contract can find it', () => {
        const [s] = toChainSubjects([persona('d1')]);
        expect(s.composerPayload.jtbd).toContain('credible shortlist');
        // The WS-4 walker only descends composerPayload for `slides:`-prefixed
        // subjects, so the prefix is load-bearing, not cosmetic.
        const fields = enumerateTextFields(s);
        expect(fields.some(f => f.path === 'jtbd')).toBe(true);
        expect(fields.some(f => f.path.startsWith('painPoints'))).toBe(true);
    });

    it('keeps the deliverable type in an underscore carrier, never in the template', () => {
        const [s] = toChainSubjects([persona('d1')]);
        expect(s._deliverableType).toBe('persona');
        expect(s.template).toBe('slides:deliverable');
    });

    it('is NOT mistaken for a registered exhibit archetype', () => {
        const [s] = toChainSubjects([persona('d1')]);
        const fit = checkExhibitFit(s.template, s.composerPayload);
        expect(fit.known).toBe(false);
        expect(fit.fits).toBe(true);   // abstain, which is the correct verdict
    });

    it('titles a subject from whatever field the type actually uses', () => {
        expect(toChainSubjects([persona('d1')])[0].title).toBe('Retained search principal');
        expect(toChainSubjects([{ id: 'd2', type: 'theme', data: { theme: 'Research is the bottleneck' } }])[0].title)
            .toBe('Research is the bottleneck');
        expect(toChainSubjects([{ id: 'd3', type: 'gap', data: {} }])[0].title).toBe('gap');
    });

    it('drops entries that carry no payload rather than crashing the chain', () => {
        expect(toChainSubjects([
            { id: 'd1', type: 'persona', data: null } as any,
            { id: '', type: 'persona', data: {} } as any,
            persona('d3'),
        ])).toHaveLength(1);
    });
});

describe('mapping the result back', () => {
    it('replaces the payload of a subject the chain changed', () => {
        const items = [persona('d1')];
        const subjects = toChainSubjects(items);
        subjects[0].composerPayload = { ...subjects[0].composerPayload, jtbd: 'rewritten' };
        const out = fromChainSubjects(items, subjects);
        expect(out[0].data.jtbd).toBe('rewritten');
        expect(out[0].type).toBe('persona');   // envelope preserved
    });

    it('leaves an item ALONE when the chain dropped its subject', () => {
        const items = [persona('d1'), persona('d2')];
        const kept = toChainSubjects(items).filter(s => s.id === 'd1');
        const out = fromChainSubjects(items, kept);
        expect(out).toHaveLength(2);
        expect(out[1]).toBe(items[1]);
    });

    it('carries the edit history forward so Undo still works', () => {
        const items = [persona('d1')];
        const subjects = toChainSubjects(items);
        (subjects[0] as any)._textHistory = [{ path: 'jtbd', before: 'a', after: 'b' }];
        expect((fromChainSubjects(items, subjects)[0] as any)._textHistory).toHaveLength(1);
    });
});

describe('running the chain over deliverables', () => {
    it('skips the deck-shape stage and records that it was skipped', async () => {
        const outcome = await runDeliverableChain([persona('d1')], { runId: 'r1' });
        const skipped = outcome.result.envelopes.filter(e => (e.meta as any)?.skipped);
        expect(skipped.map(e => e.stepId)).toContain('chain:deckQuality');
        expect(skipped.map(e => e.stepId)).toContain('chain:titles');   // a persona's name is not a slide title
        expect(outcome.result.deckQualityReport).toBeNull();
        expect(DELIVERABLE_SKIP).toEqual(['deckQuality', 'titles']);
    });

    it('runs every OTHER stage, so the gates finally see these artifacts', async () => {
        const outcome = await runDeliverableChain([persona('d1')], { runId: 'r1' });
        const ran = outcome.result.envelopes
            .filter(e => !(e.meta as any)?.skipped)
            .map(e => e.stepId.replace('chain:', ''));
        for (const stage of STAGE_ORDER) {
            if (DELIVERABLE_SKIP.includes(stage)) continue;
            expect(ran, `${stage} did not run`).toContain(stage);
        }
    });

    it('binds a pointer to a deliverable whose field names its source', async () => {
        noteGroundingChunks([{
            id: 'articles/exs-clockwork/aa11.md#c1',
            text: 'Clockwork frames retained search as eight stages.',
            sources: [{ n: 'Clockwork' }],
        }]);
        const outcome = await runDeliverableChain([persona('d1')], { runId: 'r1' });
        expect(outcome.result.bindReport?.bound.length).toBeGreaterThan(0);
        expect(JSON.stringify(outcome.items[0].data)).toContain('articles/exs-clockwork/aa11.md#c1');
        expect(outcome.changedIds).toContain('d1');
    });

    it('scrubs a format tell out of a deliverable payload', async () => {
        const item = persona('d1', { jtbd: 'Present a shortlist — before the client loses patience.' });
        const outcome = await runDeliverableChain([item], { runId: 'r1' });
        expect(outcome.items[0].data.jtbd).not.toMatch(/—/);
    });

    it('is a no-op on an empty set', async () => {
        const outcome = await runDeliverableChain([], { runId: 'r1' });
        expect(outcome.items).toHaveLength(0);
        expect(outcome.changedIds).toHaveLength(0);
    });

    it('summarizes by the real deliverable types, not by the carrier template', async () => {
        const outcome = await runDeliverableChain(
            [persona('d1'), { id: 'd2', type: 'theme', timestamp: 1, data: { theme: 'T' } }], { runId: 'r1' });
        const summary = deliverableChainSummary(outcome);
        expect(summary).toContain('persona');
        expect(summary).toContain('theme');
        expect(summary).not.toContain('slides:deliverable');
    });
});
