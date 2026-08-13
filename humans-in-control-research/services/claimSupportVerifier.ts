// services/claimSupportVerifier.ts
// K3 (2026-08-13, WS-K Kaleynik/OpenScholar audit) - the mechanized CLAIMS PASS.
//
// "A citation is evidence, not seasoning": the cited/quoted material must support the
// claim's ACTUAL WORDING (population, period, comparison, causal strength). This service
// extracts claim/evidence pairs from a generated artifact and has an EXTERNAL verifier
// model (Gemini Flash - never the generating model, per the two-pass QA doctrine and
// Stechly ICLR 2025 self-verification limits) judge each pair:
//   supported  - the evidence covers the claim's wording; no change.
//   narrowed   - the evidence supports LESS than the claim says; the verifier supplies
//                a narrowed sentence, which REPLACES the claim (narrow the sentence,
//                never widen the citation).
//   unsupported- no wording-level support; narrowed replacement applied when supplied,
//                otherwise logged for the trace (v1 never does structural removal -
//                schema safety beats zeal).
//
// RISK-SCALED (Kaleynik): runs only on consequential artifact kinds (strategy,
// recommendations, prd, case-study). Transformation-class artifacts skip it.
// FAIL-OPEN: any error returns the artifact unchanged with a skipped reason.

const PROXY_BASE = 'http://localhost:5012';

export const CLAIM_VERIFIED_KINDS = new Set([
    'strategy', 'recommendations', 'recs', 'prd', 'case-study', 'case_study', 'casestudy',
]);

export interface ClaimPair {
    /** Dot-path to the CLAIM field inside the artifact JSON. */
    path: string;
    claim: string;
    evidence: string;
    source: string;
}

export interface ClaimVerdict {
    path: string;
    verdict: 'supported' | 'narrowed' | 'unsupported';
    revised?: string;
    reason: string;
}

export interface ClaimSupportReport {
    ran: boolean;
    pairs: number;
    verdicts: ClaimVerdict[];
    applied: number;
    skippedReason?: string;
    elapsedMs: number;
}

const CLAIM_FIELDS = ['claim', 'insight', 'finding', 'label', 'title', 'expected_impact', 'impact', 'implication'];
const EVIDENCE_FIELDS = ['quote', 'evidence', 'verbatim_quote_evidence', 'evidenceBasis', 'keyQuote', 'evidence_quote', 'verbatimQuote'];
const SOURCE_FIELDS = ['source', 'citation', 'attribution', 'sourceName'];
const MAX_PAIRS = 20;

/** Walk the artifact tree; pair each object's claim-ish field with its own
 *  quote/evidence-ish sibling. Pure + exported for tests. */
export function extractClaimPairs(artifact: unknown): ClaimPair[] {
    const pairs: ClaimPair[] = [];
    const walk = (node: unknown, path: string): void => {
        if (pairs.length >= MAX_PAIRS) return;
        if (Array.isArray(node)) {
            node.forEach((v, i) => walk(v, `${path}[${i}]`));
            return;
        }
        if (!node || typeof node !== 'object') return;
        const obj = node as Record<string, unknown>;
        const claimField = CLAIM_FIELDS.find(f => typeof obj[f] === 'string' && (obj[f] as string).trim().length >= 25);
        const evidenceField = EVIDENCE_FIELDS.find(f => typeof obj[f] === 'string' && (obj[f] as string).trim().length >= 20);
        if (claimField && evidenceField && claimField !== evidenceField) {
            const sourceField = SOURCE_FIELDS.find(f => typeof obj[f] === 'string' && (obj[f] as string).trim());
            pairs.push({
                path: path ? `${path}.${claimField}` : claimField,
                claim: (obj[claimField] as string).trim(),
                evidence: (obj[evidenceField] as string).trim().slice(0, 700),
                source: sourceField ? (obj[sourceField] as string).trim() : '',
            });
        }
        for (const [k, v] of Object.entries(obj)) {
            if (v && typeof v === 'object') walk(v, path ? `${path}.${k}` : k);
        }
    };
    walk(artifact, '');
    return pairs;
}

/** Set a dot-path (with [n] indices) to a new string value. Minimal, fail-soft. */
function setPath(obj: unknown, path: string, value: string): boolean {
    const parts: Array<string | number> = [];
    const re = /([a-zA-Z_$][\w$]*)|\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(path)) !== null) {
        if (m[1] !== undefined) parts.push(m[1]);
        else if (m[2] !== undefined) parts.push(parseInt(m[2], 10));
    }
    let cur: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        cur = cur?.[parts[i] as any];
        if (cur === null || cur === undefined) return false;
    }
    const leaf = parts[parts.length - 1];
    if (cur && typeof cur === 'object' && typeof cur[leaf as any] === 'string') {
        cur[leaf as any] = value;
        return true;
    }
    return false;
}

const VERIFIER_PROMPT = `You are a claim-support verifier for consulting deliverables. For each numbered pair below, judge whether the EVIDENCE supports the CLAIM'S ACTUAL WORDING: same population, same period, same product or system, same comparison, and the same causal strength. Correlation in evidence never supports causation in a claim. Evidence about one industry, country, or cohort never supports a claim about another.

PRESCRIPTIVE CLAIMS: a claim phrased as a recommendation or imperative ("Route X by...",
"Automate Y", "Adopt Z") is an EDITORIAL JUDGMENT, not a factual assertion - do NOT demand
evidence that the action already happened. Verify only its embedded FACTUAL premises (a
number, a stated outcome, a "makes/causes/proves" assertion). A prescriptive claim whose
premises hold, or that has none, is "supported". Never rewrite a recommendation into a
current-state description.

Verdicts:
- "supported": the evidence covers the claim as worded.
- "narrowed": the evidence supports a NARROWER claim. Supply "revised": the same claim narrowed to what the evidence establishes (plain language, no hedging filler, keep it under 200 characters).
- "unsupported": the evidence does not support the claim at wording level. Supply "revised" when a defensible narrower sentence exists; omit it when nothing is salvageable.

Return ONLY a JSON array, one object per pair, in input order:
[{"index": 0, "verdict": "supported|narrowed|unsupported", "revised": "...", "reason": "one line"}, ...]

PAIRS:
{{PAIRS}}`;

export async function verifyClaimSupport<T>(
    artifact: T,
    kind: string,
    opts: { proxyBase?: string; fetchImpl?: typeof fetch } = {},
): Promise<{ artifact: T; report: ClaimSupportReport }> {
    const t0 = Date.now();
    const proxyBase = opts.proxyBase ?? PROXY_BASE;
    const doFetch = opts.fetchImpl ?? fetch;
    const normKind = String(kind || '').toLowerCase().trim();
    if (!CLAIM_VERIFIED_KINDS.has(normKind)) {
        return { artifact, report: { ran: false, pairs: 0, verdicts: [], applied: 0, skippedReason: `kind "${normKind}" not risk-scaled for claim verification`, elapsedMs: Date.now() - t0 } };
    }
    let pairs: ClaimPair[] = [];
    try {
        pairs = extractClaimPairs(artifact);
    } catch (e) {
        return { artifact, report: { ran: false, pairs: 0, verdicts: [], applied: 0, skippedReason: `extraction failed: ${String(e).slice(0, 120)}`, elapsedMs: Date.now() - t0 } };
    }
    if (pairs.length === 0) {
        return { artifact, report: { ran: true, pairs: 0, verdicts: [], applied: 0, elapsedMs: Date.now() - t0 } };
    }

    const pairsBlock = pairs.map((p, i) =>
        `[${i}] CLAIM: ${p.claim.replace(/\s+/g, ' ').slice(0, 400)}\n    EVIDENCE${p.source ? ` (${p.source.slice(0, 80)})` : ''}: ${p.evidence.replace(/\s+/g, ' ')}`,
    ).join('\n\n');

    try {
        const resp = await doFetch(`${proxyBase}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: [{ role: 'user', parts: [{ text: VERIFIER_PROMPT.replace('{{PAIRS}}', pairsBlock) }] }],
                config: { temperature: 0, responseMimeType: 'application/json' },
            }),
        });
        if (!resp.ok) throw new Error(`verifier HTTP ${resp.status}`);
        const data = await resp.json();
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
        // Flash occasionally emits mildly malformed JSON (unescaped quotes inside
        // revised sentences); the standing repair layer recovers it.
        const { parseJSONWithRepair } = await import('./aiOutputRepair');
        const raw = parseJSONWithRepair<Array<{ index?: number; verdict?: string; revised?: string; reason?: string }>>(
            text.replace(/^```(?:json)?|```$/g, '').trim(),
            { calling_context: 'claimSupportVerifier' },
        );
        const verdicts: ClaimVerdict[] = [];
        let applied = 0;
        const clone: T = JSON.parse(JSON.stringify(artifact));
        for (const r of Array.isArray(raw) ? raw : []) {
            const idx = Number(r?.index);
            const pair = pairs[idx];
            if (!pair) continue;
            const verdict: ClaimVerdict['verdict'] =
                r?.verdict === 'supported' || r?.verdict === 'narrowed' || r?.verdict === 'unsupported' ? r.verdict : 'supported';
            const revised = typeof r?.revised === 'string' && r.revised.trim().length >= 15 ? r.revised.trim() : undefined;
            verdicts.push({ path: pair.path, verdict, revised, reason: String(r?.reason || '').slice(0, 200) });
            if ((verdict === 'narrowed' || verdict === 'unsupported') && revised) {
                if (setPath(clone, pair.path, revised)) applied++;
            }
        }
        if (applied > 0 || verdicts.some(v => v.verdict !== 'supported')) {
            console.log(`[claimSupport] K3 claims pass (${normKind}): ${pairs.length} pair(s) checked, ${verdicts.filter(v => v.verdict === 'narrowed').length} narrowed, ${verdicts.filter(v => v.verdict === 'unsupported').length} unsupported, ${applied} sentence(s) narrowed in place`);
        }
        return { artifact: applied > 0 ? clone : artifact, report: { ran: true, pairs: pairs.length, verdicts, applied, elapsedMs: Date.now() - t0 } };
    } catch (e) {
        console.warn(`[claimSupport] K3 verifier unavailable - artifact unchanged: ${String(e).slice(0, 120)}`);
        return { artifact, report: { ran: false, pairs: pairs.length, verdicts: [], applied: 0, skippedReason: String(e).slice(0, 120), elapsedMs: Date.now() - t0 } };
    }
}
