/**
 * Quote Extractor - deterministic verbatim-quote pulling for slide generation.
 *
 * The slide AI may emit `evidence` (single quote) or `quotes[]` (multi-quote)
 * fields on every theme/persona/barrier. When the user asks for a specific
 * quote density ("3 quotes each", "#quotes=5"), this module enriches the
 * model's JSON output with REAL verbatim text pulled from the knowledge graph
 * and source corpus - no fabrication.
 *
 * Why deterministic? The LLM is great at claim-making but prone to quote
 * drift (paraphrasing, composite quotes, or inventing plausible-sounding
 * attributions). By pulling quotes from collected evidence nodes directly,
 * we guarantee every quote on a slide is:
 *   - Traceable to a specific evidence node in the KG
 *   - Sourced from a named, tiered connector
 *   - Carrying the real URL for link-out
 *
 * Extraction strategy (high to low confidence):
 *   Tier A: Match theme name / insight keywords against evidence node content
 *   Tier B: Match theme's linked source edges back to their child evidence
 *   Tier C: Fall back to top-relevance evidence from the most-cited source
 *
 * Scoring: quote candidates are ranked by (relevance, source-tier bonus,
 * length fitness 80-240 chars, freshness). Same-source dedup prevents three
 * quotes from one Reddit thread when three different sources are available.
 */

import type { KGNode, KnowledgeGraph } from './knowledgeGraphBuilder';
import type { SlideQuote } from '../components/slideTemplates/types';
import { fetchWikiArticles, type WikiArticleBody } from './wikiIndexService';

// --- TUNING CONSTANTS ---
const MIN_QUOTE_CHARS = 40;
const MAX_QUOTE_CHARS = 240;
const IDEAL_QUOTE_CHARS = 140;
const DEFAULT_MAX_PER_THEME = 3;

// --- EVIDENCE HYGIENE (2026-06-01) ---
// The wiki archive contains three classes of poison that must never reach a
// slide quote: (1) synthesis-as-source self-references ("HiC Theme Synthesis",
// "Tri-Model Research Synthesis"), (2) reporting-depth metadata that leaked
// into article bodies ("*Goal alignment: 94/100 · status: Validated*"), and
// (3) raw chunk dumps ([INSIGHT], [Page N], "--- TOP COMMENTS ---", PDF
// table-of-contents text) plus test-fixture sources from dev seeding
// ("PhaseA Test Source", "A4 Logistics Src"). These showed up verbatim on
// exported theme-cluster decks. Reject the source/quote OR strip the metadata.
const JUNK_SOURCE_RX = /\b(synthesis|tri-?model|test\s+source|logistics\s+src|phase\s?a\b|hic\s+theme)\b|\bsrc$/i;
const JUNK_QUOTE_RX = /\[INSIGHT\]|\[Page\s|---\s*TOP\s+COMMENTS|T\s?able\s+of\s+Contents|ESSENTIAL\s+GUIDE|goal\s+alignment\s*:|status\s*:\s*(validated|emerging|hypothesis)|\[CHUNK_/i;

/** A source label that is internal pipeline chrome, not a citable source. */
function isJunkSource(src: string | undefined): boolean {
    if (!src) return false;
    return JUNK_SOURCE_RX.test(src.trim());
}

/** A quote body that is a raw dump or carries leaked pipeline metadata and
 *  cannot be salvaged by prefix-stripping. */
function isJunkQuote(text: string | undefined): boolean {
    if (!text) return true;
    return JUNK_QUOTE_RX.test(text);
}

/** Correct unambiguous speech-to-text artifacts in transcript quotes so a
 *  verbatim quote reflects what was actually SAID, not the ASR mishearing.
 *  Conservative by design: "clawed" -> "Claude" ONLY in AI-product contexts
 *  (so "the cat clawed the sofa" is untouched), and filler "yada yada yada"
 *  is dropped (an evidence quote can't carry placeholder filler). This is the
 *  defensive net for the theme path; the SLIDE OUTPUT PROTOCOL instructs Opus
 *  to do the same at generation for every quote-bearing field. Exported for
 *  reuse + testing. */
export function correctTranscriptArtifacts(text: string): string {
    return (text || '')
        // ASR "clawed" -> "Claude" when followed by product-domain nouns...
        .replace(/\bclawed\b(?=\s+(?:skills?|models?|code|agents?|api|opus|sonnet|haiku|out of the box))/gi, 'Claude')
        // ...or preceded by a giving/using verb ("you get clawed", "use clawed")
        .replace(/\b(get|got|getting|raw|use|using|via|on)\s+clawed\b/gi, '$1 Claude')
        // drop "and yada yada yada" / "yada, yada" filler clauses from a quote
        .replace(/\s*(?:,\s*|and\s+)?yada(?:[\s,]+yada\b)+/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:])/g, '$1')
        .trim();
}

/** Strip salvageable leaked metadata and escaped-markdown from a quote body.
 *  Use AFTER isJunkQuote() has rejected the unsalvageable cases. */
function sanitizeQuoteText(text: string): string {
    return correctTranscriptArtifacts((text || '')
        // leading "*Goal alignment: 94/100 · status: Validated*" stamp
        .replace(/^\s*\*?\s*goal\s+alignment\s*:[^*]*\*?\s*/i, '')
        // any inline "status: Validated" stamp
        .replace(/\*?\s*status\s*:\s*(validated|emerging|hypothesis)\s*\*?/ig, '')
        // escaped markdown bullets/emphasis from raw reddit/markdown dumps
        .replace(/\\([-*_>#`[\]])/g, '$1')
        // stray surrounding emphasis asterisks
        .replace(/^\*+|\*+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim());
}

// Stopwords that shouldn't drive keyword overlap scoring
const STOPWORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'are',
    'was', 'were', 'but', 'not', 'their', 'them', 'they', 'into', 'than',
    'which', 'what', 'when', 'where', 'also', 'been', 'being', 'about', 'more',
    'most', 'some', 'over', 'between', 'through', 'across', 'within',
]);

/** Normalize a string to stopword-filtered lowercase word tokens of 4+ chars. */
function tokens(s: string | undefined): Set<string> {
    if (!s) return new Set();
    const out = new Set<string>();
    for (const raw of s.toLowerCase().split(/\W+/)) {
        if (raw.length < 4 || STOPWORDS.has(raw)) continue;
        out.add(raw);
    }
    return out;
}

/** Count token-set intersection size - the basic keyword overlap metric. */
function overlap(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const t of a) if (b.has(t)) n++;
    return n;
}

/** Edge-id extraction for nodes regardless of whether d3 has hydrated them. */
function edgeId(e: any, which: 'source' | 'target'): string {
    const v = e[which];
    return typeof v === 'string' ? v : (v && v.id) || '';
}

/** All evidence nodes this theme is linked to, via any edge type. */
function linkedEvidence(theme: KGNode, graph: KnowledgeGraph): KGNode[] {
    const ids = new Set<string>();
    for (const e of graph.edges) {
        const s = edgeId(e, 'source');
        const t = edgeId(e, 'target');
        if (s === theme.id) ids.add(t);
        else if (t === theme.id) ids.add(s);
    }
    return graph.nodes.filter(n => ids.has(n.id) && n.type === 'evidence');
}

/** All source nodes this theme is linked to - direct edges + parent of linked evidence. */
function linkedSources(theme: KGNode, graph: KnowledgeGraph): KGNode[] {
    const direct: KGNode[] = [];
    const ids = new Set<string>();
    for (const e of graph.edges) {
        const s = edgeId(e, 'source');
        const t = edgeId(e, 'target');
        let other: string | null = null;
        if (s === theme.id) other = t;
        else if (t === theme.id) other = s;
        if (!other) continue;
        const n = graph.nodes.find(nn => nn.id === other);
        if (n && n.type === 'source' && !ids.has(n.id)) {
            direct.push(n); ids.add(n.id);
        }
    }
    // Add parent sources of linked evidence
    for (const ev of linkedEvidence(theme, graph)) {
        if (ev.parentSourceId && !ids.has(ev.parentSourceId)) {
            const src = graph.nodes.find(n => n.id === ev.parentSourceId);
            if (src) { direct.push(src); ids.add(src.id); }
        }
    }
    return direct;
}

/** Child evidence under a given source node. */
function evidenceUnderSource(source: KGNode, graph: KnowledgeGraph): KGNode[] {
    return graph.nodes.filter(n => n.type === 'evidence' && n.parentSourceId === source.id);
}

/** Pull the most quotable text snippet out of an evidence node's metadata.
 *  Evidence nodes may carry content either as `metadata.content` (collected
 *  text) or `metadata.text` (citation text). Prefer longer of the two. */
function evidenceText(ev: KGNode): string {
    const m = ev.metadata || {};
    const candidates = [m.content, m.text, ev.label].filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (candidates.length === 0) return '';
    // Pick the longest-above-threshold, falling back to longest overall
    const above = candidates.filter(c => c.length >= MIN_QUOTE_CHARS);
    return (above.length > 0 ? above : candidates).sort((a, b) => b.length - a.length)[0];
}

/** Trim a snippet to sentence or clause boundaries within the target window.
 *  Aims to land within MAX_QUOTE_CHARS without cutting mid-word. */
function trimToSentence(raw: string, max = MAX_QUOTE_CHARS): string {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    // Try to end at the last sentence terminator inside [max*0.5, max]
    const minEnd = Math.floor(max * 0.55);
    const slice = text.slice(0, max);
    const lastTerm = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('! '),
    );
    if (lastTerm >= minEnd) return slice.slice(0, lastTerm + 1).trim();
    // Fall back to last comma or space
    const lastComma = slice.lastIndexOf(', ');
    if (lastComma >= minEnd) return slice.slice(0, lastComma).trim() + '...';
    return slice.replace(/\s+\S*$/, '') + '...';
}

/** Score a quote candidate for fitness on a theme. Higher is better. */
interface QuoteCandidate {
    text: string;
    sourceNode?: KGNode;
    evidenceNode: KGNode;
    score: number;
    url?: string;
}
function scoreCandidate(ev: KGNode, src: KGNode | undefined, themeTokens: Set<string>): QuoteCandidate | null {
    const raw = evidenceText(ev);
    if (!raw || raw.length < MIN_QUOTE_CHARS) return null;
    const text = trimToSentence(raw);
    const evTokens = tokens(text);
    const keywordHits = overlap(themeTokens, evTokens);

    // Length fitness: peaks near IDEAL_QUOTE_CHARS, falls off on both sides
    const lenDelta = Math.abs(text.length - IDEAL_QUOTE_CHARS);
    const lenScore = Math.max(0, 1 - lenDelta / IDEAL_QUOTE_CHARS);

    // Source tier bonus: T1 (academic/gov) > T2 (news) > T3 (community)
    const tier = src?.tier ?? ev.tier ?? 3;
    const tierScore = tier === 1 ? 1.0 : tier === 2 ? 0.75 : 0.5;

    // Relevance carries through from AI scoring done at collection time
    const rel = typeof ev.relevanceScore === 'number' ? ev.relevanceScore / 100 : 0.5;

    // Freshness - 90-day half-life. Missing dates score neutrally.
    const fresh = typeof ev.freshnessScore === 'number' ? ev.freshnessScore / 100 : 0.5;

    const score =
        keywordHits * 1.8 +       // semantic fit dominates
        lenScore * 0.9 +           // tight quotes preferred
        tierScore * 0.8 +          // authoritative sources preferred
        rel * 0.6 +                // AI-judged relevance
        fresh * 0.3;               // recency tiebreaker

    return {
        text,
        sourceNode: src,
        evidenceNode: ev,
        score,
        url: ev.url,
    };
}

/**
 * Extract up to N real quotes for a theme from the knowledge graph.
 *
 * The theme argument can be either a KGNode (when iterating over graph
 * nodes) or a loose { name, insight } pair (when the AI emitted a theme
 * object in slide JSON and we need to match back to the graph).
 */
export interface ThemeLike {
    id?: string;
    label?: string;
    name?: string;
    insight?: string;
}

function extractQuotesForTheme(
    theme: ThemeLike,
    graph: KnowledgeGraph,
    opts: { count?: number; excludeSources?: Set<string> } = {},
): SlideQuote[] {
    const count = Math.max(1, Math.min(10, opts.count ?? DEFAULT_MAX_PER_THEME));
    const themeName = theme.name || theme.label || '';
    const themeText = `${themeName} ${theme.insight || ''}`;
    const themeTokens = tokens(themeText);

    // Locate the theme node in the graph. If theme.id is given, use it.
    // Otherwise match by label (name).
    let themeNode: KGNode | undefined;
    if (theme.id) themeNode = graph.nodes.find(n => n.id === theme.id);
    if (!themeNode) themeNode = graph.nodes.find(n => n.type === 'theme' && n.label?.toLowerCase() === themeName.toLowerCase());
    if (!themeNode) {
        // Fuzzy match: theme label contained in slide theme name or vice versa
        themeNode = graph.nodes.find(n => {
            if (n.type !== 'theme') return false;
            const nl = (n.label || '').toLowerCase();
            const sl = themeName.toLowerCase();
            return nl.length > 4 && (nl.includes(sl) || sl.includes(nl));
        });
    }

    // Gather candidate evidence pool
    const candidatePool: Array<{ ev: KGNode; src?: KGNode }> = [];
    if (themeNode) {
        // Tier B: theme's directly-linked evidence nodes
        for (const ev of linkedEvidence(themeNode, graph)) {
            const src = ev.parentSourceId ? graph.nodes.find(n => n.id === ev.parentSourceId) : undefined;
            candidatePool.push({ ev, src });
        }
        // Tier C: if sparse, include evidence from linked sources not already counted
        if (candidatePool.length < count * 2) {
            const seenEvIds = new Set(candidatePool.map(c => c.ev.id));
            for (const src of linkedSources(themeNode, graph)) {
                for (const ev of evidenceUnderSource(src, graph)) {
                    if (seenEvIds.has(ev.id)) continue;
                    seenEvIds.add(ev.id);
                    candidatePool.push({ ev, src });
                }
            }
        }
    }

    // Tier A: Also include ALL evidence nodes with strong keyword overlap to
    // the theme text - this catches quotes the graph edges missed.
    if (candidatePool.length < count * 2 && themeTokens.size > 0) {
        const seenEvIds = new Set(candidatePool.map(c => c.ev.id));
        for (const ev of graph.nodes) {
            if (ev.type !== 'evidence' || seenEvIds.has(ev.id)) continue;
            const evTok = tokens(evidenceText(ev));
            if (overlap(themeTokens, evTok) >= 3) {
                const src = ev.parentSourceId ? graph.nodes.find(n => n.id === ev.parentSourceId) : undefined;
                candidatePool.push({ ev, src });
            }
        }
    }

    // Score, filter out excluded sources, and sort
    const excluded = opts.excludeSources || new Set<string>();
    const scored: QuoteCandidate[] = [];
    for (const { ev, src } of candidatePool) {
        if (src?.label && excluded.has(src.label)) continue;
        const c = scoreCandidate(ev, src, themeTokens);
        if (c) scored.push(c);
    }
    scored.sort((a, b) => b.score - a.score);

    // Diversify: prefer distinct sources. Keep the top-scored candidate per
    // source, then relax if we still need more to hit `count`.
    const picked: QuoteCandidate[] = [];
    const usedSources = new Set<string>();
    for (const c of scored) {
        const sourceKey = c.sourceNode?.id || c.sourceNode?.label || c.evidenceNode.parentSourceId || 'unknown';
        if (usedSources.has(sourceKey)) continue;
        picked.push(c);
        usedSources.add(sourceKey);
        if (picked.length >= count) break;
    }
    // Backfill from the same-source pool if we still have gaps
    if (picked.length < count) {
        const pickedEvIds = new Set(picked.map(p => p.evidenceNode.id));
        for (const c of scored) {
            if (pickedEvIds.has(c.evidenceNode.id)) continue;
            picked.push(c);
            if (picked.length >= count) break;
        }
    }

    return picked.map(c => ({
        text: c.text,
        source: c.sourceNode?.label || c.evidenceNode.metadata?.sourceName || 'Source',
        attribution: c.evidenceNode.metadata?.author || undefined,
        url: c.url,
        date: c.evidenceNode.metadata?.date || undefined,
    }));
}

/**
 * Detect quote density directives in a user message.
 *
 * Matches patterns like:
 *   "3 quotes each"          → { count: 3, perTheme: true }
 *   "#quotes=5"              → { count: 5 }
 *   "with 4 quotes"          → { count: 4 }
 *   "include three quotes"   → { count: 3 }
 *
 * Returns null when no directive is present.
 */
export function detectQuoteDensity(message: string): { count: number; perTheme: boolean } | null {
    if (!message) return null;
    const m = message.toLowerCase();

    // Hashtag form: #quotes=N
    const hashMatch = m.match(/#quotes\s*=\s*(\d+)/);
    if (hashMatch) {
        const n = parseInt(hashMatch[1], 10);
        if (n >= 1 && n <= 10) return { count: n, perTheme: true };
    }

    // "N quotes each" or "N quotes per"
    const eachMatch = m.match(/(\d+)\s+quotes?\s+(?:each|per)/);
    if (eachMatch) {
        const n = parseInt(eachMatch[1], 10);
        if (n >= 1 && n <= 10) return { count: n, perTheme: true };
    }

    // "with N quotes" / "include N quotes" / "N quotes per theme"
    const withMatch = m.match(/(?:with|include|show|add|give|pull)\s+(\d+)\s+quotes?/);
    if (withMatch) {
        const n = parseInt(withMatch[1], 10);
        if (n >= 1 && n <= 10) return { count: n, perTheme: true };
    }

    // Word-number forms
    const wordMap: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    };
    const wordMatch = m.match(/\b(one|two|three|four|five|six|seven|eight)\s+quotes?\s+(?:each|per)/);
    if (wordMatch && wordMap[wordMatch[1]]) {
        return { count: wordMap[wordMatch[1]], perTheme: true };
    }

    return null;
}

/**
 * Enrich a parsed slide JSON block in-place by pulling real quotes from the
 * knowledge graph for every theme that doesn't already carry `quotes[]`.
 *
 * This is called after the AI produces slide JSON and before the renderer
 * consumes it - guaranteeing every theme on a quote-dense slide shows real
 * corpus-backed text. Fabrication impossible: if no matching evidence exists,
 * the function leaves `quotes[]` empty and the renderer falls back to the
 * `evidence` / `source` pair.
 *
 * @returns the same slide object (for chaining), mutated in place
 */
export function enrichSlideWithQuotes(slide: any, graph: KnowledgeGraph, directive: { count: number }): any {
    if (!slide || typeof slide !== 'object') return slide;
    if (!directive || directive.count < 1) return slide;

    // The slide shapes that carry a themes array: themeCluster
    const themes = slide?.themeCluster?.themes;
    if (Array.isArray(themes)) {
        for (const t of themes) {
            if (Array.isArray(t.quotes) && t.quotes.length >= directive.count) continue;
            const pulled = extractQuotesForTheme(t, graph, { count: directive.count });
            if (pulled.length > 0) {
                t.quotes = pulled;
            }
        }
    }
    return slide;
}

// --- WIKI-BACKED QUOTE BACKFILL (2026-04-20) -----------------------------
// Deterministic fallback: walks every theme in every slide, detects
// evidence fields that look like article titles (not body sentences), and
// replaces them with real sentences pulled from the wiki archive. This is
// the safety net that runs EVEN IF the AI emits a headline as a "quote" -
// we overwrite with ground truth from the archive.

/** Heuristic: does this string look like an article title/headline rather
 *  than a body sentence? Title signatures: Title Case, minimal verbs,
 *  common headline patterns like "How X did Y", "N Ways to Z", etc. */
function looksLikeTitle(text: string | undefined): boolean {
    if (!text) return true;
    const s = text.trim();
    if (s.length < 40) return true;                       // too short to be a real quote
    // Headline heuristic 1: no terminal punctuation AND no internal comma/dash
    if (!/[.!?]/.test(s) && !/[,;:-]/.test(s)) return true;
    // Headline heuristic 2: majority of words capitalized (>60%)
    // Exclude stopwords/connectives ("to", "a", "for", "and", etc.) which legitimately
    // stay lowercase even in Title-Case titles - so we check proper words only.
    const TITLE_STOPWORDS = new Set(['a','an','the','of','in','on','at','to','for','and','or','but','with','by','as','is','are','was','were']);
    const words = s.split(/\s+/).filter(w => w.length > 1);
    const titleWords = words.filter(w => !TITLE_STOPWORDS.has(w.toLowerCase().replace(/[^a-z]/g, '')));
    if (titleWords.length >= 4) {
        const capped = titleWords.filter(w => /^[A-Z]/.test(w)).length;
        if (capped / titleWords.length > 0.6) return true;
    }
    // Headline heuristic 3: article/Reddit-title patterns ending in ? or !,
    // starting with a question word, under 120 chars. These are almost always
    // post titles rather than body sentences. Apostrophes ("What's") and
    // parens ("(with full AI features)") are common in titles - do NOT use
    // their presence to disqualify.
    if (/^(how|why|what|when|which|who|where|is|are|can|should|does|do|the\s+best|top\s+\d|\d+\s+ways)\b/i.test(s)) {
        if (s.length < 140) return true;
    }
    // Headline heuristic 4: "<Thing>: <Longer Thing>" colon-split titles
    // ("From Go-Live to Growth Driver: A CRM Maturity Framework for Advancement Teams")
    // These read as body sentences to the old detector because the colon added
    // internal punctuation, but they are structurally titles - short clause
    // before colon, noun-phrase-heavy clause after.
    const colonSplit = s.split(/:\s+/);
    if (colonSplit.length === 2 && s.length < 160) {
        const before = colonSplit[0];
        const after = colonSplit[1];
        // No verbs in the "after" part often signals a title - check for
        // common verb endings / modals instead of full NLP. If the after-part
        // has no lowercase verbs like "is/are/was/were/has/had/will/does/can",
        // it's likely a title subtitle.
        if (!/\b(is|are|was|were|has|had|will|does|can|could|should|might|may|shows|found|reports|says|argues|claims|suggests|indicates|reveals|notes)\b/i.test(after)
            && before.length < 80) {
            return true;
        }
    }
    // Headline heuristic 5: ends with ? AND is short AND has few verbs
    if (/\?\s*$/.test(s) && s.length < 100) {
        return true;
    }
    return false;
}

/** Extract 1-3 body sentences from a fetched wiki article, skipping the
 *  article's own title line. Picks sentences that have verbs and concrete
 *  language. Falls back to first paragraph if nothing else qualifies. */
function extractBodySentences(article: WikiArticleBody, maxSentences: number = 3): string[] {
    const body = article.content || '';
    // Strip a leading line that matches the article title (case-insensitive)
    const titleLower = (article.title || '').toLowerCase().trim();
    let text = body;
    if (titleLower.length > 10) {
        const firstLineEnd = text.indexOf('\n');
        if (firstLineEnd > 0) {
            const firstLine = text.substring(0, firstLineEnd).toLowerCase().trim();
            if (firstLine === titleLower || firstLine.includes(titleLower) || titleLower.includes(firstLine)) {
                text = text.substring(firstLineEnd + 1);
            }
        }
    }
    // Sentence split on .!? followed by whitespace
    const sentences = text
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        // Filter for length AND reject anything that looks like a title itself.
        // This is critical: wiki article bodies sometimes begin with the
        // article's headline restated as a sentence, or with subsection
        // headers like "Conclusion" or "Methodology". Without this filter the
        // backfill happily replaces a title-quote with ANOTHER title-quote.
        .filter(s => s.length >= 60 && s.length <= 260 && !looksLikeTitle(s));
    // Score: prefer sentences with numbers, quote marks, or named entities.
    // Also reward "sentence-like" linguistic features (contains a verb form).
    const scored = sentences.map(s => {
        let score = 0;
        if (/\d/.test(s)) score += 2;                     // numbers are concrete
        if (/["'"']/.test(s)) score += 1;                 // quoted speech
        if (/\b[A-Z][a-z]+\s+[A-Z]/.test(s)) score += 1;  // proper noun pairs (names/orgs)
        if (s.length > 80 && s.length < 200) score += 1;  // ideal length
        // Verb presence bumps the score - a verb-bearing sentence is prose,
        // not a heading.
        if (/\b(is|are|was|were|has|had|will|shows|found|reports|says|argues|claims|suggests|indicates|reveals|notes|describes|means|requires)\b/i.test(s)) score += 1;
        return { s, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxSentences).map(x => x.s);
}

/** For each theme whose evidence looks like a title (or is missing),
 *  fetch wiki articles matching the theme name/insight and replace
 *  evidence/quotes with real body sentences. Mutates slide in place.
 *  Returns true if any change was made. */
interface BackfillStats {
    totalThemes: number;
    needingBackfill: number;   // themes where evidence looked like a title
    wikiHitsPass1: number;     // themes that got quotes from min-800 query
    wikiHitsPass2: number;     // themes that got quotes from relaxed min-200 retry
    noMatchAnywhere: number;   // themes the wiki archive couldn't serve at all
}

// Tokenize text into content words (lowercase, ≥4 chars, not a stopword).
// Used to compute keyword overlap between a candidate sentence and a theme.
const BACKFILL_STOPWORDS = new Set([
    'this','that','these','those','with','from','have','will','been','were','was',
    'they','their','them','there','which','would','could','should','about','into',
    'through','between','some','most','many','such','other','than','also','only',
    'then','when','where','what','whom','whose','while','being','does','doing',
    'over','under','above','below','after','before','same','more','like','just',
    'each','even','both','used','using','make','makes','made','need','needs',
]);
function contentTokens(s: string): Set<string> {
    const out = new Set<string>();
    const lower = (s || '').toLowerCase();
    const matches = lower.match(/[a-z][a-z0-9-]{3,}/g) || [];
    for (const tok of matches) {
        if (!BACKFILL_STOPWORDS.has(tok)) out.add(tok);
    }
    return out;
}
function normalizeForDedup(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

async function backfillThemeCluster(themeCluster: any, fallbackQuery: string, stats: BackfillStats): Promise<boolean> {
    if (!themeCluster || !Array.isArray(themeCluster.themes)) return false;
    let changed = false;

    // Cluster-level dedup - prevents the SAME sentence appearing across
    // multiple themes on one slide (the "Mary Washington bequest" bug was a
    // single PDF chunk dominating wiki search across themes).
    const clusterSeen = new Set<string>();

    // Process themes in parallel to keep latency bounded
    await Promise.all(themeCluster.themes.map(async (t: any) => {
        stats.totalThemes++;

        // PRE-SCRUB (2026-06-01): clean the AI's ORIGINAL quotes/evidence/source
        // before deciding whether backfill is needed. Drops synthesis-as-source
        // and test-fixture-sourced quotes entirely, strips leaked goal-alignment
        // /status metadata, and unescapes raw-dump markdown. A theme whose
        // quotes are ALL junk falls through to wiki backfill below.
        if (Array.isArray(t.quotes) && t.quotes.length > 0) {
            const beforeLen = t.quotes.length;
            t.quotes = t.quotes
                .filter((q: any) => q && !isJunkQuote(q.text) && !isJunkSource(q.source))
                .map((q: any) => ({ ...q, text: sanitizeQuoteText(q.text) }))
                .filter((q: any) => (q.text || '').length >= MIN_QUOTE_CHARS);
            if (t.quotes.length !== beforeLen) changed = true;
        }
        if (isJunkQuote(t.evidence) || isJunkSource(t.source)) {
            t.evidence = ''; t.source = t.source && !isJunkSource(t.source) ? t.source : '';
            changed = true;
        } else if (t.evidence) {
            t.evidence = sanitizeQuoteText(t.evidence);
        }

        const hasQuoteArray = Array.isArray(t.quotes) && t.quotes.length > 0;
        const quotesLookReal = hasQuoteArray && t.quotes.every((q: any) => !looksLikeTitle(q?.text));
        // A verbatim quote in the `evidence` STRING is just as healthy as one in
        // a `quotes[]` array. Opus emits its grounded quote as `evidence` (string)
        // with NO `quotes[]`, so the old `quotesLookReal && ...` skip never fired
        // and EVERY theme got flagged for "upgrade". When the >=2-token wiki match
        // then won, it OVERWROTE a correct on-topic quote with cross-engagement
        // noise (2026-06-15 deck: 3 quotes replaced with stray Reddit sentences).
        // The pre-scrub above has already emptied junk evidence, so a non-empty,
        // non-title `evidence` here is a real quote we must NOT clobber.
        const evidenceIsReal = typeof t.evidence === 'string'
            && t.evidence.trim().length >= MIN_QUOTE_CHARS
            && !looksLikeTitle(t.evidence)
            && !isJunkQuote(t.evidence);
        if (quotesLookReal || evidenceIsReal) return;    // healthy; skip backfill
        stats.needingBackfill++;

        const themeQuery = [t.name, t.insight].filter(Boolean).join(' ').trim();
        const query = themeQuery.length >= 12 ? themeQuery : fallbackQuery;
        if (!query || query.length < 8) { stats.noMatchAnywhere++; return; }

        // Theme anchor tokens - candidate sentences must share ≥2 content
        // tokens with the theme or they're likely off-topic noise from an
        // article that merely keyword-matched the search index.
        const themeAnchor = contentTokens(themeQuery);
        // Raised 2 -> 3 (2026-06-15): a 2-token surface overlap matched
        // topically-unrelated articles (theme "Deterministic deliverables" pulled
        // an r/MachineLearning "structured output benchmark" sentence; "Multi-source
        // ingestion" pulled an r/stocks Reddit-citation-rate stat). Backfill only
        // reaches this point when evidence is genuinely missing/title-like, so a
        // stricter bar is safe: a weak match is worse than leaving evidence empty.
        const MIN_ANCHOR_OVERLAP = 3;

        let articles = await fetchWikiArticles({
            query,
            limit: 6,                    // was 3 - give more candidates after relevance filter
            maxCharsPerArticle: 8_000,
            minChars: 800,
        });
        let hitPass = 1;

        if (!articles || articles.length === 0) {
            articles = await fetchWikiArticles({
                query,
                limit: 6,
                maxCharsPerArticle: 8_000,
                minChars: 200,
            });
            hitPass = 2;
        }

        if (!articles || articles.length === 0) {
            stats.noMatchAnywhere++;
            return;
        }

        // Collect candidate sentences from all matching articles, score each
        // by keyword overlap with the theme anchor. Reject sentences with
        // <MIN_ANCHOR_OVERLAP tokens in common - those are unrelated noise.
        type Candidate = { text: string; source: string; url?: string; date?: string; overlap: number };
        const candidates: Candidate[] = [];
        for (const art of articles) {
            // Drop entire articles whose source is pipeline chrome / test fixtures
            // (synthesis self-refs, "PhaseA Test Source", "A4 Logistics Src").
            if (isJunkSource(art.source)) continue;
            const sents = extractBodySentences(art, 3);    // was 1 - pull more per article
            for (const sent of sents) {
                if (isJunkQuote(sent)) continue;            // raw dumps / leaked metadata
                const cleaned = sanitizeQuoteText(sent);
                if (cleaned.length < MIN_QUOTE_CHARS) continue;
                const sentTokens = contentTokens(cleaned);
                let overlap = 0;
                for (const tok of sentTokens) if (themeAnchor.has(tok)) overlap++;
                candidates.push({
                    text: cleaned,
                    source: art.source || 'Source',
                    url: art.url,
                    date: art.date,
                    overlap,
                });
            }
        }

        candidates.sort((a, b) => b.overlap - a.overlap);
        const pulled: SlideQuote[] = [];
        const localSeen = new Set<string>();
        for (const c of candidates) {
            if (c.overlap < MIN_ANCHOR_OVERLAP) break;     // sorted; remaining are also below threshold
            const norm = normalizeForDedup(c.text);
            if (!norm || localSeen.has(norm) || clusterSeen.has(norm)) continue;
            localSeen.add(norm);
            clusterSeen.add(norm);
            pulled.push({ text: c.text, source: c.source, url: c.url, date: c.date });
            if (pulled.length >= 3) break;
        }

        if (pulled.length > 0) {
            t.quotes = pulled;
            t.evidence = pulled[0].text;
            t.source = pulled[0].source;
            changed = true;
            if (hitPass === 1) stats.wikiHitsPass1++;
            else stats.wikiHitsPass2++;
        } else {
            // Archive had candidates but NONE were topic-relevant. Leaving
            // the AI's original evidence/quotes beats injecting noise - a
            // wrong quote reads as authoritative slop.
            stats.noMatchAnywhere++;
        }
    }));
    return changed;
}

/**
 * Backfill all slides in a batch by pulling real body sentences from the
 * wiki archive wherever a theme's evidence/quotes look like titles. This
 * is the async companion to enrichSlideWithQuotes - call it AFTER the
 * slides have been parsed and added to state, then update state again
 * with the enriched versions.
 *
 * Non-blocking by contract: wiki fetch failures return the slides
 * unchanged. A slide with real KG-extracted quotes is untouched.
 *
 * @param slides  parsed slide array
 * @param userMessage  original user query (used as fallback when theme
 *                     names are too generic to form a good query)
 * @returns a new slides array with themeCluster quotes backfilled
 *          where needed. Other slide shapes are passed through unchanged.
 */
export async function backfillSlidesFromWiki(slides: any[], userMessage: string): Promise<any[]> {
    if (!Array.isArray(slides) || slides.length === 0) return slides;
    // Shallow-clone so React treats this as a state change
    const out = slides.map(s => ({ ...s, themeCluster: s.themeCluster ? { ...s.themeCluster, themes: s.themeCluster.themes?.map((t: any) => ({ ...t })) } : s.themeCluster }));
    let anyChanged = false;
    const stats: BackfillStats = { totalThemes: 0, needingBackfill: 0, wikiHitsPass1: 0, wikiHitsPass2: 0, noMatchAnywhere: 0 };
    // Sequential across slides to avoid stampeding the proxy; each slide's
    // themes run in parallel internally.
    for (const slide of out) {
        if (!slide.themeCluster) continue;
        const changed = await backfillThemeCluster(slide.themeCluster, userMessage, stats);
        if (changed) anyChanged = true;
    }
    // Always log the outcome - ZERO matches is as informative as full matches
    // ("wiki archive is headline-heavy for these themes - re-run collection").
    const summary = `[slides] wiki backfill: ${stats.needingBackfill}/${stats.totalThemes} themes flagged, ${stats.wikiHitsPass1} upgraded (strict), ${stats.wikiHitsPass2} upgraded (relaxed), ${stats.noMatchAnywhere} no-match`;
    if (stats.needingBackfill === 0) {
        console.log(`${summary} - nothing to do`);
    } else if (anyChanged) {
        console.log(summary);
    } else {
        console.warn(`${summary} - archive lacks body text for these topics; run a fresh collection to populate wiki with enriched bodies`);
    }
    if (!anyChanged) return slides;     // nothing to update, return original ref
    return out;
}
