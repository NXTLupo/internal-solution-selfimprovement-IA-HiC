---
id: social-intelligence/reddit-deep/deeplearning/1pi6cit.md
url: "https://www.reddit.com/r/deeplearning/comments/1pi6cit/llmops_is_turning_out_to_be_harder_than_classic/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "LLMOps is turning out to be harder than classic MLOps, and not for the reasons most teams expected."
author: "Typical_Implement439"
date: "2025-12-09T12:37:55.000Z"
score: 49
upvote_ratio: 0.85
num_comments: 22
flair: ""
extracted_at: "2026-05-11T17:26:50.049Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research, enterprise_it]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/deeplearning/1pi6cit.md#c0"
    char_span: [0, 1067]
    sentence_count: 18
    key_terms: [deeplearning, performance, evaluation, comments, single, teams, call, uncomfortable]
    concepts: [deeplearning, performance, evaluation, comments, single]
    token_count: 245
    sources: [{"n":"reddit-deep: r/deeplearning","u":"https://www.reddit.com/r/deeplearning/comments/1pi6cit/llmops_is_turning_out_to_be_harder_than_classic/"}]
  - id: "social-intelligence/reddit-deep/deeplearning/1pi6cit.md#c1"
    char_span: [1081, 3229]
    sentence_count: 22
    key_terms: [llm, don, like, phenomenon, documents, gibonfrog, pipeline, problems]
    concepts: [phenomenon, documents, gibonfrog, pipeline, problems]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/deeplearning/1pi6cit.md#c2"
    char_span: [3231, 4489]
    sentence_count: 12
    key_terms: [different, product, output, error, eol, assistance, friction, answers]
    concepts: [different, product, output, assistance, error]
    section: Comments
    token_count: 274
  - id: "social-intelligence/reddit-deep/deeplearning/1pi6cit.md#c3"
    char_span: [4492, 6549]
    sentence_count: 11
    key_terms: [prompts, code, like, problem, evals, use, assertions, versioning]
    concepts: [prompts, problem, assertions, evals, versioning]
    section: Comments
    token_count: 481
  - id: "social-intelligence/reddit-deep/deeplearning/1pi6cit.md#c4"
    char_span: [6551, 8227]
    sentence_count: 11
    key_terms: [like, frameworks, managing, change, maleficent-wafer-243, tools, add, non-determinism]
    concepts: [frameworks, managing, change, tools]
    section: Comments
    token_count: 344
---
# LLMOps is turning out to be harder than classic MLOps, and not for the reasons most teams expected.

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1pi6cit/llmops_is_turning_out_to_be_harder_than_classic/)
Posted by **Typical_Implement439** · **49↑** · **22 comments**

Training is no longer the main challenge. Control is. 

Once LLMs move into real workflows, things get messy fast. Prompts change as products evolve. People tweak them without tracking versions. The same input can give different outputs, which makes testing uncomfortable in regulated environments. 

Then there is performance. Most LLM applications are not a single call. They pull data, call tools, query APIs. Latency adds up. Under load, behaviour becomes unpredictable. 

The hardest part is often evaluation. Many use cases do not have a single right answer. Teams end up relying on human reviews or loose quality signals. 

Curious to hear from others. What has caused the most friction for you so far? Evaluation, governance, or runtime performance?

## Comments

- **pornthrowaway42069l** (31↑): \- Just use LLMs to parse these documents!

\- We have thousands of precise documents, how do we ensure that all numbers are correct?

\- Just use another LLM to check!

\- But... how can we be confident that the second LLM isn't hallucinating?

\- Look, I've put 3 examples into chatgpt, it one shotted them, you are overthinking this

\- ...

Average convo w/ clients/managers. No one knows what they are doing, so I just end up writing my own versioning/whatever tools.

And also lots of simplifications. LLM doesn't need to do 95% operations - it only needs to be precise extraction/response tool in a programatic pipeline, not be a foundational layer for that pipeline.
- **GibonFrog** (9↑): LLM written text.
- **GibonFrog** (8↑): holy ahit, thw submitted text and most of the comments here are LLM generated
  - **[deleted]** (9↑): Seems like your usual 2025 “stealth” ad scheme
- **[deleted]** (4↑): People aren’t “discovering deep truths about LLMOps.” They’re inventing problems because it flatters their job title. The post reads like someone skimmed a few vendor blogs, mashed the buzzwords together, and decided they’d uncovered a grand unifying theory of why everything is hard.

Training isn’t the challenge? Control is? Nonsense. The real issue is teams that don’t understand what they’re using. If you treat prompts like sacred scrolls instead of code, of course you get chaos. If you don’t version them, don’t monitor them, don’t measure anything, what exactly did you think would happen? That the model would pick up the slack for your missing engineering discipline?

Then the hand-wringing about latency. Every system that chains external calls has latency problems. That isn’t an LLM phenomenon. That’s a “we architected it like a Rube Goldberg toy and now the laws of physics are rude to us” phenomenon.

Evaluation? Again, not new. Humans have been building systems with fuzzy outputs since forever. Search engines, recommendation systems, fraud models, forecasting tools. The only difference now is people want magic answers without doing the boring part: defining success and measuring it.

So the friction isn’t evaluation, governance, or runtime performance. The friction is people pretending LLMOps is some mystical discipline instead of basic engineering habits they never learned.
  - **not-at-all-unique** (2↑): The problem is that you can ask the exact same question and get different answers. 

For example, use an LLM with ability to use internet search. 
Ask if a product is eol 

In one session the model has told me that product is EOL, is unsupported since last year. And I should consider a different product. 

The same model, different session open in a different browser says the product is not EOL and will receive updates for the next two years. 

One of these answers is a hallucination. - they cannot both be true. 

This isn’t an issue of versioning the prompt, the prompt was identical. 
It’s not what you’d typically call a fuzzy output. As you gave the example of fraud, that is an output in a given error range based on evaluated criteria. Within fairly well defined error bars for given context/situation, (e.g number of fraud markers.) 

When the error bar is 100%, the output is useless. 

If evaluating the answer means researching and doing the same work as I would do without assistance, it’s pretty poor assistance! 


You could argue (and I’d agree) that asking questions with a ‘hard truth’ is a bad use case for an LLM, that the system is much better at ‘filler’ than facts, but that is very different from pretending that it’s all user error at the input that could be fixed by versioning prompts.
    - **wahnsinnwanscene** (1↑): Does this still happen for the larger models? For tool driven replies I'd expect better results. Maybe it's a search engine result ambiguity?
  - **pegaunisusicorn** (1↑): is that not oversimplifying?  it truly depends on the complexity of the problem the AI is being called on to solve.
- **Single_Vacation427** (1↑): Evals are a problem but the vendors out there are all full of s\*\*\*. That braintrust that wants to be a "player" has the worst prompts I've seen in their open source evals. All vendors are trying to sell you their product as a problem solver when it'll just create more problems. And much of the blog posts and 'courses' out there are for very small scale number of users; once you have your product at scale and need to do monitoring, good luck. Not only you'll need lots of people to set it up, it's going to be expensive.
- **RogBoArt** (1↑): It seems to me like control has always been the issue. I was integrating LLMs into python scripts and similar as far back as gpt3 and I've never been able to reliably get it to stop occasionally including an "OK here's my response:" or something like that.
- **pvatokahu** (1↑): With proper version control of prompts + code combined with testing and evaluations, LLMOps looks more like DevOps and standard software engineering than ML Ops. 

Git already exists to manage code versions and can be used effectively for prompt versioning as well as long as you use a pr or manager to abstract out the prompts from rest of code. 

There’s open source tools like monocle2ai from Linux foundation that help in testing with non-deterministic outputs using traces based assertions. 

You can use them with evals based assertions to prevent regressions as your prompt/code evolves. 

You can do performance testing, root cause identification with SRE tools like Okahu or Data Dog.
- **Maleficent-Wafer-243** (1↑): I once heard an entrepreneur talk about how he gradually let go of parts of his business. Each time, he went through the same stages:
instruction → coaching → discussion → delegation → full autonomy.

I feel that large language models might also need to grow following a similar paradigm.
- **Gold_Emphasis1325** (1↑): Often too many frameworks that fail to serve as a skill gateway for the diverse expertise actually needed to do the full-stack actual job managing the pipeline and services. Said frameworks also abstract away from security, configuration and make troubleshooting murky. House of cards in the basic framework space.
- **The_NineHertz** (1↑): This really hits home. What caught me off guard is how quickly LLM systems turn *stateful*. The moment you add retrieval, tools, retries, or memory, you’re no longer managing a model; you’re running a distributed system with a probabilistic component at the center.

Evaluation is where this becomes obvious. “Right vs wrong” doesn’t scale, so teams end up evaluating intent preservation, hallucination risk, or confidence calibration instead. That helps, but governance still struggles when prompts change faster than review cycles.

Runtime issues add another layer—latency, timeouts, and partial tool failures don’t just affect speed, they subtly change outputs, which makes reproducibility tricky in production.

LLMOps feels less like classic MLOps and more like building guardrails, observability, and feedback loops that assume non-determinism rather than trying to eliminate it.
