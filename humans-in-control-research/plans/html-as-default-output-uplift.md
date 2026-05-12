# HTML-as-Default Output Uplift Plan for HiC

> **Source brief:** Thariq Shihipar's argument that HTML beats Markdown as the agent's default output format for human-review deliverables — information density, visual clarity, shareability, two-way interaction, and joy. Article references Claude Code; we use Gemini 3.1 Pro and GPT-5.5. The argument is **fully transferable** — it's about output medium, not about model capability. Gemini 3.1 Pro (1M context) and GPT-5.5 both generate well-formed HTML+SVG+CSS+JS at parity with Claude Opus.

---

## 1. Does this apply to us? (Yes — with one nuance)

**Model-agnostic.** The article's only model-specific point is the 1M-context cost tolerance for HTML's 2-4× token overhead. Gemini 3.1 Pro has 1M context too. GPT-5.5 with our max output budget (65K) also clears the bar. We already routinely produce 30-50KB JSON outputs for recommendations and 39KB single-file React prototypes via Gemini 3.1 Pro. HTML deliverables at the same scale are well within proven envelope.

**One nuance: brand-fidelity.** The article shows HTML artifacts with a designer's eye for color and type. HiC has a non-negotiable brand spec (NXT default, NU when requested). Off-the-shelf HTML output from any model will drift to generic SaaS aesthetic — rounded cards, Tailwind defaults, gradient pastels — and look nothing like NXT. **Every HTML-output touchpoint must inject the NXT brand-lock** the same way the prototype pipeline does. We already have this pattern proven for `#proto`; we extend it to all HTML deliverables.

---

## 2. Audit — where Markdown (or generic prose) lives in HiC today

Categorized by who reads it and how much human-review value HTML would add:

### Category A — Human-review deliverables (HIGH leverage for HTML conversion)

These are outputs a human (the user, a client, a senior partner) is meant to **read and absorb**. Markdown's flatness is hurting us here. HTML's information density, embedded SVG, and visual hierarchy would directly lift comprehension and shareability.

| Touchpoint | Where in code | Current format | HTML uplift |
|---|---|---|---|
| **AI Analyst chat — synthesis answers** | `CorpusChatPanel.tsx` → `sendChatMessage` | Prose in chat bubbles | Side-panel HTML artifact for any answer over ~200 words. SVG diagrams for theme-relationships, evidence chains, drill-downs. |
| **Strategic Report** | `geminiService.ts` → `generateStrategicReport` | JSON-rendered-to-slides | A self-contained HTML report with Rumelt Kernel SVG diagram, tabbed sections, embedded evidence panels, NXT styling. Far more readable than 30 slides for prose-dominant strategy. |
| **Cross-Cutting Synthesis** | `geminiService.ts` → `generateCrossCuttingSynthesis` | JSON | HTML explainer page with SVG showing how 3-5 themes converge on a single insight; verbatim quotes inline. |
| **PRD** | `prd-compiler` skill | JSON → slides | HTML doc with section nav, requirements tables, MoSCoW visual, code/API snippets in `<pre>`, embedded user-flow SVGs. |
| **Roadmap** | `roadmap-builder` skill | JSON → slides | HTML doc with NOW/NEXT/LATER as a swimlane SVG; per-initiative drill-down expandable; "Copy as prompt" buttons to iterate. |
| **Gap Analysis** | `gap-analysis-evaluator` skill | JSON → slides | HTML page with Gartner-maturity gauge SVG per capability; risk heatmap table; severity-coded gap list. |
| **Tech Architecture** | `tech-arch-generator` skill | JSON → slides | HTML page with C4-style SVG of components + flows; not just a list of bullet points. |
| **Tech Audit** | `tech-audit-inspector` skill | JSON | HTML systems-inventory table + integration map SVG. |
| **Competitive Analysis** | `competitive-analyst` skill | JSON → slides | HTML matrix with sortable axes; per-competitor drill-down panels. |
| **Service Blueprint** | `service-blueprint-mapper` skill | JSON → custom React renderer | Keep React for in-app interactivity. Export as HTML artifact for sharing. |
| **Persona Cards** | `persona-architect` skill | JSON → custom React | Keep React in-app. Export as HTML one-pager per persona for stakeholder hand-off (portrait + quote + JTBD + pain-points). |
| **Engagement Briefing for a Stakeholder** | (does not exist yet) | N/A | NEW: "brief Liz on the CLR opportunity" → HTML one-pager with embedded data. |

### Category B — Two-way interaction artifacts (MEDIUM-HIGH leverage)

These are already React components. The HTML pattern doesn't replace them — but the article's two-way-interaction philosophy ("export as prompt") DOES apply.

| Touchpoint | Where | Current | HTML-pattern uplift |
|---|---|---|---|
| **Design Desk artifacts (journey, blueprint, org chart)** | `design-desk/` | Interactive React canvas | Add "Copy as prompt" button: serializes the current state as a prompt-shaped string the user can paste back into the AI Analyst chat for iteration. Mirror the "tune in browser, paste back" pattern from the article. |
| **Recommendation tiles** | `CorpusChatPanel.tsx` | React tiles (just shipped with VS-Multi) | Already export-as-prompt via the `#proto` chip pattern. ✓ |
| **Knowledge Graph** | `AnalystDeskKnowledgeGraph.tsx` | Interactive React | Add "Export current selection as a brief" → HTML artifact summarizing the selected theme/persona cluster with evidence. |
| **Prototypes (Stage 1-5)** | `prototypeBuilder.ts` | Already self-contained HTML+JSX served at `/api/prototypes/{slug}/view` | Already HTML. ✓ Pattern is proven and we extend it for the artifacts library below. |

### Category C — Interim / machine-read artifacts (LOW leverage — keep as is)

These are produced by the pipeline and consumed by other pipeline stages or RAG. Humans browse them via search, not via reading. Converting to HTML would be a big lift with no real gain.

| Touchpoint | Current | Keep as Markdown? |
|---|---|---|
| Wiki articles (`hic-workspace/wiki/articles/*.md`) | Markdown | ✓ Keep — RAG-indexed, viewed in WikiArchiveBrowser |
| Source archives (`wiki/sources/*.md`) | Markdown | ✓ Keep — RAG-indexed |
| Engagement memory, learned-constraints, log.md | Markdown | ✓ Keep — referenced by generations, not human-read |
| Session snapshots | JSON | ✓ Keep — structured, machine-restored |
| Topic-model results | JSON | ✓ Keep — structured |
| Citation chunk maps | JSON | ✓ Keep — structured |

---

## 3. The pattern we already have, extended

We have a proven HiC-native pattern for hosting self-contained HTML artifacts: the prototype pipeline.

```
SPA chat handler  ──fetch──►  proxy /api/prototypes (POST)  ─►  JSON saved
                                                               │
                                                               ▼
SPA chat renders Launch Card with prototypeUrl
                                                               │
                                                               ▼
Browser opens new window  ──fetch──►  proxy /api/prototypes/{slug}/view
                                                               │
                                                               ▼
proxy injects HTML wrapper (NXT design tokens, brand-lock, error handler,
React/framer-motion/lucide-react UMD scripts, alert-strip, redeclaration-strip)
+ generated React JSX → self-contained HTML at the URL
```

**The same pattern, applied to deliverable artifacts:**

```
SPA chat handler  ──fetch──►  proxy /api/artifacts (POST)  ─►  JSON saved
                                                              │
                                                              ▼
Chat renders an Artifact Launch Card (same UX shape as prototypes)
                                                              │
                                                              ▼
Browser opens new window  ──fetch──►  proxy /api/artifacts/{slug}/view
                                                              │
                                                              ▼
proxy injects HTML wrapper:
  - NXT/NU design-system CSS variables (color, type, spacing, motion)
  - Bebas Neue + Archivo + JetBrains Mono via Google Fonts
  - Print stylesheet (so the user can save-as-PDF cleanly)
  - "Copy as prompt" helper script (selects DOM region, formats as prompt
    string, copies to clipboard, opens chat with prefilled input)
  - Anti-mode-collapse defaults (no rounded-card SaaS aesthetic)
  - Optional embedded data attribute: __HIC_ARTIFACT_SOURCE__ = the structured
    JSON the artifact was rendered from (so it can be edited/iterated)
```

**Two endpoints add, two skills add, ~one day of work for the foundation.** Then each deliverable type gets a follow-up sprint that opts in.

---

## 4. The reusable skill: `html-deliverable-composer` — **composed with Verbalized Sampling from day one**

Mirror the `recommendation-architect` and `verbalized-sampling` skills. One canonical source of truth for HTML deliverable structure, fetched at runtime by every touchpoint that opts in.

**Critical composition rule:** this skill loads `verbalized-sampling/SKILL.md` as a dependency. Every HTML-output system prompt prefix is built as:

```
vs-skill + html-composer-skill + topic-specific-instructions
```

VS provides the **horizontal capability** (escape mode collapse at generation time). The HTML composer provides the **vertical surface** (NXT-styled, shareable, interactive deliverables). They compose because HTML generation mode-collapses at five distinct layers — visual layout, information architecture, diagram type, interaction pattern, iconography — and VS is the proven cure for each.

### The five VS-instrumented layers inside every HTML generation

| Layer | Default mode-collapse | VS recipe |
|---|---|---|
| **Visual layout** | Logo top, title centered, body below. Always. | Enumerate k=5 layouts (centered-card p≈0.40, editorial-asymmetric p≈0.18, split-screen quote-led p≈0.12, dashboard data-led p≈0.10, marginalia+body p≈0.05). Commit to one in a `<vs_thinking>` preamble. |
| **Information architecture** | Heading + paragraph + bulleted list. Always. | Enumerate k=5 IAs (heading-led, flow-diagram-led, code-annotation-led, Q&A, worked-example, decision-tree). Commit to shifted-frame. |
| **Diagram type** | Rectangles with arrows. Always. | For every `<svg>` block, preceding micro-VS enumeration: 5 candidate diagram types (flowchart, sequence, swimlane, matrix, Sankey, state machine, radial, timeline) with probabilities, commit to the one that fits the data. |
| **Interaction pattern** | Sliders. Always. (For `#playground` especially.) | Enumerate k=5 interaction patterns (sliders, before/after swap, drag-to-position, easing-curve picker, code-with-live-preview, motion timeline). Commit to the pattern that actually visualizes the parameter shape. |
| **Iconography vocabulary** | Default lucide-react icons every time. | Enumerate icon vocabularies (geometric / hand-drawn / monogram / data-glyph / typographic) and commit before instantiating. |

### The `--variants k` modifier (Thariq's "show me 6" pattern, formalized)

Every directive accepts `--variants k` (default k=1, max k=6). When `k > 1`, the model emits k distinct variants of the SAME deliverable in a single HTML grid. Each variant carries:
- A visible **probability annotation** (rendered as a small pill in the variant's corner)
- A one-line **"tradeoff this variant makes"** caption
- A **"Pick this"** button that promotes the chosen variant to a canonical artifact and saves it

This formalizes the article's onboarding-screen 6-variant example. `#brief Liz proposal --variants 6` produces a 2×3 grid of distinct stakeholder briefings; user picks one; the picked variant becomes the saved artifact (other 5 are stashed in a `.variants_history/` subfolder for re-promotion later).

### What the skill file teaches the model

`.claude/skills/html-deliverable-composer/SKILL.md` teaches the model:

- **Composition contract — load `verbalized-sampling/SKILL.md` first.** Open the skill with: "This skill composes with the verbalized-sampling skill. Fetch `/skills/verbalized-sampling/SKILL.md` and prepend it. Apply VS at all five layers per the table above before emitting HTML."
- **The `<vs_thinking>` preamble** that every HTML generation opens with — enumerate k candidates at the relevant layer with probabilities, commit to one, then write the HTML.
- **The `--variants k` modifier** behavior — when present, emit k distinct variants in a single HTML grid with picker UI.

- **NXT design-system locked tokens** in CSS variables (`--nxt-bg`, `--nxt-accent`, `--nxt-text-primary`, font families, spacing scale — exactly what we already lock for prototypes)
- **NU brand variant** (Pantone 200 `#C8102E`, Roboto Condensed + Open Sans) — same as `BRAND_TOKENS` in `prototypeBuilder.ts`
- **The 8 information types** to choose from (tables, design tokens, SVG illustrations, code blocks, interactions, workflow diagrams, spatial/canvas, embedded images) — per the article's Figure 1
- **5-7 SVG recipes** for common consulting diagrams: Rumelt Kernel triptych, before/after comparison, evidence chain, swimlane roadmap, maturity gauge, decision tree, theme cluster
- **The "two-way interaction" pattern**: every HTML artifact carries at least one "Copy as prompt" button at the bottom, formatted as `#refine <slug> <user-tweak>` that pastes back into the chat input
- **Anti-mode-collapse defaults**: no `border-radius: 8px` rounded SaaS cards, no gradient pastels, no Bootstrap-shaped pages. Editorial layouts. Sharp 2px corners. Restraint. (Same anti-patterns we already enforce for prototypes — extract into shared rules.)
- **Print stylesheet** included by default so the user can save-as-PDF for stakeholder hand-off
- **Mobile responsive** at 768px so the artifact renders well on a phone for executive review
- **Embeddable `__HIC_ARTIFACT_META__` script tag** containing the source JSON so the artifact can be round-tripped via the chat

Every touchpoint that wants HTML output:
1. Fetches this skill content
2. Prepends it to the system prompt
3. Asks the model for an HTML string (not JSON)
4. POSTs the HTML to `/api/artifacts` with metadata
5. Posts an Artifact Launch Card in chat

---

## 5. The new chat directives (user-facing UX)

Add to `hashtagParser.ts`:

| Directive | Trigger | Output |
|---|---|---|
| `#brief <topic>` | User wants a stakeholder-grade one-pager | HTML one-pager artifact in new window. NXT styling. Bebas Neue title, SVG diagram, evidence panel, "Copy as prompt" footer. |
| `#explainer <topic>` | User wants a deep-dive readable explanation | HTML page with flow diagram up top, annotated code/data snippets beside prose, gotchas at bottom. Modeled exactly on the article's "How rate limiting works" example. |
| `#report <topic>` | Long-form strategic report | HTML report with tabbed sections, embedded charts, executive summary on top. Replaces the slide-deck-shaped strategic report for prose-dominant content. |
| `#playground <feature>` | Interactive tuning surface | HTML with sliders / toggles / inputs. "Copy as prompt" button serializes the user's settings as a prompt for iteration. Modeled on the article's checkout-button-hover example. |
| `#approaches <decision>` | Three side-by-side options | HTML 3-column comparison with pros / cons / "Pick this" button. Modeled on the article's "Pick an approach" example. |
| `#sharable` | Append to any other directive | Save the artifact AND copy a shareable URL to the clipboard for stakeholder hand-off. |

The `#presentation` / `#proto` / `#prototypes` / `#recommendations` directives already exist. The new directives slot in as siblings.

The user-facing experience: "Here's my answer" stays as terse prose in chat. When the user wants the **substantive artifact**, they signal via directive. The chat doesn't bloat with massive responses every turn — but on-demand depth is one keystroke away.

---

## 6. New `/api/artifacts` endpoints in the proxy

Sibling family to `/api/prototypes`. Same shape, different storage.

```
POST   /api/artifacts                 — save artifact (slug, title, html_source, structured_meta_json, generator)
GET    /api/artifacts                 — list saved artifacts (for #artifacts library directive)
GET    /api/artifacts/{slug}          — load full payload
GET    /api/artifacts/{slug}/view     — serve runnable HTML with NXT brand wrapper injected
DELETE /api/artifacts/{slug}          — soft-delete to .deleted/
```

Storage path: `hic-workspace/artifacts/{slug}.json` (same volume-mount pattern as prototypes, prototypes-soft-delete, session snapshots).

The `/view` endpoint injects:
- `<!DOCTYPE html>` + HTML5 head with Google Fonts (Bebas Neue, Archivo, JetBrains Mono, plus Roboto Condensed + Open Sans for NU)
- `<style>` block with NXT design tokens as CSS variables — hoisted from `BRAND_TOKENS` in `prototypeBuilder.ts` into a shared `BRAND_TOKENS_CSS` constant
- `<script>` block with the "Copy as prompt" helper, "Open in chat" handler (postMessage back to opener window), and the embedded `__HIC_ARTIFACT_META__` JSON
- Print stylesheet
- The model-generated HTML body content

This is exactly what the prototype wrapper does today, minus the React-runtime UMDs (artifacts are static; they don't need React).

---

## 7. Reuse, don't fork — the prototype runtime hardening already paid for itself

We discovered four hard runtime traps in the prototype pipeline and fixed them server-side:
1. `export` token strip
2. Top-level React/framer/lucide redeclaration strip
3. lucide-react UMD swap (icons as React components, not raw SVG data)
4. `window.react = window.React` alias for lucide-react UMD factory
5. `alert()` strip

For static artifacts (no React) only #1 and the brand-token injection apply. Most of the hardening cost is sunk — the artifact endpoint is a SIMPLER subset of the prototype endpoint.

We can refactor the prototype endpoint into:
- `serve_html_artifact(html_body, mode='prototype'|'static')` shared helper
- `mode='prototype'` adds the React/framer-motion/lucide-react/Babel UMDs and the runtime guards
- `mode='static'` only adds the brand-token CSS and the Copy-as-prompt helper

Estimated effort: **S** (3-4 hours) for the refactor + the new endpoint family.

---

## 8. Where Markdown / JSON stays correct (intentional exclusions)

Per the article's framing — agents talking to other agents is fine in Markdown/JSON. The question is human-review.

- **Wiki articles** stay Markdown — they're RAG-indexed and not designed for human flow-reading.
- **Source summaries** stay Markdown — same.
- **Session snapshots** stay JSON — machine-restored.
- **Topic-model results, citation maps, chunk maps** stay JSON — structured, programmatic.
- **Recommendation JSON, persona JSON, theme JSON** stay JSON — the SPA renders them with custom React; HTML for these would discard the interactivity we built. The HTML PATH for these is the EXPORT — "save personas as a one-pager HTML" is a new artifact directive, not a replacement for the live React view.

---

## 9. Cost / token discussion

The article warns HTML takes 2-4× tokens vs. Markdown. For HiC specifically:

| Touchpoint | Current tokens | HTML tokens (est.) | Worth it? |
|---|---|---|---|
| AI Analyst chat per-turn prose | ~500-2000 | ~2000-6000 if user opts in via `#brief` | YES on demand, NO by default. Keep prose in-chat. |
| Strategic Report (currently JSON-to-slides) | ~25K JSON | ~30-40K HTML | YES — same scale, more shareable, more useful as a deliverable |
| Cross-cutting Synthesis | ~3K | ~8K | YES — SVG of the convergence makes the synthesis click |
| Theme Synthesis (existing JSON pipeline) | ~25K JSON | KEEP JSON | NO — already feeds SPA, not human-read |
| Recommendations (just shipped VS-Multi) | ~50K JSON | KEEP JSON | NO — live React tile grid is the right surface; ADD an "Export as HTML pitch deck" artifact button |

**Rule of thumb**: convert when the user **reads** the output. Keep structured when the SPA **renders** the output. The `#brief` / `#explainer` / `#report` directives are opt-in so the cost is only paid when the user explicitly wants the deliverable.

---

## 10. Rollout sequence

### Sprint H1 — Foundation (S, 3-4 engineer-hours)
1. Add `/api/artifacts` endpoint family to `proxy/app.py` (mirror of `/api/prototypes`)
2. Extract `BRAND_TOKENS_CSS` constant shared between prototype and artifact endpoints — hoist from `prototypeBuilder.ts` `BRAND_TOKENS`
3. Refactor prototype `/view` endpoint into shared `serve_html_artifact(mode)` helper
4. **Create `.claude/skills/html-deliverable-composer/SKILL.md` — opens with the VS composition contract (loads `verbalized-sampling/SKILL.md` first), encodes the five-layer VS-instrumented HTML generation pattern, defines the `<vs_thinking>` preamble shape, defines the `--variants k` modifier behavior, locks NXT/NU brand tokens, lists the 8 information types from the article, ships 5-7 SVG diagram recipes paired with VS diagram-type enumeration prompts.**
5. Register the skill in `hic-workspace/skill-manifest.json` with a `composes_with: ['verbalized-sampling']` field

### Sprint H2 — `#brief` and `#explainer` directives (M, 6-8 hours)
1. Add `parseBriefDirective` / `parseExplainerDirective` to `hashtagParser.ts`. **Both directives accept `--variants k` (1-6) — default 1.**
2. Wire handlers in `CorpusChatPanel.tsx`:
   - Pull engagement context + corpus excerpts (same payload as recommendations)
   - **Compose system prompt: fetch BOTH `verbalized-sampling/SKILL.md` AND `html-deliverable-composer/SKILL.md` in parallel, concatenate `vs + html_composer + topic_instructions`. Same pattern we just shipped for `#recommendations`.**
   - Call Gemini 3.1 Pro with `responseMimeType: text/html` (not JSON), `thinkingBudget: 'max'`, `temperature: 0.85`
   - **For `#brief`**: VS applies primarily to **visual layout** layer (centered-card vs editorial vs split-screen vs marginalia)
   - **For `#explainer`**: VS applies primarily to **information architecture** layer (flow-led vs snippet-led vs Q&A vs worked-example vs decision-tree). Article's "How rate limiting works" example is the IA we're trying to match.
   - When `--variants k` present, prompt asks for k distinct variants in a 2×N grid with probability pills + tradeoff captions + "Pick this" buttons. Picked variant promoted via a POST to `/api/artifacts/{slug}/promote-variant`.
   - POST result to `/api/artifacts`
   - Post Artifact Launch Card in chat
3. Add `ArtifactLaunchCard` and `ArtifactLibraryGrid` React components (mirror of `PrototypeLaunchCard`)
4. Smoke test on three engagement types (NU/CLR, healthcare/HIPAA, fintech/Customer-360). For each, also test `--variants 6` once to validate the grid-picker pattern.

### Sprint H3 — Strategic Report as HTML (M, 6-8 hours)
1. Add an `#html` modifier to the existing strategy-report generation path: when present, generate the report as an HTML artifact instead of a slide-deck-shaped JSON
2. **Compose three skills: `verbalized-sampling` + `html-deliverable-composer` + `strategic-report-writer`. VS applies to section IA selection (default Exec Summary / Findings / Recs / Next Steps vs. shifted-frame structures suited to the engagement).**
3. The HTML report includes Rumelt Kernel SVG triptych (preceded by micro-VS on diagram-type — does this engagement want triptych or sequence-flow?), tabbed sections, evidence panels with verbatim quotes from the corpus, footer "Copy as prompt" button to round-trip
4. Auto-save to artifacts library
5. Existing slide-deck path stays as-is (some users will still want PPTX) — `#html` is additive

### Sprint H4 — `#report` / `#playground` / `#approaches` directives (M, 6-8 hours)
1. Mirror the Sprint H2 wiring for the three new directives — every handler loads `verbalized-sampling` + `html-deliverable-composer` skills.
2. **`#playground` benefits from VS the most.** Default = sliders, always. The VS-instrumented version: model enumerates k=5 interaction patterns (sliders p≈0.45, before/after swap p≈0.18, drag-to-position p≈0.12, easing-curve picker p≈0.10, code-with-live-preview p≈0.05, motion timeline p≈0.05) BEFORE writing the HTML, picks the pattern that actually visualizes the parameter shape, builds that. For an animation easing curve that's a Bezier picker + play-button — not three horizontal sliders.
3. **`#approaches` IS VS-Multi by definition.** Aliased as `#approaches` for UX clarity. Turn 1 = 3 conventional approaches the team would consider. Turn 2 = 3 MORE approaches at `p < 0.05` explicitly distinct from turn 1. The 6-card grid renders Defensible/Non-Obvious split inline with probability pills (same UX as the recommendations grid we just shipped — different surface).
4. **`#report` VS applies to section IA.** Model enumerates 3-5 alternative report structures with probabilities before committing.

### Sprint H5 — Two-way interaction in existing artifacts (S-M, 4-6 hours)
1. Add "Copy as prompt" buttons to:
   - Recommendation tiles (export the full consulting brief as a prompt string for `#brief` or `#explainer` follow-up)
   - Persona cards (export the persona as a `#proto` brief)
   - Design Desk artifacts (export current state as a `#refine` prompt)
2. The clipboard format is consistent: `#brief <topic>: <serialized context>`
3. **Each "Copy as prompt" button also accepts a shifted `#brief --variants 3` shortcut to request VS-multi exploration on the picked surface.**

### Sprint H6 — Artifact library directive `#artifacts` (S, 2-3 hours)
1. Bare `#artifacts` hashtag lists all saved artifacts (mirror of `#prototypes` / `#presentations`)
2. Cards show: title, generator (`#brief` / `#explainer` / etc.), date, preview thumbnail, **variant-history badge if the artifact was promoted from a `--variants k` grid**
3. Launch / Edit / Delete chips, plus **"Show other variants" chip** for artifacts that have a `.variants_history/` folder — opens the original 2×N grid so the user can re-pick.

### Sprint H7 — Designer chat (Design Desk) HTML output (M, 6-8 hours)
1. The Design Desk's `chatToArtifact` and `chatToSlideSpec` services currently produce React-renderable structured data. Add an "Export as HTML" code path that converts the current artifact to a standalone HTML file.
2. **The export pipeline composes with VS on diagram-type selection.** Every embedded SVG diagram is preceded by a micro-VS on the right diagram type for the persona/journey/org-chart being exported (default rectangles+arrows vs. radial / sequence / matrix etc.).
3. HTML carries the artifact's interaction model where possible (drag-and-drop persona cards, expandable journey stages) so the stakeholder receiving the HTML can interact with it without HiC.

---

## 11. Success criteria

1. **Diversity of output surfaces** — same engagement produces visually distinct deliverables (brief vs. explainer vs. report vs. playground). User picks the right surface for the audience.
2. **Sharability test** — user can take a HiC artifact URL, paste it into Slack/Teams/email, recipient opens it in their browser, sees a fully styled NXT-branded artifact without HiC running.
3. **No-bloat chat** — chat responses stay terse prose by default; HTML artifacts open in side panels / new windows only when the user explicitly invokes a directive.
4. **Round-trip fidelity** — every HTML artifact has a working "Copy as prompt" button that pastes a prompt back into the chat for refinement.
5. **Brand fidelity** — every generated HTML artifact matches NXT (or NU when requested) brand tokens character-for-character: Pantone 200 `#C8102E` for NU red (never `#C00000`), Bebas Neue for NXT display (never substituted), 2px corners (never default 8px rounded).
6. **Zero regression in machine-read paths** — wiki articles, RAG sources, session snapshots, topic models, citation maps all stay in their current formats.
7. **VS composition is visible** — every HTML artifact's `<vs_thinking>` preamble is preserved in a collapsed `<details>` block at the bottom of the artifact (so the user can audit the model's enumeration → commitment). Probability annotations from variant grids are rendered visibly on each variant card.
8. **Layer-specific mode-collapse resistance** — across 10 same-prompt runs, the 5 VS-instrumented layers produce visibly different choices: visual layout varies, diagram type varies per diagram, interaction pattern in `#playground` is not always sliders, etc. Manual audit of 10 consecutive `#brief` runs on the same topic should yield 5+ distinct layout shapes.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Brand drift on HTML outputs (model defaults to generic SaaS aesthetic) | Same brand-lock + `brand_fidelity_red_flags` block we already enforce for prototype Stage 3 — copied into `html-deliverable-composer` skill |
| Token cost 2-4× higher | All HTML directives are OPT-IN. Default chat stays prose. User chooses when to spend the budget. |
| HTML diffs are noisy in version control (article calls this out) | Artifacts are stored as JSON (with html_source as a field) — no version control planned. They're disposable deliverables, not source code. |
| Inconsistent rendering across browsers | Stick to plain HTML5 + inline SVG + CSS variables. No browser-specific features. Print stylesheet validated. |
| Users overwhelmed by too many directives | Default the AI Analyst chat to suggest a directive when the user's question implies one (e.g., "explain how X works" → suggest `#explainer X`). |
| Cost of the foundation (Sprint H1) before any user-visible win | Sprint H1 is ~4 hours. Sprint H2 ships the user-visible `#brief` and `#explainer` directives. Total to first user-visible value: ~12 hours. |

---

## 13. Why this stacks with the Verbalized-Sampling uplift just shipped

VS-Multi (just shipped) makes the **content** of recommendations and themes more diverse and substantive. HTML uplift (this plan) makes the **format** of deliverable surfaces more readable and shareable. They compose:

- A VS-Multi `Non-Obvious Bet` tile → user clicks `#brief` → HTML one-pager artifact that presents the bet to a senior partner with SVG diagram + verbatim corpus quote + "Why this is non-obvious" panel + "Copy as #proto prompt" footer
- VS-ranked themes → user picks one → `#explainer <theme>` → HTML deep-dive with theme thesis + verbatim quotes from cited sources + drill-down to the personas it serves + "Brief Liz on this" button

VS solved mode collapse on generation. HTML solves mode collapse on presentation.

---

## 14. References

- Article source: pasted in conversation 2026-05-12 — Thariq Shihipar on HTML as agent output format
- Example artifacts the article links: `https://thariqs.github.io/html-effectiveness`
- The HiC prototype HTML wrapper we'll mirror: `humans-in-control-research/proxy/app.py` → `/api/prototypes/{slug}/view`
- The brand tokens to hoist into shared CSS: `humans-in-control-research/services/prototypeBuilder.ts` → `BRAND_TOKENS`
- The reusable VS skill pattern to mirror: `.claude/skills/verbalized-sampling/SKILL.md`
- Skill to be created: `.claude/skills/html-deliverable-composer/SKILL.md`
- Plan companion: this file
