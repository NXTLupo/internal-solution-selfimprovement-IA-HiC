import { describe, it, expect } from 'vitest';
import { parseHashtags } from './hashtagParser';

describe('parseHashtags', () => {
    it('extracts single content hashtag with default brand', () => {
        const r = parseHashtags('#persona show me someone');
        expect(r.content).toEqual(['persona']);
        expect(r.brand).toBe('nxt');
        expect(r.view).toBeNull();
        expect(r.composition).toBeNull();
        expect(r.cleanPrompt).toBe('show me someone');
    });

    it('honors explicit NU brand', () => {
        expect(parseHashtags('#persona #NU').brand).toBe('nu');
    });

    it('detects single-slide view modifier', () => {
        const r = parseHashtags('#persona #NXT #slide');
        expect(r.view).toBe('slide');
        expect(r.composition).toBeNull();
    });

    it('detects deck composition with multiple content hashtags', () => {
        const r = parseHashtags('#persona #journey #strategy #NU #slides');
        expect(r.content).toEqual(['persona', 'journey', 'strategy']);
        expect(r.composition).toBe('slides');
        expect(r.view).toBeNull();
        expect(r.brand).toBe('nu');
    });

    it('is case-insensitive on hashtag names', () => {
        const r = parseHashtags('#PERSONA #Nu');
        expect(r.content).toEqual(['persona']);
        expect(r.brand).toBe('nu');
    });

    it('returns empty content when no content hashtags', () => {
        expect(parseHashtags('add a friction point after step 3').content).toEqual([]);
    });

    it('ignores unknown hashtags (does not reject them, just omits)', () => {
        const r = parseHashtags('#persona #madeup #NXT');
        expect(r.content).toEqual(['persona']);
        expect(r.unknown).toEqual(['madeup']);
    });

    it('cleanPrompt strips all recognized hashtags', () => {
        expect(parseHashtags('#persona #NU #slide make her a dev').cleanPrompt).toBe('make her a dev');
    });

    it('preserves unknown hashtags in cleanPrompt', () => {
        expect(parseHashtags('#persona #madeup make one').cleanPrompt).toBe('#madeup make one');
    });
});
