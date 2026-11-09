/**
 * Known gaps for generation (2026-10-31, agent-stack plan WS-C C3/C4). The proxy's daily brain-growth pass files
 * `known-gaps/failure-<family>.md` from the eval lane's recurring chain failures (proxy/brain_growth.py). This module
 * picks the pages that apply to the deliverable being generated, so the prompt names the failures this kind of
 * artifact keeps hitting and the reply's receipt names the pages it used.
 *
 * A page applies when it is marked `applies_to: generation` (harness-only gaps never reach a prompt) and one of its
 * deliverable kinds belongs to the output type.
 */
import { proxyBase } from './proxyConfig';

/** The frontier set's deliverable kinds, per generation output type. */
export const OUTPUT_KINDS: Record<string, string[]> = {
    STRATEGY_DECK: ['slides', 'strategy', 'strategy-slide', 'brief', 'report', 'case-study', 'explainer', 'deep-research', 'approaches', 'playground', 'questionnaire'],
    STRATEGIC_RECS: ['recommendations', 'recommendation', 'strategy', 'case-study'],
    PERSONAS: ['persona', 'persona-card'],
    JOURNEY_MAP: ['journey', 'blueprint'],
    TECH_ARCH: ['arch'],
    PRD: ['prd', 'prd-feature'],
    ROADMAP: ['roadmap'],
    GAP_ANALYSIS: ['gap', 'gap-analysis'],
    TECH_AUDIT: ['audit'],
    COMPETITIVE_ANALYSIS: ['compete', 'competitive'],
    ORG_CHART: ['org'],
};

export interface KnownGapPage {
    path: string;
    family: string;
    title: string;
    appliesTo: 'generation' | 'harness';
    kinds: string[];
    cases: number;
    whatFails: string;
    whatHelps: string;
}

export function parseKnownGapPage(path: string, text: string): KnownGapPage | null {
    const t = String(text || '').replace(/\r\n/g, '\n');
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(t);
    if (!fm || !/^type:\s*known-gap\s*$/m.test(fm[1])) return null;
    const field = (k: string) => (new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(fm[1])?.[1] || '').trim().replace(/^"|"$/g, '');
    const kinds = field('kinds').replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
    const body = t.slice(fm[0].length);
    return {
        path,
        family: field('family'),
        title: field('title').replace(/^Recurring failure:\s*/i, ''),
        appliesTo: field('applies_to') === 'harness' ? 'harness' : 'generation',
        kinds,
        cases: Number(field('cases')) || 0,
        whatFails: (/^What fails:\s*(.+)$/m.exec(body)?.[1] || '').trim(),
        whatHelps: (/^What the harness does about it:\s*(.+)$/m.exec(body)?.[1] || '').trim(),
    };
}

export function selectKnownGaps(pages: KnownGapPage[], outputType: string, max = 4): KnownGapPage[] {
    const want = new Set(OUTPUT_KINDS[outputType] || []);
    return pages
        .filter(p => p.appliesTo === 'generation' && p.kinds.some(k => want.has(k)))
        .sort((a, b) => b.cases - a.cases || a.path.localeCompare(b.path))
        .slice(0, max);
}

export function renderKnownGaps(pages: KnownGapPage[]): string {
    return pages.map(p => `- ${p.title}: ${p.whatFails}${p.whatHelps ? ` ${p.whatHelps}` : ''}`).join('\n');
}

let _cache: { at: number; pages: KnownGapPage[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

/** Every known-gap page the brain-growth pass filed (cached for ten minutes). */
export async function loadKnownGapPages(fetchImpl: typeof fetch = fetch): Promise<KnownGapPage[]> {
    if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.pages;
    const pages: KnownGapPage[] = [];
    try {
        const r = await fetchImpl(`${proxyBase()}/api/wiki/list/known-gaps`, { signal: AbortSignal.timeout(4000) });
        const files: string[] = r.ok ? ((await r.json())?.files || []) : [];
        for (const f of files.filter(x => /^failure-[\w-]+\.md$/.test(x)).slice(0, 40)) {
            try {
                const pr = await fetchImpl(`${proxyBase()}/api/wiki/read/known-gaps/${encodeURIComponent(f)}`, { signal: AbortSignal.timeout(4000) });
                if (!pr.ok) continue;
                const page = parseKnownGapPage(`known-gaps/${f}`, String((await pr.json())?.content || ''));
                if (page) pages.push(page);
            } catch { /* one unreadable page never blocks the rest */ }
        }
    } catch { /* the wiki is optional at generation time */ }
    _cache = { at: Date.now(), pages };
    return pages;
}

/** Test seam. */
export function __resetKnownGapsCache(): void { _cache = null; }
