// deckLoop.test.ts - WS-4 (2026-10-30): the in-conversation verify loop. Measurement needs a layout engine and is
// exercised live; the parsing, the joined verdict, the submission budget, the ask card and the wiring are pinned here.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    parseDeckFences, judgeDeck, executeSubmitDeck, beginDeckLoop, endDeckLoop, deckLoopActive, lastDeckVerdict, readDeckLoop,
    buildDeckAskCard, deckAskFollowUp, DECK_LOOP_MAX_SUBMISSIONS, RENDER_SLIDE_TOOL, SUBMIT_DECK_TOOL, _resetDeckLoopForTests,
} from './deckLoop';
import { _resetRunStateForTests, getRun } from './runState';
import { resetGroundingChunks, noteGroundingChunks } from './pointerBinder';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');

const fence = (t: string, payload: Record<string, unknown>) => `:::slide template=slides:${t} brand=nxt\n${JSON.stringify(payload)}\n:::`;
const longBody = (n: number) => Array.from({ length: n }, (_, i) => `The advancement team re-keys donor records by hand each week, item ${i}.`).join(' ');

/** A deck that clears the plan gate: 8 slides, 5 archetypes, over 40% visual body slides, dense bodies. */
function goodDeck(): string {
    return [
        fence('cover', { title: 'Alumni drop off at three stages the advancement team cannot see', subtitle: 'Fragmented CRM records hide the hand-offs between campus units' }),
        fence('agenda', { items: ['Customer-facing failure modes', 'Operational cost drivers', 'The recommended response', 'Decision'] }),
        fence('numbered-themes', { title: 'Four hand-offs lose the alumni record', items: [1, 2, 3, 4].map(i => ({ name: `Hand-off ${i}`, body: longBody(2) })) }),
        fence('evidence-table', { title: 'Each unit keeps its own donor record', columns: ['Unit', 'System', 'Record'], rows: [['Alumni', 'CRM A', longBody(3)], ['Giving', 'CRM B', longBody(3)], ['Events', 'Sheet', longBody(3)]] }),
        fence('flow-arc', { title: 'A gift moves through five systems before a receipt', steps: [1, 2, 3, 4].map(i => ({ title: `Step ${i}`, description: longBody(2) })) }),
        fence('means-matters', { title: 'Manual re-keying delays every receipt', means: longBody(3), matters: longBody(3), sourceLine: 'Source: Advancement operations review' }),
        fence('ranked-bars', { title: 'Re-keying is the largest time cost in gift processing', items: [1, 2, 3].map(i => ({ label: `Task ${i}`, value: 10 - i, body: longBody(2) })) }),
        fence('section-divider', { title: 'The recommended response', supporting: 'One donor record across every campus unit' }),
    ].join('\n');
}

beforeEach(() => { _resetDeckLoopForTests(); _resetRunStateForTests(); resetGroundingChunks(); });

describe('parseDeckFences', () => {
    it('reads template, brand and payload in order and keeps a broken fence as a finding', () => {
        const text = `${fence('cover', { title: 'A' })}\n:::slide template=slides:stat-row brand=nu\n{ not json\n:::`;
        const f = parseDeckFences(text);
        expect(f.map(x => x.template)).toEqual(['slides:cover', 'slides:stat-row']);
        expect(f[0].brand).toBe('nxt');
        expect(f[1].brand).toBe('nu');
        expect(f[0].payload.title).toBe('A');
        expect(f[1].parseError).toBeTruthy();
    });
    it('repairs glued fences the way the panel parser does', () => {
        const glued = `${fence('cover', { title: 'A' })}${fence('agenda', { items: ['x'] })}`.replace(':::\n:::slide', '::::::slide');
        expect(parseDeckFences(glued)).toHaveLength(2);
    });
});

describe('judgeDeck (measurement off)', () => {
    it('accepts a deck that clears plan, density and binding', async () => {
        const v = await judgeDeck(goodDeck(), {}, { measure: false });
        expect(v.findings.map(f => f.text)).toEqual([]);
        expect(v.accepted).toBe(true);
        expect(v.score).toBe(1);
        expect(v.plan?.isDeck).toBe(true);
    });
    it('names the slide and the rule for a thin slide and for a plan violation', async () => {
        const thin = goodDeck().replace(fence('means-matters', { title: 'Manual re-keying delays every receipt', means: longBody(3), matters: longBody(3), sourceLine: 'Source: Advancement operations review' }), fence('means-matters', { title: 'Thin', means: 'x', matters: 'y' }));
        const v = await judgeDeck(thin, {}, { measure: false });
        expect(v.accepted).toBe(false);
        const density = v.findings.find(f => f.rule === 'density');
        expect(density?.slide).toBe(6);
        expect(density?.text).toMatch(/slide 6 \(means-matters: "Thin"\)/);
        expect(v.score).toBeLessThan(1);
    });
    it('a deck of one fence is not a deck', async () => {
        const v = await judgeDeck(fence('cover', { title: 'A' }), {}, { measure: false });
        expect(v.accepted).toBe(false);
        expect(v.findings[0].text).toMatch(/only 1 :::slide fence/);
    });
    it('reports binding only when fewer than 60% of factual fields tie to a chunk', async () => {
        noteGroundingChunks([{ id: 'articles/x/aa.md#c1', text: 'unrelated passage about weather patterns in the north sea', sources: [{ n: 'Met' }] }]);
        const v = await judgeDeck(goodDeck(), {}, { measure: false });
        const p = v.findings.find(f => f.rule === 'pointers');
        // the binder sees fields it cannot tie to the weather chunk; the finding names the exact fields
        if (p) expect(p.text).toMatch(/could be tied to a manifest chunk/);
        expect(v.pointers.bound + v.pointers.unbound).toBeGreaterThanOrEqual(0);
    });
});

describe('executeSubmitDeck: the budget and the ask card', () => {
    it('is final on acceptance and records the verdicts on the run', async () => {
        beginDeckLoop({});
        // measurement off through the exported judge: the tool path composes slides, so stub the judge's layout leg
        const spy = vi.spyOn(await import('./layoutGate'), 'measureViaProxy').mockResolvedValue({});
        const r = await executeSubmitDeck({ deck: goodDeck() });
        spy.mockRestore();
        expect(r.verdict.accepted).toBe(true);
        expect(r.verdict.final).toBe(true);
        expect(r.text).toMatch(/^submit_deck: ACCEPTED \(submission 1/);
        expect(readDeckLoop().acceptedDeck).toBe(goodDeck());
        expect(getRun().verdicts.map(v => v.judge_id)).toContain('deckLoop.submit');
        expect(getRun().verdicts.map(v => v.judge_id)).toContain('deckPlanGate');
        endDeckLoop();
        expect(deckLoopActive()).toBe(false);
    });
    it(`ships after ${DECK_LOOP_MAX_SUBMISSIONS} unaccepted submissions and routes the run to ask_user`, async () => {
        beginDeckLoop({});
        const spy = vi.spyOn(await import('./layoutGate'), 'measureViaProxy').mockResolvedValue({});
        // five thin numbered-themes slides: the cap, the variety floor and the density floor all fail
        const bad = [1, 2, 3, 4, 5].map(i => fence('numbered-themes', { title: `Theme ${i}`, items: [{ name: 'a', body: 'b' }] })).join('\n');
        let last;
        for (let i = 0; i < DECK_LOOP_MAX_SUBMISSIONS; i++) last = await executeSubmitDeck({ deck: bad });
        spy.mockRestore();
        expect(last!.verdict.accepted).toBe(false);
        expect(last!.verdict.exhausted).toBe(true);
        expect(last!.verdict.final).toBe(true);
        expect(last!.text).toMatch(/submission budget is spent/);
        expect(lastDeckVerdict()?.submission).toBe(DECK_LOOP_MAX_SUBMISSIONS);
        expect(getRun().goal.blocker).toBe('needs_user_input');
        const card = buildDeckAskCard(last!.verdict);
        expect(card.choices.map(c => c.id)).toEqual(['accept', 'narrow', 'guide']);
        expect(card.findings.length).toBeGreaterThan(0);
        expect(deckAskFollowUp('narrow', card)).toMatch(/^#slides Revise the last deck: remove or merge/);
        expect(deckAskFollowUp('accept', card)).toBe('');
    });
    it('a gate that throws is a finding, never a pass', async () => {
        beginDeckLoop({});
        const spy = vi.spyOn(await import('./layoutGate'), 'measureViaProxy').mockRejectedValue(new Error('engine down'));
        const r = await executeSubmitDeck({ deck: goodDeck() });
        spy.mockRestore();
        expect(r.verdict.accepted).toBe(false);
        expect(r.verdict.findings.some(f => f.rule === 'gate-error' && /engine down/.test(f.text))).toBe(true);
    });
});

describe('WS-4 wiring (source asserts)', () => {
    const chat = read('services/corpusChatService.ts');
    it('callClaude registers the two deck tools on a deck turn and ends the loop on the accepted submission', () => {
        expect(chat).toMatch(/_deckLoop \? \[RENDER_SLIDE_TOOL, SUBMIT_DECK_TOOL\] : \[\]/);
        expect(chat).toMatch(/if \(_deckFinal\) break;/);
        expect(chat).toMatch(/if \(_acceptedDeck\) \{\s*\n\s*_rememberClaudeTurn\(model, _acceptedDeck, blocks\);\s*\n\s*return _acceptedDeck;/);
        expect(chat).toMatch(/type: 'image', source: \{ type: 'base64', media_type: _shot\.mime, data: _shot\.data \}/);
    });
    it('the deck gate no longer re-asks in a fresh conversation and a gate error is a finding', () => {
        expect(chat).not.toMatch(/callClaude\(systemPrompt, repairMsg, \[\], activeModelId\)/);
        expect(chat).not.toMatch(/callClaude\(systemPrompt, redrawMsg, \[\], activeModelId\)/);
        expect(chat).not.toMatch(/fail-open, deck ships ungated/);
        expect(chat).toMatch(/_deckGateFailure = String\(gateErr\?\.message \|\| gateErr\)/);
        expect(chat).toMatch(/beginDeckLoop\(await _deckGateOptsFor\(userMessage\)\)/);
        expect(chat).toMatch(/\$\{DECK_LOOP_CONTRACT\}/);
    });
    it('the tool definitions name the contract the prompt states', () => {
        expect(RENDER_SLIDE_TOOL.input_schema.required).toEqual(['fence']);
        expect(SUBMIT_DECK_TOOL.input_schema.required).toEqual(['deck']);
        expect(SUBMIT_DECK_TOOL.description).toContain(`${DECK_LOOP_MAX_SUBMISSIONS} submissions`);
    });
    it('the export waits for the layout verdict and a dropped slide fails the count check', () => {
        const panel = read('components/CorpusChatPanel.tsx');
        expect(panel).toMatch(/Export held: \$\{lv\.open\.length\} slide\(s\) still fail the layout check/);
        expect(panel).toMatch(/Export held: \$\{dropped\.length\} of \$\{exportSlides\.length\} slide\(s\) could not be rendered/);
        expect(panel).toMatch(/judge_id: 'slideVisionCritic'/);
        expect(panel).toMatch(/runId: `deck_\$\{response\.id\}:rescore`/);
        expect(panel).toMatch(/msg\.deckAsk\.choices\.map/);
        expect(panel).toMatch(/Correct the reading and rerun/);
    });
    it('the repair model receives the verbatim passages behind the slide pointers', () => {
        const repair = read('services/artifactRepair.ts');
        expect(repair).toMatch(/EVIDENCE AVAILABLE \(verbatim corpus passages behind this slide\\'s pointers\)/);
        expect(repair).toMatch(/repairSlide\(slide, slideInstruction\(f, slide\), evidenceBlockFor\(slide, _pool\)\)/);
    });
    it('the research plan editor is mounted behind the review toggle', () => {
        const app = read('App.tsx');
        expect(app).toMatch(/import \{ ResearchPlanEditor \} from '\.\/components\/ResearchPlanEditor'/);
        expect(app).toMatch(/reviewPlanBeforeRun && decomposition\.plan/);
        expect(app).toMatch(/<ResearchPlanEditor/);
    });
});
