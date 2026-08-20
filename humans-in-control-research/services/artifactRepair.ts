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
import type { SlotViolation } from './evidenceSlots';
import type { GradeReport } from './outputGrader';
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
    'WHAT YOU MUST NEVER DO:',
    '- NEVER add a citation, a source name, a publication, a study, a report title, an author or a manifest pointer. You have no evidence in front of you, so any source you write would be fabricated.',
    '- NEVER add a number, percentage, currency amount or ratio that is not already in the field.',
    '- NEVER keep an unsupported number by hedging it ("roughly", "approximately", "up to"). Remove it.',
    '- NEVER write a note about missing evidence. No "data unavailable", no annotation, no bracketed caveat. The reader must never see the awareness of a gap.',
    '- NEVER delete a manifest pointer, a source label or a verbatim quote that is already present and correct.',
    '',
    'STYLE: plain business language, one idea per sentence, no em-dash, no emoji, no markdown, no buzzwords. A short honest sentence beats a padded one.',
].join('\n');

/** Per-slide instruction assembled from the violations that name that slide. */
function slideInstruction(violations: SlotViolation[], grade: GradeReport | null, slideId: string): string {
    const lines: string[] = [];
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

async function repairSlide<T extends RepairableSlide>(slide: T, instruction: string): Promise<TextEdit[]> {
    const fields = enumerateTextFields(slide);
    if (!fields.length || !instruction) return [];
    const user = [
        `Slide template: ${slide.template}`,
        '',
        'Findings to fix:',
        instruction,
        '',
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
    for (const [path, raw] of Object.entries(map)) {
        if (typeof raw !== 'string') continue;
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

export interface RepairResult<T> {
    slides: T[];
    rounds: RepairRound[];
    /** The chain result after the final round. */
    finalChain: ChainResult<T>;
    envelope: StepEnvelope<{ rounds: number; fieldsEdited: number }>;
    stopReason?: StopReason;
}

/**
 * Repair, re-check, repeat. Returns the best artifact it reached plus an honest
 * record of what it could not fix: an unsupported claim the model refuses to
 * narrow stays visible in the final chain result rather than being declared
 * clean.
 */
export async function repairArtifact<T extends RepairableSlide>(
    slides: T[],
    chain: ChainResult<T>,
    ctx: ChainContext,
): Promise<RepairResult<T>> {
    const runId = `${ctx.runId}:repair`;
    resetProgress(runId);

    let current = slides;
    let latest = chain;
    const rounds: RepairRound[] = [];
    let totalFields = 0;
    let stopReason: StopReason | undefined;

    for (let round = 1; round <= MAX_ROUNDS; round++) {
        const violations = latest.slotReport?.violations || [];
        const grade = latest.gradeReport;
        const needsWork = violations.length > 0
            || (grade?.superficial.length || 0) > 0
            || (grade?.claims || []).some(c => c.type !== 'factual');
        if (!needsWork) break;

        // Call-pattern guard: the same finding set twice means the model is not
        // moving, so stop paying for another identical round.
        const signature = JSON.stringify([
            violations.map(v => `${v.sectionId}:${v.field}:${v.kind}`).sort(),
            (grade?.superficial || []).map(s => `${s.slideId}:${s.field}`).sort(),
        ]);
        const attempt = noteAttempt(runId, 'repair', signature);
        if (attempt.blocked) { stopReason = attempt.stopReason; break; }

        const targets = current.filter(s => {
            if (s._locked) return false;
            return !!slideInstruction(violations, grade, s.id);
        });
        const skippedLocked = current.filter(s => s._locked && slideInstruction(violations, grade, s.id)).length;

        let failed = 0;
        let fieldsEdited = 0;
        const edited = new Map<string, T>();
        // Sequential: repair rounds are small (a handful of slides) and a serial
        // loop keeps the provider from rate-limiting a deck-wide burst.
        for (const slide of targets) {
            try {
                const edits = await repairSlide(slide, slideInstruction(violations, grade, slide.id));
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

        const decision = noteResult(runId, 'repair', {
            ok: true,
            output: JSON.stringify(latest.slotReport?.violations || []),
            emptyResult: after === violations.length,   // no violations resolved
        });
        if (decision.blocked) { stopReason = decision.stopReason; break; }
    }

    const resolvedAll = latest.pass;
    const envelope = resolvedAll
        ? ok<{ rounds: number; fieldsEdited: number }>(`repair:${ctx.runId}`, { rounds: rounds.length, fieldsEdited: totalFields })
        : partial(`repair:${ctx.runId}`, { rounds: rounds.length, fieldsEdited: totalFields },
            `${latest.slotReport?.violations.length ?? 0} finding(s) survived repair`,
            { nextAction: 'narrow_scope', stopReason });

    return { slides: current, rounds, finalChain: latest, envelope, stopReason };
}
