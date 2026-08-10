---
id: benchmarks/prompt-cache-tiers.md
title: Measured Anthropic prompt-cache hit rates by prefix size (C1)
type: benchmark
updated: 2026-08-07
stale_after: 2026-11-07
---

# Anthropic prompt-cache rho(N, |P|) - measured on OUR workload (C1)

Method: CAPC (arXiv 2607.15516) RUN_NONCE characterization ported to
`scripts/cache-characterize.mjs`. Per prefix size: one nonce-salted warm call,
then N follow-ups; hit = `cache_read_input_tokens > 0`. Sequential calls,
~350ms pacing, single client. Cost of this run: ~$4.

## Run 2026-08-07

model=claude-opus-4-8, ttl=5m, N=15, trials=2

| prefix tokens | rho mean | sigma | trials | N |
|---|---|---|---|---|
| 2000 | 1.000 | 0 | 2 | 15 |
| 3500 | 1.000 | 0 | 2 | 15 |
| 8000 | 1.000 | 0 | 2 | 15 |
| 30000 | 1.000 | 0 | 2 | 15 |
| 100000 | 1.000 | 0 | 2 | 15 |

Every size: exactly one cache write (the warm call), then 15/15 reads. sigma=0.

## Interpretation (read before acting on this)

1. The CAPC two-tier architecture (hot tier under ~3,500 tokens at rho~0.83,
   measured on Sonnet 4.6 in May 2026) DOES NOT REPRODUCE on claude-opus-4-8 on
   our key as of 2026-08-07. This matches CAPC's own "Scenario 3: the two-tier
   architecture collapses" - their tier-bound loses its justification, while
   the rest of the caching economics (write premium, read discount, mutated-
   fraction sensitivity) stand unchanged.
2. CAVEAT - this probe is SEQUENTIAL from ONE client. CAPC attributed the hot
   tier to multi-server pool replication under production concurrency; HiC's
   production shape (4 proxy workers, concurrent theme shards) may still see
   warm-up misses this probe cannot. The production-side arbiter is the C3
   telemetry (`GET /api/cache/telemetry` - per-day, per-provider, tier-bucketed
   read/write tokens). Judge tiers from THAT after 30 days of live traffic.
3. Consequences applied: `ANTHROPIC_CACHE_TIER_TOKENS` stays at 3500 as a
   telemetry BUCKET BOUNDARY only (it drives no write decision - see the C2
   correction in the plan); the C5 manifest-digest sizing constraint (8-15k
   tokens to clear the persistent tier) is RELAXED to "size for content, not
   for tier" pending 30-day production telemetry; the provider-minimum write
   floor (~1024 tokens / `ANTHROPIC_CACHE_MIN_CHARS=4000`) is unchanged and
   remains correct.
4. Re-run cadence: re-measure on any model repoint (Fable 5 if the re-tier
   bake-off adopts it), on any Anthropic pricing/infra announcement, or by
   2026-11-07 (stale_after), whichever comes first. Full CAPC parity run:
   `node scripts/cache-characterize.mjs --n 30 --trials 3` (~3x cost).

Raw per-call JSONL from this run: session scratchpad
(`cache-characterize-raw.jsonl`, 160 calls); re-runs should archive theirs
under `hic-workspace/eval/`.
