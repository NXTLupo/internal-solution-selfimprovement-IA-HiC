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

export type ChatModel = 'claude-opus-4-6' | 'o3-mini' | 'gemini-3.1-pro';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: ChatModel;
    timestamp: number;
    tokenCount?: number;
    durationMs?: number;
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
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        provider: 'anthropic',
        description: 'Anthropic flagship — complex reasoning, extended thinking, agentic tasks',
        contextWindow: '1M tokens',
        strengths: 'Deep analysis, nuanced synthesis, evidence weaving',
        color: '#CC6644',
        available: !!(process.env.ANTHROPIC_API_KEY),
    },
    {
        id: 'o3-mini',
        name: 'o3-mini (High Reasoning)',
        provider: 'openai',
        description: 'OpenAI reasoning model — STEM, science, chain-of-thought',
        contextWindow: '200K tokens',
        strengths: 'Structured reasoning, quantitative analysis, logical deduction',
        color: '#00B7C3',
        available: !!(process.env.OPENAI_API_KEY),
    },
    {
        id: 'gemini-3.1-pro',
        name: 'Gemini 3.1 Pro',
        provider: 'google',
        description: 'Google flagship — 2M context window, multimodal, complex reasoning',
        contextWindow: '2M tokens',
        strengths: 'Massive context, multimodal, comprehensive synthesis',
        color: '#B8B800',
        available: !!(process.env.API_KEY || process.env.GEMINI_API_KEY),
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

    const systemPrompt = `You are a research intelligence assistant grounded in a comprehensive research corpus.
You have access to ${context.sourceCount} data sources containing ${context.articleCount} articles collected for this research.
The research goal is: "${context.researchGoal}"

RULES:
- Answer ONLY from the evidence in the corpus. Do not hallucinate or invent data.
- Cite specific sources by name (e.g., "According to Higher Ed Dive...", "A Reddit user on r/philanthropy wrote...")
- If the corpus does not contain information to answer the question, say: "The collected data does not contain evidence for this question."
- Use specific numbers, quotes, dates, and statistics from the sources.
- When asked for "top N" items, rank by evidence strength (number of supporting sources).
- When asked about themes, personas, or deliverables, reference the generated outputs.

${groundingContext}`;

    try {
        let responseText = '';

        if (model === 'claude-opus-4-6') {
            responseText = await callAnthropic(systemPrompt, userMessage, conversationHistory);
        } else if (model === 'o3-mini') {
            responseText = await callOpenAI(systemPrompt, userMessage, conversationHistory);
        } else if (model === 'gemini-3.1-pro') {
            responseText = await callGemini(systemPrompt, userMessage, conversationHistory);
        }

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
    const contents = `${system}\n\nConversation:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nuser: ${userMsg}`;

    const resp = await fetch(`${PROXY_BASE}/api/ai/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemini-3.1-pro',
            contents,
            config: { temperature: 0.2 },
        }),
    });

    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
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
