---
id: social-intelligence/reddit-deep/artificial/1slu23a.md
url: "https://www.reddit.com/r/artificial/comments/1slu23a/red_alert_tennessee_is_about_to_make_building/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "🚨 RED ALERT: Tennessee is about to make building chatbots a Class A felony (15-25 years in prison). This is not a drill."
author: "HumanSkyBird"
date: "2026-04-15T03:05:01.000Z"
score: 1167
upvote_ratio: 0.87
num_comments: 628
flair: "News"
extracted_at: "2026-05-11T17:27:04.761Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c0"
    char_span: [0, 2288]
    sentence_count: 16
    key_terms: [artificial, emotional, human, user, intelligence, relationship, felony, individual]
    token_count: 495
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c1"
    char_span: [2290, 4761]
    sentence_count: 13
    key_terms: [conversational, model, tennessee, doesn, bill, system, train, service]
    token_count: 506
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c2"
    char_span: [4763, 7185]
    sentence_count: 21
    key_terms: [bill, preemption, judiciary, tennessee, federal, legislation, senate, committee]
    token_count: 502
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c3"
    char_span: [7187, 8407]
    sentence_count: 4
    key_terms: [https, tennessees-ai-bill-would-criminalize-training-ai-cha, ai-companion-chatbot-regulation-wave-2026, hb1455, ai-legislative-update-april3-2026, com, transparencycoalition, roborhythms]
    token_count: 355
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c4"
    char_span: [8422, 10141]
    sentence_count: 11
    key_terms: [tennessee, realize, accomplished-gap2989, going, years, longpenisofthelaw, generalfrogspawn, betteroffbroke]
    section: Comments
    token_count: 488
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c5"
    char_span: [10143, 11782]
    sentence_count: 11
    key_terms: [bill, title, law, says, time, including, doctor, passed]
    section: Comments
    token_count: 380
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c6"
    char_span: [11784, 12727]
    sentence_count: 2
    key_terms: [tennessee-backs-off-sweeping-artificial-intelligence-limits-opts-for-study-instead, notorious, kaleidoscopeweary833, stayrevolutionary364, https, known, phillysteakcheese, bill]
    section: Comments
    token_count: 273
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c7"
    char_span: [12729, 15083]
    sentence_count: 4
    key_terms: [disclosure, intelligence, artificial, information, recurring, chatbot, include, related]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/artificial/1slu23a.md#c8"
    char_span: [15086, 16472]
    sentence_count: 5
    key_terms: [heynongman96, legiscan, pornhub, cowboysfanindecember, statisticianfluid747, monthmaterial3351, read, text]
    section: Comments
    token_count: 353
---
# 🚨 RED ALERT: Tennessee is about to make building chatbots a Class A felony (15-25 years in prison). This is not a drill.

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1slu23a/red_alert_tennessee_is_about_to_make_building/)
Posted by **HumanSkyBird** · **1167↑** · **628 comments**

This is not hyperbole, nor will it just go away if we ignore it. It affects every single AI service, from big AI to small devs building saas apps. This is real, please take it seriously.

TL;DR: Tennessee HB1455/SB1493 creates Class A felony criminal liability — the same category as first-degree murder — for anyone who “knowingly trains artificial intelligence” to provide emotional support, act as a companion, simulate a human being, or engage in open-ended conversations that could lead a user to feel they have a relationship with the AI. The Senate Judiciary Committee already approved it 7-0. It takes effect July 1, 2026. This affects every conversational AI product in existence. If you deploy any AI SaaS product, you need to read this right now.

What the bill actually says

The bill makes it a Class A felony (15-25 years imprisonment) to “knowingly train artificial intelligence” to do ANY of the following:

• Provide emotional support, including through open-ended conversations with a user

• Develop an emotional relationship with, or otherwise act as a companion to, an individual

• Simulate a human being, including in appearance, voice, or other mannerisms

• Act as a sentient human or mirror interactions that a human user might have with another human user, such that an individual would feel that the individual could develop a friendship or other relationship with the artificial intelligence

Read that last one again. The trigger isn’t your intent as a developer. It’s whether a user feels like they could develop a friendship with your AI. That is the criminal standard.

On top of the felony charges, the bill creates a civil liability framework: $150,000 in liquidated damages per violation, plus actual damages, emotional distress compensation, punitive damages, and mandatory attorney’s fees.

Why this affects YOU, not just companion apps

I know what you’re thinking: “This targets Replika and Character.AI, not my product.” Wrong.

Every major LLM is RLHF’d to be warm, helpful, empathetic, and conversational. That IS the training. You cannot build a model that follows instructions well and is pleasant to interact with without also building something a user might feel a connection with. The National Law Review’s legal analysis put it bluntly: this language “describes the fundamental design of modern conversational AI chatbots.”

This bill captures:

• ChatGPT, Claude, Gemini, Copilot — all of them produce open-ended conversations and contextual emotional responses

• Any AI SaaS with a chat interface — customer support bots, AI tutors, writing assistants, coding assistants with conversational UI

• Voice-mode AI products — the bill explicitly criminalizes simulating a human “in appearance, voice, or other mannerisms”

• Any wrapper or deployment using system prompts — the bill doesn’t define “train,” doesn’t distinguish between pre-training, fine-tuning, RLHF, or prompt engineering

If you build on top of an LLM API with system prompts that shape the model’s personality, tone, or conversational style — which is literally what everyone deploying AI does — you are potentially in scope.

“But I’m not in Tennessee”

A geoblock helps, but this is criminal law, not a terms of service dispute. The bill doesn’t address jurisdictional boundaries. If a Tennessee resident uses a VPN to access your service and something goes wrong, does a Tennessee DA argue you made a prohibited AI service available to their constituents? The statute is silent on this.

And even if you’re confident jurisdiction won’t reach you today, consider: multiple legal analyses project 5-10 more states will introduce similar legislation before end of 2026. Tennessee is the template, not the exception.

The bill doesn’t define “train”

This is critical. The statute says “knowingly train artificial intelligence” but never defines what “train” means. It doesn’t distinguish between:

• Pre-training a foundation model on billions of tokens

• Fine-tuning a model on custom data

• RLHF alignment (which is what makes every major model “empathetic”)

• Writing a system prompt that gives an AI a name, personality, or conversational style

• Deploying an off-the-shelf API with default settings

A prosecutor who wanted to be aggressive could argue that crafting a system prompt instructing a model to be warm, helpful, and conversational IS training it to provide emotional support.

Where it stands right now

• Senate companion bill SB1493: Approved by Senate Judiciary Committee 7-0 on March 24, 2026

• House bill HB1455: Placed on Judiciary Committee calendar for April 14, 2026 (passed Judiciary TODAY)

• No amendments have been filed for either bill — the language has not been softened at all

• Effective date: July 1, 2026

• Tennessee already signed a separate bill (SB1580) banning AI from representing itself as a mental health professional — that one passed the Senate 32-0 and the House 94-0

The political momentum is entirely one-directional.

The federal preemption angle won’t save you in time

Yes, Trump signed an EO in December 2025 targeting state AI regulation and created a DOJ AI Litigation Task Force. Yes, Senator Blackburn introduced a federal preemption bill. But:

• The EO explicitly carves out child safety from preemption — and Tennessee is framing this as child safety legislation

• The Senate voted 99-1 to strip AI preemption language from the One Big Beautiful Bill Act

• An EO has no preemptive legal force on its own — only Congress can actually preempt state law

• Federal preemption legislation faces “significant headwinds” according to multiple legal analyses

Even if federal preemption eventually happens, it won’t happen before July 1, 2026.

What needs to happen

1. Awareness. Most devs have no idea this bill exists. The Nomi AI subreddit caught it because they’re a companion app. The rest of the AI dev community is sleepwalking toward a cliff. Share this post.
2. Industry response. The major AI companies haven’t publicly opposed this bill because it’s framed as child safety and nobody wants to be the company lobbying against dead kids. But their silence is letting legislation pass that criminalizes the core functionality of their own products. This needs public pressure.
3. Legal challenges. The bill is almost certainly unconstitutional on vagueness grounds — criminal statutes require precise definitions, and terms like “emotional support” and “mirror interactions” and “feel that the individual could develop a friendship” don’t meet that standard. Courts have also recognized code as protected speech. But someone has to actually bring the challenge.
4. Contact Tennessee legislators. If you are a Tennessee resident or have business operations there, contact members of the House Judiciary Committee before this moves to a floor vote.

Sources and further reading

• LegiScan: HB1455 — [https://legiscan.com/TN/bill/HB1455/2025](https://legiscan.com/TN/bill/HB1455/2025)

• Tennessee General Assembly: HB1455 — [https://wapp.capitol.tn.gov/apps/BillInfo/default.aspx?BillNumber=HB1455&GA=114](https://wapp.capitol.tn.gov/apps/BillInfo/default.aspx?BillNumber=HB1455&GA=114)

• National Law Review: “Tennessee’s AI Bill Would Criminalize the Training of AI Chatbots” — [https://natlawreview.com/article/tennessees-ai-bill-would-criminalize-training-ai-cha](https://natlawreview.com/article/tennessees-ai-bill-would-criminalize-training-ai-cha)

• Transparency Coalition AI Legislative Update, April 3, 2026 — [https://www.transparencycoalition.ai/news/ai-legislative-update-april3-2026](https://www.transparencycoalition.ai/news/ai-legislative-update-april3-2026)

• RoboRhythms: AI Companion Regulation Wave 2026 — [https://www.roborhythms.com/ai-companion-chatbot-regulation-wave-2026/](https://www.roborhythms.com/ai-companion-chatbot-regulation-wave-2026/)

I’m an independent AI SaaS developer. I’m not a lawyer, this isn’t legal advice, and I encourage everyone to consult qualified counsel about their specific exposure. But we all need to be paying attention to this. Right now.

## Comments

- **longpenisofthelaw** (482↑): Cool let’s see how they enforce that
  - **Deciheximal144** (494↑): Selectively.
    - **Atavacus** (113↑): Yeah, I'm sure Elon Musk's data center will most definitely be shutdown. Scsm
    - **MisterEinc** (41↑): That's what people need to wake up and realize. All of these crazy bills passed by, especialy republicans, are all bad faith. They're going to use them when it's convenient *for them*.
    - **LamboForWork** (8↑): The American way
    - **Accomplished-Gap2989** (2↑): Haha nailed it
  - **Syl3nReal** (28↑): Tennessee is literally going back 15 years in technology development, Good luck lmao, this bill is so vague that it could easily include any prompt base AI.
    - **SaxSymbol73** (15↑): It’s Tennessee: they’ve been living in the past for 175 years (at least).
    - **Wheatabix11** (4↑): they used grok to write it.
    - **LifeYesterday** (2↑): They just made first cousin marriage illegal in 2024.  Baby steps.
  - **datadrone** (6↑): They banned murder and stealing too
  - **Generalfrogspawn** (4↑): That’s the issue. This is unenforceable. At most these AI companies will say “not available in Tennessee” like porn hub did in ID states.
  - **Zombiespire** (2↑): "911, what is your emergency?

"Hello?! I just heard my neighbor talking to his iPad about his hobbies and interests, and he said 'love you.'"

"Stay calm. A squad car is on the way."

"Hurry plz"
  - **my_evil_plan_too_** (1↑): robocop

...also, dude, dope username
  - **Betteroffbroke** (1↑): You do realize these are the ai regulations that should be in place right?

Otherwise anyone (foreign or domestic) can create an ai bot that provides whatever the algorithm spits out as medical advice…

This couldn’t go wrong, there has never been a teen who thought ai was its best friend and then did things they wouldn’t have otherwise down…
  - **Ambitious_Pizza_4225** (1↑): This sounds like a setup. This ridiculous bill passes then goes to the Supreme Court. The court says states can’t do that, and then other states that have passed real responsible AI laws get their laws repealed too.
  - **Acceptable-One-6597** (1↑): Exactly.  The first time this is tested the courts are going to throw it out.
  - **StoneCypher** (-31↑): op is badly mistaken about what the bill does 

it says “you can’t call a chatbot a medical doctor”

i have a hard time understanding who would be against that 

these bots still can’t answer “how many rocks should i eat”
    - **InnovativeBureaucrat** (29↑): It says 

“As introduced, creates a Class A felony offense of knowingly training artificial intelligence to encourage the act of suicide or criminal homicide, **or act in specific manners, including developing an emotional relationship with an individual or simulating a human being**, including in appearance, voice, or other mannerisms. - Amends TCA Title 29; Title 33; Title 39”

That’s not a misunderstanding
    - **HumanSkyBird** (13↑): Everyone please down vote this. This person has not read the law.

The law you are referring to was passed in December, and is a separate law. This one has nothing to do with behaving as a doctor or therapist. I think you are drunk and angry or something because you literally just need to reads the 5 paragraph bill. HB 1455. It would take less time than lying like this? Please actually read the bill.

You are referring to a bill,passed in late 2025
    - **WhiskyStandard** (4↑): Minerals are good for you.
    - **StayRevolutionary364** (3↑): But we can call trump a doctor. 🤷‍♀️
    - **MetalProgrammer** (1↑): gemini just told me "zero" and explained why it's not only bad for health but to seek medical guidance if I have a strong urge to eat rocks
- **phillysteakcheese** (13↑): They still haven't caught the notorious hacker known as 4Chan, how are they going to find the notorious AI chat bot maker known as Elon?
- **Beneficial_Dealer549** (13↑): Sounds like they walked it back?

https://www.wkrn.com/news/tennessee-news/tennessee-backs-off-sweeping-artificial-intelligence-limits-opts-for-study-instead/
- **KaleidoscopeWeary833** (23↑): This is false. The senate side amended the anti companion AI language out of the bill recently. 

https://www.capitol.tn.gov/Bills/114/Amend/SA0915.pdf
  - **majornerd** (9↑): This is interesting:

Any artificial intelligence or artificial intelligence chatbot interaction occurring
in this state must include a recurring and prominent disclosure clearly indicating that the
user is interacting with an artificial intelligence system or chatbot.
(b) The disclosure required by subsection (a):
(1) May be a watermark, recurring text or pop-up notice, or other
disclosure that is clearly visible and noticeable by a user; and
- 3 - 016379
(2) Must be visible at the beginning of each session and at recurring
intervals of every sixty (60) minutes of continuous A.I. system or chatbot
interaction.
(c) Failure to include a disclosure required by this section constitutes an unfair or
deceptive act or practice and is subject to the penalties and remedies provided in part 1
of this chapter.
    - **saintpetejackboy** (2↑): So... Can we arrest all the people who run chat bots to communicate on platforms like Reddit, creating posts and comments without the disclosure? I could actually get behind that. Same for fake profiles and accounts that don't disclose they are AI!
- **Superb_Raccoon** (8↑): ***False claim of OP:***

>The bill doesn’t define “train”

***What the law actually says:***

(5) "Train":
(A) Means utilizing sets of data and other information to teach an 
artificial intelligence system to perceive, interpret, and learn from data, 
such that the A.I. will later be capable of making decisions based on 
information or other inputs provided to the A.I.; 


***Bits of the law, there are more, that OP ignored, does not understand, or intentionally ommitted:***



Does not include:

(i) A bot that is used only for customer service, a 
business's operational purposes, productivity and analysis related 
to source information, internal research, or technical assistance;
(ii) A bot that is a feature of a video game and is limited to 
replies related to the video game that cannot discuss topics 
related to mental health, self-harm, or sexually explicit content, or 
maintain a dialogue on other topics unrelated to the video game; 

or

(iii) A stand-alone consumer electronic device that 
functions as a speaker and voice command interface, acts as a 
voice-activated virtual assistant, and does not sustain a 
relationship across multiple interactions or generate outputs that 
are likely to elicit emotional responses in the user;


***Op is clearly misreading, failing to read, or is unequipped to understand what they read.***

https://legiscan.com/TN/text/SB1493/2025
- **CowboysFanInDecember** (32↑): If pornhub can block states, I'm sure AI providers can too. TN can pound sand with this nonsense.
  - **HeyNongMan96** (4↑): This is the tldr.
  - **HeyNongMan96** (3↑): By which I mean, I agree. They’re trying to pornhub ai.
- **StatisticianFluid747** (17↑): just looked up the actual text on LegiScan and OP is completely right. the bill actually groups "developing an emotional relationship with an individual" in the exact same sentence as encouraging suicide or criminal homicide.

making it a Class A felony (the same as first-degree murder in TN) just because a user feels a connection to a chatbot is insane overreach. even if this inevitably gets struck down later for being unconstitutional, the chilling effect on open source and small devs in the meantime is going to be massive. how do you even legally prove you *didn't* train a model to be "too friendly"?
- **TwoDurans** (35↑): Welp, time to pack it up, boys. Tennessee has decided AI is over.
- **MonthMaterial3351** (6↑): Now do online gambling
- **spidLL** (3↑): Hey, independent SAAS developer, why don’t you leave the interpretation of the law to people who actually do that for a living? For example I believe you missed the *knowingly* part.
