export type ContentHashtag =
    | 'persona' | 'journey' | 'blueprint' | 'arch'
    | 'prd' | 'roadmap' | 'strategy' | 'gap'
    | 'audit' | 'compete' | 'org';

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
]);

/**
 * Plural-form aliases — users naturally type `#journeys`, `#personas`, `#orgs`
 * when they want one of those artifact types. Map them back to the canonical
 * singular content hashtag. Note: `slides` is a composition modifier (separate
 * meaning) and is NOT treated as a plural of `slide`. `gaps` not aliased to
 * `gap` because gap-analysis is the artifact name, not a count of gaps —
 * keeping it singular avoids ambiguity. `orgs` is included because users may
 * say "the orgs" or "org chart" interchangeably.
 */
const CONTENT_PLURAL_ALIASES: Record<string, string> = {
    personas: 'persona',
    journeys: 'journey',
    blueprints: 'blueprint',
    arches: 'arch',
    prds: 'prd',
    roadmaps: 'roadmap',
    strategies: 'strategy',
    audits: 'audit',
    competitives: 'compete',
    competes: 'compete',
    competitors: 'compete',
    orgs: 'org',
    orgcharts: 'org',
    orgchart: 'org',
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

    const tokens = Array.from(input.matchAll(/#([a-zA-Z]+)/g));
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
