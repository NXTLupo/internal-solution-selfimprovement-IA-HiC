// promptImprovementEngine.r7.test.ts - WS-5 R7 (2026-10-30): feedback is labels and cases, never an auto-injected rule.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import {
    logChatFeedback, logEdit, getActiveConstraints, loadWikiConstraints, recordHeldoutVerdict, exportConstraintsToWiki,
    __getImprovementsForTests, __resetPromptImprovementForTests, setObjectiveProviderForCases, constraintRecordId,
} from './promptImprovementEngine';

const RULE = 'Name the owning team and the system it uses in every recommendation because an unnamed actor cannot act';
let files: Record<string, string>;
function route() {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (u.includes('/api/wiki/read/')) {
            const p = u.split('/api/wiki/read/')[1];
            return { ok: p in files, status: p in files ? 200 : 404, json: async () => ({ content: files[p] }) };
        }
        if (u.includes('/api/wiki/write')) {
            const b = JSON.parse(String(init?.body || '{}'));
            files[b.path] = b.content;
            return { ok: true, status: 200, json: async () => ({ ok: true }) };
        }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });
}
const posted = (pathPart: string) => fetchMock.mock.calls.filter(c => String(c[0]).includes(pathPart) && (c[1] as any)?.method === 'POST');

beforeEach(() => { fetchMock.mockReset(); files = {}; route(); __resetPromptImprovementForTests(); setObjectiveProviderForCases(() => 'the objective'); vi.spyOn(console, 'log').mockImplementation(() => {}); });

describe('logChatFeedback', () => {
    it('a high-confidence rule is a label, a frontier case and a CANDIDATE row; it never becomes an active constraint', async () => {
        logChatFeedback({ type: 'rule', userText: 'never use emojis', aiText: 'reply', extractedRule: RULE, confidence: 0.95, chatSurface: 'analyst', timestamp: Date.now(), artifactKind: 'recs' });
        await new Promise(r => setTimeout(r, 10));
        expect(posted('/api/eval/labels')).toHaveLength(1);
        const cases = posted('/api/eval/cases');
        expect(cases).toHaveLength(1);
        const body = JSON.parse(String((cases[0][1] as any).body));
        expect(body.set).toBe('frontier');
        expect(body.origin.type).toBe('user_report');
        expect(body.input.objective).toBe('the objective');
        const rows = JSON.parse(files['synthesis/constraint-records.json'] || '[]');
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe('candidate');
        expect(rows[0].heldout_win).toBe(false);
        expect(__getImprovementsForTests()).toEqual([]);
        expect(getActiveConstraints('recs')).toBe('');
    });
    it('a checkpoint edit is a label', async () => {
        logEdit('PERSONAS', 'bio', 'long original text here', 'short');
        await new Promise(r => setTimeout(r, 10));
        expect(posted('/api/eval/labels')).toHaveLength(1);
        expect(__getImprovementsForTests()).toEqual([]);
    });
});

describe('loadWikiConstraints', () => {
    it('migrates ledger lines to candidate rows and activates ONLY held-out winners', async () => {
        files['synthesis/learned-constraints.md'] = `# Learned Constraints\n\n- CONSTRAINT [recs/owner]: ${RULE}\n- CONSTRAINT: Another rule that names the actor and the mechanism because the reader must see who acts (confidence 0.8)\n`;
        const n = await loadWikiConstraints();
        expect(n).toBe(0);
        const rows = JSON.parse(files['synthesis/constraint-records.json']);
        expect(rows).toHaveLength(2);
        expect(rows.every((r: any) => r.status === 'candidate')).toBe(true);
        expect(getActiveConstraints()).toBe('');

        await recordHeldoutVerdict(RULE, { before: 0.6, after: 0.75, cases: 4, decision: 'accept', scope: { kind: 'recs' } });
        const after = JSON.parse(files['synthesis/constraint-records.json']);
        expect(after.find((r: any) => r.id === constraintRecordId(RULE)).status).toBe('active');
        __resetPromptImprovementForTests();
        expect(await loadWikiConstraints()).toBe(1);
        expect(getActiveConstraints('recs')).toContain(RULE);
        expect(getActiveConstraints('personas')).toBe('');
    });
    it('a lost held-out comparison keeps the rule a candidate', async () => {
        await recordHeldoutVerdict(RULE, { before: 0.7, after: 0.6, cases: 4, decision: 'reject', reason: 'mean score fell' });
        const rows = JSON.parse(files['synthesis/constraint-records.json']);
        expect(rows[0].status).toBe('candidate');
        expect(rows[0].heldout.decision).toBe('reject');
        expect(getActiveConstraints()).toBe('');
    });
});

describe('exportConstraintsToWiki', () => {
    it('writes winners as CONSTRAINT lines and candidates under their own heading', async () => {
        await recordHeldoutVerdict(RULE, { before: 0.6, after: 0.8, cases: 3, decision: 'accept', scope: { kind: 'recs' } });
        logChatFeedback({ type: 'rule', userText: 'x', aiText: 'y', extractedRule: 'Spell out every acronym on first use because the reader may not know the internal names', confidence: 0.9, chatSurface: 'analyst', timestamp: Date.now() });
        await new Promise(r => setTimeout(r, 10));
        expect(await exportConstraintsToWiki()).toBe(true);
        const ledger = files['synthesis/learned-constraints.md'];
        expect(ledger).toContain(`- CONSTRAINT [recs]: ${RULE}`);
        expect(ledger).toContain('## Candidates (not injected until they beat the incumbent on the held-out split)');
        expect(ledger).toContain('- candidate: Spell out every acronym');
    });
});
