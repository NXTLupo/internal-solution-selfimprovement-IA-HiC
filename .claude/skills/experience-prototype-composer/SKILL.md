---
name: experience-prototype-composer
description: STRICT-RULE skill that mandates every Stage 4 prototype be composed exclusively from the AI Experience Patterns catalog at /hic-workspace/wiki/inspiration-hub/ai-patterns/ — no invented UI shapes, no generic Copilot shells, no "clean modern" placeholders. Parses the user hashtag (`#proto (experience name) #NU` or `#proto (experience name) #NXT`) and forces the Stage 4 Prototype Coder to render every region of its output as a NAMED pattern from the catalog in the requested brand. Loaded by `prototypeBuilder.ts` Stage 4 alongside the design-exemplar-curator injection. Replaces ad-hoc UI invention with disciplined composition from a curated, brand-vetted catalog.
trigger: ALWAYS load at Stage 4 (Prototype Coder) when brand hashtag is present; OVERRIDES any other "build whatever feels right" instructions
inputs: brief.concept, brief.interaction_pattern, brief.experience_name (parsed from #proto hashtag), brief.brand (parsed from #NU or #NXT)
outputs: Stage 4 system-prompt rule block; pattern manifest the coder must reference by ID; output validation gate that fails the build if any region is not a catalog pattern
catalog_url: /hic-workspace/wiki/inspiration-hub/ai-patterns/
catalog_json: /hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json
hashtag_grammar: "#proto <experience-name> #NU | #NXT"
example_hashtags:
  - "#proto trailblazer-match #NU"
  - "#proto cohort-pulse-dashboard #NXT"
  - "#proto co-op-readiness-coach #NU"
---

# Experience Prototype Composer (STRICT)

## The hard rule

Every Stage 4 Prototype Coder output must be **composed entirely from patterns defined in the AI Experience Patterns catalog**. No pattern in the output may be invented from scratch. The coder is a composer, not an inventor.

### What this prevents

- Generic Copilot shells (modal + tone slider + regenerate button)
- "Clean modern" placeholder UIs that lack design language commitment
- One-off custom components that haven't been vetted against the brand systems
- Skeleton loaders that render forever because no pattern handles their data binding
- Brand drift — NXT-styled prototypes secretly using NU tokens or vice versa

### What this enforces

Every region of every prototype maps to a catalog pattern by `pattern-id` (e.g. `p-chat`, `p-rec`, `p-dial`). The brand variant (NXT / NU) is parsed from the user's hashtag and applied uniformly across all patterns in the output.

---

## Hashtag grammar

Users invoke the composer with the hashtag pattern:

```
#proto <experience-name> #NU
#proto <experience-name> #NXT
```

Examples:
- `#proto trailblazer-match #NU` → builds the Trailblazer Match experience in Northeastern University brand
- `#proto cohort-pulse-dashboard #NXT` → builds the Cohort Pulse Dashboard in NXT Humans brand
- `#proto co-op-readiness-coach #NU` → builds the Co-op Readiness Coach in NU brand

If the brand hashtag is omitted, **NXT is the default**. If `#proto` is omitted, the composer skill does NOT activate (allow free-form prototyping for non-production explorations).

---

## Catalog reference

The full pattern catalog lives at `/hic-workspace/wiki/inspiration-hub/ai-patterns/` (browsable) and `/hic-workspace/wiki/inspiration-hub/ai-patterns/_catalog.json` (machine-readable). Both NXT and NU brand variants render live with the data-brand attribute toggle.

The catalog is the source of truth. When a new pattern is added there, it becomes immediately available to the composer.

### Pattern selection grammar

The composer references patterns by their CSS class root (`p-chat`, `p-stream`, etc.). When composing, the coder MUST:

1. Read `_catalog.json` (or, at minimum, this skill's mental model of it)
2. Decompose the requested experience into a sequence of interaction primitives
3. For each primitive, select the catalog pattern whose `best_for` matches
4. Compose the prototype using only those patterns
5. Honor the brand hashtag — NXT tokens for `#NXT`, NU tokens for `#NU`

---

## Stage 4 system prompt injection

Prepend this block to the Stage 4 Prototype Coder system prompt:

```
═════════════════════════════════════════════════════════════════
EXPERIENCE PROTOTYPE COMPOSER — STRICT COMPOSITION RULE
═════════════════════════════════════════════════════════════════

You are NOT inventing UI. You are COMPOSING from a curated catalog.

CATALOG: /hic-workspace/wiki/inspiration-hub/ai-patterns/
        (44+ hand-authored AI experience patterns in NXT and NU brands)

USER HASHTAG: {hashtag}
EXPERIENCE NAME: {experience_name}
BRAND: {brand}  ({brand_token_summary})

RULES (non-negotiable):
  1. Every UI region in your output MUST be a NAMED pattern from the catalog.
     Use the pattern's class root (p-chat, p-rec, p-dial, etc.) as the wrapper.

  2. Decompose the experience into a sequence of these primitives. Annotate
     each region in a leading comment:  <!-- pattern: p-chat -->

  3. Honor the brand hashtag uniformly. NXT tokens (Bebas Neue / Archivo /
     JetBrains Mono / chartreuse / 2px) OR NU tokens (Spectral Light / Roboto
     / Roboto Mono / Huskies red / 8px). NEVER mix tokens within one output.

  4. If no catalog pattern matches a region you want to build, you may NOT
     invent one. Instead pick the closest existing pattern OR omit the region
     and surface a "this experience needs a new pattern" note for the curator.

  5. The set of legal patterns is the catalog's class roots, which currently
     include (non-exhaustive): p-chat, p-stream, p-voice, p-pills, p-trail,
     p-synth, p-dial, p-kg, p-rec, p-diff, p-input, p-multi, p-code, p-img,
     p-doc-outline, p-slide-draft, p-eval, p-compare, p-halu, p-cost,
     p-models, p-instr, p-mem, p-tools, p-pipe, p-branch, p-retry, p-fanout,
     p-search, p-facet, p-chart, p-sim, p-perm, p-node, p-hitl, p-cot, p-cmd,
     p-tldr, p-rubric, p-heat, p-pers, p-budget, p-trans, p-triage.

FORBIDDEN (will fail Stage 5 critic):
  - Generic SaaS modal as the primary experience surface
  - Tone slider + regenerate button as the entire UX
  - Centered chat input bar with nothing else
  - Skeleton loaders without a corresponding fetch + state binding
  - "Clean modern" aesthetic that doesn't commit to NXT or NU
  - Inventing new component shapes when a catalog pattern exists
  - Mixing NXT and NU tokens in a single output

OUTPUT STRUCTURE:
  - Start with a manifest comment listing every catalog pattern used:
      // PATTERN MANIFEST: p-chat, p-trail, p-rec, p-dial, p-pers
  - For each region, prefix with the pattern annotation:
      <!-- pattern: p-rec --><article class="p-rec">...</article>
  - Use the brand attribute on the root: <html data-brand="nu"> or "nxt"
═════════════════════════════════════════════════════════════════
```

---

## Output validation gate (Stage 5)

Stage 5 Critic must verify, before passing the prototype:

1. Every `<article>`, `<section>`, or `<div class="region">` has a `pattern-id` annotation
2. The brand attribute matches the parsed hashtag exactly
3. No CSS class outside the catalog's known pattern roots appears as a region wrapper
4. The PATTERN MANIFEST comment exists and lists at least 3 distinct patterns (no single-pattern prototypes — those are demos, not experiences)
5. If any region renders a `<Skeleton/>` or `pulse` animation, a corresponding `useEffect` + state-setter exists in the same file (no orphaned loaders)

If any of these fail, Stage 5 returns `verdict: needs-rework` with a specific pointer to the offending region and which catalog pattern would have been correct.

---

## How users invoke

In the Analyst Desk chat, the user types:

```
#proto trailblazer-match #NU
build the alumni mentor matching experience for first-gen Khoury students
```

The HiC chat router parses the `#proto` hashtag, extracts `trailblazer-match` as the experience name and `#NU` as the brand, then routes through the prototype pipeline with the composer skill loaded. Stage 4 receives the strict-rule injection above and composes the prototype exclusively from the catalog in NU brand.

---

## Catalog growth

The catalog grows in batches across domains:

- **Batch 1 — AI core (44 patterns shipped)**: conversation, reasoning, decision, generation, oversight, configuration, workflow, retrieval, control, calibration
- **Batch 2 — Data & dashboards** (pending): KPI tile, sparkline row, segmented bar, geo-choropleth, cohort retention, funnel, scorecard, trend annotation
- **Batch 3 — Education & cohort** (pending): course card, syllabus week-strip, gradebook, attendance roster, study group finder, office hours scheduler, assignment feedback
- **Batch 4 — Commerce & retail** (pending): product card, cart, checkout step, recommendation rail, wishlist, order tracker, return flow
- **Batch 5 — Editorial & articles** (pending): long-form reader, pull-quote, callout, author bio, related-reads, comment thread
- **Batch 6 — Mobile-first** (pending): bottom-sheet, swipe-action row, pull-to-refresh, mobile tab bar, native picker, mobile keyboard input
- **Batch 7 — Finance / insurance / donations** (pending): balance card, transaction row, allocation pie, donation slider, policy quote, premium calculator
- **Batch 8 — Video & multimedia** (pending): video player, scrub bar with chapters, transcript sync, watch-party, multi-cam picker
- **Batch 9 — Voice & avatar** (pending): voice orb states, avatar reaction, lip-sync indicator, voice clone picker, accent + tone control
- **Batch 10 — Simulation & training** (pending): scenario chooser, decision-tree replay, branching outcome, score band, retry-with-hint

Target: 200+ patterns across 10 batches. Each batch ships in one focused session.

---

## Related skills

- [[design-exemplar-curator]] — provides reference exemplars from Behance to guide WHICH catalog patterns match a brief. The two skills compose: curator picks references → composer picks patterns from catalog → coder renders.
- [[nxt-visual-renderer]] — the NXT design system contract that catalog patterns honor in NXT mode
- [[verbalized-sampling]] — used when the composer must choose between multiple plausible pattern combinations (k=5 candidate prototype compositions, lowest-p wins)
- [[constrain]] — used to author the FORBIDDEN block in the Stage 4 injection
- [[qa-gate]] — used to author the Stage 5 validation checks
