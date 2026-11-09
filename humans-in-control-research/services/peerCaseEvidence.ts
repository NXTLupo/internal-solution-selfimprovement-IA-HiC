/**
 * peerCaseEvidence.ts (2026-10-06)
 *
 * "#case-study peer universities that unified co-op advising" came back as three cases about the CLIENT itself, with
 * a "Peer evidence to source next" section, because the corpus held no peer-institution material: the engagement was
 * collected for the client's own objective. A case study about named peers needs the peers' OWN documentation.
 *
 * Before the case study is written: a fast Flash call (speed, not reasoning) names up to three documented peer
 * organizations that match the request (never the client), then the existing subject-anchored primary-docs discovery
 * collects their official pages into the wiki (kind=documentation, chunked, manifested, retrieved by pointer like
 * every other source). The case study then grounds on them through the normal manifest retrieval. Bounded and never
 * fatal: any failure leaves the run exactly where it was.
 */
import { callAIWithRetry } from './aiRetryClient';
import { ensurePrimaryDocs } from './primaryDocsDiscovery';

/** True when the request asks about OTHER organizations (peers, competitors, comparables, named examples). */
export function asksForPeerCases(request: string): boolean {
    return /\b(peers?|peer\s+(?:universit|institution|compan|organi|school|bank|firm)\w*|comparable|benchmark(?:ed)?\s+(?:against|institutions?|organizations?)|other\s+(?:universit|institution|compan|organi|school)\w*|competitors?)\b/i.test(request || '');
}

/** Parse the Flash reply into up to three subject names (never the client). */
export function parsePeerNames(raw: string, clientNames: string[] = []): string[] {
    const m = /\[[\s\S]*\]/.exec(String(raw || ''));
    let arr: unknown[] = [];
    try { arr = m ? JSON.parse(m[0]) : []; } catch { arr = []; }
    const client = clientNames.map(c => c.toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
        const name = String((x as any)?.name ?? x ?? '').replace(/\s+/g, ' ').trim();
        if (!name || name.length > 80) continue;
        const k = name.toLowerCase();
        if (seen.has(k) || client.some(c => k.includes(c) || c.includes(k))) continue;
        seen.add(k);
        out.push(name);
        if (out.length >= 3) break;
    }
    return out;
}

export async function ensurePeerCaseEvidence(opts: {
    request: string;
    objective: string;
    engagement: string;
    clientNames?: string[];
    onProgress?: (msg: string) => void;
}): Promise<{ peers: string[]; pages: number; error?: string }> {
    if (!asksForPeerCases(opts.request)) return { peers: [], pages: 0 };
    try {
        opts.onProgress?.('naming documented peer cases to collect evidence for...');
        const prompt = `Name up to 3 real, named organizations that are publicly documented examples of: "${opts.request}". `
            + `They must be PEERS of the client in this engagement (the client is NOT a valid answer). Engagement objective: ${opts.objective.slice(0, 600)}. `
            + `Return ONLY a JSON array of names, e.g. ["University of Waterloo","Drexel University"]. Omit anything you are not sure is documented.`;
        const data: any = await callAIWithRetry('gemini', {
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0, responseMimeType: 'application/json' },
        }, { label: '#case-study peer naming', maxAttempts: 2, requestTimeoutMs: 60_000 });
        const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || '').join('');
        const peers = parsePeerNames(text, opts.clientNames || []);
        if (!peers.length) return { peers, pages: 0 };
        opts.onProgress?.(`collecting documentation for ${peers.join(', ')}...`);
        const pd = await ensurePrimaryDocs({
            goal: `${opts.request}. Documented cases: ${peers.join('; ')}`,
            engagement: opts.engagement,
            subjects: peers,
            maxPages: 18,
            budgetSeconds: 75,
            onProgress: opts.onProgress,
        });
        return { peers, pages: pd.written.length, ...(pd.error ? { error: pd.error } : {}) };
    } catch (e: any) {
        return { peers: [], pages: 0, error: String(e?.message || e) };
    }
}
