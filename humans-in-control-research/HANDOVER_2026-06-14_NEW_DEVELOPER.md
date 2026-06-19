# HiC Developer Handover — 2026-06-14

Audience: a developer joining the Humans in Control (HiC) workstream cold,
inheriting it from the previous session. Read this top to bottom once, then use
it as a reference. It supersedes the operational orientation in
`HANDOVER_2026-06-12_NEW_DEVELOPER.md` (still accurate on architecture; stale on
model routing — see §3) and its companion
`HANDOVER_2026-06-12_MANIFEST_RETRIEVAL_SYSTEM.md` (still fully accurate).

Section 2 is the most important thing in this document. The previous developer
(me) was taken off the work for repeatedly violating it. If you read nothing
else, read §2.

---

## 1. What HiC is

Humans in Control Research is a three-tier research workbench that turns a
client brief + uploaded documents + external research articles into
consulting-grade deliverables: strategy decks, persona sets, journey maps,
service blueprints, competitive analyses, PRDs, roadmaps, gap analyses, tech
audits, slide presentations, and interactive prototypes. Branded output ships in
two design systems: NXT Humans and Northeastern (NU).

It is one tool inside the larger **NXT Humans Intelligence Augmentation Suite**
(a Docker-orchestrated, MCP-driven platform of CX tools: social data collector,
journey mapper, video transcriber, character generator, and others). HiC is the
most actively developed surface.

```
React 18 SPA  (Docker: hic-research, port 5011; nginx serving a static Vite dist)
   |  fetch()
   v
FastAPI proxy (Docker: research-proxy, port 5012; proxy/app.py ~16K lines)
   |  /api/ai/{gemini,anthropic,openai,deepseek}  - provider fan-out
   |  /api/search/*           - 200+ external sources
   |  /api/wiki/*             - knowledge-base read/write/chunk/embed
   |  /api/design-tokens      - LIVE Figma variable values (the brand tokens)
   |  /api/gold/export-pptx*  - Playwright-driven native PPTX export
   v
hic-workspace/  (persistent knowledge layer, volume-mounted)
   wiki/        - LLM-maintained markdown KB (manifest-chunked, see §6)
   sources/     - raw uploads
   sessions/    - per-run state: chat.json, corpus, traces, rollouts
   engagements/ - per-goal hydrated deliverables (themes.json, etc.)
```

Critical operational facts (these bite people):
- **No HMR in Docker.** Every frontend edit requires
  `docker compose -f ../docker-compose-all.yml up -d --build research-generator`
  then a hard refresh (Ctrl+Shift+R). Port 3000 belongs to a DIFFERENT app
  (Social Research). HiC is :5011 (SPA) and :5012 (proxy). A "stale bundle" is
  the cause 99% of the time a fix "doesn't show up" — and it manifests as wrong
  model labels, old behavior, ghost crashes.
- **`vite build` does NOT type-check.** `npm run typecheck` (tsc --noEmit) is a
  mandatory gate. esbuild strips TS without checking it; crash-class
  ReferenceErrors have shipped through "build exit 0".
- **Never merge to main; never commit without Jonathan's explicit approval.**
  Build, then he tests, then commit. The working tree is intentionally dirty.
  Nothing from this session is committed.
- **Flat project structure** — no `src/`; components/ and services/ sit at the
  `humans-in-control-research/` root.
- Companion docs (accurate, read them): repo-root `CLAUDE.md` (platform/ports),
  `.claude/CLAUDE.md` (output-quality LAW: citation protocol, 350+ banned
  phrases, Quantitative Claim Rule, em-dash hard ban, meta-narration ban),
  `humans-in-control-research/CLAUDE.md` (HiC-specific architecture + the
  seven-step "adding a deliverable" protocol). `hic-workspace/AGENTS.md` is the
  wiki schema. Active plans live in `plans/` (dated, most recent first).

---

## 2. THE STANDING LAW — no hardcoding; assemble at runtime from Figma + manifest

**Jonathan's exact words (2026-06-14):** "Artifacts must be assembled at runtime
from the Analyst Desk Opus 4.8 AI chat, and using Figma variables, tokens, and
references from the manifest." And earlier, repeatedly: "Nothing should be hard
coded or RAG." And: "everything runs through our analyst desk # prompt →
manifest → figma design patterns → generation → self improvement workflow."

This is the architecture, not a preference. Internalize the pipeline:

```
user # prompt (Analyst Desk)
  → manifest-chunk retrieval (evidence)   [NOT RAG bulk-injection]
  → Figma design patterns (tokens/variables/node refs, via /api/design-tokens
       + the manifest brand pages)
  → generation on Opus 4.8
  → self-improvement (learned constraints, feedback, SkillOpt)
```

**What "drift" looks like (the trap I kept falling into):**
- Putting brand colors, fonts, label text, or layout decisions as LITERALS in a
  renderer (`web.tsx`, `slideToStageHtml.ts`) instead of reading them from the
  brand token object (which is hydrated from Figma) or from a manifest-chunked
  design page. Example I had to fix this session: `SectionDividerFullBleed`
  hardcoded `var(--nu-red-600)` and the literal string "Northeastern ·
  Advancement", so every `#NXT` deck rendered NU section-dividers. The FIX was
  to read `resolveT(brand)` tokens — but see the honest caveat in §4: I still
  left a couple of literals (`isNu ? 'Northeastern · Advancement' : 'NXT
  Humans'`, weight `300/600`) in the renderer, which is STILL drift by
  Jonathan's standard. The brand seal label and weights should come from the
  brand token set / Figma, not a ternary in TSX.
- Hardcoding a model ID at a call site instead of routing through `aiRouter.ts`.
- Bulk-injecting `rawSources` / embedding-RAG into a generation prompt instead
  of grounding via manifest chunk pointers. RAG injection is the documented root
  cause of hollow deliverables.
- "Fixing" a deliverable by patching its rendered output (stripping characters,
  rebalancing brackets) when the real fix belongs upstream in the Opus prompt,
  the skill, the manifest page, or the Figma token.

**The litmus test before you write any renderer/generation code:** "Could a
designer change this by editing the Figma variable or the manifest design page,
without touching TypeScript?" If the answer is no because you baked a value into
code, you are drifting. Stop and route it through tokens/manifest/skill.

Defensive code (e.g. JSON repair, crash guards) is legitimate and NOT drift —
the line is: **structure, evidence, and visual style come from
Opus+Figma+manifest at runtime; code only transports and protects.**

---

## 3. Current model routing (supersedes the 2026-06-12 Fable plan)

**Claude Fable 5 is BANNED** (Anthropic temp-banned it). The 2026-06-12 handover
told you to swap deliverable generation TO Fable 5 — DO NOT. That swap was made
and then reversed. The current canonical routing:

| Surface | Trigger | Model |
|---|---|---|
| Analyst Desk chat, plain reply | non-hashtag prompt | `gemini-3.5-flash` |
| Analyst Desk chat, deliverable generation | any artifact hashtag (`#slides #journey #personas #themes #recs #prd #gap #blueprint #competitive #case-study #roadmap #audit #arch #org #brief #explainer #report`) | `claude-opus-4-8` (force-routed) |
| Plain-chat slop repair / rewrites | automatic | `gemini-3.5-flash` (its own engine) |
| Artifact slop repair / rewrites | automatic | `claude-opus-4-8` (its own engine) |
| Designer chat (Design Desk) generate + revise | content hashtags | `claude-opus-4-8` |
| Prototype CODE stages (`#proto` Stage 4 coder, Stage 5 critic) | automatic | `claude-opus-4-8` (planning stages stay on `gemini-3.1-pro-preview`) |

Force-route happens in `services/corpusChatService.ts` — the console logs it:
`[chat][route] Artifact hashtag detected - force-routing deliverable
generation: gemini-3.5-flash -> claude-opus-4-8` then `Generating via Anthropic
claude-opus-4-8 (slideMode=true)`. This was confirmed working live 2026-06-14
(theme traces on disk are `themes-s1-...-claude-opus-4-8.json`).

**Standing model rules (both surfaces need the full pipeline):** gemini-3.5-flash
and claude-opus-4-8 EACH get the anti-slop pipeline AND self-improvement. Do not
exempt either. Do not say "never use gemini on rewrites" (it owns plain-chat
rewrites). Do not skip the artifact path. Use the GENERATING model for its own
repair. `claude-opus-4-8` (and the banned `claude-fable-5`) reject the
`temperature` param with a 400 — the proxy strips it at `/api/ai/anthropic`. Never
hardcode a model ID at a call site; register in `aiRouter.ts`. Canonical Gemini
IDs: `gemini-3.1-pro-preview` (reasoning), `gemini-3.5-flash` (fast),
`gemini-3.1-flash-image-preview` (image). Never reach for 2.5-era.

Reversal path if Fable is un-banned: `plans/fable-to-opus-swap-2026-06-13.md`.

---

## 4. In-flight work from this session (state + honest verification status)

Everything below is UNCOMMITTED and was typecheck-clean (`tsc --noEmit` → 0). A
Docker rebuild happened mid-session for the first two; the last two landed AFTER
the last rebuild, so **they are NOT yet in the running :5011 bundle** — rebuild
before testing.

1. **Chat-killing crash: missing `path` on a manifest entry — FIXED + tested.**
   `loadSkillContext` (`corpusChatService.ts` ~2384) did `skill.path.replace(...)`
   and threw `Cannot read properties of undefined (reading 'replace')` on EVERY
   chat turn, because the `human-voice-editor` skill-manifest entry shipped
   without a `path` field (sister bug to an earlier missing-`triggers` crash).
   Fix: added `path` to the entry in `hic-workspace/skill-manifest.json` + a
   `typeof skill.path !== 'string'` stub guard in `loadSkillContext`. Regression:
   `services/matchSkills.triggers.test.ts` now asserts every manifest entry has
   BOTH `triggers[]` and a string `path` (4/4 pass). **LESSON: a manifest entry
   needs id, name, category, description, keywords, triggers[], composes_with[],
   AND path.** This crash is why the user thought hashtag gen "routed to Gemini
   not Opus" — generation never ran; the model label was a stale bundle.

2. **Theme keyword filter too narrow — FIXED.** `components/ResearchBrowser.tsx`
   (~line 319) filtered the assembly board on only `title + summary + topTerms`,
   so filtering "intell" on 28 on-topic Intelligence-Augmentation themes returned
   0 (the abstract theme NAMES never literally say "intelligence"; the term lives
   in quotes/interpretation/implications/depth). Broadened the haystack to fold
   in quotes, implications, depth fields, and citations. The themes themselves
   were correct and Opus-generated — only the filter was blind.

3. **Block-quote slide rendered BLANK ("Untitled Slide" + empty `""`) — FIXED
   defensively, but the real cause is upstream.** Opus emitted MALFORMED JSON for
   one block-quote slide: a stray `]` after the `quote` object plus an
   out-of-schema `motivations` array (copied from the persona-card shape).
   `tryRepairJson` (`services/aiRouter.ts` ~47) could only append missing
   closers and trim from the END — it could not remove an unmatched closer in the
   MIDDLE, so the slide collapsed to an error envelope → blank card. Fix: the
   bracket-balance pass now REBUILDS the string and drops provably-stray closers
   (no-op on valid JSON; recovers the real title+quote on malformed). This is
   legitimate defensive transport code. **The upstream fix that belongs to the
   STANDING LAW (§2): tighten the block-quote schema/prompt/skill so Opus stops
   emitting persona fields into a block-quote** — do that in the SLIDE OUTPUT
   PROTOCOL / evidence-curator skill, not with more renderer band-aids.

4. **`#NXT` deck showed NU section-dividers — FIXED in preview, with a caveat.**
   `SectionDividerFullBleed` (`components/slideTemplates/web.tsx` ~1458) ignored
   the `brand` prop: it defaulted `data-brand` to `'nu'`, used `var(--nu-red-*)`,
   and printed the literal "Northeastern · Advancement". The EXPORT twin
   (`slideToStageHtml.ts renderSectionDivider`) was ALREADY brand-aware
   (`T.accent`/`T.ink`/`T.displayFont`) — which is exactly why preview and export
   DIFFERED on title slides (the user's other complaint). I converted the preview
   to `resolveT(brand)` tokens like `GoldFrame`. The brand-value literals were
   then fully removed: a `SEAL_LABEL` token was added to TOKENS (NXT 'NXT Humans')
   + overridden in `nuBrand` ('Northeastern · Advancement'); the renderer reads
   `T.SEAL_LABEL` and `Number(T.TITLE_WEIGHT)` instead of the `isNu` ternaries
   (`isNu` now only sets the cosmetic `data-brand` attribute). SEAL_LABEL is in
   the token layer = the `/api/design-tokens` hydration target; wire it to a Figma
   variable (font/seal-label or brand/name) if one is added.
   STILL OPEN: the preview section-divider is a dark full-bleed design while
   the export renders the divider on the light GOLD frame — a genuine
   twin-divergence in LAYOUT (not just brand). Decide with Jonathan which is
   canonical and align both twins; do not guess.

5. **Writing-quality / humanize overhaul — Stages 1-6 shipped, Stage 5 (RI
   rewrite-from-source repair) partially.** Single-source anti-slop lexicon
   (`wiki/frameworks/anti-slop-lexicon.json` + prose twin + `_lexicon.py` loader
   + `scripts/lexicon-drift-guard.py`), a `human-voice-editor` quality-enhancer
   skill wired into ALL deliverables incl. themes + designer chats + SkillOpt,
   `validate_writing_quality.py` (5 high-precision structural tells promoted to
   blocking after a measured <0.7% FPR on 298 clean articles; rest shadow),
   `slopRepair.ts` runtime repair on both chat surfaces. Plan:
   `plans/writing-quality-overhaul-2026-06-14.md`. Pending: shadow→blocking
   promotion of more checks once FPR is measured in-product.

6. **Typographic system redesign — Phase 1 shipped, 2/3 pending.** Figma-sourced
   type scale (title governs every content slide; hero numerals capped below the
   title; 8.5pt floor; continuation slides over truncation). Enforced by
   `validate_text_hierarchy.py` + renderer twins reading SCALE/WEIGHT/TYPO.
   Plans: `plans/typographic-system-redesign-2026-06-14.md`,
   `plans/deliverable-redesign-sprint-2026-06-14.md`.

---

## 5. The hashtag generation pipeline (ONE ENGINE — no exceptions)

Standing constraint `[all/deliverables-one-engine]`. Every artifact hashtag in
Analyst chat flows through one path:

```
user types "#journey ... #NXT"  (or #slides, #personas, #themes, ...)
  -> corpusChatService.sendChatMessage
       - skills matched (matchSkills) + quality enhancers auto-loaded via
         composes_with (human-voice-editor ALWAYS loads for chat)
       - ARTIFACT_TPL maps hashtag -> slide template id; slideModeActive forces
         the SLIDE OUTPUT PROTOCOL into the system prompt (:::slide fenced JSON,
         action titles, citation rules, decomposition rule, density axis,
         slide-system variants)
       - manifest-chunk retrieval injects evidence (MCR pack); Figma-live design
         tokens injected ([chat] Figma-live design tokens injected for NXT)
       - force-route to claude-opus-4-8 ([chat][route] ... -> claude-opus-4-8)
       - RI anchored re-ask if the model answers in prose instead of fences
       - slop repair pass (human-voice-editor + structural regex), same model
  -> CorpusChatPanel.parseSlideBlocks (~line 4085) parses fences -> SlideData[]
       - JSON.parse(tryRepairJson(body)); brand resolved from JSON.brand >
         fence brand= > #hashtag in AI text > #hashtag in user query > 'nxt'
  -> PREVIEW: components/slideTemplates/web.tsx (+ goldPreviews) 960x540 twins
  -> EXPORT: services/slideToStageHtml.ts emits 1920x1080 #stage HTML per slide
       -> proxy /api/gold/export-pptx-multi -> Playwright MEASURE + python-pptx
       NATIVE editable shapes (proxy/gold_pptx_export.py). pptx.ts is legacy.
```

**Twin-sync law:** a slide-template change touches THREE renderers that must
stay in sync — `web.tsx`/`goldPreviews.tsx` (preview), `slideToStageHtml.ts`
(export stage), and the Figma GOLD exemplar (design source of truth).
`npm run check:templates` checks web/pptx parity. "Preview clean, export broken"
(and its sibling "preview NU, export NXT" — see §4 item 4) is the
most-reported failure class in this project's history. When you touch ONE twin,
grep the others immediately.

**Brand resolution gotcha:** brand is resolved PER CALL in `parseSlideBlocks`,
not per slide, then threaded as a `Brand` object to every template via
SlideCanvas. `detectBrandFromText` only matches an explicit `#nxt/#nu/#northeastern`
hashtag — it does NOT sniff content words like "Northeastern". So a template
showing the wrong brand is almost always the RENDERER ignoring the `brand` prop
(item 4), not a resolution bug.

---

## 6. Figma design systems (source of truth for ALL visual patterns)

Two live Figma files, edited via the Figma MCP (`mcp__figma__use_figma` with the
`figma-use` skill loaded — MANDATORY before any use_figma call). Tokens flow to
the app at runtime via `proxy /api/design-tokens` and are hydrated into the
renderer brand objects (`[tokens] Figma-live tokens hydrated into renderer
TOKENS` on boot). This is the mechanism that makes §2 possible — USE IT.

| Brand | File key | Variable collection |
|---|---|---|
| NXT Humans | `iSQhAVM7SI4QHAWB7y9C2z` | `VariableCollectionId:221:2` |
| Northeastern (NU) | `z2v9Pvhg23hlljEitPBdAt` | `VariableCollectionId:95:2` |

Full node registry: `hic-workspace/wiki/brand/figma-node-map.md` (manifest-
chunked, so the model retrieves it at generation time). Token pages: NXT 223:2,
NU 97:2. GOLD artifact exemplar pages: one per deliverable per brand. Slides-
system pages: NU 103:2, NXT 324:2.

Brand token facts as of 2026-06-14 (the CODEBASE may lag Figma — verify against
`/api/design-tokens`, do not trust hardcoded fallbacks in `brands.ts`):
- **NXT display font is Saira Condensed SemiBold** (dropped Bebas Neue). Body
  Archivo. Accent chartreuse `B8B800`, cyan `00B7C3`, teal `115054`, ink
  `0D0D0D`.
- **NU is a single-typeface Lato system** per brand.northeastern.edu (Real Head
  Pro primary, not installed in Figma → Lato). Deliverable GOLD frames may still
  use Lora for headlines; reconcile via Figma, not by editing TSX.
- The renderer detects NU via `isNu = brand.FONT_TITLE === 'Lora'`. If NU's font
  fully migrates to Lato, that predicate breaks — replace it with an explicit
  brand id flag.

**7-step routine for building anything in Figma (ordered, never skip — Jonathan
enforces this and has caught Step 1 being skipped):** 1. Education (READ the
expert SKILL.md). 2. Inspiration (gold twin HTML + gallery). 3. Guardrails (run
the slop validators on every copy string). 4. Generation (variable-bound fills
by NAME; auto-layout for any matrix that can grow — absolute x/y matrix cells are
BANNED). 5. Review (in-call screenshot + collision/clip audit to zero).
6. Dual-brand (build in BOTH files). 7. Wiki/manifest + self-improvement
(register frames in figma-node-map, re-chunk, record constraints).

---

## 7. Manifest + retrieval (how design patterns and all knowledge are stored)

> Deep dive: `HANDOVER_2026-06-12_MANIFEST_RETRIEVAL_SYSTEM.md` (still accurate).

Every wiki page carries machine frontmatter with a `chunks:` block (pointer
contract: `<wikiPath>#c<N>`, char_span, key_terms, token_count). Writer:
`proxy/wiki_chunker.py`. Manifest: `wiki/.manifest.json` (+ journal). Parity
gate: `.claude/hooks/scripts/validate_manifest_chunk_parity.py` (current state ~0
mismatches / ~9,781 records; count ONLY pointer-shaped ids inside frontmatter —
never naive `- id:` greps). Retrieval at generation time unions the manifest
catalog, pre-ranks by key_terms/goal, MMR-packs chunks into the prompt
(`[chunkRetrieval]` / `[MCR]` console lines). **Law: ground via manifest chunk
pointers, never bulk-RAG-injection of rawSources.** `generateThemes` is the
reference implementation. Cited pointers (`[articles/x.md#c12]`) resolve to named
sources at render time via `services/citationPointerRegistry.ts`; raw pointers
must never reach the user.

History scar: a `wiki_chunker.py` regex bug once corrupted 8,367 pages with
duplicate orphaned chunk blocks (fixed 2026-06-11). If you see duplicate `- id:`
lines above a `chunks:` key, a writer regressed — check upsert call sites first.

---

## 8. Self-improvement loop (user feedback → constraints → skills)

Three operational layers: (1) **Learned constraints** —
`wiki/synthesis/learned-constraints.md`, appended via `POST :5012/api/wiki/append`;
a UserPromptSubmit hook injects the deduped set into every Claude Code session
and the chat engine injects them into generation prompts (the landing strip shows
`N constraints active`). When you fix a failure class, REGISTER IT HERE — that is
what makes it durable. (2) **In-run feedback** — checkpoint edits
(`chatFeedbackExtractor.ts`), 5+ similar edits auto-approve a constraint; RI gives
the chat a second anchored pass on uncertainty signals. (3) **SkillOpt** — session
rollouts train the skill library (`npm run skillopt:extract` → `build-training` →
`bash scripts/skillopt-batch.sh --auto-promote`). Promotion is GATED by the
skillopt-validation-gate subagent — NEVER bypass it (un-gated iterative drift
makes skills WORSE each pass). A rerun is pending after the writing-quality work.

Hooks are settings.json shell commands (`python .../<script>.py`); Stop runs
`dispatch_validators.py`. `corpusChatService.ts` is a SERVICE (the SPA chat
brain), NOT a hook — runtime repair lives there because only the SPA can re-ask
its model; the hook layer (`validate_writing_quality.py` + `_lexicon.py`) is the
separate gate.

---

## 9. Open risks + tactical next steps, in order

1. **Rebuild + live-verify this session's fixes.** Items 3 and 4 in §4 landed
   after the last rebuild — they are NOT in :5011 yet. Rebuild
   research-generator, hard-refresh, then drive a real `#slides #NXT` deck via
   Playwright: confirm (a) the block-quote renders its real title+quote, (b)
   section-dividers render NXT (Saira, brand accent rule, "NXT Humans" seal), and
   (c) preview matches export. Use the four-row pre-claim checklist
   (Build / Browser load / Flow exercised / Output inspected). Build success and
   HTTP 200 are NOT verification.
2. **Close the §2 drift on the section-divider properly.** Move the seal label
   and weights into brand tokens sourced from `/api/design-tokens`; do not leave
   the `isNu ? ... : ...` literals. Then audit `web.tsx` for the SAME class:
   ~30 templates use `data-brand={brand || 'nu'}` + `var(--nu-red-*)` and rely on
   a per-brand CSS-var override keyed on `data-brand`. Verify that override
   actually exists and resolves for NXT (the section-divider proved one template
   can silently bypass it). If the CSS-var contract is fragile, migrate templates
   to the `resolveT(brand)` token pattern that `GoldFrame` uses.
3. **Fix the block-quote at the source (§4 item 3):** tighten the block-quote
   schema/prompt so Opus stops emitting persona fields. Renderer JSON-repair is
   the safety net, not the fix.
4. **Decide the section-divider canonical layout** (dark full-bleed preview vs
   light GOLD-frame export) with Jonathan, then align both twins.
5. **Writing-quality Stage 5 + SkillOpt rerun** (§4 item 5, §8).
6. **Pending backlog (do not start without Jonathan):** items in
   `plans/writing-quality-overhaul-2026-06-14.md`,
   `plans/typographic-system-redesign-2026-06-14.md`,
   `plans/deliverable-redesign-sprint-2026-06-14.md`,
   `plans/hashtag-pipeline-unification-2026-06-13.md`.

Welcome aboard. The single biggest way to succeed here where I struggled:
**resist the urge to put values in code.** When something renders wrong, the
first question is never "what literal do I change in the renderer" — it is "which
Figma token, manifest page, skill, or Opus prompt is the real source of this, and
how do I fix it THERE." Trace all six layers (wiki read / manifest persist /
skill / hook / subagent / self-improvement) before proposing anything, and never
claim "verified" without the four-row pre-claim checklist after a rebuild.
