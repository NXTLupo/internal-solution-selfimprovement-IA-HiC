#!/usr/bin/env node
// Read-only failure-mode analyzer for cached engagement deliverables.
// Purpose: learn what makes the cached outputs "junk" so (a) the gate predicates
// are grounded in real failures and (b) the hand-crafted exemplars know what to fix.
// Self-contained (no services import) so it is a frozen, independent measuring stick.

import fs from 'node:fs';
import path from 'node:path';

const ENG_ROOT = 'hic-workspace/wiki/engagements';
const DELIVERABLES = ['recs.json', 'gap.json', 'journey.json', 'competitive.json', 'personas.json', 'themes.json'];

// --- Frozen master-rule predicates (mirror .claude/CLAUDE.md; independent of services) ---
const EM_DASH = /—/g;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;
const CHUNK_LEAK = /\[CHUNK_\d+/gi;
const REPORTING_META = [
  /\bR-\d{2,}\b/g,
  /\bConfidence:\s*(HYPOTHESIS|EMERGING|VERIFIED)\b/gi,
  /\bRun ID:/gi,
  /\bPipeline version:/gi,
  /\(composite\)/gi,
  /\(synthetic\)/gi,
  /\bPhase\s*0?\d[A-C]?\s*[·.]\s*Wk\b/gi,
  /\bPass\s*\d[A-C]\b/g,
  /\bSegment size:\s*\d+/gi,
  /↪\s*resolves:/g,
];
const META_NARRATION = [
  /\bbased on (the|our|available) (research|data|analysis|sources|evidence|information)\b/gi,
  /\b(the research|the data|the corpus|our findings|studies|sources) (show|shows|indicate|indicates|reveal|reveals|suggest|suggests)\b/gi,
  /\bin (this|the) (presentation|deck|slide|section|report|analysis)\b/gi,
  /\b(in conclusion|to summarize|in summary|to conclude)\b/gi,
  /\b(more research is needed|further (investigation|research) (required|needed)|evidence is limited|data is limited|due to limited data)\b/gi,
  /\b(as (shown|discussed|noted|mentioned)( (above|below|earlier|previously))?)\b/gi,
];
const SLOP = [
  'paradigm shift','game-changer','game changer','holistic approach','cutting-edge','best-in-class',
  'leverage synergies','robust solution','seamless integration','actionable insights','thought leadership',
  'move the needle','deep dive','low-hanging fruit','synergy','disruptive','in today\'s rapidly evolving',
  'it\'s worth noting','it\'s important to note','at the end of the day','delve','delves into','tapestry',
  'testament','meticulous','vibrant','garner','interplay','intricate','showcase','bolster','foster',
  'leveraging','facilitate','pivotal','paramount','comprehensive','multifaceted','underscore','realm',
];
// naked number used AS A TITLE assertion (Quantitative Claim Rule)
const NAKED_NUM_TITLE = /(^|[\s(])(\$\s?\d|\d+\s?%|\d+x\b|\d{2,}\s+(percent|students|donors|users|days|weeks))/i;

const TITLE_KEYS = new Set(['title','name','headline','stagename','stage','archetype','gap','competitor','theme']);

function walkStrings(o, out) {
  if (o == null) return;
  if (typeof o === 'string') { out.push(o); return; }
  if (Array.isArray(o)) { for (const x of o) walkStrings(x, out); return; }
  if (typeof o === 'object') { for (const v of Object.values(o)) walkStrings(v, out); }
}
function walkTitles(o, out) {
  if (o == null || typeof o !== 'object') return;
  if (Array.isArray(o)) { for (const x of o) walkTitles(x, out); return; }
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && TITLE_KEYS.has(k.toLowerCase())) out.push(v);
    else walkTitles(v, out);
  }
}
function countMatches(text, re) {
  if (re.global) { const m = text.match(re); return m ? m.length : 0; }
  return re.test(text) ? 1 : 0;
}

const engagements = fs.existsSync(ENG_ROOT)
  ? fs.readdirSync(ENG_ROOT).filter(d => { try { return fs.statSync(path.join(ENG_ROOT, d)).isDirectory(); } catch { return false; } })
  : [];

const rows = [];
const agg = {};
const bump = (k, n = 1) => { agg[k] = (agg[k] || 0) + n; };

for (const eng of engagements) {
  for (const file of DELIVERABLES) {
    const p = path.join(ENG_ROOT, eng, file);
    if (!fs.existsSync(p)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { continue; }
    const data = doc.data ?? doc;
    const strings = []; walkStrings(data, strings);
    const titles = []; walkTitles(data, titles);
    const text = strings.join('\n');
    const titleText = titles.join('\n');

    const r = {
      eng: eng.slice(0, 38), kind: doc.kind || file.replace('.json',''),
      strings: strings.length, chars: text.length,
      em_dash: countMatches(text, EM_DASH),
      emoji: countMatches(text, EMOJI),
      chunk_leak: countMatches(text, CHUNK_LEAK),
      reporting_meta: REPORTING_META.reduce((n, re) => n + countMatches(text, re), 0),
      meta_narration: META_NARRATION.reduce((n, re) => n + countMatches(text, re), 0),
      slop: SLOP.reduce((n, w) => n + (text.toLowerCase().split(w).length - 1), 0),
      naked_num_titles: titles.filter(t => NAKED_NUM_TITLE.test(t)).length,
      self_assessment: (data && (data.selfAssessment || data.self_assessment)) ? 1 : 0,
    };
    rows.push(r);
    for (const k of ['em_dash','emoji','chunk_leak','reporting_meta','meta_narration','slop','naked_num_titles']) {
      bump('TOTAL_' + k, r[k]);
      if (r[k] > 0) bump('FILES_WITH_' + k, 1);
    }
    bump('FILES', 1);
    if (r.self_assessment) bump('FILES_WITH_self_assessment', 1);
  }
}

const out = [];
out.push(`# Cached deliverable failure-mode scan (read-only)`);
out.push(`Scanned ${agg.FILES || 0} cached deliverable files across ${engagements.length} engagements.\n`);
out.push(`## Aggregate failure modes (files affected / total occurrences)`);
const modes = ['em_dash','emoji','chunk_leak','reporting_meta','meta_narration','slop','naked_num_titles'];
out.push(`| Failure mode | Files affected | Total occurrences |`);
out.push(`|---|---|---|`);
for (const m of modes) out.push(`| ${m} | ${agg['FILES_WITH_'+m]||0} / ${agg.FILES||0} | ${agg['TOTAL_'+m]||0} |`);
out.push(`| self_assessment PRESENT | ${agg['FILES_WITH_self_assessment']||0} / ${agg.FILES||0} | (RI envelope) |`);

out.push(`\n## Worst offenders (top 15 by combined high-severity hits)`);
rows.sort((a,b) => (b.em_dash+b.reporting_meta+b.chunk_leak+b.naked_num_titles+b.meta_narration)
                  - (a.em_dash+a.reporting_meta+a.chunk_leak+a.naked_num_titles+a.meta_narration));
out.push(`| engagement | kind | em_dash | chunk | report_meta | meta_narr | slop | naked#titles | selfAssess |`);
out.push(`|---|---|---|---|---|---|---|---|---|`);
for (const r of rows.slice(0, 15)) {
  out.push(`| ${r.eng} | ${r.kind} | ${r.em_dash} | ${r.chunk_leak} | ${r.reporting_meta} | ${r.meta_narration} | ${r.slop} | ${r.naked_num_titles} | ${r.self_assessment ? 'y' : 'n'} |`);
}

const report = out.join('\n');
fs.writeFileSync('hic-workspace/wiki/eval/cached-deliverable-failure-modes.md', report + '\n');
console.log(report);
console.log('\n[written] hic-workspace/wiki/eval/cached-deliverable-failure-modes.md');
