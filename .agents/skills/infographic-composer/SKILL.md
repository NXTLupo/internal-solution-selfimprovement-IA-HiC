---
name: infographic-composer
invocation: runtime
disable-model-invocation: true
description: Authoring contract for slides:infographic-exhibit panels - data-dense, evidence-true native infographics composed from the slide's own corpus content. Injected into DECK MODE so every infographic carries real substance, never bare labels in empty frames.
---

# Infographic Composer - the data-visual authoring contract

The `slides:infographic-exhibit` archetype renders a NATIVE data panel (composed HTML/CSS through
the brand renderer, exported as a swappable native picture). The runtime draws ONLY what the
payload carries. A payload of bare labels renders as empty cards; that is a protocol violation,
not a style choice. This skill defines what a publishable infographic payload looks like.

## The one governing rule

**Every visual element carries TWO layers: the LABEL (what it is) and the SUBSTANCE (the
evidence line that earns its place).** A step without its description, a stat without its quote,
a bar without its basis is slop. If the corpus cannot fill the substance layer for an element,
cut the element; if fewer than 3 elements survive, do not emit the infographic at all.

## Family selection - match the slide's data shape, never default

| The slide's content is... | Family | Payload core |
|---|---|---|
| A sequence of 3-6 concrete moves or stages | `process-flow` | `steps[]` |
| Two contrasting states or approaches | `comparison` | `left` + `right` |
| 2-5 hard figures, each carried by a cited quote | `stat-row` | `stats[]` |
| A ranked set (severity, frequency, priority) | `ranked-bars` | `items[]` |
| A labeled mix or distribution | `composition` | `segments[]` |

Across one deck, two infographics use two DIFFERENT families.

## Per-family depth contracts

### process-flow
```json
"steps": [{
  "title": "Guided intake drafts the risk",              // the move, <=45 chars, verb-led
  "description": "FarmGuard's intake wizard pre-fills exposure from the operation profile"
}]                                                        // <=90 chars, names the ACTOR or SYSTEM
```
Every step is an OBJECT with BOTH fields. The description says who/what does it and with which
named mechanism, drawn from the corpus. Never a bare name string; never a generic restatement of
the title ("this step drafts the risk" is padding, not substance).

### comparison
Each side: `{ "title": <the state, <=30 chars>, "points": [<2-5 concrete, corpus-drawn facts>] }`.
Points name real systems, behaviors, or consequences; the two sides must be parallel (each left
point has a felt counterpart on the right).

### stat-row
```json
"stats": [{ "label": "PREMIUM GROWTH", "value": "outpacing inflation",
            "quote": "Property premiums rose faster than any input cost farmers track.",
            "source": "UNDP / ISF Advisors Agricultural Insurance Deep Dive" }]
```
Quantitative Claim Rule is HARD here: a numeric `value` is allowed ONLY when the verbatim
`quote` containing that number rides with it, with its named `source`. No cited quote means the
value goes QUALITATIVE (name the pattern) or the stat is cut.

### ranked-bars
`items: [{ "label": <the thing ranked>, "score": <basis-true magnitude> }]` plus a `basis`
string naming what the score measures (evidence mentions, severity tier, cited figure). Scores
are never invented; when the corpus gives no comparable magnitudes, use a different family.

### composition
`segments: [{ "label": <named category>, "share": <count or cited proportion> }]` - shares come
from something countable in the corpus (source-type mix, cited distribution), never from feel.

## Grounding + placement

- The panel's content mirrors THE SLIDE's argument: same named systems, actors, and sources as
  the surrounding deck section. An infographic that could sit in any deck is a failure.
- kicker states the panel's subject; title is the action-title judgment (deck title rules apply);
  `takeaway.statement` is the one-line so-what; `sourceLine` names the real sources.
- Floors: 8+ slide deck -> at least one; 18+ -> two (different families); at most 3. Emit only
  where the structured fields are genuinely derivable - the floor is met by finding the real
  sequence/contrast/mix in the corpus, never by padding.

## Anti-patterns (instant rejection)

- Bare-string steps or `{name}`-only objects (empty-card render)
- Descriptions that restate the title instead of adding the actor/system/mechanism
- Numbers in value/score/share without their cited verbatim quote (Quantitative Claim Rule)
- A family chosen for variety when the data shape does not match it
- Generic content unmoored from the deck's named subject
- Authoring an image URL or expecting an illustration: the runtime composes the panel from the
  payload fields only

## THE ACTOR RULE (anti-slop, 2026-08-07, binding on every generated sentence)

Two tests every user-visible sentence must pass, on top of the banned-phrase lexicon in
`.Codex/AGENTS.md`:

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
