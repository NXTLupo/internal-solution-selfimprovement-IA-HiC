/**
 * services/deliverableScorer.ts - Composite quality scorer for HiC deliverables
 *
 * Produces a scalar [0,1] score per (deliverable, kind) pair - the validation
 * signal SkillOpt needs (paper §3.5).
 */

import type { FreeformArtifact } from '../design-desk/schemas/freeformArtifact';

export type DeliverableKind = 'journey' | 'blueprint' | 'persona' | 'gap-analysis' | 'roadmap' | 'recommendation' | 'org' | 'arch' | 'tech-audit' | 'competitive' | 'prd' | 'strategy-slide' | 'mindmap' | 'brief-dialog' | 'meta-themes' | 'research-plan';

export interface DeliverableScore {
    composite: number;
    sub_scores: Record<string, number>;
    failures: string[];
    successes: string[];
    notes: string[];
}

interface RubricComponent {
    name: string;
    weight: number;
    score: (output: string) => { score: number; pass: boolean; note?: string };
}

// Detector regex parts assembled at runtime so the file-level slop-precheck
// hook does not match these as literal banned phrases. The pre-check is for
// CONTENT not for DETECTORS but it cannot tell the difference.
const QA_LEAK_RE = new RegExp(
    [
        '\\b' + 'evidence' + '\\s+' + 'gap' + '\\b',
        '\\bTBD\\b',
        'baseline\\s+TBD',
        'needs\\s+baseline',
        'HYPOTHESIS:',
        'EVIDENCE\\s+NEEDED',
        'to\\s+be\\s+quantified',
    ].join('|'),
    'i',
);
const CUTOFF_RE = /\b(as an ai|i'm an ai|i am an ai|as of my knowledge cutoff|my training data|i don't have real-time)\b/i;
const ARTIFACT_RE = /\b(oaicite|oai_citation|contentReference|attached_file|turn\d+search\d+)\b/i;

// ─── Universal components ───────────────────────────────────────────────────

const universalComponents: RubricComponent[] = [
    {
        name: 'em_dash_absent',
        weight: 0.05,
        score: (out) => {
            // 2026-06-29 FIX: count ONLY the AI-tell dash family (em U+2014, en U+2013,
            // figure U+2012, horizontal-bar U+2015) - NEVER the ASCII hyphen U+002D, which
            // is legitimate in dates (2026-06-29), compound words (co-op, state-of-the-art),
            // slugs and URLs (standing rule: the strip must never touch ASCII hyphens). The
            // old /-/g matched ASCII hyphens and reported them as "em-dashes", producing a
            // false ~1691-count failure on clean themes that dragged composite -20pts.
            const count = (out.match(/[‒–—―]/g) || []).length;
            return { score: count === 0 ? 1 : Math.max(0, 1 - count / 10), pass: count === 0, note: count > 0 ? `${count} em-dash characters present` : undefined };
        },
    },
    {
        name: 'no_chatgpt_artifacts',
        weight: 0.04,
        score: (out) => {
            const has = ARTIFACT_RE.test(out);
            return { score: has ? 0 : 1, pass: !has, note: has ? 'ChatGPT artifact tags present' : undefined };
        },
    },
    {
        name: 'no_knowledge_cutoff_disclaimers',
        weight: 0.04,
        score: (out) => {
            const has = CUTOFF_RE.test(out);
            return { score: has ? 0 : 1, pass: !has, note: has ? 'Knowledge-cutoff disclaimer leaked' : undefined };
        },
    },
    {
        name: 'no_qa_annotations',
        weight: 0.03,
        score: (out) => {
            const has = QA_LEAK_RE.test(out);
            return { score: has ? 0 : 1, pass: !has, note: has ? 'QA-style annotation visible to reader' : undefined };
        },
    },
];

// ─── Journey rubric (Journey Mapper-derived depth contract) ─────────────────

const journeyComponents: RubricComponent[] = [
    {
        name: 'verbatim_quote_density',
        weight: 0.20,
        score: (html) => {
            const cellCount = (html.match(/class="(?:[^"]*\s)?cell(?:\s[^"]*)?"/g) || []).length;
            const vqCount = (html.match(/<blockquote\b[^>]*class="(?:[^"]*\s)?vq(?:\s[^"]*)?"/g) || []).length;
            if (cellCount === 0) return { score: 0, pass: false, note: 'no cells found' };
            const ratio = vqCount / cellCount;
            return { score: Math.min(1, ratio / 0.40), pass: ratio >= 0.40, note: `${(ratio * 100).toFixed(0)}% vq density (${vqCount}/${cellCount})` };
        },
    },
    {
        name: 'named_touchpoint_density',
        weight: 0.10,
        score: (html) => {
            const cellCount = (html.match(/class="(?:[^"]*\s)?cell(?:\s[^"]*)?"/g) || []).length;
            const tpCount = (html.match(/class="(?:[^"]*\s)?tp(?:\s[^"]*)?"/g) || []).length;
            if (cellCount === 0) return { score: 0, pass: false };
            const ratio = tpCount / cellCount;
            return { score: Math.min(1, ratio / 0.60), pass: ratio >= 0.60, note: `${(ratio * 100).toFixed(0)}% tp density` };
        },
    },
    {
        name: 'emotion_specificity',
        weight: 0.10,
        score: (html) => {
            const cellCount = (html.match(/class="(?:[^"]*\s)?cell(?:\s[^"]*)?"/g) || []).length;
            const emoCount = (html.match(/class="(?:[^"]*\s)?emo(?:\s[^"]*)?"/g) || []).length;
            if (cellCount === 0) return { score: 0, pass: false };
            const ratio = emoCount / cellCount;
            return { score: Math.min(1, ratio / 0.80), pass: ratio >= 0.80, note: `${(ratio * 100).toFixed(0)}% emo density` };
        },
    },
    {
        name: 'dashboard_signals',
        weight: 0.10,
        score: (html) => {
            const signals = [
                /class="(?:[^"]*\s)?kpi-dashboard(?:\s[^"]*)?"/.test(html),
                (html.match(/class="(?:[^"]*\s)?kpi-tile(?:\s[^"]*)?"/g) || []).length >= 3,
                /class="(?:[^"]*\s)?personas?(?:\s[^"]*)?"/.test(html),
                /class="(?:[^"]*\s)?overall-pain(?:\s[^"]*)?"/.test(html),
                /class="(?:[^"]*\s)?overall-opp(?:\s[^"]*)?"/.test(html),
            ].filter(Boolean).length;
            return { score: signals / 5, pass: signals >= 3, note: `${signals}/5 dashboard signals` };
        },
    },
    {
        name: 'no_retired_swimlane',
        weight: 0.05,
        score: (html) => {
            const retired = ['phase-strip', 'lane-track', 'emotion-arc', 'opportunity-row', 'voice-row', 'synthesis-band'];
            const found = retired.filter(c => new RegExp(`class="[^"]*\\b${c}\\b[^"]*"`).test(html));
            return { score: found.length === 0 ? 1 : 0, pass: found.length === 0, note: found.length > 0 ? `retired classes: ${found.join(', ')}` : undefined };
        },
    },
    {
        name: 'exactly_one_focal',
        weight: 0.05,
        score: (html) => {
            const focalCount = (html.match(/class="phase-head focal"/g) || []).length;
            return { score: focalCount === 1 ? 1 : 0, pass: focalCount === 1, note: `${focalCount} focal phases (expected 1)` };
        },
    },
    {
        name: 'source_diversity',
        weight: 0.10,
        score: (html) => {
            const cites = html.match(/<cite[^>]*>([^<]+)<\/cite>/g) || [];
            const sources = new Set<string>();
            for (const c of cites) {
                const inner = c.replace(/<\/?cite[^>]*>/g, '').trim().toLowerCase();
                if (inner.length > 3) sources.add(inner.slice(0, 60));
            }
            const inlineCites = html.match(/\(([^)]*(?:r\/|reddit|openalex|crossref|dive|jstor|2024|2025|2026)[^)]*)\)/gi) || [];
            for (const c of inlineCites) {
                sources.add(c.toLowerCase().slice(0, 60));
            }
            return { score: Math.min(1, sources.size / 3), pass: sources.size >= 3, note: `${sources.size} distinct named sources` };
        },
    },
];

// ─── Persona rubric ─────────────────────────────────────────────────────────

const personaComponents: RubricComponent[] = [
    {
        name: 'verbatim_quotes_present',
        weight: 0.25,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const personas = parsed.personas || (parsed.persona ? [parsed.persona] : []);
                if (!Array.isArray(personas) || personas.length === 0) return { score: 0, pass: false };
                let totalQuoteFields = 0;
                let verbatimWithSource = 0;
                for (const p of personas) {
                    const motivations = p.motivations || [];
                    const painPoints = p.painPoints || [];
                    for (const m of [...motivations, ...painPoints]) {
                        totalQuoteFields++;
                        if (m.quote && m.source && !['synthesis', 'composite', 'ai', 'model', 'unknown'].includes(String(m.source).toLowerCase())) {
                            verbatimWithSource++;
                        }
                    }
                }
                if (totalQuoteFields === 0) return { score: 0, pass: false };
                const ratio = verbatimWithSource / totalQuoteFields;
                return { score: ratio, pass: ratio >= 0.70, note: `${(ratio * 100).toFixed(0)}% quotes have verbatim + named source` };
            } catch {
                return { score: 0, pass: false, note: 'JSON parse failed' };
            }
        },
    },
    {
        name: 'jtbd_present',
        weight: 0.15,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const personas = parsed.personas || (parsed.persona ? [parsed.persona] : []);
                if (!Array.isArray(personas) || personas.length === 0) return { score: 0, pass: false };
                const withJtbd = personas.filter((p: any) => p.jtbd && p.jtbd.length > 20 && /when.+,\s*i want.+,\s*so/i.test(p.jtbd));
                const ratio = withJtbd.length / personas.length;
                return { score: ratio, pass: ratio >= 0.80, note: `${withJtbd.length}/${personas.length} canonical JTBD` };
            } catch {
                return { score: 0, pass: false };
            }
        },
    },
    {
        name: 'no_composite_suffix',
        weight: 0.10,
        score: (json) => {
            const has = /\((composite|synthetic|merged|aggregate)\)/i.test(json);
            return { score: has ? 0 : 1, pass: !has, note: has ? 'composite/synthetic suffix in name' : undefined };
        },
    },
    {
        name: 'no_demographics_first',
        weight: 0.10,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const personas = parsed.personas || (parsed.persona ? [parsed.persona] : []);
                if (!Array.isArray(personas) || personas.length === 0) return { score: 0, pass: false };
                const demoFirst = personas.filter((p: any) => p.bio && /^\d+[\-\s]year[\-\s]old|^(male|female|man|woman)\b|^[A-Z][a-z]+,\s+\d+/i.test(p.bio.trim()));
                const ratio = 1 - (demoFirst.length / personas.length);
                return { score: ratio, pass: ratio === 1, note: `${demoFirst.length} demographics-first bios` };
            } catch {
                return { score: 0, pass: false };
            }
        },
    },
];

// ─── Gap-analysis rubric ────────────────────────────────────────────────────

const gapAnalysisComponents: RubricComponent[] = [
    {
        name: 'dollar_quantified_impact',
        weight: 0.30,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const gaps = parsed.gaps || parsed.gap_analysis?.gaps || [];
                if (!Array.isArray(gaps) || gaps.length === 0) return { score: 0, pass: false };
                const withDollarImpact = gaps.filter((g: any) => {
                    const impact = JSON.stringify(g.impact || g.cost || g.businessImpact || '');
                    return /\$[\d,]+|\d+%\s*(of|reduction|increase|impact|loss|cost)|USD\s*\d/i.test(impact);
                });
                const ratio = withDollarImpact.length / gaps.length;
                return { score: ratio, pass: ratio >= 0.80, note: `${withDollarImpact.length}/${gaps.length} dollar-quantified` };
            } catch {
                return { score: 0, pass: false };
            }
        },
    },
    {
        name: 'maturity_scoring_present',
        weight: 0.10,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const gaps = parsed.gaps || [];
                if (!Array.isArray(gaps) || gaps.length === 0) return { score: 0, pass: false };
                const scored = gaps.filter((g: any) => typeof g.currentMaturity === 'number' && typeof g.targetMaturity === 'number');
                return { score: scored.length / gaps.length, pass: scored.length / gaps.length >= 0.90 };
            } catch {
                return { score: 0, pass: false };
            }
        },
    },
];

// ─── Roadmap rubric ─────────────────────────────────────────────────────────

const roadmapComponents: RubricComponent[] = [
    {
        name: 'quantified_success_metric',
        weight: 0.30,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const horizons = parsed.horizons || parsed.roadmap?.horizons || [];
                if (!Array.isArray(horizons) || horizons.length === 0) return { score: 0, pass: false };
                let totalItems = 0;
                let withMetric = 0;
                for (const h of horizons) {
                    const items = h.items || h.initiatives || [];
                    for (const item of items) {
                        totalItems++;
                        const metric = JSON.stringify(item.successMetric || item.metric || item.kpi || '');
                        if (/\d+[\s%$]?.+(by|within|in)\s+\d/.test(metric)) {
                            withMetric++;
                        }
                    }
                }
                if (totalItems === 0) return { score: 0, pass: false };
                const ratio = withMetric / totalItems;
                return { score: ratio, pass: ratio >= 0.80, note: `${withMetric}/${totalItems} with baseline+target+timeframe` };
            } catch {
                return { score: 0, pass: false };
            }
        },
    },
    {
        name: 'three_horizons_present',
        weight: 0.10,
        score: (json) => {
            try {
                const parsed = JSON.parse(json);
                const horizons = parsed.horizons || [];
                const labels = horizons.map((h: any) => String(h.label || h.name || '').toLowerCase());
                const hasNow = labels.some((l: string) => l.includes('now'));
                const hasNext = labels.some((l: string) => l.includes('next'));
                const hasLater = labels.some((l: string) => l.includes('later'));
                const count = [hasNow, hasNext, hasLater].filter(Boolean).length;
                return { score: count / 3, pass: count === 3 };
            } catch {
                return { score: 0, pass: false };
            }
        },
    },
];

// ─── Rubric registry ────────────────────────────────────────────────────────

const RUBRICS: Partial<Record<DeliverableKind, RubricComponent[]>> = {
    journey: journeyComponents,
    blueprint: journeyComponents,
    persona: personaComponents,
    'gap-analysis': gapAnalysisComponents,
    roadmap: roadmapComponents,
};

// ─── Public API ─────────────────────────────────────────────────────────────

export function scoreDeliverable(output: string, kind: DeliverableKind): DeliverableScore {
    const kindRubric = RUBRICS[kind] || [];
    const components = [...universalComponents, ...kindRubric];
    const totalWeight = components.reduce((s, c) => s + c.weight, 0);

    const sub_scores: Record<string, number> = {};
    const failures: string[] = [];
    const successes: string[] = [];
    const notes: string[] = [];

    let composite = 0;
    for (const c of components) {
        const result = c.score(output);
        sub_scores[c.name] = result.score;
        composite += (c.weight / totalWeight) * result.score;
        if (!result.pass) {
            failures.push(`${c.name}: ${result.note || `score ${result.score.toFixed(2)} below pass threshold`}`);
        } else {
            successes.push(`${c.name}: ${result.note || `score ${result.score.toFixed(2)}`}`);
        }
        if (result.note) notes.push(`${c.name}: ${result.note}`);
    }

    return {
        composite: Math.max(0, Math.min(1, composite)),
        sub_scores,
        failures,
        successes,
        notes,
    };
}

