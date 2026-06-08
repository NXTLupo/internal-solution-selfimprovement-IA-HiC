---
id: social-intelligence/reddit-deep/machinelearning/1q9bcl9.md
url: "https://www.reddit.com/r/MachineLearning/comments/1q9bcl9/p_i_made_screen_vision_turn_any_confusing_ui_into/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[P] I made Screen Vision, turn any confusing UI into a step-by-step guide via screen sharing (open source)"
author: "bullmeza"
date: "2026-01-10T18:21:16.000Z"
score: 53
upvote_ratio: 0.96
num_comments: 11
flair: "Project"
extracted_at: "2026-05-11T17:27:06.579Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/machinelearning/1q9bcl9.md#c0"
    char_span: [0, 1571]
    sentence_count: 5
    key_terms: [screen, vision, https, source, bullmeza, machinelearning, local, app]
    token_count: 394
  - id: "social-intelligence/reddit-deep/machinelearning/1q9bcl9.md#c1"
    char_span: [1586, 2566]
    sentence_count: 4
    key_terms: [bullmeza, project, vision, agent, mindless-brainless, cool, goal, "it's"]
    section: Comments
    token_count: 269
---
# [P] I made Screen Vision, turn any confusing UI into a step-by-step guide via screen sharing (open source)

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1q9bcl9/p_i_made_screen_vision_turn_any_confusing_ui_into/)
Posted by **bullmeza** · **53↑** · **11 comments**

I built Screen Vision, an **open source website** that guides you through any task by screen sharing with AI.

* **Privacy Focused:** Your screen data is **never** stored or used to train models. 
* **Local LLM Support:** If you don't trust cloud APIs, the app has a "Local Mode" that connects to local AI models running on your own machine. Your data never leaves your computer.
* **Web-Native:** No desktop app or extension required. Works directly on your browser.

**How it works:**

1. **Instruction & Grounding:** The system uses GPT-5.2 to determine the next logical step based on your goal and current screen state. These instructions are then passed to Qwen 3VL (30B), which identifies the exact screen coordinates for the action.
2. **Visual Verification:** The app monitors your screen for changes every 200ms using a pixel-comparison loop. Once a change is detected, it compares before and after snapshots using Gemini 3 Flash to confirm the step was completed successfully before automatically moving to the next task.

**Source Code:** [https://github.com/bullmeza/screen.vision](https://github.com/bullmeza/screen.vision)  
**Demo:** [https://screen.vision](https://screen.vision/)

I’m looking for feedback, please let me know what you think!

## Comments

- **mk22c4** (10↑): In 6 months this will be acquired by Microsoft for $1B.
  - **bullmeza** (7↑): I don't want this turning into Copilot  ;( OSS for the win
- **dyingpie1** (1↑): Is this the same thing as scribe that I always see advertised?
  - **bullmeza** (3↑): Nope, the difference here is that AI will guide you through your problem :) 

No human planning/intervention at all.
- **LelouchZer12** (1↑): Hey thats nice. I had a similar project internally where an agent goal was to highligh which button to click to achieve a goal when navigating on an UI
  - **bullmeza** (1↑): Cool!
- **Mindless-brainless** (1↑): Hello it's such a cool project, do mention the type of license it's under tho!
- **AI_Data_Reporter** (-2↑): MIT’s 1966 Summer Vision Project famously failed to solve computer vision in a single season. Xerox Alto (1974) pioneered the WIMP paradigm your tool automates. MAS-Bench (2026) remains the standard for evaluating such hybrid GUI/API agent efficiency.
