---
id: social-intelligence/reddit-deep/banking/1rdwugf.md
url: "https://www.reddit.com/r/Banking/comments/1rdwugf/card_best_practices/"
kind: "social-post"
source: "reddit-deep: r/banking"
subreddit: "banking"
title: "Card Best Practices"
author: "throwawaykfhelp"
date: "2026-02-24T23:41:08.000Z"
score: 4
upvote_ratio: 1
num_comments: 6
flair: "Advice"
extracted_at: "2026-06-26T21:51:56.875Z"
extraction_method: "praw-deep"
research_goal: "Identify and analyze the top five consumer finance trends for 2026 across retail banking, fintech, and consumer lending, delivering a prioritized trend matrix that details key drivers, shifting consumer behaviors, and technological adoption."
engagement: "identify-and-analyze-the-top-five-consumer-finance-trends-fo"
chunks:
  - id: "social-intelligence/reddit-deep/banking/1rdwugf.md#c0"
    char_span: [0, 1194]
    sentence_count: 8
    key_terms: [card, practices, annoying, comments, suddenly, banking, dormant, system]
    concepts: [practices, annoying, comments, suddenly, banking]
    token_count: 276
    sources: [{"n":"reddit-deep: r/banking","u":"https://www.reddit.com/r/Banking/comments/1rdwugf/card_best_practices/"}]
  - id: "social-intelligence/reddit-deep/banking/1rdwugf.md#c1"
    char_span: [1208, 2539]
    sentence_count: 8
    key_terms: ["it's", function, throwawaykfhelp, party, busywork, consider, however, service]
    concepts: [throwawaykfhelp, function, party, busywork, consider]
    section: Comments
    token_count: 320
---
# Card Best Practices

Source: [reddit-deep: r/banking](https://www.reddit.com/r/Banking/comments/1rdwugf/card_best_practices/)
Posted by **throwawaykfhelp** · **4↑** · **6 comments**

Curious if anyone has a vibe on this. Our QA side of things just got staffed up and is suddenly worrying about a bunch of stuff nobody has cared about for years. Some of that is good and to be expected, but I think we're seeing some overcorrection and want to see if I'm  off-base and being obstinate or if this feels weird to others.

  
We, like many banks, have a third party debit card fraud monitoring service with dedicated 24/7 call center. They restrict cards in the card processing program but don't have access to our core. The QA team suddenly is emailing us asking us to go and Dormant cards in the core system that were restricted in the card system the previous night. This is A) annoying for us, it's busywork, and B) annoying for customers as the card being marked Dormant disconnects it from their mobile wallet and disables their in-app card controls.



I shared this feedback and was basically told "things change, deal with it." Am I behind the times on best practices, or is this weird?​

## Comments

- **brizia** (1↑): Often things you consider busywork actually serves a function. They want it marked in your system also, and not just by the 3rd party service.
  - **throwawaykfhelp** (1↑): > Often things you consider busywork actually serves a function


Right, thus why I asked about it. 


> They want it marked in your system also, and not just by the 3rd party service.


What function does this serve?
    - **brizia** (1↑): I don’t know. Clearly your board of directors and executive management thought it was important.
- **hopbow** (1↑): I work as an SME in this field and I can't think of a single way this makes sense. The biggest possibility would be for them to try and Trigger users to call in to clear fraud on their account if the cards are somehow being used in a different way


However I would be more concerned that it's not following dormancy procedures and that it's a potential issue with customer goodwill


Is this the QA team for the 3rd party provider? If so, I would definitely flag this and escalate it
  - **throwawaykfhelp** (1↑): Ok, thank you! No, this is internal.
    - **hopbow** (2↑): Yeah I'm not sure, but it's one of those things that I would raise a concern about but ultimately it's not my responsibility or fight.


However this does not align with anything I've seen or heard of before
