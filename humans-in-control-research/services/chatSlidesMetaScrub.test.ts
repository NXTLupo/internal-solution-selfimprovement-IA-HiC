import { describe, it, expect } from 'vitest';
import { scrubChatReplyMeta, detectMetaNarration } from './slidePostProcessor';

// REGRESSION GUARD for the chat-2026-06-23 meta-narration escape. The Analyst-Desk
// #slides reply path ran ONLY stripQAAnnotations + stripFormatTells - no meta/process
// strip - so meta-narration shipped in BOTH the conversational preamble AND inside
// :::slide JSON fields. scrubChatReplyMeta is the fence-aware fix. Every sample below
// is lifted verbatim from the failing transcript.

describe('scrubChatReplyMeta - preamble (prose before the fences) is dropped', () => {
    const reply = `The collected corpus names only Medforth as a private equity-backed holding company building enrollment AI across higher-ed portfolio institutions. Excluding Medforth, the corpus contains no second named PE firm or holding company with a documented higher-ed AI playbook. What I can build instead is a playbook grounded in the transferable patterns the corpus does evidence. The slides below frame those as the cross-portfolio plays, with the named-PE-firm gap stated honestly on the deck.:::slide template=slides:cover brand=nxt
{ "wordmark": "NXT HUMANS", "title": "The cross-portfolio AI playbook for PE-backed higher-ed groups", "subtitle": "Shared-service models, governance, and deployment" }
:::`;
    const out = scrubChatReplyMeta(reply);

    it('drops the entire pre-fence preamble paragraph', () => {
        expect(out.startsWith(':::slide')).toBe(true);
        expect(out).not.toContain('The collected corpus');
        expect(out).not.toContain('the corpus contains no');
        expect(out).not.toContain('What I can build instead');
        expect(out).not.toContain('The slides below');
        expect(out).not.toContain('stated honestly on the deck');
    });

    it('preserves the real slide content', () => {
        expect(out).toContain('The cross-portfolio AI playbook for PE-backed higher-ed groups');
        expect(out).toContain('NXT HUMANS');
    });

    it('leaves valid JSON in the fence (still parseable)', () => {
        const m = out.match(/\{[\s\S]*\}/);
        expect(m).toBeTruthy();
        expect(() => JSON.parse(m![0])).not.toThrow();
    });
});

describe('scrubChatReplyMeta - meta INSIDE a slide field is stripped, JSON stays valid', () => {
    const reply = `:::slide template=slides:thesis-interstitial brand=nxt
{ "kicker": "THE GAP TO CLOSE", "thesis": "Excluding Medforth, the corpus names no second PE firm with a documented higher-ed AI playbook. To verify these plays against a named peer, ingest PE-portfolio and EdTech-vendor case studies before the next pass." }
:::`;
    const out = scrubChatReplyMeta(reply);

    it('removes the corpus-as-subject clause', () => {
        expect(out).not.toMatch(/the corpus names no/i);
        expect(out).not.toMatch(/Excluding Medforth, the corpus/i);
    });

    it('removes the pipeline next-steps clause', () => {
        expect(out).not.toMatch(/before the next pass/i);
        expect(out).not.toMatch(/ingest PE-portfolio/i);
    });

    it('the fence JSON remains parseable after scrubbing', () => {
        const m = out.match(/\{[\s\S]*\}/);
        expect(m).toBeTruthy();
        expect(() => JSON.parse(m![0])).not.toThrow();
    });
});

describe('scrubChatReplyMeta - residual process-reference + tool-as-source + self-label', () => {
    it('strips "the evidence documents" phrase (Gen-3 problem-diptych subhead)', () => {
        const reply = `:::slide template=slides:problem-diptych brand=nxt
{ "subhead": "Two failure modes the evidence documents, and the framework must hold both." }
:::`;
        const out = scrubChatReplyMeta(reply);
        expect(out).not.toMatch(/the evidence documents/i);
        expect(out).toContain('the framework must hold both');
        const m = out.match(/\{[\s\S]*\}/);
        expect(() => JSON.parse(m![0])).not.toThrow();
    });

    it('removes a tool/model leaked as a source line', () => {
        const reply = `:::slide template=slides:stat-row brand=nxt
{ "sourceLine": "Medforth Global Education enrollment-workflow analysis (gemini focused research)" }
:::`;
        const out = scrubChatReplyMeta(reply);
        expect(out).not.toMatch(/gemini focused research/i);
        expect(out).toContain('Medforth Global Education enrollment-workflow analysis');
    });

    it('strips the "A case study:" artifact self-label, keeps the subject', () => {
        const reply = `:::slide template=slides:cover brand=nxt
{ "subtitle": "A case study: how a holding company stood up real-time analytics across three brands" }
:::`;
        const out = scrubChatReplyMeta(reply);
        expect(out).not.toMatch(/a case study:/i);
        expect(out).toMatch(/holding company stood up real-time analytics/i);
    });
});

describe('scrubChatReplyMeta PRESERVES markdown structure on a plain-prose reply (newline-collapse regression)', () => {
    // The 2026-06-23 bug: the prose branch ran removeMetaNarration (sentences.join(' '))
    // + stripProcessReferences (\s{2,}->' '), flattening every newline -> a structured
    // chat answer rendered as ONE run-on paragraph with inline "## 1." markers.
    const reply = [
        'A portfolio AI playbook runs in four sequential phases.',
        '',
        '## 1. Standardize the data backbone',
        '',
        '- **Unify the CRM model:** Put every college on one schema.',
        '- **Centralize talent:** Pool the platform architects.',
        '',
        '## 2. Encode governance',
        '',
        'Load compliance policy into the AI tooling so output is compliant by default.',
    ].join('\n');
    const out = scrubChatReplyMeta(reply);

    it('keeps headers on their own lines', () => {
        expect(out).toMatch(/^## 1\. Standardize the data backbone$/m);
        expect(out).toMatch(/^## 2\. Encode governance$/m);
    });
    it('keeps bullets on their own lines', () => {
        expect(out).toMatch(/^- \*\*Unify the CRM model:\*\*/m);
        expect(out).toMatch(/^- \*\*Centralize talent:\*\*/m);
    });
    it('does NOT collapse the reply into a single line', () => {
        expect(out.split('\n').length).toBeGreaterThan(6);
    });
    it('preserves blank-line paragraph separation', () => {
        expect(out).toMatch(/\n\n## 1\./);
    });
});

describe('detectMetaNarration catches the new corpus / pipeline tells (prose)', () => {
    it('flags corpus-as-subject', () => {
        expect(detectMetaNarration('The collected corpus names only Medforth.').length).toBeGreaterThan(0);
        expect(detectMetaNarration('Excluding Medforth, the corpus names no second PE firm.').length).toBeGreaterThan(0);
    });
    it('flags pipeline next-steps', () => {
        expect(detectMetaNarration('Ingest more case studies before the next pass.').length).toBeGreaterThan(0);
    });
    it('does NOT flag clean subject prose', () => {
        expect(detectMetaNarration('A holding company scales AI by building one governed capability centrally.').length).toBe(0);
    });
});
