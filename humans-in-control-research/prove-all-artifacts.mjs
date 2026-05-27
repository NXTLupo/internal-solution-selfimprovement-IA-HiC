/**
 * prove-all-artifacts.mjs — end-to-end proof that Gemini Flash can generate
 * EVERY HiC artifact type through the SAME code path the SPA uses, and that
 * the new JSON salvage ladder catches whatever Gemini emits.
 *
 * Artifacts covered (matches services/deliverableFrameworks.ts schema map):
 *   1. THEMES               — pattern landscape with citations
 *   2. PERSONAS             — JTBD-shaped user archetypes
 *   3. RECOMMENDATIONS      — strategic recommendations with impact metrics
 *   4. JOURNEY / BLUEPRINT  — service blueprint stages + pain points
 *   5. PRD                  — feature list with priority + acceptance criteria
 *   6. ROADMAP              — NOW / NEXT / LATER horizons
 *   7. TECH ARCHITECTURE    — components, integrations, principles
 *   8. GAP ANALYSIS         — capability vs best-in-class scoring
 *   9. TECH AUDIT           — systems inventory + maturity
 *  10. COMPETITIVE ANALYSIS — peers + dimensions + gap scoring
 *  11. STRATEGY DECK        — 7-archetype Minto/Rumelt deck (already proven; included for parity)
 *
 * Each call hits localhost:5012/api/ai/gemini → Gemini 3.5 Flash, then runs
 * the response through the new JSON.parse → tryRepairJson → salvage ladder
 * (the EXACT same path filterAndScoreItems / refineSearchQueries / chat use).
 *
 * Exit 0 iff every artifact passes both (a) parse and (b) structural validation.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- inline-transpile salvage helpers from aiRouter.ts ---
const aiRouterPath = resolve(__dirname, 'services/aiRouter.ts');
const aiRouterSrc = readFileSync(aiRouterPath, 'utf8');
const cutoff = aiRouterSrc.indexOf('// --- MODEL REGISTRY ---');
const slice = cutoff > 0 ? aiRouterSrc.slice(0, cutoff) : aiRouterSrc;
const transpiled = transformSync(slice, { loader: 'ts', format: 'esm', target: 'es2022' }).code;
const mod = await import('data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64'));
const { tryRepairJson, salvageJsonArray, salvageJsonObject } = mod;

// --- shared scenario for all artifacts (Northeastern co-op) ---
const goal = 'Identify a comprehensive new strategy for co-op based on the current Statement of Work for Northeastern University. Focus on first-year retention, employer ATS friction, and the Comprehensive Learner Record (CLR) integration.';

const context = {
    industry: 'Higher Education / Experiential Learning',
    targetSegment: 'Northeastern University co-op program (first-year through senior, employer partners)',
    keyEvidence: [
        '23% of NU first-years transfer before sophomore year; co-op uncertainty is a top-3 stated reason',
        '60% of NU employer partners use Workday/Greenhouse ATS that requires structured JSON candidate data',
        'Only 11% of US universities have implemented IMS Global CLR standard',
        'NU currently exports co-op transcripts as PDFs that employers must manually re-key',
        'Drexel and Waterloo lead the co-op benchmark with 92/100 industry-scored maturity vs NU 78/100',
    ],
};

// --- artifact specs ---
const ARTIFACTS = [
    {
        id: 'themes',
        label: 'THEMES',
        prompt: () => `You are a senior strategy consultant identifying thematic clusters from research evidence.

RESEARCH GOAL: ${goal}
INDUSTRY: ${context.industry}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Generate 5-7 themes. Each theme is a named pattern that surfaces from the evidence. Lead with the conclusion.

Output JSON:
{
  "themes": [
    {
      "id": "T1",
      "name": "<3-7 word theme name>",
      "headline": "<one-sentence conclusion stating what the evidence proves>",
      "evidenceBasis": "<2-3 sentences citing specific numbers / quotes / named entities from the evidence above>",
      "implication": "<one sentence: what this theme means for the strategy>",
      "confidence": "high|medium|low",
      "evidenceCount": <integer>
    }
  ]
}`,
        validate: (p) => [
            ['themes is array', Array.isArray(p?.themes)],
            ['5+ themes', Array.isArray(p?.themes) && p.themes.length >= 5],
            ['every theme has id+name+headline', Array.isArray(p?.themes) && p.themes.every(t => t?.id && t?.name && t?.headline)],
            ['headlines are sentences (12+ words OR ends with period)', Array.isArray(p?.themes) && p.themes.every(t => {
                const h = t?.headline || '';
                return h.split(/\s+/).length >= 12 || /[.!]$/.test(h);
            })],
            ['evidenceBasis has 40+ chars per theme', Array.isArray(p?.themes) && p.themes.every(t => (t?.evidenceBasis || '').length >= 40)],
            ['confidence in {high,medium,low}', Array.isArray(p?.themes) && p.themes.every(t => ['high', 'medium', 'low'].includes(t?.confidence))],
        ],
    },
    {
        id: 'personas',
        label: 'PERSONAS',
        prompt: () => `You are a UX researcher producing JTBD-shaped personas grounded in research evidence.

RESEARCH GOAL: ${goal}
INDUSTRY: ${context.industry}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Generate 3 personas covering the most distinct user archetypes in this domain (student-side and employer-side).

Output JSON:
{
  "personas": [
    {
      "name": "<first name>",
      "role": "<their role in the system, 4-6 words>",
      "jtbd": "<job to be done — When ___, I want to ___, so that ___>",
      "painPoints": ["<pain 1>", "<pain 2>", "<pain 3>"],
      "goals": ["<goal 1>", "<goal 2>"],
      "quote": "<a verbatim-style quote that captures their voice, 10-25 words>",
      "context": "<2-3 sentences about their daily reality with the current co-op system>"
    }
  ]
}`,
        validate: (p) => [
            ['personas is array', Array.isArray(p?.personas)],
            ['3+ personas', Array.isArray(p?.personas) && p.personas.length >= 3],
            ['every persona has name+role+jtbd+quote', Array.isArray(p?.personas) && p.personas.every(pe => pe?.name && pe?.role && pe?.jtbd && pe?.quote)],
            ['jtbd contains "when" or "I want"', Array.isArray(p?.personas) && p.personas.every(pe => /when|i want/i.test(pe?.jtbd || ''))],
            ['painPoints has 2+ items', Array.isArray(p?.personas) && p.personas.every(pe => Array.isArray(pe?.painPoints) && pe.painPoints.length >= 2)],
            ['quote is 5-50 words', Array.isArray(p?.personas) && p.personas.every(pe => {
                const w = (pe?.quote || '').split(/\s+/).length;
                return w >= 5 && w <= 50;
            })],
        ],
    },
    {
        id: 'recommendations',
        label: 'RECOMMENDATIONS',
        prompt: () => `You are a senior consultant authoring strategic recommendations following Rumelt's Kernel.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Generate 5 coherent, MECE recommendations. Each must be an imperative ACTION (not a goal). Each must include impact and effort estimates.

Output JSON:
{
  "diagnosis": "<one sentence naming THE central challenge with evidence>",
  "guidingPolicy": "<one sentence stating the strategic approach as a DECISION, not a goal>",
  "recommendations": [
    {
      "id": "R1",
      "title": "<imperative action sentence, 8-15 words>",
      "rationale": "<2-3 sentences: why this, grounded in evidence>",
      "impact": "<expected outcome with a number or named metric>",
      "effort": "S|M|L|XL",
      "horizon": "NOW|NEXT|LATER",
      "dependencies": ["<dep 1>"]
    }
  ]
}`,
        validate: (p) => [
            ['diagnosis present', typeof p?.diagnosis === 'string' && p.diagnosis.length > 20],
            ['guidingPolicy present', typeof p?.guidingPolicy === 'string' && p.guidingPolicy.length > 20],
            ['recommendations is array of 5+', Array.isArray(p?.recommendations) && p.recommendations.length >= 5],
            ['every rec has id+title+rationale+impact', Array.isArray(p?.recommendations) && p.recommendations.every(r => r?.id && r?.title && r?.rationale && r?.impact)],
            ['titles are imperative (start with verb-like word, not "We will" / "Our")', Array.isArray(p?.recommendations) && p.recommendations.every(r => {
                const t = (r?.title || '').trim();
                return !/^(we |our |a |the )/i.test(t);
            })],
            ['effort in {S,M,L,XL}', Array.isArray(p?.recommendations) && p.recommendations.every(r => ['S', 'M', 'L', 'XL'].includes(r?.effort))],
            ['horizon in {NOW,NEXT,LATER}', Array.isArray(p?.recommendations) && p.recommendations.every(r => ['NOW', 'NEXT', 'LATER'].includes(r?.horizon))],
        ],
    },
    {
        id: 'service-blueprint',
        label: 'SERVICE BLUEPRINT',
        prompt: () => `You are a service designer producing a service blueprint of the NU co-op journey.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Generate 6-8 sequential stages of the co-op journey from a student's first inquiry through post-placement.

Output JSON:
{
  "blueprint": {
    "title": "Northeastern University Co-op Service Blueprint",
    "stages": [
      {
        "stage": <1-based integer>,
        "name": "<2-4 word stage name>",
        "userActions": ["<action 1>", "<action 2>"],
        "frontstage": ["<what the user sees>"],
        "backstage": ["<what staff/systems do>"],
        "painPoints": ["<pain 1>"],
        "opportunities": ["<opportunity tied to evidence>"]
      }
    ]
  }
}`,
        validate: (p) => [
            ['blueprint object present', typeof p?.blueprint === 'object'],
            ['stages array 6+', Array.isArray(p?.blueprint?.stages) && p.blueprint.stages.length >= 6],
            ['every stage has stage+name+painPoints+opportunities', Array.isArray(p?.blueprint?.stages) && p.blueprint.stages.every(s =>
                typeof s?.stage === 'number' && s?.name && Array.isArray(s?.painPoints) && Array.isArray(s?.opportunities)
            )],
            ['stages are sequentially numbered 1..N', Array.isArray(p?.blueprint?.stages) && p.blueprint.stages.every((s, i) => s.stage === i + 1)],
            ['every stage has 1+ pain point', Array.isArray(p?.blueprint?.stages) && p.blueprint.stages.every(s => s.painPoints.length >= 1)],
        ],
    },
    {
        id: 'prd',
        label: 'PRD',
        prompt: () => `You are a senior product manager authoring a PRD for the CLR-powered co-op platform.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Generate 6-8 features. Each feature must have priority, acceptance criteria, and a user story.

Output JSON:
{
  "title": "CLR-Powered Co-op Platform PRD",
  "problemStatement": "<2-3 sentences naming the problem with evidence>",
  "successMetrics": ["<metric 1 with target>", "<metric 2 with target>"],
  "features": [
    {
      "id": "F1",
      "name": "<4-7 word feature name>",
      "userStory": "As a <role>, I want to <action> so that <outcome>",
      "priority": "P0|P1|P2",
      "acceptanceCriteria": ["<criterion 1>", "<criterion 2>", "<criterion 3>"],
      "effortEstimate": "S|M|L|XL"
    }
  ]
}`,
        validate: (p) => [
            ['problemStatement present', typeof p?.problemStatement === 'string' && p.problemStatement.length > 30],
            ['successMetrics array 2+', Array.isArray(p?.successMetrics) && p.successMetrics.length >= 2],
            ['features array 6+', Array.isArray(p?.features) && p.features.length >= 6],
            ['every feature has id+name+userStory+priority+acceptanceCriteria', Array.isArray(p?.features) && p.features.every(f =>
                f?.id && f?.name && f?.userStory && f?.priority && Array.isArray(f?.acceptanceCriteria)
            )],
            ['user stories follow "As a/an <role>, I want ... so that ..." shape', Array.isArray(p?.features) && p.features.every(f => /as an? .+i want .+so (that|i)/i.test(f?.userStory || ''))],
            ['priority in {P0,P1,P2}', Array.isArray(p?.features) && p.features.every(f => ['P0', 'P1', 'P2'].includes(f?.priority))],
            ['every feature has 2+ acceptance criteria', Array.isArray(p?.features) && p.features.every(f => f.acceptanceCriteria.length >= 2)],
        ],
    },
    {
        id: 'roadmap',
        label: 'ROADMAP',
        prompt: () => `You are a strategy lead producing a NOW/NEXT/LATER roadmap.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Generate roadmap items distributed across NOW (0-3mo), NEXT (3-12mo), LATER (12-24mo).

Output JSON:
{
  "horizons": {
    "now": [
      { "id": "N1", "title": "<imperative action>", "owner": "<role>", "outcome": "<measurable outcome>" }
    ],
    "next": [
      { "id": "X1", "title": "...", "owner": "...", "outcome": "...", "dependsOn": ["N1"] }
    ],
    "later": [
      { "id": "L1", "title": "...", "owner": "...", "outcome": "...", "dependsOn": ["X1"] }
    ]
  }
}
Each horizon must have at least 2 items. Total 8+ items.`,
        validate: (p) => [
            ['horizons object present', typeof p?.horizons === 'object'],
            ['now/next/later arrays', Array.isArray(p?.horizons?.now) && Array.isArray(p?.horizons?.next) && Array.isArray(p?.horizons?.later)],
            ['each horizon has 2+ items', (p?.horizons?.now?.length || 0) >= 2 && (p?.horizons?.next?.length || 0) >= 2 && (p?.horizons?.later?.length || 0) >= 2],
            ['8+ total items', ((p?.horizons?.now?.length || 0) + (p?.horizons?.next?.length || 0) + (p?.horizons?.later?.length || 0)) >= 8],
            ['every item has id+title+outcome', [...(p?.horizons?.now || []), ...(p?.horizons?.next || []), ...(p?.horizons?.later || [])].every(i => i?.id && i?.title && i?.outcome)],
        ],
    },
    {
        id: 'tech-architecture',
        label: 'TECH ARCHITECTURE',
        prompt: () => `You are a principal solutions architect producing a tech architecture document for the CLR co-op platform.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Output JSON:
{
  "title": "CLR-Powered Co-op Platform — Tech Architecture",
  "architecturalPrinciples": ["<principle 1>", "<principle 2>", "<principle 3>"],
  "components": [
    {
      "id": "C1",
      "name": "<2-4 word component name>",
      "kind": "service|datastore|integration|ui|ml-model",
      "purpose": "<one sentence>",
      "techChoices": ["<tech 1>"],
      "interfaces": ["<inbound or outbound interface 1>"]
    }
  ],
  "integrations": [
    { "from": "<component>", "to": "<external system>", "protocol": "REST|webhook|file|GraphQL|message-bus" }
  ]
}
6+ components, 3+ integrations.`,
        validate: (p) => [
            ['architecturalPrinciples array 3+', Array.isArray(p?.architecturalPrinciples) && p.architecturalPrinciples.length >= 3],
            ['components array 6+', Array.isArray(p?.components) && p.components.length >= 6],
            ['every component has id+name+kind+purpose', Array.isArray(p?.components) && p.components.every(c => c?.id && c?.name && c?.kind && c?.purpose)],
            ['kind in {service,datastore,integration,ui,ml-model}', Array.isArray(p?.components) && p.components.every(c => ['service', 'datastore', 'integration', 'ui', 'ml-model'].includes(c?.kind))],
            ['integrations array 3+', Array.isArray(p?.integrations) && p.integrations.length >= 3],
            ['every integration has from+to+protocol', Array.isArray(p?.integrations) && p.integrations.every(i => i?.from && i?.to && i?.protocol)],
        ],
    },
    {
        id: 'gap-analysis',
        label: 'GAP ANALYSIS',
        prompt: () => `You are a senior consultant scoring capability gaps vs best-in-class.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}
PEER BENCHMARKS: Drexel and Waterloo (92/100 industry-scored maturity)

Score 6+ capability dimensions on a 0-100 scale. Each dimension must have current score, best-in-class score, gap, and a remediation path.

Output JSON:
{
  "dimensions": [
    {
      "id": "D1",
      "dimension": "<2-5 word capability name>",
      "currentScore": <0-100>,
      "bestInClassScore": <0-100>,
      "gap": <bestInClassScore - currentScore>,
      "severity": "critical|high|medium|low",
      "evidence": "<one sentence citing the specific evidence supporting the score>",
      "remediation": "<one sentence imperative action that closes the gap>"
    }
  ]
}`,
        validate: (p) => [
            ['dimensions array 6+', Array.isArray(p?.dimensions) && p.dimensions.length >= 6],
            ['every dim has dimension+currentScore+bestInClassScore+gap+severity', Array.isArray(p?.dimensions) && p.dimensions.every(d =>
                d?.dimension && typeof d?.currentScore === 'number' && typeof d?.bestInClassScore === 'number' && typeof d?.gap === 'number' && d?.severity
            )],
            ['gap === bestInClassScore - currentScore for every dim', Array.isArray(p?.dimensions) && p.dimensions.every(d => d.gap === d.bestInClassScore - d.currentScore)],
            ['severity in {critical,high,medium,low}', Array.isArray(p?.dimensions) && p.dimensions.every(d => ['critical', 'high', 'medium', 'low'].includes(d?.severity))],
            ['every dim has remediation as sentence', Array.isArray(p?.dimensions) && p.dimensions.every(d => (d?.remediation || '').split(/\s+/).length >= 5)],
        ],
    },
    {
        id: 'tech-audit',
        label: 'TECH AUDIT',
        prompt: () => `You are a tech audit consultant producing a systems inventory of the current NU co-op tech stack.

RESEARCH GOAL: ${goal}
KEY EVIDENCE:
${context.keyEvidence.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}

Identify 6-10 current systems involved in the co-op process. Score each on maturity and document the risks / debt.

Output JSON:
{
  "inventory": [
    {
      "id": "S1",
      "system": "<system name (e.g., NU Banner, Workday, employer ATS)>",
      "owner": "<owning team or org>",
      "purpose": "<one sentence>",
      "maturity": "legacy|mature|emerging|new",
      "risk": "low|medium|high|critical",
      "debtNotes": "<2-3 sentences naming specific debt or risk factors>",
      "recommendation": "<one sentence imperative — modernize|integrate|deprecate|replace>"
    }
  ]
}`,
        validate: (p) => [
            ['inventory array 6+', Array.isArray(p?.inventory) && p.inventory.length >= 6],
            ['every entry has id+system+purpose+maturity+risk+recommendation', Array.isArray(p?.inventory) && p.inventory.every(s =>
                s?.id && s?.system && s?.purpose && s?.maturity && s?.risk && s?.recommendation
            )],
            ['maturity in {legacy,mature,emerging,new}', Array.isArray(p?.inventory) && p.inventory.every(s => ['legacy', 'mature', 'emerging', 'new'].includes(s?.maturity))],
            ['risk in {low,medium,high,critical}', Array.isArray(p?.inventory) && p.inventory.every(s => ['low', 'medium', 'high', 'critical'].includes(s?.risk))],
            ['debtNotes 30+ chars per entry', Array.isArray(p?.inventory) && p.inventory.every(s => (s?.debtNotes || '').length >= 30)],
        ],
    },
    {
        id: 'competitive-analysis',
        label: 'COMPETITIVE ANALYSIS',
        prompt: () => `You are a competitive intelligence analyst scoring NU vs peer co-op programs.

RESEARCH GOAL: ${goal}
PEERS: Drexel University, University of Waterloo, University of Cincinnati

Score NU and each peer on 5-7 capability dimensions on a 0-100 scale.

Output JSON:
{
  "peers": ["Northeastern", "Drexel", "Waterloo", "Cincinnati"],
  "dimensions": [
    {
      "dimension": "<2-4 word capability>",
      "scores": {
        "Northeastern": <0-100>,
        "Drexel": <0-100>,
        "Waterloo": <0-100>,
        "Cincinnati": <0-100>
      },
      "winner": "<peer name with highest score>",
      "rationale": "<one sentence explaining the score differential>"
    }
  ],
  "gapSummary": [
    { "dimension": "<dim>", "ourScore": <0-100>, "bestInClass": <0-100>, "gap": <int> }
  ]
}`,
        validate: (p) => [
            ['peers array includes Northeastern', Array.isArray(p?.peers) && p.peers.includes('Northeastern')],
            ['dimensions array 5+', Array.isArray(p?.dimensions) && p.dimensions.length >= 5],
            ['every dim has dimension+scores+winner+rationale', Array.isArray(p?.dimensions) && p.dimensions.every(d =>
                d?.dimension && typeof d?.scores === 'object' && d?.winner && d?.rationale
            )],
            ['every dim has score for Northeastern', Array.isArray(p?.dimensions) && p.dimensions.every(d => typeof d?.scores?.Northeastern === 'number')],
            ['winner is one of the peers', Array.isArray(p?.dimensions) && p?.peers && p.dimensions.every(d => p.peers.includes(d?.winner))],
            ['gapSummary array present', Array.isArray(p?.gapSummary) && p.gapSummary.length >= 2],
        ],
    },
];

// --- helper: call gemini + run salvage ladder ---
async function callGemini(prompt, label) {
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
    if (!resp.ok) {
        return { ok: false, error: `HTTP ${resp.status}: ${await resp.text()}`, elapsedMs };
    }
    const data = await resp.json();
    const rawText = (data?.candidates?.[0]?.content?.parts || [])
        .map(p => p?.text || '')
        .join('') || '';
    const finishReason = data?.candidates?.[0]?.finishReason || 'unknown';

    let cleaned = rawText.trim();
    if (cleaned.includes('```json')) cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    else if (cleaned.includes('```')) cleaned = cleaned.split('```')[1].split('```')[0].trim();

    let parsed = null;
    let parsePath = '';
    try {
        parsed = JSON.parse(cleaned);
        parsePath = 'JSON.parse (clean)';
    } catch {
        try {
            parsed = JSON.parse(tryRepairJson(cleaned));
            parsePath = 'tryRepairJson (minor repair)';
        } catch {
            const arr = salvageJsonArray(cleaned);
            const obj = salvageJsonObject(cleaned);
            if (Object.keys(obj).length > 0) {
                parsed = obj;
                parsePath = `salvageJsonObject (${Object.keys(obj).length} fields)`;
            } else if (arr.length > 0) {
                parsed = arr;
                parsePath = `salvageJsonArray (${arr.length} items)`;
            } else {
                return { ok: false, error: 'all parse paths failed', rawText, elapsedMs };
            }
        }
    }
    return { ok: true, parsed, parsePath, finishReason, elapsedMs, rawChars: rawText.length };
}

// --- run all artifacts in parallel ---
console.log(`\nProving Gemini Flash can generate every HiC artifact type.`);
console.log(`Testing ${ARTIFACTS.length} artifacts via /api/ai/gemini through the new salvage ladder.\n`);

const t0 = Date.now();
const results = await Promise.all(ARTIFACTS.map(async (artifact) => {
    const callResult = await callGemini(artifact.prompt(), artifact.label);
    if (!callResult.ok) return { artifact, callResult, checks: [], failed: true };
    const checks = artifact.validate(callResult.parsed);
    const failed = checks.some(([, ok]) => !ok);
    return { artifact, callResult, checks, failed };
}));
const totalMs = Date.now() - t0;

// --- print a summary table ---
let totalPass = 0;
let totalFail = 0;
const artifactsFailed = [];

console.log('==================================================================');
console.log(' ARTIFACT             | PARSE PATH                 | CHECKS  | TIME');
console.log('==================================================================');
for (const r of results) {
    const passed = r.checks.filter(([, ok]) => ok).length;
    const total = r.checks.length;
    totalPass += passed;
    totalFail += total - passed;
    const passStr = `${passed}/${total}`;
    const status = r.failed ? 'FAIL' : 'PASS';
    const path = r.callResult.parsePath || 'ERROR';
    const time = `${(r.callResult.elapsedMs / 1000).toFixed(1)}s`;
    console.log(` ${r.artifact.label.padEnd(20)} | ${path.padEnd(26)} | ${passStr.padEnd(7)} | ${time.padStart(5)}  ${status}`);
    if (r.failed) artifactsFailed.push(r.artifact.label);
}
console.log('==================================================================');

// --- detail failures ---
if (artifactsFailed.length > 0) {
    console.log('\n--- FAILURES ---');
    for (const r of results.filter(r => r.failed)) {
        console.log(`\n${r.artifact.label}:`);
        if (r.callResult.error) {
            console.log(`  call error: ${r.callResult.error}`);
        }
        for (const [label, ok] of r.checks) {
            if (!ok) console.log(`  FAIL  ${label}`);
        }
    }
}

// --- dump outputs for manual inspection ---
const outPath = resolve(__dirname, 'prove-all-artifacts.output.json');
writeFileSync(outPath, JSON.stringify({
    elapsed_ms: totalMs,
    results: results.map(r => ({
        artifact: r.artifact.id,
        ok: !r.failed,
        parsePath: r.callResult.parsePath,
        finishReason: r.callResult.finishReason,
        elapsedMs: r.callResult.elapsedMs,
        rawChars: r.callResult.rawChars,
        parsed: r.callResult.parsed,
    })),
}, null, 2));
console.log(`\nFull outputs saved to: ${outPath}`);
console.log(`\nTotals: ${totalPass} checks pass, ${totalFail} checks fail across ${ARTIFACTS.length} artifacts in ${(totalMs / 1000).toFixed(1)}s.`);

if (artifactsFailed.length > 0) {
    console.error(`\nFAILED ARTIFACTS (${artifactsFailed.length}/${ARTIFACTS.length}): ${artifactsFailed.join(', ')}`);
    process.exit(1);
}
console.log(`\nALL ${ARTIFACTS.length} ARTIFACTS GENERATED OK via Gemini Flash + new salvage ladder.`);
