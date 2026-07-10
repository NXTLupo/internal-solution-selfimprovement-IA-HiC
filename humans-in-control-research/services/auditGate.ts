/**
 * auditGate.ts - the heuristic-analysis gate spine (2026-07-08 critique-rigor P0-a).
 *
 * Section C of critique-rigor-augmentation-2026-07-08.md as TypeScript types + PURE
 * invariant functions, one per rule. The pipeline gate, the Critic rubric, the vitest
 * fixtures, and the dashboard badge ALL consume these same functions - single source
 * of truth. No model calls, no I/O, no Date.now: callers supply everything.
 *
 * Doctrine: the gate, not the author, declares a run verified. The critique deck ships
 * only on gate.status === 'pass'; every failure carries a machine reason code from the
 * failure taxonomy (R1-R20) so downstream routing (repair loop, withhold, human
 * escalation) keys on codes, never prose.
 */

import type {
    HeuristicFinding,
    HeuristicScreenSummary,
    ScreenArtifactType,
    ScreenInventoryItem,
    SeverityScore,
} from '../types';

// ------------------------------------------------------------------
// Reason codes (failure-taxonomy.md R1-R20 + addendum items 20-31)
// ------------------------------------------------------------------

export type AuditReasonCode =
    | 'SEVERITY-UNMAPPED'          // missing/invalid 0-4 integer or no severity_basis (R7)
    | 'SUBSUMED'                   // peer findings that are symptoms of a surviving root (R8)
    | 'DUP'                        // identical fix+heuristic shipped as separate findings (R9)
    | 'UNVERIFIED-AS-DEFECT'       // vlm-only claim asserted without manual-review flag (R5)
    | 'FP-CONTRAST'                // contrast claim above the advisory bar without measurement (R6)
    | 'ADVISORY-AS-HEADLINE'       // needs-manual-review finding used as a cover/action title
    | 'NAV-MISSING-UNFLAGGED'      // nav absent on a live/mockup multi-screen run, no wayfinding finding (R3)
    | 'PROPOSAL-BELOW-FLOOR'       // proposed screen fails a fidelity axis or content parity (R13/R15)
    | 'NO-COMPONENT-BINDING'       // proposed section names a pattern absent from the mirrored registry (R12)
    | 'STANDARD-OVERCLAIMED'       // WCAG/standard cited beyond what was deterministically checked (R11)
    | 'NO-POSITIVES'               // screen with zero preserve[] and zero non_issues[] (R14)
    | 'PRESERVE-DROPPED'           // a preserve item missing from the proposed sections (item 23)
    | 'NO-TASK-MODEL'              // interface findings emitted with no task model in the brief (R2)
    | 'OPINION-AS-HEURISTIC';      // finding cites no dimension subcategory and no evidence kind (R10)

/** Severity 0-4 -> display label. ONE derivation; the CRITICAL/COSMETIC drift dies here. */
export const SEVERITY_LABELS: Record<SeverityScore, string> = {
    0: 'No issue',
    1: 'Cosmetic',
    2: 'Minor',
    3: 'Major',
    4: 'Blocking',
};

export const severityLabel = (s: SeverityScore): string => SEVERITY_LABELS[s] ?? 'Minor';

// ------------------------------------------------------------------
// Gate result contract
// ------------------------------------------------------------------

export interface GateViolation {
    code: AuditReasonCode;
    /** Finding id or screen number ("screen 3") the violation anchors to. */
    subject: string;
    detail: string;
}

export interface GateCheckResult {
    name: string;
    pass: boolean;
    violations: GateViolation[];
}

export interface AuditGateResult {
    status: 'pass' | 'fail';
    checks: GateCheckResult[];
    reasonCodes: AuditReasonCode[];
    /** Per-screen proposal disposition after the floor check: 'ship' | 'withheld'. */
    proposalDisposition: Record<number, 'ship' | 'withheld'>;
    criticLog?: { finding_id: string; reason_code: string; action: string }[];
    generatedAt: string;
}

/** Renderer fidelity report (proposed_screen_render.py contract), per screen. */
export interface ScreenFidelity {
    components: 0 | 1;
    nav: 0 | 1;
    primary_action: 0 | 1;
    bound_slots: number;
    sample_slots: number;
    content_ratio: number;
    unknown_patterns: string[];
}

export interface GateInput {
    findings: HeuristicFinding[];
    screenSummaries: HeuristicScreenSummary[];
    /** 1-indexed screen -> nav present (DOM-derived for captures, vision for uploads). */
    navPresent: Record<number, boolean>;
    /** 1-indexed screen -> artifact type ('live' | 'mockup' | 'slide'). */
    artifactTypes: Record<number, ScreenArtifactType>;
    /** 1-indexed screen -> renderer fidelity (absent = proposal not rendered). */
    fidelity: Record<number, ScreenFidelity | undefined>;
    /** Mirrored proto/* registry pattern names (the manifest-backed catalog). */
    knownPatterns: Set<string>;
    /** Finding ids used as headline surfaces (cover verdicts, slide action titles). */
    headlineFindingIds: string[];
    /** Whether the brief carried a primary task line (R2). */
    hasTaskModel: boolean;
    totalScreens: number;
    criticLog?: { finding_id: string; reason_code: string; action: string }[];
    /** Injected clock (determinism-first; tests pass a constant). */
    now?: string;
}

// ------------------------------------------------------------------
// Pure invariants - one per rule
// ------------------------------------------------------------------

const INTERFACE_DIMENSIONS = new Set([
    'traditional_usability', 'conversational_ai', 'agentic_commerce', 'social_commerce',
]);

/** Every finding carries a valid 0-4 integer AND a non-empty severity_basis. */
export function checkSeverityMapped(findings: HeuristicFinding[]): GateCheckResult {
    const violations: GateViolation[] = [];
    for (const f of findings) {
        if (!Number.isInteger(f.severity) || f.severity < 0 || f.severity > 4) {
            violations.push({ code: 'SEVERITY-UNMAPPED', subject: f.id, detail: `severity "${f.severity}" is not an integer 0-4` });
        } else if (!(f.severity_basis || '').trim()) {
            violations.push({ code: 'SEVERITY-UNMAPPED', subject: f.id, detail: 'missing severity_basis (frequency x impact x persistence)' });
        }
    }
    return { name: 'severity-mapped', pass: violations.length === 0, violations };
}

/**
 * Subsumption held: no surviving finding still points (dependsOn) at another survivor,
 * and no screen carries peer findings alongside a severity-4 root on the same screen
 * that names the page itself broken (blank-page rule). collapseAndScore should have
 * folded these; the gate verifies it actually happened.
 */
export function checkSubsumption(findings: HeuristicFinding[]): GateCheckResult {
    const violations: GateViolation[] = [];
    const ids = new Set(findings.map(f => f.id));
    for (const f of findings) {
        if (f.dependsOn && ids.has(f.dependsOn)) {
            violations.push({ code: 'SUBSUMED', subject: f.id, detail: `still a peer of its parent ${f.dependsOn}; collapse did not fold it` });
        }
    }
    // duplicate fix+heuristic pairs that survived un-merged
    const seen = new Map<string, string>();
    for (const f of findings) {
        const key = `${f.dimension}|${(f.recommendation || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
        if (!(f.recommendation || '').trim()) continue;
        const prior = seen.get(key);
        if (prior) {
            violations.push({ code: 'DUP', subject: f.id, detail: `same dimension + identical fix as ${prior}; merge into instances[]` });
        } else {
            seen.set(key, f.id);
        }
    }
    return { name: 'subsumption', pass: violations.length === 0, violations };
}

/**
 * Advisory discipline: vlm-only findings must be flagged needs_manual_review and capped
 * at severity 2; contrast claims are measured (axe/measured) or advisory; no advisory
 * finding headlines a cover or action title.
 */
export function checkAdvisoryDiscipline(findings: HeuristicFinding[], headlineFindingIds: string[]): GateCheckResult {
    const violations: GateViolation[] = [];
    const headliners = new Set(headlineFindingIds);
    for (const f of findings) {
        const vlmOnly = (f.evidenceKind ?? 'vlm') === 'vlm';
        if (vlmOnly && !f.needsManualReview) {
            violations.push({ code: 'UNVERIFIED-AS-DEFECT', subject: f.id, detail: 'vlm-only judgment asserted without needs_manual_review' });
        }
        if (vlmOnly && f.severity > 2) {
            violations.push({ code: 'UNVERIFIED-AS-DEFECT', subject: f.id, detail: `vlm-only severity ${f.severity} exceeds the advisory cap of 2` });
        }
        const isContrast = /contrast/i.test(`${f.title} ${f.description} ${f.subcategory || ''}`);
        if (isContrast && vlmOnly && f.severity > 2) {
            violations.push({ code: 'FP-CONTRAST', subject: f.id, detail: 'contrast asserted above advisory severity without a measurement (axe or pixel-sampled)' });
        }
        if (f.needsManualReview && headliners.has(f.id)) {
            violations.push({ code: 'ADVISORY-AS-HEADLINE', subject: f.id, detail: 'needs-manual-review finding used as a cover/action title' });
        }
    }
    return { name: 'advisory-discipline', pass: violations.length === 0, violations };
}

/**
 * Nav flagged (R3): a live/mockup screen in a multi-screen run with nav_present=false
 * must carry a wayfinding finding; absence is never silent.
 */
export function checkNavFlagged(
    findings: HeuristicFinding[],
    navPresent: Record<number, boolean>,
    artifactTypes: Record<number, ScreenArtifactType>,
    totalScreens: number,
): GateCheckResult {
    const violations: GateViolation[] = [];
    if (totalScreens < 2) return { name: 'nav-flagged', pass: true, violations };
    for (const [k, present] of Object.entries(navPresent)) {
        const screen = Number(k);
        if (present) continue;
        if (['slide', 'document'].includes(artifactTypes[screen] ?? 'mockup')) continue;
        // ANY ref counts, not just the primary: collapseAndScore merges same-fix
        // wayfinding findings across screens into one finding whose refs UNION covers
        // them all (live bug 2026-07-08: screen 3 read as unflagged because the merged
        // finding's primary ref was screen 1).
        const flagged = findings.some(f =>
            f.screenshotRefs.includes(screen) &&
            /nav|wayfind|orientation|menu|breadcrumb/i.test(`${f.title} ${f.description} ${f.subcategory || ''}`));
        if (!flagged) {
            violations.push({ code: 'NAV-MISSING-UNFLAGGED', subject: `screen ${screen}`, detail: 'nav absent (derived) but no wayfinding finding emitted' });
        }
    }
    return { name: 'nav-flagged', pass: violations.length === 0, violations };
}

/**
 * P0-c1 TOTAL CONTENT PARITY (owner hard requirement): every inventory item maps into
 * the proposed sections or appears in omitted[] with a justification. Coverage below
 * 100% names the missing items. Matching is text-containment over the section slots.
 * The raw missing list is exported separately so the repair loop can name the exact
 * items in its anchored re-ask (plan P0-c3).
 */
export function missingParityItems(summary: HeuristicScreenSummary): string[] {
    const inventory = summary.contentInventory || [];
    if (!inventory.length || !summary.proposedSections?.length) return [];
    const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const haystack = norm(summary.proposedSections.map(s =>
        [s.label, s.cta, ...(s.items || []), ...(s.values || []), ...(s.subs || [])].filter(Boolean).join(' | ')
    ).join(' | '));
    const omitted = new Set((summary.omitted || []).filter(o => (o.reason || '').trim()).map(o => norm(o.item)));
    const missing: string[] = [];
    for (const item of inventory) {
        const t = norm(item.text);
        if (!t) continue;
        if (haystack.includes(t)) continue;
        // token-overlap fallback: >=60% of the item's significant words appear in the proposal
        const words = t.split(' ').filter(w => w.length > 3);
        const hit = words.length > 0 && words.filter(w => haystack.includes(w)).length / words.length >= 0.6;
        if (hit) continue;
        if (omitted.has(t) || [...omitted].some(o => o.includes(t) || t.includes(o))) continue;
        missing.push(`${item.kind}: "${item.text}"`);
    }
    return missing;
}

export function checkContentParity(summary: HeuristicScreenSummary): GateViolation[] {
    return missingParityItems(summary).map(m => ({
        code: 'PROPOSAL-BELOW-FLOOR' as AuditReasonCode,
        subject: `screen ${summary.screenshot}`,
        detail: `content parity: unbound + unjustified inventory item - ${m}`,
    }));
}

/**
 * Fidelity floor (severity-and-fidelity.md, 5 axes): content(=parity), components
 * (=every section from a mirrored token-bound partial), nav, primary_action; plus
 * NO-COMPONENT-BINDING for any pattern outside the mirrored registry. A screen that
 * fails is WITHHELD, not shipped (an honest critique-only screen beats an
 * anti-recommendation in pictures).
 */
export function checkFloor(
    summaries: HeuristicScreenSummary[],
    fidelity: Record<number, ScreenFidelity | undefined>,
    knownPatterns: Set<string>,
): GateCheckResult & { disposition: Record<number, 'ship' | 'withheld'> } {
    const violations: GateViolation[] = [];
    const disposition: Record<number, 'ship' | 'withheld'> = {};
    for (const s of summaries) {
        const subject = `screen ${s.screenshot}`;
        if (!s.proposedSections?.length) { disposition[s.screenshot] = 'withheld'; continue; }
        let failed = false;
        for (const sec of s.proposedSections) {
            if (!knownPatterns.has(sec.pattern)) {
                violations.push({ code: 'NO-COMPONENT-BINDING', subject, detail: `pattern "${sec.pattern}" is not in the mirrored proto/* registry` });
                failed = true;
            }
        }
        const fid = fidelity[s.screenshot];
        if (fid) {
            if (fid.components !== 1) { violations.push({ code: 'PROPOSAL-BELOW-FLOOR', subject, detail: `components axis 0 (unknown: ${fid.unknown_patterns.join(', ') || 'literal-styled block'})` }); failed = true; }
            if (fid.nav !== 1) { violations.push({ code: 'PROPOSAL-BELOW-FLOOR', subject, detail: 'nav axis 0: no nav pattern in the proposal' }); failed = true; }
            if (fid.primary_action !== 1) { violations.push({ code: 'PROPOSAL-BELOW-FLOOR', subject, detail: 'primary_action axis 0: no stated-state CTA' }); failed = true; }
        } else {
            // WS-0c (2026-07-09 uplift): a missing fidelity report means the render
            // failed or timed out - that is a floor FAILURE, never a silent pass of
            // three axes (the render-timeout bypass found in the binding audit).
            violations.push({ code: 'PROPOSAL-BELOW-FLOOR', subject, detail: 'no fidelity report: the proposed render failed or timed out; axes unverified' });
            failed = true;
        }
        const parity = checkContentParity(s);
        if (parity.length) { violations.push(...parity); failed = true; }
        disposition[s.screenshot] = failed ? 'withheld' : 'ship';
    }
    return { name: 'fidelity-floor', pass: violations.length === 0, violations, disposition };
}

/**
 * Standard scoping (R11): a finding naming WCAG/a standard must be grounded in a
 * deterministic check (axe/dom/measured) OR carry the advisory flag. Overclaiming is
 * a DEFINITIVE conformance claim without measurement; an advisory finding that names
 * the criterion to verify is correctly scoped (2026-07-08 precision fix: the live
 * dense-screen run failed on findings the Critic had already marked advisory).
 */
export function checkStandardScope(findings: HeuristicFinding[]): GateCheckResult {
    const violations: GateViolation[] = [];
    for (const f of findings) {
        const citesStandard = /wcag|success criterion|\bsc \d|en 301|section 508/i.test(`${f.title} ${f.description} ${f.subcategory || ''}`);
        if (citesStandard && (f.evidenceKind ?? 'vlm') === 'vlm' && !f.needsManualReview) {
            violations.push({ code: 'STANDARD-OVERCLAIMED', subject: f.id, detail: 'asserts a standard definitively without a deterministic check backing it' });
        }
    }
    return { name: 'standard-scope', pass: violations.length === 0, violations };
}

/**
 * Preserve + positives (R14, item 23): every screen has >=1 preserve or non_issue;
 * every preserve item is carried in the proposed sections (when a proposal ships).
 */
export function checkPreserve(summaries: HeuristicScreenSummary[]): GateCheckResult {
    const violations: GateViolation[] = [];
    const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    for (const s of summaries) {
        const subject = `screen ${s.screenshot}`;
        if (!(s.preserve?.length) && !(s.non_issues?.length)) {
            violations.push({ code: 'NO-POSITIVES', subject, detail: 'no preserve[] and no non_issues[]: nothing examined was found fine?' });
        }
        if (s.proposedSections?.length && s.preserve?.length) {
            const haystack = norm(s.proposedSections.map(x =>
                [x.label, x.cta, ...(x.items || []), ...(x.values || []), ...(x.subs || [])].filter(Boolean).join(' ')
            ).join(' '));
            for (const p of s.preserve) {
                const t = norm(p);
                // Tokenize with punctuation stripped (live bug 2026-07-08: "($3.8T," never
                // matched the bound "$3.8T" value). Values carried in the proposal count
                // FIRST: a preserve item naming a stat is satisfied when the stat binds.
                const values = t.match(/[$>~<]?\d[\d,.]*[%tkmbx]?/gi) || [];
                const valuesCarried = values.length > 0 && values.every(v => haystack.includes(v));
                const words = t.split(' ').map(w => w.replace(/[^a-z0-9$%>.]/g, '')).filter(w => w.length > 3);
                const carried = valuesCarried || haystack.includes(t) ||
                    (words.length > 0 && words.filter(w => haystack.includes(w)).length / words.length >= 0.5);
                if (!carried) {
                    violations.push({ code: 'PRESERVE-DROPPED', subject, detail: `preserve item not carried into the proposal: "${p}"` });
                }
            }
        }
    }
    return { name: 'preserve', pass: violations.length === 0, violations };
}

/** R2/R10: interface findings need a task model; every finding needs a heuristic anchor. */
export function checkFraming(findings: HeuristicFinding[], hasTaskModel: boolean, artifactTypes: Record<number, ScreenArtifactType>): GateCheckResult {
    const violations: GateViolation[] = [];
    for (const f of findings) {
        const screenType = artifactTypes[f.screenshotRefs[0]] ?? 'mockup';
        if ((screenType === 'slide' || screenType === 'document') && INTERFACE_DIMENSIONS.has(f.dimension)) {
            violations.push({ code: 'NO-TASK-MODEL', subject: f.id, detail: 'interface finding emitted against a slide (communication lens only)' });
        }
        if (!hasTaskModel && INTERFACE_DIMENSIONS.has(f.dimension) && f.severity >= 3) {
            violations.push({ code: 'NO-TASK-MODEL', subject: f.id, detail: 'severity 3+ interaction finding with no task model in the brief' });
        }
        if (!(f.subcategory || '').trim() && (f.evidenceKind ?? 'vlm') === 'vlm') {
            violations.push({ code: 'OPINION-AS-HEURISTIC', subject: f.id, detail: 'no heuristic subcategory and no deterministic evidence: an opinion, not a finding' });
        }
    }
    return { name: 'framing', pass: violations.length === 0, violations };
}

// ------------------------------------------------------------------
// Assembly
// ------------------------------------------------------------------

export function assembleAuditGate(input: GateInput): AuditGateResult {
    const floor = checkFloor(input.screenSummaries, input.fidelity, input.knownPatterns);
    const checks: GateCheckResult[] = [
        checkSeverityMapped(input.findings),
        checkSubsumption(input.findings),
        checkAdvisoryDiscipline(input.findings, input.headlineFindingIds),
        checkNavFlagged(input.findings, input.navPresent, input.artifactTypes, input.totalScreens),
        { name: floor.name, pass: floor.pass, violations: floor.violations },
        checkStandardScope(input.findings),
        checkPreserve(input.screenSummaries),
        checkFraming(input.findings, input.hasTaskModel, input.artifactTypes),
    ];
    const reasonCodes = [...new Set(checks.flatMap(c => c.violations.map(v => v.code)))];
    // Floor failures WITHHOLD the affected proposal rather than failing the whole run:
    // the disposition carries the outcome, the gate records the reason. Any other
    // violation class fails the run outright.
    const nonFloorFailure = checks.some(c =>
        c.violations.some(v => v.code !== 'PROPOSAL-BELOW-FLOOR' && v.code !== 'NO-COMPONENT-BINDING'));
    return {
        status: nonFloorFailure ? 'fail' : 'pass',
        checks,
        reasonCodes,
        proposalDisposition: floor.disposition,
        criticLog: input.criticLog,
        generatedAt: input.now || new Date().toISOString(),
    };
}

/** Render the gate as the markdown page written to wiki/evidence/audits/<slug>/gate.md. */
export function gateToMarkdown(gate: AuditGateResult, slug: string): string {
    const lines: string[] = [
        '---',
        `title: Audit gate - ${slug}`,
        'type: evidence',
        `status: ${gate.status}`,
        `generated: ${gate.generatedAt}`,
        '---',
        '',
        `# Audit gate: ${gate.status.toUpperCase()}`,
        '',
        gate.reasonCodes.length ? `Reason codes: ${gate.reasonCodes.join(', ')}` : 'No violations.',
        '',
    ];
    for (const c of gate.checks) {
        lines.push(`## ${c.name}: ${c.pass ? 'pass' : 'FAIL'}`);
        for (const v of c.violations) lines.push(`- [${v.code}] ${v.subject}: ${v.detail}`);
        lines.push('');
    }
    lines.push('## Proposal disposition');
    for (const [screen, d] of Object.entries(gate.proposalDisposition)) {
        lines.push(`- screen ${screen}: ${d}`);
    }
    if (gate.criticLog?.length) {
        lines.push('', '## Critic log');
        for (const a of gate.criticLog) lines.push(`- ${a.finding_id}: ${a.action} [${a.reason_code}]`);
    }
    return lines.join('\n');
}
