---
id: social-intelligence/reddit-deep/investing/1s2nd7w.md
url: "https://www.reddit.com/r/investing/comments/1s2nd7w/i_built_a_9agent_ai_investment_committee_the/"
kind: "social-post"
source: "reddit-deep: r/investing"
subreddit: "investing"
title: "I built a 9-agent AI investment committee, the debate every stock sequentially - each analyst reads all previous report before writing their own"
author: "marwkaw"
date: "2026-03-24T19:13:57.000Z"
score: 0
upvote_ratio: 0.44
num_comments: 34
flair: ""
extracted_at: "2026-05-17T01:13:31.191Z"
extraction_method: "praw-deep"
research_goal: "Analyze Gen Z's emerging attitudes, behaviors, trends, and frustrations specifically concerning investing, saving, spending, and the integration of AI into personal financial management."
industries: [financial_services, ai_research]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/investing/1s2nd7w.md#c0"
    char_span: [0, 1818]
    sentence_count: 7
    key_terms: [committee, previous, analyst, agents, report, reads, adversarial, investment]
    token_count: 455
  - id: "social-intelligence/reddit-deep/investing/1s2nd7w.md#c1"
    char_span: [1820, 2141]
    sentence_count: 2
    key_terms: [search, tool, web, "anthropic's", anthropic, advocate, analysis, anything]
    token_count: 86
  - id: "social-intelligence/reddit-deep/investing/1s2nd7w.md#c2"
    char_span: [2156, 3524]
    sentence_count: 7
    key_terms: ["you're", anthropic, data, marwkaw, device, money, neophyte12, account]
    section: Comments
    token_count: 386
  - id: "social-intelligence/reddit-deep/investing/1s2nd7w.md#c3"
    char_span: [3526, 5311]
    sentence_count: 17
    key_terms: [marwkaw, https, imgur, com, single, agent, analysis, helps]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/investing/1s2nd7w.md#c4"
    char_span: [5077, 6068]
    sentence_count: 10
    key_terms: [because, picking, get, "i'm", like, backtesting, fundamental, integrated]
    section: Comments
    token_count: 260
---
# I built a 9-agent AI investment committee, the debate every stock sequentially - each analyst reads all previous report before writing their own

Source: [reddit-deep: r/investing](https://www.reddit.com/r/investing/comments/1s2nd7w/i_built_a_9agent_ai_investment_committee_the/)
Posted by **marwkaw** · **0↑** · **34 comments**

For the past few weeks I've been building an AI-powered investment research tool. Here's how it works and what I learned.

**The problem I wanted to solve**

Asking a single AI "should I buy XYZ?" gives you a vague, overly optimistic answer. There's no adversarial pressure, no one challenging the bull case.

**What I built?**

A sequential committee of 9 specialized AI analysts. Each one reads every previous report before writing their own - so later agents can challenge earlier ones. 

The pipeline:

1. **Data Scout** \- live web search for current price, EPS vs consensus, analyst targets, breaking news
2. **Macro Strategist** \- Fed policy, business cycle, sector vs index
3. **Data Hunter** \- P/E, EV/EBITDA, FCF yield, ROIC, insider ownership
4. **Sentiment Analyst** \- short interest, 13F changes, insider transactions
5. **The Bear** \- hardwired to find reasons NOT to buy
6. **The Chartist** \- MA20/50/200, RSI, MFI, Fibonacci levels, entry point
7. **Devil's Advocate** \- attacks blind spots in every previous report
8. **The CIO** \- reads all 7 analysts, delivers verdict + 1–10 scorecard across 5 dimensions
9. **Portfolio Manager** \- position sizing, DCA tranches with specific prices, stop loss, two targets

**What surprised me**

The Bear and Devi's Advocate improve output quality. Without adversarial agents, the committee was too bullish. Forcing two agents to attack the thesis surface risks I wouldn't have thought to ask about. 

**Technical aspects**

* single HTML file, runs in the browser
* Anthropic API (Haiku for 7 agents, Sonnet fora CIO and Devil's Advocate)
* Live web search via Anthropic's web search tool
* Privacy - no sever, no data leaves your device
* \~$ 0.10 per full analysis 

**Is it worth building a tool like this? Do you guys use anything similar?**

## Comments

- **subfloorthrowaway** (30↑): You're competing with some of the most sophisticated algorithms in the world running on unimaginable amounts of compute with incredibly low latency.

Buy an index fund.
  - **marwkaw** (5↑): I bought etf😊 But I like stock picking😁
- **BillyBobChorton** (10↑): But do they make money on the trades?
  - **Dstein99** (11↑): Make money?
    - **WiseAct446** (3↑): Tell me more about this "making" money concept of yours.  I'm intrigued.
  - **justin107d** (3↑): Paying an extra $0.10 for stocks they would have bought anyways.
  - **marwkaw** (-2↑): Long term 😉
- **Neophyte12** (5↑): > Privacy - no sever, no data leaves your device


Well, except all of the data leaves your device and goes to anthropic
  - **marwkaw** (1↑): This is just one html file. no account needed. Just type in the ticker. [https://imgur.com/a/2soYJEU](https://imgur.com/a/2soYJEU)
    - **Neophyte12** (1↑): You're not running an llm in one html file. If you're hitting the anthropic API, then you're using *someone's* account, and that data is going to anthropic, which is fine, but the data ain't staying on your device
- **seeyam14** (10↑): You should do some research around multi-agent vs single agent effectiveness. Thinking agents are smart enough to run the pipeline you state in a single prompt. With way less tokens and loss of context between agents. 

You’ve essentially built a wasteful game of telephone
  - **Any_Jicama5208** (2↑): Exactly
    - **marwkaw** (1↑): I don't think so. I was trying to do it. There is one option to get good analysis by a single AI agent - create file skill.md. It helps because you can define your indicators. But there is lack of the bear voice and devil's advocate. If you want, we can compare the answers from a single agent and my 9 agents. In my terminal it looks like that - https://imgur.com/a/2soYJEU.
  - **marwkaw** (1↑): I don't think so. I was trying to do it. There is one option to get good analysis by a single AI agent - create file skill.md. It helps because you can define your indicators. But there is lack of the bear voice and devil's advocate. If you want, we can compare the answers from a single agent and my 9 agents. In my terminal it looks like that - [https://imgur.com/a/2soYJEU ](https://imgur.com/a/2soYJEU)
    - **seeyam14** (1↑): Just means you need a better prompt
- **its-not-that-bad** (2↑): $.10 per full analysis and -$12,384 per trade made w/ data.
  - **marwkaw** (1↑): It depends on your exit point.
- **octelium** (1↑): This sounds interesting. I wouldn't mind some additional details.....
  - **marwkaw** (1↑): Here you go, a picture paints a thousand words - [https://imgur.com/a/2soYJEU](https://imgur.com/a/2soYJEU)
- **Koraboros** (1↑): There is no reasoning for the score so how trustworthy can it be? AIs are notoriously bad at math.
- **___this_guy** (1↑): My logic: if it actually creates an edge you would either sell it, start a successful hedge and/or get rich. Since you’re offering it here for a dime I have to assume it doesn’t.
  - **marwkaw** (1↑): From my point of view and my fundamental anlasysis, yes, it creates an edge. It helps me a lot, but it's no the magic wand. In my process of stock picking this is only the first step. I think that AI and others smart solutions shouldn't replace critical thinking/brains.
    - **___this_guy** (1↑): This actually sounds like  AI
- **nadavbru** (1↑): Did you run some sort of backtesting on this? Do you have any measure of success rate? I'm asking because I'm working on a similar project just for picking ETFs, and I ran into the testing issue.
- **Academic_Buy5099** (1↑): Very cool, I would love something like this because I just don't have the time to do all the research. I just want to get there 80% of the way, I can do the last 20%. How many scrapes, APIs, and other sources have you integrated in this? That seems to be the hardwork imo, not?
