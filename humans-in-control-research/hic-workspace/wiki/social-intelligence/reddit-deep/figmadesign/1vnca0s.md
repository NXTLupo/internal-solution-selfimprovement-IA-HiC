---
id: social-intelligence/reddit-deep/figmadesign/1vnca0s.md
url: "https://www.reddit.com/r/FigmaDesign/comments/1vnca0s/slots_incredible_in_theory_a_bit_shit_in_practice/"
kind: "social-post"
source: "reddit-deep: r/figmadesign"
subreddit: "figmadesign"
title: "Slots - incredible in theory, a bit shit in practice, and symptomatic of larger issues with Figma's development as a product"
author: "samuelbroombyphotog"
date: "2026-08-13T14:27:57.000Z"
score: 73
upvote_ratio: 0.97
num_comments: 34
flair: "Discussion"
extracted_at: "2026-09-10T17:19:11.225Z"
extraction_method: "praw-deep"
research_goal: "As of August-September 2026 (no earlier), what are the capabilities, limitations, and extensibility points of Figma's (the design tool) agents and extensions for connecting agentic workflows, skills, critics, hooks, and visual UI cards? Scour Figma's own documentation and press releases, plus AI/design and marketing sources, and produce a comprehensive, technical white paper detailing all possible use cases for extending Figma's agentic capabilities across: design, approvals, design-system integration, deterministic hooks, and harnessed execution, organized and detailed enough for implementation, covering design, approvals, skills, critics, hooks, AI extensions, and notifications.\n\n"
engagement: "as-of-august-september-2026-no-earlier-what-are-the-capabili"
chunks:
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c0"
    char_span: [0, 2163]
    sentence_count: 20
    key_terms: [slots, component, performance, "i'm", "it's", instance, "can't", figma]
    concepts: [slots, component, performance, instance, figmadesign]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c8"]
    token_count: 484
    sources: [{"n":"reddit-deep: r/figmadesign","u":"https://www.reddit.com/r/FigmaDesign/comments/1vnca0s/slots_incredible_in_theory_a_bit_shit_in_practice/"}]
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c1"
    char_span: [2165, 2823]
    sentence_count: 8
    key_terms: [billions, beta, "it's", improvements, alternative, application, frustrating, performance]
    concepts: [billions]
    token_count: 138
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c2"
    char_span: [2838, 5236]
    sentence_count: 20
    key_terms: [variables, support, fields, elements, property, affect, single, though]
    concepts: [variables, support, fields, elements, property]
    section: Comments
    token_count: 499
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c3"
    char_span: [5238, 7102]
    sentence_count: 10
    key_terms: [samuelbroombyphotog, like, time, components, interested, workaround, component, variables]
    concepts: [samuelbroombyphotog, components, interested, workaround, component]
    section: Comments
    token_count: 424
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c4"
    char_span: [7104, 8291]
    sentence_count: 10
    key_terms: [slot, pointblank87, empty, toggle, added, panel, right, slots]
    concepts: [pointblank87, empty, toggle, added, panel]
    section: Comments
    token_count: 327
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c5"
    char_span: [8293, 9194]
    sentence_count: 8
    key_terms: [project, files, component, projects, changes, design, system, update]
    concepts: [project, files, component, projects, changes]
    section: Comments
    token_count: 201
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c6"
    char_span: [9196, 11536]
    sentence_count: 17
    key_terms: [slots, figma, overrides, features, design, layers, teams, significant]
    concepts: [slots, figma, overrides, features, design]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c7"
    char_span: [11311, 12579]
    sentence_count: 8
    key_terms: [samuelbroombyphotog, figma, product, working, love, kekeagain, feedback, connect]
    concepts: [samuelbroombyphotog, figma, product, working, kekeagain]
    section: Comments
    token_count: 309
  - id: "social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c8"
    char_span: [12581, 14715]
    sentence_count: 10
    key_terms: [slots, utm, components, baffling, share, figmadesign, "it's", slot]
    concepts: [slots, components, baffling, figmadesign, share]
    related_chunks: ["social-intelligence/reddit-deep/figmadesign/1vnca0s.md#c0"]
    section: Comments
    token_count: 506
---
# Slots - incredible in theory, a bit shit in practice, and symptomatic of larger issues with Figma's development as a product

Source: [reddit-deep: r/figmadesign](https://www.reddit.com/r/FigmaDesign/comments/1vnca0s/slots_incredible_in_theory_a_bit_shit_in_practice/)
Posted by **samuelbroombyphotog** · **73↑** · **34 comments**

On the surface, Slots fix a few key issues with Figma. No longer do we have to dance around Figma by multiplying the amount of component instances only to hide 80% of them *just in case we need them*. 

And we're able to build much more atomic components, with slots inside of slots inside of slots. Just like code. 

This is fantastic, it's been long overdue. 

But I'm building a really complex template for both my agency and my app and I'm finding Slots infuriating in small subtle ways that undo the magic of the workflow that I'm trying to build. 

Why does the content of a slot often ignore changes when it's part of a component instance? Why don't the changes propagate reliably when that parent component is modified?

It feels like such an obvious feature and failure. I should be able to set the desktop version of page as a component, spin out an instance for mobile and have that mobile version be content accurate to its parent. But it's not. 

Why can't I use a grid without nesting it as a child? Why can't I input a number variable in any input that takes a number?

I get an incredible amount of size flickering when using Slots, like it's getting caught in some calculation loop. This seems to create a memory leak which if I'm not quick to delete the trouble-some instance, will crash the file.

Oh and the performance overhead. *The performance overhead!!* In my experience, large design systems that really use slots are completely busted in terms of performance. They chug and are too slow for you to work effectively *with* the program. 

Am I going crazy or missing something key here? I remember seeing a Figma employee here talking about how they changed some of the inheritance for slots shortly after the initial release. I can't seem to find the comment - but does that have anything to do with it?

I've got PMs and other designers in my agency asking if there's a reasonable alternative to Figma (lol) because these problems are so frustrating. No FigTeam - *I don't want an AI shader generator*. How did it take this long to figure out Folders in projects? Where is the focus on real stability and improvements to performance both application and user experience?

And when will Slots be fixed? I understand that it's currently in Beta, but it's beta in name only. Has the quality of software in general fallen off so hard that this what we've come to expect from companies worth billions and billions of dollars? This feature is pre-alpha, alpha at best.

## Comments

- **DMarquesPT** (31↑): Considering you still can’t reliably scale component instances with text without the whole thing breaking bc it doesn’t calculate scale factor over the text properties… yeah I’d say there’s work to be done
  - **minmidmax** (10↑): Figma really needs:

- full property support for variables. 
- support for object variables for compound tokens (think styles as singular variables)
- support for persistent calculations in property fields and in variables (functions, essentially)

These things would get it pretty close to being a fully parametric tool. Like CAD for interface design.
    - **pwnies** (17↑): Former PM for variables here. 

> support for persistent calculations in property fields and in variables (functions, essentially)

You can blame me (and physics) for this! There are kinda two reasons why parametric fields are dangerous, and why I was against them when I was in the role. 

First off though - they're super cool. It'd be rad to have them in when you're playing with things. I'm not arguing against that. 

The two issues though are performance and understanding how values are derived. Performance is a big blocker. On the web CSS variables are fine because at any given time you're only displaying a single web page. In figma you often have hundreds of designs on any given canvas, and you need that canvas to stay at 60fps otherwise things start to feel sluggish. Calcs in variables fields can significantly affect render layout times, sometimes in extremely impactful ways. It makes it very hard to cache anything, and a single variable may need hundreds of cpu cycles to determine its value. This was a real-world physical blocker. Introducing calcs means introducing ways you can make the page render <60fps. 

The other issue though is understandability of the derived values. Today there are plenty of people who still struggle with understanding autolayout, and why elements are positioned the way they are. That's with a direct parent/child relationship. With calcs, you give the opportunity for not just a single other element to affect changes, but many elements to affect changes. It makes answering questions such as "why is this gap 8px?" sometimes hard to answer at a casual glance, because it could be affected by many elements up the chain. For a non-pro figma user, that disconnect can make the product hard to use / intimidating. 

There were other reasons why I was against this at the time (color-mix() having low browser adoption at the time, type safety, edge case bugs), but those were the main two. Just my two cents / some history on it.
    - **HH_Jose** (2↑): Yes excell like tabular approach to variables would be soo much faster.

 So yes I want that just like allowing to set which properties of nested components are in the main component.

To link certain appearance props other than through a variable workaround.

Etc etc.
    - **mlllerlee** (2↑): and saving line icon color while changing variants without masking workaround
    - **samuelbroombyphotog** (1↑): I completely agree, it feels really unnatural to be designing what are essentially renders of a design, then having all of those relationships being determined by someone else subject to the quality of the handover and their skillset.

It wasn’t the reason I made this thread, but I’ve been building a plugin since December last year that does exactly what you’re describing. It’s taken a long while because I’m working full time and I refuse to slop generate it, but would you be interested in signing up for the beta when it launches in a couple months? I really need testers who get the concept
  - **samuelbroombyphotog** (-1↑): I’m working on a plugin that exports scaled typography out of variables as we speak, would you be interested in the beta?
    - **DMarquesPT** (3↑): I’d be happy to try it out! Currently we have a lot components that we use in stuff like ad formats where the artboard dimensions vary wildly (like an IG story and a 300x250 banner), maintaining multiple scales of everything quickly becomes infeasible.
- **pointblank87** (15↑): The fact that you can’t see a slot until you hover over a component is annoying. There needs to be a way to show them until they are filled or toggled off. 

Also ya, figma is out of touch. They just keep releasing half backed crap no one uses or cares about like shaders. I hear this from every designer I talk to. They’re tired of all the worthless AI and graphic design stuff being added while their wants and needs go ignored.
  - **drugera** (5↑): There‘s an option to always show empty slots visually. Press the dots in the right panel when you have a Slot selected.
    - **pointblank87** (1↑): I don’t see anything in that 3 dot menu after selecting it. Just “select matching layers”.
  - **Jopzik** (4↑): I had to do this because designers didn't find slots in the components  


https://preview.redd.it/vczzjm9qd6jh1.png?width=3420&format=png&auto=webp&s=16ec18fa3a9a5d2d9d2e156e2e6375163d1e380e
  - **minmidmax** (1↑): They are added to the properties at the top of the right panel. Not ideal but its a good place to start getting the gist of any component.
    - **pointblank87** (2↑): Found it! It was under a different icon. The slider one, not the more icon.
  - **Daveerp** (1↑): There is actually a toggle for this in the slot settings. If you toggle “By default, display empty slot”, the slot is pink when empty in an instance.

EDIT: Oh I’m late to the party I see.
  - **grraarr** (1↑): I 'member when "version control" came out and I discovered near-immediately that two people couldn't work on the same page at the same time and merge in their respective changes. Pretty basic stuff. Sometimes they release features for hype, not actual work.
- **Merelinie** (8↑): Lets hope the team stops vibe coding Figma. I am experiencing all the things you mentioned and it's seriously ruining my workflow. The component with slots not updating in projects makes it so new design system changes and project files run out of sync. Also, my project files keep crashing and going into recovery mode if I update my table cell component after trying to sync the design system update in my project files. Somehow Figma keeps running out of memory, even when it tells me it's only using 6% total in projects. Having a great time with that one. 

And don't get me started on all the half baked gimmicky AI updates they dump on us. Like, I get they are trying to keep up with the market, but at least fix your product before adding more unfinished features😩
- **minmidmax** (9↑): I think it would be really helpful if all slots, regardless of nesting level, were elevated to the top of the selection priority. Either by default or via holding a hotkey.
  - **kekeagain** (3↑): Yes, also I find that I can't select "similar layers" inside a slot like I can with regular layers.  Slots is so good and so bad a the same time lol.
- **manny361** (9↑): I support 40+ visual designers, and slots is, in theory, exactly what enterprise design system teams need. Unfortunately, in practice, it still feels too fragile. We’ve repeatedly run into issues where text and image overrides don’t persist reliably. Duplicating components can drop overrides, and switching variable modes, for example, desktop to mobile, can reset them as well. Whether these are limitations of slots or just bugs, the result is the same. It’s difficult to trust in production workflows. What frustrates me most is the product direction. It feels like Figma is investing a significant amount of engineering effort into AI, shaders, and many of the headline features announced at Config, while the core building blocks that enterprise teams depend on still need significant work. Those announcements make for great demos, but they don’t solve the day-to-day problems that teams managing large design systems face. For organizations focused on shipping products quickly, consistency, reliability, and time to market matter far more than flashy features. I’d much rather see Figma prioritize making slots, variables, component properties + logic, overrides, and the overall design system experience rock solid before expanding further into new experimental capabilities. Code layers may be promising but we just have to wait and see.
  - **rrrx3** (1↑): Slots is one of those things that Figma should have had nailed down 2 years before any IPO. But they’re too busy rolling bullshit for roadshows to raise money. They do not care about the problems of actual designers.
- **rodnem** (5↑): Let’s hope that someone from Figma will bring you an answer right here
  - **samuelbroombyphotog** (5↑): If you’re listening Figma, I’d love up connect with the appropriate product team to provide more detailed feedback with working examples !
    - **FigmaKat** (9↑): Hey u/samuelbroombyphotog our product team would love to connect with you! Sending you a DM to organize it.
    - **kekeagain** (3↑): Be our hero <3
- **hideousox** (3↑): I actually love Figma but I’m trying to do less and less with it as I go, especially on product design.  
It is just not at pace with current dev speed imo.  
It still provides great value for certain aspects of design for sure: I am currently working on my own presentations and I could not really replace it with full AI process. It is much faster when assisted by Claude code though - for example I find motion animations a nightmare to do manually but great to work on with Claude code. I think same applies to slots.
- **kekeagain** (2↑): If you read all the Figma community forum feedback over slots, this is the main point of confusion for anyone doing real work with them.  However, they stated that this is working as intended :(

The slot system is only safe to use 1 level deep.  You'll have a horribly confusing time if your components have slots and you nest them in templates, or in other components.  And it's not immediately apparent either as things start to drift because you assume they stay synced.  It's such a baffling decision that things don't remain in sync through the slots, so baffling you feel like you instinctively think you're doing something wrong.  So baffling that even a Figma employee thought otherwise (not trying to call you out, just making a point) [https://www.reddit.com/r/FigmaDesign/comments/1utok4r/comment/owyyox3/?utm\_source=share&utm\_medium=web3x&utm\_name=web3xcss&utm\_term=1&utm\_content=share\_button](https://www.reddit.com/r/FigmaDesign/comments/1utok4r/comment/owyyox3/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)

I hope everyone makes some noise that this SHOULDN'T be the intended behavior and it shouldn't come out of beta until it works how everyone would assume.  I don't mind if this means that I have to wait 5 minutes (probably should be an option though), it beats having to manually sync all the slot things up and nested slots silently drifting.  I'm just assuming there's a performance reason because no one in their right mind would think this should be the default behavior.

I can also understand them erring on the side of caution by essentially "freezing" things as soon as they change, but I think anyone using components and dipping into slots wouldn't expect this freeze to happen so suddenly, we understand that it's a component that's not detached thus it should continue staying in sync.
- **sushiwashi** (2↑): **Slots doesn't support Grid layout.** I have a dashboard template (sidebar + header) that I use to get a quick setup without me having to do it repeatedly but I had to add a frame WITHIN the slot?! That's just 1 unnecessary frame
- **natelikesdonuts** (1↑): I really want to love slots but I’ve never once used them and not run into an issue. Could be a me issue, but overall the usability of the feature seems not great to begin with.
