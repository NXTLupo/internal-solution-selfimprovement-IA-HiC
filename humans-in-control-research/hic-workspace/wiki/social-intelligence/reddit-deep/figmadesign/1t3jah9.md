---
id: social-intelligence/reddit-deep/figmadesign/1t3jah9.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1t3jah9/i_made_a_plugin_that_generates_design_system/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "I made a plugin that generates design system anatomy in a click"
author: "BeingMani97"
date: "2026-05-04T14:26:40.000Z"
score: 93
upvote_ratio: 0.96
num_comments: 23
flair: "resources"
extracted_at: "2026-09-10T17:19:11.233Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1t3jah9.md#c0"
    char_span: [0, 2024]
    sentence_count: 4
    key_terms: [component, autospec-design-system-documentation, design, plugin, https, anatomy, element, community]
    concepts: [component, autospec-design-system-documentation, design, plugin, https]
    token_count: 446
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1t3jah9/i_made_a_plugin_that_generates_design_system/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1t3jah9.md#c1"
    char_span: [2039, 3708]
    sentence_count: 8
    key_terms: [working, beingmani97, specs, component, different, property, supports, documentation]
    concepts: [beingmani97, working, component, different, specs]
    section: Comments
    token_count: 428
---
# I made a plugin that generates design system anatomy in a click

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1t3jah9/i_made_a_plugin_that_generates_design_system/)
Posted by **BeingMani97** · **93↑** · **23 comments**

ever been the person handling the design system in your team and had to manually document the anatomy of every single component?  
  
i create documentation for each component we build breaking down every element, labelling parts, noting sizes, colours, spacing , literally everything my developer team needs. it’s honestly one of the most time consuming parts of maintaining a design system. doing it manually for every component was getting really hectic and i always wanted to automate it. 

so i built autospec - a plugin that generates the full anatomy of any component with a single click. i've been using this plugin internally and its been helping us a lot and wanted to get feedback from people who are using it, so i can make it bigger and improve it based on the feedback i get. 

These are just intial versions and i've been cooking a lot in the background with many features.

Here is what it can do for now :

* select any component and hit generate anatomy
* automatically detects and annotates every element inside the component
* labels each element with numbered markers (1, 2, 3…)
* generates a detailed table on the left panel mapping each number to the element name, size, colour, and other design specs
* gives developers a clear visual breakdown of how the component is structured and what design tokens are being used.

  
i’m a designer who builds figma plugins to automate parts of the design workflow. would love to hear your thoughts on this one.

Link : [https://figmaplugins.co/autospec](https://figmaplugins.co/autospec)

Community link : [https://www.figma.com/community/plugin/1617583429485136783/autospec-design-system-documentation](https://www.figma.com/community/plugin/1617583429485136783/autospec-design-system-documentation)

## Comments

- **Master_Editor_9575** (5↑): What’s the main difference between this and Nathan Curtis’s plugin?

Does it notate variables?
  - **BeingMani97** (2↑): the working model kinda similar but the features and the way we present are very different.  
  
Things we are different from specs :

\- Supports Dark and Light Mode documentation  
\- Supports Variables   
\- Good UI for documentation  
\- Supports Measure, Anatomy, Properties, Property table  
\- All automated, designs documents for a component in minutes  
\- Can render different modes, properties  
\- and many more in the future.

Few features may overlap with specs, but its better and fast.
    - **alygraphy** (4↑): Does it auto-update when you make changes to the component? or something
    - **Master_Editor_9575** (1↑): Specs does all of this… I’ll give it a shot though and let you know.
    - **nathanacurtisedgy** (1↑): I will have to check it out!
- **moscamolo** (3↑): It’s not working for me at the moment.
  - **BeingMani97** (1↑): Hey what the issue you are facing?

I can see its working from my side?
    - **moscamolo** (1↑): It won’t show up on my plugins nor Community when I search for it. :( Even when I click on the community link, I see nothing when I try to open it on my components file.
- **GOgly_MoOgly** (1↑): In the middle of a DS refresh and will check this out! Anatomy was manual before, or needing editing with specs, hopefully this is better
  - **GOgly_MoOgly** (2↑): Update: the property table isn’t working at all. It’s been 10 mins for me and it’s still running.
    - **BeingMani97** (1↑): Hey, What issue you are getting?

The property table works only for component?
