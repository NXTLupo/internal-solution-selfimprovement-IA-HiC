# Deterministic deliverable rules and coverage contracts for every hashtag (2026-10-02)

## Owner directives (verbatim, binding)

- "Document uploads, whether in the beginning of a research project or in the analyst chat SHOULD ALWAYS BE THOROUGHLY ANALYZED"
- "make sure all captured themes in the Research Assembly Board are ALSO ALL reflected in requirements (each theme should generate a set of requirements as well THAT IS WHY THEY ARE THEMES THAT ARE IMPORTANT!!)"
- "these rules must be deterministically enforced and generalized for ANY RESEARCH PROJECT, not just this current NU session"
- "these rules should also be enforced with ALL other hashtag outputs, not just PRD. Consulting grade deliverables must be comprehensive"
- Standing: no blockers on output requests; consulting grade; numbers only in cited quotes.

Unified Vision phases advanced: (2) collect from all uploads, (3) provenance-carrying chunks read at cite time,
(5) objective-first, engagement-scoped evidence, (7) gates that decide in-path, (6) one authority per concern.

## Root causes this plan answers (Northeastern #prd, 2026-10-02)

1. Three .pptx uploads rejected by the picker (`components/FileUpload.tsx` accept list).
2. Client documents similarity-sampled: 258 upload chunks ingested, 16 reached the compiler (60 x 700 char window).
3. The compiler only accepted pain / gap / theme roots; client-stated features and stakeholder feedback had no slot.
4. One model call wrote the whole PRD; no extraction pass, no coverage check.
5. Theme quotes from other engagements and NXT's own material leaked into evidence.
Manifest retrieval was NOT the cause (pages registered, engagement-tagged, relevance 91).

## Architecture

### Shared inputs (one authority each)
- **Engagement ledger** (`services/prdScopeLedger.ts` -> to be renamed or re-exported as the shared ledger):
  every uploaded document read in full at upload time (research start AND analyst chat), duplicates collapsed,
  each stated feature / deliverable / decision / feedback item quoted verbatim with source, owner, date, pointer.
  Persisted per engagement; incremental by content hash; `loadEngagementLedger(slug)`.
- **Theme groups**: every Research Assembly Board theme, near-duplicates grouped deterministically, original ids kept.
- **Engagement-scoped evidence**: chunks filtered by engagement before any prompt is built.

### The rule engine (`services/deliverableRules.ts`)
- **Universal rules** (every deliverable): uploads analyzed in full; engagement scoping; verbatim quotes against
  chunk text; sources / pointers copied from evidence ids, never model-authored; numbers only inside quotes or
  typed targets; no em dash / slop; id integrity; no dangling references.
- **Coverage contract** per deliverable: `universe` (which ledger items and theme groups it must account for),
  `unitsOf` (its addressable units), `covers` (source ids a unit cites), `gapFill` (targeted model pass), and
  `deterministicFill` (a unit built directly from an uncovered item when the pass still misses it).
- **In-path order**: generate -> universal rules -> coverage -> targeted repair -> deterministic fill -> receipt.
  Never a refusal; the receipt and the chat name anything that needed filling.
- **Independent re-check at export** (workbook / PPTX / HTML) in separate code.
- **Receipt** written into the AIR record and shown in the chat and the export.
- **CI**: `npm run check:deliverable-rules` replays two projects from different industries (Northeastern real pages +
  a synthetic hospital patient-intake project) per contract; any coverage below 100% fails the build. No
  engagement-specific literals in non-test code (grep gate).

## Coverage contracts per hashtag (what "comprehensive" means)

| Hashtag (aliases) | Unit | Universe it must cover |
|---|---|---|
| #prd | requirement (Given/When/Then) | every STATED item, every FEEDBACK item, every theme group |
| #personas | persona (pains, goals, behaviors) | every user segment named in the ledger or themes; every theme group lands on >= 1 persona pain or goal |
| #journey / #journey-map | stage x lane cell, stage pain, opportunity | every theme group and feedback item that describes a moment in the user's path |
| #blueprint / #service-blueprint | stage x layer cell | every stated process, system and handoff in the ledger |
| #themes / #theme-cluster / #meta-themes | theme card / cluster | every board theme (grouping only, never dropping) |
| #gap / #gap-matrix | gap row | every stated capability and every theme group naming an unmet need |
| #competitive | competitor x criterion cell | every competitor and criterion named in uploads or themes |
| #recs / #recommendations | recommendation | every theme group and every feedback decision maps to >= 1 recommendation or an explicit "not pursued, because" |
| #strategy / #slides / #presentation | slide or section claim | every theme group and every ledger area appears in the argument (a slide, a section or an appendix exhibit) |
| #report / #whitepaper / #explainer / #brief | section claim | every theme group and ledger area appears (brief: the top tier by evidence, with the rest in an index) |
| #roadmap | initiative | every Must/Should requirement and every stated deliverable has a horizon |
| #arch / #tech-arch / #tech-audit / #audit | component / finding | every system and integration named in the ledger |
| #org / #org-chart | node | every role and person the ledger names, with source |
| #case-study | case | every subject named, with axis |
| #questionnaire | question | every open question and assumption in the ledger and themes |
| #mindmap | node | every theme group |
| #proto / #playground | screen / flow step | every STATED feature in scope and every prototype FEEDBACK item (kept, changed or removed with reason) |
| #research-plan / #deep-research | sub-question | every theme group without thick evidence and every open question |

"Comprehensive" never means one unit per item at any length: a deliverable may merge items into one unit when the
unit cites all of them. What it may never do is leave an item unaccounted for.

## Status

| Step | State |
|---|---|
| Root-cause analysis of the Northeastern #prd | done |
| Ingestion: .pptx/.xlsx accepted, chat attachments ingested the same way, encoding repair, file names persisted, duplicate collapse, engagement scoping | done offline; not live (rebuild did not land) |
| Ledger + rule engine + PRD contract + workbook coverage + receipt + two-industry tests | done offline (1,773 vitest, check:prd-rules PASS); not live |
| Contracts for every other hashtag (table above) on the same engine | done in code (session 945d83e2): `services/deliverableCoverage.ts` carries the table as data (`COVERAGE_SPECS`, 17 kinds); deterministic id binding (`_coverageIds` on slides, `data-covers` on HTML), fills from ledger items only (theme cards for #themes, appendix exhibits elsewhere, native theme sections for #presentation, `client_scope` on #proto briefs), universal rules over the fills, receipt in the reply. Wired: slide-fence path (before the artifact chain), HTML artifact path (after the claim chain), uplift kinds, #presentation create + revision, #proto briefs. Export re-check: `services/coverageRecheck.ts` on deck PPTX export. `#case-study` has no contract (its subjects are named by the user). |
| CI: `check:deliverable-rules` (two-industry fixtures for every contract) in `check:all`; `check:generic-rules` grep gate (on-disk engagement slugs + `scripts/engagement-literals.deny`) | done; 63 tests + gate pass |
| Live verification: re-upload the 12 Northeastern documents, run #prd and three other hashtags, check coverage item by item | done 2026-10-02 (13 documents incl. the 3 PowerPoints; #prd twice at 100% coverage; #personas #journey #slides, #slides #deciem, #report #deciem with receipts; PPTX export re-check "all 683 ... carried"). Defects found by reading the outputs and by `hic-output-qa` are in `plans/hic-uplift-handoff-2026-10-02.md` sections 4b-4e |

Handoff with ordered remaining steps: `plans/hic-uplift-handoff-2026-10-02.md`.
