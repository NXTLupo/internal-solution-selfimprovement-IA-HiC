/**
 * DF-A3 artifact chain. The point of this file is the ORDER assertion: deer-flow
 * pins its middleware assembly order with a test because a silent reorder is a
 * correctness bug that no other test catches (verify before scrub, count slots
 * before relabeling, measure prose before it is final).
 */
import { describe, it, expect, vi } from 'vitest';
import { runArtifactChain, STAGE_ORDER } from './artifactChain';

const slide = (id: string, payload: any) => ({
    id, template: 'slides:numbered-themes', status: 'draft', timestamp: 1,
    title: payload.title, composerPayload: payload,
});

/** No wiki in unit tests: the fetcher is injected, so provenance runs offline. */
const pageWith = (text: string) => async () => text;

describe('STAGE_ORDER', () => {
    it('is the declared contract', () => {
        expect(STAGE_ORDER).toEqual(['normalize', 'lexical', 'bindPointers', 'provenance', 'evidenceSlots', 'exhibits', 'prose', 'grade', 'renderPlan', 'deckQuality']);
    });

    it('scrubs before verifying, and counts slots after verification settles', () => {
        expect(STAGE_ORDER.indexOf('lexical')).toBeLessThan(STAGE_ORDER.indexOf('provenance'));
        // Binding supplies the pointers provenance and the evidence gate read.
        expect(STAGE_ORDER.indexOf('bindPointers')).toBeLessThan(STAGE_ORDER.indexOf('provenance'));
        expect(STAGE_ORDER.indexOf('bindPointers')).toBeLessThan(STAGE_ORDER.indexOf('evidenceSlots'));
        expect(STAGE_ORDER.indexOf('provenance')).toBeLessThan(STAGE_ORDER.indexOf('evidenceSlots'));
        expect(STAGE_ORDER.indexOf('evidenceSlots')).toBeLessThan(STAGE_ORDER.indexOf('prose'));
        // The grader grades the other gates, so it can only run after them.
        expect(STAGE_ORDER.indexOf('prose')).toBeLessThan(STAGE_ORDER.indexOf('grade'));
    });
});

describe('runArtifactChain', () => {
    it('records one envelope per stage in order, with a compact trace for AIR', async () => {
        const slides = [slide('s1', { title: 'Gift officers never receive the attendance list', items: [{ heading: 'The registrar exports enrollment weekly' }] })];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith('') });
        expect(res.envelopes.map(e => e.stepId)).toEqual(STAGE_ORDER.map(s => `chain:${s}`));
        expect(res.trace).toHaveLength(STAGE_ORDER.length);
        expect(res.trace[0]).toMatchObject({ stepId: 'chain:normalize', status: 'success' });
    });

    it('strips an em-dash in the lexical stage without touching a citation pointer', async () => {
        const slides = [slide('s1', {
            title: 'Advancement loses alumni — at three handoffs',
            items: [{ heading: 'The registrar exports enrollment weekly [articles/case-source/ab12cd34ef.md#c2]' }],
        })];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith('') });
        expect(res.slides[0].composerPayload.title).not.toContain('—');
        expect(res.slides[0].composerPayload.items[0].heading).toContain('articles/case-source/ab12cd34ef.md#c2');
    });

    it('drops a malformed slide in normalize instead of crashing a later stage', async () => {
        const slides = [slide('s1', { title: 'Real slide', items: [] }), null as any, { id: 'x' } as any];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith('') });
        expect(res.slides).toHaveLength(1);
        expect(res.envelopes[0].status).toBe('partial');
    });

    it('refuses an unsupported factual claim and emits a narrowing instruction', async () => {
        const slides = [slide('s1', {
            title: 'Conversion shifted to the assistant',
            items: [{ heading: 'Conversion rose 40 percent after launch because buyers asked the assistant first' }],
        })];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith('') });
        const slotEnv = res.envelopes.find(e => e.stepId === 'chain:evidenceSlots')!;
        expect(slotEnv.status).toBe('partial');
        expect(slotEnv.nextAction).toBe('narrow_scope');
        expect(res.repairInstruction).toMatch(/EVIDENCE REVISION REQUIRED/);
        expect(res.pass).toBe(false);
    });

    it('a stage that throws is recorded as an error and the chain still finishes', async () => {
        const slides = [slide('s1', {
            title: 'A slide',
            items: [{ heading: 'Adoption rose 20 percent because the desk changed tools [articles/x/y1.md#c1]' }],
        })];
        const res = await runArtifactChain(slides, {
            runId: 'r1',
            fetchPage: pageWith('Adoption rose 20 percent because the desk changed tools'),
            subjectDomain: 'recruiting',
            // The domain resolver is the injected seam; a throw here proves the
            // chain records the failure rather than aborting the artifact.
            resolveSourceText: () => { throw new Error('resolver failed: connection reset'); },
        });
        const slotEnv = res.envelopes.find(e => e.stepId === 'chain:evidenceSlots')!;
        expect(slotEnv.status).toBe('error');
        expect(slotEnv.errorType).toBe('transient');
        // Later stages still ran: one broken stage must not silence the chain.
        expect(res.envelopes.map(e => e.stepId)).toContain('chain:prose');
        expect(res.slides).toHaveLength(1);
    });

    it('a page-fetch outage yields UNREACHABLE rather than stripping a real label', async () => {
        const slides = [slide('s1', {
            title: 'A slide',
            items: [{ heading: 'Adoption rose because the desk changed tools [articles/x/y1.md#c1]', sourceLine: 'Retail Dive' }],
        })];
        const res = await runArtifactChain(slides, {
            runId: 'r1',
            fetchPage: async () => null,   // proxy down: page unreadable
        });
        const prov = res.envelopes.find(e => e.stepId === 'chain:provenance')!;
        expect(prov.status).not.toBe('error');
        if (res.ledger.length) {
            expect(res.ledger.every(r => r.verdict === 'UNREACHABLE')).toBe(true);
        }
        // The label survives: an outage must never look like a fabrication.
        expect(res.slides[0].composerPayload.items[0].sourceLine).toBe('Retail Dive');
    });

    it('honors an explicit skip and records it rather than hiding it', async () => {
        const slides = [slide('s1', { title: 'A slide', items: [] })];
        const res = await runArtifactChain(slides, { runId: 'r1', skip: ['provenance'], fetchPage: pageWith('') });
        const prov = res.envelopes.find(e => e.stepId === 'chain:provenance')!;
        expect(prov.meta).toMatchObject({ skipped: true });
        expect(res.ledger).toEqual([]);
    });

    it('reports the visual ratio for the render-plan quota', async () => {
        const slides = [
            slide('s1', { title: 'Cover', items: [], backgroundImage: 'http://x/y.png' }),
            slide('s2', { title: 'Plain text slide', items: [] }),
        ];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith('') });
        const rp = res.envelopes.find(e => e.stepId === 'chain:renderPlan')!;
        expect(rp.value).toMatchObject({ withVisual: 1, total: 2, visualRatio: 0.5 });
    });
});

describe('bindPointers stage', () => {
    const CHUNK = {
        id: 'articles/clockwork-blog/9f2a71c4de.md#c2',
        text: 'Clockwork frames retained executive search as eight discrete stages, and research and sourcing absorb the majority of consultant hours.',
        sourceNames: ['Clockwork'],
    };

    it('binds a bare source label so the evidence gate stops refusing the slide', async () => {
        const slides = [slide('s1', {
            title: 'Research and sourcing absorb the majority of consultant hours',
            items: [{ heading: 'Clockwork frames retained executive search as eight discrete stages' }],
            source: 'Clockwork',
        })];
        const before = await runArtifactChain(slides, { runId: 'r0', fetchPage: pageWith('') });
        const after = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith(CHUNK.text), groundingChunks: [CHUNK] });

        expect(before.bindReport).toBeNull();
        expect(after.bindReport!.bound.length).toBeGreaterThan(0);
        expect(JSON.stringify(after.slides[0].composerPayload)).toContain(CHUNK.id);
        // The whole point: coverage improves because the pointer is now present.
        expect(after.slotReport!.p0Coverage).toBeGreaterThanOrEqual(before.slotReport!.p0Coverage);
    });

    it('records a partial envelope when no span clears the bar, and ships the deck anyway', async () => {
        const slides = [slide('s1', {
            title: 'A finding',
            items: [{ heading: 'Adoption rose 40 percent because the desk changed tools' }],
            source: 'Some Publication Nobody Retrieved',
        })];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith(''), groundingChunks: [CHUNK] });
        const env = res.envelopes.find(e => e.stepId === 'chain:bindPointers')!;
        expect(env.status).toBe('partial');
        expect(res.slides).toHaveLength(1);
    });

    it('is a no-op with no grounding set, and says so', async () => {
        const slides = [slide('s1', { title: 'A finding', items: [{ heading: 'x' }] })];
        const res = await runArtifactChain(slides, { runId: 'r1', fetchPage: pageWith(''), groundingChunks: [] });
        const env = res.envelopes.find(e => e.stepId === 'chain:bindPointers')!;
        expect(env.message).toMatch(/no grounding spans/);
    });
});
