---
id: social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md
url: "https://www.reddit.com/r/MarketingAutomation/comments/1qxn9hs/im_quitting_n8n_heres_what_im_using_instead/"
kind: "social-post"
source: "reddit-deep: r/marketingautomation"
subreddit: "marketingautomation"
title: "I'm quitting n8n. Here's what I'm using instead."
author: "Personal-Present9789"
date: "2026-02-06T17:03:10.000Z"
score: 63
upvote_ratio: 0.9
num_comments: 27
flair: ""
extracted_at: "2026-08-26T18:56:55.790Z"
extraction_method: "praw-deep"
research_goal: "Deliver a technical architecture and implementation blueprint for Deciem's marketing and design teams to automate the email production workflow from Figma design to validated, sendable HTML using a multi-agent AI system, specifying agent roles, skills, and Model Context Protocol configurations that connect Figma libraries, brand guidelines, and design patterns while preserving creative flexibility and brand compliance, based on state of the art evidence current as of August 2026 and no earlier than January 2026. Define the reusable email component approach (including MJML), sending-platform and personalization-token integration, and the QA and validation criteria that qualify automated output as sendable."
engagement: "deliver-a-technical-architecture-and-implementation-blueprin"
chunks:
  - id: "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c0"
    char_span: [0, 1974]
    sentence_count: 27
    key_terms: [n8n, claude, automations, client, marketingautomation, files, workflows, "i'm"]
    concepts: [claude, automations, marketingautomation, client, workflows]
    related_chunks: ["social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c1", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c2", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c4"]
    token_count: 500
    sources: [{"n":"reddit-deep: r/marketingautomation","u":"https://www.reddit.com/r/MarketingAutomation/comments/1qxn9hs/im_quitting_n8n_heres_what_im_using_instead/"}]
  - id: "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c1"
    char_span: [1976, 3988]
    sentence_count: 13
    key_terms: [claude, workflow, n8n, requirements, mcp, meeting, via, client]
    concepts: [claude, workflow, requirements, meeting, client]
    related_chunks: ["social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c0", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c2", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c4"]
    token_count: 502
  - id: "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c2"
    char_span: [3990, 6180]
    sentence_count: 28
    key_terms: [claude, building, workflow, n8n, something, workflows, manually, patterns]
    concepts: [claude, building, workflow, something, workflows]
    related_chunks: ["social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c0", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c1", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c4"]
    token_count: 501
  - id: "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c3"
    char_span: [6195, 6895]
    sentence_count: 2
    key_terms: [upandone, dash, here, "i'd", tool, uebqrqus6xhg1, rockypatella, sockosopher]
    concepts: [upandone]
    section: Comments
    token_count: 241
  - id: "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c4"
    char_span: [6897, 8984]
    sentence_count: 14
    key_terms: [claude, workflow, workflows, n8n, sounds, "you've", code, like]
    concepts: [claude, workflow, workflows, sounds, "you've"]
    related_chunks: ["social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c0", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c1", "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c2"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/marketingautomation/1qxn9hs.md#c5"
    char_span: [8726, 9094]
    sentence_count: 3
    key_terms: ["you've", christophmuller, bundlesocial, challenges, interested, transition, dzypassio, insights]
    concepts: ["you've"]
    section: Comments
    token_count: 99
---
# I'm quitting n8n. Here's what I'm using instead.

Source: [reddit-deep: r/marketingautomation](https://www.reddit.com/r/MarketingAutomation/comments/1qxn9hs/im_quitting_n8n_heres_what_im_using_instead/)
Posted by **Personal-Present9789** · **63↑** · **27 comments**

Before you downvote — I'm not saying n8n is bad. I've built hundreds of workflows with it. It's incredible.

But the way I use it has completely changed.

I used to spend hours in the n8n UI:

* Dragging nodes
* Debugging connections
* Testing edge cases
* Rebuilding when requirements changed

Now? I haven't logged into n8n in weeks. My automations are more complex than ever.

Here's what changed.

# The shift: From building workflows to describing workflows

The old way:

1. Client describes what they need
2. I interpret requirements
3. I manually build in n8n
4. I test, debug, rebuild
5. Client wants changes
6. Repeat steps 3-5

The new way:

1. Client describes what they need (or I record the meeting)
2. AI builds the workflow
3. I review and push to n8n
4. Client wants changes
5. AI rebuilds it

I went from *building* automations to *designing* automations.

# The stack that made this possible

Here's exactly what I'm using:

**1. Claude + Claude Code**

Claude Code is a game-changer for agentic work. It's not just "chat with AI" — it's an autonomous coding agent that can:

* Read files and context
* Write and execute code
* Create complete n8n workflow JSON files
* Iterate based on feedback

I give it a task, it figures out how to do it.

**2. Skills/Knowledge files**

This is the unlock most people miss.

I've built a library of "skills" — markdown files that teach Claude how I work:

* My n8n patterns and conventions
* Common workflow templates
* API documentation for tools I use
* Edge cases and how to handle them

When I start a project, I load the relevant skills. Claude doesn't start from zero — it starts from my accumulated knowledge.

Example skill file structure:

    /skills
      /n8n
        - SKILL.md (how I structure workflows)
        - templates/ (common patterns)
        - apis/ (service-specific docs)
      /integrations
        - hubspot.md
        - slack.md
        - notion.md
    

**3. MCP (Model Context Protocol) for n8n**

This is where it gets wild.

MCP lets Claude *directly interact* with n8n. Not just generate JSON — actually push workflows to my n8n instance.

The flow:

1. Claude generates the workflow
2. Claude validates it
3. Claude pushes it directly to n8n via MCP
4. I review in n8n (or don't, if I trust the pattern)

I can go from "I need a workflow that does X" to "workflow is live" without opening the n8n UI.

**4. Meeting transcription → Requirements → Workflow**

Here's the full end-to-end I've been using:

1. **Record client meeting** (Fireflies, Otter, etc.)
2. **Feed transcript to Claude** with prompt: "Extract automation requirements from this meeting"
3. **Claude outputs structured requirements** (trigger, inputs, logic, outputs)
4. **Feed requirements to Claude Code** with n8n skills loaded
5. **Claude builds the workflow JSON**
6. **Push to n8n via MCP**
7. **Test and iterate** (Claude can read error logs and fix)

Client meeting → Live workflow. No manual building.

# What this looks like in practice

**Example: Client needs a lead enrichment workflow**

Old way (2-4 hours):

* Open n8n
* Add webhook trigger
* Add HTTP nodes for enrichment APIs
* Parse responses
* Handle errors
* Connect to CRM
* Test with sample data
* Debug the 5 things that broke
* Document (lol, who documents)

New way (20 minutes):

* Tell Claude: "Build a workflow that receives a webhook with email, enriches via Apollo and Clearbit, scores the lead, and pushes to HubSpot. Handle rate limits and missing data gracefully."
* Claude generates workflow with all error handling
* Push via MCP
* Test
* Done

The 20 minutes is mostly me reviewing and testing. The build is instant.

# Why this is better than just "using ChatGPT to help"

I tried the ChatGPT approach. Ask it to write n8n JSON, copy-paste, import. It works... sometimes.

The difference with this stack:

1. **Context persistence** — Skills mean Claude knows my patterns. It doesn't suggest stupid stuff.
2. **True autonomy** — Claude Code can execute, test, and iterate. It's not just generating text for me to copy.
3. **Direct integration** — MCP means no copy-paste. Workflow goes straight to n8n.
4. **End-to-end pipeline** — Meeting → requirements → workflow → deployed. No gaps where I have to manually intervene.

# The workflows I still build manually

I'm not 100% hands-off. I still open n8n for:

* **Complex debugging** — When something fails in production and I need to inspect execution data
* **Visual review** — Sometimes I want to see the flow visually before approving
* **One-off experiments** — Quick tests where describing it takes longer than building it

But for standard builds? Client projects? Repeated patterns?

I haven't touched the UI in weeks.

# How to start (if you want to try this)

1. **Get Claude Code access** — It's the foundation. Regular Claude chat won't cut it.
2. **Build your first skill file** — Start simple. Document how you structure n8n workflows. Your naming conventions. Your error handling patterns.
3. **Set up n8n MCP** — This lets Claude push directly to your instance. Game changer.
4. **Start with a simple workflow** — Don't try to build something complex first. Do a basic webhook → Slack notification. Get the flow working.
5. **Iterate your skills** — Every time Claude does something wrong, add it to the skill file. "Don't do X, do Y instead." Your skills compound.

# The mental shift

The hardest part isn't technical. It's letting go of control.

I *liked* building workflows. It felt productive. Dragging nodes, connecting things, seeing it work.

But that's not where I add value anymore.

My value is:

* Understanding what the client actually needs
* Architecting the right solution
* Reviewing and quality-checking
* Handling edge cases AI misses

The mechanical building? That's commoditized now.

If you're still manually building every workflow, you're competing with people who aren't.

## Comments

- **Upandone** (15↑): https://preview.redd.it/uebqrqus6xhg1.jpeg?width=950&format=pjpg&auto=webp&s=21b4469c9c1af67c3e0cba617b853035ed843543

Quiz time peeps: Which character in OP's message gave him away? 😁
  - **RockyPatella** (5↑): I'd say the Em dashes, the arrows, and the bullets. At least for me on a phone I'd never put in the effort to do all that.
    - **Upandone** (1↑): Well spotted 🙂

Ps. not just any (hyphen, N dash) but nice fat Em dash 😁
  - **sockosopher** (3↑): Just came here to ask which tool you used here? 😅
    - **Upandone** (2↑): Pic from one of the free tools online after I dropped the text in turnitin (tool not for general public)
  - **CCMALLC** (2↑): 😲😲😲...but WHY????

Is it the punctuation?
I just skimmed to see what jumped out at me.
  - **Less-Engineering-663** (1↑): Dash
  - **AdventureAardvark** (1↑): “Here’s what changed.”
  - **blackon** (1↑): But
  - **Sestamibi6** (1↑): The clickbait title.
  - **Positive-Move9258** (1↑): Hyphens Hyphens
- **RentScranton** (2↑): Definitely need a mindset adjustment in the world of AI!  
Thanks!
- **Alternative-Corgi104** (2↑): This is honestly a solid shift. Feels less like “AI replacing builders” and more like leveling up from mechanic to architect. The skills library + MCP combo sounds insanely powerful too. Curious though, how do you handle versioning and rollback when Claude pushes changes directly? Sounds awesome but also slightly terrifying.
- **Azerax** (2↑): Ai written or not, this is a good setup. I use openclaw to do something similar and have workflow examples in chromadb as reference.
- **davidyu3737** (1↑): Regardless of the click bait AI article, n8n workflows generated by Claude code with the right n8n mcp server and Claude skill can generate a pretty close to production ready workflow. But the real skill has never been if you can build workflow, it’s understanding the problem you’re trying to solve. Maybe n8n is not even the right stack to use.
- **keithgroben** (1↑): I didn't know anyone still build workflows without Claude Code.
- **rojablanca1937** (1↑): And what about the costs
- **singular-innovation** (-2↑): Your shift from manually building workflows to using AI for designing them is a fascinating evolution. The way you've harnessed Claude Code to automate more complex processes directly through n8n sounds like a significant productivity boost. For those still relying heavily on manual workflow creations, your story could serve as a compelling case study for embracing AI tools to enhance efficiency. If you're open to it, I'd be interested in learning more about how you've set up your skills library for Claude and any challenges you've faced during this transition. Looking forward to your insights!
  - **christophmuller** (3↑): Lmfao
  - **bundlesocial** (1↑): Can you please tell me a recipe that you find best for making tomato soup?
  - **DzyPassio** (1↑): n1
