/**
 * 2026-10-26 (owner: "the model did not listen to the prompt ... and over indexed on the upload in the analyst chat even
 * though I asked for some prior context from the external corpora"). The request was a positioning deck with
 * "data-backed proof points from the research", then a "Work" section with all the attached slides; the attachment
 * model read that correctly, and the send path turned it into "use only the attachment" for the whole deck.
 */
import { describe, it, expect } from 'vitest';
import { interpretAttachmentIntent, parseAttachmentIntent, buildAttachmentIntentPrompt } from './attachmentIntent';
import { buildRequestPlanPrompt, requestPlanBlock, fallbackRequestPlan } from './requestPlan';
import { ATTACHED_SECTION_CONTRACT } from './corpusChatService';
import { screenPictures, refusedPictures } from './imageScreen';
import { readFileSync } from 'fs';
import { join } from 'path';

const ASK = 'Generate a #slides deck presenting the #NXT Humans offer and key messages positioning its AI-native tools, accelerators, and processes against traditional agency decline in the 2026 landscape. For each slide, provide a core headline, a pragmatic supporting narrative, a conceptual description for a workflow visualization, and specific data-backed proof points from the research. Then add a "Work" section that includes all the content from the attached slides.';
const deck = [{ name: 'NXT_Humans_Client_Portfolio_2027_Continuity 1.pptx', type: 'pptx', excerpt: '[Slide 1] Portfolio thesis ...' }];

describe('a request that uses the attachment for one section and the research for the rest', () => {
    it('the attachment model is asked whether the request also wants research, and its answer is carried out', async () => {
        expect(buildAttachmentIntentPrompt(ASK, deck, '')).toContain('alsoUseResearch: true when the message asks for ANYTHING beyond');
        const gen = async () => '{"role":"content-source","persistToCorpus":false,"extractLedger":false,"alsoUseResearch":true,"note":"The attached slides become the Work section."}';
        const r = await interpretAttachmentIntent({ message: ASK, attachments: deck, gen });
        expect(r.role).toBe('content-source');
        expect(r.alsoUseResearch).toBe(true);
    });

    it('a reformat (no research ask) keeps the attachment as the only source when the model omits the flag', () => {
        expect(parseAttachmentIntent('{"role":"content-source"}')?.alsoUseResearch).toBe(false);
        expect(parseAttachmentIntent('{"role":"evidence"}')?.alsoUseResearch).toBe(true);
    });

    it('the plan prompt says a research ask beside an attached section is NOT provided-content-only', () => {
        const p = buildRequestPlanPrompt(ASK, { catalogIds: ['slides'], hasAttachment: true });
        expect(p).toContain('useOnlyProvidedContent is true ONLY when the attachment or paste is the whole subject');
        expect(p).toContain('the attachment supplies the Work section and the research supplies the rest');
    });

    it('the plan block for a mixed turn names both sources and the attached section', () => {
        const plan = { ...fallbackRequestPlan(ASK), mode: 'generate' as const, useOnlyProvidedContent: false, carryAttachment: true };
        const b = requestPlanBlock(plan);
        expect(b).toContain('TWO sources');
        expect(b).toContain('built from the research corpus with cited evidence');
        expect(b).not.toContain('build ONLY from the content the user provided');
        expect(ATTACHED_SECTION_CONTRACT).toContain('carries EVERY slide of the attachment');
    });

    it('the send path never forces upload-only when the model read a research ask (source contract)', () => {
        const src = readFileSync(join(__dirname, '..', 'components', 'CorpusChatPanel.tsx'), 'utf8');
        // the old unconditional override (a content source forced upload-only for the whole deck) is gone
        expect(src).not.toMatch(/(?<!else )if \(_attachmentRole === 'content-source'\) _requestPlan\.useOnlyProvidedContent = true;/);
        expect(src).toContain("if (_attachmentAlsoResearch === true) _requestPlan.useOnlyProvidedContent = false;");
        // generated imagery is skipped only for an upload-only deck, and a research slide never takes an attached picture
        expect(src).toContain("if (_sourceDeck && _requestPlan?.useOnlyProvidedContent) {");
        expect(src).toContain("if (!_requestPlan?.useOnlyProvidedContent && !pay._provided) return;");
    });
});

describe('the attached pictures pass the image critic', () => {
    it('refused pictures are reported; an unreachable screen refuses nothing', async () => {
        const fake = (async () => ({ ok: true, json: async () => ({ verdicts: [{ accept: false, kind: 'collage', reason: 'glowing globe' }, { accept: true, kind: 'photo', reason: '' }] }) })) as any;
        const v = await screenPictures(['data:image/png;base64,AAA', 'data:image/png;base64,BBB'], fake);
        expect(Array.from(refusedPictures(v))).toEqual(['data:image/png;base64,AAA']);
        const down = (async () => { throw new Error('down'); }) as any;
        expect(refusedPictures(await screenPictures(['data:image/png;base64,AAA'], down)).size).toBe(0);
    });
});
