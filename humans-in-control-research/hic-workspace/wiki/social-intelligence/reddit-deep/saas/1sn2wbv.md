---
id: social-intelligence/reddit-deep/saas/1sn2wbv.md
url: "https://www.reddit.com/r/SaaS/comments/1sn2wbv/i_killed_my_180k_arr_voice_ai_startup_to_build_an/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "I killed my $180K ARR voice AI startup to build an AI coworker in Slack"
author: "abhicrysis"
date: "2026-04-16T13:02:22.000Z"
score: 0
upvote_ratio: 0.38
num_comments: 62
flair: "B2B SaaS"
extracted_at: "2026-06-14T15:28:21.910Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1sn2wbv.md#c0"
    char_span: [0, 2178]
    sentence_count: 26
    key_terms: [enterprise, slack, hard, actions, sales, voice, credentials, assistant]
    concepts: [enterprise, slack, actions, credentials, sales]
    token_count: 512
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1sn2wbv/i_killed_my_180k_arr_voice_ai_startup_to_build_an/"}]
  - id: "social-intelligence/reddit-deep/saas/1sn2wbv.md#c1"
    char_span: [2192, 3237]
    sentence_count: 6
    key_terms: [year, google, credentials, ycombinator, last, something, comments, "wouldn't"]
    concepts: [google, credentials, ycombinator, something, comments]
    related_chunks: ["social-intelligence/reddit-deep/saas/1sn2wbv.md#c4"]
    section: Comments
    token_count: 262
  - id: "social-intelligence/reddit-deep/saas/1sn2wbv.md#c2"
    char_span: [3241, 5439]
    sentence_count: 9
    key_terms: [data, saasyhomelessman, ceiling, finding, novelty, teams, abhicrysis, retention]
    concepts: [saasyhomelessman, ceiling, finding, novelty, abhicrysis]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/saas/1sn2wbv.md#c3"
    char_span: [5232, 5493]
    sentence_count: 3
    key_terms: [finding, new, saasyhomelessman, commando501, abhicrysis, customers, something, already]
    concepts: [finding]
    section: Comments
    token_count: 75
  - id: "social-intelligence/reddit-deep/saas/1sn2wbv.md#c4"
    char_span: [5495, 7224]
    sentence_count: 5
    key_terms: [year, google, reddit, ycombinator, away, back, comments, "wouldn't"]
    concepts: [google, reddit, ycombinator, comments, "wouldn't"]
    related_chunks: ["social-intelligence/reddit-deep/saas/1sn2wbv.md#c1"]
    section: Comments
    token_count: 436
---
# I killed my $180K ARR voice AI startup to build an AI coworker in Slack

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1sn2wbv/i_killed_my_180k_arr_voice_ai_startup_to_build_an/)
Posted by **abhicrysis** · **0↑** · **62 comments**

9 months ago I co-founded a voice AI startup for financial services.  We hit \~$180K ARR with real enterprise customers. On paper, things were working. 

In January this year. I killed it.

The honest reason: voice AI for financial services had a ceiling I couldn't see a way past. Sales cycles were 6+ months. Our biggest customer slowly started moving to Gemini Live. Not much moat left there. The market was getting commoditized.

**How this idea actually came**

We were looking to hire a founders office role to handle ops work. In parallel, I deployed OpenClaw on a VM and started using it as my personal assistant. It worked surprisingly well. I just couldn't connect it with team's tool because in Openclaw credentials live with the LLM and that was a no-go.

My co-founder, who is non-technical, asked me to set it up for him as well. That's when it clicked. I can build an AI teammate instead of a personal assistant that the whole team could use.

That's [PulseCrew](https://pulsecrew.ai). AI coworker that lives in Slack, connects to your team's tools (Hubspot, Linear, Jira, Sentry, Stripe, Drive, Google Ads, etc), and proactively helps move work forward. 

**A few things I got right**

* AI agent lives in a secure sandbox for each workspace.
* LLM never sees the credentials. They get injected through a proxy when the actions are executed.
* Approval gates on write actions. All write actions need a human approval right in Slack.

**A few things I've learned the hard way**

I thought this would be easier after enterprise sales. It's not. It's equally hard, just hard in different ways. Finding the first 10 teams that actively use Slack and can give you real feedback has been hard. Enterprise sales had long cycles but most of the times I knew whom to reach out. This has shorter cycle but I have no idea where to start.

Happy to answer anything about the pivot, the architecture, or anything else.

## Comments

- **sierra_whiskey1** (13↑): I’ll take something that didn’t happen for 500
  - **abhicrysis** (1↑): Didn't want to address this but looks like a lot of people think this.  
  
Posted this last year when I was closing first deal - [https://www.reddit.com/r/ycombinator/comments/1j7t85i/help\_with\_b2b\_sales\_process/](https://www.reddit.com/r/ycombinator/comments/1j7t85i/help_with_b2b_sales_process/)

If I'm building something for last 1 year, I would have taken it to some value, right? I worked at Google before starting up. Wouldn't I go back to Google if things were not working at all in last 1 year (btw you can boomerang back to Google within a year without an interview, someone who has not worked there wouldn't know this).
- **kumard3** (2↑): The credential isolation architecture you described is the right call. Letting the LLM see raw credentials directly is a common early mistake that becomes a serious problem at scale. The proxy injection approach also makes it easier to rotate credentials without touching the agent logic.



On finding the first 10 teams: the "we have no idea where to start" problem usually gets solved faster by going narrow. Pick one Slack-heavy team type (eng teams at early-stage startups, for example), find three of them through mutual connections or specific communities, and do a high-touch onboarding. The feedback from those three will tell you more than 50 cold signups.
- **SandboxIsProduction** (1↑): walking away from 180k arr takes conviction, respect for that. the voice ai ceiling in financial services makes sense tho, compliance alone would eat your margins forever. curious about the slack play though, how are you thinking about retention when the novelty wears off? every slack bot i've seen has the same adoption curve, spikes then flatlines
  - **Founder-Awesome** (1↑): retention dies bc most bots are just novelty wrappers. if the agent is pulling from notion or jira to solve actual context gaps, it stays sticky bc it saves real time. utility > novelty
- **VisualPerfect1165** (1↑): Respect the pivot. A lot of founders keep ARR alive too long even when the ceiling is obvious. Knowing when to leave a decent business can be harder than starting one.
- **Emotional_Year_3851** (1↑): Happy for you, Its a bold decision but if it was due to margins or ceiling, a good decision indeed, however I m curious about. how would you handle the privacy aspect of data, When your model is processing data, you must be actively storing it somewhere to retain context, you may violate data locality laws or if your model is deployed in a environment with remote people sharing data, from EU, USA, Middle East. you will have to implement all of the data regularity laws/ AI Acts and much more, How are you handling all that ?
  - **abhicrysis** (1↑): That's a problem for later when we integrate with Enterprises with teams across continents. Today, everythin stays in US. Need to reach PMF first then we will solve for data locality.
- **SaasyHomelessMan** (1↑): Why not just try and sell it
  - **abhicrysis** (1↑): Already tried that. Finding a buyer is actually harder than finding new customers.
    - **SaasyHomelessMan** (1↑): Dang
- **Commando501** (1↑): I see what you did. You made something up JUST to promote your brand new product. 

Have to make people believe you know what you're doing by making a moderate amount from a fake product. 

Have to show people you're a risk taker by throwing said product away and diving into a brand new venture.
  - **abhicrysis** (0↑): Oh that's true, I also went back in reddit history to post this 1 year ago when I was closing the first deal - [https://www.reddit.com/r/ycombinator/comments/1j7t85i/help\_with\_b2b\_sales\_process/](https://www.reddit.com/r/ycombinator/comments/1j7t85i/help_with_b2b_sales_process/)

If I'm building something for last 1 year, I would have taken it to some value, right? I worked at Google before starting up. Wouldn't I go back to Google if things were not working at all in last 1 year (btw you can boomerang back to Google within a year without an interview, someone who has not worked there wouldn't know this).
- **Founder-Awesome** (1↑): bold move walking away from that ARR, but the logic on the compliance ceiling is spot on. we’re seeing the same thing with runbear. the real moat isn't the LLM; it's the depth of the integration graph and the trust of living in the slack thread. \n\nquick question: how are you handling the 'long tail' of tools? we found that even 'standard' ops teams have 1 or 2 obscure legacy apps that kill the workflow if the agent can't touch them.
- **ViewSmart2007** (1↑): sounds like a tough but interesting pivot. honestly this kinda stuff is always harder than it looks but super rewarding when it works out. been working on babyloveegrowth which is seo related so yeah
- **enablingWithTech** (1↑): Walking away from $180k ARR isn’t easy but makes sense if you saw the ceiling early.  
Curious how are you trying to get those first 10 teams right now?
