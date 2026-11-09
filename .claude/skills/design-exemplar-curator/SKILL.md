---
name: design-exemplar-curator
description: "Match a prototype brief and its brand hashtag to the strongest Behance exemplars and pick one verbalized-sampling framing per match. Loaded by #proto Stage 3 (visual direction) and Stage 4 (prototype coder) so the design direction cites real references."
invocation: model
version: "1"
status: active
trigger: load at Stage 3 (Visual Direction) and Stage 4 (Prototype Coder); also at Brief Generator Pass 2 when `visual_direction.exemplar_refs` is empty
inputs: brief.concept, brief.interaction_pattern, brief.aesthetic_keywords, brief.committed_frame, brief.brand_hashtag
outputs: brief.visual_direction.exemplar_refs (array of {exemplar_id, framing_letter, rationale}), Stage 4 system-prompt injection block
data_source: hic-workspace/wiki/exemplars/behance/_raw_index.json + per-exemplar HTML pattern pages
brand_dependencies: NXT (chartreuse + Bebas Neue + Archivo + JetBrains Mono) | NU (Huskies red + Spectral Light + Roboto + Roboto Mono + navy ink-900)
---

# Design Exemplar Curator

## Scope

Curated reference library skill that matches a prototype brief's concept and brand hashtag to the highest-signal Behance exemplars and selects ONE Verbalized-Sampling framing (α-ε) per match. Loaded by Stage 3 (Visual Direction) and Stage 4 (Prototype Coder) of the prototype pipeline. Replaces the "clean modern" aesthetic placeholder with named, evidence-backed visual references that ship into the coder's system prompt as STUDY-THESE images + framing rules. The retrieval is hashtag-aware — #NXT-radical loads framing ε, #NXT-convention loads α/δ, #NU-institutional swaps to NU brand and loads NU α/γ, #DECIEM swaps to the DECIEM brand and loads framing α. Used wherever a brief's `visual_direction` or `interaction_choreography` needs grounding in real-world design quality rather than the LLM's typicality bias.

## Why this skill exists

The HiC prototype pipeline was shipping generic Copilot-clone UIs because Stages 3 and 4 had no authoritative reference library. The brief said `aesthetic_keywords: "clean modern"` and the coder defaulted to the modal SaaS shell (white modal + tone slider + regenerate button) every single time. This skill replaces "clean modern" with five real Behance exemplars and a chosen Verbalized-Sampling framing per match — so the coder has a concrete visual target, not a vague mood.

The reference library lives at `/hic-workspace/wiki/inspiration-hub/` (browsable HTML gallery) and `/hic-workspace/wiki/exemplars/behance/_raw_index.json` (machine-readable index). Each exemplar with a `Pattern Translation` page has 5 NXT framings + 5 NU framings authored by the reasoning model with Verbalized Sampling.

## Inputs

The skill expects a `brief` object with at least:

```typescript
{
  concept: string;                    // e.g., "Alumni mentor matching for first-year Khoury students"
  interaction_pattern: string;        // e.g., "multi-identity-reasoning", "schedule-negotiation"
  aesthetic_keywords?: string[];      // e.g., ["editorial-dark", "warm-institutional"]
  committed_frame: 'radical' | 'convention-honoring' | 'unspecified';  // Stage 1 VS commitment
  brand_hashtag: '#NXT' | '#NU' | '#NXT-radical' | '#NXT-convention' | '#NU-institutional' | '#NU-editorial' | '#DECIEM';
}
```

## Retrieval Algorithm

1. **Tag mapping** — Convert `interaction_pattern` to a primary tag set. Mapping:
   - `multi-identity-reasoning` → `ai-chatbot`, `persona`, `profile`
   - `schedule-negotiation` → `ai-chatbot`, `mobile-ui`, `checklist`
   - `data-narrative` → `dashboard`, `data-visualization`
   - `editorial-pitch` → `landing-page`
   - `cohort-onboarding` → `mobile-ui`, `profile`, `gamification`
   - (extend by reading `tag_queries` in `_raw_index.json`)

2. **Filter exemplars** — From the raw index, keep entries where `primary_tag` or any `all_tags` overlaps the mapped tag set AND `appreciations >= 500` (institutional quality floor; lowered to 100 when no high-signal alternatives exist for a tag).

3. **Rank by goal-relevance** — Score each candidate by:
   - Keyword overlap between `brief.concept` and exemplar `title` (Jaccard, normalized)
   - `appreciations` (logarithmic scale)
   - Recency bonus if `fetched_at` within 90 days

4. **Pick top 5** — Return the 5 highest-scoring exemplars.

5. **Select a framing per exemplar based on hashtag**:
   - `#NXT-radical` → framing **ε** (terminal-grade subversion)
   - `#NXT-convention` → framing **α** (typography-led) or **δ** (color-restraint) — pick by aesthetic_keywords
   - `#NXT` (unspecified frame) → framing **β** (motion-led) as the default expressive register
   - `#NU-institutional` → swap to NU brand, framing **α** (editorial-institutional) or **γ** (density)
   - `#NU-editorial` → framing **δ** (color-restraint) in NU palette
   - `#NU` (default) → NU framing **α** (editorial-institutional)
   - `#DECIEM` → DECIEM brand, framing **α** (typography-led): the system's identity is carried by Poppins Bold uppercase type on black / white, so α fits; δ would mute the pops. DECIEM (The Abnormal Beauty Company): black and white canvases, Poppins Bold uppercase headlines, Josefin Sans body, pink / cyan / purple / orange pops from the DECIEM PowerPoint template; tokens at /api/design-tokens?brand=DECIEM

6. **Compose the rationale** — One-sentence rationale per match: why this exemplar, why this framing. Format: `"behance-{id} / framing {letter} — {concept-bridge rationale}"`.

## Output 1 — `visual_direction.exemplar_refs`

Returned to the brief generator. Shape:

```json
{
  "exemplar_refs": [
    {
      "exemplar_id": "behance-241915081",
      "framing_letter": "ε",
      "brand": "nxt",
      "rationale": "Niva's multi-member identity strip is the exact pattern the brief needs; framing ε (terminal subversion) matches the radical commitment and avoids the modal SaaS register the Stage 4 coder defaults to.",
      "pattern_url": "/hic-workspace/wiki/exemplars/behance/ai-chatbot/niva-ai-family-assistant.html",
      "thumbnail_url": "https://mir-s3-cdn-cf.behance.net/projects/404/a8096c241915081...png",
      "source_url": "https://www.behance.net/gallery/241915081/Niva-AI-family-assistant"
    },
    // ...4 more
  ]
}
```

## Output 2 — Stage 4 Prototype Coder injection block

When Stage 4 begins, prepend this block to its system prompt:

```
═════════════════════════════════════════════════════════════════
DESIGN EXEMPLAR LIBRARY — STUDY THESE BEFORE WRITING CODE
═════════════════════════════════════════════════════════════════

You have 5 named reference shots that match this brief. Your generated
UI MUST visually pass a side-by-side comparison with these exemplars.

If your UI would look out of place next to them, you are wrong.

EXEMPLAR 1 — {title} (by {designer}, {appreciations} likes)
  Source: {source_url}
  Pattern translation: {pattern_url}
  Framing committed: {framing_letter} ({framing_name})
  Why this matters here: {rationale}

EXEMPLAR 2 — ... (repeat for all 5)

DESIGN-LANGUAGE COMMITMENT
  Brand: {brand}  ({brand === 'nxt' ? 'Bebas Neue / Archivo / JetBrains Mono / chartreuse on near-white' : 'Spectral Light / Roboto / Roboto Mono / Huskies red sparingly on navy ink'})
  Frame: {committed_frame}
  Forbidden patterns: modal-with-tone-slider, generic-copilot-shell,
    centered-input-bar-only, gray-skeleton-loaders-with-no-data-binding

DELIVERABLE RULES
  - Every UI region must echo one of the 5 exemplar framings, not invent a new one
  - Use the brand's typefaces by their exact names; do not approximate
  - Motion: borrow timing and easing from framing β (NXT 80ms stagger) or NU 180ms standard ease
  - If a region renders a loading state, it MUST have a corresponding fetch + state binding
═════════════════════════════════════════════════════════════════
```

## How to use the skill

In `prototypeBriefGenerator.ts` Pass 2 (after the skeleton is built), call:

```typescript
import { curateExemplarsForBrief } from './designExemplarCurator';

const exemplarRefs = await curateExemplarsForBrief({
  concept: brief.concept,
  interactionPattern: brief.interaction_pattern,
  aestheticKeywords: brief.aesthetic_keywords,
  committedFrame: brief.committed_frame,
  brandHashtag: brief.brand_hashtag,
});

brief.visual_direction.exemplar_refs = exemplarRefs;
```

In `prototypeBuilder.ts` Stage 4 (Prototype Coder), call:

```typescript
import { buildStage4InjectionBlock } from './designExemplarCurator';

const exemplarBlock = buildStage4InjectionBlock(brief.visual_direction.exemplar_refs, brief.brand_hashtag);
systemPrompt = exemplarBlock + '\n\n' + originalSystemPrompt;
```

## Quality gates this skill enforces

1. **No `aesthetic_keywords: "clean modern"`** — the brief generator must replace vague aesthetic strings with named exemplar references.
2. **No empty `exemplar_refs`** — if zero matches above the appreciations floor, the curator returns the global top 3 across all tags rather than nothing. Empty refs would let the coder default back to typicality bias.
3. **Brand consistency** — if `brand_hashtag` is `#NU-*`, the curator MUST pick framings explicitly authored for NU (the `nu` track on each Pattern Translation page). It MUST NOT pick the NXT track and expect the coder to translate. For `#DECIEM`, until a `deciem` track is authored, the curator passes the DECIEM design-language commitment in the Stage 4 block and the coder repaints from `/api/design-tokens?brand=DECIEM`.
4. **Frame discipline** — `committed_frame: radical` MUST select framing ε from every matched exemplar. If ε is not authored for a particular exemplar (only some are radical-capable), the curator drops that exemplar and pulls the next-best.

## Failure modes & recovery

- **Index unreachable** (`_raw_index.json` 404) → fall back to a built-in hardcoded list of 8 evergreen exemplars (Niva, Geovea, Closetly, Aqara, Genie, Voice Chat Room, Education-app-design, Customer Intelligence Analytics).
- **No tag matches** → return the global top 3 by `appreciations`, log a warning so the tag-mapping table can be extended.
- **Hashtag malformed** → default to `#NXT` and framing α.
- **No `Pattern Translation` page exists for a matched exemplar** → still return the exemplar with `pattern_url: null`; Stage 4 uses the thumbnail + title alone.

## Maintenance

When a new exemplar is added to the index, no skill change is required — the algorithm reads the index at runtime. New tags require updating the tag-mapping table in step 1. New framings beyond α-ε would require both the Pattern Translation pages and an update to the framing-selection logic in step 5.

## Related skills

- [[verbalized-sampling]] — the technique that authored the α-ε framings on each Pattern Translation page
- [[reinforcement-inference]] — used at brief Pass 2 to re-rank exemplar matches under uncertainty
- [[html-deliverable-composer]] — the rendering target for the Pattern Translation pages themselves
- [[nxt-visual-renderer]] — the NXT brand contract that framings α-δ honor
- [[constrain]] — used to author the FORBIDDEN PATTERNS block in the Stage 4 injection
