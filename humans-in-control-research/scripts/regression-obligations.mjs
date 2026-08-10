#!/usr/bin/env node
// L2 (sota-elevation plan 2026-08-07): REGRESSION OBLIGATIONS.
// LoopsBench (arXiv 2608.00267): previously-passing obligations stay ENFORCED —
// completed work is regression-tested on every later change, not assumed safe.
// This suite is the standing obligation set for the HiC harness. It MUST run
// green before:
//   (a) any SkillOpt promotion        (wired: skillopt-batch.sh --auto-promote)
//   (b) any epoch-proposer application (epoch-proposer SKILL.md acceptance)
//   (c) any aiRouter routing repoint   (re-tier protocol P2)
//
// Obligations, in order (all deterministic / offline; ~minutes):
//   1. tsc --noEmit          — the type gate (standing rule)
//   2. vitest run            — unit suite
//   3. check:templates       — web.tsx <-> pptx.ts template-set parity
//   4. benchmark.mjs --diff  — frozen-baseline phase benchmarks (exit 1 on regression)
//   5. proxy syntax gate     — python ast.parse over proxy/app.py
//
// Usage: node scripts/regression-obligations.mjs [--skip tsc,vitest,...]
// Exit: 0 all obligations green; 1 any failed (the change may NOT promote).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(
    (process.argv.includes('--skip')
        ? (process.argv[process.argv.indexOf('--skip') + 1] || '')
        : '').split(',').map(s => s.trim()).filter(Boolean)
);

const OBLIGATIONS = [
    { id: 'tsc', label: 'TypeScript gate (tsc --noEmit)', cmd: 'npx', args: ['tsc', '--noEmit'] },
    { id: 'vitest', label: 'Unit suite (vitest run)', cmd: 'npx', args: ['vitest', 'run'] },
    { id: 'templates', label: 'Template parity (check:templates)', cmd: 'node', args: ['scripts/check-template-parity.mjs'] },
    { id: 'benchmark', label: 'Phase benchmarks vs frozen baseline (--diff)', cmd: 'node', args: ['scripts/benchmark.mjs', '--diff'] },
    { id: 'proxy', label: 'Proxy syntax gate (ast.parse proxy modules)', cmd: 'python', args: ['scripts/check-proxy-syntax.py'] },
];

let failed = 0;
const results = [];
for (const ob of OBLIGATIONS) {
    if (skip.has(ob.id)) { results.push({ id: ob.id, status: 'SKIPPED' }); continue; }
    process.stdout.write(`\n=== OBLIGATION: ${ob.label} ===\n`);
    const r = spawnSync(ob.cmd, ob.args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    const ok = r.status === 0;
    if (!ok) failed += 1;
    results.push({ id: ob.id, status: ok ? 'PASS' : 'FAIL', code: r.status });
}

console.log('\n=== REGRESSION OBLIGATIONS SUMMARY ===');
for (const r of results) console.log(`  ${r.status.padEnd(8)} ${r.id}`);
if (failed) {
    console.error(`\n${failed} obligation(s) FAILED. The change may NOT promote (SkillOpt / epoch / routing repoint blocked).`);
    process.exit(1);
}
console.log('\nAll obligations green. The change may proceed to its own evidence gate.');
