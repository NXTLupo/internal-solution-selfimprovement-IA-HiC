// services/journeyBriefExporter.ts
// 2026-05-26 - Journey Brief export path.
//
// THE PROBLEM this solves: exporting a journey artifact to PPTX used to
// rasterize / stretch the interactive journey HTML (emotion curve +
// stretched theme boxes), producing an unreadable "stretched slop"
// slide. A journey bound for a partner deck should be a SUMMARIZED
// JOURNEY BRIEF authored by a reasoning model: diagnostic title, per-
// stage summary, top cross-cutting pains, top opportunities, KPIs -
// one clean on-brand slide.
//
// THE FIX: this module takes the journey artifact's HTML (or its
// structured source) + the research goal, calls a REASONING model
// (Opus 4.7 → Sonnet 4.6 fallback) to distill it into a structured
// JourneyBrief, and returns that brief for the PPTX exporter to render
// through the clean case-study-style slide primitives (which are now
// on-brand after the 2026-05-26 font-role fix).
//
// Reasoning model, NOT Flash: the distillation is a judgment task
// (what are the 3 pains that actually matter, what is the one-line
// diagnostic title). Flash flattens; Opus/Sonnet discriminate.

import { parseJSONWithRepair } from './aiOutputRepair';
import { artifactModelFor, applyAnthropicRequestDefaults } from './aiRouter';
import type { BrandId } from '../components/slideTemplates/brands';
import { anthropicText } from './claudeModelPolicy';

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface JourneyBriefStage {
    name: string;            // concrete behavioral event, e.g. "Application submission"
    key_pain: string;        // the single sharpest pain at this stage (named, with a number if evidenced)
    key_opportunity: string; // the highest-leverage intervention at this stage
}

export interface JourneyBrief {
    diagnostic_title: string;        // action-title sentence with a number (the headline finding)
    journey_type: string;           // coop | educational | customer | etc.
    persona_line: string;           // who the journey follows (goals-first, not demographics)
    stages: JourneyBriefStage[];    // 3-6 stages
    cross_cutting_pains: string[];  // 3 journey-level pains (not per-stage)
    strategic_opportunities: string[]; // 3 journey-level opportunities
    kpis: Array<{ value: string; label: string }>; // 2-4 KPI tiles, real numbers only
    closing_quote?: { text: string; attribution: string }; // optional verbatim VOC quote
    sources: string[];              // named sources cited
}

export interface JourneyBriefInput {
    /** The rendered journey HTML (from the JM service) OR the structured journey JSON. */
    journeyHtml: string;
    researchGoal: string;
    brand: BrandId;
    /** Reasoning model to use; defaults to Opus 4.7 with Sonnet fallback. */
    model?: string;
    proxyBase?: string;
}

const BRIEF_SYSTEM = `You are an NXT Humans consulting analyst. You distill a full customer/student/employee journey map into a one-slide JOURNEY BRIEF that a senior partner reads in 60 seconds. You do NOT reproduce the interactive diagram. You produce a tight, decision-grade summary.

RULES:
- diagnostic_title: ONE complete sentence stating the headline finding WITH a number from the source. Partner Test: reading only this sentence conveys the central tension. No topic phrases.
- stages: 3-6 only. Each stage name is a concrete behavioral event (NOT a gerund category). key_pain names a specific friction with a number/system/proper-noun. key_opportunity is the highest-leverage intervention.
- cross_cutting_pains: exactly 3 JOURNEY-LEVEL patterns (trust erosion, capability gap, expectation mismatch, friction cascade), NOT phase-level. Each one sentence, evidenced.
- strategic_opportunities: exactly 3 high-leverage moves. Each one sentence.
- kpis: 2-4 tiles. REAL numbers from the source ONLY. If a number would be invented, use a qualitative display word (FRAGMENTED, MULTIPLE, PERSISTENT) instead.
- closing_quote: ONE verbatim voice-of-user quote IF the source carries one. Never fabricate.
- sources: the named sources the journey cited.

BANNED: em-dashes (use comma/semicolon/period), AI-slop ("delve", "tapestry", "leverage", "robust", "pivotal", "comprehensive"), meta-narration ("this brief", "the journey shows"), invented numbers, generic pains ("poor UX").

Return ONLY this JSON, no prose:
{
  "diagnostic_title": "...",
  "journey_type": "...",
  "persona_line": "...",
  "stages": [{"name":"...","key_pain":"...","key_opportunity":"..."}],
  "cross_cutting_pains": ["...","...","..."],
  "strategic_opportunities": ["...","...","..."],
  "kpis": [{"value":"...","label":"..."}],
  "closing_quote": {"text":"...","attribution":"..."},
  "sources": ["..."]
}`;

/**
 * Strip the journey HTML down to its text content so the reasoning model
 * distills the MEANING, not the markup. Keeps the signal (stage names,
 * pains, quotes, numbers), drops the SVG/CSS noise.
 */
function htmlToSignalText(html: string): string {
    return html
        // drop style/script blocks entirely
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' [diagram] ')
        // strip tags but keep text
        .replace(/<[^>]+>/g, ' ')
        // collapse whitespace
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60000);
}

export async function generateJourneyBrief(input: JourneyBriefInput): Promise<JourneyBrief> {
    const proxyBase = input.proxyBase || PROXY_BASE;
    const signalText = htmlToSignalText(input.journeyHtml);

    const userPrompt = `RESEARCH GOAL:\n${input.researchGoal}\n\nBRAND: ${input.brand.toUpperCase()}\n\nJOURNEY SOURCE CONTENT (distill this into the brief):\n${signalText}`;

    // Reasoning model first. Opus 4.8 for the judgment task; Sonnet 4.6
    // fallback; never Flash for distillation. Routed through the proxy's
    // Anthropic endpoint (which now has its own per-provider semaphore +
    // the 429 fallback added 2026-05-26).
    const model = input.model || artifactModelFor('journey-brief');

    async function callReasoning(useModel: string): Promise<string> {
        const resp = await fetch(`${proxyBase}/api/ai/anthropic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applyAnthropicRequestDefaults({
                model: useModel,
                max_tokens: 4096,
                system: BRIEF_SYSTEM,
                messages: [{ role: 'user', content: userPrompt }],
            }, { kind: 'journey-brief' })),
            signal: AbortSignal.timeout(120_000),
        });
        if (!resp.ok) {
            const errTxt = await resp.text().catch(() => '');
            throw new Error(`anthropic ${resp.status}: ${errTxt.slice(0, 200)}`);
        }
        const data = await resp.json();
        // Anthropic shape: content[0].text
        return anthropicText(data) || data?.text || '';
    }

    let raw = '';
    try {
        raw = await callReasoning(model);
    } catch (err) {
        console.warn('[journeyBrief] Opus failed, falling back to Sonnet:', err);
        try {
            raw = await callReasoning('claude-sonnet-4-6');
        } catch (err2) {
            console.error('[journeyBrief] both reasoning models failed:', err2);
            throw err2;
        }
    }

    const parsed = parseJSONWithRepair(raw, { calling_context: 'journey_brief' }) as Partial<JourneyBrief>;

    // Defensive defaults so the PPTX renderer never crashes on a thin brief.
    return {
        diagnostic_title: parsed.diagnostic_title || input.researchGoal.slice(0, 120),
        journey_type: parsed.journey_type || 'general',
        persona_line: parsed.persona_line || '',
        stages: Array.isArray(parsed.stages) ? parsed.stages.slice(0, 6) : [],
        cross_cutting_pains: Array.isArray(parsed.cross_cutting_pains) ? parsed.cross_cutting_pains.slice(0, 3) : [],
        strategic_opportunities: Array.isArray(parsed.strategic_opportunities) ? parsed.strategic_opportunities.slice(0, 3) : [],
        kpis: Array.isArray(parsed.kpis) ? parsed.kpis.slice(0, 4) : [],
        closing_quote: parsed.closing_quote && parsed.closing_quote.text ? parsed.closing_quote : undefined,
        sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 8) : [],
    };
}
