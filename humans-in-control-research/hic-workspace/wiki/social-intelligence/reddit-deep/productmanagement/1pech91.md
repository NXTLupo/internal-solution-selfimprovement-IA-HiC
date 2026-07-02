---
id: social-intelligence/reddit-deep/productmanagement/1pech91.md
url: "https://www.reddit.com/r/ProductManagement/comments/1pech91/learning_in_public_is_traditional_ui_dying_as/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Learning in Public: Is Traditional UI Dying as Agentic UX Rises?"
author: "RespectSpiritual8135"
date: "2025-12-04T21:31:14.000Z"
score: 1
upvote_ratio: 0.52
num_comments: 22
flair: "Learning Resources"
extracted_at: "2026-06-24T22:14:23.450Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1pech91.md#c0"
    char_span: [0, 1347]
    sentence_count: 4
    key_terms: [png, https, productmanagement, e3d929ce1ea675981e865bb1952894081cff45e0, preview, format, width, auto]
    concepts: [productmanagement, https, preview, format, interfaces]
    token_count: 383
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1pech91/learning_in_public_is_traditional_ui_dying_as/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1pech91.md#c1"
    char_span: [1361, 3508]
    sentence_count: 15
    key_terms: [respectspiritual8135, preferences, traditional, based, conversational, conversation, good, interfaces]
    concepts: [respectspiritual8135, preferences, traditional, based, conversational]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/productmanagement/1pech91.md#c2"
    char_span: [3510, 5750]
    sentence_count: 20
    key_terms: [users, like, content, right, tasks, wrong, suggestions, "it's"]
    concepts: [users, content, suggestions, assistance, right]
    section: Comments
    token_count: 471
  - id: "social-intelligence/reddit-deep/productmanagement/1pech91.md#c3"
    char_span: [5752, 6764]
    sentence_count: 5
    key_terms: [xmind, branches, template, letting, respectspiritual8135, https, share, app]
    concepts: [xmind, branches, template, letting, https]
    section: Comments
    token_count: 262
---
# Learning in Public: Is Traditional UI Dying as Agentic UX Rises?

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1pech91/learning_in_public_is_traditional_ui_dying_as/)
Posted by **RespectSpiritual8135** · **1↑** · **22 comments**

As a PM diving into AI, I'm seeing a huge shift from static tools to agentic systems for better CX, which really challenges our old UI stack. 

I’m currently seeing these 4 UX patterns are coming: 

**Predictive Intent:** The system suggests the next step (like GitHub Copilot) rather than forcing users to navigate menus. 

**Conversational Interfaces:** Replacing complex input forms with natural language prompts.

**Hyper-Personalization:** Interfaces that adapt their layout based on user behavior, rather than one static dashboard for everyone. 

**Automated Workflows:** AI observing repetitive tasks and offering to auto-complete them. 

Curious to hear what you've learnt and any good CX you've seen.

  


https://preview.redd.it/zzd3y4r7595g1.png?width=946&format=png&auto=webp&s=0f93bfa069fb38c146766268a16f4563f227392f

https://preview.redd.it/e4hrvcb9595g1.png?width=948&format=png&auto=webp&s=e3d929ce1ea675981e865bb1952894081cff45e0

https://preview.redd.it/1fexuibh595g1.png?width=942&format=png&auto=webp&s=61f618dd036a81fca4f4af3620459c30903cfaec

## Comments

- **Common_North_5267** (9↑): a text block will never be a good ui for anything event based.
  - **RespectSpiritual8135** (1↑): Agreed. Conversation interface is not effective for those event based/SOP type of workflow. That's where I think a generative UI/personalization works better
    - **RespectSpiritual8135** (1↑): instead of providing all the buttons as traditional saas, generating the UI/button based on user's case to guide their next step.
- **Longjumping_Hawk_951** (2↑): Limited use. Many software systems/tools/platforms can't fully function on char bots or conversation based interfaces.
  - **RespectSpiritual8135** (1↑): Exactly. Thought AI was first received as chatbot due to Chatgpt, but for vertical product, the chatbot is not the right one
- **pri1229** (2↑): Yeah your framework is similar to the one in this academic article but it has more categories so might be interesting for you: https://arxiv.org/pdf/2501.08774v1. 

One important thing to note is the UI is only one piece of the system. Conversational AI interfaces are good at gathering intent and preferences but if you don't have the grounded data sources or supply to then meet the preferences they've given you they will fail. 

For example, the new ChatGPT shopping experience gathered all these preferences from me for bunk beds I wanted to shop for - with stairs, wood, <$300 and then resulted in a report that didn't meet most of the criteria. Meanwhile Google AI mode nailed it because they still have the best and most comprehensive supply of search data and retrieval systems.
- **coffeeebrain** (2↑): I'm skeptical that traditional UI is dying. These patterns sound great in theory but in practice they're really hard to design well and most users still prefer direct manipulation when they know what they want to do.

The conversational interface thing is a good example. I've tested products that replaced forms with chat and the main issue is discoverability. With a traditional form you can see all the fields and know what information you need. With chat you have to guess what to ask or what the system can do. That's frustrating for new users.

Hyper-personalization is risky too. If the UI changes based on behavior users can't build muscle memory. I've seen this backfire where people get confused because buttons and features keep moving around. The "38% increase in feature adoption" stat is interesting but I'd want to know how long that lasted and whether it hurt other metrics like time to complete tasks.

The automated workflow thing works when it's right but when it's wrong it's really annoying. Like if Gmail starts auto-labeling my emails wrong I have to spend time fixing it instead of just doing it myself from the start.

I think we'll see hybrid interfaces not one replacing the other. Traditional UI for core workflows, AI assistance for complex tasks. The "build for AI assistance not AI takeover" point in your last image is the right approach.
  - **RespectSpiritual8135** (1↑): Yeah, hybrid is definitely needed in the transition period. One thing I’ve been trying there is keeping the layout same framework/button similar place. however change the content in each framework to be action based, so user can get them familiar with the process/control while tasks are dynamic AI generated
    - **coffeeebrain** (1↑): That makes sense, keeping the structure consistent while the content changes. Like the skeleton stays the same so users know where to look but what's inside adapts. Have you tested this with actual users yet? I'm curious if they even notice the content is AI-generated or if it just feels like a normal smart product. The best AI features I've seen are the ones users don't realize are AI, they just work. Also curious how you handle when the AI gets it wrong. Like can users easily override bad suggestions or does the UI make them feel forced to follow what the AI says? That's usually where these things break down in testing.
- **AstroBaby2000** (1↑): Very brittle. When they start breaking down, then what do you do?
- **ByteDigger** (1↑): I’ve been seeing the same shift too. The best CX I’ve worked with combines small, predictive hints with simple manual control. Think Copilot-style inline suggestions you can quickly accept or ignore, plus conversational inputs that bring up the right options without forcing people through rigid forms.

What I usually do is map out predictive intents, conversation flows, personalization branches, and automation triggers in Xmind. That helps turn vague user goals into clear, step-by-step auto-complete actions, and it’s made handoffs to designers and engineers a lot smoother.

If you’d like, I can send a quick screenshot of the template I use to lay out those branches.
  - **RespectSpiritual8135** (1↑): That’s great thought process. Thank you. I am looking forward to your templates.
    - **ByteDigger** (1↑): sure, template here → [https://app.xmind.com/share/6J87sEvY?xid=2dyHVL0f](https://app.xmind.com/share/6J87sEvY?xid=2dyHVL0f)
- **TheABM** (-2↑): **Conversational Interfaces** doesn't have to be just about replacing complex input forms. its's also about letting users chat with the software for any action they want to perform (e.g. invite \[user email\] to my team as an admin, or generate report x for me).   
disclosure - recently joined foldspace ai and we are letting companies do exactly that.
