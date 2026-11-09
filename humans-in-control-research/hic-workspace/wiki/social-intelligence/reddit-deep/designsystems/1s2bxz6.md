---
id: social-intelligence/reddit-deep/designsystems/1s2bxz6.md
url: "https://www.reddit.com/r/DesignSystems/comments/1s2bxz6/trying_to_build_an_ai_agent_for_designer_looking/"
kind: "social-post"
source: "reddit-deep: r/designsystems"
subreddit: "designsystems"
title: "Trying to build an ai agent for designer - looking for feedback"
author: "Firm-Space3019"
date: "2026-03-24T12:09:06.000Z"
score: 6
upvote_ratio: 0.69
num_comments: 14
flair: ""
extracted_at: "2026-09-10T17:19:04.802Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/designsystems/1s2bxz6.md#c0"
    char_span: [0, 1349]
    sentence_count: 3
    key_terms: [designers, system, existing, feedback, systems, designsystems, agent, comments]
    concepts: [designers, system, existing, feedback, designsystems]
    token_count: 311
    sources: [{"n":"reddit-deep: r/designsystems","u":"https://www.reddit.com/r/DesignSystems/comments/1s2bxz6/trying_to_build_an_ai_agent_for_designer_looking/"}]
  - id: "social-intelligence/reddit-deep/designsystems/1s2bxz6.md#c1"
    char_span: [1364, 3099]
    sentence_count: 1
    key_terms: [maleficent-anything2, storybook, firm-space3019, system, agent, conventions, experience, ghengeveld]
    concepts: [maleficent-anything2, storybook, firm-space3019, system, conventions]
    section: Comments
    token_count: 422
---
# Trying to build an ai agent for designer - looking for feedback

Source: [reddit-deep: r/designsystems](https://www.reddit.com/r/DesignSystems/comments/1s2bxz6/trying_to_build_an_ai_agent_for_designer_looking/)
Posted by **Firm-Space3019** · **6↑** · **14 comments**

I'm building an AI agent that should be tailor made for designers that try to work on existing systems, looking to feedback on the problem/solution space:  
\- I think that teaching designers CLI is a net-negative endevour.  
\- I think that while prototyping tools exploded, iterative solutions are not there yet.  
\- While there are a bunch of tools for developers, there are  very few focused on designers.

\- The copy/paste between figma and the system is not fun

From speaking with designer collegues i got this:  
\- Working directly on storybook or the system to iterate on components is critical

\- Figma to code is still broken, especially when translating to an existing system.  
\- We should abstract git, a lot of designers dont speak in git  
\- Pushing changes to existing systems is laregly a function of adhering to the system conventions.  
\- The agent should be visual, not CLI/IDE based.

  
These is what we got so far, really curious to hear feedback/thoughts etc.  
What will make your life easier using agents for real systems(not POCs/Side-projects)

## Comments

- **elwingo1** (3↑): you can definitely tell your agent to use design skills from here

https://typeui.sh/
  - **Maleficent-Anything2** (1↑): what is type.sh?  
a collection of MD files?
    - **elwingo1** (1↑): mostly, yes

it's also a cli that lets you pull them locally based on your ai tool

also you can generate

we have some interesting ideas though to develop on top of this though
- **ghengeveld** (2↑): Storybook just released its MCP server: https://storybook.js.org/ai
  - **Firm-Space3019** (1↑): we’re thinking of integrating with storybook actually, but what did you mean?
    - **ghengeveld** (1↑): Comment updated 👍
- **MediumBlackberry4161** (1↑): the git abstraction point is so real, i've watched designers completely freeze up the moment someone mentions "just commit and push" like its the simplest thing in the world. if your agent can genuinely hide that complexity without breaking things for the devs on the other end, thats honestly the biggest win you could go for, the figma to existing system translation problem is also way harder than people give it credit for. its not just converting designs to code, its mapping intent to whatever conventions and tokens the system already has. curious how youre handling that part specifically, like does the agent need to be "trained" on the system first or does it figure out conventions on its own?
- **Maleficent-Anything2** (1↑): what is your experience? what makes you think you could build a good tool in this space?
  - **Firm-Space3019** (1↑): built a couple of multi-million dollar software in similar spaces. what is yours?
    - **Maleficent-Anything2** (1↑): Im building systematically.io,
Previously 10 years of experience in multi brand design systems
