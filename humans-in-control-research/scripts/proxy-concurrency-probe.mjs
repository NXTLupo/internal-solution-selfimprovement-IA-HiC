#!/usr/bin/env node
// Validates the WAVE_SIZE=2 fix: fires N concurrent ~780KB Opus calls at the research-proxy (the exact
// payload size + concurrency that, at N=3, saturated the single-process proxy with ERR_EMPTY_RESPONSE
// in the user's run). N defaults to 2 (the new cap) -> expect ALL to return 200.  Usage: node scripts/proxy-concurrency-probe.mjs [N]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'hic-workspace', 'wiki', 'articles');
const PROXY = 'http://127.0.0.1:5012';
const N = parseInt(process.argv[2] || '2', 10);

// Build a ~700KB corpus block from real article bodies (matches the real shard payload size).
function bigCorpus(targetChars = 700_000) {
  const parts = []; let total = 0;
  const dirs = fs.readdirSync(ART, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  outer: for (const d of dirs) {
    let files = [];
    try { files = fs.readdirSync(path.join(ART, d)).filter(f => f.endsWith('.md')); } catch { continue; }
    for (const f of files) {
      try {
        let raw = fs.readFileSync(path.join(ART, d, f), 'utf8');
        raw = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/\s+/g, ' ').trim();
        if (raw.length < 200) continue;
        parts.push(`[SOURCE ${d}/${f}]\n${raw}`); total += raw.length;
        if (total >= targetChars) break outer;
      } catch { /* skip */ }
    }
  }
  return parts.join('\n\n');
}

const corpus = bigCorpus();
const userMsg = `CORPUS:\n\n${corpus}\n\nIn 3 sentences, name the single most-cited theme across these sources.`;
const bodyChars = JSON.stringify({ model: 'claude-opus-5-5', max_tokens: 600, messages: [{ role: 'user', content: userMsg }] }).length;
console.log(`Firing ${N} CONCURRENT requests, each ~${Math.round(bodyChars / 1000)}KB, at ${PROXY}/api/ai/anthropic ...`);

async function fire(i) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${PROXY}/api/ai/anthropic`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-opus-5-5', max_tokens: 600, messages: [{ role: 'user', content: userMsg }] }),
      signal: AbortSignal.timeout(300_000),
    });
    const ms = Date.now() - t0;
    let ok = false; try { const j = await r.json(); ok = r.status === 200 && Array.isArray(j.content); } catch { /* */ }
    return { i, status: r.status, ms, ok };
  } catch (e) {
    return { i, status: 'NETWORK_FAIL', ms: Date.now() - t0, ok: false, err: String(e.name || e).slice(0, 60) };
  }
}

const results = await Promise.all(Array.from({ length: N }, (_, i) => fire(i + 1)));
for (const r of results) console.log(`  req ${r.i}: status=${r.status} ${r.ok ? 'OK' : 'FAIL'} (${Math.round(r.ms / 1000)}s)${r.err ? ' err=' + r.err : ''}`);
const okCount = results.filter(r => r.ok).length;
console.log(`\n${okCount}/${N} concurrent ${Math.round(bodyChars / 1000)}KB requests succeeded. ${okCount === N ? 'PASS — proxy handles the WAVE_SIZE cap cleanly.' : 'FAIL — still saturating; lower WAVE_SIZE further.'}`);
process.exit(okCount === N ? 0 : 1);
