---
id: social-intelligence/reddit-deep/customerexperience/1qwkbr7.md
url: "https://www.reddit.com/r/customerexperience/comments/1qwkbr7/how_do_you_differentiate_between_reporting_ai/"
kind: "social-post"
source: "reddit-deep: r/customerexperience"
subreddit: "customerexperience"
title: "How do you differentiate between reporting \"AI resolved\" vs \"AI deflected\", so your dashboard reflects actual customer experience?"
author: "stacktrace_wanderer"
date: "2026-02-05T12:45:31.000Z"
score: 5
upvote_ratio: 0.86
num_comments: 8
flair: ""
extracted_at: "2026-06-14T15:28:06.936Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/customerexperience/1qwkbr7.md#c0"
    char_span: [0, 885]
    sentence_count: 6
    key_terms: [customerexperience, resolved, comments, customer, ticket, bot, does, differentiate]
    token_count: 190
  - id: "social-intelligence/reddit-deep/customerexperience/1qwkbr7.md#c1"
    char_span: [900, 3289]
    sentence_count: 20
    key_terms: [resolution, resolved, intent, customer, contact, deflected, problem, silence]
    section: Comments
    token_count: 502
  - id: "social-intelligence/reddit-deep/customerexperience/1qwkbr7.md#c2"
    char_span: [3291, 4907]
    sentence_count: 16
    key_terms: [resolved, customer, did, "it's", deflected, something, depends, refund]
    section: Comments
    token_count: 360
---
# How do you differentiate between reporting "AI resolved" vs "AI deflected", so your dashboard reflects actual customer experience?

Source: [reddit-deep: r/customerexperience](https://www.reddit.com/r/customerexperience/comments/1qwkbr7/how_do_you_differentiate_between_reporting_ai/)
Posted by **stacktrace_wanderer** · **5↑** · **8 comments**

Does resolved mean if a bot responded and then the customer does not come back for 72 hours (plus ticket auto closes)? Or is silence true resolution? Do you track confirmed resolutions (refund issued, plan updated, issue corrected) or is a ticket truly done with no agent touch? What kind of predictive measurements have you used to keep yourself from vanity numbers like 2nd contact within 7 days, escalations after initial bot success, or CSAT declines on "resolved" interactions? I am attempting to unify across email, form, and chat.

## Comments

- **CryRevolutionary7536** (2↑): The cleanest distinction I’ve seen is:

AI deflected = the customer did not reach a human in that session, but the outcome is still unknown.

AI resolved = the customer’s intent was actually satisfied, with evidence beyond silence.

Silence alone is a dangerous proxy for resolution. It’s useful operationally, but it’s not an experience signal. A bot answer + 72 hours of no follow-up mostly tells you the customer gave up or moved on, not that the problem was fixed.

Teams that avoid vanity metrics usually layer signals:

Outcome-based confirmation where possible (refund issued, order changed, password reset completed, workflow executed).

Short post-interaction confirmation (“Did this solve your problem?”) with low-friction yes/no.

Behavioral validation (no repeat contact for the same intent, not just no contact at all).

A few practical guardrails that help:

Track reopen or same-intent recontact rates within 24–72 hours as a negative signal against “AI resolved.”

Watch CSAT deltas specifically on bot-only interactions vs human-assisted ones.

Separate dashboards for deflection, resolution, and containment duration instead of collapsing them into one success metric.

Once you unify email, forms, and chat, intent continuity becomes more important than channel continuity. Resolution should follow the problem, not the inbox.

If your “AI resolved” number doesn’t survive contact-rate and sentiment scrutiny, it’s probably deflection wearing a nicer label.
- **Bart_At_Tidio** (1↑): AI deflected and AI resolved need to be separated. Deflected means the bot handled the interaction without an agent stepping in. Resolved means the customer’s intent was completed, like a refund issued, plan updated, or issue fixed in the system.

Silence is a weak signal on its own. It helps, but it is not proof of success. Stronger indicators come from no repeat contact on the same intent, no delayed escalation, and stable or improving CSAT. When AI looks successful but drives follow-up escalations later, the dashboard is lying.

Across email, chat, and forms, tying resolution to an actual state change is far more reliable than time-based auto-closing.
- **SmallWinsMatter_** (1↑): Metrics we care about are:

\- first touch resolution rate

\- repeat contact within 30 days for same topic (re-open rate)

\- escalation rate after AI response.

We also track thread length, as loops tend to hide in there. If a customer asks again, that’s not resolved, even if the bot sent a “right” answer. But like others have said, it depends on your product, your risk level, and your customers.
- **SeaFollowing380** (1↑): For us it's pretty simple - did the customer come back with the same issue in the next 30 days? If not, it's resolved. If they did, something broke.  
  
Most of our 'resolved' tickets are billing questions or FAQ stuff the AI can pull from our docs. When it works the customer just moves on. When it doesn't they open another ticket and we know we have a problem - either the AI screwed up or our docs need work.
- **Guilty_Performer_497** (1↑): We've been trying a few agents, but nothing's really hit our sweetspot. Especially not at the resolution rate we're looking for. And defining 'resolved' really depends on your industry and customer needs.
- **ops_architectureset** (1↑): We once had an internal debate about this at our company and we came to the know that resolved and deflected were completely different. AI deflected means the bot has handled the entire conversation with no human interaction. AI Resolved on the other end means the actual issue was solved for example if there was a refund then that refund has been sorted regardless of whether the AI or a human did it. The 72 hour auto close rule can actually cause numbers to sky rocket. Silence can't be used to define something as resolved. Creating uniformity across channels can be tricky but it's important to map everything back to outcome and intent. This helped us a lot.
