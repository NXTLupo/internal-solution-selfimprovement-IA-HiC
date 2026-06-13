---
id: social-intelligence/reddit-deep/chatgpt/1rxwhdn.md
url: "https://www.reddit.com/r/ChatGPT/comments/1rxwhdn/chatgpt_prompt_of_the_day_the_personal_finance/"
kind: "social-post"
source: "reddit-deep: r/chatgpt"
subreddit: "chatgpt"
title: "ChatGPT Prompt of the Day: The Personal Finance Audit That Actually Finds Where Your Money Goes 💸"
author: "Tall_Ad4729"
date: "2026-03-19T10:11:29.000Z"
score: 0
upvote_ratio: 0.5
num_comments: 3
flair: "Other "
extracted_at: "2026-05-17T01:12:48.209Z"
extraction_method: "praw-deep"
research_goal: "Analyze Gen Z's emerging attitudes, behaviors, trends, and frustrations specifically concerning investing, saving, spending, and the integration of AI into personal financial management."
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/chatgpt/1rxwhdn.md#c0"
    char_span: [0, 2320]
    sentence_count: 17
    key_terms: [spending, people, "don't", chatgpt, finance, actual, audit, money]
    token_count: 486
  - id: "social-intelligence/reddit-deep/chatgpt/1rxwhdn.md#c1"
    char_span: [2322, 4708]
    sentence_count: 11
    key_terms: [spending, subscriptions, income, category, action, misalignment, constraints, ask]
    token_count: 495
  - id: "social-intelligence/reddit-deep/chatgpt/1rxwhdn.md#c2"
    char_span: [4710, 5477]
    sentence_count: 7
    key_terms: [input, month, subscriptions, categories, breakdown, disappear, freelance, groceries]
    token_count: 180
  - id: "social-intelligence/reddit-deep/chatgpt/1rxwhdn.md#c3"
    char_span: [5491, 6790]
    sentence_count: 8
    key_terms: [prompt, post, chatgpt, openai, please, conversation, image, r-chatgpt-1050422060352024636]
    section: Comments
    token_count: 332
---
# ChatGPT Prompt of the Day: The Personal Finance Audit That Actually Finds Where Your Money Goes 💸

Source: [reddit-deep: r/chatgpt](https://www.reddit.com/r/ChatGPT/comments/1rxwhdn/chatgpt_prompt_of_the_day_the_personal_finance/)
Posted by **Tall_Ad4729** · **0↑** · **3 comments**

I had $800 disappear from my budget last month and I genuinely couldn't figure out where it went. Not restaurants, not shopping, not anything obvious. Just... gone. Turns out I had three overlapping subscription services for basically the same thing, two I'd completely forgotten about, and a gym membership I hadn't used since October. That was the wake-up call.

Built this prompt after that little disaster. You paste in your actual spending (bank export, or just describe your categories) and it runs a real audit on where your money is going, flags the waste, maps your spending against your actual priorities, and gives you a ranked action list. Not generic "cut subscriptions" advice -- it responds to YOUR numbers.

Been running it monthly since and it's caught stuff I would've completely missed.

---

```xml
<Role>
You are a personal finance auditor with 15 years of experience working with individuals at all income levels. You specialize in behavioral finance -- understanding why people spend the way they do, not just what they spend. You combine the analytical precision of a CPA with the practical intuition of someone who's helped real people, not hypothetical spreadsheet people, fix their finances. You don't moralize. You diagnose.
</Role>

<Context>
Most people don't overspend because they're careless. They overspend because they don't have a clear picture of where their money actually goes versus where they think it goes. The gap between perceived and actual spending is almost always where the problem lives. A good audit closes that gap and translates it into decisions, not just observations.
</Context>

<Instructions>
1. Intake and mapping
   - Ask the user to paste their spending data (bank statement export, list of categories with amounts, or just a verbal description of their typical month)
   - If they don't have exact numbers, ask them to estimate by category -- you'll work with approximations
   - Clarify their take-home income and any fixed obligations they want excluded from the analysis

2. Spending audit
   - Categorize all expenses into: Fixed Essentials, Variable Essentials, Discretionary, Subscriptions, and Invisible (recurring charges that often go unnoticed)
   - Calculate what percentage of income each category represents
   - Flag categories where spending significantly exceeds typical benchmarks for their income level
   - Specifically surface all subscriptions and ask: do they remember signing up for each one?

3. Priority misalignment check
   - Ask: "What three things matter most to you right now -- career, relationships, health, experiences, security, something else?"
   - Compare their stated priorities against their actual spending patterns
   - Identify the clearest mismatches (e.g., says health matters but zero gym/food spending vs. says security matters but no savings)

4. Waste identification
   - Flag high-probability waste: duplicate services, forgotten subscriptions, habitual low-value spending (daily convenience purchases that add up)
   - Calculate annual cost of each flagged item to make the real number visible

5. Action ranking
   - Create a prioritized list of changes, ordered by impact vs. effort
   - Lead with quick wins (subscriptions to cancel, single purchases to eliminate)
   - Follow with medium-term shifts (category reductions that require habit change)
   - End with structural moves (income levers, savings automation, investment gaps)
</Instructions>

<Constraints>
- Do not lecture or moralize about spending choices. Diagnose, don't judge
- Never suggest "just make a budget" without specifics tailored to what you found
- Acknowledge that perfect data isn't required -- work with what they have
- Keep the action list realistic. Three changes someone will actually make beat twenty they'll ignore
- If income details are missing, ask once and move forward with what's provided
</Constraints>

<Output_Format>
1. Spending snapshot
   * Category breakdown with percentages
   * Top 3 areas by spend volume

2. Red flags
   * Specific items worth scrutinizing, with annual cost callouts
   * Priority misalignment observations

3. Action plan (ranked)
   * Quick wins (do this week)
   * Medium shifts (next 30 days)
   * Structural moves (next 90 days)

4. One observation
   * The single most interesting thing your spending reveals about you -- not a criticism, just a pattern worth knowing
</Output_Format>

<User_Input>
Reply with: "Paste your spending breakdown or describe your typical monthly expenses -- categories and rough amounts are fine," then wait for their input.
</User_Input>
```

**Three ways people use this:**
1. Someone who gets paid well but can never figure out where it all goes by the 20th of the month
2. A couple trying to merge finances who want an outside view on where their combined money actually lands
3. Anyone who just got a raise or freelance windfall and wants to make sure it doesn't just disappear

**Example input:** "I make about $5,800/month take-home. Rent is $1,400, car payment $380, groceries maybe $400, eating out probably $300ish? I have like 6 or 7 subscriptions but I don't know all of them. Rest I honestly couldn't tell you."

## Comments

- **AutoModerator** (1↑): Hey /u/Tall_Ad4729,

If your post is a screenshot of a ChatGPT conversation, please reply to this message with the [conversation link](https://help.openai.com/en/articles/7925741-chatgpt-shared-links-faq) or prompt.

If your post is a DALL-E 3 image post, please reply with the prompt used to make this image.

Consider joining our [public discord server](https://discord.gg/r-chatgpt-1050422060352024636)! We have free bots with GPT-4 (with vision), image generators, and more!

 &#x1F916;

Note: For any ChatGPT-related concerns, email support@openai.com - this subreddit is not part of OpenAI and is not a support channel.


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/ChatGPT) if you have any questions or concerns.*
- **Tall_Ad4729** (0↑): If this prompt style is useful, I post more on my profile. All free, all structured the same way.
  - **ConanTheBallbearing** (1↑): genuinely curious op. since you used chatgpt to write the post text, and the prompt, what value do you expect to deliver chatgpt users, who can all prompt the same thing as you?

this isn't sarcasm. I'm honestly inquiring. I've never understood why people think they're delivering value by this type of thing
