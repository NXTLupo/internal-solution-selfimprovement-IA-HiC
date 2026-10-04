/**
 * GENERIC-RULES GATE (2026-10-02, plans/hic-uplift-handoff-2026-10-02.md step 5): the deliverable rule engine,
 * the ledger, the coverage contracts and the PRD compile/export must hold for ANY research project, so their
 * non-test code may not name an engagement. Two checks over the rule-engine files:
 *   1. no engagement slug that exists on disk (hic-workspace/wiki/engagements/<slug>) appears verbatim;
 *   2. no client-identifying literal from scripts/engagement-literals.deny (client names, people, document
 *      names) appears (case-insensitive unless the entry is prefixed with "cs:").
 * Sector vocabulary used to pick a legal regime (FERPA for student records, HIPAA for patient data) is
 * generic by sector and is not on the deny list. Exit 1 on any hit.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = resolve(HERE, '..');

const FILES = [
    'services/deliverableRules.ts', 'services/deliverableCoverage.ts', 'services/coverageRecheck.ts', 'services/themeRelevanceGate.ts',
    'services/engagementLedger.ts', 'services/prdScopeLedger.ts', 'services/prdRulesContract.ts', 'services/prdCompiler.ts',
    'services/prdRootSynthesis.ts', 'services/prdAir.ts', 'services/prdInputs.ts', 'services/prdXlsx.ts',
    'proxy/prd_xlsx.py', 'proxy/evidence_hygiene.py',
];

const slugsDir = join(ROOT, 'hic-workspace', 'wiki', 'engagements');
const slugs = existsSync(slugsDir) ? readdirSync(slugsDir).filter(s => s.length >= 20 && !s.endsWith('.md')) : [];
const denyFile = join(HERE, 'engagement-literals.deny');
const deny = existsSync(denyFile)
    ? readFileSync(denyFile, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    : [];
const patterns = deny.map(d => d.startsWith('cs:') ? new RegExp(`\\b${d.slice(3)}\\b`) : new RegExp(`\\b${d}\\b`, 'i'));

const hits = [];
for (const rel of FILES) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) continue;
    readFileSync(full, 'utf8').split(/\r?\n/).forEach((line, i) => {
        for (const s of slugs) if (line.includes(s)) hits.push(`${rel}:${i + 1}: engagement slug "${s}"`);
        patterns.forEach((re, k) => { if (re.test(line)) hits.push(`${rel}:${i + 1}: client literal "${deny[k]}": ${line.trim().slice(0, 120)}`); });
    });
}

if (hits.length) {
    console.error(`check:generic-rules FAILED: ${hits.length} engagement-specific literal(s) in rule-engine code`);
    for (const h of hits) console.error(`  ${h}`);
    process.exit(1);
}
console.log(`check:generic-rules PASS: ${FILES.length} rule-engine files, ${slugs.length} engagement slugs and ${deny.length} client literals checked`);
