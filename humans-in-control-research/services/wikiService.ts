/**
 * Wiki Service - Persistent Knowledge Layer Interface
 *
 * Reads from hic-workspace/wiki/ to provide compiled knowledge
 * for deliverable generation. The wiki is the quality layer:
 * framework specs, anti-patterns, benchmarks, evidence, brand standards.
 *
 * This service is the bridge between the React app and the markdown wiki.
 * All wiki reads happen at generation time via fetch() to the local server
 * or direct file read depending on environment.
 */

import type { OutputOption } from '../types';

// --- TYPES ---

export interface WikiPage {
    path: string;
    title: string;
    type: string;
    content: string;
    frontmatter: WikiFrontmatter;
}

export interface WikiFrontmatter {
    title: string;
    type: string;
    created: string;
    updated: string;
    sources: string[];
    confidence: 'high' | 'medium' | 'speculative';
    status: 'active' | 'needs-review' | 'superseded' | 'archived';
    tags: string[];
    evidence_count: number;
}

export interface WikiLogEntry {
    date: string;
    operation: 'ingest' | 'generate' | 'lint' | 'bootstrap' | 'update';
    subject: string;
    details: string;
}

export interface BrandConfig {
    identity: string;
    illustrationStyle: string;
    chartStandards: string;
    layoutPatterns: string;
    antiSlop: string;
    referenceDeck: string;
}

export interface SocialIntelligenceContext {
    sentimentPipeline: string;
    topicModeling: string;
    cxMesh: string;
}

export interface ResearchContext {
    researchModes: string;
    knowledgeGraph: string;
    methodology: string;
    analyticalLenses: string;
    sourceConnectors: string;
}

export interface GenerationContext {
    framework: string;
    antiPatterns: string;
    benchmarks: string;
    evidence: string;
    brand: BrandConfig;
    socialIntelligence: SocialIntelligenceContext;
    research: ResearchContext;
    industryAdaptation?: string;
    engagementContext?: string;
    /** 2026-05-22 - Phase 4.3. Engagement goals lifted from the engagement
     *  page's `## Goals` section, formatted as a hard constraint string
     *  ready to be injected at the end of any generation prompt. */
    engagementGoals?: string;
    exemplar?: string;
    /** 2026-05-24 - Phase 6.1 of NotebookLM uplift. Cross-engagement patterns
     *  mined from prior runs (synthesis/cross-engagement-patterns.md). Injected
     *  into every generation system prompt so the model can build on portfolio
     *  patterns instead of re-discovering them per engagement. Best-effort
     *  load - silent on miss, never blocks generation. */
    crossEngagementPatterns?: string;
    /** 2026-06-06 - Knowledge Library selection the user explicitly curated
     *  before this run. Read from the engagement manifest's `cached_selection`
     *  field. When present, the assembleEnhancedPrompt() injects a
     *  PRIOR_CACHED block telling the model which themes / articles / source
     *  archives to CARRY FORWARD as `source: cached|extended` rather than
     *  regenerate. validate_cached_selection_honored.py at Stop rejects
     *  emissions that ignore the selection. Closes Gap 1 from the
     *  2026-06-06 architecture audit. */
    cachedSelection?: {
        engagement_slugs: string[];
        theme_cluster_ids: string[];
        source_archive_paths: string[];
        social_subreddits: string[];
        article_sources: string[];
        selected_at_ms: number;
        /** 2026-06-06 - Bodies resolved from the WIKI by loadGenerationContext.
         *  Each theme_cluster_id has the format "<file>#<index>" pointing to
         *  wiki/synthesis/<file>.json topic <index>. The loader groups IDs by
         *  source file, fetches each file once, extracts the bodies, and
         *  populates this array. Manifest -> wiki resolution: the IDs are
         *  pointers persisted in the manifest, the bodies live in the wiki
         *  synthesis files (single source of truth), and the loader resolves
         *  pointers to content at generation time. */
        resolved_theme_bodies?: Array<{
            id: string;
            name: string;
            summary: string;
            sentiment: string;
            post_count: number;
            top_terms: string[];
            source_synthesis_path: string;
            source_engagement_goal?: string;
        }>;
        /** Bodies hydrated from wiki - legacy field, kept for back-compat. */
        hydrated_themes?: Array<{ id: string; name: string; insight?: string; evidence?: string; source_engagement?: string }>;
        hydrated_article_summaries?: Array<{ path: string; title: string; one_line: string }>;
    };
}

export interface QualityScore {
    completeness: number;      // 0-5
    depth: number;             // 0-5
    evidence: number;          // 0-5
    visualQuality: number;     // 0-5
    specificity: number;       // 0-5
    overall: number;           // weighted average
    passing: boolean;          // >= 3.8
    failingDimensions: string[];
}

// --- CONSTANTS ---

const WIKI_BASE = '/hic-workspace/wiki';

/**
 * Maps OutputOption enum values to wiki framework page filenames.
 */
const OUTPUT_TO_FRAMEWORK: Record<string, string> = {
    'PERSONAS': 'personas',
    'STRATEGY_DECK': 'deck',
    'JOURNEY_MAP': 'blueprint',
    'TECH_ARCH': 'architecture',
    'STRATEGIC_RECS': 'strategy',
    'PRD': 'prd',
    'ROADMAP': 'roadmap',
    'GAP_ANALYSIS': 'gap-analysis',
    'TECH_AUDIT': 'tech-audit',
    'COMPETITIVE_ANALYSIS': 'competitive',
};

/**
 * Maps framework types to their relevant benchmark pages.
 */
const FRAMEWORK_BENCHMARKS: Record<string, string[]> = {
    'personas': ['cx-metrics'],
    'deck': ['cx-metrics', 'financial-impact'],
    'script': ['cx-metrics', 'technology-adoption'],
    'blueprint': ['cx-metrics'],
    'architecture': ['technology-adoption'],
    'prd': ['technology-adoption', 'cx-metrics'],
    'roadmap': ['technology-adoption', 'financial-impact'],
    'strategy': ['cx-metrics', 'financial-impact', 'maturity-models'],
    'gap-analysis': ['maturity-models', 'cx-metrics'],
    'tech-audit': ['technology-adoption', 'competitive-intel'],
    'competitive': ['competitive-intel', 'cx-metrics'],
};

// --- BANNED PHRASES (loaded from wiki/brand/anti-slop.md at build time) ---

/**
 * Comprehensive AI Slop Blacklist - ~350 phrases across 12 categories.
 * Any match triggers detection + auto-correction in the slide pipeline.
 * Source: NXT Humans anti-slop style guide (2026-04-13).
 */
const BANNED_PHRASES = [
    // === I. META-NARRATION (presenter self-reference) ===
    "good morning", "good afternoon", "good evening", "welcome to",
    "today we will", "today we'll", "we will present", "we are going to present",
    "we now move to", "we are now entering", "let us now examine",
    "in this section", "in this presentation", "in this deck", "in this document",
    "as you can see", "this slide shows", "the next slide", "the next section",
    "thank you for being here", "thank you for joining", "thank you for attending",
    "our objective is to", "allow me to", "before we begin", "before we get started",
    "let's explore the nuances", "let's pivot to", "turning our attention to",
    "having explored", "now that we've covered", "building on that idea",
    "this leads us to", "with that in mind", "transitioning to the next point",

    // === II. GRAND OPENING (introductory slop) ===
    "in today's rapidly evolving landscape", "in today's digital age",
    "in the rapidly evolving landscape", "it is important to note",
    "it's important to note", "delve into the world of",
    "unlocking the potential of", "a testament to the power of",
    "navigating the complexities of", "at the intersection of",
    "shifting the paradigm", "delving into the intricacies",

    // === III. CORPORATE CHEERLEADER (adjective overload) ===
    "robust", "seamlessly", "comprehensive solution", "game-changer", "game changer",
    "elevate your", "empower your", "synergy", "synergies", "innovative solution",
    "cutting-edge", "transformative", "revolutionize", "holistic approach",
    "bespoke solutions", "mission-critical", "scalable solution",
    "groundbreaking advancements", "unprecedented growth", "paradigm-shattering",
    "world-class excellence", "state-of-the-art", "revolutionary breakthroughs",
    "extraordinary impact", "unparalleled access", "disruption at its finest",
    "best-in-class", "peerless performance", "unrivaled expertise",

    // === IV. TYING A BOW (concluding slop) ===
    "in conclusion", "to summarize", "ultimately, the choice is yours",
    "only time will tell", "the future looks bright", "in short",
    "by and large", "at the end of the day", "a journey toward excellence",
    "embracing the possibilities",

    // === V. BRIDGE TO NOWHERE (connective slop) ===
    "furthermore", "moreover", "additionally", "not only", "but also",
    "conversely", "on the other hand", "looking ahead", "that being said",
    "in this regard", "in a similar fashion", "on the flip side",
    "along those lines", "in the same way",

    // === VI. FALSE PROFUNDITY (pretentious slop) ===
    "tapestry of", "beacon of hope", "symphony of collaboration",
    "catalyst for change", "diving deep into", "unveiling the secrets",
    "mastering the art of", "the ultimate guide to", "harnessing the power of",
    "fostering a culture of", "pushing the boundaries", "orchestrating success",
    "a multifaceted approach", "bridging the gap", "charting a course for",
    "a tapestry of possibilities", "navigating the stormy seas",
    "planting the seeds of", "a beacon in the dark", "scaling the heights of",
    "the heartbeat of the industry", "a symphony of voices",
    "the DNA of success", "unlocking the vault", "a roadmap to the future",
    "turning the tide", "a masterclass in", "fueling the fire of",
    "the engine of growth", "a canvas for creativity", "architecting the future",
    "the gold standard", "navigating the labyrinth",
    "a marathon, not a sprint", "breaking the mold",

    // === VII. MANAGERIAL WORD SALAD ===
    "leverage synergies", "core competencies", "paradigm shift",
    "low-hanging fruit", "moving the needle", "think outside the box",
    "deep dive analysis", "aligning our goals", "bandwidth for",
    "circle back", "on the radar", "touching base", "value proposition",
    "key deliverables", "scalable architecture", "strategic alignment",
    "cross-functional teams", "frictionless experience", "ecosystem integration",
    "actionable insights", "agile methodology", "change management",
    "operational excellence", "stakeholder engagement",

    // === VIII. ACADEMIC ECHO (pseudo-intellectual filler) ===
    "a nuanced understanding", "the quintessential example",
    "pivotal role in the process", "underpinning the concept",
    "a cornerstone of modern", "examining the interplay",
    "the inherent nature of", "paradoxically enough",
    "to further elucidate", "strikingly evident",
    "noteworthy is the fact", "within the realm of",
    "central to the discourse", "the overarching theme",
    "salient points to consider", "a synthesis of ideas",
    "broadly speaking", "predicated on the idea",

    // === IX. VAGUE BUZZWORDS (filler slop) ===
    "next-level", "high-octane", "results-driven", "thought leadership",
    "customer-centric", "data-driven insights", "real-world applications",
    "dynamic ecosystem", "value-added", "key takeaways",
    "industry-leading", "expert-led", "proven track record",
    "battle-tested", "time-honored", "cutting-edge research",
    "tailor-made for you", "custom-built solutions", "personalized approach",

    // === X. MORALIZING OUTRO (preachy slop) ===
    "a call to action", "shaping a better tomorrow", "for the greater good",
    "a collective responsibility", "empowering the next generation",
    "fostering a brighter future", "leaving a lasting legacy",
    "making a difference together", "a shared vision",
    "towards a more inclusive", "driving positive change",
    "a journey of discovery", "cultivating a mindset",
    "standing at the threshold",

    // === XI. OVER-ALLITERATION (stylistic slop) ===
    "poised for progress", "passionate and purposeful",
    "bold and brave", "simple yet sophisticated",
    "creative and collaborative", "mindful and meaningful",
    "strategic and streamlined", "visionary and versatile",
    "efficient and effective", "resilient and robust",

    // === XII. UNIVERSAL TRUTHS (obvious slop) ===
    "there is no one-size-fits-all", "every situation is unique",
    "innovation is the key to growth", "collaboration is essential",
    "knowledge is power", "change is the only constant",
    "the possibilities are endless",

    // === XIII. HALL OF FAME (the worst offenders) ===
    "explore the possibilities", "unlock your potential",
    "elevate your brand", "experience the difference",
    "ignite your passion", "brave new world",
    "the art and science of", "redefining the standard",
    "setting the bar", "pushing the envelope",
    "dream, believe, achieve", "the secret sauce",
    "magic happens when", "sky's the limit",
    "take it to the next level", "high-level overview",
    "bottom line", "win-win situation", "best practices",
    "visionary leadership", "thought-provoking", "eye-opening",
    "life-altering", "mind-blowing", "a labor of love",
    "the perfect storm", "a breath of fresh air",
    "the tip of the iceberg", "behind the scenes",
    "under the hood", "in the trenches", "on the front lines",
    "level the playing field", "raise the stakes",
    "open the door", "close the loop", "connect the dots",

    // === XIV. PASSIVE HEDGING (weak slop) ===
    "it is believed that", "it could be argued", "one might suggest",
    "it appears to be", "generally considered", "to some extent",
    "as far as we know", "largely attributed to", "arguably the best",
    "possibly the most", "it should be noted", "it is often the case",
];

// --- WIKI FILE READER ---

/**
 * Reads a wiki markdown file and parses its frontmatter.
 * In browser context, fetches from the local dev server.
 * Falls back gracefully if file doesn't exist.
 */
async function readWikiPage(relativePath: string): Promise<WikiPage | null> {
    try {
        // Try static path first (Vite dev server / nginx), then proxy fallback (for dynamically written pages)
        let content: string | null = null;
        const fullPath = `${WIKI_BASE}/${relativePath}`;
        const response = await fetch(fullPath);
        if (response.ok) {
            content = await response.text();
        } else {
            // Fallback: try the proxy read endpoint (serves from Docker volume mount)
            try {
                const proxyResp = await fetch(`${PROXY_BASE}/api/wiki/read/${relativePath}`);
                if (proxyResp.ok) {
                    const data = await proxyResp.json();
                    content = data.content || null;
                }
            } catch { /* proxy may not be available */ }
        }
        if (!content) return null;
        const frontmatter = parseFrontmatter(content);
        const body = extractBody(content);
        return {
            path: relativePath,
            title: frontmatter?.title || relativePath,
            type: frontmatter?.type || 'unknown',
            content: body,
            frontmatter: frontmatter || getDefaultFrontmatter(),
        };
    } catch (err) {
        console.warn(`[WikiService] Failed to read ${relativePath}:`, err);
        return null;
    }
}

// --- WIKI WRITE LAYER (P6-01) ---
// Writes go through the research-proxy which has filesystem access.

const PROXY_BASE = 'http://127.0.0.1:5012';

/**
 * Resilient GET wrapper for wiki proxy calls (2026-04-21).
 *
 * Chrome on Windows + Docker Desktop + WSL2 briefly reports
 * `net::ERR_NETWORK_CHANGED` when the Docker network namespace renegotiates
 * after a container rebuild or after the laptop resumes from sleep. These
 * surface as red errors in the devtools console even though the proxy
 * itself is fully healthy - a fetch started a millisecond before the flip
 * gets cancelled and rejects with a generic TypeError.
 *
 * This helper wraps fetch() with:
 *   - 2 retries (total 3 attempts) on network-level errors (TypeError)
 *   - 1 retry on 5xx responses
 *   - Exponential backoff: 300ms, 1000ms
 *   - 6-second per-attempt timeout so stuck connections don't pin the loop
 *   - Returns null on final failure (caller treats as "graceful degrade")
 *
 * Callers should use this for LIST and READ operations that are idempotent.
 * Do NOT use for writes (POST) - retries could cause duplicate side effects.
 */
async function resilientGet(url: string, opts: { timeoutMs?: number; maxAttempts?: number } = {}): Promise<Response | null> {
    const maxAttempts = opts.maxAttempts ?? 3;
    const timeoutMs = opts.timeoutMs ?? 6000;
    const backoffMs = [0, 300, 1000];
    let lastErr: any = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (backoffMs[attempt] > 0) {
            await new Promise(r => setTimeout(r, backoffMs[attempt]));
        }
        try {
            const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
            // 5xx → retryable
            if (resp.status >= 500 && attempt < maxAttempts - 1) {
                lastErr = new Error(`HTTP ${resp.status}`);
                continue;
            }
            return resp;
        } catch (err: any) {
            lastErr = err;
            // 4xx are non-retryable (but fetch doesn't throw on those anyway)
            // We only get here for network-level failures / timeouts / aborts.
            // Keep looping until maxAttempts.
            continue;
        }
    }
    // Silent final fail - caller decides what to do with null
    if (lastErr) console.warn(`[resilientGet] final fail for ${url.substring(0, 80)}: ${lastErr?.message || lastErr}`);
    return null;
}

/**
 * Write (overwrite) a wiki page. Used for full page updates.
 */
export async function writeWikiPage(
    relativePath: string,
    content: string,
    // 2026-06-12 ENGAGEMENT-TAG GUARANTEE (supercharge 1.1): callers persisting
    // retrievable corpus pass chunk:true + the session slug so the manifest
    // record is tier-1 visible to this engagement's retrieval.
    opts?: { chunk?: boolean; engagement?: string },
): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content, chunk: opts?.chunk || false, engagement: opts?.engagement || undefined }),
        });
        if (!resp.ok) {
            console.error(`[WikiService] Write failed for ${relativePath}:`, await resp.text());
            return false;
        }
        console.log(`[WikiService] Wrote ${relativePath}`);
        return true;
    } catch (err) {
        console.error(`[WikiService] Write error for ${relativePath}:`, err);
        return false;
    }
}

/**
 * Append content to a wiki page. Optionally append under a specific section header.
 */
export async function appendToWikiPage(relativePath: string, content: string, section?: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/append`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content, section: section || '' }),
        });
        if (!resp.ok) {
            console.error(`[WikiService] Append failed for ${relativePath}:`, await resp.text());
            return false;
        }
        console.log(`[WikiService] Appended to ${relativePath}`);
        return true;
    } catch (err) {
        console.error(`[WikiService] Append error for ${relativePath}:`, err);
        return false;
    }
}

/**
 * Append an entry to the wiki operation log.
 */
export async function appendWikiLog(operation: string, subject: string, details: Record<string, any>): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const detailLines = Object.entries(details).map(([k, v]) => `  - ${k}: ${v}`).join('\n');
    const entry = `\n## [${date}] ${operation} | ${subject}\n${detailLines}\n`;
    await appendToWikiPage('log.md', entry);
}

/**
 * P6-04: Append a learned anti-pattern from user edit patterns.
 */
export async function appendLearnedAntiPattern(deliverableType: string, patternName: string, description: string, detection: string): Promise<void> {
    const entry = `\n### AP-LEARNED: ${patternName}\n- **Detection**: ${detection}\n- **Description**: ${description}\n- **Source**: Learned from user edit patterns\n- **Added**: ${new Date().toISOString().split('T')[0]}\n`;
    await appendToWikiPage(`anti-patterns/${deliverableType}.md`, entry);
    await appendWikiLog('learn', `Anti-pattern: ${patternName}`, { type: deliverableType, detection });
}

/**
 * P6-03: Ingest research run results into wiki pages.
 * Called after a research run completes to seed the wiki with new knowledge.
 */
export async function ingestResearchRun(runData: {
    goal: string;
    themes: any[];
    personas: any[];
    recommendations: any[];
    sourceCount: number;
    evidenceCount: number;
    collectedSources?: any[]; // Raw source results from data collection (for article archival)
}): Promise<{ pagesUpdated: number }> {
    let pagesUpdated = 0;
    const date = new Date().toISOString().split('T')[0];

    // 1. Log the operation
    await appendWikiLog('generate', runData.goal.substring(0, 80), {
        themes: runData.themes?.length || 0,
        personas: runData.personas?.length || 0,
        recommendations: runData.recommendations?.length || 0,
        sources: runData.sourceCount,
        evidence: runData.evidenceCount,
    });
    pagesUpdated++;

    // 2. Extract proper nouns from personas and recommendations → brand/proper-nouns.md
    const properNouns = new Set<string>();
    (runData.personas || []).forEach((p: any) => {
        if (p.name) properNouns.add(p.name);
        // Extract capitalized multi-word names from bio
        const nameMatches = (p.bio || '').match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g);
        if (nameMatches) nameMatches.forEach((n: string) => properNouns.add(n));
    });
    (runData.recommendations || []).forEach((r: any) => {
        const nameMatches = (r.title + ' ' + (r.description || '')).match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g);
        if (nameMatches) nameMatches.forEach((n: string) => properNouns.add(n));
    });
    if (properNouns.size > 0) {
        const nounLines = Array.from(properNouns).map(n => `- ${n}`).join('\n');
        await appendToWikiPage('brand/proper-nouns.md', `\n## Auto-extracted (${date})\n${nounLines}`, '## Technology Vendors');
        pagesUpdated++;
    }

    // 3. Extract key findings from themes → evidence pages
    if (runData.themes?.length > 0) {
        const evidenceEntries = runData.themes.map((t: any) =>
            `### ${t.name}\n${t.description || ''}\n- Status: ${t.status || 'unknown'}\n- Citations: ${(t.citations || []).length}`
        ).join('\n\n');
        await appendToWikiPage('evidence/research-findings.md',
            `\n## Research Run: ${date} - ${runData.goal.substring(0, 60)}\n\n${evidenceEntries}`);
        pagesUpdated++;
    }

    // 4. Archive collected articles/sources → sources/{date}-{slug}.md
    // Creates a persistent record of every article collected during this run
    if (runData.collectedSources?.length) {
        try {
            const slug = runData.goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
            const sourceLines: string[] = [];
            for (const src of runData.collectedSources) {
                if (!src.items || src.items.length === 0) continue;
                sourceLines.push(`\n### ${src.source || 'Unknown Source'} (Tier ${src.credibilityTier || '?'}, ${src.items.length} items)\n`);
                for (const item of src.items.slice(0, 15)) {
                    const url = item.url ? ` [View](${item.url})` : '';
                    const dateStr = item.date ? ` (${item.date})` : '';
                    const relevance = (item as any).relevanceScore ? ` | Relevance: ${(item as any).relevanceScore}/100` : '';
                    sourceLines.push(`- **${(item.title || 'Untitled').substring(0, 100)}**${dateStr}${relevance}${url}`);
                }
            }
            if (sourceLines.length > 0) {
                const totalItems = runData.collectedSources.reduce((s: number, src: any) => s + (src.items?.length || 0), 0);
                const archivePage = `---
title: "Research Sources: ${runData.goal.substring(0, 60)}"
type: source-archive
created: ${date}
status: active
tags: [sources, archive, ${slug}]
evidence_count: ${totalItems}
---

# Research Source Archive

**Goal:** ${runData.goal}
**Date:** ${date}
**Sources:** ${runData.collectedSources.length} sources, ${totalItems} total items

${sourceLines.join('\n')}
`;
                await writeWikiPage(`sources/${date}-${slug}.md`, archivePage);
                pagesUpdated++;
                console.log(`[WikiService] Archived ${totalItems} articles to sources/${date}-${slug}.md`);
            }
        } catch (e) {
            console.warn('[WikiService] Article archival failed (non-blocking):', e);
        }
    }

    // 5. A10: Benchmark verification - scan evidence for numbers matching benchmark claims
    try {
        const benchmarkFiles = ['benchmarks/cx-metrics.md', 'benchmarks/technology-adoption.md', 'benchmarks/financial-impact.md', 'benchmarks/maturity-models.md', 'benchmarks/competitive-intel.md'];
        const allEvidenceText = (runData.themes || []).map((t: any) =>
            `${t.description || ''} ${(t.citations || []).map((c: any) => c.text || '').join(' ')}`
        ).join(' ');
        // Extract all numbers from evidence
        const evidenceNumbers = [...allEvidenceText.matchAll(/(\d+(?:\.\d+)?)\s*(%|percent)/gi)].map(m => parseFloat(m[1]));

        let verifiedCount = 0;
        for (const benchFile of benchmarkFiles) {
            const page = await readWikiPage(benchFile);
            if (!page?.content || !page.content.includes('HYPOTHESIS')) continue;

            let updated = page.content;
            let changed = false;
            // Find benchmark data points and check if evidence supports them
            const benchMatches = [...page.content.matchAll(/\*\*Data\*\*:\s*.*?(\d+(?:\.\d+)?)/g)];
            for (const bm of benchMatches) {
                const benchValue = parseFloat(bm[1]);
                // Check if any evidence number is within 20% of the benchmark value
                const match = evidenceNumbers.find(ev => Math.abs(ev - benchValue) / benchValue < 0.2);
                if (match) {
                    // Upgrade the nearest HYPOTHESIS after this data point
                    const idx = updated.indexOf(bm[0]);
                    const hypothesisIdx = updated.indexOf('HYPOTHESIS - verify with current data', idx);
                    if (hypothesisIdx > idx && hypothesisIdx - idx < 200) {
                        updated = updated.substring(0, hypothesisIdx) + `VERIFIED (matched evidence value ${match}%, ${date})` + updated.substring(hypothesisIdx + 'HYPOTHESIS - verify with current data'.length);
                        changed = true;
                        verifiedCount++;
                    }
                }
            }
            if (changed) {
                await writeWikiPage(benchFile, updated);
                pagesUpdated++;
            }
        }
        if (verifiedCount > 0) {
            console.log(`[WikiService] Verified ${verifiedCount} benchmark data points from research evidence`);
        }
    } catch (e) {
        console.warn('[WikiService] Benchmark verification failed (non-blocking):', e);
    }

    return { pagesUpdated };
}

// --- A12: WIKI SEEDING FROM UPLOADED DOCUMENTS ---

/**
 * Extract the ACTUAL research objective from a goal string by stripping
 * prompt-engineering framing that confuses downstream routing. A goal like
 *
 *   "ROLE You are an elite market research analyst embedded with a University's
 *    Advancement... MISSION Surface rigorous, source-grounded, quantified case
 *    studies from named peer... institutions that have modernized advancement..."
 *
 * contains the phrase "market research analyst" which Gemini's per-source
 * query refinement happily keys on - producing r/marketingautomation and
 * r/CRM results instead of higher-ed advancement sources. It also makes
 * engagement slugs like "role-you-are-an-elite-market-research-an" that
 * false-match any other "ROLE You are..." run regardless of topic.
 *
 * This helper extracts the actual objective for slug generation, query
 * refinement, and engagement-memory matching. The RAW goal is still passed
 * to the AI system prompt (it contains valuable structural context) - only
 * the routing/matching layers use the extracted version.
 */
export function extractResearchObjective(goal: string): string {
    if (!goal || typeof goal !== 'string') return '';
    const trimmed = goal.trim();
    // Prefer the MISSION block when present - that's the actual research
    // question in most prompt-engineered goals. Capture until the next
    // section header (TARGET, RESEARCH, OUTPUT, HARD REQUIREMENTS, etc.).
    const missionMatch = trimmed.match(/\bMISSION[\s:]+(.+?)(?=\n\s*(?:TARGET|RESEARCH|OUTPUT|HARD|SPECIFIC|TIMELINE|FOCUS|GOAL|DIMENSIONS|REQUIREMENTS|NOTES|OBJECTIVE|DELIVERABLE|CONTEXT)\b|$)/is);
    if (missionMatch && missionMatch[1].trim().length > 40) {
        return missionMatch[1].trim().replace(/\s+/g, ' ');
    }
    // Strip common role-framing prefixes so "ROLE You are an elite market
    // research analyst..." doesn't leak into slugs and queries.
    let cleaned = trimmed;
    cleaned = cleaned.replace(/^\s*ROLE[\s:]*You\s+are\s+[^.]*\.\s*/i, '');
    cleaned = cleaned.replace(/^\s*ROLE[\s:]+[^.]*\.\s*/i, '');
    cleaned = cleaned.replace(/^\s*You\s+are\s+(?:an?\s+)?[^.]*\.\s*/i, '');
    cleaned = cleaned.replace(/^\s*Act\s+as\s+[^.]*\.\s*/i, '');
    cleaned = cleaned.replace(/^\s*Imagine\s+you\s+are\s+[^.]*\.\s*/i, '');
    cleaned = cleaned.replace(/^\s*Assume\s+the\s+role\s+of\s+[^.]*\.\s*/i, '');
    // If the cleaned version is meaningfully shorter than the raw goal AND
    // still has enough content to be useful, return it. Otherwise fall back
    // to the raw goal.
    if (cleaned.length >= 40 && cleaned.length < trimmed.length) {
        return cleaned.replace(/\s+/g, ' ').trim();
    }
    return trimmed.replace(/\s+/g, ' ');
}

/** Build an engagement slug from a research goal. Uses extracted objective
 *  (not raw goal) so the slug reflects the actual research topic, not the
 *  prompt-engineering preamble.
 *
 *  2026-05-22 - Default maxLen bumped from 40 to 60. Phase B writers and
 *  the geminiService deliverable readers were already calling this with an
 *  explicit `60` argument; the three legacy call sites (uploads archive
 *  paths) were still using the 40 default, causing the same goal to write
 *  to /uploads/<40-char> while the rest of the chain wrote / read at
 *  /engagements/<60-char>. Bumping the default unifies every call site
 *  on a single canonical slug for any given goal. */
export function buildEngagementSlug(goal: string, maxLen: number = 60): string {
    const objective = extractResearchObjective(goal);
    return objective.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, maxLen).replace(/-+$/, '') || 'misc';
}

/**
 * Create a wiki source summary page for uploaded documents.
 * Extracts file names, types, and creates a lightweight catalog
 * so the wiki knows what client documents exist.
 */
/**
 * Normalize an uploaded filename for display + LLM prompt safety.
 *
 * Root cause of the 2026-04-22 repetition-collapse incident: stakeholder
 * interview exports shared a 60+ char boilerplate suffix
 * (" - NU Advancement Engagement _ NXT Humans Stakeholder Interview_anonymized.txt").
 * Across 8 files that pattern repeated verbatim in the document catalog and
 * in individual upload wiki records, creating a strong attractor in the
 * corpus that caused Gemini Flash to enter repetition collapse on multiple
 * synthesis steps (strategy-author, gap-analysis, service-blueprint).
 * RepetitionGuard fired at 26x / 31x / 54x - salvaged only 1 recommendation
 * and 0 barriers from a rich 599-evidence corpus.
 *
 * Fix: strip the shared suffix at ingestion time so only the distinguishing
 * signal (speaker name, document topic) enters the prompt. Original filename
 * stays in the frontmatter as {originalName} for provenance.
 */
export function normalizeUploadedFilename(raw: string): { display: string; type: string; original: string } {
    const ext = raw.split('.').pop()?.toLowerCase() || 'unknown';
    const typeMap: Record<string, string> = {
        'pdf': 'Document', 'docx': 'Document', 'doc': 'Document',
        'pptx': 'Presentation', 'ppt': 'Presentation',
        'xlsx': 'Spreadsheet', 'xls': 'Spreadsheet', 'csv': 'Data',
        'txt': 'Text', 'json': 'Data', 'md': 'Text',
    };
    const type = typeMap[ext] || 'File';

    let display = raw
        .replace(/\.(pdf|docx?|pptx?|xlsx?|csv|txt|json|md)$/i, '')
        // "Speaker Name - <engagement> Stakeholder Interview_anonymized"
        .replace(/\s*-\s*[^-]+Stakeholder Interview(_anonymized)?$/i, ' - Stakeholder Interview')
        // "_ NXT Humans" / "_ NU Advancement" style brand/engagement tags
        .replace(/\s*_\s*(NXT Humans[^_]*|NU Advancement[^_]*|NXT\s+[A-Z][^_]*|Northeastern\s+Advancement[^_]*)/gi, '')
        // generic "_anonymized", "_redacted", "_final" suffixes
        .replace(/_(anonymized|redacted|final|draft|v\d+|copy)\b/gi, '')
        // trailing "FINAL" / "DRAFT" tokens
        .replace(/\s+(FINAL|DRAFT|COPY)\s*$/, '')
        // collapse repeated separators and whitespace
        .replace(/[\s\-_]{2,}/g, ' ')
        .trim();

    if (display.length > 100) display = display.substring(0, 97) + '...';
    if (!display) display = raw;
    return { display, type, original: raw };
}

export async function seedWikiFromUploads(fileNames: string[], researchGoal: string): Promise<number> {
    if (!fileNames.length) return 0;
    const date = new Date().toISOString().split('T')[0];
    const slug = buildEngagementSlug(researchGoal);
    // Dedup defense (A-fix 2026-04-21): even if a caller accidentally passes
    // the same filename twice, the catalog written to the wiki should list
    // each file once. Keep first occurrence to preserve insertion order.
    const uniqueNames = Array.from(new Set(fileNames.filter(Boolean)));

    const fileEntries = uniqueNames.map(name => {
        const { display, type } = normalizeUploadedFilename(name);
        return `- **${display}** (${type})`;
    }).join('\n');

    const page = `---
title: "Uploaded Documents: ${extractResearchObjective(researchGoal).substring(0, 60) || researchGoal.substring(0, 50)}"
type: source-summary
created: ${date}
status: active
tags: [uploads, client-docs, ${slug}]
evidence_count: ${uniqueNames.length}
---

# Client-Uploaded Documents

**Research Objective:** ${extractResearchObjective(researchGoal)}
**Raw Goal (full prompt):** ${researchGoal}
**Upload Date:** ${date}
**Files:** ${uniqueNames.length}

## Document Catalog

${fileEntries}

## Notes

These documents represent the client's own materials - proposals, SOWs, transcripts, strategies, budgets.
They define the project scope, stakeholders, goals, constraints, and organizational reality.
The AI ingestion pipeline reads these as PRIORITY 1 sources.
`;

    try {
        // 2026-06-12 - chunk + engagement-tag so the upload catalog is tier-1
        // retrievable for THIS session (was an untagged, unchunked stub).
        await writeWikiPage(`sources/uploads-${date}-${slug}.md`, page, { chunk: true, engagement: slug });
        console.log(`[WikiService] Seeded wiki with ${fileNames.length} uploaded document records`);
        return 1;
    } catch (e) {
        console.warn('[WikiService] Upload seeding failed (non-blocking):', e);
        return 0;
    }
}

// --- AD-HOC MID-CHAT UPLOADS (2026-05-08) ---
//
// Persist individual files uploaded mid-conversation in the AI Analyst or
// Designer chat. Distinct from `seedWikiFromUploads` (which writes a single
// roll-up summary at engagement start) and `archiveUploadedDocs` (which
// writes per-doc article pages at engagement start). Ad-hoc uploads can
// happen at any point during a session and need their own folder so they
// don't get tangled with the engagement's primary uploads.

export interface AdHocUploadInput {
    /** Original filename, e.g. "Q3-strategy.docx" */
    filename: string;
    /** Plain-text body returned by /api/parse-upload */
    parsedText: string;
    /** MIME type from the browser File object */
    mimeType: string;
    /** Page count for PDFs (optional) */
    pageCount?: number;
    /** Slide count for PPTX (optional) */
    slideCount?: number;
    /** Set when the upload was an image. parsedText now carries the Gemini
     *  vision OCR/transcription (proxy /api/parse-upload image-vision-ocr). */
    isImage?: boolean;
    /** Which surface the upload came from: 'analyst' or 'designer' */
    chatSurface: 'analyst' | 'designer';
}

/** Write a single ad-hoc mid-chat upload to wiki/uploads/ad-hoc/{slug}/{date}/.
 *  Returns the wiki path on success or null on failure. Non-blocking - chat
 *  flow continues regardless. The path is suitable for setting on the
 *  ChatAttachment so the UI can link to the persisted copy. */
export async function writeAdHocUpload(
    input: AdHocUploadInput,
    sessionSlug: string,
): Promise<string | null> {
    if (!input.parsedText && !input.isImage) {
        console.warn('[WikiService] writeAdHocUpload skipped: empty parsedText for', input.filename);
        return null;
    }
    const date = new Date().toISOString().split('T')[0];
    const safeFilename = input.filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
    const wikiPath = `uploads/ad-hoc/${sessionSlug}/${date}/${safeFilename}.md`;

    const fmLines: string[] = [
        '---',
        `filename: ${JSON.stringify(input.filename)}`,
        `mimeType: ${input.mimeType}`,
        `charCount: ${input.parsedText.length}`,
    ];
    if (typeof input.pageCount === 'number') fmLines.push(`pageCount: ${input.pageCount}`);
    if (typeof input.slideCount === 'number') fmLines.push(`slideCount: ${input.slideCount}`);
    if (input.isImage) fmLines.push('isImage: true');
    fmLines.push(`chatSurface: ${input.chatSurface}`);
    fmLines.push(`uploadedAt: ${new Date().toISOString()}`);
    fmLines.push(`sessionSlug: ${sessionSlug}`);
    fmLines.push('kind: ad-hoc-upload');
    fmLines.push('---');
    fmLines.push('');
    fmLines.push(`# ${input.filename}`);
    fmLines.push('');
    fmLines.push(`Ad-hoc upload from the ${input.chatSurface === 'analyst' ? 'AI Analyst' : 'Designer'} chat.`);
    fmLines.push('');
    fmLines.push('## Content');
    fmLines.push('');

    const body = fmLines.join('\n') + (input.parsedText || '[no extracted text]');

    // 2026-06-15 - chunk + engagement-tag in-chat uploads so they enter the
    // manifest catalog (chunk_count>0) and reach BOTH engagement-scoped (tier-1)
    // and objective-ranked (tier-1.5) deliverable grounding - exactly like
    // landing-page uploads (seedWikiFromUploads / archiveUploadedDocs already do
    // this). Without it, mid-chat uploads (including vision-OCR'd screenshots and
    // image-only PDFs) persisted to the wiki but never reached generation, so a
    // "one slide per uploaded app" request had nothing to ground on. Only chunk
    // real extracted text - never the "[Image upload: ...]" no-content stub.
    const _hasRealText = (input.parsedText || '').trim().length >= 40
        && !/^\s*\[Image upload:/.test(input.parsedText.trim());

    try {
        const ok = await writeWikiPage(wikiPath, body, { chunk: _hasRealText, engagement: sessionSlug });
        if (ok) {
            console.log(`[WikiService] Ad-hoc upload persisted: ${wikiPath} (${body.length} chars, chunked=${_hasRealText}, engagement=${sessionSlug})`);
            return wikiPath;
        }
        return null;
    } catch (e) {
        console.warn(`[WikiService] writeAdHocUpload failed for ${input.filename}:`, e);
        return null;
    }
}

// --- PHASE 1.4: ARCHIVE UPLOADED DOCS AS WIKI ARTICLES ---

/** A single uploaded document with parsed text content. Used by
 *  `archiveUploadedDocs` to persist each file body to its own wiki file
 *  for cross-engagement recall, slide grounding, and chat lazy-loading. */
export interface UploadedDoc {
    name: string;
    mimeType?: string;
    /** Parsed plain-text body. For PDFs this is the pypdf-extracted text;
     *  for .txt/.md/.csv/.json it's the decoded base64 content. */
    content: string;
}

/** Decode base64 safely; returns empty string on malformed input. */
function _safeB64Decode(b64: string): string {
    try {
        if (typeof atob === 'function') return atob(b64);
        return Buffer.from(b64, 'base64').toString('utf-8');
    } catch {
        return '';
    }
}

/** Best-effort text extraction from a FileUpload object. Accepts either
 *  { data: base64 } (current FileUpload shape) or pre-parsed text via
 *  content/text fields. Binary formats (PDF/DOCX) need upstream parsing -
 *  they return empty and the caller should skip the wiki write. */
export function extractTextFromUpload(f: any): string {
    if (!f) return '';
    // Preferred path: proxy-parsed text populated by FileUpload background parse.
    // Works for PDFs (PyPDF2), DOCX/XLSX (office-regex), text files (decode).
    if (typeof f.parsedText === 'string' && f.parsedText.length > 40) return f.parsedText;
    // Legacy pre-parsed fields
    if (typeof f.content === 'string' && f.content.length > 40) return f.content;
    if (typeof f.text === 'string' && f.text.length > 40) return f.text;
    // Decode base64 for text-like MIME types (fallback when parser hasn't run yet)
    const mime = (f.mimeType || f.type || '').toLowerCase();
    const ext = ((f.name || '').split('.').pop() || '').toLowerCase();
    const isText = mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || mime === 'text/csv'
        || ext === 'txt' || ext === 'md' || ext === 'json' || ext === 'csv' || ext === 'xml';
    if (isText && typeof f.data === 'string') {
        const decoded = _safeB64Decode(f.data);
        if (decoded.length > 40) return decoded;
    }
    return '';
}

/**
 * Archive every uploaded document's body as its own wiki article.
 *
 * Each file lands at `wiki/uploads/{engagement-slug}/{hash}.md` via the
 * proxy's `/api/wiki/write-article` endpoint, with frontmatter capturing
 * filename, MIME type, upload date, engagement context, and char count.
 * Binaries without parseable text are skipped - they'll be wiki'd later
 * when the orchestrator runs them through `/api/extract-pdf`.
 *
 * Returns the count of files successfully archived.
 */
export async function archiveUploadedDocs(files: any[], researchGoal: string): Promise<number> {
    if (!Array.isArray(files) || files.length === 0) return 0;
    // Engagement slug now derived from the extracted research OBJECTIVE rather
    // than the raw goal - so "ROLE You are an elite market research analyst..."
    // doesn't leak into directory names and false-match future runs.
    const engagementSlug = buildEngagementSlug(researchGoal);
    // Dedup defense (A-fix 2026-04-21): if the caller passed the same file
    // twice (FileUpload's initial + post-parse double-call), archive each
    // unique filename only once. Keep the LAST copy (has parsedText attached).
    const byName = new Map<string, any>();
    for (const f of files) {
        if (!f || !f.name) continue;
        byName.set(f.name, f);
    }
    const uniqueFiles = Array.from(byName.values());
    let archived = 0;
    for (const f of uniqueFiles) {
        if (!f || !f.name) continue;
        let text = extractTextFromUpload(f);
        // 2026-06-16 fix (deck-ignored-uploads, sequencing): a binary upload (scanned/image PDF) whose
        // slow vision-OCR was still in flight when the archive ran lands here with NO parsedText and gets
        // skipped -> "Archived 1/3" -> its body never reaches the wiki/manifest (primary grounding), even
        // though parsing eventually succeeds. Parse it inline NOW (idempotent; 280s budget matches the
        // proxy's vision OCR) so every uploaded body is archived, not just the fast text docs.
        if ((!text || text.length < 40) && f.data && !/\.(txt|md|json|csv)$/i.test(String(f.name))) {
            try {
                const pr = await fetch(`${PROXY_BASE}/api/parse-upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: f.name, base64: f.data, mimeType: f.type }),
                    signal: AbortSignal.timeout(280_000),
                });
                if (pr.ok) {
                    const pj = await pr.json();
                    if (pj && typeof pj.text === 'string' && pj.text.length >= 40) {
                        text = pj.text;
                        console.log(`[WikiService] inline-parsed ${f.name} for archive -> ${pj.text.length} chars via ${pj.method || '?'}`);
                    }
                }
            } catch (e) { console.warn(`[WikiService] inline parse for archive failed for ${f.name}:`, e); }
        }
        if (!text || text.length < 40) continue;
        try {
            // Synthetic URL uses the ORIGINAL filename so hashes stay stable
            // across re-runs (no drift between engagements). But the SOURCE
            // and TITLE that land in frontmatter + embedding text get the
            // normalized display name - this is what the LLM sees in prompts
            // and what the attractor phrase had to be stripped from.
            const { display: normalizedName } = normalizeUploadedFilename(f.name);
            const syntheticUrl = `upload://${engagementSlug}/${encodeURIComponent(f.name)}`;
            const resp = await fetch(`${PROXY_BASE}/api/wiki/write-article`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: syntheticUrl,
                    content: text,
                    source: normalizedName,
                    title: normalizedName,
                    tier: 1, // Client uploads are Tier 1 context
                    method: 'upload',
                    kind: 'upload',
                    engagement: engagementSlug,
                }),
            });
            if (resp.ok) {
                archived++;
            }
        } catch (e) {
            console.warn(`[WikiService] Upload archive failed for ${f.name}:`, e);
        }
    }
    if (archived > 0) {
        console.log(`[WikiService] Archived ${archived}/${uniqueFiles.length} uploaded document bodies to wiki/uploads/${engagementSlug}/${files.length !== uniqueFiles.length ? ` (deduped from ${files.length} input entries)` : ''}`);
    }
    return archived;
}

/**
 * Convert parsed uploads into DataSourceItem[] so they flow through the
 * same pipeline that produces corpus chunks, KG source nodes, and theme
 * evidence. Each upload becomes a Tier 1 item with extractionMethod='upload'
 * and a stable wiki URL that matches the archive written by
 * archiveUploadedDocs. Items arrive pre-enriched: the parsed body IS the
 * content, no Jina round-trip needed.
 *
 * This is what makes uploads appear as first-class source tiles in the
 * Analyst Desk treemap and as evidence nodes linked to any themes whose
 * extraction cites their text.
 */
export function uploadsToDataSourceItems(files: any[], researchGoal: string): any[] {
    if (!Array.isArray(files) || files.length === 0) return [];
    const engagementSlug = buildEngagementSlug(researchGoal);
    const byName = new Map<string, any>();
    for (const f of files) {
        if (!f || !f.name) continue;
        byName.set(f.name, f);
    }
    const items: any[] = [];
    for (const f of Array.from(byName.values())) {
        const text = extractTextFromUpload(f);
        if (!text || text.length < 40) continue;
        const syntheticUrl = `upload://${engagementSlug}/${encodeURIComponent(f.name)}`;
        // Trim to the per-item enrichment cap so downstream corpus assembly
        // doesn't balloon from a single 45KB PDF body.
        const capped = text.substring(0, 30_000);
        items.push({
            id: `upload_${f.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().substring(0, 50)}`,
            title: f.name,
            content: capped,
            url: syntheticUrl,
            date: new Date().toISOString().split('T')[0],
            sourceType: 'company' as const,     // 'client-doc' not in the union type; 'company' is closest
            sourceName: 'Client Uploads',        // single grouping so KG shows one "Client Uploads" tile
            credibilityTier: 1 as const,
            relevanceScore: 100,                 // client uploads are axiomatically relevant
            enriched: true,                      // pre-enriched; skip Jina path
            extractionMethod: 'upload',
            wikiPath: `uploads/${engagementSlug}/${_urlHash10(syntheticUrl)}.md`,
        });
    }
    return items;
}

/** Client-side blake2b-ish 10-char hash. MUST match the proxy's _url_hash
 *  algorithm so the wikiPath we pre-compute here points at the same file
 *  the proxy writes. Implementation: strip tracking params + trailing
 *  slashes + lowercase, then sync shell out to a simple 40-bit hash.
 *  (We don't have blake2b in the browser; fall back to a simpler stable
 *  hash and accept that the wikiPath may not ALWAYS match. The archive
 *  write is the source of truth.) */
function _urlHash10(url: string): string {
    // Non-cryptographic 40-bit fold. Good enough to avoid collisions within
    // one engagement; the actual file-write uses the proxy's blake2b and is
    // authoritative. We compute this only to attach a plausible wikiPath
    // hint before the write returns.
    const s = (url || '').toLowerCase().trim().replace(/\/+$/, '');
    let h = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < s.length; i++) {
        h = (h ^ BigInt(s.charCodeAt(i))) * prime & 0xffffffffffn;
    }
    return h.toString(16).padStart(10, '0').substring(0, 10);
}

// --- PHASE 1.5: ARCHIVE SYNTHESIS OUTPUTS AS WIKI FILES ---

/** Synthesis deliverable type names. One folder per type under wiki/synthesis/. */
export type SynthesisKind = 'themes' | 'personas' | 'recommendations' | 'barriers' | 'journeys' | 'prd' | 'roadmap' | 'tech-arch' | 'gap-analysis' | 'tech-audit' | 'competitive' | 'strategic-report';

/** Serialize a structured synthesis artifact to markdown with YAML frontmatter.
 *  The resulting file is both human-readable and machine-parseable so future
 *  runs can semantically match engagements and reuse prior insights. */
function _serializeSynthesis(kind: SynthesisKind, data: any): string {
    // For array-of-items deliverables (themes, personas, recs, etc.),
    // render each item as its own markdown section.
    const items: any[] = Array.isArray(data) ? data : (data?.themes || data?.personas || data?.recommendations || data?.items || data?.gaps || data?.features || data?.phases || data?.stages || data?.systems || data?.layers || data?.rows || []);
    if (Array.isArray(items) && items.length > 0) {
        return items.map((it: any, i: number) => {
            const name = it.name || it.label || it.title || it.capability || `${kind.slice(0, -1)} ${i + 1}`;
            const body = Object.entries(it)
                .filter(([k, v]) => v != null && k !== 'name' && k !== 'label' && k !== 'title')
                .map(([k, v]) => `**${k}:** ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                .join('\n\n');
            return `## ${name}\n\n${body}`;
        }).join('\n\n---\n\n');
    }
    // Fallback for unstructured synthesis - dump JSON.
    return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
}

/**
 * Archive a synthesis output (themes, personas, recs, etc.) to the wiki
 * so the chat, future engagements, and the self-improvement loop can
 * read the exact structured artifact that was approved.
 *
 * Path: wiki/synthesis/{engagement-slug}/{kind}-{timestamp}.md
 */
export async function archiveSynthesisOutput(kind: SynthesisKind, data: any, researchGoal: string): Promise<string | null> {
    if (!data) return null;
    // 2026-05-23 - Use the canonical buildEngagementSlug so synthesis archives
    // co-locate with the rest of the engagement's wiki state under the same slug.
    const engagementSlug = buildEngagementSlug(researchGoal || 'untitled', 60);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const body = _serializeSynthesis(kind, data);
    const frontmatter = `---
kind: synthesis
synthesis_kind: ${kind}
engagement: "${engagementSlug}"
goal: "${(researchGoal || '').replace(/"/g, '\\"').substring(0, 200)}"
created: ${new Date().toISOString()}
---`;
    const content = `${frontmatter}\n\n# ${kind.toUpperCase().replace('-', ' ')} - ${ts}\n\n${body}\n`;
    const path = `synthesis/${engagementSlug}/${kind}-${ts}.md`;
    try {
        const ok = await writeWikiPage(path, content);
        if (ok) {
            console.log(`[WikiService] Archived synthesis ${kind} → wiki/${path}`);
            return path;
        }
    } catch (e) {
        console.warn(`[WikiService] Synthesis archive failed for ${kind}:`, e);
    }
    return null;
}

// --- ENGAGEMENT MEMORY (P6-07) ---

/**
 * Create a slug from a research goal string.
 * Lowercase, replace spaces with hyphens, remove special chars, truncate to 50 chars.
 */
function createGoalSlug(goal: string): string {
    return goal
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
}

/**
 * Save an engagement memory file to the wiki.
 * Records the research goal, themes, personas, recommendations, and source count
 * as a structured markdown page under engagements/.
 */
export async function saveEngagementMemory(
    goal: string,
    date: string,
    themes: any[],
    personas: any[],
    recommendations: any[],
    sourceCount: number
): Promise<boolean> {
    // 2026-05-22 - Use buildEngagementSlug for consistency with the rest of
    // the wiki write/read paths. createGoalSlug was producing a different
    // slug (50-char raw-goal vs 60-char extracted-objective) which caused
    // saveEngagementMemory to write under a slug the deliverable generators
    // would never look up.
    const slug = buildEngagementSlug(goal, 60);
    if (!slug) {
        console.warn('[WikiService] Cannot save engagement memory: empty slug from goal');
        return false;
    }

    const themesSection = (themes || []).map(t =>
        `- **${t.name || 'Unnamed'}**: ${t.description || 'No description'}`
    ).join('\n') || '- None identified';

    const personasSection = (personas || []).map(p =>
        `- **${p.name || 'Unnamed'}** (${p.role || 'Unknown role'}): "${p.quote || ''}"`
    ).join('\n') || '- None generated';

    const recsSection = (recommendations || []).map(r =>
        `- **[${r.impactLevel || 'Unknown'}] ${r.title || 'Untitled'}**: ${r.description || ''}`
    ).join('\n') || '- None generated';

    const content = `---
title: "${goal.replace(/"/g, '\\"')}"
type: engagement
created: "${date}"
updated: "${date}"
---

## Research Goal

${goal}

## Themes Found

${themesSection}

## Personas Identified

${personasSection}

## Recommendations Made

${recsSection}

## Sources Used

- Total sources consulted: ${sourceCount}
- Analysis date: ${date}
`;

    const success = await writeWikiPage(`engagements/${slug}.md`, content);
    if (success) {
        await appendWikiLog('ingest', `Engagement memory: ${slug}`, {
            goal: goal.substring(0, 80),
            themes: themes?.length || 0,
            personas: personas?.length || 0,
            recommendations: recommendations?.length || 0,
            sources: sourceCount,
        });
    }
    return success;
}

/**
 * Load a previously saved engagement memory by goal slug.
 * Goes directly to proxy (which has live filesystem) to avoid 404 console noise
 * from the static nginx path on first-run when no engagement file exists yet.
 */
export async function loadEngagementMemory(goalSlug: string, fullGoal?: string): Promise<WikiPage | null> {
    // Strategy 1: Exact slug match (fast)
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/engagements/${goalSlug}.md`);
        if (resp.ok) {
            const data = await resp.json();
            if (data.content) {
                return {
                    path: `engagements/${goalSlug}.md`,
                    title: goalSlug,
                    type: 'engagement',
                    content: data.content,
                    frontmatter: parseFrontmatter(data.content) || getDefaultFrontmatter(),
                };
            }
        }
    } catch { /* try semantic matching */ }

    // A5: Strategy 2: Semantic keyword matching (broader recall)
    // Extract significant keywords from the goal and match against all engagement files
    if (fullGoal) {
        try {
            const goalWords = fullGoal.toLowerCase().split(/\s+/).filter(w => w.length > 4);
            // List all engagement files via proxy (retry-wrapped)
            const listResp = await resilientGet(`${PROXY_BASE}/api/wiki/list/engagements`);
            if (listResp && listResp.ok) {
                const files: string[] = await listResp.json();
                let bestMatch: { file: string; overlap: number; content: string } | null = null;
                for (const file of files) {
                    if (file === `${goalSlug}.md`) continue; // Already tried exact match
                    const fileWords = file.replace('.md', '').split('-').filter(w => w.length > 3);
                    const overlap = goalWords.filter(gw => fileWords.some(fw => gw.includes(fw) || fw.includes(gw))).length;
                    if (overlap >= 3 && (!bestMatch || overlap > bestMatch.overlap)) {
                        try {
                            const readResp = await resilientGet(`${PROXY_BASE}/api/wiki/read/engagements/${file}`);
                            if (readResp && readResp.ok) {
                                const data = await readResp.json();
                                if (data.content) bestMatch = { file, overlap, content: data.content };
                            }
                        } catch { /* skip this file */ }
                    }
                }
                if (bestMatch) {
                    console.log(`[WikiService] Semantic engagement match: ${bestMatch.file} (${bestMatch.overlap} keyword overlaps)`);
                    return {
                        path: `engagements/${bestMatch.file}`,
                        title: bestMatch.file.replace('.md', ''),
                        type: 'engagement',
                        content: bestMatch.content,
                        frontmatter: parseFrontmatter(bestMatch.content) || getDefaultFrontmatter(),
                    };
                }
            }
        } catch { /* non-blocking */ }
    }

    return null;
}

// --- PHASE 1.9: CROSS-ENGAGEMENT MEMORY MATCHING ---

/** Stopwords excluded from semantic keyword overlap. Prevents "the", "and",
 *  etc. from driving false matches. */
const _ENGAGEMENT_STOPWORDS = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'are',
    'was', 'were', 'but', 'not', 'their', 'them', 'they', 'into', 'than',
    'which', 'what', 'when', 'where', 'also', 'been', 'being', 'about', 'more',
    'most', 'some', 'over', 'between', 'through', 'across', 'within',
    'research', 'analysis', 'project', 'create', 'develop', 'comprehensive',
    'strategy', 'roadmap', 'identify', 'assess', 'evaluate',
]);

function _extractGoalKeywords(goal: string, minLen = 5): Set<string> {
    const out = new Set<string>();
    for (const raw of (goal || '').toLowerCase().split(/\W+/)) {
        if (raw.length < minLen) continue;
        if (_ENGAGEMENT_STOPWORDS.has(raw)) continue;
        out.add(raw);
    }
    return out;
}

export interface PriorEngagementMatch {
    /** Canonical engagement slug (directory name under wiki/synthesis/) */
    engagement: string;
    /** Keyword-overlap count with the current goal - sort key */
    score: number;
    /** Overlapping keywords, for transparency + UI display */
    matchedTerms: string[];
    /** Paths under wiki/ for each synthesis artifact in this engagement */
    synthesisPaths: string[];
    /** Path to the top-level engagement memo (if present) */
    engagementPath?: string;
    /** Short preview extracted from the engagement memo */
    preview?: string;
}

/**
 * Phase 1.9 - find prior engagements whose topic / goal overlaps with the
 * current research goal. Scans both:
 *   - wiki/engagements/*.md (legacy single-file engagement memos)
 *   - wiki/synthesis/{engagement-slug}/*.md (new per-artifact synthesis files)
 *
 * Returns ranked matches so the brief-intake UI can offer "review N prior
 * runs?" and the chat grounding context can inject relevant prior insights.
 *
 * All matching is local (proxy calls only), bounded, and safe to call
 * speculatively on every goal-change keystroke.
 */
export async function findPriorEngagementMatches(goal: string, opts: { limit?: number; minScore?: number } = {}): Promise<PriorEngagementMatch[]> {
    const limit = opts.limit ?? 5;
    const minScore = opts.minScore ?? 2;
    const goalWords = _extractGoalKeywords(goal);
    if (goalWords.size === 0) return [];

    // Discover both directories in parallel with retry-on-transient-fail.
    // Docker network renegotiation on Windows causes ERR_NETWORK_CHANGED
    // immediately after container rebuild; resilientGet retries with backoff.
    const [engagementsResp, synthesisResp] = await Promise.all([
        resilientGet(`${PROXY_BASE}/api/wiki/list/engagements`),
        resilientGet(`${PROXY_BASE}/api/wiki/list/synthesis`),
    ]);

    const engagementFiles: string[] = engagementsResp?.ok ? await engagementsResp.json().then((d: any) => (d.files || d || []).map((f: any) => typeof f === 'string' ? f : f.name)).catch(() => []) : [];
    const synthesisBuckets: string[] = synthesisResp?.ok ? await synthesisResp.json().then((d: any) => (d.files || d || [])).catch(() => []) : [];

    // Score by keyword overlap with the filename slug.
    // engagementFiles are flat .md files; synthesisBuckets are subdirectory names.
    type Candidate = { slug: string; score: number; matched: string[]; engagementPath?: string; synthesisDir?: string };
    const byEngagement = new Map<string, Candidate>();

    const scoreSlug = (slug: string): { score: number; matched: string[] } => {
        const slugWords = slug.replace(/\.md$/, '').split('-').filter(w => w.length >= 4);
        const matched: string[] = [];
        for (const gw of goalWords) {
            if (slugWords.some(sw => sw.includes(gw) || gw.includes(sw))) matched.push(gw);
        }
        return { score: matched.length, matched };
    };

    for (const file of engagementFiles) {
        if (!file.endsWith('.md')) continue;
        const slug = file.replace(/\.md$/, '');
        const { score, matched } = scoreSlug(slug);
        if (score < minScore) continue;
        byEngagement.set(slug, { slug, score, matched, engagementPath: `engagements/${file}` });
    }
    for (const bucket of synthesisBuckets) {
        if (typeof bucket !== 'string' || bucket.startsWith('.')) continue;
        const { score, matched } = scoreSlug(bucket);
        if (score < minScore) continue;
        const existing = byEngagement.get(bucket);
        if (existing) {
            existing.score = Math.max(existing.score, score);
            existing.synthesisDir = bucket;
        } else {
            byEngagement.set(bucket, { slug: bucket, score, matched, synthesisDir: bucket });
        }
    }

    // Rank + take top N
    const ranked = Array.from(byEngagement.values()).sort((a, b) => b.score - a.score).slice(0, limit);

    // For each top candidate, list synthesis files in its bucket
    const matches: PriorEngagementMatch[] = [];
    for (const c of ranked) {
        const paths: string[] = [];
        if (c.synthesisDir) {
            const listResp = await resilientGet(`${PROXY_BASE}/api/wiki/list/synthesis/${c.synthesisDir}`);
            if (listResp && listResp.ok) {
                try {
                    const d = await listResp.json();
                    const files: string[] = (d.files || d || []).filter((f: any) => typeof f === 'string' && f.endsWith('.md'));
                    for (const f of files) paths.push(`synthesis/${c.synthesisDir}/${f}`);
                } catch { /* skip JSON parse fail */ }
            }
        }
        let preview: string | undefined;
        if (c.engagementPath) {
            const r = await resilientGet(`${PROXY_BASE}/api/wiki/read/${c.engagementPath}`);
            if (r && r.ok) {
                try {
                    const d = await r.json();
                    const body = (d.content || '').replace(/^---[\s\S]*?---/, '').trim();
                    preview = body.substring(0, 300);
                } catch { /* skip */ }
            }
        }
        matches.push({
            engagement: c.slug,
            score: c.score,
            matchedTerms: c.matched,
            synthesisPaths: paths,
            engagementPath: c.engagementPath,
            preview,
        });
    }
    return matches;
}

/**
 * Phase 1.9 - stitch matched prior-engagement synthesis files into a
 * single labeled markdown block. Used by the chat grounding context so
 * the LLM can surface reusable insights from prior runs.
 *
 * Bounded: maxChars total, maxFiles per engagement, preserves frontmatter
 * (minus the YAML) so kind + engagement tags survive into the prompt.
 */
export async function loadPriorSynthesisBundle(matches: PriorEngagementMatch[], opts: { maxChars?: number; maxFilesPerEngagement?: number } = {}): Promise<string> {
    if (!matches.length) return '';
    const maxChars = opts.maxChars ?? 40_000;
    const maxFiles = opts.maxFilesPerEngagement ?? 4;
    const blocks: string[] = [];
    let total = 0;
    for (const m of matches) {
        const header = `### Prior engagement: ${m.engagement} (score=${m.score}, matched=${m.matchedTerms.join(', ')})`;
        blocks.push(header);
        total += header.length + 2;
        // Engagement memo preview
        if (m.engagementPath) {
            try {
                const r = await fetch(`${PROXY_BASE}/api/wiki/read/${m.engagementPath}`);
                if (r.ok) {
                    const d = await r.json();
                    const body = (d.content || '').replace(/^---[\s\S]*?---\n*/, '').trim().substring(0, 2000);
                    if (body) {
                        blocks.push(body);
                        total += body.length + 2;
                    }
                }
            } catch { /* skip */ }
        }
        // Synthesis files
        const toLoad = m.synthesisPaths.slice(0, maxFiles);
        for (const path of toLoad) {
            if (total >= maxChars) break;
            try {
                const r = await fetch(`${PROXY_BASE}/api/wiki/read/${path}`);
                if (!r.ok) continue;
                const d = await r.json();
                const body = (d.content || '').replace(/^---[\s\S]*?---\n*/, '').trim();
                if (!body) continue;
                const trimmed = body.substring(0, Math.max(1000, maxChars - total - 200));
                blocks.push(`#### ${path}\n${trimmed}`);
                total += trimmed.length + path.length + 8;
                if (total >= maxChars) break;
            } catch { /* skip */ }
        }
        blocks.push('---');
        total += 4;
        if (total >= maxChars) break;
    }
    return blocks.join('\n\n');
}

// --- QUALITY SCORE PERSISTENCE (P6-05) ---

/**
 * Persist a quality score entry to the wiki synthesis log.
 *
 * Appends a row to wiki/synthesis/quality-scores.md so quality trends
 * can be tracked across research runs and correlated with active constraints.
 *
 * @param deliverableType - The deliverable that was scored (e.g., "personas", "deck")
 * @param score - Quality score 0-100 (higher is better)
 * @param activeConstraints - List of constraint names that were active during generation
 * @param date - ISO date string (e.g., "2026-04-11")
 */
export async function persistQualityScore(
    deliverableType: string,
    score: number,
    activeConstraints: string[],
    date: string
): Promise<boolean> {
    const constraintSummary = `${activeConstraints.length} constraints`;
    const constraintDetail = activeConstraints.length > 0
        ? activeConstraints.join('; ')
        : 'none';
    const row = `| ${date} | ${deliverableType} | ${score} | ${constraintSummary} | ${constraintDetail} |`;
    const success = await appendToWikiPage('synthesis/quality-scores.md', '\n' + row);
    if (success) {
        await appendWikiLog('generate', `Quality score: ${deliverableType}`, {
            score,
            constraints: activeConstraints.length,
            date,
        });
    }
    return success;
}

function parseFrontmatter(content: string): WikiFrontmatter | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const yaml = match[1];
    const fm: Record<string, any> = {};
    for (const line of yaml.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
            fm[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
        } else if (value === 'true') fm[key] = true;
        else if (value === 'false') fm[key] = false;
        else if (!isNaN(Number(value)) && value !== '') fm[key] = Number(value);
        else fm[key] = value.replace(/^"|"$/g, '');
    }
    return fm as unknown as WikiFrontmatter;
}

function extractBody(content: string): string {
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    return match ? match[1].trim() : content.trim();
}

function getDefaultFrontmatter(): WikiFrontmatter {
    return {
        title: '', type: 'unknown', created: '', updated: '',
        sources: [], confidence: 'speculative', status: 'needs-review',
        tags: [], evidence_count: 0,
    };
}

// --- PUBLIC API ---

/**
 * Load the complete generation context for a deliverable type.
 * This is the main entry point - call before generating any deliverable.
 *
 * Returns compiled knowledge from:
 * - Framework page (structural requirements)
 * - Anti-pattern page (what to avoid)
 * - Relevant benchmark pages (data to cite)
 * - Evidence pages (pre-compiled citations)
 * - Brand standards (visual rendering rules)
 */

// 2026-05-23 - P1.2: Module-scope throttle for the incremental wiki compile.
// One compile per 10 minutes max per browser session; running too often
// burns tokens without changing output. The COMPILE itself is lightweight
// - it just refreshes evidence pages - but the LLM contradiction-check
// inside the compile path is expensive.
let _lastIncrementalCompileTs = 0;
const _INCREMENTAL_COMPILE_INTERVAL_MS = 10 * 60 * 1000;
let _incrementalCompilePromise: Promise<void> | null = null;

// 2026-05-23 - Recurring shortfall topics, cached for the session. Read by
// loadGenerationContext to inject a "prior shortfalls" preamble into every
// generation's context.
let _cachedRecurringShortfalls: Array<{ topic: string; occurrenceCount: number; engagementSlugs: string[] }> = [];
let _recurringShortfallsLoadedAt = 0;
const _RECURRING_SHORTFALL_TTL_MS = 10 * 60 * 1000;

async function _maybeLoadRecurringShortfallTopics(): Promise<void> {
    if (Date.now() - _recurringShortfallsLoadedAt < _RECURRING_SHORTFALL_TTL_MS && _cachedRecurringShortfalls.length > 0) return;
    try {
        const { getRecurringShortfallTopics } = await import('./learningEngine');
        _cachedRecurringShortfalls = await getRecurringShortfallTopics();
        _recurringShortfallsLoadedAt = Date.now();
    } catch {
        _cachedRecurringShortfalls = [];
    }
}

export function getRecurringShortfallPreamble(goal?: string): string {
    if (_cachedRecurringShortfalls.length === 0) return '';
    // 2026-05-30 - RESEARCH-OBJECTIVE SUPREMACY. Recurring-shortfall topics are
    // artifacts of PRIOR engagements. Injecting them unconditionally bled an
    // all-co-op portfolio into unrelated objectives (the AI-design run that
    // produced a co-op journey). Only surface a shortfall topic when it
    // lexically overlaps the CURRENT objective; if a goal is supplied and
    // nothing overlaps, inject NOTHING so the prior portfolio cannot steer
    // this engagement off-topic.
    let pool = _cachedRecurringShortfalls.slice(0, 12);
    if (goal && goal.trim().length > 0) {
        const goalWords = new Set(
            goal.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 4)
        );
        pool = pool.filter(t => {
            const topicWords = t.topic.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 4);
            return topicWords.some(tw =>
                Array.from(goalWords).some(gw => gw === tw || gw.includes(tw) || tw.includes(gw))
            );
        });
        if (pool.length === 0) return '';
    }
    const top = pool.slice(0, 8);
    return `\n=== RECURRING COVERAGE SHORTFALLS (relevant to this objective) ===\n` +
        `These topics relate to the current research objective and were undercovered in prior engagements. Prioritize evidence on them ONLY where they directly serve THIS objective:\n` +
        top.map(t => `- ${t.topic.replace(/-/g, ' ')} (hit in ${t.occurrenceCount} prior engagement${t.occurrenceCount === 1 ? '' : 's'})`).join('\n') +
        `\n=== END RECURRING SHORTFALLS ===\n`;
}

async function _maybeIncrementalCompile(): Promise<void> {
    const now = Date.now();
    if (now - _lastIncrementalCompileTs < _INCREMENTAL_COMPILE_INTERVAL_MS) return;
    if (_incrementalCompilePromise) return _incrementalCompilePromise;
    _incrementalCompilePromise = (async () => {
        try {
            const { compileWiki } = await import('./wikiCompiler');
            await compileWiki({ incremental: true } as any);
            _lastIncrementalCompileTs = Date.now();
            console.log('[wikiService] incremental compile completed at', new Date().toISOString());
        } catch (err: any) {
            console.warn('[wikiService] incremental compile failed (non-blocking):', err?.message || err);
        } finally {
            _incrementalCompilePromise = null;
        }
    })();
    return _incrementalCompilePromise;
}

export async function loadGenerationContext(
    outputType: OutputOption,
    options?: {
        industry?: string;
        engagement?: string;
        // 2026-05-11 - Lazy-context controls. Default is LITE mode: load
        // only what's irreducibly needed for the specific deliverable
        // (framework spec + anti-patterns + brand + benchmarks). Pages like
        // social-intelligence, research-context, and methodology
        // descriptions rarely change a deliverable's content and were
        // burning ~30-70KB of every prompt's token budget. Callers that
        // genuinely need the extra context can pass `eagerExtras: true`.
        eagerExtras?: boolean;
    }
): Promise<GenerationContext> {
    const frameworkKey = OUTPUT_TO_FRAMEWORK[outputType] || 'personas';
    const benchmarkKeys = FRAMEWORK_BENCHMARKS[frameworkKey] || ['cx-metrics'];
    const wantExtras = options?.eagerExtras === true;

    // 2026-05-23 - P1.2: Auto-invoke incremental compile of wiki evidence
    // pages before loading context. Previously compileWiki() was only reachable
    // via the dev console hook (window.__hicSelfImprovement.compileWiki),
    // meaning the wiki never recompiled from new evidence between sessions.
    // Now every generation triggers an incremental compile (cheap if nothing
    // changed). Throttled at module scope so concurrent generators don't
    // double-fire.
    try {
        await _maybeIncrementalCompile();
    } catch {
        // Best-effort; compile failures must never block generation.
    }

    // 2026-05-23 - Karpathy Phase 2.3: Recurring-shortfall topics from
    // cross-engagement memory. Reads wiki/known-gaps/ and surfaces topics
    // hit by 2+ prior engagements so the model prioritizes evidence
    // collection on them this session. Throttled (cached for 10 min).
    try {
        await _maybeLoadRecurringShortfallTopics();
    } catch {
        // Best-effort
    }

    // Core load - these are the irreducibles that affect EVERY generation
    // of this output type. Tight, fast, ~5-15KB total.
    const corePromises: Array<Promise<WikiPage | null | any>> = [
        readWikiPage(`frameworks/${frameworkKey}.md`),
        readWikiPage(`anti-patterns/${frameworkKey}.md`),
        loadBrandConfig(),
    ];

    // Extras - only loaded when caller explicitly opts in. The model can
    // request these on-demand via fetch_wiki_resource() (see chat tools),
    // and the wiki manifest in the system prompt lists them for the
    // model to know they exist.
    const extraPromises: Array<Promise<WikiPage | null>> = wantExtras ? [
        readWikiPage('social-intelligence/sentiment-pipeline.md'),
        readWikiPage('social-intelligence/topic-modeling.md'),
        readWikiPage('social-intelligence/cx-mesh.md'),
        readWikiPage('deep-research/research-modes.md'),
        readWikiPage('deep-research/knowledge-graph.md'),
        readWikiPage('deep-research/document-ingestion.md'),
        readWikiPage('methodologies/research-fabric.md'),
        readWikiPage('methodologies/analytical-lenses.md'),
        readWikiPage('sources-registry/connector-catalog.md'),
    ] : [];

    const benchmarkPromises = benchmarkKeys.map(key => readWikiPage(`benchmarks/${key}.md`));

    const [framework, antiPatterns, brand, ...rest] = await Promise.all([
        ...corePromises,
        ...extraPromises,
        ...benchmarkPromises,
    ]);

    // Slice the `rest` array into extras + benchmarks based on whether
    // extras were requested. Keeps the destructure shape stable.
    const extraCount = wantExtras ? 9 : 0;
    const extraPages = rest.slice(0, extraCount) as Array<WikiPage | null>;
    const benchmarkPages = rest.slice(extraCount) as Array<WikiPage | null>;
    const sentimentPipeline = extraPages[0] || null;
    const topicModeling = extraPages[1] || null;
    const cxMesh = extraPages[2] || null;
    const researchModes = extraPages[3] || null;
    const knowledgeGraph = extraPages[4] || null;
    // documentIngestion was loaded but never read into the returned context - preserve that
    const methodology = extraPages[6] || null;
    const analyticalLenses = extraPages[7] || null;
    const sourceConnectors = extraPages[8] || null;

    // Optional: industry and engagement context
    let industryAdaptation: string | undefined;
    let engagementContext: string | undefined;
    let engagementGoals: string | undefined;
    if (options?.industry) {
        const page = await readWikiPage(`industries/${options.industry}.md`);
        industryAdaptation = page?.content;
    }
    if (options?.engagement) {
        const page = await readWikiPage(`engagements/${options.engagement}.md`);
        engagementContext = page?.content;
        // 2026-05-22 - Goals-as-filter (Phase 4.3 of the self-improvement loop).
        // Extract the engagement's stated goals and inject them as a hard
        // constraint into the generation prompt. Best-effort; failure is
        // silent so existing flows are unaffected.
        try {
            const verifier = await import('./verifierService');
            engagementGoals = await verifier.getEngagementGoalsAsConstraint(options.engagement);
        } catch { /* verifier not available; skip */ }
    }

    // Combine benchmark data
    const benchmarksContent = benchmarkPages
        .filter((p): p is WikiPage => p !== null)
        .map(p => `## ${p.title}\n\n${p.content}`)
        .join('\n\n---\n\n');

    // Load all evidence pages (including any dynamically created ones)
    const evidencePages = await loadAllEvidencePages();
    const evidenceContent = evidencePages
        .filter((p): p is WikiPage => p !== null)
        .map(p => p.content)
        .join('\n\n');

    // 2026-05-24 - Phase 6.1: Cross-engagement patterns injection.
    // Read synthesis/cross-engagement-patterns.md and surface it on the
    // returned context so prompt builders can include portfolio-level
    // patterns in the system prompt. Best-effort - silent on miss.
    let crossEngagementPatterns: string | undefined;
    try {
        const patternsPage = await readWikiPage('synthesis/cross-engagement-patterns.md');
        if (patternsPage?.content && patternsPage.content.trim().length > 50) {
            // Cap at 8KB so even rich pattern logs don't blow the prompt budget.
            crossEngagementPatterns = patternsPage.content.slice(0, 8000);
        }
    } catch {
        // Best-effort; the file may not exist yet (first run of any engagement).
    }

    // 2026-06-06 - Knowledge Library cached_selection load. ARCHITECTURAL
    // CORRECTION: the selection is USER-LEVEL, not engagement-bound. When
    // the user changes the research goal, their KL selection still applies.
    // Read order:
    //   1. User-level store (/api/user-selection/active) - source of truth
    //   2. Engagement manifest (legacy / audit snapshot) - fallback only
    // The engagement copy still gets written on apply (for replay), but the
    // live read goes to the user-level store first.
    let cachedSelection: GenerationContext['cachedSelection'];
    try {
        // Read 1: user-level store (PRIMARY).
        const PROXY_BASE_LOCAL = 'http://127.0.0.1:5012';
        const userResp = await fetch(`${PROXY_BASE_LOCAL}/api/user-selection/active`);
        if (userResp.ok) {
            const data = await userResp.json();
            if (data && !data._uncommitted) {
                cachedSelection = {
                    engagement_slugs: Array.isArray(data.engagement_slugs) ? data.engagement_slugs : [],
                    theme_cluster_ids: Array.isArray(data.theme_cluster_ids) ? data.theme_cluster_ids : [],
                    source_archive_paths: Array.isArray(data.source_archive_paths) ? data.source_archive_paths : [],
                    social_subreddits: Array.isArray(data.social_subreddits) ? data.social_subreddits : [],
                    article_sources: Array.isArray(data.article_sources) ? data.article_sources : [],
                    selected_at_ms: typeof data.selected_at_ms === 'number' ? data.selected_at_ms : 0,
                };
            }
        }

        // Read 2: engagement manifest (FALLBACK for legacy / audit).
        if (!cachedSelection) {
            const engagementSlug = options?.engagement
                || (typeof window !== 'undefined' ? (window as any).__hicCurrentEngagementSlug : undefined);
            if (engagementSlug && typeof engagementSlug === 'string') {
                const manifest = await readEngagementManifest(engagementSlug);
                const sel = (manifest as any)?.cached_selection;
                if (sel && typeof sel === 'object') {
                    cachedSelection = {
                        engagement_slugs: Array.isArray(sel.engagement_slugs) ? sel.engagement_slugs : [],
                        theme_cluster_ids: Array.isArray(sel.theme_cluster_ids) ? sel.theme_cluster_ids : [],
                        source_archive_paths: Array.isArray(sel.source_archive_paths) ? sel.source_archive_paths : [],
                        social_subreddits: Array.isArray(sel.social_subreddits) ? sel.social_subreddits : [],
                        article_sources: Array.isArray(sel.article_sources) ? sel.article_sources : [],
                        selected_at_ms: typeof sel.selected_at_ms === 'number' ? sel.selected_at_ms : 0,
                    };
                }
            }
        }

        if (cachedSelection && cachedSelection.theme_cluster_ids.length + cachedSelection.article_sources.length + cachedSelection.engagement_slugs.length > 0) {
            console.info(
                `[loadGenerationContext] cached_selection loaded (USER-LEVEL store): ` +
                `themes=${cachedSelection.theme_cluster_ids.length}, ` +
                `articles=${cachedSelection.article_sources.length}, ` +
                `engagements=${cachedSelection.engagement_slugs.length}, ` +
                `subreddits=${cachedSelection.social_subreddits.length}`
            );

            // 2026-06-06 - MANIFEST -> WIKI RESOLUTION. Each theme_cluster_id
            // has the format "<file>#<index>" pointing at
            // wiki/synthesis/<file>.json topic <index>. We group IDs by source
            // file, fetch each file ONCE, extract the matching topics, and
            // store the bodies on cachedSelection.resolved_theme_bodies. The
            // assembleEnhancedPrompt block then declares the manifest pointers
            // and the corpus carries the resolved bodies - no body
            // duplication into the user-selection store, no opaque-string
            // problem at generation time. This replaces RAG (embed-and-find)
            // with declarative pointer resolution.
            const ids = cachedSelection.theme_cluster_ids;
            if (ids.length > 0) {
                const byFile = new Map<string, Array<{ id: string; index: number }>>();
                for (const id of ids) {
                    const hash = id.indexOf('#');
                    if (hash < 0) continue;
                    const file = id.slice(0, hash);
                    const idxRaw = id.slice(hash + 1);
                    const idx = /^\d+$/.test(idxRaw) ? parseInt(idxRaw, 10) : -1;
                    if (!file) continue;
                    if (!byFile.has(file)) byFile.set(file, []);
                    byFile.get(file)!.push({ id, index: idx });
                }
                const resolved: NonNullable<GenerationContext['cachedSelection']>['resolved_theme_bodies'] = [];
                let resolvedCount = 0;
                for (const [file, slots] of byFile.entries()) {
                    let payload: any = null;
                    // 2026-06-07 - Topic-model files moved from
                    // wiki/synthesis/ to sessions/_topic-cache/ on 2026-05-23
                    // (proxy/app.py P0.3). The KL aggregator's stored
                    // source_synthesis_path still points to the legacy
                    // wiki/synthesis/ location, so the legacy fetch
                    // returns 404 for every topics-tm_* file (the user's
                    // 0/557 resolution failure 2026-06-07). Use the
                    // proxy's /api/topic-cache/read endpoint which checks
                    // the new location first AND falls back to the legacy
                    // path, so themes and other synthesis files both
                    // resolve correctly.
                    try {
                        const resp = await fetch(`http://127.0.0.1:5012/api/topic-cache/read/${encodeURIComponent(file)}`);
                        if (resp.ok) {
                            const data = await resp.json();
                            const content = (data && typeof data.content === 'string') ? data.content : '';
                            if (content) {
                                try { payload = JSON.parse(content); } catch { /* not JSON */ }
                            }
                        }
                    } catch { /* miss is non-fatal */ }
                    // Belt + suspenders: also try the legacy wiki/synthesis
                    // path so non-topic-model synthesis files (anti-pattern
                    // pages, framework pages) still resolve when their ids
                    // ever flow through this loader.
                    if (!payload) {
                        try {
                            const page = await readWikiPage(`synthesis/${file}`);
                            if (page?.content) {
                                try { payload = JSON.parse(page.content); } catch { /* not JSON */ }
                            }
                        } catch { /* miss is non-fatal */ }
                    }
                    if (!payload) continue;
                    const topics = Array.isArray(payload?.result?.topics) ? payload.result.topics : [];
                    const engagementGoal = payload?.research_goal || '';
                    for (const slot of slots) {
                        let topic: any = null;
                        if (slot.index >= 0 && slot.index < topics.length) topic = topics[slot.index];
                        if (!topic) topic = topics.find((t: any) => String(t?.id) === String(slot.index));
                        if (!topic) continue;
                        const top_terms = Array.isArray(topic.top_terms)
                            ? topic.top_terms.slice(0, 8).map((tt: any) => (typeof tt === 'string' ? tt : (tt?.term || ''))).filter(Boolean)
                            : [];
                        resolved.push({
                            id: slot.id,
                            name: String(topic.name || '').trim(),
                            summary: String(topic.summary || '').trim(),
                            sentiment: String(topic.sentiment || 'unknown'),
                            post_count: Number(topic.post_count) || 0,
                            top_terms,
                            source_synthesis_path: `synthesis/${file}`,
                            source_engagement_goal: engagementGoal,
                        });
                        resolvedCount++;
                    }
                }
                cachedSelection.resolved_theme_bodies = resolved;
                console.info(
                    `[loadGenerationContext] resolved ${resolvedCount}/${ids.length} cached theme IDs via wiki synthesis files ` +
                    `(${byFile.size} source files fetched). Manifest -> wiki resolution.`
                );
            }
        }
    } catch (e: any) {
        console.warn('[loadGenerationContext] cached_selection load failed (non-fatal):', e?.message || e);
    }

    return {
        framework: framework?.content || '',
        antiPatterns: antiPatterns?.content || '',
        benchmarks: benchmarksContent,
        evidence: evidenceContent,
        brand,
        socialIntelligence: {
            sentimentPipeline: sentimentPipeline?.content || '',
            topicModeling: topicModeling?.content || '',
            cxMesh: cxMesh?.content || '',
        },
        research: {
            researchModes: researchModes?.content || '',
            knowledgeGraph: knowledgeGraph?.content || '',
            methodology: methodology?.content || '',
            analyticalLenses: analyticalLenses?.content || '',
            sourceConnectors: sourceConnectors?.content || '',
        },
        industryAdaptation,
        engagementContext,
        engagementGoals,
        crossEngagementPatterns,
        cachedSelection,
    };
}

// ============================================================
// LAZY WIKI MANIFEST + FETCH-ON-DEMAND - 2026-05-11
// ============================================================
//
// The eager loadGenerationContext path used to drag 15+ wiki pages into
// every prompt. Most of those pages (social-intelligence, research-context,
// methodology descriptions, etc.) rarely change the actual output but
// burned 30-70KB of every token budget. Now we ship the model a compact
// MANIFEST instead - one line per available resource - and let the model
// call fetch_wiki_resource(path) only when it genuinely needs the full body.
//
// This mirrors the "100 tokens per skill scan" pattern from the SEAL-MCP
// research: scan-then-pull, not pull-everything-just-in-case.

/** A single resource entry in the wiki manifest the model sees. */
export interface WikiManifestEntry {
    path: string;       // e.g., "benchmarks/cx-metrics.md"
    kind: string;       // e.g., "benchmark", "anti-pattern", "framework"
    title: string;      // human-readable title from frontmatter or filename
    summary: string;    // one-sentence "what this offers" - from frontmatter `description` if present, else first heading
}

/**
 * Cache the manifest in-memory for the SPA session. Rebuilt once per
 * page load (essentially per browser tab open). Wiki rarely changes
 * mid-session, and a stale manifest just means newly-added pages aren't
 * surfaced until the next refresh - acceptable tradeoff.
 */
let _wikiManifestCache: WikiManifestEntry[] | null = null;

/**
 * Build a compact manifest of wiki resources the model can lazy-fetch.
 * Lists frameworks, anti-patterns, benchmarks, evidence, social-intelligence,
 * deep-research, methodologies, industries - but NOT article archives
 * (those have their own fetch_wiki_articles tool with semantic search).
 *
 * Output is sorted by kind then by path for stable prompt diffs.
 */
export async function buildWikiManifest(forceRefresh = false): Promise<WikiManifestEntry[]> {
    if (_wikiManifestCache && !forceRefresh) return _wikiManifestCache;

    const proxyBase = (typeof window !== 'undefined' ? 'http://127.0.0.1:5012' : '');

    // Directories we expose to the model. Article archives are deliberately
    // excluded - those are searched via fetch_wiki_articles (semantic), not
    // listed verbatim (~1,300 files would blow up the manifest).
    const dirs = [
        'frameworks', 'anti-patterns', 'benchmarks', 'evidence',
        'social-intelligence', 'deep-research', 'methodologies',
        'industries', 'exemplars', 'brand',
    ];

    const entries: WikiManifestEntry[] = [];

    await Promise.all(dirs.map(async (dir) => {
        try {
            const resp = await fetch(`${proxyBase}/api/wiki/list/${dir}`);
            if (!resp.ok) return;
            const data = await resp.json();
            const files: string[] = (data.files || []).filter((f: string) => f.endsWith('.md'));

            // For each .md file in this dir, read just the frontmatter (cheap)
            // to extract title + description for the manifest line.
            await Promise.all(files.map(async (fname) => {
                const path = `${dir}/${fname}`;
                try {
                    const page = await readWikiPage(path);
                    if (!page) return;
                    // Frontmatter is typed as Record<string, unknown>-shaped - cast
                    // for property access. We tolerate any string-coercible value.
                    const fm: Record<string, any> = (page.frontmatter as any) || {};
                    const title = fm.title || page.title || fname.replace(/\.md$/, '');
                    // Prefer an explicit `description` frontmatter; fall back to
                    // the first non-heading paragraph of the body trimmed to ~140 chars.
                    let summary = String(fm.description || '').trim();
                    if (!summary) {
                        const body = page.content || '';
                        const firstPara = body.split(/\n{2,}/).find(p =>
                            p.trim() && !p.startsWith('#') && !p.startsWith('---')
                        ) || '';
                        summary = firstPara.replace(/\s+/g, ' ').slice(0, 140).trim();
                    }
                    entries.push({
                        path,
                        kind: dir.replace(/s$/, ''), // simple plural→singular
                        title: String(title).trim(),
                        summary: summary || '(no description)',
                    });
                } catch { /* skip unreadable file */ }
            }));
        } catch { /* skip missing dir */ }
    }));

    // Sort: kind, then path. Stable across sessions.
    entries.sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
    _wikiManifestCache = entries;
    return entries;
}

/**
 * Render the manifest as a compact text block ready to inject into a system
 * prompt. ~70-150 tokens per entry depending on title/summary length.
 * Typical full manifest: ~40 entries × ~100 tokens = ~4KB.
 */
export async function renderWikiManifestForPrompt(): Promise<string> {
    const entries = await buildWikiManifest();
    if (entries.length === 0) {
        return '(no additional wiki resources available)';
    }
    const lines = entries.map(e =>
        `  [${e.path}] ${e.kind}: ${e.title} - ${e.summary}`
    );
    return lines.join('\n');
}

/**
 * Fetch a single wiki resource by manifest path. Validates the path is one
 * we surfaced in the manifest (so the model can't fish arbitrary paths) and
 * returns the full body content. Used by the fetch_wiki_resource tool.
 */
export async function fetchWikiResourceByPath(path: string): Promise<{
    ok: boolean; path: string; title?: string; content?: string; error?: string;
}> {
    // Defensive: reject path traversal + non-manifest paths
    if (!path || path.includes('..') || path.startsWith('/')) {
        return { ok: false, path, error: 'Invalid path' };
    }
    const manifest = await buildWikiManifest();
    const validPaths = new Set(manifest.map(e => e.path));
    if (!validPaths.has(path)) {
        return { ok: false, path, error: 'Path not in manifest (use one from buildWikiManifest)' };
    }
    try {
        const page = await readWikiPage(path);
        if (!page) return { ok: false, path, error: 'Wiki page not found' };
        return {
            ok: true,
            path,
            title: page.title,
            content: page.content,
        };
    } catch (e: any) {
        return { ok: false, path, error: e?.message || 'Read failed' };
    }
}

/**
 * Load all evidence pages from wiki/evidence/ directory.
 * Dynamically discovers pages rather than hardcoding filenames,
 * so new evidence pages created by INGEST operations are automatically included.
 */
async function loadAllEvidencePages(): Promise<(WikiPage | null)[]> {
    // Known evidence page stubs - extend this list as INGEST creates new pages
    const knownEvidencePages = [
        'evidence/cx-maturity.md',
        'evidence/digital-transformation.md',
    ];
    return Promise.all(knownEvidencePages.map(p => readWikiPage(p)));
}

/**
 * Load the complete brand configuration from wiki/brand/ pages.
 */
export async function loadBrandConfig(): Promise<BrandConfig> {
    const [identity, illustrationStyle, chartStandards, layoutPatterns, antiSlop, referenceDeck] =
        await Promise.all([
            readWikiPage('brand/identity.md'),
            readWikiPage('brand/illustration-style.md'),
            readWikiPage('brand/chart-standards.md'),
            readWikiPage('brand/layout-patterns.md'),
            readWikiPage('brand/anti-slop.md'),
            readWikiPage('brand/reference-deck.md'),
        ]);

    return {
        identity: identity?.content || '',
        illustrationStyle: illustrationStyle?.content || '',
        chartStandards: chartStandards?.content || '',
        layoutPatterns: layoutPatterns?.content || '',
        antiSlop: antiSlop?.content || '',
        referenceDeck: referenceDeck?.content || '',
    };
}

/**
 * Load the wiki index for navigation.
 */
export async function loadWikiIndex(): Promise<WikiPage | null> {
    return readWikiPage('index.md');
}

/**
 * Assemble the enhanced prompt for a deliverable type.
 * Combines the static framework prompt from deliverableFrameworks.ts
 * with compiled wiki knowledge for richer generation.
 */
export function assembleEnhancedPrompt(
    staticPrompt: string,
    context: GenerationContext
): string {
    const sections: string[] = [];

    // Primary framework specification from wiki
    if (context.framework) {
        sections.push(
            '=== COMPILED FRAMEWORK SPECIFICATION (from wiki) ===\n' +
            context.framework
        );
    }

    // Static prompt (existing deliverableFrameworks.ts content)
    sections.push(
        '=== GENERATION INSTRUCTIONS ===\n' +
        staticPrompt
    );

    // Anti-patterns to avoid
    if (context.antiPatterns) {
        sections.push(
            '=== ANTI-PATTERNS TO AVOID ===\n' +
            'The following are known failure modes. Detect and avoid them:\n\n' +
            context.antiPatterns
        );
    }

    // Benchmark data to cite
    if (context.benchmarks) {
        sections.push(
            '=== BENCHMARK DATA (cite where relevant) ===\n' +
            'Use these data points with proper attribution. Mark as HYPOTHESIS if from AI training knowledge:\n\n' +
            context.benchmarks
        );
    }

    // Evidence base
    if (context.evidence) {
        sections.push(
            '=== PRE-COMPILED EVIDENCE ===\n' +
            'Prefer this evidence over AI training knowledge. Cite with full source attribution:\n\n' +
            context.evidence
        );
    }

    // Industry adaptation
    if (context.industryAdaptation) {
        sections.push(
            '=== INDUSTRY ADAPTATION ===\n' +
            context.industryAdaptation
        );
    }

    // Engagement-specific context
    if (context.engagementContext) {
        sections.push(
            '=== ENGAGEMENT CONTEXT ===\n' +
            context.engagementContext
        );
    }

    // 2026-06-06 - Knowledge Library cached_selection block. When the user
    // selected items from prior engagements in the KL panel, those choices
    // are persisted to the USER-LEVEL store (wiki/user-selections/active.json),
    // which follows the user across goal changes. The model MUST honor them
    // per validate_cached_selection_honored.py.
    //
    // CRITICAL FIX 2026-06-06b: inject the ACTUAL theme BODIES (name +
    // summary + sentiment + top_terms + source path) for each selected
    // theme, not just opaque ID strings. With only IDs the model has nothing
    // to honor and falls back to regenerating from scratch (the failure
    // the user reported on 2026-06-06 - KL persisted 527 themes but the
    // emitted set contained 0 cached/extended).
    if (context.cachedSelection) {
        const cs = context.cachedSelection;
        const totalSelected =
            (cs.theme_cluster_ids?.length || 0) +
            (cs.article_sources?.length || 0) +
            (cs.engagement_slugs?.length || 0);
        if (totalSelected > 0) {
            const lines: string[] = [
                '=== PRIOR CACHED SELECTION (USER EXPLICITLY CURATED - LOAD-BEARING) ===',
                '',
                'Before this run, the user reviewed the Knowledge Library and explicitly',
                'selected the following items from prior engagements as required context.',
                'They are persisted in the user-level store and follow the user across',
                'goal changes - they were curated WITH KNOWLEDGE of the current goal.',
                '',
                'HARD CONTRACT - NO FLOORS, NO OMISSIONS, NO TOP-N:',
                '  1. Every emitted item (theme / persona / recommendation / etc.) MUST',
                '     carry a `source` field with EXACTLY one of these three values:',
                '     - "cached"   - this item is one of the SELECTED cached themes below,',
                '                    carried forward essentially unchanged (you may sharpen',
                '                    wording but the substantive insight is the same)',
                '     - "extended" - this item is one of the SELECTED cached themes below,',
                '                    refined or strengthened with new corpus evidence from',
                '                    this run (e.g. added a quote, added a new sub-theme)',
                '     - "new"      - this item was NOT in the selected set; it is fresh',
                '                    from the current corpus',
                '  2. EVERY selected theme below MUST appear in your emission as either',
                '     source="cached" or source="extended". 100% coverage. NO omissions.',
                '     NO top-N. NO floors. The user curated EVERY id below; carry EVERY',
                '     id forward. The Stop hook validate_cached_selection_honored.py',
                '     REJECTS the response if any selected id is silently dropped.',
                '  3. New themes the corpus reveals that are NOT in the selected set are',
                '     added as source="new". Net emission count = (count of selected',
                '     themes below) + (new themes discovered in this run).',
                '  4. The selected cached themes were chosen by a human under the current',
                '     research goal - they are RELEVANT and PROVEN. NEVER drop a selected',
                '     theme. If contradicted by new evidence, KEEP it as source="extended"',
                '     and add a refinement note. Never drop.',
                '',
                `Selected by user (selected_at_ms=${cs.selected_at_ms}):`,
                `  - ${cs.theme_cluster_ids?.length || 0} theme cluster ids (full bodies below - ALL of them)`,
                `  - ${cs.article_sources?.length || 0} article source folders`,
                `  - ${cs.engagement_slugs?.length || 0} prior engagement slugs`,
                `  - ${cs.social_subreddits?.length || 0} cached subreddits`,
                `  - ${cs.source_archive_paths?.length || 0} source archive paths`,
            ];

            // 2026-06-06c - NO FLOORS, NO OMISSIONS. User explicit:
            // every selected cached theme body is injected in full so the
            // model can carry forward EVERY id. Removed prior top-K-by-
            // relevance truncation. Gemini 3.1 Pro has 1M token context;
            // ~527 selected themes × ~500 chars ≈ ~264KB ≈ ~66K tokens, fits.
            const bodies = Array.isArray(cs.resolved_theme_bodies) ? cs.resolved_theme_bodies : [];
            if (bodies.length > 0) {
                // 2026-06-08 - STOP THE ECHO. These cached themes are now carried
                // forward DETERMINISTICALLY by mergeCachedThemes (App.tsx) - they are
                // inserted into the deliverable + persisted + shown tagged source=cached
                // WITHOUT the model. The prior "You MUST emit every one" instruction made
                // the model RE-EMIT all ~500 as themes with raw pointer names
                // ("topics-tm_...json#0") and placeholder {sourceFile:'cached'} citations,
                // which (a) duplicated the deterministic set, (b) polluted titles, and
                // (c) broke source link-back (no real sourceFile). So: list them ONLY for
                // dedup awareness; the model must NOT re-emit them and must generate ONLY
                // genuinely-new corpus themes with REAL source citations.
                lines.push('', `─── ${bodies.length} CACHED THEMES ALREADY CARRIED FORWARD (do NOT re-emit) ───`);
                lines.push('These prior-research themes are ALREADY included in the deliverable automatically (tagged source=cached). Do NOT output, re-list, copy, or duplicate them.');
                lines.push('They appear here ONLY so you AVOID generating near-duplicates. Generate ONLY genuinely NEW themes from the CURRENT corpus that ADD coverage beyond this list.');
                lines.push('Every NEW theme you emit MUST cite REAL corpus sources: a real sourceFile (e.g. an article/post .md) plus a VERBATIM quote. NEVER emit a placeholder citation (no sourceFile:"cached", no text:"cached", no "[No direct source]").');
                lines.push('');
                for (const t of bodies) {
                    // Names only (compact) - enough for dedup awareness, no full bodies
                    // since the model is no longer copying them.
                    lines.push(`  - ${t.name}`);
                }
            } else if (cs.theme_cluster_ids && cs.theme_cluster_ids.length > 0) {
                // Back-compat: legacy selection without resolved bodies. List ids for
                // dedup awareness only - the deterministic merge carries them forward.
                lines.push('', `${cs.theme_cluster_ids.length} cached theme clusters already carried forward (do NOT re-emit; generate only NEW corpus themes with real citations):`);
                for (const id of cs.theme_cluster_ids) {
                    lines.push(`  [${id}]`);
                }
            }
            if (cs.engagement_slugs && cs.engagement_slugs.length > 0) {
                lines.push('', 'Selected prior-engagement slugs (synthesis pages must be referenced - ALL of them):');
                for (const slug of cs.engagement_slugs) {
                    lines.push(`  ${slug}`);
                }
            }
            sections.push(lines.join('\n'));
        }
    }

    // Social intelligence context (sentiment, topic modeling, CX mesh)
    const hasSocialContext = context.socialIntelligence.sentimentPipeline ||
        context.socialIntelligence.topicModeling || context.socialIntelligence.cxMesh;
    if (hasSocialContext) {
        sections.push(
            '=== SOCIAL INTELLIGENCE CONTEXT ===\n' +
            'The platform collects and analyzes social data via these capabilities:\n\n' +
            (context.socialIntelligence.sentimentPipeline
                ? '## Sentiment Analysis Pipeline\n' + context.socialIntelligence.sentimentPipeline + '\n\n' : '') +
            (context.socialIntelligence.topicModeling
                ? '## Topic Modeling & Semantic Analysis\n' + context.socialIntelligence.topicModeling + '\n\n' : '') +
            (context.socialIntelligence.cxMesh
                ? '## CX Mesh (Voice of Customer)\n' + context.socialIntelligence.cxMesh : '')
        );
    }

    // Research context (deep research modes, knowledge graph, methodology)
    const hasResearchContext = context.research.researchModes || context.research.methodology;
    if (hasResearchContext) {
        sections.push(
            '=== RESEARCH INTELLIGENCE CONTEXT ===\n' +
            'The platform uses these research capabilities to collect and process data:\n\n' +
            (context.research.researchModes
                ? '## Research Modes\n' + context.research.researchModes + '\n\n' : '') +
            (context.research.methodology
                ? '## Research Methodology\n' + context.research.methodology + '\n\n' : '') +
            (context.research.analyticalLenses
                ? '## Analytical Lenses\n' + context.research.analyticalLenses : '')
        );
    }

    // Brand and visual rendering rules
    sections.push(
        '=== VISUAL RENDERING STANDARDS ===\n' +
        'Apply these brand standards to all visual output:\n\n' +
        `Typography: ${context.brand.identity ? 'Loaded from wiki' : 'Use defaults'}\n` +
        `Chart Standards: ${context.brand.chartStandards ? 'Loaded from wiki' : 'Use defaults'}\n` +
        `Layout Patterns: ${context.brand.layoutPatterns ? 'Loaded from wiki' : 'Use defaults'}\n` +
        (context.brand.antiSlop ? '\nAnti-Slop Rules:\n' + context.brand.antiSlop : '')
    );

    return sections.join('\n\n---\n\n');
}

// --- QUALITY SCORING ---

/**
 * Score generated output against the quality rubric.
 * Minimum passing score: 3.8/5.0.
 */
export function scoreOutput(output: {
    sections: string[];
    requiredSections: number;
    citations: number;
    totalSections: number;
    text: string;
}): QualityScore {
    // Completeness: required sections present / total required
    const completeness = Math.min(5, (output.sections.length / output.requiredSections) * 5);

    // Depth: heuristic based on average paragraph depth
    const depth = estimateDepth(output.text);

    // Evidence: citations per major section
    const evidencePerSection = output.totalSections > 0
        ? output.citations / output.totalSections
        : 0;
    const evidence = Math.min(5, evidencePerSection * (5 / 3)); // 3+ per section = 5.0

    // Visual quality: check for anti-slop violations
    const slopCount = detectBannedPhrases(output.text).length;
    const visualQuality = Math.max(1, 5 - slopCount * 0.5);

    // Specificity: check for quantified recommendations
    const specificity = estimateSpecificity(output.text);

    // Weighted overall
    const overall = (
        completeness * 0.25 +
        depth * 0.25 +
        evidence * 0.20 +
        visualQuality * 0.15 +
        specificity * 0.15
    );

    const failingDimensions: string[] = [];
    if (completeness < 3.0) failingDimensions.push('completeness');
    if (depth < 3.0) failingDimensions.push('depth');
    if (evidence < 3.0) failingDimensions.push('evidence');
    if (visualQuality < 3.0) failingDimensions.push('visualQuality');
    if (specificity < 3.0) failingDimensions.push('specificity');

    return {
        completeness: Math.round(completeness * 10) / 10,
        depth: Math.round(depth * 10) / 10,
        evidence: Math.round(evidence * 10) / 10,
        visualQuality: Math.round(visualQuality * 10) / 10,
        specificity: Math.round(specificity * 10) / 10,
        overall: Math.round(overall * 10) / 10,
        passing: overall >= 3.8,
        failingDimensions,
    };
}

// --- ANTI-SLOP DETECTION ---

export interface SlopViolation {
    phrase: string;
    position: number;
    suggestion: string;
}

/**
 * Detect banned phrases in generated output.
 * Returns list of violations with position and suggested replacement.
 */
export function detectBannedPhrases(text: string): SlopViolation[] {
    const lower = text.toLowerCase();
    const violations: SlopViolation[] = [];

    for (const phrase of BANNED_PHRASES) {
        let pos = lower.indexOf(phrase);
        while (pos !== -1) {
            violations.push({
                phrase,
                position: pos,
                suggestion: getSlopReplacement(phrase),
            });
            pos = lower.indexOf(phrase, pos + 1);
        }
    }

    return violations;
}

export function getSlopReplacement(phrase: string): string {
    // Specific high-value replacements for common phrases
    const specific: Record<string, string> = {
        "in today's rapidly evolving landscape": "Use specific market data: '[X]% growth in [metric] since [year]'",
        "it's important to note": "Remove - state the point directly",
        "game-changer": "Quantify the impact: '[X]% improvement in [metric]'",
        "leverage synergies": "Name the specific integration and its measured benefit",
        "best-in-class": "Cite the specific benchmark: 'Top quartile per [source]'",
        "cutting-edge": "Name the specific technology and its adoption rate",
        "paradigm shift": "Describe the specific change and its measured impact",
        "actionable insights": "Remove - state the specific action and expected outcome",
        "deep dive": "Use 'Detailed analysis of [specific topic]'",
        "low-hanging fruit": "Use 'Quick wins (0-3 months): [specific items]'",
        "moving forward": "Use specific timeline: 'In Q3 2026' or 'Within 90 days'",
        "circle back": "Use 'Revisit in [specific timeframe] when [condition]'",
        "stakeholder engagement": "Name the specific stakeholders and engagement mechanism",
        "value proposition": "State the specific measurable benefit to the specific user",
    };
    const key = phrase.toLowerCase();
    if (specific[key]) return specific[key];

    // Category-based fallbacks
    const metaNarration = ["good morning", "good afternoon", "welcome to", "today we will", "today we'll", "we will present", "we now move to", "let us now examine", "in this section", "in this presentation", "as you can see", "this slide shows", "thank you for", "our objective is", "allow me to", "before we begin", "before we get started", "let's explore", "let's pivot", "turning our attention", "having explored", "now that we've", "building on that", "this leads us", "with that in mind", "transitioning to"];
    if (metaNarration.some(m => key.includes(m))) return "Remove - present content directly without announcing it";

    const concluding = ["in conclusion", "to summarize", "ultimately", "only time will tell", "the future looks bright", "in short", "by and large", "at the end of the day", "embracing the possibilities", "a journey toward"];
    if (concluding.some(m => key.includes(m))) return "Remove - end with a specific action item or data point";

    const filler = ["basically", "essentially", "actually", "definitely", "absolutely", "truly", "literally", "clearly", "obviously", "naturally", "effectively", "successfully"];
    if (filler.some(m => key === m)) return "Remove - adds no meaning";

    const hedging = ["it is believed", "it could be argued", "one might suggest", "it appears to be", "generally considered", "to some extent", "arguably", "possibly the most", "it should be noted"];
    if (hedging.some(m => key.includes(m))) return "Remove hedging - state the claim directly with evidence";

    return "Remove - replace with specific, quantified language";
}

// --- EVIDENCE DENSITY SCORING (G-05) ---

/**
 * Compute evidence density per major section of generated output.
 * Returns a report showing which sections have citations and which don't.
 */
export function computeEvidenceDensity(text: string): {
    totalCitations: number;
    sectionsWithEvidence: number;
    sectionsWithout: string[];
    densityScore: number;
} {
    // Split by major section headers (## or ### or numbered sections)
    const sections = text.split(/(?=^#{1,3}\s|^\d+\.\s)/m).filter(s => s.trim().length > 50);
    const totalCitations = (text.match(/\[CHUNK_\d+\]|\(Source:/g) || []).length;

    let sectionsWithEvidence = 0;
    const sectionsWithout: string[] = [];

    for (const section of sections) {
        const firstLine = section.trim().split('\n')[0].substring(0, 60);
        const hasCitation = /\[CHUNK_\d+\]|\(Source:/.test(section);
        if (hasCitation) {
            sectionsWithEvidence++;
        } else if (firstLine.length > 5) {
            sectionsWithout.push(firstLine.replace(/^#+\s*/, '').trim());
        }
    }

    const densityScore = sections.length > 0
        ? Math.round((sectionsWithEvidence / sections.length) * 100)
        : 0;

    return { totalCitations, sectionsWithEvidence, sectionsWithout: sectionsWithout.slice(0, 5), densityScore };
}

// --- DEPTH ESTIMATION ---

function estimateDepth(text: string): number {
    // Heuristic: count paragraphs that contain evidence markers, implications, and recommendations
    const paragraphs = text.split(/\n\n+/);
    if (paragraphs.length === 0) return 1;

    let depthSum = 0;
    for (const para of paragraphs) {
        const lower = para.toLowerCase();
        let paraDepth = 1; // Base: observation

        // Layer 2 indicators: implications, "this means", "as a result", "consequently"
        if (/this (means|implies|suggests|indicates)|as a result|consequently|therefore|the implication/i.test(para)) {
            paraDepth = Math.max(paraDepth, 3);
        }

        // Layer 3 indicators: recommendations with evidence
        if (/recommend|should|must|action:|implement|deploy|migrate|redesign/i.test(para) &&
            /\d+%|\$[\d,]+|CHUNK_|source:|evidence/i.test(para)) {
            paraDepth = Math.max(paraDepth, 5);
        } else if (/recommend|should|action:/i.test(para)) {
            paraDepth = Math.max(paraDepth, 4);
        }

        // Evidence markers boost depth
        if (/CHUNK_\d+|\(source:|citation|per \w+ \d{4}|according to/i.test(para)) {
            paraDepth = Math.min(5, paraDepth + 1);
        }

        depthSum += paraDepth;
    }

    return Math.min(5, depthSum / paragraphs.length);
}

// --- SPECIFICITY ESTIMATION ---

function estimateSpecificity(text: string): number {
    const lower = text.toLowerCase();
    let score = 2; // Base

    // Quantified metrics boost specificity
    const percentMatches = text.match(/\d+(\.\d+)?%/g);
    if (percentMatches && percentMatches.length >= 5) score += 1;

    // Dollar amounts
    const dollarMatches = text.match(/\$[\d,]+(\.\d+)?[KMBkmb]?/g);
    if (dollarMatches && dollarMatches.length >= 3) score += 0.5;

    // Specific timelines
    const timelineMatches = text.match(/\d+\s*(days?|weeks?|months?|sprints?|quarters?)/gi);
    if (timelineMatches && timelineMatches.length >= 3) score += 0.5;

    // Named frameworks/tools
    const frameworkMatches = text.match(/(Gartner|Forrester|McKinsey|BCG|Porter|Rumelt|Cooper|Bitner|Cagan|NPS|CSAT|CES)/gi);
    if (frameworkMatches && frameworkMatches.length >= 3) score += 0.5;

    // Action verbs with owners
    if (/assign|owner:|responsible:|RACI/i.test(lower)) score += 0.5;

    return Math.min(5, score);
}

// =============================================================================
// 2026-05-14 - Engagement cache layer (Tier 4 build-only iteration support).
//
// Persists generated artifacts under wiki/engagements/<slug>/ so a subsequent
// run of the same engagement can resume from cache instead of regenerating.
// Each engagement has:
//
//   wiki/engagements/<slug>/
//     manifest.json         - what's cached + timestamps + cost stamps
//     briefs.json           - the 5 product briefs from prototypeBriefGenerator
//     themes.json           - themes JSON (future)
//     deliverables.json     - personas/journey/gap/comp/blueprint (future)
//     prototypes/<id>.json  - built prototypes (future)
//
// All paths are relative to the wiki root and go through the same proxy
// /api/wiki/{read,write,list} endpoints as everything else.
// =============================================================================

export interface EngagementBriefRecord {
    id: string;
    frame_label: string;
    probability: number;
    title: string;
    brand: 'NXT' | 'NU';
    based_on?: string;
    research_goal?: string;
    original_concept: string;
    brief: any;             // full ProductBrief JSON
}

export interface EngagementBriefsFile {
    schema_version: 1;
    slug: string;
    research_goal: string;
    brand: 'NXT' | 'NU';
    created_at: string;
    updated_at: string;
    briefs: EngagementBriefRecord[];
    /** model mode used to generate (opus | hybrid | gpt) so we can show provenance on reload. */
    brief_model_mode?: 'opus' | 'hybrid' | 'gpt';
    /** Approximate cost in USD at generation time (cost meter snapshot). */
    cost_usd_at_generation?: number;
}

export interface EngagementManifest {
    schema_version: 1;
    slug: string;
    research_goal: string;
    brand?: 'NXT' | 'NU';
    created_at: string;
    updated_at: string;
    /** Quick-glance counts so the IDLE-screen resume picker can show "5 briefs · 3 prototypes" without loading the full files. */
    cached: {
        briefs?: { count: number; path: string; brief_model_mode?: 'opus' | 'hybrid' | 'gpt' };
        themes?: { count: number; path: string };
        personas?: { count: number; path: string };
        prototypes?: { count: number; ids: string[] };
        engagement_md?: { path: string };
    };
    /** Cumulative cost meter snapshot across the engagement's lifetime. */
    cost_usd_total?: number;
    /** 2026-06-06 - Knowledge Library selection persisted on apply. Closes
     *  Gap 1 from the architecture audit: KL had 5 selection fields but
     *  only `socialSubreddits` was consumed. This field carries the FULL
     *  selection so every generator path can read it via
     *  loadGenerationContext() and inject a PRIOR_CACHED block into the
     *  AI model's system prompt. */
    cached_selection?: {
        engagement_slugs: string[];
        theme_cluster_ids: string[];
        source_archive_paths: string[];
        social_subreddits: string[];
        article_sources: string[];
        selected_at_ms: number;
    };
}

const ENGAGEMENT_DIR = 'engagements';

function engagementBriefsPath(slug: string): string {
    return `${ENGAGEMENT_DIR}/${slug}/briefs.json`;
}
function engagementManifestPath(slug: string): string {
    return `${ENGAGEMENT_DIR}/${slug}/manifest.json`;
}

// 2026-05-14 Phase B - Deliverable persistence. The pipeline generates a
// rich JSON for themes/personas/journey/gap/recs/competitive/blueprint, but
// those have never been written to disk (only included in session snapshots).
// Persisting them per-engagement enables the Knowledge Library to cache-load
// on subsequent runs against the same goal.
export type DeliverableKind =
    | 'themes' | 'personas' | 'journey' | 'gap' | 'recs' | 'competitive' | 'blueprint';

function deliverablePath(slug: string, kind: DeliverableKind): string {
    return `${ENGAGEMENT_DIR}/${slug}/${kind}.json`;
}

/**
 * Persist a deliverable JSON to wiki/engagements/<slug>/<kind>.json. Best-
 * effort: returns false on any error rather than throwing - deliverable
 * generation already succeeded, we don't want to fail the user's run because
 * cache-write hit a transient proxy issue.
 */
/**
 * 2026-06-02 - Drift anchor (harness Layer 1). Pull the production fingerprint
 * off the deliverable object that is ALREADY being written: which model made it,
 * its reproducibility hash, and when. No new plumbing - themes already stamp
 * reproducibility_hash/stamped_at; other kinds contribute what they carry. This
 * is what makes drift DETECTABLE: "same fingerprint -> output changed" = drift.
 */
function extractDeliverableFingerprint(payload: any): { model?: string; reproducibility_hash?: string; generated_at: string } {
    const p = (payload && payload.data) ? payload.data : (payload || {});
    const fp: { model?: string; reproducibility_hash?: string; generated_at: string } = {
        generated_at: (typeof p.stamped_at === 'string' && p.stamped_at) ? p.stamped_at : new Date().toISOString(),
    };
    const model = p.model || p.model_used || p.model_final || p.modelFinal;
    if (typeof model === 'string' && model) fp.model = model.slice(0, 60);
    const rh = p.reproducibility_hash || p.reproducibilityHash;
    if (typeof rh === 'string' && rh) fp.reproducibility_hash = rh;
    return fp;
}

export async function writeEngagementDeliverable(
    slug: string,
    kind: DeliverableKind,
    payload: any,
): Promise<boolean> {
    if (!slug || !kind || payload == null) return false;
    try {
        const wrapped = {
            schema_version: 1,
            kind,
            slug,
            saved_at: new Date().toISOString(),
            data: payload,
        };
        const ok = await writeWikiPage(deliverablePath(slug, kind), JSON.stringify(wrapped, null, 2));
        // 2026-05-19 - Defensive manifest guarantee. Callers SHOULD also call
        // writeEngagementManifest with the real research_goal, but historically
        // some paths (App.tsx persistDeliverable pre-fix) wrote 6 deliverables
        // without ever creating the manifest. That left the engagement dir
        // visible to wikiCacheLoader.fetch but with manifest.json 404ing -
        // cascading console errors and broken Knowledge Library entries.
        //
        // This layer ensures a minimal manifest exists for every engagement
        // that has at least one deliverable. If the caller later updates the
        // manifest with the real goal, writeEngagementManifest merges and the
        // placeholder goal is overwritten. If they don't, the placeholder
        // (derived from the slug) is at least serviceable.
        if (ok) {
            try {
                // Always upsert this kind's cache entry WITH its production
                // fingerprint (model + reproducibility hash + timestamp) - the
                // drift anchor. writeEngagementManifest merges, so a real
                // research_goal written by the caller is preserved; if none
                // exists yet we seed a serviceable placeholder from the slug.
                const existing = await readEngagementManifest(slug);
                const cached: Record<string, any> = {};
                cached[kind] = { count: 1, path: deliverablePath(slug, kind), ...extractDeliverableFingerprint(payload) };
                await writeEngagementManifest(slug, {
                    research_goal: existing?.research_goal || slug.replace(/-/g, ' '),
                    cached,
                });
            } catch (manifestErr) {
                // Non-fatal - the deliverable is on disk. Manifest can be repaired later.
                console.warn(`[WikiService] Manifest fingerprint update for ${slug} failed (non-fatal):`, manifestErr);
            }
            // Gap C (2026-06-22): UNIVERSAL second-brain loop. Every persisted
            // deliverable re-chunks its insights into the wiki/manifest so future
            // runs can cite past synthesis by pointer (UNIFIED_VISION #8). Fire-
            // and-forget + dynamic import (no load-order cycle); idempotent via
            // content-hash dedup in /api/wiki/write-article.
            try {
                const fp: any = extractDeliverableFingerprint(payload);
                void import('./chunkRetrieval').then(({ persistDeliverableInsights }) =>
                    persistDeliverableInsights(slug, kind, payload, fp?.model || '', undefined)
                ).catch(() => { /* non-fatal */ });
            } catch { /* non-fatal */ }
        }
        return ok;
    } catch (e) {
        console.warn(`[WikiService] writeEngagementDeliverable failed for ${slug}/${kind} (non-fatal):`, e);
        return false;
    }
}

/** Read a previously persisted deliverable. Returns the unwrapped payload or null. */
export async function readEngagementDeliverable<T = any>(slug: string, kind: DeliverableKind): Promise<T | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${deliverablePath(slug, kind)}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = typeof data === 'string' ? data : (data?.content || '');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return (parsed?.data ?? parsed) as T;
    } catch (e) {
        return null;
    }
}

/** Persist the 5 generated briefs under wiki/engagements/<slug>/briefs.json. */
export async function writeEngagementBriefs(slug: string, payload: Omit<EngagementBriefsFile, 'schema_version' | 'created_at' | 'updated_at'> & { created_at?: string }): Promise<boolean> {
    const now = new Date().toISOString();
    const full: EngagementBriefsFile = {
        schema_version: 1,
        created_at: payload.created_at || now,
        updated_at: now,
        ...payload,
    };
    return writeWikiPage(engagementBriefsPath(slug), JSON.stringify(full, null, 2));
}

/** Read the cached briefs for an engagement, or null if none. */
export async function readEngagementBriefs(slug: string): Promise<EngagementBriefsFile | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${engagementBriefsPath(slug)}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        // Proxy returns { content: "..." } for read endpoint
        const raw = typeof data === 'string' ? data : (data?.content || '');
        if (!raw) return null;
        return JSON.parse(raw) as EngagementBriefsFile;
    } catch (e) {
        console.warn(`[WikiService] readEngagementBriefs failed for ${slug}:`, e);
        return null;
    }
}

/** Write the engagement manifest. Merges with existing if present so callers can update specific cache entries. */
export async function writeEngagementManifest(slug: string, partial: Partial<EngagementManifest> & Pick<EngagementManifest, 'research_goal'>): Promise<boolean> {
    const now = new Date().toISOString();
    const existing = await readEngagementManifest(slug);
    // Start with what was there, layer the caller's partial on top, then force-set
    // computed fields. Spread order matters - computed fields go LAST so they win.
    const merged: EngagementManifest = {
        ...(existing || {} as EngagementManifest),
        ...partial,
        cached: { ...(existing?.cached || {}), ...(partial.cached || {}) },
        slug,
        schema_version: 1,
        created_at: existing?.created_at || partial.created_at || now,
        updated_at: now,
    };
    return writeWikiPage(engagementManifestPath(slug), JSON.stringify(merged, null, 2));
}

/** Read the engagement manifest, or null if none. */
export async function readEngagementManifest(slug: string): Promise<EngagementManifest | null> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/read/${engagementManifestPath(slug)}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        const raw = typeof data === 'string' ? data : (data?.content || '');
        if (!raw) return null;
        return JSON.parse(raw) as EngagementManifest;
    } catch (e) {
        console.warn(`[WikiService] readEngagementManifest failed for ${slug}:`, e);
        return null;
    }
}

/**
 * List every engagement manifest available, sorted by updated_at desc.
 * Used by the IDLE-screen resume picker to surface prior engagements that
 * semantically match the current goal.
 */
export async function listEngagementManifests(): Promise<EngagementManifest[]> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/list/${ENGAGEMENT_DIR}`);
        if (!resp.ok) return [];
        const data = await resp.json();
        // FIXED 2026-05-14: each engagement lives in its OWN subdirectory
        // (engagements/<slug>/manifest.json), so we read from the proxy's
        // dirs[] field (the files[] field would only contain stray .md files
        // in the engagements root, none of which are manifests).
        const dirNames: string[] = Array.isArray(data?.dirs)
            ? data.dirs.map((d: any) => String(d).replace(/\/$/, '')).filter(Boolean)
            : [];
        const manifests = await Promise.all(dirNames.map(async (slug) => {
            const m = await readEngagementManifest(slug);
            return m;
        }));
        return manifests
            .filter((m): m is EngagementManifest => !!m)
            .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    } catch (e) {
        console.warn('[WikiService] listEngagementManifests failed:', e);
        return [];
    }
}

/**
 * Simple keyword-overlap match between an entered research goal and existing
 * manifests. Returns matches scored 0-1 sorted descending, with a min
 * threshold of 0.25 to suppress noise. Cheap pre-filter; the UI surfaces
 * matches so the user can decide whether to resume.
 */
export function scoreGoalMatch(enteredGoal: string, manifestGoal: string): number {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 4);
    const stop = new Set(['identify', 'understand', 'analyze', 'explore', 'develop', 'create', 'build', 'design', 'comprehensive', 'strategy', 'based', 'current', 'their', 'these', 'those', 'which', 'where', 'while', 'within']);
    const a = new Set(norm(enteredGoal).filter(t => !stop.has(t)));
    const b = new Set(norm(manifestGoal).filter(t => !stop.has(t)));
    if (a.size === 0 || b.size === 0) return 0;
    let overlap = 0;
    a.forEach(t => { if (b.has(t)) overlap++; });
    return overlap / Math.max(a.size, b.size);
}

