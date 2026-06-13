
## 2026-06-12T22:29:34.119Z · themes · themes_1781303374119

**Quality up 2 points (now 62/100) - 5 new rule(s) earned credit.**

Overall: 62/100 (prior 60/100, delta +2)

Improved: Banned phrases (+30).
Regressed: Citation diversity (-8).
Rules applied for the first time this run:
  • chatFeedbackExtractor NEVER silently drops a signal: JSON salvage (first {...} substring) -> deterministic regex fallback classification (imperative/always-never phrasing -> correction/rule at 0.55 confidence, below auto-promotion) -> 2 attempts. learned-constraints appends DEDUP by CONSTRAINT [key] at the proxy /api/wiki/append chokepoint (duplicate-only appends return deduped=true without writing). (confidence 1.0)
  • /api/wiki/write accepts engagement; injects/extends the frontmatter engagement slug list (newline-safe; mirrors write-article); writeWikiPage(opts {chunk, engagement}); upload seeding passes both. VERIFIED live: tagged page returns its chunk pointer on the engagement-scoped tier-1 query. Every NEW ingest path MUST pass chunk:true + engagement. (confidence 1.0)
  • _runBreadthShard primary = claude-fable-5 (schema described in-prompt, no temperature, 32K out, 2 attempts) with the Gemini 3.1 Pro -> GPT-5.5 chain as untouched fallback; eliminates the Gemini repetition-collapse class at the source. No seed support on Anthropic - determinism rides the fixed catalog windows. (confidence 1.0)
  • buildManifestCorpusForGoal (chunkRetrieval.ts) is THE single grounding entry for non-slide deliverable engines. #recommendations + the HTML directives now lead with it (embedding article-RAG demoted to fallback, raw corpus last). New deliverable engines consume the helper, never per-engine retrieval. (confidence 1.0)
  • Include at least three pain points per phase in the journey map.
Carried-over rules from prior runs: 18 active.
