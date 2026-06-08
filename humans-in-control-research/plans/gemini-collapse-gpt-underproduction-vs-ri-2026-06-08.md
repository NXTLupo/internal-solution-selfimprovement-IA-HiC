# Gemini Pro repetition-collapse + GPT under-production — VS+RI analysis & fix plan (2026-06-08)

Status: analysis COMPLETE; keystone implementation PENDING (gated on the in-flight
relevance-lever verification run). Author: self-improvement IA session.

## Problem statement (observed, this engagement)

Fresh theme yield collapsed to 17 on a cached-only run that should produce hundreds.
Live trace root causes:

1. **Gemini 3.1 Pro repetition-collapse** on Pass-1 BREADTH. `malformed payload`,
   `response=0KB`, 322s wasted, `RepetitionGuard: "948120394..." x320`. Removing the
   temperature override (earlier fix) did NOT eliminate it; intermittent + input-sensitive.
2. **GPT-5.5 fallback under-production**. After the collapse, the fallback got
   `system=415KB user=810KB` and returned only **18 themes**.
3. **Corpus starvation** (amplifier). Pass-1 sees `tokenBudget: 30_000` → **59 of 9,260**
   catalog chunks.

## Grounded evidence (web research, June 2026)

- Gemini 3 has a **documented infinite thinking-loop** on long (5k+ token) complex prompts
  requiring structured JSON: **~30% failure rate, 50%+ tokens wasted** re-validating the
  schema in the thinking block. `max_thinking_tokens` is **ignored**; lowering thinking to
  "medium" **does not help**. Practical community escape: **switch providers**.
  (Google AI Dev Forum: infinite-looping-thinking-steps-for-gemini-3-apis/138686)
- Structured output that **exceeds `max_output_tokens` returns `None`** for text/parsed —
  matches the observed 0KB response. (googleapis/python-genai #1039)
- Cookbook guidance: **do NOT duplicate the schema in the prompt** when using
  `responseSchema`; **property ordering** in any prompt schema must match the
  `responseSchema` or output degrades. (google-gemini/cookbook #449)
- Gemini 2.5 / 2.0 structured-output token-repetition until max-tokens is a known class.
  (LiteLLM forum 143931; cookbook #449)

Conclusion: the reliable lever is **reduce per-call size/complexity**, not thinking-budget
tuning (ineffective) and not blind schema removal (risks malformed JSON).

## Verbalized Sampling

### Problem 1 — Gemini collapse (candidates, P=confidence it materially fixes)
- A1 **Shard corpus into K small breadth calls**, union+dedup — **0.85**. Attacks the
  documented 5k+ trigger; loop is size-correlated.
- A2 Drop rigid `responseSchema` → `responseMimeType:json` + single in-prompt schema,
  correct ordering — 0.55. Cookbook-aligned; risks malformed JSON.
- A3 Cap/disable thinking budget — 0.15. Forum: ignored / ineffective.
- A4 **Names-then-expand** (Pass-1a names only; Pass-1b expand each small) — 0.80. Shrinks
  per-call output complexity.
- A5 Early in-stream abort + perturbed retry (reorder corpus / new seed) — 0.50. Cheap
  recovery (abort SHIPPED 2026-06-08), not prevention.
- A6 Non-streaming generateContent — 0.20. No evidence streaming is the trigger.
- A7 Non-Gemini model primary for breadth — 0.60. Forum workaround; conflicts with
  Gemini-primary mandate + loses 1M context. Fallback only.

### Problem 2 — GPT under-production (candidates)
- B1 **Shrink GPT fallback prompt** (810KB → ~30k focused MCR corpus) — 0.80.
- B2 Explicit breadth contract ("≥N distinct, do NOT aggregate") — 0.65.
- B3 **Shard the GPT fallback too** (per-window) — 0.80.
- B4 Progressive count escalation in floor-retry — 0.45 (partially exists).
- B5 Names-then-expand for GPT — 0.65.

## Reinforcement Inference — convergence

Both root causes are **per-call size/complexity**. **Sharding (A1) solves both**: it shrinks
each Gemini structured call below the collapse threshold AND shrinks each GPT fallback prompt
(B1/B3 fall out for free), while multiplying breadth and corpus coverage (59 → ~480 chunks).
A3/A6 down-weighted by direct negative evidence. A7 stays the existing per-shard fallback
(Gemini-primary mandate).

### Committed approach (keystone + reinforcing layers)
1. **Shard breadth across K MMR-diverse windows** (A1+B1+B3). K adaptive
   `= min(8, ceil(catalog/600))` (~8 here). Per-shard Pro call small (collapse ↓); per-shard
   GPT fallback small (under-production ↓); breadth multiplies; coverage 59 → ~480 chunks.
2. **Names-then-expand inside heavy shards** (A4/B5) — split any shard still over the size bar.
3. **Schema hygiene** (A2, conservative) — no prompt/`responseSchema` duplication; enforce
   property-order match. KEEP `responseSchema` (the grounded fix is size, not removal).
4. **Early-abort + perturbed retry** (A5) — abort shipped; add corpus-reorder on retry.
5. **Per-shard provider fallback** (A7) — already exists; now localized to one shard.

Composes with the already-built **relevance lever** (ranks the unioned set) + **depth pass**
(enriches every relevant theme) = breadth × depth.

## 6-layer trace
- wiki (read): chunkRetrieval MMR windows already exist; shard = K MMR packs over disjoint
  shortlists. No new read contract.
- service: `geminiService._runBreadthPass` — add shard loop + union/dedup. Primary change.
- skill: theme-analyst breadth instructions unchanged; per-shard prompts reuse them.
- hook: validate_minimum_yield / breadth floor still apply to the UNIONED set.
- subagent: n/a.
- self-improvement: trace each shard turn (recordTurn) tagged shard index for epoch analysis.

## Implementation gate
Deploy AFTER the in-flight relevance-lever run validates (watcher b0s8iohpj). Do not stack the
shard rewrite on an unverified relevance-lever change in the most critical path.
