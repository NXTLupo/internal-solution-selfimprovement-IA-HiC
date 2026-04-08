/**
 * OpenAI GPT-5.4 API Service
 * Direct fetch() calls to api.openai.com/v1/chat/completions
 * Primary use: GPT-5.4 Mini for fast structured generation (PRDs, roadmaps, gap analysis)
 */

import { tryRepairJson } from './aiRouter';

// --- TYPES ---
interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | OpenAIContentPart[];
}

type OpenAIContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

interface OpenAIRequest {
    model: string;
    messages: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' | 'text' };
}

interface OpenAIResponse {
    id: string;
    choices: {
        index: number;
        message: { role: string; content: string };
        finish_reason: string;
    }[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// --- CONSTANTS ---
// Route through local proxy to bypass CORS (keys stay server-side)
const PROXY_URL = 'http://localhost:5012/api/ai/openai';
const DIRECT_URL = 'https://api.openai.com/v1/chat/completions';

function getApiUrl(): string {
    return typeof window !== 'undefined' ? PROXY_URL : DIRECT_URL;
}

function getApiKey(): string {
    const key = (process.env as any).OPENAI_API_KEY;
    return key || '';  // Proxy adds key server-side
}

// --- RETRY LOGIC ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    baseDelay = 2000,
    operationName = 'OpenAI API Call'
): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const status = error.status || error.code;
            const isTransient = status === 429 || status === 503 || status === 500 ||
                error.message?.includes('rate_limit') || error.message?.includes('overloaded');
            if (isTransient && i < retries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                console.warn(`${operationName} failed (${status}). Retrying in ${delay}ms... (${i + 1}/${retries})`);
                await wait(delay);
                continue;
            }
            break;
        }
    }
    throw lastError;
}

// --- CORE API CALL ---
async function callOpenAI(request: OpenAIRequest): Promise<OpenAIResponse> {
    const url = getApiUrl();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (url === DIRECT_URL) {
        headers['Authorization'] = `Bearer ${getApiKey()}`;
    } else {
        headers['x-openai-endpoint'] = 'chat';  // Tell proxy to use chat completions
    }
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        const error: any = new Error(`OpenAI API error ${response.status}: ${errorBody}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

// --- PUBLIC API ---

/**
 * Send a text prompt and get a text response.
 */
export async function analyzeText(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'gpt-5.4-mini',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<string> {
    const result = await withRetry(() => callOpenAI({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]
    }), 3, 2000, `GPT ${model} text analysis`);

    return result.choices[0]?.message?.content || '';
}

/**
 * Send a text prompt and parse the response as JSON.
 * Uses OpenAI's native JSON mode for structural reliability.
 */
export async function analyzeTextJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'gpt-5.4-mini',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<T> {
    const result = await withRetry(() => callOpenAI({
        model,
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemPrompt + '\n\nYou MUST respond with valid JSON only.' },
            { role: 'user', content: userPrompt }
        ]
    }), 3, 2000, `GPT ${model} JSON analysis`);

    const raw = result.choices[0]?.message?.content || '{}';
    try {
        return JSON.parse(raw);
    } catch {
        return JSON.parse(tryRepairJson(raw));
    }
}

/**
 * Send images + text to GPT-5.4 for vision analysis.
 * Fallback for UX heuristic analysis if Claude is unavailable.
 */
export async function analyzeVision<T>(
    systemPrompt: string,
    userPrompt: string,
    images: { base64: string; mimeType: string }[],
    model: string = 'gpt-5.4',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<T> {
    const content: OpenAIContentPart[] = [];

    for (let i = 0; i < images.length; i++) {
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:${images[i].mimeType};base64,${images[i].base64}`,
                detail: 'high'
            }
        });
        content.push({ type: 'text', text: `[Screenshot ${i + 1} of ${images.length}]` });
    }
    content.push({ type: 'text', text: userPrompt });

    const result = await withRetry(() => callOpenAI({
        model,
        max_tokens: maxTokens,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: systemPrompt + '\n\nYou MUST respond with valid JSON only.' },
            { role: 'user', content }
        ]
    }), 3, 3000, `GPT ${model} vision analysis`);

    const raw = result.choices[0]?.message?.content || '{}';
    try {
        return JSON.parse(raw);
    } catch {
        return JSON.parse(tryRepairJson(raw));
    }
}

/**
 * Check if the OpenAI API key is valid.
 */
export async function checkApiKey(): Promise<boolean> {
    try {
        await callOpenAI({
            model: 'gpt-5.4-mini',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }]
        });
        return true;
    } catch {
        return false;
    }
}
