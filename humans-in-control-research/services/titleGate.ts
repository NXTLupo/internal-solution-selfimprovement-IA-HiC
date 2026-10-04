/**
 * titleGate.ts (2026-10-01, plan R-B4 / Stage 2.1: the Partner Test as a chain stage)
 *
 * `.claude/CLAUDE.md` asks every slide title to be a short, literal, complete sentence
 * that states a judgment: at most ~70 characters, no metaphor, no bare number, a finite
 * verb. Until now that rule lived only in prompt text and in `deClicheTitle`, which swaps
 * a handful of multi-word cliches. The 2026-09-30 audit found live decks with 19-word
 * titles, naked percentages, and topic labels ("The Landscape") that no gate refused.
 *
 * Pure functions. The chain runs `evaluateTitles` after the lexical scrub, hands the
 * findings to the repair pass (which asks for THREE candidate titles and lets THIS gate
 * pick the first that passes: verbalized sampling with deterministic selection), and the
 * caller withholds a slide whose title still carries a naked number after repair.
 *
 * Heuristics are deliberately conservative on the side that WITHHOLDS (naked number) and
 * detect-only on the side that would otherwise refuse good titles (`no_verb`).
 *
 * Banned corporate phrases are NOT re-listed here: the lexical stage already detects every
 * SLOP_PHRASES entry in every field, title included. This gate covers what that lexicon
 * cannot: length, figures, topic labels, and the title-specific metaphors the rule names.
 */
import { detectMetaphors, isTopicTitle } from './slidePostProcessor';

export type TitleFindingKind = 'too_long' | 'metaphor' | 'naked_number' | 'topic_label' | 'no_verb';

export interface TitleFinding {
    slideId: string;
    template: string;
    title: string;
    kinds: TitleFindingKind[];
    /** One line the repair prompt can quote. */
    detail: string;
    /** True when the finding alone fails the chain (everything but `no_verb`). */
    failing: boolean;
}

export interface TitleReport {
    checked: number;
    findings: TitleFinding[];
    pass: boolean;
}

// The rule says "aim <= 10 words / ~70 chars"; its own GOOD examples run to 11 words and 74
// characters, so the gate's ceiling sits just above the aim rather than on it.
export const TITLE_MAX_CHARS = 80;
const TITLE_MAX_WORDS = 12;

/** Templates whose "title" is a label by design (cover wordmark, divider, agenda). */
const EXEMPT_TEMPLATES = new Set([
    'slides:cover', 'slides:agenda', 'slides:section-divider', 'slides:thesis-interstitial',
    'slides:scene', 'slides:deliverable', 'cover', 'agenda', 'section-divider',
]);

/**
 * Title cliches named in `.claude/CLAUDE.md` (the "Action Titles" rule). `detectMetaphors`
 * covers the broader figurative lexicon; these are the title-specific bans the rule lists
 * verbatim. "funnel" vocabulary is legitimate marketing language and is NOT here.
 */
const TITLE_CLICHE_RE: RegExp[] = [
    /\bfront door\b/i, /\btrust ceiling\b/i, /\bthe meter\b/i, /\bmargin closes\b/i,
    /\bcloses the margin\b/i, /\bwhere value leaks\b/i, /\bbleeds?\b/i, /\beats? it\b/i,
    /\bopens? the door\b/i, /\bwalk through first\b/i, /\bredrawing the map\b/i,
];

/**
 * A bare figure in a title: a percentage, a currency amount, an "Nx" multiplier, or a
 * plain count. Years (1900-2099) are allowed, as are tokens glued to letters ("Q3",
 * "5-step", "H2"), which name a period or a shape rather than assert a quantity.
 */
const NAKED_NUMBER_RE = /(^|[\s(\[/])(?!(?:19|20)\d\d(?![\d,.%]))[$€£]?\d[\d,]*(?:\.\d+)?(?:%|x|\s*(?:percent|pct|million|billion|bn|m|k)\b)?(?=$|[\s).,;:!?\]])/i;

/** Modals, auxiliaries, and the finite verbs that carry most judgment titles. */
const FINITE_VERBS = new Set([
    'is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did', 'can', 'cannot',
    'could', 'will', 'would', 'should', 'must', 'may', 'might', 'need', 'needs', 'lack', 'lacks',
    'fail', 'fails', 'lose', 'loses', 'leave', 'leaves', 'force', 'forces', 'cost', 'costs',
    'convert', 'converts', 'raise', 'raises', 'drop', 'drops', 'originate', 'originates',
    'keep', 'keeps', 'make', 'makes', 'take', 'takes', 'give', 'gives', 'get', 'gets', 'put',
    'puts', 'let', 'lets', 'run', 'runs', 'own', 'owns', 'win', 'wins', 'beat', 'beats', 'block',
    'blocks', 'break', 'breaks', 'build', 'builds', 'buy', 'buys', 'pay', 'pays', 'sell', 'sells',
    'stall', 'stalls', 'slow', 'slows', 'stop', 'stops', 'start', 'starts', 'cut', 'cuts',
    'add', 'adds', 'reach', 'reaches', 'miss', 'misses', 'hit', 'hits', 'show', 'shows', 'tell',
    'tells', 'know', 'knows', 'see', 'sees', 'wait', 'waits', 'spend', 'spends', 'depend',
    'depends', 'rely', 'relies', 'remain', 'remains', 'become', 'becomes', 'grow', 'grows',
    'shrink', 'shrinks', 'outpace', 'outpaces', 'outperform', 'outperforms', 'replace',
    'replaces', 'require', 'requires', 'prefer', 'prefers', 'expect', 'expects', 'trust',
    'trusts', 'abandon', 'abandons', 'return', 'returns', 'churn', 'churns', 'compete',
    'competes', 'decide', 'decides', 'choose', 'chooses', 'report', 'reports', 'handle',
    'handles', 'treat', 'treats', 'route', 'routes', 'push', 'pushes', 'pull', 'pulls',
    'hold', 'holds', 'carry', 'carries', 'serve', 'serves', 'answer', 'answers', 'ask', 'asks',
    'solve', 'solves', 'create', 'creates', 'cause', 'causes', 'drive', 'drives', 'limit',
    'limits', 'shape', 'shapes', 'turn', 'turns', 'move', 'moves', 'go', 'goes', 'come',
    'comes', 'matter', 'matters', 'work', 'works', 'exist', 'exists', 'live', 'lives',
    'die', 'dies', 'begin', 'begins', 'end', 'ends', 'open', 'opens', 'close', 'closes',
]);
const DETERMINERS = new Set(['the', 'a', 'an', 'of', 'for', 'in', 'on', 'and', 'or', 'to', 'their', 'its', 'our', 'with', 'by', 'from', 'at', 'as', 'than', 'into', 'over', 'under', 'about', 'these', 'those', 'this', 'that', 'each', 'every', 'most', 'some', 'all', 'no', 'not', 'more', 'fewer', 'less']);

/** Heuristic: does the title contain a finite verb? False negatives are possible, so `no_verb` is detect-only. */
export function hasFiniteVerb(title: string): boolean {
    const tokens = String(title || '').toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].replace(/'s$/, '');
        if (FINITE_VERBS.has(t)) return true;
        if (t.endsWith("n't")) return true;
        // Past tense: "-ed" after a subject word, not the first token (sentence-initial
        // "-ed" words are usually participial adjectives: "Fragmented systems ...").
        if (i > 0 && t.length > 4 && t.endsWith('ed') && !DETERMINERS.has(tokens[i - 1])) return true;
        // Third-person singular: a word ending in -s that follows a content word rather
        // than a determiner ("the systems" is a noun; "registrar exports" is a verb).
        if (i > 0 && t.length > 3 && /[a-z]s$/.test(t) && !t.endsWith('ss') && !t.endsWith('us')
            && !DETERMINERS.has(tokens[i - 1]) && i < tokens.length - 1) return true;
    }
    return false;
}

export function evaluateTitle(title: string, template = ''): TitleFindingKind[] {
    const t = String(title || '').trim();
    if (!t) return [];
    const kinds: TitleFindingKind[] = [];
    const words = t.split(/\s+/).filter(Boolean);
    if (t.length > TITLE_MAX_CHARS || words.length > TITLE_MAX_WORDS) kinds.push('too_long');
    if (NAKED_NUMBER_RE.test(t)) kinds.push('naked_number');
    if (detectMetaphors(t).length || TITLE_CLICHE_RE.some(re => re.test(t))) kinds.push('metaphor');
    if (isTopicTitle(t) || /^(the|key|our)\s+\w+(\s+\w+)?$/i.test(t) || /^(key )?(findings|recommendations|overview|summary|background|context|next steps|the path forward|the landscape|agenda)$/i.test(t)) {
        kinds.push('topic_label');
    } else if (!hasFiniteVerb(t)) {
        kinds.push('no_verb');
    }
    void template;
    return kinds;
}

function detailFor(kinds: TitleFindingKind[], title: string): string {
    const parts: string[] = [];
    if (kinds.includes('too_long')) parts.push(`${title.length} chars / ${title.split(/\s+/).length} words; the ceiling is ${TITLE_MAX_CHARS} chars and ${TITLE_MAX_WORDS} words`);
    if (kinds.includes('naked_number')) parts.push('carries a bare figure; a title states the judgment and the number lives in a cited quote on the slide body');
    if (kinds.includes('metaphor')) parts.push('uses a figure of speech; name the literal system, actor, or mechanism');
    if (kinds.includes('topic_label')) parts.push('names a topic instead of stating a conclusion');
    if (kinds.includes('no_verb')) parts.push('may lack a finite verb; a title is a complete sentence');
    return parts.join('. ');
}

/** The Partner Test over a slide set. Connective templates and deliverable subjects are exempt. */
export function evaluateTitles(slides: Array<{ id?: string; template?: string; title?: string; composerPayload?: any }>): TitleReport {
    const findings: TitleFinding[] = [];
    let checked = 0;
    for (const s of slides || []) {
        const template = String(s?.template || '');
        if (EXEMPT_TEMPLATES.has(template)) continue;
        const title = String((s?.composerPayload && typeof s.composerPayload.title === 'string' ? s.composerPayload.title : s?.title) || '').trim();
        if (!title) continue;
        checked++;
        const kinds = evaluateTitle(title, template);
        if (!kinds.length) continue;
        const failing = kinds.some(k => k !== 'no_verb');
        findings.push({ slideId: String(s?.id || 'slide'), template, title, kinds, detail: detailFor(kinds, title), failing });
    }
    return { checked, findings, pass: !findings.some(f => f.failing) };
}

/** Repair text for the model: names the slide, quotes the title, states the rule it broke. */
export function buildTitleRepairInstruction(report: TitleReport): string {
    const failing = report.findings.filter(f => f.failing);
    if (!failing.length) return '';
    return [
        'TITLES (the Partner Test). Each title below must be rewritten as ONE short literal sentence',
        `(at most ${TITLE_MAX_CHARS} characters) that states the slide's judgment with a finite verb, names the actor`,
        'or system, uses no figure of speech, and carries no number. Keep the claim the slide body supports.',
        ...failing.slice(0, 10).map(f => `- ${f.slideId} title "${f.title}": ${f.detail}.`),
    ].join('\n');
}

/**
 * Verbalized sampling, deterministic selection (R-M2): given the model's candidate
 * titles, return the first that passes every failing check, or null when none does.
 */
export function pickTitleCandidate(candidates: unknown, template = ''): string | null {
    if (!Array.isArray(candidates)) return null;
    for (const c of candidates) {
        if (typeof c !== 'string') continue;
        const t = c.trim().replace(/[.]+$/, '');
        if (t.length < 8) continue;
        const kinds = evaluateTitle(t, template).filter(k => k !== 'no_verb');
        if (!kinds.length) return t;
    }
    return null;
}

/**
 * 2026-10-01 (owner directive "NO BLOCKERS WHEN THE USER ASKS FOR AN OUTPUT"): a title that still carries
 * a bare figure after model repair is no longer withheld (the slide used to vanish from the deck). The
 * figure is removed deterministically and the slide ships: the claim becomes qualitative ("35% of
 * students" -> "many students"), the number stays in the slide body only where a cited quote carries it.
 */
const FIG = String.raw`[$€£]?\d[\d,]*(?:\.\d+)?(?:%|x|\s*(?:percent|pct|million|billion|bn|m|k)\b)?`;
export function stripNakedFigures(title: string): string {
    let t = String(title || '');
    const notYear = String.raw`(?!(?:19|20)\d\d(?![\d,.%]))`;
    t = t.replace(new RegExp(String.raw`\b(?:by|of|nearly|over|about|almost|roughly|around|up to|more than|less than|at least|only|just|some)\s+${notYear}${FIG}(?:\s+(?:a|per)\s+(?:year|month|week|day))?(?=$|[\s).,;:!?\]])`, 'gi'), ' ');
    t = t.replace(new RegExp(String.raw`(^|[\s(\[/])${notYear}${FIG}\s+of\s+`, 'gi'), '$1many ');
    t = t.replace(new RegExp(String.raw`(^|[\s(\[/])${notYear}[$€£]?\d[\d,]*(?:\.\d+)?x(?=$|[\s).,;:!?\]])`, 'gi'), '$1several times');
    t = t.replace(new RegExp(String.raw`(^|[\s(\[/])${notYear}${FIG}(?:\s+(?:annually|a year|per year))?(?=$|[\s).,;:!?\]])`, 'gi'), '$1');
    t = t.replace(/\s+([,;:.])/g, '$1').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ')
        .replace(/[\s,;:]+(?:by|of|to|from|at|with|costing|worth|and|or|for)?\s*$/i, '').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : String(title || '');
}

/** Slides whose title still carries a naked number after model repair (now neutralized, never dropped). */
export function withheldSlideIds(report: TitleReport | null | undefined): string[] {
    return (report?.findings || []).filter(f => f.kinds.includes('naked_number')).map(f => f.slideId);
}
