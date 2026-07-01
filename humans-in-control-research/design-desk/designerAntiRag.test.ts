import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// WS-B regression guard (2026-06-30). The Designer Desk is anti-RAG (manifest-first) via
// DesignDeskChat.buildPromptCorpusGrounded, and WS-B added pointer resolution on Designer OUTPUT so the
// [path#cN] pointers the model cites resolve to real named sources (WS-A) instead of leaking. These
// source-level guards fail loudly if either property is removed. (Same style as opusCapConvergence.test.ts.)

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf-8');

describe('WS-B: Designer Desk anti-RAG (manifest-first) + output pointer resolution', () => {
    it('buildPromptCorpusGrounded retrieves manifest chunks and LEADS with them (not bulk)', () => {
        const src = read('DesignDeskChat.tsx');
        expect(src).toMatch(/buildPromptCorpusGrounded/);
        expect(src, 'manifest chunk retrieval present').toMatch(/pickChunksForPrompt\(/);
        expect(src).toMatch(/resolveChunks\(/);
        expect(src).toMatch(/assembleChunkCorpus\(/);
        // manifest evidence LEADS; bulk snapshot is the supplementary tail
        expect(src).toMatch(/PRIMARY EVIDENCE \(manifest chunks, cite by pointer\)/);
    });

    it('both Designer generators call buildPromptCorpusGrounded (no raw bulk-only path)', () => {
        const src = read('DesignDeskChat.tsx');
        const calls = (src.match(/buildPromptCorpusGrounded\(parsed\.cleanPrompt\)/g) || []).length;
        expect(calls, 'both revision + first-gen paths ground via manifest').toBeGreaterThanOrEqual(2);
    });

    it('chatToFreeform resolves manifest pointers on OUTPUT (no leaked pointers)', () => {
        const src = read('services/chatToFreeform.ts');
        expect(src).toMatch(/resolveManifestPointers/);
    });

    it('chatToSlideSpec resolves manifest pointers on OUTPUT (title + text objects)', () => {
        const src = read('services/chatToSlideSpec.ts');
        expect(src).toMatch(/resolveManifestPointers/);
    });
});
