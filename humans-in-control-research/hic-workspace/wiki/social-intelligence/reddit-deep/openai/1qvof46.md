---
id: social-intelligence/reddit-deep/openai/1qvof46.md
url: "https://www.reddit.com/r/OpenAI/comments/1qvof46/i_switched_from_chatgpt_to_gemini_for_the_context/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "I switched from ChatGPT to Gemini for the context window, but the UI felt ancient. So I built an extension to fix it."
author: "Kindly_Revenue3077"
date: "2026-02-04T13:22:24.000Z"
score: 1
upvote_ratio: 0.57
num_comments: 0
flair: "Discussion"
extracted_at: "2026-05-11T17:27:05.357Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/openai/1qvof46.md#c0"
    char_span: [0, 1651]
    sentence_count: 17
    key_terms: [chatgpt, gemini, extensions, queue, projects, browser, openai, ahmdidjajeicoopcdpablhecokaepofl]
    token_count: 411
---
# I switched from ChatGPT to Gemini for the context window, but the UI felt ancient. So I built an extension to fix it.

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1qvof46/i_switched_from_chatgpt_to_gemini_for_the_context/)
Posted by **Kindly_Revenue3077** · **1↑** · **0 comments**

I’ve been a heavy OpenAI user since GPT-3. The ecosystem around ChatGPT is incredibly mature now (Projects, browser extensions, etc.).

Recently, I’ve started to use Gemini because of the context window.

The problem: The Gemini UI feels like it's 2 years behind.
No Projects. No prompt library. No message queue. It felt impossible to use for "Power User" workflows compared to my ChatGPT setup.

Since I couldn't find an browser extension that fixes it, I decided to build one myself.

I basically ported over the features I missed from the ChatGPT or its Extensions:

📂 Folders: Simmilar to Projects. Finally added native folders to the sidebar to organize chats.

⏳ Message Queue: A queue system so I don't have to babysit the AI while it generates (similar to queue extensions for ChatGPT).

📚 Prompt Library: Save prompts and reuse them instantly with slash commands(//).

📊 Usage Tracker: Added a counter for the "Thinking"/"Pro" models limits (since Google doesn't show them).

Tech/Privacy:
It runs 100% locally (Manifest V3). I wanted it to be privacy-first, so no chat data leaves the browser.

If anyone else is juggling both models like I am but hates the Gemini UI, this might help you keep your sanity.

Link: [Chrome Web Store](https://chromewebstore.google.com/detail/superpower-gemini/ahmdidjajeicoopcdpablhecokaepofl)
