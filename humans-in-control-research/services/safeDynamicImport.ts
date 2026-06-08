/**
 * safeDynamicImport - surface stale-chunk failures clearly, but NEVER
 * silently destroy the user's session.
 *
 * The problem: HiC ships as a static dist from nginx. Every Docker rebuild
 * produces a new index.html that references new content-hashed asset names
 * (e.g. `prototypeBuilder-CtOOpzJ2.js`). When a user has an old page open
 * during a rebuild, the OLD index bundle is still running in their tab -
 * but the old chunk it tries to dynamic-import no longer exists in the
 * container's /assets/ directory. The fetch 404s and the import promise
 * rejects with "Failed to fetch dynamically imported module: ...".
 *
 * 2026-05-12 - DESTRUCTIVE AUTO-RELOAD REMOVED. The previous version of this
 * helper auto-reloaded the page 1.5s after detecting a stale-chunk failure.
 * That "fix" was worse than the disease: it killed the user's in-flight
 * engagement (themes, personas, recommendations, chat history) every time
 * the bundle was rebuilt mid-session. User report (2026-05-12): "Using the
 * #proto to prototype recommendations simply reloads to the landing page
 * KILLING MY SESSION!!!"
 *
 * New behavior:
 *   1. Detect chunk-load errors specifically (vs. real runtime errors).
 *   2. Log a clear warning naming the chunk + the cause.
 *   3. Throw a HUMAN-READABLE error explaining what happened and what to
 *      do (Save Session → hard-refresh). No automatic reload - the caller's
 *      existing error UI shows the message; the user controls the recovery.
 *
 * Usage:
 *   const { buildPrototype } = await safeDynamicImport(
 *     () => import('./prototypeBuilder'),
 *     'prototypeBuilder'
 *   );
 *
 * The helper is wrapped around CALL SITES, not module declarations, so
 * the Vite static analyzer still sees the literal `import('./x')` and
 * code-splits the chunk correctly.
 */

const CHUNK_ERROR_PATTERNS = [
    /Failed to fetch dynamically imported module/i,
    /Loading chunk [^ ]+ failed/i,
    /ChunkLoadError/i,
    /error loading dynamically imported module/i,
    /Importing a module script failed/i,
];

function isChunkLoadError(err: unknown): boolean {
    const msg = err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);
    return CHUNK_ERROR_PATTERNS.some(p => p.test(msg));
}

/**
 * Wrap a dynamic import call. If the import fails due to a stale chunk hash,
 * throw a human-readable error so the caller's existing error UI renders a
 * recoverable message. NEVER auto-reload - the user's in-memory session is
 * irreplaceable and must not be destroyed without consent.
 */
export async function safeDynamicImport<T>(
    loader: () => Promise<T>,
    label: string,
): Promise<T> {
    try {
        return await loader();
    } catch (err) {
        if (isChunkLoadError(err)) {
            console.warn(
                `[safeDynamicImport] chunk load failure for "${label}" - ` +
                `the bundle was likely rebuilt while this page was open. ` +
                `NOT reloading automatically (would destroy in-memory session). ` +
                `User should click Save Session, then hard-refresh.`
            );
            throw new Error(
                `Stale page: this tab is running an older bundle and could not ` +
                `load "${label}" from the server. To recover without losing your work: ` +
                `click "Save Session" in the header, then hard-refresh (Ctrl+Shift+R) ` +
                `and reload from "Continue Session" on the landing page.`
            );
        }
        throw err;
    }
}

/**
 * Probe whether the currently-loaded index.html is still the latest one the
 * server is serving. Useful for proactively warning the user BEFORE they hit
 * a stale-chunk 404. Cheap (single HEAD request) and safe (no side effects).
 *
 * Returns:
 *   - true  → page is current (or check failed for an unrelated reason)
 *   - false → server's index.html has a different content-hash than what
 *             the browser has loaded; user should reload to avoid stale-chunk
 *             failures on next dynamic import
 */
export async function isPageCurrent(): Promise<boolean> {
    if (typeof window === 'undefined' || !document?.querySelector) return true;
    try {
        // Find the main bundle script in the live document
        const liveScript = document.querySelector('script[type="module"][src*="/assets/index-"]') as HTMLScriptElement | null;
        if (!liveScript?.src) return true;
        // HEAD-fetch the current index.html (nginx cache-control: no-store
        // means we always get fresh) and extract its main-bundle script src
        const indexResp = await fetch('/index.html', { cache: 'no-store' });
        if (!indexResp.ok) return true;
        const indexHtml = await indexResp.text();
        const m = indexHtml.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
        if (!m) return true;
        const liveSrc = liveScript.src.replace(/^.*\/assets\//, '/assets/');
        return liveSrc === m[0];
    } catch {
        return true;
    }
}
