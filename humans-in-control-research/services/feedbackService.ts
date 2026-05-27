/**
 * Feedback Service — Client-side bridge to the proxy /api/feedback/* endpoints.
 *
 * Wraps the JSONL feedback log and aggregate index. Used by FeedbackWidget
 * and the learning engine.
 *
 * Created 2026-05-22 as part of the self-improvement loop, Phase 2.
 */

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface FeedbackEvent {
    id: string;
    timestamp: string;
    engagement_slug: string;
    deliverable_id: string;
    deliverable_type: string;
    section_scope: string | null;
    signal_type: 'vote' | 'stars' | 'text' | 'edit' | 'regenerate';
    vote_value: 'up' | 'down' | null;
    stars_value: 1 | 2 | 3 | 4 | 5 | null;
    text_value: string | null;
    applied_immediately: boolean;
    skill_version_active: string | null;
    constraints_active: string[];
    user_id_or_anon: string;
}

export interface FeedbackSummary {
    id: string;
    timestamp: string;
    engagement_slug: string;
    deliverable_id: string;
    signal_type: string;
    vote_value?: string | null;
    stars_value?: number | null;
    text_excerpt?: string | null;
    applied_immediately?: boolean;
    skill_version_active?: string | null;
}

export type FeedbackIndex = Record<string, Record<string, FeedbackSummary[]>>;

function generateEventId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 2026-05-23 — Classify a feedback text into chunking signals and persist
 * them to localStorage. Read by chunker entry points (e.g., slideDeckChunker)
 * on the next generation so the same user complaint visibly drives a
 * different chunk plan.
 *
 * Map from `deliverable_type` to localStorage key + chunker artifact:
 *   - 'presentations' | 'slides' | 'case-study' -> hic_chunk_feedback_slides
 *   - 'roadmap' -> hic_chunk_feedback_roadmap (Phase 3)
 *   - etc.
 */
const INCOMPLETE_PATTERNS = [
    /\btruncat/i, /\bcut[\s-]?off\b/i, /\bstop(?:ped|s)\s+(?:at|early|mid)/i,
    /\bonly\s+got\s+\d+/i, /\bmissing\s+(?:slides?|themes?|sections?|items?)/i,
    /\bdidn'?t\s+finish/i, /\bincomplet/i, /\bpartial\b/i, /\bnot\s+all\b/i,
];
const TOO_SHORT_PATTERNS = [
    /\bmore\s+depth\b/i, /\bmore\s+detail/i, /\btoo\s+(?:brief|short|thin|shallow)/i,
    /\bneeds?\s+more\b/i, /\bexpand\b/i, /\bdeepen\b/i, /\bshallow\b/i, /\bsparse\b/i,
];

function classifyChunkingSignals(text: string | null | undefined): {
    incomplete: boolean;
    tooShort: boolean;
} {
    if (!text) return { incomplete: false, tooShort: false };
    const incomplete = INCOMPLETE_PATTERNS.some(re => re.test(text));
    const tooShort = TOO_SHORT_PATTERNS.some(re => re.test(text));
    return { incomplete, tooShort };
}

function persistChunkingSignals(
    deliverable_type: string,
    signals: { incomplete: boolean; tooShort: boolean },
): void {
    // Map deliverable_type variants to canonical artifact buckets
    const slideTypes = ['presentations', 'slides', 'case-study', 'case_study', 'deck'];
    const bucket = slideTypes.includes(deliverable_type.toLowerCase())
        ? 'slides'
        : deliverable_type.toLowerCase();
    if (!signals.incomplete && !signals.tooShort) return;
    try {
        const key = `hic_chunk_feedback_${bucket}`;
        const existing = (() => {
            try { return JSON.parse(localStorage.getItem(key) || '{}'); }
            catch { return {}; }
        })();
        const merged = {
            incomplete: existing.incomplete || signals.incomplete,
            tooShort: existing.tooShort || signals.tooShort,
            lastSeenAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(merged));
    } catch {
        /* localStorage unavailable */
    }
}

/**
 * Submit a feedback event. Returns true on success.
 *
 * Construct events via this helper so the id, timestamp, and defaults are
 * applied consistently. Either signal_type-specific value field must be set:
 *   - vote: vote_value: 'up'|'down'
 *   - stars: stars_value: 1-5
 *   - text: text_value: string
 *   - edit / regenerate: free-form text_value optional
 */
export async function submitFeedback(input: {
    engagement_slug: string;
    deliverable_id: string;
    deliverable_type: string;
    section_scope?: string | null;
    signal_type: FeedbackEvent['signal_type'];
    vote_value?: 'up' | 'down' | null;
    stars_value?: 1 | 2 | 3 | 4 | 5 | null;
    text_value?: string | null;
    applied_immediately?: boolean;
    skill_version_active?: string | null;
    constraints_active?: string[];
    user_id_or_anon?: string;
}): Promise<{ ok: boolean; id: string | null; path?: string; error?: string }> {
    const event: FeedbackEvent = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        engagement_slug: input.engagement_slug,
        deliverable_id: input.deliverable_id,
        deliverable_type: input.deliverable_type,
        section_scope: input.section_scope || null,
        signal_type: input.signal_type,
        vote_value: input.vote_value || null,
        stars_value: input.stars_value || null,
        text_value: input.text_value || null,
        applied_immediately: input.applied_immediately || false,
        skill_version_active: input.skill_version_active || null,
        constraints_active: input.constraints_active || [],
        user_id_or_anon: input.user_id_or_anon || 'anon',
    };

    try {
        const resp = await fetch(`${PROXY_BASE}/api/feedback/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
        if (!resp.ok) {
            const err = await resp.text();
            return { ok: false, id: null, error: err };
        }
        const data = await resp.json();
        // 2026-05-23 — Classify feedback text into chunking signals and persist
        // to localStorage. Chunker entry points read these on the next
        // generation so user complaints about truncation/depth visibly
        // change the chunk plan.
        if (input.text_value) {
            const sig = classifyChunkingSignals(input.text_value);
            if (sig.incomplete || sig.tooShort) {
                persistChunkingSignals(input.deliverable_type, sig);
            }
        }
        return { ok: true, id: event.id, path: data.path };
    } catch (err: any) {
        return { ok: false, id: null, error: err?.message || String(err) };
    }
}

/**
 * Read all feedback events for a single deliverable.
 * Returns an empty array if no feedback exists yet.
 */
export async function readDeliverableFeedback(
    engagement_slug: string,
    deliverable_id: string,
): Promise<FeedbackEvent[]> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/feedback/read/${encodeURIComponent(engagement_slug)}/${encodeURIComponent(deliverable_id)}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.events || [];
    } catch {
        return [];
    }
}

/**
 * Read the aggregate feedback index. Used by the learning engine and the
 * "what changed" surfaces to find recent patterns per deliverable type.
 */
export async function readFeedbackIndex(): Promise<FeedbackIndex> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/feedback/index`);
        if (!resp.ok) return {};
        const data = await resp.json();
        return data.index || {};
    } catch {
        return {};
    }
}

/**
 * Count prior feedback events of the given type+section. Used to show the
 * "N prior signals applied to this deliverable type" chip in the widget.
 */
export async function countPriorSignals(
    deliverable_type: string,
    section_scope?: string | null,
): Promise<number> {
    const idx = await readFeedbackIndex();
    const bucket = idx[deliverable_type];
    if (!bucket) return 0;
    const sectionKey = section_scope || '__top__';
    const events = bucket[sectionKey] || [];
    return events.length;
}

/**
 * 2026-05-23 — Post-submit auto-invoke of the learning engine.
 *
 * Before this hook existed, runLearningPass() was a debug-only function
 * reachable only from window.__hicSelfImprovement. That meant feedback
 * never produced a skill patch — the loop was broken at the wiring layer,
 * not the algorithm layer.
 *
 * Now every successful feedback submit triggers the pass in the background.
 * The result is returned (when await'd) so the UI can render concrete
 * evidence: "Skill X patched v1.3 -> v1.4 because of this signal."
 *
 * Lazy-imported to keep the feedbackService module dependency-free at
 * load time (learningEngine has a heavier dependency footprint).
 */
export interface LearningEvidence {
    skillsPatched: Array<{ name: string; deliverableType: string; sourceSignalCount: number }>;
    chunkConfigsPromoted: Array<{ artifactType: string; sourceSignalCount: number }>;
    constraintsAdded: number;
    antiPatternsAdded: number;
    exemplarsAdded: number;
    frameworkUpdatesQueued: number;
    /** Number of signals tracked for this (deliverable_type, section_scope) right now. */
    progressToPromotion: { current: number; threshold: number };
    /** True if any change was applied during this pass. */
    anyChange: boolean;
    /** Diagnostic: each cluster the pass saw and what target it routed to. */
    routedClusters: Array<{ deliverableType: string; section: string; target: string; confidence: number; applied: boolean }>;
    /** Wall-clock duration of the pass, in ms. */
    durationMs: number;
}

export async function triggerLearningPassAfterFeedback(opts: {
    deliverable_type: string;
    section_scope?: string | null;
}): Promise<LearningEvidence> {
    const { runLearningPass } = await import('./learningEngine');
    const startedAt = Date.now();
    const result = await runLearningPass();
    const evidence: LearningEvidence = {
        skillsPatched: [],
        chunkConfigsPromoted: [],
        constraintsAdded: 0,
        antiPatternsAdded: 0,
        exemplarsAdded: 0,
        frameworkUpdatesQueued: 0,
        progressToPromotion: { current: 0, threshold: 3 },
        anyChange: result.applied.length > 0,
        routedClusters: [],
        durationMs: Date.now() - startedAt,
    };
    for (const cand of result.applied) {
        const isCurrentDeliverable = cand.cluster.deliverableType.toLowerCase() === opts.deliverable_type.toLowerCase();
        evidence.routedClusters.push({
            deliverableType: cand.cluster.deliverableType,
            section: cand.cluster.sectionScope || 'overall',
            target: cand.target,
            confidence: cand.confidence,
            applied: true,
        });
        if (cand.target === 'skill-patch') {
            evidence.skillsPatched.push({
                name: cand.cluster.deliverableType,
                deliverableType: cand.cluster.deliverableType,
                sourceSignalCount: cand.cluster.count,
            });
        } else if (cand.target === 'chunk-config') {
            evidence.chunkConfigsPromoted.push({
                artifactType: cand.cluster.deliverableType,
                sourceSignalCount: cand.cluster.count,
            });
        } else if (cand.target === 'constraint') {
            evidence.constraintsAdded += 1;
        } else if (cand.target === 'anti-pattern') {
            evidence.antiPatternsAdded += 1;
        } else if (cand.target === 'exemplar') {
            evidence.exemplarsAdded += 1;
        } else if (cand.target === 'framework-page') {
            evidence.frameworkUpdatesQueued += 1;
        }
    }
    for (const cand of result.queuedForReview) {
        evidence.routedClusters.push({
            deliverableType: cand.cluster.deliverableType,
            section: cand.cluster.sectionScope || 'overall',
            target: cand.target,
            confidence: cand.confidence,
            applied: false,
        });
    }
    // Calculate progress against threshold for the specific deliverable+section
    // the user just acted on. We re-read the index after the pass because
    // submitFeedback already updated it.
    try {
        const index = await readFeedbackIndex();
        const sectionKey = opts.section_scope || '__top__';
        const bucket = index[opts.deliverable_type] || {};
        const events = bucket[sectionKey] || [];
        // Count only negative signals (the threshold gate)
        let negativeCount = 0;
        for (const e of events) {
            if (e.vote_value === 'down' || (typeof e.stars_value === 'number' && e.stars_value <= 2) || (!e.vote_value && !e.stars_value && e.text_excerpt)) {
                negativeCount += 1;
            }
        }
        evidence.progressToPromotion = { current: negativeCount, threshold: 3 };
    } catch {
        // Best-effort
    }
    return evidence;
}

/**
 * Compute a quick polarity summary for a deliverable's feedback history.
 * Used by the learning engine and the per-deliverable receipt.
 */
export function summarizeFeedback(events: FeedbackEvent[]): {
    total: number;
    thumbsUp: number;
    thumbsDown: number;
    avgStars: number | null;
    textCount: number;
    appliedNow: number;
    latest?: FeedbackEvent;
} {
    let thumbsUp = 0;
    let thumbsDown = 0;
    let starSum = 0;
    let starCount = 0;
    let textCount = 0;
    let appliedNow = 0;
    for (const e of events) {
        if (e.vote_value === 'up') thumbsUp++;
        if (e.vote_value === 'down') thumbsDown++;
        if (typeof e.stars_value === 'number') {
            starSum += e.stars_value;
            starCount++;
        }
        if (e.text_value) textCount++;
        if (e.applied_immediately) appliedNow++;
    }
    const latest = events[events.length - 1];
    return {
        total: events.length,
        thumbsUp,
        thumbsDown,
        avgStars: starCount > 0 ? starSum / starCount : null,
        textCount,
        appliedNow,
        latest,
    };
}
