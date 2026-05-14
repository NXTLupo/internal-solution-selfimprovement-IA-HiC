# Changes for Shane's Review — v4 Merge Branch

**Branch target:** `release/v4-merged` on `github.com/NXT-Humans/NXT-HUMANS_AI_CX_WORKBENCH`
**Lead engineer:** [working with Claude]
**Reviewer:** shane.brennan@nxthumans.com (required on every PR)
**Started:** 2026-05-13
**Status:** Phase 0 in progress — no commits or pushes yet

This log captures every modification proposed or made in service of the v4 merge. Nothing is committed or pushed without Shane's approval. Section headings track the build-plan phase.

---

## Pre-flight findings (Phase 0)

### Tooling on the engineer's machine

| Tool | Status | Used for |
|---|---|---|
| git 2.51 | ✓ | All work |
| gh 2.89 | ✓ | PR creation, GitHub API |
| docker 28.4 | ✓ | Local dev |
| kubectl | ✓ | Phase 5 hosted deploy |
| uv 0.7.20 | ✓ | Python workspaces |
| node v24.7 | ✓ | TS workspaces |
| python 3.13 | ✓ | Scripting |
| **az (Azure CLI)** | ✗ | **Phase 5.1 needs install** |
| **terraform** | ✗ | **Phase 5.4 needs install** |
| **helm** | ✗ | **Phase 5.4 needs install** |
| **pnpm** | ✗ | **Phase 3/4 needs install** |

Action: install `pnpm`, `az`, `terraform`, `helm` before Phase 3 begins.

### GitHub repo access — confirmed on all 8 keep-list repos

| Repo | Default branch | Access |
|---|---|---|
| internal-solutions-HIC-research | `main` | ✓ |
| internal-solutions-claude4-journey-mapper-v2 | `develop` | ✓ |
| internal-solutions-consistent-character-generator | `develop` | ✓ |
| internal-solutions-copilot-recipe-generator | `main` | ✓ |
| internal-solutions-video-analyzer | `develop` | ✓ |
| internal-solutions-reddit-ripper | `main` | ✓ |
| internal-solutions-socialresearch | `main` | ✓ |
| internal-solutions-miro-generator | `develop` | ✓ |

**Note for Shane:** PR target branches vary — 4 repos default to `main`, 4 default to `develop`. The build plan said "PR to develop" universally; we'll PR to whichever branch each repo's HiC-related work last landed on. **Question to confirm with Shane:** for the `main`-default repos, should the v4-merge PRs target `main` or `develop`?

### Branches on `internal-solutions-HIC-research`

13 active branches including:
- `develop` (recently active)
- `main` (default; production-ready)
- `staging`, `production` (environment branches)
- `feature/hic-overhaul-import` — **flagged for investigation** before drafting the HiC PR; this branch name suggests prior HiC overhaul work that may overlap with our merge
- `feature/ISS-484-embed-mcp-ai-studio` — MCP-embedding-in-AI-Studio work; possibly relevant
- `chore/oidc-auth` — OIDC auth wiring; relevant to Phase 5.1
- Various ISS-tagged bugfixes (-689, -693, -703)

**Action for Shane:** confirm which branch is the canonical merge target for the HiC PR. Recommend `develop`. Also confirm whether `feature/hic-overhaul-import` already contains overlapping work we should rebase against rather than ignore.

---

## Modifications log

### Modification 1 — Restore `/api/ai/anthropic` endpoint in the HiC proxy

**File:** `humans-in-control-research/proxy/app.py` (lines ~6562-6605)
**Date:** 2026-05-13
**Reason:** The endpoint had been stubbed out on the `HiC-Gemini-Primary` branch (returning HTTP 410 with a message pointing users to use Gemini/OpenAI instead). The current branch's two-pass brief generator routes through `/api/ai/anthropic` to reach Claude Opus 4.7, and the runtime `callAIWithFallback` helper in generated prototypes also uses Anthropic as the 2nd-priority provider. Without this endpoint, `#proto` fails immediately at brief generation pass 1.
**Change:** Replaced the 410-stub with a real proxy that forwards to `https://api.anthropic.com/v1/messages` using server-side `ANTHROPIC_API_KEY`. Mirrors the pattern of the existing Gemini and OpenAI proxy endpoints in the same file.
**Status:** Applied to local working tree; proxy container restarted; live smoke test returned a real Claude Opus 4.7 response.
**For Shane:** This change is HiC-internal (only affects the SPA, not the platform). Open question: was the endpoint intentionally removed for a reason that still applies (cost, security, branch experiment)? If yes, we need a different fix in v4.

---

## Phase 0 working tree plan

**Target location:** `D:\NXT-HUMANS_AI_CX_WORKBENCH-v4\`
**Source:** clone of `github.com/NXT-Humans/NXT-HUMANS_AI_CX_WORKBENCH` at `develop` tip
**Working branch:** `release/v4-merged` (created off develop)
**Status:** Not yet created — pending confirmation that this approach is correct

**No commits to push yet.** Everything below this line is proposed work, not done work.

---

## Design principle locked in (2026-05-13)

**Zero-Structural-Code App Onboarding (ZSC):** Adding a new app to the Suite requires only configuration changes — never edits to platform code. The launchpad, the agent, the framework, the Helm chart, the auth chain, and the routing layer are all manifest-driven. Adding `pricing-strategist` is two YAML edits + one new repo from a template, zero lines of platform code touched.

This is the operating principle the owner needs the platform to honor. v4 hardens existing partial implementations:
- Launchpad reads `config/service-registry/manifest.yaml` for service URLs (today: hand-coded dictionary)
- Agent reads MCP wrapper manifests for tool registration (today: hand-coded `tool_services` dict in agent/app.py)
- New repo `internal-solutions-template` provides the scaffold (today: doesn't exist)
- Walkthrough in `docs/operations/add-new-app.md`

Phase 6.9 is added to the build plan to land this hardening. ~1-2 engineer-days.

---

## Modification 2 — Fix anemic-brief problem in HiC prototype builder

**Files:**
- `humans-in-control-research/services/prototypeBriefGenerator.ts` (Pass 2 deepening logic)
- `humans-in-control-research/components/CorpusChatPanel.tsx` (brief card UI)

**Date:** 2026-05-13

**Problem reported by owner:** Generated product briefs were skeleton-only — names of use cases / screens / AI capabilities visible, but every other field empty. "No evidence of deep thought."

**Root cause:** Three stacking failures.
1. The previously-stubbed `/api/ai/anthropic` endpoint (modification #1) was returning HTTP 410 to every Pass 2 deepening call. All 5 Opus-based deepening calls failed silently and fell back to `skeletonToFallbackBrief()`, which produces minimal briefs with empty `trigger`/`flow`/`ai_role`/`outcome`/`primary_element`/`purpose`/`user_action`/`input_data`/`output`/`user_benefit` fields — exactly the anemic output observed.
2. Even with the endpoint fixed, the `max_tokens: 16000` budget on Pass 2 calls was too small for the v2 schema (8-12 use cases + 7-10 screens + 5-8 AI capabilities + 5+ sample records + feature_roadmap + narrative_arc + interaction_choreography). Opus was being truncated mid-JSON, causing `JSON.parse` to fail and triggering the same fallback.
3. The fallback path was silent — no console error, no UI indicator. Users got skeleton briefs that looked like real output.

**Changes:**
1. Bumped Pass 2 `max_tokens` from 16,000 → 32,000 (Opus 4.7 supports up to 64K output)
2. Added 250ms stagger between parallel Anthropic call starts to avoid burst rate-limit triggers
3. Added structural-completeness sanity check after each Pass 2 succeed: if use_cases < 3 OR screens < 3 OR ai_capabilities < 2, log a warning (parsed but under-specified — likely partial truncation)
4. Added `_pass2_failed` + `_pass2_reason` markers on fallback briefs so the UI can flag them
5. Surface success/failure count in the brief-generation chat status: "5/5 briefs deepened" vs "3/5 briefs deepened · 2 fell back to skeletons"
6. UI: brief cards with `_pass2_failed: true` now show a red `⚠ SKELETON ONLY — DEEPENING FAILED` chip and the Build button is disabled with explanatory tooltip
7. console.error (not warn) on Pass 2 failure so it's visible in Sentry once Phase 5.6 telemetry lands

**Status:** Applied to local working tree; rebuild in flight.

**For Shane:** the depth issue should be resolved by max_tokens bump alone. The other changes (stagger + visibility + UI badge) are defense-in-depth for when the upstream HiC repo absorbs this PR. None of these changes touch the framework substrate — pure HiC-internal fix.

---

## Critical finding — HiC upstream is ~4 weeks behind local

**`internal-solutions-HIC-research` develop tip:** `0bc815de`, dated **2026-04-16**
**Local HiC last activity:** dated **2026-05-13** (~27 days ahead)

The upstream repo's most recent work:
- 2026-04-16 — `fix(ci): use Dockerfile.acr for production builds`
- 2026-04-16 — `feat(hic-overhaul): adapt HIC research for NXT platform with framework integration`
- 2026-04-14 — `feat: embed MCP tools for agent orchestration (ISS-484)`
- 2026-04-04 — `feat: adopt nxt-framework proxy prefix middleware`
- 2026-04-03 — `feat(gemini): replace non-existent ImageGenerationConfig with ImageConfig`

The local working tree has ~4 weeks of unmerged HiC evolution that's not upstream:
- Two-pass Opus 4.7 brief generator (`prototypeBriefGenerator.ts`)
- Stage 2.5 — 30 Simulated User Sessions via VS (`prototypeBuilder.ts`)
- Stage 3.5 — Build Recipe Author (`prototypeBuilder.ts`)
- Stage 4 — Vertical Slice discipline
- Stage 5 — Session Coverage audit
- 22 hashtag directives (`hashtagRegistry.ts`)
- 18-template slide system with native PPTX export
- 200+ source data fabric (`proxy/app.py`)
- Verbalized Confidence at 9 generator sites
- 350+ phrase slop blacklist + 19 meta-narration patterns (`slidePostProcessor.ts`)
- Stable chunk URLs + heartbeat UI + transport retry
- v4.0 boot banner + feature flags
- Restored `/api/ai/anthropic` endpoint (modification #1 above)

**Merge approach for the HiC PR:**

Two challenges intersect:
1. Upstream develop adopted nxt-framework primitives Shane wired (proxy prefix middleware, framework integration commits 2cf41c42 + 48aa55ed)
2. Local has 4 weeks of pure feature work that doesn't know about those primitives

**Proposed sequence:**
1. Clone `internal-solutions-HIC-research` `develop` locally to a sibling dir
2. Apply local feature work as a sequence of feature PRs ON TOP of upstream develop, not as one mega-PR — likely 4-6 sub-PRs for reviewability:
   - **PR-a: Brief generator + two-pass Opus 4.7 + dedicated popup window** (prototypeBriefGenerator.ts, popup HTML rendering, .md/.txt/.json export)
   - **PR-b: Prototype pipeline Stages 2.5/3.5/4/5** (prototypeBuilder.ts overhaul — Sim Sessions, Build Recipe Author, Vertical Slice, Session Coverage)
   - **PR-c: Hashtag system + 18-template slide system + native PPTX** (hashtagRegistry.ts, slideTemplates/*.ts, pptx.ts, slidePostProcessor.ts)
   - **PR-d: 200+ source data fabric + 63 proxy endpoints + wiki layer** (proxy/app.py extensions, dataSourceConnectors.ts, researchFabricOrchestrator.ts)
   - **PR-e: Verbalized Confidence + 9 wired generator sites** (verbalizedConfidence.ts, geminiService.ts)
   - **PR-f: Anthropic endpoint restoration + small fixes** (proxy/app.py:6580 + smaller cleanup)

3. Each PR rebases onto whatever previous PR landed. Shane reviews in sequence rather than confronting one 10K-line PR.

4. Conflicts to expect in PRs PR-d and PR-e: the proxy and aiRouter likely overlap with Shane's framework integration. Resolve by adopting framework primitives where they exist (e.g. proxy uses `nxt-framework.identity` for the new endpoints).

5. Out of scope for these PRs (handled elsewhere in the v4 plan): wiki centralization migration (Phase 3.5), skills lift to framework (Phase 3), per-user keys (Phase 5), Authentik forward-auth (Phase 5).

**For Shane:** the sub-PR split is the proposed approach. If you'd prefer a different cut (e.g., one mega-PR with diff-by-diff review, or even more granular splits), say so before we start.

---

## Open questions awaiting Shane

1. **PR target branch per repo** — 4 of 8 internal-solutions repos default to `main` rather than `develop`. Confirm target.
2. **`feature/hic-overhaul-import` branch on HIC-research repo** — is there overlapping work we should rebase against?
3. **`/api/ai/anthropic` endpoint** — was the original removal intentional for cost/security/policy reasons that still apply?
4. **Microsoft Entra tenant** — does one exist for NXT Humans? If yes, share tenant ID + admin contact. If no, we provision in Phase 5.1.
5. **Production domain** — confirm `workspace.nxthumans.ai` (prod) + `staging-workspace.nxthumans.ai` (staging) is right per dev's intent.
6. **Wiki centralization scope for v4** — confirm Option B for HiC proxy migration (proxy keeps HTTP shape, internals call framework) and minimum-viable Wiki UI (browse + search + view; no edit UI yet).
7. **Service drops** — confirm we delete (not park): legacy `journeymapper`, `presentation-generator`, `linkedin-generator`, `flux-lora-studio`, `image-captioner`, `soundtrack-generator`, `scrapehero-amazon`, `openai-journey-mapper`, NXT Agency, plus dormant MCP wrappers `linkedin-mcp`, `mulmocast-mcp`, `openai-journey-mcp`.
8. **Reviewers** — Shane confirmed on the HiC PR. Same reviewer required on every other internal-solutions-* PR? Or different reviewers per service?
