// preCompact.ts - 2026-05-11 (HiC-Active-Loop-Improvements #3)
//
// Mid-session context compaction. When the chat history grows past a
// model-window-relative threshold, the older turns get summarized into a
// single structured digest and the raw turns are dropped. The recent N turns
// (always at least 10) survive intact, so the model retains short-term
// continuity while the long tail becomes a compressed memory.
//
// This is the "PreCompact" hook from the SEAL-MCP research applied to user
// chat instead of agent code execution. Same intent: prevent Context
// Representation Drift on long sessions, where the model forgets the user's
// stated goal because raw history grew too long to retain.
//
// Token counting uses a cheap char-based approximation (1 token ≈ 4 chars).
// Honest tiktoken would require an extra dep; the approximation is within
// 10% for typical English prose and zero-cost.

import type { ChatMessage } from './corpusChatService';

/**
 * Approximate token count of a string. ~4 chars per token for English prose
 * is the conventional rule-of-thumb (matches OpenAI's cl100k tokenizer to
 * within ~5-10% on typical content). Good enough for budget decisions; we
 * don't need exact counts.
 */
export function approxTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Sum approximate tokens across a chat history. System turns are counted
 * because they DO consume budget even when we don't render them as messages.
 */
export function totalApproxTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, m) => sum + approxTokens(m.content || ''), 0);
}

export interface CompactionDecision {
    shouldCompact: boolean;
    reason: string;
    approxTokens: number;
    capTokens: number;
    keepRecentCount: number;   // how many recent turns to keep intact
    olderCount: number;        // how many older turns will be summarized
}

/**
 * 2026-08-26 THRESHOLD REWRITE. The owner reported intolerable chat latency and
 * supplied the research behind the fix ("Less Context, Better Agents", arXiv
 * 2606.10209v1, at .claude/research/context_engineering.pdf): on that paper's
 * enterprise tool-use benchmark, indiscriminately retaining full interaction
 * history scored 71.0% task completion against 91.6% for recency pruning plus
 * compact summarization, while burning 2.68x the tokens and 2.5x the wall clock.
 * Full history lost on BOTH axes, so retention is not a quality-for-cost trade.
 *
 * The mechanism this file implements (keep recent turns, summarize the tail) was
 * already correct. The TRIGGERS were dead. Both were expressed as a fraction of
 * the active model's context window, and HiC's chat default gemini-3.5-flash
 * declares a 1M-token window, so:
 *   - trigger 1 (ratio >= 0.6) needed ~600,000 approx tokens, about 2.4 MILLION
 *     characters of chat history, before compaction engaged;
 *   - trigger 2 needed 40+ turns AND ~300,000 tokens.
 * A real reported session (8 turns, two 18-slide deck replies) sat at a few
 * percent of that, so HiC retained everything, every turn, forever. The measured
 * consequence was the reported latency: full history is re-sent on every chat
 * message AND re-sent again on each iteration of the agentic tool loop.
 *
 * Fix: budget history in ABSOLUTE tokens, not as a share of the hard window.
 * A 1M window is a ceiling, not a target. The paper cites the same industry
 * failure mode ("context rot"): effective recall degrades as token count grows,
 * well before the hard limit is reached, so sizing retention to the limit is
 * exactly backwards.
 *
 * HISTORY_TOKEN_BUDGET is derived from HiC's own prompt composition rather than
 * from the paper (whose N counts tool pairs, not chat turns, and whose absolute
 * numbers stay attached to its benchmark). A chat prompt already carries the
 * system protocol, the manifest chunk corpus, and the prefetched article block.
 * History earns a budget comparable to that evidence, never one that dwarfs it.
 */
export const HISTORY_TOKEN_BUDGET = 20_000;
/** Compact once the conversation is this wide even if turns are individually small. */
export const TURN_COUNT_TRIGGER = 20;
/** Never compact below this many recent turns: short-term continuity floor. */
export const KEEP_RECENT_MIN = 4;
/** Never keep more than this many recent turns intact (prior behavior's window). */
export const KEEP_RECENT_MAX = 10;

/**
 * How many of the most recent turns to keep intact.
 *
 * The paper's recency window N is a pure COUNT because its tool responses are
 * roughly uniform in size. HiC turns are not: one turn can be a two-line question
 * and the next an 18-slide deck payload, so a fixed count of 10 can still retain
 * a very large amount. This walks backwards from the newest turn and keeps turns
 * while they fit the budget, with a hard floor so recent continuity always
 * survives, and a ceiling matching the previous behavior.
 *
 * Recent turns are never truncated, only included or excluded. Cutting a turn's
 * body would corrupt the exact recent state the recency window exists to protect.
 */
export function keepRecentCountFor(history: ChatMessage[], budgetTokens = HISTORY_TOKEN_BUDGET): number {
    let used = 0;
    let kept = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
        const t = approxTokens(history[i]?.content || '');
        if (kept >= KEEP_RECENT_MAX) break;
        // Always admit the floor turns regardless of size, then respect the budget.
        if (kept >= KEEP_RECENT_MIN && used + t > budgetTokens) break;
        used += t;
        kept += 1;
    }
    return Math.max(1, kept);
}

/**
 * Decide whether the current history needs compaction. Triggers, in order:
 *   - history exceeds HISTORY_TOKEN_BUDGET in absolute approx tokens (primary)
 *   - history is at least TURN_COUNT_TRIGGER turns wide
 *   - history exceeds 25% of a small model window (safety net for narrow windows,
 *     where the absolute budget alone would still overflow)
 */
export function shouldCompactHistory(
    history: ChatMessage[],
    modelContextWindowTokens: number,
): CompactionDecision {
    const turns = Array.isArray(history) ? history : [];
    const tokens = totalApproxTokens(turns);
    const cap = modelContextWindowTokens;
    const ratio = cap > 0 ? tokens / cap : 0;
    const keepRecent = keepRecentCountFor(turns);
    const base = { approxTokens: tokens, capTokens: cap, keepRecentCount: keepRecent };

    // Nothing to compact: every turn is already inside the recency window.
    if (turns.length <= keepRecent) {
        return { ...base, shouldCompact: false, olderCount: 0, reason: `history within recency window (${turns.length} turns)` };
    }

    const overBudget = tokens > HISTORY_TOKEN_BUDGET;
    const tooWide = turns.length >= TURN_COUNT_TRIGGER;
    const overWindow = ratio >= 0.25;

    if (overBudget || tooWide || overWindow) {
        const reason = overBudget
            ? `history ${tokens} approx tokens over the ${HISTORY_TOKEN_BUDGET} budget`
            : tooWide
                ? `${turns.length} turns at or over the ${TURN_COUNT_TRIGGER}-turn trigger`
                : `history at ${Math.round(ratio * 100)}% of the ${cap} token window`;
        return { ...base, shouldCompact: true, olderCount: turns.length - keepRecent, reason };
    }

    return {
        ...base,
        shouldCompact: false,
        olderCount: 0,
        reason: `under threshold (${tokens} tokens, ${turns.length} turns, ${Math.round(ratio * 100)}% window)`,
    };
}

/**
 * Build the summarization prompt for the older turns. We pass it to whichever
 * model is currently active so the summarization style matches the rest of
 * the session. The output is a structured digest - decisions made,
 * deliverables produced, constraints learned, open threads.
 */
export function buildCompactionPrompt(olderTurns: ChatMessage[], researchGoal: string): string {
    const turnsBlock = olderTurns.map((m, i) => {
        const role = m.role === 'user' ? 'USER' : 'ANALYST';
        const body = (m.content || '').slice(0, 4000);
        return `[${i + 1}] ${role}:\n${body}`;
    }).join('\n\n');

    return `Compress the following chat history into a tight structured digest. The analyst's research goal was: "${researchGoal}"

## Chat history to compress (${olderTurns.length} turns)
${turnsBlock}

## Output format
Return a single markdown digest with exactly these sections:

### Decisions made
- Bulleted list of concrete decisions the analyst made during these turns (which deliverables to generate, which models to use, which subreddits to target, what to include/exclude, etc.)

### Deliverables produced
- Bulleted list of every artifact created (slide N, persona X, presentation Y, journey map for Z). Include slugs/titles when available.

### Constraints learned
- Bulleted list of user preferences the analyst expressed via corrections, approvals, or explicit instructions. These compound over the session - capture every one.

### Open threads
- Bulleted list of unfinished tasks, pending decisions, or topics the analyst flagged for later.

### Key entities mentioned
- Comma-separated list of named entities (institutions, people, products, sources) that appeared in the chat - useful for future retrievals.

Compress aggressively. The full chat history is being dropped after this digest is written. If you don't capture something here, it's gone. Target ~600-1200 words total.

Return ONLY the digest. No preamble, no meta-commentary.`;
}

/**
 * Build a synthetic "compacted history" entry the model sees in place of the
 * dropped turns. Marked clearly so the model knows it's a summary, not raw
 * conversation. Positioned as the FIRST message in the new history so it
 * sets context before recent turns play.
 */
export function buildCompactionMessage(digest: string, originalTurnCount: number): ChatMessage {
    const content = `[SESSION DIGEST - compressed from ${originalTurnCount} earlier turns]

The following digest summarizes the earlier portion of this conversation. The raw turns have been compacted to preserve context window space. Treat this as established session memory.

${digest}

[END SESSION DIGEST - the conversation continues below from the most recent turns]`;

    return {
        id: `digest_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: Date.now(),
    };
}
