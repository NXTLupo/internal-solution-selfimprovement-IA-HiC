# IA Next Local: architecture audit and uplift plan (2026-11-23)

For the engineer (or agent session) who implements this. Written at the end of a long build session; every "measured"
claim below was observed on this machine between 19 and 23 Nov 2026. Read `README.md` and `LOCAL.md` (Rounds 1 to 10)
first; they are the record of what exists and why.

## 0. Verdict: do not re-architect. Fix six specific weaknesses.

The owner asked for modernization "only if needed". The audit says the architecture is sound and already matches what
current agent-engineering sources recommend: code-controlled workflows with a model in each step (not free-roaming
agents), state transitions decided by code and checked against real outputs, evidence read by manifest pointer rather
than opaque retrieval, quotes verified by code, and a held-out gate on skill changes. Replacing it with a framework
(LangGraph, CrewAI, autonomous multi-agent chat) would cost reliability on 27B-class local models and buy nothing.

What does need work, in priority order:

| # | Weakness (measured) | Workstream |
|---|---|---|
| 1 | The self-improvement loop exists but does not run: no failure is ever turned into a skill change | WS-1 |
| 2 | Prefix (KV) cache reuse is accidental; the two-model design evicts the cache on every agent-to-studio handoff | WS-2 |
| 3 | The second brain depends on containers that silently stop; 9,398 pages had no embeddings until 22 Nov | WS-3 |
| 4 | The orchestration model misroutes; five separate code guards were added in four days | WS-4 |
| 5 | Context is budgeted by characters with one fixed number; long conversations are never compacted | WS-5 |
| 6 | Artifact builders repeat the same stepped-writing pattern in four modules; fixes do not propagate | WS-6 |

Each workstream below has: evidence, the change, files and functions, acceptance test, and risk. Sequence is in
section 8. Rules that bind every workstream are in section 9.

## 1. What the research says (HiC second brain, AI Trends pack content)

Retrieved 23 Nov through `secondbrain.recall` (HiC `chunks-by-goal`). Pointers are manifest chunk ids; read them with
`GET /api/wiki/read-article/<pointer>` before relying on a claim. Treat each as a lead to verify, not a quotation.

- Serving caches: `articles/analytics-vidhya/daba8c08a0.md#c3` ("The Four Caches in LLM Serving"): KV-block reuse
  requires an identical token prefix; any edit before the divergence point discards everything after it. Basis of WS-2.
- Agent memory: `articles/ml-mastery/f3c955e91c.md#c0,#c1` ("The AI Agent Memory Stack") and
  `articles/kdnuggets/d77570c05d.md#c0` ("How to Give Your AI Agent Memory"): separate working, episodic, semantic and
  procedural memory; `articles/arxiv-cs-ir/6929b300db.md#c0` ("Agentic Memory Management Is the Next Frontier of
  Information Retrieval"): the agent decides what to write, consolidate and forget. Basis of WS-5.
- Multi-agent state: `articles/reddit-deep-r-chatgptcoding/c0d01c6279.md#c2` (a practitioner report): the harness
  that worked decoupled generation from state transitions and required real exit codes and disk read-back. IA Next
  Local already does this (`store.stage`, code checks); keep it. Basis of the verdict and WS-4.
- Judges: `social-intelligence/reddit-deep/machinelearning/1s54cvg.md#c4` (LoCoMo audit thread): an LLM judge with a
  very high false-acceptance rate. Our own evidence agrees: the reviewer scored a page 1.00 while 58 footnotes were
  broken, and 0.00 when given the wrong checklist. Basis of WS-1 (code checks outrank the judge).
- Defining "better" first: `social-intelligence/reddit-deep/artificial/1udbnfe.md#c0` (a month of optimizing with no
  metric). Basis of WS-1 step 1.
- Query expansion before retrieval: `articles/arxiv-cs-ir/b5e1914967.md#c1`. Relevant to WS-3 recall only.

The successor should run a proper pass (30 to 40 chunks across the pack's eight categories, list in the session
transcript of 22 Nov) before changing anything in WS-2 or WS-5, and add what it finds to this section.

## 2. Audit: what exists (do not rebuild)

- Agent: `agent.py` (805 lines). One orchestration model (Nemotron 30B) in a tool loop; tools come from specialist
  modules (`SPECIALIST_MODULES`); the tool list is fixed at import so the prompt prefix is stable.
- Plans: `plan.py`. Every artifact request becomes a plan card (`gate`, `build_steps`); the person starts it.
- Workflows: one module per artifact; each runs as a background task with visible steps (`store.stage`, `say`,
  `expect`). Generation is stepped (`localartifact._steps`, `journeymap.compose`) with grammar-constrained JSON
  (`providers.claude(json_schema=...)`, `localartifact.bounded`).
- Evidence: `secondbrain.material()` returns manifest chunks by pointer (budget 60,000 characters); quotes are checked
  by code (`artifacts.unverified_quotes`, `journeymap.check`).
- Memory: `memory.py` (USER.md 4,000 chars, MEMORY.md 8,000 chars, proposals gated by score and repeat recalls),
  `reviewer.py` (after each turn).
- Self-improvement parts: `skills.py` (versions, `propose`, `evaluate` on held-out cases, `promote`),
  `regression.py` (per-kind checks), `scripts/grade.py`, bake-off records in `bakeoffs/`.
- Model calls: `providers.py` line 295: `/api/chat`, `stream: False`, `keep_alive`, `num_ctx = context_for(chars,
  predict)`, temperature 0.2, seed 7. `num_ctx` changes with input size.
- Seats: `config.SEATS`. Nemotron: orchestration, search, verifier. Qwen 27B: artifact, analysis, vision. MiniCPM 2B:
  fast. Ornith: prototype seat, unused by the default path. `deep_reasoning` and `research` seats are dormant.

## 3. WS-1: make the self-improvement loop actually run (highest value)

Evidence: in four days the owner rejected artifacts for causes that code could have caught (unclosed footnotes, 9 pt
slides, trimmed sentences, blank cells, duplicate slides, a class-name collision). Every fix was made by hand. No
`skills.propose` call was ever triggered by a failure.

Change, in four steps:

1. Define "better" as a scorecard computed by code, per kind, stored with each task. New module `scorecard.py`:
   `score(task) -> {checks: [{name, passed, detail}], judge: float|None}`. Port the checks that exist only as kit
   scripts in `D:/ia-next-local-kit/out` into the app: `slides_fit2.py` (overflow, text wider than its box, smallest
   text), the export checks (PDF pages equal slides, every page has text, no ellipsis, smallest point size), tag
   balance and control characters in the page, empty cards and cells, duplicate slide titles, quotes found in
   sources, citations present. Run it at the end of every task runner and write `scorecard.json` beside the result.
   The judge score is one row in it, never the verdict.
2. Gate delivery on it. A task with a failed hard check finishes as "needs review" with the failing checks named on
   the card, not as "done". Start with hard checks limited to the ones above that have zero false positives on the
   existing engagement (`eng_ad1e84d10f22`: run the scorecard over its finished tasks first and tune).
3. Capture the owner's corrections. Add `POST /api/tasks/{tid}/feedback` {verdict, text} and a control on the card.
   Store as events (`task_feedback`). A rejection plus its scorecard is a labelled failure case.
4. Close the loop. A scheduled job (`schedule.py`, weekly, or after every N=10 finished tasks) clusters failed checks
   and rejections by kind and check name. For a prompt-fixable cluster it drafts a skill edit with the artifact model,
   calls `skills.propose`, runs `skills.evaluate` on held-out cases (extend `skills.held_out_cases` to draw from past
   briefs with saved evidence, at least five per kind), and raises an approval card. Promotion stays the owner's
   decision (existing rule). For a code-fixable cluster it files an "attention item" naming the check and examples.

Files: new `scorecard.py`; `artifacts.py`, `journey.py`, `deckstudio.py`, `diagram.py`, `videotranscript.py` (call
it); `app.py` (feedback route); `web/app.js` (card state and control); `schedule.py`; `skills.py`.
Acceptance: re-introduce the `docpage.cite` bug in a test fixture; the scorecard fails "footnotes close" and the task
ends "needs review". Ten finished tasks produce one proposal card with an evaluation table.
Risk: over-strict checks block good work. Mitigate with the tuning pass and a per-check "soft" flag.

## 4. WS-2: prefix cache reuse and model residency

Evidence: stepped persona writing dropped from a 20-minute timeout to 182 s once the material came first in every
step (prefix reuse). But `num_ctx` is recomputed per call, the agent runs on Nemotron and the studio on Qwen, and a
24 GB card holds one of them, so every handoff reloads a model and discards its cache. A deck costs 9 to 16 minutes.

Change:

1. Measure first. Log, for every `/api/chat` call, Ollama's `prompt_eval_count`, `prompt_eval_duration`, `load_duration`
   and `eval_count` into the ledger (`providers.Usage`). Add a "cache" line to the task's steps: tokens evaluated
   versus tokens sent. Without this the rest is guesswork. (A low `prompt_eval_count` relative to the prompt means the
   prefix was reused.)
2. Fix `num_ctx` per seat to two or three sizes (for example 16k, 32k, 64k) chosen from the seat, never from the
   input length. Check in Ollama's source or documentation for the installed version whether a changed `num_ctx`
   reloads the runner; it has in past versions. This repo's training-era knowledge of Ollama internals may be stale:
   look it up.
3. Canonical prompt order for every builder call: system text, then the material block (identical bytes across the
   steps of one task), then the step instruction, then the schema-specific ask. Add `prompts.build(system, material,
   step)` and route `localartifact._ask`, `journeymap._ask`, `deckstudio.build`, `diagram`, `localstudy` through it.
   Make `secondbrain.as_prompt` deterministic (sorted, no timestamps).
4. Decide model residency with a bake-off, not opinion. Option A: keep two models. Option B: Qwen for orchestration
   too (one resident model, no reload, cache survives the handoff). Run `scripts/bakeoff_seats.py` on 30 routing
   cases built from the misroutes in WS-4, measuring routing accuracy and end-to-end time. Option C, only if A and B
   both fail: serve with llama.cpp `llama-server` (explicit slots and `cache_prompt`) behind the same
   `providers.claude` interface.
5. Stream internally (`stream: True`) and feed `store._Stage.say` with tokens-so-far, so a long write shows progress
   and a runaway reply can be stopped at a limit instead of at the timeout.

Acceptance: a persona set's steps 2 to N show under 15 percent of prompt tokens evaluated; the agent-to-studio handoff
shows no model load when option B is chosen; deck time measured before and after.

## 5. WS-3: second brain reliability and recall

Evidence (22 Nov): HiC's embedder is `social-research-backend:8081` (`EMBED_PROVIDER=local`). It was stopped after a
Docker restart; recall returned nothing for hours with no visible error; 9,398 wiki pages had no chunk-store entry. A
backfill fixed it (25,675 pages, 123,842 chunks) but one worker stalled at the end and needed a proxy restart.
Builders were unaffected because they read by pointer.

Change:

1. Health that tells the truth. `GET /health/deep` in `app.py`: Ollama models present, ComfyUI, renderer, SearXNG, HiC
   proxy, HiC embedder (call `/api/wiki/embed-status` and a one-word `/api/embed`), Whisper weights. Show a quiet
   banner in the UI naming what is down and what that disables. `hic._forward` must not report a timeout as "HiC is
   not running" (it did, twice): distinguish connect failure from read timeout.
2. Local fallback for recall. When HiC's embedder is down, `secondbrain.recall` ranks the engagement's own chunks
   with `localrank` (qwen3-embedding, already used) and says so. Decide with the owner whether HiC should embed with
   Ollama's qwen3-embedding instead of depending on the Social Research container (a HiC change: needs a plan in
   `humans-in-control-research/plans/` and the 768-dimension store rebuilt).
3. Coverage as a number on the Sources panel: sources archived, chunks, embedded yes or no.
4. Recall quality: two-stage retrieval that stays manifest-first. Seed with `chunks-by-goal`, expand through
   `concepts:` and `related_chunks:` where pages carry them, rerank the candidates with the fast model or a
   cross-encoder, return pointers. Add query expansion (three variants) for broad questions.
5. Transcript chunks: `videotranscript.chunk_times` assumes chunk boundaries fall near timestamp marks. Verify on a
   one-hour recording and, if chunks split mid-paragraph, write the page with one heading per paragraph.

Acceptance: stop the Social Research backend; the banner appears within one poll, recall returns engagement chunks
with a note, and a transcript written meanwhile is embedded automatically when the backend returns (a small retry
queue in `secondbrain.archive_upload_later`).

## 6. WS-4: routing (the multi-agent layer)

Evidence: misroutes fixed by guards between 19 and 23 Nov: a report planned beside a prototype
(`named_instead_of_report`), a hashtag sent to the wrong tool, `#architecture` built as a technology audit
(`hashtag_kind`), an invented deck outline (`deckstudio.own_outline`), a transcription refused as a question because
the link held "?" (`is_question`). The model is being corrected after the fact.

Change: route in code first, model second.

1. New `router.py`: `route(message, attachments) -> {tool, kind, args, confidence, why}`. Order: hashtag table
   (`HASHTAG_TOOLS`, `HASHTAG_KINDS`); link and file type (video link or file: `transcribe_video`); named outputs
   (`plan.NAMED_OUTPUTS`); question test. A confident route produces the plan card directly with no model call: faster
   and never wrong in a new way. The model fills only free-text arguments (audience, goal) through a small schema.
2. The orchestration model handles what is left: conversation, questions answered from evidence, ambiguous asks.
3. Build the routing test set from every misroute above plus 50 real requests from the events table; run it in the
   test suite (pure functions, no model) and in the WS-2 bake-off.
4. Move the five guards into `router.py` as rules; delete the scattered copies once the tests pass.

Keep: one agent, plan cards, specialist modules as tools. Do not add agent-to-agent conversation.

## 7. WS-5 and WS-6: context, memory, and one builder engine

WS-5 (context and memory):
- Budget in tokens, per model. Replace `BUDGET_CHARS = 60_000` with a function of the seat's fixed context (WS-2)
  minus system, schema and output reserve. Count with Ollama's tokenizer endpoint or a calibrated characters-per-token
  figure per model; verify which exists in the installed version.
- Conversation compaction. `agent.py` sends `conv.messages` whole. Add: when the history passes 60 percent of the
  context, summarize the oldest turns into a pinned "so far" block (decisions, engagement ids, task ids, the person's
  stated preferences), keep the last six turns verbatim, and keep the summary byte-stable until the next compaction so
  the prefix cache holds. Tool results in history: store a one-line summary and a pointer to the full result on disk.
- Memory types, mapped to what exists: procedural (skills, WS-1), semantic (USER.md, MEMORY.md, the second brain),
  episodic (new: one line per finished task: what was asked, what was made, scorecard, the owner's verdict), read by
  `recall` when a new request resembles an old one. Add recency and use-count to `memory.entries` and retire entries
  never recalled in 60 days into an archive file (never delete).

WS-6 (one builder engine): `localartifact._steps`, `journeymap.compose`, `deckstudio.build` and `localstudy` each
implement: material first, stepped schema-bounded asks, code checks, repair, page, slides, scorecard. Extract
`builder.py` with a declarative spec per kind (steps, schemas, checks, page function, slide function). Migrate one
kind per commit, each behind its existing tests; start with personas (most stable), finish with the deck. Do this
after WS-1 so the scorecard proves each migration is not a regression. Also: remove the unused Ornith prototype path
and the dormant seats or mark them in `config.py`; rename CSS classes to prefixed names (`feedback` memory note on
class collisions).

## 8. Sequence and effort

| Order | Work | Why this order | Size |
|---|---|---|---|
| 1 | WS-2 step 1 (cache telemetry) and WS-3 step 1 (deep health) | Measurement and visibility; no behaviour change | 1 day |
| 2 | WS-1 steps 1 and 2 (scorecard, "needs review") | Stops defective artifacts reaching the owner | 2 to 3 days |
| 3 | WS-4 (router) | Removes a class of failures; pure code, testable | 2 days |
| 4 | WS-2 steps 2 to 5 (fixed contexts, prompt order, residency bake-off, streaming) | Speed, on measured ground | 3 days |
| 5 | WS-1 steps 3 and 4 (feedback, proposal loop) | Needs the scorecard and real feedback data | 3 days |
| 6 | WS-3 steps 2 to 5, WS-5 | Reliability and long sessions | 3 to 4 days |
| 7 | WS-6 (builder engine) | Largest refactor; safest last | 4 to 5 days |

## 9. Rules that bind every step

- No paid API in this build; no provider key in the container; never edit or print the keys in `.env`.
- Never commit without the owner's explicit approval; never push or merge to main; the tree is shared.
- A new governed skill version needs a held-out evaluation and the owner's approval before promotion.
- A rebuild interrupts running tasks: check `tasks` for running rows first. Rebuild command and test command are in
  `README.md` ("How to start, rebuild and test it"). Tests: 396 pass, 24 skipped at commit `82d9460c3`.
- Patch with script files, not shell heredocs: backslash escapes were mangled into control characters three times
  (`\\2\\1`, `\\b`, `\\0`). Scan for control characters before every test run.
- Read the artifact, not the metric: open the exported PowerPoint in PowerPoint and the page in a browser before
  reporting a fix. Every defect the owner found had passed its automated check.
- Check a path before writing a "new" file; back up before deleting data; HiC changes (WS-3 step 2) need their own
  plan and must not run during the owner's HiC session.
- Open decisions for the owner: one resident model or two (WS-2); HiC embedder on Ollama (WS-3); which checks are
  hard gates (WS-1); whether "needs review" artifacts are shown or held.

## 10. Implementation status (23 Nov 2026, uncommitted, awaiting the owner)

Every workstream is built and tested: 463 tests pass, 24 skipped. Nothing is committed. LOCAL.md Round 11 has the
measurements; README "The uplift of 23 Nov 2026" maps each change to its module.

| Step | Status | Notes |
|---|---|---|
| WS-1.1 scorecard | Done | `scorecard.py`; runs when a task finishes; over 71 finished tasks the remaining hard failures are true defects in older work. |
| WS-1.2 needs review | Done | Summary prefix and a page pill. Whether such work is shown or held stays an owner decision. |
| WS-1.3 feedback | Done | Good / Needs work on the card; `POST /api/tasks/{id}/feedback`. |
| WS-1.4 loop | Done | `improve.py`; candidates go through `skills.propose` and an approval card; promotion stays the owner's. |
| WS-2.1 telemetry | Done | Reuse is measured by prompt time: Ollama 0.40.16 reports the whole prompt in `prompt_eval_count` even on a cache hit. |
| WS-2.2 fixed contexts | Done | `CTX_FLOOR`. Note WS-5.1: the old three-characters-per-token count sent a full builder call to 65,536 anyway. |
| WS-2.3 prompt order | Done | `prompts.head`, used by every stepped writer. |
| WS-2.4 residency bake-off | Done | Qwen alone vs Nemotron + Qwen on 15 routing cases: median 3.4 s vs 11.9 s, model loads 0.3 s vs 250.6 s, accuracy 60 vs 53 percent as graded (80 vs 53 if `recall` counts as right for evidence questions). Owner chose Qwen alone (23 Nov); switched in `config.py`. |
| WS-2.5 streaming | Done | Inside a visible step only. |
| WS-3.1 deep health | Done | `/health/deep`, page banner, slow-HiC wording. |
| WS-3.2 local fallback | Done | No HiC change was needed: recall answers from the engagement's own sources when HiC cannot search. |
| WS-3.3 coverage | Done | Sources panel, on demand; `GET /api/engagements/{id}/sources` returns `coverage`. |
| WS-3.4 two-stage recall | Done | Measured live: HiC's search costs about 25 s per query, so rephrasings run only when the first search is thin; the rerank's array length is fixed by the grammar (the 2B model miscounted). Live recall 15 s. |
| WS-3.5 retry queue + transcripts | Done | Targeted `chunks-backfill?path_contains=` every ten minutes when the embedder is back. HiC's chunker on a one-hour transcript: joined as one block, 20 of 22 chunks split mid-sentence; as timestamped paragraphs, none. Audio uploads now use paragraphs too. |
| WS-4 router | Done | `router.py`; the named-output and brand guards moved in from plan.py and agent.py (aliases kept). |
| WS-5.1 token budgets | Done | Characters per token measured per model (`scripts/calibrate_tokens.py`). Ollama has no tokenizer endpoint and refuses (400) a prompt larger than the window rather than cutting it; chat now resends at the step the server's count needs. |
| WS-5.2 compaction | Done | Older turns summarized into the system prompt past 60 percent of the context; tool results become one line and a file after their turn. |
| WS-5.3 memory | Done | Episodic lines; recency and use counts; 60-day retirement to `MEMORY.archive.md`. The person's own instructions and USER.md are not retired: they work through the system prompt, where a use is not a recall. |
| WS-6 builder engine | Done | All builders (personas, architecture, competitive, journey map, five study pages, deck) on `builder.run`, proven byte-identical against golden records of the old loops, clean and with a failing step. |
| WS-6 Ornith | Not removed, on evidence | The plan called it unused. It is installed and the Prototyper uses it (36 calls, 13 prototype steps). Kept, with a note in `config.py`. `deep_reasoning` and `research` are marked in `DORMANT_SEATS`. |
| WS-6 CSS prefixes | Gate instead of a mass rename | Rendered every page type: no class is defined twice with different values, and only two names (`hero`, `k`) appear in both a module's sheet and the shared sheets, each on purpose. The four historical collisions were renamed on 22 Nov. `tests/test_css_collisions.py` now fails on a new one; new names take a prefix. Renaming 143 working names would risk exactly the visual defects the rename was meant to prevent. |

### Owner decisions recorded (23 Nov 2026, after section 10)

All four open decisions in section 9 are settled: one resident model (Qwen alone, switched in `config.py`); the HiC
embedder on Ollama gets its own plan first (`plans/hic-embedder-on-ollama-plan-2026-11-23.md`, nothing in HiC changed);
the hard gates stay as they are (`scorecard.HARD`); work that needs review is shown with its label, not held. The owner
also chose to keep Ornith (in use) and the stylesheet gate instead of a mass rename.

