# Runtime Nano-Banana designer-skill for content-true deliverable images — evaluation + plan (2026-06-25)

> PLAN ONLY. Nothing in this document is wired or implemented. It evaluates replacing/augmenting the
> deterministic Figma-token `vizEngine` SVG approach with a RUNTIME designer skill that asks Nano
> Banana to generate an image appropriate to the ACTUAL content of each slide/deliverable, inserted
> into NATIVE PowerPoint picture placeholders at the Figma GOLD exemplar slot bounds. Uses verbalized
> sampling (VS: candidates + probabilities + commit) and reinforcement inference (RI: confidence +
> verify-before-build). Decision gates and open questions are listed for a later, gated build.

## 1. The proposed flow (as the user framed it)
1. User prompts the **Analyst Desk** with a deliverable hashtag (`#slides`, `#competitive`, `#journey`,
   `#prd`, `#arch`, …) + brand (`#NXT`/`#NU`) + the run industry.
2. **Opus 4.8** constructs the deliverable: decides structure, retrieves evidence from the **manifest
   chunks + wiki** (anti-RAG), writes the prose/payload.
3. From the ACTUAL returned content of each slide/section, Opus authors an **image prompt** (what the
   picture should depict for THIS content).
4. A **designer "skill"** at runtime calls **Nano Banana** (gemini-3.1-flash-image-preview) to render
   that image, brand-locked.
5. The image is inserted into a **native PowerPoint picture placeholder** positioned per the slide's
   **Figma GOLD exemplar/variant** slot bounds, honoring unified-vision principles.

This REPLACES (or augments) the current path where `vizEngine` renders a deterministic token-SVG and
drops it into the slot. The question this plan answers: should we, where, and how — safely.

## 2. What already exists (the substrate this builds on, all uncommitted this session)
- `services/vizEngine.ts` — deterministic, token-themed, LABELED diagram engine (12 families + 11
  domain forms + industry glyphs + collision-safe label placement). Content-true, $0, anti-slop.
- `services/vizSlot.ts` — `selectVizFamily` / `buildVizData` / `renderVizSlot` / `attachViz`
  (token-pure theme from `getBrand`, slot-sized to `HERO_PANEL` bounds).
- `slideToStageHtml` chokepoint — renders an authored `viz` block into the GOLD archetype image slot
  (preview), already wired.
- `gold_pptx_export._insert_native_picture` — LAYOUT-BACKED native PowerPoint picture placeholder
  (user-replaceable "Change Picture"), structurally verified.
- `registry.json.vizPatterns` + `wiki/.../visualization-families.md` +
  `visualization-patterns-by-industry.md` — the family contract + 1,100 few-shot exemplars.
- `.claude/skills/illustrator/` (Nano-Banana flat-vector illustrator) + the proven `#presentation`
  image pipeline (VS ideation → Nano Banana → knockout → cataloged library with reuse) — PRIOR ART
  for exactly this generate-and-insert loop.
The Nano-Banana proposal therefore is NOT greenfield: the generation loop already exists for
`#presentation`; this extends it to `#slides` + all `#deliverables` + native PPTX placeholders.

## 3. The core tension (why this is a real decision, not a swap)
| | vizEngine (deterministic SVG) | Nano Banana (runtime gen) |
|---|---|---|
| Content-true | YES — IS the data (scores/links/stages) | DEPENDS — only as good as the authored prompt; can hallucinate shapes |
| Brand fidelity | EXACT (tokens) | APPROXIMATE — model drifts from brand; needs guardrails |
| Determinism | YES (seed) | NO — re-runs differ (re-export instability) |
| Cost / latency | $0, instant | per-image cost + seconds of latency × N slots |
| Anti-slop | by construction | RISK — the #1 failure on this project is AI-image slop |
| Labels/precision | exact text, collision-safe | text-in-image is unreliable (garbled labels) |
| Vision: never-hardcode | tokens | prompt must inject tokens; output is raster, not token-bound |
| Vision: SPA never calls Figma | OK | OK (gen is a provider call, not Figma) |
| Editable in PPTX | native placeholder (vector→raster) | native placeholder (raster) |
RI read: the two are not substitutes across the board — they are **complementary by surface**. Data
diagrams (operating model, funnel, radar, gantt, matrix) demand precision/labels/determinism →
vizEngine. Emotive/conceptual imagery (section dividers, covers, persona mood, metaphor-free concept
art) → Nano Banana. Forcing one tool onto both surfaces is the trap.

## 4. VS — candidate architectures (k=6, probabilities, commit)
| # | Candidate | p | RI verdict |
|---|---|---|---|
| C1 | **Replace** vizEngine entirely with Nano-Banana per slot | .06 | REJECT — loses determinism, exact labels, $0 data-diagrams; re-export instability; raises the slop risk the project fights hardest |
| C2 | **Surface-routed hybrid**: a `visual-router` decides per slot — DATA/relational → vizEngine; EMOTIVE/conceptual → Nano-Banana designer skill; both land in the same native placeholder | .34 (modal) | **COMMIT (core)** — plays each tool to its strength; matches the existing #proto/#presentation routing doctrine; vision-pure (router reads tokens + Figma slot bounds) |
| C3 | Nano-Banana everywhere but **brand-locked prompt scaffold + knockout + post-filter** | .12 | PARTIAL — adopt the scaffold/knockout/filter AS the designer-skill contract for the EMOTIVE branch of C2; not as the universal renderer |
| C4 | **Generate-once + cache/library reuse** (content-hash keyed), variant-on-collision | .18 | **COMMIT (required modifier)** — the proven #presentation pattern; kills cost/latency/determinism objections by making a slot's image stable + reusable across re-exports and compiled decks |
| C5 | **Human-in-the-loop**: Designer Desk shows generated candidates, user picks before export | .14 | ADOPT (optional) — the approval surface for high-stakes decks; pairs with VS candidate generation |
| C6 | Per-`#deliverable` explicit override (`#img=generate` / `#img=diagram` / `#img=none`) | .16 | ADOPT (UX) — lets Analyst/Designer pin the branch when the router's default is wrong |
**Committed = C2 + C4 (+ C5/C6 optional).** A surface-routed hybrid where the designer skill (Nano
Banana, brand-locked, cached) owns the EMOTIVE branch and vizEngine owns the DATA branch; both deliver
into the same native PPTX placeholder at the Figma slot.

## 5. The designer-skill contract (the EMOTIVE branch, if built)
Pipeline, mirroring the proven `#presentation` loop:
1. **Opus authors `imageConcept`** from the slide's REAL content (subject, mood, the ONE idea), NOT a
   literal data restatement. Subject-discipline + anti-slop rules apply (no faces for personas, no
   metaphor clichés, no text-in-image).
2. **VS ideation** (gemini-3.5-flash, thinkingBudget:0) expands `imageConcept` → k candidate visual
   directions with probabilities; commit to the tail (non-obvious, on-brand).
3. **Brand-locked prompt scaffold** — the prompt injects brand tokens from `/api/design-tokens`
   (palette hexes, "flat vector, no gradient/shadow, NXT chartreuse #B8B800 focal / NU red #C8102E,
   near-black ground or stark white", aspect = the Figma slot ratio). NEVER hardcode the hexes in the
   skill; read them at runtime (never-hardcode principle).
4. **Nano Banana 2** (gemini-3.1-flash-image-preview) renders; **knockout** to transparent;
   **post-filter** (palette-distance check + reject off-brand/photoreal/text-bearing outputs → retry).
5. **Cache** keyed on (content-hash, brand, slot-aspect) → stable across re-exports; **variant-on-
   collision** so a deck never repeats an image; cataloged to the image library (reuse).
6. **Insert** into the native PPTX placeholder at the Figma GOLD slot bounds.

## 6. Figma GOLD slot bounds = canon (where the image must sit)
Per unified vision, the placeholder position is NOT invented — it is read from the Figma GOLD
exemplar/variant for each deliverable (mirrored into `figma-node-map.md` / `registry.json` +
`HERO_PANEL`-style slot maps). Every `#deliverable` GOLD page (cover, section-divider, thesis,
persona, case-study, competitive, journey, prd, arch, …) needs its **img-slot bounds catalogued**
(the per-content-archetype slot work deferred earlier). The native placeholder is placed at those
bounds inside the GOLD frame; the SPA never calls Figma live (reads the mirror).

## 7. Unified-vision compliance checklist (gates any build)
- [ ] **Never-hardcode**: brand palette/fonts/aspect injected into the prompt from `/api/design-tokens`,
      never a literal in the skill.
- [ ] **SPA never calls Figma live**: slot bounds from the mirrored registry/node-map, not live Figma.
- [ ] **Anti-slop**: no faces/photoreal/text-in-image/metaphor clichés; palette-distance post-filter.
- [ ] **Native replaceable placeholder**: layout-backed picture placeholder (proven), user can Change
      Picture.
- [ ] **Converge, don't build-new**: reuse the `illustrator` skill + `#presentation` gen loop +
      `costMeter` + the image library, not a parallel system.
- [ ] **Determinism for re-export**: cache so a given slot is stable across exports.

## 8. RI — confidence + the verify-before-build gates
- **Confidence**: HIGH that the hybrid (C2+C4) is correct and that the generation loop is feasible
  (it exists for `#presentation`). MED on brand-fidelity of Nano-Banana for the EMOTIVE branch at the
  quality bar this project demands (the recurring slop concern). LOW on text-in-image — so labeled
  data diagrams MUST stay on vizEngine.
- **Verify before broad build** (empirical gates, each a small spike):
  1. **Brand-fidelity spike** — generate 20 emotive images across NXT/NU; measure palette-distance +
     human pass-rate. Gate: ≥80% on-brand after the scaffold+filter, else the EMOTIVE branch is not
     ready.
  2. **Cost/latency ceiling** — N slots × per-image; confirm cache hit-rate on re-export ≈100%. Gate:
     a 12-slide deck adds < X s and < $Y on first run, ~$0 on re-export.
  3. **Placeholder fidelity** — generated image lands at the Figma slot bounds, is natively
     replaceable, survives save/reopen, renders in real PowerPoint (the open verification from this
     session — a human must confirm a real PPTX renders).
  4. **Router accuracy** — does the surface router pick diagram-vs-emotive correctly across the
     deliverable set? Gate: ≥90% correct on a labeled sample, else default to vizEngine + `#img`
     override.
  5. **Anti-slop regression** — run the slop detector over generated images' alt/prompt + a human
     review; zero faces/photoreal/text-bearing.

## 9. Bounded first build (later, gated — NOT today)
1. `visual-router` (per-slot: data → vizEngine, emotive → designer skill) keyed by deliverable +
   content shape; `#img` override.
2. `designer` skill = the brand-locked Nano-Banana contract (§5), reusing the `illustrator` skill +
   `#presentation` loop + image library cache.
3. Catalog the Figma GOLD img-slot bounds for every `#deliverable` archetype into the registry.
4. Export: route the chosen image (vizEngine SVG or Nano-Banana raster) into the layout-backed native
   placeholder at the slot bounds.
5. Gates §8 1–5 before turning it on by default.

## 10. Recommendation (one line)
Do NOT replace vizEngine. Build a **surface-routed hybrid**: vizEngine for labeled data diagrams
(precision/determinism/$0), a **brand-locked, cached Nano-Banana designer skill** for emotive/
conceptual imagery — both delivered into native PowerPoint placeholders at the Figma GOLD slot bounds,
gated by the §8 fidelity/cost/anti-slop checks. Reuse the existing `#presentation` generation loop;
converge, don't build-new.

---
PLAN ONLY — nothing wired. Session stopped here at user request (2026-06-25).
