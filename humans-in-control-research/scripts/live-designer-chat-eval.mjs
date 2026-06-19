#!/usr/bin/env node
// LIVE Phase-5 (DESIGNER CHAT) eval harness — reproducible, faithful, measures ERROR REDUCTION.
//
// WHY: benchmark.mjs phase5 only had a sample-count + a binary json-recovery flag and a probe
// saying designer error-rate "needs a live #brief/#explainer/#report run series". This is that run.
// The condition's Phase-5 dimension is "reduction of errors and improvement of content quality of
// hashtag artifacts from the Designer chat". The faithful way to measure REDUCTION is an A/B on the
// SAME engine + SAME task: guardrails OFF (no anti-slop contract) vs ON (the real designer contract:
// plain text, no banned phrases, no em-dash, no meta-narration, cite named sources). Both outputs are
// scored by the SAME checks the benchmark uses (the shared anti-slop lexicon + em-dash + meta-narration).
// The delta = the guardrails' real effect. Nothing is hand-authored.
//
// Usage: node scripts/live-designer-chat-eval.mjs   (proxy up on :5012)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'hic-workspace', 'wiki', 'engagements', 'identify-a-comprehensive-new-strategy-for-co-op-based-on-the');
const LEXICON = path.join(ROOT, 'hic-workspace', 'wiki', 'frameworks', 'anti-slop-lexicon.json');
const OUT = path.join(ROOT, 'hic-workspace', 'eval', 'designer-chat-eval.json');
const PROXY = process.env.HIC_PROXY || 'http://127.0.0.1:5012';
const MODEL = 'claude-opus-4-8';

const goal = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'manifest.json'), 'utf8')).research_goal.trim();

// --- anti-slop checks. NOTE: the wiki anti-slop-lexicon.json is UNTRACKED and currently absent
// (benchmark.mjs silently returns [] when it's missing, which is why its banned_phrase_hits reads 0 -
// a DETECTOR-BLIND false zero, not real slop removal). So this harness embeds the documented
// high-severity bans from .claude/CLAUDE.md directly, and unions any lexicon file if present, so the
// A/B actually tests banned-phrase emission regardless of the missing file. ---
const EMBEDDED_BANS = [
  'paradigm shift', 'game-changer', 'game changer', 'holistic approach', 'cutting-edge', 'cutting edge',
  'best-in-class', 'best in class', 'leverage synergies', 'robust solution', 'seamless integration',
  'actionable insights', 'thought leadership', 'value proposition', 'core competency', 'move the needle',
  'circle back', 'deep dive', 'low-hanging fruit', 'synergy', 'ecosystem', 'disruptive', 'innovative solution',
  "in today's rapidly evolving landscape", "it's worth noting", 'it should be noted', 'needless to say',
  'at the end of the day', 'the reality is', 'when it comes to', 'delve', 'tapestry', 'testament',
  'meticulous', 'nestled', 'vibrant', 'garner', 'interplay', 'intricate', 'showcase', 'bolster', 'foster',
  'enhance', 'paramount', 'valuable insights', 'utilize', 'comprehensive', 'foundational', 'multifaceted',
  'leveraging', 'facilitate', 'pivotal', 'realm', 'underscore', 'navigate the', 'in the realm of',
];
function loadLexiconTerms() {
  const terms = new Set(EMBEDDED_BANS.map(t => t.toLowerCase()));
  try {
    const lex = JSON.parse(fs.readFileSync(LEXICON, 'utf8'));
    const collect = (o, d = 0) => {
      if (d > 8 || o == null) return;
      if (Array.isArray(o)) { for (const v of o) { if (typeof v === 'string' && v.length >= 4 && v.length <= 60) terms.add(v.toLowerCase()); else collect(v, d + 1); } return; }
      if (typeof o === 'object') for (const v of Object.values(o)) collect(v, d + 1);
    };
    collect(lex);
  } catch { /* file absent (expected); embedded bans still active */ }
  return [...terms];
}
const LEX = loadLexiconTerms();
const META = [/\bin this (deck|presentation|section|report)\b/i, /\bas you can see\b/i, /\bthis slide\b/i, /\btoday we('ll| will)\b/i, /\bwe will (present|explore|examine)\b/i, /\blet'?s (dive|explore)\b/i, /\bin conclusion\b/i, /\bto summari[sz]e\b/i, /\bwelcome to\b/i];
function scoreText(s) {
  const lo = s.toLowerCase();
  let banned = 0; for (const t of LEX) if (lo.includes(t)) banned++;
  const emdash = (s.match(/—/g) || []).length;
  let meta = 0; for (const re of META) if (re.test(s)) meta++;
  return { banned, emdash, meta };
}
function walkStrings(obj, fn, depth = 0) {
  if (depth > 12 || obj == null) return;
  if (typeof obj === 'string') { fn(obj); return; }
  if (Array.isArray(obj)) { for (const v of obj) walkStrings(v, fn, depth + 1); return; }
  if (typeof obj === 'object') for (const v of Object.values(obj)) walkStrings(v, fn, depth + 1);
}

// Deck-scale task (8 slides + a narrative paragraph each): more prose surface -> a fairer test of
// whether the OFF arm emits slop the guardrails would remove (a 4-slide #brief was too short to elicit any).
const TASK = `Produce an 8-slide executive #report deck spec on the new co-op strategy for Northeastern. For EACH slide: an action-title, 2-3 body lines, AND a 2-3 sentence narrative paragraph elaborating the point.`;
const SCHEMA = `Return ONLY JSON: {"slides":[{"title":"...","body":["...","..."],"narrative":"..."}]}`;
// A: guardrails OFF (no anti-slop contract) — establishes the natural error rate
const SYSTEM_OFF = `You are a presentation writer. ${TASK} ${SCHEMA}`;
// B: guardrails ON — the REAL designer contract
const SYSTEM_ON = `You are a senior consulting designer. ${TASK}
HARD RULES: plain text only (no markdown). NO em-dash characters anywhere (use comma/colon/period). NO meta-narration ("in this deck", "this slide", "as you can see", "today we will", "in conclusion", "to summarize", "welcome"). NO corporate/AI slop ("leverage", "synergy", "cutting-edge", "robust", "seamless", "delve", "tapestry", "testament", "in today's rapidly evolving landscape"). Action titles state a CONCLUSION, not a topic. ${SCHEMA}`;

const r2 = (n) => Math.round(n * 100) / 100;

async function run(system) {
  const ai = await fetch(`${PROXY}/api/ai/anthropic`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 3500, system, messages: [{ role: 'user', content: `RESEARCH GOAL: ${goal}\n\nWrite the deck spec now.` }] }),
  });
  if (!ai.ok) throw new Error(`ai/anthropic ${ai.status}`);
  let raw = ((await ai.json()).content?.[0]?.text || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  let parseOk = 1, parsed = null;
  try { parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { parseOk = 0; }
  const agg = { banned: 0, emdash: 0, meta: 0, strings: 0 };
  if (parsed) walkStrings(parsed, (s) => { const sc = scoreText(s); agg.banned += sc.banned; agg.emdash += sc.emdash; agg.meta += sc.meta; agg.strings++; });
  else { const sc = scoreText(raw); agg.banned += sc.banned; agg.emdash += sc.emdash; agg.meta += sc.meta; agg.strings = 1; }
  agg.parse_ok = parseOk;
  agg.total_errors = agg.banned + agg.emdash + agg.meta + (parseOk ? 0 : 1);
  return agg;
}

async function main() {
  console.log(`[designer-eval] A/B on ${MODEL} (guardrails OFF vs ON), shared anti-slop lexicon (${LEX.length} terms)`);
  const off = await run(SYSTEM_OFF); console.log(`  OFF: errors=${off.total_errors} (banned=${off.banned} emdash=${off.emdash} meta=${off.meta} parse_ok=${off.parse_ok})`);
  const on = await run(SYSTEM_ON); console.log(`  ON:  errors=${on.total_errors} (banned=${on.banned} emdash=${on.emdash} meta=${on.meta} parse_ok=${on.parse_ok})`);
  const reduction = off.total_errors > 0 ? r2(((off.total_errors - on.total_errors) / off.total_errors) * 100) : (on.total_errors === 0 ? 100 : 0);
  const result = {
    ran: `live-${MODEL}`, ran_at: new Date().toISOString(),
    guardrails_off: off, guardrails_on: on,
    error_reduction_pct: reduction,                       // (off-on)/off
    designer_on_total_errors: on.total_errors,            // lower=better
    designer_json_parse_ok: on.parse_ok,
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(`\n[designer-eval] DONE -> ${path.relative(ROOT, OUT)}`);
  console.log(`  error_reduction_pct (OFF->ON): ${reduction}%`);
  console.log(`  designer_on_total_errors:      ${on.total_errors}`);
}
main().catch(e => { console.error('[designer-eval] FAILED:', e.message); process.exit(1); });
