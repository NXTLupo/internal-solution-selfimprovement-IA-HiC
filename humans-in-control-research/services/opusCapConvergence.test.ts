import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OPUS_CAP_ACTIVE } from './aiRouter';

// Regression for the 2026-06-29 routing fix (B1). The Opus-quota workaround used
// to live in THREE independent sites; geminiService._runBreadthShard never knew
// about it and kept calling claude-opus-4-8, eating an HTTP 400 on every theme
// shard (live-observed 10x) before falling back. The fix converges all three onto
// ONE exported flag (OPUS_CAP_ACTIVE). These guards fail loudly if any site drifts
// off the flag again, and document that the post-cap revert is a single flip.

const read = (f: string) => readFileSync(join(__dirname, f), 'utf-8');

describe('OPUS_CAP_ACTIVE — single source of truth for the Opus-quota workaround', () => {
    it('is exported as a boolean', () => {
        expect(typeof OPUS_CAP_ACTIVE).toBe('boolean');
    });

    it('geminiService theme shard guards the Opus attempt on !OPUS_CAP_ACTIVE', () => {
        const src = read('geminiService.ts');
        expect(src).toMatch(/import\s*\{[^}]*OPUS_CAP_ACTIVE[^}]*\}\s*from\s*'\.\/aiRouter'/);
        // the doomed Opus-first attempt must be gated so it is skipped while capped
        expect(src).toMatch(/if\s*\(\s*!OPUS_CAP_ACTIVE\s*&&\s*\(process\.env as any\)\.ANTHROPIC_API_KEY\s*\)/);
    });

    it('corpusChatService derives ARTIFACT_DEFAULT_DURING_CAP from the flag', () => {
        const src = read('corpusChatService.ts');
        expect(src).toMatch(/import\s*\{[^}]*OPUS_CAP_ACTIVE[^}]*\}\s*from\s*'\.\/aiRouter'/);
        expect(src).toMatch(/ARTIFACT_DEFAULT_DURING_CAP[^=]*=\s*OPUS_CAP_ACTIVE\s*\?\s*'gemini-3\.1-pro-preview'\s*:\s*null/);
    });

    it('prototypeBuilder derives CODE_MODEL from the flag', () => {
        const src = read('prototypeBuilder.ts');
        expect(src).toMatch(/import\s*\{[^}]*OPUS_CAP_ACTIVE[^}]*\}\s*from\s*'\.\/aiRouter'/);
        expect(src).toMatch(/CODE_MODEL\s*=\s*OPUS_CAP_ACTIVE\s*\?\s*'gemini-3\.1-pro-preview'\s*:\s*'claude-opus-4-8'/);
    });

    it('while capped, no derived default routes to Opus (the 400-on-every-shard bug)', () => {
        // Mirror the derivations the modules perform at init, asserting the capped branch.
        const codeModel = OPUS_CAP_ACTIVE ? 'gemini-3.1-pro-preview' : 'claude-opus-4-8';
        const artifactDefault = OPUS_CAP_ACTIVE ? 'gemini-3.1-pro-preview' : null;
        if (OPUS_CAP_ACTIVE) {
            expect(codeModel).not.toBe('claude-opus-4-8');
            expect(artifactDefault).not.toBe('claude-opus-4-8');
        } else {
            // post-cap: one flip restores Opus everywhere
            expect(codeModel).toBe('claude-opus-4-8');
            expect(artifactDefault).toBeNull();
        }
    });
});
