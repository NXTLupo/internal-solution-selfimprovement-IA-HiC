---
id: frameworks/heuristic-audit.md
title: Heuristic Audit Framework
type: framework
chunks:
  - id: "frameworks/heuristic-audit.md#c0"
    char_span: [0, 313]
    sentence_count: 3
    key_terms: [heuristic, heuristicanalysisservice, run, collapseandscore, critique-rigor, invariants, auditgate, framework]
    concepts: [heuristic]
    token_count: 76
  - id: "frameworks/heuristic-audit.md#c1"
    char_span: [361, 975]
    sentence_count: 3
    key_terms: [task, primary, label, score, fix, user, low-priority, persistence]
    concepts: [primary, label, score]
    section: "Severity: integer 0-4 with a stated basis"
    token_count: 147
  - id: "frameworks/heuristic-audit.md#c2"
    char_span: [1003, 1377]
    sentence_count: 2
    key_terms: [finding, parent, collapseandscore, deterministic, absorption, blank-page, severity-4, dependson]
    concepts: [finding, parent]
    section: Subsumption procedure
    token_count: 81
  - id: "frameworks/heuristic-audit.md#c3"
    char_span: [1403, 3154]
    sentence_count: 12
    key_terms: [screen, nav, never, components, inventory, contrast, findings, mirrored]
    concepts: [screen, components, never, inventory, contrast]
    section: Evidence discipline
    token_count: 366
---
# Heuristic Audit Framework

The operating contract for every heuristic UX analysis run (critique-rigor plan 2026-07-08).
Enforced in code by services/auditGate.ts (pure invariants), collapseAndScore in
heuristicAnalysisService.ts, and the kill-only Critic pass. The gate, not the author,
declares a run verified.

## Severity: integer 0-4 with a stated basis

| score | label | meaning |
|---|---|---|
| 0 | No issue | examined, passes |
| 1 | Cosmetic | fix if time allows |
| 2 | Minor | low-priority fix; the task still completes |
| 3 | Major | impairs the primary user task |
| 4 | Blocking | the task cannot complete or the page is broken |

Every finding carries severity_basis: one line of frequency x impact x persistence reasoning,
anchored to the primary user task stated in the brief. The same defect gets the same score
wherever it appears. Severity labels are DERIVED from the integer through one map
(auditGate.SEVERITY_LABELS); never invent label vocabulary.

## Subsumption procedure

A symptom of a larger defect is folded into its parent, never listed as a peer. The model
hints with dependsOn; the collapse is deterministic (collapseAndScore): identical
fix+dimension pairs merge into one finding with instances[]; a severity-4 "page is broken"
root absorbs every other finding on that screen (the blank-page rule); parent severity
re-raises on absorption.

## Evidence discipline

evidenceKind per finding: axe (scanner rule cited), dom (derived from the DOM inventory or
nav data), measured (pixel-sampled), vlm (model judgment only). vlm-only findings are
advisory: needs_manual_review, severity at most 2, never a cover or action title.
Contrast thresholds: 4.5:1 body text; 3:1 large text (24px+, or 18.66px+ bold); 3:1 UI
components. Claim exactly what was checked: cite landmarks and computed contrast until the
full WCAG 2.2 checklist actually runs; never a blanket conformance verdict.

## Task model and artifact type

The brief states the primary user task; severity 3-4 requires naming how the defect blocks
that task. Each screenshot is typed live, mockup, or slide. Slides are judged on
communication (hierarchy, evidence, legibility) and never receive interface findings.

## Navigation requirement

On a multi-screen live/mockup experience, a screen with no navigation must produce a
wayfinding finding (nav presence is DOM-derived for captures). Every proposed page layout
includes one nav pattern.

## Proposal fidelity floor (total content parity)

Every proposed screen carries EVERY detail of the current screen: the content inventory
(headings, stats with values, captions, source attributions, actions) binds into mirrored
proto/* component slots, or the item appears in omitted[] with a one-line justification.
Fidelity axes: content (= parity coverage), components (= every section from a mirrored
token-bound partial), nav, primary action, responsive. A below-floor proposal is WITHHELD;
an honest critique-only screen beats an anti-recommendation in pictures. Positives are part
of the contract: preserve[] names the strong elements the redesign must carry; non_issues[]
names what was examined and passed.
