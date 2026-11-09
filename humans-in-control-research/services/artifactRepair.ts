/**
 * ARTIFACT REPAIR - making the gates act instead of advise
 * (plans/deerflow-harness-transfer-2026-08-20.md, the "still open" list)
 *
 * The 2026-08-20 live test proved the chain FINDS real defects: a real Opus deck
 * asserted five factual claims, bound no manifest pointer to any of them, and
 * `chain:evidenceSlots` refused it with `nextAction: narrow_scope`. Nothing
 * consumed that refusal, so the deck shipped anyway with a warning in the
 * console. A gate that cannot change the artifact is a logging statement.
 *
 * This module closes the loop. Three rules make it safe:
 *
 *  1. IT NARROWS, IT NEVER SOURCES. The repair may delete or weaken an
 *     unsupported assertion; it may NEVER add a citation, a pointer, a source
 *     name or a number. Asking a model to "fix" a missing citation is asking it
 *     to fabricate one, which is the exact incident the provenance lock exists
 *     to prevent.
 *  2. IT IS BOUNDED BY THE PROGRESS GUARD. Rounds stop on no-progress (a round
 *     that changes nothing, or returns what the previous round returned), not
 *     just on a ceiling. deer-flow's ToolProgressMiddleware is the model here.
 *  3. IT RIDES THE WS-4 EDIT CONTRACT. Every change goes through
 *     `applyTextEdits`, so `_textHistory` records it and per-slide Undo still
 *     works, and `mergeEditPreservingCitations` keeps existing pointers attached.
 *     Locked slides are skipped, matching standing lock semantics.
 */

import { enumerateTextFields, applyTextEdits, mergeEditPreservingCitations, stripCitationArtifacts, scrubRewrite, type TextEdit } from './slideTextEditing';
import { callAIWithRetry } from './aiRetryClient';
import { DEFAULT_MODELS } from './aiRouter';
import { noteAttempt, noteResult, resetProgress } from './progressGuard';
import { runArtifactChain, type ChainContext, type ChainResult } from './artifactChain';
import { readGroundingChunks } from './pointerBinder';
import type { SlotViolation } from './evidenceSlots';
import type { GradeReport } from './outputGrader';
import type { ProseReport } from './proseSignal';
import type { SlopSite } from './slopDetector';
import type { ClaimStageReport } from './claimStage';
import { pickTitleCandidate, TITLE_MAX_CHARS, type TitleReport } from './titleGate';
import { ok, partial, type StepEnvelope, type StopReason } from './stepEnvelope';

const MAX_ROUNDS = 2;

type RepairableSlide = {
    id: string; template: string; title: string;
    _locked?: boolean; _textHistory?: any[]; composerPayload?: any;
};

/**
 * What the model may and may not do. Stated as prohibitions because the failure
 * mode of a repair pass is enthusiasm: given "this claim is unsupported", a
 * model's first instinct is to add a source.
 */
const REPAIR_SYSTEM = [
    'You repair ONE consulting slide whose text failed an evidence check. Return ONLY a JSON object mapping each field path you changed to its corrected text. Omit every field you did not change.',
    '',
    'WHAT YOU MUST DO: narrow the claim to what the text itself can support. Replace a quantity, a causal assertion, an absolute or a comparison that has no evidence behind it with the qualitative pattern it was standing in for. Name the actor (a team, a system, a role) instead of an abstract noun.',
    '',
    'EVIDENCE IN HAND: when the message carries an EVIDENCE AVAILABLE block, those passages are the verbatim corpus text behind the slide\'s manifest pointers. A claim that one of those passages supports is KEPT, narrowed only to what the passage states, with that passage\'s pointer attached inside the same field if it is not already there. Narrow a claim to the qualitative pattern only when no listed passage supports it.',
    '',
    'WHAT YOU MUST NEVER DO:',
    '- NEVER add a citation, a source name, a publication, a study, a report title, an author or a manifest pointer that is NOT in the EVIDENCE AVAILABLE block. Outside that block you have no evidence in front of you, so any source you write would be fabricated.',
    '- NEVER add a number, percentage, currency amount or ratio that is not already in the field.',
    '- NEVER keep an unsupported number by hedging it ("roughly", "approximately", "up to"). Remove it.',
    '- NEVER write a note about missing evidence. No "data unavailable", no annotation, no bracketed caveat. The reader must never see the awareness of a gap.',
    '- NEVER delete a manifest pointer, a source label or a verbatim quote that is already present and correct.',
    '',
    // 2026-10-30 (WS-3 P7): em-dash and emoji are enforced by the chain's lexical stage, not restated here.
    'STYLE: plain business language, one idea per sentence, no markdown, no buzzwords. A short honest sentence beats a padded one.',
    '',
    `TITLES: when a finding names the title, ALSO return a key "_titleCandidates" holding THREE distinct alternative titles. Each is one literal sentence under ${TITLE_MAX_CHARS} characters with a finite verb, naming the actor or system, with no figure of speech and no number. The caller picks the one that passes its checks.`,
].join('\n');

/**
 * 2026-10-01 (Stage 2.1): every finding family the chain produces, in one bag, so the
 * per-slide instruction and the `needsWork` test read the SAME set. Before this the
 * repairer only knew about evidence violations and grader findings; slop and prose
 * instructions were built by the chain and discarded here.
 */
interface Findings {
    violations: SlotViolation[];
    grade: GradeReport | null;
    slop: SlopSite[];
    titles: TitleReport | null;
    prose: ProseReport | null;
    claims: ClaimStageReport | null;
}

function findingsOf(chain: ChainResult<any>): Findings {
    return {
        violations: chain.slotReport?.violations || [],
        grade: chain.gradeReport,
        slop: chain.slopFindings || [],
        titles: chain.titleReport,
        prose: chain.proseReport && !chain.proseReport.pass ? chain.proseReport : null,
        claims: chain.claimReport && !chain.claimReport.pass ? chain.claimReport : null,
    };
}

/** Which slide fields carry a prose offender: concerns are deck-level, edits are per field. */
function proseLinesFor(slide: RepairableSlide, prose: ProseReport | null): string[] {
    if (!prose) return [];
    const lines: string[] = [];
    let fields: Array<{ path: string; value: string }> = [];
    try { fields = enumerateTextFields(slide).map((f: any) => ({ path: f.path, value: String(f.value || '') })); } catch { return []; }
    for (const c of prose.concerns) {
        for (const offender of c.offenders || []) {
            const needle = String(offender || '').trim().slice(0, 80);
            if (needle.length < 12) continue;
            const hit = fields.find(f => f.value.includes(needle));
            if (hit) lines.push(`- Field ${hit.path} fails the ${c.label} check: "${needle}". ${c.detail}`);
        }
    }
    return lines;
}

function countFindings(f: Findings): Record<string, number> {
    return {
        evidence: f.violations.length,
        superficial: f.grade?.superficial.length || 0,
        nonFactual: (f.grade?.claims || []).filter(c => c.type !== 'factual').length,
        slop: f.slop.length,
        titles: f.titles ? f.titles.findings.filter(t => t.failing).length : 0,
        prose: f.prose ? f.prose.concerns.length : 0,
        claims: f.claims ? f.claims.blocking : 0,
    };
}

/** Per-slide instruction assembled from every finding that names that slide. */
function slideInstruction(f: Findings, slide: RepairableSlide): string {
    const { violations, grade, slop, titles } = f;
    const slideId = slide.id;
    const lines: string[] = [];
    for (const site of slop.filter(x => x.slideId === slideId)) {
        lines.push(`- Field ${site.field} uses banned wording "${site.phrase}" in: "${site.sentence.slice(0, 160)}". Rewrite the sentence in plain language with the same claim; do not delete it.`);
    }
    for (const t of (titles?.findings || []).filter(x => x.slideId === slideId && x.failing)) {
        lines.push(`- Field title "${t.title.slice(0, 120)}" fails the Partner Test: ${t.detail}. Rewrite it as one short literal sentence with a finite verb and no number.`);
    }
    lines.push(...proseLinesFor(slide, f.prose));
    for (const c of (f.claims?.findings || []).filter(x => x.slideId === slideId && x.severity === 'block')) {
        lines.push(`- Field ${c.field} fails the claim ledger [${c.code}]: "${c.sentence.slice(0, 140)}". ${c.detail} Say only what the cited passage supports; keep the citation.`);
    }
    for (const v of violations.filter(x => x.sectionId === slideId)) {
        if (v.kind === 'unsupported_p0') {
            lines.push(`- Field ${v.field} asserts something the corpus does not support: "${v.claim.slice(0, 160)}". Narrow it.`);
        } else {
            lines.push(`- ${v.detail} Name that domain explicitly in the text as an analog, or drop the comparison.`);
        }
    }
    for (const s of (grade?.superficial || []).filter(x => x.slideId === slideId)) {
        lines.push(`- Field ${s.field} reads as sourced but is not: ${s.detail}. Say only what the cited passage supports. Keep the pointer where it is.`);
    }
    for (const c of (grade?.claims || []).filter(x => x.slideId === slideId && x.type !== 'factual')) {
        lines.push(`- Field ${c.field} is ${c.type === 'process' ? 'about the research process rather than the subject' : 'a self-assessment'}: "${c.text.slice(0, 120)}". Replace it with subject-matter content or remove it.`);
    }
    return lines.join('\n');
}

/**
 * WS-4 L4 (2026-10-30): the verbatim passages behind the slide's pointers, so the repair model narrows to what the
 * evidence says instead of narrowing the claim away. Pointers come from the slide's own fields; the passages from the
 * grounding chunks the chain bound against (`ctx.groundingChunks`, else the run's recorded pool).
 */
export function evidenceBlockFor(slide: RepairableSlide, pool: Array<{ id: string; text: string; sourceNames?: string[] }>): string {
    if (!pool.length) return '';
    let fields: Array<{ value: string }> = [];
    try { fields = enumerateTextFields(slide).map((f: any) => ({ value: String(f.value || '') })); } catch { return ''; }
    const pointers = new Set<string>();
    for (const f of fields) for (const p of (f.value.match(/[\w./\\-]+\.md#c\d+/gi) || [])) pointers.add(p.replace(/\\/g, '/'));
    if (!pointers.size) return '';
    const byId = new Map(pool.map(c => [String(c.id).replace(/\\/g, '/'), c]));
    const lines: string[] = [];
    for (const p of pointers) {
        const c = byId.get(p);
        if (!c || !c.text) continue;
        const who = (c.sourceNames || []).filter(Boolean).slice(0, 2).join('; ');
        lines.push(`[${p}]${who ? ` (${who})` : ''}: "${String(c.text).replace(/\s+/g, ' ').trim().slice(0, 600)}"`);
        if (lines.length >= 8) break;
    }
    return lines.length ? ['EVIDENCE AVAILABLE (verbatim corpus passages behind this slide\'s pointers):', ...lines].join('\n') : '';
}

async function repairSlide<T extends RepairableSlide>(slide: T, instruction: string, evidence = ''): Promise<TextEdit[]> {
    const fields = enumerateTextFields(slide);
    if (!fields.length || !instruction) return [];
    const user = [
        `Slide template: ${slide.template}`,
        '',
        'Findings to fix:',
        instruction,
        '',
        ...(evidence ? [evidence, ''] : []),
        'Fields (path -> current text). The bracketed .md#cN markers are manifest pointers: keep them exactly where they are.',
        JSON.stringify(Object.fromEntries(fields.map(f => [f.path, f.value])), null, 1),
    ].join('\n');

    const parsed = await callAIWithRetry('gemini', {
        model: DEFAULT_MODELS.fast_generation,
        systemInstruction: { parts: [{ text: REPAIR_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        // temperature 0: a repair is an identity-class edit, so the same defect
        // must produce the same correction. thinkingBudget 0 for the same reason
        // the suggestion path needs it: thinking tokens count against the output
        // ceiling and truncate the JSON (the 2026-08-17 live failure).
        config: { temperature: 0, maxOutputTokens: 3000, responseMimeType: 'application/json', thinkingBudget: 0 },
    }, { label: 'Artifact repair', maxAttempts: 2, requestTimeoutMs: 60_000 });

    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let map: Record<string, unknown> | null = null;
    try {
        map = JSON.parse(text);
    } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) { try { map = JSON.parse(m[0]); } catch { map = null; } }
    }
    if (!map || typeof map !== 'object') return [];

    const byPath = new Map(fields.map(f => [f.path, f.value]));
    const edits: TextEdit[] = [];
    // R-M2: verbalized sampling for titles. The model proposes three; the title gate
    // picks the first that passes, so the selection is the gate's, not the model's.
    const picked = pickTitleCandidate((map as any)._titleCandidates, slide.template);
    if (picked && byPath.has('title') && picked !== byPath.get('title')) {
        edits.push({ path: 'title', value: mergeEditPreservingCitations(byPath.get('title') || '', stripCitationArtifacts(scrubRewrite(picked))) });
    }
    for (const [path, raw] of Object.entries(map)) {
        if (typeof raw !== 'string') continue;
        if (path === 'title' && picked) continue;                 // the gate's pick wins
        if (path.startsWith('_')) continue;
        // A VERBATIM QUOTE is never rewritten (2026-10-05 live #themes: the repair turned corpus quotes into paraphrases
        // that still sat in quotation marks). Quote fields are kept or dropped by the citation gates, never reworded.
        if (/quote|verbatim/i.test(path) || /(?:^|\.)evidence(?:$|\[|\.(?:text|quote))/i.test(path)) continue;
        const original = byPath.get(path);
        if (original === undefined) continue;                     // hallucinated path
        // Provenance is the system's, not the model's. STRIP every pointer and
        // resolved-source suffix the model wrote (mergeEditPreservingCitations
        // would otherwise honor an invented one, because its contract is "keep
        // the edit's markers when the edit has markers"), THEN re-attach exactly
        // what the stored field carried.
        const cleaned = stripCitationArtifacts(scrubRewrite(raw));
        if (cleaned.length < 2) continue;
        const merged = mergeEditPreservingCitations(original, cleaned);
        if (merged !== original) edits.push({ path, value: merged });
    }
    return edits;
}

export interface RepairRound {
    round: number;
    slidesTouched: number;
    fieldsEdited: number;
    skippedLocked: number;
    failed: number;
    /** Chain verdict AFTER this round. */
    pass: boolean;
    violations: number;
}

/**
 * R-M1 (2026-10-01): the reinforcement-inference record. Per finding family, how many
 * the chain found before repair and how many survived, so the self-improvement loop
 * can learn which instruction families the repairer actually resolves.
 */
export interface RepairRiRecord {
    before: Record<string, number>;
    after: Record<string, number>;
    resolved: number;
    survived: number;
    /** True when the final chain verdict improved on the initial one. */
    improved: boolean;
}

export interface RepairResult<T> {
    slides: T[];
    rounds: RepairRound[];
    /** The chain result after the final round. */
    finalChain: ChainResult<T>;
    envelope: StepEnvelope<{ rounds: number; fieldsEdited: number }>;
    stopReason?: StopReason;
    ri: RepairRiRecord;
}

function riRecord(initial: ChainResult<any>, final: ChainResult<any>): RepairRiRecord {
    const before = countFindings(findingsOf(initial));
    const after = countFindings(findingsOf(final));
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    return { before, after, resolved: Math.max(0, sum(before) - sum(after)), survived: sum(after), improved: sum(after) < sum(before) };
}

/**
 * Repair, re-check, repeat. Returns the best artifact it reached plus an honest
 * record of what it could not fix: an unsupported claim the model refuses to
 * narrow stays visible in the final chain result rather than being declared
 * clean.
 */
/** The fields that carry the deck's governing thesis: the cover title and the thesis interstitial's statement. */
export function isThesisField(slide: { template?: string }, path: string): boolean {
    const t = String(slide?.template || '').replace(/^slides:/, '');
    // the agenda names the deck's own sections; it carries no claim to narrow (2026-10-26 live: the repair turned
    // "One hub for students, staff and employers" into "Overview of planning steps")
    if (t === 'agenda') return true;
    if (t === 'cover') return path === 'title';
    if (t === 'thesis-interstitial') return path === 'title' || path === 'statement' || path === 'thesis';
    return false;
}

export async function repairArtifact<T extends RepairableSlide>(
    slides: T[],
    chain: ChainResult<T>,
    ctx: ChainContext,
): Promise<RepairResult<T>> {
    const runId = `${ctx.runId}:repair`;
    resetProgress(runId);
    // WS-4 L4: the passages the chain bound against ride into every repair call
    const _pool = (ctx.groundingChunks ?? readGroundingChunks()) as Array<{ id: string; text: string; sourceNames?: string[] }>;

    let current = slides;
    let latest = chain;
    const rounds: RepairRound[] = [];
    let totalFields = 0;
    let stopReason: StopReason | undefined;

    for (let round = 1; round <= MAX_ROUNDS; round++) {
        const f = findingsOf(latest);
        const violations = f.violations;
        const counts = countFindings(f);
        const needsWork = Object.values(counts).some(n => n > 0);
        if (!needsWork) break;

        // Call-pattern guard: the same finding set twice means the model is not
        // moving, so stop paying for another identical round.
        const signature = JSON.stringify([
            violations.map(v => `${v.sectionId}:${v.field}:${v.kind}`).sort(),
            (f.grade?.superficial || []).map(s => `${s.slideId}:${s.field}`).sort(),
            f.slop.map(s => `${s.slideId}:${s.field}:${s.phrase}`).sort(),
            (f.titles?.findings || []).filter(t => t.failing).map(t => `${t.slideId}:${t.kinds.join('+')}`).sort(),
            f.prose ? f.prose.concerns.map(c => c.id).sort() : [],
            (f.claims?.findings || []).filter(x => x.severity === 'block').map(x => `${x.slideId}:${x.field}:${x.code}`).sort(),
        ]);
        const attempt = noteAttempt(runId, 'repair', signature);
        if (attempt.blocked) { stopReason = attempt.stopReason; break; }

        const targets = current.filter(s => {
            if (s._locked) return false;
            return !!slideInstruction(f, s);
        });
        const skippedLocked = current.filter(s => s._locked && slideInstruction(f, s)).length;

        let failed = 0;
        let fieldsEdited = 0;
        const edited = new Map<string, T>();
        // Sequential: repair rounds are small (a handful of slides) and a serial
        // loop keeps the provider from rate-limiting a deck-wide burst.
        for (const slide of targets) {
            try {
                // 2026-10-26 (live: the owner's thesis "First-year co-op readiness needs one guided hub" was flagged
                // unsupported and narrowed to "Co-op preparation benefits from coordinated advisor tools"): the deck's
                // thesis is an EDITORIAL JUDGMENT the user asked for, not a factual claim, so it is never narrowed here.
                const edits = (await repairSlide(slide, slideInstruction(f, slide), evidenceBlockFor(slide, _pool))).filter(e => !isThesisField(slide, e.path));
                if (edits.length) {
                    edited.set(slide.id, applyTextEdits(slide, edits) as T);
                    fieldsEdited += edits.length;
                }
            } catch (e: any) {
                failed++;
                console.warn(`[artifact-repair] slide ${slide.id} failed:`, e?.message || e);
            }
        }

        if (!edited.size) {
            // Nothing changed: record the stall and stop rather than re-checking
            // an identical artifact.
            noteResult(runId, 'repair', { ok: true, emptyResult: true });
            rounds.push({ round, slidesTouched: 0, fieldsEdited: 0, skippedLocked, failed, pass: latest.pass, violations: violations.length });
            stopReason = 'no_progress';
            break;
        }

        current = current.map(s => edited.get(s.id) || s);
        totalFields += fieldsEdited;

        // Re-check the repaired artifact through the SAME chain, so the verdict
        // is produced by the gate rather than by the repairer's opinion of itself.
        latest = await runArtifactChain(current, ctx);
        const after = latest.slotReport?.violations.length ?? 0;
        rounds.push({ round, slidesTouched: edited.size, fieldsEdited, skippedLocked, failed, pass: latest.pass, violations: after });

        const afterCounts = countFindings(findingsOf(latest));
        const decision = noteResult(runId, 'repair', {
            ok: true,
            output: JSON.stringify([latest.slotReport?.violations || [], afterCounts]),
            // no finding of ANY family resolved
            emptyResult: Object.values(afterCounts).reduce((a, b) => a + b, 0) >= Object.values(counts).reduce((a, b) => a + b, 0),
        });
        if (decision.blocked) { stopReason = decision.stopReason; break; }
    }

    const resolvedAll = latest.pass;
    const envelope = resolvedAll
        ? ok<{ rounds: number; fieldsEdited: number }>(`repair:${ctx.runId}`, { rounds: rounds.length, fieldsEdited: totalFields })
        : partial(`repair:${ctx.runId}`, { rounds: rounds.length, fieldsEdited: totalFields },
            `${latest.slotReport?.violations.length ?? 0} finding(s) survived repair`,
            { nextAction: 'narrow_scope', stopReason });

    return { slides: current, rounds, finalChain: latest, envelope, stopReason, ri: riRecord(chain, latest) };
}
