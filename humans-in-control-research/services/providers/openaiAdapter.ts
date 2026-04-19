/**
 * OpenAI Provider Adapter
 * Uses Responses API with structured outputs for guaranteed schema compliance.
 * Routes through proxy at localhost:5012/api/ai/openai to bypass CORS.
 */

import type { ProviderAdapter, ProviderCapabilities, AnalysisRequest, AnalysisResponse, StructuredRequest, StructuredResponse, GroundedSearchRequest } from './ProviderAdapter';
import { tryRepairJson } from '../aiRouter';

const PROXY_URL = 'http://localhost:5012/api/ai/openai';
const MODEL = 'gpt-5.4-mini';
const MODEL_HEAVY = 'gpt-5.4';

async function callOpenAI(body: any, endpoint: 'responses' | 'chat' = 'chat'): Promise<any> {
    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-openai-endpoint': endpoint,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${err.substring(0, 300)}`);
    }
    return response.json();
}

function extractChatText(data: any): string {
    return data.choices?.[0]?.message?.content || '';
}

function extractResponsesText(data: any): string {
    for (const item of data.output || []) {
        if (item.type === 'message' && item.content) {
            for (const block of item.content) {
                if (block.type === 'output_text') return block.text;
            }
        }
    }
    return '';
}

function extractUsage(data: any) {
    const u = data.usage;
    if (!u) return undefined;
    return {
        inputTokens: u.prompt_tokens || u.input_tokens || 0,
        outputTokens: u.completion_tokens || u.output_tokens || 0,
        totalTokens: u.total_tokens || (u.prompt_tokens || 0) + (u.completion_tokens || 0),
    };
}

export const openaiAdapter: ProviderAdapter = {
    name: 'openai',

    capabilities: {
        structuredOutput: true,   // Responses API json_schema
        citations: false,         // No native citations
        groundedSearch: true,     // web_search_preview tool
        vision: true,
        thinking: false,          // No extended thinking (o3-pro has it but different API)
        streaming: true,
    },

    async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const data = await callOpenAI({
            model: MODEL,
            messages: [
                { role: 'system', content: request.systemPrompt },
                { role: 'user', content: request.corpus
                    ? `${request.corpus}\n\n${request.userPrompt}`
                    : request.userPrompt
                },
            ],
            temperature: request.temperature ?? 0.3,
            max_completion_tokens: request.maxTokens || 8000,
        });

        return {
            content: extractChatText(data),
            provider: 'openai',
            model: data.model || MODEL,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async analyzeStructured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
        const start = Date.now();

        // Use Responses API with json_schema for guaranteed schema compliance
        const data = await callOpenAI({
            model: MODEL_HEAVY,
            input: [
                { role: 'system', content: [{ type: 'input_text', text: request.systemPrompt }] },
                { role: 'user', content: [{ type: 'input_text', text: request.corpus
                    ? `${request.corpus}\n\n${request.userPrompt}`
                    : request.userPrompt
                }] },
            ],
            text: {
                format: {
                    type: 'json_schema',
                    name: request.schemaName || 'research_output',
                    schema: request.schema,
                },
            },
        }, 'responses');

        const rawText = extractResponsesText(data);
        let parsed: T;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            const repaired = tryRepairJson(rawText);
            parsed = repaired ? JSON.parse(repaired) : {} as T;
        }

        return {
            content: rawText,
            provider: 'openai',
            model: data.model || MODEL_HEAVY,
            data: parsed,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async analyzeVision(request: AnalysisRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const content: any[] = [{ type: 'text', text: request.userPrompt }];
        for (const img of (request.images || [])) {
            content.push({
                type: 'image_url',
                image_url: { url: `data:${img.mediaType};base64,${img.data}`, detail: 'high' },
            });
        }

        const data = await callOpenAI({
            model: MODEL,
            messages: [
                { role: 'system', content: request.systemPrompt },
                { role: 'user', content },
            ],
            max_completion_tokens: request.maxTokens || 8000,
        });

        return {
            content: extractChatText(data),
            provider: 'openai',
            model: data.model || MODEL,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async groundedSearch(request: GroundedSearchRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const data = await callOpenAI({
            model: MODEL,
            tools: [{
                type: 'web_search_preview',
                search_context_size: request.mode === 'quick' ? 'low' : 'medium',
            }],
            input: request.query,
        }, 'responses');

        const citations = [];
        let content = '';
        for (const item of data.output || []) {
            if (item.type === 'message' && item.content) {
                for (const block of item.content) {
                    if (block.type === 'output_text') {
                        content += block.text;
                        for (const ann of block.annotations || []) {
                            if (ann.type === 'url_citation') {
                                citations.push({
                                    source_id: ann.url,
                                    source_type: 'web' as const,
                                    locator: { url: ann.url },
                                    quote: content.substring(ann.start_index, ann.end_index),
                                    claim_support: 'supports' as const,
                                    confidence: 'medium' as const,
                                });
                            }
                        }
                    }
                }
            }
        }

        return {
            content,
            provider: 'openai',
            model: data.model || MODEL,
            citations,
            usage: extractUsage(data),
            durationMs: Date.now() - start,
        };
    },

    async isAvailable(): Promise<boolean> {
        try {
            const resp = await fetch('http://localhost:5012/api/ai/status');
            const data = await resp.json();
            return !!data.openai;
        } catch { return false; }
    },
};
