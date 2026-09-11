/**
 * contextEngineering.ts - 2026-08-26
 *
 * Implements the context-construction policy from "Less Context, Better Agents:
 * Efficient Context Engineering for Long-Horizon Tool-Using LLM Agents" (Lodha,
 * Pahlavikhah Varnosfaderani, Chakraborty, Mithal; Microsoft; arXiv 2606.10209v1,
 * 8 Jun 2026). The paper is stored at .claude/research/context_engineering.pdf.
 *
 * WHAT THE PAPER MEASURED (50-task enterprise tool-use benchmark, GPT-5, with the
 * user model held constant across C2-C4 so ONLY the context policy varies):
 *   C2  full conversation history   71.0% complete, 1,481.0K tokens, 14.56h
 *   C3  last N=5 pairs, W=0         79.0% complete,   535.3K tokens,  5.39h
 *   C4  last N=5 pairs, W=3         91.6% complete,   553.4K tokens,  5.79h
 * Cross-model check (Claude Sonnet 4.5, Appendix I): 88.0 -> 92.0 -> 94.5%.
 * Sensitivity sweep (Appendix H): (N=5, W=3) sits at the knee of both curves.
 * N=10 buys under 1 point for ~53% more tokens; W=5 buys ~0.4 points for ~4%
 * more; N=3 loses ~5 points; W=1 loses ~5 points. Hence the defaults below.
 *
 * The headline is that full history was WORSE on the task metric, not merely more
 * expensive: retaining everything is not a quality-for-cost trade, it is a loss on
 * both axes. The paper attributes this to verbose tool responses crowding out
 * decision-relevant state, the failure mode industry writeups call "context rot",
 * where effective recall degrades well before the hard context limit is reached.
 *
 * SCOPE HONESTY. The paper scopes its own claims explicitly (section
 * "Generalizability and scope"): the evidence is strong for "structured,
 * single-session, form-driven tasks with verbose tool responses and a hard
 * completion criterion." HiC's agentic chat loop shares the load-bearing
 * property, verbose tool responses re-sent on every iteration, but it has no
 * hard completion criterion like "remaining amount reaches exactly zero." So the
 * percentages above are NOT predictions for HiC. What transfers is the mechanism
 * and the direction; the specific numbers stay attached to their benchmark.
 *
 * This module is the mechanism only. It performs no I/O and calls no model; the
 * caller supplies a `summarize` function, so a caller that cannot afford the one
 * extra LLM call per eviction event can pass W=0 and get pure pruning (the
 * paper's C3, still better than full context on both axes).
 */

/** Predicates + knobs for one CONSTRUCTCONTEXT call. Generic over message shape
 *  so the Gemini `{role, parts}` and Anthropic `{role, content}` histories can
 *  both use it without a translation layer. */
export interface ConstructContextOptions<T> {
    /** true when the message carries a TOOL RESULT (the paper's "tool message"). */
    isToolResponse: (m: T) => boolean;
    /** true when the message carries the model's TOOL CALL (the paper's
     *  "assistant tool-call msg", evicted together with its response). */
    isToolCall: (m: T) => boolean;
    /** N: how many recent tool call/response pairs to keep. Infinity disables
     *  eviction (the paper's C2 full-context baseline). Default 5. */
    keepWindow?: number;
    /** W: how many of the most recently evicted messages inform the summary.
     *  0 = no summarization (pure pruning, C3). -1 = summarize ALL evicted.
     *  Default 3 (C4). */
    summaryWindow?: number;
    /** Produce the digest for the evicted slice. Omit to force pure pruning
     *  regardless of W: no summarizer means no summary, never a silent stub. */
    summarize?: (evicted: T[]) => Promise<string>;
    /** Wrap the digest string into a message of the caller's own shape. */
    makeSummaryMessage?: (summary: string) => T;
}

export interface ConstructContextResult<T> {
    /** the context to send, the paper's K. */
    kept: T[];
    /** how many messages were evicted (tool responses plus their calls). */
    evictedCount: number;
    /** how many tool call/response PAIRS were evicted. */
    evictedPairs: number;
    /** true when a digest was produced AND inserted. */
    summarized: boolean;
    /** true when nothing was evicted, so `kept` is the input by reference. */
    unchanged: boolean;
}

export const DEFAULT_KEEP_WINDOW = 5;   // N, the paper's C3/C4 setting
export const DEFAULT_SUMMARY_WINDOW = 3; // W, the paper's C4 setting

/** The label the paper prescribes for the re-inserted digest (section 3.4,
 *  Algorithm 1 line 21). Kept verbatim so the model reads it as compacted tool
 *  state rather than as a user instruction. */
export const SUMMARY_PREFIX = 'Summary of previous tool calls: ';

/**
 * Algorithm 1, CONSTRUCTCONTEXT. Counts tool messages, evicts the oldest
 * max(0, #tool - N) of them together with their preceding assistant tool-call
 * message, and (when W != 0 and at least one pair was evicted) re-inserts a
 * single summary message at the earliest evicted position.
 *
 * PAIR INTEGRITY is the safety property that matters here and is why the
 * paper's "evict the pair together" clause is load-bearing rather than
 * cosmetic: both the Gemini and Anthropic APIs reject a tool RESULT whose
 * originating tool CALL is absent. A naive "drop the first k messages" prune
 * corrupts the request. Every eviction here removes the response and its call
 * as a unit, so the surviving context is always structurally valid.
 *
 * One deliberate clarification of the paper's pseudocode: its line 10-12
 * appends the tool response to E and only then moves the call, leaving E in
 * response-before-call order. Since E is consumed ONLY by SUMMARIZE, and the
 * paper describes W as "the W most recent interactions prior to the pruning
 * boundary", this implementation keeps E in chronological (call, response)
 * order so the digest reads as a sequence of actions. The set of evicted
 * messages, and therefore the retained context K, is identical either way.
 */
export async function constructContext<T>(
    history: T[],
    opts: ConstructContextOptions<T>,
): Promise<ConstructContextResult<T>> {
    const N = opts.keepWindow ?? DEFAULT_KEEP_WINDOW;
    const W = opts.summaryWindow ?? DEFAULT_SUMMARY_WINDOW;
    const src = Array.isArray(history) ? history : [];

    const toolCount = src.reduce((n, m) => n + (opts.isToolResponse(m) ? 1 : 0), 0);
    // Algorithm 1 lines 2-6: nothing to evict, return the history untouched.
    let d = Number.isFinite(N) ? Math.max(0, toolCount - N) : 0;
    if (d === 0) {
        return { kept: src, evictedCount: 0, evictedPairs: 0, summarized: false, unchanged: true };
    }

    const K: T[] = [];
    const E: T[] = [];
    let evictedPairs = 0;
    // Algorithm 1 line 21's "earliest evicted position in K": the length of K at
    // the moment of the first eviction, captured AFTER any preceding tool-call
    // message has been moved out, so the digest lands where the pair used to sit.
    let firstEvictIdx = -1;

    // Algorithm 1 lines 8-17.
    for (const m of src) {
        if (opts.isToolResponse(m) && d > 0) {
            d -= 1;
            evictedPairs += 1;
            // Move the preceding assistant tool-call message out with it, so the
            // pair leaves together and K stays structurally valid.
            if (K.length > 0 && opts.isToolCall(K[K.length - 1])) {
                E.push(K.pop() as T);
            }
            E.push(m);
            if (firstEvictIdx < 0) firstEvictIdx = K.length;
        } else {
            K.push(m);
        }
    }

    // Algorithm 1 lines 18-22. A missing summarizer or makeSummaryMessage means
    // pure pruning; never fabricate a placeholder digest.
    let summarized = false;
    if (W !== 0 && E.length > 0 && opts.summarize && opts.makeSummaryMessage) {
        const slice = W === -1 ? E : E.slice(Math.max(0, E.length - W));
        try {
            const s = await opts.summarize(slice);
            if (s && s.trim()) {
                const at = firstEvictIdx < 0 ? 0 : Math.min(firstEvictIdx, K.length);
                K.splice(at, 0, opts.makeSummaryMessage(s.trim()));
                summarized = true;
            }
        } catch {
            // Summarization is an enhancement over pruning, not a precondition
            // for it. The paper's C3 (prune, no summary) already beats full
            // context on both axes, so a failed digest degrades to C3 rather
            // than abandoning the prune and sending full history.
        }
    }

    return { kept: K, evictedCount: E.length, evictedPairs, summarized, unchanged: false };
}

// --- Gemini `{role, parts}` adapters -------------------------------------------
// HiC's chat tool loop (corpusChatService.callGemini) builds contents where a
// tool CALL is a `model` turn carrying functionCall parts and a tool RESULT is a
// `user` turn carrying functionResponse parts.

type Geminiish = { role?: string; parts?: any[] };

export function geminiIsToolCall(m: Geminiish): boolean {
    return Array.isArray(m?.parts) && m.parts.some((p: any) => p && p.functionCall);
}

export function geminiIsToolResponse(m: Geminiish): boolean {
    return Array.isArray(m?.parts) && m.parts.some((p: any) => p && p.functionResponse);
}

/** The digest as a plain user-role text turn. `user` (not `model`) because the
 *  digest is scaffolding supplied to the model, and attributing it to the model
 *  would put words in its mouth that it never generated. */
export function geminiSummaryMessage(summary: string): Geminiish {
    return { role: 'user', parts: [{ text: `${SUMMARY_PREFIX}${summary}` }] };
}

/** Flatten evicted Gemini turns into a compact transcript for the summarizer.
 *  Tool RESULTS are the verbose half, so they carry the tighter per-message cap. */
export function geminiEvictedToText(evicted: Geminiish[], perMessageChars = 1200): string {
    const lines: string[] = [];
    for (const m of evicted) {
        for (const p of m?.parts || []) {
            if (p?.functionCall) {
                const args = JSON.stringify(p.functionCall.args || {}).slice(0, 300);
                lines.push(`CALLED ${p.functionCall.name}(${args})`);
            } else if (p?.functionResponse) {
                const r = p.functionResponse.response?.result;
                const body = typeof r === 'string' ? r : JSON.stringify(r ?? '');
                lines.push(`RESULT ${p.functionResponse.name}: ${body.slice(0, perMessageChars)}`);
            } else if (typeof p?.text === 'string' && p.text.trim()) {
                lines.push(`${m.role === 'model' ? 'ASSISTANT' : 'USER'}: ${p.text.slice(0, perMessageChars)}`);
            }
        }
    }
    return lines.join('\n');
}
