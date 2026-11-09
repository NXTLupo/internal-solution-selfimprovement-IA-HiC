---
id: social-intelligence/reddit-deep/graphic_design/1sg2awp.md
url: "https://www.reddit.com/r/graphic_design/comments/1sg2awp/designed_my_cs_portfolio_from_scratch_eink/"
kind: "social-post"
source: "reddit-deep: r/graphic_design"
subreddit: "graphic_design"
title: "Designed my CS portfolio from scratch. E-ink / Terminal aesthetics with custom physics animations. How does the UI/UX feel?"
author: "Separate_Hunt7096"
date: "2026-04-08T19:07:15.000Z"
score: 2
upvote_ratio: 1
num_comments: 2
flair: "Portfolio/CV Review"
extracted_at: "2026-08-25T23:08:58.869Z"
extraction_method: "praw-deep"
research_goal: "Identify high-converting email design patterns and product marketing trends for 2026 to guide the template redesign of a clean, organic cosmetics and skincare brand targeting Gen Z."
engagement: "identify-high-converting-email-design-patterns-and-product-m"
chunks:
  - id: "social-intelligence/reddit-deep/graphic_design/1sg2awp.md#c0"
    char_span: [0, 1985]
    sentence_count: 12
    key_terms: [mode, visual, e-ink, light, animations, aesthetic, interface, portfolio]
    concepts: [visual, animations, e-ink, light, aesthetic]
    token_count: 427
    sources: [{"n":"reddit-deep: r/graphic_design","u":"https://www.reddit.com/r/graphic_design/comments/1sg2awp/designed_my_cs_portfolio_from_scratch_eink/"}]
  - id: "social-intelligence/reddit-deep/graphic_design/1sg2awp.md#c1"
    char_span: [2000, 4046]
    sentence_count: 17
    key_terms: [feedback, bit, "it's", animations, refreshing, something, better, effect]
    concepts: [feedback, animations, refreshing, something, better]
    section: Comments
    token_count: 478
  - id: "social-intelligence/reddit-deep/graphic_design/1sg2awp.md#c2"
    char_span: [4048, 4334]
    sentence_count: 4
    key_terms: [everything, typography, guessing, loading, overall, project, settles, shifted]
    section: Comments
    token_count: 64
---
# Designed my CS portfolio from scratch. E-ink / Terminal aesthetics with custom physics animations. How does the UI/UX feel?

Source: [reddit-deep: r/graphic_design](https://www.reddit.com/r/graphic_design/comments/1sg2awp/designed_my_cs_portfolio_from_scratch_eink/)
Posted by **Separate_Hunt7096** · **2↑** · **2 comments**

Hi everyone!

I’m a Computer Science student currently putting together my [personal web portfolio](https://portfolio-sand-delta-34.vercel.app/). While my background is mostly technical, I really wanted to challenge myself to design an interface that feels tactile, fluid, and visually engaging without relying on pre-made templates or heavy UI frameworks.

The visual concept is split into two distinct themes:

* **Dark Mode:** A sleek, terminal-inspired look with high contrast and neon accents.
* **Light Mode:** An "E-ink" / technical manual aesthetic (sand/beige backgrounds with ink-dark text) to make reading long project case studies easier on the eyes.

I’d love your critical eye on the visual flow and the overall user experience. Specifically, I'm looking for feedback on:

1. **The Animations ("Lego Effect"):** Titles and text blocks fall into place asynchronously. 
2. **Theme Transition:** I used a "cascade/wipe" effect when switching between Dark and Light mode.
3. **IDE-Style Modals:** Instead of standard popups, my project case studies open in a full-screen layout styled like a code editor (with a sidebar, file tree, etc.).
4. **Overall Polish:** Typography choices, spacing, and color contrast (especially in the E-ink light mode).

*(Disclaimer: The avatar picture and any images labeled "Fizz" or placeholders are strictly temporary just to test the layout grid and image borders).*

I really want to make the interface feel cohesive and premium. Does the motion design complement the minimalist aesthetic? Any brutal honesty or suggestions on how to improve the visual hierarchy would be hugely appreciated.

Thanks in advance!!

## Comments

- **AutoModerator** (1↑): # Guidance for providing useful feedback

* **Read OP's description first** to understand what they're looking for. (Please report low-effort posts that don't contain enough context). 
* **Be professional and constructive** — respect the effort put in and be kind with your feedback. This is a safe space for designers of all levels, and feedback that is aggressive or unproductive will be removed and may result in a ban
* **Be specific and detailed** — explore *why* something works or doesn't work and how it could be improved
* **Focus on design fundamentals** — hierarchy, flow, balance, proportion, and communication effectiveness
* **Stay on-topic** — keep comments focused on the strengths/weaknesses of the work itself
---


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/graphic_design) if you have any questions or concerns.*
- **Typical-Tax1584** (1↑): Sure, I'll go bit by bit.  

Both modes are pretty good, I'll give the nod to your light mode. I think you really nailed the e-ink vibe.   

Animations:  

I did not notice a lego effect. I tried it on firefox, chrome, and edge. The titles and text blocks are simply there. They don't seem to be animating at all. I tried refreshing, hard refreshing, nothing.  

Most of your micro animations are great, I think the larger movement on hover states is too strong. The boxes travel too far and the drop shadow is a bit much, and I think you'd be better served by a more subtle shift and a gentler mouseout/leave - it's a touch abrupt now and I think it's due to the distance it has to travel.   

I do think the lightbox/pop-up effect that comes up when clicking on menu items is weird since it's also paired with an anchor. I'm not sure I get it. You're taking me to a spot on the page and then opening an overlay as well. Idk, I'm not a fan of that idea. It'd feel better if it scrolled you to the right place and expanded something that's on-page rather than the box.  

Everything else, typography, line height and width all looks good. I will note that when the page first loads it's shifted to the left a bit and then it settles back to the right. I'm guessing it has to do with the drawer menu loading.  

But this is a really solid project overall, gj.
