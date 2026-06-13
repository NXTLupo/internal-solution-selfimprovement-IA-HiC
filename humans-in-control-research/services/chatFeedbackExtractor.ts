// chatFeedbackExtractor.ts -- 2026-05-19
//
// Captures user feedback signals from the Analyst Desk and Designer Desk
// chat surfaces and turns them into FeedbackSignal objects that the
// promptImprovementEngine can persist as learned constraints.
//
// Why this exists:
//   The original capture surface (AnalysisCheckpoint logEdit) was rendered
//   unreachable when the workbench moved to a chat-first UX. Without a new
//   capture path, the self-improvement loop is starved of input regardless
//   of whether the downstream pipeline (detectPatterns + auto-approve +
//   wiki write) is wired correctly.
//
// Design:
//   1. Pre-filter every user message with cheap regex. Most messages are
//      requests, not feedback -- they should not pay the cost of an LLM
//      classification round-trip.
//   2. For messages that LOOK like feedback, fire one small LLM call that
//      classifies into correction | rejection | rule | none and extracts
//      an actionable constraint string for correction/rule.
//   3. Return a FeedbackSignal or null. Callers fire-and-forget; the
//      classifier failing is non-fatal.

import { callAIWithRetry } from './aiRetryClient';

export type FeedbackType = 'correction' | 'rejection' | 'rule' | 'none';

export interface FeedbackSignal {
    type: Exclude<FeedbackType, 'none'>;
    userText: string;
    aiText: string;
    extractedRule: string;
    confidence: number;
    chatSurface: 'analyst' | 'designer';
    timestamp: number;
    /**
     * 2026-05-20 - Artifact kind this feedback applies to ('journey',
     * 'blueprint', 'persona', 'org', 'arch', 'roadmap', 'theme', 'recommendation',
     * etc.). Extracted by the classifier from the message + active-artifact
     * context. 'all' (or undefined) for messages that apply universally.
     * The promptImprovementEngine uses this to scope rules so journey-specific
     * preferences don't pollute persona generation.
     */
    artifactKind?: string;
}

// --- PRE-FILTER ---
// Cheap regex gate. If a message contains none of these, skip the LLM call.
// False negatives (missed feedback) are acceptable; false positives just
// cost one extra small LLM call.

const NEGATION_RX = /\b(no|don'?t|never|not|without|stop|doesn'?t|isn'?t|wrong|incorrect|bad|too\s+(long|short|much|little|wordy|generic|vague|verbose))\b/i;
const RULE_RX = /\b(always|from\s+now\s+on|going\s+forward|every\s+time|whenever|instead|rule:|never\s+use|stop\s+using|don'?t\s+use|prefer|should(\s+not)?\s+\w+|shouldn'?t|must\s+(not\s+)?\w+)\b/i;
const PREFERENCE_RX = /\b(prefer|better|worse|like|annoying|frustrating|awkward|clunky|stilted|formulaic|generic|hedging|wishy-washy)\b/i;
const IMPERATIVE_RX = /^(make|change|fix|rewrite|redo|shorten|lengthen|simplify|clarify|tighten|remove|add|delete|replace|use|swap|cut|drop)\s/i;
// 2026-05-20 - Density/detail preferences. These are RULES (apply to every
// future generation) even when phrased as a one-shot correction ("more
// detailed", "more activities", "include 3 pain points per phase"). Without
// this gate the classifier sees them as plain corrections and never persists
// them, forcing the user to repeat the same instruction every regeneration.
const DENSITY_RX = /\b(more|fewer|less|N|\d+)\s+(activit(?:y|ies)|pain[\s-]?points?|detail|details|items|stages|phases|cells|lanes|quotes|swimlanes|touchpoints?|steps?|nodes?|columns?|rows?)\b/i;
const PER_X_RX = /\b(per|each|every)\s+(phase|swimlane|lane|stage|cell|column|row|step|touchpoint)\b/i;

export function looksLikeFeedback(text: string): boolean {
    if (!text || text.length < 4) return false;
    // Long messages are usually new requests with rich context, not pure feedback.
    if (text.length > 800) return false;
    return NEGATION_RX.test(text)
        || RULE_RX.test(text)
        || PREFERENCE_RX.test(text)
        || IMPERATIVE_RX.test(text)
        || DENSITY_RX.test(text)
        || PER_X_RX.test(text);
}

/** Pre-classify density/detail preferences before the LLM call so we can
 *  push them through as `rule` (universal directive) instead of letting the
 *  classifier mis-tag them as one-off `correction`. Returns true when the
 *  message contains language like "more activities per phase", "always
 *  include 3 pain points", "fewer details", etc. */
export function isDensityPreference(text: string): boolean {
    return DENSITY_RX.test(text) && (PER_X_RX.test(text) || /\b(always|every|each|more|fewer|all)\b/i.test(text));
}

// --- CLASSIFIER ---

const CLASSIFIER_SYSTEM = `You classify a single user chat message into one of four categories: correction, rejection, rule, none. You ALSO identify which artifact kind the feedback applies to.

Categories:
- correction: User wants a specific one-off change to the most recent AI output (e.g. "fix the title on this one", "change Sarah's name to Maria here").
- rejection: User dismisses the AI output without asking for a specific change (e.g. "no", "that's wrong", "not what I asked for").
- rule: User states a preference that SHOULD APPLY TO ALL FUTURE GENERATIONS of similar artifacts. EXAMPLES OF RULES (these are STILL rules even though phrased as if about the current artifact):
    * "more activities per phase" → rule (every future journey/blueprint cell needs more activities)
    * "always include pain points" → rule
    * "every cell should have 3 items" → rule
    * "more detail" / "more detailed" → rule (apply density preference to every future regeneration)
    * "include multiple touchpoints" → rule
    * "fewer phases" → rule
    * "never use the word 'leverage'" → rule
    * "stop adding emojis" → rule
    * "always cite a named external source" → rule
    * "remove the metadata codes" / "no S-01 codes" → rule (sticky removal preference)
    * "remove the KPI tiles" → rule
  CRITICAL: If a request is about HOW the output should be structured/styled/sized, and it would still be true on the NEXT regeneration, classify as rule. Use rule LIBERALLY for density, structure, tone, length, and visibility preferences. Reserve correction ONLY for genuinely one-off content edits ("change THIS specific number", "fix THIS typo").

- none: User is making a new request for a different artifact, asking a question, or providing neutral information.

For correction and rule categories, ALSO extract an actionable constraint as plain English, written as an imperative sentence that could be appended to a future system prompt. The constraint must be self-contained.

Artifact kind: identify what artifact the feedback applies to. Valid values:
  journey, blueprint, persona, org, arch, roadmap, theme, recommendation, deck, prd, gap, competitive, audit, report, all
Use 'all' when the message could apply to any artifact (e.g. "no emojis", "always cite a real source"). Use a specific kind when the message references journey-specific (swimlanes, phases, pain points), blueprint-specific (swimlanes, frontstage/backstage), persona-specific (JTBD, demographics), etc. terminology, OR when the active artifact context says one specific kind.

Strict output format -- a single JSON object, no prose, no markdown fence:
{"type": "correction" | "rejection" | "rule" | "none", "extractedRule": string, "confidence": number, "artifactKind": "journey" | "blueprint" | "persona" | "org" | "arch" | "roadmap" | "theme" | "recommendation" | "deck" | "prd" | "gap" | "competitive" | "audit" | "report" | "all"}

Confidence is 0-1. Default confidence 0.85 for clear density/structure/style rules. If the message is ambiguous, lower the confidence and pick the most likely category. If "none", set extractedRule to "" and artifactKind to "all".`;

interface ClassifierResult {
    type: FeedbackType;
    extractedRule: string;
    confidence: number;
    artifactKind?: string;
}

async function callClassifier(userText: string, aiText: string, activeArtifactKind?: string): Promise<ClassifierResult | null> {
    const kindHint = activeArtifactKind
        ? `\n\nACTIVE ARTIFACT KIND (context): ${activeArtifactKind} - use this to disambiguate artifactKind unless the message explicitly references a different kind.`
        : '';
    const userPayload = `RECENT AI OUTPUT (truncated):\n${aiText.slice(0, 400) || '(no prior AI message in context)'}${kindHint}\n\nUSER MESSAGE:\n${userText}`;

    try {
        // 2026-05-20 - Switched from OpenAI to Gemini Flash. The OpenAI key
        // on this account hits insufficient_quota 429s constantly; classifier
        // calls have been silently failing for the whole session, which is
        // why feedback hasn't been getting persisted as rules. Gemini Flash
        // is the same speed/cost class and the workbench's healthiest
        // provider.
        const parsed = await callAIWithRetry('gemini', {
            model: 'gemini-3.5-flash',
            systemInstruction: { parts: [{ text: CLASSIFIER_SYSTEM }] },
            contents: [{ role: 'user', parts: [{ text: userPayload }] }],
            config: {
                temperature: 0.0,
                maxOutputTokens: 250,
                responseMimeType: 'application/json',
            },
        }, {
            label: 'ChatFeedback classify',
            // 2026-06-12 - one retry (was 1 attempt): transient provider
            // hiccups were a silent-drop class alongside parse failures.
            maxAttempts: 2,
            requestTimeoutMs: 10_000,
        });

        const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
            ?? parsed?.choices?.[0]?.message?.content
            ?? '';
        if (!content) return null;

        const cleaned = content
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/, '')
            .trim();

        // 2026-06-12 - CAPTURE ROBUSTNESS (supercharge 6.1). The classifier
        // sometimes answers in prose despite responseMimeType json (observed
        // live: 'Unexpected token H, "Here is th"...'). Previously this was a
        // SILENT SIGNAL DROP. Now: (1) salvage the first {...} object from a
        // prose-wrapped reply before parsing; (2) on total parse failure fall
        // back to a deterministic regex classification so an imperative
        // correction still persists as a signal.
        let obj: any = null;
        try {
            obj = JSON.parse(cleaned);
        } catch {
            const s = cleaned.indexOf('{');
            const e = cleaned.lastIndexOf('}');
            if (s >= 0 && e > s) {
                try { obj = JSON.parse(cleaned.slice(s, e + 1)); } catch { /* fall through */ }
            }
        }
        if (!obj || typeof obj.type !== 'string') {
            console.warn(`[chatFeedbackExtractor] classifier returned unparseable output (${cleaned.slice(0, 60)}...) - using regex fallback`);
            return _regexFallbackClassify(userText, activeArtifactKind);
        }

        return {
            type: obj.type,
            extractedRule: String(obj.extractedRule || '').trim(),
            confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.6,
            artifactKind: typeof obj.artifactKind === 'string' ? obj.artifactKind : activeArtifactKind,
        };
    } catch (err: any) {
        // Provider outage is non-fatal, but the signal must not be lost
        // silently: deterministic regex fallback classification.
        console.warn('[chatFeedbackExtractor] classifier failed:', err?.message || err);
        return _regexFallbackClassify(userText, activeArtifactKind);
    }
}

/** Deterministic fallback when the LLM classifier is unavailable or emits
 *  unparseable output. Imperative phrasing ("make/change/always/never...")
 *  classifies as a correction carrying the user's verbatim words; confidence
 *  is set below the rule-promotion threshold so it informs regeneration and
 *  clustering without auto-writing constraints. */
function _regexFallbackClassify(userText: string, activeArtifactKind?: string): ClassifierResult | null {
    const t = (userText || '').trim();
    if (!t) return null;
    const isRule = /\b(always|never|must|from now on|every time)\b/i.test(t);
    const isImperative = IMPERATIVE_RX.test(t);
    if (!isRule && !isImperative) return null;
    return {
        type: isRule ? 'rule' : 'correction',
        extractedRule: t.slice(0, 220),
        confidence: 0.55,
        artifactKind: activeArtifactKind,
    };
}

// --- TOP-LEVEL ---

/**
 * Classify a single chat message. Returns null when:
 *   - message does not look like feedback (regex pre-filter rejected)
 *   - classifier said 'none' or failed
 *   - confidence is below 0.5
 *
 * Callers should fire-and-forget; non-blocking by design.
 */
export async function classifyMessage(
    userText: string,
    aiText: string | undefined,
    chatSurface: 'analyst' | 'designer',
    activeArtifactKind?: string,
): Promise<FeedbackSignal | null> {
    if (!looksLikeFeedback(userText)) return null;

    const result = await callClassifier(userText, aiText || '', activeArtifactKind);
    if (!result) return null;
    if (result.type === 'none') return null;
    if (result.confidence < 0.5) return null;

    // 2026-05-20 - Density-preference upgrade: if the message clearly states
    // a density/structural preference ("more activities per phase", "always
    // include 3 pain points"), upgrade `correction` → `rule` and floor the
    // confidence at 0.85 so it bypasses the 5-edit detect-patterns threshold
    // and writes immediately to the wiki ledger. Without this, density
    // preferences linger as one-shot corrections and the user has to repeat
    // them every generation.
    let finalType = result.type;
    let finalConfidence = result.confidence;
    if (result.type === 'correction' && isDensityPreference(userText)) {
        finalType = 'rule';
        finalConfidence = Math.max(0.85, result.confidence);
        console.log(`[chatFeedbackExtractor] upgraded correction → rule (density preference): "${userText.slice(0, 80)}"`);
    }

    return {
        type: finalType as Exclude<FeedbackType, 'none'>,
        userText,
        aiText: (aiText || '').slice(0, 400),
        extractedRule: result.extractedRule,
        confidence: finalConfidence,
        chatSurface,
        timestamp: Date.now(),
        artifactKind: result.artifactKind || activeArtifactKind || 'all',
    };
}
