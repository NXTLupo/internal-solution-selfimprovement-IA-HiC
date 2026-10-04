/**
 * DF-A3 - THE ARTIFACT CHAIN (plans/deerflow-harness-transfer-2026-08-20.md)
 *
 * One declared, ORDERED, test-pinned pipeline for everything that happens to an
 * artifact after the model returns it. Ported from deer-flow's middleware chain
 * (`agents/middlewares/AGENTS.md`), whose real asset is not any single stage but
 * the fact that the order is declared, documented, and pinned by a test.
 *
 * Before this file, HiC's guards were scattered call sites: `slidePostProcessor`
 * here, `citationVerifier` in a panel callback, `deckPlanGate` in the reply path,
 * `auditGate` in the critique path. Nothing declared which ran first, so a
 * reordering could silently strip a citation before it was verified, or verify a
 * label that a later scrub then rewrote. The 2026-08-17 backfill race (verified
 * slides were replaced by unverified ones because two paths raced) was exactly
 * this class of bug.
 *
 * Rules, copied deliberately:
 *  1. STAGE_ORDER is the contract. A stage may be SKIPPED by config; it may never
 *     be reordered silently. `artifactChain.test.ts` pins the sequence.
 *  2. Every stage returns a StepEnvelope. A stage failure is recorded and the
 *     chain continues with the last good slides (fail-open on the ARTIFACT, never
 *     fail-silent on the RECORD).
 *  3. Order rationale is load-bearing:
 *       normalize -> lexical -> bind -> provenance -> evidence -> exhibits -> prose -> grade -> render
 *     Lexical scrubbing runs BEFORE provenance so the verifier sees the text the
 *     reader will see. Provenance runs BEFORE the evidence gate so relabeled and
 *     stripped attributions are already settled when slots are counted. Exhibits are
 *     settled BEFORE prose, so a section can never describe a chart that did not
 *     render. Prose runs LAST of the text stages so it measures the final wording.
 */

import { ok, fail, refuse, partial, type StepEnvelope, envelopeTrace } from './stepEnvelope';
import { verifyDeckEvidence, applyVerificationFixes, type LedgerRow, type PageFetcher } from './citationVerifier';
import { deClicheDeep, stripEmDashes, stripEmoji, stripFormatTells } from './slidePostProcessor';
import { detectSlopInSlides, buildSlopRepairInstruction, type SlopSite } from './slopDetector';
import { stripQAAnnotationsDeep } from './slidePostProcessor';
import { evaluateTitles, buildTitleRepairInstruction, type TitleReport } from './titleGate';
import { evaluateSlideClaims, buildClaimRepairInstruction, type ClaimStageReport } from './claimStage';
import { enumerateTextFields } from './slideTextEditing';
import { analyzeProse, buildProseRepairInstruction, type ProseReport } from './proseSignal';
import {
    buildArtifactPlan, evaluateEvidenceSlots, buildSlotNarrowingInstruction,
    type ArtifactPlan, type SlotReport, type PlanSubQuestion, type SlotGateOptions,
} from './evidenceSlots';
import { readObjectivePlan, planSummary } from './objectivePlan';
import { gradeArtifact, buildGradeRepairInstruction, type GradeReport } from './outputGrader';
import { bindPointers, readGroundingChunks, bindSummary, type BindReport, type BindableChunk } from './pointerBinder';
import {
    evaluateDeckQuality, buildDeckQualityInstruction, noteDeckSequence, previousDeckSequence,
    type DeckQualityReport,
} from './deckQualityGate';
import { evaluateExhibits, buildExhibitInstruction, type ExhibitReport } from './exhibitCatalog';

export type StageId =
    | 'normalize'
    | 'lexical'
    | 'titles'
    | 'bindPointers'
    | 'provenance'
    | 'claims'
    | 'evidenceSlots'
    | 'exhibits'
    | 'prose'
    | 'grade'
    | 'renderPlan'
    | 'deckQuality';

/** THE CONTRACT. Pinned by artifactChain.test.ts. Do not reorder casually. */
export const STAGE_ORDER: StageId[] = [
    'normalize',
    'lexical',
    // 2026-10-01 (plan R-B4 / Stage 2.1): the Partner Test runs on the SCRUBBED title,
    // before binding, so a pointer the binder attaches never counts toward title length.
    'titles',
    // `bindPointers` runs BEFORE provenance and the evidence gate, because it
    // supplies the pointers those two stages read. Three prompt-level attempts to
    // make the model carry pointers itself were measured and failed; the runtime
    // computes them from the chunk set the model was shown.
    'bindPointers',
    'provenance',
    // 2026-10-01 (plan Stage 2.4, audit A3/A9): ONE claim gate. The HTML artifact chain runs
    // `evaluateClaimLedger` directly; this stage is its slide adapter (claimStage.ts). It runs
    // after provenance (pointers resolved, ledger rows recorded) and before the evidence-slot
    // gate, so the slot gate judges coverage on claims that already match their evidence.
    'claims',
    'evidenceSlots',
    // DF-V4, exhibits before prose. deer-flow renders every planned exhibit BEFORE
    // authoring narrative, so a section can never describe a chart that failed to
    // render. HiC's model emits payload and prose in one call, so the equivalent is
    // to settle exhibits BEFORE the prose stage judges the wording: a slide whose
    // exhibit does not fit gets its downgrade named, and prose that points at an
    // absent exhibit is caught while it can still be rewritten.
    'exhibits',
    'prose',
    // `grade` runs LAST of the inspection stages because it grades the other
    // gates as well as the artifact: it can only ask "could that gate have
    // failed?" once the gate has run.
    'grade',
    'renderPlan',
    // `deckQuality` judges the SHAPE of the deck (does each exhibit carry enough
    // data, is the layout mix varied, does it look like the last deck), so it runs
    // after the visual count is known.
    'deckQuality',
];

export interface ChainContext {
    /** Stable id for guards and telemetry. */
    runId: string;
    artifactType?: string;
    /** Research-plan sub-questions, when the run has a plan. */
    subQuestions?: PlanSubQuestion[];
    /** The run's subject domain for the cross-domain framing check. */
    subjectDomain?: string | null;
    /** Engagement slug, so this deck can be compared to the previous one. */
    engagementSlug?: string;
    /** The research objective; the claim ledger derives subject entities and the as-of window from it. */
    researchGoal?: string;
    /** Grounding spans for pointer binding. Defaults to the run's projection. */
    groundingChunks?: BindableChunk[];
    resolveSourceText?: SlotGateOptions['resolveSourceText'];
    /** Injected in tests; defaults to the real wiki fetcher inside the verifier. */
    fetchPage?: PageFetcher;
    /** Stages to skip. Skipping is explicit and recorded; reordering is not possible. */
    skip?: StageId[];
}

export interface ChainResult<T> {
    slides: T[];
    envelopes: StepEnvelope<unknown>[];
    ledger: LedgerRow[];
    slotReport: SlotReport | null;
    proseReport: ProseReport | null;
    gradeReport: GradeReport | null;
    deckQualityReport: DeckQualityReport | null;
    exhibitReport: ExhibitReport | null;
    bindReport: BindReport | null;
    plan: ArtifactPlan | null;
    /**
     * 2026-10-01 (Stage 2.1): the lexical stage's banned-phrase sites and the title
     * gate's findings, exposed so the REPAIR pass can act on them. Before this the
     * chain pushed a slop instruction into `repairInstruction` and the repairer's
     * `needsWork` never looked at it, so a flagged phrase shipped unchanged.
     */
    slopFindings: SlopSite[];
    titleReport: TitleReport | null;
    /** Stage 2.4: the claim ledger's slide-adapted findings (null when the stage was skipped). */
    claimReport: ClaimStageReport | null;
    /** Concatenated model-facing repair text. Empty when everything passed. */
    repairInstruction: string;
    /** Compact per-stage record for AIR. */
    trace: Record<string, unknown>[];
    /** True when no stage refused the artifact. */
    pass: boolean;
}

type SlideLike = { id: string; template: string; title: string; _textHistory?: any[]; composerPayload?: any };

/** Deep string transform that never touches media keys or citation pointers. */
function scrubStrings<T>(node: T): T {
    if (typeof node === 'string') {
        // Pointers and URLs must survive verbatim; only prose is scrubbed.
        if (/https?:\/\//i.test(node) || /^data:/i.test(node)) return node as any;
        return stripFormatTells(stripEmoji(stripEmDashes(node))) as any;
    }
    if (Array.isArray(node)) return node.map(scrubStrings) as any;
    if (node && typeof node === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(node as any)) {
            if (/image|imageurl|icon|url|src|logo|hex|color|glyph|href|avatar/i.test(k)) { out[k] = v; continue; }
            if (k.startsWith('_')) { out[k] = v; continue; }   // carriers: _userImagery, _textHistory
            out[k] = scrubStrings(v);
        }
        return out;
    }
    return node;
}

/**
 * Build a pointer -> descriptive-text lookup from data already in hand. The
 * pointer path carries the source slug (`articles/hfa-journal/ab12.md#c2`), and
 * the ledger carries the recorded source NAMES for the slide that cites it.
 * Together they are enough for the conservative single-domain detection in
 * evidenceSlots, and they cost nothing: the provenance stage already paid for
 * the page reads.
 */
function buildPointerTextResolver(slides: any[], ledger: LedgerRow[]): (pointer: string) => string | null {
    const namesBySlide = new Map<string, string[]>();
    for (const row of ledger) {
        const prior = namesBySlide.get(row.slideId) || [];
        namesBySlide.set(row.slideId, prior.concat(row.realSources || []));
    }
    const textByPointer = new Map<string, string>();
    for (const s of slides || []) {
        const slideNames = (namesBySlide.get(String(s?.id)) || []).join(' ');
        for (const f of enumerateTextFields(s)) {
            for (const ptr of (String(f.value).match(/[\w./\\-]+\.md#c\d+/gi) || [])) {
                const slugWords = ptr.replace(/#c\d+$/, '').replace(/\.md$/, '').split(/[/\\_-]+/).join(' ');
                const prior = textByPointer.get(ptr) || '';
                textByPointer.set(ptr, `${prior} ${slugWords} ${slideNames}`.trim());
            }
        }
    }
    return (pointer: string) => textByPointer.get(pointer) || null;
}

/**
 * Run the chain. Never throws: a stage that fails records an error envelope and
 * the chain proceeds with the last good slides.
 */
export async function runArtifactChain<T extends SlideLike>(
    inputSlides: T[],
    ctx: ChainContext,
): Promise<ChainResult<T>> {
    const skip = new Set(ctx.skip || []);
    const envelopes: StepEnvelope<unknown>[] = [];
    let slides: T[] = Array.isArray(inputSlides) ? inputSlides.slice() : [];
    let ledger: LedgerRow[] = [];
    let slotReport: SlotReport | null = null;
    let proseReport: ProseReport | null = null;
    let gradeReport: GradeReport | null = null;
    let deckQualityReport: DeckQualityReport | null = null;
    let exhibitReport: ExhibitReport | null = null;
    let bindReport: BindReport | null = null;
    let plan: ArtifactPlan | null = null;
    let slopFindings: SlopSite[] = [];
    let titleReport: TitleReport | null = null;
    let claimReport: ClaimStageReport | null = null;
    const repairs: string[] = [];

    for (const stageId of STAGE_ORDER) {
        if (skip.has(stageId)) {
            envelopes.push(ok(`chain:${stageId}`, null, { skipped: true }));
            continue;
        }
        try {
            switch (stageId) {
                case 'normalize': {
                    const before = slides.length;
                    slides = slides.filter(s => s && typeof s === 'object' && (s.template || s.composerPayload));
                    envelopes.push(before === slides.length
                        ? ok('chain:normalize', { slides: slides.length })
                        : refuse('chain:normalize', { slides: slides.length }, `${before - slides.length} malformed slide(s) dropped`, { nextAction: 'continue' }));
                    break;
                }
                case 'lexical': {
                    slides = slides.map(s => {
                        // stripQAAnnotationsDeep: "[N/A]", "TBD", "EVIDENCE GAP" chrome is deleted
                        // outright (audit E4: a source line shipped "[N/A]" in a live deck).
                        // It walks every string, so it runs INSIDE the key-aware scrubber's
                        // output rather than over media keys; QA tokens never appear in URLs.
                        const scrubbed = stripQAAnnotationsDeep(scrubStrings(s));
                        return deClicheDeep(scrubbed) as T;
                    });
                    /**
                     * E1.3 (2026-08-21). Format tells above are removed outright, because a
                     * provider tag or an em-dash carries no meaning to lose. A banned PHRASE
                     * is different: deleting "utilize" from "firms utilize a comprehensive
                     * approach" leaves broken grammar, and `.claude/CLAUDE.md` asks for the
                     * insight kept and the wording fixed. So this stage DETECTS and hands the
                     * sentence to the repair pass, which rewrites it. `check:content` fails the
                     * build on these words, so runtime prevention has to exist somewhere; the
                     * gates-bite pass found that it did not.
                     */
                    const slop = detectSlopInSlides(slides);
                    slopFindings = slop;
                    if (slop.length) {
                        repairs.push(buildSlopRepairInstruction(slop));
                        envelopes.push(refuse('chain:lexical', { slides: slides.length },
                            `${slop.length} banned phrase site(s): ${slop.slice(0, 4).map(v => v.phrase).join(', ')}`,
                            { nextAction: 'narrow_scope', meta: { phrases: slop.length } }));
                        for (const v of slop.slice(0, 6)) console.warn(`[lexical] "${v.phrase}" in ${v.slideId}.${v.field}`);
                    } else {
                        envelopes.push(ok('chain:lexical', { slides: slides.length }));
                    }
                    break;
                }
                case 'titles': {
                    titleReport = evaluateTitles(slides);
                    const failing = titleReport.findings.filter(f => f.failing);
                    if (!failing.length) {
                        envelopes.push(ok('chain:titles', { checked: titleReport.checked, detectOnly: titleReport.findings.length }));
                    } else {
                        repairs.push(buildTitleRepairInstruction(titleReport));
                        const naked = failing.filter(f => f.kinds.includes('naked_number')).length;
                        envelopes.push(refuse('chain:titles', { checked: titleReport.checked, failing: failing.length, naked },
                            `${failing.length} title(s) fail the Partner Test: ${failing.slice(0, 3).map(f => `${f.slideId}[${f.kinds.join('+')}]`).join(', ')}`,
                            // A naked number is the one finding the caller WITHHOLDS when repair
                            // cannot clear it, so it fails the chain; the rest only need a rewrite.
                            { nextAction: naked ? 'narrow_scope' : 'continue', meta: { kinds: failing.flatMap(f => f.kinds) } }));
                        for (const f of failing.slice(0, 6)) console.warn(`[titles] ${f.slideId} "${f.title.slice(0, 80)}": ${f.kinds.join(', ')}`);
                    }
                    break;
                }
                case 'bindPointers': {
                    const pool = ctx.groundingChunks ?? readGroundingChunks();
                    if (!pool.length) {
                        envelopes.push(partial('chain:bindPointers', { bound: 0 },
                            'no grounding spans available for this run', { nextAction: 'continue' }));
                        break;
                    }
                    const res = bindPointers(slides, pool);
                    slides = res.slides;
                    bindReport = res.report;
                    console.info(`[pointer-binder] ${bindSummary(res.report)}`);
                    envelopes.push(res.report.bound.length
                        ? ok('chain:bindPointers', { bound: res.report.bound.length, unbound: res.report.unbound.length })
                        : partial('chain:bindPointers', { bound: 0, unbound: res.report.unbound.length },
                            `no span cleared the binding bar for ${res.report.fieldsConsidered} field(s)`,
                            { nextAction: 'continue' }));
                    break;
                }
                case 'provenance': {
                    ledger = await verifyDeckEvidence(slides, ctx.fetchPage);
                    if (ledger.length) {
                        const applied = applyVerificationFixes(slides as any, ledger);
                        slides = applied.slides as T[];
                        const flagged = ledger.filter(r => r.verdict !== 'VERIFIED').length;
                        const unreachable = ledger.filter(r => r.verdict === 'UNREACHABLE').length;
                        envelopes.push(flagged === 0
                            ? ok('chain:provenance', { checked: ledger.length })
                            : refuse('chain:provenance', { checked: ledger.length }, `${flagged} claim(s) flagged, ${applied.fixed} relabeled, ${applied.stripped} stripped${unreachable ? `, ${unreachable} unreachable` : ''}`, { nextAction: 'continue' }));
                    } else {
                        envelopes.push(ok('chain:provenance', { checked: 0 }));
                    }
                    break;
                }
                case 'claims': {
                    const pool = (ctx.groundingChunks ?? readGroundingChunks()) as any[];
                    claimReport = await evaluateSlideClaims(slides, {
                        goalText: ctx.researchGoal || '',
                        chunks: pool.map(c => ({ id: String(c.id), text: String(c.text || ''), sources: c.sources, pageMeta: c.pageMeta })),
                        fetchPage: ctx.fetchPage,
                    });
                    if (claimReport.pass) {
                        envelopes.push(claimReport.warnings
                            ? partial('chain:claims', { rows: claimReport.rowsChecked, warnings: claimReport.warnings }, `${claimReport.warnings} claim warning(s)`, { nextAction: 'continue' })
                            : ok('chain:claims', { rows: claimReport.rowsChecked }));
                    } else {
                        repairs.push(buildClaimRepairInstruction(claimReport));
                        envelopes.push(refuse('chain:claims', { rows: claimReport.rowsChecked, blocking: claimReport.blocking },
                            `${claimReport.blocking} claim(s) fail scope-match: ${Array.from(new Set(claimReport.findings.filter(f => f.severity === 'block').map(f => f.code))).join(', ')}`,
                            { nextAction: 'narrow_scope', meta: { codes: claimReport.findings.map(f => f.code) } }));
                        for (const f of claimReport.findings.filter(x => x.severity === 'block').slice(0, 6)) console.warn(`[claims] ${f.slideId}.${f.field} ${f.code}: ${f.detail.slice(0, 120)}`);
                    }
                    break;
                }
                case 'evidenceSlots': {
                    // E1.1: the plan comes from ONE reader, so a run with no declared
                    // objective is recorded as unmeasured rather than fully covered.
                    const planRead = readObjectivePlan(ctx.subQuestions);
                    plan = buildArtifactPlan(slides, planRead.subQuestions, ctx.artifactType || 'slides');
                    slotReport = evaluateEvidenceSlots(slides, plan, {
                        subjectDomain: ctx.subjectDomain ?? null,
                        // DF-G4 needs text to infer the SOURCE's domain. Rather than
                        // refetch pages, derive it from what the provenance stage
                        // already resolved: the pointer path (which carries the
                        // source slug) plus the recorded source names for the slide
                        // that cites it. Zero extra network calls.
                        resolveSourceText: ctx.resolveSourceText || buildPointerTextResolver(slides, ledger),
                    });
                    if (slotReport.pass) {
                        envelopes.push(ok('chain:evidenceSlots', slotReport.planAbsent
                            ? { p0Coverage: slotReport.p0Coverage, planAbsent: true, note: planSummary(planRead) }
                            : { p0Coverage: slotReport.p0Coverage, plannedSubQuestions: slotReport.plannedSubQuestions }));
                    } else {
                        repairs.push(buildSlotNarrowingInstruction(slotReport));
                        envelopes.push(refuse('chain:evidenceSlots', { p0Coverage: slotReport.p0Coverage },
                            `${slotReport.violations.length} evidence violation(s)`, { meta: { violations: slotReport.violations.length } }));
                    }
                    break;
                }
                case 'exhibits': {
                    exhibitReport = evaluateExhibits(slides);
                    if (exhibitReport.pass) {
                        envelopes.push(ok('chain:exhibits', {
                            exhibits: exhibitReport.exhibitsChecked,
                            fitted: exhibitReport.fitted,
                        }));
                    } else {
                        repairs.push(buildExhibitInstruction(exhibitReport));
                        envelopes.push(refuse('chain:exhibits', {
                            exhibits: exhibitReport.exhibitsChecked,
                            fitted: exhibitReport.fitted,
                        }, `${exhibitReport.findings.length} exhibit finding(s): ${exhibitReport.findings.map(f => f.kind).join(', ')}`,
                            // A dangling reference is a claim about something the
                            // reader cannot see, so it narrows. A misfit exhibit is
                            // a layout choice and does not block the deck.
                            { nextAction: exhibitReport.findings.some(f => f.kind === 'dangling_reference') ? 'narrow_scope' : 'continue' }));
                    }
                    break;
                }
                case 'prose': {
                    const text = slides
                        .flatMap(s => enumerateTextFields(s).map(f => f.value))
                        .join(' ');
                    proseReport = analyzeProse(text);
                    if (proseReport.pass) {
                        envelopes.push(ok('chain:prose', { overall: Number(proseReport.overall.toFixed(2)) }));
                    } else {
                        repairs.push(buildProseRepairInstruction(proseReport));
                        envelopes.push(refuse('chain:prose', { overall: Number(proseReport.overall.toFixed(2)) },
                            `${proseReport.concerns.length} prose signal(s) below floor: ${proseReport.concerns.map(c => c.id).join(', ')}`,
                            { nextAction: 'continue' }));
                    }
                    break;
                }
                case 'grade': {
                    gradeReport = gradeArtifact(slides, { ledger, slotReport, proseReport });
                    if (gradeReport.pass && !gradeReport.rubricCritique.length) {
                        envelopes.push(ok('chain:grade', { claims: gradeReport.claims.length }));
                    } else {
                        const instr = buildGradeRepairInstruction(gradeReport);
                        if (instr) repairs.push(instr);
                        envelopes.push(refuse('chain:grade', { claims: gradeReport.claims.length },
                            gradeReport.summary, {
                                nextAction: gradeReport.pass ? 'continue' : 'narrow_scope',
                                meta: { rubricCritique: gradeReport.rubricCritique.length },
                            }));
                        for (const c of gradeReport.rubricCritique) console.warn(`[grade:rubric] ${c}`);
                    }
                    break;
                }
                case 'renderPlan': {
                    // DF-V: declared here so the order is fixed. The visual quota
                    // itself lives in deckPlanGate (plans/slides-strategic-visual-uplift).
                    const withVisual = slides.filter(s =>
                        /infographic|exhibit|diagram|chart|photo|cover/i.test(String(s.template || ''))
                        || !!(s.composerPayload && (s.composerPayload.backgroundImage || s.composerPayload.imageUrl))).length;
                    const ratio = slides.length ? withVisual / slides.length : 0;
                    envelopes.push(ok('chain:renderPlan', { visualRatio: Number(ratio.toFixed(2)), withVisual, total: slides.length }));
                    break;
                }
                case 'deckQuality': {
                    const slug = ctx.engagementSlug || '';
                    deckQualityReport = evaluateDeckQuality(slides, { previousSequence: previousDeckSequence(slug) });
                    if (deckQualityReport.pass) {
                        envelopes.push(ok('chain:deckQuality', {
                            distinctArchetypes: deckQualityReport.distinctArchetypes,
                            contentRatio: deckQualityReport.contentRatio,
                        }));
                    } else {
                        repairs.push(buildDeckQualityInstruction(deckQualityReport));
                        envelopes.push(refuse('chain:deckQuality', {
                            distinctArchetypes: deckQualityReport.distinctArchetypes,
                            contentRatio: deckQualityReport.contentRatio,
                        }, `${deckQualityReport.findings.length} layout finding(s): ${deckQualityReport.findings.map(f => f.kind).join(', ')}`,
                            { nextAction: 'continue' }));
                    }
                    // Remember the shape so the NEXT deck can be compared to it.
                    noteDeckSequence(slug, deckQualityReport.sequence);
                    break;
                }
            }
        } catch (e: any) {
            envelopes.push(fail(`chain:${stageId}`, e));
        }
    }

    const trace = envelopes.map(envelopeTrace);
    const pass = !envelopes.some(e => e.status === 'error' || (e.status === 'partial' && e.nextAction === 'narrow_scope'));
    return {
        slides, envelopes, ledger, slotReport, proseReport, gradeReport, deckQualityReport, exhibitReport, bindReport, plan,
        slopFindings, titleReport, claimReport,
        repairInstruction: repairs.filter(Boolean).join('\n\n'),
        trace, pass,
    };
}
