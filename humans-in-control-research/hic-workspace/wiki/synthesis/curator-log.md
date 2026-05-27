---
title: Wiki Curator Log
type: synthesis
updated: 2026-05-24
last_run: 2026-05-24T00:00:00Z
next_scheduled: 2026-05-31T00:00:00Z
run_mode: baseline-seed
auto_fixes_applied: 0
---

# Wiki Curator Log

This is the first curator run. No prior `curator-log.md` exists, so all deltas are unmeasured. This run is a baseline seeding pass per the user directive — the curator walked the wiki and the lint output but did not modify any wiki page content or frontmatter.

## Run summary 2026-05-24

| Metric                       | Current   | Prior | Delta       |
|------------------------------|-----------|-------|-------------|
| Total wiki pages (all dirs)  | 8,269 .md | n/a   | (first run) |
| Pages scanned by lint        | 137       | n/a   | (first run) |
| Broken-link findings (raw)   | 17,775    | n/a   | (first run) |
| Broken-link findings (real)  | 79        | n/a   | (first run) |
| Orphan pages                 | 103       | n/a   | (first run) |
| Missing-frontmatter pages    | 88        | n/a   | (first run) |
| Missing-frontmatter findings | 102       | n/a   | (first run) |
| Reference-asymmetry          | 1         | n/a   | (first run) |
| Evidence-density warnings    | 11        | n/a   | (first run) |
| Contradictions               | 4         | n/a   | (first run) |
| Coverage-gap                 | 1         | n/a   | (first run) |

Total .md count is 8,269 because `articles/` (3,826), `social-intelligence/` (3,759), `uploads/` (513), and `transcripts/` (22) are bulk-ingested external research that the linter intentionally skips per the AGENTS.md convention (orphan checks do not apply to embedding-retrieved corpora). The 137 pages the linter scanned are the human-authored knowledge layer (`frameworks/`, `benchmarks/`, `anti-patterns/`, `evidence/`, `brand/`, `engagements/`, `synthesis/`, `sources/`, `exemplars/`, and a handful of other top-level dirs).

The 17,775 raw broken-link finding count is misleading. Of that total, 17,696 (99.6%) are the lint report files (`synthesis/lint-2026-05-23.md` and `synthesis/lint-2026-05-22.md`) being re-scanned and the linter flagging the literal `[[2013, 4, 17]]` citation-tuple strings inside *the prior lint output* as wikilinks. The lint reports echo their own warnings, the next lint pass scans those reports, and the count explodes. Real broken-link findings (excluding the lint-report self-echo) total **79 across 8 source pages**.

## Auto-fixes applied this run

- 0 frontmatter fields auto-inferred (baseline seeding pass — no writes)
- 0 broken links repaired via rename detection (baseline seeding pass — no writes)
- 0 orphan pages backlinked from index (baseline seeding pass — no writes)

## Triage — what a full curator run could auto-fix

### Phase 1 — Frontmatter repair (88 pages, 102 findings)

Auto-fixable in a full run (unambiguous inference per agent rules):

- **`sources/` ingest pages (80 pages, missing `updated` only)**: These are agent-generated source summaries from prior ingests. The filename embeds the ingest date (`2026-05-14-...`). `updated:` can be inferred from filename or mtime; `title:` and `type:` are already present in these files. Safe to auto-fix in a single bulk pass.
- **`benchmarks/cx-metrics.md`, `benchmarks/financial-impact.md`, `benchmarks/maturity-models.md`, `benchmarks/technology-adoption.md`**: Each missing `title`, `type`, `updated`. `type: benchmark` is unambiguous from the directory. `title:` can be inferred from the `# H1` heading. Safe to auto-fix.
- **`brand/proper-nouns.md`**: Missing `title`, `type`, `updated`. `type: brand` from directory. Safe to auto-fix.
- **`synthesis/improvement-lineage.md`, `synthesis/verifier-history.md`**: Missing `title`, `type`, `updated`. `type: synthesis` from directory. Safe to auto-fix.
- **`synthesis/uncertainty-ledger.md`**: Missing only `updated`. Safe to auto-fix from mtime.

Estimated bulk auto-fix in full mode: **~88 pages, ~102 frontmatter fields** — all within the 200-fix bounded-action budget.

### Phase 2 — Broken-link repair (79 real findings, 8 source pages)

Real targets fall into three classes; rename detection won't help most of them:

- **Placeholder text never replaced** (`[[related-wiki-page]]`, `[[another-page]]`): These appear in `evidence/cx-maturity.md` and `evidence/digital-transformation.md`. They are template scaffolding the generator left behind. Action: in a full run, propose stripping the literal placeholder wikilinks rather than searching for a rename target. Flag for review — could not auto-fix without semantic intent.
- **Date-tuple miscoercion** (`[[2013, 4, 17]]`, `[[2008]]`, `[[2017]]`): Six `sources/2026-04-*-create-a-comprehensive-strategy-...md` pages contain author/date citation tuples that the markdown serializer wrote inside `[[...]]` brackets instead of plain parentheses. These are not broken links — they are mis-typed citation strings that the linter is misreading. Action: surface to the user. The fix is upstream in `wikiService.ts` citation serialization, not in the wiki pages themselves.
- **Genuine broken targets** (small handful, mixed in): Need case-by-case rename search. None had exactly-one-basename matches on a quick sample.

Estimated bulk auto-fix in full mode: **0** — every real broken link in this corpus is either a placeholder or a serializer bug. Both classes belong in the flagged-for-review list, not the auto-fix list. The agent's "never auto-create stub pages" rule applies.

### Phase 3 — Orphan page triage (103 pages)

Per the agent rules, orphan pages in `articles/` are skipped (embedding-retrieved). The 103 flagged orphans break down as:

- **`sources/` (80 pages)**: Per-engagement source summaries. Each is the output of a single research run and is intended to be referenced from that engagement's `engagements/<slug>.md` page (or the run's session state), not the master index. In most cases, the corresponding `engagements/` page either doesn't exist or doesn't backlink. Action: full run could add a "Sources ingested in this engagement" section to each existing `engagements/` page that backlinks the appropriate `sources/*.md` pages. Conservatively, **bulk-backlinkable: ~30-50 pages**. Remainder: flag for user — many of these are duplicate/redundant ingest artifacts and likely deletion candidates after user review.
- **`synthesis/` (14 pages)**: Includes the `compile-history/` subdirectory and a few one-off synthesis pages. The compile-history pages are append-only machine-managed records and should be excluded from orphan checks by adding `_compile-history/` rename or directory marker. Action: propose schema change in the AGENTS.md update, not file-level fix.
- **`engagements/` (4 pages)**: `smoke-test.md` plus three engagement scratch pages. These should be backlinked from the top-level `index.md` Engagements section. Auto-fixable in full mode — single edit to `index.md`.
- **`brand/` (2 pages)**: `brand/proper-nouns.md`, one other. Should appear in `index.md` Brand section. Auto-fixable.
- **`anti-patterns/` (2 pages)**: `data_review.md`, `deck_structure.md`. Should appear in `index.md` Anti-Patterns section. Auto-fixable.
- **`evidence/` (1 page)**: `research-findings.md`. Should appear in `index.md` Evidence section. Auto-fixable.

Estimated bulk auto-fix in full mode: **~10-15 backlink additions to index.md / engagements pages**, well inside the 200-fix budget.

## Flagged for user review

### Frontmatter — ambiguous (0 of 88)

All 88 missing-frontmatter pages have unambiguous inferred values per the agent's inference rules. None require user review. (Full curator run would auto-fix all 88 if invoked.)

### Broken links — ambiguous rename targets (79 of 79)

Listed here because no auto-fix is safe; each requires a user judgment call. Capped at the 200-item review budget — full list of 79 fits well under.

- `evidence/cx-maturity.md -> [[related-wiki-page]]`: template scaffolding placeholder, propose strip
- `evidence/cx-maturity.md -> [[another-page]]`: template scaffolding placeholder, propose strip
- `evidence/digital-transformation.md -> [[related-wiki-page]]`: template scaffolding placeholder, propose strip
- `evidence/digital-transformation.md -> [[another-page]]`: template scaffolding placeholder, propose strip
- `sources/2026-04-13-create-a-comprehensive-strategy-and-road.md` (13 findings): citation-tuple miscoercion (`[[2013, 4, 17]]` and similar) — fix is upstream in `wikiService.ts` writer
- `sources/2026-04-14-create-a-comprehensive-strategy-and-road.md` (10 findings): same class
- `sources/2026-04-15-create-a-comprehensive-strategy-and-road.md` (14 findings): same class
- `sources/2026-04-16-create-a-comprehensive-strategy-and-road.md` (14 findings): same class
- `sources/2026-04-20-role-you-are-an-elite-market-research-an.md` (12 findings): same class
- `sources/2026-04-21-identify-named-university-case-studies-f.md` (12 findings): same class

### Orphan pages — likely action (103 of 103)

- `anti-patterns/data_review.md`: BACKLINK_TO_INDEX
- `anti-patterns/deck_structure.md`: BACKLINK_TO_INDEX
- `brand/proper-nouns.md`: BACKLINK_TO_INDEX
- `brand/<second orphan>`: BACKLINK_TO_INDEX
- `evidence/research-findings.md`: BACKLINK_TO_INDEX
- `engagements/smoke-test.md`: REVIEW (test artifact — possible deletion candidate)
- `engagements/create-a-comprehensive-strategy-and-roadmap-of-tac.md`: REVIEW (long auto-generated slug, likely duplicate)
- `engagements/identify-named-university-case-studies-from-2025-a.md`: REVIEW (long auto-generated slug)
- `engagements/role-you-are-an-elite-market-research-analyst-embe.md`: REVIEW (slug derived from prompt prefix — possible duplicate)
- `synthesis/<14 pages including compile-history/*>`: SCHEMA_UPDATE — exclude `compile-history/` from orphan checks; treat as machine-managed append-only
- `sources/<80 pages>`: BACKLINK_TO_ENGAGEMENT where the matching `engagements/` page exists; REVIEW the rest as possible duplicates from repeated ingests of similar prompts

(Full sources/ orphan list omitted from this baseline log to stay inside the 200-item review budget; full enumeration available in `lint-2026-05-23.md` lines 35868-35966 and forward.)

## Proposed deletions

(none — baseline seeding pass; deletions only proposed after at least one prior curator run establishes which pages have remained orphaned across multiple runs.)

Future-run candidates to watch (do not delete without user approval):

- `engagements/smoke-test.md` — appears to be a development test artifact
- The 6 `sources/2026-04-*-create-a-comprehensive-strategy-...md` pages with citation-tuple bugs — likely duplicates of the cleaner `sources/uploads-2026-04-*` series and could be retired after the upstream serializer bug is fixed and the corrected versions are re-ingested
- Compile-history pages older than 90 days — once the schema is updated to recognize them as machine-managed

## Trend signal

This is the first curator run, so there is no prior baseline to measure against. The signal to capture for next week's diff:

1. The raw broken-link count of 17,775 is **structurally inflated**, not a real backlog. The next lint pass needs a fix to either (a) exclude `synthesis/lint-*.md` files from re-scan, or (b) treat content inside fenced code blocks / inline citations as non-wikilink. Once that is patched, the real broken-link backlog is small (~79) and tractable.
2. The frontmatter backlog (88 pages) is fully auto-fixable on the next non-baseline curator run — every flagged page has unambiguous inferred values per AGENTS.md.
3. The orphan-page backlog (103) is dominated by `sources/` ingest summaries (80 of 103). Most of these can be backlinked from existing `engagements/` pages without user input. The remaining ~23 across `anti-patterns/`, `brand/`, `evidence/`, `engagements/`, `synthesis/` are also auto-backlinkable from `index.md`.
4. Two issues warrant **upstream code fixes**, not curator-time fixes: the lint-report self-echo bug, and the `wikiService.ts` citation-tuple serializer writing `[[2013, 4, 17]]` instead of `(2013, 4, 17)`. Curating around them would only hide the rot source. Flagged for user.
5. Wiki health is **not regressing** — there is no prior run to compare. After one full curator run (non-baseline), the next weekly cadence will have real deltas to report.
