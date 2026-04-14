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
}

// --- STORAGE KEYS ---
const EDIT_LOG_KEY = 'hic_prompt_edit_log';
const PATTERNS_KEY = 'hic_prompt_patterns';
const IMPROVEMENTS_KEY = 'hic_prompt_improvements';

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
        const constraint = generateConstraint(field, dominantType, avgDelta, edits);

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
        if (p.status === 'pending' && p.occurrences >= 5 && !existingFields.has(key)) {
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
export function approveConstraint(patternIndex: number): void {
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
 * Dismiss a suggested constraint.
 */
export function dismissConstraint(patternIndex: number): void {
    const patterns = getPatterns();
    if (patterns[patternIndex]) {
        patterns[patternIndex].status = 'dismissed';
        localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
    }
}

/**
 * Get all approved constraints as a prompt injection string.
 * This is appended to system prompts to enforce learned constraints.
 */
export function getActiveConstraints(): string {
    const improvements = getImprovements();
    if (improvements.length === 0) return '';

    const constraints = improvements.map(imp => `- ${imp.constraint}`).join('\n');
    return `\n\nLEARNED CONSTRAINTS (from user feedback patterns):\n${constraints}`;
}

// --- DATA ACCESS ---

export function getEditLog(): EditSignal[] {
    try {
        return JSON.parse(localStorage.getItem(EDIT_LOG_KEY) || '[]');
    } catch { return []; }
}

export function getPatterns(): EditPattern[] {
    try {
        return JSON.parse(localStorage.getItem(PATTERNS_KEY) || '[]');
    } catch { return []; }
}

export function getImprovements(): PromptImprovement[] {
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
 * Clear all improvement data (full reset).
 */
export function resetAll(): void {
    localStorage.removeItem(EDIT_LOG_KEY);
    localStorage.removeItem(PATTERNS_KEY);
    localStorage.removeItem(IMPROVEMENTS_KEY);
}

/**
 * P6-06: Cross-session knowledge compounding.
 * Loads learned constraints from the wiki and merges them into localStorage.
 * Call this at app startup so that constraints learned in previous sessions
 * (including by other users) are available for prompt injection.
 */
export async function loadWikiConstraints(): Promise<number> {
    try {
        const resp = await fetch('http://localhost:5012/api/wiki/read/synthesis/learned-constraints.md');
        if (!resp.ok) return 0;
        const data = await resp.json();
        const content = data.content || '';

        // Parse constraint entries from the wiki page
        // Format: "- CONSTRAINT: {text}" lines
        const constraintLines = content.match(/^- CONSTRAINT: .+$/gm) || [];
        if (constraintLines.length === 0) return 0;

        const existing = getImprovements();
        const existingTexts = new Set(existing.map(i => i.constraint));
        let added = 0;

        for (const line of constraintLines) {
            const text = line.replace(/^- CONSTRAINT: /, '').trim();
            if (text && !existingTexts.has(text)) {
                existing.push({
                    id: `wiki_${Date.now()}_${added}`,
                    field: 'wiki-imported',
                    stage: 'cross-session',
                    constraint: text,
                    appliedAt: Date.now(),
                    improvementScore: 0,
                });
                existingTexts.add(text);
                added++;
            }
        }

        if (added > 0) {
            localStorage.setItem(IMPROVEMENTS_KEY, JSON.stringify(existing));
            console.log(`[PromptImprovement] Loaded ${added} constraints from wiki (cross-session compounding)`);
        }
        return added;
    } catch (e) {
        // Wiki may not be available (e.g., proxy not running) — non-blocking
        return 0;
    }
}

/**
 * P6-06: Export current localStorage constraints to wiki for cross-session persistence.
 */
export async function exportConstraintsToWiki(): Promise<boolean> {
    const improvements = getImprovements();
    if (improvements.length === 0) return false;

    const lines = improvements.map(i => `- CONSTRAINT: ${i.constraint}`).join('\n');
    const content = `---\ntitle: Learned Constraints\ntype: synthesis\nupdated: ${new Date().toISOString().split('T')[0]}\n---\n\n# Learned Constraints\n\nAuto-generated from user edit patterns across research sessions.\n\n${lines}\n`;

    try {
        const resp = await fetch('http://localhost:5012/api/wiki/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'synthesis/learned-constraints.md', content }),
        });
        return resp.ok;
    } catch {
        return false;
    }
}
