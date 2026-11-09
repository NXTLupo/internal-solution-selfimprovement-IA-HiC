---
id: social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "tested gpt 5.2, claude opus 4.5, gemini 3 pro in cursor. context still matters more than model choice"
author: "Mental-Telephone3496"
date: "2025-12-18T17:33:29.000Z"
score: 8
upvote_ratio: 0.79
num_comments: 15
flair: "Discussion"
extracted_at: "2026-10-09T16:37:34.768Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c0"
    char_span: [0, 2244]
    sentence_count: 1
    key_terms: [cursor, model, context, claude, gemini, trying, chatgptcoding, tools]
    concepts: [cursor, model, chatgptcoding, context, claude]
    token_count: 513
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/","kind":"social-post","date":"2025-12-18","author":"Mental-Telephone3496","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c1"
    char_span: [2246, 2567]
    sentence_count: 1
    key_terms: [promising, prompting, switching, everyone, honestly, replaces, starting, choice]
    token_count: 66
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/","kind":"social-post","date":"2025-12-18","author":"Mental-Telephone3496","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c2"
    char_span: [2582, 4777]
    sentence_count: 19
    key_terms: [buzzer, pellet, chicken, food, delay, group, chickens, random]
    concepts: [buzzer, pellet, chicken, chickens, delay]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c3"]
    section: Comments
    token_count: 478
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/","kind":"social-post","date":"2025-12-18","author":"Mental-Telephone3496","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c3"
    char_span: [4781, 6227]
    sentence_count: 10
    key_terms: [dance, pellet, superstitious-chickens, chickens, hackerfactor, archives, finished, maximum]
    concepts: [dance, pellet, superstitious-chickens, chickens, hackerfactor]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c2"]
    section: Comments
    token_count: 335
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/","kind":"social-post","date":"2025-12-18","author":"Mental-Telephone3496","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1ppwsms.md#c4"
    char_span: [6229, 7547]
    sentence_count: 7
    key_terms: [context, instructions, files, steering, this-changes-everything, chatgpt, better, easier]
    concepts: [context, instructions, files, steering, chatgpt]
    section: Comments
    token_count: 306
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/","kind":"social-post","date":"2025-12-18","author":"Mental-Telephone3496","subreddit":"chatgptcoding"}]
---
# tested gpt 5.2, claude opus 4.5, gemini 3 pro in cursor. context still matters more than model choice

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1ppwsms/tested_gpt_52_claude_opus_45_gemini_3_pro_in/)
Posted by **Mental-Telephone3496** · **8↑** · **15 comments**

been testing the new model releases in cursor this week. gpt-5.2, claude opus 4.5, gemini 3 pro. everyone keeps saying these are game changers

honestly cant tell if im doing something wrong or if the hype is overblown. maybe part of this is how cursor integrates them, not just the raw model capabilities

some stuff did get better i guess. error handling seems less generic. like it actually looked at how we do validation in other files instead of just copy pasting from docs

but then i spent 2 hours yesterday cause it suggested using some “express-session-redis-pro” package that doesnt exist. wasted time trying to install it before realizing its made up. this still happens way too much

also tried getting it to help with our billing logic. complete disaster. it made assumptions that didnt match our actual pricing model. had to explain how we bill multiple times and it still got confused

responses are definitely slower with the newer models. gpt-5.2 takes like 45 seconds vs gpt-4o's usual 15-20. claude opus 4.5 is similar. gemini 3 pro is actually faster but quality feels inconsistent. not sure if the improvements are worth waiting that long when im trying to get stuff done

the weirdest thing is how much context matters. if i dont give it enough background it just defaults to generic react tutorials. been trying cursor composer but it misses a lot of project structure

saw some people mention cli tools like aider or tools that do some kind of project analysis first. aider seemed too cli-heavy for me but the idea of analyzing the whole codebase first made sense. tried a few other tools including verdent cause someone said it maps out dependencies before coding. the planning thing was actually kinda useful, showed me which files would need changes before starting. but still had the same context issues once it got to the actual coding part. cursor composer still feels pretty limited for anything complex

honestly starting to think the model choice doesnt matter as much as everyone says. i spent more time switching between models than actually coding

maybe im just bad at prompting, but feels like we’re still very much in the “ai is a decent junior dev” phase, not the “ai replaces senior devs” thing people keep promising

## Comments

- **Vindelator** (4↑): >honestly starting to think the model choice doesnt matter as much as everyone says

Attaching a long story here. 

I have a hunch that some of the inherit randomness in these models can lead people to the superstition that they have more control over the results than they actually do. 

(I could be completely wrong, but the illusion of pattern in chaos is thing to keep an eye on.) 

# The Chicken Dance

As I recall, the chickens were divided into three groups. Each chicken from each group was placed in a pen that had a buzzer and a food pellet dispenser.  
  
For the first group, the buzzer would sound and, after a consistent and fixed duration (varied per chicken), the pellet would drop. In each case, each chicken quickly learned to associate the sound with the food. Moreover, they quickly learned *when* the food would appear. If one chicken had a consistent five second delay between sound and food, then the bird would run over when the buzzer sounded. If a different chicken had a consistent 30 second delay, then it would hear the buzzer and wander over. In every case, the bird arrived in time to get the food.  
  
For the second group, the buzzer and the pellet were completely random. The chickens learned to ignore the buzzer and occasionally walked by to see if there was a pellet waiting.  
  
**The third group was the interesting group.** The pellet would appear after the buzzer, but there was a random delay. The chickens quickly associated the buzzer with food. **However, the random delay caused confusion. It appeared that the chickens were trying to associate the buzzer and pellet with some other action. (They couldn't grasp the concept of a random delay.)**  
  
For example, the buzzer might sound. The chicken would run over, see no pellet, and shake a leg -- thinking that maybe that would help. Eventually, by sheer coincidence, a pellet would drop. The chicken would learn that the buzzer meant that it should run over and shake a leg -- and then a pellet might appear. If the pellet dropped, then it reinforced the belief. But if it didn't drop, then maybe the chicken did it wrong. It might shake it's leg twice or flap a wing.  
  
**Eventually each bird developed an intricate dance.** They would hear the buzzer, run over, and start their dance. As it turned out, each dance length approached the maximum duration of the random delay. If the chicken finished the dance and there was no pellet, they would start the dance again. By the time they finished, the maximum delay had passed and the pellet would be there.  
  
The more startling finding was that the chickens became so involved in their dance that they completely ignored the pellet. It didn't matter if the pellet was there before the dance began, or if it appeared during the dance. The chickens would hear the buzzer, do the dance, and then get rewarded by a pellet. This is the basis of superstition: a strong belief that unrelated events have a correlation.

  
[https://www.hackerfactor.com/blog/index.php?/archives/899-Superstitious-Chickens.html](https://www.hackerfactor.com/blog/index.php?/archives/899-Superstitious-Chickens.html)
  - **-doublex-** (1↑): amazing!
    - **michaelsoft__binbows** (1↑): There are more humans than you want to believe out there, that behave exactly like these chickens by performing the exact same reasoning steps... It makes me sad but I am goinna need to copy and save this snippet somewhere because I have need of repeating it.
- **Much-Journalist3128** (1↑): Indeed. I haven't yet seen THAT much of a difference like "WOOOOOOW WTF I BEEN MISSING OUT ON THIS UNTIL NOW???"

What is ace tho is Gemini's context length. Otherwise not really a huge noticeable difference between any of the models
- **the_incredible_nuss** (1↑): Yeah at this point I am more interested in a way to communicate my prompt easier for example by talking instead of writing  than in a new this-changes-everything model
  - **bdemarzo** (1↑): I ask ChatGPT to help me write better instructions for Codex. It is surprisingly helpful. Also tell ChatGPT to provide your result in a code block for easier copy paste of text formatted instructions.
- **the-rbt** (1↑): you’re not crazy. model swapping is mostly noise if the tool isn’t feeding it your repo + rules. i’d stop “trying models” and start forcing better context: make it point to exact files/lines, ask for a 3-step plan before edits, and require it to verify any new dependency exists before suggesting it. the fake-package thing is exactly why i don’t let it pick libs without a quick sanity check.
- **GlokzDNB** (1↑): You need to work on steering documents, exporting large libraries to small files. Every failure investigate what happened and update steering files. 

Configuring ai workspace and optimizing context is a skill. Good luck
- **m0n0x41d** (1↑): Context will always matter, now matter - in transformers or any other architecture in the future.
