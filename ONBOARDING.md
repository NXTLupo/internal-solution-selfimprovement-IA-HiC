# HiC Research App — Handoff Guide for the Next Engineer (2026-06-16)

You are taking over work on **Humans in Control (HiC)**, the most actively developed service in the
NXT Humans Intelligence Augmentation Suite. This guide tells you (1) where to look to understand the
system, (2) the unified vision we are building toward, (3) what was done recently, and (4) the
**current broken state** — pervasive AI-slop writing, layout collisions, and a render pipeline that
**bypasses the Figma component/manifest system**. Read sections 4 and 6 first; they are the fire.

> **Git state:** branch `self-improvement-ia-2026-05-29`. **NOTHING from the recent session is
> committed** — the working tree has ~50+ tracked changes staged for review. Never merge to main;
> never commit without the owner's explicit approval. Build → test → commit, in that order.

---

## 0. How to use this doc
- **Orient:** §1 (map), §2 (vision), §5 (how a deliverable is actually generated).
- **Understand what's broken:** §4 (the architectural drift — render ignores Figma components),
  §6 (slop + collision + pipeline issues, with reproducible evidence).
- **Continue the work:** §7 (what's uncommitted), §8 (the eval harness), §9 (landmines), §10 (the
  open decision the owner must make before more render work).

---

## 1. The Map — where everything lives

**Three-tier architecture** (read `humans-in-control-research/CLAUDE.md` in full first):
```
React SPA (Vite; nginx static at :5011, NO HMR — rebuild required)
   │ fetch()
Research Proxy (FastAPI, proxy/app.py, ~16–18k lines, :5012)
   ├ /api/ai/{anthropic,gemini,openai}  provider fan-out (CORS-safe; strips temperature for opus)
   ├ /api/parse-upload                  PDF/DOCX → text (PyPDF2; image PDFs → Gemini vision OCR, 240s)
   ├ /api/wiki/*                        read/write/append/write-article, manifest, chunks
   ├ /api/design-tokens?brand=NXT|NU    serves figma-tokens.json (FLATTENED per brand)
   └ /api/search/*                      200+ external sources
hic-workspace/wiki/  — markdown knowledge base + .manifest.json (base) + .manifest.journal.jsonl
```

**Three CLAUDE.md files (all load rules — read all three):**
- `CLAUDE.md` (repo root) — platform topology, ports, Docker.
- `.claude/CLAUDE.md` — NXT design system, citation protocol, **350+ banned phrases**, consulting
  frameworks, the **Quantitative Claim Rule** (no naked numbers), meta-narration ban, em-dash hard ban.
- `humans-in-control-research/CLAUDE.md` — HiC architecture, the 18 slide templates, `aiRouter`,
  the manifest-chunk-retrieval rule, the rebuild ritual.

**Critical files (sizes are why this is hard):**
| File | Role |
|---|---|
| `services/geminiService.ts` (~6,700 lines) | primary generation engine + `GenAISession`; themes, the report serializer, sharded breadth |
| `services/corpusChatService.ts` | Analyst-Desk chat; hashtag routing → force-route artifacts to `claude-opus-4-8`; manifest grounding; the new chat-insight write-back |
| `services/chunkRetrieval.ts` (~925 lines) | **manifest-chunk retrieval** (the anti-RAG core): `pickChunksForPrompt`, MMR pack, objective-ranked admission, `buildManifestCorpusForGoal` |
| `services/slidePostProcessor.ts` (~1,700 lines) | runtime anti-slop chokepoint (banned phrases, meta-narration, citation resolution, em-dash strip) |
| `services/slideToStageHtml.ts` | **the 1920×1080 slide renderer** — hand-coded HTML/CSS. THIS is the deck you see. See §4. |
| `components/slideTemplates/web.tsx` | 960×540 preview twin (React); the chat preview actually embeds the 1920×1080 stage render in an iframe |
| `components/slideTemplates/types.ts` | 18 slide-template types + `DENSITY_SPEC` (per-template item caps) |
| `proxy/app.py` (~16–18k lines) | the proxy; everything server-side |
| `hic-workspace/design-system/figma-tokens.json` | the token mirror served at `/api/design-tokens` (dual-mode NXT/NU) |
| `hic-workspace/wiki/brand/figma-node-map.md` | **the manifest** documenting the Figma components/modes (the design canon) |

**Skills / hooks / agents** (the self-improvement + quality apparatus):
- `.claude/skills/` (70+) — `manifest-chunk-retrieval`, `verbalized-sampling`, `reinforcement-inference`,
  `critic-revise-loop`, `human-voice-editor`, `nxt-visual-renderer`, `epoch-proposer`, the SkillOpt set,
  `deck-narrative-composer`, etc. **`.claude/skills/intelligence/` holds the source documents for the
  unified vision** (read §2).
- `.claude/hooks/scripts/` — `validate_*.py` (per-phase Stop gates: titles, budgets, citations,
  text-hierarchy, slide-variety, no-truncation, evidence, etc.), `precheck_slop.py`,
  `dispatch_validators.py` (the hook bus → `wiki/synthesis/hook-rejection-log.md`),
  `inject_active_constraints_and_patterns.py` (injects learned-constraints into sessions).
- `.claude/agents/` — `hic-output-qa`, `evidence-quality-auditor`, `export-render-verifier`,
  `spa-smoke-tester`, the per-deliverable `*-deliverable-auditor`s, the SkillOpt loop agents.

**Plans (read before non-trivial work):** `humans-in-control-research/plans/` — most relevant:
- `karpathy-second-brain-realignment-2026-06-15.md` — **THE realignment plan + execution log** (the
  vision, the 6-phase audit, what was fixed, the open items). Start here.
- `stranded-workflows-integration-2026-06-15.md`, `anti-slop-deck-remediation-2026-06-15.md`,
  `writing-quality-overhaul-2026-06-14.md`, `typographic-system-redesign-2026-06-14.md`.

**Memory (the durable record):** `C:\Users\JonathanLupo\.claude\projects\D--NXT-HUMANS-AI-CX-WORKBENCH\memory\`
— `MEMORY.md` is the index; the `project_*` and `feedback_*` files carry the load-bearing history
(Figma componentization, the realignment, the design-system brand facts, the anti-slop standing rules).

---

## 2. The Unified Vision — a self-improving Second Brain, NOT a RAG pipeline

Source documents: **`.claude/skills/intelligence/`** — Meta-Harness, RHO, SkillOpt, Reinforcement
Inference, Verbalized Sampling (all arXiv PDFs), the NotebookLM reverse-engineering spec + the
AI-native creative-team whitepaper (`compass_artifact_*.md`), and `second_brain.json` (the Matt Wolfe
"second brain" transcript). The eight convergent principles (full detail in the realignment plan):

1. **Knowledge is a plain, human-readable, LLM-navigable corpus** (markdown wiki + manifest index),
   NOT an opaque vector store. Retrieve by **pointers/relevance**, not embedding cosine-similarity.
2. **Selective access beats bulk-injection AND lossy compression.** Keep full experience; retrieve
   adaptively; select by difficulty+diversity or uncertainty. (Meta-Harness: full traces > summaries.)
3. **The system edits its own readable skills/harness from its own traces** — bounded,
   validation-gated, propose-and-test (SkillOpt, RHO 59→78%). Never unconditional rewrites.
4. **Adaptive inference-time compute** — re-ask only where uncertain (Reinforcement Inference);
   k diverse candidates with probabilities (Verbalized Sampling) to beat mode collapse.
5. **Strict source-grounding + citation contract + audit trail = the moat** (NotebookLM, ~3× less
   hallucination); provenance, human-in-the-loop, consent.
6. **One contract every agent consumes** — the design system / knowledge base is the single source of
   truth (tokens via manifest/MCP; skills as markdown); self-healing generate→critique→revise.
7. **Simplicity / "less is more"** — plain text, one compact skill, minimal loop, embrace
   non-determinism behind gates. Complexity is the enemy.
8. **Proactive auto-research** — plan→decompose→parallel-execute→synthesize; scheduled ingest,
   morning briefs, watchers. The system comes to you.

**Anti-RAG punchline:** traditional RAG = chunk→embed→cosine→stuff. This vision = a curated,
cross-linked, human-readable second brain the LLM navigates by pointers, grounds in cited sources, and
**rewrites its own harness from experience.** HiC has *built most of these primitives already*
(manifest-chunk retrieval, RI, critic-loop, SkillOpt, dual-mode tokens) — the problem is they are
inconsistently wired and the render path drifts (see §4).

**The Figma design-system half of the vision (read memory + `figma-node-map.md`):**
- **SINGLE-FILE, NU-AS-A-MODE (decided 2026-06-15):** everything lives in one Figma file
  `iSQhAVM7SI4QHAWB7y9C2z`. NXT and NU are two **modes** (NXT `221:0` / NU `535:0`) of one
  `NXT Brand Tokens` collection. Flip the mode to get Northeastern. 68 GOLD deliverable components +
  a `Brand/Logo · masthead` component (619:2, wordmark↔red-N monogram by mode) + the 294-component
  `#proto` library. The legacy separate NU file `z2v9Pvhg23hlljEitPBdAt` is **deprecated**.
- The intended contract: **tokens flow Figma → `figma-tokens.json` → `/api/design-tokens` → renderers**;
  the **manifest (`figma-node-map.md`) is the component canon** the agent grounds on. See §4 for why
  the render does NOT honor this.

---

## 3. NXT / NU brand facts (so you can spot drift)
- **NXT:** black `#0D0D0D` rail, chartreuse `#B8B800` accent, cyan `#00B7C3` secondary, teal `#115054`,
  rust `#CC6644`. Display font **Saira Condensed** (was Bebas), body **Archivo**, mono **IBM Plex Mono**.
  Logo = the **"NXT HUMANS" wordmark** (Figma node 22:2). 3×3 dot mark, 92px rail.
- **NU (Northeastern):** navy `#0E1626` rail, red `#C8102E` accent, NU-teal `#1D6E64`, gold `#A4804A`.
  **Single-typeface Lato** (Real Head Pro is the official primary but not installed → Lato). Logo =
  **red-N monogram** (SVG in `figma-tokens.json` `NU.logo`). White-on-red takeaway band (accessibility).
- `figma-tokens.json` is keyed by **role**, not raw Figma var names (`teal` = header/premium slot;
  `on-accent` = text-on-accent: black NXT / white NU). See `_meta.nu_provenance` in that file.

---

## 4. ⚠️ THE CRITICAL ARCHITECTURAL DRIFT — the render bypasses the Figma components

**This is the most important thing in this document.** The owner identified it; it explains the
missed logo, the collisions, and the brand drift.

**The `#slides` deck render does NOT use the Figma components — only the tokens.**
- `services/slideToStageHtml.ts` is a **hand-coded TS/CSS renderer**. It builds every slide's layout
  from CSS strings. It consumes:
  - ✅ **Tokens** (colors/fonts) via `/api/design-tokens` → `hydrateTokensFromFigma` → `TOKENS`.
  - ✅ A **logo block** from those tokens (`BRAND_LOGO_SVG` / `BRAND_LOGO_WORDMARK`,
    `slideToStageHtml.ts:~351-362`).
  - ❌ **The actual Figma components — NEVER.** `grep importComponentByKey|createInstance|figma-node-map`
    in the render path returns **zero**. It does not instance the masthead logo component (619:2), the
    GOLD frame components, or the 294-component `#proto` library. It re-implements them in CSS.
- **The logo specifically:** for **NXT, the token logo block has no SVG** (only NU carries the monogram
  SVG), so `slideToStageHtml` falls back to rendering **"NXT HUMANS" as Archivo text**, not the real
  wordmark asset/component. That's why "the real logo component was not used."
- **There are effectively two pipelines.** The Figma design system (components + variables + manifest)
  is the *canonical* design and is used to (a) **ground the model's content** (`assembleDesignSystem`
  in `geminiService.ts:~512` injects the design-system *text* into the prompt) and (b) serve as a
  *spec*. But the **runtime render is a parallel CSS reimplementation** that drifts from it.

**The open architectural fork (the owner must choose — do not proceed on render work until decided):**
1. **Make the TS renderer a faithful twin** of the Figma GOLD components: push the real NXT logo asset
   into the token feed so it renders (not text), and rebuild each slide layout to match the Figma
   auto-layout components 1:1 (no hand-rolled grids that collide). Keeps the architecture, makes it
   accurate. Large per-template effort.
2. **Render *from* the components** — generate the deck by instancing the actual Figma components
   (Figma-MCP / component export → render), so the manifest components ARE the runtime building blocks.
   The true "manifest/component" vision; a much bigger change.

---

## 5. How a `#slides` deck is ACTUALLY generated (trace this end-to-end)
1. User types `#slides …` in the Analyst Desk chat → `corpusChatService.sendChatMessage`.
2. Hashtag detected → **force-route to `claude-opus-4-8`** (`corpusChatService.ts:~2998`), `slideMode=true`.
3. **Grounding:** `pickChunksForPrompt` (manifest-chunk retrieval) selects ~63 chunks (MMR pack, ~30k
   tok) from the wiki manifest — **including uploaded-doc chunks** (see §7 upload fix). `assembleDesignSystem`
   injects the brand design-system TEXT. The model is given tokens + design rules as TEXT.
4. Opus emits **slide JSON** (`:::slide` fenced blocks with `template`, `brand`, fields).
5. `slidePostProcessor.ts` runs the anti-slop chokepoint (banned phrases, meta-narration, citation
   resolution, em-dash strip). **This is where slop should be killed — see §6 for the gaps.**
6. **`slideToStageHtml.ts` renders each slide → 1920×1080 HTML/CSS** using `TOKENS`. The chat preview
   embeds these in iframes; the PPTX/PDF export uses the same renderer → preview↔export parity is
   structural (same renderer), but both inherit its flaws (§4, §6).

---

## 6. ⚠️ CURRENT BROKEN STATE — slop writing + layout collisions

Reproduce: hard-refresh `:5011`, open an engagement with uploads, run in the Analyst chat:
`Generate a structured product marketing #slides deck for the #NXT Humans 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical architecture, and individual tool walkthroughs for clients based on uploaded documents.`

### 6a. AI slop writing (pervasive)
- **Lexical anti-slop WORKS:** 0 banned-phrase hits, 0 em-dashes in the rendered deck (the
  `slidePostProcessor` banlist + em-dash strip are effective).
- **Structural-tell scrub is DETECT-ONLY (does not strip):** the console literally logs
  `[slides] anti-slop field scrub flagged N structural tell(s) (upstream protocol should prevent
  these)` — and the **"X, not Y" negative-parallelism phrases survive into the render** (e.g.
  "…not client uploads", "Clickable experience prototype, not a flat mockup", "Send a link, not a
  40 MB attachment"). The hook flags but does not rewrite. **Fix: make the structural-tell pass
  STRIP/rewrite, not just warn** (in `slidePostProcessor.ts`).
- **META-LEAK (worst):** a deck "CORROBORATING DATA" tile rendered **"60%+ / of cited sources must be
  external evidence, not client uploads"** — that is HiC's *own internal evidence-hierarchy rule*
  (`.claude/CLAUDE.md`) leaked into client-facing content as if it were a product metric. **No hook
  caught it. Fix: add a meta-leak guard** that strips internal-rule phrasing from output.
- **Naked-number tiles** (`294`, `1,275`, `9 products`, `60%+`) violate the Quantitative Claim Rule
  (numbers belong inside cited quotes, not bare KPI tiles).
- Root cause is twofold: the **generation** (Opus emits slop) and the **post-processor** (catches
  lexical, not structural/meta-leak). The deeper fix is enforcing the `human-voice-editor` skill harder
  in the generation prompt AND strengthening the structural scrub to rewrite.

### 6b. Layout collisions (dense slides)
- The **Architecture slide collides**: lanes were `flex:1` (forced EQUAL vertical bands) with wrap-flow
  nodes → a content-heavy lane's nodes overflowed its band and **overlapped the next lane** (labels
  overlapping, "Theme synthesis" struck through by "Humans in Control", "GenAI Co-Lab" overrunning the
  FLOW band). I made a **band-aid CSS fix** in `slideToStageHtml.ts renderArchitectureMap` (content-sized
  lanes + count-adaptive compaction) — **uncommitted and NOT yet rebuilt/verified**. Per §4 this patches
  the wrong layer if the goal is to use the real Figma components.
- Other dense multi-lane/grid templates likely have the same class of overflow (service-blueprint,
  journey, gap-matrix use similar `minmax(…,1fr)` grids). Audit them.

### 6c. The pipeline mismatch (see §4)
The owner's key insight: the deck is generated through a **hand-coded renderer that ignores the Figma
component/manifest references**. Until the fork in §4 is decided, slop+collision fixes are patches on
a renderer that itself diverges from the design system.

---

## 7. What the previous engineer did (this session) — and what is UNCOMMITTED

**Figma (done in the Figma file via MCP, persisted there):** componentized all 68 GOLD templates;
NU-as-a-mode (modes 221:0/535:0); 53 mastheads unified to the logo component; 68 NU-mode sub-component
instances; dual-mode `NXT Brand Tokens`. Manifest (`figma-node-map.md`) updated + records the
single-file decision.

**Code changes — ALL UNCOMMITTED (verify with `git diff`):**
| File | Change | State |
|---|---|---|
| `scripts/benchmark.mjs` (NEW) | offline per-phase benchmark spine; `--baseline`/`--diff` | works; baseline frozen in `hic-workspace/eval/` |
| `hic-workspace/eval/` (NEW) | `benchmark-baseline.json`, `themes-live-regen.json` | — |
| `hic-workspace/wiki/eval/golden-set.json` (NEW) | self-improvement gate keystone (17 exemplars); validated to discriminate (+1.53) | — |
| `scripts/live-themes-regen.mjs`, `scripts/proxy-concurrency-probe.mjs` (NEW) | live probes | — |
| `services/geminiService.ts` | WS1.1: `generateStrategicReport` now manifest-first (`assembleDeliverableCorpus`), rawSources→fallback; **WAVE_SIZE 3→2** (both shard paths) | tsc-clean, deployed in last build |
| `services/corpusChatService.ts` | P3: fire-and-forget engagement-tagged **chat insight write-back** to `synthesis/chat-insights-*.md` | tsc-clean, deployed |
| `design-desk/services/chatToSlideSpec.ts` | P5: `_repairJsonSlice` JSON-recovery for truncated specs | tsc-clean, deployed |
| `components/FileUpload.tsx` | upload parse timeout **45s→280s** (image PDFs need vision OCR) | deployed; verified (PDFs now OCR) |
| `services/wikiService.ts` | upload **archive now inline-parses** unparsed bodies before archiving (fixes "Archived 1/3" → PDFs reach the manifest) | deployed; **verified live** (PDF bodies chunked into manifest) |
| `hic-workspace/design-system/figma-tokens.json` | dual-mode tokens + `on-accent`/etc. + provenance | deployed |
| `services/slideToStageHtml.ts` | **architecture collision CSS band-aid** | **UNCOMMITTED, NOT rebuilt — verify or revert** |

**Latest deployed bundle was `index-dZTuFuj1.js`.** The `slideToStageHtml` architecture edit is newer
than that bundle — **rebuild + re-verify or back it out.**

---

## 8. The eval-driven method — how to verify anything (USE THIS)
- **`node scripts/benchmark.mjs`** (from `humans-in-control-research/`) — offline, deterministic
  per-phase scorecard over a frozen golden fixture + the manifest. `--baseline` freezes;
  `--diff` exits 1 on any regression. The fixture is **stale (2026-05-26)** so OUTPUT-quality phases
  (themes depth, deck prose) need a **live run** to measure — don't trust the fixture for prose.
- **`spa-smoke-tester` agent** (Playwright) — confirms the bundle renders clean after a rebuild.
  "Build passed / HTTP 200" is NOT proof it renders (esbuild skips types; two crash-class
  ReferenceErrors shipped this way). Always `npm run typecheck` (`tsc --noEmit`) before claiming done.
- **Drive a real `#slides` run via Playwright** + tail the proxy (`docker compose logs -f research-proxy`)
  to evaluate slop/tokens/collision on actual output (that's how the §6 issues were found).
- **Rebuild ritual:** `docker compose -f docker-compose-all.yml up -d --build research-generator`,
  then hard-refresh (Ctrl+Shift+R). No HMR. Port 3000 is Social Research, not HiC.

---

## 9. Landmines (do NOT repeat these mistakes)
1. **NEVER rebuild containers while the owner is mid-run.** `docker compose up --build` recreates the
   proxy and **severs in-flight generations** → `net::ERR_EMPTY_RESPONSE`, dead run. Coordinate first.
2. **Concurrent giant requests saturate the single-process proxy.** 3 concurrent ~780 KB Opus shards
   → `ERR_EMPTY_RESPONSE`. Hence `WAVE_SIZE` was capped 3→2. Watch any new fan-out.
3. **`chunks-backfill` is WHOLE-CORPUS** (no per-file mode; ~10,716 docs, hours, burns the embed
   backend). Do NOT reactively run it to refresh one doc. `assembleDesignSystem` injects the whole
   `figma-node-map.md` live, so a single doc edit is effective without re-embedding.
4. **Manifest frontmatter corruption risk** — never hand-edit the `chunks:` char-spans in wiki
   frontmatter (a prior regex bug corrupted 8,367 pages). Re-chunk via tooling only.
5. **The render uses TOKENS, not COMPONENTS** (§4). Fixing colors in `figma-tokens.json` won't fix a
   missing logo asset or a collision — those live in `slideToStageHtml.ts` or require the §4 fork.
6. **Don't overclaim.** Verify live. The benchmark fixture is stale; "deployed + tsc-clean" ≠ "the
   deck looks right." Screenshot the real output.
7. **`/api/design-tokens?brand=NU` returns a FLATTENED payload** (top-level `color`, not nested under
   `NU`). The default (no brand) is nested `{NXT, NU}`.

---

## 10. Recommended next steps (in order)
1. **Get the owner's decision on the §4 fork** (faithful TS twin vs. render-from-components). Everything
   render-related depends on this. Do not keep band-aiding `slideToStageHtml` until it's decided.
2. **Anti-slop, the contained wins** (`slidePostProcessor.ts`): (a) add a **meta-leak guard** (strip
   internal-rule phrasing like "of cited sources must be external"); (b) make the **structural-tell
   scrub rewrite** negative-parallelism instead of only flagging; (c) enforce the Quantitative-Claim
   rule on KPI tiles. Re-run the live `#slides` test to confirm.
3. **Verify or revert** the uncommitted `slideToStageHtml` architecture CSS edit (rebuild + screenshot).
4. **Decide the render fork → then** either make `slideToStageHtml` GOLD-faithful (incl. real NXT logo
   asset into the token feed) or move to component-based render.
5. **Then resume the realignment plan** (`plans/karpathy-second-brain-realignment-2026-06-15.md`):
   retrieval-brain consolidation, real trace-mining for SkillOpt, the validated golden-set gate.

## 11. First commands to run
```bash
cd humans-in-control-research
git status && git diff --stat          # see the ~50 uncommitted changes
node scripts/benchmark.mjs             # baseline scorecard (offline)
npm run typecheck                      # MUST be clean before any ship
# read, in order:
#   humans-in-control-research/CLAUDE.md
#   plans/karpathy-second-brain-realignment-2026-06-15.md
#   hic-workspace/wiki/brand/figma-node-map.md  (the manifest/component canon)
#   services/slideToStageHtml.ts  (the renderer that drifts — §4)
```

---

## 12. ⚠️ AUDIT: the "deliverable writing guard" is UNTRACKED — what could have gone wrong

**Finding (audited 2026-06-16, `git`):** the deliverable writing guard and its dependencies are **not in
version control**, and the feature branch is local-only.

> **★ OWNER'S THEORY TO INVESTIGATE (high priority): `validate_writing_quality.py` may itself be
> CAUSING the slop/issues — not merely failing to stop it.** Do not assume it is a safety net. The slop
> appeared *with this guard active locally*. Treat it as a PRIME SUSPECT: test the system with it fully
> DISABLED (move the untracked guard + `_lexicon.py` aside, restore the older committed guards) and see
> whether deliverable quality IMPROVES. If it does, the guard/lexicon/feedback-loop is the culprit —
> delete or rewrite it, do not publish it. The mechanisms below explain how a "guard" can degrade output.

Facts:
- `git branch -a` — **`self-improvement-ia-2026-05-29` is NOT on origin.** It is a local-only branch;
  nothing on it has been pushed/published.
- `.claude/hooks/scripts/validate_writing_quality.py` (the writing guard), `.claude/hooks/scripts/_lexicon.py`
  (single-canonical-lexicon loader), and `hic-workspace/wiki/frameworks/anti-slop-lexicon.json`
  (the single-source lexicon) are **UNTRACKED** — `git log --all -- <file>` returns nothing;
  `git ls-files --error-unmatch` errors with "did not match any file known to git." **They were never
  committed on any branch.**
- The hook dispatcher `.claude/hooks/scripts/dispatch_validators.py` **references the untracked guard**
  (`dispatch_validators.py:424` dispatches `validate_writing_quality.py`; `:418` reads `_lexicon.py`),
  **but the dispatcher itself is modified/uncommitted (`M`)**, as is `.claude/settings.local.json`.
- Only the *older* guards (`precheck_slop.py`, `validate_ai_slop.py`) are committed.
- There are **9 untracked files under `.claude/`** — the scope of unpublished hook/guard work.

**What could have gone wrong (have the successor evaluate each):**
1. **Lost-on-clone / no enforcement.** An untracked guard is not pushed and not in a fresh clone. Anyone
   who pulls/clones gets the dispatcher's reference (if that part were committed) **without the guard
   script** → the writing-quality hook silently no-ops or errors → **no deliverable writing-quality
   enforcement → structural slop slips straight through** (exactly what §6 shows). A `git clean` or
   branch switch would also delete the guard locally.
2. **Committed-vs-runtime mismatch.** The reference-to-guard lives in the **uncommitted** dispatcher
   diff. If someone commits/publishes them out of sync (dispatcher without the guard, or guard without
   the lexicon), the hook bus points at a missing script → silent skip or hard error. There is no
   atomic unit here.
3. **Unreproducible / unreviewable.** With no published baseline, you can't diff the guard, can't code-
   review it, and can't tell whether the version running locally is the intended one. Its behavior is
   unverifiable across machines.
4. **Shadow vs blocking.** `validate_writing_quality.py` was introduced as a **shadow** validator
   (writes `wiki/synthesis/writing-quality-shadow-log.md`), meaning **even when it runs it may only LOG,
   not BLOCK.** Combined with the §6a finding that the structural-tell scrub is detect-only, the guard
   may be doing nothing to stop slop even when present. Confirm whether it is wired as blocking.
5. **Lexicon drift.** `anti-slop-lexicon.json` (the single source feeding `_lexicon.py`, `precheck_slop`,
   and `slidePostProcessor`) being untracked means the loader can fall back or drift between machines —
   different banlists running in different places.

**⚠️ Do NOT assume this guard is protective — it may be CAUSING slop. The unpublished state may be a
GOOD thing.** (Owner's correction, 2026-06-16; the prior engineer wrongly framed it as "the last line
of defense.") Concrete mechanisms by which this new, untracked apparatus could be **net-negative** vs.
the older committed guards:
- **It demoted hard-bans.** This session's lexicon retune moved terms (e.g. "value proposition") from
  **hard-ban → tier-2 detect-only** and **removed them from `slidePostProcessor` SLOP_PHRASES so
  `precheck_slop` no longer blocks the literal.** So the new (untracked) lexicon is **LESS strict** than
  what's committed — publishing it could let MORE slop through. The unpublished state preserves the
  stricter old protection.
- **Feedback-loop steering.** The writing apparatus + `learned-constraints.md` are injected back into
  generation prompts via `inject_active_constraints_and_patterns.py`. A mis-tuned guard/lexicon can
  **steer the model toward slop** (a bad "constraint" that induces the very negative-parallelism/triads
  in §6a), not just fail to catch it.
- **Shadow false-confidence.** If `validate_writing_quality.py` is shadow-only (logs to
  `wiki/synthesis/writing-quality-shadow-log.md`), its presence *masks* that the real protection is the
  older committed validators — worse than no guard.
- **Empirical fact:** the pervasive slop in §6 appeared **with this guard present locally.** So at best
  it's not stopping slop; at worst it's contributing.

**What the successor should DO (in order) — EVALUATE before committing/publishing:**
1. `git status` + `git diff` to see the full uncommitted hook/guard set (9 untracked files in `.claude/`,
   modified `dispatch_validators.py` + `settings.local.json`). Map what each piece does.
2. **A/B the net effect BEFORE committing anything.** Run the same known-slop deliverable (a) with the
   new local apparatus active and (b) with only the older committed guards (`precheck_slop`,
   `validate_ai_slop`) — i.e. temporarily move the untracked files aside. Compare slop counts. **Only
   commit/publish the new guard if it measurably REDUCES slop with no regressions.** If it's neutral or
   worse, the right move is to DELETE it (or revert the lexicon demotions), not publish it.
3. Diff the new `anti-slop-lexicon.json` against the hard-ban list the older guards used; **restore any
   hard-bans the retune demoted** if those demotions let slop through.
4. Determine whether the guard is shadow or blocking (`wiki/synthesis/writing-quality-shadow-log.md`),
   and whether the constraint-injection loop is feeding generation good or bad signal.
5. Only then decide whether to commit (atomically: guard + lexicon + dispatcher + settings) and/or push
   the branch.

> Corrected root-cause framing for §6's slop: do **not** treat the unpublished writing guard as a
> missing safety net to restore. Its net effect is **unproven and plausibly negative** (it demoted
> hard-bans, it's possibly shadow-only, and it feeds the generation loop). The fact that it was never
> published may have **preserved** the stricter older protection. Treat the new apparatus as SUSPECT and
> EVALUATE it (step 2) before assuming it belongs in version control at all.

---

Welcome aboard. The system is powerful but mid-repair: the vision is sound, the primitives mostly
exist, and the active fire is (1) the render ignoring the Figma components (§4), (2) structural slop
(§6), and (3) **a strong owner theory that `validate_writing_quality.py` may be CAUSING the slop, not
preventing it** — test the system with that guard DISABLED first (§12). Do not assume the untracked
guard is a missing safety net to restore; prove it helps before it ever goes into version control.
Start with §4, §6, and §12.
