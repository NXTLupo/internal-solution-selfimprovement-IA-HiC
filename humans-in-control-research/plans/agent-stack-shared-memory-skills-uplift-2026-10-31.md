# Agent-Stack Uplift: Audited Skills, Shared Memory, Second Brain, Orchestration (2026-10-31)

Status: PLAN. Code-verified audit on 2026-10-31 (every file:line below was read in this session). Nothing
implemented, nothing committed. Written after the harness uplift
(`harness-capability-curve-uplift-2026-10-30.md`, all six stages implemented, uncommitted) and EXTENDS it:
the event sink, RunState, judge registry, eval lane, canary override, memory lifecycle, workflow table and the
research-mcp tools built there are the carriers this plan rides. Nothing here builds a second one.

Source: `transcript_dd9e736d-eb47-4d9f-9c56-f3befe670c49.json`, Riley Brown, "My AI Setup Feels Like Cheating
(Here's All of It)", 31 min, YouTube captions. A practitioner's account of an agent stack, not an engineering
talk: the value is in the OPERATING PATTERNS it shows working end to end and in the one problem it names as
unsolved (centralized memory across agent platforms). Marketing claims in the talk (follower counts, dollar
spend, "feels like cheating") are not evidence and are not used.

Unified Vision phases advanced: (2) collect from the cached second brain and reuse it; (5) anti-RAG retrieval
on every desk, now including the platform agent; (6) ONE routing authority, now including the orchestrator;
(7) gated self-improvement, now including skill promotion across surfaces; (8) runtime-filled, componentized
artifacts. Meta-principle honored: CONVERGE (one skill registry, one memory API, one orchestrator contract),
DELETE (stale platform-agent model and dead skill packages), GATE (skills and memory admitted through the
existing gates), SCHEDULE (memory lifecycle pass, skill audit).

---

## PART 1. What the transcript teaches, as methods and constructs

Each item names the construct, the talk's own evidence (timestamps), and the HiC mapping Part 2 audits.

**T1. The coordinator session.** One orchestrator thread ("Claude Projects: editor", "Dot" in Codex) receives
the ask and spins sub-sessions, choosing per task whether it runs locally (needs the user's machine and files)
or in the cloud (does not), without the user naming the choice (01:00-05:30, 06:38-08:16, 16:14-18:28). The
orchestrator keeps a visible thread list with location markers and routes new asks to an EXISTING thread when
one fits ("sent to an existing thread", 02:38). Construct: a coordinator that owns a thread registry, a
placement policy (local vs remote), and idempotent routing to the thread that owns a job. HiC mapping: the
platform agent (`mcp-services/agent/app.py`) and the proxy job queue (`/api/jobs`).

**T2. Voice-first iteration on a rendered artifact.** Open the artifact, speak the change, the agent revises
(04:40-05:20); the S1 deck was built from a phone in three spoken prompts (08:49-10:40). Construct: a short
dictation-to-revision loop over the artifact that is on screen. HiC mapping: the slide card's Edit flow
(`CorpusChatPanel.tsx:995-1022`) and the deckAsk card; no speech input anywhere in the SPA.

**T3. Visualize anything.** A dense PDF (the S1) or spreadsheet becomes a deck with "where the money goes",
revenue retention, risks and a data appendix, organized the way the user always organizes (09:01-10:40).
Construct: upload -> structured visual deck with the user's standing structure applied. HiC mapping: `#slides`
over uploads with the deck-composer archetypes; the "how we normally organize" part is a persisted preference.

**T4. Design mode -> options -> implement.** "Create a Figma-style design board, as many options as you want,
select one, push it to the app" (10:42-11:27). Construct: a design surface that produces alternatives, a human
pick, then an implementation session. HiC mapping: the Designer desk (`design-desk/`) and `#proto`.

**T5. Skills and plugins centralized in ONE place and carried to every agent platform** ("agent passport",
22:27-27:00). Composio holds the apps (30 connectors), custom tools (a user-built "native note" tool, created by
asking an agent), and 20 skills; every agent platform mounts the one integration; a new platform gets every
skill and plugin on day one; the agent used the centralized Slack and Gmail tools, not the platform's built-in
ones (24:39-25:04). Construct: skills and tools as a portable registry with ONE mount point, not per-platform
copies. HiC mapping: `.claude/skills` (86 packages) served to the SPA at `/skills/` and read by Claude Code;
`hic-workspace/skill-manifest.json` (31 runtime entries); the platform agent has NO skills; research-mcp, the
Claude Code MCP server and NXT-Agency's CX tools each describe tools separately.

**T6. The unsolved problem: centralized memory.** Every platform keeps its own memory of the user; switching
platforms loses it; an external memory (Supermemory via Composio) did not update often enough to make the
hand-off seamless (27:01-28:00). Construct, as the talk frames the requirement: one memory store, written
frequently by every agent, read by relevance by every agent, so a session on platform B picks up what platform
A learned. HiC mapping: `memoryLifecycle.ts` + `synthesis/memory-facts.json` (now admitted and retrieved by
relevance, WS-6) for the SPA; Claude Code's own memory directory (218 files, this machine) for the coding
agent; the platform agent's `conversations` dict (in-memory, lost on restart); the wiki second brain; four
stores, no shared API.

**T7. Agent-to-agent delegation by webhook.** A Claude Code session fires a "grokbot webhook" skill; the other
platform starts working and returns a report; the user never opens the second platform (28:46-29:58).
Construct: an inbound, authenticated trigger that starts a bounded job and reports back. HiC mapping: the proxy
has `/api/jobs` (op allow-list) but no inbound webhook, no outbound "report back", and no signed trigger.

**T8. Computer use for the last mile.** Publishing to YouTube: analyze the transcript, drive the browser, fill
the fields, pull the sponsor link from email, save as draft, message the user to review (19:04-19:45).
Construct: computer use ending in a human review step, never an unreviewed publish. HiC mapping: NXT-Agency's
Playwright computer-use tool (`NXT-Agency/backend/app/tools/computer_use.py`) and noVNC viewport.

**T9. Version control for generated media** ("GitHub for video": every version keeps its prompts and files;
fork, share, publish; agent and editor agnostic, 13:14-14:12). Construct: artifacts as versioned, forkable
records that carry the prompts and inputs that produced them. HiC mapping: AIR records (`*.air.json`) carry
prompt, trace, payload and post-chain; no lineage, fork or version chain between AIRs.

**T10. One morning routine over email and messages by voice**, with the agent filtering first (21:21-22:27).
Construct: inbox triage as a ranked read-out with dictated replies. HiC mapping: out of HiC's scope as a
research tool; in scope for the platform agent only as a pattern (ranked read-out of what changed overnight:
runs, verdicts, proposals).

### 1D. What the talk teaches that the earlier two did not
The Anthropic and Google talks were about the loop inside one agent (evals, judges, verification tools,
memory layers, self-evolution). This one is about the SURFACE AROUND the agents: one orchestrator the human
talks to, portable skills and tools, memory that must survive a platform switch, delegation across agents,
and artifacts as versioned records. It also shows why the harness plan's WS-6 memory work matters: the one
thing a heavy daily user could not solve is the thing HiC now has a lifecycle for but exposes to only one
of its four agents.

---

## PART 2. Audit of HiC against the ten constructs (code-verified 2026-10-31)

### 2.1 Skills (T5): 86 packages, four readers, no single registry, 27 unreachable from code
- `.claude/skills/` holds 86 skill directories (`check:skills` counts 90 packages including sub-skills under
  `diagrams/` and `brands/`); `hic-workspace/skill-manifest.json` lists 31 runtime entries of which 26 map to
  a directory; `journey-illustrator` is listed but its directory is `diagrams/journey-illustrator`. 14 skills
  have no `version`; 6 carry stale model references (`critic-revise-loop` 13 mentions of Sonnet 4.6 / Fable /
  Opus 4.8; `long-running-service-call` 4; `brief-dialog`, `meta-themes`, `mind-map-architect` 2 each;
  `verbalized-sampling` 1). No skill carries a SkillOpt `<!-- SLOW_UPDATE_START -->` protected block, so the
  proposer's protection rule (`run-skillopt.py` ANALYST prompts) protects nothing.
- 27 skills are referenced by no code path, no manifest entry, no agent and no CLAUDE.md; 25 of them are
  reachable only through the `ask-hic` router text (`analyst-chat-formatter`, `deterministic-naming-pass`,
  `evidence-density-pre-checker`, `fallback-event-surfacing`, `theme-yield-guarantee`,
  `topic-cluster-to-theme-converter`, `source-yield-scorer`, `nano-banana-diagram-composer`,
  `nxt-humans-slides`, `nxt-slot-illustrator`, the eight prompt-engineering utilities, ...), and two by nothing
  at all (`commit-prepare`, `hic-rebuild-verify`, `questionnaire-author` which `check:skills` reports the router
  never mentions). `check:skills` itself reports 72 warnings: 60 descriptions over the 300-char routing budget
  (the longest 968 chars), 8 descriptions with angle brackets, 2 references to files that do not exist
  (`exemplars/behance/_raw_index.json`, `inspiration-hub/ai-patterns/_catalog.json`), 1 unreferenced resource.
- Four readers, four contracts: the SPA fetches `/skills/<id>/SKILL.md` through Vite/nginx (`vite.config.ts:30-33`,
  `corpusChatService.ts:2538-2600`) and the manifest from `/hic-workspace/skill-manifest.json` (`:6522`);
  Claude Code reads the same directories through its skill loader; the proxy gates writes (`/api/skill/write`,
  `_review_skill_content` at `proxy/app.py:14243-14277`); the platform agent (`mcp-services/agent/app.py`) has
  no notion of skills at all, and NXT-Agency describes its own CX tools (`backend/app/tools/cx_services.py`)
  with their own descriptions. The transcript's construct (one mount, every platform) does not exist: a skill
  improved by SkillOpt for the SPA never reaches the platform agent.

### 2.2 Shared memory (T6): four stores, one lifecycle, no API
- The SPA: `synthesis/memory-facts.json` through `memoryLifecycle.loadFactStore/saveFactStore` (admission,
  staleness, consolidation, eviction) and, since WS-6, `chatInsightMemory.admitChatInsight` writes and
  `memoryRetrieval.selectMemoryFacts` reads by relevance. The file does not yet exist on disk (no run since the
  WS-6 code landed), so the first admission creates it.
- Claude Code: `C:\Users\...\.claude\projects\d--NXT-HUMANS-AI-CX-WORKBENCH\memory\` holds 218 files and a
  MEMORY.md index; HiC cannot read it and it cannot read HiC's facts. The UserPromptSubmit hook
  (`inject_active_constraints_and_patterns.py`) reads the wiki files directly from disk (patterns by relevance
  since WS-6, winning constraints) and nothing else.
- The platform agent: `conversations: Dict[str, Conversation] = {}` (`agent/app.py:83`), in-memory, lost on
  restart; `Conversation` carries messages, active tools, file mappings (`:59-65`); no long-term memory; the
  default model is `claude-3-7-sonnet-20250219` (`:38`, `docker-compose-all.yml:46`), two generations behind the
  routing authority's Opus 5.5.
- NXT-Agency: its own PostgreSQL (`nxt-agency-db`), separate from everything above.
- The wiki itself is the fifth store (138 curated pages, 1,198 raw, `wiki/index.md`), with `mentors/` holding
  one page and `known-gaps/` only a README. There is no `/api/memory/*` on the proxy (`grep` finds none), so
  the only way into the fact store is the SPA's wiki read/write path. The transcript's unsolved problem is
  HiC's exact state: one lifecycle, several agents, no shared door.

### 2.3 Second brain (T3, T9, the Karpathy principle)
- The wiki is the second brain the vision names (principle 8). The cross-engagement pattern page has one
  section group; the compiler needs five engagements with frontmatter per type and industry to produce a real
  pattern (`wikiCompiler.ts:567-596`); `mentors/` has one page (`munger-inversion.md`); `known-gaps/` is empty.
  Relevance gating (WS-6) stops the wrong patterns from being injected; it does not make the brain grow.
- Artifacts: 860 AIR records on disk carry prompt, model trace, payload, post-chain verdict and, since WS-5,
  the epoch id. They carry NO lineage: a revision ("edit this slide", the deckAsk "narrow" follow-up, the
  parity re-ask) emits a new AIR with no `parentArtifactId`, so the "every version keeps its prompts and files;
  fork and share" construct (T9) is half present (the record) and half absent (the chain between records).
  `artifactAirService.ts` has no version, parent or fork field (`grep` confirms).
- Reuse at generation: `loadGenerationContext` reads frameworks, anti-patterns, benchmarks, brand, the
  relevant pattern sections and now the relevant facts; the Analyst grounding block injects them
  (`corpusChatService.ts` wiki generation context block). The platform agent reads none of the wiki.

### 2.4 Orchestration (T1, T7)
- The platform agent is the only coordinator: Launchpad proxies a WebSocket to `agent:8500` (`launchpad/app.py:70-71,
  552-597`); the agent fans tool calls to five MCP wrappers (`tool_services`, `agent/app.py:92-104`), one of
  which (`openai_journey`) has no service and fails discovery at startup. It has no thread registry, no
  placement policy, no routing of a new ask to the thread that owns the job, and it keeps conversations only in
  process memory. Since WS-6, `research-mcp` exposes `run_deliverable`, `get_job`, `get_run_state`,
  `list_artifacts`, `get_run_telemetry`, so the agent CAN drive HiC; nothing yet drives the agent from outside.
- Inbound delegation: the proxy accepts jobs only from the SPA and the token-holding MCP wrapper; there is no
  webhook endpoint, no signed trigger, no callback. A Claude Code session that wants a HiC deliverable can call
  the research-data MCP server (`.claude/mcp-servers/research-data-server.py`, 6 collection tools, `hic-research-data`
  v3.0.0) for collection only; it cannot ask for a deck.
- The `parallel-deliverable-runner` agent (`.claude/agents/parallel-runner.md`) describes fan-out in prose for
  Claude Code sub-agents; the runtime fan-out lives in the proxy job store. Two orchestration descriptions, no
  shared contract.

### 2.5 Voice, design mode, computer use (T2, T4, T8)
- No `SpeechRecognition`, `MediaRecorder` or `getUserMedia` anywhere in the SPA, the design desk, the
  Launchpad or the NXT-Agency launchpad (`grep` over all four returns nothing). `voiceAddendum.ts` is the
  WRITING voice (the human-voice-editor skill), not speech.
- The Designer desk exists (`design-desk/`: `DesignDesk.tsx`, `chatToFreeform.ts`, `chatToSlideSpec.ts`,
  `ArtifactViewer.tsx`) and `#proto` builds from the pattern catalog; "several options, pick one, implement" is
  partly there (verbalized sampling produces candidates for themes and titles) but no desk offers N design
  alternatives as selectable boards that then drive a build.
- Computer use exists in NXT-Agency (`tools/computer_use.py`, Playwright Chromium, screenshots, forms; noVNC on
  6080) and reaches the CX services by MCP (`cx_services.py:77-80`); it does not end in a review step and it does
  not know about HiC runs or artifacts.

### 2.6 Verdict
| Construct | HiC today | Gap class |
|---|---|---|
| T1 coordinator with thread registry and placement | platform agent, in-memory, no registry, stale model | architecture |
| T2 voice iteration on the artifact | none | enhancement |
| T3 visualize anything with standing preferences | `#slides` over uploads; no standing-preference memory applied | second brain |
| T4 design options -> pick -> implement | Designer desk + #proto; no option boards | enhancement |
| T5 one skill/tool registry mounted everywhere | four readers, 27 unreachable skills, 72 lint warnings, platform agent has none | audited skills |
| T6 shared memory across agents | one lifecycle, four stores, no API | shared memory |
| T7 agent-to-agent webhook with report-back | none | architecture |
| T8 computer use ending in review | NXT-Agency has the tool, not the review step, not HiC awareness | architecture |
| T9 versioned, forkable artifacts | AIR records without lineage | second brain |
| T10 ranked morning read-out | none (pattern only) | enhancement |

---

## PART 3. The uplift: workstreams, carriers, evidence gates

### WS-A. Audited skills: one registry, one audit, one mount (T5)

| # | Change | Carrier | Evidence gate |
|---|---|---|---|
| A1 | ONE skill registry generated from the directories: `scripts/build-skill-registry.mjs` reads every `SKILL.md` frontmatter (name, invocation, version, category, triggers, composes_with, thinking, status) and writes `hic-workspace/skill-registry.json`; `skill-manifest.json` becomes a VIEW of it (runtime entries = `invocation: runtime` + the deliverable kinds), not a hand-kept copy; `check:skills` fails on drift between the two | `scripts/check-skills.mjs`, `hic-workspace/skill-manifest.json`, `corpusChatService.loadSkillManifest` | `check:skills` PASS with 0 drift; `journey-illustrator` resolves to its real path |
| A2 | The audit becomes a GATE: `check:skills` turns the 72 warnings into fixes or failures. Descriptions trimmed to the 300-char routing budget (the body carries the detail); angle brackets removed; the two dead resource references fixed or dropped; every skill gets `version` and `invocation`; the six stale model references rewritten to the routing authority's names (`claudeModelPolicy.CLAUDE_REASONING_MODEL`) or to "the reasoning model" with no literal id; a `status: active|dormant|deprecated` field; dormant skills (the 25 reachable only through `ask-hic`) are either given a real caller or marked `dormant` with the date, and `ask-hic` routes to `questionnaire-author` | `.claude/skills/*/SKILL.md`, `scripts/check-skills.mjs` | 0 warnings; no stale model id in any SKILL.md (test); every manifest id has a directory |
| A3 | SkillOpt-ready skills: every `invocation: runtime` and `model` skill that SkillOpt may train (the batch's KINDS map plus the quality enhancers) gets a `<!-- SLOW_UPDATE_START/END -->` block around its contract section (triggers, output contract, hard rules), so the proposer can edit the method and never the contract; `run-skillopt.py` refuses a skill without the block when `--pool` runs | SKILL.md files, `run-skillopt.py` | the pool test on a skill without the block is refused with the reason |
| A4 | The passport: `research-mcp` gains `list_skills` and `get_skill` (registry + body), and the platform agent loads the registry at startup and installs the `runtime`/`model` skills whose `executionContext` names the agent as SYSTEM-PROMPT skill packages (the same text the SPA injects), so a skill promoted by SkillOpt reaches every agent the next turn; NXT-Agency's `cx_services.py` reads tool descriptions from the registry instead of its own copies | `mcp-services/research-mcp/app.py`, `mcp-services/agent/app.py`, `NXT-Agency/backend/app/tools/cx_services.py` | the agent's system prompt lists the same skill versions `check:skills` reports; a skill edit lands in both within one restart |
| A5 | Skill usage telemetry: every skill injection records `skill:<id>@<version>` as a RunStep (SPA) or a sink event (agent), so the audit can retire a skill nobody has used in 60 days by data, not by grep | `runState.recordStep`, `_telemetry_event` | `/api/telemetry/events?kind=skill` lists usage per skill |

### WS-B. Shared memory: one API, every agent writes and reads it (T6)

| # | Change | Carrier | Evidence gate |
|---|---|---|---|
| B1 | ONE memory API on the proxy, over the existing fact store and lifecycle rules: `GET /api/memory/recall?objective=&kind=&limit=` (relevance ranking, the Python twin of `selectMemoryFacts`), `POST /api/memory/admit` (ProposedFact[] + run_id; the proxy applies the admission gate: category, scope, confidence floor, PII redaction unless the retention flag, dedupe with provenance union, capacity eviction), `POST /api/memory/forget` (the WS-6 endpoint renamed in), `GET /api/memory/facts`. The SPA's `memoryLifecycle` IO switches to these endpoints (the pure functions stay the ONE rule set; the proxy imports them by porting `admitFacts` + `evictToCapacity` faithfully and the parity test pins both) | `proxy/app.py`, `services/memoryLifecycle.ts`, `services/chatInsightMemory.ts` | TS/Python parity test over the same fixtures; one fact admitted by the SPA is recalled by the agent |
| B2 | Every agent on the door: the platform agent calls `recall` at the start of each conversation turn (objective = the user's message + active engagement) and `admit` after a completed tool chain (what the tools established, typed `knowledge`, scope `engagement`); research-mcp exposes `recall_memory`/`admit_memory` so Claude Code sessions use the same store; the Claude Code hook calls `recall` when the proxy is up (file read stays the offline fallback); NXT-Agency gets the same two calls in its agent engine | `agent/app.py`, `research-mcp/app.py`, `inject_active_constraints_and_patterns.py`, `NXT-Agency/backend/app/agents/engine.py` | a fact admitted in the SPA appears in the next agent turn's prompt (smoke test through MCP) |
| B3 | Write FREQUENTLY, the talk's missing piece: admission happens at every settled step, not at session end: after each artifact ships (the deck's thesis and the open findings as `knowledge`/`correction`), after each `deckAsk` choice (`correction`), after each approved plan review (`goal`), after each accepted epoch (`behavior`), with `sourceRunIds` carrying the run. The lifecycle pass (staleness, consolidation) runs on the proxy's daily cadence beside the rescore loop | `corpusChatService.ts`, `emitDeliverable.ts`, `proxy/app.py` | `memory-facts.json` grows by typed facts across a live run; the daily pass writes its report |
| B4 | Standing preferences as memory (T3's "how we normally organize"): the deliverable-shape preferences a user repeats (section order, density, brand, "data appendix at the end") are admitted as `preference` facts scoped `user` and injected ahead of generation; the request-plan card shows which preferences applied | `chatInsightMemory.ts`, `corpusChatService.ts`, `CorpusChatPanel.tsx` | a stated preference in run N shapes run N+1 without being restated (test with a fixture store) |
| B5 | Claude Code's own memory is NOT merged (different owner, different contract); instead the hook recalls HiC memory and `MEMORY.md` keeps pointing at project notes. Documented boundary, no sync job | docs | n/a |

### WS-C. Second brain that grows and remembers lineage (T3, T9)

| # | Change | Carrier | Evidence gate |
|---|---|---|---|
| C1 | Artifact lineage: `ArtifactAIR` gains `lineage: { parentArtifactId?, rootArtifactId, revision, reason }`; every revision path (slide Edit, deckAsk narrow/guide, parity re-ask, copy-critic edits, repair) emits the child with its parent; `/api/air/list` returns the chain; the Analyst panel shows "v3 of 3, from v2: narrowed scope" on the deck | `artifactAirService.ts`, `emitDeliverable.ts`, `corpusChatService.ts`, `proxy/app.py` | every revised deck in a live run has a parent; the list endpoint walks the chain |
| C2 | Fork and share: `POST /api/air/fork {artifactId}` copies the record as a new root with `forkedFrom`; the export carries the lineage in the PPTX notes (first slide) so a shared file names its source run | `proxy/app.py`, `gold_pptx_export.py` | a fork exports with its provenance line |
| C3 | The brain grows on schedule: the daily proxy pass runs the wiki compiler's pattern step when five engagements share a type/industry, files a `known-gaps/` page from the eval lane's recurring failure kinds (the frontier set's `origin.note`), and the `mentors/` lens set is extended only through the gated skill path (no auto-written mentor pages) | `proxy/app.py`, `wikiCompiler.ts`, `evals/` | `known-gaps/` carries real pages derived from frontier cases; patterns compile when the threshold is met |
| C4 | Reuse receipt: the reply's request-plan card lists what the second brain supplied this turn (pattern sections, facts, preferences, known gaps) so reuse is visible and correctable | `CorpusChatPanel.tsx` | the card shows the names; a wrong recall is correctable in one click |

### WS-D. Orchestration: one coordinator contract, delegation in and out (T1, T7, T8)

| # | Change | Carrier | Evidence gate |
|---|---|---|---|
| D1 | The platform agent becomes the coordinator the talk shows: a THREAD REGISTRY (`hic-workspace/agent/threads.json`: id, title, engagement, job ids, location local|cloud, status), persistence of conversations to disk (the `conversations` dict is lost on restart today), routing of a new ask to the thread that owns the engagement or job, and a placement policy: proxy jobs run "cloud" (the containers), computer-use tasks run "local" (NXT-Agency's browser), named in the thread list | `mcp-services/agent/app.py`, `launchpad/app.py` (thread list UI) | a second ask about a running deck lands in the same thread; threads survive an agent restart |
| D2 | The agent's model and routing converge on the ONE authority: `ANTHROPIC_MODEL` default and compose value move from `claude-3-7-sonnet-20250219` to `CLAUDE_REASONING_MODEL`'s value, read from the proxy's `/api/models` (new, serving `claudeModelPolicy` + `aiRouter` seats) so no service hard-codes a model id; `openai_journey` is removed from `tool_services` | `agent/app.py:38`, `docker-compose-all.yml:46`, `proxy/app.py` | the agent's `/health` reports the authority's model; startup logs no dead service |
| D3 | Inbound delegation (T7): `POST /api/webhooks/run` on the proxy, HMAC-signed with a per-source secret, body `{op, body, callback_url?}` limited to the `_JOB_OPS` allow-list; it queues the job and, when the job finishes, POSTs the result summary (artifact id, launcher url, verdict) to the callback; research-mcp's `run_deliverable` and a Claude Code skill `hic-run` use it. No callback, no secret, no job | `proxy/app.py`, `.claude/skills/hic-run/SKILL.md`, `research-mcp/app.py` | a signed call starts a job and the callback receives the report; an unsigned call is refused |
| D4 | Computer use ends in review (T8): NXT-Agency's computer-use tasks that would publish or send finish with a `review_required` state the Launchpad shows (screenshot + proposed action), and the agent waits for the human; the task record goes to the event sink | `NXT-Agency/backend/app/tools/computer_use.py`, `agents/engine.py`, `launchpad` | no publish-class action completes without the review state (test) |
| D5 | One orchestration description: `.claude/agents/parallel-runner.md` is rewritten to describe the proxy job store and the workflow table (the runtime fan-out), not a separate scheme | `.claude/agents/parallel-runner.md` | the agent text names the real carriers |

### WS-E. Enhancements the talk shows paying off (T2, T4, T10)

| # | Change | Carrier | Evidence gate |
|---|---|---|---|
| E1 | Voice on the two composers: a dictation button (Web Speech API where available; the Video Transcription service's Whisper endpoint as the fallback for recorded audio) on the Analyst composer and the slide Edit box; dictated text goes through the same send path, nothing else changes | `CorpusChatPanel.tsx`, `SlideCanvas.tsx`, `internal-solutions-video-analyzer` | a dictated revision reaches `sendChatMessage` unchanged (test with a stubbed recognizer) |
| E2 | Option boards on the Designer desk: `#design options:3` produces three composed alternatives (verbalized sampling over layout, not copy) rendered side by side; "use option 2" pins it as the `#proto` / `#slides` design direction (a `preference` fact, scope `engagement`) | `design-desk/`, `prototypeBuilder.ts`, `chatInsightMemory.ts` | the chosen option drives the next build; the choice is recalled next run |
| E3 | The morning read-out (T10, for HiC's own state): `GET /api/digest` composes what changed since the owner's last session (runs, verdicts, open deckAsk cards, pending epoch proposals, paused loop, rescore failures) from the event sink and RunState; the Launchpad and the Analyst landing bar show it; research-mcp exposes `get_digest` so the platform agent can read it aloud | `proxy/app.py`, `App.tsx`, `research-mcp/app.py` | the digest lists the overnight rescore and the pending proposals |

### Sequence and gates
1. WS-A first (A1-A3 are the preconditions for everything that mounts skills elsewhere); gate: `check:skills` 0 warnings, registry drift 0.
2. WS-B (B1-B3) and WS-D (D1-D2) in parallel; gate: the parity test and the MCP smoke test (a fact admitted in the SPA recalled by the agent).
3. WS-C and A4-A5; gate: lineage on every revised artifact in a live run.
4. WS-D3-D5, WS-E; gate: the signed webhook round trip; the review state on a publish-class action.
Every stage: `npx tsc --noEmit`, `npx vitest run`, `npm run eval`, `check:judges`, proxy tests in the container, then the idle-check deploy and a live measurement before the next stage.

### DELETE list (no-debt)
- `claude-3-7-sonnet-20250219` as the platform agent's model (D2).
- `openai_journey` in `tool_services` (D2).
- Per-platform tool descriptions in `NXT-Agency/backend/app/tools/cx_services.py` once the registry serves them (A4).
- Hand-maintained `skill-manifest.json` entries once it is generated (A1).
- Dormant skills with no caller after the 60-day usage window (A5), through the gated path, with the date.

### REJECT list (do not adopt from the talk)
- A third-party "passport" SaaS holding the platform's API keys or skills: keys stay in the root `.env` and
  reach providers only through the proxy chokepoint (WS-0 of the harness plan); the registry is a file in
  the repo served by HiC's own surfaces.
- Delegating research to an external social-platform agent for its data access: HiC's collectors and the
  research-data MCP server are the sourced path; an external agent's output has no manifest provenance.
- Voice as the primary interface for deliverable generation: dictation is an input method on the composers,
  nothing more; the citation contract, gates and cards do not change.
- "Fully edited by AI" publishing without review: every publish-class computer-use action ends in a review
  state (D4).

---

## PART 4. Owner decisions

1. Memory ownership: the proxy becomes the memory server for every agent (B1). Alternative: keep per-agent
   stores and sync nightly. Recommended: the proxy; one door, one rule set.
2. Retention default for memory across agents: redact person names unless the engagement flag is set
   (current WS-6 default) or keep names by default inside the owner's own machine. Recommended: keep the
   redaction default; the flag is one call.
3. Dormant skills: mark and keep (dated) or delete after the 60-day window. Recommended: mark now, delete
   through the gated path when the usage sink shows zero.
4. The platform agent's model: the routing authority's reasoning model for every turn, or Flash for plain
   chat and the reasoning model when a tool chain runs. Recommended: the authority's seats as they are
   (Flash for plain chat, Opus 5.5 for artifacts), read from `/api/models`.
5. Inbound webhooks: enabled by default with a generated secret, or disabled until the owner creates one.
   Recommended: disabled until a secret exists (no secret, no endpoint).
6. Voice: Web Speech API only (browser-dependent) or also the Whisper fallback through the Video Transcription
   service. Recommended: both; the fallback is one existing endpoint.
7. Computer-use review: a review state for publish-class actions only, or for every action that leaves the
   platform's own services. Recommended: everything outbound.



---

## PART 5. HANDOFF: instructions for the successor who implements this plan (written 2026-10-31)

Read this part first. It records the state the predecessor left the platform in, how to verify that state before changing anything, the order to build in, the gates every stage must pass, and the pitfalls that cost the predecessor time.

### 5.1 State at handoff

- The harness plan (`plans/harness-capability-curve-uplift-2026-10-30.md`, WS-0..WS-6) is fully implemented, deployed to the local Docker stack, and live-tested through the UI at :5011 on 2026-10-31. Its PLAN STATUS section carries the live results. Build on it; do not re-implement any of it.
- NOTHING IS COMMITTED. The working tree holds the whole harness implementation plus this plan. The owner approves every commit explicitly. When approval comes, stage by workstream, build, test, then commit with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never merge to main, never push to the NXT-Humans origin.
- Branch: `hic-clarification-and-ledger-2026-08-26`. Branch from it, never from main.
- Running containers that matter here: `research-proxy` (:5012, multi-worker uvicorn, auth default-on), `hic-research` (:5011, nginx static dist), `research-mcp` (:8507, six real tools), `agent` (:8500), `launchpad` (:8000).
- Proxy auth: every worker shares ONE published token. It is written by the first worker to win the lock file `hic-workspace/.runtime/config.json.lock` and read by the others. The SPA fetches it from `/config.json` at boot (`bootProxyConfig()` in `index.tsx`, which now runs BEFORE token hydration). Scripts and curl read it from `humans-in-control-research/hic-workspace/.runtime/config.json` (key `proxyToken`) and send it as the `x-proxy-token` header. The bundle carries no API keys; provider egress happens only through the proxy.
- CORS: `PROXY_CORS_ORIGINS` env, defaulting to the local origins when unset or empty. A 401 now carries the CORS header for allowed origins, so the browser shows the real status instead of a CORS error.
- Memory facts live in `hic-workspace/memory/memory-facts.json` (admission gate in `services/chatInsightMemory.ts`, retrieval in `services/memoryRetrieval.ts`). Refusals and render notices are excluded from admission since 2026-10-31. `POST /api/retention/forget-memory {"contains": "..."}` removes a bad fact.
- The event sink is `hic-workspace/telemetry/events.jsonl`; verdicts are `evals/verdicts.jsonl`; `evals/judges.json` lists 21 judges (`check:judges` PASS).

### 5.2 Verify the deployed state before touching anything

Run these in order and stop on the first failure; fix the environment, not the plan.

```bash
# idle check: never rebuild under a live session
TOKEN=$(python -c "import json;print(json.load(open('humans-in-control-research/hic-workspace/.runtime/config.json'))['proxyToken'])")
curl -s -H "x-proxy-token: $TOKEN" http://localhost:5012/api/jobs      # expect {"running":[]}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5012/api/jobs # expect 401
curl -s http://localhost:5011/config.json | head -c 200                 # token served to the SPA
curl -s http://localhost:8507/health                                     # research-mcp: six tools, both upstreams connected
cd humans-in-control-research && npm run typecheck && npx vitest run && npm run eval && npm run check:judges
docker compose -f docker-compose-all.yml exec research-proxy python -m pytest -q proxy/tests   # ws0/ws2/ws5/ws6/layout
```

Then load :5011 in a real browser (Playwright MCP works), open a session, send one plain question and one `#slides` request, and confirm 0 console errors. The `[composer] text cut to fit` warnings on restored old slides are expected signal, not errors.

### 5.3 Build order (binding) and what "done" means per stage

Follow PART 3's sequence. Each stage ends with the full gate set in 5.4 AND an idle-check deploy AND a live measurement through the UI before the next stage starts.

1. WS-A (A1-A3) first. Done when `check:skills` reports 0 warnings and 0 drift between `skill-registry.json` and `skill-manifest.json`, `journey-illustrator` resolves, no SKILL.md names a literal model id, and `run-skillopt.py --pool` refuses a skill without the SLOW_UPDATE block with a reason.
2. WS-B (B1-B3) and WS-D (D1-D2) in parallel. Done when the TS/Python memory parity test passes on shared fixtures, a fact admitted in the SPA is recalled in the platform agent's next turn through MCP, threads survive an agent restart, and the agent's `/health` reports the routing authority's model with `openai_journey` gone.
3. WS-C and A4-A5. Done when every revised deck in a live run has a `lineage.parentArtifactId`, `/api/air/list` walks the chain, and `/api/telemetry/events?kind=skill` lists per-skill usage.
4. WS-D3-D5 and WS-E. Done when a signed webhook round trip completes and an unsigned call is refused, a publish-class computer-use action ends in `review_required`, dictated text reaches `sendChatMessage` unchanged, and `/api/digest` lists the overnight rescore and pending proposals.

Carry the owner decisions in PART 4 as written unless the owner overrides them in the session: proxy as the memory server, redaction default kept, dormant skills marked not deleted, authority seats read from `/api/models`, webhooks disabled until a secret exists, voice with both paths, review for everything outbound.

### 5.4 Gates (every stage, no exceptions)

- `npm run typecheck` (tsc, rc 0). Vite build does not type-check.
- `npx vitest run` (2272 passing at handoff; the count only goes up).
- `npm run eval` and `npm run check:judges`.
- Proxy pytest inside the container.
- Deploy only after the idle check. `up -d --force-recreate research-proxy`, then `up -d --build research-generator`, then `up -d research-mcp` and `restart agent`. Hard-refresh :5011.
- Live measurement through the UI as a human user, with the console open. HTTP 200 is not verification.
- Record results in this plan's IMPLEMENTATION RECORD (add it under PART 5 as "5.6 Implementation record") with file:line carriers and the measured numbers, the way the harness plan does.

### 5.5 Pitfalls the predecessor hit (save yourself the hour)

- A project hook blocks any Bash command whose TEXT matches an individual-service start, including a grep for the word "uvicorn". Grep for something else, or read the file with the Read tool.
- Chained `sleep N; ...` in Bash is blocked. Use the Monitor tool (`docker compose ... logs -f research-proxy | grep --line-buffered ...`) or `run_in_background`.
- Heredoc appends to markdown silently drop content on this Windows Git Bash. Write the block to the scratchpad with the Write tool and append it with a short Python script.
- Playwright: clicking long-named buttons by accessible name fails; use `browser_evaluate` with a `querySelector` and `.click()`.
- Multi-worker proxy: anything written at startup must be per-pid tmp plus atomic rename, and shared state (the token) must go through the lock file. A second worker racing the first produced ephemeral tokens and 401s on every other request before the fix.
- `request-plan`: `useOnlyProvidedContent` is honored only when the turn carries an attachment (`hasAttachment`). Without the guard, "ground every slide in the corpus" was read as "use only provided content" and the deck lost the corpus.
- `StepEnvelope` carries `.value`, not `.data`. `artifactChain` output must include `dag`.
- The ChangeStrip banner's "N constraints active" counts ledger lines, not active records (47 candidate rows, 0 active at handoff). Fix it to read active records when WS-B touches that panel; it is cosmetic, not a gate.
- Open items from the live UI test are listed under "LIVE UI TEST 2026-10-31" in the harness plan's PLAN STATUS: the missing `slideVisionCritic` rows in the verdict store, the Playwright page crash on this large session, the chain-vs-loop layout disagreement. Take them before WS-C (lineage touches the same AIR and verdict paths).
- Twelve defects were found live and fixed in that test (token sharing across workers, CORS defaults, boot order, request-plan attachment gate, memory admission guard, proxy self-calls and sandbox token, conversation cache breakpoint, deck-loop verdicts to the eval store, run-record persistence retries, tool-aware status label, interceptor-before-boot, unit tests leaking POSTs to the live proxy). Each has a test; read the list before assuming a symptom is new.
- A burst of 401s on `/api/eval/verdicts` in the proxy log while you run `npx vitest run` means the vitest network guard in `design-desk/__fixtures__/vitest.setup.ts` was bypassed (a test replaced `globalThis.fetch` with a real one). Unit tests never reach the proxy.
- Claude 4.6+/5.x rejects `temperature`, `top_p`, `top_k`, thinking budgets, forced `tool_choice` and prefill with a 400. The proxy and `aiRetryClient` normalize bodies; do not add those fields anywhere new.
- No em dashes in any generated output or chat reply; the Stop hook enforces it on replies too.

### 5.6 Implementation record

Implemented 2026-10-31 by the successor session (Opus 5.5), all five workstreams. NOTHING IS COMMITTED; the owner
approves every commit. Branch `hic-clarification-and-ledger-2026-08-26`.

**Corrections to the handoff (5.1) found while implementing.**
- The memory fact store is `hic-workspace/wiki/synthesis/memory-facts.json`, not `hic-workspace/memory/memory-facts.json`.
- The Launchpad chat does NOT talk to the platform agent: in `docker-compose-all.yml` the Launchpad `AGENT_URL` /
  `AGENT_WS_URL` point at `nxt-agency-backend:8000`. The plan's audit missed it. The Launchpad now also has
  `PLATFORM_AGENT_URL=http://agent:8500` for the ONE thread registry; both coordinators report into it.
- NXT-Agency's CX tools called MCP tool names that do not exist (`search_reddit`, `analyze_social`, `transcribe_video`);
  they are now bound to the declared tools (`reddit_search`, `social_topic_model`, `video_transcribe_youtube`) with the
  declaration's description and required parameters (`McpBoundTool`, `NXT-Agency/backend/app/tools/cx_services.py`).
- The ChangeStrip "N constraints active" count now reads active records (`services/learningEngine.ts getRecentImprovements`).

**Two live-data hazards found and fixed (not in the plan; both caught by the live checks).**
1. Importing `proxy/app.py` from a test ran `_write_runtime_config()` against the LIVE bind-mounted
   `hic-workspace/.runtime/config.json`. A host-side run with auth disabled published an empty token; the next import
   minted a new one. From 16:46 UTC every SPA, agent and MCP call got 401 until the proxy restarted. Fix: the test suite
   gets its own runtime dir (`proxy/tests/conftest.py`, `HIC_RUNTIME_BASE`, honored by `_runtime_base_dir()`,
   `proxy/app.py:318`), and `_write_runtime_config()` (`proxy/app.py:386`) never publishes an empty token. Test:
   `proxy/tests/test_runtime_config_guard.py` (2). A full container suite run leaves the config hash unchanged.
2. `test_ws5_loop` never redirected `_EVALS_DIR`, so `_rescore_recent` wrote its fixture summary over the day's real
   `evals/results/_rescore-<day>.json` (the digest then reported artifacts `a0`..`a4` in run `r`). Fix: `HIC_EVALS_DIR`
   (`proxy/app.py:14056`) set by the conftest; the leaked file moved aside, and the real 24 h rescore re-run through
   `POST /api/eval/rescore` (2 artifacts, 1 failure, from live records).

**WS-A audited skills** (deployed and live-verified in stage 1, before this record).
- A1 registry: `scripts/skill-registry-lib.mjs` (206 lines), `scripts/build-skill-registry.mjs` (`npm run build:skills`),
  generated `hic-workspace/skill-registry.json` (94 skills) and `skill-manifest.json` (30 runtime entries, generated;
  the hand-maintained entries are gone). All 93 + 1 new SKILL.md files are valid YAML with version and status.
- A2 audit gate: `scripts/check-skills.mjs` rewritten on the lib: 0 errors, 0 warnings, 3 info.
- A3 SLOW_UPDATE: 13 trainable skills carry the block; `scripts/run-skillopt.py` refuses a skill without it (exit 3;
  LIVE: `--pool` run against every one of the 81 skills without the block: 81 refused with the reason, exit 3, none
  proceeded; all 13 skills with the block parse as protected by the gate's `slow_update_blocks`);
  `proxy/tests/test_skillopt_protection.py` (3).
- A4 passport: `GET /api/skills/registry` (`proxy/app.py:15164`), `/api/skills/{id}`, research-mcp `list_skills` /
  `get_skill`; the platform agent mounts `surface=platform-agent` skills (`mcp-services/agent/hic_door.py SkillMount`).
- A5 usage: `services/skillUsage.ts` (RunStep `skill:<id>@<version>` + telemetry kind `skill`), `GET /api/skills/usage`.
  Live: `/api/telemetry/events?kind=skill` lists per-skill rows (wiki-synthesizer, wiki-query-expander).
- Dormant (marked, not deleted, `dormant_since: 2026-10-31`): nxt-humans-slides, diagnose-prompt, drift-check,
  escape-audit, failure-log, score-prompt, self-review, stress-test, trim-prompt.

**WS-B shared memory.**
- B1 the door: `proxy/memory_store.py` (578 lines, port of memoryLifecycle/memoryRetrieval, pinned by
  `evals/fixtures/memory-parity.json`); routes `GET /api/memory/recall` (`proxy/app.py:4774`), `POST /api/memory/admit`
  (4804), `/forget` (4848), `GET /api/memory/facts` (4868), `/lifecycle` (4970); daily lifecycle loop.
- B2 every agent: SPA (`services/memoryLifecycle.ts`, `chatInsightMemory.ts`, `secondBrainPass.ts`), platform agent
  (`hic_door.recall/admit`), NXT-Agency (`app/hic_bridge.py`), research-mcp (`recall_memory`, `admit_memory`), Claude
  Code (`.claude/hooks/scripts/inject_active_constraints_and_patterns.py`, proxy first, file fallback).
- B3 frequent admission: `services/memoryAdmissions.ts` (artifact shipped, deckAsk choice, plan approved, epoch
  accepted, preference stated).
- B4 standing preferences: injected ahead of artifact turns (`services/corpusChatService.ts:4415`).
  LIVE DEFECT FOUND AND CLOSED (fifth pass): the executive-search rule "always put the methodology appendix at the end
  of every deck for the executive search work" (fact `fq6cq0d`, scope user) was applied to a Northeastern co-op deck;
  selection looked at the deliverable kind only. `preferenceAppliesTo` (`services/memoryAdmissions.ts`) now reads the
  condition from the preference's own words: "for this engagement / client / project" holds only in the engagement
  where it was stated; "for the executive search work" or "for Northeastern clients" holds where the current
  objective or engagement slug names that work (any named alternative suffices); a rule with no such clause, or one
  that names no particular work ("for client work", "for every claim"), holds everywhere. LIVE on the rebuilt bundle:
  the Northeastern deck turn logged no standing preference and its receipt lists none; the executive-search deck turn
  logged "[memory] 1 standing preference(s) applied for slides" and the pinned direction.
- B5 boundary (documented, no sync job): Claude Code's own memory (`~/.claude/projects/.../memory/`) is the
  developer's notebook about building HiC; HiC memory is the product's memory about engagements. Claude Code READS HiC
  memory through the UserPromptSubmit hook (live: the hook recalled the agent's `get_job` fact this session) and writes
  through research-mcp `admit_memory` when work establishes an engagement fact. Nothing copies one store into the other.
- LIVE: a preference stated in the SPA ("From now on, always put the methodology appendix at the end of every deck for
  the executive search work", dictated, see E1) was admitted as fact `fq6cq0d` (user scope, surface spa); the platform
  agent's next turn ("Where should the methodology appendix go in decks for the executive search work?") recalled it
  through `/api/memory/recall` (`surface=platform-agent`) and answered "The methodology appendix goes as the final
  closing slide at the end of every strategy deck generated for the executive search engagement." THROUGH MCP: asked
  to "use the research recall_memory tool", the agent executed `recall_memory` over JSON-RPC on research-mcp, which
  returned the SPA-admitted facts `fq6cq0d` (standing preference, score 0.64) and `fw4w9zc`.

**WS-C second brain.**
- C1 lineage: `services/artifactLineage.ts` (145 lines): root/child lineage, parent = newest AIR of the same type in
  the run (tab memory, then `/api/air/list?run_id&kind`), serialized per run+type. Revision is decided upstream, never
  by keywords: the request plan's `mode: 'edit'` (chat deck path, `corpusChatService.ts:4864`), `#refine` and the depth
  delta turn (`CorpusChatPanel.tsx:6505`). In-turn repairs that never shipped ride as `lineage.steps` (parity re-ask,
  source fill, `corpusChatService.ts:4724`). `emitAirRecord` attaches it (`artifactAirService.ts:337`). Proxy:
  `air_write` stamps `createdAtIso`; `GET /api/air/list` gains `run_id`, `kind`, `chain_of` and returns `lineage`
  (`proxy/app.py:5391`). Panel label "v2 of 2, from v1: <reason>" + Fork button (`CorpusChatPanel.tsx:8766`).
- C2 fork + provenance: `POST /api/air/fork` (`proxy/app.py:5413`); `_air_provenance_line` (5447) written first in the
  first slide's notes by `gold_pptx_export.stamp_provenance`; lifted slides carry `artifactRef`
  (`CorpusChatPanel.tsx:7957`) so the deck export names its source run.
- C3 brain growth: `proxy/brain_growth.py` (264 lines) + `_brain_growth_pass` (`proxy/app.py:5022`), daily loop and
  `POST /api/brain/grow` / `GET /api/brain/report`. Known-gap pages from the 188 frontier cases read with their AIRs:
  9 families filed (`known-gaps/failure-*.md`; `unrecorded` is marked `applies_to: harness` and never injected).
  ROOT CAUSE of "patterns never compile": `saveEngagementMemory` wrote no `industry`/`engagement_type` and headings
  ("Themes Found", "Personas Identified", "Recommendations Made") the compiler regexes did not match, so every
  summary reached the pattern step empty. Fixed at both ends (`wikiService.ts:1535` writes the keys via
  `industryTaxonomy.primaryIndustry`; `wikiCompiler.parseEngagementPage`, `wikiCompiler.ts:228`); the pass back-fills
  existing pages and reports groups due at five. `mentors/` is untouched (gated skill path only). LIVE: the daily loop
  ran at 18:28 UTC on its own: 9 known-gap pages written from 254 frontier cases, 3 engagement pages tagged
  `engagement_type: research`, `industry: higher_ed`; groups research/higher_ed 3 (a pattern compiles at 5) and
  strategy/higher-education 1 (`engagements/smoke-test.md`, a pre-existing smoke page with a hyphenated industry).
  ATTRIBUTION FIX (the 155 frontier notes reading "chainPass=false; chainTrace=[]"): the seeder read
  `qualityReport.chainTrace`, but the slide chain writes `postChain.chainTrace` and the HTML chain writes
  `postChain.htmlChain`. `brain_growth.air_attribution` / `attribution_note` read where the chains write; the seeder
  uses them for new cases and refreshes legacy notes (`refreshed_notes`); stage failures map to families
  (`STAGE_FAMILY`). LIVE: the rescore refreshed all 155 notes (0 empty-trace notes left, 156 attributed, e.g.
  "chainPass=false; failing: chain:titles partial (schema_invalid); chain:claims partial ..."); the brain pass now files
  16 attributed pages (claim-ledger, provenance, pointer-binding, grade, deck-quality, evidence-anchoring, ...) and
  retired its own `failure-unrecorded.md` (a generated page is removed when its family no longer occurs; a page
  without `source: eval-frontier` is only reported).
  DECK GROUNDING FIX (found on the live known-gap check): for `#slides` the deck-composer companions short-circuited the
  whole generation-context block in `corpusChatService.ts`, so decks never received remembered facts, pattern sections
  or known gaps; only the duplicated framework/anti-pattern pages are skipped now (test in `services/knownGaps.test.ts`).
  LIVE (final bundle `index-Bvj56LLg.js`, a `#slides` turn in the executive-search session): "[memory] 7 of 13 memory
  fact(s) relevant to the objective", "[memory] 4 known gap(s) for STRATEGY_DECK: evidence-anchoring, grade, deck-quality,
  claim-ledger", "wiki generation context injected (STRATEGY_DECK, framework=false, antiPatterns=false, facts=7,
  patterns=0, knownGaps=4)", then the standing preference and the pinned direction; the reply's request-plan card listed
  "Second brain supplied": the standing preferences, the four known-gap pages and the remembered facts with Forget
  buttons. The first run of this check logged two 404s: deck turns now load the generation context, whose first read
  of `synthesis/` and `engagements/` pages went to nginx, which denies those directories; `readWikiPage` now sends
  them straight to the authenticated proxy (`PROXY_ONLY_WIKI_DIRS`, parity with nginx.conf tested). The final deck turn
  logged zero console errors.
- Pattern compile: proven by `services/wikiCompilerPatterns.test.ts`, which runs the real `compileWiki({scope:'patterns'})`
  on five pages in the exact `saveEngagementMemory` format: it writes `synthesis/patterns/research-higher-ed.md` and the
  model prompt carries the parsed goals, themes, personas and recommendations (the pre-fix failure sent empty
  summaries); four pages compile nothing.
  CONSOLIDATION (found on the live check): the wiki held 50 engagement folders (`engagements/<slug>/` with manifest,
  themes, personas, recs written by `writeEngagementDeliverable`), but only 4 had the markdown page the pattern step
  reads, so the compiler saw 4 engagements instead of the portfolio. `brain_growth.engagement_page_from_folder` writes
  that page, in the `saveEngagementMemory` format, from the folder's own goal, themes (description or topic-model
  summary), personas and recommendations; never over an existing page, never for a merged folder, never without themes.
  LIVE: the brain pass consolidated 47 engagement pages (51 in total); research/higher_ed reached 21 engagements and was
  reported due; the SPA's compiler (`compileWiki({scope:'patterns'})` through `window.__hicSelfImprovement`) then logged
  "compiled pattern synthesis/patterns/research-higher-ed.md (21 engagements)" in 23 s. The page carries themes with
  their engagement counts (co-op placement navigation 15/21, CRM migration friction 11/21, ...), personas and gaps from
  those engagements, no em dashes; the next pass reports the group current (`pattern_exists: true, due: false`).
  READ-BACK (fifth pass): `compiledPatternFor` (`services/wikiService.ts`, called from `loadGenerationContext`) reads
  `synthesis/patterns/research-<industry>.md` for the objective's primary industry, keeps only the sections that share
  at least two salient terms with the objective (the same `rankSectionsByRelevance` gate as the cross-engagement page),
  prepends them labelled "Compiled from N prior <industry> engagements" and lists them in the reuse receipt; a retail
  objective never reads the higher-ed page (`services/wikiCompilerPatterns.test.ts`). The chat slice for patterns rose
  from 3,200 to 6,000 characters so the compiled sections are not cut. LIVE (Northeastern PRD session, `#slides #NU`
  two-slide decks): "[memory] 2 compiled pattern section(s) from synthesis/patterns/research-higher-ed.md relevant to
  the objective (Personas: 3 shared; Gaps: 3 shared)", then "wiki generation context injected (STRATEGY_DECK, ...,
  patterns=3, knownGaps=4)"; the reply's "Second brain supplied" card listed "research-higher-ed: Personas;
  research-higher-ed: Gaps; AI-Enabled Personalized Student Support and Co-op Matching". A second deck turn received
  "Recommendations: 6 shared; Gaps: 3 shared" and its card named them.
- C4 receipt: the request-plan card lists patterns, facts, preferences and known gaps supplied, with Forget buttons;
  `loadGenerationContext` now returns `knownGaps`/`knownGapRefs` (`wikiService.ts:2169`, `services/knownGaps.ts`).

**WS-D orchestration.**
- D1 threads: `mcp-services/agent/threads.py` (registry `hic-workspace/agent/threads.json`, conversations on disk,
  routing by job id then engagement); `/api/threads`, `/api/threads/report`; Launchpad thread panel with LOCAL/CLOUD
  badges (`launchpad/static/chatbot.js`). LIVE: after an agent restart both threads were listed; a new conversation
  asking "What came back from job_1793469929812_b20479a4?" was routed to the thread that owns that job
  (`routed: true`) and answered from `get_job`.
- D2 convergence: `GET /api/models` seats (`proxy/model_registry.py routing_seats`); the agent holds no key and no model
  id; `openai_journey` removed. LIVE `/health`: seats from the authority, skills_mounted {analyst-chat-formatter 1.1,
  human-voice-editor 1.0}, services reddit/social/journey/video/research/video_render.
- D3 webhook: `POST /api/webhooks/run` (`proxy/app.py:27304`), HMAC over "<ts>.<raw body>", 300 s window, cross-worker
  replay markers (`_webhook_first_use`, 27193), `_JOB_OPS` only, SSRF-guarded callbacks (`HIC_WEBHOOK_CALLBACK_HOSTS`,
  default `agent,nxt-agency-backend`), signed callback (`_job_callback_watch`, 27272); `callback_url` on `/api/jobs`
  and research-mcp `run_deliverable`; `scripts/webhook-secret.py`, `scripts/hic-run.py`, skill `hic-run`; the agent
  receives and verifies reports at `/api/webhooks/hic` (`mcp-services/agent/app.py:697`). No secret: 404.
  LIVE: unsigned 401, forged 401, stale 401, signed 200 (job queued, finished, signed report attached to the owning
  thread), replay 409. The first live run accepted a replay (per-process memory across uvicorn workers); fixed with
  on-disk markers before this record.
- D4 review: `NXT-Agency/backend/app/tools/review_gate.py`; every outbound state-changing computer-use action and
  network shell command waits for a human decision; Launchpad review card. LIVE GAP FOUND AND CLOSED: asked to click a
  link on example.com, the agent wrote `execute_python` instead of driving the browser, and code execution was not
  gated. Code that SENDS data out (HTTP writes, mail, sockets, scripted browser clicks or submits, network commands)
  now goes through the same gate (`code_needs_review`, `review_gate.py:91`; `code_exec.py` Python and JavaScript
  tools; the engine surfaces their reviews); reads stay free, the gate's existing rule. LIVE: "Use Python to send an
  HTTP POST ... to https://httpbin.org/post" opened the card "run python that sends data out: req =
  urllib.request.Request( url, data=data,"; Reject left it unperformed ("The request never actually reached
  httpbin.org") and the agent asked how to proceed. COMPUTER TOOL: with the steps spelled out (this backend's computer
  tool navigates when a `type` action's text is a URL), the agent opened https://example.com, took a screenshot, and its
  `left_click` on the link stopped at the card "left click at [640, 747] / https://example.com/" with the screenshot;
  Reject left it unperformed ("Rejected by the review gate before it could execute"). APPROVE PATH: the same request
  with Approve ran the click; the agent landed on IANA's "Example Domains" page. The event sink (kind computer_use) holds
  all three outcomes: python rejected, left_click rejected, left_click approved. The two Launchpad console errors
  on that run come from the noVNC viewer (:6080 `package.json` 404), not this work.
- D5: `.claude/agents/parallel-runner.md` rewritten around the job store, `run_deliverable`, the webhook, workflowTable
  and the artifact chain DAG.

**WS-E enhancements.**
- E1 voice: `services/dictation.ts` (Web Speech first; MediaRecorder clip to `POST /api/transcribe/dictation`,
  `proxy/app.py:5141`, which hands it to the Video Transcription service's Whisper pipeline), `components/DictationButton.tsx`
  on the Analyst composer (`CorpusChatPanel.tsx:9571`) and the slide title and imagery prompts in `SlideCanvas.tsx`.
  `ComposerTextarea` moved to its own module so the real composer is under test. LIVE: a scripted recognizer delivered
  one final phrase; the composer held it unchanged and Send posted it verbatim (one user bubble). The live run also
  showed the mode probe building a recognizer on every render (5 instances); the probe now checks the constructor only.
- E2 option boards: `#design options:N` (`design-desk/DesignDeskChat.tsx:370`), `services/designOptions.ts`,
  `design-desk/components/DesignOptionBoard.tsx`, `GET /api/design-tokens?format=css` (`proxy/app.py:7508`) so previews
  resolve token custom properties; registry entry `#design` (category edit-refine: no deliverable). The pick is an
  engagement-scoped preference fact read by the next `#slides` deck (`corpusChatService.ts:4428`) and `#proto` Stage 3
  (`prototypeBuilder.ts:1910`).
- E3 digest: `proxy/digest.py` (148 lines), `GET /api/digest` (`proxy/app.py:5261`), `POST /api/digest/seen`,
  research-mcp `get_digest` (plain text for read-aloud), Launchpad card (`launchpad/static/digest.js`, relayed through
  research-mcp), Analyst landing bar (`components/DigestBar.tsx`, `App.tsx:6836`).

**Gates (2026-10-31, re-run after the seventh pass).** `npm run typecheck` rc 0; `npx vitest run` 2336 passed,
1 skipped (229 files); `npm run eval` 425/425 (the set grows as live failures seed frontier cases); `check:judges`
PASS; `check:skills` 0/0; proxy unchanged since its 178-passed run below.
**Gates (2026-10-31, re-run in full after the sixth pass).** `npm run typecheck` rc 0; `npx vitest run` 2331 passed,
1 skipped (227 files); `npm run eval` 375/375 (the set grows as live failures seed frontier cases); `check:judges`
PASS (21 judges); `check:skills` 0 errors 0 warnings; proxy pytest in the container 178 passed, 2 skipped, 0 failed
(`.runtime/config.json` intact after the run: authed `/api/jobs` 200); research-mcp 4/4; platform agent 8/8;
NXT-Agency backend 9/9 (host). Earlier record of the same gates follows.
**Gates (2026-10-31, before the fifth pass).** `npm run typecheck` rc 0; `npx vitest run` 2327 passed, 1 skipped (227 files); `npm run eval` 257/257 (191 at the start of the session; the live rescore runs seeded real frontier cases, 188 -> 254);
`npm run check:judges` PASS (21 judges); `check:skills` 0 errors 0 warnings; proxy pytest in the container 172 passed,
2 skipped, 0 failed (the two `test_ingestion_generic_engagement` checks compare SPA sources: the proxy container now
mounts `components/` and `services/` read-only at `HIC_SPA_ROOT=/hic-spa`; a full run leaves `.runtime/config.json`
and `evals/results` unchanged); research-mcp 4/4; platform agent 8/8 (container); NXT-Agency backend 9/9 (host: the container mounts
only `backend/app`).

**Live UI results for C1, C2, E2 (2026-10-31, executive-search session, through the SPA as a user).**
- E2: `#design options:3 briefing for the managing partner on where AI fits in the executive search process #NXT`
  composed three directions in one Opus call (Process Strip Diagram fit 50%, Two Column Verdict 30%, Photo Lead Brief
  20%), previews rendered from the NXT token custom properties. "Use option 2" stored fact `fbxukoh` (preference,
  engagement scope, engagement slug from the Designer window's shared goal, `DesignDeskChat.tsx:650`; the Designer is a
  separate window, so its in-memory engagement was empty and the first build would have pinned it to no engagement).
  The board first rendered three 288px previews overlapping inside a 266px column; it now stacks in a narrow column and
  offers "Compare side by side" (window-wide overlay; live: two 560px cards side by side). Esc on the overlay used to
  reach the Design Desk's Esc-closes-the-window handler; the overlay now consumes it in the capture phase.
- The next `#slides` deck logged "[memory] 1 standing preference(s) applied for slides" and "[memory] pinned design
  direction applied to this deck"; its speaker notes read "The comparison sets AI-assisted and Partner-led side by
  side", the pinned layout.
- C1: the deck's reply showed "v1 of 1"; "#slides Revise the last deck: merge it into two slides ..." was read by the
  request plan as `mode=edit` and shipped as "v2 of 2, from v1: ..." (`slides_1793471135412`, parent
  `slides_1793470930453`); `/api/air/list?chain_of=` walked root -> v2 (v1 chain fail, v2 chain pass). The reason now
  prefers the plan's note over its scope (`corpusChatService.ts:4863`).
- C2: Export Deck PPTX sent `provenance {runId, artifactId: v2}`; slide 1's notes in the downloaded file begin
  "Source: HiC run analyze-the-executive-search-industry-..., slides slides_1793471135412; version 2 of chain
  slides_1793470930453; revised from slides_1793470930453 (...); generated 2026-10-31 18:25 UTC." with the original notes
  after it. Fork created `slides_1793471135412-fork-df73be50`; its export's notes name "version 1 of chain <fork>;
  forked from run ..., slides_1793471135412 version 2".
- E3: the Launchpad card and the Analyst landing bar both render (runs, verdicts, the rescore, agents); zero console
  errors. PENDING PROPOSALS LIVE: the daily 24 h window held 4 failures of 8 (threshold 5), so no proposal existed; the
  platform's own `POST /api/eval/rescore {"hours": 168}` found 22 failures in 38 artifacts over the week and wrote the
  propose-only proposal `prop_1793474680_1` ("Epoch 9 due: 22 artifact(s) failed rescoring in the last 168 h
  (threshold 5)"); nothing was planted and the owner can reject it. Both surfaces then led with "Needs you: 1 proposal
  to review."; after "Mark read" the rescore line dropped off and the pending proposal stayed.

**State left behind.** The test webhook secret (`platform-agent`) was revoked after the round trip, so
`/api/webhooks/run` answers 404 again (owner decision 5); create one with `scripts/webhook-secret.py create <source>`
when the owner wants delegation on. Pre-existing console errors on the Designer's first load (not from this work): a
sandboxed `about:srcdoc` frame blocking a script, and a 404 for `/assets/nxt-logo-black.png`.

**Open items for the successor.**
- `prop_1793474680_1` is a real pending proposal from the one-week rescore; it waits for the owner's review (accept or
  reject from the digest). It is the owner's decision, not an implementation gap.
- `engagements/smoke-test.md` (a 2026-05-22 test page, engagement_type strategy) uses `industry: higher-education`,
  outside the taxonomy; it belongs to no pattern group either way.
- Proxy worker death, investigated (sixth pass). Event: uvicorn 0.32's supervisor killed worker [8] at 19:41:25 while
  the 371-turn Northeastern session had a 521,808-character Gemini precompact call on that worker (the SPA retried it
  at 19:41:26 on another worker) and a session autosave in flight (ERR_EMPTY_RESPONSE; the next autosave succeeded).
  The supervisor kills a worker when its pong thread cannot answer within 5 s, which needs the interpreter lock held
  that long, or a process already dead. Ruled out: a native crash or OOM kill (the WSL2 kernel log, readable from
  2026-10-29, has no segfault, OOM or protection-fault line; the container has no memory limit); the session save
  (a replay of its exact steps on a copy of the 166 MB session, in a dot-folder the session list skips, then
  removed, took 4.3 s with the lock never held longer than 0.67 s). Not reproduced in three later heavy deck turns
  in the same session. Instrumented permanently: `_loop_stall_watchdog` (`proxy/app.py`, startup hook) re-arms
  `faulthandler.dump_traceback_later` from the event loop every 0.5 s; faulthandler's watchdog is a C thread that
  needs no lock, so any stall over HIC_LOOP_STALL_DUMP_SEC (default 2 s) prints every thread's stack to the container
  log ("Timeout (0:00:02)!"), and a recurrence names its own line right before "Child process [N] died".
  What the watchdog found and what was fixed (each live-verified by the dump count of a heavy deck turn in that
  session, 21 -> 5 -> 2, zero worker deaths):
  * `session_save` parsed, merged, serialized and wrote the whole session on the event loop (4.3 s per autosave of
    this session); the work runs in a thread (`_session_save_sync`).
  * `GET /api/jobs` (the idle check and job polls) read and parsed all 791 job files, 55 MB, on the loop (2.9 s);
    a file untouched for longer than _JOB_STALE_S plus 30 s cannot hold a fresh heartbeat and is skipped unread, and
    the scan runs in a thread (a stat of every file still costs 1.4 s on this Windows bind mount). Live: 1.1 s, no
    dump.
  * The local embedder is a blocking 2-3 s HTTP call: `/api/embed` (14 dumps in one turn), `chunks-by-goal` and
    `wiki/fetch-articles` now call it through `asyncio.to_thread`; the chunks-by-goal sqlite-vec KNN too
    (sqlite3.threadsafety is 3, serialized, so the shared connection is safe across threads).
  * `skill_list_versions`, `wiki_list`, `wiki_read_batch` (synchronous tree scans, no awaits) are plain `def`
    handlers, which FastAPI runs in its threadpool.
  Tests: `proxy/tests/test_session_save_offloop.py` (6: save contract and thread, bad bodies, job scan skip, embeds
  and search never on the loop, threadpool handlers, watchdog re-arm). Remaining dumps on the last turn: one
  `manifest_chunk_pointers -> _manifest_load`, one with no app frame. If the worker death recurs, read the dump that
  precedes it.
- Request-plan decision missing its 15 s budget on the 371-turn session (fallback reading on every turn): ROOT CAUSE
  FOUND AND FIXED (seventh pass), measured in the browser with Playwright request timing and a CDP CPU profile.
  Three causes, in the order they were peeled off:
  * ~300 identical GETs on session load (every GenerationReceipt fetched /api/skill/list-versions and
    quality-scores.md, every FeedbackWidget /api/feedback/index) held the browser's six proxy connections; the
    request-plan call never left the browser (requestStart -1, aborted). `services/sharedGet.ts` (one request per URL
    within a window, failures not remembered, a feedback write clears the index) used by `GenerationReceipt.tsx` and
    `feedbackService.readFeedbackIndex`.
  * Every load re-generated 22+ persona portraits at once: the restore re-lift (`CorpusChatPanel.tsx`, raw
    `:::slide` copies of each reply) started portraits even when the processed deck with its portraits was kept and the
    raw copy dropped. Portraits now go only to re-lifted slides that entered the deck without one, once state settles.
    Live: image calls on load 26 -> 0. `listEngagementManifests` (Knowledge Library aggregator and resume panel both
    read all 58 manifests on load) shares one pass within 30 s: 116 -> 58 reads.
  * The request then left at once (requestStart 2 ms) and the proxy answered in 6.0 s, but the fallback still fired
    14 s later, at the same instant as three unrelated responses: the main thread was frozen. CPU profile: 8.9 s of
    native `fetch` self time under the session autosave; `saveSession` handed fetch the 171 M-character snapshot as a
    string (state.slides holds 160 data-URI images, 158 MB, 104 MB unique, almost all in `composerPayload`), which the
    browser encodes on the main thread (11.0 s and 11.6 s freezes in 30 s). Bench in the page: string body 2.2 s sync,
    Blob build 0.39 s plus fetch 1 ms. `sessionBody()` (`services/sessionService.ts`) sends a JSON Blob.
  LIVE after all three: "[request-plan] (model) ..." 7 s after the send; no autosave freeze after the send.
  Tests: `services/sharedGet.test.ts` (3), `services/sessionBody.test.ts` (2).
  Left, outside this plan: the initial render of this 371-turn session still freezes the page 5-6 s several times
  before the first send; 1,209 slides with inline images are the next thing to move out of session state (upload
  each unique image once, keep a reference).
- Nothing is committed; commits wait for the owner's approval.
