---
id: social-intelligence/reddit-deep/startups/1tuan86.md
url: "https://www.reddit.com/r/startups/comments/1tuan86/we_stopped_trying_to_replace_support_agents_with/"
kind: "social-post"
source: "reddit-deep: r/startups"
subreddit: "startups"
title: "We stopped trying to replace support agents with AI and started analyzing support conversations instead (i will not promote)"
author: "Caitlynhjse"
date: "2026-06-02T00:13:26.000Z"
score: 0
upvote_ratio: 0.45
num_comments: 7
flair: "I will not promote"
extracted_at: "2026-06-18T13:35:25.317Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/startups/1tuan86.md#c0"
    char_span: [0, 2265]
    sentence_count: 15
    key_terms: [conversations, been, support, tickets, customer, because, started, review]
    concepts: [conversations, support, tickets, customer, because]
    related_chunks: ["social-intelligence/reddit-deep/startups/1tuan86.md#c2"]
    token_count: 469
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1tuan86/we_stopped_trying_to_replace_support_agents_with/"}]
  - id: "social-intelligence/reddit-deep/startups/1tuan86.md#c1"
    char_span: [2267, 3029]
    sentence_count: 7
    key_terms: [chatbot, analysis, support, anyone, volume, need, conversations, frustration]
    concepts: [chatbot, analysis, support, anyone, volume]
    token_count: 164
  - id: "social-intelligence/reddit-deep/startups/1tuan86.md#c2"
    char_span: [3043, 5239]
    sentence_count: 10
    key_terms: [support, n8n, chat, gpt, claude, custom, "it's", human]
    concepts: [support, claude, custom, human, customer]
    related_chunks: ["social-intelligence/reddit-deep/startups/1tuan86.md#c0"]
    section: Comments
    token_count: 502
  - id: "social-intelligence/reddit-deep/startups/1tuan86.md#c3"
    char_span: [5241, 6454]
    sentence_count: 6
    key_terms: [support, migrating-customer-query, teams, value, helpscout, analysis, already, impractical-for-people]
    concepts: [support, migrating-customer-query, teams, value, helpscout]
    section: Comments
    token_count: 253
---
# We stopped trying to replace support agents with AI and started analyzing support conversations instead (i will not promote)

Source: [reddit-deep: r/startups](https://www.reddit.com/r/startups/comments/1tuan86/we_stopped_trying_to_replace_support_agents_with/)
Posted by **Caitlynhjse** · **0↑** · **7 comments**

I run customer support at a small SaaS and we've been messing around with AI tools for about 18 months now. Wanted to share what's been working and what hasn't because honestly there's a ton of noise in this space right now and most of what vendors are pitching doesn't match what we're actually seeing.

Biggest letdown by far has been the AI chatbots that promise to resolve tickets without a human in the loop. They're fine for the boring stuff like "how do I reset my password" but the second a ticket has any real context or emotion attached, they fall apart. And the worst part is the handoff to a human, because by that point the customer has already explained their issue twice and they're pissed. We tried two different chatbot solutions this year and rolled back both after about 3 months each. Volume of easy tickets dropped, sure, but our CSAT on medium-complexity stuff dropped harder, and the net was a worse customer experience overall.

What's actually been working for us is the opposite direction. Instead of replacing humans with AI on incoming tickets, the more useful approach has been using AI to analyze conversations we've already had. There are a few tools in this category now (conversation intelligence layer, basically) that read back through closed chats and pull out patterns no human team would have time to surface manually. Recurring questions that should be in help docs, feature requests buried inside support threads, customers who sounded happy but never got asked for a review. That last one alone moved our review velocity meaningfully once we started acting on it.

The metric I've started caring about more is what percentage of resolved positive conversations actually got a review ask. CSAT tells you the mood across all your tickets, but this one tells you whether your team is acting on the good ones. Most teams I've talked to track this at zero because the category of tooling that surfaces it is new.

Real frustration with most tools in the broader support analytics space is that they still show data at the team level only. Counting handled conversations per agent is just accounting, you can't coach anyone off a global number. Per-agent quality analysis is where the actual leverage is, and most of the older vendors haven't caught up yet.

Rough rule we've landed on for company size: under 5 support people, you don't need a chatbot, you need the analysis layer. Over 50, the chatbot stuff starts being worth the friction because the volume justifies it. The middle (5 to 50) is where most teams overspend on the wrong things.

Anyone made the full no-human chatbot route work at small scale, or is that still a play that needs serious volume to make sense?

## Comments

- **FreJun** (1↑): As someone who fell for the chatbot hype early on, I can totally relate to your struggle. It's so tempting to believe that AI can replace humans in customer support, but in reality, nothing beats genuine human connections when it comes to understanding complex issues and emotions. Analyzing support conversations has been a game-changer for us too, uncovering insights we never would have found otherwise. Stay true to what works for your team, even if it goes against the latest trends.
- **Imaginary-Can6136** (1↑): I think it's possible to build something good enough to walk customers through complex processes in a platform on a consistent basis, as long as you have access to n8n, and either Chat GPT or Claude. In my experience, most of the common support platforms (zendesk, Qualified, Intercom are the ones we've tried) are mainly good for deflecting a significant percentage of the common questions.

I appreciate your feedback on what's worked!

I worked in support for a midsized software company for 4 years; the first thing I did when my company got Chat GPT was build a Custom GPT hooked up to a vector store which I keep updated with an n8n workflow. This allowed me to provide BETTER responses which included links to all relevent helpdesk sources. It turned our terrible support reps into Subject matter experts.

So there is still human in that loop; but the humans got way better, and it isn't too complicated as long as you've got n8n and either chat gpt or Claude. its easy to build-in a custom chat widget to whatever site or app you have, so it wouldn' t be hard to hook up an n8n workflow to that in order to get a custom support bot that can handle ANY question it's asked; as long as it's knowledge is kept up to date.

n8n workflows can be built easily by claude, or Chat GPT, just describe what you want, ask for a json file in return, and upload the json file.  building a custom mcp to n8n and using claude to drive lets you do A LOT.
- **sheppyrun** (0↑): the handoff is the real killer. by the time a customer reaches a human they've already explained the problem twice, and the chatbot didn't even get the tone right. that frustration sticks.

your analysis approach fits small teams better. you're learning from the conversation instead of trying to replace it. most teams track csat and stop there, but the actual value is in reviewing what your best resolved conversations actually looked like and building playbooks from them.

i haven't seen a no-human chatbot work well under about fifty people worth of volume. below that the analysis layer is just more useful per dollar.
- **matpatterson** (0↑): love all of this. Big plus one on the customer who has a bad bot experience coming in hot to the human support team already feeling unheard.

Using AI to do the impractical-for-people task of reading across all the incoming support and spotting patterns and insights is genuine value.

There is a lot of value to support teams in not being burnt out by repetitive simple tasks though. Maybe we'll see some improvements in the transition from AI to human for the best support teams. This was already a problem when migrating people from person to person across support channels too - I wrote about it [https://www.helpscout.com/helpu/migrating-customer-query/](https://www.helpscout.com/helpu/migrating-customer-query/) \- and the same ideas apply here.
