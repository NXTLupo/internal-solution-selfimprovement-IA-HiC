/**
 * skill-registry-lib.mjs - 2026-10-31 (plan agent-stack-shared-memory-skills-uplift, WS-A A1)
 *
 * ONE reader of the skill library. Before this module four surfaces each read the skills their own way:
 * the SPA fetched a hand-kept `hic-workspace/skill-manifest.json` (31 entries, 3 of them virtual
 * `inline://` stubs, one id listed twice, every `bestModel` stale), Claude Code parsed the frontmatter
 * itself (12 frontmatters were invalid YAML, so those skills reached it with no description), the
 * platform agent had no skills, and NXT-Agency described its tools in its own words.
 *
 * Now the SKILL.md frontmatter is the single source:
 *   - `buildRegistry()` reads every package and emits `hic-workspace/skill-registry.json`
 *     (id, path, description, invocation, version, status, triggers, composes_with, the loader
 *     binding, a content hash), the file every agent surface mounts;
 *   - `manifestView()` derives `hic-workspace/skill-manifest.json` from the registry: one entry per
 *     skill whose frontmatter declares a `loader:` block, in the exact shape `corpusChatService`
 *     already consumes. The manifest is a VIEW; hand edits are drift and `check:skills` fails on them.
 *
 * Frontmatter is parsed with the `yaml` package (a direct dependency), the same grammar Claude Code
 * applies, so a description that would be truncated or rejected there is caught here.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const HIC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = resolve(HIC_ROOT, '..');
export const DEFAULT_SKILLS_ROOT = join(REPO_ROOT, '.claude', 'skills');
export const REGISTRY_PATH = join(HIC_ROOT, 'hic-workspace', 'skill-registry.json');
export const MANIFEST_PATH = join(HIC_ROOT, 'hic-workspace', 'skill-manifest.json');

/** The loading roles `corpusChatService.matchSkills` and the context loader understand. */
export const LOADER_ROLES = ['research-deliverable', 'render-contract', 'retrieval-enhancer', 'quality-enhancer',
    'prompt-engineering', 'rendering-system', 'self-improvement'];
export const STATUSES = ['active', 'dormant', 'deprecated'];
export const INVOCATIONS = ['model', 'runtime', 'human'];
export const THINKING = ['max', 'xhigh', 'high', 'medium', 'low'];
/** Agent surfaces that MOUNT a skill as a system-prompt package (WS-A A4). Every surface can still fetch any
 *  active skill on demand (research-mcp get_skill); `surfaces` is only the always-loaded set. */
export const SURFACES = ['spa', 'claude-code', 'platform-agent', 'nxt-agency', 'research-mcp'];

/** A directory containing SKILL.md is a skill; nesting is allowed (`brands/nu-style`). */
export function discoverSkills(root = DEFAULT_SKILLS_ROOT) {
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

/** Split and parse a SKILL.md. `rawFrontmatter` is kept so callers can lint the source text itself. */
export function parseSkillText(text) {
    const norm = text.replace(/\r\n/g, '\n');
    if (!norm.startsWith('---\n')) return { meta: null, body: norm, rawFrontmatter: '', error: 'no YAML frontmatter' };
    const end = norm.indexOf('\n---', 3);
    if (end === -1) return { meta: null, body: norm, rawFrontmatter: '', error: 'unterminated frontmatter' };
    const rawFrontmatter = norm.slice(4, end);
    const body = norm.slice(end + 4).replace(/^\n/, '');
    try {
        const meta = YAML.parse(rawFrontmatter);
        if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return { meta: null, body, rawFrontmatter, error: 'frontmatter is not a mapping' };
        return { meta, body, rawFrontmatter, error: null };
    } catch (e) {
        return { meta: null, body, rawFrontmatter, error: `invalid YAML: ${String(e.message).split('\n')[0]}` };
    }
}

const strList = (v) => (Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? [v] : []))
    .map(x => String(x).trim()).filter(Boolean);

function sha256(text) {
    return createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex').slice(0, 16);
}

/** One registry entry from one package. Never throws; a parse error is carried on the entry. */
export function registryEntry(skillDir, root = DEFAULT_SKILLS_ROOT) {
    const rel = relative(root, skillDir).split(/[\\/]/).join('/');
    const file = join(skillDir, 'SKILL.md');
    const text = readFileSync(file, 'utf8');
    const { meta, error } = parseSkillText(text);
    const m = meta || {};
    const id = String(m.name || rel.split('/').pop());
    const entry = {
        id,
        dir: rel,
        path: `/skills/${rel}/SKILL.md`,
        description: typeof m.description === 'string' ? m.description.trim() : '',
        invocation: typeof m.invocation === 'string' ? m.invocation : '',
        model_invocable: m['disable-model-invocation'] !== true,
        version: m.version === undefined || m.version === null ? '' : String(m.version),
        status: typeof m.status === 'string' ? m.status : '',
        sha: sha256(text),
        bytes: Buffer.byteLength(text, 'utf8'),
    };
    if (m.dormant_since) entry.dormant_since = String(m.dormant_since);
    if (m.thinking) entry.thinking = String(m.thinking);
    if (m.category) entry.category = String(m.category);
    const triggers = strList(m.triggers);
    if (triggers.length) entry.triggers = triggers;
    const composes = strList(m.composes_with);
    if (composes.length) entry.composes_with = composes;
    const surfaces = strList(m.surfaces);
    if (surfaces.length) entry.surfaces = surfaces;
    if (m.loader && typeof m.loader === 'object') {
        const L = m.loader;
        entry.loader = {
            title: String(L.title || id),
            role: String(L.role || ''),
            ...(L.execution_context ? { execution_context: String(L.execution_context) } : {}),
            ...(L.thinking_effort ? { thinking_effort: String(L.thinking_effort) } : {}),
            wiki_companions: strList(L.wiki_companions),
            benchmarks: strList(L.benchmarks),
            skill_references: strList(L.skill_references),
            output_types: strList(L.output_types),
        };
    }
    if (error) entry.parse_error = error;
    return entry;
}

/** The registry every agent surface mounts. Deterministic: no timestamps, stable order. */
export function buildRegistry(root = DEFAULT_SKILLS_ROOT) {
    const skills = discoverSkills(root).map(d => registryEntry(d, root)).sort((a, b) => a.id.localeCompare(b.id));
    return {
        schema: 'hic.skill-registry.v1',
        generated_by: 'humans-in-control-research/scripts/build-skill-registry.mjs',
        source: '.claude/skills/**/SKILL.md frontmatter',
        count: skills.length,
        skills,
    };
}

/** Map a frontmatter thinking level onto the manifest's legacy three-value effort hint. */
function effortHint(v) {
    const s = String(v || '').toLowerCase();
    if (s === 'max' || s === 'xhigh') return 'max';
    if (s === 'high') return 'high';
    return 'medium';
}

/**
 * The runtime manifest the SPA loads: every non-deprecated skill with a loader binding, in the shape
 * `SkillManifestEntry` declares. Field names stay camelCase because that is the consumer's contract.
 */
export function manifestView(registry) {
    return registry.skills
        .filter(s => s.loader && s.status !== 'deprecated')
        .map(s => ({
            id: s.id,
            name: s.loader.title,
            description: s.description,
            category: s.loader.role,
            version: s.version,
            status: s.status,
            triggers: s.triggers || [],
            ...(s.composes_with ? { composes_with: s.composes_with } : {}),
            wikiCompanions: s.loader.wiki_companions,
            benchmarks: s.loader.benchmarks,
            skillReferences: s.loader.skill_references,
            outputTypes: s.loader.output_types,
            thinkingEffort: effortHint(s.loader.thinking_effort || s.thinking),
            ...(s.loader.execution_context ? { executionContext: s.loader.execution_context } : {}),
            path: s.path,
        }));
}

export function stableJson(obj) {
    return JSON.stringify(obj, null, 1) + '\n';
}

/** Literal model references a skill must not carry (WS-A A2): Claude routing has ONE authority. */
export function knownModelStatuses() {
    const p = join(HIC_ROOT, 'proxy', 'model_registry.py');
    const out = new Map();
    if (!existsSync(p)) return out;
    const text = readFileSync(p, 'utf8');
    const block = /KNOWN_MODELS\s*=\s*\{([\s\S]*?)\n\}/.exec(text);
    if (!block) return out;
    for (const m of block[1].matchAll(/"([a-z0-9.-]+)":\s*\{[^}]*"status":\s*"(\w+)"(?:[^}]*"successor":\s*"([a-z0-9.-]+)")?/g)) {
        out.set(m[1], { status: m[2], successor: m[3] || null });
    }
    return out;
}

const CLAUDE_ID = /\bclaude-(?:opus|sonnet|haiku|fable|mythos|instant|\d)[a-z0-9.-]*\d\b/gi;
const CLAUDE_NAME = /\b(?:Claude\s+)?(?:Opus|Sonnet|Haiku|Fable|Mythos)\s+\d(?:\.\d+)?\b/g;
const OTHER_ID = /\b(?:gemini|gpt|deepseek|o\d)-[a-z0-9.-]*\d[a-z0-9.-]*\b/gi;

export function modelLiteralFindings(text, statuses = knownModelStatuses()) {
    const findings = [];
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    lines.forEach((line, i) => {
        for (const m of line.matchAll(CLAUDE_ID)) findings.push({ line: i + 1, kind: 'claude-id', token: m[0] });
        for (const m of line.matchAll(CLAUDE_NAME)) findings.push({ line: i + 1, kind: 'claude-name', token: m[0] });
        for (const m of line.matchAll(OTHER_ID)) {
            const s = statuses.get(m[0].toLowerCase());
            if (s && s.status !== 'active') findings.push({ line: i + 1, kind: `${s.status}-model`, token: m[0], successor: s.successor });
        }
    });
    return findings;
}
