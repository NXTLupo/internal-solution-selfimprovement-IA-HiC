import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DesignDesk } from './design-desk';
import { installChunkLoadGuard } from './services/chunkLoadGuard';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { hydrateTokensFromFigma, TOKENS } from './components/slideTemplates/types';

// 2026-06-03 — UNIVERSAL ERROR SURFACING. Deliverable-generation failures were
// reported as SILENT resets to landing. Two root causes: (1) no React error
// boundary (a render crash unmounted the whole tree), now fixed by wrapping the
// app in <AppErrorBoundary>; (2) unhandled promise rejections showed only as
// "Uncaught (in promise)" with no detail. These listeners log the FULL reason +
// stack for every rejection and window error, so nothing a deliverable path
// throws is ever silent again. (The chunkLoadGuard's own listeners still handle
// stale-bundle recovery; these are additive, log-only, and never reload.)
if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
        const r: any = e?.reason;
        console.error('[GLOBAL] unhandledrejection:', r?.name || '', r?.message || r, '\n', r?.stack || '(no stack)');
    });
    window.addEventListener('error', (e: ErrorEvent) => {
        if (e?.error || e?.message) console.error('[GLOBAL] window error:', e.message, '\n', e.error?.stack || '(no stack)');
    });

    // 2026-06-05 — html2canvas CORS log-noise filter. html2canvas tries to
    // INLINE every linked stylesheet so its offscreen render uses the same
    // CSS as the live DOM. For cross-origin stylesheets (Google Fonts,
    // FontAwesome CDN) the browser's CSSOM blocks access via SecurityError;
    // html2canvas FALLS BACK GRACEFULLY (uses what it can read) — the only
    // user-visible artifact is screen-spam in the console that drowns out
    // real errors and panics users who think the export is broken. This
    // filter downgrades those specific known-benign errors to console.debug
    // (still findable via DevTools filter, no longer red in the default view).
    // ANY other error/warning passes through unmodified, so real problems
    // remain visible. Generic: pattern-matches the html2canvas log strings,
    // works regardless of which call site fires (deliverable cards, slides,
    // diagrams, recommendations thumbnails).
    const BENIGN_CSS_PATTERNS = [
        /Error inlining remote css file/i,
        /Error loading remote stylesheet/i,
        /Error while reading CSS rules from https:\/\/fonts\.googleapis\.com/i,
        /Error while reading CSS rules from https:\/\/cdnjs\.cloudflare\.com/i,
        /Error while reading CSS rules from https:\/\/use\.fontawesome\.com/i,
        /Failed to read the 'cssRules' property from 'CSSStyleSheet'/i,
    ];
    const _origConsoleError = console.error.bind(console);
    console.error = (...args: any[]) => {
        try {
            const first = args[0];
            const msg = typeof first === 'string'
                ? first
                : (first && (first.message || String(first))) || '';
            if (typeof msg === 'string' && BENIGN_CSS_PATTERNS.some(p => p.test(msg))) {
                // Quiet downgrade — still findable via debug filter for forensics.
                console.debug('[html2canvas/benign-cors]', ...args);
                return;
            }
        } catch { /* never let the filter break real logging */ }
        _origConsoleError(...args);
    };
}

// Install chunk-load guard BEFORE React renders. The guard catches
// stale-bundle chunk-load 404s across all ~85 dynamic-import sites in the
// codebase via three window-level listeners (vite:preloadError,
// unhandledrejection, error). Without this, any rebuild while a user has a
// tab open causes the next dynamic import to throw "Failed to fetch
// dynamically imported module" with no actionable signal. With this, every
// such failure auto-recovers via a debounced page reload that pulls the
// fresh index.html.
installChunkLoadGuard();

// 2026-06-09 - Hydrate the renderer TOKENS from LIVE Figma tokens (proxy
// /api/design-tokens, MCP-sourced from the design-system files) at boot, so the
// renderer (web.tsx/pptx.ts) paints from Figma rather than the hardcoded literals
// in types.ts. Fire-and-forget; fail-loud inside (never silently guesses). NU brand
// hydration is re-invoked per-deliverable where the renderer applies the NU override.
// 2026-06-15 - NXT hydrates the global TOKENS, then we SYNC nxtBrand from it.
// nxtBrand was a pre-hydration snapshot (`{...TOKENS}` at module load), so any
// getBrand('nxt') consumer (web.tsx preview, exporters) saw STALE values while
// only TOKENS got the live feed. Copying TOKENS -> nxtBrand after hydration keeps
// both in lockstep, the NXT analogue of how NU hydrates its own object below.
void import('./components/slideTemplates/brands').then(({ nxtBrand, getBrand }) => {
    void hydrateTokensFromFigma('NXT').then(ok => { if (ok) Object.assign(nxtBrand, TOKENS); });
    // NU brand object hydrates from its own live token sheet so both brands paint
    // Figma-live, not just the NXT default.
    void hydrateTokensFromFigma('NU', getBrand('nu') as any);
}).catch(() => { /* non-fatal: static brand values stand */ });

// ================================================================
// BUNDLE VERSION BANNER — Second Brain identity stamp at boot
// ----------------------------------------------------------------
// Prints a high-contrast ASCII banner + version block to the console
// at app startup. The combination is unmistakable in a screenshot —
// you can confirm "I'm on the latest build" at a glance without
// hunting for hashes. If you don't see the v4.0 banner with the
// "Stage 2.5 · 30-Session Coverage" subtitle, you're on a stale
// bundle and need a hard-refresh.
// ================================================================
const HIC_BUNDLE_VERSION = 'v4.0';
const HIC_CODENAME = 'Vertical-Slice + 30-Session Coverage + Opus 4.8 Briefs';
const HIC_BUILD_STAMP = '2026-05-13';
// Feature flags — codename reflects the cumulative v3.8 + v3.9 shipped work:
//   v3.8 (HiC-VS-HTML-Hashtag-UX branch, prior session):
//     - Verbalized Sampling Sprints 1-3: themes Pass 1 BREADTH (k=24, p<0.10),
//       recommendations VS-Multi (defensible consensus + non-obvious bets),
//       prototype Stage 1 VS-reasoning preamble
//     - HTML artifact foundation: /api/artifacts/* proxy endpoint family,
//       NXT/NU brand tokens as CSS variables, 5 directives (#brief #explainer
//       #report #playground #approaches) emitting self-contained HTML
//     - Hashtag UX: registry as single source of truth, autocomplete with
//       category grouping, artifact library grid (#presentations + #artifacts)
//     - Shared aiRetryClient: 5xx/429 retry with exponential backoff across
//       Gemini, OpenAI, Anthropic endpoints
//   v3.9 (HiC-Active-Loop-Improvements branch, current):
//     - Reinforcement Inference R1 (Verbalized Confidence): themes Pass 1
//       emits per-theme confidence + selfAssessment envelope; calibration
//       gate logs distribution to console. Other 14 R1 sites pending
//       calibration verdict.
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
    // v3.8 features (2026-05-09 to 2026-05-11) — HiC-VS-HTML-Hashtag-UX
    verbalizedSamplingThemes: true,                   // generateThemes Pass 1 BREADTH loads SKILL.md, k=24 candidates with p<0.10 moderate-tail
    verbalizedSamplingRecommendations: true,          // #recommendations uses VS-Multi (defensible consensus + non-obvious bets)
    verbalizedSamplingPrototypeStage1: true,          // prototypeBuilder Stage 1 has VS-reasoning 3-frame branching preamble
    htmlArtifactsEndpoint: true,                      // /api/artifacts/{save,fetch,list,delete,view,promote-variant} via FastAPI proxy
    nxtNuBrandTokensCSS: true,                        // NXT chartreuse/teal + NU red/near-black baked as CSS variables on every artifact
    hashtagDirectivesRegistry: true,                  // services/hashtagRegistry.ts is single source of truth for #brief #explainer #report #playground #approaches #recommendations #proto #presentation #artifacts #help and more
    hashtagAutocomplete: true,                        // chat input shows category-grouped suggestions
    artifactLibraryGrid: true,                        // #artifacts directive renders prior HTML deliverables
    aiRetryClientShared: true,                        // services/aiRetryClient.ts wraps gemini/openai/anthropic with 5xx/429 backoff
    // v3.9 features (2026-05-12) — HiC-Active-Loop-Improvements
    reinforcementInferenceR1Themes: true,             // generateThemes Pass 1 emits per-theme confidence + selfAssessment envelope; calibration gate logs distribution to console
    // v4.0 features (2026-05-13) — Prototype Pipeline Deepening
    prototypeOpusFourSevenBriefs: true,               // brief generator switched from Gemini 3.1 Pro to Claude Opus 4.8
    prototypeTwoPassBriefs: true,                     // pass 1 = 5 skeleton framings (single call), pass 2 = 5 parallel deepenings (16K tokens each)
    prototypeBriefSchemaV2: true,                     // feature_roadmap + narrative_arc + interaction_choreography + data_examples (5+ anchor records per entity)
    prototypeDedicatedBriefWindow: true,              // "Open brief in new window" launches popup with rich brand-aware HTML rendering
    prototypeStage2_5SimSessions: true,               // 30 synthetic user sessions (12 modal + 10 edge + 8 tail) generated between Stage 2 and Stage 3
    prototypeStage4VerticalSlice: true,               // Stage 4 nominates DEPTH_FIRST_SCREENS and builds them at shipping quality before width
    prototypeStage5SessionCoverage: true,             // Stage 5 audits coverage % against the 30 sessions; verdict map ≥70% ship / 50-69% refine / <50% rebuild
    prototypeStage3_5BuildRecipe: true,               // Build Recipe Author stage (Copilot-Recipe-Generator-grade implementation plan) inserted between Stage 3 and Stage 4
    prototypeStaleChunkUrls: true,                    // /assets/chunks/*.js have stable filenames; entry-only hash rotation; nginx revalidates chunks
    prototypeProgressHeartbeat: true,                 // chat handler ticks "running Xs" every 4s on each stage; total elapsed line; 5-min per-fetch timeout
};

// ================================================================
// BOOT BANNER — high-contrast version stamp. Keep it concise:
// version + codename + feature roster. The chartreuse-on-black
// palette matches NXT brand.
// ================================================================
console.log(
    `%c[NXT HiC] ${HIC_BUNDLE_VERSION} (${HIC_BUILD_STAMP}) — Second Brain · ${HIC_CODENAME}`,
    'color:#B8B800;background:#0D0D0D;padding:6px 12px;font-weight:700;letter-spacing:0.5px;font-family:ui-monospace,Menlo,Consolas,monospace;',
);
console.log(
    `%c  #proto pipeline (Opus 4.8 all stages · Gemini 3.1 Pro fallback): brief 2-pass · spec · 2.5 30-session VS · design · MULTI-AGENT PODS (orchestrator contract → parallel screen pods → assemble → integration reviewer)`,
    'color:#999999;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;',
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
    <AppErrorBoundary>
      {isDesignerWindow ? (
        <DesignDesk
          corpusText=""
          standalone
          onClose={() => { try { window.close(); } catch { /* some browsers block */ } }}
        />
      ) : (
        <App />
      )}
    </AppErrorBoundary>
  </React.StrictMode>
);