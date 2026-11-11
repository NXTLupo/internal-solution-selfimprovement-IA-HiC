// 2026-09-30 (plan Stage 0.5.1) - the lint that keeps the model swap durable.
// A Claude model id string may appear ONLY in the files that own it. Every other
// call site resolves through aiRouter (artifactModelFor / CLAUDE_REASONING_MODEL /
// CLAUDE_STRUCTURED_MODEL), so the next swap is one line, not 66. 2026-10-01: the
// live `#prd` run showed the auto-routing strip still SAYING "Opus 4.8" after the id
// had moved, so user-facing display strings are linted too (use CLAUDE_REASONING_LABEL).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['services', 'components', 'design-desk', 'hooks'];
const SCAN_FILES = ['App.tsx', 'index.tsx', 'types.ts'];
/** Files that legitimately carry Claude model id literals or the old display name. */
const ALLOWLIST = new Set<string>([
    'services/claudeModelPolicy.ts',     // THE owner of the ids and the label
    'services/aiRouter.ts',              // registry entries (incl. sunset back-compat)
    'services/costMeter.ts',             // price table + normalizer + display names
    'services/corpusChatService.ts',     // ChatModel union keeps the sunset id for stored picker values
    'services/criticDispatcher.ts',      // sonnet / haiku tier ids (not the reasoning model)
    'services/criticReviseLoop.ts',      // sonnet / haiku tier ids (not the reasoning model)
    'services/narrativeComposer.ts',     // #presentation fallback tier (audit A8, Stage 6 scope)
    'services/seatMatrix.ts',            // 2026-11-11 IA Phase 0: the owner's seat matrix names each seat's target id; pinned to proxy/model_registry.py
]);
const CLAUDE_ID_RE = /['"`]claude-(?:opus|sonnet|haiku|fable|mythos)-\d[\w.-]*['"`]/g;
const REASONING_ID_RE = /['"`]claude-opus-(?:4-8|5-5)['"`]/g;
// A quoted prose string that names the OLD reasoning model. Tier-name keys such as
// 'opus-4.8' (the skills' invocation_model vocabulary) do not match: no space, lower case.
const OLD_LABEL_RE = /['"`][^'"`\n]*\bOpus 4\.8\b[^'"`\n]*['"`]/g;

function walk(dir: string, out: string[]): void {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) {
            if (name === 'node_modules' || name === '__e2e__' || name === '__fixtures__') continue;
            walk(p, out);
        } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
            out.push(p);
        }
    }
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function offendersFor(files: string[], re: RegExp): string[] {
    const out: string[] = [];
    for (const f of files) {
        const rel = relative(ROOT, f).replace(/\\/g, '/');
        if (ALLOWLIST.has(rel)) continue;
        const src = stripComments(readFileSync(f, 'utf8'));
        const hits = src.match(re);
        if (hits) out.push(`${rel}: ${[...new Set(hits)].slice(0, 3).join(' | ')}`);
    }
    return out;
}

describe('model id literals (plan Stage 0.5.1 lint)', () => {
    const files: string[] = [];
    for (const d of SCAN_DIRS) { try { walk(join(ROOT, d), files); } catch { /* dir absent */ } }
    for (const f of SCAN_FILES) { try { statSync(join(ROOT, f)); files.push(join(ROOT, f)); } catch { /* absent */ } }

    it('the Claude REASONING model id appears only in its owner files', () => {
        const offenders = offendersFor(files, REASONING_ID_RE);
        expect(offenders, 'route through aiRouter instead:\n' + offenders.join('\n')).toEqual([]);
    });

    it('no user-facing display string names the old reasoning model outside the owner files', () => {
        const offenders = offendersFor(files, OLD_LABEL_RE);
        expect(offenders, 'use CLAUDE_REASONING_LABEL from aiRouter instead:\n' + offenders.join('\n')).toEqual([]);
    });

    it('no file outside the allowlist hardcodes ANY Claude model id (report, not yet blocking for sonnet/haiku tiers)', () => {
        const offenders = offendersFor(files, CLAUDE_ID_RE);
        // Stage 6 of the plan (vocabulary convergence) drives this to zero; until then the
        // reasoning-model check above is the blocking one and this stays informational.
        if (offenders.length) console.warn('[modelIdLiterals] non-reasoning Claude ids outside the allowlist:\n' + offenders.join('\n'));
        expect(Array.isArray(offenders)).toBe(true);
    });
});
