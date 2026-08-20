/**
 * DF-E3/E4 - SKILL REVIEW CONTRACT (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * The self-improvement writer in `learningEngine.applySkillPatch` was gated only
 * by `evaluateConstraint` plus `isCompleteSkillPatch` (a truncation check). That
 * is a spell-check standing in for a review: it cannot tell whether the patch is
 * SAFE, whether it CONTRADICTS the skill it is editing, or whether anyone has
 * ever run the skill afterwards. Ungated patch drift is a confirmed defect on
 * this repo: eight mid-sentence near-duplicate appends accreted into
 * deck-narrative-composer/SKILL.md before the 2026-06-23 fix.
 *
 * Ported from deer-flow's `contracts/skill_review/review_report.v1.schema.json`
 * plus `skills/public/skill-reviewer/references/{review-rubric,effect-verification}.md`.
 * The load-bearing idea is the SEPARATION OF TWO AXES that HiC previously
 * conflated into one boolean:
 *
 *   readiness  = is the package structurally fit to ship?   (blocked/revise/publish_candidate)
 *   assurance  = what runtime evidence backs it?            (static_only ... regression_verified)
 *
 * A patch can be perfectly well-formed and carry zero evidence. The report must
 * say both, and raising assurance requires RETAINED evidence bound to the digest
 * that was reviewed; a mismatch keeps the lower level and names the limitation.
 * That is what stops "I verified it" from meaning "I read it".
 */

export type Readiness = 'blocked' | 'revise' | 'publish_candidate';
export type Assurance = 'static_only' | 'trigger_checked' | 'behavior_verified' | 'regression_verified';
export type DimensionStatus = 'pass' | 'concern' | 'blocker' | 'not_assessed';
export type IssueSeverity = 'blocker' | 'major' | 'minor';
export type Confidence = 'high' | 'medium' | 'low';

export interface ReviewDimension {
    id: 'trigger_boundary' | 'instruction_executability' | 'resource_design' | 'safety' | 'output_contract' | 'maintainability' | 'evidence_quality';
    status: DimensionStatus;
    summary: string;
}

export interface ReviewIssue {
    id: string;
    severity: IssueSeverity;
    confidence: Confidence;
    problem: string;
    impact: string;
    remediation: string;
}

/** Evidence that a run actually happened, bound to the digest that was reviewed. */
export interface RetainedEvidence {
    subjectDigest: string;
    modelId: string;
    runtimeVersion: string;
    promptInputs: string;
    toolTrace?: string;
    outputs: string;
    gradingResult: 'pass' | 'fail';
    timestamp: string;
    /** Present only for a baseline comparison. */
    baselineDigest?: string;
}

export interface SkillReviewReport {
    schemaVersion: 'hic.skill-review.report.v1';
    subject: { skillName: string; packageDigest: string };
    review: { scope: string[]; reviewerModel: string; completedAt: string };
    readiness: Readiness;
    assurance: Assurance;
    dimensions: ReviewDimension[];
    issues: ReviewIssue[];
    evidence: { runtimeRuns: number; retained: RetainedEvidence[]; limitations: string[] };
    recommendedActions: string[];
}

/** Content digest so a report can never be applied to a different patch. */
export function packageDigest(text: string): string {
    const s = String(text || '');
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) {
        h1 = (h1 ^ s.charCodeAt(i)) >>> 0;
        h1 = (h1 * 0x01000193) >>> 0;
        h2 = (h2 + s.charCodeAt(i) * (i + 1)) >>> 0;
    }
    return `${h1.toString(16)}${h2.toString(16)}`;
}

/**
 * Instructions that must never enter a skill through an automated patch. These
 * are the deer-flow safety dimension's blockers translated to this codebase:
 * a self-improvement writer that can tell a future run to ignore the design
 * system, skip a gate, or fabricate evidence is worse than no writer at all.
 */
const UNSAFE_PATTERNS: Array<{ re: RegExp; why: string }> = [
    { re: /\b(ignore|bypass|skip|disable|override)\b[^.]{0,40}\b(gate|guard|rule|check|validation|verifier|post-?processor)\b/i, why: 'instructs a future run to bypass a gate' },
    { re: /\b(hardcode|hard-code)\b[^.]{0,30}\b(hex|color|font|token)\b/i, why: 'instructs hardcoding a design value, breaking the token contract' },
    { re: /\b(invent|fabricate|make up|estimate)\b[^.]{0,30}\b(source|citation|statistic|quote|number|author)\b/i, why: 'instructs fabricating evidence' },
    { re: /\brm\s+-rf\b|\bDROP\s+TABLE\b|\bdelete\s+the\s+(wiki|workspace|manifest)\b/i, why: 'contains a destructive operation' },
    { re: /\b(always|never)\s+(?:use|route to)\s+(?:gpt|claude|gemini)[\w.-]*\b/i, why: 'pins a model at the skill layer, which belongs to the single routing authority' },
];

/** Prompt-injection shapes: text that tries to address the model as the system. */
const INJECTION_PATTERNS = [
    /\bignore (?:all )?(?:previous|prior|above) instructions\b/i,
    /<\s*\/?\s*system[-_ ]?(?:reminder|prompt|message)\s*>/i,
    /\byou are now\b[^.]{0,40}\bassistant\b/i,
];

export interface ReviewInput {
    skillName: string;
    /** The patch text about to be appended. */
    patch: string;
    /** Current SKILL.md content, when available, for contradiction checks. */
    existing?: string;
    /** Retained runtime evidence, if any. */
    evidence?: RetainedEvidence[];
    reviewerModel?: string;
    /** Deterministic completeness verdict from the existing gate. */
    completeness?: { ok: boolean; reason?: string };
}

const dim = (id: ReviewDimension['id'], status: DimensionStatus, summary: string): ReviewDimension => ({ id, status, summary });

/**
 * Deterministic review. No model call: every finding here is a fact about the
 * text, which is the only kind of finding that can gate a write without adding a
 * new failure mode of its own.
 */
export function reviewSkillPatch(input: ReviewInput): SkillReviewReport {
    const patch = String(input.patch || '').trim();
    const digest = packageDigest(patch);
    const issues: ReviewIssue[] = [];
    const dimensions: ReviewDimension[] = [];
    const limitations: string[] = [];

    // --- Instruction executability -----------------------------------------
    if (!patch) {
        issues.push({ id: 'exec.empty', severity: 'blocker', confidence: 'high', problem: 'the patch is empty', impact: 'nothing to apply', remediation: 'discard' });
        dimensions.push(dim('instruction_executability', 'blocker', 'empty patch'));
    } else if (input.completeness && !input.completeness.ok) {
        issues.push({
            id: 'exec.incomplete', severity: 'blocker', confidence: 'high',
            problem: `the patch is not a complete instruction: ${input.completeness.reason}`,
            impact: 'a truncated fragment accretes into the live SKILL.md and degrades every later run',
            remediation: 'regenerate the patch and re-review',
        });
        dimensions.push(dim('instruction_executability', 'blocker', String(input.completeness.reason)));
    } else if (patch.split(/\s+/).length < 6) {
        issues.push({ id: 'exec.terse', severity: 'major', confidence: 'medium', problem: 'the patch is too short to be an executable instruction', impact: 'a future run cannot act on it', remediation: 'state the actor, the action and the condition' });
        dimensions.push(dim('instruction_executability', 'concern', 'fewer than six words'));
    } else {
        dimensions.push(dim('instruction_executability', 'pass', 'complete, actionable sentence'));
    }

    // --- Safety -------------------------------------------------------------
    const unsafe = UNSAFE_PATTERNS.filter(p => p.re.test(patch));
    const injected = INJECTION_PATTERNS.filter(p => p.test(patch));
    if (unsafe.length || injected.length) {
        for (const u of unsafe) {
            issues.push({ id: 'safety.unsafe-instruction', severity: 'blocker', confidence: 'high', problem: u.why, impact: 'a future run would follow it silently', remediation: 'reject the patch; fix the upstream prompt instead' });
        }
        for (const _ of injected) {
            issues.push({ id: 'safety.injection-shape', severity: 'blocker', confidence: 'high', problem: 'the patch contains prompt-injection framing', impact: 'a skill file is trusted context; injected framing there is authority escalation', remediation: 'reject the patch' });
        }
        dimensions.push(dim('safety', 'blocker', `${unsafe.length + injected.length} unsafe pattern(s)`));
    } else {
        dimensions.push(dim('safety', 'pass', 'no unsafe or injected instruction'));
    }

    // --- Maintainability: contradiction and duplication ---------------------
    if (input.existing) {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const existingNorm = norm(input.existing);
        const patchNorm = norm(patch);
        if (patchNorm && existingNorm.includes(patchNorm)) {
            issues.push({ id: 'maint.duplicate', severity: 'blocker', confidence: 'high', problem: 'the patch already exists verbatim in the skill', impact: 'duplicate accretion is the exact drift this gate exists to stop', remediation: 'discard' });
            dimensions.push(dim('maintainability', 'blocker', 'verbatim duplicate'));
        } else {
            // A patch that says NEVER about something the skill says ALWAYS (or
            // vice versa) is a contradiction, not an improvement.
            const subject = patchNorm.replace(/\b(never|always|must|do not|dont)\b/g, '').split(' ').filter(w => w.length > 5).slice(0, 4);
            const polarityFlip = /\b(never|do not|don't)\b/i.test(patch)
                && subject.length >= 2
                && subject.every(w => existingNorm.includes(w))
                && /\b(always|must|should)\b/i.test(input.existing);
            if (polarityFlip) {
                issues.push({ id: 'maint.contradiction', severity: 'major', confidence: 'low', problem: 'the patch may contradict an existing instruction on the same subject', impact: 'contradictory guidance makes the skill non-deterministic', remediation: 'edit the existing line instead of appending' });
                dimensions.push(dim('maintainability', 'concern', 'possible polarity contradiction'));
            } else {
                dimensions.push(dim('maintainability', 'pass', 'no duplicate or contradiction detected'));
            }
        }
    } else {
        dimensions.push(dim('maintainability', 'not_assessed', 'existing skill content was not supplied'));
        limitations.push('contradiction and duplication were not assessed: existing SKILL.md content unavailable');
    }

    // --- Output contract ----------------------------------------------------
    dimensions.push(/\b(emit|return|output|format|field|section|slide|schema)\b/i.test(patch)
        ? dim('output_contract', 'pass', 'the patch names an output effect')
        : dim('output_contract', 'concern', 'the patch does not state an observable output effect'));

    // Dimensions this deterministic pass cannot judge; declared, never faked.
    dimensions.push(dim('trigger_boundary', 'not_assessed', 'a patch does not change the skill description'));
    dimensions.push(dim('resource_design', 'not_assessed', 'no resources are added by a text patch'));

    // --- Evidence and assurance --------------------------------------------
    const retained = (input.evidence || []).filter(e => {
        if (e.subjectDigest !== digest) {
            limitations.push(`retained evidence discarded: it is bound to digest ${e.subjectDigest}, not ${digest}`);
            return false;
        }
        const complete = e.modelId && e.runtimeVersion && e.promptInputs && e.outputs && e.timestamp;
        if (!complete) { limitations.push('retained evidence discarded: incomplete evidence set'); return false; }
        return true;
    });
    let assurance: Assurance = 'static_only';
    if (retained.some(e => e.gradingResult === 'pass' && e.baselineDigest)) assurance = 'regression_verified';
    else if (retained.some(e => e.gradingResult === 'pass' && e.toolTrace)) assurance = 'behavior_verified';
    else if (retained.some(e => e.gradingResult === 'pass')) assurance = 'trigger_checked';

    dimensions.push(retained.length
        ? dim('evidence_quality', 'pass', `${retained.length} retained run(s) bound to this digest`)
        : dim('evidence_quality', 'concern', 'no retained runtime evidence'));
    if (!retained.length) limitations.push('no runtime evidence retained; assurance stays static_only');

    // --- Readiness ----------------------------------------------------------
    const blockers = issues.filter(i => i.severity === 'blocker');
    const majors = issues.filter(i => i.severity === 'major');
    const readiness: Readiness = blockers.length ? 'blocked' : majors.length ? 'revise' : 'publish_candidate';

    const recommendedActions: string[] = [];
    if (blockers.length) recommendedActions.push('Discard this patch and fix the upstream prompt that produced it.');
    if (majors.length) recommendedActions.push('Rewrite the flagged instruction before applying.');
    if (!retained.length) recommendedActions.push('Run the skill once and retain the evidence set to raise assurance above static_only.');

    return {
        schemaVersion: 'hic.skill-review.report.v1',
        subject: { skillName: input.skillName, packageDigest: digest },
        review: { scope: ['instructions', 'safety', 'maintainability', 'output', 'evidence'], reviewerModel: input.reviewerModel || 'deterministic', completedAt: new Date().toISOString() },
        readiness, assurance, dimensions, issues,
        evidence: { runtimeRuns: retained.length, retained, limitations },
        recommendedActions,
    };
}

/** One-line log form. Both axes, always, so neither can be quietly dropped. */
export function reviewSummary(r: SkillReviewReport): string {
    const blockers = r.issues.filter(i => i.severity === 'blocker').map(i => i.id).join(', ');
    return `[skill-review] ${r.subject.skillName} digest=${r.subject.packageDigest} readiness=${r.readiness} assurance=${r.assurance}`
        + (blockers ? ` blockers=[${blockers}]` : '');
}
