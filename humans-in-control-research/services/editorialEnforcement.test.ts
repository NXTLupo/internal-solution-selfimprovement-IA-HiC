import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripAntithesisTitle, applyMetaphorSubs, sanitizeQuoteField } from './slidePostProcessor';

// E2 guards (2026-07-02, artifact-total-elevation plan). Every case below shipped VERBATIM on the
// 2026-07-02 live Nationwide deck - these are regression exemplars, not hypotheticals.

describe('E2: antithesis title rewrite (protocol rule 4, deterministic)', () => {
    it('rewrites the live deck leaks to the positive claim', () => {
        expect(stripAntithesisTitle('A contextual intelligence layer, not a single-purpose tool'))
            .toBe('A contextual intelligence layer');
        expect(stripAntithesisTitle('A living plan, not a PDF')).toBe('A living plan');
    });
    it('never touches legitimate mid-prose negation or normal titles', () => {
        const t = 'Farms with a plan recover from disruption faster';
        expect(stripAntithesisTitle(t)).toBe(t);
        const prose = 'The gap is structural, not the student, and closes with coaching capacity';
        // three-clause sentence does not match the whole-field antithesis shape
        expect(stripAntithesisTitle(prose)).toBe(prose);
    });
});

describe('E2: banned-metaphor substitutions (CLAUDE.md metaphor ban)', () => {
    it('replaces the live-deck metaphor with the literal verb', () => {
        expect(applyMetaphorSubs('Engaged customers are higher quality and open the door to quotes and written business.'))
            .toBe('Engaged customers are higher quality and enable quotes and written business.');
        expect(applyMetaphorSubs('Phase one earns the right to the advanced capabilities'))
            .toBe('Phase one qualifies for the advanced capabilities');
    });
});

describe('E2: quote hygiene (complete sentences only)', () => {
    it('drops the live-deck lowercase fragment', () => {
        expect(sanitizeQuoteField('installing fire detection and protection equipment.')).toBe('');
    });
    it('capitalizes a sentence-like lowercase start, keeps clean quotes verbatim', () => {
        expect(sanitizeQuoteField('contingency plans help you respond to a crisis and resume normal operations quickly.'))
            .toBe('Contingency plans help you respond to a crisis and resume normal operations quickly.');
        const clean = '"I applied to 60 co-ops and heard back from 4."';
        expect(sanitizeQuoteField(clean)).toBe(clean);
    });
});

describe('E2: gate + protocol wiring (source asserts)', () => {
    const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');
    it('postProcessSlides runs the editorial pass', () => {
        const src = read('services/slidePostProcessor.ts');
        expect(src).toMatch(/E2 EDITORIAL ENFORCEMENT/);
        expect(src).toMatch(/stripAntithesisTitle\(applyMetaphorSubs\(s\.title\)\)/);
        expect(src).toMatch(/sanitizeQuoteField\(applyMetaphorSubs\(_q0\)\)/);
    });
    it('the deck authority demands judgment titles on EVERY content slide + deck-level evidence diversity', () => {
        // 2026-10-30 (WS-3 P5): these rules used to sit in an unreferenced CONSULTING_MANDATES constant in
        // corpusChatService (dead text the model never saw). They now live in deck-composer section 6, the
        // one skill DECK MODE injects whole, so the assertion follows them there.
        const src = read('../.claude/skills/deck-composer/SKILL.md');
        expect(src).toMatch(/THIS APPLIES TO EVERY CONTENT SLIDE/);
        expect(src).toMatch(/DECK-LEVEL EVIDENCE DIVERSITY \(MANDATORY\)/);
        expect(src).toMatch(/QUOTES ARE COMPLETE SENTENCES/);
        const chat = read('services/corpusChatService.ts');
        expect(chat).not.toMatch(/const CONSULTING_MANDATES/);
    });
    it('the unified gate registers the editorial scope', () => {
        const gate = readFileSync(join(__dirname, '..', '..', '.claude', 'hooks', 'quality_gate.py'), 'utf-8');
        expect(gate).toMatch(/"editorial": editorial_quality\.check/);
    });
});

describe('E1: cache-aligned prompt architecture (source asserts)', () => {
    const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf-8');
    it('the marker constant is single-sourced and used by all three heavy paths', () => {
        const router = read('services/aiRouter.ts');
        expect(router).toMatch(/export const HIC_CACHE_BREAK/);
        expect(router).toMatch(/export function stripCacheMarkers/);
        const chat = read('services/corpusChatService.ts');
        expect(chat).toMatch(/HIC_CACHE_BREAK/);
        expect(chat).toMatch(/ENGAGEMENT CONTEXT \(this research run\)/);
        const gem = read('services/geminiService.ts');
        expect(gem).toMatch(/HIC_CACHE_BREAK/);
        // direct Gemini SDK paths strip the Anthropic-only marker
        expect(gem).toMatch(/stripCacheMarkers\(this\.systemInstructionCached\)/);
        expect(gem).toMatch(/stripCacheMarkers\(systemInstruction\)/);
    });
    it('the stable core no longer interleaves engagement-varying values', () => {
        const chat = read('services/corpusChatService.ts');
        // the role line must not carry counts/goal anymore
        expect(chat).not.toMatch(/analyst operating in the NXT Humans Chat-Driven Research Workbench\.\nYou have access to \$\{context\.sourceCount\}/);
        const gem = read('services/geminiService.ts');
        expect(gem).not.toMatch(/CORE OBJECTIVE: Produce consulting-grade deliverables from research evidence\.\s*\n\s*RESEARCH GOAL/);
        // stale hardcoded brand values removed from the session prompt (never-hardcode doctrine)
        expect(gem).not.toMatch(/Bebas Neue headlines, Archivo body, JetBrains Mono code/);
    });
    it('the proxy converts markers to breakpoints and strips them on non-Anthropic paths', () => {
        const proxy = readFileSync(join(__dirname, '..', 'proxy', 'app.py'), 'utf-8');
        expect(proxy).toMatch(/HIC_CACHE_BREAK = /);
        expect(proxy).toMatch(/def _strip_cache_markers/);
        expect(proxy).toMatch(/system split into .* blocks/);
        expect(proxy).toMatch(/GEMINI_CACHE_CREATE_ON_SEEN/);
    });
});
