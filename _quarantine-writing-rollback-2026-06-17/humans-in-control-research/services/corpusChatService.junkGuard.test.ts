import { describe, it, expect } from 'vitest';
import { _isJunkAnswer } from './corpusChatService';

// Regression guard for the 2026-06-14 Analyst Desk failure: a chat reply
// rendered as the literal string "}" after gemini-3.5-flash got stuck in the
// fetch_wiki_articles tool loop and emitted a stray structural fragment that
// the old `.trim().length > 0` return guards surfaced verbatim. _isJunkAnswer
// is the shared gate that all four provider tool loops + the centralized net
// now use. This test pins the exact degenerate cases so the behavior cannot
// regress silently through a future edit.

describe('_isJunkAnswer (chat junk-reply guard)', () => {
    it('flags the exact "}" fragment that shipped to the user', () => {
        expect(_isJunkAnswer('}')).toBe(true);
    });

    it('flags empty, whitespace, and null/undefined', () => {
        expect(_isJunkAnswer('')).toBe(true);
        expect(_isJunkAnswer('   \n  ')).toBe(true);
        expect(_isJunkAnswer(null)).toBe(true);
        expect(_isJunkAnswer(undefined)).toBe(true);
    });

    it('flags bare structural / punctuation fragments', () => {
        expect(_isJunkAnswer('{')).toBe(true);
        expect(_isJunkAnswer('{}')).toBe(true);
        expect(_isJunkAnswer('[]')).toBe(true);
        expect(_isJunkAnswer('{ }')).toBe(true);
        expect(_isJunkAnswer('",:')).toBe(true);
        expect(_isJunkAnswer('()')).toBe(true);
    });

    it('flags empty/near-empty code fences', () => {
        expect(_isJunkAnswer('```')).toBe(true);
        expect(_isJunkAnswer('```json\n{}\n```')).toBe(true);
        expect(_isJunkAnswer('```\n\n```')).toBe(true);
    });

    it('passes real prose answers, including terse ones', () => {
        expect(_isJunkAnswer('Intelligence augmentation is a suite of CX tools.')).toBe(false);
        expect(_isJunkAnswer('Yes, the corpus supports that claim.')).toBe(false);
        expect(_isJunkAnswer('No clear signal in the evidence.')).toBe(false);
    });

    it('passes a fenced answer that actually contains prose', () => {
        expect(_isJunkAnswer('```\nThe themes converge on co-op friction.\n```')).toBe(false);
    });

    it('passes a normal answer that merely happens to end with a brace', () => {
        expect(_isJunkAnswer('Use the config object, for example { brand: "NXT" }')).toBe(false);
    });
});
