#!/usr/bin/env node
// check-bundle-secrets.mjs - 2026-10-30 (plan harness-capability-curve-uplift, WS-0 S1)
//
// Fails when a provider-key-shaped string appears anywhere under dist/. Before this
// gate the Vite `define` block compiled GEMINI/ANTHROPIC/OPENAI keys into the bundle.
// Runs in the Dockerfile after `npm run build` and in `check:all`.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.cwd(), 'dist');
if (!fs.existsSync(dist)) {
    console.log('[check:bundle-secrets] no dist/ directory; nothing to scan');
    process.exit(0);
}

const PATTERNS = [
    { name: 'google api key', re: /AIza[0-9A-Za-z_-]{30,}/g },
    { name: 'anthropic key', re: /sk-ant-[0-9A-Za-z_-]{20,}/g },
    { name: 'openai key', re: /sk-proj-[0-9A-Za-z_-]{20,}/g },
    { name: 'openai legacy key', re: /\bsk-[0-9A-Za-z]{32,}\b/g },
];

function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walk(p);
        else if (/\.(js|mjs|css|html|map|json|txt)$/i.test(entry.name)) yield p;
    }
}

let hits = 0;
for (const file of walk(dist)) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const { name, re } of PATTERNS) {
        const found = text.match(re);
        if (found) {
            hits += found.length;
            console.error(`[check:bundle-secrets] ${name} x${found.length} in ${path.relative(process.cwd(), file)} (value redacted)`);
        }
    }
}
if (hits) {
    console.error(`[check:bundle-secrets] FAIL: ${hits} key-shaped string(s) in dist/. Provider keys must never enter the browser bundle.`);
    process.exit(1);
}
console.log('[check:bundle-secrets] PASS: no provider-key-shaped strings in dist/');
