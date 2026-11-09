---
name: hic-rebuild-verify
invocation: human
version: 1.0
description: Rebuild the Humans-in-Control research-generator Docker container after any frontend edit, then verify the new dist is actually being served by curling the bundle and grepping for a marker string. Use when the user makes any change inside humans-in-control-research/ (components, services, styles, App.tsx, index.html, vite.config.ts) and asks to "rebuild", "see the change", "verify it shipped", or "is it live yet". HiC's container is nginx serving a static Vite dist — there is no HMR — so every code change requires a full image rebuild. This skill enforces that workflow end-to-end.
disable-model-invocation: true
---

# HiC Rebuild + Verify Protocol

Single canonical workflow for shipping a code change inside `humans-in-control-research/` to the running Docker stack and proving it actually landed.

## Why this exists

The `research-generator` container at port 5011 is nginx serving a pre-built `dist/`. There is no Vite HMR inside Docker. Three failure modes recur and waste hours:

1. Code is edited locally but never rebuilt — user tests stale dist.
2. Container is rebuilt but browser cache serves stale bundle — user thinks the change is broken.
3. Bundle is regenerated but a new hash is produced and an old script reference lingers in the served HTML.

This skill is the antidote.

## The workflow

Run all five steps. Skipping verification is the single most common cause of "the change isn't working" debugging spirals.

### 1. Build & start the container (with --build)

```powershell
docker compose -f d:\NXT-HUMANS_AI_CX_WORKBENCH\docker-compose-all.yml up -d --build research-generator
```

Expect ~60-90 seconds. The build runs `npm install --legacy-peer-deps && npm run build` inside the multi-stage Dockerfile, then copies `dist/` into the nginx layer.

### 2. Confirm the container came back healthy

```powershell
docker compose -f d:\NXT-HUMANS_AI_CX_WORKBENCH\docker-compose-all.yml ps research-generator
```

Status should be `running`, port mapping `0.0.0.0:5011->80/tcp`. If it shows `restarting` or `exited`, run:

```powershell
docker compose -f d:\NXT-HUMANS_AI_CX_WORKBENCH\docker-compose-all.yml logs --tail 50 research-generator
```

Most-common breakages are TypeScript errors in `vite build` (look for the `tsc`/`vite` output) or missing env vars at build time.

### 3. Curl-verify the bundle was actually rebuilt

```powershell
$resp = Invoke-WebRequest -Uri "http://localhost:5011/" -UseBasicParsing
$bundle = ($resp.Content | Select-String -Pattern 'index-[A-Za-z0-9_-]+\.js' -AllMatches).Matches[0].Value
"Active bundle: $bundle"
```

The bundle filename's hash changes whenever `dist/` is rebuilt. If the hash matches the previous build's hash, **the rebuild did not actually pick up the change** — usually because the source file change wasn't saved or wasn't inside the container's volume mount.

### 4. Grep the served bundle for a marker string

Pick a unique symbol from the change you just made — a new function name, a new constant, a new CSS class. Then:

```powershell
docker exec hic-research grep -c '<MARKER_STRING>' "/usr/share/nginx/html/assets/$bundle"
```

A non-zero count proves the change is in the served bundle. Zero means the rebuild produced the wrong dist (rare — usually a webpack tree-shaking surprise) or you grepped the wrong marker.

### 5. Tell the user to hard-refresh

The browser's bundle cache will serve the old `index-OLDHASH.js` until forced. Tell the user explicitly:

> Hard-refresh the page: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac). The bundle hash changed — your cached bundle is stale.

## When to also rebuild the proxy

The proxy is a SEPARATE container (`research-proxy`, port 5012). Changes to `humans-in-control-research/proxy/app.py`, `proxy/pptx_export.py`, or any Python file under `proxy/` require:

```powershell
docker compose -f d:\NXT-HUMANS_AI_CX_WORKBENCH\docker-compose-all.yml up -d --build research-proxy
```

If a frontend change calls a NEW proxy endpoint, rebuild BOTH or the new endpoint will 404 even though the UI looks correct.

## Anti-patterns to flag back to the user

- "I'll just `npm run dev` instead" — Port 3000 belongs to social-research-frontend (sacred port per project memory). HiC dev is `npm run dev` from inside `humans-in-control-research/` only, and even then it doesn't reflect the Docker pipeline.
- "Let me skip the rebuild and just docker restart" — restarting nginx does NOT re-run the build stage. Stale dist guaranteed.
- "I'll edit the file inside the container with docker exec" — the container's `/usr/share/nginx/html/` is the built dist, not source. Edits there don't survive a restart and don't come from the source tree.

## Reporting back

When done, report exactly:

```
Rebuild: <OK | FAILED>
Active bundle: index-<hash>.js
Marker present: <COUNT> occurrences of "<marker>"
Hard-refresh required: yes
```

If `Marker present: 0` after a successful build, do NOT tell the user "it should work now". Investigate why the marker is missing from the bundle.
