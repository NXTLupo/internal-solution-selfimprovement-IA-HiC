---
id: social-intelligence/reddit-deep/logistics/1qzcuvn.md
url: "https://www.reddit.com/r/logistics/comments/1qzcuvn/lastmile_delivery_colleagues_how_do_you_actually/"
kind: "social-post"
source: "reddit-deep: r/logistics"
subreddit: "logistics"
title: "Last-Mile Delivery colleagues: How do you actually handle same-day route changes?"
author: "ConfidentCoffee8178"
date: "2026-02-08T16:09:10.000Z"
score: 12
upvote_ratio: 1
num_comments: 17
flair: ""
extracted_at: "2026-06-18T13:35:22.668Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/logistics/1qzcuvn.md#c0"
    char_span: [0, 1339]
    sentence_count: 10
    key_terms: [delivery, planning, driver, route, logistics, comments, handling, initial]
    concepts: [delivery, planning, driver, route, logistics]
    related_chunks: ["social-intelligence/reddit-deep/logistics/1qzcuvn.md#c1"]
    token_count: 318
    sources: [{"n":"reddit-deep: r/logistics","u":"https://www.reddit.com/r/logistics/comments/1qzcuvn/lastmile_delivery_colleagues_how_do_you_actually/"}]
  - id: "social-intelligence/reddit-deep/logistics/1qzcuvn.md#c1"
    char_span: [1353, 3691]
    sentence_count: 16
    key_terms: [routes, couriers, route, time, delivery, stop, efficient, something]
    concepts: [routes, couriers, route, delivery, efficient]
    related_chunks: ["social-intelligence/reddit-deep/logistics/1qzcuvn.md#c0"]
    section: Comments
    token_count: 503
  - id: "social-intelligence/reddit-deep/logistics/1qzcuvn.md#c2"
    char_span: [3693, 5975]
    sentence_count: 12
    key_terms: [live, tracking, whatsapp, day, sick, exceptions, blocked, changes]
    concepts: [tracking, whatsapp, exceptions, blocked, changes]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/logistics/1qzcuvn.md#c3"
    char_span: [5977, 8220]
    sentence_count: 13
    key_terms: [maptitude-fleet-logistics-video, maptitude, caliper, https, com, time, www, reassign]
    concepts: [maptitude-fleet-logistics-video, maptitude, caliper, https, reassign]
    section: Comments
    token_count: 495
---
# Last-Mile Delivery colleagues: How do you actually handle same-day route changes?

Source: [reddit-deep: r/logistics](https://www.reddit.com/r/logistics/comments/1qzcuvn/lastmile_delivery_colleagues_how_do_you_actually/)
Posted by **ConfidentCoffee8178** · **12↑** · **17 comments**

Hi, I'm a delivery ops manager here (the Netherlands) for a small urban courier network (\~30 vehicles and e-cargo bikes). I want to learn how others are handling the day-to day chaos when planning completely falls apart.

Here's what happens to us regularly:

* Morning route is locked in, then 3 drivers call in sick at 7 am
* A traffic accident blocks our main delivery zone
* Driver 7 is running 45 minutes behind and we have no idea if we should reroute or hold

Right now, our "system" is:

1. Excel template for the base routes
2. WhatsApp group chat going nuclear
3. Me staring at Google Maps and hoping I make the best decision
4. Lots of mistakes

We've looked at some TMS/routing software but they're either $50K+ enterprise stuff or they just do the initial route planning—they don't really help when you need to make a call *right now* about whether to send driver 12 to cover driver 7's area or push orders to tomorrow.

What are you all actually using day-to-day for this? Especially the exception handling, not just the initial planning.

## Comments

- **the_Q_spice** (6↑): Sounds like micromanagement leading to these issues. 

Turn by turn routing is insanely inefficient as soon as it hits even 1 snag preventing the ideal route. There's a reason that the largest couriers in the world don't use it and instead opt for couriers having local geographical knowledge as to what the best routes are in any given situation.

In general, what I did as a courier was organize my day by time commitment, and route stop by stop for which was the next closest and required the fewest number of left hand turns or major intersection crossings not protected by active traffic signals. It took about 3-4 months to learn my delivery area well, but by that point, all I needed to do was look at the next address, and already knew the most efficient route to get there - no mapping software *at all*. Even AI is less efficient than wrote aerial memorization; because it takes time, wasted time, to type something into a phone and/or look at a navigation app. AI will *always* be slower than a courier who has memorized their delivery area due to that simple fact.

45 minutes behind doesn't matter if you don't have time commits. Stop worrying about that. As long as everything gets delivered, the overtime pay is a really tiny detail. You lose more money through customer loss because of delivery failure than you lose from minimal overtime spend.

As for sick calls, having part-time employees on staff can help solve this. Inevitably, some will be willing to absorb portions of full-time routes. Alternatively, you can have "sweep" couriers who take out deliveries that are over what is reasonable for other routes. Sweeps tend to have more distance between stops, so tend to have fewer stops per route, but help massively with reducing rollover.

If you are *that* worried about couriers failing to finish routes, the actual issue is that you are understaffed and have too much volume for your current scale.
- **Nervous_Support_3527** (3↑): Here are some suggestions : Base routes still planned in a routing tool (we use something mid-tier, not enterprise), Export to a shared live map (Google My Maps / Onfleet-style board equivalent), Every driver tracked live (even if it’s just phone GPS).   
  
Regarding traffic, 

* If ETA impact >25 min → reroute.
* If <25 min → hold and notify customers

Do you have fixed zones per driver or fully dynamic routes?
- **Geo_PaulEDNA** (3↑): Hi, I am new on this channel, so not sure how to communicate directly. I live in the Nerherlands as well, professional in Logistics and Transportation. The Maptitude recommendation in the thread is valuable, I have been using it for many years now and it is simply great, with either a Netherlands or European package. There are other solutions, for real time tracking and tracing and live progres monitoring, you could consider a SAAS solution. Optimoroute is one provider offering you realtime online options. So as usual “it depends”.
- **dave36756** (2↑): We were in the same Excel + WhatsApp spiral (different country, similar size fleet) and the only thing that really changed the day-to-day was getting a reliable live view of where everyone actually is. Route plans are nice at 6am, but once you get 2 sick calls and a blocked street you're basically dispatching blind.

What ended up working for us was:

\- Keep base routes "good enough" (zones/loops, not perfect turn-by-turn)

\- Track every vehicle on a live map from phone GPS so dispatch can make fast calls without 10 WhatsApp pings

\- Have 2-3 predefined playbooks for exceptions (sick call, major delay, blocked area) so you're not reinventing rules under pressure

On the tracking side, we got burned by hardware trackers (SIM issues, dead units, no one notices until you need it), so we moved to running tracking on driver phones. I've used MyCarTracks for that because it stayed running in the background and gave us a consistent map view when the day went sideways.

Question back: do you have any slack capacity baked in (like 1 floater vehicle/bike per shift), or are you always planning at 100% utilization? That one detail changes whether reroutes actually work or just move the fire around.
  - **ConfidentCoffee8178** (2↑): Yeah we always account for 2 extra riders just in case others call in sick on the day/prior to the shift
- **South-Ant9361** (2↑): Same day changes are not really “route optimization.” They are exception operations. The only way we stopped the chaos was treating disruptions as a small set of repeatable plays, executed from an exceptions queue, not rebuilt in Excel and argued out in WhatsApp.

How we run it using Grasshopper Labs:

* Dispatch works an exceptions board first (sick calls, blocked zone, late driver, capacity hit). Routes are secondary because they become stale fast.
* We keep 5 to 8 standard moves that cover most days: split a route, reassign a stop cluster to another driver, freeze a geofenced area and rerun the rest, defer low priority stops to next day, spin up an overflow route or hand off to a partner.
* Every exception is structured: code + disposition + reason. That forces decisions into the system so the next dispatcher can see what happened and why, and you can tighten policies over time.
* Reoptimize only the impacted slice. Full replan is a last resort. In cities and bikes, constraints matter more than distance: time windows, service times, restricted zones, bike range, load limits.

For the “driver 7 is 45 minutes behind” call, the rule is consistent: protect time window stops first, split or reassign a cluster if breach risk is high, and defer stops that are allowed to slip.
- **maptitude** (1↑): This could help and is $795... . [https://www.caliper.com/maptitude/international/netherlands.htm](https://www.caliper.com/maptitude/international/netherlands.htm) with [https://www.caliper.com/video/maptitude/maptitude-fleet-logistics-video/maptitude-fleet-logistics-video.html](https://www.caliper.com/video/maptitude/maptitude-fleet-logistics-video/maptitude-fleet-logistics-video.html) . We and our Dutch users would be happy to offer advise.
- **MechsoftDigital** (1↑): This is pretty common once everything depends on Excel + WhatsApp. The issue isn’t really the route plan - it’s what happens after it breaks. As soon as drivers drop out or delays hit, you’re suddenly trying to adjust routes, reassign drivers, and manage deliveries all at the same time, but without any real visibility. At that point, it turns into reactive decision-making. You’re basically guessing whether to reroute, delay, or push orders, and every decision affects something else downstream. Most teams handle it with experience and quick calls, but it gets messy fast when disruptions become frequent. The hard part isn’t planning routes - it’s handling exceptions without creating new problems somewhere else.
