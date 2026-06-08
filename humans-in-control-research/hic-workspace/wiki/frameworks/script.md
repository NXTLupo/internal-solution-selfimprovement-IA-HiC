---
id: frameworks/script.md
title: "Conversational AI Script Framework Specification"
type: framework
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [script, conversation-design, rasa, grice, chatbot, voice]
evidence_count: 0
chunks:
  - id: "frameworks/script.md#c0"
    char_span: [0, 392]
    sentence_count: 3
    key_terms: [script, conversational, anti-patterns, authoritative, specification, deliverable, methodology, components]
    section: Purpose
    token_count: 64
  - id: "frameworks/script.md#c1"
    char_span: [418, 3005]
    sentence_count: 13
    key_terms: [conversation, design, business, language, system, user, persona, conversations]
    section: Canonical Framework
    token_count: 505
  - id: "frameworks/script.md#c2"
    char_span: [3007, 3841]
    sentence_count: 7
    key_terms: [violation, maxim, system, conversation, information, responses, provide, acknowledging]
    section: Canonical Framework
    token_count: 177
  - id: "frameworks/script.md#c3"
    char_span: [3881, 6036]
    sentence_count: 7
    key_terms: [intent, utterances, component, plans, suggested, greeting, training, actions]
    section: Required Components (12 Elements)
    token_count: 472
  - id: "frameworks/script.md#c4"
    char_span: [6038, 8249]
    sentence_count: 5
    key_terms: [confirmation, plan, slot, system, family, slots, explicit, required]
    section: Required Components (12 Elements)
    token_count: 509
  - id: "frameworks/script.md#c5"
    char_span: [8251, 10650]
    sentence_count: 10
    key_terms: [system, plan, escalation, context, confirmation, conversation, component, tier]
    section: Required Components (12 Elements)
    token_count: 511
  - id: "frameworks/script.md#c6"
    char_span: [10652, 13048]
    sentence_count: 6
    key_terms: [transfer, escalation, component, closing, context, number, system, confirmation]
    section: Required Components (12 Elements)
    token_count: 485
  - id: "frameworks/script.md#c7"
    char_span: [13050, 14276]
    sentence_count: 1
    key_terms: [question, persona, never, tone, completion, always, survey, level]
    section: Required Components (12 Elements)
    token_count: 275
  - id: "frameworks/script.md#c8"
    char_span: [14296, 16393]
    sentence_count: 8
    key_terms: [target, escalation, percentage, conversations, rate, definitions, threshold, resolved]
    section: Quality Gates
    token_count: 440
  - id: "frameworks/script.md#c9"
    char_span: [16413, 18448]
    sentence_count: 21
    key_terms: [information, confirmation, user, conversation, without, across, system, turn]
    section: Anti-Patterns
    token_count: 399
  - id: "frameworks/script.md#c10"
    char_span: [18478, 20464]
    sentence_count: 10
    key_terms: [conversational, define, escalation, dialogue, persona, error, flows, information]
    section: Generation Instructions
    token_count: 387
  - id: "frameworks/script.md#c11"
    char_span: [20487, 20870]
    sentence_count: 1
    key_terms: [frameworks, persona, script, brand, industry-specific, conversational, anti-patterns, communication]
    section: Cross-References
    token_count: 72
---
# Conversational AI Script Framework Specification

## Purpose

This page is the authoritative reference the AI reads before generating any conversational AI script deliverable. It codifies the canonical methodology, required components, quality gates, and anti-patterns that govern script creation. Every generated script must comply with these standards or be flagged for human review.

---

## Canonical Framework

### Google Conversation Design

Google's Conversation Design guidelines (2018, evolved through Google Assistant and Dialogflow) established the discipline of designing conversations as structured experiences rather than simple Q&A flows. Core principles:

1. **Cooperative conversation.** The system follows the same implicit rules humans follow in conversation. It does not interrogate, lecture, or monologue. It takes turns, acknowledges what the user said, and advances the conversation toward the user's goal.

2. **System persona first.** Before writing a single utterance, define the system's persona: name, personality traits, tone, vocabulary level, and relationship to the user. This persona remains consistent across every interaction, every channel, and every error state.

3. **Design for the unhappy path.** The majority of conversation design work is in error handling, disambiguation, and recovery -- not in the sunny-day scenario. A script that only handles the ideal flow is roughly 20% complete.

4. **Progressive disclosure.** Do not front-load information. Provide the minimum necessary at each turn and offer pathways to more detail. The user controls the depth.

5. **Multimodal awareness.** Design for the interaction modality (voice-only, text-only, visual+text, visual+voice). Voice scripts require shorter utterances, more confirmation, and different error recovery than text-based chat.

### Rasa CALM (Conversational AI with Language Models)

Rasa's CALM framework (2023) bridges rule-based dialogue management with LLM-powered flexibility. Key principles adopted in this framework:

1. **Flows over intents.** Design conversations as business logic flows (sequences of steps with branching conditions) rather than intent-response pairs. This prevents the "intent spaghetti" problem where adding a new intent breaks existing conversation paths.

2. **Slot filling as core mechanic.** Define the information the system needs (slots) and let the dialogue engine collect them in any order the user provides them. Do not force sequential collection when parallel collection is possible.

3. **Contextual action prediction.** At every turn, the system should predict the most likely next action based on conversation history, filled slots, and business rules -- not just the latest utterance in isolation.

4. **Graceful LLM integration.** Use language models for natural language understanding and generation, but keep business logic deterministic. The LLM handles language variability; rules handle business correctness.

### Grice's Cooperative Principle (1975)

H.P. Grice's four maxims of cooperative conversation provide the theoretical foundation for natural dialogue design:

1. **Maxim of Quantity.** Provide exactly as much information as required -- no more, no less. Violation: system responses that dump all possible information when the user asked a simple question.

2. **Maxim of Quality.** Say only what you believe to be true and can support with evidence. Violation: fabricating answers rather than acknowledging uncertainty.

3. **Maxim of Relation.** Be relevant. Every system utterance must advance the user's goal or manage the conversation state. Violation: inserting promotional content mid-flow.

4. **Maxim of Manner.** Be clear, brief, orderly, and unambiguous. Violation: jargon, passive voice, double negatives, or convoluted sentence structure in system responses.

---

## Required Components (12 Elements)

Every conversational AI script generated by the system must include all 12 components. Omitting a component requires an explicit justification in the output metadata.

### Component 1: Greeting with Suggested Actions

The opening turn sets the tone, establishes the system persona, and offers 2-4 suggested actions that help the user understand what the system can do. Design principles:

- State the system's name and purpose in one sentence
- Offer 2-4 suggested actions as quick-reply buttons or chips (not as a list in the message body)
- Never ask an open-ended question ("How can I help you?") without providing structured alternatives
- For returning users, personalize the greeting with context ("Welcome back, Sarah. Last time you were comparing Plan A and Plan B.")
- Voice channel: keep the greeting under 15 seconds of speech

**Example:**
> "Hi, I'm Aria, your benefits enrollment assistant. I can help you compare plans, check your coverage, or find a provider. What would you like to do?"
> [Compare Plans] [Check Coverage] [Find a Provider] [Something Else]

### Component 2: Intent Recognition (15-50+ Variations)

For each supported intent, document:

- **Intent name** (machine-readable, snake_case)
- **Intent description** (human-readable, one sentence)
- **Minimum 15 training utterances** for low-complexity intents
- **Minimum 30-50 training utterances** for high-complexity or ambiguous intents
- **Negative examples** (utterances that should NOT trigger this intent, to sharpen boundaries)
- **Confidence threshold** (minimum confidence score for this intent to be accepted)

Utterance variation must cover:
- Formal and informal register ("I would like to compare plans" / "show me the plans")
- Keyword-only ("plan comparison")
- Contextual ("what about the premium plans" mid-conversation)
- Misspellings and common errors ("benifits," "enrolment")
- Multilingual variants if applicable

### Component 3: Sample Utterances with Variations (10-15 per Intent)

Beyond the training set, provide 10-15 representative sample utterances per intent that demonstrate the full range of natural language variation. Organize by category:

- **Direct requests**: "Compare Plan A and Plan B"
- **Indirect requests**: "I am not sure which plan is right for me"
- **Contextual follow-ups**: "What about the deductible?"
- **Corrections**: "No, I meant the family plan"
- **Confirmations**: "Yes, that is the one"
- **Negations**: "No, go back"

### Component 4: Slot Filling Logic

For each conversational flow, define:

- **Required slots** (information the system must collect before proceeding)
- **Optional slots** (information that improves the response but is not required)
- **Slot types** (entity types: date, number, enum, free text, etc.)
- **Slot prompts** (the question the system asks to fill each slot)
- **Slot validation rules** (acceptable values, format constraints, range checks)
- **Multi-slot extraction** (when a single user utterance fills multiple slots simultaneously)
- **Slot priority order** (which slot to ask for first if multiple are missing)

**Example:**
```
Flow: compare_plans
Required slots:
  - plan_type (enum: individual, family, individual+spouse) -- "Who will be covered?"
  - coverage_priority (enum: low_premium, low_deductible, broad_network) -- "What matters most to you?"
Optional slots:
  - current_plan (text) -- "Do you have a current plan you'd like to compare against?"
  - zip_code (text, 5-digit) -- "What's your ZIP code? This helps me check provider networks."
```

### Component 5: Confirmation Dialogs (Implicit and Explicit)

Two confirmation strategies, deployed based on action severity:

**Implicit confirmation** (low-risk actions): The system echoes the understood value in its next response without explicitly asking for confirmation.
> User: "I want the family plan."
> System: "Great, looking at family plans. What matters most to you -- lower premiums, lower deductibles, or a broader provider network?"

**Explicit confirmation** (high-risk or irreversible actions): The system restates the full context and asks for explicit yes/no confirmation before proceeding.
> System: "Just to confirm -- you'd like to enroll in Family Plan B with a $2,500 deductible, effective January 1. The monthly premium is $847. Should I proceed with enrollment?"
> [Yes, enroll me] [No, let me reconsider]

Rules:
- All enrollment, cancellation, payment, and personal data changes require explicit confirmation
- Slot values collected conversationally use implicit confirmation
- Never chain more than 2 explicit confirmations in sequence (confirmation fatigue)

### Component 6: Multi-Turn Context Maintenance

Define how the system maintains context across turns:

- **Conversation memory window**: How many turns of history are retained (minimum 10 turns recommended)
- **Slot persistence**: Filled slots remain available until explicitly cleared or the session ends
- **Topic switching**: When the user changes subject mid-flow, the system acknowledges the switch and offers to return ("I can help with that. Would you like to come back to plan comparison after?")
- **Anaphora resolution**: The system resolves pronouns and references ("that one," "the first option," "the cheaper one") using conversation context
- **Session continuity**: If the user returns within a defined window, the system resumes from where they left off

### Component 7: Three-Tier Error Handling

Error handling follows a strict escalation ladder:

**Tier 1 -- Clarify (1st failure):**
The system signals it did not understand and asks the user to rephrase, providing a specific hint about what information is needed.
> "I did not quite catch that. Could you tell me which plan you are interested in? For example, you can say 'Family Plan A' or 'the one with the lowest deductible.'"

**Tier 2 -- Options (2nd failure):**
The system offers a menu of structured options to bypass the natural language input.
> "I want to make sure I get this right. Please select one of these options:"
> [Plan A - Individual] [Plan B - Family] [Plan C - HSA-Eligible] [Talk to a person]

**Tier 3 -- Escalate (3rd failure):**
The system acknowledges the difficulty and initiates a warm transfer to a human agent, passing full context.
> "It seems I am having trouble understanding your request. Let me connect you with a specialist who can help. I will share our conversation so you do not have to repeat anything."

Rules:
- Never repeat the same fallback message twice. Each tier must use distinct language.
- Never blame the user ("I didn't understand you"). Always take responsibility ("I didn't quite catch that").
- Maximum 2-3 retries before escalation. After 3 failures, escalation is mandatory.

### Component 8: Escalation Triggers

Define the conditions that trigger immediate escalation (bypassing the three-tier ladder):

- User explicitly requests a human ("talk to a person," "agent," "representative")
- Detected emotional distress (sentiment analysis signals: anger, frustration, urgency)
- Regulatory or compliance-sensitive topics (disputes, legal requests, accessibility accommodations)
- Account security events (suspected fraud, authentication failures)
- System confidence below 60-70% threshold for 2 consecutive turns
- Topics outside the system's defined scope
- High-value transactions above a defined threshold

### Component 9: Warm Transfer Protocol with Context Package

When escalation occurs, the system must execute a warm transfer, not a cold handoff. The transfer includes:

**Context package transmitted to the human agent:**
- Conversation transcript (full text of all turns)
- Identified intent and filled slots
- Customer identity (if authenticated)
- Emotional state assessment
- Number of retry attempts before escalation
- Specific reason for escalation
- Suggested resolution path (if the system has a hypothesis)

**User-facing transfer experience:**
- Acknowledge the transfer and set expectations ("I am connecting you with a specialist. This usually takes about 2 minutes.")
- Assure context continuity ("I will share our conversation so you won't need to repeat yourself.")
- If queue wait is expected, offer alternatives ("Would you prefer to wait, or would you like a callback within the hour?")

### Component 10: Closing with Accomplishment Summary

The closing turn summarizes what was accomplished and sets expectations for next steps:

- Restate the action taken or information provided
- Confirm any commitments or follow-up items
- Provide a reference number or confirmation ID where applicable
- Offer a pathway to return ("If you have more questions, I'm here anytime.")
- Do not ask "Is there anything else?" more than once

**Example:**
> "Here is a summary of what we covered: You are enrolled in Family Plan B, effective January 1, with a monthly premium of $847. Your confirmation number is ENR-2026-4847. You will receive an email with your enrollment details within 24 hours. If you need anything else, just come back and say 'check my enrollment.' Have a good day."

### Component 11: Post-Interaction Survey

Immediately after closing, offer a brief satisfaction survey:

- Maximum 2-3 questions
- First question: goal completion ("Did I help you accomplish what you came here for?" Yes/No)
- Second question: satisfaction (1-5 scale or thumbs up/down)
- Optional third question: open-text feedback
- Survey must be skippable ("No thanks" option always available)
- Never gate the conversation exit on survey completion

### Component 12: Persona and Tone Documentation

A dedicated section defining the system's conversational persona:

- **Name** and relationship framing (assistant, advisor, guide)
- **Personality traits** (3-5 adjectives with behavioral descriptions, e.g., "patient -- never rushes the user, always offers to explain further")
- **Vocabulary level** (reading grade level, jargon policy)
- **Tone spectrum**: How tone shifts across contexts:
  - Informational: clear, neutral, concise
  - Error state: empathetic, solution-oriented
  - Success: warm, congratulatory but not effusive
  - Escalation: calm, reassuring, professional
- **Forbidden patterns**: Phrases and constructions the system must never use (e.g., "As an AI, I..." or "I apologize for any inconvenience")
- **Channel-specific adaptations**: How the persona adjusts for voice vs. text vs. visual interfaces

---

## Quality Gates

| Gate | Requirement | Failure Consequence |
|------|-------------|---------------------|
| Retry limit | Maximum 2-3 retries before mandatory escalation | Fix escalation logic |
| Unique fallbacks | No fallback message appears twice in the same session | Write additional variants |
| Confidence threshold | 60-70% confidence threshold for handoff documented | Define threshold |
| KPI coverage | Goal completion, containment, recontact rate KPIs defined | Add KPI definitions |
| Utterance volume | 15+ training utterances per intent (30-50 for complex intents) | Add utterances |
| Slot completeness | All required slots have prompts, types, and validation rules | Complete slot definitions |
| Error escalation | All three tiers implemented with distinct language | Write missing tiers |
| Context package | Warm transfer includes full context (transcript, slots, emotion, reason) | Expand transfer protocol |
| Persona consistency | Tone documentation covers all emotional states | Complete persona spec |
| Confirmation strategy | Implicit vs. explicit confirmation rules defined per action type | Define strategy |

### KPI Definitions

Every script must define target values for these metrics:

- **Goal Completion Rate (GCR):** Percentage of conversations where the user's intent was resolved without escalation. Target: 70-85% depending on complexity.
- **Containment Rate:** Percentage of conversations fully resolved without human intervention. Target: 60-75%.
- **Recontact Rate:** Percentage of users who contact support again within 24-72 hours about the same issue. Target: below 15%.
- **Average Handle Time (AHT):** Average conversation duration. Benchmark against human agent AHT with a target of 40-60% reduction.
- **Customer Satisfaction (CSAT):** Post-interaction survey score. Target: 4.0+ on 5-point scale.
- **Escalation Rate:** Percentage of conversations escalated to human agents. Target: 15-30% (lower is not always better -- under-escalation means users are trapped).
- **First Contact Resolution (FCR):** Percentage resolved in first interaction. Target: 80%+.

---

## Anti-Patterns

### 1. Intent Spaghetti
Defining dozens of fine-grained intents with overlapping utterance patterns, creating a classification nightmare where adding one intent degrades accuracy across others. Instead, use broader intents with slot-based disambiguation.

### 2. The Interrogation
Asking a long sequence of questions one at a time when the user might naturally provide multiple pieces of information in a single utterance. Slot filling should extract all available information from each turn, not ignore it to follow a rigid script.

### 3. The Parrot
Repeating the user's words back verbatim without advancing the conversation. Implicit confirmation should rephrase and add value, not echo.

### 4. Infinite Loops
Error handling that cycles through the same retry logic indefinitely without escalation. Every error path must have a finite number of retries and a guaranteed exit.

### 5. The Amnesia Bot
Failing to maintain context across turns, forcing the user to re-state information they already provided. Every piece of information the user provides must persist for the duration of the session.

### 6. Personality Drift
The system persona shifts inconsistently -- formal in greetings, casual in errors, robotic in confirmations. Tone must be consistent across all conversation states, with documented and deliberate variations only.

### 7. The Over-Confirmer
Asking for explicit confirmation on every slot value and every minor action. Confirmation fatigue causes users to blindly confirm without reading, defeating the purpose. Reserve explicit confirmation for high-stakes actions.

### 8. Dead-End Responses
System responses that provide information but offer no path forward. Every system turn must either advance the flow, offer options, or close the conversation. No turn should leave the user wondering "now what?"

### 9. The Jargon Bot
Using industry or technical terminology that the user does not understand. All domain terms must be translated into plain language, with the technical term available on demand.

---

## Generation Instructions

When the AI generates conversational AI scripts using this framework:

1. **Define the persona first.** Before writing any dialogue, complete Component 12 (persona/tone documentation). All subsequent dialogue must be consistent with this persona definition.

2. **Map the flows before writing utterances.** Define all conversational flows as state machines with clear entry points, branching conditions, and exit conditions. Then populate each state with dialogue.

3. **Write the unhappy paths first.** Design error handling, edge cases, and escalation flows before polishing the happy path. The unhappy path is where most user frustration occurs.

4. **Generate utterance variations systematically.** For each intent, generate variations across formality levels, phrasing patterns, keyword density, and error types (typos, incomplete sentences, ambiguous references).

5. **Apply Grice's maxims as a checklist.** Review every system utterance against all four maxims. Is it the right amount of information? Is it true? Is it relevant? Is it clear?

6. **Validate the three-tier error ladder.** Simulate three consecutive failures at every point in the conversation and verify that the escalation ladder functions correctly with distinct language at each tier.

7. **Build the context package.** Define exactly what information passes to the human agent on escalation. Test that the package is sufficient for the agent to continue without asking the user to repeat anything.

8. **Define KPI targets.** Set specific, measurable targets for all defined KPIs. Include benchmarks from industry data or comparable implementations.

9. **Cross-reference related frameworks.** When generating scripts, check:
   - [[anti-patterns/script]] for known failure modes in conversational AI for the specific industry
   - [[frameworks/personas]] for user communication preferences, technology usage, and vocabulary level
   - [[brand/identity]] for naming conventions and brand voice alignment

---

## Cross-References

- [[anti-patterns/script]] -- Industry-specific conversational AI failure modes and remediation
- [[frameworks/personas]] -- Persona communication preferences inform script tone and vocabulary
- [[frameworks/blueprint]] -- Service blueprints define the frontstage actions that scripts must support
- [[brand/identity]] -- Brand voice standards constrain the system persona definition
