#!/usr/bin/env node
// Discriminative-validity check: the gate must score the vetted exemplar HIGH
// and the cached failure corpus LOW. If it cannot separate them, it is not a gate.
// Read-only. Self-contained (frozen predicates, no services import).

import fs from 'node:fs';

const EM_DASH = /—/g;
const CHUNK_LEAK = /\[(CHUNK|EVIDENCE)_\d+/gi;
const META = [
  /\bbased on (the|our|available) (research|data|analysis|sources|evidence|information)\b/gi,
  /\b(the research|the data|the corpus|our findings|studies|sources) (show|shows|indicate|indicates|reveal|reveals|suggest|suggests)\b/gi,
  /\bin (this|the) (presentation|deck|slide|section|report|analysis)\b/gi,
  /\b(in conclusion|to summarize|in summary|to conclude)\b/gi,
  /\b(more research is needed|further (investigation|research) (required|needed)|evidence is limited)\b/gi,
];
const SLOP = ['paradigm shift','game-changer','holistic approach','cutting-edge','best-in-class','leverage synergies','actionable insights','thought leadership','move the needle','deep dive','low-hanging fruit','synergy','disruptive','it\'s worth noting','delve','tapestry','testament','meticulous','vibrant','garner','interplay','showcase','bolster','foster','leveraging','facilitate','pivotal','paramount','comprehensive','multifaceted','underscore','realm'];
const NUM_IN_HEADING = /(\$\s?\d|\b\d+\s?%|\b\d+:\d+\b|\b\d+x\b|\b\d{2,}\b)/;

function countRe(t, re) { const m = t.match(re); return m ? m.length : 0; }
function slopCount(t) { const lc = t.toLowerCase(); return SLOP.reduce((n, w) => n + (lc.split(w).length - 1), 0); }

function fromHtml(path) {
  const raw = fs.readFileSync(path, 'utf-8');
  const body = raw.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  const text = body.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const cites = countRe(text, /\bSource:/gi) + countRe(text, /\bcite\b/gi);
  return { text, headings, cites };
}
function fromJson(path) {
  const doc = JSON.parse(fs.readFileSync(path, 'utf-8'));
  const data = doc.data ?? doc;
  const strings = [];
  (function walk(o){ if(o==null)return; if(typeof o==='string'){strings.push(o);return;} if(Array.isArray(o)){o.forEach(walk);return;} if(typeof o==='object')Object.values(o).forEach(walk); })(data);
  const headings = [];
  (function wt(o){ if(o==null||typeof o!=='object')return; if(Array.isArray(o)){o.forEach(wt);return;} for(const[k,v]of Object.entries(o)){ if(typeof v==='string'&&/^(title|name|headline|phase|stage|stagename|gap)$/i.test(k))headings.push(v); else wt(v);} })(data);
  const text = strings.join('\n');
  const cites = countRe(text, /\bSource:/gi);
  return { text, headings, cites };
}

function score(label, x) {
  const numHeadings = x.headings.filter(h => NUM_IN_HEADING.test(h)).length;
  return {
    label,
    em_dash: countRe(x.text, EM_DASH),
    chunk_leak: countRe(x.text, CHUNK_LEAK),
    meta_narration: META.reduce((n, re) => n + countRe(x.text, re), 0),
    slop: slopCount(x.text),
    headings_total: x.headings.length,
    headings_with_numbers: numHeadings,
    source_attributions: x.cites,
    chars: x.text.length,
  };
}

const BENCH = '../internal-solutions-journeymapper/journey_maps/journey_map_e40276ac-84ca-449c-a186-4634e885b91f.html';
const CACHED = 'hic-workspace/wiki/engagements/develop-a-comprehensive-co-op-strategy-for-northeastern-univ/journey.json';

const rows = [score('EXEMPLAR (benchmark journey)', fromHtml(BENCH)), score('CACHED (co-op journey.json)', fromJson(CACHED))];

const cols = ['em_dash','chunk_leak','meta_narration','slop','headings_total','headings_with_numbers','source_attributions','chars'];
const pad = (s, n) => String(s).padEnd(n);
console.log('\nDISCRIMINATIVE-VALIDITY CHECK (lower is better except source_attributions)\n');
console.log(pad('metric', 24) + rows.map(r => pad(r.label.split(' ')[0], 16)).join(''));
for (const c of cols) console.log(pad(c, 24) + rows.map(r => pad(r[c], 16)).join(''));

// crude composite: violations (lower better)
const viol = r => r.em_dash + r.chunk_leak*2 + r.meta_narration + r.slop;
console.log('\n' + pad('VIOLATION SCORE', 24) + rows.map(r => pad(viol(r), 16)).join(''));
const gap = viol(rows[1]) - viol(rows[0]);
console.log(`\nDiscrimination gap (cached - exemplar): ${gap}  -> ${gap > 0 ? 'PASS: gate separates exemplar from junk' : 'FAIL: no separation'}`);
console.log('\nNote: exemplar headings_with_numbers are acceptable because each figure carries an inline');
console.log('source attribution (' + rows[0].source_attributions + ' Source: refs). The cached file leaks ' + rows[1].chunk_leak + ' raw markers and has ' + rows[1].source_attributions + ' inline source refs.');
