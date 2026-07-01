import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// WS-G(schema) regression guard (2026-06-30). The manifest concept-graph fields (concepts +
// related_chunks) must stay emitted by the Python chunker AND parsed/surfaced by the TS resolver
// (the two-parser contract). Source-level asserts (style of opusCapConvergence).

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');

describe('WS-G(schema): manifest concept graph fields', () => {
    it('wiki_chunker emits concepts + intra-doc related_chunks', () => {
        const py = read('proxy/wiki_chunker.py');
        expect(py).toMatch(/def _concept_extract/);
        expect(py).toMatch(/"concepts": _concept_extract/);
        expect(py, 'intra-doc concept adjacency').toMatch(/related_chunks/);
        expect(py, 'serialized').toMatch(/lines\.append\(f"    concepts:/);
    });

    it('wikiPointerResolver parses + surfaces concepts + relatedChunks on ResolvedChunk', () => {
        const ts = read('services/wikiPointerResolver.ts');
        expect(ts).toMatch(/startsWith\('    concepts:'\)/);
        expect(ts).toMatch(/related_chunks/);
        expect(ts, 'ResolvedChunk carries the fields').toMatch(/concepts\?:\s*string\[\]/);
        expect(ts).toMatch(/relatedChunks\?:\s*string\[\]/);
    });

    it('AGENTS.md documents the chunk frontmatter contract', () => {
        const agents = read('hic-workspace/AGENTS.md');
        expect(agents).toMatch(/Chunk Frontmatter Contract/);
        expect(agents).toMatch(/concepts/);
        expect(agents).toMatch(/related_chunks/);
    });

    // WS-G(traversal): the concept graph FEEDS retrieval - pickChunksForPrompt admits 1-hop
    // concept-adjacent neighbors of keyword-matched chunks (below matches, above dropped).
    it('pickChunksForPrompt seeds retrieval from the concept graph', () => {
        const cr = read('services/chunkRetrieval.ts');
        expect(cr).toMatch(/_conceptNeighbors/);
        expect(cr).toMatch(/CONCEPT_ADJ_SCORE/);
        expect(cr, 'follows related_chunks edges of matched chunks').toMatch(/relatedChunks/);
    });
});
