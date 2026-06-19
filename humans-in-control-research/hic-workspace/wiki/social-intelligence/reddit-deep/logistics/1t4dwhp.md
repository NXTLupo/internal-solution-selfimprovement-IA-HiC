---
id: social-intelligence/reddit-deep/logistics/1t4dwhp.md
url: "https://www.reddit.com/r/logistics/comments/1t4dwhp/does_anyone_actually_measure_the_cost_of_a_failed/"
kind: "social-post"
source: "reddit-deep: r/logistics"
subreddit: "logistics"
title: "Does anyone actually measure the cost of a failed delivery, or do we all just quote the same €17 figure?"
author: "Julien_Coordable"
date: "2026-05-05T12:24:17.000Z"
score: 6
upvote_ratio: 0.81
num_comments: 9
flair: ""
extracted_at: "2026-06-18T13:35:22.676Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/logistics/1t4dwhp.md#c0"
    char_span: [0, 957]
    sentence_count: 8
    key_terms: [anyone, logistics, comments, delivery, industry, failed, does, per]
    token_count: 216
  - id: "social-intelligence/reddit-deep/logistics/1t4dwhp.md#c1"
    char_span: [972, 2736]
    sentence_count: 14
    key_terms: [cost, driver, nobody, because, b2b, carriers, "doesn't", freight]
    section: Comments
    token_count: 413
  - id: "social-intelligence/reddit-deep/logistics/1t4dwhp.md#c2"
    char_span: [2738, 3718]
    sentence_count: 11
    key_terms: [schedule, tracking, nobody, cost, too, bigvalleytech, stealthagents, truckerverse]
    section: Comments
    token_count: 231
---
# Does anyone actually measure the cost of a failed delivery, or do we all just quote the same €17 figure?

Source: [reddit-deep: r/logistics](https://www.reddit.com/r/logistics/comments/1t4dwhp/does_anyone_actually_measure_the_cost_of_a_failed/)
Posted by **Julien_Coordable** · **6↑** · **9 comments**

I keep seeing €17 per failed delivery cited everywhere: carrier decks, industry reports, consultant benchmarks. Nobody shows how they got there and if it's actually verified on the field.

I tried to build the model myself from first principles: driver time, fuel, route disruption on subsequent stops, customer support contact rate. Came out at €15.30 for urban B2C redelivery in Europe, which is close enough to the €17 to feel plausible.

But I'm building this theoretically. Curious whether anyone actually measures this operationally: does anyone track it? Per event, estimate it from aggregate data, or just use an industry benchmark and move on?

## Comments

- **ashwany_pillai** (1↑): The €17 figure gets passed around because it's defensible enough to put in a deck and vague enough that nobody can argue with it. That's the only reason it survives.

The actual cost depends on variables most carriers never track together. The direct cost of the redelivery attempt is the easy part. What compounds it is driver time pulled from other stops, route inefficiency on the original run, customer contact volume, and in white glove or high-value freight, the relationship damage that doesn't show up in any report until the account churns.

The carriers who've actually measured it operationally tend to find the number is higher than €17 in most urban scenarios and that the real value of reducing failure rate isn't the direct cost recovery. It's the downstream capacity you get back. A failed delivery doesn't just cost you the reattempt. It costs you the stop that didn't happen because the driver ran late.
  - **Julien_Coordable** (1↑): Hey, that’s exactly the conclusions I have from my simulations ! 
And I’ve also tried to simulate that in peri-urban and rural areas, where that cost rocket up to 2.5x the urban cost. 

I’m a bit surprised that no major company is actually monitoring this, the cost at scale is enormous…
- **Truckerverse** (1↑): On the b2b freight side nobody tracks it either. Driver shows up at a warehouse on the a16 near rotterdam, waits 2 hours because nobody was ready on the dock. Thats easily 80-100 euro in driver cost alone and it cascades into the next stop. Your 15.30 number for b2c sounds about right, the b2b version is way worse and almost nobody measures it.
  - **Julien_Coordable** (1↑): You are right I focused on B2C but B2B is definitely subject to that kind of costs as well ! 

Do you know why nobody is tracking this ? Is it too complicated ? Is it not really a pain point not tracking these costs ?
  - **BigValleyTech** (1↑): Right! Missed pallet network deliveries cost £25-£30 in uk
- **Truckerverse** (1↑): Nobody counts the driver side of this. You show up at a dock that was supposed to be ready. It's not. You wait 90 minutes, your whole schedule shifts, your next stop now falls outside their receiving window so that becomes another failed delivery too. One delay cascades into two or three. The EUR 17 figure probably only captures the retry cost, not the downstream schedule damage across the rest of that driver's route.
- **stealthagents** (1↑): Sounds like a classic case of the "copy-paste" approach in the industry. A lot of companies lean on those static numbers instead of digging into the real data. I’ve seen a few places trying to track it more accurately, but it’s definitely not the norm—most just plug in that €17 and call it a day.
