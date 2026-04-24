import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock anthropicService before importing chatToArtifact
vi.mock('../../services/anthropicService', () => ({
    analyzeText: vi.fn(),
}));

import { generateArtifact } from './chatToArtifact';
import * as anthropicService from '../../services/anthropicService';
import personaFixture from '../__fixtures__/persona.valid.json';
import journeyFixture from '../__fixtures__/journey.valid.json';

describe('generateArtifact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns validated persona when model emits clean JSON', async () => {
        (anthropicService.analyzeText as any).mockResolvedValue(JSON.stringify(personaFixture));
        const r = await generateArtifact({
            content: 'persona', brand: 'nu', userPrompt: 'junior dev',
            designMdRaw: 'stub', corpusText: 'stub', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.artifact.type).toBe('persona');
    });

    it('strips markdown fences from model output', async () => {
        (anthropicService.analyzeText as any).mockResolvedValue('```json\n' + JSON.stringify(personaFixture) + '\n```');
        const r = await generateArtifact({
            content: 'persona', brand: 'nu', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
    });

    it('returns error when model returns non-JSON', async () => {
        (anthropicService.analyzeText as any).mockResolvedValue('I apologize, but I cannot generate this.');
        const r = await generateArtifact({
            content: 'persona', brand: 'nxt', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toMatch(/parsable JSON/i);
    });

    it('returns error when JSON is parseable but schema-invalid', async () => {
        const bad = { ...personaFixture, goals: [] };
        (anthropicService.analyzeText as any).mockResolvedValue(JSON.stringify(bad));
        const r = await generateArtifact({
            content: 'persona', brand: 'nxt', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toMatch(/validation failed/i);
    });

    it('dispatches to journey generator', async () => {
        (anthropicService.analyzeText as any).mockResolvedValue(JSON.stringify(journeyFixture));
        const r = await generateArtifact({
            content: 'journey', brand: 'nxt', userPrompt: 'enrollment',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.artifact.type).toBe('journey');
    });

    it('rejects unsupported content type', async () => {
        const r = await generateArtifact({
            content: 'blueprint' as any, brand: 'nxt', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.error).toMatch(/not yet supported/);
    });

    it('dispatches to org-chart generator', async () => {
        const orgChartFixture = await import('../__fixtures__/orgChart.valid.json');
        (anthropicService.analyzeText as any).mockResolvedValue(JSON.stringify(orgChartFixture.default ?? orgChartFixture));
        const r = await generateArtifact({
            content: 'org', brand: 'nu', userPrompt: 'advancement division',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.artifact.type).toBe('org');
    });

    it('rejects org-chart with invalid rootIds reference', async () => {
        const orgChartFixture = await import('../__fixtures__/orgChart.valid.json');
        const src = orgChartFixture.default ?? orgChartFixture;
        const bad = { ...src, rootIds: ['ghost'] };
        (anthropicService.analyzeText as any).mockResolvedValue(JSON.stringify(bad));
        const r = await generateArtifact({
            content: 'org', brand: 'nu', userPrompt: 'x',
            designMdRaw: 's', corpusText: 's', currentArtifact: null,
        });
        expect(r.ok).toBe(false);
    });
});
