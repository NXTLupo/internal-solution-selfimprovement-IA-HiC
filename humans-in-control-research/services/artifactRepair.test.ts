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
        const slides = [slide('s1', { title: 'The registrar exports enrollment every week', items: [{ heading: 'The registrar exports enrollment every week' }] })];
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

describe('Stage 2.1 (2026-10-01): repair reaches slop, titles and prose', () => {
    it('a banned phrase alone triggers a repair round and the rewrite lands', async () => {
        const slides = [slide('s1', {
            title: 'Intake teams lose applicants at the second step',
            items: [{ heading: 'Firms utilize a comprehensive approach to intake' }],
        })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        expect(chain.slopFindings.length).toBeGreaterThan(0);
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                'items[0].heading': 'Intake teams run one shared process across every office',
            }) }] } }],
        });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.rounds[0].fieldsEdited).toBe(1);
        const instruction = String(callMock.mock.calls[0][1].contents[0].parts[0].text);
        expect(instruction).toContain('banned wording "utilize"');
        expect(res.finalChain.slopFindings).toHaveLength(0);
        expect(res.ri.before.slop).toBeGreaterThan(0);
        expect(res.ri.after.slop).toBe(0);
        expect(res.ri.improved).toBe(true);
    });

    it('title candidates: the gate picks the first passing candidate over the model\'s own title field', async () => {
        const slides = [slide('s1', { title: 'Conversion rose 40% after launch', items: [{ heading: 'Buyers ask the assistant before they search' }] })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        expect(chain.titleReport?.pass).toBe(false);
        callMock.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: JSON.stringify({
                title: 'Conversion rose 40% after launch',
                _titleCandidates: ['Conversion rose by 40 percent', 'The Landscape', 'Buyers now ask the assistant before they search'],
            }) }] } }],
        });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.slides[0].composerPayload.title).toBe('Buyers now ask the assistant before they search');
        expect(res.finalChain.titleReport?.pass).toBe(true);
        const instruction = String(callMock.mock.calls[0][1].contents[0].parts[0].text);
        expect(instruction).toContain('Partner Test');
    });

    it('a naked-number title that survives repair stays visible in the final chain (the caller withholds it)', async () => {
        const slides = [slide('s1', { title: 'Advisors carry 400 students each', items: [{ heading: 'Advising offices run on a shared calendar' }] })];
        const chain = await runArtifactChain(slides as any, chainCtx);
        callMock.mockResolvedValue({ candidates: [{ content: { parts: [{ text: JSON.stringify({ _titleCandidates: ['Advisors carry 400 students', 'Overview'] }) }] } }] });
        const res = await repairArtifact(slides as any, chain, chainCtx);
        expect(res.finalChain.titleReport?.findings.some(f => f.kinds.includes('naked_number'))).toBe(true);
        expect(res.envelope.status).toBe('partial');
    });
});

describe('Stage 2.4 (2026-10-01): claim findings reach the repairer', () => {
    it('a blocking claim finding alone triggers a repair round with the ledger code in the instruction', async () => {
        const chunks = [{ id: 'articles/hed/aa11.md#c1', text: 'The registrar exports enrollment to advancement every Friday afternoon.', sources: [{ n: 'Higher Ed Dive' }] }];
        const slides = [slide('s1', {
            title: 'Advancement receives enrollment data a week late',
            quote: '"The registrar sends enrollment to advancement every Monday morning without fail" [articles/hed/aa11.md#c1]',
        })];
        const ctx = { ...chainCtx, groundingChunks: chunks as any };
        const chain = await runArtifactChain(slides as any, ctx);
        expect(chain.claimReport?.blocking).toBeGreaterThan(0);
        callMock.mockResolvedValue({ candidates: [{ content: { parts: [{ text: JSON.stringify({
            quote: '"The registrar exports enrollment to advancement every Friday afternoon" [articles/hed/aa11.md#c1]',
        }) }] } }] });
        const res = await repairArtifact(slides as any, chain, ctx);
        expect(res.rounds.length).toBeGreaterThan(0);
        const instruction = String(callMock.mock.calls[0][1].contents[0].parts[0].text);
        expect(instruction).toContain('UNVERIFIED_QUOTE');
        expect(res.ri.before.claims).toBeGreaterThan(0);
    });
});
