import { describe, it, expect } from 'vitest';
import { parseBlocks, normalizeMarkdown } from '../components/ChatProse';

// Guards the structural parse that turns a gemini-3.5-flash chat reply into
// beautiful structured prose (headings/bullets/numbered/quote) instead of the
// 11px pre-wrap text wall the user flagged (goal 2026-06-23).

describe('ChatProse parseBlocks', () => {
    it('parses headings, paragraphs, and bullets in order', () => {
        const md = [
            'The bottom line is co-op scarcity drives the complaints.',
            '',
            '## Why it matters',
            'Students arrive expecting placements.',
            '',
            '- First factor',
            '- Second factor',
        ].join('\n');
        const b = parseBlocks(md);
        expect(b[0]).toMatchObject({ kind: 'p' });
        expect(b[1]).toMatchObject({ kind: 'h2', text: 'Why it matters' });
        expect(b[2]).toMatchObject({ kind: 'p' });
        expect(b[3].kind).toBe('ul');
        expect((b[3] as any).items).toEqual(['First factor', 'Second factor']);
    });

    it('parses ordered lists and blockquotes', () => {
        const md = [
            '1. Stand up the backbone',
            '2. Govern it',
            '',
            '> Two years. No co-ops.',
        ].join('\n');
        const b = parseBlocks(md);
        expect(b[0].kind).toBe('ol');
        expect((b[0] as any).items.length).toBe(2);
        expect(b[1]).toMatchObject({ kind: 'quote' });
    });

    it('treats a bold-only short line as a sub-heading', () => {
        const b = parseBlocks('**Shared services:**\nText under it.');
        expect(b[0]).toMatchObject({ kind: 'h3', text: 'Shared services:' });
        expect(b[1].kind).toBe('p');
    });

    it('collapses a soft-wrapped paragraph into one block', () => {
        const b = parseBlocks('Line one\nline two\nline three');
        expect(b.length).toBe(1);
        expect(b[0]).toMatchObject({ kind: 'p' });
    });

    it('parses a horizontal rule', () => {
        const b = parseBlocks('Above\n\n---\n\nBelow');
        expect(b.map(x => x.kind)).toEqual(['p', 'hr', 'p']);
    });

    it('handles empty input safely', () => {
        expect(parseBlocks('')).toEqual([]);
    });
});

describe('normalizeMarkdown rebuilds structure from Gemini-Flash INLINE markers (the live failure)', () => {
    // Verbatim shape of the collapsed run-on the user screenshotted: headers + bold
    // lead-ins all glued onto ~one line with no newlines.
    const collapsed = 'A portfolio AI playbook operates in four sequential phases: standardizing the data backbone, then scaling across the portfolio companies. ## 1. Standardize the data backbone **Unify the CRM data model:** Standardize student account data across all companies to prevent silos. **Centralize specialist talent:** Pool Higher Ed Cloud and RevOps architects into a shared-service center. ## 2. Encode governance guardrails **Embed policies into AI rules:** Load compliance policies directly into AI developer rules.';

    const blocks = parseBlocks(collapsed);

    it('promotes the two ## markers to headers', () => {
        const heads = blocks.filter(b => b.kind === 'h2' || b.kind === 'h3');
        expect(heads.length).toBe(2);
        expect((heads[0] as any).text).toMatch(/Standardize the data backbone/);
        expect((heads[1] as any).text).toMatch(/Encode governance guardrails/);
    });

    it('keeps the opening sentence as a lead paragraph (not a header)', () => {
        expect(blocks[0]).toMatchObject({ kind: 'p' });
        expect((blocks[0] as any).text).toMatch(/^A portfolio AI playbook operates/);
    });

    it('turns the bold lead-ins into real bullets', () => {
        const lists = blocks.filter(b => b.kind === 'ul');
        const items = lists.flatMap(l => (l as any).items);
        expect(items.length).toBeGreaterThanOrEqual(2);
        expect(items.some((it: string) => /Unify the CRM data model/.test(it))).toBe(true);
        expect(items.some((it: string) => /Centralize specialist talent/.test(it))).toBe(true);
    });

    it('does not collapse to a single block', () => {
        expect(blocks.length).toBeGreaterThan(4);
    });

    it('a normal single bold phrase is NOT turned into a bullet', () => {
        const b = parseBlocks('The **single most important** factor is data quality, which everything else depends on.');
        expect(b.length).toBe(1);
        expect(b[0].kind).toBe('p');
    });

    it('an explicit "10 steps" inline numbered list renders as ONE ordered list of 10 (not bullets, not absorbed into the header)', () => {
        // The "numbers inconsistently applied" bug: model emits 1..10 inline with bold lead-ins,
        // the first number gets absorbed into the heading and the rest become un-numbered bullets.
        const s = 'The ten steps move from data to scale. ## Playbook steps 1. **Unify the data backbone:** one schema. 2. **Integrate core systems:** connect CRM. 3. **Centralize talent:** pool architects. 4. **Appoint sponsorship:** name the owner. 5. **Embed policies:** load compliance. 6. **Audit scoring:** test bias. 7. **Build disclosure:** track decisions. 8. **Pilot one college:** de-risk. 9. **Protect the human:** hand off. 10. **Centralized reporting:** track metrics.';
        const b = parseBlocks(s);
        const ols = b.filter(x => x.kind === 'ol');
        expect(ols.length).toBe(1);
        expect((ols[0] as any).items.length).toBe(10);            // all ten, consistently numbered by the renderer
        const heads = b.filter(x => x.kind === 'h2' || x.kind === 'h3');
        expect((heads[0] as any).text).toBe('Playbook steps');     // header did NOT absorb "1."
        expect(b.filter(x => x.kind === 'ul').length).toBe(0);     // NOT converted to bullets
    });

    it('does not mis-split a decimal or a non-list number in prose', () => {
        const b = parseBlocks('Adoption rose to 3.5 percent by 2026. The trend held across regions.');
        expect(b.length).toBe(1);
        expect(b[0].kind).toBe('p');
    });
});
