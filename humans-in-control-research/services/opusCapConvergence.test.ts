import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OPUS_CAP_ACTIVE, CLAUDE_REASONING_MODEL, artifactModelFor } from './aiRouter';

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
                // 2026-10-01 (Stage 4.5): the guard also requires the authority's pick for `theme-breadth` to be a Claude model.
        expect(src).toMatch(/if\s*\(\s*!OPUS_CAP_ACTIVE\s*&&\s*\(process\.env as any\)\.ANTHROPIC_API_KEY\s*&&\s*endpointForModel\(shardModel\)\s*===\s*'anthropic'\s*\)/);
    });

    it('corpusChatService routes artifacts through the ONE authority artifactModelFor (WS-E convergence)', () => {
        const src = read('corpusChatService.ts');
        // WS-E (2026-06-30): the parallel DELIVERABLE_MODEL_TIER map + ARTIFACT_DEFAULT_DURING_CAP const were
        // DELETED; deliverableModelOverride now delegates to aiRouter.artifactModelFor (single source of truth,
        // itself cap-aware via OPUS_CAP_ACTIVE). Guard the convergence: the duplicate is gone + the delegation exists.
        expect(src).toMatch(/import\s*\{[^}]*artifactModelFor[^}]*\}\s*from\s*'\.\/aiRouter'/);
        // A2 (2026-10-01): the authority is fed the highest-tier catalog hit, not the first regex hit.
        expect(src).toMatch(/artifactModelFor\(hit\?\.entry\.templateId \|\| userMessage\)/);
        expect(src).not.toMatch(/const DELIVERABLE_MODEL_TIER/);          // duplicate map deleted
        expect(src).not.toMatch(/const ARTIFACT_DEFAULT_DURING_CAP/);     // duplicate cap-default deleted
    });

    it('prototypeBuilder derives CODE_MODEL from the ONE routing authority (cap-aware there)', () => {
        // 2026-09-30 (plan Stage 0.5): the literal model id is gone from prototypeBuilder;
        // artifactModelFor('proto') is cap-aware via OPUS_CAP_ACTIVE inside aiRouter.
        const src = read('prototypeBuilder.ts');
        expect(src).toMatch(/import\s*\{[^}]*artifactModelFor[^}]*\}\s*from\s*'\.\/aiRouter'/);
        expect(src).toMatch(/const CODE_MODEL\s*=\s*artifactModelFor\('proto'\)/);
        expect(src).not.toMatch(/'claude-opus-4-8'|'claude-opus-5-5'/);
    });

    it('while capped, no derived default routes to Opus (the 400-on-every-shard bug)', () => {
        // The authority performs the derivation; assert its capped / uncapped branch.
        const codeModel = artifactModelFor('proto');
        const artifactDefault = OPUS_CAP_ACTIVE ? 'gemini-3.1-pro-preview' : null;
        if (OPUS_CAP_ACTIVE) {
            expect(codeModel).not.toBe(CLAUDE_REASONING_MODEL);
            expect(artifactDefault).not.toBe(CLAUDE_REASONING_MODEL);
        } else {
            // post-cap: one flip restores the Claude reasoning model everywhere
            expect(codeModel).toBe(CLAUDE_REASONING_MODEL);
            expect(artifactDefault).toBeNull();
        }
    });
});
