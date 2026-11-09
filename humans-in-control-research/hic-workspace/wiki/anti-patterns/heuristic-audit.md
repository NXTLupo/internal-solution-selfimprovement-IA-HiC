---
id: anti-patterns/heuristic-audit.md
title: Heuristic Audit Anti-Patterns
type: anti-pattern
chunks:
  - id: "anti-patterns/heuristic-audit.md#c0"
    char_span: [0, 1938]
    sentence_count: 1
    key_terms: [findings, without, needs-manual-review, heuristic, severity, finding, invented, proposed]
    concepts: [findings, needs-manual-review, without, heuristic, severity]
    token_count: 491
    sources: [{"n":"anti patterns","u":"","kind":"anti-pattern"}]
---
# Heuristic Audit Anti-Patterns (reason codes as named smells)

Each smell carries the machine reason code the audit gate emits (failure-taxonomy R1-R20).

- SEVERITY-UNMAPPED (R7): a severity with no stated frequency x impact x persistence basis,
  or label vocabulary invented outside the 0-4 map.
- SUBSUMED (R8): symptoms listed as peers of their root cause; three findings about one
  broken page.
- DUP (R9): the same fix under the same heuristic shipped as separate findings.
- UNVERIFIED-AS-DEFECT (R5): a model-judgment claim asserted as a defect without the
  needs-manual-review flag.
- FP-CONTRAST (R6): a contrast failure claimed from pixels alone, above advisory severity,
  without a scanner or sampled measurement.
- ADVISORY-AS-HEADLINE: a needs-manual-review finding used as a cover verdict or action title.
- NAV-MISSING-UNFLAGGED (R3): derived nav absence on a multi-screen experience with no
  wayfinding finding.
- PROPOSAL-BELOW-FLOOR (R13/R15): a proposed screen that drops current-screen details
  without justification, or fails a fidelity axis; the redesign argues for a downgrade.
- NO-COMPONENT-BINDING (R12): a proposed section naming a pattern absent from the mirrored
  proto/* registry; invented UI shapes.
- STANDARD-OVERCLAIMED (R11): WCAG or another standard cited beyond what was
  deterministically checked.
- NO-POSITIVES (R14): a screen with zero preserve[] and zero non_issues[]; pure fault-finding
  reads as unexamined.
- PRESERVE-DROPPED: a named strong element missing from the proposal.
- NO-TASK-MODEL (R2): severity 3+ interaction findings with no stated user task, or
  interface findings against a slide (R1: wrong lens; a slide is judged on communication).
- OPINION-AS-HEURISTIC (R10): taste with no heuristic anchor, no user cost, no evidence kind.
- TAUTOLOGICAL-REC: a recommendation that restates the finding negated ("add a CTA" for
  "no CTA") without naming the concrete change.
