/**
 * Claude Provider Adapter
 * Two-pass architecture per the spec:
 * Pass A: Citation pass (documents + citations enabled)
 * Pass B: Structuring pass (normalize cited output to JSON schema)
 *
 * Routes through proxy at localhost:5012/api/ai/anthropic to bypass CORS.
 */

import type { ProviderAdapter, ProviderCapabilities, AnalysisRequest, AnalysisResponse, StructuredRequest, StructuredResponse, GroundedSearchRequest } from './ProviderAdapter';
import { tryRepairJson } from '../aiRouter';

const PROXY_URL = 'http://localhost:5012/api/ai/anthropic';
const MODEL = 'claude-sonnet-4-6';

async function callClaude(body: any): Promise<any> {
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API error ${response.status}: ${err.substring(0, 300)}`);
    }
    return response.json();
}

function extractText(data: any): string {
    return (data.content || [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
}

function extractUsage(data: any) {
    return data.usage ? {
        inputTokens: data.usage.input_tokens || 0,
        outputTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
    } : undefined;
}

export const claudeAdapter: ProviderAdapter = {
    name: 'claude',

    capabilities: {
        structuredOutput: true,   // Via two-pass
        citations: true,          // Native document citations
        groundedSearch: true,     // web_search tool
        vision: true,
        thinking: true,           // Extended thinking
        streaming: true,
    },

    async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const messages: any[] = [{
            role: 'user',
            content: [{ type: 'text', text: request.corpus
                ? `${request.corpus}\n\n${request.userPrompt}`
                : request.userPrompt
            }],
        }];

        const data = await callClaude({
            model: MODEL,
            max_tokens: request.maxTokens || 8000,
            system: request.systemPrompt,
            messages,
        });

        return {
            content: extractText(data),
            provider: 'claude',
            model: data.model || MODEL,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async analyzeStructured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
        const start = Date.now();

        // PASS A: Citation pass (if corpus provided, use document citations)
        let citedContent: string;
        if (request.corpus) {
            const passA = await callClaude({
                model: MODEL,
                max_tokens: request.maxTokens || 8000,
                system: request.systemPrompt,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: { type: 'text', media_type: 'text/plain', data: btoa(unescape(encodeURIComponent(request.corpus.substring(0, 50000)))) },
                            citations: { enabled: true },
                        },
                        { type: 'text', text: request.userPrompt },
                    ],
                }],
            });
            citedContent = extractText(passA);
        } else {
            const passA = await callClaude({
                model: MODEL,
                max_tokens: request.maxTokens || 8000,
                system: request.systemPrompt,
                messages: [{ role: 'user', content: [{ type: 'text', text: request.userPrompt }] }],
            });
            citedContent = extractText(passA);
        }

        // PASS B: Structuring pass (normalize to JSON schema)
        const passB = await callClaude({
            model: MODEL,
            max_tokens: request.maxTokens || 8000,
            system: 'You are a JSON normalizer. Convert the provided research findings into the exact JSON schema requested. Do not add new claims. Preserve all citations and evidence references.',
            messages: [{
                role: 'user',
                content: [{
                    type: 'text',
                    text: `Normalize the following research output into valid JSON matching this schema:\n${JSON.stringify(request.schema)}\n\nResearch findings:\n${citedContent}`,
                }],
            }],
        });

        const rawJson = extractText(passB);
        let data: T;
        try {
            // Try to extract JSON from the response
            const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
            data = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson);
        } catch {
            const repaired = tryRepairJson(rawJson);
            data = repaired ? JSON.parse(repaired) : {} as T;
        }

        return {
            content: citedContent,
            provider: 'claude',
            model: MODEL,
            data,
            usage: extractUsage(passB),
            durationMs: Date.now() - start,
        };
    },

    async analyzeVision(request: AnalysisRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const content: any[] = [];

        for (const img of (request.images || [])) {
            content.push({
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.data },
            });
        }
        content.push({ type: 'text', text: request.userPrompt });

        const data = await callClaude({
            model: MODEL,
            max_tokens: request.maxTokens || 8000,
            system: request.systemPrompt,
            messages: [{ role: 'user', content }],
        });

        return {
            content: extractText(data),
            provider: 'claude',
            model: data.model || MODEL,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async groundedSearch(request: GroundedSearchRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const data = await callClaude({
            model: 'claude-opus-4-6',
            max_tokens: 16000,
            tools: [{
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: request.maxSearches || 10,
                ...(request.allowedDomains?.length ? { allowed_domains: request.allowedDomains } : {}),
                ...(request.blockedDomains?.length ? { blocked_domains: request.blockedDomains } : {}),
            }],
            messages: [{ role: 'user', content: [{ type: 'text', text: request.query }] }],
        });

        const citations = [];
        let content = '';
        for (const block of data.content || []) {
            if (block.type === 'web_search_tool_result') {
                for (const result of block.content || []) {
                    if (result.type === 'web_search_result') {
                        citations.push({
                            source_id: result.url,
                            source_type: 'web' as const,
                            locator: { url: result.url },
                            quote: result.title || '',
                            claim_support: 'supports' as const,
                            confidence: 'medium' as const,
                        });
                    }
                }
            }
            if (block.type === 'text') content += block.text;
        }

        return {
            content,
            provider: 'claude',
            model: data.model || 'claude-opus-4-6',
            citations,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async isAvailable(): Promise<boolean> {
        try {
            const resp = await fetch('http://localhost:5012/api/ai/status');
            const data = await resp.json();
            return !!data.anthropic;
        } catch { return false; }
    },
};
