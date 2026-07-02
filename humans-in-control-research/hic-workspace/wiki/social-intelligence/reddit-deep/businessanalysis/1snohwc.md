---
id: social-intelligence/reddit-deep/businessanalysis/1snohwc.md
url: "https://www.reddit.com/r/businessanalysis/comments/1snohwc/bpmn_diagramming_in_visio_help_previously_used/"
kind: "social-post"
source: "reddit-deep: r/businessanalysis"
subreddit: "businessanalysis"
title: "Bpmn diagramming in visio help? (Previously used lucidchart)"
author: "fruitybix"
date: "2026-04-17T02:47:18.000Z"
score: 9
upvote_ratio: 1
num_comments: 14
flair: ""
extracted_at: "2026-06-23T20:32:15.457Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/businessanalysis/1snohwc.md#c0"
    char_span: [0, 1426]
    sentence_count: 12
    key_terms: [visio, diagrams, businessanalysis, default, having, bpmn, lot, lucidchart]
    concepts: [diagrams, visio, businessanalysis, default, having]
    related_chunks: ["social-intelligence/reddit-deep/businessanalysis/1snohwc.md#c2"]
    token_count: 331
    sources: [{"n":"reddit-deep: r/businessanalysis","u":"https://www.reddit.com/r/businessanalysis/comments/1snohwc/bpmn_diagramming_in_visio_help_previously_used/"}]
  - id: "social-intelligence/reddit-deep/businessanalysis/1snohwc.md#c1"
    char_span: [1440, 3581]
    sentence_count: 13
    key_terms: [message, demystifying-business-analysis-for-business-owners-a-beginners-guide, bpmn, connector, here, template, businessanalysis, https]
    concepts: [message, businessanalysis, connector, template, reddiquette]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/businessanalysis/1snohwc.md#c2"
    char_span: [3583, 4486]
    sentence_count: 8
    key_terms: [connector, use, sequence, drag, flow, need, default, select]
    concepts: [connector, sequence, default, select, visio]
    related_chunks: ["social-intelligence/reddit-deep/businessanalysis/1snohwc.md#c0"]
    section: Comments
    token_count: 202
---
# Bpmn diagramming in visio help? (Previously used lucidchart)

Source: [reddit-deep: r/businessanalysis](https://www.reddit.com/r/businessanalysis/comments/1snohwc/bpmn_diagramming_in_visio_help_previously_used/)
Posted by **fruitybix** · **9↑** · **14 comments**

Heya,

My new job only has default visio. I need to create a lot of very big, detailed bpmn 2.0 diagrams.

Lucidchart workflow at previous job was a lot better / easier. eight years ago i was doing the same in visio using a great deal of customizations maintained by that org which made it easy. Ive also used ARIS / draw.io and found those okay.

Im finding switching back to default visio bpmn diagrams agonizing - stuff like setting lines to process / message flow, not having swimlanes resize, not having shapes line up without a lot of fiddling. Im spending all my time fighting the tool with its focus on dragging shapes in from the side and having to change the default template to get arrows showing on connectors. Every step requires several more mouse clicks then other tools, hotkeys listed in guides dont seem to work, its all very slow.

Any advice / proven guides on how to streamline my workflow? No option to install add ons, that requires an arduous security review. 

Also, whats the best option to embed visio diagrams into confluence / jira? Best practice for archiving diagrams when its not purely web / cloud based like in lucid?

Cheers.

## Comments

- **AutoModerator** (1↑): Welcome to /r/businessanalysis the best place for Business Analysis discussion.

Here are some tips for the best experience here.

You can find [reading materials on business analysis here](https://betterauds.com/businesses/demystifying-business-analysis-for-business-owners-a-beginners-guide/). 

Also here are the rules of the sub:

Subreddit Rules

* Keep it Professional.
* Do not advertise goods/services.
* Follow [Reddiquette.](https://www.reddithelp.com/en/categories/reddit-101/reddit-basics/reddiquette)
* Report Spam!


This is an automated message so if you need to contact the mods, please [Message the Mods](https://www.reddit.com/message/compose?to=%2Fr%2Fbusinessanalysis) for assistance.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/businessanalysis) if you have any questions or concerns.*
- **PeregrineFeatherston** (1↑): Orbus have a free Visio BPMN stencil that makes it slightly less painful, but it's still not as easy as Lucid or similar.
- **Signal-Abrocoma-4168** (1↑): I use draw.io for bpmn flows. It can be embedded directly in Confluence.
  - **fruitybix** (1↑): Sadly i dont have the option - strategic decision is to use visio (global company)
- **New-Society-524** (1↑): [ Removed by Reddit ]
- **Pm1337** (1↑): Are you using the BPMN template? All those things you mentioned aren't issues at all with the BPMN template. The default connector is a sequence flow arrow, you right click and select for a message flow arrow, pools resize, etc. You select New, then search for BPMN.
  - **fruitybix** (1↑): You need to click the connector on the side bar and drag it onto the canvas, then connect each end to the shapes you want to connect to. 

As opposed to just dragging between shapes. Like with every other process mapping tool on the market. 

I have edited the default connector to include arrows as per several online guides but this immediately caused stability issues (hard crashing to desktop with large documents when the new template is applied or when someone else opens the document)

I have convinced the powers that be to let me use lucid. Quite disappointed in how visio has performed tbh. I would need to spend a lot of time configuring visio and forcing it to behave the way i need it to, and it would still not offer integration with confluence or provide collab options like web based tools. We just dont have the time for me to be doing that.
    - **Pm1337** (1↑): No I never have to manually drag the connector over, instead I use the hotkey ctrl +3 to use the default sequence flow connector. No need to customize a connector to include an arrow because when you have the BPMN template selected the default connector is a sequence flow connector. Use ctrl +1 to go back into select mode. If you have Autoconnect turned on you won't have to do much drag and drop. You can select one of the blue arrows and hold and then drag a sequence flow connector to whatever point you want.
