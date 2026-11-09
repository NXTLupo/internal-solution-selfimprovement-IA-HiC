# Hashtag deliverable uplift (2026-10-05)

Owner directive: #presentation was broken (screenshot: "Could not compose presentation: Gemini-compat API 502 ...
All connection attempts failed"). Upgrade and elevate generation across ALL analyst-chat and designer-chat hashtags,
swap to the latest models as appropriate, upgrade reasoning plus second-brain wiki/manifest/theme/citation inclusion,
and test everything as a normal user. Model rule (owner, binding): **flash models are for SPEED, Opus 5.5 is for
REASONING** (memory `feedback_always_opus_5_5_except_flash`).

Unified-vision phases advanced: 5 (anti-RAG manifest-first retrieval in #presentation), 6 (one routing authority,
Opus for reasoning, cross-provider fallback), 7 (gates repair, never refuse), 3/4 (provenance-readable citations).

## Root causes found

| # | Finding | Evidence |
|---|---|---|
| R1 | Docker Desktop's container network stalled: every proxy call to Google AND Anthropic hung; `docker version` timed out. Immediate cause of the screenshot error. | probes from the proxy: gemini-compat 000 after 40s, anthropic 000 after 60s; host reached Google in 0.25s |
| R2 | #presentation defaulted to gemini-3.5-flash; its Claude fallback was a tool-less `claude-sonnet-4-6` single shot, gated by a regex that only matched "HTTP 50x", so "Gemini-compat API 502" never failed over | `hashtagParser.parseModel`, `narrativeComposer._isComposerExhaustionError` |
| R3 | The Opus chat path (#personas #themes #recs #case-study #slides) had NO cross-provider fallback | `corpusChatService` callClaude branch |
| R4 | #strategy without #slides ran on flash (not in ARTIFACT_TPL) | `isArtifactGenerationMessage` |
| R5 | #mindmap / #brief-dialog hardcoded `claude-sonnet-4-6`; their fallback (withResilience) fired on 429 only | `mindMapArchitect.ts`, `briefDialogService.ts`, `isThrottleError` |
| R6 | #proto brief Pass 1 had no provider fallback | `prototypeBriefGenerator.callOpusJson` |
| R7 | Designer rejected #gap #audit #compete #recs #report #explainer #case-study as "out of scope" (vocabulary vs engine kind names) | `DesignDeskChat.tsx` |
| R8 | One Opus failure committed the whole engagement to Gemini for every later reasoning deliverable | `deliverableModelRouter.reorderChainByCommitment` |
| R9 | #presentation retrieval was embedding RAG, never the engagement manifest; decks cited one upload, 0 external | `narrativeComposerExecutor.search_corpus` |
| R10 | Coverage contracts put EVERY board theme (516 on the NU board) in the must-carry universe: #presentation 118 sections, #themes 113 "Further themes the research surfaced" slides, #gap 37 appendix slides | `COVERAGE_SPECS` |
| R11 | #journey rendered "No journey stages.": the model emitted the older `phases`/`actors` shape, the renderer reads `stages`/`lanes`; #journey also loaded the Bitner `service-blueprint-mapper` skill | `slideToStageHtml.renderJourneyMap`, `artifactCatalog` |
| R12 | Attribution debris on slides: empty "()", doubled "(Source: Client Uploads)", truncated "(Source: reddit-deep", raw file names and "Client Uploads" as sources, " · · " empty list entries | live QA batch 1 |
| R13 | Meta titles not caught: "Research identifies ...", "The evaluation identifies ...", "The launch strategy outlines ..."; UI chrome "Thesis this deck argues" | `titleGate.evaluateTitle` |
| R14 | `__hicResearchGoal` was read by the chat wiki tool but never written: every tool-driven retrieval ranked with an EMPTY objective | `corpusChatService.executeFetchWikiArticlesTool` |
| R15 | The chat deck path never loaded the wiki FRAMEWORK SPECIFICATION / ANTI-PATTERNS (`loadGenerationContext`) | `corpusChatService.sendChatMessage` |
| R16 | Embeddings 500 ("Name or service not known") after the Docker restart: `social-research-backend` (the embed host) was not running | `/api/embed`, `EMBED_LOCAL_URL` |

### Found in live rounds 3 and 4

| # | Finding | Fix |
|---|---|---|
| R17 | Every `content[0].text` reader got an EMPTY string under adaptive thinking (content[0] is a thinking block): #mindmap / #brief-dialog "AI output unrepairable: empty input", #deep-research failures, plus ~10 utility services silently empty | `anthropicText(data)` in `claudeModelPolicy.ts` joins text blocks; every reader routed through it |
| R18 | Opus 5.5 rejects `metadata.seed` (HTTP 400 on #mindmap) | removed; both request normalizers keep only `metadata.user_id` |
| R19 | MY regression: the attribution cleaner ran over WHOLE raw replies via `stripQAAnnotations`, ate the closing quote of a JSON string inside a :::slide fence, the slide failed to parse (#arch "No architecture layers.", #journey crash) | cleaner runs per FIELD only (`stripQAAnnotationsDeep`); quotes consumed only as a pair; regression test parses a real fence |
| R20 | #journey crashed the view: a lane cell arrived as an object, `(x || '').trim` threw | normalizer coerces every journey text slot to a string; `notEngaged` takes unknown |
| R21 | Journey payloads arrive as `phases/actors`, or as a one-lane journey under `serviceBlueprint`; principles as a bare array; recommendation as `title/description`; arch nodes as `label` | `slideShapeNormalizer` at parse AND at the render chokepoints (`slideDataToStageHtml`, SlideCanvas), so saved sessions render too |
| R22 | Design Desk failed to load: DESIGN.md served with CRLF (Windows checkout), LF-only frontmatter regex | `parseDesignMd` normalizes line endings |
| R23 | EVERY NXT engine artifact rendered UNSTYLED (Designer #persona/#gap/#case-study/#recommendations): `proxy/_ds_payload.json` (component CSS + JS + icon sprite) was missing and the loader failed silently, injecting an empty `<style id="nxt-system">` | `scripts/build-ds-payload.py` rebuilds it from `public/nxt-design-gallery/`; loader now logs an ERROR when missing |
| R24 | #deep-research renderer `.join`-ed optional plan arrays | every plan array guarded |
| R25 | Export coverage re-check reported "35/27 of 40 items no longer carried" on clean exports | checks every exported slide and reports only items some slide carried before export |
| R26 | Dense native exhibits clipped cells and rows | stage fit script zooms the canvas down (floor 0.72) until nothing overflows; the PPTX exporter scales font size/line height by the effective zoom |
| R27 | Raw `[articles/...md#c0]` pointers in #brief-dialog HTML and #presentation source lines; "(Source: ...)" inside titles; empty "()" left after pointer removal | `stripPointerBrackets`; title citation strip in the normalizer; pointer scrub tidies parentheses |
| R28 | "A 10-point ... gap" shipped as "A -point ... gap" | `softenFigures` handles hyphenated numeric compounds |
| R29 | #mindmap used the session goal as its subject and every board theme | prompt is the subject; the 40 most relevant themes feed it |
| R30 | Escape in the Designer composer closed the Design Desk | Escape from a text field never closes it |
| R31 | #journey owner skill was the Bitner `service-blueprint-mapper` | `journey-illustrator` registered in the skill manifest and made the owner |

## Fixes (all in code, offline-green: tsc 0, vitest all pass, generic-rules / orphans / template parity pass)

- R1/R16: Docker Desktop + WSL restarted; HiC and `social-research-backend` brought up via `docker-compose-all.yml`.
  Proxy `/api/ai/gemini-compat` retries a connection that never opened twice with backoff.
- R2: composer default `CLAUDE_REASONING_MODEL` in a native Anthropic tool loop (`runAnthropicLoop`: same tools,
  executor, citation tracker; convergence steered by the tool list since Opus 5.5 rejects forced tool_choice).
  Failover runs the SAME grounded loop on the other provider; matcher covers API 50x, timeouts, connection failures.
- R2 quality gate: `presentationQualityIssues` sends a submission back once when no external research was retrieved
  or a section title carries a bare figure.
- R3: Opus chat path fails over to gemini-3.1-pro-preview (the strongest non-Anthropic reasoning model).
- R4: catalog deck/HTML directives route through the routing authority (`messageTargetsArtifact`).
- R5/R6: Opus 5.5 via the constant; `isProviderUnavailableError` (429 OR 5xx/network/timeout) triggers fallback;
  reasoning fallbacks are gemini-3.1-pro-preview, never flash.
- R7: Designer tag-to-kind map + a real `case-study` engine kind (proxy skill path `case-study-analyst`).
- R8: a chain headed by the Claude reasoning model is never reordered by an engagement commitment.
- R9: `manifestChunksFor` leads every composer search with the engagement's objective-ranked manifest chunks,
  readable per-chunk source names; ranked wiki RAG fills the rest.
- R10: `themeCap` per kind, ranked by term overlap with the request + objective; stated items and feedback never
  capped; meeting action items (`isAdminTask`) and the vendor's own name as an "area" excluded; theme fill cards
  titled by their strongest theme; no "Research Assembly Board" placeholder source.
- R11: `slideShapeNormalizer` maps phases/actors onto stages/lanes for every parsed slide; `journey-illustrator`
  registered in the skill manifest and made #journey's owner skill (#blueprint keeps the Bitner mapper).
- R12: `cleanAttributionDebris` inside `stripQAAnnotations` (runs on every chat slide via the artifact chain).
- R13: title gate `process_subject` finding (failing; the gate repairs it); the name-number exemption shared with the
  rule engine ("Student 360" is a name, not a figure); UI label "Governing thesis".
- R14/R15: the objective is set each chat turn; artifact turns inject the wiki framework + anti-patterns.
- UI: image-slot chips show on hover only (an editor affordance, not slide content); the run-cost chip moved
  bottom-left (it covered the composer).

## Live verification (user-level, Playwright, NU PRD session)

- #presentation after R1+R2: composed on Opus 5.5 in 129s, every rule passed; exposed R9/R10 (fixed after).
- Batch 1 (#personas #themes #recs #case-study #slides #strategy #journey #gap): all 8 generated, no errors, right
  models; exposed R10-R13 (fixed after).
- Batch 2 (re-test + remaining hashtags): see the session report.

## Live user-level verification: nine rounds (Playwright, NU PRD session, Analyst + Designer chats)

| Round | Items | Outcome |
|---|---|---|
| 1 | 8 Analyst | all generate; appendix bloat, empty journey, attribution debris (fixed: R10-R13) |
| 2 | 10 | #mindmap 400, :5014 down after Docker restart, arch names (fixed: R18, renderer up) |
| 3 | 14 | content[0] empty text, my JSON regression, Design Desk CRLF (fixed: R17, R19-R22) |
| 4 | 11 incl. Designer | Designer unstyled (missing `_ds_payload.json`), blank slides (fixed: R21, R23) |
| 5 | 15 incl. #prd | #prd works end to end (Opus 5.5, workbook, brief, rule receipt); timeline/org/theme shapes (fixed) |
| 6 | 10 | org, mindmap, meta-themes, deep-research fixed; #playground script broken by a pre-existing unconditional `()` strip (fixed) |
| 7 | 13 | 12/13 pass; #org wrapper-less tiers (fixed) |
| 8 | 12 | compete/blueprint shapes; repair rewrote verbatim quotes (fixed: quote fields immutable) |
| 9 | 9 | 9/9 pass; quotes stable through repair; no broken number phrases, no internal labels, no pointers |

Final sweep after round 9 across 791 rendered slide frames: 0 "Client Uploads", 0 empty "()", 0 em dashes.

Additional root causes found in rounds 5-9 (all fixed): R32 `stripModelNameAsSource` stripped every `()`/`[]` from raw
model output including scripts (pre-existing; broke #playground JS); R33 the artifact repair pass rewrote verbatim
quotes (now immutable); R34 timeline/org-chart/theme-detail/competitive/blueprint/recommendation field-shape variants
(normalizer); R35 #meta-themes read the wrong themes.json shape (scanned 0 engagements); R36 "Comprehensive Learner
Record" lowercased by slop substitutions (proper nouns now exempt); R37 internal labels, file stems and data files as
sources (render tidy + proxy text-node relabel); R38 #presentation source count read 0 (now from carried citations) and
packaged-chat decks cited HiC's own deliverables (quality gate).

## Weak items pass (2026-10-06, rounds 10-13)

Fixes, each traced to a live root cause:
- W1 dense-slide headings: `trunc()` keeps short fields within 60% slack; SIGNALS heading budget 48 -> 72. Live: fixed.
- W2 #recs time and blank reply. Round 12 measured 1460s and an EMPTY reply: the recommendation-architect skill's legacy
  `thinking: max` drove Opus 5.5 at effort max on a 565K-char prompt, the 128K output budget ran out mid-fence, and the
  client job deadline (600s) expired while the proxy job was still running, so the retry loop submitted the identical
  call again. Fixes: a skill hint tops out at xhigh (`effortFromSkillHint`); the job poller keeps waiting on a job the
  proxy reports as running (hard ceiling 45 min) instead of resubmitting; a truncated fence retries once at medium;
  grounding trimmed to a 240K-char budget (THEMES and SOURCE ARTICLE INDEX first); artifact history compacted.
- W3 #prd scope and project work: module requests partition the ledger by focus terms; engagement obligations and
  admin tasks are Won't rows without a model batch. Generated requirements whose subject is an engagement party
  (derived from the ledger: subjects that take project verbs, product nouns excluded) or a project team are demoted to
  Won't unless the verb builds product. Round 12 replay of this rule on the live workbook: 21 of 21 project-work Musts
  on the Requirements sheet and 35 of 35 on Engagement Obligations caught, 0 product rows flagged.
- W3b Gaps sheet: 44 of 114 gaps read as the bare text "3" because gap-matrix rows carry `gap` as a numeric delta;
  numeric fields are never names now (capability + description).
- W4 #case-study peers: a Flash call names the peers, primary-docs collects their own pages. Round 12 still collected 0:
  the planner's 2000-token cap left ~200 chars of JSON after Flash's thinking. Cap 8192 and institution-aware rules;
  offline probe now plans uwaterloo.ca, drexel.edu, uc.edu with queries.
- W5 quotes not verbatim: span snapping, deck-page and corpus re-pointing (round 12: 18 -> 7 flagged), plus the chunks
  the model was actually shown are matched in memory first (`promptedChunkTexts`); the remaining 7 were verbatim on a
  page the deck never cited.

Live results after the weak-items pass (rounds 13-14, NU PRD session):
- #recs: one Opus 5.5 call, ~8 min (was 13-24 min with a duplicate call and, in round 12, a blank reply); full content.
- #case-study: primary-docs wrote 18 pages for Waterloo, Drexel and Cincinnati (was 0).
- #personas: 74 claims checked, 13 flagged (was 65/22); "not found verbatim" 5 (was 18 at the start of the pass).
- #prd: ~16 min (961-1129s; was ~36 min at the start of the pass). 1848 requirements: Must 289, Should 344, Won't 1215;
  Engagement Obligations sheet 0 Musts (was 35); party-led Musts on Requirements 2 (was 81), both caught by the
  widened role rule after the run (replay: exactly R-366 and R-724, no product row); Gaps sheet 0 bare numbers (was 44).
- Still open: 5 r/internships quotes the model attributed to the wrong thread with no matching chunk in its prompt; 80
  "naked number" PrdAir validation warnings (internal fields, logged not rendered).

## Attachment purpose is a MODEL decision (2026-10-20, owner directive)

Live: `create a #slides #NXT presentation from the attached deck content` produced "Analyzed 1 chat attachment: 79
feature and feedback items extracted into the engagement ledger". Root causes: (1) CorpusChatPanel ran
`ingestUploadedDocuments({surface:'analyst-chat'})` on every attachment without reading the request; (2)
`wikiService.runUploadAnalysis` had exactly one analyzer, the PRD ledger extractor (Opus calls, 4 concurrent);
(3) the same hook wrote the deck into the engagement corpus permanently. The 2026-10-02 "uploads always thoroughly
analyzed" rule had been implemented as "always mine requirements".
Fix: `services/attachmentIntent.ts`; a Flash call reads the message (hashtags included) plus a glimpse of each file
and returns role / persistToCorpus / extractLedger / note; the panel carries that out (`analyze` passed through) and
posts the model's one-line note instead of the ledger receipt. Fallback on failure: ground this turn only.

Images per slide (same report): the deck generated what the slot registry defines (cover/agenda scene via
/api/ai/illustration, native infographic-exhibit panel). Only cover, agenda, section-divider, numbered-themes items,
role-needs portrait, infographic-exhibit, scene, block-quote/org-model carry image slots (artifactImageSlots.ts;
owner adjudication 2026-06-28 "scenes only where they fit"); stat-row, problem-diptych, flow-arc, evidence-table,
milestone-timeline, means-matters, comparison-panels and aggregate-roadmap are native visual archetypes with no photo
slot. An image on every slide is a registry + composer-variant + export change, not a bug.

## Open (not done in this pass)

- Long text in dense native slides is still cut at fixed character budgets in places ("Centralized governance shifts
  employer"): the renderer truncates by characters, not by fit, on SIGNALS headings and some matrix cells.
- #case-study for "peer universities" honestly narrows to Northeastern when the corpus has no peer case material; it
  should say what external sources to add rather than narrate the gap ("Peer evidence to source next").
- #recs on Opus 5.5 takes 13-15 minutes on this 920-item engagement; #prd about 36 minutes and over-scopes (program admin
  tasks become requirements).
- Unverified-claim ledgers still flag a share of persona/theme quotes as "not found verbatim"; the generation should
  earn more verified quotes (provenance lock is working; the quote extraction is the lever).

- Citation mix in chat decks still leans on client documents for this engagement. Retrieval already caps uploads at
  40% of auto picks; the model's citation choice is the remaining lever (a deterministic external-share gate).
- Designer #journey forwards only `llm_model` to the Journey Mapper service (no model chain).
- Unverified-claim ledgers flag many claims (e.g. 39 of 55 on #personas); that is the claim ledger working, but the
  generation should earn more claims verified.
