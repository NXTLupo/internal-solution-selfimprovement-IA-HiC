/**
 * concept-cluster routing in infographicSpecFrom
 * (plans/gemini-notebook-parity-closeout-2026-11-09.md WS-D2).
 *
 * The cluster branch sits BEFORE the process-flow branch on purpose: a cluster's items have no
 * order, and routing them to process-flow draws arrows that assert a sequence the evidence does
 * not support. These pins keep that ordering and the shape of what the renderer receives.
 */
import { describe, it, expect } from 'vitest';
import { infographicSpecFrom } from './artifactIllustrator';

describe('infographicSpecFrom - concept cluster', () => {
    it('routes grouped related mechanisms to the cluster family', () => {
        const spec = infographicSpecFrom({
            clusters: [
                { heading: 'Architecture', nodes: [{ name: 'Shared memory', detail: 'One event log.' }, { name: 'Pull queue', detail: 'Agents claim work.' }] },
                { heading: 'Controls', nodes: [{ name: 'Approval gates', detail: 'A human says yes.' }] },
            ],
        }, 'agent operating model');
        expect(spec?.kind).toBe('concept-cluster');
        expect((spec?.groups as any[]).length).toBe(2);
        expect((spec?.groups as any[])[0].nodes[0]).toEqual({ name: 'Shared memory', detail: 'One event log.' });
    });

    it('accepts the conceptGroups and items spellings', () => {
        const spec = infographicSpecFrom({
            conceptGroups: [{ title: 'Controls', items: ['Approval gates', 'Spend limits', 'Audit log'] }],
        }, 'controls');
        expect(spec?.kind).toBe('concept-cluster');
        expect((spec?.groups as any[])[0].nodes).toHaveLength(3);
    });

    it('wins over the process-flow branch when both shapes are present', () => {
        const spec = infographicSpecFrom({
            clusters: [{ heading: 'G', nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }],
            steps: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }],
        }, 'x');
        expect(spec?.kind).toBe('concept-cluster');
    });

    it('falls through when the cluster is too thin to be an exhibit', () => {
        const spec = infographicSpecFrom({
            clusters: [{ heading: 'G', nodes: [{ name: 'Only one' }] }],
            steps: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }],
        }, 'x');
        expect(spec?.kind).toBe('process-flow');
    });

    it('strips citation pointers out of node text', () => {
        const spec = infographicSpecFrom({
            clusters: [{ heading: 'G', nodes: [
                { name: 'Approval gates [articles/x.md#c3]', detail: 'A human says yes (Source: r/MuseAgent).' },
                { name: 'Spend limits' }, { name: 'Audit log' }] }],
        }, 'x');
        const nodes = (spec?.groups as any[])[0].nodes;
        expect(nodes[0].name).toBe('Approval gates');
        expect(nodes[0].detail).toBe('A human says yes.');
    });

    it('caps groups at two and nodes at four so the exhibit stays legible', () => {
        const many = Array.from({ length: 9 }, (_, i) => ({ name: `Node ${i}` }));
        const spec = infographicSpecFrom({
            clusters: [{ heading: 'A', nodes: many }, { heading: 'B', nodes: many }, { heading: 'C', nodes: many }],
        }, 'x');
        const groups = spec?.groups as any[];
        expect(groups).toHaveLength(2);
        expect(groups[0].nodes).toHaveLength(4);
    });
});

// 2026-11-09 (closeout plan E2 items 3-4): containment and proportion shapes.
describe('infographicSpecFrom - funnel and nested', () => {
    it('routes progressive-loss stages to the funnel family', () => {
        const spec = infographicSpecFrom({
            funnel: [
                { name: 'Knockout questions', detail: 'Location and work authorisation reject first.' },
                { name: 'Keyword matching', detail: 'The system scores the resume.' },
                { name: 'Human review', detail: 'A recruiter reads what survives.' },
            ],
        }, 'screening');
        expect(spec?.kind).toBe('funnel');
        expect((spec?.stages as any[])).toHaveLength(3);
    });

    it('wins over process-flow, because a flow asserts order and a funnel asserts loss', () => {
        const spec = infographicSpecFrom({
            funnel: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
            steps: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }],
        }, 'x');
        expect(spec?.kind).toBe('funnel');
    });

    it('falls through when a funnel is too short to show narrowing', () => {
        const spec = infographicSpecFrom({
            funnel: [{ name: 'A' }, { name: 'B' }],
            steps: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }],
        }, 'x');
        expect(spec?.kind).toBe('process-flow');
    });

    it('routes containment layers to the nested family', () => {
        const spec = infographicSpecFrom({
            nested: ['Institution', 'Service', 'Student record'],
        }, 'containment');
        expect(spec?.kind).toBe('nested');
        expect((spec?.layers as any[])).toHaveLength(3);
    });

    it('does NOT hijack a layered architecture map, whose layers carry nodes', () => {
        const spec = infographicSpecFrom({
            layers: [{ name: 'Experience', nodes: ['Web'] }, { name: 'Data', nodes: ['Warehouse'] }],
        }, 'architecture');
        expect(spec?.kind).not.toBe('nested');
    });

    it('strips citation pointers out of funnel stage text', () => {
        const spec = infographicSpecFrom({
            funnel: [
                { name: 'Knockout questions [articles/x.md#c3]', detail: 'Rejects first (Source: r/jobs).' },
                { name: 'Keyword matching' }, { name: 'Human review' },
            ],
        }, 'x');
        const st = (spec?.stages as any[])[0];
        expect(st.name).toBe('Knockout questions');
        expect(st.detail).toBe('Rejects first.');
    });
});
