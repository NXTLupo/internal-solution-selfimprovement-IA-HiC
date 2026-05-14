/**
 * subredditSuggester.ts — Gemini Flash-powered subreddit recommender.
 *
 * Takes a research goal + optional file context + an existing comma-separated
 * subreddit list, returns the 5-10 most relevant subreddits with a one-line
 * rationale each. The downstream Reddit deep-fetcher consumes whatever ends
 * up in the input — this just helps the user populate it well from a goal.
 *
 * Distinct from promptEnhancer: that REWRITES an existing prompt, this
 * GENERATES a list from contextual signals.
 */

import { callAIWithRetry } from './aiRetryClient';

export interface SubredditSuggestion {
    slug: string;       // without r/ prefix
    rationale: string;  // ≤ 15 words explaining why this subreddit is relevant
    estimated_signal: 'high' | 'medium' | 'low';
}

export interface SubredditSuggestResult {
    suggestions: SubredditSuggestion[];
    model: string;
    elapsed_ms: number;
}

export interface SubredditSuggestOptions {
    researchGoal: string;
    existingSubreddits?: string;       // comma-separated current input — we exclude these from suggestions
    fileContext?: string;              // names of uploaded files for added context
    maxSuggestions?: number;           // default 8
}

const SUGGESTER_MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `<role>
You recommend Reddit communities most likely to surface authentic user voice on a research topic. The downstream pipeline fetches every post + comment tree from these subreddits and feeds them into theme modeling, persona generation, and competitive analysis — so the quality of the list directly drives evidence quality.
</role>

<selection_criteria>
Pick subreddits that:
1. Have active discussion of the specific population/topic in the research goal (not tangentially related).
2. Have signal density — real first-person experience reports beat news aggregators.
3. Cover a range of perspectives if the topic warrants it (e.g., the user-side AND the practitioner-side; multiple roles in an industry).
4. Are not banned, archived, or known to be sparse.

Avoid:
- Generic catch-all subreddits (r/news, r/AskReddit, r/discussion) unless the goal is specifically about news/general discussion.
- Subreddits where the topic is off-charter and posts get removed.
- Duplicates of subreddits already in the user's existing list.
</selection_criteria>

<signal_grading>
estimated_signal:
  • high   — the subreddit's primary purpose IS this topic; very high post-level relevance.
  • medium — the topic shows up regularly in a wider community; some filtering needed.
  • low    — adjacent community where occasional relevant posts appear.
</signal_grading>

<output_format>
Return a single JSON object — no prose before or after, no code fence:

{
  "suggestions": [
    {
      "slug": "<subreddit name WITHOUT the r/ prefix, lowercase>",
      "rationale": "<≤ 15 words, name the population + why posts there matter for this goal>",
      "estimated_signal": "high | medium | low"
    }
  ]
}

Sort by estimated_signal descending. Return between 5 and the max requested. Never fewer than 5 if the topic is mainstream enough to have communities.
</output_format>

<hard_rules>
1. NEVER invent a subreddit name. Use only communities you are reasonably sure exist (well-known + verifiable). If unsure, omit it rather than guess.
2. Lowercase, no r/ prefix, no whitespace, no quotes in slug.
3. If existingSubreddits is provided, do not duplicate them.
4. Rationale must name the population/topic concretely. "Lots of relevant discussion" is rejected. "First-year students discussing co-op placement anxiety" is accepted.
</hard_rules>`;

function parseResponse(text: string): SubredditSuggestion[] {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.split('```', 3)[1] || cleaned;
        if (cleaned.startsWith('json')) cleaned = cleaned.slice(4);
        cleaned = cleaned.trim();
    }
    const obj = JSON.parse(cleaned);
    const arr = Array.isArray(obj?.suggestions) ? obj.suggestions : [];
    return arr
        .filter((s: any) => s && typeof s.slug === 'string' && s.slug.trim())
        .map((s: any) => ({
            slug: String(s.slug).trim().toLowerCase().replace(/^r\//, '').replace(/[^a-z0-9_]/g, ''),
            rationale: String(s.rationale || '').trim().slice(0, 200),
            estimated_signal: (['high', 'medium', 'low'].includes(s.estimated_signal) ? s.estimated_signal : 'medium') as 'high' | 'medium' | 'low',
        }))
        .filter((s: SubredditSuggestion) => s.slug.length > 0);
}

export async function suggestSubreddits(opts: SubredditSuggestOptions): Promise<SubredditSuggestResult> {
    const t0 = Date.now();
    const goal = opts.researchGoal.trim();
    if (!goal) throw new Error('cannot suggest subreddits without a research goal');

    const max = opts.maxSuggestions || 8;
    const existing = (opts.existingSubreddits || '')
        .split(',')
        .map(s => s.trim().toLowerCase().replace(/^r\//, ''))
        .filter(Boolean);

    const userPrompt = `<research_goal>\n${goal}\n</research_goal>\n\n` +
        (opts.fileContext ? `<uploaded_files>\n${opts.fileContext}\n</uploaded_files>\n\n` : '') +
        (existing.length > 0 ? `<existing_subreddits_to_exclude>\n${existing.join(', ')}\n</existing_subreddits_to_exclude>\n\n` : '') +
        `<max_suggestions>${max}</max_suggestions>`;

    const body = {
        model: SUGGESTER_MODEL,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            thinkingBudget: 'low',
            responseMimeType: 'application/json',
        },
    };

    const data = await callAIWithRetry('gemini', body, { label: 'Subreddit Suggester' });
    const candidate = (data as any)?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('').trim();
    if (!text) {
        const finishReason = candidate?.finishReason || 'unknown';
        throw new Error(`Subreddit suggester returned empty content (finishReason=${finishReason})`);
    }

    const suggestions = parseResponse(text);
    // De-dupe slugs vs existing (defensive — system prompt should have done this)
    const existingSet = new Set(existing);
    const deduped = suggestions.filter(s => !existingSet.has(s.slug));

    return { suggestions: deduped, model: SUGGESTER_MODEL, elapsed_ms: Date.now() - t0 };
}
