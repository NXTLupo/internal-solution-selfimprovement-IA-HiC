#!/usr/bin/env node
/**
 * check-template-parity.mjs — U5 / D1 template-parity guard (2026-06-02)
 *
 * The export!=preview class of bugs has a structural root cause: a slide template
 * that the WEB renderer (components/SlideCanvas.tsx) can draw but the PPTX exporter
 * (components/slideTemplates/pptx.ts) cannot — or vice versa. When that asymmetry
 * exists, the SPA preview shows a slide the .pptx export silently drops (a blank or
 * missing slide on download). This script makes that asymmetry a LOUD, deterministic
 * failure instead of a surprise in the exported deck.
 *
 * It compares three sources of template IDs:
 *   - canonical:  the discriminated union in components/slideTemplates/types.ts (`template: 'x'`)
 *   - web:        the `case 'x':` arms in components/SlideCanvas.tsx
 *   - pptx:       the `case 'x':` arms (+ section-divider guard) in components/slideTemplates/pptx.ts
 *
 * Exit 0 = parity holds. Exit 1 = a template renders in one path but not the other,
 * or a renderer handles a template the canonical union doesn't declare.
 *
 * Run:  node scripts/check-template-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => { try { return readFileSync(resolve(root, p), 'utf8'); } catch (e) { console.error(`! cannot read ${p}: ${e.message}`); process.exit(2); } };

// canonical: the `| 'x'` names in the `export type SlideTemplate = ...;` union
const typesSrc = read('components/slideTemplates/types.ts');
const unionBlock = (typesSrc.match(/export type SlideTemplate\s*=([\s\S]*?);/) || [, ''])[1];
const canonical = new Set([...unionBlock.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]));
// renderer cases: every `case 'x':` and `template === 'x'` literal
const casesIn = (src) => new Set([
    ...[...src.matchAll(/case\s*'([a-z0-9-]+)'\s*:/g)].map(m => m[1]),
    ...[...src.matchAll(/template\s*===\s*'([a-z0-9-]+)'/g)].map(m => m[1]),
]);
const web = casesIn(read('components/SlideCanvas.tsx'));
const pptx = casesIn(read('components/slideTemplates/pptx.ts'));

const diff = (a, b) => [...a].filter(x => !b.has(x)).sort();
const problems = [];

const webMissing = diff(canonical, web);
const pptxMissing = diff(canonical, pptx);
const webExtra = diff(web, canonical);
const pptxExtra = diff(pptx, canonical);
const webXorPptx = [...new Set([...diff(web, pptx), ...diff(pptx, web)])].sort();

if (webMissing.length) problems.push(`Declared but NOT rendered on web (SlideCanvas.tsx): ${webMissing.join(', ')}`);
if (pptxMissing.length) problems.push(`Declared but NOT exported to PPTX (pptx.ts) -> blank/missing slide on export: ${pptxMissing.join(', ')}`);
if (webExtra.length) problems.push(`Web renders a template not in the canonical union (types.ts): ${webExtra.join(', ')}`);
if (pptxExtra.length) problems.push(`PPTX exports a template not in the canonical union (types.ts): ${pptxExtra.join(', ')}`);
if (webXorPptx.length) problems.push(`Template handled by web XOR pptx (the export!=preview class): ${webXorPptx.join(', ')}`);

console.log(`[template-parity] canonical=${canonical.size} web=${web.size} pptx=${pptx.size}`);
if (problems.length === 0) {
    console.log('[template-parity] PASS — web and pptx renderers are in parity with the canonical union.');
    process.exit(0);
}
console.error('[template-parity] FAIL:');
for (const p of problems) console.error('  - ' + p);
process.exit(1);
