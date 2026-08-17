/** WS-4 inline text editing (2026-08-14 v2 program): enumeration, immutable
 *  apply + history, undo, and the scrub on rewrite output. */
import { describe, it, expect } from 'vitest';
import {
    enumerateTextFields, applyTextEdits, undoLastTextEdit, scrubRewrite, getAtPath, matchFieldByText,
} from './slideTextEditing';

const composerSlide = (): any => ({
    id: 's1', status: 'draft', timestamp: 1,
    template: 'slides:numbered-themes',
    title: 'Alumni drop off at three stages the advancement team cannot see',
    composerPayload: {
        title: 'Alumni drop off at three stages the advancement team cannot see',
        kicker: 'RETENTION',
        items: [
            { heading: 'First contact goes unanswered', description: 'The advancement office answers alumni email in weeks, not days, per the CASE benchmark interviews.' },
            { heading: 'Event follow-up never happens', description: 'No system routes attendance lists to gift officers.' },
        ],
        backgroundImage: 'http://127.0.0.1:5012/api/illustration/abc.png',
        _userImagery: { backgroundImage: { prompt: 'x', style: 'realistic', authoredAt: 1 } },
        brand: 'nxt',
        variant: 'dense',
    },
});

describe('enumerateTextFields', () => {
    it('finds payload prose, skips URLs, config tokens, media keys, and underscore carriers', () => {
        const fields = enumerateTextFields(composerSlide());
        const paths = fields.map(f => f.path);
        expect(paths[0]).toBe('title');
        expect(paths).toContain('kicker');
        expect(paths).toContain('items[0].heading');
        expect(paths).toContain('items[1].description');
        expect(paths.some(p => p.includes('backgroundImage'))).toBe(false);
        expect(paths.some(p => p.includes('_userImagery'))).toBe(false);
        expect(paths).not.toContain('brand');
        expect(paths).not.toContain('variant');
    });

    it('enumerates classic template slides from title + data objects', () => {
        const slide: any = {
            id: 's2', status: 'draft', timestamp: 1, template: 'block-quote',
            title: 'Applicants describe the co-op search as a numbers game',
            quote: { text: 'I applied to 60 co-ops and heard back from 4.', attribution: 'Reddit r/NEU' },
            imageUrl: 'data:image/png;base64,xyz',
        };
        const fields = enumerateTextFields(slide);
        const paths = fields.map(f => f.path);
        expect(paths).toContain('title');
        expect(paths).toContain('quote.text');
        expect(paths).toContain('quote.attribution');
        expect(paths.some(p => p.includes('imageUrl'))).toBe(false);
    });
});

describe('applyTextEdits + undo', () => {
    it('applies immutably, syncs slide.title, records history, and undoes', () => {
        const slide = composerSlide();
        const edited = applyTextEdits(slide, [
            { path: 'title', value: 'Advancement loses alumni at three invisible handoffs' },
            { path: 'items[0].heading', value: 'Email response takes weeks' },
        ]);
        // immutability: original untouched, new refs
        expect(slide.composerPayload.title).toMatch(/^Alumni drop off/);
        expect(edited.composerPayload).not.toBe(slide.composerPayload);
        expect(edited.composerPayload.title).toBe('Advancement loses alumni at three invisible handoffs');
        expect(edited.title).toBe('Advancement loses alumni at three invisible handoffs');
        expect(edited.composerPayload.items[0].heading).toBe('Email response takes weeks');
        // untouched fields survive (including the imagery spec carrier)
        expect(edited.composerPayload._userImagery.backgroundImage.prompt).toBe('x');
        expect((edited as any)._textHistory).toHaveLength(1);

        const undone = undoLastTextEdit(edited)!;
        expect(undone.composerPayload.title).toMatch(/^Alumni drop off/);
        expect(undone.composerPayload.items[0].heading).toBe('First contact goes unanswered');
        expect((undone as any)._textHistory).toHaveLength(0);
    });

    it('edits classic slides along the data-object path', () => {
        const slide: any = {
            id: 's2', status: 'draft', timestamp: 1, template: 'block-quote',
            title: 'T', quote: { text: 'old', attribution: 'A' },
        };
        const edited = applyTextEdits(slide, [{ path: 'quote.text', value: 'new quote text' }]);
        expect(edited.quote.text).toBe('new quote text');
        expect(slide.quote.text).toBe('old');
        expect(getAtPath(edited, 'quote.attribution')).toBe('A');
    });
});

describe('matchFieldByText (click-to-edit)', () => {
    it('maps clicked preview text back to its payload field, case-insensitively', () => {
        const slide = composerSlide();
        // renderers often uppercase via CSS or template strings
        const m = matchFieldByText(slide, 'FIRST CONTACT GOES UNANSWERED');
        expect(m?.path).toBe('items[0].heading');
        const t = matchFieldByText(slide, 'Alumni drop off at three stages the advancement team cannot see');
        expect(t?.path).toBe('title');
    });

    it('matches composer-baked enumeration prefixes ("01: ...") to the bare field', () => {
        const slide: any = {
            id: 's3', status: 'draft', timestamp: 1, template: 'slides:problem-diptych',
            title: 'Where AI is landing across the retained search lifecycle',
            composerPayload: {
                title: 'Where AI is landing across the retained search lifecycle',
                left: { label: 'DELIVERY AND DATA', items: [{ heading: 'Native AI across the ATS and CRM workflow' }, { heading: 'Live-data grounding through MCP servers' }] },
                right: { label: 'EVALUATION AND CONSTRAINTS', items: [{ heading: 'Confidential-data governance as the gate' }] },
            },
        };
        // the renderer bakes "01: " into the element; the payload has no number
        const m = matchFieldByText(slide, '01: Native AI across the ATS and CRM workflow');
        expect(m?.path).toBe('left.items[0].heading');
        // deep two-column nesting enumerates (the live "not editable" defect)
        const g = matchFieldByText(slide, 'Confidential-data governance as the gate');
        expect(g?.path).toBe('right.items[0].heading');
    });

    it('rejects container-level text and unmatched clicks', () => {
        const slide = composerSlide();
        expect(matchFieldByText(slide, 'ab')).toBeNull();
        expect(matchFieldByText(slide, 'completely unrelated click text about nothing')).toBeNull();
        // a whole-slide container concatenation must not force a weak match
        const everything = 'RETENTION Alumni drop off at three stages the advancement team cannot see First contact goes unanswered Event follow-up never happens plus lots of unrelated chrome text and footer labels';
        const weak = matchFieldByText(slide, everything);
        expect(weak?.path === 'items[0].heading').toBe(false);
    });
});

describe('scrubRewrite', () => {
    it('strips markdown, em-dashes, and surrounding quotes from model output', () => {
        const out = scrubRewrite('"**Advancement loses alumni** — at three handoffs"');
        expect(out).not.toContain('**');
        expect(out).not.toContain('—');
        expect(out.startsWith('"')).toBe(false);
    });
});
