/**
 * Deliverable Chunkers — Per-artifact parallel generation for the 6
 * deliverable types that previously ran single-shot and silently truncated.
 *
 * Each chunker:
 *   - Splits work along the artifact's natural structural unit (per horizon,
 *     per section-family, per persona, per capability domain, per peer)
 *   - Runs N parallel Gemini 3.5 Flash calls
 *   - Validates each chunk before accepting (returns ok / retries / fails loudly)
 *   - Merges into a single deliverable matching the existing generator's
 *     output schema, so callers can swap in without touching downstream code
 *
 * No silent fallbacks: if any chunk cannot produce its expected output after
 * retries, the entire deliverable fails with a structured diagnostic that
 * names exactly which chunk failed.
 *
 * Created 2026-05-23 as part of the chunking + output-quality plan, Phases 3 + 4.
 */

import { runChunked } from './chunkDispatcher';
import { calculateChunkPlan, type FeedbackSignalsForChunking } from './chunkBudgetCalculator';
import { validateCompleteness } from './outputCompletenessValidator';

const PROXY_BASE = 'http://127.0.0.1:5012';

interface CommonChunkerInputs {
    goal: string;
    skillInstructions: string;
    evidenceBlock: string;
    contextBlock: string;
    feedback?: string;
    feedbackSignals?: FeedbackSignalsForChunking;
}

/**
 * Find the first complete JSON value (object or array) in text and return it as
 * a string. Tolerates leading prose, trailing prose, and code fences. Returns
 * null if no balanced value can be located.
 *
 * Why this exists: Flash sometimes emits valid JSON followed by an explanation
 * ("Here's the JSON you asked for: {...}\n\nNote: I had to..."), which makes
 * JSON.parse throw "Unexpected non-whitespace character after JSON at position X".
 * Extracting just the first balanced value resolves it.
 */
function extractFirstJsonValue(text: string): string | null {
    const stripped = text.replace(/```(?:json)?\n?|```/g, '');
    const opens = ['{', '['];
    const closes = ['}', ']'];
    // Find first JSON-opening character (skip leading prose)
    let start = -1;
    let openChar = '';
    for (let i = 0; i < stripped.length; i++) {
        const c = stripped[i];
        if (opens.includes(c)) {
            start = i;
            openChar = c;
            break;
        }
    }
    if (start === -1) return null;
    const closeChar = closes[opens.indexOf(openChar)];

    // Walk forward tracking depth, respecting JSON string and escape rules.
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < stripped.length; i++) {
        const c = stripped[i];
        if (escape) { escape = false; continue; }
        if (inString) {
            if (c === '\\') { escape = true; continue; }
            if (c === '"') { inString = false; continue; }
            continue;
        }
        if (c === '"') { inString = true; continue; }
        if (c === openChar) depth++;
        else if (c === closeChar) {
            depth--;
            if (depth === 0) return stripped.slice(start, i + 1);
        }
    }
    return null;
}

/**
 * Attempt to repair a truncated JSON value by closing any open structures.
 * Walks the text forward, recording the LAST position that was outside a string
 * AND followed a complete value/structural-close (a "safe trim point"). If the
 * forward scan ends inside a string or with unclosed structures, truncate to
 * the last safe point and append the missing closers.
 * Returns null if no valid JSON can be produced.
 */
function tryRepairTruncatedJson(raw: string): string | null {
    const stripped = raw.replace(/```(?:json)?\n?|```/g, '').trim();
    // Locate the opening character
    let start = -1;
    for (let i = 0; i < stripped.length; i++) {
        if (stripped[i] === '{' || stripped[i] === '[') { start = i; break; }
    }
    if (start === -1) return null;

    // Forward scan: maintain the stack of expected closers, string state, and
    // — critically — a snapshot of (length, stack) taken every time we land in
    // a "safe" position outside any string with no partial value pending. Safe
    // positions are: immediately after a complete value (a `,`, `}`, `]`, or a
    // closing `"` that ends a string-typed value), where appending the remaining
    // closers would yield valid JSON.
    //
    // Each entry on the open-container stack also carries the safeEnd/safeStack
    // snapshot taken BEFORE the container was opened. If we reach EOF while
    // that container is still open and never had a completed item recorded
    // inside it, we revert to that pre-open snapshot — preserving the parent's
    // valid state while dropping the partial child. This avoids producing
    // `{"outer": [{}]}` placeholders that downstream validators would treat as
    // malformed items.
    const stack: Array<{ close: string; preEnd: number; preStack: string[] }> = [];
    let inString = false;
    let escape = false;
    let safeEnd = -1;
    let safeStack: string[] = [];
    let expectingValue = true;
    let expectingColon = false;

    const recordSafe = (idx: number) => {
        safeEnd = idx;
        safeStack = stack.map(s => s.close);
    };

    const pushContainer = (closeChar: string) => {
        // Snapshot current safe state BEFORE opening so we can revert if the
        // container is never completed.
        stack.push({ close: closeChar, preEnd: safeEnd, preStack: safeStack.slice() });
    };

    for (let i = start; i < stripped.length; i++) {
        const c = stripped[i];
        if (escape) { escape = false; continue; }
        if (inString) {
            if (c === '\\') { escape = true; continue; }
            if (c === '"') {
                inString = false;
                if (expectingColon) {
                    expectingColon = false;
                    // string was a KEY — still need value, unsafe to trim here
                } else if (!expectingValue) {
                    // string was a VALUE — safe trim point right after this quote
                    recordSafe(i + 1);
                }
                continue;
            }
            continue;
        }
        if (c === '"') {
            inString = true;
            if (expectingValue && stack[stack.length - 1]?.close === '}') {
                // Object context — this string is a KEY
                expectingValue = false;
                expectingColon = true;
            } else {
                // Array context or after `:` — this string is a VALUE
                expectingValue = false;
            }
            continue;
        }
        if (c === '{') {
            pushContainer('}'); expectingValue = true;
            // Do NOT recordSafe yet — only after the container completes or
            // has at least one completed entry. This lets us revert past
            // unfinished containers on truncation.
            continue;
        }
        if (c === '[') {
            pushContainer(']'); expectingValue = true;
            continue;
        }
        if (c === '}' || c === ']') {
            const top = stack[stack.length - 1];
            if (!top || top.close !== c) return null;
            stack.pop();
            expectingValue = false; expectingColon = false;
            recordSafe(i + 1);
            continue;
        }
        if (c === ',') {
            expectingValue = true; expectingColon = false;
            recordSafe(i);  // safe to trim BEFORE the comma (we'll drop it)
            continue;
        }
        if (c === ':') { expectingColon = false; continue; }
        if (/[\d\-\.tfn]/.test(c) && !expectingColon) {
            // Number, true, false, null literal — assume part of a value
            expectingValue = false;
            // We CANNOT safely trim in the middle of a literal, but if the
            // literal completes naturally we'll hit a `,` or close next.
            continue;
        }
        // whitespace + any other char: do nothing
    }

    if (stack.length === 0 && !inString) {
        // Not actually truncated — the caller's earlier JSON.parse should have
        // worked. Return null to signal "no repair applicable here".
        return null;
    }

    // If we're still inside an unfinished container, revert to the snapshot
    // taken just before that container was opened. This drops the partial
    // child (avoiding `[{}]` placeholders) while preserving the parent.
    if (stack.length > 0) {
        const oldest = stack[0];  // the OUTERMOST unfinished container's pre-state
        // Actually we want the INNERMOST: revert to before its open. If the
        // outermost is also incomplete we keep walking outward. Choose the
        // outermost incomplete container that has NO recorded safe inside it
        // — but we don't track that precisely, so just revert to the deepest
        // pre-snapshot that left at least some content.
        // Simpler: walk from innermost outward, pick the deepest entry whose
        // preEnd > start (i.e., its parent had at least the opening char).
        for (let k = stack.length - 1; k >= 0; k--) {
            const entry = stack[k];
            if (entry.preEnd >= 0) {
                safeEnd = entry.preEnd;
                safeStack = entry.preStack.slice();
                break;
            }
        }
    }

    if (safeEnd === -1) return null;  // never reached a safe point — give up

    let body = stripped.slice(start, safeEnd);
    if (body.endsWith(',')) body = body.slice(0, -1);
    body += safeStack.reverse().join('');
    try { JSON.parse(body); return body; } catch { return null; }
}

async function _flashOnce(prompt: string, maxOutputTokens: number, model: string = 'gemini-3.5-flash'): Promise<string> {
    const config: any = { temperature: 0.2, maxOutputTokens, responseMimeType: 'application/json' };
    const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, contents: prompt, config }),
    });
    if (!resp.ok) throw new Error(`${model} HTTP ${resp.status}`);
    const data = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error(`${model} returned empty output`);
    return text;
}

async function callFlash(prompt: string, maxOutputTokens: number, expectJson: boolean = true): Promise<any> {
    // First attempt: Flash with JSON mime if expected.
    let firstText: string = '';
    try {
        firstText = await _flashOnce(prompt, maxOutputTokens, 'gemini-3.5-flash');
    } catch (err) {
        // Network or HTTP failure — surface directly; no point repairing.
        throw err;
    }
    if (!expectJson) return firstText;

    // Repair ladder — try each in order, stop on first success.
    // 1) Plain JSON.parse on stripped text (fast path; covers clean outputs).
    const stripped = firstText.replace(/```json\n?|```/g, '').trim();
    try { return JSON.parse(stripped); } catch { /* fall through */ }

    // 2) Extract first balanced JSON value — fixes trailing prose ("Here's the
    //    JSON: {...} Hope this helps!") which is Flash's most common defect.
    const extracted = extractFirstJsonValue(firstText);
    if (extracted) {
        try { return JSON.parse(extracted); } catch { /* fall through */ }
    }

    // 3) Repair truncation by balancing unclosed braces/brackets and trimming
    //    the trailing incomplete fragment. Activates when maxOutputTokens cut
    //    off mid-value (the "Unterminated string" / "line 214 column 81" case).
    const repaired = tryRepairTruncatedJson(firstText);
    if (repaired) {
        try {
            const result = JSON.parse(repaired);
            console.warn('[callFlash] Recovered from truncated JSON by closing open structures (likely hit maxOutputTokens). Consider raising budget.');
            return result;
        } catch { /* fall through */ }
    }

    // 4) Repair via a second model call: ask Flash to re-emit valid JSON of
    //    its own output. This is cheap and resolves cases where Flash emitted
    //    structural noise (extra commas, missing closers, mid-key text).
    const repairPrompt = `The following text should be a single valid JSON value but it is malformed. Re-emit ONLY the JSON value with no surrounding text, no markdown, no explanation. If the original was truncated, infer a sensible close (e.g., end an array, close an object) while preserving all valid content. Output JSON only.\n\nMALFORMED:\n${firstText.slice(0, 12000)}`;
    try {
        const repairText = await _flashOnce(repairPrompt, maxOutputTokens, 'gemini-3.5-flash');
        const repairStripped = repairText.replace(/```json\n?|```/g, '').trim();
        try { return JSON.parse(repairStripped); } catch { /* fall through */ }
        const repairExtracted = extractFirstJsonValue(repairText);
        if (repairExtracted) {
            try {
                const result = JSON.parse(repairExtracted);
                console.warn('[callFlash] Recovered via Flash repair pass.');
                return result;
            } catch { /* fall through */ }
        }
    } catch { /* repair call failed; final throw below */ }

    throw new Error(`Flash returned malformed JSON after 4 repair attempts; head: ${firstText.slice(0, 200)}`);
}

// ============================================================================
// PHASE 3.1 — ROADMAP CHUNKER (per horizon: NOW / NEXT / LATER)
// ============================================================================

export interface RoadmapInput extends CommonChunkerInputs {
    themes: any[];
    personas: any[];
    recommendations: any[];
}

export async function chunkedGenerateRoadmap(input: RoadmapInput): Promise<any> {
    const plan = await calculateChunkPlan({
        artifactType: 'roadmap',
        feedbackSignals: input.feedbackSignals,
    });

    const horizons: Array<{ id: string; label: string; window: string; confidence: string }> = [
        { id: 'now', label: 'NOW', window: '0-3 months', confidence: 'HIGH' },
        { id: 'next', label: 'NEXT', window: '3-9 months', confidence: 'MEDIUM' },
        { id: 'later', label: 'LATER', window: '9-18 months', confidence: 'EXPLORATORY' },
    ];

    const dispatchResult = await runChunked<RoadmapInput, any, any>({
        artifactType: 'roadmap',
        parallelism: 3,
        perChunkRetries: 1,
        split: () => horizons.map(h => ({ id: h.id, payload: h, description: h.label })),
        generate: async (chunkId, h) => {
            const prompt = `${input.skillInstructions ? `=== AGENT SKILL: ROADMAP BUILDER ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: ROADMAP for ${h.label} horizon (${h.window}). Generate ONLY the ${h.label} initiatives — not NOW, not LATER, not NEXT — just this horizon.

REQUIREMENTS:
- Produce AT LEAST 4 initiatives for this horizon, each with:
  - initiative (problem-framed name; NOT "Build X" — start with the problem)
  - horizon: "${h.label}"
  - owner (role, not person)
  - description (30-50 words, cite [CHUNK_XXX] evidence)
  - dependencies (reference other initiative names if applicable)
  - successMetric (specific, measurable, with baseline + timeframe)
  - strategicTheme (which of the strategic pillars this serves)
  - confidenceLevel: "${h.confidence}"
  - citations (array of named source names)
  - evidenceBasis (1-2 sentences with specific data)

ANTI-PATTERNS:
- Feature framing ("Build unified CRM") instead of problem framing
- Vague metrics ("improve retention") without baseline/target
- Generic owners like "team"

THEMES: ${JSON.stringify(input.themes?.slice(0, 18) || [])}
PERSONAS: ${JSON.stringify((input.personas || []).map((p: any) => ({ name: p.name, role: p.role })))}
RECOMMENDATIONS TO SEQUENCE: ${JSON.stringify((input.recommendations || []).map((r: any) => ({ title: r.title, impact: r.impactLevel })))}

${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { items: [{ initiative, horizon, owner, description, dependencies, successMetric, strategicTheme, confidenceLevel, citations, evidenceBasis }] }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            const items = result?.items;
            if (!Array.isArray(items) || items.length < 2) {
                return { ok: false, reason: `Chunk ${chunkId} returned ${items?.length ?? 0} items, expected >= 2` };
            }
            return { ok: true };
        },
        merge: (chunks) => {
            const allItems: any[] = [];
            for (const c of chunks) {
                if (c.result?.items?.length) allItems.push(...c.result.items);
            }
            return {
                methodology: 'NOW/NEXT/LATER horizon framework with problem framing, chunked per-horizon for parallel generation and completeness.',
                roadmap: {
                    vision: '',
                    items: allItems,
                },
            };
        },
        validateFinal: (final) => {
            const items = final?.roadmap?.items || [];
            const findings = [];
            if (items.length < 6) {
                findings.push({
                    severity: 'fail' as const,
                    code: 'roadmap-item-count-low',
                    message: `Only ${items.length} initiatives across all horizons; expected at least 6.`,
                });
            }
            // Check each horizon has at least one item
            for (const h of ['Now', 'Next', 'Later']) {
                const inHorizon = items.filter((it: any) =>
                    (it.horizon || '').toLowerCase().startsWith(h.toLowerCase())
                );
                if (inHorizon.length === 0) {
                    findings.push({
                        severity: 'fail' as const,
                        code: 'roadmap-horizon-empty',
                        message: `Horizon ${h.toUpperCase()} has no initiatives.`,
                    });
                }
            }
            return { ok: findings.length === 0, findings };
        },
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`Roadmap chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}

// ============================================================================
// PHASE 3.2 — PRD CHUNKER (per section-family: Problem / Solution / Execution / Risk)
// ============================================================================

export interface PRDInput extends CommonChunkerInputs {
    themes: any[];
    personas: any[];
    recommendations: any[];
}

const PRD_SECTIONS: Record<string, { label: string; sections: Array<{ key: string; number: number; title: string }>; description: string }> = {
    problem: {
        label: 'Problem (sections 1-4)',
        sections: [
            { key: 'problemStatement', number: 1, title: 'Problem Statement' },
            { key: 'userStories', number: 2, title: 'User Stories' },
            { key: 'acceptanceCriteria', number: 3, title: 'Acceptance Criteria' },
            { key: 'successMetrics', number: 4, title: 'Success Metrics' },
        ],
        description: 'Frame the problem rigorously. Who, what, why now.',
    },
    solution: {
        label: 'Solution (sections 5-8)',
        sections: [
            { key: 'userPersonas', number: 5, title: 'User Personas' },
            { key: 'functionalRequirements', number: 6, title: 'Functional Requirements' },
            { key: 'nonFunctionalRequirements', number: 7, title: 'Non-Functional Requirements' },
            { key: 'technicalConstraints', number: 8, title: 'Technical Constraints & Dependencies' },
        ],
        description: 'Define what we are building and how it works.',
    },
    execution: {
        label: 'Execution (sections 9-12)',
        sections: [
            { key: 'wireframes', number: 9, title: 'Wireframes / Mockups' },
            { key: 'dataRequirements', number: 10, title: 'Data Requirements & Privacy' },
            { key: 'releaseCriteria', number: 11, title: 'Release / Launch Criteria' },
            { key: 'riskAssessment', number: 12, title: 'Risk Assessment with Mitigations' },
        ],
        description: 'Specify how we ship and measure success.',
    },
    risk: {
        label: 'Risk (sections 13-16)',
        sections: [
            { key: 'assumptions', number: 13, title: 'Assumptions and Open Questions' },
            { key: 'outOfScope', number: 14, title: 'Out of Scope / Non-Goals' },
            { key: 'timelineMilestones', number: 15, title: 'Timeline and Milestones' },
            { key: 'stakeholderSignoff', number: 16, title: 'Stakeholder Sign-off Matrix' },
        ],
        description: 'Surface what could go wrong and what we explicitly rejected.',
    },
};

export async function chunkedGeneratePRD(input: PRDInput): Promise<any> {
    const plan = await calculateChunkPlan({
        artifactType: 'prd',
        feedbackSignals: input.feedbackSignals,
    });

    const families = Object.entries(PRD_SECTIONS).map(([id, meta]) => ({ id, ...meta }));

    const dispatchResult = await runChunked<PRDInput, any, any>({
        artifactType: 'prd',
        parallelism: 4,
        perChunkRetries: 1,
        split: () => families.map(f => ({ id: f.id, payload: f, description: f.label })),
        generate: async (chunkId, f) => {
            const prompt = `${input.skillInstructions ? `=== AGENT SKILL: PRD COMPILER ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: PRD ${f.label}. Generate ONLY these sections — not any others. Cagan/SVPG product format.

SECTIONS TO POPULATE (${f.description}):
${f.sections.map(s => `  - section #${s.number} ${s.title} (JSON key "${s.key}"): required, minimum 120 words, evidence-cited`).join('\n')}

RESEARCH CONTEXT:
- Themes: ${JSON.stringify((input.themes || []).slice(0, 12).map((t: any) => ({ name: t.name, description: t.description?.slice(0, 200) })))}
- Personas: ${JSON.stringify((input.personas || []).map((p: any) => ({ name: p.name, role: p.role, jtbd: p.jtbd })))}
- Recommendations: ${JSON.stringify((input.recommendations || []).slice(0, 12).map((r: any) => ({ title: r.title, impact: r.impactLevel })))}

${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { ${f.sections.map(s => `"${s.key}": "string content of this section, 120+ words, cited"`).join(', ')} }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            const family = families.find(f => f.id === chunkId);
            if (!family) return { ok: true };
            for (const sec of family.sections) {
                const content = result?.[sec.key];
                if (!content || typeof content !== 'string' || content.length < 200) {
                    return { ok: false, reason: `Chunk ${chunkId} missing or short section: ${sec.key}` };
                }
            }
            return { ok: true };
        },
        merge: (chunks) => {
            // Build the StepResult_PRD-compatible shape: { methodology, prd: { title, purposeAndObjectives, successMetrics[], sections[], features[] } }
            const sections: Array<{ sectionNumber: number; title: string; content: string }> = [];
            let purposeAndObjectives = '';
            const successMetricsRaw: string[] = [];
            for (const fam of families) {
                const chunk = chunks.find(c => c.id === fam.id);
                if (!chunk?.result) continue;
                for (const sec of fam.sections) {
                    const content = chunk.result[sec.key];
                    if (typeof content === 'string' && content.length > 0) {
                        sections.push({ sectionNumber: sec.number, title: sec.title, content });
                        if (sec.key === 'problemStatement') purposeAndObjectives = content.slice(0, 1200);
                        if (sec.key === 'successMetrics') {
                            // Split on newlines / bullets to populate successMetrics array
                            const lines = content.split(/\n|;|—/).map(s => s.trim()).filter(s => s.length > 12);
                            for (const l of lines.slice(0, 6)) successMetricsRaw.push(l);
                        }
                    }
                }
            }
            sections.sort((a, b) => a.sectionNumber - b.sectionNumber);
            return {
                methodology: '16-section Cagan/SVPG PRD, chunked across 4 family groups (Problem/Solution/Execution/Risk) for parallel generation and completeness.',
                prd: {
                    title: 'Product Requirements Document',
                    purposeAndObjectives,
                    successMetrics: successMetricsRaw,
                    sections,
                    features: [],
                },
            };
        },
        validateFinal: (final) => {
            const findings = [];
            const required = Object.values(PRD_SECTIONS).flatMap(f => f.sections);
            const sections = final?.prd?.sections || [];
            const presentNumbers = new Set(sections.map((s: any) => s.sectionNumber));
            for (const sec of required) {
                if (!presentNumbers.has(sec.number)) {
                    findings.push({
                        severity: 'fail' as const,
                        code: 'prd-section-missing',
                        message: `Required section #${sec.number} "${sec.title}" is missing.`,
                    });
                }
            }
            return { ok: findings.length === 0, findings };
        },
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`PRD chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}

// ============================================================================
// PHASE 3.3 — SERVICE BLUEPRINT CHUNKER (per persona)
// ============================================================================

export interface BlueprintInput extends CommonChunkerInputs {
    themes: any[];
    personas: any[];
    journeyStages?: any[];
}

export async function chunkedGenerateBlueprint(input: BlueprintInput): Promise<any> {
    const personas = (input.personas || []).slice(0, 6);
    if (personas.length === 0) {
        throw new Error('Blueprint chunker requires at least one persona');
    }
    const plan = await calculateChunkPlan({
        artifactType: 'blueprint',
        expectedItemCount: personas.length,
        feedbackSignals: input.feedbackSignals,
    });

    const dispatchResult = await runChunked<BlueprintInput, any, any>({
        artifactType: 'blueprint',
        parallelism: Math.min(plan.parallelism, personas.length),
        perChunkRetries: 1,
        split: () => personas.map((p: any, i: number) => ({
            id: `persona-${i + 1}`,
            payload: p,
            description: p.name || `Persona ${i + 1}`,
        })),
        generate: async (chunkId, persona) => {
            const prompt = `${input.skillInstructions ? `=== AGENT SKILL: SERVICE BLUEPRINT MAPPER ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: SERVICE BLUEPRINT for ONE persona. Generate the full Bitner 5-component blueprint for THIS persona only.

PERSONA: ${persona.name} (${persona.role})
JTBD: ${persona.jtbd || 'not specified'}

REQUIRED 5 COMPONENTS:
1. customerActions: 5-7 stage-by-stage actions the persona takes
2. onstageActions: visible service-staff actions at each customer action
3. backstageActions: invisible support actions
4. supportProcesses: systems and policies enabling the service
5. physicalEvidence: tangibles the customer sees/touches at each stage

EACH ACTION MUST INCLUDE:
- name (specific verb)
- pain (specific friction with [CHUNK_XXX] citation)
- opportunity (named intervention)
- emotion (specific feeling — anxious, confident, frustrated, relieved)
- failPoint (if known)

THEMES: ${JSON.stringify((input.themes || []).slice(0, 10))}
${input.journeyStages ? `JOURNEY: ${JSON.stringify(input.journeyStages)}` : ''}
${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { persona: "${persona.name}", customerActions: [...], onstageActions: [...], backstageActions: [...], supportProcesses: [...], physicalEvidence: [...] }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            const required = ['customerActions', 'onstageActions', 'backstageActions', 'supportProcesses', 'physicalEvidence'];
            for (const r of required) {
                if (!Array.isArray(result?.[r]) || result[r].length < 3) {
                    return { ok: false, reason: `Chunk ${chunkId} component "${r}" has <3 items` };
                }
            }
            return { ok: true };
        },
        merge: (chunks) => ({
            methodology: 'Bitner 5-component service blueprint, chunked per-persona for full coverage.',
            blueprints: chunks.map(c => c.result),
        }),
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`Blueprint chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}

// ============================================================================
// PHASE 4.1 — GAP-ANALYSIS CHUNKER (per capability domain)
// ============================================================================

export interface GapInput extends CommonChunkerInputs {
    themes: any[];
}

const CAPABILITY_DOMAINS = [
    { id: 'people', label: 'People & Skills' },
    { id: 'process', label: 'Process & Operations' },
    { id: 'technology', label: 'Technology & Tools' },
    { id: 'data', label: 'Data & Insights' },
    { id: 'governance', label: 'Governance & Risk' },
];

export async function chunkedGenerateGapAnalysis(input: GapInput): Promise<any> {
    const plan = await calculateChunkPlan({
        artifactType: 'gap',
        feedbackSignals: input.feedbackSignals,
    });

    const dispatchResult = await runChunked<GapInput, any, any>({
        artifactType: 'gap',
        parallelism: 5,
        perChunkRetries: 1,
        split: () => CAPABILITY_DOMAINS.map(d => ({ id: d.id, payload: d, description: d.label })),
        generate: async (chunkId, domain) => {
            const prompt = `${input.skillInstructions ? `=== AGENT SKILL: GAP ANALYSIS EVALUATOR ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: GAP ANALYSIS for the "${domain.label}" capability domain only. Other domains will be analyzed separately. Focus tightly.

REQUIREMENTS:
- Produce AT LEAST 2 gaps in this domain. Quality over quantity — each fully evidenced.
- Each gap: { capability, currentMaturity (1-5), targetMaturity (1-5), gap (number), severity (critical/high/medium), impact (with [CHUNK_XXX] citation), effort, citations [], evidenceBasis }
- Score by Gartner 5-level maturity: 1=ad hoc, 2=developing, 3=defined, 4=managed, 5=optimized
- severity: critical if gap >= 3, high if gap = 2, medium if gap = 1

ANTI-FABRICATION: every maturity score MUST trace to specific corpus evidence. No invented scores.

THEMES (filter for ${domain.label}-relevant): ${JSON.stringify((input.themes || []).slice(0, 18).map((t: any) => ({ name: t.name, description: t.description?.slice(0, 200) })))}
${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { domain: "${domain.label}", gaps: [{ capability, currentMaturity, targetMaturity, gap, severity, impact, effort, citations, evidenceBasis }] }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            const gaps = result?.gaps;
            if (!Array.isArray(gaps) || gaps.length < 1) {
                return { ok: false, reason: `Chunk ${chunkId} returned ${gaps?.length ?? 0} gaps, expected >= 1` };
            }
            return { ok: true };
        },
        merge: (chunks) => {
            const allGaps: any[] = [];
            for (const c of chunks) {
                const gaps = c.result?.gaps;
                if (Array.isArray(gaps)) {
                    for (const g of gaps) allGaps.push({ ...g, domain: c.result?.domain });
                }
            }
            return {
                methodology: 'Gartner 5-level maturity per capability domain, chunked across 5 domains for parallel evidence collection.',
                analysis: {
                    assessmentScope: 'Cross-domain capability gap assessment.',
                    gaps: allGaps,
                    prioritizedActions: [],
                    quickWins: [],
                    riskRegister: [],
                },
            };
        },
        validateFinal: (final) => {
            const gaps = final?.analysis?.gaps || [];
            if (gaps.length < 6) {
                return {
                    ok: false,
                    findings: [{
                        severity: 'fail' as const,
                        code: 'gap-count-low',
                        message: `Only ${gaps.length} gaps across 5 domains; expected at least 6 for a complete analysis.`,
                    }],
                };
            }
            return { ok: true, findings: [] };
        },
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`Gap analysis chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}

// ============================================================================
// PHASE 4.2 — COMPETITIVE CHUNKER (per peer)
// ============================================================================

export interface CompetitiveInput extends CommonChunkerInputs {
    themes: any[];
    targetEntity?: string;
}

export async function chunkedGenerateCompetitive(input: CompetitiveInput): Promise<any> {
    const plan = await calculateChunkPlan({
        artifactType: 'competitive',
        feedbackSignals: input.feedbackSignals,
    });

    // Phase A: identify 4-6 named peers via a small Flash call
    const peerDiscoveryPrompt = `Identify 4-6 NAMED peer entities for a competitive analysis. Target: ${input.targetEntity || 'the focal organization in the research goal'}. Research goal: ${input.goal}.

Use the themes and corpus evidence to find real, named peers — NOT "Industry Average" or "Peers Collective" or anonymous baselines.

THEMES: ${JSON.stringify((input.themes || []).slice(0, 12))}
${input.evidenceBlock}

Output STRICT JSON: { peers: [{ name, type, oneLineDifferentiator }] }`;
    const peerSet = await callFlash(peerDiscoveryPrompt, 2000);
    const peers = peerSet?.peers?.slice(0, 6) || [];
    if (peers.length < 2) {
        throw new Error(`Competitive chunker requires >= 2 named peers; discovery returned ${peers.length}`);
    }

    // Phase B: parallel per-peer deep analysis
    const dispatchResult = await runChunked<CompetitiveInput, any, any>({
        artifactType: 'competitive',
        parallelism: Math.min(plan.parallelism, peers.length),
        perChunkRetries: 1,
        split: () => peers.map((p: any, i: number) => ({
            id: `peer-${i + 1}`,
            payload: p,
            description: p.name,
        })),
        generate: async (chunkId, peer) => {
            const prompt = `${input.skillInstructions ? `=== AGENT SKILL: COMPETITIVE ANALYST ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP: COMPETITIVE PEER ANALYSIS for "${peer.name}" only.

Produce the FULL comparison slice for this peer along all required dimensions:
- offering (their core product/service)
- target_segment (who they serve)
- strengths (3-5, evidenced)
- weaknesses (3-5, evidenced)
- maturity_score (1-5 Gartner)
- positioning vs. ${input.targetEntity || 'the focal organization'}
- threat_level (critical/high/medium/low)
- citations [] (4+ named sources)
- evidenceBasis

THEMES: ${JSON.stringify((input.themes || []).slice(0, 10))}
${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { peer: "${peer.name}", offering, target_segment, strengths, weaknesses, maturity_score, positioning, threat_level, citations, evidenceBasis }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            const required = ['offering', 'strengths', 'weaknesses', 'maturity_score', 'positioning'];
            for (const r of required) {
                if (result[r] === undefined || result[r] === null) {
                    return { ok: false, reason: `Chunk ${chunkId} missing field: ${r}` };
                }
            }
            return { ok: true };
        },
        merge: (chunks) => {
            // Map per-peer chunk results into legacy CompetitiveAnalysis shape:
            // { industryContext, peers: CompetitorProfile[], benchmarkDimensions, maturityMatrix, gapSummary }
            const peerProfiles: any[] = [];
            const maturityMatrix: any[] = [];
            const benchmarkDimensions: any[] = [
                { dimension: 'offering', weight: 1, description: 'Core product/service breadth' },
                { dimension: 'positioning', weight: 1, description: 'Market position relative to focal org' },
                { dimension: 'maturity', weight: 1, description: 'Gartner-style maturity score (1-5)' },
            ];
            for (const c of chunks) {
                const r = c.result;
                if (!r) continue;
                peerProfiles.push({
                    name: r.peer || r.name || 'Unnamed Peer',
                    position: r.positioning || r.target_segment || '',
                    strengths: Array.isArray(r.strengths) ? r.strengths : [],
                    weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses : [],
                    differentiators: r.offering ? [r.offering] : [],
                    citations: r.citations || [],
                    evidenceBasis: r.evidenceBasis || '',
                });
                maturityMatrix.push({
                    peer: r.peer || r.name || 'Unnamed',
                    scores: {
                        offering: typeof r.maturity_score === 'number' ? r.maturity_score : 3,
                        positioning: typeof r.threat_level === 'string' ? (r.threat_level === 'critical' ? 5 : r.threat_level === 'high' ? 4 : r.threat_level === 'medium' ? 3 : 2) : 3,
                        maturity: typeof r.maturity_score === 'number' ? r.maturity_score : 3,
                    },
                });
            }
            return {
                methodology: 'Per-peer parallel analysis (peer discovery + per-peer extended profile) for full comparison-matrix coverage.',
                analysis: {
                    industryContext: input.targetEntity ? `Competitive landscape analysis for ${input.targetEntity}.` : 'Competitive landscape analysis.',
                    peers: peerProfiles,
                    benchmarkDimensions,
                    maturityMatrix,
                    gapSummary: [],
                },
            };
        },
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`Competitive chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}

// ============================================================================
// PHASE 4.3 — TECH AUDIT CHUNKER (2-pass: inventory then per-system)
// ============================================================================

export interface TechAuditInput extends CommonChunkerInputs {
    themes: any[];
}

export async function chunkedGenerateTechAudit(input: TechAuditInput): Promise<any> {
    // Pass 1: inventory list (single small Flash call)
    const inventoryPrompt = `${input.skillInstructions ? `=== AGENT SKILL: TECH AUDIT INSPECTOR ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP 1 of 2: TECH INVENTORY. Produce ONLY the list of systems / tools / platforms in use. One-line description each. No deep analysis — that comes in step 2.

THEMES: ${JSON.stringify((input.themes || []).slice(0, 12))}
${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { systems: [{ name, category, oneLineDescription }] }`;
    const inventory = await callFlash(inventoryPrompt, 3000);
    const systems = inventory?.systems?.slice(0, 12) || [];
    if (systems.length < 2) {
        throw new Error(`Tech audit chunker: inventory pass returned ${systems.length} systems`);
    }

    // Pass 2: per-system parallel deep audit
    const plan = await calculateChunkPlan({
        artifactType: 'tech-audit',
        feedbackSignals: input.feedbackSignals,
    });
    const dispatchResult = await runChunked<TechAuditInput, any, any>({
        artifactType: 'tech-audit',
        parallelism: Math.min(plan.parallelism, systems.length),
        perChunkRetries: 1,
        split: () => systems.map((s: any, i: number) => ({
            id: `system-${i + 1}`,
            payload: s,
            description: s.name,
        })),
        generate: async (chunkId, system) => {
            const prompt = `STEP 2 of 2: AUDIT ENTRY for "${system.name}" only.

Produce: risk, integration list, consolidation opportunity, gartner_maturity (1-5), citations [], evidenceBasis. Be specific — name the integrations, name the risk vectors.

${input.contextBlock}
${input.evidenceBlock}

Output STRICT JSON: { system: "${system.name}", category: "${system.category}", description: "${system.oneLineDescription}", risk, integrations, consolidationOpportunity, gartner_maturity, citations, evidenceBasis }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            const required = ['risk', 'integrations', 'consolidationOpportunity'];
            for (const r of required) {
                if (!result[r]) return { ok: false, reason: `${chunkId} missing ${r}` };
            }
            return { ok: true };
        },
        merge: (chunks) => {
            // Map per-system chunk results into the legacy TechEcosystemAudit shape:
            // { systemsInventory: SystemRecord[], integrationMap: IntegrationLink[], capabilityMatrix: CapabilityScore[], consolidationOpportunities: [], recommendations: [] }
            const systemsInventory: any[] = [];
            const integrationMap: any[] = [];
            const consolidationOpportunities: any[] = [];
            for (const c of chunks) {
                const r = c.result;
                if (!r) continue;
                systemsInventory.push({
                    name: r.system || r.name || 'Unnamed System',
                    vendor: r.vendor || 'Unknown',
                    category: r.category || 'Uncategorized',
                    users: r.users || 'Unspecified',
                    department: r.department || 'Unspecified',
                    status: r.status || 'active',
                    citations: r.citations || [],
                    evidenceBasis: r.evidenceBasis || '',
                });
                if (Array.isArray(r.integrations)) {
                    for (const intg of r.integrations) {
                        if (typeof intg === 'string') {
                            integrationMap.push({
                                source: r.system || r.name,
                                target: intg,
                                method: 'unspecified',
                                health: 'unknown',
                                dataFlow: '',
                            });
                        } else if (intg && typeof intg === 'object') {
                            integrationMap.push({
                                source: r.system || r.name,
                                target: intg.target || intg.system || '',
                                method: intg.method || 'unspecified',
                                health: intg.health || 'unknown',
                                dataFlow: intg.dataFlow || '',
                            });
                        }
                    }
                }
                if (r.consolidationOpportunity) {
                    consolidationOpportunities.push({
                        title: `Consolidate ${r.system || r.name || 'system'}`,
                        description: typeof r.consolidationOpportunity === 'string' ? r.consolidationOpportunity : JSON.stringify(r.consolidationOpportunity),
                        impact: r.impact || 'medium',
                        effort: r.effort || 'medium',
                    });
                }
            }
            return {
                methodology: 'Two-pass: inventory + per-system parallel audit. Chunked for completeness across 8+ systems.',
                audit: {
                    systemsInventory,
                    integrationMap,
                    capabilityMatrix: [],
                    consolidationOpportunities,
                    recommendations: [],
                },
            };
        },
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`Tech audit chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}

// ============================================================================
// PHASE 4.3 — TECH ARCHITECTURE CHUNKER (C4 context, then per-node container)
// ============================================================================

export interface TechArchInput extends CommonChunkerInputs {
    themes: any[];
}

export async function chunkedGenerateTechArchitecture(input: TechArchInput): Promise<any> {
    // Pass 1: C4 context level (single small Flash call) — identify major nodes
    const contextPrompt = `${input.skillInstructions ? `=== AGENT SKILL: TECH ARCH GENERATOR ===\n${input.skillInstructions}\n=== END SKILL ===\n\n` : ''}STEP 1 of 2: C4 CONTEXT level. Identify the 4-8 major system nodes + their external dependencies. One-line description each. Container-level detail comes in step 2.

THEMES: ${JSON.stringify((input.themes || []).slice(0, 12))}
${input.contextBlock}
${input.evidenceBlock}
${input.feedback ? 'USER FEEDBACK: ' + input.feedback : ''}

Output STRICT JSON: { nodes: [{ id, label, type, oneLineDescription }], edges: [{ from, to, label }] }`;
    const context = await callFlash(contextPrompt, 3000);
    const nodes = context?.nodes?.slice(0, 8) || [];
    if (nodes.length < 2) {
        throw new Error(`Tech arch chunker: context pass returned ${nodes.length} nodes`);
    }

    // Pass 2: per-node container detail in parallel
    const plan = await calculateChunkPlan({
        artifactType: 'architecture',
        feedbackSignals: input.feedbackSignals,
    });
    const dispatchResult = await runChunked<TechArchInput, any, any>({
        artifactType: 'architecture',
        parallelism: Math.min(plan.parallelism, nodes.length),
        perChunkRetries: 1,
        split: () => nodes.map((n: any) => ({ id: n.id, payload: n, description: n.label })),
        generate: async (chunkId, node) => {
            const prompt = `STEP 2 of 2: C4 CONTAINER detail for "${node.label}".

Produce: containers (named services/databases inside this node), integration_payloads (what data flows in/out), boundary_limits (scale/security), citations [], evidenceBasis.

${input.contextBlock}
${input.evidenceBlock}

Output STRICT JSON: { node: "${node.label}", containers: [], integration_payloads: [], boundary_limits, citations, evidenceBasis }`;
            return callFlash(prompt, plan.perChunkOutputBudget);
        },
        validateChunk: (result, chunkId) => {
            if (!Array.isArray(result?.containers) || result.containers.length < 1) {
                return { ok: false, reason: `${chunkId} missing containers` };
            }
            return { ok: true };
        },
        merge: (chunks) => {
            // Map to legacy TechnicalArchitecture shape:
            // { overview, nodes: TechNode[], flows: TechFlow[], citations[], evidenceBasis }
            const techNodes: any[] = nodes.map((n: any, i: number) => ({
                id: n.id || `node-${i + 1}`,
                label: n.label || n.id || `Node ${i + 1}`,
                type: n.type || 'service',
                description: n.oneLineDescription || '',
            }));
            const techFlows: any[] = Array.isArray(context.edges) ? context.edges.map((e: any) => ({
                from: e.from,
                to: e.to,
                label: e.label || '',
                payload: e.payload || '',
            })) : [];
            // Append per-node container details as extended nodes
            const containerExtensions: any[] = [];
            const allCitations: string[] = [];
            for (const c of chunks) {
                const r = c.result;
                if (!r) continue;
                if (Array.isArray(r.containers)) {
                    for (const cont of r.containers) {
                        containerExtensions.push({
                            id: `${c.id}-${cont.name || cont.id || 'container'}`,
                            label: typeof cont === 'string' ? cont : (cont.name || cont.id || 'Container'),
                            type: 'container',
                            description: typeof cont === 'string' ? '' : (cont.description || ''),
                            parentNode: c.id,
                        });
                    }
                }
                if (Array.isArray(r.citations)) {
                    for (const cit of r.citations) {
                        if (typeof cit === 'string' && !allCitations.includes(cit)) allCitations.push(cit);
                    }
                }
            }
            return {
                methodology: 'C4 architecture: context-level node identification + per-node container detail in parallel.',
                architecture: {
                    overview: `C4 architecture with ${techNodes.length} context-level nodes and ${containerExtensions.length} container components.`,
                    nodes: [...techNodes, ...containerExtensions],
                    flows: techFlows,
                    citations: allCitations.slice(0, 24),
                    evidenceBasis: chunks.length > 0 ? chunks.map(c => c.result?.evidenceBasis).filter(Boolean).join(' | ').slice(0, 800) : '',
                },
            };
        },
    }, input);

    if (!dispatchResult.ok) {
        throw new Error(`Tech architecture chunking failed: ${dispatchResult.failures.join('; ')}`);
    }
    return dispatchResult.result;
}
