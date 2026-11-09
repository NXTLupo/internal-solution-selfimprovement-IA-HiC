// canaryOverride.ts - WS-5 R5 (2026-10-30, plan harness-capability-curve-uplift).
//
// The router half of the self-evolution loop. A SkillOpt batch that passes the rung-1/2 validator
// sets a CANARY on the proxy (hic-workspace/skillopt/canary.json): one candidate skill text for one
// deliverable kind. At the start of every artifact run the SPA reads it and installs it as the
// RunState instruction override for that skill id, so production generations trial the candidate
// while the held-out gate (E4) decides whether it reaches the skill file. Promotion (APPROVE) clears
// the canary because the skill file then carries the text; a REJECT clears it too.
//
// The override is RunState (per run), never a cache: a cleared canary restores the file on the
// next turn. `loadSkillContext` and `fetchDeckComposerSkill` read `instructionOverride(skillId)`.

import { instructionOverride, setInstructionOverride, recordStep } from './runState';
import { proxyBase } from './proxyConfig';

export interface Canary {
    skill_id: string;
    kind: string;
    candidate_path?: string;
    text: string;
    batch_id?: string;
    set_at?: string;
    sha?: string;
}

/** The deliverable kinds a skill's canary applies to (the batch's KINDS map, mirrored). */
const KIND_FOR_SKILL: Record<string, string[]> = {
    'deck-composer': ['slides', 'deck', 'strategy', 'presentation', 'strategy-slide'],
    'strategy-author': ['slides', 'strategy', 'strategy-slide', 'recs'],
    'human-voice-editor': ['slides', 'strategy', 'strategy-slide', 'personas', 'recs', 'themes', 'prd', 'report'],
    'persona-architect': ['personas', 'persona'],
    'gap-analysis-evaluator': ['gap', 'gap-analysis'],
    'roadmap-builder': ['roadmap'],
    'recommendation-architect': ['recs', 'recommendation', 'recommendations'],
    'service-blueprint-mapper': ['blueprint'],
    'journey-illustrator': ['journey'],
};

let _cache: { at: number; canary: Canary | null } | null = null;
const CACHE_MS = 5 * 60_000;
/** What this module installed, so a retired canary is removed from the run it would otherwise ride on
 *  (instruction overrides carry across runs by design; see runState.beginRun). */
let _installed: { skill_id: string; text: string } | null = null;

export function _resetCanaryForTests(): void { _cache = null; _installed = null; }
export function __expireCanaryCacheForTests(): void { _cache = null; }

/** True when a canary for `skillId` applies to an artifact of `kind`. */
export function canaryApplies(canary: Pick<Canary, 'skill_id' | 'kind'>, kind: string): boolean {
    const k = String(kind || '').toLowerCase().replace(/^#/, '');
    if (!k) return false;
    if (String(canary.kind || '').toLowerCase() === k) return true;
    return (KIND_FOR_SKILL[canary.skill_id] || []).includes(k);
}

/**
 * Read the canary (cached 5 min) and install it for this run when it applies to `kind`.
 * Returns the installed skill id, or null.
 */
export async function loadCanaryOverride(kind: string, fetchImpl: typeof fetch = globalThis.fetch): Promise<string | null> {
    if (!_cache || Date.now() - _cache.at > CACHE_MS) {
        let canary: Canary | null = null;
        try {
            const resp = await fetchImpl(`${proxyBase()}/api/epochs/canary`, { signal: AbortSignal.timeout(4000) });
            if (resp.ok) {
                const j = await resp.json();
                canary = j?.canary && typeof j.canary.text === 'string' && j.canary.text.length > 200 ? j.canary : null;
            }
        } catch { canary = null; }
        _cache = { at: Date.now(), canary };
    }
    const c = _cache.canary;
    const applies = !!c && canaryApplies(c, kind);
    // a canary that was cleared (promoted or rejected) or that does not apply to this kind leaves no override behind
    if (_installed && (!applies || _installed.skill_id !== c!.skill_id || _installed.text !== c!.text)) {
        if (instructionOverride(_installed.skill_id) === _installed.text) {
            setInstructionOverride(_installed.skill_id, null);
            console.info(`[canary] ${_installed.skill_id} override removed (canary retired or not for ${kind})`);
        }
        _installed = null;
    }
    if (!applies) return null;
    if (instructionOverride(c!.skill_id) !== c!.text) {
        setInstructionOverride(c!.skill_id, c!.text);
        try { recordStep({ stage: 'canary', note: `instruction override ${c!.skill_id} (${c!.sha || 'n/a'}, batch ${c!.batch_id || 'n/a'}) for kind=${kind}` }); } catch { /* best-effort */ }
        console.info(`[canary] ${c!.skill_id} candidate installed as the instruction override for ${kind} (${c!.sha || 'no sha'})`);
    }
    _installed = { skill_id: c!.skill_id, text: c!.text };
    return c!.skill_id;
}
