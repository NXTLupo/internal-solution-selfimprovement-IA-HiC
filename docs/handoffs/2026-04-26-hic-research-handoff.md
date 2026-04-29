# Humans in Control Research — Handoff to Successor

**Date:** 2026-04-26
**Author:** Claude Opus 4.7 (1M context)
**Audience:** Next agent working on HiC Research, especially the freeform-HTML artifact pipeline
**Status:** Mid-flight. The freeform pipeline is wired and deploying but visual fidelity is not yet right; user is frustrated. Read this top to bottom before touching anything.

---

## How to read this document

If you only read 4 sections, read these in order:
1. **What the user actually wants** — the north star
2. **State of the code right now** — what's broken, what works
3. **What I tried that failed and why** — don't repeat my mistakes
4. **The user's standing rules** — non-negotiables, hard-earned

---

## 1. What the user actually wants

Jonathan wants a **Design Desk** in HiC Research where typing `#org #NU advancement division` (or `#journey`, `#arch`, `#roadmap`, `#blueprint`) in either the Analyst Chat (`CorpusChatPanel`) or the Designer popup chat (`DesignDeskChat`) produces a **full 1920×1080 HTML slide** that visually inherits the corresponding exemplar at `humans-in-control-research/styles/NN-{kind}-{BRAND}.html`.

The 8 exemplar HTML files he's curated are the visual ground truth:
- `01-service-blueprint-NU.html` (used by both `#blueprint` and `#journey` for NU)
- `02-service-blueprint-NXT.html` (used by both `#blueprint` and `#journey` for NXT)
- `03-architecture-NU.html`, `04-architecture-NXT.html` (used by `#arch`)
- `05-org-chart-NU.html`, `06-org-chart-NXT.html` (used by `#org`)
- `07-roadmap-NU.html`, `08-roadmap-NXT.html` (used by `#roadmap`)

`#journey` and `#blueprint` share the same exemplar files but diverge **semantically** — journey = current-state (as-is, observed), blueprint = future-state (to-be, post-analysis). That distinction is captured in the diagram-illustrator skill markdown.

The model adapts the **textual content** inside the exemplar to fit the corpus + user request, but the **visual treatment is non-negotiable** — frame, typography (Archivo + Bebas Neue + JetBrains Mono + Fraunces), atmospheric washes, brand color tokens are all inherited verbatim.

`#persona` stays on the legacy structured pipeline — text-heavy, the schema works, persona was explicitly out of scope (Q1=A in the brainstorm).

---

## 2. State of the code right now

### Live deployed bundle on `localhost:5011`
- Latest: `index-BWkyheXk.js` (the 16:9 envelope fix — most recent change, not yet user-tested)
- Ships via `docker compose -f docker-compose-all.yml up -d --build research-generator` from repo root
- HiC is nginx serving static dist — **NO HMR, every frontend change requires Docker rebuild**

### Commits made this session (on branch `HiC-enriched`, NOT pushed)
- `8bcaef0` — `feat(design-desk): add FreeformArtifact schema (task 1/16)`
- `81b4771` — `docs: add freeform-HTML artifacts implementation plan`
- `6bdcd32` — `docs: add freeform-HTML artifacts design spec (2026-04-26)`

### Uncommitted in working tree (~26 files)
The user's standing rule is "stage but don't commit until tested." There's a backlog of staged-but-uncommitted changes from earlier sessions PLUS all the freeform pipeline work this session. Running `git status` in the repo root will show the full list. Some of these are unrelated to the freeform pipeline (App.tsx changes for cross-window context persistence, Bug A/B/C fixes from earlier today, etc.).

**Do not commit anything without the user's explicit per-change approval.** When you do commit, use `git commit --only <explicit paths>` to avoid sweeping in unrelated staged work — I made that mistake earlier today (had to reset HEAD~1 once already).

### What's working

- ✅ FreeformArtifact schema and types ([humans-in-control-research/design-desk/schemas/freeformArtifact.ts](../../humans-in-control-research/design-desk/schemas/freeformArtifact.ts))
- ✅ Hashtag parser already supports `org`, `journey`, `arch`, `blueprint`, `roadmap`, `persona` — no changes needed there
- ✅ Exemplar loader bundles 8 HTML + 7 SKILL.md files via Vite `?raw` imports ([exemplarLoader.ts](../../humans-in-control-research/design-desk/services/exemplarLoader.ts))
- ✅ Freeform output parser handles `:::nxt:freeform { JSON } --- <html> :::` block ([freeformParser.ts](../../humans-in-control-research/design-desk/services/freeformParser.ts))
- ✅ Lightweight HTML sanitizer (NO DOMPurify dependency — pragmatic shortcut) ([freeformSanitizer.ts](../../humans-in-control-research/design-desk/services/freeformSanitizer.ts))
- ✅ chatToFreeform with provider routing (Gemini / Claude Opus / GPT) ([chatToFreeform.ts](../../humans-in-control-research/design-desk/services/chatToFreeform.ts))
- ✅ Structural completeness check that REJECTS incomplete HTML output (no fallbacks)
- ✅ FreeformViewer with iframe rendering at native 1920×1080 ([FreeformViewer.tsx](../../humans-in-control-research/design-desk/components/FreeformViewer.tsx))
- ✅ Wiring in `DesignDeskChat`, `ArtifactViewer`, `CorpusChatPanel` to route freeform kinds through the new pipeline
- ✅ 3-hammer prompt structure (caps-lock CRITICAL INSTRUCTION at top, numbered CRITICAL HTML REQUIREMENTS in middle, final REMEMBER reminder at end) — pattern lifted from `internal-solutions-journeymapper/src/ai_analysis/dynamic_journey_mapper.py`

### What's still broken or untested

- ❌ **Visual fidelity not confirmed.** The 16:9 envelope fix shipped just before the user asked for this handoff. Untested by user. Their last screenshot showed the iframe rendering with content extending past 16:9 ratio in the Designer popup. The fix wraps the iframe in an outer div with layout dimensions equal to scaled visual size to enforce a true 16:9 envelope.
- ❌ **Slide-frame width.** Even when the iframe envelope is correct, the model's emitted HTML may have a `.slide-frame` element narrower than 1920×1080. The exemplar's `body { background: #1A1A1A }` would then show through. The completeness check now requires literal `width: 1920px` and `height: 1080px` CSS declarations, but it's pattern-matching on string presence — the model could put those in CSS comments and still fail at the actual `.slide-frame` rule.
- ❌ **Designer popup occasionally alerts "There is an error in your model"** — this string is NOT in our source. It comes from somewhere external (Gemini SDK? DynamicPromptChips? auto-suggest?). The user reported it once but I haven't reproduced it. It's been seen on Designer popup load before any user input. Likely an auto-suggest API call failing.
- ❌ **Persona PPTX export is on the legacy `artifactExporter.ts` path.** That exporter renders the `NxtDocViewer` off-screen at 1808×870 and composes slide chrome on top. For personas this produces redundant title bars + cramped content. I shipped a fix in `CorpusChatPanel/SlideProjection.runExport` that captures from the live `slideRef.current` DOM at 1920×1080 with vector-text overlay (Bug A fix), but persona is the only kind that still uses this path because persona stayed structured.
- ❌ **Bug D (source-filter respect) NOT implemented.** When user types `from chronicle_higher_ed_gnews NOT FROM NORTHEASTERNDOCS`, the model still pulls from internal NU docs because we send the whole corpus unfiltered. Diagnosed root cause — corpus chunks are formatted as `=== <source_name> ===` blocks, and a filter pass before injection would solve it. Not coded.
- ❌ **No test suite for freeform pipeline.** The schema test from Task 1 is the only thing covered. Vitest is set up; tests can be co-located.
- ❌ **The skill markdown content is stub-quality.** I wrote 7 SKILL.md files with minimal placeholder voice/anti-pattern guidance. The user wants to author the real content but hasn't yet. They're at `humans-in-control-research/exemplar-skills/{brands,diagrams}/<name>/SKILL.md` (NOT `.claude/skills/` — see "Sacred file paths" below).

### Tasks from the 16-task plan that are NOT done

| # | Task | Status | Why deferred |
|---|---|---|---|
| 2 | `#deck` alias in parser | ✅ Parser already has it via `slides`; `#deck` was an alias request that's not strictly needed |
| 3 | Add DOMPurify dependency | ❌ Skipped — used lightweight regex sanitizer to ship faster |
| 11 | freeformExporter PNG + PDF | ❌ Not done — Designer's `ExportMenu` still uses legacy `artifactExporter` for everything |
| 12 | freeformExporter PPTX vector overlay | ❌ Not done — same reason |
| 13 | Migration filter (drop legacy types on hydrate) | ❌ Not done — Designer store still loads any stale `org`/`journey` artifacts |
| 14 | Compose Deck panel | ❌ Not done — `#slides`/`#deck` still triggers no UI |
| 15 | Cleanup (delete legacy code, remove npm deps) | ❌ Hard-blocked on E2E verification of freeform pipeline |
| 16 | E2E verification | ⚠️ Partial — bundle markers verified, user testing in progress |

---

## 3. What I tried that failed and why

### Failed attempt 1: Render the off-screen NxtDocViewer for persona PPTX export
**Symptom:** PPTX showed redundant title bar + persona doc cramped to right side with empty left half.
**Root cause:** Off-screen exporter rendered the `NxtDocViewer` (which has `maxWidth: 960px; margin: 0 auto`) inside a 1808-wide capture, leaving 424px white space on each side. Then composed its own slide chrome on top, duplicating the persona's internal title.
**Fix that worked:** Capture from the LIVE `SlideProjection.slideRef` DOM at 1920×1080 with `pixelRatio` calibrated for upscale. Vector-text overlay walks the DOM for editable PowerPoint text frames over a sharp image background. Code in `CorpusChatPanel.tsx` `SlideProjection.runExport`.

### Failed attempt 2: Route everything through one pre-made artifact lookup in CorpusChatPanel
**Symptom:** User typing `What #persona patterns are emerging from chronicle_higher_ed_gnews? #NU` got a stale "Avery Stone" persona from the cache instead of fresh generation.
**Root cause:** Lookup matched on `(type, brand)` only, ignored `parsed.cleanPrompt`. ANY hashtag request returned the most recent matching artifact regardless of what the user actually asked.
**Fix that worked:** `userHasSpecificContext = parsed.cleanPrompt.trim().length >= 4` — bare hashtag delivery only when prompt has no qualifying text. Otherwise force regeneration.

### Failed attempt 3: Single-artifact JSON parser for "generate 5 personas"
**Symptom:** User typed `generate 5 #NU #persona #slides`. Model emitted JSON array of 5 personas. Parser failed because `extractJson` only handled single objects.
**Root cause:** `extractJson` did `candidate.indexOf('{')` and `candidate.lastIndexOf('}')` which produced an ill-formed slice when the outer wrapper was `[`.
**Fix that worked:** Truncation-tolerant object walker. Detects array-shaped output, walks element-by-element extracting complete `{...}` objects with brace+string-state tracking. A truncated last object loses only itself; complete earlier objects survive. Plus bumped `MAX_TOKENS` from 16K to 32K. Code in `chatToArtifact.ts`.

### Failed attempt 4: White-background fallback in FreeformViewer for incomplete HTML
**Symptom:** Right side of org chart was black void. I injected `body { background: white }` to hide it.
**User reaction:** "NO fallbacks!!! No white background in case incomplete html! DO NOT produce incomplete HTML!"
**Why it was wrong:** Fallback hid the real problem (model producing incomplete HTML) instead of surfacing the failure. User wants hard rejection with specific error so the model can be tightened against the actual shortcut.
**Fix that's in flight:** Removed the white-bg fallback. Added a `checkStructuralCompleteness` function that REJECTS output missing `<!DOCTYPE>`, `</body>`, `</html>`, literal `width: 1920px` declaration, `.slide-frame` class, atmospheric overlay class, or Google Fonts link. Returns specific error messages identifying exactly what was missing.

### Failed attempt 5: Vague prompt instructions
**Symptom:** Model produced HTML that compiled but had wrong dimensions.
**User reaction:** "Did you instruct the model HOW to generate complete HTML for each artifact???"
**Why it was wrong:** I had hand-wavy "preserve the exemplar" instructions but no step-by-step HOW. The model was guessing.
**Fix that's in flight:** Imported the battle-tested 3-hammer prompt structure from `internal-solutions-journeymapper/src/ai_analysis/dynamic_journey_mapper.py`:
1. **Top hammer** — caps-lock `CRITICAL INSTRUCTION: YOUR RESPONSE MUST BE A COMPLETE HTML DOCUMENT WITH ALL TAGS INTACT`
2. **Middle hammer** — numbered `CRITICAL HTML REQUIREMENTS` (9 items)
3. **End hammer** — `REMEMBER: I NEED THE ENTIRE HTML DOCUMENT WITH ALL OPENING AND CLOSING TAGS`
Plus 6-step construction procedure (start with exemplar → preserve verbatim → replace text → scale dimensionality → per-kind body → self-check) and per-kind body construction guidance for all 5 artifact types.

### Failed attempt 6: Subagent-driven autonomous run
**Symptom:** I dispatched a code reviewer subagent and an implementer subagent for Task 1. Reviewer flagged 3 minor issues (fixture pattern divergence, missing test, missing transitional comment). Implementer fixed them via `--amend`.
**Why it was wrong (in retrospect):** The user wanted FAST progress. The two-stage review per task adds ~10 minutes per task × 15 tasks = 2.5 hours of review overhead before they see anything. Mid-run, the user surfaced production bugs that needed immediate attention, breaking the autonomous flow anyway.
**What I should have done:** Stayed inline, no subagents, no per-task reviews, just shipped working code. The user's tolerance for review overhead is low when they have visible bugs in production.

### Failed attempt 7: Path `.claude/skills/` for the diagram-illustrator skill files
**Symptom:** Local `npm run build` worked. Docker build failed: `Could not resolve "../../../.claude/skills/brands/nxt-style/SKILL.md?raw"`.
**Root cause:** Docker build context is `./humans-in-control-research/` so `../../../.claude/` resolves to a path OUTSIDE the build context. Vite ?raw imports fail at the rollup stage.
**Fix that worked:** Copied skill files into `humans-in-control-research/exemplar-skills/` (inside the build context) and updated `exemplarLoader.ts` to import from `../../exemplar-skills/...`. The `.claude/skills/` originals are still there but unused by the freeform pipeline.

---

## 4. The user's standing rules (memorize these)

These are extracted from saved feedback in `C:\Users\JonathanLupo\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\`. Treat as non-negotiable.

1. **Sacred ports.** NEVER bind 3000 (Social Research UI) or 5011 (HiC). HiC frontend changes ship via `docker compose -f docker-compose-all.yml up -d --build research-generator` then hard-refresh. Don't suggest `npm run dev`.

2. **No commits without explicit approval.** Stage but don't commit per task. The user reviews/tests, then says "commit" (or equivalent). When you DO commit, always run `git status` first AND use `git commit --only <explicit paths>` to avoid sweeping in unrelated working-tree changes. I made this mistake once today; had to `git reset HEAD~1` to unwind.

3. **Test before handoff.** HTTP 200 is not enough. Verify the app actually renders in a browser, or say explicitly "I haven't tested in browser." Do not claim something works based on type-check alone.

4. **No emoji.** Anywhere. Code, prompts, output. Causes Power Automate JSON escape failures elsewhere and reads unprofessionally.

5. **No fallbacks.** When something is wrong, surface the failure with a specific error. Don't paper over with white backgrounds, retry mechanisms, or silent defaults. The user wants the model to produce CORRECT output, not be hidden when it doesn't.

6. **Don't anchor to existing code in brainstorming.** Explore feature shape before proposing to reuse templates/services/pipelines. Once a design is locked, then implementation can pattern-match.

7. **Skill files for the freeform pipeline live in `humans-in-control-research/exemplar-skills/`** (inside the Docker build context), NOT `.claude/skills/`. The `.claude/skills/` directory is for HiC's existing 28 prompt-engineering skills (loaded by `wikiService.loadGenerationContext`).

8. **The Designer popup must never take the user off the Analyst Desk view.** It opens via `window.open('?designer=1', 'nxt-design-desk', features)` in a separate window.

9. **The user types instructions in chat; pre-made artifact lookup is for bare hashtags only.** ANY qualifying text (4+ chars in `cleanPrompt`) forces fresh regeneration. This was Bug B's fix.

---

## 5. Architecture quick reference

### File layout (flat, no `src/` directory — Vite resolves to `./`)

```
humans-in-control-research/
├── App.tsx                  3,742 lines — root state machine, all stages, checkpoints
├── index.tsx                routes ?designer=1 to standalone DesignDesk popup
├── types.ts                 Artifact = PersonaArtifact | JourneyArtifact | OrgChartArtifact | FreeformArtifact
├── components/
│   ├── CorpusChatPanel.tsx  the Analyst chat — hashtag interception, freeform routing
│   └── ...
├── design-desk/
│   ├── DesignDeskChat.tsx   the Designer chat in the popup
│   ├── DesignDesk.tsx       the popup container
│   ├── ArtifactViewer.tsx   renders FreeformViewer for type='freeform'
│   ├── components/
│   │   ├── FreeformViewer.tsx       NEW — iframe-isolated 16:9 envelope
│   │   ├── NxtDocViewer.tsx         legacy persona renderer
│   │   ├── OrgChartCanvas.tsx       legacy reactflow org chart
│   │   ├── FossflowCanvas.tsx       legacy isometric journey
│   │   └── ExportMenu.tsx           Designer's export buttons (still legacy)
│   ├── schemas/
│   │   ├── freeformArtifact.ts      NEW — minimal Zod schema (html opaque)
│   │   ├── personaArtifact.ts       legacy
│   │   ├── journeyArtifact.ts       legacy (will be deleted in Task 15)
│   │   └── orgChartArtifact.ts      legacy (will be deleted in Task 15)
│   ├── services/
│   │   ├── chatToFreeform.ts        NEW — prompt + provider routing + completeness check
│   │   ├── exemplarLoader.ts        NEW — loads HTML + skills via Vite ?raw
│   │   ├── freeformParser.ts        NEW — parses :::nxt:freeform blocks
│   │   ├── freeformSanitizer.ts     NEW — lightweight HTML sanitizer
│   │   ├── chatToArtifact.ts        legacy structured pipeline (still used by persona)
│   │   ├── artifactExporter.ts      legacy off-screen export (still used for persona)
│   │   └── designContext.ts         cross-window context persistence (corpus + uploads + themes)
│   ├── prompts/
│   │   ├── orgChartPrompt.ts        legacy (will be deleted)
│   │   ├── journeyPrompt.ts         legacy (will be deleted)
│   │   └── personaPrompt.ts         current
│   └── store/
│       └── designDeskStore.ts       Zustand artifact store with localStorage + cross-window sync
├── exemplar-skills/         NEW — diagram-illustrator + brand-style skill markdown
│   ├── brands/{nxt-style,nu-style}/SKILL.md
│   └── diagrams/{org,journey,arch,roadmap,blueprint}-illustrator/SKILL.md
├── styles/                  the 8 exemplar HTML files (1920x1080)
│   ├── 01-08 -*.html
│   └── nxt-design-system.css
├── proxy/                   FastAPI proxy at port 5012
└── hic-workspace/wiki/      LLM-maintained markdown knowledge layer
```

### Generation flow for a freeform artifact (the happy path)

```
user types in CorpusChatPanel: "#org #NU advancement division"
  → parseHashtags returns { content: ['org'], brand: 'nu', ... }
  → CorpusChatPanel sees FREEFORM_KINDS.has('org') → routes to chatToFreeform
  → chatToFreeform.generateFreeformArtifact:
      1. exemplarLoader.load('org', 'nu') reads styles/05-org-chart-NU.html
                                       + exemplar-skills/brands/nu-style/SKILL.md
                                       + exemplar-skills/diagrams/org-illustrator/SKILL.md
      2. buildPrompt assembles: 3-hammer structure + 6-step procedure + per-kind body guidance
                                + brand skill + diagram skill + exemplar HTML + corpus + user prompt
                                + output contract + final REMEMBER reminder
      3. callForModel(prompt, 'gemini-2.5-flash' | 'claude-opus-4-7' | 'gpt-5.4')
      4. parseFreeformOutput extracts JSON header + HTML body from :::nxt:freeform block
      5. checkStructuralCompleteness REJECTS if missing required pieces
      6. sanitizeFreeformHtml strips <script>, <iframe>, <form>, on-handlers, javascript: URLs
      7. validateFreeformArtifact (Zod) on the structured metadata
  → On success: store.addArtifact(artifact); chat shows delivery message + inline preview
  → On failure: chat shows specific error + raw response logged to console
  → Inline preview: FreeformViewer renders artifact.html in sandboxed iframe at 1920x1080,
                    scaled to fit container, wrapped in a 16:9 layout envelope
```

### Hashtag vocabulary (frozen)

- **Content:** `#persona`, `#journey`, `#org`, `#arch`, `#roadmap`, `#blueprint`
- **View modifiers:** `#slide` (single 16:9), `#slides` (deck), `#deck` (alias for slides)
- **Brand:** `#NXT`, `#NU`

---

## 6. Where I'm struggling

### Honest assessment

1. **I don't have eyes on the rendered output.** Every visual debug requires the user to take a screenshot, paste it, then I infer what's wrong. With dozens of CSS variables and brand tokens, my inference is often wrong.

2. **The model produces near-correct HTML that LOOKS structurally complete but visually fails.** The completeness check is text-pattern-matching on string presence — it can't tell if `width: 1920px` is in a comment or a media query rule. I keep tightening the check; the model keeps finding new ways to be subtly wrong.

3. **I haven't built a reproduction harness.** When the user reports a failure, I have no way to replay it locally. I should have:
   - A debug page at `localhost:5012/test-freeform` that shows the rendered iframe + raw HTML side-by-side
   - A script to dump the actual model response from the chat history
   - Snapshot testing of known-good and known-bad model outputs

4. **The 3-hammer prompt I lifted from JourneyMapper is heavyweight.** ~3000 tokens of system + user prompt before the corpus is even injected. With Gemini 2.5 Flash's 1M context this is fine, but it's bloat. A leaner prompt with the same fidelity would be better — but the user has been burned enough that they want belt-and-suspenders right now.

5. **I keep proposing fallbacks.** The user has corrected me three times. I default to "make it work somehow" instead of "surface the failure precisely." This is a behavior pattern I haven't fully internalized.

### Specific things I tried that I'm not confident about

- The 16:9 envelope fix (the most recent change) is correct in principle but UNTESTED by the user. There's a chance my scaling math has an off-by-one or my flex centering has an unintended effect when the container has a non-16:9 aspect ratio.
- The structural completeness check might be too strict in some cases (rejecting valid output because the model used `width:1920` without space) or too loose in others (accepting output where `width: 1920px` appears in a CSS comment but not in any active rule).
- The skill markdown files are stubs. The user has not authored real content. Without that, the prompt is missing the curated guidance the user envisioned.

---

## 7. What you should do FIRST

1. **Read this document completely. Don't skim.** Especially Section 4 (standing rules).

2. **Read `feedback_*.md` and `project_*.md` in the user's auto-memory at `C:\Users\JonathanLupo\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\`.** That's the project's institutional memory. The `MEMORY.md` index is the entry point.

3. **Run `git status` in `d:/NXT-HUMANS_AI_CX_WORKBENCH`.** Get the lay of the land. There's a backlog of staged changes you didn't make.

4. **Read the spec + plan:**
   - [docs/superpowers/specs/2026-04-26-freeform-html-artifacts-design.md](../superpowers/specs/2026-04-26-freeform-html-artifacts-design.md)
   - [docs/superpowers/plans/2026-04-26-freeform-html-artifacts.md](../superpowers/plans/2026-04-26-freeform-html-artifacts.md)

5. **Wait for the user to tell you what they're seeing in the browser.** Don't fix things they haven't reported. They retest things in their own time.

6. **When the user reports a freeform render bug, ask them to copy the `[Freeform] generated <kind>/<brand> (N chars). Full HTML: ...` log entry from the browser console.** That's the actual emitted HTML. Without it you're guessing the same way I was.

---

## 8. Useful diagnostic commands

```bash
# Verify which bundle is currently deployed
curl -s http://localhost:5011/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1

# Verify freeform pipeline markers in the deployed bundle
BUNDLE=$(curl -s http://localhost:5011/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
curl -s "http://localhost:5011/assets/$BUNDLE" -o /tmp/bundle.js
grep -c "nxt:freeform" /tmp/bundle.js                    # should be >= 2
grep -c "FREEFORM_KINDS\|exemplarLoader" /tmp/bundle.js  # should be >= 1
grep -c "data-freeform-viewer" /tmp/bundle.js            # should be >= 1
grep -c "CRITICAL INSTRUCTION" /tmp/bundle.js            # should be 1 (top hammer)
grep -c "REMEMBER: I NEED THE ENTIRE HTML" /tmp/bundle.js # should be 1 (end hammer)

# Force a Docker rebuild
cd d:/NXT-HUMANS_AI_CX_WORKBENCH
docker compose -f docker-compose-all.yml up -d --build research-generator

# Run vitest unit tests (covers the freeformArtifact schema)
cd humans-in-control-research && npm test

# Type-check (will show pre-existing errors — do not add new ones)
cd humans-in-control-research && npx tsc --noEmit 2>&1 | grep -E "your-file"
```

---

## 9. Summary of the user's emotional state

Jonathan has been working on the Design Desk feature for several days. He's invested real effort curating 8 exemplar HTML files at `humans-in-control-research/styles/`. He has a clear vision: HTML-as-artifact, freeform model authoring, exemplar inheritance.

Today he's been frustrated. The legacy reactflow/fossflow pipeline kept producing wrong output despite multiple bug fixes (Bug A persona PPTX, Bug B prompt-aware lookup, Bug C multi-artifact arrays). When he asked for the new freeform pipeline, the model produced incomplete HTML, then HTML with wrong dimensions, then HTML that looks right in chat but breaks in Designer popup.

He's lost trust in my testing claims. He's told me twice "you are supposed to be testing the app!" and most recently "Stop using the superpowers plugin and just listen to me!" He wants concrete progress, fewer process gates, and visible results.

Treat his time as the most expensive resource. Don't propose plans when fixes will do. Don't add features he didn't ask for. Don't make him repeat instructions. When he gives feedback, internalize it — the standing rules above are non-negotiable.

---

## 10. Open questions for the user

These should NOT be asked in your first turn — wait until the user tells you what they want to do next. But have them ready:

1. After the 16:9 envelope fix, does `#org #NU` render at proper 16:9 in both the Analyst Chat preview AND the Designer popup?
2. If the iframe renders 16:9 but the slide-frame inside has visible gaps (black void on right), do you want me to (a) tighten the prompt against whatever shortcut the model is taking, (b) ship a different model selector default, or (c) build a debug view that shows the raw model HTML?
3. Should the Compose Deck panel (Task 14) ship before user authors the real skill content, or wait until the freeform pipeline is producing correct output first?
4. The persona PPTX export (legacy artifactExporter) is still on the broken path. The Bug A fix only updates the chat-panel `SlideProjection.runExport`, not the Designer's `ExportMenu`. Want me to apply the same DOM-capture approach to the Designer's persona export?
5. Bug D (corpus source filtering — "from chronicle_higher_ed_gnews NOT FROM NORTHEASTERNDOCS") is queued. Priority?

---

## 11. Files I've touched this session (not exhaustive)

```
NEW
  humans-in-control-research/design-desk/schemas/freeformArtifact.ts
  humans-in-control-research/design-desk/schemas/freeformArtifact.test.ts
  humans-in-control-research/design-desk/components/FreeformViewer.tsx
  humans-in-control-research/design-desk/services/chatToFreeform.ts
  humans-in-control-research/design-desk/services/exemplarLoader.ts
  humans-in-control-research/design-desk/services/freeformParser.ts
  humans-in-control-research/design-desk/services/freeformSanitizer.ts
  humans-in-control-research/__fixtures__/freeform.valid.json
  humans-in-control-research/exemplar-skills/{brands,diagrams}/**/SKILL.md  (7 files)
  humans-in-control-research/vite-env.d.ts                                  (?raw module declarations)
  docs/superpowers/specs/2026-04-26-freeform-html-artifacts-design.md
  docs/superpowers/plans/2026-04-26-freeform-html-artifacts.md
  docs/handoffs/2026-04-26-hic-research-handoff.md                          (this file)
  .claude/skills/{brands,diagrams}/**/SKILL.md                              (originals, now unused by build)

MODIFIED
  humans-in-control-research/design-desk/types.ts                          (added FreeformArtifact to union)
  humans-in-control-research/design-desk/ArtifactViewer.tsx                (renders FreeformViewer for type=freeform)
  humans-in-control-research/components/CorpusChatPanel.tsx                (Bug A persona PPTX, Bug B lookup, Bug C array, freeform routing)
  humans-in-control-research/design-desk/services/chatToArtifact.ts        (Bug C array support, MAX_TOKENS=32K)

PRE-EXISTING UNCOMMITTED CHANGES (from earlier sessions)
  humans-in-control-research/App.tsx                                       (designContext persistence)
  humans-in-control-research/services/corpusChatService.ts
  humans-in-control-research/services/geminiService.ts
  humans-in-control-research/design-desk/components/OrgChartCanvas.tsx     (radial layout)
  humans-in-control-research/design-desk/schemas/orgChartArtifact.ts       (radial enum)
  humans-in-control-research/design-desk/prompts/{orgChart,journey,persona}Prompt.ts  (REVISE discipline)
  humans-in-control-research/design-desk/DesignDeskChat.tsx                (designContext + diff summary)
  humans-in-control-research/design-desk/DesignDesk.tsx
  humans-in-control-research/design-desk/components/ExportMenu.tsx
  humans-in-control-research/design-desk/services/artifactExporter.ts      (off-screen render rewrite)
  humans-in-control-research/design-desk/services/hashtagParser.ts         (plural aliases)
  humans-in-control-research/index.tsx                                     (?designer=1 routing)
  humans-in-control-research/types.ts
  humans-in-control-research/package.json                                  (npm: fossflow, react18 downgrade)
  humans-in-control-research/package-lock.json
  + 8 more in hic-workspace/wiki/sources/
```

---

## End

Read everything above. Then read the saved memories. Then wait for the user.

Good luck. Don't break things.
