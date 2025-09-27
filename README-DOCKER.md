# NXT HUMANS AI CX WORKBENCH — Docker Guide

This guide explains how to run, customize, and troubleshoot the full platform using Docker and Docker Compose. It covers local development, running individual apps, production‑style deployment basics, HTTPS, data persistence, and common issues on Windows, macOS, and Linux.

## Quick Start

- Install Docker Desktop (Windows/macOS) or Docker Engine + Compose v2 (Linux). Verify with `docker --version` and `docker compose version`.
- Clone the repo and create a `.env` at the repo root (see “Environment Setup”).
- Bring up the full suite (all core apps + MCP wrappers):
  - Windows/macOS/Linux: `docker compose -f docker-compose-all.yml up -d --build`
- Open services:
  - Launchpad: http://localhost:8000
  - Journey Mapper (Claude 3.7): http://localhost:8080
  - Social Research UI: http://localhost:3000
  - Social Research API: http://localhost:8081
  - Reddit Ripper: http://localhost:5001
  - Video Analyzer: http://localhost:5002
  - LinkedIn Generator: http://localhost:5003
  - Claude 4 Journey Mapper: http://localhost:8095
  - Agent Orchestrator (MCP): http://localhost:8500

Stop everything and remove containers (keep data volumes):
- `docker compose -f docker-compose-all.yml down`

Stop and remove including volumes (wipe data):
- `docker compose -f docker-compose-all.yml down -v`

Tail logs for a specific service (example: `launchpad`):
- `docker compose -f docker-compose-all.yml logs -f launchpad`

## Environment Setup (.env)

Create a `.env` file at the repository root to keep secrets and tune ports. Compose files interpolate variables from this file.

Recommended keys:

```
# Required API Keys (replace with your real keys)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
ELEVENLABS_API_KEY=

# Ports (override if already in use)
LAUNCHPAD_PORT=8000
JOURNEY_MAPPER_PORT=8080
SOCIAL_RESEARCH_PORT=3000
SOCIAL_RESEARCH_BACKEND_PORT=8081
REDDIT_RIPPER_PORT=5001
VIDEO_ANALYZER_PORT=5002
LINKEDIN_GENERATOR_PORT=5003
MIRO_GENERATOR_PORT=5004
IMAGE_CAPTIONER_PORT=5005
FLUX_LORA_STUDIO_PORT=5006
PRESENTATION_GENERATOR_PORT=5007
AMAZON_MARKET_INTELLIGENCE_PORT=5008
SOUNDTRACK_GENERATOR_PORT=5009
CONSISTENT_CHARACTER_GENERATOR_PORT=5010
AGENT_ORCHESTRATOR_PORT=8500
REDDIT_MCP_PORT=8501
SOCIAL_MCP_PORT=8502
JOURNEY_MCP_PORT=8503
VIDEO_MCP_PORT=8504
CLAUDE4_JOURNEY_MAPPER_PORT=8095
CLAUDE4_JOURNEY_MCP_PORT=8506
```

Security notes:
- Never commit your `.env` with real keys.
- Prefer `.env` over embedding keys in compose files. If you see plain keys in a compose file, override them with your `.env` values or add a local override file as described below.

## Compose Files: What to Use When

- `docker-compose-all.yml` — Full platform (recommended default for local runs). Defines services, volumes, and a bridge network.
- `docker-compose-all.override.yml` — Optional overrides for the full stack. Use with: `docker compose -f docker-compose-all.yml -f docker-compose-all.override.yml up -d`.
- `docker-compose-claude4.yml` — Claude 4 Journey Mapper + MCP wrapper only.
- `docker-compose-amazon.yml` — Amazon market intelligence app and its dependencies (external network expected, see notes below).
- `docker-compose-amazon-only.yml` — Only the Amazon app (no external deps).
- `docker-compose-video.yml` and `docker-compose-video-fixed.yml` — Video analyzer + MCP wrapper variations.
- `docker-compose-agent.yml` — Developer-focused stack that builds from local directories (journey-mapper, reddit-ripper, etc.).
- `dynamic-compose.yml` — Parameterized, environment-driven subset stack useful for ad-hoc runs.
- `docker-compose-https.yml` — Nginx TLS termination for HTTPS on high ports (8443–8454). Requires an external network and SSL certs.

Tip: Compose v2 merges multiple files left-to-right, later files override earlier ones. Example:
`docker compose -f docker-compose-all.yml -f docker-compose-all.override.yml up -d`

## Starting Common Stacks

Full platform (recommended):
- `docker compose -f docker-compose-all.yml up -d --build`

Claude 4 Journey stack:
- `docker compose -f docker-compose-claude4.yml up -d --build`
- Open MCP: http://localhost:${CLAUDE4_JOURNEY_MCP_PORT:-8506}
- Open App: http://localhost:${CLAUDE4_JOURNEY_MAPPER_PORT:-8095}

Amazon market intelligence:
- `docker compose -f docker-compose-amazon.yml up -d --build`
- Open: http://localhost:${AMAZON_MARKET_INTELLIGENCE_PORT:-5008}
- Note: This compose expects an external network named `nxt-humans_ai_cx_workbench_nxt-humans-network`. If missing, create it:
  - `docker network create nxt-humans_ai_cx_workbench_nxt-humans-network`

Video analyzer stack:
- `docker compose -f docker-compose-video-fixed.yml up -d --build`
- Open: http://localhost:${VIDEO_ANALYZER_PORT:-5002}

Agent + wrappers + core (developer build):
- `docker compose -f docker-compose-agent.yml up -d --build`

Dynamic subset (param-driven):
- `docker compose -f dynamic-compose.yml up -d`

## HTTPS (Nginx TLS Proxy)

Use `docker-compose-https.yml` to expose HTTPS on ports 8443–8454 via Nginx.

Prerequisites:
- Create an external network used by both the HTTPS proxy and your app stack:
  - `docker network create nxthumans_ai_cx_workbench_nxt-humans-network`
- Prepare `ssl-certs` directory at repo root with `fullchain.pem` and `privkey.pem` (or compatible cert/key names used by the Nginx config).
- Provide `nginx-simple.conf` at repo root with upstream mappings. A simple mapping example (abbrev):

```
stream {
  upstream launchpad_upstream { server launchpad:8000; }
  server { listen 8443 ssl; proxy_pass launchpad_upstream; }
  # Repeat per service/port…
}
```

Bring up the proxy:
- `docker compose -f docker-compose-https.yml up -d`

Launch your main stack on the same external network (example with Claude 4):
- `docker compose -f docker-compose-claude4.yml up -d`

Access over HTTPS (examples):
- Launchpad: https://localhost:8443
- Journey Mapper (Claude 4): https://localhost:8445

## Windows / macOS / Linux Notes

- Windows: Use WSL2 backend in Docker Desktop for best performance. On PowerShell, use `docker compose` (space) not `docker-compose` (hyphen) unless you installed the legacy plugin.
- File sharing: Ensure your repo drive is shared in Docker Desktop settings.
- Line endings: Avoid CRLF issues in shell scripts; run `git config core.autocrlf input` on Windows when collaborating with Unix scripts.
- Ports already in use: Change exposed ports via your `.env` (e.g., set `SOCIAL_RESEARCH_PORT=3100`) and restart.

## Data, Volumes, and Backups

Persistent volumes are defined for databases and upload/output folders. In `docker-compose-all.yml` you’ll see volumes such as:
- `social-research-db-data` (PostgreSQL + pgvector)
- `journey-uploads`, `claude4-journey-uploads`
- `linkedin-generator-uploads`, `linkedin-generator-generated`
- `miro-generator-uploads`, `miro-generator-output`, etc.

List volumes:
- `docker volume ls`

Backup a Docker volume to a tarball (PowerShell example):
- `docker run --rm -v social-research-db-data:/v -v ${PWD}:/backup alpine sh -c "cd /v && tar czf /backup/social-research-db-data.tgz ."`

Restore (PowerShell):
- `docker run --rm -v social-research-db-data:/v -v ${PWD}:/backup alpine sh -c "cd /v && tar xzf /backup/social-research-db-data.tgz"`

Remove unused resources (dangerous, frees space):
- `docker system prune -a` (removes unused images, containers, and networks)
- `docker volume prune` (removes dangling volumes – be careful)

## Rebuilds, Updates, and Scaling

- Rebuild a service after code changes:
  - `docker compose -f docker-compose-all.yml up -d --build <service>`
- Restart a service without rebuild:
  - `docker compose -f docker-compose-all.yml restart <service>`
- Scale stateless services (example):
  - `docker compose -f docker-compose-all.yml up -d --scale reddit-ripper=2`

## Observability and Health

- Show running containers in a stack:
  - `docker compose -f docker-compose-all.yml ps`
- Live logs:
  - `docker compose -f docker-compose-all.yml logs -f`
- Resource usage:
  - `docker stats`
- Process list:
  - `docker top <container>`

Some services include `healthcheck` (e.g., variants of `agent`). If health checks fail, check logs and dependent services.

## Networking and the Agent Hostname

Most stacks use an internal bridge network so services can reach each other by name (e.g., `agent`, `journey-mapper`). If you see connection issues to the `agent` service from `launchpad`, you can optionally run the helper script to add/refresh `extra_hosts` entries:

- `python update_docker_hosts.py --restart`

This ensures `launchpad` can resolve `agent` to the current container IP when using certain compose variants. Prefer native service DNS when possible; use this script only if you hit name-resolution issues.

## Proxy / Corporate Network

If you are behind a proxy, add these to your `.env` and compose service `environment` as needed:

```
HTTP_PROXY=http://proxy.yourcorp:8080
HTTPS_PROXY=http://proxy.yourcorp:8080
NO_PROXY=localhost,127.0.0.1,*.internal,*.docker
```

Some services run `pip install` or `npm install` at container start; ensure proxy configuration allows outbound traffic.

## Common Issues and Fixes

- Ports already in use: Change the host port in `.env` and re‑run `up -d`.
- External network missing (for HTTPS or specialized stacks): Create it with `docker network create nxt-humans_ai_cx_workbench_nxt-humans-network`.
- Slow container startup on Windows: Enable WSL2; keep the repo on the WSL filesystem for speed.
- “Module not found” after code changes: Rebuild the affected service with `--build` and/or clear cached images: `docker compose -f … down && docker compose -f … up -d --build`.
- Python build tools missing: Some services install build deps at startup (`apt-get install …`). If these steps fail, confirm network access and retry `up -d --build`.

## Running Individual Apps (Selected Examples)

Journey Mapper (Claude 3.7):
- `docker compose -f docker-compose-agent.yml up -d journey-mapper`
- Open: http://localhost:${JOURNEY_MAPPER_PORT:-8080}

Claude 4 Journey Mapper:
- `docker compose -f docker-compose-claude4.yml up -d claude4-journey-mapper`
- Open: http://localhost:${CLAUDE4_JOURNEY_MAPPER_PORT:-8095}

Social Research (Frontend + Backend + DB):
- `docker compose -f docker-compose-all.yml up -d social-research-db social-research-backend social-research-frontend`
- UI: http://localhost:${SOCIAL_RESEARCH_PORT:-3000}
- API: http://localhost:${SOCIAL_RESEARCH_BACKEND_PORT:-8081}

Amazon Market Intelligence:
- `docker compose -f docker-compose-amazon.yml up -d`
- http://localhost:${AMAZON_MARKET_INTELLIGENCE_PORT:-5008}

Video Analyzer + MCP:
- `docker compose -f docker-compose-video-fixed.yml up -d`
- http://localhost:${VIDEO_ANALYZER_PORT:-5002}

## Housekeeping

- Update images to latest base layers: `docker pull <image>` or rebuild your local images with `--build`.
- Remove one service and its volumes: `docker compose -f docker-compose-all.yml rm -s -f -v <service>`
- Clean dangling images: `docker image prune`

## Where to Look in This Repo

- Top-level compose files:
  - `docker-compose-all.yml`
  - `docker-compose-all.override.yml`
  - `docker-compose-claude4.yml`
  - `docker-compose-amazon.yml`, `docker-compose-amazon-only.yml`
  - `docker-compose-video.yml`, `docker-compose-video-fixed.yml`
  - `docker-compose-agent.yml`
  - `dynamic-compose.yml`
  - `docker-compose-https.yml`
- App directories with Dockerfiles and configs:
  - `internal-solutions-journeymapper/`
  - `internal-solutions-claude4-journey-mapper/`
  - `internal-solutions-socialresearch/`
  - `internal-solutions-reddit-ripper/`
  - `internal-solutions-video-analyzer/`
  - `internal-solutions-scrapehero-amazon/`
  - `mcp-services/*`

If you want deeper service-specific instructions, check READMEs within each app directory.

