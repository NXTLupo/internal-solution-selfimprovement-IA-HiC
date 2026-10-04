// wsK.test.ts - WS-K (2026-08-13 Kaleynik/OpenScholar audit) regression pins.
// K2: feedback-triggered re-retrieval in criticReviseLoop.
// K3: claim-support verification (extraction + narrowing application).

import { describe, expect, it, vi } from 'vitest';
import { criticReviseLoop, type CriticInvoker } from './criticReviseLoop';

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

// K3 (2026-10-01, plan Stage 2.4): the Flash claim re-read (`claimSupportVerifier`) is deleted. Claims are
// checked by the ONE ledger as the `claims` stage of the artifact chain; see artifactChain.test.ts
// ("Stage 2.4") and artifactRepair.test.ts for the slide adapter and its repair contract.

