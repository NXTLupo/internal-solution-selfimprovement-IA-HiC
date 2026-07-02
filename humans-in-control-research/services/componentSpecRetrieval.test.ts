// E5 guard tests (artifact-total-elevation-2026-07-02): component-spec retrieval wires the
// figma-node-map registry (chunked since 6/23, previously read by NOTHING at generation time)
// into slide-bearing artifact prompts via the existing nxtDesignSystemRules carrier.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('E5 component-spec retrieval wiring (source asserts)', () => {
    const chat = src('services/corpusChatService.ts');

    it('fetchComponentSpecBlock reads the registry page and is injected for artifact messages', () => {
        expect(chat).toContain('fetchComponentSpecBlock');
        expect(chat).toContain('brand/figma-node-map.md');
        expect(chat).toContain('COMPONENT REGISTRY SPECS');
        // injection is gated on artifact-targeting messages and rides the existing carrier
        expect(chat).toMatch(/messageTargetsArtifact\(userMessage\)[\s\S]{0,400}fetchComponentSpecBlock/);
        expect(chat).toMatch(/nxtDesignSystemRules:\s*\(context\.nxtDesignSystemRules \|\| ''\) \+ specBlock/);
    });

    it('cross-artifact registry tables contribute only matching rows (budget discipline)', () => {
        expect(chat).toMatch(/component registry\|image-slot registry/);
        expect(chat).toContain("keys.some(k => l.toLowerCase().includes(k))");
    });

    it('the block is capped and fail-open', () => {
        expect(chat).toContain('component-spec block truncated');
        expect(chat).toMatch(/catch \{ return ''; \}/);
    });
});
