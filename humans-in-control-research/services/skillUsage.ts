/**
 * skillUsage.ts - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift, WS-A A5)
 *
 * Every skill injected into a prompt is recorded twice: as a RunStep on the run (`skill:<id>@<version>`, so
 * the run manifest and the trace name the exact skill text the model saw) and as a `skill` event in the
 * proxy's event sink, so `/api/skills/usage` can show which packages are used and which have gone 60 days
 * without a caller. Retiring a skill then rests on data, not on grep (the plan's DELETE list).
 *
 * Fire-and-forget: telemetry never blocks or breaks a chat turn.
 */
import { recordStep, getRun } from './runState';
import { proxyBase } from './proxyConfig';

export type SkillUseVia = 'match' | 'composes_with' | 'directive' | 'override' | 'deck';

export interface SkillUse {
    id: string;
    version?: string;
    role?: string;
    via: SkillUseVia;
}

export function skillUseTag(id: string, version?: string): string {
    return `skill:${id}@${version && String(version).trim() ? String(version).trim() : 'unversioned'}`;
}

/** Dedupe by id, keeping the first (most specific) way the skill arrived. */
export function dedupeSkillUses(uses: SkillUse[]): SkillUse[] {
    const seen = new Set<string>();
    const out: SkillUse[] = [];
    for (const u of uses) {
        if (!u || !u.id || seen.has(u.id)) continue;
        seen.add(u.id);
        out.push(u);
    }
    return out;
}

export function recordSkillUses(uses: SkillUse[], fetchImpl: typeof fetch | undefined = globalThis.fetch): SkillUse[] {
    const list = dedupeSkillUses(uses);
    if (!list.length) return list;
    for (const u of list) {
        try { recordStep({ stage: 'skill', tool: skillUseTag(u.id, u.version), note: `${u.via}${u.role ? ` (${u.role})` : ''}` }); } catch { /* never break a turn */ }
    }
    if (typeof fetchImpl !== 'function') return list;
    try {
        const run = getRun();
        const events = list.map(u => ({
            kind: 'skill', skill_id: u.id, version: u.version || '', role: u.role || '', via: u.via,
            run_id: run.run_id, message_id: run.current_message_id || '', engagement: run.engagement || '',
        }));
        void fetchImpl(`${proxyBase()}/api/telemetry/events`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events }),
        }).catch(() => { /* fire-and-forget */ });
    } catch { /* never break a turn */ }
    return list;
}
