/** WS-2 transcript intake (2026-08-14 v2 program): anonymization is stable,
 *  complete for regex-detectable PII even when the entity pass fails, and the
 *  replacement map never appears in the output text.
 *  2026-10-30 (WS-0 S10): the entity pass is the proxy's LOCAL extractor
 *  (/api/pii/extract); no provider ever sees the raw transcript. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { anonymizeTranscript, newAnonymizationMap } from './transcriptIntake';

const realFetch = globalThis.fetch;
const fetchMock = vi.fn();

const piiReply = (obj: any) => new Response(JSON.stringify(obj), { status: 200, headers: { 'content-type': 'application/json' } });

beforeEach(() => { fetchMock.mockReset(); globalThis.fetch = fetchMock as any; });
afterEach(() => { globalThis.fetch = realFetch; });

const TRANSCRIPT = [
    'Dana Whitfield (VP Advancement, Halberd University): our donor CRM is a mess.',
    'Reach Dana at dana.whitfield@halberd.edu or (617) 555-0142.',
    'Dana said the Halberd board wants co-op outcomes benchmarked.',
].join('\n');

describe('anonymizeTranscript', () => {
    it('replaces names, orgs, emails, and phones with stable pseudonyms', async () => {
        fetchMock.mockResolvedValueOnce(piiReply({
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
        // the raw transcript went to the LOCAL extractor, never to a provider route
        const url = String(fetchMock.mock.calls[0][0]);
        expect(url).toMatch(/\/api\/pii\/extract$/);
        expect(url).not.toMatch(/\/api\/ai\//);
    });

    it('stays stable across files sharing one map', async () => {
        // a Response body can be read once, so build a fresh one per call
        fetchMock.mockImplementation(async () => piiReply({
            people: ['Dana Whitfield'], organizations: [], emails: [], phones: [], locations: [], products: [],
        }));
        const map = newAnonymizationMap();
        const a = await anonymizeTranscript('Dana Whitfield opened the meeting.', map);
        const b = await anonymizeTranscript('Dana Whitfield closed with next steps.', map);
        const label = a.removals[0].replacement;
        expect(b.removals[0].replacement).toBe(label);
    });

    it('regex still masks emails/phones when the entity pass fails', async () => {
        fetchMock.mockRejectedValueOnce(new Error('proxy down'));
        const map = newAnonymizationMap();
        const res = await anonymizeTranscript(TRANSCRIPT, map);
        expect(res.text).not.toContain('dana.whitfield@halberd.edu');
        expect(res.text).not.toMatch(/\(617\) 555-0142/);
    });
});
