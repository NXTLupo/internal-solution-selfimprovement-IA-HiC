// 2026-10-01 (plan Stage 5, audit C6/C7/C9/C11): the promotion and regression gates must bite.
//   C9  benchmark.mjs --diff exits 1 without a frozen baseline; regression-obligations.mjs fails first.
//   C6/C7 skillopt-batch.sh refuses to cp without an APPROVE verdict file; --dry-run creates nothing.
//   C11 quality_gate.py is a registered Stop hook; hooks.json and the zero-reference scripts are gone.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const HIC = resolve(__dirname, '..');
const REPO = resolve(HIC, '..');
const read = (rel: string) => readFileSync(join(REPO, rel), 'utf-8');

function node(args: string[], env: Record<string, string> = {}) {
    return spawnSync(process.execPath, args, { cwd: HIC, env: { ...process.env, ...env }, encoding: 'utf-8', timeout: 60_000 });
}
const BASH = process.platform === 'win32'
    ? ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe'].find(existsSync) || 'bash'
    : 'bash';
const bashAvailable = spawnSync(BASH, ['--version'], { encoding: 'utf-8' }).status === 0;
function bash(args: string[], env: Record<string, string> = {}) {
    return spawnSync(BASH, args, { cwd: HIC, env: { ...process.env, ...env }, encoding: 'utf-8', timeout: 60_000 });
}

describe('C9: regression obligations are not vacuous', () => {
    it('benchmark.mjs --diff exits 1 (not 0) when the baseline file is missing', () => {
        const src = read('humans-in-control-research/scripts/benchmark.mjs');
        const diffBlock = src.slice(src.indexOf("if (args.has('--diff'))"));
        expect(diffBlock).toMatch(/if \(!exists\(basePath\)\) \{[^}]*process\.exit\(1\)/);
        expect(diffBlock).not.toMatch(/if \(!exists\(basePath\)\) \{[^}]*process\.exit\(0\)/);
    });

    it('regression-obligations.mjs fails before any obligation when the baseline is absent, and passes the precondition when present', () => {
        const missing = node(['scripts/regression-obligations.mjs', '--skip', 'tsc,vitest,templates,benchmark,proxy'],
            { HIC_REGRESSION_BASELINE: join(HIC, 'hic-workspace', 'eval', 'does-not-exist.json') });
        expect(missing.status).toBe(1);
        expect(missing.stderr + missing.stdout).toMatch(/baseline/i);

        const present = node(['scripts/regression-obligations.mjs', '--skip', 'tsc,vitest,templates,benchmark,proxy']);
        expect(present.status).toBe(0);
        expect(present.stdout).toMatch(/PASS: baseline present/);
    });

    it('the frozen baseline is on disk at the path the obligations read', () => {
        expect(existsSync(join(HIC, 'hic-workspace', 'eval', 'benchmark-baseline.json'))).toBe(true);
    });
});

describe('C6/C7: skillopt-batch.sh promotion gate', () => {
    it('no Task Scheduler artifacts remain; the README names the one scheduler', () => {
        expect(existsSync(join(HIC, 'scripts', 'skillopt-weekly.sh'))).toBe(false);
        expect(existsSync(join(HIC, 'scripts', 'skillopt-weekly.xml'))).toBe(false);
        const readme = read('humans-in-control-research/scripts/README-skillopt.md');
        expect(readme).toMatch(/there is ONE/);
        expect(readme).toMatch(/\/api\/epochs\/run-batch/);
        expect(readme).not.toMatch(/schtasks/);
    });

    it('the script source refuses cp without an APPROVE verdict file and never cps outside promote_candidate', () => {
        const src = read('humans-in-control-research/scripts/skillopt-batch.sh');
        expect(src).toMatch(/verdict_file="\$PROPOSALS_DIR\/\$skill\.verdict\.json"/);
        expect(src).toMatch(/\[ "\$verdict" != "APPROVE" \]/);
        const cpLines = src.split('\n').filter(l => /^\s*cp\s/.test(l));
        expect(cpLines).toHaveLength(1);
    });

    it.skipIf(!bashAvailable)('--dry-run creates no output or proposal directories', () => {
        const base = mkdtempSync(join(tmpdir(), 'skillopt-dry-'));
        try {
            const outDir = join(base, 'out');
            const proposals = join(base, 'proposals');
            const r = bash(['scripts/skillopt-batch.sh', '--dry-run'], {
                OUT_DIR: outDir.replace(/\\/g, '/'), TRAINING_DIR: join(base, 'training').replace(/\\/g, '/'),
                PROPOSALS_ROOT: proposals.replace(/\\/g, '/'), BATCH_ID: 'dry',
            });
            expect(r.status, r.stderr).toBe(0);
            expect(r.stdout).toMatch(/DRY-RUN complete \(no directories created\)/);
            expect(existsSync(outDir)).toBe(false);
            expect(existsSync(proposals)).toBe(false);
        } finally { rmSync(base, { recursive: true, force: true }); }
    });

    it.skipIf(!bashAvailable)('--promote-only refuses without a verdict, refuses on REJECT, copies on APPROVE', () => {
        const base = mkdtempSync(join(tmpdir(), 'skillopt-promote-'));
        try {
            const live = join(base, 'SKILL.md');
            const cand = join(base, 'SKILL.candidate-1.md');
            writeFileSync(live, 'LIVE\n');
            writeFileSync(cand, 'CANDIDATE\n');
            const proposals = join(base, 'proposals');
            mkdirSync(join(proposals, 'b1'), { recursive: true });
            const env = {
                PROPOSALS_ROOT: proposals.replace(/\\/g, '/'), BATCH_ID: 'b1',
            };
            const args = ['scripts/skillopt-batch.sh', '--promote-only', '--skill=persona-architect',
                `--candidate=${cand.replace(/\\/g, '/')}`, `--skill-path=${live.replace(/\\/g, '/')}`];

            const none = bash(args, env);
            expect(none.status).toBe(1);
            expect(none.stdout).toMatch(/PROMOTION REFUSED: no verdict file/);
            expect(readFileSync(live, 'utf-8')).toBe('LIVE\n');

            writeFileSync(join(proposals, 'b1', 'persona-architect.verdict.json'), JSON.stringify({ verdict: 'REJECT', discrimination_before: 1, discrimination_after: 0.4, golden_set_version: 3 }));
            const rejected = bash(args, env);
            expect(rejected.status).toBe(1);
            expect(rejected.stdout).toMatch(/PROMOTION REFUSED: verdict is 'REJECT'/);
            expect(readFileSync(live, 'utf-8')).toBe('LIVE\n');

            writeFileSync(join(proposals, 'b1', 'persona-architect.verdict.json'), JSON.stringify({ verdict: 'APPROVE', discrimination_before: 1, discrimination_after: 1.1, golden_set_version: 3 }));
            const approved = bash(args, env);
            expect(approved.status, approved.stdout + approved.stderr).toBe(0);
            expect(approved.stdout).toMatch(/PROMOTED to/);
            expect(readFileSync(live, 'utf-8')).toBe('CANDIDATE\n');
        } finally { rmSync(base, { recursive: true, force: true }); }
    });
});

describe('C11: one registered quality gate, no dead hook config', () => {
    const settings = JSON.parse(read('.claude/settings.json'));
    const stopCommands: string[] = (settings.hooks.Stop as any[]).flatMap(g => g.hooks.map((h: any) => String(h.command)));

    it('quality_gate.py is a Stop hook with the text-safe scopes and never the AIR-only scopes on a Stop payload', () => {
        const gate = stopCommands.find(c => c.includes('.claude/hooks/quality_gate.py'));
        expect(gate).toBeDefined();
        expect(gate).toMatch(/--scope citations/);
        expect(gate).toMatch(/--scope editorial/);
        expect(gate).not.toMatch(/--scope air\b/);
        expect(gate).not.toMatch(/--scope catalog/);
    });

    it('the still-live Stop hooks are kept and every registered hook script exists on disk', () => {
        expect(stopCommands.some(c => c.includes('dispatch_validators.py'))).toBe(true);
        expect(stopCommands.some(c => c.includes('stop_chat_antislop.py'))).toBe(true);
        expect(stopCommands.some(c => c.includes('hooks/validate_output.py'))).toBe(true);
        const allCommands: string[] = Object.values(settings.hooks as Record<string, any[]>)
            .flatMap(groups => groups.flatMap(g => g.hooks.map((h: any) => String(h.command))));
        for (const cmd of allCommands) {
            const m = /python\s+(\S+\.py)/.exec(cmd);
            expect(m, cmd).not.toBeNull();
            const p = m![1].replace(/^d:\/NXT-HUMANS_AI_CX_WORKBENCH\//i, '');
            expect(existsSync(join(REPO, p)), p).toBe(true);
        }
    });

    it('hooks.json (dead config) and the zero-reference scripts are deleted', () => {
        expect(existsSync(join(REPO, '.claude', 'hooks', 'hooks.json'))).toBe(false);
        for (const f of [
            'air_quality_gate.py', 'precheck_no_custom_scheme_fetch.py', 'precheck_pptx_font_role.py',
            'precheck_spread_push_unbounded.py', 'run_hooks_parallel.py', 'score_artifact.py',
            'validate_budgets.py', 'validate_deliverable_coherence.py', 'validate_minimum_yield.py',
        ]) {
            expect(existsSync(join(REPO, '.claude', 'hooks', 'scripts', f)), f).toBe(false);
        }
    });

    it('every validator the ARCHITECTURE.md contract dispatches still exists', () => {
        const arch = read('.claude/ARCHITECTURE.md');
        const names = Array.from(new Set(Array.from(arch.matchAll(/^\s*-\s+(validate_\w+\.py)\s*$/gm)).map(m => m[1])));
        expect(names.length).toBeGreaterThan(5);
        for (const n of names) expect(existsSync(join(REPO, '.claude', 'hooks', 'scripts', n)), n).toBe(true);
    });
});
