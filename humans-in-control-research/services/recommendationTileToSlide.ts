/**
 * recommendationTileToSlide — adapter that maps a #recommendations
 * RecommendationTile (the consulting-grade tiles shown in CorpusChatPanel
 * after the user types #recommendations) onto the existing recommendation
 * slide template via ExportSlideArgs.
 *
 * Two export shapes are supported:
 *
 *   • Single slide  — exportTileAsSingleSlide(tile, isBet, brand) returns
 *     one ExportSlideArgs ready to feed exportSlideToPPTX(). Used by the
 *     per-tile "Export as Slide" button.
 *
 *   • Full deck     — exportTilesAsDeck(tiles, brand) returns an ordered
 *     ExportSlideArgs[] (section divider + each tile slide + closing
 *     section divider). Used by the "Export All Recommendations as Deck"
 *     button at the top of the recommendations grid.
 *
 * The mapping preserves the tile's visual identity (chartreuse accent for
 * Defensible Consensus, cyan accent for Non-Obvious Bet) and surfaces the
 * tile's image_data alongside the consulting-depth fields.
 */

import type {
    ExportSlideArgs,
} from '../components/slideTemplates/pptx';
import type {
    RecommendationData,
    SectionDividerData,
    Brand,
} from '../components/slideTemplates/types';

/**
 * Minimal RecommendationTile shape — keep in sync with the interface in
 * CorpusChatPanel.tsx. Re-declared here to avoid pulling React component
 * imports into a pure data adapter. Most fields are optional; only `title`
 * is structurally required.
 */
export interface RecommendationTileInput {
    slug?: string;
    title: string;
    thesis?: string;
    persona?: string;
    moment?: string;
    aha_interaction?: string;
    ai_capabilities?: string[];
    image_prompt?: string;
    image_data?: string;        // data URL — model-generated portrait
    image_url?: string;          // remote URL fallback
    variants?: Array<{ label: string; command: string }>;
    clr_dependent?: boolean | null;
    execution_path?: string;
    existing_stack_reuse?: string;
    non_starter_check?: string;
    effort_estimate?: string;
    risk_level?: string;
    evidence_sources?: string[];
    initiative_dependent?: boolean | null;
    group?: 'initiative_dependent' | 'initiative_independent' | 'clr_dependent' | 'clr_independent' | null;
    description?: string;
    why_matters_target_segment?: string;
    long_term_outcome_through_line?: string;
    initiative_dependency_explanation?: string;
    execution_in_existing_stack?: string;
    preferred_stack_fit?: string;
    stakeholder_guardrail_fit?: string;
    // Legacy aliases
    why_matters_first_year?: string;
    long_term_coop_readiness?: string;
    clr_dependency_explanation?: string;
    execution_in_nu_stack?: string;
    microsoft_copilot_fit?: string;
    guardrail_fit?: string;
    // Consulting-depth structured fields (the rich data the chat tile shows
    // inside its COLLAPSE CONSULTING BRIEF section; these must reach the deck)
    key_stakeholders?: Array<{ name_or_role: string; involvement: string }>;
    implementation_steps?: Array<{ step: string; owner?: string; dependencies?: string[]; estimated_effort?: string }>;
    risks_constraints?: Array<{ risk: string; severity?: string; mitigation: string }>;
    expected_impact?: string;
    verbatim_quote_evidence?: string;
    frame?: 'defensible_consensus' | 'non_obvious_bet';
    probability?: number;
    diverges_from?: string;
}

const truncate = (s: string | undefined, n: number): string => {
    if (!s) return '';
    return s.length > n ? s.substring(0, n - 1).trimEnd() + '…' : s;
};

/** Build persona + moment + aha as a single eyebrow line. */
function buildPersonaContext(t: RecommendationTileInput): string {
    const parts: string[] = [];
    if (t.persona) parts.push(t.persona);
    if (t.moment) parts.push(t.moment);
    if (t.aha_interaction) parts.push(t.aha_interaction);
    return parts
        .filter(Boolean)
        .map(p => truncate(p, 50))
        .join(' · ');
}

/** Map ai_capabilities[] to the supportingActions[] shape. */
function buildAiCapabilityActions(t: RecommendationTileInput): Array<{ name: string; description: string }> {
    const caps = (t.ai_capabilities || []).filter(c => typeof c === 'string' && c.trim().length > 0);
    if (caps.length === 0) return [];
    return caps.slice(0, 5).map(cap => {
        // Capabilities sometimes arrive as "Name: description" or as single phrases.
        // Split on first colon if present; otherwise use the whole string as the name
        // and leave description empty (slide template tolerates this).
        const colonIdx = cap.indexOf(':');
        if (colonIdx > 0 && colonIdx < cap.length - 1) {
            return {
                name: cap.substring(0, colonIdx).trim(),
                description: cap.substring(colonIdx + 1).trim(),
            };
        }
        return { name: cap.trim(), description: '' };
    });
}

/** Compose the optional impact strip — only included if at least one value is present. */
function buildImpactStrip(t: RecommendationTileInput): RecommendationData['impactStrip'] | undefined {
    const effort = t.effort_estimate?.trim();
    const risk = t.risk_level?.trim();
    // Outcome: prefer long_term_outcome_through_line, fall back to thesis snippet
    const outcomeRaw = t.long_term_outcome_through_line || t.long_term_coop_readiness;
    const outcome = outcomeRaw ? truncate(outcomeRaw, 110) : undefined;
    if (!effort && !risk && !outcome) return undefined;
    return { effort, risk, outcome };
}

/** Compose evidence quotes from the tile's evidence_sources[] — best-effort,
 *  since evidence_sources is a flat string[] of citation names, not full quotes. */
function buildEvidence(t: RecommendationTileInput): RecommendationData['evidence'] {
    const srcs = (t.evidence_sources || []).filter(s => typeof s === 'string' && s.trim().length > 0);
    if (srcs.length === 0) return undefined;
    // Render each source name as a citation-style evidence entry. The
    // slide's evidence strip expects { text, source } shape — we surface
    // the source name as both since the tile schema doesn't carry verbatim
    // quotes. This is intentional: the user sees the SOURCE NAMES the
    // model grounded the concept in, which is the citation contract.
    return srcs.slice(0, 2).map(s => ({
        text: s.trim(),
        source: s.trim(),
    }));
}

/**
 * Map a single tile to ExportSlideArgs. `isBet` controls accent color +
 * framing tag (Defensible Consensus chartreuse vs Non-Obvious Bet cyan).
 *
 * Returns the OVERVIEW slide only — for the full multi-slide expansion
 * (case, execution, stakeholders, plan, risks) use tileToExportSlidesMulti.
 */
export function tileToExportSlideArgs(
    tile: RecommendationTileInput,
    isBet: boolean,
    brand?: Brand,
): ExportSlideArgs {
    const recommendation: RecommendationData = {
        actionTitle: tile.title,
        rationale: tile.thesis || tile.description,
        supportingActions: buildAiCapabilityActions(tile),
        framingTag: isBet ? 'NON-OBVIOUS BET' : 'DEFENSIBLE CONSENSUS',
        accentColor: isBet ? 'cyan' : 'chartreuse',
        personaContext: buildPersonaContext(tile),
        actionsLabel: 'AI CAPABILITIES',
        impactStrip: buildImpactStrip(tile),
        heroImage: (tile.image_data || tile.image_url)
            ? {
                src: tile.image_data || tile.image_url || '',
                alt: tile.image_prompt || tile.title,
                caption: tile.image_prompt ? truncate(tile.image_prompt, 60) : undefined,
            }
            : undefined,
        whyMatters: tile.why_matters_target_segment || tile.why_matters_first_year,
        implication: tile.long_term_outcome_through_line
            || tile.long_term_coop_readiness
            || tile.stakeholder_guardrail_fit
            || tile.guardrail_fit,
        evidence: buildEvidence(tile),
    };
    return {
        template: 'recommendation',
        title: tile.title,
        recommendation,
        sources: tile.evidence_sources,
        brand,
    };
}

// =============================================================================
// MULTI-SLIDE EXPANSION — one concept → 1-6 slides
// =============================================================================
//
// The chat tile carries WAY more detail than a single slide can absorb:
//   • thesis + full description + why_matters_target_segment + long_term_outcome
//   • execution_in_existing_stack + preferred_stack_fit + existing_stack_reuse
//     + non_starter_check + execution_path + initiative_dependency_explanation
//   • key_stakeholders[] + implementation_steps[] + risks_constraints[]
//   • expected_impact + verbatim_quote_evidence + stakeholder_guardrail_fit
//
// Cramming all that into one slide produces an anemic export (per user feedback
// 2026-05-12). Instead, expand into a small per-concept deck:
//
//   01 · OVERVIEW            — title, persona/moment/aha, AI capabilities,
//                              effort/risk/outcome, hero image, implication
//   02 · THE CASE            — full description, why-it-matters, long-term
//                              outcome, initiative dependency, verbatim quote
//   03 · EXECUTION & STACK   — execution-in-existing-stack, preferred-stack-fit,
//                              existing-stack-reuse, non-starter-check
//   04 · STAKEHOLDERS        — key_stakeholders numbered with involvement
//   05 · IMPLEMENTATION PLAN — implementation_steps numbered with owner/effort/deps
//   06 · RISKS & IMPACT      — risks_constraints + mitigations, expected_impact
//
// Each slide is conditional on data presence — anemic concepts stay at 1 slide;
// rich concepts expand to 5-6. The accent color (chartreuse vs cyan) is
// consistent across all slides of a concept, matching its consensus/bet frame.

/** First non-empty string from a candidate list (already trimmed). */
function pickStr(...candidates: Array<string | undefined>): string | undefined {
    for (const c of candidates) {
        if (c && c.trim().length > 0) return c.trim();
    }
    return undefined;
}

/** Resolved field accessors — handles legacy field-name aliases in one place. */
function fields(t: RecommendationTileInput) {
    return {
        whyMatters: pickStr(t.why_matters_target_segment, t.why_matters_first_year),
        longTerm: pickStr(t.long_term_outcome_through_line, t.long_term_coop_readiness),
        initiativeDep: pickStr(t.initiative_dependency_explanation, t.clr_dependency_explanation),
        stackExec: pickStr(t.execution_in_existing_stack, t.execution_in_nu_stack),
        stackFit: pickStr(t.preferred_stack_fit, t.microsoft_copilot_fit),
        guardrailFit: pickStr(t.stakeholder_guardrail_fit, t.guardrail_fit),
        evidence: (t.evidence_sources || []).filter(s => typeof s === 'string' && s.trim().length > 0),
    };
}

/**
 * Builder for one slide of the multi-deck. Returns null when the slide has
 * insufficient content (less than 2 substantive fields) so we don't emit
 * blank "EXECUTION & STACK" slides for concepts that didn't carry that data.
 */
function buildSlide(args: {
    tile: RecommendationTileInput;
    isBet: boolean;
    brand?: Brand;
    sectionLabel: string;           // e.g. "02 · THE CASE"
    eyebrow?: string;                // personaContext eyebrow line
    actionTitle: string;
    rationale?: string;
    supportingActions: Array<{ name: string; description: string }>;
    actionsLabel: string;
    impactStrip?: RecommendationData['impactStrip'];
    heroImage?: RecommendationData['heroImage'];
    implication?: string;
    evidence?: RecommendationData['evidence'];
    minActions?: number;             // suppress slide unless this many supportingActions
    minRationaleLen?: number;        // OR rationale exceeds this length
}): ExportSlideArgs | null {
    const minActions = args.minActions ?? 2;
    const minRationaleLen = args.minRationaleLen ?? 120;
    const hasEnoughActions = args.supportingActions.length >= minActions;
    const hasRichRationale = !!(args.rationale && args.rationale.length >= minRationaleLen);
    const hasImpact = !!(args.impactStrip && (args.impactStrip.effort || args.impactStrip.risk || args.impactStrip.outcome));
    const hasImplication = !!(args.implication && args.implication.length > 20);
    // Substantive = enough actions, OR rich rationale, OR impact strip + implication
    const substantive = hasEnoughActions || hasRichRationale || (hasImpact && hasImplication);
    if (!substantive) return null;

    const recommendation: RecommendationData = {
        actionTitle: args.actionTitle,
        rationale: args.rationale,
        supportingActions: args.supportingActions,
        framingTag: args.sectionLabel,
        accentColor: args.isBet ? 'cyan' : 'chartreuse',
        personaContext: args.eyebrow,
        actionsLabel: args.actionsLabel,
        impactStrip: args.impactStrip,
        heroImage: args.heroImage,
        implication: args.implication,
        evidence: args.evidence,
    };
    return {
        template: 'recommendation',
        title: args.tile.title,
        recommendation,
        sources: args.tile.evidence_sources,
        brand: args.brand,
    };
}

/** Slide 1 — OVERVIEW. Always emitted. */
function buildOverviewSlide(t: RecommendationTileInput, isBet: boolean, brand?: Brand): ExportSlideArgs {
    const f = fields(t);
    return {
        template: 'recommendation',
        title: t.title,
        recommendation: {
            actionTitle: t.thesis || t.description?.slice(0, 200) || t.title,
            rationale: t.description || t.thesis,
            supportingActions: buildAiCapabilityActions(t),
            framingTag: `01 · ${isBet ? 'NON-OBVIOUS BET' : 'DEFENSIBLE CONSENSUS'}`,
            accentColor: isBet ? 'cyan' : 'chartreuse',
            personaContext: buildPersonaContext(t),
            actionsLabel: 'AI CAPABILITIES',
            impactStrip: buildImpactStrip(t),
            heroImage: (t.image_data || t.image_url)
                ? {
                    src: t.image_data || t.image_url || '',
                    alt: t.image_prompt || t.title,
                    caption: t.image_prompt ? truncate(t.image_prompt, 60) : undefined,
                }
                : undefined,
            implication: f.longTerm || f.guardrailFit,
            evidence: buildEvidence(t),
        },
        sources: t.evidence_sources,
        brand,
    };
}

/** Slide 2 — THE CASE: why it matters, long-term outcome, initiative dependency. */
function buildCaseSlide(t: RecommendationTileInput, isBet: boolean, brand?: Brand): ExportSlideArgs | null {
    const f = fields(t);
    const actions: Array<{ name: string; description: string }> = [];
    if (f.whyMatters) actions.push({ name: 'Why this matters now', description: f.whyMatters });
    if (f.longTerm) actions.push({ name: 'Long-term outcome', description: f.longTerm });
    if (f.initiativeDep) actions.push({ name: 'Initiative dependency', description: f.initiativeDep });

    const verbatim = t.verbatim_quote_evidence?.trim();
    const evidence: RecommendationData['evidence'] | undefined = verbatim
        ? [{ text: verbatim, source: f.evidence[0] || 'Corpus quote' }]
        : undefined;

    return buildSlide({
        tile: t, isBet, brand,
        sectionLabel: '02 · THE CASE',
        eyebrow: t.persona ? truncate(t.persona, 110) : undefined,
        actionTitle: f.whyMatters ? truncate(f.whyMatters, 140) : 'Why this concept earns the slot',
        rationale: t.description && t.description.length > 240 ? t.description : undefined,
        supportingActions: actions,
        actionsLabel: 'THE CASE',
        implication: f.longTerm,
        evidence,
        minActions: 2,
        minRationaleLen: 240,
    });
}

/** Slide 3 — EXECUTION & STACK. */
function buildExecutionStackSlide(t: RecommendationTileInput, isBet: boolean, brand?: Brand): ExportSlideArgs | null {
    const f = fields(t);
    const actions: Array<{ name: string; description: string }> = [];
    if (t.existing_stack_reuse) actions.push({ name: 'Existing stack reuse', description: t.existing_stack_reuse });
    if (f.stackFit) actions.push({ name: 'Preferred-stack fit', description: f.stackFit });
    if (t.non_starter_check) actions.push({ name: 'Non-starter check', description: t.non_starter_check });
    if (t.execution_path) actions.push({ name: 'Execution path', description: t.execution_path });

    const impactStrip: RecommendationData['impactStrip'] | undefined = (t.effort_estimate || t.risk_level || t.initiative_dependent != null)
        ? {
            effort: t.effort_estimate,
            risk: t.risk_level,
            outcome: t.initiative_dependent === true
                ? 'Depends on a named initiative'
                : t.initiative_dependent === false
                    ? 'Operates independently of the named initiative'
                    : undefined,
        }
        : undefined;

    return buildSlide({
        tile: t, isBet, brand,
        sectionLabel: '03 · EXECUTION & STACK',
        eyebrow: f.stackFit ? truncate(f.stackFit, 110) : undefined,
        actionTitle: f.stackExec
            ? truncate(f.stackExec, 200)
            : 'How this rides on existing systems',
        rationale: f.stackExec && f.stackExec.length > 200 ? f.stackExec : undefined,
        supportingActions: actions,
        actionsLabel: 'STACK & EXECUTION',
        impactStrip,
        implication: f.guardrailFit,
        minActions: 2,
        minRationaleLen: 200,
    });
}

/** Slide 4 — STAKEHOLDERS. */
function buildStakeholdersSlide(t: RecommendationTileInput, isBet: boolean, brand?: Brand): ExportSlideArgs | null {
    const stakeholders = (t.key_stakeholders || []).filter(s => s?.name_or_role && s?.involvement);
    if (stakeholders.length < 2) return null;

    const actions = stakeholders.slice(0, 5).map(s => ({
        name: s.name_or_role.trim(),
        description: s.involvement.trim(),
    }));

    return buildSlide({
        tile: t, isBet, brand,
        sectionLabel: '04 · STAKEHOLDERS',
        actionTitle: 'The people who own this work',
        supportingActions: actions,
        actionsLabel: 'KEY STAKEHOLDERS',
        implication: fields(t).guardrailFit,
        minActions: 2,
    });
}

/** Slide 5 — IMPLEMENTATION PLAN. */
function buildImplementationSlide(t: RecommendationTileInput, isBet: boolean, brand?: Brand): ExportSlideArgs | null {
    const steps = (t.implementation_steps || []).filter(s => s?.step);
    if (steps.length < 2) return null;

    const actions = steps.slice(0, 5).map(s => {
        const meta: string[] = [];
        if (s.owner) meta.push(`Owner: ${s.owner}`);
        if (s.estimated_effort) meta.push(`Effort: ${s.estimated_effort}`);
        if (s.dependencies && s.dependencies.length > 0) meta.push(`Deps: ${s.dependencies.slice(0, 3).join(', ')}`);
        const metaLine = meta.length > 0 ? ` — ${meta.join(' · ')}` : '';
        return {
            name: truncate(s.step, 80),
            description: metaLine.replace(/^\s*—\s*/, ''),
        };
    });

    const totalEffort = steps.map(s => s.estimated_effort).filter(Boolean).join(' + ') || undefined;
    const firstOwner = steps.find(s => s.owner)?.owner;
    const depCount = steps.reduce((n, s) => n + (s.dependencies?.length || 0), 0);

    const impactStrip: RecommendationData['impactStrip'] | undefined = (totalEffort || firstOwner || depCount > 0)
        ? {
            effort: totalEffort ? truncate(totalEffort, 110) : undefined,
            risk: firstOwner ? `Kickoff owner: ${firstOwner}` : undefined,
            outcome: depCount > 0 ? `${depCount} dependency hand-off${depCount === 1 ? '' : 's'}` : undefined,
        }
        : undefined;

    return buildSlide({
        tile: t, isBet, brand,
        sectionLabel: '05 · IMPLEMENTATION PLAN',
        actionTitle: 'How this gets built',
        supportingActions: actions,
        actionsLabel: 'STEPS',
        impactStrip,
        implication: fields(t).longTerm,
        minActions: 2,
    });
}

/** Slide 6 — RISKS & IMPACT. */
function buildRisksImpactSlide(t: RecommendationTileInput, isBet: boolean, brand?: Brand): ExportSlideArgs | null {
    const f = fields(t);
    const risks = (t.risks_constraints || []).filter(r => r?.risk && r?.mitigation);
    const hasRisks = risks.length >= 1;
    const hasImpact = !!(t.expected_impact && t.expected_impact.trim().length > 30);
    if (!hasRisks && !hasImpact) return null;

    const actions = risks.slice(0, 5).map(r => ({
        name: r.severity
            ? `[${r.severity.toUpperCase()}] ${truncate(r.risk, 70)}`
            : truncate(r.risk, 90),
        description: r.mitigation,
    }));

    const verbatim = t.verbatim_quote_evidence?.trim();
    const evidence: RecommendationData['evidence'] | undefined = verbatim && hasRisks
        ? [{ text: verbatim, source: f.evidence[0] || 'Corpus quote' }]
        : undefined;

    const severityCounts = risks.reduce((acc, r) => {
        const sev = (r.severity || '').toLowerCase();
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const highSev = severityCounts['high'] || severityCounts['critical'] || 0;
    const impactStrip: RecommendationData['impactStrip'] | undefined = (hasImpact || hasRisks)
        ? {
            effort: hasImpact ? truncate(t.expected_impact || '', 110) : undefined,
            risk: hasRisks ? `${risks.length} tracked risk${risks.length === 1 ? '' : 's'}${highSev > 0 ? ` (${highSev} high)` : ''}` : undefined,
            outcome: f.longTerm ? truncate(f.longTerm, 110) : undefined,
        }
        : undefined;

    return buildSlide({
        tile: t, isBet, brand,
        sectionLabel: '06 · RISKS & IMPACT',
        actionTitle: hasImpact ? truncate(t.expected_impact || '', 200) : 'Risks and mitigations',
        rationale: hasImpact && (t.expected_impact?.length || 0) > 200 ? t.expected_impact : undefined,
        supportingActions: actions,
        actionsLabel: 'RISKS & MITIGATIONS',
        impactStrip,
        implication: f.guardrailFit,
        evidence,
        minActions: hasImpact ? 0 : 1,        // expected_impact alone can carry the slide
        minRationaleLen: 0,
    });
}

/**
 * Expand a single tile into a 1-6 slide mini-deck.
 *
 * Always emits the Overview slide. Each subsequent slide is conditional on
 * having ≥2 substantive supporting fields OR a rich rationale OR (impact strip
 * + implication). Anemic tiles produce 1 slide; rich tiles produce 5-6.
 */
export function tileToExportSlidesMulti(
    tile: RecommendationTileInput,
    isBet: boolean,
    brand?: Brand,
): ExportSlideArgs[] {
    const slides: ExportSlideArgs[] = [];
    slides.push(buildOverviewSlide(tile, isBet, brand));
    const candidates: Array<ExportSlideArgs | null> = [
        buildCaseSlide(tile, isBet, brand),
        buildExecutionStackSlide(tile, isBet, brand),
        buildStakeholdersSlide(tile, isBet, brand),
        buildImplementationSlide(tile, isBet, brand),
        buildRisksImpactSlide(tile, isBet, brand),
    ];
    for (const c of candidates) {
        if (c) slides.push(c);
    }
    return slides;
}

/**
 * Map a full set of tiles to a deck. Splits into Defensible Consensus and
 * Non-Obvious Bets sections with section-divider slides between groups.
 *
 * @param tiles                 All recommendation tiles to export.
 * @param brand                 NXT or NU brand for the deck (applied per slide).
 * @param classifier            Function returning true if a tile is a Non-Obvious Bet.
 *                              Defaults to checking `tile.group === 'clr_independent'`
 *                              OR a `bet` flag if the upstream payload carries one.
 *                              The CorpusChatPanel already separates tiles into
 *                              `consensusTiles` / `betTiles` arrays, so callers
 *                              typically pass both arrays in order.
 * @param deckTitle             Optional override for the section-divider header.
 */
export function tilesToDeckExportArgs(args: {
    consensusTiles: RecommendationTileInput[];
    betTiles: RecommendationTileInput[];
    brand?: Brand;
    deckTitle?: string;
}): ExportSlideArgs[] {
    const { consensusTiles, betTiles, brand, deckTitle } = args;
    const slides: ExportSlideArgs[] = [];

    // Defensible Consensus section
    if (consensusTiles.length > 0) {
        const divider: SectionDividerData = {
            number: '01',
            title: 'Defensible Consensus',
            subtitle: `${consensusTiles.length} recommendations a senior partner would present without pushback. Well-precedented, schema-congruent, low-risk to propose.`,
        };
        slides.push({
            template: 'section-divider',
            title: 'Defensible Consensus',
            sectionDivider: divider,
            brand,
        });
        for (const t of consensusTiles) {
            for (const slide of tileToExportSlidesMulti(t, false, brand)) slides.push(slide);
        }
    }

    // Non-Obvious Bets section
    if (betTiles.length > 0) {
        const divider: SectionDividerData = {
            number: '02',
            title: 'Non-Obvious Bets',
            subtitle: `${betTiles.length} tail-of-distribution concepts surfaced via Verbalized Sampling (probability < 0.05). Surprising-but-grounded ideas a senior partner would defend as the work that would actually move the needle.`,
        };
        slides.push({
            template: 'section-divider',
            title: 'Non-Obvious Bets',
            sectionDivider: divider,
            brand,
        });
        for (const t of betTiles) {
            for (const slide of tileToExportSlidesMulti(t, true, brand)) slides.push(slide);
        }
    }

    void deckTitle;  // reserved for future hero-slide insertion
    return slides;
}
