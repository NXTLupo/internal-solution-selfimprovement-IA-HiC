---
id: social-intelligence/reddit-deep/startups/1sz8y3i.md
url: "https://www.reddit.com/r/startups/comments/1sz8y3i/i_spent_3_months_convinced_i_knew_why_users_were/"
kind: "social-post"
source: "reddit-deep: r/startups"
subreddit: "startups"
title: "I spent 3 months convinced I knew why users were leaving. I was completely wrong. (I will not promote)"
author: "One-Possession7392"
date: "2026-04-29T19:26:45.000Z"
score: 16
upvote_ratio: 0.91
num_comments: 21
flair: "I will not promote"
extracted_at: "2026-07-03T00:07:52.258Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/startups/1sz8y3i.md#c0"
    char_span: [0, 2010]
    sentence_count: 32
    key_terms: [something, like, people, users, cancelled, genuinely, comments, "couldn't"]
    concepts: [something, people, users, cancelled, genuinely]
    token_count: 462
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sz8y3i/i_spent_3_months_convinced_i_knew_why_users_were/"}]
  - id: "social-intelligence/reddit-deep/startups/1sz8y3i.md#c1"
    char_span: [2012, 4473]
    sentence_count: 34
    key_terms: [never, through, onboarding, weeks, following, time, week, already]
    concepts: [never, through, onboarding, following, weeks]
    token_count: 503
  - id: "social-intelligence/reddit-deep/startups/1sz8y3i.md#c2"
    char_span: [4475, 6405]
    sentence_count: 9
    key_terms: [only-fisherman5788, cancel, interactive, data, behavior, because, problem, shorter]
    concepts: [only-fisherman5788, cancel, interactive, behavior, because]
    section: Comments
    token_count: 444
  - id: "social-intelligence/reddit-deep/startups/1sz8y3i.md#c3"
    char_span: [6407, 8862]
    sentence_count: 14
    key_terms: [already, because, "someone's", okbookkeeper3924, problem, nobody, cancellation, looks]
    concepts: [already, because, okbookkeeper3924, "someone's", problem]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/startups/1sz8y3i.md#c4"
    char_span: [8864, 9600]
    sentence_count: 5
    key_terms: [patterns, watch, like, need, oldestusername, specifically, monitorable, reconstruct]
    concepts: [patterns, watch]
    section: Comments
    token_count: 149
---
# I spent 3 months convinced I knew why users were leaving. I was completely wrong. (I will not promote)

Source: [reddit-deep: r/startups](https://www.reddit.com/r/startups/comments/1sz8y3i/i_spent_3_months_convinced_i_knew_why_users_were/)
Posted by **One-Possession7392** · **16↑** · **21 comments**

I want to share something that embarrassed me because I think a lot of people are doing the same thing and don't realize it yet.

We had a churn problem. Nothing too crazy, just slow and consistent. 8 to 12 users a month quietly cancelling. We were at around $4,200 MRR at the time so every cancellation genuinely hurt.

We did what everyone does. Set up an exit survey in Tally. Kept it short, one multiple choice question and an optional text box. The responses came back and it was almost always the same two or three things. Too expensive. Missing features. Not what I needed.

So we acted on it. Kept pricing flat. Roadmapped the features people mentioned. Felt like we were being data-driven about it. Felt like we were doing the right thing honestly.

Three months of this. Churn didn't move.

I remember sitting there staring at the same numbers thinking I was missing something obvious. Like there was an answer right in front of me and I just couldn't see it. Turns out there was.

Eventually I got frustrated enough to just start messaging people directly. Not a sequence, not a template. Just opening Notion where we tracked cancelled users, finding their email, and writing something like "hey, we saw you cancelled last month, genuinely trying to understand what happened, would you be willing to tell me?"

The first person replied within 20 minutes.

They didn't mention price once. They told me they'd gotten confused during onboarding, couldn't figure out how to do the one thing they signed up to do, tried twice, and gave up. That was it. They'd been gone for six weeks by the time I messaged them.

Six weeks. And I had no idea.

I pulled up PostHog and found their session recordings.

Watched them go through onboarding on day one. Watched them hit the exact moment they got confused. There was a UI element that we thought was obvious that apparently wasn't. Watched them click around for about 90 seconds and then close the tab. They came back two more times over the next week, both sessions under a minute, and then nothing for 30 days until the cancellation.

The exit survey said too expensive.

PostHog showed someone who never actually used the product and didn't know how to start.

We went through the same process for six more churned users over the next two weeks. Pulled their session recordings in PostHog, cross-referenced with their support history in Gmail, looked at their event data in our own logs to see which features they actually touched versus which ones they never opened.

The patterns were not subtle once we could actually see them.

Four out of seven never made it through a specific step in onboarding. Two of them had sent support emails that we'd replied to and closed without following up. One person had been a power user for six weeks, then we shipped an update to the feature they used most, and their session time dropped by 80% the following week. They cancelled three weeks later. We never connected those two events until we were sitting there manually going through the timeline.

That last one kind of messed me up a bit. We broke something for someone who actually loved the product and we didn't even notice until they were already gone.

The thing that got me was that none of this was hidden. PostHog had the recordings. Gmail had the support threads. Our own database had the event logs. We had all of it. We just never looked at it together.

Manually going through it for each user took a long time. You're jumping between tabs, trying to hold a timeline in your head, cross-referencing things that were never designed to talk to each other.

But every single time we did it, the exit survey answer was either incomplete or just wrong.

Not because people were lying. Because by the time someone fills out a cancellation survey they've already emotionally checked out and they just want to get it over with. The real story happened weeks earlier and they've already moved on.

We fixed the onboarding issue in about a week. Single UI change. Churn dropped noticeably the following month.

Three months of roadmapping features nobody actually needed. One week of watching what people actually did.

I don't think we're unique in this. I think most founders are reading exit surveys and making decisions based on data that is just fundamentally not telling them what they think it is.

## Comments

- **Only-Fisherman5788** (3↑): exit surveys give you what people will admit to themselves, not what actually pushed them. the real signal sits in their session events from the week or two before the click-cancel, where you can usually find the friction they wouldn't articulate even to a survey. nobody does this because it takes time, but it's where the real data lives.
  - **One-Possession7392** (2↑): the week or two before is exactly where we found it. not even rage clicks or errors, just sessions getting shorter and shorter until they stopped entirely. the cancel click was almost anticlimactic by that point because the decision was already long gone.
    - **Only-Fisherman5788** (1↑): DM me your site would love to look into it
    - **Only-Fisherman5788** (1↑): that's the cancellation pre-mortem most teams miss. the in-app behavior decline isn't sexy enough to get instrumented properly so you only catch it post-hoc. once we started watching for 'days since last meaningful action' instead of just last login, the cancel-prediction window jumped wide. churn isn't a cancel event, it's a slow disengagement curve that ends in cancel.
- **YoKevinTrue** (2↑): I knew it was going to come down to the fact that you just didn't "talk to them".

I suffer from the same bias.  I'm a nerd and I like data so I don't talk to users as my default behavior.

OR assume that they will fill out the form and give me the right answer.

But the problem is NOT EVEN THEY KNOW.

So you have to get on a call or email and sort of poke and prod at them to figure out what's really going on.

The key problem though is that it has to be interactive. 

You have to ask a lot of follow up questions which is why it needs to be interactive.

But yeah... Especially if you have few customers, talking to them really helps.
- **GwenFromCanery** (2↑): The gap between what users say and what they do is where all the good stuff is. Good on you though! Looks like you found the right method eventually.
- **OkBookkeeper3924** (1↑): The exit survey problem is actually worse than it looks here because the data isn't just incomplete, it's systematically skewed in a specific direction. By the time someone cancels they've already made the decision and emotionally moved on. The survey is an afterthought they fill out to get to the confirmation screen. So they pick whatever option requires the least explanation, which is almost always price or missing features, because those are simple and don't require them to articulate what actually happened weeks earlier.

What you found with the session recordings is the real story: the decision to leave happened long before the cancellation, usually at a specific moment of friction that never got flagged because nobody was looking at that level. The support email that got closed without a follow up, the feature update that broke someone's workflow, the onboarding step that quietly filtered out anyone who wasn't already familiar with how the product worked.

The uncomfortable part of what you're describing is that all of it was visible in the data the whole time. PostHog had it, Gmail had it, your own logs had it. The problem wasn't missing information, it was that nobody had built the habit of connecting those signals before a cancellation forced the question. Most teams only do the forensics after someone's already gone, which is exactly backwards.
  - **One-Possession7392** (2↑): the forensics after the fact thing is what got us. you do it once manually and the story is so clear in hindsight that it feels obvious. but doing it proactively for every user before they cancel, that's a completely different thing. the data is all there, the problem is nobody has time to sit down and reconstruct a timeline across three tools for every account that looks slightly at risk. so it only happens after someone's already gone.
    - **OkBookkeeper3924** (1↑): Yeah the hindsight clarity is almost painful because you can see exactly where it went wrong and it was fixable if you'd caught it two weeks earlier. But you're right that the proactive version of that process doesn't really exist in most teams, it's just too manual to be repeatable.

The thing that might actually help before you get to full automation is just narrowing the signal. You don't need to reconstruct a timeline for every user, you need to identify the two or three behavioral patterns that showed up in the accounts that churned and then watch for those specifically. In your case it sounds like it was something like "never completed a specific onboarding step" or "session time dropped sharply after a particular update." Those are monitorable without manually pulling three tools together for every account.

The hard part is that you only know which patterns to watch for after you've done the forensics a few times. Which is exactly the catch-22 you're describing.
- **oldestUserName** (1↑): Posthog ad
