// #prd depth uplift guard tests (goal 2026-07-02: user stories + requirements in TABLES that
// export perfectly to PPTX). Pins: the FR/NFR/OOS requirements ledger branch, the deep-card
// storyId/successMetric/traces fields, and the protocol's Given/When/Then depth contract.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { slideDataToStageHtml } from './slideToStageHtml';

const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('#prd requirements ledger (stage twin)', () => {
    const slide: any = {
        slideNumber: 1,
        template: 'prd-feature',
        title: 'The requirements draw a hard line between the answer surface and the queue',
        brand: 'nxt',
        prdFeature: {
            requirements: {
                functional: [
                    { id: 'FR-1', text: 'Surface the matching help article inside the error state, before the contact form renders.' },
                    { id: 'FR-2', text: 'Route tickets by detected intent; the category dropdown becomes a confirmation, not a guess.' },
                ],
                nonFunctional: [
                    { id: 'NFR-1', text: 'Article suggestions render within the error state itself; no separate page load.' },
                ],
                outOfScope: [
                    { id: 'OOS-1', text: 'Replacing the ticketing system itself; we integrate, not migrate.' },
                ],
            },
        },
    };
    it('renders the three-column FR/NFR/OOS ledger with mono ID cells', () => {
        const html = slideDataToStageHtml(slide);
        expect(html).toContain('FR-1');
        expect(html).toContain('NFR-1');
        expect(html).toContain('OOS-1');
        expect(html).toContain('Functional');
        expect(html).toContain('Non-functional');
        expect(html).toContain('Out of scope');
        expect(html).toContain('the category dropdown becomes a confirmation');
        // hugging rows, not fixed-height wells: grid auto-content, hairline row separators
        expect(html).toContain('align-content:start');
    });
});

describe('#prd deep card carries storyId / successMetric / traces', () => {
    const slide: any = {
        slideNumber: 2,
        template: 'prd-feature',
        title: 'US-1 makes the profile the single reference surface',
        brand: 'nxt',
        prdFeature: {
            features: [{
                name: 'Unified Customer Profile API',
                priority: 'must',
                storyId: 'US-1',
                userStory: 'As an officer, I want every touchpoint on one screen so I can reference it in a call.',
                acceptanceCriteria: [
                    'Given a customer with records in multiple orgs, when the officer opens the profile, then every touchpoint renders on one screen.',
                    'Given a shared anonymous_id, when the profile loads, then identity resolves without a manual merge.',
                    'Given an officer-initiated note, when it is saved, then the owning org receives it before the officer leaves the page.',
                ],
                successMetric: 'Officers stop switching systems during prospect calls.',
                traces: 'THE OFFICER - fragmented-record gap',
            }],
        },
    };
    it('renders the story id, success metric, and traces footer on the dense card', () => {
        const html = slideDataToStageHtml(slide);
        expect(html).toContain('US-1');
        expect(html).toContain('Success metric');
        expect(html).toContain('Officers stop switching systems');
        expect(html).toContain('Traces: THE OFFICER - fragmented-record gap');
        // Given/When/Then sentences survive whole (no mid-thought truncation at 3 criteria)
        expect(html).toContain('then identity resolves without a manual merge.');
    });
});

describe('PRD v2 contract (source asserts)', () => {
    // 2026-10-01 (plan Stage 3): #prd is document-first on the PrdAir contract; the prd-feature slide
    // protocol block is retired from the chat service. The depth contract now lives in the compiler
    // prompt (Given / When / Then acceptance tests, typed targets) and the ledger is a projected slide.
    const compiler = src('services/prdCompiler.ts');
    const projection = src('services/prdProjection.ts');
    const chat = src('services/corpusChatService.ts');
    it('the compiler demands Given / When / Then acceptance tests on every requirement', () => {
        expect(compiler).toMatch(/Given \/ When \/ Then/);
        expect(compiler).toContain('acceptanceTests');
    });
    it('the requirements ledger is a projected slides:prd-ledger archetype, and the retired block is gone from the chat protocol', () => {
        expect(projection).toContain('prd-ledger');
        expect(chat).not.toContain('template=prd-feature');
        expect(chat).not.toContain('prd-feature DEPTH CONTRACT');
    });
});
