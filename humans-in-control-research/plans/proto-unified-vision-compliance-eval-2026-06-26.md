# #proto vs. the Unified Vision: Lego-Brick Compliance Evaluation + VS/RI Plan

**Date:** 2026-06-26
**Status:** P0 + P1 IMPLEMENTED (typecheck 0, vitest 359/359, SPA rebuilt + smoke-clean). NOT committed; live #proto build (true acceptance gate) not yet run.

## IMPLEMENTED (2026-06-26)
- **P0 converge:** `experiencePrototypeComposer.ts` rewritten from a "STRICT COMPOSITION RULE" that mandated `p-*` class roots / min-8 `p-*` / a `p-*` PATTERN MANIFEST / "LEGAL PATTERN IDs (only allowed wrappers)" into an ADVISORY decomposition + data-depth guide. It now explicitly defers the render vocabulary to the `proto/<Name>` manifest and all color/font to the FIGMA tokens. The `p-*`/`proto/<Name>` contradiction inside the orchestrator prompt is gone; the existing `extractManifestProtoIds` fidelity check is now measuring the one true vocabulary.
- **P0 never-hardcode:** stripped stale literal fonts (`Bebas Neue`, `Spectral`, `Roboto`/`Roboto Condensed`, `Open Sans`) from `experiencePrototypeComposer.brandLanguage` (now `brandCharacter`, token-deferred), from `buildStage3System` example text, and corrected `_catalog.json` `brand_variants` (Saira Condensed / Lato). Deleted the dead, stale `BRAND_TOKENS` orphan const in `prototypeBuilder.ts`.
- **P1 token carrier:** `fetchLiveBrandTokensJson` + `buildTokenRootCss` + `injectTokenCarrier` prepend a deterministic, idempotent `:root` block (raw token names + manifest semantic aliases) into the assembled prototype, so `var(--accent)`/`var(--font-display)` resolve to the live brand value regardless of the model's transcription. Guarded; skipped (never breaks the build) if tokens are unreachable.
- **P1 region-scoped fidelity gate:** a pod that declared a component not in the manifest gets ONE corrective rebuild (parallel, offending screens only, no-regression fallback) - never a whole-app rebuild (avoids the 300s/504 that forced the pod split).
- **P1 purity + grounding metric:** `auditTokenPurity` flags literal hex + stale fonts; `grounding_pct` computed from pods; both surfaced in the build progress + a stale-font critique issue.

## REMAINING
- Live `#proto (...)` build verified rendering at :5011 (acceptance #4) - not yet run.
- P2 (RHO/SkillOpt): persist grounding%/token-purity to the wiki receipt + ratchet a floor; schedule manifest<->Figma parity. Not started.
- North star (epsilon): compile manifest anatomy into real JSX brick partials. Not started.

---

## (original plan below)
**Status (original):** EVALUATION + PLAN ONLY. Nothing wired, nothing committed.
**Scope:** Does `#proto` (Analyst Desk chat) compile UI at runtime by Lego-bricking registry-identified Figma patterns + tokens, per UNIFIED_VISION.md (Principle 7 + the Lego-brick doctrine, Track B / Method A)?

---

## 1. The doctrine (what compliance requires)

From `.claude/UNIFIED_VISION.md` (verbatim, lines 26-30, 59-80):

- Principle 7: "Every deliverable is assembled from NAMED, REGISTERED Figma components + variables + tokens, **the way `#proto` builds a UI from `proto-component-manifest.md`**. The model reads the brick contracts from the markdown manifest at generation time and COMPOSES; it never invents UI shapes and never hardcodes values."
- 1a: "The model composes from registered bricks at generation time... exactly as `prototypeBuilder.ts` reads `proto-component-manifest.md` for `#proto`."
- 1b: "Colors/fonts/spacing come from tokens (`/api/design-tokens`...). **No literal hex / font / size in a renderer body.**"
- 1c: "'Dynamic' means the model reads the markdown manifest and composes; it does NOT mean live Figma MCP calls from the deployed SPA."
- Meta-principle: **CONVERGE** duplicate paths onto one chokepoint, **DELETE** the legacy parallel, **GATE** every loop behind a held-out check, **SCHEDULE** the curators.

Critically: the doctrine names `#proto` as **the reference implementation** of Method A. So the test is not "is it literal component assembly" (the doctrine explicitly accepts "model reads markdown and composes"); the test is whether `#proto` is (a) grounded on ONE registered brick vocabulary, (b) free of hardcoded values, (c) gated.

---

## 2. What actually happens (verified in code, 2026-06-26)

Pipeline entry: `hashtagParser.parsePrototypeDirective` (`services/hashtagParser.ts:216`) -> brief picker -> `buildPrototype` -> `buildAppViaPods` (`services/prototypeBuilder.ts:1298`). All stages run **Claude Opus 4.8** (Gemini 3.1 Pro resilience fallback). Stages: 1 brief -> 2 interaction spec -> 2.5 simulated sessions -> 3 visual design -> ORCHESTRATOR (shared contract + screen decomposition) -> parallel PODS (one screen each) -> deterministic `assembleAppFromPods` -> REVIEWER -> `ensureCompiles` (Babel) -> headless render gate.

### 2.1 What is genuinely doctrine-aligned (the strong parts)
- **Live token fetch, no fallback.** `fetchLiveBrandTokens` (`:36`) hits `/api/design-tokens?brand={NXT|NU}&format=prompt` and on failure **refuses to substitute hardcoded values** (`:40`). Tokens injected into Stage 3 (`:1647`) and the orchestrator (`:1343`).
- **Real, Figma-anchored render vocabulary.** `proto-component-manifest.md` (68KB, 261 `proto/<Name>` ids) maps to live Figma pages NXT `403:2` / NU `332:2`, screenshot-verified across vol I-V. This is the most Figma-anchored of any hashtag path.
- **Manifest is the brick contract the orchestrator/pods compose from.** `sliceManifestForCategories` (`:1103`) gives each pod only its categories; the orchestrator emits `component_ids` copied verbatim from `### proto/<Name>` headings.
- **SPA never calls Figma live** (manifest + tokens are read via proxy). Compliant with 1c.

### 2.2 The deviations (the truth behind the implementation)

**A. The output is LLM-authored JSX prompted to follow bricks, not assembly of bricks.** Each pod emits a fresh React `Screen_<id>` string (`callClaudeStage(podSystem, podUser, 20000)`, `:1381`); `assembleAppFromPods` splices strings at `SCREEN_MARKER`. The "brick" is a prose anatomy spec the model re-implements every run. **This is acceptable under Method A** ("the model reads the markdown manifest and composes"), so A is the *least* damning deviation. It is noted for the north-star option, not as a violation.

**B. TWO competing vocabularies are injected into the SAME prompt; one is dead weight and it poisons the fidelity metric.** `composerPreface` (from `experiencePrototypeComposer.ts`, the `experience-prototype-composer` skill) is unconditionally prepended to Stage 3 (`:1647`) and the orchestrator (`:1342`). It mandates the **`p-*` AI-patterns catalog**: "Every UI region MUST be a NAMED pattern from the catalog. Use the pattern's class root (`p-chat, p-rec, p-dial`...)" + "Minimum 8 distinct patterns" (`experiencePrototypeComposer.ts:304-318`). But `POD_ORCHESTRATOR_SYSTEM` (`prototypeBuilder.ts:1191`) says the opposite: **"DO NOT use a `p-*` scheme - there is no `p-*` catalog; the only real ids are the `proto/<Name>` ones in the manifest."** And the fidelity check `extractManifestProtoIds` (`:1091`) only matches `proto/<Name>`.
  - Net effect: if the model obeys the composer (emits `p-*` ids in its `PATTERN MANIFEST:` line) -> **100% flagged "invented"** (none match the `proto/<Name>` set). If it obeys the orchestrator (emits `proto/<Name>`) -> the composer's class-root + min-8 rules are silently ignored.
  - This is an un-converged legacy parallel (the `p-*` catalog predates the 2026-06-23 `proto/<Name>` manifest rebuild). Direct violation of CONVERGE + DELETE. It also makes the grounding/fidelity number untrustworthy.

**C. Hardcoded, STALE fonts violate never-hardcode (1b) and conflict with the live tokens in the same prompt.** `experiencePrototypeComposer.ts` injects literal fonts: NXT "Display: Bebas Neue" (`:174`), NU "Display: Spectral Light / Body: Roboto / Mono: Roboto Mono" (`:159-161`). `_catalog.json` brand_variants carries `"display_font": "Bebas Neue"`. **Both are factually wrong now**: NXT display = `Saira Condensed` (Bebas dropped 2026-06-13), NU = single-typeface `Lato`. These literals sit in the SAME assembled prompt as the live FIGMA DESIGN TOKENS block (Saira/Lato) -> the model receives contradictory font guidance. Same orphan-hardcode failure mode flagged for the HTML-artifact path (`project_figma_grounding_hashtag_audit_2026_06_24`), now confirmed in `#proto`.

**D. Tokens reach the output as model-transcribed prose, not a deterministic carrier.** The orchestrator is told to put "design-token CSS as a `<style>` tag or constants taken VERBATIM from the FIGMA DESIGN TOKENS block" (`:1168`). Nothing deterministically guarantees the emitted `:root` matches the tokens; correctness depends on the model transcribing accurately. No post-assembly hex/font lint.

**E. No hard fidelity/token gate.** Invented components -> `console.warn` + a single `'minor'` critique issue (`:1453`). A `'rebuild'` verdict does NOT block: the assembled file ships verbatim unless the reviewer returns *substantive* `corrected_code` (`:1464-1486`). The only HARD gates are structural (missing `SCREEN_MARKER`/`App` throws; >=1 pod must build; Babel must parse; render not blank). **Figma/token fidelity is advisory.** The doctrine wants the no-hardcode scan to go "shadow -> blocking"; for `#proto` it never blocks.

### 2.3 Verdict
Intent: strong, and the core compose-from-markdown architecture IS what Method A intends. Execution: **partially compliant, currently self-sabotaged.** `#proto`'s real Figma-anchored grounding (manifest + live tokens + no-fallback) is undermined by an un-converged duplicate vocabulary (`p-*` catalog), polluted by stale hardcoded fonts, transcribed rather than carried, and enforced by nothing. It fails the meta-principle on CONVERGE, DELETE, never-hardcode (1b), and GATE.

---

## 3. Improvement plan (Verbalized Sampling + Reinforcement Inference)

### 3.1 Verbalized Sampling: candidate architectures (frame + probability)

- **alpha - Converge on the manifest, retire `p-*` from the proto path** (typical, p~0.45). Remove the `p-*` class-root mandate + min-8 rule from `composerPreface`; the manifest `proto/<Name>` becomes the single render vocabulary. Makes the existing fidelity check honest with the least new machinery.
- **beta - Keep both as orthogonal layers + a deterministic `p-*` -> `proto/<Name>` map** (shifted, p~0.25). `p-*` stays as the behavioral *decomposition* taxonomy (genuinely useful: "what experience moments compose this"); `proto/<Name>` stays as the *render* vocabulary; a mapping table resolves them and the fidelity check validates the mapped ids. Preserves the catalog's planning value.
- **gamma - Make tokens a load-bearing carrier, not prose** (token-purity, p~0.12 standalone, high value as a component). Deterministically prepend a `:root{--accent...}` CSS block built from `/api/design-tokens` into `shared_code` post-assembly; add a lint/strip pass that flags any model-emitted hex/font literal. Kills deviations C+D outright.
- **delta - Promote fidelity to a bounded, region-scoped blocking gate + RHO loop** (gate-first, p~0.10). Invented region -> ONE targeted pod rebuild against the nearest real `proto/<Name>`; record grounding% on the build receipt; ship only above a floor; feed SkillOpt.
- **epsilon - Compile manifest anatomy into real JSX brick partials; deterministic assembly + LLM fill** (radical, p~0.05). The truest literal Lego-brick. Large build, rigidity risk. North star, not scheduled.

### 3.2 Reinforcement Inference (re-derive at the uncertain joints)

- **Is `p-*` worth keeping (beta) or pure debt (alpha)?** Re-derived from source: the orchestrator + pods *already* do screen/region decomposition themselves and *already* explicitly repudiate `p-*`. The team has de facto chosen alpha at the load-bearing layer; the composer is vestigial there. Re-introducing `p-*` into the orchestrator (beta) swims upstream. **Resolution: refined alpha** - retire `p-*` as a *render-vocabulary constraint*, but keep the catalog as an *advisory decomposition hint* (no class-root mandate, no min-count, no fidelity scoring against it).
- **Does prose-transcribed tokens actually drift?** No deterministic check exists, so the safe move removes the question: **adopt gamma** (deterministic carrier + literal-lint). High value, moderate effort.
- **Will a hard gate re-introduce 504 timeouts (the failure that forced the pod rewrite)?** Likely if it triggers whole-app rebuilds. **Resolution: delta must be region-scoped** (rebuild only the offending pod, bounded retries), never whole-app.

### 3.3 Synthesized plan (sequenced)

**P0 - CONVERGE + DELETE (one vocabulary).**
- In `prototypeBuilder.ts`, stop letting `composerPreface` assert a render vocabulary. Either drop the `p-*` class-root/min-8 block, or replace the composer injection with a thin advisory "experience-decomposition hints" block that names `proto/<Name>` candidates only.
- Single render vocabulary = `proto-component-manifest.md`. The existing `extractManifestProtoIds` fidelity check now measures something real.

**P0 - never-hardcode (1b).**
- Strip literal fonts (`Bebas Neue`, `Spectral`, `Roboto`) from `experiencePrototypeComposer.ts:159-183` AND from `_catalog.json` `brand_variants`. Nothing in the proto path may carry a literal font/hex; all from `liveTokens`. (These are also factually wrong: Saira Condensed / Lato.)

**P1 - token carrier (gamma).**
- Post-assembly, deterministically inject a `:root` token block from `/api/design-tokens` into `shared_code`; add a lint pass that flags/strips model-emitted hex + font-family literals. Tokens become load-bearing.

**P1 - bounded GATE (delta, region-scoped).**
- Promote fidelity to: invented region -> one targeted pod rebuild against nearest `proto/<Name>`; record `grounding_pct` + `token_purity` on the build receipt; ship only above a floor. Bounded retries so no 504 regression.

**P2 - RHO/SkillOpt + SCHEDULE.**
- Log per-build grounding% + token-purity to the wiki; feed the miner so the floor ratchets. Schedule a parity check (proto manifest <-> Figma pages 403:2/332:2) on a cadence so PENDING categories do not silently rot.

**North star (epsilon, flagged not scheduled).** Compile manifest anatomy into real JSX brick partials for true deterministic assembly.

### 3.4 Acceptance (when #proto is doctrine-compliant)
1. Exactly ONE render vocabulary reaches the model (no `p-*` vs `proto/<Name>` contradiction in the assembled prompt).
2. Zero literal font/hex strings in the proto generation path (composer + catalog + emitted code), verified by lint.
3. `grounding_pct` and `token_purity` recorded per build and gated above a floor (region-scoped repair, no whole-app rebuild).
4. typecheck 0, vitest green (incl. `extractManifestProtoIds`), live `#proto` build verified rendering in the SPA at :5011 (build-then-test-then-commit; no commit without approval).
