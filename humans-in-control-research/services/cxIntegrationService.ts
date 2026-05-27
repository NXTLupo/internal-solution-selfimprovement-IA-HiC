/**
 * CX Intelligence Mesh — Integration Layer
 * Connects HiC Research to existing Intelligence Augmentation tools:
 * - Reddit Ripper (port 5001): Reddit, TrustPilot, Play Store data collection
 * - Social Research Backend (port 8081): Topic modeling, sentiment analysis, RAG
 * - Journey Mapper (port 8080): Interactive journey map generation
 *
 * Each tool stays standalone. HiC Research calls their REST APIs.
 * Human checkpoints are enforced before and after every data pull.
 */

// --- SERVICE URLS ---
// Route through research proxy (port 5012) to bypass CORS
const CX_PROXY_URL = 'http://127.0.0.1:5012/api/cx';
// Direct URLs for server-side only
const REDDIT_RIPPER_URL = typeof window !== 'undefined' ? CX_PROXY_URL : 'http://localhost:5001';
const SOCIAL_RESEARCH_URL = 'http://localhost:8081';
const JOURNEY_MAPPER_URL = 'http://localhost:8080';

// --- TYPES ---

export type SocialSource = 'reddit' | 'trustpilot' | 'playstore';

export interface SocialCollectionConfig {
    source: SocialSource;
    target: string;         // subreddit name, company URL, or package name
    count: number;          // 50-500
    timeFilter?: string;    // day, week, month, year, all
}

export interface CollectionJob {
    jobId: string;
    source: SocialSource;
    target: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    progress: number;
    collected: number;
    total: number;
    error?: string;
    files?: string[];
}

export interface SocialDataSummary {
    source: SocialSource;
    target: string;
    itemCount: number;
    items: any[];
    metadata?: any;
}

export interface TopicModelJob {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: any;
}

export interface ServiceStatus {
    name: string;
    available: boolean;
    url: string;
}

// --- HELPERS ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    } catch (e: any) {
        throw new Error(`Service unavailable: ${url} - ${e.message}`);
    }
}

// --- SERVICE HEALTH CHECKS ---

export async function checkServiceHealth(): Promise<ServiceStatus[]> {
    const checks = [
        { name: 'Reddit Ripper', url: CX_PROXY_URL },
        { name: 'Social Research', url: SOCIAL_RESEARCH_URL },
        { name: 'Journey Mapper', url: JOURNEY_MAPPER_URL },
    ];

    const results: ServiceStatus[] = [];
    for (const svc of checks) {
        try {
            const resp = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(3000) });
            results.push({ name: svc.name, available: resp.ok, url: svc.url });
        } catch {
            results.push({ name: svc.name, available: false, url: svc.url });
        }
    }
    return results;
}

// ============================================================
// REDDIT RIPPER INTEGRATION (port 5001)
// ============================================================

/**
 * Start a social data collection job.
 * Returns a job ID for polling.
 */
export async function startCollection(config: SocialCollectionConfig): Promise<string> {
    const body: any = {
        source: config.source,
        target: config.target,
        count: config.count,
    };
    if (config.source === 'reddit') {
        body.post_count = config.count;
        body.time_filter = config.timeFilter || 'year';
        body.comments_per_post = 5;
    } else {
        body.review_count = config.count;
    }

    const resp = await safeFetch(`${REDDIT_RIPPER_URL}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`Collection failed: ${resp.status}`);
    const data = await resp.json();
    return data.job_id;
}

/**
 * Poll job status until completion.
 * Returns the final job state.
 */
export async function pollCollectionJob(jobId: string, onProgress?: (job: CollectionJob) => void): Promise<CollectionJob> {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    while (attempts < maxAttempts) {
        const resp = await safeFetch(`${REDDIT_RIPPER_URL}/status/${jobId}`);
        if (!resp.ok) throw new Error(`Status check failed: ${resp.status}`);

        const job: CollectionJob = await resp.json();
        job.jobId = jobId;
        onProgress?.(job);

        if (job.status === 'completed' || job.status === 'error') {
            return job;
        }

        attempts++;
        await wait(5000);
    }

    throw new Error('Collection timed out after 10 minutes');
}

/**
 * Download collected data as JSON.
 */
export async function downloadCollectionData(jobId: string, filename: string): Promise<any> {
    const resp = await safeFetch(`${REDDIT_RIPPER_URL}/download/${jobId}/${filename}`);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    return resp.json();
}

/**
 * Full collection flow: start -> poll -> download -> return data.
 */
export async function collectSocialData(
    config: SocialCollectionConfig,
    onProgress?: (job: CollectionJob) => void
): Promise<SocialDataSummary> {
    const jobId = await startCollection(config);
    const finalJob = await pollCollectionJob(jobId, onProgress);

    if (finalJob.status === 'error') {
        throw new Error(`Collection error: ${finalJob.error}`);
    }

    // Download the JSON file
    const jsonFile = finalJob.files?.find(f => f.endsWith('.json'));
    if (!jsonFile) {
        return {
            source: config.source,
            target: config.target,
            itemCount: finalJob.collected,
            items: [],
        };
    }

    const data = await downloadCollectionData(jobId, jsonFile);
    return {
        source: config.source,
        target: config.target,
        itemCount: data.item_count || data.items?.length || 0,
        items: data.items || [],
        metadata: data.metadata,
    };
}

// ============================================================
// SOCIAL RESEARCH BACKEND INTEGRATION (port 8081)
// ============================================================

/**
 * Start topic modeling analysis.
 * Returns a job ID for polling.
 */
export async function startTopicModeling(subreddit: string, numPosts: number = 200): Promise<string> {
    const resp = await safeFetch(`${SOCIAL_RESEARCH_URL}/api/topic-model/analyze-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subreddit,
            num_posts: numPosts,
            max_comments: 3,
            sort: 'relevance',
            user_id: 'hic-research',
            index_in_pgvector: true,
        }),
    });

    if (!resp.ok) throw new Error(`Topic modeling failed: ${resp.status}`);
    const data = await resp.json();
    return data.job_id;
}

/**
 * Poll topic modeling job.
 */
export async function pollTopicModelingJob(jobId: string, onProgress?: (status: TopicModelJob) => void): Promise<any> {
    let attempts = 0;
    const maxAttempts = 120;

    while (attempts < maxAttempts) {
        const resp = await safeFetch(`${SOCIAL_RESEARCH_URL}/api/topic-model/job-status/${jobId}`);
        if (!resp.ok) throw new Error(`Status check failed: ${resp.status}`);

        const job = await resp.json();
        onProgress?.({ jobId, status: job.status, progress: job.progress || 0, result: job.result });

        if (job.status === 'completed') return job.result;
        if (job.status === 'failed') throw new Error(`Topic modeling failed: ${job.error}`);

        attempts++;
        await wait(5000);
    }
    throw new Error('Topic modeling timed out');
}

/**
 * Start sentiment analysis.
 */
export async function startSentimentAnalysis(subreddit: string, query: string, limit: number = 50): Promise<string> {
    const resp = await safeFetch(`${SOCIAL_RESEARCH_URL}/api/llm-analyzer/analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            subreddit,
            query,
            limit,
            sort: 'relevance',
            time: 'all',
            user_id: 'hic-research',
            skip_filtering: true,
        }),
    });

    if (!resp.ok) throw new Error(`Sentiment analysis failed: ${resp.status}`);
    const data = await resp.json();
    return data.job_id;
}

/**
 * Query the RAG system with a question about indexed social data.
 */
export async function queryRAG(prompt: string, subreddit: string): Promise<{ answer: string; sources: any[] }> {
    const resp = await safeFetch(`${SOCIAL_RESEARCH_URL}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, subreddit, model: 'claude' }),
    });

    if (!resp.ok) throw new Error(`RAG query failed: ${resp.status}`);
    return resp.json();
}

// ============================================================
// JOURNEY MAPPER INTEGRATION (port 8080)
// ============================================================

/**
 * Generate an interactive journey map from data files.
 * Returns the URL to the generated HTML map.
 * Journey Mapper has CORS enabled for all origins.
 */
export async function generateJourneyMap(
    dataBlob: Blob,
    fileName: string,
    title: string,
    journeyType: string
): Promise<string> {
    const formData = new FormData();
    formData.append('files', dataBlob, fileName);
    formData.append('title', title);
    formData.append('journey_type', journeyType);

    const resp = await fetch(`${JOURNEY_MAPPER_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
        redirect: 'follow',
    });

    // Journey Mapper returns 303 redirect to the generated HTML
    // With redirect: 'follow', we get the final URL
    if (resp.ok) {
        return resp.url;
    }

    throw new Error(`Journey map generation failed: ${resp.status}`);
}

/**
 * Convert analysis data to a text file blob for Journey Mapper ingestion.
 */
export function prepareJourneyData(themes: any[], personas: any[], researchGoal: string): Blob {
    const content = [
        `Research Goal: ${researchGoal}`,
        '',
        '=== THEMES ===',
        ...themes.map((t: any, i: number) => `${i + 1}. ${t.name}: ${t.description}`),
        '',
        '=== PERSONAS ===',
        ...personas.map((p: any) => `${p.name} (${p.role}): ${p.bio || p.quote}`),
        '',
        '=== PAIN POINTS ===',
        ...personas.flatMap((p: any) => (p.painPoints || []).map((pp: any) => `- ${pp.label}: ${pp.quote}`)),
    ].join('\n');

    return new Blob([content], { type: 'text/plain' });
}
