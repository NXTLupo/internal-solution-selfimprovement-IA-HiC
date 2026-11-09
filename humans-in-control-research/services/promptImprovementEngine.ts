/**
 * Prompt Self-Improvement Engine
 * Captures human edit signals from checkpoints and uses them to
 * systematically improve prompts over time (Karpathy method).
 *
 * Techniques applied:
 * - Failure logging (technique 9): tracks what users edit and why
 * - Constraint tightening (technique 4): auto-generates constraints from edit patterns
 * - Before/after validation (technique 1): confirms improvements on next run
 */

// --- TYPES ---

export interface EditSignal {
    timestamp: number;
    stage: string;
    field: string;
    originalValue: string;
    editedValue: string;
    editType: 'shortened' | 'lengthened' | 'corrected' | 'restructured' | 'tone_changed' | 'deleted' | 'added';
    originalLength: number;
    editedLength: number;
}

export interface EditPattern {
    field: string;
    stage: string;
    direction: string;          // 'shorter', 'longer', 'corrected', etc.
    occurrences: number;
    averageDelta: number;       // avg character change
    suggestedConstraint: string;
    status: 'pending' | 'approved' | 'dismissed' | 'applied' | 'candidate';
}

export interface PromptImprovement {
    id: string;
    field: string;
    stage: string;
    constraint: string;
    appliedAt: number;
    improvementScore: number;   // -1 (worse) to 1 (better), 0 = no change
    /**
     * 2026-05-20 - Artifact kind this rule applies to. Examples:
     *   'journey'    - only injects when regenerating a journey
     *   'blueprint'  - only injects when regenerating a service blueprint
     *   'persona'    - only when regenerating a persona
     *   'theme'      - only when regenerating themes
     *   'all' (or undefined) - universal rule, injects for every artifact
     * Density preferences ("3 activities per phase") belong to journey/blueprint.
     * Tone preferences ("no claims in titles") are usually 'all'.
     * Scoping prevents journey-specific rules from polluting persona/theme
     * generation and vice versa.
     */
    artifactKind?: string;
}

import {
    isAcceptableConstraint,
    evaluateConstraint,
    gateConstraints,
    normalizeConstraintKey,
} from './constraintQualityGate';

// --- THE STORE (2026-10-30, WS-5 R7) ---
// The localStorage store (edit log, patterns, improvements, correction rules) is gone. It made
// a constraint active in ONE browser after any five chat corrections, with the latest rule
// winning and a single 0.85-confidence message bypassing even that, and nothing measured
// first. The durable store is now synthesis/constraint-records.json (one row per rule, with a
// lifecycle: candidate -> active only after the held-out gate E4 records a win -> retired).
// Feedback and edits become LABELS (evals/labels.jsonl, E6) and FRONTIER CASES (E2); they never
// write a rule into a prompt. What follows is the in-memory session mirror of that store.
const _memory: { editLog: EditSignal[]; patterns: EditPattern[]; improvements: PromptImprovement[]; rules: StashedCorrectionRule[] } = {
    editLog: [], patterns: [], improvements: [], rules: [],
};
/** Test seam: the active (held-out winning) improvements. */
export function __setImprovementsForTests(rows: PromptImprovement[]): void { _memory.improvements = rows.slice(); }
export function __getImprovementsForTests(): PromptImprovement[] { return _memory.improvements.slice(); }
export function __resetPromptImprovementForTests(): void { _memory.editLog = []; _memory.patterns = []; _memory.improvements = []; _memory.rules = []; }
/** Drop rules from the active mirror (retirement, dismissal). Returns how many left. */
export function removeImprovementsByText(texts: string[]): number {
    const keys = new Set(texts.map(normalizeConstraintKey));
    const before = _memory.improvements.length;
    _memory.improvements = _memory.improvements.filter(i => !keys.has(normalizeConstraintKey(i.constraint)));
    return before - _memory.improvements.length;
}
// Written by improvementDiscriminator (DISMISSED_KEY). Read here so a constraint auto-dismissed for
// consistently-negative quality impact is NOT resurrected from the wiki at the next boot. The
// discriminator's own per-browser ledger; read directly to avoid an import cycle.
const DISMISSED_KEY = 'hic_dismissed_constraints';
const PROXY_FOR_LABELS = 'http://127.0.0.1:5012';

/** Normalized keys of constraints the discriminator has dismissed. */
function getDismissedConstraintKeys(): Set<string> {
    try {
        if (typeof localStorage === 'undefined') return new Set();
        const raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
        return new Set(
            (Array.isArray(raw) ? raw : [])
                .map((d: any) => (d && typeof d.constraint === 'string' ? normalizeConstraintKey(d.constraint) : ''))
                .filter(Boolean)
        );
    } catch {
        return new Set();
    }
}

// --- EDIT LOGGING ---

/**
 * Log a human edit at a checkpoint.
 * Call this whenever a user modifies AI output.
 */
export function logEdit(stage: string, field: string, originalValue: string, editedValue: string): void {
    const editType = classifyEdit(originalValue, editedValue);
    const signal: EditSignal = {
        timestamp: Date.now(),
        stage,
        field,
        originalValue: originalValue.substring(0, 200), // truncate for storage
        editedValue: editedValue.substring(0, 200),
        editType,
        originalLength: originalValue.length,
        editedLength: editedValue.length,
    };

    const log = getEditLog();
    log.push(signal);
    // Keep last 500 edits
    if (log.length > 500) log.splice(0, log.length - 500);

    // WS-5 R7: an edit at a checkpoint is a human LABEL on the field it changed (E6), never a rule.
    postLabel({ slide_id: `${stage}:${field}`, label: editType === 'deleted' ? 'rejected' : 'rejected', source: 'checkpoint_edit', detail: `${editType}: "${originalValue.slice(0, 120)}" -> "${editedValue.slice(0, 120)}"` });

    // Pattern detection after every 5th edit (patterns become CANDIDATE rows, not active rules)
    if (log.length % 5 === 0) {
        detectPatterns();
    }
}

/** Fire-and-forget label write (evals/labels.jsonl through the proxy). */
function postLabel(row: { slide_id: string; label: 'approved' | 'rejected'; source: string; detail?: string; artifact_id?: string }): void {
    try {
        if (typeof fetch !== 'function') return;
        void fetch(`${PROXY_FOR_LABELS}/api/eval/labels`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ts: Date.now(), ...row }),
        }).catch(() => { /* best-effort */ });
    } catch { /* never break the caller */ }
}

/** Fire-and-forget frontier case (E2) from a piece of user feedback: the ask, the reply it corrected, the rule. */
function postFrontierCase(input: { kind: string; prompt: string; objective: string; aiText: string; rule: string; surface: string }): void {
    try {
        if (typeof fetch !== 'function') return;
        const stamp = Date.now().toString(36);
        const kind = (input.kind || 'all').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'all';
        const body = {
            id: `feedback-${kind}-${stamp}`.slice(0, 80), set: 'frontier', kind,
            input: { objective: input.objective || '(objective not recorded)', prompt: input.prompt.slice(0, 2000) },
            expected: { trajectory: { no_fail_open: true } },
            origin: { type: 'user_report', ref: `chat:${input.surface}`, added: new Date().toISOString().slice(0, 10), note: `rule: ${input.rule.slice(0, 300)}; corrected reply: ${input.aiText.slice(0, 200)}` },
        };
        void fetch(`${PROXY_FOR_LABELS}/api/eval/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => { /* best-effort */ });
    } catch { /* never break the caller */ }
}

function classifyEdit(original: string, edited: string): EditSignal['editType'] {
    if (edited.length === 0) return 'deleted';
    if (original.length === 0) return 'added';
    const ratio = edited.length / original.length;
    if (ratio < 0.7) return 'shortened';
    if (ratio > 1.3) return 'lengthened';
    // Check if it's a structural change
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const editedWords = new Set(edited.toLowerCase().split(/\s+/));
    const overlap = [...originalWords].filter(w => editedWords.has(w)).length;
    const overlapRatio = overlap / Math.max(originalWords.size, editedWords.size);
    if (overlapRatio < 0.5) return 'restructured';
    return 'corrected';
}

// --- PATTERN DETECTION ---

/**
 * Analyze the edit log and detect consistent patterns.
 * A pattern requires 5+ edits in the same direction for the same field.
 */
export function detectPatterns(): EditPattern[] {
    const log = getEditLog();
    const fieldGroups = new Map<string, EditSignal[]>();

    // Group by stage+field
    for (const edit of log) {
        const key = `${edit.stage}::${edit.field}`;
        if (!fieldGroups.has(key)) fieldGroups.set(key, []);
        fieldGroups.get(key)!.push(edit);
    }

    const patterns: EditPattern[] = [];

    for (const [key, edits] of fieldGroups) {
        if (edits.length < 5) continue;

        const [stage, field] = key.split('::');

        // Count edit type frequencies
        const typeCounts = new Map<string, number>();
        let totalDelta = 0;
        for (const e of edits) {
            typeCounts.set(e.editType, (typeCounts.get(e.editType) || 0) + 1);
            totalDelta += e.editedLength - e.originalLength;
        }

        // Find dominant direction
        let dominantType = '';
        let maxCount = 0;
        for (const [type, count] of typeCounts) {
            if (count > maxCount) { maxCount = count; dominantType = type; }
        }

        // Only flag if 60%+ of edits are in the same direction
        if (maxCount / edits.length < 0.6) continue;

        const avgDelta = Math.round(totalDelta / edits.length);
        // 2026-05-19: chat-stage signals carry an LLM-extracted rule that is
        // far more actionable than generateConstraint's character-delta
        // boilerplate. Use the chat rule when available.
        const chatRule = stage.startsWith('chat:') ? lookupChatRule(stage, field) : null;
        const constraint = chatRule || generateConstraint(field, dominantType, avgDelta, edits);

        patterns.push({
            field,
            stage,
            direction: dominantType,
            occurrences: edits.length,
            averageDelta: avgDelta,
            suggestedConstraint: constraint,
            status: 'pending',
        });
    }

    _memory.patterns = patterns;

    // WS-5 R7: a pattern with 5+ occurrences is a CANDIDATE rule, recorded in the lifecycle store with
    // status 'candidate'. It reaches a prompt only after the held-out gate (E4, `eval-run.mjs --constraint`)
    // records that it beat the incumbent. The auto-approval that used to happen here is gone.
    for (const p of patterns) {
        if (p.status !== 'pending' || p.occurrences < 5) continue;
        const verdict = evaluateConstraint(p.suggestedConstraint);
        if (!verdict.accept) {
            p.status = 'dismissed';
            console.log(`[PromptImprovement] Rejected constraint (${verdict.reason}): ${p.suggestedConstraint}`);
            continue;
        }
        p.status = 'candidate';
        void createConstraintRecord({ text: p.suggestedConstraint, deliverableType: p.stage.startsWith('chat:') ? undefined : p.stage, status: 'candidate', origin: `pattern:${p.stage}:${p.field} x${p.occurrences}` })
            .catch(() => { /* best-effort */ });
    }
    return patterns;
}

function generateConstraint(field: string, editType: string, avgDelta: number, edits: EditSignal[]): string {
    const avgOrigLen = Math.round(edits.reduce((s, e) => s + e.originalLength, 0) / edits.length);
    const avgEditLen = Math.round(edits.reduce((s, e) => s + e.editedLength, 0) / edits.length);

    switch (editType) {
        case 'shortened':
            return `"${field}" must be under ${avgEditLen + 20} characters (${Math.round(avgEditLen / 5)} words). Users consistently shorten this field.`;
        case 'lengthened':
            return `"${field}" must be at least ${avgEditLen - 20} characters. Users consistently expand this field for more detail.`;
        case 'corrected':
            return `"${field}" requires more accuracy. Review factual claims and specificity in this field.`;
        case 'restructured':
            return `"${field}" structure needs revision. Users consistently reorganize this field's content.`;
        case 'deleted':
            return `Consider making "${field}" optional. Users frequently remove this field entirely.`;
        default:
            return `"${field}" needs attention: ${edits.length} user edits detected (avg delta: ${avgDelta} chars).`;
    }
}

// --- IMPROVEMENT MANAGEMENT ---
// (the manual approveConstraint path is gone with the store: a rule becomes active only through the held-out gate)


/**
 * Get all approved constraints as a prompt injection string.
 * This is appended to system prompts to enforce learned constraints.
 *
 * 2026-05-20 - Added optional artifactKind filter. When `kind` is provided,
 * returns ONLY constraints tagged for that artifact (plus universal rules
 * with artifactKind 'all' or undefined). Without `kind`, returns ALL
 * constraints (legacy behavior - used by the Analyst chat path that handles
 * many artifact types in one session).
 */
// 2026-10-01 (plan Stage 5.2, audit C5): INJECTION CAP. All 48 wiki constraints used to be injected
// into every prompt with no ceiling. The Claude Code hook (.claude/hooks/scripts/
// inject_active_constraints_and_patterns.py) caps at 12 constraints / 6 KB; the SPA now mirrors
// that budget. Ordering: highest confidence first (parsed from the "(... confidence 0.85)" suffix
// the ledger lines carry), then newest first, so a fresh high-confidence correction is never
// crowded out by an old low-confidence one.
export const MAX_INJECTED_CONSTRAINTS = 12;
export const MAX_INJECTED_CONSTRAINT_CHARS = 6000;

/** Confidence parsed from a constraint line's "(source: ..., confidence 0.85)" suffix; 0.5 when absent. */
function constraintConfidence(text: string): number {
    const m = /confidence\s+([0-9]*\.?[0-9]+)/i.exec(text || '');
    if (!m) return 0.5;
    const v = Number(m[1]);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
}

/**
 * Order + cap the constraint lines that reach a prompt. Pure; exported for the test.
 * `meta` supplies appliedAt per constraint text (missing = 0, i.e. oldest).
 */
export function capConstraintsForInjection(
    lines: string[],
    meta: Record<string, { appliedAt?: number; confidence?: number }> = {},
    limits: { maxCount?: number; maxChars?: number } = {},
): string[] {
    const maxCount = limits.maxCount ?? MAX_INJECTED_CONSTRAINTS;
    const maxChars = limits.maxChars ?? MAX_INJECTED_CONSTRAINT_CHARS;
    const ranked = lines
        .map((text, idx) => ({
            text,
            idx,
            confidence: meta[text]?.confidence ?? constraintConfidence(text),
            appliedAt: meta[text]?.appliedAt ?? 0,
        }))
        .sort((a, b) => (b.confidence - a.confidence) || (b.appliedAt - a.appliedAt) || (a.idx - b.idx))
        .map(r => r.text);
    const out: string[] = [];
    let chars = 0;
    for (const line of ranked) {
        if (out.length >= maxCount) break;
        const cost = line.length + 3; // "- " + newline
        if (chars + cost > maxChars) continue; // skip the one that does not fit; a shorter later line still may
        out.push(line);
        chars += cost;
    }
    return out;
}

export function getActiveConstraints(kind?: string): string {
    const improvements = getImprovements();
    if (improvements.length === 0) return '';

    let filtered = improvements;
    if (kind) {
        filtered = improvements.filter(imp => {
            const tag = imp.artifactKind;
            if (!tag || tag === 'all') return true; // universal rule
            return tag === kind;
        });
    }
    if (filtered.length === 0) return '';

    // QUALITY GATE (Phase 1, 2026-05-29) - final defense at the injection point.
    // Even if a bad constraint slipped into the store via a legacy path or a
    // stale wiki import, it is filtered here before it ever reaches a prompt:
    //   (a) drop any constraint the discriminator has dismissed,
    //   (b) reject master-rule violations + generic stubs,
    //   (c) dedupe near-identical variants (keep the richest).
    const dismissed = getDismissedConstraintKeys();
    const candidateLines = filtered
        .filter(imp => !dismissed.has(normalizeConstraintKey(imp.constraint)))
        .map(imp => imp.constraint);
    const kept = gateConstraints(candidateLines).kept;
    if (kept.length === 0) return '';

    // C5 cap: at most MAX_INJECTED_CONSTRAINTS / MAX_INJECTED_CONSTRAINT_CHARS, best first.
    const meta: Record<string, { appliedAt?: number; confidence?: number }> = {};
    for (const imp of filtered) {
        if (!meta[imp.constraint]) meta[imp.constraint] = { appliedAt: imp.appliedAt };
    }
    const capped = capConstraintsForInjection(kept, meta);
    if (capped.length === 0) return '';

    const constraints = capped.map(c => `- ${c}`).join('\n');
    const scope = kind ? `for "${kind}" artifacts` : 'across all artifacts';
    return `\n\nLEARNED CONSTRAINTS (from user feedback patterns, ${scope}):\n${constraints}`;
}

// --- DATA ACCESS ---

function getEditLog(): EditSignal[] { return _memory.editLog; }

function getPatterns(): EditPattern[] { return _memory.patterns; }

function getImprovements(): PromptImprovement[] { return _memory.improvements; }

// --- STATISTICS ---

export interface PromptIntelligenceStats {
    totalEdits: number;
    editsByStage: Record<string, number>;
    topEditedFields: { field: string; count: number }[];
    pendingPatterns: EditPattern[];
    activeConstraints: number;
}

export function getStats(): PromptIntelligenceStats {
    const log = getEditLog();
    const patterns = getPatterns();
    const improvements = getImprovements();

    const byStage: Record<string, number> = {};
    const byField: Record<string, number> = {};

    for (const edit of log) {
        byStage[edit.stage] = (byStage[edit.stage] || 0) + 1;
        byField[edit.field] = (byField[edit.field] || 0) + 1;
    }

    const topFields = Object.entries(byField)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([field, count]) => ({ field, count }));

    return {
        totalEdits: log.length,
        editsByStage: byStage,
        topEditedFields: topFields,
        pendingPatterns: patterns.filter(p => p.status === 'pending'),
        activeConstraints: improvements.length,
    };
}


/**
 * P6-06: Cross-session knowledge compounding.
 * Loads learned constraints from the wiki and merges them into localStorage.
 * Call this at app startup so that constraints learned in previous sessions
 * (including by other users) are available for prompt injection.
 */
export async function loadWikiConstraints(): Promise<number> {
    try {
        // 1. Every ledger line becomes a CANDIDATE row once (the migration of the 48 pre-existing constraints
        //    through the lifecycle store; `eval-run.mjs --constraint` runs E4 on each and stamps the winners).
        let rows = await readConstraintRecords();
        const byId = new Map(rows.map(r => [r.id, r]));
        let migrated = 0;
        try {
            const resp = await fetch('http://127.0.0.1:5012/api/wiki/read/synthesis/learned-constraints.md');
            if (resp.ok) {
                const data = await resp.json();
                const content = String(data?.content || '');
                for (const line of (content.match(/^- CONSTRAINT[^:]*:\s*.+$/gm) || [])) {
                    const m = line.match(/^- CONSTRAINT(?:\s*\[([^\]]+)\])?:\s*(.+)$/);
                    if (!m) continue;
                    const scopeRaw = m[1] || '';
                    const text = m[2].trim();
                    if (!text || !isAcceptableConstraint(text)) continue;
                    const id = constraintRecordId(text);
                    if (byId.has(id)) continue;
                    const row: ConstraintLifecycleRecord = {
                        id, text, deliverableType: scopeRaw ? scopeRaw.split('/')[0].trim() || undefined : undefined,
                        sectionScope: scopeRaw.includes('/') ? scopeRaw.split('/').slice(1).join('/') : null,
                        created: new Date().toISOString(), applications: 0, negativeSignalsAfter: 0,
                        confidence: (() => { const c = /confidence\s+([0-9.]+)/i.exec(text); return c ? Number(c[1]) : undefined; })(),
                        status: 'candidate', origin: 'ledger-migration-2026-10-30',
                    };
                    rows.push(row); byId.set(id, row); migrated++;
                }
            }
        } catch { /* the ledger is optional once the records exist */ }
        if (migrated > 0) {
            await writeConstraintRecords(rows);
            console.log(`[PromptImprovement] ${migrated} ledger constraint(s) recorded as candidates (not injected until they win on the held-out split)`);
        }

        // 2. The active mirror holds ONLY rules that won on the held-out split and were not retired or dismissed.
        const dismissed = getDismissedConstraintKeys();
        const active = rows.filter(r => r.status === 'active' && r.heldout_win === true && !r.retired && !dismissed.has(normalizeConstraintKey(r.text)) && isAcceptableConstraint(r.text));
        _memory.improvements = active.map((r, i) => ({
            id: `rec_${r.id}_${i}`, field: r.sectionScope || 'held-out', stage: 'cross-session', constraint: r.text,
            appliedAt: Date.parse(r.heldout?.decided_at || r.created) || Date.now(), improvementScore: r.heldout ? (r.heldout.after - r.heldout.before) : 0,
            artifactKind: r.scope?.kind || r.deliverableType || 'all',
        }));
        if (active.length) console.log(`[PromptImprovement] ${active.length} held-out-winning constraint(s) active; ${rows.length - active.length} candidate/retired`);
        return active.length;
    } catch (e) {
        // Wiki may not be available (e.g., proxy not running) - non-blocking
        return 0;
    }
}

// --- CHAT FEEDBACK BRIDGE (2026-05-19) ---
// The original capture surface (AnalysisCheckpoint logEdit) is no longer
// rendered to the user in the chat-first UX. logChatFeedback() takes its
// place as the upstream signal source. Feedback signals are produced by
// services/chatFeedbackExtractor.ts.

// Keyed by stage::field so the existing pattern detector can group them.
interface StashedCorrectionRule {
    stage: string;
    field: string;
    rule: string;
    timestamp: number;
}

function getCorrectionRules(): StashedCorrectionRule[] { return _memory.rules; }

interface ChatFeedbackInput {
    type: 'correction' | 'rejection' | 'rule';
    userText: string;
    aiText: string;
    extractedRule: string;
    confidence: number;
    chatSurface: 'analyst' | 'designer';
    timestamp: number;
    /**
     * 2026-05-20 - Artifact kind the feedback applies to. Captured at the
     * call site by inspecting the active artifact at the moment the user
     * typed the message. Passed through to PromptImprovement.artifactKind so
     * the scoped getter (getActiveConstraints(kind)) returns only the rules
     * relevant to the current generation target. Pass undefined or 'all' for
     * universal rules (the classifier's default when the message looks
     * artifact-agnostic).
     */
    artifactKind?: string;
}

/**
 * Bridge a classified chat feedback signal into the constraint pipeline.
 *
 * - 'rule' signals (confidence >= 0.75) bypass the 5-edit threshold and create
 *   an improvement immediately. These are explicit user commands ("never use
 *   X", "always Y") and accumulating them across multiple repetitions would
 *   discard the high-value signal.
 * - 'correction' signals (and weaker rules) go through the existing edit-log
 *   pipeline so detectPatterns() picks them up after 5+ occurrences.
 * - 'rejection' signals log only; without an extracted rule they cannot
 *   produce an actionable constraint, but the count is still useful telemetry.
 */
export function logChatFeedback(signal: ChatFeedbackInput): void {
    const stage = `chat:${signal.chatSurface}`;
    const field = signal.type;

    // Always log to the main edit log so detectPatterns sees the volume.
    const editSignal: EditSignal = {
        timestamp: signal.timestamp,
        stage,
        field,
        originalValue: signal.aiText.substring(0, 200),
        editedValue: signal.userText.substring(0, 200),
        editType: signal.type === 'rejection' ? 'deleted' : 'corrected',
        originalLength: signal.aiText.length,
        editedLength: signal.userText.length,
    };

    const log = getEditLog();
    log.push(editSignal);
    if (log.length > 500) log.splice(0, log.length - 500);

    // Stash the LLM-extracted rule for use by detectPatterns. Without this,
    // generateConstraint() would only see character deltas and produce its
    // boilerplate "needs attention" output. The rule is the meaningful signal.
    if (signal.extractedRule) {
        const rules = getCorrectionRules();
        rules.push({ stage, field, rule: signal.extractedRule, timestamp: signal.timestamp });
        if (rules.length > 200) rules.splice(0, rules.length - 200);
    }

    // WS-5 R7 (2026-10-30): feedback is a LABEL and a FRONTIER CASE, never an auto-injected rule. The
    // 0.75/0.85 "high-confidence rule" bypass that wrote a constraint into every later prompt from ONE
    // message is deleted. A rule the classifier extracted becomes a CANDIDATE lifecycle row; it is injected
    // only after `eval-run.mjs --constraint` shows it beats the incumbent on the held-out split (E4).
    postLabel({ slide_id: `chat:${signal.chatSurface}:${signal.type}`, label: 'rejected', source: 'feedback_widget',
                detail: (signal.extractedRule || signal.userText).slice(0, 300) });
    if (signal.type !== 'rejection' || signal.extractedRule) {
        postFrontierCase({ kind: signal.artifactKind || 'all', prompt: signal.userText, objective: _objectiveForCases(), aiText: signal.aiText,
                           rule: signal.extractedRule || signal.userText, surface: signal.chatSurface });
    }
    if (signal.type === 'rule' && signal.extractedRule) {
        const verdict = evaluateConstraint(signal.extractedRule);
        if (!verdict.accept) {
            console.log(`[PromptImprovement] Rejected chat rule (${verdict.reason}): ${signal.extractedRule}`);
        } else {
            void createConstraintRecord({ text: signal.extractedRule, deliverableType: signal.artifactKind && signal.artifactKind !== 'all' ? signal.artifactKind : undefined,
                                          confidence: signal.confidence, status: 'candidate', origin: `chat:${signal.chatSurface}` })
                .catch(() => { /* best-effort */ });
            console.log(`[PromptImprovement] Chat rule recorded as a CANDIDATE (kind=${signal.artifactKind || 'all'}); it is injected only after the held-out gate: ${signal.extractedRule}`);
        }
    }

    // Auto-detect patterns periodically (same cadence as logEdit)
    if (log.length % 5 === 0) {
        detectPatterns();
    }
}

let _objectiveProvider: (() => string) | null = null;
/** The run objective the frontier cases carry (runState registers this; avoids an import cycle). */
export function setObjectiveProviderForCases(fn: (() => string) | null): void { _objectiveProvider = fn; }
function _objectiveForCases(): string { try { return _objectiveProvider ? _objectiveProvider() : ''; } catch { return ''; } }

/**
 * Look up the most recent extracted rule for a given stage+field. Called by
 * detectPatterns when the stage starts with "chat:" so we use the
 * LLM-extracted rule instead of generateConstraint's boilerplate.
 */
function lookupChatRule(stage: string, field: string): string | null {
    const rules = getCorrectionRules();
    for (let i = rules.length - 1; i >= 0; i--) {
        if (rules[i].stage === stage && rules[i].field === field) return rules[i].rule;
    }
    return null;
}

/**
 * P6-06: Export current localStorage constraints to wiki for cross-session persistence.
 */
export async function exportConstraintsToWiki(): Promise<boolean> {
    // WS-5 R7: the ledger lists the rules that WON on the held-out split (the ones the Claude Code hook and
    // the SPA inject) and, below them, the candidates still waiting for E4. Nothing else is written there.
    const rows = await readConstraintRecords();
    const dismissed = getDismissedConstraintKeys();
    const winners = rows.filter(r => r.status === 'active' && r.heldout_win === true && !r.retired && !dismissed.has(normalizeConstraintKey(r.text)));
    const candidates = rows.filter(r => (r.status === 'candidate' || (!r.status && !r.heldout_win)) && !r.retired);
    const kept = gateConstraints(winners.map(w => w.text)).kept;
    if (kept.length === 0 && candidates.length === 0) return false;

    const scopeOf = (text: string) => { const r = winners.find(w => w.text === text); return r?.scope?.kind || r?.deliverableType ? `[${r?.scope?.kind || r?.deliverableType}${r?.sectionScope ? `/${r.sectionScope}` : ''}]` : ''; };
    const lines = kept.map(c => `- CONSTRAINT${scopeOf(c) ? ` ${scopeOf(c)}` : ''}: ${c}`).join('\n')
        + (candidates.length ? `\n\n## Candidates (not injected until they beat the incumbent on the held-out split)\n\n${candidates.map(c => `- candidate: ${c.text}`).join('\n')}` : '');
    const content = `---\ntitle: Learned Constraints\ntype: synthesis\nupdated: ${new Date().toISOString().split('T')[0]}\n---\n\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n${lines}\n`;

    try {
        const resp = await fetch('http://127.0.0.1:5012/api/wiki/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'synthesis/learned-constraints.md', content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}

// ============================================================================
// CONSTRAINT LIFECYCLE RECORDS (2026-10-01, plan Stage 5.2, audit C5)
// ============================================================================
// `reviewConstraintEffectiveness` read synthesis/constraint-records.json which
// NOTHING wrote, so no constraint could ever retire. The store lives here (the
// constraint engine) so learningEngine (creates rows, retires) and
// improvementDiscriminator (counts applications + negative outcomes) share one
// reader/writer without an import cycle. Rows ride the existing wiki read/write
// path; the compiler never regenerates JSON.

export const CONSTRAINT_RECORDS_PATH = 'synthesis/constraint-records.json';

export interface ConstraintLifecycleRecord {
    /** Stable id derived from the normalized rule text. */
    id: string;
    /** The rule text (the constraint body as it appears in learned-constraints.md). */
    text: string;
    deliverableType?: string;
    sectionScope?: string | null;
    /** ISO timestamp the row was created (constraint promoted). */
    created: string;
    /** Times the constraint was active on a scored deliverable. */
    applications: number;
    /** Scored deliverables that REGRESSED while the constraint was active. */
    negativeSignalsAfter: number;
    confidence?: number;
    /** ISO timestamp when runLearningPass removed it from the ledger. */
    retired?: string;
    /** WS-5 R7 lifecycle: candidate (recorded, never injected) -> active (held-out win) -> retired. */
    status?: 'candidate' | 'active' | 'retired';
    /** True only when E4 (`eval-run.mjs --constraint`) recorded that the rule beat the incumbent. */
    heldout_win?: boolean;
    heldout?: { before: number; after: number; cases: number; decided_at: string; decision?: string; reason?: string };
    /** Scope the win was measured under; injection stays inside it. */
    scope?: { kind?: string; engagement_type?: string };
    origin?: string;
}

/** Deterministic id for a constraint row (djb2 over the normalized key). */
export function constraintRecordId(text: string): string {
    const key = normalizeConstraintKey(text);
    let h = 5381;
    for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    return `cr_${h.toString(16).padStart(8, '0')}`;
}

const PROXY_BASE_FOR_RECORDS = 'http://127.0.0.1:5012';

export async function readConstraintRecords(): Promise<ConstraintLifecycleRecord[]> {
    try {
        const r = await fetch(`${PROXY_BASE_FOR_RECORDS}/api/wiki/read/${CONSTRAINT_RECORDS_PATH}`);
        if (!r.ok) return [];
        const data = await r.json();
        if (!data?.content) return [];
        const parsed = JSON.parse(data.content);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((row: any) => row && typeof row.text === 'string')
            .map((row: any) => ({
                id: typeof row.id === 'string' ? row.id : constraintRecordId(row.text),
                text: row.text,
                deliverableType: row.deliverableType,
                sectionScope: row.sectionScope ?? null,
                created: typeof row.created === 'string' ? row.created : (typeof row.addedAt === 'string' ? row.addedAt : ''),
                applications: Number(row.applications) || 0,
                // legacy field name from the pre-C5 ConstraintRecord interface
                negativeSignalsAfter: Number(row.negativeSignalsAfter ?? row.repeatedNegativeSignalsAfter) || 0,
                confidence: typeof row.confidence === 'number' ? row.confidence : undefined,
                retired: typeof row.retired === 'string' ? row.retired : undefined,
                status: row.status === 'active' || row.status === 'candidate' || row.status === 'retired' ? row.status : (typeof row.retired === 'string' ? 'retired' : (row.heldout_win === true ? 'active' : 'candidate')),
                heldout_win: row.heldout_win === true,
                heldout: row.heldout && typeof row.heldout === 'object' ? row.heldout : undefined,
                scope: row.scope && typeof row.scope === 'object' ? row.scope : undefined,
                origin: typeof row.origin === 'string' ? row.origin : undefined,
            }));
    } catch {
        return [];
    }
}

export async function writeConstraintRecords(rows: ConstraintLifecycleRecord[]): Promise<boolean> {
    try {
        const r = await fetch(`${PROXY_BASE_FOR_RECORDS}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: CONSTRAINT_RECORDS_PATH, content: JSON.stringify(rows, null, 2) }),
        });
        return r.ok;
    } catch {
        return false;
    }
}

/** Create the lifecycle row for a newly promoted constraint (no-op when a row exists). */
export async function createConstraintRecord(input: {
    text: string;
    deliverableType?: string;
    sectionScope?: string | null;
    confidence?: number;
    status?: 'candidate' | 'active';
    origin?: string;
}): Promise<ConstraintLifecycleRecord | null> {
    const rows = await readConstraintRecords();
    const id = constraintRecordId(input.text);
    const existing = rows.find(r => r.id === id);
    if (existing) return existing;
    const row: ConstraintLifecycleRecord = {
        id,
        text: input.text,
        deliverableType: input.deliverableType,
        sectionScope: input.sectionScope ?? null,
        created: new Date().toISOString(),
        applications: 0,
        negativeSignalsAfter: 0,
        confidence: input.confidence,
        status: input.status || 'candidate',
        heldout_win: false,
        origin: input.origin,
    };
    rows.push(row);
    const ok = await writeConstraintRecords(rows);
    return ok ? row : null;
}

/**
 * WS-5 R7: the held-out verdict for one rule (written by `eval-run.mjs --constraint` through the lane, or by an
 * owner). A win makes the rule active inside the measured scope; a loss leaves it a candidate with the numbers.
 */
export async function recordHeldoutVerdict(text: string, verdict: { before: number; after: number; cases: number; decision: 'accept' | 'reject'; reason?: string; scope?: { kind?: string; engagement_type?: string } }): Promise<ConstraintLifecycleRecord | null> {
    const rows = await readConstraintRecords();
    const id = constraintRecordId(text);
    let row = rows.find(r => r.id === id);
    if (!row) {
        row = { id, text, created: new Date().toISOString(), applications: 0, negativeSignalsAfter: 0, status: 'candidate', heldout_win: false, sectionScope: null };
        rows.push(row);
    }
    row.heldout = { before: verdict.before, after: verdict.after, cases: verdict.cases, decided_at: new Date().toISOString(), decision: verdict.decision, reason: verdict.reason };
    row.heldout_win = verdict.decision === 'accept';
    row.status = row.heldout_win ? 'active' : 'candidate';
    if (verdict.scope) row.scope = verdict.scope;
    const ok = await writeConstraintRecords(rows);
    if (ok && row.heldout_win && !_memory.improvements.some(i => normalizeConstraintKey(i.constraint) === normalizeConstraintKey(text))) {
        _memory.improvements.push({ id: `rec_${id}`, field: row.sectionScope || 'held-out', stage: 'cross-session', constraint: text, appliedAt: Date.now(), improvementScore: verdict.after - verdict.before, artifactKind: verdict.scope?.kind || row.deliverableType || 'all' });
    }
    if (ok && !row.heldout_win) removeImprovementsByText([text]);
    return ok ? row : null;
}

/**
 * Count an application for every constraint that was active on a scored
 * deliverable; when the deliverable regressed, count a negative signal too.
 * Constraints with no row are ignored (rows are created at promotion time).
 * Returns the number of rows touched.
 */
export async function recordConstraintApplications(activeConstraints: string[], regressed: boolean): Promise<number> {
    if (!activeConstraints || activeConstraints.length === 0) return 0;
    const rows = await readConstraintRecords();
    if (rows.length === 0) return 0;
    const activeIds = new Set(activeConstraints.map(constraintRecordId));
    let touched = 0;
    for (const row of rows) {
        if (row.retired || !activeIds.has(row.id)) continue;
        row.applications += 1;
        if (regressed) row.negativeSignalsAfter += 1;
        touched++;
    }
    if (touched > 0) await writeConstraintRecords(rows);
    return touched;
}
