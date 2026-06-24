import { describe, it, expect } from 'vitest';
import { scrubArtifactHtmlMeta } from './slidePostProcessor';

// 2026-06-24 - guards the HTML-safe meta scrub for the client-orchestrated HTML
// artifact path (#brief/#report/#explainer/...). A live #brief leaked "the only
// corpus-confirmed model ..." because that path ran no meta strip. The scrub must
// remove corpus/process self-references WITHOUT mangling HTML tags or <pre> content.
describe('scrubArtifactHtmlMeta', () => {
    it('strips the corpus-confirmed compound adjective (the live failure)', () => {
        const inp = '<h1>One holding company is the only corpus-confirmed model for AI enrollment</h1>';
        const out = scrubArtifactHtmlMeta(inp);
        expect(out).toContain('the only model for AI enrollment');
        expect(out.toLowerCase()).not.toContain('corpus-confirmed');
    });

    it('strips the research-/data-/evidence- compound variants', () => {
        expect(scrubArtifactHtmlMeta('a research-validated approach').toLowerCase()).not.toContain('research-validated');
        expect(scrubArtifactHtmlMeta('a data-backed claim').toLowerCase()).not.toContain('data-backed');
        expect(scrubArtifactHtmlMeta('an evidence-sourced finding').toLowerCase()).not.toContain('evidence-sourced');
    });

    it('strips "the corpus confirms/names ..." lead-ins and "based on the research,"', () => {
        expect(scrubArtifactHtmlMeta('The corpus confirms that churn is the failure.')).toContain('churn is the failure.');
        expect(scrubArtifactHtmlMeta('Based on the research, churn is the failure.')).toContain('churn is the failure.');
    });

    it('does NOT mangle HTML tags or unrelated content', () => {
        const html = '<!doctype html><html><head><style>:root{--ink:#141414}</style></head><body><p class="x">Clean prose about retail.</p></body></html>';
        expect(scrubArtifactHtmlMeta(html)).toBe(html);
    });

    it('is a no-op on empty/non-string', () => {
        expect(scrubArtifactHtmlMeta('')).toBe('');
        expect(scrubArtifactHtmlMeta(null as unknown as string)).toBe(null as unknown as string);
    });
});
