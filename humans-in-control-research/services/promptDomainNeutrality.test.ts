import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 2026-06-24 - Regression guard for the Northeastern/advancement data-poisoning
// fix. HiC was originally built for a Northeastern co-op/advancement engagement,
// so higher-ed/fundraising EXAMPLE content had been hardcoded into the always-
// injected generation prompts - poisoning deliverables for retail/healthcare/
// fintech/any other industry pack. We neutralized those few-shot examples (the
// SLIDE OUTPUT PROTOCOL, persona-title archetypes, diagnosis/action-title
// examples, theme examples, gap questions, the cross-engagement injection, the
// UI goal placeholder) and added a STRUCTURE-ONLY inoculation header.
//
// This test fails if any of a small set of UNAMBIGUOUS higher-ed/advancement
// CONTENT phrases (each with ZERO legitimate use - not a brand token, not a
// keyword-router entry, not a domain-gated lens) creeps back into the core
// prompt-building files. NU-brand references ("Northeastern" as the NU brand),
// the goal-gated analyticalLensService fundraising lens, and the multi-industry
// archetype/routing keyword sets are intentionally NOT covered here.
const PROMPT_FILES = [
    'corpusChatService.ts',
    'geminiService.ts',
    'deliverableFrameworks.ts',
    'knowledgeGapFinder.ts',
    'briefParser.ts',
    'dynamicPromptSuggestions.ts',
    'prompts/narrativeComposerPrompt.ts',
];

// Phrases verified to have ZERO legitimate use across the SPA on 2026-06-24.
const BANNED_CONTENT_PHRASES = [
    'advancement officer',
    'co-op scarcity',
    'co-op readiness',
    'first-generation student',
    'donor view',
    'major-gift conversion',
    'alumni giving',
];

describe('prompt domain-neutrality guard (no hardcoded Northeastern/advancement content)', () => {
    for (const f of PROMPT_FILES) {
        it(`${f} contains no banned higher-ed/advancement example content`, () => {
            const txt = readFileSync(resolve(__dirname, '..', 'services', f), 'utf-8').toLowerCase();
            const hits = BANNED_CONTENT_PHRASES.filter(p => txt.includes(p));
            expect(hits, `banned content phrases found in ${f}: ${hits.join(', ')}`).toEqual([]);
        });
    }
});
