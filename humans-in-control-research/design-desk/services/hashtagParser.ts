import { designDeskVocabulary } from '../../services/artifactCatalog';

// Stage 6.1 (2026-10-01, finding A7): the CONTENT set and every plural / alternate alias below are
// GENERATED from services/artifactCatalog.ts (designDeskVocabulary). The ContentHashtag union stays
// explicit so consumers keep their literal types; services/artifactCatalog.coverage.test.ts asserts the
// union, the catalog, and the generated set agree. Only the two non-artifact system tags (`refine`,
// `help`) and the legacy `plan` shorthand are added locally.

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

// 2026-10-01 - third brand mode DECIEM (`#deciem`), same contract as #NXT / #NU: a token-set flip.
export type BrandHashtag = 'nxt' | 'nu' | 'deciem';
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

const _vocab = designDeskVocabulary();
/** Non-artifact system tags the Design Desk still treats as content directives. */
const LOCAL_CONTENT = ['refine', 'help'];
const CONTENT: Set<string> = new Set([..._vocab.content, ...LOCAL_CONTENT]);

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
    ..._vocab.aliases,
    // legacy Design Desk shorthand kept for the chips that still emit it
    plan: 'research-plan',
};
const BRANDS: Set<string> = new Set(['nxt', 'nu', 'deciem']);
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
