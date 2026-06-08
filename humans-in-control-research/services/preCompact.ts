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
 * Decide whether the current history needs compaction. Two triggers:
 *   - Total approx tokens > 60% of the model's context window
 *   - History length > 40 turns AND > 30% of context window
 * The second catches sessions where individual turns are short but the
 * accumulation is wide.
 */
export function shouldCompactHistory(
    history: ChatMessage[],
    modelContextWindowTokens: number,
): CompactionDecision {
    const tokens = totalApproxTokens(history);
    const cap = modelContextWindowTokens;
    const ratio = tokens / cap;

    const KEEP_RECENT = 10;
    const TURN_COUNT_TRIGGER = 40;

    if (history.length <= KEEP_RECENT) {
        return {
            shouldCompact: false,
            reason: `history short (${history.length} turns)`,
            approxTokens: tokens,
            capTokens: cap,
            keepRecentCount: KEEP_RECENT,
            olderCount: 0,
        };
    }

    if (ratio >= 0.6) {
        return {
            shouldCompact: true,
            reason: `history at ${Math.round(ratio * 100)}% of ${cap} token window`,
            approxTokens: tokens,
            capTokens: cap,
            keepRecentCount: KEEP_RECENT,
            olderCount: history.length - KEEP_RECENT,
        };
    }

    if (history.length >= TURN_COUNT_TRIGGER && ratio >= 0.3) {
        return {
            shouldCompact: true,
            reason: `${history.length} turns, ${Math.round(ratio * 100)}% window`,
            approxTokens: tokens,
            capTokens: cap,
            keepRecentCount: KEEP_RECENT,
            olderCount: history.length - KEEP_RECENT,
        };
    }

    return {
        shouldCompact: false,
        reason: `under threshold (${Math.round(ratio * 100)}% / ${history.length} turns)`,
        approxTokens: tokens,
        capTokens: cap,
        keepRecentCount: KEEP_RECENT,
        olderCount: 0,
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
