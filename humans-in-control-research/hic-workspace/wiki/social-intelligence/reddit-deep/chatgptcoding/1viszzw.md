---
id: social-intelligence/reddit-deep/chatgptcoding/1viszzw.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1viszzw/finance_asked_why_our_agentic_ai_best_practices/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "finance asked why our agentic ai best practices cost 8k a month"
author: "Specialist_Agent3599"
date: "2026-08-08T10:57:46.000Z"
score: 0
upvote_ratio: 0.43
num_comments: 13
flair: "Resources And Tips"
extracted_at: "2026-10-09T16:37:34.762Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1viszzw.md#c0"
    char_span: [0, 1277]
    sentence_count: 3
    key_terms: [review, chatgptcoding, coderabbit, comments, finance, bugbot, plan-execute-review, month]
    concepts: [chatgptcoding, review, coderabbit, comments, finance]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1viszzw.md#c1"]
    token_count: 317
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1viszzw/finance_asked_why_our_agentic_ai_best_practices/","kind":"social-post","date":"2026-08-08","author":"Specialist_Agent3599","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1viszzw.md#c1"
    char_span: [1292, 3158]
    sentence_count: 10
    key_terms: [finance, slop, missed, reddit, review, costs, human, sales]
    concepts: [finance, missed, reddit, review, costs]
    related_chunks: ["social-intelligence/reddit-deep/chatgptcoding/1viszzw.md#c0"]
    section: Comments
    token_count: 486
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1viszzw/finance_asked_why_our_agentic_ai_best_practices/","kind":"social-post","date":"2026-08-08","author":"Specialist_Agent3599","subreddit":"chatgptcoding"}]
---
# finance asked why our agentic ai best practices cost 8k a month

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1viszzw/finance_asked_why_our_agentic_ai_best_practices/)
Posted by **Specialist_Agent3599** · **0↑** · **13 comments**

Finance flagged our AI tooling spend last week. It's about 8000 a month across the whole dev team once you add up all the model subscriptions - claude, codex, devin, cursor, coderabbit / bugbot, the lot

Fair question, here's why I'm keeping all of it

We run a plan-execute-review loop. Opus 5 breaks the task into a real plan, composer 2.5 does the work cuz its fast, then coderabbit / bugbot review the diff. whatever they flag goes back to the agent, it patches, review runs again, till it comes back clean or caps out after a few passes

The review gate is the whole reason it holds up. two agents will confidently agree while both wrong, and only something actually reading the diff catches it

We're b2b saas. one broken customer workflow costs us more than that 8k many times over. id rather pay to stay boring than ship fast and break someones week

Nobody really writes much code by hand anymore anyway, the job shifted to writing way more tests

whats your actual monthly burn on this stuff?

## Comments

- **servermeta_net** (8↑): You didn't mention how many engineers
  - **spectre78** (5↑): Just him, it’s vibes all the way down
- **MrPanache52** (7↑): The whole “generic sales story with an engagement question at the end” should be grounds for a ban.  Slop ass
- **Maleficent-Ear8475** (6↑): I always turn to reddit for my corporate needs. LOL get to work
- **Mean_Lawyer7088** (9↑): What in the Sloptown is this setup ? :D i understand your finance sector and any human that understands basic llm models :D 

We are 1,5 years after the council thingy taht was a cool reasoning alternative but we arent in the stoneage anymore :D
- **vovap_vovap** (4↑): So how much more sales you got or how less people in now?
- **geekraver** (2↑): If I was paying API token costs and not on a heavily subsidized Max plan I’d be burning that in a week on hobby coding. Finance is clueless but you have to give them some number they can track in spreadsheet to show what they are getting for the $8k.
- **Bizzle_worldwide** (2↑): This post sure reads like “agentic ai best practices”. 

Pro-tip: Telling your bot to use Reddit style writing including missed punctuation and missed capitalization doesn’t make it sound any more human. It’s still slop, it’s just also lazy slop.
- **trollsmurf** (1↑): This is a discussion for your development tools budgeting. Finance doesn't like unexpected costs. Suggest to your manager what you need, not saying an estimate is easy.
- **MostlyHelpfulLinks** (1↑): We're similar, sitting around 5 to 6k for a smaller team, mostly the model subscriptions plus review tooling. The review gate is the part I'd never cut, letting one agent grade another's diff catches stuff that would've been an on call page otherwise. Curious if anyone's found a cheaper reviewer step that still holds up though.
- **mildmannered** (1↑): This sounds stupid as shit.
