---
id: articles/design-week/bdedea0ec7.md
url: "https://www.designweek.co.uk/first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe/"
url_hash: "bdedea0ec7"
kind: "article"
source: "design_week"
title: "First AI came and scooped up your art. Now it’s scooped up Adobe."
author: ""
date: "Wed, 07 Oct 2026 17:02:12 +0000"
tier: 3
method: "source-native"
extracted_at: "2026-10-09T16:44:12.821279+00:00"
chars: 4806
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
collected_at: "2026-10-09T16:44:12.429Z"
relevance: 80
engagement_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
content_hash: "5652188be7cd71c1"
relevance_by_goal: {"aa6916010743":80}
chunks:
  - id: "articles/design-week/bdedea0ec7.md#c0"
    char_span: [0, 184]
    sentence_count: 3
    key_terms: [first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe, scooped, designweek, source, adobe, https, art, came]
    concepts: [scooped]
    token_count: 55
    sources: [{"n":"design_week","u":"https://www.designweek.co.uk/first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe/","kind":"article","date":"2026-10-07"}]
  - id: "articles/design-week/bdedea0ec7.md#c1"
    char_span: [186, 2487]
    sentence_count: 19
    key_terms: [software, photoshop, like, adobe, james, suite, engineering, code]
    concepts: [software, photoshop, adobe, engineering, james]
    token_count: 512
    sources: [{"n":"design_week","u":"https://www.designweek.co.uk/first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe/","kind":"article","date":"2026-10-07"}]
  - id: "articles/design-week/bdedea0ec7.md#c2"
    char_span: [2223, 4630]
    sentence_count: 16
    key_terms: [software, good, artcraft, create, design, interesting, like, providing]
    concepts: [software, artcraft, create, design, interesting]
    token_count: 512
    sources: [{"n":"design_week","u":"https://www.designweek.co.uk/first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe/","kind":"article","date":"2026-10-07"}]
  - id: "articles/design-week/bdedea0ec7.md#c3"
    char_span: [4334, 4993]
    sentence_count: 11
    key_terms: [design, article, archive, member, help, per, disciplines, interesting]
    concepts: [design, article, archive, member]
    token_count: 148
    sources: [{"n":"design_week","u":"https://www.designweek.co.uk/first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe/","kind":"article","date":"2026-10-07"}]
---
# First AI came and scooped up your art. Now it’s scooped up Adobe.

Source: [design_week](https://www.designweek.co.uk/first-ai-came-and-scooped-up-your-art-now-its-scooped-up-adobe/)

It’s ironic, really. Adobe were one of the first to build AI tools into their software. AI that has scooped up, without asking, all of the images and then regurgitated elements of them time and time again with zero reward for the original creators.
And today we learned that AI has replicated much of Adobe’s Creative Cloud suite. ArtCraft is a small, two-person repository on GitHub that’s doing the rounds in the dev community that arrived seemingly from nowhere a week ago with an awful lot of code across a lot of projects.
Two humans cannot generate this much code in such a short amount of time, or even a lifetime, suggesting that it’s entirely AI built. But how? Your author’s background before this was software engineering and I know how hard this stuff is. It would take quite some work for AI to build these tools. I’d like to fully test them, but there’s no way in hell I’m going to let vibe coded anything run on my computer with disk access. I have trust issues. This is a lab job and not enough of you are subscribing to pay for a Design Week lab. Yet. Please subscribe – it lets us do more.
According to statements made on the ArtCraft Discord server by the developers, it’s a clean room reverse engineering of the Adobe Creative Cloud suite and includes a range of cloned apps that look and feel just like apps like Photoshop, Illustrator, Premiere and so on. The theory amongst some is that they’ve used local software agents which have worked through the entire suite, worked out every detail, and then replicated it all in fresh, clean code.
Another theory is that they decompiled the software and had AI rebuild it using a language called Rust – but that wouldn’t generally be legal as it goes against Adobe’s licensing terms.
Self-confessed nerd, James O’Malley has tried it:
I know it's literally a recreation of Photoshop but it is.. just… Photoshop. My jaw is on the floor.
— James O'Malley (@jamesomalley.co.uk) 2026-10-07T09:39:03.327Z
But he also noted that it’s a bit wonky, after trying to blur out someone’s name:
(I actually blanked out that moron's name using, 'Photocraft', the rebuild of Photoshop – gaussian blur didn't work and it felt a bit wonky, but given this software has been available for like, 24 hours, it feels like it will rapidly improve.)
— James O'Malley (@jamesomalley.co.uk) 2026-10-07T10:42:39.086Z
We can definitely say it’s causing a ripple – the ArtCraft Discord server is absolutely lit up today. In part because it shows what may be possible. Certainly I’ve experimented with standalone mini-apps for extending the usefulness of Design Week and they’re really really good. I’m very very careful, however, about anything that can write to disk. You can’t really trust AI generated code that hasn’t been fully audited by experts, and other AI agents are remarkably good at finding vulnerabilities that even professionals can leave. If you don’t know how to code, your vibe coded software is dangerous.
In the same way that anyone can create a poster with AI, but only a good designer can create a good poster with AI.
Now ArtCraft looks janky in places and hasn’t earned enough trust to be installed on my computer, but imagine what a team of professional software engineers with budget and reputation could achieve?
There are also, it seems, many differences fundamentally between the ArtCraft tools and Adobe – they’re designed around providing MCP (Model Context Protocol) which is a way of providing information to AIs about what the software is doing.
wE suspect that Adobe’s lawyers will be all over this one… I suspect the project won’t survive for very long unless it’s well funded. What WE do think is that this is evidence that AI is powerful when it comes to replicating what already exists – something which could be terrifying for tech firms if your entire foundation is built on owning something that you can rent out. It’s like renting out land and houses – what money would there be in being a landlord if someone could simply create their own land and home for pennies? These are interesting times for sure – and the tech companies may be about to get the same done to them as they’ve done to the creative community.
Addendum: we might not have a lab, but last night someone posted a run through on YouTube, which we thought you might find interesting:
Design’s not dead. But it’s under pressure.
We need you!
Our mission is to support and expand the UK design industry.
For as little as £4 you can help us help you. We receive 10x the content we can publish. Members now have a higher chance of being featured on Design Week.
From the Archive
Archive stories are member only.
Become a member for £4 per month or £40 per year. Cancel anytime.
- Design disciplines in this article
- Industries in this article
- Tags in this article
