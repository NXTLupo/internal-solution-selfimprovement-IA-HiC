#!/usr/bin/env node
// eval-run.mjs - 2026-10-30 (plan harness-capability-curve-uplift, WS-2 E1/E11, WS-5 R2/R4/R7)
// ONE runner for the eval suite (the ADK talk's `adk eval` / web tab / pytest are three
// doors onto one set; here the vitest lane is the engine and this script is the CLI door).
//   node scripts/eval-run.mjs                       replay every case (CI mode, no model)
//   node scripts/eval-run.mjs --mode live --models claude-opus-5-5,gemini-3.5-flash
//   node scripts/eval-run.mjs --promote             move frontier cases with 3 straight passes
//   node scripts/eval-run.mjs --matrix              print the per-model pass matrix from results
//   node scripts/eval-run.mjs --mode live --skill-override deck-composer=path/to/candidate.md
//                                                   generate with a candidate skill installed as the
//                                                   instruction override (SkillOpt pool scoring, R4)
//   node scripts/eval-run.mjs --rescore --hours 24  re-run the deterministic judges over the AIR
//                                                   records of the last N hours; rows go to the event
//                                                   sink, failures to the frontier set (R2)
//   node scripts/eval-run.mjs --mode live --constraint "<rule text>"
//                                                   E4 for one learned constraint: candidate (with the
//                                                   rule injected) vs incumbent on the same cases (R7)
//   --sets regression,frontier   --kinds slides,personas   --hic-workspace <path>
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] || dflt) : dflt; };
const flags = (name) => args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));
const mode = args.includes('--rescore') ? 'rescore' : flag('--mode', 'replay');
const models = flag('--models', mode === 'live' ? 'claude-opus-5-5' : 'replay');
const promote = args.includes('--promote');

if (args.includes('--matrix')) {
    const dir = path.join(ROOT, 'evals', 'results');
    const rows = [];
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) for (const l of fs.readFileSync(path.join(dir, f), 'utf-8').split('\n')) if (l.trim()) { try { rows.push(JSON.parse(l)); } catch { /* skip */ } }
    const byCase = {};
    for (const r of rows) { const c = byCase[r.case_id] || (byCase[r.case_id] = {}); const m = c[r.model] || (c[r.model] = { runs: 0, passes: 0, streak: 0 }); m.runs++; if (r.pass) { m.passes++; m.streak++; } else m.streak = 0; }
    const modelsSeen = Array.from(new Set(rows.map(r => r.model))).sort();
    console.log(['case', ...modelsSeen].join('\t'));
    for (const [cid, per] of Object.entries(byCase)) {
        const saturated = modelsSeen.length && modelsSeen.every(m => (per[m]?.streak || 0) >= 3);
        console.log([cid + (saturated ? ' (saturated)' : ''), ...modelsSeen.map(m => per[m] ? `${per[m].passes}/${per[m].runs}` : '-')].join('\t'));
    }
    fs.writeFileSync(path.join(ROOT, 'evals', 'model-matrix.json'), JSON.stringify({ generated: new Date().toISOString(), models: modelsSeen, cases: byCase }, null, 2));
    process.exit(0);
}

// --skill-override id=path (repeatable): the candidate text rides into the lane as JSON
const overrides = {};
for (const spec of flags('--skill-override')) {
    const eq = spec.indexOf('=');
    if (eq < 1) { console.error(`--skill-override expects id=path, got ${spec}`); process.exit(2); }
    const id = spec.slice(0, eq);
    const p = path.resolve(spec.slice(eq + 1));
    if (!fs.existsSync(p)) { console.error(`--skill-override: ${p} not found`); process.exit(2); }
    overrides[id] = fs.readFileSync(p, 'utf-8');
}
const constraint = flag('--constraint', '');
const env = {
    ...process.env,
    EVAL_MODE: mode === 'rescore' ? 'replay' : mode,
    EVAL_MODELS: models,
    ...(promote ? { EVAL_PROMOTE: '1' } : {}),
    ...(Object.keys(overrides).length ? { EVAL_SKILL_OVERRIDES: JSON.stringify(overrides) } : {}),
    ...(constraint ? { EVAL_CONSTRAINT: constraint } : {}),
    ...(flag('--sets', '') ? { EVAL_SETS: flag('--sets', '') } : {}),
    ...(flag('--kinds', '') ? { EVAL_KINDS: flag('--kinds', '') } : {}),
    ...(mode === 'rescore' ? { EVAL_RESCORE_HOURS: flag('--hours', '24'), EVAL_HIC_WORKSPACE: flag('--hic-workspace', path.join(ROOT, 'hic-workspace')) } : {}),
};
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vitest', 'run', '--config', 'vitest.eval.config.ts'], { cwd: ROOT, env, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
