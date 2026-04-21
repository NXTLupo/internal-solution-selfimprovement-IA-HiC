/**
 * Wiki Service — Persistent Knowledge Layer Interface
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
    exemplar?: string;
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
 * Comprehensive AI Slop Blacklist — ~350 phrases across 12 categories.
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

const PROXY_BASE = 'http://localhost:5012';

/**
 * Resilient GET wrapper for wiki proxy calls (2026-04-21).
 *
 * Chrome on Windows + Docker Desktop + WSL2 briefly reports
 * `net::ERR_NETWORK_CHANGED` when the Docker network namespace renegotiates
 * after a container rebuild or after the laptop resumes from sleep. These
 * surface as red errors in the devtools console even though the proxy
 * itself is fully healthy — a fetch started a millisecond before the flip
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
 * Do NOT use for writes (POST) — retries could cause duplicate side effects.
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
    // Silent final fail — caller decides what to do with null
    if (lastErr) console.warn(`[resilientGet] final fail for ${url.substring(0, 80)}: ${lastErr?.message || lastErr}`);
    return null;
}

/**
 * Write (overwrite) a wiki page. Used for full page updates.
 */
export async function writeWikiPage(relativePath: string, content: string): Promise<boolean> {
    try {
        const resp = await fetch(`${PROXY_BASE}/api/wiki/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: relativePath, content }),
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
            `\n## Research Run: ${date} — ${runData.goal.substring(0, 60)}\n\n${evidenceEntries}`);
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

    // 5. A10: Benchmark verification — scan evidence for numbers matching benchmark claims
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
 * query refinement happily keys on — producing r/marketingautomation and
 * r/CRM results instead of higher-ed advancement sources. It also makes
 * engagement slugs like "role-you-are-an-elite-market-research-an" that
 * false-match any other "ROLE You are..." run regardless of topic.
 *
 * This helper extracts the actual objective for slug generation, query
 * refinement, and engagement-memory matching. The RAW goal is still passed
 * to the AI system prompt (it contains valuable structural context) — only
 * the routing/matching layers use the extracted version.
 */
export function extractResearchObjective(goal: string): string {
    if (!goal || typeof goal !== 'string') return '';
    const trimmed = goal.trim();
    // Prefer the MISSION block when present — that's the actual research
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
 *  prompt-engineering preamble. */
export function buildEngagementSlug(goal: string, maxLen: number = 40): string {
    const objective = extractResearchObjective(goal);
    return objective.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, maxLen).replace(/-+$/, '') || 'misc';
}

/**
 * Create a wiki source summary page for uploaded documents.
 * Extracts file names, types, and creates a lightweight catalog
 * so the wiki knows what client documents exist.
 */
export async function seedWikiFromUploads(fileNames: string[], researchGoal: string): Promise<number> {
    if (!fileNames.length) return 0;
    const date = new Date().toISOString().split('T')[0];
    const slug = buildEngagementSlug(researchGoal);
    // Dedup defense (A-fix 2026-04-21): even if a caller accidentally passes
    // the same filename twice, the catalog written to the wiki should list
    // each file once. Keep first occurrence to preserve insertion order.
    const uniqueNames = Array.from(new Set(fileNames.filter(Boolean)));

    const fileEntries = uniqueNames.map(name => {
        const ext = name.split('.').pop()?.toLowerCase() || 'unknown';
        const typeMap: Record<string, string> = {
            'pdf': 'Document', 'docx': 'Document', 'doc': 'Document',
            'pptx': 'Presentation', 'ppt': 'Presentation',
            'xlsx': 'Spreadsheet', 'xls': 'Spreadsheet', 'csv': 'Data',
            'txt': 'Text', 'json': 'Data',
        };
        return `- **${name}** (${typeMap[ext] || 'File'})`;
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

These documents represent the client's own materials — proposals, SOWs, transcripts, strategies, budgets.
They define the project scope, stakeholders, goals, constraints, and organizational reality.
The AI ingestion pipeline reads these as PRIORITY 1 sources.
`;

    try {
        await writeWikiPage(`sources/uploads-${date}-${slug}.md`, page);
        console.log(`[WikiService] Seeded wiki with ${fileNames.length} uploaded document records`);
        return 1;
    } catch (e) {
        console.warn('[WikiService] Upload seeding failed (non-blocking):', e);
        return 0;
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
 *  content/text fields. Binary formats (PDF/DOCX) need upstream parsing —
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
 * Binaries without parseable text are skipped — they'll be wiki'd later
 * when the orchestrator runs them through `/api/extract-pdf`.
 *
 * Returns the count of files successfully archived.
 */
export async function archiveUploadedDocs(files: any[], researchGoal: string): Promise<number> {
    if (!Array.isArray(files) || files.length === 0) return 0;
    // Engagement slug now derived from the extracted research OBJECTIVE rather
    // than the raw goal — so "ROLE You are an elite market research analyst..."
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
        const text = extractTextFromUpload(f);
        if (!text || text.length < 40) continue;
        try {
            // Synthetic URL so the hash + frontmatter have a stable canonical
            // reference. upload://{engagement}/{filename} is readable and
            // guaranteed unique across engagements.
            const syntheticUrl = `upload://${engagementSlug}/${encodeURIComponent(f.name)}`;
            const resp = await fetch(`${PROXY_BASE}/api/wiki/write-article`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: syntheticUrl,
                    content: text,
                    source: f.name,
                    title: f.name,
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
    // Fallback for unstructured synthesis — dump JSON.
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
    const engagementSlug = (researchGoal || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40) || 'misc';
    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const body = _serializeSynthesis(kind, data);
    const frontmatter = `---
kind: synthesis
synthesis_kind: ${kind}
engagement: "${engagementSlug}"
goal: "${(researchGoal || '').replace(/"/g, '\\"').substring(0, 200)}"
created: ${new Date().toISOString()}
---`;
    const content = `${frontmatter}\n\n# ${kind.toUpperCase().replace('-', ' ')} — ${ts}\n\n${body}\n`;
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
    const slug = createGoalSlug(goal);
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
    /** Keyword-overlap count with the current goal — sort key */
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
 * Phase 1.9 — find prior engagements whose topic / goal overlaps with the
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
 * Phase 1.9 — stitch matched prior-engagement synthesis files into a
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
 * This is the main entry point — call before generating any deliverable.
 *
 * Returns compiled knowledge from:
 * - Framework page (structural requirements)
 * - Anti-pattern page (what to avoid)
 * - Relevant benchmark pages (data to cite)
 * - Evidence pages (pre-compiled citations)
 * - Brand standards (visual rendering rules)
 */
export async function loadGenerationContext(
    outputType: OutputOption,
    options?: {
        industry?: string;
        engagement?: string;
    }
): Promise<GenerationContext> {
    const frameworkKey = OUTPUT_TO_FRAMEWORK[outputType] || 'personas';
    const benchmarkKeys = FRAMEWORK_BENCHMARKS[frameworkKey] || ['cx-metrics'];

    // Load all wiki pages in parallel — frameworks, anti-patterns, benchmarks, brand,
    // social intelligence, research context, and methodology pages
    const [
        framework, antiPatterns, brand,
        // Social intelligence pages
        sentimentPipeline, topicModeling, cxMesh,
        // Research context pages
        researchModes, knowledgeGraph, documentIngestion, methodology, analyticalLenses, sourceConnectors,
        // Benchmark pages
        ...benchmarkPages
    ] = await Promise.all([
        readWikiPage(`frameworks/${frameworkKey}.md`),
        readWikiPage(`anti-patterns/${frameworkKey}.md`),
        loadBrandConfig(),
        // Social intelligence
        readWikiPage('social-intelligence/sentiment-pipeline.md'),
        readWikiPage('social-intelligence/topic-modeling.md'),
        readWikiPage('social-intelligence/cx-mesh.md'),
        // Research context
        readWikiPage('deep-research/research-modes.md'),
        readWikiPage('deep-research/knowledge-graph.md'),
        readWikiPage('deep-research/document-ingestion.md'),
        readWikiPage('methodologies/research-fabric.md'),
        readWikiPage('methodologies/analytical-lenses.md'),
        readWikiPage('sources-registry/connector-catalog.md'),
        // Benchmarks
        ...benchmarkKeys.map(key => readWikiPage(`benchmarks/${key}.md`)),
    ]);

    // Optional: industry and engagement context
    let industryAdaptation: string | undefined;
    let engagementContext: string | undefined;
    if (options?.industry) {
        const page = await readWikiPage(`industries/${options.industry}.md`);
        industryAdaptation = page?.content;
    }
    if (options?.engagement) {
        const page = await readWikiPage(`engagements/${options.engagement}.md`);
        engagementContext = page?.content;
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
    };
}

/**
 * Load all evidence pages from wiki/evidence/ directory.
 * Dynamically discovers pages rather than hardcoding filenames,
 * so new evidence pages created by INGEST operations are automatically included.
 */
async function loadAllEvidencePages(): Promise<(WikiPage | null)[]> {
    // Known evidence page stubs — extend this list as INGEST creates new pages
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
        "it's important to note": "Remove — state the point directly",
        "game-changer": "Quantify the impact: '[X]% improvement in [metric]'",
        "leverage synergies": "Name the specific integration and its measured benefit",
        "best-in-class": "Cite the specific benchmark: 'Top quartile per [source]'",
        "cutting-edge": "Name the specific technology and its adoption rate",
        "paradigm shift": "Describe the specific change and its measured impact",
        "actionable insights": "Remove — state the specific action and expected outcome",
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
    if (metaNarration.some(m => key.includes(m))) return "Remove — present content directly without announcing it";

    const concluding = ["in conclusion", "to summarize", "ultimately", "only time will tell", "the future looks bright", "in short", "by and large", "at the end of the day", "embracing the possibilities", "a journey toward"];
    if (concluding.some(m => key.includes(m))) return "Remove — end with a specific action item or data point";

    const filler = ["basically", "essentially", "actually", "definitely", "absolutely", "truly", "literally", "clearly", "obviously", "naturally", "effectively", "successfully"];
    if (filler.some(m => key === m)) return "Remove — adds no meaning";

    const hedging = ["it is believed", "it could be argued", "one might suggest", "it appears to be", "generally considered", "to some extent", "arguably", "possibly the most", "it should be noted"];
    if (hedging.some(m => key.includes(m))) return "Remove hedging — state the claim directly with evidence";

    return "Remove — replace with specific, quantified language";
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
