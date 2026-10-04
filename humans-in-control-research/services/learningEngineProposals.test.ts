// 2026-10-01 (plan Stage 5.1, audit C4): applySkillPatch wrote a Gemini-synthesized patch into a live
// SKILL.md at confidence >= 0.8 after a text-only review. A skill now changes ONLY on a held-out
// APPROVE verdict. These tests pin: a learning pass with a skill-patch target writes a PROPOSAL and
// never touches /api/skill/write; patchSkillFile throws without an APPROVE verdict; rung-3 ledger
// entries (anti-pattern, exemplar) say so.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const indexMock = vi.fn();
vi.mock('./feedbackService', () => ({ readFeedbackIndex: (...a: any[]) => indexMock(...a) }));
vi.mock('./secondBrainPass', () => ({
    runSecondBrainPass: async () => ({ report: null }),
    constraintToProposedFact: (c: string) => ({ content: c }),
}));

import { runLearningPass, patchSkillFile, assertApproveVerdict, type ImprovementCandidate } from './learningEngine';

type Route = (url: string, init?: RequestInit) => any;
function routeFetch(routes: Array<[RegExp, Route]>) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        for (const [re, handler] of routes) {
            if (re.test(url)) {
                const body = handler(url, init) ?? {};
                const st = typeof body.__status === 'number' ? body.__status : 200;
                return { ok: st >= 200 && st < 300, status: st, json: async () => body, text: async () => JSON.stringify(body) };
            }
        }
        return { ok: true, status: 200, json: async () => ({ status: 'ok', content: '' }), text: async () => '' };
    });
}
const calls = (re: RegExp, method?: string) => fetchMock.mock.calls.filter(([u, init]) =>
    re.test(String(u)) && (!method || String((init as RequestInit | undefined)?.method || 'GET').toUpperCase() === method));

const PATCH = 'When generating personas, anchor every quote to a named respondent and a dated interview transcript so the reader can trace it.';

const event = (i: number) => ({
    id: `fb_${i}`, timestamp: '2026-10-01T00:00:00Z', engagement_slug: 'eng', deliverable_id: `d${i}`,
    signal_type: 'text', vote_value: 'down', text_excerpt: 'Persona quotes are invented and have no respondent behind them',
});

const SKILL_MD = '---\nname: persona-architect\nversion: 1.4\n---\n# Persona Architect\n\n## Learned behaviors\n';

beforeEach(() => {
    fetchMock.mockReset();
    indexMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    try { localStorage.clear(); } catch { /* jsdom */ }
});

describe('skill-patch target -> proposal, never a write (C4)', () => {
    it('writes a kind=skill_patch proposal with source rollout ids + confidence and does not call /api/skill/write', async () => {
        // 5 global negative text signals on personas -> routeCluster = skill-patch, confidence 0.85
        indexMock.mockResolvedValue({ personas: { __top__: [1, 2, 3, 4, 5].map(event) } });
        const posted: any[] = [];
        routeFetch([
            [/\/api\/ai\/gemini$/, () => ({ candidates: [{ content: { parts: [{ text: PATCH }] } }] })],
            [/\/api\/skill\/read/, () => ({ name: 'persona-architect', content: SKILL_MD })],
            [/\/api\/epochs\/proposals\?status=pending/, () => ({ proposals: [], count: 0, pending: 0 })],
            [/\/api\/epochs\/proposals$/, (_u, init) => { posted.push(JSON.parse(String(init?.body))); return { ok: true, id: 'prop_sp_1' }; }],
            [/\/api\/wiki\/read\//, () => ({ content: '', exists: false })],
        ]);

        const result = await runLearningPass();

        expect(calls(/\/api\/skill\/write/).length).toBe(0);
        expect(posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({
            kind: 'skill_patch',
            target_layer: 'skill',
            target_path: '.claude/skills/persona-architect/SKILL.md',
            proposed_edit: PATCH,
            risk_class: 'low_risk',
            gate_verdict: null,
            confidence: 0.85,
        });
        expect(posted[0].source_rollout_ids).toEqual(['fb_1', 'fb_2', 'fb_3', 'fb_4', 'fb_5']);
        expect(result.skillPatchProposals).toEqual(['prop_sp_1']);
        expect(result.skillsTouched).toEqual([]);
        expect(result.applied.filter(c => c.target === 'skill-patch')).toHaveLength(0);
        expect(result.queuedForReview.some(c => c.target === 'skill-patch')).toBe(true);
    });

    it('does not re-propose a patch that is already pending for the same skill', async () => {
        indexMock.mockResolvedValue({ personas: { __top__: [1, 2, 3, 4, 5].map(event) } });
        routeFetch([
            [/\/api\/ai\/gemini$/, () => ({ candidates: [{ content: { parts: [{ text: PATCH }] } }] })],
            [/\/api\/skill\/read/, () => ({ name: 'persona-architect', content: SKILL_MD })],
            [/\/api\/epochs\/proposals\?status=pending/, () => ({ proposals: [{ id: 'prop_old', target_path: '.claude/skills/persona-architect/SKILL.md', proposed_edit: PATCH, status: 'pending' }], count: 1, pending: 1 })],
            [/\/api\/wiki\/read\//, () => ({ content: '', exists: false })],
        ]);
        const result = await runLearningPass();
        expect(calls(/\/api\/epochs\/proposals$/, 'POST').length).toBe(0);
        expect(result.skillPatchProposals).toEqual(['prop_old']);
    });
});

describe('patchSkillFile is gated by an APPROVE verdict (C4)', () => {
    const candidate: ImprovementCandidate = {
        id: 'cand_1',
        cluster: { deliverableType: 'personas', sectionScope: null, polarity: 'negative', count: 5, representativeEvents: [], distinctTextFragments: ['x'] },
        target: 'skill-patch', payload: PATCH, confidence: 0.85, rationale: 'r', proposedAt: '2026-10-01T00:00:00Z',
    };

    it('throws without a verdict, with a non-APPROVE verdict, or with an incomplete one; nothing is fetched', async () => {
        await expect(patchSkillFile('persona-architect', candidate, undefined as any)).rejects.toThrow(/no gate verdict/);
        await expect(patchSkillFile('persona-architect', candidate, { verdict: 'REJECT', discrimination_before: 1, discrimination_after: 0.5, golden_set_version: 3 })).rejects.toThrow(/not APPROVE/);
        await expect(patchSkillFile('persona-architect', candidate, { verdict: 'APPROVE' } as any)).rejects.toThrow(/missing numeric discrimination_before/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('with an APPROVE verdict it writes the skill and carries gate_verdict to /api/skill/write', async () => {
        const writes: any[] = [];
        routeFetch([
            [/\/api\/skill\/read/, () => ({ name: 'persona-architect', content: SKILL_MD })],
            [/\/api\/skill\/write$/, (_u, init) => { writes.push(JSON.parse(String(init?.body))); return { status: 'ok' }; }],
        ]);
        const verdict = { verdict: 'APPROVE' as const, discrimination_before: 1.2, discrimination_after: 1.3, golden_set_version: 3, source_rollouts: ['fb_1'] };
        const ok = await patchSkillFile('persona-architect', candidate, verdict);
        expect(ok).toBe(true);
        expect(writes).toHaveLength(1);
        expect(writes[0].gate_verdict).toEqual(verdict);
        expect(writes[0].content).toContain(PATCH);
        expect(writes[0].content).toMatch(/^version: 1\.5$/m);
    });

    it('assertApproveVerdict accepts only a complete APPROVE object', () => {
        expect(() => assertApproveVerdict(null)).toThrow();
        expect(() => assertApproveVerdict({ verdict: 'HUMAN-REVIEW', discrimination_before: 1, discrimination_after: 1, golden_set_version: 3 })).toThrow(/HUMAN-REVIEW/);
        expect(() => assertApproveVerdict({ verdict: 'APPROVE', discrimination_before: 1, discrimination_after: 1, golden_set_version: 3 })).not.toThrow();
    });
});

describe('rung-3 ledger entries (anti-pattern + exemplar)', () => {
    it('anti-pattern and exemplar appends carry the rung 3 marker and never touch skills or constraints', async () => {
        indexMock.mockResolvedValue({
            // section-scoped negatives with NO text -> anti-pattern (6 events: 0.5+0.3+0.1 = 0.9; five
            // would evaluate to 0.7999... in IEEE float and queue instead of apply)
            journey: { phases: [1, 2, 3, 4, 5, 6].map(i => ({ ...event(i), text_excerpt: null })) },
            // positive signals -> exemplar
            recs: { __top__: [1, 2, 3, 4, 5].map(i => ({ ...event(i), vote_value: 'up', text_excerpt: 'Every recommendation names its owner and its instrument' })) },
        });
        const appends: any[] = [];
        routeFetch([
            [/\/api\/ai\/gemini$/, (_u, init) => {
                const prompt = String(JSON.parse(String(init?.body)).contents || '');
                const text = /anti-pattern/i.test(prompt)
                    ? JSON.stringify({ name: 'unnamed-phase-owner', description: 'Journey phases list activities with no owning team.', detection: 'a phase cell without an actor noun', alternative: 'name the team that performs the activity' })
                    : 'This output works because every recommendation names an owner and a measurement instrument.';
                return { candidates: [{ content: { parts: [{ text }] } }] };
            }],
            [/\/api\/wiki\/append$/, (_u, init) => { appends.push(JSON.parse(String(init?.body))); return { status: 'ok' }; }],
            [/\/api\/wiki\/read\//, () => ({ content: '', exists: false })],
        ]);
        await runLearningPass();
        const ap = appends.find(a => a.path === 'anti-patterns/journey.md');
        const ex = appends.find(a => a.path === 'exemplars/recs.md');
        expect(ap?.content).toMatch(/\*\*Rung\*\*: 3/);
        expect(ex?.content).toMatch(/\*\*Rung\*\*: 3/);
        expect(calls(/\/api\/skill\/write/).length).toBe(0);
        expect(appends.some(a => a.path === 'synthesis/learned-constraints.md')).toBe(false);
    });
});
