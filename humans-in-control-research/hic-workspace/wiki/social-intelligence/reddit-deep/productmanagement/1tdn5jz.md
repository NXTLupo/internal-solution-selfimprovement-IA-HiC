---
id: social-intelligence/reddit-deep/productmanagement/1tdn5jz.md
url: "https://www.reddit.com/r/ProductManagement/comments/1tdn5jz/should_pms_have_codebase_access_now_that_ai/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Should PMs Have Codebase Access Now That AI Coding Tools Exist?"
author: "Final-Buy8151"
date: "2026-05-15T05:47:14.000Z"
score: 83
upvote_ratio: 0.81
num_comments: 97
flair: ""
extracted_at: "2026-06-14T15:28:02.842Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product marketing report for NXT Humans' 'Intelligence Augmentation' CX suite, synthesizing its core value proposition, technical features, client benefits, and deployment options based on the provided source documents and transcripts."
engagement: "generate-a-comprehensive-product-marketing-report-for-nxt-hu"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c0"
    char_span: [0, 1796]
    sentence_count: 17
    key_terms: [codebase, product, tools, understand, productmanagement, like, pms, implementation]
    concepts: [codebase, product, tools, understand, productmanagement]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c1"]
    token_count: 378
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1tdn5jz/should_pms_have_codebase_access_now_that_ai/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c1"
    char_span: [1810, 3781]
    sentence_count: 23
    key_terms: [product, understand, something, manager, answer, understanding, makes, engineers]
    concepts: [product, understand, something, understanding, manager]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c0"]
    section: Comments
    token_count: 395
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c2"
    char_span: [3783, 5720]
    sentence_count: 13
    key_terms: [engineers, code, access, questions, understanding, help, use, approach]
    concepts: [engineers, access, questions, understanding, approach]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c3"]
    section: Comments
    token_count: 453
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c3"
    char_span: [5722, 7700]
    sentence_count: 11
    key_terms: [question, code, access, engineers, internal, reading, support, answer]
    concepts: [question, access, engineers, internal, reading]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c2"]
    section: Comments
    token_count: 478
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c4"
    char_span: [7702, 9142]
    sentence_count: 6
    key_terms: [code, access, etc, "it's", depends, large, small, tests]
    concepts: [access, depends, large, small, tests]
    section: Comments
    token_count: 351
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c5"
    char_span: [9144, 11291]
    sentence_count: 18
    key_terms: [access, code, read, team, existing, product, without, having]
    concepts: [access, existing, product, without, requirements]
    section: Comments
    token_count: 505
  - id: "social-intelligence/reddit-deep/productmanagement/1tdn5jz.md#c6"
    char_span: [11293, 11889]
    sentence_count: 6
    key_terms: [build, need, prototypes, allow, check, safe, relatively, compliant]
    concepts: [build, prototypes, allow, check]
    section: Comments
    token_count: 134
---
# Should PMs Have Codebase Access Now That AI Coding Tools Exist?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1tdn5jz/should_pms_have_codebase_access_now_that_ai/)
Posted by **Final-Buy8151** · **83↑** · **97 comments**

I have a pretty strong opinion on this:

Product managers should have read access to the codebase of the product they work on.

Not because PMs should suddenly start reviewing PRs or tell engineers how to build things. That would obviously be the wrong takeaway.

But with tools like Claude Code, Cursor, Codex, etc., this becomes a much more practical question than it was a few years ago.

A PM no longer needs to understand every implementation detail to get value from the codebase. They can search through it, ask questions about flows, understand where certain product behavior lives, and get a better feeling for how the system is actually structured.

And honestly, a lot of “product reality” lives in the codebase.

Things like permissions, validation logic, edge cases, API contracts, feature flags, background jobs, integrations, weird legacy assumptions, etc.

For me, this is not about taking ownership away from engineering. It is more about being able to ask better questions, understand constraints earlier, and not treat every technical topic as a black box.

Of course there is a line. PMs should not overstep, jump to implementation conclusions, or use AI coding tools to bypass conversations with engineers.

But I do think the rise of tools like Claude Code, Cursor and Codex changes the bar for what technical literacy can look like in product management.

Curious how others see this.

Should PMs have read access to the codebase?

And do AI coding tools make that more reasonable, or more dangerous?

## Comments

- **KapilNainani_** (63↑): I work with engineering and product teams every day. I have a strong opinion on this. The thing is, having access to something is not the important thing. What really matters is whether the product manager has information to use what they find without making mistakes.

AI coding tools have changed things a lot. They make it easier for product managers to understand things that they would have needed an engineer to explain before. For example a product manager can now find out where a feature flag is or why a certain API call works differently for accounts. They can get the answer themselves in a few minutes. This is really useful because they can ask questions when planning and they will not say "why can't we just" as much. They will also understand the limitations sooner before they become debates. These are all things.

There is a risk that we should talk about. AI tools can give you an answer that seems right. Is only partially correct. If a product manager searches the code gets an explanation from a tool like Claude Code or Cursor and then goes into a meeting with the engineers they might actually cause problems than if they had just said they did not know. The tool makes it easier to form opinions about how things work. It does not always make those opinions better.

What works well is when product managers use the codebase to come up with questions, not answers. For example they might say "I was looking at the permissions logic and I saw something can you help me understand if that is on purpose or just something old?" This is a better way to start a conversation than to come in with an answer already. The first way makes the engineers feel respected the second way makes them defensive.

The teams that do this well have an understanding of what the codebase access is for. They know it is for learning and understanding not for making decisions on their own. This needs to be said it cannot just be assumed.

So having access to the code with AI help. Yes that is okay.. Using it to avoid talking to the engineers. That is where it goes wrong no matter how good the tools are. Product managers should use the access to ask questions not to come up with answers, on their own.
  - **Pandas1104** (5↑): Completely agree, knowing and understanding are also two different things. We have a phrase " I know enough to be dangerous"
  - **cobramullet** (5↑): Thank you for this - your comment is enlightening and helps me understand my own journey with app creation (former tpm; unemployed and retooling).
  - **Emergency_Nothing686** (1↑): Ooh this is gold.  My main question has been "is Claude right about this" or "do we have a better approach than what it recommends" but both of those assume it's not totally off and better open-ended questions may not.
  - **mtn_coffee_drinker** (1↑): Agree, except that the PM going into the meeting causing problems based on a potentially wrong answer from AI is the fault of the PM not understanding AI limitations or having the soft skills to approach it correctly with the team. That PM likely caused issues arguing with engineers even without code access
  - **AaronMichael726** (1↑): Lmao. The “why can’t we just” will just go from “why can’t we just add this impossible feature” to “why can we just edit line 342 to make it faster?”
- **Skinny_Burrito** (62↑): I recently downloaded our code locally and use Claude to search and get answers for basic things. The engineers were extremely happy to help me with it because it means I don't ask stupid questions to them so often. But I do not have access to write code or push PRs and I believe this is the perfect balance. 

I will continue to make no decisions on how code should be written. But I can use AI to find information the engineers usually have to step away from what they are doing to research and help me.
- **bigcolors** (91↑): You… haven’t?

I came here to say that you should probably ship code sparingly since you’re not on the on-call rotation when it breaks. I didn’t realize the question was about reading, and I’m shocked to discover that “access to it” is even a question.
  - **bobby_table5** (10↑): Yeah, there’s a lot of questions you can answer with a rudimentary understanding of code, like “is that flag still mentioned in code” or when a method is called. Or more simply some internal parameters, like how many times people can do something.
    - **pydry** (1↑): provided the LLM doesnt misinterpret you or hallucinate.
  - **this--_--sucks** (3↑): You’d think that but our security guys have not given me read access yet and I’ve asked months ago and am an ex-dev (meaning they I know not to fuck with stuff I don’t know)….
    - **bigcolors** (9↑): I’m really sorry to hear that. I hope your eng counterpart can advocate on your behalf because (as an outside observer) this sounds unhealthy.
    - **Emergency_Nothing686** (2↑): yeah in some enterprises it's all the red tape.  I had to do Prod Support on a product without view access to Prod until I just kept repeating "I can't have my team fix what's wrong if I can't see what'a wrong"
  - **MericuhFuckYeah** (5↑): Yup. PMs who are asking this question now and not two years ago are extremely behind the game. Hell I was reading code as a support engineer even when it was a language I didn’t know. Ctrl f’ing a variable or an error message from the logs lets you at least rudimentarily understand what’s happening when debugging. Or trying to answer a customer or internal question…. 

Nowadays it’s at the level that I can ask a fully fleshed out question that might even take a couple hours out of my engineers time and Claude Code spits it out in 10 mins (with verification with my engineers ofc)
  - **HanzJWermhat** (3↑): PM’s should not ship code full stop. AI is not good enough to be left to its own devices especially on operations impact

But yeah code access seems essential unless you have a wildly good dev team who can explain stuff with ease.
    - **lobotomy42** (1↑): No one is talking about shipping code, the question is reading it?
    - **will-je-suis** (1↑): This is a very blanket statement. While this thread is about read access anyway, PMs being able to ship small changes is a big unlock. Let's the engineers focus on the big stuff without having to make every minor copy change for example if it's just as quick for to raise a PR as it is for them to write the ticket for the engineer to pick up.
- **trenhard** (11↑): Depends how technical the product manager is. It can be difficult to navigate a large codebase even with AI and make sweeping assumptions based on the wrong thing.
  - **yomerol** (0↑): 100%

If you're at a startup with a rather small code base where you can maybe contribute, sure but it depends if you can really understand code and the output of the cycle (code, unit tests, automation tests, branches, merges, etc etc etc). But medium to large codebases, nah, you don't need to. 

It's basic responsibility principles AND I know that most PdMs have no idea of coding and sdlc, some think it's just generate code and hit publish, like some sort of CMS (sure, i know teams who do that but that's not sdlc).plus if you put shit into LLMs you get shit out
- **lykosen11** (18↑): I would not accept a team which does not give PMs code access. 

I dont need to push PRs (I do but its not needed). But checking the code base saves hours and hours each week
  - **7thpixel** (2↑): Speaking of PR’s here’s how the VP of Product at Demandbase is doing it now https://www.precoil.com/how-i-tested-that/episodes/chad-holdorf
- **This-Temperature-922** (4↑): We recently took read access. Helps us create enhancement requirements in line with existing code, get sequence diagrams in line with existing architecture, and provide better requirements to tech. It also helps new PMs on the platform to inform themselves without disturbing the tech.
- **ScrufyTheJanitor** (4↑): Yes, PM’s absolutely should. My team is actually further on the AI train than the developers are. Having access to the git repo means my prototypes can be far more accurate to our existing product and account for established business logic under the hood. Using AI canvas tools without it can be really frustrating to get right and results in more manual refinement of the final PRD and/or the user stories.
- **AltKite** (9↑): I'm a VP of product - I suggested this to my Engineering counterpart. After a PM on my team was frustrated that to check some rules logic he had to put a spike in a sprint, have an engineer check what he wanted after he wrote clear reqs etc - a waste of everyone's time when he can just read the rules himself.

VP of engineering said no, you can't have read access. I'm not having your PMs find problems and not fix them - you can have read and write access if you pay for GitHub CoPilot licenses for your team. 

It's been fucking great. Things get done quicker, I have content writers in my team - they're editing aria labels themselves through ttheir IDE. 

Frontend code is a commodity now. AI writes perfectly acceptable code.
- **SifMeisterWoof** (3↑): Absolutely. I’m seeing at my org that the skill most great ICs have emerging the most is agency. This is key part of having agency.
- **TheKiddIncident** (3↑): Yes, of course.  

Even without AI, I always had read access to the code base.  Hell, at MSFT in the 1990's I could request code access as a field SE manager if I had a reason.  

As a PM, I may not use it, but I have the right to look.

Here is what changes with AI:

You really need to optimize your platform to the point that ANYONE can check out a sandbox, build a new prototype of a feature and have it work locally on their machine or in some other safe way.

No, you don't need to allow them to check in code, but yes, you do need to allow them to build prototypes.

Because they will anyway.

So, you only have two choices.  They either build prototypes that are safe and relatively compliant with your internal standards or they go to something like Lovable and YOLO.
