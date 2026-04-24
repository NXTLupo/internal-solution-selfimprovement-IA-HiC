import { describe, it, expect } from 'vitest';
import { validateOrgChartArtifact } from './orgChartArtifact';
import validFixture from '../__fixtures__/orgChart.valid.json';

describe('OrgChartArtifactSchema', () => {
    it('accepts a well-formed org chart', () => {
        expect(validateOrgChartArtifact(validFixture).ok).toBe(true);
    });

    it('rejects org chart with no nodes', () => {
        const bad = { ...validFixture, nodes: [] };
        expect(validateOrgChartArtifact(bad).ok).toBe(false);
    });

    it('rejects org chart with empty rootIds', () => {
        const bad = { ...validFixture, rootIds: [] };
        expect(validateOrgChartArtifact(bad).ok).toBe(false);
    });

    it('rejects directReports referencing nonexistent node id', () => {
        const bad = {
            ...validFixture,
            nodes: validFixture.nodes.map((n: any, i: number) =>
                i === 0 ? { ...n, directReports: ['nonexistent'] } : n,
            ),
        };
        expect(validateOrgChartArtifact(bad).ok).toBe(false);
    });

    it('rejects rootIds referencing nonexistent node id', () => {
        const bad = { ...validFixture, rootIds: ['ghost'] };
        expect(validateOrgChartArtifact(bad).ok).toBe(false);
    });

    it('rejects invalid iconKey value', () => {
        const bad = {
            ...validFixture,
            nodes: validFixture.nodes.map((n: any, i: number) =>
                i === 0 ? { ...n, iconKey: 'robot' } : n,
            ),
        };
        expect(validateOrgChartArtifact(bad).ok).toBe(false);
    });

    it('accepts org chart without explicit layout (dagre will auto-layout)', () => {
        const { layout, ...rest } = validFixture as any;
        expect(validateOrgChartArtifact(rest).ok).toBe(true);
    });
});
