# Quick Start (beginner, ~5 commands)

The short version. For the full walkthrough, optional keys, and troubleshooting, see
[README.md](README.md).

## 1. Install the two things you need

- **Docker Desktop** - https://www.docker.com/products/docker-desktop (install it, then **open it
  and wait until it says "running"**).
- **Git** - https://git-scm.com/downloads

You also need **3 free AI API keys** (sign up, create a key, copy it):
- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com
- Google Gemini: https://aistudio.google.com/apikey

## 2. Get the code

```bash
git clone https://github.com/NXTLupo/internal-solution-selfimprovement-IA-HiC.git
cd internal-solution-selfimprovement-IA-HiC
git checkout self-improvement-ia-2026-05-29
```

A fresh clone already contains everything: all app source, the vendored **NXT-Agency** cowork
(computer-use) agent, and the HiC knowledge base. Nothing lives outside this repo.

## 3. Add your keys

Copy the template to a real `.env` file, then paste your 3 keys into it:

```bash
cp .env.example .env       # Windows: copy .env.example .env
```

Open `.env` in any text editor and fill in the three `..._API_KEY` lines at the top. Save.
(`.env` is gitignored - never commit it.)

## 4. Start everything (one command)

```bash
docker compose -f docker-compose-all.yml up -d --build
```

**First run takes 15-30 minutes** (it downloads large images once, including the cowork agent's
browser). Later starts take seconds. Leave it running.

Windows users can instead double-run `start-platform.ps1` (it auto-starts Docker and checks keys).

## 5. Open the apps

| What | URL |
|------|-----|
| **Launchpad hub** (start here) | http://localhost:8000 |
| **Humans in Control** research workbench | http://localhost:5011 |
| **NXT-Agency cowork chatbot** (the computer-use agent) | http://localhost:5050 |
| **Watch the cowork agent's live browser** (noVNC) | http://localhost:6080 |
| Social Research analytics | http://localhost:3000 |
| Character / Persona generator | http://localhost:5010 |

The **NXT-Agency cowork chatbot** at `:5050` is the agent that operates the tools for you through a
live browser - open `:6080` in a second tab to watch it work.

## Stop / restart

```bash
docker compose -f docker-compose-all.yml down     # stop everything
docker compose -f docker-compose-all.yml up -d    # start again (no rebuild needed)
```

## If something is off

- **A page won't load right after starting:** the build may still be running. Check with
  `docker compose -f docker-compose-all.yml ps` (look for "running"/"healthy").
- **Port already in use:** run `python port_scanner.py --fix` then start again.
- **See logs for one service:** `docker compose -f docker-compose-all.yml logs -f <name>`
  (e.g. `nxt-agency-backend`, `hic-research`).
