# Web Layout Specifications

Authoritative field-by-field spec for the 18 web slide templates. Every `:::slide template=X` block must respect the character budgets and JSON shapes below.

The canvas is 960×540 (16:9). The renderer DOES truncate overflow, but truncation is ugly — treat budgets as contractual. If content doesn't fit, pick a different template, don't let truncation handle it.

## Universal slots (every template)

| Field | Budget | Notes |
|---|---|---|
| `title` | 120 chars | Complete sentence, action-titled, contains number or named entity |
| `sources[i]` | 40 chars per source | Always present, never empty, deduplicated |

## Content-fitting rules

1. **Paraphrase to fit.** If a verbatim quote is 220 chars but the slot is 100, pick a SHORTER verbatim excerpt from the same source — never copy a 200-char quote into a 100-char slot expecting truncation.
2. **Insights compress, evidence stays verbatim.** Insights are your prose; you can rewrite tighter. Evidence quotes are sacred — find shorter ones, don't paraphrase them.
3. **Action titles beat topic labels.** "Trust erodes 18 months before contact" beats "Trust erosion timing."
4. **Wrong template if it doesn't fit.** If you can't say it within budget without losing meaning, switch templates — theme-spotlight (more room per theme) instead of theme-mosaic (small cells).
5. **Don't pad to fill.** Concise beats verbose.

---

> CANONICAL THEME LAYOUTS (2026-06-23): the Figma-backed theme set is **theme-overview** (590:9, the 4-column grid, DEFAULT) and **theme-detail** (590:11, one-theme deep-dive), plus **theme-arc** and **theme-mosaic**. `theme-spotlight` and `theme-cluster` below are DEPRECATED ALIASES (no Figma component); emit theme-detail instead of theme-spotlight and theme-overview instead of theme-cluster. theme-overview adds per-theme `dominance`/`mood`/`subthemes[]`/`tension` + slide `takeaway`; theme-detail adds `quotes[]`/`whatItMeans`/`convergenceLabel`. The shape/budget notes below still apply to the aliased layouts.

## theme-spotlight (1 hero + 2-3 supporting) — v3.0 DENSIFIED [DEPRECATED ALIAS → theme-detail]

### Field budgets
| Field | Budget | Required |
|---|---|---|
| `themes[0].name` (HERO) | 85 chars | yes |
| `themes[0].insight` (HERO) | 400 chars, 2-3 sentences | yes |
| `themes[0].evidence` (HERO) | 280 chars, FULL SENTENCE | yes |
| `themes[0].source` (HERO) | 75 chars | yes |
| `themes[0].implication` (HERO) | 220 chars | NEW — 1 sentence why this matters to the research objective |
| `themes[1..3].name` (SUPPORTING) | 70 chars | yes (3+ themes required) |
| `themes[1..3].insight` (SUPPORTING) | 220 chars, 2 sentences | UPGRADED from 1 sentence |
| `themes[1..3].signal` (SUPPORTING) | 56 chars | NEW — concrete metric/entity proving the theme |
| `themes[1..3].source` (SUPPORTING) | 45 chars | yes |
| `patternSignal` (CLUSTER) | 240 chars | NEW — cross-source pattern callout under hero quote |

### JSON shape
```
:::slide template=theme-spotlight
{
  "title": "Trust erosion before first contact dominates the dataset, with 3 corroborating signals",
  "sources": ["G2 Reviews","Industry Analyst Brief","Customer Forum","Support Tickets"],
  "themeCluster": {
    "themes": [
      {
        "name":"Onboarding friction breaks the early-value promise",
        "insight":"Reviewers repeatedly cite slow, manual setup as the top complaint, undercutting the value proposition that justifies the price. It recurs as the single most-cited grievance across sampled reviews in the last 12 months.",
        "evidence":"Three weeks to get set up. No guided import, no template, no answer from support. The whole reason we bought this is gone.",
        "source":"Customer Forum",
        "implication":"Renewal conversations fail later if the product never delivers value during onboarding."
      },
      {
        "name":"Price skepticism is eroding the renewal base",
        "insight":"The accounts the team must renew enter the cycle already doubting ROI, putting every expansion conversation on the defensive.",
        "evidence":"Most of my team thinks the seats we bought were a waste of money.",
        "source":"Support Tickets",
        "signal":"ROI skepticism concentrated in accounts up for renewal"
      },
      {
        "name":"Vendor posture is now a buying variable",
        "insight":"Public vendor positioning directly shapes whether buyers advance or stall a deal.",
        "evidence":"We're pausing the contract until we understand what this policy change means for us.",
        "source":"Industry Analyst Brief",
        "signal":"Deal stalls tied to vendor positioning changes"
      }
    ],
    "patternSignal":"Three independent signals converge on one mechanism: trust leaks during onboarding, compounds through the contract term, and the vendor never sees it because the data layer can't assemble a unified account view."
  }
}
:::
```

---

## theme-arc (3-4 themes in narrative chain) — v3.0 DENSIFIED

| Field | Budget | Required |
|---|---|---|
| `themes[i].name` | 70 chars | yes (3-4 themes, exactly) |
| `themes[i].insight` | 280 chars, 2-3 sentences | UPGRADED from 1 |
| `themes[i].evidence` | 140 chars | yes |
| `themes[i].signal` | 56 chars | NEW — SIGNAL metric per step |
| `themes[i].source` | 45 chars | yes |
| `patternSignal` | 240 chars | NEW — optional cross-step pattern footer |

Use when themes build sequentially (cause → effect → response). Numbered chain across the top with arrows.

---

## theme-mosaic (2×2 grid) — v3.0 REDESIGNED

**Aesthetic change**: the old black-and-white inverse checkerboard is replaced with a uniform ivory surface (`PALE`), hairline rules (`RULE`) between cells, and a single chartreuse accent bar on the PRIMARY cell (index 0). Content density is unchanged; visual rhythm is now restrained and brand-aligned.

| Field | Budget | Required |
|---|---|---|
| `themes[i].name` | 80 chars | yes (exactly 4 themes) |
| `themes[i].insight` | 240 chars, 2 sentences | UPGRADED from 1 |
| `themes[i].evidence` | 140 chars | yes |
| `themes[i].signal` | 52 chars | NEW |
| `themes[i].source` | 45 chars | yes |
| `patternSignal` | 240 chars | NEW |

**First theme in the array is the PRIMARY** — it gets the chartreuse accent bar and slightly bolder numeral. Order intentionally.

---

## stat-row / by-the-numbers — v3.0 DENSIFIED

| Field | Budget | Required |
|---|---|---|
| `stats[i].value` | 10 chars | e.g. "$2.4M", "47%", "3x" |
| `stats[i].label` | 90 chars | Headline for the number |
| `stats[i].meaning` | 160 chars | NEW — "What this means" interpretive sentence |
| `stats[i].matters` | 160 chars | NEW — "Why it matters now" urgency sentence |
| `stats[i].source` | 60 chars | yes |
| `convergentInsight` | 320 chars | NEW — synthesis across all stats, full row below cells |
| `patternSignal` | 240 chars | NEW — optional pattern callout |

### JSON shape
```
:::slide template=stat-row
{
  "title": "Three numbers explain why Advancement velocity has stalled",
  "sources": ["Northeastern CRM Assessment","NXT Stakeholder Interview","CASE 2024"],
  "statRow": {
    "stats": [
      {
        "value":"40%",
        "label":"of officer time spent reconciling data across CRMs",
        "meaning":"Front-line fundraisers burn nearly half their week on manual record merging instead of donor conversations.",
        "matters":"Every reclaimed hour compounds: peer schools freed 600+ hrs/officer/year and moved major-gift close-rates 30%+.",
        "source":"NXT Stakeholder Interview"
      },
      {
        "value":"3",
        "label":"separate Salesforce instances in production",
        "meaning":"Three disconnected orgs means prospect work at one college is invisible to every other college.",
        "matters":"Cornell consolidated 4 → 1 and unlocked 34% conversion lift in 18 months — the window is closing as peers move.",
        "source":"Northeastern CRM Assessment"
      },
      {
        "value":"-12%",
        "label":"alumni participation decline since platform migration",
        "meaning":"Participation is the leading indicator of major-gift pipeline 7-10 years out, and it is moving the wrong direction.",
        "matters":"Without action the cohort Advancement must convert in the next decade will enter alumni status already disengaged.",
        "source":"CASE 2024"
      }
    ],
    "convergentInsight":"Three independent signals — officer time, system fragmentation, and participation decline — all point to the same root cause: Advancement is operating a platform, not a unified donor system. Fix the platform and the other two metrics move together.",
    "patternSignal":"Peer institutions (Cornell, BU, NYU) that closed this gap in 12-18 months posted 30%+ major-gift conversion lifts within the first post-cutover year."
  }
}
:::
```

---

## UNIVERSAL DENSITY AXIS (2026-06-10) — applies to EVERY template

Every slide accepts a density: `base` (default) or `dense`. Declare it on the
fence (`:::slide template=NAME density=dense`) or as a top-level JSON field
(`"density": "dense"`). The renderers raise per-template item ceilings under
dense and adapt type size to the actual item count, in BOTH the web preview
and the 1920x1080 PPTX stage twin, so a dense slide exports correctly.

EMIT `density=dense` WHEN:
- The user asks for more detail, more lines, more quotes, more rows, "all of
  the evidence", "the full list", or uses the #dense hashtag.
- The user MODIFIES a prior generation by asking to add items beyond the base
  ceiling (interpret the addition as a dense regeneration, never drop items).
- The corpus is rich enough that cutting to the base ceiling would discard
  named, evidenced items the user explicitly asked to see.

STAY at base when the request is a summary, an overview slide, or an executive
cover. Density raises CEILINGS, not floors: never pad with filler to reach the
dense ceiling; every added item must be evidenced (verbatim quote or named
entity). Dense ceilings per template (base -> dense, items / sub-items):
persona-card 3->5 pains · recommendation 3->5 actions, 2->4 evidence ·
theme-cluster/spotlight 4->6 themes · theme-arc 4->5 · competitive-matrix
7->10 rows · block-quote 3->5 corroborating data · case-study 4->5 bullets,
3->4 evidence rows · principles 5->8 · stat-row 3->4 · timeline 5->6 phases,
5->7 items each · service-blueprint 6->7 stages · journey-map 5->6 stages,
3->4 actor lanes · gap-matrix 7->10 gaps ·
architecture-map 8->12 nodes per layer · prd-feature 4->6 features ·
systems-inventory 10->14 systems.

---

## case-study — v4.0 GOLD VARIANTS (2026-06-10)

Case-study renders on the GOLD frame (rail + dot mark + IBM Plex Mono kicker +
action title + meta row + takeaway band) in THREE deep-dive layout variants.
DIVERSIFY variants across a deck: when emitting multiple case studies, never
repeat one layout (per the case-study learned constraint). Subjects MUST be
NAMED real entities (institution / company / program), never archetypes.

| `variant` | When to use | Payload |
|---|---|---|
| `four-block` (default) | Single rich case: challenge, approach, outcome + metrics panel | `challenge`/`approach`/`outcome` + `keyMetric`/`supportingMetrics`/`pullQuote`/`comparables` |
| `before-after` | The case is an operating-model SHIFT (old way vs new way) | `beforeAfter` + optional `pullQuote` |
| `evidence-stack` | The case rests on convergent verbatim quotes from named sources | `evidence[]` (3 quotes) |

| Field | Budget | Required |
|---|---|---|
| `subject` | 60 chars | yes |
| `subjectMeta` | 90 chars | industry / region / size |
| `timeframe` | 40 chars | e.g. "18 months" |
| `investment` | 40 chars | e.g. "$2.4M, 12-person team" |
| `variant` | enum | `four-block` / `before-after` / `evidence-stack` |
| `challenge` | 460 chars | four-block: 3-4 full sentences (density floor: do not write one-liners) |
| `approach` | 460 chars | four-block: 3-4 full sentences describing what they actually did |
| `outcome` | 460 chars | four-block: 3-4 full sentences; numbers only inside cited quotes |
| `lesson` | 380 chars | four-block: renders as the 4th accent-bar block (LESSON), 2-3 sentences |
| `beforeAfter.before.headline` | 60 chars | before-after: the old operating model, named |
| `beforeAfter.before.points[i]` | 140 chars | 3-5 points, QUALITATIVE patterns (numbers only inside cited quotes) |
| `beforeAfter.after.headline` | 60 chars | before-after: the new operating model, named |
| `beforeAfter.after.points[i]` | 140 chars | 3-5 points, mirror the before list one-for-one where possible |
| `beforeAfter.result` | 220 chars | one or two sentences, what changed |
| `evidence[i].quote` | 220 chars | evidence-stack: 3-4 rows, VERBATIM quote, never paraphrase, never a title |
| `evidence[i].source` | 60 chars | named source (SOURCE: line) |
| `evidence[i].shows` | 160 chars | one-line interpretation (WHAT IT SHOWS) |
| `takeaway` | 220 chars | the GOLD takeaway band: ONE bold phrase or sentence |
| `pullQuote.text` | 200 chars | full sentence |
| `pullQuote.attribution` | 60 chars | yes |
| `pullQuote.role` | 60 chars | ALWAYS include speaker's role |
| `keyMetric.value` | 12 chars | qualitative hero phrase preferred |
| `keyMetric.label` | 90 chars | |
| `supportingMetrics[i].value` | 12 chars | up to 4 |
| `supportingMetrics[i].label` | 60 chars | |
| `lesson` | 280 chars | generalizes the takeaway (band fallback) |
| `comparables[i].name` | 48 chars | 2-3 other orgs with adjacent results |
| `comparables[i].outcome` | 80 chars | |
| `comparables[i].source` | 40 chars | |
| `implication` | 260 chars | |

### JSON shape — before-after variant
```
:::slide template=case-study
{
  "title": "Amazon designs the top contact reasons out of existence instead of staffing up to answer them",
  "sources": ["Amazon Shareholder Letter","HBR Service Operations 2024"],
  "caseStudy": {
    "subject": "Amazon",
    "subjectMeta": "The self-serve model · Global e-commerce · Self-service CX",
    "timeframe": "Sustained operating model",
    "investment": "Upstream defect fixes + self-serve surfaces",
    "variant": "before-after",
    "beforeAfter": {
      "before": { "headline": "Staff to the volume", "points": ["Every contact reason is answered by adding more agents","The same defect generates the same call every week","Tickets closed is the scoreboard, not contacts avoided"] },
      "after": { "headline": "Design the contact away", "points": ["The top contact reasons are traced to an upstream defect and fixed","The answer is surfaced before the contact form","Contacts that never had to happen become the scoreboard"] },
      "result": "Routine contacts fall away as the underlying defects disappear, so capacity shifts to the genuinely novel problem."
    },
    "pullQuote": { "text": "The best customer service is if the customer doesn't need to call.", "attribution": "Amazon Shareholder Letter" },
    "takeaway": "The lever is not more agents; it is fewer reasons to make contact. Removing the defect beats answering the call."
  }
}
:::
```

### JSON shape — evidence-stack variant
```
:::slide template=case-study
{
  "title": "Stripe makes the documentation the first responder, so most questions never become tickets",
  "sources": ["Stripe Docs","Developer Survey","Stripe Engineering"],
  "caseStudy": {
    "subject": "Stripe",
    "subjectMeta": "The documentation model · Developer platform · Self-service CX",
    "timeframe": "Sustained operating model",
    "investment": "Versioned docs + search relevance",
    "variant": "evidence-stack",
    "evidence": [
      { "quote": "If it's in the docs, the question usually never becomes a ticket.", "source": "Stripe Docs", "shows": "The documentation resolves at the point of need, before a queue exists." },
      { "quote": "I found the integration answer faster than I could have filed a ticket.", "source": "Developer Survey", "shows": "For the developer, findability beats even the fastest queue." },
      { "quote": "We version the docs with the API, so the answer is never stale.", "source": "Stripe Engineering", "shows": "Freshness is what keeps the documented fix trustworthy." }
    ],
    "takeaway": "The first responder is the document, not the agent. Invest in search relevance and version freshness, and the ticket becomes the exception."
  }
}
:::
```

### JSON shape
```
:::slide template=case-study
{
  "title": "Cornell's 18-month CRM consolidation lifted major-gift conversion 34% and reclaimed 624 officer-hours/year",
  "sources": ["CASE 2024","Cornell Advancement Annual Report 2025","Gartner Higher-Ed CRM 2025"],
  "caseStudy": {
    "subject": "Cornell University",
    "subjectMeta": "Ivy League · Ithaca, NY · 26K students · $2.4B endowment",
    "timeframe": "18 months (Q2 2023 → Q4 2024)",
    "investment": "$7.2M program cost · 14-person program team + 3 Salesforce SIs",
    "variant": "four-block",
    "challenge": "Cornell's Advancement operated 4 disconnected CRMs across colleges, each with its own data model and stewardship cadence. Major-gift officers reconciled donor profiles manually, cycle time averaged 90 days longer than peer benchmarks, and prospects known to one college were invisible to the rest.",
    "approach": "College-by-college consolidation to a single Salesforce Advancement Cloud instance. Phase 1: 3-month data-quality remediation (dedup 140K records, resolve 4K conflicts). Phase 2: sequenced migration, smallest college first, with 6-week user training per wave. Phase 3: retire legacy, launch unified propensity scoring.",
    "outcome": "Major-gift conversion rate rose 34% (13.8% → 18.5%). Average cycle time dropped 90 days. Officer administrative time fell from 22 hrs/wk to 10 hrs/wk, reclaiming ~624 hrs per officer per year. Year-one ROI: 2.1× program cost.",
    "keyMetric": {"value":"+34%","label":"major-gift conversion rate, 12 months post-cutover"},
    "supportingMetrics": [
      {"value":"-90 days","label":"cycle time reduction"},
      {"value":"624 hrs","label":"officer time reclaimed / year"},
      {"value":"140K","label":"records deduped"},
      {"value":"2.1×","label":"program-cost ROI, Year 1"}
    ],
    "pullQuote": {
      "text":"Within six months we stopped asking 'do we know this donor?' We already knew, and we knew the next best action.",
      "attribution":"VP Advancement Services, Cornell",
      "role":"17-year Advancement veteran, CASE 2024 panelist"
    },
    "lesson": "Consolidation pays back fastest when the smallest college migrates first: it validates the data model at low risk and creates internal champions who sell the remaining cutovers.",
    "comparables": [
      {"name":"BU Advancement (2022)","outcome":"Consolidated 3 orgs → 1 in 14 months; 28% major-gift conversion lift","source":"CASE 2024"},
      {"name":"NYU (2023)","outcome":"Unified 6 colleges into single Salesforce org; +$18M annual giving YoY","source":"NYU Annual Report 2024"},
      {"name":"Michigan (2024)","outcome":"2.4× officer productivity post-consolidation, 12-month program","source":"Gartner Higher-Ed CRM 2025"}
    ],
    "implication":"The pattern holds across every peer case: consolidation is not a CRM project; it is the prerequisite for every AI-driven advancement initiative in the next 24 months."
  }
}
:::
```

---

## recommendation — v3.0 DENSIFIED

| Field | Budget | Required |
|---|---|---|
| `actionTitle` | 140 chars | Complete sentence stating the action |
| `rationale` | 360 chars | 2-3 sentences of why |
| `supportingActions[i].name` | 45 chars | up to 5 |
| `supportingActions[i].description` | 220 chars | |
| `impactGrid.baseline` | 60 chars | NEW — current state, e.g. "6% mobile giving today" |
| `impactGrid.target` | 60 chars | NEW — goal state, e.g. "15% by Q3 2026" |
| `impactGrid.timeframe` | 60 chars | NEW — e.g. "9 months, 3-phase" |
| `impactGrid.owner` | 60 chars | NEW — e.g. "VP Advancement Services" |
| `impactMetric.value` | 12 chars | optional — shown below grid |
| `impactMetric.label` | 80 chars | |
| `evidence[i].text` | 180 chars | NEW — 2-3 quotes justifying the action |
| `evidence[i].source` | 45 chars | NEW |
| `evidence[i].attribution` | 60 chars | NEW |
| `implication` | 260 chars | NEW |

### JSON shape
```
:::slide template=recommendation
{
  "title": "Consolidate three Salesforce instances into one to recover $2.4M annually",
  "sources": ["Northeastern CRM Assessment","Gartner Higher-Ed CRM 2025","Cornell Advancement Annual Report 2025"],
  "recommendation": {
    "actionTitle": "Migrate Annual Giving, Major Gifts, and Reunion to a single Salesforce org by Q4",
    "rationale": "Three separate orgs create reconciliation overhead consuming 40% of advancement-officer time per the CRM Assessment. Cornell's 18-month consolidation lifted major-gift conversion 34% — that is the pattern to follow.",
    "supportingActions": [
      {"name":"Data audit","description":"Inventory all custom objects across the three orgs and map duplicates. Dedicated team runs this for 8 weeks before migration planning begins."},
      {"name":"Pilot migration","description":"Migrate Reunion (smallest dataset) first to validate model and process. Two-week instrumentation sprint follows cutover."},
      {"name":"Training","description":"Run 5 sessions for the 80-person advancement team before cutover — job-role-specific, not generic product training."}
    ],
    "impactGrid": {
      "baseline": "40% officer time on reconciliation across 3 orgs",
      "target": "<12% reconciliation time, single unified org",
      "timeframe": "9 months, 3-phase cutover",
      "owner": "VP Advancement Services + 12-person program team"
    },
    "impactMetric": {"value":"$2.4M","label":"annual recovered productivity"},
    "evidence": [
      {"text":"I wouldn't know in our database right now that Andrew, you work with Rob — that's exactly the relationship that closes a major gift.","source":"NXT Stakeholder Interview","attribution":"Major Gifts Officer"},
      {"text":"Within six months we stopped asking 'do we know this donor?' — we already knew, and we knew the next best action.","source":"CASE 2024 panel","attribution":"VP Advancement Services, Cornell"}
    ],
    "implication":"This is the unlock for every downstream Advancement initiative — prospect scoring, predictive outreach, and stewardship automation are all blocked by the fragmented data layer."
  }
}
:::
```

---

## block-quote — v3.0 DENSIFIED

| Field | Budget | Required |
|---|---|---|
| `text` | 420 chars | full-sentence verbatim, smart-clipped |
| `attribution` | 60 chars | yes |
| `role` | 50 chars | ALWAYS include when source provides it |
| `source` | 60 chars | yes |
| `context` | 150 chars | short tag, e.g. "ON NON-CASH GIVING GROWTH" |
| `contextParagraph` | 480 chars | NEW — 3-4 sentence WHO/WHEN/WHY setup under the quote |
| `corroboratingData[i].value` | 12 chars | NEW — 2-3 supporting stats in right sidebar |
| `corroboratingData[i].label` | 100 chars | NEW |
| `corroboratingData[i].source` | 40 chars | NEW |
| `implication` | 260 chars | NEW |

### JSON shape
```
:::slide template=block-quote
{
  "title": "The advancement system that exists vs. the one staff describe",
  "sources": ["NXT Stakeholder Interview","CASE 2024","Gartner Higher-Ed CRM 2025"],
  "quote": {
    "text": "I wouldn't know in our database right now that Andrew, you work with Rob — and that's exactly the relationship that closes a major gift. We have the data, we just can't see it across the three systems we're running.",
    "attribution": "Anonymous Major Gifts Officer",
    "role": "20-year veteran, Northeastern Advancement",
    "source": "NXT Stakeholder Interview, March 2026",
    "context": "ON DATA FRAGMENTATION",
    "contextParagraph":"This quote comes from a stakeholder interview conducted during the March 2026 CRM assessment. The officer is describing how three siloed Salesforce instances — one per college — prevent even basic relationship mapping across donor households. This is the single most-cited friction point across 14 stakeholder interviews.",
    "corroboratingData": [
      {"value":"40%","label":"of officer time spent on manual data reconciliation","source":"NXT Interview"},
      {"value":"-12%","label":"alumni participation since the last platform migration","source":"CASE 2024"},
      {"value":"L1","label":"Northeastern maturity tier vs. peer median of L4","source":"Gartner 2025"}
    ],
    "implication":"Consolidating to a unified donor view is a prerequisite to every other advancement initiative — prospect scoring, predictive outreach, and stewardship automation all assume a single system of record."
  }
}
:::
```

---

## theme-cluster (equal 3-4 columns) [DEPRECATED ALIAS → theme-overview; emit theme-overview, which adds dominance/mood/subthemes/tension + takeaway band]

| Field | Budget | Required |
|---|---|---|
| `themes[i].name` | 55 chars | 3-4 themes |
| `themes[i].insight` | 180 chars | 1-2 tight sentences |
| `themes[i].evidence` | 120 chars | |
| `themes[i].source` | 45 chars | |
| `themes[i].implication` | 220 chars | NEW — optional |
| `themes[i].signal` | 56 chars | NEW — optional |

## persona-card (unchanged in v3.0)

See existing schema in `types.ts:PersonaCardData`.

## competitive-matrix (unchanged in v3.0)

See existing schema. Reminder: column definitions go under each header; every row carries per-row `note` (evidence line) and `source`; `scaleLabels[]` at 5 positions for maturity level names; `subjectRow` is highlighted and shown first.

## principles / timeline / section-divider / service-blueprint / gap-matrix / architecture-map / prd-feature / systems-inventory

See existing schemas in `types.ts`. Not part of the v3.0 density upgrade — retain their existing budgets.

## journey-map (#journey) — GOLD actor-lane journey matrix (2026-06-11)

`#journey` is a JOURNEY MAP, not a Bitner blueprint (`#blueprint` owns frontstage/backstage).
Source of truth: the Figma GOLD journey frames (NU page 53:159, T3 exemplar 156:2; NXT page
75:2) and `JourneyMapData` in `types.ts`. Anatomy on the GOLD shell:

- Kicker: `JOURNEY MAP · <journeyType>` · mono meta row `SCOPE · ACTORS · PHASES`
- Optional dashboard: PERSONAS / OVERALL PAIN POINTS / STRATEGIC OPPORTUNITIES (3 items
  each, opportunities carry "(Named Source)" attributions)
- Up to 3 KPI tiles: mono label + QUALITATIVE hero word ("Routed", "Doc-first") + mono sub.
  First tile may be `isHeadline` (dark band treatment). Never a naked number in a tile.
- Matrix: stage columns (5 base / 6 dense) x ACTOR lanes (3 base / 4 dense). Stage headers
  ink; mark AT MOST 1-2 stages `critical: true` (accent header). Cells = one short clause of
  what that actor does at that stage; `"not engaged"` renders greyed italic.
- PAIN POINTS row (accent) aligned to stages · `keyInsight` rides the takeaway band.

```
:::slide template=journey-map brand=nu
{ "title": "<action title>", "sources": ["<named source>"], "journeyMap": {
    "journeyType": "ADVANCEMENT STAFF VIEW", "scope": "One donor pipeline",
    "actors": "Staff · Officers · Data team", "phasesLabel": "Five, matriculation to giving",
    "stages": [{"name": "Matriculation"}, {"name": "Co-op", "critical": true}, {"name": "Graduation"}, {"name": "Early alumni"}, {"name": "Giving"}],
    "lanes": [
      {"actor": "Advancement staff", "role": "owns the pipeline", "cells": ["...", "...", "...", "...", "..."]},
      {"actor": "Gift officers", "role": "carries the ask", "cells": ["not engaged", "...", "...", "...", "..."]},
      {"actor": "Data team", "role": "owns the records", "cells": ["...", "...", "...", "not engaged", "..."]}
    ],
    "painPoints": ["...", "...", "...", "...", "..."],
    "kpiTiles": [{"label": "KEY FINDING", "value": "Siloed", "sub": "ADMISSIONS DATA NEVER REACHES ADVANCEMENT", "isHeadline": true}],
    "keyInsight": "<structural cost, qualitative>" } }
:::
```

---

## Theme count requirements (hard rule)

Every theme-multi template has a MINIMUM theme count:

- `theme-cluster`: minimum 3, maximum 4
- `theme-spotlight`: minimum 3 (1 hero + 2 supporting); 4 is better
- `theme-arc`: exactly 3 or 4
- `theme-mosaic`: exactly 4 (2×2 grid)

If the corpus only supports fewer themes, switch templates:
- 1 theme → `block-quote` or `case-study`
- 2 themes → `split-panel` or `comparison`

Never emit a theme-multi template with fewer than 3 themes — empty slots render as visible "gaping holes."

## Quote density — multi-quote themes

Every theme child inside `themeCluster` accepts an optional `quotes[]` array in addition to the singular `evidence` field. When the user asks for "N quotes each" or uses `#quotes=N`, populate `quotes` on every theme with N verbatim passages from DISTINCT sources:

```
"quotes": [
  {"text": "verbatim passage from source A", "source": "Source A", "attribution": "Speaker, Role", "url": "https://...", "date": "Apr 2026"},
  {"text": "verbatim passage from source B", "source": "Source B"},
  {"text": "verbatim passage from source C", "source": "Source C"}
]
```

Prefer distinct sources across quotes on the same theme. The renderer stacks every quote; the singular `evidence` is used only as a fallback when `quotes` is absent. Never fabricate quotes to fill the array.
