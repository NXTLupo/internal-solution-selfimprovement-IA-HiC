/**
 * chunkLoadGuard - global handler that recovers from stale-bundle chunk-load
 * failures across EVERY dynamic import in the app, with no per-callsite
 * changes required.
 *
 * The problem: HiC ships as a static dist served by nginx. Every Docker
 * rebuild produces a new index.html that references new content-hashed
 * asset names. When a user has an old page open during a rebuild, their
 * tab's main bundle still references the OLD chunk names. The moment any
 * code path triggers `await import('./x')` for a chunk that no longer
 * exists in /assets/, the browser fetches a 404 and the import rejects
 * with "Failed to fetch dynamically imported module: ...". HiC has 85+
 * dynamic-import call sites across App.tsx, CorpusChatPanel.tsx,
 * geminiService.ts, corpusChatService.ts, and every export pipeline -
 * which means any of them can surface a confusing chunk-load error if
 * the user is on a stale tab.
 *
 * This guard installs THREE listeners at app boot that together catch
 * every variation of chunk-load failure, regardless of whether the
 * awaiter has a try/catch in place:
 *
 *   1. `vite:preloadError` - Vite emits this when a `<link rel="modulepreload">`
 *      fails. Fires BEFORE the import() rejects, so we can react before
 *      the user-facing catch handler runs.
 *
 *   2. `unhandledrejection` - catches dynamic imports whose rejection
 *      escapes any try/catch (uncaught promise paths).
 *
 *   3. `error` (window) - catches `<script>` element load errors as a
 *      last-resort net for non-module asset failures.
 *
 * When any listener fires AND the error matches a chunk-load pattern, the
 * guard renders a persistent, dismissible banner that warns the user and
 * offers Reload / Dismiss buttons. The guard NEVER auto-reloads - that
 * would destroy the user's in-memory engagement (themes, personas, chat).
 * The user must click Reload (after saving), or Dismiss to keep working
 * (subsequent chunk loads may still fail until they reload manually).
 *
 * Multiple concurrent failures (e.g. 5 prototype-pipeline stages all
 * dynamic-importing at once on a stale tab) coalesce into a single banner
 * via the `bannerShown` guard.
 */

const CHUNK_ERROR_PATTERNS = [
    /Failed to fetch dynamically imported module/i,
    /Loading chunk [^ ]+ failed/i,
    /ChunkLoadError/i,
    /error loading dynamically imported module/i,
    /Importing a module script failed/i,
    // Vite preload-link failure messages
    /Unable to preload CSS for [^ ]+\.css/i,
    /assets\/[A-Za-z0-9_-]+\.(js|mjs|css)/i,  // any /assets/ URL appearing in an error message
];

function looksLikeChunkLoadError(input: unknown): boolean {
    if (!input) return false;
    let msg: string;
    if (input instanceof Error) msg = `${input.name}: ${input.message}`;
    else if (typeof input === 'string') msg = input;
    else {
        try { msg = JSON.stringify(input); } catch { msg = String(input); }
    }
    // The `/assets/` pattern is a catch-all that could match false positives,
    // so require it to ALSO mention a load-failure-related verb.
    const hasAssetsUrl = /\/assets\/[A-Za-z0-9_-]+\.(js|mjs|css)/i.test(msg);
    const hasLoadVerb = /(failed|error|fetch|load|preload|404|not found)/i.test(msg);
    if (hasAssetsUrl && hasLoadVerb) return true;
    return CHUNK_ERROR_PATTERNS.slice(0, 5).some(p => p.test(msg));
}

let bannerShown = false;
let installedAt: number | null = null;

/**
 * 2026-05-12 - AUTO-RELOAD REMOVED.
 *
 * The previous version of this guard auto-reloaded the page 1.5s after any
 * chunk-load failure. That was destroying users' in-flight engagements
 * (themes, personas, recommendations, chat history) every time the bundle
 * was rebuilt mid-session. User report: "Using the #proto to prototype
 * recommendations simply reloads to the landing page KILLING MY SESSION!!!"
 *
 * New behavior: render a persistent, dismissible banner with action buttons
 * that let the user CHOOSE when to reload (after saving their session). The
 * banner stays on screen until dismissed or until the user clicks Reload.
 * The user's in-memory state is never destroyed without consent.
 */
function showStaleBundleBanner(source: string, detail?: unknown): void {
    if (bannerShown) {
        console.warn(`[ChunkLoadGuard] additional ${source} suppressed - banner already shown`);
        return;
    }
    bannerShown = true;
    console.warn(
        `[ChunkLoadGuard] stale chunk detected via ${source}. ` +
        `Banner shown - NOT auto-reloading (would destroy in-memory session). ` +
        `User must Save Session, then click Reload in the banner.`,
        detail ?? '',
    );
    try {
        if (typeof document === 'undefined' || !document.body) return;
        if (document.getElementById('hic-chunk-reload-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'hic-chunk-reload-banner';
        banner.setAttribute('role', 'alert');
        banner.setAttribute('aria-live', 'assertive');
        banner.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0',
            'background:#0D0D0D', 'color:#F5F5F0',
            'font-family:Archivo, system-ui, sans-serif',
            'font-size:13px', 'font-weight:500',
            'padding:12px 20px',
            'display:flex', 'flex-wrap:wrap', 'align-items:center', 'gap:14px',
            'z-index:2147483647',
            'border-bottom:2px solid #B8B800',
            'box-shadow:0 4px 16px rgba(0,0,0,0.25)',
        ].join(';');

        const msg = document.createElement('div');
        msg.style.cssText = 'flex:1; min-width:240px;';
        msg.innerHTML =
            '<div style="font-weight:700; color:#B8B800; letter-spacing:1.5px; ' +
            'font-size:10px; text-transform:uppercase; margin-bottom:2px;">' +
            'Stale Page Detected</div>' +
            '<div>The HiC bundle was updated while this page was open. ' +
            '<strong>Save your session first</strong> (header → Save Session), ' +
            'then click Reload to pick up the new build. Your in-memory work ' +
            'will be lost on reload if not saved.</div>';
        banner.appendChild(msg);

        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = 'Reload Now';
        reloadBtn.style.cssText = [
            'padding:8px 18px', 'background:#B8B800', 'color:#0D0D0D',
            'border:none', 'cursor:pointer',
            'font-family:inherit', 'font-size:11px', 'font-weight:700',
            'letter-spacing:1.5px', 'text-transform:uppercase',
        ].join(';');
        reloadBtn.onclick = async () => {
            // 2026-05-14 - Save the user's session BEFORE reloading so a stale-
            // chunk forced reload doesn't destroy mid-flight work. App.tsx
            // registers __hicSaveSession on mount; we call it (silently) and
            // wait up to 4s before reloading anyway. The user can resume from
            // the Continue Session list on the landing page after reload.
            try {
                reloadBtn.disabled = true;
                reloadBtn.textContent = 'Saving your work...';
                const saver = (window as any).__hicSaveSession;
                if (typeof saver === 'function') {
                    await Promise.race([
                        saver({ silent: true }),
                        new Promise(res => setTimeout(res, 4000)),
                    ]);
                    reloadBtn.textContent = 'Reloading...';
                }
            } catch (e) {
                console.warn('[ChunkLoadGuard] pre-reload save failed (reloading anyway):', e);
            }
            if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
                window.location.reload();
            }
        };
        banner.appendChild(reloadBtn);

        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.style.cssText = [
            'padding:8px 14px', 'background:transparent', 'color:#F5F5F0',
            'border:1px solid #525252', 'cursor:pointer',
            'font-family:inherit', 'font-size:11px', 'font-weight:600',
            'letter-spacing:1px', 'text-transform:uppercase',
        ].join(';');
        dismissBtn.onclick = () => { banner.remove(); };
        banner.appendChild(dismissBtn);

        document.body.appendChild(banner);
    } catch { /* DOM unavailable; user error in caller will still surface */ }
}

/**
 * Install all three chunk-load listeners. Idempotent - safe to call
 * multiple times (subsequent calls are no-ops).
 */
export function installChunkLoadGuard(): void {
    if (typeof window === 'undefined') return;
    if (installedAt !== null) return;  // already installed
    installedAt = Date.now();

    // 1. Vite emits this event when a modulepreload <link> 404s. Fires
    //    BEFORE the corresponding import() rejects, so the reload kicks
    //    in before downstream catch handlers see the error.
    window.addEventListener('vite:preloadError', (event: Event) => {
        const detail = (event as any).payload || (event as any).detail || event;
        showStaleBundleBanner('vite:preloadError', detail);
        // 2026-05-15 - MUST preventDefault. Vite's DEFAULT behavior on
        // `vite:preloadError` is to HARD-RELOAD THE PAGE, which dumps the
        // user back to the landing screen and destroys their in-memory
        // session (chat history, brief drafts, design-desk state).
        // The previous comment said "let Vite's normal flow continue too"
        // - that was exactly wrong: Vite's normal flow IS the destructive
        // reload. Symptom: typing #proto on a tab held open across a
        // Docker rebuild silently redirected to the landing page with NO
        // error message because Vite reloaded out from under the React
        // tree. preventDefault() suppresses the auto-reload; the user
        // sees the banner instead and can Save Session → Reload by hand.
        event.preventDefault();
    });

    // 2. Catches dynamic-import rejections that escape any try/catch and
    //    propagate to the global scope. This is the safety net for code
    //    paths that don't wrap their import() in try/catch.
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        if (looksLikeChunkLoadError(event.reason)) {
            event.preventDefault();
            showStaleBundleBanner('unhandledrejection', event.reason);
        }
    });

    // 3. Catches <script> element load errors. Some asset failures surface
    //    here rather than as promise rejections.
    window.addEventListener('error', (event: ErrorEvent) => {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
            const src = (target as any).src || (target as any).href || '';
            if (typeof src === 'string' && /\/assets\/[A-Za-z0-9_-]+\.(js|mjs|css)/i.test(src)) {
                showStaleBundleBanner('script/link onerror', src);
                event.preventDefault();
            }
            return;
        }
        if (looksLikeChunkLoadError(event.message) || looksLikeChunkLoadError(event.error)) {
            showStaleBundleBanner('window.onerror', event.message || event.error);
            event.preventDefault();
        }
    }, true /* capture phase so we see asset onerror before bubbling */);

    console.log('[ChunkLoadGuard] installed - global protection for ~85 dynamic-import sites against stale-bundle 404s');
}

/** Exposed for testing. Returns true if the input matches a chunk-load error pattern. */
export function _isChunkLoadError(input: unknown): boolean {
    return looksLikeChunkLoadError(input);
}
