import { describe, it, expect } from 'vitest';
import { auditSubQuestionCoverage, type SubQuestion } from './researchPlanner';

// WS-F: deterministic objective-supremacy coverage audit. Pure function - real behavioral asserts.

const sq = (id: string, question: string, priority: SubQuestion['priority'], entities: string[] = []): SubQuestion => ({
    id, question, priority, angle: 'evidence', expected_evidence_types: ['academic'], expected_named_entities: entities,
});

describe('WS-F auditSubQuestionCoverage', () => {
    it('marks a sub-question covered when >=60% of its salient terms appear in the corpus', () => {
        const corpus = 'Student retention and advising outcomes improve cohort persistence across programs.';
        const audit = auditSubQuestionCoverage(corpus, [sq('SQ1', 'How does advising affect student retention and persistence?', 'high')]);
        expect(audit.perQuestion[0].status).toBe('covered');
        expect(audit.openHighPriority).toEqual([]);
        expect(audit.coverage).toBe(1);
    });

    it('flags an uncovered HIGH-priority sub-question in openHighPriority (objective-supremacy alarm)', () => {
        const corpus = 'Student retention and advising outcomes improve cohort persistence.';
        const audit = auditSubQuestionCoverage(corpus, [
            sq('SQ1', 'How does advising affect retention?', 'high'),
            sq('SQ2', 'What are the cybersecurity ransomware breach litigation exposures?', 'high'),
        ]);
        const sq2 = audit.perQuestion.find(p => p.id === 'SQ2')!;
        expect(sq2.status).toBe('uncovered');
        expect(audit.openHighPriority).toContain('SQ2');
        expect(audit.openHighPriority).not.toContain('SQ1');
    });

    it('is deterministic and excludes low-priority from the coverage denominator', () => {
        const corpus = 'advising retention persistence';
        const sqs = [sq('SQ1', 'advising retention persistence', 'high'), sq('SQ2', 'unrelated topic xyzzy', 'low')];
        const a = auditSubQuestionCoverage(corpus, sqs);
        const b = auditSubQuestionCoverage(corpus, sqs);
        expect(a).toEqual(b);                         // deterministic
        expect(a.coverage).toBe(1);                   // low-priority SQ2 excluded from denominator
    });

    it('empty sub-questions -> zero coverage, no alarm', () => {
        const audit = auditSubQuestionCoverage('anything', []);
        expect(audit.coverage).toBe(0);
        expect(audit.openHighPriority).toEqual([]);
    });
});
