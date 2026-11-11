# IA Next

The personal-agent system described in
[docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md](../docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md):
one agent the person talks to, with a studio of specialists behind it.

## A separate system

IA Next runs beside the existing Intelligence Augmentation suite and shares nothing with it except the
provider keys in the workbench's root `.env`.

| | Existing suite | IA Next |
|---|---|---|
| Compose file | `docker-compose-all.yml` | `ia-next/ia-next.compose.yml` |
| Compose project | `nxt-humans_ai_cx_workbench` | `ia-next` |
| Network | `nxt-humans-network` | `ia-next-net` |
| Ports | 3000, 5001 to 5015, 5050, 6080, 8000, 8080, 8081, 8201, 8500 to 8508 | 9400, on 127.0.0.1 only |
| Data | the suite's volumes and `hic-workspace/` | the `ia-next-data` volume |
| Calls into the other system | none | none |

```bash
docker compose -f ia-next/ia-next.compose.yml up -d --build   # start: http://127.0.0.1:9400
docker compose -f ia-next/ia-next.compose.yml down            # stop; the data volume is kept
docker run --rm -v "$PWD/ia-next/tests:/app/tests:ro" -u root ia-next:0.1 python -m pytest -q tests   # offline tests
```

## What runs today (version 0.1)

| Plan section | In IA Next |
|---|---|
| 6.1 The Agent | One conversation on the orchestration seat (Claude Opus 5.5) with a fixed system prompt and tool list. It asks at most one clarifying question, sends long work to the studio as a background task, and reports a task as done only when the task store says so. |
| 6.2 The Studio | Brief Lead (five required brief fields), Research Lead (Gemini 4 Argon with Google Search grounding, then reads each page), Analyst (Claude Sonnet 5.5, findings with verbatim quotes; a finding whose quote is not in its source is dropped), Writer (Claude Opus 5.5), Verifier. Specialists get the brief and their inputs, never the person's memory. |
| Phase 6, journey mapping | The Journey Cartographer (Claude Sonnet 5.5) maps one persona from an engagement's verified findings: stages, actions, touchpoints, pains and opportunities. Every pain carries a verbatim quote checked against its source; the exhibit is a CSS-grid page with no overlapping boxes. First live map: six stages, 12 quoted pains, USD 0.06. |
| Phase 6, decks | The Deck Composer (Claude Opus 5.5) writes 6 to 10 slides from verified findings: action titles (no digits, at most 12 words, checked and rewritten), verbatim pull quotes checked against sources, sources in speaker notes. Output is a native, editable PowerPoint (title placeholders, text boxes, shapes; never a picture of text), re-opened and verified after writing, plus an HTML preview. First live deck: 10 slides, 7 verified quotes, 0 open checks, USD 0.21. |
| Phase 6, images and video | The Media Producer: still images on `gpt-image-2.6-flare` (documentary photography or clean illustration, no text in the image; first live cover USD 0.10); video on `gemini-omni-1.2-flash` through the Interactions API, always behind a spend approval, one approval for one clip. |
| Phase 6, social analytics | The Social Analyst collects Reddit posts and top comments through app-only OAuth, then themes them by sentiment with verbatim quotes checked against each post; the split counts every post. First live run: 25 posts and 120 comments, 7 themes, 25 verified quotes (1 dropped), USD 0.07. |
| Phase 6, transcripts | Uploads (`POST /api/engagements/{id}/uploads`): text and subtitle files become sources; audio is transcribed on the newest OpenAI transcription model the account lists. The Transcript Analyst writes findings in the Analyst's shape, with speakers, so the Writer, Journey Cartographer and Deck Composer reuse them. First live run: 7 findings, 1 quote dropped, USD 0.01. |
| Phase 6, prototypes | The Prototyper writes one self-contained HTML page, validated against external scripts, network calls, storage and forms; it is served with a strict Content-Security-Policy inside an iframe sandboxed to `allow-scripts` only. First live prototype: a partner dashboard, 41 KB, valid first time, USD 0.71. |
| 6.3 Scheduled work | A schedule is a stored tool call plus an interval. It needs approval, advances its next run before firing, backs off on errors and pauses itself after five failures. |
| 6.1 Channels | One HMAC-signed webhook (`/api/channels/webhook`) lets a Slack, Teams or email bridge reach the same agent; a stable `person_key` links one person's conversations across channels. Approvals still wait for the person in the workspace. Off until `IA_NEXT_CHANNEL_SECRET` is set. |
| 6.6 Self-improvement | The Writer's instructions are a versioned skill. Edits are candidates that never take effect on write: a lint, then a held-out evaluation (incumbent against candidate on past work, deterministic rung plus cross-vendor judge, needs spend approval), then the person's promotion. Every version is kept for rollback. |
| 6.10 Bake-offs | `scripts/bakeoff_analysis.py` measures the analysis seat. First reading (one run, `bakeoffs/analysis-2026-11-11.json`): Gemini 4 Carbon 14 of 14 findings verbatim in 66.6 s; Claude Sonnet 5.5 13 of 14 in 15.8 s; GPT-6.1 Terra 12 of 12 in 27.9 s; Gemini 3.5 Flash 9 of 9 in 18.7 s. The seat stays on Sonnet 5.5 until more runs. |
| 6.3 Runtime | A task graph in SQLite. Each step is `running`, then `available` with a result file, or `failed`; a step that returns nothing is failed. Tasks are idempotent by key. Specialists write only inside the engagement workspace. A task interrupted by a restart is marked failed, never left "running". |
| 6.4 Second brain | `USER.md` and `MEMORY.md`, capped, entering the prompt as a snapshot taken when a conversation starts. Candidate notes are promoted only through the gate: a score, three recalls by three distinct queries, a source line, trusted origin, and at most a quarter of existing entries lost per pass. Evidence passages are full-text indexed. The person can see and forget memory. |
| 6.5 Verification | Rung 1, no model: em-dash and slop bans, every citation resolves, every quote appears verbatim in its source, no bare numbers outside quotes. Rung 2: a judge from a different vendor than the author scores a checklist drawn from the brief. One repair round; the earlier version is kept when the repair scores worse. |
| 6.7 Cost | Every call is metered into the task's ledger; a task stops when it passes its approved budget. |
| 6.8 Control | Approval classes in code: `spend` (a budget above the threshold), `send` (anything leaving the system), `delete`. An approval covers one exact call, matched by a hash of its arguments. A denied call is final. |
| 6.9 Workspace | One page: the conversation, approvals, tasks with each specialist's state, the report, and memory with forget. |
| 6.10 Models | The owner's seat matrix of 2026-11-10 as probed on 2026-11-11. No Grok. Sora is shut down, so video is Gemini Omni only. |

Every specialist above has run live except video, which waits for a spend approval by design. Still to do
from plan Section 8: the regression set per absorbed app, the remaining seat bake-offs, a messaging bridge
on the channel webhook, and retiring each old app once its regression cases pass in IA Next.
