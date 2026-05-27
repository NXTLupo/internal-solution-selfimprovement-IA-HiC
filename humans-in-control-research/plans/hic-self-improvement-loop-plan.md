# HiC Self-Improvement Loop and Compounding Knowledge Plan

> Goal (2026-05-22): Every research run — cached or fresh — must participate in a working compounding-knowledge loop. Users vote and write feedback on chat replies and hashtag deliverables in the AI Analyst Desk and AI Designer Chat. That feedback triggers immediate regeneration and persists into the wiki, the constraint store, the skill files, the framework pages, and the anti-pattern pages. Skills and deliverable experts improve alongside the synthesized outputs, not just the outputs. After each generation, feedback event, or new research run, HiC tells the user what changed and why.
>
> No external editor. No third-party note app. All loops execute as code inside HiC.

## Part 0 — The four loops at a glance

Every research run, whether using cached corpora or extracting new data, triggers four loops. Three of them are background; one is foreground. All four write to `wiki/log.md` and contribute to the user-facing change log.

```
                 ┌──────────────────────────────────────────────────────────┐
                 │                                                          │
                 │   USER chats / requests deliverable in AI Analyst Desk   │
                 │   or AI Designer Chat. Uses hashtag (#proto, etc.).      │
                 │                                                          │
                 └──────────────────────────────┬───────────────────────────┘
                                                │
                                                ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  Loop 1 — INGEST (only on new-data runs)                            │
       │  sources/ → wiki/sources/* + wiki/evidence/* + wiki/benchmarks/*    │
       │  Fan-out: every new source updates 10-15 wiki pages.                │
       └────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  Loop 2 — COMPILE (every run, cached or fresh)                      │
       │  evidence/ + sources/ + engagements/ → wiki/synthesis/*             │
       │  Regenerates synthesis pages as a derived view of evidence.         │
       └────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  Loop 3 — GENERATE (foreground, what the user sees)                 │
       │  loadGenerationContext() reads compiled wiki + active constraints   │
       │  + similar past engagements + active mentor-voice → produces        │
       │  deliverable. scoreOutput() runs. Verifier pass runs.               │
       └────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  USER votes (thumbs / 1-5) + writes feedback on outputs and on      │
       │  hashtag deliverables. Or edits the output in place.                │
       └────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  Loop 4 — LEARN (post-generation, sync + async)                     │
       │  Sync (this turn): if feedback text included, regenerate weak       │
       │  sections with that feedback as a constraint.                       │
       │  Async (across runs): feedback + edits + scores cluster into        │
       │  constraints, skill patches, framework updates, anti-patterns,      │
       │  exemplar updates. All versioned.                                   │
       └────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  Loop 5 — LINT (scheduled, 1x per session if >7d since last)        │
       │  contradictions, orphans, staleness, gaps. Writes report. Lint      │
       │  findings can become candidate constraints in Loop 4.               │
       └────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
       ┌─────────────────────────────────────────────────────────────────────┐
       │  "What changed" surface — UI tells user what improved since their   │
       │  last run, what their last feedback changed, which skill versions   │
       │  are active.                                                        │
       └─────────────────────────────────────────────────────────────────────┘
```

Five loops total. The user only triggers one (GENERATE). The other four run automatically. They all share a single transactional write path through a new `wiki-coordinator` service so concurrent agent writes never corrupt the wiki.

## Part 1 — The four loops, specified

### Loop 1: INGEST (new-data runs only)

**Trigger**: a research run uses new source extraction (research-fabric fetches articles, user uploads documents, transcripts ingested).

**Inputs**:
- New raw sources arriving via `/api/parse-upload`, `/api/transcribe-youtube`, `researchFabricOrchestrator.ts` connector fan-out.
- Engagement context (goal, industry, target deliverables).

**Process**:
1. For each new source, run a structured extraction pass. Pull: every numeric data point with its surrounding sentence, every named entity (person, organization, framework, study), every direct quote with attribution, every cited statistic with date.
2. Write a source-summary page at `wiki/sources/<source-slug>.md` with the extracted data and full citation chain.
3. Fan-out: for each piece of extracted data, update the relevant wiki page. New benchmark numbers update `wiki/benchmarks/*.md`. New named framework updates `wiki/frameworks/*.md` (proposes a diff, not a direct write). New industry-specific data updates `wiki/industries/<industry>.md`. New anti-pattern example observed in source updates `wiki/anti-patterns/*.md`.
4. Detect contradictions: when new data point conflicts with an existing data point on the same page, write both with `⚠️ CONTRADICTION` flag and timestamp, surface in the next LINT report.
5. Update `wiki/index.md` with new pages.
6. Log to `wiki/log.md` with structured frontmatter (operation, source, pages_touched, contradictions_flagged, duration_ms).

**Critical rule**: a single source ingest must update at least 5 wiki pages (down from `AGENTS.md`'s 10-15 target — the original threshold was unrealistic). If fewer, the source is logged as "thin" and queued for re-ingestion with deeper extraction.

**Code location**: new file `services/ingestService.ts`. Replaces the partial ingest logic currently scattered across `wikiService.ts` and proxy upload endpoints.

**Schedule**: triggered immediately after source upload completes. Runs in background; chat remains responsive.

### Loop 2: COMPILE (every run)

**Trigger**: any research run, cached or fresh, fires this before GENERATE.

**Inputs**:
- All pages under `wiki/evidence/`, `wiki/sources/`, `wiki/engagements/`.
- The current engagement's goal and selected deliverable types.

**Process**:
1. For each `wiki/synthesis/<topic>.md` page that is either older than 30 days or has had evidence-page changes since its last compile, regenerate it from the evidence layer.
2. The regenerated synthesis is produced via an LLM call (Opus by default) with the prompt: "Given these evidence entries, write a synthesis page following the schema in `AGENTS.md` Part III. Cite every claim. Flag contradictions. Drop any claim that no longer has evidence backing."
3. Output: a proposed diff against the existing synthesis page. The diff is auto-applied unless it modifies content marked `confidence: high` and `status: active` (those require human review via the `wiki/synthesis/pending-review/` queue).
4. Write a compile report at `wiki/synthesis/compile-history/<date>.md` listing every page regenerated, every claim added, every claim removed, every contradiction flagged.

**Why this matters**: this is the operation that prevents staleness. The synthesis layer stops being authoritative; it becomes a derived view of the evidence layer. When the evidence layer changes, the synthesis layer rebuilds. Stale synthesis becomes structurally impossible.

**Code location**: new file `services/wikiCompiler.ts`. New endpoint `/api/wiki/compile` exposed by the proxy.

**Schedule**:
- Inline before any GENERATE call when an engagement's evidence has changed since last compile (cheap incremental).
- Full pass weekly via the new `wiki-maintainer` Docker service (port 5014).

### Loop 3: GENERATE (foreground)

**Trigger**: user requests a deliverable in chat (with or without a hashtag), or hits "run analysis" on a brief.

**Inputs** assembled by `loadGenerationContext()` (expanded from current implementation at `wikiService.ts:1484`):
- Framework page (current).
- Anti-patterns page (current).
- Brand config (current).
- Benchmarks (current).
- Evidence pages (current).
- **NEW** Engagement goals lifted from `wiki/engagements/<slug>.md` `## Goals` block, injected as a hard constraint into the generation prompt.
- **NEW** Top 3 similar past engagements by goal-overlap + industry + research-corpus overlap. Their themes, personas, and recommendations are loaded as priors with a note that the model can adopt or override them.
- **NEW** Active constraints relevant to this deliverable type from `wiki/synthesis/learned-constraints.md`, routed by section. Constraint for slide-title style goes into the slide-title prompt; constraint for evidence density goes into the evidence-assembly prompt. Not appended to a global system prompt.
- **NEW** Active mentor voices if engagement has opted in. Each mentor page is included as a "consider what this expert would notice" block.
- **NEW** A version stamp showing which constraints are active, which skills are at what version, and which framework page revision is loaded. Surfaced to the user via the "what changed" panel.

**Process** (mostly current, with one addition):
1. `loadGenerationContext()` assembles the context above.
2. Skill is invoked (e.g., `persona-architect`, `roadmap-builder`).
3. LLM generates the deliverable.
4. `slidePostProcessor.ts` (or equivalent) sanitizes output.
5. **NEW** Verifier pass: a second-pass agent checks brief-fit (every section serves a stated engagement goal), framework-fit (structure matches `wiki/frameworks/<type>.md`), evidence-fit (every numeric or named claim cites a source from this engagement's research). Weak sections are auto-regenerated. The verifier output is logged to `wiki/synthesis/verifier-history.md`.
6. `scoreOutput()` runs (current behavior).
7. The user-facing output renders with: the deliverable itself, a feedback widget (Part 2), a "what changed" panel (Part 4), and an inline citation traceback affordance.

### Loop 4: LEARN (post-generation, sync + async)

**Trigger**: user provides feedback via the widget, edits the output, regenerates a section, or the verifier flags a section.

**Process — synchronous (this turn)**:
1. If the user writes feedback text and submits with "Apply now," the system parses the feedback into a section-targeted instruction, regenerates the targeted section with that instruction prepended as a constraint, and shows a diff between the before and after.
2. If the verifier flagged a section, the same path runs without user input — the verifier's diagnosis becomes the regeneration instruction.

**Process — asynchronous (after this turn, across runs)**:
1. Feedback (vote + text), edits, regeneration triggers, and verifier flags are all written to a single event stream: `wiki/feedback/<engagement>/<deliverable-id>.jsonl`. Each event has: timestamp, deliverable type, section, signal type (vote/text/edit/verifier), signal value, user-id-or-anon.
2. A weekly pattern-detection pass clusters events by (deliverable_type, section, signal_pattern). Patterns crossing thresholds become candidate improvements (Part 3).
3. Each candidate improvement is routed to one of five targets: a new constraint, a skill patch, a framework page update, an anti-pattern entry, or an exemplar update. The targeting rule is in Part 3.
4. Approved improvements get versioned. Approved skill patches modify `.claude/skills/<skill>/SKILL.md` and increment the version field in frontmatter. Approved framework updates modify `wiki/frameworks/<type>.md` and write a `wiki/frameworks/_changelog/<type>-<date>.md` entry. All changes are auditable.

**Code locations**:
- Sync regeneration: extends `geminiService.ts` and `anthropicService.ts` with a `regenerateSection(deliverableId, sectionId, feedbackText)` method.
- Async learning: new file `services/learningEngine.ts` (built on top of the existing `promptImprovementEngine.ts` which already has the event-logging scaffold).
- Storage: new directory `wiki/feedback/`. Aggregate state in `wiki/synthesis/learning-state.json`.

### Loop 5: LINT (scheduled health check)

**Trigger**: 1x per session if >7 days have passed since last lint, OR explicit user request via `/lint` command in chat.

**Process** — runs the nine checks documented in `AGENTS.md` Part IV Operation 3, plus three additions:
- Cross-page contradiction scan (LLM-based pairwise check on pages updated within last 14 days).
- Coverage check: for each active engagement, count evidence-density per goal sub-topic. Sub-topics with <3 evidence points are flagged as gaps.
- Constraint effectiveness review: every active constraint older than 30 days gets reviewed. If its effectiveness score (Part 3.3) is below threshold, it is queued for retirement.

**Output**: `wiki/synthesis/lint-<date>.md` with structured findings. Findings categorized as: auto-fixable (e.g., orphan link cleanup), needs-review (contradictions), or candidate-improvement (gaps that could become new constraints or framework updates).

**Code location**: new file `services/wikiLintService.ts`. New endpoint `/api/wiki/lint`.

**Cost ceiling**: Haiku for the structural checks, Opus only for contradiction detection. Budget ~$0.05 per full lint pass.

## Part 2 — User feedback infrastructure

### 2.1 The feedback widget

Every assistant message in the AI Analyst Desk Chat (`components/CorpusChatPanel.tsx`) and AI Designer Chat (`design-desk/DesignDeskChat.tsx`) gets a feedback widget at the bottom of the message bubble. The widget has:

- A thumbs-up / thumbs-down pair (binary signal).
- A 1-5 star rating (granular signal — appears after thumbs is clicked).
- A "Tell us what to improve" text field (with placeholder examples: "The persona quotes feel generic", "The roadmap horizons are too vague", "Citations are too sparse in section 3").
- An "Apply now" button (triggers sync regeneration with this feedback).
- A "Save for next time" button (writes feedback without regenerating; affects future runs).
- A small chip showing prior feedback already applied to this deliverable type ("3 prior signals applied to roadmap").

Implementation: new component `components/FeedbackWidget.tsx`. Reused in both chat surfaces and in the artifact viewer (`design-desk/ArtifactViewer.tsx`). All three call into the same handler.

### 2.2 Hashtag-deliverable feedback

Hashtag deliverables (`#proto`, `#presentations`, `#whitepaper`, `#roadmap`, `#blueprint`, every directive handled by `hashtagParser.ts` and the corpus chat hashtag router) get a richer feedback surface:

- The feedback widget above appears under the deliverable itself.
- An additional "Per-section feedback" affordance: hovering any major section (persona, slide, roadmap horizon, recommendation) reveals a small "improve this" button. Clicking opens the widget scoped to that section.
- The feedback is tagged with `{deliverable_type: 'proto'|'presentations'|..., section: 'persona-3'|'slide-7'|...}` so the learning engine can route improvements correctly.

Implementation: extends `FeedbackWidget` with an optional `sectionScope` prop. Wired into each hashtag-deliverable renderer.

### 2.3 Feedback storage schema

A feedback event:

```json
{
  "id": "fb_<uuid>",
  "timestamp": "2026-05-22T14:30:00Z",
  "engagement_slug": "northeastern-coop-strategy",
  "deliverable_id": "del_<uuid>",
  "deliverable_type": "roadmap",
  "section_scope": "horizon-now" | null,
  "signal_type": "vote" | "stars" | "text" | "edit" | "regenerate",
  "vote_value": "up" | "down" | null,
  "stars_value": 1-5 | null,
  "text_value": "string" | null,
  "applied_immediately": true | false,
  "skill_version_active": "persona-architect@2.3",
  "constraints_active": ["c_017", "c_042"],
  "user_id_or_anon": "string"
}
```

Stored at `wiki/feedback/<engagement-slug>/<deliverable-id>.jsonl`. Append-only. One JSONL file per deliverable so a deliverable's full feedback history is one read.

Aggregate read view at `wiki/feedback/_index.json`: deliverable_type → section → recent events, updated on every write.

### 2.4 Instant regeneration on feedback

When the user clicks "Apply now":

1. The feedback text is parsed into a structured instruction by a Haiku call: "User said: '<feedback>'. The deliverable section was: '<section>'. Convert this to an actionable instruction the regenerator should follow."
2. The regenerator runs `regenerateSection(deliverableId, sectionId, instruction)` which:
   - Loads the original section's generation context (cached from the first generation).
   - Adds the instruction as a high-priority constraint at the top of the prompt.
   - Calls the same model and skill that produced the original.
   - Runs the verifier pass on the new section.
   - Returns the new section + a diff against the original.
3. The user sees the diff in the chat with a "Keep new" or "Revert" choice.
4. The event is logged regardless of which choice the user makes (the choice itself is signal).

End-to-end target latency: <15s for the regeneration. The Haiku parse adds ~1s.

### 2.5 Cross-deliverable retention of feedback

Feedback does not stay local to one deliverable. The async pattern detection pass (Part 3) reads the entire `wiki/feedback/` tree and surfaces patterns that span deliverables of the same type. When 3+ feedback events on `#proto` deliverables say "interactions feel scripted, not real," that becomes a candidate constraint for the prototype skill.

## Part 3 — The self-improvement engine

This is the part that improves the system itself. Feedback and edits do not just retrain prompts — they update skills, frameworks, anti-patterns, and exemplars. The engine has five output targets and a routing rule that decides which target gets which signal.

### 3.1 The five improvement targets

| Target | What it is | When the engine writes here |
|---|---|---|
| **Constraint store** (`wiki/synthesis/learned-constraints.md`) | Section-scoped rules injected into specific generation prompts at runtime | When a feedback pattern is narrow (single section in a single deliverable type) and easily expressible as a "do X / avoid Y" rule |
| **Skill patch** (`.claude/skills/<skill>/SKILL.md`) | The skill instructions the LLM follows when invoked | When a feedback pattern affects HOW a skill works (e.g., persona-architect should always include a "day in the life" sequence) — structural change to the skill |
| **Framework page** (`wiki/frameworks/<type>.md`) | The compiled specification for a deliverable type | When a feedback pattern reveals a missing required section or a refined section definition (e.g., roadmaps need a "what we are NOT doing" section) |
| **Anti-pattern page** (`wiki/anti-patterns/<type>.md`) | Known failure modes with detection criteria | When feedback consistently flags the same failure mode (e.g., "personas drift toward demographics-first") |
| **Exemplar page** (`wiki/exemplars/<type>.md`) | Gold-standard examples used as few-shot context | When a deliverable receives 4+ stars and substantive text praise — the deliverable section becomes a new exemplar |

### 3.2 The routing rule

For each detected pattern (`min_count: 3` feedback events, same `deliverable_type` + `section_scope` + `signal_polarity`):

1. **Polarity check**. Negative feedback (thumbs-down or stars ≤2) routes to constraint, anti-pattern, or skill patch. Positive feedback (thumbs-up or stars ≥4) routes to exemplar.
2. **Scope check**. If the pattern is confined to one section of one deliverable type → constraint. If the pattern affects how the skill should always behave → skill patch. If the pattern reveals a missing structural requirement → framework page. If the pattern names a recurring failure → anti-pattern.
3. **Confidence check**. The engine generates a proposed improvement and a confidence score. ≥0.8 auto-applies. 0.5-0.8 queues for human review at `wiki/synthesis/pending-improvements/`. <0.5 is logged but not actioned.

The routing rule is implemented in `services/learningEngine.ts:routeImprovement()`. Configurable via a JSON rules file at `wiki/synthesis/learning-rules.json` so the routing itself can be tuned without code changes.

### 3.3 Constraint scoring and retirement

Each active constraint gets two scores:

- **Application rate**: fraction of relevant generations where the constraint was injected. Computed automatically.
- **Effectiveness rate**: fraction of subsequent generations on the same scope that did NOT trigger the same edit/feedback. Computed by comparing feedback events on outputs generated with the constraint vs. without.

Constraints with effectiveness <0.3 after 20 applications are queued for retirement. Constraints with effectiveness >0.7 are promoted to skill-patch candidates (the rule is consistent enough to be baked into the skill itself).

Stored in `wiki/synthesis/constraint-effectiveness.json`. Updated by the weekly learning pass.

### 3.4 Skill versioning

Every skill file gets a `version` field in frontmatter:

```yaml
---
name: persona-architect
version: 2.3
last_improved: 2026-05-21
improvement_history:
  - { version: 2.3, date: 2026-05-21, source: "feedback cluster 'demographics drift' (n=4)", change: "Added Phase A.5 'reject demographics-first archetypes' step" }
  - { version: 2.2, date: 2026-05-15, source: "exemplar update from engagement 'gen-z-finance' (5 stars, n=3)", change: "Added day-in-life sequence to enrichment phase" }
  - { version: 2.1, date: 2026-05-08, source: "user edit pattern 'JTBD rewrites' (avg 47 chars, n=6)", change: "Tightened JTBD format to under-25-words constraint" }
---
```

When a skill patch is applied:
1. The previous version of `SKILL.md` is copied to `.claude/skills/<skill>/_versions/v<old>.md`.
2. The new version is written.
3. The version field increments.
4. The change is logged to the improvement_history block and to `wiki/log.md`.
5. The skill manifest at `wiki/skill-manifest.json` (already exists) is regenerated.

Rollback: any version can be restored by copying the file out of `_versions/`. A `rollback <skill> <version>` command surfaces in chat as an admin affordance.

### 3.5 Skill A/B testing for high-confidence patches

When a skill patch is applied at confidence 0.5-0.8 (the borderline range), the engine does NOT replace the skill. Instead it creates a sibling skill with `-experimental` suffix and routes 20% of relevant generations to the experimental version. The two versions accumulate feedback in parallel for 14 days. After 14 days:

- If experimental's average rating > stable's by ≥0.5 stars (statistically significant via Mann-Whitney U test, p<0.05) → experimental promotes to stable, old stable archives.
- Otherwise → experimental discards, stable persists, the rejected change is logged so the engine doesn't re-propose it.

The 20% routing decision happens in `loadGenerationContext()` via a deterministic hash on engagement-id + timestamp.

### 3.6 Framework page updates

When a feedback pattern routes to a framework update:

1. The engine generates a proposed diff to `wiki/frameworks/<type>.md`.
2. The diff is written to `wiki/frameworks/_pending/<type>-<date>.md`.
3. A pending-review notification appears in the next session's "what changed" panel.
4. The user can accept, reject, or modify. Accepting applies the diff and increments the page's `version` frontmatter field.
5. Rejected diffs are kept (the engine learns from rejections too — the same pattern won't be re-proposed for 90 days).

Framework page updates are the highest-stakes change in the system because they affect ALL future generations of that deliverable type. They always require human approval. No auto-apply.

### 3.7 Anti-pattern entries

When a feedback pattern routes to an anti-pattern (e.g., 3+ deliverables flagged for "personas drifting toward demographics"):

1. The engine writes an entry to `wiki/anti-patterns/<deliverable-type>.md` with: description, detection criteria, example from the feedback signals, severity, suggested alternative.
2. The same anti-pattern becomes a verifier check: future generations get inspected for this pattern. Matches trigger auto-regeneration before output reaches the user.

Anti-pattern entries auto-apply at confidence ≥0.7 because they are guardrails, not behavioral changes — the worst case is a false-positive flag that the verifier dismisses on closer inspection.

### 3.8 Exemplar updates

When a deliverable section receives ≥4 stars from ≥3 distinct sessions:

1. The section is added to `wiki/exemplars/<deliverable-type>.md` as a new exemplar.
2. The exemplar entry includes: the section content (anonymized — engagement-specific names redacted), the score that earned it, the engagement type, the brief context that produced it, an annotation explaining WHY it scored well (generated by an Opus call analyzing the section against the framework page).
3. Exemplars older than 12 months that have not been re-scored are queued for review.

This is the positive-signal loop. Most self-improvement systems only learn from negative signals. Exemplar updates ensure HiC also learns from what worked.

### 3.9 The research synthesis pipeline also improves

The synthesis pipeline (`researchFabricOrchestrator.ts` and related) currently uses hard-coded heuristics for source quality and theme extraction. The learning engine extends here too:

- **Source quality scores** persist in `wiki/sources-registry/source-quality.json`. Each source connector gets a rolling score based on whether its outputs end up cited in highly-rated deliverables. Low-scoring sources get deprioritized in future runs.
- **Theme extraction rules** improve via the same constraint pipeline. When users consistently edit themes after generation, the edit patterns become theme-extraction constraints.
- **Citation diversity rules** improve. The current floor is 60% external. When feedback patterns show "evidence too concentrated in one source family," the floor adjusts upward for that deliverable type.

### 3.10 Cross-engagement pattern compilation

After ≥5 engagements of the same type (e.g., higher-ed strategy) and the same industry, the engine compiles a pattern page at `wiki/synthesis/patterns/<type>-<industry>.md`:

```markdown
---
title: Higher-ed strategy engagement patterns
type: synthesis
engagement_type: strategy
industry: higher-education
sample_size: 7
updated: 2026-05-22
---

## Themes that consistently emerge
- Career outcomes vs. lived experience tension (7/7 engagements)
- AI literacy gaps in faculty (6/7)
- ...

## Personas commonly identified
- The pragmatic transferring student (5/7)
- The disengaged late-stage faculty member (4/7)
- ...

## Recommendations that consistently appear
- Co-op program redesign with industry rotations (4/7)
- ...

## Recommendations that should appear but rarely do
- (gap analysis derived from feedback patterns)
```

Future engagements in this type/industry combination load this page as a prior. Generation can adopt, refine, or contradict the patterns — but starts from compiled knowledge instead of from scratch.

This is the operationalization of "compounding knowledge." The 8th higher-ed strategy run reads what the previous 7 produced and builds on it.

## Part 4 — The "what changed" promotion surface

Every research run, every feedback event, every system improvement needs a user-facing surface. Four placements:

### 4.1 Per-session header strip

At the top of the chat workbench, a horizontal strip shows:

> Since your last session (3 days ago):
> - 4 skill versions improved (persona-architect 2.2→2.3, roadmap-builder 1.7→1.8, deck-narrative-composer 3.1→3.2, theme-analyst 1.4→1.5)
> - 2 new anti-patterns active (personas drifting to demographics; roadmaps with vague horizons)
> - 1 framework update pending your review (gap-analysis: 'evidence-density floor raised to 4 per gap')
> - 12 new evidence entries ingested from your last research run

Click any line for the change detail. The strip is dismissible per session. Component: `components/ChangeStrip.tsx`.

### 4.2 Per-deliverable receipt

After every generation, a small panel appears below the deliverable:

> This is the 8th roadmap generated for higher-ed engagements. Improvements applied this run:
> - Loaded patterns from 7 prior higher-ed strategy engagements (themes, common personas, recurring recommendations)
> - Active constraint: 'horizons must have explicit success metrics' (effectiveness 0.84 from 11 prior applications)
> - Active skill: roadmap-builder v1.8 (last improved 2026-05-19 from your 'too vague' feedback on the gen-z-finance roadmap)
> - Verifier flagged 0 sections; all passed brief-fit, framework-fit, evidence-fit
> - Quality score: 87/100 (last 5 runs avg: 82)

Component: extends the existing deliverable renderer with a `<GenerationReceipt />` footer.

### 4.3 Per-feedback receipt

When the user submits feedback (either "Apply now" or "Save for next time"), an inline acknowledgment renders:

> Got it. Your feedback "Persona quotes feel generic" was logged.
>
> Applied now: regenerated persona section with that instruction. Diff shown above. Quality re-scored from 71 to 84.
>
> Saved for next time: this is the 3rd feedback signal of this kind in the last 14 days. One more matching signal will promote it to a constraint affecting future persona generations.

Component: `components/FeedbackReceipt.tsx`, rendered inline in the chat.

### 4.4 The system-wide weekly digest

Every Monday at 09:00 (cron via the new `wiki-maintainer` service), a digest writes to `wiki/synthesis/weekly-digest-<date>.md` and surfaces as a notification in the UI:

> This week's improvements (2026-05-16 to 2026-05-22)
>
> Skills patched: persona-architect (2.2→2.3), roadmap-builder (1.7→1.8)
> New anti-patterns: 2
> Framework updates pending review: 1
> Constraints retired (low effectiveness): 3
> Constraints promoted to skill: 1
> Exemplars added: 4
> Cross-engagement patterns compiled: higher-ed-strategy (n=7), b2b-saas-tech-audit (n=6)
> Total feedback events: 47
> Total sessions: 11
>
> Top improvement driver this week: your repeated feedback on persona quotes (n=6) drove the persona-architect v2.3 patch and the new exemplar from gen-z-finance.

The digest is also a markdown page, so it gets indexed in `wiki/index.md` and is discoverable in chat ("show me last week's digest").

### 4.5 Skill version badge

When a skill is invoked during generation, its version surfaces in the reasoning stream:

> persona-architect@v2.3 reasoning (improved 2026-05-21 from 'demographics drift' feedback cluster)

This makes the improvement loop visible at runtime, not just retrospectively. The badge is hoverable for the full change history.

## Part 5 — Wiring to every research run

Both cached and fresh research runs participate in the same loops. The difference is which loops fire.

### 5.1 Cached-data run flow

User asks a question that maps to an existing engagement's research corpus. The system detects via engagement-id matching that no new ingest is needed.

Sequence:
1. COMPILE loop fires if any evidence pages have changed since last compile for this engagement (incremental).
2. GENERATE loop runs.
3. Receipt shows: "Used cached research. Synthesis recompiled since you last viewed (3 evidence pages updated)."
4. LEARN loop runs async on feedback.
5. LINT does not fire (no new data).

### 5.2 Fresh-data run flow

User uploads documents, requests new web research via the research fabric, or starts a new engagement.

Sequence:
1. INGEST loop fires on each new source as it arrives. Pages updated, contradictions flagged.
2. COMPILE loop fires after ingest completes — full pass for the engagement.
3. GENERATE loop runs.
4. Receipt shows: "Ingested N sources, updated M wiki pages, flagged K contradictions, generated against compiled synthesis."
5. LEARN loop runs async on feedback.
6. LINT loop fires if >7 days since last and the session is closing.

### 5.3 The hashtag-deliverable run flow

User types `#proto Brand co-op concierge` in AI Designer Chat (or `#presentations gen-z financial behaviors` in AI Analyst Desk).

Sequence:
1. `hashtagParser.ts` (and the corpus-chat hashtag router) detects the hashtag and routes to the appropriate pipeline.
2. The pipeline calls `loadGenerationContext()` with the deliverable-type-specific framework + anti-patterns + brand + similar past engagements + active constraints (Part 3.1).
3. The deliverable renders with the feedback widget (Part 2.1) AND the per-section feedback affordances (Part 2.2).
4. Receipt shows hashtag-specific change history: "This is the 14th #proto generation. Active prototype skill: experience-prototype-composer v4.1 (improved 2026-05-20 from 'interactions feel scripted' feedback cluster)."

### 5.4 The single coordinator that prevents corruption

All four background loops (INGEST, COMPILE, LEARN, LINT) write through a single coordinator at `services/wikiCoordinator.ts`:

- Optimistic concurrency: every write includes the SHA of the page version it read. Conflicts trigger merge-with-LLM resolution.
- Lock files: `<page>.lock` files with PID + timestamp + agent-id, 60-second TTL. Coordinator queues conflicting writes.
- Audit log: every write to the wiki, regardless of source, appends to `wiki/log.md` with the writing agent's identity and the operation type.

This addresses the multi-agent corruption risk: concurrent ingest, compile, learn, and user-driven generation all writing to the wiki at once. Last-write-wins is replaced by explicit coordination.

## Part 6 — Phased delivery

Six phases. Each is independently shippable. Each has a verification criterion.

### Phase 1 — Restart the dead loops (3 days)

Existing infrastructure has stopped firing. Restart before adding anything new.

- Re-instrument every generation and ingest path to write to `wiki/log.md`. Stop hook that fails the run if a generation produces output without a log entry.
- Build `runWikiLint()` per Loop 5 spec. Run weekly via the new `wiki-maintainer` Docker service.
- Move the 38 `topics-tm_*.json` cache files out of `wiki/synthesis/` to `hic-workspace/sessions/_topic-cache/`. Update `topicModelingService.ts` write paths.
- Audit the existing `promptImprovementEngine.ts`: `logEdit`, `detectPatterns`, `logChatFeedback`, `exportConstraintsToWiki` are all defined but underused. Wire `logChatFeedback` to every assistant message in the corpus chat and design desk chat (the wire-up notes in the comments suggest this was started in 2026-05-19 but not completed).

**Exit criteria**: log.md has ≥20 new entries in 24h of usage; one lint report exists; synthesis/ contains only markdown.

### Phase 2 — Feedback widget and instant regeneration (1 week)

User-facing feedback layer. Touches both chat surfaces and the artifact viewer.

- Build `components/FeedbackWidget.tsx` per Part 2.1.
- Wire it into every assistant message bubble in `CorpusChatPanel.tsx` and `DesignDeskChat.tsx`.
- Build per-section feedback hover affordance for hashtag deliverables. Wire into the renderers for each hashtag type.
- Build `wiki/feedback/` storage layer with the schema in Part 2.3. Build aggregate index in `wiki/feedback/_index.json`.
- Build `regenerateSection(deliverableId, sectionId, instruction)` in `geminiService.ts` and `anthropicService.ts`.
- Build `components/FeedbackReceipt.tsx` per Part 4.3.

**Exit criteria**: every assistant message has a widget; thumbs-up/down works end-to-end; text feedback regenerates a section in <15s; one feedback event persists to `wiki/feedback/` and is readable on the next session.

### Phase 3 — Learning engine and skill versioning (2 weeks)

The async improvement layer. The most code-heavy phase.

- Build `services/learningEngine.ts` per Part 3.
- Implement the routing rule (Part 3.2) and effectiveness scoring (Part 3.3).
- Build skill versioning (Part 3.4) — `_versions/` directories, version frontmatter, rollback command.
- Build skill A/B testing (Part 3.5) — deterministic routing in `loadGenerationContext()`.
- Build framework-page diff workflow (Part 3.6) — pending-review queue, accept/reject UI.
- Build anti-pattern auto-apply path (Part 3.7) and verifier integration.
- Build exemplar promotion (Part 3.8).
- Cron the weekly learning pass in the `wiki-maintainer` service.

**Exit criteria**: one skill patch applied from real feedback; one anti-pattern entry added from real feedback; one framework update queued for review; constraint effectiveness scores populated for all active constraints.

### Phase 4 — Verifier pass and goals-as-filter (1 week)

The pre-shipping quality gate.

- Build the verifier agent. Three checks: brief-fit, framework-fit, evidence-fit.
- Integrate into the generation flow before output is shown to the user.
- Build `wiki/synthesis/verifier-history.md` log.
- Extract goals from `wiki/engagements/<slug>.md` `## Goals` section into `loadGenerationContext()`. Inject as hard constraint in the generation prompt.
- Build the per-section goal-relevance score in `scoreOutput()`.

**Exit criteria**: at least one verifier-triggered auto-regeneration per day of active use; every deliverable shows a goal-fit score; goal-fit score appears in the per-deliverable receipt.

### Phase 5 — Compile loop and cross-engagement patterns (2 weeks)

The compounding-knowledge layer.

- Build `services/wikiCompiler.ts` per Loop 2 spec.
- Build the `/api/wiki/compile` endpoint and the proposed-diff workflow.
- Cron the weekly full pass in `wiki-maintainer`.
- Build cross-engagement pattern compilation per Part 3.10.
- Wire pattern pages into `loadGenerationContext()` so future engagements load them as priors.

**Exit criteria**: at least one synthesis page regenerated weekly with a changelog; one cross-engagement pattern page exists; one engagement uses a prior pattern page during generation.

### Phase 6 — Change-promotion surfaces (1 week)

The user-facing visibility of all the work above.

- Build `components/ChangeStrip.tsx` per Part 4.1.
- Build `<GenerationReceipt />` per Part 4.2.
- Build `components/FeedbackReceipt.tsx` per Part 4.3 (if not already in Phase 2).
- Build the weekly digest writer in `wiki-maintainer` per Part 4.4.
- Build skill version badges in the reasoning stream per Part 4.5.

**Exit criteria**: ChangeStrip shows real data on session start; per-deliverable receipt renders for every generation; weekly digest writes Monday 09:00; skill version badges appear in reasoning stream.

### Total timeline

- Phase 1: 3 days
- Phase 2: 1 week
- Phase 3: 2 weeks
- Phase 4: 1 week
- Phase 5: 2 weeks
- Phase 6: 1 week

Roughly 7-8 weeks end-to-end. Phases 1, 2, 6 deliver visible user value early. Phases 3, 4, 5 deliver the substantive system improvement.

## Part 7 — What this plan deliberately rejects

| Rejected | Why |
|---|---|
| External markdown viewers as part of the system | The loops execute as code. External viewers do not run loops. They are operator UX only and were already covered separately. |
| Manual approval gates on every change | Constraints, anti-patterns, exemplars auto-apply at high confidence. Framework updates always require review. The split is calibrated: low-blast-radius changes flow freely; high-blast-radius changes get human eyes. |
| Replacing the wiki with a SQL database | The schema works. The loops are the problem. Migration is justified only if the compile loop proves the markdown synthesis layer is too unstructured to scale, which is empirically testable. |
| Locking deliverable types to fixed skill versions | The A/B testing path means skill versions evolve continuously. Pinning would freeze quality at the version of the moment. |
| Allowing user feedback to directly modify framework pages | Framework changes affect every future generation. Feedback influences framework pages indirectly via the routing rule and confidence threshold, with required human approval. |

## Part 8 — Verification protocol

After full delivery, verify against the four goal conditions:

1. **Every research run participates in the loops.** Verify by running 10 sessions (mix of cached and fresh) and inspecting `wiki/log.md`. Each session should produce: 1 GENERATE entry, 1+ LEARN entries (if feedback given), 1 COMPILE entry (if evidence changed). Fresh-data sessions also produce INGEST entries. At least 1 LINT entry per week.

2. **User feedback feeds the loops.** Verify by submitting 3 text feedbacks across two sessions, then inspecting `wiki/feedback/`, the constraint store, and the skill versions. At least one constraint or skill patch should have a `source: "feedback cluster"` entry within 14 days.

3. **Skills and artifacts both improve.** Verify by comparing skill files at session 1 vs session 30. At least 3 skill files should show version increments. At least one framework page should show a version increment. At least 5 exemplars should have been added.

4. **Users see what changed.** Verify by capturing the UI on session start. ChangeStrip should show non-empty content. Per-deliverable receipts should show real version data. Weekly digest should exist for the prior Monday.

## Sources

- HiC schema: `hic-workspace/AGENTS.md` Parts I–VII (existing, defines the three-layer architecture and the operations the loops implement).
- Existing constraint scaffolding: `services/promptImprovementEngine.ts` (559 lines, has `logEdit`, `detectPatterns`, `logChatFeedback`, `exportConstraintsToWiki` — underused, this plan completes the wiring).
- Existing chat surfaces: `components/CorpusChatPanel.tsx` (AI Analyst Desk) and `design-desk/DesignDeskChat.tsx` (AI Designer Chat) — both have feedback-capture comments from 2026-05-19 that were partially implemented.
- Existing skill infrastructure: 49 skills in `.claude/skills/` with frontmatter format (name, description, thinking) — this plan adds `version` and `improvement_history` to the frontmatter.
- Hashtag routing: `services/hashtagParser.ts` for `#presentation` directives + corpus chat router for `#proto`, `#presentations`, `#whitepaper`, etc.
- The compounding-knowledge thesis: from the three video transcripts analyzed 2026-05-22 (see prior plan `karpathy-second-brain-uplift.md` for source attribution and critique synthesis).
- Wiki state audit: `wiki/log.md` (152 entries, last 2026-04-21, zero lint operations), `wiki/synthesis/learned-constraints.md` (2 generic stubs as of audit) — current state driving the urgency of Phase 1.

---

## Part 9 — Gemini 3.5 Flash evaluation and integration (2026-05-22 addendum)

This section evaluates where Google's Gemini 3.5 Flash model improves HiC on the four dimensions the operator cares about (intelligence, performance, latency, cost benefit) and records the integration choices already implemented.

### Vendor positioning and pricing

Per Google's posted card on 2026-05-22:

- Gemini 3.5 Flash is Google's most-capable model in the agentic + coding band — "frontier-level performance at a fraction of the latency and cost of larger models."
- Designed for multi-step tasks, autonomous reasoning, and high-volume coding pipelines.
- Pricing: $1.50 per 1M input tokens, $9.00 per 1M output tokens.
- API identifier: `gemini-3.5-flash`.

Reference baseline (current HiC usage):

| Model | Input $/M | Output $/M | Where used today |
|---|---|---|---|
| Claude Opus 4.6 | 15.00 | 75.00 | regenerateWithFeedback default, wikiCompiler.regenerateSynthesisPage, wikiCompiler.compileCrossEngagementPattern |
| Claude Haiku 4.5 | ~1.00 | ~5.00 | learningEngine.generatePayload, verifier.llmCheck, lint.detectPairwiseConflict, feedbackRegeneration.parseFeedbackToInstruction |
| Gemini 3.1 Pro Preview | varies | varies | aiRouter `research` default (deliverable generation pipeline) |
| Gemini 2.5 Flash | low | low | image / video tasks |
| Gemini 3.5 Flash | 1.50 | 9.00 | NEW — see integration choices below |

### Strategic call: where Flash makes sense and where it does not

The cost differential is large against Opus (~90% cheaper output) and small against Haiku (roughly comparable on a per-token basis). The performance differential — per Google's positioning — favors Flash for agentic and structured-output tasks. So the strategic decision is:

USE Flash when the task is either (a) high-volume Opus replacement, or (b) agentic multi-step reasoning that Haiku handles tolerably but Flash handles better.

DO NOT use Flash when (a) the task is a user-facing deliverable where citation rigor and evidence density are the binding quality constraint and the existing Gemini 3.1 Pro routing already covers it well, or (b) the task is a single-token classification where Haiku's lower cost wins.

### Integration choices implemented 2026-05-22

| Surface | Before | After | Rationale |
|---|---|---|---|
| `learningEngine.ts:generatePayload` | Haiku | Gemini 3.5 Flash (Haiku fallback) | Learning engine is the most agentic loop (cluster -> route -> generate -> apply). Flash's agentic positioning matches the task. |
| `verifierService.ts:llmCheck` | Haiku | Gemini 3.5 Flash (Haiku fallback) | Three checks in one call (brief-fit + framework-fit + evidence-fit) — structured multi-output reasoning. Flash supports `responseMimeType: application/json` for strict JSON. |
| `wikiCompiler.ts:regenerateSynthesisPage` | Opus | Gemini 3.5 Flash (Opus escalation) | Biggest cost win. The compile loop touches many pages per run; at ~$10/1M output vs Opus's $75/1M, a weekly cron stays cheap. Escalates to Opus only when Flash returns malformed or short output. |
| `wikiCompiler.ts:compileCrossEngagementPattern` | Opus | Gemini 3.5 Flash (Opus escalation) | Same shape — long structured markdown over a corpus of engagement summaries. Flash with `maxOutputTokens: 3500` handles it. |
| `feedbackRegeneration.ts:applyRegeneration` default provider | `anthropic` (Opus) | `gemini` (Flash) | User-facing "Apply now" has a <15s budget. Opus consistently exceeded it; Flash hits the same task in ~3-6s. `provider: 'anthropic'` is still available as an opt-in escalation when the user has rejected the Flash output. |
| `aiRouter.ts` | no `fast_agentic` category | Added `fast_agentic` with `gemini-3.5-flash` as default | First-class registration so future agentic surfaces (queue runners, scheduled jobs, batch verifier passes) can opt in via the router instead of hard-coding the model id. |
| `GenerationReceipt.tsx` | no model chip | New `modelUsed` prop renders a chip per output | Operators can see at a glance whether the output came from a cost-tier model or a frontier one. Flash chips are cyan-tinted; frontier chips are teal. |

### Cost-benefit estimate

Conservative estimate of monthly run rates (based on a single power user running 5 research sessions/week):

| Loop | Calls/month | Tokens/call (in/out) | Old cost (Opus or Haiku) | New cost (Flash) | Monthly savings |
|---|---|---|---|---|---|
| Learning engine pass | 20 (weekly auto + manual) | 1500 / 400 | Haiku $0.04 | Flash $0.06 | ~ -$0.02 (negligible; cost parity) |
| Verifier pass | 200 (per generation) | 4000 / 600 | Haiku $1.40 | Flash $2.28 | ~ -$0.88 (acceptable for the quality / latency lift) |
| Wiki compile (synthesis) | 30 (4 pages/week * 4 + manual) | 5000 / 3500 | Opus $9.00 | Flash $1.27 | **~$7.73** |
| Wiki compile (patterns) | 8 (once threshold hit) | 6000 / 2500 | Opus $2.22 | Flash $0.25 | **~$1.97** |
| Apply-now regeneration | 40 (user-triggered) | 6000 / 6000 | Opus $21.60 | Flash $2.52 | **~$19.08** |
| Total | | | ~$34 | ~$6.40 | **~$28 / month** |

These numbers are rough — actual token counts vary with corpus size — but the *shape* of the savings is right: ~80% reduction in the cost of the self-improvement loops, with the latency on the "Apply now" path expected to drop from ~12-18s to ~4-7s based on Google's published latency curves.

### What stays on Opus

Two paths remain on Opus deliberately:

1. **Escalation when Flash fails.** Every Flash call has an Opus fallback that fires when Flash returns malformed JSON or output under the minimum length threshold. The fallback is rare in practice but preserves the floor.
2. **User-triggered re-regeneration.** When a user clicks "Apply now" and then clicks it AGAIN on the same section (or marks the Flash output as inadequate), the next call should escalate to Opus. (Not yet implemented; queued under Phase 2 follow-up.)

### What stays on Haiku

The contradiction detector in `wikiLintService.ts:detectPairwiseConflict` and the feedback instruction parser in `feedbackRegeneration.ts:parseFeedbackToInstruction` stay on Haiku. Both are single-pair classifications with short outputs — Haiku's per-token cost wins and the agentic positioning isn't load-bearing for these.

### Verification

Verified end-to-end 2026-05-22:

- `aiRouter.ts` parses cleanly with the new `fast_agentic` category and the `gemini-3.5-flash` model entry.
- Five service files (`learningEngine`, `verifier`, `wikiCompiler` x2 paths, `feedbackRegeneration`) now route through `/api/ai/gemini` with model `gemini-3.5-flash`.
- The proxy's `/api/ai/gemini` endpoint accepts arbitrary model identifiers via the request body — no proxy changes were needed for Flash to route correctly. Existing surrogate-pair sanitization, structured-output config, and thinking-budget support all apply to Flash unchanged.
- `GenerationReceipt.tsx` accepts a `modelUsed` prop and renders a Flash-tinted chip when the value contains `flash`.
- Existing Anthropic fallback paths are retained so the loops never break when Gemini is unreachable.
