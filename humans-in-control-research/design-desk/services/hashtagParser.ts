export type ContentHashtag =
    | 'persona' | 'journey' | 'blueprint' | 'arch'
    | 'prd' | 'roadmap' | 'strategy' | 'gap'
    | 'audit' | 'compete' | 'org'
    // 2026-05-24 - NotebookLM uplift Phase 4-6
    | 'mindmap' | 'brief-dialog' | 'meta-themes' | 'research-plan'
    // 2026-05-26 - case-study + presentation + recommendation classes that
    // existed in the skill manifest but were missing from the parser, causing
    // silent misroute via matchSkills synonym expansion.
    | 'case-study' | 'presentation' | 'recommendations' | 'brief'
    | 'explainer' | 'report' | 'playground' | 'approaches' | 'refine' | 'help';

export type BrandHashtag = 'nxt' | 'nu';
export type ViewHashtag = 'slide';
export type CompositionHashtag = 'slides';

export interface ParsedHashtags {
    content: ContentHashtag[];
    view: ViewHashtag | null;
    composition: CompositionHashtag | null;
    brand: BrandHashtag;
    unknown: string[];
    cleanPrompt: string;
}

const CONTENT: Set<string> = new Set([
    'persona', 'journey', 'blueprint', 'arch',
    'prd', 'roadmap', 'strategy', 'gap', 'audit', 'compete', 'org',
    // 2026-05-24 - NotebookLM uplift Phase 4-6
    'mindmap', 'brief-dialog', 'meta-themes', 'research-plan',
    // 2026-05-26 - case-study + remaining registry directives so the parser
    // recognizes everything hashtagRegistry.ts publishes. Prevents the silent
    // synonym-expansion misroute (#case study #slides → tech-audit-inspector).
    'case-study', 'presentation', 'recommendations', 'brief',
    'explainer', 'report', 'playground', 'approaches', 'refine', 'help',
]);

/**
 * Plural-form aliases - users naturally type `#journeys`, `#personas`, `#orgs`
 * when they want one of those artifact types. Map them back to the canonical
 * singular content hashtag. Note: `slides` is a composition modifier (separate
 * meaning) and is NOT treated as a plural of `slide`. `gaps` not aliased to
 * `gap` because gap-analysis is the artifact name, not a count of gaps -
 * keeping it singular avoids ambiguity. `orgs` is included because users may
 * say "the orgs" or "org chart" interchangeably.
 */
const CONTENT_PLURAL_ALIASES: Record<string, string> = {
    personas: 'persona',
    journeys: 'journey',
    blueprints: 'blueprint',
    arches: 'arch',
    architecture: 'arch',
    prds: 'prd',
    roadmaps: 'roadmap',
    strategies: 'strategy',
    audits: 'audit',
    techaudit: 'audit',
    'tech-audit': 'audit',
    competitives: 'compete',
    competes: 'compete',
    competitors: 'compete',
    competitive: 'compete',
    orgs: 'org',
    orgcharts: 'org',
    orgchart: 'org',
    // 2026-05-24 - NotebookLM uplift Phase 4-6
    mindmaps: 'mindmap',
    'mind-map': 'mindmap',
    'mind-maps': 'mindmap',
    dialog: 'brief-dialog',
    dialogue: 'brief-dialog',
    'brief-dialogue': 'brief-dialog',
    metathemes: 'meta-themes',
    'meta-theme': 'meta-themes',
    'platform-patterns': 'meta-themes',
    deepresearch: 'research-plan',
    'deep-research': 'research-plan',
    plan: 'research-plan',
    // 2026-05-26 - case-study, presentation, recommendation aliases.
    // `case` is intentionally NOT aliased to `case-study` here - it is a
    // common English word ("case in point", "edge case") that would
    // false-positive. Users get a "Unknown directive - did you mean
    // #case-study?" suggestion via searchDirectives() in the dispatcher.
    casestudy: 'case-study',
    'case-studies': 'case-study',
    casestudies: 'case-study',
    presentations: 'presentation',
    recs: 'recommendations',
    recommendation: 'recommendations',
    briefs: 'brief',
    explainers: 'explainer',
    reports: 'report',
    playgrounds: 'playground',
    approach: 'approaches',
};
const BRANDS: Set<string> = new Set(['nxt', 'nu']);
const VIEW_SINGLE = 'slide';
const VIEW_MULTI = 'slides';

export function parseHashtags(input: string): ParsedHashtags {
    const content: ContentHashtag[] = [];
    const unknown: string[] = [];
    let view: ViewHashtag | null = null;
    let composition: CompositionHashtag | null = null;
    let brand: BrandHashtag = 'nxt';
    let cleaned = input;

    // 2026-05-24 - Allow hyphens so multi-word hashtags like #brief-dialog,
    // #meta-themes, #deep-research, #mind-map are detected as single tokens.
    // Hyphen NOT allowed at start or end of the tag (no `#-` or `#foo-`).
    const tokens = Array.from(input.matchAll(/#([a-zA-Z][a-zA-Z-]*[a-zA-Z]|[a-zA-Z])/g));
    for (const match of tokens) {
        const rawTag = match[1].toLowerCase();
        // Map plural/alternate forms to the canonical singular content hashtag.
        const tag = CONTENT_PLURAL_ALIASES[rawTag] ?? rawTag;
        let consumed = false;
        if (CONTENT.has(tag)) {
            if (!content.includes(tag as ContentHashtag)) content.push(tag as ContentHashtag);
            consumed = true;
        } else if (BRANDS.has(tag)) {
            brand = tag as BrandHashtag;
            consumed = true;
        } else if (tag === VIEW_SINGLE) {
            view = 'slide';
            consumed = true;
        } else if (tag === VIEW_MULTI) {
            composition = 'slides';
            consumed = true;
        } else {
            unknown.push(tag);
        }
        if (consumed) {
            cleaned = cleaned.replace(match[0], '').replace(/\s+/g, ' ');
        }
    }

    return {
        content,
        view,
        composition,
        brand,
        unknown,
        cleanPrompt: cleaned.trim(),
    };
}
