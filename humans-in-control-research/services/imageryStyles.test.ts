/**
 * Selectable imagery styles (2026-11-09, owner directive).
 *
 * Pins the two properties the choice layer must have: a reader can pick a style with one word, and
 * a style word that is really part of the sentence must NOT hijack the picture ("the blueprint for
 * co-op advising" is a noun, not a request for a schematic).
 */
import { describe, it, expect } from 'vitest';
import {
    IMAGERY_STYLES,
    DEFAULT_IMAGERY_STYLE,
    imageryStyleFor,
    parseImageryStyle,
    imageryStyleRoster,
} from './imageryStyles';

describe('the style roster', () => {
    it('offers several professional choices', () => {
        expect(IMAGERY_STYLES.length).toBeGreaterThanOrEqual(4);
    });

    it('never hardcodes a colour value: styles name roles, the proxy fills brand hexes', () => {
        for (const s of IMAGERY_STYLES) {
            expect(s.directive).not.toMatch(/#[0-9a-f]{6}\b/i);
            expect(s.directive.toLowerCase()).toContain('brand');
        }
    });

    it('bans the tells that make generated art look like stock AI output', () => {
        for (const s of IMAGERY_STYLES.filter(x => !x.photographic)) {
            expect(s.directive.toLowerCase()).toMatch(/no (?:gradients|shading|realism|texture|cast shadows)/);
        }
    });

    it('lists every style once in the help roster', () => {
        const roster = imageryStyleRoster();
        for (const s of IMAGERY_STYLES) expect(roster).toContain(s.id);
    });
});

describe('imageryStyleFor', () => {
    it('resolves by id and by alias', () => {
        expect(imageryStyleFor('isometric').id).toBe('isometric');
        expect(imageryStyleFor('schematic').id).toBe('blueprint');
        expect(imageryStyleFor('cut-paper').id).toBe('collage');
    });

    it('falls back to the house default on anything unknown', () => {
        expect(imageryStyleFor('banana').id).toBe(DEFAULT_IMAGERY_STYLE);
        expect(imageryStyleFor('').id).toBe(DEFAULT_IMAGERY_STYLE);
        expect(imageryStyleFor(undefined).id).toBe(DEFAULT_IMAGERY_STYLE);
    });
});

describe('parseImageryStyle', () => {
    it('takes a leading style word and removes it from the prompt', () => {
        const r = parseImageryStyle('isometric how students decide which assistant to trust');
        expect(r.style.id).toBe('isometric');
        expect(r.rest).toBe('how students decide which assistant to trust');
    });

    it('takes a trailing style word', () => {
        const r = parseImageryStyle('the co-op connector architecture, blueprint');
        expect(r.style.id).toBe('blueprint');
        expect(r.rest).toBe('the co-op connector architecture');
    });

    it('does NOT hijack a style word used as a noun inside the sentence', () => {
        const r = parseImageryStyle('the blueprint for co-op advising needs a decision');
        expect(r.style.id).toBe(DEFAULT_IMAGERY_STYLE);
        expect(r.rest).toBe('the blueprint for co-op advising needs a decision');
    });

    it('defaults to the house style when no word is given', () => {
        const r = parseImageryStyle('what advisors see before a meeting');
        expect(r.style.id).toBe('line');
        expect(r.rest).toBe('what advisors see before a meeting');
    });

    it('handles an empty prompt', () => {
        expect(parseImageryStyle('').rest).toBe('');
    });

    it('marks only the photographic style as photographic', () => {
        expect(parseImageryStyle('duotone a student at a laptop').style.photographic).toBe(true);
        expect(parseImageryStyle('collage a student at a laptop').style.photographic).toBe(false);
    });
});
