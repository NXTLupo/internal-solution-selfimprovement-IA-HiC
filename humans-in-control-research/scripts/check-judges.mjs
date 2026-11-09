#!/usr/bin/env node
// check-judges.mjs - 2026-10-30 (plan harness-capability-curve-uplift, WS-2 E5)
// Fails when evals/judges.json lets an UNCALIBRATED LLM judge block (kind=llm, blocking=true,
// human_agreement missing or below n>=30 / kappa>=0.4), when a judge lacks a threshold or
// version, or when the embedded defaults in services/judgeRegistry.ts name a judge the file
// does not (the two must agree).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const file = path.join(root, 'evals', 'judges.json');
if (!fs.existsSync(file)) { console.error('[check:judges] evals/judges.json missing'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
const judges = Array.isArray(data.judges) ? data.judges : [];
const problems = [];
for (const j of judges) {
    if (!j.id) { problems.push('a judge has no id'); continue; }
    if (!['deterministic', 'llm', 'human'].includes(j.kind)) problems.push(`${j.id}: kind must be deterministic|llm|human`);
    if (typeof j.threshold !== 'number') problems.push(`${j.id}: threshold missing`);
    if (!j.version) problems.push(`${j.id}: version missing`);
    if (j.kind === 'llm' && j.blocking) {
        const h = j.human_agreement;
        if (!h || !(h.n >= 30) || !(h.kappa >= 0.4)) problems.push(`${j.id}: an LLM judge may not block until calibrated (n>=30, kappa>=0.4); has ${h ? `n=${h.n} kappa=${h.kappa}` : 'no human_agreement'}`);
    }
}
// embedded defaults must be a subset of the file
const tsSrc = fs.readFileSync(path.join(root, 'services', 'judgeRegistry.ts'), 'utf-8');
const embedded = Array.from(tsSrc.matchAll(/\{\s*id:\s*'([^']+)'/g)).map(m => m[1]);
const ids = new Set(judges.map(j => j.id));
for (const id of embedded) if (!ids.has(id)) problems.push(`embedded default '${id}' is not in evals/judges.json`);
if (problems.length) { console.error('[check:judges] FAIL\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`[check:judges] PASS: ${judges.length} judges; ${judges.filter(j => j.kind === 'llm').length} LLM judges, none blocking without calibration`);
