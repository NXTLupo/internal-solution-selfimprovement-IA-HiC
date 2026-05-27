/**
 * prove-strategy-gemini.mjs — end-to-end proof that Gemini Flash can generate
 * a strategy deliverable through the SAME code path the SPA uses, and that
 * the new JSON salvage ladder catches whatever Gemini emits.
 *
 * Flow:
 *   1. POST a strategy-deck-structure prompt to localhost:5012/api/ai/gemini
 *      (same proxy + same payload shape generateDeckStructure() uses).
 *   2. Pull the raw text out of the Gemini envelope.
 *   3. Run it through JSON.parse → tryRepairJson → salvageJsonArray, exactly
 *      like the new filterAndScoreItems / refineSearchQueries code paths.
 *   4. Print the resulting strategy deck structure (titles + layouts +
 *      rationales) so you can see real Gemini-generated consulting output.
 *
 * Exits 1 on any failure. No silent fallbacks.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- inline-transpile the salvage helpers from aiRouter.ts ---
const aiRouterPath = resolve(__dirname, 'services/aiRouter.ts');
const aiRouterSrc = readFileSync(aiRouterPath, 'utf8');
const cutoff = aiRouterSrc.indexOf('// --- MODEL REGISTRY ---');
const slice = cutoff > 0 ? aiRouterSrc.slice(0, cutoff) : aiRouterSrc;
const transpiled = transformSync(slice, { loader: 'ts', format: 'esm', target: 'es2022' }).code;
const mod = await import('data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64'));
const { tryRepairJson, salvageJsonArray } = mod;

// --- the actual strategy-deck-structure prompt (cut down from
// geminiService.ts:3462 — the prompt the live deck generator uses) ---
const goal = 'Identify a comprehensive new strategy for co-op based on the current Statement of Work for Northeastern University. Focus on first-year retention, employer ATS friction, and the Comprehensive Learner Record (CLR) integration.';

const availableDeliverables = {
    themes: [
        { title: 'Employer ATS friction', summary: 'Top employers (60% of NU co-op pipeline) require structured candidate data that NU Banner cannot export.', evidenceCount: 12 },
        { title: 'CLR adoption gap', summary: 'Only 11% of US universities have implemented IMS Global CLR standard; NU could lead via accreditation push.', evidenceCount: 8 },
        { title: 'First-year mobility risk', summary: '23% of first-years transfer before sophomore year; co-op alignment is a top-3 stated reason for retention.', evidenceCount: 14 },
    ],
    personas: [
        { name: 'Maya', role: 'First-year exploratory student', quote: 'I picked NU for co-op but I don\'t know what major lets me get the best one.' },
        { name: 'Devon', role: 'Employer talent acquisition lead', quote: 'I need a structured candidate file I can pipe into Workday — not a PDF transcript.' },
    ],
    competitiveAnalysis: {
        peers: ['Drexel (gold standard co-op)', 'Waterloo (Canadian benchmark)', 'Cincinnati (alternating-semester model)'],
        ourScore: 78,
        bestInClass: 92,
    },
};

// Same shape as the live `generateDeckStructure` prompt (trimmed for the proof).
const prompt = `STEP: DECK STRUCTURE. You are a McKinsey-trained presentation strategist building an executive research deck.

MINTO'S PYRAMID PRINCIPLE (non-negotiable):
- Every slide title MUST be a COMPLETE SENTENCE stating a conclusion — NOT a topic label
- BAD: "Market Overview", "Current Challenges"
- GOOD: "23% of first-years transfer before sophomore year, citing co-op uncertainty as a top-3 reason"
- All arguments must be MECE.

RUMELT'S KERNEL (the deck must contain all three):
1. DIAGNOSIS: ONE specific challenge with evidence.
2. GUIDING POLICY: ONE strategic choice that excludes alternatives.
3. COHERENT ACTIONS: 5-7 actions that support EACH OTHER.

7 SLIDE ARCHETYPES (use ONLY these):
- TITLE_SLIDE, SECTION_HEADER, CONTENT_DATA_PANEL, CONTENT_INSIGHT_CHART, FULL_WIDTH_VIZ, BENTO_GRID, PROBLEM_SOLUTION

RESEARCH GOAL: ${goal}

AVAILABLE DELIVERABLES:
${JSON.stringify(availableDeliverables, null, 2)}

Generate a deck of 10-14 slides. Output a single JSON object:
{
  "methodology": "1-2 sentence framing of the analytical approach",
  "storyArc": "1-2 sentence narrative arc (Situation → Complication → Resolution)",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "TITLE_SLIDE",
      "title": "<complete sentence stating conclusion>",
      "rationale": "<one sentence: why this slide, what evidence>",
      "sourceDeliverable": "themes|personas|competitiveAnalysis|composite"
    },
    ...
  ]
}

Return ONLY the JSON object, no prose before or after.`;

// --- call the same proxy endpoint the SPA hits ---
console.log('1. Calling Gemini 3.5 Flash via /api/ai/gemini (the same proxy the SPA uses)...\n');
const t0 = Date.now();
const resp = await fetch('http://localhost:5012/api/ai/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
            thinkingBudget: 'medium',
        },
    }),
});
const elapsedMs = Date.now() - t0;
console.log(`   HTTP ${resp.status} in ${(elapsedMs / 1000).toFixed(1)}s\n`);
if (!resp.ok) {
    console.error('Gemini call failed.');
    console.error(await resp.text());
    process.exit(1);
}
const data = await resp.json();

// --- pull raw text out of the envelope the same way the services do ---
const rawText = (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p?.text || '')
    .join('') || '';
const finishReason = data?.candidates?.[0]?.finishReason || 'unknown';
console.log(`2. Raw response (${rawText.length} chars, finishReason=${finishReason})`);
console.log(`   First 200 chars: ${rawText.slice(0, 200).replace(/\n/g, ' ')}...`);
console.log(`   Last 200 chars: ...${rawText.slice(-200).replace(/\n/g, ' ')}\n`);

// --- run through the new salvage ladder ---
console.log('3. Parsing via the new JSON ladder: JSON.parse → tryRepairJson → salvage...');
let cleaned = rawText.trim();
if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0].trim();
else if (cleaned.includes('```')) cleaned = cleaned.split('```')[1].split('```')[0].trim();

let parsed = null;
let parsePath = '';
try {
    parsed = JSON.parse(cleaned);
    parsePath = 'JSON.parse (clean output)';
} catch (e1) {
    try {
        parsed = JSON.parse(tryRepairJson(cleaned));
        parsePath = 'tryRepairJson (recovered from minor damage)';
    } catch (e2) {
        // For an object-shaped response we'd reach for salvageJsonObject; the
        // strategy structure has a nested `slides` array, so an array salvage
        // would only recover slides. Object salvage on the outer is the right
        // tool here.
        const { salvageJsonObject } = mod;
        const salvaged = salvageJsonObject(cleaned);
        if (Object.keys(salvaged).length > 0) {
            parsed = salvaged;
            parsePath = `salvageJsonObject (recovered ${Object.keys(salvaged).length} fields after parse failure)`;
        } else {
            console.error('\nFAILED: salvage path could not recover any object.');
            console.error('Raw text:', rawText);
            process.exit(1);
        }
    }
}
console.log(`   Parsed via: ${parsePath}\n`);

// --- structural validation ---
console.log('4. Validating structure...');
const checks = [
    ['methodology is a non-empty string', typeof parsed?.methodology === 'string' && parsed.methodology.length > 10],
    ['storyArc is a non-empty string', typeof parsed?.storyArc === 'string' && parsed.storyArc.length > 10],
    ['slides is an array', Array.isArray(parsed?.slides)],
    ['slides has 8+ entries', Array.isArray(parsed?.slides) && parsed.slides.length >= 8],
    ['every slide has a title', Array.isArray(parsed?.slides) && parsed.slides.every(s => typeof s?.title === 'string' && s.title.length > 0)],
    ['every slide has a layout', Array.isArray(parsed?.slides) && parsed.slides.every(s => typeof s?.layout === 'string')],
    ['titles are sentences (have a verb-ish word — heuristic: title has 5+ words OR ends with period)',
        Array.isArray(parsed?.slides) && parsed.slides.every(s => {
            const t = s?.title || '';
            return t.split(/\s+/).length >= 5 || /[.!]$/.test(t);
        })],
    ['layouts are from the allowed enum', Array.isArray(parsed?.slides) && parsed.slides.every(s =>
        ['TITLE_SLIDE', 'SECTION_HEADER', 'CONTENT_DATA_PANEL', 'CONTENT_INSIGHT_CHART', 'FULL_WIDTH_VIZ', 'BENTO_GRID', 'PROBLEM_SOLUTION'].includes(s.layout)
    )],
];
let failCount = 0;
for (const [label, ok] of checks) {
    console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) failCount += 1;
}

// --- print the actual strategy output ---
console.log('\n5. GENERATED STRATEGY DELIVERABLE (real Gemini Flash output):');
console.log('   ─────────────────────────────────────────────────────────────');
console.log(`   METHODOLOGY: ${parsed.methodology}`);
console.log(`   STORY ARC:   ${parsed.storyArc}`);
console.log(`   SLIDES (${parsed.slides.length}):\n`);
for (const s of parsed.slides) {
    console.log(`   #${String(s.slideNumber || '?').padStart(2)}  [${s.layout.padEnd(20)}]  ${s.title}`);
    if (s.rationale) console.log(`         rationale: ${s.rationale}`);
    if (s.sourceDeliverable) console.log(`         source:    ${s.sourceDeliverable}`);
    console.log('');
}
console.log('   ─────────────────────────────────────────────────────────────');

// --- save for inspection ---
const outPath = resolve(__dirname, 'prove-strategy-gemini.output.json');
writeFileSync(outPath, JSON.stringify({
    elapsed_ms: elapsedMs,
    finish_reason: finishReason,
    parse_path: parsePath,
    raw_chars: rawText.length,
    parsed,
}, null, 2));
console.log(`\n   Full output written to: ${outPath}`);

if (failCount > 0) {
    console.error(`\nSTRUCTURAL VALIDATION FAILED — ${failCount} check(s) did not pass.`);
    process.exit(1);
}
console.log(`\nSTRATEGY DELIVERABLE GENERATED OK via Gemini Flash + new salvage ladder.`);
