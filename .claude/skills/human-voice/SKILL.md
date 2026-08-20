---
name: human-voice
description: The POSITIVE half of HiC's writing contract. The 350+ banned phrases in .claude/CLAUDE.md say what not to write; this says what to write instead. Three parts only: register (how a knowledgeable colleague actually talks), audience calibration (executive, practitioner, mixed) with a worked sentence per audience, and sentence economy. Load this alongside any authoring skill (deck-narrative-composer, strategy-author, recommendation-architect, case-study-analyst, explainer, report writers) and whenever the deterministic prose signal in services/proseSignal.ts flags cadence, openers, actors, copula or dilution.
---

# Human voice

Subtractive rules stop the worst tells and cannot produce voice. A deck can clear
every banned phrase and still read like a machine, because the strongest tell
survives any word swap: uniform cadence, repeated sentence openings, and abstract
nouns standing where an actor belongs. This skill is the additive half.

Three sections. It is short on purpose: a long voice guide does not get read.

## 1. Register

Write what a knowledgeable colleague says out loud when a partner asks what is
going on. Plain subject, direct verb, concrete object.

- Prose by default. A list only when the schema requires an array or the content
  genuinely is a list.
- Name the actor in every claim: a team, a system, a role, a named organization.
  If the subject of your sentence cannot act, the sentence has no actor.
- Use "is". A CRM is the system of record; it does not serve as one.
- State the mechanism, not the vibe: X happens because Y, so Z follows.
- One idea per sentence. Two ideas need two sentences or a semicolon and a
  reason to be joined.

Read every sentence aloud before it ships. If a person would not say it in a
meeting, rewrite it. That test catches more slop than any list.

## 2. Audience calibration

Same evidence, different first sentence. Pick the register from who is reading,
and stay in it for the whole artifact.

| Audience | What they need first | Worked sentence |
|---|---|---|
| Executive | The consequence and the decision | "Alumni stop responding after the second unanswered email, so the advancement team is losing the cohort it spent four years recruiting." |
| Practitioner | The mechanism and the constraint | "The registrar exports enrollment weekly to a CSV that no downstream system reads, so a gift officer sees a lapsed alum only after the annual reconciliation." |
| Mixed | Mechanism once, then consequence | "Enrollment moves weekly through a file nobody reads downstream. Gift officers find out a year late, which is why re-engagement calls land after the alum has already stopped opening mail." |

Two rules that hold for every audience:

- Never open with the framework, the section, or the deliverable. Open with the
  finding.
- A number appears only inside a cited quote. The judgment is yours; the figure
  belongs to a source.

## 3. Sentence economy

Every sentence carries a fact, a step, or a judgment. Cut the rest.

- Vary length deliberately. A short sentence after two long ones is how emphasis
  works in prose. Six sentences of identical length read as generated.
- Vary openings. Two adjacent sentences starting with the same two words is the
  most audible machine rhythm there is.
- Delete hedges (perhaps, arguably, potentially, somewhat) and intensifiers
  (very, significantly, dramatically). A hedge in a consulting artifact is either
  a missing condition or a claim that should not ship.
- Prefer the specific noun to the category: "the registrar" over "stakeholders",
  "the Salesforce instance" over "the platform".

## When the prose signal flags you

`services/proseSignal.ts` measures six things and names the offending sentence.
The metric tells you which section above to apply:

| Flag | Fix |
|---|---|
| `cadence` | Sentence lengths are too uniform. Split one long sentence, merge two short ones. |
| `openers` | Adjacent sentences share an opening. Reorder one so it starts with its object or its actor. |
| `actors` | An abstract noun is acting. Replace it with the team, system or person that does the thing. |
| `copula` | "serves as", "stands as", "represents a". Write "is". |
| `dilution` | Hedges and intensifiers. Delete them, or state the condition the hedge was standing in for. |
| `shape` | Paragraph lengths are too uniform. Let one paragraph be two sentences. |

Fix only the flagged sentences. Do not touch any fact, number, quote, citation,
source label, or manifest pointer while rewriting: the wording is yours, the
evidence is not.
