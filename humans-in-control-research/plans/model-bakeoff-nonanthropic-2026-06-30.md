# Model Bake-off (NON-ANTHROPIC): DeepSeek-V4 + GPT-5.5 as primaries — 2026-06-30

Answers the open question the Gemini-only bake-offs never tested: **are DeepSeek-V4 or GPT-5.5
viable PRIMARY models** (not just fallbacks) for the hashtag deliverable tiers, on a cost/quality
basis? Run via `scripts/eval/model-bakeoff-2026-06-30.mts` (real generations through the proxy at
temp 0, scored: JSON parse, citation faithfulness, structural completeness, anti-slop em-dash +
naked-number leakage, output tokens, measured $ from costMeter prices). Raw: `hic-workspace/wiki/
eval/model-bakeoff-2026-06-30.json`. **Measurement only; no routing changed by this run.**

## Anthropic arm — DEFERRED (account-level cap, probed live)
Opus 4.8, **Sonnet 4.6, AND Haiku 4.5 all return HTTP 400** "usage limits… regain 2026-07-01 00:00
UTC". The cap is **account-level on the Anthropic key, not Opus-specific** — so NO Claude model
(incl. the mid-tier Sonnet I floated) can relieve it or be bake-off'd until 2026-07-01. Re-run the
Claude arm then to settle the premium tier.

## Scorecard (cap active; n=1 corpus = "define-the-2026-state-of-the-art", 1 task/tier)

SCHEMA tier (task = gap-matrix, 5 rows):
| model | json | cite | struct | em-dash | naked# | out tok | $/run |
|---|---|---|---|---|---|---|---|
| gemini-3.5-flash | ✓ | 100% | 100% | 0 | 0 | 3611 | $0.00526 |
| deepseek-v4-flash | ✓ | 100% | 100% | 0 | 0 | 617 | **$0.00147** |
| gpt-5.4-mini | ✓ | 100% | 100% | 0 | 0 | 560 | $0.00184 |

EVIDENCE tier (task = case-study, 3-4 evidence items):
| model | json | cite | struct | em-dash | naked# | out tok | $/run |
|---|---|---|---|---|---|---|---|
| **gemini-3.1-pro-preview** | ✓ | 100% | 100% | 0 | **0** | **2372** | $0.03579 |
| deepseek-v4-pro | ✓ | 100% | 100% | 0 | **11 (verified real)** | 564 | $0.00285 |
| gpt-5.5 | ✓ | 100% | 100% | 0 | 0 | 896 | $0.03238 |

## Findings (evidence-grounded)
- **EVIDENCE tier → Gemini 3.1 Pro stays the best cost/quality (during cap).** DeepSeek-V4-pro is
  12.6x cheaper but **repeatably leaks naked statistics into prose** (8 then 11; spot-verified:
  challenge "7.5/12/50%", outcome "closing the 50% technology deficit… 66… 29") — a direct
  Quantitative-Claim-Rule violation (the project's #1 slop tell) — AND is terse (564 vs 2372 tok,
  ~¼ the content) AND carries the NU-corpus content-filter risk AND has no first-class browser
  route. GPT-5.5 is clean but **same cost as Pro** with ~⅓ the content — no reason to prefer it.
  → **No change; keep Gemini 3.1 Pro. DeepSeek/GPT rejected as evidence primaries, on data.**
- **SCHEMA tier → Gemini 3.5 Flash stays the safe default.** deepseek-v4-flash scored equal here
  and is 3.6x cheaper, but: weak citation stress (this corpus has only 4 distinct sources post
  re-resolve), content-filter risk, unwired browser route, and the absolute saving is trivial
  ($0.005 → $0.0015 per deliverable). Not a compelling switch; revisit only if the deepseek route
  is wired + content-filter-validated.
- **NANO BANANA INVARIANT:** routing here governs only the TEXT/JSON deliverable model
  (`artifactModelFor`). Per-element IMAGERY runs a separate path (`resolveArtifactImages` →
  Gemini image model / "Nano Banana"); DeepSeek/GPT cannot generate images and never touch the
  image path. Any future text re-route MUST preserve imagery on the Gemini image model.

## Net
The current converged routing — **schema → Gemini 3.5 Flash, evidence → Gemini 3.1 Pro (cap) /
Opus (post-cap)** — is **validated as the best non-Anthropic cost/quality choice**. The cost-tempting
alternatives fail on quality (DeepSeek naked-number slop + terseness) or offer no advantage (GPT-5.5).

## Open / next
1. Post-2026-07-01: re-run the Claude arm (Opus + Sonnet) to settle the premium evidence tier
   (does Opus justify its cost over Gemini Pro, or does Pro suffice?).
2. Stronger citation stress: re-run on a corpus with many distinct named sources (this one collapsed
   to 4), to genuinely test fabrication resistance.
3. n>1 corpora + more deliverable types before any permanent tiering change.
