/**
 * 2026-10-20: a provided-content-only turn (reformat the attached deck) sends only the form-governing sections of the
 * grounding; the research corpus, themes, graph and source index stay out, and the contract tells the model so.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { keepProvidedContentSections, PROVIDED_CONTENT_CONTRACT, setCurrentRequestPlan, providedContentOnly } from './corpusChatService';

describe('provided-content-only grounding', () => {
    it('keeps plan, scope, brand, constraints and visual system; drops corpus, themes, graph and index', () => {
        const text = [
            '=== REQUEST PLAN (the user\'s ask as read) ===', 'Mode: generate', '=== END REQUEST PLAN ===',
            '=== ANSWER SCOPE (CRITICAL) ===', 'Respond to the latest message.', '',
            '=== CORPUS MANIFEST ===', 'sources...', '=== END CORPUS MANIFEST ===',
            '=== LEARNED CONSTRAINTS (from prior user feedback - apply to all output) ===', 'no em dash', '',
            '=== KNOWLEDGE GRAPH (794 nodes, 581 edges) ===', 'nodes...', '=== END KNOWLEDGE GRAPH ===',
            '=== THEMES (79, this engagement, ranked) ===', '[T1] theme', '=== END THEMES ===',
            '=== NXT VISUAL OUTPUT SYSTEM ===', 'tokens', '',
            '=== SOURCE ARTICLE INDEX (894 articles) ===', 'rows', '',
            '=== CORPUS (chunk-addressed, cite by pointer) ===', '[articles/x.md#c1]', '=== END CORPUS ===',
        ].join('\n');
        const out = keepProvidedContentSections(text);
        expect(out).toContain('Mode: generate');
        expect(out).toContain('Respond to the latest message.');
        expect(out).toContain('no em dash');
        expect(out).toContain('tokens');
        expect(out).not.toContain('sources...');
        expect(out).not.toContain('nodes...');
        expect(out).not.toContain('[T1] theme');
        expect(out).not.toContain('rows');
        expect(out).not.toContain('[articles/x.md#c1]');
        expect(PROVIDED_CONTENT_CONTRACT).toContain('do NOT apply');
    });

    it('the flag follows the plan', () => {
        setCurrentRequestPlan({ useOnlyProvidedContent: true });
        expect(providedContentOnly()).toBe(true);
        setCurrentRequestPlan(null);
        expect(providedContentOnly()).toBe(false);
    });

    it('the system prompt names neither the session goal nor the corpus index on a provided-content turn (2026-10-26)', () => {
        // live: a reformat cover read "briefs Northeastern stakeholders" because ENGAGEMENT CONTEXT named the session goal
        const src = fs.readFileSync(path.join(__dirname, 'corpusChatService.ts'), 'utf8');
        const block = src.slice(src.indexOf('=== ENGAGEMENT CONTEXT (this research run) ==='), src.indexOf('=== ANTI-HALLUCINATION REMINDER'));
        expect(block).toMatch(/\$\{providedContentOnly\(\)\s*\n[\s\S]*?\? 'This turn reshapes the document the user attached/);
        expect(block).toContain('${provenanceIndex && !providedContentOnly() ?');
    });
});
