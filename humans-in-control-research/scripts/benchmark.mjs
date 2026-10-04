#!/usr/bin/env node
// HiC per-phase benchmark spine (offline, deterministic, dependency-free).
// Purpose: make "improve benchmarks at every phase" VERIFIABLE. Computes file-
// computable metrics for each workflow phase against a frozen golden fixture +
// the wiki manifest, writes a baseline JSON + a human-readable scorecard, and
// (on re-run) lets any plan change be gated on no-regression.
//
// Usage:
//   node scripts/benchmark.mjs                      # score -> eval/benchmark-latest.json + scorecard
//   node scripts/benchmark.mjs --baseline           # also freeze eval/benchmark-baseline.json
//   node scripts/benchmark.mjs --diff               # print delta vs frozen baseline (exit 1 on regression OR missing baseline)
//
// Phases (the user's named benchmark dimensions):
//  1 DATA COLLECTION  2 THEMES  3 ANALYST-CHAT  4 DELIVERABLES+DESIGN
//  5 DESIGNER-CHAT    6 SELF-IMPROVEMENT
// Offline metrics are computed now; live-only metrics are declared as probes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');                 // humans-in-control-research/
const WS = path.join(ROOT, 'hic-workspace');
const WIKI = path.join(WS, 'wiki');
const EVAL = path.join(WS, 'eval');
const FIXTURE = path.join(WIKI, 'engagements', 'identify-a-comprehensive-new-strategy-for-co-op-based-on-the');
const JOURNAL = path.join(WIKI, '.manifest.journal.jsonl');
const MANIFEST_BASE = path.join(WIKI, '.manifest.json');
const LEXICON = path.join(WIKI, 'frameworks', 'anti-slop-lexicon.json');

const args = new Set(process.argv.slice(2));
const r2 = (n) => Math.round(n * 100) / 100;
const pct = (a, b) => (b ? r2((a / b) * 100) : 0);
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };

// ---- helpers -------------------------------------------------------------
function walkStrings(obj, fn, depth = 0) {
  if (depth > 12 || obj == null) return;
  if (typeof obj === 'string') { if (obj.length <= 4000) fn(obj); return; }
  if (Array.isArray(obj)) { for (const v of obj) walkStrings(v, fn, depth + 1); return; }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (/image|avatar|portrait|photo|base64|dataUrl/i.test(k)) continue; // skip base64 blobs
      walkStrings(v, fn, depth + 1);
    }
  }
}
// EMBEDDED FALLBACK BANS (2026-06-17): the wiki anti-slop-lexicon.json is UNTRACKED and currently
// ABSENT, which made loadLexiconTerms() return [] -> banned_phrase_hits a DETECTOR-BLIND false 0
// (the "92 -> 0" diff was the file vanishing, not slop removal). Seed with the documented high-severity
// bans from .claude/CLAUDE.md so the metric is honest even without the file; union the file if present.
const EMBEDDED_BANS = [
  'paradigm shift', 'game-changer', 'game changer', 'holistic approach', 'cutting-edge', 'cutting edge',
  'best-in-class', 'best in class', 'leverage synergies', 'robust solution', 'seamless integration',
  'actionable insights', 'thought leadership', 'core competency', 'move the needle', 'circle back',
  'deep dive', 'low-hanging fruit', 'innovative solution', "in today's rapidly evolving landscape",
  "it's worth noting", 'it should be noted', 'needless to say', 'at the end of the day', 'the reality is',
  'delve', 'tapestry', 'testament', 'meticulous', 'nestled', 'vibrant', 'garner', 'interplay', 'intricate',
  'showcase', 'bolster', 'paramount', 'valuable insights', 'utilize', 'multifaceted', 'leveraging',
  'facilitate', 'pivotal', 'underscore', 'in the realm of',
];
function loadLexiconTerms() {
  const terms = new Set(EMBEDDED_BANS.map(t => t.toLowerCase()));
  if (exists(LEXICON)) {
    try {
      const lex = readJSON(LEXICON);
      const collect = (o, depth = 0) => {
        if (depth > 8 || o == null) return;
        if (Array.isArray(o)) { for (const v of o) { if (typeof v === 'string' && v.length >= 4 && v.length <= 60) terms.add(v.toLowerCase()); else collect(v, depth + 1); } return; }
        if (typeof o === 'object') for (const v of Object.values(o)) collect(v, depth + 1);
      };
      collect(lex);
    } catch { /* ignore */ }
  }
  return [...terms];
}
const isClientUpload = (s) => !!s && /(client-uploads|\.(txt|pdf|docx|pptx))$/i.test(s);

const stripHtml = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
let _lexCache = null;
function lexHits(text) { if (!_lexCache) _lexCache = loadLexiconTerms(); const lo = text.toLowerCase(); let h = 0; for (const t of _lexCache) if (lo.includes(t)) h++; return h; }
// Mechanical quality proxy (0-5), LENGTH-NEUTRAL (rate-based) — mirrors goldenSetRunner v1 (no LLM).
// Cleanliness-dominant: em-dash + banned-phrase RATE per 1k words (the failure modes the gate must
// catch), light evidence-density + substance terms capped so verbose raw text can't dominate.
function qualityProxy(text, citeCount = 0) {
  const words = (text.match(/[A-Za-z]{2,}/g) || []).length || 1;
  const per1k = (n) => (n / words) * 1000;
  const emdashRate = per1k((text.match(/—/g) || []).length);
  const slopRate = per1k(lexHits(text));
  const cleanliness = Math.max(0, 5 - Math.min(5, emdashRate * 1.5) - Math.min(5, slopRate * 0.8)); // 0-5
  const evidence = Math.min(5, per1k(citeCount) * 1.0);   // citations per 1k words
  const substance = Math.min(5, words / 300);             // light length floor, capped at ~1500 words
  return r2(cleanliness * 0.5 + evidence * 0.25 + substance * 0.25);
}
// Deliberate degradation control: inject the exact failure modes the self-improvement gate must catch
// (em-dashes + banned phrases). Length-neutral vs the clean original, so discrimination tests QUALITY.
function degrade(text) {
  const slop = ' leverage synergies. holistic approach. best-in-class. paradigm shift. it is important to note. delve into the rich tapestry. a game-changer. cutting-edge. seamless integration. move the needle.';
  let emdashed = text.replace(/\.\s/g, ' — '); // sentence breaks -> em-dashes (the #1 AI tell)
  return emdashed + (slop.repeat(Math.max(1, Math.round((text.match(/[A-Za-z]{2,}/g) || []).length / 400))));
}

// ---- PHASE 1: DATA COLLECTION (manifest retrievability / parity / provenance) ----
function phase1() {
  const out = { phase: 'DATA_COLLECTION', metrics: {}, probes: [] };
  // merge compacted base (.manifest.json {records:{...}}) + append-journal (last-wins by wikiPath)
  const byPath = new Map();
  let lines = 0;
  if (exists(MANIFEST_BASE)) {
    try {
      const base = readJSON(MANIFEST_BASE);
      const recsObj = base.records || base;
      for (const rec of Object.values(recsObj)) if (rec && rec.wikiPath) byPath.set(rec.wikiPath, rec);
    } catch (e) { out.probes.push('manifest base unreadable: ' + e.message); }
  }
  if (exists(JOURNAL)) {
    for (const line of fs.readFileSync(JOURNAL, 'utf8').split('\n')) {
      if (!line.trim()) continue; lines++;
      try { const rec = JSON.parse(line); if (rec.wikiPath) byPath.set(rec.wikiPath, rec); } catch { /* skip */ }
    }
  }
  const recs = [...byPath.values()];
  const corpusKinds = new Set(['article', 'social-post', 'transcript']);
  const chunkedCorpus = recs.filter(r => (r.chunk_count || 0) > 0 && corpusKinds.has(r.type));
  const tagged = chunkedCorpus.filter(r => (r.engagement || '') !== '');
  const articleRecs = recs.filter(r => r.type === 'article');
  const withProvenance = articleRecs.filter(r => (r.url || '') !== '' || (r.source || '') !== '' || (r.collected_at || '') !== '');
  out.metrics.journal_lines = lines;
  out.metrics.unique_manifest_records = recs.length;
  out.metrics.chunked_corpus_records = chunkedCorpus.length;
  out.metrics.chunk_retrievability_pct = pct(tagged.length, chunkedCorpus.length); // tier-1 (engagement-tagged) share
  out.metrics.chunk_retrievability_tagged = tagged.length;
  out.metrics.article_provenance_pct = pct(withProvenance.length, articleRecs.length);
  // fixture citation external-ratio + resolvability
  try {
    const themes = readJSON(path.join(FIXTURE, 'themes.json'))?.data?.themes || [];
    let cites = 0, ext = 0, named = 0;
    for (const t of themes) for (const c of (t.citations || [])) {
      cites++;
      const id = c.sourceFile || c.sourceName || '';
      if (id) named++;
      if (id && !isClientUpload(c.sourceFile || '') && !isClientUpload(c.sourceName || '')) ext++;
    }
    out.metrics.fixture_citation_count = cites;
    out.metrics.fixture_external_citation_pct = pct(ext, cites);   // >=60% floor (.claude/CLAUDE.md)
    out.metrics.fixture_citation_named_pct = pct(named, cites);    // resolvability proxy
  } catch (e) { out.probes.push('fixture themes citations unreadable: ' + e.message); }
  // anti-RAG (WS1.1): does generateStrategicReport ground via the manifest chunk corpus FIRST
  // (cite-by-pointer), with the rawSources bulk-injection only as a depth-safe fallback? (HIGHER better)
  let reportManifestFirst = 0, reportRawFallbackGated = 0;
  const gsvc = path.join(ROOT, 'services', 'geminiService.ts');
  if (exists(gsvc)) {
    const src = fs.readFileSync(gsvc, 'utf8');
    reportManifestFirst = /assembleDeliverableCorpus\('strategic-report'/.test(src) ? 1 : 0;
    reportRawFallbackGated = /if \(!evidenceCatalog && rawSources/.test(src) ? 1 : 0; // raw block now gated behind manifest-empty
  }
  out.metrics.report_grounds_via_manifest = reportManifestFirst;     // 1 = manifest-first (WS1.1 landed)
  out.metrics.report_raw_injection_gated = reportRawFallbackGated;   // 1 = raw bulk-inject demoted to fallback
  out.probes.push('LIVE: per-source/feed extraction yield + deep-research coverage need a live run');
  out.probes.push('WS1.1: report now manifest-first (assembleDeliverableCorpus), rawSources gated to fallback. Live report run still recommended to confirm prose depth holds; code path + fallback verified.');
  return out;
}

// ---- PHASE 2: THEMES (depth + relevancy to objective) ----
function phase2() {
  const out = { phase: 'THEMES', metrics: {}, probes: [] };
  try {
    const themes = readJSON(path.join(FIXTURE, 'themes.json'))?.data?.themes || [];
    const n = themes.length;
    const ga = themes.map(t => Number(t.goalAlignment)).filter(x => !Number.isNaN(x));
    const withExt = themes.filter(t => (t.citations || []).some(c => !isClientUpload(c.sourceFile || '') && !isClientUpload(c.sourceName || '') && (c.sourceFile || c.sourceName)));
    const validated = themes.filter(t => String(t.status || '').toLowerCase() === 'validated');
    const subCount = themes.reduce((s, t) => s + (t.subThemes?.length || 0), 0);
    const citeCount = themes.reduce((s, t) => s + (t.citations?.length || 0), 0);
    out.metrics.theme_count = n;                                   // floor 20
    out.metrics.theme_meets_breadth_floor = n >= 20;
    out.metrics.avg_goal_alignment = ga.length ? r2(ga.reduce((a, b) => a + b, 0) / ga.length) : 0; // relevancy-to-objective
    out.metrics.themes_with_external_citation_pct = pct(withExt.length, n);
    out.metrics.validated_pct = pct(validated.length, n);
    out.metrics.avg_citations_per_theme = n ? r2(citeCount / n) : 0;
    out.metrics.avg_subthemes_per_theme = n ? r2(subCount / n) : 0; // depth proxy
    // TRUE evidence depth: top-level citations + subTheme citationIndices refs + dimensions
    // (the prior avg_citations metric undercounted - themes carry evidence via subThemes/dimensions too).
    let evidenceRefs = 0, distinctSrcSum = 0;
    for (const t of themes) {
      const subRefs = (t.subThemes || []).reduce((s, st) => s + (Array.isArray(st.citationIndices) ? st.citationIndices.length : 0), 0);
      const dims = Array.isArray(t.dimensions) ? t.dimensions.length : 0;
      evidenceRefs += (t.citations?.length || 0) + subRefs + dims;
      const srcs = new Set((t.citations || []).map(c => (c.sourceName || c.sourceFile || '')).filter(Boolean));
      distinctSrcSum += srcs.size;
    }
    out.metrics.avg_evidence_refs_per_theme = n ? r2(evidenceRefs / n) : 0;       // true structural depth
    out.metrics.avg_distinct_sources_per_theme = n ? r2(distinctSrcSum / n) : 0;  // multi-source breadth
  } catch (e) { out.probes.push('themes.json unreadable: ' + e.message); }
  // lock the on-vision generation mechanism: prompt mandates multi-source evidence per theme
  const gsvc2 = path.join(ROOT, 'services', 'geminiService.ts');
  let themesMandateMultisource = 0;
  if (exists(gsvc2)) themesMandateMultisource = /at least 2 DIFFERENT source names/i.test(fs.readFileSync(gsvc2, 'utf8')) ? 1 : 0;
  out.metrics.themes_mandate_multisource = themesMandateMultisource;
  // P2 LIVE regen (scripts/live-themes-regen.mjs): real-engine themes on the real corpus with the
  // multi-source mandate -> measured OUTPUT depth vs the stale fixture (avg_distinct_sources=1).
  try {
    const lr = path.join(EVAL, 'themes-live-regen.json');
    if (exists(lr)) {
      const j = readJSON(lr);
      out.metrics.themes_live_distinct_sources_per_theme = j.avg_distinct_sources_per_theme; // vs fixture 1
      out.metrics.themes_live_multi_source_pct = j.multi_source_theme_pct;                    // vs fixture ~0
    }
  } catch { /* no live regen yet */ }
  out.probes.push('P2 mechanism is on-vision (mandates >=2 distinct sources/theme, goalAlignment relevancy gate, manifest grounding). Fixture avg_citations=1 is a stale 2026-05-26 generation; OUTPUT-depth gains require a LIVE themes regen to measure (the one phase that genuinely needs it).');
  return out;
}

// ---- PHASE 3: ANALYST CHAT (insight quality) ----  [greenfield — declare probes]
function phase3() {
  const out = { phase: 'ANALYST_CHAT', metrics: {}, probes: [] };
  const ccs = path.join(ROOT, 'services', 'corpusChatService.ts');
  let persists = 0, grounds = 0;
  if (exists(ccs)) {
    const src = fs.readFileSync(ccs, 'utf8');
    persists = /chat-insights/.test(src) ? 1 : 0;                 // NEW: chat insights written back to wiki (retrievable)
    grounds = /manifestChunkCorpus/.test(src) ? 1 : 0;           // grounding already manifest-selected (on-vision)
  }
  out.metrics.chat_grounds_via_manifest = grounds;
  out.metrics.chat_persists_insights = persists;                  // 0->1 = insight retrievability (P3 improvement)
  out.probes.push('Mechanism now: manifest-grounded chat (PRIMARY EVIDENCE, cite-by-pointer) + fire-and-forget insight write-back to synthesis/chat-insights (retrievability).');
  // P3 LIVE eval (scripts/live-analyst-chat-eval.mjs): goal-derived golden Qs answered by the real
  // engine on the real grounded corpus, scored on grounding (cited sources real = anti-hallucination)
  // + multi-source breadth. Replaces the "needs a golden Q/A live run" probe with measured output.
  try {
    const ce = path.join(EVAL, 'analyst-chat-eval.json');
    if (exists(ce)) {
      const j = readJSON(ce);
      out.metrics.chat_answered_ok = `${j.answered_ok}/${j.questions}`;
      out.metrics.chat_avg_distinct_sources_per_answer = j.avg_distinct_sources_per_answer;
      out.metrics.chat_multi_source_answer_pct = j.multi_source_answer_pct;
      out.metrics.chat_grounding_pct = j.grounding_pct;           // 100 = no hallucinated citations
    } else {
      out.probes.push('LIVE: run scripts/live-analyst-chat-eval.mjs to score answer grounding/breadth.');
    }
  } catch { /* no eval yet */ }
  return out;
}

// ---- PHASE 4: DELIVERABLES + DESIGN-SYSTEM CONSISTENCY ----
function phase4() {
  const out = { phase: 'DELIVERABLES_DESIGN', metrics: {}, probes: [] };
  const terms = loadLexiconTerms();
  const files = ['themes.json', 'personas.json', 'competitive.json', 'gap.json', 'journey.json', 'recs.json', 'briefs.json'];
  let slop = 0, emdash = 0, scanned = 0, parseOk = 0;
  for (const f of files) {
    const p = path.join(FIXTURE, f);
    if (!exists(p)) continue;
    try {
      const j = readJSON(p); parseOk++;
      walkStrings(j, (s) => {
        scanned++;
        if (s.includes('—')) emdash++;
        const lo = s.toLowerCase();
        for (const t of terms) if (lo.includes(t)) { slop++; break; }
      });
    } catch { /* parse fail counted via parseOk */ }
  }
  out.metrics.deliverables_parse_ok = `${parseOk}/${files.filter(f => exists(path.join(FIXTURE, f))).length}`;
  out.metrics.banned_phrase_hits = slop;      // lower=better
  out.metrics.em_dash_hits = emdash;          // must be 0
  out.metrics.strings_scanned = scanned;
  // design-system consistency: count raw brand-hex literals in renderer bodies (lower=better; WS4 target)
  const BRAND_HEX = /#(115054|00b7c3|b8b800|cc6644|c8102e|d41b2c|a4804a|0e1626|16233c)\b/gi;
  const renderFiles = [
    path.join(ROOT, 'components', 'slideTemplates', 'web.tsx'),
    path.join(ROOT, 'components', 'slideTemplates', 'pptx.ts'),
    path.join(ROOT, 'services', 'slideToStageHtml.ts'),
  ];
  let hardcoded = 0;
  for (const rf of renderFiles) { if (exists(rf)) { const m = fs.readFileSync(rf, 'utf8').match(BRAND_HEX); hardcoded += m ? m.length : 0; } }
  out.metrics.renderer_hardcoded_brand_hex = hardcoded; // directional; some are legit fallbacks
  // export font-href must be DERIVED from token faces (not a static list) so token swaps actually load
  // (WS4 guardrail: locks the Saira-Condensed/Lato font-load fix against silent regression)
  let fontHrefTokenDerived = 0;
  const stageF = path.join(ROOT, 'services', 'slideToStageHtml.ts');
  if (exists(stageF)) {
    const src = fs.readFileSync(stageF, 'utf8');
    fontHrefTokenDerived = (/_fams/.test(src) && /family=\$\{/.test(src) && /fontsHref/.test(src)) ? 1 : 0;
  }
  out.metrics.export_fonthref_token_derived = fontHrefTokenDerived; // 1=dynamic (good), 0=static list (regression)
  // design-system consistency (2026-06-17): do the renderer twins actually emit the Figma image-slots
  // (per wiki/brand/image-slots)? The journey twin was wired this epoch to render the per-phase
  // illustration row (phaseImages -> jmthumb), closing the "Figma canon only, not in deliverables" gap.
  // 1 = both twins render it (renderer<->Figma fidelity); 0 = slots live in Figma but never ship.
  const sths = path.join(ROOT, 'services', 'slideToStageHtml.ts');
  const webtsx = path.join(ROOT, 'components', 'slideTemplates', 'web.tsx');
  const stageSlots = exists(sths) && /jmthumb/.test(fs.readFileSync(sths, 'utf8')) && /phaseImages/.test(fs.readFileSync(sths, 'utf8'));
  const webSlots = exists(webtsx) && /phaseImages/.test(fs.readFileSync(webtsx, 'utf8'));
  out.metrics.renderer_renders_figma_image_slots = (stageSlots && webSlots) ? 1 : 0; // HIGHER better
  out.probes.push('LIVE: action-title rate, prose quality, PPTX render fidelity + token-match need live export + auditors');
  return out;
}

// ---- PHASE 5: DESIGNER CHAT (error reduction + content quality) ----
function phase5() {
  const out = { phase: 'DESIGNER_CHAT', metrics: {}, probes: [] };
  // offline proxy: scan curated sample freeform artifacts for em-dash/banned-phrase if present
  const sampleDir = path.join(WS, 'sample-artifacts');
  let files = [];
  try {
    for (const e of fs.readdirSync(sampleDir, { withFileTypes: true })) {
      if (e.isDirectory()) { try { files.push(...fs.readdirSync(path.join(sampleDir, e.name)).filter(f => /\.(html|json|md)$/i.test(f))); } catch { /* skip */ } }
      else if (/\.(html|json|md)$/i.test(e.name)) files.push(e.name);
    }
  } catch { /* none */ }
  out.metrics.sample_artifacts_found = files.length;
  // P5 error-reduction (WS5): does the designer slide-spec parser have a syntax-repair fallback for
  // truncated/malformed model JSON (the #1 designer-chat failure mode)? (HIGHER better)
  let slideSpecRecovery = 0;
  const c2s = path.join(ROOT, 'design-desk', 'services', 'chatToSlideSpec.ts');
  if (exists(c2s)) slideSpecRecovery = /_repairJsonSlice/.test(fs.readFileSync(c2s, 'utf8')) ? 1 : 0;
  out.metrics.designer_slidespec_json_recovery = slideSpecRecovery;
  // P5 LIVE A/B (scripts/live-designer-chat-eval.mjs): same engine + same #brief task, anti-slop
  // guardrails OFF vs ON, scored by the shared anti-slop checks -> measured error reduction + the
  // ON-arm error count (the artifact the user actually ships). Replaces the "needs a live run" probe.
  try {
    const de = path.join(EVAL, 'designer-chat-eval.json');
    if (exists(de)) {
      const j = readJSON(de);
      out.metrics.designer_error_reduction_pct = j.error_reduction_pct;     // (off-on)/off
      out.metrics.designer_on_total_errors = j.designer_on_total_errors;    // lower=better (shipped arm)
      out.metrics.designer_on_json_parse_ok = j.designer_json_parse_ok;
    } else {
      out.probes.push('LIVE: run scripts/live-designer-chat-eval.mjs to score designer error-rate.');
    }
  } catch { /* no eval yet */ }
  return out;
}

// ---- PHASE 6: SELF-IMPROVEMENT (recursive + human-in-loop + SkillOpt) ----
function phase6() {
  const out = { phase: 'SELF_IMPROVEMENT', metrics: {}, probes: [] };
  const gsPath = exists(path.join(WIKI, 'eval', 'golden-set.json')) ? path.join(WIKI, 'eval', 'golden-set.json')
    : (exists(path.join(EVAL, 'golden-set.json')) ? path.join(EVAL, 'golden-set.json') : null);
  out.metrics.golden_set_present = !!gsPath;
  if (gsPath) {
    try {
      const gs = readJSON(gsPath);
      const exemplars = gs.tiers?.positive_exemplars?.registered || [];
      const cleanScores = [], degradedScores = [];
      for (const ex of exemplars) {
        const p = ex.html_twin ? path.join(ROOT, ex.html_twin) : null;
        if (!p || !exists(p)) continue;
        const txt = stripHtml(fs.readFileSync(p, 'utf8'));
        const cites = (txt.match(/source[: ]/gi) || []).length;
        cleanScores.push(qualityProxy(txt, cites));
        degradedScores.push(qualityProxy(degrade(txt), cites)); // same content, injected failure modes
      }
      const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
      const exMean = r2(mean(cleanScores)), degMean = r2(mean(degradedScores));
      out.metrics.golden_set_exemplars_scored = cleanScores.length;
      out.metrics.golden_set_exemplar_mean = exMean;       // clean curated exemplars
      out.metrics.golden_set_degraded_mean = degMean;      // same content, degraded control
      out.metrics.golden_set_discrimination_proxy = r2(exMean - degMean); // >0 => scorer catches degradation
      out.metrics.golden_set_discriminates = (exMean - degMean) > 0;      // gate-quality guardrail
      out.probes.push('discrimination_proxy = clean exemplar vs deliberately-degraded control (same content + injected em-dashes/banned-phrases), LENGTH-NEUTRAL. Validates the scorer catches quality degradation (the gate\'s actual job) before the live gate is trusted. Live runGate uses the full qualityFrontier vector + /api/golden-set/failure-corpus.');
    } catch (e) { out.probes.push('golden-set scoring error: ' + e.message); }
  }
  const lc = path.join(WIKI, 'synthesis', 'learned-constraints.md');
  out.metrics.learned_constraints_count = exists(lc) ? (fs.readFileSync(lc, 'utf8').match(/CONSTRAINT/g) || []).length : 0;
  const rej = path.join(WIKI, 'synthesis', 'hook-rejection-log.md');
  out.metrics.hook_rejections_logged = exists(rej) ? fs.readFileSync(rej, 'utf8').split('\n').filter(l => l.trim().startsWith('{')).length : 0;
  out.metrics.epochs_ledger_present = exists(path.join(WIKI, 'synthesis', 'improvement-epochs.md'));
  out.probes.push('GAP: golden-set discrimination gate not runnable until golden-set.json exists (WS2).');
  out.probes.push('LIVE: epoch quality-delta trend needs goldenSetRunner + a frozen golden set.');
  return out;
}

// pass^k (ECC-adopted 2026-07-01): the STRICTER sibling of pass@k. pass@k passes if AT LEAST ONE of
// k runs succeeds; pass^k (pass-to-the-k) passes only if ALL k runs agree. For a research workbench
// the load-bearing use is DETERMINISM/IDENTITY: the standing rule is "same corpus + goal -> identical
// theme/persona/deck identity" (temp0 + seed). An identity field is stable only if every one of the k
// repeated runs produced the byte-identical value; a single divergence fails the gate.
function passPowK(runs, fields) {
  if (!Array.isArray(runs) || runs.length < 2) return null;
  const get = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  let stable = 0; const unstable = [];
  for (const f of fields) {
    const vals = runs.map(r => JSON.stringify(get(r, f) ?? null));
    if (vals.every(v => v === vals[0])) stable++; else unstable.push(f);
  }
  return { k: runs.length, fields: fields.length, stable, unstable, passPowK: stable === fields.length, ratio: r2(stable / (fields.length || 1)) };
}

// PHASE 7 - DETERMINISM (pass^k identity gate). Scores a cached determinism fixture if present (FREE:
// no live model calls); otherwise emits a LIVE probe so the k identical-input runs are opt-in (spend-
// aware, per the "live runs cost money" rule). Fixture shape: eval/determinism-runs.json =
// [{ themeLabels:[], personaNames:[], deckThesis:'', slideTitles:[] }, ...] from k SAME corpus+goal runs.
function phase7() {
  const out = { phase: 'DETERMINISM', metrics: {}, probes: [] };
  const detPath = exists(path.join(EVAL, 'determinism-runs.json')) ? path.join(EVAL, 'determinism-runs.json') : null;
  out.metrics.determinism_runs_present = !!detPath;
  if (detPath) {
    try {
      const runs = readJSON(detPath);
      const res = passPowK(runs, ['themeLabels', 'personaNames', 'deckThesis', 'slideTitles']);
      if (res) {
        out.metrics.determinism_k = res.k;
        out.metrics.identity_fields_scored = res.fields;
        out.metrics.identity_fields_stable = res.stable;
        out.metrics.identity_pass_pow_k = res.passPowK;      // TRUE only if ALL k runs agree on ALL identity fields
        out.metrics.identity_stability_ratio = res.ratio;
        if (!res.passPowK) out.probes.push('pass^k FAIL - unstable identity fields across runs: ' + res.unstable.join(', ') + '. Same corpus+goal must yield identical identity (temp0+seed). Fix UPSTREAM (determinism), never by relaxing the gate.');
      }
    } catch (e) { out.probes.push('determinism scoring error: ' + e.message); }
  } else {
    out.probes.push('pass^k IDENTITY GATE (ECC-adopted): eval/determinism-runs.json absent. LIVE (opt-in, costs k generations): run the same fixed corpus+goal k=3 times (temp0+seed) and record { themeLabels, personaNames, deckThesis, slideTitles } per run into eval/determinism-runs.json; pass^3 must = 100% (all 3 byte-identical).');
  }
  return out;
}

// ---- run ----
const report = {
  generated_at_note: 'timestamp omitted for deterministic diffs; set by --baseline freeze',
  fixture: path.relative(ROOT, FIXTURE),
  phases: [phase1(), phase2(), phase3(), phase4(), phase5(), phase6(), phase7()],
};

if (!exists(EVAL)) fs.mkdirSync(EVAL, { recursive: true });
const latestPath = path.join(EVAL, 'benchmark-latest.json');
fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

// scorecard md
let md = `# HiC Benchmark Scorecard\n\nFixture: \`${report.fixture}\`\n\n`;
for (const ph of report.phases) {
  md += `## ${ph.phase}\n\n`;
  for (const [k, v] of Object.entries(ph.metrics)) md += `- ${k}: **${v}**\n`;
  if (ph.probes?.length) { md += `\n_probes / gaps:_\n`; for (const p of ph.probes) md += `  - ${p}\n`; }
  md += `\n`;
}
fs.writeFileSync(path.join(EVAL, 'benchmark-scorecard.md'), md);

if (args.has('--baseline')) {
  fs.writeFileSync(path.join(EVAL, 'benchmark-baseline.json'), JSON.stringify(report, null, 2));
  console.log('Froze baseline -> eval/benchmark-baseline.json');
}

// diff vs baseline
if (args.has('--diff')) {
  const basePath = path.join(EVAL, 'benchmark-baseline.json');
  // 2026-10-01 (plan Stage 0/5, audit C9): a missing baseline is a FAILED diff, not a pass. Exiting 0 here
  // made regression-obligations.mjs obligation 4 vacuous (no frozen baseline -> every promotion "passed").
  if (!exists(basePath)) { console.error('No baseline to diff: eval/benchmark-baseline.json is missing. Freeze one with --baseline (and commit it). Exit 1.'); process.exit(1); }
  const base = readJSON(basePath);
  let regressions = 0;
  const HIGHER_BETTER = new Set(['chunk_retrievability_pct', 'article_provenance_pct', 'fixture_external_citation_pct', 'fixture_citation_named_pct', 'theme_count', 'avg_goal_alignment', 'themes_with_external_citation_pct', 'validated_pct', 'avg_citations_per_theme', 'avg_subthemes_per_theme', 'learned_constraints_count', 'export_fonthref_token_derived', 'golden_set_discrimination_proxy', 'golden_set_exemplar_mean', 'report_grounds_via_manifest', 'report_raw_injection_gated', 'designer_slidespec_json_recovery', 'sample_artifacts_found', 'chat_persists_insights', 'chat_grounds_via_manifest', 'avg_evidence_refs_per_theme', 'avg_distinct_sources_per_theme', 'themes_mandate_multisource', 'themes_live_distinct_sources_per_theme', 'themes_live_multi_source_pct']);
  const LOWER_BETTER = new Set(['banned_phrase_hits', 'em_dash_hits', 'renderer_hardcoded_brand_hex', 'hook_rejections_logged']);
  for (let i = 0; i < report.phases.length; i++) {
    const cur = report.phases[i].metrics, old = base.phases[i]?.metrics || {};
    for (const k of Object.keys(cur)) {
      if (typeof cur[k] !== 'number' || typeof old[k] !== 'number') continue;
      const d = r2(cur[k] - old[k]);
      if (d === 0) continue;
      const worse = (HIGHER_BETTER.has(k) && d < 0) || (LOWER_BETTER.has(k) && d > 0);
      if (worse) regressions++;
      console.log(`${worse ? 'REGRESS' : 'ok     '} ${report.phases[i].phase}.${k}: ${old[k]} -> ${cur[k]} (${d > 0 ? '+' : ''}${d})`);
    }
  }
  console.log(regressions ? `\n${regressions} REGRESSION(S)` : '\nno regressions');
  process.exit(regressions ? 1 : 0);
}

// console summary
console.log(md);
