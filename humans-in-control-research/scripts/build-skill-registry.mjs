#!/usr/bin/env node
/**
 * build-skill-registry.mjs - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift, WS-A A1)
 *
 * Writes the two generated files from the SKILL.md frontmatter:
 *   hic-workspace/skill-registry.json  - every package; the file research-mcp, the platform agent and
 *                                        NXT-Agency mount (A4)
 *   hic-workspace/skill-manifest.json  - the runtime view the SPA's skill loader reads
 *
 * Usage:
 *   node scripts/build-skill-registry.mjs           # write both files
 *   node scripts/build-skill-registry.mjs --check   # exit 1 when either file differs from a fresh build
 *
 * `check:skills` runs the same comparison, so a hand edit to the manifest fails the gate: edit the
 * skill's frontmatter and rebuild instead.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { buildRegistry, manifestView, stableJson, REGISTRY_PATH, MANIFEST_PATH, DEFAULT_SKILLS_ROOT } from './skill-registry-lib.mjs';

const check = process.argv.includes('--check');
const root = process.env.HIC_SKILLS_ROOT || DEFAULT_SKILLS_ROOT;
const registry = buildRegistry(root);
const files = [
    [REGISTRY_PATH, stableJson(registry)],
    [MANIFEST_PATH, stableJson(manifestView(registry))],
];

let drift = 0;
for (const [path, text] of files) {
    const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : '';
    if (current === text) { console.log(`[skill-registry] up to date: ${path}`); continue; }
    if (check) { drift++; console.error(`[skill-registry] DRIFT: ${path} differs from a fresh build (run npm run build:skills)`); continue; }
    writeFileSync(path, text, 'utf8');
    console.log(`[skill-registry] wrote ${path}`);
}
const view = manifestView(registry);
console.log(`[skill-registry] ${registry.count} skill(s); ${view.length} in the runtime manifest; ${registry.skills.filter(s => s.status === 'dormant').length} dormant`);
process.exit(drift ? 1 : 0);
