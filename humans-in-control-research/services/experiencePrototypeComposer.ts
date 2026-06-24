/**
 * experiencePrototypeComposer - runtime implementation of the
 * `experience-prototype-composer` skill (.claude/skills/experience-prototype-composer/).
 *
 * The skill specifies the STRICT RULE: every Stage 4 prototype must be
 * composed exclusively from the AI Experience Patterns catalog at
 * /hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json. No invented
 * UI shapes, no generic Copilot shells, no "clean modern" placeholders.
 *
 * This module:
 *   1. Parses the user's hashtag - `#proto <experience-name> #NU | #NXT`
 *   2. Loads the catalog at runtime (cached for the session)
 *   3. Returns a Stage 4 system-prompt injection block that enforces the rule
 *
 * It composes WITH designExemplarCurator (which provides Behance reference
 * exemplars). Both inject before Stage 4: the curator says "study these
 * source designs", the composer says "and render them ONLY using these
 * named patterns from the catalog."
 */

const PROXY_BASE = (typeof window !== 'undefined' && (window as any).__hicProxyBase) || 'http://127.0.0.1:5012';
const CATALOG_URL = `${PROXY_BASE}/hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json`;

export type ComposerBrand = 'nxt' | 'nu';

export interface PatternEntry {
    id: string;
    number: number;
    name: string;
    section: string;
    primitives: string[];
    best_for: string[];
}

export interface CatalogShape {
    version: number;
    showcase_url: string;
    total_patterns: number;
    patterns: PatternEntry[];
    sections: Array<{ id: string; label: string }>;
    brand_variants: Record<string, any>;
    composition_rules: {
        min_patterns_per_prototype: number;
        max_patterns_per_prototype: number;
        must_annotate_with: string;
        must_set_brand_attribute: string;
        forbidden_when_catalog_pattern_exists: string[];
    };
}

export interface HashtagParsed {
    has_proto: boolean;
    experience_name: string | null;
    brand: ComposerBrand;
    raw: string;
}

// ─────────────────────────────────────────────────────────
// Hashtag parsing
// ─────────────────────────────────────────────────────────
/**
 * Parse `#proto <experience-name> #NU | #NXT` from a user prompt.
 *
 * Examples:
 *   "#proto talent-match #NU build the candidate match experience"
 *     → { has_proto: true, experience_name: "trailblazer-match", brand: "nu" }
 *
 *   "#proto cohort-pulse-dashboard #NXT"
 *     → { has_proto: true, experience_name: "cohort-pulse-dashboard", brand: "nxt" }
 *
 *   "#proto unnamed"
 *     → { has_proto: true, experience_name: "unnamed", brand: "nxt" }  (NXT default)
 *
 *   "just build me something"
 *     → { has_proto: false, experience_name: null, brand: "nxt" }     (skill does NOT activate)
 */
export function parseProtoHashtag(prompt: string): HashtagParsed {
    if (!prompt || typeof prompt !== 'string') {
        return { has_proto: false, experience_name: null, brand: 'nxt', raw: prompt || '' };
    }
    // Look for "#proto <name>" - name may contain letters, digits, hyphens
    const protoMatch = prompt.match(/#proto\s+([a-zA-Z0-9][a-zA-Z0-9_-]*)/i);
    const has_proto = !!protoMatch;
    const experience_name = protoMatch ? protoMatch[1].toLowerCase() : null;

    // Brand hashtag - last #NU or #NXT wins. Case-insensitive, may include suffix like #NU-institutional.
    const nuMatch = prompt.match(/#nu(?:[-_a-z0-9]*)?\b/i);
    const nxtMatch = prompt.match(/#nxt(?:[-_a-z0-9]*)?\b/i);
    let brand: ComposerBrand = 'nxt';
    if (nuMatch && nxtMatch) {
        // Use whichever appears LATER in the prompt
        brand = (nuMatch.index! > nxtMatch.index!) ? 'nu' : 'nxt';
    } else if (nuMatch) {
        brand = 'nu';
    } else if (nxtMatch) {
        brand = 'nxt';
    }
    // Default to NXT if no brand hashtag found
    return { has_proto, experience_name, brand, raw: prompt };
}

// ─────────────────────────────────────────────────────────
// Catalog loading (cached for session)
// ─────────────────────────────────────────────────────────
let cachedCatalog: CatalogShape | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const EVERGREEN_CATALOG_FALLBACK: CatalogShape = {
    version: 1,
    showcase_url: '/hic-workspace/wiki/inspiration-hub/ai-patterns/',
    total_patterns: 92,
    patterns: [],
    sections: [],
    brand_variants: {},
    composition_rules: {
        min_patterns_per_prototype: 8,
        max_patterns_per_prototype: 18,
        must_annotate_with: 'pattern-id comment per region',
        must_set_brand_attribute: 'data-brand="nxt" or data-brand="nu" on root',
        forbidden_when_catalog_pattern_exists: [
            'generic SaaS modal as primary surface',
            'tone slider + regenerate button as entire UX',
            'centered chat input bar with nothing else',
            'skeleton loaders without bound fetch + state',
            'clean modern aesthetic without brand commitment',
            'mixing NXT and NU tokens in single output',
            'thin tri-column bullet lists labeled "three people, three paths" instead of p-vignette-trio',
            'generic "pick a path" UX instead of p-portfolio-mix with live forecast readout',
            'abstract personas like "the student" instead of named protagonist with backstory',
        ],
    },
};

export async function loadCatalog(): Promise<CatalogShape> {
    if (cachedCatalog && (Date.now() - cachedAt) < CACHE_TTL_MS) return cachedCatalog;
    try {
        const resp = await fetch(CATALOG_URL, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        cachedCatalog = data as CatalogShape;
        cachedAt = Date.now();
        return cachedCatalog;
    } catch (err) {
        console.warn('[experiencePrototypeComposer] catalog load failed, using fallback', err);
        cachedCatalog = EVERGREEN_CATALOG_FALLBACK;
        cachedAt = Date.now();
        return cachedCatalog;
    }
}

// ─────────────────────────────────────────────────────────
// Brand language summary (for prompt injection)
// ─────────────────────────────────────────────────────────
function brandLanguage(brand: ComposerBrand): string {
    if (brand === 'nu') {
        return [
            'NU BRAND · Design System',
            '  Display: Spectral Light (300 weight) serif for hero, Spectral Semibold for anchors',
            '  Body: Roboto',
            '  Mono: Roboto Mono (tabular figures for data)',
            '  Ink: navy ink-900 #0B1326 and ink-800 #141D30',
            '  Accent: Huskies red #C8102E - used SPARINGLY only on key CTAs, deadlines, brand seals',
            '  Canvas: slate-50 #F8FAFC',
            '  Geometry: rounded 8px card corners, 4px inputs, 999px pills',
            '  Shadows: institutional soft (0 4px 12px rgba(11,19,38,0.08))',
            '  N logo: /hic-workspace/wiki/brand/northeastern-n.svg - render white on red 28px tile in brand-mark',
            '  Voice: research-librarian, institutional, restrained',
            '  data-brand attribute: "nu"',
        ].join('\n');
    }
    return [
        'NXT HUMANS · anti-slop editorial brutalism',
        '  Display: Bebas Neue ALL-CAPS geometric condensed sans',
        '  Body: Archivo humanist sans',
        '  Mono: JetBrains Mono (tabular figures for data)',
        '  Ink: pure black #0D0D0D headlines, #333333 body, #666666 secondary',
        '  Accent: chartreuse #B8B800 used SPARINGLY (<15% of surface), only on active states / CTAs',
        '  Secondary accent: cyan #00B7C3 for evidence panels',
        '  Canvas: near-white #FAFAFA or warm paper #F5F5F0',
        '  Geometry: SHARP 2px corner radii, 1px hairline rules, NO drop shadows, NO glows',
        '  Voice: editorial, front-page-of-the-FT density, every pixel earns its keep',
        '  data-brand attribute: "nxt"',
    ].join('\n');
}

// ─────────────────────────────────────────────────────────
// Pattern recommendation - given a concept, suggest catalog patterns
// ─────────────────────────────────────────────────────────
function tokenize(s: string): Set<string> {
    return new Set(
        (s || '').toLowerCase()
            .replace(/[^a-z0-9\s]+/g, ' ')
            .split(/\s+/)
            .filter(t => t.length >= 3),
    );
}

function recommendPatterns(catalog: CatalogShape, concept: string, k = 14): PatternEntry[] {
    if (!catalog.patterns || catalog.patterns.length === 0) return [];
    const conceptTokens = tokenize(concept);
    if (conceptTokens.size === 0) return catalog.patterns.slice(0, k);

    const scored = catalog.patterns.map(p => {
        const haystack = (p.name + ' ' + p.primitives.join(' ') + ' ' + p.best_for.join(' ')).toLowerCase();
        const tokens = tokenize(haystack);
        let overlap = 0;
        conceptTokens.forEach(t => { if (tokens.has(t)) overlap += 1; });
        return { p, score: overlap };
    });

    // If concept matches no patterns, return a balanced sample across sections
    if (scored.every(s => s.score === 0)) {
        const bySection = new Map<string, PatternEntry[]>();
        for (const p of catalog.patterns) {
            const list = bySection.get(p.section) || [];
            list.push(p);
            bySection.set(p.section, list);
        }
        const sample: PatternEntry[] = [];
        let idx = 0;
        const sections = Array.from(bySection.keys());
        while (sample.length < k && idx < 100) {
            for (const sec of sections) {
                const list = bySection.get(sec)!;
                const item = list[Math.floor(idx / sections.length)];
                if (item && !sample.find(s => s.id === item.id)) sample.push(item);
                if (sample.length >= k) break;
            }
            idx++;
        }
        return sample;
    }

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(s => s.p);
}

// ─────────────────────────────────────────────────────────
// PUBLIC - build the Stage 4 strict-rule injection block
// ─────────────────────────────────────────────────────────
export interface ComposerInjectionInput {
    /** Full user prompt (used to parse the hashtag) */
    prompt: string;
    /** Brief concept (used to suggest matching patterns) */
    concept: string;
    /** Optional: force a brand override (useful when called from non-chat contexts) */
    brand_override?: ComposerBrand;
}

export interface ComposerInjectionResult {
    /** The system-prompt injection text to prepend to Stage 4 */
    injection: string;
    /** Parsed hashtag info */
    hashtag: HashtagParsed;
    /** Suggested patterns the composer wants the coder to use */
    recommended_patterns: PatternEntry[];
    /** Whether the composer should activate (#proto present) */
    active: boolean;
}

export async function buildComposerInjection(input: ComposerInjectionInput): Promise<ComposerInjectionResult> {
    const hashtag = parseProtoHashtag(input.prompt);
    if (input.brand_override) {
        (hashtag as any).brand = input.brand_override;
    }
    const catalog = await loadCatalog();
    const recommended = recommendPatterns(catalog, input.concept || '', 8);

    // 2026-05-15 - Composer is now ALWAYS-ON for prototype generation.
    // Earlier we gated on `#proto` presence as an opt-in, but the user wants
    // intelligent catalog composition to be the default - every prototype the
    // pipeline ships should compose from the 77-pattern catalog, regardless
    // of whether the user typed `#proto` explicitly. The hashtag still
    // enriches the injection with the experience name + explicit brand pick,
    // but its absence no longer disables the strict-rule.

    const brand = hashtag.brand;
    const patternList = (catalog.patterns || []).map(p => p.id).join(', ');
    const recommendedLines = recommended.map(p =>
        `  - ${p.id}  (${p.name}, ${p.section})  - best for: ${p.best_for.join(' / ')}`
    ).join('\n');

    const lines = [
        '═════════════════════════════════════════════════════════════════',
        'EXPERIENCE PROTOTYPE COMPOSER - STRICT COMPOSITION RULE',
        '═════════════════════════════════════════════════════════════════',
        '',
        'You are NOT inventing UI. You are COMPOSING from a curated catalog.',
        '',
        `CATALOG: ${catalog.showcase_url || '/hic-workspace/wiki/inspiration-hub/ai-patterns/'}`,
        `         (${catalog.total_patterns || 92}+ hand-authored AI experience patterns in NXT and NU brands)`,
        '',
        `USER HASHTAG:     ${hashtag.raw.slice(0, 200)}`,
        `EXPERIENCE NAME:  ${hashtag.experience_name || '(none)'}`,
        `BRAND COMMITTED:  ${brand.toUpperCase()}`,
        '',
        '─── BRAND LANGUAGE (uniform throughout output) ───',
        brandLanguage(brand),
        '',
        '─── RULES (non-negotiable) ───',
        `  1. Every UI region MUST be a NAMED pattern from the catalog. Use the`,
        `     pattern's class root (p-chat, p-rec, p-dial, etc.) as the wrapper.`,
        '',
        `  2. Decompose the experience into a sequence of these primitives. Annotate`,
        `     each region in a leading comment:  <!-- pattern: p-chat -->`,
        '',
        `  3. Honor the brand uniformly. Set <html data-brand="${brand}">. NEVER mix`,
        `     NXT and NU tokens within one output.`,
        '',
        `  4. If no catalog pattern matches a region you want to build, you may NOT`,
        `     invent one. Pick the closest existing pattern OR omit the region and`,
        `     surface a "this experience needs a new pattern" note for the curator.`,
        '',
        `  5. Minimum ${catalog.composition_rules?.min_patterns_per_prototype || 8} distinct patterns per prototype.`,
        `     Maximum ${catalog.composition_rules?.max_patterns_per_prototype || 18}. Single-pattern outputs are demos, not experiences.`,
        `     8 is the FLOOR for a meaningful experience; aim for 12+ on any prototype that has`,
        `     stakes (career, money, healthcare, education). Compose patterns the way an FT`,
        `     front page composes stories - multiple modalities in service of one argument.`,
        '',
        `  6. Start your output with a PATTERN MANIFEST comment listing every`,
        `     catalog pattern used:`,
        `       // PATTERN MANIFEST: p-aspot.aspot-edu, p-kpi, p-time-machine, p-forecast-band,`,
        `       //                    p-portfolio-mix, p-vignette-trio, p-counterfactual, p-rec,`,
        `       //                    p-trail, p-dial, p-chat, p-trans, p-info-flow, p-cohort, p-hitl`,
        '',
        '─── DEEP SYNTHETIC DATA (NON-NEGOTIABLE - output is a CASE, not a placeholder) ───',
        `  7. NAMED PROTAGONIST: Every prototype MUST have a named user with backstory.`,
        `     "Sam Chen, CS '24, Mission Hill, $0 family contribution" - never "the user" or "a student".`,
        `     The brief tells you the domain; you must invent a concrete person + their stake.`,
        '',
        `  8. 12+ ANONYMIZED PEER RECORDS minimum. Use a real-looking ID scheme:`,
        `     NU contexts:  NUW-0247-K '21, NUW-0309-K '22, NUW-0418-K '20  (Wiki cohort code)`,
        `     NXT contexts: NXT-#A47, NXT-#B12, NXT-#C09  (NXT internal archetype code)`,
        `     Each record gets an archetype tag, a headline outcome stat, and 2-3 path-defining`,
        `     decisions. Render them in p-vignette-trio or p-cohort.`,
        '',
        `  9. CONCRETE NUMBERS ONLY - never "N%", "X students", "some users", "many alumni".`,
        `     Every callout is a real number: "11% → 64%", "47 W14 placements", "$78k median offer".`,
        `     Forecast bands must show P10/P50/P90 actual values, not generic "low/med/high".`,
        '',
        ` 10. STAKES + COUNTERFACTUAL: If the user is making any decision (apply where? major?`,
        `     accept which offer? donate how much? take which medication?), you MUST surface`,
        `     a p-counterfactual reveal showing the before/after probability shift in a single`,
        `     sentence, plus a 4-stat pull row. The reader should feel the cost of inaction.`,
        '',
        ` 11. EXEMPLAR REFERENCE: Three reference exemplars exist at`,
        `     /hic-workspace/wiki/inspiration-hub/exemplar-apps/`,
        `       talent-match-nu.html            (NU, 14 patterns, candidate match experience)`,
        `       footprint-library-nxt.html       (NXT, 13 patterns, data library experience)`,
        `       counterfactual-coop-nxt.html     (NXT, 18 patterns, time-machine + cohort reveal)`,
        `     Match or exceed the pattern density and data depth of the closest reference.`,
        '',
        ` 12. INTENT-DRIVEN PATTERN BUNDLES (apply when matching):`,
        `     User asks "what if I had...?" → MUST include p-time-machine + p-forecast-band + p-counterfactual.`,
        `     User asks "what should I do?" → MUST include p-portfolio-mix + p-vignette-trio + p-rec.`,
        `     User is making an irreversible choice → MUST include p-hitl approval gate.`,
        `     User is reviewing peer outcomes → MUST include p-cohort retention matrix + p-vignette-trio.`,
        '',
        ` 13. NO META PLACEHOLDERS in user-facing copy. Never write "Lorem ipsum",`,
        `     "Sample data", "Placeholder text", "TBD", "Evidence gap", "needs research"`,
        `     anywhere the reader sees. If you cannot write a real number, invent a plausible one`,
        `     consistent with the named protagonist and cohort.`,
        '',
        '─── LEGAL PATTERN IDs (the only allowed region wrappers) ───',
        '  ' + patternList,
        '',
        '─── RECOMMENDED PATTERNS FOR THIS BRIEF (matched by concept overlap) ───',
        recommendedLines || '  (no specific matches - sample across all sections)',
        '',
        '─── FORBIDDEN PATTERNS (will fail Stage 5 critic) ───',
        ...(catalog.composition_rules?.forbidden_when_catalog_pattern_exists || []).map(f => `  - ${f}`),
        '',
        '─── OUTPUT STRUCTURE ───',
        '  - <html data-brand="' + brand + '"> at the root',
        '  - // PATTERN MANIFEST: <comma-separated pattern ids>',
        '  - For each region:  <!-- pattern: p-XXX --><article class="p-XXX">...</article>',
        '  - Use the brand\'s typefaces by their EXACT names; do not approximate',
        '═════════════════════════════════════════════════════════════════',
    ];

    return {
        injection: lines.join('\n'),
        hashtag,
        recommended_patterns: recommended,
        active: true,
    };
}

/** Clear cached catalog (testing / forced refresh) */
export function clearComposerCache(): void {
    cachedCatalog = null;
    cachedAt = 0;
}
