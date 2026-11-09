/** 2026-10-26 (third verification round): the reformat's best-match picture and replacement rules, header scenes that
 *  are not generated when they will not show, and source names from raw filenames and date stamps. */
import { describe, it, expect } from 'vitest';
import { parseSourceDeck, pictureAssignments, mergeParityFences } from './sourceParity';
import { wouldShowHeaderScene, tidyInlineSources } from './slideComposer';

const SRC = parseSourceDeck(`[Slide 1]
Portfolio thesis
We enter through a high-value workflow, prove the operating model, then expand.
1
[Slide 2]
The continuity story is a portfolio, not a promise
Northeastern carries the largest outlook; Benefits Cortex, Estee Lauder and Canon CFS follow.
2
[Slide 3]
Northeastern
Co-op readiness becomes a student-service operating model across fourteen Chancellor offices.
3`, 'x.pptx');

describe('live round 10', () => {
    it('a source picture goes to the slide that carries its source slide best, not the first slide that maps to it', () => {
        const outputs = [
            'We enter through a high-value workflow and prove the operating model before we expand; the continuity story spans Northeastern and Benefits Cortex.',
            'The continuity story is a portfolio, not a promise: Northeastern carries the largest outlook; Benefits Cortex, Estee Lauder and Canon CFS follow.',
        ];
        const a = pictureAssignments(SRC, outputs);
        expect(a.get(1)).toBe(1);   // the bridge slide gets the bridge picture
        expect(a.get(0)).toBe(0);
    });

    it('a repair fence replaces the slide that carries its source best (the agenda is never replaced by an account slide)', () => {
        const agenda = ':::slide template=slides:agenda brand=nxt\n{"title":"Agenda","groups":[{"label":"Accounts","items":["Northeastern co-op readiness","Benefits Cortex"]}]}\n:::';
        const ne = ':::slide template=slides:brief-card brand=nxt\n{"title":"Northeastern","subtitle":"Co-op readiness becomes a student-service operating model across fourteen Chancellor offices."}\n:::';
        const fix = ':::slide template=slides:brief-card brand=nxt\n{"title":"Northeastern moves co-op readiness into one operating model","subtitle":"Co-op readiness becomes a student-service operating model across fourteen Chancellor offices, with $276K contracted."}\n:::';
        const m = mergeParityFences(`${agenda}\n\n${ne}\n`, fix, SRC);
        expect(m.replaced).toBe(1);
        expect(m.text).toContain('"title":"Agenda"');
        expect(m.text).toContain('$276K contracted');
        expect(m.text.match(/:::slide/g)?.length).toBe(2);
    });

    it('a header scene is not generated beside a long title on a generated slide; a reformat keeps it', () => {
        expect(wouldShowHeaderScene('slides:flow-arc', { title: 'A four-step path readies first-year students for their first advisor meeting' })).toBe(false);
        expect(wouldShowHeaderScene('slides:flow-arc', { title: 'Four steps ready a first-year student' })).toBe(true);
        expect(wouldShowHeaderScene('slides:flow-arc', { title: 'A four-step path readies first-year students for their first advisor meeting', _provided: true })).toBe(true);
        expect(wouldShowHeaderScene('slides:cover', { title: 'x'.repeat(90) })).toBe(true);   // not a header-scene archetype
    });

    it('source names drop underscores, copy suffixes and date stamps', () => {
        const t = tidyInlineSources({ title: 'x', sourceLine: 'Sources: Northeastern_CoOp_CLR_Executive_Summary_Copy; Experiential Learning 1 Meeting Summary - 09302026 (Oct 2026)' });
        expect(t.sourceLine).not.toMatch(/_|09302026|Copy\b/);
        expect(t.sourceLine).toContain('Northeastern CoOp CLR Executive Summary');
    });
});

import { compositeIcon, isContentTrueIcon } from './iconLibrary';
describe('live round 11 (2026-10-26 hook audit)', () => {
    it('audience and role names resolve to content-true role glyphs; ambiguous "learning" / "guided" never draw the ML glyph', () => {
        const base = (c: string) => (compositeIcon({ concept: c, brand: 'nxt', ground: 'light', role: 'accent', size: 96 } as any) as any);
        expect(base('Students').baseId).toBe('higher-ed:cap');
        expect(base('Co-op advisors').baseId).toBe('workforce:badge');
        expect(base('Employers').baseId).toBe('workforce:org');
        expect(base('Experiential Learning staff').baseId).toBe('workforce:badge');
        for (const c of ['Students', 'Co-op advisors', 'Employers']) expect(isContentTrueIcon(base(c).resolvedBy)).toBe(true);
        expect(base('One guided hub').baseId).not.toBe('supervised');
    });
    it('one source under two spellings is named once', () => {
        const t = tidyInlineSources({ title: 'x', sourceLine: 'Sources: Northeastern CoOp CLR Executive Summary; Northeastern Co-op and CLR executive summary; EdSurge' });
        expect(t.sourceLine.split(';').length).toBe(2);
    });
});

import { composeSlide } from './slideComposer';
import { resolveArtifactIcons } from './artifactIconResolver';
import { withImageCarriers, mergeRuntimeImagery } from './slideRuntimeCarriers';
import { copyRewriteVerdict, splitPointers } from './copyCritic';
describe('live round 12 (2026-10-26 corpus run out34)', () => {
    it('a statement of work and its SOW slug are one source; the readable name stays; connector tags and descriptor fragments go', () => {
        const t = tidyInlineSources({ title: 'x', sourceLine: 'Sources: Student AI Companion statement of work; SOW014 NXT Humans NU Student AI Companion EL Foundation; Data Integration Support statement of work; SOW015 NXT Humans NU EL Data Integration Support; and online forums; EdSurge (RSS) (Aug 2026)' });
        expect(t.sourceLine).toBe('Sources: Student AI Companion statement of work; Data Integration Support statement of work; EdSurge (Aug 2026)');
        const slugFirst = tidyInlineSources({ title: 'x', sourceLine: 'Sources: SOW014 NXT Humans NU Student AI Companion EL Foundation; Student AI Companion statement of work' });
        expect(slugFirst.sourceLine).toBe('Source: Student AI Companion statement of work');
        expect(tidyInlineSources({ title: 'x', sourceLine: 'Sources: webflow blog; OpenAI Blog' }).sourceLine).toContain('Webflow Blog');
    });
    it('a card source keeps the named source over a lowercase descriptor beside it', () => {
        const t = tidyInlineSources({ title: 'x', corroborating: [{ figure: 'On-the-job', label: 'Fewer entry-level roles', source: 'industry analysis; EdSurge (RSS) (Aug 2026)' }] });
        expect(t.corroborating[0].source).toBe('EdSurge (Aug 2026)');
    });
    it('the footer does not repeat a source the quote attribution already names', () => {
        const html = composeSlide('block-quote', { topicKicker: 'CO-OP SUCCESS', title: 'Co-op success depends on student preparation and employer engagement', quote: 'There are only two major problems.', attributionName: 'Northeastern_CoOp_CLR_Executive_Summary', attributionRole: 'Stakeholder interview', corroborating: [{ figure: 'Prepare', label: 'Staff prepare; employers decide hiring', source: 'Experiential Learning 1 Meeting Summary (Oct 2026)' }], sourceLine: 'Source: Northeastern CoOp CLR Executive Summary' }, 'nxt' as any)!;
        expect(html).not.toMatch(/Sources?: Northeastern CoOp/);
        expect(html).toContain('Northeastern CoOp CLR Executive Summary');
    });
    it('a generic attribution takes the named source the quote cites', () => {
        const t = tidyInlineSources({ title: 'x', quote: 'The first co-op advisor conversation should not be the first time a student thinks about this. (Source: Client document: Northeastern CoOp CLR Executive Summary Copy)', attributionName: 'Internal Meeting Record', attributionRole: 'Program Discussion Note' });
        expect(t.attributionName).toBe('Northeastern CoOp CLR Executive Summary');
        expect(t.attributionRole).toBe('');
        const named = tidyInlineSources({ title: 'x', quote: 'q (Source: EdSurge)', attributionName: 'Lorraine, co-op advisor', attributionRole: 'Northeastern' });
        expect(named.attributionName).toBe('Lorraine, co-op advisor');
    });
    it('single-quoted spans glued to their neighbours get their spaces back and render as typographic pairs', () => {
        const t = tidyInlineSources({ title: 'x', label: "Chris names two causes and only two:'we need better student preparation'and'we need deeper engagement with partners.'", sourceLine: '' });
        expect(t.label).toBe('Chris names two causes and only two: ‘we need better student preparation’ and ‘we need deeper engagement with partners.’');
        const ok = tidyInlineSources({ title: 'x', label: "Students don't wait; the hub's path is 'one ordered list' for everyone.", sourceLine: '' });
        expect(ok.label).toBe('Students don’t wait; the hub’s path is ‘one ordered list’ for everyone.');
    });
    it('quotes render as typographic pairs and a colon before a quote takes a space', () => {
        const t = tidyInlineSources({ title: 'x', body: 'An r/edtech practitioner put it this way:"Most students aren’t proactively seeking resources".', sourceLine: '' });
        expect(t.body).toBe('An r/edtech practitioner put it this way: “Most students aren’t proactively seeking resources”.');
    });
    it('an Evidence column of source kinds is relabeled; a column of quotes keeps the label', () => {
        const rows = [{ subject: 'Careers website', prove: 'Houses co-op content', implication: 'Two answer sources', evidenceGrade: 'Client meeting' }, { subject: 'NUworks', prove: 'Job portal', implication: 'No ordered path', evidenceGrade: 'Client meeting' }];
        const html = composeSlide('evidence-table', { kicker: 'K', title: 'Scattered platforms leave first-years without one path', intro: 'x', columns: ['Surface', 'What it holds', 'Gap', 'Evidence'], rows, takeaway: { label: 'PEER PATTERN', statement: 'x' } }, 'nxt' as any)!;
        expect(html).toMatch(/>SOURCE TYPE</i);
        expect(html).not.toMatch(/>EVIDENCE</i);
    });
    it('org-model columns get a role glyph on every card, and the glyph row survives the merge onto the live slide', () => {
        const p: any = { columns: [{ name: 'Students' }, { name: 'Advisors and staff' }, { name: 'Employers' }] };
        expect(resolveArtifactIcons('slides:org-model', p, 'nxt', 'light', 'higher-ed')).toBe(3);
        const live: any = { id: 's', composerPayload: { title: 'edited title', columns: p.columns } };
        const merged: any = withImageCarriers(live, 'composerPayload', p);
        expect(merged.composerPayload.columnIcons.filter(Boolean).length).toBe(3);
        expect(merged.composerPayload.title).toBe('edited title');
        const replaced: any = mergeRuntimeImagery(merged, { id: 's', composerPayload: { title: 'repaired' } } as any);
        expect(replaced.composerPayload.columnIcons.filter(Boolean).length).toBe(3);
    });
    it('a half-resolved org-model row draws no icons', () => {
        const p: any = { columns: [{ name: 'Students' }, { name: 'Xqzzy Plover Zzz' }, { name: 'Employers' }] };
        expect(resolveArtifactIcons('slides:org-model', p, 'nxt', 'light')).toBe(0);
        expect((p.columnIcons || []).filter(Boolean).length).toBe(0);
    });
    it('the copy guard ignores chunk-pointer digits, and a headline may hand a name to its slide', () => {
        expect(splitPointers('Advisors report a growing readiness gap [wiki/x/abc.md#c16802]')).toEqual({ text: 'Advisors report a growing readiness gap', pointers: ['[wiki/x/abc.md#c16802]'] });
        expect(copyRewriteVerdict('Northeastern integrates career readiness tools inside Student Hub', 'Leadership puts the readiness tools into one guided path', 'title', 'Student Hub integrates existing readiness tools for Northeastern students').text).toBeTruthy();
        expect(copyRewriteVerdict('Hub flags next steps and builds Preparation Summary', 'Hub flags steps, builds summary', 'nodes[2].label', '').text).toBeNull();
    });
});
