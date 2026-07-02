---
id: social-intelligence/reddit-deep/gpt/1t7qykv.md
url: "https://www.reddit.com/r/GPT/comments/1t7qykv/have_the_guidelines_changed_recently_because_i/"
kind: "social-post"
source: "reddit-deep: r/gpt"
subreddit: "gpt"
title: "Have the guidelines changed recently? Because I didn't use to be able to make images like this..."
author: "TroyHay6677"
date: "2026-05-09T01:31:00.000Z"
score: 2
upvote_ratio: 0.75
num_comments: 2
flair: ""
extracted_at: "2026-05-11T17:26:37.721Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/gpt/1t7qykv.md#c0"
    char_span: [0, 2105]
    sentence_count: 23
    key_terms: [gpt, text, last, like, guidelines, immediate, perfectly, comments]
    concepts: [guidelines, immediate, perfectly, comments, generate]
    token_count: 469
    sources: [{"n":"reddit-deep: r/gpt","u":"https://www.reddit.com/r/GPT/comments/1t7qykv/have_the_guidelines_changed_recently_because_i/"}]
  - id: "social-intelligence/reddit-deep/gpt/1t7qykv.md#c1"
    char_span: [2107, 4376]
    sentence_count: 20
    key_terms: [brand, image, generation, model, parameter, context, exact, input]
    concepts: [brand, image, generation, parameter, model]
    token_count: 440
  - id: "social-intelligence/reddit-deep/gpt/1t7qykv.md#c2"
    char_span: [4378, 6814]
    sentence_count: 22
    key_terms: [prompt, image, relationships, layer, model, rules, understands, lot]
    concepts: [prompt, image, relationships, understands, layer]
    token_count: 476
  - id: "social-intelligence/reddit-deep/gpt/1t7qykv.md#c3"
    char_span: [6828, 6942]
    sentence_count: 1
    key_terms: [hookedonpeptides, different, noticed, coming, mxby7e, back, "i've", nice]
    section: Comments
    token_count: 39
---
# Have the guidelines changed recently? Because I didn't use to be able to make images like this...

Source: [reddit-deep: r/gpt](https://www.reddit.com/r/GPT/comments/1t7qykv/have_the_guidelines_changed_recently_because_i/)
Posted by **TroyHay6677** · **2↑** · **2 comments**

You've probably noticed it over the last couple of weeks. You throw a prompt into ChatGPT that would have absolutely triggered an immediate red error box a month ago, and suddenly... it just generates. And not only does it generate, but the output doesn't look like that glossy, overly-symmetrical AI plastic we've been stuck with for the last year.

I've been seeing threads popping up everywhere asking if OpenAI quietly nuked their safety guidelines. But it's not just the guardrails shifting. OpenAI rolled out GPT Image 2, and I've spent the last two weeks hammering it against my daily product management and design workflows. Tested it, here's my take: the underlying architecture for how it handles prompt context, composition, and policy triggers has completely changed. Let me break this down.

First, let's look at the visual realism and text rendering, because this is the most immediate shock to the system. If you tried to generate a UI mockup, a poster, or a magazine cover before, you'd get gibberish text and warped grid layouts. It was an instant tell. Now? The realism is honestly kind of jarring. I was running prompts for an iOS app mockup to see exactly where it would break. I explicitly asked for very specific Instagram UI elements—grid spacing, the profile layout, the story circles, the bottom tab bar. In the past, this was a guaranteed hallucination nightmare. You'd get circles merging into squares and alien text.

GPT Image 2 nailed it on the first shot. It even rendered a tiny "Renaissance 5G" carrier text perfectly in the top corner, which is a deliberate accuracy check I use. Every single word in the bio, the captions, and the labels was perfectly spelled and readable. It actually looks like a screenshot taken directly from an iPhone, not a stylized, smoothed-over approximation of one.

If you dig into the OpenAI developer docs for the API, there's a massive clue as to why the outputs are suddenly so much sharper and why the system feels entirely different. They detail a parameter called input\_fidelity. For the older generation workflows, you had to mess around with this parameter constantly to control how strongly the model preserved details from input images during edits or style transfers.

For gpt-image-2, the API literally tells developers to completely omit this parameter. You aren't even allowed to change it anymore. Why? Because the new model architecture processes every single image input at maximum high fidelity automatically. It's forcing a level of visual retention and detail extraction that we used to have to carefully prompt-engineer our way into.

But here's what most people miss, and where the actual ROI is if you use these tools for professional work: the memory context for visual generation has been drastically upgraded. I run a lot of tests comparing how different frontier models handle strict design systems. Up until now, if you wanted to build cohesive brand assets, you had to fight the tools at every step. Pencil is notorious for ignoring strict brand guidelines—it'll randomly change the context of the image or swap a primary brand hex code for something it thinks is "more aesthetic." Claude is incredible for logic, but if you're doing heavy, iterative image generation workflows, it absolutely devours tokens and you hit your limits insanely fast.

ChatGPT with GPT Image 2 bypasses both of those friction points. You can drop your exact brand colors, typography rules, and tone-of-voice guidelines into the very first message. The model now maintains that exact brand context across the entire chat session. Every single subsequent image you generate references those initial rules without you having to restate them. I generated a mood board, then a logo exploration, and then a series of marketing creatives. It held the exact same neon-brutalist aesthetic across all 15 images without me having to re-paste the hex codes once. This level of consistency used to require spinning up a complex custom workflow or heavily fine-tuning a local model. Now it's just the default behavior of the web interface.

Because the model actually understands spatial relationships and persistent memory now, the way we prompt needs to change completely. The official cookbook explicitly advises to stop overloading the initial prompt with a wall of text. Start simple with a clean base, layer the details, and iterate. If you're doing compositing work, you can actually be highly specific about spatial relationships now. Instead of a massive descriptive paragraph hoping the model figures out what goes where, you can simply instruct it to "apply Image 2's style to Image 1" or "put the bird from Image 1 on the elephant in Image 2." It understands layer positioning and object isolation in a way that feels a lot closer to Photoshop than a traditional text-to-image generator.

So, circling back to the main question: did the community guidelines actually change? Why are we suddenly able to make images like this without getting blocked? Officially, OpenAI hasn't announced a massive rollback of their safety policies. But practically speaking on the backend, the model is significantly smarter at parsing semantic intent.

The old system was incredibly blunt. It was aggressive with its safety filters because it couldn't always distinguish between a harmless creative prompt and a genuine policy violation. If a prompt even vaguely approached a forbidden concept, it erred on the side of an immediate block. GPT Image 2 has a much more granular understanding of context. It knows the difference between asking for a realistic, documentary-style photo for a mock campaign versus something that actually violates the rules. It's not that the rules disappeared entirely; the moderation layer just got a lot better at actually reading the context of the room instead of turning everyone away at the door.

I essentially replaced my entire visual asset workflow with this over the last week just to see if it holds up for production. For 90% of my use cases, it absolutely does. You just have to treat it like you're handing a creative brief to a junior designer. Define the audience, the intent, the brand rules, and the channel up front, and let the session memory do the heavy lifting for you.

I'm curious what you all are seeing on your end. Are you guys still hitting the same random refusal walls as last month, or are you noticing the leash getting a lot longer with this version? What's the weirdest complex prompt that suddenly works for you now?

## Comments

- **hookedonpeptides** (1↑): I've noticed a different also
- **mxby7e** (1↑): Nice try Sam but I’m not coming back
