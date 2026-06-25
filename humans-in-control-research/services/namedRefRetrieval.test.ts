import { describe, it, expect } from 'vitest';
import { extractNamedReferences } from './chunkRetrieval';
import { uploadSyntheticUrl } from './wikiService';
import { stripModelNameAsSource } from './slidePostProcessor';

// 2026-06-25 - guards the article-capture + by-name-retrieval fixes
// (plans/article-capture-and-manifest-retrieval-diagnosis-2026-06-25.md).

describe('extractNamedReferences', () => {
    it('pulls a double-quoted document name', () => {
        const refs = extractNamedReferences('What does "Crowdfunding Survival (Thrive-ival) Guide" say?');
        expect(refs).toContain('Crowdfunding Survival (Thrive-ival) Guide');
    });

    it('pulls curly-quoted names', () => {
        const refs = extractNamedReferences('Summarize “Donor Retention Playbook” for me');
        expect(refs).toContain('Donor Retention Playbook');
    });

    it('pulls explicit filenames (quoted or bare)', () => {
        const refs = extractNamedReferences('compare CASE Insights 2025.pdf against the interviews');
        expect(refs.some(r => /CASE Insights 2025\.pdf/i.test(r))).toBe(true);
    });

    it('returns empty for a plain question with no named doc', () => {
        expect(extractNamedReferences('what are the top fundraising themes?')).toEqual([]);
    });

    it('ignores trivially short / stray quotes', () => {
        expect(extractNamedReferences('say "ok" then continue')).toEqual([]);
    });

    it('caps at a few references', () => {
        const many = '"Doc One Alpha" "Doc Two Beta" "Doc Three Gamma" "Doc Four Delta" "Doc Five Epsilon"';
        expect(extractNamedReferences(many).length).toBeLessThanOrEqual(4);
    });
});

describe('uploadSyntheticUrl - content-stable (no engagement slug)', () => {
    it('is identical across engagements for the same file', () => {
        const a = uploadSyntheticUrl('Riley Quinn - Interview.txt');
        const b = uploadSyntheticUrl('Riley Quinn - Interview.txt');
        expect(a).toBe(b);
        expect(a).toBe('upload://Liz%20Quinn%20-%20Interview.txt');
        expect(a).not.toMatch(/engagement|objective|identify-/i);
    });
});

describe('stripModelNameAsSource - kills the (Source: Gemini) fabrication', () => {
    it('removes a parenthetical model-name source', () => {
        const out = stripModelNameAsSource('Donors expect personalization (Source: Gemini).');
        expect(out).not.toMatch(/Source:\s*Gemini/i);
        expect(out).toContain('Donors expect personalization');
    });

    it('removes bracketed + bare model-source variants', () => {
        expect(stripModelNameAsSource('Claim [Source: Claude]')).not.toMatch(/Source/i);
        expect(stripModelNameAsSource('Claim. Source: the model')).not.toMatch(/Source:\s*the model/i);
    });

    it('PRESERVES legitimate named sources', () => {
        const ok = 'Co-op matching is fragmented (Source: Client Uploads).';
        expect(stripModelNameAsSource(ok)).toContain('Source: Client Uploads');
        const ok2 = 'Churn rose (Source: Higher Ed Dive).';
        expect(stripModelNameAsSource(ok2)).toContain('Source: Higher Ed Dive');
    });
});
