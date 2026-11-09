/**
 * WS-A A1/A2/A5 (2026-10-31, plan agent-stack-shared-memory-skills-uplift).
 *  - the REAL skill library passes check:skills with 0 errors and 0 warnings, and the generated registry and
 *    runtime manifest match a fresh build (no drift);
 *  - every manifest path resolves to a package on disk (journey-illustrator lives at diagrams/journey-illustrator);
 *  - no SKILL.md names a literal Claude model;
 *  - each injected skill is recorded as skill:<id>@<version> on the run and posted once to the event sink;
 *  - the prompt receives a versioned header instead of the raw frontmatter.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { recordSkillUses, skillUseTag, dedupeSkillUses } from './skillUsage';
import { _resetRunStateForTests, beginRun, getRun } from './runState';
import { withSkillHeader } from './corpusChatService';

const HIC_ROOT = resolve(__dirname, '..');
const SKILLS_ROOT = resolve(HIC_ROOT, '..', '.claude', 'skills');

function runCheck() {
    try {
        return { code: 0, out: execFileSync(process.execPath, [join(HIC_ROOT, 'scripts', 'check-skills.mjs'), '--json'], { encoding: 'utf8' }) };
    } catch (e: any) {
        return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` };
    }
}

describe('the real skill library (WS-A gate)', () => {
    it('passes check:skills with 0 errors and 0 warnings, and the generated files match a fresh build', () => {
        const r = runCheck();
        const json = JSON.parse(r.out);
        const errs = json.findings.filter((f: any) => f.severity === 'error').map((f: any) => `${f.rule} ${f.skill}: ${f.message}`);
        expect(errs).toEqual([]);
        expect(json.warnings).toBe(0);
        expect(r.code).toBe(0);
        expect(json.registry.manifest).toBeGreaterThan(20);
    }, 60_000);

    it('every manifest entry resolves to a package on disk, journey-illustrator included', () => {
        const manifest = JSON.parse(readFileSync(join(HIC_ROOT, 'hic-workspace', 'skill-manifest.json'), 'utf8'));
        for (const m of manifest) {
            expect(m.path.startsWith('/skills/'), m.id).toBe(true);
            expect(existsSync(join(SKILLS_ROOT, m.path.slice('/skills/'.length))), m.path).toBe(true);
            expect(m.path.startsWith('inline://'), m.id).toBe(false);
        }
        const journey = manifest.find((m: any) => m.id === 'journey-illustrator');
        expect(journey?.path).toBe('/skills/diagrams/journey-illustrator/SKILL.md');
        expect(new Set(manifest.map((m: any) => m.id)).size).toBe(manifest.length);
    });

    it('the registry lists every package with a version and a status', () => {
        const reg = JSON.parse(readFileSync(join(HIC_ROOT, 'hic-workspace', 'skill-registry.json'), 'utf8'));
        expect(reg.schema).toBe('hic.skill-registry.v1');
        for (const s of reg.skills) {
            expect(s.version, s.id).toBeTruthy();
            expect(['active', 'dormant', 'deprecated']).toContain(s.status);
            expect(s.description.length, s.id).toBeLessThanOrEqual(300);
            if (s.status === 'dormant') expect(s.dormant_since, s.id).toBeTruthy();
        }
    });
});

describe('skill usage telemetry (A5)', () => {
    beforeEach(() => { _resetRunStateForTests(); beginRun({ engagement: 'eng-x', kind: 'slides' } as any); });

    it('tags a use as skill:<id>@<version>', () => {
        expect(skillUseTag('deck-composer', '2.1')).toBe('skill:deck-composer@2.1');
        expect(skillUseTag('x', '')).toBe('skill:x@unversioned');
    });

    it('records one RunStep per distinct skill and posts one batched sink event', async () => {
        const posts: any[] = [];
        const fake = (async (url: string, init: any) => { posts.push({ url, body: JSON.parse(init.body) }); return new Response('{}'); }) as any;
        const used = recordSkillUses([
            { id: 'persona-architect', version: '1.1', role: 'research-deliverable', via: 'match' },
            { id: 'source-ranker', version: '1.0', role: 'quality-enhancer', via: 'composes_with' },
            { id: 'persona-architect', version: '1.1', via: 'composes_with' },
        ], fake);
        expect(used.map(u => u.id)).toEqual(['persona-architect', 'source-ranker']);
        const steps = getRun().steps.filter(s => s.stage === 'skill').map(s => s.tool);
        expect(steps).toEqual(['skill:persona-architect@1.1', 'skill:source-ranker@1.0']);
        expect(posts).toHaveLength(1);
        expect(posts[0].url).toMatch(/\/api\/telemetry\/events$/);
        expect(posts[0].body.events.map((e: any) => [e.kind, e.skill_id, e.via])).toEqual([
            ['skill', 'persona-architect', 'match'], ['skill', 'source-ranker', 'composes_with'],
        ]);
        expect(posts[0].body.events[0].run_id).toBe(getRun().run_id);
    });

    it('dedupes and never throws on an empty list', () => {
        expect(dedupeSkillUses([])).toEqual([]);
        expect(recordSkillUses([], undefined)).toEqual([]);
    });
});

describe('versioned skill header (A1)', () => {
    it('replaces the YAML frontmatter with Skill: id vX plus the description', () => {
        const text = '---\r\nname: demo\r\ndescription: x\r\nloader:\r\n  title: Demo\r\n---\r\n\r\n# Demo\r\n\r\nBody.\r\n';
        const out = withSkillHeader(text, { id: 'demo', version: '1.2', description: 'Short trigger pointer.' });
        expect(out.startsWith('Skill: demo v1.2\nShort trigger pointer.\n\n# Demo')).toBe(true);
        expect(out).not.toContain('loader:');
        expect(withSkillHeader('# No frontmatter\n', { id: 'x', description: '' })).toBe('# No frontmatter\n');
    });
});
