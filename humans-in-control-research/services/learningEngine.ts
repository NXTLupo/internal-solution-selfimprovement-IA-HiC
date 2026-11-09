/**
 * Learning Engine - Loop 4 (async pattern detection + improvement routing).
 *
 * Reads the feedback event stream, clusters events by (deliverable_type,
 * section_scope, signal_polarity), and routes patterns crossing the
 * threshold to one of five improvement targets:
 *
 *   1. Constraint store    (wiki/synthesis/learned-constraints.md + a lifecycle row in
 *                           synthesis/constraint-records.json; C5 2026-10-01)
 *   2. Skill patch         PROPOSED to /api/epochs/proposals (kind skill_patch); the live
 *                           SKILL.md is written ONLY by patchSkillFile with an APPROVE held-out
 *                           verdict (C4 2026-10-01). The learning pass never writes a skill.
 *   3. Framework page      (wiki/frameworks/<type>.md - diff queued)
 *   4. Anti-pattern entry  (wiki/anti-patterns/<type>.md - auto-applied, ledgered rung 3)
 *   5. Exemplar update     (wiki/exemplars/<type>.md - positive signals, ledgered rung 3)
 *
 * Also computes constraint effectiveness from the lifecycle rows and RETIRES
 * under-performing constraints by deleting their ledger lines (with a `retired:` line).
 *
 * Created 2026-05-22 as part of the self-improvement loop, Phase 3.
 */

import { readFeedbackIndex, type FeedbackSummary, type FeedbackIndex } from './feedbackService';
import { persistChunkOverride, type ArtifactType } from './chunkBudgetCalculator';
import { evaluateConstraint, normalizeConstraintKey } from './constraintQualityGate';
import { reviewSkillPatch, reviewSummary } from './skillReview';
import type { LifecyclePassReport } from './memoryLifecycle';
import {
    createConstraintRecord,
    readConstraintRecords,
    writeConstraintRecords,
    constraintRecordId,
} from './promptImprovementEngine';
import { anthropicText } from './claudeModelPolicy';

const PROXY_BASE = 'http://127.0.0.1:5012';

// 2026-05-23 - Feedback patterns that signal a chunking-config change, not a
// constraint or skill patch. Kept in sync with the live classifier in
// feedbackService.ts so the same complaint that bumps the current run also
// promotes to a persistent override after 3+ clusters.
const CHUNK_INCOMPLETE_PATTERNS = [
    /\btruncat/i, /\bcut[\s-]?off\b/i, /\bstop(?:ped|s)\s+(?:at|early|mid)/i,
    /\bonly\s+got\s+\d+/i, /\bmissing\s+(?:slides?|themes?|sections?|items?)/i,
    /\bdidn'?t\s+finish/i, /\bincomplet/i, /\bpartial\b/i, /\bnot\s+all\b/i,
];
const CHUNK_TOOSHORT_PATTERNS = [
    /\bmore\s+depth\b/i, /\bmore\s+detail/i, /\btoo\s+(?:brief|short|thin|shallow)/i,
    /\bneeds?\s+more\b/i, /\bexpand\b/i, /\bdeepen\b/i, /\bshallow\b/i, /\bsparse\b/i,
];

function classifyChunkingComplaint(fragments: string[]): { incomplete: boolean; tooShort: boolean } {
    const joined = fragments.join(' ');
    return {
        incomplete: CHUNK_INCOMPLETE_PATTERNS.some(re => re.test(joined)),
        tooShort: CHUNK_TOOSHORT_PATTERNS.some(re => re.test(joined)),
    };
}

const DELIVERABLE_TO_ARTIFACT_TYPE: Record<string, ArtifactType> = {
    'slides': 'slides',
    'presentations': 'slides',
    'deck': 'slides',
    'case-study': 'slides',
    'case_study': 'slides',
    'themes': 'themes',
    'theme': 'themes',
    'personas': 'personas',
    'persona': 'personas',
    'recommendations': 'recommendations',
    'recommendation': 'recommendations',
    'roadmap': 'roadmap',
    'prd': 'prd',
    'blueprint': 'blueprint',
    'journey': 'journey',
    'journey-map': 'journey',
    'gap': 'gap',
    'gap-analysis': 'gap',
    'gap_analysis': 'gap',
    'tech-audit': 'tech-audit',
    'tech_audit': 'tech-audit',
    'architecture': 'architecture',
    'tech-architecture': 'architecture',
    'tech_architecture': 'architecture',
    'competitive': 'competitive',
    'competitive_analysis': 'competitive',
    'whitepaper': 'report',
    'report': 'report',
    'proto': 'prototype',
    'prototype': 'prototype',
};
const PATTERN_THRESHOLD = 3;      // events of same kind to trigger
const POSITIVE_STAR_FLOOR = 4;    // stars >= 4 are positive
const NEGATIVE_STAR_CEILING = 2;  // stars <= 2 are negative
const HIGH_CONFIDENCE = 0.8;
const REVIEW_CONFIDENCE = 0.5;
const CONSTRAINT_RETIRE_FLOOR = 0.3;
const CONSTRAINT_PROMOTE_CEILING = 0.7;

// --- TYPES ---

export type ImprovementTarget = 'constraint' | 'skill-patch' | 'framework-page' | 'anti-pattern' | 'exemplar' | 'chunk-config';
export type SignalPolarity = 'negative' | 'positive' | 'neutral';

export interface FeedbackCluster {
    deliverableType: string;
    sectionScope: string | null;
    polarity: SignalPolarity;
    count: number;
    representativeEvents: FeedbackSummary[];
    distinctTextFragments: string[];
}

export interface ImprovementCandidate {
    id: string;
    cluster: FeedbackCluster;
    target: ImprovementTarget;
    payload: string; // the rule, anti-pattern, or exemplar text the engine generated
    confidence: number;
    rationale: string;
    proposedAt: string;
}

export interface LearningPassResult {
    /** DF-D lifecycle report for this pass; null when skipped or dry-run. */
    secondBrain?: LifecyclePassReport | null;
    runId: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    clustersDetected: number;
    candidatesProduced: number;
    applied: ImprovementCandidate[];
    queuedForReview: ImprovementCandidate[];
    rejected: ImprovementCandidate[];
    /** Skills whose live SKILL.md was written. ALWAYS empty since 2026-10-01 (C4): the learning pass
     *  proposes skill patches; only a gated APPROVE verdict writes a skill. Kept for the ChangeStrip. */
    skillsTouched: string[];
    /** 2026-10-01 (C4): proposal ids written to /api/epochs/proposals for skill patches. */
    skillPatchProposals: string[];
    constraintsRetired: string[];
    chunkConfigsPromoted: string[];
}

// --- CLUSTERING ---

function classifyPolarity(event: FeedbackSummary): SignalPolarity {
    if (event.vote_value === 'down' || (typeof event.stars_value === 'number' && event.stars_value <= NEGATIVE_STAR_CEILING)) {
        return 'negative';
    }
    if (event.vote_value === 'up' || (typeof event.stars_value === 'number' && event.stars_value >= POSITIVE_STAR_FLOOR)) {
        return 'positive';
    }
    // Pure text signals without vote/stars are treated as negative (user took
    // the time to write something - likely a correction).
    if (event.text_excerpt) return 'negative';
    return 'neutral';
}

function clusterFeedback(index: FeedbackIndex): FeedbackCluster[] {
    const clusters: FeedbackCluster[] = [];
    for (const [deliverableType, bySection] of Object.entries(index)) {
        for (const [sectionKey, events] of Object.entries(bySection)) {
            // Bucket by polarity
            const byPolarity = new Map<SignalPolarity, FeedbackSummary[]>();
            for (const e of events) {
                const p = classifyPolarity(e);
                if (!byPolarity.has(p)) byPolarity.set(p, []);
                byPolarity.get(p)!.push(e);
            }
            for (const [polarity, polEvents] of byPolarity) {
                if (polarity === 'neutral') continue;
                if (polEvents.length < PATTERN_THRESHOLD) continue;
                const distinctTextFragments = uniqueExcerpts(polEvents);
                clusters.push({
                    deliverableType,
                    sectionScope: sectionKey === '__top__' ? null : sectionKey,
                    polarity,
                    count: polEvents.length,
                    representativeEvents: polEvents.slice(0, 10),
                    distinctTextFragments,
                });
            }
        }
    }
    return clusters;
}

function uniqueExcerpts(events: FeedbackSummary[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of events) {
        if (!e.text_excerpt) continue;
        const key = e.text_excerpt.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e.text_excerpt);
        if (out.length >= 5) break;
    }
    return out;
}

// --- ROUTING ---

function routeCluster(cluster: FeedbackCluster): ImprovementTarget {
    // Positive signal -> always exemplar.
    if (cluster.polarity === 'positive') return 'exemplar';

    // 2026-05-23 - Chunking-complaint detection takes precedence over the
    // constraint/skill-patch routes. A user saying "only got 5 of 20 slides"
    // is not asking for a wording constraint; they're asking for a deeper
    // chunk plan on the artifact type. We promote to chunk-config when the
    // deliverable type maps to a known artifact and the text fragments
    // contain the classifier patterns.
    const complaint = classifyChunkingComplaint(cluster.distinctTextFragments);
    const artifactType = DELIVERABLE_TO_ARTIFACT_TYPE[cluster.deliverableType.toLowerCase()];
    if (artifactType && (complaint.incomplete || complaint.tooShort)) {
        return 'chunk-config';
    }

    // Negative signal - choose the most surgical target.
    // - section-scoped + text feedback     -> constraint (narrow)
    // - section-scoped + no text           -> anti-pattern (named failure mode)
    // - global (no section) + text         -> skill patch (structural change)
    // - global + no text                   -> framework page (structural review)
    if (cluster.sectionScope) {
        return cluster.distinctTextFragments.length > 0 ? 'constraint' : 'anti-pattern';
    }
    return cluster.distinctTextFragments.length > 0 ? 'skill-patch' : 'framework-page';
}

function estimateConfidence(cluster: FeedbackCluster, target: ImprovementTarget): number {
    // Confidence is a function of:
    //   - count (more events = higher confidence)
    //   - distinct text agreement (more agreement = higher)
    //   - target type (anti-pattern + exemplar default higher because the
    //     blast radius is lower than a framework page)
    let base = 0.5;
    base += Math.min(0.3, (cluster.count - PATTERN_THRESHOLD) * 0.1);
    if (cluster.distinctTextFragments.length === 1) base += 0.15; // unanimity
    if (target === 'anti-pattern') base += 0.1;
    if (target === 'exemplar') base += 0.15;
    if (target === 'framework-page') base -= 0.1; // bigger blast radius
    if (target === 'chunk-config') base += 0.2; // chunking signals are concrete and self-validating
    return Math.min(1.0, Math.max(0.0, base));
}

// --- PAYLOAD GENERATION ---

async function generatePayload(cluster: FeedbackCluster, target: ImprovementTarget): Promise<string> {
    // 2026-05-23 - chunk-config payloads are deterministic JSON descriptions
    // of the chunk-plan override. No LLM call needed - the signal is concrete.
    if (target === 'chunk-config') {
        const complaint = classifyChunkingComplaint(cluster.distinctTextFragments);
        const artifactType = DELIVERABLE_TO_ARTIFACT_TYPE[cluster.deliverableType.toLowerCase()];
        const override: any = {
            artifactType: artifactType || cluster.deliverableType,
            applied: [] as string[],
        };
        if (complaint.incomplete) {
            override.applied.push('incomplete:chunks-x1.5');
            override.applied.push('incomplete:budget-x1.3');
        }
        if (complaint.tooShort) {
            override.applied.push('too_short:budget-x1.5');
        }
        if (override.applied.length === 0) {
            // Defensive: shouldn't happen because routing already checked, but
            // produce a sensible default.
            override.applied.push('incomplete:chunks-x1.5');
        }
        override.rationale = `Promoted from ${cluster.count} feedback signals: ${cluster.distinctTextFragments.slice(0, 2).join(' | ').slice(0, 240)}`;
        return JSON.stringify(override);
    }

    // For constraints, anti-patterns, and skill patches, use an LLM to
    // synthesize the actual content from the feedback fragments. Cost-
    // controlled: Haiku, ~$0.001 per pass.
    const fragments = cluster.distinctTextFragments.join('\n- ');
    const polarityLabel = cluster.polarity.toUpperCase();
    const scopeLabel = cluster.sectionScope || 'overall output';

    let instruction = '';
    if (target === 'constraint') {
        instruction = `Convert these ${cluster.count} negative user signals on the "${cluster.deliverableType}" deliverable, section "${scopeLabel}", into a single section-scoped constraint of the form: "When generating ${cluster.deliverableType} ${scopeLabel} section, [do X] because [reason]." Return only the constraint sentence.`;
    } else if (target === 'anti-pattern') {
        instruction = `These ${cluster.count} user signals on the "${cluster.deliverableType}" deliverable indicate a repeating failure mode. Write a named anti-pattern entry. Return STRICT JSON: {"name": "short-kebab-name", "description": "1-2 sentence description of the failure mode", "detection": "concrete criteria a verifier can check", "alternative": "what to do instead"}.`;
    } else if (target === 'skill-patch') {
        instruction = `These ${cluster.count} user signals indicate the "${cluster.deliverableType}" skill should change its default behavior. Write a single-paragraph patch (under 80 words) for the skill's SKILL.md describing the new behavior. Return only the paragraph.`;
    } else if (target === 'framework-page') {
        instruction = `These ${cluster.count} signals reveal a structural gap in the "${cluster.deliverableType}" framework page. Write a proposed addition (under 100 words) suggesting a new required section or refined section definition. Return only the addition text.`;
    } else if (target === 'exemplar') {
        instruction = `These ${cluster.count} positive user signals praise an exemplary "${cluster.deliverableType}" output. Write a 2-sentence annotation explaining WHY this kind of output works well. Return only the annotation.`;
    }
    const prompt = `${instruction}\n\nUSER SIGNALS (${polarityLabel}):\n- ${fragments || '(no text provided; vote/star-only signals)'}\n\nDeliverable type: ${cluster.deliverableType}\nSection scope: ${scopeLabel}`;

    // 2026-05-22 - Model selection. The learning engine is an agentic loop
    // (cluster -> route -> generate payload -> apply). Gemini 3.5 Flash is
    // positioned as Google's most-capable agentic + coding model at
    // ~1/10th the cost of Opus and lower latency than Haiku. The payload
    // generation is exactly the kind of structured multi-step transform
    // Flash is built for. We keep an Anthropic fallback in case the Gemini
    // call fails so the loop never breaks.
    try {
        const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { temperature: 0.2, maxOutputTokens: 600 },
            }),
        });
        if (resp.ok) {
            const data = await resp.json();
            const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text.trim().length > 5) return text.trim();
        }
        // Fall through to Anthropic Haiku fallback on any failure or empty body
        const fallbackResp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!fallbackResp.ok) return fallbackPayload(cluster, target);
        const data = await fallbackResp.json();
        return (anthropicText(data) || fallbackPayload(cluster, target)).trim();
    } catch {
        return fallbackPayload(cluster, target);
    }
}

function fallbackPayload(cluster: FeedbackCluster, target: ImprovementTarget): string {
    const sample = cluster.distinctTextFragments[0] || '(no text)';
    return `[fallback ${target}] ${cluster.count} ${cluster.polarity} signals on ${cluster.deliverableType}/${cluster.sectionScope || 'overall'}: ${sample}`;
}

// --- APPLICATION ---

async function applyConstraint(candidate: ImprovementCandidate): Promise<boolean> {
    // QUALITY GATE (Phase 1, 2026-05-29): the LLM that synthesizes the payload
    // can re-emit a master-rule violation (e.g. "quantify in dollars") or a
    // generic stub. Never append one to the constraint store - that is exactly
    // how learned-constraints.md accreted 21 duplicate dollar-quantification
    // rules that contradict the master Quantitative Claim Rule.
    const verdict = evaluateConstraint(candidate.payload);
    if (!verdict.accept) {
        console.log(`[LearningEngine] Constraint rejected by quality gate (${verdict.reason}): ${candidate.payload}`);
        return false;
    }
    const entry = `- CONSTRAINT [${candidate.cluster.deliverableType}/${candidate.cluster.sectionScope || 'overall'}]: ${candidate.payload} (source: ${candidate.cluster.count} feedback signals, confidence ${candidate.confidence.toFixed(2)})`;
    const ok = await appendToPage('synthesis/learned-constraints.md', entry);
    if (ok) {
        // C5 (2026-10-01): the lifecycle row. Without it reviewConstraintEffectiveness has nothing
        // to review and the constraint lives forever. applications / negativeSignalsAfter are
        // incremented by improvementDiscriminator on every scored deliverable.
        await createConstraintRecord({
            text: candidate.payload,
            deliverableType: candidate.cluster.deliverableType,
            sectionScope: candidate.cluster.sectionScope,
            confidence: candidate.confidence,
        });
    }
    return ok;
}

/** Ledger line every rung-3 (LLM-judged) entry carries (anti-patterns, exemplars). A rung-3 signal
 *  informs; it never promotes a skill or constraint on its own (UNIFIED_VISION gated evolution). */
const RUNG_3_LINE = '- **Rung**: 3 (LLM-judged feedback cluster; informative only, not a promotion signal)';

async function applyAntiPattern(candidate: ImprovementCandidate): Promise<boolean> {
    let parsed: any = null;
    try { parsed = JSON.parse(candidate.payload); } catch { /* fall through */ }
    if (!parsed || !parsed.name) {
        const fallback = `\n### AP-LEARNED: from-feedback-${Date.now()}\n- **Description**: ${candidate.payload}\n- **Source**: ${candidate.cluster.count} feedback signals\n${RUNG_3_LINE}\n- **Added**: ${new Date().toISOString().split('T')[0]}\n`;
        return appendToPage(`anti-patterns/${candidate.cluster.deliverableType}.md`, fallback);
    }
    const entry = `\n### AP-LEARNED: ${parsed.name}\n- **Description**: ${parsed.description}\n- **Detection**: ${parsed.detection}\n- **Alternative**: ${parsed.alternative}\n- **Source**: Learned from ${candidate.cluster.count} user feedback signals (confidence ${candidate.confidence.toFixed(2)})\n${RUNG_3_LINE}\n- **Added**: ${new Date().toISOString().split('T')[0]}\n`;
    return appendToPage(`anti-patterns/${candidate.cluster.deliverableType}.md`, entry);
}

async function applySkillPatch(candidate: ImprovementCandidate): Promise<{ ok: boolean; skillName?: string; proposalId?: string }> {
    // Map deliverable type to the responsible skill. This is a best-effort
    // table - the deliverable-type vocabulary used by feedback widgets is
    // a superset of the skill name vocabulary.
    const skillNameMap: Record<string, string> = {
        'personas': 'persona-architect',
        'persona': 'persona-architect',
        'roadmap': 'roadmap-builder',
        'strategy': 'strategy-author',
        'deck': 'deck-composer',
        'presentations': 'deck-composer',
        'prd': 'prd-compiler',
        'blueprint': 'service-blueprint-mapper',
        'recommendations': 'recommendation-architect',
        'recommendation': 'recommendation-architect',
        'gap-analysis': 'gap-analysis-evaluator',
        'gap_analysis': 'gap-analysis-evaluator',
        'tech-audit': 'tech-audit-inspector',
        'tech_audit': 'tech-audit-inspector',
        'competitive': 'competitive-analyst',
        'competitive_analysis': 'competitive-analyst',
        'tech_architecture': 'tech-arch-generator',
        'themes': 'theme-analyst',
        'theme': 'theme-analyst',
        'proto': 'experience-prototype-composer',
        'whitepaper': 'strategic-report-writer',
    };
    const skillName = skillNameMap[candidate.cluster.deliverableType];
    if (!skillName) {
        return { ok: false };
    }
    // QUALITY GATE (2026-06-23): the skill-patch path was the ONE self-improvement
    // writer that bypassed the gate its sibling applyConstraint() has used since
    // 2026-05-29. The Gemini-synthesized "under-80-word" patch lands verbatim in a
    // live SKILL.md, so a truncated/duplicate payload accreted into
    // the former deck-narrative-composer/SKILL.md (8 mid-sentence, near-duplicate appends; folded into deck-composer 2026-10-01).
    // Gate it identically + add a completeness check (evaluateConstraint cannot
    // catch truncation: a fragment clears the 40-char floor and the stub patterns).
    const verdict = evaluateConstraint(candidate.payload);
    if (!verdict.accept) {
        console.log(`[LearningEngine] Skill patch rejected by quality gate (${verdict.reason}): ${candidate.payload}`);
        return { ok: false, skillName };
    }
    const completeness = isCompleteSkillPatch(candidate.payload);

    // DF-E4 (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md): a skill
    // write now requires a REVIEW REPORT whose readiness is not `blocked`.
    // `evaluateConstraint` + `isCompleteSkillPatch` are spell-checks: neither can
    // see an unsafe instruction ("ignore the design-system gate"), an injection
    // shape, or a duplicate of what the skill already says. Ported from
    // deer-flow's skill-review contract, which separates readiness (structurally
    // fit) from assurance (what runtime evidence exists) instead of collapsing
    // both into one boolean. The completeness verdict becomes one deterministic
    // finding INSIDE the report rather than a parallel gate.
    let existing: string | undefined;
    try {
        const peek = await fetch(`${PROXY_BASE}/api/skill/read?name=${encodeURIComponent(skillName)}`);
        if (peek.ok) existing = (await peek.json())?.content || undefined;
    } catch { /* review proceeds with maintainability not_assessed, and says so */ }

    const report = reviewSkillPatch({ skillName, patch: candidate.payload, existing, completeness });
    console.log(reviewSummary(report));
    if (report.readiness === 'blocked') {
        const blockers = report.issues.filter(i => i.severity === 'blocker').map(i => `${i.id}: ${i.problem}`).join('; ');
        console.log(`[LearningEngine] Skill patch BLOCKED by review (${blockers})`);
        // Keep the signal: a blocked patch is still evidence that something in
        // the skill needs attention, so it lands in the improvements log.
        await appendToPage('synthesis/skill-improvements.md',
            `\n## ${new Date().toISOString().split('T')[0]} | ${skillName} (BLOCKED by review)\n${candidate.payload}\nreadiness=${report.readiness} assurance=${report.assurance}\nblockers: ${blockers}\n`);
        return { ok: false, skillName };
    }

    // C4 (2026-10-01, plan Stage 5.1): a reviewed patch is a PROPOSAL, never a write. The review
    // above is a text check (rung 1-2 structural); the skill write needs the held-out golden-set
    // verdict, which only the gated batch can produce. Route to the proposals store and stop.
    const proposalId = await proposeSkillPatch(skillName, candidate, {
        readiness: report.readiness,
        assurance: report.assurance,
    });
    return { ok: !!proposalId, skillName, proposalId: proposalId || undefined };
}

/**
 * Held-out gate verdict required to write a skill (C4). Produced by the epoch batch
 * (goldenSetRunner.compareReports before/after) or the skillopt verdict file; never by the
 * learning pass itself. Mirrors proxy SkillWriteRequest.gate_verdict.
 */
export interface SkillGateVerdict {
    verdict: 'APPROVE' | 'REJECT' | 'HUMAN-REVIEW';
    discrimination_before: number;
    discrimination_after: number;
    golden_set_version: number;
    source_rollouts?: string[];
}

/** Throws unless `v` is a complete APPROVE verdict. */
export function assertApproveVerdict(v: unknown): asserts v is SkillGateVerdict & { verdict: 'APPROVE' } {
    const g = v as Partial<SkillGateVerdict> | null | undefined;
    if (!g || typeof g !== 'object') throw new Error('skill write refused: no gate verdict');
    if (g.verdict !== 'APPROVE') throw new Error(`skill write refused: gate verdict is ${String(g.verdict ?? 'missing')}, not APPROVE`);
    for (const k of ['discrimination_before', 'discrimination_after', 'golden_set_version'] as const) {
        if (typeof g[k] !== 'number' || !Number.isFinite(g[k])) {
            throw new Error(`skill write refused: gate verdict missing numeric ${k}`);
        }
    }
}

/**
 * Write the skill-patch PROPOSAL to the propose-only ledger (/api/epochs/proposals).
 * Dedupes against pending proposals for the same skill + normalized patch text.
 * Returns the proposal id (existing or new), or null when the ledger is unreachable.
 */
async function proposeSkillPatch(
    skillName: string,
    candidate: ImprovementCandidate,
    review?: { readiness: string; assurance: string },
): Promise<string | null> {
    const targetPath = `.claude/skills/${skillName}/SKILL.md`;
    const key = normalizeConstraintKey(candidate.payload);
    try {
        const listResp = await fetch(`${PROXY_BASE}/api/epochs/proposals?status=pending`);
        if (listResp.ok) {
            const data = await listResp.json();
            const items: any[] = Array.isArray(data?.proposals) ? data.proposals : [];
            const dupe = items.find(p => p?.target_path === targetPath
                && typeof p?.proposed_edit === 'string'
                && normalizeConstraintKey(p.proposed_edit) === key);
            if (dupe?.id) {
                console.log(`[LearningEngine] Skill patch already proposed for ${skillName} (${dupe.id}); not re-proposing`);
                return String(dupe.id);
            }
        }
        const sourceRolloutIds = candidate.cluster.representativeEvents
            .map(e => e.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
        const body = {
            kind: 'skill_patch',
            target_layer: 'skill',
            target_path: targetPath,
            summary: `skill_patch ${skillName}: ${candidate.payload.slice(0, 140)}`,
            proposed_edit: candidate.payload,
            source_rollout_ids: sourceRolloutIds,
            confidence: candidate.confidence,
            signal_count: candidate.cluster.count,
            deliverable_type: candidate.cluster.deliverableType,
            review: review || null,
            gate_verdict: null,
            risk_class: 'low_risk',
        };
        const resp = await fetch(`${PROXY_BASE}/api/epochs/proposals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const id = data?.id ? String(data.id) : null;
        if (id) console.log(`[LearningEngine] Skill patch PROPOSED for ${skillName} (${id}) - pending held-out gate + owner review, NOT written`);
        return id;
    } catch (e: any) {
        console.warn('[LearningEngine] skill patch proposal failed:', e?.message || e);
        return null;
    }
}

/**
 * Completeness gate for a skill patch (2026-06-23). The Learned-behaviors drift
 * was truncated LLM output (max-token cut): patches ending mid-word/clause with
 * no terminal punctuation ("...with comprehensive", "Strictly adhere",
 * "...Establish a clear") or beginning mid-sentence with a connective ("and a
 * structured table of contents..."). A real instruction is a complete sentence.
 */
export function isCompleteSkillPatch(text: string): { ok: boolean; reason?: string } {
    const t = (text || '').trim();
    if (!t) return { ok: false, reason: 'empty' };
    if (/^(and|or|but|so|yet|nor|because|which|that|with|to|of|for|including|such as)\b/i.test(t)) {
        return { ok: false, reason: 'leading-connective-fragment' };
    }
    // A complete instruction ends on terminal punctuation. Truncated patches end
    // on a word/comma/colon with none.
    if (!/[.!?]["')\]]?$/.test(t)) {
        return { ok: false, reason: 'no-terminal-punctuation' };
    }
    return { ok: true };
}

/**
 * Dedupe guard (2026-06-23): the drift was also near-duplicate appends (8
 * variations of "always include a title page and a table of contents"). Compare
 * the candidate against every prior learned-behavior body by the same normalized
 * head the constraint gate uses, so a re-synthesized restatement is a no-op.
 */
export function patchAlreadyPresent(oldContent: string, patch: string): boolean {
    const key = normalizeConstraintKey(patch);
    if (!key) return false;
    const blocks = oldContent.split(/<!--\s*learned behavior added[^>]*-->/i).slice(1);
    for (const b of blocks) {
        const body = b.split('<!--')[0];
        if (normalizeConstraintKey(body) === key) return true;
    }
    return false;
}

/**
 * Write a reviewed + GATED patch into a live SKILL.md. C4 (2026-10-01): callable ONLY with an
 * APPROVE held-out verdict; throws otherwise. The learning pass never calls this - the gated
 * batch (or the owner applying an approved proposal) does. The verdict rides to the proxy as
 * `gate_verdict` so /api/skill/write can enforce the same rule server-side.
 */
export async function patchSkillFile(
    skillName: string,
    candidate: ImprovementCandidate,
    gateVerdict: SkillGateVerdict,
): Promise<boolean> {
    assertApproveVerdict(gateVerdict);
    // Read the existing SKILL.md, archive it under _versions/, write the new
    // version with incremented version field, and append the patch to the
    // skill body under a "## Learned behaviors" section.
    const skillPath = `skills/${skillName}/SKILL.md`;
    try {
        const resp = await fetch(`${PROXY_BASE}/api/skill/read?name=${encodeURIComponent(skillName)}`);
        if (!resp.ok) {
            // The skill-read endpoint may not exist yet - fall back to
            // appending the learned behavior to the wiki's skill-improvements
            // log so we don't lose the signal.
            return await appendToPage('synthesis/skill-improvements.md', `\n## ${new Date().toISOString().split('T')[0]} | ${skillName}\n${candidate.payload}\n(source: ${candidate.cluster.count} signals, confidence ${candidate.confidence.toFixed(2)})\n`);
        }
        const data = await resp.json();
        const oldContent: string = data.content || '';
        const oldVersion = parseSkillVersion(oldContent);
        const newVersion = incrementVersion(oldVersion);
        const today = new Date().toISOString().split('T')[0];
        const updated = patchSkillContent(oldContent, candidate.payload, newVersion, today, candidate.cluster.count);
        if (updated === oldContent) {
            // Dedupe no-op: the patch already exists. Nothing to write; not a failure.
            console.log(`[LearningEngine] Skill patch is a duplicate of an existing learned behavior; skipped: ${skillName}`);
            return true;
        }
        const writeResp = await fetch(`${PROXY_BASE}/api/skill/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: skillName,
                content: updated,
                archive_version: oldVersion,
                gate_verdict: gateVerdict,
            }),
        });
        return writeResp.ok;
    } catch {
        // Always log the attempted patch so signal isn't lost
        return await appendToPage('synthesis/skill-improvements.md', `\n## ${new Date().toISOString().split('T')[0]} | ${skillName} (patch failed)\n${candidate.payload}\n`);
    }
}

function parseSkillVersion(content: string): string {
    const match = content.match(/^version:\s*([0-9.]+)/m);
    return match ? match[1] : '1.0';
}

function incrementVersion(v: string): string {
    const parts = v.split('.').map(Number);
    if (parts.length < 2) parts.push(0);
    parts[parts.length - 1] += 1;
    return parts.join('.');
}

function patchSkillContent(oldContent: string, patch: string, newVersion: string, today: string, signalCount: number): string {
    // Dedupe: a re-synthesized restatement of an existing learned behavior is a
    // no-op (returns oldContent unchanged so the version is NOT bumped for nothing).
    if (patchAlreadyPresent(oldContent, patch)) {
        return oldContent;
    }
    // Bump version in frontmatter
    let updated = oldContent;
    if (/^version:\s*[0-9.]+/m.test(updated)) {
        updated = updated.replace(/^version:\s*[0-9.]+/m, `version: ${newVersion}`);
    } else {
        // Add version line after the name field
        updated = updated.replace(/^(name:[^\n]+)\n/m, `$1\nversion: ${newVersion}\nlast_improved: ${today}\n`);
    }
    // Append to a Learned behaviors section
    const learnedBlock = `\n\n<!-- learned behavior added ${today} from ${signalCount} feedback signals -->\n${patch}\n`;
    if (/## Learned behaviors/i.test(updated)) {
        updated = updated.replace(/## Learned behaviors\n/i, `## Learned behaviors\n${learnedBlock}\n`);
    } else {
        updated = updated + `\n\n## Learned behaviors\n${learnedBlock}\n`;
    }
    return updated;
}

/**
 * 2026-05-23 - Karpathy Phase 2.3 self-improvement loop hook.
 * Reads every wiki/known-gaps/*.md file (cross-engagement shortfall log written
 * by knowledgeGapFinder.persistGapsToKnownGaps) and surfaces the top recurring
 * shortfall topics so the source-discovery scheduler can bias future fetches
 * toward those topics. The returned list is also exposed to
 * loadGenerationContext consumers as a system-prompt addendum:
 *   "Prior engagements have repeatedly hit shortfalls on: <topic A>, <topic B>...
 *    Prioritize evidence collection on these topics."
 */
export async function getRecurringShortfallTopics(): Promise<Array<{ topic: string; occurrenceCount: number; engagementSlugs: string[] }>> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/known-gaps`);
        if (!resp.ok) return [];
        const data = await resp.json();
        const files: string[] = (data.files || []).filter((f: string) => f.endsWith('.md') && f !== 'README.md');
        const topicCounts: Array<{ topic: string; occurrenceCount: number; engagementSlugs: string[] }> = [];

        for (const file of files) {
            try {
                const fileResp = await fetch(`${PROXY_BASE}/api/wiki/read/known-gaps/${encodeURIComponent(file)}`);
                if (!fileResp.ok) continue;
                const fileData = await fileResp.json();
                const content: string = fileData.content || '';
                // Each "## YYYY-MM-DD | <engagement-slug>" block counts as one occurrence
                const occurrences = (content.match(/^## \d{4}-\d{2}-\d{2} \|/gm) || []).length;
                const slugMatches = content.match(/^## \d{4}-\d{2}-\d{2} \| ([^\n]+)$/gm) || [];
                const slugs = slugMatches.map(m => m.replace(/^## \d{4}-\d{2}-\d{2} \| /, '').trim());
                if (occurrences >= 2) {
                    topicCounts.push({
                        topic: file.replace(/\.md$/, ''),
                        occurrenceCount: occurrences,
                        engagementSlugs: Array.from(new Set(slugs)),
                    });
                }
            } catch {
                // skip
            }
        }
        topicCounts.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
        return topicCounts.slice(0, 20);
    } catch {
        return [];
    }
}

async function applyChunkConfigPromotion(candidate: ImprovementCandidate): Promise<{ ok: boolean; artifactType?: string }> {
    // 2026-05-23 - Promote a per-run chunking bump to a persisted override
    // in wiki/synthesis/chunk-config.json. Reads the current default plan
    // and bumps either chunk count, per-chunk budget, or both, depending on
    // the feedback signal pattern. The override applies on every subsequent
    // run of this artifact type until retired.
    let parsed: any = null;
    try { parsed = JSON.parse(candidate.payload); } catch { return { ok: false }; }
    if (!parsed || !parsed.artifactType) return { ok: false };

    const artifactType = parsed.artifactType as ArtifactType;
    const applied: string[] = Array.isArray(parsed.applied) ? parsed.applied : [];

    // Conservative promotion: use the per-run bump factor but rounded to
    // integers, so the persisted override is durable without runaway growth.
    // We do not read the current overrides to "stack" - persistChunkOverride
    // does shallow merge with existing record.
    const override: Record<string, any> = {};
    let hasIncomplete = false;
    let hasTooShort = false;
    for (const tag of applied) {
        if (tag.startsWith('incomplete:')) hasIncomplete = true;
        if (tag.startsWith('too_short:')) hasTooShort = true;
    }

    // Encode as relative bumps so the calculator's defaults still own the base
    // numbers. We persist as absolute adjustments - small bumps so 5 separate
    // promotions don't compound destructively.
    if (hasIncomplete) {
        override.chunkCountBump = 1;          // +1 chunk durable
        override.perChunkOutputBudgetBump = 1500; // +1.5K tokens durable
    }
    if (hasTooShort) {
        override.perChunkOutputBudgetBump = (override.perChunkOutputBudgetBump || 0) + 2000;
    }
    override.rationale = parsed.rationale || `Learned from ${candidate.cluster.count} feedback signals`;
    override.promotedFrom = candidate.cluster.count;
    override.promotedAt = new Date().toISOString();

    const ok = await persistChunkOverride(artifactType, override as any);
    return { ok, artifactType };
}

async function applyExemplar(candidate: ImprovementCandidate): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const sample = candidate.cluster.distinctTextFragments[0] || '(positive vote/star-only signal)';
    const entry = `\n## EXEMPLAR (${today}) - from ${candidate.cluster.count} positive signals\n${candidate.payload}\n\nUser-cited praise: "${sample.slice(0, 200)}"\n${RUNG_3_LINE}\n`;
    return appendToPage(`exemplars/${candidate.cluster.deliverableType}.md`, entry);
}

async function queueFrameworkUpdate(candidate: ImprovementCandidate): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const path = `frameworks/_pending/${candidate.cluster.deliverableType}-${today}.md`;
    const content = `---\ntitle: Proposed framework update ${candidate.cluster.deliverableType}\ntype: framework-patch-proposal\nproposed_at: ${today}\nsource_signals: ${candidate.cluster.count}\nconfidence: ${candidate.confidence}\nstatus: pending-review\n---\n\n# Proposed addition to frameworks/${candidate.cluster.deliverableType}.md\n\n${candidate.payload}\n\n## Source\n${candidate.cluster.count} negative feedback signals on the ${candidate.cluster.deliverableType} deliverable's overall structure.\n\n## Sample fragments\n${candidate.cluster.distinctTextFragments.map(f => `- "${f.slice(0, 160)}"`).join('\n')}\n`;
    return writeFullPage(path, content);
}

// --- WIKI WRITE HELPERS ---

async function appendToPage(relativePath: string, content: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

async function writeFullPage(relativePath: string, content: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

async function appendLog(entry: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'log.md', content: entry }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

// --- CONSTRAINT EFFECTIVENESS (Phase 3.5) ---

export interface ConstraintRecord {
    text: string;
    deliverableType: string;
    sectionScope: string | null;
    addedAt: string;
    applications: number;
    repeatedNegativeSignalsAfter: number; // negative signals on same scope after this constraint was added
}

export interface EffectivenessReport {
    constraints: Array<{
        id: string;
        text: string;
        applications: number;
        effectiveness: number;
        decision: 'keep' | 'promote-to-skill-patch' | 'retire';
        rationale: string;
    }>;
}

/**
 * Compute effectiveness as: 1 - (negative_signals_after / applications).
 * High effectiveness = few regressions while the constraint was active.
 * C5 (2026-10-01): reads the lifecycle rows that applyConstraint now CREATES and
 * improvementDiscriminator now INCREMENTS (synthesis/constraint-records.json). Retired rows
 * are skipped so a retirement is never re-proposed.
 */
export async function reviewConstraintEffectiveness(): Promise<EffectivenessReport> {
    const records = (await readConstraintRecords()).filter(r => !r.retired);
    const out: EffectivenessReport['constraints'] = [];
    for (const r of records) {
        const effectiveness = r.applications > 0
            ? Math.max(0, 1 - (r.negativeSignalsAfter / r.applications))
            : 0.5;
        let decision: 'keep' | 'promote-to-skill-patch' | 'retire' = 'keep';
        let rationale = `Effectiveness ${(effectiveness * 100).toFixed(0)}% over ${r.applications} applications.`;
        if (r.applications >= 20 && effectiveness < CONSTRAINT_RETIRE_FLOOR) {
            decision = 'retire';
            rationale += ` Below ${CONSTRAINT_RETIRE_FLOOR * 100}% retire floor.`;
        } else if (r.applications >= 20 && effectiveness > CONSTRAINT_PROMOTE_CEILING) {
            decision = 'promote-to-skill-patch';
            rationale += ` Above ${CONSTRAINT_PROMOTE_CEILING * 100}% promotion ceiling.`;
        }
        out.push({
            id: r.id,
            text: r.text,
            applications: r.applications,
            effectiveness,
            decision,
            rationale,
        });
    }
    return { constraints: out };
}

/**
 * C5 (2026-10-01): retirement that actually DELETES. Removes every `- CONSTRAINT ...` line in
 * learned-constraints.md whose rule body matches a retired constraint, appends a `retired:` ledger
 * line (so the removal is auditable, never silent), stamps the lifecycle row, and drops the rule
 * from this browser's active-constraint store. Returns the constraint texts actually removed.
 */
export async function retireConstraints(
    retired: Array<{ id: string; text: string; applications: number; effectiveness: number }>,
): Promise<string[]> {
    if (retired.length === 0) return [];
    const byKey = new Map(retired.map(r => [normalizeConstraintKey(r.text), r]));
    const today = new Date().toISOString().split('T')[0];
    let content = '';
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/learned-constraints.md`);
        if (resp.ok) content = (await resp.json())?.content || '';
    } catch { /* unreachable ledger: nothing to retire from */ }
    if (!content) return [];

    const kept: string[] = [];
    const removed = new Map<string, { id: string; text: string; applications: number; effectiveness: number }>();
    for (const line of content.split('\n')) {
        if (/^-\s+CONSTRAINT/.test(line)) {
            const hit = byKey.get(normalizeConstraintKey(line));
            if (hit) { removed.set(normalizeConstraintKey(hit.text), hit); continue; }
        }
        kept.push(line);
    }
    if (removed.size === 0) return [];

    const ledgerLines = Array.from(removed.values()).map(r =>
        `- retired: ${r.text} || effectiveness ${(r.effectiveness * 100).toFixed(0)}% over ${r.applications} applications (${today})`);
    const next = kept.join('\n').replace(/\s+$/, '') + '\n' + ledgerLines.join('\n') + '\n';
    const ok = await writeFullPage('synthesis/learned-constraints.md', next);
    if (!ok) return [];

    // Stamp the lifecycle rows so the review never re-proposes the same retirement.
    try {
        const rows = await readConstraintRecords();
        const ids = new Set(Array.from(removed.values()).map(r => r.id || constraintRecordId(r.text)));
        let touched = 0;
        for (const row of rows) {
            if (ids.has(row.id) && !row.retired) { row.retired = new Date().toISOString(); touched++; }
        }
        if (touched > 0) await writeConstraintRecords(rows);
    } catch { /* ledger line already written; row stamp is best-effort */ }

    // Drop from the engine's active mirror so the next prompt does not inject it (WS-5 R7: no localStorage store).
    try {
        const { removeImprovementsByText } = await import('./promptImprovementEngine');
        removeImprovementsByText(Array.from(removed.values()).map(r => r.text));
    } catch { /* the records are the durable store */ }

    return Array.from(removed.values()).map(r => r.text);
}

// --- ORCHESTRATION ---

/**
 * Main entry: run a full learning pass.
 *
 * 1. Read feedback index
 * 2. Cluster
 * 3. Route each cluster
 * 4. Generate payload
 * 5. Estimate confidence
 * 6. Apply at high confidence; queue at review; reject at low
 * 7. Log the pass to wiki/log.md
 */
export async function runLearningPass(opts: { dryRun?: boolean } = {}): Promise<LearningPassResult> {
    const startedAt = new Date();
    const runId = `learn_${startedAt.getTime()}`;
    const index = await readFeedbackIndex();
    const clusters = clusterFeedback(index);
    const applied: ImprovementCandidate[] = [];
    const queuedForReview: ImprovementCandidate[] = [];
    const rejected: ImprovementCandidate[] = [];
    const skillsTouched: string[] = [];
    const skillPatchProposals: string[] = [];
    const chunkConfigsPromoted: string[] = [];

    for (const cluster of clusters) {
        const target = routeCluster(cluster);
        const payload = await generatePayload(cluster, target);
        const confidence = estimateConfidence(cluster, target);
        const candidate: ImprovementCandidate = {
            id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            cluster,
            target,
            payload,
            confidence,
            rationale: `Clustered ${cluster.count} ${cluster.polarity} signals on ${cluster.deliverableType}/${cluster.sectionScope || 'overall'}. Routed to ${target}.`,
            proposedAt: new Date().toISOString(),
        };

        if (opts.dryRun) {
            queuedForReview.push(candidate);
            continue;
        }

        if (confidence < REVIEW_CONFIDENCE) {
            rejected.push(candidate);
            continue;
        }
        if (confidence < HIGH_CONFIDENCE && target === 'framework-page') {
            // Framework page changes are always queued for review regardless
            await queueFrameworkUpdate(candidate);
            queuedForReview.push(candidate);
            continue;
        }
        if (confidence < HIGH_CONFIDENCE) {
            queuedForReview.push(candidate);
            continue;
        }

        // Apply
        let success = false;
        switch (target) {
            case 'constraint':
                success = await applyConstraint(candidate);
                break;
            case 'anti-pattern':
                success = await applyAntiPattern(candidate);
                break;
            case 'skill-patch': {
                // C4: never applied here. A reviewed patch becomes a pending PROPOSAL; the held-out
                // gate (APPROVE verdict) is the only path to a skill write.
                const r = await applySkillPatch(candidate);
                if (r.ok && r.proposalId) {
                    skillPatchProposals.push(r.proposalId);
                    queuedForReview.push(candidate);
                } else {
                    rejected.push(candidate);
                }
                continue;
            }
            case 'framework-page':
                success = await queueFrameworkUpdate(candidate);
                break;
            case 'exemplar':
                success = await applyExemplar(candidate);
                break;
            case 'chunk-config': {
                const r = await applyChunkConfigPromotion(candidate);
                success = r.ok;
                if (r.ok && r.artifactType) chunkConfigsPromoted.push(r.artifactType);
                break;
            }
        }
        if (success) applied.push(candidate);
        else rejected.push(candidate);
    }

    const effectiveness = await reviewConstraintEffectiveness();
    const retireCandidates = effectiveness.constraints.filter(c => c.decision === 'retire');
    // C5: a retirement decision now DELETES the ledger line (dry-run only lists it).
    const constraintsRetired = opts.dryRun
        ? retireCandidates.map(c => c.text)
        : await retireConstraints(retireCandidates);

    // SECOND-BRAIN PASS (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md).
    // `reviewConstraintEffectiveness` above retires a constraint only after 20
    // applications below a floor, so a constraint that is simply OUT OF DATE
    // lived forever and nothing ever consolidated fragments. The lifecycle pass
    // adds the missing halves: every applied constraint is admitted as a TYPED
    // fact (a negative-signal constraint becomes a `correction`, which the
    // staleness pass protects), aged facts get reviewed, fragmented categories
    // get merged, and capacity is enforced. Non-blocking and non-fatal: a
    // failure here never fails the learning pass.
    let secondBrain: LifecyclePassReport | null = null;
    if (!opts.dryRun) {
        try {
            const { runSecondBrainPass, constraintToProposedFact } = await import('./secondBrainPass');
            const proposed = applied.map(c => constraintToProposedFact(c.payload, {
                confidence: c.confidence,
                fromNegativeSignal: c.cluster.polarity === 'negative',
                deliverableType: c.cluster.deliverableType,
            }));
            const pass = await runSecondBrainPass({ runId, proposed });
            secondBrain = pass.report;
        } catch (e: any) {
            console.warn('[LearningEngine] second-brain pass skipped:', e?.message || e);
        }
    }

    const finishedAt = new Date();
    const result: LearningPassResult = {
        runId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        clustersDetected: clusters.length,
        candidatesProduced: applied.length + queuedForReview.length + rejected.length,
        applied,
        queuedForReview,
        rejected,
        skillsTouched,
        skillPatchProposals,
        constraintsRetired,
        chunkConfigsPromoted,
        secondBrain,
    };

    if (!opts.dryRun) {
        const today = startedAt.toISOString().split('T')[0];
        const logEntry = `\n## [${today}] learn | Learning pass ${runId}\n` +
            `  - clusters: ${clusters.length}\n` +
            `  - applied: ${applied.length}\n` +
            `  - queued: ${queuedForReview.length}\n` +
            `  - rejected: ${rejected.length}\n` +
            `  - skills_touched: ${skillsTouched.join(', ') || 'none'}\n` +
            `  - skill_patch_proposals: ${skillPatchProposals.join(', ') || 'none'}\n` +
            `  - chunk_configs_promoted: ${chunkConfigsPromoted.join(', ') || 'none'}\n` +
            `  - constraints_retired: ${constraintsRetired.length}\n` +
            `  - duration_ms: ${result.durationMs}\n`;
        await appendLog(logEntry);
    }

    return result;
}

/**
 * Helper for the change-promotion surfaces. Reads recent improvements that
 * have been applied since `since` (ISO timestamp).
 */
export async function getRecentImprovements(since: string): Promise<{
    skillsBumped: Array<{ name: string; version: string; date: string }>;
    antiPatternsAdded: Array<{ type: string; name: string; date: string }>;
    constraintsAdded: number;
    exemplarsAdded: number;
    frameworkUpdatesPending: number;
}> {
    // Best-effort read of the relevant wiki pages and proxy endpoints.
    // For Phase 3 MVP, return zeroes when the data isn't available so the UI
    // gracefully renders an empty state instead of crashing.
    const out = {
        skillsBumped: [] as Array<{ name: string; version: string; date: string }>,
        antiPatternsAdded: [] as Array<{ type: string; name: string; date: string }>,
        constraintsAdded: 0,
        exemplarsAdded: 0,
        frameworkUpdatesPending: 0,
    };
    try {
        const sinceMs = new Date(since).getTime();
        // Constraints. 2026-10-31 (agent-stack plan handoff 5.5): the banner counted every CONSTRAINT line in the
        // ledger ("48 constraints active" while 0 were active). An ACTIVE constraint is a record that won on the
        // held-out split, the same definition the prompt hook injects (constraint-records.json: status active,
        // heldout_win true, not retired). Candidates are not active.
        const conResp = await fetch(`${PROXY_BASE}/api/wiki/read/synthesis/constraint-records.json`);
        if (conResp.ok) {
            const data = await conResp.json();
            let rows: any[] = [];
            try { rows = JSON.parse(data.content || '[]'); } catch { rows = []; }
            out.constraintsAdded = (Array.isArray(rows) ? rows : [])
                .filter(r => r && !r.retired && r.status === 'active' && r.heldout_win === true).length;
        }
        // Pending framework updates
        const pfResp = await fetch(`${PROXY_BASE}/api/wiki/list/frameworks/_pending`);
        if (pfResp.ok) {
            const data = await pfResp.json();
            out.frameworkUpdatesPending = (data.files || []).length;
        }
        // Skills with last_improved >= since
        const skillsResp = await fetch(`${PROXY_BASE}/api/skill/list-versions`);
        if (skillsResp.ok) {
            const data = await skillsResp.json();
            for (const s of data.skills || []) {
                if (s.last_improved && new Date(s.last_improved).getTime() >= sinceMs) {
                    out.skillsBumped.push({ name: s.name, version: s.version || '1.0', date: s.last_improved });
                }
            }
        }
    } catch {
        // Best-effort
    }
    return out;
}
