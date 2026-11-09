/**
 * 2026-10-21: a reformat is judged against its source deck unit by unit.
 */
import { describe, it, expect } from 'vitest';
import { parseSourceDeck, parityCheck, parityPlanBlock, parityFillFences, parityRepairInstruction, mergeParityFences } from './sourceParity';

const SOURCE = `[Slide 1]
TITLE: FOUR INITIATIVES. ONE OPERATING STORY.
Moving from strategy to repeatable business value
NORTHEASTERN
Simplify and strengthen the student co-op journey
BENEFITS CORTEX
Turn complex benefits reporting into a usable client product
ESTEE LAUDER / DECIEM
Speed campaign creation without losing brand quality
CFS
Reduce manual work across document-heavy finance operations
1
NOTES: Portfolio synthesis based on the initiative-specific sources.

[Slide 2]
01  NORTHEASTERN
A clearer path into co-op readiness
Create one coherent experience that helps students understand what to do, when to do it, and where to get support.
OBJECTIVE
Improve student readiness and make early support more proactive, while keeping advisors central to the experience.
APPROACH
Define a focused readiness journey, align it with the Student Hub and Student 360, and turn requirements into practical, bite-sized releases.
STATUS
Discovery and requirements work are active; the team is finalizing readiness definitions, data needs, and the first product requirements.
BUSINESS VALUE
A simpler front door for students, earlier intervention for advisors, and a foundation that can expand across the co-op journey.
2

[Slide 3]
03  ESTEE LAUDER / DECIEM
A faster route from campaign idea to send-ready email
OBJECTIVE
Reduce the time and effort required to design, build, review, and prepare branded emails for delivery.
APPROACH
Use approved campaign patterns, reusable components, brand rules, and quality gates to guide designers and marketers from brief to finished email.
3`;

describe('source parity', () => {
    const deck = parseSourceDeck(SOURCE, 'Portfolio.pptx');

    it('parses slides, titles, labeled sections and entities', () => {
        expect(deck.slides).toHaveLength(3);
        expect(deck.slides[0].title).toBe('FOUR INITIATIVES. ONE OPERATING STORY.');
        expect(deck.slides[1].sections.map(s => s.label)).toEqual(['OBJECTIVE', 'APPROACH', 'STATUS', 'BUSINESS VALUE']);
        expect(deck.slides[1].sections[1].body).toContain('Student Hub and Student 360');
        expect(deck.slides[1].entities.some(e => /Student Hub/.test(e))).toBe(true);
        expect(deck.slides[1].entities).toContain('NORTHEASTERN');
        expect(deck.slides[2].entities).toEqual(expect.arrayContaining(['DECIEM']));
    });

    it('flags a source slide the output dropped, and passes one it carried', () => {
        const output = [
            'FOUR INITIATIVES. ONE OPERATING STORY. Moving from strategy to repeatable business value. NORTHEASTERN, BENEFITS CORTEX, ESTEE LAUDER / DECIEM, CFS.',
            'Northeastern: a clearer path into co-op readiness. Objective: improve student readiness and make early support more proactive, keeping advisors central. Approach: define a focused readiness journey aligned with the Student Hub and Student 360, turning requirements into bite-sized releases. Status: discovery and requirements work are active; the team is finalizing readiness definitions, data needs, and the first product requirements. Business value: a simpler front door for students, earlier intervention for advisors, and a foundation that can expand across the co-op journey.',
        ].join('\n');
        const r = parityCheck(deck, output, output.split('\n'));
        expect(r.total).toBe(3);
        expect(r.covered).toBe(2);
        expect(r.uncovered.map(u => u.index)).toEqual([3]);
        expect(r.uncovered[0].missing.join(' ')).toMatch(/OBJECTIVE/);
        expect(r.mapping).toEqual([0, 1]);
        expect(parityRepairInstruction(r)).toContain('Source slide 3');
    });

    it('the plan names every source slide and its units; the fill builds a dense slide from the source text', () => {
        const plan = parityPlanBlock(deck);
        expect(plan).toContain('Source slide 2: "A clearer path into co-op readiness"');
        expect(plan).toContain('- STATUS: Discovery and requirements work are active');
        expect(plan).toContain('parity beats variety');
        const r = parityCheck(deck, 'nothing', []);
        const fences = parityFillFences(deck, r, 'nxt', 'Portfolio.pptx');
        expect(fences).toContain(':::slide template=slides:brief-card brand=nxt');
        expect(fences).toContain('"label":"OBJECTIVE"');
        expect(fences).toContain('Source: Portfolio.pptx');
    });

    it('names never span a line break, accents stay in the name, and a name is carried word by word (2026-10-26 live)', () => {
        const src = parseSourceDeck(`[Slide 1]
From project delivery
to durable client platforms
ACME / GLOBEX
INITECH WORKS
UMBRELLA GROUP
1
[Slide 2]
Contracted
- Hooli: $276K contracted entering Q1 2027
- Pied Piper draft monthly-capacity SOW
- Pied Piper Aon integration and ongoing proposals
2`, 'x.pptx');
        const all = src.slides.flatMap(s => s.entities);
        expect(all).not.toContain('GLOBEX INITECH');
        expect(all).not.toContain('WORKS UMBRELLA');
        expect(all.some(e => /Q1 2027 Pied/.test(e))).toBe(false);
        expect(parseSourceDeck('[Slide 1]\nESTÉE LAUDER portfolio review\n1', 'y.pptx').slides[0].entities).toContain('ESTÉE LAUDER');
        const out = 'From project delivery to durable client platforms for Acme / Globex, Initech Works and Umbrella Group. Hooli holds $276K contracted entering Q1 2027; Pied Piper runs a draft monthly-capacity SOW, plus proposals for Aon integration and ongoing work at Pied Piper.';
        expect(parityCheck(src, out).covered).toBe(2);
    });

    it('a repair slide for a source slide the deck already carries replaces it, never duplicates it', () => {
        const existing = ':::slide template=slides:brief-card brand=nxt\n{"title":"A faster route from campaign idea to send-ready email","blocks":[{"label":"OBJECTIVE","body":"Reduce the time and effort required to design, build, review, and prepare branded emails for delivery."}]}\n:::';
        const dup = ':::slide template=slides:evidence-table brand=nxt\n{"title":"A faster route from campaign idea to send-ready email","rows":[{"subject":"OBJECTIVE","prove":"Reduce the time and effort required to design, build, review, and prepare branded emails for delivery."}]}\n:::';
        const m = mergeParityFences(`${existing}\n`, dup, deck);
        expect(m).toMatchObject({ added: 0, replaced: 1 });
        expect(m.text.match(/:::slide/g)?.length).toBe(1);
    });

    it('the repair splices only the missing slides into the deck in source order (2026-10-25: no full regeneration)', () => {
        const cover = ':::slide template=slides:cover brand=nxt\n{"title":"Four initiatives, one operating story","subtitle":"Northeastern, Benefits Cortex, Estee Lauder / DECIEM, CFS"}\n:::';
        const deciem = ':::slide template=slides:brief-card brand=nxt\n{"title":"A faster route from campaign idea to send-ready email","blocks":[{"label":"OBJECTIVE","body":"Reduce the time and effort required to design, build, review, and prepare branded emails for delivery. ESTEE LAUDER / DECIEM"}]}\n:::';
        const deckText = `:::thesis-options\n[]\n:::\n\n${cover}\n\n${deciem}\n`;
        const missingNeu = ':::slide template=slides:brief-card brand=nxt\n{"title":"A clearer path into co-op readiness","blocks":[{"label":"OBJECTIVE","body":"Improve student readiness and make early support more proactive, keeping advisors central. NORTHEASTERN Student Hub and Student 360"}]}\n:::';
        expect(parityRepairInstruction(parityCheck(deck, deckText))).toMatch(/your fence REPLACES it/);
        const merged = mergeParityFences(deckText, `Here you go.\n${missingNeu}\n`, deck);
        expect(merged.added).toBe(1);
        const order = ['Four initiatives', 'A clearer path', 'A faster route'].map(t => merged.text.indexOf(t));
        expect(order.every((p, i) => p > 0 && (i === 0 || p > order[i - 1]))).toBe(true);
        expect(merged.text.startsWith(':::thesis-options')).toBe(true);
        expect(merged.text).not.toContain('Here you go');
        expect(mergeParityFences(deckText, 'no fences here', deck)).toEqual({ text: deckText, added: 0, replaced: 0 });
    });

    it('a carried slide that dropped a source figure is uncovered, and its repair REPLACES it in place (2026-10-26)', () => {
        const src = parseSourceDeck('[Slide 1]\nAcme renewal outlook\nOUTLOOK\n$1.6M FY2027 management outlook on a fixed fee; $276K already contracted.\n1', 'x.pptx');
        const thin = ':::slide template=slides:brief-card brand=nxt\n{"title":"Acme renewal outlook","blocks":[{"label":"OUTLOOK","body":"Acme carries a fixed-fee management outlook into FY2027."}]}\n:::';
        const r = parityCheck(src, thin, [thin]);
        expect(r.covered).toBe(0);
        expect(r.uncovered[0].missing.join(' ')).toMatch(/figure: 1\.6M|figure: 276K/);
        const full = ':::slide template=slides:brief-card brand=nxt\n{"title":"Acme renewal outlook","blocks":[{"label":"OUTLOOK","body":"Acme carries a $1.6M FY2027 management outlook on a fixed fee; $276K is already contracted."}]}\n:::';
        const merged = mergeParityFences(`${thin}\n`, full, src);
        expect(merged).toMatchObject({ added: 0, replaced: 1 });
        expect(merged.text).toContain('$276K is already contracted');
        expect(merged.text.match(/:::slide/g)?.length).toBe(1);
        expect(parityCheck(src, merged.text).covered).toBe(1);
    });
});
