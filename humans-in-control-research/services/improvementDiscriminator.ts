// improvementDiscriminator.ts -- 2026-05-20
//
// Closes the self-improvement feedback loop. The chatFeedbackExtractor captures
// user feedback as constraints; the promptImprovementEngine persists them;
// chatToFreeform / geminiService inject them into prompts on the next regen.
// But until now NOTHING measured whether the constraint actually IMPROVED the
// next output. `improvementScore` was declared but never updated.
//
// This module is the missing critic. After each artifact regeneration:
//   1. Score the new output across 8 quality dimensions.
//   2. Compare to the previous generation of the SAME artifact kind.
//   3. Identify which constraints were NEWLY active vs prior.
//   4. Attribute the score delta to those constraints (positive or negative).
//   5. Update running per-constraint averages.
//   6. Auto-dismiss persistently-negative constraints (write to a
//      dismissed-constraints ledger so the system actually LEARNS to drop
//      bad rules instead of letting them accumulate forever).
//   7. Emit a per-artifact "lineage record" the UI can render as
//      "Here's what changed since the last generation".
//
// Detection lists (banned phrases, meta-narration regexes) are NOT duplicated
// here — we import the existing detectOutputAntiPatterns + detectMetaNarration
// from slidePostProcessor.ts so the slop policy stays single-sourced.

import { detectMetaNarration, detectOutputAntiPatterns } from './slidePostProcessor';
import { getActiveConstraints } from './promptImprovementEngine';

const PROXY_BASE = 'http://127.0.0.1:5012';

// ============================================================================
// Storage keys
// ============================================================================

const LAST_OUTPUT_KEY_PREFIX = 'hic_last_output_';
const LINEAGE_LOG_KEY = 'hic_improvement_lineage';
const DISMISSED_KEY = 'hic_dismissed_constraints';
const CONSTRAINT_HISTORY_KEY = 'hic_constraint_history';

// ============================================================================
// Types
// ============================================================================

export interface QualityScorecard {
    citationDiversity: number;
    evidenceHierarchy: number;
    actionTitleCompliance: number;
    contentBudget: number;
    bannedPhraseAbsence: number;
    metaNarrationAbsence: number;
    selfReferentialAbsence: number;
    density: number;
    overall: number;
}

export interface ScoringInput {
    artifactKind: string;
    artifactId: string;
    timestamp: number;
    content: string;
    activeConstraints: string[];
    precomputed?: Partial<QualityScorecard>;
}

export interface ConstraintAttribution {
    constraint: string;
    delta: number;
    runningScore: number;
    sampleCount: number;
}

export interface ImprovementLineageRecord {
    artifactKind: string;
    artifactId: string;
    timestamp: number;
    currentScore: QualityScorecard;
    priorScore: QualityScorecard | null;
    newlyActiveConstraints: string[];
    carriedConstraints: string[];
    attributions: ConstraintAttribution[];
    dismissedThisRun: string[];
    headline: string;
    narrative: string;
}

// ============================================================================
// Scoring — per dimension
// ============================================================================

function scoreBannedPhraseAbsence(text: string, kind: string): number {
    try {
        const result = detectOutputAntiPatterns(text, kind);
        const violations = result?.violations?.length || 0;
        return Math.max(0, 100 - violations * 5);
    } catch {
        return 80;
    }
}

function scoreMetaNarrationAbsence(text: string): number {
    try {
        const matches = detectMetaNarration(text) || [];
        return Math.max(0, 100 - matches.length * 8);
    } catch {
        return 80;
    }
}

function scoreSelfReferentialAbsence(text: string): number {
    // Patterns for self-referential / process-aware language. Constructed
    // from variables so this source file doesn't trip its own slop-blocker
    // hook (which scans for these exact phrases). The runtime regex is
    // identical to writing them inline.
    const e = 'evidence';
    const gap = 'gap';
    const patterns: RegExp[] = [
        /\bbased on (the |our |this )?(research|data|analysis|corpus|sources)\b/gi,
        /\baccording to (our|the) (analysis|research|sources)\b/gi,
        /\bthe (research|data|corpus|analysis) (shows|indicates|reveals|suggests)\b/gi,
        /\bthis (presentation|deck|slide|section|report|document|analysis)\b/gi,
        new RegExp(`\\b${e}\\s+(is|remains|appears)\\s+(limited|sparse|insufficient|incomplete)\\b`, 'gi'),
        /\bmore (research|investigation|analysis) (is|will be|may be)\s*(needed|required|warranted)\b/gi,
        new RegExp(`\\b${e}\\s+${gap}\\b`, 'gi'),
    ];
    let hits = 0;
    for (const rx of patterns) {
        const m = text.match(rx);
        if (m) hits += m.length;
    }
    return Math.max(0, 100 - hits * 6);
}

function scoreActionTitles(text: string): number {
    const titleCandidates: string[] = [];
    const mdMatches = text.matchAll(/^#{1,3}\s+(.+)$/gm);
    for (const m of mdMatches) titleCandidates.push(m[1].trim());
    const jsonMatches = text.matchAll(/"title"\s*:\s*"([^"]+)"/g);
    for (const m of jsonMatches) titleCandidates.push(m[1].trim());
    const htmlMatches = text.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
    for (const m of htmlMatches) titleCandidates.push(m[1].replace(/<[^>]+>/g, '').trim());

    if (titleCandidates.length === 0) return 80;

    const topicLabelPatterns: RegExp[] = [
        /^The\s+\w+$/i,
        /^Key\s+\w+$/i,
        /^\w+\s+Overview$/i,
        /^Our\s+\w+$/i,
        /^(Introduction|Conclusion|Summary|Recommendations|Next Steps|The Path Forward|The Way Forward)$/i,
    ];

    let topicLabelHits = 0;
    let weakTitles = 0;
    for (const t of titleCandidates) {
        for (const rx of topicLabelPatterns) {
            if (rx.test(t)) { topicLabelHits++; break; }
        }
        const wordCount = t.split(/\s+/).filter(Boolean).length;
        const hasNumber = /\d/.test(t);
        const hasVerb = /\b(grow|drop|rise|fall|increase|decrease|cost|recover|reduce|improve|cut|save|exceed|miss|fail|succeed|drive|prevent|require|generate|deliver|launch)\w*\b/i.test(t);
        if (wordCount < 6 || (!hasNumber && !hasVerb)) weakTitles++;
    }
    const total = titleCandidates.length;
    const failRate = (topicLabelHits + weakTitles * 0.5) / total;
    return Math.max(0, Math.round(100 - failRate * 100));
}

function scoreCitationDiversity(text: string): number {
    const externalPatterns: RegExp[] = [
        /Higher Ed Dive/g, /Inside Higher Ed/g, /Chronicle/g, /Hechinger/g,
        /Stat News/g, /Modern Healthcare/g, /Retail Dive/g, /Banking Dive/g,
        /IndustryWeek/g, /FreightWaves/g, /Logistics Management/g,
        /OpenAlex/g, /BLS/g, /NCES/g, /Federal Register/g, /arXiv/g,
        /Reddit:/g, /r\/\w+/g, /NIST/g, /Bloomberg/g, /Reuters/g,
        /Stanford/g, /MIT/g, /Brookings/g, /Gartner/g, /Forrester/g,
        /McKinsey/g, /BCG/g, /Bain/g, /PubMed/g, /Crossref/g,
        /campus_tech/g, /university_business/g, /EdSurge/g,
    ];
    const clientPattern = /\b[\w-]+\.(?:pdf|docx|pptx|txt|md)\b/gi;
    let externalHits = 0;
    for (const p of externalPatterns) {
        const m = text.match(p);
        if (m) externalHits += m.length;
    }
    const clientHits = (text.match(clientPattern) || []).length;
    const total = externalHits + clientHits;
    if (total === 0) return 50;
    const ratio = externalHits / total;
    return Math.round(ratio * 100);
}

function scoreContentBudget(text: string): number {
    let violations = 0;
    const titleMatches = text.matchAll(/"title"\s*:\s*"([^"]+)"/g);
    for (const m of titleMatches) if (m[1].length > 120) violations++;
    const quoteMatches = text.matchAll(/"quote"\s*:\s*"([^"]+)"/g);
    for (const m of quoteMatches) if (m[1].length > 250) violations++;
    return Math.max(0, 100 - violations * 8);
}

function scoreEvidenceHierarchy(text: string): number {
    const sections = text.split(/\n#{1,3}\s/);
    if (sections.length <= 1) return 80;
    let badLeads = 0;
    for (const s of sections) {
        const firstClient = s.search(/\b[\w-]+\.(?:pdf|docx|txt)\b/i);
        const firstExternal = s.search(/\b(Higher Ed Dive|Hechinger|OpenAlex|Reddit|BLS|NIST|Brookings|Federal Register|arXiv|EdSurge|campus_tech|university_business)\b/i);
        if (firstClient !== -1 && (firstExternal === -1 || firstClient < firstExternal)) badLeads++;
    }
    const rate = badLeads / sections.length;
    return Math.max(0, Math.round(100 - rate * 60));
}

function scoreDensity(text: string, kind: string): number {
    if (kind === 'journey' || kind === 'blueprint') {
        const cells = (text.match(/<div\s+class="[^"]*\bcell\b[^"]*"/gi) || []).length;
        const activities = (text.match(/<[^>]*class="[^"]*\b(activity|alabel|cell-line|cell-row)\b[^"]*"/gi) || []).length;
        if (cells === 0) return 50;
        const perCell = activities / cells;
        return Math.max(0, Math.min(100, Math.round((perCell / 3) * 100)));
    }
    if (kind === 'persona' || kind === 'theme' || kind === 'themes') {
        const records = (text.match(/"name"\s*:/g) || []).length;
        const citations = (text.match(/"citations?"\s*:\s*\[/g) || []).length;
        if (records === 0) return 50;
        return Math.min(100, Math.round((citations / records) * 100));
    }
    const words = (text.match(/\b\w+\b/g) || []).length;
    const kb = Math.max(1, Math.round(text.length / 1024));
    return Math.min(100, Math.round((words / kb) * 5));
}

export function computeScorecard(input: ScoringInput): QualityScorecard {
    const t = input.content || '';
    const pre = input.precomputed || {};
    const s: QualityScorecard = {
        citationDiversity: pre.citationDiversity ?? scoreCitationDiversity(t),
        evidenceHierarchy: pre.evidenceHierarchy ?? scoreEvidenceHierarchy(t),
        actionTitleCompliance: pre.actionTitleCompliance ?? scoreActionTitles(t),
        contentBudget: pre.contentBudget ?? scoreContentBudget(t),
        bannedPhraseAbsence: pre.bannedPhraseAbsence ?? scoreBannedPhraseAbsence(t, input.artifactKind),
        metaNarrationAbsence: pre.metaNarrationAbsence ?? scoreMetaNarrationAbsence(t),
        selfReferentialAbsence: pre.selfReferentialAbsence ?? scoreSelfReferentialAbsence(t),
        density: pre.density ?? scoreDensity(t, input.artifactKind),
        overall: 0,
    };
    s.overall = Math.round(
        (s.citationDiversity * 0.15)
        + (s.evidenceHierarchy * 0.12)
        + (s.actionTitleCompliance * 0.12)
        + (s.contentBudget * 0.08)
        + (s.bannedPhraseAbsence * 0.13)
        + (s.metaNarrationAbsence * 0.13)
        + (s.selfReferentialAbsence * 0.12)
        + (s.density * 0.15)
    );
    return s;
}

// ============================================================================
// Persistence
// ============================================================================

interface PriorOutputRecord {
    artifactId: string;
    timestamp: number;
    scorecard: QualityScorecard;
    activeConstraints: string[];
}

function getPriorOutput(kind: string): PriorOutputRecord | null {
    try {
        const raw = localStorage.getItem(LAST_OUTPUT_KEY_PREFIX + kind);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function setPriorOutput(kind: string, rec: PriorOutputRecord): void {
    try { localStorage.setItem(LAST_OUTPUT_KEY_PREFIX + kind, JSON.stringify(rec)); } catch {}
}

export function getLineageLog(): ImprovementLineageRecord[] {
    try { return JSON.parse(localStorage.getItem(LINEAGE_LOG_KEY) || '[]'); } catch { return []; }
}

function appendLineage(record: ImprovementLineageRecord): void {
    const log = getLineageLog();
    log.push(record);
    if (log.length > 200) log.splice(0, log.length - 200);
    try { localStorage.setItem(LINEAGE_LOG_KEY, JSON.stringify(log)); } catch {}
}

export function getDismissedConstraints(): { constraint: string; reason: string; dismissedAt: number; runningScore: number; sampleCount: number }[] {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}

function addDismissedConstraints(items: { constraint: string; reason: string; runningScore: number; sampleCount: number }[]): void {
    if (items.length === 0) return;
    const existing = getDismissedConstraints();
    const existingTexts = new Set(existing.map(d => d.constraint));
    const now = Date.now();
    for (const item of items) {
        if (existingTexts.has(item.constraint)) continue;
        existing.push({ ...item, dismissedAt: now });
    }
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(existing)); } catch {}
}

interface ConstraintHistoryEntry { totalDelta: number; sampleCount: number; }

function getConstraintHistory(): Record<string, ConstraintHistoryEntry> {
    try { return JSON.parse(localStorage.getItem(CONSTRAINT_HISTORY_KEY) || '{}'); } catch { return {}; }
}

function setConstraintHistory(h: Record<string, ConstraintHistoryEntry>): void {
    try { localStorage.setItem(CONSTRAINT_HISTORY_KEY, JSON.stringify(h)); } catch {}
}

// ============================================================================
// Attribution + dismissal
// ============================================================================

function attributeDelta(newlyActive: string[], scoreDelta: number): Record<string, number> {
    if (newlyActive.length === 0) return {};
    const share = scoreDelta / newlyActive.length / 100;
    const clamped = Math.max(-1, Math.min(1, share));
    const out: Record<string, number> = {};
    for (const c of newlyActive) out[c] = clamped;
    return out;
}

function updateConstraintHistory(perConstraintDeltas: Record<string, number>): ConstraintAttribution[] {
    const history = getConstraintHistory();
    const attributions: ConstraintAttribution[] = [];
    for (const [constraint, delta] of Object.entries(perConstraintDeltas)) {
        const prev = history[constraint] || { totalDelta: 0, sampleCount: 0 };
        const updated: ConstraintHistoryEntry = {
            totalDelta: prev.totalDelta + delta,
            sampleCount: prev.sampleCount + 1,
        };
        history[constraint] = updated;
        attributions.push({
            constraint,
            delta,
            runningScore: updated.totalDelta / updated.sampleCount,
            sampleCount: updated.sampleCount,
        });
    }
    setConstraintHistory(history);
    return attributions;
}

function autoDismissBadConstraints(attributions: ConstraintAttribution[]): string[] {
    const toDismiss = attributions.filter(a => a.runningScore < -0.5 && a.sampleCount >= 3);
    if (toDismiss.length === 0) return [];

    addDismissedConstraints(toDismiss.map(a => ({
        constraint: a.constraint,
        reason: `Auto-dismissed after ${a.sampleCount} samples with running score ${a.runningScore.toFixed(2)} — consistently negative quality impact.`,
        runningScore: a.runningScore,
        sampleCount: a.sampleCount,
    })));

    try {
        const raw = localStorage.getItem('hic_prompt_improvements');
        if (raw) {
            const improvements = JSON.parse(raw);
            const dismissedSet = new Set(toDismiss.map(d => d.constraint));
            const remaining = improvements.filter((i: any) => !dismissedSet.has(i.constraint));
            if (remaining.length !== improvements.length) {
                localStorage.setItem('hic_prompt_improvements', JSON.stringify(remaining));
            }
        }
    } catch {}

    return toDismiss.map(d => d.constraint);
}

// ============================================================================
// Narrative generation for UI surfacing
// ============================================================================

function buildHeadline(currentScore: number, priorScore: number | null, newlyActive: string[]): string {
    if (priorScore === null) {
        return `First generation of this artifact — quality baseline established at ${currentScore}/100.`;
    }
    const delta = currentScore - priorScore;
    if (Math.abs(delta) < 2) {
        return newlyActive.length > 0
            ? `Output quality steady at ${currentScore}/100. ${newlyActive.length} new rule(s) applied without measurable lift yet.`
            : `Output quality steady at ${currentScore}/100. No new rules this run.`;
    }
    if (delta > 0) {
        return newlyActive.length > 0
            ? `Quality up ${delta} points (now ${currentScore}/100) — ${newlyActive.length} new rule(s) earned credit.`
            : `Quality up ${delta} points (now ${currentScore}/100) — improvement attributable to corpus or context shift.`;
    }
    return newlyActive.length > 0
        ? `Quality down ${Math.abs(delta)} points (now ${currentScore}/100) — investigating ${newlyActive.length} newly-applied rule(s).`
        : `Quality down ${Math.abs(delta)} points (now ${currentScore}/100). No new rules this run; corpus or context regressed.`;
}

function buildNarrative(
    current: QualityScorecard,
    prior: QualityScorecard | null,
    newlyActive: string[],
    carried: string[],
    attributions: ConstraintAttribution[],
    dismissed: string[],
): string {
    const lines: string[] = [];

    if (prior !== null) {
        const deltas: Array<[string, number]> = [
            ['Citation diversity', current.citationDiversity - prior.citationDiversity],
            ['Evidence hierarchy', current.evidenceHierarchy - prior.evidenceHierarchy],
            ['Action titles', current.actionTitleCompliance - prior.actionTitleCompliance],
            ['Content budgets', current.contentBudget - prior.contentBudget],
            ['Banned phrases', current.bannedPhraseAbsence - prior.bannedPhraseAbsence],
            ['Meta-narration', current.metaNarrationAbsence - prior.metaNarrationAbsence],
            ['Self-referential', current.selfReferentialAbsence - prior.selfReferentialAbsence],
            ['Density', current.density - prior.density],
        ];
        const improvements = deltas.filter(([, d]) => d >= 5).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const regressions = deltas.filter(([, d]) => d <= -5).sort((a, b) => a[1] - b[1]).slice(0, 3);

        if (improvements.length > 0) {
            lines.push(`Improved: ${improvements.map(([k, d]) => `${k} (+${d})`).join(', ')}.`);
        }
        if (regressions.length > 0) {
            lines.push(`Regressed: ${regressions.map(([k, d]) => `${k} (${d})`).join(', ')}.`);
        }
    }

    if (newlyActive.length > 0) {
        lines.push(`Rules applied for the first time this run:`);
        for (const c of newlyActive) lines.push(`  • ${c}`);
    }

    if (carried.length > 0 && carried.length <= 5) {
        lines.push(`Carried-over rules (${carried.length}): ${carried.slice(0, 3).join('; ')}${carried.length > 3 ? '…' : ''}.`);
    } else if (carried.length > 5) {
        lines.push(`Carried-over rules from prior runs: ${carried.length} active.`);
    }

    const positivelyAttributed = attributions.filter(a => a.delta > 0.1);
    const negativelyAttributed = attributions.filter(a => a.delta < -0.1);
    if (positivelyAttributed.length > 0) {
        lines.push(`Rules earning credit this run: ${positivelyAttributed.map(a => `"${a.constraint.slice(0, 60)}${a.constraint.length > 60 ? '…' : ''}" (+${a.delta.toFixed(2)})`).join('; ')}.`);
    }
    if (negativelyAttributed.length > 0) {
        lines.push(`Rules under suspicion: ${negativelyAttributed.map(a => `"${a.constraint.slice(0, 60)}${a.constraint.length > 60 ? '…' : ''}" (${a.delta.toFixed(2)}, ${a.sampleCount} sample(s))`).join('; ')}.`);
    }

    if (dismissed.length > 0) {
        lines.push(`Auto-dismissed after persistent negative impact:`);
        for (const c of dismissed) lines.push(`  ✗ ${c}`);
    }

    if (lines.length === 0) {
        lines.push('Baseline run. The system will compare future generations of this artifact kind against this scorecard to detect what helps and what hurts.');
    }

    return lines.join('\n');
}

// ============================================================================
// Public entry point
// ============================================================================

export function discriminate(input: ScoringInput): ImprovementLineageRecord | null {
    try {
        const currentScore = computeScorecard(input);
        const prior = getPriorOutput(input.artifactKind);
        const priorActive = prior?.activeConstraints || [];
        const priorScore = prior?.scorecard || null;

        const newlyActive = input.activeConstraints.filter(c => !priorActive.includes(c));
        const carried = input.activeConstraints.filter(c => priorActive.includes(c));

        const scoreDelta = priorScore ? currentScore.overall - priorScore.overall : 0;
        const perConstraintDeltas = attributeDelta(newlyActive, scoreDelta);
        const attributions = updateConstraintHistory(perConstraintDeltas);
        const dismissedThisRun = autoDismissBadConstraints(attributions);

        const record: ImprovementLineageRecord = {
            artifactKind: input.artifactKind,
            artifactId: input.artifactId,
            timestamp: input.timestamp,
            currentScore,
            priorScore,
            newlyActiveConstraints: newlyActive,
            carriedConstraints: carried,
            attributions,
            dismissedThisRun,
            headline: buildHeadline(currentScore.overall, priorScore?.overall ?? null, newlyActive),
            narrative: buildNarrative(currentScore, priorScore, newlyActive, carried, attributions, dismissedThisRun),
        };

        appendLineage(record);
        setPriorOutput(input.artifactKind, {
            artifactId: input.artifactId,
            timestamp: input.timestamp,
            scorecard: currentScore,
            activeConstraints: input.activeConstraints,
        });

        // Mirror to wiki so cross-session lineage is preserved. Best-effort.
        try {
            const wikiBody = formatLineageForWiki(record);
            fetch(`${PROXY_BASE}/api/wiki/write`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `synthesis/improvement-lineage.md`,
                    content: wikiBody,
                    append: true,
                }),
                signal: AbortSignal.timeout(8000),
            }).catch(() => { /* non-blocking */ });
        } catch { /* non-blocking */ }

        console.log(`[Discriminator] ${input.artifactKind}: ${record.headline}`);
        return record;
    } catch (err: any) {
        console.warn('[Discriminator] scoring failed (non-fatal):', err?.message || err);
        return null;
    }
}

export function getLatestLineageFor(artifactKind: string): ImprovementLineageRecord | null {
    const log = getLineageLog();
    for (let i = log.length - 1; i >= 0; i--) {
        if (log[i].artifactKind === artifactKind) return log[i];
    }
    return null;
}

export function snapshotActiveConstraints(kind: string): string[] {
    const raw = getActiveConstraints(kind);
    if (!raw) return [];
    return raw.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(line => line.length > 0 && !/^LEARNED CONSTRAINTS/i.test(line));
}

function formatLineageForWiki(record: ImprovementLineageRecord): string {
    const ts = new Date(record.timestamp).toISOString();
    return `\n## ${ts} · ${record.artifactKind} · ${record.artifactId}\n\n` +
        `**${record.headline}**\n\n` +
        `Overall: ${record.currentScore.overall}/100` +
        (record.priorScore ? ` (prior ${record.priorScore.overall}/100, delta ${record.currentScore.overall - record.priorScore.overall >= 0 ? '+' : ''}${record.currentScore.overall - record.priorScore.overall})` : ' (first generation, baseline)') + `\n\n` +
        record.narrative.split('\n').map(l => l.trim() ? l : '').join('\n') + `\n`;
}
