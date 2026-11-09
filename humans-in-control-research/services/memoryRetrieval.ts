// memoryRetrieval.ts - WS-6 M1 (2026-10-30, plan harness-capability-curve-uplift, clause 6: memory layers).
//
// Long-term memory is RETRIEVED BY RELEVANCE to the objective, never injected wholesale. Before this,
// loadGenerationContext sliced the first 8 KB of synthesis/cross-engagement-patterns.md into every
// generation prompt with a prompt-only "ignore if off-domain" (a retail objective received the
// higher-ed co-op patterns), and the memory fact store had no reader at all. Two pure selectors:
//
//   rankSectionsByRelevance(markdown, objective)  - the pattern page split into `## ` sections, each
//                                                   scored by salient-term overlap with the objective;
//                                                   a section that shares no salient term is dropped
//   selectMemoryFacts(facts, objective)           - the fact store ranked by overlap x confidence x
//                                                   recency; only facts above the floor are rendered
//
// Lexical overlap is the first rung on purpose: it needs no network, runs in the Claude Code hook
// (Python twin in .claude/hooks/scripts/inject_active_constraints_and_patterns.py) and in tests, and
// a section with ZERO shared salient terms is wrong for the objective no matter what an embedding
// says. The proxy's chunks-by-goal embedding ranking stays the retrieval path for the corpus itself.

import type { MemoryFact } from './memoryLifecycle';

const STOP = new Set(('a an the and or of to in for on with by from as at is are be was were this that these those it its into over under ' +
    'how what which who whom when where why can could should would will shall may might must do does did done not no yes vs versus ' +
    'about across after against along among around before behind below beneath beside between beyond but down during except inside ' +
    'near off out outside through toward up upon within without analyze analysis analyse deliver define identify evaluate assess ' +
    'report strategy strategic recommendations recommendation outlook comprehensive state current trends trend key insights insight ' +
    'research findings finding deliverable deck slides patterns pattern engagement engagements prior runs run industry industries ' +
    'organization organisation organizations business businesses company companies market markets data based using use new 2025 2026 2027').split(/\s+/));

/** Lower-cased content words of 4+ letters (plus 3-letter all-caps acronyms), stop words removed, light stemming. */
export function salientTerms(text: string): Set<string> {
    const out = new Set<string>();
    for (const raw of String(text || '').match(/[A-Za-z][A-Za-z0-9-]{2,}/g) || []) {
        const isAcronym = raw.length >= 3 && raw === raw.toUpperCase();
        const w = raw.toLowerCase();
        if (!isAcronym && (w.length < 4 || STOP.has(w))) continue;
        if (STOP.has(w)) continue;
        out.add(stem(w));
    }
    return out;
}

function stem(w: string): string {
    return w.replace(/(ations?|izations?|isations?)$/, 'at').replace(/(ies)$/, 'y').replace(/(ing|ers?|ed|es|s)$/, (m) => (w.length - m.length >= 4 ? '' : m));
}

export interface RankedSection {
    heading: string;
    body: string;
    /** Shared salient terms between the section and the objective. */
    shared: string[];
    score: number;
}

export interface SectionRankOptions {
    /** Minimum shared salient terms for a section to be admitted (default 2). */
    minShared?: number;
    /** Output budget in characters (default 3000). */
    maxChars?: number;
    /** At most this many sections (default 4). */
    maxSections?: number;
}

/** Split a markdown page into `## ` sections (frontmatter and the H1 dropped; a heading repeated back to back is one section). */
export function splitSections(markdown: string): Array<{ heading: string; body: string }> {
    const text = String(markdown || '').replace(/^---[\s\S]*?\n---\s*\n/, '');
    const out: Array<{ heading: string; body: string }> = [];
    let cur: { heading: string; body: string[] } | null = null;
    for (const line of text.split(/\r?\n/)) {
        const h = /^##\s+(.+)$/.exec(line);
        if (h) {
            const heading = h[1].trim();
            if (cur && cur.heading === heading) continue;    // the duplicated heading the miner emits
            if (cur) out.push({ heading: cur.heading, body: cur.body.join('\n').trim() });
            cur = { heading, body: [] };
            continue;
        }
        if (/^#\s/.test(line)) continue;
        if (cur) cur.body.push(line);
    }
    if (cur) out.push({ heading: cur.heading, body: cur.body.join('\n').trim() });
    return out.filter(s => s.body.length > 0);
}

/** The sections of a memory page that are ABOUT the objective, best first, within a budget. */
export function rankSectionsByRelevance(markdown: string, objective: string, opts: SectionRankOptions = {}): RankedSection[] {
    const minShared = opts.minShared ?? 2;
    const maxChars = opts.maxChars ?? 3000;
    const maxSections = opts.maxSections ?? 4;
    const obj = salientTerms(objective);
    if (!obj.size) return [];
    const ranked: RankedSection[] = [];
    for (const s of splitSections(markdown)) {
        const terms = salientTerms(`${s.heading} ${s.body}`);
        const shared = Array.from(terms).filter(t => obj.has(t));
        if (shared.length < minShared) continue;
        // overlap relative to the objective's own vocabulary, with a small bonus for a heading hit
        const headingHit = Array.from(salientTerms(s.heading)).some(t => obj.has(t)) ? 0.15 : 0;
        const score = Math.min(1, shared.length / Math.max(3, obj.size) + headingHit);
        ranked.push({ heading: s.heading, body: s.body, shared, score });
    }
    ranked.sort((a, b) => b.score - a.score || b.shared.length - a.shared.length);
    const out: RankedSection[] = [];
    let used = 0;
    for (const s of ranked) {
        const cost = s.heading.length + s.body.length + 4;
        if (out.length >= maxSections || used + cost > maxChars) continue;
        out.push(s);
        used += cost;
    }
    return out;
}

/** Render admitted sections as the prompt block (empty string when nothing is relevant). */
export function renderRankedSections(sections: RankedSection[]): string {
    return sections.map(s => `## ${s.heading}\n${s.body}`).join('\n\n');
}

export interface FactSelectOptions {
    max?: number;
    /** Minimum relevance (0..1) a fact needs; a correction with no shared term still needs one (default 0.2). */
    minRelevance?: number;
    nowIso?: string;
}

/** Facts ranked by shared salient terms with the objective, weighted by confidence and recency of confirmation. */
export function selectMemoryFacts(facts: MemoryFact[], objective: string, opts: FactSelectOptions = {}): Array<{ fact: MemoryFact; relevance: number; score: number }> {
    const obj = salientTerms(objective);
    if (!obj.size || !facts?.length) return [];
    const now = Date.parse(opts.nowIso || new Date().toISOString());
    const minRel = opts.minRelevance ?? 0.2;
    const rows = facts.map(f => {
        const terms = salientTerms(f.content);
        const shared = Array.from(terms).filter(t => obj.has(t)).length;
        const relevance = Math.min(1, shared / Math.max(2, Math.min(obj.size, 6)));
        const ageDays = Math.max(0, (now - Date.parse(f.lastConfirmedAt || f.createdAt || '')) / 86_400_000) || 0;
        const recency = Math.exp(-ageDays / 180);
        const score = relevance * (0.6 + 0.4 * (f.confidence || 0)) * (0.7 + 0.3 * recency);
        return { fact: f, relevance, score };
    }).filter(r => r.relevance >= minRel);
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, opts.max ?? 8);
}
