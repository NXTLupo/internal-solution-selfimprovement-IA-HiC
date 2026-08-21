#!/usr/bin/env node
/**
 * CONTENT QUALITY GATE (2026-08-21)
 *
 * The runtime chain judges an artifact while it is being made. Nothing judged
 * the artifacts already on disk, so a quality regression could ship and sit
 * there unnoticed until someone opened a deck. deer-flow closes the same loop
 * with `.github/workflows/skill-review-ci.yml`, which reviews the packages
 * changed in a push and fails the build on blocker findings.
 *
 * This is the artifact-side equivalent: walk the most recent AIR records, apply
 * the deterministic prose signal and the banned-phrase list to what actually
 * shipped, and fail on a regression. It reads the same `postChain` block the
 * runtime writes, so a deck whose gates were skipped is visible too.
 *
 * Usage:
 *   node scripts/check-content.mjs                 # last 10 artifacts
 *   node scripts/check-content.mjs --limit 40
 *   node scripts/check-content.mjs --json
 *   node scripts/check-content.mjs --strict        # warnings fail as well
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const HIC_ROOT = resolve(HERE, '..');
const SESSIONS = join(HIC_ROOT, 'hic-workspace', 'sessions');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) || 10 : 10;

/**
 * The phrases most likely to reach a client deck, kept short on purpose: the
 * full 350-entry lexicon lives in slidePostProcessor and runs at generation
 * time. This gate catches what SURVIVED that, which is the interesting set.
 */
const BANNED = [
    'paradigm shift', 'game-changer', 'holistic', 'cutting-edge', 'leverage synergies',
    'seamless', 'actionable insights', 'thought leadership', 'move the needle', 'deep dive',
    'low-hanging fruit', 'delve', 'tapestry', 'meticulous', 'showcase', 'bolster', 'foster',
    'utilize', 'comprehensive', 'multifaceted', 'facilitate', 'pivotal', 'robust',
    'in today\'s rapidly evolving', 'it\'s worth noting', 'needless to say',
    'serves as', 'stands as', 'plays a pivotal role', 'plays a crucial role',
];
/** Format tells that must never survive to a shipped artifact. */
const FORMAT_TELLS = [
    { re: /—/, name: 'em-dash' },
    { re: /oaicite|oai_citation|contentReference|turn\d+search\d+/i, name: 'provider artifact tag' },
    { re: /\bEVIDENCE\s+GAP\b|\bTBD\b|\[needs baseline\]/i, name: 'QA annotation' },
    { re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, name: 'emoji' },
];

const findings = [];
const add = (severity, rule, artifact, message) => findings.push({ severity, rule, artifact, message });

function collectAirFiles() {
    if (!existsSync(SESSIONS)) return [];
    const out = [];
    for (const slug of readdirSync(SESSIONS)) {
        const dir = join(SESSIONS, slug, 'artifacts');
        if (!existsSync(dir)) continue;
        for (const f of readdirSync(dir)) {
            if (!f.endsWith('.air.json')) continue;
            const p = join(dir, f);
            try { out.push({ path: p, slug, name: f, mtime: statSync(p).mtimeMs }); } catch { /* skip */ }
        }
    }
    return out.sort((a, b) => b.mtime - a.mtime).slice(0, LIMIT);
}

/** Sentence split good enough for a cadence measurement. */
const sentences = (text) => text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 3);

function cadenceCV(text) {
    const lens = sentences(text).map(s => s.split(/\s+/).length);
    if (lens.length < 3) return null;
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    if (!mean) return null;
    const variance = lens.reduce((a, l) => a + (l - mean) ** 2, 0) / lens.length;
    return Math.sqrt(variance) / mean;
}

/** Prefer the text the user received; fall back to what the model generated. */
function shippedText(air) {
    const pc = air.postChain;
    if (pc && pc.shippedPayload) {
        try { return JSON.stringify(pc.shippedPayload); } catch { /* fall through */ }
    }
    const p = air.artifactPayload;
    if (typeof p === 'string') return p;
    if (p && typeof p === 'object') return String(p.content || p.html || JSON.stringify(p));
    return '';
}

for (const file of collectAirFiles()) {
    let air;
    try { air = JSON.parse(readFileSync(file.path, 'utf8')); } catch (e) {
        add('error', 'air.unreadable', file.name, `AIR record is not valid JSON: ${e.message}`);
        continue;
    }
    const label = `${file.slug}/${file.name}`;
    const text = shippedText(air);
    if (!text) { add('warning', 'air.no-payload', label, 'no payload text to inspect'); continue; }

    const lower = text.toLowerCase();
    for (const phrase of BANNED) {
        if (lower.includes(phrase.toLowerCase())) {
            add('error', 'content.banned-phrase', label, `shipped text contains "${phrase}"`);
        }
    }
    for (const tell of FORMAT_TELLS) {
        if (tell.re.test(text)) add('error', 'content.format-tell', label, `shipped text contains a ${tell.name}`);
    }

    const cv = cadenceCV(text);
    if (cv !== null && cv < 0.25) {
        add('warning', 'content.uniform-cadence', label, `sentence-length CV ${cv.toFixed(2)} (below 0.25 reads as generated)`);
    }

    // The runtime record itself: a deck whose gates never ran is a blind spot,
    // not a pass.
    if (!air.postChain) {
        add('warning', 'air.no-postchain', label, 'no postChain block: the artifact chain did not record a verdict for this artifact');
    } else {
        const ev = air.postChain.evidence;
        if (ev && Array.isArray(ev.violations) && ev.violations.length) {
            add('warning', 'content.shipped-with-violations', label, `${ev.violations.length} evidence violation(s) survived to the shipped artifact`);
        }
        const dq = air.postChain.deckQuality;
        if (dq && Array.isArray(dq.findings) && dq.findings.length) {
            add('warning', 'content.layout-findings', label, `${dq.findings.length} layout finding(s): ${dq.findings.map(f => f.kind).join(', ')}`);
        }
    }
}

const errors = findings.filter(f => f.severity === 'error');
const warnings = findings.filter(f => f.severity === 'warning');

if (asJson) {
    console.log(JSON.stringify({ schema: 'hic.content-check.v1', inspected: LIMIT, errors: errors.length, warnings: warnings.length, findings }, null, 2));
} else {
    console.log(`[check-content] inspected the ${LIMIT} most recent artifact record(s)`);
    const byArtifact = new Map();
    for (const f of findings) {
        if (!byArtifact.has(f.artifact)) byArtifact.set(f.artifact, []);
        byArtifact.get(f.artifact).push(f);
    }
    for (const [artifact, list] of byArtifact) {
        const errs = list.filter(f => f.severity === 'error').length;
        console.log(`\n  ${artifact}${errs ? `  [${errs} error(s)]` : ''}`);
        for (const f of list) console.log(`    ${f.severity === 'error' ? 'ERROR ' : 'warn  '} ${f.rule}: ${f.message}`);
    }
    console.log(`\n[check-content] ${errors.length} error(s), ${warnings.length} warning(s)`);
}

process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
