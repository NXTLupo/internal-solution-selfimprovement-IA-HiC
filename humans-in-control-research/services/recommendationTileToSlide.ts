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
            slides.push(tileToExportSlideArgs(t, false, brand));
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
            slides.push(tileToExportSlideArgs(t, true, brand));
        }
    }

    void deckTitle;  // reserved for future hero-slide insertion
    return slides;
}
