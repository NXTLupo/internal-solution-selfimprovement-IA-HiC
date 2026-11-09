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
    // 2026-10-31 (WS-A A2): a well-formed package carries a version and a lifecycle status.
    const LIFECYCLE = ['version: "1.0"', 'status: active'];

    it('PASSES a well-formed skill package', () => {
        const skills = skillFixture('good-skill', [
            'name: good-skill',
            'invocation: model',
            'description: Use when the caller needs a worked example of a valid package.',
            ...LIFECYCLE,
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

    // 2026-10-31 (agent-stack plan WS-A A2): the library was brought to 0 warnings and the audit became a gate,
    // so an over-budget description now FAILS (it was a warning while 53 legacy descriptions ran long).
    it('FAILS on an over-budget description now that the library is clean', () => {
        const skills = skillFixture('long-desc', [
            'name: long-desc',
            'invocation: model',
            `description: ${'word '.repeat(80)}`,
            ...LIFECYCLE,
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.description-budget');
    });

    it('FAILS on frontmatter that is not valid YAML, which Claude Code would drop (12 skills had this)', () => {
        const skills = skillFixture('bad-yaml', [
            'name: bad-yaml',
            'invocation: model',
            'description: Repairs output: JSON, HTML and SVG: before parse.',
            ...LIFECYCLE,
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.invalid');
    });

    it('FAILS on an unquoted " #" that YAML reads as a comment and truncates the description', () => {
        const skills = skillFixture('hash-desc', [
            'name: hash-desc',
            'invocation: model',
            'description: Use for #questionnaire when a stakeholder holds the deciding fact.',
            ...LIFECYCLE,
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.description-hash-comment');
    });

    it('FAILS on a missing version and on a dormant package without its date', () => {
        const skills = skillFixture('no-version', [
            'name: no-version',
            'invocation: model',
            'description: A package with no version and an undated dormant status.',
            'status: dormant',
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('frontmatter.version-missing');
        expect(r.out).toContain('frontmatter.dormant-undated');
    });

    it('FAILS on a literal Claude model name: Claude routing has one authority', () => {
        const skills = skillFixture('stale-model', [
            'name: stale-model',
            'invocation: model',
            'description: Use when a skill still names a retired model tier.',
            ...LIFECYCLE,
        ].join('\n'), 'The revisor is a Sonnet 4.6 call.\n');
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('content.model-literal');
    });

    it('FAILS on a SkillOpt-trainable skill whose contract is not protected, and on an unbalanced block', () => {
        const unprotected = skillFixture('trainable-open', [
            'name: trainable-open',
            'invocation: runtime',
            'disable-model-invocation: true',
            'description: A trainable skill with no protected contract section.',
            ...LIFECYCLE,
            'skillopt: trainable',
        ].join('\n'), '## Output Contract\n\nFields.\n');
        const r1 = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', unprotected);
        expect(r1.code).toBe(1);
        expect(r1.out).toContain('skillopt.unprotected');
        const unbalanced = skillFixture('trainable-open2', [
            'name: trainable-open2',
            'invocation: runtime',
            'disable-model-invocation: true',
            'description: A trainable skill with an unterminated protected block.',
            ...LIFECYCLE,
            'skillopt: trainable',
        ].join('\n'), '<!-- SLOW_UPDATE_START -->\n## Output Contract\n\nFields.\n');
        const r2 = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', unbalanced);
        expect(r2.code).toBe(1);
        expect(r2.out).toContain('skillopt.unbalanced');
    });

    it('FAILS on a loader binding whose wiki companion does not exist (it would 404 silently at runtime)', () => {
        const skills = skillFixture('loader-404', [
            'name: loader-404',
            'invocation: runtime',
            'disable-model-invocation: true',
            'description: A runtime skill whose loader names a missing wiki page.',
            ...LIFECYCLE,
            'loader:',
            '  title: Loader 404',
            '  role: research-deliverable',
            '  wiki_companions:',
            '    - frameworks/this-page-does-not-exist.md',
        ].join('\n'));
        const r = runGate(SKILLS_SCRIPT, 'HIC_SKILLS_ROOT', skills);
        expect(r.code).toBe(1);
        expect(r.out).toContain('loader.missing-companion');
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
