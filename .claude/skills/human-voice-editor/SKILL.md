---
name: human-voice-editor
description: "The positive half of HiC's writing contract: register, audience calibration (executive, practitioner, mixed) and sentence economy. Load beside any authoring skill and whenever the prose signal flags cadence, openers, actors, copula or dilution."
invocation: model
version: "1.0"
status: active
surfaces:
  - platform-agent
loader:
  title: Human Voice Editor
  role: quality-enhancer
skillopt: trainable
---

# Human voice

## Scope

Pillar 4, the POSITIVE half of HiC's writing contract. The 350+ banned phrases in .claude/CLAUDE.md say what not to write; this says what to write instead. Three parts only: register (how a knowledgeable colleague actually talks), audience calibration (executive, practitioner, mixed) with a worked sentence per audience, and sentence economy. Load this alongside any authoring skill (deck-narrative-composer, strategy-author, recommendation-architect, case-study-analyst, explainer, report writers) and whenever the deterministic prose signal in services/proseSignal.ts flags cadence, openers, actors, copula or dilution.

> This skill is the `human-voice-editor` entry that `services/deliverableFrameworks.ts`
> `QUALITY_SKILL_COMPOSITION` has auto-loaded for EVERY deliverable since 2026-06-14. That
> reference had no file behind it until 2026-08-20, and the loader fails silently, so the
> additive half of the writing contract was a no-op for two months while the console
> reported it as loaded. Keep the directory name matching the map entry.

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

## 4. Structural templates

The 2026-11-08 live defect: a report cleared every banned phrase and still read as
machine-written, because the tells were syntactic, not lexical. Two budgets:

- **The contrast template.** "X, not Y" / "not X, but Y" / "The issue is not X; it
  is Y" / "rather than" / the semicolon pivot ("A earns trust; B spends it"). One
  of these is rhetoric. A document where one in ten sentences carries one is a
  template, and readers hear it. Budget: at most one or two in the whole artifact,
  and never in the title and a heading at the same time. Everywhere else, state
  the positive claim and let the alternative go unmentioned, or give the
  alternative its own plain sentence.
- **The verdict ender.** Closing a paragraph on a short oracular judgment ("That
  asymmetry is the core of the diagnosis.") is emphasis the first time and a
  drumbeat by the fourth. End most paragraphs on the evidence or the mechanism;
  save the one-line verdict for the one or two moments that earn it.

Both patterns survive every word-level scrub, which is why they are budgeted
here and measured in `services/proseSignal.ts` (`templates`, `enders`).

<!-- SLOW_UPDATE_START -->
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
| `templates` | Contrast templates ("X, not Y") are saturated. State the positive claim directly; keep at most one or two contrasts per artifact (section 4). |
| `enders` | Too many paragraphs close on a short verdict line. End on the evidence or the mechanism instead (section 4). |
| `shape` | Paragraph lengths are too uniform. Let one paragraph be two sentences. |

Fix only the flagged sentences. Do not touch any fact, number, quote, citation,
source label, or manifest pointer while rewriting: the wording is yours, the
evidence is not.
<!-- SLOW_UPDATE_END -->
