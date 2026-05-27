---
name: service-log-triage
description: Runs the 15-symptom HiC log-audit checklist against a named Docker service's logs and maps each hit to its validator hook. Use when the user reports "the chat is slow", "the generator failed", "something feels off", "the proxy is throwing errors", or after a stage of the HiC pipeline produces a refusal, an empty output, or a 400/500 surfaces in DevTools. Reads docker compose logs for the named service, scans for the 15 known failure patterns from feedback_hic_log_audit_pattern.md, and emits a structured triage report mapping each hit to the validator hook that catches it. Works for hic-research, research-proxy, agent, launchpad, social-research-backend, journey-mapper, copilot-recipe-generator, and any other container in docker-compose-all.yml.
---

# HiC Service Log Triage

The user's stated symptom is rarely the root cause. The HiC pipeline has 15
known failure patterns documented in
`C:/Users/JonathanLupo/.claude/projects/d--NXT-HUMANS-AI-CX-WORKBENCH/memory/feedback_hic_log_audit_pattern.md`
plus the 8-point export-defect family in `feedback_export_visual_qa_pattern.md`.
This skill turns those memory rules into a runnable checklist.

## When to invoke

Trigger this skill when ANY of the following are true:

- User reports a HiC chat turn that "felt slow" or "took forever".
- User reports a HiC deliverable that arrived empty, anemic, or contained a
  refusal-style dodge ("corpus lacks the specific data…").
- User reports a session that won't restore (404, blank screen, missing
  artifacts after IndexedDB hydrate).
- User reports an export (PPTX/PDF/PNG) that shipped blank slides, wrong
  fonts, or clipped content.
- The browser DevTools network panel shows a 4xx or 5xx against
  `127.0.0.1:5012` (proxy) or `127.0.0.1:5011` (research-generator).
- After any `docker compose ... restart` or `up -d --build` to confirm the
  service came up clean.
- Proactively after the user replays a previously-failing prompt to
  confirm the bug is gone AND no new symptom was introduced.

## Procedure

### Step 1 — Identify the service

Default: `hic-research` (the SPA's nginx container) unless the symptom is
clearly proxy-side (CORS, API 5xx, wiki write failure → `research-proxy`)
or agent-side (chat tool routing, MCP discovery → `agent`).

Container names that bite — use these exact strings, not the friendly
names:

| Friendly  | Container                  |
|---        |---                         |
| HiC SPA   | `hic-research`             |
| HiC proxy | `research-proxy`           |
| Social FE | `social-research-frontend` |
| Social BE | `social-research-backend`  |
| Agent     | `agent`                    |
| Launchpad | `launchpad`                |
| Journey   | `journey-mapper`           |
| Character | `consistent-character-generator` |
| Copilot   | `copilot-recipe-generator` |

### Step 2 — Tail recent logs

```bash
docker compose -f docker-compose-all.yml logs --tail=2000 <service>
```

For a multi-service investigation:

```bash
docker compose -f docker-compose-all.yml logs --tail=500 hic-research research-proxy agent
```

If the user has an active session window, ALSO grab the browser console
log — many HiC symptoms surface client-side (the SPA is nginx-served, so
container logs only show nginx access lines).

### Step 3 — Scan against the 15-symptom HiC pattern set

Run each pattern in order; on hit, note the validator hook that catches
it. Patterns are derived from
`memory/feedback_hic_log_audit_pattern.md`.

| # | Pattern (grep) | Probable root cause | Validator hook |
|---|---|---|---|
| 1 | `thick-evidence.*drop|all themes dropped` | Strict-tier yield zero; upstream corpus too thin | `validate_theme_yield.py` |
| 2 | `confidence.*NO-DATA|HYPOTHESIS` (leaked) | Reporting-depth metadata escaped to chat | `validate_freeform_structure.py` |
| 3 | `framework.*404|frameworks/.*Not Found` | Missing wiki framework page; generation degraded silently | `validate_framework_page_exists.py` |
| 4 | `topic.?model.*404|BERTopic.*timeout` | Topic-model pipeline incomplete | `validate_topic_model_completion.py` |
| 5 | `relevance.*low.*85%|corpus skew` | Corpus relevance skewed > 85% low | `validate_corpus_relevance_distribution.py` |
| 6 | `429|quota.*exhausted|rate.?limit.*back.?off` | Provider quota hit; resilience layer firing | `validate_no_silent_fallback.py` |
| 7 | `Connector.*timeout|fetch.*aborted` | External data source timeout | (manual triage) |
| 8 | `UnhandledRejection|Uncaught.*Promise` | Promise rejection without surface | (manual triage) |
| 9 | `contradiction.*false.?positive|conflict storm` | wikiLintService contradiction detector mis-firing | (manual triage; see wikiLintService.ts) |
| 10 | `search.*query.*hallucin` | Hallucinated query in research fabric | (search query hook) |
| 11 | `degraded.*path|fallback.*silent|provider.*substitute` | Multi-model resilience fallback fired invisibly | `validate_no_silent_fallback.py` |
| 12 | `evidence.*gap|Evidence Gap|TBD` (in output) | QA-annotation tokens leaked to user-visible field | `validate_freeform_structure.py` |
| 13 | `RangeError.*Maximum call stack` | Spread-pattern stack overflow (fixed 2026-05-26 in wikiLintService) | (manual; check `array.push(...arr)` patterns) |
| 14 | `Session not found.*\.statement-` | Slug sanitizer trailing-dash mismatch (fixed 2026-05-26) | (manual; check `_resolve_session_folder`) |
| 15 | `tech-audit-inspector.*281|tools.*systems inventory` | Dispatcher misroute via synonym expansion (fixed 2026-05-26) | (manual; check `extractHashtagDirectives`) |

ALSO scan for the 8-point export defect family from
`memory/feedback_export_visual_qa_pattern.md` if the symptom is
export-related (PPTX/PDF/PNG ships wrong).

### Step 4 — Emit the triage report

Report shape (markdown table, no prose padding):

```
| # | Symptom | First seen | Last seen | Hits | Validator |
|---|---------|------------|-----------|------|-----------|
| 6 | OpenAI 429 | 14:32:01 | 14:32:18 | 4 | validate_no_silent_fallback.py |
| 13| RangeError in wikiLintService:22 | 14:31:55 | 14:31:55 | 1 | wikiLintService.ts strip spread |
```

Then a single-paragraph **root-cause hypothesis** combining the hits.
Always lead with the highest-blast-radius pattern (provider quota, stack
overflow, schema validation) even if it had fewer occurrences than a
nuisance pattern.

If no patterns matched but the user reported a symptom, say so explicitly
and propose the next investigation step (check browser DevTools network
tab, replay with `localStorage.debug=*`, check IndexedDB for stale state).

### Step 5 — Append to the failure log

```bash
echo "$(date -Iseconds) :: <service> :: <pattern-id> :: <one-line summary>" \
  >> humans-in-control-research/hic-workspace/wiki/synthesis/generation-failures.md
```

The failure log is read by the cross-engagement-pattern-miner skill on the
next /loop run, so today's incident informs tomorrow's retrieval.

## Anti-patterns

- DO NOT use `docker logs <container>` directly — the project's pattern is
  always `docker compose -f docker-compose-all.yml logs <service>`.
- DO NOT propose `docker compose down -v` (the nuclear reset) as a
  triage step. That destroys volumes, including the wiki write history
  and session folders.
- DO NOT propose restart-then-retry as the first move. Triage the logs
  FIRST so the restart isn't blind.
- DO NOT skip Step 5 — the failure log is the input to the
  pattern-miner, and a missed entry is a missed lesson.
