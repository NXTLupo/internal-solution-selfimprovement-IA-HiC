---
argument-hint: <hashtag-name> [skill-id] [output-type]
description: Scaffold all four files needed to register a new HiC chat hashtag directive (registry, design-desk parser, dispatcher, skill manifest).
---

# Add HiC Hashtag — Four-File Registration Ritual

Adding a new HiC chat hashtag (`#<name>`) requires coordinated edits across
**four files**. Missing any one of them is the failure mode that produced
the 2026-05-26 `#case study #slides #NU` misroute to `tech-audit-inspector`
— the parser silently consumed an unknown hashtag, the dispatcher fell
through to synonym-expansion keyword scoring, and the wrong skill won by 14
points.

Arguments:
- `$1` — the hashtag (with or without leading `#`)
- `$2` — the owning skill ID from `humans-in-control-research/hic-workspace/skill-manifest.json` (e.g. `case-study-analyst`)
- `$3` — output type, one of: `prototype`, `html_artifact`, `presentation`, `recommendation_tiles`, `library_list`, `chat_response`, `freeform_slide`, `slide_template`

If args are missing, ask the user. Do NOT guess the skill ID — the manifest
is the source of truth and the ID must exist there.

## The four mandatory edits

### 1. `humans-in-control-research/services/hashtagRegistry.ts`

Add a `HashtagDirective` entry to the `DIRECTIVES` array. Required fields:
`id`, `name`, `category`, `summary`, `description`, `examples`,
`requiresContext`, `usesVerbalizedSampling`, `introduced` (today's date),
`outputType`. Optional: `aliases`, `combinesWith`, `modifiers`.

Use existing entries (`#case-study`, `#strategy`, `#gap`) as templates.

### 2. `humans-in-control-research/design-desk/services/hashtagParser.ts`

Three edits in this file:

a. Extend the `ContentHashtag` union to include the new tag.

b. Add the tag to the `CONTENT` Set. Without this, the parser drops it into
`unknown[]` and the dispatcher silently falls through to keyword scoring.

c. Add plural/alternate forms to `CONTENT_PLURAL_ALIASES` (e.g. plurals,
abbreviations, common misspellings). The user WILL type plurals.

### 3. `humans-in-control-research/services/corpusChatService.ts`

Two map entries:

a. `HASHTAG_TO_SKILL_ID[`#<name>`] = `<skill-id>`` so the dispatcher's
hashtag-dominance layer (added 2026-05-26) gives the directive absolute
priority over keyword scoring.

b. Add aliases (plurals, hyphenated variants) to `HASHTAG_ALIASES` mapping
back to the canonical `#<name>`.

### 4. `humans-in-control-research/hic-workspace/skill-manifest.json`

Confirm the skill entry exists. The `triggers` array MUST include the
hashtag form (`#<name>`) so the keyword scorer recognizes it as well —
defense in depth. If the skill is new, scaffold the full entry: `id`,
`name`, `description`, `category` (`research-deliverable` for content
skills), `triggers`, `wikiCompanions`, `benchmarks`, `outputTypes`,
`bestModel`, `thinkingEffort`, `executionContext`, `path`.

## Verification

After all four edits, run `npx tsc --noEmit` from
`humans-in-control-research/` and confirm zero NEW errors in the four
touched files. The keyword `#case-study` near-miss should also resolve via
fuzzy promotion (`extractHashtagDirectives` in corpusChatService.ts) — type
`#cas` in the autocomplete UI and confirm the registry surfaces a match.

## Anti-patterns to avoid

- DO NOT add the tag to `services/hashtagParser.ts` (the SLIDE-ONLY parser
  in the main services dir). That parser is presentation-only and its
  set is deliberately narrow.
- DO NOT skip the manifest entry assuming the registry is enough. The
  keyword scorer reads triggers from the manifest, not the registry.
- DO NOT use `case` or other short common English words as aliases — they
  false-positive on prose. Use the fuzzy-promotion path instead.

Now scaffold the four-file change for `$1` (skill: `$2`, output type: `$3`).
Show each diff before writing. Wait for confirmation before applying.
