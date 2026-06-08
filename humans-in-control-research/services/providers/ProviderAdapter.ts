/**
 * Provider Adapter Interface - Provider-agnostic AI layer
 *
 * Every AI provider (Gemini, Claude, OpenAI) implements this interface.
 * The method executors call adapters without knowing which provider runs the request.
 *
 * Design decisions:
 * - analyzeWithSchema: structured JSON output (OpenAI structured outputs, Gemini schema, Claude two-pass)
 * - analyzeWithCitations: citation-first output (Claude citations, Gemini grounding, OpenAI web search)
 * - groundedSearch: web-grounded research (Gemini Google Search, Claude web_search, OpenAI web_search_preview)
 */

export interface ProviderCapabilities {
    structuredOutput: boolean;     // Can enforce JSON schema on response
    citations: boolean;            // Can produce inline citations from documents
    groundedSearch: boolean;       // Can search the web during generation
    vision: boolean;               // Can analyze images
    thinking: boolean;             // Has extended thinking/reasoning mode
    streaming: boolean;            // Supports streaming responses
}

export interface AnalysisRequest {
    systemPrompt: string;
    userPrompt: string;
    corpus?: string;               // Research corpus text (prepended to user prompt)
    images?: { data: string; mediaType: string }[];
    temperature?: number;
    maxTokens?: number;
    thinkingBudget?: number;       // For Claude extended thinking
}

export interface StructuredRequest<T> extends AnalysisRequest {
    schema: any;                   // JSON Schema for structured output
    schemaName?: string;           // Name for the schema (OpenAI requires this)
}

export interface GroundedSearchRequest {
    query: string;
    mode: 'quick' | 'focused' | 'deep';
    allowedDomains?: string[];
    blockedDomains?: string[];
    maxSearches?: number;
}

export interface EvidenceSpan {
    source_id: string;
    source_type: 'web' | 'pdf' | 'doc' | 'transcript' | 'dataset' | 'notebook' | 'video' | 'interview';
    locator: {
        url?: string;
        page?: number | null;
        section?: string | null;
        timestamp?: string | null;
        char_start?: number | null;
        char_end?: number | null;
    };
    quote: string;
    claim_support: 'supports' | 'contradicts' | 'neutral';
    confidence: 'high' | 'medium' | 'low';
}

export interface AnalysisResponse {
    content: string;               // Raw text response
    provider: string;              // Which provider handled this
    model: string;                 // Which model was used
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    durationMs: number;
    citations?: EvidenceSpan[];    // If provider returned citations
}

export interface StructuredResponse<T> extends AnalysisResponse {
    data: T;                       // Parsed structured output
}

export interface ProviderAdapter {
    name: string;
    capabilities: ProviderCapabilities;

    /** Text analysis - returns raw text */
    analyze(request: AnalysisRequest): Promise<AnalysisResponse>;

    /** Structured output - returns parsed JSON matching schema */
    analyzeStructured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>>;

    /** Vision analysis - analyzes images */
    analyzeVision(request: AnalysisRequest): Promise<AnalysisResponse>;

    /** Grounded web search - searches the web and synthesizes */
    groundedSearch(request: GroundedSearchRequest): Promise<AnalysisResponse>;

    /** Check if this provider is available (API key configured) */
    isAvailable(): Promise<boolean>;
}

/**
 * Provider Registry - manages available providers and selection
 */
export class ProviderRegistry {
    private adapters: Map<string, ProviderAdapter> = new Map();
    private defaultProvider: string = 'gemini';

    register(adapter: ProviderAdapter): void {
        this.adapters.set(adapter.name, adapter);
    }

    get(name: string): ProviderAdapter | undefined {
        return this.adapters.get(name);
    }

    setDefault(name: string): void {
        if (this.adapters.has(name)) {
            this.defaultProvider = name;
        }
    }

    getDefault(): ProviderAdapter {
        return this.adapters.get(this.defaultProvider) || this.adapters.values().next().value;
    }

    /** Get best provider for a specific capability */
    getForCapability(cap: keyof ProviderCapabilities): ProviderAdapter | undefined {
        // Priority: claude for citations, openai for structured, gemini for grounded
        const priority: Record<string, string[]> = {
            structuredOutput: ['openai', 'gemini', 'claude'],
            citations: ['claude', 'gemini', 'openai'],
            groundedSearch: ['gemini', 'claude', 'openai'],
            vision: ['claude', 'openai', 'gemini'],
            thinking: ['claude', 'openai', 'gemini'],
            streaming: ['gemini', 'claude', 'openai'],
        };
        for (const name of (priority[cap] || [])) {
            const adapter = this.adapters.get(name);
            if (adapter?.capabilities[cap]) return adapter;
        }
        return this.getDefault();
    }

    async getAvailableProviders(): Promise<string[]> {
        const available: string[] = [];
        for (const [name, adapter] of this.adapters) {
            if (await adapter.isAvailable()) available.push(name);
        }
        return available;
    }

    /** Run with automatic fallback on failure */
    async withFallback<T>(
        fn: (adapter: ProviderAdapter) => Promise<T>,
        preferredProvider?: string,
    ): Promise<T> {
        const order = preferredProvider
            ? [preferredProvider, ...Array.from(this.adapters.keys()).filter(n => n !== preferredProvider)]
            : Array.from(this.adapters.keys());

        let lastError: Error | undefined;
        for (const name of order) {
            const adapter = this.adapters.get(name);
            if (!adapter) continue;
            try {
                if (await adapter.isAvailable()) {
                    return await fn(adapter);
                }
            } catch (e: any) {
                console.warn(`Provider ${name} failed: ${e.message}. Trying next...`);
                lastError = e;
            }
        }
        throw lastError || new Error('No providers available');
    }
}

// Singleton registry
export const providerRegistry = new ProviderRegistry();
