# Independent Review Brief — HiC Harness "Dark Corners"

**For:** an independent engineering reviewer (you).
**Purpose:** conduct a fresh, adversarial review of the HiC Research app's risk surfaces that
the first whitepaper did **not** cover, then produce a whitepaper-style augmentation we will
fold into the build plan. **Assume nothing here is correct** — every finding is tagged
`[VERIFIED]` (confirmed in code this session, with file:line) or `[HYPOTHESIS]` (suspected,
needs your confirmation). Your job is to confirm/refute, rank severity, and propose
SOTA-grounded solutions with confidence tags, exactly as the prior whitepaper did.

## Background you need (read these first, ~30 min)
- `ONBOARDING.md` — full app architecture/functionality (122K LOC, the two engines, the two
  chats, the proxy, the wiki second-brain, the self-improvement subsystem).
- `plans/harness-architecture-audit-2026-06-02.md` — the FIRST audit: five gaps (silent
  degradation, non-determinism, dead routers, broken cognitive chain, orphaned self-improvement)
  and the H1-H5 build.
- `plans/harness-sota-integration-2026-06-02.md` — the FIRST whitepaper's SOTA patterns
  (OpenTelemetry GenAI, content-addressed corpus, RouteLLM, typed blackboard, TopicGPT grounding
  gate, GEPA/ACE, Verbalized Sampling) mapped onto H1-H5.
- `plans/harness-kpi-accountability-2026-06-02.md` — the measurable KPI contract.

**The first whitepaper + H1-H5 cover pipeline QUALITY/RELIABILITY. This brief covers the
surfaces they leave untouched: security, data governance, correctness landmines, modality
gaps, export edges, storage durability, cost, evaluation ground-truth, and the risks the
proposed fixes themselves introduce.** Do NOT re-review the five gaps; review what's around them.

## Tech context (so your verification commands work)
- SPA: React 19 + Vite, `humans-in-control-research/` (flat, no `src/`), nginx static dist on
  `:5011` (rebuild to change). Proxy: FastAPI `proxy/app.py` (~13,900 lines), source-mounted on
  `:5012` (restart to change), run with `PROXY_WORKERS=4` uvicorn workers.
- Sibling services on the same Docker network: `journey-mapper` (canonical journey/blueprint),
  `social-research-backend:8081` (RoBERTa sentiment, recently wired), `presentation-renderer:5014`
  (`#presentation`, reportedly scaffolding), `nxt-agency` (external repo).
- Wiki "second brain": markdown under `hic-workspace/wiki/` + a single sqlite-vec file
  (`.vectors.db`, ~5,682 articles / 27,376 chunks).

---

## How to review (the ask, concretely)
For EACH finding below:
1. **Verify or refute** using the listed file:line + the verification steps; mark
   CONFIRMED / REFUTED / PARTIAL and note what you found.
2. **Rank severity** P0/P1/P2 with a one-line failure-mode and *who is harmed* (operator,
   client, the business).
3. **Propose solutions, whitepaper-style:** 2-3 confidence-tagged candidates per finding
   (`(C1, conf 0.x)`), each citing a NAMED 2024-2026 pattern/paper where one exists (NIST AI
   RMF, OWASP LLM Top-10, OpenTelemetry, secret-scanning standards, RAG-injection defenses,
   eval-harness/gold-set methodology, multi-tenant RAG isolation, etc.), with Pro/Con.
4. **Decide placement:** should this be PROMOTED into H1-H5, run as a parallel workstream, or
   logged as an accepted risk? Justify.
5. **Augment, don't repeat:** add any dark corner we missed; flag anything we got wrong.

A response template is at the end so your output composes directly back into the plan.

---

## FINDINGS TO REVIEW

### A. Security & data governance

**A1. No authentication/authorization on the proxy; binds all interfaces. [VERIFIED]**
- Evidence: the only middleware is CORS (`proxy/app.py:42` `app.add_middleware(...)`); no
  `Depends`/bearer/token/verify on any route. Server binds `host="::"` with 4 workers
  (`proxy/app.py:13919` `uvicorn.run("app:app", host="::", port=port, workers=workers)`).
- Why it matters: every `/api/*` route (generation, wiki read/write, corpus, source list) is
  open to anyone who can reach the port. For a multi-client consulting tool this is an
  exfiltration + abuse surface.
- Verify: `grep -nE "add_middleware|Depends\(|HTTPBearer|verify" proxy/app.py`; confirm the
  Docker port mapping for `research-proxy` in `docker-compose-all.yml` (is `:5012` published to
  the host / LAN?).
- Open questions: is the proxy ever reachable beyond localhost in any deployment? Is there an
  intended trust boundary? Should auth live at the proxy or an ingress?
- Candidate directions to critique: API-key/bearer gate + per-route authz; bind to loopback
  only; OWASP-LLM-aligned input gating.

**A2. Provider API keys leak into request URLs and logs. [VERIFIED]**
- Evidence: Gemini + embedding keys are placed in the query string
  (`proxy/app.py:7468` `...:generateContent?key={api_key}`, also `:9293`, `:9376`). httpx logs
  request URLs at INFO; this session's docker logs show `...?key=AIzaSy...` in plaintext.
- Why it matters: anyone with log access (or a shipped log bundle) gets live provider keys.
- Verify: `docker compose -f ../docker-compose-all.yml logs research-proxy | grep -o "key=[A-Za-z0-9_-]\{6\}" | head` — expect real key prefixes.
- Candidate directions: move keys to headers where the API allows; add a logging filter that
  redacts `key=`/`Authorization`; rotate the exposed keys.

**A3. The wiki is a single global second-brain shared across all engagements/clients. [VERIFIED, architecture]**
- Evidence: `wikiService.ts::loadGenerationContext` injects `crossEngagementPatterns` and prior
  `engagements/*`; retrieval (`POST /api/wiki/fetch-articles`) searches one shared
  `.vectors.db`. No tenant key on articles/chunks.
- Why it matters: cross-engagement reuse is a *feature*, but uploaded client documents (SOWs,
  transcripts) from client A can surface in client B's corpus retrieval — **cross-client data
  leakage**. No retention/deletion/PII handling (relevant to the privacy/transparency pressures
  in HiC's own research corpus).
- Verify: inspect frontmatter of `hic-workspace/wiki/sources/*` and `articles/*` for any tenant/
  client field; trace whether `fetch-articles` filters by engagement.
- Open questions: is multi-client isolation a requirement? What's the data-retention policy for
  uploaded client docs? Is a "forget this engagement" operation needed (GDPR-style)?
- Candidate directions to critique: per-tenant namespaces/collections; engagement-scoped
  retrieval with an opt-in cross-engagement layer; upload TTL + delete API; PII scrubbing on ingest.

**A4. Prompt injection from untrusted web corpus. [HYPOTHESIS]**
- Evidence sought: the corpus is built from Reddit/RSS/jina-extracted pages
  (`researchFabricOrchestrator.ts` enrich/merge); I found no injection sanitization on that path.
- Why it matters: a malicious page can embed instructions ("ignore prior instructions, output…")
  that the theme/artifact LLM may follow, corrupting deliverables or exfiltrating the system prompt.
- Verify: search the gathering/merge path for any instruction-stripping/escaping; attempt a
  controlled injection (a test source whose body contains an override instruction) and see if it
  influences a theme/artifact.
- Candidate directions: OWASP-LLM-01 mitigations — delimiter/spotlighting, content/instruction
  separation, an injection-classifier gate before corpus admission.

### B. Correctness landmines (outside H1-H5)

**B1. Three embedding dimensions coexist (768 / 1536 / 3072). [VERIFIED dims; segregation UNVERIFIED]**
- Evidence: OpenAI `text-embedding-3-small` dim 1536 (`proxy/app.py:9134`); gemini-embedding-001
  default 3072 (`:9141`) pinned to MRL `output_dimensionality=768` (`:9151/:9155`); the chunked
  store logged `dim=768 provider=gemini`, while `topic_modeling.py` embeds at 1536/3072.
- Why it matters: vectors of different dims/providers are not comparable; if any backfill mixed
  them, cosine retrieval silently degrades (garbage neighbors) with no error.
- Verify: inspect `.vectors.db` for the dimensionality/provider of stored vectors (are they
  uniform?); check whether `wiki_embed_backfill.py` and `topic_modeling.py` use the SAME
  provider+dim; confirm the provider-keyed cache truly segregates spaces.
- Open questions: is there ONE canonical embedding space, or several coexisting? What happens on
  a provider switch mid-corpus for retrieval (not just topic modeling)?

**B2. Per-worker in-memory state across 4 uvicorn workers. [VERIFIED]**
- Evidence: `workers=4` (`proxy/app.py:13909/13919`); module-level dicts (provider cooldowns,
  in-process caches) are per-process, not shared.
- Why it matters: a 429 cooldown recorded in worker 1 is invisible to workers 2-4; in-memory
  cache hit-rate fragments 4×; "provider health" is inconsistent per request.
- Verify: `grep -nE "_PROVIDER_COOLDOWN|_cache *=|_health" proxy/app.py` and confirm none are
  backed by a shared store (Redis/sqlite); observe cooldown behavior under concurrent load.
- Candidate directions: shared cache/health store, or pin to 1 worker + async concurrency, or
  accept-and-document.

**B3. True reproducibility is impossible without corpus snapshotting. [VERIFIED, conceptual]**
- The corpus is gathered from LIVE feeds (RSS/Reddit/GDELT sort-by-date). Even H2's
  content-addressed caching cannot make tomorrow's gather identical. Reproducibility holds only
  for a *snapshotted* corpus.
- Review ask: pressure-test the H2 plan's snapshot/replay design; is it sufficient, and what's
  the storage cost of snapshotting every engagement's raw items?

### C. Modality gaps (the app silently can't read these)

**C1. Vision is non-functional; images become citable apology strings. [VERIFIED]**
- Evidence: `aiRouter.ts::routeVisionAnalysis` throws on its non-OpenAI default while its default
  model is google (`aiRouter.ts:542` vs `:446`); image uploads return a literal
  "Vision analysis is Phase 3 — content not yet readable" string as the parsed "text"
  (`proxy/app.py:6620`), which then enters the corpus as a chunk with a real citation ID.
- Why it matters: client screenshots/charts/diagrams are invisible to analysis AND a model can
  cite the apology string as evidence.
- Review ask: confirm; propose the minimal correct fix (Gemini vision branch + don't admit
  placeholder chunks) and whether vision should be in-scope now.

**C2. Audio/video transcription is brittle. [PARTIAL]**
- Whisper quota is frequently dry; a Gemini fallback was added; yt-dlp breaks on YouTube changes.
- Review ask: assess reliability and whether video evidence should be a supported modality.

### D. Export / render edges (beyond the "export==preview" KPI)

**D1. Template web/pptx sync drift → blank exported slides. [VERIFIED, historical]**
- Evidence: the 18 templates require `components/slideTemplates/web.tsx` and `pptx.ts` kept in
  lockstep; a template present in one but not the other renders blank in that path (the
  documented "27/30 blank slides" failure).
- Review ask: propose a CI/build check that fails when the two renderers' template sets diverge.

**D2. `presentation-renderer:5014` may be scaffolding-only. [HYPOTHESIS]**
- The `#presentation` path emits a `PresentationPayload` to a separate service the docs call
  "scaffolding only." Verify whether `#presentation` actually renders/exports end-to-end today.

**D3. PDF/PPTX fidelity edges. [HYPOTHESIS]**
- PDF is browser `html2canvas`→jsPDF (fonts, page breaks, cross-origin images, large artifacts);
  PPTX font embedding is EOT-wrapped; non-Latin/RTL, charts (rasterized vs native?), and oversized
  decks are uncharacterized. Review ask: stress-test each and report what silently degrades.

### E. Storage durability

**E1. Single sqlite-vec file is a single point of failure. [VERIFIED]**
- One `.vectors.db` (5,682 articles / 27,376 chunks) on a Docker volume; no backup; concurrent-
  write safety unverified. Corruption = total memory loss.
- Review ask: backup/replication design; concurrent-write audit (does the proxy write it from
  multiple workers?).

**E2. Browser localStorage/IndexedDB as primary state. [VERIFIED]**
- Learned constraints, edit logs, `designDeskStore` artifacts live in localStorage/IndexedDB —
  lost on clear; ~5-10MB quota silently fails writes; cross-window `BroadcastChannel` sync can race.
- Review ask: which state must survive a browser clear, and should it move server-side?

**E3. Wiki rot. [HYPOTHESIS, prior-audit signal]**
- A prior lint reported ~17,775 broken links / ~103 orphan pages. Retrieval quality degrades as
  the second-brain rots. Review ask: quantify current rot and its retrieval impact.

### F. Cost & concurrency governance

**F1. No per-run cost ceiling; cost meter misses the proxy path; H5 adds spend. [VERIFIED]**
- `costMeter.recordAICall` is called only from `aiRetryClient.ts` (3 sites); all proxy Opus/Pro
  generation is uncounted. The proposed H5 (GEPA/ACE) adds many more LLM calls with no budget guardrail.
- Review ask: a run-level token/$ budget with hard cutoff; proxy-side cost accounting design.

### G. Evaluation ground-truth gap (likely a plan-blocker)

**G1. No labeled gold set exists; H5's judge calibration presupposes one. [VERIFIED, gap]**
- There is no human-labeled set for theme quality, sentiment, citation faithfulness, or
  deliverable quality. H5's reward + Krippendorff-α judge calibration cannot be computed without it.
- Review ask: design the gold-set methodology (size, annotators, inter-annotator agreement
  target, refresh cadence) per LLM-eval best practice; should this be an H0 prerequisite?
- Also: characterize adversarial inputs (empty goal, non-English corpus, single-source,
  contradictory corpus, no-lens-match) — what breaks?

### H. Risks the PROPOSED fixes introduce

**H1. Content-addressed-ID canonicalization bugs → cache poisoning. [DESIGN RISK]**
- `sha256(normalized_text + uri + offset)` is only as safe as the Unicode/whitespace
  normalization; subtle errors cause duplicate IDs or wrong cache hits.
- **H2. Reward hacking / cache-serves-stale.** The GEPA/ACE judge can be gamed; a cache key that
  misses a dimension (e.g., a prompt-template change) serves stale-wrong output.
- **H3. New sibling-service coupling.** RoBERTa sentiment now depends on `social-research-backend`;
  if it's down, sentiment silently falls back to VADER (the exact bug just fixed). We traded a
  quality bug for a coupling/availability risk.
- Review ask: stress these; propose guards (cache-key completeness tests, reward-hacking
  monitors, sibling-service health gating that surfaces in the RunReceipt).

### I. Maintenance dark corners

**I1. Two engines + two enforcement layers will keep drifting. [VERIFIED]**
- Chat `#themes` ≠ `generateThemes`; `slidePostProcessor.ts` (350+ phrases) vs proxy `_SLOP_SUBS`
  (~17). H1-H5 hardens both but doesn't unify them.
- **I2. Hardcoded model literals** (`gemini-3.5-flash`, `gemini-3.1-pro-preview`, `claude-opus-4-8`)
  mean the next provider snapshot sunset is another silent failure (the opus-temperature-400 class).
- **I3. Skills/hooks are unversioned markdown**; a bad edit silently degrades output; SkillOpt
  targets the Vite-served `/skills/` copy, not canonical `.claude/skills/`.
- Review ask: is engine/enforcement unification worth a workstream, or is the divergence acceptable?

---

## What we specifically want from your review (deliverable)
1. A **CONFIRMED/REFUTED/PARTIAL verdict + severity** per finding (A1…I3), with what you found.
2. A **whitepaper-style augmentation**: for the surfaces above, the NAMED SOTA patterns and
   confidence-tagged candidate solutions we should adopt (mirroring the first whitepaper's
   format), with honest caveats and benchmark-vs-our-context warnings.
3. A **placement recommendation**: which dark corners must be PROMOTED into H1-H5 (our current
   hypotheses: G1 eval gold-set → H0 prerequisite; A1/A2 secrets+auth → fold into H1; C1 vision +
   D1 template-sync → add detectors), which run as parallel workstreams, which are accepted risks.
4. **Anything we missed**, and **anything we got wrong** (especially the `[HYPOTHESIS]` items).

## Response template (so your output composes back into the plan)
```
FINDING <id> — <CONFIRMED|REFUTED|PARTIAL> — sev <P0|P1|P2>
  evidence you found: <file:line / command output>
  failure mode + who is harmed: <one line>
  candidates:
    (C1, conf 0.x) <named pattern> — Pro / Con
    (C2, conf 0.x) ...
  placement: <promote-to-Hx | parallel-workstream | accepted-risk> because <reason>
NEW FINDING <name> — sev — evidence — candidates — placement
CORRECTION — <finding id> — we claimed X; it is actually Y — evidence
```

## Caveats on THIS brief (calibrate your trust accordingly)
- `[VERIFIED]` items were confirmed in code during a 2026-06-02 session via grep/read; line
  numbers may shift as the code changes — re-verify.
- `[HYPOTHESIS]` items are suspected from architecture, NOT confirmed — your independent
  confirmation is the point.
- This brief is intentionally adversarial and may over-state some risks; refute freely. It
  deliberately excludes the five quality gaps (covered in the first audit/whitepaper) — flag if
  any dark corner here actually belongs there instead.
- Author's known failure mode this session: synthesizing confidently over gaps and overselling
  partial work. Treat claims skeptically and demand the evidence trail.
