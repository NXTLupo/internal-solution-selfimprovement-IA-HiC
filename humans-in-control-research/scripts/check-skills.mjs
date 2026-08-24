#!/usr/bin/env node
/**
 * DF-E - SKILL GOVERNANCE GATE (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * Ported from deer-flow's `skills/validation.py` (frontmatter validation) and
 * `skills/review/resource_graph.py` (reference graph), which together are why
 * its 20-skill library cannot quietly rot. HiC has 80+ skills and, before this
 * script, zero validation: a skill could point at a deleted plan file and
 * degrade silently, and the only patch gate (`isCompleteSkillPatch`) checked
 * for truncation.
 *
 * Two analyzers, one walk:
 *   1. FRONTMATTER: required fields, hyphen-case name, length caps, no angle
 *      brackets, and name/directory agreement (a mismatch is a routing hazard).
 *   2. RESOURCE GRAPH: every reference resolved; missing targets reported.
 *      ADAPTED for this repo: deer-flow treats a reference outside the package
 *      as an "escaping link" error because its skills are distributable
 *      packages. HiC skills legitimately cite repo paths (plans, services,
 *      wiki pages), so an escaping reference is resolved against the REPO ROOT
 *      and only reported when it does not exist there either. That inversion is
 *      what makes the check useful here: it finds the skills still citing plan
 *      files deleted in the ba753863a cleanup.
 *
 * Exit codes: 0 clean or warnings only, 1 when any error-severity finding
 * exists (CI gate), matching deer-flow's `--fail-on error`.
 *
 * Usage:
 *   node scripts/check-skills.mjs            # human-readable report
 *   node scripts/check-skills.mjs --json     # machine-readable
 *   node scripts/check-skills.mjs --strict   # warnings also fail
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, posix } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const HIC_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HIC_ROOT, '..');
/**
 * E1.3 (2026-08-24): overridable so the gate can be pointed at a fixture tree and asked
 * to REJECT something. A gate with no red case is a gate nobody has proved bites, which
 * is the whole argument of the gates-bite pass. Absent the env var, nothing changes.
 */
const SKILLS_ROOT = process.env.HIC_SKILLS_ROOT
    ? resolve(process.env.HIC_SKILLS_ROOT)
    : join(REPO_ROOT, '.claude', 'skills');

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');

/**
 * Keys observed in this repo's skills plus the deer-flow core set. Unknown keys
 * are a WARNING, not an error: a local convention is not a defect, but an
 * accumulation of one-off keys is worth seeing.
 */
const KNOWN_KEYS = new Set([
    // E2.3: the invocation class (see checkInvocation below).
    'invocation', 'disable-model-invocation',
    'name', 'description', 'version', 'license', 'allowed-tools', 'required-secrets',
    'secrets-autonomous', 'thinking', 'category', 'triggers', 'trigger', 'argument-hint',
    'inputs', 'outputs', 'references', 'metadata', 'last_improved', 'applies_to',
    'disable-model-invocation', 'user-invocable', 'hashtag_grammar', 'example_hashtags',
    'data_source', 'catalog_url', 'catalog_json', 'brand_dependencies', 'model',
]);

const RESOURCE_DIRS = new Set(['references', 'scripts', 'templates', 'assets', 'evals']);
const MD_LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_SPAN = /`([^`\n]+)`/g;
const PATH_TOKEN = /(?<![\w./-])(?:references|scripts|templates|assets|evals)\/[A-Za-z0-9._~/%+-]+/g;

const findings = [];
/** E2.3: one entry per skill, so the run can report the invocation distribution. */
const invocationClasses = [];
const add = (severity, rule, skill, message, extra = {}) =>
    findings.push({ severity, rule, skill, message, ...extra });

// ---------------------------------------------------------------------------
// Discovery: a directory containing SKILL.md is a skill (nesting allowed, so
// `brands/nu-style/SKILL.md` registers while `brands/` itself does not).
// ---------------------------------------------------------------------------
function discoverSkills(root) {
    const out = [];
    const walk = (dir) => {
        let entries;
        try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
        if (entries.some(e => e.isFile() && e.name === 'SKILL.md')) out.push(dir);
        for (const e of entries) if (e.isDirectory()) walk(join(dir, e.name));
    };
    walk(root);
    return out.sort();
}

function splitFrontmatter(text) {
    if (!text.startsWith('---')) return { meta: null, body: text, error: 'no YAML frontmatter' };
    const end = text.indexOf('\n---', 3);
    if (end === -1) return { meta: null, body: text, error: 'unterminated frontmatter' };
    const raw = text.slice(3, end);
    const body = text.slice(end + 4);
    // Deliberately a shallow scalar parse: this gate checks keys and string
    // caps, and a full YAML dependency would be more surface than the job needs.
    const meta = {};
    let currentKey = null;
    // Split on CRLF or LF. Most skills in this repo are CRLF, and a stray \r
    // left on the line defeats an anchored `$`, which is exactly how a first
    // run of this gate reported 70 skills as missing their own name.
    // The trailing CR of the LAST frontmatter line survives the split (there is
    // no following LF inside `raw`), and a stray CR defeats an anchored `$`.
    // That is why only skills whose final key was `description` were reported
    // as missing it.
    for (const line of raw.split(/\r?\n/).map(l => l.replace(/\r+$/, ''))) {
        const m = /^([A-Za-z_][A-Za-z0-9_-]*):\s?(.*)$/.exec(line);
        if (m) { currentKey = m[1]; meta[currentKey] = m[2].trim(); continue; }
        if (currentKey && /^\s+\S/.test(line)) meta[currentKey] += ' ' + line.trim();
    }
    return { meta, body, error: null };
}

// ---------------------------------------------------------------------------
// Analyzer 1: frontmatter
// ---------------------------------------------------------------------------
function checkFrontmatter(skillDir, rel, meta, fmError) {
    if (fmError) { add('error', 'frontmatter.invalid', rel, fmError); return null; }
    const name = (meta.name || '').replace(/^["']|["']$/g, '').trim();
    const description = (meta.description || '').replace(/^["']|["']$/g, '').trim();

    if (!name) add('error', 'frontmatter.missing-name', rel, "required key 'name' is absent");
    if (!description) add('error', 'frontmatter.missing-description', rel, "required key 'description' is absent");

    if (name) {
        if (!/^[a-z0-9-]+$/.test(name)) add('error', 'frontmatter.name-shape', rel, `name '${name}' must be hyphen-case (lowercase, digits, hyphens)`);
        else if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) add('error', 'frontmatter.name-shape', rel, `name '${name}' has a leading, trailing or doubled hyphen`);
        if (name.length > 64) add('error', 'frontmatter.name-length', rel, `name is ${name.length} chars (max 64)`);
        const dirName = skillDir.split(/[\\/]/).pop();
        if (name !== dirName) add('error', 'frontmatter.name-directory-mismatch', rel, `name '${name}' does not match directory '${dirName}'; routing resolves by directory`);
    }
    if (description) {
        if (description.length > 1024) add('warning', 'frontmatter.description-length', rel, `description is ${description.length} chars (deer-flow caps catalog descriptions at 1024)`);
        // deer-flow makes this an ERROR because its Gateway renders descriptions
        // into HTML. HiC has no such catalog, and several skills legitimately use
        // `<slug>` placeholders, so this is a warning here rather than a rule we
        // would never act on.
        if (/[<>]/.test(description)) add('warning', 'frontmatter.description-brackets', rel, 'description contains angle brackets');
    }
    /**
     * E2.3 (2026-08-21). CONTEXT BUDGET AND INVOCATION CLASS.
     *
     * Every model-invoked skill's description sits in context on every turn of every
     * session. With 82 packages that is a standing cost, and 52 of those descriptions
     * ran past 300 characters because a description had drifted from a trigger pointer
     * into a summary of the skill. `writing-for-agents` names the two loads precisely:
     * context load on the model, cognitive load on the human. A description earns its
     * length by helping the model decide whether to reach for the skill, and nothing
     * else.
     *
     * The budget is a warning rather than an error: the existing library predates the
     * rule, and turning 52 warnings into a red build would just get the gate bypassed.
     * It is measured, reported, and enforced on anything new.
     */
    if (description) {
        if (description.length > 300) {
            add('warning', 'frontmatter.description-budget', rel,
                `description is ${description.length} chars; a trigger pointer should fit in 300. The body carries the detail, the description only has to win the routing decision.`);
        }
        /**
         * The NEGATION rule, also from `writing-for-agents`: "steering by prohibition
         * drags the forbidden behaviour into context and makes it MORE available...
         * Prompt the positive." A description that is only a list of things not to do
         * gives the model no target to hit. This matters doubly in HiC, whose writing
         * control is 350-plus prohibitions.
         */
        const prohibitions = (description.match(/(never|not|no|avoid|forbidden|banned|don't|do not)/gi) || []).length;
        const positives = (description.match(/(use|apply|produce|emit|generate|load|read|write|compose|check|audit|when|for)/gi) || []).length;
        if (prohibitions >= 3 && prohibitions > positives) {
            add('warning', 'frontmatter.negation-heavy', rel,
                `description carries ${prohibitions} prohibition(s) and ${positives} positive target(s): name what the skill DOES first, then the guardrail`);
        }
    }

    /**
     * The invocation class. `disable-model-invocation: true` costs no per-turn context,
     * which is the right setting for a skill only ever reached by hand or by HiC's own
     * runtime loader (which reads `/hic-workspace/skill-manifest.json` and the file
     * path, never the frontmatter). Absent the key, a skill is model-invoked, so the
     * gate reports the distribution rather than guessing.
     */
    const invocation = (meta.invocation || '').replace(/^["']|["']$/g, '').trim();
    invocationClasses.push(invocation || 'unset');
    if (!invocation) {
        add('warning', 'frontmatter.invocation-missing', rel,
            'no invocation class: declare model (the agent reaches for it mid-task), runtime (HiC loads it from the manifest by path) or human (a person invokes it by name)');
    }
    const disabled = String(meta['disable-model-invocation'] || '').trim() === 'true';
    if (invocation && !['model', 'runtime', 'human'].includes(invocation)) {
        add('error', 'frontmatter.invocation-class', rel,
            `invocation '${invocation}' is not one of model | runtime | human`);
    }
    if (invocation === 'runtime' && !disabled) {
        add('warning', 'frontmatter.invocation-cost', rel,
            'invocation: runtime pays per-turn model context for nothing; add disable-model-invocation: true');
    }
    if (disabled && invocation === 'model') {
        add('error', 'frontmatter.invocation-contradiction', rel,
            'declared invocation: model but disable-model-invocation: true; the model can never reach it');
    }

    for (const k of Object.keys(meta)) {
        if (!KNOWN_KEYS.has(k)) add('warning', 'frontmatter.unknown-key', rel, `unrecognized frontmatter key '${k}'`);
    }
    return name || null;
}

// ---------------------------------------------------------------------------
// Analyzer 2: resource graph
// ---------------------------------------------------------------------------
/**
 * A reference the skill says it WRITES is not a defect when the file is absent:
 * it is an output that has not been produced yet. deer-flow's resource graph
 * only ever sees read references because its packages are self-contained; HiC
 * skills routinely declare their own output paths, so the gate has to tell the
 * difference or it reports intent as rot.
 */
const WRITE_INTENT = /\b(write|writes|writing|written|output|outputs|emit|emits|save|saves|append|appends|create|creates|persist|persists|record|records)\b/i;

function extractRefs(text) {
    const refs = new Map();   // ref -> { write: boolean }
    const noteRef = (ref, line) => {
        const clean = ref.split('#')[0];
        if (!clean) return;
        const prior = refs.get(clean);
        const write = WRITE_INTENT.test(line || '');
        // A path read anywhere is a read reference, even if another line writes it.
        refs.set(clean, { write: prior ? prior.write && write : write });
    };
    for (const line of text.split(/\r?\n/)) {
        for (const m of line.matchAll(MD_LINK)) noteRef(m[1], line);
        for (const m of line.matchAll(CODE_SPAN)) {
            const tok = m[1].trim();
            // Only treat a code span as a path when it looks like one and carries
            // an extension: `services/foo.ts` yes, `npm run test` and `foo/bar` no.
            if (tok.includes('/') && /\.[a-z0-9]{1,5}$/i.test(tok) && !/\s/.test(tok)) noteRef(tok, line);
        }
        for (const m of line.matchAll(PATH_TOKEN)) noteRef(m[0], line);
    }
    return Array.from(refs.entries()).map(([ref, meta]) => ({ ref, write: meta.write }));
}

function checkResourceGraph(skillDir, rel, files) {
    const referenced = new Set();
    for (const file of files) {
        if (!/\.(md|txt)$/i.test(file)) continue;
        let text;
        try { text = readFileSync(join(skillDir, file), 'utf8'); } catch { continue; }
        for (const { ref: raw, write } of extractRefs(text)) {
            // Strip quotes and sentence punctuation: prose says "see
            // references/web-layouts.md." and the trailing period is not part
            // of the path.
            const ref = raw.replace(/^["']|["']$/g, '').replace(/[.,;:)]+$/, '').trim();
            // The agent memory directory lives outside the repo by design.
            if (ref.startsWith('memory/')) continue;
            if (!ref || ref.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(ref)) continue;  // anchors, urls, mailto
            // A glob or a template placeholder is a PATTERN, not a path. Reporting
            // `memory/feedback_*.md` or `engagements/<slug>/log.json` as missing
            // is noise that would train the reader to ignore this gate.
            if (/[*?{}<>[\]]/.test(ref)) continue;

            if (ref.startsWith('/') || ref.startsWith('..')) {
                // ADAPTATION: repo-relative reference. Legitimate here; only a
                // finding when the target does not exist in the repo either.
                const candidate = ref.startsWith('/')
                    ? join(REPO_ROOT, ref.slice(1))
                    : resolve(skillDir, ref);
                if (!existsSync(candidate)) {
                    add('warning', 'resource.missing-repo-path', rel, `reference does not exist in the repo: ${ref}`);
                }
                continue;
            }
            const local = resolve(skillDir, ref);
            if (existsSync(local)) { referenced.add(posix.normalize(ref)); continue; }
            // Search bases, in the order a reader would try them: the repo root,
            // the HiC service root, and the workspace root (skills routinely
            // write `wiki/synthesis/x.md`, which lives under hic-workspace/).
            const bases = [REPO_ROOT, HIC_ROOT, join(HIC_ROOT, 'hic-workspace'), SKILLS_ROOT];
            if (bases.some(b => existsSync(join(b, ref)))) continue;
            if (write) {
                add('warning', 'resource.write-target-absent', rel, `declared output does not exist yet: ${ref}`);
            } else {
                add('error', 'resource.missing', rel, `referenced resource does not exist: ${ref}`);
            }
        }
    }
    // Unreferenced package resources: reachable by nothing the model reads.
    for (const file of files) {
        const top = file.split('/')[0];
        if (!RESOURCE_DIRS.has(top)) continue;
        if (!referenced.has(posix.normalize(file))) {
            add('warning', 'resource.unreferenced', rel, `resource is not reachable from SKILL.md or another referenced file: ${file}`);
        }
    }
}

function listFiles(dir, prefix = '') {
    const out = [];
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) {
            // A nested skill is its own package; do not absorb its files.
            if (existsSync(join(dir, e.name, 'SKILL.md'))) continue;
            out.push(...listFiles(join(dir, e.name), rel));
        } else {
            out.push(rel);
        }
    }
    return out;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
if (!existsSync(SKILLS_ROOT)) {
    console.error(`[check-skills] skills root not found: ${SKILLS_ROOT}`);
    process.exit(1);
}

const skillDirs = discoverSkills(SKILLS_ROOT);
const names = new Map();

/**
 * Skill names referenced from CODE. A composition map that names a skill with no
 * package behind it degrades a prompt silently: `human-voice-editor` was listed
 * for every deliverable from 2026-06-14 to 2026-08-20 with no file behind it,
 * and the loader swallowed the miss. Cheap to check, so it is checked.
 */
function codeReferencedSkills() {
    const refs = new Map();   // name -> source file
    const sources = [
        join(HIC_ROOT, 'services', 'deliverableFrameworks.ts'),
    ];
    for (const file of sources) {
        let text;
        try { text = readFileSync(file, 'utf8'); } catch { continue; }
        const block = /QUALITY_SKILL_COMPOSITION[\s\S]*?\n\};/.exec(text);
        if (!block) continue;
        for (const m of block[0].matchAll(/'([a-z0-9][a-z0-9-]{2,})'/g)) {
            const name = m[1];
            // Deliverable keys are UPPER_SNAKE, so a lowercase hyphen-case token
            // inside the map is a skill name.
            if (!refs.has(name)) refs.set(name, relative(REPO_ROOT, file).replace(/\\/g, '/'));
        }
    }
    return refs;
}

for (const dir of skillDirs) {
    const rel = relative(SKILLS_ROOT, dir).replace(/\\/g, '/');
    const files = listFiles(dir);
    let text;
    try { text = readFileSync(join(dir, 'SKILL.md'), 'utf8'); } catch (e) {
        add('error', 'skill.unreadable', rel, `SKILL.md unreadable: ${e.message}`);
        continue;
    }
    const { meta, error } = splitFrontmatter(text);
    const name = checkFrontmatter(dir, rel, meta || {}, error);
    if (name) {
        if (names.has(name)) add('error', 'skill.duplicate-name', rel, `name '${name}' is also declared by ${names.get(name)}`);
        else names.set(name, rel);
    }
    checkResourceGraph(dir, rel, files);
}

/**
 * Every code-referenced skill must exist.
 *
 * Scoped to the REAL tree. This analyzer scans the repo's own source for skill names and
 * checks them against the discovered packages, so pointing it at a fixture root reports
 * every genuinely-live skill as absent. Running it there would be measuring the fixture
 * against the wrong library.
 */
const usingFixtureRoot = Boolean(process.env.HIC_SKILLS_ROOT);
for (const [name, source] of (usingFixtureRoot ? [] : codeReferencedSkills())) {
    if (!names.has(name)) {
        add('error', 'skill.referenced-but-absent', name,
            `referenced by ${source} but no skill package declares this name; the loader fails silently, so the prompt is quietly missing it`);
    }
}

/**
 * Analyzer 5: ROUTER SYNC (E2.4, 2026-08-21).
 *
 * `ask-hic` maps intent onto the library so a skill nobody remembers still gets reached.
 * Matt Pocock's version of this states the failure mode exactly: "a new skill it never
 * mentions, or a stale one it still routes to, is a router that lies." A router only
 * helps while it is true, and nothing but a gate keeps it true.
 *
 * Scope is deliberate. Only MODEL-REACHABLE skills need routing: a package marked
 * `disable-model-invocation: true` is loaded by HiC's runtime from the manifest by path,
 * so listing it here would be noise. The router itself is excluded, and so is any skill
 * whose own frontmatter says a human invokes it directly.
 */
function checkRouterSync(skillDirs) {
    const routerPath = join(SKILLS_ROOT, 'ask-hic', 'SKILL.md');
    if (!existsSync(routerPath)) {
        add('warning', 'router.absent', 'ask-hic', 'no ask-hic router: with this many packages, a skill nobody remembers is a skill nobody reaches');
        return;
    }
    const routerText = readFileSync(routerPath, 'utf8');
    const missing = [];
    const stale = [];
    const named = new Set();
    for (const m of routerText.matchAll(/\*\*([a-z0-9-]+)\*\*/g)) named.add(m[1]);

    for (const dir of skillDirs) {
        const name = dir.split(/[\\/]/).pop();
        if (name === 'ask-hic') continue;
        const raw = readFileSync(join(dir, 'SKILL.md'), 'utf8');
        const fm = raw.split(/^---\s*$/m)[1] || '';
        if (/disable-model-invocation:\s*true/.test(fm)) continue;   // runtime-loaded, not routed
        if (/^invocation:\s*human/m.test(fm)) continue;
        if (!named.has(name)) missing.push(name);
    }
    // Existence is resolved against the DISCOVERED packages, not a guessed path: skills
    // nest (`brands/nu-style`, `illustrators/journey-illustrator`), so assuming a flat
    // layout reported seven live skills as stale. A router entry may also name a slash
    // COMMAND rather than a package, so that root counts too.
    const COMMANDS_ROOT = join(REPO_ROOT, '.claude', 'commands');
    const discovered = new Set(skillDirs.map(d => d.split(/[\\/]/).pop()));
    for (const name of named) {
        const isCommand = existsSync(join(COMMANDS_ROOT, `${name}.md`));
        if (!discovered.has(name) && !isCommand) stale.push(name);
    }
    if (missing.length) {
        add('warning', 'router.unrouted-skill', 'ask-hic',
            `${missing.length} model-reachable skill(s) the router never mentions: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ', ...' : ''}`);
    }
    for (const name of stale) {
        add('error', 'router.stale-entry', 'ask-hic',
            `router points at '${name}', which has no SKILL.md; a router that names a skill that does not exist is worse than no router`);
    }
}
// Router sync is also a property of the REAL library: a fixture tree has no router and
// owes none.
if (!process.env.HIC_SKILLS_ROOT) checkRouterSync(skillDirs);

const errors = findings.filter(f => f.severity === 'error');
const warnings = findings.filter(f => f.severity === 'warning');

if (asJson) {
    console.log(JSON.stringify({
        schema: 'hic.skill-check.v1',
        skills: skillDirs.length,
        errors: errors.length,
        warnings: warnings.length,
        findings,
    }, null, 2));
} else {
    console.log(`[check-skills] ${skillDirs.length} skill package(s) under .claude/skills`);
    const bySkill = new Map();
    for (const f of findings) {
        if (!bySkill.has(f.skill)) bySkill.set(f.skill, []);
        bySkill.get(f.skill).push(f);
    }
    for (const [skill, list] of Array.from(bySkill.entries()).sort()) {
        const errs = list.filter(f => f.severity === 'error').length;
        console.log(`\n  ${skill}${errs ? `  [${errs} error(s)]` : ''}`);
        for (const f of list) console.log(`    ${f.severity === 'error' ? 'ERROR ' : 'warn  '} ${f.rule}: ${f.message}`);
    }
    // E2.3: the DISTRIBUTION is the measurement this item was about, and an unreported
    // measurement is the same as none. The per-turn count is the number that matters: a
    // runtime or human package costs nothing until someone reaches for it.
    const dist = invocationClasses.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    console.log(`\n[check-skills] invocation: ${dist.model || 0} model, ${dist.runtime || 0} runtime, ${dist.human || 0} human${dist.unset ? `, ${dist.unset} UNSET` : ''}`);
    console.log(`[check-skills] ${dist.model || 0} description(s) load into model context per turn; runtime and human packages pay none`);
    console.log(`[check-skills] ${errors.length} error(s), ${warnings.length} warning(s)`);
}

process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
