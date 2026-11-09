// genaiClient.ts - 2026-10-30 (plan harness-capability-curve-uplift, WS-0 S1)
//
// The ONE constructor for the Google GenAI SDK in the browser. Every former
// `new GoogleGenAI({ apiKey: process.env.API_KEY })` now comes through here, so the SDK
// talks to the research proxy's passthrough (`/api/gemini-sdk/...`), which holds the real
// key, applies the outbound scrub, records cost, and enforces the proxy token. The
// browser never sees a provider key.
//
// The SDK builds URLs as `${baseUrl}/${apiVersion}/...` and sends the api key in the
// `x-goog-api-key` header; the proxy replaces that header with the real key.

import { GoogleGenAI } from '@google/genai';
import { proxyAuthHeaders, proxyBase } from './proxyConfig';

const PLACEHOLDER_KEY = 'routed-through-proxy';

export function geminiSdkBase(): string {
    return `${proxyBase()}/api/gemini-sdk`;
}

export function makeGenAI(): GoogleGenAI {
    return new GoogleGenAI({
        apiKey: PLACEHOLDER_KEY,
        httpOptions: {
            baseUrl: geminiSdkBase(),
            headers: proxyAuthHeaders(),
        },
    });
}

/** Rewrite an absolute generativelanguage URL (Veo/file download links returned by
 *  the API) so the download also rides the passthrough. The `key=` query the old code
 *  appended is gone; the proxy adds the header. */
export function viaGeminiProxy(url: string): string {
    const m = /^https:\/\/generativelanguage\.googleapis\.com\/(.*)$/.exec(url || '');
    if (!m) return url;
    return `${geminiSdkBase()}/${m[1]}`;
}
