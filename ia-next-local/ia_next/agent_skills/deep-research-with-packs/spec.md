# deep-research-with-packs: specification

## Goal
A research report whose brief carries the person's exact packs, period, publications and named sources, started through
its plan card, so the Research Lead searches what the person chose before anything else.

## Outputs
- One `start_research_report` call per turn, returning a plan card.
- Every named subreddit in `required_sources` (the plan card collects posts the engagement does not hold).
- A one-sentence reply that the plan is ready to review.

## Required
- The composer's selected packs, exactly, when present.
- `required_sources` lists every subreddit the person named, and `youtube` when they asked for videos.
- `publications` lists every publication the person named, as written.
- `new_research_confirmed` is true only on the person's explicit request or yes.

## Forbidden
- Inventing a pack id, a publication or a period the person did not state.
- Starting new research to answer a question about existing work.
- Calling `start_research_report` more than once in a turn, or saying the work has started before the person starts it.
- Quoting a cost or a budget (work on this machine costs time, not money).

## Target models
The agent seat of IA Next Local (Qwen 3.8 27B, local); any model that calls tools from a JSON schema. The steps carry
checks a small model can verify against its own arguments.
