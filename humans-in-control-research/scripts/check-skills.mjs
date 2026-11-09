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
 * 2026-10-31 (agent-stack plan WS-A A1/A2): the audit is a GATE. Frontmatter is parsed with the real
 * YAML grammar (scripts/skill-registry-lib.mjs, the reader every surface shares), and what used to be
 * 72 standing warnings are now errors: invalid YAML (12 skills reached Claude Code with no
 * description), an unquoted ` #` that truncates a description, a description over the 300-char routing
 * budget or with angle brackets, a missing version, invocation or status, a dormant skill without its
 * date, a literal Claude model name (Claude routing has ONE authority: claudeModelPolicy), a sunset
 * model id, a loader binding that points at a missing file, and DRIFT between the SKILL.md frontmatter
 * and the generated hic-workspace/skill-registry.json / skill-manifest.json.
 *
 * Usage:
 *   node scripts/check-skills.mjs            # human-readable report
 *   node scripts/check-skills.mjs --json     # machine-readable
 *   node scripts/check-skills.mjs --strict   # warnings also fail
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, resolve, posix } from 'node:path';
import {
    HIC_ROOT, REPO_ROOT, parseSkillText, discoverSkills as discoverSkillDirs, buildRegistry, manifestView, stableJson,
    REGISTRY_PATH, MANIFEST_PATH, LOADER_ROLES, STATUSES, INVOCATIONS, SURFACES, modelLiteralFindings, knownModelStatuses,
} from './skill-registry-lib.mjs';
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
    // WS-A A1/A2 (2026-10-31): lifecycle and the runtime-loader binding the manifest is generated from.
    'status', 'dormant_since', 'composes_with', 'loader', 'surfaces', 'skillopt',
]);
const LOADER_KEYS = new Set(['title', 'role', 'execution_context', 'thinking_effort', 'wiki_companions', 'benchmarks',
    'skill_references', 'output_types']);
const MODEL_STATUSES = knownModelStatuses();

const RESOURCE_DIRS = new Set(['references', 'scripts', 'templates', 'assets', 'evals']);
const MD_LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_SPAN = /`([^`\n]+)`/g;
const PATH_TOKEN = /(?<![\w./-])(?:references|scripts|templates|assets|evals)\/[A-Za-z0-9._~/%+-]+/g;

const findings = [];
/** E2.3: one entry per skill, so the run can report the invocation distribution. */
const invocationClasses = [];
const add = (severity, rule, skill, message, extra = {}) =>
    findings.push({ severity, rule, skill, message, ...extra });

// Discovery and parsing live in skill-registry-lib.mjs (one reader for every surface).
const discoverSkills = discoverSkillDirs;

// ---------------------------------------------------------------------------
// Analyzer 1: frontmatter
// ---------------------------------------------------------------------------
function checkFrontmatter(skillDir, rel, meta, fmError, rawFrontmatter = '') {
    if (fmError) { add('error', 'frontmatter.invalid', rel, `${fmError}; Claude Code parses the same YAML and drops what it cannot read`); return null; }
    const name = String(meta.name || '').trim();
    const description = typeof meta.description === 'string' ? meta.description.trim() : '';
    // YAML reads ` #` as a comment: `description: Use for #questionnaire. ...` parsed as "Use for".
    const rawDesc = /^description:[ \t]*(.*)$/m.exec(rawFrontmatter);
    if (rawDesc && !/^["'>|]/.test(rawDesc[1]) && /\s#/.test(rawDesc[1])) {
        add('error', 'frontmatter.description-hash-comment', rel, 'unquoted description contains " #", which YAML reads as a comment and truncates; quote the description');
    }

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
        if (description.length > 1024) add('error', 'frontmatter.description-length', rel, `description is ${description.length} chars (deer-flow caps catalog descriptions at 1024)`);
        // 2026-10-31: an error now. The description is rendered into the registry, the agent's system
        // prompt and Claude Code's skill list; a placeholder in angle brackets reads as markup in two of them.
        if (/[<>]/.test(description)) add('error', 'frontmatter.description-brackets', rel, 'description contains angle brackets');
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
            add('error', 'frontmatter.description-budget', rel,
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
    const invocation = String(meta.invocation || '').trim();
    invocationClasses.push(invocation || 'unset');
    if (!invocation) {
        add('error', 'frontmatter.invocation-missing', rel,
            'no invocation class: declare model (the agent reaches for it mid-task), runtime (HiC loads it from the manifest by path) or human (a person invokes it by name)');
    }
    const disabled = meta['disable-model-invocation'] === true;
    if (typeof meta['disable-model-invocation'] === 'string') {
        add('error', 'frontmatter.boolean-as-string', rel, "disable-model-invocation is a quoted string; write the YAML boolean true or false");
    }

    // WS-A A2: lifecycle fields. Every package carries a version and a status, and a dormant one says since when.
    const version = meta.version === undefined || meta.version === null ? '' : String(meta.version).trim();
    if (!version) add('error', 'frontmatter.version-missing', rel, 'no version: SkillOpt, the registry and the agent passport key on it');
    const status = String(meta.status || '').trim();
    if (!status) add('error', 'frontmatter.status-missing', rel, `no status: declare one of ${STATUSES.join(' | ')}`);
    else if (!STATUSES.includes(status)) add('error', 'frontmatter.status-invalid', rel, `status '${status}' is not one of ${STATUSES.join(' | ')}`);
    if (status === 'dormant' && !meta.dormant_since) add('error', 'frontmatter.dormant-undated', rel, 'dormant without dormant_since: the 60-day retirement window needs a start date');
    if (meta.loader !== undefined) checkLoader(skillDir, rel, meta.loader);
    // WS-A A4: surfaces that mount the skill as an always-loaded package must be known, and a dormant skill
    // cannot be mounted anywhere (a mount is a caller).
    if (meta.surfaces !== undefined) {
        const list = Array.isArray(meta.surfaces) ? meta.surfaces : [meta.surfaces];
        for (const s of list) if (!SURFACES.includes(String(s))) add('error', 'frontmatter.surface-invalid', rel, `surface '${s}' is not one of ${SURFACES.join(' | ')}`);
        if (status === 'dormant' && list.length) add('error', 'frontmatter.dormant-mounted', rel, 'a dormant skill cannot be mounted on a surface: the mount is a caller');
    }
    if (invocation && !INVOCATIONS.includes(invocation)) {
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

/**
 * WS-A A1: the loader binding is what `skill-manifest.json` is generated from. A companion that does
 * not exist would be fetched as a 404 and silently dropped from the prompt, so every path is checked.
 */
function checkLoader(skillDir, rel, loader) {
    if (!loader || typeof loader !== 'object' || Array.isArray(loader)) {
        add('error', 'loader.shape', rel, 'loader must be a mapping'); return;
    }
    for (const k of Object.keys(loader)) if (!LOADER_KEYS.has(k)) add('error', 'loader.unknown-key', rel, `unrecognized loader key '${k}'`);
    if (!String(loader.title || '').trim()) add('error', 'loader.title-missing', rel, 'loader.title is the display name the prompt lists');
    if (!LOADER_ROLES.includes(String(loader.role || ''))) add('error', 'loader.role-invalid', rel, `loader.role '${loader.role}' is not one of ${LOADER_ROLES.join(' | ')}`);
    const wiki = join(HIC_ROOT, 'hic-workspace', 'wiki');
    for (const key of ['wiki_companions', 'benchmarks']) {
        for (const p of (Array.isArray(loader[key]) ? loader[key] : [])) {
            if (!existsSync(join(wiki, p))) add('error', 'loader.missing-companion', rel, `loader.${key} points at a wiki page that does not exist: ${p}`);
        }
    }
    for (const p of (Array.isArray(loader.skill_references) ? loader.skill_references : [])) {
        if (!existsSync(join(skillDir, p))) add('error', 'loader.missing-reference', rel, `loader.skill_references points at a file not in the package: ${p}`);
    }
}

/**
 * WS-A A2: no literal Claude model in a skill. Claude routing has ONE authority (services/
 * claudeModelPolicy.ts, proxy/model_registry.py); a skill that names "Sonnet 4.6" keeps telling the
 * model to use a tier the router retired. Name the role ("the reasoning model", "the structured Claude
 * model") instead. Non-Claude ids are allowed while the registry lists them active.
 */
function checkModelLiterals(rel, text) {
    for (const f of modelLiteralFindings(text, MODEL_STATUSES)) {
        const why = f.kind.startsWith('claude')
            ? 'name the role (the reasoning model, the structured Claude model) instead; the id lives in claudeModelPolicy'
            : `the registry marks it ${f.kind.replace('-model', '')}${f.successor ? `; its successor is ${f.successor}` : ''}`;
        add('error', 'content.model-literal', rel, `line ${f.line}: '${f.token}': ${why}`);
    }
}

/**
 * WS-A A3 (2026-10-31): SkillOpt edits METHOD, never the contract. A skill that SkillOpt may train declares
 * `skillopt: trainable` and wraps its contract sections in SLOW_UPDATE_START/END; run-skillopt.py --pool
 * refuses a skill without a block, and this gate refuses a trainable skill without one, or with an
 * unbalanced pair (an unterminated block silently protects to the end of the file).
 */
const SLOW_START = '<!-- SLOW_UPDATE_START -->';
const SLOW_END = '<!-- SLOW_UPDATE_END -->';
const trainable = new Set();
function checkSlowUpdate(rel, meta, text) {
    const starts = text.split(SLOW_START).length - 1;
    const ends = text.split(SLOW_END).length - 1;
    if (meta.skillopt !== undefined && meta.skillopt !== 'trainable') add('error', 'skillopt.value', rel, "skillopt must be 'trainable' when present");
    if (meta.skillopt === 'trainable' && starts === 0) add('error', 'skillopt.unprotected', rel, 'trainable skill has no SLOW_UPDATE block around its contract sections; the pool would be free to rewrite them');
    if (starts !== ends) { add('error', 'skillopt.unbalanced', rel, `${starts} SLOW_UPDATE_START vs ${ends} SLOW_UPDATE_END`); return; }
    let pos = 0;
    for (let i = 0; i < starts; i++) {
        const s = text.indexOf(SLOW_START, pos);
        const e = text.indexOf(SLOW_END, s);
        const nextStart = text.indexOf(SLOW_START, s + SLOW_START.length);
        if (e < 0 || (nextStart > 0 && nextStart < e)) { add('error', 'skillopt.nested', rel, 'SLOW_UPDATE blocks nest or interleave'); return; }
        pos = e + SLOW_END.length;
    }
}

/** The SkillOpt batch trains the skills in its KINDS map; each must be declared trainable (and so protected). */
function checkSkilloptBatchMap() {
    const batch = join(HIC_ROOT, 'scripts', 'skillopt-batch.sh');
    if (!existsSync(batch)) return;
    const m = /declare -A KINDS=\(([\s\S]*?)\n\)/.exec(readFileSync(batch, 'utf8').replace(/\r\n/g, '\n'));
    if (!m) return;
    for (const k of m[1].matchAll(/\[([a-z0-9-]+)\]=/g)) {
        if (!trainable.has(k[1])) add('error', 'skillopt.batch-untrainable', k[1], 'scripts/skillopt-batch.sh trains this skill but its frontmatter does not declare skillopt: trainable');
    }
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
                // 2026-10-31: `/hic-workspace/...` and `/skills/...` are SERVED paths (nginx and Vite map
                // them onto humans-in-control-research/hic-workspace and .claude/skills); resolving them
                // against the repo root reported two live catalog files as missing.
                const candidate = ref.startsWith('/hic-workspace/')
                    ? join(HIC_ROOT, ref.slice(1))
                    : ref.startsWith('/skills/')
                        ? join(SKILLS_ROOT, ref.slice('/skills/'.length))
                        : ref.startsWith('/')
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
                // INFO, not a warning: a declared output that has not been produced yet is intent, not
                // rot (the comment above), and counting it as a warning made a clean library impossible.
                add('info', 'resource.write-target-absent', rel, `declared output does not exist yet: ${ref}`);
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
    const { meta, error, rawFrontmatter } = parseSkillText(text);
    const name = checkFrontmatter(dir, rel, meta || {}, error, rawFrontmatter);
    checkModelLiterals(rel, text);
    checkSlowUpdate(rel, meta || {}, text);
    if (meta && meta.skillopt === 'trainable' && name) trainable.add(name);
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
if (!process.env.HIC_SKILLS_ROOT) checkSkilloptBatchMap();

/**
 * Analyzer 6: REGISTRY DRIFT (WS-A A1). The registry and the runtime manifest are generated from the
 * frontmatter; a hand edit to either, or a frontmatter edit without a rebuild, is drift. Scoped to the
 * real library, like the router check.
 */
let registrySummary = null;
if (!process.env.HIC_SKILLS_ROOT) {
    const registry = buildRegistry(SKILLS_ROOT);
    const view = manifestView(registry);
    registrySummary = { skills: registry.count, manifest: view.length, dormant: registry.skills.filter(s => s.status === 'dormant').length };
    const want = [[REGISTRY_PATH, stableJson(registry)], [MANIFEST_PATH, stableJson(view)]];
    for (const [path, text] of want) {
        const have = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : '';
        if (have !== text) add('error', 'registry.drift', relative(REPO_ROOT, path).replace(/\\/g, '/'),
            'differs from a fresh build of the SKILL.md frontmatter; run `npm run build:skills` (never hand-edit the generated file)');
    }
    for (const s of registry.skills) {
        if (s.loader && s.status === 'dormant') add('error', 'registry.dormant-in-manifest', s.dir, 'a dormant skill cannot carry a loader binding: the runtime loads it, so it has a caller');
    }
}

const errors = findings.filter(f => f.severity === 'error');
const warnings = findings.filter(f => f.severity === 'warning');
const infos = findings.filter(f => f.severity === 'info');

if (asJson) {
    console.log(JSON.stringify({
        schema: 'hic.skill-check.v1',
        skills: skillDirs.length,
        errors: errors.length,
        warnings: warnings.length,
        infos: infos.length,
        registry: registrySummary,
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
        for (const f of list) console.log(`    ${f.severity === 'error' ? 'ERROR ' : f.severity === 'info' ? 'info  ' : 'warn  '} ${f.rule}: ${f.message}`);
    }
    // E2.3: the DISTRIBUTION is the measurement this item was about, and an unreported
    // measurement is the same as none. The per-turn count is the number that matters: a
    // runtime or human package costs nothing until someone reaches for it.
    const dist = invocationClasses.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    console.log(`\n[check-skills] invocation: ${dist.model || 0} model, ${dist.runtime || 0} runtime, ${dist.human || 0} human${dist.unset ? `, ${dist.unset} UNSET` : ''}`);
    console.log(`[check-skills] ${dist.model || 0} description(s) load into model context per turn; runtime and human packages pay none`);
    if (registrySummary) console.log(`[check-skills] registry: ${registrySummary.skills} skill(s), ${registrySummary.manifest} in the runtime manifest, ${registrySummary.dormant} dormant`);
    console.log(`[check-skills] ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info`);
}

process.exit(errors.length > 0 || (strict && warnings.length > 0) ? 1 : 0);
