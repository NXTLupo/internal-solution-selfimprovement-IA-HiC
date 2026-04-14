---
title: "Script Anti-Patterns"
type: anti-pattern
created: 2026-04-10
updated: 2026-04-10
sources: [HUMANS_IN_CONTROL_AGENT_INSTRUCTIONS_v2.md]
confidence: high
status: active
tags: [anti-patterns, script, quality-gates]
evidence_count: 0
---

# Script Anti-Patterns

Known failure modes in conversational script deliverables (chatbot flows, agent scripts, IVR scripts). Use as negative few-shot examples during generation to avoid common dialog design failures.

---

### AP-SCRIPT-001: Robot Voice
- **Description**: Script uses overly formal, stilted language that no human would naturally say. The tone reads like legal copy or a system notification rather than a conversation.
- **Detection Criteria**: Presence of phrases like "I would be happy to assist you with that inquiry," "Please be advised that," or "Your request has been duly noted." Reading the script aloud sounds unnatural.
- **Severity**: Major
- **Example of Mistake**: "I acknowledge your concern regarding the billing discrepancy. I shall now proceed to investigate the matter and provide you with a resolution in due course."
- **Correct Alternative**: "I can see the charge looks wrong. Let me pull up your account and figure out what happened -- this should only take a moment."
- **Root Cause**: AI defaults to formal register when generating "professional" content, conflating corporate tone with conversational quality.

### AP-SCRIPT-002: Infinite Retry Loops
- **Description**: When user input is not recognized, the script retries the same prompt indefinitely with no escalation path, maximum attempt count, or alternative resolution.
- **Detection Criteria**: A retry node that loops back to itself without a counter, timeout, or escalation branch after two to three failed attempts.
- **Severity**: Critical
- **Example of Mistake**: "I didn't understand that. Could you try again?" repeated indefinitely until the user abandons the conversation.
- **Correct Alternative**: After two failed attempts, offer a rephrased prompt with examples. After a third failure, offer transfer to a human agent or an alternative input method (e.g., "Would you like to choose from a list instead?").
- **Root Cause**: AI generates the happy path and a single error handler but does not model the state machine needed for graceful degradation.

### AP-SCRIPT-003: Identical Fallback Messages Repeated
- **Description**: Every unrecognized input receives the exact same fallback message, creating a frustrating echo effect that signals the system is not listening.
- **Detection Criteria**: The same fallback string appears in more than two locations in the script without variation.
- **Severity**: Major
- **Example of Mistake**: Three consecutive unrecognized inputs all produce: "Sorry, I didn't catch that. Can you rephrase?"
- **Correct Alternative**: Progressive fallback: First attempt rephrases the question. Second attempt offers specific options. Third attempt escalates to a human or offers a callback. Each message is distinct.
- **Root Cause**: AI generates a single fallback handler and reuses it across all error states rather than designing context-aware progressive recovery.

### AP-SCRIPT-004: Missing Slot Filling
- **Description**: The script asks for each piece of information in a rigid sequential order even when the user provides multiple data points in a single utterance.
- **Detection Criteria**: Script asks "What is your order number?" then "What is your email?" even if the user already provided both in their opening message.
- **Severity**: Major
- **Example of Mistake**: User says "I need to return order 45892, my email is jane@example.com" and the bot responds "What is your order number?"
- **Correct Alternative**: Script includes entity extraction that captures all recognized slots from any utterance, then asks only for missing information.
- **Root Cause**: AI generates dialog as a linear sequence of prompt-response pairs rather than modeling it as a slot-filling state machine.

### AP-SCRIPT-005: No Confirmation Before Actions
- **Description**: The script executes irreversible actions (cancellations, charges, data deletions) without confirming the user's intent, creating risk of costly mistakes.
- **Detection Criteria**: Any destructive or financial action triggered directly from user input without an explicit confirmation step.
- **Severity**: Critical
- **Example of Mistake**: User says "Cancel my subscription" and the bot responds "Your subscription has been cancelled" with no confirmation prompt.
- **Correct Alternative**: "I'll cancel your Premium subscription effective immediately. You'll lose access to saved playlists. Should I go ahead? (Yes / No / Tell me more)"
- **Root Cause**: AI optimizes for task completion speed and treats user utterances as unambiguous commands rather than intents that may need disambiguation.

### AP-SCRIPT-006: Dead-End Conversations
- **Description**: Certain conversation paths terminate without resolution, next steps, or a way to continue. The user is left stranded with no clear action.
- **Detection Criteria**: Any conversation node that ends without offering follow-up options, a summary of what was accomplished, or a path back to the main menu.
- **Severity**: Critical
- **Example of Mistake**: Bot says "I'm not able to process refunds for orders older than 30 days." Conversation ends. No alternative offered.
- **Correct Alternative**: "Refunds for orders older than 30 days need manager approval. I can submit a request for you, or connect you with our support team who can review your case. Which would you prefer?"
- **Root Cause**: AI generates responses to the immediate question without modeling the user's underlying goal or providing recovery paths when the direct answer is negative.

### AP-SCRIPT-007: Ignoring Context from Previous Turns
- **Description**: The script treats each turn as stateless, re-asking for information already provided or failing to reference the conversation history.
- **Detection Criteria**: Bot asks the user to repeat their name, account number, or problem description after the user already provided it earlier in the conversation.
- **Severity**: Major
- **Example of Mistake**: Turn 1: User provides order number. Turn 5: Bot asks "Can you provide your order number?" again.
- **Correct Alternative**: All extracted entities persist in conversation state and are referenced in subsequent turns. If re-confirmation is needed, the bot says "Just to confirm, this is regarding order 45892, correct?"
- **Root Cause**: AI generates each dialog turn semi-independently, and script templates often lack explicit state management documentation.

### AP-SCRIPT-008: No Persona or Tone Documentation
- **Description**: The script lacks documentation defining the conversational persona's voice, tone spectrum, vocabulary constraints, and emotional range.
- **Detection Criteria**: No header section defining persona name, tone adjectives, words to use, words to avoid, or example calibration utterances.
- **Severity**: Minor
- **Example of Mistake**: A 200-line script with no persona definition. Different sections vary between casual ("Hey there!") and corporate ("We appreciate your patience").
- **Correct Alternative**: Script opens with a persona brief: "Voice: Ava. Tone: warm, competent, concise. Register: professional-casual. Avoid: slang, jargon, exclamation marks. Emotional range: empathetic in complaint flows, energetic in onboarding flows."
- **Root Cause**: AI focuses on dialog content and neglects the meta-documentation that enables consistent implementation across development teams.

### AP-SCRIPT-009: Missing Accessibility Considerations
- **Description**: Script does not account for users with disabilities, including screen reader compatibility, cognitive load management, or alternative input methods.
- **Detection Criteria**: No mention of WCAG compliance, no consideration of message length for screen readers, no alternative to visual-only elements (carousels, images without alt text).
- **Severity**: Major
- **Example of Mistake**: A script that relies on image carousels for product selection with no text-based alternative.
- **Correct Alternative**: Every visual element has a text equivalent. Messages stay under 300 characters for screen reader clarity. The script documents keyboard navigation paths and offers numbered list alternatives to carousel interactions.
- **Root Cause**: AI generates for the assumed majority use case and does not proactively consider assistive technology constraints unless prompted.

### AP-SCRIPT-010: Assuming Single-Channel Interaction
- **Description**: Script is designed for one channel (e.g., web chat) with no consideration for how the same conversation would work on SMS, voice, or social messaging where capabilities differ.
- **Detection Criteria**: Script includes rich media elements (buttons, carousels, markdown) with no fallback for plain-text channels. No channel-specific branching documented.
- **Severity**: Minor
- **Example of Mistake**: A script using 10-button quick-reply arrays that render correctly in web chat but are unusable on SMS or voice channels.
- **Correct Alternative**: Script includes channel annotations indicating which elements degrade gracefully and provides alternative flows for constrained channels (e.g., numbered text lists for SMS instead of button arrays).
- **Root Cause**: AI generates for the richest available interface without considering the cross-channel deployment reality of modern conversational platforms.
