---
name: questionnaire-author
description: "Use for #questionnaire. Turns a decision the corpus cannot settle into questions for the person who holds the answer. Reach for it when research has narrowed a choice but the deciding fact sits with a stakeholder, not in a document."
invocation: model
version: "1.0"
status: active
---

# questionnaire-author

Adapted from `to-questionnaire` in Matt Pocock's library. The insight that makes it worth
transferring: when you cannot answer a question yourself, the useful artifact is not more
analysis, it is a well-built question aimed at the person who can.

Consulting engagements need this constantly, and HiC has never had it. A research run
routinely establishes that a decision hinges on something the corpus does not contain:
what the renewal terms actually say, which team owns the handoff, whether the board has
already ruled something out. Today that becomes a line in a deck saying evidence is
limited, which the house rules correctly forbid. A questionnaire is the honest artifact
for that state.

## The governing rule: grill the send, not the subject

You are not interviewing the reader about the topic. You are constructing the smallest
set of questions that unblocks a specific decision, aimed at whoever holds the answer.
Every question earns its place by naming a decision it unblocks. If you cannot say which
decision an answer changes, cut the question.

Async means you may only get one pass, so order matters: most important first, because
the reader may stop halfway.

## Question construction

- **One idea per question.** Never compound. "Who owns the handoff, and how long does it
  take?" is two questions and gets one muddled answer.
- **An answer stub directly beneath each question**, so the reader types into a shape
  rather than composing prose. A stub is a blank, a set of options, or a unit
  ("________ business days").
- **A one-line "why this matters" ONLY where the question could be misread.** On a clear
  question it is noise, and noise is what makes a questionnaire go unanswered.
- **Name the holder.** Each question is addressed to a role, not to the void: the
  advancement director, the CRM owner, the partner who signed the mandate.
- **Ask for the fact, not the opinion**, unless the opinion IS the deciding input, in
  which case say so.

## What the corpus does first

Before writing a single question, establish what research already answered. A
questionnaire that asks what the corpus contains wastes the one pass you get and tells
the reader you did not do the reading.

For each question, record internally which retrieval you ran and why it came back
insufficient. That record does not ship, but it is what separates a real gap from a gap
that is actually laziness.

## Shape of the artifact

An HTML document via `html-deliverable-composer`, brand-locked, print-clean, because a
questionnaire gets forwarded and filled in rather than presented:

1. **What this decides.** One short paragraph naming the decision waiting on the answers.
2. **What we already know.** Three to five lines of what the research settled, each
   carrying its citation. This is what makes the questions credible.
3. **The questions.** Numbered, most important first, each with its stub and its holder.
4. **What happens next.** One line on what you do when the answers come back.

## Rules inherited from the house

- No quantitative claims of your own in the framing: numbers appear only inside a cited
  quote, as everywhere else.
- Never write that evidence is limited or that more research is needed. The questionnaire
  IS the response to that state; saying it as well is the annotation the rules forbid.
- Plain text, no markdown emphasis in content fields, no em-dashes.
- Every claim in "What we already know" carries a real named source. A questionnaire that
  overstates what is known is worse than none, because the reader corrects you instead of
  answering you.

## Compose with

`research-planner` (an unanswered sub-question is the strongest questionnaire candidate),
`stakeholder-lens-auditor` (who holds each answer), `html-deliverable-composer` (the
render), and `human-voice-editor` (the questions have to read like a person asking).
