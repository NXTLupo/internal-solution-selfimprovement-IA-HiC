---
id: social-intelligence/reddit-deep/chatgptcoding/1r71hcl.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1r71hcl/webdesktop_code_responses_are_better_than_ide/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "Web/Desktop code responses are better than IDE based responses."
author: "_DB009"
date: "2026-02-17T09:25:28.000Z"
score: 11
upvote_ratio: 0.87
num_comments: 17
flair: "Discussion"
extracted_at: "2026-10-09T16:37:34.767Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1r71hcl.md#c0"
    char_span: [0, 1326]
    sentence_count: 7
    key_terms: [web, responses, desktop, better, prompt, chatgptcoding, "ide's", using]
    concepts: [responses, chatgptcoding, desktop, better, prompt]
    token_count: 297
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1r71hcl/webdesktop_code_responses_are_better_than_ide/","kind":"social-post","date":"2026-02-17","author":"_DB009","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1r71hcl.md#c1"
    char_span: [1341, 3163]
    sentence_count: 13
    key_terms: [model, github, copilot, being, since, using, code, reasoning]
    concepts: [model, github, copilot, being, since]
    section: Comments
    token_count: 471
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1r71hcl/webdesktop_code_responses_are_better_than_ide/","kind":"social-post","date":"2026-02-17","author":"_DB009","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1r71hcl.md#c2"
    char_span: [3165, 3728]
    sentence_count: 4
    key_terms: [codex5, code, ide, use, web, architecture, manummasson, different]
    concepts: [codex5]
    section: Comments
    token_count: 148
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1r71hcl/webdesktop_code_responses_are_better_than_ide/","kind":"social-post","date":"2026-02-17","author":"_DB009","subreddit":"chatgptcoding"}]
---
# Web/Desktop code responses are better than IDE based responses.

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1r71hcl/webdesktop_code_responses_are_better_than_ide/)
Posted by **_DB009** · **11↑** · **17 comments**

Is it just me or are the responses from chat GPT desktop/web better than the ones given by IDE's? im currently running AI tests with vscode and cursor to find a "Modern" workflow. I gave the same prompt to various models in vscode, and currently testing on cursor but I got curious and fed the same prompt to the web based  chat and the code it gave me was much better (functional atleast).

I am going to complete the test for the most part but since the LLM's are more or less the same across IDE's i dont know how different the results will be.

Logicially it makes sense I guess because  IDE's are mostly going for speed/productivity so they dont think quite as long as web.   
  
 I guess the real modern workflow will be using the agent for boiler plate code, changes to an existing system and using the web/desktop flow to create the initial boiler plate for large systems and just over all planning.   
  
For reference im a game dev the prompt was to make a simple spawn a list of objects into rows and columns flat on the ground using their bounding boxes.

## Comments

- **SM373** (2↑): I noticed this with Gemini 3 as well.  The gemini 3 pro model in the web is actually really good vs the one you can use in the agent.  My guess was exactly what you said, it's a web request so the model knows it can think longer
- **AxeSlash** (2↑): Given that OAI just nerfed reasoning time for 5.2 Thinking, this may not be the case for long.

5.2T has been shite since the update a few days ago. They're clearly in cost-minimisation mode at the moment, output quality be damned.
  - **_DB009** (1↑): oh gosh what a bad one, theyve back tracked before due to customer complaints but since this is connected directly to cost they may or may not.
- **Tropiux** (1↑): It depends on the model. What models are you using?
  - **_DB009** (1↑): In vs code I used haiku, gpt codex, gpt5 mini. On cursor i have it set to auto and can't choose currently not sure if I'm going to pay for cursor yet as I'm thinking of using Claude code.
    - **Unique-Drawer-7845** (2↑): Opus 4.6 in Copilot is worse than Sonnet 4.5 in Claude Code because GitHub gimps context windows and caps reasoning effort. GitHub gets by on brand recognition, being in every IDE, and being affordable. They are not trying to provide the smartest AI, just sufficient AI at a ~competitive price.  

Contrast that to OpenAI and Anthropic whose business literally rides or dies on the quality of their model-related offerings.  GitHub can always just ... fall back on being GitHub. Cursor's niche has been 1) beating Copilot in features in the early days (Copilot has since caught up), and 2) having one of the best autocompletes (more recently). Not really leading chat or agentic.

There are 3 things that matter almost equally:

1) What tool you're using to access the model 
2) What model you're accessing
3) Who is selling the model to you

If you want something as smart as ChatGPT 5.2 Web but in your IDE, you have two main choices (IMO): Codex or Claude Code.
- **manummasson** (1↑): They have different system prompts. Coding agents are told to be more concise and give shorter responses.
  - **_DB009** (1↑): I get that but the quality of the code suffers. I think planning core architecture concepts is better in the web/desktop based chats then taking detailed notes to the ide might be the best bet.
- **niado** (1↑): Use codex5.3. There’s no reason to use any other model, codex5.3 is a monster.
