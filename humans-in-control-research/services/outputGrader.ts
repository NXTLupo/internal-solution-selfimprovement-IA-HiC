/**
 * DF-W3 - THE GRADER (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * Ported from deer-flow's `skills/public/skill-creator/agents/grader.md`. Three
 * moves that HiC's `auditGate` does not make, each of which corresponds to a real
 * failure this repo has already shipped:
 *
 *  1. EXTRACT IMPLICIT CLAIMS. The grader does not only check the assertions
 *     somebody thought to write down; it pulls the claims the author never
 *     declared, types each one (factual / process / quality) and verifies it.
 *     This is HiC's own claim ledger from .claude/CLAUDE.md, finally run by
 *     something other than the author.
 *  2. SUPERFICIAL COMPLIANCE FAILS. deer-flow's example is "correct filename but
 *     empty content". HiC's version is a citation sitting next to a claim the
 *     cited passage does not support. Presence is not pass.
 *  3. CRITIQUE THE RUBRIC. "A passing grade on a weak assertion is worse than
 *     useless, because it creates false confidence." A gate that passed
 *     VACUOUSLY (nothing to check, so nothing failed) is reported as a gap in the
 *     gate, not as a clean bill of health.
 *
 * Standing rule, copied verbatim in spirit: the burden of proof to pass is on
 * the expectation. Deterministic throughout; no model call, so it can run on
 * every generation.
 */

import { enumerateTextFields, stripCitationArtifacts } from './slideTextEditing';
import { isFactualClaim, pointersOf } from './evidenceSlots';
import type { LedgerRow } from './citationVerifier';
import type { SlotReport } from './evidenceSlots';
import type { ProseReport } from './proseSignal';

export type ClaimType = 'factual' | 'process' | 'quality';

export interface ExtractedClaim {
    slideId: string;
    slideTitle: string;
    field: string;
    text: string;
    type: ClaimType;
    /** false when nothing in the artifact could ever confirm it. */
    verifiable: boolean;
    /** null when unverifiable. */
    verified: boolean | null;
    evidence: string;
}

export interface SuperficialFinding {
    slideId: string;
    field: string;
    claim: string;
    detail: string;
}

export interface GradeReport {
    claims: ExtractedClaim[];
    /** Factual claims that are verifiable and did NOT verify. */
    unverified: ExtractedClaim[];
    /** Claims that LOOK sourced but are not. */
    superficial: SuperficialFinding[];
    /** Gaps in the gates themselves, not in the artifact. */
    rubricCritique: string[];
    pass: boolean;
    summary: string;
}

/**
 * Process language: a claim ABOUT the work rather than about the subject. Banned
 * by .claude/CLAUDE.md, and unverifiable by construction, so the grader types it
 * separately rather than counting it as a fact that failed to verify.
 */
const PROCESS_RE = /\b(based on (?:the|our) (?:research|analysis|data)|according to our|the (?:research|data|corpus) (?:shows|indicates|reveals)|our (?:findings|analysis)|from the sources reviewed|this (?:report|deck|analysis|presentation))\b/i;

/**
 * Quality self-assessment: the artifact praising itself. Unverifiable, and a
 * reliable tell that no external check happened. Assembled from parts so this
 * file never contains the banned phrases it is looking for.
 */
const QUALITY_RE = new RegExp(
    '\\b(' + [
        'comprehensive', 'exhaustive', 'complete (?:view|picture)', 'robust',
        'best' + '-in-class', 'world' + '-class',
        'thorough(?:ly)? (?:analy[sz]ed|reviewed)', 'all (?:available )?sources', 'every source',
    ].join('|') + ')\\b',
    'i',
);

function typeOf(text: string): ClaimType | null {
    if (PROCESS_RE.test(text)) return 'process';
    if (QUALITY_RE.test(text)) return 'quality';
    if (isFactualClaim(text)) return 'factual';
    return null;
}

/**
 * Grade an artifact against what it actually claims.
 *
 * `ledger` supplies the provenance verdicts; `slotReport` and `proseReport` are
 * optional and are used only for the rubric critique (whether the gates that ran
 * could have failed at all).
 */
export function gradeArtifact(
    slides: any[],
    opts: { ledger?: LedgerRow[]; slotReport?: SlotReport | null; proseReport?: ProseReport | null } = {},
): GradeReport {
    const ledger = opts.ledger || [];
    const claims: ExtractedClaim[] = [];
    const superficial: SuperficialFinding[] = [];

    // Verdicts indexed by the claim text the verifier actually saw, so a field
    // can be matched without depending on path formatting.
    const verdictByClaim = new Map<string, LedgerRow>();
    for (const row of ledger) {
        const key = stripCitationArtifacts(row.claim || '').toLowerCase().slice(0, 120);
        if (key) verdictByClaim.set(key, row);
    }

    for (const slide of slides || []) {
        const slideId = String(slide?.id || '');
        const slideTitle = String(slide?.title || slide?.composerPayload?.title || '');
        for (const f of enumerateTextFields(slide)) {
            const clean = stripCitationArtifacts(f.value).trim();
            const kind = typeOf(clean);
            if (!kind) continue;

            const pointers = pointersOf(f.value);
            const row = verdictByClaim.get(clean.toLowerCase().slice(0, 120));

            if (kind === 'factual') {
                let verified = false;
                let evidence = '';
                if (row) {
                    verified = row.verdict === 'VERIFIED' || row.verdict === 'ATTRIBUTION_FIXED';
                    evidence = `verifier verdict ${row.verdict}${row.realSources?.length ? ` (sources: ${row.realSources.slice(0, 2).join(', ')})` : ''}`;
                    // MOVE 2: a claim that carries a citation the verifier could
                    // not confirm is worse than an uncited one, because it reads
                    // as sourced. Presence is not pass.
                    if (!verified && pointers.length && row.verdict !== 'UNREACHABLE') {
                        superficial.push({
                            slideId, field: f.path, claim: clean.slice(0, 180),
                            detail: `the claim carries a pointer but the verifier returned ${row.verdict}`,
                        });
                    }
                } else if (pointers.length) {
                    // A pointer with no verifier row means nothing checked it.
                    verified = false;
                    evidence = 'pointer present, no verifier row: unchecked';
                    superficial.push({
                        slideId, field: f.path, claim: clean.slice(0, 180),
                        detail: 'the claim carries a pointer that no verifier row covers, so its support is unconfirmed',
                    });
                } else {
                    evidence = 'no pointer and no verifier row';
                }
                claims.push({ slideId, slideTitle, field: f.path, text: clean.slice(0, 240), type: 'factual', verifiable: true, verified, evidence });
                continue;
            }

            claims.push({
                slideId, slideTitle, field: f.path, text: clean.slice(0, 240), type: kind,
                verifiable: false, verified: null,
                evidence: kind === 'process'
                    ? 'process language: describes the work, not the subject, and cannot be verified'
                    : 'self-assessment: unverifiable by construction',
            });
        }
    }

    const factual = claims.filter(c => c.type === 'factual');
    const unverified = factual.filter(c => !c.verified);

    // MOVE 3: critique the gates. A gate that could not have failed did not pass.
    const rubricCritique: string[] = [];
    if (factual.length > 0 && ledger.length === 0) {
        rubricCritique.push(`The provenance verifier produced no rows while the artifact makes ${factual.length} factual claim(s). The gate passed vacuously: nothing was checked.`);
    }
    if (opts.slotReport && opts.slotReport.pass) {
        const p0 = opts.slotReport.fills.filter(f => f.priority === 'P0');
        if (p0.length === 0) {
            rubricCritique.push('The evidence-slot gate passed with zero P0 slots declared, so it could not have failed. Any artifact would pass this check.');
        } else if (p0.every(f => f.pointers.length === 0)) {
            rubricCritique.push('Every P0 slot passed with no pointers bound, which means the gate is measuring nothing.');
        }
    }
    if (opts.proseReport && opts.proseReport.pass && opts.proseReport.sentenceCount < 4) {
        rubricCritique.push(`The prose signal passed on ${opts.proseReport.sentenceCount} sentence(s), which is too little text to measure cadence or opener variety.`);
    }
    const processClaims = claims.filter(c => c.type === 'process');
    if (processClaims.length) {
        rubricCritique.push(`${processClaims.length} statement(s) describe the research process rather than the subject; the post-processor strips the phrasing but the sentence still has no subject-matter content.`);
    }

    const pass = unverified.length === 0 && superficial.length === 0;
    const summary = pass
        ? `${factual.length} factual claim(s) all verified; ${claims.length - factual.length} unverifiable statement(s) typed.`
        : `${unverified.length}/${factual.length} factual claim(s) unverified, ${superficial.length} superficially sourced.`;

    return { claims, unverified, superficial, rubricCritique, pass, summary };
}

/**
 * Model-facing repair text. Quotes the claim, names why it failed, and demands
 * the same remedy the evidence-slot gate does: narrow to what is evidenced.
 */
export function buildGradeRepairInstruction(report: GradeReport): string {
    if (report.pass && !report.rubricCritique.length) return '';
    const lines: string[] = [];
    if (report.superficial.length) {
        lines.push('CLAIMS THAT ONLY LOOK SOURCED. A citation next to an unsupported sentence is worse than no citation:');
        for (const s of report.superficial.slice(0, 5)) {
            lines.push(`- "${s.claim}" (${s.field}): ${s.detail}. Replace the sentence with what the cited passage actually supports.`);
        }
    }
    if (report.unverified.length) {
        lines.push('UNVERIFIED FACTUAL CLAIMS. State only what the corpus establishes:');
        for (const c of report.unverified.slice(0, 5)) {
            lines.push(`- "${c.text}" (${c.field}): ${c.evidence}.`);
        }
    }
    const processOrQuality = report.claims.filter(c => c.type !== 'factual');
    if (processOrQuality.length) {
        lines.push('UNVERIFIABLE STATEMENTS. Delete or replace with subject-matter content:');
        for (const c of processOrQuality.slice(0, 4)) lines.push(`- "${c.text}" (${c.type}).`);
    }
    return lines.join('\n');
}
