# HiC v2: the single end-to-end workspace program

2026-08-14. Source of requirements: `.claude/research/new_enhancementss_instructions_HiC.pdf`
(the "Exhaustive Change Set", 12 change areas + a 15-step build order, grounded in the
Isabelle Davis working-session feedback). This plan maps every PDF item to the existing
HiC architecture, sequences the work into eight workstreams, and encodes the rollback
insurance the owner required.

North star (PDF item 1): a consultant starts from a raw transcript and finishes with an
exported deck plus a client follow-up email WITHOUT opening Claude or editing in
PowerPoint. HiC stops being a waypoint between Claude, HiC, and PowerPoint.

Unified Vision tracing: this program advances phases 1 (objective grounding from
transcripts), 2 (second-brain reuse made visible), 4/5 (manifest-grounded engagement
chat), 6 (all new outputs route through `aiRouter.artifactModelFor`), 7 (inline edits
feed the edit-learning loop), 8 (editable-visual decision layer), 9 (export uplift stays
native/editable). Each workstream names its phases.

## 0. VERSION SAFETY (owner requirement: archive the current working version)

DONE 2026-08-14:
- Docker images tagged AND saved to tar:
  `nxt-humans_ai_cx_workbench-research-generator:archive-pre-v2-2026-08-14`
  `nxt-humans_ai_cx_workbench-research-proxy:archive-pre-v2-2026-08-14`
- Full source snapshot (including the uncommitted user-directed imagery work),
  the skills library, and `docker-compose-all.yml` copied to
  **`d:\HIC-ARCHIVES\2026-08-14-pre-v2\`** with a step-by-step **`RESTORE.md`**.
- Git anchor: branch `self-improvement-ia-2026-05-29`, HEAD `3ee669ddc`.

REMAINING version-safety steps (S0, before any v2 code):
- S0a. Owner checkpoints the in-flight user-directed imagery build (universal slots) in
  the live app; on approval, commit + push it to the `selfimprovement` remote so the v1
  tip is remote-backed. (Standing rules: no commit without approval; never push origin.)
- S0b. Create the v2 branch **`hic-v2-workspace-2026-08-14`** FROM
  `self-improvement-ia-2026-05-29`. ALL v2 work lands there. Isabelle's
  `git pull` on the current branch keeps serving v1 untouched until the owner
  deliberately merges or switches. Trying v2 = checkout v2 branch + rebuild; disliking
  it = checkout v1 branch + rebuild, or the image-tag rollback in RESTORE.md (no
  rebuild needed).
- hic-workspace/ (wiki, sessions, sources) is shared live data across both versions by
  design; code rollback never destroys research data.

## 1. Requirement-to-architecture map (what exists, what is new)

| PDF item | Current state (anchors) | Verdict |
|---|---|---|
| 1 Single workspace + persistent memory | Session state exists (`services/sessionService.ts`, `hic-workspace/sessions/`, wiki manifest, engagement memory) but the SPA restores nothing on load (`App.tsx` ~1291: no researchGoal restore) and no user-visible engagement entity ties transcripts/goals/decks/emails together | EXTEND (converge on sessionService + manifest; no parallel store) |
| 2 Transcript anonymize + synthesize + goal | Upload + vision extraction exist; ZERO anonymization anywhere in the tree; no transcript summary contract; no goal generation from uploads | NEW (proxy intake endpoints + landing UI) |
| 3 Blend mode explicit + auditable | Blend exists but as an implicit `window.__hicBlendMode` flag with console/chat notices (`App.tsx` 1395, 4039-4160, 5460); merge authority already dedupes and counts | EXPOSE + AUDIT (three explicit run modes, pre-run confirm, post-run diff) |
| 4 Latency: library + systemwide | Prompt-cache stack, embedding cache, signature-keyed LLM cache exist (`multiModelResilience.ts`); no engagement-summary precompute, no skeletons, no request telemetry | NEW UX layer + telemetry over existing caches |
| 5 Visual by default | User-directed slots on EVERY archetype + content-derived suggested prompts just shipped (`services/userImagery.ts`, SlideCanvas chips); auto-fill was reverted 2026-08-14 for style-token + quality failure | EXTEND (auto-AUTHOR all slots + one-click Generate All; never silent generation) |
| 6 Blank slides + bounding boxes | Fail-visible guard in `slideComposer.ts`; deckPlanGate; exhibit base variant; S5c root cause (why the runtime exhibit fill skipped live chat decks) still open | COMPLETE (post-gen slide validation + auto-regen + tests + S5c) |
| 7 Editable visuals | PPTX export is already native text/shapes/pictures (`proxy/gold_pptx_export.py`); D17 diagrams are images by design; infographic-exhibit BASE already renders steps/stats as native text | EXTEND (visual-type decision layer + labels + convert-to-editable) |
| 8 Inline editing | NONE in the HiC preview (only design-desk NxtDocViewer has contenteditable); slides are payload-driven so the write-back seam from `_userImagery` generalizes | NEW (the Slide Edit Layer, keystone of the program) |
| 9 Export uplift | ONE native exporter, per-variant masters; no export-options UI, no pre-export QA dialog, no presenter/talking-points variants | EXTEND |
| 10 Freeform chat | Hashtags dominate routing (`hashtagParser.ts`, matchSkills short-circuit); `compileDirectivesSmart` already proves the model-parse pattern; chat grounds via manifest but cannot MODIFY artifacts | NEW intent router + artifact-modifying actions |
| 11 Anti-genericness | The strongest existing area: slidePostProcessor 350+ bans, auditGate spine, critic passes, action-title rules | SURFACE (user-facing deck-wide passes + scorecard; almost no new detection code) |
| 12 Text regen parity | Nothing per-field; imagery chips are the UX precedent | NEW on top of WS-4 |

Two requirement tensions, resolved now so implementation does not wobble:
- PDF 5 asks for AUTOMATIC image prompts; the owner's 2026-08-14 mandate made the user
  the author after the auto-fill disaster. Resolution: the system AUTO-AUTHORS (prefills
  every slot with the content-derived suggested prompt as a pending spec, visible on the
  chip) and the deck ships with ONE explicit "Generate all visuals" button plus the
  existing per-slide chips. Generation never fires without a user click. Style tokens
  are always the real lane tokens (`photo-background|photo-scene|photo-portrait|line`),
  never invented ones (lesson L1).
- PDF 7 says avoid baking text into images; the standing rule says on-image overlays
  must be baked for PPTX fidelity. Resolution: strategic/editable text NEVER lives
  inside an image at all; it renders as native text regions layered above the picture
  (the gold exporter already layers regions). Baking applies only to decorative
  in-image content that is not meant to be edited.

## 2. Workstreams

### WS-1 Engagement workspace: data model, persistence, library speed
(PDF 1 + 4; build order 1; UV phases 2, 4)
- Define the Engagement record (converged onto `sessionService.ts` + the wiki manifest,
  per CONVERGE/DELETE): id, client name/context, transcripts (raw + anonymized ptr),
  anonymization map ptr (non-exportable), synthesized goals, research objective history,
  selected packs, KL selections, run manifests, theme sets, deck payload snapshots,
  email drafts, export records.
- Persist to `hic-workspace/engagements/<id>/engagement.json` via the proxy (same
  volume-mount durability as the wiki); the SPA restores the active engagement on load
  (kills the App.tsx no-restore gap).
- Precompute at run end an `engagement-summary.json` (title, source count, themes,
  last goal, last deck, manifest status) so the library screen reads ONE small file per
  engagement; lazy-load full detail on expand.
- Library UX: skeleton states, progressive copy ("Loading saved engagements" /
  "Checking prior research manifest"), per-section failure states with retry.
- Telemetry: proxy middleware stamps duration on library/engagement/theme/blend/
  synthesis requests into `hic-workspace/telemetry/latency.jsonl`; SPA logs
  first-paint-to-interactive for the library.
- GATE: library opens with visible feedback immediately; engagement restore survives a
  hard refresh; tsc + vitest + spa-smoke + owner checkpoint.

### WS-2 Transcript intake: anonymize, summarize, goal generation
(PDF 2 + part of 1; build order 2; UV phases 1, 2, 3)
- Reuse the existing Upload Research Data control on the landing page; add an
  "Anonymize transcript" checkbox beside it.
- Proxy `POST /api/intake/anonymize`: model pass (routed via `artifactModelFor`,
  structured output) extracts PII entities (people, orgs, emails, phones, addresses,
  client-identifying product names); deterministic replacement with stable pseudonyms
  (Person A, Client Org); the mapping table is stored in the engagement record flagged
  non-exportable and NEVER enters the corpus, chunks, or manifest. Only the anonymized
  text is ingested downstream.
- Anonymization summary panel: what was masked, counts by category, side-by-side
  spot-check; user confirms before ingestion.
- Auto-synthesis on ingest, written INTO the manifest as first-class provenance-typed
  chunks (transcript source type): explicit client goals, stakeholder context, implied
  research needs, key business challenges, candidate research angles, non-sensitive
  thematic phrases, and risk flags for content that must not appear verbatim in client
  deliverables (the flags feed the WS-7 pre-export quote scan).
- "Generate Research Goal from Context" button beside the Research Goals textfield:
  synthesizes the focused objective from transcript summaries + optional public context
  (a free-text field for website/LinkedIn paste); output lands in the field for the
  user to edit. Extends the existing prompt-enhancer seam at App.tsx ~1301.
- GATE: PDF acceptance walk (upload -> anonymize -> review -> goal, plus optional
  public context) live in the app; a seeded-PII fixture transcript proves zero PII
  reaches chunks, manifest, or any generated output.

### WS-3 Explicit run modes + blend audit
(PDF 3; build order 3-4; UV phases 2, 4)
- Replace the implicit `window.__hicBlendMode` flag with an explicit three-mode
  selector rendered at run setup: REUSE ONLY (cached corpus, zero fresh calls) /
  ADD FRESH (blend: cached + new, deduped) / FULL RERUN (ignore cache).
- Pre-run confirmation card: "This run will reuse N cached items from <engagement>,
  query M fresh sources, and re-synthesize themes" with per-mode cost implication.
- Post-run diff, persisted in the run manifest and shown in chat: reused count, fresh
  count, duplicates collapsed (the merge authority already computes these), themes
  carried vs new.
- Delete the window-global; the mode lives on the engagement record + run manifest so
  it is auditable after the fact. Honors the standing CLEAN-GROUNDING rule (cached
  grounding only by explicit choice).
- GATE: Isabelle's original confusion scenario re-run: continuing an old pack with
  "add current trends" shows exactly what re-ran; REUSE ONLY provably issues zero
  collection calls (proxy telemetry as the check).

### WS-4 The Slide Edit Layer (keystone): inline text editing, inspector, locks, versions
(PDF 8 + 12; build order 10; UV phases 7, 9)
- Generalize the `_userImagery` payload-edit seam into ONE contract: a per-archetype
  TEXT_SLOTS map (mirror of `USER_IMAGE_SLOTS` in `services/userImagery.ts`) naming the
  editable payload fields (title, subtitle, body, bullets, callouts, captions, quote,
  footer) and their stage rects. Edits write the payload field, the SlideCanvas iframe
  re-renders from the payload, and export automatically carries them because stage HTML
  and PPTX both render FROM the payload (zero new export work; UV phase 9 preserved).
- Click-to-edit in the preview: click a text region -> inline editor overlay at the
  slot rect (same interaction grammar as the imagery chips, so the deck has ONE editing
  language).
- Right-side slide inspector: all content fields, visual prompt + style, layout
  template picker (archetype swap re-composes from the same payload), client-specificity
  level, source-grounding notes.
- AI rewrite actions per field and per slide (routed via `artifactModelFor`; anti-slop
  scrub applies to every returned string): concise / executive / less generic / more
  client-specific / remove client references / conversational-for-live; regenerate
  slide copy only; regenerate from selected themes; without transcript content; for
  live presentation vs emailed deck.
- Locks: `_locked: { slide?, text?, visual? }` on the payload; every deck-wide pass
  (WS-5 visuals, WS-6 chat actions, WS-7 quality passes) MUST skip locked scopes.
- Version history: payload snapshot ring (last ~20 per slide) in the engagement record;
  undo restores a snapshot; manual edits are never overwritten without explicit
  user consent (a "regenerate will replace your edit" confirm).
- Self-improvement hook (UV phase 7): every manual text edit is logged as an
  edit-learning signal (old -> new, field, archetype) feeding the existing constraint
  learner; the users teach the generator whenever they fix its copy.
- GATE: edit text -> re-render -> export -> the PPTX carries the edit as native text;
  lock -> deck-wide pass -> locked slide untouched; undo works; owner checkpoint.

### WS-5 Visuals by default + blank-slide gate completion + editable-visual layer
(PDF 5 + 6 + 7; build order 7-9; UV phases 8, 9)
- Auto-author every slot at deck compose time: `suggestPrompt()` output becomes a
  visible PENDING spec on each chip (chartreuse-dashed "Suggested" state); deck-level
  "Generate all visuals (N)" runs them through the one resolver with real style tokens;
  per-slide chips keep the generate-now flow. No silent generation (owner mandate).
- Granular style choices on the chip (PDF: "the current abstract geometric style is
  awful"): Realistic photo (scene/portrait/backdrop picked by slot), Flat illustration
  (line), Infographic (native diagram lane), Iconographic (token-icon lane). Each maps
  to an EXISTING lane; no new invented tokens.
- Post-generation slide validation (before preview): title present; body or visual
  present; rendered text length above the fail-visible floor; required image fields of
  the chosen variant populated; bounding-box sanity (no region outside 1920x1080, no
  overlap between text and image rects beyond the scrim contract). Failing slides
  auto-regenerate once with an anchored repair prompt, then show a visible
  "regenerated for missing content" notice (never a silent void).
- Close S5c properly: trace WHY the runtime exhibit resolver skipped live chat decks
  (the fail-visible fallback currently masks it); fix the fill or gate the archetype.
- Visual-type decision layer + labels: every visual in preview and inspector is tagged
  Editable (native text/shape regions), Generated image, Chart, or Static graphic;
  "Convert to editable layout" renders the native-text base variant where one exists
  (infographic-exhibit already has it; add base variants for the other diagram
  archetypes where feasible).
- Automated tests per slide class (image-only, text-only, title, transitional,
  appendix, client-quote, embedded-graphic) + "Report broken slide" control writing a
  structured report into the engagement record for triage.
- GATE: a fresh #slides deck arrives with every slot pre-authored; Generate All fills
  them; zero blank slides across the test deck classes; preview == export on a
  10-slide visual deck (export-render-verifier pass).

### WS-6 Freeform engagement chat: intent router + artifact modification + new outputs
(PDF 10 + email from 1; build order 5, 11-13; UV phases 5, 6)
- Intent router: extend the `compileDirectivesSmart` structured-output pattern into a
  general classifier (cheap model, temp 0, fail-open to plain chat) that maps
  natural-language messages onto the SAME executors the hashtags invoke: refine goal,
  add trends (triggers WS-3 ADD FRESH), deck edits (concise/visual/regen slide),
  generate email, remove transcript quotes, compare with prior research, and the
  artifact hashtag set. Hashtags remain as shortcuts; they stop being the only door.
  Routing still resolves models ONLY through `artifactModelFor` (UV phase 6).
- Engagement context in every chat turn: current goal, packs, themes, generated-
  artifact index (decks, emails, exports with ids), slide edit history, transcript
  summary, client context. Injected as a compact manifest-derived block, not bulk raw
  text (anti-RAG, UV phase 5).
- Artifact-modifying actions: chat can mutate the ACTIVE deck payloads through the
  WS-4 edit contract (respecting locks), with "Apply to all slides" / "Apply only to
  this slide" controls on the resulting proposal.
- Grounding preview on responses: source chips (transcript / research / slides /
  themes / public context) per the existing citation-pointer machinery.
- Assistant posture: proposes expert perspectives from the research by default, asks a
  targeted question only when genuinely blocked; retains user answers in the
  engagement record.
- New output types, all through the one composer engine + anti-slop scrub: client
  follow-up email (grounded in the generated deck + research summary, includes the
  what-NXT-can-do summary), meeting intro notes, executive summary, talk track,
  presenter notes, concise follow-up. Rendered as chat prose artifacts (copyable),
  persisted to the engagement record.
- GATE: the PDF acceptance walk: natural-language feedback produces a specific artifact
  change; an email generates from a real finished deck; no hashtag knowledge needed for
  the common tasks; owner checkpoint.

### WS-7 Quality passes surfaced + export uplift
(PDF 9 + 11; build order 6, 14; UV phase 9; two-pass QA order per .claude/CLAUDE.md)
- Deck-wide user-facing passes wrapping the EXISTING detection stack (auditGate,
  slidePostProcessor, action-title + actor + semantic-coherence rules): Make writing
  sharper / Make less AI-generated / Make more consultative / Make more concise /
  Improve narrative arc (client context -> market shift -> insight -> implication ->
  NXT perspective -> next step). Each pass = detect (existing rules) + rewrite (routed
  model) + re-gate; locked slides skipped; every pass logged to version history.
- Slide scorecard in the inspector: title-makes-a-point, body-supports-title,
  visual-supports-message, recommendation-clarity, unsupported-claim flags (claim
  ledger types), layout-sameness across the deck.
- Pre-export quality check dialog: blank slides, non-editable visual count,
  client-specific references, verbatim transcript-quote scan (fed by WS-2 risk flags),
  broken images, overflow text; each with jump-to-slide.
- Export options: PowerPoint (unchanged native path), PDF client-send, Presenter
  version (with notes), Internal talking-points doc. All from the same stage-HTML
  authority; no second render pipeline.
- GATE: a deliberately sloppy fixture deck visibly improves through each pass without
  violating locks; export dialog catches every seeded defect; exported PPTX text still
  fully editable.

### WS-8 Telemetry + acceptance sweep
(PDF 4 tail + build order 15)
- Latency dashboards from the WS-1 jsonl (library open, engagement detail, theme load,
  blend setup, synthesis start), rerun counts by mode, and the external-workaround
  metric the PDF names: how many engagements complete transcript->email fully in-tool.
- Final acceptance: walk EVERY acceptance-criteria bullet in the PDF against the live
  app with the owner; unmet items become the punch list before any branch merge.

## 3. Sequencing and discipline

Order: S0 -> WS-1 -> WS-2 -> WS-3 -> WS-4 -> WS-5 -> WS-6 -> WS-7 -> WS-8.
WS-4 before WS-5/6 because the edit contract + locks are what visual passes and chat
mutations must respect. This tracks the PDF's suggested build order 1-15 with
converged steps (6+10 inside WS-4; 7-9 inside WS-5; 11-13 inside WS-6).

Every workstream ends the same way (standing rules, non-negotiable):
1. `npm run typecheck` clean + vitest green (+ new tests for the workstream).
2. `docker compose -f docker-compose-all.yml up -d --build research-generator`
   (+ research-proxy when proxy changed); hard refresh; spa-smoke.
3. OWNER CHECKPOINT in the live app against that workstream's PDF acceptance bullets.
4. Commit ONLY on explicit approval; push ONLY to `selfimprovement`, ONLY the v2 branch.

Standing constraints that bind every workstream: anti-slop on every generated string
(including emails and rewrites); em-dash ban; no naked numbers; EVERY SLIDE KEEPS IMAGE
PLACEHOLDERS AND GENERATE FUNCTIONALITY (owner mandate 2026-08-14); user selections
trump auto-ranking; quality floors met upstream, gates never relaxed; proof = the
running app, never a harness render.

## Status 2026-08-14 (first implementation pass, branch hic-v2-workspace-2026-08-14, local, NOT pushed)

Owner modifications to the plan (2026-08-14, binding): (1) RETAIN the current image
editing exactly as shipped until the owner finishes robustness testing - no changes to
the imagery chips/slots this pass (WS-5's image work is DEFERRED behind that test);
(2) inline TEXT editing proceeds in full; (3) chat fluidity is a first-class bar;
(4) minimal seamless UI over feature chrome.

SHIPPED THIS PASS (tsc clean; 81 files / 710 tests green; rebuilt at :5011):
- WS-4 COMPLETE (UX revised same day per owner: TRUE INLINE, the flip editor is
  DELETED): click any text element on the slide preview; matchFieldByText maps the
  clicked element back to its payload field (case-insensitive + containment, so
  CSS-uppercased renders still match); the element outlines chartreuse and a toolbar
  appears under the slide (bottom-center in fullscreen) carrying the editable text,
  three auto-fetched AI alternative phrasings (suggestFieldRewrites, flash, scrubbed;
  click places one in the editor, Apply commits), Enter=apply Esc=cancel, UNDO EDIT
  in the label row, LOCK/UNLOCK unchanged. services/slideTextEditing.ts owns the
  contract (enumerate/apply/undo/match/suggest); SlideCanvas iframe gains pointer
  events + a click listener re-attached per srcDoc load; wired in BOTH desks via
  onUpdateSlide. Edits survive refine + export (payload-rendered).
- WS-6 CORE: services/chatIntentRouter.ts (regex pre-filter -> flash classify ->
  fail-open; deck_edit runs applyDeckTextPass through the WS-4 contract skipping
  _locked slides, per-slide parallel, per-slide failure isolation; client_email +
  slide_narrative draft via artifactModelFor through callRoutedText). CorpusChatPanel:
  intent block before plain-chat dispatch + contextual next-step chips above the
  composer (narrative when corpus exists, email + concise-pass when a deck exists;
  chips PREFILL the input, nothing fires unseen).
- WS-1 SLIM: sessionService.listSessionsStrict; stale-while-revalidate library cache
  (instant paint from localStorage, background refresh), skeleton cards, failure +
  retry states, refresh hint, LAST ACTIVE badge + sort-first (hic_last_session_slug
  set on save and load), library_open latency console telemetry.
- WS-2 COMPLETE (client-side through existing proxy chokepoints; no proxy changes):
  services/transcriptIntake.ts (model+regex PII extraction, stable pseudonyms shared
  across files, replacement map NEVER persisted, anonymization ledger; opus-routed
  transcript synthesis with the seven signal fields incl. riskFlags; focused-goal
  generation honoring the user's own hint + optional public context). Landing UI: one
  row (Anonymize uploads checkbox + public-context input + GOAL FROM UPLOADS button)
  + the TRANSCRIPT SYNTHESIS panel with inspectable anonymization summary and
  never-verbatim risk flags. Anonymized text replaces parsedText IN PLACE so the
  corpus only ever sees the anonymized version.
- WS-3 COMPLETE (visibility over new machinery): all three run modes now announce
  themselves ([RUN MODE: REUSE ONLY / ADD FRESH / FULL FRESH RUN] with switch hints),
  __hicRunMode global for auditing, researchFabricOrchestrator.getLastMergeStats(),
  and the [RUN DIFF] post-run event: reused vs uploads vs fresh vs duplicates
  collapsed vs final unique count.

DEFERRED (next passes): WS-5 image work (owner is robustness-testing the current
imagery system first; blank-slide validation + S5c root cause still queued), WS-7
(quality passes UI + export options + pre-export QA dialog), WS-8 (telemetry
dashboards + full acceptance sweep), engagement-record convergence beyond the slim
WS-1 (the full engagement.json entity), proxy-side request telemetry.

GATES PENDING: owner checkpoint in the live app (hard refresh :5011), then commit +
push to selfimprovement on approval.

## 4. Open items carried into this program from the imagery pivot
- S5c root cause (exhibit fill skipped in live chat decks) -> WS-5.
- S5d block-quote 900x200 sliver redesign (Figma canon first) -> WS-5.
- S5a designed per-archetype slots replacing the generic header scene -> WS-5.
- S4 export re-verification on universal sceneImage slots -> WS-5 gate.
- Owner checkpoint + push of the current universal-slots build -> S0a.
