/**
 * Corpus Chat Service — "Chat to Your Data"
 *
 * Provides a persistent conversational interface grounded in the full research
 * corpus. Users can ask questions of their collected data using any of the
 * connected AI models:
 *
 * - Claude Opus 4.6 (Anthropic) — complex reasoning, extended thinking
 * - o3-mini (OpenAI) — STEM/reasoning with adjustable effort
 * - Gemini 3.1 Pro (Google) — 2M context, multimodal
 *
 * The entire curated corpus (all user-included articles, themes, personas,
 * deliverables) is injected as grounding context for every query.
 */

export type ChatModel = 'gemini-2.5-flash';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: ChatModel;
    timestamp: number;
    tokenCount?: number;
    durationMs?: number;
}

export interface SourceReference {
    id: string;                   // CHUNK_XXX or source::index
    sourceName: string;           // "Higher Ed Dive", "Reddit: r/philanthropy"
    title: string;                // Article title
    url?: string;                 // Clickable URL
    tier?: number;                // Credibility tier (1/2/3)
    date?: string;                // Publication date
}

export interface ChatContext {
    corpusText: string;           // Full curated corpus (all included articles)
    themes?: any[];               // Generated themes with citations
    personas?: any[];             // Generated personas with evidence
    recommendations?: any[];      // Strategic recommendations
    journeyStages?: any[];        // Service blueprint stages
    prd?: any;                    // Product requirements
    roadmap?: any;                // Strategic roadmap
    gapAnalysis?: any;            // Gap assessment
    techAudit?: any;              // Tech ecosystem audit
    competitiveAnalysis?: any;    // Competitive positioning
    techArchitecture?: any;       // Technical architecture
    strategicReport?: any;        // Strategic report (if generated)
    researchGoal: string;         // The user's research objective
    sourceCount: number;          // Number of data sources
    articleCount: number;         // Number of articles collected
    sourceReferences?: SourceReference[]; // Full provenance index for citation linking
    chunkMap?: Record<string, { sourceName: string; title: string; url?: string }>; // CHUNK_XXX resolution
    uploadedFileContents?: string; // Decoded text from uploaded PDFs/docs
}

export interface ModelConfig {
    id: ChatModel;
    name: string;
    provider: 'anthropic' | 'openai' | 'google';
    description: string;
    contextWindow: string;
    strengths: string;
    color: string;
    available: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: 'Google reasoning model — 1M context, fast, multimodal',
        contextWindow: '1M tokens',
        strengths: 'Fast responses, large context, comprehensive synthesis',
        color: '#B8B800',
        available: true,
    },
];

/**
 * Build the grounding context string from all available research data.
 * This is injected as system context for every chat query.
 */
function buildGroundingContext(ctx: ChatContext): string {
    const parts: string[] = [];

    parts.push(`=== RESEARCH CONTEXT ===`);
    parts.push(`Research Goal: ${ctx.researchGoal}`);
    parts.push(`Data Sources: ${ctx.sourceCount} sources, ${ctx.articleCount} articles collected`);
    parts.push(`You are grounded in ALL of this data. Answer questions using ONLY evidence from this corpus. Cite specific sources by name. If the data doesn't contain the answer, say so.`);
    parts.push('');

    if (ctx.themes?.length) {
        parts.push(`=== THEMES (${ctx.themes.length}) ===`);
        for (const t of ctx.themes) {
            const citations = (t.citations || []).map((c: any) => c.sourceName || c.sourceFile || '').filter(Boolean).join(', ');
            parts.push(`Theme: ${t.name}\nDescription: ${t.description}\nQuote: "${t.quote}"\nSources: ${citations}\n`);
        }
    }

    if (ctx.personas?.length) {
        parts.push(`=== PERSONAS (${ctx.personas.length}) ===`);
        for (const p of ctx.personas) {
            const pains = (p.painPoints || []).map((pp: any) => `${pp.label}: "${pp.quote}" (${pp.source || pp.citation?.sourceName || ''})`).join('; ');
            parts.push(`Persona: ${p.name} (${p.role})\nJTBD: ${p.jtbd || ''}\nPain Points: ${pains}\nBio: ${p.bio || ''}\n`);
        }
    }

    if (ctx.recommendations?.length) {
        parts.push(`=== RECOMMENDATIONS (${ctx.recommendations.length}) ===`);
        for (const r of ctx.recommendations) {
            parts.push(`[${r.impactLevel}] ${r.title}: ${r.description}\nEvidence: ${r.evidenceBasis || ''}\nSources: ${(r.citations || []).join(', ')}\n`);
        }
    }

    if (ctx.journeyStages?.length) {
        parts.push(`=== SERVICE BLUEPRINT (${ctx.journeyStages.length} stages) ===`);
        for (const s of ctx.journeyStages) {
            parts.push(`Stage: ${s.phase} | Pain: ${s.painPoint} | Emotion: ${s.emotion} | Fail: ${s.fail_point || 'none'} | Sources: ${(s.citations || []).join(', ')}`);
        }
        parts.push('');
    }

    if (ctx.gapAnalysis) {
        parts.push(`=== GAP ANALYSIS ===`);
        for (const g of (ctx.gapAnalysis.gaps || [])) {
            parts.push(`[${g.severity}] ${g.capability}: ${g.currentMaturity}/5 -> ${g.targetMaturity}/5 (gap ${g.gap}). Impact: ${g.impact}`);
        }
        parts.push('');
    }

    if (ctx.competitiveAnalysis) {
        parts.push(`=== COMPETITIVE ANALYSIS ===`);
        for (const p of (ctx.competitiveAnalysis.peers || [])) {
            parts.push(`${p.name}: ${p.position}. Strengths: ${(p.strengths || []).join(', ')}. Weaknesses: ${(p.weaknesses || []).join(', ')}`);
        }
        parts.push('');
    }

    if (ctx.strategicReport) {
        parts.push(`=== STRATEGIC REPORT ===`);
        parts.push(`Diagnosis: ${ctx.strategicReport.diagnosis}`);
        parts.push(`Guiding Policy: ${ctx.strategicReport.guidingPolicy}`);
        parts.push(`Pillars: ${(ctx.strategicReport.strategicPillars || []).join('; ')}`);
        for (const s of (ctx.strategicReport.sections || [])) {
            parts.push(`\nSection ${s.sectionNumber}: ${s.title}\n${s.content?.substring(0, 500)}...`);
        }
        parts.push('');
    }

    // Include uploaded client documents (PDFs, proposals, reports, transcripts)
    // These are the PRIMARY organizational context — the user's own data
    if (ctx.uploadedFileContents && ctx.uploadedFileContents.trim().length > 10) {
        parts.push(`=== UPLOADED CLIENT DOCUMENTS (the user's own organizational data — ALWAYS reference these) ===`);
        parts.push(ctx.uploadedFileContents.substring(0, 200000)); // 200KB cap for uploaded docs
        parts.push(`=== END CLIENT DOCUMENTS ===`);
        parts.push('');
    }

    // If corpus text contains ingested content (which includes extracted PDF text),
    // it supersedes the raw file decode above. The corpus has the FULL extracted text
    // from PDFs that were processed during ingestion.
    // Check if corpus is available and substantial:
    if (ctx.corpusText && ctx.corpusText.length > 100) {
        // Corpus is populated — it contains ALL uploaded file text + intelligence sources
        // This is the complete picture after ingestion
    } else if (ctx.uploadedFileContents && ctx.uploadedFileContents.includes('[PDF')) {
        // PDFs uploaded but corpus not yet built (pre-ingestion)
        // Tell the AI that PDF content will be available after ingestion
        parts.push(`NOTE: ${(ctx.uploadedFileContents.match(/\[PDF/g) || []).length} PDF files have been uploaded but their text content will be fully available after the ingestion phase processes them. For now, answer based on available text files and intelligence sources.`);
        parts.push('');
    }

    // Include raw source articles for maximum grounding depth
    // Build from sourceReferences if corpus text is empty (during collection)
    if (ctx.sourceReferences?.length) {
        parts.push(`=== SOURCE ARTICLE INDEX (${ctx.sourceReferences.length} articles) ===`);
        for (const ref of ctx.sourceReferences.slice(0, 200)) {
            parts.push(`[${ref.id}] ${ref.sourceName}: "${ref.title}"${ref.url ? ` | URL: ${ref.url}` : ''}${ref.date ? ` | ${ref.date}` : ''}`);
        }
        parts.push(`=== END SOURCE INDEX ===`);
    }

    // Include raw corpus for maximum grounding depth
    if (ctx.corpusText) {
        const maxCorpus = 500000; // 500KB — fits in all model contexts
        const corpus = ctx.corpusText.length > maxCorpus
            ? ctx.corpusText.substring(0, maxCorpus) + '\n[CORPUS TRUNCATED FOR CHAT]'
            : ctx.corpusText;
        parts.push(`=== RAW RESEARCH CORPUS ===`);
        parts.push(corpus);
        parts.push(`=== END CORPUS ===`);
    }

    return parts.join('\n');
}

const PROXY_BASE = 'http://localhost:5012';

/**
 * Send a chat message to the selected model with full corpus grounding.
 */
export async function sendChatMessage(
    model: ChatModel,
    userMessage: string,
    conversationHistory: ChatMessage[],
    context: ChatContext,
): Promise<ChatMessage> {
    const startTime = Date.now();
    const groundingContext = buildGroundingContext(context);

    // Build source provenance index for citation rendering
    const provenanceIndex = (context.sourceReferences || []).map(s =>
        `[${s.id}] ${s.sourceName}: "${s.title}"${s.url ? ` URL: ${s.url}` : ''}${s.date ? ` (${s.date})` : ''}`
    ).join('\n');

    const systemPrompt = `You are a research intelligence assistant grounded in a comprehensive research corpus.
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.
The research goal is: "${context.researchGoal}"

CITATION FORMAT (MANDATORY — every claim must have a citation):
When citing evidence, use this exact format: [SOURCE_NAME: "Article Title"]
Examples:
- [Higher Ed Dive: "Universities Struggle with Skills Gap"]
- [Reddit r/philanthropy: "nonprofit laid off staff due to funding cuts"]
- [OpenAlex: "Experiential Learning Outcomes Study"]
- [ERIC: "Donor Motivation and Retention Patterns"]
- [Federal Register: "Workforce Pell Grants Final Rule"]

RULES:
- Answer ONLY from the evidence in the corpus. Do not hallucinate or invent data.
- EVERY factual claim MUST include a [SOURCE_NAME: "Article Title"] citation
- Quote specific data: numbers, percentages, dates, dollar amounts, verbatim quotes
- When quoting a person or post, use their exact words in quotation marks
- When asked for "top N" items, rank by evidence strength (number of supporting sources)
- When asked about themes, personas, or deliverables, reference the generated outputs WITH their underlying source citations
- Include URLs when available so the user can visit the original source
- If the corpus does not contain information to answer the question, say: "The collected data does not contain evidence for this question."

${provenanceIndex ? `=== SOURCE PROVENANCE INDEX (${context.sourceReferences?.length || 0} sources — cite by [SOURCE_NAME: "Title"] format) ===\n${provenanceIndex}\n=== END PROVENANCE ===\n` : ''}

${groundingContext}`;

    try {
        const responseText = await callGemini(systemPrompt, userMessage, conversationHistory);

        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: responseText,
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
        };
    } catch (error: any) {
        return {
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: `Error from ${model}: ${error.message || 'Unknown error'}. Check your API key and network connection.`,
            model,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime,
        };
    }
}

async function callAnthropic(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    const messages = [
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        })),
        { role: 'user' as const, content: userMsg }
    ];

    const resp = await fetch(`${PROXY_BASE}/api/ai/anthropic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-opus-4-6',
            max_tokens: 8000,
            system,
            messages,
        }),
    });

    if (!resp.ok) throw new Error(`Anthropic API error: ${resp.status}`);
    const data = await resp.json();
    return data.content?.[0]?.text || data.content?.map((c: any) => c.text).join('') || 'No response';
}

async function callOpenAI(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    const messages = [
        { role: 'system' as const, content: system },
        ...history.filter(m => m.role !== 'system').map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        })),
        { role: 'user' as const, content: userMsg }
    ];

    const resp = await fetch(`${PROXY_BASE}/api/ai/openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'o3-mini',
            reasoning_effort: 'high',
            input: messages,
        }),
    });

    if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status}`);
    const data = await resp.json();
    return data.output?.[0]?.content?.[0]?.text || data.choices?.[0]?.message?.content || 'No response';
}

async function callGemini(system: string, userMsg: string, history: ChatMessage[]): Promise<string> {
    // Use the Google GenAI SDK directly (same as geminiService.ts) with the app's API key
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });
    const conversationText = history.map(m => `${m.role}: ${m.content}`).join('\n');
    const fullPrompt = `${system}\n\n${conversationText ? `Previous conversation:\n${conversationText}\n\n` : ''}User question: ${userMsg}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: fullPrompt }] },
        config: { temperature: 0.2 },
    });

    return response.text || 'No response';
}

/**
 * Parse chat response text and extract structured citations for rendering.
 * Finds [SOURCE_NAME: "Article Title"] patterns and resolves them against
 * the source provenance index to get URLs.
 */
export function parseChatCitations(
    text: string,
    sourceRefs?: SourceReference[]
): { segments: Array<{ type: 'text' | 'citation'; content: string; sourceName?: string; title?: string; url?: string }> } {
    const segments: Array<{ type: 'text' | 'citation'; content: string; sourceName?: string; title?: string; url?: string }> = [];

    // Strip markdown bold/italic that leaks through
    let cleaned = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

    // Match multiple citation formats the AI may produce:
    // 1. [SOURCE_NAME: "Article Title"]        — requested format
    // 2. [source_id::index: "Article Title"]   — chunk ID format (what Gemini actually produces)
    // 3. [Source Name: "Title"]                 — mixed case
    // 4. [CHUNK_XXX]                           — raw chunk reference
    const citationPattern = /\[([^\]]+?):\s*"([^"]+)"\]|\[([^\]]+?)::\d+:\s*"([^"]+)"\]|\[(CHUNK_\d+)\]/g;

    let lastIndex = 0;
    let match;

    while ((match = citationPattern.exec(cleaned)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: cleaned.substring(lastIndex, match.index) });
        }

        // Determine which capture group matched
        let sourceName = (match[1] || match[3] || '').trim();
        let articleTitle = (match[2] || match[4] || '').trim();
        const chunkRef = match[5]; // CHUNK_XXX raw reference

        // Resolve source_id format (e.g., "higher_ed_dive" -> "Higher Ed Dive")
        if (sourceName.includes('_') || sourceName.includes('::')) {
            const cleanId = sourceName.split('::')[0].replace(/_/g, ' ');
            // Try to find a matching source reference with a proper display name
            const ref = sourceRefs?.find(r =>
                r.id.startsWith(sourceName.split('::')[0]) ||
                r.sourceName.toLowerCase().replace(/\s+/g, '_') === sourceName.split('::')[0]
            );
            sourceName = ref?.sourceName || cleanId.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        // Resolve CHUNK_XXX references
        if (chunkRef) {
            sourceName = chunkRef;
            articleTitle = '';
        }

        // Try to resolve URL from provenance index — TITLE MATCH REQUIRED
        // The source index has multiple articles per source (e.g., 15 arXiv papers).
        // We MUST match the article title, not just the source name, to get the correct URL.
        let url: string | undefined;
        if (sourceRefs) {
            // Strategy 1: Exact title match (strongest — correct article URL)
            let ref = sourceRefs.find(r => {
                if (!articleTitle || !r.title) return false;
                const citTitle = articleTitle.toLowerCase().trim();
                const refTitle = r.title.toLowerCase().trim();
                return refTitle.includes(citTitle.substring(0, 30)) ||
                       citTitle.includes(refTitle.substring(0, 30));
            });

            // Strategy 2: Source name + partial title match
            if (!ref) {
                ref = sourceRefs.find(r => {
                    const nameMatch = r.sourceName.toLowerCase().includes(sourceName.toLowerCase()) ||
                        sourceName.toLowerCase().includes(r.sourceName.toLowerCase()) ||
                        r.id.startsWith(sourceName.split('::')[0]);
                    if (!nameMatch) return false;
                    // Require at least partial title match if both exist
                    if (articleTitle && r.title) {
                        const words = articleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 4);
                        const titleLower = r.title.toLowerCase();
                        const matchingWords = words.filter(w => titleLower.includes(w));
                        return matchingWords.length >= 2; // At least 2 significant words match
                    }
                    return false;
                });
            }

            // Strategy 3: Source ID match (for CHUNK_XXX references only, no title available)
            if (!ref && (chunkRef || !articleTitle)) {
                ref = sourceRefs.find(r =>
                    r.id.startsWith(sourceName.split('::')[0])
                );
            }

            // NEVER assign a URL without title confidence — wrong links are worse than no links
            if (ref?.url) {
                url = ref.url;
                if (!articleTitle && ref.title) articleTitle = ref.title;
                if (sourceName === chunkRef && ref.sourceName) sourceName = ref.sourceName;
            }
        }

        segments.push({
            type: 'citation',
            content: match[0],
            sourceName,
            title: articleTitle || sourceName,
            url,
        });

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < cleaned.length) {
        segments.push({ type: 'text', content: cleaned.substring(lastIndex) });
    }

    if (segments.length === 0) {
        segments.push({ type: 'text', content: cleaned });
    }

    return { segments };
}

/**
 * Build SourceReference[] from liveSourceResults for the chat provenance index.
 */
export function buildSourceReferences(liveSourceResults: any[]): SourceReference[] {
    const refs: SourceReference[] = [];
    for (const src of liveSourceResults) {
        for (let j = 0; j < (src.items || []).length; j++) {
            const item = src.items[j];
            refs.push({
                id: `${src.sourceId}::${j}`,
                sourceName: src.source || src.sourceId || '',
                title: item.title || '',
                url: item.url || '',
                tier: src.credibilityTier || 3,
                date: item.date || '',
            });
        }
    }
    return refs;
}

/**
 * Get available models based on API key presence.
 */
export function getAvailableModels(): ModelConfig[] {
    return AVAILABLE_MODELS.map(m => ({
        ...m,
        available: m.provider === 'anthropic' ? !!(process.env.ANTHROPIC_API_KEY)
            : m.provider === 'openai' ? !!(process.env.OPENAI_API_KEY)
            : !!(process.env.API_KEY || process.env.GEMINI_API_KEY),
    }));
}
