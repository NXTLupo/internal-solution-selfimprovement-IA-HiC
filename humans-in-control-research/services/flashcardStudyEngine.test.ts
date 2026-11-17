/**
 * Flashcard study engine (plans/gemini-notebook-parity-closeout-2026-11-09.md WS-D1).
 *
 * Pins the contract that makes the deck workable rather than merely readable, and the properties
 * that keep it safe to run over the whole HTML artifact family: detection is specific, injection
 * is idempotent, non-flashcard artifacts pass through untouched, and the controls disappear when
 * scripting is off so the printed artifact stays a clean card list.
 */
import { describe, it, expect } from 'vitest';
import {
    isFlashcardArtifact,
    countCards,
    injectFlashcardStudyEngine,
} from './flashcardStudyEngine';

// The model's whole contribution to study mode: a data-card id per card. No buttons, no
// progress bar, no script - the engine synthesizes those.
const DECK = `
<h1>Co-op evidence recall</h1>
<details data-card="c1"><summary>What is a knockout question?</summary>
<p>A form filter that rejects before review [c3].</p>
</details>
<details data-card="c2"><summary>What is settle-with-evidence?</summary>
<p>A task closes only with attached proof [c7].</p>
</details>`;

describe('isFlashcardArtifact', () => {
    it('recognises a deck that carries the contract', () => {
        expect(isFlashcardArtifact(DECK)).toBe(true);
    });

    it('rejects a report that merely mentions cards', () => {
        expect(isFlashcardArtifact('<p>We discuss flashcards and data-card design.</p>')).toBe(false);
    });

    it('requires the id to sit on a details card, not any element', () => {
        expect(isFlashcardArtifact('<div data-card="c1">not a card</div>')).toBe(false);
    });

    it('handles empty input', () => {
        expect(isFlashcardArtifact('')).toBe(false);
    });
});

describe('countCards', () => {
    it('counts distinct card ids', () => {
        expect(countCards(DECK)).toBe(2);
    });

    it('does not double-count a repeated id', () => {
        expect(countCards('<i data-card="a"></i><i data-card="a"></i>')).toBe(1);
    });
});

describe('injectFlashcardStudyEngine', () => {
    it('injects styles, the noscript guard and one script', () => {
        const r = injectFlashcardStudyEngine(DECK);
        expect(r.injected).toBe(true);
        expect(r.cards).toBe(2);
        expect(r.html).toContain('<style data-hic-study-engine="1">');
        expect(r.html).toContain('<noscript>');
        expect((r.html.match(/<script data-hic-study-engine="1">/g) || [])).toHaveLength(1);
    });

    it('keeps the original card markup and its citations intact', () => {
        const r = injectFlashcardStudyEngine(DECK);
        expect(r.html).toContain('A form filter that rejects before review [c3].');
        expect(r.html).toContain('data-card="c2"');
        expect(r.html).toContain('<h1>Co-op evidence recall</h1>');
    });

    it('synthesizes the controls the model never wrote, one pair per card', () => {
        const r = injectFlashcardStudyEngine(DECK);
        expect((r.html.match(/class="fc-got"/g) || [])).toHaveLength(2);
        expect((r.html.match(/class="fc-missed"/g) || [])).toHaveLength(2);
        expect(r.html).toContain('data-for="c1"');
        expect(r.html).toContain('data-for="c2"');
    });

    it('puts each control pair inside its own card, before the closing tag', () => {
        const r = injectFlashcardStudyEngine(DECK);
        const card1 = r.html.slice(r.html.indexOf('data-card="c1"'), r.html.indexOf('data-card="c2"'));
        expect(card1).toContain('data-for="c1"');
        expect(card1).not.toContain('data-for="c2"');
        expect(card1.indexOf('fc-controls')).toBeLessThan(card1.lastIndexOf('</details>'));
    });

    it('prepends a progress strip when the document has none', () => {
        const r = injectFlashcardStudyEngine(DECK);
        expect(r.html).toContain('id="fc-progress" data-total="2"');
    });

    it('is idempotent: a second pass does not stack a second engine', () => {
        const once = injectFlashcardStudyEngine(DECK).html;
        const twice = injectFlashcardStudyEngine(once);
        expect(twice.injected).toBe(false);
        expect(twice.html).toBe(once);
        expect((twice.html.match(/<script data-hic-study-engine/g) || [])).toHaveLength(1);
    });

    it('leaves a non-flashcard artifact byte-for-byte unchanged', () => {
        const report = '<h1>Findings</h1><p>Prose with a pointer [c1].</p>';
        const r = injectFlashcardStudyEngine(report);
        expect(r.injected).toBe(false);
        expect(r.html).toBe(report);
    });

    it('hides the controls when scripting is off', () => {
        const r = injectFlashcardStudyEngine(DECK);
        const noscript = r.html.slice(r.html.indexOf('<noscript>'), r.html.indexOf('</noscript>'));
        expect(noscript).toContain('#fc-progress');
        expect(noscript).toContain('.fc-controls');
        expect(noscript).toContain('display: none');
    });

    it('wraps every storage access so a private window cannot break the deck', () => {
        const r = injectFlashcardStudyEngine(DECK);
        const script = r.html.slice(r.html.indexOf('<script data-hic-study-engine'));
        const reads = (script.match(/localStorage\./g) || []).length;
        const guards = (script.match(/catch \(e\)/g) || []).length;
        expect(reads).toBeGreaterThan(0);
        expect(guards).toBeGreaterThanOrEqual(2);
    });

    it('binds colour through design tokens, never a bare hex alone', () => {
        const r = injectFlashcardStudyEngine(DECK);
        expect(r.html).toContain('var(--color-accent');
        expect(r.html).toContain('var(--color-on-accent');
    });
});
