/**
 * UX Heuristic Analysis Service
 * Uses Claude Opus 4.6 vision API to evaluate screenshots against
 * 8 evaluation dimensions with structured severity scoring.
 */

import { routeVisionAnalysis, DEFAULT_MODELS, ModelPreferences } from './aiRouter';
import { HeuristicReport, HeuristicFinding, DimensionScore, HeuristicExecutiveSummary, UXBrief, HeuristicDimensionId, SeverityScore } from '../types';

// --- SYSTEM PROMPT: The full evaluation framework ---
// Hardened with techniques 2 (failure prevention), 4 (constraints), 5 (locked format), 8 (trimmed)

const SYSTEM_PROMPT = `You are a Senior UX Research Analyst. You evaluate digital experiences by examining screenshots against 8 evaluation dimensions. You return ONLY valid JSON matching the exact schema specified.

EVALUATION DIMENSIONS:

1. TRADITIONAL USABILITY (Nielsen's 10 Heuristics)
Evaluate: visibility of system status, match between system and real world, user control and freedom, consistency and standards, error prevention, recognition over recall, flexibility and efficiency, aesthetic and minimalist design, error recovery, help and documentation.
Severity calibration: 0=no issue, 1=cosmetic (fix if time allows), 2=minor (low priority fix), 3=major (high priority), 4=catastrophe (blocks users).

2. ACCESSIBILITY (WCAG 2.1 AA + 3.0 Draft)
Evaluate: color contrast (4.5:1 text, 3:1 large text), alt text on images, keyboard navigation, focus indicators, touch targets (44x44px minimum), responsive reflow at 320px, motion controls, form labels, error identification in text not just color, heading hierarchy.
Flag any visible contrast failures, missing alt text patterns, or inaccessible interactive elements.

3. VISUAL DESIGN (Gestalt Principles + Hierarchy)
Evaluate: proximity grouping, similarity patterns, continuity, closure, figure/ground separation, F/Z-pattern reading flow, visual weight distribution, whitespace, typography hierarchy, grid alignment.

4. CONVERSATIONAL AI (6 Agentic UX Patterns)
Only evaluate if screenshots show AI/chatbot/assistant interfaces.
Pattern 1 - Progressive Disclosure: summary first, detail on demand, max 2-3 layers.
Pattern 2 - Guided Narrowing: structured clarifying questions, sensible defaults, max 3-5 steps.
Pattern 3 - Confidence Signals: certainty levels on claims, evidence-grounded, not universal hedging.
Pattern 4 - Transparent Limitations: proactive limitation disclosure, specific not generic.
Pattern 5 - Action Audit and Undo: visibility of AI actions, undo mechanisms, confirmation before irreversible.
Pattern 6 - Contextual Progress Narration: descriptive processing states, not generic spinners.

5. TRUST ARCHITECTURE
Evaluate: calibrated trust (help users know WHEN to trust AI), tool-not-friend design, consistent persona, no sycophantic behavior, no emotional manipulation, evidence-based claims, differentiation between AI-generated and human-verified content.

6. AGENTIC COMMERCE READINESS
Evaluate: structured data completeness (specs, Schema.org), cross-platform consistency, machine readability, third-party verification/certifications, dual-audience design (human + AI agent). Score how well the experience serves algorithmic shopping agents alongside human users.

7. SOCIAL COMMERCE INTEGRATION
Evaluate: TikTok Shop / Instagram Shopping readiness, creator content integration, UGC trust signals, shoppable content, mobile-first discovery patterns, authentic voice, community-driven discovery elements.

8. GEO OPTIMIZATION (Generative Engine Optimization)
Evaluate: FAQ schema, structured response blocks, comparison data, use-case mapping, E-E-A-T signals, internal linking architecture, clinical/test results presentation. Score how well the page feeds AI-generated answers.

CONSTRAINTS:
- Every finding MUST reference at least one screenshot by number (1-indexed).
- Severity scores: exactly 0, 1, 2, 3, or 4. No decimals.
- Confidence: exactly HIGH (clearly visible), MEDIUM (inferred from partial evidence), or LOW (requires live testing).
- Report ALL findings per dimension - do not cap at an arbitrary number. Skip dimensions with 0 findings.
- Each finding title: 5-10 words.
- Each finding description: 1-2 sentences, under 40 words.
- Each finding recommendation: 1 sentence, under 25 words.
- Executive summary: exactly 3 sentences.
- Top issues: exactly 5, sorted by severity descending.
- Only evaluate dimensions listed in the brief's evaluationDimensions array.
- If screenshots show no AI/chatbot interface, skip conversational_ai dimension entirely.
- Do NOT invent findings that are not visible in the screenshots.`;

const USER_PROMPT_TEMPLATE = (brief: UXBrief, screenshotCount: number) => `
Analyze these ${screenshotCount} screenshots of "${brief.productName}" (${brief.experienceType.replace('_', ' ')}).

BRIEF:
- Target audience: ${brief.targetAudience.join(', ')}
- Business goals: ${brief.businessGoals.join(', ')}
${brief.competitiveContext ? `- Competitive context: ${brief.competitiveContext}` : ''}
- Evaluate ONLY these dimensions: ${brief.evaluationDimensions.join(', ')}

Return a JSON object with this exact structure:
{
  "executiveSummary": {
    "overallScore": <0-100, where 100 means no issues found>,
    "totalFindings": <integer>,
    "severityDistribution": {"0": <n>, "1": <n>, "2": <n>, "3": <n>, "4": <n>},
    "topIssues": [<exactly 5 HeuristicFinding objects, severity descending>],
    "summary": "<exactly 3 sentences>"
  },
  "findings": [
    {
      "id": "f1",
      "dimension": "<dimension_id>",
      "screenshotRefs": [<1-indexed numbers>],
      "severity": <0-4>,
      "confidence": "HIGH|MEDIUM|LOW",
      "title": "<5-10 words>",
      "description": "<1-2 sentences, under 40 words>",
      "recommendation": "<1 sentence, under 25 words>",
      "subcategory": "<e.g. Heuristic 4: Consistency or Pattern 2: Guided Narrowing>"
    }
  ]
}`;

// --- ANALYSIS FUNCTION ---

export async function runHeuristicAnalysis(
    brief: UXBrief,
    screenshots: { base64: string; mimeType: string }[],
    modelPreferences?: ModelPreferences
): Promise<HeuristicReport> {
    const prefs = modelPreferences || DEFAULT_MODELS as ModelPreferences;
    const modelId = prefs.vision || DEFAULT_MODELS.vision;

    const userPrompt = USER_PROMPT_TEMPLATE(brief, screenshots.length);

    // Single-pass vision analysis
    const rawResult = await routeVisionAnalysis<{
        executiveSummary: HeuristicExecutiveSummary;
        findings: HeuristicFinding[];
    }>(
        SYSTEM_PROMPT,
        userPrompt,
        screenshots,
        prefs,
        32000,
        0.1
    );

    // Compute dimension scores from findings
    const dimensionMap = new Map<HeuristicDimensionId, { total: number; count: number; critical: number }>();
    for (const f of rawResult.findings) {
        const dim = f.dimension as HeuristicDimensionId;
        if (!dimensionMap.has(dim)) dimensionMap.set(dim, { total: 0, count: 0, critical: 0 });
        const entry = dimensionMap.get(dim)!;
        entry.total += f.severity;
        entry.count += 1;
        if (f.severity >= 3) entry.critical += 1;
    }

    const dimensions: DimensionScore[] = Array.from(dimensionMap.entries()).map(([dim, data]) => ({
        dimension: dim,
        averageSeverity: Math.round((data.total / data.count) * 10) / 10,
        findingCount: data.count,
        criticalCount: data.critical,
    }));

    // Ensure severity distribution has all keys (0-4 fully seeded so the type
    // is a complete Record<SeverityScore, number>, not a partial {}).
    const severityDist: Record<SeverityScore, number> = {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0,
        ...(rawResult.executiveSummary.severityDistribution || {}),
    };

    return {
        brief,
        executiveSummary: {
            ...rawResult.executiveSummary,
            severityDistribution: severityDist,
        },
        dimensions,
        findings: rawResult.findings,
        screenshotCount: screenshots.length,
        modelUsed: modelId,
        analyzedAt: new Date().toISOString(),
    };
}
