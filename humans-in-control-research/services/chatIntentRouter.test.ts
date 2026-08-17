/** WS-6 fluid chat (2026-08-14 v2 program): pre-filter gating, classification
 *  fail-open, and the deck pass honoring locks through the WS-4 contract. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callMock = vi.fn();
vi.mock('./aiRetryClient', () => ({
    callAIWithRetry: (...args: any[]) => callMock(...args),
}));

import { quickIntentFilter, classifyChatIntent, directIntent, applyDeckTextPass } from './chatIntentRouter';

const geminiReply = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

beforeEach(() => callMock.mockReset());

describe('quickIntentFilter', () => {
    it('passes email, narrative, and deck-edit asks; blocks hashtags and plain Q&A', () => {
        expect(quickIntentFilter('draft a follow-up email for the client', false)).toBe(true);
        expect(quickIntentFilter('write me a client email summarizing what we can do', false)).toBe(true);
        expect(quickIntentFilter('give me the slide narrative for this deck', false)).toBe(true);
        expect(quickIntentFilter('make the deck more concise', true)).toBe(true);
        expect(quickIntentFilter('tighten the slides please', true)).toBe(true);
        // deck edits need a deck
        expect(quickIntentFilter('make the deck more concise', false)).toBe(false);
        // hashtags never enter the router
        expect(quickIntentFilter('#slides make a deck about retention', true)).toBe(false);
        // ordinary Q&A never pays the classifier latency
        expect(quickIntentFilter('what did the corpus say about churn drivers?', true)).toBe(false);
    });
});

describe('directIntent (deterministic, no network: the T8 incident fix)', () => {
    it('maps the suggested chips without any model call', () => {
        expect(directIntent('Make the deck more concise', true)).toEqual({ kind: 'deck_edit', op: 'concise' });
        expect(directIntent('make the slides plainer, less generic', true)).toEqual({ kind: 'deck_edit', op: 'plainer' });
        expect(directIntent('Draft a client follow-up email from this deck', false)).toEqual({ kind: 'client_email' });
        expect(directIntent('Draft the slide narrative from this research', false)).toEqual({ kind: 'slide_narrative' });
    });
    it('never fires on hashtags, no-deck edits, or ambiguous asks', () => {
        expect(directIntent('#slides make a deck', true)).toBeNull();
        expect(directIntent('make the deck more concise', false)).toBeNull();
        expect(directIntent('what does the corpus say about churn?', true)).toBeNull();
    });
});

describe('classifyChatIntent', () => {
    it('parses a deck_edit classification with op and slideIndex', async () => {
        callMock.mockResolvedValueOnce(geminiReply('{"kind":"deck_edit","op":"plainer","slideIndex":3}'));
        const intent = await classifyChatIntent('make slide 3 less buzzwordy', { hasDeck: true });
        expect(intent).toEqual({ kind: 'deck_edit', op: 'plainer', slideIndex: 3 });
    });

    it('refuses deck_edit when no deck exists and fails open on errors', async () => {
        callMock.mockResolvedValueOnce(geminiReply('{"kind":"deck_edit","op":"concise"}'));
        expect((await classifyChatIntent('tighten the deck', { hasDeck: false })).kind).toBe('plain');
        callMock.mockRejectedValueOnce(new Error('boom'));
        expect((await classifyChatIntent('draft an email', { hasDeck: true })).kind).toBe('plain');
    });
});

describe('applyDeckTextPass', () => {
    const slide = (id: string, locked = false): any => ({
        id, status: 'draft', template: 'slides:numbered-themes',
        title: 'Alumni drop off at three stages the advancement team cannot see',
        _locked: locked,
        composerPayload: {
            title: 'Alumni drop off at three stages the advancement team cannot see',
            items: [{ heading: 'First contact goes unanswered for weeks at a time' }],
        },
    });

    it('rewrites unlocked slides through the edit contract and skips locked ones', async () => {
        callMock.mockResolvedValue(geminiReply(JSON.stringify({
            'title': 'Advancement loses alumni at three invisible handoffs',
            'items[0].heading': 'Email response takes weeks',
        })));
        const res = await applyDeckTextPass([slide('a'), slide('b', true)], 'concise', 'tighten it');
        expect(res.skippedLocked).toBe(1);
        expect(res.updated).toHaveLength(1);
        expect(res.updated[0].id).toBe('a');
        expect(res.updated[0].composerPayload.title).toBe('Advancement loses alumni at three invisible handoffs');
        expect(res.updated[0].title).toBe('Advancement loses alumni at three invisible handoffs');
        // undo history recorded for the per-slide editor
        expect(res.updated[0]._textHistory).toHaveLength(1);
        // only the unlocked slide called the model
        expect(callMock).toHaveBeenCalledTimes(1);
    });

    it('ignores hallucinated paths and unchanged values', async () => {
        callMock.mockResolvedValue(geminiReply(JSON.stringify({
            'title': 'Alumni drop off at three stages the advancement team cannot see',
            'items[9].heading': 'invented path',
        })));
        const res = await applyDeckTextPass([slide('a')], 'concise', 'tighten');
        expect(res.updated).toHaveLength(0);
        expect(res.editedFields).toBe(0);
    });

    it('a failed slide call never aborts the rest', async () => {
        callMock
            .mockRejectedValueOnce(new Error('provider 500'))
            .mockResolvedValueOnce(geminiReply(JSON.stringify({ 'title': 'Advancement loses alumni at three handoffs' })));
        const res = await applyDeckTextPass([slide('a'), slide('b')], 'executive', 'sharpen');
        expect(res.failed).toBe(1);
        expect(res.updated).toHaveLength(1);
    });
});
