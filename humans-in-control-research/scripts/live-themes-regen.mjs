#!/usr/bin/env node
// LIVE P2 themes regeneration probe. Extracts themes from a SOURCE-DIVERSE slice of the real fixture
// co-op corpus via the real artifact engine (claude-opus-4-8 through the proxy) with the real
// multi-source citation mandate, then measures avg_distinct_sources_per_theme on the OUTPUT vs the
// stale 2026-05-26 fixture baseline (1). Representative live extraction (not the full BERTopic pipeline)
// but REAL corpus + REAL mandate + REAL engine -> honest signal on whether multi-source themes are produced.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'hic-workspace', 'wiki', 'articles');
const PROXY = 'http://127.0.0.1:5012';

function stripFm(s) { const m = s.match(/^---\n[\s\S]*?\n---\n?/); return m ? s.slice(m[0].length) : s; }
function fm(s, key) { const m = s.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, 'm')); return m ? m[1].trim() : ''; }
// robust JSON recovery (mirrors the P5 chatToSlideSpec _repairJsonSlice fix)
function repairJson(s) {
  let t = s.replace(/,\s*([}\]])/g, '$1');
  const q = (t.match(/(?<!\\)"/g) || []).length; if (q % 2 !== 0) t += '"';
  const o = (t.match(/\{/g) || []).length, c = (t.match(/\}/g) || []).length;
  const oa = (t.match(/\[/g) || []).length, ca = (t.match(/\]/g) || []).length;
  if (ca < oa) t += ']'.repeat(oa - ca); if (c < o) t += '}'.repeat(o - c); return t;
}
function extractJson(text) {
  let t = text.replace(/```(?:json)?/gi, '').trim();
  const first = t.indexOf('{'); if (first === -1) return null;
  const last = t.lastIndexOf('}');
  if (last > first) { try { return JSON.parse(t.slice(first, last + 1)); } catch { /* repair */ } }
  try { return JSON.parse(repairJson(t.slice(first))); } catch { return null; }
}

function collectCorpus() {
  const out = [];
  let dirs = [];
  try { dirs = fs.readdirSync(ART, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name); } catch { /* */ }
  // source-diverse: client-uploads + several DISTINCT reddit subreddits + jina/gemini
  const pick = ['client-uploads', ...dirs.filter(d => /^reddit-/.test(d)).slice(0, 7), ...dirs.filter(d => /jina|gemini-focused/.test(d)).slice(0, 2)];
  for (const d of pick) {
    let files = [];
    try { files = fs.readdirSync(path.join(ART, d)).filter(f => f.endsWith('.md')).slice(0, 2); } catch { continue; }
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(ART, d, f), 'utf8');
        const src = (fm(raw, 'source') || d).replace(/\s+/g, ' ').trim();
        const title = (fm(raw, 'title') || f).slice(0, 80);
        const body = stripFm(raw).replace(/\s+/g, ' ').trim().slice(0, 1000);
        if (body.length > 120) out.push({ source: src, title, body });
      } catch { /* skip */ }
    }
  }
  return out.slice(0, 16);
}

const corpus = collectCorpus();
const distinctCorpusSources = new Set(corpus.map(c => c.source)).size;
const corpusBlock = corpus.map((c, i) => `[SOURCE ${i + 1}] source="${c.source}" | title="${c.title}"\n${c.body}`).join('\n\n');

const system = `You are a CX research analyst extracting THEMES (findings: a pattern/tension/condition the evidence reveals; never a product/feature/recommendation) from a multi-source corpus on Northeastern co-op strategy.
HARD REQUIREMENT: every theme's citations array MUST list AT LEAST 2 DIFFERENT source names. Cite sourceName = the exact source="..." value from a [SOURCE n] header. Single-source themes are rejected.
Return ONLY a JSON object, no prose, no markdown fences: {"themes":[{"name":"<contestable finding sentence>","description":"<2-3 sentences>","citations":[{"sourceName":"<a source= value>"},{"sourceName":"<a DIFFERENT source= value>"}]}]}`;
const userMsg = `CORPUS (${corpus.length} excerpts across ${distinctCorpusSources} distinct sources):\n\n${corpusBlock}\n\nExtract 8-12 themes; enforce the >=2-distinct-source rule on EVERY theme. JSON only.`;

console.log(`corpus: ${corpus.length} excerpts, ${distinctCorpusSources} distinct sources. Calling claude-opus-4-8...`);
const resp = await fetch(`${PROXY}/api/ai/anthropic`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'claude-opus-4-8', max_tokens: 12000, system, messages: [{ role: 'user', content: userMsg }] }),
});
const data = await resp.json();
if (resp.status !== 200) { console.error('proxy error', resp.status, JSON.stringify(data).slice(0, 300)); process.exit(2); }
const text = (data.content || []).map(c => c.text || '').join('');
const parsed = extractJson(text);
if (!parsed || !Array.isArray(parsed.themes)) { console.error('no themes parsed. raw[:400]=', text.slice(0, 400)); process.exit(3); }
const themes = parsed.themes;
const n = themes.length || 1;
let distinctSum = 0, multi = 0;
for (const t of themes) {
  const srcs = new Set((t.citations || []).map(c => (c.sourceName || '').trim()).filter(Boolean));
  distinctSum += srcs.size; if (srcs.size >= 2) multi++;
}
const avgDistinct = Math.round((distinctSum / n) * 100) / 100;
const out = {
  ran: 'live-claude-opus-4-8', corpus_distinct_sources: distinctCorpusSources, theme_count: themes.length,
  avg_distinct_sources_per_theme: avgDistinct, multi_source_theme_pct: Math.round((multi / n) * 1000) / 10,
  fixture_baseline_avg_distinct_sources_per_theme: 1, improved: avgDistinct > 1,
};
fs.writeFileSync(path.join(ROOT, 'hic-workspace', 'eval', 'themes-live-regen.json'), JSON.stringify({ ...out, themes }, null, 2));
console.log(JSON.stringify(out, null, 2));
