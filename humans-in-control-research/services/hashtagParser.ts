// hashtagParser.ts
//
// Detects #presentation directives in user chat messages and extracts the
// brand variant, theme, and any modifier hashtags. The parser does NOT
// consume the rest of the message - it only extracts directives. The
// stripped message (hashtags removed) is returned as `narrativeRequest`
// for handing to the narrative composer.
//
// Supported directives:
//   #presentation            - required trigger
//   #NXT                     - brand: NXT Humans (default)
//   #NU                      - brand: Northeastern University
//   #dark                    - theme: dark (default)
//   #light                   - theme: light
//   #model=gpt5.5            - alias for gpt-5.5 (default 2026-05-03)
//   #model=gemini            - opt into gemini-3.1-pro-preview (currently
//                              produces empty section data - schema bug;
//                              kept for follow-up testing only)
//
// 2026-05-03 - Claude / Opus aliases removed on this branch. Only Google
// (Gemini) and OpenAI (GPT-5.5) composer models are accepted.
// Default flipped to GPT-5.5 because Gemini's OpenAI-compat function-calling
// emits empty `data: {}` for sections (loose-schema serialization bug).
//   #hero="Custom Headline." - override the composed hero title
//   #sections=themes,personas,recs   - restrict to listed section kinds
//   #preview                 - render but do not persist (ephemeral)
//   #export-pptx             - also produce matching .pptx via exportService
//   #auto-open               - synchronous window.open() workaround for popups

import type { BrandVariant, ThemeMode, SectionKind } from './presentationTypes';
import { CLAUDE_REASONING_MODEL } from './claudeModelPolicy';
import {
  ARTIFACT_CATALOG,
  CATALOG_MODIFIERS,
  catalogDirectiveRegex,
  catalogEntryFor,
  isCatalogModifier,
  matchCatalogDirectives,
  primaryCatalogHit,
  type CatalogHit,
} from './artifactCatalog';

// Stage 6.2 (2026-10-01, finding A2): every directive regex in this file is GENERATED from
// services/artifactCatalog.ts with a word boundary on both sides, and routing is multi-hit:
// `parseDirectiveHits` returns every catalog entry a message names; `routeDirective` returns
// the one whose quality bar decides the model. No hand-written `/#compet/i` style prefixes.

/** Every catalog directive the message names, in document order (one hit per entry). */
export function parseDirectiveHits(message: string): CatalogHit[] {
  return matchCatalogDirectives(message);
}

/** The hit that decides routing for a mixed request (highest routing rank, then document order). */
export function routeDirective(message: string): CatalogHit | null {
  return primaryCatalogHit(message);
}

/** True when the message carries the modifier token as a whole tag (`#slides`, `#dense`, `#NU`). */
export function hasModifier(message: string, token: string): boolean {
  if (!isCatalogModifier(token)) return false;
  return hasFlag(message, token.startsWith('#') ? token : `#${token}`);
}

/** Split the hashtags in a message into catalog directives, modifiers, and unknown tags. */
export function classifyHashtags(message: string): { directives: CatalogHit[]; modifiers: string[]; unknown: string[] } {
  const directives = matchCatalogDirectives(message);
  const known = new Set(directives.map(h => h.alias));
  const modifiers: string[] = [];
  const unknown: string[] = [];
  for (const m of String(message || '').matchAll(/(?<![\w#-])#[a-z][a-z0-9-]*(?:=(?:"[^"]*"|'[^']*'|\S+))?/gi)) {
    const raw = m[0];
    const bare = raw.replace(/=.*$/, '').toLowerCase();
    if (known.has(bare)) continue;
    if (isCatalogModifier(raw)) { if (!modifiers.includes(bare)) modifiers.push(bare); continue; }
    if (!unknown.includes(bare)) unknown.push(bare);
  }
  return { directives, modifiers, unknown };
}

// 2026-05-07 - Composer migrated to Gemini 3.1 Pro. DeepSeek V4 Flash
// produced jargon-heavy, hyperbolic, AI-slop narratives; Gemini 3.1 Pro at
// 1M context follows multi-step rules reliably and produces descriptive,
// professional prose. Composer routes via /api/ai/gemini-compat (Google's
// OpenAI-compatible endpoint), so the discriminated-union schema keeps
// working unchanged. Legacy DeepSeek IDs retained for forward-compat.
// 2026-10-05 owner rule: flash is for SPEED, Opus 5.5 is for REASONING. A presentation is a reasoning deliverable, so
// the composer DEFAULT is the Claude reasoning model; an explicit #model=flash/pro/deepseek is still honored.
export type ComposerModelChoice = typeof CLAUDE_REASONING_MODEL | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'deepseek-v4-flash' | 'deepseek-v4-pro';

export interface PresentationDirective {
  triggered: boolean;
  brand: BrandVariant;
  theme: ThemeMode;
  model: ComposerModelChoice;
  heroOverride?: string;
  sectionFilter?: SectionKind[];
  ephemeral: boolean;
  alsoExportPptx: boolean;
  autoOpen: boolean;
  /**
   * The user's narrative request with all known directive hashtags removed.
   * This is the verbatim thesis handed to the composer. Unknown hashtags
   * (e.g. domain tags like #fundraising) are intentionally preserved -
   * they may be part of the thesis the user wants the composer to address.
   */
  narrativeRequest: string;
}

// Regex helpers - case-insensitive.
// Brand tags (#NU, #NXT) match even when the user types possessive-without-
// apostrophe ("#NUs"), with apostrophe ("#NU's"), or with trailing punctuation
// ("#NU,"). They do NOT match mid-word ("#NUmber" is not #NU).
// Other tags require a word-boundary (so "#presentationally" doesn't match).
/**
 * ONE brand resolver for every directive (#presentation, #proto, HTML artifacts, slides):
 * `#DECIEM` → DECIEM, `#NU` → NU, otherwise NXT. Case-insensitive, possessive-tolerant
 * (#NU's). Mirrors brands.normalizeBrandId; keep the two in sync when a brand is added.
 */
export function brandVariantOf(message: string): BrandVariant {
  if (hasFlag(message, '#DECIEM')) return 'DECIEM';
  if (hasFlag(message, '#NU')) return 'NU';
  return 'NXT';
}

function hasFlag(message: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isBrandTag = /^#(NU|NXT|DECIEM)$/i.test(tag);
  // Brand tag: optionally consume 's or s, then forbid any further letter
  const trailing = isBrandTag ? `(?:'?s)?(?![A-Za-z])` : `(?=\\s|$|[.,;:!?'"])`;
  return new RegExp(`(?:^|\\s)${escaped}${trailing}`, 'i').test(message);
}

function extractValue(message: string, key: string): string | undefined {
  // Handles #key=value with optional quoted value: #hero="Some Title."
  const re = new RegExp(`#${key}=(?:"([^"]+)"|'([^']+)'|([^\\s]+))`, 'i');
  const m = message.match(re);
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3];
}

function stripDirectives(message: string): string {
  // Remove all known directive hashtags - leave domain/topic hashtags intact.
  // Brand tags swallow trailing 's or s (so "frame #NUs challenges" becomes
  // "frame challenges" rather than "frame s challenges").
  // Generated from the catalog: the #presentation directive, both brand tags, and every
  // modifier in CATALOG_MODIFIERS (value-taking ones consume their quoted or bare value).
  const knownDirectives: RegExp[] = [
    catalogDirectiveRegex(['#presentation', '#presentations'], 'gi'),
    /#NXT(?:'?s)?(?![A-Za-z])/gi,
    /#NU(?:'?s)?(?![A-Za-z])/gi,
  ];
  for (const mod of CATALOG_MODIFIERS) {
    if (mod.kind === 'brand') continue;
    const escaped = mod.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    knownDirectives.push(mod.takesValue
      ? new RegExp(`${escaped}=(?:"[^"]+"|'[^']+'|\\S+)`, 'gi')
      : new RegExp(`(?<![\\w#-])${escaped}(?![\\w-])`, 'gi'));
  }
  let out = message;
  for (const re of knownDirectives) {
    out = out.replace(re, '');
  }
  return out.replace(/\s+/g, ' ').trim();
}

const KNOWN_SECTION_KINDS: ReadonlySet<SectionKind> = new Set([
  'hero', 'context', 'themes', 'evidence', 'quotes',
  'personas', 'journey', 'recommendations', 'roadmap',
  'gap_analysis', 'tech_arch', 'team', 'competitive', 'cta',
]);

function parseSectionFilter(raw: string | undefined): SectionKind[] | undefined {
  if (!raw) return undefined;
  const tokens = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const valid: SectionKind[] = [];
  for (const t of tokens) {
    // Allow common shorthand: "recs" → "recommendations"
    const canonical = t === 'recs' ? 'recommendations'
      : t === 'gap' ? 'gap_analysis'
      : t === 'tech' || t === 'arch' ? 'tech_arch'
      : (t as SectionKind);
    if (KNOWN_SECTION_KINDS.has(canonical)) valid.push(canonical);
  }
  return valid.length > 0 ? valid : undefined;
}

function parseModel(raw: string | undefined): ComposerModelChoice {
  // 2026-05-27 - Composer DEFAULT is now Gemini 3.5 Flash. The composer's
  // `submit_presentation` section schema was flattened (oneOf → merged
  // permissive object, narrativeComposerTools.ts) so Google's OpenAI-compat
  // layer accepts it. Gemini is funded + healthy + NOT Azure-content-filtered,
  // whereas Azure DeepSeek content-filters this corpus (400 block) and the
  // OpenAI account is out of quota. So Gemini is the reliable backend now.
  // Explicit DeepSeek requests are still honored (the user's choice), but they
  // remain content-filter-prone.
  if (!raw) return CLAUDE_REASONING_MODEL;
  const v = raw.toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (v === 'geminipro' || v === 'gemini31' || v === 'gemini31propreview' || v === 'gemini-3.1-pro-preview' || v === 'pro') {
    return 'gemini-3.1-pro-preview';
  }
  if (v === 'gemini' || v === 'gemini3' || v === 'flash' || v === 'geminiflash' || v === 'gemini35' || v === 'gemini35flash' || v === 'gemini-3.5-flash') {
    return 'gemini-3.5-flash';
  }
  if (v === 'deepseek' || v === 'v4' || v === 'deepseekv4flash' || v === 'deepseek-v4-flash') {
    return 'deepseek-v4-flash';
  }
  if (v === 'deepseekpro' || v === 'v4pro' || v === 'deepseekv4pro' || v === 'deepseek-v4-pro') {
    return 'deepseek-v4-pro';
  }
  return CLAUDE_REASONING_MODEL;
}

/**
 * Parse a chat message for presentation directives. Returns a directive
 * object with `triggered: false` if `#presentation` is not present -
 * callers should branch on this and proceed with normal chat flow when
 * untriggered.
 */
export function parsePresentationDirective(message: string): PresentationDirective {
  const triggered = catalogDirectiveRegex(['#presentation']).test(message);

  if (!triggered) {
    return {
      triggered: false,
      brand: 'NXT',
      theme: 'dark',
      model: 'deepseek-v4-flash',
      ephemeral: false,
      alsoExportPptx: false,
      autoOpen: false,
      narrativeRequest: message,
    };
  }

  const brand: BrandVariant = brandVariantOf(message);
  // Theme default is brand-aware:
  //   NXT  → dark (chartreuse on near-black)
  //   NU   → light (Huskies red on stark white per the NU brand spec)
  // Explicit #dark or #light always wins.
  const explicitDark = hasFlag(message, '#dark');
  const explicitLight = hasFlag(message, '#light');
  const theme: ThemeMode = explicitLight ? 'light'
    : explicitDark ? 'dark'
    : (brand === 'NU' ? 'light' : 'dark');
  const model = parseModel(extractValue(message, 'model'));
  const heroOverride = extractValue(message, 'hero');
  const sectionFilter = parseSectionFilter(extractValue(message, 'sections'));
  const ephemeral = hasFlag(message, '#preview');
  const alsoExportPptx = hasFlag(message, '#export-pptx');
  const autoOpen = hasFlag(message, '#auto-open');

  const narrativeRequest = stripDirectives(message);

  return {
    triggered: true,
    brand,
    theme,
    model,
    heroOverride,
    sectionFilter,
    ephemeral,
    alsoExportPptx,
    autoOpen,
    narrativeRequest,
  };
}

// 2026-05-11 (HiC-Experience-Designer) - #proto directive.
// `#proto <free-form concept>` triggers the 5-stage builder pipeline.
// `#proto #NXT` / `#proto #NU` selects the brand. Default NXT.
export interface PrototypeDirective {
  triggered: boolean;
  brand: BrandVariant;
  concept: string;        // the user's free-form text, brand tags stripped
  basedOn?: string;       // optional "#name=<recommendation slug>" hint
}

export function parsePrototypeDirective(message: string): PrototypeDirective {
  // Match `#proto` as a whole tag (catalog word boundary) so it never collides with `#prototypes`
  const triggered = catalogDirectiveRegex(['#proto']).test(message);
  if (!triggered) {
    return { triggered: false, brand: 'NXT', concept: '' };
  }
  const brand: BrandVariant = brandVariantOf(message);
  // basedOn lets the chat reference a specific recommendation slug
  const basedOn = extractValue(message, 'name') || extractValue(message, 'rec') || undefined;
  // Strip the directive markers from the message to get the clean concept text
  const concept = message
    .replace(catalogDirectiveRegex(['#proto'], 'gi'), ' ')
    .replace(/#NXT|#NU/gi, ' ')
    .replace(/#name=\S+/gi, ' ')
    .replace(/#rec=\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { triggered: true, brand, concept, basedOn };
}

// 2026-05-12 (Sprint H2 + H4) - HTML deliverable directives.
// `#brief`, `#explainer`, `#report`, `#playground`, `#approaches` all
// produce HTML artifacts via /api/artifacts. `#artifacts` (plural) lists
// the library. `#help` produces the hashtag reference guide. `#refine`
// targets an existing artifact slug. All accept `--variants k` (2-6).

// 2026-05-23 - P1.5 (Sprint H3): added `#whitepaper` for the strategic-report
// HTML output. The previous strategic-report pipeline emitted slide-deck JSON
// only; the whitepaper directive composes a consulting-grade HTML long-form
// document using the same html-deliverable-composer skill plus a whitepaper-
// specific structural prompt overlay.
// 2026-11-03 - NotebookLM Studio formats (#faq, #studyguide, #chronology, #flashcards, #quiz,
// #datatable, #critique) per plans/notebooklm-studio-reverse-engineering-2026-11-03.md W3.
export type ArtifactGenerator = '#brief' | '#explainer' | '#report' | '#playground' | '#approaches' | '#whitepaper' | '#questionnaire' | '#prd'
    | '#faq' | '#studyguide' | '#chronology' | '#flashcards' | '#quiz' | '#datatable' | '#critique';

export interface ArtifactDirective {
    triggered: boolean;
    generator: ArtifactGenerator;
    topic: string;            // user's free-form topic with directive + brand tags stripped
    brand: BrandVariant;
    variants: number;         // 1 (default) or 2-6 if --variants k specified
}

function parseVariantsModifier(message: string): number {
    const m = message.match(/--variants[=\s]+(\d+)/i);
    if (!m) return 1;
    const k = parseInt(m[1], 10);
    if (isNaN(k) || k < 2) return 1;
    return Math.min(k, 6);
}

function stripArtifactCommon(message: string): string {
    return message
        .replace(/#NXT(?:'?s)?(?![A-Za-z])/gi, ' ')
        .replace(/#NU(?:'?s)?(?![A-Za-z])/gi, ' ')
        .replace(/--variants[=\s]+\d+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Reader-facing label per HTML generator (the chat's "Generating <label>..." line). */
const HTML_GENERATOR_LABELS: Record<ArtifactGenerator, string> = {
    '#brief': 'stakeholder brief',
    '#explainer': 'concept explainer',
    '#report': 'strategic report',
    '#playground': 'interactive playground',
    '#approaches': 'approaches picker',
    '#whitepaper': 'consulting whitepaper',
    '#questionnaire': 'stakeholder questionnaire',
    '#prd': 'product requirements document',
    '#faq': 'FAQ document',
    '#studyguide': 'study guide',
    '#chronology': 'source chronology',
    '#flashcards': 'flashcard set',
    '#quiz': 'knowledge quiz',
    '#datatable': 'evidence data table',
    '#critique': 'evidence critique',
};

/** The typed aliases that trigger one HTML generator. `#whitepaper` is its own generator inside the report
 *  entry, so `#report` must not trigger it and vice versa: each generator owns every alias of its entry
 *  except the aliases that belong to another generator of the same entry (and their plurals). */
function generatorAliases(token: ArtifactGenerator): string[] {
    const entry = catalogEntryFor(token);
    if (!entry) return [token];
    const others = entry.aliases.filter(a => a !== token && a in HTML_GENERATOR_LABELS);
    const own = entry.aliases.filter(a => !others.some(g => a === g || a === `${g}s`));
    return own.length ? own : [token];
}

function buildArtifactParser(token: ArtifactGenerator) {
    // Word-boundary regex generated from the catalog: #report never trips on
    // "#reporting", #brief never trips on "#brief-dialog" or "#debriefing".
    const re = catalogDirectiveRegex(generatorAliases(token));
    const reAll = catalogDirectiveRegex(generatorAliases(token), 'gi');
    return (message: string): ArtifactDirective => {
        const triggered = re.test(message);
        if (!triggered) {
            return { triggered: false, generator: token, topic: '', brand: 'NXT', variants: 1 };
        }
        const brand: BrandVariant = brandVariantOf(message);
        const variants = parseVariantsModifier(message);
        const topic = stripArtifactCommon(message.replace(reAll, ' '));
        return { triggered: true, generator: token, topic, brand, variants };
    };
}

/**
 * GENERATED from the catalog: every HTML-modality directive, in catalog order, with its parser and label.
 * CorpusChatPanel iterates this instead of a hand-kept list, so a new HTML directive added to the catalog
 * reaches the HTML pipeline without a panel edit (the coverage test asserts the set matches).
 */
export const HTML_ARTIFACT_PARSERS: Array<{ generator: ArtifactGenerator; label: string; parser: (message: string) => ArtifactDirective }> = (() => {
    const out: Array<{ generator: ArtifactGenerator; label: string; parser: (message: string) => ArtifactDirective }> = [];
    const seen = new Set<string>();
    for (const e of ARTIFACT_CATALOG) {
        if (e.modality !== 'html') continue;
        for (const a of e.aliases) {
            const gen = a as ArtifactGenerator;
            if (!(gen in HTML_GENERATOR_LABELS) || seen.has(gen)) continue;
            seen.add(gen);
            out.push({ generator: gen, label: HTML_GENERATOR_LABELS[gen], parser: buildArtifactParser(gen) });
        }
    }
    return out;
})();

/** First HTML generator the message triggers, in catalog order, or null. */
export function parseHtmlArtifactDirective(message: string): { directive: ArtifactDirective; label: string } | null {
    for (const ap of HTML_ARTIFACT_PARSERS) {
        const d = ap.parser(message);
        if (d.triggered) return { directive: d, label: ap.label };
    }
    return null;
}

// 2026-06-26 - #img visual-routing override (visualRouter.ts / nano-banana designer plan C2+C6).
// Lets the user PIN which branch fills a deliverable's image slot, overriding the auto router:
//   #img=diagram   -> deterministic vizEngine (content-true data diagram, $0, exact labels)
//   #img=generate  -> the brand-locked Nano-Banana designer skill (emotive/conceptual art)
//   #img=icon      -> a tokenized industry/content GLYPH from the icon library (deterministic, $0)
//   #img=none      -> suppress slot art entirely
// Bare-flag aliases are accepted too (#img-diagram / #img-generate / #img-icon / #no-image).
// Returns undefined when the user did not pin a branch (router auto-decides per the GOLD audit).
export type ImgDirective = 'diagram' | 'generate' | 'icon' | 'none';
export function parseImgDirective(message: string): ImgDirective | undefined {
    const m = message || '';
    const val = (extractValue(m, 'img') || '').toLowerCase();
    if (/^(diagram|viz|chart|data)$/.test(val)) return 'diagram';
    if (/^(generate|gen|illustrate|art|image|emotive)$/.test(val)) return 'generate';
    if (/^(icon|glyph|mark)$/.test(val)) return 'icon';
    if (/^(none|off|no|skip)$/.test(val)) return 'none';
    // bare-flag aliases (word-boundary so #no-image doesn't trip on substrings)
    if (/(?:^|\s)#(?:img-none|no-image|noimage)(?=\s|$|[.,;:!?'"])/i.test(m)) return 'none';
    if (/(?:^|\s)#(?:img-diagram)(?=\s|$|[.,;:!?'"])/i.test(m)) return 'diagram';
    if (/(?:^|\s)#(?:img-generate|generate-image)(?=\s|$|[.,;:!?'"])/i.test(m)) return 'generate';
    if (/(?:^|\s)#(?:img-icon)(?=\s|$|[.,;:!?'"])/i.test(m)) return 'icon';
    return undefined;
}

/** Help directive - bare hashtag, no topic needed. */
export function parseHelpDirective(message: string): { triggered: boolean } {
    return { triggered: catalogDirectiveRegex(['#help']).test(message) };
}

/** Artifact library directive - bare hashtag. */
export function parseArtifactsLibraryDirective(message: string): { triggered: boolean } {
    return { triggered: catalogDirectiveRegex(['#artifacts']).test(message) };
}

/** Refine directive - targets an existing slug. */
export interface RefineDirective {
    triggered: boolean;
    slug: string;             // the slug to refine
    instruction: string;      // the user's tweak instruction
}
export function parseRefineDirective(message: string): RefineDirective {
    // Match: #refine <slug>[: <instruction>]
    //        or #refine #name=<slug> <instruction>
    const m = message.match(/(?:^|\s)#refine\s+(?:#name=)?([a-z0-9_-]+)(?:\s*[:\-]\s*(.+))?/i);
    if (!m) return { triggered: false, slug: '', instruction: '' };
    return {
        triggered: true,
        slug: (m[1] || '').toLowerCase().trim(),
        instruction: (m[2] || '').trim(),
    };
}
