---
id: social-intelligence/reddit-deep/productmanagement/1u5a9zc.md
url: "https://www.reddit.com/r/ProductManagement/comments/1u5a9zc/the_role_of_llm_inside_software_executing/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "The role of LLM inside software: executing workflows or a data assistant"
author: "Mobile_Spot3178"
date: "2026-06-14T03:33:04.000Z"
score: 14
upvote_ratio: 0.79
num_comments: 25
flair: "Tech"
extracted_at: "2026-06-18T13:35:35.642Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c0"
    char_span: [0, 2269]
    sentence_count: 15
    key_terms: [data, payroll, humans, sometimes, productmanagement, example, invoice, wrong]
    concepts: [payroll, humans, productmanagement, sometimes, example]
    token_count: 498
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1u5a9zc/the_role_of_llm_inside_software_executing/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c1"
    char_span: [2271, 4155]
    sentence_count: 9
    key_terms: [deterministic, non-deterministic, question, inputs, real, randomness, outcomes, because]
    concepts: [deterministic, non-deterministic, question, inputs, randomness]
    section: Comments
    token_count: 424
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c2"
    char_span: [4157, 5839]
    sentence_count: 16
    key_terms: ["it's", consumer, horse, llms, completely, industry, question, because]
    concepts: [consumer, completely, horse, industry, question]
    section: Comments
    token_count: 356
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c3"
    char_span: [5841, 7920]
    sentence_count: 19
    key_terms: [llms, understand, need, search, visual, ask, specific, problem]
    concepts: [understand, search, visual, specific, problem]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c4"
    char_span: [7922, 9715]
    sentence_count: 15
    key_terms: [case, use, quality, llms, boring, development, good, technology]
    concepts: [quality, boring, development, technology, algorithm]
    section: Comments
    token_count: 390
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c5"
    char_span: [9717, 11769]
    sentence_count: 15
    key_terms: [reversible, invoice, payroll, irreversible, error, human, keep, assistant]
    concepts: [reversible, invoice, payroll, irreversible, error]
    section: Comments
    token_count: 459
  - id: "social-intelligence/reddit-deep/productmanagement/1u5a9zc.md#c6"
    char_span: [11771, 12404]
    sentence_count: 6
    key_terms: [decision, boundary, failure, product, having, human, human-in-the-loop, specifically]
    concepts: [decision, boundary, failure, product, having]
    section: Comments
    token_count: 124
---
# The role of LLM inside software: executing workflows or a data assistant

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1u5a9zc/the_role_of_llm_inside_software_executing/)
Posted by **Mobile_Spot3178** · **14↑** · **25 comments**

I'd like to hear from people who build AI embedded into their own systems. Especially those systems, that are mission-critical. I recently got pulled into a project where the agenda was "the users of a payroll system X want AI, so we should see about automating payroll/bookkeeping and payments with AI/agents". I researched the market and found out, some companies tried fully automating accounting/payroll, but eventually humans had to try and fix too much stuff for it to be fully automated. Then after researching the problem itself, I'm left with some questions that haunt me:

* LLMs are not deterministic. AI makes mistakes, sometimes very big ones, while being very confident about the decision. Humans of course, make mistakes too. But debugging why AI did something at a given time seems almost impossible. Sort of a black box.
   * Example: AI sometimes invents entries, accounts etc.
* The security risks of full automation became clear from the start. If AI approves invoices, payroll, payments it's much easier to "hack" that automation with fraudulent data and nobody will know until probably a very long time. AI seems to be very confident an invoice or payment looks good based on the data it has, but a human user very quickly has a sense that "this doesn't seem right, what invoice is this?".
   * Example: AI approves a huge invoice, but it didn't have the discounts discussed
* AI also interprets laws and regulations sometimes with old or wrong information. Of course, humans do that too.
   * Example: AI booked revenue for wrong periods

So when users say "I gave Claude my data and it did my accounting in 2 minutes, why the hell are you not doing it as well?" all I can think of is: Yes, definitely. But what is the cost and risk?

Personally, I'd be happy to have AI as a Rockstar Assistant who has a human-in-the-loop, who crunches data like never before, helping me make and fellow humans make decisions. But I might be very wrong, not seeing true potential.

**My question to product people with similar problems: what is the role of AI, specifically LLMs in your view? can and should it execute automatically and automate entire sectors?**

## Comments

- **darkstar3333** (22↑): Is this a real question?

Deterministic outcomes require deterministic solutions.

If you deposited money into an ATM and you had 90% chance a deposit was registered, would you take that risk?
  - **HustlinInTheHall** (2↑): If you have deterministic inputs and deterministic outputs then just use a deterministic tool. 

AI is most useful when you have non-deterministic inputs and outputs, like conversations, natural language queries, requests for analysis with unclear parameters, or broad goals with lots of unresolved questions ("make me a weather app") that the LLM can take multiple steps, gather info, build, refine, etc.
  - **Final-Mycologist2601** (1↑): The ATM analogy assumes the alternative is deterministic perfection, but payroll today isn't deterministic either because humans make mistakes. The real question is whether AI improves outcomes when combined with controls, audits, and human oversight, not whether it can replace them entirely.
    - **EngineerFeverDreams** (3↑): That's a terrible explanation of deterministic. 

Deterministic means if I give it the same inputs I will get the same output. Unless a human coded randomness into the system, it's deterministic. AI is non-deterministic because it's completely based on randomness.
    - **International_Day_83** (2↑): At least that you can trace but LLM mistake will be a black box
  - **i-love-chicks** (0↑): I thought I was reading an ai post or this person doesn't even Product.
  - **Disastrous_Craft8593** (-4↑): Is this a real comment?
- **lily_de_valley** (13↑): I have built several POCs with LLMs and personally use different tools in my workflows. Here is my current stance:

Right now, the biggest problem I have seen from fellow PMs is this -- they seem to entirely ignore the very issues you mentioned. Many in product leadership roles simply don't have a good technical understanding of the technology to realize that hallucination isn't a bug, it's a feature. It's how LLMs return responses and not because the currrent LLMs are not good enough. Even the latest models from Anthropic still hallucinate regularly, people just don't catch all of the instances. For context, I work on cars. To defend AI usage, someone claimed cars made horse breeders disappear so it's only natural AI will be more popular. They got this info from ChatGPT. And it's completely wrong -- horse breeding is still thriving and a $3 billion industry. But this person doesn't know the first thing about horse so they couldn't realize the information is completely fabricated. You see where I'm going?

After having built several POCs at my company, utilizing Gemini specifically, I 
have come to the simple conclusion that this thing shan't be put into a consumer product in the near future. As a developer tool, it works fine, but it works fine because in the event that it doesn't, developers can see that something is wrong and they know how to fix things. You can't say for the same things for consumers and consumer products. There is a level of standard of quality and stability required, especially in my industry, and LLMs have failed to meet these requirements. So the big bosses are also quietly stepping away from the AI, except for Dev tools. 
Consumer safety is a huge topic -- we can build whatever we want, that's not the question, but the question is should we? 

I personally only trust LLMs for very low stake tasks where I am enough of expert in to know where it starts to hallucinate. And you may think, well, put guardrails, constraints, and systems in. We did, it still hallucinates or it only returns a visual proximate of what we need. The more you ask of it, the worse it performs, the less likely you'll be able to catch hallucinations. The best way to use LLMs is within a specific task and with predetermined context. What output you require from it also extremely important. LLMs aren't great with visual outputs but do fine when asked to make a list and return search results. So basically, don't ask it to create a visual manual of how to fix your car, but you can create a semantic search experience where it can understand natural language and dig up what you need from a large database WITHOUT asking the LLMs to rewrite the data. Basically, find me what I need, give it to me, but don't tell me about it. Otherwise, the non-deterministic nature of LLMs is a really difficult issue to overcome. Search results can return multiple items, hence, it's fine for a SLM or a LLM. But if you ask an AI assistant to turn the light off 10 times and it only does it 8 out 10, you have a defect. 

Hallucination also seems to happen when LLMs need to understand and re-tell information (because it doesn't actually understand shit). This is what Apple struggles with when they launched the news and text summary features. For consumer product, the less it has to do, the more reliable it is.
  - **Final-Mycologist2601** (1↑): Well put.
- **Bernhard-Welzel** (3↑): The role of LLMs is the same as machine learning: for a very specific, tiny problem you can build remarkable solutions.

What does not work and might never work is the magic "do the accounting" tech demo that OpenAI & Co are trying to sell us. It is a lie. I also assume that LLMs cannot reach AGI, as the technology is a dead end. The fundamental flaw of being autocomplete on steroids cannot be fixed, regardless of how much memory and compute is thrown at the problem.

What **works really well:** define the process, break it down into small steps solving specific problems, and then pick the right technology for each step. For most steps, it is classical programming in a boring language. 

So the question is, what technology is best for each problem you want to solve?

Turns out, for almost every task a LLMs is being ~~used~~ abused for today, some boring old algorithm exist that will do it better.

What LLMs are great at is generating AI slope (this might be the only use case, actually). Now, with the right pipeline, you can turn this slope into source code. To make it useful source code, you need more pipeline and compute. It seems this is a good use case and i am very optimistic it will change development forever in a ***good way****.*   
  
Another use case is processing of large amounts of unstructured information. See: scientific research. 

But making it work in a typical B2B or B2C use case? That is hard. Specially as the foundation models are constantly evolving, and the quality is unpredictable.

My approach:

1. figure out what "quality" means for your use case  
2. figure out how to control the quality automatically  
3. plug in a LLM and see if it is capable to deliver the expected quality

This works very well, but it is also ... boring. LLMs are just another algorithm in machine learning. LLMs are not AI, they just perform an impressive magic trick and can convince people that there is intelligence where only autocomplete exists.
- **HustlinInTheHall** (2↑): The main thing people miss with LLM development is they want to replicate the experience of using a chat interface and getting a good enough response most of the time in a single pass, but when you get a bad response you detect it and ignore it and try again. 

If your use case can not tolerate an error ~1% of the time, then a single pass system is a terrible design choice. But you can shrink the error rate dramatically by using multi pass approaches at the cost of some latency. And most systems that rely on humans to do a thing already deal with .01% error rates because that is typical for people.
- **Bitter_Big4525** (2↑): I’d draw the line at reversible vs irreversible actions. Let the LLM suggest and pre-fill, but keep a human click for money movement, payroll, or anything hard to unwind.
- **GeorgeHarter** (1↑): Don’t try to automate a whole process.   
Start with a tedious task within a process. When AI does that reliably, move to another task in the flow. Keep humans doing the verification steps. 

Instead of starting with “AI approves a huge invoice” start with AI parses an invoice and presents an easy to review summary, along with the invoice, to a user to validate.   
As the user validates, add rules and references to the markdown files the agents will rely on for subsequent instances.
  - **darkstar3333** (1↑): That's not even "AI", we've had useful and repeatable OCR for 30-40 years.

Its a commodity
- **nkondratyk93** (1↑): nah, false binary imo. the real question is what happens when it’s wrong or unavailable. in payroll, that’s catastrophic. best setups I’ve seen treat it like a team member with a human sign-off on anything touching money.
- **SamfromLucidSoftware** (1↑): It’s totally possible to have AI as your rockstar assistant. The big question here is clarifying which decisions in the workflow are reversible and which ones are not.

For example, aggregating data, flagging anomalies, drafting entries for review, surfacing discrepancies are totally reversible, and AI actually excels in those. You can have your AI assistant handle these. And on the other hand, your irreversible decisions such as approving payments, running payroll and booking revenue to a period, keep these to yourself or another human in the mix. Far less risk or errors and hallucinations.

But I think this issue, in general, has more to do with failure in product design than failure in AI capability. Specifically, most AI-embedded workflows don’t make the human-in-the-loop boundary clear. So when something goes wrong, nobody knows why such a decision was approved and who’s responsible for it. A workaround here is having AI surface the decision and having a human own it.

We’ve been spending quite a bit of time on that decision boundary and which steps in a product workflow require human judgment versus which can safely be handed off.

How are you currently thinking about drawing that line in the payroll system?
