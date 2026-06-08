/**
 * Constraint Quality Gate (Phase 1 - Second Brain Consolidation Overhaul, 2026-05-29)
 *
 * The self-improvement loop was writing constraints that were net-NEGATIVE:
 *   - 21 near-duplicate "quantify the business impact in dollars" rules that
 *     DIRECTLY CONTRADICT the master Quantitative Claim Rule in .claude/CLAUDE.md
 *     ("This rule overrides any older guidance ... that asked for 'quantify in
 *     dollars.' Numbers are evidence carried by quotes, not assertions.").
 *   - Generic stubs injected verbatim into the prompt ("Add more details and
 *     clean up the output.", "needs attention: 5 user edits detected", etc.).
 *
 * Every constraint write/read path must pass through this gate so the rot
 * cannot regrow. The gate does three things, in order:
 *   1. REJECT constraints that contradict the master rules (dollar/financial
 *      quantification mandates, naked-number-in-title mandates).
 *   2. REJECT generic stubs below a usefulness bar.
 *   3. DEDUPE the survivors by normalized rule-head (keep the richest variant).
 *
 * Dependency-free on purpose: imported by promptImprovementEngine,
 * learningEngine, and improvementDiscriminator without creating cycles.
 * Mirrors the Python logic in
 * .claude/hooks/scripts/inject_active_constraints_and_patterns.py so the SPA
 * and the Claude Code agent session enforce the SAME bar.
 */

export type ConstraintRejectReason =
    | 'master-rule:dollar-quantification'
    | 'master-rule:naked-number-mandate'
    | 'generic-stub'
    | 'empty';

export interface ConstraintVerdict {
    accept: boolean;
    reason?: ConstraintRejectReason;
    detail?: string;
}

/**
 * Constraints that fight the master Quantitative Claim Rule. The rule bans
 * standalone quantitative claims (dollars, percentages, counts) as the model's
 * own assertions in any user-visible field; numbers may appear ONLY inside a
 * cited verbatim quote. A learned constraint that MANDATES dollar/financial
 * quantification, or mandates a number/percentage in a title/KPI, teaches the
 * model to violate that rule and must never be persisted or injected.
 */
const MASTER_RULE_DOLLAR_PATTERNS: RegExp[] = [
    // "quantify ... in dollars", "quantify ... financial/monetary impact"
    /quantif\w*[\s\S]{0,60}(dollar|financial|monetary|\$)/i,
    // "in dollars" / "with dollar figures" as a directive
    /\b(in|with|using|provide|state|give|express)\s+(precise\s+|concrete\s+|specific\s+)?(dollar|financial|monetary)\b/i,
    // "concrete/precise financial metrics", "dollar figures/amounts/values"
    /(concrete|precise|specific|hard)\s+financial\s+metric/i,
    /\bdollar\s+(figure|amount|value|impact|metric)/i,
    /(financial|monetary|dollar)\s+(impact|value)\s+in\s+(dollars|currency|figures)/i,
];

/**
 * Constraints that mandate a naked number/percentage/statistic in a
 * title/heading/KPI/headline - also a direct master-rule violation.
 */
const MASTER_RULE_NAKED_NUMBER_PATTERNS: RegExp[] = [
    /(include|add|put|place|state|use|insert|lead with)[\s\S]{0,40}(percentage|percent|statistic|number|figure|metric|dollar)[\s\S]{0,40}(title|heading|headline|kpi|tile|label)/i,
    /(title|heading|headline|kpi|tile)[\s\S]{0,40}(must|should)[\s\S]{0,30}(contain|include|have|state)[\s\S]{0,30}(percentage|percent|statistic|number|figure|metric|dollar)/i,
];

/**
 * Generic-stub detectors. These are the boilerplate outputs of
 * generateConstraint() and low-signal user mutterings that add prompt noise
 * without changing behavior. The project already enforces anti-slop, length,
 * and clarity via slidePostProcessor + content budgets, so vague "make it
 * clear / add more detail" rules are pure noise.
 */
const GENERIC_STUB_PATTERNS: RegExp[] = [
    /needs attention/i,
    /user edits detected/i,
    /requires more accuracy/i,
    /review factual claims and specificity/i,
    /\badd more detail/i,
    /clean up the output/i,
    /\bmake it clear(er)?\b/i,
    /free of jargon/i,
    /structure needs revision/i,
    /consider making .* optional/i,
    /needs revision/i,
    /^["']?[^"']{0,40}["']?\s+(needs|requires|structure)/i, // "<field>" needs/requires ...
];

/** Minimum useful length - anything shorter is a stub. */
const MIN_CONSTRAINT_CHARS = 40;

/** Strip the "- CONSTRAINT [scope]:" prefix and trailing "(source: ...)" so we
 *  test the rule body itself. Accepts a raw line OR a bare rule. */
export function extractRuleBody(line: string): string {
    let s = line.trim();
    s = s.replace(/^[-*]\s*/, '');
    s = s.replace(/^CONSTRAINT\s*(\[[^\]]*\])?\s*:\s*/i, '');
    s = s.replace(/\(source:[\s\S]*?\)\s*$/i, '');
    return s.trim();
}

/** Normalized key for dedup: lowercase, tags/sources/confidence stripped,
 *  whitespace collapsed. Mirrors the Python hook (first 80 chars of head). */
export function normalizeConstraintKey(line: string): string {
    let s = extractRuleBody(line).toLowerCase();
    s = s.replace(/\s+/g, ' ').trim();
    return s.slice(0, 80);
}

/**
 * Evaluate a single constraint. Pass either a raw "- CONSTRAINT: ..." line or
 * a bare rule sentence - both are normalized before testing.
 */
export function evaluateConstraint(line: string): ConstraintVerdict {
    const body = extractRuleBody(line);
    if (!body || body.length < MIN_CONSTRAINT_CHARS) {
        return { accept: false, reason: body ? 'generic-stub' : 'empty', detail: 'below usefulness bar' };
    }
    for (const re of MASTER_RULE_DOLLAR_PATTERNS) {
        if (re.test(body)) {
            return {
                accept: false,
                reason: 'master-rule:dollar-quantification',
                detail: 'contradicts Quantitative Claim Rule (.claude/CLAUDE.md): numbers ride in cited quotes, not as mandated dollar assertions',
            };
        }
    }
    for (const re of MASTER_RULE_NAKED_NUMBER_PATTERNS) {
        if (re.test(body)) {
            return {
                accept: false,
                reason: 'master-rule:naked-number-mandate',
                detail: 'contradicts Quantitative Claim Rule: numbers/percentages may not be mandated in titles/KPIs',
            };
        }
    }
    for (const re of GENERIC_STUB_PATTERNS) {
        if (re.test(body)) {
            return { accept: false, reason: 'generic-stub', detail: 'low-signal boilerplate' };
        }
    }
    return { accept: true };
}

/** Convenience: is this constraint safe to persist/inject? */
export function isAcceptableConstraint(line: string): boolean {
    return evaluateConstraint(line).accept;
}

/**
 * Full gate over a list of raw constraint lines (or bare rules):
 * reject violations + stubs, then dedupe survivors by normalized head,
 * keeping the longest (richest) variant per group. Order: longest first
 * (highest detail), matching the Python hook.
 *
 * Returns the kept lines verbatim (caller decides formatting) plus a report.
 */
export interface GateResult {
    kept: string[];
    rejected: { line: string; reason: ConstraintRejectReason }[];
    deduped: number;
}

export function gateConstraints(lines: string[]): GateResult {
    const rejected: { line: string; reason: ConstraintRejectReason }[] = [];
    const survivors: string[] = [];
    for (const line of lines) {
        if (!line || !line.trim()) continue;
        const v = evaluateConstraint(line);
        if (v.accept) survivors.push(line.trim());
        else rejected.push({ line: line.trim(), reason: v.reason || 'empty' });
    }

    // Dedupe by normalized head, keep longest variant.
    const groups = new Map<string, string>();
    let deduped = 0;
    for (const line of survivors) {
        const key = normalizeConstraintKey(line);
        const existing = groups.get(key);
        if (!existing) {
            groups.set(key, line);
        } else {
            deduped++;
            if (line.length > existing.length) groups.set(key, line);
        }
    }

    const kept = [...groups.values()].sort((a, b) => b.length - a.length);
    return { kept, rejected, deduped };
}

/** Filter+dedupe convenience that returns only the kept lines. */
export function filterAndDedupeConstraints(lines: string[]): string[] {
    return gateConstraints(lines).kept;
}
