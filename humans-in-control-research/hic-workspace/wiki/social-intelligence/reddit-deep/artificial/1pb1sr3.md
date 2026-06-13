---
id: social-intelligence/reddit-deep/artificial/1pb1sr3.md
url: "https://www.reddit.com/r/artificial/comments/1pb1sr3/gemini_3_is_pulling_the_same_dynamic_downgrade/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Gemini 3 is pulling the same dynamic downgrade scam that ruined the GPT-5 launch"
author: "CantaloupeNo6326"
date: "2025-12-01T03:13:28.000Z"
score: 806
upvote_ratio: 0.92
num_comments: 208
flair: "Discussion"
extracted_at: "2026-05-11T17:27:04.770Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c0"
    char_span: [0, 1711]
    sentence_count: 18
    key_terms: [model, "i'm", like, pro, word, artificial, comments, document]
    token_count: 403
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c1"
    char_span: [1725, 3431]
    sentence_count: 12
    key_terms: [model, like, used, context, ignores, request, models, people]
    section: Comments
    token_count: 383
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c2"
    char_span: [3433, 4199]
    sentence_count: 5
    key_terms: [fraud, rubengarciahernandez, get, consistent, controlled, companies, "emperor's", financial]
    section: Comments
    token_count: 201
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c3"
    char_span: [4201, 6165]
    sentence_count: 13
    key_terms: [gemini, exist, model, "it's", technical, messages, question, because]
    section: Comments
    token_count: 454
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c4"
    char_span: [6167, 8040]
    sentence_count: 13
    key_terms: [gemini, creaturefeature16, "don't", "i'm", legitimate, because, models, people]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c5"
    char_span: [7774, 8416]
    sentence_count: 5
    key_terms: [legitimate, thebluecollartrader, glock7enteen, hemorrhaging, imacompnerd, absolutely, conjecture, responding]
    section: Comments
    token_count: 180
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c6"
    char_span: [8418, 9700]
    sentence_count: 2
    key_terms: [google, going, "i'm", training, money, allocate, models, powerful-frame-44]
    section: Comments
    token_count: 312
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c7"
    char_span: [9702, 11789]
    sentence_count: 8
    key_terms: [happening, model, evidence, google, people, claim, money, gpu]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/artificial/1pb1sr3.md#c8"
    char_span: [11791, 13662]
    sentence_count: 17
    key_terms: [model, people, "it's", pro, "doesn't", obvious, answer, saying]
    section: Comments
    token_count: 461
---
# Gemini 3 is pulling the same dynamic downgrade scam that ruined the GPT-5 launch

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1pb1sr3/gemini_3_is_pulling_the_same_dynamic_downgrade/)
Posted by **CantaloupeNo6326** · **806↑** · **208 comments**

I'm canceling my Google One AI Premium sub today. This is exactly the same garbage behavior OpenAI pulled, and I'm not falling for it again.



We all know the drill by now. You pay for the Pro model, you start a chat, say hi, and it gives you a smart response. But the second you actually try to use the context window you paid for - like pasting a 3k word document or some code - the system silently panics over the compute cost and throttles you.



It's a classic bait and switch. Instead of processing that context with the Pro model I'm paying twenty bucks a month for, it clearly kicks me down to a cheaper tier. It feels exactly like when GPT would silently swap users to the mini or light model after a couple of turns or if you pasted too much text.



I fed it a 3,000 word PRD for a critique. I expected a rewrite that actually kept the details. Instead I got a 700 word summary that reads like it was written by the Flash model. It just gutted the entire document.



It's not conciseness. It is dynamic compute throttling. They are advertising a Ferrari, but the moment you try to drive it on the highway they swap the engine for a Prius to save electricity.



If I wanted Flash performance on my long documents, I'd use the free tier. Stop selling me Pro reasoning and then hot-swapping the model when the math gets expensive.



Has anyone found a way around this or is it time to just go full local/Anthropic?

## Comments

- **Candid_Koala_3602** (27↑): I thought the only way to get max token usage out of Gemini and GPT is via API
  - **SelfRobber** (6↑): Even there it's catastrophic it seems.

Take codex for example, after 65% of context tokens used, it becomes garbage. Ignores what you say to it and etc.
    - **sshan** (6↑): All models degrade well before the context window is hit. Some are better than others but they all do this.
    - **DysphoriaGML** (2↑): Like with pictures. It ignores the instructions after the first
- **The_NineHertz** (46↑): What you’re describing is exactly why people are starting to talk about “model opacity” as the next big trust problem in AI. When the provider can silently route your request to a cheaper model mid-conversation, the user has no way to confirm what they’re actually consuming. It feels less like a technical limitation and more like the same invisible resource-management logic used in cloud computing—only here it directly affects output quality, so the user is the one paying the performance tax.

What makes this even trickier is that long-context tasks are *precisely* where pro-tier models are supposed to shine. If the system is shrinking answers, avoiding full rewrites, or defaulting to summaries, that’s usually a sign of compute-avoidance rather than intelligence. And the fact that multiple providers are quietly doing it suggests the economics of large-context inference are hitting real limits behind the scenes.

The irony is that if companies were transparent about routing (“This request exceeded X tokens, so we used the Y model”), people would be annoyed, but at least they’d know the rules of the game. The silent downgrades erode trust much faster.

Curious if anyone here has actually run controlled tests across multiple providers—same prompt, same document, repeated 10 times—to see which ones stay consistent under load?
  - **RubenGarciaHernandez** (8↑): We should just call it fraud.
    - **mrdevlar** (1↑): Yeah, we need more of that kid from the *Emperor's New Clothes*.
    - **The_NineHertz** (1↑): No, it's not fraud.
    - **Worried_Sherbert239** (1↑): Well it is fraud... Selling a product and then switching it out for a cheaper worse version without letting you know for financial gain.... Is literally fraud.
  - **RogBoArt** (3↑): This is what I don't get. Why are companies so adverse to telling us anything? We get "An Error Has Occurred, Try again later" with zero context from so many services.

Why? Why dumb everything down for people who get scared of error messages instead of letting them figure out how to understand them? It's bullshit
    - **YouAreTheCornhole** (2↑): That's because there's nothing you can do with error messages that happen internally
  - **Scared-Gazelle659** (2↑): Why do these ai posts always have a question at the end? It's never a good one that anyone will actually answer.
    - **The_NineHertz** (1↑): Fair enough, but I only added the question because I genuinely wanted to know, not to sound like some AI-generated posts.
  - **Worried_Sherbert239** (1↑): I'm getting routed at the beginning.... It's very clear with my technical response, and although Google have limited the AI ability to name itself unless using 3.0, or provide cut off, I had to work around without going online, does GEMINI 2.0 EXIST. The, AI, supposedly Gemini 3.0 pro thinking.... Told me GEMINI 2.0 does not exist, but 1.0 and 1.5 exist, so it must be one of those. This was not a long conversation.
    - **The_NineHertz** (1↑): That kind of version-history slip is usually the clearest sign of an early downgrade. When a model confidently misstates its own lineage, it’s rarely a deep reasoning failure; it’s the signature of a lighter model stepping in before any heavy context is even added. Providers treat routing like load balancing: cheap-looking queries get handed to cheaper engines to save compute, even if the user expects top-tier consistency.

What’s really happening is that users are being pushed into this strange role of “model detectives,” judging which system they’re interacting with purely from behavior. And once you start seeing those wobbles in technical accuracy, the pattern becomes impossible to unsee. It explains why so many people are catching these tiny inconsistencies; they’re the breadcrumbs that the routing system never meant to leave behind.
  - **GoodhartMusic** (1↑): It is obviously an AI generated comment 

You really copy pasted something that starts with “what you’re describing”?
  - **FyreTeGo** (1↑): One time Gemini just told me to use 1.5 Gemini pro model when I asked it "Is there another model that can perform my task better". I do believe they bait and switch you with older models.
- **jonomacd** (14↑): I've seen consistent performance.
  - **joeldg** (2↑): same
  - **IamNotGorbachev** (1↑): Confirmed
  - **Worried_Sherbert239** (1↑): I'm jealous.... I'm getting rubbish that can't follow rules and told me Gemini 2.0 and 3.0 don't exist yet..... So I guess it's Gemini 1.0 or 1.5
- **[deleted]** (9↑): I have a feeling all these ai companies are paying people to say negative things about their rivals. Because I read these posts and they don't make sense to me. I've had zero problems with Gemini. I'm creating apps, websites, mini games, and learning new shit. Using prompts to give specific directions to it, it all works for me.
- **creaturefeature16** (161↑): They are hemorrhaging money. They have to do this. Also, the models aren't nearly as capable as advertised by their gamed benchmarks, so they also need smokescreen so users don't realize their limits as quickly.
  - **MachoCheems** (55↑): So you’d be OK with a trillion dollar worth bar watering down the drink you paid for because management over invested themselves?
    - **Wrong-Management-706** (19↑): https://preview.redd.it/z008hu8hx95g1.png?width=928&format=png&auto=webp&s=7938b248698e4608c6bd8ddebf24d813922eb00d
    - **creaturefeature16** (66↑): Of course not. These people are psychopathic charlatans.
    - **tidaerbackwards** (2↑): you shouldn’t buy dogshit products
    - **theBLUEcollartrader** (1↑): This question is legitimate only if the comment you’re responding to is legitimate. It is, at best, conjecture. Anyone can spin current state of anything into corporate finance.
    - **Fulg3n** (1↑): The bar is only worth a trillion dollar in the bubble it exists in
  - **Even_Towel8943** (3↑): Yeah well fuck em! They make promises that their wallets can’t keep.
  - **imacompnerd** (17↑): I don’t think Google is hemorrhaging money….
    - **Glock7enteen** (26↑): They absolutely are. They’ve spent $90b on AI this year alone, with only $1b in revenue. 

Yet everywhere you go on the internet you see people praising them and saying how smart Google is for having their own TPUs, as if Google isn’t still spending more than any other company lmao.
    - **Powerful-Frame-44** (5↑): All of these AI companies are hemorrhaging money and going around with their hats out. They're betting the house.
    - **AllGearedUp** (0↑): Specifically in this field, they are and everyone is.
  - **AndreBerluc** (2↑): I'm sure you agree, I'm going to sell you filet mignon but since I'm losing a lot of money I'm going to send you chicken fillet.
  - **Technical_Ad_440** (1↑): i heard google is actually doing well with ai when it comes to making money. if the bubble burst tomorrow google would keep on going thats how strong they are. the real reason will be competition cant outlast them anyways and basically died. so now they can be less forgiving. i also imagine its not the models being dumb as the ai gets better they allocate more to the training center if you have say 10k gpu 5k training 5k running models but next model say veo5 can be trained in 1week if they allocate another 2500 gpus and they have none they will be like you know what lets degrade or risk degrading performance move the 2500 to training and let them run on 2500 gpus.

the ideal situation for google would be the models are so cheap you could buy one for say 2k then they sell you the gpu along side it for say 4k so for 6k you get a gpu and the big fancy model at that point and away you go. ideally in a perfect world for cloud they would want 250million gpu's almost 1 gpu for everyone using it
  - **CatalyticDragon** (1↑): Google is not hemorrhaging money.
  - **Old-Ad-3268** (1↑): This is all patently false. Google doesn't have a money problem, they print money for the most part. They are the only player in this space that own the whole stack themselves and down need Nvidia or other people's data centers.
  - **MarcosSenesi** (1↑): yeah this is what makes me fear the bubble the most. 20 dollars a month doesn't nearly cover the running and development cost but no chance people are paying 10x that.
    - **DUFRelic** (5↑): People wont... but companys will pay 100x if they can replace a worker...
- **Short_Ad_8841** (63↑): You make bold claims yet provide zero evidence what you claim is happening is actually happening. The hypotheses is actually a valid one and as others have already mentioned, there is an incentive for them to do that, but i would still expect to see some sort of evidence, comparison against API, where you can specify the exact model etc. as there are other explanations possible.

Anyway you should be able to bypass these issues if they are truly what you claim they are with even something like openrouter, where you buy credits and pick any model you like. They simply route your requests to the model’s host via API, and unless there is some serious fraud going on, you will get exactly what you pay for.
  - **Practical-Rub-1190** (8↑): It should easily be verifiable by running benchmarks at launch and now. I assume people already do this, considering this is always a hot topic. They would have gotten massive exposure if they were able to prove it, because that is a massive deal
  - **lannistersstark** (1↑): >You make bold claims yet provide zero evidence what you claim is happening is actually happening

In Web UI at least, you can see that in action. After a certain amount of context, the model just doesn't "Think" anymore. The results are almost instantaneous after you send your message. The Pro model isn't that fast.

The "Show Thinking" just doesn't show up.
- **bartturner** (3↑): What proof or really anything do you have to support?
- **Alex_1729** (9↑): The example you're providing is trivial and sounds silly. You gave it 3000 words and got concise 700 one? Seriously? The model can definitely output 3k, even much longer if you prompt it right. Seems like you don't know how to use the LLM.
- **MoveZen** (2↑): The pro models lose massive, historic money on pointless searches and even people saying thank you.  It must be fixed because reality still exists despite our best efforts these days.
  - **[deleted]** (1↑): People saying thank you could be run for loads of their requests on a pre processor on a raspberry pi.


I'd be shocked if there's not pre parsing for simple wins.
  - **Worried_Sherbert239** (1↑): The pro model itself waffles more than I ever could unless constained. They could remove the 'safety layers that assume users are dumb and answer all possible follow up questions no matter how obvious and unlikely they are, plus repeat it 3 different ways.... That could cut there own thesis length verbosity to just giving the answer to the query. Then I think a few thanks that likely trigger auto response would be just fine.
- **sweetbeard** (3↑): Lol Which model wrote this?
  - **helloyouahead** (2↑): I wonder how many people noticed... so obvious
  - **Sefrautic** (1↑): The same old "it's not x. It's y".
People either can't even put the words together to write a simple statement or it's just a fucking bot as always. Damn, I really miss the old internet, at least it was real
  - **Correct-Sun-7370** (0↑): I have the same feeling …
