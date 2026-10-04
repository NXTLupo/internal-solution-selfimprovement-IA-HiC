/** 2026-10-02 (owner: the exported #prd deck was "slop, colliding text fields, and blank slides").
 *  The persona / journey / gap slides now fit by CONTENT BUDGET at a 24px (12 pt) floor: payload text
 *  is trimmed at clause or word boundaries (never mid-word, never an ellipsis), quotes are shortened
 *  only to a shorter VERBATIM span or dropped, overflow detail rides in the speaker notes, and the
 *  PRD inputs keep their full text. */
import { describe, it, expect } from 'vitest';
import { fitText, fitQuote, shortSource, SLIDE_BUDGETS, applySynthesizedRoots, rootDeliverableSlides } from './prdRootSynthesis';
import { slideDataToStageHtml } from './slideToStageHtml';
import type { PrdCompilerInputs } from './prdCompiler';

describe('fitText', () => {
    it('keeps text that fits (with the 15 percent allowance) untouched', () => {
        expect(fitText('Answer program questions in the Hub', 40)).toBe('Answer program questions in the Hub');
        const t = 'a'.repeat(10) + ' ' + 'b'.repeat(30);
        expect(fitText(t, 36)).toBe(t); // 41 <= 36 * 1.15
    });
    it('cuts before a clause or modifier boundary, never mid-word, never an ellipsis', () => {
        const out = fitText('Students move between disconnected university systems to find experiential information', 64);
        expect(out).toBe('Students move between disconnected university systems');
        expect(out).not.toMatch(/\.\.\.|…/);
    });
    it('prefers a shorter whole clause over a word cut that strands a modifier', () => {
        expect(fitText('Students leave the program prepared, with the hiring decision staying between employer and student.', 80))
            .toBe('Students leave the program prepared');
    });
    it('never ends on a dangling function word or participle', () => {
        const out = fitText("Recommend clubs, courses and workshops tied to each student's skill gaps", 52);
        expect(out).toBe('Recommend clubs, courses and workshops');
    });
});

describe('fitQuote', () => {
    it('returns a verbatim span: leading sentences, else a whole sentence, else a leading clause', () => {
        const q = 'Students navigate up to 20 disconnected platforms, including NUworks, Canvas, and Banner, leading to cognitive overload and application friction.';
        const out = fitQuote(q, 100, 'Engagement research synthesis');
        expect(q.startsWith(out)).toBe(true);
        expect(out.length).toBeLessThanOrEqual(100);
        expect(out).not.toMatch(/\.\.\.|…/);
    });
    it('drops a lowercase mid-sentence fragment from a document but keeps a social post as typed', () => {
        expect(fitQuote('apply en masse to the same handful of brand-name employers.', 90, 'Client document: CLR summary')).toBe('');
        expect(fitQuote('nobody told me why I was rejected', 90, 'Reddit r/NEU')).toBe('nobody told me why I was rejected');
    });
    it('drops transcript filler', () => {
        expect(fitQuote("And then you have to Google like, 'Northeastern' plus whatever", 90, 'Client document: interview')).toBe('');
    });
    it('shortSource drops the client-document prefix and timestamps', () => {
        expect(shortSource('Client document: Northeastern Student 360 Product Brief')).toBe('Northeastern Student 360 Product Brief');
        expect(shortSource('Reddit r/NEU, 2026-03-16T20:17:59.000Z')).toBe('Reddit r/NEU');
    });
});

const EV = 'articles/hed/aa11.md#c1';
const R = 'social-intelligence/reddit-neu/ab12.md#c3';
const base: PrdCompilerInputs = {
    artifactId: 'a1', objective: 'Build the experiential learning hub', personas: [], themes: [], journeyPains: [], competitiveGaps: [],
    evidenceChunks: [
        { id: EV, text: 'Students navigate up to 20 disconnected platforms, including NUworks, Canvas, and Banner, leading to cognitive overload and application friction.', sources: [{ n: 'Higher Ed Dive' }] },
        { id: R, text: 'NUworks doesn’t really help keep track of the status of your applications.', sources: [{ n: 'Reddit r/NEU' }] },
    ],
};
const longLabel = 'Students move between disconnected university systems to find experiential information every single week';
const reply = JSON.stringify({
    personas: [{
        name: 'Active Co-op Applicant', role: 'Student in an active co-op search applying through NUworks and outside networks every term', primary: true,
        title: 'Applicants track NUworks applications in spreadsheets because status is invisible',
        quote: { text: 'NUworks doesn’t really help keep track of the status of your applications.', evidenceId: R },
        jtbd: 'When I have many co-op applications open across NUworks and LinkedIn, I want one tracker with status and follow-ups, so I can focus effort on the roles that are still live',
        dayInTheLife: 'A graduate student opens a spreadsheet to check which of twenty applications still need a follow-up.',
        goals: { functionalGoal: 'Submit tailored applications, track each one’s status and act on follow-ups before deadlines', experienceGoal: 'In control of the search', lifeGoal: 'A co-op that builds the target career' },
        painPoints: [
            { label: longLabel, quote: 'Students navigate up to 20 disconnected platforms, including NUworks, Canvas, and Banner, leading to cognitive overload and application friction.', evidenceId: EV },
            { label: 'NUworks does not show students where each submitted application stands', quote: 'NUworks doesn’t really help keep track of the status of your applications.', evidenceId: R },
            { label: 'Students build trackers outside university systems', evidenceId: R },
            { label: 'A fourth pain that the slide has no room for', evidenceId: R },
        ],
        behaviors: ['Submits most applications through NUworks', 'Keeps status in a personal spreadsheet', 'Finds roles through LinkedIn', 'A fourth behavior'],
        winConditions: ['Show status in one list', 'Send follow-up reminders', 'Recommend roles beyond default brands'],
    }],
    journey: {
        title: 'Students leave the Student Hub to find answers and track applications',
        stages: ['Entry', 'Finding', 'Readiness', 'Applying', 'Tracking'].map(name => ({ name })),
        lanes: [{ actor: 'Active Co-op Applicant', cells: ['Arrives focused on co-op without clear first steps', 'Clicks through Hub menus, then searches Google', 'Tailors resume', 'Applies through NUworks', 'Tracks status in a personal spreadsheet'] }],
        stagePains: [0, 1, 2, 3, 4].map(i => [{ text: `Sharpest pain at stage ${i + 1}` }, { text: `Second pain at stage ${i + 1}` }]),
        opportunities: ['Open with a first-year path', 'Answer questions in the Hub', 'Recommend clubs', 'Surface roles', 'Track status'],
        keyInsight: 'Students rebuild the co-op journey from Google, NUworks and personal spreadsheets.',
    },
    gapMatrix: {
        title: 'Status tracking lags furthest behind student needs',
        gaps: [
            { capability: 'Medium gap', currentMaturity: 2, targetMaturity: 3, severity: 'medium', impact: 'm' },
            { capability: 'Critical gap', currentMaturity: 1, targetMaturity: 4, severity: 'critical', impact: 'c' },
            { capability: 'High gap A', currentMaturity: 2, targetMaturity: 4, severity: 'high', impact: 'h' },
            { capability: 'High gap B', currentMaturity: 1, targetMaturity: 5, severity: 'high', impact: 'h' },
            { capability: 'High gap C', currentMaturity: 3, targetMaturity: 4, severity: 'high', impact: 'h' },
            { capability: 'Second medium gap', currentMaturity: 3, targetMaturity: 4, severity: 'medium', impact: 'm2' },
        ],
        insight: 'Every gap sits outside the Student Hub.',
    },
});

describe('rootDeliverableSlides payload budgets', () => {
    const res = applySynthesizedRoots(base, reply);
    const slides = rootDeliverableSlides(res, 'nu');
    const persona = slides.find(s => s.template === 'persona-card');
    const journey = slides.find(s => s.template === 'journey-map');
    const gaps = slides.find(s => s.template === 'gap-matrix');
    const B = SLIDE_BUDGETS;

    it('persona: three pains, three items per list, labels inside budget, overflow in the notes', () => {
        const p = persona.persona;
        expect(p.painPoints).toHaveLength(3);
        expect(p.behaviors).toHaveLength(3);
        for (const pp of p.painPoints) expect(pp.label.length).toBeLessThanOrEqual(Math.round(B.persona.painLabel * 1.15));
        for (const pp of p.painPoints) if (pp.quote) expect(pp.quote.length).toBeLessThanOrEqual(B.persona.painQuote);
        expect(p.jtbd.length).toBeLessThanOrEqual(B.persona.jtbd);
        expect(persona.speakerNotes).toContain('so I can focus effort');
        expect(persona.speakerNotes).toContain('A day in the life');
    });
    it('persona: the defining quote is never repeated as a pain evidence line', () => {
        const p = persona.persona;
        expect(p.quote).toBeTruthy();
        expect(p.painPoints.filter((pp: any) => pp.quote === p.quote)).toHaveLength(0);
    });
    it('PRD inputs keep the full, untrimmed records', () => {
        expect(res.inputs.personas[0].painPoints[0].text).toBe(longLabel);
        expect(res.inputs.personas[0].painPoints).toHaveLength(4);
        expect(res.inputs.journeyPains).toHaveLength(10);
    });
    it('journey: one pain per stage at five stages, the rest in the notes', () => {
        expect(journey.journeyMap.painPoints.every((l: string[]) => l.length === 1)).toBe(true);
        expect(journey.speakerNotes).toContain('Second pain at stage 3');
        expect(journey.journeyMap.personas).toBeUndefined();
    });
    it('gaps: five rows, most severe first', () => {
        expect(gaps.gapMatrix.gaps).toHaveLength(5);
        expect(gaps.gapMatrix.gaps[0].capability).toBe('Critical gap');
        expect(gaps.gapMatrix.gaps.map((g: any) => g.severity)).toEqual(['critical', 'high', 'high', 'high', 'medium']);
        expect(gaps.speakerNotes).toContain('Second medium gap');
    });

    it('stage HTML: every legible text style is >= 24px, notes ride in an inert template, journey renders native', () => {
        const sizeOf = (css: string, sel: string) => {
            const at = css.indexOf(sel + '{');
            const rule = at >= 0 ? css.slice(at, css.indexOf('}', at)) : '';
            return Number((rule.match(/font-size:(\d+)px/) || [])[1]);
        };
        for (const sl of [persona, journey, gaps]) {
            const html = slideDataToStageHtml(sl);
            const css = html.slice(html.lastIndexOf('<style>'), html.lastIndexOf('</style>'));
            if (sl !== journey) {
                // persona + gap: the renderer's own <style> block has no font-size below the 24px floor
                const sizes = Array.from(css.matchAll(/font-size:(\d+(?:\.\d+)?)px/g)).map(m => Number(m[1]));
                expect(sizes.length).toBeGreaterThan(0);
                expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
            } else {
                // journey (legible mode): the cells, pains and opportunities the slide paints are >= 24px
                for (const sel of ['.jmc', '.jmp .pi', '.jmo .oi']) expect(sizeOf(css, sel)).toBeGreaterThanOrEqual(24);
                expect(html).not.toContain('class="jmmeta"');
            }
            expect(html).toContain('<template class="pptx-notes">');
            expect(html).not.toContain(String.fromCharCode(0x2014)); // no em dash
        }
        const jhtml = slideDataToStageHtml({ ...journey, diagramImage: 'data:image/png;base64,AAAA' });
        expect(jhtml).toContain('class="jmgrid"');
        expect(jhtml).not.toContain('data:image/png;base64,AAAA');
    });
});

import { literalize as _literalize, fitText as _fitText } from './prdRootSynthesis';
import { describe as _d, it as _i, expect as _e } from 'vitest';
_d('literalize', () => {
    _i('rewrites banned figurative phrasing to literal language in slide text', () => {
        _e(_fitText('Students carry the load of finding resources across systems', 200)).toBe('Students do the work of finding resources across systems');
        _e(_literalize('Requests fall through the cracks')).toBe('Requests go unnoticed');
    });
});
