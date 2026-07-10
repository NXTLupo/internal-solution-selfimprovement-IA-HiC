/**
 * nativeTier.e2e.test.ts (WS-4b, plans/slides-strategic-visual-uplift-2026-07-09.md)
 *
 * End-to-end proof of the native visual tier: composes every NEW diagram archetype
 * with realistic payloads, renders each to stage HTML, exports through the LIVE
 * proxy (/api/gold/export-pptx-multi), and asserts the written PPTX honors the
 * no-static contract: slide count exact, native shapes per slide, zero picture-only
 * slides, brand fonts embedded. Requires proxy :5012 (npm run test:e2e lane).
 */

import { describe, it, expect } from 'vitest';
import { composeSlide } from '../slideComposer';

const PAYLOADS: Array<[string, any]> = [
    ['slides:quadrant', {
        kicker: 'MARKET POSITION', title: 'Regional carriers cluster low on service breadth',
        xAxis: 'Service breadth', yAxis: 'Premium flexibility',
        quadrants: [
            { title: 'Full-line leaders', items: ['National reach', 'All perils'] },
            { title: 'Flexible specialists', items: ['Custom terms'] },
            { title: 'Legacy regionals', items: ['Single state', 'Slow quotes'] },
            { title: 'Digital entrants', items: ['Instant bind'] },
        ],
        subjects: [
            { label: 'Acme Mutual', quadrant: 3 }, { label: 'FieldGuard', quadrant: 2 },
            { label: 'CropSecure', quadrant: 1 }, { label: 'AgriDirect', quadrant: 4 },
        ],
        sourceLine: 'Sources: state filings; carrier rate cards',
    }],
    ['slides:flow-arc', {
        kicker: 'THE QUOTE PATH', title: 'Four steps take a grower from risk check to bound coverage',
        steps: [
            { title: 'Check county risk', description: 'Grower enters acreage and county; hazard scores return.' },
            { title: 'Match coverage', description: 'The engine maps scores to eligible policy forms.' },
            { title: 'Price the term', description: 'Carrier rate cards price the selected form live.' },
            { title: 'Bind online', description: 'E-signature binds coverage the same session.' },
        ],
        outcome: 'Coverage bound in one sitting',
        sourceLine: 'Source: product walkthrough, March cohort',
    }],
    ['slides:milestone-timeline', {
        kicker: 'SEASON DEADLINES', title: 'Three filing dates govern the spring coverage window',
        milestones: [
            { date: 'Jan 15', title: 'Census locked', detail: 'Acreage census closes for the season' },
            { date: 'Feb 28', title: 'Rates filed', detail: 'Carriers file county rates' },
            { date: 'Apr 1', title: 'Open enrollment', detail: 'Growers can bind spring terms' },
        ],
        sourceLine: 'Source: state insurance calendar',
    }],
    ['slides:means-matters', {
        kicker: 'NATURAL THREATS', title: 'Drought now drives the largest share of claimed losses',
        stats: [
            { figure: '$3.8T', caption: 'agricultural losses over three decades', means: 'More than half the world is affected by drought.', matters: 'Storm and drought scores now decide serving costs.' },
            { figure: '>50%', caption: 'drought probability in highest-risk regions', means: 'The satellite record concentrates severe drought in vulnerable regions.', matters: 'A once-a-year score cannot keep pace with in-season shifts.' },
        ],
        sourceLine: 'Sources: UNDP; FAO El Nino analysis',
    }],
    ['slides:ranked-bars', {
        kicker: 'LOSS DRIVERS', title: 'Weather perils outrank every operational risk class',
        bars: [
            { label: 'Drought', value: 100, note: 'largest claimed share' },
            { label: 'Flood', value: 72, note: 'concentrated in river counties' },
            { label: 'Equipment', value: 38, note: 'stable year over year' },
            { label: 'Personnel', value: 21, note: 'smallest claimed share' },
        ],
        sourceLine: 'Source: carrier claims mix, three seasons',
    }],
    ['slides:comparison-panels', {
        kicker: 'COVERAGE OPTIONS', title: 'The parametric form wins on speed and loses on breadth',
        criteria: ['CLAIM PROCESS', 'PERILS COVERED', 'PAYOUT SPEED'],
        panels: [
            { name: 'Indemnity', cells: ['Adjuster visit required', 'All perils covered', 'Weeks to payout'] },
            { name: 'Parametric', cells: ['Trigger pays automatically', 'Named perils only', 'Days to payout'] },
        ],
        sourceLine: 'Source: policy form comparison',
    }],
];

function stageWrap(inner: string): string {
    return `<html><head><meta charset="utf-8"></head><body><div id="stage" style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff">${inner}</div></body></html>`;
}

describe('native visual tier E2E (live proxy)', () => {
    it('exports all six new archetypes as native shapes with exact slide count', async () => {
        const htmls: string[] = [];
        for (const [arch, payload] of PAYLOADS) {
            const inner = composeSlide(arch.replace(/^slides:/, ''), payload, 'nxt');
            expect(inner, `${arch} must compose`).toBeTruthy();
            htmls.push(stageWrap(inner as string));
        }
        const resp = await fetch('http://127.0.0.1:5012/api/gold/export-pptx-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slides: htmls, filename: 'native_tier_e2e.pptx' }),
        });
        expect(resp.ok, `export must succeed (${resp.status})`).toBe(true);
        const buf = Buffer.from(await resp.arrayBuffer());
        expect(resp.headers.get('x-slide-count')).toBe(String(PAYLOADS.length));

        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(buf);
        const slideNames = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n));
        expect(slideNames.length).toBe(PAYLOADS.length);
        for (const n of slideNames.sort()) {
            const xml = await zip.file(n)!.async('string');
            const shapes = (xml.match(/<p:sp>/g) || []).length;
            const runs = (xml.match(/<a:r>/g) || []).length;
            const pics = (xml.match(/<p:pic>/g) || []).length;
            expect(shapes, `${n} native shapes`).toBeGreaterThanOrEqual(6);
            expect(runs, `${n} text runs`).toBeGreaterThanOrEqual(8);
            expect(pics, `${n} must not be picture-bodied (diagrams are native now)`).toBeLessThanOrEqual(1); // <=1 = the chrome logo
        }
        const allXml = (await Promise.all(slideNames.map(n => zip.file(n)!.async('string')))).join(' ');
        for (const sentinel of ['FieldGuard', 'Bind online', 'Census locked', '$3.8T', 'MATTERS', 'Drought', 'Parametric']) {
            expect(allXml, `body sentinel "${sentinel}" must render as native text`).toContain(sentinel);
        }
        const fonts = Object.keys(zip.files).filter(n => n.startsWith('ppt/fonts/'));
        expect(fonts.length, 'brand fonts embedded').toBeGreaterThan(0);
    }, 240_000);
});
