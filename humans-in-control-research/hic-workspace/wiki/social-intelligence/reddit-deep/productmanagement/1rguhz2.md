---
id: social-intelligence/reddit-deep/productmanagement/1rguhz2.md
url: "https://www.reddit.com/r/ProductManagement/comments/1rguhz2/using_ai_in_technicalplatform_product_management/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Using AI in technical/platform product management"
author: "Altruistic-Judge-911"
date: "2026-02-28T05:43:35.000Z"
score: 10
upvote_ratio: 0.7
num_comments: 25
flair: ""
extracted_at: "2026-06-14T15:28:02.845Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1rguhz2.md#c0"
    char_span: [0, 1848]
    sentence_count: 10
    key_terms: [using, productmanagement, platform, opportunities, aid, code, role, vibe]
    token_count: 412
  - id: "social-intelligence/reddit-deep/productmanagement/1rguhz2.md#c1"
    char_span: [1863, 3894]
    sentence_count: 14
    key_terms: [product, business, improvements, engineering, altruistic-judge-911, value, data, shipping]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/productmanagement/1rguhz2.md#c2"
    char_span: [3896, 5951]
    sentence_count: 14
    key_terms: [use, cases, data, thinking, content, draft, tools, structure]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/productmanagement/1rguhz2.md#c3"
    char_span: [5953, 8224]
    sentence_count: 13
    key_terms: [llms, using, day, terms, vibe-coding, like, llm, task]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/productmanagement/1rguhz2.md#c4"
    char_span: [8226, 10451]
    sentence_count: 21
    key_terms: [genai, docs, use, internet, claude, early, etc, productive]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/productmanagement/1rguhz2.md#c5"
    char_span: [10453, 11198]
    sentence_count: 6
    key_terms: [prototyping, new, altruistic-judge-911, help, "i'm", disorganised, definitely, delivering]
    section: Comments
    token_count: 173
---
# Using AI in technical/platform product management

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1rguhz2/using_ai_in_technicalplatform_product_management/)
Posted by **Altruistic-Judge-911** · **10↑** · **25 comments**

It's crazy how fast AI tech is developing, and it's really got me thinking about my future and wanting to learn more.

Lots of posts here recently on AI use cases and implications on the product role, particularly predictions around increasing expectations to vibe code prototypes and ship MVPs ourselves.

I work in a very technical, platform-focused domain (think data pipelines, CICD pipelines, APIs, infra, software integrations with other systems, etc.) and I just can't see how vibe coding could ever be an expectation of this job. I work with a team of 10+ engineers, in a large engineering-led company - surely they're not going to want PMs shipping crappy code when the engineers (who are using AI more and more) could do it 10x better.

I'm mostly using GPT/Gemini as a sounding board to aid discovery, market/competitor research and strategy atm (which is massively speeding things up). Also planning to connect Claud to our codebase and Notion to identify more opportunities, and aid discovery in a different way than with GPT/Gemini (less of a sounding board, and more comparing the codebase with my strategy and research to uncover new problems the devs may not have spotted). But I'm not even close to shipping code (nor do I think it should ever be in the remit of the job, but that's another convo).

If you're a platform PM - how are you using AI, and what opportunities do you see for it to help aid the role? How do you see AI changing the remit of the platform PM role in the future? Should I be vibe coding apps in my spare time to keep up with the times?

## Comments

- **CuriousFlame1** (8↑): I am a platform/tech pm too, I connected my codebase and DB with Claude code and Codex. I am shipping small edge cases with these tools, because of cross-domain knowledge of design, ops, sales/business and product obv, it is helping me a lot with product improvements, and it is really increasing the speed of the overall team.
  - **Altruistic-Judge-911** (5↑): Curious on some examples of these edge cases? What’s the value having you shipping these improvements rather than engineering, is it to do with overall team velocity (i.e. you hold the context, so it’s faster to get it done)?

I would contend that perhaps another use case of AI is to enable engineering teams to get up to speed on context faster. I think they should be accountable for the quality of their code, and be the ones implementing product improvements rather than us. I guess this touches on my point about thinking this shouldn’t be in product’s remit. We look after the what and the why, not the how - and shipping code puts us closer (arguably too close?) to the solutions rather than problems and outcomes. 

Partly why I’ve been learning AI slowly, and reluctant to dive into trying to micro-ship PRs, is because I’m also trying to spend more time on the business outcomes. Platform PM is especially hard to quantify value or connect to the customer/ business, which is why I’ve been choosing to go more business and less tech atm!
- **f1zombie** (3↑): One thing that I find supreme value in is synthetic data and scenario building for systems. We have similar high impact data APIs that includes governance, permission, rules, etc. Using AI, we built test data sets and scenarios to test. Its been helping our development iterations significantly.
  - **Altruistic-Judge-911** (1↑): Nice example, my dev team are also doing a similar thing to generate mock data for testing.

Is that not a use case for engineering though, not product? Similar to my other comment, what’s the value in you doing this work over the engineers?

Maybe there is an opportunity for us to identify AI use cases for developers, if they’re not yet putting them into practice? And influencing such that they start utilising it?
    - **f1zombie** (1↑): A lot of these use cases fall into product purview - the data we work with is highly functional (its b2b sales and marketing data, with enrichment, scoring, etc.). We also look at the data activation, so there's a lot of use cases.
- **SillyVermicelli7169** (1↑): Can you provide a concrete example how you sped things up with GPT as a soundingboard? Havent heard many real life uses there that repeat often.
  - **Altruistic-Judge-911** (1↑): I use Gemini for my product strategy. First I'll say that I never prompt it to do the work for me - I will always do the initial thinking, draft structure and content myself. Then I'll give it all the context I have, along with my ideas, and ask for feedback on both the structure and content (the draft content might even be simple bullets or placeholders). Usually it's a constant dialogue, I just type everything I'm thinking in the moment and apply the feedback. It's great at providing another perspective to my thinking and sends me down routes I might not have gone down before. For my most recent one I had a draft live in three days, before it would have taken me weeks.
- **brianly** (1↑): Before vibecoding, people still built local tools. Use AI to enhance those. 

All of the items you list for the domain generate text in different formats as errors. Based on that you can create tools to automate diagnosis. 

The same items provide non-error text output too. Look at what humans are doing with that for inspiration.
  - **alexinquotes** (1↑): +1 to finding ways to build small tools or utilities for internal team productivity, or perhaps prototyping the kind of dashboard or something that represents your platform data.
- **SMFDR** (1↑): My bosses are also desperately looking for use cases to justify AI investment and getting nothing in return lol
- **lily-de-valley** (1↑): Following this.

OP - thanks for asking, bc I also work in a technical domain and my product is backend ML systems. I’ve been scratching my head at all this vibe-coding advice and struggling to see how I can adopt it into my work, beyond using LLMs to draft docs and conduct research.

I can’t exactly vibe-code and ship a search engine or a personalization algorithm. Much of my day-to-day is designing backend systems, crafting labeling strategies, and determining optimization objectives and constraints. How am I supposed to vibe-code any of this?

I’ve discussed this with my manager and the consensus is that common vibe-coding advice is more applicable to front-end feature PMs?
- **kadfr** (1↑): I avoid using GenAI as much as possible. I find LLMs extremely limited in terms of creative ideation, strategy etc and mediocre in terms of day to day tasks.

- Can I do the task quicker and better without LLMs?

- If it a boring task, is there a method available where I can automate without using a LLM?

- Is doing the task an opportunity to learn a new skill?

- Will I spend more time fixing the LLM mistakes/omissions/hallucinations than if I did it myself?

- Is using a LLM worth it in terms of the impact on my blood pressure (from getting angry at its ineptitude)?

If I want predictive algorithms to help me in my day to day job, then I'll look to use dedicated tools for that purpose (ie for commercial modelling etc).
  - **robust_nachos** (2↑): A position like this will become increasingly untenable — there are a lot more use cases for LLMs than ideation and strategy. It’s a lot like the moment in the 1990s when computers and the internet really started to take over the average office. The tech was rough and not polished but those who learned early built a long term sustainable advantage in the job market by knowing how it works and being able to apply it to existing and novel work tasks. The people who learned later ended up adapting but at a much less deep level. 

History repeats itself and LLMs are that moment again whether we like it or not.
    - **kadfr** (2↑): I was around in 90s with the rise of the internet, both as a student and early employment.

While there seems to be parallels between then and now but fundamentally they are very different.

1) The internet was bottom-up and followed the typical theory of diffusion from early adopters downwards.

2) GenAI is top-down and is driven by C-level and Big Tech.

3) The early internet was empowering - it facilitated people to connect with one another & share knowledge in a way that wasn't possible before. 

4) LLMs gateposts and then distorts knowledge.

GenAI seems to have more in common with Bitcoin than the early internet (ie a hype-driven get rich quick scheme).

I'm usually first in line for all tech innovations but I found GenAI to be damaging for my mental health that is reminiscent if social media.

The thing is, it isn't just a tool or a programming language. I found it undermined my cognitive processes in a truly damaging way. 

It did NOT make Nx productive.

In fact, GenAI make me far less productive as it interferes with my natural thought processes. I am significantly happier since I decided to not use Claude/Gemini/ChatGPT etc etc.

That isn't to say I hate all forms of AI - the more I turn away from LLMs,  the more I'm fascinated by  algorithmic machine learning.

Maybe I can't stay away from GenAI forever but I will try to keep it at arms length as long as I possibly can.
- **Impressive_Pair9840** (1↑): I use ChatGPT as my co-author on all decision docs and PRDs. It allows me to put a narrative document together extremely quickly. I produce these for every feature / use case. Docs that used to take weeks and weeks can be done in minutes if you have been noodling on the concept in the back of your mind. The narrative doc works far better than a set of user stories in my world. 

I have chats for marketing, value proposition, competitors, market updates, and strategy that I keep updated and regularly update docs / md files based on the chat content. 

This then gives me a set of docs and instructions for Claude that knows the context of the business. 

I use Claude for all sorts. E.g. I have it MCP connected to my UX team’s Figma and the console product itself. 

This means I can easily prototype features based on a new PRD. Whether that’s outputting a html file to look like a page that I can drop back in the PRD or a clickable front end prototype of a new tab etc. 

I’m getting ever closer to just delivering the actual feature myself (which is a whole other discussion….)
  - **Altruistic-Judge-911** (0↑): Nice! I'm pretty much half way to where you are - lots of docs with business context (though very messy and disorganised lol). Having all this makes prompting easier over time, but I could definitely tap into it a lot more.

I still can't see how using Claude for prototyping would help me. New features for me are things like new db schema, changes to db write operations or exports, or a new API endpoint - none of which would be worth a PM prototyping. I can see the benefit if you look after a UI - to help convey the idea to the dev team better, but I'm unsure if it applies to pure platform work 🤔
