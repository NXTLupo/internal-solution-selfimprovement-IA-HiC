/**
 * Gemini Provider Adapter
 * Wraps @google/genai SDK for the provider-agnostic interface.
 * Supports: structured output, grounded search, vision.
 */

import { GoogleGenAI, Type } from "@google/genai";
import type { ProviderAdapter, ProviderCapabilities, AnalysisRequest, AnalysisResponse, StructuredRequest, StructuredResponse, GroundedSearchRequest } from './ProviderAdapter';
import { tryRepairJson } from '../aiRouter';

const MODEL = 'gemini-3.5-flash';

function getClient(): GoogleGenAI {
    const apiKey = (process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenAI({ apiKey });
}

export const geminiAdapter: ProviderAdapter = {
    name: 'gemini',

    capabilities: {
        structuredOutput: true,
        citations: false,        // Gemini grounding provides source links but not inline citation spans
        groundedSearch: true,
        vision: true,
        thinking: true,          // Gemini 2.5 has thinking mode
        streaming: true,
    },

    async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const ai = getClient();
        const contents = request.corpus
            ? `${request.systemPrompt}\n\n${request.corpus}\n\n${request.userPrompt}`
            : `${request.systemPrompt}\n\n${request.userPrompt}`;

        const response = await ai.models.generateContent({
            model: MODEL,
            contents,
        });

        return {
            content: response.text || '',
            provider: 'gemini',
            model: MODEL,
            usage: response.usageMetadata ? {
                inputTokens: response.usageMetadata.promptTokenCount || 0,
                outputTokens: response.usageMetadata.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata.totalTokenCount || 0,
            } : undefined,
            durationMs: Date.now() - start,
        };
    },

    async analyzeStructured<T>(request: StructuredRequest<T>): Promise<StructuredResponse<T>> {
        const start = Date.now();
        const ai = getClient();
        const contents = request.corpus
            ? `${request.systemPrompt}\n\n${request.corpus}\n\n${request.userPrompt}`
            : `${request.systemPrompt}\n\n${request.userPrompt}`;

        const response = await ai.models.generateContent({
            model: MODEL,
            contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: request.schema,
            },
        });

        const text = response.text || '{}';
        let data: T;
        try {
            data = JSON.parse(text);
        } catch {
            const repaired = tryRepairJson(text);
            data = repaired ? JSON.parse(repaired) : {} as T;
        }

        return {
            content: text,
            provider: 'gemini',
            model: MODEL,
            data,
            usage: response.usageMetadata ? {
                inputTokens: response.usageMetadata.promptTokenCount || 0,
                outputTokens: response.usageMetadata.candidatesTokenCount || 0,
                totalTokens: response.usageMetadata.totalTokenCount || 0,
            } : undefined,
            durationMs: Date.now() - start,
        };
    },

    async analyzeVision(request: AnalysisRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const ai = getClient();
        const parts: any[] = [{ text: `${request.systemPrompt}\n\n${request.userPrompt}` }];

        for (const img of (request.images || [])) {
            parts.push({
                inlineData: { mimeType: img.mediaType, data: img.data },
            });
        }

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: [{ role: 'user', parts }],
        });

        return {
            content: response.text || '',
            provider: 'gemini',
            model: MODEL,
            durationMs: Date.now() - start,
        };
    },

    async groundedSearch(request: GroundedSearchRequest): Promise<AnalysisResponse> {
        const start = Date.now();
        const ai = getClient();

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: request.query,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const gm = response.candidates?.[0]?.groundingMetadata;
        const citations = (gm?.groundingChunks || [])
            .filter((c: any) => c.web)
            .map((c: any) => ({
                source_id: c.web.uri,
                source_type: 'web' as const,
                locator: { url: c.web.uri },
                quote: c.web.title || '',
                claim_support: 'supports' as const,
                confidence: 'medium' as const,
            }));

        return {
            content: response.text || '',
            provider: 'gemini',
            model: MODEL,
            citations,
            durationMs: Date.now() - start,
        };
    },

    async isAvailable(): Promise<boolean> {
        return !!((process.env as any).GEMINI_API_KEY || (process.env as any).API_KEY);
    },
};
