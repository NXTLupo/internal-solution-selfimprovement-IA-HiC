# Karpathy Second Brain Uplift Plan for Humans in Control

> Sources analyzed (2026-05-22):
> 1. Teachers Tech, *Karpathy's LLM Wiki - Full Beginner Setup Guide* (905s, video iXd0t60YmMw) — the canonical setup walkthrough.
> 2. Dream Labs AI, *Build Andrej Karpathy's LLM Knowledge Base for Businesses (10x Output!)* (1054s, video FAWm7DuFSPc) — business adaptation, self-learning loop framing.
> 3. Nate B Jones, *Karpathy's Wiki vs. Open Brain. One Fails When You Need It Most.* (2468s, video dxq7WtWxi44) — independent practitioner critique and hybrid architecture proposal.
>
> The three together (~73 minutes of focused source material) form a near-complete picture: Karpathy's core insight, the popular operationalization, and the principled critique. This plan distills the patterns, audits how completely HiC implements them, and prioritizes the gap-closing work.

## Executive thesis in three sentences

Karpathy's second brain is not a folder structure — it is a re-positioning of the AI from **Oracle** (answer-on-demand) to **Maintainer** (a continuous editorial agent that compiles knowledge once and keeps it current). HiC has the *schema* of this pattern already in place — three concentric layers, ten typed page categories, an AGENTS.md schema, evidence chains, learned-constraint capture — but the **maintenance loops have silently stalled**: `wiki/log.md` has not been written to in 31 days, zero `LINT` operations have ever executed, `learned-constraints.md` contains two generic stubs, and 38 cache JSON files are polluting the synthesis directory. The fix is not to add more architecture. The fix is to **restart, automate, and harden the loops we already designed**, then layer on the three principled additions the source material proves are missing: a goals filter, a contradiction surfacer, and a wiki-recompile-from-database operation.

## Part I — What Karpathy actually proposed (synthesis of the three sources)

### The fundamental re-positioning

Every RAG-style system "rediscovers knowledge from scratch on every query" (Nate B Jones). The AI does real cognitive work — finding chunks, synthesizing across documents, building cross-references — and then throws it all away. Karpathy's insight: have the AI **write down what it learned**, so the next question starts from compiled understanding instead of raw chunks.

Nate B Jones puts it sharper than the Karpathy tweet itself does:

> "Most AI knowledge tools spend compute and tokens to **re-derive**, whereas his Wiki **compiles**. That's a fundamentally different relationship between AI and your information."

The reframe is **AI as maintainer, not Oracle**. The AI has an ongoing job (keep the artifact current), not just a query-time obligation (answer this thing). All three sources agree on this as the load-bearing idea.

### The three layers

| Layer | Karpathy's name | Role | HiC equivalent |
|---|---|---|---|
| 1 | Raw sources | Immutable input — AI reads, never writes | `hic-workspace/sources/` |
| 2 | Wiki | LLM-maintained markdown, interconnected via wikilinks | `hic-workspace/wiki/` |
| 3 | Schema | Rulebook telling the AI how to operate | `hic-workspace/AGENTS.md` |

Karpathy's wiki has four directories: `concepts/`, `entities/`, `sources/`, `syntheses/`, plus `index.md` and `log.md`. HiC's wiki has ten typed directories — already a richer schema than the original.

### The five schema sections

Both video walkthroughs (Teachers Tech, Dream Labs) converge on the same five-section `CLAUDE.md` shape:

1. **Purpose** — what this wiki is *about* (the only line every user customizes)
2. **Folder structure** — where raw goes, where wiki goes
3. **Ingest workflow** — read → extract → create/update pages → update index → log
4. **Page formatting rules** — summary on top, citations required, link related concepts
5. **Question-answering behavior** — consult wiki first, cite sources, flag uncertainty

HiC's `AGENTS.md` (Part I-VI) covers all five but in much greater depth. Schema is not the gap.

### The three operations

| Operation | Trigger | Output |
|---|---|---|
| INGEST | New source dropped into raw/ | Source-summary page + fan-out updates to 10-15 wiki pages |
| GENERATE | Question or deliverable request | Answer assembled from compiled wiki, with citations |
| LINT | Periodic (weekly or every 10 ingests) | Health report: contradictions, orphans, stale claims, missing pages |

`AGENTS.md` Part IV defines all three for HiC. INGEST and GENERATE both happen. **LINT has never been logged** — confirmed by `grep -c "lint " wiki/log.md` returning 0.

### The compounding loop (Dream Labs framing)

Dream Labs adds one explicit pattern Karpathy's original tweet leaves implicit: **every interaction feeds back into the directory**. Every query, every edit, every feedback signal updates the wiki so it gets smarter "while you sleep". HiC has the *intent* of this in `learned-constraints.md` and `engagement memory`, but the IMPLEMENTATION has stalled (see Part III audit).

### The role-model "skills cartridge" (Dream Labs)

Dream Labs's distinct contribution: take a public expert's body of work (Hormozi's interviews, Robbins's talks), package it as a skills file, and **plug it in like a cartridge** so the wiki has a "board of directors" perspective informing outputs. Karpathy doesn't propose this; it's an emergent practitioner extension. HiC has *skills* (40+ in `.claude/skills/`), but they are *process* skills (write a slide, score a prompt), not *mentor* cartridges. This is a real gap and a high-leverage addition.

### The goals filter (Dream Labs)

Dream Labs treats `goals.md` as a universal filter: "If it's clever but doesn't move a number, it doesn't ship." Every output is interpreted through this lens. HiC has engagement pages per client but does not surface a per-engagement goals filter into the generation prompt as a quality gate.

## Part II — The critique that matters (Nate B Jones, OpenBrain)

Nate B Jones launched a *competing* memory architecture (OpenBrain) and is in the strongest position to critique Karpathy's wiki honestly. His critique is not "wiki bad" — it is "wiki is a study guide, not a filing cabinet, and most people are about to confuse the two." Five specific gaps:

### Gap A — Editorial decisions get baked in invisibly

> "Every time the AI turns a raw source into a Wiki page, it is making editorial decisions … important nuance could get dropped that might matter a few months from now, and you would literally never know. The Wiki reads so cleanly." — Nate B Jones

The synthesized text is *more readable* than the raw source, so the trust quietly shifts from raw → wiki. Most people, "because we are lazy," stop checking the raw. Karpathy's architecture keeps raw untouched (good), but most adopters won't maintain the discipline to consult it (bad).

### Gap B — A neglected wiki drifts into active misinformation

> "A neglected database has gaps … but a neglected Wiki tends to drift because old syntheses become increasingly wrong as new information is not integrated, but they still read with the confidence that comes from well-written prose."

Database staleness *looks like ignorance*. Wiki staleness *looks like authority*. **HiC's wiki has not been written to in 31 days** (`log.md` last entry 2026-04-21, today 2026-05-22). This is exactly the failure mode Nate describes.

### Gap C — Cannot answer precise structured queries

A folder of text files cannot answer "show me every engagement where pricing was discussed in the last 12 weeks" or "rank our 14 engagement pages by recommendation-density-per-citation." These are database queries. HiC's wiki is pure markdown — no structured backing.

### Gap D — Multi-agent writes corrupt the wiki

> "If you have three or more agents, that's just going to break when they're all trying to write markdown files at once."

HiC has multiple generation paths writing to wiki simultaneously (engagement archival, learned-constraints capture, source ingestion, generation-context updates). There is no write-coordination layer. Conflicts are silently last-write-wins.

### Gap E — Wiki smooths over the contradictions you most need to see

> "Engineering might think the timeline is 12 weeks and Sales promised the client 8, and something like a smart Wiki might resolve that contradiction into one coherent narrative rather than flagging that you have a fundamental misalignment … The gap between what engineering knows and what sales promised is exactly the problem your leadership would need to see."

`AGENTS.md` Part IV mentions `⚠️ CONTRADICTION` flags but there is no automated detector. The wiki happily reconciles instead of flagging.

### The hybrid model Nate proposes

> "OpenBrain for structured storage and agent access, and a Karpathy-style Wiki over the top for compiled understanding and human browsability. The database ends up feeding the Wiki, and the Wiki never contradicts the database."

The Wiki is **regenerated on a schedule** (daily, weekly, on-demand) from the structured database — so it can never drift, because reality is always in the database, and the wiki is a *compiled view*. This is the single most important architectural lesson from the third transcript and it is **not implemented in HiC** today.

## Part III — Honest audit of HiC's current state

Findings from inspecting `hic-workspace/`, `wikiService.ts`, and `wiki/log.md` on 2026-05-22:

### What is in place (the architecture is mature)

| Capability | Evidence |
|---|---|
| Three-layer architecture | `sources/`, `wiki/`, `AGENTS.md` all present |
| Schema document | `AGENTS.md` Parts I–VII, ~1,800 lines |
| Framework pages | All 11 present in `wiki/frameworks/` |
| Brand system | 6 pages in `wiki/brand/` with CSS, illustration rules, anti-slop |
| Anti-patterns | 11 pages, one per deliverable type |
| Benchmark pages | 5 categories |
| Engagement memory | 14 engagement pages captured |
| `loadGenerationContext()` | Implemented at `wikiService.ts:1484` with lazy-load (2026-05-11 optimization) |
| `scoreOutput()` + `detectBannedPhrases()` | `wikiService.ts:1907` and `:1973` |
| Append-only log | `wiki/log.md` with frontmatter discipline, 152 entries |
| Learned-constraints file | `wiki/synthesis/learned-constraints.md` exists |
| Lazy fetch-on-demand | Wiki manifest pattern post-2026-05-11 |
| Semantic article retrieval | `fetch_wiki_articles` + the `wiki-query-expander` and `wiki-reranker` skills |

### What has stalled or never fired (the loops are broken)

| Symptom | Evidence | Cost |
|---|---|---|
| **Wiki has not been written to in 31 days** | `log.md` last entry `[2026-04-21]`, today is `2026-05-22` | Karpathy's compounding promise is a flat line |
| **Zero LINT operations have ever logged** | `grep -c "lint " log.md` → 0 | Nate's drift trap is unmitigated |
| **Learned-constraints is anemic** | `learned-constraints.md` is 12 lines, two generic stubs ("needs attention: 5 user edits detected", "requires more accuracy") | Edit-learning loop is technically running but producing constraints too vague to inject usefully |
| **Synthesis directory polluted** | 38 `topics-tm_*.json` cache files alongside 3 human-readable synthesis pages | The synthesis layer is no longer human-readable, future ingests will compound the mess |
| **No contradiction detector** | `AGENTS.md` Part IV item 1 documents the flag but no code looks for one | Engineering-vs-Sales-style misalignments smooth over |
| **No automated INGEST trigger** | New `sources/` uploads do not auto-fan-out to wiki pages — current code seeds source summaries but does not update 10-15 wiki pages per Part IV "Critical rule" | The "single ingest touches 10-15 pages" promise is not enforced |
| **No goals-as-filter wiring** | Engagement pages exist but their goal sections are not lifted as a North-Star prompt in generation | Outputs are framework-compliant but not goal-compliant |
| **No mentor/skills cartridge slot** | The `.claude/skills/` directory holds process skills, not domain-mentor data packs | Missing the Dream Labs cartridge pattern entirely |
| **No "recompile wiki from sources" operation** | Wiki is the source of truth, not a compiled view | Nate's hybrid model is unavailable; drift is structural, not just operational |
| **No claim-to-raw-source traceback in deliverables** | Final deliverable cites `[Source: filename]` but the chain raw → wiki claim → final claim is not surfaced | Trust shift to wiki happens silently, exactly as Nate predicted |
| **No "where are the gaps in my knowledge" prompt** | This is the highest-leverage Karpathy/Dream Labs query and HiC never asks itself | Wiki cannot tell us where it is thin |
| **`process_video_in_background`-style activity but no equivalent wiki-maintainer process** | Generation fires; ingest fires per-engagement; lint never fires; consolidation never fires | Three of four operations run, one does not |

## Part IV — Gap analysis mapped to fixes

Twelve specific gaps. Each ties to a video citation, an HiC artifact, and a fix. Priority key: P0 = stops the bleed, P1 = high leverage now, P2 = architectural improvement, P3 = exploration.

| # | Gap | Source | HiC artifact | Fix | Priority |
|---|---|---|---|---|---|
| 1 | Log has stalled — no recent INGEST/GENERATE writes since 2026-04-21 | Karpathy: compounding compile-once promise (all 3 videos) | `wiki/log.md` | Re-instrument all generation paths to call `appendLog()` on completion; add a Stop hook that fails CI if a session produces output but no log entry | P0 |
| 2 | LINT has never run | Karpathy: lint as periodic health check (Teachers Tech); Nate B Jones: drift detection | `AGENTS.md` Part IV Op 3 | Build `runWikiLint()` in `wikiService.ts`; expose via `/api/wiki/lint`; cron it weekly via a new `wiki-maintainer` service or per-session post-hook; log results to `wiki/log.md` and write report to `wiki/synthesis/lint-YYYY-MM-DD.md` | P0 |
| 3 | Learned-constraints too vague to inject | Karpathy: self-learning loop (Dream Labs); HiC plans 2026-04-13 already flagged this | `learned-constraints.md` | Re-write the edit-classifier to produce *specific* constraints with a quoted before/after example, source engagement, and the prompt section it should inject into. Three-line fix is in plans/hic-wiki-selfimprovement-plan.md per memory — reactivate it. | P0 |
| 4 | Synthesis dir polluted by 38 topic-modeling caches | All three videos: synthesis dir is human-readable | `wiki/synthesis/topics-tm_*.json` | Move all `topics-tm_*.json` to `hic-workspace/sessions/<engagement>/topic-cache/`; update `topicModelingService.ts` to write there; gitignore the cache dir | P0 |
| 5 | No contradiction detector | Nate B Jones: Gap E (smoothing over critical tensions) | `AGENTS.md` Part IV mentions but doesn't enforce | Add `detectContradictions(pageA, pageB)` to `wikiService.ts`: an LLM call with the two page contents and a structured-output schema returning `{conflicts: [{claimA, claimB, severity, suggestedResolution}]}`. Run as part of LINT. Surface in deliverables as `⚠️ Sources disagree` callouts. | P1 |
| 6 | No goals-as-filter at generation time | Dream Labs: "if it doesn't move a number, it doesn't ship" | Engagement pages have a goals section but it is not prompt-injected | Extract `## Goals` block from `engagements/<slug>.md` in `loadGenerationContext()`; pass as `engagementGoals: string` in the `GenerationContext` interface; render in every prompt as "All outputs must serve these goals: …" with a post-hoc score | P1 |
| 7 | "Where are the gaps in my knowledge" query never asked | Dream Labs: explicit feature; Karpathy: implicit via lint | No artifact | Add `findKnowledgeGaps(engagementSlug)` operation: cross-reference engagement goals against wiki page coverage. Output: ranked list of missing concept pages, thin evidence pages, framework pages that need this engagement's data. Surface in the Reasoning Stream after every run. | P1 |
| 8 | Multi-agent wiki writes are last-write-wins | Nate B Jones: Gap D | `/api/wiki/write*` endpoints in `proxy/app.py` | Add a write-coordinator: optimistic file locking via `<slug>.lock` files with PID + heartbeat. Read-modify-write semantics via SHA hash check. Reject conflicting writes; queue a re-try with merge prompt to the writing agent. | P1 |
| 9 | Wiki is source-of-truth, not a compiled view | Nate B Jones: the entire hybrid pitch | The entire architecture | Add a "wiki recompile" operation: a scheduled (weekly) `compileWikiFromEvidence()` that reads `wiki/evidence/`, `wiki/sources/`, and `sessions/*/research-fabric.json` and regenerates `wiki/synthesis/*` pages, then `wiki/frameworks/*` *suggestions* (not overwrites — proposed diffs for human approval). The evidence layer becomes authoritative; the synthesis layer becomes a compiled artifact that cannot drift. | P2 |
| 10 | No mentor/skills "cartridge" slot | Dream Labs: the Hormozi/Robbins plug-in pattern | `.claude/skills/` is all process skills | Create `wiki/mentors/<name>.md` page type with frontmatter `kind: mentor` and sections `core-thesis`, `frameworks-they-use`, `their-vocabulary`, `their-failure-modes`. Add per-engagement opt-in: an engagement can pin 1-3 mentors and they get loaded into `loadGenerationContext()`. Seed with three: a CX consulting voice (Pine/Gilmore), a service design voice (Polaine), a strategy voice (Rumelt). | P2 |
| 11 | No claim-to-raw traceback in deliverables | Nate B Jones: Gap A | `slidePostProcessor.ts` resolves `[CHUNK_XXX]` → SourceName but does not expose the chain | Add a hover/click affordance in `WikiArticleViewer.tsx` and the rendered deliverable that maps every cited claim to its wiki page → that page's source documents → the specific raw passage. Two-layer modal: claim → wiki summary → raw quote. | P2 |
| 12 | No "idea-file" publishing format for engagements | Nate B Jones: "the idea file as a publishing format" | Plans live in `plans/` but they are internal | Codify an `EngagementBrief.md` template that is itself a Karpathy-style idea file: pasteable into an agent, contains purpose + goals + sources + mentors + framework selection + quality bar. Lets a fresh agent reconstruct the engagement context from one document. Replaces the current "open many files to know what's going on" pattern. | P3 |

## Part V — The phased plan

Four phases. Each is independently shippable; later phases assume earlier ones are running.

### Phase 1: Stop the bleeding (P0 items 1-4) — ~3 days

The wiki has been silently dead for a month. Before adding any new architecture, restart the loops that are supposed to run.

**Phase 1.1 — Restore logging discipline**
- File: `services/wikiService.ts` — add a `withWikiLog<T>()` wrapper that envelops any generation, ingest, or score function and writes a structured `log.md` entry on completion (success or failure). Failure to log = build-time error in dev.
- Files: All call sites in `App.tsx`, `geminiService.ts`, `anthropicService.ts` that produce wiki-affecting work get wrapped.
- Verification: 24h of normal HiC usage produces ≥20 new log entries with `engagement`, `operation`, `duration_ms`, `outcome` fields.

**Phase 1.2 — Ship LINT as a real operation**
- File: `services/wikiLintService.ts` (new) — implements the 9-item checklist from `AGENTS.md` Part IV Operation 3.
- Each check is a separate function returning `{check, status, findings: Finding[]}`. Findings include the offending page, the rule violated, and a suggested fix.
- Output: `wiki/synthesis/lint-YYYY-MM-DD.md` with frontmatter `type: lint-report`.
- Trigger: a new `lint-on-stop` post-hook fires after every generation session if more than 7 days have passed since the last lint run (timestamp tracked in `wiki/synthesis/last-lint.json`).
- Cost ceiling: lint runs use Haiku, not Opus. Budget ~$0.05 per run.

**Phase 1.3 — Sharpen learned-constraints**
- Memory has a 2026-04-13 note: "constraint loop BROKEN (3-line fix)". This is the fix.
- File: `services/constraintLearner.ts` — replace the current generic constraint generator with one that takes the edit diff, the surrounding deliverable section, and the engagement goal as context, and produces a constraint of the form: `When generating <field> for engagements with <goal pattern>, do <X> because <Y> (see <engagement-slug>:<edit-id>).`
- Reset `learned-constraints.md` (move current contents to `learned-constraints-v1-archive.md`) and re-derive from the existing 14 engagement directories' captured edits.

**Phase 1.4 — Clean the synthesis directory**
- 38 `topics-tm_*.json` files move to `hic-workspace/sessions/_topic-cache/`. Add `_topic-cache/` to gitignore.
- Update `topicModelingService.ts` write paths.
- The synthesis directory should contain only human-readable markdown plus the new lint reports.

**Exit criteria for Phase 1**: log activity in last 7 days ≥10 entries, ≥1 lint report exists, learned-constraints has ≥5 specific constraints, synthesis/ contains only markdown.

### Phase 2: Add the missing maintainer behaviors (P1 items 5-8) — ~1 week

With the loops alive again, layer in the four maintainer behaviors the source material proves are missing.

**Phase 2.1 — Contradiction detector**
- New skill: `contradiction-finder` (already exists per the skill manifest — verify it triggers correctly and surface its output in the lint report).
- New service function: `wikiService.detectCrossPageContradictions(pageIds: string[])`. Use an Opus call with structured output. Run on every pair where both pages were updated within the last 14 days, or on demand within LINT.
- Surface in the rendered deliverable as inline `⚠️ Sources disagree` callouts with both quotes side by side, instead of silent reconciliation.

**Phase 2.2 — Goals-as-filter**
- Update the engagement page template (in `AGENTS.md` Part VII or wherever it lives) to require a `## Goals` section with three sub-items: business goals, evidence-quality goals, stakeholder-impact goals.
- `loadGenerationContext()` extracts these and adds an `engagementGoals: string` field to `GenerationContext`.
- Every generation prompt gets a closing line: `Every output must demonstrably serve these goals: <list>. If a section does not, omit it.`
- New post-hoc check in `scoreOutput()`: each major section gets scored 1-5 on goal-relevance. Sections scoring 2 or below get flagged for regeneration.

**Phase 2.3 — Knowledge-gap surfacer**
- New service function: `wikiService.findKnowledgeGaps(engagementSlug: string)`.
- Method: load engagement goals, expand them into ~10 sub-topics via an LLM call, then for each sub-topic count wiki pages with `tags:` matching, evidence pages with cited data points matching, and benchmark pages with relevant numbers. Sub-topics with `<3` evidence points or `<1` framework reference are flagged as gaps.
- Surface in the post-run Reasoning Stream: "Three knowledge gaps for this engagement: A (0 evidence points), B (1 outdated benchmark), C (no framework page yet). Want me to ingest sources targeting these?"

**Phase 2.4 — Multi-agent write coordinator**
- File: `proxy/app.py` — `/api/wiki/write` and `/api/wiki/write-section`.
- Add: optimistic SHA-based check (`If-Match: <sha>`); reject 409 if changed. The frontend retries with a merge prompt that asks the AI: "Page changed since you read it. Here's the new version. Merge your update."
- Add: a `<page>.lock` file with PID + timestamp + agent-id, expires after 60s. Coordinator queues conflicting writes.

**Exit criteria for Phase 2**: at least one cross-page contradiction surfaced in production output; goal-filter score appears in every deliverable's metadata; one knowledge-gap report exists; one concurrent-write conflict resolved without data loss in test.

### Phase 3: The hybrid architecture (P2 items 9-11) — ~2 weeks

Adopt the most important lesson from the third transcript: **the wiki should be a compiled view, not the source of truth.**

**Phase 3.1 — Wiki recompile from evidence**
- New service: `services/wikiCompiler.ts`.
- New operation: `recompileSynthesisFromEvidence(opts: {dryRun: boolean, scope: 'all' | 'changed-since' | 'engagement:<slug>'})`.
- Method: read all `wiki/evidence/*.md` and `wiki/sources/*.md`. For each `wiki/synthesis/<topic>.md` page, regenerate it from the evidence with an Opus pass. Output as a *proposed diff* by default — only auto-apply if `dryRun: false` AND a human-readable changelog is committed alongside.
- Schedule: weekly cron via a new `wiki-maintainer` service (Docker compose entry, port 5014).
- Reports to: `wiki/synthesis/recompile-YYYY-MM-DD.md`.
- This is the single biggest architectural change. The wiki stops being authoritative for synthesis; evidence becomes authoritative; synthesis becomes a *compiled view* that can be regenerated at will. **Nate B Jones's hybrid model, adapted to HiC's markdown world.**

**Phase 3.2 — Mentor cartridges**
- New page type in `AGENTS.md` Part III: `mentor`.
- New directory: `wiki/mentors/`. Each page: `core-thesis`, `frameworks-they-use`, `their-vocabulary`, `their-failure-modes`, `representative-quotes` (with full citations).
- Seed three mentors (commit-time choice — suggested: Pine & Gilmore for experience economy framing, Polaine for service design depth, Rumelt for strategy diagnosis).
- Engagement pages get a `mentors: [pine-gilmore, rumelt]` frontmatter field.
- `loadGenerationContext()` loads mentor pages when the engagement opts in and adds `mentorVoices: string[]` to the context.
- Prompt instruction: "Consider what each pinned mentor would notice or critique about this output, but do not name them in the final text."

**Phase 3.3 — Claim-to-raw traceback**
- Update `slidePostProcessor.ts`'s citation rewriter to emit a structured `{wikiPage, chunkId, rawSource}` tuple alongside the display string.
- New component: `<CitationTraceback claimId={...} />` in the deliverable renderer. Click → three-level modal: claim → wiki summary that grounds it → raw passage with surrounding context.
- This is the Nate B Jones Gap A counter-measure. It restores the discipline of "go back to raw" by making the path *one click away*.

**Exit criteria for Phase 3**: synthesis recompile runs weekly with proposed-diff commits; at least one engagement uses pinned mentors; every cited claim in a deliverable can be three-click traced to a raw passage.

### Phase 4: The publishing format (P3 item 12) — ~3 days

**Engagement brief as idea-file**
- Template: `humans-in-control-research/plans/_template-engagement-brief.md` — a pasteable Karpathy-style idea file.
- Sections: purpose, named goals, sources to ingest, mentors to pin, frameworks to use, quality bar, anti-patterns to actively avoid, success criteria.
- The file should be self-contained — a fresh agent reading just this file should be able to reconstruct what the engagement is about without opening anything else.
- Migrate the three most active engagement pages to this format as proof.

**Exit criteria for Phase 4**: three engagement briefs exist; a cold-start agent given only a brief reproduces a deliverable that matches the original's quality score within 10%.

## Part VI — What we deliberately are not doing

| Tempting addition | Why we are skipping it |
|---|---|
| Replace markdown wiki with a SQL database (full OpenBrain) | The schema is fine; the loops are broken. Fix the loops first. A database migration is justified only if Phase 3.1's recompile-from-evidence proves the markdown synthesis layer is genuinely too unstructured. |
| Add a graph database for cross-page links | The `[[wikilink]]` convention works. Build the lint check that exploits it before adding new graph infrastructure. |
| Build a separate "AI second brain" product | HiC *is* the second brain. Branding a new product would dilute attention from fixing the one we have. |
| Adopt Obsidian as the viewer | The HiC UI already renders wiki pages with cross-references. A second viewer is not the problem. |
| Add a "knowledge graph 2.0" feature | The existing knowledge graph (per recent commits) is sufficient. Add the gap-surfacer instead. |

## Part VII — Verification protocol

After each phase, verify by the criteria already stated. After the full plan ships, verify against the source material directly:

1. Re-read the Karpathy fundamental reframe ("AI as Maintainer, not Oracle"). For HiC, this means: the agent has a continuous job, not just a query-time obligation. Verify by inspecting `log.md` — there should be background maintenance entries (lint, recompile, gap-surfacer) interleaved with foreground generation entries.

2. Re-read Nate B Jones's drift critique ("a neglected wiki tends to drift … staleness looks like authority"). For HiC, this means: stale pages must be detectable and recompiled. Verify by deliberately ageing a synthesis page by 90 days and confirming the lint report flags it and the recompiler regenerates it.

3. Re-read Dream Labs's goals filter ("if it doesn't move a number, it doesn't ship"). For HiC, this means: every section of every deliverable can be traced back to a stated engagement goal. Verify by spot-check: pick 5 random sections from the last 5 deliverables and confirm each maps to a documented goal.

## Sources cited

- Teachers Tech, *Karpathy's LLM Wiki - Full Beginner Setup Guide*, video iXd0t60YmMw, 905s, transcribed 2026-05-22.
- Dream Labs AI, *Build Andrej Karpathy's LLM Knowledge Base for Businesses (10x Output!)*, video FAWm7DuFSPc, 1054s, transcribed 2026-05-22.
- Nate B Jones (AI News & Strategy Daily), *Karpathy's Wiki vs. Open Brain. One Fails When You Need It Most.*, video dxq7WtWxi44, 2468s, transcribed 2026-05-22.
- HiC schema document: `hic-workspace/AGENTS.md`, Parts I-VII.
- HiC operations log: `hic-workspace/wiki/log.md`, 152 entries, last 2026-04-21.
- HiC generation context: `services/wikiService.ts:1484-1596` (`loadGenerationContext`), `:1907-1972` (`scoreOutput`, `detectBannedPhrases`).
- Prior plan: `plans/hic-wiki-selfimprovement-plan.md` (per memory — referenced for the 3-line learned-constraint fix in Phase 1.3).
