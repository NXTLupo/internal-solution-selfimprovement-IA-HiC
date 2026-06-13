---
id: methodologies/analytical-lenses.md
title: "Analytical Lens Framework"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [analyticalLensService.ts]
confidence: high
status: active
tags: [analytical-lenses, domain-specialization, persona-extensions, journey-stages]
evidence_count: 0
chunks:
  - id: "methodologies/analytical-lenses.md#c0"
    char_span: [0, 567]
    sentence_count: 4
    key_terms: [lens, analytical, persona, analyticallensservice, domain-specific, configurations, recommendation, instruction]
    token_count: 94
  - id: "methodologies/analytical-lenses.md#c1"
    char_span: [598, 1584]
    sentence_count: 6
    key_terms: [fields, extension, domain-specific, journey, persona, prompt, stages, specialized]
    section: How Lenses Shape Analysis
    token_count: 180
  - id: "methodologies/analytical-lenses.md#c2"
    char_span: [1618, 2101]
    sentence_count: 4
    key_terms: [persona, none, domain-specific, recommendations, consideration, constraints, exploratory, specialized]
    section: "Lens 1: General CX Research"
    token_count: 93
  - id: "methodologies/analytical-lenses.md#c3"
    char_span: [2141, 3419]
    sentence_count: 1
    key_terms: [stewardship, donor, engagement, prospect, select, solicitation, acquisition, cultivation]
    section: "Lens 2: Fundraising & Advancement"
    token_count: 274
  - id: "methodologies/analytical-lenses.md#c4"
    char_span: [3462, 4577]
    sentence_count: 1
    key_terms: [learning, experiential, career, free-form, readiness, academic, student, development]
    section: "Lens 3: Student & Learner Experience"
    token_count: 225
  - id: "methodologies/analytical-lenses.md#c5"
    char_span: [4616, 5663]
    sentence_count: 1
    key_terms: [accessibility, integration, onboarding, usage, adoption, feature, mobile, performance]
    section: "Lens 4: Digital Product & Mobile"
    token_count: 217
  - id: "methodologies/analytical-lenses.md#c6"
    char_span: [5699, 6755]
    sentence_count: 1
    key_terms: [management, adoption, change, system, integration, user, department, governance]
    section: "Lens 5: Enterprise Technology"
    token_count: 218
  - id: "methodologies/analytical-lenses.md#c7"
    char_span: [6786, 7272]
    sentence_count: 4
    key_terms: [phase, user-defined, extensions, research, domains, journey, persona, stages]
    section: "Lens 6: Custom Framework"
    token_count: 103
  - id: "methodologies/analytical-lenses.md#c8"
    char_span: [7300, 7988]
    sentence_count: 5
    key_terms: [returns, lens, extension, getlenspersonaextensions, journey, persona, fields, prompt]
    section: Service API Functions
    token_count: 128
  - id: "methodologies/analytical-lenses.md#c9"
    char_span: [8032, 8837]
    sentence_count: 1
    key_terms: [lens, categories, generation, persona, stage, theme, domain-appropriate, domain-specific]
    section: Lens Propagation Through the Pipeline
    token_count: 143
  - id: "methodologies/analytical-lenses.md#c10"
    char_span: [8866, 9274]
    sentence_count: 1
    key_terms: [wiki, frameworks, evidence, lens, cross-references, domain-specific, research-fabric, methodologies]
    section: Wiki Integration Rules
    token_count: 95
---
# Analytical Lens Framework

Analytical lenses are domain-specific configurations that shape how the entire research pipeline operates. A lens controls three dimensions: which persona extension fields are collected, what journey stages structure the experience map, and what specialized prompt segment is injected into every AI system instruction. Selecting a lens before analysis begins ensures that theme extraction, persona synthesis, and recommendation generation all operate within the correct domain vocabulary.

Source: `services/analyticalLensService.ts`

---

## How Lenses Shape Analysis

Each lens configures three mechanisms that propagate through the entire pipeline.

### Persona Extension Fields

Standard persona fields (name, role, bio, quote, pain points, motivations) are present in every lens. Extension fields add domain-specific attributes that the AI must populate. Select-type extensions constrain the AI to pick from a closed set of values, ensuring consistent segmentation across personas.

### Journey Stages

Each lens defines an ordered array of journey stages that replace the default customer experience lifecycle. These stages structure the service blueprint, journey map, and gap analysis outputs.

### Specialized Prompt Segment

A block of text injected into the system prompt via `getLensPromptSegment()`. This tells the AI what domain-specific entities to extract, what theme categories to organize around, and what persona extension fields to populate. Lenses without a specialized prompt segment (general_cx, custom) rely on default prompts.

---

## Lens 1: General CX Research

**ID**: `general_cx`

**Journey Stages**: Awareness -> Consideration -> Decision -> Onboarding -> Usage -> Advocacy

**Persona Extensions**: None

**Specialized Prompt**: None

The default lens. Applies a standard customer experience lifecycle with no domain-specific constraints. Suitable for exploratory research where the domain is not yet known or spans multiple domains. Theme extraction, persona synthesis, and recommendations operate with the platform's built-in prompts.

---

## Lens 2: Fundraising & Advancement

**ID**: `fundraising_advancement`

**Journey Stages**: Awareness -> Engagement -> Cultivation -> Solicitation -> Stewardship -> Renewal

**Persona Extensions** (5 fields):

| Field Key | Label | Type | Options |
|---|---|---|---|
| givingCapacity | Giving Capacity | select | Annual (<$1K), Leadership ($1K-$25K), Major ($25K-$100K), Principal ($100K+) |
| engagementTier | Engagement Tier | select | Prospect, Annual Donor, Leadership Donor, Major Gift Prospect, Principal Gift Prospect |
| affinityAreas | Affinity Areas | text | free-form |
| lifecycleStage | Lifecycle Stage | select | Acquisition, Cultivation, Solicitation, Stewardship, Renewal, Lapsed |
| preferredChannels | Preferred Channels | text | free-form |

**Specialized Prompt**: Instructs the AI to extract all mentions of giving amounts, donor segments, campaigns, alumni engagement, CRM/Salesforce references, wealth indicators, gift officers, and stewardship activities.

**Required Theme Categories**: Donor Acquisition, Donor Retention, Stewardship Quality, Data Infrastructure, Channel Strategy, Personalization, Pipeline Progression.

**Use When**: Higher education advancement offices, nonprofit fundraising teams, development organizations analyzing donor behavior and stewardship effectiveness.

---

## Lens 3: Student & Learner Experience

**ID**: `student_learner`

**Journey Stages**: Application -> Orientation -> Coursework -> Experiential Prep -> Experiential Learning -> Career Transition -> Alumni

**Persona Extensions** (4 fields):

| Field Key | Label | Type | Options |
|---|---|---|---|
| academicProgram | Academic Program | text | free-form |
| readinessLevel | Readiness Level | select | Exploring, Developing, Prepared, Experienced |
| skillProfile | Key Skills | text | free-form |
| experientialLearning | Experiential Learning | text | free-form |

**Specialized Prompt**: Instructs the AI to extract all mentions of academic programs, co-op and internship experiences, skill development, career readiness indicators, advising interactions, student organizations, learning outcomes, and competency frameworks.

**Required Theme Categories**: Academic Experience, Career Readiness, Skills Development, Experiential Learning, Student Support, Technology in Learning.

**Use When**: Universities, colleges, and learning platforms analyzing student success pathways, experiential learning outcomes, and career transition effectiveness.

---

## Lens 4: Digital Product & Mobile

**ID**: `digital_product`

**Journey Stages**: Discovery -> Onboarding -> Core Usage -> Advanced Usage -> Integration -> Advocacy/Churn

**Persona Extensions** (4 fields):

| Field Key | Label | Type | Options |
|---|---|---|---|
| techProficiency | Tech Proficiency | select | Novice, Intermediate, Advanced, Expert |
| deviceMix | Primary Devices | text | free-form |
| usageFrequency | Usage Frequency | select | Daily, Weekly, Monthly, Occasional |
| accessibilityNeeds | Accessibility Needs | text | free-form |

**Specialized Prompt**: Instructs the AI to extract all mentions of app usage patterns, feature adoption rates, onboarding friction points, mobile vs desktop behavior, performance complaints, accessibility issues, and integration with other tools.

**Required Theme Categories**: Discovery, Onboarding, Core Value, Feature Adoption, Mobile Experience, Accessibility, Performance, Integration.

**Use When**: Product teams, UX researchers, and mobile app developers analyzing user adoption, retention, and feature engagement.

---

## Lens 5: Enterprise Technology

**ID**: `enterprise_technology`

**Journey Stages**: Evaluate -> Procure -> Implement -> Adopt -> Optimize -> Sunset/Migrate

**Persona Extensions** (4 fields):

| Field Key | Label | Type | Options |
|---|---|---|---|
| department | Department | text | free-form |
| systemRole | System Role | select | End User, Power User, Admin, Decision Maker |
| systemAccess | Systems Used | text | free-form |
| painTolerance | Change Tolerance | select | Low, Medium, High |

**Specialized Prompt**: Instructs the AI to extract all mentions of systems, platforms, vendors, integrations, data flows, governance policies, security requirements, compliance mandates, change management processes, adoption rates, and training needs.

**Required Theme Categories**: Data Infrastructure, System Integration, User Adoption, Governance, Security, Vendor Management, Change Management, Scalability.

**Use When**: IT leaders, enterprise architects, and digital transformation teams analyzing technology ecosystems, adoption barriers, and system integration challenges.

---

## Lens 6: Custom Framework

**ID**: `custom`

**Journey Stages**: Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5

**Persona Extensions**: None (user-defined)

**Specialized Prompt**: None

The extensible lens for user-defined domains. Provides generic phase labels and no preset persona extensions. Users can modify the journey stages and add domain context through their research goal description and manual feedback at checkpoints. Intended for research domains not covered by the five built-in lenses.

---

## Service API Functions

### getLensPromptSegment(lens)

Returns the specialized prompt segment for injection into AI system instructions. Returns empty string for general_cx and custom. Prefixed with two newlines for clean concatenation with the base system prompt.

### getLensPersonaExtensions(lens)

Returns the array of persona extension field definitions. Used to include extension fields in persona generation prompts, validate AI output, and render fields in the checkpoint UI.

### getLensJourneyStages(lens)

Returns the ordered array of journey stage labels. Used to structure service blueprint swim lanes, journey map touchpoints, gap analysis comparisons, and experience timeline visualizations.

---

## Lens Propagation Through the Pipeline

The analytical lens propagates to every downstream component:

- **Research Fabric**: query refinement uses the lens to generate domain-appropriate search terms
- **Theme Extraction**: the specialized prompt segment constrains which theme categories the AI organizes around
- **Persona Synthesis**: extension fields are added to the persona schema and enforced in output
- **Journey Mapping**: stage labels replace the default lifecycle
- **Recommendation Generation**: recommendations are framed within the domain vocabulary
- **Presentation Generation**: deck structure and slide narratives use domain-specific framing
- **Gap Analysis**: assesses current vs desired state using lens-specific categories

Changing the lens mid-session requires regenerating all outputs from the THEMES stage onward.

---

## Wiki Integration Rules

- Check for wiki/industries/[lens-id].md when a lens is selected
- If an industry page exists, load it as additional generation context
- If missing, create after research run with domain-specific insights
- Tag evidence with lens ID in wiki/evidence/ pages
- Cross-lens patterns filed in wiki/synthesis/

Cross-references: [[methodologies/research-fabric]], [[frameworks/personas]], [[frameworks/blueprint]]
