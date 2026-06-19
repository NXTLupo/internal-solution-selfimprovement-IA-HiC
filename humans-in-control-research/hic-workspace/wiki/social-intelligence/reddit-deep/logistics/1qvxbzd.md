---
id: social-intelligence/reddit-deep/logistics/1qvxbzd.md
url: "https://www.reddit.com/r/logistics/comments/1qvxbzd/could_a_uav_like_this_actually_be_useful_in_real/"
kind: "social-post"
source: "reddit-deep: r/logistics"
subreddit: "logistics"
title: "Could a UAV like this actually be useful in real logistics? Looking for honest feedback"
author: "mr_princerawat_"
date: "2026-02-04T18:55:35.000Z"
score: 7
upvote_ratio: 0.89
num_comments: 15
flair: ""
extracted_at: "2026-06-18T13:35:22.681Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/logistics/1qvxbzd.md#c0"
    char_span: [0, 1222]
    sentence_count: 8
    key_terms: [logistics, cargo, operational, autonomous, aircraft, comments, delivery, feedback]
    token_count: 269
  - id: "social-intelligence/reddit-deep/logistics/1qvxbzd.md#c1"
    char_span: [1237, 3143]
    sentence_count: 15
    key_terms: [aircraft, type, fluid, conditions, procedures, deicing, parameters, projected]
    section: Comments
    token_count: 427
  - id: "social-intelligence/reddit-deep/logistics/1qvxbzd.md#c2"
    char_span: [3145, 5551]
    sentence_count: 18
    key_terms: [aircraft, design, high-frequency, feeder, operational, high, lot, logistics]
    section: Comments
    token_count: 503
  - id: "social-intelligence/reddit-deep/logistics/1qvxbzd.md#c3"
    char_span: [5553, 7834]
    sentence_count: 20
    key_terms: [premium, drone, utilization, isn, expedited, liability, something, sprinter]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/logistics/1qvxbzd.md#c4"
    char_span: [7836, 9363]
    sentence_count: 8
    key_terms: [logistics, problems, shipping, current, island, routes, speed, greycouchbluewalls]
    section: Comments
    token_count: 360
---
# Could a UAV like this actually be useful in real logistics? Looking for honest feedback

Source: [reddit-deep: r/logistics](https://www.reddit.com/r/logistics/comments/1qvxbzd/could_a_uav_like_this_actually_be_useful_in_real/)
Posted by **mr_princerawat_** · **7↑** · **15 comments**

Hey r/logistics — I’m building a startup focused on autonomous cargo aircraft, and I want grounded feedback from people who actually work in logistics.

We’re developing a UAV platform (\~200 kg/450lb cargo, \~500 km/300 miles range). The idea is not last-mile delivery, but mid-mile with faster logistics.

The big question is: **does this solve a real operational pain point, or is this just a cool engineering toy?**

From your experience:

* Where are the biggest bottlenecks in current regional cargo transport?
* Are there routes or cargo categories where companies would actually pay a premium for faster point-to-point delivery?
* What regulatory / insurance / operational hurdles would kill adoption immediately?
* Would logistics operators trust autonomous aircraft at all?

I’m not looking for validation — I want criticism. If this is dumb, I’d rather hear it early.

Appreciate any honest insight from people in the field.

## Comments

- **the_Q_spice** (2↑): The two biggest questions I have are pretty simple. What's the projected operating cost per hour? What's the projected airspeed?

That *could* make a case somewhat... but that cargo load is *painfully* tiny.

At FedEx, the smallest Feeder aircraft we operate are C208Bs with 1,500-2,500lb payload capacities and 400-630 miles of range.

Our next smallest aircraft is the C408F that can haul around 5,000lbs up to 450 miles.

After that, you get into regional airliner sized aircraft like ATRs.

As for regulatory hurdles, you are going to need an FAA type certificate along with weight and balance sheets, maintenance intervals and procedures, training documents for ground crew, checklists and documentation for operations, deicing parameters and procedures, and IFR instrumentation. 

The most important of those cost-wise is the IFR instruments, because those are insanely expensive (radio direction finders and beacon finders, radar, and radar altimeter at a minimum). After that, the biggest is the icing parameters and procedures. 

Fundamentally, a cargo aircraft has to be able to fly in as many weather conditions as possible. Deicing is a critical part of that, as in the US it is literally illegal (CFR §121.629) to take off with in any *aircraft* when frost, ice, snow, or frozen precipitation or accumulation is present on any critical surface (wings, propellers, or any control surfaces).

There are strict holdover times for each type of fluid used for this purpose, and while Type I deicing fluid will deice you, there are some weather conditions where it doesn't give you *any* holdover time *at all*. In those conditions, you have to apply Type IV anti-icing fluid after the initial Type I treatment. The issue with Type IV is that it is a much more vicious fluid and actually requires an aircraft to be going around 100-120kts in order to properly shed the fluid.

This isn't an exhaustive list, just some of the more operational things that a lot of people don't realize about aircraft operations. You can't just simply design a drone or plane and start flying it commercially. There is an utter shit ton of regulatory hoops you have to go through to prove your design and procedures are safe. Usually that process costs in the neighborhood of millions to tens of millions and 5-10 years.
  - **mr_princerawat_** (1↑): This is an incredibly helpful breakdown, seriously appreciate you taking the time to write this.

On numbers (early modeling, not final):

* **Target cruise speed:** \~300–350 km/h (\~160–190 kts)
* **Projected operating cost:** aiming \~$100-$200/hr long-term, but early units would be higher until scale + reliability data bring insurance and maintenance down

The payload is small compared to feeder aircraft, no argument there. We’re not trying to compete with C208/C408 class lift. Those are incredible machines and optimized for bulk feeder economics. Our assumption is we only survive if we live in a *different* lane: high-frequency, small-batch where aircraft utilization matters more than per-flight payload.

Think closer to a scheduled courier network than traditional feeder freight.

The icing point is especially interesting, we’ve been discussing whether we design around operating windows initially (fair-weather corridors) vs solving full all-weather capability up front. The latter is obviously what real cargo ops require, but the certification + cost curve is brutal.

From your FedEx experience, I’m curious, Are there lanes where small, high-frequency lift would actually help, or is scale always the winner?

Trying to understand whether there’s a real operational gap here or if the industry is already optimally shaped.

P.S. these are VTOL style aircraft, you can take off from a parking lot if needed.
- **gobells1126** (2↑): The logistics sub is full of people who mostly work in and sell logistics services, they don't design the supply chains. You need to go find industries where they need to move high value goods medium distances at high frequency. Medical/cold chain is a possibility, as is specialized manufacturing. There's also a high speed 3pl fulfillment angle possibly. You could offer companies who use a lot of overnight air freight the ability to cut out the ups and FedEx of the world and their hub model. 

Think people who have high throughput, complex supply chains, and a mentality of I'm losing x hundred thousand dollars every hour my lines not running 

Alternatively look into Aerial survey loaded up with big large area sensors
- **bac0467** (1↑): Believe you’re creating a solution for something that doesn’t exist. That also brings in a complete liability worry for me of motor goes out and cargo comes crashing down on something, destroying cargo. Not to mention by the time you strap it up, clear with FAA and such? Sprinter van can be halfway there 

Any idea what you’d charge?
  - **mr_princerawat_** (2↑): Totally fair, We’re not trying to replace sprinter vans broadly. For most shipments, trucks will always win. The thesis is about high-frequency, fixed routes where utilization matters more than flexibility. A truck + driver has hard limits (hours-of-service, downtime, scheduling). An autonomous aircraft can run close to continuous cycles. If we can push \~6–8× higher asset utilization, the cost per kg-km drops enough to compete with expedited freight.

Liability is the real make-or-break issue. If safety isn’t statistically better than ground transport, nobody insures it and the model dies. So redundancy + recovery systems is must have for us.

Pricing target isn’t bulk freight cheap, it’s competing with premium expedited logistics where customers are already paying to avoid delay.

Out of curiosity: where do *you* see people already paying a premium because trucks are too slow or unreliable? That’s the niche we’re trying to validate.
    - **rantingandrambling** (1↑): no one’s going to pay you this premium 

because it’s sounding like you want to charge helicopter prices 

for mid mile drone flight… 

not even end to end full service 

this is going to add a level of stress and complexity that isn’t solving a problem 

maybe after the bombs drop
- **countrytime1** (1↑): The FAA requirements for that would be a pain, as has been stated. You have to get clearance to fly a small drone within a certain from an airport.
- **dialsoapbox** (1↑): I'm curious about your insurance.

Drop a package?

Drone falls out of the sky (with/out package) and/or runs into a building?

How/where will it land/takeoff?

What'd be your operational flying height?

Seems like you'd have a lot more to deal with before you can even get started more than just the engineering part.
- **Consistent_Voice_732** (1↑): Regulation won't kill it, but it'll push early adoption into remote or controlled routes. Dense logistics corridors are much harder first step
  - **mr_princerawat_** (1↑): That's the plan, to run high-frequency flight in a pre-approved corridor. Tech + regulations are not the problems as these are solvable problems, I'm trying to validate if this could work in a non-defense use case, if so where...
- **greycouchbluewalls** (1↑): There might be an application for it for inter island shipping. Think of places such as Philippines and Indonesia where the current (economical) mode of shipping is via ferry.
- **Blackestwood** (1↑): This would be extremely useful for US parcel shippers to inject into US regional carrier hubs.

You need to beat a current pickup price of $75-100 and be able to move at least 1 pallet on demand.
  - **mr_princerawat_** (1↑): Check DMs
- **ennova2005** (1↑): Island hopping (compete with boat cargo on speed)
- **stealthagents** (1↑): The payload is definitely on the lighter side, especially if you’re targeting mid-mile logistics. A lot of companies choose larger aircraft for the economies of scale. But if you can find specific routes where speed is crucial, like time-sensitive medical supplies or urgent parts, you might carve out a niche. The regulatory hurdles will be huge, though, so make sure you’re prepared for that side of things.
