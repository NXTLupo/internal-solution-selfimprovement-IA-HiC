/**
 * experiencePrototypeComposer - runtime implementation of the
 * `experience-prototype-composer` skill (.claude/skills/experience-prototype-composer/).
 *
 * ROLE (2026-06-26, converged): this module contributes the ADVISORY
 * decomposition + data-depth guidance for #proto - "what experience moments
 * could compose this brief" + "make it a deep, named CASE not a placeholder".
 * It is NOT the render vocabulary and NOT a token authority. Those are owned by:
 *   • the proto/<Name> component manifest (the FIGMA-registered bricks) - the
 *     single render vocabulary the orchestrator + pods compose from; and
 *   • the live FIGMA DESIGN TOKENS block (/api/design-tokens) - the single
 *     source of every color / font / size / radius.
 * Earlier this module asserted a competing `p-*` catalog as "the only allowed
 * region wrappers" and injected hardcoded (and stale) fonts. That contradicted
 * POD_ORCHESTRATOR_SYSTEM ("there is no p-* catalog; use proto/<Name>"), poisoned
 * the proto/<Name> fidelity check, and violated never-hardcode. Both removed.
 *
 * This module:
 *   1. Parses the user's hashtag - `#proto <experience-name> #NU | #NXT`
 *   2. Loads the catalog at runtime (cached for the session)
 *   3. Returns an advisory injection block: experience-moment names (by
 *      human-readable label, NOT class roots) + the deep-synthetic-data contract
 *
 * It composes WITH designExemplarCurator (Behance reference exemplars). Both
 * inject before the orchestrator: the curator says "study these source designs",
 * this module says "decompose into these kinds of experience moments and make the
 * data deep" - while deferring all render + token decisions to the manifest + tokens.
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
// Brand CHARACTER (qualitative only - NEVER a literal hex / font / size).
// 2026-06-26: the old brandLanguage() hardcoded fonts (Bebas Neue / Spectral /
// Roboto) and hexes. Those literals (a) violated the never-hardcode doctrine
// (UNIFIED_VISION 1b), (b) had gone STALE (NXT display is Saira Condensed, NU is
// single-typeface Lato), and (c) named fonts the /view render host does not even
// load (Saira/Archivo/Lato/IBM Plex Mono), so the model's font picks silently fell
// back to serif/sans. ALL color/font/size/radius now resolve from the live FIGMA
// DESIGN TOKENS block (injected alongside this preface) - this function carries
// only non-token brand CHARACTER (voice, accent restraint, geometry philosophy).
// ─────────────────────────────────────────────────────────
function brandCharacter(brand: ComposerBrand): string {
    if (brand === 'nu') {
        return [
            'NU brand character (resolve ALL color / font / size / radius from the FIGMA DESIGN TOKENS block - never a literal):',
            '  Voice: research-librarian, institutional, restrained, student-first, plain-spoken.',
            '  Accent (token color/accent, Northeastern red) used SPARINGLY - key CTAs, deadlines, brand seals only; never black-on-red, never flooded.',
            '  Single-typeface system: weight + size carry hierarchy (token font/*). Soft institutional geometry.',
            '  N monogram: /hic-workspace/wiki/brand/northeastern-n.svg.',
            '  Root attribute: data-brand="nu".',
        ].join('\n');
    }
    return [
        'NXT brand character (resolve ALL color / font / size / radius from the FIGMA DESIGN TOKENS block - never a literal):',
        '  Voice: editorial, front-page-of-the-FT density, restrained, declarative; every pixel earns its keep.',
        '  Accent (token color/accent, chartreuse) used SPARINGLY (<15% of surface) on active states / CTAs; cyan (token color/cyan) for evidence/cool panels.',
        '  Condensed display + humanist body + mono for data (token font/display, font/body, font/mono). Sharp geometry, hairline rules, no decorative shadows / glows.',
        '  Root attribute: data-brand="nxt".',
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
    // 2026-06-26 — Advisory experience-moment names ONLY. These are NOT CSS class
    // roots and NOT a render vocabulary. The render vocabulary is the proto/<Name>
    // component manifest (the FIGMA-registered bricks), injected separately. The
    // catalog patterns below are decomposition INSPIRATION: "what experience moments
    // could compose this", expressed by human-readable name + best-for.
    const recommendedLines = recommended.map(p =>
        `  - ${p.name}  (${p.section})  - fits: ${p.best_for.join(' / ')}`
    ).join('\n');

    const lines = [
        '═════════════════════════════════════════════════════════════════',
        'EXPERIENCE DECOMPOSITION + DATA-DEPTH GUIDE  (advisory)',
        '═════════════════════════════════════════════════════════════════',
        '',
        'You are COMPOSING a brand-correct experience. Two things are load-bearing and',
        'live elsewhere in this prompt - this block does NOT override them:',
        '  • RENDER VOCABULARY = the proto/<Name> component manifest (the FIGMA-registered',
        '    bricks). Build every region from a proto/<Name> component, following its',
        '    documented anatomy. Do NOT invent UI shapes.',
        '  • DESIGN TOKENS = the FIGMA DESIGN TOKENS block. Resolve EVERY color / font /',
        '    size / radius from a token (var(--color/*), var(--font/*), token-driven',
        '    utility classes). NEVER a literal hex or font name.',
        'The experience-pattern names below are DECOMPOSITION INSPIRATION only - they are',
        'NOT CSS class names, NOT a competing vocabulary, and NOT scored against the build.',
        '',
        `USER HASHTAG:     ${hashtag.raw.slice(0, 200)}`,
        `EXPERIENCE NAME:  ${hashtag.experience_name || '(none)'}`,
        `BRAND COMMITTED:  ${brand.toUpperCase()}`,
        '',
        '─── BRAND CHARACTER (qualitative; values come from the FIGMA tokens) ───',
        brandCharacter(brand),
        '',
        '─── DEEP SYNTHETIC DATA (a prototype is a CASE, not a placeholder) ───',
        `  1. NAMED PROTAGONIST: every prototype has a named user with a backstory and a`,
        `     concrete stake (e.g. "Sam Chen, CS '24, Mission Hill, $0 family contribution"),`,
        `     never "the user" or "a student". The brief gives the domain; invent the person.`,
        '',
        `  2. 12+ ANONYMIZED PEER RECORDS using a real-looking id scheme; each gets an`,
        `     archetype tag, a headline outcome, and 2-3 path-defining decisions. Render them`,
        `     in a cohort / vignette-trio moment built from proto/<Name> components.`,
        '',
        `  3. CONCRETE, SPECIFIC DATA - never "N%", "X students", "some users". A demo`,
        `     prototype shows real-looking values consistent with the named protagonist and`,
        `     cohort (this is fiction in service of a demo, not an evidence claim).`,
        '',
        `  4. STAKES + COUNTERFACTUAL: if the protagonist is making a decision, surface a`,
        `     before/after shift and a short pull-stat row so the reader feels the cost of`,
        `     inaction. Build it from the relevant proto/<Name> components.`,
        '',
        `  5. NO META PLACEHOLDERS in user-facing copy: never "Lorem ipsum", "Sample data",`,
        `     "Placeholder", "TBD", or QA-style annotations where the reader sees them.`,
        '',
        ` EXEMPLAR REFERENCES (study for pattern density + data depth, not for tokens):`,
        `   /hic-workspace/wiki/inspiration-hub/exemplar-apps/  (talent-match-nu, footprint-library-nxt, counterfactual-coop-nxt)`,
        '',
        ' INTENT-DRIVEN EXPERIENCE MOMENTS (advisory - include the moment, render via proto/<Name>):',
        `   "what if I had...?"            -> a time-machine / forecast-band / counterfactual moment`,
        `   "what should I do?"            -> a portfolio / peer-vignette / recommendation moment`,
        `   an irreversible choice         -> a human-in-the-loop approval gate`,
        `   reviewing peer outcomes        -> a cohort matrix + peer-vignette moment`,
        '',
        '─── EXPERIENCE MOMENTS THAT MAY FIT THIS BRIEF (advisory, by name) ───',
        recommendedLines || '  (no specific matches - decompose from the brief + manifest categories)',
        '',
        '─── GENERIC SHELLS TO AVOID ───',
        ...(catalog.composition_rules?.forbidden_when_catalog_pattern_exists || []).map(f => `  - ${f}`),
        '',
        '─── OUTPUT ───',
        `  - data-brand="${brand}" on the root.`,
        '  - Every region is a proto/<Name> component from the manifest, styled only from tokens.',
        '  - Declare the components you used in the PROTO COMPONENTS: line the orchestrator/pod prompt specifies.',
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
