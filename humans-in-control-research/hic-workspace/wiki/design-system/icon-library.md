---
id: design-system/icon-library.md
title: Icon Library - tokenized industry + content glyphs
type: design-system
updated: 2026-06-26
chunks:
  - id: "design-system/icon-library.md#c0"
    char_span: [0, 506]
    sentence_count: 6
    key_terms: [glyphs, icons, icon, deterministic, iconographic, iconlibrary, industries, token-pure]
    concepts: [glyphs, icons]
    token_count: 120
  - id: "design-system/icon-library.md#c1"
    char_span: [536, 2253]
    sentence_count: 1
    key_terms: [integration, opportunity, automation, compliance, governance, milestone, customer, decision]
    concepts: [integration, opportunity, automation, compliance, governance]
    section: Universal content glyphs
    token_count: 512
  - id: "design-system/icon-library.md#c2"
    char_span: [2024, 4154]
    sentence_count: 1
    key_terms: [journey, recommendations, funnelflow, sentiment, personas, strategy, satisfaction, engagement]
    concepts: [journey, recommendations, funnelflow, sentiment, personas]
    section: Universal content glyphs
    token_count: 512
  - id: "design-system/icon-library.md#c3"
    char_span: [3873, 6006]
    sentence_count: 1
    key_terms: [roadmap, recommendations, tech-audit, strategy, gap, efficiency, engagement, experiment]
    concepts: [roadmap, recommendations, tech-audit, strategy, efficiency]
    section: Universal content glyphs
    token_count: 512
  - id: "design-system/icon-library.md#c4"
    char_span: [5758, 7793]
    sentence_count: 1
    key_terms: [tech-audit, service-blueprint, operatingnetwork, journey, tech-arch, recommendations, accountability, strategy]
    concepts: [tech-audit, service-blueprint, operatingnetwork, journey, tech-arch]
    section: Universal content glyphs
    token_count: 478
  - id: "design-system/icon-library.md#c5"
    char_span: [7825, 9275]
    sentence_count: 1
    key_terms: [financial-services, synonyms, advancement, ai-industry, creative-ai, fintech, suits, usage]
    concepts: [financial-services, synonyms, advancement, ai-industry, creative-ai]
    section: Industry signature glyphs
    token_count: 450
  - id: "design-system/icon-library.md#c6"
    char_span: [9277, 10876]
    sentence_count: 1
    key_terms: [synonyms, suits, usage, government, healthcare, higher-ed, insurance, workforce]
    concepts: [synonyms, government, healthcare, suits, usage]
    section: Industry signature glyphs
    token_count: 489
---
# Icon Library (the ICONOGRAPHIC branch)

Deterministic, token-pure glyphs. Runtime authority `services/iconLibrary.ts`; Figma canon on the
Icons page (796:2). Colour resolves from the brand token mirror at render (never a hardcoded hex).
The id is the tokenized reference a hashtag prompt emits (`icon:<id>` or a diagram `viz.icons[]`).

Total: 104 glyphs (70 universal content + 34 industry across 11 industries). Each row carries CONTEXT: usage (when to use) + suits (apt artifacts/diagrams) + synonyms.

## Universal content glyphs

| id | usage | suits | synonyms |
|---|---|---|---|
| `risk` |  |  | risk, threat, exposure, vulnerability, hazard, warning |
| `opportunity` |  |  | opportunity, unlock, potential, access, key |
| `growth` |  |  | growth, expand, increase, momentum, scale-up |
| `governance` |  |  | governance, oversight, balance, fairness, control |
| `compliance` |  |  | compliance, regulation, standard, policy, checklist, audit |
| `data` |  |  | data, dataset, database, records, storage |
| `insight` |  |  | insight, finding, signal, discovery, spark, pattern |
| `workflow` |  |  | workflow, process, flow, sequence, orchestration |
| `automation` |  |  | automation, automate, agentic, engine, gear |
| `integration` |  |  | integration, connect, interoperate, api, link |
| `people` |  |  | people, stakeholders, users, audience, population |
| `team` |  |  | team, squad, group, collaboration, pod |
| `customer` |  |  | customer, client, member, patient, persona, service |
| `time` |  |  | time, duration, speed, latency, clock, when |
| `roadmap` |  |  | roadmap, horizon, journey, path, plan |
| `milestone` |  |  | milestone, deliverable, launch, release, flag |
| `target` |  |  | target, goal, objective, kpi, metric, aim |
| `decision` |  |  | decision, choice, gate, branch, evaluate |
| `alert` |  |  | alert, warning, incident, escalation, notify, bell |
| `cost` |  |  | cost, spend, budget, price, revenue, money, coin |
| `value` |  |  | value, benefit, worth, premium, gem |
| `security` |  |  | security, protect, safeguard, privacy, trust, shield |
| `channel` |  |  | channel, broadcast, reach, distribution, signal-out |
| `network` |  |  | network, ecosystem, graph, mesh, connections |
| `document` |  |  | document, report, brief, paper, file |
| `search` |  |  | search, discover, find, explore, research |
| `ai` |  |  | ai, model, ml, llm, intelligence, chip |
| `feedback` |  |  | feedback, loop, iterate, retrospective, cycle |
| `scale` |  |  | scale, tier, layers, stack, foundation |
| `churn` | a customer/segment leaving or attriting | journey, funnelFlow, gap, recommendations | churn, attrition, leaving, drop-off, lost |
| `retention` | holding/keeping customers over time | journey, roadmap, strategy | retention, keep, hold, anchor, stickiness |
| `acquisition` | attracting/acquiring new customers or leads | funnelFlow, strategy, competitive | acquisition, attract, inbound, magnet, capture |
| `conversion` | turning prospects into outcomes (two-into-one) | funnelFlow, journey | conversion, convert, merge, funnel-out |
| `funnel` | a narrowing pipeline / stage progression | funnelFlow, journey, recommendations | funnel, pipeline, narrowing, stages |
| `segmentation` | dividing an audience/market into segments | personas, competitive, comparisonMatrix | segmentation, segments, cohorts, grid, split |
| `personalization` | individually tailored experience | personas, journey, recommendations | personalization, tailored, individual, bespoke |
| `loyalty` | loyal/advocate customers; rewards | journey, personas, strategy | loyalty, reward, medal, advocacy, devotion |
| `satisfaction` | customer satisfaction / positive sentiment | journey, gap, recommendations | satisfaction, csat, happy, delight, smile |
| `sentiment` | voice-of-customer / expressed sentiment | themes, personas, journey | sentiment, voice, opinion, feedback-voice, tone |
| `adoption` | adoption / uptake over time (S-curve) | roadmap, strategy, journeyLine | adoption, uptake, usage-curve, rollout |
| `engagement` | active engagement / interaction | journey, recommendations | engagement, interaction, tap, active |
| `onboarding` | onboarding / entry into a product | journey, prd, roadmap | onboarding, enter, welcome, setup, first-run |
| `resolution` | an issue resolved / closed | journey, tech-audit, gap | resolution, resolved, solved, closed |
| `backlog` | a backlog / queue of work | prd, roadmap, tech-audit | backlog, queue, todo, workload |
| `throughput` | volume flowing through a system | operatingNetwork, flowSchematic, tech-arch | throughput, flow-rate, volume, processed |
| `capacity` | capacity / utilization level | tech-audit, tech-arch, instrumentDial | capacity, utilization, load, fill |
| `efficiency` | efficiency / performance gain | recommendations, tech-audit, strategy | efficiency, speed, fast, performance, energy |
| `benchmark` | measuring against a benchmark/standard | competitive, gap, comparisonMatrix | benchmark, comparison, standard, bar-mark |
| `forecast` | projecting a future trajectory | roadmap, strategy, timelineGantt | forecast, projection, outlook, predict-ahead |
| `trend` | a rising trend / trajectory | themes, strategy, dataField | trend, growth-line, trajectory, rising |
| `experiment` | an experiment / A-B test | prd, roadmap, recommendations | experiment, test, ab-test, trial, lab |
| `hypothesis` | an open question / assumption to test | gap, recommendations, themes | hypothesis, question, assumption, unknown |
| `prototype` | a prototype / wireframe | prd, proto, roadmap | prototype, wireframe, mockup, draft-ui |
| `priority` | high priority / ranking up | recommendations, roadmap, gap | priority, rank, top, escalate-up, important |
| `dependency` | one item depending on another | roadmap, tech-arch, flowSchematic | dependency, depends-on, prerequisite, linked |
| `blocker` | a blocker / impediment | roadmap, tech-audit, gap | blocker, blocked, stop, impediment |
| `handoff` | a handoff between people/teams | journey, service-blueprint, operatingNetwork | handoff, transfer, pass, relay |
| `consent` | consent / opt-in / permission | journey, prd, tech-audit | consent, opt-in, permission, agree |
| `privacy` | privacy / data hidden from view | tech-audit, tech-arch, gap | privacy, hidden, confidential, masked |
| `transparency` | transparency / visibility | governance, tech-audit, strategy | transparency, visibility, open, observe, eye |
| `accountability` | clear ownership / accountability | operatingNetwork, org, service-blueprint | accountability, ownership, responsible, raci |
| `sustainability` | sustainable / long-term / green | strategy, roadmap | sustainability, green, leaf, long-term, renewable |
| `partnership` | a partnership / alliance / overlap | competitive, strategy, operatingNetwork | partnership, alliance, overlap, joint |
| `contract` | a contract / signed agreement | journey, prd, recommendations | contract, agreement, signed, terms |
| `sla` | an SLA / time commitment guarantee | tech-audit, service-blueprint, recommendations | sla, guarantee, uptime, commitment |
| `incident` | an incident / outage event | tech-audit, tech-arch, gap | incident, outage, failure, event |
| `monitoring` | monitoring / observability | tech-audit, tech-arch, operatingNetwork | monitoring, observability, radar, watch, scan |
| `migration` | migrating between systems | tech-arch, tech-audit, roadmap | migration, move, transfer-system, replatform |
| `campaign` | a marketing campaign / announcement | strategy, recommendations, journey | campaign, announce, megaphone, promote, reach |
| `touchpoint` | a touchpoint / moment on a journey | journey, service-blueprint, journeyLine | touchpoint, moment, contact-point, interaction-node |

## Industry signature glyphs

### advancement

| id | usage | suits | synonyms |
|---|---|---|---|
| `advancement:gift` |  |  | gift, donation, giving, present |
| `advancement:heart` |  |  | philanthropy, donor-love, support, heart |
| `advancement:pledge` |  |  | pledge, award, recognition, ribbon |

### ai-industry

| id | usage | suits | synonyms |
|---|---|---|---|
| `ai-industry:robot` |  |  | agent, assistant, bot, autonomous |
| `ai-industry:pipeline` |  |  | pipeline, inference, chain, stages |
| `ai-industry:model` |  |  | model, weights, architecture, foundation-model |

### creative-ai

| id | usage | suits | synonyms |
|---|---|---|---|
| `creative-ai:brush` |  |  | design, creative, brush, craft |
| `creative-ai:render` |  |  | render, image, generation, output |
| `creative-ai:asset` |  |  | asset, layers, library, composition |

### financial-services

| id | usage | suits | synonyms |
|---|---|---|---|
| `financial-services:bank` |  |  | bank, institution, branch |
| `financial-services:vault` |  |  | vault, reserves, safe, custody |
| `financial-services:portfolio` |  |  | portfolio, advisory, wealth, briefcase |

### fintech

| id | usage | suits | synonyms |
|---|---|---|---|
| `fintech:ledger` |  |  | ledger, accounts, bookkeeping, statement |
| `fintech:coin` |  |  | coin, token, currency, asset |
| `fintech:card` |  |  | card, payment, rails, checkout |
| `fintech:fraud` |  |  | fraud, risk-shield, block, protection |

### government

| id | usage | suits | synonyms |
|---|---|---|---|
| `government:institution` |  |  | government, public-sector, agency, capitol |
| `government:citizen` |  |  | citizen, constituent, resident, public |
| `government:service` |  |  | public-service, form, application, process |

### healthcare

| id | usage | suits | synonyms |
|---|---|---|---|
| `healthcare:heartbeat` |  |  | vitals, monitoring, patient-health, pulse |
| `healthcare:pill` |  |  | medication, pharma, treatment, dose |
| `healthcare:care` |  |  | care, clinic, medical, cross |

### higher-ed

| id | usage | suits | synonyms |
|---|---|---|---|
| `higher-ed:cap` |  |  | graduation, degree, academic, mortarboard |
| `higher-ed:book` |  |  | book, curriculum, learning, study |
| `higher-ed:campus` |  |  | campus, university, institution, building |

### insurance

| id | usage | suits | synonyms |
|---|---|---|---|
| `insurance:umbrella` |  |  | coverage, protection, umbrella, cover |
| `insurance:policy` |  |  | policy, contract, terms, claim-doc |
| `insurance:claim` |  |  | claim, approved, shield-check, settlement |

### retail

| id | usage | suits | synonyms |
|---|---|---|---|
| `retail:cart` |  |  | cart, basket, purchase, checkout |
| `retail:tag` |  |  | tag, price, sku, promotion |
| `retail:store` |  |  | store, storefront, shop, outlet |

### workforce

| id | usage | suits | synonyms |
|---|---|---|---|
| `workforce:org` |  |  | org, hierarchy, structure, reporting |
| `workforce:badge` |  |  | badge, employee, identity, role |
| `workforce:skill` |  |  | skill, capability, competency, rating |
