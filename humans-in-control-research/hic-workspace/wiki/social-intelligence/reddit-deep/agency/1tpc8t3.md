---
id: social-intelligence/reddit-deep/agency/1tpc8t3.md
url: "https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/"
kind: "social-post"
source: "reddit-deep: r/agency"
subreddit: "agency"
title: "Agency Stack 2026: Minimal WP + MCP vs. 100% Hardcoded AI (Claude/ECC)"
author: "GonnDir"
date: "2026-05-27T17:21:43.000Z"
score: 1
upvote_ratio: 0.67
num_comments: 26
flair: "Growth & Operations"
extracted_at: "2026-10-09T16:37:10.379Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/agency/1tpc8t3.md#c0"
    char_span: [0, 1498]
    sentence_count: 11
    key_terms: [agency, sustainable, comments, majority, option, solid, weeks, hitl]
    concepts: [agency, sustainable, comments, majority, option]
    token_count: 346
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/","kind":"social-post","date":"2026-05-27","author":"GonnDir","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1tpc8t3.md#c1"
    char_span: [1500, 3119]
    sentence_count: 21
    key_terms: [screenshot-cms, wordpress, ecc, claude, plugin, static, open-source, mcp]
    concepts: [screenshot-cms, wordpress, claude, plugin, static]
    token_count: 396
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/","kind":"social-post","date":"2026-05-27","author":"GonnDir","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1tpc8t3.md#c2"
    char_span: [3134, 5183]
    sentence_count: 18
    key_terms: [breakinginnocence, clients, support, break, sentence, failure, gonndir, through]
    concepts: [breakinginnocence, clients, support, break, sentence]
    section: Comments
    token_count: 464
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/","kind":"social-post","date":"2026-05-27","author":"GonnDir","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1tpc8t3.md#c3"
    char_span: [5185, 7304]
    sentence_count: 16
    key_terms: [agency, agencynewbies, https, wants, com, moderators, screenshot, community]
    concepts: [agency, agencynewbies, https, moderators, screenshot]
    section: Comments
    token_count: 493
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/","kind":"social-post","date":"2026-05-27","author":"GonnDir","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1tpc8t3.md#c4"
    char_span: [7306, 9379]
    sentence_count: 16
    key_terms: [leads, client, cms, controlled, experience, wordpress, headless, screenshot-to-production]
    concepts: [leads, client, controlled, experience, wordpress]
    section: Comments
    token_count: 458
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/","kind":"social-post","date":"2026-05-27","author":"GonnDir","subreddit":"agency"}]
  - id: "social-intelligence/reddit-deep/agency/1tpc8t3.md#c5"
    char_span: [9381, 10420]
    sentence_count: 8
    key_terms: ["doesn't", stack, wrong, goes, "it's", own, professionals, relationship]
    concepts: ["doesn't", stack, wrong]
    section: Comments
    token_count: 236
    sources: [{"n":"reddit-deep: r/agency","u":"https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/","kind":"social-post","date":"2026-05-27","author":"GonnDir","subreddit":"agency"}]
---
# Agency Stack 2026: Minimal WP + MCP vs. 100% Hardcoded AI (Claude/ECC)

Source: [reddit-deep: r/agency](https://www.reddit.com/r/agency/comments/1tpc8t3/agency_stack_2026_minimal_wp_mcp_vs_100_hardcoded/)
Posted by **GonnDir** · **1↑** · **26 comments**

**Update**: Not doing Screenshot CMS but we'll do Option B.

After actively mailing public experts on both topics, the majority concludes solid way should be WP.

However some messages reached me from agencies that sustainably do Option B.

Also the majority is expecting solid AI-native stacks to overtake in forseeable future.

Maintainance:

Is actually not that complicated nor is it possible to hallucinate as we have HITL and we don't built blackboxes.

We still have a HITL to verify and also the Code for plumber websites is extremely overseeable in a way I could teach my 14 year old brother to maintain it in a few weeks probably.

I highly recommend you, as someone who was employed at an award winning web dev & marketing agency of the country (WP sites 14-20k €), think about instead of reworking your current workflow with AI, to radically think different and dive deep into the developments of the past 8 weeks. Although a lot of info out there is more hype than sustainable, there are sustainable and better ways.



**Original Post**

We are building a lead-gen agency for local businesses (plumbers, roofers).

We agree on AI. We strongly disagree on architecture. Your reality check is needed

Here are our two approaches:

|Feature|Option A: Working with WordPress MCP (Me)|Option B: AI-Native ECC + Claude (Co-founder)|
|:-|:-|:-|
|**Core Tech**|WordPress + few premium plugins (Security, SEO).|Static Next.js/HTML. No DB. No PHP.|
|**AI Integration**|Connected via MCP for content and CRM routing.|Claude Code + `affaan-m/ECC` harness + `marketingskills`. Generates 250+ local SEO pages programmatically.|
|**Client UI**|Standard WP Dashboard.|"Screenshot-CMS". Client sends marked-up screenshot to a WhatsApp bot. Bot edits code via MCP and redeploys.|
|**Updates & Security**|Delegated to professional plugin teams.|Managed by Open Source skills and internal AI vulnerability scanners.|
|**Main Argument**|Commercial insurance. Familiar UX. Easy hand-off.|Unhackable (static). Lightning fast. Zero plugin bloat.|

**The Conflict:**

* **He says:** WordPress is outdated and insecure. Static sites solve runtime vulnerabilities completely. Open-source AI skills update faster than WP plugins.
* **I say:** His stack is an over-engineered Ferrari for plumbers. Relying on an open-source GitHub harness (ECC) is a single point of failure. The "Screenshot-CMS" will be a massive support nightmare.

**My questions for you:**

1. Which stack actually scales to 100 non-tech clients in 2026 most effective that you know?
2. Has anyone run the "Screenshot-CMS" approach in production? Does it survive real clients?
3. Is a minimal 3-plugin WP setup really more dangerous than maintaining an internal ECC/Claude pipeline?
4. Am I missing somthing
5. Why do you think he is not accepting my perspective? He says since April this should be the way.

## Comments

- **BreakingInnocence** (10↑): Anything with Wordpress is a failure. Also your the agency, stop asking your clients questions, reduce the their cognitive loads
  - **GonnDir** (1↑): That's a reach I believe. I don't know how the second sentence fits the post, but may help someone.
    - **BreakingInnocence** (1↑): the second sentence will click someday, it happens to all of us. 

Best of luck.
- **erickrealz** (2↑): You're right and your co-founder is solving for elegance over reality. For 100 non-tech local clients, boring and familiar wins every time. Plumbers and roofers don't care about runtime vulnerabilities, they care about whether they can find their dashboard.

The Screenshot-CMS is a support nightmare waiting to happen. Marked-up screenshots through a WhatsApp bot editing code live will break in ways you can't predict, and your clients won't be able to self-serve when it does. Every edge case becomes a support ticket.

His "single point of failure" instinct is exactly backwards. An open-source harness as core infrastructure is the fragile choice, not the resilient one. Established platforms have commercial support and accountability when things break.

That said, you're both overbuilding. Local lead-gen success comes from the offer and the outreach, not the stack. 250 programmatic SEO pages for a plumber is a solution looking for a problem. Pick the boring stack, ship fast, and put your energy into actually generating leads.
  - **GonnDir** (1↑): Thanks, no worries, we started sales already - both sales seniors.

I was more worried about producing a doomed environment which will on short or long sight break in a non-maintainable way and prompt us to work a lot more.

I decided to give his way a shot, as even if we come to a mess, in the beginning it's okay. If his way sustainably works, it's 100% technically better , more cost-effective, more flexible and will save tons of time.
- **elgarduque** (2↑): Do the one that will work when Claude costs are jacked through the roof and you can't afford it anymore.

Our agency uses Claude heavily for tasks, but ultimately we still need to be able to work on anything we have created if/when the AI bubble bursts and we can't use this shit anymore.
  - **GonnDir** (1↑): That is sustainable thinking!  
He wants to build in a way we can rely on local models in the end.
- **AutoModerator** (1↑): Your post was removed because you do not have a history of positively engaging with the r/agency subreddit. You are free to comment, but posts are limited to community engagers. Alternatively, you may post this in [r/agencynewbies](https://www.reddit.com/r/agencynewbies/), find what you're looking for in the [Discord community](https://discord.com/invite/uvHRRRFVRD), or seek [agency verification](https://www.reddit.com/r/agency/wiki/index/) here. If you feel this is in error, reach out the moderators of the sub.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/agency) if you have any questions or concerns.*
- **kaancata** (1↑): I’ve built a lot of WordPress sites, and now I’ve also pretty far into Next.js + Sanity + Vercel with Claude Code/Codex helping on the build side. I prefer the second setup now, WordPress is a mess in this agentic age. Headless gives more control, cleaner integrations, much easier to connect forms, CRM, tracking, automations, ad platforms, etc.

But for 100 non-technical plumbers and roofers, the stack is not the main question. The question is who maintains it when the client inevitably asks for weird changes, breaks content, sends bad screenshots, wants a form changed, wants a new service area page, or says “the leads are not showing up in the CRM”?

A screenshot CMS sounds clever, but I’d be very careful with it. Clients do not always communicate changes cleanly. A marked-up screenshot can mean 5 different things. If that goes through an AI/code/deploy pipeline, you need preview, approval, rollback, logging, and someone who understands what changed. Otherwise your “AI-native” system becomes a support desk.

For local lead gen I’d care much more about:

* can the client edit the few fields they actually need?
* do forms go into the CRM correctly?
* are leads tagged by source?
* does tracking fire properly?
* can you prove which campaigns/pages produced leads?
* can you roll back a bad change quickly?
* can a normal employee understand the editing flow?

My bias would be a headless CMS with a simple editor experience, not a screenshot-to-production setup. Build the editing model around structured fields the client understands. Service pages, areas, testimonials, offers, FAQs, images. Keep layout/design mostly controlled.
  - **GonnDir** (1↑): **Your contribution means a lot, thanks!!!**  It's so hard to find information for this process (at least for me it seems). 

Completely agree.

We disregarded the screenshot CMS. Headless CMS, agreed!

Thing with our leads:  
From my experience selling web services to all industries, while some plumbers do, our ideal customer doesn't want to be on the computer as we are filtering cash flow positive leads for critical search visibility issues.

After some dozens of calls I can say most of them just want the telephone ringing and that's what we will sell to them to keep design controlled as you recommended.
- **PGAmilaP** (1↑): I run an dev agency with 40 people as well and I am technical, but no way I would run the entire thing just alone on AI. I have tried that on some of my personal projects to see how I can bring that to our team, but it has never worked.

Wordpress might be old and outdated, but it generates revenue, it is predictable and if sh\*t hits the fan, you know the tech stack enough to fix it. I have had situations where AI generated code has had issues, asked AI to fix it and it just goes into a crazy loop.

I personally would go with your stack till you start generating revenue and then you have sufficient money to test our new systems.
- **ClicData** (1↑): The question nobody's asked yet ITT: what does the client actually own? 

With Option A, a plumber can hand the WordPress login to a nephew or a new agency. The asset is portable.

With Option B, the site is entangled in your internal ECC pipeline, your WhatsApp bot, and your Claude credentials. The client doesn't own the CMS & they own a dependency on you. That's great for retention until it isn't...And when it goes wrong it goes wrong loudly....

I'm not arguing for wordpress specifically, It's that "unhackable and fast" are features you're selling to yourself. The plumber cares about leads, uptime, and not being held hostage if the relationship sours.

The stack that scales to 100 non-tech clients is the one where offboarding one doesn't break the other 99...
  - **GonnDir** (1↑): Like I said in other comments, he didn't say it as a law of nature "impossible".

I thoroughly checked his stack with E-Mailing several experts and video calling professionals who sell in different stacks.

Bottom line: It's probably the way to go forward.
- **Deep_Ad1959** (1↑): static export kills runtime PHP CVEs, not your npm supply chain. one compromised build dep still ships to all 100 sites at once. written with ai
