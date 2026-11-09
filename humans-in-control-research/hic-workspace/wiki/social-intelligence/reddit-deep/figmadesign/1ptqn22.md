---
id: social-intelligence/reddit-deep/figmadesign/1ptqn22.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1ptqn22/i_got_tired_of_frame_324_in_my_figma_layers_so_i/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "I got tired of \"Frame 324\" in my Figma layers, so I built a small plugin to automate layer naming with AI"
author: "psychrisga"
date: "2025-12-23T10:26:35.000Z"
score: 86
upvote_ratio: 0.85
num_comments: 38
flair: "resources"
extracted_at: "2026-09-10T17:19:11.235Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1ptqn22.md#c0"
    char_span: [0, 1796]
    sentence_count: 12
    key_terms: [layersense-ai-layer-renamer-zero-cost, community, figma, plugin, https, figmadesign, com, free]
    concepts: [layersense-ai-layer-renamer-zero-cost, community, figma, plugin, figmadesign]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ptqn22.md#c1"]
    token_count: 451
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1ptqn22/i_got_tired_of_frame_324_in_my_figma_layers_so_i/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1ptqn22.md#c1"
    char_span: [1811, 3520]
    sentence_count: 7
    key_terms: [feature, layers, built, figma, free, plugin, psychrisga, steffenc7]
    concepts: [feature, layers, built, figma, plugin]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1ptqn22.md#c0"]
    section: Comments
    token_count: 483
  - id: "social-intelligence/reddit-deep/figmadesign/1ptqn22.md#c2"
    char_span: [3525, 4485]
    sentence_count: 8
    key_terms: [environmental, like, codywalton, energy, illustriouscode2603, frame, waste, atonyproductions]
    concepts: [environmental, codywalton, energy, frame, waste]
    section: Comments
    token_count: 282
---
# I got tired of "Frame 324" in my Figma layers, so I built a small plugin to automate layer naming with AI

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1ptqn22/i_got_tired_of_frame_324_in_my_figma_layers_so_i/)
Posted by **psychrisga** · **86↑** · **38 comments**

Hey everyone! Like many of you, I spend way too much time manually renaming layers. I decided to spend my weekend coding a solution that fits my own workflow.

I called it LayerSense. It basically analyzes what's inside a frame and renames it to something logical like "User Profile Card" or "Active Search Bar".

What I tried to do differently:  
Instead of a simple one-click rename, I added a bit of control. You can actually tell the AI what to focus on: whether it's the function of the layer, its content, or the parent context. It’s been a lifesaver for my own design system cleanup.​

I've made the tool free to use because I think it might help others who are in the same boat.

You can find it by searching "LayerSense" in the Figma Community or via this link:  
[https://www.figma.com/community/plugin/1578034340595628711/layersense-ai-layer-renamer-zero-cost](https://www.figma.com/community/plugin/1578034340595628711/layersense-ai-layer-renamer-zero-cost)

I'd really appreciate some honest feedback from the community. Any suggestions on what else I should add?

**UPD (1)**: The answer to why this plugin is needed at all, if there is a built-in feature:  
Figma’s built-in AI is locked behind a paywall and lacks the deep settings some people need. So, I figured I’d build a free alternative first.  
You can hook up any AI model you want with your own API key, but it ships with gpt-oss-120b via cerebras by default: so it’s free out of the box, just with a few usage caps.

## Comments

- **Steffenc7** (69↑): Why not use the built in feature for this?
And what model are you using behind it?
  - **KaizenBaizen** (15↑): There’s a built in feature for this?
    - **beyourownsunshine** (13↑): Yeah, it’s one of the AI features
  - **psychrisga** (15↑): Figma’s built-in AI is locked behind a paywall and lacks the deep settings some people need. So, I figured I’d build a free alternative first.  
You can hook up any AI model you want with your own API key, but it ships with gpt-oss-120b via cerebras by default: so it’s free out of the box, just with a few usage limit
  - **ranagirl** (3↑): The built in feature isn’t available for the free or education plans (students or instructors)
    - **Steffenc7** (-2↑): Imagine not wanting to pay 20 usd but happily coding a plugin and using api AI in that… in a tool you use for your work or passion
- **DifficultCarpenter00** (9↑): figma has the rename layers feature built in. why is this different?
  - **psychrisga** (9↑): 1. My plugin is totally free, while Figma makes you get a Full Seat for 20$.  
2. The plugin lets you tweak the prompt, which Figma doesn’t, and that can be super handy for some users (check the second image in the post).
    - **[deleted]** (1↑): Well done
- **rubiskhy** (5↑): Thank you for making this, I think having extended control over layer renaming is a great feature to have! 



Just tried it out, it does seem to rename the layers a bit randomly at times - 

https://preview.redd.it/m69lyjwaay8g1.png?width=2902&format=png&auto=webp&s=08edb02f81399ededef31e77a63103e1fe0febcb

for example all the "Badge Background" layers (except one) are the same size - but the renamed layers indicate a difference in size.

  
Very excited to keep using this plugin! <3
- **Sjeefr** (27↑): Honestly, what a waste of environmental energy.
- **IllustriousCode2603** (5↑): Frame 324? More like frame 2774855384993 for me....
- **SISO71** (2↑): worked like a charm!
- **Inflation_Artistic** (2↑): Read the comments, and I realised how detached people (even designers) are from reality. Some talk about the waste of environmental energy, others say it's already built in (for a fee). It amazes me.
  - **ShrimpCrackers** (1↑): right? They failed to realize this not only allows choice of AI but AI renaming. So its free AND has better features and yet they complain.
- **codywalton** (1↑): Or you can just name your layers as you make them like a sane person....
  - **BrokenInteger** (4↑): I've never met anyone who does this. They sound lovely!
    - **codywalton** (3↑): ![gif](giphy|1201hONkUdpK36)
- **solpuga** (1↑): Thank you! I will try this!
- **atonyproductions** (1↑): Cool stuff!!
