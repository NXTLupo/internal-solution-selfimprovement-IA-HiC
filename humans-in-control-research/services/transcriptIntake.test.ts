/** WS-2 transcript intake (2026-08-14 v2 program): anonymization is stable,
 *  complete for regex-detectable PII even when the model pass fails, and the
 *  replacement map never appears in the output text. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callMock = vi.fn();
vi.mock('./aiRetryClient', () => ({
    callAIWithRetry: (...args: any[]) => callMock(...args),
}));

import { anonymizeTranscript, newAnonymizationMap } from './transcriptIntake';

const geminiReply = (obj: any) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });

beforeEach(() => callMock.mockReset());

const TRANSCRIPT = [
    'Dana Whitfield (VP Advancement, Halberd University): our donor CRM is a mess.',
    'Reach Dana at dana.whitfield@halberd.edu or (617) 555-0142.',
    'Dana said the Halberd board wants co-op outcomes benchmarked.',
].join('\n');

describe('anonymizeTranscript', () => {
    it('replaces names, orgs, emails, and phones with stable pseudonyms', async () => {
        callMock.mockResolvedValueOnce(geminiReply({
            people: ['Dana Whitfield', 'Dana'],
            organizations: ['Halberd University', 'Halberd'],
            emails: [], phones: [], locations: [], products: [],
        }));
        const map = newAnonymizationMap();
        const res = await anonymizeTranscript(TRANSCRIPT, map);
        expect(res.text).not.toMatch(/Dana/i);
        expect(res.text).not.toMatch(/Halberd/i);
        expect(res.text).not.toMatch(/halberd\.edu/i);
        expect(res.text).not.toMatch(/555-0142/);
        expect(res.text).toContain('Person A');
        expect(res.text).toContain('Organization A');
        // longest-first: "Dana Whitfield" got its own label before bare "Dana"
        expect(res.removals.find(r => r.original === 'Dana Whitfield')).toBeTruthy();
        // the ledger names every replacement for user inspection
        expect(res.removals.length).toBeGreaterThanOrEqual(4);
    });

    it('stays stable across files sharing one map', async () => {
        callMock.mockResolvedValue(geminiReply({
            people: ['Dana Whitfield'], organizations: [], emails: [], phones: [], locations: [], products: [],
        }));
        const map = newAnonymizationMap();
        const a = await anonymizeTranscript('Dana Whitfield opened the meeting.', map);
        const b = await anonymizeTranscript('Dana Whitfield closed with next steps.', map);
        const label = a.removals[0].replacement;
        expect(b.removals[0].replacement).toBe(label);
    });

    it('regex still masks emails/phones when the model pass fails', async () => {
        callMock.mockRejectedValueOnce(new Error('provider down'));
        const map = newAnonymizationMap();
        const res = await anonymizeTranscript(TRANSCRIPT, map);
        expect(res.text).not.toContain('dana.whitfield@halberd.edu');
        expect(res.text).not.toMatch(/\(617\) 555-0142/);
    });
});
