import { describe, it, expect, beforeEach } from 'vitest';
import { resolveLineage, lineageLabel, latestLineage, __resetLineageForTests, type ArtifactLineage } from './artifactLineage';

const none = async () => null;

describe('artifact lineage (WS-C C1)', () => {
    beforeEach(() => __resetLineageForTests());

    it('a first generation is a root', async () => {
        const l = await resolveLineage({ runId: 'r', artifactId: 'slides_1', artifactType: 'slides' }, undefined, { latest: none });
        expect(l).toEqual({ rootArtifactId: 'slides_1', revision: 1, reason: 'generated' });
        expect(lineageLabel(l)).toBe('v1 of 1');
    });

    it('a revision names the newest artifact of its type as the parent and counts up', async () => {
        await resolveLineage({ runId: 'r', artifactId: 'slides_1', artifactType: 'slides' }, undefined, { latest: none });
        const v2 = await resolveLineage({ runId: 'r', artifactId: 'slides_2', artifactType: 'slides' }, { reason: 'narrowed scope' }, { latest: none });
        const v3 = await resolveLineage({ runId: 'r', artifactId: 'slides_3', artifactType: 'slides' }, { reason: 'shorter, for the CIO' }, { latest: none });
        expect(v2).toMatchObject({ parentArtifactId: 'slides_1', rootArtifactId: 'slides_1', revision: 2, reason: 'narrowed scope' });
        expect(v3).toMatchObject({ parentArtifactId: 'slides_2', rootArtifactId: 'slides_1', revision: 3 });
        expect(lineageLabel(v2, 3)).toBe('v2 of 3, from v1: narrowed scope');
        expect(lineageLabel(v3)).toBe('v3 of 3, from v2: shorter, for the CIO');
    });

    it('types and runs keep separate chains', async () => {
        await resolveLineage({ runId: 'r', artifactId: 'slides_1', artifactType: 'slides' }, undefined, { latest: none });
        const gap = await resolveLineage({ runId: 'r', artifactId: 'gap_1', artifactType: 'gap' }, { reason: 'tighten' }, { latest: none });
        const other = await resolveLineage({ runId: 'other', artifactId: 'slides_9', artifactType: 'slides' }, { reason: 'tighten' }, { latest: none });
        expect(gap.parentArtifactId).toBeUndefined();
        expect(gap).toMatchObject({ rootArtifactId: 'gap_1', revision: 1, reason: 'tighten' });
        expect(other.parentArtifactId).toBeUndefined();
    });

    it('after a reload the parent comes from the proxy record', async () => {
        const fromDisk: ArtifactLineage = { parentArtifactId: 'slides_1', rootArtifactId: 'slides_1', revision: 2, reason: 'narrowed scope' };
        const l = await resolveLineage({ runId: 'r', artifactId: 'slides_5', artifactType: 'slides' }, { reason: 'guidance: lead with cost' },
            { latest: async (runId, type) => (runId === 'r' && type === 'slides' ? { artifactId: 'slides_2', lineage: fromDisk } : null) });
        expect(l).toMatchObject({ parentArtifactId: 'slides_2', rootArtifactId: 'slides_1', revision: 3 });
    });

    it('two emissions in one turn cannot claim the same parent', async () => {
        await resolveLineage({ runId: 'r', artifactId: 'strategy_1', artifactType: 'strategy' }, undefined, { latest: none });
        let release!: () => void;
        const gate = new Promise<void>(r => { release = r; });
        const slowLatest = async () => { await gate; return null; };
        const a = resolveLineage({ runId: 'r', artifactId: 'strategy_2', artifactType: 'strategy' }, { reason: 'delta turn' }, { latest: slowLatest });
        const b = resolveLineage({ runId: 'r', artifactId: 'strategy_3', artifactType: 'strategy' }, { reason: 'refine' }, { latest: slowLatest });
        release();
        const [la, lb] = await Promise.all([a, b]);
        expect(la.parentArtifactId).toBe('strategy_1');
        expect(lb.parentArtifactId).toBe('strategy_2');
        expect(latestLineage('r', 'strategy')?.artifactId).toBe('strategy_3');
    });

    it('a named parent wins over the newest of the type, and a fork labels its source', async () => {
        await resolveLineage({ runId: 'r', artifactId: 'slides_1', artifactType: 'slides' }, undefined, { latest: none });
        await resolveLineage({ runId: 'r', artifactId: 'slides_2', artifactType: 'slides' }, { reason: 'a' }, { latest: none });
        const l = await resolveLineage({ runId: 'r', artifactId: 'slides_3', artifactType: 'slides' }, { reason: 'back to v1', parentArtifactId: 'slides_1' }, { latest: none, byId: none });
        expect(l).toMatchObject({ parentArtifactId: 'slides_1', revision: 2 });
        expect(lineageLabel({ rootArtifactId: 'x', revision: 1, reason: 'fork', forkedFrom: { runId: 'r', artifactId: 'slides_3' } })).toBe('v1 of 1, forked from slides_3');
    });

    it('a revision reason never carries an em dash', async () => {
        const l = await resolveLineage({ runId: 'r', artifactId: 'a_1', artifactType: 'a' }, { reason: 'shorter — for the board' }, { latest: none });
        expect(l.reason).toBe('shorter , for the board');
    });
});
