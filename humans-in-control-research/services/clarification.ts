/**
 * DF-F1 + DF-F2 - TYPED CLARIFICATION (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * deer-flow's `ask_clarification` carries a versioned payload and validates it
 * ATOMICALLY: if any field is structurally broken, the WHOLE payload degrades to
 * the simple free-text mode rather than rendering a form with a silently missing
 * field. That rule is the difference between a clarification UI and a data-loss
 * bug, and it is copied here verbatim in spirit.
 *
 * The REJECT from the plan is enforced here too, in code rather than in prose:
 * clarification is NOT a general capability the model may reach for whenever it
 * feels uncertain. There are exactly three triggers (`CLARIFICATION_TRIGGERS`),
 * each chosen because it currently burns a full research run on a guess:
 *
 *   objective_underspecified - the goal names no subject, industry, or audience.
 *   pack_mismatch            - the objective's industry matches no pack profile.
 *                              This is the off-industry incident, caught BEFORE
 *                              collection rather than after publication.
 *   deliverable_ambiguous    - a hashtag-free ask could be three artifact types.
 *
 * One question covering every missing parameter, never one at a time.
 */

export type ClarificationMode = 'free_text' | 'choice_with_other' | 'form';

export type ClarificationTrigger = 'objective_underspecified' | 'pack_mismatch' | 'deliverable_ambiguous';

/** Caps copied from deer-flow's contract. Exceeding any of them is a hard reject. */
export const CLARIFICATION_LIMITS = {
    maxFields: 16,
    maxOptionsPerField: 24,
    maxTextChars: 200,
    maxSerializedChars: 8_000,
} as const;

export interface ClarificationOption {
    value: string;
    label: string;
}

export interface ClarificationField {
    id: string;
    /** The question as the user reads it. */
    label: string;
    mode: ClarificationMode;
    /** Required for `choice_with_other`; ignored otherwise. */
    options?: ClarificationOption[];
    /** True when the run cannot proceed without an answer. */
    required: boolean;
    placeholder?: string;
}

export interface ClarificationRequest {
    version: 1 | 2;
    trigger: ClarificationTrigger;
    /** One sentence naming what is missing and why it matters. */
    preamble: string;
    fields: ClarificationField[];
    /** Set when validation degraded a v2 form to v1. */
    degradedFrom?: 2;
    degradeReason?: string;
}

export interface ValidationResult {
    ok: boolean;
    /** Always present: either the validated request or its degraded fallback. */
    request: ClarificationRequest;
    problems: string[];
}

const ID_RE = /^[a-z][a-z0-9_]{1,40}$/i;

function fieldProblems(f: any, index: number): string[] {
    const problems: string[] = [];
    const where = `field[${index}]`;
    if (!f || typeof f !== 'object') return [`${where} is not an object`];
    if (typeof f.id !== 'string' || !ID_RE.test(f.id)) problems.push(`${where}.id is not a usable identifier`);
    if (typeof f.label !== 'string' || f.label.trim().length < 3) problems.push(`${where}.label is missing or too short to be a question`);
    if (f.mode !== 'free_text' && f.mode !== 'choice_with_other' && f.mode !== 'form') problems.push(`${where}.mode "${f.mode}" is not a clarification mode`);
    if (f.mode === 'choice_with_other') {
        if (!Array.isArray(f.options) || f.options.length < 2) {
            problems.push(`${where} offers a choice with fewer than two options`);
        } else if (f.options.length > CLARIFICATION_LIMITS.maxOptionsPerField) {
            problems.push(`${where} offers ${f.options.length} options (max ${CLARIFICATION_LIMITS.maxOptionsPerField})`);
        } else {
            for (const [i, o] of f.options.entries()) {
                if (!o || typeof o.value !== 'string' || typeof o.label !== 'string' || !o.label.trim()) {
                    problems.push(`${where}.options[${i}] is missing a value or label`);
                }
            }
        }
    }
    if (typeof f.placeholder === 'string' && f.placeholder.length > CLARIFICATION_LIMITS.maxTextChars) {
        problems.push(`${where}.placeholder exceeds ${CLARIFICATION_LIMITS.maxTextChars} chars`);
    }
    return problems;
}

/**
 * The degraded form. A single free-text question that still names what is missing,
 * so a broken payload costs the STRUCTURE of the question and never the question
 * itself.
 */
export function degradeToFreeText(
    trigger: ClarificationTrigger, preamble: string, reason: string, fields: any[] = [],
): ClarificationRequest {
    const names = (Array.isArray(fields) ? fields : [])
        .map(f => (typeof f?.label === 'string' ? f.label.trim() : ''))
        .filter(Boolean);
    const label = names.length
        ? `${preamble} Please answer in one message: ${names.join('; ')}`
        : preamble;
    return {
        version: 1,
        trigger,
        preamble,
        fields: [{ id: 'answer', label, mode: 'free_text', required: true }],
        degradedFrom: 2,
        degradeReason: reason,
    };
}

/**
 * ATOMIC validation. Any structurally broken field degrades the WHOLE payload.
 * There is no partial render: a form that shows five of six business fields while
 * reporting success is the failure this rule exists to prevent.
 */
export function validateClarification(input: any): ValidationResult {
    const problems: string[] = [];
    const trigger: ClarificationTrigger = (['objective_underspecified', 'pack_mismatch', 'deliverable_ambiguous'] as const)
        .includes(input?.trigger) ? input.trigger : 'objective_underspecified';
    const preamble = typeof input?.preamble === 'string' && input.preamble.trim().length >= 8
        ? input.preamble.trim()
        : 'Some details are missing before this run can proceed.';

    if (!input || typeof input !== 'object') problems.push('payload is not an object');
    if (input?.trigger && trigger !== input.trigger) problems.push(`trigger "${input.trigger}" is not one of the three declared trigger points`);
    if (typeof input?.preamble !== 'string' || input.preamble.trim().length < 8) problems.push('preamble is missing or too short');

    const rawFields = Array.isArray(input?.fields) ? input.fields : [];
    if (!rawFields.length) problems.push('payload carries no fields');
    if (rawFields.length > CLARIFICATION_LIMITS.maxFields) problems.push(`payload carries ${rawFields.length} fields (max ${CLARIFICATION_LIMITS.maxFields})`);
    rawFields.forEach((f: any, i: number) => problems.push(...fieldProblems(f, i)));

    const ids = rawFields.map((f: any) => String(f?.id || '').toLowerCase());
    if (new Set(ids).size !== ids.length) problems.push('two fields share an id, so one answer would overwrite the other');

    let serialized = '';
    try { serialized = JSON.stringify(input ?? null) || ''; } catch { problems.push('payload is not serializable'); }
    if (serialized.length > CLARIFICATION_LIMITS.maxSerializedChars) {
        problems.push(`payload serializes to ${serialized.length} chars (max ${CLARIFICATION_LIMITS.maxSerializedChars})`);
    }

    if (problems.length) {
        return {
            ok: false,
            request: degradeToFreeText(trigger, preamble, problems[0], rawFields),
            problems,
        };
    }
    return {
        ok: true,
        request: {
            version: rawFields.some((f: any) => f.mode !== 'free_text') ? 2 : 1,
            trigger,
            preamble,
            fields: rawFields.map((f: any) => ({
                id: f.id, label: f.label.trim(), mode: f.mode,
                options: f.mode === 'choice_with_other' ? f.options : undefined,
                required: f.required !== false,
                placeholder: typeof f.placeholder === 'string' ? f.placeholder : undefined,
            })),
        },
        problems: [],
    };
}

// ---------------------------------------------------------------------------
// DF-F2: the three trigger points, each a deterministic detector.
// ---------------------------------------------------------------------------

export interface TriggerVerdict {
    fire: boolean;
    trigger: ClarificationTrigger | null;
    /** What is missing, in the words the question will use. */
    missing: string[];
    reason: string;
}

/**
 * (a) OBJECTIVE INTAKE. A research objective must name at least a SUBJECT and one
 * of industry or audience. "Analyze the market" is three runs of wasted collection.
 * Deliberately lenient: it fires only when the objective is genuinely bare, because
 * a false trigger is a stall and the plan's REJECT list is explicit about that.
 */
const SUBJECT_HINT_RE = /\b(?:for|about|of|on)\s+(?:the\s+)?([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)*)/;
const INDUSTRY_WORDS = /\b(retail|healthcare|insurance|education|higher\s?ed|finance|banking|energy|agriculture|travel|tourism|manufacturing|logistics|government|nonprofit|saas|telecom|media|hospitality|automotive|pharma|legal|real\s?estate|consulting|recruit\w*|executive\s+search)\b/i;
const AUDIENCE_WORDS = /\b(executives?|c-?suite|cio|cmo|cfo|board|practitioners?|advisors?|clinicians?|students?|alumni|donors?|partners?|operators?|founders?|buyers?|candidates?|recruiters?|customers?|patients?|members?)\b/i;

/**
 * 2026-08-26 (owner report). A prompt asking for "the 25 most engaging marketing
 * email design patterns targeting skincare and cosmetics consumers" fired this
 * trigger anyway: "skincare" and "cosmetics" are not in INDUSTRY_WORDS, and
 * "consumers" is not in AUDIENCE_WORDS. A finite keyword list can never cover every
 * industry or audience word a real objective might use, so a prompt with genuine
 * substance was blocked for a reason that had nothing to do with being vague.
 *
 * This is a keyword-independent specificity signal: how much CONTENT the objective
 * actually carries, regardless of whether any word happens to sit in one of the
 * fixed lists above. "Analyze the market and give me insights" carries almost no
 * content once the generic business filler is removed, so it still fires. A long,
 * detailed ask carries plenty, so it does not, no matter which specific nouns it
 * uses. The keyword lists stay as a fast path; this is the backstop that makes the
 * gate trust a real prompt instead of a finite vocabulary.
 */
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that',
    'these', 'those', 'it', 'its', 'their', 'they', 'we', 'our', 'you', 'your', 'i',
    'me', 'my', 'us', 'each', 'every', 'all', 'some', 'any', 'not', 'no', 'can',
    'will', 'should', 'must', 'may', 'more', 'less', 'than', 'then', 'when', 'where',
    'while', 'because', 'so', 'if', 'into', 'out', 'up', 'down', 'over', 'under',
    'about', 'across', 'before', 'after', 'also', 'both', 'has', 'have', 'had',
    'does', 'do', 'please', 'like',
]);
/**
 * Business words generic enough to carry no specificity on their own. "Market" and
 * "insights" are exactly the words a genuinely vague ask reaches for; a real ask
 * uses them TOO, but alongside real nouns, which is why this list only removes
 * points rather than deciding the verdict by itself.
 */
const GENERIC_FILLER = new Set([
    'analyze', 'analysis', 'research', 'study', 'understand', 'understanding',
    'review', 'evaluate', 'evaluation', 'assess', 'assessment', 'examine',
    'examination', 'look', 'help', 'need', 'needs', 'want', 'wants', 'information',
    'insight', 'insights', 'data', 'report', 'reports', 'market', 'markets',
    'industry', 'industries', 'business', 'businesses', 'company', 'companies',
    'strategy', 'strategies', 'give', 'tell', 'show', 'find', 'explore', 'overview',
    'summary', 'summarize', 'detail', 'details', 'thing', 'things', 'stuff',
]);

/** Distinct content words: real length, not a stopword, not generic filler. */
function contentWordCount(text: string): number {
    const words = text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
    const distinct = new Set(words.filter(w => !STOPWORDS.has(w) && !GENERIC_FILLER.has(w)));
    return distinct.size;
}

/** Below this, the ask is genuinely thin even after removing filler. Above it, the
 *  objective is carrying real substance and the gate has no business stopping it. */
const SPECIFIC_CONTENT_FLOOR = 4;

export function checkObjectiveTrigger(objective: string): TriggerVerdict {
    const text = String(objective || '').trim();
    const missing: string[] = [];
    if (text.length < 12) {
        return {
            fire: true, trigger: 'objective_underspecified',
            missing: ['the subject of the research', 'the industry or market', 'the audience for the deliverable'],
            reason: 'the objective is too short to name a subject',
        };
    }
    const hasSubject = SUBJECT_HINT_RE.test(text) || /"[^"]{3,}"/.test(text);
    const hasIndustry = INDUSTRY_WORDS.test(text);
    const hasAudience = AUDIENCE_WORDS.test(text);
    const hasSpecificContent = contentWordCount(text) >= SPECIFIC_CONTENT_FLOOR;
    if (!hasSubject && !hasSpecificContent) missing.push('the subject of the research (the product, market, organization, or audience)');
    if (!hasIndustry && !hasAudience && !hasSpecificContent) missing.push('the industry or the audience, so sources can be selected');
    // Fire only when EVERY signal is absent, including the content-richness backstop.
    // Any one of the four is enough to plan a run.
    const fire = !hasSubject && !hasIndustry && !hasAudience && !hasSpecificContent;
    return {
        fire,
        trigger: fire ? 'objective_underspecified' : null,
        missing,
        reason: fire ? 'the objective names no subject, industry, or audience' : 'the objective is specific enough to plan',
    };
}

/**
 * (b) PACK MISMATCH. The objective's industry does not appear in any selected
 * pack's category profile. Asking here costs one question; not asking costs a full
 * collection against the wrong corpus and, once, a published deliverable citing
 * the wrong industry.
 */
export function checkPackTrigger(objective: string, packCategories: string[]): TriggerVerdict {
    const text = String(objective || '').toLowerCase();
    const cats = (packCategories || []).map(c => String(c || '').toLowerCase()).filter(Boolean);
    const industry = (text.match(INDUSTRY_WORDS) || [])[0];
    if (!industry || !cats.length) {
        return { fire: false, trigger: null, missing: [], reason: cats.length ? 'no industry named in the objective' : 'no packs selected yet' };
    }
    const needle = industry.toLowerCase().replace(/\s+/g, '');
    const matched = cats.some(c => {
        const hay = c.replace(/\s+/g, '');
        return hay.includes(needle) || needle.includes(hay);
    });
    return matched
        ? { fire: false, trigger: null, missing: [], reason: `"${industry}" matches a selected pack` }
        : {
            fire: true, trigger: 'pack_mismatch',
            missing: [`whether "${industry}" research should come from the selected packs (${cats.slice(0, 4).join(', ')}) or a different pack`],
            reason: `the objective names "${industry}" and no selected pack covers it`,
        };
}

/**
 * (c) DELIVERABLE AMBIGUITY. A hashtag-free ask whose wording fits three or more
 * artifact types. Below three it is a judgment call the router should just make.
 */
/**
 * Every alternative ends in `\w*` or an explicit optional plural. The first
 * version anchored each alternative with a trailing `\b`, so "competitors" did
 * NOT match "competitor" (the boundary fails against the following "s") and a
 * genuinely three-way ambiguous ask scored two. A word-list detector that misses
 * plurals under-fires, which for a clarification trigger means a wasted run.
 */
const DELIVERABLE_HINTS: Array<{ type: string; re: RegExp }> = [
    { type: 'personas', re: /\b(persona\w*|segment\w*|archetype\w*|who\s+(?:are|is)\s+(?:the|our))/i },
    { type: 'journey-map', re: /\b(journey\w*|touchpoint\w*|end[- ]to[- ]end\s+experience|lifecycle\w*)/i },
    { type: 'competitive', re: /\b(competitor\w*|competitive|landscape\w*|versus|vs\.?\s|alternative\w*)/i },
    { type: 'strategy', re: /\b(strateg\w+|where\s+to\s+play|prioriti[sz]\w+|roadmap\w*)/i },
    { type: 'themes', re: /\b(theme\w*|pattern\w*|signal\w*)/i },
    { type: 'gap', re: /\b(gap\w*|maturity|current\s+state|as[- ]is)/i },
    { type: 'recommendations', re: /\b(recommend\w*|what\s+should\s+we|next\s+steps?|action\w*)/i },
];

export function checkDeliverableTrigger(message: string): TriggerVerdict {
    const text = String(message || '');
    if (/#\w+/.test(text)) {
        return { fire: false, trigger: null, missing: [], reason: 'the ask carries an explicit hashtag' };
    }
    const matches = DELIVERABLE_HINTS.filter(h => h.re.test(text)).map(h => h.type);
    if (matches.length < 3) {
        return { fire: false, trigger: null, missing: [], reason: `${matches.length} artifact type(s) fit; the router can decide` };
    }
    return {
        fire: true, trigger: 'deliverable_ambiguous',
        missing: [`which deliverable this should be: ${matches.join(', ')}`],
        reason: `the ask fits ${matches.length} artifact types with no hashtag to disambiguate`,
    };
}

/**
 * Build ONE request covering every missing parameter across the fired triggers.
 * The SLR rule from the plan: one question, never one at a time.
 */
export function buildClarificationRequest(verdicts: TriggerVerdict[]): ClarificationRequest | null {
    const fired = (verdicts || []).filter(v => v && v.fire && v.trigger);
    if (!fired.length) return null;
    const primary = fired[0].trigger as ClarificationTrigger;
    const fields: ClarificationField[] = [];
    for (const v of fired) {
        for (const [i, m] of v.missing.entries()) {
            fields.push({
                id: `${v.trigger}_${i + 1}`,
                label: `Please specify ${m}.`,
                mode: 'free_text',
                required: true,
            });
        }
    }
    const preamble = fired.length === 1
        ? `Before collecting sources: ${fired[0].reason}.`
        : `Before collecting sources, ${fired.length} details are missing: ${fired.map(v => v.reason).join('; ')}.`;
    const validated = validateClarification({ trigger: primary, preamble, fields });
    return validated.request;
}
