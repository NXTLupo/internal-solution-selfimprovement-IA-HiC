---
argument-hint: [proxy|spa|both] (default: both)
description: Rebuilds the HiC research-generator and/or research-proxy Docker containers and verifies the new bundle hash differs from the old one. Replaces the manual "docker compose ... --build" ritual that was breaking the feedback loop.
---

# Rebuild HiC — One-Command Docker Refresh

The HiC SPA (`research-generator`, port 5011) is nginx serving a static Vite
dist with **NO HMR**. Every `.tsx` / `.ts` / `.css` edit under
`humans-in-control-research/` is invisible in the browser until a rebuild.
The proxy (`research-proxy`, port 5012) is a separate FastAPI container and
needs its own rebuild for Python changes.

This command runs the rebuild ritual end-to-end and verifies the new bundle
hash is actually different — closing the loop where "I rebuilt but the
change still isn't showing" happens because Docker reused a cached layer or
the user hit the wrong container name.

## Procedure

1. Decide scope from `$1`:
   - `spa` / `frontend` / `research-generator` → rebuild SPA only
   - `proxy` / `backend` / `research-proxy` → rebuild proxy only
   - `both` / (empty) → rebuild both (the default — the user usually edited
     both layers in the same session)

2. Capture the **current bundle hash** before rebuild for verification:
   ```bash
   curl -s http://127.0.0.1:5011/ | grep -oE 'index-[A-Za-z0-9_]+\.js' | head -1
   ```
   Save this as `OLD_BUNDLE`.

3. Run the rebuild:
   ```bash
   cd D:/NXT-HUMANS_AI_CX_WORKBENCH
   docker compose -f docker-compose-all.yml up -d --build <services>
   ```
   - `<services>` is `research-generator research-proxy` for `both`, or just
     the one requested.
   - This takes ~60–180 seconds for the SPA (Vite build inside the container)
     and ~30–60 seconds for the proxy.
   - Run in background and poll, or wait synchronously — your call based on
     whether the user needs the result before the next message.

4. After the rebuild finishes, **verify the new bundle hash differs**:
   ```bash
   curl -s http://127.0.0.1:5011/ | grep -oE 'index-[A-Za-z0-9_]+\.js' | head -1
   ```
   Save as `NEW_BUNDLE`. If `NEW_BUNDLE == OLD_BUNDLE`, the build was a cache
   hit (no source change picked up) — report this loudly. The user wasted
   their wait and probably edited the wrong file.

5. Health-check both containers:
   ```bash
   docker compose -f docker-compose-all.yml exec research-generator curl -s http://localhost/healthz || true
   docker compose -f docker-compose-all.yml exec research-proxy curl -s http://localhost:5012/health || true
   ```

6. Report back with:
   - Old vs new bundle hash (or "proxy rebuilt — no bundle hash on backend")
   - Elapsed time per service
   - "Hard-refresh the browser (Ctrl+Shift+R) to evict the old bundle"

## Anti-patterns

- DO NOT run `docker compose down` first — that destroys nothing but wastes
  another 30s of restart. `up -d --build` recreates the container in place.
- DO NOT use `docker compose build` followed by `docker compose up` —
  combining as `up -d --build` is one command that builds AND starts.
- DO NOT pass `--no-cache` unless the user explicitly asked. `--no-cache`
  doubles rebuild time and is rarely needed; layer-cache invalidation
  triggers on the relevant file change automatically.
- DO NOT use the friendly name `hic-research` here — the compose service is
  `research-generator`. (`hic-research` is the *container* name, not the
  service name.) See CLAUDE.md "Container Name Gotchas".
- DO NOT skip the bundle-hash verification. Without it, a silent cache hit
  looks identical to a successful rebuild and the user loses 3 minutes
  diagnosing why their change didn't show up.
