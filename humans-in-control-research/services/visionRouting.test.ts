// visionRouting.test.ts - 2026-07-05 heuristic-audit uplift Phase 0.
// Locks the routeVisionAnalysis fix: the pre-fix switch implemented ONLY the openai
// provider while DEFAULT_MODELS.vision is a google model, so the default config always
// threw "Vision not supported for provider: google" (the broken Heuristic Analysis
// module). These tests pin all three provider branches + the vision-capability guard
// + the heuristic-audit model resolution through the single routing authority.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const callAnthropic = vi.fn();
const callGemini = vi.fn();

vi.mock('./aiRetryClient', () => ({
    callAnthropic: (...args: any[]) => callAnthropic(...args),
    callGemini: (...args: any[]) => callGemini(...args),
    callAIWithRetry: vi.fn(),
    callOpenAI: vi.fn(),
    callGeminiCompat: vi.fn(),
}));

import { routeVisionAnalysis, artifactModelFor, DEFAULT_MODELS, MODEL_REGISTRY, type ModelPreferences } from './aiRouter';

const IMAGES = [
    { base64: 'AAAA', mimeType: 'image/jpeg' },
    { base64: 'BBBB', mimeType: 'image/png' },
];

beforeEach(() => {
    callAnthropic.mockReset();
    callGemini.mockReset();
});

describe('routeVisionAnalysis provider branches', () => {
    it('default vision model is google AND google is now a supported branch (the Phase 0 fix)', async () => {
        expect(MODEL_REGISTRY[DEFAULT_MODELS.vision]?.provider).toBe('google');
        callGemini.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
        });
        const out = await routeVisionAnalysis<{ ok: boolean }>(
            'sys', 'user', IMAGES, { ...DEFAULT_MODELS } as ModelPreferences, 8000, 0.1);
        expect(out.ok).toBe(true);
        const body = callGemini.mock.calls[0][0];
        // interleaved inlineData + sequence labels + trailing user prompt
        const parts = body.contents[0].parts;
        expect(parts[0].inlineData.data).toBe('AAAA');
        expect(parts[1].text).toContain('Screenshot 1 of 2');
        expect(parts[parts.length - 1].text).toBe('user');
        expect(body.config.responseMimeType).toBe('application/json');
    });

    it('anthropic branch posts image blocks with NO temperature (Opus 4.8 rejects it)', async () => {
        callAnthropic.mockResolvedValue({ content: [{ type: 'text', text: '{"issues":[]}' }] });
        const prefs = { ...DEFAULT_MODELS, vision: 'claude-opus-4-8' } as ModelPreferences;
        const out = await routeVisionAnalysis<{ issues: unknown[] }>('sys', 'user', IMAGES, prefs, 8000, 0.1);
        expect(out.issues).toEqual([]);
        const body = callAnthropic.mock.calls[0][0];
        expect(body.model).toBe('claude-opus-4-8');
        expect(body).not.toHaveProperty('temperature');
        expect(body.system).toBe('sys');
        expect(body.messages[0].content[0]).toEqual({
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' },
        });
    });

    it('rejects a non-vision model with a clear error (not the generic provider throw)', async () => {
        const prefs = { ...DEFAULT_MODELS, vision: 'deepseek-v4-flash' } as ModelPreferences;
        await expect(routeVisionAnalysis('sys', 'user', IMAGES, prefs))
            .rejects.toThrow(/not vision-capable/);
    });

    it('unknown model still fails loudly', async () => {
        const prefs = { ...DEFAULT_MODELS, vision: 'no-such-model' } as ModelPreferences;
        await expect(routeVisionAnalysis('sys', 'user', IMAGES, prefs))
            .rejects.toThrow(/Unknown model/);
    });
});

describe('heuristic-audit routing authority', () => {
    it("routes 'heuristic-audit' to the evidence tier (vision-capable frontier), NOT the schema/flash tier that plain 'audit' (tech-audit) belongs to", () => {
        const heuristic = artifactModelFor('heuristic-audit');
        const techAudit = artifactModelFor('audit');
        expect(MODEL_REGISTRY[heuristic]?.vision).toBe(true);
        expect(techAudit).toBe('gemini-3.5-flash');           // schema tier unchanged
        expect(heuristic).not.toBe('gemini-3.5-flash');       // evidence tier, never flash
    });
});
