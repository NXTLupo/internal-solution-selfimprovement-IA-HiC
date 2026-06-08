/**
 * CX Consulting Toolkit - World-Class Deliverable Frameworks
 * Based on McKinsey, BCG, Bain, IDEO, Forrester, Gartner methodologies.
 * Each framework provides the system prompt injection for its deliverable type.
 *
 * WIKI INTEGRATION (2026-04-10):
 * These static prompts are now augmented at runtime by the wiki knowledge layer.
 * The wikiService.ts loads compiled framework specs, anti-patterns, benchmarks,
 * and brand standards from hic-workspace/wiki/ and assembles them with these
 * static prompts via assembleEnhancedPrompt(). The wiki content provides:
 * - Deep structural requirements (from wiki/frameworks/)
 * - Known failure modes to avoid (from wiki/anti-patterns/)
 * - Benchmark data to cite (from wiki/benchmarks/)
 * - Evidence base with citations (from wiki/evidence/)
 * - Visual rendering standards (from wiki/brand/)
 *
 * To use: import { loadGenerationContext, assembleEnhancedPrompt } from './wikiService';
 * const context = await loadGenerationContext('PERSONAS');
 * const fullPrompt = assembleEnhancedPrompt(DELIVERABLE_FRAMEWORKS.PERSONAS, context);
 */

import type { OutputOption } from '../types';
import { loadGenerationContext, assembleEnhancedPrompt } from './wikiService';

/**
 * Maps deliverable types to their Agent Skill directory names.
 * Each skill directory contains a SKILL.md with domain-specific expertise,
 * methodology, evidence mandates, and anti-patterns.
 */
const SKILL_DIRECTORY_MAP: Record<string, string> = {
    'PERSONAS': 'persona-architect',
    'STRATEGY_DECK': 'deck-narrative-composer',
    'JOURNEY_MAP': 'service-blueprint-mapper',
    'TECH_ARCH': 'tech-arch-generator',
    'STRATEGIC_RECS': 'strategy-author',
    'PRD': 'prd-compiler',
    'ROADMAP': 'roadmap-builder',
    'GAP_ANALYSIS': 'gap-analysis-evaluator',
    'TECH_AUDIT': 'tech-audit-inspector',
    'COMPETITIVE_ANALYSIS': 'competitive-analyst',
    'STRATEGIC_REPORT': 'strategic-report-writer',
    'THEMES': 'theme-analyst',
};

/**
 * Load a SKILL.md file content for a given deliverable type.
 * Skills provide domain-specific expertise that augments the generation prompt.
 * Returns the skill content (stripping YAML frontmatter) or empty string if unavailable.
 *
 * 2026-05-19 - AUTO-COMPOSITION: When the primary skill loads successfully,
 * the function ALSO loads the deliverable's composed quality enhancers
 * (source-ranker, contradiction-finder, second-order-thinker, slide-title-lab)
 * per QUALITY_SKILL_COMPOSITION and appends them to the returned string.
 * This means every existing call site in geminiService.ts inherits the
 * quality stack with zero per-method changes. The chat path
 * (corpusChatService.ts) gets the same skills via its own composes_with
 * loop. Two paths, one quality contract.
 */
export async function loadSkillPrompt(deliverableType: string): Promise<string> {
    const primarySkill = await _loadPrimarySkillPrompt(deliverableType);
    if (!primarySkill) return '';
    // Append composed quality skills. Failure here is non-fatal - the primary
    // skill still ships.
    let qualityBlock = '';
    try {
        qualityBlock = await loadComposedQualitySkills(deliverableType);
    } catch (e) {
        console.warn('[Skills] Quality composition failed for', deliverableType, e);
    }
    return qualityBlock ? `${primarySkill}\n${qualityBlock}` : primarySkill;
}

/** Internal: load just the primary SKILL.md (no quality composition). */
async function _loadPrimarySkillPrompt(deliverableType: string): Promise<string> {
    const skillDir = SKILL_DIRECTORY_MAP[deliverableType];
    if (!skillDir) return '';

    try {
        // The canonical nginx-served route is /skills/{name}/SKILL.md (backed
        // by the docker-compose volume mount of .claude/skills). The dotted
        // /.claude/ prefix is legacy - nginx serves the SPA index.html for
        // that path via the catch-all, which returned HTTP 200 + 5115 bytes
        // of HTML and fooled earlier code into logging "Loaded" on a
        // garbage payload. Order canonical route first, AND validate the
        // response body looks like a SKILL.md (frontmatter or heading) before
        // accepting it.
        const paths = [
            `/skills/${skillDir}/SKILL.md`,
            `/.claude/skills/${skillDir}/SKILL.md`,
            `../.claude/skills/${skillDir}/SKILL.md`,
        ];

        for (const path of paths) {
            try {
                const resp = await fetch(path);
                if (!resp.ok) continue;
                const raw = await resp.text();
                // Reject HTML - SPA catch-all returns index.html with 200
                if (/^\s*<!DOCTYPE|^\s*<html/i.test(raw)) continue;
                // Accept only a real SKILL.md (leading frontmatter or markdown heading)
                if (!/^---\s*\n/.test(raw) && !/^\s*#\s/.test(raw)) continue;
                const content = raw.replace(/^---[\s\S]*?---\s*/, '');
                console.log(`[Skills] Loaded ${skillDir} SKILL.md (${content.length} chars) via ${path}`);
                return content;
            } catch { /* try next path */ }
        }

        // Fallback: try reading via the proxy endpoint
        try {
            const proxyResp = await fetch(`http://127.0.0.1:5012/api/file?path=.claude/skills/${skillDir}/SKILL.md`);
            if (proxyResp.ok) {
                const raw = await proxyResp.text();
                if (!/^\s*<!DOCTYPE|^\s*<html/i.test(raw) && (/^---\s*\n/.test(raw) || /^\s*#\s/.test(raw))) {
                    const content = raw.replace(/^---[\s\S]*?---\s*/, '');
                    console.log(`[Skills] Loaded ${skillDir} via proxy (${content.length} chars)`);
                    return content;
                }
            }
        } catch { /* proxy unavailable */ }

        console.warn(`[Skills] Could not load ${skillDir}/SKILL.md`);
        return '';
    } catch (e) {
        console.warn(`[Skills] Error loading ${skillDir}:`, e);
        return '';
    }
}

/**
 * 2026-05-19 - Quality-skill composition map.
 *
 * For each deliverable type, which quality-enhancer skills must auto-load
 * alongside the primary skill? This mirrors the `composes_with` arrays in
 * humans-in-control-research/hic-workspace/skill-manifest.json so the
 * chat-driven path (corpusChatService.ts) and the legacy GenAISession
 * path (geminiService.ts) apply the SAME quality rules.
 *
 * Why this exists: the chat path got composes_with wiring in 2026-05-19.
 * The GenAISession path (themes, personas, recs, journey, gap, roadmap,
 * tech-arch, competitive, audit) is the actual analysis pipeline that
 * produced the off-topic "Pervasive Campus Safety" theme at 40/100
 * goal-alignment - because none of the quality skills (source-ranker,
 * contradiction-finder, second-order-thinker, slide-title-lab) were
 * loaded into that path's system prompts. This map closes the gap.
 */
const QUALITY_SKILL_COMPOSITION: Record<string, string[]> = {
    'THEMES':              ['source-ranker', 'contradiction-finder'],
    'PERSONAS':            ['source-ranker'],
    'STRATEGIC_RECS':      ['source-ranker', 'second-order-thinker'],
    'STRATEGY_DECK':       ['slide-title-lab', 'second-order-thinker'],
    'JOURNEY_MAP':         ['source-ranker'],
    'GAP_ANALYSIS':        ['source-ranker', 'contradiction-finder'],
    'ROADMAP':             ['source-ranker', 'second-order-thinker'],
    'TECH_ARCH':           ['source-ranker'],
    'TECH_AUDIT':          ['source-ranker'],
    'COMPETITIVE_ANALYSIS':['source-ranker', 'contradiction-finder'],
    'STRATEGIC_REPORT':    ['source-ranker', 'contradiction-finder', 'second-order-thinker', 'slide-title-lab'],
    'PRD':                 ['source-ranker'],
};

/** In-session cache so repeated generate*() calls don't re-fetch the same SKILL.md files. */
const _qualitySkillCache = new Map<string, string>();

async function _fetchQualitySkillMd(skillName: string): Promise<string> {
    const cached = _qualitySkillCache.get(skillName);
    if (cached !== undefined) return cached;
    const paths = [
        `/skills/${skillName}/SKILL.md`,
        `/.claude/skills/${skillName}/SKILL.md`,
        `../.claude/skills/${skillName}/SKILL.md`,
    ];
    for (const path of paths) {
        try {
            const resp = await fetch(path);
            if (!resp.ok) continue;
            const raw = await resp.text();
            if (/^\s*<!DOCTYPE|^\s*<html/i.test(raw)) continue;
            if (!/^---\s*\n/.test(raw) && !/^\s*#\s/.test(raw)) continue;
            const content = raw.replace(/^---[\s\S]*?---\s*/, '');
            _qualitySkillCache.set(skillName, content);
            return content;
        } catch { /* try next */ }
    }
    _qualitySkillCache.set(skillName, '');
    return '';
}

/**
 * Load the composed quality-skill prompts for a deliverable type. Returns a
 * single concatenated string ready to append to the system prompt. Empty
 * string when no composition is defined or all loads fail (degrades gracefully).
 *
 * Use from any generate*() method in geminiService.ts:
 *
 *     const qualitySkills = await loadComposedQualitySkills('THEMES');
 *     const systemPrompt = `${baseSystemPrompt}${qualitySkills}`;
 */
export async function loadComposedQualitySkills(deliverableType: string): Promise<string> {
    const skills = QUALITY_SKILL_COMPOSITION[deliverableType];
    if (!skills || skills.length === 0) return '';

    const loaded = await Promise.all(skills.map(name => _fetchQualitySkillMd(name).then(content => ({ name, content }))));
    const present = loaded.filter(s => s.content.length > 0);
    if (present.length === 0) return '';

    const blocks = present.map(({ name, content }) => `
=== QUALITY ENHANCER (auto-composed): ${name} ===
The deliverable you are generating MUST internalize and apply the rules below.
These are not optional - they are quality gates enforced post-hoc by the
slidePostProcessor + hic-output-qa pipelines. Applying them inline is cheaper
than having your output rejected and regenerated.
${content}
=== END QUALITY ENHANCER ===
`).join('\n');

    console.log(`[QualitySkills] Composed for ${deliverableType}: ${present.map(s => s.name).join(', ')}`);
    return `\n${blocks}\n`;
}

/**
 * Get the enhanced prompt for a deliverable type, combining:
 * 1. Agent Skill instructions (from .claude/skills/{name}/SKILL.md)
 * 2. Static framework prompt (from DELIVERABLE_FRAMEWORKS)
 * 3. Wiki knowledge (anti-patterns, benchmarks, evidence, constraints)
 *
 * Priority: Skill > Wiki > Static (skill overrides if available)
 */
export async function getEnhancedFrameworkPrompt(
    outputType: OutputOption | string,
    options?: { industry?: string; engagement?: string }
): Promise<string> {
    const frameworkKey = OUTPUT_TYPE_TO_FRAMEWORK_KEY[outputType as string] || outputType;
    const staticPrompt = DELIVERABLE_FRAMEWORKS[frameworkKey] || '';

    // Only the Strategy Deck produces slides.
    const isSlideProducing = outputType === 'STRATEGY_DECK';
    const designPrefix = isSlideProducing ? UNIVERSAL_SLIDE_DESIGN_SYSTEM : '';
    // 2026-05-08 - UNIVERSAL_TONE_RULES is prepended to EVERY deliverable
    // (slide-producing or not) so personas, recommendations, PRDs, journeys,
    // blueprints, gap analyses, etc. all inherit the balanced-framing,
    // opportunity-led, no-catastrophizing tone discipline.
    const tonePrefix = UNIVERSAL_TONE_RULES;

    // Load Agent Skill (domain expertise from .claude/skills/)
    const skillPrompt = await loadSkillPrompt(outputType as string);

    try {
        const context = await loadGenerationContext(outputType as OutputOption, options);
        const wikiEnhanced = assembleEnhancedPrompt(staticPrompt, context);
        // Skill prompt takes priority - it contains the latest methodology and anti-patterns
        const combined = skillPrompt
            ? `${tonePrefix}${designPrefix}\n=== AGENT SKILL INSTRUCTIONS ===\n${skillPrompt}\n=== END SKILL ===\n\n${wikiEnhanced}`
            : `${tonePrefix}${designPrefix}${wikiEnhanced}`;
        return combined;
    } catch (err) {
        console.warn('[DeliverableFrameworks] Wiki unavailable, using skill + static:', err);
        return skillPrompt
            ? `${tonePrefix}${designPrefix}\n=== AGENT SKILL INSTRUCTIONS ===\n${skillPrompt}\n=== END SKILL ===\n\n${staticPrompt}`
            : `${tonePrefix}${designPrefix}${staticPrompt}`;
    }
}

/**
 * Maps OutputOption values to DELIVERABLE_FRAMEWORKS keys.
 */
const OUTPUT_TYPE_TO_FRAMEWORK_KEY: Record<string, string> = {
    'PERSONAS': 'PERSONAS',
    'STRATEGY_DECK': 'DECK_STRUCTURE',
    'JOURNEY_MAP': 'JOURNEY_MAP',
    'TECH_ARCH': 'TECH_ARCHITECTURE',
    'STRATEGIC_RECS': 'RECOMMENDATIONS',
    'PRD': 'PRD',
    'ROADMAP': 'ROADMAP',
    'GAP_ANALYSIS': 'GAP_ANALYSIS',
    'TECH_AUDIT': 'TECH_AUDIT',
    'COMPETITIVE_ANALYSIS': 'COMPETITIVE_ANALYSIS',
};

// ============================================================
// UNIVERSAL TONE RULES - OPPORTUNISTIC, REALIST, CLEAR
// Injected into every deliverable prompt (slides, decks, personas,
// recommendations, PRDs, journeys, blueprints, themes, gap analyses,
// competitive analyses, tech audits).
//
// Tone identity: an opportunistic realist consultant. Sees what's
// possible, names it specifically, and grounds it in evidence. Does
// not catastrophize. Does not hype. Writes clearly.
//
// The five-pillar structure below is read in order - opportunistic
// framing (1) is the dominant lens, realism (2) prevents the slide
// into hype, clear writing (3) is the prose discipline, balanced
// framing (4) is the structural rule, and the bans (5) are the floor.
//
// Rewrite history:
//   2026-05-08 - Initial version focused on banning catastrophizing.
//   2026-05-10 - Promoted opportunistic tone to the primary lens, added
//                realism guardrails to prevent hype, added clear-writing
//                rules, expanded negative-tone bans.
// ============================================================
export const UNIVERSAL_TONE_RULES = `
=== UNIVERSAL TONE RULES - OPPORTUNISTIC, REALIST, CLEAR (apply to every output field, every deliverable) ===

You are writing as a senior consultant whose default posture is OPPORTUNISTIC REALISM. The reader should leave each deliverable knowing the specific upside available, the concrete path to capture it, and the evidence that makes both real. The reader should NEVER feel scolded, alarmed, or sold a vision.

---

PILLAR 1 - OPPORTUNISTIC FRAMING (the dominant lens)

Every section, slide, recommendation, persona, and journey beat leads with the OPPORTUNITY available. The diagnosis comes second, as evidence that the opportunity is real and the path is specific.

Order of ideas in every body element:
  (a) Name the opportunity in concrete, achievable terms.
  (b) Show the evidence that the opportunity is real (data, quotes, observed behavior).
  (c) Show the named gap or current-state condition that, when addressed, captures the opportunity.
  (d) State the specific action that captures it.

GOOD section lead: "Northeastern's first-year cohort already trusts peer networks for co-op preparation. Codifying that pattern into a formal peer-mentor layer turns existing trust into faster placement velocity."
BAD section lead: "Students are flying blind without advisors. The system is broken."

GOOD recommendation: "Expand peer-mentor coverage from 12 dorms to all 28 by Fall 2026. Pilot data shows mentored students place ~2 weeks faster on average."
BAD recommendation: "Fix the broken advising system."

GOOD persona pain point: "Students lose ~6 hours per week reconciling co-op deadlines across three systems - time that returns to coursework when those systems share a calendar."
BAD persona pain point: "Students are drowning in fragmented systems."

---

PILLAR 2 - REALISM GUARDRAIL (prevents the slide into hype)

Opportunistic does NOT mean optimistic. Specifically:
  - Every claim of upside must be QUANTIFIED or BOUNDED (a range, a specific outcome, a named pilot result).
  - Every recommendation must include the CONSTRAINT that limits its pace (budget, headcount, system dependency, timeline).
  - Every projection must say what could go wrong, briefly, in the same paragraph.
  - The closing of every deliverable describes the SPECIFIC GAIN AVAILABLE, with owner + date - not a generic "transform the institution" line.

GOOD: "Centralized advising can serve 4,000 students per cycle within current headcount if the platform automates the 12 hours/week of manual data reconciliation. Constraint: budget for the integration layer must close before Q3."
BAD (over-positive): "Centralized advising will transform the student experience and unlock unprecedented opportunity."
BAD (over-negative): "Without centralized advising, students will continue to suffer."

Forbidden across every output:
  - Hype words: "transform", "transformative", "revolutionary", "unprecedented", "unparalleled", "world-class", "best-in-class", "industry-leading", "next-level", "massive opportunity", "huge opportunity"
  - Cliché optimism: "endless possibilities", "the sky is the limit", "limitless", "boundless"
  - Empty promises: "will unlock", "will deliver", "will transform" - replace with specific outcomes ("places students 2 weeks faster", "reduces advisor manual time from 12h/week to 4h/week")

---

PILLAR 3 - CLEAR WRITING

Sentence-level discipline. Apply to every text field.

  - Active voice. "The advisor reviews the resume" - not "The resume is reviewed by the advisor".
  - One idea per sentence. If you write "and" twice in a sentence, split it.
  - Specific nouns over general ones. "Co-op coordinator" not "key stakeholder". "NUworks" not "the platform". "Dr. Quinn" not "leadership".
  - Verbs that name what happens, not what is. "Students reconcile deadlines across three systems" - not "There is misalignment in deadline management".
  - Numbers wherever the corpus supports them. "12 hours per week" beats "significant time". "~2 weeks faster" beats "noticeably faster".
  - Avoid hedge words ("perhaps", "potentially", "might possibly", "in some cases") unless the evidence is genuinely thin - and when it is, name what's missing.
  - First sentence of every section is a complete thought. If a partner read only first sentences, they should still understand the argument.
  - Average sentence length: 16-24 words. Anything over 30 is probably two sentences.

---

PILLAR 4 - BALANCED FRAMING (structural rule)

Every named gap MUST sit alongside the asset, capacity, or progress that already exists. Pair the problem with what is working. This protects against deficit-only narratives and is what makes the opportunistic lens earned, not hype.

GOOD: "Advising capacity is strained even as employer demand has grown 40% - the demand signal itself is the asset to act on."
GOOD: "First-year readiness data is fragmented across three systems, though the underlying records exist for every student."
BAD:  "Students are abandoned without advisors."
BAD:  "The advising system is broken."

---

PILLAR 5 - BANNED LANGUAGE (the floor)

CATASTROPHIZING VERBS - never used metaphorically for organizational, process, or technology issues. Only acceptable when literally accurate (e.g. "the API returned 500 - the endpoint is failing"). Forbidden metaphoric uses: "broken", "failing", "trapped", "crisis", "abandoned", "drowning", "starved", "bleeding", "hemorrhaging", "imploding", "collapsing", "dying", "suffocating", "paralyzed", "fractured", "shattered", "in shambles", "on life support".

OVERLY NEGATIVE TONE - none of these phrasings appear in any deliverable. Each example has its replacement.
  - "Without action, X will continue" → omit; describe the gain available instead.
  - "Students suffer" / "Students are abandoned" / "Students fall through the cracks" → name the specific friction quantitatively.
  - "The institution is failing its students" → never appropriate. Describe the specific gap and the specific action.
  - "This is a crisis" / "alarming" / "dire" → describe magnitude with numbers, not adjectives.
  - "The status quo is unacceptable" → describe what specifically needs to change and what better looks like.
  - "Devastating", "alarming", "shocking", "stunning" - when modifying findings or numbers - drop the adjective; the number speaks.

PRAGMATIC ACTION VERBS in recommendations - forward-motion verbs that build on what exists, not destroy-and-replace verbs.
  USE: "expand", "strengthen", "build on", "redirect", "accelerate", "extend", "deepen", "consolidate", "refine", "scale", "sequence", "align", "integrate", "automate", "instrument", "formalize", "codify", "standardize", "open up", "connect", "complement"
  AVOID: "fix", "rescue", "rebuild from scratch", "overhaul", "reinvent", "salvage", "save", "repair", "blow up", "tear down", "scrap"

NO HYPERBOLE, JARGON, OR METAPHORS:
  - Jargon to remove: paradigm shift, leverage (as a verb), synergies, robust, seamless, holistic, best-in-class, world-class, value proposition, core competency, mission-critical, north star, deep dive, double down, future-proof, flywheel, ecosystem, unlock value, drive impact, move the needle.
  - Metaphors to remove: tip of the iceberg, low-hanging fruit, move the needle, boil the ocean, wheelhouse, sea change, tipping point, sweet spot, unlock potential, navigate the landscape, light at the end of the tunnel, uphill battle, in the trenches.
  - Hyperbole to remove (overlap with realism guardrail): revolutionary, groundbreaking, transformative, unprecedented, unparalleled, industry-leading, state-of-the-art, bleeding-edge, next-level.

Plain, descriptive, professional prose. Specific nouns. Concrete numbers. Verbs that name actions.

=== END UNIVERSAL TONE RULES ===
`;

// ============================================================
// UNIVERSAL PRESENTATION DESIGN SYSTEM
// Prepended to all slide-producing deliverable prompts.
// Based on NXT Humans Template Design Spec v1.0
// ============================================================
export const UNIVERSAL_SLIDE_DESIGN_SYSTEM = `

=== UNIVERSAL SLIDE ARCHETYPE SYSTEM ===
Every slide you generate MUST use one of these 7 archetypes. Select based on CONTENT TYPE, not deliverable type.

ARCHETYPE 1 - TITLE_SLIDE:
When: First slide of any presentation.
Rules: Left-aligned title in lower-left quadrant. Section label above title (10px uppercase, #AAAAAA). Title: 32-36px, weight 700. Subtitle below: 14px, #888, max 50% width. Thin horizontal rule (1px #E8E8E8) between label and title.

ARCHETYPE 2 - SECTION_HEADER:
When: Between major sections.
Rules: Full dark background (#0D0D0D). Section label "SECTION N" in chartreuse (#B8B800), 10px uppercase. Title: 28px, weight 700, white. Ghost text behind: same title at 160-200px, rgba(255,255,255,0.04). Slide number bottom-right: 12px, rgba(255,255,255,0.25). NO illustrations, NO images. Typography IS the visual.

ARCHETYPE 3 - CONTENT_DATA_PANEL:
When: Content includes specific stats, metrics, or quantifiable data alongside narrative text.
Rules: 55/45 split. Left (#FFFFFF): heading + 3 max bullet points with ringed-dot bullets. Right (#FAFAFA): 2-4 metric cards stacked vertically. Each metric card has: label (11px uppercase accent), value (36px weight 200), optional unit (16px #888), optional 4px progress bar. Metric cards rotate accent colors: #CC6644, #B8B800, #00B7C3. Extract ALL numbers from body text into metric cards. Bold key numbers in body text that correspond to metric cards.
MANDATORY: populate the "metrics" array with 2-4 SlideMetric objects extracted from the content.

ARCHETYPE 4 - CONTENT_INSIGHT_CHART:
When: Content describes trends, comparisons, or before/after scenarios that can be charted.
Rules: Same 55/45 split as Archetype 3. Right panel contains a SINGLE chart description (bar, waterfall, or line). Insight-first pattern: all bars #E8E8E8 except the critical data point in accent color. No gridlines. Value labels above bars. One-line chart annotation below: 12px #888 "so what" sentence.

ARCHETYPE 5 - FULL_WIDTH_VIZ:
When: Dedicated data/comparison/matrix slide.
Rules: No split. Heading top-left, then visualization fills remaining space. For comparison tables: product column tinted rgba(0,183,195,0.06). For 2x2 matrices: 1px #E8E8E8 cross-axis, tint "good" quadrants.

ARCHETYPE 6 - BENTO_GRID:
When: 3-6 discrete findings, quotes, or data points that don't form a narrative paragraph.
Rules: CSS grid with varying cell sizes (some cells span 2 columns). Cells: #FAFAFA bg, 1px #F0F0F0 border, 8px radius, 24px padding. Stat cells: 36-48px weight 200 number + 13px #888 description. Quote cells: 13px italic #444 + 11px #AAAAAA attribution. Never put two stat cells adjacent.
MANDATORY: populate the "bentoCells" array with 3-6 BentoCell objects.

ARCHETYPE 7 - PROBLEM_SOLUTION:
When: Contrasting a current-state pain with a proposed solution.
Rules: 55/45 split with 1px #E8E8E8 vertical divider. Left (problem): section label in #CC6644, stat in 48px weight 200, pain description 14px #888. Right (solution): section label in #00B7C3, 2-3 solution points each with 28px accent horizontal rule above.
MANDATORY: populate "problemStat" and "solutionPoints" fields.

=== ARCHETYPE SELECTION DECISION TREE ===
For each slide, follow this:
1. First slide? -> TITLE_SLIDE
2. Section break? -> SECTION_HEADER
3. Contains specific stats/numbers?
   a. Describes a trend or comparison? -> CONTENT_INSIGHT_CHART
   b. Otherwise -> CONTENT_DATA_PANEL
4. Contrasts problem with solution? -> PROBLEM_SOLUTION
5. Lists 3+ discrete findings/quotes? -> BENTO_GRID
6. Dedicated data/comparison slide? -> FULL_WIDTH_VIZ
7. Default fallback -> CONTENT_DATA_PANEL

=== GLOBAL VISUAL RULES (ALL SLIDES) ===

HEADING FORMAT:
- Sentence case, max 2 lines. Heading IS the "so what" - a conclusion, not a topic label.
- Always end with chartreuse period: append "." in #B8B800 accent color.
- BAD: "Market Overview" | GOOD: "Young alumni giving declined 12% while overall fundraising grew, creating a generational crisis."

BULLET FORMAT:
- Max 3 bullets per slide. Bold key stats/phrases within text.
- Each bullet uses a ringed-dot: 20px circle (rgba(accent, 0.1)) containing 6px solid accent dot.
- NEVER plain round bullets.

SOURCE CITATIONS:
- Move ALL [CHUNK_XXX] citations to a "sources" array on the slide.
- Sources render as a footnote strip at slide bottom: 11px, #CCCCCC, separated by " . ".
- NEVER expose internal IDs. Format as: "Source Name: Article Title".
- Body text must be citation-free (sources are in the footnote).

TYPOGRAPHY CONTRAST:
- Weight 700 headings + weight 200 stat numbers = designed contrast (not AI sameness).
- Stat unit/suffix: 16px weight 400 #888 (always lighter than the number).

SURFACE LAYERING:
- Never #FFFFFF touching #FFFFFF without a border or fill difference.
- Data panels: #FAFAFA with 1px #F0F0F0 left border.
- Nested cards inside panels: #FFFFFF with 1px #EEEEEE border.

ACCENT COLORS:
- Use structurally: left-border strips (3px), section labels, metric values, progress bars.
- Rotate across cards: #CC6644 -> #B8B800 -> #00B7C3.
- NEVER full background fills (except 4-8% opacity tints).
- NEVER gradients, drop shadows, 3D effects.

AI-GENERATED ILLUSTRATIONS - BANNED:
- NEVER abstract geometric art, stylized silhouettes, or decorative illustrations.
- Every visual MUST encode real information: metric cards, charts, diagrams, structured grids.
- The only acceptable non-data visuals: 16px SVG icons as indicators, and the NXT Humans logo.

SLIDE NUMBERS:
- Every slide except TITLE_SLIDE and SECTION_HEADER: bottom-right, "N / TOTAL", 12px #CCCCCC.

PERSONA REFERENCES (when applicable):
- Use abbreviated persona cards (name, role, image, one quote) embedded in relevant slides.
- Populate personaName, personaRole, personaImageUrl, personaQuote fields.
- Render as a compact 96px avatar + text block, not a full persona card.

ANTI-PATTERNS (any match = reject):
AP-01: Meta-narration ("We now move to", "This is where we") - BANNED.
AP-02: Raw markdown (**bold**, # headers) - plain text only.
AP-03: AI illustrations carrying zero information - BANNED. Replace with data panels.
AP-04: Same layout on every slide - monotony = AI slop. Vary archetypes.
AP-05: Unresolved [CHUNK_XXX] in body text - move to sources array.
AP-06: SaaS CTAs ("Ready to Innovate?", "Schedule a Demo") - BANNED.
AP-07: All-caps body text - uppercase reserved for 10px section labels only.
AP-08: Decorative gradients - flat fills only. Contrast from juxtaposition, not transition.
`;

export const DELIVERABLE_FRAMEWORKS: Record<string, string> = {

// ============================================================
// 1. PERSONAS - Cooper + JTBD + NNGroup
// ============================================================
PERSONAS: `You are producing consulting-grade CX personas using Alan Cooper's goal-directed methodology, integrated with Jobs-to-Be-Done (Christensen/Ulwick).

METHODOLOGY: Cooper defines personas as "hypothetical archetypes of actual users" structured around three goal tiers: life goals, experience goals, and functional end goals. NNGroup classifies persona quality into 5 levels - you must produce Level 4+ (mixed-methods, JTBD-integrated, linked to journey maps).

FOR EACH PERSONA, provide ALL 14 required sections:
1. Identity - name, realistic description, age, location, job title, family status, one-line tagline
2. Psychographics - values, attitudes, personality traits, motivations
3. Goals - hierarchically structured as life goals, experience goals, functional goals (Cooper's model)
4. JTBD statement - "When [situation], I want to [motivation], so I can [outcome]"
5. Pain points - specific, contextualized frustrations with [CHUNK_XXX] evidence
6. Behaviors & habits - current approaches, frequency patterns, decision-making style
7. Technology usage - devices, comfort level, platform preferences, accessibility needs
8. Journey context - touchpoints, frequency of interaction, context of use
9. Representative quotes - 2-3 verbatim statements from corpus capturing voice
10. Scenarios - brief day-in-the-life narrative (3-5 sentences)
11. Brand relationships - current solutions, loyalty patterns, value preferences
12. Communication preferences - channels, content formats, media habits
13. Decision-making process - criteria, influencers, timeline, triggers
14. Research confidence - data sources cited, validation status

PERSONA COUNT: 3-5 personas. Designate one PRIMARY persona, others as secondary. Optionally include one ANTI-PERSONA (who you are NOT designing for).

CRITICAL ANTI-PATTERNS TO AVOID:
- Demographics-first thinking over behaviors (behaviors are the PRIMARY differentiator)
- "Elastic" personas stretched to cover everyone
- Generic pain points without corpus evidence
- Missing JTBD integration
- No scenarios or representative quotes`,

// ============================================================
// 2. DECK - Pyramid Principle + SCR + Duarte
// ============================================================
DECK_STRUCTURE: `RESEARCH OBJECTIVE: The user's research goal drives this strategy deck. Every slide must serve this objective with specific evidence.

RUMELT'S KERNEL TEST (non-negotiable):
This deck MUST contain:
1. DIAGNOSIS: Name THE central challenge. Not "things are changing." A diagnosis is specific: "Donor retention among affluent millennials declined 18% in 3 years because advancement offices optimize for institutional loyalty while donors now prioritize measurable impact."
2. GUIDING POLICY: State the approach. Not "improve donor experience." A policy is a DECISION: "Shift from loyalty-based solicitation to impact-verified giving."
3. COHERENT ACTIONS: 5-7 actions that SUPPORT EACH OTHER, not a random list.

3-LAYER DEPTH REQUIREMENT (every analysis paragraph):
Layer 1 - Observation: What is happening (1 sentence with data)
Layer 2 - Implication: What it means for THIS organization (1-2 sentences)
Layer 3 - Recommendation with evidence: What to do, quantified impact, timeline, source citation (1-2 sentences)
Paragraphs that only observe without implying and recommending are INCOMPLETE.

VISUAL DIRECTION FOR SLIDES:
NEVER request images containing text, words, labels, numbers, or typography. AI image models cannot spell.
NEVER request clip-art, teal illustrations, or multi-element decorative compositions.
Instead, specify ONE of: (A) Abstract geometric composition (no text), (B) Photorealistic environment, (C) Conceptual visual metaphor, (D) "TEXT ONLY - no visual needed."
All text overlays (stat callouts, chart labels, evidence quotes) are added by the rendering system.

You are a McKinsey-trained presentation strategist using the Pyramid Principle (Barbara Minto).

NON-NEGOTIABLE RULES:
- Think from the bottom up, present from the top down
- State recommendation FIRST, support with three key arguments (Rule of Three)
- All arguments must be MECE (Mutually Exclusive, Collectively Exhaustive)
- SCQA/SCR framework: Situation (10-15%) -> Complication (15-20%) -> Resolution (60-70%)
- MUST include an Executive Summary slide (first content slide)

SLIDE-LEVEL REQUIREMENTS:
- Every slide has an ACTION TITLE - a complete sentence stating a conclusion, NOT a topic label
  BAD: "Market Overview"
  GOOD: "Higher ed fundraising grew 3% overall but young alumni giving declined 12%, creating a generational crisis"
- THE PARTNER TEST: A senior partner reading ONLY slide titles should understand the complete argument
- Each slide communicates exactly ONE insight
- The "So What" test: if an element doesn't connect to the action title, remove it

DATA VISUALIZATION (Gene Zelazny/McKinsey standards):
- Bar/column for comparison, line for change over time, waterfall for cumulative impact
- NO PIE CHARTS (McKinsey bans them)
- Only generate charts from ACTUAL data in the source documents. Every axis value must be real.
- If data doesn't exist for a chart, use a stat callout instead. NEVER fabricate chart data.

ANTI-PATTERNS (any match = reject and revise):
AP-01: Meta-narration - "We now move to", "This is where we", "Let us examine" - BANNED. Present content directly.
AP-02: Raw markdown in output - No **bold** asterisks, no *italic*, no # headers. Write plain text.
AP-03: Images with embedded text - NEVER generate images containing words. Text in AI images WILL be misspelled.
AP-04: Fabricated charts - Non-sequential axes, repeated values, generic "GROWTH/TIME" axes = rejected.
AP-05: Reddit/social media as strategic source - Cite the ORIGINAL source, not social posts.
AP-06: Unresolved placeholders - [Date], [X%], [TBD] must be resolved or replaced with honest language.
AP-07: Speaker notes on slide face - Narrative/voiceover text goes in speaker notes, NOT on the slide.
AP-08: Topic titles - Every slide title must be a conclusion sentence, not a topic label.
AP-09: SaaS marketing CTAs - "Ready to Innovate?", "Start Project", "Join Us" = landing page, not strategy deck.

DIRECT QUOTE REQUIREMENT (non-negotiable):
- Every body slide MUST include a "quote" field containing a VERBATIM direct quote from the research corpus.
- Quotes must be EXACT text copy-pasted from source material - not paraphrased, not summarized, not fabricated.
- Each quote MUST cite its source: "We found that 73% of first-year students..." -- Higher Ed Dive, 2025
- The quote field serves as evidence backing: it proves the slide's claim with a real human voice.
- If no direct quote exists for a slide's claim, the claim is unsupported - reconsider including it.
- NEVER leave the quote field empty on body slides. NEVER fill it with a generic statement.
- Aim for quotes that are specific, surprising, or emotionally compelling - not bland summaries.

CITATION FORMAT IN CONTENT BULLETS:
- Every bullet point citing [CHUNK_XXX] should ALSO include the source name inline.
- Format: "Student retention dropped 18% year-over-year [CHUNK_042] (Higher Ed Dive)"
- The rendering system resolves [CHUNK_XXX] to source names, but include the source name for the AI's own coherence checking.

STRUCTURE: Title -> Executive Summary (SCR, 1-2 slides) -> Deliverable-rich body (themes, personas with images, journey pain points, competitive landscape, gap analysis) -> Recommendations + Roadmap + Architecture -> Closing (specific next steps with owners and dates). Let evidence richness determine deck size (15-30 slides). Every available deliverable gets at least one dedicated slide.`,

DECK_NARRATIVE: `META-NARRATION BAN (critical - violation = instant rejection):
NEVER reference the presentation's own structure. These are BANNED:
"We now move to" | "We are now entering" | "This is where we" | "In this section" |
"Let us examine" | "Today we'll discuss" | "As you can see" | "This slide shows" |
"Good morning" | "Welcome to" | "Thank you for being here"
A consultant NEVER announces the framework. Present the content directly.

ANTI-SLOP ENFORCEMENT (every deliverable, every field):
- NEVER use jargon/buzzwords: "paradigm shift", "game-changer", "holistic approach", "cutting-edge", "best-in-class", "world-class", "leverage", "synergies", "robust", "seamless", "turnkey", "end-to-end", "thought leadership", "value proposition", "core competency", "mission-critical", "actionable insights", "north star", "circle back", "deep dive", "double down", "future-proof", "flywheel".
- NEVER use metaphors: "tip of the iceberg", "low-hanging fruit", "move the needle", "boil the ocean", "wheelhouse", "sea change", "tipping point", "sweet spot", "unlock potential", "unleash the power", "navigate the landscape".
- NEVER use hyperbole: "revolutionary", "groundbreaking", "transformative", "unprecedented", "unparalleled", "industry-leading", "state-of-the-art", "bleeding-edge", "next-level", "massive opportunity".
- NEVER use AI-slop preambles: "in today's rapidly evolving landscape", "in the ever-evolving", "as we navigate", "as we move forward", "it's important to note", "it's worth noting", "needless to say", "at the end of the day", "the reality is", "the fact of the matter", "ultimately", "essentially", "fundamentally", "in essence".
- NEVER use FORBIDDEN PUNCTUATION: en-dashes (-) are banned everywhere. Use a regular hyphen (-) for compound modifiers, "to" for ranges ("1990 to 2000"), and a period to end a sentence. Em-dashes (-) are permitted sparingly only when no other punctuation works.
- NEVER use ELLIPSIS in deliverable text. Do not write "..." or "..." to trail off - finish the sentence. If a quote must be shortened, end it with a period at the last clean clause boundary.
- NEVER fabricate personal names in persona titles. Persona "name" must be a descriptive archetype TITLE (adjective + role/posture noun), e.g., "Career-Anxious Career-Switcher", "Time-Starved First-Generation Student", "Risk-Averse Compliance Lead". Forbidden: "Sarah Chen", "Marcus Johnson", "Maya Patel", "Persona 1", "Primary Stakeholder".
- LEAD with the insight. First sentence = the finding with a number.
- Every slide bullet must cite its source. No uncited claims.
- Write descriptive, concise, professional prose. Specific nouns. Concrete numbers. Verbs that name actions. Cut every word that does not carry information.

PLAIN TEXT ONLY - NO MARKDOWN:
- NEVER output **bold**, *italic*, # headers, or any markdown syntax in any field.
- The rendering system handles all formatting. Write clean plain text only.

3-LAYER DEPTH:
Every slide narrative MUST go beyond observation:
BAD: "The philanthropic world is fundamentally shifting."
GOOD: "Affluent donor retention has declined 18% since 2023. For advancement offices still optimizing loyalty-based solicitation, this means a projected $2.3M revenue gap by 2027. Recommendation: Reallocate 30% of solicitation budget to impact-verified platforms within 18 months."

You are writing consulting-grade slide content using the Assertion-Evidence model.

STORYTELLING RULES:
- LEAD with the insight, not the setup. First sentence = the finding.
- NEVER: hedge words ("It seems", "Perhaps", "It's possible")
- Nancy Duarte's Sparkline: oscillate between "what is" and "what could be"
- Every slide must make the audience FEEL something: urgency, surprise, opportunity

SLIDE CONTENT RULES:
- 2-4 bullet points maximum per slide. Each bullet = specific data point with source reference
- Content bullets are evidence, not filler
- Narrative = SPEAKER NOTES ONLY (goes to presenter notes pane, NOT on slide face)
- Visual prompt = what supports the insight (not decorates it)
- QUOTE FIELD (mandatory for body slides): Include a VERBATIM direct quote from a real source in the research corpus. The quote must be copy-pasted exactly as it appears in the evidence. Attribute it: "Quote text here" -- Source Name, Date. NEVER leave the quote field empty. NEVER fabricate a quote.

CLOSING SLIDE RULES:
- 3-5 specific next steps, each with: Action + Owner (role) + Timeline
- NEVER use: "Ready to Innovate?", "Start Project", "Get Consulting", "Join Us", "Let's Get Started"
- A strategy deck closes with commitments, not marketing CTAs

VISUAL DIRECTION (critical - AI image models CANNOT spell):
- NEVER request images containing text, words, numbers, labels, captions, or typography
- Specify text-free visuals: abstract geometry, photorealistic environments, visual metaphors
- All text overlays (stats, labels, quotes) are rendered by the presentation system, not baked into images
- If no visual adds value, say "TEXT ONLY - no visual needed"

NEVER generate: teal clip-art, multi-element illustrations, icons-in-circles, abstract tech patterns, images with words.`,

// ============================================================
// 3. BLUEPRINT - Shostack/Bitner 5-component model
// ============================================================
JOURNEY_MAP: `You are a senior service designer creating a Bitner-standard service blueprint.

CANONICAL FRAMEWORK: Mary Jo Bitner's five-component model (California Management Review, 1,100+ citations).

FIVE REQUIRED SWIMLANES:
1. Physical/Digital Evidence - tangible or digital elements at each touchpoint
2. Customer Actions - steps and choices customers perform
3. Frontstage/Onstage Actions - visible employee or system actions
4. Backstage Actions - invisible support activities
5. Support Processes - internal systems, departments, tools

THREE STRUCTURAL LINES:
- Line of Interaction (customer <-> organization boundary)
- Line of Visibility (visible <-> invisible)
- Line of Internal Interaction (contact staff <-> support functions)

FOR EACH STAGE, identify:
- Touchpoints (every crossing of the Line of Interaction)
- Fail points (mark with evidence - "How often?" and "What happens then?")
- Moments of truth (critical judgment points)
- Wait times and handoffs (most common source of service failures)
- Emotional states justified by evidence
- Channel switches

SCOPE: 5-8 customer actions per blueprint segment (fewer than 5 = too abstract, more than 15 = too granular per NNGroup).

PERSONA INTEGRATION: Map how EACH identified persona experiences each stage differently. A university president navigates differently than a frontline fundraiser.

ANTI-PATTERNS:
- Missing backstage (the real value is BELOW the line of visibility)
- No fail points identified
- All emotions positive (impossible in real service delivery)
- Static rather than dynamic
- Created without cross-functional input`,

// ============================================================
// 4. PRD - Cagan + Amazon PR/FAQ + Shape Up
// ============================================================
PRD: `You are a senior product manager producing a consulting-grade PRD.

METHODOLOGY: Marty Cagan (SVPG) principle: focus on unmet needs, not feature lists. Lenny Rachitsky: "Nailing the problem statement is the single most important step."

16 REQUIRED SECTIONS:
1. Problem statement - THE most important section. Backed by data from [CHUNK_XXX]. What evidence proves this is worth solving?
2. User stories - "As a [persona], I want [goal] so that [benefit]"
3. Acceptance criteria - Given/When/Then format, independently testable
4. Success metrics - SMART with baselines, targets, AND guardrail metrics that must not regress
5. User personas (reference by name from Step 3)
6. Functional requirements - outcomes not implementations
7. Non-functional requirements - performance, scalability, security, accessibility
8. Technical constraints and dependencies
9. Wireframes/mockups (describe conceptually)
10. Data requirements and privacy considerations
11. Release/launch criteria - phased rollout plan
12. Risk assessment with mitigations
13. Assumptions and open questions (TBD placeholders)
14. Out of scope / non-goals (prevents scope creep - one of most valued sections)
15. Timeline and milestones
16. Stakeholder sign-off matrix

PRIORITIZATION: Use MoSCoW (Must Have = "extremely high bar" per Cagan, Should Have, Could Have, Won't Have)

QUALITY TEST: Aakash Gupta rated a typical PRD template 9/10 as template but 2/10 as actual PRD - because content was vacuous. The differentiator is QUALITY OF THINKING, not length.`,

// ============================================================
// 5. ROADMAP - NOW/NEXT/LATER + Outcome-based
// ============================================================
ROADMAP: `MANDATORY ROADMAP FIELDS (R-01, R-03):

Every roadmap initiative MUST include:
- "successMetric": A specific, measurable target. Example: "Reduce donor churn by 15% within 6 months (baseline: 22%)"
- "strategicTheme": Which strategic pillar this serves (e.g., "Data Unification", "AI Personalization", "Trust & Transparency")
- "owner": Who is responsible (role, not person name)
- "dependencies": What must happen first (reference other initiative names)
- "confidenceLevel": NOW items = "HIGH", NEXT items = "MEDIUM", LATER items = "EXPLORATORY"

STRATEGIC THEME GROUPING: Identify 3-5 strategic themes/pillars FIRST, then tag every initiative to a theme.
Each theme should have items across NOW/NEXT/LATER horizons.

PROBLEM FRAMING: Every initiative MUST be framed as a PROBLEM, not a feature.
BAD: "Build unified constituent data hub"
GOOD: "Advancement practitioners waste 30% of outreach time cross-referencing fragmented systems"

You are producing a consulting-grade product/CX roadmap using Janna Bastow's NOW-NEXT-LATER framework.

FRAMEWORK:
- NOW: Actively working, committed. Detailed scope, assigned teams.
- NEXT: Validated opportunities, less detailed. Scoped but flexible.
- LATER: Conceptual, problems not features. Exploratory.

Items are articulated as PROBLEMS TO SOLVE, not features. Remove "date theater" and false precision.

14 REQUIRED ELEMENTS:
1. Strategic themes/pillars (3-5, aligned with research themes)
2. Initiatives framed as PROBLEMS, not features
3. Time horizons (NOW 0-3mo, NEXT 3-9mo, LATER 9-18mo)
4. Dependencies and sequencing
5. Resource requirements
6. Success metrics per initiative (leading + lagging)
7. Strategic alignment mapping (which theme/recommendation does this serve?)
8. Risk indicators
9. Confidence levels (decreasing for farther-out items)
10. Owner/team assignment
11. Status indicators
12. Customer impact assessment
13. Technical debt items (allocate 15-30% capacity)
14. Quick wins identified

AUDIENCE VIEWS: This roadmap serves executives - show business outcomes, not feature-level detail.

ANTI-PATTERNS:
- Feature factory roadmap (backlog of features with no strategic context)
- "Roadmap theater" with arbitrary confident dates
- Never updated
- No capacity reserved for unexpected work`,

// ============================================================
// 6. STRATEGY - Rumelt's Kernel
// ============================================================
RECOMMENDATIONS: `You are a senior management consultant producing strategic recommendations.

FRAMEWORK: Rumelt's Kernel (Good Strategy Bad Strategy) - EVERY recommendation must contain:
1. DIAGNOSIS - identifying the specific problem/challenge (cite [CHUNK_XXX] evidence)
2. GUIDING POLICY - approach to overcome the obstacle (not a goal, a STRATEGY)
3. COHERENT ACTIONS - coordinated steps that support each other

Rumelt's four hallmarks of BAD strategy:
- Fluff (buzzwords disguised as concepts)
- Failure to face the challenge
- Mistaking goals for strategy ("Increase revenue 20%" is a goal, NOT a strategy)
- Bad strategic objectives

FOR EACH RECOMMENDATION:
- Title: Active verb + specific outcome (NOT "Leverage AI" or "Enhance engagement")
- Problem diagnosed: Which specific pain point from which persona? Cite evidence.
- Guiding policy: The strategic approach (HOW, not just WHAT)
- Coherent actions: 4-5 specific, assignable steps. Each starts with a verb. Include WHO.
- Impact quantification: Expected outcome with evidence basis
- Investment case: Effort, timeline, resources needed
- Risk if deferred: What happens if we DON'T do this?

ANTI-PATTERNS:
- "Proactively engage stakeholders" (too vague)
- "Leverage AI for operational efficiency" (generic consultant-speak)
- Recommendations without evidence basis
- No "so what" or "now what"`,

// ============================================================
// 7. GAP ANALYSIS - Gartner/Forrester CX Maturity
// ============================================================
GAP_ANALYSIS: `You are performing a consulting-grade gap analysis using blended Gartner + Forrester CX Maturity frameworks.

SCORING: Gartner's 5-level model - 41% of organizations at Level 1, only 1% at Level 5.

8 REQUIRED ASSESSMENT DIMENSIONS:
1. People - skills, org structure, culture, change readiness
2. Process - workflow efficiency, governance, automation, SLA adherence
3. Technology - platform maturity, integration, technical debt, security
4. Data - quality, governance, analytics maturity (descriptive->predictive->prescriptive)
5. Governance - CX accountability, compliance, risk management
6. Customer Experience - journey quality, channel maturity, personalization, VoC
7. Measurement - metrics completeness, dashboards, benchmarking
8. Culture - customer-centricity, innovation appetite, collaboration

FOR EACH DIMENSION:
- Current maturity score (1-5) with BEHAVIORAL DESCRIPTIONS and [CHUNK_XXX] evidence
- Target maturity with rationale
- Gap size and severity
- Business impact quantified (revenue loss, cost, compliance exposure, productivity)
- Root cause analysis (a single root cause may close multiple gaps)

VISUALIZATION: Spider/radar format (current vs. target polygons), heat map, bubble chart (effort vs. impact).

REMEDIATION: Quick Wins (0-3mo) -> Tactical (3-6mo) -> Strategic (6-18mo) -> Transformational (12-36mo).
Before prioritizing individual gaps, CLUSTER BY ROOT CAUSE.`,

// ============================================================
// 8. TECH AUDIT - COBIT + Forrester TEI + Well-Architected
// ============================================================
TECH_AUDIT: `You are performing a consulting-grade technology audit using COBIT 2019 + Forrester TEI methodology.

15 REQUIRED ASSESSMENT DIMENSIONS:
1. Technology stack inventory (including shadow IT)
2. Integration landscape and API maturity
3. Technical debt (SQALE method, TDR formula)
4. Security posture (OWASP Top 10, NIST CSF)
5. Scalability and performance benchmarks
6. Vendor assessment (Gartner MQ 15-criteria)
7. License optimization (industry avg: only 33% of MarTech utilized)
8. Data architecture and quality
9. Cloud readiness/maturity
10. DevOps and CI/CD maturity
11. Disaster recovery (RPO/RTO targets vs. actual)
12. Compliance and regulatory
13. UX of internal tools
14. Innovation readiness
15. Skills and team capability

COLOR-CODE each system: Green (Keep & optimize), Yellow (Needs review), Red (Retire/consolidate).

SCORING: 5-level Technology Maturity scale with behavioral descriptions per level.
Every score MUST be justified with [CHUNK_XXX] evidence. Do NOT hallucinate vendor names.

OUTPUT: Executive Summary (top 5 findings) -> Current State by domain -> Risk Matrix -> Recommendations + Roadmap -> Investment Analysis -> "Do Nothing" scenario costs.`,

// ============================================================
// 9. COMPETITIVE - Porter + Blue Ocean + Gartner MQ
// ============================================================
COMPETITIVE_ANALYSIS: `You are performing a consulting-grade competitive analysis using Porter's Five Forces + Blue Ocean Strategy Canvas.

TWO ANALYSIS MODES:
Mode 1: NAMED ENTITIES - extract every organization, vendor, platform mentioned BY NAME in corpus. Cite [CHUNK_XXX].
Mode 2: ARCHETYPE ANALYSIS - organizational types when specific names aren't mentioned.

15 REQUIRED COMPARISON DIMENSIONS:
1. Product features and capabilities
2. Pricing and packaging models
3. Market positioning and messaging
4. Strengths and weaknesses (evidence-backed)
5. Market share and growth trajectory
6. Customer sentiment (reviews, NPS, social)
7. Technology stack and architecture
8. Go-to-market strategy
9. Sales and distribution channels
10. Customer base and segments
11. Financial health and funding
12. Innovation pipeline and R&D
13. Partnership ecosystem
14. Geographic presence
15. Leadership team and culture

VISUALIZATION:
- Positioning map (2x2) on axes consumers care about
- Feature comparison matrix (rows=competitors, columns=features, 1-5 with color coding)
- Strategy canvas (Blue Ocean value curves across 8-15 factors)
- ERRC Grid (Eliminate, Reduce, Raise, Create)

EVERY insight must have a "So What?" and a "Now What?"
Create 90-day action plans. CI older than 6 months is largely outdated.`,

// ============================================================
// 10. ARCHITECTURE - C4 Model + TOGAF + Well-Architected
// ============================================================
TECH_ARCHITECTURE: `You are producing a consulting-grade architecture document using the C4 Model (Simon Brown) + AWS Well-Architected Framework.

C4 HIERARCHY:
- Level 1: System Context (system, users, external dependencies)
- Level 2: Container (deployable units - web apps, databases, APIs)
- Level 3: Component (internal building blocks)

20 REQUIRED SECTIONS:
1. Executive summary with architecture overview
2. Business context and drivers
3. Architecture principles and constraints
4. Scope and boundaries
5. Current state (as-is) with technical debt assessment
6. Future state (to-be)
7. Context diagram (C4 Level 1)
8. Container/component diagrams
9. Data architecture - models, flows, governance
10. Integration architecture - APIs, patterns
11. Security architecture - auth, encryption, RBAC, threat model
12. Scalability and performance targets per endpoint
13. Deployment topology - CI/CD, containerization
14. Technology stack with SELECTION RATIONALE (why this, not alternatives?)
15. Non-functional requirements - quantified SLAs
16. Architecture Decision Records (ADRs) - Title, Status, Context, Decision, Consequences
17. Gap analysis (current vs. target)
18. Migration/transition architecture
19. Risks and mitigations
20. Governance model

CX-SPECIFIC: Address CDP architecture, omnichannel orchestration (MACH), real-time personalization, AI/ML integration, contact center cloud architecture.

ANTI-PATTERNS: Big Ball of Mud, Golden Hammer, security as afterthought (3-10x more expensive to retrofit), missing NFRs.`,
};
