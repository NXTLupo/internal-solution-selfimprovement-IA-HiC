# HiC ↔ Karpathy Second-Brain Vision: Re-Alignment Plan (2026-06-15)

Synthesized from the full `.claude/skills/intelligence` corpus: `second_brain.json` (Karpathy "LLM wiki" / Matt Wolfe second-brain), the harness papers `metaharness.pdf` / `rho.pdf` / `reinforcement_inference.pdf`, `2510.01171` (Verbalized Sampling), `2605.23904` (SkillOpt), and the two `compass_artifact` specs (NotebookLM reverse-engineering + AI-native creative architecture). Every claim below traces to those docs + the 2026-06-15 stranded-workflow audit.

---

## Part 1 — The Unified Vision (crisp)

**One sentence:** Stop investing in retrieving better *chunks*; invest in a plain-text, LLM-cross-linked knowledge graph the model reads directly, context-engineered grounding, and a compounding self-improvement loop that reads RAW experience and edits skills under a strict gate — a frozen strong model + well-engineered context beats embedding-chunk RAG on diversity, depth, and compounding.

The corpus converges on **five pillars** plus two cross-cutting invariants:

1. **Plain-text second brain, not a vector DB.** Knowledge is named, inter-linked markdown pages (the Wikipedia model). *The LLM does the cross-linking at WRITE time* ("This text file kind of looks like this text file. Let's connect the two"). Retrieval returns NAMED sources and grounds in the wiki first, model priors second. NotebookLM measures the payoff: grounding cuts hallucination ~40% → ~13%.

2. **Adaptive context access, not monolithic packing.** "Useful context should be accessed adaptively rather than monolithically packed into a single prompt" (Meta-Harness). The model `grep`/`cat`s a filesystem, or follows manifest pointers, or decomposes a query into 3-7 angles retrieved into long context. This is the formal case for manifest-chunk pointers over bulk-RAG injection.

3. **Distribution-level generation, not mode-collapsed single answers.** A direct call returns "the stereotypical mode." Verbalized Sampling: ask for *k candidates + explicit probabilities, sample the tails*, then select. Free, training-free, tunable diversity; "more capable models benefit more." The *explore* operator.

4. **Compounding self-improvement from RAW experience, strictly gated.** Persist raw rollouts as a filesystem; an agentic proposer reads the *raw traces* (not summaries — "access to raw execution traces is the key ingredient") and rewrites the skill/instruction text; accept an edit ONLY if it strictly beats baseline on held-out validation (SkillOpt); keep rejected edits as negative feedback; bound the edit size; protect a slow-update region; require human approval + a full audit log (RHO). The *exploit/select* operator. This is how the brain "gets smarter the more you feed it."

5. **Uncertainty-triggered deliberation at inference.** Route ONLY low-confidence outputs to a second, more deliberate pass (Reinforcement Inference); targeted re-asking beats uniform re-asking. An adaptive compute policy within a single run.

**Cross-cutting invariant A — Proactive resurfacing ("AI comes to you").** Scheduled background integration (the "process the inbox at 12:50am" cron), a morning brief ("based on what you saved recently, here's what to try next"), and journal/feedback cross-referencing. The brain pushes; the user does not always pull.

**Cross-cutting invariant B — HITL + provenance/audit IS the moat.** Mandatory human approval on long-running agentic jobs (plan-first, run-on-approval), and a full audit trail (every query, source set, model+prompt version, retrieved chunk IDs, final response). "This audit trail is what makes the system auditable for the Humans-in-Control thesis and is the primary product moat."

**The simplicity principle that ties them together:** a minimal outer loop + a strong general-purpose proposer + human-readable contracts (markdown skills, a design-token sheet, an `agents.md`-style ingest contract) the model reads at runtime — never a bespoke scaffold, never hardcoded logic, never opaque vector recall as the primary path.

---

## Part 2 — Re-audit: how close is each HiC feature to the vision?

Rating: **ALIGNED** (matches the vision) · **CLOSE** (right shape, gaps) · **PARTIAL** (half-built/half-wired) · **FAR** (missing or fractured).

| Subsystem | Pillar | Rating | Gap vs vision |
|---|---|---|---|
| Wiki (markdown pages) + manifest (chunk pointers, frontmatter spans, named sources) | 1 | **CLOSE** | Plain-text, named, citeable — right substrate. But ingest does **not** LLM-cross-link into topic/entity/**synthesis**/comparison pages Wikipedia-style; pages accrete without the write-time linking layer that is the core of the Karpathy magic. |
| Vector store (`.vectors.db`, cosine) as a retrieval tier | 1/2 | **PARTIAL** | The vision leads with *reading named pages*; embeddings are a secondary index. HiC still treats cosine as a primary path in places. Keep it as an adaptive *router to pointers*, not the answer. |
| Retrieval / `chunkRetrieval` (tier-1 engagement, tier-1.5 objective-ranked [new], tier-2 KL, tier-3 whole-wiki) + `wiki-query-expander` | 2 | **CLOSE** | Adaptive, manifest-pointer, objective-relevance-ranked, multi-angle — strongly aligned after this session's tier-1.5 work. Remaining: make "read the named page" the lead and cosine the router. |
| Ingestion: uploads (vision-extraction [new] + chunk/tag [new]) + 200+ connectors (+400 in the new registries) | 1 | **PARTIAL** | Uploads now readable + chunked + tagged. But there is **no idempotent `agents.md`-style ingest contract** (dedup → topic page → entity page → synthesis/comparison page with LLM cross-links). Ingestion stores; it does not *weave*. |
| Generation: `corpusChatService` one-engine force-route to Opus + skills + manifest + Figma tokens | 2/3 | **PARTIAL** | One-engine + manifest grounding is right. But `loadGenerationContext()` (framework/anti-pattern/brand pages) is **bypassed on the spine**, and there is **no default distribution-level (Verbalized-Sampling) prompting** on identity/creative fields → mode-collapsed personas/titles. |
| Self-improvement: SkillOpt scripts, `learningEngine` (5-edit auto-constraint), `epochTrigger`, cross-engagement-pattern-miner, `skillopt-validation-gate` | 4 | **FAR** | The *design* matches SkillOpt/RHO/Meta-Harness almost exactly — but the loop is **not closed**: epoch never auto-fires, pattern-miner stuck at `patterns_compiled: 0` (blocked by a `/api/wiki/write` Errno-22), SkillOpt is manual-only, `scoreDeliverable` only logs. Unverified whether the proposer reads RAW traces vs summaries, and whether promotion is strictly beats-baseline-gated. This is the **biggest gap** vs the compounding vision. |
| Reinforcement inference (`reinforcement-inference` skill) | 5 | **PARTIAL** | Skill exists, but firing is not an **uncertainty-calibrated trigger** — RI's whole point is *targeted* re-asking (entropy/MSP threshold), not always/never. |
| Proactive surfaces (morning brief, journal cross-ref, scheduled inbox integration) | Inv. A | **FAR** | Essentially absent. HiC is pull-only. The pattern-miner is the nearest primitive but it does not *push* a "here's what to do next" brief. Net-new. |
| HITL + provenance/audit | Inv. B | **CLOSE** | Checkpoints, feedback widget, citation provenance, chunk-map, deep-research custody exist. Missing: a single unified **audit record per generation** (query + source set + model + prompt version + retrieved chunk IDs + response) as a first-class, queryable artifact. |
| Design-system contract (Figma → `figma-tokens.json` → `/api/design-tokens` → hydrate) | Inv. B / simplicity | **CLOSE** | The creative compass validates this exactly. The export-twin hardcoding (now fixed this session: logo + `brandTokens` reads hydrated feed) was the drift; verify end-to-end after rebuild. |
| Deliverable/render engine + 1:1 preview/export twins | simplicity | **PARTIAL** | Twins are healthy (parity 22/22). But a **legacy 3-phase deck pipeline still runs in parallel** and `#presentation` forks to a scaffold renderer — two violations of "one engine, minimal scaffold." |

**Headline:** HiC already *holds the right shape* on the substrate (plain-text wiki + manifest + adaptive retrieval + one engine + design-token contract). It is **far** on exactly two things the vision says are the source of compounding advantage: (1) the **self-improvement loop is not closed**, and (2) the **write-time cross-linking + proactive resurfacing** layer (the literal "second brain" magic) is missing. Plus two simplicity regressions (duplicate deck pipeline; loadGenerationContext bypass) and two cheap, high-leverage prompt upgrades (Verbalized Sampling; uncertainty-gated RI).

---

## Part 3 — Re-alignment plan (simplicity-first, sequenced)

### Wave 0 — Stop the bleeding / simplicity (low risk, high clarity)
- **Close the self-improvement write path.** Fix the `/api/wiki/write` Errno-22 (Windows filename) so the pattern-miner can write `cross-engagement-patterns.md` (unblocks `patterns_compiled` and `#meta-themes`). *Reproduce first* (the audit inferred it).
- **Collapse to one engine.** Confirm reachability of the legacy 3-phase deck path in `App.tsx`; redirect to `sendChatMessage` slide-mode and delete `generateDeckStructure/Narrative/visualizeNarrative` + `buildDeckDigest`. Resolve `#presentation`: either finish the renderer or fold into the GOLD `:::slide` engine and remove the dead fork.
- **Deploy + verify this session's batch** (vision-extraction, upload chunk/tag, tier-1.5 retrieval, logo + export-twin hydration, per-app rule): one `research-generator` rebuild, re-upload the PDFs/screenshots, re-run the deck.

### Wave 1 — Close the compounding loop (Pillar 4, the biggest gap)
Adopt the SkillOpt/RHO/Meta-Harness discipline literally:
- **Persist RAW rollouts** (session traces, slide drafts, edit logs, validator output) as a filesystem under `hic-workspace/sessions/`; let the SkillOpt proposer `grep`/`cat` them — **never** feed it a pre-summarized digest ("raw traces are the key ingredient").
- **Strict beats-baseline gate** on every promoted skill edit (held-out re-solve, `Sj > 0`, ties rejected), **bounded** edit size, a **protected slow-update region** in each skill, a **rejected-edit buffer** as negative feedback, **human approval + audit log**. This is the `skillopt-validation-gate` mandate — make it enforced, not advisory.
- **Auto-fire the loop**: wire `epochTrigger`/`getEpochStatus` to a `/loop` cadence + a consumer; mine a **difficulty-diverse coreset** of sessions (DPP-style), not all-or-recent.

### Wave 2 — Make the wiki a true second brain (Pillar 1 + Inv. A)
- **`agents.md`-style ingest contract** (one editable markdown file the model reads at runtime): on every new source → dedup by content-hash → create/update the **topic page**, the **entity page**, and a **synthesis/comparison page**, with real `[[wikilinks]]` the LLM authors. Move cross-linking to **write time**.
- **Scheduled background integration**: a nightly job that processes any unprocessed inbox items and re-runs cross-linking (extend the existing `/loop` + wiki-curator).
- **Proactive surfaces**: a "morning brief" deliverable ("based on the corpus you've grown, here's the next research move") and journal/feedback cross-referencing — the system pushes.

### Wave 3 — Cheap inference-time upgrades (Pillars 3 + 5)
- **Verbalized Sampling by default** on identity/creative fields (personas, theme names, titles, recommendations): swap the single "generate the answer" call for "generate k candidates + probabilities, sample the tails," then select. Pure prompt change; directly attacks canonical-collapse slop. Tunable per surface.
- **Uncertainty-gated Reinforcement Inference**: calibrate a trigger (entropy/MSP or the junk-answer-guard margin) so only low-confidence steps get the second deliberate rewrite-from-source pass — not always, not never.

### Wave 4 — Grounding + audit hardening (Pillar 1/2 + Inv. B)
- **Wire `loadGenerationContext()` (or fold its page-set into the manifest assembly) into the spine**, after a precise overlap check so framework/anti-pattern/brand pages are injected without double-injecting what skills already carry.
- **Lead with named-page reading**, cosine as the router-to-pointers (not the answer).
- **Unified audit record per generation**: query + source set + model + prompt version + retrieved chunk IDs + response, as a first-class queryable artifact — the provenance moat.
- **Connector fuel**: drop the 400 registry specs (finance + creative-AI) into the proxy catalog; use the release-tracking REST endpoints (HF Models, Civitai, OpenRouter) so the system discovers its own new sources.

### Sequencing rationale
Wave 0 removes complexity and ships the verified fixes. Wave 1 is the highest-leverage (the compounding loop is the entire thesis and is currently open). Wave 2 delivers the literal "second brain" the user is pointing at. Wave 3 is near-free quality. Wave 4 hardens grounding + the audit moat. Every wave moves toward the same shape: **named plain-text knowledge in, diverse candidates, a compact trained skill governing, precise grounding, a gated loop that reads raw experience — and a human in control with a full audit trail.**
