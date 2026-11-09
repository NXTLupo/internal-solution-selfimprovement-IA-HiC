// 2026-09-30 (plan Stage 0.5) - the Claude Opus 5.5 request contract, pinned.
// Vendor facts (claude-api reference, 2026-09-25): thinking always on (adaptive
// only; budgets / disabled are 400s), depth via output_config.effort (default
// medium), no temperature/top_p/top_k, no forced tool_choice, no prefill.
import { describe, it, expect } from 'vitest';
import {
    CLAUDE_REASONING_MODEL, CLAUDE_STRUCTURED_MODEL, applyAnthropicRequestDefaults,
    effortForArtifact, effortFromSkillHint, maxEffort, claudeUsesAdaptiveThinking,
    claudeThinkingAlwaysOn, extractThinkingSummary, extractClaudeText,
} from './claudeModelPolicy';

describe('claudeModelPolicy - model ids', () => {
    it('the reasoning model is Claude Opus 5.5 and the structured tier is Sonnet 5.5', () => {
        expect(CLAUDE_REASONING_MODEL).toBe('claude-opus-5-5');
        expect(CLAUDE_STRUCTURED_MODEL).toBe('claude-sonnet-5-5');
        expect(claudeUsesAdaptiveThinking(CLAUDE_REASONING_MODEL)).toBe(true);
        expect(claudeThinkingAlwaysOn(CLAUDE_REASONING_MODEL)).toBe(true);
        expect(claudeUsesAdaptiveThinking('claude-opus-4-8')).toBe(true);
        expect(claudeThinkingAlwaysOn('claude-opus-4-8')).toBe(false);
        expect(claudeUsesAdaptiveThinking('claude-haiku-4-5')).toBe(false);
        expect(claudeUsesAdaptiveThinking('gemini-3.5-flash')).toBe(false);
    });
});

describe('claudeModelPolicy - effort policy (plan 0.5.3)', () => {
    it('xhigh for PRD / strategy / recommendations / report / proto code', () => {
        for (const k of ['#prd', 'prd-feature', 'strategy', '#recs', 'recommendations', 'report', 'proto']) {
            expect(effortForArtifact(k)).toBe('xhigh');
        }
    });
    it('medium for schema-bound extraction and planning; low for utility; high otherwise', () => {
        expect(effortForArtifact('theme-breadth')).toBe('medium');
        expect(effortForArtifact('research-plan')).toBe('medium');
        expect(effortForArtifact('gap-matrix')).toBe('medium');
        expect(effortForArtifact('wiki-compile')).toBe('low');
        expect(effortForArtifact('topic-label')).toBe('low');
        expect(effortForArtifact('#personas')).toBe('high');
        expect(effortForArtifact('case-study')).toBe('high');
        expect(effortForArtifact(undefined)).toBe('high');
    });
    it('a skill hint can raise the policy floor, never lower it', () => {
        expect(effortFromSkillHint('max')).toBe('xhigh');
        expect(effortFromSkillHint('bogus')).toBeNull();
        expect(maxEffort('xhigh', 'medium')).toBe('xhigh');
        expect(maxEffort('high', 'max')).toBe('max');
        expect(maxEffort('medium', null)).toBe('medium');
    });
});

describe('claudeModelPolicy - applyAnthropicRequestDefaults', () => {
    it('removes the four 400s on Opus 5.5: budget_tokens, disabled thinking, sampling params, forced tool_choice', () => {
        const out = applyAnthropicRequestDefaults({
            model: CLAUDE_REASONING_MODEL,
            max_tokens: 8000,
            temperature: 0.1,
            top_p: 0.9,
            top_k: 40,
            thinking: { type: 'enabled', budget_tokens: 4000 },
            tool_choice: { type: 'any' },
            messages: [{ role: 'user', content: 'x' }],
            _hicKind: 'research-plan',
        });
        expect(out.temperature).toBeUndefined();
        expect(out.top_p).toBeUndefined();
        expect(out.top_k).toBeUndefined();
        expect(out.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
        expect(out.output_config).toEqual({ effort: 'medium' });
        expect(out.tool_choice).toEqual({ type: 'auto' });
        expect((out as any)._hicKind).toBeUndefined();
        expect(out.messages).toHaveLength(1);
    });
    it('keeps an explicit effort and display, and preserves block_binding', () => {
        const out = applyAnthropicRequestDefaults({
            model: CLAUDE_REASONING_MODEL,
            thinking: { type: 'disabled', display: 'omitted', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
            output_config: { effort: 'low' },
            _hicEffort: 'max',
        });
        expect(out.thinking).toEqual({ type: 'adaptive', display: 'omitted', block_binding: { prefix_mismatch_behavior: 'drop_block' } });
        expect(out.output_config.effort).toBe('low');   // caller's explicit value wins over the hint
    });
    it('_hicEffort fills the effort when the caller sent none', () => {
        const out = applyAnthropicRequestDefaults({ model: CLAUDE_REASONING_MODEL, _hicEffort: 'xhigh' });
        expect(out.output_config.effort).toBe('xhigh');
    });
    it('leaves non-adaptive Claude and non-Claude bodies alone (only private fields removed)', () => {
        const haiku = applyAnthropicRequestDefaults({ model: 'claude-haiku-4-5', temperature: 0.2, thinking: { type: 'enabled', budget_tokens: 2048 }, _hicKind: 'x' });
        expect(haiku.temperature).toBe(0.2);
        expect(haiku.thinking).toEqual({ type: 'enabled', budget_tokens: 2048 });
        expect((haiku as any)._hicKind).toBeUndefined();
        const gem = applyAnthropicRequestDefaults({ model: 'gemini-3.5-flash', temperature: 0.7 });
        expect(gem.temperature).toBe(0.7);
    });
    it('is idempotent', () => {
        const once = applyAnthropicRequestDefaults({ model: CLAUDE_REASONING_MODEL, temperature: 1, _hicKind: '#prd' });
        const twice = applyAnthropicRequestDefaults(once);
        expect(twice).toEqual(once);
    });
});

describe('claudeModelPolicy - response helpers', () => {
    const resp = {
        content: [
            { type: 'thinking', thinking: 'Weighing the two framings.', signature: 'sig' },
            { type: 'text', text: 'Final ' },
            { type: 'text', text: 'answer.' },
        ],
        stop_reason: 'end_turn',
    };
    it('splits summarized thinking from visible text', () => {
        expect(extractThinkingSummary(resp)).toBe('Weighing the two framings.');
        expect(extractClaudeText(resp)).toBe('Final answer.');
    });
});
