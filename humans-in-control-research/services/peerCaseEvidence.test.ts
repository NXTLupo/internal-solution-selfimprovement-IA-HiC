import { describe, it, expect } from 'vitest';
import { asksForPeerCases, parsePeerNames } from './peerCaseEvidence';

describe('peer case evidence (2026-10-06)', () => {
    it('detects requests about other organizations', () => {
        expect(asksForPeerCases('peer universities that unified co-op advising into one platform')).toBe(true);
        expect(asksForPeerCases('competitors in experiential learning platforms')).toBe(true);
        expect(asksForPeerCases('how the Hub sequences first-year readiness')).toBe(false);
    });
    it('parses up to three names and never returns the client', () => {
        const raw = '["University of Waterloo","Northeastern University","Drexel University","University of Cincinnati","Purdue University"]';
        expect(parsePeerNames(raw, ['Northeastern University', 'Northeastern'])).toEqual(['University of Waterloo', 'Drexel University', 'University of Cincinnati']);
        expect(parsePeerNames('not json')).toEqual([]);
    });
});
