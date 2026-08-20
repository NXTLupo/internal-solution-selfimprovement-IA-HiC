/**
 * DF-W2 - DETERMINISTIC PROSE SIGNAL (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * HiC's writing control was ~95% SUBTRACTIVE: 350+ banned phrases, banned
 * collocations, format bans. Subtractive rules stop the worst tells and cannot
 * produce voice, because the strongest machine tell survives every word swap:
 * uniform cadence, repeated clause openings, and abstract nouns acting as
 * subjects. This module MEASURES those, so the finding is a number with the
 * offending sentence attached rather than an opinion that can be argued with.
 *
 * Zero network, zero model calls, fully synchronous: it can run inside the
 * artifact chain on every generation without adding a cent or a second.
 *
 * The metrics operationalize rules HiC already asserts but never measured:
 *  - Actor Rule (2026-08-07): "every claim states who or what acts" -> abstractSubjectRate
 *  - Read-it-aloud test -> sentenceLengthCV plus openerRepetition (a human varies both)
 *  - Copula-avoidance ban -> copulaAvoidanceRate, counted as a RATE not a hit list
 *  - Hedge-word ban -> hedgeDensity
 */

export interface ProseMetric {
    id: string;
    label: string;
    /** 0..1 where 1 is the best achievable score for this metric. */
    score: number;
    /** Below this the metric is a concern. */
    floor: number;
    pass: boolean;
    detail: string;
    /** Up to three verbatim offenders, so the fix is obvious. */
    offenders: string[];
}

export interface ProseReport {
    metrics: ProseMetric[];
    /** Mean of metric scores, 0..1. */
    overall: number;
    pass: boolean;
    /** Metrics below floor, worst first. */
    concerns: ProseMetric[];
    sentenceCount: number;
}

/**
 * Abstract nouns that cannot act. Drawn from the Actor Rule's own examples plus
 * the nouns that actually recur in HiC output. A sentence whose grammatical
 * subject is one of these is describing a process with no agent.
 */
const ABSTRACT_SUBJECTS = [
    'engagement', 'advancement', 'alignment', 'transformation', 'adoption', 'innovation',
    'strategy', 'execution', 'growth', 'value', 'experience', 'efficiency', 'productivity',
    'complexity', 'capability', 'maturity', 'momentum', 'friction', 'visibility', 'trust',
    'retention', 'conversion', 'demand', 'sentiment', 'awareness', 'personalization',
    'automation', 'integration', 'governance', 'compliance', 'disruption', 'opportunity',
    'investment', 'performance', 'scale', 'quality', 'consistency', 'differentiation',
];

/** Verbs used to dodge "is". Banned lexically elsewhere; counted as a rate here. */
const COPULA_DODGES = [
    'serves as', 'serve as', 'stands as', 'stand as', 'represents a', 'represent a',
    'represents the', 'marks a', 'marks the', 'embodies', 'epitomizes', 'constitutes a',
    'functions as', 'acts as', 'emerges as', 'positions itself as',
];

const HEDGES = [
    'perhaps', 'arguably', 'potentially', 'possibly', 'it seems', 'somewhat', 'relatively',
    'fairly', 'generally', 'typically', 'often', 'may', 'might', 'could', 'largely',
    'broadly', 'to some extent', 'in some ways', 'conceivably',
];

const INTENSIFIERS = [
    'very', 'extremely', 'incredibly', 'highly', 'significantly', 'substantially',
    'dramatically', 'critically', 'massively', 'profoundly', 'truly', 'deeply',
];

/** Sentence split that survives abbreviations, decimals and quoted periods. */
export function splitSentences(text: string): string[] {
    const cleaned = (text || '')
        .replace(/\s+/g, ' ')
        .replace(/([A-Z])\.([A-Z])\./g, '$1$2')       // U.S. -> US
        .replace(/(\d)\.(\d)/g, '$1<DOT>$2');          // 3.5 stays one token
    return cleaned
        .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
        .map(s => s.replace(/<DOT>/g, '.').trim())
        .filter(s => s.split(/\s+/).length >= 3);
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

function firstTwoWords(sentence: string): string {
    const w = words(sentence.toLowerCase().replace(/[^a-z0-9\s]/g, ''));
    return w.slice(0, 2).join(' ');
}

/** Coefficient of variation of sentence length; the cadence signal. */
function lengthVariation(sentences: string[]): { cv: number; lengths: number[] } {
    const lengths = sentences.map(s => words(s).length);
    if (lengths.length < 2) return { cv: 0.5, lengths };
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    if (mean === 0) return { cv: 0, lengths };
    const variance = lengths.reduce((a, l) => a + (l - mean) ** 2, 0) / lengths.length;
    return { cv: Math.sqrt(variance) / mean, lengths };
}

function countMatches(haystackLower: string, needles: string[]): { hits: number; found: string[] } {
    let hits = 0;
    const found: string[] = [];
    for (const n of needles) {
        const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const m = haystackLower.match(re);
        if (m) { hits += m.length; found.push(n); }
    }
    return { hits, found };
}

/**
 * Does the sentence open with an abstract noun acting as the subject?
 * Deliberately conservative: only the FIRST content word is inspected, and a
 * following possessive or preposition means the noun is a modifier, not an actor.
 */
function hasAbstractSubject(sentence: string): boolean {
    const w = words(sentence.toLowerCase().replace(/[^a-z\s]/g, ''));
    if (!w.length) return false;
    let i = 0;
    if (['the', 'a', 'an', 'this', 'that', 'these', 'those', 'its', 'their'].includes(w[0])) i = 1;
    const head = w[i];
    if (!head || !ABSTRACT_SUBJECTS.includes(head)) return false;
    const next = w[i + 1] || '';
    // "adoption of X rose" and "adoption rates" are fine; "adoption stalls" is not.
    if (['of', 'in', 'for', 'across', 'among', 'rate', 'rates', 'levels', 'score', 'scores'].includes(next)) return false;
    return true;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Measure prose. `text` may be one field or a whole deck's concatenated fields;
 * pass `paragraphs` when paragraph shape is meaningful (reports, narratives).
 */
export function analyzeProse(text: string, opts: { paragraphs?: string[] } = {}): ProseReport {
    const sentences = splitSentences(text);
    const lower = (text || '').toLowerCase();
    const totalWords = words(text || '').length || 1;
    const metrics: ProseMetric[] = [];

    // 1. CADENCE. Human prose varies sentence length; generated prose converges
    //    on a comfortable middle. CV of 0.35+ reads as varied.
    const { cv, lengths } = lengthVariation(sentences);
    const cadenceScore = sentences.length < 3 ? 1 : clamp01(cv / 0.35);
    metrics.push({
        id: 'cadence', label: 'Sentence-length variation',
        score: cadenceScore, floor: 0.6, pass: cadenceScore >= 0.6,
        detail: sentences.length < 3
            ? 'Too few sentences to judge cadence.'
            : `CV ${cv.toFixed(2)} across ${sentences.length} sentences (lengths ${lengths.slice(0, 8).join(', ')}${lengths.length > 8 ? ', ...' : ''}).`,
        offenders: cadenceScore >= 0.6 ? [] : sentences.slice(0, 3),
    });

    // 2. OPENERS. Adjacent sentences starting the same way is the most audible
    //    machine rhythm. Count adjacent repeats, not global frequency: a callback
    //    later in a section is rhetoric, back-to-back is a template.
    let adjacentRepeats = 0;
    const openerOffenders: string[] = [];
    for (let i = 1; i < sentences.length; i++) {
        const a = firstTwoWords(sentences[i - 1]);
        const b = firstTwoWords(sentences[i]);
        if (a && a === b) {
            adjacentRepeats++;
            if (openerOffenders.length < 3) openerOffenders.push(sentences[i]);
        }
    }
    const openerScore = sentences.length < 2 ? 1 : clamp01(1 - (adjacentRepeats / (sentences.length - 1)) * 3);
    metrics.push({
        id: 'openers', label: 'Clause-opener variety',
        score: openerScore, floor: 0.7, pass: openerScore >= 0.7,
        detail: `${adjacentRepeats} adjacent sentence pair(s) share an opening.`,
        offenders: openerOffenders,
    });

    // 3. ACTOR RULE, measured. Abstract nouns cannot act.
    const abstractOffenders = sentences.filter(hasAbstractSubject);
    const abstractRate = sentences.length ? abstractOffenders.length / sentences.length : 0;
    const actorScore = clamp01(1 - abstractRate * 5);
    metrics.push({
        id: 'actors', label: 'Named actors (Actor Rule)',
        score: actorScore, floor: 0.8, pass: actorScore >= 0.8,
        detail: `${abstractOffenders.length}/${sentences.length} sentence(s) open with an abstract noun as the subject.`,
        offenders: abstractOffenders.slice(0, 3),
    });

    // 4. COPULA AVOIDANCE, as a rate.
    const copula = countMatches(lower, COPULA_DODGES);
    const copulaRate = copula.hits / (totalWords / 100); // per 100 words
    const copulaScore = clamp01(1 - copulaRate / 1.5);
    metrics.push({
        id: 'copula', label: 'Plain "is" over elaborate verbs',
        score: copulaScore, floor: 0.8, pass: copulaScore >= 0.8,
        detail: copula.hits ? `${copula.hits} dodge(s) per ${totalWords} words: ${copula.found.slice(0, 4).join(', ')}.` : 'No copula dodges.',
        offenders: copula.found.slice(0, 3),
    });

    // 5. HEDGE + INTENSIFIER DENSITY. Both dilute a judgment.
    const hedge = countMatches(lower, HEDGES);
    const intense = countMatches(lower, INTENSIFIERS);
    const dilutionRate = (hedge.hits + intense.hits) / (totalWords / 100);
    const dilutionScore = clamp01(1 - dilutionRate / 3);
    metrics.push({
        id: 'dilution', label: 'Hedge and intensifier restraint',
        score: dilutionScore, floor: 0.7, pass: dilutionScore >= 0.7,
        detail: `${hedge.hits} hedge(s) + ${intense.hits} intensifier(s) per ${totalWords} words.`,
        offenders: [...hedge.found, ...intense.found].slice(0, 3),
    });

    // 6. PARAGRAPH SHAPE (only when paragraphs are supplied).
    const paras = (opts.paragraphs || []).filter(p => words(p).length > 12);
    if (paras.length >= 3) {
        const { cv: pcv } = lengthVariation(paras);
        const shapeScore = clamp01(pcv / 0.3);
        metrics.push({
            id: 'shape', label: 'Paragraph-shape variation',
            score: shapeScore, floor: 0.5, pass: shapeScore >= 0.5,
            detail: `CV ${pcv.toFixed(2)} across ${paras.length} paragraphs.`,
            offenders: shapeScore >= 0.5 ? [] : paras.slice(0, 2).map(p => p.slice(0, 120)),
        });
    }

    const overall = metrics.reduce((a, m) => a + m.score, 0) / (metrics.length || 1);
    const concerns = metrics.filter(m => !m.pass).sort((a, b) => a.score - b.score);
    return { metrics, overall, pass: concerns.length === 0, concerns, sentenceCount: sentences.length };
}

/**
 * Model-facing repair instruction. Named metrics with the offending sentence
 * quoted, because "make it sound more human" is not actionable and "these two
 * sentences both start with 'The team'" is.
 */
export function buildProseRepairInstruction(report: ProseReport): string {
    if (report.pass) return '';
    const lines = report.concerns.slice(0, 4).map(c => {
        const quoted = c.offenders.length ? ` Offending text: ${c.offenders.map(o => `"${o.slice(0, 140)}"`).join('; ')}.` : '';
        return `- ${c.label}: ${c.detail}${quoted}`;
    });
    return [
        'PROSE REVISION REQUIRED. The measured signals below are how machine-written text is identified. Fix them without changing any fact, number, quote, citation or source label.',
        ...lines,
        'Rewrite only the flagged sentences. Vary sentence length deliberately. Give every claim a named actor (a team, a system, a person). Use "is" instead of "serves as". Delete hedges.',
    ].join('\n');
}
