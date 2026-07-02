// Guard tests for the 2026-07-02 live app defects (chat transcript: #brief title shipped
// "&mdash;" + a mid-word truncation; #journey cited the Gemini grounding-redirect host and
// empty "[]" brackets as sources). Each test pins the fix at its chokepoint.
import { describe, it, expect } from 'vitest';
import { stripEmDashes, stripProviderBucketCitations, filterSourceList, postProcessSlides } from './slidePostProcessor';

describe('stripEmDashes handles HTML-entity forms (live defect: "&mdash;" in a chat title)', () => {
    it('converts &mdash; entities under the same clause rule as the raw character', () => {
        expect(stripEmDashes('not new risk &mdash; it is mispriced risk')).toBe('not new risk, it is mispriced risk');
        expect(stripEmDashes('Month 1&#8211;3')).toBe('Month 1 to 3');
        expect(stripEmDashes('donor&mdash;centric')).toBe('donor-centric');
    });
    it('never touches ASCII hyphens (standing rule)', () => {
        expect(stripEmDashes('co-op risk-planning 12-month')).toBe('co-op risk-planning 12-month');
    });
});

describe('provider-bucket citation scrub (live defect: [vertexaisearch.cloud.google.com])', () => {
    it('strips redirect-host bracket citations and empty brackets, keeps real ones', () => {
        expect(stripProviderBucketCitations("pushed 'beyond the viability frontier' [vertexaisearch.cloud.google.com]"))
            .toBe("pushed 'beyond the viability frontier'");
        expect(stripProviderBucketCitations("Forced into 'cheapest-coverage spiral' []"))
            .toBe("Forced into 'cheapest-coverage spiral'");
        expect(stripProviderBucketCitations('Generic appeals feel like spam [Reddit r/AlumniGiving]'))
            .toBe('Generic appeals feel like spam [Reddit r/AlumniGiving]');
    });
    it('filters redirect + empty entries from sources/citations arrays', () => {
        expect(filterSourceList(['NXT-Insight', 'vertexaisearch.cloud.google.com', '', 'Client Uploads']))
            .toEqual(['NXT-Insight', 'Client Uploads']);
        expect(filterSourceList([{ sourceName: 'vertexaisearch.cloud.google.com' }, { sourceName: 'EY' }]))
            .toEqual([{ sourceName: 'EY' }]);
    });
    it('postProcessSlides scrubs nested journeyMap payload cells and the sources array', () => {
        const slides: any[] = [{
            slideNumber: 1,
            template: 'journey-map',
            title: 'Macroeconomic strain bifurcates farmer risk-planning behaviors',
            content: [], sources: ['vertexaisearch.cloud.google.com', 'NXT-Insight', ''],
            journeyMap: {
                lanes: [{ actor: 'Grower', cells: ["Relies on crop insurance [vertexaisearch.cloud.google.com]", "Scores risks [Client Uploads]"] }],
                overallPainPoints: ["Inflation forces stripped coverage []"],
            },
        }];
        const r = postProcessSlides(slides as any);
        const s: any = r.slides[0];
        expect(s.sources).toEqual(['NXT-Insight']);
        expect(s.journeyMap.lanes[0].cells[0]).toBe('Relies on crop insurance');
        expect(s.journeyMap.lanes[0].cells[1]).toContain('[Client Uploads]');
        expect(s.journeyMap.overallPainPoints[0]).toBe('Inflation forces stripped coverage');
        expect(r.issues.some(i => i.type === 'citation' && /provider-bucket/.test(i.detail))).toBe(true);
    });
});
