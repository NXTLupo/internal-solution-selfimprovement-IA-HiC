/**
 * 2026-10-20: pages chunked with the blank line after the frontmatter fence carry spans one character past the
 * resolver's body; they are read back shifted, not dropped. Pages whose spans fit are read as declared.
 */
import { describe, it, expect } from 'vitest';
import { spanShiftFor, shiftSpan } from './wikiPointerResolver';

describe('legacy chunk-span shift', () => {
    it('detects the one-character overshoot and reads every span one character earlier', () => {
        const spans: Array<[number, number]> = [[0, 300], [300, 638]];
        expect(spanShiftFor(spans, 637)).toBe(1);
        expect(shiftSpan([0, 300], 1)).toEqual([0, 299]);
        expect(shiftSpan([300, 638], 1)).toEqual([299, 637]);
    });

    it('leaves pages whose spans fit untouched, and still drops spans that overshoot by more', () => {
        expect(spanShiftFor([[0, 637]], 637)).toBe(0);
        expect(spanShiftFor([[0, 640]], 637)).toBe(0);
        expect(shiftSpan([10, 20], 0)).toEqual([10, 20]);
    });
});
