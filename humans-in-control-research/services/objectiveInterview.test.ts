import { describe, it, expect } from 'vitest';
import { parseInterviewResponse } from './objectiveInterview';

// 2026-06-25 - guards the Interview-Me delimiter parser. Delimiter output (not
// JSON) is deliberate so quote-heavy objective prose can never break parsing.
describe('parseInterviewResponse', () => {
    it('parses a question turn', () => {
        const r = parseInterviewResponse('<<<QUESTION>>>\nWhat decision will this research inform?');
        expect(r).toEqual({ kind: 'question', question: 'What decision will this research inform?' });
    });

    it('parses an objective + rationale turn (quote-heavy, no escaping)', () => {
        const r = parseInterviewResponse(
            '<<<OBJECTIVE>>>\nDetermine why mid-market buyers abandon the "self-serve" trial within 14 days, to inform Q3 onboarding investment.\n<<<RATIONALE>>>\nPinned the decision, audience, and time window.');
        expect(r.kind).toBe('objective');
        if (r.kind === 'objective') {
            expect(r.objective).toContain('mid-market buyers abandon the "self-serve" trial');
            expect(r.rationale).toContain('Pinned the decision');
        }
    });

    it('tolerates a stray code fence', () => {
        const r = parseInterviewResponse('```\n<<<QUESTION>>>\nWho is the primary audience?\n```');
        expect(r).toEqual({ kind: 'question', question: 'Who is the primary audience?' });
    });

    it('falls back to treating a bare line as the next question', () => {
        const r = parseInterviewResponse('What is the time horizon for this decision?');
        expect(r).toEqual({ kind: 'question', question: 'What is the time horizon for this decision?' });
    });

    it('throws on empty', () => {
        expect(() => parseInterviewResponse('   ')).toThrow();
    });
});
