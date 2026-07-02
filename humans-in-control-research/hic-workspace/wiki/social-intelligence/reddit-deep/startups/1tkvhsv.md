---
id: social-intelligence/reddit-deep/startups/1tkvhsv.md
url: "https://www.reddit.com/r/startups/comments/1tkvhsv/i_will_not_promote_im_having_a_horrible_time/"
kind: "social-post"
source: "reddit-deep: r/startups"
subreddit: "startups"
title: "[I will not promote] I'm having a horrible time getting people on calls"
author: "FormExtension7920"
date: "2026-05-22T20:49:04.000Z"
score: 0
upvote_ratio: 0.45
num_comments: 35
flair: "I will not promote"
extracted_at: "2026-06-18T13:35:25.292Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/startups/1tkvhsv.md#c0"
    char_span: [0, 2005]
    sentence_count: 19
    key_terms: [people, "i'm", get, opener, trying, maybe, reliability, week]
    concepts: [people, opener, trying, reliability, maybe]
    token_count: 461
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1tkvhsv/i_will_not_promote_im_having_a_horrible_time/"}]
  - id: "social-intelligence/reddit-deep/startups/1tkvhsv.md#c1"
    char_span: [2007, 2929]
    sentence_count: 11
    key_terms: [agent, regressions, something, minutes, trying, "you've", quick, chat]
    concepts: [agent, regressions, something, minutes, trying]
    related_chunks: ["social-intelligence/reddit-deep/startups/1tkvhsv.md#c2", "social-intelligence/reddit-deep/startups/1tkvhsv.md#c3"]
    token_count: 209
  - id: "social-intelligence/reddit-deep/startups/1tkvhsv.md#c2"
    char_span: [2943, 4711]
    sentence_count: 9
    key_terms: [something, failure, agent, reliability, did, anything, business, probably]
    concepts: [something, failure, reliability, agent, anything]
    related_chunks: ["social-intelligence/reddit-deep/startups/1tkvhsv.md#c1"]
    section: Comments
    token_count: 410
  - id: "social-intelligence/reddit-deep/startups/1tkvhsv.md#c3"
    char_span: [4713, 6701]
    sentence_count: 8
    key_terms: [something, linkedin, trying, ask, cold, messages, outreach, events]
    concepts: [something, linkedin, trying, messages, outreach]
    related_chunks: ["social-intelligence/reddit-deep/startups/1tkvhsv.md#c1"]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/startups/1tkvhsv.md#c4"
    char_span: [6704, 7626]
    sentence_count: 8
    key_terms: [like, probably, problem, asking, sounds, u22024, cute-individual4472, solve]
    concepts: [probably, problem, asking, sounds, u22024]
    section: Comments
    token_count: 233
---
# [I will not promote] I'm having a horrible time getting people on calls

Source: [reddit-deep: r/startups](https://www.reddit.com/r/startups/comments/1tkvhsv/i_will_not_promote_im_having_a_horrible_time/)
Posted by **FormExtension7920** · **0↑** · **35 comments**

I'm building in the agentic AI reliability space (runtime stuff, catching weird behavior in prod before it spirals) and I've been trying to do customer discovery for months. Not selling, not pitching, literally just trying to get 20 minutes on a call to ask people what breaks when their agents break in production and I cannot get people to talk to me.

I'm doing \~30 LinkedIn DMs a week, CTO to CTO (or head of engineering), no pitch in the opener, just curiosity. Stuff like "saw you're shipping agents in prod, would love to hear what your reliability story looks like." Most get ignored. The ones that do reply usually say "no thanks". I also do reddit, build in public on X, all that. The one thing that's actually worked is in person events. I went to Boulder Startup Week and got 3 real champions out of it, but obviously I can't fly to a conference every week.

My ICP isn't even loose, I'm filtering for CTOs and heads of eng at 10-200 person companies who are already interacting with my competitors. So these are people who in theory should care about this exact problem. But they still don't reply. Maybe LinkedIn is just the wrong channel for this audience. Maybe my opener is too generic even though I'm trying not to be. Maybe people who already use a competitor have no reason to entertain a stranger's DM. Honestly not sure.

So for anyone who's done customer discovery for technical or infra products, how did you actually get people to take the call? Did you filter harder upstream, use a different channel, different opener, pay them? I'm open to literally anything at this point.

Here is the first message I've been sending:

"Hey \[name\]! \[reason im messaging them\], not pitching anything, doing some research.

I'm building in the agent observability space and trying to understand how teams actually catch regressions that slip past their eval suites. From your end, are agent regressions in production something that's genuinely costing you, or more of a minor annoyance you've worked around?

Would love 20 minutes to chat just to learn from you. Worth a quick chat?

\[calendar link\]"

And if they dont respond to that, here is the follow up I send:

"

Hey \[name\], know calls are a big ask. If you've got 2 minutes, I'd take quick answers to these three over DM:

1. Last time an agent did something weird in prod, how'd you find out?
2. What are you using to monitor agent behavior right now, if anything?
3. Where do your evals fall short of catching real issues?

Just trying to get a real picture from people actually shipping this stuff. Appreciate it either way.

"

I would love ANY feedback at all, I feel very stuck.

## Comments

- **tonytidbit** (3↑): Brutal truth: It is what it is. No secret shortcuts to greater efficiency.

They know what’s up when someone ”just want to talk”, and unless there’s a very relevant carrot in front of them (or they’re at a place to be business-social) they have a negative attitude towards you from the point of your message arriving. Because you start out as a waste of time. 

20 minutes of their time is a lot just to help you do research to maybe (probably not!) at some later point (1-3 years!) have a product and a business mature enough to rely on. Especially business maturity is what they need to see. Something that doesn’t scream ”inexperienced and about to try to vibe code something that won’t fit out environment and that I/my team could build if we needed it”.
- **recmend** (3↑): for agent reliability, i would stop asking for a general discovery call and ask for one concrete incident: "did an agent create a production issue in the last 30 days, and what did you do to detect or roll it back?"  
  
if they say no, move on. if they say yes, ask for the failure path before you pitch anything. the goal is not more calls. it is finding the exact failure event people already care about.
- **BuildMoreBetter** (2↑): CTO here of a 50K MRR SaaS that I founded 9 years ago (before AI), feel free to PM me anything you want. Happy to help fellow entrepreneurs.

To reply to your post directly: your opener is probably cleaner than most, but it still asks for the expensive thing first: a 20 minute call with a stranger.

For infra buyers, I would start with one specific failure mode instead of "what is your reliability story?"

Something like: "When an agent regressed in prod, how did you first notice it, and what broke before someone caught it?"

No calendar link in the first message. If they answer that async, then ask for the call. Since events worked, I would also ask those 3 champions for one intro each rather than trying to turn cold LinkedIn into your only channel.
- **netwrks** (2↑): Yo so not sure if you're one of the 50-60 messages i receive on LinkedIn a day trying to sell me something or provide me with an opportunity, but its pretty obvious when someone is trying to sell you something or get something out of you, and so my usual response is something to the effect of "if what you would like to speak to me about leads to either an investment, or a new client acquisition, count me in, otherwise im not the right one for this."
- **MVPMM-startupmkt** (3↑): 1. in my experience, most CTOs and Heads of Eng don't spend a lot of time on linkedin and they aren't chatty (and I'm a sort of engineer)
2. your outreach sounds like a pitch to me (and I've done a lot of VOC work)
3. they may consider the answers proprietary information

Have you tried other places they may hang out? (here, hacker news, discord)

Also - are you posting on linkedin? Making useful posts and building an audience may allow you to ask the question out in the wild and get more responses than in DMs. Maybe a poll? LI is social after all.
- **I_CANT_SEE** (1↑): Do you have anyone in your network that could introduce you to CTOs/eng leaders? Warm intros for almost anything (hiring, sales, networking) works very well from what I've seen over cold messages, wonder if that's something you can try to focus on.
  - **FormExtension7920** (0↑): not really, but we've been going to in person events and that seems to be the biggest ROI but i'm wondering if i can increase the ROI for cold outreach somehow too.
- **Infamous_Sentence_67** (1↑): maybe try virtual meetups or webinars in your industry. They can offer a similar face-to-face vibe without the travel hassle.
- **n134177** (1↑): People are tired of being bombarded by AI-slop DMs...


Also that's in for THEM? You realize you're asking for their time, their attention, their expertise... while offering nothing in exchange? Why should they care?
- **Cute-Individual4472** (1↑): 30 linkedin dms a week might be too low to learn much tbh, but the bigger issue is probably the ask. “would love to hear your reliability story” sounds harmless, but it also sounds like work for them. i’d try asking for one tiny thing first, like “what’s the most annoying failure mode you’ve seen with agents in prod?” easier to answer, less like a calendar trap.
- **u22024** (1↑): I’m technically in your buyer market for this. I get this exact message ten times a week.   
Do I care about the problem? Sure.   
Do I trust that you can solve it? Probably not
  - **FormExtension7920** (1↑): what would make you trust that someone could solve your problem?
    - **u22024** (1↑): $1B+ Revenue or endorsed by AWS, Anthropic, etc
