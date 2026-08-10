# BrowserOS Live-Capture for Heuristic Analysis (2026-07-13)

Unified Vision phases advanced: (1) relevance = the user's objective (live journey evidence
enters the corpus with provenance); (2) collect from ALL sources incl. what only the
consultant's authenticated browser can reach. EXTENDS the heuristic E2E revamp
(heuristic-audit-live-prototype-uplift-2026-07-05.md): the artifact classifier already
reserves the hook this plan fills - heuristicAnalysisService.ts:163 "Captures auto-type
'live'". Origin: BrowserOS expertise pass + owner override 2026-07-13 ("why can't I trigger
an optional capture session automatically through the HiC UI ... even if the browser is
running locally?" - answer: you can; this is the design).

## THE INSIGHT THAT MAKES IT CLEAN

The HiC SPA already executes in a browser ON THE CONSULTANT'S MACHINE. BrowserOS's agent
server (Bun MCP/HTTP server) listens on a local port on that same machine. The SPA can
therefore drive a capture session over 127.0.0.1 WITHOUT touching the Docker stack, and the
captured artifacts re-enter HiC through the EXISTING /api/parse-upload ingestion chokepoint.
No second ingestion path, no wiki-write bypass, no BrowserOS code inside HiC (AGPL stays at
arm's length: we call a locally-installed application's API; we embed nothing).

## PRODUCT CONTRACT

1. OPT-IN, FAIL-OPEN: HeuristicBriefIntake feature-detects the local BrowserOS server
   (bounded-timeout GET to the configured local port; default off). Not running -> the
   capture UI never renders; the manual screenshot-upload path is byte-identical to today.
2. TWO-LANE ROUTING at the same intake control ("Capture live flow"):
   - PUBLIC lane: URL flows that need no login route to the PROXY's existing headless
     Chromium (Playwright already in-container; converge, no new stack). Server-side,
     repeatable, no BrowserOS required.
   - AUTHENTICATED/ANTI-BOT lane: routes to the local BrowserOS agent, which walks the flow
     in a VISIBLE window with the consultant's real profile. The human watches and can
     intervene at any step - the platform's human-in-control posture, literally.
3. CONSENT UX (hard rule): the exact agent instruction (start URL + step script + capture
   count cap) renders in a confirm panel BEFORE the session starts; per-run opt-in, never
   remembered as ambient permission; a visible session banner while the agent drives.
4. CAPTURE PAYLOAD: per step - full-viewport PNG, the step's URL, the action taken (one
   line), and extracted visible text (provenance for citations). Hard cap N steps
   (default 12) so a runaway agent cannot flood a run.
5. INGESTION: the SPA posts each capture through /api/parse-upload as run artifacts tagged
   source='live-capture' with the step metadata riding in the upload descriptor. The
   heuristic classifier SKIPS re-inference for them - they auto-type 'live' (the
   heuristicAnalysisService.ts:163 contract) - and the full heuristic set applies.
6. FAILURE POSTURE: a stalled/failed step ends the session gracefully with everything
   captured so far; partial captures are usable artifacts. Agentic capture NEVER runs
   unattended inside generation - it is a pre-analysis assist only.

## IMPLEMENTATION SKETCH (order of work)

- W1 proxy lane (no BrowserOS dependency, ships value alone): POST /api/heuristic/capture-flow
  { startUrl, steps[], maxShots } -> existing in-container Playwright walks PUBLIC flows,
  returns [{png, url, action, text}]. Reuses the gold-export browser pool; per-step timeout;
  UA + viewport standardized (1920x1080 to match the analysis surface).
- W2 intake UI: "Capture live flow" section in HeuristicBriefIntake (start URL + step
  script textarea + lane indicator); results render as pending upload tiles the consultant
  can prune before the run; then normal run submission.
- W3 BrowserOS lane: local-server detection + pairing config (settings field for port/token;
  browseros-cli init establishes the token once); the SPA submits the capture task to the
  local agent (agent-sdk HTTP surface), consent panel, session banner, same payload contract
  as W1 so downstream is lane-agnostic.
- W4 provenance: capture citations resolve as "Live capture: <page title> (<host>, step N)"
  via the standard per-type attribution rule (every source gets REAL attribution).
- Tests: W1 e2e against a public fixture site; classifier skip-path unit test (capture
  artifacts arrive pre-typed 'live'); intake fail-open render test with no local server.

## RISKS / GATES

- Local-server handshake (CORS/token) is the fiddly part of W3; W1+W2 carry no such risk
  and deliver the public-flow capability alone - ship them first.
- BrowserOS is beta software with a fast release cadence: pin the interaction to its stable
  HTTP surface, feature-detect version, fail-open on mismatch.
- Never capture into engagements the consultant does not attest they are authorized to
  test (the consent panel carries the attestation line).

STATUS 2026-07-13 (owner go received): W1+W2 SHIPPED + VERIFIED.
- W1: proxy/flow_capture.py (deterministic step grammar, SSRF guard incl. RFC1918/loopback,
  12-shot cap, graceful partial on failed step) + POST /api/heuristic/capture-flow in app.py.
  Live e2e: 4-step wikipedia flow (2x scroll + goto) -> 4 captures with URL/title/visibleText
  provenance; failed-step case returns prior captures + stopped reason.
- W2: HeuristicBriefIntake "Capture live flow (public pages)" section; captures append as
  auto-typed 'live' screenshots (classifier skip contract); fetch targets the proxy base
  http://127.0.0.1:5012 directly (nginx has NO /api pass-through - relative fetch 405s; every
  proxy call in the SPA uses the absolute base, follow that convention).
- Gates: tsc clean, py_compile clean, 641/641 vitest, both containers rebuilt, full in-UI
  round trip verified (3 tiles, Live badges, success note, zero console errors). UNCOMMITTED.
W3 (BrowserOS authenticated lane: local-server pairing + consent panel) and W4 (capture
citations "Live capture: <title> (<host>, step N)") remain open per the contract above.
