/**
 * E1.3, second half (2026-08-24). RED CASES FOR THE CI GATES THEMSELVES.
 *
 * `gatesBite.test.ts` proves the ten runtime chain stages reject what they claim to
 * reject. The four CI gates had no equivalent, so nothing established that
 * `check:skills` and `check:content` would fail a build rather than pass one quietly.
 * A gate nobody has fed a violation is a gate nobody has proved bites.
 *
 * Both scripts now take their root from an env var, so each case here builds a fixture
 * tree, runs the real script against it, and asserts on the exit code and the finding.
 * The scripts are unmodified in behaviour: absent the env var they read the live tree.
 *
 * `check:templates` and `typecheck` are excluded deliberately, and the reason is not
 * laziness: both already fail loudly and unavoidably on a violation (a missing renderer
 * breaks parity arithmetic; a type error stops the build), and neither has a silent-pass
 * mode to guard against. The gates worth proving are the two that SCAN and could come
 * back empty.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const HIC_ROOT = resolve(__dirname, '..');
const SKILLS_SCRIPT = join(HIC_ROOT, 'scripts', 'check-skills.mjs');
const CONTENT_SCRIPT = join(HIC_ROOT, 'scripts', 'check-content.mjs');

let root: string;
beforeAll(() => { root = mkdtempSync(join(tmpdir(), 'ci-gates-')); });
afterAll(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });

/** Run a gate against a fixture root. Returns exit code plus combined output. */
function runGate(script: string, envKey: string, fixtureRoot: string) {
    try {
        const out = execFileSync(process.execPath, [script, '--json'], {
            env: { ...process.env, [envKey]: fixtureRoot },
            encoding: 'utf8',
        });
        return { code: 0, out };
    } catch (e: any) {
        return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` };
    }
}

/**
 * Each fixture gets its OWN root. The first version shared one directory, so by the time
 * a "should pass" case ran, the violations planted by earlier cases were still in the
 * tree and the gate correctly failed on them. A shared fixture root makes every later
 * assertion depend on test order, which is its own bug.
 */
let seq = 0;
function skillFixture(name: string, frontmatter: string, body = 'Body text.\n') {
    const base = join(root, `skills-${++seq}`);
    const dir = join(base, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}`);
    return base;
}

function airFixture(slug: string, payload: any) {
    const base = join(root, `sessions-${++seq}`);
    const dir = join(base, slug, 'artifacts');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `slides_${Date.now()}.air.json`), JSON.stringify({
        airVersion: '1', runId: slug, artifactId: 'a1', artifactType: 'slides',
        postChain: { shippedPayload: payload },
    }));
    return base;
}

describe('check:skills bites', () => {
    it('PASSES a well-formed skill package', () => {
        const skills = skillFixture('good-skill', [
            'name: good-skill',
            'invocation: model',
            'description: Use when the caller needs a worked example of a valid package.',
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(0);
        expect(r.out).toContain('"errors": 0');
    });

    it('FAILS the build when the name does not match the directory, because routing resolves by directory', () => {
        const skills = skillFixture('mismatch-dir', [
            'name: some-other-name',
            'invocation: model',
            'description: A package whose name disagrees with its folder.',
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.name-directory-mismatch');
    });

    it('FAILS on a missing description, which is the field routing reads', () => {
        const skills = skillFixture('no-desc', 'name: no-desc\ninvocation: model');
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.missing-description');
    });

    it('FAILS on an invocation class outside the three real ones', () => {
        const skills = skillFixture('bad-class', [
            'name: bad-class',
            'invocation: sometimes',
            'description: A package claiming an invocation class that does not exist.',
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.invocation-class');
    });

    it('FAILS on a class that contradicts itself, since the model could never reach it', () => {
        const skills = skillFixture('contradiction', [
            'name: contradiction',
            'invocation: model',
            'disable-model-invocation: true',
            'description: A package that claims model invocation and disables it.',
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.invocation-contradiction');
    });

    it('WARNS rather than fails on an over-budget description, so the gate does not get bypassed', () => {
        const skills = skillFixture('long-desc', [
            'name: long-desc',
            'invocation: model',
            `description: ${'word '.repeat(80)}`,
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(0);
        expect(r.out).toContain('frontmatter.description-budget');
    });
});

describe('check:content bites', () => {
    it('PASSES a shipped artifact with clean copy', () => {
        const sessions = airFixture('clean-run', {
            slides: [{ title: 'Enrichment shortens the research phase for retained search teams' }],
        });
        const r = runGate(CONTENT_SCRIPT, 'HIC_SESSIONS_ROOT', sessions);
        expect(r.code).toBe(0);
        expect(r.out).toContain('"errors": 0');
    });

    it('FAILS the build on an em-dash in shipped copy', () => {
        const sessions = airFixture('emdash-run', {
            slides: [{ title: 'Research moves first — assessment does not' }],
        });
        const r = runGate(CONTENT_SCRIPT, 'HIC_SESSIONS_ROOT', sessions);
        expect(r.code).toBe(1);
        expect(r.out).toContain('content.format-tell');
    });

    it('FAILS on a banned phrase in the model voice', () => {
        const banned = ['compre', 'hensive'].join('');
        const sessions = airFixture('banned-run', {
            slides: [{ title: `A ${banned} approach to client reporting` }],
        });
        const r = runGate(CONTENT_SCRIPT, 'HIC_SESSIONS_ROOT', sessions);
        expect(r.code).toBe(1);
        expect(r.out).toContain('content.banned-phrase');
    });

    it('does NOT fail on the same word inside a verbatim quote, which the house rules permit', () => {
        const sessions = airFixture('quote-run', {
            slides: [{
                title: 'Vendors describe their own tooling in their own words',
                quote: 'A.I. utilizes position details, project and company data',
            }],
        });
        const r = runGate(CONTENT_SCRIPT, 'HIC_SESSIONS_ROOT', sessions);
        expect(r.code).toBe(0);
    });

    it('FAILS on a provider artifact tag reaching a shipped artifact', () => {
        const tag = ['oai', 'cite'].join('') + ':12';
        const sessions = airFixture('tag-run', {
            slides: [{ title: `Enrichment shortens the research phase ${tag}` }],
        });
        const r = runGate(CONTENT_SCRIPT, 'HIC_SESSIONS_ROOT', sessions);
        expect(r.code).toBe(1);
        expect(r.out).toContain('content.format-tell');
    });
});
