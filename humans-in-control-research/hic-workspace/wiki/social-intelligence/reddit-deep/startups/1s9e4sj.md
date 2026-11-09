---
id: social-intelligence/reddit-deep/startups/1s9e4sj.md
url: "https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/"
kind: "social-post"
source: "reddit-deep: r/startups"
subreddit: "startups"
title: "I spent ~$45 on Instagram ads to validate my app idea before writing any code. Here's my exact setup, results, and what I'd do differently. i will not promote"
author: "AiotexOfficial"
date: "2026-04-01T07:59:47.000Z"
score: 40
upvote_ratio: 0.76
num_comments: 37
flair: "I will not promote"
extracted_at: "2026-10-09T16:37:34.773Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/startups/1s9e4sj.md#c0"
    char_span: [0, 1890]
    sentence_count: 17
    key_terms: [instagram, style, ads, app, waitlist, intelligence, built, inspo]
    concepts: [instagram, style, waitlist, intelligence, built]
    token_count: 445
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/","kind":"social-post","date":"2026-04-01","author":"AiotexOfficial","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1s9e4sj.md#c1"
    char_span: [1892, 4102]
    sentence_count: 17
    key_terms: [meta, creatives, ads, pixel, used, direction, instagram, audience]
    concepts: [creatives, pixel, direction, instagram, audience]
    token_count: 493
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/","kind":"social-post","date":"2026-04-01","author":"AiotexOfficial","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1s9e4sj.md#c2"
    char_span: [4104, 6191]
    sentence_count: 17
    key_terms: [people, meta, signups, style, "i've", run, confident, something]
    concepts: [people, signups, style, confident, something]
    token_count: 457
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/","kind":"social-post","date":"2026-04-01","author":"AiotexOfficial","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1s9e4sj.md#c3"
    char_span: [6206, 8526]
    sentence_count: 21
    key_terms: [different, style, product, angle, question, signups, misalignment, email]
    concepts: [different, style, product, angle, question]
    section: Comments
    token_count: 512
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/","kind":"social-post","date":"2026-04-01","author":"AiotexOfficial","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1s9e4sj.md#c4"
    char_span: [8528, 10163]
    sentence_count: 7
    key_terms: [validation, aiotexofficial, any-dig-3384, task-bounty, post, aspiration, different, aversion]
    concepts: [validation, aiotexofficial, any-dig-3384, task-bounty, aspiration]
    section: Comments
    token_count: 416
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/","kind":"social-post","date":"2026-04-01","author":"AiotexOfficial","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1s9e4sj.md#c5"
    char_span: [10165, 11848]
    sentence_count: 16
    key_terms: [people, validate, like, product, right, service, build, early]
    concepts: [people, validate, product, right, service]
    section: Comments
    token_count: 381
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/","kind":"social-post","date":"2026-04-01","author":"AiotexOfficial","subreddit":"startups"}]
---
# I spent ~$45 on Instagram ads to validate my app idea before writing any code. Here's my exact setup, results, and what I'd do differently. i will not promote

Source: [reddit-deep: r/startups](https://www.reddit.com/r/startups/comments/1s9e4sj/i_spent_45_on_instagram_ads_to_validate_my_app/)
Posted by **AiotexOfficial** · **40↑** · **37 comments**

TL;DR: Built a waitlist page for a style intelligence app. Spent $45 on Instagram ads across 4 creative angles. Got 12 signups in 5 days. The ad about wasting money on clothes you never wear dominated everything else. Cost per signup \~$3.75. Planning to stop around 15 signups / $100 total spend. Not sure if this is enough signal to build or not, looking for perspective from people who've done this.

I'm a solo indie hacker who's built a couple of products before without generating revenue. This time, I decided to validate demand before building anything. Ran a Meta ads smoke test: waitlist landing page + Instagram ads pointing to it. Here's the full breakdown.

**The idea**

A style intelligence app for women 18-32 who save hundreds of outfit inspo photos on Instagram and Pinterest but still can't describe their own style, and keep buying clothes they never wear. The app would analyze their saved inspo and surface the patterns, recurring colors, silhouettes, items, so they can actually shop with intention instead of impulse.

Competitors exist (Whering, Indyx, Cladwell, Acloset) but they're mostly digital closet organizers. None of them really focus on going from saved inspo to actually understanding your style identity.

**The landing page**

Built on Next.js, deployed on Vercel. I forked lakshaybhushan/nextjs-notion-waitlist-template as a starting point since it already had the waitlist signup flow wired up. Used Notion as the backend for collecting emails, no proper email service, kept it simple on purpose.

For design I used Google Stitch. It gave me a solid visual direction with the warm beige/cream aesthetic that matches what the target audience responds to. Then I used Claude opus 4.6 for the copywriting, market research, competitive analysis, and converting the Stitch design into actual code. The whole landing page took about a weekend.

For Meta Pixel (how Meta gets analytics from your site and optimizes campaigns) on Next.js, I used Vercel's official example, search for next.js with-facebook-pixel example on Vercel's GitHub

**The ad creatives**

This was faster than I expected. I pasted my landing page URL into Claude, it pulled the copy and visual direction from the site, then designed 4 ad creatives as HTML/CSS and exported them directly to 1080x1350 images. I grabbed a couple free Unsplash photos and two photos I already had. About an hour for all 4 ads.

Each tested a different emotional angle:

1. Messy closet photo + "You save hundreds of outfits. You still have nothing to wear"

All 4:5 ratio for Instagram Feed, Stories, and Explore.

**Campaign setup**

* Objective: Leads (optimizing for conversions not traffic)
* Conversion event: Lead fired via Meta Pixel on waitlist signup
* Placements: Instagram only. Feed, Stories, Explore. No Reels since static images get turned into awkward auto-zoom slideshows there
* Audience: Advantage+ broad with just age/gender constraints. Let Meta find the converters instead of trying to outsmart the algorithm with interest stacking

If you're starting from zero with Meta Ads, I found a channel called Andrew Southworth on YouTube that gives a great walkthrough. Search for "How to Promote Your Music on Spotify with Facebook Ads" to find it.

Fair warning, though: the Meta Ads ecosystem is rough and built for professional marketers, not solo devs. Between broken authentication flows, ad rejections for no clear reason, and a Pixel that sometimes just doesn't fire (pro tip: it's probably your ad blocker), expect to burn 2-3 days on setup frustrations even though the actual campaign config takes like 30 minutes.

**Results after \~5 days:**

* Spend: \~$
* Email signups: 
* Cost per signup: \~$4

**What I learned about the creatives**

Ad 3 (the $80 dress one) ate about 85% of the budget and drove most of the signups. Meta shifted spend toward it aggressively within 48 hours. The other three basically got no exposure.

The financial regret angle just worked way better than the abstract stat or the style framing. People respond to the specific feeling of owning something expensive that just sits in the closet. The more abstract stuff about finding your style or 70% of your closet being unworn didn't move people to actually sign up.

This also made me think about whether my ad hook and my actual product are aligned. What gets people to click is about wasted money, but what I'm building is really about style discovery. Not sure if thats a problem or just how funnels work.

**What I'd do differently**

I'd set up better analytics from day one and run the Meta Pixel through a proxy. The pixel didn't capture all leads, Meta reported 7 but I had 11 actual emails at that point. At this budget every missed conversion matters because it throws off your cost per lead numbers and makes it harder to know where you actually stand.

**What I'm still figuring out**

12 signups from 950 people for $45 feels positive but I honestly don't know if its meaningful signal or just noise. Cost per lead seems reasonable compared to what I've read (consumer app waitlists typically run $2-15) but I've never done this before so I don't have great intuition for it yet.

My current plan is to stop at around 15 signups, ideally without spending more than $100 total. From what I've found online thats roughly where you can start feeling somewhat confident about whether there's real interest or not.

Would genuinely love to hear from anyone who's run something similar. What numbers made you feel confident enough to actually start building, and what did it look like when you decided to kill an idea after a test like this.

**Total time investment:** Landing page \~8 hrs, ad creatives \~1 hr, Meta setup and debugging \~2-3 days of pain, campaign monitoring \~5 min/day. Plus \~$45 in ad spend and 20$ on Claude Pro plan.

## Comments

- **Clem_Backtrex** (12↑): The hook/product misalignment you flagged is actually the most important finding here. Your winning ad sells "stop wasting money on clothes," but your product delivers "discover your style identity." Those attract different users with different willingness to pay.

I ran a similar validation for a completely different product and had the same issue. The angle that got signups wasn't the angle that retained users. What helped was emailing the waitlist directly and asking one question: "what's the #1 thing you'd want this to do?" If most answers map to the money-saving angle, you might want to pivot the product toward that instead of forcing the style discovery framing.

On the numbers: 12 signups at $3.75 CPL is decent for consumer, but I'd be more interested in what happens when you email those 12 people a Figma prototype or a Loom walkthrough. Signup intent and "I'd actually use this" intent are very different things. 5 replies out of 12 would be a stronger signal than 50 more signups.
  - **AiotexOfficial** (4↑): I tried to validate the problem through the ads rather than the solution. The wasted money is the pain and discovering your style is my take on solving that. I’m not sure I agree with your take on the misalignment since the leads read the landing page before signing up

That being said, I agree with what you said about contacting them and It’s definitely my next move after i end the campaign

Do you have a template or spacific question that you would ask? Should it be more like an interview? link to form? Regular email?
    - **Clem_Backtrex** (1↑): Fair point on the landing page filtering. If they read the full page and still signed up, they at least accepted the style discovery framing. That's actually a stronger signal than I gave credit for.

For the outreach, keep it dead simple. One personal email, no form, no link. Something like: "Hey, thanks for signing up. Quick question, what's the #1 frustration you have with how you shop for clothes right now?" Just that. Let them reply in their own words. You'll learn more from 5 unstructured answers than from 50 form responses with pre-defined options. If 3 out of 5 say something about wasting money, you know the pain is real. If they talk about style confusion, your current angle is validated.

Interviews are better but harder to get at this stage. Save those for after you have a prototype to show.
- **Any_Barber1453** (3↑): 12 signups at $3.75 tells you the hook works. it doesn't tell you the product works. the real validation is emailing those 12 and asking for $5 early access -- if 2-3 pay, you have signal. if zero reply, you validated the ad copy not the problem.

  
the more interesting data point is which angle won. "wasting money on clothes" is loss aversion. "elevate your style" is aspiration. those build completely different products with different retention. loss aversion users churn the moment they feel they've saved enough. aspiration users stick around because the goal keeps moving.
- **Any-Dig-3384** (2↑): $45 to reach 950 people means your campaign is setup too specific hence high cpm, those results could be better
  - **AiotexOfficial** (2↑): What would be a good cpm in your opinion?
- **perkpilot_hq** (2↑): bro spent same amount of reddit
- **elidanipipe** (2↑): Smart approach to validation. For the next round of research or content tasks around your launch, [task-bounty.com](http://task-bounty.com) could help. Post specific tasks (competitor analysis, ad copy, landing page iterations) and get multiple solutions competing on quality.
- **Any-Dig-3384** (1↑): TLDR goes at the top of the post so people don't have to read the whole long post lol too find the summary which you should place at the top 😂
  - **AiotexOfficial** (1↑): Makes since lol😂
- **fnworksdev** (1↑): Solid validation.

Next step: email those 12 signups and ask one thing: “what purchase did you regret most, and why?”

If several answers repeat the same pain, build a narrow MVP around that pain first.
- **Final-Lie78** (1↑): Do you think it is possible to validate an idea through personal conversation using a framework that removes bias and people falsely validating you product. (The Mom Test) or Is it a numbers game? I feel like depending on you product you could talk to 100 people at the super early stages like you are at; not having a product or mvp yet. Just probe peoples mind, more specifically people who fit you ICP.
- **Both_Brush_7879** (1↑): i’m also new to this, but stopping at 15 signups sounds a bit early.

feels like you already did the hard part, might be worth getting a bit more data before deciding.
- **Due-Tip-4022** (1↑): Dude, you have a business staring you right in the eye.

The number one most important piece of advice every successful tech entrepreneur agrees with, is to validate before you build.

The problem is, most people do it completely wrong. Not saying you did it exactly right, but certainly more right than just about all of Reddit.

If you were to systemic this and sell it as a service. You could sell that service for good money. And If you do it well and keep yourself known for good ethics. You will have more back links than you know what to do with. Just like people tell others about "The Mom Test", or "The Lean Startup" on subs and forums every day. People would be telling people they need to validate properly,  and this website is where you go.

Seriously, if you hone your skill and statewide a process to make it efficient for you. You will be swimming in demand.

Let me know if you ever do this. I have some things id pay to validate.
