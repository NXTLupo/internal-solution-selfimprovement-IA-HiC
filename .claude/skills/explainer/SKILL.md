---
name: explainer
description: Long-form HTML explainer for a single concept, technology, framework, or operating model. Distinct from #report (multi-section strategic overview), #brief (compact action-summary), and #whitepaper (formal industry argument). An explainer ANSWERS ONE QUESTION end-to-end with definitions, mechanisms, examples, and named-source evidence, structured so a reader who knows nothing about the topic finishes informed enough to act. Target visible-word floor 1,200 (defined in CorpusChatPanel._wordFloor).
---

# Explainer skill

## What this skill produces

A single self-contained HTML document that explains ONE concept clearly enough for a reader with no prior context to:
- understand what the thing IS (definition + the named entities it touches),
- understand WHY it matters (the operational consequence, the named stakeholders affected),
- understand HOW it works (the mechanism, the named inputs/outputs/dependencies),
- see EXAMPLES (named cases from the corpus, not invented),
- know the EVIDENCE (every claim anchored to a named source with verbatim quote where possible),
- act NEXT (one concrete first move per stakeholder, not "explore further").

## What an explainer is NOT

- Not a #report — a report covers many findings; an explainer covers ONE thing deeply.
- Not a #whitepaper — a whitepaper argues a position; an explainer is descriptive.
- Not a #brief — a brief compresses to <500 words; an explainer expands to ~1200-2000.
- Not a #strategy — strategy prescribes actions; an explainer describes the substrate the actions act on.

If the user prompt is "explain X", "what is X", "how does X work", "primer on X", or "introduce me to X" — that's an explainer. If it's "what should we do about X" — that's strategy. If it's "is X a good idea" — that's whitepaper.

## Structure contract (4 mandatory sections + 2 optional)

| # | Section | Mandatory? | Content |
|---|---------|------------|---------|
| 1 | Definition | YES | One paragraph that names the thing, who uses it, and what category it belongs to. NOT a dictionary definition — a working description anchored to named entities. |
| 2 | Why it matters | YES | 3-5 paragraphs naming WHO is affected by it (specific stakeholder roles), what operational consequence falls on them, and what convergent evidence shows it matters now (multiple named sources). |
| 3 | How it works | YES | The mechanism. Inputs, outputs, dependencies, failure modes. Use concrete examples from the corpus. Diagrams allowed if `.nxt-grid` / `.nxt-process` provide them — never SVG with absolute positioning. |
| 4 | Examples in the wild | YES | 2-4 named cases from the corpus, each with what the case is, what the outcome was, and where the evidence comes from. NOT hypothetical examples. |
| 5 | Implications for the reader | OPTIONAL | One concrete first move per stakeholder role named in §2. |
| 6 | Source index | YES | Clean citation list per the standard SOURCE INDEX CONTENT RULE (named source + one-line factual description). No internal corpus indices, no sentiment readouts, no role-in-document framing. |

## Anti-slop discipline

These rules are stricter than the global anti-slop rules because explainers historically attract the most meta-narration ("In this explainer we will explore...") and metaphor ("Let's dive into the world of X...").

1. **No "in this explainer" / "this primer" / "as you'll see" / "let's explore" / "let's dive into".** Per `.claude/CLAUDE.md` meta-narration ban. Lead with the definition; the reader knows what they're reading.
2. **No clock / journey / war / construction metaphors.** Per `services/slidePostProcessor.ts` METAPHOR_PATTERNS. The 2026-06-06 user directive: plain language, no hyperbole, no anthropomorphism.
3. **No standalone numbers in titles or section headers.** Numbers ride in named-source verbatim quotes (Quantitative Claim Rule).
4. **No "evidence is limited" / "more research is needed" / "in the absence of"** wrappers. Narrow the section to what IS evidenced rather than annotating what's missing.
5. **No "as an AI" / "I cannot" / knowledge-cutoff disclaimers.** Per CLAUDE.md hard ban.

## Evidence floor

- ≥6 named external sources cited across the document (per the EXTERNAL INTELLIGENCE DIVERSITY rule in `.claude/CLAUDE.md`).
- Every "Examples in the wild" entry carries a Source: attribution.
- At least 50% of citations external (NOT client-upload PDFs).
- Verbatim quotes (in `.nxt-quote` blocks) for any claim that would otherwise read as a bare assertion.

## Composition with other skills

- `html-deliverable-composer` provides the HTML shell, brand tokens, and structural validators that ALL HTML deliverables (explainer / report / strategy / brief / whitepaper) share.
- `verbalized-sampling` is invoked for the "Examples in the wild" section when the corpus has many candidate cases and we want diversity in selection.
- `source-ranker` reorders the source index by relevance + credibility.
- `contradiction-finder` flags claims that contradict each other across sources.

## Length contract

- Target visible-word count: **1,200-2,000** (the `#explainer` entry in `_wordFloor` in `CorpusChatPanel.tsx` requires ≥1,200).
- If first-pass output is below floor, the existing EXPAND retry path fires automatically.
- Hard upper bound 2,500 words to keep the document scannable.

## Validator coverage (per .claude/ARCHITECTURE.md)

The Hook Bus (`.claude/hooks/scripts/dispatch_validators.py`) dispatches:
- `validate_titles.py` — action titles, not topic labels.
- `validate_no_em_dashes.py` — global em-dash ban (the #1 AI-writing tell).

Frontier dims scored: `meta_narration_count`, `banned_phrase_count`. The epoch proposer mines high-rejection patterns to refine this skill.

---

## Cached-selection contract (2026-06-06, MANDATORY)

When the engagement manifest carries `cached_selection.theme_cluster_ids[]` or
`cached_selection.engagement_slugs[]` (the user explicitly selected prior
artifacts via the Knowledge Library), the `assembleEnhancedPrompt()` function
injects a `PRIOR CACHED SELECTION` block into your system prompt.

1. For each emitted item, set a `source` field:
   - `"cached"`   — carried forward unchanged from the user's selection
   - `"extended"` — carried forward with refinement on the new corpus
   - `"new"`      — from the new corpus, not in the selection

2. **NO FLOORS, NO OMISSIONS — 100% coverage required.** EVERY one of
   the user's selected items below MUST appear in your emission tagged
   `source: cached` or `source: extended`. The user explicitly curated
   them via the Knowledge Library; the manifest is the binding contract;
   silent omission of any selected id is rejected by the Stop hook
   `validate_cached_selection_honored.py` (coverage threshold raised
   from 60% to 100% on 2026-06-06). New corpus discoveries go in IN
   ADDITION to the cached set as `source: new`.


3. **Why this matters.** The user curated the Knowledge Library selection
   deliberately. Regenerating from scratch ignores their curation and breaks
   the recursive self-improvement loop. The product is
   `{cached + extended + new}`, not `{new alone}`.

4. **Trace + frontier.** The per-deliverable auditor reads `items[].source`
   and computes `cached_selection_coverage_pct` as a qualityFrontier dim
   (direction: maximize, floor: 100). Epoch proposer mines low-coverage
   patterns as candidate skill-edit interventions.
## Element-Data Imagery Contract (E4, 2026-07-02 — supersedes the 2026-06-27 Brand-Imagery Prompting Contract)

The diffusion brand-image lane (`POST /api/ai/brand-image`, memphis-iso scene concepts, `brandImage: { concept }`) is RETIRED. Do not author image scene concepts for this deliverable. Where a section carries structured data (3+ named steps, a before/after pair, a labeled citation mix), the native infographic lane composes a panel from those fields automatically (`services/artifactIllustrator.ts::infographicSpecFrom` -> `/api/ai/diagram`); single-subject decorative surfaces are image-free INTERIM until the E3 creative-director pass defines their visual language. Do not emit `brandImage` / `imageConcept`; the native lane ignores them. Full routing contract: the `designer` skill + `nxt-visual-renderer` section 6.

## THE ACTOR RULE (anti-slop, 2026-08-07, binding on every generated sentence)

Two tests every user-visible sentence must pass, on top of the banned-phrase lexicon in
`.claude/CLAUDE.md`:

1. NAME THE ACTOR. Every claim states who or what acts: a named team, system, person, or
   audience. Abstract nouns (engagement, advancement, alignment, transformation, adoption)
   never act; dramatic verbs (leaks, dies, bleeds, unlocks, erodes, cannot see) never
   substitute for the mechanism. Ground cause and effect: X fails because Y, so Z happens.
   BAD: "Engagement leaks at three stages advancement cannot see."
   GOOD: "Alumni drop off at three stages the advancement team cannot see."

2. READ IT ALOUD. If a real person would not say the sentence out loud, rewrite it. Kill
   broken grammar, buzzwords forced into the wrong part of speech, and word-salad
   compression. Plain subject, direct verb, concrete object; delete every word that adds no
   fact or step.
