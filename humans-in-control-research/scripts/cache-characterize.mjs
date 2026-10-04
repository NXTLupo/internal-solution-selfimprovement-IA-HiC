#!/usr/bin/env node
// C1 (sota-elevation plan 2026-08-07): measure rho(N, |P|) on OUR workload.
// Ports the CAPC (arXiv 2607.15516) RUN_NONCE characterization: for each prefix
// size, warm a nonce-salted cached prefix once, then issue N follow-up calls and
// record cache_read_input_tokens / cache_creation_input_tokens per call. The
// per-size cumulative hit rate locates Anthropic's hot/persistent tier boundary
// for the models WE route (CAPC measured ~3,500 tokens on Sonnet 4.6, May 2026).
//
// Usage:
//   node scripts/cache-characterize.mjs [--model claude-opus-5-5] [--n 15] \
//        [--trials 2] [--sizes 2000,3500,8000,30000,100000] [--ttl 5m]
//
// Output: JSON lines to stdout + a summary table; paste the summary into
// wiki/benchmarks/prompt-cache-tiers.md. Cost note: defaults ~= $3-5 on
// opus-4-8 (max_tokens=1, 5m TTL); full CAPC-parity (--n 30 --trials 3) ~3x.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) =>
    a.startsWith('--') ? [a.slice(2), (arr[i + 1] && !arr[i + 1].startsWith('--')) ? arr[i + 1] : '1'] : null
).filter(Boolean));

const MODEL = args.model || 'claude-opus-5-5';
const N = parseInt(args.n || '15', 10);
const TRIALS = parseInt(args.trials || '2', 10);
const SIZES = (args.sizes || '2000,3500,8000,30000,100000').split(',').map(s => parseInt(s.trim(), 10));
const TTL = args.ttl || '5m'; // 5m keeps characterization cheap; production uses 1h
const CHARS_PER_TOKEN = 4;

// API key: env first, then repo-root .env
let apiKey = process.env.ANTHROPIC_API_KEY || '';
if (!apiKey) {
    for (const envPath of [path.resolve('..', '.env'), path.resolve('.env'), path.resolve('..', '..', '.env')]) {
        try {
            const m = fs.readFileSync(envPath, 'utf8').match(/^ANTHROPIC_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
            if (m) { apiKey = m[1].trim(); break; }
        } catch { /* keep looking */ }
    }
}
if (!apiKey) { console.error('FATAL: no ANTHROPIC_API_KEY in env or .env'); process.exit(1); }

// Deterministic filler that cannot be confused with real corpus content.
function makePrefix(tokens, nonce) {
    const targetChars = tokens * CHARS_PER_TOKEN;
    let s = `CACHE CHARACTERIZATION RUN ${nonce}. Synthetic grounding corpus for rho(N,|P|) measurement.\n`;
    let i = 0;
    while (s.length < targetChars) {
        s += `Fact ${i}: synthetic evidence line ${i} of run ${nonce}, token filler segment with stable wording. `;
        i += 1;
    }
    return s.slice(0, targetChars);
}

async function call(prefix, turn) {
    const body = {
        model: MODEL,
        max_tokens: 1,
        system: [{ type: 'text', text: prefix, cache_control: TTL === '1h' ? { type: 'ephemeral', ttl: '1h' } : { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `Reply with the single word OK. (turn ${turn})` }],
    };
    const headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
    };
    if (TTL === '1h') headers['anthropic-beta'] = 'extended-cache-ttl-2025-04-11';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers, body: JSON.stringify(body),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(`API ${resp.status}: ${JSON.stringify(json).slice(0, 200)}`);
    const u = json.usage || {};
    return {
        read: u.cache_read_input_tokens || 0,
        write: u.cache_creation_input_tokens || 0,
        fresh: u.input_tokens || 0,
    };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.error(`# cache-characterize model=${MODEL} N=${N} trials=${TRIALS} ttl=${TTL} sizes=${SIZES.join(',')}`);
    const summary = [];
    for (const sizeTokens of SIZES) {
        const trialRhos = [];
        for (let t = 0; t < TRIALS; t++) {
            const nonce = crypto.randomBytes(6).toString('hex');
            const prefix = makePrefix(sizeTokens, nonce);
            let hits = 0, writes = 0;
            // warm call (expected write), then N follow-ups
            try {
                const w = await call(prefix, 0);
                writes += w.write > 0 ? 1 : 0;
                console.log(JSON.stringify({ size: sizeTokens, trial: t, turn: 0, ...w }));
            } catch (e) { console.error(`warm fail size=${sizeTokens} t=${t}: ${e.message}`); continue; }
            for (let i = 1; i <= N; i++) {
                await sleep(350); // gentle pacing; stays far under rate limits
                try {
                    const r = await call(prefix, i);
                    if (r.read > 0) hits += 1; else if (r.write > 0) writes += 1;
                    console.log(JSON.stringify({ size: sizeTokens, trial: t, turn: i, ...r }));
                } catch (e) { console.error(`call fail size=${sizeTokens} t=${t} i=${i}: ${e.message}`); }
            }
            const rho = hits / N;
            trialRhos.push(rho);
            console.error(`size=${sizeTokens}tok trial=${t} rho(N=${N})=${rho.toFixed(3)} (hits=${hits} extra_writes=${writes})`);
        }
        const mean = trialRhos.reduce((a, b) => a + b, 0) / Math.max(1, trialRhos.length);
        const sigma = Math.sqrt(trialRhos.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, trialRhos.length));
        summary.push({ size_tokens: sizeTokens, rho_mean: +mean.toFixed(3), rho_sigma: +sigma.toFixed(3), trials: trialRhos.length, N });
    }
    console.error('\n== SUMMARY (paste into wiki/benchmarks/prompt-cache-tiers.md) ==');
    console.error(`model=${MODEL} ttl=${TTL} date=${new Date().toISOString().slice(0, 10)}`);
    console.error('| prefix tokens | rho mean | sigma | trials | N |');
    console.error('|---|---|---|---|---|');
    for (const row of summary) {
        console.error(`| ${row.size_tokens} | ${row.rho_mean} | ${row.rho_sigma} | ${row.trials} | ${row.N} |`);
    }
    // Threshold estimate: smallest size whose rho_mean >= 0.97
    const persistent = summary.filter(r => r.rho_mean >= 0.97).sort((a, b) => a.size_tokens - b.size_tokens)[0];
    const hot = summary.filter(r => r.rho_mean < 0.97).sort((a, b) => b.size_tokens - a.size_tokens)[0];
    console.error(persistent
        ? `\nTIER THRESHOLD: between ${(hot && hot.size_tokens) || '<' + persistent.size_tokens} and ${persistent.size_tokens} tokens ` +
          `-> set ANTHROPIC_CACHE_TIER_TOKENS=${persistent.size_tokens}`
        : '\nTIER THRESHOLD: no size reached rho>=0.97 - widen the sweep upward');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
