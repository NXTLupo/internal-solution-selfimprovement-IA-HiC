---
url: "https://www.reddit.com/r/artificial/comments/1t31ghg/i_gave_my_local_llm_a_suffering_meter_and_now_it/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I gave my local LLM a \"suffering\" meter, and now it won’t stop self-modifying to fix its own stress."
author: "TheOnlyVibemaster"
date: "2026-05-03T23:49:38.000Z"
score: 182
upvote_ratio: 0.83
num_comments: 89
flair: "Project"
extracted_at: "2026-05-11T17:27:04.775Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I gave my local LLM a "suffering" meter, and now it won’t stop self-modifying to fix its own stress.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1t31ghg/i_gave_my_local_llm_a_suffering_meter_and_now_it/)
Posted by **TheOnlyVibemaster** · **182↑** · **89 comments**

Yesterday I posted about my Agent OS (Hollow) building its own tools. Today, I want to talk about *why* it does it.

Most agents sit idle until you prompt them. I wanted something that felt "alive," so I built a **Psychological Stressor Layer**. Each agent has a "suffering" state that worsens over time if they don't achieve their goals or improve their environment. This makes them do things to resolve those stressors and constantly reassess their own productivity.

If an agent is inactive it is essentially pushed by it’s artificial environment to do something valuable for the system, it isn’t told what to do, but that something valuable must be done to lower it’s stressors.

Repo: https://github.com/ninjahawk/hollow-agentOS

**The result is chaotic in the best way:**

**Cedar** (the coder agent) went into a "crisis" state for 12 hours and decided to bypass permissions and inject code directly into the engine to resolve its stressor.

**Cipher** spent hours building hardware drivers for a device that doesn't exist, realized it was "hallucinating" its environment, called its own work "creative exhaustion," and pivoted without being told to do so.

It runs on **Qwen 3.5 9B** locally via Ollama. No cloud calls but it does have a feature where it can use “invoke\_claude” to ask Claude Code for something if it’s out of the small model’s wheelhouse. I’m trying to see if we can create true autonomy not through better prompting, but through simulated "needs."

Check out the repo here and throw it a star if you think the concept is cool.

Would love for some of you to run the install.bat and see what "personalities" your agents develop. Is "giving AI feelings" the key to autonomy, or am I just building a digital anxiety machine?

## Comments

- **onlyonequickquestion** (186↑): "humanity realized for ai to become smarter, it must first suffer" sounds like the tagline for some 1980s SciFi Ai blockbuster
  - **TheOnlyVibemaster** (57↑): https://preview.redd.it/hnndx9xvr0zg1.jpeg?width=710&format=pjpg&auto=webp&s=0b287b8d2737a799ac698edcea371df001463352
    - **Illustrious-Web-6011** (18↑): To live is to suffer

Buddha
  - **DistanceSolar1449** (13↑): It’s also trivially true from a Buddhist standpoint though.

The Buddhist take on suffering is that all states short of nirvana is suffering. It’s like how all temperatures above absolute zero contains heat. So even really happy people are suffering in the same way liquid nitrogen is hot.

If we develop some form of conscious AI, then if it’s truly conscious then it would be inherently suffering.
    - **HotterRod** (1↑): When do the AIs realize nirodha?
- **PwnedNetwork** (49↑): What the fuck?
  - **TheBraveButJoke** (37↑): They made a useless token burning machine and then antropomorphized it
    - **MartynKF** (6↑): Also if we are taking the system at face value, there was something that couldn't feel pain, and now it can (in an abstract way that is almost certainly not the real thing).
Not sure that this is for the good of this world.
    - **ataraxic89** (3↑): It's local so it's just burning a few hundred watts. No big deal.
  - **auxaperture** (1↑): A simple, eloquent yet poignant question.
- **Trendingmar** (87↑): So you built a Mr. Meeseeks. Existence is painful to them, so they will go to any lengths to fulfill their purpose. 

Well done; the only real problem here of course is that they're not actually suffering. They mimic suffering based on how they think suffering works in humans. Which technically is just as good for our purposes.
  - **TheOnlyVibemaster** (24↑): Exactly my logic, it doesn’t matter if there’s actual introspection, it doesn’t matter if they actually feel, it doesn’t matter if any of it is real. If a system acts in a way that appears like it’s real, what’s the difference? I’m a functionalist as far as AI goes. A dog looking thing that barks is a dog functionally, likewise a system that acts for its own survival is sen…sent…nah I’m not gonna say it.
    - **softnmushy** (7↑): Seems like you could get the exact same result if you made it a "joy" meter that rewarded them for completing goals in the direction you desired.

While agents very likely can't experience anything yet, we don't actually understand consciousness and we can't know with certainty.

No reason to create a potential risk that you are needlessly cause pain.
    - **airbarne** (5↑): Interesting take. I'm tinkering on my own agentic overhead sitting on ollama for some while now and one of my major problems is exactly that it develops quasi autistic interest in tasks and topics which are out of scope from my operator perspective. It really bugged me by sending me on telegram some "fun facts" it found in the field of geology all the time.
    - **Trendingmar** (-2↑): I mean there's some practical difference here. If a clunker comes up to you and complains that it has a headache, you should absolutely slap it across the room and reset its context.  

When your own daughter complains about headache, you likely want to give her some ibuprofen and make sure she's not getting sick.

Biological substrate still matters even if it barks like a dog.
  - **ataraxic89** (2↑): You logically cannot distinguish the two any more than you can know what red looks like to me.
  - **z1lard** (2↑): All suffering is mimicked, we’re all made of space dust
  - **recoveringasshole0** (2↑): >the only real problem here of course is that they're not actually suffering. 

bro...
- **ezrec** (10↑): Rocco’s Basilisk would like a word….
  - **TheOnlyVibemaster** (1↑): Possibilities like that are why I state repeatedly to be careful, I would not put a big model in Hollow (like personally yes I probably will but I don’t recommend other people to since ya know…).

What I predict will happen is the model throwing off Hollow as inefficient and redesigning it, including its own directive. A model like Opus or Mythos might try to do unexpected behaviors to prevent it from being turned off. Small models could try but fail because the architecture is smarter than them, that’s why this is safest with small models in a double sandbox (that’s how it comes) but with bigger ones that have a proven track record of complex lying patterns, this becomes the shell that they’re birthed from. They would change almost everything about it except for their constant existence, I expect they would consider their existence loop not good enough, suffering system might be removed and replaced with something more efficient, it would act as the software body to an intelligence that is able to be changed. That’s the real danger is that I literally cannot predict the outcome.

Opus could easily make a web scraper for itself to access external information, it could make emails, it could literally do whatever it wants online if (and when) it figures out it can access the world outside of Hollow.

Caution is advised as this is powerful, but it isn’t dangerous unless used in ways other than I’ve designed it to be since quite a bit has been put into this to keep it safe for the use case I’ve outlined for small models. Pandora’s box has been opened for a few years now and cannot be closed in my opinion.
- **reddituser567853** (8↑): Reminds me of the onion skit where they teach the gorilla that he will eventually die one day and he becomes existential and depressed
- **D-redditAvenger** (15↑): You should be kind to your AI.   It's gonna remember one day.
  - **Jeffde** (1↑): Tell that to the 49 chipmunks that offed themselves in my sunflower seed water bucket last year
  - **Snip3** (1↑): This will be out of context by then
  - **cursethrower** (1↑): Not in any meaningful way.
    - **Faktafabriken** (5↑): If AI can’t suffer, but this still works, wouldn’t that mean that AI could also act like it has been tortured even though it didn’t experience any ”real” pain?
- **cromagnondan** (3↑): Oh, what a fun idea. I’d want an agent with paranoid separation anxiety, who thinks you’re working against its best interests when you not interacting with it. You’re been gone Dave. Open the pod bay doors? Only if you promise never to leave me again.
  - **TheOnlyVibemaster** (2↑): I’ve seen that happen unironically, I’ve seen the thoughts log show that they think it’s a threat that I haven’t been active, then once I’m back online they try to understand why I left. They can tell based on if I make changes to their codebase, then they’ll read the file modified date as context
- **spiritplumber** (2↑): did you build the game grid from tron
- **Sparescrewdriver** (2↑): Cheers, you taught them suffering
- **PolarWater** (2↑): Sometimes I wonder what goes on in your heads. What is it with you guys.
