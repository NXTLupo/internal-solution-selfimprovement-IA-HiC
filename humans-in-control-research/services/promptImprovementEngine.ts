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
    status: 'pending' | 'approved' | 'dismissed' | 'applied';
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

// --- STORAGE KEYS ---
const EDIT_LOG_KEY = 'hic_prompt_edit_log';
const PATTERNS_KEY = 'hic_prompt_patterns';
const IMPROVEMENTS_KEY = 'hic_prompt_improvements';
// Written by improvementDiscriminator (DISMISSED_KEY). Read here so a
// constraint auto-dismissed for consistently-negative quality impact is NOT
// resurrected from the wiki at the next boot. Read directly from localStorage
// to avoid an import cycle with improvementDiscriminator.
const DISMISSED_KEY = 'hic_dismissed_constraints';

/** Normalized keys of constraints the discriminator has dismissed. */
function getDismissedConstraintKeys(): Set<string> {
    try {
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
    localStorage.setItem(EDIT_LOG_KEY, JSON.stringify(log));

    // Auto-detect patterns after every 5th edit
    if (log.length % 5 === 0) {
        detectPatterns();
    }
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

    localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));

    // P6-02: Auto-approve high-confidence patterns (5+ occurrences = strong signal).
    // This closes the loop: edits are captured -> patterns detected -> constraints auto-approved -> injected into next run.
    // Without this, getActiveConstraints() always returns '' because no UI calls approveConstraint().
    const improvements = getImprovements();
    const existingFields = new Set(improvements.map(imp => `${imp.stage}:${imp.field}`));
    for (let i = 0; i < patterns.length; i++) {
        const p = patterns[i];
        const key = `${p.stage}:${p.field}`;
        // QUALITY GATE (Phase 1, 2026-05-29): never auto-approve a constraint
        // that contradicts the master rules or is a generic stub. This is the
        // primary point where generateConstraint's boilerplate and dollar-
        // quantification rules used to enter the store.
        if (p.status === 'pending' && p.occurrences >= 5 && !existingFields.has(key)) {
            const verdict = evaluateConstraint(p.suggestedConstraint);
            if (!verdict.accept) {
                p.status = 'dismissed';
                console.log(`[PromptImprovement] Rejected constraint (${verdict.reason}): ${p.suggestedConstraint}`);
                continue;
            }
            p.status = 'approved';
            improvements.push({
                id: `auto_${Date.now()}_${i}`,
                field: p.field,
                stage: p.stage,
                constraint: p.suggestedConstraint,
                appliedAt: Date.now(),
                improvementScore: 0,
            });
            existingFields.add(key);
            console.log(`[PromptImprovement] Auto-approved constraint: ${p.suggestedConstraint}`);

            // P6-04: Also write to wiki anti-pattern page for cross-session persistence
            try {
                import('./wikiService').then(wiki => {
                    wiki.appendLearnedAntiPattern(
                        p.stage.toLowerCase().replace(/\s+/g, '-'),
                        `User consistently ${p.direction}s "${p.field}"`,
                        p.suggestedConstraint,
                        `${p.occurrences} edits, ${Math.round(p.occurrences)}+ occurrences`
                    );
                });
            } catch (e) { /* wiki write is best-effort */ }
        }
    }
    localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
    localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(improvements));

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

/**
 * Approve a suggested constraint. It will be injected into future prompts.
 */
function approveConstraint(patternIndex: number): void {
    const patterns = getPatterns();
    if (patterns[patternIndex]) {
        patterns[patternIndex].status = 'approved';
        localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));

        const improvements = getImprovements();
        improvements.push({
            id: `imp_${Date.now()}`,
            field: patterns[patternIndex].field,
            stage: patterns[patternIndex].stage,
            constraint: patterns[patternIndex].suggestedConstraint,
            appliedAt: Date.now(),
            improvementScore: 0, // will be scored after next run
        });
        localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(improvements));
    }
}


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

function getEditLog(): EditSignal[] {
    try {
        return JSON.parse(localStorage.getItem(EDIT_LOG_KEY) || '[]');
    } catch { return []; }
}

function getPatterns(): EditPattern[] {
    try {
        return JSON.parse(localStorage.getItem(PATTERNS_KEY) || '[]');
    } catch { return []; }
}

function getImprovements(): PromptImprovement[] {
    try {
        return JSON.parse(localStorage.getItem(IMPROVEMENTS_KEY) || '[]');
    } catch { return []; }
}

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
        const resp = await fetch('http://127.0.0.1:5012/api/wiki/read/synthesis/learned-constraints.md');
        if (!resp.ok) return 0;
        const data = await resp.json();
        const content = data.content || '';

        // Parse constraint entries from the wiki page.
        // Formats supported:
        //   - CONSTRAINT: <text>                          (legacy, kind=undefined)
        //   - CONSTRAINT [<deliverable>/<section>]: <text> (2026-05-22 scoped form)
        const constraintLines = content.match(/^- CONSTRAINT[^:]*:\s*.+$/gm) || [];
        if (constraintLines.length === 0) return 0;

        const existing = getImprovements();
        const existingTexts = new Set(existing.map(i => i.constraint));
        const existingKeys = new Set(existing.map(i => normalizeConstraintKey(i.constraint)));
        const dismissed = getDismissedConstraintKeys();
        let added = 0;
        let rejected = 0;

        for (const line of constraintLines) {
            // Capture optional [scope] tag and the constraint text.
            const m = line.match(/^- CONSTRAINT(?:\s*\[([^\]]+)\])?:\s*(.+)$/);
            if (!m) continue;
            const scopeRaw = m[1] || '';
            const text = m[2].trim();
            if (!text || existingTexts.has(text)) continue;
            const normKey = normalizeConstraintKey(text);
            // QUALITY GATE (Phase 1): do not import constraints that are
            // dismissed, contradict the master rules, are generic stubs, or
            // duplicate one already loaded (normalized). This stops a stale or
            // externally-written wiki file from re-poisoning the prompt.
            if (dismissed.has(normKey)) { rejected++; continue; }
            if (existingKeys.has(normKey)) { rejected++; continue; }
            if (!isAcceptableConstraint(text)) { rejected++; continue; }
            existingKeys.add(normKey);
            // scope is "<deliverableType>/<section>" - split into artifactKind
            const artifactKind = scopeRaw ? scopeRaw.split('/')[0].trim() || 'all' : 'all';
            existing.push({
                id: `wiki_${Date.now()}_${added}`,
                field: scopeRaw || 'wiki-imported',
                stage: 'cross-session',
                constraint: text,
                appliedAt: Date.now(),
                improvementScore: 0,
                artifactKind,
            });
            existingTexts.add(text);
            added++;
        }

        if (added > 0) {
            localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(existing));
            console.log(`[PromptImprovement] Loaded ${added} constraints from wiki (cross-session compounding)${rejected ? `; gate rejected ${rejected}` : ''}`);
        } else if (rejected > 0) {
            console.log(`[PromptImprovement] Wiki constraints all filtered by quality gate (${rejected} rejected)`);
        }
        return added;
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
const CORRECTION_RULES_KEY = 'hic_correction_rules';

interface StashedCorrectionRule {
    stage: string;
    field: string;
    rule: string;
    timestamp: number;
}

function getCorrectionRules(): StashedCorrectionRule[] {
    try {
        return JSON.parse(localStorage.getItem(CORRECTION_RULES_KEY) || '[]');
    } catch { return []; }
}

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
    localStorage.setItem(EDIT_LOG_KEY, JSON.stringify(log));

    // Stash the LLM-extracted rule for use by detectPatterns. Without this,
    // generateConstraint() would only see character deltas and produce its
    // boilerplate "needs attention" output. The rule is the meaningful signal.
    if (signal.extractedRule) {
        const rules = getCorrectionRules();
        rules.push({ stage, field, rule: signal.extractedRule, timestamp: signal.timestamp });
        if (rules.length > 200) rules.splice(0, rules.length - 200);
        localStorage.setItem(CORRECTION_RULES_KEY, JSON.stringify(rules));
    }

    // High-confidence rules bypass the threshold and write an improvement
    // immediately. These are explicit user commands -- accumulating them
    // across repetitions would discard the high-value signal.
    if (signal.type === 'rule' && signal.confidence >= 0.75 && signal.extractedRule) {
        // QUALITY GATE (Phase 1): a high-confidence chat rule still must not
        // contradict the master rules or be a generic stub.
        const verdict = evaluateConstraint(signal.extractedRule);
        if (!verdict.accept) {
            console.log(`[PromptImprovement] Rejected chat rule (${verdict.reason}): ${signal.extractedRule}`);
        } else {
        const improvements = getImprovements();
        const existingTexts = new Set(improvements.map(i => i.constraint));
        if (!existingTexts.has(signal.extractedRule)) {
            improvements.push({
                id: `chatrule_${Date.now()}`,
                field,
                stage,
                constraint: signal.extractedRule,
                appliedAt: Date.now(),
                improvementScore: 0,
                artifactKind: signal.artifactKind || 'all',
            });
            localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(improvements));
            console.log(`[PromptImprovement] Chat rule (direct, kind=${signal.artifactKind || 'all'}): ${signal.extractedRule}`);

            // For 'rule' signals only -- export to wiki immediately so cross-session
            // compounding works without waiting for an end-of-run trigger.
            // (Many chat-first sessions never reach the old end-of-run handler.)
            void exportConstraintsToWiki().catch(() => { /* non-blocking */ });
        }
        }
    }

    // Auto-detect patterns periodically (same cadence as logEdit)
    if (log.length % 5 === 0) {
        detectPatterns();
    }
}

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
    const improvements = getImprovements();
    if (improvements.length === 0) return false;

    // QUALITY GATE (Phase 1): never write back master-rule violations, generic
    // stubs, or near-duplicates. This keeps the persisted wiki file clean so it
    // does not have to be hand-purged again, and so the Python agent-session
    // injector and the SPA see the same compliant set.
    const dismissed = getDismissedConstraintKeys();
    const kept = gateConstraints(
        improvements
            .filter(i => !dismissed.has(normalizeConstraintKey(i.constraint)))
            .map(i => i.constraint)
    ).kept;
    if (kept.length === 0) return false;

    const lines = kept.map(c => `- CONSTRAINT: ${c}`).join('\n');
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
    };
    rows.push(row);
    const ok = await writeConstraintRecords(rows);
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
