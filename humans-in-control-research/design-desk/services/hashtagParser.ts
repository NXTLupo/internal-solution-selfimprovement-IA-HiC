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
        const tag = match[1].toLowerCase();
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
