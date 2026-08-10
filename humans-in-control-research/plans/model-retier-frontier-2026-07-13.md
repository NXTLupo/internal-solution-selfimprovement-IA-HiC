# Frontier Model Re-Tiering: Verified Inventory + Routing Plan (2026-07-13)

Unified Vision phase advanced: (6) ONE routing authority, cost+quota+per-deliverable quality.
EXTENDS (never duplicates): model-usage-optimization-vs-ri-2026-06-28.md (the standing tier),
fable-to-opus-swap-2026-06-13.md (the swap-back contract this plan now triggers), and
gpt-5-6-prompt-cache-adoption-2026-07-13.md (the caching/speculation chokepoint work).
Method: live API probes with the .env keys (ground truth), vendor pricing verification,
verbalized sampling over tier designs, reinforcement-inference pass on the uncertain claims.

## 1. VERIFIED INVENTORY (live probes 2026-07-13, message-level "Say OK" calls succeeded)

| model | price /1M in/out | ctx | access | disposition-relevant traits |
|---|---|---|---|---|
| claude-fable-5 | $10 / $50 | 1M | OK - THE BAN IS LIFTED | best-in-class writing, taste, long-form synthesis |
| gpt-5.6-sol | $5 / $30 | 1M | OK | frontier reasoning at Opus price; token-efficient; leads coding-agent indexes |
| claude-opus-4-8 | $5 / $25 | 1M | OK | current artifact primary; prefill support; proven on the anti-slop stack |
| gpt-5.6-terra | $2.50 / $15 | 1M | OK | gpt-5.5-class at half Sol |
| claude-sonnet-5 | $2 / $10 intro (-> $3/$15 on 2026-09-01) | 1M | OK | token-efficient mid; no prefill |
| gemini-3.1-pro-preview | $2 / $12 | long | OK | data analysis, thought signatures; themes Stage 2/5 |
| gemini-3.5-flash | $1.50 / $9 | long | OK | bake-off-validated SCHEMA champion; chat default |
| gpt-5.6-luna | $1 / $6 | 1M | OK | triage/format tier |
| claude-mythos-5 | n/a | n/a | NOT on our key | restricted partner tier - out of scope |
| gemini-3.5-pro | unannounced | ~2M (reported) | ANNOUNCED, NOT YET GA | I/O 2026-05-19 announcement; GA slipped past June, third-party reports target ~2026-07-17; every variant 404s on our key today (probed: gemini-3.5-pro / -preview / -latest) |

Corrections to the supplied ranking: (a) Gemini 3.5 Pro is announced but NOT yet callable -
Google's reasoning flagship on our key remains gemini-3.1-pro-preview until GA lands (watch
item below); (b) Mythos 5 is not reachable and never will be on a standard business key;
(c) Fable 5 is no longer banned - the /v1/models listing carries it AND a live message call
succeeds, which is the trigger condition the 2026-06-13 swap plan recorded. Everything else
in the ranking matched vendor pricing pages.

WATCH ITEM (owner-flagged 2026-07-13): when gemini-3.5-pro reaches the Generative Language
API (reported ~2026-07-17; reported 2M context + Deep Think mode, both unconfirmed), re-probe
with the .env key, add it to the registry at verified pricing, and enter it into the P1
bake-off matrix as (e) gemini-3.5-pro vs gemini-3.1-pro-preview on the themes Stage 2/5 lane
and vs sonnet-5 on the evidence-heavy mid tier. Until then it routes nowhere.

## 2. WORKFLOW-BY-WORKFLOW DISPOSITION (every routing surface, none omitted)

| # | HiC surface (today's model) | disposition | why |
|---|---|---|---|
| 1 | Artifact hashtags, WRITING class: #strategy, #report, bare #slides decks, case-study, personas, themes, recs, prd (claude-opus-4-8) | BAKE-OFF Fable 5 vs Opus 4.8, then swap winners per artifact | writing/taste IS the product on these; Fable's premium ($10/$50 vs $5/$25) is only justified where the bake-off shows a visible quality gap; the swap-back plan requires evidence, not vibes |
| 2 | Artifact hashtags, SCHEMA/TABLE tier: gap-matrix, journey-map, blueprint, competitive, org-chart, systems-inventory, arch-map, timeline (gemini-3.5-flash) | KEEP | bake-off-validated equal to Pro at ~18x below Opus; nothing in the new crop beats $1.50/$9 at quality 1.0 |
| 3 | Plain non-hashtag Analyst chat (gemini-3.5-flash + picker) | KEEP; add sonnet-5 + terra to the picker | chat is latency+cost sensitive; flash holds; user choice widens |
| 4 | Designer chat chatToSlideSpec/chatToFreeform (opus-4-8) | KEEP on Opus; revisit after #1 verdict | same writing stack as artifacts; follows the artifact-primary decision |
| 5 | #proto pipeline, ALL stages incl. CODE (opus-4-8, callOpusJsonStage prefill) | KEEP Opus; add a CODE-stage-only Sol bake-off | prefill patterns are Anthropic-only (Sonnet/GPT lack it); Sol leads coding-agent benchmarks so it earns one gated trial on the code stage, which does not use prefill continuation |
| 6 | Heuristic tri-model critique (claude + gpt-5.5 + gemini) | UPGRADE GPT leg to gpt-5.6-terra | 5.5-class quality at lower cost; tri-model diversity preserved |
| 7 | Resilience fallback chain (Pro -> Flash -> 2.5Flash -> gpt-5.5) | gpt-5.5 -> gpt-5.6-terra; append luna as the last-resort text leg before DeepSeek | strictly better price/quality on the same provider slot |
| 8 | Evidence-heavy MID deliverables where Flash scores 0.5 and Opus is overkill (gemini-3.1-pro-preview) | BAKE-OFF sonnet-5 vs 3.1-pro | $2/$10 vs $2/$12; Sonnet's token-efficiency + Anthropic anti-slop familiarity may win; intro pricing ends 2026-09-01, re-run the math then |
| 9 | Themes Stage 2/5 Gemini-primary (3.1-pro / 3.5-flash) | KEEP | long-context corpus analysis is Gemini's verified lane; no challenger on price |
| 10 | High-volume triage: junk-answer guard, format checks, topic labels, citation shape checks (flash/haiku-class) | KEEP gemini-3.5-flash; use luna ONLY where an OpenAI call is already in-flight | adding a provider hop to save $0.50/M violates converge doctrine |
| 11 | Image lane (gemini-3.1-flash-image-preview) | KEEP | canonical image model; no 5.6/Anthropic image competitor on our keys |
| 12 | Embeddings, diagram render (native), exact-match cache | UNCHANGED | not model-choice surfaces |

## 3. VS TRACE (tier designs, k=5)

1. p~0.40 MODAL "swap artifact primary to Fable 5 outright" (the ban lifted, the old plan says
   revert). REJECTED as-is: the 2026-06 swap plan predates the Opus 4.8 price cut and GPT-5.6;
   2x cost needs per-artifact evidence, and blanket swaps are how quota cliffs happen.
2. p~0.18 "Sol replaces Opus everywhere" (same price, newer). REJECTED: HiC's generation stack
   (prefill continuation, temperature-strip, anti-slop lexicon tuning, 870K-char cached
   prefixes) is Anthropic-tuned; a wholesale provider migration re-opens every solved gotcha.
3. p~0.15 DIFFERENTIATED TIERING with bake-off gates (adopted): Fable 5 only where writing
   quality is the product AND proves out; Terra/Luna slot into existing OpenAI legs; Sonnet 5
   challenges the mid; everything bake-off-validated before repointing. Mirrors how the
   schema tier was won (plans/model-bakeoff-*-2026-06-28).
4. p~0.15 "do nothing until quotas force it". REJECTED: Terra-for-5.5 and the fallback-chain
   refresh are strict improvements with zero risk; sitting on a lifted Fable ban wastes the
   recorded swap-back intent.
5. p~0.08 TAIL "Luna-ize all cheap lanes across providers". REJECTED (converge doctrine, #10).

## 4. RI PASS (uncertainties named and resolved)

- "Fable 5 is stable for production now": a 1-probe success proves access, not quota. GATE:
  the health tracker + per-corpus provider commitment already in multiModelResilience wraps
  Fable exactly as it wrapped Opus during the cap; Opus 4.8 is the standing fallback string.
- "Sol matches Fable on reasoning": secondary-source benchmark claims. Not load-bearing: Sol
  enters only through the CODE-stage bake-off, which produces our own evidence.
- "Temperature rejection on gpt-5.6": unverified; gpt-5.5 rejects non-default temperature.
  ACTION: extend the proxy temperature-strip guard to gpt-5.6* until vendor docs say otherwise.
- Sonnet 5 intro pricing distorts the #8 bake-off: run the comparison at BOTH price points
  ($2/$10 and $3/$15); adopt only if it wins at the September price.

## 5. IMPLEMENTATION PLAN (phased; every phase reversible by one registry edit)

- P0 (same-day, no routing change): add claude-fable-5, claude-sonnet-5, gpt-5.6-sol/terra/
  luna to the aiRouter MODEL registry + costMeter price table (verified prices above); extend
  the proxy temperature-strip to gpt-5.6*; wire the three new models into the picker. Registry
  presence is not routing - zero behavior change.
- P1 (bake-offs, the gate for every repoint; reuse scripts/benchmark.mjs + the 2026-06-28
  bake-off protocol): (a) Fable 5 vs Opus 4.8 on #strategy + #report + bare #slides (writing
  class, judged on the R1-R20 rubric + anti-slop scan + deckPlanGate pass rate); (b) Sol vs
  Opus on the #proto CODE stage (compile-gate pass rate + critique scores); (c) Sonnet 5 vs
  Gemini 3.1 Pro on evidence-heavy mid deliverables; (d) Terra vs gpt-5.5 on the heuristic
  critique leg (cheap sanity check, expected win).
- P2 (repoint per evidence, ONE authority): winners take their slots inside
  aiRouter.artifactModelFor / prototypeBuilder.CODE_MODEL / heuristic dispatch. Fable 5, if it
  wins, takes ONLY the writing-class artifacts; Opus 4.8 remains the Anthropic fallback string
  everywhere (the OPUS_CAP_ACTIVE flag pattern is retained as FABLE_CAP fallback discipline).
- P3 (fallback + telemetry): gpt-5.5 -> terra in every fallback chain; luna appended as the
  pre-DeepSeek text leg; costMeter dashboards split by tier so the 30-day review can prove the
  re-tier paid; Sonnet-5 pricing re-check scheduled 2026-09-01.

NOT implemented in this change: this file is the reviewed decision. P0 is mechanical and safe
to execute on approval; P1 evidence gates everything else.
