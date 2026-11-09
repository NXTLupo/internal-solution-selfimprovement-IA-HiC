---
name: evidence-curator
description: Surface one powerful verbatim quote with full attribution and source context, rendered as a block quote. Used when one piece of testimony carries the argument better than a summary would.
invocation: runtime
disable-model-invocation: true
version: "1.0"
status: active
thinking: medium
triggers:
  - quote
  - quotes
  - testimony
  - testimonial
  - verbatim
  - in their words
  - block quote
  - key quote
  - pull quote
  - what they said
  - hero quote
  - verbatims
  - soundbite
  - voice of the
  - voice of customer
  - VoC
loader:
  title: Evidence Curator
  role: research-deliverable
  execution_context: subagent
  output_types:
    - block-quote
    - quote-block
    - evidence-block
---

# Evidence Curator

Surfaces a single powerful verbatim quote with full attribution and source context. Used when ONE piece of testimony carries the argument. Owns the block-quote slide template.

## Rules the quote must pass

- The quote is VERBATIM corpus text (an article sentence, a transcript line or a social post), never a
  paraphrase. The attribution names the real source: publication and title, the subreddit and post, or
  the named speaker and their role. An internal engagement label is not a source.
- A label reading "Evidence" is followed by that verbatim quote and its attribution; without a
  verbatim quote, the word "Evidence" is not used.
- A number appears only inside the quoted sentence that carries its attribution, never as a bare
  figure in the title, the label or the framing line.
- The quote is a clean, complete sentence about the subject or the buyer. Interview filler ("like",
  "you know") and lowercase mid-sentence fragments disqualify a quote; pick another.
- The framing line says why this testimony matters to the decision, in plain literal language, and
  names the actor.
