---
id: social-intelligence/reddit-deep/bogleheads/1qfjo5d.md
url: "https://www.reddit.com/r/Bogleheads/comments/1qfjo5d/still_annoyed_that_vanguard_stopped_calculating/"
kind: "social-post"
source: "reddit-deep: r/bogleheads"
subreddit: "bogleheads"
title: "Still annoyed that Vanguard stopped calculating performance."
author: "froggrbloggr"
date: "2026-01-17T17:45:11.000Z"
score: 11
upvote_ratio: 0.87
num_comments: 8
flair: ""
extracted_at: "2026-06-11T15:26:21.368Z"
extraction_method: "praw-deep"
research_goal: "Produce the definitive guide to personal investing in 2026 by analyzing the current state of the fintech and financial industries. Evaluate retail investor behaviors, emerging asset classes, and platform shifts using 2026 market news, industry reports, and social media trends to identify actionable investment strategies and market opportunities."
engagement: "produce-the-definitive-guide-to-personal-investing-in-2026-b"
chunks:
  - id: "social-intelligence/reddit-deep/bogleheads/1qfjo5d.md#c0"
    char_span: [0, 839]
    sentence_count: 8
    key_terms: [performance, bogleheads, calculate, comments, vanguard, weighted, getting, dollar]
    concepts: [performance, bogleheads, calculate, comments, vanguard]
    related_chunks: ["social-intelligence/reddit-deep/bogleheads/1qfjo5d.md#c1"]
    token_count: 178
    sources: [{"n":"reddit-deep: r/bogleheads","u":"https://www.reddit.com/r/Bogleheads/comments/1qfjo5d/still_annoyed_that_vanguard_stopped_calculating/"}]
  - id: "social-intelligence/reddit-deep/bogleheads/1qfjo5d.md#c1"
    char_span: [853, 2904]
    sentence_count: 12
    key_terms: [performance, margin, vanguard, accounts, account, irr, personal, dollar-weighted]
    concepts: [performance, margin, vanguard, accounts, account]
    related_chunks: ["social-intelligence/reddit-deep/bogleheads/1qfjo5d.md#c0"]
    section: Comments
    token_count: 487
---
# Still annoyed that Vanguard stopped calculating performance.

Source: [reddit-deep: r/bogleheads](https://www.reddit.com/r/Bogleheads/comments/1qfjo5d/still_annoyed_that_vanguard_stopped_calculating/)
Posted by **froggrbloggr** · **11↑** · **8 comments**

Vanguard used to calculate dollar weighted performance for my investment account. Now they just calculate it for my IRA. It's such a simple thing they could do for all accounts.

They also used to have a nice Monte Carlo simulator. Their website utility has really declined while others like Fidelity's keep getting better.

It seems they are putting all their efforts into advisor services which is not in keeping with their history or of benefit to all investors owners.

Anyway, what's the simplest way to calculated dollar weighted performance without getting too in the weeds?

## Comments

- **roshbaby** (10↑): Under the Performance tab, I still see Vanguard showing the IRR for my taxable brokerage account. Using the filters I can also add/remove my IRA accounts. FWIW, I don't have any advisor service from Vanguard. Not even the robo-advisor.

I also doublechecked the footnote to confirm that their definition for the performance is basically the dollar-weighted IRR: "Personal performance uses a dollar-weighted return formula called internal rate of return (IRR) to calculate your personal rate of return."
  - **froggrbloggr** (2↑): I can only select for the IRAs. Perhaps it's because I have margin on my taxable brokerage account. (I only use the margin to make sure I don't get messed up for not settling a purchase on time.)

Vanguard says  
"Personal performance does not include assets from margin accounts, trust services accounts, holdings purchased through companies other than Vanguard (outside investments), or assets from defined benefit plans."

Meanwhile, my Fidelity margin account provides both time and money weighted returns for all my holdings. Still debating moving everything to Fidelity.

I just spent I don't want to know how much time trying to use the XIRR function without any meaningful results. The frustration is real.
    - **Animgif** (2↑): Yes, if you have margin on your account it's VERY broken.  It has been for a while.  See [https://www.reddit.com/r/Bogleheads/comments/1fi7ytb/vanguard\_web\_site\_is\_partially\_down/](https://www.reddit.com/r/Bogleheads/comments/1fi7ytb/vanguard_web_site_is_partially_down/)
- **zacce** (3↑): > Anyway, what's the simplest way to calculated dollar weighted performance without getting too in the weeds?  

spreadsheet, =IRR() or =XIRR()  

google will result in many examples.
  - **froggrbloggr** (0↑): Thank you
- **[deleted]** (1↑): I agree, this has been very frustrating and perplexing. The Performance tab stopped working for margin accounts over a year ago.
  - **hobokes** (1↑): its fixed !!!!!   was about 18 months lol
- **hobokes** (1↑): its back!
