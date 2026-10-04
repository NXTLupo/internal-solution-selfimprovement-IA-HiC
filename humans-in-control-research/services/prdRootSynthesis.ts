/**
 * prdRootSynthesis.ts (2026-10-01, owner directives: "NO BLOCKERS WHEN THE USER ASKS FOR AN OUTPUT" and
 * "make sure each deliverable is more than just a lame set of cards. Everything needs to be consulting
 * grade. No shortcuts")
 *
 * The PrdAir compiler needs typed evidence roots: personas with pain points, journey pains, themes or
 * competitive gaps. A session that never ran #personas / #journey / #gap used to get a refusal. This
 * module SYNTHESIZES the missing roots from the same grounding chunks inside the #prd run, as FULL
 * deliverables, not stubs:
 *   - personas: the dense GOLD profile (defining quote, JTBD, three-tier goals, evidenced pain points and
 *     motivations, behaviors, what wins them, decision process, technology use, a day in the life);
 *   - a journey map: stages x actor lanes, evidenced pains per stage, an opportunity per stage, a takeaway;
 *   - a gap matrix: capability, current vs target maturity, severity, impact, named competitor, evidence.
 * Everything is under the compiler's provenance lock: every quote is verified verbatim against the
 * evidence item it cites, and its source and pointer are copied from that item, never authored by the
 * model. The PRD roots (personas, journey pains, competitive gaps) are derived from the same records, so
 * the deliverables the user sees are exactly what the PRD stands on.
 */
import { extractJsonObject, flattenEvidence, quoteIsVerbatim, type PrdCompilerInputs, type PrdPersonaInput, type PrdJourneyPainInput, type PrdCompetitiveGapInput, type EvidenceItem } from './prdCompiler';

/** The roots the compiler cannot run without. Empty = compile directly. */
export function prdMissingRoots(inputs: PrdCompilerInputs): string[] {
    const missing: string[] = [];
    const painRoots = (inputs.personas || []).some(p => p.painPoints?.length) || (inputs.journeyPains || []).length > 0 || (inputs.themes || []).length > 0;
    if (!painRoots && !(inputs.competitiveGaps || []).length) missing.push('pain roots (personas with pain points, journey pains or themes) or competitive gaps');
    if (!(inputs.personas || []).length) missing.push('personas');
    if (!flattenEvidence(inputs).length) missing.push('evidence items (chunks or quotes) to quote verbatim from');
    return missing;
}

export interface PrdRootSynthesisPrompt { system: string; user: string }

const QUOTE_RULE = 'a VERBATIM span copied character for character from ONE evidence item (no ellipsis inside, no edits)';

/** Prompt that turns the evidence table into the missing deliverables. Only the missing kinds are requested. */
export function buildPrdRootSynthesisPrompt(inputs: PrdCompilerInputs): PrdRootSynthesisPrompt {
    const evidence = flattenEvidence(inputs);
    const needPersonas = !(inputs.personas || []).length;
    const needJourney = !(inputs.journeyPains || []).length;
    const needGaps = !(inputs.competitiveGaps || []).length;
    const ev = evidence.map(e => `[${e.id}] (${e.sourceName}${e.date ? `, ${e.date}` : ''}) ${e.text.replace(/\s+/g, ' ')}`);
    const themes = (inputs.themes || []).slice(0, 24).map(t => `- ${t.id} | ${t.name}${t.insight ? ` | ${t.insight}` : ''}`);
    const want: string[] = [];
    if (needPersonas) want.push(`"personas": 3 to 4 user segments the product must serve (one PRIMARY), each a full research persona:
  { "name": archetype name of 2 to 4 words naming the segment by its situation (never a fake first and last name),
    "role": the segment's role in plain words (<= 60 chars),
    "title": an action title for the persona slide, one plain sentence of at most 12 words stating the judgment about this segment (actor + mechanism),
    "primary": true for exactly one,
    "demographics": ONLY attributes the evidence states about this segment (program, year, situation); omit the field when the evidence states none,
    "quote": { "text": ${QUOTE_RULE} that sounds like this segment speaking: one complete sentence of at most 110 chars, "evidenceId": that item's id },
    "jtbd": "When <situation>, I want <capability>, so I can <outcome>" (<= 120 chars),
    "stageOfStruggle": the moment in their work where the problem bites,
    "goals": { "functionalGoal": what they must get done, "experienceGoal": how they want it to feel, "lifeGoal": the longer outcome it serves } (each <= 75 chars),
    "painPoints": 3 to 4 items { "label": the pain in one plain sentence naming the actor and the mechanism (<= 64 chars), "quote": ${QUOTE_RULE}; choose ONE complete sentence of at most 80 chars that starts at a sentence start (never a mid-sentence fragment, never transcript filler), "evidenceId": that item's id },
    "motivations": 2 to 3 items { "label": what drives them (<= 80 chars), "quote": ${QUOTE_RULE}, "evidenceId": its id },
    "behaviors": 3 observed behaviors stated as plain present-tense sentences (<= 75 chars each),
    "winConditions": 3 things the product must do to earn this segment's use (<= 75 chars each),
    "decisionProcess": one or two sentences on how they decide to adopt or abandon a tool,
    "technologyUsage": one or two sentences on the systems they use today,
    "dayInTheLife": two or three sentences describing a concrete moment where the problem occurs }`);
    if (needJourney) want.push(`"journey": the end-to-end journey the product changes, as a consulting journey map:
  { "title": action title, one plain sentence of at most 12 words naming where the journey breaks,
    "journeyType": the viewpoint in capitals (e.g. STUDENT VIEW), "scope": one clause, "actors": comma-separated actors,
    "stages": 4 to 5 items { "name": stage name of 1 to 3 words (<= 24 chars), "critical": true for AT MOST two stages },
    "lanes": 3 items { "actor": an actor (use your persona names), "role": their role in one clause, "cells": one short clause per stage of what they do there (<= 48 chars), or "not engaged" },
    "stagePains": one array PER STAGE, each with 2 to 3 items, the sharpest first { "text": the pain at that stage (<= 56 chars), "quote": ${QUOTE_RULE} (optional when none fits), "evidenceId": its id, "personaIndexes": zero-based indexes into personas },
    "opportunities": one item PER STAGE, the product opportunity at that stage (<= 56 chars),
    "keyInsight": the structural cost of the broken journey in one or two plain sentences (<= 200 chars) }`);
    if (needGaps) want.push(`"gapMatrix": the capability gaps between what this audience needs and what current products and practice deliver:
  { "title": action title, one plain sentence of at most 12 words,
    "gaps": 4 to 6 items, most severe first { "capability": the capability (<= 40 chars), "currentMaturity": integer 1-5 for today, "targetMaturity": integer 1-5 the product must reach, "severity": "critical" | "high" | "medium", "impact": qualitative consequence of the gap in one plain clause (<= 70 chars, no numbers), "competitor": the named product, vendor or practice the evidence describes, when it names one (<= 40 chars), "quote": ${QUOTE_RULE}; one complete sentence of at most 100 chars, "evidenceId": its id },
    "insight": one plain sentence on the pattern across the gaps (no numbers) }`);
    const system = [
        'You are a senior research consultant deriving product-research deliverables from a fixed evidence table. You never invent evidence.',
        'The output must stand in a McKinsey or Bain engagement: specific, evidenced, decision-useful. No filler, no generic statements that would fit any product.',
        'RULES:',
        '1. Every "quote" is copied character for character from the evidence item named by "evidenceId". If no item supports a claim, omit the quote; drop the claim when the evidence does not imply it.',
        '2. Segments and stages come from what the evidence describes (people quoted, roles named, situations reported). Never add demographic attributes the evidence does not state.',
        '3. Plain literal language: name the actor, the system and the mechanism. No metaphors, no hype words, no em dashes, no numbers outside a verbatim quote (maturity integers excepted). Banned constructions: "<actor> struggles at/with X", "carry the load", "falls through the cracks", "pain point" as a verb, a label that repeats its section heading.',
        '4. Titles are judgments in plain words, never topic labels.',
        '5. Stay inside the objective; ignore evidence about another subject.',
        '6. Reply with ONE JSON object and nothing else.',
    ].join('\n');
    const user = [
        `OBJECTIVE: ${inputs.objective}`,
        inputs.decisionToSupport ? `PRD REQUEST: ${inputs.decisionToSupport}` : '',
        themes.length ? `THEMES ALREADY IN THE SESSION (context, not evidence):\n${themes.join('\n')}` : '',
        `EVIDENCE TABLE (quote only from these items):\n${ev.join('\n')}`,
        `RETURN a JSON object with these keys:\n${want.map(w => `- ${w}`).join('\n')}`,
    ].filter(Boolean).join('\n\n');
    return { system, user };
}

/** A provenance-locked quote: verified verbatim, source and pointer copied from the cited evidence item. */
interface LockedQuote { quote?: string; source?: string; pointer?: string }

export interface SynthesizedPersona extends PrdPersonaInput {
    title?: string;
    demographics?: string;
    jtbd?: string;
    definingQuote?: LockedQuote;
    goals?: { functionalGoal?: string; experienceGoal?: string; lifeGoal?: string };
    motivations?: Array<{ label: string } & LockedQuote>;
    behaviors?: string[];
    winConditions?: string[];
    decisionProcess?: string;
    technologyUsage?: string;
    dayInTheLife?: string;
}
export interface SynthesizedJourney {
    title: string; journeyType?: string; scope?: string; actors?: string;
    stages: Array<{ name: string; critical?: boolean }>;
    lanes: Array<{ actor: string; role?: string; cells: string[] }>;
    stagePains: Array<Array<{ text: string } & LockedQuote>>;
    opportunities: string[];
    keyInsight?: string;
}
export interface SynthesizedGapMatrix {
    title: string;
    gaps: Array<{ capability: string; currentMaturity: number; targetMaturity: number; severity: string; impact: string; competitor?: string } & LockedQuote>;
    insight?: string;
}

export interface PrdRootSynthesisResult {
    inputs: PrdCompilerInputs;
    synthesized: {
        personas: SynthesizedPersona[];
        journeyPains: PrdJourneyPainInput[];
        competitiveGaps: PrdCompetitiveGapInput[];
        journey: SynthesizedJourney | null;
        gapMatrix: SynthesizedGapMatrix | null;
    };
    droppedQuotes: number;
}

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const a = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown, n: number) => a(v).map(s).filter(Boolean).slice(0, n);
const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };

/** Parse + provenance-lock the synthesized deliverables and fill ONLY the roots that were missing. Never throws. */
export function applySynthesizedRoots(inputs: PrdCompilerInputs, raw: string): PrdRootSynthesisResult {
    const empty: PrdRootSynthesisResult = { inputs, synthesized: { personas: [], journeyPains: [], competitiveGaps: [], journey: null, gapMatrix: null }, droppedQuotes: 0 };
    let j: any;
    try { j = extractJsonObject(raw); } catch { return empty; }
    if (!j || typeof j !== 'object') return empty;
    const byId = new Map<string, EvidenceItem>(flattenEvidence(inputs).map(e => [e.id, e]));
    let dropped = 0;
    const lock = (quote: unknown, evidenceId: unknown): LockedQuote => {
        const q = s(quote);
        const ev = byId.get(s(evidenceId));
        if (!q) return {};
        if (!ev || !quoteIsVerbatim(q, ev.text)) { dropped++; return {}; }
        return { quote: q, source: ev.sourceName, pointer: ev.pointer };
    };

    // ---- personas ----
    const personas: SynthesizedPersona[] = [];
    if (!(inputs.personas || []).length) {
        a(j.personas).slice(0, 4).forEach((p: any, i: number) => {
            const name = s(p?.name);
            if (!name) return;
            const painPoints = a(p?.painPoints).slice(0, 4)
                .map((pp: any) => ({ text: s(pp?.label || pp?.text), ...lock(pp?.quote, pp?.evidenceId) }))
                .filter(pp => pp.text);
            if (!painPoints.length) return;
            const g = p?.goals || {};
            const goals = { functionalGoal: s(g.functionalGoal) || undefined, experienceGoal: s(g.experienceGoal) || undefined, lifeGoal: s(g.lifeGoal) || undefined };
            const dq = lock(p?.quote?.text ?? p?.quote, p?.quote?.evidenceId ?? p?.quoteEvidenceId);
            personas.push({
                id: `P${i + 1}`, name, role: s(p?.role) || undefined, primary: !!p?.primary,
                stageOfStruggle: s(p?.stageOfStruggle) || undefined, painPoints,
                title: s(p?.title) || undefined,
                demographics: s(p?.demographics) || undefined,
                jtbd: s(p?.jtbd) || undefined,
                // a defining quote that fails the lock falls back to the strongest verified pain quote
                definingQuote: dq.quote ? dq : (painPoints.find(pp => pp.quote) ? { quote: painPoints.find(pp => pp.quote)!.quote, source: painPoints.find(pp => pp.quote)!.source, pointer: painPoints.find(pp => pp.quote)!.pointer } : undefined),
                goals: (goals.functionalGoal || goals.experienceGoal || goals.lifeGoal) ? goals : undefined,
                motivations: a(p?.motivations).slice(0, 3).map((m: any) => ({ label: s(m?.label || m?.text), ...lock(m?.quote, m?.evidenceId) })).filter(m => m.label),
                behaviors: strs(p?.behaviors, 3),
                winConditions: strs(p?.winConditions, 3),
                decisionProcess: s(p?.decisionProcess) || undefined,
                technologyUsage: s(p?.technologyUsage) || undefined,
                dayInTheLife: s(p?.dayInTheLife) || undefined,
            });
        });
        if (personas.length && !personas.some(p => p.primary)) personas[0].primary = true;
    }

    // ---- journey map -> journey pains ----
    let journey: SynthesizedJourney | null = null;
    const journeyPains: PrdJourneyPainInput[] = [];
    if (!(inputs.journeyPains || []).length) {
        const jm = j.journey || {};
        const stages = a(jm.stages).slice(0, 6).map((st: any) => ({ name: s(st?.name || st), ...(st?.critical ? { critical: true } : {}) })).filter(st => st.name);
        if (stages.length >= 3) {
            const stagePains = stages.map((_, si) => a(a(jm.stagePains)[si]).slice(0, 3)
                .map((pp: any) => ({ text: s(pp?.text || pp), ...lock(pp?.quote, pp?.evidenceId), personaIndexes: a(pp?.personaIndexes) }))
                .filter((pp: any) => pp.text));
            journey = {
                title: s(jm.title) || `${stages[0].name} to ${stages[stages.length - 1].name}`,
                journeyType: s(jm.journeyType) || undefined, scope: s(jm.scope) || undefined, actors: s(jm.actors) || undefined,
                stages,
                lanes: a(jm.lanes).slice(0, 4).map((l: any) => ({ actor: s(l?.actor), role: s(l?.role) || undefined, cells: stages.map((_, ci) => s(a(l?.cells)[ci]) || 'not engaged') })).filter(l => l.actor),
                stagePains: stagePains.map(list => list.map(({ personaIndexes, ...rest }: any) => rest)),
                opportunities: stages.map((_, oi) => s(a(jm.opportunities)[oi])),
                keyInsight: s(jm.keyInsight) || undefined,
            };
            let n = 0;
            stagePains.forEach((list, si) => list.forEach((pp: any) => {
                const ids = a(pp.personaIndexes).map((x: any) => personas[Number(x)]?.id).filter(Boolean) as string[];
                journeyPains.push({ id: `J${++n}`, stage: stages[si].name, text: pp.text, ...(pp.quote ? { quote: pp.quote, source: pp.source, pointer: pp.pointer } : {}), ...(ids.length ? { personaIds: ids } : {}) });
            }));
        }
        // legacy flat shape (a model that answers with journeyPains[] directly)
        if (!journeyPains.length) {
            a(j.journeyPains).slice(0, 8).forEach((jp: any, i: number) => {
                const text = s(jp?.text), stage = s(jp?.stage);
                if (!text || !stage) return;
                const ids = a(jp?.personaIndexes).map((x: any) => personas[Number(x)]?.id).filter(Boolean) as string[];
                journeyPains.push({ id: `J${i + 1}`, stage, text, ...lock(jp?.quote, jp?.evidenceId), ...(ids.length ? { personaIds: ids } : {}) });
            });
        }
    }

    // ---- gap matrix -> competitive gaps ----
    let gapMatrix: SynthesizedGapMatrix | null = null;
    const competitiveGaps: PrdCompetitiveGapInput[] = [];
    if (!(inputs.competitiveGaps || []).length) {
        const gm = j.gapMatrix || {};
        const gaps = a(gm.gaps).slice(0, 6).map((g: any) => {
            const cur = clampInt(g?.currentMaturity, 1, 5, 2);
            return {
                capability: s(g?.capability), currentMaturity: cur, targetMaturity: Math.max(cur, clampInt(g?.targetMaturity, 1, 5, 4)),
                severity: ['critical', 'high', 'medium'].includes(s(g?.severity).toLowerCase()) ? s(g.severity).toLowerCase() : 'high',
                impact: s(g?.impact), ...(s(g?.competitor) ? { competitor: s(g.competitor) } : {}), ...lock(g?.quote, g?.evidenceId),
            };
        }).filter(g => g.capability && g.impact);
        if (gaps.length) {
            gapMatrix = { title: s(gm.title) || 'Current products leave the core capabilities unmet', gaps, insight: s(gm.insight) || undefined };
            gaps.forEach((g, i) => competitiveGaps.push({ id: `G${i + 1}`, text: `${g.capability}: ${g.impact}`, ...(g.competitor ? { competitor: g.competitor } : {}), ...(g.quote ? { quote: g.quote, source: g.source, pointer: g.pointer } : {}) }));
        }
        if (!competitiveGaps.length) {
            a(j.competitiveGaps).slice(0, 5).forEach((g: any, i: number) => {
                const text = s(g?.text);
                if (!text) return;
                competitiveGaps.push({ id: `G${i + 1}`, text, ...(s(g?.competitor) ? { competitor: s(g.competitor) } : {}), ...lock(g?.quote, g?.evidenceId) });
            });
        }
    }

    return {
        inputs: {
            ...inputs,
            personas: personas.length ? personas : inputs.personas,
            journeyPains: journeyPains.length ? journeyPains : inputs.journeyPains,
            competitiveGaps: competitiveGaps.length ? competitiveGaps : inputs.competitiveGaps,
        },
        synthesized: { personas, journeyPains, competitiveGaps, journey, gapMatrix },
        droppedQuotes: dropped,
    };
}

// ---- slide payload budgets (2026-10-02 legibility fix) ------------------------------------------
// The exported deck showed the persona, journey and gap slides at 8.5-10.5 pt with colliding text
// boxes: the slide payloads carried more words than a 1920x1080 stage holds at a readable size, the
// browser hid the overflow, and the PPTX walk (which paints FULL textContent) drew the hidden lines
// over their neighbours. The fix is the content budget, never smaller type: every slide field below
// is fitted to what the stage renders at the 24px (12 pt) floor. Budgets apply to the SLIDE payload
// only; the synthesized records (and so the PRD inputs and trace) keep their full text. Detail that
// does not fit moves to the slide's speaker notes, which the exporter writes into the PPTX notes.

/** Per-field character budgets for the slide payloads, sized to the 24px floor. */
export const SLIDE_BUDGETS = {
    title: 96,
    persona: { role: 72, quote: 110, quoteSource: 40, jtbd: 120, goal: 80, painLabel: 72, painQuote: 90, item: 80, items: 3 },
    // pains per stage: two up to four stages, one (the sharpest) at five
    journey: { takeaway: 168, stages: 5, stageName: 24, lanes: 3, actor: 34, cell: 56, painsPerStage: 2, painsPerStageAtFive: 1, pain: 60, opportunity: 52 },
    gaps: { insight: 150, rows: 5, capability: 40, impact: 90, competitor: 30, evidence: 110, source: 40 },
} as const;

/** Words a trimmed clause must never end on (a dangling function word reads as a cut). */
const DANGLING_TAIL = /\s+(?:a|an|the|and|or|but|nor|to|of|for|in|on|at|by|with|from|into|onto|between|about|across|through|over|under|within|toward|towards|via|per|among|against|beyond|around|during|since|that|which|who|whose|so|as|is|are|was|were|be|their|its|his|her|our|your|than|then|when|while|because|before|after|without|not|no|each|every|only|also|can|cannot|will|would|should|tied|linked|based|related|aligned|mapped|connected|matched|used|due|according|compared|relative|staying|leading)$/i;

/** Boundaries a phrase may be cut BEFORE: punctuation, conjunctions, and the prepositions and
 *  relatives that open a trailing modifier ("...systems | to find experiential information"). */
const CUT_BEFORE: string[][] = [
    // tier 1: punctuation, conjunctions and relatives (a whole clause drops)
    ['; ', ': ', ', ', ' - ', ' so ', ' because ', ' while ', ' when ', ' and ', ' but ', ' that ', ' which ', ' until ', ' unless '],
    // tier 2: prepositions that open a trailing modifier (only when tier 1 finds no boundary)
    [' to ', ' for ', ' across ', ' with ', ' from ', ' outside ', ' before ', ' after ', ' without ', ' instead of ', ' through ', ' as ', ' in '],
];

/** Fit a phrase to `max` chars: the whole text when it fits (or overruns by at most 15 percent,
 *  which the renderer's guard absorbs), else the longest leading phrase that ends before a clause
 *  or modifier boundary, else a word-boundary cut with dangling function words dropped. Never
 *  mid-word, never an ellipsis. */
/** Literal rewrites for figurative phrasing the synthesis prompt bans; applied deterministically to slide text
 *  so a run that slips one through (or a replayed record) never ships it. Literal, never a new metaphor. */
const LITERAL_REWRITES: Array<[RegExp, string]> = [
    [/\bcarr(?:y|ies|ied|ying) the (?:load|burden|weight) of\b/gi, 'do the work of'],
    [/\bcarr(?:y|ies|ied|ying) the (?:load|burden|weight)\b/gi, 'do the work'],
    [/\bfall(?:s)? through the cracks\b/gi, 'go unnoticed'],
];
export function literalize(text: string): string {
    let t = text;
    for (const [re, rep] of LITERAL_REWRITES) t = t.replace(re, rep);
    return t;
}

export function fitText(text: unknown, max: number): string {
    const t = literalize(String(text ?? '').replace(/\s+/g, ' ').trim());
    if (t.length <= Math.round(max * 1.15)) return t;
    const head = t.slice(0, max + 1);
    // 1. a clause or modifier boundary in the back half of the budget
    let out = '';
    const lastBoundary = (tier: string[]) => tier.reduce((best, sep) => { const i = head.lastIndexOf(sep); return i > best && i <= max ? i : best; }, -1);
    for (const tier of CUT_BEFORE) {
        const clause = lastBoundary(tier);
        if (clause >= Math.round(max * 0.55)) { out = t.slice(0, clause); break; }
    }
    // a shorter whole clause beats a word cut that strands a modifier ("...decision staying between")
    if (!out) {
        const clause = lastBoundary(CUT_BEFORE[0]);
        if (clause >= Math.round(max * 0.35)) out = t.slice(0, clause);
    }
    // 2. otherwise a word-boundary cut
    if (!out) {
        const sp = head.lastIndexOf(' ');
        out = t.slice(0, sp > 0 ? sp : max);
    }
    for (let k = 0; k < 4 && DANGLING_TAIL.test(out); k++) out = out.replace(DANGLING_TAIL, '');
    return out.replace(/[\s,;:-]+$/, '').trim();
}

/** Sources the slide may quote in lowercase (a social post is written as typed); documents may not. */
const SOCIAL_SOURCE = /reddit|\br\/|twitter|\bx\.com|tiktok|youtube|instagram|linkedin|forum|review|trustpilot|play store|app store|discord|facebook/i;
/** Transcript filler: a trailing "like" / "you know", an "um" anywhere, a "like," aside, or a
 *  sentence that opens mid-story ("And then ..."). */
const FILLER = /(?:\blike|\byou know|\bum+|\buh+|\bkind of|\bsort of|\bi mean)[\s,.]*$|\b(?:you know|um+|uh+)\b|\blike,|^(?:and then|and so|so then|but then)\b/i;

/** A quote the slide may show: a clean sentence (not a mid-sentence document fragment, not transcript
 *  filler) of at most `max` chars, chosen as a VERBATIM span of the locked quote. Leading sentences
 *  that fit win; else the longest single clean sentence inside it; else the leading clause of the
 *  first sentence; else nothing (the slide drops the quote). Never an ellipsis, never an edit. */
export function fitQuote(quote: unknown, max: number, source = ''): string {
    const q = String(quote ?? '').replace(/\s+/g, ' ').trim().replace(/^["“”]+|["“”]+$/g, '').trim();
    if (!q) return '';
    const social = SOCIAL_SOURCE.test(source);
    const clean = (sp: string) => sp.length >= 16
        && (social || /^[A-Z0-9"“'‘(]/.test(sp))
        && !FILLER.test(sp)
        && !DANGLING_TAIL.test(sp.replace(/[.!?"”]+$/, ''));
    if (q.length <= max && clean(q)) return q;
    const sentences = q.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
    // leading run of whole sentences that fits
    let lead = '';
    for (const sn of sentences) {
        const next = lead ? `${lead} ${sn}` : sn;
        if (next.length > max) break;
        lead = next;
    }
    if (lead && lead !== q && clean(lead)) return lead;
    const best = sentences.filter(sn => sn.length <= max && clean(sn)).sort((x, y) => y.length - x.length)[0];
    if (best) return best;
    // last resort: the leading verbatim clause of the first sentence, cut before a comma, semicolon or conjunction
    // (a shorter verbatim span, never an ellipsis), when it still carries a full claim
    const first = sentences[0] || q;
    const head = first.slice(0, max + 1);
    const cut = Math.max(...[', ', '; ', ' and ', ' because ', ' while ', ' so '].map(sep => head.lastIndexOf(sep)));
    const clause = cut > 0 ? first.slice(0, cut) : '';
    return clause.length >= 40 && clean(clause) ? clause : '';
}

/** A short attribution for the slide face ("Client document: X" -> "X", timestamps dropped). */
export function shortSource(src: unknown, max: number = SLIDE_BUDGETS.persona.quoteSource): string {
    const t = String(src ?? '')
        .replace(/,?\s*\d{4}-\d\d-\d\d(?:T[\d:.]+Z?)?/g, '')
        .replace(/^(?:client document|client upload|document)\s*:\s*/i, '')
        .replace(/\.(?:pdf|docx?|txt|md)$/i, '')
        .replace(/\s+/g, ' ').trim();
    return fitText(t, max);
}

/** Whole leading sentences that fit `max`; a single over-long sentence falls back to fitText. */
function fitSentences(text: unknown, max: number): string {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    let out = '';
    for (const sn of t.split(/(?<=[.!?])\s+/)) {
        const next = out ? `${out} ${sn}` : sn;
        if (next.length > max) break;
        out = next;
    }
    return out || fitText(t, max);
}

/** Trim a sentence at a word boundary to the title budget. */
function titleFrom(text: string, max: number = SLIDE_BUDGETS.title): string {
    return fitText(String(text || '').replace(/[.\s]+$/, ''), max);
}

/** Distinct named sources for the footer; a bare category label ("Client document") names nothing. */
const uniqSources = (xs: Array<string | undefined>) => Array.from(new Set(xs.filter(x => !!x && !/^(?:client document|client upload|document|source)s?$/i.test(String(x).trim())))) as string[];

/** Speaker notes from labelled lines; empty values skipped. Plain text, one fact per line. */
function notesFrom(lines: Array<[string, unknown]>): string {
    return lines
        .map(([k, v]) => {
            const val = Array.isArray(v) ? v.filter(Boolean).join('; ') : String(v ?? '').trim();
            return val ? `${k}: ${val}` : '';
        })
        .filter(Boolean)
        .join('\n');
}

/** JTBD for the identity column: the full statement when it fits, else without its "so I can" tail. */
function fitJtbd(jtbd: string | undefined): string {
    const j = String(jtbd || '').replace(/\s+/g, ' ').trim();
    const max = SLIDE_BUDGETS.persona.jtbd;
    if (!j || j.length <= max) return j;
    const noTail = j.replace(/,?\s+so (?:that )?I can\b.*$/i, '').trim();
    return noTail.length <= max ? noTail : '';
}

/** Dense GOLD persona-card slides (identity column + pains with evidence / goals / behaviors / wins). */
function personaCardSlidesFromRoots(personas: SynthesizedPersona[], brand: string): any[] {
    const stamp = Date.now();
    const B = SLIDE_BUDGETS.persona;
    return personas.map((p, i) => {
        // pain points: three, each with ONE clean verbatim line of evidence when the record has one
        const pains = p.painPoints.slice(0, B.items).map(pp => {
            const quote = pp.quote ? fitQuote(pp.quote, B.painQuote, pp.source) : '';
            return { label: fitText(pp.text, B.painLabel), ...(quote ? { quote, ...(pp.source ? { source: shortSource(pp.source) } : {}) } : {}) };
        });
        // defining quote: the persona's own when it fits clean, else a motivation quote, else a pain
        // quote the pain columns do NOT already show (the same sentence twice on one slide reads as
        // padding); none left -> no defining quote.
        // The persona's OWN quote wins even when a pain shows it; that pain then drops its evidence
        // line instead (the identity column carries it).
        const shownPainQuotes = new Set(pains.map((pp: any) => pp.quote).filter(Boolean));
        const own = p.definingQuote?.quote ? fitQuote(p.definingQuote.quote, B.quote, p.definingQuote.source) : '';
        let defining: { quote: string; source?: string } | null = own ? { quote: own, source: p.definingQuote?.source } : null;
        if (!defining) {
            const candidates: LockedQuote[] = [...(p.motivations || []), ...p.painPoints].map((x: any) => ({ quote: x.quote, source: x.source }));
            for (const c of candidates) {
                const fq = c.quote ? fitQuote(c.quote, B.quote, c.source) : '';
                if (fq && !shownPainQuotes.has(fq)) { defining = { quote: fq, source: c.source }; break; }
            }
        }
        if (defining) pains.forEach((pp: any) => { if (pp.quote === defining!.quote) { delete pp.quote; delete pp.source; } });
        const jtbd = fitJtbd(p.jtbd);
        const goals = p.goals ? {
            ...(p.goals.functionalGoal ? { functionalGoal: fitText(p.goals.functionalGoal, B.goal) } : {}),
            ...(p.goals.experienceGoal ? { experienceGoal: fitText(p.goals.experienceGoal, B.goal) } : {}),
            ...(p.goals.lifeGoal ? { lifeGoal: fitText(p.goals.lifeGoal, B.goal) } : {}),
        } : undefined;
        const speakerNotes = notesFrom([
            ['Segment', p.demographics],
            ['Job to be done', p.jtbd],
            ['Where the problem bites', p.stageOfStruggle],
            ['A day in the life', p.dayInTheLife],
            ['Decision process', p.decisionProcess],
            ['Technology in use', p.technologyUsage],
            ['Motivations', (p.motivations || []).map(m => `${m.label}${m.quote ? ` ("${m.quote}", ${m.source || 'source on file'})` : ''}`)],
            ['Pain evidence', p.painPoints.filter(pp => pp.quote).map(pp => `"${pp.quote}" (${pp.source || 'source on file'})`)],
        ]);
        return {
            id: `prd_root_persona_${stamp}_${i + 1}`,
            template: 'persona-card',
            brand,
            title: titleFrom(p.title || p.painPoints[0]?.text || p.name) || p.name,
            sources: uniqSources([...p.painPoints.map(pp => pp.source), ...(p.motivations || []).map(m => m.source), p.definingQuote?.source]),
            ...(speakerNotes ? { speakerNotes } : {}),
            persona: {
                name: p.name,
                role: fitText(p.role || '', B.role),
                ...(defining ? { quote: defining.quote, ...(defining.source ? { quoteSource: shortSource(defining.source) } : {}) } : {}),
                ...(jtbd ? { jtbd } : {}),
                ...(goals && Object.keys(goals).length ? { goals } : {}),
                painPoints: pains,
                ...(p.behaviors?.length ? { behaviors: p.behaviors.slice(0, B.items).map(x => fitText(x, B.item)) } : {}),
                ...(p.winConditions?.length ? { winConditions: p.winConditions.slice(0, B.items).map(x => fitText(x, B.item)) } : {}),
                ...(p.stageOfStruggle ? { journeyContext: p.stageOfStruggle } : {}),
            },
        };
    });
}

/** The journey-map slide (stages x actor lanes, the sharpest evidenced pains per stage, opportunities,
 *  takeaway). Persona JTBD statements, scope and the full pain list ride in the speaker notes. */
function journeyMapSlideFromRoots(journey: SynthesizedJourney | null, personas: SynthesizedPersona[], brand: string): any | null {
    if (!journey || journey.stages.length < 3) return null;
    const B = SLIDE_BUDGETS.journey;
    const stages = journey.stages.slice(0, B.stages).map(st => ({ name: fitText(st.name, B.stageName), ...(st.critical ? { critical: true } : {}) }));
    const n = stages.length;
    const speakerNotes = notesFrom([
        ['Viewpoint', journey.journeyType],
        ['Scope', journey.scope],
        ['Actors', journey.actors],
        ...journey.stages.map((st, si) => [`${st.name} pains`, (journey.stagePains[si] || []).map(pp => pp.quote ? `${pp.text} ("${pp.quote}", ${pp.source || 'source on file'})` : pp.text)] as [string, unknown]),
        ['Persona jobs to be done', personas.map(p => p.jtbd ? `${p.name}: ${p.jtbd}` : '').filter(Boolean)],
    ]);
    return {
        id: `prd_root_journey_${Date.now()}`,
        template: 'journey-map',
        brand,
        title: titleFrom(journey.title) || 'The journey breaks where the systems hand off',
        sources: uniqSources(journey.stagePains.flat().map(pp => pp.source)),
        ...(speakerNotes ? { speakerNotes } : {}),
        journeyMap: {
            ...(journey.journeyType ? { journeyType: journey.journeyType } : {}),
            stages,
            lanes: journey.lanes.slice(0, B.lanes).map(l => ({ actor: fitText(l.actor, B.actor), cells: l.cells.slice(0, n).map(c => fitText(c, B.cell)) })),
            painPoints: journey.stagePains.slice(0, n).map(list => list.slice(0, n >= 5 ? B.painsPerStageAtFive : B.painsPerStage).map(pp => fitText(pp.text, B.pain))),
            opportunities: journey.opportunities.slice(0, n).map(o => fitText(o, B.opportunity)),
            ...(journey.keyInsight ? { keyInsight: fitSentences(journey.keyInsight, SLIDE_BUDGETS.journey.takeaway) } : {}),
        },
    };
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2 };

/** The gap-matrix slide (capability, current vs target maturity, severity, impact, one evidence line). */
function gapMatrixSlideFromRoots(gm: SynthesizedGapMatrix | null, brand: string): any | null {
    if (!gm || !gm.gaps.length) return null;
    const B = SLIDE_BUDGETS.gaps;
    // the five most severe gaps (stable within a severity), widest maturity gap first
    const ranked = gm.gaps.map((g, i) => ({ g, i }))
        .sort((x, y) => (SEVERITY_RANK[x.g.severity] ?? 3) - (SEVERITY_RANK[y.g.severity] ?? 3)
            || (y.g.targetMaturity - y.g.currentMaturity) - (x.g.targetMaturity - x.g.currentMaturity) || x.i - y.i)
        .map(x => x.g);
    const shown = ranked.slice(0, B.rows);
    const speakerNotes = notesFrom([
        ['Pattern', gm.insight],
        ...gm.gaps.map(g => [g.capability, `${g.impact}${g.competitor ? `. Today: ${g.competitor}` : ''}${g.quote ? `. Evidence: "${g.quote}" (${g.source || 'source on file'})` : ''}`] as [string, unknown]),
    ]);
    return {
        id: `prd_root_gaps_${Date.now()}`,
        template: 'gap-matrix',
        brand,
        title: titleFrom(gm.title) || 'Current products leave the core capabilities unmet',
        sources: uniqSources(shown.map(g => g.source)),
        ...(speakerNotes ? { speakerNotes } : {}),
        gapMatrix: {
            gaps: shown.map(g => {
                const evidence = g.quote ? fitQuote(g.quote, B.evidence, g.source) : '';
                return {
                    capability: fitText(g.capability, B.capability), currentMaturity: g.currentMaturity, targetMaturity: g.targetMaturity, severity: g.severity,
                    impact: fitText(g.impact, B.impact),
                    ...(g.competitor ? { competitor: fitText(g.competitor, B.competitor) } : {}),
                    ...(evidence ? { evidence, ...(g.source ? { source: shortSource(g.source, B.source) } : {}) } : {}),
                };
            }),
            scaleMax: 5,
            ...(gm.insight ? { insight: fitSentences(gm.insight, B.insight) } : {}),
        },
    };
}

/** Every deliverable the synthesis produced, as slides in deck order: personas, journey, gaps. */
export function rootDeliverableSlides(res: PrdRootSynthesisResult, brand: string): any[] {
    const sy = res.synthesized;
    return [
        ...personaCardSlidesFromRoots(sy.personas, brand),
        journeyMapSlideFromRoots(sy.journey, sy.personas, brand),
        gapMatrixSlideFromRoots(sy.gapMatrix, brand),
    ].filter(Boolean);
}
