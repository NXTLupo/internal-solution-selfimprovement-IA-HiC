---
id: social-intelligence/reddit-deep/uxdesign/1tin0q8.md
url: "https://www.reddit.com/r/UXDesign/comments/1tin0q8/a_head_of_product_is_using_detailed_ai_prompts_to/"
kind: "social-post"
source: "reddit-deep: r/uxdesign"
subreddit: "uxdesign"
title: "A Head of Product is using detailed AI prompts to directly generate UX structure, copy, hierarchy, interaction decisions and UI detailing. How to approach this?"
author: "Immobilesteelrims"
date: "2026-05-20T14:15:50.000Z"
score: 39
upvote_ratio: 0.9
num_comments: 41
flair: "How do I… research, UI design, etc?"
extracted_at: "2026-09-10T17:19:34.950Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c0"
    char_span: [0, 857]
    sentence_count: 7
    key_terms: [comments, uxdesign, product, results, using, immobilesteelrims, don, accessibility]
    concepts: [comments, uxdesign, product, results, using]
    token_count: 198
    sources: [{"n":"reddit-deep: r/uxdesign","u":"https://www.reddit.com/r/UXDesign/comments/1tin0q8/a_head_of_product_is_using_detailed_ai_prompts_to/"}]
  - id: "social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c1"
    char_span: [872, 2605]
    sentence_count: 12
    key_terms: [work, product, tools, production, different, already, instead, build]
    concepts: [product, production, tools, different, already]
    section: Comments
    token_count: 358
  - id: "social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c2"
    char_span: [2607, 4202]
    sentence_count: 16
    key_terms: [design, doesn, head, shit, delivery, strategy, cgielow, metrics]
    concepts: [design, doesn, delivery, strategy, cgielow]
    section: Comments
    token_count: 396
  - id: "social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c3"
    char_span: [4204, 5390]
    sentence_count: 9
    key_terms: [design, product, end, headabbreviations786, run, amethystresist, collaboration, demonstrated]
    concepts: [design, product]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c4"]
    section: Comments
    token_count: 274
  - id: "social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c4"
    char_span: [5392, 7205]
    sentence_count: 20
    key_terms: [design, job, product, claude, doing, "i'd", consistent, organize]
    concepts: [design, product, claude, consistent, doing]
    related_chunks: ["social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c3"]
    section: Comments
    token_count: 427
  - id: "social-intelligence/reddit-deep/uxdesign/1tin0q8.md#c5"
    char_span: [7207, 8707]
    sentence_count: 19
    key_terms: [user, problem, accessibility, lot, time, behaviour, mistakes, metrics]
    concepts: [accessibility, problem, behaviour, mistakes, metrics]
    section: Comments
    token_count: 343
---
# A Head of Product is using detailed AI prompts to directly generate UX structure, copy, hierarchy, interaction decisions and UI detailing. How to approach this?

Source: [reddit-deep: r/uxdesign](https://www.reddit.com/r/UXDesign/comments/1tin0q8/a_head_of_product_is_using_detailed_ai_prompts_to/)
Posted by **Immobilesteelrims** · **39↑** · **41 comments**

He is also using the same AI (Figma Make) to audit its own AI generated designs for accessibility and scalability. The results don’t look good, are very cluttered and structurally are just a bunch of frames, not like components or anything. I’m the Sr product designer. How would you handle this? I was hoping the results would at least be useful as rough concepts or wireframes, but I don’t think even that is true because of how much of the design process he outsourced and locked into the AI.

## Comments

- **Silverjerk** (42↑): Full candor, if your head of product has already started to adopt these tools and is using them for production work, that train has already moved too far down the track. Getting in front of it now means you might be steamrolled in the process. It also means that whatever checks and balances would've typically been in place to prevent this sort of thing from happening were never there to begin with. I'm going to assume you don't have a design lead that is advocating for your team, and for using these tools as supplemental utilities, instead of as a drop-in replacements for experienced designers. That's fine. Different teams have different makeups. 

The best you can hope for is to become supportive while (carefully) putting guardrails in place. Instead of claiming outright that the work is failing, point out where it *might* fail, *why* it's not going to meet the needs of your users, and where real UX decisions/workflows/processes may have lead to a better result. Offer to co-develop the tools needed to make AI agents a more effective utility for your team. Build a skills library and prompt repository that requires the guidance of an actual designer, or forces product leaders to define requirements and goals before a single screen is generated. 

Or, act as the intermediary between your product head's work and production; offer to refine and "make it work." If their desire is to increase velocity in hopes of shipping faster, acquiesce and step into a role where you're the one applying the coat of polish. Obviously, this isn't an optimal solution, because you could be working from a flawed foundation, but over time trust will build, and you can eventually find a happy path forward. 

At the very least, you will be seen as willing to adapt and work with your existing team, instead of introducing friction and acting as a barrier between your product head and production.
  - **Esmerilemello** (3↑): This. Also while totally valid, try not to argue opinions.  Don’t say it looks bad or cluttered — bring curiosity forward: suggest testing/user research that shows what does / doesn’t work well, does / doesn’t scale, doesn’t / doesn’t meet brand guidelines, etc
- **Pacific_rental_511** (22↑): Take it like a visual PRD I guess. The worst thing about this, is Figma make is a pretty shit tool for doing this. If he really wanted to do this, he’d have read access on the codebase hooked up to Claude Design
- **cgielow** (52↑): 1. Your Head of Design needs to talk to them. 
2. You need to define your success metrics.
  - **igotdatmilk** (30↑): This comment right here perfectly encapsulates my distain for this profession.
    - **gianni_** (19↑): Likewise. The idea that we all have to continue dealing with this shit over and over in so many ways.
    - **cgielow** (34↑): Very likely this company doesn’t care about design. There won’t be a “head of design” to talk to them. Their success metrics are “on time delivery” and nothing about customer outcomes. OP is there as a tactical part of delivery not strategy. 

I’d say 70% of the market is like this. A lot resulted from the boot camp boom. And many companies are fine with this. Design is not part of their strategy. Some will succeed anyway.
    - **exaparsec** (-11↑): It’s funny how shit mostly comes from “veterans”

“You need to define your success metrics” wtf does that even mean in this situation
  - **amethystresist** (8↑): Y'all get heads of design?
  - **HeadAbbreviations786** (6↑): It’s amazing how shitty most UX leadership is. Absolute cucks.
  - **shoobe01** (2↑): And a RACI. If it's not their Actual Job (which it probably is not) then that's like including PPT drawings of the intended UI with the requirements from what are now the old days. Interesting maybe, definitely not prescriptive.
- **DelilahBT** (8↑): This may not be helpful and I’m sorry in advance but this is exactly what the democracy of AI design tools are enabling. Combined with historical “design is too slow/ a bottleneck” etc as context, many product cultures equate speed with impact, and leverage AI as an end run. 

As a senior designer, fighting a head of product will most likely not end well for you. 

So with that as backdrop, a foundational relationship and collaboration with product needs to happen. They’ve already demonstrated their disregard for design quality and process, so you’ve got to insert yourself in order to influence/ own it. Find out what’s driving this end run and lean into adjustments.

Also, maybe start looking for a new job.
  - **ladyoftheflowers** (1↑): Yes. I'd focus on staying in the loop about roadmap and what upcoming features are needed abd how you can quickly add value. Really focus on the product - ux aspect of the business and maybe start improving how your AI pulls from your design system. But if product is bypassing design, I'd worry less about what the screens look like and more about showing the value design is bringing, in ways it matters to product.
- **DefinitionOrnery6985** (6↑): Create a design.md file. Don't let him touch it... lol. Create a workspace for him to organize his own thoughts and ideas. They should punch out on brand at the least, so your brain cells don't explode. Set up sessions to review his ideas and talk through what works or not. He's going to ideate if that's his thing, just organize him. But YOU own the guidelines.
- **UnusualExamination82** (5↑): Once he thinks he is good enough, he will try to wipe out the UX department to gain brownie points with management for saving cost. Again, it’s this person who thinks he knows UX but actually doesn’t!
- **roundabout-design** (9↑): I'd ditch Figma. 

And then figure out how to babysit AI. For 2026, that is our job. Pretty much our only job. Companies are demanding AI usage, developers are spitting out code faster than ever, and we're just trying to keep the UX train on the rails as long as we can. 

What am I doing? Besides panicking? Trying to figure out how to stear Claude code in predicable consistent manners to at least get the UI figured out. My goal in the next few months is to flesh out a Claude friendly design system so that our UI is somewhat consistent, somewhat on brand. 

Claude is now doing the job all the UX folks were doing in Figma making prototypes and wireframes. 

I hope that will then leave time/room for us to do real broader UX work. Research. User testing. Roadmapping. Strategy. User flow analysis. Etc. Maybe in 2027.
- **Aurura** (3↑): You enforce user behaviour metrics so you can measure the issues occurring over time and show to execs what happened and why, and why ux needs to own the process.  You might not be able to win this fight. A lot of peoduct folks think they are designers now even though Ai makes a lot of mistakes and is confidently incorrect a lot.

Without metrics in place no one will know the ui is a problem and they can spin and deflect any churn or customer support requests on any problem they want.

Product historically has no idea why things are build the way they are and just care for a quick solution that's mostly correct. If you can point directly to any mistakes he is making, accessibility and final usability audits, user behaviour metric capturing, any dev time wasted on questions or meetings due to the problematic workflow or UI etc.. at least you can point to the risk occuring
- **Decent_Energy_6159** (3↑): Test it with actual assistive tech users. But you can’t because Figma Make output is not accessible. So the accessibility they think they’re achieving is a mirage. In case anyone at the company cares.
- **bill-it-a-bap23** (3↑): Are the concepts validated? Any plans to do that? That would be my first question. 

AI is just a quick way to an idea…does it solve the problem for your users…? let’s find out.
