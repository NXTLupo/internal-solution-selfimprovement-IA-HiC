# AIR Authoring Contract (shared, mandatory for all hashtag artifacts EXCEPT #proto)

Every consulting hashtag deliverable is authored as an **Artifact Intermediate Representation
(AIR)** BEFORE any prose, slide payload, or HTML. AIR forces decision-grade thinking up front so
quality comes from STRUCTURE, not from post-hoc validators. Schema: `_shared/air.schema.json`.

> WHY: our slop never came from missing format rules; it came from missing an upfront authoring
> contract. Validators/hooks/post-processors enforce quality AFTER weak thinking - they cannot make
> the model choose a sharper frame, sequence an executive story, or attach owner/metric/trade-off to
> a recommendation. AIR makes the thinking the gate. (Origin: nxt-consulting-artifact-architect
> proposal, 2026-06-16; converged onto the HiC registry + render gate + SkillOpt per UNIFIED_VISION.)

## Do not duplicate doctrine — these are the canon (read, don't restate)
- **Consulting doctrine, evidence hierarchy, citation protocol, anti-slop, Quantitative Claim Rule,
  action-title rule, content budgets:** `.claude/CLAUDE.md` (loads every session).
- **Slide design system (GOLD frame, typographic system, density):**
  `humans-in-control-research/hic-workspace/wiki/design-system/gold-visual-language.md`.
- **Template selection target (the bricks):** the COMPONENT REGISTRY in
  `humans-in-control-research/hic-workspace/wiki/brand/figma-node-map.md`. `render_plan.slide_role`
  maps to a registered template there + in `components/slideTemplates/types.ts` (`SlideTemplate`).
  Brand is a token MODE flip (NXT 221:0 / NU 535:0), never a separate file.

## The five mandatory AIR moves (in order)
1. **brief** - artifact_type, audience, business_question, decision_supported, brand.
2. **evidence_ledger** - every non-obvious claim gets a `claim_id`; label observed vs inference;
   >=50% external sources; anything labeled "Evidence" carries a verbatim quote + named source.
3. **insight_hierarchy** - situation -> complication -> root_cause -> strategic_choice -> implication
   (+ moves). The artifact is a CHOICE, not a research dump.
4. **artifact_payload** - the per-artifact object below; it MUST match the renderer's data type in
   `types.ts` so the existing renderer/registry/render-gate consume it unchanged.
5. **render_plan** - per slide: slide_role (narrative intent), title-as-conclusion, claim_ids,
   visual_intent, template_constraints. Template is chosen from slide_role, NEVER from the hashtag.

Never skip AIR. If the user asks for slides, output AIR + slide plan; for prose, AIR + final prose.

## Per-artifact AIR spec (payload object + allowed slide_roles)
| Hashtag | Owning skill | artifact_payload (matches types.ts) | slide_roles |
|---|---|---|---|
| #presentation / #strategy | deck-narrative-composer / strategy-author | deck_sections, slide_sequence, strategic_thesis, recommendation_set, decision_ask | executive-thesis, case-for-action, metric-proof, root-cause, recommendation, roadmap, decision-ask |
| #recommendations | recommendation-architect | recommendation[] (owner, action, metric, timeframe, dependency, risk) | recommendation |
| #strategy (kernel) | strategy-author | diagnosis, guiding_policy, coherent_actions[] | recommendation, principles, timeline, block-quote |
| #journey | service-blueprint-mapper | journeyMap (phases, lanes, painPoints[], opportunities, kpiTiles) | journey-map |
| #blueprint | service-blueprint-mapper | serviceBlueprint (frontstage/backstage/support, line-of-visibility) | service-blueprint |
| #arch | tech-arch-generator | architectureMap (nodes, sections, connectors) | architecture-map |
| #roadmap | roadmap-builder | timeline (horizons/phases: owner, metric, risk, dependency) | timeline, roadmap |
| #org | org-chart | orgChart (tiers DECIDES/DIRECTS/DELIVERS, evidence-cited nodes) | org-chart |
| #persona | persona-architect | persona[] (name, role, jtbd, goals, painPoints[], motivations[]) | persona-card |
| #prd | prd-compiler | prdFeature[] (userStory, acceptanceCriteria[], priority) | prd-feature |
| #gap | gap-analysis-evaluator | gapMatrix (current/target, gaps[]) | gap-matrix |
| #audit | tech-audit-inspector | systemsInventory (systems[]: exposure/drift/ownership/recovery) | systems-inventory |
| #compete | competitive-analyst | matrix (peers[], capabilities[], scores) | competitive-matrix |
| #case-study | case-study-analyst | caseStudy[] (variant: four-block / before-after / evidence-stack) | case-study |
| #themes | theme-analyst | themeCluster[] (theme, insight, evidence quotes, implications) | theme-cluster, theme-arc, theme-mosaic, theme-spotlight |
| #brief | html-deliverable-composer | executiveBrief (hero finding + finding cards) | executive-brief |
| #explainer | html-deliverable-composer | executiveBrief (stepped concept + gotchas) | executive-brief |
| #report | strategic-report-writer | executiveBrief (exec-summary + key findings) | executive-brief |
| #mindmap | mind-map-architect | mindMap (central, branches[]) | (mind-map) |
| #deep-research | research-planner | research_plan (questions[], sources[], synthesis_moves[]) | (no slides) |
| #meta-themes | meta-themes | meta_themes[] | (no slides) |

## EXCLUDED: #proto
`#proto` (experience-prototype-composer) does NOT use this contract. It is an interactive React app
build with its OWN intermediate representation (the orchestrator `AppShellContract` +
per-screen specs in `services/prototypeBuilder.ts`), verified by the headless render gate. Leave it
on the pod pipeline.

## Objective quality gate (deterministic, post-AIR)
`scripts/score_artifact.py` scores AIR (evidence linkage, action-title rate, missing claim links,
density-vs-template). The objective gate fails ONLY on hard defects: missing AIR field, unresolved
placeholder, fabricated/unlinked claim_id, >2 identical slide_roles in a row, topic-not-conclusion
title, recommendation missing owner/metric/timeframe, quote without attribution. Subjective quality
goes to the artifact-review subagent + human score, NOT to Stop hooks. These feed SkillOpt.
