/**
 * designExemplarCurator - runtime implementation of the
 * `design-exemplar-curator` skill (.claude/skills/design-exemplar-curator/).
 *
 * The skill spec defines the algorithm; this module ships the actual code that:
 *   1. Loads the Behance exemplar index from the wiki at runtime
 *   2. Maps a brief's interaction_pattern + brand hashtag to ranked exemplars
 *   3. Selects one Verbalized-Sampling framing (α-ε) per exemplar
 *   4. Returns a `visual_direction.exemplar_refs` block for the brief
 *   5. Builds a Stage 4 Prototype Coder system-prompt injection block
 *
 * The downstream pipeline replaces vague `aesthetic_keywords: "clean modern"`
 * with these named, evidence-backed references so Stage 4 has a concrete
 * visual target instead of falling back to the LLM's typicality bias.
 *
 * Source data: `/hic-workspace/wiki/exemplars/behance/_raw_index.json`
 * Per-exemplar pattern pages: `/hic-workspace/wiki/exemplars/behance/<tag>/<slug>.html`
 *
 * 2026-05-14 - first ship. Pattern Translation pages currently exist only
 * for `behance-241915081` (Niva); the curator returns `pattern_url: null` for
 * the rest and the Stage 4 injection block uses the thumbnail + title alone.
 */

const PROXY_BASE = (typeof window !== 'undefined' && (window as any).__hicProxyBase) || 'http://127.0.0.1:5012';
const INDEX_URL = `${PROXY_BASE}/hic-workspace/wiki/exemplars/behance/_raw_index.json`;

export type BrandHashtag =
  | '#NXT'
  | '#NXT-radical'
  | '#NXT-convention'
  | '#NU'
  | '#NU-institutional'
  | '#NU-editorial'
  | string;

export type CommittedFrame = 'radical' | 'convention-honoring' | 'unspecified';
export type FramingLetter = 'α' | 'β' | 'γ' | 'δ' | 'ε';

export interface ExemplarRecord {
  exemplar_id: string;
  title: string;
  designer: string | null;
  project_url: string;
  image_url: string;
  appreciations: number | null;
  views: number | null;
  primary_tag: string;
  all_tags: string[];
}

export interface CurateInput {
  concept: string;
  interactionPattern?: string;
  aestheticKeywords?: string[];
  committedFrame?: CommittedFrame;
  brandHashtag: BrandHashtag;
}

export interface ExemplarRef {
  exemplar_id: string;
  framing_letter: FramingLetter;
  framing_name: string;
  brand: 'nxt' | 'nu';
  rationale: string;
  pattern_url: string | null;
  thumbnail_url: string;
  source_url: string;
  title: string;
  designer: string | null;
  appreciations: number | null;
}

// ─────────────────────────────────────────────────────────
// TAG MAPPING - interaction patterns to primary tags
// Extend as new patterns surface in the brief generator.
// ─────────────────────────────────────────────────────────
const TAG_MAP: Record<string, string[]> = {
  'multi-identity-reasoning':  ['ai-chatbot', 'persona', 'profile'],
  'household-coordination':    ['ai-chatbot', 'mobile-ui'],
  'schedule-negotiation':      ['ai-chatbot', 'mobile-ui', 'checklist'],
  'conversational-assistant':  ['ai-chatbot', 'ai', 'voice-chat'],
  'voice-assistant':           ['voice-chat', 'ai'],
  'data-narrative':            ['dashboard', 'data-visualization'],
  'analytics-decision-support':['dashboard', 'data-visualization'],
  'editorial-pitch':           ['landing-page'],
  'product-marketing':         ['landing-page', 'ecommerce'],
  'cohort-onboarding':         ['mobile-ui', 'profile', 'gamification'],
  'student-engagement':        ['mobile-ui', 'profile', 'gamification', 'persona'],
  'mentor-matching':           ['ai-chatbot', 'persona', 'recommendations', 'profile'],
  'recommendation-reveal':     ['recommendations', 'ai-chatbot'],
  'gallery-browse':            ['gallery', 'video'],
  'form-collection':           ['forms', 'account'],
  'commerce-checkout':         ['ecommerce', 'forms'],
  'media-consumption':         ['video', 'gallery'],
  'avatar-customization':      ['avatar', 'profile'],
};

// ─────────────────────────────────────────────────────────
// FRAMING SELECTION - hashtag + aesthetic to letter
// ─────────────────────────────────────────────────────────
const FRAMING_NAMES: Record<FramingLetter, string> = {
  'α': 'typography-led',
  'β': 'motion-led',
  'γ': 'density-led',
  'δ': 'color-restraint',
  'ε': 'radical-departure',
};

function selectFraming(input: CurateInput): { letter: FramingLetter; brand: 'nxt' | 'nu' } {
  const hash = (input.brandHashtag || '#NXT').toLowerCase();
  const brand: 'nxt' | 'nu' = hash.startsWith('#nu') ? 'nu' : 'nxt';
  const aestheticBlob = (input.aestheticKeywords || []).join(' ').toLowerCase();

  // Explicit hashtag commitments take priority
  if (hash === '#nxt-radical') return { letter: 'ε', brand: 'nxt' };
  if (hash === '#nxt-convention') {
    return { letter: /minimal|reserve|achromatic|restraint/.test(aestheticBlob) ? 'δ' : 'α', brand: 'nxt' };
  }
  if (hash === '#nu-institutional') return { letter: 'α', brand: 'nu' };
  if (hash === '#nu-editorial') return { letter: 'δ', brand: 'nu' };

  // Frame commitment second
  if (input.committedFrame === 'radical') return { letter: 'ε', brand };
  if (input.committedFrame === 'convention-honoring') return { letter: 'α', brand };

  // Aesthetic-keyword inference last
  if (/motion|animate|spring|kinetic/.test(aestheticBlob)) return { letter: 'β', brand };
  if (/dense|compact|editorial|ft|wsj/.test(aestheticBlob)) return { letter: 'γ', brand };
  if (/minimal|restraint|austere|silent/.test(aestheticBlob)) return { letter: 'δ', brand };

  // Default
  return { letter: brand === 'nu' ? 'α' : 'β', brand };
}

// ─────────────────────────────────────────────────────────
// PATTERN-URL RESOLVER - which exemplars have a translation page
// ─────────────────────────────────────────────────────────
const PATTERN_TRANSLATIONS_SHIPPED = new Set<string>([
  'behance-241915081', // Niva - AI Family Assistant
]);

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function patternUrl(ex: ExemplarRecord): string | null {
  if (!PATTERN_TRANSLATIONS_SHIPPED.has(ex.exemplar_id)) return null;
  return `/hic-workspace/wiki/exemplars/behance/${ex.primary_tag}/${slugify(ex.title)}.html`;
}

// ─────────────────────────────────────────────────────────
// SCORING - Jaccard concept-overlap + log-appreciations
// ─────────────────────────────────────────────────────────
function tokenize(s: string): Set<string> {
  return new Set(
    (s || '').toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach(t => { if (b.has(t)) intersection += 1; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreExemplar(ex: ExemplarRecord, conceptTokens: Set<string>): number {
  const titleTokens = tokenize(ex.title + ' ' + (ex.designer || '') + ' ' + (ex.all_tags || []).join(' '));
  const conceptScore = jaccard(conceptTokens, titleTokens) * 100;
  const popularityScore = Math.log10(Math.max(1, ex.appreciations || 1)) * 8;
  return conceptScore + popularityScore;
}

// ─────────────────────────────────────────────────────────
// INDEX LOADING - with caching + fallback to evergreen list
// ─────────────────────────────────────────────────────────
let cachedIndex: ExemplarRecord[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const EVERGREEN_FALLBACK: ExemplarRecord[] = [
  {
    exemplar_id: 'behance-241915081',
    title: 'Niva | AI family assistant',
    designer: 'Multiple Owners',
    project_url: 'https://www.behance.net/gallery/241915081/Niva-AI-family-assistant',
    image_url: 'https://mir-s3-cdn-cf.behance.net/projects/404/a8096c241915081.Y3JvcCw1Mzc5LDQyMDgsMCww.png',
    appreciations: 2750,
    views: 45168,
    primary_tag: 'ai-chatbot',
    all_tags: ['ai', 'ai-chatbot', 'mobile-ui', 'profile', 'persona', 'voice-chat'],
  },
];

async function loadIndex(): Promise<ExemplarRecord[]> {
  if (cachedIndex && (Date.now() - cachedAt) < CACHE_TTL_MS) return cachedIndex;
  try {
    const resp = await fetch(INDEX_URL, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    cachedIndex = (raw.exemplars || []) as ExemplarRecord[];
    cachedAt = Date.now();
    return cachedIndex;
  } catch (err) {
    console.warn('[designExemplarCurator] index load failed, using evergreen fallback', err);
    cachedIndex = EVERGREEN_FALLBACK;
    cachedAt = Date.now();
    return cachedIndex;
  }
}

// ─────────────────────────────────────────────────────────
// PUBLIC - main retrieval entry
// ─────────────────────────────────────────────────────────
export async function curateExemplarsForBrief(input: CurateInput, k = 5): Promise<ExemplarRef[]> {
  const index = await loadIndex();
  const tags = (TAG_MAP[input.interactionPattern || ''] || []);
  const conceptTokens = tokenize(input.concept || '');

  let candidates: ExemplarRecord[] = index;
  if (tags.length > 0) {
    candidates = index.filter(ex =>
      (ex.all_tags || []).some(t => tags.includes(t)) ||
      tags.includes(ex.primary_tag)
    );
  }

  // Quality floor - appreciations >= 500 preferred; relax to 100 if too few survive
  let filtered = candidates.filter(ex => (ex.appreciations || 0) >= 500);
  if (filtered.length < k) filtered = candidates.filter(ex => (ex.appreciations || 0) >= 100);
  if (filtered.length < k) filtered = candidates.length > 0 ? candidates : index;

  // Rank
  const ranked = filtered
    .map(ex => ({ ex, score: scoreExemplar(ex, conceptTokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const framing = selectFraming(input);
  const conceptShort = (input.concept || '').slice(0, 100);

  return ranked.map(({ ex }) => ({
    exemplar_id: ex.exemplar_id,
    framing_letter: framing.letter,
    framing_name: FRAMING_NAMES[framing.letter],
    brand: framing.brand,
    rationale:
      `${ex.title} matches the "${input.interactionPattern || 'concept'}" pattern in this brief; ` +
      `framing ${framing.letter} (${FRAMING_NAMES[framing.letter]}) honors the ${input.brandHashtag} commitment` +
      (conceptShort ? ` and the concept "${conceptShort}".` : '.'),
    pattern_url: patternUrl(ex),
    thumbnail_url: ex.image_url,
    source_url: ex.project_url,
    title: ex.title,
    designer: ex.designer,
    appreciations: ex.appreciations,
  }));
}

// ─────────────────────────────────────────────────────────
// PUBLIC - Stage 4 system-prompt injection block
// ─────────────────────────────────────────────────────────
export function buildStage4InjectionBlock(refs: ExemplarRef[], brandHashtag: BrandHashtag): string {
  if (!refs || refs.length === 0) return '';
  const brand = (brandHashtag || '#NXT').toLowerCase().startsWith('#nu') ? 'nu' : 'nxt';
  const brandLanguage = brand === 'nu'
    ? "Spectral Light (display) / Roboto (body) / Roboto Mono (data) / Huskies red sparingly on navy ink-900"
    : "Bebas Neue (display) / Archivo (body) / JetBrains Mono (data) / chartreuse on near-white";

  const exemplarLines = refs.map((r, i) => {
    return [
      `EXEMPLAR ${i + 1} - ${r.title}${r.designer ? ' (by ' + r.designer + ')' : ''}${r.appreciations ? ', ' + r.appreciations.toLocaleString() + ' likes' : ''}`,
      `  Source thumbnail: ${r.thumbnail_url}`,
      `  Source URL: ${r.source_url}`,
      r.pattern_url ? `  Pattern translation page: ${r.pattern_url}` : `  Pattern translation: pending - study thumbnail + title only`,
      `  Framing committed: ${r.framing_letter} (${r.framing_name})`,
      `  Rationale: ${r.rationale}`,
    ].join('\n');
  }).join('\n\n');

  return [
    '═════════════════════════════════════════════════════════════════',
    'DESIGN EXEMPLAR LIBRARY - STUDY THESE BEFORE WRITING CODE',
    '═════════════════════════════════════════════════════════════════',
    '',
    'You have ' + refs.length + ' named reference shots that match this brief. Your',
    'generated UI MUST visually pass a side-by-side comparison with these',
    'exemplars. If your UI would look out of place next to them, you are wrong.',
    '',
    exemplarLines,
    '',
    'DESIGN-LANGUAGE COMMITMENT',
    '  Brand: ' + brand.toUpperCase() + ' (' + brandLanguage + ')',
    '  Hashtag: ' + brandHashtag,
    '  Framing: ' + (refs[0]?.framing_letter || 'α') + ' (' + (refs[0]?.framing_name || 'typography-led') + ')',
    '',
    'FORBIDDEN PATTERNS',
    '  - modal with tone slider + regenerate button (the default Copilot clone)',
    '  - centered chat input bar as the entire interface',
    '  - skeleton loaders that render forever (every <Skeleton/> MUST have a bound fetch + state)',
    '  - generic SaaS dashboard shell (sidebar + topbar + white modal)',
    '  - "clean modern" aesthetic without a specific design language commitment',
    '',
    'DELIVERABLE RULES',
    '  - Every UI region must echo one of the 5 exemplar framings, not invent a new one',
    '  - Use the brand\'s typefaces by their exact names; do not approximate',
    '  - Motion: borrow timing from framing β (80ms stagger NXT) or NU 180ms standard ease',
    '  - If a region renders a loading state, a corresponding fetch + state binding MUST exist',
    '═════════════════════════════════════════════════════════════════',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────
// PUBLIC - clear cache (testing / forced refresh after re-batching)
// ─────────────────────────────────────────────────────────
export function clearExemplarCache(): void {
  cachedIndex = null;
  cachedAt = 0;
}
