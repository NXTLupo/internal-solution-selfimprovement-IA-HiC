# Fable 5 Swap + Anti-RAG Enforcement + Export Fit — 2026-06-12

Executes sections 2, 3, and the "known adjacent defect" of
`HANDOVER_2026-06-12_NEW_DEVELOPER.md`, plus two issues caught live during
verification (RAG fallback on empty manifest catalog; recommendation-slide
export overflow). All items below are BUILT, DOCKER-REBUILT, and
BROWSER-VERIFIED on 2026-06-12.

## 1. P0 — stale-bundle "dual app boot" fix (handover section 3)

- `vite.config.ts` — `chunkFileNames: 'assets/chunks/[name]-[hash].js'`
  (content-hashed again; reverses the 2026-05-12 stable-names decision).
  Comment block rewritten with the new contract: changed chunks 404 in old
  tabs -> ChunkLoadGuard banner (its designed UX); unchanged content keeps
  its hash.
- `nginx.conf` — `/assets/chunks/` flipped from `max-age=300,
  must-revalidate` to `max-age=31536000, immutable` (safe with hashed URLs).

## 2. Model swap to Claude Fable 5 (handover section 2)

Routing live and console-verified:
| Surface | Trigger | Model | Verified |
|---|---|---|---|
| Analyst chat plain reply | no artifact hashtag | gemini-3.5-flash (default picker state) | yes — "via gemini-3.5-flash", 14.2s |
| Analyst chat deliverable | any artifact hashtag | claude-fable-5 (force-route) | yes — `[chat][route] force-routing ... -> claude-fable-5`; `:::slide theme-cluster` rendered "via claude-fable-5" |
| Designer chat generate + revise | content hashtags / revision turns | claude-fable-5 | code-path swapped (3 call sites); NOT live-exercised this session |
| Designer critics | automatic | unchanged (Sonnet/Opus/Haiku) | untouched |

Files: `services/corpusChatService.ts` (ChatModel union, AVAILABLE_MODELS
entry, ARTIFACT_TPL hoisted to module scope, early force-route BEFORE
buildGroundingContext so Fable's 600K-char budget governs packing, anthropic
dispatch branch, `callClaude()`, RI re-ask anthropic branch, 200K context
parser branch), `components/CorpusChatPanel.tsx` (default model ->
gemini-3.5-flash), `design-desk/services/chatToSlideSpec.ts` +
`chatToFreeform.ts` (unions + Claude branches via aiRetryClient),
`design-desk/DesignDeskChat.tsx` (3 call sites), `services/aiRouter.ts`
(MODEL_REGISTRY entry; caps UNVERIFIED — maxContext 200K / maxOutput 32K
conservative), `services/costMeter.ts` (PLACEHOLDER pricing at Opus 4.8
rates + normalizeModel + display name), `proxy/model_registry.py`
(claude-fable-5 active; gemini-2.5-flash -> sunset w/ successor),
`proxy/app.py` (assert_startup list).

**Live finding**: `claude-fable-5` 400s on `temperature`
("deprecated for this model"), same as Opus 4.8. Fixed at both layers:
proxy strip regex widened to `opus-4-[789]|fable`; clients omit the param.

## 3. Proxy key-leak + retired-model sweep (handover "adjacent defect")

- `proxy/topic_modeling.py` — THE logged incident site:
  `_GEMINI_LABEL_MODEL` gemini-2.5-flash -> gemini-3.5-flash AND `?key=` URL
  param -> `x-goog-api-key` header (`_gemini_key_headers()` mirror of
  app.py `_goog_key_headers`). Same header fix on `_embed_via_gemini`.
- `proxy/industry_backfill.py` — same model pin + `?key=` fix.
- `proxy/app.py` — `proxy_gemini` default, rerank default (+docstring), and
  the regrade loop pin all moved to gemini-3.5-flash.

## 4. Anti-RAG enforcement (caught live; user-flagged)

Live `#themes` run surfaced two violations of
`[all/deliverables-manifest-wiki-not-rag]`:
1. **Manifest catalog empty -> silent bulk-RAG fallback.** Root cause: 0 of
   10,407 manifest records carry the restored session's engagement tag
   (1,622 records are tagged, all prior engagements), and no KL selection
   was armed. Fix: **tier-3 WHOLE-WIKI manifest fallback** in
   `services/chunkRetrieval.ts` `_readManifestCatalog` — when tier-1
   (engagement) + tier-2 (KL selection) are empty, read the whole-wiki
   catalog (`engagement=""`) and let pre-rank + MMR narrow. Verified live:
   43,037 pointers -> shortlist 960 -> MMR pack 64 chunks / 42 pages /
   ~30K tok, "bulk corpus demoted". Jonathan approved keeping tier-3
   (vs. refuse-and-prompt) 2026-06-12.
2. **2026-04-20 wiki pre-fetch (20 embedding-ranked article bodies)
   bulk-injected into every chat turn.** Now SUPPRESSED when
   `isArtifactGenerationMessage()` — deliverables ground via MCR only;
   plain-chat Q&A keeps the pre-fetch.

## 5. PPTX export 1:1 parity (user directive mid-session)

- `npm run check:templates` — PASS (canonical=web=pptx=20).
- Exported the live 11-slide NU deck; audited with python-pptx: all titles
  match preview payloads verbatim, fonts Lora/Archivo/IBM Plex Mono, no
  blank slides, kicker middle-dot correct (U+00B7).
- **Found**: recommendation slides with the FULL payload stack (actionTitle
  + rationale + 3 actions + evidence + impactGrid + impactMetric +
  implication) overflowed the 1080px stage by 7-25px — KEY OUTCOME panel at
  7.675in on a 7.5in canvas. The 540px preview HIDES this behind
  line-clamps; the export MEASURE reads layout rects (paint clipping does
  not bound exported geometry).
- **Fix**: `renderRecommendation` fullStack mode — denseSa count-adaptive
  type scale + tightened spacing + reduced char budgets (deterministic
  server-side trunc, never CSS clamp). Iterated export->audit until
  **0 geometry issues across all 10 slides**.
- Standing lesson (registered as constraint): preview-clean does not prove
  export-clean; audit exported decks for out-of-canvas shapes.

## 6. Verification (pre-claim checklist)

| Check | Result |
|---|---|
| Build | `tsc --noEmit` 0 errors; `vite build` OK; `py_compile` OK on all 4 touched proxy files |
| Tests | vitest 79/79 pass; check:templates PASS |
| Browser load | Playwright :5011, 0 console errors, new hashed bundle served |
| Flow exercised | plain chat -> Gemini Flash; `#themes #slides #NU` -> Fable 5 end-to-end (fence rendered, themes evidence-grounded, no raw pointers); PPTX export x3 |
| Output inspected | PPTX audited via python-pptx: 10 slides, 0 blank, 0 out-of-canvas, fonts + text parity confirmed |
| NOT verified | Designer-chat Fable generate/revise (code swapped, not live-run); official Fable context/output caps + pricing (placeholders flagged in code) |

## 7. Open follow-ups

1. Designer chat live test: `#persona` generate + revision turn -> confirm
   Fable (handover protocol step 6).
2. Watch the tool-loop iteration cap on bigger Fable #slides runs (handover
   section 3 last bullet; the post-cap forced-finalize at ~line 4276 is the
   place if it exhausts).
3. Verify official claude-fable-5 context window / max output / pricing when
   Anthropic publishes; update aiRouter + costMeter + AVAILABLE_MODELS.
4. Engagement tagging gap: fresh-session corpus collection should tag
   manifest records with the session slug (why tier-1 was empty here);
   trace the ingest path when it next matters.
5. W5 SkillOpt rerun + tasks #23-25 remain pending per handover section 8
   (do not start without Jonathan).

## 8. PM session — auto routing UI, in-flight labels, feedback loop (2026-06-12 PM)

Three user-reported issues, all live-verified after fix:

1. **Model picker removed** (`CorpusChatPanel.tsx`): replaced by a read-only
   "Auto Routing" strip (Chat = Gemini 3.5 Flash / # Artifacts = Claude
   Fable 5). `selectedModel` is a setterless constant. Artifact-engine paths
   (#recommendations, HTML directives, freeform kinds) now pin
   `preferModel: 'claude-fable-5'`; `deliverableModelRouter.resolveModelChain`
   honors out-of-chain preferred registry models as chain head.
2. **In-flight model labels** (the wrong-model processing screen): new
   `routedModelFor()` export in corpusChatService mirrors the force-route;
   the progress placeholder, LiveProcessingIndicator, LoadingIndicator,
   abort message, and chat-export labels all use it. Live-verified:
   "CLAUDE FABLE 5 IS WORKING" during a hashtag generation.
3. **Feedback loop** (chat-2026-06-12.txt analysis):
   - Root causes: (a) regen prompts NESTED prior feedback blocks (onApplyNow
     walked back to the previous AUGMENTED prompt) — now de-nested into one
     cumulative merged list; (b) the export's "via gemini-3.5-flash" on run 3
     was the in-flight placeholder's label (fixed by #2); (c) the feedback
     itself was RENDERER-class (source alignment, type size, citation
     redundancy) which prompt augmentation can never honor.
   - Renderer fixes (stage twin + goldPreviews twin): theme source rides
     INSIDE the evidence block directly under the quote; footer sources strip
     suppressed when every theme is per-quote cited; theme body copy +2px.
   - **SkillOpt option (user directive)**: FeedbackWidget checkbox "Also
     train the skill (SkillOpt, gated)" -> `train_skill` on FeedbackEvent
     (frontend + proxy model) -> `build-training-set.py --feedback-base`
     folds train_skill text events into the kind's training set as 0.3-score
     failure trajectories with verbatim feedback; npm script updated.
     Validation gate untouched. Verified: synthetic event folded into
     strategy-slide-training.json as a failure trajectory.

Verification: tsc 0 errors; 79/79 vitest; py_compile OK; Docker rebuild both
containers; Playwright browser-verified picker removal + Fable processing
label + a full Fable generation (2 themes, 64 manifest chunks, 0 console
errors). NOT verified: a live regen round-trip through the new de-nested
feedback prompt, and a real skillopt batch run on folded feedback (next
batch run will pick it up).

## 9. Journey-map in-table redesign (2026-06-12 PM, user directive)

The matrix IS the slide body: personas -> PERSONAS voice row; pains -> stacked
per-phase cells (>=3 evidenced, painPoints accepts string[] per phase,
overallPainPoints arc-distribute into the stacks); opportunities -> cool-accent
row; kpiTiles -> embedded in phase headers. Arc-ordering contract documented in
types.ts + the SLIDE OUTPUT PROTOCOL journey-map block (Fable emits the new
shape - VERIFIED live: nested pain arrays w/ 3-4 evidenced pains per phase,
arc-ordered personas/opportunities, embedded Unguided/Ghosted/Rushed signals).
Anatomy page design-system/journey-map-in-table-anatomy.md written +
manifest-chunked (4 pointers, retrievable).

Verified: tsc 0 errors, 79/79 tests, template parity PASS, live Fable #journey
generation + preview screenshot (all rows in-table, no collisions), PPTX export
audit found one 0.15in overflow on the FULL payload -> full-mode count-adaptive
fit shipped (fs-2, tighter budgets/padding).

NOT verified / pending:
1. Re-export geometry audit on the fit fix (the verification re-run hung
   post-response in the chat - Anthropic 200 returned in 52s but the reply
   never rendered; same path succeeded 20 min earlier; investigate the
   post-response pipeline if it recurs).
2. Figma GOLD journey frames (NU 53:159/156:2, NXT 75:2) rebuild to the new
   anatomy as nested auto-layout, dual-brand, then re-register in
   brand/figma-node-map.md (7-step routine steps 6-7).
3. pptx.ts legacy exportJourneyMap joins pain stacks with a dot separator
   (gold pipeline renders the full layout; legacy path is join-only).

## 10. Gaps closed (2026-06-12 PM, "close gaps immediately")

1. Legacy pptx.ts exportJourneyMap: full in-table parity (embedded header
   signals, voice row, stacked bullet pains, opportunities row, arc spread).
2. Export geometry audit CLOSED via direct stage-HTML export test (bypassed
   the browser): root cause of the residual 7.65in overflow was the SHELL
   takeaway band (top:944px, untruncated keyInsight wrapping to 3+ lines -
   pre-existing, all templates). Fixed: trunc(228) + type step-down >170
   chars. Re-audit: 0 geometry issues, all in-table rows in the export.
3. Figma GOLD journey in-table frames BUILT + screenshot-verified, both
   brands, nested auto-layout matrices: NU 232:2 (GOLD · journey (nu)),
   NXT 333:2 (GOLD · journey (nxt)). Registered in brand/figma-node-map.md;
   constraint [journey/figma-gold-in-table] clears the PENDING.
   Known deviation: raw-hex fills, variable-binding pass pending
   (collections NXT 221:2 / NU 95:2).
