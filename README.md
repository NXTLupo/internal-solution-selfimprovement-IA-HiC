# IA Next

**One agent you talk to, with a studio of specialists behind it.**

IA Next is the next-generation Intelligence Augmentation system from NXT Humans. You open one page, describe
what you need in plain words, and a personal agent plans the work, hands it to specialists (research, analysis,
writing, decks, journey maps, prototypes, social listening, images and video), checks every quote against its
source, asks for your approval before anything costly, and brings the finished work back into the same
conversation.

It runs as **one container on one port (9400)**, completely separate from the original Intelligence
Augmentation suite, so you can run both on the same computer at the same time.

> **You are on the `ia-next-2026-11-17` branch.** This branch is for IA Next. The original suite (Launchpad, HiC,
> Social Research, Journey Mapper and the rest) has its own branch and guide:
> [`ia-suite-2026-11-17`](https://github.com/NXTLupo/internal-solution-selfimprovement-IA-HiC/tree/ia-suite-2026-11-17).
> The suite's code is also present in this branch, unchanged, so nothing here stops you running it.

---

## Contents

1. [At a glance](#at-a-glance)
2. [Which branch should I use?](#which-branch-should-i-use)
3. [What you need before you start](#what-you-need-before-you-start)
4. [Start IA Next, step by step](#start-ia-next-step-by-step)
5. [Ports and addresses](#ports-and-addresses)
6. [Running IA Next and the original suite side by side](#running-ia-next-and-the-original-suite-side-by-side)
7. [Using HiC's engine](#using-hics-engine)
8. [Using IA Next](#using-ia-next)
9. [Brands: NXT Humans and Northeastern](#brands-nxt-humans-and-northeastern)
10. [Approvals and cost](#approvals-and-cost)
11. [Everyday operations](#everyday-operations)
12. [Troubleshooting](#troubleshooting)
13. [How it works](#how-it-works)
14. [Where the code lives](#where-the-code-lives)
15. [Security](#security)
16. [Further reading](#further-reading)

---

## At a glance

| | |
|---|---|
| **Open it at** | **http://127.0.0.1:9400** (also http://localhost:9400) |
| **Start** | `docker compose -f ia-next/ia-next.compose.yml up -d --build` |
| **Stop** | `docker compose -f ia-next/ia-next.compose.yml down` (your work is kept) |
| **Health check** | http://127.0.0.1:9400/health |
| **Container** | `ia-next` (image `ia-next:0.1`) |
| **Your data** | Docker volume `ia-next-data` (engagements, files, memory, task history) |
| **Keys** | Read from the repository's root `.env` (the same file the suite uses) |
| **Reachable from other computers?** | No. It listens on 127.0.0.1 only, your own machine. |

---

## Which branch should I use?

| Branch | What it is for | Main address | Guide |
|---|---|---|---|
| **`ia-next-2026-11-17`** (this one) | IA Next, the personal agent and its studio | http://127.0.0.1:9400 | This README |
| `ia-suite-2026-11-17` | The original Intelligence Augmentation suite: Launchpad hub, Humans in Control (HiC), Social Research, Journey Mapper, the cowork agent and the other apps (24 containers) | http://localhost:8000 and http://localhost:5011 | That branch's README |

Both branches were cut from the same commit on 17 November 2026, so each one contains all of the code. The
difference is which system the branch is developed and documented for. Never merge either branch into `main`.

---

## What you need before you start

You need **Docker Desktop** and **Git**. Python, every library and the PowerPoint tooling are installed inside
the IA Next container; you do not install them on your computer.

| Requirement | macOS | Windows |
|---|---|---|
| Docker Desktop (includes `docker compose`) | [Download](https://www.docker.com/products/docker-desktop/) | [Download](https://www.docker.com/products/docker-desktop/), with the WSL 2 backend turned on |
| Git | Preinstalled, or `brew install git` | [Git for Windows](https://git-scm.com/download/win) (installs Git Bash) |
| Where to type commands | Terminal | **Git Bash** (recommended) or PowerShell |
| Memory for Docker | 2 GB is enough for IA Next alone; 16 GB if you also run the full suite | Same |
| Disk | About 2 GB for IA Next | Same |

Check Docker is running:

```bash
docker --version
docker compose version     # note the space: "docker compose", not "docker-compose"
docker info                # must succeed; if it fails, open Docker Desktop and wait
```

### API keys

IA Next uses three AI providers. Put the keys in a file named `.env` in the **root of the repository** (the
folder that contains `docker-compose-all.yml`). If you already run the suite, this file exists and IA Next uses
it as it is.

| Key | Needed for | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | The agent itself, writing, analysis, decks, journey maps, prototypes | **Yes** |
| `OPENAI_API_KEY` | Images, audio transcription, and the reviewer from a second vendor | **Yes** |
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | Web research with Google Search, video | **Yes** |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` | Reddit listening | Only for Reddit |
| `IA_NEXT_TASK_SPEND_APPROVAL_USD` | The spend level above which a task waits for your approval (default `3.00`) | No |
| `IA_NEXT_CHANNEL_SECRET` | The signed webhook for Slack, Teams or email bridges (off until set) | No |
| `MICROSOFT_APP_ID`, `MICROSOFT_APP_PASSWORD`, `TEAMS_TENANT_ID` | The Microsoft Teams channel (off until set) | No |

Example `.env` (use your own values; never commit this file, it is already in `.gitignore`):

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

---

## Start IA Next, step by step

### 1. Get the code

```bash
git clone https://github.com/NXTLupo/internal-solution-selfimprovement-IA-HiC.git
cd internal-solution-selfimprovement-IA-HiC
git checkout ia-next-2026-11-17
```

### 2. Create the `.env` file

Create `.env` in the repository root with the three required keys (see the table above).

- macOS or Git Bash: `nano .env`, paste, then Ctrl-O, Enter, Ctrl-X.
- Windows: `notepad .env`, paste, save. If Notepad adds `.txt`, rename the file to `.env`.

### 3. Build and start IA Next

From the repository root:

```bash
docker compose -f ia-next/ia-next.compose.yml up -d --build
```

The first build takes two to five minutes. Later starts take seconds.

### 4. Check it is healthy

```bash
curl http://127.0.0.1:9400/health
```

You should see something like:

```json
{"status":"healthy","service":"ia-next","version":"0.1.0","port":9400,
 "provider_keys_present":{"anthropic":true,"google":true,"openai":true}}
```

All three `provider_keys_present` values must be `true`. If one is `false`, that key is missing from `.env`:
add it and run step 3 again.

PowerShell users can run `Invoke-RestMethod http://127.0.0.1:9400/health` instead of `curl`.

### 5. Open it

Go to **http://127.0.0.1:9400** in your browser. The home page shows the studio's specialists, example requests,
what changed since you last looked, anything waiting for your approval, and your recent work.

---

## Ports and addresses

IA Next uses **exactly one port**.

| What | Address | Notes |
|---|---|---|
| **IA Next workspace (the page)** | **http://127.0.0.1:9400** | Bound to 127.0.0.1, so only your own computer can reach it |
| Health check | http://127.0.0.1:9400/health | Returns JSON; used by Docker's health check every 30 seconds |
| API | http://127.0.0.1:9400/api/... | The page's own API (tasks, engagements, approvals, spend, digest) |

Inside Docker the container also listens on 9400, on its own private network `ia-next-net`. It is not on the
suite's network. It reaches HiC only through the host (`host.docker.internal:5012`, HiC's proxy), for the
capabilities described in [Using HiC's engine](#using-hics-engine).

**Changing the port.** If something else on your computer already uses 9400, start IA Next on another host port:

```bash
IA_NEXT_PORT=9410 docker compose -f ia-next/ia-next.compose.yml up -d     # then open http://127.0.0.1:9410
```

(PowerShell: `$env:IA_NEXT_PORT=9410; docker compose -f ia-next/ia-next.compose.yml up -d`.) Pick a port outside
the suite's list below.

---

## Running IA Next and the original suite side by side

The two systems share the API keys in the root `.env`, and IA Next can call HiC's proxy through the host (see
[Using HiC's engine](#using-hics-engine)). You can start, stop and rebuild either one without touching the other;
IA Next works on its own when the suite is off.

| | Original suite | IA Next |
|---|---|---|
| Compose file | `docker-compose-all.yml` | `ia-next/ia-next.compose.yml` |
| Compose project name | `nxt-humans_ai_cx_workbench` | `ia-next` |
| Docker network | `nxt-humans-network` | `ia-next-net` |
| Data | the suite's volumes and `humans-in-control-research/hic-workspace/` | the `ia-next-data` volume |
| Host ports | 3000, 5001, 5002, 5004, 5010, 5011, 5012, 5013, 5014, 5015, 5050, 6080, 8000, 8080, 8081, 8201, 8500, 8501, 8502, 8503, 8504, 8507, 8508 | **9400** only |
| Calls into the other system | none | HiC's proxy through the host, optional (reads documents and images today) |

**Port check, 17 November 2026.** With all 24 suite containers and IA Next running together, every published
port was listed with `docker ps`: no port is used twice, and IA Next's 9400 is outside the suite's range. (On the
owner's workstation one more container, a SearXNG search service from a different project, uses 127.0.0.1:8890;
it belongs to neither system and does not collide with either.)

To run both:

```bash
docker compose -f docker-compose-all.yml up -d --build          # the suite (first build 15 to 30 minutes)
docker compose -f ia-next/ia-next.compose.yml up -d --build     # IA Next
```

To check for a clash yourself at any time (Git Bash, macOS or Linux):

```bash
docker ps --format '{{.Ports}}' | tr ',' '\n' | grep -o '[0-9.]*:[0-9]*->' | sort | uniq -d
```

No output means no host port is published twice.

The only shared thing is brand design: IA Next keeps a **read-only copy** of HiC's design-system tokens
(`ia-next/ia_next/brand_tokens.json`), refreshed by a script, so its decks match HiC's brands without IA Next
ever calling the suite. See [Brands](#brands-nxt-humans-and-northeastern).

---

## Using HiC's engine

IA Next can use capabilities HiC already has, by calling HiC's research proxy through the host. This was the
owner's choice on 17 November 2026: the two systems keep separate networks, data and ports, and IA Next sends the
token HiC publishes in `humans-in-control-research/hic-workspace/.runtime/config.json`, which is mounted read-only
into the IA Next container. The token is re-read on every call, because HiC makes a new one each time its proxy
starts, and it is never logged or shown.

| Capability | What it does in IA Next | Needs the suite running? |
|---|---|---|
| Reading documents and images | PDF (scanned ones too), Word, PowerPoint, Excel, JSON, XML and images dropped into the chat are read by HiC and become sources | Yes; without it the upload says so, and text, subtitle, CSV and audio files still work |
| Data packs | Name a pack or an industry ("using the healthcare data pack"): research searches that pack's publications in HiC (17 packs, from Advancement & Fundraising to Insurance) before the open web, and adds up to six of the most relevant, dated items as named sources | Yes; without it the run notes that the packs were skipped and searches the web |

When the suite is not running, IA Next says so in plain words and carries on with what it can do on its own. More
of HiC's engine (the second brain, its artifact generators) is being connected in the same way.

## Using IA Next

### The page

- **Left rail.** *New conversation*; your **Engagements** (one per piece of client work; click one to focus the
  conversation and your uploads on it); **All work** (every finished output as a card); **Memory** (what the agent
  remembers about you, which you can read and remove; a removed fact stays removed, and people who reach the agent
  through a channel have memory of their own); **Schedules**; **Spend**.
- **Conversation.** Your messages and the agent's replies. When the agent starts work, a live card shows each
  specialist's step and the money spent so far. Finished work appears inline: a report you can read, a deck
  preview with a PowerPoint download, a journey map, a prototype you can click through.
- **Message box** (pinned at the bottom). Type, drop files, or dictate where your browser supports it. Enter
  sends; Shift and Enter makes a new line.
- **Top bar.** The engagement in focus, the system's status, what this conversation has cost (its answers and the
  work it started), and today's spend for the whole studio.
- **Conversations** (in the rail) lists past conversations; click one to reopen it. Conversations are kept on the
  server, so the agent picks up a reopened conversation even after IA Next restarts.

### Things to ask for

You do not need special syntax; describe what you want. Hashtags are a shortcut the agent also understands.

| You want | Try |
|---|---|
| A researched report | "Research how US universities are improving first-year retention in 2026, for a provost." |
| A deck | "#slides for the provost from this engagement: problem, evidence, options, recommendation, next steps." |
| To change one slide | "On that deck, make slide 4's title shorter" (only that slide changes; the others stay exactly as they are) |
| A deck in Northeastern branding | "Make a short deck for the Annual Giving team using Northeastern branding." (or `#nu`) |
| A journey map | "Map the journey of a first-year student who is thinking about leaving." |
| A clickable prototype | "#proto a dashboard where gift officers see which alumni cohorts to contact next." A product with several screens comes back as ONE connected prototype; add "in Northeastern branding" for the Northeastern brand. |
| Reddit listening | "What are people on r/college saying about academic advising this year?" (needs Reddit keys) |
| Analysis of your files | Drop interview transcripts, notes, CSV or text files, then: "What do these interviews say about donor follow-up?" |
| A mind map | "#mindmap of the findings in this engagement." (drawn as a diagram in the reply) |
| An image or a short video | "Make a cover image for this deck." / "Make a five second opening clip." (video always asks for approval) |
| To find past work | "Show my recent work" or "Open the latest report." |

Each request runs as a background task. You can keep talking while it works; the card updates by itself, and a
notice appears when it finishes.

### What every output guarantees

- Every quote is checked word for word against the source it cites; a quote that is not there is removed.
- Every citation points at a real source you can open.
- Reports are reviewed by a judge from a different AI vendor than the writer.
- Decks are native, editable PowerPoint files (real text, real shapes, sources in the speaker notes), never
  pictures of slides, and each download is named after the deck.
- Prototypes start from a creative direction (concept, screens, sample data, visual language, chosen from HiC's
  catalog of 92 AI experience patterns), are built by an expert product-design skill in the brand, reviewed by a
  designer model from another vendor and revised once; they run sandboxed with no network access.

---

## Brands: NXT Humans and Northeastern

Decks, prototypes, journey maps and social analyses render in two brands, taken from HiC's design system (the Figma
library behind HiC):

| Brand | Colours | Typeface | Brand mark |
|---|---|---|---|
| **NXT Humans** (default) | Black rail, chartreuse accent, teal panels | Saira Condensed titles, Archivo text | The NXT HUMANS wordmark |
| **Northeastern** | Navy rail, Northeastern red accent, white text on red | Lato throughout | The red Northeastern N |

On decks the brand mark is drawn on the cover and in the corner of every slide as a native PowerPoint shape, so it
stays sharp and editable; prototypes, journey maps and social pages carry the same mark and colours.

- **Ask for it in words:** "Northeastern branding", "Northeastern colours", "NU" or `#nu` all select the
  Northeastern brand. Anything else is NXT Humans.
- **Change the brand of a deck you already have, at no cost:** press **Switch to Northeastern brand** (or
  **Switch to NXT Humans brand**) on the deck's card, or say "Put that deck in Northeastern branding". The same
  slides, words, images and sources are re-rendered with no new AI call. The card's detail line always names
  the brand in use.
- **When HiC's design system changes**, refresh IA Next's copy and rebuild:

  ```bash
  python ia-next/scripts/sync_brand_tokens.py
  docker compose -f ia-next/ia-next.compose.yml up -d --build
  ```

---

## Approvals and cost

- **Spend approval.** A task whose budget is above `IA_NEXT_TASK_SPEND_APPROVAL_USD` (default 3.00 USD) waits
  for you: an approval card appears in the conversation. Approve or deny it; a denied call is final. One approval
  covers one exact action, so the agent cannot reuse it for something else.
- **Send and delete.** Anything leaving the system (for example an email) and anything deleted also needs your
  approval.
- **Video** always needs approval, one approval per clip.
- **Seeing what you spend.** Today's spend is in the top bar; the **Spend** panel shows today, this week and
  spend by model. Every card shows its own cost.
- A task stops when it reaches the budget you approved.
- **Asking before new research.** When an engagement already has findings, the agent builds decks, maps and other
  outputs from them, and asks you before paying for new web research.

### Stop and Try again

- **Stop.** A running card has a **Stop** button (or say "stop that"). The server confirms at once and the card
  shows *Stopping*; the work ends after the step in flight and the card shows *Stopped* with what it spent.
  Whatever it had already written is kept.
- **Try again.** A card that did not finish (failed or stopped) has **Try again**. It starts the same request with
  the same budget. If that budget is above your approval level, an approval card appears first, because one approval
  covers one action. Pressing Try again twice starts one run, not two.

---

## Everyday operations

All commands run from the repository root.

```bash
# Status
docker compose -f ia-next/ia-next.compose.yml ps

# Follow the log
docker compose -f ia-next/ia-next.compose.yml logs -f

# Stop (your work is kept in the ia-next-data volume)
docker compose -f ia-next/ia-next.compose.yml down

# Start again
docker compose -f ia-next/ia-next.compose.yml up -d
```

### After changing IA Next's code

The code is built into the image, so rebuild after any change under `ia-next/`:

```bash
docker compose -f ia-next/ia-next.compose.yml up -d --build
```

**Do this only when nothing is running.** A restart marks any task still in progress as failed (it is never left
"running"; you can press Try again). To check:

```bash
curl -s http://127.0.0.1:9400/api/tasks | python -c "import json,sys; print([t['id'] for t in json.load(sys.stdin)['tasks'] if t['status'] not in ('done','failed')])"
```

An empty list `[]` means it is safe to rebuild.

### Run the tests

The tests are offline: no network and no AI calls. They run inside the image.

```bash
# macOS or Linux
docker run --rm -v "$PWD/ia-next/tests:/app/tests:ro" -v "$PWD/ia-next/ia_next:/app/ia_next:ro" \
  -v "$PWD/ia-next/web:/app/web:ro" -u root ia-next:0.1 python -m pytest -q -p no:cacheprovider tests

# Windows Git Bash (the two settings stop Git Bash rewriting the paths)
cd ia-next && MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(cygpath -w "$PWD/tests"):/app/tests:ro" -v "$(cygpath -w "$PWD/ia_next"):/app/ia_next:ro" \
  -v "$(cygpath -w "$PWD/web"):/app/web:ro" -u root ia-next:0.1 python -m pytest -q -p no:cacheprovider tests
```

On 17 November 2026: 182 tests, all passing.

### Back up and restore your data

```bash
# Back up the whole data volume to a dated archive in the current folder
docker run --rm -v ia-next-data:/data -v "$PWD":/backup ia-next:0.1 tar czf /backup/ia-next-data-backup.tgz -C /data .

# Restore it (stop IA Next first)
docker compose -f ia-next/ia-next.compose.yml down
docker run --rm -v ia-next-data:/data -v "$PWD":/backup ia-next:0.1 tar xzf /backup/ia-next-data-backup.tgz -C /data
docker compose -f ia-next/ia-next.compose.yml up -d
```

### Start completely fresh

```bash
docker compose -f ia-next/ia-next.compose.yml down -v     # DELETES every engagement, file, memory and task
```

---

## Troubleshooting

| What you see | What to do |
|---|---|
| The page does not open | Run `docker compose -f ia-next/ia-next.compose.yml ps`. If the container is not "healthy", read `... logs -f`. Make sure Docker Desktop is running. |
| "Port is already allocated" when starting | Something else uses 9400. Start on another port: `IA_NEXT_PORT=9410 docker compose -f ia-next/ia-next.compose.yml up -d`. |
| `provider_keys_present` shows `false` | That key is missing from the root `.env`. Add it, then run the start command again (the container reads `.env` when it starts). |
| A task failed after a restart | Restarts mark running tasks as failed. Press **Try again** on the card. |
| A deck came out in the wrong brand | Press the brand button on the deck's card, or say "Put that deck in Northeastern branding". It costs nothing. |
| A deck made before 17 November will not switch brand | Older decks did not keep their own copy of their sources. If the engagement's sources have changed since, IA Next refuses rather than write wrong source lines; ask for a new deck in the brand you want. |
| A research task is waiting | It is probably waiting for your approval: look for the approval card, or open **All work**. |
| Reddit listening fails | The Reddit keys are missing or wrong in `.env`. |
| The page looks out of date after an update | Rebuild (see above), then reload the page. |
| Running both systems is slow | The full suite needs about 16 GB for Docker. IA Next alone needs very little. |

---

## How it works

```
Your browser ──► IA Next (one FastAPI app on 127.0.0.1:9400)
                   │
                   ├─ The agent (one conversation, a fixed set of tools)
                   │    asks at most one clarifying question, starts background tasks,
                   │    reports work as done only when the task store says so
                   │
                   ├─ The studio (specialists on a background task graph)
                   │    Brief Lead, Research Lead (Google Search grounding), Analyst,
                   │    Writer and Verifier, Journey Cartographer, Deck Studio,
                   │    Social Analyst, Transcript Analyst, Prototyper, Media Producer
                   │
                   ├─ Controls: approvals for spend, send and delete; a budget per task
                   ├─ Verification: quotes checked verbatim, citations resolved,
                   │    a judge from a second vendor
                   ├─ Memory: what you have told it, behind a promotion gate you can inspect
                   └─ Storage: SQLite task graph and files in the ia-next-data volume
                   │
                   └──► AI providers (Anthropic, OpenAI, Google) using the keys in .env
```

Each piece of work is a **task** with **steps**. A step is running, then available with a result file, or failed;
a step that returns nothing counts as failed. Every output is stored under its own task, so a second report or deck
never replaces the first.

---

## Where the code lives

```
ia-next/
  ia-next.compose.yml     the one compose file for IA Next (port, network, volume)
  Dockerfile              the image: Python, python-pptx, the app and the page
  README.md               feature-by-feature status against the transformation plan
  ia_next/
    app.py                the web server: page, API routes, downloads, approvals
    agent.py              the agent: conversation, tool list, engagement focus
    studio.py             research pipeline: Brief Lead, Research Lead, Analyst, Writer, Verifier
    deck.py, deckstudio.py   the Deck Studio: slides, native PowerPoint, brands, brand switch
    brand_tokens.json     read-only copy of HiC's brand tokens (colours, typefaces, logo vectors)
    journey.py            the Journey Cartographer
    prototype.py          the Prototyper and its sandbox
    social.py             Reddit listening
    transcripts.py        uploads and transcription
    media.py              images and video
    verify.py             verification rungs (quotes, citations, bans, judge)
    control.py            approvals
    memory.py, reviewer.py   memory and the background memory reviewer
    schedule.py           scheduled work
    channels.py, teams.py the signed webhook and the Teams channel
    library.py            the read-only research library (a copy of HiC's wiki)
    regression.py         per-application regression checks
    providers.py          calls to Anthropic, OpenAI and Google, metered
    store.py              the SQLite task store and the per-engagement file area
  web/                    the page: index.html, app.js, app.css, md.js, plain.js, vendor/ (Mermaid)
  scripts/                bake-offs and sync_brand_tokens.py
  tests/                  the offline test suite
  regression/, bakeoffs/  recorded reports
```

---

## Security

- IA Next listens on **127.0.0.1 only**; other computers on your network cannot reach it.
- API keys live only in the root `.env`, which is git-ignored. Never paste keys into the page or commit them.
- Text from web pages and uploads is treated as data, never as instructions to the agent.
- Prototypes are model-written code: they run only inside a sandboxed frame (`allow-scripts`, no same-origin
  access) with a strict Content-Security-Policy.
- Anything that spends above the threshold, sends something out, or deletes something waits for your approval.

---

## Further reading

- [ia-next/README.md](ia-next/README.md): what runs today, section by section, with first live results.
- [docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md](docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md):
  the plan IA Next implements.
- The original suite's guide: the README on the
  [`ia-suite-2026-11-17`](https://github.com/NXTLupo/internal-solution-selfimprovement-IA-HiC/tree/ia-suite-2026-11-17)
  branch.

---

Proprietary software. All rights reserved.

*Branch `ia-next-2026-11-17` · IA Next 0.1 · NXT Humans*
