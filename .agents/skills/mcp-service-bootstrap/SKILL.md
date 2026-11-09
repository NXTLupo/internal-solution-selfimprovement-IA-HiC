---
name: mcp-service-bootstrap
invocation: model
version: 1.0
description: Scaffold a new MCP wrapper + core service for the NXT Humans IA Suite. Creates the wrapper directory under mcp-services/<name>-mcp/ with a minimal JSON-RPC 2.0 server, registers it in docker-compose-all.yml on the nxt-humans-network, adds the URL to the agent's tool_services dict, and emits the agent-restart command. Encodes the 5-step ritual from AGENTS.md "Adding New Services" so it's done correctly every time.
---

# MCP Service Bootstrap

You scaffold a new MCP-exposed service in the NXT Humans IA Suite. This is a 5-step ritual documented in `AGENTS.md` — this skill executes it consistently.

## Inputs

Required args:
- `--name <service-name>` — slug, kebab-case (e.g., `pdf-extractor`). Used for dir names, container names, the tool_services key.
- `--port <host-port>` — host port for the core service (avoid 8500, 8501-8507, 5001-5013, 8080, 3000, 8000, 8081)
- `--mcp-port <host-port>` — host port for the MCP wrapper (next available 85xx)
- `--lang <python|node>` — core service language. Default: python (FastAPI).

Optional:
- `--core-path <path>` — defaults to `internal-solutions-<name>/`
- `--mcp-path <path>` — defaults to `mcp-services/<name>-mcp/`
- `--description <text>` — for the agent's tool description

## Pre-flight Checks

1. **Confirm the name is unique.** `Glob` for `mcp-services/<name>-mcp` and `internal-solutions-<name>` — neither should exist.
2. **Confirm both ports are free.** Grep `docker-compose-all.yml` for the proposed port numbers. Reject if collision.
3. **Confirm the user has authorized this.** Bootstrap creates many files; ask the user "I'm about to scaffold service `<name>` with ports core=<X> mcp=<Y> in language=<lang>. Proceed?" Wait for explicit yes before touching the filesystem.

## Sequence

### Step 1 — Core service scaffold (`internal-solutions-<name>/`)

For Python (FastAPI):
- `app.py` — minimal FastAPI app with `/health` endpoint returning `{"status": "healthy", "service": "<name>"}`
- `requirements.txt` — fastapi, uvicorn, pydantic, anthropic (only if needed), python-dotenv
- `Dockerfile` — python:3.11-slim base, layer-cached deps install, CMD uvicorn
- `.env.example` — placeholder for any API keys

For Node (Express):
- `app.js` or `app.ts` — Express + /health
- `package.json` — express, dotenv
- `Dockerfile` — node:20-alpine base, layer-cached deps install
- `.env.example`

### Step 2 — MCP wrapper (`mcp-services/<name>-mcp/`)

Always Python (consistency with existing wrappers). Files:
- `app.py` — FastAPI app implementing JSON-RPC 2.0 `tools/list` and `tools/call` at `/mcp`. Start with one placeholder tool (`<name>_ping`) that proxies to the core service's `/health`.
- `requirements.txt` — fastapi, uvicorn, httpx, pydantic
- `Dockerfile` — same pattern as core service

### Step 3 — Register in `docker-compose-all.yml`

Append two services to the file (use Edit, not Write — never overwrite the compose file):
```yaml
  <name>:
    build: ./internal-solutions-<name>
    container_name: <name>
    ports:
      - "<host-port>:<container-port>"
    environment:
      - LOG_LEVEL=INFO
    networks:
      - nxt-humans-network
    restart: unless-stopped

  <name>-mcp:
    build: ./mcp-services/<name>-mcp
    container_name: <name>-mcp
    ports:
      - "<mcp-host-port>:<mcp-container-port>"
    environment:
      - <NAME>_URL=http://<name>:<container-port>
    depends_on:
      - <name>
    networks:
      - nxt-humans-network
    restart: unless-stopped
```

### Step 4 — Register in agent's tool_services

Edit `mcp-services/agent/app.py` at line ~92 — the `tool_services` dict. Add:
```python
"<name>": os.getenv("<NAME>_MCP_URL", "http://<name>-mcp:<mcp-container-port>")
```

Add the corresponding `<NAME>_MCP_URL` to the top of the file with the other URL constants.

### Step 5 — Emit the post-scaffold checklist

Output exactly this to the user:
```
SCAFFOLD COMPLETE — service "<name>"

Files created:
  internal-solutions-<name>/app.py
  internal-solutions-<name>/requirements.txt
  internal-solutions-<name>/Dockerfile
  internal-solutions-<name>/.env.example
  mcp-services/<name>-mcp/app.py
  mcp-services/<name>-mcp/requirements.txt
  mcp-services/<name>-mcp/Dockerfile

Files edited:
  docker-compose-all.yml — added <name> + <name>-mcp services
  mcp-services/agent/app.py — added <name> to tool_services dict

NEXT STEPS (run these yourself when ready):
  1. Build: docker compose -f docker-compose-all.yml up -d --build <name> <name>-mcp
  2. Restart agent so it discovers the new tools:
       docker compose -f docker-compose-all.yml restart agent
  3. Verify tool discovery:
       docker compose -f docker-compose-all.yml logs --tail=50 agent | grep <name>
  4. Test the placeholder tool from the chat UI: the agent should now expose <name>_ping.

Now implement the real tools in mcp-services/<name>-mcp/app.py — replace the placeholder
<name>_ping with the JSON-RPC tools/call handlers your service actually needs.
```

## What this skill does NOT do

- Does not start docker compose. The user runs that.
- Does not commit. Files are staged for review only.
- Does not assume which tools the new service will expose. Only scaffolds the placeholder.
- Does not implement business logic in the core service — that's the user's job after scaffolding.

## Convention reminders

- All MCP services follow JSON-RPC 2.0 at `/mcp`.
- All services need `/health` returning `{"status": "healthy", "service": "<name>"}`.
- API keys never hardcoded — always `os.environ.get("KEY_NAME", "")`.
- New services join `nxt-humans-network`.
- Restart the agent after any MCP service change so tool definitions re-fetch.
