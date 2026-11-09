# Eval cases (2026-10-30, plan harness-capability-curve-uplift WS-2)

One case per file. `regression/` holds cases today's model passes (they guard the harness and
future models); `frontier/` holds cases it does not (they come from user reports, failed runs,
auditor withholds and the roadmap). A frontier case that passes three consecutive runs is
promoted to regression by `npm run eval -- --promote`. A case every tested model passes three
times is marked `saturated` and should be replaced by a harder one.

Shape (see `services/evalSuite.ts::EvalCase`, validated by `validateCase`):

```json
{
  "id": "slides-nxt-positioning-run45",
  "set": "frontier",
  "kind": "slides",
  "input": { "objective": "...", "prompt": "Generate a #slides deck ...", "engagement": "slug", "brand": "nxt" },
  "fixture": { "output": [ ...slides... ], "groundingChunks": [ ... ], "pages": { "articles/x/y.md": "..." }, "source_ref": "sessions/<slug>/artifacts/slides_123.air.json" },
  "expected": { "min_scores": { "chain:evidenceSlots": 0.8 }, "trajectory": { "tools_before_generate": true, "max_repair_rounds": 2, "no_fail_open": true } },
  "origin": { "type": "failed_air", "ref": "slides_123", "added": "2026-10-30" }
}
```

Runners: `npm run eval` (replay, deterministic, CI), `npm run eval:live` (generates through the
real pipeline against the live proxy, then scores), `POST /api/eval/seed-frontier` (files failed
AIR records and hook rejections as frontier cases), `POST /api/eval/cases` (the FeedbackWidget
files a case per submission).
