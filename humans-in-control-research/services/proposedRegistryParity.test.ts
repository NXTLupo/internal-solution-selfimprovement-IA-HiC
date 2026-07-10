/**
 * proposedRegistryParity.test.ts (WS-2d, plans/slides-strategic-visual-uplift-2026-07-09.md)
 *
 * THE three-way parity gate for the proposed-render registry twins (binding audit H2/H4:
 * the wiki table drifted 13 patterns behind code with nothing to catch it):
 *   1. services/proposedRenderRegistry.ts  (the runtime mirror - the SOURCE)
 *   2. proxy/proto_partials.py REGISTRY    (the token-bound partial renderers)
 *   3. wiki/brand/figma-node-map.md        (the manifest-chunked grounding table,
 *                                           REGENERATED from the TS source - never hand-edited)
 * Any pattern present in one and missing in another fails CI, both directions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROPOSED_RENDER_REGISTRY } from './proposedRenderRegistry';

const ROOT = join(__dirname, '..');

describe('proposed-render registry three-way parity', () => {
    const tsPatterns = new Set(PROPOSED_RENDER_REGISTRY.map(e => e.pattern));

    it('proto_partials.py REGISTRY matches the TS mirror exactly, both directions', () => {
        const py = readFileSync(join(ROOT, 'proxy', 'proto_partials.py'), 'utf-8');
        const block = py.slice(py.indexOf('REGISTRY: Dict[str, Dict[str, Any]] = {'));
        const pyPatterns = new Set([...block.matchAll(/^\s{4}"([a-z-]+)":\s*\{"node"/gm)].map(m => m[1]));
        const missingInPy = [...tsPatterns].filter(p => !pyPatterns.has(p));
        const missingInTs = [...pyPatterns].filter(p => !tsPatterns.has(p));
        expect(missingInPy, 'patterns in TS mirror but absent from proto_partials').toEqual([]);
        expect(missingInTs, 'patterns in proto_partials but absent from TS mirror').toEqual([]);
    });

    it('the wiki PROPOSED-RENDER table matches the TS mirror exactly, both directions', () => {
        const wiki = readFileSync(join(ROOT, 'hic-workspace', 'wiki', 'brand', 'figma-node-map.md'), 'utf-8');
        const section = wiki.slice(wiki.indexOf('## PROPOSED-RENDER REGISTRY'));
        const tableEnd = section.indexOf('\n\n', section.indexOf('| pattern | node |'));
        const table = section.slice(0, tableEnd);
        const wikiPatterns = new Set([...table.matchAll(/^\| ([a-z-]+) \| [\d:]+ \|/gm)].map(m => m[1]));
        const missingInWiki = [...tsPatterns].filter(p => !wikiPatterns.has(p));
        const missingInTs = [...wikiPatterns].filter(p => !tsPatterns.has(p));
        expect(missingInWiki, 'patterns missing from the wiki table (regenerate it from the TS source)').toEqual([]);
        expect(missingInTs, 'stale wiki rows not in the TS mirror').toEqual([]);
    });

    it('node ids agree between the TS mirror and the wiki table', () => {
        const wiki = readFileSync(join(ROOT, 'hic-workspace', 'wiki', 'brand', 'figma-node-map.md'), 'utf-8');
        const section = wiki.slice(wiki.indexOf('## PROPOSED-RENDER REGISTRY'));
        const wikiNodes = new Map([...section.matchAll(/^\| ([a-z-]+) \| ([\d:]+) \|/gm)].map(m => [m[1], m[2]]));
        for (const e of PROPOSED_RENDER_REGISTRY) {
            expect(wikiNodes.get(e.pattern), `wiki node for ${e.pattern}`).toBe(e.node);
        }
    });
});
