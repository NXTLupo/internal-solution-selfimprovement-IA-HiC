import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ================================================================
// BUNDLE VERSION BANNER — Phase 1-retrofit (v3.1, 2026-04-20/21)
// ----------------------------------------------------------------
// Prints a visible identifier to the console at app startup so we
// can tell instantly whether the running bundle includes the v3.1
// wiki-as-RAG architecture. If you don't see this line in DevTools,
// you're on the pre-v3.1 bundle — rebuild the Vite container.
// ================================================================
const HIC_BUNDLE_VERSION = 'v3.1';
const HIC_BUILD_STAMP = '2026-04-21';
// Feature flags — these MUST all read `true` on v3.1. If any read
// `false` (or the banner doesn't print at all), the bundle is stale.
const HIC_FEATURES = {
    videoTranscriberConnector: true,                  // Video Transcriber wire-fix
    enrichmentCap300: true,                           // ENRICHMENT_TOP_N raised 80 → 300
    residualWikiArchival: true,                       // archive items that skipped enrichment
    enrichMapCollisionFix: true,                      // Map keyed by item reference (2026-04-21)
    wikiIndexEndpoint: true,                          // GET /api/wiki/index
    wikiFetchArticlesEndpoint: true,                  // POST /api/wiki/fetch-articles
    chatWikiPreFetch: true,                           // per-turn topic-matched article bodies
    claudeNativeToolUse: true,                        // fetch_wiki_articles tool loop
    slideQuoteBackfill: true,                         // title→body-sentence swap after parse
    wikiArticleViewer: true,                          // ⌘ READ ARCHIVED overlay
    titleAsQuoteBan: true,                            // prompt directive + heuristic detector
};
console.log(
    `%c[NXT HiC] ${HIC_BUNDLE_VERSION} (${HIC_BUILD_STAMP}) — wiki-as-RAG active`,
    'color:#B8B800;background:#0D0D0D;padding:4px 10px;font-weight:700;letter-spacing:1px;',
);
console.log('[NXT HiC] Feature flags:', HIC_FEATURES);
// Expose on window so you can inspect or verify from the console.
(globalThis as any).__HIC = { version: HIC_BUNDLE_VERSION, buildStamp: HIC_BUILD_STAMP, features: HIC_FEATURES };

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);