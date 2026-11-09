// canaryOverride.test.ts - WS-5 R5 (2026-10-30): the SkillOpt canary rides as a RunState instruction override.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadCanaryOverride, canaryApplies, _resetCanaryForTests } from './canaryOverride';
import { _resetRunStateForTests, beginRun, instructionOverride, getRun } from './runState';
import { bindActiveEpochFromLedger, getActiveEpochId, _resetEpochBindingForTests } from './epochOutcomeTracker';

const text = 'x'.repeat(300);
const mockFetch = (body: unknown, ok = true) => (async () => ({ ok, status: ok ? 200 : 500, json: async () => body })) as unknown as typeof fetch;

beforeEach(() => { _resetRunStateForTests(); _resetCanaryForTests(); _resetEpochBindingForTests(); beginRun({ kind: 'artifact' }); });

describe('canaryApplies', () => {
    it('matches the canary kind or the skill\'s deliverable kinds', () => {
        expect(canaryApplies({ skill_id: 'deck-composer', kind: 'strategy-slide' }, 'slides')).toBe(true);
        expect(canaryApplies({ skill_id: 'persona-architect', kind: 'persona' }, 'personas')).toBe(true);
        expect(canaryApplies({ skill_id: 'persona-architect', kind: 'persona' }, 'slides')).toBe(false);
        expect(canaryApplies({ skill_id: 'unknown', kind: 'x' }, 'x')).toBe(true);
    });
});

describe('loadCanaryOverride', () => {
    it('installs the candidate text as the override for a matching kind and records a step', async () => {
        const id = await loadCanaryOverride('slides', mockFetch({ canary: { skill_id: 'deck-composer', kind: 'strategy-slide', text, sha: 'abc', batch_id: 'b1' } }));
        expect(id).toBe('deck-composer');
        expect(instructionOverride('deck-composer')).toBe(text);
        expect(getRun().steps.some(s => s.stage === 'canary')).toBe(true);
    });
    it('leaves the run untouched when the canary is for another kind, or absent, or the proxy is down', async () => {
        expect(await loadCanaryOverride('personas', mockFetch({ canary: { skill_id: 'deck-composer', kind: 'strategy-slide', text } }))).toBeNull();
        expect(instructionOverride('deck-composer')).toBeUndefined();
        _resetCanaryForTests();
        expect(await loadCanaryOverride('slides', mockFetch({ canary: null }))).toBeNull();
        _resetCanaryForTests();
        expect(await loadCanaryOverride('slides', mockFetch({}, false))).toBeNull();
    });
    it('a retired canary is removed from the next run (overrides carry across runs by design)', async () => {
        await loadCanaryOverride('slides', mockFetch({ canary: { skill_id: 'deck-composer', kind: 'strategy-slide', text } }));
        beginRun({ kind: 'artifact' });
        expect(instructionOverride('deck-composer')).toBe(text);
        _resetCanaryForTests();
        // the cache is reset but the installed marker is gone too; re-install then retire
        await loadCanaryOverride('slides', mockFetch({ canary: { skill_id: 'deck-composer', kind: 'strategy-slide', text } }));
        (await import('./canaryOverride')).__expireCanaryCacheForTests();
        expect(await loadCanaryOverride('slides', mockFetch({ canary: null }))).toBeNull();
        expect(instructionOverride('deck-composer')).toBeUndefined();
    });
    it('a canary for another kind does not remove an override the user set by hand', async () => {
        const { setInstructionOverride } = await import('./runState');
        setInstructionOverride('deck-composer', 'hand-set override text that is long enough to count as an override for the run');
        expect(await loadCanaryOverride('slides', mockFetch({ canary: null }))).toBeNull();
        expect(instructionOverride('deck-composer')).toMatch(/^hand-set/);
    });
});

describe('bindActiveEpochFromLedger', () => {
    it('binds the ledger\'s latest epoch so outcomes attribute to it', async () => {
        const id = await bindActiveEpochFromLedger(mockFetch({ active: { epoch_id: 7, applied_at: '2026-10-30 01:00:00Z', layer: 'skill', file_path: 'x/SKILL.md', deliverable_class: '#slides', baseline_vector: { held_out: 0.6 }, target_dims: ['held_out'], floor_dims: [] } }));
        expect(id).toBe(7);
        expect(getActiveEpochId()).toBe(7);
    });
    it('no record means no active epoch', async () => {
        expect(await bindActiveEpochFromLedger(mockFetch({ active: null }))).toBeNull();
        expect(getActiveEpochId()).toBeNull();
    });
});
