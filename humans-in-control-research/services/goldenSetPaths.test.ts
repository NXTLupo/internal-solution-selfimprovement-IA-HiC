// 2026-10-01 (plan Stage 0.4, audit C1): the frozen golden set must point at files that
// exist. v2 registered 17 exemplars under a deleted directory and the held-out gate scored
// zero of them while reporting "frozen". This test fails the build the moment a registered
// path goes missing, so the gate can never silently run on nothing again.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GOLDEN = join(ROOT, 'hic-workspace', 'wiki', 'eval', 'golden-set.json');

describe('golden set (held-out gate fixture)', () => {
    const g = JSON.parse(readFileSync(GOLDEN, 'utf8'));
    const registered: Array<{ deliverable: string; html_twin: string }> = g.tiers.positive_exemplars.registered;

    it('registers at least ten positive exemplars across the catalog kinds', () => {
        expect(registered.length).toBeGreaterThanOrEqual(10);
        const kinds = new Set(registered.map(r => r.deliverable));
        for (const k of ['prd', 'personas', 'journey', 'gap', 'recs', 'roadmap']) expect(kinds.has(k), k).toBe(true);
    });

    it('every registered exemplar path exists on disk', () => {
        const missing = registered.filter(r => !existsSync(join(ROOT, r.html_twin))).map(r => r.html_twin);
        expect(missing, 'regenerate with scripts/eval/build-*-slides-html.py or fix golden-set.json').toEqual([]);
    });

    it('is frozen with a date and a version', () => {
        expect(typeof g.frozen_at).toBe('string');
        expect(g.version).toBeGreaterThanOrEqual(3);
    });
});
