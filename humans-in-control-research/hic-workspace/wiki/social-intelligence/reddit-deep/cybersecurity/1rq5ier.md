---
id: social-intelligence/reddit-deep/cybersecurity/1rq5ier.md
url: "https://www.reddit.com/r/cybersecurity/comments/1rq5ier/10_years_of_dfir_i_just_did_my_first_ever/"
kind: "social-post"
source: "reddit-deep: r/cybersecurity"
subreddit: "cybersecurity"
title: "10+ years of DFIR... I just did my first ever forensic audit of an AI system"
author: "QoTSankgreall"
date: "2026-03-10T18:45:07.000Z"
score: 276
upvote_ratio: 0.95
num_comments: 39
flair: "Corporate Blog"
extracted_at: "2026-06-20T17:52:50.766Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic outlook report on the global insurance industry in 2026, analyzing how AI adoption, emerging technology trends, and macroeconomic pressures collectively reshape coverage structures and consumer perception."
engagement: "deliver-a-strategic-outlook-report-on-the-global-insurance-i"
chunks:
  - id: "social-intelligence/reddit-deep/cybersecurity/1rq5ier.md#c0"
    char_span: [0, 2385]
    sentence_count: 18
    key_terms: [model, data, forensic, platform, needed, cybersecurity, organisation, dfir]
    concepts: [model, forensic, platform, cybersecurity, organisation]
    token_count: 509
    sources: [{"n":"reddit-deep: r/cybersecurity","u":"https://www.reddit.com/r/cybersecurity/comments/1rq5ier/10_years_of_dfir_i_just_did_my_first_ever/"}]
  - id: "social-intelligence/reddit-deep/cybersecurity/1rq5ier.md#c1"
    char_span: [2387, 3927]
    sentence_count: 7
    key_terms: [how-to-investigate-ai-system-failure, https, s41586-024-07421-0, www, analystengine, able, work, different]
    concepts: [how-to-investigate-ai-system-failure, s41586-024-07421-0, https, analystengine, different]
    token_count: 333
  - id: "social-intelligence/reddit-deep/cybersecurity/1rq5ier.md#c2"
    char_span: [3941, 4974]
    sentence_count: 4
    key_terms: [qotsankgreall, settings, inference, context, process, potkettleracism, ok-intern-8921, particularly]
    concepts: [qotsankgreall, settings, inference, context, process]
    section: Comments
    token_count: 269
  - id: "social-intelligence/reddit-deep/cybersecurity/1rq5ier.md#c3"
    char_span: [4976, 7024]
    sentence_count: 14
    key_terms: [model, information, because, prompt, qotsankgreall, leak, analysis, deployed]
    concepts: [model, information, qotsankgreall, because, prompt]
    section: Comments
    token_count: 464
  - id: "social-intelligence/reddit-deep/cybersecurity/1rq5ier.md#c4"
    char_span: [7026, 8893]
    sentence_count: 17
    key_terms: [did, llm, interesting, like, different, something, sandbox, charming-macaron7659]
    concepts: [interesting, different, something, sandbox, model]
    section: Comments
    token_count: 412
---
# 10+ years of DFIR... I just did my first ever forensic audit of an AI system

Source: [reddit-deep: r/cybersecurity](https://www.reddit.com/r/cybersecurity/comments/1rq5ier/10_years_of_dfir_i_just_did_my_first_ever/)
Posted by **QoTSankgreall** · **276↑** · **39 comments**

I spent most of my career building forensic platforms to support IR engagements, so I'm used to dealing with complex data types and strange systems.

But last week I came across something I hadn't seen before: a customer needed a forensic review of a self-hosted AI platform. It wasn't hacked, there was no intrusion, but it had made a mistake. It had delivered policy advice to an employee that was the basis of an action that ended up causing material damages to their organisation.

This spawned a lot of discussions about liability. Lawyers were involved. But this wasn't actually why I was approached. Instead, the reason was that this organisation claims that the issue had been fixed - that the erroneous information it had generated wouldn't be repeated by their AI platform again.

Except now no one believes them, and they're finding it difficult to prove otherwise.

This was a pretty exciting project for me, so here was the process I followed. Some of it is standard DFIR practice, some of it was completely bespoke.

**- First I isolated the systems and preserved all the available telemetry.** I'm used to dealing with SIEMs, and in this case the logs were stored in S3 buckets. No big deal, but I did have to take the extra step of auditing their platform code to model exactly what events were being generated.  
  
The logging ended up being quite verbose, which any DFIR person will know is half the battle.

I also had to ensure I grabbed a copy + hash of their model weights, and did some work with the logs to prove that the model I had captured was the model that served the erroneous response.

**- Secondly, using the logs and code audits, I mapped out the full inference pathway** and reconstructed a testing system with the necessary components. This effectively meant building an Elastic database and re-indexing relevant source data.

This was a sandbox environment with all the original data intact. This step of the process took the majority of time, not really for any complex reason, it just took ages to understand what needed to be built and what data we needed to capture.

**- Once the sandbox was in place, all I wanted to do now was replicate the failure.** I had been able to reconstruct the exact query and inference settings from my previous work, and after many iterations of testing I was able to exactly replicate the initial issue.

**- From here, I could start doing the main bulk of the work** \- which is trying to understand exactly how and why this error was produced.

One of the most helpful techniques I used was semantic entropy analysis based on this article: [https://www.nature.com/articles/s41586-024-07421-0](https://www.nature.com/articles/s41586-024-07421-0)

This was all Phase 1. Phase 2 was verifying that their new model wasn't making the same mistake - but because I had already replicated the environment entirely within a sandbox and had formed my theories about what went wrong initially, this was actually pretty trivial.

But it was also the bit I found most fun. I was effectively brute forcing different inference settings and context arrangements from the original query, following which I could reliably claim that the original error wasn't repeating - and I was also able to provide some insight into whether an issue like this would come up again on something different.

My theory is that we're going to see more and more of this sort of work!

I've written up a playbook based on this experience for those interested: [https://www.analystengine.io/insights/how-to-investigate-ai-system-failure](https://www.analystengine.io/insights/how-to-investigate-ai-system-failure)

## Comments

- **Ok-Intern-8921** (23↑): thats wild cant believe you replicated the AI failure so smoothly 👍
  - **QoTSankgreall** (21↑): It didn’t feel smooth 😂 for context, took me about 8 days of work. But I think I could do it quicker next time now.
    - **potkettleracism** (7↑): Now you get to write the process down and use it as a standard process for future cases!
- **SteIIarNode** (12↑): Very interesting! I’m curious how the liability worked out for the customer too lol
  - **QoTSankgreall** (21↑): Will let you know in a year or two when it gets out of the courts :P
- **jbl1** (6↑): If you had to venture a guess, how many different versions of inference settings and context arrangement do you think you tried before it was all said and done?
  - **QoTSankgreall** (8↑): 😂 luckily most of the inference settings were captured via logs (thankfully including the seed, otherwise this may have been much more challenging). The permutation space on the remaining settings wasn’t particularly huge, and mostly set to defaults anyway. 

The context arrangements were a tad problematic because the prompt template had changed a few times and there wasn’t version control. Only the variables were logged, but not the entire prompt. But we ended up finding an old version someone had cached.
- **BreizhNode** (3↑): The logging being verbose is honestly the part that saved you here. Most self-hosted AI deployments I've seen have zero observability, just the model + a thin API wrapper. No prompt logging, no retrieval chain tracing, nothing you'd need for post-incident analysis. Curious if the model weights hash matched what they claimed was deployed at the time of the incident?
  - **QoTSankgreall** (2↑): They didn’t have a hash of what they claimed was deployed, but the fact I was able to exactly replicate the issue with the same input parameters is strong evidence that it was the same model. And in addition I was able to evidence through metadata and system logs that the model hadn’t changed weights since before the incident occurred.
- **HerbOverstanding** (4↑): This is awesome — thank you for sharing!
- **I-am-Mojo-Jojo** (3↑): Very fascinating. I have always been interested in DFIR work. Would love to see more analysis of AI models like this.
- **cant_pass_CAPTCHA** (2↑): Any takeaways for things to check as a pentester? If it can leak on accident, then it'd be interesting to see how far you could take it with active exploitation. I haven't come into contact with many AI powered web apps, but I know they're coming.
  - **QoTSankgreall** (4↑): This is actually a key thing to clarify, because the model didn't "leak" - as in, it didn't divulge information it wasn't supposed to. It made up incorrect information, which was acted upon by a user who trusted the source (and that was their mistake not to verify).

It's a little different in this case because this was an internal platform, it wasn't public. So there's both implicit trust that users won't attack the platform AND the fact that these users are authorised to view any information it did leak anyway.

But hallucinations like this do cause material losses, and they can and should be stress tested. One of the things I learned from this engagement was that I was able to model exactly where the LLM started to break down and hallucinate. Most people right now know that it's an issue, but don't actually model where those limits are.

When you know, you can put additional guardrails in place to actually detect LLM responses that are potentially hallucinated. You effectively train an ML to recognise "drift" in the LLM's usual response.

The work I did here was not really pentesting, but the lines do get pretty blurry, because part of what I had to do to create the detection ML was to use an adversarial AI to test how the target LLM replied to different types of prompts.
    - **Educational_Door_446** (2↑): Was the flaw with the hallucination something that should really have been a function/code calculated number instead of parsed through an LLM ? Or something where rag failed? 
Or more generalised than that?
- **Charming-Macaron7659** (2↑): One interesting thing about cases like this is that the investigation doesn’t stop at reproducing the bug.

If lawyers or insurance get involved later, the question shifts to whether the logs and telemetry you used can actually be trusted months down the line.

A lot of systems have great logging for debugging, but not necessarily for evidence. Those are two very different requirements.
- **TheF-inest** (2↑): Interesting... To replicate or sandbox things did you build out the infrastructure or did someone else? Who's paying the cost of keeping that sandbox running while you poke around?
  - **QoTSankgreall** (1↑): I did. And the customer paid. It’s not expensive? But I also have my own hosting setup for situations like this.
- **Otherwise_Owl1059** (2↑): Amazing job and write up.  Thank you for sharing!
