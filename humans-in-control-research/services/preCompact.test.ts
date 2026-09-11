/**
 * 2026-08-26. Regression guards for the DEAD-TRIGGER bug.
 *
 * preCompact's mechanism (keep recent turns, summarize the tail) was correct from
 * the start, but both triggers were expressed as a fraction of the model context
 * window. HiC's chat default gemini-3.5-flash declares a 1M-token window, so
 * compaction needed roughly 2.4 MILLION characters of history before it engaged,
 * and in practice never ran. Full history was re-sent on every message and again
 * on every agentic tool-loop iteration.
 *
 * The research the owner supplied ("Less Context, Better Agents", arXiv
 * 2606.10209v1) measures full-history retention at 71.0% task completion versus
 * 91.6% for recency pruning plus summarization, at 2.68x the tokens. So a dead
 * trigger is not a missed optimization, it is the worse configuration on both
 * axes. The first test below is the specific one that must never regress.
 */
import { describe, it, expect } from 'vitest';
import {
    shouldCompactHistory, keepRecentCountFor, approxTokens, totalApproxTokens,
    buildCompactionMessage, buildCompactionPrompt,
    HISTORY_TOKEN_BUDGET, TURN_COUNT_TRIGGER, KEEP_RECENT_MIN, KEEP_RECENT_MAX,
} from './preCompact';
import type { ChatMessage } from './corpusChatService';

const GEMINI_FLASH_WINDOW = 1_000_000; // what corpusChatService resolves for gemini-3.5-flash

let seq = 0;
const turn = (chars: number, role: 'user' | 'assistant' = 'user'): ChatMessage => ({
    id: `m${seq += 1}`,
    role,
    content: 'x'.repeat(chars),
    timestamp: 1,
});
/** A conversation of `n` turns, each `chars` long. */
const convo = (n: number, chars: number): ChatMessage[] =>
    Array.from({ length: n }, (_, i) => turn(chars, i % 2 === 0 ? 'user' : 'assistant'));

describe('THE DEAD-TRIGGER REGRESSION (2026-08-26)', () => {
    /**
     * The reported session: 8 turns, two of them 18-slide deck replies. Estimate
     * a deck reply at ~60KB of slide payload. Under the old ratio-based triggers
     * this sat at ~3% of a 1M window and compaction never fired.
     */
    it('compacts the reported real session (8 turns, two large deck replies)', () => {
        const history: ChatMessage[] = [
            turn(120, 'user'), turn(60_000, 'assistant'),
            turn(140, 'user'), turn(58_000, 'assistant'),
            turn(90, 'user'), turn(4_000, 'assistant'),
            turn(110, 'user'), turn(3_500, 'assistant'),
        ];
        const d = shouldCompactHistory(history, GEMINI_FLASH_WINDOW);
        expect(d.shouldCompact).toBe(true);
        expect(d.olderCount).toBeGreaterThan(0);
        // and it must be triggered by the ABSOLUTE budget, not by window share
        expect(d.reason).toMatch(/over the 20000 budget/);
    });

    it('a big history on a 1M window compacts (the old code required ~600K tokens)', () => {
        // 120K approx tokens: 12% of a 1M window, so every old ratio trigger stayed silent
        const d = shouldCompactHistory(convo(12, 40_000), GEMINI_FLASH_WINDOW);
        expect(d.shouldCompact).toBe(true);
        expect(totalApproxTokens(convo(12, 40_000))).toBeLessThan(GEMINI_FLASH_WINDOW * 0.6);
    });

    it('does not compact a genuinely short conversation', () => {
        const d = shouldCompactHistory(convo(4, 400), GEMINI_FLASH_WINDOW);
        expect(d.shouldCompact).toBe(false);
        expect(d.olderCount).toBe(0);
    });

    it('leaves a single-turn and empty history alone', () => {
        expect(shouldCompactHistory([], GEMINI_FLASH_WINDOW).shouldCompact).toBe(false);
        expect(shouldCompactHistory(convo(1, 200), GEMINI_FLASH_WINDOW).shouldCompact).toBe(false);
        expect(shouldCompactHistory(null as any, GEMINI_FLASH_WINDOW).shouldCompact).toBe(false);
    });
});

describe('shouldCompactHistory: the three triggers', () => {
    it('fires on the absolute token budget even with few turns', () => {
        const d = shouldCompactHistory(convo(6, 20_000), GEMINI_FLASH_WINDOW); // 30K tokens
        expect(d.shouldCompact).toBe(true);
        expect(d.reason).toMatch(/budget/);
    });

    it('fires on turn count even when every turn is tiny', () => {
        const d = shouldCompactHistory(convo(TURN_COUNT_TRIGGER, 40), GEMINI_FLASH_WINDOW);
        expect(d.shouldCompact).toBe(true);
        expect(d.reason).toMatch(/turns/);
    });

    it('fires on window share for a narrow-window model the absolute budget would miss', () => {
        // 12 turns x 1600 chars = ~4.8K tokens: under the 20K budget and under 20
        // turns, but 24% -> over 25% of a 16K window once counted precisely.
        const history = convo(12, 1_800); // ~5.4K tokens
        const d = shouldCompactHistory(history, 16_000);
        expect(d.shouldCompact).toBe(true);
        expect(d.reason).toMatch(/window/);
    });

    it('reports the split index the caller slices on', () => {
        const history = convo(30, 2_000);
        const d = shouldCompactHistory(history, GEMINI_FLASH_WINDOW);
        // the caller does slice(0, olderCount) / slice(olderCount)
        expect(d.olderCount + d.keepRecentCount).toBe(history.length);
        expect(history.slice(d.olderCount)).toHaveLength(d.keepRecentCount);
    });

    it('tolerates a zero or missing context window without dividing by zero', () => {
        const d = shouldCompactHistory(convo(6, 300), 0);
        expect(Number.isFinite(d.approxTokens)).toBe(true);
        expect(d.shouldCompact).toBe(false);
    });
});

describe('keepRecentCountFor: size-aware recency window', () => {
    it('keeps up to the ceiling when turns are small', () => {
        expect(keepRecentCountFor(convo(40, 100))).toBe(KEEP_RECENT_MAX);
    });

    it('keeps fewer turns when recent turns are huge, protecting the budget', () => {
        const kept = keepRecentCountFor(convo(20, 50_000)); // 12.5K tokens per turn
        expect(kept).toBeLessThan(KEEP_RECENT_MAX);
        expect(kept).toBeGreaterThanOrEqual(KEEP_RECENT_MIN);
    });

    it('never drops below the continuity floor, even for enormous turns', () => {
        expect(keepRecentCountFor(convo(20, 400_000))).toBe(KEEP_RECENT_MIN);
    });

    it('never exceeds the number of turns available', () => {
        expect(keepRecentCountFor(convo(2, 100))).toBe(2);
        expect(keepRecentCountFor(convo(1, 100))).toBe(1);
    });

    it('keeps the NEWEST turns, never the oldest', () => {
        const history = [...convo(9, 200), turn(200, 'user')];
        const kept = keepRecentCountFor(history);
        const survivors = history.slice(history.length - kept);
        expect(survivors[survivors.length - 1].id).toBe(history[history.length - 1].id);
    });
});

describe('token approximation', () => {
    it('approximates 4 chars per token and handles empty input', () => {
        expect(approxTokens('')).toBe(0);
        expect(approxTokens(undefined as any)).toBe(0);
        expect(approxTokens('x'.repeat(400))).toBe(100);
    });

    it('sums across a history', () => {
        expect(totalApproxTokens(convo(3, 400))).toBe(300);
        expect(totalApproxTokens([])).toBe(0);
    });
});

describe('digest construction (unchanged contract)', () => {
    it('labels the digest so the model reads it as compacted memory, not conversation', () => {
        const msg = buildCompactionMessage('### Decisions made\n- picked Flash', 12);
        expect(msg.content).toContain('SESSION DIGEST');
        expect(msg.content).toContain('compressed from 12 earlier turns');
        expect(msg.content).toContain('picked Flash');
        expect(msg.role).toBe('assistant');
    });

    it('caps each turn in the summarization prompt so the digest call stays bounded', () => {
        const prompt = buildCompactionPrompt([turn(50_000, 'assistant')], 'a goal');
        expect(prompt.length).toBeLessThan(12_000);
        expect(prompt).toContain('a goal');
    });
});
