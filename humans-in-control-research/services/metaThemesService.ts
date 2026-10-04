// services/metaThemesService.ts
// Reads every engagements/<slug>/themes.json from the wiki and surfaces themes
// that recur across ≥3 engagements as portfolio patterns. Themes appearing in
// ≥5 engagements are flagged as "platform patterns" - a categorical
// differentiator from NotebookLM which has no concept of an engagement
// portfolio.
//
// 2026-05-24 - Phase 6 of plans/hic-notebooklm-uplift-plan-2026-05-24.md
// See .claude/skills/meta-themes/SKILL.md for the contract.
//
// 2026-06-27 - DE-HARDCODE + GLYPH PAINT. The renderer previously carried two
// hand-keyed hex palettes (NXT_MT_STYLE / NU_MT_STYLE) + stale fonts (Bebas Neue,
// Roboto Condensed, Open Sans). Per UNIFIED_VISION never-hardcode, every colour +
// font now resolves from the brand token mirror (getBrand -> /api/design-tokens
// hydration). Both brands render on the GOLD light paper surface (registry
// ground:'light'); brand is an accent flip. Each portfolio-pattern card paints its
// tokenized glyph (compositeIcon, deterministic + $0) - the live Figma slots
// 683:5501-5504 on component 613:2.

import { getBrand, type BrandId } from '../components/slideTemplates/brands';
import { compositeIcon, isContentTrueIcon } from './iconLibrary';

type Brand = BrandId;   // nxt | nu | deciem, all resolved through getBrand()

/** Prefix a token hex (stored without '#') for CSS. */
const hx = (v: string): string => (v && v.startsWith('#')) ? v : `#${v || '000000'}`;

interface MtPalette {
    bg: string; ink: string; grey: string; hair: string; accent: string; cool: string;
    panel: string; warmPanel: string; titleFont: string; bodyFont: string; monoFont: string; titleWeight: string;
    labelFont: string;   // full stack for kickers / stat labels / flags: DECIEM = Poppins Bold (template audit), else the mono face
}
/** Resolve the meta-themes palette from the brand token mirror - NEVER a literal. */
function mtPalette(brandId: Brand): MtPalette {
    const b = getBrand(brandId);
    return {
        bg: hx(b.PALE), ink: hx(b.INK), grey: hx(b.GREY), hair: hx(b.HAIRLINE),
        accent: hx(b.CHARTREUSE), cool: hx(b.CYAN), panel: hx(b.PANEL),
        warmPanel: hx(b.CHARTREUSE_PALE), titleFont: b.FONT_DISPLAY, bodyFont: b.FONT_BODY,
        monoFont: b.FONT_MONO, titleWeight: b.TITLE_WEIGHT,
        labelFont: brandId === 'deciem' ? `'${String((b as Record<string, unknown>).FONT_LABEL || b.FONT_DISPLAY)}', sans-serif` : `${b.FONT_MONO}, monospace`,
    };
}

interface EngagementTheme {
    name: string;
    summary?: string;
    description?: string;
    citations?: string[];
}

interface EngagementThemes {
    slug: string;
    themes: EngagementTheme[];
    research_goal?: string;
}

export interface MetaTheme {
    canonical_name: string;
    summary: string;
    engagement_count: number;
    engagements: Array<{ slug: string; theme_name: string; research_goal?: string }>;
    is_platform_pattern: boolean;     // ≥5 engagements
    is_portfolio_pattern: boolean;    // ≥3 engagements
    sample_quotes: string[];
}

export interface MetaThemesOutput {
    themes: MetaTheme[];
    engagement_count: number;
    portfolio_pattern_count: number;
    platform_pattern_count: number;
    generated_at: string;
}

// ─── Wiki I/O ─────────────────────────────────────────────────────────────────

async function listEngagementSlugs(proxyBase: string): Promise<string[]> {
    const resp = await fetch(`${proxyBase}/api/wiki/list/engagements`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data.dirs) ? data.dirs : [];
}

async function readEngagementThemes(proxyBase: string, slug: string): Promise<EngagementThemes | null> {
    const resp = await fetch(`${proxyBase}/api/wiki/read/engagements/${encodeURIComponent(slug)}/themes.json`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.exists || !data.content) return null;
    try {
        const parsed = JSON.parse(data.content);
        // Multiple historical shapes - normalize. Real engagement themes are
        // usually a list of {name, summary, citations}.
        const themes = Array.isArray(parsed) ? parsed
            : Array.isArray(parsed?.themes) ? parsed.themes
            : Array.isArray(parsed?.result?.themes) ? parsed.result.themes
            : [];
        const researchGoal = parsed?.research_goal || parsed?.goal || parsed?.result?.research_goal;
        return {
            slug,
            themes: themes.map((t: any) => ({
                name: String(t.name || t.title || '').trim(),
                summary: String(t.summary || t.description || '').trim(),
                description: String(t.description || '').trim(),
                citations: Array.isArray(t.citations) ? t.citations : [],
            })).filter((t: EngagementTheme) => t.name.length > 0),
            research_goal: researchGoal,
        };
    } catch {
        return null;
    }
}

// ─── Theme clustering ─────────────────────────────────────────────────────────
// Cluster by name+summary token overlap. Two themes are considered the same
// canonical concept if their stemmed-token sets overlap above a threshold.

const STOP = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'of', 'for', 'in', 'on', 'at', 'to',
    'with', 'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
    'their', 'they', 'them', 'this', 'that', 'these', 'those', 'it', 'its',
    'how', 'what', 'why', 'when', 'where', 'which', 'who', 'whom', 'whose',
]);

function stem(w: string): string {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return w;
    return w
        .replace(/(ing|ed|ation|ations|ities|ity|ness|tions|tion|ers|er|ies|s)$/, '');
}

function tokenize(text: string): Set<string> {
    return new Set(
        (text || '').toLowerCase().split(/[^a-z0-9]+/)
            .filter(w => w.length >= 3 && !STOP.has(w))
            .map(stem)
            .filter(w => w.length >= 3)
    );
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter += 1;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}

interface ThemeRecord {
    name: string;
    summary: string;
    tokens: Set<string>;
    slug: string;
    research_goal?: string;
}

interface Cluster {
    records: ThemeRecord[];
    seedTokens: Set<string>;
}

const SIMILARITY_THRESHOLD = 0.34;

function clusterThemes(records: ThemeRecord[]): Cluster[] {
    const clusters: Cluster[] = [];
    // Process records longest-summary-first to anchor clusters on the most
    // descriptive theme of each concept.
    const sorted = [...records].sort((a, b) => b.tokens.size - a.tokens.size);
    for (const rec of sorted) {
        let bestCluster: Cluster | null = null;
        let bestScore = 0;
        for (const c of clusters) {
            const score = jaccard(rec.tokens, c.seedTokens);
            if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
                bestScore = score;
                bestCluster = c;
            }
        }
        if (bestCluster) {
            bestCluster.records.push(rec);
        } else {
            clusters.push({ records: [rec], seedTokens: rec.tokens });
        }
    }
    return clusters;
}

function pickCanonicalName(cluster: Cluster): string {
    // Prefer the shortest theme name that still contains a high-frequency
    // term from the cluster. Shortest names tend to be the cleanest.
    const sorted = [...cluster.records].sort((a, b) => a.name.length - b.name.length);
    return sorted[0]?.name || 'Untitled Pattern';
}

function pickCanonicalSummary(cluster: Cluster): string {
    // Pick the longest summary (most informative).
    const sorted = [...cluster.records].sort((a, b) => (b.summary?.length || 0) - (a.summary?.length || 0));
    return (sorted[0]?.summary || '').slice(0, 280);
}

// ─── Top-level ────────────────────────────────────────────────────────────────

export interface MetaThemesInput {
    proxy_base?: string;
    filter_slug_prefix?: string;
}

export async function buildMetaThemes(input: MetaThemesInput = {}): Promise<MetaThemesOutput> {
    const proxyBase = input.proxy_base ?? 'http://localhost:5012';
    const allSlugs = await listEngagementSlugs(proxyBase);
    const slugs = input.filter_slug_prefix
        ? allSlugs.filter(s => s.startsWith(input.filter_slug_prefix!))
        : allSlugs;

    const engagementsThemes = await Promise.all(slugs.map(s => readEngagementThemes(proxyBase, s)));
    const engagements = engagementsThemes.filter((x): x is EngagementThemes => x !== null && x.themes.length > 0);

    // Flatten to records
    const records: ThemeRecord[] = [];
    for (const eng of engagements) {
        for (const t of eng.themes) {
            const fullText = `${t.name} ${t.summary || t.description || ''}`;
            const tokens = tokenize(fullText);
            if (tokens.size < 2) continue;
            records.push({
                name: t.name,
                summary: t.summary || t.description || '',
                tokens,
                slug: eng.slug,
                research_goal: eng.research_goal,
            });
        }
    }

    const clusters = clusterThemes(records);

    // For each cluster, count DISTINCT engagement slugs (not raw record count)
    const metaThemes: MetaTheme[] = clusters.map(c => {
        const distinctSlugs = new Set(c.records.map(r => r.slug));
        const distinctCount = distinctSlugs.size;
        return {
            canonical_name: pickCanonicalName(c),
            summary: pickCanonicalSummary(c),
            engagement_count: distinctCount,
            engagements: c.records.map(r => ({
                slug: r.slug,
                theme_name: r.name,
                research_goal: r.research_goal,
            })),
            is_platform_pattern: distinctCount >= 5,
            is_portfolio_pattern: distinctCount >= 3,
            sample_quotes: c.records.map(r => r.summary).filter(Boolean).slice(0, 3),
        };
    }).filter(m => m.is_portfolio_pattern)  // only surface ≥3
      .sort((a, b) => b.engagement_count - a.engagement_count);

    return {
        themes: metaThemes,
        engagement_count: engagements.length,
        portfolio_pattern_count: metaThemes.length,
        platform_pattern_count: metaThemes.filter(t => t.is_platform_pattern).length,
        generated_at: new Date().toISOString(),
    };
}

// ─── HTML renderer ────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
    return (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Token-driven GOLD light-paper style. Every value resolves from the brand mirror. */
function mtStyle(p: MtPalette): string {
    return `
  html, body { width: 1920px; min-height: 1080px; background: ${p.bg}; color: ${p.ink}; }
  body { font-family: ${p.bodyFont}, sans-serif; }
  .mt-frame { width: 1920px; padding: 60px 80px; }
  .mt-kicker { font-family: ${p.labelFont}; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: ${p.grey}; margin-bottom: 8px; }
  .mt-title { font-family: ${p.titleFont}, sans-serif; font-weight: ${p.titleWeight}; font-size: 48px; line-height: 1; color: ${p.ink}; margin-bottom: 14px; }
  .mt-subtitle { font-size: 14px; color: ${p.accent}; margin-bottom: 32px; letter-spacing: 0.02em; }
  .mt-rail { width: 56px; height: 4px; background: ${p.accent}; margin-bottom: 28px; }
  .mt-stats { display: flex; gap: 48px; margin-bottom: 36px; padding: 16px 0; border-top: 1px solid ${p.hair}; border-bottom: 1px solid ${p.hair}; }
  .mt-stat-label { font-family: ${p.labelFont}; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: ${p.grey}; }
  .mt-stat-value { font-family: ${p.titleFont}, sans-serif; font-weight: ${p.titleWeight}; font-size: 32px; color: ${p.accent}; line-height: 1; }
  .mt-themes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .mt-theme { padding: 18px 22px; background: ${p.panel}; border-left: 3px solid ${p.cool}; }
  .mt-theme.platform { border-left-color: ${p.accent}; background: ${p.warmPanel}; }
  .mt-theme-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; }
  .mt-theme-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .mt-glyph { width: 40px; height: 40px; flex-shrink: 0; object-fit: contain; display: block; }
  .mt-theme-name { font-family: ${p.titleFont}, sans-serif; font-weight: ${p.titleWeight}; font-size: 22px; color: ${p.ink}; letter-spacing: 0.02em; line-height: 1.1; }
  .mt-flag { display: inline-block; flex-shrink: 0; padding: 2px 6px; font-family: ${p.labelFont}; font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; background: ${p.accent}; color: ${p.bg}; border-radius: 1px; }
  .mt-flag.portfolio { background: ${p.cool}; color: ${p.bg}; }
  .mt-summary { font-size: 13px; line-height: 1.5; color: ${p.ink}; opacity: 0.85; margin-bottom: 10px; }
  .mt-engagements { font-family: ${p.monoFont}, monospace; font-size: 9px; letter-spacing: 0.5px; color: ${p.grey}; line-height: 1.6; }
  .mt-engagements b { color: ${p.accent}; font-weight: 700; }
  .mt-engagement-chip { display: inline-block; padding: 2px 6px; margin: 2px 4px 2px 0; background: ${p.bg}; color: ${p.cool}; border: 1px solid ${p.hair}; border-radius: 1px; }
`;
}

export interface MetaThemesRenderInput {
    output: MetaThemesOutput;
    brand: Brand;
    title?: string;
}

export function renderMetaThemesHtml(input: MetaThemesRenderInput): string {
    const p = mtPalette(input.brand);
    const title = input.title || 'Portfolio Patterns';

    const themesHtml = input.output.themes.slice(0, 12).map(t => {
        const flagText = t.is_platform_pattern ? 'Platform' : 'Portfolio';
        const flagClass = t.is_platform_pattern ? 'platform' : 'portfolio';
        // Per-pattern tokenized glyph (live Figma slots 683:5501-5504 on 613:2).
        // compositeIcon is deterministic, $0, token-pure (colour from the brand
        // mirror), content-true (the canonical pattern name drives the base glyph).
        let glyphImg = '';
        try {
            const g = compositeIcon({ concept: t.canonical_name, brand: input.brand, ground: 'light', role: 'accent', size: 96 });
            // content-true or nothing: skip the generic fallback star (meaningless decoration)
            if (g?.dataUri && isContentTrueIcon(g.resolvedBy)) glyphImg = `<img class="mt-glyph" src="${g.dataUri}" alt=""/>`;
        } catch { /* fail-open: card renders without a mark */ }
        const slugChips = t.engagements.slice(0, 8).map(e =>
            `<span class="mt-engagement-chip">${escapeHtml(e.slug)}</span>`
        ).join('');
        return `
        <div class="mt-theme ${t.is_platform_pattern ? 'platform' : ''}">
          <div class="mt-theme-header">
            <div class="mt-theme-id">${glyphImg}<div class="mt-theme-name">${escapeHtml(t.canonical_name)}</div></div>
            <span class="mt-flag ${flagClass}">${flagText}</span>
          </div>
          <div class="mt-summary">${escapeHtml(t.summary || '-')}</div>
          <div class="mt-engagements"><b>${t.engagement_count}</b> engagements: ${slugChips}</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ${mtStyle(p)}
</style>
</head>
<body>
<div class="mt-frame">
  <div class="mt-kicker">Cross-Engagement Synthesis · ${escapeHtml(input.brand.toUpperCase())}</div>
  <h1 class="mt-title">${escapeHtml(title)}</h1>
  <div class="mt-subtitle">Themes that recur across multiple engagements in the HiC portfolio. Platform patterns appear in ≥5 engagements.</div>
  <div class="mt-rail"></div>
  <div class="mt-stats">
    <div>
      <div class="mt-stat-label">Engagements scanned</div>
      <div class="mt-stat-value">${input.output.engagement_count}</div>
    </div>
    <div>
      <div class="mt-stat-label">Portfolio patterns</div>
      <div class="mt-stat-value">${input.output.portfolio_pattern_count}</div>
    </div>
    <div>
      <div class="mt-stat-label">Platform patterns</div>
      <div class="mt-stat-value">${input.output.platform_pattern_count}</div>
    </div>
  </div>
  <div class="mt-themes">
    ${themesHtml || `<div style="color:${p.grey}; padding: 40px; text-align: center;">No portfolio patterns yet - fewer than 3 engagements share a common theme.</div>`}
  </div>
</div>
</body>
</html>`;
}
