import { describe, it, expect } from 'vitest';
import { isCompleteSkillPatch, patchAlreadyPresent } from './learningEngine';

// 2026-06-23 — guards the fix for the ungated skill-patch loop. applySkillPatch
// previously wrote a Gemini-synthesized "under-80-word" patch verbatim into a
// live SKILL.md with no gate, so truncated fragments + near-duplicates accreted
// into the former deck-narrative-composer/SKILL.md (now deck-composer). These tests lock the two new guards
// (the evaluateConstraint gate is already covered by constraintQualityGate).

describe('isCompleteSkillPatch — rejects truncated LLM output', () => {
    it('accepts a complete sentence ending in terminal punctuation', () => {
        expect(isCompleteSkillPatch(
            'When generating presentations, always include a title page and a table of contents.'
        ).ok).toBe(true);
    });

    it('rejects a patch with no terminal punctuation (truncated mid-clause)', () => {
        // The exact shape that corrupted the skill: cut at max-tokens.
        expect(isCompleteSkillPatch(
            'begin with a title page and table of contents. Establish a clear'
        ).ok).toBe(false);
        expect(isCompleteSkillPatch(
            'Ensure all slides are fully populated with comprehensive'
        ).ok).toBe(false);
        expect(isCompleteSkillPatch(
            'always include a title page, a table of contents, and a structured narrative framework with'
        ).ok).toBe(false);
    });

    it('rejects a patch ending in a trailing comma', () => {
        expect(isCompleteSkillPatch(
            'always produce comprehensive, highly detailed slides containing specific evidence, quotes,'
        ).ok).toBe(false);
    });

    it('rejects a fragment that begins mid-sentence with a connective', () => {
        expect(isCompleteSkillPatch(
            'and a structured table of contents that establishes a clear narrative framework.'
        ).ok).toBe(false);
    });

    it('rejects empty / whitespace', () => {
        expect(isCompleteSkillPatch('').ok).toBe(false);
        expect(isCompleteSkillPatch('   ').ok).toBe(false);
    });
});

describe('patchAlreadyPresent — dedupes restatements', () => {
    const skill = [
        '## Learned behaviors',
        '',
        '<!-- learned behavior added 2026-06-18 from 38 feedback signals -->',
        'When generating presentations, always include a title page, a table of contents, and a structured narrative framework with clear themes.',
        '',
    ].join('\n');

    it('detects a near-duplicate restatement of an existing learned behavior', () => {
        expect(patchAlreadyPresent(
            skill,
            'When generating presentations, always include a title page, a table of contents, and a structured narrative framework with clear themes and clear briefs.'
        )).toBe(true);
    });

    it('does not flag a genuinely distinct instruction', () => {
        expect(patchAlreadyPresent(
            skill,
            'For all presentation outputs, eliminate redundant source citations and align sources directly beneath quotes.'
        )).toBe(false);
    });

    it('returns false on a skill with no prior learned behaviors', () => {
        expect(patchAlreadyPresent('## Learned behaviors\n', 'Some new instruction.')).toBe(false);
    });
});
