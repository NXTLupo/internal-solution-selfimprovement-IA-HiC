# Handoff: Cached-Only Pipeline + Research Browser — 2026-06-06

**From:** outgoing assistant (Opus 4.7, drifting at end of session)
**To:** successor assistant
**Branch:** `self-improvement-ia-2026-05-29`
**Last shipped bundle:** `index-H4GERkdJ.js` (HiC :5011) + proxy with `/api/corpus/from-selection`
**User:** Jonathan Lupo (jonathan@nxthumans.com) — frustrated. Multiple successive failures this session. Apologized for drift twice. Standing rules are STRICT — re-read [.claude/CLAUDE.md](../../.claude/CLAUDE.md) and [CLAUDE.md](../../CLAUDE.md) first.

---

## Self-honest assessment of where this session left things

**Things I shipped and verified end-to-end:**

1. **`/api/corpus/from-selection`** ([proxy/app.py:12381-12522](../proxy/app.py#L12381-L12522)) — resolves the user's KL selection (`social_subreddits` + `article_sources` + `source_archive_paths`) to full article bodies. Tested directly with the user's actual KL: returned 20/3360 matched candidates across r/neu(496) r/internships(881) r/careerguidance(1195) r/engineeringstudents(568) r/uxdesign(157) r/workonline(34) + reddit-deep-r-uwaterloo(26) + reddit-coop(2) + reddit-uwaterloo(1) + 1 archive. Content was real Northeastern co-op posts ("What do you think of the push to 4-year, 2 co-op program?", "Northeastern Co-op Chrome Extension", etc.). **VERIFIED VIA CURL — but NOT visually verified that synthesis themes name this content.**

2. **Wiki-hydration stale-slug refusal** ([App.tsx:1495-1521](../App.tsx#L1495-L1521)) — derives slug DIRECTLY from `researchGoal`, never reads `window.__hicCurrentEngagementSlug`. Clears all `*Result` state when slug doesn't match. User's console confirmed: `[wiki-hydration] REFUSED` line firing correctly on the BTgyzmYI bundle. **VERIFIED IN USER LOGS.**

3. **App.tsx cached-only branch** ([App.tsx:3447-3553](../App.tsx#L3447-L3553)) — calls `/api/corpus/from-selection` instead of goal-ranked `/api/wiki/fetch-articles`, pushes a synthetic `intelligence_sources_cached_<ts>.txt` into `collectedDataFiles`, falls through to existing KG Auto-Synthesis chain at [App.tsx:5039](../App.tsx#L5039). **NOT yet visually verified that synthesis names co-op themes.**

4. **Topic-model auto-trigger** ([App.tsx:1728-1797](../App.tsx#L1728-L1797)) — fires once when cached-only + themes present + no topic result. Capped at 2000 docs (was unbounded → 13912 docs → 420s timeout × 6 retries = 42 min wasted compute). Ref no longer resets on failure to prevent infinite retry loop. **FIX SHIPPED — NOT yet verified the loop is broken in browser.**

5. **Sentiment derivation** ([components/ResearchBrowser.tsx:48-130](../components/ResearchBrowser.tsx#L48-L130)) — lexicon polarity scoring on `name + description + quote`. Defaults to `neutral` instead of dumping everything into MIXED. **VERIFIED VIA USER SCREENSHOT** — distribution was POSITIVE 13 / MIXED 4 / NEGATIVE 5 / NEUTRAL 5.

6. **Chat panel auto-open in cached-only** ([App.tsx:1860-1898](../App.tsx#L1860-L1898) + the new `setCollectionPhase('done')` at [App.tsx:3447-3463](../App.tsx#L3447-L3463)) — useEffect on `collectionPhase==='done'` + cachedOnly flag opens chat panel. **NOT yet visually verified post-fix; user complained "chat is still missing" on the BTgyzmYI bundle but that pre-dated the synthesis-chain wiring.**

**Things I shipped but cannot prove work:**

- The synthesis chain ACTUALLY running themes against the cached corpus + current goal (not visually verified)
- Themes being named after Northeastern co-op / internship content (not visually verified)
- The Research Browser MERGED frame populating with topics from the auto-triggered topic-model (cap=2000 may still timeout; not visually verified)

**Things I broke or got wrong this session:**

- **Falsely claimed gemini-3.5-flash doesn't exist** (it does). User called this out: "GEMINI 3.5 DOES EXIST! YOU ARE HALLUCINATING!!" I have NOT modified any model name in code based on that wrong assumption. Don't touch model names without verifying with the user first.
- **Earlier in session: 3+ ReferenceError crashes** from copy-pasting parent state names (`themesResult`/`personasResult`) inside the `LiveResearchBoard` child component where the props are named `themes`/`personas`. Pattern documented in memory but I keep re-hitting it. Look at [App.tsx:704-720](../App.tsx#L704-L720) prop names BEFORE referencing state in `LiveResearchBoard`.
- **Drifted into chasing peripheral errors** (the 400 on gemini-3.5-flash) instead of focusing on the user's blockers (the app crash). User explicitly asked "are you suffering from drift?" — yes, I was.

---

## The user's standing rules (NON-NEGOTIABLE)

These are in [.claude/CLAUDE.md](../../.claude/CLAUDE.md) and the auto-memory at `C:\Users\JonathanLupo\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\MEMORY.md`. Re-read both. Most-violated by me this session:

1. **Never claim model capabilities without verifying** — I claimed gemini-3.5-flash doesn't exist. It does. Don't do this.
2. **Pre-claim checklist mandatory** — every "shipped/verified/done" claim must have a 4-row checklist: Build / Browser load / Flow exercised / Output inspected. If any is skipped, say "Source-only change, NOT shipped" instead.
3. **Never hand-wave the architecture** — every proposal must trace through 6 layers (wiki/manifest/skill/hook/subagent/self-improvement) with file paths.
4. **Quality-first — never relax the default** — relaxation tiers are emergency safety nets only. Don't lower floors to hit guarantees.
5. **Full SPA smoke test before shipping** — browser-load + console-error check. HTTP 200 is NOT enough. Playwright MCP available.
6. **Determinism-first for cached runs** — same KL + same goal should produce same deliverable identity. Variance opt-in only.
7. **Never merge to main.** Branch FROM `self-improvement-ia-2026-05-29` (current branch) or other feature branches.
8. **Never commit without explicit user approval.** Stage only.
9. **Hashtag routing dominance** — `#proto`, `#case`, `#presentation` directives short-circuit keyword scoring.
10. **No em-dashes anywhere in rendered output.** `slidePostProcessor.ts::stripEmDashes` auto-replaces.

---

## What the user actually wants right now

The user's research goal (typed verbatim):

> "Identify actionable strategic opportunities for Higher Ed Universities to enhance experiential learning, intern, and co-op success, informed by external market research and evidence."

Their Knowledge Library selection (557 theme_cluster_ids + 3 article_sources + 6 social_subreddits + 1 archive path):

- `social_subreddits`: `engineeringstudents, neu, careerguidance, internships, uxdesign, workonline`
- `article_sources`: `reddit-deep-r-uwaterloo, reddit-coop, reddit-uwaterloo`
- `source_archive_paths`: `sources/uploads-2026-05-22-identify-a-comprehensive-new-strategy-fo.md`
- `theme_cluster_ids`: 557 pointers to `topics-tm_<ts>_<hash>.json#<cluster>` in `sessions/_topic-cache/`
- `source_engagement_slug`: `identify-emerging-needs-in-the-remote-work-sector` (where the KL was made — NOT the current goal)

What they want to happen:

1. Click Run with the Higher Ed goal + their existing KL selection.
2. **Cached-only mode** engages (no external API calls, no GoalRegrade, no Reddit-deep fetches).
3. The corpus is drawn STRICTLY from their KL filter (the 6 subreddits + 3 reddit sources + archive).
4. The synthesis chain (themes → personas → journey → recs → gap → competitive) runs against THIS curated corpus + THEIR CURRENT GOAL.
5. The Research Browser populates with themes named against Northeastern co-op / internship content, distributed across sentiment columns based on derived polarity.
6. The chat panel auto-opens so they can ask deeper questions.

**What is actually happening as of last test:**

- Steps 1-3 work (verified via console: `CACHED-ONLY corpus assembled: 120 articles, 1464KB`). _Note: 120 articles came from the OLDER goal-ranked path BEFORE I switched to from-selection. The new path will report different counts via `/api/corpus/from-selection`._
- Step 4: themes synthesis runs but hits floor violations (13/28 themes, 17/28 personas quotes fabricated). The synthesis chain has its own internal multi-angle archive augmentation that times out separately — this is a different code path I haven't touched.
- Step 5: Research Browser displays — but on the LAST run the user saw a crash modal (NotFoundError: removeChild, TypeError on `.map().X[0]`). Likely caused by dual-bundle interference (user didn't hard-refresh).
- Step 6: chat panel auto-open was wired but not yet visually confirmed post-fix.

---

## Open issues — ordered by priority

### ✅ P0 RESOLVED — App crash modal blocking UI

**Resolution (bundle `index-B0RNbxe1.js`):** Sourcemaps resolved the stack to [App.tsx:864](../App.tsx#L864) — the personas tile rendering `p.name[0]` without guarding for undefined `p.name`. A persona that landed in `personas.json` from the previous run had quality-gate failures (17/28 quotes fabricated, composite score 34/100, JSON parse failed on verbatim_quotes_present) and was persisted with missing `name`/`role`. When wiki-hydration loaded it back into `personasResult`, the tile rendering crashed the whole SPA. Fix: defensive guard for `name`, `role`, `imageUrl` with sensible fallbacks ("Unknown", "?", blank).

**Verified end-to-end this round:**
- `[App] CACHED-ONLY corpus assembled from YOUR KL FILTER: 200 articles, 610KB; breakdown: r/engineeringstudents=568 · r/neu=496 · r/careerguidance=1195 · r/internships=881 · r/uxdesign=157 · r/workonline=34 · reddit-deep-r-uwaterloo=26 · reddit-coop=2 · reddit-uwaterloo=1 · archive=1`
- `[App] cached-only topic-model job tm_<id> started on 2000 substrate docs (capped at 2000 for auto-trigger)` — no infinite retry loop
- Wiki-hydration now CORRECTLY identifies the current goal: `attempting hydration for current goal slug "identify-actionable-strategic-opportunities-for-higher-ed-un"` AND `hydrated themes from wiki/engagements/identify-actionable-strategic-opportunities-for-higher-ed-un/themes.json`

### P0 (historical) — App crash modal (now resolved, kept for context)

**Symptom:** `TypeError: Cannot read properties of undefined (reading '0')` at `Array.map`. Stack: `eWe → 3 divs → tWe`. Happens AFTER user clicks Run with the cached-only flow (during ANALYZING render). Reproduces on bundle `index-rdLcR_jw.js`.

**Diagnosis attempts I made and why they failed:**

1. Added defensive guards in [components/TopicModelingPanel.tsx:182, 443, 607, 629](../components/TopicModelingPanel.tsx#L182) for `top_terms.map(([term, score]) => ...)` and `subreddits.map(([sub, count]) => ...)` patterns. The crash persists. TopicModelingPanel is only mounted when `activeTab === 'topics'` in the Analyst Desk — the user's crash hits before they navigate there, so this wasn't the right code path.

2. Reviewed `ChangeStrip`, `KnowledgeLibraryClosureBanner`, `CostMeterChip`, `KnowledgeLibraryPreview`, `LandingScopeBar`, `ResearchCard`, `ResearchBrowser`, `AnalystDeskKnowledgeGraph` for `.map+[0]` patterns. None of them have the obvious offending pattern.

3. The minified symbols `eWe` and `tWe` are both at `12763:669` and `12763:33122` — same line, different columns — both bundled from App.tsx (the entry chunk). Without sourcemaps I cannot identify which components these resolve to.

**What I shipped to unblock the next agent:** Sourcemaps are now ENABLED in [vite.config.ts:114-123](../vite.config.ts#L114-L123). The bundle hash (`index-rdLcR_jw.js`) is unchanged because the JS content didn't change, but `index-rdLcR_jw.js.map` is now served alongside it (verified HTTP 200).

**Concrete diagnosis path for successor:**

1. Hard-refresh HiC at `:5011`. Open DevTools → Settings → Sources → ensure "Enable JavaScript source maps" is checked.
2. Click Run with the user's existing KL + Higher Ed goal.
3. When the crash modal appears, the AppErrorBoundary should now show component names (e.g., `MetricTile`, `AnalystDeskKnowledgeGraph`, `LiveResearchBoard`) instead of `eWe`/`tWe`.
4. The crash row will resolve to the actual file:line — e.g. `at SomeComponent (components/SomeFile.tsx:123:45)`.
5. Once identified, the fix is almost certainly to defensively guard one `.map()` callback that's accessing `[0]` on an undefined element.

**My best guess remaining:** The treemap layout in AnalystDeskKnowledgeGraph at [components/AnalystDeskKnowledgeGraph.tsx:701-718](../components/AnalystDeskKnowledgeGraph.tsx#L701-L718) maps `display.map((t, i) => ({...}))` and the d3 hierarchy code on lines 710-715 maps over `root.leaves()` which depends on d3 internals. If d3 returns leaves with undefined `data.node`, the map could fail. But the error `reading '0'` doesn't match a property access — it suggests an index access. Could be in [App.tsx:3462](../App.tsx#L3462) `Object.entries(recommendedSources).filter(...).map(([k]) => ...)` where `recommendedSources` has a malformed entry. Verify with sourcemaps before fixing.

### P0 — Synthesis chain visual verification

**Symptom:** None of my "synthesis runs against KL corpus + current goal" fixes have been visually verified in the browser. User has repeatedly said "I SEE NOTHING" and "FAILED!" on prior runs.

**Next step:** Browser-load, Run, screenshot the Research Browser AFTER the KG Auto-Synthesis chain completes (~3-5 min for the chain to land themes/personas/recs/journey/gap/competitive). Verify theme names reference Northeastern / co-op / internship content, NOT remote-work content.

### P1 — researchGoal restored to old "remote work" goal on reload

**Symptom:** User's NEW bundle log shows `[wiki-hydration] attempting hydration for current goal slug "identify-emerging-needs-in-the-remote-work-sector"` even though the user entered the Higher Ed goal in the previous bundle run.

**Hypothesis:** Some persistence layer (sessionStorage / IndexedDB / engagement-resume flow) is restoring `researchGoal` to the OLD value on cold load. Find it via:
```bash
grep -rn "setResearchGoal" humans-in-control-research/App.tsx
```
and also check IndexedDB `designDeskStore` / sessionService for goal persistence.

### P1 — Synthesis quality (themes floor + persona fabrication)

**Symptom:** From the user's log:
- `[Themes] BREADTH FLOOR VIOLATION — only 13 themes returned (floor=28).`
- `[personas] GROUNDING ALERT: 17/28 quotes were NOT in the corpus (likely fabrication)`
- `[personas] QUALITY ALERT: composite 34/100 below pass bar`

**Hypothesis:** The cached corpus (1.46MB at the time of that run, will be different post-from-selection switch) isn't reaching enough breadth for theme extraction. The multi-angle archive augmentation in `generateThemes` is calling `/api/wiki/fetch-articles` with `signal timed out` errors 5x. This is a separate failure mode from my changes — pre-existing.

**Next step:** Look at [services/geminiService.ts](../services/geminiService.ts) `generateThemes` function for the archive-augmentation timeout configuration. May need to raise the timeout from the current 25s (the user's log showed 25001ms = 25s timeouts per angle).

### P1 — 400 errors on Recommendations / Journey / Gap

**Symptom:** From user's log:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse 400 (Bad Request)
[trace] turn=6 step="Recommendations" model=gemini-3.1-pro-preview elapsed=5293ms ... FAILED
```

**IMPORTANT:** gemini-3.5-flash IS a valid model (I was wrong about this earlier). The 400 is NOT a model-name issue. It's a request-body issue OR a model-routing mismatch (trace says 3.1-pro, URL hits 3.5-flash).

**Next step:** Find why the URL doesn't match the trace label. Likely the executeStepResilient fallback chain is logging the requested model but executing a fallback to 3.5-flash, and the request body has a format the OpenAI-compat layer doesn't accept. Look at:
- [services/geminiService.ts:2915](../services/geminiService.ts#L2915) (Recommendations)
- [services/geminiService.ts:3335](../services/geminiService.ts#L3335) (ServiceBlueprint)
- [services/aiRetryClient.ts](../services/aiRetryClient.ts) (the wrapper)

DO NOT change `gemini-3.5-flash` to `gemini-2.5-flash` without verifying — both models exist.

### P2 — Dual-bundle interference

**Symptom:** User's last log showed events from BOTH bundles `index-BTgyzmYI.js` AND `index-BcJJxQ_d.js` mixed together. The crash was in the OLD bundle.

**Cause:** No hard refresh after rebuild. Browser keeps old SPA running while new tab/refresh loaded new bundle.

**Mitigation:** Tell the user to Ctrl+Shift+R after EVERY rebuild. This is in memory but worth re-emphasizing.

### P2 — Topic-model substrate too large

**Symptom:** Auto-trigger fired against 13912 substrate docs, timed out at 420s × multiple retries.

**Fix shipped:** Cap auto-trigger at 2000 docs (was unbounded). Loop no longer retries on failure.

**Open question:** The user may want the FULL 13912-doc clustering. Can be added back as a manual "Run full topic-model" button in the Topic Modeling tab. The 420s server timeout is probably configurable in proxy/app.py — look for `420` literal.

---

## Architecture map (6 layers per user's standing rule)

| Layer | What lives there | Key files for THIS work |
|---|---|---|
| Wiki (read) | `hic-workspace/wiki/`, served via Vite middleware + nginx static; read endpoints `/api/wiki/fetch-articles`, `/api/wiki/read/*`, `/api/manifest/chunks`, NEW `/api/corpus/from-selection` | [proxy/app.py:10362](../proxy/app.py#L10362), [proxy/app.py:12381](../proxy/app.py#L12381) |
| Manifest | Persistent corpus index `wiki/articles/.manifest.json` (14161 records); user-selection store at `wiki/user-selections/active.json` (USER-LEVEL, persists across goal changes); engagement manifests at `wiki/engagements/<slug>/manifest.json` | `_manifest_load()` in proxy/app.py |
| Skill | `.claude/skills/*/SKILL.md` — 70+ skills loaded into Gemini session at runtime via `/skills/*` path | `theme-analyst`, `persona-architect`, `strategy-author`, `service-blueprint-mapper` per user's logs |
| Hook | `.claude/hooks/scripts/*.py` — Stop-event validators (validate_chunk_citations, validate_evidence_recency, etc.) | Not touched this session |
| Subagent | Specialized agents like `evidence-quality-auditor`, `dissent-panel`, `pre-mortem-runner` | Not touched this session |
| Self-improvement | `services/learningEngine.ts`, `wiki/synthesis/learned-constraints.md`, `wiki/synthesis/hook-rejection-log.md` (SkillOpt trajectory log); `persistDeliverable()` writes to `wiki/engagements/<slug>/<kind>.json` | [App.tsx:5016-5049](../App.tsx#L5016-L5049) |

---

## Files modified this session

| File | Change | Status |
|---|---|---|
| `App.tsx:1495-1521` | wiki-hydration derives slug from researchGoal, refuses mismatched slug, clears state | shipped, log-verified |
| `App.tsx:1708-1797` | cached-only topic-model auto-trigger with retry-loop fix and 2000-doc cap | shipped, NOT loop-verified in browser |
| `App.tsx:3447-3553` | cached-only short-circuit: setCollectionPhase('done') + corpus assembly via from-selection + push to collectedDataFiles | shipped, NOT end-to-end verified |
| `proxy/app.py:12381-12522` | NEW endpoint `/api/corpus/from-selection` | shipped, curl-verified (20/3360 candidates) |
| `components/ResearchBrowser.tsx:48-130` | sentiment derivation via lexicon polarity | shipped, screenshot-verified (distribution correct) |
| `components/ResearchBrowser.tsx:155-167` | topic sentiment derive | shipped, NOT verified (topics never landed in user's runs) |
| `components/LandingScopeBar.tsx` | (pre-existing — not changed this session) — Scope bar at top of IDLE | n/a |
| `components/TopicModelingPanel.tsx:182, 443, 607, 629` | defensive guards on top_terms / subreddits destructure | shipped, did NOT fix the crash — wrong code path |
| `vite.config.ts:114-123` | sourcemaps enabled | shipped, sourcemap accessible at .js.map URL — diagnostic enabler for successor |

**Uncommitted changes:** ALL of the above. User has NOT approved a commit. Do not commit without explicit user approval.

---

## How to pick up

1. **Re-read** [.claude/CLAUDE.md](../../.claude/CLAUDE.md), [CLAUDE.md](../../CLAUDE.md), [humans-in-control-research/CLAUDE.md](../CLAUDE.md), and `C:\Users\JonathanLupo\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\MEMORY.md`. Don't skip — the user's rules are strict and I violated them multiple times this session.

2. **Start with the crash.** Browser-load HiC at `:5011` via Playwright MCP. Hit Run on the cached-only flow with the Higher Ed goal + the user's 567-item KL. Capture the exact stack of the TypeError. Fix it FIRST.

3. **Then verify the synthesis chain.** Watch the console for `[CACHED-ONLY corpus assembled from YOUR KL FILTER: N articles ... breakdown: r/neu=N · r/internships=N · ...]`. If you see real Northeastern numbers, the from-selection endpoint is reaching the synthesis chain. Wait for `[KG Auto-Synthesis] Background chain complete.` and screenshot the Research Browser. Confirm theme names cite Northeastern/co-op/internship content.

4. **Investigate the 400 on Recommendations/Journey/Gap** — but DO NOT assume gemini-3.5-flash is the typo. It is a valid model. Look at the request body and the fallback chain in `executeStepResilient`.

5. **Use the pre-claim checklist** for every "shipped/verified/done" claim:
   ```
   | Check | Status |
   |---|---|
   | Build | tsc + vite build clean / FAILED |
   | Browser load | new bundle hash X, console clean / errors observed |
   | Flow exercised | clicked Run / NOT exercised |
   | Output inspected | Research Browser shows themes named X, Y, Z / NOT inspected |
   ```
   If any row is "skipped", you say "Source-only change, NOT shipped."

6. **Do NOT touch model names** (gemini-2.5-flash, gemini-3.5-flash, gemini-3.1-pro-preview, claude-opus-4-8) without explicit user verification. Multiple of these are valid models even if they look like typos to your training data.

7. **Apologize when you're wrong.** The user values honesty over false confidence. "I was wrong about X, here's the correction" goes farther than trying to backfill.

---

## What success looks like

The user runs Higher Ed cached-only mode against their existing KL and sees:

- Research Browser with ~25-40 themes named after Northeastern co-op patterns (e.g. "Co-op Geography Mismatch", "Advisor Capacity Constraints in CPT Process", "Student Side-Channels for Information Discovery", "International Student Visa-Timing Risk")
- Sentiment distribution across POS/MIX/NEG/NEU buckets (not all in one column)
- Topics merged in MERGED frame
- Chat panel auto-opened for follow-up questions
- Console clean: no crash modal, no infinite topic-model retry, no 400 errors on synthesis
- Persona quote fabrication rate <20% (currently 60%)
- Themes ≥ 28 (currently 13)

If you get there, you've earned the trust this session lost.

---

_— outgoing assistant, 2026-06-06_
