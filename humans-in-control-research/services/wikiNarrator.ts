/**
 * Wiki Narrator - Natural Language Self-Improvement Explainability
 *
 * Generates human-readable narration of what the wiki knowledge layer
 * is doing at each stage of the pipeline. Instead of scores and dashboards,
 * the system TELLS the user what it learned, what it corrected, what got
 * stronger, and what it's storing for next time.
 *
 * These narrations feed into the existing ThinkingEvent stream alongside
 * PHASE, INSIGHT, and CORRECTION events. New event types:
 *
 *   LEARNING    - "Storing this insight for future analyses..."
 *   IMPROVING   - "Updating the persona framework based on what worked..."
 *   CORRECTING  - "Correcting prior knowledge: Gartner says 5 stages, not 4..."
 *   RECALLING   - "Drawing on 23 evidence points from previous research..."
 *   DETECTING   - "Caught 2 vague phrases - replacing with specific data..."
 */

import type { OutputOption } from '../types';
import type { GenerationContext, QualityScore, SlopViolation } from './wikiService';

// --- EVENT TYPES ---

export interface NarrationEvent {
    type: 'LEARNING' | 'IMPROVING' | 'CORRECTING' | 'RECALLING' | 'DETECTING';
    content: string;
}

// --- PRE-GENERATION NARRATION ---
// What the system tells you BEFORE it generates, about what knowledge it's drawing on

/**
 * Narrate what wiki knowledge is being loaded before generation.
 * Called after loadGenerationContext() completes.
 */
export function narratePreGeneration(
    outputType: OutputOption,
    context: GenerationContext
): NarrationEvent[] {
    const events: NarrationEvent[] = [];
    const typeName = OUTPUT_DISPLAY_NAMES[outputType] || outputType;

    // What SPECIFIC framework knowledge is being applied to THIS deliverable
    if (context.framework) {
        const sectionCount = (context.framework.match(/^###?\s/gm) || []).length;
        const specificDetails = FRAMEWORK_SPECIFICS[outputType] || `${sectionCount} sections of consulting methodology`;
        events.push({
            type: 'RECALLING',
            content: `${typeName}: ${specificDetails}`,
        });
    }

    // What SPECIFIC anti-patterns are being watched for THIS deliverable
    if (context.antiPatterns) {
        const patternCount = (context.antiPatterns.match(/^### AP-/gm) || []).length;
        const specificWarnings = ANTIPATTERN_SPECIFICS[outputType] || 'vague language, missing evidence, structural gaps';
        events.push({
            type: 'DETECTING',
            content: `Watching for ${patternCount} known ${typeName} failure patterns: ${specificWarnings}.`,
        });
    }

    // Benchmark data -- only narrate ONCE, not per deliverable
    // (handled by narrateKnowledgeCompounding instead)

    // Social intelligence -- only mention if relevant to this specific deliverable
    if (context.socialIntelligence?.sentimentPipeline &&
        ['PERSONAS', 'JOURNEY_MAP', 'GAP_ANALYSIS', 'COMPETITIVE_ANALYSIS'].includes(outputType)) {
        events.push({
            type: 'RECALLING',
            content: `Social listening data (Reddit, TrustPilot) will feed into ${typeName} - practitioner sentiment grounds the analysis in real-world experience, not just published research.`,
        });
    }

    // Engagement-specific context
    if (context.engagementContext) {
        events.push({
            type: 'RECALLING',
            content: `Client engagement context loaded from previous sessions. Previously identified pain points and stakeholder preferences carry forward.`,
        });
    }

    // If the wiki is thin, be honest
    if (!context.framework && !context.benchmarks) {
        events.push({
            type: 'LEARNING',
            content: `Wiki knowledge layer is still bootstrapping for ${typeName}. This generation will start from base methodology. After completion, key insights will be filed back to strengthen future runs.`,
        });
    }

    return events;
}

// --- POST-GENERATION NARRATION ---
// What the system tells you AFTER it generates, about what it learned and stored

/**
 * Narrate what the system learned from this generation and what it's filing back.
 */
export function narratePostGeneration(
    outputType: OutputOption,
    results: {
        sectionCount: number;
        citationCount: number;
        newInsights?: string[];
        contradictions?: string[];
        promptSuggestions?: string[];
    }
): NarrationEvent[] {
    const events: NarrationEvent[] = [];
    const typeName = OUTPUT_DISPLAY_NAMES[outputType] || outputType;

    // What was produced
    events.push({
        type: 'LEARNING',
        content: `${typeName} generated with ${results.sectionCount} sections and ${results.citationCount} evidence citations. Storing structural patterns that worked for future ${typeName} generations.`,
    });

    // New insights discovered
    if (results.newInsights && results.newInsights.length > 0) {
        events.push({
            type: 'LEARNING',
            content: `Filing ${results.newInsights.length} new insight${results.newInsights.length > 1 ? 's' : ''} back into the wiki: ${results.newInsights.slice(0, 3).map(i => `"${i}"`).join(', ')}${results.newInsights.length > 3 ? ` and ${results.newInsights.length - 3} more` : ''}. These will be available to strengthen future analyses.`,
        });
    }

    // Contradictions found
    if (results.contradictions && results.contradictions.length > 0) {
        for (const contradiction of results.contradictions.slice(0, 2)) {
            events.push({
                type: 'CORRECTING',
                content: `Correcting prior knowledge: ${contradiction}. Updating the wiki to reflect the more current or better-evidenced finding.`,
            });
        }
    }

    // Prompt improvement suggestions
    if (results.promptSuggestions && results.promptSuggestions.length > 0) {
        events.push({
            type: 'IMPROVING',
            content: `Identified ${results.promptSuggestions.length} prompt improvement${results.promptSuggestions.length > 1 ? 's' : ''} from this run: ${results.promptSuggestions.slice(0, 2).join('; ')}. Updating the framework specification so the next generation starts stronger.`,
        });
    }

    return events;
}

// --- POST-ANALYSIS CONFIDENCE NARRATION ---

/**
 * Narrate post-analysis confidence assessment in natural language.
 * Explains WHY the confidence score is what it is, based on actual evidence.
 */
function narrateConfidenceAssessment(ingestionResult: any): NarrationEvent[] {
    const events: NarrationEvent[] = [];

    if (ingestionResult?.confidenceBreakdown) {
        const cb = ingestionResult.confidenceBreakdown;
        const factors: string[] = [];
        if (cb.sourceBreadth) factors.push(`source breadth ${cb.sourceBreadth}/100`);
        if (cb.convergence) factors.push(`cross-source convergence ${cb.convergence}/100`);
        if (cb.specificity) factors.push(`data specificity ${cb.specificity}/100`);
        if (cb.coverage) factors.push(`goal coverage ${cb.coverage}/100`);
        if (cb.freshness) factors.push(`evidence freshness ${cb.freshness}/100`);

        events.push({
            type: 'LEARNING',
            content: `Confidence assessment computed from actual evidence analysis: ${factors.join(', ')}. Overall: ${ingestionResult.confidenceScore}%. This score is based on what the data ACTUALLY contains, not a pre-analysis guess.`,
        });
    }

    if (ingestionResult?.sourceContributionRanking && ingestionResult.sourceContributionRanking.length > 0) {
        const top = ingestionResult.sourceContributionRanking
            .filter((s: any) => s.contributionLevel === 'high' || s.contributionLevel === 'critical')
            .slice(0, 3);
        if (top.length > 0) {
            const contributions = top.map((s: any) => `${s.sourceCategory}: ${s.keyInsight}`).join('. ');
            events.push({
                type: 'IMPROVING',
                content: `Source contribution analysis: ${contributions}. These findings will inform which source categories to prioritize in future research on this domain.`,
            });
        }
    }

    return events;
}

// --- SLOP DETECTION NARRATION ---

/**
 * Narrate anti-slop detections in natural language.
 */
export function narrateSlopDetection(violations: SlopViolation[]): NarrationEvent[] {
    if (violations.length === 0) return [];

    const events: NarrationEvent[] = [];

    if (violations.length <= 3) {
        // Name each one specifically
        for (const v of violations) {
            events.push({
                type: 'DETECTING',
                content: `Caught vague language: "${v.phrase}" - ${v.suggestion}`,
            });
        }
    } else {
        // Summarize
        const sample = violations.slice(0, 2).map(v => `"${v.phrase}"`).join(', ');
        events.push({
            type: 'DETECTING',
            content: `Caught ${violations.length} vague phrases (${sample}, and ${violations.length - 2} more). Replacing each with specific data, named frameworks, or quantified impact. Every claim should be verifiable, not decorative.`,
        });
    }

    return events;
}

// --- QUALITY NARRATION ---

/**
 * Narrate quality assessment in natural language.
 * No scores shown - just what's strong and what needs work.
 */
export function narrateQualityAssessment(score: QualityScore): NarrationEvent[] {
    const events: NarrationEvent[] = [];

    if (score.passing) {
        // Strengths
        const strengths: string[] = [];
        if (score.completeness >= 4.5) strengths.push('all required sections present');
        if (score.depth >= 4.0) strengths.push('analysis goes beyond surface observations into implications and evidence-backed recommendations');
        if (score.evidence >= 4.0) strengths.push('strong evidence density with cited data points');
        if (score.specificity >= 4.0) strengths.push('recommendations are implementation-ready with timelines and metrics');

        events.push({
            type: 'LEARNING',
            content: `Output meets consulting quality threshold. ${strengths.length > 0 ? 'Strengths: ' + strengths.join('; ') + '.' : ''} Filing this output pattern as a reference for future generations.`,
        });
    } else {
        // What needs strengthening
        const gaps: string[] = [];
        if (score.completeness < 3.5) gaps.push('some required sections are thin or missing - adding them before delivery');
        if (score.depth < 3.5) gaps.push('analysis stays at the observation level in places - deepening to implications and recommendations');
        if (score.evidence < 3.0) gaps.push('some sections lack cited evidence - pulling from the benchmark and evidence base to ground claims');
        if (score.visualQuality < 3.5) gaps.push('detected visual patterns that signal AI generation - applying brand standards');
        if (score.specificity < 3.5) gaps.push('some recommendations are too generic - adding timelines, metrics, and owners');

        events.push({
            type: 'IMPROVING',
            content: `Strengthening output before delivery: ${gaps.join('; ')}. ${gaps.length > 1 ? `Addressing ${gaps.length} areas` : 'Addressing this'} to meet the consulting quality bar.`,
        });
    }

    return events;
}

// --- INGEST NARRATION ---

/**
 * Narrate what happened during a source document ingest operation.
 */
function narrateIngest(results: {
    sourceName: string;
    dataPointsExtracted: number;
    pagesUpdated: string[];
    contradictions?: string[];
    newFrameworkInsights?: string[];
}): NarrationEvent[] {
    const events: NarrationEvent[] = [];

    events.push({
        type: 'LEARNING',
        content: `Processed "${results.sourceName}" - extracted ${results.dataPointsExtracted} data points. Updated ${results.pagesUpdated.length} wiki pages: ${results.pagesUpdated.slice(0, 5).join(', ')}${results.pagesUpdated.length > 5 ? ` and ${results.pagesUpdated.length - 5} more` : ''}. This evidence is now compiled and ready to cite in future deliverables.`,
    });

    if (results.contradictions && results.contradictions.length > 0) {
        for (const c of results.contradictions) {
            events.push({
                type: 'CORRECTING',
                content: `Found a contradiction with existing knowledge: ${c}. Both versions are now flagged in the wiki for review - the newer evidence takes precedence but the conflict is preserved for transparency.`,
            });
        }
    }

    if (results.newFrameworkInsights && results.newFrameworkInsights.length > 0) {
        events.push({
            type: 'IMPROVING',
            content: `This source introduced ${results.newFrameworkInsights.length} new framework insight${results.newFrameworkInsights.length > 1 ? 's' : ''} that strengthen the methodology: ${results.newFrameworkInsights.join('; ')}. Updating the framework specification.`,
        });
    }

    return events;
}

// --- CROSS-SESSION NARRATION ---

/**
 * Narrate how this session builds on previous ones.
 * Called at the start of analysis if prior wiki content exists.
 */
export function narrateKnowledgeCompounding(stats: {
    totalWikiPages: number;
    totalEvidencePoints: number;
    totalSourcesIngested: number;
    previousEngagements: number;
    lastUpdated: string;
}): NarrationEvent[] {
    const events: NarrationEvent[] = [];

    if (stats.totalSourcesIngested > 0) {
        events.push({
            type: 'RECALLING',
            content: `Intelligence fabric collected ${stats.totalSourcesIngested} sources. Drawing on ${stats.totalWikiPages} compiled wiki pages (frameworks, anti-patterns, benchmarks, brand standards). Benchmark data (NPS ranges, maturity distributions, ROI figures, adoption rates) will be cited inline instead of generating vague claims.`,
        });
    } else if (stats.totalWikiPages > 0) {
        events.push({
            type: 'RECALLING',
            content: `Wiki knowledge layer active with ${stats.totalWikiPages} compiled pages. Benchmark data and framework specifications ready. Evidence base grows with each analysis run.`,
        });
    }

    return events;
}

// --- DESIGN SYSTEM ENFORCEMENT NARRATION ---

/**
 * Narrate design system enforcement in natural language.
 * Called when the system applies the NXT Humans Design System to visual output.
 */
function narrateDesignSystemEnforcement(context: {
    outputType: string;
    violations?: string[];
    appliedPatterns?: string[];
}): NarrationEvent[] {
    const events: NarrationEvent[] = [];

    // Always narrate that the design system is being applied
    events.push({
        type: 'RECALLING',
        content: `Applying NXT Humans Design System to all visual output. Anti-slop business flat minimalism: Bebas Neue headlines, Archivo body, stark white canvas, chartreuse power accent (max 15% of surface), functional color only in charts. Every element earns its place through function, not decoration.`,
    });

    // Narrate specific violations caught
    if (context.violations && context.violations.length > 0) {
        for (const v of context.violations.slice(0, 3)) {
            events.push({
                type: 'DETECTING',
                content: `Design system violation caught: ${v}. Correcting to match the NXT Humans visual language.`,
            });
        }
    }

    // Narrate patterns being applied
    if (context.appliedPatterns && context.appliedPatterns.length > 0) {
        const patterns = context.appliedPatterns.slice(0, 4).join(', ');
        events.push({
            type: 'IMPROVING',
            content: `Layout patterns applied: ${patterns}. Each pattern is codified in the design system - Split Panel for analysis+evidence, Stat Row for high-impact data, Evidence Block for cited findings, Recommendation Callout for key actions.`,
        });
    }

    return events;
}

/**
 * Narrate when the design system itself is being updated based on learnings.
 */
function narrateDesignSystemLearning(insight: string): NarrationEvent[] {
    return [{
        type: 'IMPROVING',
        content: `Updating the NXT Humans Design System: ${insight}. This visual standard will be applied to all future deliverables.`,
    }];
}

// --- ANALYTICAL LENS NARRATION ---

/**
 * Narrate why a specific analytical lens was auto-selected.
 * The user sees this instead of a manual picker.
 */
export function narrateLensDetection(result: {
    selectedLens: string;
    confidence: string;
    explanation: string;
    signalsDetected: string[];
}): NarrationEvent[] {
    const events: NarrationEvent[] = [];

    const lensName = LENS_DISPLAY_NAMES[result.selectedLens] || result.selectedLens;

    events.push({
        type: 'RECALLING',
        content: `Analytical lens auto-detected: ${lensName} (${result.confidence} confidence). ${result.explanation}`,
    });

    if (result.selectedLens !== 'general_cx') {
        events.push({
            type: 'IMPROVING',
            content: `Activating domain-specific intelligence: persona schemas will include specialized fields, journey stages will follow the ${lensName} lifecycle, and theme extraction will prioritize domain-relevant patterns. This specialization compounds -- each engagement strengthens the lens for the next.`,
        });
    }

    return events;
}

const LENS_DISPLAY_NAMES: Record<string, string> = {
    'general_cx': 'General CX Research',
    'fundraising_advancement': 'Fundraising & Advancement',
    'student_learner': 'Student & Learner Experience',
    'digital_product': 'Digital Product & Mobile',
    'enterprise_technology': 'Enterprise Technology',
    'custom': 'Custom Framework',
};

// --- CONSTANTS ---

/**
 * Deliverable-specific narration: what the framework ACTUALLY provides for this type.
 * Not "33 sections of methodology" -- what does that mean for the user's research?
 */
const FRAMEWORK_SPECIFICS: Record<string, string> = {
    'PERSONAS': 'Cooper goal-directed methodology with JTBD integration. Each persona will have hierarchical goals (life/experience/functional), specific JTBD statements, 14 required sections, and evidence-backed pain points. Behaviors drive differentiation, not demographics.',
    'STRATEGY_DECK': 'Minto Pyramid Principle with SCR structure. Every slide will have an action-title conclusion (not a topic label), MECE structure, and the Partner Test applied -- titles alone must tell the full strategic argument.',
    'JOURNEY_MAP': 'Bitner five-component service blueprint. Five swimlanes (Evidence, Customer Actions, Frontstage, Backstage, Support), three structural lines, fail points marked, emotional states mapped, 8-12 customer actions per stage.',
    'TECH_ARCH': 'C4 Model (Brown) + Well-Architected Framework. Context, Container, and Component diagrams with ADRs, NFRs with quantified SLAs, security architecture, and migration path.',
    'STRATEGIC_RECS': 'Rumelt Kernel: every recommendation will have a specific diagnosis, guiding policy (not a goal), and coherent actions. No "leverage synergies" -- every action is assignable with timeline and impact.',
    'PRD': 'Cagan/SVPG methodology. Problem statement is the most important section. MoSCoW prioritization, Given/When/Then acceptance criteria, and guardrail metrics that must not regress.',
    'ROADMAP': 'NOW-NEXT-LATER framework (Bastow). Items framed as problems to solve, not features. Confidence levels decrease for farther horizons. 15-30% capacity reserved for technical debt.',
    'GAP_ANALYSIS': 'Gartner CX Maturity + Parasuraman gaps model. 8 dimensions scored 1-5 with behavioral evidence. Gaps clustered by root cause before prioritization. Spider/radar visualization.',
    'TECH_AUDIT': 'COBIT 2019 + Forrester TEI. 15 dimensions with color-coded disposition (Keep/Review/Retire). License utilization analysis. "Do nothing" cost scenario included.',
    'COMPETITIVE_ANALYSIS': 'Porter Five Forces + Blue Ocean Strategy Canvas. 15 comparison dimensions, feature matrix, positioning map, and one-page battlecard. Every competitor assessment includes customer sentiment data, not just marketing claims.',
};

const ANTIPATTERN_SPECIFICS: Record<string, string> = {
    'PERSONAS': 'demographics-first thinking, elastic personas stretched to cover everyone, missing JTBD statements, generic pain points without evidence, no anti-persona',
    'STRATEGY_DECK': 'topic titles instead of conclusions ("Market Overview" vs sentence), buried lead, death by bullets (>4 per slide), pie charts, missing sources on data',
    'JOURNEY_MAP': 'missing backstage (real value is below line of visibility), no fail points, all emotions positive, too abstract (<5 actions per stage)',
    'TECH_ARCH': 'Big Ball of Mud, Golden Hammer, security as afterthought, missing ADRs, no migration path',
    'STRATEGIC_RECS': 'goals masquerading as strategy, fluff buzzwords, no diagnosis, missing investment case with NPV/IRR',
    'PRD': 'solution masquerading as problem, feature list without strategic context, missing out-of-scope section',
    'ROADMAP': 'feature factory (backlog without strategy), date theater, no tech debt allocation, items as features not problems',
    'GAP_ANALYSIS': 'maturity theater (scores without behavioral evidence), uniform Level 5 targets, no business impact quantification',
    'TECH_AUDIT': 'vendor name hallucination (inventing vendors not in corpus), no "do nothing" scenario, green-lighting everything',
    'COMPETITIVE_ANALYSIS': 'feature matrix only (missing strategy/sentiment/pricing), stale data without freshness warning, self-congratulatory analysis',
};

const OUTPUT_DISPLAY_NAMES: Record<string, string> = {
    'PERSONAS': 'Persona',
    'STRATEGY_DECK': 'Strategy Deck',
    'JOURNEY_MAP': 'Service Blueprint',
    'TECH_ARCH': 'Technology Architecture',
    'STRATEGIC_RECS': 'Strategic Recommendations',
    'PRD': 'Product Requirements Document',
    'ROADMAP': 'Strategic Roadmap',
    'GAP_ANALYSIS': 'Gap Analysis',
    'TECH_AUDIT': 'Technology Audit',
    'COMPETITIVE_ANALYSIS': 'Competitive Analysis',
};
