import { describe, it, expect } from 'vitest';
import {
    parsePresentationDirective,
    parsePrototypeDirective,
    parseHtmlArtifactDirective,
    parseRefineDirective,
    parseHelpDirective,
    parseArtifactsLibraryDirective,
    hasModifier,
    brandVariantOf,
    HTML_ARTIFACT_PARSERS,
} from './hashtagParser';

const parserFor = (gen: string) => HTML_ARTIFACT_PARSERS.find(p => p.generator === gen)!.parser;
const parseBriefDirective = parserFor('#brief');
const parseReportDirective = parserFor('#report');
const parseWhitepaperDirective = parserFor('#whitepaper');
const parseQuestionnaireDirective = parserFor('#questionnaire');

describe('hashtagParser (catalog-generated regexes)', () => {
    it('#presentation triggers only as a whole tag and strips every modifier from the narrative request', () => {
        expect(parsePresentationDirective('#presentationally speaking').triggered).toBe(false);
        const d = parsePresentationDirective('#presentation Co-op readiness #NU #dense #hero="Readiness first" #sections=themes,recs #export-pptx');
        expect(d.triggered).toBe(true);
        expect(d.brand).toBe('NU');
        expect(d.heroOverride).toBe('Readiness first');
        expect(d.sectionFilter).toEqual(['themes', 'recommendations']);
        expect(d.alsoExportPptx).toBe(true);
        expect(d.narrativeRequest).toBe('Co-op readiness');
    });

    it('#proto never collides with #prototypes', () => {
        expect(parsePrototypeDirective('#prototypes').triggered).toBe(false);
        const d = parsePrototypeDirective('#proto first-year coach #NU');
        expect(d.triggered).toBe(true);
        expect(d.brand).toBe('NU');
        expect(d.concept).toBe('first-year coach');
    });

    it('HTML generators match whole tags: #report is not #reporting, #brief is not #brief-dialog, #whitepaper is its own generator', () => {
        expect(parseReportDirective('#reporting on x').triggered).toBe(false);
        expect(parseBriefDirective('#brief-dialog on x').triggered).toBe(false);
        expect(parseReportDirective('#whitepaper on x').triggered).toBe(false);
        expect(parseWhitepaperDirective('#whitepaper on x').triggered).toBe(true);
        expect(parseWhitepaperDirective('#report on x').triggered).toBe(false);
        const r = parseReportDirective('#reports on retention #NU --variants 3');
        expect(r.triggered).toBe(true);
        expect(r.topic).toBe('on retention');
        expect(r.brand).toBe('NU');
        expect(r.variants).toBe(3);
    });

    it('#questionnaire now has a dispatcher through the generated HTML parser list', () => {
        expect(parseQuestionnaireDirective('#questionnaire for the registrar').triggered).toBe(true);
        const hit = parseHtmlArtifactDirective('#questions for the registrar');
        expect(hit?.directive.generator).toBe('#questionnaire');
        expect(HTML_ARTIFACT_PARSERS.map(p => p.generator)).toEqual(
            expect.arrayContaining(['#brief', '#explainer', '#report', '#whitepaper', '#playground', '#approaches', '#questionnaire']),
        );
    });

    it('#refine parses slug and instruction; #help and #artifacts are whole-tag', () => {
        const r = parseRefineDirective('#refine clr-skills-gap: add a peer comparison');
        expect(r).toEqual({ triggered: true, slug: 'clr-skills-gap', instruction: 'add a peer comparison' });
        expect(parseHelpDirective('#helpful tips').triggered).toBe(false);
        expect(parseHelpDirective('#help').triggered).toBe(true);
        expect(parseArtifactsLibraryDirective('#artifacts').triggered).toBe(true);
        expect(parseArtifactsLibraryDirective('#artifact').triggered).toBe(false);
    });

    it('hasModifier reads the catalog modifier table', () => {
        expect(hasModifier('#gap #slides', '#slides')).toBe(true);
        expect(hasModifier('#gap #slide', '#slides')).toBe(false);
        expect(hasModifier('#gap #slideshow', '#slide')).toBe(false);
        expect(hasModifier('#gap #NU', '#NU')).toBe(true);
        expect(hasModifier('#gap', '#gap')).toBe(false); // a directive is not a modifier
    });
});

// 2026-10-01 - THIRD brand mode. `#deciem` is a modifier on ANY deliverable hashtag and resolves
// through the ONE brand resolver (brandVariantOf), exactly like #NXT / #NU.
describe('brand hashtags: NXT / NU / DECIEM resolve through brandVariantOf', () => {
    it('brandVariantOf returns NXT by default, NU for #NU, DECIEM for #deciem (any case, possessive-tolerant)', () => {
        expect(brandVariantOf('#slides on the corpus')).toBe('NXT');
        expect(brandVariantOf('#slides #NXT on the corpus')).toBe('NXT');
        expect(brandVariantOf('#slides #NU on the corpus')).toBe('NU');
        expect(brandVariantOf("#slides #NU's deck")).toBe('NU');
        expect(brandVariantOf('#slides #deciem on the corpus')).toBe('DECIEM');
        expect(brandVariantOf('#personas #DECIEM')).toBe('DECIEM');
        expect(brandVariantOf("#slides #DECIEM's deck")).toBe('DECIEM');
        expect(brandVariantOf('#slides #DECIEMs deck')).toBe('DECIEM');
        // mid-word never matches
        expect(brandVariantOf('#slides #deciemish')).toBe('NXT');
        expect(brandVariantOf('#slides #NUmber')).toBe('NXT');
    });

    it('#presentation #deciem composes the DECIEM brand', () => {
        const d = parsePresentationDirective('#presentation Skincare routine adoption #deciem');
        expect(d.triggered).toBe(true);
        expect(d.brand).toBe('DECIEM');
    });

    it('#proto #deciem builds the DECIEM brand', () => {
        const p = parsePrototypeDirective('#proto (routine builder) #deciem');
        expect(p.triggered).toBe(true);
        expect(p.brand).toBe('DECIEM');
    });

    it('#report #deciem and #brief #deciem carry the DECIEM brand into the HTML artifact directive', () => {
        const r = parseReportDirective('#report ingredient transparency #deciem');
        expect(r.triggered).toBe(true);
        expect(r.brand).toBe('DECIEM');
        const b = parseBriefDirective('#brief ingredient transparency #DECIEM');
        expect(b.triggered).toBe(true);
        expect(b.brand).toBe('DECIEM');
        const h = parseHtmlArtifactDirective('#report ingredient transparency #deciem');
        expect(h.directive.triggered).toBe(true);
        expect(h.directive.brand).toBe('DECIEM');
    });

    it("#slides #DECIEM's (possessive) still resolves DECIEM", () => {
        expect(brandVariantOf("#slides #DECIEM's launch deck")).toBe('DECIEM');
    });

    it('#NU keeps working next to #deciem being available', () => {
        expect(parsePresentationDirective('#presentation Co-op readiness #NU').brand).toBe('NU');
        expect(parsePrototypeDirective('#proto (coach) #NU').brand).toBe('NU');
        expect(parseReportDirective('#report advancement #NU').brand).toBe('NU');
        expect(parsePresentationDirective('#presentation Co-op readiness').brand).toBe('NXT');
    });
});
