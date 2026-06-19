/**
 * Designer-chat voice addendum (2026-06-14).
 *
 * The Designer AI chats (chatToFreeform, chatToSlideSpec) previously ran on a static
 * SYSTEM_PROMPT with NO connection to the writing-quality system. This wires them to the
 * SAME self-improving sources the Analyst Desk uses, WITHOUT hardcoding a banlist into the
 * prompt:
 *   1. the human-voice-editor SKILL.md body (a SkillOpt training target, so its rules
 *      improve weekly from rollouts + user feedback), and
 *   2. getActiveConstraints() - the learned-constraints the edit-learning loop promotes
 *      from user corrections.
 * Both are appended to the designer system prompt at call time. Fail-soft: on any fetch
 * error the designer chat still runs on its base prompt (never throws into generation).
 * Cached for the session so repeated turns do not re-fetch.
 */

let _cached: string | null = null;

async function _fetchHumanVoiceSkill(): Promise<string> {
    const paths = [
        '/skills/human-voice-editor/SKILL.md',
        '/.claude/skills/human-voice-editor/SKILL.md',
        '../.claude/skills/human-voice-editor/SKILL.md',
    ];
    for (const p of paths) {
        try {
            const r = await fetch(p);
            if (!r.ok) continue;
            const raw = await r.text();
            if (/^\s*<!DOCTYPE|^\s*<html/i.test(raw)) continue;
            // strip frontmatter
            return raw.replace(/^---[\s\S]*?---\s*/, '').trim();
        } catch { /* try next */ }
    }
    return '';
}

/** Returns the voice addendum to append to a designer-chat system prompt. Cached + fail-soft. */
export async function designerVoiceAddendum(): Promise<string> {
    if (_cached !== null) return _cached;
    let constraints = '';
    try {
        const { getActiveConstraints } = await import('../../services/promptImprovementEngine');
        constraints = (await Promise.resolve(getActiveConstraints('all'))) || '';
    } catch { /* learned constraints unavailable - skip */ }
    const skill = await _fetchHumanVoiceSkill();
    const parts: string[] = [];
    if (skill) {
        parts.push(
            '=== HUMAN VOICE (quality enhancer, self-improving skill) ===\n' +
            'Apply these positive-voice rules to every word you write here, exactly as the Analyst Desk does:\n' +
            skill +
            '\n=== END HUMAN VOICE ==='
        );
    }
    if (constraints && constraints.trim()) {
        parts.push(constraints.trim());
    }
    _cached = parts.length ? '\n\n' + parts.join('\n\n') : '';
    return _cached;
}
