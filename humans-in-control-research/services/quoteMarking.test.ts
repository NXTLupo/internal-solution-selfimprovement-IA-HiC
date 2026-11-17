/**
 * Reported-quote marking + compact citation chips (2026-11-09, owner-reported slop).
 *
 * The owner read a shipped #blogpost as "complete AI slop writing". Reading the rendered page
 * rather than the metrics found two causes, both fixed deterministically and pinned here:
 *   1. Some reported quotes shipped BARE after a colon, so somebody else's words ran on in the
 *      author's voice: "A commenter described recruiters this way: Max they spend 15 seconds
 *      checking that you have no glaring red flags..." The capital mid-sentence is the tell, and
 *      any figure inside an unmarked quote reads as our own assertion.
 *   2. Every inline citation printed its full label, three times per paragraph, so the prose was
 *      unreadable between the chips.
 */
import { describe, it, expect } from 'vitest';
import { markReportedQuotes } from './htmlArtifactChain';
import { shortCiteLabel } from './citationPointerRegistry';

describe('markReportedQuotes', () => {
    it('marks the exact bare quote the owner flagged', () => {
        const input = '<p>A commenter described recruiters this way: Max they spend 15 seconds checking that you have no glaring red flags, your college and other basic signals.</p>';
        const out = markReportedQuotes(input);
        expect(out.marked).toBe(1);
        expect(out.html).toContain('this way: <q>Max they spend 15 seconds');
        expect(out.html).toContain('basic signals.</q>');
    });

    it('marks a possessive reporting phrase', () => {
        const out = markReportedQuotes(`<p>Take-home work gets the same scrutiny, in KDnuggets' words: If you get a take-home in 2026, assume you will defend decisions in a follow-up.</p>`);
        expect(out.marked).toBe(1);
        expect(out.html).toContain('<q>If you get a take-home');
    });

    it('leaves an already-quoted span alone', () => {
        const input = '<p>One commenter said: <q>paste your CV and the job description.</q></p>';
        const out = markReportedQuotes(input);
        expect(out.marked).toBe(0);
        expect(out.html).toBe(input);
    });

    it('never double-wraps on a second pass', () => {
        const once = markReportedQuotes('<p>A commenter described it this way: Max they spend 15 seconds checking the basic signals here.</p>').html;
        const twice = markReportedQuotes(once);
        expect(twice.marked).toBe(0);
        expect((twice.html.match(/<q>/g) || [])).toHaveLength(1);
    });

    it('does not swallow a citation chip into the quote', () => {
        const input = '<p>A commenter said: Max they spend 15 seconds on the basic signals. <sup class="hic-cites">r/jobs</sup></p>';
        const out = markReportedQuotes(input);
        expect(out.html).not.toContain('<q>Max they spend 15 seconds on the basic signals. <sup');
    });

    it('leaves an ordinary colon list untouched', () => {
        const input = '<p>The pipeline runs in three stages: collection, synthesis, and review.</p>';
        expect(markReportedQuotes(input).marked).toBe(0);
    });

    it('ignores a lowercase tail, which is not a reported sentence', () => {
        const input = '<p>The team described the change this way: it shipped on time and nothing broke afterwards.</p>';
        expect(markReportedQuotes(input).marked).toBe(0);
    });

    it('handles empty input', () => {
        expect(markReportedQuotes('')).toEqual({ html: '', marked: 0 });
    });
});

describe('shortCiteLabel', () => {
    it('keeps the subreddit and drops the connector prefix and date', () => {
        expect(shortCiteLabel('Reddit Deep: r/jobs (Mar 2026)')).toBe('r/jobs');
    });

    it('drops a trailing date parenthetical from a publication', () => {
        expect(shortCiteLabel('KDnuggets (Nov 2026)')).toBe('KDnuggets');
    });

    it('shortens a documentation label to its organization', () => {
        expect(shortCiteLabel('Anthropic documentation (live documentation, retrieved Nov 2026)')).toBe('Anthropic');
    });

    it('leaves an already-short label unchanged', () => {
        expect(shortCiteLabel('Ars Technica')).toBe('Ars Technica');
    });

    it('never returns an empty string', () => {
        expect(shortCiteLabel('(Mar 2026)')).toBe('(Mar 2026)');
        expect(shortCiteLabel('')).toBe('');
    });
});
