#!/usr/bin/env node
/**
 * ORPHAN EXPORT SCAN - Stage 6 gate (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md).
 *
 * "zero exported functions with no callers in services/": this script is the deterministic form of the
 * orphan-code-auditor agent protocol (.claude/agents/orphan-code-auditor.md). It walks services/ and
 * every importer directory of the SPA (App.tsx, components/, design-desk/, hooks/, scripts/, services/),
 * lists every exported VALUE symbol in services/ (function / const / let / class; re-exports resolved
 * one hop), and counts its importers outside its own file and outside test files. A symbol with zero
 * importers is an orphan.
 *
 * Deliberately simple and dependency-free (no TypeScript program): import specifiers are matched by
 * regex, including `import type`, `export { x } from`, and dynamic `await import('./x')` followed by a
 * destructure or a `.name` access anywhere in the same file. Namespace imports (`import * as ns`) count
 * every export of that module as used. A name mentioned in a non-test file other than its own file
 * also counts (loose match, same as the agent's Step 3), so string-dispatched symbols are not false
 * positives. The remaining risk is a false NEGATIVE (a common word), never a false orphan.
 *
 * Exit codes: 0 when zero orphans, 1 otherwise (CI gate). `--json` for machine output,
 * `--allow <file>` for a newline-separated allowlist of `path:symbol` entries that are genuine public
 * API (documented in the allow file; the default allowlist is scripts/orphan-exports.allow).
 *
 * Usage: node scripts/orphan-exports.mjs [--json] [--allow scripts/orphan-exports.allow]
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, extname, posix } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = resolve(HERE, '..');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const allowIdx = args.indexOf('--allow');
const allowPath = allowIdx >= 0 ? resolve(ROOT, args[allowIdx + 1]) : resolve(ROOT, 'scripts', 'orphan-exports.allow');

const SCAN_DIRS = ['services', 'components', 'design-desk', 'hooks', 'scripts'];
const ROOT_FILES = ['App.tsx', 'index.tsx', 'types.ts', 'vite.config.ts'];
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.jsx']);
const SKIP_DIR = new Set(['node_modules', 'dist', '__e2e__', '__fixtures__', '__pycache__']);

function walk(dir, out) {
    for (const name of readdirSync(dir)) {
        if (SKIP_DIR.has(name)) continue;
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) walk(full, out);
        else if (EXT.has(extname(name)) && !name.endsWith('.d.ts')) out.push(full);
    }
    return out;
}

const files = [];
for (const d of SCAN_DIRS) if (existsSync(join(ROOT, d))) walk(join(ROOT, d), files);
for (const f of ROOT_FILES) if (existsSync(join(ROOT, f))) files.push(join(ROOT, f));

const isTest = (f) => /\.(test|spec)\.(ts|tsx|mjs|js)$/.test(f);
const rel = (f) => relative(ROOT, f).split('\\').join('/');
const source = new Map(files.map(f => [f, readFileSync(f, 'utf8')]));

/** Resolve an import specifier from `fromFile` to a scanned file, or null for packages. */
function resolveSpec(fromFile, spec) {
    if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
    const base = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : resolve(dirname(fromFile), spec);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}.js`, join(base, 'index.ts'), join(base, 'index.tsx')];
    for (const c of candidates) if (source.has(c)) return c;
    // allow explicit .ts/.tsx/.js extension already present
    const stripped = base.replace(/\.(js|mjs)$/, '');
    for (const c of [`${stripped}.ts`, `${stripped}.tsx`]) if (source.has(c)) return c;
    return null;
}

// ---- Step 1: exports in services/ (value symbols only) -------------------------------------------
const EXPORT_RES = [
    /^export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm,
    /^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
    /^export\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm,
    /^export\s+enum\s+([A-Za-z_$][\w$]*)/gm,
];
const REEXPORT_RE = /^export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gm;
const EXPORT_LIST_RE = /^export\s*\{([^}]+)\}\s*;?\s*$/gm;

const exportsBySym = new Map(); // key `${file}::${sym}` -> { file, sym, line }
for (const f of files) {
    if (!rel(f).startsWith('services/') || isTest(f)) continue;
    const text = source.get(f);
    for (const re of EXPORT_RES) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null) {
            const line = text.slice(0, m.index).split('\n').length;
            exportsBySym.set(`${f}::${m[1]}`, { file: f, sym: m[1], line });
        }
    }
    // `export { a, b as c }` local lists (value or type; types are filtered out below by heuristic)
    EXPORT_LIST_RE.lastIndex = 0;
    let m;
    while ((m = EXPORT_LIST_RE.exec(text)) !== null) {
        const line = text.slice(0, m.index).split('\n').length;
        for (const part of m[1].split(',')) {
            const seg = part.trim().replace(/^type\s+/, '');
            if (!seg || /^type\s/.test(part.trim())) continue;
            const name = seg.split(/\s+as\s+/).pop().trim();
            if (name) exportsBySym.set(`${f}::${name}`, { file: f, sym: name, line, viaList: true });
        }
    }
}

// ---- Step 2: imports -----------------------------------------------------------------------------
const importersBySym = new Map(); // key -> Set(files)
const nsImportsByFile = new Map(); // target file -> Set(importer files)
const NAMED_IMPORT_RE = /import\s+(type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
const DEFAULT_IMPORT_RE = /import\s+(type\s+)?([A-Za-z_$][\w$]*)\s*(?:,|from)\s*(?:\{[^}]*\}\s*from\s*)?['"]([^'"]+)['"]/g;
const NS_IMPORT_RE = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
const DYN_IMPORT_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function addImporter(target, sym, importer) {
    const key = `${target}::${sym}`;
    if (!importersBySym.has(key)) importersBySym.set(key, new Set());
    importersBySym.get(key).add(importer);
}

for (const f of files) {
    const text = source.get(f);
    let m;
    NAMED_IMPORT_RE.lastIndex = 0;
    while ((m = NAMED_IMPORT_RE.exec(text)) !== null) {
        const target = resolveSpec(f, m[3]);
        if (!target) continue;
        for (const part of m[2].split(',')) {
            const seg = part.trim().replace(/^type\s+/, '');
            if (!seg) continue;
            const name = seg.split(/\s+as\s+/)[0].trim();
            if (name) addImporter(target, name, f);
        }
    }
    REEXPORT_RE.lastIndex = 0;
    while ((m = REEXPORT_RE.exec(text)) !== null) {
        const target = resolveSpec(f, m[2]);
        if (!target) continue;
        for (const part of m[1].split(',')) {
            const seg = part.trim().replace(/^type\s+/, '');
            if (!seg) continue;
            const name = seg.split(/\s+as\s+/)[0].trim();
            if (name) addImporter(target, name, f);
        }
    }
    DEFAULT_IMPORT_RE.lastIndex = 0;
    while ((m = DEFAULT_IMPORT_RE.exec(text)) !== null) {
        const target = resolveSpec(f, m[3]);
        if (target) addImporter(target, 'default', f);
    }
    NS_IMPORT_RE.lastIndex = 0;
    while ((m = NS_IMPORT_RE.exec(text)) !== null) {
        const target = resolveSpec(f, m[2]);
        if (!target) continue;
        if (!nsImportsByFile.has(target)) nsImportsByFile.set(target, new Set());
        nsImportsByFile.get(target).add(f);
    }
    DYN_IMPORT_RE.lastIndex = 0;
    while ((m = DYN_IMPORT_RE.exec(text)) !== null) {
        const target = resolveSpec(f, m[1]);
        if (!target) continue;
        // a dynamic import followed by destructure or member access anywhere in the file: mark every
        // exported symbol of the target that is mentioned by name in this file.
        for (const { file, sym } of exportsBySym.values()) {
            if (file !== target) continue;
            if (new RegExp(`\\b${sym.replace(/\$/g, '\\$')}\\b`).test(text)) addImporter(target, sym, f);
        }
    }
}

// ---- Step 3: classify ----------------------------------------------------------------------------
const allow = new Set();
if (existsSync(allowPath)) {
    for (const raw of readFileSync(allowPath, 'utf8').split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        allow.add(line.split(/\s+/)[0]);
    }
}

const orphans = [];
const used = [];
/** Exports used inside their own file AND imported by a test: live code with a test seam, not dead code. */
const testSeams = [];
const testSources = [...source.entries()].filter(([f]) => isTest(f)).map(([, t]) => t);
for (const { file, sym, line } of exportsBySym.values()) {
    const key = `${file}::${sym}`;
    const importers = new Set([...(importersBySym.get(key) || [])].filter(i => i !== file && !isTest(i)));
    for (const i of nsImportsByFile.get(file) || []) if (i !== file && !isTest(i)) importers.add(i);
    if (importers.size === 0) {
        // loose mention in any other non-test file (string dispatch, template, test fixtures excluded)
        const re = new RegExp(`\\b${sym.replace(/\$/g, '\\$')}\\b`);
        for (const [f, text] of source) {
            if (f === file || isTest(f)) continue;
            if (re.test(text)) { importers.add(f); break; }
        }
    }
    const id = `${rel(file)}:${sym}`;
    if (importers.size === 0 && !allow.has(id)) {
        // 2026-10-02 (handoff step 6, "wire or delete, do not suppress"): a symbol the module itself calls is
        // wired; when a test also imports it, the export is the test's seam. It is reported, never hidden, and
        // never counted as an orphan. A symbol nothing calls (not even its own file) stays an orphan.
        const word = `\\b${sym.replace(/\$/g, '\\$')}\\b`;
        const ownUses = (source.get(file).match(new RegExp(word, 'g')) || []).length;
        const inTest = testSources.some(t => new RegExp(word).test(t));
        if (ownUses > 1 && inTest) testSeams.push({ id, file: rel(file), sym, line });
        else orphans.push({ id, file: rel(file), sym, line });
    }
    else used.push(id);
}
orphans.sort((a, b) => a.id.localeCompare(b.id));

if (asJson) {
    console.log(JSON.stringify({ scanned: files.length, exports: exportsBySym.size, orphans, testSeams }, null, 2));
} else {
    console.log(`orphan-exports: scanned ${files.length} files, ${exportsBySym.size} exported value symbols in services/`);
    console.log(`orphan-exports: ${testSeams.length} test seam(s) (used in their own module and imported by a test; not orphans)`);
    if (orphans.length === 0) console.log('orphan-exports: 0 orphans (every services/ export has a caller outside its own file, or is a test seam over code its module calls)');
    else {
        console.log(`orphan-exports: ${orphans.length} orphan export(s):`);
        for (const o of orphans) console.log(`  ${o.file}:${o.line}  ${o.sym}`);
    }
}
process.exit(orphans.length === 0 ? 0 : 1);
