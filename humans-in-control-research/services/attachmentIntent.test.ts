/**
 * 2026-10-20: a chat attachment's purpose is decided by the model reading the user's message (hashtags
 * included), never by code. `#slides ... from the attached deck` must not run the PRD ledger extractor.
 */
import { describe, it, expect } from 'vitest';
import { interpretAttachmentIntent, parseAttachmentIntent, buildAttachmentIntentPrompt, FALLBACK_INTENT } from './attachmentIntent';

const deck = [{ name: 'Current_Initiatives_Portfolio_Narrative 1.pptx', type: 'pptx', excerpt: 'Slide 1: Four client initiatives. Northeastern co-op hub. Benefits Cortex. Canon Financial Services...' }];

describe('attachment intent', () => {
    it('the prompt carries the message with its hashtags and a glimpse of each file', () => {
        const p = buildAttachmentIntentPrompt('create a #slides #NXT presentation from the attached deck content', deck, 'AI delivery landscape');
        expect(p).toContain('#slides #NXT');
        expect(p).toContain('ATTACHMENT 1: Current_Initiatives_Portfolio_Narrative 1.pptx');
        expect(p).toContain('Four client initiatives');
    });

    it('carries out the model decision: a deck to reformat is content, not requirements', async () => {
        const gen = async () => '{"role":"content-source","persistToCorpus":false,"extractLedger":false,"note":"The attached deck is the content for this presentation."}';
        const r = await interpretAttachmentIntent({ message: 'create a #slides #NXT presentation from the attached deck content', attachments: deck, gen });
        expect(r.role).toBe('content-source');
        expect(r.extractLedger).toBe(false);
        expect(r.persistToCorpus).toBe(false);
        expect(r.decidedBy).toBe('model');
    });

    it('carries out the model decision: a #prd request extracts the ledger and keeps the document', async () => {
        const gen = async () => '```json\n{"role":"requirements-source","persistToCorpus":true,"extractLedger":true,"note":"The SOW is read for requirements."}\n```';
        const r = await interpretAttachmentIntent({ message: '#prd for the readiness module', attachments: [{ name: 'SOW012.pdf', excerpt: 'Statement of work...' }], gen });
        expect(r.extractLedger).toBe(true);
        expect(r.persistToCorpus).toBe(true);
    });

    it('fills missing flags from the role and strips an em dash from the note', () => {
        const r = parseAttachmentIntent('{"role":"evidence","note":"Added to research — cited later."}');
        expect(r?.persistToCorpus).toBe(true);
        expect(r?.extractLedger).toBe(false);
        expect(r?.note).not.toContain('—');
    });

    it('when the model cannot decide, nothing expensive or permanent happens', async () => {
        expect(await interpretAttachmentIntent({ message: 'x', attachments: deck, gen: async () => 'not json' })).toEqual(FALLBACK_INTENT);
        expect(await interpretAttachmentIntent({ message: 'x', attachments: deck, gen: async () => { throw new Error('down'); } })).toEqual(FALLBACK_INTENT);
        expect(parseAttachmentIntent('{"role":"bogus"}')).toBeNull();
    });
});
