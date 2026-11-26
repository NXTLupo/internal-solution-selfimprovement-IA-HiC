# Plan: serve HiC's embedder from the local Ollama server (2026-11-23)

Owner's decision, 23 Nov: write this plan; change nothing in HiC until the owner approves it. HiC changes never run
during the owner's HiC session, and restarting `research-proxy` needs an idle check first.

## Why

IA Next Local's whole-second-brain search (`secondbrain.recall`) calls HiC's `/api/manifest/chunks-by-goal`, which
embeds the question with HiC's embedder. That embedder lives inside Social Research's backend
(`EMBED_PROVIDER=local` → `http://social-research-backend:8081/api/embed`, `all-mpnet-base-v2`, 768 dimensions,
chunk store `/hic-workspace/wiki/.vectors.local-768.db`: 25,675 pages, 123,842 chunks). When that backend is stopped
(seen 22 Nov after a Docker restart), search returns nothing and pages written meanwhile are not embedded. Since 23 Nov
IA Next Local falls back to the engagement's own sources and re-embeds missed pages when the embedder returns, but
HiC itself still depends on a service it does not own.

## What was measured (23 Nov)

- `qwen3-embedding:0.6b` is installed in Ollama and returns 1,024-dimension vectors (different from today's 768).
- First call, model load included: 32 short texts in 7.3 s. The warm rate is not yet measured; measure it before any
  time estimate.
- A HiC search costs about 25 s per query today.

## Options

**A. The same model, served by Ollama (try first).** Import a GGUF build of `all-mpnet-base-v2` into Ollama, if one
exists that Ollama can load (verify; do not assume). Embed 500 sample chunks both ways and require cosine similarity of
at least 0.999 per chunk. If it holds, only the URL changes and nothing is re-embedded.

**B. `qwen3-embedding:0.6b` (already installed).** A different vector space, so every chunk is re-embedded into a new
store (tag `.ollama-1024`); the `local-768` store is kept untouched for rollback. Queries use the model's instruction
prefix; documents do not (HiC's `/api/embed` already distinguishes `task_type` query and document).

## HiC change (either option)

1. `proxy/app.py` `EMBED_PROVIDERS`: add `"ollama": {"model": ..., "dim": 768 or 1024, "batch": 32, "url":
   OLLAMA_URL + "/api/embed"}` and its request shape (`{"model", "input"}` in, `"embeddings"` out).
2. `docker-compose-all.yml`, `research-proxy`: `EMBED_PROVIDER=ollama` and the Ollama address
   (`http://host.docker.internal:11434`). No key is involved.
3. Option B only: run `POST /api/wiki/chunks-backfill` into the new store while IA Next Local and HiC are idle (the
   graphics card is shared), in batches, checking `/api/wiki/embed-status` between them.

## Acceptance before switching

- Retrieval: 30 fixed questions with known relevant pages; recall at 10 no lower than today's.
- Speed: chunks-by-goal latency measured before and after.
- Rollback: set `EMBED_PROVIDER=local` and restart `research-proxy`; the old store is still there.

## Not in scope

Keys (never touched), HiC's paid providers, and any change while the owner is working in HiC.
