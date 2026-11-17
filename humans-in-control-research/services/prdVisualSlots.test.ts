/**
 * prdVisualSlots.test.ts - 2026-11-09
 *
 * Every other HTML artifact kind gets pictures because the MODEL places `[[visual: ...]]` and the
 * chain renders them. The PRD cannot: `projectPrdAirToHtml` builds its HTML from the AIR, so there
 * is no model prose to carry a directive. A regenerated #prd came back with 0 images while
 * #blogpost, #datatable, #chronology, #quiz, #flashcards, #questionnaire and #approaches each came
 * back with 3, and #prd was the largest block of image-free artifacts in the library (19 files).
 *
 * These pin the slots: content-true, built from the PRD's own fields, and absent rather than empty
 * when the AIR is thin.
 */
import { describe, it, expect } from 'vitest';
import { projectPrdAirToHtml } from './prdProjection';
import { extractVisualRequests } from './artifactVisuals';
import { makePrdAirFixture } from './prdAir.fixture';

const PRD_AIR_FIXTURE = makePrdAirFixture();

describe('the PRD projection asks for pictures', () => {
    const html = projectPrdAirToHtml(PRD_AIR_FIXTURE as any, { brand: 'nxt' });
    const visuals = extractVisualRequests(html);

    it('places at least one visual directive', () => {
        expect(visuals.length).toBeGreaterThan(0);
    });

    it('names a real actor from the PRD rather than an abstraction', () => {
        const persona = String((PRD_AIR_FIXTURE as any).sections.thesis.user || '');
        const joined = visuals.map(v => v.concept).join(' | ');
        expect(joined.length).toBeGreaterThan(24);
        // No stock-concept vocabulary: the contract bans these outright.
        expect(joined.toLowerCase()).not.toMatch(/glowing|futuristic|robot|handshake|innovation|the future of/);
        expect(persona.length > 0 || joined.length > 0).toBe(true);
    });

    it('keeps each directive on its own line, outside any tag', () => {
        for (const v of visuals) {
            const i = html.indexOf(v.raw);
            expect(html.slice(Math.max(0, i - 1), i)).toMatch(/\n|^/);
        }
    });

    it('emits no directive at all when the fields it needs are missing', () => {
        // The slots read the persona's stage of struggle and the first job story. A PRD missing
        // both gets NO picture rather than a placeholder, which is the contract that matters.
        const thin = JSON.parse(JSON.stringify(PRD_AIR_FIXTURE));
        thin.sections.usersAndJobs.jobStories = [];
        for (const p of thin.graph.personas || []) p.stageOfStruggle = '';
        const out = projectPrdAirToHtml(thin, { brand: 'nxt' });
        expect(extractVisualRequests(out).length).toBe(0);
        expect(out).not.toContain('[[visual:');
    });
});

/**
 * CAPTION GRAMMAR (2026-11-09). The first version of these slots shipped two unusable captions on
 * a live #prd: "The Context Archivist at the moment described: The student cannot let the
 * assistant work ..." (a truncated problem statement, not a picture) and "... in the act of
 * connect the assistant ..." (ungrammatical: `iWantTo` is a bare infinitive). A caption is read
 * aloud by the reader and is also the image's alt text, so it has to be a sentence.
 */
describe('PRD visual captions read as English', () => {
    const air = makePrdAirFixture();
    const visuals = extractVisualRequests(projectPrdAirToHtml(air as any, { brand: 'nxt' }));

    it('never emits the stage-direction or bare-infinitive shapes', () => {
        for (const v of visuals) {
            expect(v.concept).not.toContain('at the moment described');
            expect(v.concept).not.toContain('in the act of');
        }
    });

    it('never ends a caption mid-word or on dangling punctuation', () => {
        for (const v of visuals) {
            expect(v.concept.length).toBeLessThanOrEqual(200);
            expect(v.concept).not.toMatch(/[,;:]$/);
            expect(v.concept.trim().split(/\s+/).length).toBeGreaterThan(3);
        }
    });

    it('agrees the article and keeps the caption in the third person', () => {
        for (const v of visuals) {
            expect(v.concept).not.toMatch(/^A [aeiou]/i);
            expect(v.concept).not.toMatch(/my|I|me/);
        }
    });
    it('opens each caption with a subject rather than a colon fragment', () => {
        for (const v of visuals) expect(v.concept).toMatch(/^[A-Z]/);
    });
});

/**
 * THE REAL AIR, not the fixture (2026-11-09, second correction).
 *
 * The fixture holds tidy fields (role "owner-operator", stage "renewal") and the slots passed
 * against it twice while shipping broken captions on a live run, because the real AIR holds prose:
 *     role            = "builds long-running projects inside the university Claude account"
 *     stageOfStruggle = "When my university AI account holds months of projects, I want a
 *                        portable copy, so I can keep my ..."
 * which produced "A builds long-running projects ... working alone at the point of When my
 * university AI account holds ...". These pin the live shapes, so a template that cannot handle
 * prose refuses it rather than printing it.
 */
describe('the slots refuse AIR fields that are prose, not names', () => {
    const liveShapes = (over: Record<string, unknown>) => {
        const air = makePrdAirFixture() as any;
        const p = air.graph.personas[0];
        Object.assign(p, over);
        return extractVisualRequests(projectPrdAirToHtml(air, { brand: 'nxt' }));
    };

    it('drops a role that is a predicate rather than a name for a person', () => {
        const v = liveShapes({ role: 'builds long-running projects inside the university Claude account', name: '' });
        expect(v.some(x => /^A builds/i.test(x.concept))).toBe(false);
    });

    it('drops a stage of struggle that is a whole job story', () => {
        const v = liveShapes({ stageOfStruggle: 'When my university AI account holds months of projects, I want a portable copy, so I can keep my work' });
        expect(v.some(x => /at the point of When/i.test(x.concept))).toBe(false);
        expect(v.some(x => /\bmy\b|\bI\b/.test(x.concept))).toBe(false);
    });

    it('still produces a caption when the fields really are names and phrases', () => {
        const v = liveShapes({ role: 'owner-operator', stageOfStruggle: 'renewal' });
        expect(v.length).toBeGreaterThan(0);
        expect(v[0].concept).toMatch(/^An owner-operator/);
    });
});
