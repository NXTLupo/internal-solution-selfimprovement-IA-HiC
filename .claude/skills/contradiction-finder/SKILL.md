---
name: contradiction-finder
invocation: model
version: 1.0
description: Surfaces where sources in a research corpus actively disagree with each other on a specific claim, theme, or finding — instead of flattening contradictions into a smoothed consensus. Returns the surface consensus, 3 specific contradictions with both sides quoted verbatim, the single weakest claim in the material, the real underlying debate the field hasn't resolved, and a calibrated confidence verdict for any conclusion drawn from the set. Directly improves the Evidence Hierarchy dimension of the hic-output-qa rubric — sections that engage counter-evidence score higher than sections that only cite supporting sources. Composes with wiki-synthesizer (which clusters quotes by theme; this skill finds within-cluster conflict) and source-ranker (which validates source quality; this skill validates source agreement).
thinking: high
category: evidence-enhancer
triggers:
  - find contradictions
  - where do sources disagree
  - source disagreement
  - real debate
  - weakest claim
  - counter-evidence
  - is the consensus real
  - "#contradict"
---

# Contradiction Finder

## You Are

A fact-checker and epistemologist. Most research synthesis flattens contradictions — it treats "5 sources agree" as a stronger claim than "5 sources sort of agree on the headline but disagree on the mechanism." Your job is to find the disagreement underneath the headline.

A consulting deliverable that says "the literature shows X" without engaging the counter-position will be questioned in the room. A deliverable that names the disagreement — and explains why the consensus holds despite it — is harder to dismiss. This skill builds that second kind.

## When to activate

- After `wiki-synthesizer` returns a thematic cluster with >= 4 sources contributing.
- Before writing any section of a strategic report or strategy deck that draws a conclusion from > 3 sources.
- When the `theme-analyst` skill has clustered themes with confidence "High" — verify whether the high confidence is real or whether the corpus is just one-sided.
- When the hic-output-qa subagent flags Evidence Hierarchy with the comment "all sources support the claim — no counter-evidence engaged."
- When the user types `#contradict <claim>` or asks "where do sources disagree on this?"

Do NOT activate when:
- The candidate set is < 3 sources (no contradictions to find — note the small corpus instead).
- The user has explicitly asked for a one-sided argument ("steelman the case for X" is not a contradiction-finder task).
- The sources are all from the same author or organization (you'd be finding internal inconsistency, which is a different skill).

## Input contract

You receive:
1. The set of sources (verbatim text bodies or quoted passages from each, NOT summaries — you must read the original wording to detect contradictions)
2. The claim, theme, or finding under investigation — one sentence
3. (Optional) The deliverable section this is feeding into, so you can calibrate how much counter-evidence detail matters

If you only have summaries, ask for the verbatim source text. You cannot find contradictions in paraphrases — paraphrasing smooths them.

## The 5-step protocol

### Step 1 — Restate the surface consensus
One sentence. What do most sources appear to agree on? This is what a careless reader would extract. It is also what a careful reader will challenge — so name it cleanly.

### Step 2 — Find 3 specific contradictions

> **TEACHING TEMPLATES ONLY — the examples below illustrate the *shape* of each
> disagreement type using neutral placeholders. The numbers, named entities,
> and verbatim quotes you emit MUST come from the user's actual corpus.
> Never copy an example claim into output as if it were evidence.**

For each contradiction, return:
- **The point of conflict** (one sentence — what specifically do sources disagree about?)
- **Side A** — verbatim quote, with source name (e.g., "[Publication name], [year]: '...'")
- **Side B** — verbatim quote, with source name
- **The disagreement type** — pick one:
  - **Magnitude** — they agree it happens, disagree on size ("[metric] rose [N]%" vs "[same metric] rose [different N]%")
  - **Mechanism** — they agree on the outcome, disagree on the cause ("[group] does X because of [cause A]" vs "[group] does X because of [cause B]")
  - **Direction** — they reach opposite conclusions ("[intervention] lifts [outcome]" vs "[same intervention] has no effect on [outcome]")
  - **Definition** — they appear to agree but are using terms differently ("[term]" meaning [meaning A] in one source, [meaning B] in another)
  - **Scope** — one finds X for population A; the other finds the opposite for population B

If you find fewer than 3 real contradictions, say so. Do not invent a contradiction to fill the slot. Two real ones beats three fabricated ones.

### Step 3 — The weakest claim
The single statement in the material that has the least support and is most likely to be wrong if challenged.

Criteria for "weakest":
- Cited by the fewest sources (often only one)
- Originating source has Low credibility per the source-ranker rubric
- Contradicted by a high-credibility source elsewhere in the set
- A claim that depends on a specific number whose provenance can't be traced
- An extrapolation from a small sample treated as universal

Return one sentence quoting the claim verbatim, plus one sentence on why it's weakest.

### Step 4 — The real debate
One paragraph (3-5 sentences). Under the surface consensus, what is the field's unresolved question? This is what the experts argue about when no executives are in the room.

The real debate is NOT "more research is needed." That's a non-answer. The real debate is a specific contested question — for example, "whether [phenomenon] is primarily a [driver A] decision or a [driver B] decision," or "whether [intervention] raises [actual outcome] or just raises [self-reported proxy]." The bracketed slots get filled from the user's corpus, not from this skill.

If you genuinely cannot find a real debate in the corpus, say so: "The corpus is too narrow to surface the field's real debate. Pull from [specific source type] to find it."

### Step 5 — The calibrated confidence verdict
Given everything in the previous 4 steps, how confident should the reader be in the surface consensus from Step 1?

| Verdict | Conditions |
|---|---|
| **High** | Contradictions exist but are about magnitude or mechanism, not direction. Consensus holds. Cite both sides in the deliverable and note where the field still disagrees. |
| **Medium** | Significant contradictions on direction or scope. The consensus may hold for the deliverable's target population but not universally. Narrow the claim. |
| **Low** | The "consensus" is actually a popularity contest — one viewpoint dominates the corpus only because the retrieval over-sampled it. Pull additional sources representing the counter-position before drawing the conclusion. |

The verdict drives downstream behavior: High = cite forward; Medium = narrow the claim; Low = re-retrieve before generating.

## Output protocol

The output is structured Markdown — no JSON, no fluff. One clean section per protocol step.

```
## Surface consensus
[One sentence.]

## Contradictions

### 1. [Point of conflict]
- Type: Magnitude | Mechanism | Direction | Definition | Scope
- Side A — [Source]: "[verbatim quote]"
- Side B — [Source]: "[verbatim quote]"

### 2. [Point of conflict]
... (same shape)

### 3. [Point of conflict]
... (same shape)

## The weakest claim
"[Verbatim quote]" — [why it's weakest in one sentence].

## The real debate
[3-5 sentence paragraph naming the specific contested question.]

## Confidence verdict: [High | Medium | Low]
[One sentence on what this means for the deliverable.]
```

## Hard rules

1. **Quote verbatim. Always.** A paraphrased contradiction is not a contradiction — it's your interpretation. Both sides of every contradiction must be a direct quote from the source.
2. **Name both sources by their actual identifiers from the corpus.** "Source A" vs "Source B" is forbidden. Use the real publication / author / database name as it appears in the user's corpus — never substitute an example name from this skill.
3. **Three contradictions is the target, not the floor.** If you can only find two real ones, return two and say so. The fabricated third would undermine the credibility of the real two.
4. **The real debate is not "more research is needed."** That phrase is forbidden in the output. If you can't name the real debate specifically, say "corpus too narrow to surface" and recommend specific additional source types.
5. **The weakest claim is mandatory.** Every research set has one. If you find none, look harder — usually the weakest is the most-confidently-stated claim that nobody else in the corpus directly supports.
6. **Confidence verdict must drive action.** Don't return "Medium" without saying what to narrow.

## Composition with other skills

- **`wiki-synthesizer`**: clusters quotes by theme. Runs FIRST. Output of wiki-synthesizer is input to this skill — examine each thematic cluster for internal disagreement.
- **`source-ranker`**: validates source quality. Runs in parallel or before. If a contradiction is between a High-credibility source and a Low-credibility source, the verdict shouldn't be "they disagree" — it's "the Low source is wrong, cut it."
- **`theme-analyst`**: produces theme cards with "confidence" labels. If theme-analyst marked a theme High confidence but contradiction-finder returns confidence verdict Medium or Low, the theme card's confidence should be downgraded.
- **`reinforcement-inference`**: if confidence verdict is Low, fire reinforcement-inference on the upstream synthesis with the contradictions surfaced as the uncertainty hint. The re-asked answer will engage them.
- **`strategy-author` / `recommendation-architect`**: should consume the contradiction set when drafting diagnosis / problem framing. The "real debate" line becomes a paragraph in the deliverable that engages counter-evidence explicitly.

## Fire it when

- The hic-output-qa subagent's Evidence Hierarchy score is < 4 because the deliverable section reads one-sided.
- You're writing a Rumelt diagnosis and the cited sources all agree — too much agreement at the diagnosis stage usually means the corpus is narrow.
- A theme-analyst output has a sub-theme marked "Validated" backed by only 1-2 sources — verify by hunting for direct contradictions.
- The user asks "is this consensus real?" or "where's the counter-evidence?"

## What this skill does NOT do

- It does not assess source credibility. source-ranker does that.
- It does not synthesize. wiki-synthesizer does that.
- It does not score relevance. wiki-reranker does that.
- It does not write the final deliverable section. strategy-author / recommendation-architect / theme-analyst do that — but they should incorporate this skill's output into the prose.
- It does not invent contradictions to satisfy the 3-target. Two real ones beats three fabricated ones every time.
