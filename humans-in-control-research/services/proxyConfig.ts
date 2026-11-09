// proxyConfig.ts - 2026-10-30 (plan harness-capability-curve-uplift, WS-0 S1/S2)
//
// ONE place the SPA learns where the research proxy is and how to authenticate to it.
//
// Before this file the provider API keys were compiled INTO the browser bundle
// (vite.config.ts `define`) and the browser called Gemini directly, so anyone who could
// load the SPA held the keys and every proxy control (scrub, cache, cost meter, auth)
// was bypassed. Now:
//   - the bundle carries no provider key; every AI call goes through the proxy;
//   - the proxy requires a shared token (`PROXY_AUTH_TOKEN`), served to the SPA at
//     runtime from the same origin as `/config.json` (nginx writes it from env at
//     container start; the Vite dev server serves it from the environment). The token
//     is runtime configuration, never a build-time constant;
//   - a single fetch interceptor adds the token to every request aimed at the proxy, so
//     the ~60 modules that hardcode `http://127.0.0.1:5012` need no change and no new
//     call site can forget the header.

export interface ProxyConfig {
    proxyBase: string;
    token: string;
}

const DEFAULT_PROXY_BASE = 'http://127.0.0.1:5012';

let _config: ProxyConfig = { proxyBase: DEFAULT_PROXY_BASE, token: '' };
let _installed = false;
let _bootPromise: Promise<ProxyConfig> | null = null;
let _booted = false;

/** The proxy origin every module should use. Readable synchronously after boot. */
export function proxyBase(): string {
    return _config.proxyBase;
}

export function proxyToken(): string {
    return _config.token;
}

/** Headers to add by hand where a request cannot go through `fetch` (SDK clients). */
export function proxyAuthHeaders(): Record<string, string> {
    return _config.token ? { 'x-proxy-token': _config.token } : {};
}

/**
 * 2026-11-08 (live defect: every artifact LAUNCH window showed {"error":"unauthorized"}).
 * A BROWSER NAVIGATION (window.open on a /view reader, an <audio>/<video> src) cannot carry
 * the auth header the fetch interceptor adds, so launches broke the day auth went on by
 * default. The proxy accepts the SAME shared token as a `t` query parameter on GETs; this
 * helper appends it. Use it for every URL handed to the BROWSER to navigate or stream;
 * plain fetch() calls keep the header path and never need it.
 */
export function tokenizedProxyUrl(url: string): string {
    if (!url || !_config.token || !isProxyUrl(url)) return url;
    if (/[?&]t=/.test(url)) return url;
    return `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(_config.token)}`;
}

function isProxyUrl(url: string): boolean {
    if (!url) return false;
    if (url.startsWith('/api/')) return true;
    const bases = new Set<string>([
        _config.proxyBase,
        DEFAULT_PROXY_BASE,
        'http://localhost:5012',
        (typeof window !== 'undefined' && (window as any).__hicProxyBase) || '',
    ]);
    for (const b of bases) {
        if (b && url.startsWith(b)) return true;
    }
    return false;
}

// WS-1 T3 (2026-10-30): every proxy-bound request also names the run and message it belongs to,
// so traces, AIR records, receipts and the usage ledger share one join key. The provider is
// registered by services/runState.ts (late-bound to avoid an import cycle).
export interface RequestContext { runId?: string; messageId?: string }
let _requestContext: (() => RequestContext) | null = null;
export function setRequestContextProvider(fn: (() => RequestContext) | null): void {
    _requestContext = fn;
}

function requestUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return (input as Request).url || '';
}

/** Install the fetch interceptor once. Idempotent. Exported for tests. */
export function installProxyAuthFetch(fetchImpl: typeof fetch = globalThis.fetch): void {
    if (_installed || typeof globalThis === 'undefined') return;
    _installed = true;
    const original = fetchImpl.bind(globalThis);
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
            if (isProxyUrl(requestUrl(input))) {
                // 2026-10-31 (live UI test hardening): the SPA mounts and may restore its session before
                // /config.json has answered; a proxy request issued in that window would leave without the
                // token. A proxy-bound request waits for the boot instead.
                if (!_booted && _bootPromise) { try { await _bootPromise; } catch { /* boot never throws */ } }
                const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
                if (_config.token && !headers.has('x-proxy-token')) headers.set('x-proxy-token', _config.token);
                const ctx = _requestContext ? _requestContext() : null;
                if (ctx?.runId && !headers.has('x-hic-run-id')) headers.set('x-hic-run-id', ctx.runId);
                if (ctx?.messageId && !headers.has('x-hic-message-id')) headers.set('x-hic-message-id', ctx.messageId);
                return original(input, { ...init, headers });
            }
        } catch {
            // never let the interceptor break a request; fall through to the original
        }
        return original(input, init);
    }) as typeof fetch;
}

/** Load `/config.json` from the SPA origin and install the interceptor. Safe to call
 *  more than once; later callers share the first promise. Never throws: without a
 *  config file the SPA keeps the default base and an empty token (the proxy then
 *  answers 401 on protected routes, which the UI surfaces instead of hiding). */
export function bootProxyConfig(fetchImpl: typeof fetch = globalThis.fetch): Promise<ProxyConfig> {
    if (_bootPromise) return _bootPromise;
    // The interceptor goes in FIRST so a request raced against the config load waits for the token
    // instead of leaving without it; `original` inside it is the fetch passed here, so the config
    // request itself is never intercepted.
    installProxyAuthFetch(fetchImpl);
    _bootPromise = (async () => {
        try {
            const resp = await fetchImpl('/config.json', { cache: 'no-store' });
            if (resp.ok) {
                const json = await resp.json().catch(() => ({}));
                const base = typeof json?.proxyBase === 'string' && json.proxyBase.trim() ? json.proxyBase.trim().replace(/\/+$/, '') : DEFAULT_PROXY_BASE;
                const token = typeof json?.proxyToken === 'string' ? json.proxyToken.trim() : '';
                _config = { proxyBase: base, token };
                if (typeof window !== 'undefined') (window as any).__hicProxyBase = base;
            } else {
                console.warn(`[proxyConfig] /config.json ${resp.status}; using defaults (proxy auth will refuse protected routes)`);
            }
        } catch (e: any) {
            console.warn('[proxyConfig] /config.json unavailable:', e?.message || e);
        }
        _booted = true;
        return _config;
    })();
    return _bootPromise;
}

/** Test seam: reset module state. */
export function _resetProxyConfigForTests(): void {
    _config = { proxyBase: DEFAULT_PROXY_BASE, token: '' };
    _installed = false;
    _bootPromise = null;
    _booted = false;
}

// ---------------------------------------------------------------------------------
// Provider availability. The SPA used to test `process.env.<PROVIDER>_API_KEY`, which
// only worked because the keys were in the bundle. The proxy already answers
// `/api/ai/status` with booleans; this caches that answer for synchronous readers.

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

let _providers: Record<ProviderId, boolean> = { anthropic: true, openai: true, gemini: true };
let _providersLoaded = false;

export async function loadProviderStatus(fetchImpl: typeof fetch = globalThis.fetch): Promise<Record<ProviderId, boolean>> {
    try {
        const resp = await fetchImpl(`${proxyBase()}/api/ai/status`, { cache: 'no-store' });
        if (resp.ok) {
            const j = await resp.json();
            _providers = { anthropic: !!j.anthropic, openai: !!j.openai, gemini: !!j.gemini };
            _providersLoaded = true;
        }
    } catch (e: any) {
        console.warn('[proxyConfig] /api/ai/status unavailable:', e?.message || e);
    }
    return _providers;
}

/** Synchronous read. Optimistic (true) until the status call lands, so the model
 *  picker never hides a provider because the status request is still in flight. */
export function providerAvailable(p: ProviderId): boolean {
    return _providers[p];
}

export function providerStatusLoaded(): boolean {
    return _providersLoaded;
}
