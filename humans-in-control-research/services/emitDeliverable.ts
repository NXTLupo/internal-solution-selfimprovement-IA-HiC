/**
 * emitDeliverable.ts - Emission Wrapper (C2 of the 2026-06-06 architecture build).
 *
 * Every hashtag-driven deliverable emission in HiC should flow through this
 * wrapper so the self-improvement substrate gets a signal from EVERY
 * deliverable, not just the geminiService-generated ones. Today the gap is:
 *
 *   - traceRecorder.recordTurn() is called from geminiService.ts only.
 *   - qualityFrontier.scoreOutput() is called from goldenSetRunner.ts +
 *     wikiService.ts only.
 *   - CorpusChatPanel hashtag paths (#themes, #recommendations, #journey,
 *     #brief, #report, etc.) emit deliverables WITHOUT touching either.
 *
 * Result: the epoch-proposer skill reads sessions/<slug>/traces/ and sees a
 * vastly incomplete picture of what the platform actually produced.
 *
 * This wrapper closes the gap by adding ONE await around every emission:
 *
 *   const out = await emitDeliverable({
 *     deliverable: '#recommendations',
 *     step_label: 'recommendations',
 *     model_id: 'gemini-3.1-pro-preview',
 *     prompt: ultraPrompt,
 *     started_at: t0,
 *     emit: async () => callWithModelChain({...}),  // the existing generation
 *     extractText: (raw) => raw.text || raw,
 *     scoreInput: (text, raw) => ({
 *       text,
 *       slideTitles: collectTitles(raw),
 *       citations: collectCitations(raw),
 *     }),
 *   });
 *
 * What the wrapper does, in order:
 *   1. Calls opts.emit() - the existing generation function, unchanged.
 *   2. Extracts the text output via opts.extractText.
 *   3. Records a trace turn via traceRecorder.recordTurn - engagement slug
 *      is auto-detected from window.__hicCurrentEngagementSlug.
 *   4. Scores the output via qualityFrontier.scoreOutput - frontier_dims
 *      subset for this deliverable is read from .claude/ARCHITECTURE.md.
 *   5. If the chain-walker advanced past head, the commitment cache is
 *      already updated by deliverableModelRouter; we don't re-do it here.
 *   6. Returns the original emit() result UNCHANGED. The wrapper is purely
 *      additive observability - it never mutates or filters output.
 *
 * Composition with existing layers:
 *   - traceRecorder (M1) - disk-persisted ring; epoch proposer reads it.
 *   - qualityFrontier (M2) - Pareto vector; the candidate-vs-baseline gate.
 *   - engagementCommitment (drift-catcher C1) - provider stickiness, handled
 *     inside deliverableModelRouter; the wrapper doesn't touch it.
 *   - Hook Bus (C1 of this build) - runs at Stop; catches violations
 *     post-emission. Wrapper feeds the trace; Hook Bus reads the same
 *     transcript and dispatches per-deliverable validators.
 *
 * Failure mode: the wrapper NEVER blocks the user. If recordTurn or
 * scoreOutput throws, the wrapper logs and re-throws ONLY the emit() error.
 * The trace/score signals are best-effort observability, not load-bearing.
 */

import { recordTurn, type RecordTurnOpts } from './traceRecorder';
import { engagementSlug, planSubQuestions, runSummary } from './runState';
import { evaluatePareto, type EvaluatePareto, type QualityVector } from './qualityFrontier';
import { persistInsightAsChunk } from './chunkRetrieval';
import type { EvidencePointer } from './evidenceLedgerService';

export interface EmitDeliverableOpts<T> {
    /** Hashtag id, e.g. '#recommendations' - used for trace tagging + ARCH lookup. */
    deliverable: string;
    /** Stable label for the trace ring (e.g. 'Recommendations', 'Themes Pass-1'). */
    step_label: string;
    /** Model id used (the FINAL model after any fallbacks; the chain-walker
     *  surfaces this back via raw.modelUsed for the recommendations path). */
    model_id: string;
    /** The composed prompt sent to the model - stored verbatim in the trace. */
    prompt: string;
    /** UTC ms when generation started (capture BEFORE opts.emit()). */
    started_at: number;
    /** Optional temperature / seed for trace reproducibility metadata. */
    temperature?: number;
    seed?: number;
    /** Optional caller note appended to the trace (e.g. 'pre-mortem-pass'). */
    note?: string;

    /** THE generation call. Whatever this returns is returned to the caller
     *  UNCHANGED. The wrapper only observes; it never mutates. */
    emit: () => Promise<T>;

    /** Pull text out of opts.emit()'s return so traceRecorder + scoreOutput
     *  see the actual model response. Most callers: `(r) => r.text || r.raw?.text || ''`. */
    extractText: (result: T) => string;

    /** OPTIONAL: build a ScoreOutputInput from the result + extracted text.
     *  When omitted, scoreOutput is skipped (trace still fires). When provided,
     *  the wrapper passes it to qualityFrontier.evaluatePareto. */
    buildScoreInput?: (text: string, result: T) => Partial<EvaluatePareto>;

    /** 2026-06-06 - Fix 2: optional Verbalized Sampling pre-pass. When
     *  provided, the wrapper logs that VS was applied (the actual k-pass
     *  candidate generation must happen inside opts.emit; this flag records
     *  it in the trace + qualityFrontier dim `vs_diversity_score`).
     *  Activates the universal VS coverage gap across 16/22 deliverables
     *  identified in the 2026-06-06 architecture audit. */
    vs?: {
        /** Number of candidates the inner emit generated. */
        k: number;
        /** Frame names (e.g., ['defensible_consensus', 'non_obvious_bet']). */
        frames?: string[];
        /** Diversity score 0-1; the auditor's verdict reads this. */
        diversity_score?: number;
    };

    /** 2026-06-06 - Fix 2: optional Reinforcement Inference post-pass. When
     *  provided, the wrapper records that an uncertainty-triggered second pass
     *  was applied. Activates the universal RI coverage gap across 20/22
     *  deliverables. */
    ri?: {
        /** True if the uncertainty threshold tripped and a second pass fired. */
        fired: boolean;
        /** Uncertainty value computed before the trigger decision. */
        uncertainty?: number;
        /** Threshold the trigger was checking against. */
        threshold?: number;
        /** R-M4 (2026-10-01): the repair record (RepairResult.ri) when the artifact chain
         *  re-asked. Per-family finding counts before and after, resolved, survived. Mirrored
         *  onto AIR qualityReport.ri so goldenSetRunner measures the fire rate from records. */
        before?: Record<string, number>;
        after?: Record<string, number>;
        resolved?: number;
        survived?: number;
    };

    /** R-M4 (2026-10-01): verbalized-sampling candidates the gate chose among (titles, theses,
     *  theme names). Mirrored onto AIR qualityReport.vsCandidates; the golden-set runner reads
     *  the distinct ratio as vs_candidate_spread. */
    vsCandidates?: string[];

    /** 2026-06-06 - INSIGHT-AS-CHUNK persistence. When provided, the wrapper
     *  iterates the emitted items after persistence and writes each as its
     *  own wiki page via persistInsightAsChunk. This closes the second-brain
     *  feedback loop the user demanded: generated insights become first-class
     *  manifest chunks future runs can cite by pointer.
     *
     *  The selector picks the per-item insight records from the result. Each
     *  record must yield an insightId (stable), text (the body to persist),
     *  and sourceChunks (the chunk pointers the model cited). The wrapper
     *  handles the engagement slug (from the global) + model id + repro hash
     *  threading. */
    insightPersist?: {
        kind: string;                                              // e.g. 'theme', 'persona', 'recommendation'
        selectItems: (result: T) => Array<{
            insightId: string;
            text: string;
            sourceChunks: string[];
            title?: string;
        }>;
        reproducibilityHash?: string;
        researchGoal?: string;
    };

    /** WS-0/Stage-3 (2026-06-30) - AIR EMISSION. When provided, the wrapper builds an ArtifactAIR from the
     *  emitted result + the objective, validates it against the contract in SHADOW mode (logs violations,
     *  never blocks), and persists it via the proxy (fire-and-forget). This makes emitDeliverable the single
     *  chokepoint where every artifact becomes AIR - the plan's ramped shadow->blocking migration starts here.
     *  Purely additive observability; a failure never affects the returned result. */
    air?: {
        trigger: string;                                     // the hashtag directive, e.g. '#strategy'
        objective: string;                                   // the research objective / goal
        runId?: string;                                      // defaults to the current engagement slug
        artifactId?: string;                                 // defaults to <deliverable>_<started_at>
        audience?: string;
        evidence?: EvidencePointer[];                        // optional pre-built ledger
        /** The manifest chunks that grounded this generation. When provided, the wrapper maps them to a
         *  REAL EvidencePointer ledger (buildEvidenceLedger) - preferred over a pre-built `evidence`. */
        resolvedChunks?: Array<{ id: string; sourcePath?: string; text?: string; sources?: Array<{ n: string; u: string }>; concepts?: string[]; relatedChunks?: string[]; retrievalScore?: number }>;
        buildPayload?: (result: T, text: string) => unknown; // defaults to the extracted text
        /** W2 (2026-07-01, scorecard "modelTrace 0/11"): the routing decision that selected this
         *  artifact's model (from aiRouter.chooseArtifactModel). Recorded as a ModelTraceStep so the AIR
         *  carries selectedModel + routingReason + quota state. When omitted, the wrapper still records a
         *  step from opts.model_id with a caller-selected reason - the trace is NEVER empty again. */
        routing?: { model?: string; reason?: string; alternatives?: string[]; quotaState?: 'healthy' | 'degraded' | 'exhausted' | 'unknown' };
        /** W3 (scorecard "decomposedQuestions 0/11"): the research plan's sub-questions. When omitted the
         *  wrapper falls back to window.__hicResearchPlanSubQuestions (set by App.tsx when a plan exists).
         *  Coverage per sub-question is computed deterministically against the grounding corpus + output. */
        subQuestions?: Array<{ id: string; question?: string; text?: string; priority?: string | number; expected_named_entities?: string[] }>;
        /** D12 per-path ramp: set true ONLY after this path has emitted a clean AIR on a live run. */
        blocking?: boolean;
        /** WS-C C1 (2026-10-31): this generation revises an earlier artifact (#refine, a depth delta turn). */
        revision?: import('./artifactLineage').RevisionRequest;
    };
}

export interface EmitDeliverableResult<T> {
    /** The opts.emit() return value, untouched. */
    result: T;
    /** True if the trace turn was recorded successfully. */
    traceRecorded: boolean;
    /** Pareto vector if scoring fired and succeeded. Null if buildScoreInput
     *  was omitted or scoring threw. */
    qualityVector: QualityVector | null;
    /** Wall-time of opts.emit() (NOT including wrapper overhead). */
    elapsed_ms: number;
}

/**
 * Run a deliverable emission and attach trace + score telemetry.
 * Returns the emit() result UNCHANGED plus observability metadata.
 */
export async function emitDeliverable<T>(opts: EmitDeliverableOpts<T>): Promise<EmitDeliverableResult<T>> {
    const t0 = opts.started_at;
    let result: T;
    let emitError: unknown = null;

    try {
        result = await opts.emit();
    } catch (e) {
        emitError = e;
        // Trace the FAILURE first so the epoch proposer can see what went
        // wrong, then re-throw so the caller's error handling is unchanged.
        try {
            recordTurn({
                step_label: opts.step_label,
                model_id: opts.model_id,
                prompt: opts.prompt,
                response: '',
                started_at: t0,
                temperature: opts.temperature,
                seed: opts.seed,
                note: opts.note,
                failed: true,
                error: (e as any)?.message || String(e),
            });
        } catch { /* never let telemetry break error propagation */ }
        throw e;
    }

    const elapsed_ms = Math.max(0, Date.now() - t0);

    // Extract text - gracefully on failure.
    let text = '';
    try {
        text = opts.extractText(result) || '';
    } catch (e: any) {
        console.warn(`[emitDeliverable/${opts.deliverable}] extractText failed:`, e?.message || e);
    }

    // Record the trace - failure here is silent.
    let traceRecorded = false;
    try {
        // 2026-06-06 - Fix 2: encode VS + RI metadata into the trace note so
        // the epoch proposer can grep traces by VS/RI application status.
        // e.g. note="deliverable=#themes | vs:k=8,frames=consensus,bets | ri:fired=true"
        const annotations: string[] = [`deliverable=${opts.deliverable}`];
        if (opts.vs) {
            const vsParts = [`k=${opts.vs.k}`];
            if (opts.vs.frames?.length) vsParts.push(`frames=${opts.vs.frames.join(',')}`);
            if (typeof opts.vs.diversity_score === 'number') vsParts.push(`diversity=${opts.vs.diversity_score.toFixed(2)}`);
            annotations.push(`vs:${vsParts.join(',')}`);
        }
        if (opts.ri) {
            const riParts = [`fired=${opts.ri.fired}`];
            if (typeof opts.ri.uncertainty === 'number') riParts.push(`uncertainty=${opts.ri.uncertainty.toFixed(2)}`);
            if (typeof opts.ri.threshold === 'number') riParts.push(`threshold=${opts.ri.threshold.toFixed(2)}`);
            annotations.push(`ri:${riParts.join(',')}`);
        }
        const combinedNote = opts.note
            ? `${opts.note} | ${annotations.join(' | ')}`
            : annotations.join(' | ');

        const traceOpts: RecordTurnOpts = {
            step_label: opts.step_label,
            // The model that SERVED the call (a fallback after a 504 is not the requested model; 2026-10-03 live).
            model_id: String((result as any)?.modelUsed || opts.model_id),
            prompt: opts.prompt,
            response: text,
            started_at: t0,
            temperature: opts.temperature,
            seed: opts.seed,
            note: combinedNote,
        };
        recordTurn(traceOpts);
        traceRecorded = true;
    } catch (e: any) {
        console.warn(`[emitDeliverable/${opts.deliverable}] recordTurn failed (non-fatal):`, e?.message || e);
    }

    // Score the output - failure here is silent.
    let qualityVector: QualityVector | null = null;
    if (opts.buildScoreInput) {
        try {
            const scoreInput = opts.buildScoreInput(text, result);
            const fullInput: EvaluatePareto = {
                text,
                elapsedMs: elapsed_ms,
                label: opts.deliverable,
                ...scoreInput,
            };
            qualityVector = evaluatePareto(fullInput);
        } catch (e: any) {
            console.warn(`[emitDeliverable/${opts.deliverable}] evaluatePareto failed (non-fatal):`, e?.message || e);
        }
    }

    // 2026-06-06 - C6 epoch outcome tracking. If an epoch is active and this
    // deliverable is the targeted class, score the outcome against the
    // baseline vector. The tracker writes outcome records to disk so the
    // epoch-proposer's next round can compute keep/rollback/human-review.
    // Failure is silent; the emission proceeds regardless.
    if (qualityVector) {
        try {
            const { scoreEpochOutcome, getActiveEpochId } = await import('./epochOutcomeTracker');
            if (getActiveEpochId() !== null) {
                void scoreEpochOutcome(opts.deliverable, qualityVector.dimensions as Record<string, number>)
                    .catch(() => { /* fire-and-forget */ });
            }
        } catch { /* tracker not loaded - no-op */ }
    }

    // WS-0/Stage-3 (2026-06-30) - AIR EMISSION. Build + validate (SHADOW) + persist an ArtifactAIR for this
    // deliverable. The single chokepoint through which every artifact becomes AIR; shadow-mode validation
    // logs contract violations without blocking (ramped shadow->blocking migration). Fire-and-forget.
    if (opts.air && !emitError) {
        try {
            const { buildAir, emitAirRecord } = await import('./artifactAirService');
            const runId = opts.air.runId
                || engagementSlug()
                || 'run';
            const artifactId = opts.air.artifactId || `${opts.deliverable.replace(/^#/, '')}_${t0}`;
            // W3 (2026-07-01, scorecard "decomposedQuestions 0/11"): hydrate the Objective Graph. Sub-questions
            // come from the caller or the research plan global (App.tsx sets it when the plan exists); coverage
            // per sub-question is computed deterministically (auditSubQuestionCoverage) against the corpus that
            // grounded THIS artifact plus its own output text - the objective-supremacy signal, per artifact.
            let decomposedQuestions: any[] = [];
            try {
                const rawSqs = opts.air.subQuestions
                    || planSubQuestions()
                    || [];
                if (Array.isArray(rawSqs) && rawSqs.length) {
                    const { auditSubQuestionCoverage } = await import('./researchPlanner');
                    const groundingText = [
                        ...(opts.air.resolvedChunks || []).map(c => c.text || ''),
                        text || '',
                    ].join('\n');
                    const audit = auditSubQuestionCoverage(groundingText, rawSqs as any);
                    const covById = new Map(audit.perQuestion.map(p => [p.id, p.status]));
                    const prioNum = (p: any): number => (typeof p === 'number' ? Math.min(5, Math.max(1, p))
                        : p === 'high' ? 1 : p === 'low' ? 5 : 3);
                    decomposedQuestions = rawSqs.slice(0, 12).map((sq: any, i: number) => ({
                        id: String(sq.id || `sq_${i + 1}`),
                        text: String(sq.question || sq.text || '').slice(0, 300),
                        priority: prioNum(sq.priority),
                        requiredEvidenceTypes: Array.isArray(sq.expected_evidence_types) ? sq.expected_evidence_types : undefined,
                        coverageStatus: covById.get(String(sq.id || `sq_${i + 1}`)) || 'uncovered',
                    })).filter((q: any) => q.text);
                }
            } catch (e: any) {
                console.warn(`[emitDeliverable/${opts.deliverable}] sub-question hydration failed (non-fatal):`, e?.message || e);
            }
            const objective = {
                objectiveId: `obj_${runId}`,
                userObjective: opts.air.objective || '',
                decomposedQuestions,
                audience: opts.air.audience,
            };
            const payload = opts.air.buildPayload ? opts.air.buildPayload(result, text) : text;
            let evidence = opts.air.evidence || [];
            // WS-J/D14: record the grounding read as a GOVERNED tool step (wiki_retrieval pack) so the AIR
            // carries a real toolTrace, giving the mcp_tool_governance gate live per-run data on this path too.
            const { newRunTrace, recordToolStep, recordModelStep } = await import('./runTraceService');
            const airTrace = newRunTrace(runId);
            // W2 (scorecard "modelTrace 0/11" + "Provider Tracing LOST"): ALWAYS record the model step.
            // The FINAL model wins over the requested one when the chain-walker surfaces it (result.modelUsed),
            // so a fallback (e.g. Opus -> Gemini) is recorded as what actually ran, with the routing reason.
            try {
                const finalModel = String((result as any)?.modelUsed || opts.air.routing?.model || opts.model_id || 'unknown');
                const requested = String(opts.air.routing?.model || opts.model_id || finalModel);
                const fellBack = finalModel !== requested;
                const provider: 'gemini' | 'anthropic' | 'openai' =
                    finalModel.startsWith('claude-') ? 'anthropic'
                        : (finalModel.startsWith('gpt-') || finalModel.startsWith('o1') || finalModel.startsWith('o3')) ? 'openai'
                            : 'gemini';
                recordModelStep(airTrace, {
                    step: `${opts.deliverable.replace(/^#/, '')}:generate`,
                    selectedModel: finalModel,
                    routingReason: (opts.air.routing?.reason || 'caller-selected model')
                        + (fellBack ? ` [FELL BACK from ${requested}]` : ''),
                    provider,
                    costEstimateUsd: runSummary().cost_usd,   // WS-2 E10 (2026-10-30): summed from the run's priced steps
                    quotaState: opts.air.routing?.quotaState || (fellBack ? 'degraded' : 'unknown'),
                    elapsedMs: elapsed_ms,
                });
            } catch { /* trace step is best-effort; the AIR still emits */ }
            if (opts.air.resolvedChunks && opts.air.resolvedChunks.length > 0) {
                const { buildEvidenceLedger } = await import('./evidenceLedgerService');
                evidence = buildEvidenceLedger(opts.air.resolvedChunks);
                recordToolStep(airTrace, {
                    step: 'grounding:manifest-retrieval',
                    toolPack: 'wiki_retrieval',
                    toolName: 'manifest chunk pointers -> resolveChunks',
                    objectiveId: objective.objectiveId,
                    downstreamArtifactIds: [artifactId],
                });
            }
            const { air, entry } = buildAir({
                runId, artifactId, trigger: opts.air.trigger, objective,
                evidenceLedger: evidence, artifactPayload: payload, trace: airTrace,
                shadowMode: opts.air.blocking !== true,
                // R-M4 (2026-10-01): qualityReport mirror of the mechanism signals. `ri` is
                // normalized to the full record shape (empty maps when the caller only knew
                // whether it fired) so readers never branch on a partial object.
                ...(opts.ri ? {
                    ri: {
                        fired: opts.ri.fired === true,
                        before: opts.ri.before ?? {},
                        after: opts.ri.after ?? {},
                        resolved: typeof opts.ri.resolved === 'number' ? opts.ri.resolved : 0,
                        survived: typeof opts.ri.survived === 'number' ? opts.ri.survived : 0,
                    },
                } : {}),
                ...(Array.isArray(opts.vsCandidates) && opts.vsCandidates.length
                    ? { vsCandidates: opts.vsCandidates.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 32) }
                    : {}),
            });
            if (!entry) {
                console.warn(`[emitDeliverable/${opts.deliverable}] AIR: trigger '${opts.air.trigger}' not in artifact catalog - add it to services/artifactCatalog.ts`);
            }
            // 2026-08-21 CONVERGE: one writer for every artifact (see emitAirRecord).
            // WS-5 R5 (2026-10-30): the AIR carries the epoch it was produced under, so rescoring and the
            // rollback verdict attribute outcomes to the edit that was live.
            void emitAirRecord(air, { label: `emitDeliverable/${opts.deliverable}`, revision: opts.air.revision }).then(async (r) => {
                try {
                    const { getActiveEpochId } = await import('./epochOutcomeTracker');
                    const epochId = getActiveEpochId();
                    if (r?.persisted && epochId !== null) {
                        await fetch('http://127.0.0.1:5012/api/air/patch', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ runId, artifactId, patch: { epochId, epoch: { id: epochId } } }),
                        });
                    }
                } catch { /* attribution is best-effort */ }
            }).catch(() => { /* fire-and-forget */ });
        } catch (e: any) {
            console.warn(`[emitDeliverable/${opts.deliverable}] AIR emission failed (non-fatal):`, e?.message || e);
        }

        // 2026-10-01 (plan Stage 5.1, audit C2) - END-OF-RUN EPOCH READER. The job counter was computed by
        // /api/epochs/status and discarded (zero SPA callers; `due` had been true since inception). After an
        // AIR is emitted this run is a completed job: count it once, log the status line once per run, and
        // when the epoch is due write ONE pending proposal to the propose-only ledger. Fire-and-forget; the
        // emission result is never affected. The AIR construction above is untouched.
        // WS-1 T2 (2026-10-30): the artifact joins the run record and the run manifest is emitted.
        try {
            const { recordArtifact, emitRunManifest } = await import('./runState');
            recordArtifact(opts.air.artifactId || `${opts.deliverable.replace(/^#/, '')}_${t0}`);
            void emitRunManifest().catch(() => { /* fire-and-forget */ });
        } catch { /* run state not loaded - no-op */ }
        try {
            const { recordJobCompletion } = await import('./epochTrigger');
            const epochRunId = opts.air.runId
                || engagementSlug()
                || 'run';
            void recordJobCompletion(epochRunId, { deliverable: opts.deliverable })
                .catch((e: any) => console.warn(`[emitDeliverable/${opts.deliverable}] epoch reader failed (non-fatal):`, e?.message || e));
        } catch { /* trigger not loaded - no-op */ }
    }

    // 2026-06-06 - INSIGHT-AS-CHUNK persistence. Close the second-brain
    // feedback loop: every generated insight gets written back to the wiki
    // as its own chunk-addressable page. Future generations can cite past
    // insights by pointer through the manifest, so the corpus grows from
    // synthesis, not just from external ingestion. Fire-and-forget; failure
    // logs but never blocks the user.
    if (opts.insightPersist) {
        try {
            const slug = engagementSlug() || '';
            if (slug && !emitError) {
                const items = (opts.insightPersist.selectItems(result!) || []).filter(Boolean);
                const kind = opts.insightPersist.kind;
                let persisted = 0;
                await Promise.all(items.map(async (it) => {
                    if (!it.insightId || !it.text) return;
                    const r = await persistInsightAsChunk({
                        engagementSlug: slug,
                        kind,
                        insightId: it.insightId,
                        text: it.text,
                        sourceChunks: it.sourceChunks || [],
                        model: String((result as any)?.modelUsed || opts.model_id),
                        reproducibilityHash: opts.insightPersist!.reproducibilityHash,
                        researchGoal: opts.insightPersist!.researchGoal,
                        title: it.title,
                    });
                    if (r.ok) persisted++;
                }));
                if (persisted > 0) {
                    console.info(`[emitDeliverable/${opts.deliverable}] insight-as-chunk: persisted ${persisted}/${items.length} insight(s) to wiki/synthesis/insights/${slug}/${kind}/`);
                }
            }
        } catch (e: any) {
            console.warn(`[emitDeliverable/${opts.deliverable}] insightPersist failed (non-fatal):`, e?.message || e);
        }
    }

    return { result, traceRecorded, qualityVector, elapsed_ms };
}

/**
 * Convenience for the common case: the emit() returns an object with .text
 * AND we want default scoring (text + label only, no per-deliverable slide
 * titles / citations). Equivalent to calling emitDeliverable with
 * extractText: (r) => r.text and buildScoreInput: (text) => ({text}).
 */
async function emitDeliverableSimple<T extends { text?: string }>(
    deliverable: string,
    step_label: string,
    model_id: string,
    prompt: string,
    emit: () => Promise<T>,
    options: { temperature?: number; seed?: number; note?: string } = {},
): Promise<EmitDeliverableResult<T>> {
    const t0 = Date.now();
    return emitDeliverable<T>({
        deliverable,
        step_label,
        model_id,
        prompt,
        started_at: t0,
        emit,
        extractText: (r) => (r && typeof r === 'object' && 'text' in r ? String(r.text || '') : String(r || '')),
        buildScoreInput: (text) => ({ text }),
        ...options,
    });
}
