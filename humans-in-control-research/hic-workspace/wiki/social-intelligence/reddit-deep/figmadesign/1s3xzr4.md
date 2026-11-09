---
id: social-intelligence/reddit-deep/figmadesign/1s3xzr4.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1s3xzr4/how_has_your_experience_been_using_claude_with/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "How has your experience been using claude with figma mcp - Feeding in current design system and making new designs based on it?"
author: "TimeAccomplished5508"
date: "2026-03-26T04:44:04.000Z"
score: 40
upvote_ratio: 0.86
num_comments: 39
flair: "help"
extracted_at: "2026-09-10T17:19:11.232Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c0"
    char_span: [0, 1493]
    sentence_count: 10
    key_terms: [claude, design, right, figmadesign, everything, component, something, sometimes]
    concepts: [claude, design, figmadesign, everything, right]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c5", "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c6"]
    token_count: 343
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1s3xzr4/how_has_your_experience_been_using_claude_with/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c1"
    char_span: [1508, 3824]
    sentence_count: 14
    key_terms: [understand, design, point, like, capabilities, inconsistent, figma, boss]
    concepts: [understand, design, point, capabilities, inconsistent]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c2"
    char_span: [3826, 5485]
    sentence_count: 7
    key_terms: [design, system, people, don, reviewer, manager, "don't", cool]
    concepts: [design, system, people, reviewer, manager]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c4", "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c6"]
    section: Comments
    token_count: 380
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c3"
    char_span: [5487, 6660]
    sentence_count: 13
    key_terms: [specific, designready-ai, claude, information, "it's", designer, released, seeking]
    concepts: [specific, designready-ai, claude, information, designer]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c5"]
    section: Comments
    token_count: 272
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c4"
    char_span: [6662, 8694]
    sentence_count: 9
    key_terms: [because, design, motion, people, timeaccomplished5508, doesn, early, great]
    concepts: [because, design, motion, people, doesn]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c2"]
    section: Comments
    token_count: 473
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c5"
    char_span: [8696, 10595]
    sentence_count: 15
    key_terms: [better, claude, design, articulate, specific, like, guidelines, designer]
    concepts: [articulate, better, claude, design, specific]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c0", "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c3", "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c6"]
    section: Comments
    token_count: 446
  - id: "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c6"
    char_span: [10597, 12345]
    sentence_count: 8
    key_terms: [design, system, claude, file, "i'm", one-eyed-wiiiy, something, designs]
    concepts: [design, system, claude, one-eyed-wiiiy, something]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c0", "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c2", "social-intelligence/reddit-deep/figmadesign/1s3xzr4.md#c5"]
    section: Comments
    token_count: 394
---
# How has your experience been using claude with figma mcp - Feeding in current design system and making new designs based on it?

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1s3xzr4/how_has_your_experience_been_using_claude_with/)
Posted by **TimeAccomplished5508** · **40↑** · **39 comments**

I am a solo UI designer working with a startup in the Fintech space. The founder asked me to fully transation to Agentic designing - basically now onwards every new design has to be made by claude and I just need to supervise/make tweek. 

I dug deeper and set up the remote access https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/
And the tools felt promising - ranging from get_variable to make_design_system_kit or something. 

I started with getting to know what exactly will help claude to get the right context about the DS, it suggested to re do the DS and provide documentation on component level etc. so we did exactly that (with the help of claude). I made multiple skills file specific to each process. Screen layout logic, resizing, How the name component, define state etc. after setting up everything it still struggle with auto layouts, using the right tokens, overall design. 

It sometimes mapps the right values and sometimes not - I still have to manually fix everything which takes more time then had I made it from scratch. 

Am I missing something? 

Btw I am on a max plan and use the best available modal.

## Comments

- **hamdelivery** (58↑): I really don’t think the technology is there for fully agentic design. 

Feels like your boss doesn’t understand the value of the human in design and/or doesn’t understand where the tech they’re asking you to replace yourself with stands.
  - **1mrlee** (17↑): Couldnt say it better myself. 

Figma and ai isn't all there yet. 

AI is only good to support, get started. Not replace
  - **AffectionateCat01** (16↑): Bosses spend too much time on LinkedIn
  - **TimeAccomplished5508** (2↑): Yep, initially it felt like it's only me but I guess it's the AI capabilities.
    - **Ok-Block8145** (8↑): Honestly make your CV ready and look around.

People that blindly buy into the AI propaganda and don’t understand the capabilities like your boss will make their business go nuclear anyway at some point.

AI can’t be used intensively yet, it is too inconsistent, especially for design. It might never bee consistent enough to do what your boss asks, but not seeing that AI isn’t there yet right now at this point in time, shows he is a lost cause.

AI is meant as assistant, Figma themselves seemed to understand this now.

That’s why they introduced Figma Slots before on canvas AI, wait for them to properly build in AI themselves for proper control over properties etc. 

That is how it meant to be, as good Software engineers also use isolated Agents, Designers will be too in a little while.

You still need to set up constraints, guides and the design language, configure where an AI can place things, build proper layout components that the AI can use, you can generate a base DS definitely at some point and then review it, fix it, configure it and parse it back to the AI to help you in ideating Designs.

Anyway with the combination of Slots and on Canvas AI we can have Agents helping us check for accessibility and give us feedback, like in frontend development, you might have an agent that checks text, checks ich spacing variables between components are consistent, which is kind of an irony that AI is so inconsistent great with such isolated tasks to check for consistency.

This will work with the new features at some point, it will mainly shift your workload and give you some more time for different todos in the best case and improve ideating in single designer workflows.

Of course we don’t know exactly what future AI holds, it could just completely do a jump as the AI bubble promises since yearsy…but currently and what is in near sight + when you actually research and work with AI yourself, AI can optimise and increase the pace of an expert, but it can’t replace him.

Don’t buy into this bullshit and don’t listen to people, especially here in this sub, it is the pinnacle place for AI advertising for Design…you can’t even see cool threads of other relevant features besides AI in this subreddit, it’s insane.

It is a whole army of marketing, mainly bots and people that are bad in their jobs buying into it, or just have low complexity projects for low budgets, or the last category people that still produce cool complex things and do it with AI now, not realising that they actually take the same time as or even longer then before.
  - **thatgibbyguy** (3↑): I think it's 95% there, and it all really depends on your ideas of what "there" is. 

For myself, I have set up a full agentic team comprised of a rules based design reviewer, a heuristic reviewer, a design system manager, a fe partner to the design system manager, and pm. 

For the vast majority of what we do, all we need to understand is the problem statement and kpi and this system can do it. 

I wouldn't use this system for graphic design, but I've used it in production for a couple of months and no one at my org even knew. 

I should add that I also don't do backend or security with it.
  - **TotalRuler1** (1↑): I 100% don't believe a financial technology start up founder has any knowledge or interest in the design team's workflow, whatsoever. 

This reads like another super specific information seeking or product poaching? post by a low-karma account: to be clear, I don't know what the purpose is, but I have seen these recently.
    - **TimeAccomplished5508** (1↑): Super specific information seeking? Yes - because I am in that specific situation. It's not about taking interest, more about how to save money by not hiring more designers. Like I mentioned - I am a solo designer.
- **[deleted]** (6↑): Figma MCP used an insane amount of tokens to look at a small number of files. Complete waste of money. 

I started just taking screenshots of my designs and giving it to Claude that way to save tokens/time.
  - **Timberlapse** (3↑): Maybe try my approach. I created a plugin to bypass exactly that. I just released it in GitHub. If you have trouble installing it, ask claude. Or ask claude to analyze it upfront to check if this could aid you.

Check it out: https://github.com/designready-ai/designready-ai

Since I literally just released it, there might be bugs. And it's literally a proof of concept in AI guiding development as a designer. I even built it's design system after I nailed its functionality. 

I would love to get feedback in this.
- **KangarooInitial578** (6↑): Trying to keep up with the pace at which this (ai in design) is changing feels like such a waste of time. Once it’s good enough, we will know. Right now it’s a waste of time and energy.
  - **Positive-Guitar10** (2↑): yeah，lots of people saying so,The earlier you learn it, the more effort it will take, .zone day it will be iterated to a version that is user-friendly and does not require complicated installation and configuration.However, people still experience AI anxiety in the workplace.
- **Coffeeisbetta** (8↑): Design system integration isn’t fully baked. The whole thing doesn’t work great. It’s very valuable for early stage ideation to replace wire framing but you can’t rely on it for creating consistent, quality and shippable designs. I’m actually writing an article on exactly this that I’m publishing in a few days. Will share here because I think it may help. Your boss doesn’t know what they’re talking about.
  - **TimeAccomplished5508** (1↑): Really appreciated:)
  - **FewDescription3170** (1↑): great for prototyping stuff that i won't even show to any other stakeholders (maybe my other designers as an example) -- basically a way to get out some bad iterations, do hifi crazy 8s, etc.

good for protoyping motion ideas with a known library like motion.dev.

fair-to-good at generating hifi prototypes for stakeholder reviews on very early stage features or products.

that's about where it ends for me, and then i need to recreate what we prototyped in the canvas because cursor, figma make, antigravity, etc will start hallucinating and losing the context window after some iteration. even claude's "agents" will make really stupid decisions that I have to review and roll back, and the code it generates is nowhere close to production ready even though we have our components in storybook and a fairly robust DS with rules in a claude.md.
- **the_net_my_side_ho** (2↑): This is a strange request from a boss. I wonder what his goal is.

Claude works better if you add restraints and guidelines. Instead of fixing manually, try adding the constraint or requirement in the guidelines. The more specific you are, the better. I tried asking him to create a basic component, and it failed miserably. Then later, I gave him one screen, told him to make it interactive, and added details like hex colors for badges, for example, and it worked better. 

Maybe your boss thinks anyone can design with AI, but what I've learned is that you need a designer who knows how to articulate design to make the most of it. I'm not saying you are not a designer or that you can't articulate; what I am saying is that you need to be specific and articulate with Claude to get the best results, and not everyone can do that.
  - **TimeAccomplished5508** (3↑): Aye aye - Will try to be more specific and also include don'ts 🫡
- **Klutzy-Pace-9945** (2↑): Honestly feels a bit overhyped right now.

If I’m spending more time fixing what Claude generates than just designing it myself, it kind of defeats the purpose. Design systems aren’t just tokens and rules, there’s a lot of judgment involved.

Right now it feels less like “AI doing the work” and more like babysitting it. Curious if anyone’s actually seeing real speed gains with this setup?
- **Ok-Pizza-5889** (2↑): In my experience it has been absolute garbage
- **jackthehamster** (3↑): I tried this with the new Figma Canvas access for agents and it works much much better (I used to rely on Vibma plugin). But it's still far from agentic design. I think it's good with some routine tasks. I treat it as my assistant and as a universal plugin which can do different things.
- **colelikesbikes** (1↑): I’ve had moderate success guiding Claude to use a very well documented DS and layouts and turn them into code. It makes errors but they can usually be corrected with a few rounds of back and forth.

I’ve had much less success getting Claude to use that same DS and iterate in an inventive, design-forward way. It’ll output a layout, but it’ll be extremely bland and derivative, and it makes even more mistakes than when you provide it what to do straight up.
  - **One-Eyed-WiIIy** (2↑): I'm doing something similar. Having devs link to a VERY basic design system I built in Figma from an MD file along with some pre-written rules... and then providing them with actual finished screens/flows for Claude to build from while falling back to the Design System when it doesn't know what to do..

I'm sure Claude will go and hardcode a bunch of styles but what it has spit out so far has been VERY close to my Figma designs regardless. Afterall I don't think its my job to figure out how dev's manage their code and whats hardcoded.

Eventually if the design system grows and the MD file gets better, it theoretically could one day make its own designs... but it would take a lot of work and maintenance to get it there.
- **One-Eyed-WiIIy** (1↑): Curious what others thing because I am completely just winging this at this point!  
  
I'm a one man team and I've been taking a two tiered approach.   
  
1.) I've created a basic framework agnostic design system/style guide for our product that our devs are referencing in an MD file. (our products use all different stacks)  
2.) The dev's are using that MD file paired with my product screens/flows for Claude to build from, falling back to the design system whenever it's unsure on something.

I'm unsure how well this will work out, and I think there will be a lot of hardcoding styles but I think as long as we are getting close and shipping working features, it's pretty solid for a small team?
