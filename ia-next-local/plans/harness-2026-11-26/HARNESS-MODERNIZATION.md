# IA Next Local: harness and loop modernization (26 Nov 2026)

Owner's directive: act as the lead AI engineer; study the research in `.claude/research/new research` and the Uber
article; identify every technique that applies to IA Next Local; write detailed implementation instructions; then
follow them, so that IA Next runs autonomously the way the leading firms would build it.

## 1. Sources read

| Source | What it is | How it was read |
|---|---|---|
| Barbaste, Darrigol, Vu, Wiltberger, "Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents" (arXiv 2609.00006, July 2026, 83 pages) | A source-code study of eleven harnesses (Claude Code, Codex, Gemini CLI, Mistral Vibe, OpenHands, Mini-SWE-Agent, Aider, Hermes, Pi, OpenCode, OpenClaw), with 18 recommendations | every page, tables and listings (text extracted with PyMuPDF) |
| Mager, Varbedain, Medisetty, "How Uber Evals 1 Million Agent Skill Invocations a Month" (Uber blog, 23 Nov 2026) | Skill authoring, telemetry, evaluation, ablation, code mode, papercuts | read in full |
| The X post's video (transcript JSON in the research folder): a talk at AI DevCon by a member of Anthropic's Applied AI team | Context engineering, memory as a file system, memory guardrails, out-of-band "dreaming" | the full Whisper transcript |
| IA Next Local's code | the agent loop, pipelines, verification, self-improvement, routing, retrieval, observability, autonomy | a full map of the code with function references |

## 2. Where IA Next Local stands (from the code map)

Strengths the sources would recognise:

- **Code before model:** status, recordings and web answers are handled in code; a rule router handles hashtags and named outputs before the tool loop.
- **Grounded output:** schema-constrained calls, verbatim quote checks everywhere, and a cross-publisher judge.
- **Gated memory:** USER.md and MEMORY.md are bounded and frozen at conversation start, with consolidation rules and tombstones.
- **Governed skills:** versioned skills, with an approval-gated promotion.
- **Hardware-aware lanes:** studio, card and network lanes manage the one graphics card.

Gaps, each supported by the code:

1. **The agent loop** (`agent._steps`) is a serial loop of at most 10 steps.
   - It has no repeated-call detection and no grace call at the step limit.
   - Tool arguments that drift from their schema are not repaired.
   - It has no hook or middleware system: guards are hard-coded regexes.
2. **Background work is single-pass.**
   - There is at most one repair.
   - Hard scorecard failures only label the work.
   - Research never searches again for a gap.
3. **The self-improvement loop is miswired in the local build.**
   - The writer, local journey and prototype kit never read their promoted skill text.
   - "Held-out" cases are not held out.
   - n ≤ 5 cases, one sample.
4. **Memory has no versions or provenance, no concurrency check and no tiers.** There is no out-of-band curation.
5. **No trace links** a turn to its tool calls, plans, tasks and model calls. Orchestration prompts are not persisted.
6. **Conversations live in memory only.**
   - Compaction runs only at turn start.
   - A restart marks running tasks failed.
7. **No evaluation harness with a model in the loop.**
8. **No sub-agents**, no model-facing plan tool, and no deferred tool loading.
9. **The 26 Nov stall** (section 3) showed a missing deterministic primitive: the harness never made room among the model server's own models.

## 3. Root-cause discipline: the 26 Nov stall (done)

A deep research run hung for 23 minutes on its second model call.

**Facts, each checked:**

- The planner call finished at 13:01:28 (spend row: Qwen, 149 tokens, 7.9 s).
- The next call (the Library pick, on MiniCPM) never returned.
- Ollama logged no load or eviction after 13:01:37.
- A five-token MiniCPM request also hung, both with the app running and after it was restarted.
- Unloading the idle embedding model let MiniCPM load in 11 s.
- MiniCPM also loads at a 32K context beside the conversation model, in 14 s and using 2.2 GB.

**Cause:**

- Ollama judged that MiniCPM would not fit beside two resident models: the conversation model, pinned with `keep_alive -1`, and the embedding model, kept busy by the Library's background embedding.
- On this machine Ollama's free-memory reading goes stale ("GPU discovery watchdog timed out ... using old values").
- It queued the load until a resident model was released, and neither ever was.
- IA Next never freed Ollama's own resident models. Its card-lane accounting did not count the pinned model.

**Fix:**

- `providers.make_room_for`: before a model that is not loaded is called, every idle model except the pinned conversation model is released, the embedding model first.
- `librarysearch.embed`: background embedding pauses while a language-model call holds or waits for the card (`lanes.model_call_active`).
- `providers._note_load_wait`: logs the resident models if a load still waits after 90 s.
- Verified under the original conditions: MiniCPM answered in 22.9 s, with the event `models_released_for_load` showing the embedding model released and Qwen kept.
- Tests are in `tests/test_model_room.py`.

A stall cap was tried first and reverted. It would not have caught this case, because no first token ever arrived, and a retry would have starved the same way. The lesson matches the talk: codify proven primitives (here, explicit model residency) deterministically in the harness, and find the cause before adding a cap.

## 4. Catalog of techniques and the decision for IA Next Local

A = adopt, D = adapt, S = skip (with the reason). P = the paper's page, U = Uber, T = the talk.

| # | Technique | Source | Decision for IA Next Local |
|---|---|---|---|
| 1 | Linear loop, then a middleware pipeline once 3 or more independent policies exist | P14, R1 | A: IA Next has more than 3 hard-coded policies in `_steps` (WS-H2) |
| 2 | Event-sourced conversation, log-as-queue, resumable sessions | P13, P15 | D: persist conversations and task checkpoints in SQLite (WS-H4, WS-H16) |
| 3 | Iteration budget with a grace call when it runs out | P15 | A (WS-H1) |
| 4 | Verify-on-stop guard (a final answer without fresh evidence becomes a continuation) | P15 | D: generalise `unbacked_claim` into a Stop hook (WS-H2) |
| 5 | Reflection loop with lint, test and repair, capped at 3 | P16 | D: an outer verification loop on deliverables, capped at 1 rework (WS-H7) |
| 6 | Outer verification loop with an LLM judge after a run | P13, P43 | A for deep runs (WS-H7) |
| 7 | Concurrency-safe tool batching | P13 | S for model calls (one card, one prompt cache, measured). Read-only lookups may batch later |
| 8 | Bash first; add tools only for observed failures | R3 | S: not a coding agent; the domain tools exist |
| 9 | Argument coercion for open models ("42" to 42) | P27 | A (WS-H1) |
| 10 | Tool prompt text owned by each tool | P21 | D: specialist modules already carry their descriptions; keep |
| 11 | Deferred tool loading with a tool search above about 15 tools | P27, R4 | A, measured first (WS-H6) |
| 12 | Code mode: deterministic steps as scripts, not model turns | P27, U | A: already the house style (code answers first); extend through skills' scripts (WS-H9) |
| 13 | Truncation-poisoning guard (tool calls from a reply cut at the length limit are not run) | P15 | A (WS-H1) |
| 14 | Threshold compaction, an anchored incremental summary, a verbatim tail, the same routine on overflow | P31-33, R7 | A (WS-H4) |
| 15 | Prune old tool outputs, protecting the newest | P33 | A (WS-H4) |
| 16 | Thinking stripped from saved history | P25 | A: check that thinking never re-enters history (WS-H5) |
| 17 | Just-in-time context files | P34 | S: no repository; the engagement focus header plays this role |
| 18 | Agent-maintained memory, with a background pipeline that extracts, consolidates and cites | P33 | D: through dreaming (WS-H12) |
| 19 | Human-gated memory inbox | P34, T | A: dreaming proposals become approval cards (WS-H12) |
| 20 | Bounded, frozen memory snapshot per session (cache-safe) | P34 | Already in place; keep |
| 21 | Lexical recall with no model calls | P34 | Already hybrid (FTS5 plus vectors); keep |
| 22 | Turn-level checkpoints and rewind | P33 | D: task-level checkpoints (WS-H16) |
| 23 | Read-only plan mode with approval to exit | P36 | Already in place (plan cards); keep |
| 24 | A model-facing todo or plan tool | P42 | D: an `update_plan` scratchpad per conversation (WS-H14b) |
| 25 | Sub-agents: forked context, narrowed tools, summary-only returns, no recursion | P41-44, U | A for breadth-first work only: dreaming analyzers and research question fan-out (WS-H14) |
| 26 | Single-agent by default | R12 | A |
| 27 | Layered approvals, permission modes, a floor beneath YOLO | P35-38 | D: autonomy modes with hardline denies (WS-H17) |
| 28 | Taint markers on untrusted content | P37 | Already partly in place (untrusted sources); extend in hooks (WS-H2) |
| 29 | Classified failover and retry policy | P26, P15 | D: an enum of provider failures and actions (WS-H1) |
| 30 | Cheap stuck caps (repeated identical calls) | P13-16, R18 | A (WS-H1) |
| 31 | Static and dynamic prompt split; bit-perfect prefixes so local KV caches hit | P21 | A: measured with `cache_report` (WS-H5) |
| 32 | Budgets as middleware | P32 | D: time and token budgets per task, since cost is $0 locally (WS-H2) |
| 33 | Prompts per model family, with enforcement blocks for open models | P20-25 | D: the Qwen-specific blocks already exist; keep and move them into skills (WS-H9) |
| 34 | SKILL.md with progressive disclosure (about 100-token front matter, body under 500 lines, references on demand) | P48, U, T | A (WS-H9) |
| 35 | Spec-first skills, a skill linter, an error-recovery table | U | A (WS-H9) |
| 36 | Skill telemetry: usage, version, chosen-by, errors, latency, cost, co-use | U | A (WS-H9) |
| 37 | Ablation: with and without a skill, and with parts of it, under a blind judge | U | A (WS-H10) |
| 38 | An eval mix of about 5% golden, 80% trajectory-graded real prompts and 15% author-judged; aim for a 70-90% pass rate | U | A (WS-H15) |
| 39 | Papercuts: agents file friction reports, with a lifecycle | U | A (WS-H13) |
| 40 | A worker on a cheaper model, bounded summary back | U | A: dreaming analyzers on the fast seat (WS-H14) |
| 41 | Move polling out of the main session | U | Already in place (the page polls; tasks run in threads) |
| 42 | Hooks: PreToolUse, PostToolUse, Stop, PreCompact, SessionStart, SubagentStop; deny, rewrite or append | P47 | A (WS-H2) |
| 43 | OpenTelemetry-style traces | P26, U | D: a trace spine in SQLite (WS-H3) |
| 44 | Memory versioning with provenance and rollback | T | A (WS-H11) |
| 45 | Hash-checked concurrent memory writes | T | A (WS-H11) |
| 46 | Tiered memory permissions (curated is read-only to agents; scratch is writable) | T | A (WS-H11) |
| 47 | Portable memory through a clean API | T | A: export and import endpoints (WS-H11) |
| 48 | Dreaming: batch review of transcripts against memory, fleet patterns, prevalence threshold, proposals with evidence, human accept or reject | T | A (WS-H12) |
| 49 | Steer the curators (what matters for this organisation) | T | A: a dreaming policy file (WS-H12) |
| 50 | Harness owns proven primitives (hashing, versioning, residency) deterministically | T | A: section 3, WS-H11 |
| 51 | Classifier model routing to the cheapest sufficient model | P18 | Already in place (seats and the rule router); keep |
| 52 | Per-model metadata centralised | R2 | Already in place (`config.SEATS`, `CHARS_PER_TOKEN`); keep |
| 53 | No agent frameworks; no RAG over code | R8, R15 | Consistent: no framework. Document retrieval is the product, so the vector store stays |
| 54 | Research reflection: re-search a gap once | P16 (pattern) | A, bounded to one round on deep runs (WS-H8) |

## 4b. The paper's 18 recommendations, one by one (coverage check, 26 Nov)

Read again from `harness.pdf`, section 16 (pp. 67-70). Four were not in the catalog above (R5, R10, R13, R17); their
decisions are added here.

| Rec | What it says | Decision for IA Next Local | State |
|---|---|---|---|
| R1 | Linear loop; a middleware pipeline once 3 or more independent turn policies exist | A: `_steps` holds more than three policies inline | WS-H2, next |
| R2 | Per-provider, per-model metadata, maintained centrally | A: `config.CTX_FLOOR`, `CHARS_PER_TOKEN`, capabilities, resident window, embed options | done (WS-H5 part) |
| R3 | Start with few tools; add only for observed failures | D: no shell tool; tools exist per output kind | kept |
| R4 | Deferred tool loading above about 15 tools | A: the agent's fixed list is far above 15 | WS-H6 |
| R5 | Edit contract matched to the model tier; handle drift at the tool, never by line numbers | D: IA Next gives the model no file-edit tool. Its edits are repairs of written work: repairs locate text, never positions (the targeted section repair); prototype screen revisions will use exact match with Unicode and whitespace canonicalization, since the models are open-weight | targeted repair done; prototype revisions in WS-H7 |
| R6 | Hierarchical context files; let the model persist durable facts | D: USER.md (curated) and MEMORY.md, versioned, with an inbox through dreaming | done (WS-H11, WS-H12) |
| R7 | Threshold compaction with a verbatim tail, incremental summaries, reactive on overflow | D: compaction at 60% keeps 6 turns and merges into the earlier notes; within a turn, results are fitted to the window | done in part; reactive overflow in WS-H4 |
| R8, R16 | No vector RAG over code | Not code: IA Next's corpus is prose evidence. Manifest-first retrieval with embeddings only for ranking, never as the source of truth | kept (anti-RAG rule) |
| R9 | PLAN / DEFAULT / YOLO approval modes | A | WS-H17 |
| R10 | OS-level sandboxing for automated contexts | A, already in place: web pages are read in an isolated reader container (read-only, tmpfs, private addresses refused); the renderer has no keys and no outside network; the model has no shell. Any future code mode runs in that sandbox | in place |
| R11 | Safety rules as data, with a floor that cannot be turned off | A: `data/hooks.json` plus hardline rules | WS-H2 |
| R12 | Stay single-agent until a breadth-first phase needs parallel isolation | A: research collection is that phase; the conversation stays single-agent | WS-H14 |
| R13 | Ship an ACP server | S for now: IA Next is used through its own page and the HiC link; no editor or meta-harness drives it. Revisit if the owner wants IA Next driven by another harness | skipped, with reason |
| R14 | Skills for capability templates, MCP for integrations; skills as packages | A: governed skills with held-out evaluation | done (WS-H10); skills v2 in WS-H9 |
| R15 | No agent frameworks; raw SDK calls | kept: IA Next calls Ollama directly | kept |
| R17 | Do not wrap every upstream API as a one-to-one tool | A: audit the tool list for one-to-one wrappers and consolidate (for example per-kind starters behind one tool with a kind) | with WS-H6 |
| R18 | Cheap stuck caps, not elaborate stuck detection | A: repeat cap, grace call, step limit, truncation guard | done (WS-H1) |

## 4c. The Uber article and the talk, read again in this session (26 Nov)

The Uber URL (`/blog/optimizing-ubers-agent-skills/`) was fetched: its title is "How Uber Evals 1 Million Agent Skill
Invocations a Month" (Mager, Varbedain, Medisetty, 23 Nov 2026), the article cited in section 1. The talk (Lamis,
Anthropic Applied AI, AI DevCon) was read from the transcript JSON in the research folder, which is the X post's video.
Items already in the catalog are not repeated; these were missing or only partly covered:

| Source | Technique | Instruction for IA Next Local | Workstream |
|---|---|---|---|
| Talk | Dreaming also cuts what is no longer relevant | dreaming proposes retiring a MEMORY.md note that recent turns contradict, or that no turn has used for 60 days, with the evidence; the person accepts or rejects | WS-H12 |
| Talk | Memory writes guarded against prompt injection | a PreToolUse handler refuses a `remember` whose note repeats a long passage of this turn's tool results (page or document text) without coming from the person's own words | WS-H2 |
| Talk | Let memory grow large; index and search it instead of injecting it whole | keep USER.md whole in the prompt; MEMORY.md past its cap moves to an indexed store that `recall` searches, with the top notes injected by relevance | WS-H11 |
| Talk | Dreaming's transcripts match the memory store's permissions | dreaming reads only the turns of the person whose memory it proposes changes to (already true; keep it with a test) | WS-H12 |
| Uber | Script at load time: small always-needed output injected into the prompt, saving a turn | measure which first tool call is most common (`list_engagements`, `recall`) and inject its short answer into the turn's context | WS-H5 |
| Uber | Agents look up each other's workarounds | `papercuts.search` as part of `recall`: an open or fixed papercut that matches the call being made is offered as context | WS-H13 |
| Uber | Skill tiers and graduation by evaluation; a skill quality score from evals and usage | each governed skill carries a quality score (held-out pass rate, usage, owner verdicts); promotion needs the score | WS-H9 |
| Uber | Per-model skill compiling; recompile when the model changes | a skill version records the model it was evaluated on; a seat change re-runs the held-out evaluation before the version stays active | WS-H9 |
| Uber | Spec-first skills and a linter (numbered steps with a check each, concrete commands, an error-recovery table) | the skill linter enforces those three checks on every candidate | WS-H9 |
| Uber | Cost per skill invocation | spend rows carry the skill version that shaped the call; per-skill cost and latency in `/api/harness` | WS-H18 |
| Uber | Ablation noise band (two identical runs) and a 70-90% pass target | the evaluation harness runs each case twice to measure noise before it compares a candidate | WS-H15 |
| Uber | Canary skill changes | a promoted skill version serves a share of tasks first and is kept only if its scores hold | WS-H9 |
| Uber | Human graders and rejected work become evaluation items | already in place: the owner's "Needs work" verdict becomes a failure case; keep it feeding WS-H15 | WS-H15 |

## 5. Implementation instructions

**Cross-cutting requirement (owner, 26 Nov): every loop engineering step is animated and transparent in the UI.**
- No harness step ships without a live event, shown as it happens:
  - in a conversation, as a branch of the turn scene (`web/orchestra.js` `turnScene`); a step the harness takes to repair, skip, stop or make room is amber;
  - in background work, on the task card's running line (`store.say`) and in its stage flow (`taskFlow`).
- Every branch opens to its details: the tool, its arguments, what came back, seconds, the repairs made, the models released.
- The finished reply keeps the scene, still, under "Steps".
- Each workstream's acceptance includes checking it in the page.

Every workstream follows the house routine: build, run the offline suite (`plans/field-test-2026-11-23/rig/test.ps1 tests`), deploy only when `GET /api/busy` is clear, verify in the page, and record the result here. Nothing is committed without the owner's approval.

### WS-H1 Loop reliability caps (paper items 3, 9, 13, 29, 30)

- `agent._steps`:
  - Keep a per-turn counter keyed on `hash(name + canonical JSON args)`.
  - On the second identical call, the tool result gets a note: "this exact call was made already; use its result".
  - On the third, the call is not run and the loop goes to the grace call.
  - Event: `agent_repeat_stopped`.
- **Grace call** at the step limit: one last model call with tools disabled, asking for a plain-words summary of what was done and what is left. It replaces the fixed message. Exit reasons are recorded as an enum in `agent_reply`: `answered`, `routed_in_code`, `step_limit`, `repeat_stopped`, `tool_error`, `provider_error`.
- **Argument coercion** (`agent.coerce_args`, run before `_execute_tool`) works from the tool's JSON schema:
  - strings to integers, numbers or booleans;
  - a JSON string to an array or object;
  - a single value to a one-item array;
  - unknown keys dropped, recorded in an `args_coerced` event.
- **Truncation guard** in `providers.chat`: when `done_reason == "length"` and the reply holds tool calls, the calls are not returned. The call is retried once with twice the room; if that fails, a plain error is raised.
- **Acceptance:** unit tests for each; the full suite green.

### WS-H2 Turn middleware and hooks (paper items 1, 4, 28, 32, 42)

- New module `ia_next/hooks.py` with an ordered registry of policies. Events and the outcomes they allow:
  - `SessionStart`;
  - `UserPromptSubmit`: append context;
  - `PreToolUse`: deny, rewrite args or append context;
  - `PostToolUse`: append context or transform the result;
  - `PreCompact`;
  - `Stop`: continue with a reason;
  - `TaskStart` and `TaskDone`;
  - `SubagentStop`.
- Each handler returns `Allow`, `Deny(reason)`, `Rewrite(args)` or `Context(text)`.
- Move into handlers: `unbacked_claim` (Stop), the step-8 nudge (UserPromptSubmit at step 8), the hashtag tool nudge (Stop), `repair_engagement` (PreToolUse rewrite), the `plan.gate` decision (PreToolUse), and the repeat cap (PreToolUse).
- **Policy as data:** `data/hooks.json` lets the owner add deny rules (tool plus argument pattern) without code. A floor of hardline rules cannot be turned off.
- Every hook decision is an event with the trace id.
- **Acceptance:** the existing guard tests still pass through the registry; a test for a data-defined deny rule.

### WS-H3 Trace spine (paper item 43; prerequisite for WS-H12 and WS-H15)

- A `TRACE` contextvar set per turn (`tr_<id>`) and inherited by every tool call, plan, task brief (`brief.trace_id`) and model call.
- The spend table gets a `trace_id` column; events carry `trace_id`.
- A new `transcripts` table holds one row per turn: trace id, conversation, person, the user's words, each step's tool calls and arguments, short tool results (the result-file pointer for long ones), the reply, exit reason, seconds and models.
- `GET /api/traces/{id}` returns the trajectory.
- **Acceptance:** one turn with a tool produces linked rows; a test covers it.

### WS-H4 Session substrate and compaction (paper items 2, 14, 15)

- **Persistence:** conversations are saved to SQLite after every turn, as messages with tool calls and result pointers, and restored on restart in full (no longer 8,000 characters of text).
- **Anchored incremental compaction:**
  - the summary has fixed sections: Objective, Decisions and preferences, Work state (tasks and plans with ids), Next move, Ids and files;
  - the previous summary is passed back to be merged ("keep still-true details, drop stale ones");
  - the last 6 turns stay word for word;
  - it fires at turn start above 60% of the floor, and reactively when a call inside the turn raises `_TooLong`.
- **Tool-result trimming:**
  - structure-aware for JSON: keys are kept, long arrays elided with counts, and long strings get head and tail;
  - inside a turn, tool outputs older than the newest 40,000 characters are pruned to their one-line pointer.
- **Acceptance:** tests for persistence across a simulated restart, a merge summary that keeps an early decision, and pruning.

### WS-H5 Prompt cache stability (paper items 16, 31)

- The system prompt is built in two parts:
  - a stable prefix: role, rules, the frozen memory snapshot, sorted compact tool JSON, and a date with no time;
  - a volatile tail: the focus header, the work list and packs, carried in the latest user message, never in the system prompt.
- Thinking text never re-enters history.
- **Measurement:** `prompt_seconds` per orchestration call from the spend table, before and after, over 10 turns.
- **Acceptance:** prompt-eval time on the second turn falls to the size of the new message only.

### WS-H6 Deferred tool loading (paper item 11)

- **Measure first:** the tokens of `TOOLS` in the orchestration call, and routing accuracy on the bake-off.
- **If tools exceed about 15 and 4,000 tokens:**
  - offer the core tools plus `find_tools(query)`, which runs BM25 over tool descriptions and loads the matching specialist tool schemas for the rest of the turn;
  - the rule router already covers hashtags and named outputs.
- **Acceptance:** routing accuracy is not worse on the bake-off; prompt tokens fall.

### WS-H7 Outer verification loop on deliverables (paper items 5, 6)

- `rework.py`: when the scorecard reports a hard failure of a fixable kind, one rework pass runs and the work is scored again. The better version is kept, and the outcome recorded.
- Fixable kinds:
  - research report: failing quote, citation or cut-sentence checks; the failing blocks are rewritten with the deterministic findings;
  - deck: slides that do not fit, or cut sentences; refit or rewrite those slides;
  - artifact: quote repair.
- Never more than one rework. A failure the rework does not fix stays labelled.
- On deep runs the judge's checklist becomes part of the rework input.
- **Acceptance:** a test where a seeded failing check is fixed by the rework, and one where it is not and stays labelled.

### WS-H8 Research reflection (paper item 54)

- On deep runs, after the Analyst, each success criterion in the brief is checked for at least one finding. A small-model call matches criteria to findings, verified in code against finding ids.
- For each uncovered criterion, one targeted search runs: pack index, web and YouTube with the criterion's words. The Analyst runs on the new sources only.
- One round; it is shown on the live card as "searching again for: ...".
- **Acceptance:** a test with a brief whose second criterion has no findings, so one re-search is made.

### WS-H9 Skills v2 (paper items 12, 33, 34; Uber items 34-36)

- **Layout:** `skills/<name>/SKILL.md`, with front matter: name, description (≤ 100 tokens), when_to_use, version, owner, tools. The body stays under 500 lines and may carry `scripts/` and `references/`. Each skill also has `spec.md` (goal, outputs, required and forbidden actions, target models) and `tests.json` (prompts with expected trajectory and outcome).
- **Progressive disclosure for the agent:**
  - the system prompt lists only names and descriptions;
  - a `use_skill(name)` tool loads the body;
  - references are read on demand.
- Specialist prompts (writer, analyst, deck) stay in `skill_versions` and are exposed through the same metadata.
- **Linter:**
  - numbered steps, each with one objective and a check;
  - concrete commands;
  - an error-recovery table; "try again" alone fails.
- **Telemetry:** every `skill_used` event carries the version and whether the agent or the person chose the skill. `GET /api/skills/metrics` reports usage, reach, versions, errors, latency, model seconds and co-use.
- **Acceptance:** the linter tests; one agent-facing skill (deep research with packs) converted, and the metrics endpoint.

### WS-H10 Self-improvement repaired and measured (Uber items 37-38)

- **Wiring:** the local writer (`localwriter.write`), journey map (`journeymap`) and prototype kit read their active skill text. `improve.SKILL_FOR_KIND` covers `research_report`, `journey_map`, `artifact` and `prototype`, mapped to skills that are actually read.
- **Held-out split:** cases that produced the failure signals a candidate was drafted from are excluded from its evaluation. A frozen fixture set (`evals/<skill>/cases.json`, at least 10 cases) is built from finished tasks.
- **Ablation:** for a skill or one section of it, run the same cases with and without it under the cross-publisher judge, pairwise and blind (order randomised). Report the win rate with a 95% interval; a section that does not help is proposed for removal.
- **Promotion:** stays human-approved, now with the ablation result on the card.
- **Acceptance:** tests that the writer reads its promoted text in local mode, and that drafting cases are excluded.

### WS-H11 Memory guardrails (talk items 7-10, 44-47)

- **`memory_versions`:** one row per change, holding entry id, version, the old and new text, author (a person, the reviewer, dreaming or a tool), provenance (trace id, task id, conversation id) and the reason. `POST /api/memory/rollback/{entry}/{version}`.
- **Hash-checked writes:**
  - every write carries the hash of the memory file it read;
  - a mismatch means re-read, redraft and retry, up to 3 times, then a proposal instead of a write.
- **Tiers:**
  - `curated`: owner-approved; agents cannot write it and may only propose;
  - `engagement`: per engagement;
  - `scratch`: per conversation, discarded after 7 days unless promoted.
- **Portability:** `GET /api/memory/export` and `POST /api/memory/import`, as JSON with the versions.
- **Acceptance:** tests for a rollback, a concurrent write conflict, and a refused curated write.

### WS-H12 Dreaming: out-of-band curation (talk items 12-19, 48-49)

- **Schedule:** a nightly job, plus on demand, run by the scheduler's idle pass when no task is running.
- **Inputs:**
  - the day's transcripts (WS-H3), scorecards, papercuts (WS-H13), episodes and failed tasks;
  - the current memory and the skills.
- **Map:** batches of transcripts go to the analyzer, on the fast seat with a sub-agent context (WS-H14). Each returns structured observations: kind (missing knowledge, tool misconfiguration, fleet-wide style, stale memory), evidence (trace ids and quotes) and a suggested change.
- **Reduce:** the orchestrator (Qwen) groups the observations. A pattern needs at least 3 occurrences across at least 2 conversations or tasks.
- **Proposals:** a memory edit, a skill edit or a configuration fix, each with example trace ids, prevalence counts and a justification. They become approval cards; an accepted change is applied through WS-H11 with provenance `dreaming`.
- **Staleness pass:** memory entries not recalled in 60 days, or contradicted by newer evidence, are proposed for retirement.
- **Steering:** a policy file (`data/dreaming.json`) says what matters to this firm and what to ignore.
- **Scope:** a run reads only the transcripts whose permission scope matches the memory it may change. A person's memory is curated from that person's conversations only.
- **Acceptance:** a test with seeded transcripts showing one pattern three times, which yields one proposal with its evidence. A dry run is shown in the page.

### WS-H13 Papercuts (Uber item 39)

- **Agent tool:** `log_papercut(tried, expected, happened, fix)` is always available.
- **Specialists file papercuts automatically** on recoverable friction: a source refused, a model substituted, a stage retried, a pack source dead, a YouTube refusal.
- **Table:** `papercuts`, holding the group key (tool or skill plus a normalised reason), the lifecycle state (new, grouped, triaged, fixed, verified), the trace id and counts.
- **Surfaces:** `GET /api/papercuts`, grouped. Dreaming reads them, and a fixed papercut becomes an eval case (WS-H15).
- **Acceptance:** tests for filing and grouping.

### WS-H14 Sub-agents and a plan scratchpad (paper items 24-26, 40)

- **`subagent.run(task, tools, model, budget)`:**
  - in-process; fresh messages and a frozen system prefix;
  - tools are the intersection with the parent's, with a blocklist: no delegation, no memory writes, no scheduling, no email;
  - the fast seat by default; a turn and time budget;
  - it returns a bounded summary (at most 2,000 characters) and its trace.
- **First users:** dreaming analyzers, and research question fan-out on deep runs (one sub-agent per uncovered criterion in WS-H8).
- **`update_plan` (WS-H14b):** the agent's own short plan per conversation, re-shown at each step, so a 10-step turn keeps its thread.
- **Acceptance:** tests for tool narrowing, the summary bound and the blocklist.

### WS-H15 Evaluation harness with the model in the loop (Uber item 38)

- **Sets** in `evals/`:
  - routing: at least 60 prompts with the expected tool or route;
  - research briefs: at least 10;
  - deliverables: at least 10 per kind.
- **Mix:** about 5% golden (fixed expected output), about 80% real prompts from episodes and papercuts graded on trajectory (right tools in the right order, no forbidden action, recovery followed), and about 15% owner-judged.
- **Runner:** `python -m ia_next.evalrun --set routing`, run on idle or on demand. Results are stored with the code version and skill versions. The target pass rate is 70-90%, not 100%.
- **Gates:** skill promotions (WS-H10) and harness changes report their eval delta.
- **Acceptance:** the runner works on the routing set and reports per case.

### WS-H16 Resumable tasks (paper item 2)

- **At startup:** running and queued tasks resume from their first node without a result (research: Brief, then Research, Analyst, Writer), instead of being marked failed. Plans resume the same way.
- **Checkpoints:** a research node writes its result file only when complete; `sources.json` and the findings are the checkpoints.
- **Acceptance:** a test that simulates a restart after the Research node, so the Analyst runs next.

### WS-H17 Autonomy modes (paper item 27)

- **Modes** in `data/autonomy.json`:
  - `ask`: every artifact waits for Start, as today;
  - `auto-research`: research and listening start without a card when scheduled or dreamed;
  - `auto`: everything except the hardline list.
- **Hardline floor:** email, deletion, schedule creation, spending and memory curated-tier writes always ask.
- **Acceptance:** tests for each mode's gate.

### WS-H18 Observability report

- `GET /api/harness` summarises:
  - exit reasons, repeat stops, argument coercions;
  - models released, load waits, prompt-cache reuse;
  - papercuts, dreaming proposals, eval pass rates.
- The page's health panel links to it.

### WS-H19 Configuration drift (owner decisions)

- `STUDIO_SLOTS` defaults to 2 while its own comment measured 1 as faster on one card. The owner decides; the plan does not change it.
- The tool `strict` flags have no effect locally: remove them.
- `regression.check_research` compares the judge vendor with "anthropic", which never matches locally: compare against the configured verifier seat instead.

## 6. Order of work

1. WS-H1
2. WS-H3
3. WS-H2
4. WS-H11
5. WS-H13
6. WS-H12
7. WS-H10
8. WS-H9
9. WS-H4
10. WS-H5
11. WS-H7
12. WS-H16
13. WS-H15
14. WS-H14
15. WS-H8
16. WS-H6
17. WS-H17
18. WS-H18
19. WS-H19

Reliability comes first, then the trace data that dreaming and evaluation need, then the learning loops, then context and autonomy.

## 7. Progress

| Workstream | State | Evidence |
|---|---|---|
| Root cause of the 26 Nov stall | done, verified live | section 3; `tests/test_model_room.py` |
| Research crash, "'tuple' object has no attribute 'get'" | fixed | the Library seed reused the name `chunks` for its passages and overwrote the web results. The same block also called `secondbrain.adopt` before the function's own later import, so its passages were never adopted. A failed stage now records where it failed (event `stage_failed`); `tests/test_research_library_seed.py` |
| Live, inspectable steps in the UI | done, verified in the page | every tool call and harness step is a branch of the turn scene and opens to its details; the reply keeps "Steps"; misleading chips from other work removed |
| WS-H1 loop reliability caps | done | repeat cap, grace call, exit reasons, argument coercion, truncation guard; `tests/test_loop_caps.py` |
| WS-H3 trace spine | done, verified live | `store.TRACE`, the `trace` column in spend, `transcripts`, the trace carried into tasks and plans, `GET /api/traces/{id}`; `tests/test_trace_spine.py`. Live: turn `tr_6c97aa18e86e` came back with its transcript, 15 events and 5 model calls |
| WS-H11 memory versioning, provenance, curated USER.md | done, deployed | `memory_versions`, hash-checked writes, rollback, export and import, the Memory panel's History; `tests/test_memory_versions.py` |
| WS-H13 papercuts | done, deployed | `papercuts.py`, `log_papercut`, `GET/POST /api/papercuts`; `tests/test_papercuts.py` |
| WS-H12 dreaming | done, deployed | `dreaming.py`: a task with four visible stages, quotes checked against the transcript, a prevalence threshold, approval cards of class `learn`; `tests/test_dreaming.py` |
| WS-H10 self-improvement repaired | done | the local writer and the local journey map read governed skills (`local_writer`, `local_journey`); report and journey failures improve those skills; a candidate is never scored on the tasks it was drafted from; `tests/test_self_improvement_wiring.py` |
| Deep research run profile, 26 Nov | measured | task_15a5caa36acc (Retail, deep, 90 days): 58.1 min. Research 23.9 (two model calls; the library migration's restore ran beside it for 21 of those minutes), Analyst 21.4 (about 9 min reading 130 sources back from HiC while HiC's workers were busy with a failing backfill storm, then 8 windows at about 85 s), Writer and Verifier 12.9. Bar: far under 20 min |
| HiC chunk store: one orphan vector blocked every write | fixed, verified live | `.vectors.local-768.db` held a vector at rowid 185127 with no chunk; the chunk sequence stood at 185126, so every write took 185127, collided, rolled back and collided again (5,629 failed `chunks-backfill` calls in 72 h, each after paying for the embedding). The 4 orphans were removed (vectors saved to `D:\tmp\hic-vector-orphans-2026-11-26.json`); the writer now clears any vector at a fresh rowid; `humans-in-control-research/proxy/tests/test_wiki_vector_store_orphans.py` (the old writer fails it with the live error) |
| Background work yields to the person's work | done | the migration (restore, videos, embedding) and the pending-embed pass wait while a task, plan or model call of the person's runs, and say so (`library_migration_paused` / `resumed`); `tests/test_migration_yields.py` |
| WS-H5 resident window (part) | done | a call keeps the model's resident window when the prompt and a 4,000-token reply fit; only a reply that runs out of room is asked again larger (event `model_window_grown`, a live step); tool results are cut to the room left and say so (`tool_result_fitted`, a live step); a long report is read in parts with its outline. Found live: a 20,372-token chat prompt asked for 64K and Ollama reloaded Qwen at 65,536 (18 s load, 29.2 GiB predicted on a 23.9 GiB card); `tests/test_resident_window.py` |
| Tool argument repair: a title names its engagement | done | an exact engagement title in `engagement_id` resolves to its id (a live "fixed" step); found live in turn `tr_6c97aa18e86e` |
| WS-H18 step timeline (part) | done, verified live | every line a step says is timed (`step_timed`), `GET /api/tasks/{id}/timeline`, and a "Where the time went" disclosure on finished task cards (consecutive progress lines of one activity merged into one row); `tests/test_step_timeline.py` |
| Rerun after the contention fixes, 26 Nov | measured | task_e95becc9ac71, same brief: 48.6 min (was 58.1). Research 21.5 (archive 11.1 min of it), Analyst 15.2 (reading back 2.5 min, was about 9; generation 11.5 min, 8 windows of about 2,000 tokens at about 22 tokens a second; scope check 2.3), Writer and Verifier 12.0 (draft 4.6, a full rewrite of all 7 sections 5.5 including 85 s of Qwen and Nemotron reloads, two reviews) |
| HiC event loop held by IA Next's health check | fixed (IA Next deployed; HiC on its next worker restart) | the deep health check asked HiC for `/api/wiki/embed-status` every 20 s; HiC counted its 124,000-row chunk store on its event loop each time: 92 of 99 loop stalls in 40 min had it on the stack, while the run's archive step waited on HiC. IA Next now checks the embedder every 5 min (1 min while down); HiC computes the status in a thread and caches it for a minute |
| Naked-number false positive on publisher names | fixed | "> Digital Commerce 360, November 2026: [S8]" was flagged, which can set off a full rewrite and stays open; publisher names with digits are references, like titles; `tests/test_naked_number_publishers.py` |
| Plan card honesty | fixed, verified live | the estimate uses runs of the same depth (the third run's card said "about 49 min", the second's said 15 for a 48.6 min run); the sources clause and "Deep research:" are not the subject; `tests/test_plan_card_honesty.py` |
| Third run, 26 Nov | measured | task_340c32866c38, same brief: 44.0 min (58.1, then 48.6). Research 19.0 (archive 9.1 min of it), Analyst 14.7 (read back 2.0, 8 windows of 57 to 90 s, scope check 2.5), Writer and Verifier 10.3 (draft 4.6, model reloads about 2.3, a full rewrite 2.6, review 0.8) |
| WS-H7 targeted repair | done, deployed | a repair rewrites only the sections a reviewer's point names (same plan, same evidence); a point that names no section rewrites the whole report as before; a section whose rewrite fails keeps its earlier text; the first draft's findings are now kept in `verification.json` so a repair can be judged; `tests/test_targeted_repair.py` |
| HiC manifest re-parsed on every write | fixed (HiC, on its next worker restart) | the manifest cache was dropped whenever the journal changed, and each write-article appends a line, so every write re-parsed the 25 MB base and 38 MB journal on the event loop (2.4 to 6.8 s each; about 20 s per archived page with three in flight). `manifest_journal.py` replays only the appended lines (0.002 s), leaves a half-written line for the next read, and reloads fully after compaction. Checked read-only on HiC's real files: the same 24,768 records as the old loader; `humans-in-control-research/proxy/tests/test_manifest_journal.py` |
| Coverage check of the sources, 26 Nov | done | the research folder holds `harness.pdf` and the talk transcript JSON; both, and the Uber article, are in section 1. Section 4b maps each of the paper's 18 recommendations; four were missing from the catalog (R5, R10, R13, R17) and now have decisions |
| WS-H2 hooks (part) | done, deployed | `hooks.py`: PreToolUse and PostToolUse handlers returning Allow, Deny, Rewrite or Context; a floor frozen at import (no keys or tokens in tool arguments); the owner's deny rules as data in `data/hooks.json`; every decision an event on the trace and a live amber step; `GET /api/hooks`; `tests/test_hooks.py`. Still inline in `_steps`, to move into handlers: `unbacked_claim` (Stop), the step nudge, the hashtag nudge, the plan gate and the repeat cap |
| Sources read again in this session | done | the Uber URL fetched (title and date match section 1); the talk read in full from the transcript JSON; 13 missing or partial techniques added as instructions in section 4c |
| Memory writes guarded against page text (talk, 4c) | done, deployed | the PreToolUse handler "memory from the person" refuses a `remember` that repeats eight or more consecutive words of this turn's tool results that the person did not say; a live amber step; `tests/test_memory_guard.py` |
| WS-H2 hooks (rest) | done, deployed | the turn policies that lived inline in `_steps` are handlers now, behaviour unchanged (the existing loop tests pass as before): PreToolUse "repeat cap" (a Skip outcome: noted on the second identical call, ends the turn on the third), Stop "verify on stop" (a Continue once, then a Replace with the plain fact) and "the hashtag's tool was called", PreStep "finish within the step limit". The two Stop outcomes are live steps. The plan gate stays inside `execute_tool`, because plans and code routing call tools without the conversation loop |
| Dreaming retires stale notes (talk, 4c) | done, deployed | kind `stale_note`: the reviewer sees the current memory notes; an observation must name a note memory holds now, with checked quotes and the same prevalence as an addition; accepting removes it as a version authored by dreaming (undoable in History); `tests/test_dreaming.py` |
| WS-H9 skills v2 (part) | done, deployed | each evaluation records the model it ran on; `skills.quality()` gives the active version's held-out score, uses, the owner's accept and reject verdicts on work it shaped, and `recheck` when the seat's model differs from the model it was judged on (Uber: per-model compiling); shown per skill in `/api/skills`; `tests/test_skill_quality.py`. Live: 13 skills, all at their seed version, uses counted (theme_namer 63, deck_composer 37, local_writer 4), no verdicts yet. Canary rollout done and deployed: `promote(..., canary=True)` (`POST /api/skills/versions/{id}/promote?canary=1`) serves the version on one call in three; the idle pass (`review_canaries`) keeps it once it has shaped 3 finished tasks with no more hard check failures and no higher rejection rate than the active version over the same period, else retires it (event `skill_canary_reviewed`). Still to decide: the linter (IA Next's governed skills are prompts, not step-by-step procedures, so the Uber step checks apply only once a procedural skill exists) |
| WS-H18 harness report | done, deployed | `GET /api/harness?days=N`: how turns ended, loop interventions by kind, model calls per model (loads over 5 s, load seconds, mean prefill, output tokens), model events, learning events, dreaming proposals waiting, open papercuts, each skill's quality, and recent tasks with their time by step; `tests/test_harness_report.py`. Live, last day: Nemotron reloaded on all 6 of its calls (200 s of loading), Qwen 11 loads over 5 s (266 s), 6 papercuts open |
| WS-H16 resumable tasks (research) | done, deployed | at startup a research task left running or queued resumes from its first step without a checkpoint (`sources.json` for the Research Lead, `findings.json` for the Analyst are read back; event `node_resumed`); its interrupted step is closed as failed with that reason; other kinds of work are still marked failed (no checkpoints yet); `tests/test_resumable_tasks.py`. The standing rule stays: rebuild only when `/api/busy` is clear |
| WS-H17 autonomy modes | done, deployed | `data/autonomy.json` (`GET/POST /api/autonomy`): `ask` (default, every artifact waits on its card), `auto-research` (research and Reddit listening start at once), `auto` (every artifact starts at once); `plan.autostart` after the plan gate, event `plan_autostarted` as a live step. The approval floor (send, delete, spend, learn, curated memory) is unchanged in every mode; `tests/test_autonomy_modes.py`. Live mode: ask |
| WS-H19 configuration drift | done | the regression check fails a report judged by the writer's own publisher (`tests/test_regression_vendor.py`). `STUDIO_SLOTS` now defaults to 1: its own comment recorded the measurement (24 Nov: a deck and a journey map side by side took 17.2 min in all against 14.5 one after the other, the journey map finishing at 14.0 instead of 5.3, because one model server keeps one prompt cache) while the default stayed 2; a machine with two cards sets IA_NEXT_STUDIO_SLOTS=2. The `strict` flags stay (harmless locally, valid for a hosted model) |
| WS-H4 sessions (part) | done, deployed | after every turn the conversation's working state is saved (`conversation_state`: messages with tool calls and one-line result pointers, the compaction notes, result files) and a restart restores it in full (event `conversation_restored`), instead of the last 8,000 characters the person saw; compaction notes are merged in fixed sections (Objective; Decisions and preferences; Work state; Next move; Ids and files), keeping what is still true; `tests/test_session_persistence.py`. Still to do: reactive compaction when a call inside a turn cannot fit even the larger window, and structure-aware JSON trimming |
| WS-H13 workarounds (Uber, 4c) | done, deployed | PreToolUse "known workarounds": a papercut filed against the tool about to run, with its fix, is added to the result as a note; `tests/test_hooks.py` |
| Browser reader "did not answer" (found by the papercuts loop) | fixed, deployed | 29 papercuts said the browser reader did not answer while the reader logged all 667 renderings as done: the client's 60 s timeout included the wait in the reader's queue (4 at a time, 8 callers). The client now holds the same 4 slots, so the timeout measures the rendering; a paywall (402) is no longer sent to the browser; `tests/test_reader_slots.py` |
| WS-H15 evaluation (part) | done, deployed | the noise band: every held-out evaluation runs the incumbent a second time on each case; the mean difference between its two scores is the noise band, and a candidate passes only when it is never worse on a case and better on average by more than that band (`noise_band`, `mean_gain` in the evaluation record); `tests/test_skill_quality.py`. Still to do: trajectory grading of recorded turns (the right tools in the right order) and the golden, real-prompt and author mix |
| WS-H4 reactive compaction | done (deploy waits for the owner's deck) | when a call inside a turn cannot fit even the larger window, once per turn: this turn's older tool results become their one-line pointers (`prune_turn_results`), older turns are summarized (`compact(force=True)`), and the call is retried; a live step "Made room in the conversation"; `tests/test_session_persistence.py` |
| WS-H8 research reflection | done (deploy waits for the owner's deck) | on deep runs, `uncovered()` checks in code which success criteria no finding speaks to; for at most two, one more Research Lead round at fast depth with the criteria's words ("searching again for: ..." on the card), the Analyst on the new sources only, the findings merged with a `reflection` record; sources are published first so the new ones are numbered after them; `REFLECTION` switch; `tests/test_research_reflection.py` |
| WS-H6 deferred tools | built, measured, kept off | `find_tools` (ranked by shared words, rarer words weigh more), core tools plus what a request loads, a hashtag's tool loaded at once; switch `IA_NEXT_DEFERRED_TOOLS`; `tests/test_deferred_tools.py`. Measured live on 15 requests (`scripts/bakeoff_tools.py`, router bypassed): all tools 9 of 15 first choices right, 6.5 s, 9,243 prompt tokens; deferred 8 of 15, 8.7 s, 7,062 (3,900 for requests that make nothing). Accuracy fell by one, so by the acceptance rule the switch stays off. The baseline itself misroutes 6 of 15 free-form requests (audio overview, brief and themes to `recall` first; Reddit listening to nothing): the code router covers named outputs, but free-form routing is the thing to improve before deferring |
| WS-H11 memory grows behind an index | done, deployed | a note pushed out of MEMORY.md or USER.md by the size cap goes to `MEMORY.archive.md` instead of being lost; `recall` searches the archive (a held entry wins a tie); a turn receives the archived notes that share at least two words with the request; what the person asked to forget never comes back from the archive; `tests/test_memory_archive.py` |
| Deck regression, 26 Nov (my 25 Nov instruction) | fixed, deployed | "at least 3 CASE slides" turned 14 of 20 storyline slides into CASE slides, 13 as cards; the decisions dropped out. Now "two or three, never more", each in the layout that fits; the storyline is checked in code before any slide is written (no layout more than twice in a row, none on more than 40% of slides, a closing slide), sent back once with its problems named, then repaired in code; a stated slide count is the count; every slide that takes a picture gets one locally; `tests/test_deck_story_shape.py`, `tests/test_deck_stated_count.py` |
| Free-form routing (found by the WS-H6 comparison) | done, deployed | the code router now names a data table, a document (one-pager, memo, PRD, case study, gap analysis, roadmap, personas) and Reddit listening ("listen to what people on Reddit say"); "write" counts as a making verb; a question still goes to the model; `tests/test_router_named_outputs.py` |
| WS-H14 sub-agents and the turn's own plan | done, deployed | `subagent.run`: fresh messages under a fixed system prompt, the parent's tools minus every outward or lasting action (no starting work, memory writes, scheduling, email or further delegation), the fast seat, a step and time budget, a summary of at most 2,000 characters and its trace; the agent's `ask_worker` tool uses it. `update_plan`: the agent's own plan for the turn, shown back before each step by the PreStep handler "the plan so far". Both are live steps; `tests/test_subagents.py` |
| WS-H5 script at load time (Uber) | done, deployed | measured over 146 turns: `list_engagements` was the first call of 21 (14%). A turn with no engagement in focus now starts with the 12 most recent engagements and their ids; `tests/test_engagement_digest.py` |
| WS-H15 trajectory grading (Uber) | done, deployed | `trajectory.py` grades each recorded turn in code: a named output reaches its tool, a question starts no work, the turn ends answered, no identical call twice; the pass rate and failures are in `/api/harness` with the 70 to 90% useful range; `tests/test_trajectory.py`. Live: 4 turns recorded since the trace spine, all pass (too few to judge yet) |
| WS-H4 structure-aware trimming | done, deployed | a tool result fitted to the room left is trimmed by its structure (`trim_json`: every key kept, long lists keep their first items with a count of the rest, long strings keep head and tail), so the model still reads valid JSON; `tests/test_resident_window.py` |
| Asking again for finished work (found while verifying the deck fixes) | fixed, deployed | an identical request returned the finished deck from an hour before (same words, same arguments, so the same idempotency key): the owner's "ask again for 50 slides" would have handed back the 25-slide deck. Finished work now blocks the same request only for 10 minutes (`IDEM_DONE_SECONDS`), as stopped and failed work already did not; `tests/test_idem_window.py`. Verified live: the repeated request started task_0e2d27472797 |
| Deck fixes verified on a real deck | measured | the owner's 50-slide request (task_10f51126a2fe, 23.4 min): it planned and wrote 50 slides (the stated count works), 8 layouts against 5, cards 8 of 27 against 16 of 20, CASE 2 against 14, a closing slide, 10 pictures against 5. Still short: 23 of 50 written slides were repeats and were left out, so 27 shipped plus 5 source tables, with a run of 5 bullets in the second half, which drifted into generic advice; 85 findings do not carry 50 distinct slides |
| Deck repeats, after the verification | fixed, deployed | the storyline check also names slides of the plan that make the same point and sends the plan back; a deck that left repeats out says so on its card ("23 repeated slides left out"); the repeated-slide check no longer counts the appended "Sources, continued" tables (a false hard failure); `tests/test_deck_story_shape.py` |
| Restart, 26 Nov evening | handled | after the owner's computer restarted: containers came back; Ollama and the picture engine were started by hand; starting the Ollama app applied 0.40.18, which silently truncates a prompt longer than the window (3,011 tokens became 514) unless the request says `truncate: false`, now sent by every chat call (`tests/test_resident_window.py`); HiC's proxy restarted, so its three fixes are live; a deck interrupted by a restart now closes its step |
| Dreaming reads only its person's turns (talk, 4c) | done | kept with a test: `dreaming.gather(person)` attaches only the turns of the person whose memory it proposes to change; `tests/test_dreaming.py` |
| Cost per skill (Uber, 4c) | done, deployed | `/api/harness` `skill_cost`: per governed skill, the tasks it shaped in the period, their model seconds, output tokens and mean seconds per task (locally the cost is time); `tests/test_harness_report.py` |
| Harness report linked from the page (WS-H18) | done, deployed | the health bar, shown when a service is down, links to `/api/harness` |
| Per-model re-evaluation (Uber, 4c) | done, deployed, verified live | `skills.recheck`: the active version is scored twice on the model its work runs on now (the two scores give the noise band) on its held-out recorded messages (the writers on held-out reports), against the score it earned when judged; a version never judged gets a baseline on today's model, so a later model change has something to compare with. It measures only: nothing is promoted or retired; a drop beyond the noise band files a papercut. The idle pass runs one due skill at a time, cheapest first, as a visible task (kind `skill_check`, a stage whose line gives each case's two scores and the comparison); `POST /api/skills/{skill}/recheck`, `POST /api/skills/recheck/pause?minutes=` (0 resumes). Found live: the check's own task counted as the person's work and paused it after one case; the system's own kinds (dreaming, skill_check, model_check) are background now; `tests/test_skill_recheck.py`, `tests/test_migration_yields.py` |
| Analyst seat comparison, 26 Nov | measured; seat unchanged (owner's decision) | `scripts/bakeoff_analyst.py` on the first two Analyst windows of task_340c32866c38, same system prompt and schema: Qwen 3.8 27B 132.4 s (no load), 24 findings, 22 verbatim (91.7%), 14 sources, 24.4 tokens/s; Nemotron 3.5 Lightning 30B-A3B 86.7 s of which 36.4 s loading (it swaps Qwen out of the card), 23 findings, 22 verbatim (95.7%), 17 sources, 57.5 tokens/s. On a deep run's 8 windows that is about 8.8 min against about 3.9 min plus one load each way. Two windows is a small sample and verbatim share is not a quality judgement of the claims; a seat change needs a blind comparison of the findings and the owner's decision |
| WS-H7 outer rework pass | done, deployed, verified live | `rework.py`: when the scorecard finds a hard failure code can repair, one rework runs, the work is scored again and the better version kept (a tie restores the earlier files); never a second rework; a failure it cannot fix stays labelled; the card says "Repaired after the checks: ..." (`rework` in scorecard.json, event `rework_done`). Repaired: a deck's repeated slides (previous slides kept as deck.v<N>.json) and a re-render with today's template. Not reworked, by design: slides from saved data (the scorecard and every export lay them out again from the data, so a template fix already reaches them), reports (the writer's targeted repair is their one pass), `sources_current` (needs new collection). Measured first: today's checks pass all 115 finished tasks on every repairable check; `tests/test_rework.py` |
| Deck text never under 10 pt (found while building the rework) | fixed, deployed | bullet points, statement support, layer bodies, card bodies and flow steps could be set at 8 or 9 pt when long (`_fit` floor base-6, `_fit_box` floor base-5); every size now stops at 10 pt (`deckstudio.MIN_PT`, the scorecard's floor) and text that does not fit keeps its leading whole points or sentences, never a cut one; `tests/test_rework.py` |
| Verdicts follow the code | done, deployed, verified live | `scorecard.VERSION` and the idle pass's `rescore_stale` (6 per pass): a finished task whose saved scorecard failed under an older version is scored again; the card's "Needs review (...)" list now follows today's checks. Live: 10 finished tasks scored again after the deploy; 6 lost a stale "Needs review" (3 journey maps, 3 decks), 4 kept `sources_current`, which is true |
| WS-H11 engagement and conversation tiers | done, deployed, verified in the page | `remember` takes kind `engagement` (the engagement in focus, shared by everyone on it) or `conversation` (scratch, dropped after 7 days by the idle pass unless the person keeps it, which moves it into MEMORY.md); every add and removal is a version (`engagement:<id>`, `conversation:<id>`); forget reaches every tier; a turn receives the notes for its engagement and conversation; the Memory panel shows both tiers first, with Keep and Forget, and the add form offers both when they apply; `GET /api/memory?engagement=&conversation=`, `POST /api/memory/notes/{id}/keep`, `DELETE /api/memory/notes/{id}`; `tests/test_memory_tiers.py` |
| WS-H9 skills v2: packages, use_skill, linter, metrics | done, deployed, verified live | `agentskills.py`: a skill is `ia_next/agent_skills/<name>/` with SKILL.md (front matter: name, description of at most 100 tokens, when_to_use, version, owner, tools; numbered steps each with a `Check:` line; an error-recovery table), spec.md (goal, outputs, required, forbidden, target models) and tests.json (prompts, expected tools in order, forbidden tools, expected arguments). The agent's instructions list names and descriptions only; `use_skill` loads the body (event `skill_used`, chosen_by agent; a live step "Skill"). The linter enforces Uber's checks (a step without a check, a step with no concrete tool or field, a recovery of "try again" alone, a tool the agent lacks, missing spec sections, fewer than three tests); it caught a real gap in the first draft (step 1 named no field). Specialist skills now record chosen_by code. `GET /api/skills/metrics` (uses, who chose, versions, reach, tasks, hard failures, model seconds, co-use) and `GET /api/skills/agent`; `tests/test_agent_skills.py`. Converted: `deep-research-with-packs` (v2) |
| Skill trials (WS-H9 acceptance, ablation) | measured; the skill is kept on evidence | `scripts/skill_trials.py` runs each tests.json prompt on the agent seat with and without the skill catalog (only use_skill executes). On the first four cases both passed 4 of 4 after the harness and product fixes (no gain). Five harder cases were added (YouTube as evidence, a publication written as a web address, the composer's pack line, a subreddit beside a pack, two packs): with the skill 9 of 9, without 8 of 9, the same case both runs (without the skill the agent also made a separate Reddit listening call), mean time equal (19.6 s against 19.6 s). The gain reproduced, so the skill stays |
| A named subreddit is collected on the same card | fixed, deployed | a deck, document, report or any evidence-backed card whose request (or required_sources) names a subreddit the engagement holds no posts from now starts with a required step "Collect the Reddit posts" (subreddits, a search phrase from the subject, the card's period); the runner starts the listening, waits, and then the work; the step shows its live state. The agent's instructions and the research tool's description now say to list the subreddit in required_sources rather than calling start_social_analysis first; `tests/test_plan_reddit_and_audience.py` |
| Plan card: the audience is never the subject (the owner's 50-slide deck) | fixed, deployed | "a 50 slide deck from this research for retail leadership team (C-suite and senior retail executives)": the audience parser missed an audience after "from this research" and with a parenthetical, so the card said "Subject understood as: retail leadership team ..." and the deck's audience argument was the placeholder "the people this engagement serves". Now the audience is the person's words and the subject is the engagement's objective; `tests/test_plan_reddit_and_audience.py` |
| Plan card: the period is the engagement's own (the owner's 50-slide deck) | fixed, deployed | with no period in the request and no saved default, "Evidence from" offers the period of the engagement's own research (its sources' window), not the 30-day default: that card offered "Last 30 days" for an engagement researched over 90; a period in the request still wins; `tests/test_plan_reddit_and_audience.py` |
| Deck plan card: estimate for a stated slide count | fixed, deployed, verified live | the deck step's estimate was the median of the last three decks whatever their length. A stated count now sets it: seconds per slide written over the last three decks (repeats left out still took their time; new decks record `slides_written`, older ones fall back to the count their request stated) times the count. Live, the owner's 50-slide request: 28.1 s a slide, about 23.4 min, against 23.4 min measured on that deck (the shipped-slide rate had said 39.5); `tests/test_plan_reddit_and_audience.py` |
| Fourth run, 27 Nov (after every fix above) | measured | task_d621ff254e1d, same brief, started from its plan card through the real path (the agent loaded deep-research-with-packs; the card read the subject without the audience, 90 days, deep, about 49 min estimated): 29.7 min (58.1, then 48.6, then 44.0). Research Lead 6.6 (archiving 74 new sources in HiC 162 s, was 9.1 min: HiC's manifest replay), Analyst 12.3 (8 windows of 65 to 133 s), the WS-H8 reflection round 5.7 (Research Lead again 2.8, Analyst again 2.9; new work the earlier runs did not do), Writer and Verifier 5.2 (was 10.3). Scorecard clean, reviewer 1.0, 0 open verification findings, 82 findings from 219 sources. Read in full: current sources, numbers only inside cited quotes, answer first; one broken sentence in the opening ("Trust in retailer-owned assistants is higher ..., and that accurate, structured data is ..."). Bar "far under 20 min" not met: the Analyst is now the largest step |
| Model server contract after an update (WS-H19, the 26 Nov Ollama auto-update) | done, deployed, verified live | `modelserver.py`: when Ollama's version differs from the last one checked, the idle pass probes the model already loaded, at its own window (never loading or resizing a model): a prompt past the window with truncate false must be refused, and the model must keep its window. A visible task (kind `model_check`); a broken promise files a papercut and shows on the health bar; `GET /api/model-server`, `POST /api/model-server/check`. Live on 0.40.18: refused with HTTP 400 in 0.2 s, Qwen kept 32,768. So automatic updates no longer need freezing: a version that breaks either promise is caught the first idle minute after it arrives; `tests/test_model_server_check.py` |
| Analyst seat, full blind comparison, 27 Nov | measured; Qwen stays on evidence | `scripts/bakeoff_analyst_blind.py`, every Analyst window of task_340c32866c38 (4 at the window size), same prompt and schema, then each window's two finding sets judged blind and pairwise, order shuffled, by both models. Qwen 3.8 27B: 275.9 s, 48 findings, 45 verbatim (93.8%), 33 sources. Nemotron 3.5 Lightning: 73.9 s (14.2 s loading), 46 findings, 35 verbatim (76.1%), 24 sources. Qwen as judge preferred Qwen's set 4 of 4; Nemotron as judge preferred Qwen's set 3 of 4. Both judges agree, so the verdict does not rest on a judge favouring itself. The two-window measurement before it (equal verbatim) was too small. Nemotron is about 3.7 times faster but loses a quarter of its quotes and a quarter of its sources: the seat stays Qwen, and speed comes from elsewhere |
| Commits, 27 Nov | done (owner approved, local only) | IA Next Local: b793f4af7 on ia-next-local-2026-11-19, 122 files (run outputs left out), not pushed. HiC proxy: 157074574 on ia-next-2026-11-17, the three fixes and their tests only (the 19 Nov diagram-pptx hunk of proxy/app.py stays uncommitted, outside the approval) |
| The X video is the analyzed talk (checked 27 Nov) | verified | the post (hanakoxbt, 24 Aug 2026, "we don't write prompts anymore, we build loops and graphs") carries one 32-minute video, video.twimg.com/.../r_Szl6IGcKvLIsxK.mp4 (public metadata through api.fxtwitter.com); the research folder's transcript JSON is the Whisper transcript of an upload named ...r_Szl6IGcKvLIsxK.mp4, 5,177 words: the same video. Its techniques (autonomous memory writes and the background learning loop, out-of-band dreaming that consolidates, cuts stale notes and adds missing knowledge, guardrails against stale or injected memories, hashing and versioning codified in the harness) are in section 4c and built in WS-H2, WS-H11 and WS-H12. The caption's "every accepted unit becomes a rule the next run inherits" is the promotion gate, dreaming proposals and governed skills |
| The Uber article read again and mapped line by line, 27 Nov | done | fetched from uber.com ("How Uber Evals 1 Million Agent Skill Invocations a Month", 3,959 words). Every technique mapped to what is built or skipped with a reason (aifx and its six config layers: IA Next is one agent; find-skills: one agent skill). Four gaps found and closed in the next rows: references read on demand, tiers and graduation, removing steps (ablation), real prompts as trial cases |
| Skill references on demand (Uber: scripts and references read only by the step that needs them) | done | `use_skill(name, reference)` reads `agent_skills/<name>/references/<file>.md`; the body says which step needs which reference; the linter fails a body that names a reference the package lacks. deep-research-with-packs v3 carries `references/packs.md` (every pack id from `hic.PACKS` with what it covers); `tests/test_agent_skills.py` |
| Skill tiers and graduation (Uber: domain, core, always-on; graduate by evals) | done, verified live | front matter `tier` (the linter requires one of the three); `agentskills.graduation`: domain needs only the linter, core and always-on need the last trial to show the skill helps (at least as many cases pass with it as without, and at least 70% pass); shown in `/api/skills/agent` and `/api/skills/metrics`. Live: deep-research-with-packs is core, earned on 9 of 9 against 8 of 9 |
| Removing steps and real prompts (Uber: test removing words; most of a suite is real prompts graded on trajectory) | built, measured below | `scripts/skill_trials.py`: TRIAL_ABLATE=1 runs every case once more per numbered step with that step removed (data/skill_ablation.json); TRIAL_REAL=N adds up to N recorded turns that started one of the skill's making tools, graded on reaching that same tool |
| The talk re-read from its transcript, 27 Nov | done | the owner's instruction: the video is analysed from its JSON transcript (research folder), never from frames. All 229 sentences read; every technique maps to a built item: CLAUDE.md-style files and their bloat (19-24: capped USER.md and MEMORY.md, the archive), in-band memory tools (27-31), skills with progressive disclosure (33-38), memory as a searchable store that grows (42-50: the archive behind recall), concurrency, wrong org context, stale or injected memories (56-60: hash-checked writes, the curated tier, the memory guard, retirement), versions with provenance (62-63), the hash, draft, re-pull and retry protocol (67-70), permission tiers from curated to scratch (72-79), portability (81-85), out-of-band dreaming (94-122), the kinds it finds (123-133: missing knowledge, tool problems, fleet-wide style; tool calls scrutinized), a fleet of sub-agents steered by what matters (138-139: the policy's important and ignore lists), prevalence, evidence and a person's accept or reject (140-143), consolidate, cut, add, organise (160), dreaming permissions mirroring the store's (202-206), and codifying proven primitives in the harness (216-222). One gap: dreaming did not organise (merge) notes, closed in the next row |
| Dreaming: an organizing stage (the talk, line 160), and one reviewer per conversation | done | a new stage "Organizing" finds overlapping notes in code, asks for one merged note per group (the newer note wins where they disagree), drops a merge that adds more than a fifth new content words, and proposes it as an approval card; an accepted merge replaces the notes as a hash-checked version authored by dreaming. Batches are one conversation each (split only past the batch size): the transcript says only "a fleet of sub-agents" (138), so the grouping is a design choice, made so a reviewer sees each correction beside what it corrected; `tests/test_dreaming.py` |
| The idle pass works on its own (evidence, 27 Nov) | verified live | with no request: 10 stale verdicts re-scored at startup; a dreaming pass (1 proposal); the Library migration paused three times for the person's work; skill baselines recorded for eight skills between 07:48 and 10:05, each a visible task |
| Noise bands read 0.00 (found in those baselines) | fixed | every local call samples with seed 7, so two runs of one prompt were identical and every noise band was 0, which makes any later drop look significant. The repeat run of a re-check and of a held-out evaluation now uses seed 8 (`providers.seed_as`), so the band is the variation across seeds; all ten baselines had the flaw; they were cleared after the deploy and the idle pass records them again; `tests/test_skill_recheck.py` |
| Skill trial with real prompts, step ablation and a placebo, 27 Nov | measured | the nine author cases plus the two recorded turns that started research (TRIAL_REAL=5 found two): with the skill 11 of 11, without 10 of 11, the same case failing for the third time (without the skill the agent adds a separate Reddit listening call). Removing any one of the seven steps still passes 9 of 9; the placebo (use_skill returns only the title) passes 8 of 9, the same as no skill. So the gain comes from the content, carried redundantly (step 4 forbids the separate Reddit call; step 6 checks the tool was called once): no single step is load-bearing, and the skill could be shortened once a two-step removal is measured |
| Two-step removal and a minimal skill, 27 Nov | measured; the skill stays at v3 | TRIAL_VARIANTS: steps 4 and 6 removed together, 9 of 9; only steps 4 and 6 kept, 9 of 9; the placebo (title alone), 8 of 9; no skill, 8 of 9. Any substantive instruction body carries the gain on these cases, and no removal ever raised the score, so no words are measurably harmful (Uber's reason to cut). Steps 1, 2, 3 and 5 guide behaviour these nine cases do not exercise, so cutting them would rest on missing evidence: the skill stays at v3 until cases exercise those steps |
| Re-check baselines with a real noise band, verified live | verified | after the ten one-seed baselines were cleared, creative director re-recorded with the repeat run on seed 8: noise band 0.025 (all ten read 0.00 before); the other nine re-record in idle time |
| Dreaming's organizing stage on real memory (found live) | fixed, verified live | the owner's nine memory notes share one template ("The recording X is transcribed and held in engagement Y as source Sn") and word overlap grouped all nine for one lossy merge. Now two notes are about different things when each names something the other does not (quoted names, source ids), and a merge must keep every name and source id and the newest note's numbers. Live: 0 groups in the real memory; a full dreaming pass ran every stage (4 turns, 9 papercuts; one reviewer per conversation; 3 patterns; Organizing: no overlapping notes; 3 proposals waiting as approval cards); `tests/test_dreaming.py` |
| Next on speed | measured | the Writer's targeted repair (5.2 min) and HiC's manifest replay (archive 162 s) are measured on the fourth run (29.7 min). The Analyst (12.3 min) is the largest step; the faster model loses on quality (row above), so the Analyst keeps Qwen and the next lever is fewer, fuller windows rather than a smaller model |
