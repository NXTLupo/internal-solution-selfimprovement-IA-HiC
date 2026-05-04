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

export type ComposerModelChoice = 'gemini-3.1-pro-preview' | 'gpt-5.5';

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
  // 2026-05-03 — Composer default is GPT-5.5, NOT Gemini Pro. Reason:
  // Gemini's OpenAI-compatible function-calling endpoint does not properly
  // populate deeply-nested generic-object schema fields (`data: { type:
  // 'object' }`). Gemini emits `data: {}` for every section instead of
  // populating hero/context/themes/etc. shapes — verified against a real
  // run where 7 sections were emitted with all data objects empty. GPT-5.5
  // has the same OpenAI-compat protocol but native API handles loose
  // schemas correctly. Until we add a discriminated-union schema with
  // per-kind data shapes, composer stays on GPT-5.5.
  //
  // Chat, themes, and deliverable generation remain on Gemini Pro — those
  // paths use direct Gemini calls (not function-calling), so the schema
  // bug doesn't affect them.
  if (!raw) return 'gpt-5.5';
  const v = raw.toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (v === 'gpt55' || v === 'gpt5.5' || v === 'gpt-5.5') return 'gpt-5.5';
  if (v === 'gemini' || v === 'gemini31' || v === 'gemini3.1' || v === 'pro' || v === 'gemini-3-1-pro-preview' || v === 'gemini31propreview') {
    // Allow explicit opt-in to Gemini Pro composer (will produce empty
    // section data until the schema fix lands — for testing only).
    return 'gemini-3.1-pro-preview';
  }
  // Unknown — fall back to GPT-5.5 (proven-working composer model)
  return 'gpt-5.5';
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
      model: 'gpt-5.5',
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
