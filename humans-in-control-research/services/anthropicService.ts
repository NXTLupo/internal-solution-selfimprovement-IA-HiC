/**
 * Anthropic Claude API Service
 * Direct fetch() calls to api.anthropic.com/v1/messages
 * Primary use: Claude Opus 4.6 for deep research analysis and vision-based UX heuristic analysis
 */

import { tryRepairJson } from './aiRouter';

// --- TYPES ---
interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: AnthropicContent[];
}

type AnthropicContent =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

interface AnthropicRequest {
    model: string;
    max_tokens: number;
    system?: string;
    messages: AnthropicMessage[];
    temperature?: number;
}

interface AnthropicResponse {
    id: string;
    type: string;
    role: string;
    content: { type: string; text?: string }[];
    model: string;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
}

// --- CONSTANTS ---
// Route through local proxy to bypass CORS (keys stay server-side)
const PROXY_URL = 'http://localhost:5012/api/ai/anthropic';
const DIRECT_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

function getApiUrl(): string {
    // In browser: use proxy. In Node/server: use direct.
    return typeof window !== 'undefined' ? PROXY_URL : DIRECT_URL;
}

function getApiKey(): string {
    const key = (process.env as any).ANTHROPIC_API_KEY;
    return key || '';  // Proxy adds key server-side, so empty is OK from browser
}

// --- RETRY LOGIC ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    baseDelay = 2000,
    operationName = 'Anthropic API Call'
): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const status = error.status || error.code;
            const isTransient = status === 429 || status === 503 || status === 500 ||
                error.message?.includes('overloaded') || error.message?.includes('rate');
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
async function callAnthropic(request: AnthropicRequest): Promise<AnthropicResponse> {
    const url = getApiUrl();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    // Only add auth headers when calling direct API (not proxy)
    if (url === DIRECT_URL) {
        headers['x-api-key'] = getApiKey();
        headers['anthropic-version'] = API_VERSION;
    }
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        const error: any = new Error(`Anthropic API error ${response.status}: ${errorBody}`);
        error.status = response.status;
        throw error;
    }

    return response.json();
}

// --- PUBLIC API ---

/**
 * Send a text-only message to Claude and get a text response.
 * Returns raw text (not parsed JSON).
 */
export async function analyzeText(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'claude-opus-4-6',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<string> {
    const result = await withRetry(() => callAnthropic({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        temperature,
        messages: [{
            role: 'user',
            content: [{ type: 'text', text: userPrompt }]
        }]
    }), 3, 2000, `Claude ${model} text analysis`);

    const textBlock = result.content.find(b => b.type === 'text');
    return textBlock?.text || '';
}

/**
 * Send a text message and parse the response as JSON.
 * Uses tryRepairJson for robustness.
 */
export async function analyzeTextJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    model: string = 'claude-opus-4-6',
    maxTokens: number = 16000,
    temperature: number = 0.1
): Promise<T> {
    const raw = await analyzeText(systemPrompt, userPrompt, model, maxTokens, temperature);

    // Strip markdown fences
    let cleaned = raw.trim();
    if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }

    try {
        return JSON.parse(cleaned);
    } catch {
        return JSON.parse(tryRepairJson(cleaned));
    }
}

/**
 * Send images + text to Claude for vision analysis.
 * Used for UX heuristic evaluation of screenshots.
 */
export async function analyzeVision<T>(
    systemPrompt: string,
    userPrompt: string,
    images: { base64: string; mimeType: string }[],
    model: string = 'claude-opus-4-6',
    maxTokens: number = 32000,
    temperature: number = 0.1
): Promise<T> {
    const content: AnthropicContent[] = [];

    // Add images first
    for (let i = 0; i < images.length; i++) {
        content.push({
            type: 'image',
            source: {
                type: 'base64',
                media_type: images[i].mimeType,
                data: images[i].base64,
            }
        });
        content.push({
            type: 'text',
            text: `[Screenshot ${i + 1} of ${images.length}]`
        });
    }

    // Add the analysis prompt
    content.push({ type: 'text', text: userPrompt });

    const result = await withRetry(() => callAnthropic({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        temperature,
        messages: [{ role: 'user', content }]
    }), 3, 3000, `Claude ${model} vision analysis`);

    const textBlock = result.content.find(b => b.type === 'text');
    const raw = textBlock?.text || '{}';

    let cleaned = raw.trim();
    if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
        cleaned = cleaned.split('```')[1].split('```')[0].trim();
    }

    try {
        return JSON.parse(cleaned);
    } catch {
        return JSON.parse(tryRepairJson(cleaned));
    }
}

/**
 * Check if the Anthropic API key is valid by making a minimal request.
 */
export async function checkApiKey(): Promise<boolean> {
    try {
        await callAnthropic({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: [{ type: 'text', text: 'ping' }] }]
        });
        return true;
    } catch {
        return false;
    }
}
