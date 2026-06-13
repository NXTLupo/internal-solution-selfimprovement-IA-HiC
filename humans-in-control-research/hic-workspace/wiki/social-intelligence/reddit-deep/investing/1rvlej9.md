---
id: social-intelligence/reddit-deep/investing/1rvlej9.md
url: "https://www.reddit.com/r/investing/comments/1rvlej9/do_any_of_you_use_ai_to_analyze_your_investment/"
kind: "social-post"
source: "reddit-deep: r/investing"
subreddit: "investing"
title: "Do any of you use AI to analyze your investment portfolio?"
author: "halilural"
date: "2026-03-16T20:35:35.000Z"
score: 0
upvote_ratio: 0.26
num_comments: 41
flair: ""
extracted_at: "2026-05-17T01:13:31.191Z"
extraction_method: "praw-deep"
research_goal: "Analyze Gen Z's emerging attitudes, behaviors, trends, and frustrations specifically concerning investing, saving, spending, and the integration of AI into personal financial management."
industries: [financial_services, ai_research]
industry_method: llm
chunks:
  - id: "social-intelligence/reddit-deep/investing/1rvlej9.md#c0"
    char_span: [0, 718]
    sentence_count: 6
    key_terms: [analyze, investment, investing, portfolio, comments, anyone, people, tools]
    token_count: 165
  - id: "social-intelligence/reddit-deep/investing/1rvlej9.md#c1"
    char_span: [732, 1801]
    sentence_count: 4
    key_terms: [financial-swim-5884, halilural, look, foliofox, analyze, returns, "don't", fair]
    section: Comments
    token_count: 312
  - id: "social-intelligence/reddit-deep/investing/1rvlej9.md#c2"
    char_span: [1803, 3792]
    sentence_count: 13
    key_terms: [halilural, ok-introduction-1940, use, like, nvda, chatgpt, started, making]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/investing/1rvlej9.md#c3"
    char_span: [3542, 3950]
    sentence_count: 3
    key_terms: [engines, calculations, hallucinate, portfolios, volatility, danielraz, language, struggle]
    section: Comments
    token_count: 94
  - id: "social-intelligence/reddit-deep/investing/1rvlej9.md#c4"
    char_span: [3952, 5946]
    sentence_count: 18
    key_terms: [different, use, answers, chatgpt, complex, machine, claude, gemini]
    section: Comments
    token_count: 418
---
# Do any of you use AI to analyze your investment portfolio?

Source: [reddit-deep: r/investing](https://www.reddit.com/r/investing/comments/1rvlej9/do_any_of_you_use_ai_to_analyze_your_investment/)
Posted by **halilural** · **0↑** · **41 comments**

I’ve been thinking about how people actually analyze their investment portfolios.

Most people I know just check returns or maybe look at allocation, but I’m curious if anyone goes deeper than that.

Do you use any tools to analyze things like risk, diversification, sector exposure, or historical decisions?

Also wondering if anyone is using AI tools (ChatGPT, etc.) to get insights about their portfolio.

Or do you mostly rely on spreadsheets / broker dashboards?

## Comments

- **5HITCOMBO** (30↑): Bro I don't even use regular intelligence to analyze my portfolio
  - **halilural** (1↑): 😂 fair enough. So what do you actually look at then just returns and call it a day?
    - **5HITCOMBO** (1↑): I don't even look at returns, I just blast money in every month
- **leaning_on_a_wheel** (5↑): fuck no
  - **halilural** (1↑): Why not?
    - **leaning_on_a_wheel** (1↑): Sorry but I’m not going to take the time to explain the evils and inaccuracies of AI to you. Maybe ask grok
- **Financial-Swim-5884** (10↑): I don’t need AI to analyze “VT and hold.”
  - **halilural** (1↑): 😄 fair, hard to beat VT and chill.

Out of curiosity though — do you ever look into things like allocation, risk, or scenarios at all, or is it more of a buy & forget approach?
    - **Financial-Swim-5884** (1↑): Looking into things like that is what led me to a passive index strategy.
- **Unav4ila8le** (3↑): I built [Foliofox](https://www.foliofox.com) cause I was always importing my spreadsheet in Claude and ChatGPT for second opinions, planning and simulations.

So that’s how I use AI, not much to analyze, but more for planning as well.
  - **halilural** (1↑): Is it successfull?
    - **Unav4ila8le** (1↑): Define successful? It’s not a VC backed company, didn’t scale to millions of user yet, but there is a small community around it and active contributors
- **burner46** (2↑): No
  - **halilural** (0↑): Why not?
- **Ok-Introduction-1940** (2↑): Every day since 2021.
  - **halilural** (1↑): How do you do it bro? Would you like to share your experiences?
    - **Ok-Introduction-1940** (1↑): I used my own experience to buy the AI hardware stack after I realized machine learning and AI was about to become a huge computing revolution back in 2021. I waited for the 2022 pullback and then bought NVDA, AMD, TsMC, MU with leverage January 2023. When OpenAI released ChatGPT I started using it. It sucked compared to what it is today, but it had amazing promise. It started to improve rapidly about 2 years ago, I got a paid subscription, and now I use it every day as my analyst to go through my reasoning on positions, position sizing, and rebalancing. For example, last year analyzing past semiconductor cycles we were able to anticipate the transition in leadership from NVDA to MU (Micron Technologies) before it took place (happening right now). I was able to rebalance trimming some NVDA at the peak in September 2025 (that was my own intuition) and buy a ton of MU. Now that move is paying off in spades. Use AI everyday to help your decision making process.
- **Bluebird-9641** (2↑): I have bounced ideas off of llms. It was actually more useful for psychological situations like selling a loser or avoiding a stock that has a lot of hype but bad fundamentals.
  - **halilural** (1↑): Has it ever actually stopped you from making a bad move, or is it more like “yeah I knew this already”?
- **danielraz** (2↑): The problem with most people trying to use 'AI' for their portfolios is that they are using ChatGPT. LLMs are language engines, not math engines. They hallucinate numbers, struggle with complex volatility calculations, and mostly just spit out generic 'make sure you buy bonds' advice.

I went down this rabbit hole last year. I realized if I wanted actual portfolio analysis, I had to stop using chatbots and build an actual Machine Learning model.

I put together a Python script using an LSTM that ingests my holdings alongside 40+ market indicators. I don't use it as a crystal ball to predict the future. I use it as an X-ray machine for my current risk.

For example, human brains are bad at seeing complex correlations. You might own 15 different stocks across 'different' sectors and think you are perfectly diversified. But when you feed it into a proper ML model, the math will flag that 80% of your portfolio's movement is actually just one massive, heavily correlated bet on semiconductor supply chains or interest rates.

Don't ask chatbots for investment advice. But absolutely use quantitative machine learning to uncover the hidden risks and overlapping correlations in your diversification.
- **Winter_Ad8995** (2↑): When I first started investing I used AI to help me diversify it but I noticed several huge mistakes. I’m so glad I stopped using it when I did
- **Chicken_Savings** (2↑): I have worked on local contracts in 9 different countries, have hugely complex tax and pension situation. On top of that, child maintenance in another country than where I currently reside.

I find especially Claude to give complex and useful advice. Sometimes I feed the same information and question into Gemini, ChatGPT and Claude and get some variety in the answer. I then copy the answers from Gemini and ChatGPT and paste into Claud with request "review this opinion (below) and update your answer".

I have received very good answers, that KPMG Tax would struggle to beat.

I also use Claude to debate investment concepts, and ChatGPT & Gemini to run monte carlo on various portfolios.

You need to take ANYONE'S answers with a grain of salt and apply your own thinking, whether it's from KPMG, Internet forums, financial advisor, academic text books, or your brother.
