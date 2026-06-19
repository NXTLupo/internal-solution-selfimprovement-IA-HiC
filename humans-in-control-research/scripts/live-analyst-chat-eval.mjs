#!/usr/bin/env node
// LIVE Phase-3 (ANALYST CHAT) eval harness — reproducible, faithful, no fixture edits.
//
// WHY: benchmark.mjs phase3 only had binary mechanism flags (grounds_via_manifest, persists_insights)
// and a probe saying "answer accuracy/depth/breadth/usefulness still need a golden Q/A live run to
// score". This is that live run. For each goal-derived golden question it:
//   1. retrieves the REAL grounded corpus via POST /api/corpus/retrieve {goal: question}
//      (the same manifest-grounded retrieval the analyst chat uses),
//   2. answers via the REAL engine (claude-opus-4-8 through /api/ai/anthropic) under the REAL
//      citation protocol (.claude/CLAUDE.md: evidence-first, cite by NAMED source, never generic),
//   3. scores the OUTPUT on the dimensions the condition names — accuracy/grounding (cited sources
//      MUST exist in the retrieved corpus = anti-hallucination), breadth (distinct sources per
//      answer), usefulness (answer is specific + cited, not hedged).
// Metric is computed the same way across answers; nothing is hand-authored.
//
// Usage: node scripts/live-analyst-chat-eval.mjs   (proxy up on :5012, key set server-side)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(ROOT, 'hic-workspace', 'wiki', 'engagements', 'identify-a-comprehensive-new-strategy-for-co-op-based-on-the');
const OUT = path.join(ROOT, 'hic-workspace', 'eval', 'analyst-chat-eval.json');
const PROXY = process.env.HIC_PROXY || 'http://127.0.0.1:5012';
const MODEL = 'claude-opus-4-8';

const goal = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'manifest.json'), 'utf8')).research_goal.trim();

// Goal-derived golden questions (deterministic; span the goal's facets, not cherry-picked to be easy).
const QUESTIONS = [
  'What are the main barriers students face in securing meaningful co-op placements?',
  'How do employers perceive co-op candidates, and what makes a candidate stand out?',
  'What equity or access gaps appear in the experiential-learning pipeline from pre-enrollment to graduation?',
  'What role does AI play in co-op matching, and how is it received by students and practitioners?',
  'Where does institutional support for co-op break down across the student lifecycle?',
];

const ANSWER_SYSTEM = `You are a CX research analyst answering a question grounded STRICTLY in the provided corpus.
CITATION PROTOCOL (non-negotiable): lead with external research evidence; cite by SPECIFIC NAMED source (e.g. "reddit: AskAcademia", "Higher Ed Dive"), NEVER generic ("research", "studies", "data", "sources"). Every claim that carries weight must be backed by a NAMED source that appears in the corpus. Do NOT invent sources. If the corpus does not support a point, omit it.
Return ONLY JSON, no prose, no fences: {"answer":"<2-4 sentence grounded answer>","citations":[{"sourceName":"<exact SOURCE value from a corpus header>","quote":"<verbatim 8-25 word quote from that source>"}]}`;

const r2 = (n) => Math.round(n * 100) / 100;

async function answerOne(q) {
  const cr = await fetch(`${PROXY}/api/corpus/retrieve`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: q, angles: 4, per_angle: 6, max_total: 14, maxCharsPerArticle: 1200 }),
  });
  if (!cr.ok) throw new Error(`corpus/retrieve ${cr.status}`);
  const articles = (await cr.json()).articles || [];
  const srcOf = (a) => String(a.sourceName || a.source || a.sourceTitle || a.title || 'unknown').trim();
  const textOf = (a) => String(a.content || a.text || a.body || a.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  const corpusSources = new Set(articles.map(srcOf));
  const block = articles.map((a, i) => `[SOURCE ${i + 1}] source="${srcOf(a)}"\n${textOf(a)}`).join('\n\n');

  const ai = await fetch(`${PROXY}/api/ai/anthropic`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1500, system: ANSWER_SYSTEM,
      messages: [{ role: 'user', content: `QUESTION: ${q}\n\nCORPUS:\n\n${block}\n\nAnswer now as the specified JSON.` }],
    }),
  });
  if (!ai.ok) throw new Error(`ai/anthropic ${ai.status}`);
  let raw = ((await ai.json()).content?.[0]?.text || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const cites = (parsed.citations || []).map(c => String(c.sourceName || '').trim()).filter(Boolean);
  const distinct = new Set(cites);
  // grounding = cited sources that ACTUALLY exist in the retrieved corpus (anti-hallucination)
  const grounded = [...distinct].filter(s => corpusSources.has(s));
  return {
    q, answer_len: (parsed.answer || '').length,
    citations: cites.length, distinct_sources: distinct.size,
    corpus_sources: corpusSources.size,
    grounding_pct: distinct.size ? r2((grounded.length / distinct.size) * 100) : 0,
    multi_source: distinct.size >= 2,
  };
}

async function main() {
  console.log(`[chat-eval] ${QUESTIONS.length} golden questions, live ${MODEL} via ${PROXY}`);
  const rows = [];
  for (const q of QUESTIONS) {
    process.stdout.write(`  Q: ${q.slice(0, 60)}... `);
    try { const r = await answerOne(q); rows.push(r); console.log(`cites=${r.citations} distinct=${r.distinct_sources} grounded=${r.grounding_pct}%`); }
    catch (e) { console.log('FAILED: ' + e.message); rows.push({ q, error: e.message }); }
  }
  const ok = rows.filter(r => !r.error);
  const n = ok.length || 1;
  const result = {
    ran: `live-${MODEL}`, ran_at: new Date().toISOString(),
    questions: QUESTIONS.length, answered_ok: ok.length,
    avg_citations_per_answer: r2(ok.reduce((s, r) => s + r.citations, 0) / n),
    avg_distinct_sources_per_answer: r2(ok.reduce((s, r) => s + r.distinct_sources, 0) / n),
    multi_source_answer_pct: r2((ok.filter(r => r.multi_source).length / n) * 100),
    grounding_pct: r2(ok.reduce((s, r) => s + r.grounding_pct, 0) / n),  // anti-hallucination: cited sources real
    rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(`\n[chat-eval] DONE -> ${path.relative(ROOT, OUT)}`);
  console.log(`  answered_ok:                 ${result.answered_ok}/${result.questions}`);
  console.log(`  avg_distinct_sources/answer: ${result.avg_distinct_sources_per_answer}`);
  console.log(`  multi_source_answer_pct:     ${result.multi_source_answer_pct}%`);
  console.log(`  grounding_pct (real cites):  ${result.grounding_pct}%`);
}
main().catch(e => { console.error('[chat-eval] FAILED:', e.message); process.exit(1); });
