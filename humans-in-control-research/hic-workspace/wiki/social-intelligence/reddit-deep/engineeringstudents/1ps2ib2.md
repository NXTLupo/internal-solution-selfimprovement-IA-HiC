---
id: social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md
url: "https://www.reddit.com/r/EngineeringStudents/comments/1ps2ib2/building_a_sub40g_wireless_mouse_at_16_roast_my/"
kind: "social-post"
source: "reddit-deep: r/engineeringstudents"
subreddit: "engineeringstudents"
title: "Building a sub-40g wireless mouse at 16 - roast my design or help me build it"
author: "Trix-one"
date: "2025-12-21T09:21:32.000Z"
score: 474
upvote_ratio: 0.92
num_comments: 92
flair: "Project Help"
extracted_at: "2026-05-24T14:08:39.218Z"
extraction_method: "praw-deep"
research_goal: "Develop a comprehensive new strategy for Northeastern University's co-op program, integrating insights from current SOW, prior projects, and fresh industry analysis of experiential learning and co-op engagement tactics. The strategy must enhance learner access to meaningful experiential opportunities from pre-enrollment through graduate school."
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c0"
    char_span: [0, 1862]
    sentence_count: 2
    key_terms: [engineeringstudents, https, comments, wireless, design, discord, sub-40g, nordic]
    token_count: 519
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c1"
    char_span: [1864, 2893]
    sentence_count: 2
    key_terms: [firmware, development, feedback, chinese, looking, better, brands, design]
    token_count: 223
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c2"
    char_span: [2907, 5018]
    sentence_count: 17
    key_terms: [cost, chinese, mouse, bom, good, supply, chain, cheap]
    section: Comments
    token_count: 516
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c3"
    char_span: [5022, 6953]
    sentence_count: 15
    key_terms: [bom, costs, cost, weight, want, components, reconsider, smoothmarx]
    section: Comments
    token_count: 449
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c4"
    char_span: [6955, 8113]
    sentence_count: 9
    key_terms: [competitive, going, mouse, desk, try, clayquartercake, manufacturing, lightweight]
    section: Comments
    token_count: 281
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c5"
    char_span: [8115, 10098]
    sentence_count: 7
    key_terms: [good, market, practicality, like, side, aspecially, probably, trix-one]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/engineeringstudents/1ps2ib2.md#c6"
    char_span: [10100, 11964]
    sentence_count: 2
    key_terms: [like, trix-one, linux, "i'm", bhop2003, comments, exactly, become]
    section: Comments
    token_count: 463
---
# Building a sub-40g wireless mouse at 16 - roast my design or help me build it

Source: [reddit-deep: r/engineeringstudents](https://www.reddit.com/r/EngineeringStudents/comments/1ps2ib2/building_a_sub40g_wireless_mouse_at_16_roast_my/)
Posted by **Trix-one** · **474↑** · **92 comments**

!!!! UPDATE !!!! [https://www.reddit.com/r/EngineeringStudents/comments/1t7b4rk/sub40g\_wireless\_mouse\_at\_16\_follow\_up\_to\_my\_last/](https://www.reddit.com/r/EngineeringStudents/comments/1t7b4rk/sub40g_wireless_mouse_at_16_follow_up_to_my_last/)

Hey everyone,

I'm Trix, 16, not studiyng engieneering in uni but following online courses, and I've been designing an ultralight wireless gaming mouse because I got tired of paying €150+ for 50g of plastic in Europe.

\*\*Discord for project updates:\*\* [https://discord.gg/UVyRmG7nHy](https://discord.gg/UVyRmG7nHy)

\*\*Updated design specs\*\* (revised based on feedback):

\- Sub-40g target weight

\- Wireless 2.4GHz, 1-4kHz polling

\- Nordic nRF52840 MCU (reconsidering RP2040 based on feedback)

\- PAW3395 sensor (upgraded from PMW3360 for better power efficiency)

\- USB-C charging (removed magnetic to save weight)

\- Hotswap optical switches

\- Optical scroll wheel

\*\*My situation:\*\*

\- CAD design complete (Shapr3D)

\- Learning KiCad for PCB design

\- Prototyping shells with Bambu P1S (ABS-GF filament)

\- Studying Nordic SDK and embedded C++

\- €2.5k budget saved for prototyping

\- 2-3 year timeline to first production batch

\*\*Key learnings from the community so far:\*\*

\- PMW3360 is outdated - PAW3395 minimum for wireless

\- Sub-40g is competitive, sub-50g is just okay

\- RP2040 lacks integrated radio - Nordic chips are industry standard

\- Magnetic charging adds unnecessary weight

\- Build quality and reliability matter more than spec sheets

\*\*Why I'm posting:\*\*

1. \*\*Reality check:\*\* Can I actually compete with established brands and cheap Chinese manufacturers?
2. \*\*Collaboration:\*\* Looking for help with nRF52 firmware or KiCad PCB design
3. \*\*Feature priorities:\*\* What matters MOST to you in a mouse?

\*\*What makes this different:\*\*

\- Open-source hardware and firmware (full transparency)

\- EU-based = no import tax or long shipping for Europeans

\- Community-driven development (your feedback shapes the product)

\- Better QC than cheap Chinese clones, half the price of big brands

\- Built by someone who actually uses it daily

\*\*Current challenges:\*\*

\- Sourcing authentic PAW3395 sensors (not readily available retail)

\- Learning embedded firmware development from scratch

\- Balancing weight reduction with structural integrity

\- Keeping BOM cost under €40 per unit

Not looking for sponsors or investment - just honest feedback and maybe some help from people who think this is worth building.

Roast my design or tell me how to make it better 👇

## Comments

- **polymath_uk** (347↑): "Can I actually compete with established brands and cheap Chinese manufacturers?"


What is the unit price of production for the Chinese models? This is the only thing that matters to answer that question. You could buy one and reverse engineer it.


BTW this is impressive work for a 16 yo. My degree students can't do this level of detail.
  - **Trix-one** (73↑): thanks, i'm watching the prices on alibaba, and it's very competitive, but with a good software and by reaching the wheight goal maybe i can be competitive.
    - **Slow_Yogurtcloset388** (51↑): You should watch optimum tech on YouTube for his series on mouse design.

1) keeping BOM cost is easy, bigger issue is marketing and reaching customers. PCBA is dirt cheap. Resin farming is cheap. At 200 inits, pcba and a tiny battery is likely only $10 a unit. Bigger cost is the body or tooling and assembly. Keeping body cost down you need injection, which pushes your tooling cost way up. 

2) big value add on mouse nowadays is also software, so you’ll need to program the firmware and good easy to use gui to setup the mouse.

3) for this, you should be using a resin printer. 

4) even with EU based, you dont have the supply chain advantage. After the supply chain efficiency, it’s cheaper to just pay the tariff. 

5) the “Chinese clones” are discounting the fact that many of the good mice are made in China. Their robust supply chain and availability of engineers make its easy to create high quality electronic goods. They are the leader in the consumer space for a reason. 

You should just build this as learning, not as an actual commercial project. Building lightweight functional mouse is hard, and even harder is convincing people to pay good money for it, while warding off copycats. 

Definitely check out optimum tech. Different design choices but he details his process.
  - **Trix-one** (4↑): finished the cost analysis for the most popular chinese knock-offs: 

\- Mchose L7 Ultra: \~$8-12 BOM, sells for $30-40

\- VXE Mad R: \~$10-15 BOM, sells for $35-50

\- My target: €35-40 BOM, sell for €89-99



The gap is: QC, support, EU availability, and open-source transparency. I'm not trying to compete on pure cost - I'm competing on reliability and community trust too.
    - **polymath_uk** (10↑): The markup from BOM to retail in the Chinese brands is variable but can be x5. Yours is about x2. There must be a reason why this markup is higher in their products - probably because of the other costs to market that are not accounted for in the BOM to retail costs. I suspect that what will happen is that you will find that your design is uneconomical to produce as you progress through the design activities to the point where you have a total costs to market. I HIGHLY advise you to try to reduce the costs of the hardware otherwise you will end up missing the price point. Your product may well perform brilliantly, but nobody will find that cost/performance offering attractive enough to buy. They will simply put up with a slightly less good Chinese product for less that half the price.
    - **Forum_Layman** (1↑): Your mark up is far too small. $40 BOM you’ll want to be selling for near $200. If you want to hit $99 you’re going to want to aim for a $20 bom cost
- **SmoothMarx** (21↑): You should reconsider how important a factor is weight. I have a mouse with magnets and a removable battery, but since it glides so well, I don't notice it at all. And it can lower the BOM since you'd have more regular components.

MadCatz RAT 9, in case you were wondering.
  - **Trix-one** (3↑): Weight is a factor, not the only one. Low friction and good glide can compensate for higher mass. and using more standard components can also reduce BOM cost and simplify manufacturing. However, weight still matters for some users and use cases, so it’s a trade-off rather than an absolute rule.
    - **SmoothMarx** (2↑): Absolutely, agree with everything. That's why I said to reconsider the priority of it, not to remove it completely.

Like you said, ceding on that factor makes it cheaper, simplifies manufacturing and may not have a practical noticeable difference in the end, if done right. May be worth the trade-offs for you as a creator.
    - **ClayQuarterCake** (1↑): Think about this: I very much prefer a heavier mouse. It sits nicer on the desk, glides well, and it is not as sensitive to minor bumps in the mousepad or desk. 

Lightweight mice are flimsy and cheap feeling. They make me want to grab onto it harder to try and get more control on the cursor, which then can bend the frame and mess with the optical sensor. 

If you are going to try and compete with the Chinese, you are going to need to sell yourself as a premium brand, this means adding weight. Besides, it gives you lots of available mass to have a decent battery in there.
  - **kljaja998** (1↑): No offense, but the rat 9 is a laughably bad mouse when it comes to competitive shooters, which looking at OP's design criteria seems to be the intended goal.
    - **SmoothMarx** (1↑): I must've skimmed over the "gaming" part.

But why? I mean, I'm a gamer, just not competitive and I never really had any issues. 

LoL, PUBG, NMS, point and click classics, all work fine. Granted, I don't play CS, but really, no issues from my side.
- **Bingo-Bongo-Boingo** (10↑): I was doing the same type of projects when I was 16. None of them worked out (they all could’ve, I just didn’t chose to do so), but they still were tons of fun and gave me good experience with the type of work I want to do as a career. 
Even if you aren’t able to strike gold with mass production, you will at least end up knowing a lot more about everything involved. Plus probably a good few prototypes to use for yourself
  - **Trix-one** (6↑): thanks a lot
- **nctrnalantern** (6↑): whats your price? i’d cop
- **Exormeter** (5↑): So your goal is to sell it eventually? If yes, there is another side of the coin in compliance with laws about bringing electric devices to the market. You should take a look at CE Certification, WEEE device disposal and FCC regulation
  - **Trix-one** (0↑): ok i'll check that out, right now is ust a concept
- **Agniamar** (7↑): W in chat
- **glad-k** (4↑): First of all congrats man this is insane aspecially at 16

Keep it up your out of the norm but in a very damn good way, you seem to enjoy it and it will probably pay for your food later which is the best thing you can have in life

For Q3: I'm personnaly just missing the practicality aspect on those types of light fps mouses which have become the norm nowedays
I like mouses with ergonomics and practicality in mind like a the g502 family (side buttons on the left click, infinite scroll, shape, battery life, wireless,...) and wish they were more out on the market
And yeah beside G502X (which is far from perfect like weight and software (aspecially as a linux user) and even price) there is not much on the market for me and your `**What makes this different:**` sounds darn good ngl (fellow european open-source enthousiast)

The day you make one of those types heads me up I will be glad to give my input and buy the final product

Wish you all the best man

ps: weight is not that important (for me) as pads make a bigger deference imo but is just a finishing touch
  - **Trix-one** (0↑): thx, i'm all about linux support bc i was and am a daily linux user, join the discord, i'll keep updating there, you could become a beta tester when eventually i'll make good enough prototypes, glad to see other people see the proect this way.
    - **glad-k** (1↑): Hell yeah, will be glad to beta test this

And even more if you incorporate those extra (non only gaming) focused ideas as I personally can't leave without them anymore and have become locked in the g502 family since due to that (help me out of this jail, logitech software horrible especially on linux and they started to put those cheap glossy plastics for some reason)

Oh and also rgb is kinda stupid and ads weight for nothing but just having like a small bit can be helpful to display information (low battery, switching profiles, connecting (bluetooth))

Is there maybe also a github or smth documenting everything + including all the code?
- **bhop2003** (4↑): Stop AI generating your project, posts, and comments, and maybe you will get somewhere
  - **Trix-one** (-2↑): roast the design not the render (there are 10 other comments that are tlaking about the image, not using ai for the text, and i'm NOT a native english speaker, i'm from italy
    - **bhop2003** (2↑): Stop the cap man it’s obvious the whole post is ai written
- **SuperFadeAway35** (3↑): Every chinese made wireless mouse on amazon be like :0
- **2019LastGoodYear** (3↑): Can't tell if you modeled that mouse or not. Looks exactly like another.
  - **Me_180** (2↑): yea looks exactly like my old razer deathadder
    - **Trix-one** (1↑): it's a mockup like any other a placeholder, i made the mockup thats the only difference the design will be heavily tweaked
