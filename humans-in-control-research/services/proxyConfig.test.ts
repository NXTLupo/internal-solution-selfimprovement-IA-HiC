// proxyConfig.test.ts - WS-0 S1/S2 (2026-10-30)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    bootProxyConfig, installProxyAuthFetch, proxyAuthHeaders, proxyBase, proxyToken,
    providerAvailable, loadProviderStatus, _resetProxyConfigForTests,
} from './proxyConfig';
import { makeGenAI, viaGeminiProxy, geminiSdkBase } from './genaiClient';

const realFetch = globalThis.fetch;

function fakeFetch(routes: Record<string, any>, seen: Array<{ url: string; headers: Headers }>): typeof fetch {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
        seen.push({ url, headers: new Headers(init?.headers) });
        const key = Object.keys(routes).find(k => url.endsWith(k));
        if (!key) return new Response('not found', { status: 404 });
        return new Response(JSON.stringify(routes[key]), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
}

describe('proxyConfig (WS-0 S1/S2)', () => {
    beforeEach(() => _resetProxyConfigForTests());
    afterEach(() => { globalThis.fetch = realFetch; _resetProxyConfigForTests(); });

    it('reads /config.json and installs an interceptor that adds the token to proxy requests only', async () => {
        const seen: Array<{ url: string; headers: Headers }> = [];
        const ff = fakeFetch({ '/config.json': { proxyBase: 'http://proxy.test:5012', proxyToken: 'tok-123' }, '/api/jobs': { running: [] }, '/other': {} }, seen);
        globalThis.fetch = ff;
        const cfg = await bootProxyConfig(ff);
        expect(cfg.proxyBase).toBe('http://proxy.test:5012');
        expect(proxyToken()).toBe('tok-123');
        expect(proxyAuthHeaders()).toEqual({ 'x-proxy-token': 'tok-123' });

        await globalThis.fetch('http://proxy.test:5012/api/jobs');
        await globalThis.fetch('http://127.0.0.1:5012/api/jobs');
        await globalThis.fetch('/api/jobs');
        await globalThis.fetch('https://example.com/other');
        const byUrl = Object.fromEntries(seen.slice(1).map(s => [s.url, s.headers.get('x-proxy-token')]));
        expect(byUrl['http://proxy.test:5012/api/jobs']).toBe('tok-123');
        expect(byUrl['http://127.0.0.1:5012/api/jobs']).toBe('tok-123');
        expect(byUrl['/api/jobs']).toBe('tok-123');
        expect(byUrl['https://example.com/other']).toBeNull();
    });

    it('a proxy request raced against the config load waits for the token (2026-10-31 live UI test)', async () => {
        const seen: Array<{ url: string; headers: Headers }> = [];
        let releaseConfig: (() => void) | null = null;
        const slow = (async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
            if (url.endsWith('/config.json')) {
                await new Promise<void>(r => { releaseConfig = r; });
                return new Response(JSON.stringify({ proxyToken: 'late-token' }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            seen.push({ url, headers: new Headers(init?.headers) });
            return new Response('{}', { status: 200 });
        }) as typeof fetch;
        globalThis.fetch = slow;
        const boot = bootProxyConfig(slow);
        // issued BEFORE the config answers: the old code sent it raw (no token)
        const inflight = globalThis.fetch('http://127.0.0.1:5012/api/eval/verdicts', { method: 'POST', body: '{}' });
        expect(seen.length).toBe(0);
        releaseConfig!();
        await boot;
        await inflight;
        expect(seen[0].headers.get('x-proxy-token')).toBe('late-token');
    });

    it('keeps defaults and never throws when /config.json is missing', async () => {
        const seen: Array<{ url: string; headers: Headers }> = [];
        const ff = fakeFetch({}, seen);
        const cfg = await bootProxyConfig(ff);
        expect(cfg.proxyBase).toBe('http://127.0.0.1:5012');
        expect(cfg.token).toBe('');
        expect(proxyAuthHeaders()).toEqual({});
    });

    it('installs the interceptor once and does not re-add an existing header', async () => {
        const seen: Array<{ url: string; headers: Headers }> = [];
        globalThis.fetch = fakeFetch({ '/config.json': { proxyToken: 'a' }, '/api/x': {} }, seen);
        await bootProxyConfig();
        installProxyAuthFetch();
        installProxyAuthFetch();
        await globalThis.fetch('/api/x', { headers: { 'x-proxy-token': 'explicit' } });
        expect(seen[seen.length - 1].headers.get('x-proxy-token')).toBe('explicit');
    });

    it('provider availability is optimistic until /api/ai/status answers, then follows it', async () => {
        expect(providerAvailable('anthropic')).toBe(true);
        const seen: Array<{ url: string; headers: Headers }> = [];
        const status = await loadProviderStatus(fakeFetch({ '/api/ai/status': { anthropic: false, openai: true, gemini: true } }, seen));
        expect(status.anthropic).toBe(false);
        expect(providerAvailable('anthropic')).toBe(false);
        expect(providerAvailable('gemini')).toBe(true);
    });
});

describe('genaiClient (WS-0 S1)', () => {
    beforeEach(() => _resetProxyConfigForTests());
    afterEach(() => { globalThis.fetch = realFetch; _resetProxyConfigForTests(); });

    it('builds the SDK against the proxy passthrough, never with a real key', async () => {
        await bootProxyConfig(fakeFetch({ '/config.json': { proxyBase: 'http://proxy.test:5012', proxyToken: 't' } }, []));
        expect(geminiSdkBase()).toBe('http://proxy.test:5012/api/gemini-sdk');
        const ai = makeGenAI();
        expect(ai).toBeTruthy();
        expect(proxyBase()).toBe('http://proxy.test:5012');
    });

    it('rewrites generativelanguage download links onto the passthrough and leaves others alone', async () => {
        await bootProxyConfig(fakeFetch({ '/config.json': { proxyBase: 'http://proxy.test:5012' } }, []));
        expect(viaGeminiProxy('https://generativelanguage.googleapis.com/v1beta/files/abc:download?alt=media'))
            .toBe('http://proxy.test:5012/api/gemini-sdk/v1beta/files/abc:download?alt=media');
        expect(viaGeminiProxy('https://example.com/x')).toBe('https://example.com/x');
    });
});
