# HiC Harness — Master Roadmap (consolidated, 2026-06-02)

The single sharpened plan, integrating: the first audit (five pipeline-quality gaps), the
first whitepaper (SOTA patterns -> H1-H5), the dark-corners brief, and the **second
independent whitepaper** ("Securing the Dark Corners," Downloads/dark.pdf) that reviewed it.
This supersedes the sequencing in the earlier docs; those remain as detail references.

Source docs: `harness-architecture-audit-2026-06-02.md`, `harness-sota-integration-2026-06-02.md`,
`harness-kpi-accountability-2026-06-02.md`, `independent-review-brief-dark-corners-2026-06-02.md`.

## SCOPE RECALIBRATION (2026-06-02): LOCAL SINGLE-USER, NOT PRODUCTION
Owner clarified HiC is a **local, single-user tool — not going to production**. This sharply
re-ranks the dark corners, most of which assumed multi-client / network-exposed deployment:
- **DEPRIORITIZED (premised on prod/multi-tenant exposure):** A1 proxy auth (already shipped
  default-OFF — dormant, zero local impact; leave it), A3 multi-tenant isolation, A4 prompt-
  injection hardening, the third-party DPA-tier routing, and SSRF/egress control. These become
  "accepted risk / revisit only if it ever leaves the laptop."
- **KEEP (good hygiene, already shipped, no downside):** A2 keys-out-of-URLs + log redaction.
- **STILL VALUABLE LOCALLY (these are about the tool WORKING and being USEFUL, not security):**
  H1 observability/RunReceipt (so YOU can see why a local run failed without docker logs),
  H2 determinism (reproducible local runs), B1 embedding-space integrity (retrieval correctness),
  B2 single-worker-vs-shared-state (local stability), E1/E2 durability (don't lose YOUR wiki +
  learning state on a crash/clear), F1 cost ceiling (your own bill), G1 a small eval set (so
  improvements are real), and ALL the quality work (themes/topics/sentiment/exports/layout).
**New top priority = "HiC works locally and produces useful output," not the security/governance
program.** The H2/H4/H4b/H5 quality spine + local-stability/durability items lead; security
items are dormant/accepted.

## EXECUTION ORDER — USEFULNESS-FIRST (2026-06-02, owner directive)
Re-ranked so the features that make the RESEARCHER'S OUTPUT better lead; infra supports them.
1. **U1 — Cognitive chain: themes + persona pain points feed recommendations (H4 core).** The
   audit's highest-impact usefulness defect: `generateRecommendations` never receives the run's
   themes/personas though its prompt claims to review them, so recs re-derive (and can fabricate)
   instead of building on the actual analysis. Fix = pass approved themes + persona pains in.
2. **U2 — Relevance: enrich-then-score (H4b/relevance).** Corpus relevance is scored on a
   600-char pre-enrichment snippet and never re-scored, so the corpus is ordered by text the
   model won't see. Re-score the enriched body -> better, on-objective output.
3. **U3 — Theme/citation grounding (H4b).** Themes/claims must cite chunk IDs that resolve;
   NLI/substring causal check (correctness != faithfulness). Builds on the cluster-grounding
   already shipped this session.
4. **U4 — Themes/topics/sentiment quality** (largely SHIPPED this session: cluster-grounding,
   de-conflation, RoBERTa sentiment, insightful titles, no-blank treemap) — confirm in a fresh run.
5. **U5 — Export==preview fidelity + residual layout** (the slide/PPTX/PDF issues hit earlier).
SUPPORTING INFRA (after / alongside usefulness, not ahead of it): RunReceipt/observability
(H1.1 — module `proxy/run_receipt.py` WRITTEN, parked unwired until usefulness items land),
determinism (H2), durability (E1/E2), cost ceiling (F1). Security A1/A2 done/dormant.

## What the second review changed in my thinking
1. **Security/governance is the real fire, not pipeline quality.** A1 (unauthenticated proxy
   on `host="::"`), A2 (provider keys in URL query strings, logged plaintext), A3 (single global
   vector store, no tenant key -> cross-client leakage) are **P0** and were validated against
   OWASP API Top-10 (2023) + OWASP LLM Top-10 (2025). These jump ahead of most quality work.
2. **G1 (no labeled gold set) is a true H0 plan-blocker, confirmed.** H5's LLM-judge reward and
   Krippendorff-alpha calibration have nothing to calibrate against; the loop "can confidently
   make things worse." Build the gold set FIRST; the same labels also power the B1/C1/D1/E3
   detectors.
3. **Two dark corners I MISSED**, both P1: **SSRF/egress control** on the jina/URL fetchers (a
   crafted corpus URL can make the server hit cloud-metadata / the unauthenticated proxy itself),
   and a **third-party LLM data-handling tier** (client-confidential docs + embeddings sent to
   Gemini/GPT/Claude/OpenAI with no DPA-tier / zero-retention routing).
4. **The highest-leverage architectural fork:** graduating the vector store to **pgvector or
   Qdrant collapses A3 (tenancy) + B1 (embedding-space integrity) + E1 (durability) into one
   platform decision.** Treat as a strategic fork with a change-trigger.
5. **Corrections to my claims (accepted):** "27/30 blank slides" and "17,775 broken links" are
   **directional, not load-bearing** — the mechanisms (template drift, link rot) are real, the
   exact numbers unverified. And **link rot does not necessarily degrade VECTOR retrieval**
   (which works on chunk embeddings, not inter-page links) — E3 is P2, gate any pruning on
   measuring it first.
6. **Governance backbone named:** adopt **NIST AI RMF Generative AI Profile (NIST-AI-600-1, Jul
   2024)** — GOVERN / MAP / MEASURE / MANAGE — its 12 GAI risk categories map ~1:1 to HiC's gaps
   (Data Privacy A2/A3, Information Security A1/A4, Information Integrity A4/C1, Confabulation G1).
   This gives the whole program a defensible, named structure.
7. **Cross-cutting principle, reinforced:** EVERY fallback must be LOUD (telemetry event in the
   RunReceipt). Silent degradation is the failure class the first whitepaper attacked; A4, B1,
   C2, E1, H3-fix-risk, and I2 all RE-INTRODUCE it unless each downgrade emits an event.

---

## The staged plan (gates + change-triggers)

### STAGE 0 — H0 PREREQUISITES (before any self-improvement work)
**0.1 G1 Gold set [P0-plan].** ~200-300 expert-labeled traces across theme-quality / sentiment /
citation-faithfulness / deliverable-quality; 2-3 annotators; track Krippendorff alpha; **0-5
judge scale** (2026 result: human-LLM alignment highest on 0-5); quarterly refresh (replace the
staler 100-200). **Gate on H5:** do not start GEPA/ACE until the gold set exists AND judge-vs-human
alpha >= 0.6 (target >= 0.8). *Change-trigger:* if expert annotation proves infeasible, fall back
to RAGAS/DeepEval reference-free CI signals + the adversarial suite, and down-scope H5 to
non-self-improving evaluation. (The judge cannot exceed inter-rater agreement on the task; for
subjective consulting quality, even strong agreement may sit below 0.8 — calibrate expectations.)
**0.2 Cost instrumentation [F1].** OpenTelemetry GenAI metering on EVERY provider call
(`gen_ai.usage.*`) so proxy-side Opus/Pro is counted, + a per-run AND per-tenant **hard dollar
ceiling** in the orchestrator. **Gate on H5:** H5 cannot run without a hard budget cutoff
(GEPA/ACE add unbounded call volume). *Why now:* a runaway loop can move a monthly bill by tens
of thousands before finance sees the line.

### STAGE 1 — FOLD INTO H1 (observability + the P0 security fixes)
**1.1 RunReceipt = OpenTelemetry GenAI trace tree** (root span/run, `gen_ai` child span/stage,
coverage counters), self-host Langfuse/Phoenix; materialized-view fail-loud invariants
(`DEGRADED if sources_succeeded/attempted < 0.9`; `FAILED on empty-success`); replace
empty-success returns with `Result<T, StageError>`.
**1.2 A1 auth + loopback bind [P0].** Bind `host="127.0.0.1"`; front with an authenticating
gateway (TLS + bearer/OIDC, also does rate-limit/cost guards) AND a FastAPI per-route auth
dependency (default-deny). **CI test that enumerates `app.routes` and fails if any `/api/*` route
lacks the auth dependency.**
**1.3 A2 keys-to-headers + log redaction [P0].** Move keys to `x-goog-api-key`/`Authorization`
headers (never the URL); add an httpx logging filter that redacts `key=`/`Authorization`;
**rotate every key that has ever been in a URL (assume compromised).** Add GitGuardian/TruffleHog
secret-scanning as a standing CI gate.
**1.4 Detectors-as-observability** (the brief's "add a detector" hypotheses, both confirmed):
- **B1** embedding-space metadata (`model,version,dim,metric`) on every vector + dimension
  assertion at query time -> RunReceipt field (kills the silent-mix class cheaply).
- **C1** placeholder-as-evidence detector: mark image chunks `unprocessed`, EXCLUDE from
  retrieval, surface "N images not yet analyzed" — never admit the apology string as citable.
- **D1** template-parity CI test: fail CI when a template ID exists in `web.tsx` XOR `pptx.ts`.
- **H3-fix-risk** loud-fallback tagging: every sentiment result tags engine (`roberta`|`vader`)
  and emits a degradation event when it falls back.

### STAGE 2 — PARALLEL WORKSTREAMS (independent of the H-spine)
**2.1 A3 tenant isolation [P0, highest business risk — do not defer].** Collection/DB-per-engagement
(target) with **interim Postgres RLS / mandatory `tenant_id`+`engagement_id` metadata pre-filter
(fail-closed)** if migration lags; **Microsoft Presidio PII scrub on ingest**; a **"forget this
engagement" delete path** (GDPR Art.17 — deleting from index + evicting caches suffices since HiC
keeps client data in RETRIEVAL not training; verify no residual copies in caches/snapshots/logs).
**2.2 E1 durability [P0/P1].** **Litestream continuous WAL replication to object storage (PIN a
known-good version — v0.5.6/0.5.7 had a silent replication-failure bug — + a dead-man's-switch),
plus periodic `VACUUM INTO`/`.backup` snapshots (never `cp`).**
**2.3 STRATEGIC FORK — graduate to pgvector/Qdrant.** This single move collapses **A3 (tenancy via
collections/RLS) + B1 (one embedding space, metadata) + E1 (Postgres backups/replication)**.
*Change-trigger:* execute when corpus/tenant count grows OR sqlite-vec single-writer contention
appears. Until then, 2.1+2.2 are the interim guards.
**2.4 B2 Redis shared state.** Cooldowns, cache, and a distributed circuit breaker (CLOSED/OPEN/
HALF_OPEN) shared across the 4 workers, with **fail-open local fallback + a breaker on Redis
itself**. Keystone: also unlocks F1 budgets, B3 dedup, H3 routing health, and the H3-fix-risk
sibling breakers.
**2.5 B3 corpus snapshotting -> feeds H2.** Snapshot the CITED subset per deliverable immutably
NOW (the audit artifact a consultancy actually needs); WARC/lakeFS for full-gather reproducibility
only if it becomes contractual. (Content-addressing != reproducibility for live data.)
**2.6 A4 prompt-injection defense + MISSED-SSRF.** **Microsoft Spotlighting (delimit + datamark +
encode)** on all untrusted corpus text (arXiv:2403.14720: ASR >50% -> <2% on GPT-family; re-measure
on our stack) + **data-provenance trust tiers** (client upload > arXiv > RSS > Reddit/jina; never
let low-trust text occupy an instruction position) integrated into H4's blackboard; optional Prompt
Guard 2 as a NON-sole detective layer (guardrails are broadly bypassable — Emoji Smuggling hit 100%
ASR). **+ SSRF/egress control on jina/URL fetchers: egress allowlist, block link-local/metadata IPs,
no redirects to private ranges.** Keep the artifact LLM's output typed/grounded so even a successful
injection can't emit arbitrary actions.
**2.7 MISSED — third-party LLM data-handling tier [P1].** Route client-confidential content/embeddings
ONLY to providers/endpoints with contractual zero-retention; document the DPA tier per provider.
**2.8 Export edges.** D3 Playwright SSR for PDF fidelity (benchmark on Linux/Docker, not the macOS
"3ms/13ms" numbers) + native chart export; C1 multimodal RAG (Phase 3); C2 robust transcription chain.

### H2 / H3 / H4 / H4b / H5 (the pipeline-quality spine, as already specified)
Unchanged in intent (see `harness-sota-integration-2026-06-02.md`), now consuming Stage-0/1/2 work:
- **H2** content-addressed corpus (chunk ID = `sha256(NFC-normalized text + uri + offset)`, Merkle
  reproducibility hash, cache-as-determinism). Fed by B3 snapshots; uses B1's single embedding space.
- **H3** one `ModelRouter.select(TaskSpec)->ModelPlan`; policy hash in the reproducibility hash;
  bootstrap a trained classifier from H5 judge scores later; **centralize model literals with
  startup validation (I2) so the next snapshot sunset is a loud alert, not a silent 400.**
- **H4** typed blackboard + content-addressed EntityRegistry (`@id=sha256(canonical_attrs)`);
  schema-driven handoffs make the broken cognitive chain structurally impossible; ACE
  Generator/Reflector/Curator for blackboard evolution; trust tiers (2.6) live here.
- **H4b** BERTopic -> LLM label/merge -> grounding gate with **NLI/substring CAUSAL citation
  verification** (correctness != faithfulness); VS for novel themes through the same gate.
- **H5** wire `deliverableScorer` as the reward (per-criterion analytic rubric, 0-5) -> enforce
  Stop hooks as runtime gates -> GEPA/ACE offline. **Gated by H0** (gold set + alpha>=0.6 + cost
  ceiling).

### STAGE 3 — HARDEN THE FIXES (alongside H5)
- **H1-fix-risk:** NFC normalization + **cache-key completeness** (prompt-template version + model
  + embedding-space + all params in the key — "unkeyed used inputs" cause wrong cache hits).
- **H2-fix-risk (reward hacking):** hold-out human recalibration after each optimization round
  (halt if judge-human alpha drops) + **Evaluator Stress Tests** (perturb format, hold content
  constant; arXiv:2507.05619) + **judge diversity (different model family than the generator,
  control length/position/self-enhancement bias)**.
- **H3-fix-risk (sibling coupling):** the RoBERTa->VADER fallback (and all fallbacks) must be LOUD
  + health-gated via the B2 breaker.
- **I1/I2/I3:** unify the two slop-rule sets into one source of truth consumed by both layers +
  parity test; centralize model literals; **version skills/hooks in git with content hashes in the
  RunReceipt** (so a deliverable records which skill versions produced it) + an eval gate before
  promotion. Treat prompts/skills as code.

---

## KPI deltas folded in (update `harness-kpi-accountability-2026-06-02.md`)
- New P0 security KPIs: **0 `/api/*` routes without auth** (CI-asserted); **0 secrets in logs**
  (scanner-asserted); **0 cross-tenant retrieval hits** (tenant-filter test).
- H5 gates: **gold set exists AND judge-human Krippendorff alpha >= 0.6** (target 0.8); **per-run
  hard $ ceiling enforced**.
- B1: **0 mixed-embedding-space vectors** (metadata assertion).
- D1: **template-parity CI green**. C1: **0 placeholder chunks admitted as evidence**.
- K6 citations: split into **resolution rate** AND **faithfulness rate** (NLI causal check).
- Cross-cutting: **100% of fallbacks emit a degradation event** (no silent downgrade).

## Governance mapping (NIST-AI-600-1 backbone)
- GOVERN: auth/secrets/DPA-routing policy, skills-as-code versioning, cost ceilings.
- MAP: data-provenance trust tiers, tenant boundaries, modality coverage.
- MEASURE: RunReceipt telemetry, deliverableScorer + judge calibration, gold set, detectors.
- MANAGE: loud fallbacks, circuit breakers, durability/DR, incident-class P0 response.

## Honest corrections carried into the plan (things I had wrong or overstated)
- "27/30 blank slides" and "17,775 broken links" = **directional, mechanisms real, exact numbers
  unverified.** Do not treat as load-bearing.
- **Link rot != vector-retrieval degradation** (separate mechanisms); E3 stays P2 and any
  index pruning is gated on measuring impact via the gold set first.
- "Reproducible" = "same inputs -> served same cached output," NOT model determinism.
- Benchmark percentages (Spotlighting ASR, guardrail bypass, Playwright timings, GEPA/ACE/RouteLLM
  gains, Krippendorff thresholds) are **directional until measured on HiC's own stack/briefs**.

## Net sequencing (one line)
**H0 (gold set + cost ceiling) -> H1 (observability + A1/A2 + detectors) -> [parallel: A3 tenancy,
E1 durability, B2 Redis, B3 snapshots, A4+SSRF, DPA routing] -> H2/H3/H4/H4b -> H5 (gated by H0)
-> Stage 3 hardening.** Strategic fork (pgvector/Qdrant) collapses A3+B1+E1 when its trigger
fires. Every fallback is loud, or the whole effort re-creates the silent-degradation class it
set out to kill.
