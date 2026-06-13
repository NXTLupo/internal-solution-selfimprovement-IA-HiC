// services/artifactExpertPanel.ts
// Expert-panel pre-emit system - 2026-05-25
//
// Routes each artifact type to its appropriate domain expert (user researcher
// for personas, UX researcher for journeys, service designer for blueprints,
// org designer for org charts, systems architect for tech architectures, etc.),
// runs a structured critique, and composes with the existing criticReviseLoop
// primitive to apply revisions back into the deliverable.
//
// Design principle: this is the "expert panel" layer the user asked for in
// task #93. Every artifact gets domain-expert review BEFORE shipping, with
// the critique fed back as structured CriticEdits - not free-form prose the
// caller has to re-interpret. The same primitive that powers Phase 3 critic-
// revise loops on recommendations now powers per-kind expert review on every
// freeform artifact.
//
// Wire-up: call runExpertPanel(...) at the end of any artifact generation
// path. The function is idempotent - passing an artifact through twice is
// safe (the critics will accept on second pass when the first pass landed).

import { criticReviseLoop, type CriticConfig, type CriticInvoker, type CriticReviseLoopResult, type CriticVerdict } from './criticReviseLoop';
import { parseJSONWithRepair } from './aiOutputRepair';
import { withResilience, isThrottleError, type DegradationEvent } from './multiModelResilience';
// 2026-05-25 - Real LLM critic dispatcher. Replaces the prior pass-through
// default so domain experts (pre-mortem, persona-architect, etc.) actually
// fire against the Anthropic proxy.
import { dispatchCritic } from './criticDispatcher';

// ─── Artifact kind → expert critic config ────────────────────────────────────
// Each kind names the experts that should review that artifact type. The
// experts are skills (in .claude/skills/*) the model can invoke via the
// criticReviseLoop primitive - same plumbing already used for recommendations
// and strategy.

export type ArtifactKind =
    | 'persona'
    | 'journey'
    | 'blueprint'
    | 'org'
    | 'arch'
    | 'roadmap'
    | 'mindmap'
    | 'brief-dialog'
    | 'meta-themes'
    | 'research-plan'
    | 'gap-analysis'
    | 'tech-audit'
    | 'competitive'
    | 'heuristic-ux'
    | 'prd'
    | 'strategy-slide'
    | 'presentation';


/**
 * Per-kind expert panel definitions. The "experts" are domain-expert critic
 * skills that already live in .claude/skills/ (e.g., pre-mortem, stakeholder-
 * lens-auditor, quantification-architect). For kinds without a tailored skill,
 * a generic expert critique fires.
 *
 * The full design discipline per kind is documented in the corresponding
 * exemplar-skills/diagrams/*-illustrator/SKILL.md files; the experts named
 * here are the SUBSET that auto-fire on every generation.
 */
export const EXPERT_PANELS: Record<ArtifactKind, CriticConfig[]> = {
    // User-research lineage: Cooper, Indi Young, Goodwin
    // 2026-05-25 - JM-depth uplift extends persona panel with evidence-quality-
    // auditor to enforce the learned constraint "use verbatim excerpts from
    // actual user research; generic or fabricated quotes lack authenticity"
    // (5 feedback signals, confidence 0.85). The verbatim-quote-auditor catches
    // the quote fabrication failure mode; evidence-quality-auditor validates
    // the source diversity floor (>=60% external) per .claude/CLAUDE.md.
    persona: [
        { skill_name: 'persona-architect',         max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'verbatim-quote-auditor',    max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'evidence-quality-auditor',  max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'contradiction-finder',      max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // UX research lineage: NN/g, This Is Service Design Doing
    // 2026-05-25 - JM-depth uplift adds verbatim-quote-auditor (validates that
    // .vq cells contain actual corpus text, not fabricated quotes - the single
    // load-bearing trust signal for the journey artifact) and pre-mortem (cross-
    // cutting risk lens on the journey's headline diagnostic). These two
    // critics catch the failure modes most likely to destroy stakeholder trust
    // when the journey artifact reaches a finished consulting reader.
    journey: [
        { skill_name: 'journey-illustrator',       max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'verbatim-quote-auditor',    max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'evidence-quality-auditor',  max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Service design lineage: Shostack, Stickdorn
    // 2026-05-25 - JM-depth pattern: blueprint inherits the journey grid layout
    // with future-state framing. Adds verbatim-quote-auditor (each step needs
    // a corpus-grounded evidence quote per skill spec) and quantification-
    // architect (projected-impact tiles need finance-grade four-tuple).
    blueprint: [
        { skill_name: 'service-blueprint-mapper',  max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'verbatim-quote-auditor',    max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'quantification-architect',  max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Org design lineage: McKinsey 7S, Greiner
    org: [
        { skill_name: 'org-illustrator',           max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Systems architecture lineage: Brooks, Fowler, Newman
    arch: [
        { skill_name: 'tech-arch-generator',       max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Product strategy lineage: Three Horizons, OKRs
    // Learned constraint: every horizon item must have a specific quantified
    // success metric with baseline and timeframe (4 feedback signals). The
    // quantification-architect runs 2 iterations to enforce the four-tuple.
    roadmap: [
        { skill_name: 'roadmap-builder',           max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'quantification-architect',  max_iterations: 2, invocation_model: 'sonnet-4.6' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Information architecture
    mindmap: [
        { skill_name: 'mind-map-architect',        max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Strategic communications
    'brief-dialog': [
        { skill_name: 'brief-dialog',              max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'verbatim-quote-auditor',    max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Knowledge synthesis
    'meta-themes': [
        { skill_name: 'meta-themes',               max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Research operations
    'research-plan': [
        { skill_name: 'research-planner',          max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Strategic diagnosis - learned constraint: "quantify gap impact in dollars
    // instead of qualitative descriptions" (5 feedback signals, confidence 0.85).
    // The quantification-architect critic enforces the four-tuple (baseline,
    // target, measurement method, refresh cadence); pre-mortem surfaces risks
    // that would prevent the dollar-quantified gap from being recovered.
    'gap-analysis': [
        { skill_name: 'gap-analysis-evaluator',    max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'quantification-architect',  max_iterations: 2, invocation_model: 'sonnet-4.6' },
        { skill_name: 'evidence-quality-auditor',  max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Engineering audit
    'tech-audit': [
        { skill_name: 'tech-audit-inspector',      max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Competitive strategy
    competitive: [
        { skill_name: 'competitive-analyst',       max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // UX heuristic audit (Nielsen 10)
    'heuristic-ux': [
        { skill_name: 'evidence-quality-auditor',  max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Product management
    prd: [
        { skill_name: 'prd-compiler',              max_iterations: 1, invocation_model: 'sonnet-4.6' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Strategy slide (Rumelt + Minto)
    'strategy-slide': [
        { skill_name: 'strategy-author',           max_iterations: 1, invocation_model: 'opus-4.8' },
        { skill_name: 'pre-mortem',                max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],

    // Multi-slide presentation deck
    presentation: [
        { skill_name: 'deck-narrative-composer',   max_iterations: 1, invocation_model: 'sonnet-4.6' },
    ],
};


// ─── Universal critics that always run last ──────────────────────────────────
// These check rules that apply to EVERY artifact regardless of kind:
//   - anti-slop blacklist (verbal tics, em-dashes, knowledge-cutoff disclaimers,
//     copula avoidance, AI triads, format tells)
//   - structural conformance (no deprecated layouts, no debug metadata,
//     no graphic collisions)
// They run AFTER the kind-specific experts so the domain edits land first,
// then the cross-cutting hygiene pass cleans up anything the domain experts
// introduced.

export const UNIVERSAL_CRITICS: CriticConfig[] = [
    { skill_name: 'anti-slop-auditor',       max_iterations: 1, invocation_model: 'haiku-4.5' },
    { skill_name: 'structural-conformance',  max_iterations: 1, invocation_model: 'haiku-4.5' },
];


// ─── Default budgets per kind ────────────────────────────────────────────────
// Budget cap covers the entire panel run including UNIVERSAL_CRITICS.
// Higher-leverage artifacts (strategy slide, presentation) get larger budgets;
// hygiene artifacts (mindmap, meta-themes) get smaller budgets.

export const PANEL_BUDGETS_USD: Record<ArtifactKind, number> = {
    persona:         0.55,
    // 2026-05-25 - Journey panel now fires 4 critics (was 2) per JM-depth
    // uplift. Budget raised proportionally; verbatim-quote-auditor +
    // pre-mortem each consume ~0.10 USD on Sonnet 4.6.
    journey:         0.60,
    blueprint:       0.60,
    org:             0.30,
    arch:            0.50,
    roadmap:         0.55,
    mindmap:         0.25,
    'brief-dialog':  0.35,
    'meta-themes':   0.25,
    'research-plan': 0.30,
    'gap-analysis':  0.65,
    'tech-audit':    0.30,
    competitive:     0.35,
    'heuristic-ux':  0.30,
    prd:             0.40,
    'strategy-slide': 0.75,
    presentation:    0.85,
};


// ─── Built-in deterministic invoker for the universal critics ────────────────
// Anti-slop and structural-conformance run as deterministic checks (no LLM
// call needed) - the patterns are well-defined regex and DOM-shape rules.
// This keeps the universal pass cheap and reliable.

const EM_DASH_RE = /-/g;
const UNICODE_BOLD_ITALIC_RE = /[\u{1D400}-\u{1D7FF}]/u;
const CHATGPT_ARTIFACT_RE = /\b(oaicite|oai_citation|contentReference|attached_file|attributableIndex|turn\d+search\d+)\b/i;
const KNOWLEDGE_CUTOFF_RE = /\b(as an ai|i'm an ai|i am an ai|as of my knowledge cutoff|my training data|i don't have real-time|i should note)\b/i;
const DEBUG_BRACKET_RE = /^\s*\[(Life|Experience|Functional)\]/i;

const HIGH_SLOP_PHRASES = [
    'delve', 'delves into', 'tapestry', 'rich tapestry', 'is a testament',
    'meticulous', 'meticulously', 'nestled', 'vibrant', 'enduring legacy',
    'interplay', 'boasts a', 'boasts an', 'of paramount', 'valuable insights',
    'pivotal moment', 'pivotal role', 'plays a pivotal role',
    'plays a crucial role', 'plays a key role', 'marks a pivotal',
    'represents a paradigm', 'as technology continues to evolve',
];

function deterministicCriticInvoker(skill: string, deliverable: unknown): CriticVerdict {
    const text = JSON.stringify(deliverable);
    const edits: any[] = [];
    const issues: string[] = [];

    if (skill === 'anti-slop-auditor') {
        // 2026-05-25 - Hygiene strip ALWAYS fires (covers em-dashes + slop-phrase
        // substitution). Previously gated on em-dash presence; that missed
        // "leveraging" → "using", "utilize" → "use", etc. in HTML artifacts.
        const lower = text.toLowerCase();
        const hasEm = EM_DASH_RE.test(text);
        EM_DASH_RE.lastIndex = 0;
        const hasAnySlop = HIGH_SLOP_PHRASES.some(p => lower.includes(p))
            || /\b(?:leveraging|leverages|utilize|utilizing|facilitate|facilitating|showcas|enhanc|bolster|foster)\b/i.test(text);
        if (hasEm || hasAnySlop) {
            if (hasEm) issues.push(`em-dash character (U+2014) present`);
            edits.push({
                target_path: '$ROOT',
                action: 'replace',
                new_value: { __sentinel: 'strip-em-dashes-in-all-strings' },
                reason: 'anti-slop: em-dash + slop-phrase auto-strip',
            });
        }
        if (UNICODE_BOLD_ITALIC_RE.test(text)) {
            issues.push('Unicode bold/italic stylization characters present');
        }
        if (CHATGPT_ARTIFACT_RE.test(text)) {
            issues.push('ChatGPT artifact-tag leakage (oaicite / turn0search0 / contentReference)');
        }
        if (KNOWLEDGE_CUTOFF_RE.test(text)) {
            issues.push('Knowledge-cutoff or AI-aware disclaimer present');
        }
        for (const phrase of HIGH_SLOP_PHRASES) {
            if (lower.includes(phrase)) {
                issues.push(`high-severity slop phrase: "${phrase}"`);
            }
        }
    }

    if (skill === 'structural-conformance') {
        // The detailed per-kind structural checks live in
        // .claude/hooks/scripts/validate_freeform_structure.py; here we only
        // surface the deliverable-level patterns the LLM-side can correct.
        const arrCheck = (deliverable as any)?.goals;
        if (Array.isArray(arrCheck)) {
            for (let i = 0; i < arrCheck.length; i++) {
                const g = arrCheck[i];
                if (typeof g === 'string' && DEBUG_BRACKET_RE.test(g)) {
                    issues.push(`goals[${i}] starts with debug tier-bracket; strip the bracket prefix`);
                    edits.push({
                        target_path: `goals[${i}]`,
                        action: 'replace',
                        new_value: g.replace(/^\s*\[(Life|Experience|Functional)\]\s*/i, ''),
                        reason: 'structural: tier brackets are reporting-depth metadata',
                    });
                }
            }
        }
        const role = (deliverable as any)?.role;
        if (typeof role === 'string' && role.length > 80) {
            issues.push(`role field is ${role.length} chars; cap 80`);
        }
        const name = (deliverable as any)?.name;
        if (typeof name === 'string' && (/\(composite\)/i.test(name) || /\(synthetic\)/i.test(name))) {
            issues.push(`name has debug suffix "(composite)" or "(synthetic)"`);
            edits.push({
                target_path: 'name',
                action: 'replace',
                new_value: name.replace(/\s*\((composite|synthetic)\)\s*/gi, '').trim(),
                reason: 'structural: name debug suffix banned 2026-05-25',
            });
        }
    }

    return {
        accept: issues.length === 0,
        edits,
        rationale: issues.length === 0
            ? `${skill}: no issues found`
            : `${skill}: ${issues.length} issue(s) - ${issues.slice(0, 5).join('; ')}`,
        confidence: 'high',
    };
}


// ─── The main API ────────────────────────────────────────────────────────────
// runExpertPanel composes the per-kind experts with the universal critics and
// runs them via the existing criticReviseLoop primitive.

export type ExpertPanelOpts<T> = {
    deliverable: T;
    kind: ArtifactKind;
    /** Override the default budget for this kind. */
    budget_usd?: number;
    /** Override the experts that fire. Defaults to EXPERT_PANELS[kind]. */
    custom_panel?: CriticConfig[];
    /** Skip the universal critic pass (anti-slop + structural). Default false. */
    skip_universal?: boolean;
    /** Proxy base URL. */
    proxy_base?: string;
    /** Custom critic invoker (for tests). */
    invoke_critic?: CriticInvoker;
};

export type ExpertPanelResult<T> = CriticReviseLoopResult<T> & {
    panel_summary: {
        kind: ArtifactKind;
        experts_fired: string[];
        critics_accepted: string[];
        critics_with_edits: string[];
        em_dash_count_before: number;
        em_dash_count_after: number;
    };
};


/**
 * Run the domain-expert panel for an artifact. Composes the per-kind experts
 * with the universal hygiene critics, applies their edits via the existing
 * criticReviseLoop primitive, and returns the revised deliverable plus a
 * summary of what fired.
 *
 * Idempotent: calling runExpertPanel twice in a row on the same artifact
 * is safe - the critics will accept on the second pass.
 *
 * Wire-up callers in this codebase:
 *  - services/geminiService.ts::generatePersonas         → kind='persona'
 *  - services/geminiService.ts::generateRecommendations  → kind='strategy-slide'
 *  - services/geminiService.ts::generateGapAnalysis      → kind='gap-analysis'
 *  - services/geminiService.ts::generateRoadmap          → kind='roadmap'
 *  - design-desk/services/chatToFreeform.ts (per kind)
 *  - components/CorpusChatPanel.tsx (UPLIFT_KINDS handler)
 */
export async function runExpertPanel<T>(opts: ExpertPanelOpts<T>): Promise<ExpertPanelResult<T>> {
    // 2026-05-25 circuit-breaker - When the deliverable is a freeform-HTML
    // artifact (FreeformArtifact with .html: string), LLM critics that emit
    // target_path edits will either fail (paths into strings) or destroy the
    // artifact (replacing the html field with critic prose, observed dropping
    // a 16.4KB journey to 1.9KB of critic rationale).
    //
    // Right answer per SkillOpt: critic FEEDBACK should drive SKILL edits
    // offline, not deliverable mutations online. Until the SkillOpt loop fully
    // replaces this path, freeform-HTML artifacts run ONLY the deterministic
    // hygiene critics (em-dash + slop strip) which use the $ROOT sentinel and
    // can't corrupt structure.
    const isFreeformHtml = (() => {
        const d = opts.deliverable as any;
        return d && typeof d === 'object' && typeof d.html === 'string' && d.html.length > 100;
    })();
    const panel = opts.custom_panel ?? EXPERT_PANELS[opts.kind] ?? [];
    const critics: CriticConfig[] = isFreeformHtml
        ? UNIVERSAL_CRITICS // skip ALL LLM critics; deterministic hygiene only
        : (opts.skip_universal ? [...panel] : [...panel, ...UNIVERSAL_CRITICS]);

    if (isFreeformHtml) {
        console.info(`[runExpertPanel/${opts.kind}] freeform-HTML detected - LLM critics SKIPPED to prevent target_path corruption; running deterministic hygiene only`);
    }

    const budget = opts.budget_usd ?? PANEL_BUDGETS_USD[opts.kind] ?? 0.40;
    const proxyBase = opts.proxy_base ?? 'http://localhost:5012';

    // Count em-dashes before the panel for the summary
    const beforeText = JSON.stringify(opts.deliverable);
    const beforeEm = (beforeText.match(/-/g) || []).length;

    // Wrap the invoker so the universal critics use the deterministic path
    // when no custom invoker was supplied.
    const baseInvoker: CriticInvoker | undefined = opts.invoke_critic;
    const composedInvoker: CriticInvoker = async (invokeOpts) => {
        const isUniversal = UNIVERSAL_CRITICS.some(c => c.skill_name === invokeOpts.skill_name);
        if (isUniversal) {
            const verdict = deterministicCriticInvoker(invokeOpts.skill_name, invokeOpts.deliverable);
            // Em-dash sentinel: convert to an actual edit set over every string field.
            // Also apply slop-phrase substitution in the same pass (leveraging→using,
            // utilize→use, delve→examine, etc.) so HTML artifacts get the same
            // hygiene that slidePostProcessor applies to Slide objects.
            if (verdict.edits.some(e => (e.new_value as any)?.__sentinel === 'strip-em-dashes-in-all-strings')) {
                const stripped = applyHygieneStrip(structuredClone(invokeOpts.deliverable));
                return {
                    verdict: {
                        accept: false,
                        edits: [{
                            target_path: '$ROOT',
                            action: 'replace',
                            new_value: stripped,
                            reason: 'anti-slop: em-dash + slop-phrase auto-strip',
                        }],
                        rationale: verdict.rationale,
                        confidence: 'high',
                    },
                    cost_usd: 0,
                };
            }
            return { verdict, cost_usd: 0 };
        }
        // Defer to caller-supplied invoker if present
        if (baseInvoker) return baseInvoker(invokeOpts);
        // Default: real LLM dispatcher (2026-05-25). Fetches the skill markdown,
        // builds a critic prompt, calls Anthropic via the proxy, parses a
        // CriticVerdict back out. Falls through to pass-through on failure.
        return dispatchCritic(invokeOpts);
    };

    const loopResult = await criticReviseLoop<T>({
        deliverable: opts.deliverable,
        critics,
        revisor_model: 'sonnet-4.6',
        halt_when: 'all_accept',
        budget_usd: budget,
        surface_critique_log: true,
        proxy_base: proxyBase,
        invoke_critic: composedInvoker,
    });

    const afterText = JSON.stringify(loopResult.result);
    const afterEm = (afterText.match(/-/g) || []).length;

    return {
        ...loopResult,
        panel_summary: {
            kind: opts.kind,
            experts_fired: critics.map(c => c.skill_name),
            critics_accepted: loopResult.critique_log
                .filter(entry => entry.verdict.accept)
                .map(entry => entry.critic),
            critics_with_edits: loopResult.critique_log
                .filter(entry => entry.edits_applied > 0)
                .map(entry => entry.critic),
            em_dash_count_before: beforeEm,
            em_dash_count_after: afterEm,
        },
    };
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Walk every string-valued field in an object/array tree and strip em-dashes
 * AND emoji (2026-05-27 - repo-wide hard emoji ban). Pure function; returns a
 * new structure with banned glyphs removed. Layout glyphs (U+25xx bullets,
 * U+21xx arrows) are preserved. */
const _EMOJI_RE_INPLACE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{231A}-\u{231B}\u{23E0}-\u{23FF}\u{FE00}-\u{FE0F}\u{200D}]/gu;
export function stripEmDashesInPlace<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        // 2026-06-09 - CRITICAL FIX. The prior rule `.replace(/-/g, ', ')`
        // replaced EVERY ASCII hyphen with ", ", which corrupted HTML artifacts:
        // `UTF-8`->`UTF, 8`, `device-width`->`device, width`, and every design-
        // system class name `nxt-slide`/`nxt-masthead`/`nxt-block`->`nxt, slide`,
        // destroying the entire NXT component system in #journey/#blueprint/freeform
        // HTML (user: "devoid of design system components"). The em-dash ban targets
        // U+2014 (and U+2013 en-dash) ONLY; ASCII hyphens are explicitly fine
        // (.claude/CLAUDE.md: "ASCII hyphens in compound words remain fine"). Mirror
        // the proxy's proven-clean rules: spaced em/en-dash -> ", "; word-joined ->
        // ASCII hyphen; any remaining -> ", ". NEVER touch the ASCII hyphen.
        return (obj as string)
            .replace(/\s+[—–]\s+/g, ', ')
            .replace(/(\w)[—–](\w)/g, '$1-$2')
            .replace(/[—–]/g, ', ')
            .replace(_EMOJI_RE_INPLACE, '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/ +([.,;:!?])/g, '$1') as unknown as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => stripEmDashesInPlace(item)) as unknown as T;
    }
    if (typeof obj === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            out[k] = stripEmDashesInPlace(v);
        }
        return out as T;
    }
    return obj;
}


// ─── 2026-05-25 - Slop-phrase substitution for HTML artifacts ────────────────
// slidePostProcessor's SLOP_BLACKLIST only runs on Slide objects (title/content/
// narrative/speakerNotes/quote). Freeform HTML artifacts bypass that pipeline.
// This function applies the same phrase substitutions to ANY string-valued
// field in a deliverable (including string-typed `html` fields on FreeformArtifact).
// Word-boundary regex so "facilitates" doesn't match inside larger words.
const SLOP_SUBSTITUTIONS: Array<[RegExp, string]> = [
    // High-severity verbal tics - substitute with plain alternatives
    [/\b(?:leveraging|leverages|leveraged)\b/gi, 'using'],
    [/\butili(?:z|s)e(?:s|d|ing)?\b/gi, 'use'],
    [/\bdelve(?:s|d|ing)?\b/gi, 'examine'],
    [/\btapestry of\b/gi, 'mix of'],
    [/\b(?:is|stands as) a testament to\b/gi, 'shows'],
    [/\bmeticulous(?:ly)?\b/gi, 'careful'],
    [/\bplays? a (?:pivotal|crucial|key|vital|significant|important) role\b/gi, 'matters'],
    [/\bmarks? a pivotal\b/gi, 'is a key'],
    [/\brepresents? a paradigm\b/gi, 'is a clear'],
    [/\bvaluable insights?\b/gi, 'findings'],
    [/\bcomprehensive\b/gi, 'complete'],
    [/\bfacilitate(?:s|d|ing)?\b/gi, 'help'],
    [/\b(?:enhanc|bolster|foster)(?:e|es|ed|ing)\b/gi, 'improve'],
    [/\bshowcas(?:e|es|ed|ing)\b/gi, 'show'],
    [/\bboasts? an?\b/gi, 'has'],
    [/\bnestled\b/gi, 'located'],
    [/\benduring legacy\b/gi, 'long history'],
    [/\binterplay\b/gi, 'interaction'],
    [/\b(?:serves|served) as a\b/gi, 'is a'],
    [/\b(?:stands|stood) as a\b/gi, 'is a'],
];

export function stripSlopPhrasesInPlace<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        let s = obj as string;
        for (const [re, repl] of SLOP_SUBSTITUTIONS) s = s.replace(re, repl);
        return s as unknown as T;
    }
    if (Array.isArray(obj)) return obj.map(item => stripSlopPhrasesInPlace(item)) as unknown as T;
    if (typeof obj === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) out[k] = stripSlopPhrasesInPlace(v);
        return out as T;
    }
    return obj;
}


/** Combined hygiene strip: em-dashes + slop-phrase substitution. Call this
 * on any artifact before it lands in the design desk; the runExpertPanel
 * function applies it automatically via the deterministic universal critic. */
export function applyHygieneStrip<T>(obj: T): T {
    return stripSlopPhrasesInPlace(stripEmDashesInPlace(obj));
}
