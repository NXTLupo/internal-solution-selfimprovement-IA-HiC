---
id: social-intelligence/reddit-deep/openai/1mqydr4.md
url: "https://www.reddit.com/r/OpenAI/comments/1mqydr4/gpt5_api_injects_hidden_instructions_with_your/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "GPT-5 API injects hidden instructions with your prompts"
author: "Agitated_Space_672"
date: "2025-08-15T13:48:50.000Z"
score: 294
upvote_ratio: 0.93
num_comments: 76
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.350Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1mqydr4.md#c0"
    char_span: [0, 1280]
    sentence_count: 11
    key_terms: [oververbosity, instructions, api, confirmed, analysis, comments, desired, injects]
    concepts: [oververbosity, instructions, confirmed, analysis, comments]
    token_count: 284
    sources: [{"n":"reddit-deep: r/openai","u":"https://www.reddit.com/r/OpenAI/comments/1mqydr4/gpt5_api_injects_hidden_instructions_with_your/"}]
  - id: "social-intelligence/reddit-deep/openai/1mqydr4.md#c1"
    char_span: [1294, 2931]
    sentence_count: 20
    key_terms: [prompt, always, openai, kathilliana, api, car, gets, "it's"]
    concepts: [prompt, always, openai, kathilliana, guardrails]
    section: Comments
    token_count: 378
  - id: "social-intelligence/reddit-deep/openai/1mqydr4.md#c2"
    char_span: [2933, 4840]
    sentence_count: 10
    key_terms: [katalogical, https, com, kathilliana, oververbosity, dashboard, chatgpt, harmony]
    concepts: [katalogical, https, kathilliana, oververbosity, dashboard]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/openai/1mqydr4.md#c3"
    char_span: [4844, 6780]
    sentence_count: 10
    key_terms: [oververbosity, prompt, stunning-ad-2433, capabilities, comparative, chatgpt, tableau, bullet]
    concepts: [oververbosity, prompt, stunning-ad-2433, capabilities, comparative]
    section: Comments
    token_count: 475
  - id: "social-intelligence/reddit-deep/openai/1mqydr4.md#c4"
    char_span: [6782, 7976]
    sentence_count: 6
    key_terms: [instructions, prompt, use, available, router, system, reverse-engineering, model]
    concepts: [instructions, prompt, available, router, system]
    section: Comments
    token_count: 327
---
# GPT-5 API injects hidden instructions with your prompts

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1mqydr4/gpt5_api_injects_hidden_instructions_with_your/)
Posted by **Agitated_Space_672** · **294↑** · **76 comments**

The GPT-5 API injects hidden instructions with your prompts. Extracting them is extremely difficult, but their presence can be confirmed by requesting today's date. This is what I've confirmed so far, but it's likely incomplete.

Current date: 2025-08-15 You are an AI assistant accessed via an API. Your output may need to be parsed by code or displayed

Desired oververbosity for the final answer (not analysis): 3

An oververbosity of 1 means the model should respond using only the minimal content necessary to satisfy the request, using concise phrasing and avoiding extra detail or explanation.
    An oververbosity of 10 means the model should provide maximally detailed, thorough responses with context, explanations, and possibly multiple examples.
    The desired oververbosity should be treated only as a 
    *default*
    . Defer to any user or developer requirements regarding response length, if present.
     Valid channels: analysis, commentary, final. Channel must be included for every message.
     Juice: 64

## Comments

- **Kathilliana** (137↑): Yes. I'm currently writing an article about how a prompt gets stacked before it gets tokenized.

When you type "What was the most popular car in 1982?" The LLM then goes and gets system instructions set by OpenAI, then your core, then your project, then your persistent memories and finally your prompt.

Your prompt looks something like this: (This is WAY stripped down to provide example.)  You are GPT5, your training date is X. No em dashes. Do not say "it's not X it's Y." Always prioritize reputable sources over fringe. This project is about cars. You are a panel of simulated car designers, engineers, mechanics, etc. What was the most popular car inn 1982."
  - **Agitated_Space_672** (41↑): This was in the API with no tools enabled, just a plain text prompt. Can you point me to some openai writing on this? A search for 'oververbosity' yields nothing in their docs.
    - **Kathilliana** (31↑): Yes; sorry. I did misunderstand. I’ve been explaining how stacked prompts work so many times; I just overlooked it. Apologies. I haven’t dug into APIs, yet. The sys layer is always there, though. The prompt always starts with developer guardrails. You cannot turn it off.
    - **CrazyFaithlessness63** (6↑): OpenAI are unlikely to document exactly what they do to the prompts you provide before they get passed to the actual model. It's proprietary information and releasing it would make it easier for people to bypass guardrails or perform prompt injection.

I am surprised they insert the current date in the API (it makes sense for the chat interface, the API should allow more user control though).

Basically for any LLM API (OpenAI, Google, Anthropic) assume the provider is modifying your prompt.
    - **coloradical5280** (10↑): That’s just how model calls work, go look at what happens with gpt-4
    - **En-tro-py** (4↑): https://github.com/openai/harmony <- it's likely they are now using a version of this for GPT-5 as well.
  - **Mitzah** (2↑): Mind sharing the article link when it's available? 🙂
    - **Kathilliana** (3↑): [https://katalogical.com/ai/ai\_prompt\_stacking](https://katalogical.com/ai/ai_prompt_stacking)
  - **Gostinker** (1↑): Have you finished? do you have a link to your blog or wherever youre posting this? would like to read it
    - **Kathilliana** (1↑): About the stacked prompt: https://katalogical.com/ai/ai_prompt_stacking

Diagnosing problems: https://katalogical.com/ai/ai_diagnose
  - **PayBetter** (-1↑): I am building a local AI dashboard that allows you to completely control what gets loaded into the system before your input. What I do is inject it the same way every time and it gets stored in KV cache for long-term use. So say you have a whole personality and ethics layer you want the AI to work through every time it responds. This is how you do it. Check out LYRN. I'm releasing the open source dashboard very soon.
    - **Kathilliana** (3↑): Mine already does it by the way I’ve layered my prompts.
- **mrbenjihao** (37↑): Did nobody pay attention to their harmony framework?
  - **Agitated_Space_672** (14↑): Yeah I knew about the addition of channels and things. I didnt know they where being used in the API and I didn't know they hard-coded the date.
- **idealistdoit** (12↑): Thanks for the insight.     Even in regular ChatGPT, mentioning a requested oververbosity level does affect the output. ChatGPT 5 recognizes the word and it behaves differently.  
  
Me: Can I get an comparative analysis of PowerBI to tableau with an oververbosity of 1?  
  
ChatGPT: "Power BI is generally cheaper, integrates tightly with Microsoft tools, and is easier for quick adoption; Tableau offers deeper visual customization, more advanced analytics, and is better for complex, large-scale data exploration."  
\---------------------------------

Me: Can I get an comparative analysis of PowerBI to tableau with an oververbosity of 10?

ChatGPT: "Alright, you’ve asked for an **oververbosity of 10**, which I’m going to interpret as: *“Please don’t just give me a neat table of bullet points — drown me (pleasantly) in a sprawling, meticulously detailed narrative that goes deep into technical capabilities, deployment options, licensing, and even the philosophical underpinnings of each platform.”* Brace yourself — this is going to be long. I’ll structure it so it’s still **navigable**, but with the dial cranked to “epic saga.”

\--- It gives me the origins, and philosophy for each.  
, bullet points about what each are good at..     when to use each..  each system's capabilities and 5 pages of comparative data.
  - **ReasonableLoss6814** (8↑): Just got a full research paper basically. “Tell me about w-paxos. Set oververbosity to 10”

Holy moly.
- **mystique0712** (8↑): Interesting find - this looks like metadata the API uses to control response formatting. The oververbosity parameter is particularly useful for tuning output length.
- **Stunning-Ad-2433** (13↑): Read this: https://github.com/elder-plinius/CL4R1T4S
  - **NewYak4281** (-3↑): What’s a system prompt? How would you use this?
    - **Stunning-Ad-2433** (7↑): This is kinda the master prompt from the major models/brands. 

In each you should find something that says: "user prompt". Which is the place where your prompt would be pasted in. And that whole thing around it is what,why,when,where,who,how etc is defined by these companies. 

I hope I made this a bit more clear? :)

p.s. just dive in, open the files and read. 

The thing is, why I think it is important to read, is because the instructions might be conflicting with your ethical stand points. I guess. But whatever, just click accept ;)
- **AreaExact7824** (4↑): Is it only for gpt 5 or all model?
  - **Agitated_Space_672** (3↑): Just GPT-5
    - **Lopsided-Cup-9251** (1↑): They said it has a router maybe the router is a prompt for nano model.
- **Deciheximal144** (5↑): What's "juice"?
  - **FunkyDoktor** (3↑): https://www.reddit.com/r/singularity/s/UAZSPjjKR2
- **Naomi2221** (4↑): They do understand that people will just go use something else, right? Their models are no longer that much better than the others available.
- **Cutie_McBootyy** (3↑): They didn't just use Ghost Attention while training? I thought that was standard so that you don't have to do prompt injections.
- **tony10000** (3↑): From ChatGPT 5: "The precise **internal system prompt** for ChatGPT-5—meaning the full, unredacted instructions OpenAI embeds in the system role—is **not publicly available**. While articles and reverse-engineering hints give us a partial view (e.g., prompts to use the web, or hidden API instructions), the complete template remains proprietary."
