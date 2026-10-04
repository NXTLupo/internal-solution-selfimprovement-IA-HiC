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
//   0. frozen baseline present — hic-workspace/eval/benchmark-baseline.json MUST exist
//      (2026-10-01, audit C9: without it obligation 4 was vacuous; now it FAILS, not skippable)
//   1. tsc --noEmit          — the type gate (standing rule)
//   2. vitest run            — unit suite
//   3. check:templates       — web.tsx <-> pptx.ts template-set parity
//   4. benchmark.mjs --diff  — frozen-baseline phase benchmarks (exit 1 on regression or no baseline)
//   5. proxy syntax gate     — python ast.parse over proxy/app.py
//
// Usage: node scripts/regression-obligations.mjs [--skip tsc,vitest,...]
// Env:   HIC_REGRESSION_BASELINE=<path>  override the baseline path (tests only)
// Exit: 0 all obligations green; 1 any failed (the change may NOT promote).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = process.env.HIC_REGRESSION_BASELINE
    || path.join(ROOT, 'hic-workspace', 'eval', 'benchmark-baseline.json');
const skip = new Set(
    (process.argv.includes('--skip')
        ? (process.argv[process.argv.indexOf('--skip') + 1] || '')
        : '').split(',').map(s => s.trim()).filter(Boolean)
);

// Obligation 0 is a precondition, not a step: no baseline means the benchmark obligation cannot
// measure anything, so the whole suite fails before spending minutes on tsc/vitest.
process.stdout.write(`\n=== OBLIGATION 0: frozen benchmark baseline present (${path.relative(ROOT, BASELINE)}) ===\n`);
if (!fs.existsSync(BASELINE)) {
    console.error(`FAIL: ${BASELINE} is missing. Freeze it with \`node scripts/benchmark.mjs --baseline\` and commit it. The change may NOT promote.`);
    process.exit(1);
}
console.log('PASS: baseline present');

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
console.log('  PASS     baseline');
for (const r of results) console.log(`  ${r.status.padEnd(8)} ${r.id}`);
if (failed) {
    console.error(`\n${failed} obligation(s) FAILED. The change may NOT promote (SkillOpt / epoch / routing repoint blocked).`);
    process.exit(1);
}
console.log('\nAll obligations green. The change may proceed to its own evidence gate.');
