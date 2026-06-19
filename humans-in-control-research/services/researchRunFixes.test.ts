import { describe, it, expect } from 'vitest';
import { extractAuthoritativePaste } from './corpusChatService';
import { scrubMetaTitle, removeMetaNarration, deClicheTitle, deClicheDeep, stripQAAnnotations } from './slidePostProcessor';

// Held-out checks for the research-run-failure-analysis-2026-06-18 fixes.

describe('P0.2 - extractAuthoritativePaste (verbatim paste authority)', () => {
    const bigEnumerated = `generate a 15 #slides presentation about the top 10 challenges
#### 1. The Support Deflection Trap
Bots deflect tickets (Source: Human vs AI). #### 2. Dynamic Pricing Backlash
Backlash over pricing. #### 3. Delivery black holes. #### 4. Tariff friction.
#### 5. Brand defamation. #### 6. Bot traffic. #### 7. Fees. #### 8. Returns.
#### 9. Voice AI. #### 10. Solo seller burnout, a long enough body to exceed limits.`;

    it('treats a substantive enumerated paste as authoritative', () => {
        expect(extractAuthoritativePaste(bigEnumerated)).toBe(bigEnumerated.trim());
    });
    it('ignores a short conversational artifact ask (should ground from corpus)', () => {
        expect(extractAuthoritativePaste('#slides on the top retail trends in 2026')).toBeNull();
        expect(extractAuthoritativePaste('#journey for the co-op applicant')).toBeNull();
    });
    it('requires structure OR length, not just any long-ish text', () => {
        const longUnstructured = 'word '.repeat(150); // ~750 chars, no enumeration/sources
        expect(extractAuthoritativePaste(longUnstructured)).toBeNull(); // <1200 and unstructured
    });
});

describe('Issue 2 - scrubMetaTitle (self-referential title)', () => {
    it('strips a "how this deck is built:" meta prefix, keeps the real subject', () => {
        expect(scrubMetaTitle('How this deck is built: themes, the ten, and where to ideate'))
            .toBe('Themes, the ten'); // strips the meta prefix AND the trailing "where to ideate" clause
    });
    it('blanks a wholly self-referential title (caller falls back)', () => {
        expect(scrubMetaTitle('How this report is organized')).toBe('');
    });
    it('leaves a clean action title untouched', () => {
        const t = 'Fragmented data caps the 2026 ambition';
        expect(scrubMetaTitle(t)).toBe(t);
    });
    // 2026-06-19 - agenda items / deck-process meta. A "06: How Might We questions per cluster"
    // item is wholly-meta (no how/why prefix to split on) -> '' -> dropped by composeSlide's filter.
    it('drops a deck-process agenda item (How Might We questions label)', () => {
        expect(scrubMetaTitle('06: How Might We questions per cluster')).toBe('');
    });
    it('drops a "where to ideate" agenda item', () => {
        expect(scrubMetaTitle('07: Where to ideate next')).toBe('');
    });
    it('keeps a SUBJECT-framed agenda item untouched', () => {
        const t = '02: Customer-facing failure modes';
        expect(scrubMetaTitle(t)).toBe(t);
    });
});

describe('Issue 2 - removeMetaNarration fence guard + new patterns', () => {
    it('NEVER mutates a :::slide fenced blob (no slide-JSON deletion)', () => {
        const deck = `:::slide template=slides:agenda brand=nxt\n{ "title": "How this deck is built: x", "groups": [] }\n:::`;
        expect(removeMetaNarration(deck)).toBe(deck); // fence guard: untouched
    });
    it('still strips self-referential meta from PLAIN prose', () => {
        const prose = 'Retail AI is mostly cost-cutting. How this deck is built: we walk the ten challenges. Delivery is the real gap.';
        const out = removeMetaNarration(prose);
        expect(out).not.toContain('How this deck is built');
        expect(out).toContain('Delivery is the real gap');
        expect(out).toContain('Retail AI is mostly cost-cutting');
    });
});

describe('Title feedback - deClicheTitle (concise/literal title guard)', () => {
    it('swaps the cliche metaphors that slipped the deck prompt', () => {
        expect(deClicheTitle('AI moves the front door from search to the assistant'))
            .toBe('AI moves the entry point from search to the assistant');
        expect(deClicheTitle('A platform tax and a trust ceiling decide who keeps it'))
            .toBe('A platform tax and a trust limit decide who keeps it');
    });
    it('leaves legitimate marketing "funnel" vocabulary untouched', () => {
        const t = 'Treat AI as the new front of the funnel and a new cost line';
        expect(deClicheTitle(t)).toBe(t); // "funnel" is legit marketing, not a banned cliche
        expect(deClicheTitle('AI sits at the top of the funnel now')).toBe('AI sits at the top of the funnel now');
    });
    it('leaves a clean literal title untouched', () => {
        const t = 'AI assistants now originate retail traffic and convert better than search';
        expect(deClicheTitle(t)).toBe(t);
    });
    it('never blanks or mangles (returns a non-empty title for any input)', () => {
        expect(deClicheTitle('Marketplaces own the easy checkout as OpenAI retreats')).toBeTruthy();
    });
});

describe('Title feedback v2 - deClicheDeep (subtitle/body) + quote protection', () => {
    it('de-cliches subtitle and body fields, not just the title', () => {
        const payload: any = {
            title: 'Who is building the front door',
            subtitle: 'agentic commerce becomes the new front door',
            body: 'Every platform races to own the front door, and it moves the front of the funnel',
        };
        const out: any = deClicheDeep(payload);
        expect(out.title).toBe('Who is building the entry point');
        expect(out.subtitle).toBe('agentic commerce becomes the new entry point');
        expect(out.body).not.toContain('front door');
        expect(out.body).toContain('front of the funnel'); // legit marketing term survives
    });
    it('PROTECTS verbatim quote/source fields (a real quote keeps its words)', () => {
        const payload: any = {
            title: 'AI moves the front door',
            quote: 'they called it the new front door for e-commerce',
            sources: ['Shopifreaks via the funnel newsletter'],
        };
        const out: any = deClicheDeep(payload);
        expect(out.title).toBe('AI moves the entry point');
        expect(out.quote).toBe('they called it the new front door for e-commerce'); // untouched
        expect(out.sources[0]).toBe('Shopifreaks via the funnel newsletter'); // untouched
    });
});

describe('Source hygiene - "HiC theme synthesis" is not a citable source', () => {
    it('strips the HiC-theme-synthesis attribution, leaving a real source', () => {
        expect(stripQAAnnotations('Ecommerce CX team via HiC theme synthesis'))
            .not.toMatch(/HiC theme synthesis/i);
        const footer = stripQAAnnotations('HiC theme synthesis; Reddit r/shopify, r/entrepreneur');
        expect(footer).not.toMatch(/HiC theme synthesis/i);
        expect(footer).toMatch(/Reddit r\/shopify/);
    });
});
