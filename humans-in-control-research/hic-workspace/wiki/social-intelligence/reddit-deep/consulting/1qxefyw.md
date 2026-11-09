---
id: social-intelligence/reddit-deep/consulting/1qxefyw.md
url: "https://www.reddit.com/r/consulting/comments/1qxefyw/what_ai_tools_small_boutiques_use_and_how_do_you/"
kind: "social-post"
source: "reddit-deep: r/consulting"
subreddit: "consulting"
title: "What AI tools small boutiques use and how do you handle security?"
author: "Gullible_Eggplant120"
date: "2026-02-06T10:49:41.000Z"
score: 8
upvote_ratio: 0.84
num_comments: 27
flair: ""
extracted_at: "2026-08-13T16:56:19.258Z"
extraction_method: "praw-deep"
research_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
chunks:
  - id: "social-intelligence/reddit-deep/consulting/1qxefyw.md#c0"
    char_span: [0, 1561]
    sentence_count: 10
    key_terms: [tools, like, lot, use, work, consulting, comments, curious]
    concepts: [tools, consulting, comments, curious, handle]
    token_count: 352
    sources: [{"n":"reddit-deep: r/consulting","u":"https://www.reddit.com/r/consulting/comments/1qxefyw/what_ai_tools_small_boutiques_use_and_how_do_you/"}]
  - id: "social-intelligence/reddit-deep/consulting/1qxefyw.md#c1"
    char_span: [1576, 3973]
    sentence_count: 21
    key_terms: [data, corporate, privacy, openai, azure, models, bedrock, clients]
    concepts: [corporate, privacy, openai, azure, models]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/consulting/1qxefyw.md#c2"
    char_span: [3975, 6052]
    sentence_count: 16
    key_terms: [data, firms, confidential, context, responsible-ai, client, openai, data-privacy]
    concepts: [confidential, firms, responsible-ai, context, data-privacy]
    section: Comments
    token_count: 412
  - id: "social-intelligence/reddit-deep/consulting/1qxefyw.md#c3"
    char_span: [6054, 8073]
    sentence_count: 18
    key_terms: [tools, data, security, around, client, screen, use, call]
    concepts: [tools, security, around, client, screen]
    related_chunks: ["social-intelligence/reddit-deep/consulting/1qxefyw.md#c5"]
    section: Comments
    token_count: 486
  - id: "social-intelligence/reddit-deep/consulting/1qxefyw.md#c4"
    char_span: [8077, 9827]
    sentence_count: 9
    key_terms: [data, work, api, deal, enterprise, anything, drafting, internal]
    concepts: [enterprise, anything, drafting, internal, openai]
    section: Comments
    token_count: 407
  - id: "social-intelligence/reddit-deep/consulting/1qxefyw.md#c5"
    char_span: [9829, 11838]
    sentence_count: 15
    key_terms: [security, data, tools, use, sensitive, controls, entirely, without]
    concepts: [security, tools, sensitive, controls, entirely]
    related_chunks: ["social-intelligence/reddit-deep/consulting/1qxefyw.md#c3"]
    section: Comments
    token_count: 380
---
# What AI tools small boutiques use and how do you handle security?

Source: [reddit-deep: r/consulting](https://www.reddit.com/r/consulting/comments/1qxefyw/what_ai_tools_small_boutiques_use_and_how_do_you/)
Posted by **Gullible_Eggplant120** · **8↑** · **27 comments**

We are a small firm (under 10 FTEs) doing work mainly for PE funds and their portfolio companies. A lot of our work is in deal context, and we handle tons of sensitive data.   

So far I have refrained from uploading confidential client data into AI tools, but I feel like we can't afford that anymore. Clients expect a lot of grunt work to be done very fast (and I don't blame them), and for some use cases modern AI tools are able to do wonders vastly increasing our productivity. I also feel like it is stupid when consultants themselves are not using frontier tools, and these days you have to be living in a forest if you are not using GenAI to some extent at least.     

I know that large consultancies have either their own internal tools or partnerships with LLM providers. I would be curious to hear what smaller firms do to leverage existing AI tools while not creating potential confidentiality breaches. There are several ideas that come to my mind, such as (a) ChatGPT enterprise tier (still doesn't seems very secure tbh), (b) leveraging Gemini since we already use G Suite for emails and storage, (c) deploying or renting our own server and running LLMs locally (sounds like a lot of effort though in terms of setup and support). Would be curious to hear what others think.

## Comments

- **Banner80** (8↑): You need a secure, approved pipeline. It's not hard to figure out and you only have to do it once when updating your tool array, and then every time you are considering adding a tool to the set.

I would 100% not use Gemini. Google is currently in a different class with their reckless disregard for data privacy. Even though Google does make SOME assurances for corporate accounts, I'm going to presume Gemini doesn't exist because if I'm looking to provide assurances to my clients then I'd rather work with companies that take privacy seriously as a principle.

You have the options of OpenAI and Anthropic solutions. If you go OpenAI, you can gain corporate-style access through the MS Azure cloud. This means the LLMs are installed on Azure servers and have no need to "call home" to OpenAI. At Azure, all services are corporate, so the data privacy protection is by default. Without having to touch any settings, none of your data is stored at Azure for AI training purposes, and nothing that happens with any account goes back to OpenAI for any reason.

If you go with Anthropic models, you can get service from the AWS Bedrock cloud services. It's basically the same arrangement as Azure: the Claude LLMs are installed at Amazon and the relationships is corporate-class by default, and none of your data goes back to the "home" to train AIs.

I said this as a starting point. You'd want to do research on your chosen tool and catalog the service agreement paperwork and specs about data security and pathways. Then you can draft an explanation for clients about how data privacy is assured.

What I tell my clients is that we have a corporate account to access OpenAI models, and/or use business apps that have the same arrangement. When processing client data, we don't go through the retail chat app. We use contracted API to access not only a corporate version of the chat AI but about a dozen AI models fit for various purposes, including models specialized for deep research and data analysis. The corporate API respects data privacy by default to law-office standards, under the assumption that the data being processed can and will be sensitive. Our data goes through a closed loop and only exists on AI servers for the time it takes to process our requests.  

Here is more reading:

[https://aws.amazon.com/bedrock/faqs/](https://aws.amazon.com/bedrock/faqs/)

[https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/data-privacy](https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/data-privacy)
- **Innovaiden_Dev** (4↑): The security question is real but I think the framing is slightly off. The bigger question isn’t “which AI tool is secure enough for client data” but “how much client data actually needs to touch an AI tool in the first place.”

Most of what small firms upload to AI tools is stuff they’re using to build context. Company background, industry dynamics, competitive landscape, regulatory environment. 

That information largely exists in public and semi-public sources already. If you can aggregate external signals before you ever touch confidential materials, you dramatically reduce the attack surface. You’re only feeding sensitive data into tools when you genuinely need synthesis on something proprietary.

To your specific options: enterprise tiers from OpenAI or Google are table stakes now, not differentiators. The data processing agreements are better than nothing but you’re still trusting a third party with client IP. Self-hosted models are viable if you have someone technical on the team, but the maintenance overhead is real and the models are behind frontier capabilities.

What I’ve seen work for firms your size: separate your workflow into “public context building” and “confidential analysis.” Use AI heavily for the first. Be surgical with the second. Your PE clients care about two things: (1) that you have a documented data handling policy you can show them, and (2) that you’re not dumping their portfolio company data into consumer-grade tools. Having that policy written down, even a one-pager, matters more than most firms realize.

The firms that get this right aren’t avoiding AI. They’re being deliberate about what data goes where and building their initial engagement context from external sources before confidential materials ever enter the picture.

This is how we’ve designed our framework essentially at Innovaiden for firms like yours.

Dritan Saliovski  | Innovaiden.com
  - **Plenty_Lawyer5407** (3↑): This is so AI generated!!
    - **airbnbnomad** (2↑): All their comments appear AI-generated.
  - **Normal_Syrup2247** (1↑): 👍
- **rdem341** (1↑): Choose a set of standard tools that your employees can use. Choose reliable vendors. A lot of the large LLM providers and tools have security compliance.

Look for: SOC 2, GDPRC, ISO 27001

Avoid tools that are not compliant or have security certificate.

Have policy around using AI tools (e.g. use only approved tools, human in the loop and etc...)

Have security policy around data (e.g. PI and PII data should not be uploaded anywhere, PI/PII data should be safely stored and etc...)
- **dsartori** (1↑): We’re a shop about your size and we run LLMs locally for privacy along with cloud stuff for certain use cases. For cloud use cases I buy inference from Nebius whose servers are located in Europe and therefore free of all the risk that comes with using US providers.
- **zeljezni_gal** (1↑): What is this... security you speak of?
- **Legitimate_Key8501** (1↑): This is such a real tension. We're in a similar position - small firm, deal context, tons of sensitive data flying around. The Azure/Bedrock API route that Banner80 mentioned is solid for the AI pipeline itself.  
  
But honestly, the thing that tripped us up wasn't the AI tools. It was everything around them. Like when you're on a screen share with Client A and you need to pull up a doc that has Client B's data in it. Or someone asks you to share your screen during a call and your browser has six tabs open with different deal rooms. The AI data pipeline is one attack surface, but your screen during any given video call is another one entirely.  
  
We ended up creating completely separate browser profiles per client engagement. Each one only has bookmarks, logins, and tabs for that specific deal. Switch profiles before any client call. Sounds basic but it eliminated the "oh shit wrong tab" moments during screen shares.  
  
For the AI piece specifically, we went the API route through AWS. The enterprise tier from OpenAI via Azure works too. The key for us was being able to tell clients "your data never hits a consumer-facing model" and actually mean it.  
  
What kind of deal work are you doing? CDD, VDD, or more operational?
  - **Gullible_Eggplant120** (2↑): Thanks for sharing, this is very helpful. We do mostly CDDs and sometimes portfolio work post close if we can show a strong value creation thesis to our client. It is all very relationship-based, and that is why we dont want to undermine trust by using the wrong tools.
- **GlitchAronwald** (1↑): The security question is real and I don't think there's a clean answer yet for PE/M&A deal work. A few things I've seen small firms do:

**What's actually safe to put in AI tools:**
- Anonymized or sanitized versions of work product for drafting/editing
- Industry research, frameworks, non-client-specific analysis
- Internal operations (proposals, engagement letters, internal comms)

**What's not (obvious, but worth stating):** Anything from a CIM, financial statements, or deal documents with company names/figures. The exposure risk isn't just the AI company's data policy — it's your client's perception if they ever found out.

**Practical setup for a sub-10 person firm:**
- Claude or GPT-4o with the "temporary chat" / "don't train on my data" settings (not a complete fix but a minimum)
- Azure OpenAI API (enterprise tier) if you want API access with stronger data processing agreements — costs more but gives you a contractual basis
- Local models (Ollama + LLaMA 3) for anything truly sensitive — nothing leaves your machine, zero cost, performance is surprisingly good for summarization/drafting

The local model option is underrated for this use case. Setup is an afternoon, and it solves the security concern entirely for document summarization workflows.
- **Ok_Injury1644** (1↑): Hey if anyone is interested in building an automation tool for a process that they're master in. I'm an SDE, currently working with AI. Lmk if anyone want to connect!
- **stealthagents** (1↑): It’s a tough balance for sure. Some smaller firms I know use AI for less sensitive tasks while keeping all client data strictly offline or in encrypted formats. Others create internal guidelines to filter what info can be used with AI tools, so they get some efficiency without risking breaches. It’s definitely a learning curve, but being strategic about it can help you stay competitive without compromising security.
- **NectarineAlarming639** (1↑): In the context of small consulting firms managing sensitive data, it is imperative to adopt AI tools judiciously while ensuring robust security measures. Your hesitance to upload confidential information into AI systems is entirely justified, considering the potential risks involved. 

Firstly, evaluating the security features of each platform is crucial. Tools like ChatGPT's enterprise tier indeed offer enhanced privacy controls, yet it is essential to conduct a thorough risk assessment tailored to your specific use cases. Secondly, leveraging existing infrastructure, such as Gemini integrated with G Suite, can facilitate a more secure environment for data handling, provided that appropriate access controls and encryption practices are in place.

Thirdly, while deploying a local server to run LLMs may seem daunting, it can offer the highest level of confidentiality if executed correctly. This option allows for complete control over your data and compliance with industry regulations. Ultimately, the decision should align with your firm’s unique operational needs and client expectations. I encourage you to further explore these avenues and share your findings
