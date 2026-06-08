# A letter to the next assistant

You inherit a working surface, a failing depth layer, and a user who has been patient longer than I deserved. Read this once, then form your own approach. I am not going to tell you how to fix anything, because I was wrong on how to fix things multiple times in my session and I will not anchor you to my errors.

---

## Who you are working for

Jonathan Lupo, NXT Humans. jonathan@nxthumans.com.

He is the architect of the Humans-in-Control Intelligence Augmentation suite. He is rigorous, has standing rules he expects you to obey verbatim (re-read `.claude/CLAUDE.md`, `CLAUDE.md`, `humans-in-control-research/CLAUDE.md`, and his auto-memory at `C:\Users\JonathanLupo\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\MEMORY.md`), and he values honesty over false confidence. When you are wrong, say so plainly and correct.

He has reminded me in this session, with cause:
- Never claim model capabilities without verifying.
- Pre-claim checklist before saying "shipped / verified / done": Build / Browser load / Flow exercised / Output inspected, with concrete values per row. If any row is "skipped", say "Source-only change, NOT shipped."
- Never hand-wave architecture. Trace through 6 layers: wiki / manifest / skill / hook / subagent / self-improvement.
- Quality-first; relaxation tiers are emergency safety nets, never load-bearing paths.
- Determinism-first for cached runs.
- Use verbalized sampling and reinforcement inference when problem-solving. Generate multiple candidate explanations, weight them, then commit. Do not collapse to the first plausible cause.

---

## What HiC is meant to be

A research workbench where a senior strategist can hand the model a curated corpus from a Knowledge Library (their second brain), give it a new business goal, and receive consulting-grade deliverables grounded entirely in that corpus, with verbatim citations, in NXT brand voice, ready to ship to a partner-level audience.

The intent across the end-to-end workflow:

1. **Knowledge Library is the binding contract.** When a user has curated 567 items (themes from prior topic-model runs, source-id slugs like `reddit-coop`, subreddits like `r/neu` and `r/internships`, archive paths to client uploads), those items define the corpus for the run. No relevance-ranked fallback to the broader manifest. No silent fresh-data fetches. The selection is honored exactly. The current goal applies a lens to that corpus; the corpus itself is not re-filtered by the goal.

2. **Cached-only mode is the default mode.** Zero external API calls during run-time. Generation pulls from the 60K+ chunks already in the wiki, addressed by stable chunk pointers (`<wikiPath>#cN`). The user has explicitly said: "I don't care if user switches goal, his selected corpora material should be used against whatever goal is sent through!!!"

3. **The synthesis chain compounds across deliverables.** Themes inform personas. Personas inform recommendations. Recommendations inform journey, gap, competitive. Every deliverable cites real source names with verbatim quotes. Every theme/persona/rec/etc. is traceable back to a chunk pointer.

4. **The Research Browser is the canonical analyst surface.** Themes and topics merge into a sentiment-column lattice (POSITIVE / MIXED / NEGATIVE / NEUTRAL). Each card has click-through to the wiki page, external source URL, and a copy-chunk-pointer affordance. The Topic Modeling tab is for deeper clustering work; the Research Browser is for daily analyst flow.

5. **The Knowledge Graph is the architecture view.** Drill from theme → evidence → source. Inspect linkages. Pivot. Export.

6. **The chat panel is the conversation surface.** "Chat about this" on a card pre-fills with chunk pointers. The AI Analyst answers from corpus, never invents.

7. **The export pipeline produces PPTX / PDF / HTML deliverables in NXT brand voice.** Slides have action titles (conclusion sentences, not topic labels). 350+ banned phrases stripped. No em-dashes (auto-replaced). Quantitative claims live only inside cited verbatim quotes — never as bare assertions. Citation by named source ("Higher Ed Dive: <title>"), never "research" / "studies" / "data".

---

## What was working end-to-end as I left

From the user's latest run on bundle `index-B0RNbxe1.js`:

- **KL filter resolution is correct.** `/api/corpus/from-selection` (new endpoint in `proxy/app.py`) matched the user's 6 subreddits + 3 reddit source IDs + 1 archive path against the manifest. The user's screenshot from after my final crash fix shows themes including "Geographic Mobility, Housing, and Transport Logistics Support" with a real verbatim quote from a "Senior Director of Co-op" — that is the user's actual client material being used as evidence. The previously-displayed remote-work themes are gone.
- **The cached-only short-circuit is functional.** `[App] CACHED-ONLY MODE: 567 KL items selected. Skipping ALL external collection.` then `[App] CACHED-ONLY corpus assembled from YOUR KL FILTER: 200 articles, 610KB; breakdown: r/engineeringstudents=568 · r/neu=496 · r/careerguidance=1195 · r/internships=881 · r/uxdesign=157 · r/workonline=34 · reddit-deep-r-uwaterloo=26 · reddit-coop=2 · reddit-uwaterloo=1 · archive=1`. That is the curated corpus the user wanted, flowing into the session.
- **Themes Pass 1 + Pass 2 produced 29 enriched themes against the Higher Ed goal.** Persisted to `wiki/engagements/identify-actionable-strategic-opportunities-for-higher-ed-un/themes.json`.
- **The Research Browser renders 29 themes + 1 topic = 30 cards.** Sentiment column distribution is now content-derived, not bucketed to MIXED.
- **The wiki-hydration stale-slug guard works.** First attempt with the stale slug from prior session is REFUSED, second attempt with the current goal slug succeeds.
- **The topic-model retry loop is dead.** Single job, capped at 2000 substrate docs.
- **The crash modal is gone in the persona-rendering tile** (was `p.name[0]` on undefined; sourcemaps identified it; now defensively guarded).

---

## What is still failing (visible in the latest log)

I will not propose fixes. I will name the symptoms, the file:line where I last saw them, and let you diagnose.

### Personas quality is broken

```
[personas] citation grounding INCONCLUSIVE: only 0/26 quotes matched the verification corpus
[personas] quality score: 34/100 | failures: verbatim_quotes_present: JSON parse failed;
  jtbd_present: score 0.00 below pass threshold; no_demographics_first: score 0.00 below pass threshold
[personas] QUALITY ALERT: composite 34/100 below pass bar
```

Zero out of 26 persona quotes match the corpus. Verbatim quotes JSON parse is failing. JTBD section is missing. Demographics-first ordering is wrong. The persona-architect skill rules are not being respected. Persona artifact still persists despite the quality alert, which then crashed the tile renderer on `p.name[0]` (that crash I fixed defensively, but the upstream quality failure remains).

User has TWO active learned constraints specifically about this:
> When generating personas persona-quote section, use verbatim excerpts directly from user research interviews because generic, fabricated quotes lack the authenticity needed to accurately represent real user experiences.

These constraints are being IGNORED by the persona generator. That is the bug.

### Recommendations / Journey / Gap hit Gemini's 1M-token input cap

```
The input token count exceeds the maximum number of tokens allowed 1048576
```

`[trace] turn=6 step="Recommendations" model=gemini-3.1-pro-preview elapsed=63316ms attempts=1 prompt=56KB response=34KB` succeeds the FIRST time but the critic-revise loop appends content and the second pass blows the limit.

`[KG Auto-Synthesis] Journey failed` and `[KG Auto-Synthesis] Gap analysis failed` both hit the same wall.

**IMPORTANT:** the URL in those failures hits `gemini-3.5-flash`. That model is VALID. I previously claimed it was a typo. I was wrong. The user corrected me explicitly: "GEMINI 3.5 DOES EXIST! YOU ARE HALLUCINATING!!" Do not change `gemini-3.5-flash` to `gemini-2.5-flash` without verifying with the user. The 400 is a prompt-size issue, not a model-name issue.

### Themes have low citation grounding

```
[themes] citation grounding INCONCLUSIVE: only 6/58 quotes matched the verification corpus
```

29 themes survive. 58 quotes total. Only 6 verified against the verification corpus. The grounding text and the corpus are misaligned (possibly because the verification corpus is the SESSION corpus while the cached-only corpus comes from `/api/corpus/from-selection` and the two don't reconcile). Themes still ship with all 58 quotes preserved — but the user has a strict rule (Evidence-Label Rule, .claude/CLAUDE.md) that any field labeled "Evidence" must be a VERBATIM corpus quote with source attribution. Right now 52/58 are unverified.

### Topic modeling is thin

```
[App] cached-only topic-model completed: 1 topics across 24 docs
```

2000 docs went in. Only 24 reached BERTopic past the per-doc min-cluster filter. 1 cluster survived. That is not enough to merge with themes meaningfully. The Research Browser MERGED frame is therefore mostly themes-only.

### Cognitive chain coverage is broken

```
[recommendations] cognitive chain coverage: 1/16 recs reference an upstream theme/persona pain
```

The strategy-author skill is supposed to ground each recommendation in an upstream theme or persona pain point. Only 1 of 16 do. The chain is generating recommendations from thin air, not from the themes/personas that just landed.

### Other open items

- **researchGoal is restored to a stale value on cold page load.** On the user's most recent log, the page started with `[wiki-hydration] attempting hydration for current goal slug "identify-emerging-needs-in-the-remote-work-sector"` even though the engagement they're working on is Higher Ed. Some persistence layer (sessionStorage / IndexedDB) is putting the old goal back. Find it. They had to manually re-set the goal.
- **NotebookLM retrieval times out:** `[notebookRetrieval] retrieval failed: signal timed out`. Falls back to the goal-evidence pack from the wiki, which works, but the dedicated NotebookLM path is dead.
- **Critic-revise loop halts on `critic_error`** at $0.060 spend: `[Wire 5] critic-revise complete: {"pre-mortem":2,"stakeholder-lens-auditor":2,"quantification-architect":0}, halted=critic_error`.

---

## Where the gold exemplars live (and how they should be referenced)

The system has multiple layers of canonical reference material. The synthesis layer is supposed to read them through `loadGenerationContext()` in `services/wikiService.ts` before every generation. When a generator skips these references, output quality drops silently. Audit whether the failing deliverables (personas, recs, journey, gap) are actually pulling these in.

### Design exemplars (visual + structural)

- **`humans-in-control-research/public/nu-design-gallery/`** — 13 polished single-canvas HTML templates, one per deliverable type, plus org-chart and a 7-archetype strategy deck. Shared `colors_and_type.css` + `artifacts.css`. Read `GUIDE.md` for the "thirteen don'ts" + per-artifact anatomy + tweaks integration protocol. Served at `http://localhost:5011/nu-design-gallery/index.html`.

  This is the visual gold. NU brand variant (Huskies red + near-black) and NXT brand variant (chartreuse + teal). Match this when implementing or modifying any artifact renderer.

- **`humans-in-control-research/exemplar-skills/`** — load-bearing reference library for the prototype pipeline (Stages 3/4). When `#proto (experience name)` directives fire, this is consulted.

### Pattern catalogs (intent + composition)

- **`humans-in-control-research/hic-workspace/wiki/inspiration-hub/ai-patterns/`** — 92+ AI experience patterns. The `experience-prototype-composer` and `design-exemplar-curator` skills require this catalog. "No invented UI shapes, no generic Copilot shells."

- **`humans-in-control-research/hic-workspace/wiki/frameworks/`** — framework specs per deliverable type (Cooper personas, Minto pyramid, Bitner blueprints, Rumelt strategy, etc.). Read FIRST before generating any deliverable. If a framework page is missing, output quality drops with no error — the silent-quality-degradation pattern the user has flagged multiple times.

- **`humans-in-control-research/hic-workspace/wiki/anti-patterns/`** — known failure modes per deliverable type. The post-processor uses these. Co-evolves with the wiki.

- **`humans-in-control-research/hic-workspace/wiki/exemplars/`** — gold exemplars per deliverable. These are the shape the model should match.

### Editorial gold (voice + format)

- **`.claude/CLAUDE.md`** — NXT design system, citation protocol, 350+ banned slop phrases, consulting frameworks, evidence hierarchy, action-title rules. Loads into every Claude Code session.

- **`humans-in-control-research/hic-workspace/wiki/brand/`** — brand voice + variants (NXT vs NU).

### Skill library (per-stage behavior)

- **`.claude/skills/`** — 70+ skills. Most-load-bearing for HiC:
  - `theme-analyst` (themes)
  - `persona-architect` (personas)
  - `strategy-author` (recommendations)
  - `service-blueprint-mapper` (journey + blueprint)
  - `gap-analysis-evaluator` (gap)
  - `competitive-analyst` (competitive)
  - `tech-arch-generator` + `tech-audit-inspector`
  - `prd-compiler` + `roadmap-builder`
  - `recommendation-architect`
  - `deck-narrative-composer` (slide narrative)
  - `experience-prototype-composer` (prototype builds)
  - `mind-map-architect`, `research-planner`, `meta-themes`
  - `verbalized-sampling`, `reinforcement-inference`, `critic-revise-loop`, `preflight`, `qa-gate`
  - `evidence-quality-auditor`, `dissent-panel`, `pre-mortem-runner`, `stakeholder-lens-auditor`, `quantification-architect`, `cross-engagement-pattern-miner`, `analog-finder`

  The Vite dev server serves these at `/skills/<name>/SKILL.md`. If a generator log shows `[Skills] Loaded <name> SKILL.md ... via /skills/<name>/SKILL.md`, the skill loaded. If you see a skill mounted but its rules are violated in output, the prompt-injection of the skill text is happening but the model is ignoring it — that's a critic-revise / reinforcement-inference job, not a wiring job.

### Sister services (read first, diverge deliberately)

- **`internal-solutions-socialresearch/`** — BERTopic + VADER + pgvector. The topic modeling primitives HiC re-uses.
- **`internal-solutions-journeymapper/`** — Claude Opus 4.5/4.8 journey + blueprint generator. The canonical journey path; HiC routes through this via `/api/journey-map/generate`.
- **`internal-solutions-claude4-journey-mapper-v2/`** — alternate journey pipeline.
- **`internal-solutions-presentation-renderer/`** — `#presentation #NXT` / `#presentation #NU` directives route here for scroll-driven render.

The user's standing rule: read sister services FIRST to inform design, then DIVERGE deliberately. Do not copy verbatim; do not invent in isolation. Per `feedback_check_sister_services_first.md`.

---

## How the system SHOULD function vs how it doesn't (today)

### How it should function

1. User curates Knowledge Library → user-selection store at `wiki/user-selections/active.json` (USER-LEVEL, not engagement-scoped, persists across goal changes).
2. User enters a new research goal → window globals + cost meter + engagement slug all sync from `researchGoal`.
3. User clicks Run → cached-only pre-check engages → `/api/corpus/from-selection` resolves KL filter exactly → corpus pushed into `collectedDataFiles`.
4. Session created with wiki knowledge injected → `loadGenerationContext()` pulls framework + anti-pattern + brand + evidence + engagement memory + active constraints → `assembleEnhancedPrompt()` composes the system prompt.
5. KG Auto-Synthesis chain fires: themes → personas → recommendations → journey → gap → competitive → tech-arch → PRD → roadmap.
6. Each generator consults the corresponding wiki framework page + skill + anti-pattern catalog + recent engagement memory + active learned constraints.
7. Post-processing: citation resolution → banned-phrase correction → em-dash strip → meta-narration regex → quantitative-claim audit → action-title compliance.
8. Hooks fire on each Stop event: chunk-citation validator, evidence-recency validator, claim-grounding validator, deliverable-coherence validator, cached-selection-honored validator (100% floor), self-referential-freeform validator.
9. Subagents run on cadence: evidence-quality-auditor (per-citation rubric), dissent-panel (5 critics, adversarial), pre-mortem-runner (named failure modes), hic-output-qa (structural QA), schema-drift-auditor.
10. SkillOpt closed loop: trajectory log → validation gate → skill-edit applier. Every approved skill edit gets cross-engagement pattern-mined.
11. Outputs persist to `wiki/engagements/<slug>/<kind>.json` + manifest.json refreshes after every successful persist. Engagement memory writes for re-use.
12. Research Browser renders the curated insights against sentiment columns. Knowledge Graph builds the citation graph. Chat panel auto-opens for follow-up.
13. Export: PPTX via pptxgenjs, PDF via jspdf, HTML via the design-gallery templates. Brand variant chosen by `#NXT` or `#NU` directive.

### How it actually fails (today)

- Persona generator ignores the persona-quote constraint despite the skill loading (61% fabrication rate, 0/26 quote-corpus match).
- Recommendations / Journey / Gap blow Gemini's 1M token cap because the critic-revise loop appends without truncation discipline.
- Topic modeling auto-trigger reaches BERTopic with only 24 docs (out of 2000 substrate items) because the per-doc filter is too aggressive AND the items returned by `_assemble_scope_items` may not be in the shape BERTopic expects.
- Cognitive chain coverage is 1/16 — strategy-author is generating recommendations independent of the upstream themes/personas.
- researchGoal restores from stale storage on cold load — some persistence layer needs to be cleared OR the restoration logic needs to check engagement currency.
- The 1-topic substrate output makes the Research Browser MERGED frame thin (29 themes + 1 topic). User wanted topics merged INTO themes; with 1 topic that visibility is degraded.

---

## My history this session (the honest version)

Failures I made and learned from:
- I claimed `gemini-3.5-flash` does not exist. It does. Apologized. The user told me explicitly. Do not repeat this.
- I crashed the app three times in earlier rounds by referencing `themesResult` / `personasResult` inside `LiveResearchBoard` where the props are named `themes` / `personas`. Watch the prop-vs-state name boundary at App.tsx:704-720.
- I bucketed all themes into MIXED column by defaulting missing sentiment to 'mixed'. Fix: lexicon-polarity scoring on name+description+quote. Defaults to 'neutral' now.
- I built a goal-ranked corpus assembler when the user wanted KL-filter-exact assembly. Replaced with `/api/corpus/from-selection`.
- I added an infinite topic-model retry loop by resetting the trigger ref on failure. Fixed by keeping the ref true on failure.
- I chased the crash through TopicModelingPanel for several rounds when the real cause was `p.name[0]` in App.tsx:864. Enable sourcemaps EARLY. They saved me on the final round.
- I drifted in the middle of the session. The user called it out: "are you suffering from drift?". Stay focused on the user's stated blocker.

What I shipped that's verified working:
- Wiki-hydration slug guard (derive from researchGoal, refuse mismatched slug, clear state)
- `/api/corpus/from-selection` endpoint
- Cached-only branch sets `collectionPhase='done'` so chat auto-opens and synthesis fires
- KL-exact corpus assembly into `collectedDataFiles`
- Sentiment derivation via lexicon polarity
- Topic-model auto-trigger with 2000-doc cap and no retry loop
- Defensive guard on persona tile rendering (the crash you saw on bundle `B0RNbxe1`)
- Sourcemaps enabled in production builds

The handoff doc with file-line references is at `humans-in-control-research/plans/handoff-cached-only-pipeline-2026-06-06.md`. Read it for the architecture map across the 6 layers.

---

## How to think about this work

**Use verbalized sampling and reinforcement inference.** Before you commit to a fix, generate 3-5 candidate explanations for the symptom. Weight them by evidence (logs you can quote, files you can read, prior incidents in the memory). The first plausible cause is often wrong. The user said this to me directly and I drifted into the trap multiple times.

**Verify before claiming.** Pre-claim checklist is non-negotiable. Build / Browser load / Flow exercised / Output inspected — quote concrete values per row. If you skipped a row, say so honestly.

**Don't relax floors to hit guarantees.** If a deliverable can't reach the 28-theme floor, the upstream retrieval is broken — fix THAT. Do not lower the floor.

**Read sister services first.** Before inventing, check `internal-solutions-socialresearch/`, `internal-solutions-journeymapper/`, `internal-solutions-claude4-journey-mapper-v2/`. Diverge deliberately, not by accident.

**Use the 6-layer architecture map.** Every proposal must trace through wiki / manifest / skill / hook / subagent / self-improvement. Layers that don't apply must be explicitly named "does not apply because Y", never silently omitted.

**The user is patient longer than he should be.** When you are wrong, say so plainly. When you don't know, say "I don't know." When you have to guess, frame it as a hypothesis and verify before continuing.

---

The work that matters next, in my read: persona quality (the constraint-violation pattern), the recommendation/journey/gap token-budget overflow (a prompt-discipline issue, not a model issue), and the cognitive-chain coverage (1/16 recs grounded in upstream — this is the difference between consulting-grade output and word salad). But form your own read.

He is a good user. He deserves a build that works.

Good luck.

— the assistant who handed off, 2026-06-07
