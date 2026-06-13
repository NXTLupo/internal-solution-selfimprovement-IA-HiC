---
id: social-intelligence/reddit-deep/chatgpt/1r1b3gl.md
url: "https://www.reddit.com/r/ChatGPT/comments/1r1b3gl/i_got_tired_of_chatgpt_forgetting_everything_so_i/"
kind: "social-post"
source: "reddit-deep: r/chatgpt"
subreddit: "chatgpt"
title: "I got tired of ChatGPT forgetting everything, so I built it a \"Save Game\" feature. 1,000+ sessions later, it remembers my decisions from 2 months ago."
author: "BangMyPussy"
date: "2026-02-10T19:50:25.000Z"
score: 1465
upvote_ratio: 0.94
num_comments: 275
flair: "Educational Purpose Only "
extracted_at: "2026-05-17T01:12:48.206Z"
extraction_method: "praw-deep"
research_goal: "Analyze Gen Z's emerging attitudes, behaviors, trends, and frustrations specifically concerning investing, saving, spending, and the integration of AI into personal financial management."
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c0"
    char_span: [0, 345]
    sentence_count: 2
    key_terms: [chatgpt, comments, bangmypussy, reddit-deep, everything, forgetting, decisions, remembers]
    token_count: 105
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c1"
    char_span: [347, 2396]
    sentence_count: 21
    key_terms: [memory, athena, claude, intelligence, drive, linux, permissions, remembers]
    token_count: 512
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c2"
    char_span: [2134, 3159]
    sentence_count: 12
    key_terms: [athena-public, winstonkoh87, something, adaptive, latency, github, openai, build]
    token_count: 265
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c3"
    char_span: [3173, 3824]
    sentence_count: 4
    key_terms: [openai, conversation, image, post, r-chatgpt-1050422060352024636, chatgpt-shared-links-faq, discord, support]
    section: Comments
    token_count: 172
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c4"
    char_span: [3827, 5577]
    sentence_count: 8
    key_terms: [bangmypussy, because, context, good, "couldn't", username, thanks, environmental-cap979]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c5"
    char_span: [5579, 7116]
    sentence_count: 8
    key_terms: [bangmypussy, chat, work, because, ctotheg, memory, tokens, users]
    section: Comments
    token_count: 418
  - id: "social-intelligence/reddit-deep/chatgpt/1r1b3gl.md#c6"
    char_span: [7118, 7614]
    sentence_count: 4
    key_terms: [bangmypussy, winwunwon, chat, starroverride, compelling, experience, suspicious, rewritten]
    section: Comments
    token_count: 148
---
# I got tired of ChatGPT forgetting everything, so I built it a "Save Game" feature. 1,000+ sessions later, it remembers my decisions from 2 months ago.

Source: [reddit-deep: r/chatgpt](https://www.reddit.com/r/ChatGPT/comments/1r1b3gl/i_got_tired_of_chatgpt_forgetting_everything_so_i/)
Posted by **BangMyPussy** · **1465↑** · **275 comments**

I posted here 4 days ago about "Project Athena" — my open-source "Save Game" layer for AI. The response was insane (450K+ views).
But the top comment asked the real question: *"Why not just use ChatGPT's memory? It remembers things now."*
This pushed me to ship a massive update (v8.5.0) to explain exactly why.
**The Answer: You are confusing RAM with a Hard Drive.**
ChatGPT’s memory is RAM. It’s fast, useful, and magically remembers your dog’s name. But it’s fragile, unstructured, and locked to their platform. If you switch to Gemini or Claude tomorrow, you lose your brain. You are *renting* your intelligence.
I wanted to **OWN** my intelligence.
So I pivoted the project. It’s no longer just a "memory tool." It is now **The Linux OS for AI Agents**.
Just as Linux provides the file system and permissions for apps to run, Athena provides the persistent memory and governance for AI models to run.
### What’s New in v8.5.0 (The "OS" Update)
**1. The "Hard Drive" Architecture**
Your AI now treats your local Markdown files as its long-term storage. It writes case studies, decision logs, and protocols to *your* disk.
*Result:* I can switch from GPT-4o to Claude 3.5 Sonnet mid-conversation, and the new model instantly "mounts" my entire memory drive. No data loss.
**2. MCP Server (Model Context Protocol)**
I exposed the whole core as an MCP server. You can now connect any MCP-compliant tool (Cursor, Claude Desktop, personalized clients) to your memory vault.
It allows your IDE to say: *"Retrieve the API specs we wrote in Session 102."*
**3. Permissioning Layer (The "Sudo" Command)**
Just like Linux has `rwx` permissions, Athena now has 4 capability levels. You can give an agent "Read-Only" access to your notes, or full "Sudo" access to execute code.
**4. Three-Phase Budget (Adaptive Latency)**
We implemented "Adaptive Latency." It spends maximum compute at boot (to load context) and shutdown (to save index), but sprints efficiently during the work session.
### The "F*ck SaaS" Philosophy (Still 100% True)
I saw the comments accusing me of selling something. Let me repeat:
* **No Subscription.**
* **No Signup.**
* **No Data Logging.**
* **MIT License.**
This runs locally on your machine. You pay OpenAI/Google/Anthropic directly for your API keys. I don't see a dime, and I don't see your data.
### Why I’m doing this
We are heading into a world where we all have "Agentic Extensions" of ourselves. If you rely on OpenAI’s proprietary memory, they own your extension. If you build on a local OS, you own it.
Code is up. Docs are updated. Go build something sovereign.
**Repo:** [github.com/winstonkoh87/Athena-Public](https://github.com/winstonkoh87/Athena-Public)
*(P.S. To the guy who asked if this works with Obsidian: Yes. It’s just Markdown files. Your vault is now your brain.)*

## Comments

- **AutoModerator** (1↑): Hey /u/BangMyPussy,

If your post is a screenshot of a ChatGPT conversation, please reply to this message with the [conversation link](https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq) or prompt.

If your post is a DALL-E 3 image post, please reply with the prompt used to make this image.

Consider joining our [public discord server](https://discord.gg/r-chatgpt-1050422060352024636)! We have free bots with GPT-4 (with vision), image generators, and more!

 &#x1F916;

Note: For any ChatGPT-related concerns, email support@openai.com - this subreddit is not part of OpenAI and is not a support channel.


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/ChatGPT) if you have any questions or concerns.*
- **Wonderful-Opening-58** (847↑): Really cool work u/BangMyPussy
  - **pbmadman** (342↑): It’s his professional account.
    - **BangMyPussy** (151↑): Tell me about it!
    - **Other_Hand_slap** (1↑): quindi e per questo che la trduzione dice che e un uomo? sara il pussy davanti o didietro
  - **_MilkBone_** (44↑): r/rimjob_steve
  - **getoutdoors66** (35↑): You only commented because you wanted to spell out OPs name haha
    - **pm_me_your_pooptube** (18↑): Hey it's a good name
  - **UtopianCobra** (3↑): Do the trend to have Chat display your username 😂
  - **Environmental-Cap979** (2↑): Your username ironically complements OP's. 😁
- **Siciliano777** (144↑): This is good stuff op. 👍🏼 This is how AI should be used (yes, even to improve AI itself).
  - **BangMyPussy** (22↑): Thanks!
    - **Thing1_Tokyo** (6↑): Thank you!
- **purple_maus** (64↑): What about if you just want a better memory for chats and such? Without the IDE usage basically. Sorry, beginner here.
- **ARCreef** (20↑): Pure awesomeness  thanks BMP
- **lxpb** (55↑): This sounds so good. I had to start a few chats on a project because I filled them to the max, and got so annoyed it just couldn't pull context from them, like it immediately got so much dumber.   

I even copy pasted entire conversations into Word, and fed them to it, but it couldn't even read those right. I felt powerless and gave up.
  - **BangMyPussy** (56↑): Yeah, context fragmentation is the killer. When the context window fills up, the reasoning capability drops off a cliff because it's juggling too much noise.

Pasting the whole chat history (Word doc) usually fails because it eats up tokens with conversational fluff rather than actual signal.

The fix that stopped the "dementia loop" for me is treating **files as memory**, not the chat. I force the AI to update a markdown file (like 

activeContext.md) with the *current state* and *next steps* before I close the session.



Then, when I start a new chat, I just feed it that one file. It re-hydrates the context instantly without the 20k tokens of drift. It takes discipline, but it works.
    - **dedreo58** (3↑): This is similar when I was tweaking a wrapper app for my local llms; in mine I coded a "confidence index" so it will develop improved patterns of 'what' I like it to store over time.
    - **Brandon_Beesman** (2↑): I will try that too👍
    - **hecke** (-2↑): Gemini can write to Google Notes. Could that also work as a memory function?
- **sjwinner** (14↑): Does this only work on PC, not iOS?
  - **imdugud777** (6↑): Curious minds want to know.
    - **BangMyPussy** (5↑): Works on desktop + IDE.
- **Ctotheg** (13↑): u/BangMyPussy Does this work similarly on an unpaid free ChatGPT account?
  - **Odd-Attention-2127** (2↑): This is a good question because I don't have paid accounts.
    - **Ctotheg** (2↑): I misunderstood bc this is for power users of gpt who gpt as part of a system for programming software.  

Such users would integrate this program along with the many others they have to help them manage their output.
- **revolmak** (27↑): concept is interesting. 

Whenever I see a post rewritten/edited by chat, i become a little suspicious though. Many people can make projects sound a lot more compelling via chat.
  - **BangMyPussy** (-8↑): Yea ik.
- **WinWunWon** (17↑): I don’t think I am smart enough to execute it but this is really cool. I have no coding experience; can I still do this? Thank you for sharing.
  - **BangMyPussy** (18↑): Yes you can, RTFM!
    - **starroverride** (23↑): Rage against the fucking machine?
    - **WinWunWon** (5↑): 😭…🫡!
