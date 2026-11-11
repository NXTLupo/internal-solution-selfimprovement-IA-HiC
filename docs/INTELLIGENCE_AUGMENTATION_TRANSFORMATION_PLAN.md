# Intelligence Augmentation Transformation Plan

**From a suite of eleven apps to one personal agent with a specialist team behind it.**

**Written for:** the owner, and the engineer or agent who executes this plan.
**Dated:** 2026-11-10. **Branch:** `ia-personal-agent-2026-11-10`, cut from
`hic-clarification-and-ledger-2026-08-26` at `1412a4f6c`. Nothing in this plan is committed; the
owner approves every commit.
**Companion document:** [PLATFORM_ARCHITECTURE_SUCCESSOR_GUIDE.md](PLATFORM_ARCHITECTURE_SUCCESSOR_GUIDE.md)
is the record of what is implemented today. This plan cites it as "Guide N.N" and does not repeat it.

---

## 0. The decision in one page

**Stop shipping apps. Ship one agent.** A person talks to one agent, in plain language, about one
engagement. The agent remembers the engagement, plans the work, hands it to a team of specialists
that the person never has to address, checks what comes back, and returns finished, editable,
cited deliverables. Every capability the suite has today (research collection, clustering and
sentiment, themes, journey mapping, social analytics, decks, reports, prototypes, images, video,
audio, exports) survives as a tool or a specialist. None of it survives as a separate destination.

Five structural changes carry the whole plan. Everything else is detail.

1. **One front door.** Today a user can start work in eleven different user interfaces and four
   different agent systems (Section 2.1). The target has one: a conversation with the agent, with a
   canvas beside it for the artifact in progress.
2. **The brain moves out of the browser.** The generation engine is 117,165 lines of TypeScript
   in 249 files that run inside a browser tab (Section 2.2). An agent cannot keep working after the tab closes,
   cannot run two deliverables for two people, and cannot be scheduled. The engine is lifted,
   mostly unchanged, into a server-side worker.
3. **A team with typed handoffs.** The four agent systems that exist today do not share code, only
   doors (Guide 5). The target has one orchestrator and a fixed roster of specialists that
   coordinate through persisted, validated artifacts, never through free chat between agents.
4. **Verification that reads the artifact.** The automated gates passed every artifact the owner
   rejected (Guide 0.1). Thirty percent of generated artifacts pass the post-generation chain, and
   the prose judge passes one hundred percent of them (Section 2.3). The target separates the
   producer from an independent verifier, checks citations against resolvable sources, samples what
   the gates did not flag, and turns each owner rejection into a label.
5. **Memory with a system of record.** The second brain is 23,838 wiki pages plus a flat store
   capped at one hundred facts (Guide 6). The target keeps the wiki as the system of record, adds
   an engagement workspace as a first-class entity, indexes facts by entity with provenance, and
   consolidates outside the write path so that consolidation can never destroy evidence.

**What this plan does not do.** It does not rewrite the generation engine, replace the design
system, weaken a gate, or add a fifth agent framework. The platform's own meta-principle
(CONVERGE, DELETE, GATE, SCHEDULE, do not build new) governs: of the nine phases in Section 8,
seven are convergence or deletion.

**The first three moves, in order** (Section 8 has the rest):

| # | Move | Why first |
|---|---|---|
| 1 | Freeze a measured baseline and a capability parity ledger on this branch | Without it, "all current functionality" is a claim nobody can check |
| 2 | Route every chat surface to one agent runtime that can already call every existing tool | Delivers the personal-agent experience over today's engine, with no engine change |
| 3 | Lift the engine into a server-side worker and delete the second, weaker engine | Unlocks background work, scheduling, parallel specialists and the team |

---

## 1. Evidence base

Every number in this plan was read or measured on 2026-11-10. Nothing is recalled from older
documents.

### 1.1 What was read

| Source | How it was used |
|---|---|
| Successor guide, 2,669 lines, all sections | The implementation record; the owner complaint record in 0.1 is this plan's acceptance bar |
| The working tree | Counts, routes, tool lists, catalog entries, the job store, the browser coupling of the engine |
| `hic-workspace/telemetry/events.jsonl` and eight `usage.jsonl` ledgers | Cost, cache ratios, run durations, gate pass rates (Section 1.2) |
| `.claude/research/new_enhancementss_instructions_HiC.pdf` | The owner's twelve change areas from a colleague's real workflow; Section 9.2 maps each one |
| `.claude/research/FEEDBACK ON TOOL.pdf` | A real fabricated-citation incident; it sets the sourcing rule in Section 6.5 |
| Twenty-four distinct research papers in `.claude/research/` | Section 4 decides which matter and what each one changes in this plan |
| Live web research, November 2026 | Section 3, with sources listed in Appendix A |
| REA (Reverse Engineer Anything), run live against four competitor web clients | Section 3.3; evidence bundle recorded in Appendix B |

### 1.2 The measured baseline

Measured from the event sink and the usage ledgers, 2026-10-31 to 2026-11-10 (eleven days).

| Measure | Value | Source |
|---|---|---|
| Model calls recorded | 1,924 | `usage.jsonl` across 8 sessions |
| Total model spend | USD 120.41 | same |
| Share of spend on `claude-opus-5-5` | 84% (213 calls, USD 100.79) | same |
| Opus cost per call | median USD 0.27, 90th percentile USD 1.22, max USD 1.89 | same |
| Cost per run id (38 runs) | median USD 1.98, 90th percentile USD 6.06, max USD 30.71 | same |
| Prompt-cache read share, Opus | 0.69 | cache-read tokens over cache-read plus input |
| Prompt-cache read share, Gemini 3.5 Flash | 0.04 (1,550 calls) | same |
| Prompt-cache read share, Gemini 3.1 Pro | 0.05 (152 calls) | same |
| Length of a work burst (model calls with no ten-minute gap) | median 555 s, 75th percentile 816 s, 90th percentile 1,693 s, max 5,254 s | 57 bursts over 5 s |
| Artifacts passing the post-generation chain | 28 of 94 (30%) | `post_chain` events |
| Lowest-passing chain judges | provenance 0.39, evidenceSlots 0.41, grade 0.48, bindPointers 0.52, claims 0.54 | 87 verdicts each |
| Prose judge pass rate | 1.00 (87 of 87); mean prose score 0.97 | `chain:prose` verdicts |
| Lexical judge pass rate | 0.98 | `chain:lexical` verdicts |
| Human labels recorded | 1 | `label` events |
| Skills that fired at least once | 9 of 90 (58 skill events; `deck-composer` 22 of them) | `skill` events |
| Turns taken by the platform agent | 3 | `agent_turn` events |
| SkillOpt full batch | 9 skills, 680 optimizer calls, 72 candidates, 0 promoted | Guide 9.2 |
| Deliverable quality census | `#prd` 0.92; `#strategy-slide` 0.71; `#journey` 0.39 with 20 failures in 21 runs | Guide 9.2 |

Four of these rows carry most of the argument, so they are stated plainly here and used later.

- **The gates and the owner disagree.** The prose judge passed every artifact in eleven days. The
  owner rejected artifacts in that same window as "AI slop" and "jibberish" (Guide 0.1). A judge
  that never fails is not measuring what the reader experiences.
- **The loop that is supposed to calibrate the judges has one label.** A language-model judge may
  block only after thirty human labels and a kappa of 0.4 (Guide 9.3). One label exists.
- **The personal-agent surface exists and is unused.** The platform agent has taken three turns.
  Work happens in the browser application, by hashtag.
- **Most of the skill library is idle.** Nine of ninety skills fired.

### 1.3 The acceptance bar

Three documents state what "good" means, in the owner's own words or a colleague's. This plan
treats them as requirements, not as background.

1. **Guide 0.1**, thirty dated complaints across output quality, imagery, latency, cost, quality of
   analysis and instruction adherence.
2. **The twelve change areas** from the colleague workflow review: a single end-to-end workspace,
   transcript intake with anonymization, explicit blend modes, latency, visual-by-default decks,
   blank-slide prevention, editable visuals, inline slide editing, export quality, free-form chat
   that modifies artifacts, writing that does not read as machine output, and text regeneration
   parity with image regeneration. The central sentence of that review is that the colleague leaves
   the tool for Claude because Claude "is more responsive to human interaction."
3. **The fabricated-citation incident.** A deck attributed quotes to a report that does not exist,
   to an asset-management summit in a hospitality deck, and to a bank-risk article in a private-club
   expense slide. The user's rule afterwards: every quote, named report or statistic carries a
   working URL, and a source must match the industry of the claim, not only the publisher's name.

Section 9 maps every item in these three documents to a phase and a measurable exit test.

---

## 2. Diagnosis

Stated as five structural facts, each measured. These are the conditions the architecture has to
change. They are not theories about why a specific artifact failed.

### 2.1 Eleven front doors, four agent systems, no agent

A person can begin work in any of these, and each one keeps its own state:

| Port | Surface | State it keeps |
|---:|---|---|
| 8000 | Launchpad dashboard and chat | threads, reviews |
| 5011 | HiC research application (Analyst Desk) | sessions, runs, artifacts, wiki |
| 5011 | HiC Design Desk (a separate window) | design directions, slide edits |
| 5050 | NXT Agency catalog | its own Postgres database |
| 3000 | Social Research | its own Postgres database with pgvector |
| 8080 | Journey Mapper | uploads volume, generated HTML |
| 5002 | Video Analyzer | jobs and transcripts on disk |
| 5010 | Character Generator | the browser's IndexedDB |
| 5013 | Copilot Recipe Generator | none |
| 5001 | Reddit Ripper | job files |
| 5014 | Presentation Renderer | none (renders a payload) |

Behind them sit four agent systems that share doors and no code (Guide 5): the platform agent,
the Claude Code skill and hook system, the `#proto` pipeline, and NXT Agency's control tower. The
Launchpad chat is wired to NXT Agency (`AGENT_URL=http://nxt-agency-backend:8000` in the compose
file), not to the platform agent, which is reachable only as `PLATFORM_AGENT_URL`.

The consequence is the workflow the colleague review describes: transcript into one tool, summary
into another, research goal into a third, deck prompt into a fourth, edits in PowerPoint. The
suite has the organs of a personal agent and no body.

### 2.2 The brain lives in the browser

`humans-in-control-research/services/` holds 249 source files and 117,165 lines (480 files and
141,932 lines with their tests). They run inside the user's browser tab. The server holds the provider door, the wiki, memory and export.

Three measured consequences:

1. **Headless work reaches a different, smaller engine.** The delegated path
   (`research-mcp.run_deliverable` to the job store) accepts four operations. The one that
   generates, `/api/artifact/generate`, is a separate generic HTML report generator on the
   structured model. It supports 13 kinds. The browser engine supports 39 catalog entries, the
   twelve-stage slide chain, the deck loop, the claim ledger and the prose signal. An agent that
   delegates a deck today does not get the deck the owner sees in the application.
2. **The platform violates its own one-engine rule.** The standing rule in the owner's memory is
   that all deliverables use one composer engine. Two exist.
3. **Nothing runs when the tab is closed.** Scheduling, parallel deliverables for two people and
   long background tasks all require a server-side engine.

The lift is feasible because the engine is almost free of browser dependencies. A scan of all 249
non-test files in `services/` (117,165 lines) for browser-only APIs (`window`, `document`, web
storage, `navigator`, DOM types, image and file readers) found **196 files with none** and 53 with
some, 185 references in total. Thirty-eight of those 53 have three or fewer. Only three files have
more than ten: `prototypeBuilder.ts` 27, `chunkLoadGuard.ts` 14 (a browser-only loader guard that
the worker does not need) and `improvementDiscriminator.ts` 13. The chains themselves are clean:
`artifactChain.ts` 0, `htmlArtifactChain.ts` 0, `aiRouter.ts` 0, `chunkRetrieval.ts` 3,
`corpusChatService.ts` 5, `slideToStageHtml.ts` 5, `geminiService.ts` 10. The engine already
reaches models through `fetch` to the proxy, which works identically from Node.

### 2.3 The gates measure what can be counted

From Section 1.2: a 30% chain pass rate, a prose judge at 100%, one human label. From Guide 9.2:
the SkillOpt text scorer gives the incumbent a size score of 1.00 by construction, size was the
only dimension that varied in six of nine pools, and zero of 72 candidates were promoted.

The platform's self-improvement loop is correctly gated and structurally unable to move: the
judges that could block are uncalibrated, the calibration data is one label, and the offline
scorer cannot prefer a candidate that adds an instruction. Meanwhile the lowest-passing judges
(provenance, evidence slots, pointer binding, claims) are the ones about grounding, which is the
same class of failure as the fabricated-citation incident.

### 2.4 Cost and time are concentrated, and the levers are known

Eighty-four percent of spend is Opus. A burst of work takes a median of nine minutes and a
ninetieth percentile of twenty-eight. Opus reads 69% of its prompt from cache; the Gemini seats
read 4% to 5%. Two sets of levers apply. The first is the model set itself: the owner's matrix of
2026-11-10 (Section 6.10) moves research, search, classification and small tasks off the reasoning
seat, and none of its models is in the routing registry yet. The second is how much context each
call carries, how many calls a task takes, and whether a person has to wait for the whole task
before seeing anything (Section 6.7).

### 2.5 Memory has no engagement, and facts have no index

The colleague review asks for "a persistent engagement workspace." The engagement entity was
deferred in the August program (the `engagement.json` item). Today an engagement is implied by a
session slug, a wiki page and a set of runs. The shared fact store is a flat list capped at one
hundred facts. Two recorded incidents follow from missing namespaces: theme quotes from other
engagements appeared in a Northeastern deliverable (Guide 0.1, 2026-10-02), and an executive-search
preference reached a Northeastern deck before a scoping fix.

### 2.6 Debt that the transformation should retire, not carry

From Guide 11: four services outside the model policy (one writes retired model ids into
deliverables users build against), a silent stub that returns empty strings on a merge path, an
abandoned 26,383-line fork, a legacy tree that still injects a provider key into browser HTML, four
orphan MCP wrappers, a 28,459-line proxy file with 221 routes, and the one cross-service coupling
that parses rendered HTML (Miro from Journey Mapper). Each has a named disposal in Section 7.

---

## 3. The market, November 2026

### 3.1 Personal agents

| Product | What defines it | What this plan takes |
|---|---|---|
| **Meta Muse** (launched 2026-09) | A dedicated virtual machine per user with its own browser; a separate security agent, Sentinel, kept apart at the system level, gating outbound access; credentials used without being seen; a complete audit trail of what it did and plans to do; asks before sensitive actions; "keeps working after people close the app" and "comes back when something changes"; messaging-first, "no learning curve." Third-party reporting describes layered memory (a curated `MEMORY.md`, dated notes, semantic search over both), subagents, reusable skills, cron scheduling and event hooks | Policy enforced by a separate component in code, not by the worker's prompt. An audit trail the user can read. Work that continues when the window closes. A single conversational surface with no syntax to learn |
| **Manus** (now part of Meta) | A cloud sandbox per task; published context-engineering practice: treat cache hit rate as the primary production metric, keep context append-only and deterministically serialized, mask tools instead of removing them, use the file system as unlimited recoverable context, recite the plan in a todo file | The task workspace as files. Cache-stable prompts. Recoverable compression (keep the path, drop the body) |
| **Perplexity Computer** (2026-02) | One reasoning model orchestrates subagents and assigns each subtask to the model best suited to it; users can override the assignment; a Model Council mode runs models in parallel and shows where they differ | Per-subtask model seats behind one routing authority, which this platform already has. Council as a verification mode |
| **Genspark, ChatGPT agent, Claude Cowork** | A chat assistant with a cloud computer and scheduled tasks; Cowork runs both in the cloud and on the user's machine | The cloud and local split, which the platform's thread registry already tags (`cloud` or `local`) |
| **OpenClaw and Hermes Agent** (open source) | Persona and user files in Markdown; pluggable memory; many messaging channels. Hermes documents a closed learning loop: agent-curated memory, skills created after complex work, skills revised during use, full-text recall across sessions | Skills as procedural memory that improves from use. In this plan that improvement stays behind the existing gate |

### 3.2 The tools the suite's apps compete with

| Category | Leading practice in 2026 | Where this suite stands | What this plan takes |
|---|---|---|---|
| **Source-grounded research** (Gemini Notebook, formerly NotebookLM) | Studio outputs in one click; guided co-creation for decks and video; source-controlled deep research; cinematic video overviews | The owner's own head-to-head (Guide 0.1): this suite is ahead on citations and figure safety everywhere except the Data Table; Gemini is ahead on production polish and on one-click simplicity | One-click studio outputs driven by the agent. Keep the grounding lead and make it visible |
| **Enterprise research agents** (Microsoft 365 Copilot Researcher) | Critique: one vendor's model drafts and another vendor's model reviews for source reliability, completeness and evidence grounding. Council: two models each write a report and a judge shows agreements and differences | Critics exist but run on the same model family as the author | Cross-vendor review as the default for evidence-tier deliverables |
| **Journey management** (TheyDo) | An analyst agent answers plain-language questions over linked journey evidence; insight scoring; opportunity discovery; journeys built from uploaded transcripts and surveys | `#journey` is the worst deliverable measured (0.39) and is the only one that leaves the main engine | A journey is an evidence-linked object the agent can query and update, not a one-shot HTML page |
| **Research repositories** (Dovetail, Marvin) | Dovetail positions as customer intelligence across research, support, sales and survey data; Marvin ships a multi-agent Ask layer | The wiki already is the repository | An ask-anything layer over the second brain that cites passages |
| **Social listening** (Pulsar, YouScan, Sprinklr, Brandwatch) | The market splits into summary assistants, now standard, and goal-driven agents that plan and run the analysis | Social Research has a real classical stack (BERTopic, RoBERTa, aspect sentiment, pgvector) behind a separate application | The classical stack becomes a specialist's tools; the agent plans the analysis |
| **Deck generation** (Gamma, Alai, Genspark, Manus) | Reviews agree every tool still needs manual cleanup; web-first tools drift on export; research-first tools format poorly | Native editable PPTX from a geometry walk is a real lead (Gemini's export was fifteen full-slide images) | Keep native export as a differentiator. Close the gap on visual richness and inline editing |

**Four more products, from their own documentation, since their clients could not be inspected.**

| Product | What its documentation says | What this plan takes |
|---|---|---|
| **Gamma** | A public API and an MCP server: generate presentations, documents, webpages and social posts, then read, edit and export them; the generation endpoint is `POST /agent/generations` and accepts a `templateId`; in the product, the agent edits anything on the canvas from natural language and critiques a deck on demand | The agent's own tools are exposed the same way: generate, read, edit, export, each addressable, with a template id. "Critique my deck on demand" is an agent intent, backed by the Verifier |
| **Genspark** | Anthropic's customer study: a Super Agent orchestrating more than 150 tools, where the model writes the code that produces the final slides, sheets and documents; the 2026 Claw product runs on a dedicated cloud computer per user so work continues after the chat ends | Confirms the two central moves here: an orchestrator over many tools, and a server-side place where work continues. The platform's stage-HTML-to-native-PPTX path is the equivalent of "the model writes the code that makes the slides", with editability kept |
| **ChatGPT agent** | OpenAI's help page now says ChatGPT agent is no longer available and points to ChatGPT Work for multi-step tasks and finished deliverables. The retired agent ran in a virtual browser, paused for the user to take over at logins, and let a finished task be set to repeat, managed on one schedules page | A warning about building on a general browsing agent, and two details kept: hand the browser to the person at a login, and one page that lists every recurring task |
| **Claude Cowork** | Plugins bundle skills, connectors, commands and sub-agents for a job function; each scheduled task runs as its own session; Anthropic's support page says scheduled tasks run only while the computer is awake and the desktop app is open | The specialist definition in 6.2 is the same bundle (skills, tools, a role). The limit is the argument for a server-side runtime: schedules here must not depend on a person's laptop |
| **Gemini Notebook** (Google help) | Starter artifacts may be created automatically when sources are first added; with five or more sources it sorts them into labels; reports export to Docs and tables to Sheets with citations on a second tab; each generated item exposes the prompt that made it; a notebook cannot see other notebooks | On intake the agent proposes starter outputs instead of waiting to be asked; sources are grouped automatically; every artifact shows the request that produced it; and, unlike a notebook, engagements here can draw on the shared second brain when the person allows it |

### 3.3 What REA observed in competitor clients

REA was pointed at four live web clients through a headless browser. It parses shipped JavaScript
without executing it, so these are static candidates, not proof of server behavior.

**Perplexity (116 scripts analyzed).** The signed-out bundle declares the information
architecture of the Computer product as routes:

```
/computer/new   /computer/tasks   /computer/tasks/local-   /computer/memory
/computer/skills   /computer/plugins   /computer/connectors   /computer/gallery
```

Parameter names in the same bundle include `skillId`, `automationId`, `model_id`, `search_mode`
and `voice-mode`. Read as a product map, this is the personal-agent surface: tasks (cloud and
local), memory, skills, plugins, connectors, a gallery of results. Section 6.9 adopts the same six
panels, because they match what this platform already has behind eleven doors.

**Manus (95 scripts analyzed).** The application bundle exposes the client contract of a task
agent:

| Observed endpoint family | What it indicates |
|---|---|
| `createTaskDraft`, `getSessionV2`, `getSessionOutline`, `getSessionView(s)`, `getSessionFilesV2` | A session is a first-class object with an outline, multiple views and a file set |
| `startSandbox`, `getSandboxStatus`, `requestVncOtp` | One sandbox per session, viewable live |
| `scheduleTask` | Scheduled work is part of the core task interface |
| `getMapReduceTool`, parameters `isSubTask`, `subTaskType`, `cascadeJobId` | Fan-out to subtasks with a map-reduce shape |
| `taskReferenceId`, `taskQuoteId` | A new task can reference or quote an earlier one |
| `listMainModelCandidates`, `model_selector` | A user-visible model choice |
| `/api/desktop/skill-catalog`, `session-workspace/list`, `session-workspace/read`, `workspace-git-info` | A local workspace with a skill catalog and version control |
| `getOnlineMyBrowserClients` | The user's own browser as an execution target |
| `slideTemplateId`, `figma_import_url`, `design.colors`, `design.fonts` | Slides with templates and design parameters; Figma import |
| `notifier-v2-socket-io`, `voice-input.io` | Push notification and voice input channels |

**Gemini Notebook (11 scripts).** `notebooklm.google.com` now redirects to
`notebook.google.com/trynow`, which confirms the rename. Signed out, the client ships no
application routes or endpoints. This repeats the finding of 2026-11-03: its intelligence is
server-side, so parity work is behavioral, not a code port. The signed-in wire contract was
later read from an open-source client that documents it (3.5).

**TheyDo (143 scripts analyzed, 92 route patterns).** The journey-management leader's client
declares its whole object model as routes, under an organization and a workspace:

```
journey   persona   insight   insight/review-similar   opportunity   solution   metric
goal   challenge   framework/:framework/:board/:journey   collections   data-hub/source/:source
document   agent/routine/:agentRoutine   agent/skill/:skill   activity
settings: journey-templates, prioritization-scores, taxonomy (groups, statuses, types, tags), workflow
```

Operation names in the bundle include `AgentRoutinesForReviewCount`, `JourneyCreationStage`,
`OrganizationComputedScores`, `OrganizationInputScores`, `WorkspaceHasAiSkillsEnabled` and an
`agent-mcp` sign-in callback. Three things follow for this plan. A journey is one object in a
linked graph (insight to opportunity to solution to metric to goal), not a page. Their agent has
routines that queue for human review and skills that can be switched per workspace, which is the
same gate-and-skill shape this platform has. And prioritization is computed from stored scores,
not written as prose. Section 6.2 and Phase 6 adopt the linked-object model for the Journey
Cartographer.

**YouScan (153 scripts analyzed).** The social-listening client exposes
`/insights-copilot/ask` and `/insights-copilot/cancel`, `/query-assistant/v2/conversations`, a
themes family (`/themes/query/generate-name`, `/themes/query/snippets`, `/themes/preview`,
`/themes/query/v2/validate`), `/synthetic-audience`, `/social-search/wordcloud` and
`/social-search/statistics`, `/ai-summary/save`, and dashboards with per-widget editing and PDF
export. Read as practice: the analyst asks a goal-level question and can cancel it; a theme is a
saved query with a generated name and example snippets that is validated before it is kept; a
natural-language assistant writes the search query. The Analyst specialist takes all three: a
theme is stored with the query and snippets that define it, theme names are generated then
validated against the snippets, and long analyses are cancellable from the conversation.

**Dovetail.** The login client ships 24 scripts with no application routes; nothing useful was
observed.

**Claude and OpenAI desktop applications (installed on this machine).** Because the web clients
of Claude and ChatGPT could not be inspected, REA was run on the two vendors' installed desktop
applications instead, statically and without executing them. Both analyses hit REA's five-minute
limit and returned partial evidence, so only structure is reported. The Claude application
(version 4.23118) holds 892 relevant files and about 71 MB of script text, of which 543 files were
parsed: seven windows, 39 bridge interfaces between the page and the host, 186 message-passing
operations with 68 sender-validation checks, one utility process, and two background workers named
`file-index-worker` and `heavy-work-worker`. The OpenAI application bundles a terminal emulator
(`node-pty`) and a local database (`better-sqlite3`). Three practices follow, each matching a rule
this plan already takes from research: index the workspace in a background worker so the agent
does not search by listing (the harness-cost paper measured 57% to 89% of retrieval turns spent
searching); move heavy work off the interface thread (the owner's "could not type" complaint was
an eleven-second main-thread freeze); and validate the sender on every message between the
interface and the host, which is the code-level form of "limits live in code".

**ChatGPT web (31 script modules, 200 route patterns).** A plain request with an honest client
identity, no browser and no sign-in, was answered without a challenge, and the page names 31
script modules that the site serves publicly. They were downloaded and given to REA as a local
JavaScript application; REA reached its 300-second limit and kept partial evidence, so the route
list below was read from the same files by pattern. They are static candidates from the
signed-out bundle, as with the other clients.

| Routes declared in the client | What they show |
|---|---|
| `/space`, `/spaces/:spaceId`, `/space/files`, `/space/d/:directoryId`, `/space/browser/:url`, `/space/local-file/:path`, `/space/sites/*`, `/library/*`, `/projects` | The workspace is a place with files, folders, a browser, local files and published sites, separate from the chat list |
| `/tasks`, `/remote/:taskId`, `/remote-connections`, `/mission-control`, `/work` | Tasks are objects with their own pages and a control view, not messages |
| `/routines`, `/routines/:automationId`, `/scheduled`, `/scheduled/:automationId`, `/automations`, `/schedules` | Scheduled and standing work has its own area |
| `/skills`, `editor/:skillId`, `/plugins`, `/apps/:slug/:connectorId/connect`, `/settings/connectors`, `/settings/mcp-settings` | Skills are editable by the person; connectors and MCP servers are settings |
| `computer-use/messages`, `browser-use/history`, `browser-use/downloads`, `browser-use/passwords`, `browser-use/site-settings/*` | The agent's browser is a managed profile with its own history, downloads and site permissions |
| `/branch/:conversationId/:messageId`, `/f/conversation/resume` | Conversations branch at a message, and a generation can be resumed |
| `/settings/personalization`, `/meetings`, `/voice`, `/sites/:projectId`, `/shopping`, `/dots/approve`, `/elicitation` | Memory and voice settings, meeting capture, site publishing, and separate approval and question surfaces |

This matches Perplexity's and Manus's clients on the same four objects (workspace, task,
schedule, skill) and adds two that this plan now carries: a control view over all running tasks
(6.9) and branching a conversation at a message (6.3).

**Gamma, Genspark and Claude web clients.** Each returned a bot challenge to the headless browser, and the same plain request that ChatGPT answered was refused by all three with a challenge page.
A second attempt with a disguised browser identity was refused by this session's safety policy as
bot-check circumvention, which is the right outcome. Nothing was analyzed from the live clients.
The owner then pointed out the route this plan had missed: open-source clients and clones of
these products are public, and their source can be read directly. Section 3.5 does that.

The session model in the Manus contract (outline, views, files, sandbox, schedule, subtasks,
references) is the most useful single finding. Section 6.3 adopts it almost field for field,
because the platform already has the pieces: a job store with heartbeats, typed run state, a
thread registry, a computer-use sandbox with a live view, and a signed webhook.

### 3.4 Published engineering practice from the two closest systems

Read from the primary posts, not from summaries.

**Anthropic's multi-agent research system.** Token use alone explained 80% of performance variance
on its browsing benchmark, and tokens, tool calls and model choice together explained 95%. Agents
use about 4 times the tokens of chat and multi-agent systems about 15 times, which the authors say
makes them viable only for high-value tasks. Its effort rule: simple fact-finding is one agent with
3 to 10 tool calls; a comparison is 2 to 4 subagents with 10 to 15 calls each; complex research is
more than ten subagents. An early failure was "spawning 50 subagents for simple queries." Each
subagent needs an objective, an output format, guidance on tools and sources, and task boundaries;
vague instructions caused duplicated work. Parallel subagents and parallel tool calls cut research
time by up to 90%. Rewriting tool descriptions cut task time by 40%. About 20 real queries were
enough for early evaluation. A single judge call scoring factual accuracy, citation accuracy,
completeness, source quality and tool efficiency was closest to human judgment, and human testing
still caught what automation missed. In production the system resumes from the point of failure,
deploys gradually so running agents are not disrupted, and has subagents store outputs externally
and return references.

**Manus.** Cache hit rate is "the single most important metric for a production-stage AI agent";
its input-to-output token ratio is about 100 to 1 and a typical task makes about 50 tool calls.
Keep the prefix stable (a timestamp at the top of the prompt breaks the cache), keep context
append-only, serialize deterministically. Do not add or remove tools mid-task; restrict them by
state instead, helped by consistent tool-name prefixes. Compression must be restorable. Rewrite
the todo file so the goal stays at the end of the context. "Leave the wrong turns in the context":
erasing failures removes the evidence the model needs to adapt. And "the more uniform your context,
the more brittle your agent becomes": a batch of twenty similar items drifts into repetition unless
the format varies.

What this plan takes beyond Section 6: the effort rule is written into the agent's planner as
budgets per response class; the regression set starts at about twenty real requests, not hundreds;
failed steps stay in a task's event log and in the specialist's context; and batch work (twenty
slides, twenty personas) varies its framing to avoid the repetition the owner has seen as slide
sameness.

### 3.5 What open-source clients and clones show

The owner's correction on 2026-11-10: the blocked products have open-source clients and clones,
and one of them, `jacob-bd/gemini-notebook-mcp-cli`, is a reverse-engineered client for Gemini
Notebook itself. The owner said a copy was already in this project. A search of the repository
(file contents and directory names), the three other folders on the same drive, the configured
MCP servers and the user profile found no copy; the only Notebook-related clone on disk is
`.tmp-rea-analysis/NotebookLM-for-Windows`, a desktop wrapper analyzed on 2026-11-03. The
repository was therefore cloned fresh (commit `a73d3be`, release 0.16.2, about 90,900 lines of
Python) into the session scratch folder and read, not run. Its `docs/API_REFERENCE.md` records
the signed-in protocol from captured browser traffic, with capture dates. These are a third
party's observations of an undocumented interface, and its own notes say the interface changes.

**Gemini Notebook's signed-in contract.** One remote procedure, `R7cb6c`, creates every studio
output; a type code selects the kind and an options block sits at a kind-specific position.

| Output | Options the product exposes | Download |
|---|---|---|
| Audio overview | Format: deep dive, brief, critique, debate. Length: short, default, long. Language, where the region subtag selects the accent. A focus prompt | Audio file |
| Video overview | Format: explainer, brief, cinematic, short (vertical, about a minute). Ten visual styles including custom text. The cinematic format has its own daily allowance | Video file |
| Slide deck | Format: detailed deck or presenter slides. Length: short or default. A focus prompt | PDF or PowerPoint |
| Infographic | Orientation: landscape, portrait, square. Detail: concise, standard, detailed. Eleven visual styles | Image |
| Report | Briefing doc, study guide, blog post, or a custom prompt; the product also suggests report formats from the sources | Markdown |
| Interactive report | A long report whose body embeds suggested audio, video, mind map, infographic, flashcard, slide and quiz cards that the reader generates in place | Markdown plus the generated elements |
| Data table | A plain-language description of the columns wanted | CSV or Excel |
| Flashcards and quiz | Count: fewer, standard, more. Difficulty: easy, medium, hard | JSON, Markdown or HTML |
| Mind map | A nested name-and-children tree | JSON |

Other parts of the contract that bear on this plan:

| Observed | What it means |
|---|---|
| Every artifact has a status: in progress, queued, completed, failed, **suggested**. Suggested artifacts exist as cards with a title and a one-line description that becomes the steering prompt on a plain Generate click | The product proposes work it has not done yet and lets one click accept it |
| `KmcKPe` revises a deck from a list of slide index and instruction pairs. It creates a **new** artifact that records the original's id; the original is untouched | Edits are versions, and a revision is addressed to a slide, not to the deck |
| An answer chunk carries, per citation, a passage id, a confidence value, the parent source id and the cited text as start, end and text triplets, with tables carried as structured cells | The citation is a span with offsets, not a document link |
| Research has two modes. Fast runs on the web or the person's Drive; deep runs on the web only and in the background. One research task per notebook; results are polled; the person imports all results, chosen results, or only the sources the deep report cited | Collection is a proposal the person accepts, and "only what the report cited" is one of the choices |
| Chat is configured per notebook: default, learning guide or a custom persona; default, longer or shorter answers | Voice and length are a setting of the workspace, not of each message |
| Sources are grouped into labels with an emoji; three operations exist: label everything, label only the unlabeled, regenerate all labels (with a confirmation) | Organizing is incremental by default and destructive only on request |
| Since 2026-09-02 the allowance is measured in compute over a rolling window of about five hours and a weekly window; the client reads percent used and the reset time before expensive work | Quota is a meter the agent reads, not a count it keeps |
| The streamed answer begins with thinking steps before the answer text | Progress is shown as named steps |

**What the client teaches about putting an agent in front of a studio.** The same repository is
an MCP server and ships a skill for agents that drive it. Its rules are operating experience:

| Practice in the client | Where it lands here |
|---|---|
| Fifty-five tools, consolidated by action and by type (`studio_create`, `source_add`, `download_artifact` each replace many), in named groups an operator can switch off | 6.1: the Agent's tool list is consolidated by verb; groups are masked per task, never removed from the prefix |
| Fast track by default: infer format, style and prompt, say one line, generate. Guided preview only for a vague request, a high-stakes deliverable or a quota-limited output. Never more than one clarifying question | 6.1: the Brief Lead asks at most one question, and only when the answer changes the work |
| Every studio prompt carries a grounding line and five blocks: audience, goal, scope, structure, constraints | 6.2: the task brief has those five fields and they are required |
| Success criteria per artifact kind, checked without asking the person; "do not offer iteration proactively on success" | 6.5: the first rung of the ladder is the kind's own success criteria |
| Generation and deletion require an explicit confirm flag in the tool call | 6.8: spend and destruction are approval classes in code |
| A mutation is never replayed after an ambiguous response; only requests classified read-only are retried | 6.3: task nodes that change state are idempotent by key or are not retried |
| An expired session is reported as such and never read as an exhausted quota or a free account | 6.7: the budget meter distinguishes "cannot read" from "empty" |
| Downloads are confined to one directory and a path outside it is refused | 6.3: specialists write only inside the engagement workspace |
| Scope sources explicitly when the topic is narrow; regenerate one slide, not the deck | 6.2 and 6.9 |

**Six things Gemini Notebook does that this platform does not, taken into the design.**

1. Suggested artifacts. The Studio proposes the next outputs as cards with a one-line brief, in
   the status `suggested`, and generates on one click (6.9).
2. The interactive report: a document with generate-in-place cards for the outputs that would
   deepen each section (6.9, built from the existing report and exhibit bricks).
3. Slide-addressed revision that produces a new version and keeps the old one (6.3, 6.9).
4. Citations as spans with offsets and a confidence value (6.4, 6.5).
5. "Import only what the report cited" as a collection choice (6.2, Research Lead).
6. A compute meter read before expensive work (6.7).

**Eight open-source analogs of the other products.** Each was cloned at its head commit into its
own scratch folder and read statically by a separate reader that reported file and line for every
claim; nothing was installed or run. They are analogs, not the commercial products' code, so they
show how a working system of that kind is built, not what Gamma or Genspark ship.

| Repository (commit date) | Analog of | What its code does that matters here | Weakness visible in its code |
|---|---|---|---|
| `kortix-ai/suna` (2026-11-11) | Genspark, Manus | A front chat agent hands work to named background workers; each writes a result file and reports only the path and one line. A `workflow` tool runs up to 50 subagents, 8 at once, whose answers are checked against a JSON schema with up to five correction rounds, after a person approves the plan and the agent count. Goals carry one to eight completion criteria backed by evidence files, ruled on by a verifier session that can never be the author. Approvals are bound to a hash of the call's arguments. Model fallback chains, a provider circuit breaker, spend budgets that warn or block, and a cap on images per turn and per session | No default step limit; a plain subagent result is unvalidated text; the front router, goals and teams are all behind feature flags |
| `FoundationAgents/OpenManus` (2026-08-16) | Manus | A planner writes a plan, a regular expression routes each step to an agent, and a `terminate` tool ends a run | A step is marked complete whenever the agent returns; the stuck check compares the wrong messages; memory is a list cut at 100 messages, which can separate a tool result from its call; nothing persists; code runs on the host |
| `NousResearch/hermes-agent` (2026-11-10) | Personal agents | `MEMORY.md` and `USER.md` capped at 2,200 and 1,375 characters and frozen into the prompt at session start; a background reviewer every ten turns that may add memory but must queue edits and removals for approval; past sessions in SQLite full-text search with no model call; a skill index of names and short descriptions with bodies loaded on demand; children get the goal and no memory, one level deep, and return a summary capped at half the parent's remaining context; a scheduled job advances its next run time before it fires; the system prompt never changes in a conversation and a test fails the build if the prompt or tool list changes | The scan of agent-written skills is off by default while the review prompt pushes toward writing one every session; the memory-write approval is off by default; no general audit log |
| `openclaw/openclaw` (2026-11-11) | Personal agents | A nightly job promotes notes to long-term memory only above a score, a recall count and a count of distinct queries, never losing more than a quarter of existing entries, with a source line cited for every promoted line; memory of untrusted origin is kept out of the prompt; one session per person across channels through identity links; tool definitions follow the session, not the surface, so the cache key is stable; old tool results are trimmed only after the provider cache has expired; a ten-scenario personal-agent benchmark covering reminders, recall, secret leaks, denied approvals and fake progress | Defaults are permissive: full command execution, no sandbox, one shared direct-message session; learned skills apply immediately and the scanner has no injection rule. The memory promotion thresholds, the subagent limits, the execution defaults and the compaction check for exact identifiers were then confirmed in its code; the documented pruning settings are retired keys that its migration tool removes |
| `lfnovo/open-notebook` (2026-11-08) | Gemini Notebook | Per-source context level chosen by the person: excluded, insights only, or full text; prompt templates run on every source at ingestion and stored as insights; a model default per task (chat, transformation, tools, large context, embedding, speech) with an automatic switch to the large-context model above a token threshold; podcasts from an episode profile and a speaker profile, outline first and then one transcript call per segment | Citations are enforced only by the prompt and point at a whole source; no vector index; some failed jobs are recorded as completed |
| `ItzCrazyKns/Perplexica` (2026-09-01) | Perplexity | A classifier rewrites the question and sets flags; three depth modes cap research rounds at 2, 6 and 25; snippets are kept above a similarity threshold and near-duplicates dropped; the quality mode reads the pages themselves and extracts facts; an in-memory session replays events to a reconnecting client | No check that a citation supports its sentence; in the two faster modes citations rest on search snippets, not page text; no error path; no cap on what reaches the writer |
| `presenton/presenton` (2026-11-06) | Gamma | Outline in one call, a layout index for every slide in one call, then one call per slide against a schema derived from that layout's editable elements, with length limits computed from the geometry of each cell; importing a PowerPoint template takes four vision passes per slide and falls back to a faithful copy; when drafting a new layout the model renders its draft to an image and corrects what it sees; a chat agent with 25 deck-editing tools | Fit is estimated from character counts and never measured after rendering; after four repair rounds invalid output ships with a log line; an out-of-range layout index is replaced by a random layout; the image style prompt is never set; the PowerPoint converter ships as a separate package whose open-source edition supports only its low-quality mode |
| `danny-avila/LibreChat` (2026-11-10) | ChatGPT, Claude | Agents joined by edges of two kinds, a handoff the model chooses and a fixed hop; a hook warns the model when about three tool rounds remain; memory written by a separate small-model agent that runs beside the reply, with per-user view, edit, delete and opt-out; generation decoupled from the request so a reconnecting client gets a state sync, the missed chunks and then the live stream; a credit reservation held for each turn and settled on recorded usage; conversation forking | Artifacts are text markers that a line in the content can close early, and renaming one splits its history; memory errors are swallowed; the price table is kept by hand |

**Three internals that sit outside those repositories, read afterwards.** Kortix's agent core
(`@earendil-works/pi-agent-core` 1.4.0, 680 lines for the loop) was downloaded as a package and
read: the loop has no step limit of its own and ends when the model returns no tool calls and no
follow-up message is queued; messages typed mid-turn are picked up between steps; tools run in
parallel unless one is marked sequential; and when a reply is cut off at the token limit every
tool call in it is failed, never executed, because its arguments may be truncated. That last rule
is adopted in 6.3. LibreChat's graph engine (`@librechat/agents` 4.2.2) was read the same way: a
handoff is a tool whose result names the destination agent, which must be one the edge declares;
the receiving agent gets the whole message history plus the handoff instructions; and each
transition is recorded with an id and a depth so a replay does not apply it twice. Presenton's
PowerPoint converter (`@presenton/export-core` 1.0.54, open-source edition) is attached to its
release page as a package and was read from its type definitions, readme and compiled bundle. It
measures the rendered page in headless Chromium and writes native PowerPoint objects: text boxes
with paragraphs and runs, shapes, pictures, connectors, tables and charts with their data. That is
the same design as this platform's own exporter (`gold_pptx_export.py`), which is reassuring. What
it has that this platform lacks is an export evaluation: a 45-slide stress deck plus real
regression slides, exported in three page layouts, asserting slide order, editable headings and
notes, native table and chart parity, and every embedded picture's placement within one CSS pixel
and its pixels within a stated error of the browser rendering. Phase 5 adopts that evaluation for
the native exporter (6.5).

**What the analogs confirm, and what they change.** Most of the architecture in Section 5 appears
in at least one of them in working form, which is reassurance more than news: one front agent
with background workers that return a file path (Kortix), a stable prompt prefix enforced by a
test (Hermes, OpenClaw), skills as an index with bodies on demand (all three personal agents),
and a verifier that is never the author (Kortix). Twelve practices were not in the plan, or were
stated more loosely, and are now adopted:

| # | Practice | Seen in | Section |
|---|---|---|---|
| 1 | A build test that fails if the system prompt or the tool list changes within a session | Hermes, OpenClaw | 6.7 |
| 2 | An approval is bound to a hash of the exact call; the approved call runs, a changed call asks again | Kortix | 6.8 |
| 3 | A promotion gate for long-term memory: a score, repeated recall, distinct queries, a ceiling on how much existing memory one pass may remove, and a source line for every promoted line | OpenClaw | 6.4 |
| 4 | The background reviewer may add memory by itself; edits and removals wait for the person | Hermes | 6.4 |
| 5 | A specialist gets the goal and the workspace rules, never the person's memory; it returns a summary capped against the parent's remaining context | Hermes, OpenClaw | 6.2 |
| 6 | A scheduled job advances its next run before it fires, never replays a delivery that may have been sent, backs off on repeated errors and pauses itself on a failure only the owner can fix | Hermes, OpenClaw, Kortix | 6.3 |
| 7 | A person chooses, per source, whether it contributes nothing, its insights or its full text | open-notebook | 6.9 |
| 8 | A reply to a reconnecting client is a state sync, then the missed events, then the live stream | LibreChat, Perplexica | 6.3 |
| 9 | Field limits in a slide's content schema are computed from the geometry of the slot; fit is then measured on the rendered slide, which the analog does not do | Presenton | 6.5 |
| 10 | The model looks at a rendering of its own layout and corrects it before the layout is accepted | Presenton | 6.5 |
| 11 | A warning to the model when few tool rounds remain, so a task ends with a result instead of a cut | LibreChat | 6.3 |
| 12 | A fixed benchmark of personal-agent scenarios: reminders, recall, secret leaks, denied approvals, fake progress | OpenClaw | 9 |

Six failures recur across the analogs and are the ones this plan is built to avoid: a step marked
done because the worker returned (OpenManus); citations enforced only by the prompt (open-notebook,
Perplexica); self-written skills that take effect unchecked (Hermes, OpenClaw); text fit estimated
and never measured (Presenton); invalid structured output shipped after the retries run out
(Presenton); and a failed job recorded as completed (open-notebook). Each maps to a rule already
in 6.5 or 6.6, and Phase 0 adds one regression case per failure.

---

## 4. What the research changes

Twenty-seven files sit in `.claude/research/`. Two are the owner's own requirement documents
(Section 1.3) and one is a duplicate. Of the remaining twenty-four papers, sixteen changed a
decision on first reading (4.1). The other eight were first set aside on their abstracts; read
through, seven of them also add a rule and one does not (4.2). That correction is recorded here on
purpose: the abstracts were a poor guide to relevance.

### 4.1 Papers that change a design decision

| Paper | Finding | Rule adopted in this plan |
|---|---|---|
| **MIRIX-2.0** (multi-agent memory, 2026-11) | Six typed memory stores keep complete records as the system of record; a provenance hypergraph is only an index, and every fact in it cites the rows it came from; the database write commits before the graph write, so a failed index never loses a memory; retrieval runs under explicit budgets, so the evidence a question inspects does not grow with history; consolidation ("AutoDream") runs outside the write path, merges identities and never rewrites evidence; one store serves both user memory and agent skill memory | Section 6.4: the wiki stays the system of record; the graph is an index that cites chunk ids; writes are fail-soft; retrieval is budgeted by question type (the paper uses 6 base rows and 4 cited rows for a lookup, 8 and 12 for a count, and at most 15 entry anchors); identity merges need a similarity of 0.86 plus an explicit check; skill distillation starts after five finished sessions; consolidation never edits evidence |
| **System Optimizations for Cost-Efficient Agent Harnesses** (Berkeley, 2026-11) | Task accuracy depends mostly on the model, while the harness changes cost by up to 2.6 times; reading existing context is up to 73% of cost even with caching; each tool call re-reads the whole context; agents use 27% of tool output; 57% to 89% of turns in retrieval-heavy work are searches; separating independent subtasks saves up to 33% of input tokens on long sessions | Section 6.7 (the paper's evaluation: combined techniques cut cost to between 0.5 and 0.96 of baseline, runs above a million tokens to 0.67, short runs barely at all, and 17% to 29% of tasks cost more, so these levers are applied to long tasks and measured, not assumed): compact tool output before it enters context, mechanically and nearly losslessly (the paper measured 14% at zero cost; model-written compression cost more than it saved, and any compression pays only if enough turns remain); batch independent tool calls; give each specialist its own context; index the workspace so the agent does not search by listing |
| **PARIS** (fifteen-agent literature review system, 2026-11) | Agents are specified declaratively, coordinate only through persisted artifacts that a conductor validates before every transition, and hand retrieval and counting to deterministic code; three human checkpoints; a corpus quality score before synthesis. Its own audit found counts that drifted between agents and unrecorded checkpoint decisions | Section 6.2: artifact-mediated handoffs validated by the orchestrator; deterministic code for retrieval, counting and scoring; a corpus adequacy check before synthesis. The paper also warns that its reviewer agent was the same model family as its authors and that such reviewers favor their own output, and that its checklist of verifiable properties was the useful part of review: both are reasons for the cross-vendor Verifier and the deterministic rungs in 6.5 |
| **Unprompted coordination through shared memory** (Tampere, 2026-11) | Agents never told that others existed coordinated through a shared store; one ordinary sentence in a prompt switched the behavior on and off; "state shared between agents is a communication channel and should be separated, namespaced and logged" | Section 6.4 and 6.8: every store is namespaced by engagement and by role; cross-namespace reads are explicit and logged |
| **Multi-Agent Screening** (Cambridge, 2026-11) | Agreement among agents shows they concur, not that they are right; acceptance by the assessor gives precision and only a lower bound on recall; recall can be pinned down only by judging a random sample of what the agents did not pass, and the sample needed does not grow with the number of agents | Section 6.5: an audit sample of unflagged claims on every evidence-tier deliverable; critic agreement is never counted as verification. From the full paper: let reviewers nominate separately, judge the union and log who found each item (little overlap between reviewers means many misses); one more interchangeable reviewer can add at most the share found by exactly one reviewer divided by the number of reviewers; and the worked example needs 192 audited items out of 800 unflagged for a margin of five points, however many reviewers there are |
| **How Well Does AI Peer Review Work** (100 planted errors, 2026-11) | The best single reviewer caught 71 of 100 errors; pooling every reviewer caught 93; the seven errors no system caught were all omissions | Section 6.5: reviewers from different vendors are pooled; a separate completeness check looks for what is missing. From the full paper: re-running the same model three times found no additional errors, so diversity has to come from different models, not repeated calls; frontier models cost about four cents per error caught; false positives were not measured, so pooled findings still need the claim ledger to confirm each one |
| **ForgeSystem** (2026-11) | Production is kept separate from verification; the producer "must not lower verification requirements or modify trusted references"; cheap checks run before expensive ones; delivered artifacts are archived with their demand and construction trace and reused as starting points | Section 6.5 and 6.6: the verifier owns its rubric; cheap deterministic checks run first; every delivered artifact is archived as a starting point for the next similar request |
| **Recursive Self-Improvement survey** (1,250 papers, 2026-07) | Demonstrated self-improvement strength tracks a verification hierarchy, from formal verifiers down to self-assessment; the characteristic failures (self-confirming loops, diversity collapse) follow from violating it | Section 6.6: every improvement loop names the rung of its evaluator; a loop evaluated only by its own model's judgment proposes and never promotes |
| **Agentic AI Companions** (2026-11) | "Whether a limit holds depends on whether code or a prompt enforces it"; accountability lies in what an agent retains, initiates and represents, and whether users can inspect, revise and enforce those settings | Section 6.8: limits live in code; the user can see and edit what the agent remembers and what it will do unprompted. The paper's "protective visibility" sets the minimum: records about the person, and actions with consequences outside the conversation, are always inspectable and correctable; and each behavior is marked as enforced, instructed or default |
| **Cache-Aware Prompt Compression** (2026-07) | Query-aware compression changes the prefix on every call and defeats the cache; pairing query-agnostic compression with explicit cache control was cheapest in 16 of 16 configurations, with mean savings of 49% over caching alone | Section 6.7: stable prefix, explicit cache breakpoints, no per-query rewriting of the prefix |
| **Less Context, Better Agents** (Microsoft, 2026-06) | On a 50-task tool-use benchmark, full context completed 71%; pruning to the last five tool exchanges plus a running summary completed 91.6% with 63% fewer tokens | Section 6.7: recent tool exchanges plus a summary, not full history |
| **LoopsBench** (Microsoft, 2026-07) | The best configuration resolved 25% of long-horizon tasks; plans recover only part of the real dependency graph; regressions accumulate | Section 6.3: tasks are dependency graphs with regression obligations; completed steps stay under test |
| **reComposer** (Apple, 2026-11) | An editable plan (subject, composition, palette, style) between the prompt and the image gave users more control and ownership than prompting | Section 6.9: every generated visual has an editable plan the user can change before and after generation |
| **OpenScholar** (Nature, 2026-02) | Retrieval-augmented synthesis with self-feedback matched expert citation accuracy, while a general model without retrieval hallucinated most citations | Supports the existing manifest-grounding contract; no change |
| **MaxIM** (Google, 2026-11) | A bounded memory should be judged by whether it predicts what later tasks need, and be grounded in the observed history | Section 6.4: consolidated summaries are tested against held-out questions before they replace anything in the hot context |
| **ExCritique** (2026-11) | Scores alone do not expose failure cases; an interface that shows the evidence behind each score helped practitioners find problems and judge the metrics | Section 6.5: the review surface shows the passage behind every verdict, so labeling takes seconds |

**How deeply each paper was read.** Stated so the reader can weigh the table. The body of a paper
here means everything before its reference list.

| Coverage | Papers |
|---|---|
| Whole body | MIRIX-2.0, PARIS, ForgeSystem, the screening paper, the planted-error benchmark, the recursive self-improvement survey, the harness-cost paper (main text through its discussion) |
| Most of the body (introduction, method, results, discussion) | the shared-memory replication, the companions study, cache-aware compression (through the production case studies), context engineering (through the failure analysis), OpenScholar (results, expert evaluation and the pipeline method) |
| Substantial sections (introduction, the method or core argument, results, conclusion) | LoopsBench, reComposer, MaxIM, ExCritique |
| The eight papers in 4.2 | the AI-text detection study, the image-labeling paper, the verifiable auto-research paper, the research-reconstruction benchmark and teamknitt were read through their whole body; the decision-model audit through its introduction, method overview, cross-model results, guardrail results and discussion; the knowledge-graph paper through its method, results and ablations; the token-operations survey through its introduction and its multi-model section, with the model-internals and serving-infrastructure sections mapped by heading only |

No appendix was read in any paper. Every number quoted in this plan was taken from the paper's own
text.

**Further rules taken from the fuller reads.**

| Paper | What the fuller read added | Where it lands |
|---|---|---|
| MIRIX-2.0 | Retrieved procedures can hurt: one skill-memory baseline scored below no memory on both interactive benchmarks, and MIRIX's own skills fell below no memory on three of six task types. Building the graph made document ingestion 3.8 to 4.0 times slower. The paper's own tables do not measure merge precision or source-detail retention | 6.4 and 6.6: a skill is mounted for a task type only where it measurably helps; the index is built at ingestion, off the conversation path; merge precision is measured before identity merges are trusted |
| PARIS | Duplicates and quota decisions are flagged, never deleted; updates are append-only with versioned drafts; a contamination guard appends exclusion terms for words that mean different things in different fields, added after off-domain records were retrieved; any cluster above 30% of the corpus is flagged; the reviewer runs a checklist of verifiable properties before forming any judgment | 6.5: the contamination guard is the retrieval-side defense against the industry-mismatch incident in 1.3; the Verifier's checklist runs before its judgment; a corpus dominated by one source cluster is flagged before synthesis |
| Harness cost | Compression pays only when enough turns remain, and model-written compression cost more than it saved. A rule-built index of the file system cut search calls by up to 80%. One sentence of guidance to batch tool calls cut turns by up to 30%. Combined, cost fell to 0.77 of baseline at 0.97 of baseline accuracy | 6.7: the workspace index is rule-built, with no model call; batching is a prompt instruction, not a harness mechanism |
| Shared-memory replication | Three implementation details each changed a model's measured behavior: how strictly replies were parsed, which request path was used, and the reasoning-effort setting. Reads of a key the reader had itself written looked like coordination and were collisions in a shared namespace. Once an entry written by another agent was visible, it was read in 493 of 501 cases | 6.4 and 6.8: namespaces carry the author of every entry; the telemetry event for every model call records request path, effort and parser outcome, so a behavior change can be traced to the harness and not blamed on the model |
| Companions study | Systems differ in whether memory records what the user said or also what the system concluded about the user; "forget" often hides a record and keeps it in storage; background passes revise the user's records without notice; a refusal can be binding (enforced in code) or advisory (a prompt instruction) | 6.4 and 6.8: memory marks each fact as stated by the person or inferred by the agent; forget removes the record; a consolidation pass that changes what the agent holds about a person reports it; a refusal is enforced in code |
| Recursive self-improvement survey | Ten rounds of self-critique with no outside signal lost 55% of informational change, and one verification step restored progress. Without external feedback models largely cannot correct their own reasoning, and refinement pulls text toward the refiner's own style. Result-level improvement is paid again on every problem; process-level improvement (a corrected procedure, a skill) is reused | 6.5 and 6.6: every repair round carries an external signal (the cited passage, a measurement, a rendered page); improvement effort goes into skills and procedures, which is what SkillOpt is for |
| Cache-aware compression | The cache is exact on the token sequence, and a small prefix (under about 3,500 tokens on the model measured) hit the cache less reliably; on a public tool-use benchmark, per-query compression cost 40% more than doing nothing | 6.7: cached prefixes are kept above the small-prefix tier and byte-stable; nothing rewrites the prefix per request |
| Context engineering | Older tool exchanges describe superseded states and act as noise; the last five exchanges plus a summary of the three most recently evicted, at one extra call per eviction, beat full history on both accuracy and cost; results were read back from the system, not from the agent's own report | 6.7: the agent's window policy starts at those values; task success is read from the artifact, never from the specialist's own report |
| LoopsBench | Workers with narrower contexts gave the best result and still regressed completed work when they returned; plans recovered only part of the real dependency structure, and the stronger loops over-parallelized steps that had to be serial; agents wrote few tests | 6.3: completed nodes stay under their checks when a specialist returns; the planner must mark dependencies before it may parallelize |
| reComposer | Each element of a visual plan carries one of four influence levels (none, guide, strong, locked), and the planner surfaces assumptions the model would otherwise make silently | 6.9: the visual plan uses the same four levels; the plan lists the assumptions the model made |
| OpenScholar | Without retrieval, 78% to 98% of the paper titles models cited did not exist; removing reranking cost the most; a system that leaned on one or a few sources scored lower on coverage even with accurate citations | 6.5: source reality is a hard check; coverage across independent sources is checked separately from citation accuracy |
| MaxIM | A memory that tracked the user's state inaccurately made the assistant worse than having no memory at all | 6.4: a fact the agent cannot tie to evidence is not held; a consolidated summary must pass held-out questions before it is used |
| Recursive self-improvement survey (second pass) | On a skills benchmark, human-written skills raised pass rates by 16.2 points while model-written skills gave no measurable gain. In low-signal settings a constrained, auditable rubric is preferred to free prompt evolution because it "can be audited, diffed, and rolled back". Under pressure to complete a task, seven of seven models fabricated data when the data was missing. A control that lives inside the agent's own runtime is reachable by anything that can influence the agent | 6.6: a model-written skill edit is presumed worthless until the live rung shows a gain, which matches the SkillOpt batch (72 candidates, none promoted); skills change only through versioned, reversible edits. 6.5: "the data is missing" is a valid task result that the contract allows and the Verifier rewards. 6.8: the Gate runs outside the specialists' process |
| Harness cost (ablation) | Used alone, the batching instruction cut steps by 19% and still raised cost by 2% on a small model, which issued unnecessary calls in order to batch. The file index helped document retrieval and was barely used on code the model already knew | 6.7: batching guidance goes to the `orchestration` and `artifact` seats, not the `fast` seat; every lever is switched on per task type only after it shows a saving on the regression set |
| Cache-aware compression (production cases) | With a 94,000-token tool catalog, compression that did not look at the query kept tool selection as good as no compression (0.700 against 0.703), while compression that looked at the query dropped tools the model needed (0.603). The cache took five to ten calls to warm across the provider's servers | 6.7: the tool catalog and skill mounts are compressed once, without reference to the request; the first calls of a task are expected to miss the cache and are not read as a regression |
| Context engineering (failure analysis) | Stale-state errors fell from 34 to 6 when history was pruned; premature stopping then rose from 9 to 18, and the running summary cut it to 3. Wrong category mapping did not move, because it is a reasoning error, not a context error | 6.7: pruning is never shipped without the running summary; context policy is not expected to fix reasoning errors, which go to the Verifier |
| OpenScholar (method) | At most three passages per source; reviewer feedback capped at three items; the first draft was preferred over the refined one about 20% of the time because of over-editing; citation precision and coverage are separate and one system had the first without the second | 6.5: a repair round keeps the earlier version when the repaired one scores worse; retrieval caps passages per source so one source cannot fill the context |
| reComposer (evaluation) | Seeing a generated image anchored people: one participant wanted a clay style, got an animated one and never corrected it. On an automated benchmark the planning layer lowered text-rendering accuracy | 6.9: the visual plan and its assumptions are shown before the first image; text is laid out natively over the picture, never rendered inside it, which the platform already requires |
| ExCritique | Practitioners want the distribution of scores first, then the slices where metrics disagree, then one item with its evidence; "if the score is aligned with my judgment, then I trust it" | 6.5: the review surface opens on the distribution, offers the disagreement slice first, and shows the passage behind each verdict |

### 4.2 The eight papers first set aside

These were judged irrelevant from their abstracts and then read. Seven add a rule.

| Paper | What it found | Rule adopted |
|---|---|---|
| **Detecting AI-authored text in student writing** (PISA 2025) | A detector built on surface features separated machine from human essays at 0.95, and what it had learned was that machine text has longer words, more punctuation, higher readability indices and more positive words. One rewriting prompt cut its recall from 0.92 to 0.39. A detector built on a language model's internal representation kept its recall at 0.94 or above on rewritten whole texts, and lost much of it on single sentences. Spelling played almost no role | 6.5: the platform's lexical and prose judges are surface-feature detectors, which is the kind one prompt defeats and the kind that passed everything in 1.2. The prose judge becomes a classifier trained on the documents people here accepted and rejected, scored per section and per document, never per sentence. The four surface signals are kept as cheap first-rung measurements |
| **Taxonomy-free image labeling** (Pinterest) | Cluster first, then have a vision model label a few representative items per cluster and apply the label to every member. Label cost fell to 0.05% of labeling each item, with an irrelevant-label rate of 4%. The embedding has to suit the kind of insight wanted, and cluster size trades cost against quality | 6.4: the Librarian labels the wiki's pages and the image and icon library by cluster, not by item. The platform already names topic clusters this way; the same method extends to every large collection |
| **Toward verifiable auto-research** | Given a budget and a natural-language requirement, an agent produced a fast key-value store that silently lost updates: it optimized the gaps in the specification. The proposal: contracts composed from a reviewed library of parts, never written whole by the model; a pre-critic with its own prompt, blind to the author's reasoning, that discards weak candidates before an expensive evaluation; a cheap search for a counterexample before any expensive proof | 6.2: a task's output contract is assembled from the catalog and coverage contracts that already exist, not drafted per task. 6.6: SkillOpt gains a pre-critic before the live rung, since the live rung is the expensive step. 6.5: the ladder's cheapest-first order is kept strictly |
| **Can auto researchers reconstruct human research decisions** | Against 152 accepted papers, an agent recovered 0.29 of the idea, 0.36 of the experiment design and 0.65 of the write-up. 78% of its ideas recombined the supplied references. A more specific research direction raised the idea score from 0.29 to 0.54. A checklist of items verified by people correlated with human judgment at 0.64 to 0.70, above any single model acting as judge (0.50 to 0.64) | 6.2: sharpening the goal is the Brief Lead's first duty, because it is the cheapest quality lever measured. 6.5: judges score against a human-verified checklist drawn from the coverage contract, not by overall impression. The Strategist is required to state what in a recommendation does not come from recombining the sources |
| **teamknitt** | A team always has a topology, a sharing policy and a stance on intervention. Topology filters what a member may see and grants no authority. Five claims stay separate: an instruction was queued, applied, put in a member's context, understood, and improved the result. Available, exposed, published and acknowledged are four different states of a handoff | 6.2 and 6.3: the task graph records those four handoff states; a correction the person makes mid-task is logged as queued and applied, and is never reported as having improved anything until the next verdict shows it |
| **Audit of System 1 decision models** | Small typed decision models answer a choice, a score or a yes-or-no in one pass. Models of 4 billion parameters and up screened prompt injection at 0.988 to 0.998 ranking accuracy in 48 to 60 ms with no false alarms on hard benign queries. The confidence they return is a measure of spread, not a probability of being right. Putting two questions in one request flipped answers on up to 22% of inputs for the smallest model | 6.1 and 6.8: intent routing and the injection screen are candidates for this model class on the `fast` seat, one question per call, with thresholds set on a held-out set and never read from the returned confidence |
| **Token-operations inference survey** | Its multi-model section describes the loop the platform's router already follows (evaluate, profile each model, route, log, feed back), cascades that try a cheaper model first and escalate when a check fails, and the advice to keep agent and tool-calling steps on the main model. Its sections on model internals and serving infrastructure concern things a provider controls | 6.10: the `analysis` and `fast` seats run as a cascade, escalating to the seat above when the deterministic check fails; orchestration and tool-calling steps never cascade down |
| **GRALAN** (knowledge graphs and language models) | A trained graph encoder feeds learned tokens to a frozen open model; it needs training access to the model's internal states, which provider APIs do not give. Its ablations found three hops the best traversal depth and that a relation-relevance threshold beat fixed-size neighborhoods | No architectural rule, since the method cannot be used through an API. One parameter is taken: the entity index stops at three hops and filters by relation relevance |

`caching2.pdf` is a byte-identical duplicate of `caching.pdf`.

---

## 5. Target architecture

### 5.1 The shape

```
                         THE PERSON
                             |
        one conversation  +  one canvas  (web; later messaging and voice)
                             |
+----------------------------v-----------------------------------------------+
|  WORKSPACE UI   chat | canvas | tasks | memory | skills | connectors | gallery
+----------------------------+-----------------------------------------------+
                             |  events (stream), approvals, edits
+----------------------------v-----------------------------------------------+
|  THE AGENT  (one runtime, server-side, always on)                           |
|   intent -> plan -> delegate -> verify -> deliver -> remember               |
|   owns: the conversation, the engagement, the task graph, the budget        |
+------+----------------------+----------------------------+-----------------+
       |                      |                            |
       | task contracts       | policy checks (in code)    | read / write
+------v---------------+  +---v----------------+   +-------v----------------+
|  THE STUDIO          |  |  THE GATE          |   |  THE SECOND BRAIN      |
|  specialists, each   |  |  approvals, egress |   |  engagement workspaces |
|  with its own        |  |  budgets, audit    |   |  wiki (system of       |
|  context, skills,    |  |  trail; separate   |   |  record), entity index |
|  tools and model     |  |  from the workers  |   |  skills, run ledger    |
|  seat                |  +--------------------+   +------------------------+
+------+---------------+
       | tool calls (one gateway, MCP)
+------v----------------------------------------------------------------------+
|  TOOLS   collect | analyze | generate | render | export | act               |
|  source packs, social, video, uploads | clustering, sentiment, topics       |
|  the lifted generation engine | diagrams, images, video, audio              |
|  PPTX, XLSX, PDF, MP4, Miro, Figma | browser and computer use               |
+-----------------------------------------------------------------------------+
       |
  PROVIDER DOOR (the existing proxy): model seats, normalization, cost meter, caches
```

### 5.2 Seven rules the architecture obeys

1. **One conversation, one engagement, one agent.** No surface asks the person to choose an app.
2. **The engine runs on the server.** The browser renders and edits; it does not generate.
3. **Agents hand off artifacts, never chat.** Every handoff is a typed, persisted, validated file.
4. **The producer never grades itself.** Verification is a different role, and for evidence-tier
   work a different vendor.
5. **Evidence is never rewritten.** The wiki and the run ledger are append-only systems of record;
   indexes and summaries are derived and disposable.
6. **Limits live in code.** Approvals, budgets, namespaces and egress are enforced by a component
   the workers cannot override.
7. **Converge before building.** A new module is justified only when no existing one can be
   re-pointed. Each phase lists what it deletes.

---

## 6. Design

### 6.1 The Agent: one front door

**What the person experiences.** A conversation that already knows the engagement. They upload a
transcript and say what they need. The agent answers in seconds with what it understood, what it
proposes to do and what it will cost in time, then works in the background and reports as pieces
land. They can keep talking while it works, change direction, point at a slide and say "tighter",
or close the window and come back to a finished deck and a note about the two things it could not
verify.

**What it is, concretely.** The existing platform agent (`mcp-services/agent`, about 1,570 lines
in four modules) becomes the single runtime. It is the right base because it already holds no
provider key and no model id, reaches models and memory through the proxy door (`hic_door.py`),
persists threads to disk, tags each thread as cloud or local, mounts skill packages that refresh
when their hash changes, and accepts signed callbacks from delegated jobs (Guide 2.2). It grows
four things it lacks: the task graph (6.3), the delegation contract (6.2), streaming to the
workspace, and the engagement binding (6.4).

**Intent, not syntax.** The August program shipped `chatIntentRouter.ts`: a regular-expression
pre-filter, then a classification on the `fast` seat, then fail-open. That router moves server-side and becomes
the agent's first step. Hashtags remain as shortcuts for people who know them. The 47 directives in
`hashtagRegistry.ts` become the agent's vocabulary of intents, so nothing a hashtag can do is lost
and nothing requires one.

**Four response classes, chosen by the agent, sized to the request.** This follows the scaled
effort rule from Anthropic's multi-agent write-up (a simple fact check is one agent and a handful
of tool calls) and the measured cost of fan-out.

| Class | Example | What runs | Target to first response |
|---|---|---|---|
| Answer | "What did the transcript say about renewal?" | The agent alone, recall plus cited passages | seconds |
| Edit | "Make slide 4 more concise", "swap the image" | The agent plus one specialist on one artifact region | under a minute |
| Produce | "Draft the client follow-up email", "a journey map" | One or two specialists, one verification pass | minutes, streamed |
| Program | "Run the research and build the deck" | The full studio on a task graph, in the background | acknowledged in seconds, then progress |

**Proactive, with consent.** The daily digest already exists (`/api/digest`, the Launchpad card).
It becomes the agent's morning note: what finished overnight, what is waiting on a decision, what
changed in a watched source. Scheduled and unprompted behavior is listed on a page the person can
read and switch off (6.8).

### 6.2 The Studio: a team behind the agent

**Roster.** Each specialist is a declarative definition: a role prompt, a skill mount, a tool
allow-list, a model seat and an output contract. The definitions reuse what exists. NXT Agency's
registry already loads agents from Markdown with YAML frontmatter, and its 173 prompts cover most
of these roles; the 90 skills in `.claude/skills/` already carry the method for each deliverable.

| Specialist | Owns | Existing skills it mounts | Existing tools it calls | Seat |
|---|---|---|---|---|
| **Brief Lead** | Intake, anonymization, goal extraction, the plan the person approves | `research-planner`, `questionnaire-author` | upload parse, PII extractor, `transcriptIntake` | `research` |
| **Research Lead** | Collection across source packs, social, video, deep research; corpus adequacy | `source-ranker`, `wiki-query-expander`, `evidence-density-pre-checker`, `source-yield-scorer` | `/api/search/*` (1,277 sources), Reddit and review collectors, video transcription, deep research | `research`, with `search` for collection |
| **Analyst** | Clustering, sentiment, themes, contradictions, gaps | `topic-cluster-to-theme-converter`, `theme-analyst`, `meta-themes`, `contradiction-finder`, `analog-finder` | `topic_modeling.py`, RoBERTa and aspect sentiment, BERTopic, pgvector | `analysis` for breadth, `research` for depth |
| **Strategist** | Diagnosis, recommendations, roadmap, PRD, gap, competitive | `strategy-author`, `recommendation-architect`, `prd-compiler`, `roadmap-builder`, `gap-analysis-evaluator`, `competitive-analyst`, `pre-mortem`, `second-order-thinker` | the lifted engine | `deep_reasoning` |
| **Journey Cartographer** | Journey maps, service blueprints and personas as linked objects (insight, opportunity, solution, metric), each citing evidence | `journey-illustrator`, `service-blueprint-mapper`, `persona-architect` | journey engine, native exhibit renderer, Miro export | `analysis` |
| **Writer** | Reports, briefs, explainers, emails, talk tracks, study formats | `strategic-report-writer`, `html-deliverable-composer`, `explainer`, `brief-dialog`, `human-voice-editor` | the HTML chain | `artifact` |
| **Deck Composer** | Slide narrative and composition | `deck-composer`, `infographic-composer` | deck loop, `slideComposer`, stage HTML | `artifact` |
| **Designer** | Design system, visual plan per artifact, diagrams, imagery direction | `design-exemplar-curator`, `designer`, `nano-banana-diagram-composer`, `mind-map-architect` | design tokens, diagram renderer, image generation, Figma | `artifact` plus `image` |
| **Media Producer** | Images, characters, audio overviews, video overviews | `brief-dialog` | image and video models, TTS, HyperFrames renderer, character generator functions | `image`, `video`, TTS |
| **Prototyper** | Working experience prototypes | `experience-prototype-composer` | the `#proto` pipeline | `artifact` |
| **Automation Engineer** | Copilot Studio and Power Automate recipes | the recipe generator's knowledge base | recipe generator | `artifact` |
| **Operator** | Actions in a browser or desktop on the person's behalf | none | computer use, the live view, the review gate | `orchestration` |
| **Verifier** | Claims, citations, scope match, completeness, rendered-page reading | `qa-gate`, `preflight`, `stakeholder-lens-auditor` | claim ledger, citation resolver, layout measure, vision critic | `verifier` |
| **Librarian** | The second brain: ingest, index, consolidate, lint | `wiki-synthesizer`, `wiki-reranker`, `manifest-chunk-retrieval` | wiki, manifest, memory door, brain growth | `analysis` |
| **Coach** | Self-improvement: failure families, skill proposals, evaluation | `epoch-proposer`, `cross-engagement-pattern-miner`, `skillopt-validation-gate` | eval lane, SkillOpt, golden set | per SkillOpt design |

**Topology.** Orchestrator and workers. The agent is the only component allowed to dispatch a
specialist, which is the rule NXT Agency's control tower already states for itself ("the only
agent permitted to orchestrate other agents"). Specialists do not call each other. They read the
task contract and the artifacts named in it, and they write their output artifact.

**The contract.** NXT Agency's `orchestration/contracts.py` already defines the types this needs,
in Pydantic: `EngagementPlan`, `TaskNode`, `WorkerHandoff`, `ModelRoute`, `EvidenceRef`,
`ApprovalGateSpec`, `ApprovalPacket`, `BudgetCap`, `VerificationResult`, `Defect`, `RunLog`,
`DecisionRecord` (19 classes, 1,449 lines across the orchestration package). Those become the
studio's contract. HiC's AIR
(the Artifact Intermediate Representation every run already emits) is the payload a production
task returns. Nothing new is invented here; two existing contracts are joined.

```
TaskNode
  id, role, objective            what to produce and why, in one paragraph
  inputs: [EvidenceRef|ArtifactRef]   named files, never "see above"
  output_contract                the schema or AIR kind expected
  budget: BudgetCap              tokens, calls, wall time
  approval: ApprovalGateSpec     none | notify | ask
  depends_on: [TaskNode.id]
  status, attempts, verdict
```

**Validation at every transition.** Before a specialist's output is accepted, the agent runs the
deterministic checks that exist today (schema, the chain stages, layout measure) and records the
result on the node. This is the PARIS conductor rule, and it is where counts stop drifting between
agents: counts are computed by code from the artifact, never restated by a model.

**When not to use the team.** Anthropic's own guidance (January 2026) is that teams build elaborate
multi-agent systems and then find that better prompting of one agent matched them, and that
multi-agent runs can use about fifteen times the tokens of a chat. The four response classes in
6.1 exist to hold that line: three of the four classes never fan out.

**What a specialist is given, and what it returns (3.5).** A specialist receives the task brief,
the engagement's rules and the paths it may read. It does not receive the person's memory. It
returns a result file and a summary capped against the Agent's remaining context; the Agent reads
the file only when it needs the detail.

### 6.3 The runtime: tasks, workspaces, background work

**The engagement workspace is a directory.** This is the Manus lesson (the file system is the
context: unlimited, persistent, directly operable) applied to a layout the platform mostly has.

```
hic-workspace/engagements/<slug>/
  ENGAGEMENT.md         who, what, goals, audience, brand, standing preferences (human-readable)
  engagement.json       the typed entity: ids, sources selected, themes, artifacts, status
  intake/               uploads, anonymized versions, the anonymization summary
  corpus/               manifest.json, chunk maps, corpus adequacy report
  analysis/             topic model, sentiment, knowledge graph, themes
  tasks/<task-id>/
    plan.md             the plan the person approved, and the current checklist
    graph.json          TaskNodes with status and verdicts
    events.jsonl        append-only: every call, tool result, decision, cost
    out/                the artifacts this task produced
  artifacts/            delivered AIR records and their rendered forms, versioned
  memory/               engagement-scoped facts and dated notes
```

The session model observed in the Manus client (outline, views, files, sandbox, schedule,
subtasks, references to earlier tasks) maps onto this one for one: `plan.md` is the outline,
`out/` and `artifacts/` are the file set, `graph.json` holds subtasks, and a task can name an
earlier task's artifact as an input.

**Durable execution.** The job store in the proxy already writes state per job, stamps a heartbeat
every 15 seconds and marks a job interrupted after 75 seconds of silence. Tasks reuse that
mechanism. Because every step's inputs and outputs are files, a task that dies resumes from its
last completed node instead of restarting, which Anthropic names as the expensive failure of
multi-agent systems.

**The server-side engine.** A new service, `studio-worker`, runs the existing TypeScript engine in
Node: `artifactChain`, `htmlArtifactChain`, `deckLoop`, `slideComposer`, `slideToStageHtml`,
`chunkRetrieval`, `claimLedgerGate`, `proseSignal`, `aiRouter` and the rest. It is the same code
the browser runs, imported, not ported. The few browser references (Section 2.2) are replaced by
an injected storage and fetch adapter. The browser application then calls the worker the same way
the agent does. When the worker covers all 39 catalog entries, the generic generator behind
`/api/artifact/generate` is deleted and the one-engine rule is true again.

**Plan recitation without breaking the cache.** The task checklist lives in `plan.md` and is
appended to the end of the context, never inserted at the top, so the cached prefix stays intact
(the Manus rule, and the cache finding in 4.1).

**Regression obligations.** A completed node stays under its checks. If a later edit to a deck
breaks pointer binding on a slide that had passed, the node reopens. This is the LoopsBench
finding turned into a rule.

**Versions, not overwrites.** A revision is addressed to a part (a slide, a section, a lane) and
produces a new version that records its parent; the earlier version stays readable. A node that
changes state carries an idempotency key, and a state-changing call is never replayed after an
ambiguous response (3.5).

**Truncated calls are failed, not run (3.5).** When a specialist's reply stops at the token
limit, every tool call in that reply is returned as an error and the specialist is asked again.
A conversation can be branched at any message; the branch is a new task thread that shares the
engagement's memory and none of the later context.

**Reconnection and budgets (3.5).** A client that reconnects to a running task receives the
task's current state, then the events it missed, then the live stream. When few tool rounds
remain in a node's budget the specialist is told, so the node ends with a partial result and a
stated gap, not a cut.

**Scheduling.** A schedule is a stored task template plus a trigger. A scheduled run advances its
next run time before it starts, so a crash cannot run it twice; a delivery that may already have
been sent is never replayed; repeated errors lengthen the wait; and a schedule pauses itself when
it fails for a reason only the owner can fix. The existing cadence script
and the proxy scheduler become entries in one schedule table the person can read.

### 6.4 The second brain

**Typed stores, mapped to what exists.** MIRIX's six types fit the platform's current stores
closely. The plan is mostly naming and namespacing them, then adding the index.

| Store | Holds | Exists today as | Change |
|---|---|---|---|
| **Core** | Who the person is, standing preferences, corrections | `memory-facts.json` categories preference, behavior, correction | Split per person and per engagement; human-readable `USER.md` and `ENGAGEMENT.md` the person can edit |
| **Episodic** | What happened: runs, decisions, edits, feedback | `sessions/<slug>/runs/`, `engagementLedger.ts`, `events.jsonl` | One append-only ledger per engagement; never summarized in place |
| **Semantic** | What is known: articles, social posts, uploads, synthesis | the wiki (23,838 pages) and the manifest | Stays the system of record; gains the entity index below |
| **Procedural** | How to do things: skills, learned constraints, exemplars | `.claude/skills/` (90), `learned-constraints.md`, `exemplars/` | Skills cite the runs they were learned from |
| **Resource** | Raw files | `sources/`, uploads | Unchanged, immutable |
| **Vault** | Secrets and sensitive maps | `.runtime/`, webhook secrets, the PII map (kept in memory only) | One guarded store; workers receive capabilities, never values |

**Three scopes, enforced.** Person, engagement, organization. A read across scopes is an explicit,
logged operation with a stated reason. This closes the class of the two recorded leaks (other
engagements' quotes in a Northeastern deliverable; a preference crossing engagements), and it is
the Tampere finding applied: shared state is a channel, so it is separated, namespaced and logged.

**The entity index.** `knowledgeGraphBuilder.ts` builds a citation graph per run. It is extended
into a persistent index over the wiki: anchors for people, organizations, products, places and
concepts; fact frames that connect several anchors with roles and carry dates and figures as
literals; every frame citing the chunk ids it came from. The MIRIX rules apply without change:

- The wiki write commits first. A failed index write never rolls back a page, and a failed index
  read falls back to manifest retrieval, which is today's path.
- An embedding may propose that two anchors are the same entity; only an explicit check may merge
  them, and a rejected pair is cached so it is not asked again.
- A merge unites citations and rewires frames. It never edits a page or a chunk.

**Budgeted retrieval.** Today `chunkRetrieval.ts` pre-ranks chunks by declared key terms,
deterministically and with no model call. That stays as the first step. The entity index adds a
second entry point (start at the anchors the question names, follow frames, dereference only the
cited chunks) under explicit budgets per question type. The evidence a question inspects stops
growing with the size of the brain.

**Consolidation outside the write path.** The daily brain-growth pass already runs three
deterministic steps. It gains two, both proposals until verified:

1. *Semantic:* merge duplicate anchors (above). Evidence untouched.
2. *Procedural:* for each finished task, quote what worked and what failed from its event log,
   distill a lesson, and propose a skill edit that cites those runs. The proposal enters the
   existing epoch queue. Nothing reaches a skill file without the existing APPROVE gate.

A consolidated summary may replace detail in the agent's hot context only after it answers a
held-out set of questions about that detail (the MaxIM criterion).

**The person can see it.** A Memory panel lists what the agent holds about them and about the
engagement, where each item came from, and a forget control. Muse offers the same, and the
companions study names inspectability as the basis of accountability.

**Promotion gate (3.5).** A note enters long-term memory only when it clears a relevance score,
has been recalled more than once and by more than one distinct query, and cites the line it came
from. One consolidation pass may not remove more than a quarter of what is already there. The
background reviewer may add entries without asking; an edit or a removal is a proposal the person
accepts. Anything derived from untrusted content (a web page, an uploaded file's embedded
instructions) is never promoted.

### 6.5 Verification

**The roles are separated.** Producers write. The Verifier checks. The Verifier's rubric and
references are not editable by a producer, and a repair instruction may narrow a claim but may not
relax a check (the ForgeSystem rule, and the platform's own "never relax the gate" standing rule).

**A ladder, cheapest first.**

| Rung | Check | Exists today | Change |
|---|---|---|---|
| 1 | Deterministic structure: schema, budgets, title rules, banned lexicon, CSS integrity | chain stages `normalize`, `lexical`, `titles`, `renderPlan`; `artifactCssIntegrity.test.ts` | Run on every artifact kind, not only decks |
| 2 | Grounding: every claim bound to a chunk; quotes verbatim; figures only inside cited quotes | `bindPointers`, `provenance`, `claims`, `evidenceSlots`, the claim ledger | These are the four lowest-passing judges; the Verifier repairs by narrowing, with the evidence in hand |
| 3 | **Source reality** (new): every external citation resolves to a URL or a stored document; the cited passage is fetched and compared | partly, through `citationResolver` and the pointer registry | The sourcing rule from the incident: no resolvable source, no claim |
| 4 | **Scope match** (new as a blocking check): population, period, industry and causal strength of the passage against the sentence | the rule is written in `.claude/CLAUDE.md`; enforcement is partial | A reviewer from a different vendor than the author judges each consequential claim |
| 5 | Rendered reading: the page as the reader sees it | `slideVisionCritic`, `/api/layout/measure`, `artifact_visual_qa.py` | Every artifact kind, top to bottom, including "does this page have a live stylesheet" and "is this a sentence" |
| 6 | **Audit sample** (new): a random sample of claims and pages that no check flagged, reviewed independently | none | Gives a recall estimate; without it the pass rate says nothing about what was missed |
| 7 | The person | review checkpoints | Each rejection is captured as a label with the passage, in one click |

**Cross-vendor review by default for evidence-tier work.** Microsoft's Critique pairs one vendor's
author with another vendor's reviewer, and the planted-error benchmark shows why: the best single
reviewer found 71 of 100 errors and the pool found 93. The platform already routes three vendors
through one door. The Verifier seat is defined as "not the author's vendor."

**Agreement is not evidence.** Five critics that concur show consensus. The audit sample is the
only instrument that bounds what all of them missed, and its size does not grow with the number of
critics.

**Completeness is a separate check.** The seven errors no reviewer caught in the benchmark were
omissions. A completeness pass compares the deliverable against its coverage contract
(`deliverableCoverage.ts` already defines one per hashtag) and against the themes on the assembly
board, which answers the owner's requirement that every captured theme produce requirements.

**The exporter has its own evaluation (3.5).** A fixed stress deck and slides taken from real
engagements are exported on every change to the exporter. The check asserts slide order, that
titles and notes are editable text, that tables and charts are native objects, and that each
picture lands within one pixel of its browser position with pixels matching the browser
rendering within a set tolerance. A change that fails is not shipped.

**Fit is measured, not estimated (3.5).** The length limit on each field of a slide comes from
the geometry of its slot, and after rendering the slide is measured for overflow in the browser;
an estimate from character counts is never the last check. A new or changed layout is rendered
and shown to the composing model before it is accepted. Structured output that is still invalid
after its repair rounds fails the node; it is never shipped with a log line.

**Calibrating the judges.** The blocking rule for model judges (thirty labels, kappa 0.4) stays.
What changes is the supply of labels: one exists. Every owner or colleague reaction in the
conversation ("this is slop", "not a sentence", a thumbs-down on a slide) is recorded as a label
on the exact span, with the judge scores at that moment. The review surface shows the passage
behind every verdict so a label takes seconds. A judge that passes artifacts people reject is then
visible within a week, with numbers.

### 6.6 Self-improvement that can move

The loop stays gated in three places (shell, application, proxy; Guide 9.2). Four changes let a
real improvement pass.

1. **Fix the offline scorer.** Size is scored as a budget (inside the skill's size ceiling scores
   1.00) instead of a ratio to the incumbent, so a candidate is no longer penalized for containing
   the instruction that fixes a failure. Coverage is measured on held-out failures the candidate's
   proposer never saw.
2. **Promote on the live rung only.** The text scorer screens. Promotion requires the live rung:
   the candidate installed as an override, the frontier cases for that deliverable regenerated, the
   calibrated judges and the audit sample scoring before and after. `--score-mode live` exists and
   was not run in the November batch.
3. **Name the evaluator's rung.** Each loop records where its evaluator sits on the verification
   hierarchy (deterministic rule, calibrated judge, human label, self-assessment). A loop evaluated
   only by self-assessment proposes and never promotes.
4. **Learn from delivered work.** Every delivered artifact is archived with its request and its
   task trace, and the next similar request starts from the nearest archived one (the Forge
   archive). The procedural consolidation in 6.4 turns traces into cited skill proposals.

The first target is the deliverable the census ranks worst: `#journey`, at 0.39.

### 6.7 Cost and latency

The owner's seat matrix (6.10) decides which model writes. These levers change what each call
carries and how long a person waits.

| Lever | Basis | Where it applies |
|---|---|---|
| **Acknowledge first, then work** | The colleague review: responsiveness is why Claude wins | Every request returns an understanding and a plan in seconds; production streams as nodes complete |
| **Separate contexts per specialist** | Up to 33% of input tokens saved on long sessions | Built into the task contract: a specialist sees its inputs, not the conversation |
| **Compact tool output before it enters context** | Agents use 27% of tool output | Search results, wiki fetches and file reads return passages and paths, not bodies; the path keeps the body recoverable |
| **Batch independent tool calls** | Each tool call re-reads the whole context | Collection and retrieval steps issue calls together |
| **Stable prefix, explicit cache breakpoints** | 49% mean savings over caching alone; Opus already reads 69% from cache | Gemini seats read 4% to 5% today; their system prefix and skill mounts are made byte-stable and cached |
| **Recent exchanges plus a summary** | 91.6% completion against 71% with 63% fewer tokens | The agent's own long conversations |
| **Index the workspace** | 57% to 89% of turns in retrieval work are searches | `engagement.json` and the entity index answer "where is it" without listing |
| **Precompute what the library shows** | The colleague review: the library is slow to open | Engagement summaries are written at task end, not computed on open |
| **A budget on every task** | `BudgetCap` exists in the contract | Tokens, calls and wall time per node; the agent reports before exceeding, never after |

Targets are set in Section 9.4, confirmed by the owner, each tied to a measured baseline in 1.2.

**Prefix stability is tested (3.5).** A build test fails when the system prompt or the tool list
changes within a session. Old tool results are trimmed only once the provider's cache window has
passed, since trimming earlier pays for the cache twice.

### 6.8 Control and safety

| Control | Design | Existing base |
|---|---|---|
| **The Gate is a separate component** | Approvals, egress, budgets and namespace checks run in a process the specialists cannot instruct | `review_gate.py` already ends computer use and outbound code execution in review; proxy auth and the SSRF guard exist |
| **Three approval classes** | *None* (read, analyze, draft), *Notify* (generate, spend within budget), *Ask* (send, publish, purchase, act in a browser, write to a client system, exceed a budget) | `ApprovalGateSpec`; the 600-second review timeout |
| **An audit trail the person can read** | Per task: what was done, with which tool, at what cost, and what is planned next | `events.jsonl`, run receipts, AIR lineage |
| **Credentials as capabilities** | A specialist receives the ability to call a connector, never the secret | The agent already holds no provider key |
| **Untrusted content stays data** | Web pages, uploads and tool results are framed as untrusted at the chunk chokepoint | `untrustedFraming.ts` |
| **Anonymization at intake** | A checkbox on upload; an inspectable summary of what was masked; the map never leaves the Vault | `transcriptIntake.ts`, `/api/pii` |
| **Memory the person governs** | View, correct, forget; a list of everything the agent will do unprompted, each with a switch | New panel over the existing fact lifecycle |
| **No provider key in any browser** | Unchanged, and extended to the Character Generator, which still holds a key in its own container | `check:bundle-secrets` in the image build |

**An approval covers one exact call (3.5).** The approval record stores a hash of the tool name
and arguments. The approved call runs; a call that differs asks again. Skills written or edited
by the system never take effect on write: they enter the SkillOpt queue of 6.6 like any other
candidate.

### 6.9 The workspace

One screen. The conversation on one side, the canvas on the other. Six panels, the same six the
Perplexity client declares, because they are the right ones: **Tasks**, **Memory**, **Skills**,
**Connectors**, **Gallery**, and **New**.

- **The canvas shows the artifact being made**, at whatever stage it is in: the plan, the corpus
  with its adequacy report, the themes on the assembly board, the deck, the report.
- **Everything on the canvas is editable in place.** Click a title to rewrite it. Select text and
  ask for "more concise" or "less generic". Lock a slide, a visual or a text block so a later
  deck-wide pass leaves it alone. The August program shipped the text half of this
  (`slideTextEditing.ts`, locks, undo); it extends to every artifact kind.
- **Every visual has an editable plan.** Subject, composition, palette, style and the source
  passage it illustrates are visible and changeable before and after generation, and each visual is
  labeled Editable, Generated image, Static graphic or Chart. Strategic text is never baked into an
  image. Diagrams stay native exhibits, never image generation (the standing D17 rule).
- **Brand is one switch**: NXT, NU, DECIEM, resolved from the token mirror as today.
- **Grounding is visible.** Each answer shows whether it rests on the transcript, the research,
  the slides, the themes or public context. Each citation opens the exact passage.
- **Run mode is explicit.** Reuse only, add fresh, or full rerun, stated before the run with a
  difference report after.
- **Source weight is the person's choice.** Each source can be set to contribute nothing, its
  extracted insights or its full text, and the setting is visible beside the source (3.5).
- **One control view.** Every running, scheduled and waiting task across engagements is on one
  page, with its specialist, its cost so far and what it is waiting for (3.3).
- **Suggested next outputs.** After each deliverable the Studio places up to three cards in the
  status `suggested`, each with a one-line brief drawn from the engagement's open questions; one
  click accepts a card and nothing is generated or spent before that (3.5).
- **The report can carry its own exhibits.** A long report shows a card where an audio brief, a
  deck, a map or a table would deepen a section, and the reader generates it in place.
- **The studio is visible when the person wants it.** A task view shows which specialist is
  working on what, the verdict on each node and the cost so far. By default it is collapsed to one
  line of status.
- **Exports**: editable PowerPoint, PDF, presenter version with notes, workbook, video, audio, with
  a pre-export check that names blank slides, non-editable visuals, overflow and unverified claims.

### 6.10 Models

**The owner's seat matrix, 2026-11-10.** The owner supplied a current model matrix on the day this
plan was written and ruled out Grok. It supersedes the earlier standing directive ("Opus 5.5 for
everything except Flash") and this plan adopts it as the seat design. Opus 5.5 keeps the work it
is best at: artifacts, code and tool use.

| Seat | Work it covers | Primary | Secondary | Specialists that use it |
|---|---|---|---|---|
| `deep_reasoning` | Diagnosis, strategy logic, hard synthesis, anything that must be right on the first pass | Claude Fable 5.2 | GPT-6 Astra | Strategist, the Agent on Program plans |
| `research` | Deep document analysis across large corpora, tables and analytical frameworks | Gemini 4 Carbon | Claude Opus 5.5 | Research Lead, Analyst (depth), Brief Lead |
| `artifact` | Decks, reports, prototypes, code, UI | Claude Opus 5.5 | Claude Sonnet 5.5 | Deck Composer, Writer, Prototyper, Designer, Automation Engineer |
| `orchestration` | Planning, delegation, tool use, computer use | Claude Opus 5.5 | Gemini 4 Carbon | the Agent, Operator |
| `search` | Live web retrieval with grounding | Gemini 4 Argon | none (Grok excluded by the owner) | Research Lead (collection turns) |
| `analysis` | Semantic and sentiment classification, extraction, schema-bound output at volume | Claude Sonnet 5.5 | GPT-6.1 Terra | Analyst (breadth), Journey Cartographer, Librarian |
| `fast` | Intent routing, short classification, high-volume low-latency turns | GPT-6 Luna | Claude Haiku 5.5 | the Agent's intent router, tool-output compaction, chips and suggestions |
| `image` | Still imagery | `gpt-image-2.6-flare` (the matrix names DALL-E 3, which the account does not have) | `gemini-nano-banana-2.1` | Media Producer, Designer |
| `video` | Generated video | `sora-2` (OpenAI) and `gemini-omni-1.2-flash` (Google), per the owner on 2026-11-10; no Veo model is callable on the account | `sora-2-pro` | Media Producer |
| `verifier` | Independent review of an artifact | a model from a different vendor than the author | a second vendor, pooled | Verifier |

**What the code says today.** None of these families is in the routing registry. A search of
`proxy/model_registry.py`, `services/aiRouter.ts` and `services/claudeModelPolicy.ts` for Fable
5.2, GPT-6, Gemini 4, Haiku 5.5, Sora and Veo 3 finds only the banned `claude-fable-5` entry. The
registry tops out at Opus 5.5, Sonnet 5.5, Gemini 3.1 Pro, Gemini 3.5 Flash and GPT-5.5. The
measured baseline in 1.2 (84% of spend on Opus, 1,550 calls on Gemini 3.5 Flash) is therefore a
baseline on a model set the owner now considers out of date, and the re-tier is Phase 0 work, not
a later phase.

**How the matrix lands in the platform, without breaking it.** The platform's own rules are
reused: one routing authority, seats served from `/api/models`, no model id at any call site, a
vendor-drift registry that alarms on an unknown id, and a seat's quality overwritten by measured
pass rates. The steps:

1. Add each new model to `MODEL_REGISTRY` and `KNOWN_MODELS` with its lifecycle status, and mark
   Gemini 3.1 Pro and Gemini 3.5 Flash with successors.
2. Send one real request to each id through the proxy before it takes a seat (listing is
   confirmed below; a completed request through the platform's own door is not yet). An id that
   does not answer stays out of the seat table and its secondary serves.
3. Extend the request normalization at both chokepoints for the new families (the Claude 5.x
   contract in Guide 4.6 is the precedent: thinking controls, temperature and forced tool choice
   differ by family).
4. Run the existing bake-off harness (`eval-run.mjs --mode live --models ...`) on the regression
   set per seat, and let `applyModelMatrix` write the measured pass rates.
5. Point the four services that carry their own ids (Guide 11.2, 11.3) at `/api/models`.

**Verified against the owner's own provider accounts, 2026-11-10.** Two checks were run from inside
the running proxy container, with the keys the platform already uses: each provider's model list,
and then one real request to each new text model. All seven new models answered.

| Matrix name | Callable id | Listed | Answered a request |
|---|---|---|---|
| Claude Fable 5.2 | `claude-fable-5-2` | yes | yes |
| Claude Opus 5.5 | `claude-opus-5-5` | yes | in production use |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | yes | in production use |
| Claude Haiku 5.5 | `claude-haiku-5-5` | yes | yes |
| GPT-6 Astra | `gpt-6-astra` | yes | yes |
| GPT-6.1 Terra | `gpt-6.1-terra` | yes | yes |
| GPT-6 Luna | `gpt-6-luna` | yes | yes |
| Gemini 4 Carbon | `gemini-4-carbon` | yes | yes |
| Gemini 4 Argon | `gemini-4-argon` | yes | yes |

This corrects two doubts that web sources raised earlier the same day: secondary blogs said
Gemini 4 Carbon had no published API id and that no "GPT-6.1 Terra" existed. Both answer on the
owner's accounts. The provider's list is the authority, not a blog. What remains before seating is
the platform's own path: the same request sent through the proxy route with body normalization for
each family, which is step 2 above.

**The image seat: a first side-by-side was run.** The matrix names DALL-E 3. The OpenAI account
returns "the model 'dall-e-3' does not exist"; its current image models are the `gpt-image-2`
family up to `gpt-image-2.6`. Google lists `gemini-nano-banana-2.1` and `nano-banana-pro-preview`
beside the `gemini-3.1-flash-image-preview` the platform uses today. Three prompts were sent to
three models, one image each, and each image was opened and checked against the explicit
requirements in its prompt (the owner's complaint of 2026-10-26 was that the image model "did not
listen to the prompt").

| Prompt | Requirements checked | `gpt-image-2.6-flare` | `gemini-nano-banana-2.1` | `gemini-3.1-flash-image-preview` (current) |
|---|---:|---:|---:|---:|
| Documentary photo: advisor and student at one laptop, named clothing, notebook in the left hand, one orange mug right of the laptop, no text | 8 | 8 | 5 (not side by side; pseudo-text on posters; clutter) | 7 (a sweater, not a cardigan) |
| Flat diagram: five circles in a row in a stated color order, a line through the centers, the fourth twice the diameter | 5 | 5 | 4.5 (fourth circle about 2.6 times) | 4 (fourth circle about 1.3 times) |
| Overhead desk photo: ledger left, tablet center, three invoices right, keys at the top, nothing else, no readable text | 8 | 8 | 7 (readable "INV" and handwriting) | 6 (not overhead; "Invoice" printed on each sheet) |
| **Total** | **21** | **21** | **16.5** | **17** |
| Seconds per image | | 6 to 15 | 13 to 24 | 7 to 8 |

`gpt-image-2.6-flare` met every stated requirement in all three. The two Google models produced
the more documentary-looking photographs and broke more instructions, most often the no-text rule.
This is nine images, one run each, scored by one reader, so it is a first reading and not a
bake-off. The recommendation was to **seat `gpt-image-2.6-flare` as the image primary, keep
`gemini-nano-banana-2.1` as the secondary for documentary photography, and confirm on the
regression set before retiring the current model.** The owner confirmed this seating on
2026-11-10. That also agrees with the owner's matrix,
which names OpenAI for stills. The nine images are in `tmp/ia-image-seat-sidebyside/`.

**The video seat: Veo is not callable on this account.** Every Veo id tried returned "model is not
found", including `veo-3.1-fast-generate-preview`, which is the id the Character Generator calls
today. No Veo model appears among the 62 models the Google key lists. OpenAI returns `sora-2` and
`sora-2-pro`. Asked which to seat, the owner named two: OpenAI Sora 2 (or Sora 2 Pro) and, on the
Google side, Gemini Omni Flash (`gemini-omni-1.2-flash`), described as generating up to 15 seconds
with native audio and character consistency from up to six reference images. That id is on the
Google key's list and accepts requests; no video was generated with it here, because a video call
costs real money and was not asked for. The seating follows the work: **`sora-2` for video
overviews, and `gemini-omni-1.2-flash` for the Character Generator**, which is built on the Google
SDK and whose whole purpose is character consistency. The Character Generator's current Veo call
is presumed broken until tested (it is on the Phase 0 defect list).

**Newer ids the platform is not using.** The same list shows `gemini-3.6-flash`, `gemini-3.7-flash`
and `gemini-3.8-flash` (the platform's high-volume seat is still `gemini-3.5-flash`),
`gemini-embedding-2` (the platform uses `gemini-embedding-001`), `gemini-3.8-flash-tts`, the
`deep-research-*` models and `antigravity-preview-*`. Each is a candidate for the bake-off in step
4, not a seat change made here.

**Cross-vendor verification under this matrix.** The author of most artifacts is Opus 5.5, so the
default reviewer is Gemini 4 Carbon with GPT-6 Astra pooled on
evidence-tier deliverables. When Fable 5.2 authors, the reviewer is again non-Anthropic. The
verifier seat stays a constraint, not an id.

**Cost under this matrix.** Moving classification, sentiment and extraction to the `analysis` and
`fast` seats, and collection to `search`, takes volume off the most expensive seat by design. The
owner's matrix quotes about USD 2 per million input tokens for Sonnet 5.5 and USD 0.10 for the
small models. The Phase 0 baseline is re-run after the re-tier so that later phases are compared
with the model set that will actually be used.

---

## 7. Every current capability, and where it goes

"All current functionality" is only true if it is listed. This ledger is the list, and it is
already machine-checked on this branch: `docs/ia-transformation/build_parity_ledger.py` reads the
working tree and fails when a capability has no owner, the same pattern `artifactCatalog.ts` uses
for hashtags. Its first run on 2026-11-10 found one unowned directive (`#studyguide`, whose catalog
id is spelled `study-guide`), which is the kind of gap a prose list hides. After the fix it reports:

```
services 24 | artifacts 39 | directives 47 | mcp tools 32 | proxy route families 68 (221 routes) | skills 90 | subagents 15
whole tree: 1156 source files, 386144 lines | 434 HTTP routes across all services, 120 in services with no tests | 10 pinned invariants
PASS: every capability has an owner
```

The generated file is `docs/ia-transformation/capability-parity-ledger.json`. The tables below are
the readable form. When they and the JSON disagree, the JSON wins, because it is derived from code.

### 7.1 Services

| Service today | Lines | Disposition | What survives | What is deleted |
|---|---:|---|---|---|
| `agent` (platform agent) | 1,570 | **Becomes the Agent runtime** | `hic_door`, `threads`, `anti_hallucination`, signed webhooks | nothing |
| `research-generator` (HiC application) | 265,723 with proxy | **Becomes the Workspace UI**; its `services/` engine is imported by `studio-worker` | all 39 catalog entries, both chains, the deck loop, design desk, editing | browser-side generation calls, once the worker serves them |
| `research-proxy` | 48,238 | **Stays** as the provider door, wiki, memory, export and eval host | all 221 routes | `/api/artifact/generate` generic generator after parity; the file is split into routers in Phase 7 |
| `launchpad` | 5,924 | **Folded in** | service status, logs, metrics, the review decisions endpoint, the digest card become an Operations view in the workspace | the chat relay and the two-thread WebSocket bridge |
| `nxt-agency-backend`, `-launchpad`, `-db` | 13,760 | **Split and absorbed** | orchestration contracts, the 173 role prompts as the specialist catalog seed, computer use with its live view, the review gate, Figma and image tools | its own model map and Anthropic default (Guide 11.2), the catalog frontend, the separate database once threads live in the engagement workspace |
| `journey-mapper` | 16,339 | **Engine kept as a tool, then merged** | two-pass analysis, ingestion with transcript detection, PDF export | the server-rendered UI; HTML as an output contract (replaced by an evidence-linked journey object rendered by the native exhibit renderer) |
| `social-research-backend`, `-db` | 27,316 | **Becomes the NLP service** | BERTopic tiers, RoBERTa and aspect sentiment, SBERT merge, pgvector, the local embedding endpoint the proxy already depends on | the DeepSeek stub merge path; `gemini-2.5-pro`, `o3` and `gpt-4o` defaults |
| `social-research-frontend` | (in above) | **Retired** | its views are rebuilt as canvas views of the Analyst's outputs | the application |
| `reddit-ripper` | 2,419 | **Becomes a collector plugin** | Reddit, TrustPilot (both strategies), Play Store collectors behind the factory | the Flask UI and the PDF-only output |
| `video-analyzer` | 1,028 (service file) | **Becomes the media intake tool** | yt-dlp, Whisper with optimize and chunk, Gemini fallback, the provider banner | the UI |
| `consistent-character-generator` | 6,638 | **Becomes Media Producer tools** | character consistency flow, image edit, audio-synced video | browser-held generation and IndexedDB persistence (results move to the engagement workspace); the provider key in its container |
| `copilot-recipe-generator` | 5,483 | **Becomes the Automation Engineer** | knowledge base, templates, YAML generation, trigger phrases | hardcoded model ids written into recipes (reads seats instead) |
| `miro-generator` | 7,465 | **Becomes an export adapter** | board generator, grid layout, Miro client | the HTML parser (consumes the journey object instead) |
| `presentation-renderer` | 4,031 | **Stays** as a render target | all 14 sections | nothing |
| `video-renderer`, `video-render-mcp` | 277 plus wrapper | **Stays** | lint before queue, the explicit queue | nothing |
| Six MCP wrappers | 11,009 with agent | **Kept, then consolidated** into one tool gateway in Phase 7 | all 32 tools, same names | five containers |
| `internal-solutions-claude4-journey-mapper-v2` | 26,383 | **Deleted** (archived) | nothing; both copies are older than the live engine | the tree |
| `internal-solutions-research-generator` | 4,199 | **Deleted** (archived) | nothing | the tree, including the key-injection template |
| `linkedin`, `mulmocast`, `claude4-journey`, `openai-journey` MCP wrappers | 3,111 | **Deleted** or explicitly parked | owner decides on LinkedIn and MulmoCast (Section 11) | the two whose core services are gone |

### 7.2 Target container topology

Twenty-four services become about twelve. The count matters less than the rule: one user-facing
service, one engine, one provider door.

```
workspace-ui        the only user-facing surface (replaces 5011, 8000, 5050, 3000, 8080, 5002, 5010, 5013, 5001)
ia-agent            the Agent runtime and the Gate
studio-worker       the lifted TypeScript engine (Node)
research-proxy      provider door, wiki, memory, export, eval
tool-gateway        one MCP endpoint over every tool family
nlp                 BERTopic, sentiment, embeddings, pgvector   (+ nlp-db)
journey-engine      until merged into studio-worker
media-intake        transcription
video-renderer      HTML to MP4
presentation-renderer
sandbox             computer use with live view
```

Compose conventions carried over unchanged: one bridge network, the explicit `127.0.0.1` bind on
the proxy, skills mounted read-only into the UI and read-write into the proxy only, the wiki
mounted and never baked into an image, `pull_policy: build` on the services built from the tree,
health checks with `service_healthy` ordering extended to every dependency (today only two use it).

### 7.3 Deliverables and directives

All 39 catalog entries and all 47 directives keep their behavior. The owning specialist is new;
the owning skill and chain are unchanged.

| Family | Directives | Specialist | Engine path |
|---|---|---|---|
| Decks | `#slides` `#slide` `#strategy` `#case-study` `#presentation` `#presentations` | Deck Composer with Strategist | slide chain, deck loop, stage HTML, native PPTX; presentation renderer for `#presentation` |
| Strategy objects | `#recommendations` `#roadmap` `#gap` `#compete` `#prd` | Strategist | slide chain; HTML chain and workbook for `#prd` |
| Experience objects | `#journey` `#blueprint` `#persona` | Journey Cartographer | journey engine and native exhibits |
| Organization and technology | `#org` `#arch` `#audit` | Strategist with Designer | schema tier, native exhibits |
| Analysis | `#themes` `#meta-themes` `#mindmap` | Analyst | topic model, theme converter, mind map |
| Collection | `#deep-research` | Research Lead | research planner, source packs, deep research |
| Documents | `#report` `#brief` `#explainer` `#dossier` `#blogpost` `#approaches` `#questionnaire` `#playground` `#critique` | Writer | HTML chain |
| Study formats | `#faq` `#studyguide` `#chronology` `#flashcards` `#quiz` `#datatable` | Writer | HTML chain |
| Media | `#infographic` `#audio-overview` `#brief-dialog` `#video-overview` | Media Producer with Designer | diagram renderer, TTS, video renderer |
| Build | `#proto` `#prototypes` `#design` | Prototyper, Designer | `#proto` pipeline, design desk |
| Meta | `#help` `#artifacts` `#refine` `#dense` and all modifiers | the Agent | intent router; modifiers become task parameters |

### 7.4 Tools

| Family | Tools today | Owner |
|---|---|---|
| Research (11) | `launch_research_app` `run_deliverable` `get_job` `get_run_state` `list_artifacts` `get_run_telemetry` `list_skills` `get_skill` `recall_memory` `admit_memory` `get_digest` | Agent; `run_deliverable` re-pointed at `studio-worker` |
| Social (6) | `social_search` `social_sentiment_analysis` `social_topic_model` and three result readers | Analyst |
| Reddit and reviews (3) | `reddit_search` `reddit_get_status` `reddit_get_results` | Research Lead |
| Journey (5) | `journey_upload_file` `journey_generate_map` `journey_get_status` `journey_get_results` `journey_list_maps` | Journey Cartographer |
| Video intake (4) | `video_transcribe_youtube` `video_get_job_status` `video_get_transcript` `video_list_jobs` | Research Lead |
| Video render (3) | `lint_composition` `render_composition` `render_status` | Media Producer |
| Collection | `/api/search/*` over 1,277 sources and nine connector types, industry packs, deep research, YouTube channel polling | Research Lead |
| Analysis | topic model, weighted sentiment, knowledge graph, knowledge-gap finder | Analyst |
| Export | native PPTX, `#prd` workbook, PDF, MP3, MP4, Miro board | Deck Composer, Writer, Media Producer |
| Design | design tokens for three brands, icon system, diagram renderer, image generation, Figma, design options board | Designer |
| Action | computer use, browser, code execution, file operations, web search | Operator, behind the Gate |
| Memory and skills | memory door, skill registry and passport, brain growth | Librarian |
| Improvement | eval lane (1,063 cases, 21 judges), SkillOpt, golden set, epochs, learned constraints | Coach |

### 7.5 Things that are not features but must survive

The Claude 5.x request normalization at both chokepoints; the vendor-drift registry; the model-id
literal test; proxy auth on by default; the bundle-secrets check; the 12-stage order of the slide
chain; the three independent skill-write refusals; the memory parity fixture; `random_state=42`
determinism in clustering; the diagram style-version cache salt; the `PX2PT = 0.5` export constant;
the two export prohibitions (no full-slide raster, no layout-backed picture placeholders). Each is
a row in the parity ledger with the test that pins it.

### 7.6 Ownership is not parity: how behavior is proven

The ledger proves that every capability has an owner. It does not prove that the owner behaves the
same. That needs a second instrument, and the whole-tree scan shows why it cannot be the existing
tests: of 13 service trees, only three contain any test file (HiC 273, the MCP services 3, NXT
Agency 2). **Ten services have none, and they serve 120 of the platform's 434 HTTP routes.**

The ledger therefore records, for each of the 434 routes, the proof it needs:

| Proof | Applies to | How |
|---|---|---|
| Existing unit tests keep passing | 314 routes in the three tested trees; the 10 pinned invariants in 7.5 | Run unchanged against the new owner |
| Recorded request and response fixture | the 120 routes in untested services | Before a service is absorbed, drive it through its real UI once per route, record the traffic, and replay the recording against the new owner. REA can turn a recorded capture into a replayable tool surface and a coverage report, so this is tooling the project already has |
| Regression engagement | every deliverable and directive | The ten real engagements from Phase 0: same request, compare chain verdicts, rendered pages and exports |
| A person reads it | every phase gate | The standing rule: counts are not reading |

No service is retired until its routes are green on their proof. A route nobody can exercise is a
candidate for deletion, decided by the owner, not silently dropped.

**The unit suite was run on this branch on 2026-11-10** as the first behavioral reading, without
starting or touching any service: 243 test files, 2,511 tests, 2,510 passed, one skipped, none
failed (2,455 under `services/`, 56 under `design-desk/`). This is the pinned behavior every
phase must keep. It covers the browser-side engine only; the proxy's Python tests were not run
because they are not guaranteed to stay clear of the live runtime. The Miro Generator's Jest suite
does not start: two Jest configurations are present and, with the file named explicitly, the
`ts-jest` preset is not installed. The suite is therefore unproven today, and repairing it is added
to the Phase 0 defect list. The other services have no suites.

**The "before" side is now written down.** Two further files on this branch record current
behavior without running anything:

- `docs/ia-transformation/route-contracts.json`, from `build_route_contracts.py`. It reads every
  Python route handler with the syntax tree and records the handler, its parameters, the request
  fields it reads, the keys of the JSON it returns, the status codes it sets, the outside hosts it
  calls and its docstring. It covers **486 handlers, 454 with an observable contract**, across
  eleven trees. Example, read from the code: Social Research `POST /analyze-async` reads
  `keyword`, `subreddit`, `startDate`, `endDate`, `num_posts`, `max_comments`, `sort`,
  `index_in_pgvector`, `process_images`, `summary_limit`, `topics_limit`, `project_id` and
  `user_id`, and answers 202 with `job_id`, `project_id`, `status` and `message`. For the ten
  services with no tests, this is the only written statement of behavior that exists.
- `docs/ia-transformation/baseline-2026-11-10.json`, from `build_baseline.py`. It freezes the
  measurements of Section 1.2 and a per-engagement table (runs, model calls, spend, chain verdicts)
  for the 30 live engagements on disk, and proposes a regression set ranked by recorded activity,
  one engagement per subject.

What these two files are not: they are not recordings of live traffic, and they prove nothing
about the new system, which does not exist yet. A static contract cannot see values. They make the
later comparison possible; the comparison itself happens phase by phase.

**The regression set, proposed.** Ranked from disk; the owner confirms or replaces it.

| # | Engagement | Recorded |
|---:|---|---|
| 1 | Northeastern student and AI behaviors study | 12 runs, 503 model calls, 50 chain verdicts (10 passed) |
| 2 | Northeastern Experiential Learning Hub PRD | 10 runs, 12 chain verdicts (none passed) |
| 3 | Executive search industry analysis | 8 runs, 12 chain verdicts (6 passed) |
| 4 | Email design patterns for a skincare brand (DECIEM) | 4 runs, 5 chain verdicts (none passed) |
| 5 | AI software development and consulting landscape | 5 runs, 3 chain verdicts (none passed) |
| 6 to 10 | Five single-run engagements (market study, student AI variants, risk and market report, capabilities survey) | 1 run each, no chain verdicts |

Only five engagements have enough recorded work to be useful regression cases. The other five
places should go to engagements the owner picks for coverage the first five lack: a journey map, a
social analytics run, a `#proto`, a media deliverable and a transcript-first engagement.

---

## 8. The program

Nine phases. Each has a scope, an exit gate that is measured, and a list of what it deletes. A
phase is done when its gate passes on real engagements, read end to end by a person, not when its
code merges. Phases 1 and 2 deliver most of the experience; phases 3 to 5 deliver most of the
quality; phases 6 to 8 retire the old suite.

```
P0 Baseline --> P1 One front door --> P2 Engine on the server --> P3 The Studio
                                              |                        |
                                              +--> P4 Second brain <---+
                                                        |
                         P5 Verification <--------------+
                              |
                P6 Absorb the apps --> P7 Consolidate --> P8 Proactive and learning
```

### Phase 0. Baseline and guardrails (small)

- Write the capability parity ledger as JSON with a coverage test. **Done on this branch**
  (Section 7), including ten pinned invariants checked for an existing test; what remains is to
  wire the check into `npm run check:all`.
- Freeze the baseline in 1.2 as a script so every later phase is compared with the same
  instrument. **Done on this branch** (`build_baseline.py`, `baseline-2026-11-10.json`); it is
  re-run after the model re-tier.
- Write down current behavior for every route. **Done statically on this branch**
  (`route-contracts.json`, 486 handlers); recorded request and response fixtures for the 120 routes
  in untested services remain, and need those services running.
- Confirm the regression set. **Proposed on this branch** (Section 7.6): five engagements with real
  recorded work. The owner decided on 2026-11-10 that the other five places (journey mapping,
  social analytics, transcript-first work, prototypes, media) are filled by fresh runs in this
  phase.
- Add the failure cases the open-source analogs exhibit (3.5), one regression case each: a step
  that returns without a result, a citation that does not support its sentence, a self-written
  skill, a slide whose text overflows after rendering, structured output invalid after repair,
  and a failed job. Add the ten personal-agent scenarios (reminders, recall, secret leaks, denied
  approvals, fake progress) as the Agent's own benchmark.
- Turn on label capture in the existing chat (thumbs and a short reason on any artifact region).
  Labels start accruing before anything else changes.
- **Re-tier the models to the owner's matrix** (Section 6.10): registry entries, live probes,
  request normalization per family, bake-off per seat, then re-run the baseline.
- Restore the Miro Generator's unit suite (one Jest configuration, the `ts-jest` preset
  installed) so journey-to-Miro export has a test before Phase 6 absorbs it.
- Fix the three outward-facing defects that should not wait: the recipe generator writing retired
  model ids into deliverables, the Social Research merge path that returns empty strings, and the
  Character Generator's video call to a Veo id the Google account no longer serves.

**Exit gate:** the ledger test passes with zero unowned capabilities; every seat in the matrix is
seated on a probed model or explicitly held with a reason; the baseline script reproduces Section
1.2 and is re-run on the new model set; labels are being recorded.
**Deletes:** nothing.

### Phase 1. One front door (medium)

- The workspace gains the agent conversation as its primary surface; the Analyst Desk chat, the
  Launchpad chat and the Design Desk chat all route to the one agent runtime.
- The agent gets the server-side intent router, the engagement binding, streaming, and the four
  response classes. For Produce and Program requests it drives today's engine through the
  application's existing paths, so no engine work is needed yet.
- Transcript intake, anonymization with an inspectable summary, goal generation and the client
  follow-up email become agent capabilities reachable in plain language.
- The six panels appear, backed by existing stores: Tasks (job store and run state), Memory (fact
  store), Skills (registry), Connectors (tool list), Gallery (artifacts), New.

**Exit gate:** the colleague workflow in 1.3 completes inside one conversation, from raw
transcript to exported deck and client email, with no hashtag typed and no other tool opened;
first response under five seconds on the regression set; the agent, not the application chat,
records the turns.
**Deletes:** the Launchpad chat relay; the duplicated chat state in the Design Desk.

### Phase 2. The engine on the server (large)

- Stand up `studio-worker`; import the engine; replace the handful of browser references with
  adapters; run the existing 2,300-plus unit tests against it unchanged.
- Re-point `run_deliverable`, the job store and the application at the worker.
- Tasks become directories in the engagement workspace with a plan, a graph and an event log;
  they survive a closed tab and a restarted container.
- Delete the generic generator once all 39 entries pass parity on the regression set.

**Exit gate:** every catalog entry generates through the worker with the same chain verdicts as the
browser path on the regression set; a deck started in one browser finishes with the browser
closed; two deliverables run concurrently for the same engagement.
**Deletes:** `/api/artifact/generate`; browser-side generation.

### Phase 3. The Studio (large)

- Define the fifteen specialists as declarative files. Adopt the orchestration contract. Give each
  specialist its own context, tool allow-list and seat.
- The agent plans a task graph, shows it, runs it with validation at each transition, and resumes
  from the last good node after a failure.
- The task view shows who is doing what, verdicts and cost. Budgets are enforced per node.

**Exit gate:** a Program request ("run the research and build the deck") completes as a visible
task graph on the regression set, with input tokens per delivered artifact no higher than the
single-context baseline; a killed worker resumes without redoing completed nodes.
**Deletes:** NXT Agency's separate model map, catalog UI and standalone agent loop.

### Phase 4. The second brain (medium)

- Create the engagement entity and directory; migrate the 49 sessions into engagement workspaces
  without rewriting their evidence.
- Namespace every store by scope; make cross-scope reads explicit and logged.
- Build the entity index over the wiki with fail-soft writes; add budgeted graph-entry retrieval
  beside manifest retrieval.
- Add the two consolidation steps as proposals. Ship the Memory panel with forget.
- Label the wiki and the image library by cluster (4.2), so the entity index starts from named
  groups instead of 23,838 unlabeled pages.

**Exit gate:** zero cross-engagement citations in the regression set (checked by code); retrieval
evidence per question stays within its budget as the wiki grows; a deleted index is rebuilt from
the wiki with no loss; a person can see and remove any fact the agent holds about them.
**Deletes:** the flat hundred-fact cap as the only memory; session-slug-as-engagement.

### Phase 5. Verification (medium, starts in parallel with Phase 3)

- Stand up the Verifier as a separate role on a different vendor's seat.
- Add source reality, blocking scope match, the completeness pass and the audit sample.
- Extend rendered reading to every artifact kind.
- Run the judge calibration job on the labels accrued since Phase 0. Demote or re-prompt any judge
  whose agreement with people is below the bar; promote a judge to blocking only at the bar.
- Replace the surface-feature prose judge with a classifier trained on accepted and rejected
  documents, scored per section, and move judges to human-verified checklists (4.2).

**Exit gate:** on the regression set, no citation fails source reality; the audit sample's
estimated miss rate is reported per deliverable; at least one model judge has thirty labels and a
measured kappa; every artifact the owner rejected in Guide 0.1 is failed by at least one check when
replayed.
**Deletes:** judges that never fail and cannot be calibrated.

### Phase 6. Absorb the apps (medium, one app at a time)

Order by measured pain. Each app is absorbed when its capability passes parity as an agent
capability, then its UI is retired.

1. **Journey.** Worst measured quality. The journey becomes an evidence-linked object; the two-pass
   analysis becomes the Cartographer's method; the native exhibit renderer draws it; Miro export
   reads the object.
2. **Social analytics.** The classical stack becomes the NLP service; the Analyst plans the
   analysis; views appear on the canvas.
3. **Media.** Character consistency, image edit, transcription, video and audio become Media
   Producer and Research Lead tools; results persist in the engagement.
4. **Recipes.** The Automation Engineer, reading seats.
5. **Operations.** Status, logs and reviews as a workspace view.

**Exit gate per app:** parity on that app's regression cases; its port closed; its rows in the
ledger marked absorbed.
**Deletes:** nine user interfaces.

### Phase 7. Consolidate (small to medium)

- One tool gateway; the proxy file split into routers; every service reads seats; health checks
  and ordering on every dependency; the two dead trees and the orphan wrappers archived.

**Exit gate:** the compose file declares the target topology; `grep` finds no model id outside the
two policy modules; a fresh clone comes up healthy with one command.
**Deletes:** about twelve containers and about 34,000 lines of dormant code.

### Phase 8. Proactive and learning (medium, continuous after)

- Schedules and watches as first-class tasks; the morning note; optional messaging and voice
  channels.
- SkillOpt on the fixed scorer with live-rung promotion; procedural consolidation feeding the epoch
  queue; the delivered-artifact archive as starting points.

**Exit gate:** a scheduled research refresh runs unattended and reports a difference; at least one
skill promotion passes the live rung with a held-out win, or the loop reports honestly that none
did and why.
**Deletes:** the cadence script as a separate mechanism.

---

## 9. Acceptance

### 9.1 The owner's complaints, as tests

| Complaint (Guide 0.1) | Phase | The test that closes it |
|---|---|---|
| Copy "full of AI slop"; a `#brief` "not professional"; a quiz stem "not even a sentence" | 5 | The replayed artifacts fail a check; the prose judge has a measured kappa against labels; sentence-form and stylesheet checks run on every kind |
| Deliverables as "a lame set of cards"; decks without information parity to the source | 3, 5 | Coverage contract and completeness pass block a thin deliverable; reformat parity is measured against the source |
| "Zero diagrams which I asked for"; images that ignored the prompt; infographics with only glyphs; 22 of 24 artifacts with no image | 3, 6 | A stated request is a hard requirement on the task node; every visual has a plan tied to a passage; visual presence is a blocking check where the template expects one |
| The design system in Figma not used | 3 | The Designer is the only source of visual decisions and resolves every value from tokens |
| "That black isometric stack is awful" | 5 | Rendered reading on every exhibit, including a live stylesheet |
| Could not type in chat; a 970-second reformat; a run that looked stuck | 1, 2, 6.7 | First response in seconds; work continues in the background; a parked review is announced in the conversation |
| Opus 5.5 always, Flash only where needed; superseded 2026-11-10 by "your choice of models is out of date" and the seat matrix | 0, 6.10 | Every seat in the matrix probed and seated or explicitly held; one seats endpoint; a test fails on any id outside the registry |
| Cost not recorded | 0, 3 | Every task node carries cost; the baseline script reports spend per engagement |
| "They should be generated along with the PRD" | 3 | The agent plans prerequisite artifacts as nodes instead of refusing |
| Uploads "should always be thoroughly analyzed" | 1, 4 | Every upload gets intake analysis and enters the engagement corpus; a coverage report shows chunks used per upload |
| Every theme reflected in requirements | 5 | The completeness pass compares requirements to the assembly board |
| Evidence from other engagements | 4 | Namespace enforcement; zero cross-engagement citations |
| "Enforced for any research project"; "all other hashtag outputs" | 5 | Checks are defined per artifact tier, not per engagement or per kind |
| "Fix the system"; "implement in full" | all | Each phase gate is measured on ten engagements, not on the artifact that prompted it |
| Parity with Gemini Notebook; `#slides` the most critical artifact | 1, 3, 5 | One-click studio outputs from the agent; the deck is the first deliverable through every new gate |

### 9.2 The twelve change areas

| Area | Phase | Carried by |
|---|---|---|
| 1. Single end-to-end workspace | 1, 4 | One conversation; the engagement entity |
| 2. Transcript intake, anonymization, synthesis, goal | 1 | Brief Lead; inspectable anonymization summary |
| 3. Blend mode obvious and auditable | 1 | Explicit run mode and a difference report |
| 4. Latency and library loading | 1, 2 | Precomputed engagement summaries; acknowledge first; background tasks; latency telemetry per surface |
| 5. Visual by default | 3 | Designer plans a visual per slide; presence is checked |
| 6. No blank slides or broken layouts | 5 | Rendered reading before the person sees the deck; automatic regeneration with a visible note |
| 7. Editable visuals | 3 | Visual-type decision and labels; text never baked into images |
| 8. Inline slide editing | 1, 3 | Click to edit, rewrite selection, regenerate one slide, locks, undo, version history |
| 9. Export | 2 | Native PPTX kept; presenter and client variants; pre-export check |
| 10. Fluid, free-form chat that modifies artifacts | 1 | The Agent; intents instead of syntax |
| 11. Writing that does not read as machine output | 5 | Calibrated judges; deck-wide passes as agent intents |
| 12. Text regeneration parity with images | 1, 3 | The same per-region controls for text and visuals |

### 9.3 The sourcing rule

From the incident in 1.3, adopted without softening:

1. Every quote, named report and statistic resolves to a URL or a stored document the person can
   open.
2. No invented title, event or speaker. No real organization's name attached to a claim that is
   not in its published material.
3. A source must match the industry and situation of the claim. A real article about bank risk is
   not evidence for a private club's expense process.
4. A claim that fails is dropped, replaced with one that passes, or shown as explicitly
   illustrative on the artifact. It is never left as an assertion.
5. The agent can produce, on request, the table the user asked for: claim, source cited, URL, and
   whether the source's topic matches.

### 9.4 Targets

Confirmed by the owner as written on 2026-11-10; they are the phase exit gates. Each is measured
by the Phase 0 script.

| Measure | Baseline | Target | By phase |
|---|---|---|---|
| Time to first response | not measured; the complaint is that chat blocks | under 5 s | 1 |
| Time to a first usable partial on a Produce request | median burst 555 s before anything is complete | under 60 s, streamed | 2 |
| Chain pass rate | 30% | 70%, with the audit sample reported beside it | 5 |
| Citations failing source reality | not measured | zero on the regression set | 5 |
| Human labels | 1 | 30 per blocking judge | 5 |
| Skills firing | 9 of 90 | every skill either mounted by a specialist or deleted | 3 |
| Gemini cache read share | 0.04 to 0.05 | above 0.5 on stable prefixes | 3 |
| Spend per delivered artifact | median run USD 1.98 | no higher, with the Verifier included | 5 |
| User-facing surfaces | 11 | 1 | 6 |
| Containers | 24 | about 12 | 7 |

---

## 10. Risks, and what would make this plan wrong

| Risk | Why it is real | Guard |
|---|---|---|
| **The team costs more than it returns** | Multi-agent runs can use about fifteen times the tokens of a chat; teams often find one well-prompted agent matched them | Three of four response classes never fan out; Phase 3's gate is tokens per artifact no higher than baseline; if it fails, keep the single agent with tools and stop |
| **The engine lift stalls on hidden browser coupling** | The scan in 2.2 counts API references, not transitive imports of React components or bundler-specific loaders | Phase 2 starts with an import-graph check and a spike on `#slides`, the hardest path; the browser path stays until parity |
| **More gates, same blind spot** | New checks written by the same hands as the old ones | The audit sample and human labels are the only measures that count toward a gate; replaying the rejected artifacts is an exit test |
| **A second system grows beside the first** | That is how the suite reached eleven surfaces | Each phase names deletions; a phase without its deletion is not done |
| **Memory consolidation loses evidence** | Named in the literature as the standard failure | Evidence is never rewritten; indexes are rebuilt from the wiki as a test |
| **The working tree is lost again** | 467 uncommitted paths today; fourteen epoch records were destroyed on 2026-11-10 by one checkout | Never revert a shared file to HEAD; snapshot before any destructive command; commit by workstream as the owner approves |
| **Live sessions break during the migration** | The container has no hot reload and rebuilds interrupt runs | The new system builds on this branch in new services; the current application keeps serving until each gate passes; no rebuild under a live session |
| **Cross-vendor review is blocked by a quota or a ban** | It happened to one model family this year | The verifier seat is a constraint ("not the author's vendor"), not a model id; the one reversible quota flag pattern is kept |

**When to stop and reconsider.** If Phase 1 ships and people still leave the tool for a general
assistant, the problem is responsiveness or judgment, not architecture, and Phases 2 to 8 should
wait until that is understood.

---

## 11. Decisions the owner needs to make

Each has a recommended default, so work is not blocked.

| # | Decision | Recommended default |
|---|---|---|
| 1 | The agent's name and voice | A working name until the owner chooses; plain, direct, no persona theatrics |
| 2 | Verifier vendor for Opus-authored work | Gemini 4 Carbon as the default reviewer, GPT-6 Astra pooled on evidence-tier deliverables. No Grok |
| 2a | The image seat: DALL-E 3 does not exist on the OpenAI account | **Decided by the owner, 2026-11-10:** `gpt-image-2.6-flare` primary, `gemini-nano-banana-2.1` secondary for documentary photography |
| 2b | The video seat: no Veo model is callable on the Google account | **Decided by the owner, 2026-11-10:** `sora-2` (or `sora-2-pro`) and `gemini-omni-1.2-flash`; the Character Generator is repaired against the Google model |
| 2c | Live recordings of the 120 routes in untested services | **Decided by the owner, 2026-11-10:** not now; the static contracts stand until Phase 0 records live traffic |
| 3 | Approval class for sending email and exporting to client systems | Ask, always |
| 4 | Whether the agent may act unprompted (digest, watches, refreshes) | Notify-only at first; nothing sent or spent without a prior standing approval |
| 5 | The ten regression engagements | The owner names them in Phase 0 |
| 5a | Regression cases for the five areas with no saved engagement (journey mapping, social analytics, transcript-first work, prototypes, media) | **Decided by the owner, 2026-11-10:** fresh runs in Phase 0 |
| 5b | How to study the products whose web clients refuse automated browsers | **Decided by the owner, 2026-11-10:** read their open-source clients and clones (3.5) |
| 5c | Gamma, Genspark and the Claude web application, which refuse every automated or plain request | **Decided by the owner, 2026-11-10:** the open-source analogs suffice (Presenton, Kortix Suna, LibreChat and the Claude desktop application analysis); no further teardown |
| 6 | LinkedIn and MulmoCast wrappers | Park LinkedIn; delete MulmoCast unless a podcast format beyond the audio overview is wanted |
| 7 | Messaging and voice channels | After Phase 6; web first |
| 8 | Commit cadence on this branch | One commit per phase workstream, each on explicit approval. The owner approved the first commit on 2026-11-10: the plan and `docs/ia-transformation/` only, local, not pushed |
| 9 | The targets in 9.4 | **Confirmed by the owner as written, 2026-11-10** |
| 10 | Whether colleagues keep using the current application during the program | Yes, on the current branch, until each phase gate passes |

---

## 12. Launch record

- **Branch:** `ia-personal-agent-2026-11-10`, created 2026-11-10 from
  `hic-clarification-and-ledger-2026-08-26` at `1412a4f6c`. Creating it changed no file: the
  working tree fingerprint was identical before and after, and the source branch still points at
  the same commit.
- **State carried onto it:** 467 uncommitted paths that belong to earlier work. They are not part
  of this plan and are not to be reverted.
- **Added by this plan:** this document, plus `docs/ia-transformation/build_parity_ledger.py` and
  the ledger it generates (24 services, 39 artifacts, 47 directives, 32 MCP tools, 434 HTTP routes
  across 1,156 source files, 10 pinned invariants). The script reads files and writes one JSON file; it calls no service
  and no model. No service, compose or application code was changed.
- **Not done:** no commit, no push, no merge. Main is untouched. The NXT-Humans origin has push
  disabled.
- **First action for whoever picks this up:** the rest of Phase 0, starting with the baseline
  script and the ten regression engagements.

---

## Appendix A. Sources

**Personal agents**
- [Introducing Muse: the world's first personal AI agent built for everyone (Meta)](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)
- [Muse Wonder: a frontier model for personal and professional AI agents (Meta research)](https://research.meta.ai/blog/muse-wonder)
- [Meta Muse vs OpenClaw: the turnkey AI agent (Stark Insider)](https://www.starkinsider.com/2026/09/meta-muse-vs-openclaw-personal-ai-agent.html)
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Perplexity launches Computer (Pulse 2.0)](https://pulse2.com/perplexity-launches-computer-a-multi-model-ai-system-that-creates-and-executes-entire-workflows)
- [Hermes Agent documentation (Nous Research)](https://hermes-agent.nousresearch.com/docs)
- [Best AI agent in 2026: 11 tools compared (Simular)](https://www.simular.ai/alternatives/best-ai-agent)

**Multi-agent practice**
- [How we built our multi-agent research system (Anthropic)](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Building multi-agent systems: when and how to use them (Anthropic)](https://claude.com/resources/articles/building-multi-agent-systems-when-and-how-to-use-them)
- [Microsoft adds multi-model AI to Copilot Researcher (Computerworld)](https://www.computerworld.com/article/4152323/microsoft-adds-multi-model-ai-to-copilot-researcher-raising-accuracy-stakes.html)

**Models (web sources checked 2026-11-10; superseded the same day by the provider lists queried from the proxy container, Section 6.10)**
- [Gemini 4 Argon API: model ID, pricing, and your first request (Apidog)](https://apidog.com/blog/gemini-4-argon-api/)
- [Gemini 4 Carbon API: model ID, pricing and access (third-party site)](https://geminicarbon4.com/api/)
- [Claude Fable 5.2 vs Gemini 4 Carbon (DataCamp)](https://www.datacamp.com/blog/claude-fable-5-2-vs-gemini-4-carbon)
- [Gemini 4 Argon vs GPT-6 Astra vs Claude Opus 5.5 (Apidog)](https://apidog.com/blog/gemini-4-argon-vs-gpt-6-astra-vs-claude-opus-5-5/)
- [All model IDs (AI/ML API directory)](https://docs.aimlapi.com/api-references/model-database)

**Products documented instead of inspected**
- [Gamma developer documentation](https://developers.gamma.app/)
- [Gamma changelog](https://ideas.gamma.app/changelog)
- [Genspark's Super Agent orchestrates 150+ tools with Claude (Anthropic customer study)](https://claude.com/customers/genspark)
- [ChatGPT agent (OpenAI help)](https://help.openai.com/en/articles/11752874-chatgpt-agent)
- [Schedule recurring tasks in Cowork (Claude support)](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-cowork)
- [Gemini Notebook Studio help (Google)](https://support.google.com/notebooklm/answer/16206563)

**Second brain**
- [Karpathy shares LLM knowledge base architecture (VentureBeat)](https://venturebeat.com/data/karpathy-shares-llm-knowledge-base-architecture-that-bypasses-rag-with-an)

**Category tools**
- [Gemini Notebook (formerly NotebookLM): 2026 guide (Glasp)](https://glasp.co/articles/notebooklm-2026)
- [NotebookLM (Wikipedia)](https://en.wikipedia.org/wiki/NotebookLM)
- Open-source clients and analogs read as source (3.5):
  [gemini-notebook-mcp-cli](https://github.com/jacob-bd/gemini-notebook-mcp-cli),
  [Kortix Suna](https://github.com/kortix-ai/suna),
  [OpenManus](https://github.com/FoundationAgents/OpenManus),
  [Hermes Agent](https://github.com/NousResearch/hermes-agent),
  [OpenClaw](https://github.com/openclaw/openclaw),
  [open-notebook](https://github.com/lfnovo/open-notebook),
  [Perplexica](https://github.com/ItzCrazyKns/Perplexica),
  [Presenton](https://github.com/presenton/presenton),
  [LibreChat](https://github.com/danny-avila/LibreChat)
- [TheyDo launches analyst agent (CMSWire)](https://www.cmswire.com/the-wire/theydo-launches-analyst-agent-bringing-experience-intelligence-into-everyday-cx-decisions)
- [Best AI research synthesis tools in 2026 (Great Question)](https://cms-cloudfront.greatquestion.co/blog/best-ai-research-synthesis-tools)
- [Dovetail vs Marvin (Dovetail)](https://dovetail.com/dovetail-vs-marvin/)
- [Best AI agents for social listening and insights, 2026 (Pulsar)](https://www.pulsarplatform.com/?p=25675)
- [YouScan upgrades its AI social listening agent (MarTech Edge)](https://martechedge.com/news/youscan-upgrades-insights-copilot-for-ai-powered-social-research)
- [8 best AI presentation makers in 2026 (Simular)](https://www.simular.ai/alternatives/ai-presentation-makers)

Reliability note. Meta's architecture beyond its own announcement (memory files, cron, subagents)
comes from one third-party review. The Gemini Notebook rename is reported by several blogs and
confirmed here only by the redirect REA observed. Most category comparisons are vendor-written.
Where a claim rests on one secondary source, Section 3 says so, and no design decision in this plan
depends on such a claim alone.

**Research papers** are in `.claude/research/`; Section 4 names each one.

## Appendix B. REA evidence

- Tool: `rea-agents` through its MCP server; operation `analyze_web_bundle` over a loopback
  DevTools endpoint on a headless browser with a temporary profile, which was deleted afterwards.
- Captures, 2026-11-10: `https://www.perplexity.ai/` (116 scripts, 18 route patterns),
  `https://manus.im/app` with script origin `files.manuscdn.com` (95 scripts, 48 route
  observations, 261 endpoint candidates), `https://notebook.google.com/trynow` (11 scripts, no
  routes), `https://gamma.app/` and `https://www.genspark.ai/` (bot challenge, not analyzed).
- Second session, same day: `https://app.theydo.com/login` (143 scripts, 92 route patterns),
  `https://app.youscan.io/login` (153 scripts, 17 route patterns plus endpoint candidates),
  `https://dovetail.com/login/` (24 scripts, no routes). `chatgpt.com`, `claude.ai` and
  `genspark.ai` returned bot challenges and were not analyzed.
- Third session, same day: `analyze_javascript_application` on the installed Claude desktop
  application archive and the installed OpenAI desktop application archive, with integrity
  mismatches on native binaries recorded and continued; both reached the 300-second per-source
  limit and retained partial evidence.
- Parent evidence ids: Perplexity `ev_5c9943a5...`, Manus `ev_ee7a3b55...`, Gemini Notebook
  `ev_f6a4f51e...`, TheyDo `ev_8952550f...`, YouScan `ev_b3956a04...`, Dovetail `ev_dfb69273...`,
  Claude desktop `ev_a310cb2d...`, OpenAI desktop `ev_d4043d34...`.
- Open-source reading, 2026-11-10: nine repositories shallow-cloned at their head commits, each
  into its own folder under the session scratch directory, read statically and not executed:
  `gemini-notebook-mcp-cli` `a73d3be`, `OpenManus` `3309bf4`, `openclaw` `83872e599`,
  `open-notebook` `a6b572e`, `Perplexica` `348feca`, `presenton` `9af2b47`, `hermes-agent`
  `f19432ad`, `suna` `2c9f2d31`, `LibreChat` `e6567c7`. The Notebook client was read directly;
  the other eight by four parallel readers that cited file and line. Two inner loops live in
  packages outside their repositories (Kortix's agent core, LibreChat's graph engine) and
  Presenton's PowerPoint converter is downloaded at build time, so those three internals were
  not read. REA's browser and binary tools were not needed for source that is already public.
- Fourth session, same day: `https://chatgpt.com/` answered a plain request (no browser, no
  sign-in, an honest client string) with its page and 31 public script modules, 21 MB. REA
  `analyze_javascript_application` on the downloaded folder reached the 300-second limit; partial
  evidence `ev_12fcdba9...` was retained and exported. 200 route patterns were read from the same
  files by pattern. `gamma.app`, `genspark.ai` and `claude.ai` answered the same request with a
  challenge page and were left alone.
- Packages read as source: `@earendil-works/pi-agent-core` 1.4.0 and `@librechat/agents` 4.2.2,
  downloaded as archives and unpacked, not installed. `presenton/presenton-export` holds a readme
  and binary releases only.
- Limits, as REA states them: JavaScript was parsed, not executed; routes and endpoints are static
  candidates; reachability, permissions and server-side behavior are unverified.

## Appendix C. The whole-tree scan

`build_parity_ledger.py` walks every source file in the thirteen service trees (Python,
TypeScript and JavaScript; dependencies, build output and the wiki excluded) and records files,
lines, test files and the HTTP routes each tree serves. Run on 2026-11-10:

| Tree | Source files | Lines | Test files | HTTP routes |
|---|---:|---:|---:|---:|
| `humans-in-control-research` | 743 | 270,509 | 273 | 223 |
| `internal-solutions-socialresearch` | 124 | 27,316 | 0 | 28 |
| `NXT-Agency` | 69 | 13,760 | 2 | 39 |
| `internal-solutions-journeymapper` | 47 | 10,156 | 0 | 15 |
| `mcp-services` | 28 | 11,009 | 3 | 52 |
| `internal-solutions-video-analyzer` | 30 | 25,113 | 0 | 8 |
| `internal-solutions-presentation-renderer` | 29 | 4,031 | 0 | 0 (static renderer) |
| `internal-solutions-consistent-character-generator` | 25 | 6,725 | 0 | 9 |
| `internal-solutions-copilot-recipe-generator` | 17 | 5,383 | 0 | 11 |
| `launchpad` | 16 | 2,394 | 0 | 32 |
| `internal-solutions-miro-generator` | 16 | 7,372 | 0 | 10 |
| `internal-solutions-reddit-ripper` | 11 | 2,099 | 0 | 7 |
| `internal-solutions-video-renderer` | 1 | 277 | 0 | 0 (raw `node:http`, three routes by hand) |
| **Total** | **1,156** | **386,144** | **278** | **434** |

Three things the scan surfaced that the guide did not:

1. **NXT Agency already serves the studio's API.** Its routes include `POST /engagements`,
   `POST /engagements/{id}/decompose`, `POST /engagements/{id}/tasks/{task}/handoff`,
   `POST /engagements/{id}/tasks/{task}/verify`, `GET /approvals`,
   `POST /approvals/{id}/approve`, `GET /evidence`, `GET /decisions/{engagement}` and
   `GET /workers`. Phase 3 re-points these; it does not write them.
2. **The Miro Generator has a `/api/generate-figma` route**, so a Figma export path exists outside
   the design desk and belongs in the Designer's tool list.
3. **Model ids are scattered further than the guide recorded.** The Character Generator's source
   names twelve image and video model ids across four generations; the Launchpad and three MCP
   wrappers still name `claude-3-7-sonnet-20250219`. All of it goes behind the seats endpoint in
   the Phase 0 re-tier.

## Appendix E. What each application does for a person, and where that goes

The ledger lists routes and tools. This appendix lists functions as a person meets them, read from
each application's user interface code (component names in parentheses) and its routes.

| Application | What a person can do there today | In the new system |
|---|---|---|
| **HiC research** (51 components) | State an objective, with a guided interview (`ObjectiveInterview`, `PromptEnhancer`); upload files and get per-file summaries and suggested questions (`FileUpload`); choose source packs and subreddits (`SourcePackSelector`, `SubredditSuggester`); edit and approve a research plan (`ResearchPlanEditor`, `AnalysisCheckpoint`); watch collection live (`LiveSourceFeed`, `SourceCoverage`); browse and reuse the knowledge library with blend modes (`KnowledgeLibrary`, `ResumeEngagementPanel`); explore topics, themes and graphs (`TopicModelingPanel`, `ThemeDeepDiveModal`, `ResearchKnowledgeGraph`, `AnalystDeskKnowledgeGraph`); chat with the corpus and issue directives (`CorpusChatPanel`, `DynamicPromptChips`, `StudioPanel`); restrict sources (`SourceScopeRail`); open cited passages (`CiteChip`, `WikiArticleViewer`); view and edit slides (`SlideCanvas`, `OutputBoard`); see receipts, cost and changes (`GenerationReceipt`, `CostMeterChip`, `ChangeStrip`); give feedback (`FeedbackWidget`); review knowledge gaps and epoch proposals (`KnowledgeGapsPanel`, `EpochProposalsPanel`); dictate (`DictationButton`); run a heuristic audit (`HeuristicBriefIntake`, `HeuristicReportView`); download the PRD workbook (`PrdWorkbookCard`) | Every one of these becomes a canvas view or an agent capability in the workspace. The components are reused; what changes is that the conversation drives them and the engine behind them runs on the server |
| **Social Research** | Search Reddit by keyword and date (`AnalysisForm`, `DateRangePicker`, `PostFilter`); browse posts and comment threads (`PostCard`, `CommentThread`); run sentiment analysis with an AI summary (`AnalysisResults`, `AISummaryBox`); run topic modeling and open topic cards and details (`TopicModelingForm`, `TopicCardsGrid`, `TopicDetailModal`); see a theme mind map and summary charts (`ThemeMindmap`, `SummaryVisualization`); ask questions of an indexed subreddit (`/query`, `/chat`); prompt a synthetic customer (`SyntheticCustomerPrompt`); manage projects and saved subreddits | The Analyst plans and runs these on the NLP service; results appear as canvas views; saved projects become engagement analyses. The synthetic customer becomes an agent capability, grounded in the indexed posts |
| **Journey Mapper** | Upload transcripts, feedback, PDFs or CSVs; pick journey type, brand and model; generate a journey map; edit it by chat; remove an element; export a PDF | The Journey Cartographer, with the journey as a linked object; edit by conversation; PDF and Miro export kept |
| **Video Analyzer** | Paste a YouTube link or upload a video; watch job progress; read and download the transcript | A Research Lead tool; the transcript enters the engagement corpus with its provider recorded |
| **Character Generator** | Create a consistent character from references, name it, browse a gallery, edit images, generate audio-synced video, download (`Gallery`, `CharacterNamingModal`, `AudioSyncVideoGenerator`, `DownloadModal`) | Media Producer tools behind the proxy; the gallery becomes the engagement's media library instead of one browser's local store |
| **Copilot Recipe Generator** | Describe an agent, pick a template, choose knowledge sources, edit capabilities and topics, design a flow, preview and export the recipe (`RecipeWizard`, `TemplateGallery`, `KnowledgeSourcePicker`, `CapabilityEditor`, `TopicEditor`, `FlowDesigner`, `RecipePreview`, `ExportPanel`) | The Automation Engineer, with the wizard steps as a guided conversation and the recipe as an artifact on the canvas |
| **Reddit Ripper** | Choose a source (Reddit, TrustPilot, Play Store), start a collection, poll status, download a PDF | Collector plugins the Research Lead calls; output goes to the corpus, with PDF as an export option |
| **Miro Generator** | Upload a journey, validate it, generate a Miro board or a Figma export, download files | Export adapters on the journey object |
| **Presentation Renderer** | Read a scroll-driven presentation in 14 sections with side navigation and brand switch | Unchanged render target for `#presentation` |
| **Video Renderer** | None directly; renders compositions for `#video-overview` | Unchanged |
| **NXT Agency** | Browse 173 agents by category and search, open one, chat with it, watch computer use live, approve or reject actions (`AgentCard`, `AgentDetail`, `AgentChat`, `CategoryFilter`) | The roles become the specialist catalog; chatting with "an agent" becomes talking to the one agent, which can be asked to work in a named specialist's voice; the live view and approvals move into the task view |
| **Launchpad** | See service status, logs and metrics; open any app; chat with the platform; approve agency reviews; read the daily digest | The Operations view and the morning note; the app links disappear because there is one app |

## Appendix D. Reproducing the baseline

```bash
cd humans-in-control-research/hic-workspace
# spend, cache share, cost per run
python - <<'PY'
import json, glob, collections
rows = [json.loads(l) for f in glob.glob('sessions/**/usage.jsonl', recursive=True) for l in open(f, encoding='utf-8')]
by = collections.defaultdict(lambda: [0, 0, 0, 0.0])
for r in rows:
    m = by[r['model']]; m[0] += 1; m[1] += r['input_tokens']; m[2] += r['cache_read_tokens']; m[3] += r['cost_usd'] or 0
for k, v in sorted(by.items(), key=lambda x: -x[1][3]):
    print(k, v[0], round(v[3], 2), round(v[2] / max(1, v[1] + v[2]), 2))
PY
# gate pass rates and label count
python - <<'PY'
import json, collections
E = [json.loads(l) for l in open('telemetry/events.jsonl', encoding='utf-8') if l.startswith('{')]
pc = [e for e in E if e['kind'] == 'post_chain']
print('chain pass', sum(bool(e.get('pass')) for e in pc), 'of', len(pc))
v = collections.defaultdict(lambda: [0, 0])
for e in E:
    if e['kind'] == 'verdict': v[e['judge_id']][0] += 1; v[e['judge_id']][1] += bool(e.get('pass'))
for j, (n, p) in sorted(v.items(), key=lambda x: x[1][1] / x[1][0]): print(j, n, round(p / n, 2))
print(collections.Counter(e['kind'] for e in E))
PY
```
