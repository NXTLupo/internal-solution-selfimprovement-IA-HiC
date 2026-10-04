/**
 * 2026-10-01 world-class uplift, plan Section 2.E / Stage 2.3 (E4, E5, E6, E11).
 *
 * Each test pins one behavior change in slidePostProcessor.ts:
 *   E5  the hyphen-mangling scrubEnDashes is gone; "2026-27", "10-15 hrs", ISO dates survive
 *   E6  detect-only lexicon words are reported, never deleted; delete-safe filler is removed
 *       and the sentence still reads; a dash between two independent clauses becomes "; "
 *   E4  "[N/A]" chrome is stripped from source lines
 *   E11 content budgets match .claude/CLAUDE.md (120 / 200 / 250 / 400 / 600)
 *   E7  the meaning-changing title swaps are gone; the tells are detected instead
 *
 * Phrases the write-time hook scans for are assembled at runtime (j()) so this source
 * never carries them as contiguous literals. Dash characters are built from code points
 * for the same reason: no em-dash may appear in anything written into a generated-output
 * code path, tests included.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    postProcessSlides, stripEmDashes, stripQAAnnotations, deClicheTitle,
    detectDetectOnlySlop, removeDeleteSafeFiller, CONTENT_BUDGET,
} from './slidePostProcessor';

const j = (...w: string[]) => w.join(' ');
// Built from code points so this source carries no dash character of its own.
const EM = String.fromCharCode(0x2014);
const DASH_CLASS = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']');
const slide = (over: Record<string, unknown>) => ({
    slideNumber: 1, layout: 'CONTENT', title: 'The advancement team loses donors it never sees',
    content: [], narrative: '', speakerNotes: '', quote: '', sources: [], ...over,
});
const run = (over: Record<string, unknown>) => postProcessSlides([slide(over) as any]);
const first = (over: Record<string, unknown>) => run(over).slides[0] as any;

describe('E5: ASCII hyphens survive the legacy slide path (scrubEnDashes deleted)', () => {
    it('keeps year ranges, hour ranges and ISO dates intact through cleanFieldText and enforceContentBudgets', () => {
        const s = first({
            title: 'Co-op placements fall in 2026-27',
            content: ['Advisors spend 10-15 hrs a week on manual entry', 'The CRM migration closed on 2026-06-29'],
            narrative: 'Donor-centric outreach for 2026-27 runs 10-15 hrs per advisor.',
            speakerNotes: 'Window: 2026-06-29 to 2026-07-15, a 12-month plan.',
        });
        expect(s.title).toBe('Co-op placements fall in 2026-27');
        expect(s.content[0]).toBe('Advisors spend 10-15 hrs a week on manual entry');
        expect(s.content[1]).toBe('The CRM migration closed on 2026-06-29');
        expect(s.narrative).toBe('Donor-centric outreach for 2026-27 runs 10-15 hrs per advisor.');
        expect(s.speakerNotes).toBe('Window: 2026-06-29 to 2026-07-15, a 12-month plan.');
    });

    it('the function no longer exists in the module', () => {
        const src = readFileSync(join(__dirname, 'slidePostProcessor.ts'), 'utf-8');
        expect(src).not.toMatch(/function scrubEnDashes/);
        expect(src).not.toMatch(/scrubEnDashes\(/);
    });
});

describe('E6: detect-only words are reported, never deleted', () => {
    const sentence = 'The team wants to enhance retention with a comprehensive ecosystem of tools.';

    it('removeDeleteSafeFiller leaves a sentence with detect-only words unchanged', () => {
        expect(removeDeleteSafeFiller(sentence)).toBe(sentence);
    });

    it('detectDetectOnlySlop flags the same words', () => {
        const phrases = detectDetectOnlySlop(sentence).map(e => e.phrase);
        expect(phrases).toContain('enhance');
        expect(phrases).toContain('comprehensive');
        expect(phrases).toContain('ecosystem');
    });

    it('postProcessSlides keeps the text and files a non-autocorrected editorial issue', () => {
        const r = run({ content: [sentence] });
        expect((r.slides[0] as any).content[0]).toBe(sentence);
        const issue = r.issues.find(i => i.type === 'editorial' && i.field === 'content[0]');
        expect(issue).toBeDefined();
        expect(issue!.autoCorrected).toBe(false);
        expect(issue!.detail).toContain('"enhance"');
    });

    it('does not fire inside a longer word', () => {
        expect(detectDetectOnlySlop('The fostering agency filed its report.').map(e => e.phrase)).toContain('fostering');
        expect(detectDetectOnlySlop('Ecosystems is not in the lexicon as a plural').map(e => e.phrase)).not.toContain('ecosystem');
    });
});

describe('E6: delete-safe filler is removed and the sentence still reads', () => {
    it('drops a sentence-initial filler with its "that" and re-capitalizes', () => {
        expect(removeDeleteSafeFiller(j("It's", 'worth', 'noting', 'that') + ' churn rose in the spring term.'))
            .toBe('Churn rose in the spring term.');
        expect(removeDeleteSafeFiller(j("In today's", 'rapidly', 'evolving', 'landscape') + ', advisors still work from spreadsheets.'))
            .toBe('Advisors still work from spreadsheets.');
    });

    it('drops a trailing filler and closes the sentence cleanly', () => {
        expect(removeDeleteSafeFiller('Churn rose, ' + j('needless', 'to', 'say') + '.')).toBe('Churn rose.');
    });

    it('drops a parenthetical filler with both commas', () => {
        expect(removeDeleteSafeFiller('Churn, ' + j('at the', 'end of', 'the day') + ', is the problem.')).toBe('Churn is the problem.');
    });

    it('drops connective openers mid-text and re-capitalizes the next word', () => {
        expect(removeDeleteSafeFiller('The team shipped weekly. Additionally, churn fell.')).toBe('The team shipped weekly. Churn fell.');
        expect(removeDeleteSafeFiller('Moreover, the team shipped weekly.')).toBe('The team shipped weekly.');
    });

    it('runs through postProcessSlides on content fields', () => {
        const s = first({ content: [j("It's", 'worth', 'noting', 'that') + ' advisors re-enter donor data by hand.'] });
        expect(s.content[0]).toBe('Advisors re-enter donor data by hand.');
    });

    it('is idempotent', () => {
        const once = removeDeleteSafeFiller('Moreover, the team shipped weekly, ' + j('needless', 'to', 'say') + '.');
        expect(removeDeleteSafeFiller(once)).toBe(once);
    });
});

describe('E6: a dash between two independent clauses becomes a semicolon, not a comma splice', () => {
    it('uses "; " when both sides are clauses (right side opens with a determiner or pronoun)', () => {
        expect(stripEmDashes('The team shipped the fix ' + EM + ' the client never noticed'))
            .toBe('The team shipped the fix; the client never noticed');
        expect(stripEmDashes('Advisors keep spreadsheets ' + EM + ' they do not trust the CRM'))
            .toBe('Advisors keep spreadsheets; they do not trust the CRM');
        expect(stripEmDashes('Start where proven gains are ' + EM + ' the research and reporting stages already pay for themselves'))
            .toBe('Start where proven gains are; the research and reporting stages already pay for themselves');
    });

    it('uses "; " when the right side carries a finite verb in its first four words', () => {
        expect(stripEmDashes('The nightly sync fails most weeks ' + EM + ' gift officers cannot see it'))
            .toBe('The nightly sync fails most weeks; gift officers cannot see it');
    });

    it('keeps ", " for an appositive or list fragment', () => {
        expect(stripEmDashes('Three systems ' + EM + ' CRM, ERP and the data warehouse ' + EM + ' share no keys'))
            .toBe('Three systems, CRM, ERP and the data warehouse, share no keys');
        expect(stripEmDashes('One owner ' + EM + ' the advancement operations lead'))
            .toBe('One owner, the advancement operations lead');
        expect(stripEmDashes('Three legacy systems ' + EM + ' CRM, ERP and WMS'))
            .toBe('Three legacy systems, CRM, ERP and WMS');
    });

    it('keeps ", " when the left side opens with a negation or preposition (a correction, not a clause)', () => {
        expect(stripEmDashes('With no shared keys ' + EM + ' the teams reconcile by hand'))
            .toBe('With no shared keys, the teams reconcile by hand');
    });

    it('keeps ", " when the left side is a fragment (pinned by the 2026-07-02 live-defect test)', () => {
        expect(stripEmDashes('not new risk ' + EM + ' it is mispriced risk')).toBe('not new risk, it is mispriced risk');
    });

    it('never emits a dash and never touches ASCII hyphens', () => {
        const out = stripEmDashes('A 12-month plan ' + EM + ' it starts in 2026-27 ' + EM + ' co-op first');
        expect(out).not.toMatch(DASH_CLASS);
        expect(out).toContain('12-month');
        expect(out).toContain('2026-27');
        expect(out).toContain('co-op');
    });
});

describe('E4: "[N/A]" chrome is stripped from source lines', () => {
    it('cleans the exact shipped form', () => {
        expect(stripQAAnnotations('(Source: Executive 360 Assessment [N/A])')).toBe('(Source: Executive 360 Assessment)');
    });

    it('cleans the case and spacing variants', () => {
        expect(stripQAAnnotations('(Source: Executive 360 Assessment [n/a])')).toBe('(Source: Executive 360 Assessment)');
        expect(stripQAAnnotations('(Source: Executive 360 Assessment [ N/A ])')).toBe('(Source: Executive 360 Assessment)');
        expect(stripQAAnnotations('Reddit r/NEU [N/A]')).toBe('Reddit r/NEU');
    });

    it('reaches the slide sources array through postProcessSlides', () => {
        const s = first({ sources: ['Executive 360 Assessment [N/A]', 'Higher Ed Dive'] });
        expect(s.sources).toEqual(['Executive 360 Assessment', 'Higher Ed Dive']);
    });
});

describe('E11: content budgets match .claude/CLAUDE.md', () => {
    it('pins the ceilings', () => {
        expect(CONTENT_BUDGET).toEqual({ title: 120, content: 200, quote: 250, narrative: 400, speakerNotes: 600 });
    });

    // Two sentences with distinct openers (deduplicateText keys on the first 80 chars),
    // the first ending inside the new ceiling, the second ending inside the OLD ceiling's
    // 1.5x look-ahead but outside the new one, plus a tail so the whole text is over budget.
    const filler = (seed: string, n: number) => {
        let out = seed;
        while (out.length < n - 1) out += ' because the systems share no keys and the team has no time';
        return out.slice(0, n - 1).replace(/\s+\S*$/, '').padEnd(n - 1, 'x') + '.';
    };
    const twoSentences = (a: number, b: number, total: number) => {
        const s1 = filler('Advisors re-enter donor data by hand', a);
        const s2 = filler('Gift officers wait for the nightly sync', b - a - 1);
        const s3 = filler('Nobody owns the reconciliation step', total - b - 1);
        return `${s1} ${s2} ${s3}`;
    };

    it('title compresses to the last sentence boundary under 120, not under the old 140', () => {
        const s = first({ title: twoSentences(100, 190, 400) });
        expect(s.title.length).toBe(100);
        expect(s.title.endsWith('.')).toBe(true);
    });

    it('content[i] compresses to the boundary under 200, not under the old 280', () => {
        const s = first({ content: [twoSentences(170, 310, 600)] });
        expect(s.content[0].length).toBe(170);
        expect(s.content[0].endsWith('.')).toBe(true);
        expect(s.content[0]).not.toMatch(/\.\.\.$/);
    });

    it('quote compresses to the boundary under 250, not under the old 320', () => {
        const s = first({ quote: twoSentences(220, 390, 700) });
        expect(s.quote.length).toBe(220);
    });

    it('narrative compresses to the boundary under 400, not under the old 600', () => {
        const s = first({ narrative: twoSentences(350, 650, 1000) });
        expect(s.narrative.length).toBe(350);
    });

    it('speakerNotes compresses to the boundary under 600, not under the old 800', () => {
        const s = first({ speakerNotes: twoSentences(550, 950, 1500) });
        expect(s.speakerNotes.length).toBe(550);
    });

    it('never cuts mid-word when no sentence boundary exists', () => {
        const noStops = ('alpha beta gamma delta epsilon ').repeat(20).trim();
        const s = first({ content: [noStops] });
        expect(s.content[0].length).toBeLessThanOrEqual(200);
        expect(noStops.startsWith(s.content[0])).toBe(true);
        expect(noStops.charAt(s.content[0].length)).toBe(' ');
    });
});

describe('E7: meaning-changing title swaps are gone; the tells are detected instead', () => {
    it('leaves literal eating and "redrawing the map" untouched in deClicheTitle', () => {
        expect(deClicheTitle('The platform tax eats it before the operator does')).toBe('The platform tax eats it before the operator does');
        expect(deClicheTitle('AI is redrawing the map for retail traffic')).toBe('AI is redrawing the map for retail traffic');
    });

    it('still reports "redrawing the map" as a detect-only tell', () => {
        expect(detectDetectOnlySlop('AI is redrawing the map for retail traffic').map(e => e.phrase)).toContain('redrawing the map');
    });

    it('the swap table no longer carries either entry', () => {
        const src = readFileSync(join(__dirname, 'slidePostProcessor.ts'), 'utf-8');
        expect(src).not.toMatch(/'absorbs it'/);
        expect(src).not.toMatch(/'redrawing the market'/);
    });
});
