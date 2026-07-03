---
id: social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md
url: "https://www.reddit.com/r/smallbusiness/comments/1p3ulf5/i_increased_our_phone_repair_shop_revenue_28_in/"
kind: "social-post"
source: "reddit-deep: r/smallbusiness"
subreddit: "smallbusiness"
title: "I increased our phone repair shop revenue 28% in 90 days with zero ad budget (automated review collection + customer retention) Anyone have tips to beat these numbers?"
author: "Electronic-Gur8814"
date: "2025-11-22T14:29:35.000Z"
score: 4
upvote_ratio: 0.83
num_comments: 14
flair: "Question"
extracted_at: "2026-07-03T00:07:52.499Z"
extraction_method: "praw-deep"
research_goal: ""
engagement: "misc"
chunks:
  - id: "social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md#c0"
    char_span: [0, 2084]
    sentence_count: 9
    key_terms: [customers, google, customer, days, feedback, ranking, reviews, unhappy]
    concepts: [customers, google, customer, feedback, smallbusiness]
    related_chunks: ["social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md#c1"]
    token_count: 506
    sources: [{"n":"reddit-deep: r/smallbusiness","u":"https://www.reddit.com/r/smallbusiness/comments/1p3ulf5/i_increased_our_phone_repair_shop_revenue_28_in/"}]
  - id: "social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md#c1"
    char_span: [2086, 2751]
    sentence_count: 4
    key_terms: [customers, customer, unhappy, experimenting, segmentation, barbershops, automation, businesses]
    concepts: [customers, customer, unhappy]
    related_chunks: ["social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md#c0"]
    token_count: 140
  - id: "social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md#c2"
    char_span: [2766, 4392]
    sentence_count: 10
    key_terms: [specific-peanut-8867, removed, repair, automatically, smallbusiness, development, got, seo]
    concepts: [specific-peanut-8867, automatically, smallbusiness, removed, repair]
    section: Comments
    token_count: 373
  - id: "social-intelligence/reddit-deep/smallbusiness/1p3ulf5.md#c3"
    char_span: [4394, 5344]
    sentence_count: 8
    key_terms: [get, something, customer, offers, electronic-gur8814, like, love, ones]
    concepts: [something, customer, offers]
    section: Comments
    token_count: 203
---
# I increased our phone repair shop revenue 28% in 90 days with zero ad budget (automated review collection + customer retention) Anyone have tips to beat these numbers?

Source: [reddit-deep: r/smallbusiness](https://www.reddit.com/r/smallbusiness/comments/1p3ulf5/i_increased_our_phone_repair_shop_revenue_28_in/)
Posted by **Electronic-Gur8814** · **4↑** · **14 comments**

I work at a phone repair shop in Atlanta and because I'm not very good at repairs, they asked me to use my technical skills to see if I could get more customers coming in. It was frustrating that I wasn’t given a big budget and I was told no ads. So I took a somewhat long but simple DIY’able approach:

Twilio (SMS automation)
Google Sheets
Airtable
Python
AXL Customer Intelligence (free trial)

When I started:

-Our Google local ranking was #7
88% of customers only came once
-Most our reviews were from our previous owners interactions

So my plan was to raise google reviews to make our store more visible and bring in more customers through targeted outreach.

After about 90 days of experimenting:

-Our Google rating went from: 4.0 → 4.7
—Return customers rose
-Local ranking: #7 → #3
-Organic search views: +127%

What seemed to work was this chain reaction:

reviews → higher ranking → better visibility → more customers
then customer feedback → simple tags → timed offers → repeat business
unhappy customers → private feedback instead of public complaints

I didn’t think of this as a “system” at first, but here’s what I ended up automating:

1. Text message after repair
Sent 2 hours after service with Twilio:

If they rated 4-5 → Google review link

If 1-3 → private feedback form. This got around a 15–20% review rate.

2. Tagging customers (Airtable + Google Sheets)

I used 3 tags:

Happy
Neutral
Unhappy Wasn’t fancy, but it made the next part easy.

3. Automated follow-ups using AXL Customer Intelligence 

Type	Timing	Action
Happy	30 days	Win-back offer
Neutral	7 days	“We can do better” msg
Unhappy	Immediately	Manager call

I'm definitely still learning, but here’s what seems true:

Reviews are step 1 — the real value is in customer sentiment

Timing matters more than wording

Unhappy customers aren’t an issue… unless you ignore them

Unhappy customers can also be turned into repeat customers if you send them the right offer

I put everything into a small blueprint:

Airtable structure
SMS scripts
Customer segmentation logic
Sample offers
Python automation

If you want it, just comment and I’ll share it.

I’d love to trade tips or ideas too, especially if anyone has tried this for other local businesses (gyms, dental offices, barbershops, etc.).

What were your results?

Still very much experimenting… but it kinda feels like something.

## Comments

- **AutoModerator** (1↑): This is a friendly reminder that r/smallbusiness is a question and answer subreddit. You ask a question about starting, owning, and growing a small business and the community answers. Posts that violate the rules listed in the sidebar will be removed. A permanent or temporary ban may also be issued if you do not remove the offending post. Seeing this message does not mean your post was automatically removed. Please also note our new Rule 5- Posts with negative vote totals may be removed if they are deemed non-specific, or if they are repeats of questions designed to gather information rather than solve a small business problem.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/smallbusiness) if you have any questions or concerns.*
- **Specific-Peanut-8867** (2↑): They hired you to work at a phone repair store even though you’re bad at repairs

If they’re paying you a salary to do this, they’d be better off hiring an SEO
  - **Electronic-Gur8814** (3↑): I got layed off from software development due to ai and tariffs. So I started working at a phone repair shop as it was the first job I could find. I got in trouble cause I messed up a repair and so they told me to do some technical work. I’m only getting paid 17 an hour so they won’t find much of an SEO with that budget.
    - **Specific-Peanut-8867** (1↑): You got laid off of software development because of tariffs

If they’re paying you $17 an hour and you can’t fix phones worth a dang… it’s causing them $40,000 a year for you to do SEO stuff

You should start your own store and higher technicians
- **Skull_Tree** (1↑): I've found the biggest impact comes when review collection, customer tagging and follow ups are all connected into a single workflow. Happy customers get timely offers, neutral ones get a chance to give feedback and unhappy ones are addressed quickly. Once the steps are linked using something like Zapier in the middle to automate the handoffs really helps keep everything flowing smoothly. It saves time chasing leads and makes it easier to focus on the customer experience that actually keeps people coming back, while giving room to experiment with timing and offers without getting stuck
- **revoltinglemur** (1↑): I run a repair shop in bc, would absolutely love to get more info on this! This would be really helpful for us. Can you DM me?
  - **Electronic-Gur8814** (1↑): Of course! I would love to help you get setup with something like this. Going to DM you now.
