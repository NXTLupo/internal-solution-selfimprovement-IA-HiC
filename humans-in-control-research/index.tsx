import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DesignDesk } from './design-desk';

// ================================================================
// BUNDLE VERSION BANNER — v3.2 "Densified Slide System + Skill Refactor"
// ----------------------------------------------------------------
// Prints a visible identifier to the console at app startup so we
// can tell instantly whether the running bundle includes the v3.2
// Option-B density upgrade AND the nxt-visual-renderer render-contract
// skill refactor. If you don't see "v3.2" and "nxt-visual-renderer",
// you're on a stale bundle — rebuild the container.
// ================================================================
const HIC_BUNDLE_VERSION = 'v3.7';
const HIC_CODENAME = 'Gemini 3.1 Pro Primary + Slide Quality Hardening';
const HIC_BUILD_STAMP = '2026-05-08';
// Feature flags — codename now reflects the v3.7 changes:
// chat + composer migrated from DeepSeek to Gemini 3.1 Pro, mid-sentence
// ellipsis truncation removed, en-dashes scrubbed everywhere, slop blacklist
// expanded to ~140 phrases across jargon/metaphor/hyperbole/AI-slop
// categories, persona titles forced to descriptive archetype labels.
// The P0-P9 corpus relevance pipeline was REVERTED in v3.7 — those flags
// are intentionally absent.
const HIC_FEATURES = {
    // v3.1-v3.4 retained (chat tool-loop, densified templates, RSS body expansion, etc.)
    videoTranscriberConnector: true,
    enrichmentCap300: true,
    residualWikiArchival: true,
    enrichMapCollisionFix: true,
    wikiIndexEndpoint: true,
    wikiFetchArticlesEndpoint: true,
    chatWikiPreFetch: true,
    claudeNativeToolUse: true,
    slideQuoteBackfill: true,
    wikiArticleViewer: true,
    titleAsQuoteBan: true,
    densifiedTemplates: true,
    renderContractSkill: true,
    skillReferencesLoader: true,
    renderContractCategory: true,
    skillVolumeMount: true,
    transcriptQuoteCleaner: true,
    smartQuoteClip: true,
    themeMosaicIvoryRedesign: true,
    pptxDensityParity: true,
    twoPassThemeArchitecture: true,
    rssBodyExpansion: true,
    causeCommerceSourcePack: true,
    staticUrlConnector: true,
    // v3.7 features (2026-05-08)
    geminiPrimaryChat: true,                          // AI Analyst chat default = gemini-3.1-pro-preview
    geminiPrimaryComposer: false,                     // #presentation REVERTED to deepseek-v4-flash — composer oneOf schema rejected by Gemini-compat (INVALID_ARGUMENT 400)
    geminiPrimaryFreeform: true,                      // #journey/#blueprint/#org default = gemini-3.1-pro-preview
    noEllipsisTruncation: true,                       // truncateAtSentence + smartQuoteClip never emit "..." or "…"
    sentenceForwardLookahead: true,                   // truncation looks 1.5× forward for next sentence end
    contentBudgetsBumped: true,                       // title 140, content 280, narrative 600, quote 320, speaker 800
    enDashScrubber: true,                             // U+2013 stripped from every output field
    slopBlacklist140: true,                           // SLOP_PHRASES expanded ~40 → ~140 entries
    slopAutoStrip: true,                              // banned phrases removed from output, not just detected
    personaArchetypeNames: true,                      // isLikelyPersonalName guard auto-replaces "Sarah Chen" with archetype
    personaPromptHardened: true,                      // generatePersonas roster prompt forbids personal names with examples
    universalToneRules: true,                         // 2026-05-08: balanced framing, opportunity-led, no catastrophizing — injected into every prompt path (slides, presentations, freeform artifacts, personas, recommendations, PRDs)
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

// Standalone Design Desk window: when launched via window.open('?designer=1'),
// render only the Design Desk fullscreen — no analyst desk chrome, no IDLE landing.
// The artifact list is shared with the parent window via localStorage
// (designDeskStore hydrates on boot AND listens for storage events).
const isDesignerWindow = new URLSearchParams(window.location.search).get('designer') === '1';

root.render(
  <React.StrictMode>
    {isDesignerWindow ? (
      <DesignDesk
        corpusText=""
        standalone
        onClose={() => { try { window.close(); } catch { /* some browsers block */ } }}
      />
    ) : (
      <App />
    )}
  </React.StrictMode>
);