/**
 * queryFabric — the Planner + Selector skills that replace refineSearchQueries.
 *
 * Two-stage query generation, per the April 2026 research consensus:
 *   - Planner (SubSearch / EigentSearch-Q+ pattern): for each research question
 *     in the brief, generate a frontier of 4-6 candidate queries using varied
 *     decomposition strategies. This is an AI call with structured JSON output.
 *   - Selector (EigentSearch-Q+ picker): for each source, choose one query from
 *     the combined frontier, conditioned on the source's capability manifest
 *     and the question's priority. This is deterministic, no AI call.
 *
 * Output shape is a drop-in replacement for the refineSearchQueries result
 * (Record<sourceId, string>) so the existing collection batch loop runs
 * unchanged. Cost parity with the old path is preserved: one HTTP call per
 * source, same as before.
 *
 * This tier upgrades WHICH query goes to each source — not HOW MANY. Per-source
 * multi-query execution lands in a later tier when budget accounting is in place.
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { ParsedBrief, SourceCapabilityManifest, TrajectoryEvent } from './evidenceRecord';
import { getSourceCapability } from './sourceCapabilities';

// --- TYPES ---

export type QueryStrategy =
    | 'literal'           // keywords drawn verbatim from the question
    | 'expansion'         // synonyms + related terms broaden the match
    | 'entity-specific'   // targets a named entity from the brief
    | 'alternative-framing'  // rephrased from a different vantage
    | 'date-scoped'       // explicit year range injected
    | 'named-entity';     // specific subreddit/peer/vendor probe

export interface QueryCandidate {
    query: string;
    strategy: QueryStrategy;
    rationale: string;
    /** Whether the candidate is date-scoped (controls selector compatibility) */
    hasDateToken: boolean;
    /** Whether the candidate names a specific entity (e.g. "Cornell", "r/NEU") */
    hasNamedEntity: boolean;
}

export interface QuestionFrontier {
    questionId: string;
    questionText: string;
    priority: 'critical' | 'important' | 'nice-to-have';
    candidates: QueryCandidate[];
}

export interface FabricResult {
    /** sourceId → the single best query for that source */
    sourceQueries: Record<string, string>;
    /** Metadata per source — which question, strategy, rationale won */
    picks: Record<string, {
        questionId: string;
        strategy: QueryStrategy;
        rationale: string;
    }>;
    /** The raw frontier for audit/debug + future per-source-multi-query mode */
    frontiers: QuestionFrontier[];
    /** Structured log of everything the fabric did — feeds the Bibliography trajectory tab */
    trajectory: TrajectoryEvent[];
    /** True if the AI call succeeded; false if we fell back to heuristic queries */
    usedAI: boolean;
}

// --- PUBLIC API ---

/**
 * Plan query frontiers from a ParsedBrief, then select one query per source.
 * Returns a drop-in replacement for refineSearchQueries + a trajectory log
 * for observability.
 *
 * Graceful fallback: if AI fails, generates a heuristic frontier from the brief
 * directly (no AI call). Collection proceeds either way.
 */
export async function planAndSelect(
    brief: ParsedBrief,
    sourceIds: string[],
    opts?: { maxFrontierSize?: number; maxPerSource?: number }
): Promise<FabricResult> {
    const trajectory: TrajectoryEvent[] = [];
    const startedAt = new Date().toISOString();
    const maxFrontier = opts?.maxFrontierSize ?? 6;

    trajectory.push({
        id: `traj_${Date.now()}_planner_start`,
        timestamp: startedAt,
        type: 'phase',
        summary: `Planner starting — ${brief.questions.length} questions × max ${maxFrontier} candidates each`,
        payload: { questionCount: brief.questions.length, sourceCount: sourceIds.length },
    });

    // 1) Build the frontier — AI-powered when the brief is substantial enough to
    //    benefit; heuristic otherwise (trivially short briefs, or AI unavailable)
    let frontiers: QuestionFrontier[];
    let usedAI = false;
    if (brief.questions.length === 0) {
        // Defensive: briefs with no extracted questions get a single Q1 from mission
        frontiers = heuristicFrontier({
            ...brief,
            questions: [{ id: 'Q1', text: brief.mission }],
        }, maxFrontier);
    } else {
        try {
            frontiers = await aiFrontier(brief, maxFrontier);
            usedAI = true;
            trajectory.push({
                id: `traj_${Date.now()}_planner_ai`,
                timestamp: new Date().toISOString(),
                type: 'planner_frontier',
                summary: `AI planner returned ${frontiers.reduce((s, f) => s + f.candidates.length, 0)} candidate queries across ${frontiers.length} questions`,
                questionIds: frontiers.map(f => f.questionId),
                payload: {
                    strategies: uniqueStrategies(frontiers),
                    candidateCount: frontiers.reduce((s, f) => s + f.candidates.length, 0),
                },
            });
        } catch (e: any) {
            console.warn('[queryFabric] AI planner failed, using heuristic frontier:', e?.message);
            frontiers = heuristicFrontier(brief, maxFrontier);
            trajectory.push({
                id: `traj_${Date.now()}_planner_fallback`,
                timestamp: new Date().toISOString(),
                type: 'warning',
                summary: `AI planner failed (${(e?.message || 'unknown').substring(0, 80)}) — fell back to heuristic frontier`,
            });
        }
    }

    // 2) Select one query per source via capability-aware scoring
    const sourceQueries: Record<string, string> = {};
    const picks: FabricResult['picks'] = {};

    for (const sid of sourceIds) {
        const cap = getSourceCapability(sid);
        const pick = pickQueryForSource(sid, cap, frontiers, brief);
        if (!pick) continue;
        sourceQueries[sid] = pick.query;
        picks[sid] = { questionId: pick.questionId, strategy: pick.strategy, rationale: pick.rationale };

        trajectory.push({
            id: `traj_${Date.now()}_${sid}_pick`,
            timestamp: new Date().toISOString(),
            type: 'selector_pick',
            summary: `[${sid}] → Q${pick.questionId.replace('Q', '')} via ${pick.strategy}: "${pick.query}"`,
            sourceId: sid,
            questionIds: [pick.questionId],
            payload: {
                query: pick.query,
                strategy: pick.strategy,
                rationale: pick.rationale,
                honoredFilters: {
                    dateRange: cap.dateFilter === 'supported' || cap.dateFilter === 'best-effort',
                    domainExclude: cap.domainExclude === 'supported' || cap.domainExclude === 'post-filter',
                },
            },
        });
    }

    trajectory.push({
        id: `traj_${Date.now()}_selector_end`,
        timestamp: new Date().toISOString(),
        type: 'phase',
        summary: `Selector picked queries for ${Object.keys(sourceQueries).length} of ${sourceIds.length} sources`,
    });

    return { sourceQueries, picks, frontiers, trajectory, usedAI };
}

// --- AI-POWERED FRONTIER GENERATION ---

async function aiFrontier(brief: ParsedBrief, maxPerQuestion: number): Promise<QuestionFrontier[]> {
    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY missing');

    const prompt = buildFrontierPrompt(brief, maxPerQuestion);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: buildFrontierSchema(),
        },
    });
    let text = response.text || '[]';
    if (text.includes('```json')) text = text.split('```json')[1].split('```')[0].trim();
    else if (text.includes('```')) text = text.split('```')[1].split('```')[0].trim();

    const raw = JSON.parse(text);
    const arr = Array.isArray(raw) ? raw : (raw.frontiers || []);

    // Normalize: ensure every requested question has an entry, even if AI skipped some
    const byId: Record<string, QuestionFrontier> = {};
    for (const item of arr) {
        if (!item || !item.questionId) continue;
        byId[item.questionId] = normalizeFrontier(item, brief);
    }
    const out: QuestionFrontier[] = [];
    for (const q of brief.questions) {
        out.push(byId[q.id] || {
            questionId: q.id,
            questionText: q.text,
            priority: q.priority || 'important',
            candidates: heuristicCandidatesForQuestion(q.text, brief, maxPerQuestion),
        });
    }
    return out;
}

function normalizeFrontier(item: any, brief: ParsedBrief): QuestionFrontier {
    const q = brief.questions.find(x => x.id === item.questionId);
    const candidates: QueryCandidate[] = Array.isArray(item.candidates)
        ? item.candidates.slice(0, 10).map((c: any) => {
            const query = String(c.query || '').trim();
            return {
                query,
                strategy: ([
                    'literal', 'expansion', 'entity-specific',
                    'alternative-framing', 'date-scoped', 'named-entity',
                ].includes(c.strategy) ? c.strategy : 'literal') as QueryStrategy,
                rationale: String(c.rationale || '').trim() || 'No rationale provided',
                hasDateToken: /\b(19|20)\d{2}\b/.test(query),
                hasNamedEntity: containsNamedEntity(query, brief),
            };
        }).filter((c: QueryCandidate) => c.query.length > 0)
        : [];
    return {
        questionId: item.questionId,
        questionText: q?.text || '',
        priority: (q?.priority || 'important') as QuestionFrontier['priority'],
        candidates,
    };
}

function containsNamedEntity(query: string, brief: ParsedBrief): boolean {
    const lower = query.toLowerCase();
    const all = [
        ...brief.namedEntities.subreddits,
        ...brief.namedEntities.publications,
        ...brief.namedEntities.peerEntities,
        ...brief.namedEntities.vendors,
        ...brief.namedEntities.hashtags,
        ...brief.namedEntities.authors,
    ];
    return all.some(e => e && lower.includes(e.toLowerCase()));
}

function buildFrontierPrompt(brief: ParsedBrief, maxPerQuestion: number): string {
    const namedEntities = brief.namedEntities;
    const entitiesBlock = [
        namedEntities.subreddits.length ? `  Subreddits: ${namedEntities.subreddits.map(s => 'r/' + s).join(', ')}` : null,
        namedEntities.publications.length ? `  Publications: ${namedEntities.publications.join(', ')}` : null,
        namedEntities.peerEntities.length ? `  Peer entities: ${namedEntities.peerEntities.join(', ')}` : null,
        namedEntities.vendors.length ? `  Vendors: ${namedEntities.vendors.join(', ')}` : null,
        namedEntities.hashtags.length ? `  Hashtags: ${namedEntities.hashtags.join(' ')}` : null,
    ].filter(Boolean).join('\n');

    return `You are a research-query planner. For each research question below, produce a FRONTIER of up to ${maxPerQuestion} candidate queries using DIVERSE decomposition strategies. A downstream selector will pick the best query per source, so variety is a feature — each candidate should probe the same question from a different angle.

DECOMPOSITION STRATEGIES (use at least 3 per question):
  - literal: concise keywords drawn verbatim from the question (5-10 keywords)
  - expansion: synonyms + related terms that broaden the keyword match
  - entity-specific: targets a named entity from the brief ("Cornell alumni giving 2025")
  - alternative-framing: rephrases the question from a different vantage
  - date-scoped: includes explicit year tokens from the brief's date filter
  - named-entity: a pure named-entity probe ("r/fatFIRE donor stewardship")

RULES:
  - Each query: 4-12 keywords. No filler words. No quotes unless exact phrase is essential.
  - Each candidate must be DIFFERENT from the others for the same question.
  - Respect the brief's EXCLUDE rules — never include excluded terms.
  - If the brief has a date filter, at LEAST one candidate per question MUST include
    explicit year tokens (e.g. "2025", "2026", "2024 2025") so date-capable sources
    can benefit.
  - If the brief has named entities, at LEAST one candidate per question should
    target a relevant named entity (subreddit, peer, publication, vendor).
  - Keep 'rationale' short (one line — why this angle matters for this question).

CONTEXT
Mission: ${brief.mission}
Verticals: ${brief.verticals.join(', ') || 'general'}
Date filter: ${brief.dateFilter ? `${brief.dateFilter.from}${brief.dateFilter.to ? ' → ' + brief.dateFilter.to : ' → present'}` : 'none'}
Include rules: ${brief.includeRules.slice(0, 8).join(' · ') || 'none'}
Exclude rules: ${brief.excludeRules.slice(0, 8).join(' · ') || 'none'}
Named entities:
${entitiesBlock || '  (none)'}

QUESTIONS
${brief.questions.map(q => `${q.id} (${q.priority || 'important'}): ${q.text}`).join('\n')}

Return JSON. Each question gets one entry with its candidates array.`;
}

function buildFrontierSchema(): any {
    const str = { type: Type.STRING };
    return {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                questionId: str,
                candidates: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            query: str,
                            strategy: str,
                            rationale: str,
                        },
                        required: ['query', 'strategy'],
                    },
                },
            },
            required: ['questionId', 'candidates'],
        },
    };
}

// --- HEURISTIC FRONTIER (fallback when AI unavailable) ---

function heuristicFrontier(brief: ParsedBrief, maxPerQuestion: number): QuestionFrontier[] {
    return brief.questions.map(q => ({
        questionId: q.id,
        questionText: q.text,
        priority: (q.priority || 'important') as QuestionFrontier['priority'],
        candidates: heuristicCandidatesForQuestion(q.text, brief, maxPerQuestion),
    }));
}

function heuristicCandidatesForQuestion(
    questionText: string,
    brief: ParsedBrief,
    maxPerQuestion: number
): QueryCandidate[] {
    const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for',
        'on', 'with', 'at', 'by', 'from', 'as', 'and', 'but', 'or', 'not', 'this', 'that',
        'it', 'its', 'their', 'they', 'them', 'what', 'which', 'who', 'how', 'when', 'where',
        'about', 'into', 'through', 'during', 'before', 'after', 'between']);
    const words = questionText
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stop.has(w));
    const coreKeywords = words.slice(0, 8).join(' ');

    const year = brief.dateFilter?.from?.substring(0, 4) || '';
    const cands: QueryCandidate[] = [];

    // literal
    cands.push({
        query: coreKeywords,
        strategy: 'literal',
        rationale: 'Core keywords from question (heuristic)',
        hasDateToken: false,
        hasNamedEntity: false,
    });

    // date-scoped
    if (year) {
        cands.push({
            query: `${coreKeywords} ${year} ${brief.dateFilter?.to ? (brief.dateFilter.to.substring(0, 4)) : ''}`.trim(),
            strategy: 'date-scoped',
            rationale: 'Add year tokens so date-capable sources honor the brief filter',
            hasDateToken: true,
            hasNamedEntity: false,
        });
    }

    // expansion — add mission keywords
    const missionWords = brief.mission.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w));
    if (missionWords.length > 0) {
        cands.push({
            query: `${coreKeywords} ${missionWords.slice(0, 3).join(' ')}`.trim(),
            strategy: 'expansion',
            rationale: 'Mix core keywords with mission-level context',
            hasDateToken: false,
            hasNamedEntity: false,
        });
    }

    // named-entity — per named peer or publication, attach one
    const topEntity =
        brief.namedEntities.peerEntities[0] ||
        brief.namedEntities.publications[0] ||
        brief.namedEntities.vendors[0];
    if (topEntity) {
        cands.push({
            query: `${topEntity} ${coreKeywords.split(' ').slice(0, 4).join(' ')}`.trim(),
            strategy: 'named-entity',
            rationale: `Probe named entity "${topEntity}" on this question`,
            hasDateToken: false,
            hasNamedEntity: true,
        });
    }

    // vertical-flavored alternative framing
    if (brief.verticals.length > 0) {
        cands.push({
            query: `${coreKeywords} ${brief.verticals[0].replace('_', ' ')}`.trim(),
            strategy: 'alternative-framing',
            rationale: `Frame the question inside the ${brief.verticals[0]} domain`,
            hasDateToken: false,
            hasNamedEntity: false,
        });
    }

    return cands.slice(0, maxPerQuestion);
}

function uniqueStrategies(frontiers: QuestionFrontier[]): string[] {
    const set = new Set<string>();
    for (const f of frontiers) for (const c of f.candidates) set.add(c.strategy);
    return Array.from(set);
}

// --- SELECTOR (deterministic, capability-aware) ---

/**
 * Pick the single best query for a given source from the full frontier.
 * Returns null if no candidate can be honored by the source.
 */
function pickQueryForSource(
    sourceId: string,
    cap: SourceCapabilityManifest,
    frontiers: QuestionFrontier[],
    brief: ParsedBrief
): { query: string; questionId: string; strategy: QueryStrategy; rationale: string } | null {
    // Flatten every candidate into a scoring pool
    const pool: Array<{
        candidate: QueryCandidate;
        questionId: string;
        priority: QuestionFrontier['priority'];
        score: number;
    }> = [];

    for (const f of frontiers) {
        for (const c of f.candidates) {
            const score = scoreCandidateForSource(c, cap, f.priority, sourceId, brief);
            pool.push({ candidate: c, questionId: f.questionId, priority: f.priority, score });
        }
    }
    if (pool.length === 0) return null;

    pool.sort((a, b) => b.score - a.score);
    const winner = pool[0];
    if (winner.score <= 0) {
        // No positive match — fall back to a generic query derived from mission
        return {
            query: brief.mission.split(' ').slice(0, 8).join(' ').toLowerCase(),
            questionId: winner.questionId,
            strategy: 'literal' as QueryStrategy,
            rationale: 'No candidate honored by source capability — falling back to mission keywords',
        };
    }
    return {
        query: winner.candidate.query,
        questionId: winner.questionId,
        strategy: winner.candidate.strategy,
        rationale: winner.candidate.rationale,
    };
}

/**
 * Score how well a candidate suits a given source, given source capability
 * and question priority.
 *
 * Scoring components:
 *   - Priority weight: critical × 1.5, important × 1.0, nice-to-have × 0.5
 *   - Date compatibility: date-scoped candidate × 1.3 if source honors dates, × 0.2 otherwise
 *   - Named-entity bonus: × 1.25 if source can search the entity cleanly (reddit/trade press)
 *   - Search-mode fit:
 *       - Semantic-capable source prefers expansion/alternative-framing (+0.3)
 *       - Keyword-match source prefers literal/entity-specific (+0.3)
 *       - Latest-only RSS prefers literal keywords (penalize expansion slightly)
 *   - Lookback fit: latest-N sources penalize queries targeting older years
 */
function scoreCandidateForSource(
    c: QueryCandidate,
    cap: SourceCapabilityManifest,
    priority: QuestionFrontier['priority'],
    sourceId: string,
    brief: ParsedBrief
): number {
    let s = 1.0;

    // Priority
    s *= priority === 'critical' ? 1.5 : priority === 'nice-to-have' ? 0.5 : 1.0;

    // Date compatibility
    if (c.hasDateToken) {
        if (cap.dateFilter === 'supported') s *= 1.3;
        else if (cap.dateFilter === 'best-effort') s *= 1.05;
        else s *= 0.2;  // date tokens hurt when source can't leverage them
    }

    // Named-entity fit
    if (c.hasNamedEntity) {
        if (cap.type === 'reddit') s *= 1.35;
        else if (cap.type === 'web_search') s *= 1.25;
        else if (cap.searchMode === 'fulltext') s *= 1.15;
        else s *= 0.9;
    }

    // Search-mode × strategy fit
    if (cap.searchMode === 'semantic' || cap.searchMode === 'fulltext') {
        if (c.strategy === 'expansion' || c.strategy === 'alternative-framing') s *= 1.2;
    } else if (cap.searchMode === 'keyword-match') {
        if (c.strategy === 'literal' || c.strategy === 'entity-specific') s *= 1.15;
        else if (c.strategy === 'expansion') s *= 1.05;
    } else if (cap.searchMode === 'latest-only') {
        // Latest-only sources ignore the query anyway, but prefer short literal tokens
        s *= c.strategy === 'literal' ? 1.1 : 0.95;
    }

    // Reddit-specific — prefer queries that name a subreddit if one from the brief matches
    if (cap.type === 'reddit') {
        const looksLikeSubredditQuery = brief.namedEntities.subreddits.some(sub =>
            sourceId.toLowerCase().includes(sub.toLowerCase())
        );
        if (looksLikeSubredditQuery && c.strategy === 'named-entity') s *= 1.1;
    }

    // Lookback fit: latest-N sources with stale year tokens get penalized
    if (cap.maxLookback === '~30-entries' && c.hasDateToken) {
        const currentYear = new Date().getFullYear();
        const match = c.query.match(/\b(20\d{2})\b/);
        if (match) {
            const year = parseInt(match[1], 10);
            if (year < currentYear - 1) s *= 0.5;  // RSS window won't cover old years
        }
    }

    return s;
}

// --- COMPAT SHIM ---

/**
 * Drop-in replacement shape for the old refineSearchQueries return value.
 * Given a FabricResult, returns Record<sourceId, string> — the same shape
 * App.tsx's collection batch loop already reads. This lets us swap fabric in
 * without touching the batch iteration.
 */
export function fabricToQueryMap(result: FabricResult): Record<string, string> {
    return result.sourceQueries;
}
