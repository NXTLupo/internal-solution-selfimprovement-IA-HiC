// sessionService.ts - 2026-05-11 (HiC-Session-Save)
//
// Total research session persistence. Hides the proxy endpoints behind a
// clean API: save / list / load / delete + serializer/deserializer that
// know how to turn App-level state into the JSON the proxy expects (and
// back). Use this from App.tsx for auto-save and Continue-Session flows.

const PROXY_BASE = 'http://127.0.0.1:5012';

export interface SessionSummary {
    slug: string;
    title: string;
    schema_version?: number;
    saved_at: string;
    created_at?: string;
    research_goal?: string;
    deliverable_count?: number;
    chat_turn_count?: number;
    topic_count?: number;
    source_count?: number;
    bytes?: number;
}

/** The full snapshot the proxy persists. Each top-level section maps to
 *  a JSON file on disk under hic-workspace/sessions/{slug}/. */
export interface SessionSnapshot {
    metadata: {
        title: string;
        research_goal: string;
        created_at?: string;
        completed_at?: string;
        status?: 'in-progress' | 'complete' | 'archived';
        selected_outputs?: string[];
        selected_lens?: string;
    };
    state: {
        // Generated deliverables
        themes?: any;
        personas?: any;
        journey_stages?: any;
        recommendations?: any;
        prd?: any;
        roadmap?: any;
        tech_architecture?: any;
        gap_analysis?: any;
        tech_audit?: any;
        competitive_analysis?: any;
        strategic_report?: any;
        synthesis?: any;
        structure?: any;
        narrative?: any;
        org_chart?: any;
        ingestion?: any;
        // Configs from the landing page
        subreddits_input?: string;
        analysis_approach?: string;
        // Per-source toggles (so reloading shows the same checkbox state)
        source_toggles?: Record<string, boolean>;
        // File metadata (full bodies live in the wiki/uploads/ archive)
        file_names?: string[];
        // DF-I1 (2026-08-20, plans/deerflow-harness-transfer-2026-08-20.md):
        // chat-generated artifacts. Their ABSENCE here was the recorded live
        // defect: a deck generated inside a restored session vanished on the
        // next restore, because the autosave could not see state that lives in
        // the chat panel. deer-flow's DurableContextMiddleware fixes the same
        // class of bug by projecting derived state into a durable record at
        // generation time instead of hoping the saver can reach it.
        slides?: any[];
        deliverables?: any[];
    };
    chat: Array<{
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        model?: string;
        timestamp?: number;
        durationMs?: number;
        citations?: any[];
        presentationUrl?: string;
        presentationMeta?: any;
        imageData?: string;
        libraryItems?: any[];
    }>;
    topic_model?: any;        // full TopicResult shape
    knowledge_graph?: any;    // KG { nodes, edges, stats }
    corpus?: {
        text?: string;
        chunk_map?: Record<string, any>;
        live_source_results?: any[];
        source_references?: any[];
    };
    reddit_deep?: any[];      // raw deep-Reddit items for topic-modeling re-runs
    learned_constraints?: string;
}

/**
 * DF-I1 - DURABLE ARTIFACT PROJECTION.
 *
 * Chat-generated artifacts (decks, deliverables) live in CorpusChatPanel state,
 * which the autosave in App.tsx cannot reach. Rather than thread props through
 * three mount sites, the panel PROJECTS its artifacts here as they are produced
 * and the saver reads the projection. This mirrors deer-flow's
 * DurableContextMiddleware, which captures delegations and loaded skills into
 * durable state BEFORE compaction can drop them: derived state is recorded when
 * it is created, not when someone remembers to look for it.
 */
export interface DurableArtifacts { slides?: any[]; deliverables?: any[] }

let _durableArtifacts: DurableArtifacts = {};
const _durableSubs = new Set<(d: DurableArtifacts) => void>();

export function projectDurableArtifacts(patch: Partial<DurableArtifacts>): void {
    _durableArtifacts = { ..._durableArtifacts, ...patch };
    for (const cb of Array.from(_durableSubs)) {
        try { cb(_durableArtifacts); } catch { /* a broken subscriber never breaks the projection */ }
    }
}

export function readDurableArtifacts(): DurableArtifacts {
    return _durableArtifacts;
}

/** Subscribe to projection changes. Returns the unsubscribe function. */
export function subscribeDurableArtifacts(cb: (d: DurableArtifacts) => void): () => void {
    _durableSubs.add(cb);
    return () => { _durableSubs.delete(cb); };
}

/** Clear on a new engagement so one run's deck cannot leak into the next. */
export function resetDurableArtifacts(): void {
    _durableArtifacts = {};
    for (const cb of Array.from(_durableSubs)) {
        try { cb(_durableArtifacts); } catch { /* ignore */ }
    }
}

export async function saveSession(snapshot: SessionSnapshot, slug?: string): Promise<{
    ok: boolean; slug: string; title: string; saved_at: string; error?: string;
}> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug,
                title: snapshot.metadata.title,
                sections: {
                    metadata: snapshot.metadata,
                    state: snapshot.state,
                    chat: snapshot.chat,
                    topic_model: snapshot.topic_model,
                    knowledge_graph: snapshot.knowledge_graph,
                    corpus: snapshot.corpus,
                    reddit_deep: snapshot.reddit_deep,
                    learned_constraints: snapshot.learned_constraints,
                },
            }),
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            return { ok: false, slug: slug || '', title: snapshot.metadata.title, saved_at: '', error: `HTTP ${resp.status}: ${err.slice(0, 200)}` };
        }
        return resp.json();
    } catch (e: any) {
        return { ok: false, slug: slug || '', title: snapshot.metadata.title, saved_at: '', error: e?.message || 'fetch failed' };
    }
}

export async function listSessions(): Promise<SessionSummary[]> {
    try {
        return await listSessionsStrict();
    } catch {
        return [];
    }
}

/** WS-1 (2026-08-14 v2 program): throwing variant so the library UI can show a
 *  real failure state + retry instead of silently rendering an empty panel. */
export async function listSessionsStrict(): Promise<SessionSummary[]> {
    const resp = await fetch(`${PROXY_BASE}/api/sessions`);
    if (!resp.ok) throw new Error(`Session library HTTP ${resp.status}`);
    const data = await resp.json();
    return Array.isArray(data.sessions) ? data.sessions : [];
}

export async function loadSession(slug: string): Promise<SessionSnapshot | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/sessions/${encodeURIComponent(slug)}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const sections = data.sections || {};
        // Coerce into the SessionSnapshot shape; missing sections become undefined
        return {
            metadata: sections.metadata || { title: slug, research_goal: '' },
            state: sections.state || {},
            chat: Array.isArray(sections.chat) ? sections.chat : [],
            topic_model: sections.topic_model,
            knowledge_graph: sections.knowledge_graph,
            corpus: sections.corpus,
            reddit_deep: Array.isArray(sections.reddit_deep) ? sections.reddit_deep : undefined,
            learned_constraints: typeof sections.learned_constraints === 'string' ? sections.learned_constraints : undefined,
        };
    } catch {
        return null;
    }
}

export async function deleteSession(slug: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/sessions/${encodeURIComponent(slug)}`, { method: 'DELETE' });
        return resp.ok;
    } catch {
        return false;
    }
}

/** Build a snapshot from the App's current state. The shape mirrors the
 *  proxy's expectations; callers pass through whatever App state they
 *  have access to and the serializer maps it to the storage schema. */
export function buildSessionSnapshot(input: {
    researchGoal: string;
    title?: string;
    selectedOutputs?: string[];
    selectedLens?: string;
    subredditsInput?: string;
    analysisApproach?: string;
    fileNames?: string[];
    sourceToggles?: Record<string, boolean>;
    // Deliverables
    themes?: any;
    personas?: any;
    journeyMap?: any;
    recommendations?: any;
    prd?: any;
    roadmap?: any;
    techArch?: any;
    gapResult?: any;
    techAuditResult?: any;
    competitiveResult?: any;
    strategicReportResult?: any;
    synthesis?: any;
    structure?: any;
    narrative?: any;
    orgChart?: any;
    ingestion?: any;
    // Chat
    chatMessages?: any[];
    // Topic modeling
    topicModelResult?: any;
    // KG
    knowledgeGraph?: any;
    // Corpus
    corpusText?: string;
    chunkMap?: Record<string, any>;
    liveSourceResults?: any[];
    sourceReferences?: any[];
    redditDeepItems?: any[];
    learnedConstraints?: string;
    status?: 'in-progress' | 'complete' | 'archived';
    createdAt?: string;
    // DF-I1: chat-generated artifacts. Omit them and the projection is used.
    slides?: any[];
    deliverables?: any[];
}): SessionSnapshot {
    const now = new Date().toISOString();
    return {
        metadata: {
            title: input.title || input.researchGoal.slice(0, 120),
            research_goal: input.researchGoal,
            created_at: input.createdAt || now,
            completed_at: input.status === 'complete' ? now : undefined,
            status: input.status || 'in-progress',
            selected_outputs: input.selectedOutputs,
            selected_lens: input.selectedLens,
        },
        state: {
            themes: input.themes,
            personas: input.personas,
            journey_stages: input.journeyMap,
            recommendations: input.recommendations,
            prd: input.prd,
            roadmap: input.roadmap,
            tech_architecture: input.techArch,
            gap_analysis: input.gapResult,
            tech_audit: input.techAuditResult,
            competitive_analysis: input.competitiveResult,
            strategic_report: input.strategicReportResult,
            synthesis: input.synthesis,
            structure: input.structure,
            narrative: input.narrative,
            org_chart: input.orgChart,
            ingestion: input.ingestion,
            subreddits_input: input.subredditsInput,
            analysis_approach: input.analysisApproach,
            source_toggles: input.sourceToggles,
            file_names: input.fileNames,
            // DF-I1: fall back to the durable projection so a deck generated in
            // the chat panel is saved even when the caller never saw it.
            slides: input.slides ?? readDurableArtifacts().slides,
            deliverables: input.deliverables ?? readDurableArtifacts().deliverables,
        },
        chat: input.chatMessages || [],
        topic_model: input.topicModelResult,
        knowledge_graph: input.knowledgeGraph,
        corpus: {
            text: input.corpusText,
            chunk_map: input.chunkMap,
            live_source_results: input.liveSourceResults,
            source_references: input.sourceReferences,
        },
        reddit_deep: input.redditDeepItems,
        learned_constraints: input.learnedConstraints,
    };
}

/** Restore a session into App-level state. Returns a partial state
 *  object the caller maps onto its setState calls. Symmetric to
 *  buildSessionSnapshot - the shape mirrors what App.tsx already
 *  manages, so the receiving side just spreads the keys. */
export function restoreSessionSnapshot(snap: SessionSnapshot) {
    return {
        slides: snap.state.slides,
        deliverables: snap.state.deliverables,
        researchGoal: snap.metadata.research_goal,
        selectedOutputs: snap.metadata.selected_outputs,
        selectedLens: snap.metadata.selected_lens,
        subredditsInput: snap.state.subreddits_input,
        analysisApproach: snap.state.analysis_approach,
        fileNames: snap.state.file_names,
        sourceToggles: snap.state.source_toggles,
        themes: snap.state.themes,
        personas: snap.state.personas,
        journeyMap: snap.state.journey_stages,
        recommendations: snap.state.recommendations,
        prd: snap.state.prd,
        roadmap: snap.state.roadmap,
        techArch: snap.state.tech_architecture,
        gapResult: snap.state.gap_analysis,
        techAuditResult: snap.state.tech_audit,
        competitiveResult: snap.state.competitive_analysis,
        strategicReportResult: snap.state.strategic_report,
        synthesis: snap.state.synthesis,
        structure: snap.state.structure,
        narrative: snap.state.narrative,
        orgChart: snap.state.org_chart,
        ingestion: snap.state.ingestion,
        chatMessages: snap.chat,
        topicModelResult: snap.topic_model,
        knowledgeGraph: snap.knowledge_graph,
        corpusText: snap.corpus?.text,
        chunkMap: snap.corpus?.chunk_map,
        liveSourceResults: snap.corpus?.live_source_results,
        sourceReferences: snap.corpus?.source_references,
        redditDeepItems: snap.reddit_deep,
        learnedConstraints: snap.learned_constraints,
    };
}

/** Format a saved_at ISO string into a relative-time hint for the UI. */
export function formatSessionTimestamp(iso?: string): string {
    if (!iso) return '-';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const diffMs = Date.now() - d.getTime();
        const min = Math.floor(diffMs / 60000);
        if (min < 1) return 'just now';
        if (min < 60) return `${min} min ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr} hr ago`;
        const days = Math.floor(hr / 24);
        if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return iso;
    }
}
