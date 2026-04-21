import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ================================================================
// BUNDLE VERSION BANNER — v3.2 "Densified Slide System + Skill Refactor"
// ----------------------------------------------------------------
// Prints a visible identifier to the console at app startup so we
// can tell instantly whether the running bundle includes the v3.2
// Option-B density upgrade AND the nxt-visual-renderer render-contract
// skill refactor. If you don't see "v3.2" and "nxt-visual-renderer",
// you're on a stale bundle — rebuild the container.
// ================================================================
const HIC_BUNDLE_VERSION = 'v3.2';
const HIC_CODENAME = 'Densified Slides + Skill Refactor';
const HIC_BUILD_STAMP = '2026-04-21';
// Feature flags — these MUST all read `true` on v3.2. If any read
// `false` (or the banner doesn't print at all), the bundle is stale.
const HIC_FEATURES = {
    // v3.1 features (retained)
    videoTranscriberConnector: true,                  // Video Transcriber wire-fix
    enrichmentCap300: true,                           // ENRICHMENT_TOP_N raised 80 → 300
    residualWikiArchival: true,                       // archive items that skipped enrichment
    enrichMapCollisionFix: true,                      // Map keyed by item reference
    wikiIndexEndpoint: true,                          // GET /api/wiki/index
    wikiFetchArticlesEndpoint: true,                  // POST /api/wiki/fetch-articles
    chatWikiPreFetch: true,                           // per-turn topic-matched article bodies
    claudeNativeToolUse: true,                        // fetch_wiki_articles tool loop
    slideQuoteBackfill: true,                         // title→body-sentence swap after parse
    wikiArticleViewer: true,                          // ⌘ READ ARCHIVED overlay
    titleAsQuoteBan: true,                            // prompt directive + heuristic detector
    // v3.2 features (NEW — densified slides + skill-contract refactor)
    densifiedTemplates: true,                         // Option B: 7 web templates gained impactGrid/evidence/lesson/comparables/convergentInsight/contextParagraph/corroboratingData/signal/patternSignal/implication/meaning/matters
    renderContractSkill: true,                        // nxt-visual-renderer loaded as always-on render-contract when slide intent detected
    skillReferencesLoader: true,                      // loadSkillContext fetches references/*.md inside skill folders
    renderContractCategory: true,                     // new 'render-contract' category; matchSkills matches it + research-deliverable
    skillVolumeMount: true,                           // .claude/skills mounted into nginx — live-reload without rebuild
    transcriptQuoteCleaner: true,                     // Whisper disfluency + video-intro meta stripper
    smartQuoteClip: true,                             // no-mid-clause quote truncation in QuoteStack + block-quote + case-study
    themeMosaicIvoryRedesign: true,                   // B&W checkerboard replaced with ivory + chartreuse primary accent
    pptxDensityParity: true,                          // PPTX exporter mirrors web Option B fields
};
console.log(
    `%c[NXT HiC] ${HIC_BUNDLE_VERSION} (${HIC_BUILD_STAMP}) — ${HIC_CODENAME}`,
    'color:#B8B800;background:#0D0D0D;padding:4px 10px;font-weight:700;letter-spacing:1px;',
);
console.log('[NXT HiC] Feature flags:', HIC_FEATURES);
// Expose on window so you can inspect or verify from the console.
(globalThis as any).__HIC = { version: HIC_BUNDLE_VERSION, codename: HIC_CODENAME, buildStamp: HIC_BUILD_STAMP, features: HIC_FEATURES };

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