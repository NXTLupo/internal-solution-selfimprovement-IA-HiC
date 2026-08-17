/**
 * transcriptIntake.ts - WS-2 of the v2 single-workspace program (2026-08-14,
 * plans/hic-v2-single-workspace-program-2026-08-14.md).
 *
 * The pre-research layer the PDF names (item 2): anonymize uploaded
 * transcripts, synthesize what they establish, and generate a focused research
 * goal, all inside HiC. Replaces the Claude round-trip the team performs today.
 *
 * PRIVACY CONTRACT: the PII replacement map NEVER leaves the caller's memory.
 * It is not written to the wiki, the corpus, the manifest, or any session
 * save; only the ANONYMIZED text flows downstream.
 *
 * Models route through aiRouter: flash for extraction (schema-bounded),
 * the artifact authority's narrative model for synthesis + goal.
 */

import { callAIWithRetry, type AIEndpointId } from './aiRetryClient';
import { DEFAULT_MODELS, artifactModelFor, endpointForModel, salvageJsonObject } from './aiRouter';
import { scrubRewrite } from './slideTextEditing';

export interface PiiEntities {
    people: string[];
    organizations: string[];
    emails: string[];
    phones: string[];
    locations: string[];
    products: string[];
}

export interface AnonymizationMap {
    /** original -> stable pseudonym, shared across all files in one intake run. */
    replacements: Map<string, string>;
    counters: Record<string, number>;
}

export function newAnonymizationMap(): AnonymizationMap {
    return { replacements: new Map(), counters: {} };
}

const CATEGORY_LABEL: Record<keyof PiiEntities, string> = {
    people: 'Person', organizations: 'Organization', emails: 'Email',
    phones: 'Phone', locations: 'Location', products: 'Product',
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/g;

function letterFor(n: number): string {
    // A, B, ..., Z, AA, AB ...
    let s = '';
    let i = n;
    do { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) - 1; } while (i >= 0);
    return s;
}

function pseudonymFor(map: AnonymizationMap, category: keyof PiiEntities, original: string): string {
    const key = original.trim();
    const existing = map.replacements.get(key.toLowerCase());
    if (existing) return existing;
    const n = map.counters[category] || 0;
    map.counters[category] = n + 1;
    const label = category === 'emails' ? `person${letterFor(n).toLowerCase()}@client.example`
        : category === 'phones' ? `(555) 000-${String(n + 1).padStart(4, '0')}`
        : `${CATEGORY_LABEL[category]} ${letterFor(n)}`;
    map.replacements.set(key.toLowerCase(), label);
    return label;
}

/** Model pass: extract the PII entities the regexes cannot see (names, orgs). */
export async function extractPiiEntities(text: string): Promise<PiiEntities> {
    const empty: PiiEntities = { people: [], organizations: [], emails: [], phones: [], locations: [], products: [] };
    const system = [
        'Extract personally identifying and client-identifying strings from a meeting transcript. Return ONLY JSON:',
        '{"people":[],"organizations":[],"emails":[],"phones":[],"locations":[],"products":[]}',
        'people: full names and first names of real speakers/participants. organizations: the client company and any',
        'identifying affiliates (NOT famous public companies mentioned as market context). locations: offices/addresses',
        'that identify the client. products: internal client product/project code names. Return the exact strings as they appear.',
    ].join('\n');
    try {
        const parsed = await callAIWithRetry('gemini', {
            model: DEFAULT_MODELS.fast_generation,
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: text.slice(0, 60_000) }] }],
            config: { temperature: 0, maxOutputTokens: 2000, responseMimeType: 'application/json' },
        }, { label: 'PII extraction', maxAttempts: 2, requestTimeoutMs: 40_000 });
        const raw = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const obj = salvageJsonObject<any>(raw) as any;
        const arr = (v: any) => (Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim().length > 1) : []);
        return {
            people: arr(obj?.people), organizations: arr(obj?.organizations), emails: arr(obj?.emails),
            phones: arr(obj?.phones), locations: arr(obj?.locations), products: arr(obj?.products),
        };
    } catch (e: any) {
        console.warn('[transcriptIntake] PII model pass failed; regex-only anonymization:', e?.message || e);
        return empty;
    }
}

export interface AnonymizeResult {
    text: string;
    /** user-inspectable removal ledger (PDF: "Anonymization summary"). */
    removals: Array<{ category: string; original: string; replacement: string; count: number }>;
}

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Anonymize one transcript. Deterministic regexes catch emails/phones across
 * the WHOLE text; the model pass names people/orgs/products; replacements are
 * stable across files sharing one AnonymizationMap.
 */
export async function anonymizeTranscript(text: string, map: AnonymizationMap): Promise<AnonymizeResult> {
    const entities = await extractPiiEntities(text);
    // regex belt-and-suspenders on top of the model's email/phone lists
    entities.emails = Array.from(new Set([...entities.emails, ...(text.match(EMAIL_RE) || [])]));
    entities.phones = Array.from(new Set([...entities.phones, ...(text.match(PHONE_RE) || [])]));

    let out = text;
    const removals: AnonymizeResult['removals'] = [];
    const categories = Object.keys(CATEGORY_LABEL) as Array<keyof PiiEntities>;
    for (const category of categories) {
        // longest-first so "Dana Whitfield" replaces before "Dana"
        const values = [...new Set(entities[category])].sort((a, b) => b.length - a.length);
        for (const original of values) {
            if (original.trim().length < 2) continue;
            const replacement = pseudonymFor(map, category, original);
            const re = new RegExp(escapeRe(original), 'gi');
            const count = (out.match(re) || []).length;
            if (count > 0) {
                out = out.replace(re, replacement);
                removals.push({ category: CATEGORY_LABEL[category], original, replacement, count });
            }
        }
    }
    return { text: out, removals };
}

export interface TranscriptSynthesis {
    clientGoals: string[];
    stakeholders: string[];
    impliedResearchNeeds: string[];
    businessChallenges: string[];
    researchAngles: string[];
    thematicPhrases: string[];
    riskFlags: string[];
}

/** Route a one-shot text call to whatever model the artifact authority picks. */
async function routedText(model: string, system: string, user: string, maxTokens: number, label: string): Promise<string> {
    const endpoint: AIEndpointId = endpointForModel(model) as AIEndpointId;
    if (endpoint === 'anthropic') {
        const parsed = await callAIWithRetry('anthropic', {
            model, max_tokens: maxTokens, system,
            messages: [{ role: 'user', content: user }],
        }, { label, maxAttempts: 2, requestTimeoutMs: 120_000 });
        return parsed?.content?.[0]?.text ?? '';
    }
    const parsed = await callAIWithRetry('gemini', {
        model,
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        config: { maxOutputTokens: maxTokens },
    }, { label, maxAttempts: 2, requestTimeoutMs: 120_000 });
    return parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/** Synthesize what the (anonymized) transcripts establish (the seven signals of PDF item 2). */
export async function synthesizeTranscripts(texts: Array<{ name: string; text: string }>): Promise<TranscriptSynthesis | null> {
    const model = artifactModelFor('report');
    const system = [
        'You synthesize client meeting transcripts for a consulting research team. Return ONLY JSON:',
        '{"clientGoals":[],"stakeholders":[],"impliedResearchNeeds":[],"businessChallenges":[],"researchAngles":[],"thematicPhrases":[],"riskFlags":[]}',
        'clientGoals: goals the client explicitly stated. stakeholders: audience/stakeholder context (anonymized labels are fine).',
        'impliedResearchNeeds: research the conversation implies but never names. businessChallenges: the concrete problems.',
        'researchAngles: specific angles worth investigating. thematicPhrases: usable non-sensitive phrases in the client\'s own words.',
        'riskFlags: content that must NOT appear verbatim in client deliverables (grievances, names of struggling teams, confidential figures).',
        'Each item one plain sentence or phrase. Nothing invented; only what the transcripts establish.',
    ].join('\n');
    const user = texts.map(t => `=== TRANSCRIPT: ${t.name} ===\n${t.text.slice(0, 40_000)}`).join('\n\n').slice(0, 120_000);
    try {
        const raw = await routedText(model, system, user, 3000, 'Transcript synthesis');
        const obj = salvageJsonObject<any>(raw) as any;
        if (!obj || typeof obj !== 'object') return null;
        const arr = (v: any) => (Array.isArray(v) ? v.filter((x: any) => typeof x === 'string' && x.trim()) : []);
        return {
            clientGoals: arr(obj.clientGoals), stakeholders: arr(obj.stakeholders),
            impliedResearchNeeds: arr(obj.impliedResearchNeeds), businessChallenges: arr(obj.businessChallenges),
            researchAngles: arr(obj.researchAngles), thematicPhrases: arr(obj.thematicPhrases), riskFlags: arr(obj.riskFlags),
        };
    } catch (e: any) {
        console.warn('[transcriptIntake] synthesis failed:', e?.message || e);
        return null;
    }
}

/**
 * Generate the focused research goal from the synthesis + optional public
 * context + whatever the user already typed (their hint wins on conflicts).
 */
export async function generateResearchGoal(
    synthesis: TranscriptSynthesis, opts: { publicContext?: string; userHint?: string } = {},
): Promise<string> {
    const model = artifactModelFor('strategy');
    const system = [
        'You write ONE focused research objective for a consulting research engine. Return ONLY the objective text: 1-2 sentences.',
        'It must name the audience/market, the decision or friction under study, and the time horizon when one is implied.',
        'Specific enough to drive source selection; broad enough to admit external evidence. Plain literal business language,',
        'no em-dash, no buzzwords, no meta-language ("this research will..."). State the objective directly.',
    ].join(' ');
    const user = [
        opts.userHint?.trim() ? `The user's own draft or hint (respect its direction): ${opts.userHint.trim()}` : '',
        `Client goals: ${synthesis.clientGoals.join('; ') || '(none stated)'}`,
        `Business challenges: ${synthesis.businessChallenges.join('; ') || '(none)'}`,
        `Implied research needs: ${synthesis.impliedResearchNeeds.join('; ') || '(none)'}`,
        `Candidate angles: ${synthesis.researchAngles.join('; ') || '(none)'}`,
        opts.publicContext?.trim() ? `Public company context: ${opts.publicContext.trim().slice(0, 4000)}` : '',
    ].filter(Boolean).join('\n');
    const out = await routedText(model, system, user, 400, 'Research goal generation');
    return scrubRewrite(out).replace(/\n+/g, ' ').trim();
}
