/**
 * 2026-10-20 (root-cause audit P1.6): one model reading of the request that every pass honors; a deterministic
 * fallback when the model cannot be asked.
 */
import { describe, it, expect } from 'vitest';
import { interpretRequest, fallbackRequestPlan, parseRequestPlan, requestPlanBlock, buildRequestPlanPrompt } from './requestPlan';
import { ARTIFACT_CATALOG } from './artifactCatalog';

const ids = ARTIFACT_CATALOG.map(e => e.id);

describe('request plan', () => {
    it('carries out a model reading: a question about an artifact is not a generation', async () => {
        const gen = async () => '{"mode":"question","deliverable":"#gap","scope":"why data maturity scored 2","counts":{},"audience":"","length":"standard","brand":null,"useOnlyProvidedContent":false,"userLimitedScope":false,"note":"A question about the gap matrix."}';
        const p = await interpretRequest({ message: 'Why did the #gap matrix rate data maturity 2?', catalogIds: ids, gen });
        expect(p.mode).toBe('question');
        expect(p.deliverable).toBeNull();
        expect(requestPlanBlock(p)).toContain('QUESTION about existing work');
    });

    it('carries out counts and provided-content readings', async () => {
        const gen = async () => '{"mode":"generate","deliverable":"#personas","scope":"first-year students","counts":{"items":2},"audience":"the CIO","length":"standard","brand":"nu","useOnlyProvidedContent":false,"userLimitedScope":true,"note":"Two personas for the CIO."}';
        const p = await interpretRequest({ message: 'only two #personas for the CIO #NU', catalogIds: ids, gen });
        expect(p.deliverable).toBe('persona');
        expect(p.counts.items).toBe(2);
        expect(p.userLimitedScope).toBe(true);
        expect(p.brand).toBe('nu');
        const block = requestPlanBlock(p);
        expect(block).toContain('Count: exactly 2 item(s)');
        expect(block).toContain('Audience: the CIO');
    });

    it('falls back to the deterministic reading when the model fails, keeping counts the user typed', async () => {
        const p = await interpretRequest({ message: 'only three #themes on pricing', catalogIds: ids, gen: async () => { throw new Error('down'); } });
        expect(p.decidedBy).toBe('fallback');
        expect(p.mode).toBe('generate');
        expect(p.deliverable).toBe('themes');
        expect(p.counts.items).toBe(3);
        expect(p.userLimitedScope).toBe(true);
        expect(fallbackRequestPlan('what do customers say about onboarding?').mode).toBe('chat');
        expect(parseRequestPlan('not json', 'x', ids)).toBeNull();
    });

    it('provided-content mode needs provided content: the flag is false without an attachment (2026-10-31 live UI test)', async () => {
        const raw = '{"mode":"generate","deliverable":"#slides","scope":"agency decline","counts":{"slides":10},"audience":"","length":"standard","brand":"nxt","useOnlyProvidedContent":true,"userLimitedScope":true,"perSlide":[],"note":""}';
        const without = await interpretRequest({ message: '#slides Build a 10-slide deck on agency decline. Ground every slide in the corpus.', catalogIds: ids, hasAttachment: false, gen: async () => raw });
        expect(without.decidedBy).toBe('model');
        expect(without.useOnlyProvidedContent).toBe(false);
        const withAttachment = await interpretRequest({ message: '#slides reformat the attached deck', catalogIds: ids, hasAttachment: true, gen: async () => raw });
        expect(withAttachment.useOnlyProvidedContent).toBe(true);
    });

    it('the prompt names the catalog and the whole message', () => {
        const prompt = buildRequestPlanPrompt('create a #slides #NXT presentation from the attached deck content', { catalogIds: ids, hasAttachment: true });
        expect(prompt).toContain('#slides');
        expect(prompt).toContain('Attachment on this turn: yes');
    });
});
