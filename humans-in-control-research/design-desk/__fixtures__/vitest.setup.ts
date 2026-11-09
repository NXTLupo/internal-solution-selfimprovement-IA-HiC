import '@testing-library/jest-dom';

// 2026-10-31 (live UI test): unit tests that exercise the chain, the deck loop and the judge registry
// called `recordJudgeVerdict`, whose fire-and-forget POST went to the LIVE proxy at 127.0.0.1:5012
// from jsdom, without a token: every `npx vitest run` produced a burst of 401s on /api/eval/verdicts in
// the proxy log and the full suite produced hundreds. Unit tests never reach the network; any
// proxy-bound request that a test did not stub fails the way a stopped proxy would. E2E tests
// (`npm run test:e2e`) do not load this setup file.
const _realFetch = globalThis.fetch;
const _PROXY_RE = /^(?:https?:\/\/(?:127\.0\.0\.1|localhost|research-proxy)(?::\d+)?)?\/api\//;
if (typeof _realFetch === 'function') {
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url || '';
        if (_PROXY_RE.test(url)) {
            return Promise.reject(new TypeError(`fetch to the proxy is disabled in unit tests (${url.slice(0, 80)}); stub it in the test`));
        }
        return _realFetch(input as any, init);
    }) as typeof fetch;
}
