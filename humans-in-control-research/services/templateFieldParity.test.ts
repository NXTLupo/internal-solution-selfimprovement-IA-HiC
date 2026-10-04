// E10 (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, Stage 2.5; vision phase 9).
// scripts/check-template-parity.mjs used to compare SlideCanvas.tsx to the LEGACY pptx.ts by
// case-name only. It now diffs the FIELD sets the two real twins (web.tsx preview vs
// slideToStageHtml.ts export) read from each template's types.ts contract. This suite runs the
// same comparison logic in vitest: the detection logic is pinned on synthetic inputs modelled on
// the audited drift (so the pins survive the web owner fixing web.tsx), and the repo-level check
// asserts the templates fixed on the stage side carry no preview-renders-export-drops gap.
import { describe, it, expect } from 'vitest';
import {
    computeTemplateFieldParity,
    diffTwinFields,
    parseFieldTree,
    flattenFieldNames,
    dispatchChromeBlocks,
} from '../scripts/check-template-parity.mjs';

const CONTRACT = `
    features: Array<{
        name: string;
        priority: 'must' | 'should' | 'could' | 'wont';
        storyId?: string;
        evidence?: Array<{ text: string; source: string; attribution?: string }>;
    }>;
    goals?: { lifeGoal?: string; experienceGoal?: string };
    insight?: string;
    impact?: string;
`;

describe('field-contract parsing', () => {
    it('parses nested Array<{...}> and inline object members into a field tree', () => {
        const tree: any[] = parseFieldTree(CONTRACT);
        expect(tree.map(f => f.name)).toEqual(['features', 'goals', 'insight', 'impact']);
        const names = flattenFieldNames(tree);
        for (const n of ['name', 'priority', 'storyId', 'evidence', 'text', 'source', 'attribution', 'lifeGoal', 'experienceGoal']) {
            expect(names.has(n)).toBe(true);
        }
    });
});

describe('twin field diff (synthetic, modelled on the audited drift)', () => {
    const tree: any[] = parseFieldTree(CONTRACT);

    it('reports a field the preview renders and the export drops, and the reverse', () => {
        const web = `const f = data.features[0]; return <div>{f.name}{f.evidence.map(e => e.text)}{data.insight}</div>;`;
        const stage = `const f = slide.prdFeature.features[0]; return esc(f.name) + esc(f.storyId) + esc(g.impact);`;
        const d = diffTwinFields(tree, web, stage);
        expect(d.webOnly).toEqual(expect.arrayContaining(['evidence', 'text', 'insight']));
        expect(d.stageOnly).toEqual(expect.arrayContaining(['storyId', 'impact']));
        expect(d.both).toEqual(expect.arrayContaining(['features', 'name']));
        expect(d.webOnly).not.toContain('name');
        expect(d.stageOnly).not.toContain('name');
    });

    it('credits every child of a parent handed to Object.entries, and optional-chain / bracket reads', () => {
        const web = `{Object.entries(p.goals).map(([k, v]) => <dd>{v}</dd>)} {data?.insight} {data['impact']}`;
        const stage = `const goals = p.goals || {}; esc(goals.lifeGoal) + esc(goals.experienceGoal) + esc(gm.insight) + esc(g.impact)`;
        const d = diffTwinFields(tree, web, stage);
        expect(d.webOnly).toEqual([]);
        expect(d.stageOnly).toEqual([]);
        expect(d.both).toEqual(expect.arrayContaining(['lifeGoal', 'experienceGoal', 'insight', 'impact']));
    });

    it('does not mistake a CSS class selector for a payload read', () => {
        const web = `<div>{data.insight}</div>`;
        const stage = `<style>.insight{color:red} .impact span{}</style>`;
        const d = diffTwinFields(tree, web, stage);
        expect(d.webOnly).toEqual(['insight']);
        expect(d.stageOnly).toEqual([]);
    });

    it('collects the per-template chrome blocks from the dispatch body', () => {
        const dispatch = `
    if (template === 'case-study') {
        const c = slide.caseStudy || {};
        if (c.subject) kicker = \`Case study · \${c.subject}\`;
    }
    if (template === 'theme-arc' || template === 'theme-mosaic') { shellSources = t.source; }
    if (template === 'gap-matrix') { takeaway = g.insight; }`;
        expect(dispatchChromeBlocks(dispatch, 'case-study')).toContain('c.subject');
        expect(dispatchChromeBlocks(dispatch, 'case-study')).not.toContain('g.insight');
        expect(dispatchChromeBlocks(dispatch, 'theme-mosaic')).toContain('t.source');
        expect(dispatchChromeBlocks(dispatch, 'stat-row')).toBe('');
    });
});

describe('repo twins: templates fixed on the stage side carry no preview-renders-export-drops gap', () => {
    const report: any = computeTemplateFieldParity();
    const byTemplate = (t: string) => report.results.find((r: any) => r.template === t);

    it('resolves a types.ts contract and both renderers for every fixed template', () => {
        for (const t of ['prd-feature', 'gap-matrix', 'persona-card', 'recommendation']) {
            const r = byTemplate(t);
            expect(r, t).toBeTruthy();
            expect(r.status, t).toBe('ok');
            expect(r.component, t).toBeTruthy();
            expect(r.stageFn, t).toBeTruthy();
        }
    });

    it.each(['prd-feature', 'gap-matrix', 'persona-card', 'recommendation'])('%s: the export twin renders every field the preview renders', (t) => {
        const r = byTemplate(t);
        expect(r.webOnly).toEqual([]);
    });

    it('the stage twin renders the fields the audit found missing (evidence, insight, motivations, framingTag, personaContext, whyMatters)', () => {
        expect(byTemplate('prd-feature').both).toContain('evidence');
        expect(byTemplate('gap-matrix').both).toContain('insight');
        expect(byTemplate('persona-card').both).toContain('motivations');
        for (const f of ['framingTag', 'personaContext', 'whyMatters', 'heroImage', 'impactStrip']) {
            expect(byTemplate('recommendation').both, f).toContain(f);
        }
    });
});
