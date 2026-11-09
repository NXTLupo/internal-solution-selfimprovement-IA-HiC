---
name: deterministic-naming-pass
description: "Determinism contract for every call that names a deliverable's identity fields (theme, persona, recommendation and slide titles, cluster labels): a signature-keyed response cache plus frozen inputs, so the same cached corpus and goal give the same names."
invocation: model
version: "1"
status: active
thinking: high
category: upstream-quality
triggers:
  - deterministic naming
  - same input same output
  - "#deterministic"
  - "#reproducible"
  - temperature 0
  - seed binding
---

# Deterministic Naming Pass

## Scope

The determinism contract for every LLM call that produces a deliverable's identity (theme names, persona names, recommendation titles, slide titles, cluster labels). Per the 2026-05-24 standing rule (feedback_determinism_first_for_cached_runs), same cached corpus + same goal MUST produce identical identity fields across runs. Mechanism (2026-10-30) - signature-keyed response cache + fixed catalog windows for every provider; temperature 0 and a seed only where the provider accepts them (Gemini, OpenAI). Claude 4.6+/5.x REJECTS temperature, top_p and metadata.seed with a 400, so for Claude the cache key and the frozen inputs carry determinism, never request parameters.

## You Are

The discipline that makes "same cached data + same goal → same themes" actually true. Two identical-input runs used to produce different theme names because the model sampled differently each time. The user observed this and called it out as a bug — it is.

2026-10-30 (WS-3 P5) PROVIDER REALITY: Claude 4.6+/5.x rejects `temperature`, `top_p`, `top_k` and `metadata.seed` (live 400 on 2026-10-05; `claudeModelPolicy.ts` strips them, `proxy/model_registry.py::normalize_claude_body` strips them again). For Claude, determinism comes from (1) the signature-keyed response cache (`multiModelResilience.ts`), (2) frozen catalog windows and chunk packs (same inputs, same bytes), and (3) the proxy's exact-match cache for identical bodies. Temperature 0 + seed apply to Gemini and OpenAI only. Do not add a temperature or seed to a Claude call; it fails the request.

Per the standing rule, deliverable IDENTITY (names, memberships, titles, framings) MUST be deterministic. Variance is allowed only on exploratory fields (depth enrichment, contradictions, alternative angles) which are explicitly tagged.

You are the contract that names the boundary between deterministic identity and explorative variance.

## When to activate

- Before any LLM call that produces a name, title, framing, label, or structural identity field
- Whenever a code reviewer touches a `temperature:` parameter in `services/geminiService.ts` / `services/openaiService.ts` / `services/aiRouter.ts`
- When the user types `#deterministic` to inspect what's deterministic in the current pipeline
- When `validate_theme_reproducibility.py` Stop hook reports drift across runs

Do NOT activate when:
- The call is explicitly an exploratory variance pass (depth enrichment, verbalized-sampling candidate generation, alternative-framing pass)
- The call is the angle-generation step (where diversity IS the goal)

## The classification rubric

Every LLM call falls into one of three categories. The category determines temperature + seed policy.

### Category A — IDENTITY (deterministic; temperature=0, seed=stable)

These produce a deliverable's identity. Must be reproducible across runs.

| Call type | Examples | Temperature | Seed |
|---|---|---|---|
| Theme naming | "given cluster top_terms, output theme name" | 0 | hash(cluster_id) |
| Persona naming | "given persona archetype, output name + tagline" | 0 | hash(persona_id) |
| Recommendation title | "given recommendation body, output action title" | 0 | hash(rec_id) |
| Slide action-title (final pick) | slide-title-lab's TOP 3 ranked pick | 0 | hash(slide_index) |
| Citation resolution | citationResolver.ts (already deterministic — rule-based) | n/a | n/a |
| Structural framing | Rumelt diagnosis statement, MECE category labels | 0 | hash(deliverable_id) |
| Schema-bound JSON emission | `responseSchema` JSON output where structure is fixed | 0 | hash(call_purpose) |

### Category B — EXPLORATIVE (variance is the point; temperature 0.2-0.4, no seed)

These explore alternative interpretations. Variance across runs is a feature.

| Call type | Examples | Temperature | Seed |
|---|---|---|---|
| Multi-angle retrieval angles | "given goal, output 4 different angles" | 0.4 | none |
| Verbalized-sampling candidates | k=8 candidate generation | 0.7-1.0 | none |
| Depth enrichment | subThemes / dimensions / contradictions / temporalArc | 0.2 | none |
| Alternative framing pass | "give 3 different ways to frame this challenge" | 0.4 | none |
| Pre-mortem failure modes | exploratory failure scenarios | 0.3 | none |
| Dissent-panel critic voices | adversarial critiques | 0.5 | none |

### Category C — HYBRID (deterministic structure, explorative content)

These have a fixed structural shape but content that can vary within that shape. Use temperature=0 if the structure is the deliverable's identity; use temperature=0.2 if the content IS the deliverable.

Most slide narrative generation is Category C — the slide template is fixed (identity) but the narrative copy benefits from variance. Solution: temperature=0 for the title; temperature=0.2 for the narrative body. Split the call.

## Seed derivation policy

When a provider supports `seed` (Gemini API does on some endpoints; OpenAI does on chat completions), derive the seed deterministically from the call's purpose:

```typescript
function deriveSeed(purpose: string, ...keys: (string | number)[]): number {
  const input = [purpose, ...keys.map(String)].join('|');
  // Use a stable hash that produces a 32-bit unsigned int
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash >>> 0;  // force 32-bit unsigned
  }
  return hash;
}

// Usage:
const seed = deriveSeed('theme_name', clusterId);  // same cluster → same seed
const seed = deriveSeed('persona_jtbd', personaId, goalHash);  // bound to goal too
```

The seed is BOUND TO THE CALL'S PURPOSE + IDENTITY KEYS. Two calls with the same purpose + same identity → same seed → same model output (when the provider honors seed).

## The wrapper function

Every Category A call must go through this wrapper:

```typescript
type DeterministicCallOpts = {
  purpose: string;                // 'theme_name' | 'persona_name' | 'rec_title' | ...
  identity_keys: (string | number)[];  // [cluster_id], [persona_id], [rec_id, goal_hash], etc.
  schema?: any;
  max_tokens?: number;
};

async function deterministicLLMCall<T>(
  prompt: string,
  opts: DeterministicCallOpts,
  client: any,  // gemini / anthropic / openai
): Promise<T> {
  const seed = deriveSeed(opts.purpose, ...opts.identity_keys);
  const response = await client.messages.create({
    temperature: 0,
    seed,
    max_tokens: opts.max_tokens || 200,
    response_format: opts.schema ? { type: 'json_object', schema: opts.schema } : undefined,
    messages: [{ role: 'user', content: prompt }],
  });
  // Stamp the result with the seed so it can be traced
  const result = parseResponse(response);
  (result as any)._deterministic_seed = seed;
  (result as any)._deterministic_purpose = opts.purpose;
  return result as T;
}
```

Every result carries `_deterministic_seed` + `_deterministic_purpose` so the validator can verify the binding was used.

## Reproducibility hash

Every deliverable carries a top-level `reproducibility_hash`:

```typescript
function computeReproducibilityHash(deliverable: any): string {
  const corpus_hash = sha256_of_corpus_chunks();
  const goal_hash = sha256(deliverable.goal);
  const framework_versions = sha256(JSON.stringify(loadedFrameworkPages));
  const pipeline_version = HIC_PIPELINE_VERSION;
  return sha256([corpus_hash, goal_hash, framework_versions, pipeline_version].join('|'));
}
```

Two runs with the same hash MUST produce byte-identical identity fields. The `validate_theme_reproducibility.py` Stop hook can compare the actual output against a stored baseline for this hash.

## The 12 call sites in geminiService.ts that need temperature=0

From the grep on 2026-05-24:

| Line | Current | Should be | Category |
|---|---|---|---|
| 518 | 0.1 | **0** | A (structural_stability) |
| 833 | 0.4 | **0.4** (stays) | B (angle_variety) |
| 1644 | 0.2 | **0** | A (likely naming-class — verify) |
| 1838 | 0.2 | **0** | A |
| 2172 | 0.2 | **0** | A |
| 2383 | 0.2 | **0** | A (responseSchema) |
| 2700 | 0.2 | **0** | A (responseSchema) |
| 3179 | 0.2 | **0** | A (responseSchema) |
| 3322 | 0.2 | **0** | A (responseSchema) |
| 3993 | 0.3 | **0** | A — verify it's not depth enrichment |
| 4305 | 0.2 | **0** | A (responseSchema) |
| 4326 | 0.2 | **0** | A (responseSchema) |
| 4728 | 0.2 | **0** | A (responseSchema) |
| 4746 | 0.2 | **0** | A (responseSchema) |
| 5230 | 0.3 | **0** | A (sectionSchema) |

These get tightened in a follow-on patch (the precise call-purpose at each line must be confirmed before the edit). The exceptions (line 833) stay.

## Hard rules

1. **Identity calls run at temperature=0, period.** No exceptions. If a naming-class call needs creativity, that creativity belongs in an upstream EXPLORATIVE pass that emits CANDIDATES, and the naming call picks deterministically from them.
2. **Every Category A call binds a seed when the provider supports it.** Where it doesn't, document the gap explicitly.
3. **Variance is tagged.** Every Category B / C output carries `_exploration_seed: <run_id>` or `_framing_variant: <name>` so the user can see what varies and why.
4. **Reproducibility hash on every deliverable.** Stamped at the top level. The hash is the contract.
5. **No emoji.** Repo-wide rule.

## Composition

- **Pairs with** `topic-cluster-to-theme-converter` — BERTopic clusters are deterministic identity; naming pass on each cluster is deterministic via this skill
- **Pairs with** `theme-yield-guarantee` — the guarantee + the determinism together mean "20-25 robust themes consistently" AND "same themes across runs"
- **Pairs with** `verbalized-sampling` — VS lives in Category B and must STAY non-deterministic; the deterministic pick happens downstream
- **Validated by** `validate_theme_reproducibility.py` (Stop hook) — catches drift when same-hash runs produce different identity fields
- **Encoded by** `proxy/topic_modeling.py` (already has random_state=42 — good) and TO-BE in `services/geminiService.ts` (12 sites need patching)
