// topicModelService.ts
//
// 2026-05-10 — Client for the topic-modeling endpoints in research-proxy.
// Fires an async job, polls until done, returns a TopicResult ready for
// the AnalystDesk Topic Modeling tab.

const PROXY_BASE = 'http://127.0.0.1:5012';

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
 *  pass them through unchanged so _socialMeta survives. */
export async function startTopicModelJob(opts: {
    items: any[];
    researchGoal: string;
    minClusterSize?: number;
}): Promise<{ jobId: string; docCount: number }> {
    const resp = await fetch(`${PROXY_BASE}/api/topic-model/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: opts.items,
            research_goal: opts.researchGoal,
            min_cluster_size: opts.minClusterSize ?? 5,
        }),
    });
    if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        throw new Error(`startTopicModelJob: HTTP ${resp.status}: ${err.slice(0, 200)}`);
    }
    const data = await resp.json();
    return { jobId: data.job_id, docCount: data.doc_count };
}

/** Poll once. Returns the current job state. Caller manages the polling
 *  cadence so UIs can throttle or back off. */
export async function pollTopicModelJob(jobId: string): Promise<TopicJobStatus> {
    const resp = await fetch(`${PROXY_BASE}/api/topic-model/status/${jobId}`);
    if (!resp.ok) {
        if (resp.status === 404) {
            throw new Error(`Unknown topic-model job: ${jobId}`);
        }
        throw new Error(`pollTopicModelJob: HTTP ${resp.status}`);
    }
    return resp.json();
}

/** Convenience wrapper: poll every 4s until the job completes or fails.
 *  Reports progress via the callback. Default timeout: 5 minutes. */
export async function waitForTopicModelJob(
    jobId: string,
    onProgress?: (s: TopicJobStatus) => void,
    timeoutMs: number = 300_000,
): Promise<TopicResult> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const status = await pollTopicModelJob(jobId);
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
export async function checkTopicModelHealth(): Promise<{ ok: boolean; error: string | null }> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/topic-model/health`);
        if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
        return resp.json();
    } catch (e: any) {
        return { ok: false, error: e.message || 'unreachable' };
    }
}
