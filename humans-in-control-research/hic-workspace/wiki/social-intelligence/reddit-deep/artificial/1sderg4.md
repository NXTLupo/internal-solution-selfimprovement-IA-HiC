---
url: "https://www.reddit.com/r/artificial/comments/1sderg4/i_have_been_coding_for_11_years_and_i_caught/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "I have been coding for 11 years and I caught myself completely unable to debug a problem without AI assistance last month. That scared me more than anything I have seen in this industry."
author: "Ambitious-Garbage-73"
date: "2026-04-05T20:52:31.000Z"
score: 688
upvote_ratio: 0.93
num_comments: 208
flair: "Discussion"
extracted_at: "2026-05-11T16:53:08.146Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# I have been coding for 11 years and I caught myself completely unable to debug a problem without AI assistance last month. That scared me more than anything I have seen in this industry.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1sderg4/i_have_been_coding_for_11_years_and_i_caught/)
Posted by **Ambitious-Garbage-73** · **688↑** · **208 comments**

I want to be honest about something that happened to me because I think it is more common than people admit.

  
Last month I hit a bug in a service I wrote myself two years ago. Network timeout issue, intermittent, only in prod. The kind of thing I used to be able to sit with for an hour and work through methodically.

  
I opened Claude, described the symptom, got a hypothesis, followed it, hit a dead end, fed that back, got another hypothesis. Forty minutes later I had not found the bug. I had just been following suggestions.

  
At some point I closed the chat and tried to work through it myself. And I realized I had forgotten how to just sit with a problem. My instinct was to describe it to something else and wait for a direction. The internal monologue that used to generate hypotheses, that voice that says maybe check the connection pool, maybe it is a timeout on the load balancer side, maybe there is a retry storm. That voice was quieter than it used to be.

  
I found the bug eventually. It took me longer without AI than it would have taken me three years ago without AI.

  
I am not saying the tools are bad. I use them every day and they make me faster on most things. But there is something specific happening to the part of the brain that generates hypotheses under uncertainty. That muscle atrophies if you do not use it.

  
The analogy I keep coming back to is GPS. You can navigate anywhere with GPS. But if you use it for five years and then lose signal, you do not just lack information. You lack the mental map that you would have built if you had been navigating manually. The skill and the mental model degrade together.

  
I am 11 years into this career. I started noticing this in myself. I wonder how it looks for someone who started using AI tools in their first year.

  
Has anyone else noticed this? Not the productivity gains, we all know those. The quieter thing underneath.

## Comments

- **SelikBready** (103↑): Yes, I also noticed that. Not to that extend though, I still can work perfectly fine on my own, by I caught myself that my first instinct is to feed the problem to the AI instead of think myself. And it also disturbed me. A lot.
  - **overmotion** (19↑): Personally it doesn’t bother me at all. I’ve more than paid my dues debugging things over the past 20 years (haven’t we all) and am more than happy to not tear my hair out over it anymore
    - **zipklik** (4↑): The issue though is that any newbie will be pretty much as good as you now.
    - **sirnoggin** (1↑): I'm at 16 years, I agree. That I chose not to do it does not mean I cannot.
    - **The_Noble_Lie** (0↑): Good point.
  - **Choice_Room3901** (7↑): I just try to keep myself on my toes at times. I don't do coding but in other areas where I use it for decisions (like cooking - sometimes I'll just not use it and test my reasoning skills/try to figure it out myself)

But damn if there won't be a whole heap of AI dependent people in the future. Just as there are the people who can't figure out what to do if the TV turns off (of which there were many 60 years ago)
    - **do-un-to** (2↑): The Boob Tube Returns
  - **BadMachine** (3↑): what concerns me is that you and OP are both mature enough and experienced enough to understand why this is a problem.

some younger people in a similar position who come up relying on AI won’t develop those same instincts
    - **SelikBready** (1↑): Exactly.
  - **Ambitious-Garbage-73** (3↑): The first instinct thing is what gets me too. Like I'll start typing a question to Claude before I even open the actual source file. Six months ago I would have grepped through the codebase first. I'm trying to force myself to spend at least 10 minutes on a problem before reaching for it but honestly some days I don't even last 5.
- **dr-otto** (38↑): I am a game dev using Unreal Engine 5 (been working on games for 26 years our of 35 total years as a dev), and yeah Claude has helped far more than I thought. Some bugs or custom engine features to adjust would have taken me far longer if I had to hunt for areas of the code to find (UE5 code base is huge, and usually not easy to find the right place to hook in some new feature or fix)

I told Claude "this is what I want to add" and then "tell me where it should go" and Claude basically got  75% of the correct answer (Claude missed a few other areas I had to touch). That alone was super impressive!

I also used Claude to remove all build warnings (we had around 5k warnings on a full rebuild)... and it did that task masterfully. Something, for a human, which would have been a grind and would have taken far too long...Claude got done in a day.

Also, using Claude has not decreased my "thinking"...I always review the code Claude has written, to ensure it makes sense, addresses all edge cases, etc...sometimes seeing it's solution made me realize a better solution exists which I'd then code.  So - in my case - I don't think AI means "less thinking" at all, for me at least :)
  - **nanobot001** (11↑): I think, to your point, AI can help tremendously, but if you don’t want to suffer AI related erosion of skills, you must be actively participating with it.
    - **dr-otto** (4↑): i still wonder about the erosion of skills concern. like, ok - if you aren't doing X then that skill can atrophy. I get that. But...you also need to account for other, new, skills you are acquiring as you use AI.  in other words, it's not a zero-sum game.
  - **Ambitious-Garbage-73** (2↑): 26 years is wild. I think the Unreal Engine use case is actually one of the better ones because the documentation has always been rough and Claude fills in the gaps that would otherwise take you hours of forum diving. My concern is more with the bread and butter stuff like debugging your own code where you really should know what's going on.
    - **dr-otto** (1↑): i wouldn't ever commit some AI bit of code without reviewing it and testing it  (same holds true for code I write, cause I don't trust myself lol)
  - **sirnoggin** (2↑): I'm the same, this is the smart way to build with AI you're using your superior knowledge of archetecture and you use the AI as a genius fast apprentice who doesn't always get it right, but you rely on them for speed once given exceptionally accurate instructions. And not as an omnipitent being.
    - **dr-otto** (1↑): Truth
  - **SuaveSteve** (1↑): \>I also used Claude to remove all build warnings (we had around 5k warnings on a full rebuild)... and it did that task masterfully. Something, for a human, which would have been a grind and would have taken far too long...Claude got done in a day.

Would you say that a human dev doing that would have gained valuable experience or is it just stupid grunt work that has nothing to teach?
    - **dr-otto** (1↑): stupid grunt work plus also at around 5000 warnings would have been brain numbing and taken a LOT of man time.
- **senseven** (20↑): Lets be honest: there is a generation of senior coders who copy pasted everything from Stack Overflow. Because it was an arcane problem regarding an rare bug that where never fixed in some backyard stack that was eol. Even the developer at the company didn't know why "unrelated-undocumented-property=5" solved problems with logins but here we are, 3300 upvotes 16 years later.  We just had an issue within the Azure landscape and Claude gave the right tip where to look for. I'm pretty sure the 150$ ticket to Microsoft would have solved it in 2-3h or 2-4h days. I already forgot about it, its surely documented in some tool.
  - **skytomorrownow** (13↑): Knowing what to search for became more important than knowing.
    - **powerscunner** (3↑): It always has been. That's why and how first writing, then libraries came to exist.

What you can recall is limited by your brain, what you can write is limited only by space.

Even in the depths of one's own mind, knowledge is always a search.
- **bespoke_tech_partner** (7↑): The GPS analogy works here though. You just take a drive without a GPS once in a while and you're fine. The nice thing about muscle atrophy is that it's really easy to stave off with minimal (albeit targeted) maintenance.
- **Arc_419** (7↑): **GUYS DON'T FALL FOR THE AI CONTENT**

>The quieter thing underneath

C'mon, guys, it's clearly AI-generated text 🤦‍♂️
  - **JohnleBon** (1↑): I had to scroll further down to see this than I was expecting.
  - **f0oSh** (1↑): "Anyone else notice how much harder it is to think without AI?" hits differently when it's an AI generated message. 

> Has anyone else noticed this? Not the productivity gains, we all know those.

It's like bad ad copy for how wonderful AI is for coding, and then acting like there's genuine concern for mental capabilities "bEcAuSe tHe aI iS sO gOoD."
- **Dulark** (5↑): Had this exact moment a few months ago. Couldn't trace a simple state bug without reaching for Claude first. I think the real issue isn't that we forgot how — it's that we optimized for speed so hard that we stopped building the mental model. Now I force myself to read the stack trace for 5 minutes before asking the AI. Helps more than I expected.
- **TripIndividual9928** (5↑): This resonates hard. I have about 8 years in the industry and noticed the same pattern creeping in — not with debugging specifically, but with architectural decisions. I caught myself reaching for Claude/GPT to validate design choices that I used to reason through on paper.

What helped me was deliberately doing "unplugged" coding sessions — no AI, no copilot, just me and the docs. Painful at first, but it rebuilds that muscle. I now treat AI like a senior colleague I can bounce ideas off, not a crutch I lean on for every step.

The scary part isnt that AI makes us lazy — its that the degradation is so gradual you dont notice until you hit a wall. Good on you for catching it early.
- **david_jackson_67** (18↑): *yanks your mask off*
Hey, it's one of the software engineers posing as a vibe coder!

"Yeah, and I would have gotten away with it to if it wouldn't have been for you meddling kids."
  - **Ambitious-Garbage-73** (2↑): And I would have gotten away with it too if I hadn't mass deleted all my stackoverflow bookmarks when Claude got good enough. Now I have neither and just stare at error messages hoping the answer comes to me through osmosis.
  - **wellididntdoit** (1↑): # [The company whose ‘AI’ was actually 700 humans in India](https://ia.acs.org.au/article/2025/the-company-whose--ai--was-actually-700-humans-in-india.html)
- **spongue** (4↑): Totally different use of AI, but I've used it once or twice to help me communicate with people where it felt like a delicate situation and I wanted to make sure my words were coming across clearly and with the right attitude. I noticed pretty quickly that I wanted to consult it for every new message, and soon I started to wonder "is this really what \*I\* want to say or am I letting AI decide for me?". That unsettled me enough that I stopped doing it. Similar thing for "therapeutic use" of AI, it feels like such an ass-kisser and while it has some helpful insights, is way too likely to praise me and say that I did the right thing and all my thoughts are correct etc.

It does really make me nervous for people's psychological health because I know a lot of people who have learned to rely on AI for therapy, medical decisions, finances, and all kinds of daily uses.
  - **becrustledChode** (1↑): I'm always baffled by comments like this. You described AI helping you out with little rewrites of messages, just verifying that you were coming across the way you wanted to, as a benefit. It was working too well, in fact, and you found that you were returning more often than you were initially, almost like you thought you were developing dependence on it and had to go cold-turkey.

But is that necessarily the explanation? Is it possible that you were just **enjoying** being able to discuss the little decisions -- "does the explanation come across as condescending?" "does this sound like I'm blaming them indirectly?" -- that fill a large part of our days, and yet are each singly too trivial to ever bother another person with?

Your friends and acquaintances have found it helpful too across a wide variety of domains, even in medicine and finance, where even a few years ago knowledge and that domain was hidden behind long waits and exorbitant fees. Unless you could pay those fees then you just didn't get access to that expertise.

The fact that people have access to a decent source of advice on how to deal with their health makes you *nervous*? I just don't understand how that's your takeaway from a series of anecdotes where AI was able to help out for everything.

>"it feels like such an ass-kisser and while it has some helpful insights, is way too likely to praise me and say that I did the right thing and all my thoughts are correct etc."

Are opposed to real therapists? Hmmmmm... Lol.
    - **spongue** (2↑): There's a few layers to it... for one thing, I think it's important to remember how to think about things and turn them into words using our own brains. Controversial opinion maybe, but that's how I feel. Offloading too much can "weaken that muscle" like OP was describing.

For another thing, the advice/help is not always reliable. It gets A LOT wrong. Which can be dangerous if you're trusting it with your relationships and health. A years-long relationship between 2 complex human beings is not something that an AI can fully grasp in a few paragraphs of (one-sided) information, yet it confidently tells you how to engage with them and what they might need from you. I don't mind asking it for a 2nd opinion here and there, but ultimately I think it would be dangerous to lose that critical filter where you ask "Does this answer make sense? Does it align with what I know to be true?" and that is what I'm concerned is widely starting to happen.

It's a lot of trust to place in an unproven technology. The more we as a species come to rely on technology like this, the more fucked we are going to be when the next Carrington event happens, not to mention accelerating climate change and other environmental concerns.

Sure, there are shitty human therapists and you could argue about how good AI is compared to the average therapist. But a good therapist should be able to see through your bullshit a little more and call you out on it, challenge you, ask provocative questions.
  - **Ambitious-Garbage-73** (1↑): Yeah the communication thing is sneaky because you don't realize how much you're outsourcing until you try to write a difficult email without it. I had a similar moment where I needed to push back on a stakeholder and my first draft without AI was just awful compared to what I'd been sending with help.
- **Special-Steel** (4↑): Cabbies who followed GPS soon lost a sense of their city, its streets and traffic patterns. Functional MRIs show the brains of people who used memory and paper maps were different than people who used GPS assistants. 

People who did arithmetic manually reported they lost skills when they began using a 4 function calculator. We didn’t have fMRI back then, but we understood something was going on cognitively. 

We already know the brain science.
