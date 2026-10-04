/** Board-admission relevance gate (2026-10-03): other engagements' themes are judged once; own themes never. */
import { describe, it, expect } from 'vitest';
import { gateForeignThemes, foreignSourceOf, parseVerdicts, applyVerdicts, buildJudgePrompt } from './themeRelevanceGate';

const ENG = 'design-a-patient-intake-portal-for-a-regional-hospital-network';
const store = () => {
    const files = new Map<string, string>();
    const fetchImpl = (async (url: string, init?: any) => {
        const u = new URL(url);
        if (u.pathname.startsWith('/api/wiki/read/')) {
            const c = files.get(decodeURIComponent(u.pathname.slice('/api/wiki/read/'.length)));
            return { ok: true, status: 200, json: async () => (c ? { exists: true, content: c } : { exists: false }) } as any;
        }
        if (u.pathname === '/api/wiki/write') { const b = JSON.parse(init.body); files.set(b.path, b.content); return { ok: true, status: 200, json: async () => ({}) } as any; }
        return { ok: false, status: 404, json: async () => ({}) } as any;
    }) as any;
    return { files, fetchImpl };
};
const themes = [
    { id: 'own-1', name: 'Patients repeat intake at the front desk' },
    { id: `eng:${ENG}#3`, name: 'Wait times frustrate patients' },
    { id: 'eng:deliver-a-strategic-roadmap-for-alumni-giving-programs-at-a-coll#4', name: 'Giving Day events raise money but never make the ask' },
    { id: 'eng:analyze-hospital-billing-transparency-trends-for-2026-across-us#2', name: 'Patients distrust surprise bills' },
];

describe('theme relevance gate', () => {
    it('treats only other engagements\' themes as foreign', () => {
        expect(foreignSourceOf(themes[0], ENG)).toBeNull();
        expect(foreignSourceOf(themes[1], ENG)).toBeNull();
        expect(foreignSourceOf(themes[2], ENG)).toContain('alumni-giving');
        expect(foreignSourceOf({ name: 'x', source: 'cached', source_synthesis_path: 'synthesis/topics-tm_1.json' }, ENG)).toBe('cached:synthesis/topics-tm_1.json');
    });

    it('holds out only themes judged off-topic, caches verdicts, and never re-judges', async () => {
        const io = store();
        let calls = 0;
        const judge = async (p: { system: string; user: string }) => {
            calls++;
            expect(p.user).toContain('PROJECT OBJECTIVE');
            expect(p.user).not.toContain('Patients repeat intake');   // own themes are never sent
            return JSON.stringify({ verdicts: [{ i: 1, relevant: false, reason: 'alumni fundraising' }, { i: 2, relevant: true, reason: 'patient billing' }] });
        };
        const r = await gateForeignThemes(themes, { engagement: ENG, objective: 'Specify a patient intake portal for a regional hospital network', scope: ['Online pre-registration'], judge, ...io, proxyBase: 'http://proxy.test' });
        expect(r.held.map(t => t.name)).toEqual(['Giving Day events raise money but never make the ask']);
        expect(r.kept.length).toBe(3);
        expect(r.judgedNow).toBe(2);
        const again = await gateForeignThemes(themes, { engagement: ENG, objective: 'Specify a patient intake portal for a regional hospital network', judge, ...io, proxyBase: 'http://proxy.test' });
        expect(calls).toBe(1);
        expect(again.held.length).toBe(1);
    });

    it('keeps everything when the judge fails or replies with garbage (fail open)', async () => {
        const io = store();
        const r = await gateForeignThemes(themes, { engagement: ENG, objective: 'Specify a portal', judge: async () => { throw new Error('down'); }, ...io, proxyBase: 'http://proxy.test' });
        expect(r.held).toEqual([]);
        expect(parseVerdicts('not json', 2)).toEqual([undefined, undefined]);
        expect(applyVerdicts(themes, ENG, {}).kept.length).toBe(4);
    });

    it('a changed objective re-judges', async () => {
        const io = store();
        let calls = 0;
        const judge = async () => { calls++; return JSON.stringify({ verdicts: [{ i: 1, relevant: true }, { i: 2, relevant: true }] }); };
        await gateForeignThemes(themes, { engagement: ENG, objective: 'goal one', judge, ...io, proxyBase: 'http://proxy.test' });
        await gateForeignThemes(themes, { engagement: ENG, objective: 'goal two', judge, ...io, proxyBase: 'http://proxy.test' });
        expect(calls).toBe(2);
        expect(buildJudgePrompt('o', [], [themes[2]]).user).toContain('1. Giving Day');
    });
});

describe('theme relevance gate: missing verdicts are re-asked', () => {
    it('a theme the first batch skipped is judged in the follow-up pass', async () => {
        const io = store();
        const calls: number[] = [];
        const judge = async (p: { system: string; user: string }) => {
            const n = (p.user.match(/^\d+\. /gm) || []).length;
            calls.push(n);
            // First call answers only theme 1 of 2; the follow-up answers the remaining one.
            return calls.length === 1 ? JSON.stringify({ verdicts: [{ i: 1, relevant: true }] }) : JSON.stringify({ verdicts: [{ i: 1, relevant: false }] });
        };
        const r = await gateForeignThemes(themes, { engagement: ENG, objective: 'Specify a patient intake portal', judge, ...io, proxyBase: 'http://proxy.test' });
        expect(calls).toEqual([2, 1]);
        expect(r.held.length).toBe(1);
    });
});
