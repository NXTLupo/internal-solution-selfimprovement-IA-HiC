/**
 * briefParser — Structured extraction of research intent from freeform briefs.
 *
 * Takes anything from a one-sentence goal to a 1,700-word deep-research brief
 * and produces a ParsedBrief object the rest of the pipeline can reason about.
 *
 * The transformation is NON-LOSSY on structure — every explicit research
 * question, every named subreddit, every peer institution, every date filter
 * and exclusion rule is captured verbatim. The old refineSearchQueries()
 * collapsed the whole brief into 4-8 keywords per category; this preserves
 * the brief's explicit intent so downstream collection can honor it.
 *
 * Model: Gemini 2.5 Flash with strict responseSchema. Cheap, fast, structured.
 * Fallback: if parsing fails, returns a minimal brief (mission=goal, one Q1).
 *   Collection proceeds with reduced intelligence rather than blocking.
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { ParsedBrief } from './evidenceRecord';

// --- Vertical catalog ---
// The verticals[] field of ParsedBrief must match one of these tags. Brief
// parser is instructed to pick 1-3 verticals per brief from this list.
// Add a vertical by: 1) adding to this list, 2) adding a corresponding
// research skill in Tier 2.2. Skills themselves will tag their supported
// verticals so the resolver stays decoupled from this enum.
export const KNOWN_VERTICALS = [
    'higher_ed',
    'fundraising',
    'healthcare',
    'life_sciences',
    'saas',
    'enterprise_it',
    'retail',
    'dtc',
    'cpg',
    'financial_services',
    'insurance',
    'nonprofit',
    'government',
    'policy',
    'media',
    'education',
    'manufacturing',
    'energy',
    'real_estate',
    'ai_research',
    'workforce',
    'sustainability',
] as const;

export type Vertical = typeof KNOWN_VERTICALS[number];

// --- Parse function ---

/**
 * Parse a research brief into structured form.
 * Returns the extracted ParsedBrief. On any AI failure, returns a minimal
 * fallback object so collection can still proceed.
 */
export async function parseBrief(rawBrief: string): Promise<ParsedBrief> {
    const trimmed = (rawBrief || '').trim();
    if (trimmed.length === 0) {
        return fallbackBrief('');
    }

    // Cheap parse for very short briefs — no AI call needed
    if (trimmed.length < 80) {
        return fallbackBrief(trimmed);
    }

    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) {
        console.warn('[briefParser] GEMINI_API_KEY missing, returning fallback brief');
        return fallbackBrief(trimmed);
    }

    const prompt = buildPrompt(trimmed);

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
                responseSchema: buildSchema(),
            },
        });
        let text = response.text || '{}';
        if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
        else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

        const parsed = JSON.parse(text);
        return normalize(parsed, trimmed);
    } catch (e: any) {
        console.warn('[briefParser] parse failed, returning fallback:', e?.message);
        return fallbackBrief(trimmed);
    }
}

// --- PROMPT ---

function buildPrompt(brief: string): string {
    return `You are a research-brief parser. Your job is to extract the EXPLICIT, LITERAL structure of the research brief below — every question, every named entity, every filter, every exclusion rule.

DO NOT PARAPHRASE. DO NOT GUESS. If the brief doesn't state something, leave the array empty.

The brief may be:
- a one-sentence research goal
- a structured deep-research prompt with date filters and source lists
- a conversational request

Your output MUST be JSON matching the schema. Follow these rules:

MISSION: one sentence summarizing the research objective. Quote the brief's own language where possible.

VERTICALS: pick 1-3 tags from this list that best match the brief's domain:
  ${KNOWN_VERTICALS.join(', ')}
Pick conservatively. If the brief is genuinely cross-domain, pick the primary and one secondary. Do NOT include 'ai_research' just because AI is mentioned as a tactic — only include it if the research is ABOUT the AI industry itself.

QUESTIONS: extract every explicit research question from the brief. Assign IDs Q1, Q2, ... in the order they appear. If a question is numbered or bulleted in the brief, preserve that order. If the brief is a single sentence, produce one Q1 matching the sentence. Mark priority as 'critical' | 'important' | 'nice-to-have' only if the brief signals it explicitly (e.g., 'most importantly', 'if time permits').

DATE FILTER: extract the from/to window if the brief declares one. Use ISO-8601 YYYY-MM-DD. If the brief says "last two years" without dates, leave empty — do not guess.

INCLUDE RULES: short phrases describing positive filters ("donor acquisition", "alumni re-engagement via digital channels"). Quote the brief's own language. Each rule is one phrase, not a sentence.

EXCLUDE RULES: same for negative filters ("generic AI technology articles", "political commentary without a giving angle"). Quote verbatim where possible.

EXCLUDED DOMAINS: if the brief says "exclude [organization]-produced content" or "no content from [domain].com", extract the domain root. Leave empty if no explicit domain exclusion.

NAMED ENTITIES — extract verbatim, do not paraphrase, preserve the brief's list order:
  - subreddits: strip the "r/" prefix. ["NEU", "highereducation"] not ["r/NEU", "r/highereducation"]
  - publications: trade press, news outlets, journals. Preserve proper names: "Chronicle of Philanthropy", "CASE", "Higher Ed Dive".
  - peerEntities: peer institutions, companies, organizations to compare against. "Boston University", "NYU", "Cornell".
  - vendors: software vendors, platforms, tools named in the brief. "Blackbaud", "iWave", "Salesforce".
  - hashtags: social media hashtags including the "#". ["#GivingTuesday", "#AlumniGiving"]
  - authors: specific people named as sources of insight. Leave empty unless named explicitly.

PARSE CONFIDENCE: 0-1 score. 1.0 = brief was fully structured and everything extracted cleanly. 0.5 = some intent had to be inferred. Below 0.3 = very unclear brief.

UNPARSED SEGMENTS: paragraphs or sentences from the brief that didn't fit any structured field. Each element is a short excerpt (<200 chars) with ellipsis if needed. Leave empty if every meaningful part was extracted.

=== BRIEF TO PARSE ===
${brief}
=== END BRIEF ===

Return JSON only.`;
}

// --- SCHEMA ---

function buildSchema(): any {
    const str = { type: Type.STRING };
    const strArr = { type: Type.ARRAY, items: str };
    return {
        type: Type.OBJECT,
        properties: {
            mission: str,
            verticals: strArr,
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: str,
                        text: str,
                        priority: str,
                    },
                    required: ['id', 'text'],
                },
            },
            dateFilter: {
                type: Type.OBJECT,
                properties: { from: str, to: str },
            },
            includeRules: strArr,
            excludeRules: strArr,
            excludedDomains: strArr,
            namedEntities: {
                type: Type.OBJECT,
                properties: {
                    subreddits: strArr,
                    publications: strArr,
                    peerEntities: strArr,
                    vendors: strArr,
                    hashtags: strArr,
                    authors: strArr,
                },
            },
            parseConfidence: { type: Type.NUMBER },
            unparsedSegments: strArr,
        },
        required: ['mission', 'verticals', 'questions', 'parseConfidence'],
    };
}

// --- NORMALIZATION ---

function normalize(parsed: any, rawBrief: string): ParsedBrief {
    const verticals = Array.isArray(parsed.verticals)
        ? parsed.verticals.filter((v: string) => (KNOWN_VERTICALS as readonly string[]).includes(v))
        : [];

    const questions = Array.isArray(parsed.questions)
        ? parsed.questions.slice(0, 20).map((q: any, i: number) => ({
            id: q.id || `Q${i + 1}`,
            text: String(q.text || '').trim(),
            priority: q.priority && ['critical', 'important', 'nice-to-have'].includes(q.priority) ? q.priority : undefined,
        })).filter((q: any) => q.text.length > 0)
        : [];

    // Guarantee at least one question — if the AI produced none, wrap the brief itself
    if (questions.length === 0) {
        questions.push({ id: 'Q1', text: rawBrief.substring(0, 500) });
    }

    const ne = parsed.namedEntities || {};
    const namedEntities: ParsedBrief['namedEntities'] = {
        subreddits: cleanStringArray(ne.subreddits).map(s => s.replace(/^r\//i, '')),
        publications: cleanStringArray(ne.publications),
        peerEntities: cleanStringArray(ne.peerEntities),
        vendors: cleanStringArray(ne.vendors),
        hashtags: cleanStringArray(ne.hashtags).map(s => s.startsWith('#') ? s : '#' + s),
        authors: cleanStringArray(ne.authors),
    };

    const dateFilter = parsed.dateFilter && (parsed.dateFilter.from || parsed.dateFilter.to)
        ? {
            from: String(parsed.dateFilter.from || '').trim(),
            to: parsed.dateFilter.to ? String(parsed.dateFilter.to).trim() : undefined,
        }
        : undefined;

    return {
        mission: String(parsed.mission || rawBrief.substring(0, 200)).trim(),
        verticals,
        questions,
        dateFilter,
        includeRules: cleanStringArray(parsed.includeRules),
        excludeRules: cleanStringArray(parsed.excludeRules),
        excludedDomains: cleanStringArray(parsed.excludedDomains).map(s => s.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')),
        namedEntities,
        rawBrief,
        parseConfidence: clampNumber(parsed.parseConfidence, 0, 1, 0.5),
        unparsedSegments: cleanStringArray(parsed.unparsedSegments).slice(0, 10),
    };
}

function cleanStringArray(val: any): string[] {
    if (!Array.isArray(val)) return [];
    return val
        .map((x: any) => typeof x === 'string' ? x.trim() : '')
        .filter((x: string) => x.length > 0)
        .slice(0, 50);
}

function clampNumber(val: any, min: number, max: number, fallback: number): number {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

// --- FALLBACK ---

export function fallbackBrief(rawBrief: string): ParsedBrief {
    const trimmed = rawBrief.trim();
    return {
        mission: trimmed.substring(0, 200) || 'Untitled research',
        verticals: [],
        questions: trimmed.length > 0
            ? [{ id: 'Q1', text: trimmed.substring(0, 500) }]
            : [],
        dateFilter: undefined,
        includeRules: [],
        excludeRules: [],
        excludedDomains: [],
        namedEntities: {
            subreddits: [],
            publications: [],
            peerEntities: [],
            vendors: [],
            hashtags: [],
            authors: [],
        },
        rawBrief: trimmed,
        parseConfidence: 0,
        unparsedSegments: [],
    };
}

// --- HUMAN-READABLE SUMMARY (for UI display) ---

export function summarizeBrief(brief: ParsedBrief): string {
    const parts: string[] = [];
    parts.push(`Mission: ${brief.mission}`);
    if (brief.verticals.length > 0) parts.push(`Verticals: ${brief.verticals.join(', ')}`);
    parts.push(`${brief.questions.length} research question${brief.questions.length === 1 ? '' : 's'}`);
    if (brief.dateFilter?.from) parts.push(`Date window: ${brief.dateFilter.from}${brief.dateFilter.to ? ` → ${brief.dateFilter.to}` : ' →'}`);
    const neCount =
        brief.namedEntities.subreddits.length +
        brief.namedEntities.publications.length +
        brief.namedEntities.peerEntities.length +
        brief.namedEntities.vendors.length +
        brief.namedEntities.hashtags.length;
    if (neCount > 0) parts.push(`${neCount} named entit${neCount === 1 ? 'y' : 'ies'}`);
    if (brief.excludeRules.length > 0) parts.push(`${brief.excludeRules.length} exclusion rule${brief.excludeRules.length === 1 ? '' : 's'}`);
    parts.push(`parse confidence ${Math.round(brief.parseConfidence * 100)}%`);
    return parts.join(' · ');
}
