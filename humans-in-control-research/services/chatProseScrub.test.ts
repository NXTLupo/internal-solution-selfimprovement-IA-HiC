/**
 * 2026-10-20: plain-prose chat replies get the same source relabeling and dash scrub the slide renderer applies.
 */
import { describe, it, expect } from 'vitest';
import { scrubChatProse, relabelInternalSourcesInProse } from './chatProseScrub';

describe('chat prose scrub', () => {
    it('relabels internal source labels and strips em dashes outside slide fences', () => {
        const reply = 'Data integration scored low because the systems do not share a record (Source: HiC Theme Synthesis: Theme Synthesis (45 themes) — Develop a unified profile). Advisors confirm it (Source: Client Uploads: Readiness Pathways Meeting Summary).';
        const out = scrubChatProse(reply);
        expect(out).not.toMatch(/HiC Theme Synthesis/);
        expect(out).toContain('(engagement research synthesis)');
        expect(out).toContain('Client document: Readiness Pathways Meeting Summary');
        expect(out).not.toContain('—');
    });

    it('leaves slide fences untouched', () => {
        const fence = ':::slide template=slides:cover brand=nxt\n{ "title": "A — B", "source": "HiC Theme Synthesis" }\n:::';
        const reply = `Here is the deck (Source: Client Uploads).\n\n${fence}\n`;
        const out = scrubChatProse(reply);
        expect(out).toContain(fence);
        expect(out).toContain('(Source: client document)');
        expect(relabelInternalSourcesInProse('Topic cluster: advisor burnout; next')).toContain('engagement research synthesis; next');
    });

    it('relabels model-written research as a source, drops backtick chrome and process openers', () => {
        const reply = 'The shift is extensively documented across the research corpus. Below is a structured breakdown of the sources.\n\nAgencies move to outcome pricing (Source: gemini (focused research)). Several confirm it (Source: Synthesis of Zoomsphere, Finalroundai +10 more). See `aws_ml_blog` and `1oetdeb`.';
        const out = scrubChatProse(reply);
        expect(out).toContain('appears across several sources');
        expect(out).not.toContain('Below is a structured breakdown');
        expect(out).not.toContain('focused research');
        expect(out).not.toContain('Synthesis of');
        expect(out).toContain('See aws_ml_blog and 1oetdeb.');
    });
});
