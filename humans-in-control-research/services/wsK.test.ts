// wsK.test.ts - WS-K (2026-08-13 Kaleynik/OpenScholar audit) regression pins.
// K2: feedback-triggered re-retrieval in criticReviseLoop.
// K3: claim-support verification (extraction + narrowing application).

import { describe, expect, it, vi } from 'vitest';
import { criticReviseLoop, type CriticInvoker } from './criticReviseLoop';
import { CLAIM_VERIFIED_KINDS, extractClaimPairs, verifyClaimSupport } from './claimSupportVerifier';

describe('K2 - critic retrieval_queries re-invoke', () => {
    it('fetches evidence for critic queries and re-invokes the critic once with the evidence block', async () => {
        const calls: Array<{ evidence_block?: string }> = [];
        const invoker: CriticInvoker = async ({ evidence_block }) => {
            calls.push({ evidence_block });
            if (!evidence_block) {
                return {
                    verdict: {
                        accept: false,
                        edits: [],
                        rationale: 'coverage hole: no verbatim quote for rec 0',
                        confidence: 'medium',
                        retrieval_queries: ['donor stewardship first-year attrition quotes'],
                    },
                    cost_usd: 0.01,
                };
            }
            return {
                verdict: {
                    accept: false,
                    edits: [{ target_path: 'recommendations[0].quote', action: 'replace' as const, new_value: 'Real quote from evidence', reason: 'grounded in fetched chunk' }],
                    rationale: 'grounded',
                    confidence: 'high',
                },
                cost_usd: 0.01,
            };
        };
        const retrieve = vi.fn(async (queries: string[]) => {
            expect(queries).toEqual(['donor stewardship first-year attrition quotes']);
            return [{ id: 'sources/x.md#c3', text: 'Real quote from evidence and its surrounding context.' }];
        });
        const out = await criticReviseLoop({
            deliverable: { recommendations: [{ title: 'Improve stewardship', quote: '' }] },
            critics: [{ skill_name: 'test-critic', max_iterations: 1, invocation_model: 'haiku-4.5' }],
            revisor_model: 'haiku-4.5',
            halt_when: 'all_accept',
            surface_critique_log: false,
            invoke_critic: invoker,
            retrieve_evidence: retrieve,
        });
        expect(retrieve).toHaveBeenCalledTimes(1);
        expect(calls.length).toBe(2);
        expect(calls[1].evidence_block).toContain('sources/x.md#c3');
        expect((out.result as any).recommendations[0].quote).toBe('Real quote from evidence');
    });

    it('ignores retrieval_queries when no retrieve_evidence fetcher is supplied (pre-K2 behavior)', async () => {
        let invocations = 0;
        const invoker: CriticInvoker = async () => {
            invocations++;
            return {
                verdict: { accept: false, edits: [], rationale: 'hole', confidence: 'low', retrieval_queries: ['q'] },
                cost_usd: 0.01,
            };
        };
        await criticReviseLoop({
            deliverable: { a: 1 },
            critics: [{ skill_name: 'test-critic', max_iterations: 1, invocation_model: 'haiku-4.5' }],
            revisor_model: 'haiku-4.5',
            halt_when: 'all_accept',
            surface_critique_log: false,
            invoke_critic: invoker,
        });
        expect(invocations).toBe(1);
    });
});

describe('K3 - claim-support verification', () => {
    const artifact = {
        recommendations: [
            {
                title: 'AI makes advancement teams 40% faster across all fundraising work',
                verbatim_quote_evidence: 'In the study, gift officers completed the two tested drafting tasks 40% faster on average.',
                source: 'Interview P-04',
            },
            {
                title: 'Route donor questions by intent, not by queue',
                quote: 'I explained my problem three times to three different people before the right team saw it.',
                source: 'Support ticket analysis',
            },
        ],
    };

    it('extracts claim/evidence pairs with dot-paths to the claim field', () => {
        const pairs = extractClaimPairs(artifact);
        expect(pairs.length).toBe(2);
        expect(pairs[0].path).toBe('recommendations[0].title');
        expect(pairs[0].evidence).toContain('40% faster on average');
        expect(pairs[1].source).toBe('Support ticket analysis');
    });

    it('narrows overreaching claims in place from verifier verdicts', async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: JSON.stringify([
                    { index: 0, verdict: 'narrowed', revised: 'Gift officers completed the two tested drafting tasks 40% faster in the study.', reason: 'scope: two tasks, not all fundraising work' },
                    { index: 1, verdict: 'supported', reason: 'quote matches claim scope' },
                ]) }] } }],
            }),
        })) as unknown as typeof fetch;
        const { artifact: out, report } = await verifyClaimSupport(artifact, 'recommendations', { fetchImpl });
        expect(report.ran).toBe(true);
        expect(report.pairs).toBe(2);
        expect(report.applied).toBe(1);
        expect((out as any).recommendations[0].title).toContain('two tested drafting tasks');
        expect((out as any).recommendations[1].quote).toContain('three different people');
    });

    it('is risk-scaled: non-consequential kinds skip without any model call', async () => {
        const fetchImpl = vi.fn() as unknown as typeof fetch;
        const { report } = await verifyClaimSupport(artifact, 'themes', { fetchImpl });
        expect(report.ran).toBe(false);
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(CLAIM_VERIFIED_KINDS.has('themes')).toBe(false);
    });

    it('fails open: verifier error returns the artifact unchanged', async () => {
        const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 })) as unknown as typeof fetch;
        const { artifact: out, report } = await verifyClaimSupport(artifact, 'strategy', { fetchImpl });
        expect(out).toEqual(artifact);
        expect(report.applied).toBe(0);
        expect(report.skippedReason).toContain('HTTP 500');
    });
});
