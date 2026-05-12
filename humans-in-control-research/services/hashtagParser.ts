// hashtagParser.ts
//
// Detects #presentation directives in user chat messages and extracts the
// brand variant, theme, and any modifier hashtags. The parser does NOT
// consume the rest of the message — it only extracts directives. The
// stripped message (hashtags removed) is returned as `narrativeRequest`
// for handing to the narrative composer.
//
// Supported directives:
//   #presentation            — required trigger
//   #NXT                     — brand: NXT Humans (default)
//   #NU                      — brand: Northeastern University
//   #dark                    — theme: dark (default)
//   #light                   — theme: light
//   #model=gpt5.5            — alias for gpt-5.5 (default 2026-05-03)
//   #model=gemini            — opt into gemini-3.1-pro-preview (currently
//                              produces empty section data — schema bug;
//                              kept for follow-up testing only)
//
// 2026-05-03 — Claude / Opus aliases removed on this branch. Only Google
// (Gemini) and OpenAI (GPT-5.5) composer models are accepted.
// Default flipped to GPT-5.5 because Gemini's OpenAI-compat function-calling
// emits empty `data: {}` for sections (loose-schema serialization bug).
//   #hero="Custom Headline." — override the composed hero title
//   #sections=themes,personas,recs   — restrict to listed section kinds
//   #preview                 — render but do not persist (ephemeral)
//   #export-pptx             — also produce matching .pptx via exportService
//   #auto-open               — synchronous window.open() workaround for popups

import type { BrandVariant, ThemeMode, SectionKind } from './presentationTypes';

// 2026-05-07 — Composer migrated to Gemini 3.1 Pro. DeepSeek V4 Flash
// produced jargon-heavy, hyperbolic, AI-slop narratives; Gemini 3.1 Pro at
// 1M context follows multi-step rules reliably and produces descriptive,
// professional prose. Composer routes via /api/ai/gemini-compat (Google's
// OpenAI-compatible endpoint), so the discriminated-union schema keeps
// working unchanged. Legacy DeepSeek IDs retained for forward-compat.
export type ComposerModelChoice = 'gemini-3.1-pro-preview' | 'deepseek-v4-flash' | 'deepseek-v4-pro';

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
   * (e.g. domain tags like #fundraising) are intentionally preserved —
   * they may be part of the thesis the user wants the composer to address.
   */
  narrativeRequest: string;
}

// Regex helpers — case-insensitive.
// Brand tags (#NU, #NXT) match even when the user types possessive-without-
// apostrophe ("#NUs"), with apostrophe ("#NU's"), or with trailing punctuation
// ("#NU,"). They do NOT match mid-word ("#NUmber" is not #NU).
// Other tags require a word-boundary (so "#presentationally" doesn't match).
function hasFlag(message: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isBrandTag = /^#(NU|NXT)$/i.test(tag);
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
  // Remove all known directive hashtags — leave domain/topic hashtags intact.
  // Brand tags swallow trailing 's or s (so "frame #NUs challenges" becomes
  // "frame challenges" rather than "frame s challenges").
  const knownDirectives = [
    /#presentation\b/gi,
    /#NXT(?:'?s)?(?![A-Za-z])/gi,
    /#NU(?:'?s)?(?![A-Za-z])/gi,
    /#dark\b/gi,
    /#light\b/gi,
    /#preview\b/gi,
    /#export-pptx\b/gi,
    /#auto-open\b/gi,
    /#model=(?:"[^"]+"|'[^']+'|\S+)/gi,
    /#hero=(?:"[^"]+"|'[^']+'|\S+)/gi,
    /#sections=(?:"[^"]+"|'[^']+'|\S+)/gi,
  ];
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
  // 2026-05-08 — Composer model REVERTED to DeepSeek V4 Flash. The composer's
  // `submit_presentation` tool schema uses `oneOf` discriminated unions
  // (narrativeComposerTools.ts:532) which Google's Gemini OpenAI-compat
  // endpoint rejects with INVALID_ARGUMENT 400. The strict schema was tuned
  // for Azure DeepSeek and never validated against Gemini-compat. Until the
  // schema is rewritten with Gemini-compatible JSON Schema (or the composer
  // is ported to Gemini's native function-calling), DeepSeek is the only
  // working backend for `#presentation`. The AI Analyst chat (gemini-3.1-pro
  // -preview) is unaffected — chat messages don't use the discriminated-union
  // schema.
  if (!raw) return 'deepseek-v4-flash';
  const v = raw.toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (v === 'gemini' || v === 'gemini3' || v === 'gemini31' || v === 'gemini31propreview' || v === 'gemini-3.1-pro-preview') {
    // Gemini composer is currently broken (oneOf schema). Caller asked for it
    // explicitly — log and fall back to DeepSeek so the deck still composes.
    console.warn('[composer] #model=gemini requested but composer schema not yet Gemini-compatible — using deepseek-v4-flash. See narrativeComposerTools.ts:526.');
    return 'deepseek-v4-flash';
  }
  if (v === 'deepseek' || v === 'v4' || v === 'flash' || v === 'deepseekv4flash' || v === 'deepseek-v4-flash' || v === 'pro' || v === 'deepseekpro' || v === 'v4pro' || v === 'deepseekv4pro' || v === 'deepseek-v4-pro') {
    return 'deepseek-v4-flash';
  }
  return 'deepseek-v4-flash';
}

/**
 * Parse a chat message for presentation directives. Returns a directive
 * object with `triggered: false` if `#presentation` is not present —
 * callers should branch on this and proceed with normal chat flow when
 * untriggered.
 */
export function parsePresentationDirective(message: string): PresentationDirective {
  const triggered = hasFlag(message, '#presentation');

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

  const brand: BrandVariant = hasFlag(message, '#NU') ? 'NU' : 'NXT';
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

// 2026-05-11 (HiC-Experience-Designer) — #proto directive.
// `#proto <free-form concept>` triggers the 5-stage builder pipeline.
// `#proto #NXT` / `#proto #NU` selects the brand. Default NXT.
export interface PrototypeDirective {
  triggered: boolean;
  brand: BrandVariant;
  concept: string;        // the user's free-form text, brand tags stripped
  basedOn?: string;       // optional "#name=<recommendation slug>" hint
}

export function parsePrototypeDirective(message: string): PrototypeDirective {
  // Match `#proto` as standalone word so it doesn't collide with `#prototypes`
  const triggered = /(?:^|\s)#proto(?=\s|$|[.,;:!?'"])/i.test(message);
  if (!triggered) {
    return { triggered: false, brand: 'NXT', concept: '' };
  }
  const brand: BrandVariant = hasFlag(message, '#NU') ? 'NU' : 'NXT';
  // basedOn lets the chat reference a specific recommendation slug
  const basedOn = extractValue(message, 'name') || extractValue(message, 'rec') || undefined;
  // Strip the directive markers from the message to get the clean concept text
  const concept = message
    .replace(/(?:^|\s)#proto(?=\s|$|[.,;:!?'"])/gi, ' ')
    .replace(/#NXT|#NU/gi, ' ')
    .replace(/#name=\S+/gi, ' ')
    .replace(/#rec=\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { triggered: true, brand, concept, basedOn };
}

// 2026-05-12 (Sprint H2 + H4) — HTML deliverable directives.
// `#brief`, `#explainer`, `#report`, `#playground`, `#approaches` all
// produce HTML artifacts via /api/artifacts. `#artifacts` (plural) lists
// the library. `#help` produces the hashtag reference guide. `#refine`
// targets an existing artifact slug. All accept `--variants k` (2-6).

export type ArtifactGenerator = '#brief' | '#explainer' | '#report' | '#playground' | '#approaches';

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

function buildArtifactParser(token: ArtifactGenerator) {
    return (message: string): ArtifactDirective => {
        // Match the token as a standalone word so #report doesn't trip on
        // "reporting" and #brief doesn't trip on "debriefing".
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$|[.,;:!?'"])`, 'i');
        const triggered = re.test(message);
        if (!triggered) {
            return { triggered: false, generator: token, topic: '', brand: 'NXT', variants: 1 };
        }
        const brand: BrandVariant = hasFlag(message, '#NU') ? 'NU' : 'NXT';
        const variants = parseVariantsModifier(message);
        const topic = stripArtifactCommon(message.replace(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$|[.,;:!?'"])`, 'gi'), ' '));
        return { triggered: true, generator: token, topic, brand, variants };
    };
}

export const parseBriefDirective = buildArtifactParser('#brief');
export const parseExplainerDirective = buildArtifactParser('#explainer');
export const parseReportDirective = buildArtifactParser('#report');
export const parsePlaygroundDirective = buildArtifactParser('#playground');
export const parseApproachesDirective = buildArtifactParser('#approaches');

/** Help directive — bare hashtag, no topic needed. */
export function parseHelpDirective(message: string): { triggered: boolean } {
    return { triggered: /(?:^|\s)#help(?=\s|$|[.,;:!?'"])/i.test(message) };
}

/** Artifact library directive — bare hashtag. */
export function parseArtifactsLibraryDirective(message: string): { triggered: boolean } {
    return { triggered: /(?:^|\s)#artifacts(?=\s|$|[.,;:!?'"])/i.test(message) };
}

/** Refine directive — targets an existing slug. */
export interface RefineDirective {
    triggered: boolean;
    slug: string;             // the slug to refine
    instruction: string;      // the user's tweak instruction
}
export function parseRefineDirective(message: string): RefineDirective {
    // Match: #refine <slug>[: <instruction>]
    //        or #refine #name=<slug> <instruction>
    const m = message.match(/(?:^|\s)#refine\s+(?:#name=)?([a-z0-9_-]+)(?:\s*[:—\-]\s*(.+))?/i);
    if (!m) return { triggered: false, slug: '', instruction: '' };
    return {
        triggered: true,
        slug: (m[1] || '').toLowerCase().trim(),
        instruction: (m[2] || '').trim(),
    };
}

/**
 * Convenience: returns a short human-readable summary of a directive.
 * Used in the chat to acknowledge what the user asked for before composition begins.
 */
export function summarizeDirective(d: PresentationDirective): string {
  if (!d.triggered) return '';
  const parts: string[] = [`brand=${d.brand}`, `model=${d.model}`];
  if (d.theme !== 'dark') parts.push(`theme=${d.theme}`);
  if (d.heroOverride) parts.push(`hero="${d.heroOverride}"`);
  if (d.sectionFilter?.length) parts.push(`sections=${d.sectionFilter.join(',')}`);
  if (d.ephemeral) parts.push('preview');
  if (d.alsoExportPptx) parts.push('+pptx');
  if (d.autoOpen) parts.push('auto-open');
  return parts.join(' · ');
}
