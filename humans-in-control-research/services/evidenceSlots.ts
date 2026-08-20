/**
 * DF-G - EVIDENCE SLOTS: the mechanical carrier the provenance-lock plan asked for
 * (plans/deerflow-harness-transfer-2026-08-20.md, plans/citation-integrity-provenance-lock-2026-08-17.md)
 *
 * The provenance lock closed source-identity fabrication: the model may no longer
 * author a source name. It left an honest gap, recorded in that plan: nothing
 * mechanically stops a section from ASSERTING something the corpus never covered,
 * and the cross-industry framing rule is prompt-only.
 *
 * DeerFlow's `consulting-analysis` skill supplies the missing shape. Its Phase 1
 * emits an analysis framework BEFORE collection, declaring per chapter what data
 * is required at P0/P1/P2 with the visualization that will carry it, and Phase 2
 * then flags missing P0 data in the report rather than writing around it.
 *
 * HiC already had 80% of the data model and never enforced it:
 *   - `researchPlanner.ts` models SubQuestion{angle, expected_evidence_types,
 *     expected_named_entities, priority} and `auditSubQuestionCoverage` returns
 *     uncovered/partial/covered.
 *   - `emitDeliverable.ts` RECORDS that audit into AIR and stops there.
 *
 * This module closes the loop: declare the slots a section needs, determine
 * FILLED deterministically from manifest pointers (never from narrative), and
 * refuse a declarative factual claim that rides an unfilled P0 slot. The remedy
 * is always NARROWING, per .claude/CLAUDE.md: write the section around what IS
 * evidenced. Never a visible annotation.
 */

import { enumerateTextFields, stripCitationArtifacts, citationMarkersOf } from './slideTextEditing';

export type SlotPriority = 'P0' | 'P1' | 'P2';
export type EvidenceKind = 'quote' | 'statistic' | 'named_entity' | 'finding' | 'any';
export type SlotState = 'filled' | 'partial' | 'unfilled';

export interface EvidenceSlot {
    slotId: string;
    sectionId: string;
    evidenceKind: EvidenceKind;
    priority: SlotPriority;
    /** Links the slot back to the research plan when one exists. */
    subQuestionId?: string;
    /** Terms that a filling chunk is expected to cover. */
    expectedTerms?: string[];
}

export interface PlannedSection {
    sectionId: string;
    title: string;
    /** What this section asserts, in one line. Drives the slot set. */
    claimIntent: string;
    requiredSlots: EvidenceSlot[];
    visualPlan?: { exhibitType: string; dataMapping: string };
}

export interface ArtifactPlan {
    artifactType: string;
    sections: PlannedSection[];
    createdAt: string;
}

export interface SlotFill {
    slotId: string;
    sectionId: string;
    priority: SlotPriority;
    state: SlotState;
    /** Manifest pointers bound to this slot. */
    pointers: string[];
    reason: string;
}

export interface SlotViolation {
    sectionId: string;
    title: string;
    field: string;
    /** The unsupported declarative claim, verbatim. */
    claim: string;
    kind: 'unsupported_p0' | 'unframed_cross_domain';
    detail: string;
}

export interface SlotReport {
    fills: SlotFill[];
    violations: SlotViolation[];
    /** Fraction of P0 slots filled, 0..1. */
    p0Coverage: number;
    pass: boolean;
}

// ---------------------------------------------------------------------------
// Claim detection (deterministic)
// ---------------------------------------------------------------------------

/** Statement shapes that assert a fact about the world rather than a judgment. */
const QUANT_RE = /(?<![\w.])\d+(?:\.\d+)?\s?(?:%|percent|x|bps)|\$\s?\d|(?<![\w.])\d{2,}(?![\w%])/i;
const CAUSAL_RE = /\b(because|therefore|as a result|drives|causes|leads to|results in|due to)\b/i;
const ABSOLUTE_RE = /\b(all|every|none|never|always|only|first|largest|fastest|most)\b/i;
const COMPARATIVE_RE = /\b(more than|less than|higher than|lower than|outperform\w*|versus|compared with|compared to)\b/i;
/** Hedged or intent language is NOT a factual assertion; it needs no slot. */
const NON_FACTUAL_RE = /\b(should|must|recommend\w*|consider|propose\w*|we will|plan to|could|may|might)\b/i;

/**
 * Does this text make a declarative factual claim? Conservative by design:
 * a false positive would refuse a legitimate judgment, so the bar is a
 * quantity, a causal link, an absolute, or an explicit comparison.
 */
export function isFactualClaim(text: string): boolean {
    const t = stripCitationArtifacts(String(text || '')).trim();
    if (t.split(/\s+/).length < 6) return false;        // labels and headings
    if (NON_FACTUAL_RE.test(t)) return false;            // recommendation, not fact
    return QUANT_RE.test(t) || CAUSAL_RE.test(t) || ABSOLUTE_RE.test(t) || COMPARATIVE_RE.test(t);
}

/** Manifest pointers carried by a field, e.g. `articles/x/ab12.md#c3`. */
export function pointersOf(value: string): string[] {
    const raw = String(value || '').match(/[\w./\\-]+\.md#c\d+/gi) || [];
    return Array.from(new Set(raw.map(p => p.trim())));
}

// ---------------------------------------------------------------------------
// Domain tagging (DF-G4: cross-industry evidence must be FRAMED, never passed off)
// ---------------------------------------------------------------------------

/**
 * Deliberately small and pack-aligned. These are the industry packs the proxy
 * actually ships, so a hit is meaningful. Conservative: the gate fires only when
 * BOTH the run domain and the source domain are confidently identified AND they
 * differ, so an unknown source can never trigger a false refusal.
 */
const DOMAIN_HINTS: Record<string, RegExp> = {
    healthcare: /\b(health|hospital|clinic|patient|payer|provider|medicaid|medicare|pharma)\b/i,
    insurance: /\b(insur\w+|underwrit\w+|actuar\w+|claims adjust\w*|reinsur\w+)\b/i,
    agriculture: /\b(agricultur\w+|farm\w*|crop|agronom\w+|livestock)\b/i,
    energy: /\b(energy|utility|utilities|grid|solar|wind power|oil and gas|petrochem\w+)\b/i,
    retail: /\b(retail\w*|ecommerce|e-commerce|merchandis\w+|shopper|storefront)\b/i,
    hospitality: /\b(hospitality|hotel|restaurant|lodging|resort|travel and tourism)\b/i,
    banking: /\b(bank\w*|fintech|lending|credit union|wealth management|asset management)\b/i,
    education: /\b(universit\w+|college|student|higher ed\w*|enrollment|admissions|alumni)\b/i,
    nonprofit: /\b(nonprofit|non-profit|philanthrop\w+|donor|fundrais\w+|ngo)\b/i,
    government: /\b(government|municipal|federal agency|public sector|regulator\w*)\b/i,
    manufacturing: /\b(manufactur\w+|factory|plant floor|industrial automation|supply chain)\b/i,
    recruiting: /\b(recruit\w+|executive search|talent acquisition|staffing|placement)\b/i,
};

export function detectDomain(text: string): string | null {
    const hits = Object.entries(DOMAIN_HINTS).filter(([, re]) => re.test(text || ''));
    // Ambiguous text (two or more domains) is not a confident signal.
    return hits.length === 1 ? hits[0][0] : null;
}

/** Does the slide text itself name the source's domain (the analog framing)? */
export function framesDomain(text: string, domain: string): boolean {
    const re = DOMAIN_HINTS[domain];
    return !!re && re.test(text || '');
}

// ---------------------------------------------------------------------------
// Plan construction
// ---------------------------------------------------------------------------

export interface PlanSubQuestion {
    id: string;
    question: string;
    priority: 'high' | 'medium' | 'low';
    expected_evidence_types?: string[];
    expected_named_entities?: string[];
}

const PRIORITY_MAP: Record<string, SlotPriority> = { high: 'P0', medium: 'P1', low: 'P2' };

function terms(text: string): string[] {
    return Array.from(new Set(
        String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 4),
    ));
}

/**
 * Build the artifact plan from the sections the artifact actually has plus the
 * research plan's sub-questions. Every section that makes a factual claim earns
 * at least one slot; sub-questions matched by term overlap contribute their
 * priority, so the research plan's own P0 flows into the artifact gate.
 */
export function buildArtifactPlan(
    slides: any[],
    subQuestions: PlanSubQuestion[] = [],
    artifactType = 'slides',
): ArtifactPlan {
    const sections: PlannedSection[] = (slides || []).map((s, i) => {
        const sectionId = String(s?.id || `s${i}`);
        const title = String(s?.title || s?.composerPayload?.title || `Section ${i + 1}`);
        const fields = enumerateTextFields(s);
        const body = fields.map(f => f.value).join(' ');
        const claimFields = fields.filter(f => isFactualClaim(f.value));
        const sectionTerms = new Set(terms(`${title} ${body}`));

        const matched = subQuestions.filter(sq => {
            const t = terms(sq.question);
            const overlap = t.filter(x => sectionTerms.has(x)).length;
            return overlap >= 2;
        });

        const requiredSlots: EvidenceSlot[] = [];
        matched.forEach((sq, k) => requiredSlots.push({
            slotId: `${sectionId}:sq${k}`,
            sectionId,
            evidenceKind: (sq.expected_evidence_types?.includes('social') ? 'quote' : 'finding') as EvidenceKind,
            priority: PRIORITY_MAP[sq.priority] || 'P1',
            subQuestionId: sq.id,
            expectedTerms: terms(sq.question).slice(0, 8),
        }));
        // A section that asserts facts needs at least one P0 slot even when no
        // sub-question matched: the claim still has to be sourced.
        if (!requiredSlots.some(r => r.priority === 'P0') && claimFields.length > 0) {
            requiredSlots.push({
                slotId: `${sectionId}:claim`,
                sectionId,
                evidenceKind: 'any',
                priority: 'P0',
                expectedTerms: terms(title).slice(0, 6),
            });
        }

        return {
            sectionId,
            title,
            claimIntent: claimFields[0] ? stripCitationArtifacts(claimFields[0].value).slice(0, 200) : title,
            requiredSlots,
        };
    });

    return { artifactType, sections, createdAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export interface SlotGateOptions {
    /** The run's subject domain. When absent, the cross-domain check is skipped. */
    subjectDomain?: string | null;
    /** Resolves a pointer to the source text/title used for domain detection. */
    resolveSourceText?: (pointer: string) => string | null;
}

/**
 * Deterministic evaluation. A slot is FILLED when a manifest pointer is bound to
 * a claim-bearing field in its section; nothing about the narrative counts.
 */
export function evaluateEvidenceSlots(
    slides: any[],
    plan: ArtifactPlan,
    opts: SlotGateOptions = {},
): SlotReport {
    const bySection = new Map<string, any>();
    (slides || []).forEach((s, i) => bySection.set(String(s?.id || `s${i}`), s));

    const fills: SlotFill[] = [];
    const violations: SlotViolation[] = [];

    for (const section of plan.sections) {
        const slide = bySection.get(section.sectionId);
        if (!slide) continue;
        const fields = enumerateTextFields(slide);
        const allPointers = Array.from(new Set(fields.flatMap(f => pointersOf(f.value))));
        const claimFields = fields.filter(f => isFactualClaim(f.value));

        for (const slot of section.requiredSlots) {
            // Pointers whose section field also covers the slot's expected terms.
            const relevant = slot.expectedTerms?.length
                ? Array.from(new Set(fields
                    .filter(f => {
                        const ft = new Set(terms(f.value));
                        return slot.expectedTerms!.some(t => ft.has(t));
                    })
                    .flatMap(f => pointersOf(f.value))))
                : allPointers;
            const pool = relevant.length ? relevant : allPointers;
            const state: SlotState = pool.length >= 2 ? 'filled' : pool.length === 1 ? 'partial' : 'unfilled';
            fills.push({
                slotId: slot.slotId, sectionId: slot.sectionId, priority: slot.priority, state,
                pointers: pool,
                reason: state === 'unfilled'
                    ? 'no manifest pointer bound to this section'
                    : `${pool.length} pointer(s) bound`,
            });
        }

        // VIOLATION 1: a declarative factual claim with no pointer in its own field.
        const p0Unfilled = section.requiredSlots.some(s => s.priority === 'P0')
            && !fills.some(f => f.sectionId === section.sectionId && f.priority === 'P0' && f.state !== 'unfilled');
        for (const cf of claimFields) {
            const own = pointersOf(cf.value);
            if (own.length === 0 && (p0Unfilled || allPointers.length === 0)) {
                violations.push({
                    sectionId: section.sectionId, title: section.title, field: cf.path,
                    claim: stripCitationArtifacts(cf.value).slice(0, 240),
                    kind: 'unsupported_p0',
                    detail: 'Declarative factual claim with no manifest pointer in its field and no P0 evidence bound to the section.',
                });
            }
        }

        // VIOLATION 2 (DF-G4): cross-domain evidence presented without framing.
        if (opts.subjectDomain && opts.resolveSourceText) {
            const bodyText = fields.map(f => f.value).join(' ');
            for (const ptr of allPointers) {
                const srcText = opts.resolveSourceText(ptr);
                if (!srcText) continue;
                const srcDomain = detectDomain(srcText);
                if (!srcDomain || srcDomain === opts.subjectDomain) continue;
                if (!framesDomain(bodyText, srcDomain)) {
                    violations.push({
                        sectionId: section.sectionId, title: section.title, field: 'section',
                        claim: stripCitationArtifacts(bodyText).slice(0, 240),
                        kind: 'unframed_cross_domain',
                        detail: `Evidence from the ${srcDomain} domain is used in a ${opts.subjectDomain} section without naming it as an analog.`,
                    });
                    break; // one framing violation per section is enough to act on
                }
            }
        }
    }

    const p0 = fills.filter(f => f.priority === 'P0');
    const p0Filled = p0.filter(f => f.state !== 'unfilled').length;
    return {
        fills, violations,
        p0Coverage: p0.length ? p0Filled / p0.length : 1,
        pass: violations.length === 0,
    };
}

/**
 * The remedy instruction. NARROWING, never annotation: .claude/CLAUDE.md forbids
 * shipping the model's awareness of what is missing, so the section is rewritten
 * around what IS evidenced and the unfilled slot stays internal.
 */
export function buildSlotNarrowingInstruction(report: SlotReport): string {
    if (report.pass) return '';
    const unsupported = report.violations.filter(v => v.kind === 'unsupported_p0');
    const unframed = report.violations.filter(v => v.kind === 'unframed_cross_domain');
    const lines: string[] = [
        'EVIDENCE REVISION REQUIRED. Each item below states something the corpus does not support as written. Do NOT add a note about missing evidence; rewrite the section around what IS evidenced.',
    ];
    for (const v of unsupported.slice(0, 6)) {
        lines.push(`- ${v.title} (${v.field}): unsupported claim "${v.claim.slice(0, 140)}". Either bind the exact manifest pointer for this claim or replace the sentence with a claim the bound evidence supports.`);
    }
    for (const v of unframed.slice(0, 4)) {
        lines.push(`- ${v.title}: ${v.detail} Name that domain explicitly in the text and draw the lesson across, or drop the evidence.`);
    }
    lines.push('Keep every verbatim quote, source label and pointer that is already correct. Narrow the claim, never widen the citation.');
    return lines.join('\n');
}
