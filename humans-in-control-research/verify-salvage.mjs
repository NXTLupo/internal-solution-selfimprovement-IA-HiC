/**
 * verify-salvage.mjs — sanity-check the JSON salvage helpers against the
 * actual malformed strings observed in production logs.
 *
 * Run with: node verify-salvage.mjs
 * Exits 1 on any assertion failure so CI / manual test can gate on it.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inline-transpile aiRouter.ts on the fly (we only need tryRepairJson +
// salvage helpers; the rest of the file's imports are unused at this scope).
const aiRouterPath = resolve(__dirname, 'services/aiRouter.ts');
const aiRouterSrc = readFileSync(aiRouterPath, 'utf8');
// Strip the top of the file after the salvage helpers — everything past
// MODEL_REGISTRY pulls type imports we don't need to verify these helpers.
const cutoff = aiRouterSrc.indexOf('// --- MODEL REGISTRY ---');
const slice = cutoff > 0 ? aiRouterSrc.slice(0, cutoff) : aiRouterSrc;
const transpiled = transformSync(slice, {
    loader: 'ts',
    format: 'esm',
    target: 'es2022',
}).code;

// Use a data: URL import so we don't need a separate temp file
const mod = await import(
    'data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64')
);
const { tryRepairJson, salvageJsonArray, salvageJsonObject } = mod;

let pass = 0;
let fail = 0;

function check(label, condition, detail = '') {
    if (condition) {
        console.log(`  PASS  ${label}`);
        pass += 1;
    } else {
        console.log(`  FAIL  ${label}${detail ? '  —  ' + detail : ''}`);
        fail += 1;
    }
}

console.log('\n== salvageJsonArray ==');

// Case 1: exact-shape reproduction of the log error
// Body-aware scoring batch 225-249 failed: "Unexpected token '}', ..."s":}]"
{
    const malformed = `[
        {"i":0,"s":85,"r":"Body discusses Northeastern alumni metrics"},
        {"i":1,"s":72,"r":"Mentions co-op enrollment trends 2024"},
        {"i":2,"s":40,"r":"Tangential — covers MBA placement"},
        {"i":3,"s":}]`;
    const out = salvageJsonArray(malformed);
    check('recovers 3 of 4 objects when last has \"s\":} truncation',
        Array.isArray(out) && out.length === 3,
        `got ${out.length} items`);
    check('preserves field shape (i,s,r) on recovered objects',
        out.every(o => typeof o.i === 'number' && typeof o.s === 'number' && typeof o.r === 'string'),
        JSON.stringify(out[0]));
    check('recovers items in original order',
        out[0]?.i === 0 && out[1]?.i === 1 && out[2]?.i === 2);
}

// Case 2: trailing string truncation mid-value
{
    const malformed = `[
        {"i":0,"s":85,"r":"Northeastern alumni metrics"},
        {"i":1,"s":72,"r":"Co-op enrollment trend`;
    const out = salvageJsonArray(malformed);
    check('recovers 1 well-formed object when value-string is truncated',
        Array.isArray(out) && out.length >= 1,
        `got ${out.length} items`);
}

// Case 3: clean JSON still parses
{
    const clean = `[{"i":0,"s":85,"r":"ok"},{"i":1,"s":72,"r":"ok"}]`;
    const out = salvageJsonArray(clean);
    check('clean array parses to 2 items', Array.isArray(out) && out.length === 2);
}

// Case 4: empty / non-JSON input
{
    check('empty string returns []', JSON.stringify(salvageJsonArray('')) === '[]');
    check('pure prose returns []', JSON.stringify(salvageJsonArray('I am sorry, I cannot do that.')) === '[]');
}

// Case 5: markdown-fenced JSON
{
    const fenced = '```json\n[{"i":0,"s":50,"r":"fenced"}]\n```';
    const out = salvageJsonArray(fenced);
    check('strips ```json fence', Array.isArray(out) && out.length === 1 && out[0].r === 'fenced');
}

console.log('\n== salvageJsonObject ==');

// Case 6: exact-shape reproduction of the log error
// Query refinement failed: "Unexpected token '}', ..."\"AI News\":}"
{
    const malformed = `{
        "GDELT": "remote work technology adoption 2026",
        "OpenAlex": "hybrid workforce productivity research",
        "Hacker News": "remote work startup tools",
        "AI News":}`;
    const out = salvageJsonObject(malformed);
    const keys = Object.keys(out);
    check('recovers 3 of 4 keys when last has bare-colon truncation',
        keys.length === 3,
        `got ${keys.length} keys: ${keys.join(',')}`);
    check('values are strings on recovered keys',
        keys.every(k => typeof out[k] === 'string'),
        JSON.stringify(out));
    check('GDELT key is recovered',
        out['GDELT']?.includes('remote work'));
}

// Case 7: trailing string truncation mid-value
{
    const malformed = `{
        "GDELT": "remote work 2026",
        "OpenAlex": "hybrid workforce`;
    const out = salvageJsonObject(malformed);
    check('object: recovers at least 1 pair when last value is truncated mid-string',
        Object.keys(out).length >= 1,
        JSON.stringify(out));
}

// Case 8: clean object still parses
{
    const clean = `{"a": "x", "b": "y"}`;
    const out = salvageJsonObject(clean);
    check('clean object parses to 2 keys', Object.keys(out).length === 2 && out.a === 'x' && out.b === 'y');
}

// Case 9: empty / non-JSON input
{
    check('empty string returns {}', JSON.stringify(salvageJsonObject('')) === '{}');
    check('pure prose returns {}', JSON.stringify(salvageJsonObject('I cannot comply.')) === '{}');
}

// Case 10: nested objects don't break the salvage (only top-level keys matter)
{
    const nested = `{"a": {"x": 1, "y": 2}, "b": "ok"}`;
    const out = salvageJsonObject(nested);
    check('nested object preserved', JSON.stringify(out.a) === '{"x":1,"y":2}' && out.b === 'ok');
}

console.log(`\n== summary ==`);
console.log(`  ${pass} pass, ${fail} fail`);
if (fail > 0) {
    console.error(`\nSALVAGE VERIFICATION FAILED — do NOT ship.`);
    process.exit(1);
}
console.log(`\nSALVAGE VERIFICATION OK.`);
