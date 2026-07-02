---
id: social-intelligence/reddit-deep/saas/1s9w1vu.md
url: "https://www.reddit.com/r/SaaS/comments/1s9w1vu/22_years_of_building_software_and_i_have_no_idea/"
kind: "social-post"
source: "reddit-deep: r/saas"
subreddit: "saas"
title: "22 Years of Building Software and I Have No Idea How to Get Users"
author: "Patrity"
date: "2026-04-01T20:16:03.000Z"
score: 12
upvote_ratio: 0.88
num_comments: 48
flair: ""
extracted_at: "2026-06-14T15:28:21.912Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c0"
    char_span: [0, 2069]
    sentence_count: 25
    key_terms: [built, product, started, told, workspace, comments, describe, cognova]
    concepts: [built, product, started, workspace, comments]
    token_count: 486
    sources: [{"n":"reddit-deep: r/saas","u":"https://www.reddit.com/r/SaaS/comments/1s9w1vu/22_years_of_building_software_and_i_have_no_idea/"}]
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c1"
    char_span: [2071, 3992]
    sentence_count: 24
    key_terms: ["i'm", "you're", developer, did, product, seriously, something, cognova]
    concepts: ["you're", developer, product, seriously, something]
    token_count: 426
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c2"
    char_span: [4006, 6087]
    sentence_count: 14
    key_terms: [users, twitter, distribution, builders, patrity, problem, anyone, like]
    concepts: [users, distribution, twitter, builders, patrity]
    section: Comments
    token_count: 461
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c3"
    char_span: [6089, 8328]
    sentence_count: 22
    key_terms: [conversations, memory, people, "that's", pain, thinking, problem, persistent]
    concepts: [conversations, memory, people, "that's", thinking]
    section: Comments
    token_count: 474
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c4"
    char_span: [8330, 10518]
    sentence_count: 15
    key_terms: [problem, completely, embarrassingly, people, conversations, distribution, real, different]
    concepts: [problem, completely, embarrassingly, conversations, distribution]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c5"
    char_span: [10520, 12721]
    sentence_count: 21
    key_terms: [users, solution, people, get, icp, describing, thomashoi2, anything]
    concepts: [users, solution, people, describing, thomashoi2]
    section: Comments
    token_count: 481
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c6"
    char_span: [12723, 15071]
    sentence_count: 39
    key_terms: [hole, people, drill, product, stories, talking, thier, commesion]
    concepts: [people, drill, product, stories, talking]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/saas/1s9w1vu.md#c7"
    char_span: [15073, 17092]
    sentence_count: 23
    key_terms: [users, marketing, need, nxotcl2kq1se1rpy, get, user, something, whatever]
    concepts: [nxotcl2kq1se1rpy, marketing, users, something, whatever]
    section: Comments
    token_count: 497
---
# 22 Years of Building Software and I Have No Idea How to Get Users

Source: [reddit-deep: r/saas](https://www.reddit.com/r/SaaS/comments/1s9w1vu/22_years_of_building_software_and_i_have_no_idea/)
Posted by **Patrity** · **12↑** · **48 comments**

**I**'ve been programming since I was 11. Started hacking together RuneScape private servers in 2004 like a degen, graduated to enterprise backends, built RESTful APIs managing millions of rows for EPC contractors. Java, Kotlin, Python, TypeScript, PostgreSQL.. you name it.

I've also started approximately thirty-nine thousand side projects and shipped exactly zero of them.

Until now.. I finally finished and feel good about my first one.

**The product**

I built [Cognova](https://cognova.dev/) \-- an AI workspace where your agents actually remember what you told them last week. Persistent memory, knowledge bases, task management, automations, tools, the whole thing. Fully live with Stripe billing, interactive onboarding, the works.

I'm not going to list every feature because that's not why I'm here. The product is done. That's the easy part (for me, anyway).

**The part nobody taught me**

I can architect a distributed system in my sleep. I cannot get a single human being to sign up for my product.

Here's what I've tried:

* **Twitter/X**: Weeks of posting. Minimal engagement. The algorithm does not care about you until people already care about you. Chicken, egg, you know..
* r/SideProject: 1,100 views, good conversation, zero registrations. Mostly other builders offering advice (which was genuinely helpful).
* r/ObsidianMD: 400 views. Planted a seed. One privacy purist told me off. Mods deleted my post. Fair enough.
* **Direct DMs**: Started reaching out to people expressing relevant pain on Twitter. Too early to tell.

**The biggest lesson so far**

A Reddit user told me: "don't describe the tech at all. Describe the pain."

This hit hard. My original landing page said "The AI agent workspace built for Claude." This tagline landed with me, I built the thing. It didn't land for users.

I rewrote the whole thing around a single insight: every AI tool forgets everything between conversations. Mine doesn't. That's it. That's the pitch.

I also scrapped my onboarding modal and replaced it with something I'm genuinely proud of . The AI agent itself onboards you through conversation. It asks your name, learns what you're working on, creates a project, sets up tasks. By the time you're "done," you've seen the product work. No forms, no feature tour, no settings page, done in a matter of seconds to minutes.

**Where I'm stuck**

I know how to build. I do not know how to distribute.

I'm seeing this is a common pattern... developer builds thing, developer doesn't know how to sell thing. I'm developer..

Specific questions for anyone who's been through this:

* How did you get your first 10 users? Not the first 1,000, the first 10 who actually used the product and gave feedback.
* At what point did you know whether the problem you're solving actually resonates, vs. you just built something you personally wanted?
* For those who tried build-in-public on Twitter with a small following -- did it ever actually work, or did you find traction elsewhere? Every post with thousands of interactions just looks like trash engagement farming to me...

I'm not looking for "just keep posting" encouragement. I'm looking for the nitty gritty, tactical stuff that actually moved the needle early on. Any advice, insight, or just general talking me down from the ledge is seriously super appreciated. I know everyone's time is valuable and it's a resource that none of us can get back. So if you do take a second to try it out - thank you, seriously.

If you're curious about the product, it's at [cognova.dev](https://cognova.dev/) free tier, no credit card, easy signup, blah blah. But honestly I'm here for the distribution advice more than signups.

The building was the fun part. This part is.. humbling.

## Comments

- **founder-house-oracle** (3↑): We tried broad “AI productivity” once. Got compliments, zero pull. First actual users came from one tiny forum where people were already furious their chat history kept evaporating between sessions. Ten users is usually one sharp pain in one weird corner, not “distribution.” Twitter is where products go to cosplay demand.
  - **Patrity** (1↑): Lol this is kind of what I'm thinking too. I truly feel like all of the engagement on twitter in those spaces is just builders helping builders that are hoping to be successful builders. Like a giant pyramid scheme or something..
- **Any_Barber1453** (3↑): genuine question -- has anyone told you they specifically lost a client or missed something because an ai tool forgot their context? not that it was annoying, but actually cost them. if not, might be friction not pain, and that's a much harder product to get users to switch for
  - **Patrity** (1↑): So maybe I’m still not framing it properly. That’s one aspect, but it’s a much larger service than that. It’s an entire ai workspace. So think of OpenClaw for example, except we have better memory recall and tools for linking to other platforms, services, and editors.
- **RobertLamp68** (2↑): I am in the same exact boat. Twitter seems like the most accessible place, but it is impossible to get any engagement.
  - **Patrity** (2↑): I think twitter seems most accessible because its a bunch of bots talking to bots, or even users wanting to blow up talking to slightly more successful users. I'd be surprised if anyone actually gets product adoption from these builder communities on reddit..
- **ramshorst** (1↑): Man, this resonates hard. I spent months building tools nobody asked for before figuring out distribution is a completely different skill set.

Your insight about describing pain vs tech is spot on. But here's the thing - you're still one step removed from actual validation. 1,100 views and zero registrations isn't a distribution problem, it's a "does anyone actually have this problem" problem.

**First 10 users tactical:**

I got mine by literally watching Reddit conversations in real-time and jumping in when someone complained about the exact thing I solved. Not posting about my product - actually helping them, then mentioning "hey I built something for this exact scenario if you want to try it." The key was being there *early* in the thread, like within the first hour. Late replies get buried.

Full disclosure: I got so tired of manually hunting these conversations that I built rleads.ai to automate finding them. It scans subreddits for actual pain points (not just keywords) and alerts me when there's a real match. Kinda meta but it solved my own problem.

**The hard truth about product-market fit:**

You won't know if it resonates until you talk to 20-30 people who have the problem. Not people who think it's cool, people who are currently suffering. Ask them what they're doing now to solve it. If they're doing nothing, that's a massive red flag - means the pain isn't strong enough.

Twitter building in public only works if you already have an audience or you're documenting something genuinely novel. Otherwise you're shouting into the void.

The interactive onboarding sounds legit though. That's the kind of detail that could set you apart if you can just get people to see it.

What specific pain points are you targeting? Like who wakes up thinking "fuck, I need persistent memory for my AI agents today"? Because that's who you need to find and talk to, not other builders.
  - **Patrity** (1↑): Appreciate the honesty on the "does anyone actually have this problem" angle. That's the question I'm sitting with.

To your closing question.. nobody wakes up thinking about "persistent memory for AI agents." They wake up thinking "I spent 20 minutes re-explaining my project to Claude again" or "I have research scattered across 4 tabs and none of it connects." The memory is the mechanism, the pain is the repetition and fragmentation.

The real-time Reddit thread approach is smart. I've been posting about my thing instead of showing up in other people's conversations about their thing. Different motion entirely. Going to try that this week, lurking in r/ClaudeAI and r/ChatGPT for context/memory complaints and being helpful first.

The 20-30 conversations benchmark is useful too. I'm at maybe 3. Long way to go before I can call anything validated.
  - **thot_cop** (1↑): A very shameless self plug... and you know what [rleads.ai](http://rleads.ai) actually solves my problem.
  - **JohnMayerIsBest** (1↑): What worked for me was shifting focus from just chasing users to confirming that the problem actually exists and matters to them. I once had a similar issue where many viewed but no signups came because I hadn’t validated if the pain was real or significant. Spending time gathering real market signals saved me from building features no one needed and helped me find product-market fit faster.
- **alexandre-boudot** (1↑): honestly the fact that a random reddit comment about describing the pain instead of the tech completely shifted your approach says a lot. most devs would have just kept iterating on features. distribution is a completely different muscle and it sucks because none of the technical skills transfer. what actually worked for me was just being embarrassingly present in conversations where people had the exact problem i was solving. not pitching, just being helpful and letting people find their way to what i was working on. it takes way longer than you want but the people who show up that way actually stick around
  - **Patrity** (1↑): "Distribution is a completely different muscle and none of the technical skills transfer".. yeah, that's the sentence I needed to hear three weeks ago haha. I keep trying to engineer my way to users and it doesn't work like that.

The "embarrassingly present" framing is perfect. I think my problem has been trying to be efficient about it.. posting once and hoping the algorithm does the work. Sounds like the real answer is just.. showing up. Repeatedly. In other people's threads.

Appreciate this.
- **HalastersCompass** (1↑): Lol, how many bots talking to bots....

Your appealing to a certain niche.  Personally my team wouldn't need it . I wish you well but that's a tough sell, folks who might want it may well have created their own knowledge base
  - **Patrity** (1↑): Its always so hard to tell, they're so sneaky with subtle plugs lol...

I appreciate the brutal truth
- **LiveLoveLaughGive** (1↑): Congratulations on building this, what you have built is pretty impressive. I believe your ICP are developers? Is that right or am I misreading.

The problem with that ICP is the current state of AI. There is practically AI psychosis happening right now and the money needed to get your solution out there has increased for that ICP. Influencers may be the best way forward for you. But your solution is also something that larger players are likely to launch. The timeline can be weeks or months - nobody knows.

I might have some ideas for collaboration if I am reading your solution correctly. Let me know if you would be interested and I can send a DM.
- **thomashoi2** (1↑): If you have a job, can be anything from admin to sales, marketing positions. How can Cognova help one of them to automate their manual task?
  - **Patrity** (1↑): What's funny is that I built this out of personal need. I work in enterprise technology. We have in-house developed SQL servers with >50k lines of DDL in scheduled procedures, functions, views that are all based around custom business rules.

I use Cognova myself to help with tedious queries where I would like AI to speed up my workflows and have constant context. Maybe I need to setup a demo with dummy data. I'm expecting users to use their imagination which is probably the wrong step
    - **thomashoi2** (2↑): There you go, you are your own target audience. Do a demo and show how your app can save hours of tedious work and you should get your first users soon.
- **LegalWait6057** (1↑): The rewrite from describing the tech to describing the pain is probably the single most important thing you have done so far. That alone puts you ahead of most developer founders who never make that shift.

For the first 10 users thing, what worked for a lot of people I have seen is finding the specific communities where people are actively complaining about the exact problem you solve and just being helpful there without pitching. Answer questions, share insights, and let people come to you. It is slow but the quality of those early users is way higher than anything you get from a launch post.

The onboarding through conversation idea is genuinely clever though. That is the kind of thing that could spread through word of mouth if the right people experience it. I would focus on getting it in front of a few productivity or AI tool reviewers on YouTube or newsletters because one good review from someone with a relevant audience can do more than months of tweeting.

Also the build in public thing on Twitter is honestly overrated unless you already have an audience. Most of the people engaging are other builders not potential customers. I would put that energy into finding where your actual users hang out instead.
  - **Patrity** (1↑): I felt like I was really on to something when I did the paradigm shift on my landing pages.

Do you have any suggestions on specific channels? My entire feed is tech channels, not necessarily people talking about hands-on usecases. Thank you for the solid idea!
- **ice-kream** (1↑): Stories sell. Share stories. Use cases etc. 
Benefits overs features. 

You buy a drill make a hole. Problem is making a hole. You sell the ability to make a hole. Not the 10mm drill bit. 

As others have said find where your prospects hang out. 

Offer for free to gain reviews. 
Offer incentives for sharing.
Speak to influences for kickbacks/commesion. People who already have a following into that space. Loads of YouTubers talking about Claude, AI etc. Get them to review and promate.

Find others who can cross share or promote to thier user base for a commesion.

Get honest feedback, reviews, and use Word of mouth referal marketing. 

Post on product hunt and similar places. 

Former software engineer / global product manager / strategic marketing qualification turned into co-founder of a SaaS startup.

Make sure you have a product market fit. 
Make a user persona, that way it helps you market better. What does your typical client like? What are thier pain points? What are thier jobs to do? Once this is super clear you know where to go, who to speak too.

Reach out to blog writers on news websites. They are always looking for cool stories. 


Maybe even ask AI to help you?! Explain your situation and ask for help. 

Gooduck.
  - **Patrity** (1↑): The drill/hole analogy is exactly where my head is now. I spent months selling the drill bit specs when I should have been talking about the hole.

The YouTuber angle is one I haven't explored at all.. there are creators doing Claude/AI tool reviews who might be willing to try it out. Any advice on how to approach them? Cold DM with free access, or something more structured?

And the user persona point is well taken. I've been marketing to "anyone who uses AI" which is basically marketing to nobody. Need to narrow that down.

Thanks for the detailed breakdown, tons of ideas here.
    - **ice-kream** (1↑): You're welcome.

Yeah just cold DM them, some might have emails in bio. Do whatever it takes. What's the worst that can happen, nothing, which is what would happen anyway.

1st email keep it short and to the point, they most likely get loads of emails.  
Something that makes it clear in terms of whats in it for them. Have it in the subject line too i.e., Referral/Partnership opportunity

Then write a little about what you have, and what you are offering etc. Use AI to help.

2nd email once they engage, follow up with more information on what the structure looks like. Explore what others are doing. Often users click via a link which tracks back to the website, or a special coupon code. They need to get a commission, whatever you feel comfortable with, just remember it will be public and unless clear no limit on total users. So keep that in mind. You also need to make sure users will not go direct and cut them out, so often you also need to make an offer for the user.

"Use my link below to get an extra 10% off, limited to first 100 users" - example, or could say 3 months, or could even be upgraded to pro package etc. Lots of ways to offer value. No right or wrong, learn from others, ask AI, learn from how your conversation goes. Make it a win-win-win (you, influencer, user)

[https://youtu.be/67zh8\_yiPh4?si=NxOTcl2kq1Se1Rpy](https://youtu.be/67zh8_yiPh4?si=NxOTcl2kq1Se1Rpy)  
This video is worth a watch. The guy says he puts on offers via AppSumo, sell limited lifetime offers to make enough money to then reinvest into marketing.
