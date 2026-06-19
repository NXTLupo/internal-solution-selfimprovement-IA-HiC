import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { matchSkills } from './corpusChatService';

const _here = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(_here, '..', 'hic-workspace', 'skill-manifest.json');

// Regression for the 2026-06-14 "h.triggers is not iterable" crash: the human-voice-editor
// manifest entry was added without a `triggers` field, so matchSkills' `for (const t of
// skill.triggers)` threw on every chat turn. Fix = data (triggers:[]) + a guard
// (skill.triggers || []). This loads the REAL manifest and runs the exact failing message.

const manifest = JSON.parse(
    fs.readFileSync('hic-workspace/skill-manifest.json', 'utf8'),
);

describe('matchSkills resilience to missing triggers', () => {
    it('never crashes on the #slides message that failed (real manifest)', () => {
        expect(() =>
            matchSkills('create a 15 #slides deck on intelligence augmentation #NXT', manifest as any),
        ).not.toThrow();
    });

    it('handles a quality-enhancer entry with empty triggers', () => {
        const out = matchSkills('describe intelligence augmentation', manifest as any);
        expect(Array.isArray(out)).toBe(true);
    });

    it('every manifest entry has triggers as an array (no future omissions)', () => {
        for (const s of manifest) {
            expect(Array.isArray(s.triggers), `${s.id} missing triggers[]`).toBe(true);
        }
    });

    // 2026-06-14 - sister regression for the "Cannot read properties of undefined
    // (reading 'replace')" crash in loadSkillContext: the human-voice-editor entry
    // shipped without `path`, so skill.path.replace() threw on every chat turn that
    // loaded a quality-enhancer. Every entry must carry a string `path` (real SKILL.md
    // or an inline:// template).
    it('every manifest entry has a string path (loadSkillContext requires it)', () => {
        for (const s of manifest) {
            expect(typeof s.path, `${s.id} missing string path`).toBe('string');
            expect(s.path.length, `${s.id} has empty path`).toBeGreaterThan(0);
        }
    });

    // 2026-06-15 - third sibling of the same crash-class: loadSkillContext does
    // `for (const c of skill.wikiCompanions)` and `... skill.benchmarks`. The
    // human-voice-editor entry shipped without either, so it threw
    // "wikiCompanions is not iterable" DURING skill-context loading, which aborted
    // the artifact turn BEFORE the Opus force-route -> #slides generated on Gemini
    // 3.5 Flash instead of claude-opus-4-8. Fix = data ([] on the entry) + a guard
    // (skill.wikiCompanions || []). These iterated arrays must always be arrays.
    it('every manifest entry has wikiCompanions and benchmarks as arrays (loadSkillContext iterates them)', () => {
        for (const s of manifest) {
            expect(Array.isArray(s.wikiCompanions), `${s.id} missing wikiCompanions[]`).toBe(true);
            expect(Array.isArray(s.benchmarks), `${s.id} missing benchmarks[]`).toBe(true);
        }
    });
});
