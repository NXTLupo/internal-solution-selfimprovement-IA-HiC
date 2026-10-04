// topicModelService.ts
//
// 2026-05-10 - Client for the topic-modeling endpoints in research-proxy.
// Fires an async job, polls until done, returns a TopicResult ready for
// the AnalystDesk Topic Modeling tab.
//
// 2026-06-05 (Step 5, volume-to-insight) - Adds the optional `scope` payload
// that the proxy /api/topic-model/analyze endpoint already accepts (see
// proxy/app.py:2795-2816 `_assemble_scope_items`). With `scope` supplied the
// proxy assembles documents from the manifest scope server-side (budget-aware,
// NO 50/subreddit cap) and merges with any explicit `items`. This is the
// "repoint off the capped `redditDeepItems` side-channel" the plan calls for.

const PROXY_BASE = 'http://127.0.0.1:5012';

import { recordYieldEvent } from './corpusSubstrate';

/** Substrate scope passed to the topic-model endpoint. Mirrors
 *  proxy/app.py::_assemble_scope_items(). All fields optional. */
export interface TopicModelScope {
    /** Manifest record types to source docs from. Default proxy-side: ['social-post','article']. */
    types?: string[];
    /** Engagement slug to require (substring match on wikiPath / title). */
    engagement?: string;
    /** Industry tags (any-overlap). */
    industries?: string[];
    /** Drop records below this manifest relevance floor. 0 = no floor. */
    min_relevance?: number;
    /** Cap on records assembled from the scope. Proxy default: 600. */
    max_count?: number;
}

export interface TopicTerm {
    term: string;
    score: number;
}

export interface Topic {
    id: number;
    name: string;
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    post_count: number;
    top_terms: Array<[string, number]>;
    post_ids: string[];
    centroid: [number, number];
    // 2026-06-02 - measured engagement-weighted sentiment (ported from
    // socialresearch). Present when VADER weighted sentiment was applied.
    sentiment_score?: number;        // 0.6*NSS + 0.4*weighted_mean, [-1,1]
    net_sentiment_score?: number;    // NSS = %positive - %negative
    controversy?: number;            // 2*min(pos,neg)/total, [0,1] polarization
    sentiment_units?: number;        // # of OP+comment units scored
    sentiment_method?: string;       // 'vader-weighted' when measured
    // v2 cross-source convergence fields (previously returned but dropped by this type)
    convergent_evidence?: boolean;
    source_types?: string[];
    distinct_source_count?: number;
}

export interface TopicDocument {
    id: string;
    title: string;
    url?: string;
    cluster: number;
    x: number;
    y: number;
    score: number;
    num_comments: number;
    subreddit: string;
}

export interface TopicSimilarity {
    source: number;
    target: number;
    weight: number;
}

export interface TopicResult {
    topic_count: number;
    noise_count: number;
    doc_count: number;
    topics: Topic[];
    documents: TopicDocument[];
    topic_similarities: TopicSimilarity[];
    duration_seconds?: number;
    error?: string;
    pipeline_version?: string;
    dropped_by_quality_gates?: number;
    convergent_evidence_count?: number;
}

export interface TopicJobStatus {
    job_id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
    message?: string;
    doc_count?: number;
    result?: TopicResult;
    error?: string;
    completed_at?: string;
    from_disk?: boolean;
}

/** Kick off a topic-modeling run on a list of items. Items must have at
 *  least { title, content }; if items came from the deep-Reddit fetcher,
 *  pass them through unchanged so _socialMeta survives.
 *
 *  2026-06-05 - `scope` is the volume-to-insight substrate path. When passed,
 *  the proxy assembles documents from the persistent manifest (budget-aware,
 *  no 50/subreddit cap) and merges with `items`. Pass an empty `items: []`
 *  when sourcing entirely from the manifest. */
export async function startTopicModelJob(opts: {
    items: any[];
    researchGoal: string;
    minClusterSize?: number;
    scope?: TopicModelScope;
    /** Optional engagement slug for yield-ledger attribution. */
    engagement?: string;
}): Promise<{ jobId: string; docCount: number }> {
    // 2026-06-06 - Read the engagement manifest's cached_selection so the
    // user's KL choices (article_sources, social_subreddits) widen the
    // topic-modeling corpus beyond what the substrate scope retrieves on
    // its own. Closes the "thin topic modeling despite 506-item KL
    // selection" gap from the architecture audit. Manifest read is
    // best-effort; if unavailable the job runs on the substrate/items only.
    let cachedSelectionForScope: any = undefined;
    if (opts.engagement) {
        try {
            const resp = await fetch(`${PROXY_BASE}/api/wiki/read/engagements/${encodeURIComponent(opts.engagement)}/manifest.json`);
            if (resp.ok) {
                const data = await resp.json();
                const manifest = JSON.parse(data?.content || '{}');
                const cs = manifest?.cached_selection;
                if (cs && (cs.article_sources?.length || cs.social_subreddits?.length)) {
                    cachedSelectionForScope = {
                        article_sources: cs.article_sources || [],
                        social_subreddits: cs.social_subreddits || [],
                        theme_cluster_ids: cs.theme_cluster_ids || [],
                    };
                    console.info(`[topicModelService] KL cached_selection forwarded to topic-model: articles=${cachedSelectionForScope.article_sources.length}, subreddits=${cachedSelectionForScope.social_subreddits.length}, themes=${cachedSelectionForScope.theme_cluster_ids.length}`);
                }
            }
        } catch (e: any) {
            console.warn('[topicModelService] cached_selection load failed (non-fatal):', e?.message || e);
        }
    }

    const body: any = {
        items: opts.items,
        research_goal: opts.researchGoal,
        min_cluster_size: opts.minClusterSize ?? 5,
    };
    if (opts.scope) body.scope = opts.scope;
    if (cachedSelectionForScope) body.cached_selection = cachedSelectionForScope;
    const resp = await fetch(`${PROXY_BASE}/api/topic-model/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        throw new Error(`startTopicModelJob: HTTP ${resp.status}: ${err.slice(0, 200)}`);
    }
    const data = await resp.json();
    recordYieldEvent({
        consumer: 'topic-model.kickoff',
        engagement: opts.engagement,
        goal: (opts.researchGoal || '').slice(0, 80),
        retrieved: data.doc_count ?? (Array.isArray(opts.items) ? opts.items.length : 0),
        note: opts.scope
            ? `substrate-scoped types=${(opts.scope.types || ['social-post','article']).join(',')} max=${opts.scope.max_count ?? 600}`
            : 'items-only (legacy redditDeepItems path)',
    });
    return { jobId: data.job_id, docCount: data.doc_count };
}

/** Poll once. Returns the current job state. Caller manages the polling
 *  cadence so UIs can throttle or back off. */
async function pollTopicModelJob(jobId: string): Promise<TopicJobStatus> {
    let resp: Response;
    try {
        resp = await fetch(`${PROXY_BASE}/api/topic-model/status/${jobId}`);
    } catch (e: any) {
        // 2026-05-31 - Network error: the gateway can drop the connection while
        // a uvicorn worker is mid-clustering. The job is still running
        // server-side (state persists in a sentinel file), so mark transient.
        const err: any = new Error(`pollTopicModelJob: network error (${e?.message || e})`);
        err.transient = true;
        throw err;
    }
    if (!resp.ok) {
        if (resp.status === 404) {
            throw new Error(`Unknown topic-model job: ${jobId}`);
        }
        // 2026-05-31 - 5xx (esp. 502 from the Docker/Windows gateway when the
        // worker is briefly busy with CPU-heavy clustering) is TRANSIENT: the
        // job keeps running and its state is file-persisted. Tag it so the
        // poll loop retries instead of failing the whole job.
        const err: any = new Error(`pollTopicModelJob: HTTP ${resp.status}`);
        if (resp.status >= 500) err.transient = true;
        throw err;
    }
    return resp.json();
}

/** Convenience wrapper: poll every 4s until the job completes or fails.
 *  Reports progress via the callback. Default timeout: 5 minutes. */
export async function waitForTopicModelJob(
    jobId: string,
    onProgress?: (s: TopicJobStatus) => void,
    timeoutMs: number = 420_000,
): Promise<TopicResult> {
    const start = Date.now();
    // 2026-06-03 - DO NOT abort a job that is still progressing server-side just
    // because the /status endpoint is briefly unreachable. Root cause of the
    // "status endpoint unreachable for too long (31 consecutive transient
    // errors)" failure: CPU clustering (UMAP/HDBSCAN via numba) HOLDS THE GIL on
    // the proxy worker for the whole clustering window, so /status 502s
    // continuously for >2 min while the job keeps running and its state is
    // file-persisted. The old MAX_TRANSIENT=30 (~120s) tripped BEFORE the job
    // finished. We now let transient 502/503/504s ride the ENTIRE timeout window
    // (the overall `timeoutMs` is the only hard stop); a genuinely dead job is
    // still bounded by that timeout. Raised timeout to 7 min for heavy corpora
    // under provider rate-limits.
    let transientStreak = 0;
    // Effectively "never abort early on transient errors" - only the overall
    // timeout below stops us. (+5 headroom over the max possible 4s-spaced polls.)
    const MAX_TRANSIENT = Math.ceil(timeoutMs / 4000) + 5;
    while (Date.now() - start < timeoutMs) {
        let status: TopicJobStatus;
        try {
            status = await pollTopicModelJob(jobId);
            transientStreak = 0;
        } catch (e: any) {
            if (e?.transient) {
                transientStreak++;
                if (transientStreak > MAX_TRANSIENT) {
                    throw new Error(`Topic modeling: status endpoint unreachable for too long (${transientStreak} consecutive transient errors)`);
                }
                await new Promise(r => setTimeout(r, 4000));
                continue;
            }
            throw e; // non-transient (e.g. 404 unknown job) - a real failure
        }
        onProgress?.(status);
        if (status.status === 'completed' && status.result) return status.result;
        if (status.status === 'failed') {
            throw new Error(`Topic modeling failed: ${status.error || 'unknown error'}`);
        }
        await new Promise(r => setTimeout(r, 4000));
    }
    throw new Error(`Topic modeling timed out after ${Math.round(timeoutMs / 1000)}s`);
}

/** Check whether the ML stack is loadable in the proxy. Used to decide
 *  whether to show the Topic Modeling tab at all. */
async function checkTopicModelHealth(): Promise<{ ok: boolean; error: string | null }> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/topic-model/health`);
        if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
        return resp.json();
    } catch (e: any) {
        return { ok: false, error: e.message || 'unreachable' };
    }
}
