---
url: "https://www.reddit.com/r/OpenAI/comments/1qd9wws/why_does_assistants_api_use_45x_fewer_tokens_than/"
kind: "social-post"
source: "reddit-deep: r/openai"
subreddit: "openai"
title: "Why does Assistants API use 4-5x fewer tokens than Chat Completions for the exact same vision task with images? (GPT-4o / 4.1)"
author: "devZishi"
date: "2026-01-15T04:32:23.000Z"
score: 2
upvote_ratio: 1
num_comments: 1
flair: "Question"
extracted_at: "2026-05-11T17:27:05.357Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Why does Assistants API use 4-5x fewer tokens than Chat Completions for the exact same vision task with images? (GPT-4o / 4.1)

Source: [reddit-deep: r/openai](https://www.reddit.com/r/OpenAI/comments/1qd9wws/why_does_assistants_api_use_45x_fewer_tokens_than/)
Posted by **devZishi** · **2↑** · **1 comments**

Hey everyone,

I'm seeing a massive difference in token usage when doing \*\*vision/image analysis\*\* with OpenAI models (GPT-4o and GPT-4.1), depending on whether I use Chat Completions API or Assistants API.



Same prompt, same images, same task — but completely different costs.



\*\*Chat Completions API\*\* (passing images via image\_url in messages):

\- GPT-4o: \~7036, 7422, 7412, 7414 tokens per run

\- GPT-4.1: \~7046, 7243, 7241 tokens



\*\*Assistants API\*\* (uploading images to storage once, then referencing file\_ids in the thread):

\- GPT-4o: \~1372, 1451 tokens

\- GPT-4.1: \~1364, 1786 tokens



→ Assistants is using \*\*4–5× fewer tokens\*\* overall for basically identical visual understanding.



The only real difference in implementation is how images are provided:

\- Chat: inline image\_url (probably forces high-detail tiling?)

\- Assistants: upload once → reference file\_id (seems to use a much more efficient/low-res/optimized vision path)



Is this:

\- An intentional optimization for threaded/long-running use cases?

Has anyone else noticed this huge savings with uploaded images in Assistants? Or tested how the new \*\*Responses API\*\* (the replacement) handles vision token usage for uploaded files vs inline URLs?



Thanks!

## Comments

- **LuckEcstatic9842** (1↑): Yeah this looks intentional. Assistants were built for threads and persistence, so caching vision makes sense. Chat Completions are more stateless and brute-force.
