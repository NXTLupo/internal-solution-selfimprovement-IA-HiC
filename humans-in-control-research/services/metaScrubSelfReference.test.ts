import { it, expect } from 'vitest';
import { scrubArtifactHtmlMeta } from './slidePostProcessor';
it('removes a sentence whose only content is what the artifact does (live #report 2026-10-03)', () => {
    expect(scrubArtifactHtmlMeta('<p>This strategic product requirements document (PRD) synthesizes the readiness evidence for first-year students.</p>')).toBe('<p></p>');
});
