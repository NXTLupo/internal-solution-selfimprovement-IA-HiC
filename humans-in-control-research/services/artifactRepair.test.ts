/**
 * Artifact repair. The tests that matter here are the PROHIBITIONS: a repair
 * pass that can add a citation is a fabrication engine, and a repair pass that
 * cannot stop is a cost leak.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callMock = vi.fn();
vi.mock('./aiRetryClient', () => ({ callAIWithRetry: (...a: any[]) => callMock(...a) }));

import { repairArtifact } from './artifactRepair';
import { runArtifactChain } from './artifactChain';
import { resetProgress } from './progressGuard';

const slide = (id: string, payload: any, locked = false) => ({
    id, template: 'slides:numbered-themes', status: 'draft', timestamp: 1,
    title: payload.title, composerPayload: payload, ...(locked ? { _locked: true } : {}),
});

const chainCtx = { runId: 'r1', fetchPage: (async () => '') as any };

beforeEach(() => { callMock.mockReset(); resetProgress(); });

describe('repairArtifact', () => {
    it('narrows an unsupported quantitative claim through the edit contract', async () => {
        const slides = [slide('s1', {
            title: 'Conversion shifted to the assistant',
            items: [{ heading: 'Conversion rose 40 percent after launch because buyers asked the assistant first' }],
        })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        expect(chain.pass).toBe(false);

        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                'items[0].heading': 'Buyers now open the assistant before they open search',
            }) }] } }],
        });

        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.rounds[0].fieldsEdited).toBe(1);
        expect(res.slides[0].composerPayload.items[0].heading).toBe('Buyers now open the assistant before they open search');
        // WS-4 contract: the change is undoable.
        expect((res.slides[0] as any)._textHistory).toHaveLength(1);
    });

    it('strips a citation the repair tried to invent (the fabrication guard)', async () => {
        const slides = [slide('s1', {
            title: 'A finding',
            items: [{ heading: 'Adoption rose 30 percent because the desk changed tools' }],
        })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                'items[0].heading': 'The desk changed tools and adoption followed [articles/invented-source/deadbeef.md#c9]',
            }) }] } }],
        });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        const out = res.slides[0].composerPayload.items[0].heading;
        expect(out).not.toContain('invented-source');
        expect(out).not.toContain('.md#c');
    });

    it('keeps a pointer the field already carried', async () => {
        const slides = [slide('s1', {
            title: 'A finding',
            items: [
                { heading: 'Adoption rose because the desk changed tools [articles/real/aa11.md#c2]' },
                { heading: 'Every firm in the segment now runs an assistant' },
            ],
        })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                'items[1].heading': 'Several firms in the segment now run an assistant',
            }) }] } }],
        });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.slides[0].composerPayload.items[0].heading).toContain('articles/real/aa11.md#c2');
        expect(res.slides[0].composerPayload.items[1].heading).toBe('Several firms in the segment now run an assistant');
    });

    it('ignores a hallucinated field path', async () => {
        const slides = [slide('s1', { title: 'A finding', items: [{ heading: 'Adoption rose 30 percent because of the change' }] })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({ 'items[7].heading': 'invented path' }) }] } }],
        });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.rounds[0]?.fieldsEdited ?? 0).toBe(0);
        expect(res.stopReason).toBe('no_progress');
    });

    it('stops after a round that changes nothing instead of looping', async () => {
        const slides = [slide('s1', { title: 'A finding', items: [{ heading: 'Adoption rose 30 percent because of the change' }] })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        callMock.mockResolvedValue({ candidates: [{ content: { parts: [{ text: '{}' }] } }] });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.rounds).toHaveLength(1);
        expect(res.stopReason).toBe('no_progress');
        expect(callMock).toHaveBeenCalledTimes(1);
    });

    it('never touches a locked slide and reports that it skipped one', async () => {
        const slides = [slide('s1', { title: 'A finding', items: [{ heading: 'Adoption rose 30 percent because of the change' }] }, true)];
        const chain = await runArtifactChain(slides as any, chainCtx);
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(callMock).not.toHaveBeenCalled();
        expect(res.rounds[0]?.skippedLocked).toBe(1);
    });

    it('does nothing when the chain already passed', async () => {
        const slides = [slide('s1', { title: 'A neutral heading', items: [{ heading: 'The registrar exports enrollment every week' }] })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.rounds).toHaveLength(0);
        expect(callMock).not.toHaveBeenCalled();
    });

    it('reports survivors honestly rather than declaring the artifact clean', async () => {
        const slides = [slide('s1', {
            title: 'A finding',
            items: [{ heading: 'Adoption rose 30 percent because the desk changed tools' }],
        })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        // The "repair" produces a cosmetic change that leaves the claim unsupported.
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                'items[0].heading': 'Adoption rose 30 percent because the desk switched tools',
            }) }] } }],
        });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.finalChain.pass).toBe(false);
        expect(res.envelope.status).toBe('partial');
        expect(res.envelope.nextAction).toBe('narrow_scope');
        expect(res.envelope.message).toMatch(/survived repair/);
    });

    it('a per-slide failure never aborts the round', async () => {
        const slides = [
            slide('s1', { title: 'One', items: [{ heading: 'Adoption rose 30 percent because of the change' }] }),
            slide('s2', { title: 'Two', items: [{ heading: 'Every buyer in the segment switched because of the change' }] }),
        ];
        const chain = await runArtifactChain(slides as any, chainCtx);
        callMock
            .mockRejectedValueOnce(new Error('provider 500'))
            .mockResolvedValue({ candidates: [{ content: { parts: [{ text: JSON.stringify({ 'items[0].heading': 'Buyers in the segment switched tools' }) }] } }] });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.rounds[0].failed).toBe(1);
        expect(res.rounds[0].fieldsEdited).toBe(1);
    });
});
