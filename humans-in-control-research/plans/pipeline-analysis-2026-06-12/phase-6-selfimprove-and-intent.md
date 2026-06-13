# HiC Pipeline Analysis — Phase 6: Self-Improvement + Owner Intent Synthesis (2026-06-12)

## PHASE 6 - RECURRING + HUMAN-INTERVENING SELF-IMPROVEMENT

### (a) INTENT
Every user correction, edit, vote, and regeneration becomes durable training signal: immediately (regeneration with feedback), per-session (learned constraints injected into every prompt), and across engagements (SkillOpt batch training of the skill library, gated by validation so the loop is net-positive). The human stays in the loop at every promotion point.

### (b) CURRENT IMPLEMENTATION MAP (surface -> persistence -> application)

Three reinforcement layers, all partially live:

1. FEEDBACK SURFACES: FeedbackWidget (votes/stars/text under every deliverable; "Apply now" regeneration; 2026-06-12 train_skill checkbox); chatFeedbackExtractor (LLM-classified chat corrections + #refine); AnalysisCheckpoint edits; Design Desk edits.
2. PERSISTENCE: feedbackService -> wiki/feedback/<slug>/<deliverable>.jsonl + _index.json; learningEngine clusters by (deliverable_type, polarity) and routes to FIVE targets when confidence crosses thresholds: learned constraints / skill patches / framework updates (queued, never auto) / anti-patterns / exemplars. learned-constraints.md (57+ rules, confidence 0.8-1.0) injected into EVERY Claude Code session (UserPromptSubmit hook) AND every generation prompt.
3. APPLICATION: loadGenerationContext() constraint injection (staged deliverables); promptImprovementEngine chat rules; SkillOpt batch (extract-rollouts -> build-training --feedback-base [2026-06-12: user feedback folds in as 0.3-score failure trajectories] -> skillopt-batch.sh --auto-promote, GATED by validate-candidate); RI anchored re-ask on uncertainty signals; traceRecorder + Pareto scoring feed the epoch proposer.

### (c) CRITICAL WEAKNESSES
1. chatFeedbackExtractor classifier JSON failures are SILENT DROPS (observed live: "Unexpected token 'H', Here is th..." — the classifier model answered in prose); no retry, no regex fallback.
2. Checkpoint-edit -> constraint pipeline is effectively dead code (edits logged, never clustered).
3. Constraint dedup missing at write time (same rule appears 3x in learned-constraints.md).
4. Epoch loop half-built: traces written, but no auto-fire trigger and no UI surfacing epoch readiness.
5. SkillOpt cadence is manual-only; no scheduled batch when feedback accumulates.
6. Chat-surface HTML deliverables (#brief #report #explainer #proto #presentation) bypass loadGenerationContext() constraint injection entirely.

### (d) CANDIDATE IMPROVEMENTS
1. chatFeedbackExtractor robustness (S): try/catch + one retry + regex fallback + parse-failure logging.
2. Epoch auto-fire + UI surface (M): scheduled epoch-proposer; landing-strip epoch-readiness display.
3. SkillOpt batch auto-scheduling (M): fire extract->build->batch when 5+ train_skill feedback events accumulate (48h cadence), still gated.
4. Constraint dedup at write time (S): /api/wiki/append checks existing constraint keys; surfaces conflicts.
5. Constraint effectiveness tracking (L): per-run quality scores adjust constraint confidence; retire <30% effective.

## PART B - OWNER INTENT SYNTHESIS (42+ plan files)

| Intent theme | Confidence | Evidence (plans) | Status |
|---|---|---|---|
| Manifest-chunk retrieval is non-negotiable (never bulk-RAG) | HIGHEST (15+ plans) | intent-realization, data-pipeline-bulletproofing, handoff-cached-only | STRONG on themes/chat; hashtag HTML surfaces + freeform still bypass MCR |
| Determinism for cached runs | HIGH (12+) | intent-realization §1c, go-forward, dense-layout paginator | PARTIAL — intent clear, not enforced end-to-end (chunk-selection variance) |
| Dual-brand design fidelity (NXT + NU, Figma source of truth) | HIGHEST (9+, HANDOVER §5) | dense-layout W1, nu-uplift-figma-pptx-loop, density-tier-examples | STRONG — GOLD frames + variable collections + 20/20 parity; variable BINDING pass pending |
| No silent failure / honest surfacing | HIGH | letter-to-successor, fallback-event-surfacing, journey-pptx-parity-rca | PARTIAL — model labels fixed; RunReceipt + epoch dashboard missing |
| Depth-over-volume (evidenced synthesis is the benchmark) | HIGH | volume-to-insight-substrate, theme-quality-depth-uplift, letter-to-successor | PARTIAL — 28-theme floor + thick-evidence tiers live; persona fabrication + token-capped journey/gap remain |
| Dense layouts are structural, never shrink | HIGH | dense-layout-program, density-tier-examples | STRONG — paginator + 6 dense variants shipped; W5 SkillOpt rerun pending |
| KL selection is a binding contract (cached-only honored) | HIGH | letter-to-successor, handoff-cached-only-pipeline | PARTIAL — resolution works; themes still fire live fetch-articles; wiki COMPILE fires LLM per session |
| Self-improvement compounds across engagements | MEDIUM | hic-self-improvement loops, intent L7 | PARTIAL — runtime feedback->constraints works; epoch + pattern-miner idle |

THROUGH-LINE: "A trustworthy second brain whose every output traces to a real chunk and never lies about what it did or knows." Unresolved tensions: KL-exact vs contextual fallback; determinism vs quality; chat-surface constraints vs staged-surface constraints.
