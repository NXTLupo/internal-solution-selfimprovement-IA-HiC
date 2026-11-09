// 2026-10-01 (plan Stage 5.2, audit C5): constraint retirement was impossible. Nothing wrote
// synthesis/constraint-records.json, reviewConstraintEffectiveness read an empty store, and
// runLearningPass listed retirements it never performed. These tests pin the lifecycle:
// row at creation -> applications/negatives counted by the discriminator -> retirement that
// DELETES the ledger line (with a `retired:` line) -> injection capped at 12 / 6000 chars.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const indexMock = vi.fn();
vi.mock('./feedbackService', () => ({ readFeedbackIndex: (...a: any[]) => indexMock(...a) }));
vi.mock('./secondBrainPass', () => ({
    runSecondBrainPass: async () => ({ report: null }),
    constraintToProposedFact: (c: string) => ({ content: c }),
}));

import { runLearningPass, reviewConstraintEffectiveness, retireConstraints } from './learningEngine';
import { discriminate, lastConstraintRecordWrite } from './improvementDiscriminator';
import {
    CONSTRAINT_RECORDS_PATH,
    constraintRecordId,
    createConstraintRecord,
    recordConstraintApplications,
    capConstraintsForInjection,
    getActiveConstraints,
    MAX_INJECTED_CONSTRAINTS,
    MAX_INJECTED_CONSTRAINT_CHARS,
    __setImprovementsForTests,
    __getImprovementsForTests,
    __resetPromptImprovementForTests,
    type ConstraintLifecycleRecord,
} from './promptImprovementEngine';

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

const RULE = 'When generating personas persona-quote section, use verbatim excerpts from the interview transcripts because fabricated quotes misrepresent the respondent.';

/** In-memory wiki: constraint-records.json + learned-constraints.md behind the read/write routes. */
function wikiStore(initial: { records?: ConstraintLifecycleRecord[]; ledger?: string } = {}) {
    const files: Record<string, string> = {};
    if (initial.records) files[CONSTRAINT_RECORDS_PATH] = JSON.stringify(initial.records);
    if (initial.ledger) files['synthesis/learned-constraints.md'] = initial.ledger;
    const routes: Array<[RegExp, Route]> = [
        [/\/api\/wiki\/read\/(.+)$/, (u) => { const p = decodeURIComponent(u.split('/api/wiki/read/')[1]); return { path: p, content: files[p] || '', exists: p in files }; }],
        [/\/api\/wiki\/write$/, (_u, init) => { const b = JSON.parse(String(init?.body)); files[b.path] = b.content; return { status: 'ok' }; }],
        [/\/api\/wiki\/append$/, (_u, init) => { const b = JSON.parse(String(init?.body)); files[b.path] = (files[b.path] || '') + '\n' + b.content; return { status: 'ok' }; }],
    ];
    return { files, routes, records: () => JSON.parse(files[CONSTRAINT_RECORDS_PATH] || '[]') as ConstraintLifecycleRecord[] };
}

beforeEach(() => {
    fetchMock.mockReset();
    indexMock.mockReset();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    __resetPromptImprovementForTests();
});

describe('row at creation', () => {
    it('createConstraintRecord writes {id, created, applications: 0, negativeSignalsAfter: 0} once', async () => {
        const w = wikiStore();
        routeFetch(w.routes);
        const row = await createConstraintRecord({ text: RULE, deliverableType: 'personas', sectionScope: 'persona-quote', confidence: 0.85 });
        expect(row).toMatchObject({ id: constraintRecordId(RULE), applications: 0, negativeSignalsAfter: 0, text: RULE });
        expect(typeof row?.created).toBe('string');
        // idempotent
        await createConstraintRecord({ text: RULE });
        expect(w.records()).toHaveLength(1);
    });

    it('a learning pass that promotes a constraint creates its lifecycle row', async () => {
        const w = wikiStore();
        indexMock.mockResolvedValue({
            personas: { 'persona-quote': [1, 2, 3, 4, 5].map(i => ({ id: `fb_${i}`, timestamp: '', engagement_slug: 'e', deliverable_id: `d${i}`, signal_type: 'text', vote_value: 'down', text_excerpt: 'quotes are invented' })) },
        });
        routeFetch([
            [/\/api\/ai\/gemini$/, () => ({ candidates: [{ content: { parts: [{ text: RULE }] } }] })],
            ...w.routes,
        ]);
        const result = await runLearningPass();
        expect(result.applied.some(c => c.target === 'constraint')).toBe(true);
        expect(w.files['synthesis/learned-constraints.md']).toContain(`- CONSTRAINT [personas/persona-quote]: ${RULE}`);
        const rows = w.records();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ id: constraintRecordId(RULE), applications: 0, negativeSignalsAfter: 0, deliverableType: 'personas', sectionScope: 'persona-quote' });
    });
});

describe('applications + negative signals counted by the discriminator', () => {
    it('recordConstraintApplications increments only rows for active constraints', async () => {
        const w = wikiStore({ records: [
            { id: constraintRecordId(RULE), text: RULE, created: 'c', applications: 2, negativeSignalsAfter: 0 },
            { id: constraintRecordId('other rule that is not active on this deliverable right now'), text: 'other rule that is not active on this deliverable right now', created: 'c', applications: 9, negativeSignalsAfter: 1 },
        ] });
        routeFetch(w.routes);
        const touched = await recordConstraintApplications([RULE], true);
        expect(touched).toBe(1);
        const rows = w.records();
        expect(rows[0]).toMatchObject({ applications: 3, negativeSignalsAfter: 1 });
        expect(rows[1]).toMatchObject({ applications: 9, negativeSignalsAfter: 1 });
    });

    it('discriminate counts an application per scored deliverable and a negative signal on a measured regression', async () => {
        const w = wikiStore({ records: [{ id: constraintRecordId(RULE), text: RULE, created: 'c', applications: 0, negativeSignalsAfter: 0 }] });
        routeFetch(w.routes);
        const good = '# Alumni drop off at three stages the advancement team cannot see\nHigher Ed Dive reports the stages. Reddit: r/NEU adds the voice.';
        const bad = '# Overview\nIn this deck we delve into a tapestry of insights. Based on the research, synergy is paramount.';
        discriminate({ artifactKind: 'persona', artifactId: 'a1', timestamp: 1, content: good, activeConstraints: [RULE] });
        await lastConstraintRecordWrite();
        expect(w.records()[0]).toMatchObject({ applications: 1, negativeSignalsAfter: 0 }); // baseline: no prior -> not a regression
        discriminate({ artifactKind: 'persona', artifactId: 'a2', timestamp: 2, content: bad, activeConstraints: [RULE] });
        await lastConstraintRecordWrite();
        expect(w.records()[0]).toMatchObject({ applications: 2, negativeSignalsAfter: 1 });
    });
});

describe('retirement that deletes', () => {
    const KEEP = 'When generating recs owner section, name the accountable team because an unowned action is never executed.';
    const ledger = [
        '---', 'title: Learned Constraints', '---', '', '# Learned Constraints', '',
        `- CONSTRAINT [personas/persona-quote]: ${RULE} (source: 5 feedback signals, confidence 0.85)`,
        `- CONSTRAINT [recs/owner]: ${KEEP} (source: 4 feedback signals, confidence 0.80)`,
        '',
    ].join('\n');

    it('reviewConstraintEffectiveness reads the rows and decides retire below the floor after 20 applications', async () => {
        const w = wikiStore({ records: [
            { id: constraintRecordId(RULE), text: RULE, created: 'c', applications: 20, negativeSignalsAfter: 16 },
            { id: constraintRecordId(KEEP), text: KEEP, created: 'c', applications: 20, negativeSignalsAfter: 2 },
            { id: 'cr_retired', text: 'already retired rule that must not be reviewed again', created: 'c', applications: 30, negativeSignalsAfter: 30, retired: '2026-09-01T00:00:00Z' },
        ] });
        routeFetch(w.routes);
        const report = await reviewConstraintEffectiveness();
        expect(report.constraints).toHaveLength(2);
        expect(report.constraints.find(c => c.text === RULE)?.decision).toBe('retire');
        expect(report.constraints.find(c => c.text === KEEP)?.decision).toBe('promote-to-skill-patch');
    });

    it('runLearningPass removes the retired ledger line, appends a retired: line, stamps the row, and leaves the keeper', async () => {
        const w = wikiStore({
            records: [
                { id: constraintRecordId(RULE), text: RULE, created: 'c', applications: 24, negativeSignalsAfter: 20 },
                { id: constraintRecordId(KEEP), text: KEEP, created: 'c', applications: 24, negativeSignalsAfter: 1 },
            ],
            ledger,
        });
        indexMock.mockResolvedValue({});
        routeFetch(w.routes);
        __setImprovementsForTests([
            { id: 'i1', field: 'f', stage: 's', constraint: RULE, appliedAt: 1, improvementScore: 0 },
            { id: 'i2', field: 'f', stage: 's', constraint: KEEP, appliedAt: 2, improvementScore: 0 },
        ]);

        const result = await runLearningPass();

        expect(result.constraintsRetired).toEqual([RULE]);
        const after = w.files['synthesis/learned-constraints.md'];
        expect(after).not.toContain(`- CONSTRAINT [personas/persona-quote]: ${RULE}`);
        expect(after).toContain(`- CONSTRAINT [recs/owner]: ${KEEP}`);
        expect(after).toMatch(new RegExp(`^- retired: ${RULE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|\\| effectiveness 17% over 24 applications \\(\\d{4}-\\d{2}-\\d{2}\\)$`, 'm'));
        const rows = w.records();
        expect(typeof rows.find(r => r.text === RULE)?.retired).toBe('string');
        expect(rows.find(r => r.text === KEEP)?.retired).toBeUndefined();
        const store = __getImprovementsForTests();
        expect(store.map((i: any) => i.constraint)).toEqual([KEEP]);
    });

    it('dry-run lists the retirement but writes nothing', async () => {
        const w = wikiStore({ records: [{ id: constraintRecordId(RULE), text: RULE, created: 'c', applications: 24, negativeSignalsAfter: 20 }], ledger });
        indexMock.mockResolvedValue({});
        routeFetch(w.routes);
        const result = await runLearningPass({ dryRun: true });
        expect(result.constraintsRetired).toEqual([RULE]);
        expect(w.files['synthesis/learned-constraints.md']).toBe(ledger);
    });

    it('retireConstraints is a no-op when the ledger has no matching line', async () => {
        const w = wikiStore({ ledger });
        routeFetch(w.routes);
        const removed = await retireConstraints([{ id: 'x', text: 'a rule that is not in the ledger at all', applications: 30, effectiveness: 0.1 }]);
        expect(removed).toEqual([]);
        expect(w.files['synthesis/learned-constraints.md']).toBe(ledger);
    });
});

describe('injection cap (mirrors inject_active_constraints_and_patterns.py: 12 / 6 KB)', () => {
    const mk = (i: number, conf: number) => `Rule number ${i}: when generating the deliverable, name the accountable team and the system (source: 3 feedback signals, confidence ${conf.toFixed(2)})`;

    it('capConstraintsForInjection keeps at most 12, highest confidence then newest first, within 6000 chars', () => {
        const lines = Array.from({ length: 20 }, (_, i) => mk(i, 0.5 + (i % 5) * 0.1));
        const meta: Record<string, { appliedAt: number }> = {};
        lines.forEach((l, i) => { meta[l] = { appliedAt: i }; });
        const out = capConstraintsForInjection(lines, meta);
        expect(out).toHaveLength(MAX_INJECTED_CONSTRAINTS);
        // all 0.90-confidence rules (i % 5 === 4) come first, newest first within the tier
        expect(out.slice(0, 4)).toEqual([mk(19, 0.9), mk(14, 0.9), mk(9, 0.9), mk(4, 0.9)]);
        expect(out.join('\n').length).toBeLessThanOrEqual(MAX_INJECTED_CONSTRAINT_CHARS);
    });

    it('the char budget drops lines that do not fit', () => {
        const long = 'L'.repeat(2500) + ' because the team must see the mechanism (confidence 1.00)';
        const lines = [long + ' a', long + ' b', long + ' c', 'short rule that names the actor and the system because the reader needs it (confidence 0.60)'];
        const out = capConstraintsForInjection(lines);
        expect(out).toHaveLength(3); // two long (5116 chars) + the short one; the third long does not fit
        expect(out.join('\n').length).toBeLessThanOrEqual(MAX_INJECTED_CONSTRAINT_CHARS);
    });

    it('getActiveConstraints never injects more than the cap', () => {
        const improvements = Array.from({ length: 30 }, (_, i) => ({
            id: `i${i}`, field: 'f', stage: 's', appliedAt: i, improvementScore: 0,
            constraint: `Rule ${i}: when generating the deck, name the owning team and the system it uses because an unnamed actor cannot act (confidence ${(0.5 + (i % 5) * 0.1).toFixed(2)})`,
        }));
        __setImprovementsForTests(improvements);
        const block = getActiveConstraints();
        const injected = block.split('\n').filter(l => l.startsWith('- '));
        expect(injected.length).toBeLessThanOrEqual(MAX_INJECTED_CONSTRAINTS);
        expect(injected.length).toBeGreaterThan(0);
        expect(block.length).toBeLessThanOrEqual(MAX_INJECTED_CONSTRAINT_CHARS + 200); // header line only
    });
});
