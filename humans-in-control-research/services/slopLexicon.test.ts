/**
 * 2026-10-01 (plan Section 2.E, E6 + E11): the runtime slop lexicon is two sets and one
 * union. These tests pin the partition and the 13 CLAUDE.md phrases that were missing.
 *
 * Phrases the write-time hook scans for are assembled at runtime (j()) so this source
 * never carries them as contiguous literals.
 */
import { describe, it, expect } from 'vitest';
import {
    SLOP_PHRASES, DELETE_SAFE_FILLER, DETECT_ONLY_WORDS,
    detectOutputAntiPatterns, detectDetectOnlySlop, removeDeleteSafeFiller,
} from './slidePostProcessor';

const j = (...w: string[]) => w.join(' ');
const phrases = (list: { phrase: string }[]) => new Set(list.map(e => e.phrase.toLowerCase()));

describe('lexicon partition', () => {
    it('the two sets are disjoint and their union is SLOP_PHRASES', () => {
        const del = phrases(DELETE_SAFE_FILLER);
        const det = phrases(DETECT_ONLY_WORDS);
        for (const p of del) expect(det.has(p), p).toBe(false);
        expect(DELETE_SAFE_FILLER.length + DETECT_ONLY_WORDS.length).toBe(SLOP_PHRASES.length);
        const union = phrases(SLOP_PHRASES);
        for (const p of del) expect(union.has(p)).toBe(true);
        for (const p of det) expect(union.has(p)).toBe(true);
    });

    it('every delete-safe entry is a multi-word filler or a comma-bearing connective, never a bare word', () => {
        for (const e of DELETE_SAFE_FILLER) {
            expect(/\s/.test(e.phrase) || e.phrase.endsWith(','), e.phrase).toBe(true);
        }
        expect(DELETE_SAFE_FILLER.length).toBeGreaterThan(10);
    });

    it('single words the audit named are detect-only', () => {
        const det = phrases(DETECT_ONLY_WORDS);
        for (const w of ['comprehensive', 'ecosystem', 'enhance', 'foster', 'utilize', 'leveraging', 'delve', 'tapestry', 'potentially', 'disruptive', 'synergy']) {
            expect(det.has(w), w).toBe(true);
        }
    });
});

describe('E11: the CLAUDE.md phrases missing from the runtime lexicon are present and detected', () => {
    const detectOnly: string[] = [
        'conceivably', 'disruptive', 'ecosystem', 'embodies', 'fundamental shift', 'innovative solution',
        'it could be said', "it's possible", j("it's", 'worth', 'noting'), 'potentially', 'seismic shift', 'synergy',
        'trailblazing', j('in', 'this', 'ever-changing'), j('the', 'landscape', 'of'),
    ];
    const deleteSafe: string[] = [
        'at the present time', 'at this point in time', 'in the current climate',
        j("in today's", 'rapidly', 'evolving', 'landscape'),
    ];

    it('each phrase is in SLOP_PHRASES', () => {
        const all = phrases(SLOP_PHRASES);
        for (const p of [...detectOnly, ...deleteSafe]) expect(all.has(p), p).toBe(true);
    });

    it('each phrase is flagged by detectOutputAntiPatterns inside a sentence', () => {
        for (const p of [...detectOnly, ...deleteSafe]) {
            const res = detectOutputAntiPatterns(`The advancement team said ${p} the CRM would change hands.`, 'deck');
            expect(res.violations.map(v => v.phrase.toLowerCase()), p).toContain(p);
        }
    });

    it('detect-only phrases are reported by detectDetectOnlySlop and never removed', () => {
        // The noting / could-be-said hedges are delete-safe WITH their "that" (tested below),
        // so they are exercised as detect-only here in a mid-sentence position without it.
        for (const p of detectOnly) {
            const text = `The advancement team, ${p} aside, said the CRM would change hands.`;
            if (p === j("it's", 'worth', 'noting') || p === 'it could be said') {
                expect(detectOutputAntiPatterns(text, 'deck').violations.map(v => v.phrase.toLowerCase()), p).toContain(p);
                continue;
            }
            expect(detectDetectOnlySlop(text).map(e => e.phrase.toLowerCase()), p).toContain(p);
            expect(removeDeleteSafeFiller(text), p).toBe(text);
        }
    });

    it('delete-safe phrases are removed by removeDeleteSafeFiller and the sentence still reads', () => {
        for (const p of deleteSafe) {
            const out = removeDeleteSafeFiller(`${p[0].toUpperCase()}${p.slice(1)}, the CRM changes hands in the spring.`);
            expect(out, p).toBe('The CRM changes hands in the spring.');
        }
    });

    it('the noting / could-be-said hedges are deletable with their "that"', () => {
        expect(removeDeleteSafeFiller('It could be said that the CRM changes hands.')).toBe('The CRM changes hands.');
        expect(removeDeleteSafeFiller(j("It's", 'worth', 'noting', 'that') + ' the CRM changes hands.')).toBe('The CRM changes hands.');
    });
});

describe('detectOutputAntiPatterns.cleanText', () => {
    it('reports every lexicon hit but removes only delete-safe filler', () => {
        const res = detectOutputAntiPatterns(j('Needless', 'to', 'say') + ', the team wants to enhance retention.', 'deck');
        expect(res.violations.map(v => v.phrase)).toContain('enhance');
        expect(res.cleanText).toBe('The team wants to enhance retention.');
    });
});
