---
id: social-intelligence/reddit-deep/figmadesign/1szpq34.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1szpq34/are_you_actually_using_figma_variables_in_a/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Are you actually using Figma variables in a mature design system?"
author: "OkLettuce7089"
date: "2026-04-30T08:07:05.000Z"
score: 36
upvote_ratio: 0.85
num_comments: 39
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.229Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c0"
    char_span: [0, 1200]
    sentence_count: 7
    key_terms: [variables, system, design, styles, figma, figmadesign, comments, already]
    concepts: [variables, system, design, styles, figmadesign]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1szpq34.md#c1", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c2", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c3"]
    token_count: 262
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1szpq34/are_you_actually_using_figma_variables_in_a/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c1"
    char_span: [1215, 3048]
    sentence_count: 9
    key_terms: [engineering, figma, variables, use, variable, design, tokens, modes]
    concepts: [engineering, figma, variables, variable, design]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1szpq34.md#c0", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c2", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c3"]
    section: Comments
    token_count: 408
  - id: "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c2"
    char_span: [3050, 4784]
    sentence_count: 10
    key_terms: [variables, prototyping, design, use, benefit, colors, system, tokens]
    concepts: [variables, prototyping, design, benefit, colors]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1szpq34.md#c0", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c1", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c3"]
    section: Comments
    token_count: 404
  - id: "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c3"
    char_span: [4786, 6835]
    sentence_count: 14
    key_terms: [variables, design, tokens, using, system, collections, use, component]
    concepts: [variables, design, tokens, using, system]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1szpq34.md#c0", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c1", "social-intelligence/reddit-deep/figmadesign/1szpq34.md#c2"]
    section: Comments
    token_count: 452
---
# Are you actually using Figma variables in a mature design system?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1szpq34/are_you_actually_using_figma_variables_in_a/)
Posted by **OkLettuce7089** · **36↑** · **39 comments**

When I joined my current company, we already had a pretty large design system built using components and styles (colors, text, spacing, shadows, etc.).

When variables were introduced in Figma, we looked into them but didn’t really see a strong reason to migrate everything from styles → variables. The main benefit seemed to be faster prototyping, but with newer AI features (like Figma Make), even that feels less critical for us.

So we stuck with styles and never made the switch.

I can see how variables would make more sense if you’re starting a design system from scratch—but migrating an existing, stable system feels like a lot of effort without a super clear payoff.

Curious to hear from others:

\- If you already had a design system built with styles, did you convert to variables?

\- What were the biggest benefits you actually saw in practice?

\- Do variables actually help more when working with AI tools / automation?

## Comments

- **Clear-Secretary-8185** (55↑): The main benefit comes from using a shared external source of truth like Tokens Studio or hosted json so Figma and engineering are using identical, in-sync data. 

Within Figma the advantage is you can incorporate semantic and primitive layers beneath your surface theming to capture design decisions, ensure consistency and cascade changes easily.
  - **Master_Editor_9575** (16↑): The main benefit imo is the themeing and modes capabilities. Using styles you’d need a new value for every single mode and theme.
  - **OrtizDupri** (3↑): yeah we use Figma variables as the source of truth and have it automated so all our color/spacing/text/etc. tokens get automatically synced to code every Sunday
    - **stvn-pxl** (2↑): This, and everything above mentioned.. variables are a powerhouse if used correctly from dev an design dept
    - **smylesforstyles** (1↑): How do you automate it?
- **ojanti** (14↑): I think it also depends on how sophisticated the engineering team is. If your engineering teams doesnt even make use of tokens or some variable library, then you may have bigger things to clean up my friend :D

But if they do have some variable/token setup then I think some of the key benefits over styles are:  
\- MODES: Really helps and keeps things more scalable if you want to implement multi-modal styling like dark mode or multibrand. Even worse, multibrand dark mode

\- Really helps with syncing with engineering: Moves design/figma setup closer to what engineers use. Also the detials in the figma inspector gives engineers better information. External tooling is more comfortable reading variables
- **SmoothMojoDesign** (11↑): You can use variable modes. You can abstract primitive and semantic layers for a more flexible structure. These are the two biggest reasons to switch. 

Curious what you mean by faster prototyping…?
  - **OkLettuce7089** (0↑): Let's say now if I need to present a prototype with my designs I'll just use AI agents to create html prototype, I dont use Figmas prototyping for this anymore
- **Sketaverse** (8↑): Yeah 100% including gaps, padding, corner radius etc. tbh can’t imagine not using it and must be a nightmare to use ai without them
- **Pelm3shka** (9↑): When we switched from Adobe XD to Figma a few years ago, variables had just been introduced, so we made our design system with variables and tokens in mind, since we \_had\_ to redo it anyway.

Biggest benefit are themes. We have two main products : a mobile app, and a webapp, with two distinct color schemes. Margins / padding and colors are different, but we maintain only one design system for both. Like the button, input, icons components are shared even though the colors, spacing are different.

It's also useful to maintain a light/dark theme (with design tokens named "contrast1" for example if I want to choose a neutral color that has a \~10% contrast against the background ; or "darker3" if I want to pick a color that will be \~30% darker than the background whether the theme is light or dark).

Once you set in place your variables and tokens correctly, you have 0 time spent on derivating new components for all themes.

That's the biggest benefit I see honestly, for variables within the design system. Another benefit would be flexibility (if I want to change ALL the paddings or colors, I have only one value to change), but honestly this hasn't happened in the few years we've been using it.

I mainly use variables for prototyping (hiding / revealing elements depending on what's selected in a form).

I do not use AI tools within Figma, so can't answer your last question.
- **marfz** (6↑): We started using design tokens before Figma introduced variables, since the latter were quite limited I didn’t even learn how to set them up properly. The main benefit is that your json is the source of truth that keeps design and code in sync. This also allows designer to push changes to production with no engineering effort.
- **samuelbroombyphotog** (7↑): In my company, we are using variables to close the gap between design and dev. With it, we're able to achieve seamless theme transitions and breakpoint considerations. I'm currently building a plugin that we've been using in pre-alpha that takes our variables and compiles them into practical css tokens and dev ready component classes complete with states and variant combo classes. Without our transformation layer, variables are often too heavy on a project by project basis for developers to want to use them meaningfully. We could use AI instead of the plugin, but it tends to create more variability and inconsistency in terms of how tokens are interpreted into workable CSS.
- **PsychologicalEmu348** (20↑): A design system still using style in 2026 and not tokens / variables is a pretty big joke.
  - **TobiramaSenju_77** (2↑): 🥀
  - **bradenlikestoreddit** (2↑): Not really, not every system is extremely complex. Styles are fine if it was built that way and has worked. Move to variables when it makes sense.
- **Neganix** (4↑): Yes, we converted our styles into variables. Native variables and modes were a huge benefit for us as they allowed us to properly created themed components for all our sub brands. Before that we had separate, duplicate component files for each theme and that was painful. Now there's also extended collections, which we still have not transitioned into. Currently all themes as own modes, but there's some benefits in extended collections as well.
- **newtownkid** (4↑): Yes. You can’t really expand your design system until you align your variable with eng.
