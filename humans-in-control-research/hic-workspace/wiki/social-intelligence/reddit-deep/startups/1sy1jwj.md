---
id: social-intelligence/reddit-deep/startups/1sy1jwj.md
url: "https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/"
kind: "social-post"
source: "reddit-deep: r/startups"
subreddit: "startups"
title: "We gave $1 to every new user of our AI platform: 71% of video generations were flagged as porn (I will not promote)"
author: "t1llmann"
date: "2026-04-28T13:31:35.000Z"
score: 0
upvote_ratio: 0.44
num_comments: 38
flair: "I will not promote"
extracted_at: "2026-10-09T16:37:34.774Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c0"
    char_span: [0, 2253]
    sentence_count: 14
    key_terms: [video, free, new, flagged, generations, gave, user, platform]
    concepts: [video, generations, flagged, platform, pornographic]
    token_count: 500
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c1"
    char_span: [2255, 4627]
    sentence_count: 28
    key_terms: [moderation, provider, generation, providers, rejected, system, image, video]
    concepts: [moderation, provider, generation, providers, rejected]
    token_count: 493
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c2"
    char_span: [4629, 6542]
    sentence_count: 23
    key_terms: [dollar, credit, single, accounts, didn, account, through, moderation]
    concepts: [dollar, credit, single, accounts, account]
    token_count: 480
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c3"
    char_span: [6544, 8617]
    sentence_count: 22
    key_terms: [gmail, com, accounts, email, atomicmail, disposable, inbox, domains]
    concepts: [gmail, accounts, email, atomicmail, disposable]
    token_count: 502
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c4"
    char_span: [8619, 10307]
    sentence_count: 13
    key_terms: [layer, addresses, detection, welcome, credit, check, email, fingerprint]
    concepts: [layer, addresses, detection, welcome, credit]
    token_count: 361
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c5"
    char_span: [10322, 11847]
    sentence_count: 9
    key_terms: [minute-drawer-9006, t1llmann, product, market, accidentally, stonecypher, fit, read]
    concepts: [minute-drawer-9006, t1llmann, product, accidentally, market]
    section: Comments
    token_count: 413
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
  - id: "social-intelligence/reddit-deep/startups/1sy1jwj.md#c6"
    char_span: [11849, 13748]
    sentence_count: 13
    key_terms: ["they're", stonecypher, difficultybudget2986, t1llmann, like, probably, account, because]
    concepts: [difficultybudget2986, stonecypher, "they're", t1llmann, probably]
    section: Comments
    token_count: 483
    sources: [{"n":"reddit-deep: r/startups","u":"https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/","kind":"social-post","date":"2026-04-28","author":"t1llmann","subreddit":"startups"}]
---
# We gave $1 to every new user of our AI platform: 71% of video generations were flagged as porn (I will not promote)

Source: [reddit-deep: r/startups](https://www.reddit.com/r/startups/comments/1sy1jwj/we_gave_1_to_every_new_user_of_our_ai_platform_71/)
Posted by **t1llmann** · **0↑** · **38 comments**

*71% of the AI video generations on our platform were flagged as pornographic. This is the story of what happened when we gave every new user a free dollar.*

**TL;DR:**

* Launched an AI image/video gateway and gave every new signup $1 in free credit.
* 71% of all video generations were getting flagged as pornographic.
* $1 turned out to be exactly the right amount for a certain kind of user to stress-test whether a new AI platform has NSFW guardrails.
* Most of them signed up with throwaway emails, burned the credit, and moved on to the next free tier.
* Our automatic provider failover made it worse: when one provider blocked a prompt, we'd retry on another, effectively shopping the request until something generated.
* We tightened the filters, killed the failover for flagged content, and added pre-generation moderation.
* Kept the free dollar. Just watching more carefully now. 

\--

We launched in January 2026 with a simple offering: an API gateway that offers one unified API for hundreds of image and video models (Flux, Grok Imagine, Seedream, Nano Banana 2, the usual suspects). The users we expected were developers comparing outputs without juggling five SDKs. To drive early adoption, we did what the playbook says: remove friction. Give people a reason to try the thing.

So we gave every new user a free dollar.

# The honeymoon

The first weeks were encouraging. Signups trickled in, then picked up to double-digit daily numbers by early February. People were generating images, exploring models, comparing outputs. We could see them bouncing between Flux Schnell and Grok Imagine, testing prompts, getting a feel for the routing. Exactly the developer behavior we’d hoped for.

Our request volume was climbing steadily. Things were working.

Then the free-credit numbers started telling a different story…

# This is not developers

Let me put this delicately: the welcome grant wasn’t funding productivity workflows.

For the first two months, our own moderation was, to put it kindly, naive. Luckily, our upstream providers had slightly more robust systems in place, and plenty of what slipped past ours ran straight into theirs.

The providers *were* catching things. About 9% of all upstream routing attempts were rejected by their safety systems. But the numbers varied wildly. One provider’s safety filter rejected a third of all attempts routed through it. Another blocked 12%. A third waved almost everything through.

And here’s the kicker: our routing engine has automatic failover. When Provider A rejects a request, the system tries Provider B, then C. It’s a feature we’re proud of. Resilience, redundancy, the whole pitch. But it also meant that a prompt rejected by three providers might still succeed on the fourth. The system would dutifully bounce a request from OpenAI (“*Your request was rejected by the safety system*”) to Replicate (“*The input or output was flagged as sensitive*”) and finally land on a provider that generated the image without complaint.

Nearly 5% of all successfully completed requests had been explicitly safety-blocked by at least one provider before succeeding elsewhere. Our resilience system, designed to protect users from downtime, was working overtime as an NSFW content delivery pipeline.

My personal favorite error message came from Vertex, Google’s enterprise AI endpoint, which apparently shares Gemini’s identity crisis: “Image generation failed: I’m just a language model and can’t help with that.” You’re not wrong, Vertex. You really can’t.

# When the new filter landed

On March 16 we reworked our moderation setup, piping every input prompt through OpenAI’s moderation API before forwarding it to providers.

The numbers landed immediately.

**One in four requests was blocked. 25%.** Every single one for the same category: `sexual`. Not violence. Not hate speech. Not self-harm. Just `sexual`.

Unsurprisingly, image editing was a worse offender than image generation. Users would upload real photos and ask models to, shall we say, adjust the wardrobe. The editing endpoint’s moderation block rate ran more than 4x higher than generation.

And video? **71% of video generation requests were blocked by moderation.** Seven out of ten. The video endpoint was essentially an NSFW video factory with a thin veneer of legitimacy.

We looked at ourselves in the mirror. We’d built a media generation platform for developers. We’d attracted… well, not developers.

# The $1 credit problem

Here’s the thing about giving away a dollar: it’s enough.

A single image generation on Flux Schnell costs about $0.003. On Grok Imagine, maybe $0.02. A dollar gets you somewhere between 50 and 300 images depending on the model. That’s a lot of, uh, *output* for someone with a specific goal in mind.

And users were efficient about it. Many burned through their entire dollar in a single session, some within hours of signing up. The typical pattern: generate as fast as possible, hit moderation blocks on some prompts, keep going on the rest until the balance hits zero. One user managed to spend exactly $0.99 across 144 requests in a single day, half of which were blocked by moderation. They didn’t waste a cent.

# But they didn’t stop at one dollar

Here’s what we didn’t anticipate: they didn’t stop when the credit ran out.

A dollar gone? Make a new account. New email, new dollar, same prompts. Credit burned through again? Another account. Some users did this three, four, five times. And the more determined ones didn’t stop in single digits.

Meet the **nokialumia\* syndicate**, our most prolific multi-account operator. Over five days in early April, a single person (or possibly a small group) created **21 accounts**:

* April 1: Seven Gmail accounts. `nokialumia13095`, `nokialumia23095`, through `nokialumia73095`.
* April 3: Ten accounts on atomicmail.io. `nokialumia` through `nokialumia9`.
* April 4-5: More atomicmail.io variants, plus Gmail dot-trick attempts

The pattern: create account, get $1, generate images until the credit runs out at \~$0.99-$1.01, move on to the next account. Across all 21 accounts: over 1,200 requests, roughly a quarter blocked by moderation. Twenty-one dollars of free credit, methodically extracted.

When we caught the Gmail accounts, they pivoted to atomicmail.io. When we blocked that domain, they came back with dot-trick Gmail variants: `nokialumia1.309.5@gmail.com`, `nokialumia1309.5@gmail.com`. Same inbox, different account. Gmail silently ignores dots in the local part, so `john.doe` and `j.o.h.n.d.o.e` both land in the same inbox.

They weren’t the only ones. Another user created four accounts using nothing but dot rearrangements of the same Gmail address. Same inbox. Four free dollars.

And the nokialumia\* operator wasn’t even alone in the April wave. The same burst brought accounts with handles like `narutouzumaki`\*, `bontekintol`\*, and `kikubotoya`\*, all on atomicmail.io, all in the same 48-hour window. A small community had clearly discovered us.

That’s the kind of product-market fit you don’t want.

# The email domain zoo

Trying to catch multi-accounters teaches you a lot about the email ecosystem. It’s fascinating how much infrastructure exists for creating disposable identities.

We saw hundreds of unique email domains across our signups. Here are some highlights from the long tail:

* **atomicmail.io** and **inbox.eu**: disposable email services. Our biggest sources of fake signups. Tied for the lead.
* **kpl.ovh**: a French hosting domain repurposed as disposable email.
* **denipl.com / denipl.net**: same operator, two domains, more than a dozen combined accounts.
* **fxzig.com**, **sweatpopi.com**, **sharebot.net**, **nexafilm.com**, **marvetos.com**: domains that exist for one purpose, and it isn’t legitimate communication.

Over three-quarters of all accounts used Gmail. Which sounds normal until you realize it’s partly *because Gmail is the easiest to abuse*. Dots are ignored, plus-addressing (`+tag`) creates unlimited aliases, and a single Google account can generate dozens of variations that all look like different addresses to our system.

# Fighting back

So what do you do when your growth hack becomes someone else’s exploit? You build layers. Each one a response to a specific trick we’d seen in the wild:

**Layer 1: Content moderation.** OpenAI’s moderation API on every input prompt. Blocked requests are rejected before they ever touch a provider. This was about more than our users. To our upstream providers, all this traffic came from *our* API keys. We were starting to look like some unhinged entity generating wall-to-wall NSFW content across every model available.

**Layer 2: Disposable email detection.** We integrated with Emailable’s API to flag temporary and disposable email addresses at signup. This caught the obvious ones: atomicmail.io, inbox.eu, and the like.

**Layer 3: Gmail alias normalization.** We strip dots and plus-tags from Gmail addresses, and equivalent tricks from Outlook, Proton, and Fastmail. Then we check if the canonical inbox already received a welcome credit.

**Layer 4: Device fingerprinting.** Using FingerprintJS, we capture a browser fingerprint at signup. If the same fingerprint shows up on a new account, no free dollar. This survives incognito mode and cookie clearing.

**Layer 5: Spam heuristics.** Keyboard-mash name detection (patterns like “ergreger” or names with suspiciously low character diversity), suspicious MX record lookups, low-score email addresses from our verification provider, and an admin-maintained blocklist of domains.

This five-layer check runs asynchronously after every account creation. If any check fails, the welcome credit is withheld and our team gets a push notification.

The result: in recent weeks, **one in six signups** gets their welcome credit blocked. The fraud detection catches them before they can spend a single cent.

# What we learned

If you offer free AI image generation, NSFW users will find

## Comments

- **Just_Look_Around_You** (20↑): This is so much writing dude. And obviously it’s AI so even you didn’t write it. Please be more brief
  - **t1llmann** (-10↑): Point taken, I'll try to be briefer in the future. There's just a few interesting parts in that story which made it difficult for me to keep it shorter
    - **StoneCypher** (9↑): it doesn't matter, it's still this giant book of nothing

don't bother with "in the future," you're just going to try to hold another lecture
- **Minute-Drawer-9006** (9↑): Maybe you accidentally stumbled into product market fit. Society might find it icky, but gooning does have a wide audience. Perhaps you should embrace it?
  - **t1llmann** (3↑): Yes, that thought also crossed my mind recently. It feels like an uncomfortable niche, but people want what people want...   
Although, paying NSFW users is yet another thing; but they like the free dollar and it would be very easy to find more users of that category
    - **EVERYTHINGGOESINCAPS** (2↑): From what I've read on this sub, you can make money with it but at the mercy of payment processors/banks with this kind of stuff
  - **StoneCypher** (3↑): > Maybe you accidentally stumbled into product market fit. 

uh, nope
    - **Minute-Drawer-9006** (2↑): Hey, product market fit fullfills the seven deadly sins.
- **edkang99** (5↑): I didn’t read the whole post (how about a TLDR?). But from what I read all I thought was “why am I not surprised?”
  - **t1llmann** (1↑): Good idea with the TLDR, I'll add that in a minute. 

I was aware of the human nature in that area but I was still surprised given the fact that we did try to attract devs and not just media generation users; yet they still found us
    - **StoneCypher** (1↑): yeah, that's probably because one single dev somewhere went "oh god, they're falling for it, i better tell everybody on discord"
- **ProfileBest2034** (3↑): I mean 70% of the internet is porn so it’s not surprising.
  - **t1llmann** (1↑): Yeah, you right. I did not look at it from that perspective
- **StoneCypher** (3↑): the story of a wrapper company that genuinely believes they made something, but didn't
  - **t1llmann** (-1↑): you must really hate this, don't you? This is your 3rd (or fourth?) comment where you say absolutely nothing but just hate. I'm sad for you
    - **StoneCypher** (0↑): it's funny because you're actively thanking me in private message, but saying you feel sad for me in public
- **EVERYTHINGGOESINCAPS** (2↑): Helpful post, my saas blocks business addresses and uses a blacklist of free account domwins (like Gmail etc.) and then neverbounce for temp account detection.

Then for same domain signups there's a ladder of reducing free credits that hits 0 after 5 of them.

Interesting approach with the key mashing stuff though.
- **QoTSankgreall** (2↑): Feels like you could have presented this in a few sentences. But thanks for the AI slop!
- **DifficultyBudget2986** (2↑): That was actually the same user over and over again. They're running telegram, and OF scams. Congrats for paying for it.
  - **t1llmann** (1↑): Well, it's not like we intentionally paid for it. They are really agile and use various tricks to get around boundaries
    - **DifficultyBudget2986** (1↑): I mean you're probably going to want to check. I work in the same space. They operate as very organized groups. They're aware of this stuff hence why they're able to move so quickly.
