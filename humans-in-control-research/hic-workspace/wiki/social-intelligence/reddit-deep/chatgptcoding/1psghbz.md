---
id: social-intelligence/reddit-deep/chatgptcoding/1psghbz.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "Advice/Suggestions for a Depressed Computer Engineer?"
author: "DeesDaSilva237"
date: "2025-12-21T20:39:50.000Z"
score: 19
upvote_ratio: 0.95
num_comments: 20
flair: "Question"
extracted_at: "2026-10-09T16:37:34.767Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1psghbz.md#c0"
    char_span: [0, 1611]
    sentence_count: 11
    key_terms: [code, like, comments, hallucinations, chatgptcoding, tools, computer, chatgpt]
    concepts: [comments, hallucinations, chatgptcoding, tools, computer]
    token_count: 367
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/","kind":"social-post","date":"2025-12-21","author":"DeesDaSilva237","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1psghbz.md#c1"
    char_span: [1626, 3876]
    sentence_count: 26
    key_terms: [hallucinations, agents, model, correctness, code, work, already, junior]
    concepts: [hallucinations, agents, correctness, model, already]
    section: Comments
    token_count: 515
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/","kind":"social-post","date":"2025-12-21","author":"DeesDaSilva237","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1psghbz.md#c2"
    char_span: [3878, 5960]
    sentence_count: 27
    key_terms: [ask, codex, code, "it's", prd, changes, review, tasks]
    concepts: [codex, changes, review, tasks, chatgpt]
    section: Comments
    token_count: 487
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/","kind":"social-post","date":"2025-12-21","author":"DeesDaSilva237","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1psghbz.md#c3"
    char_span: [5962, 7246]
    sentence_count: 11
    key_terms: [project, questions, guidance, better, mental-telephone3496, build, small, start]
    concepts: [project, questions, guidance, better, build]
    section: Comments
    token_count: 313
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/","kind":"social-post","date":"2025-12-21","author":"DeesDaSilva237","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1psghbz.md#c4"
    char_span: [7250, 8581]
    sentence_count: 6
    key_terms: [model, plan, use, api, code, architect, thinking, project]
    concepts: [model, architect, thinking, project, claude]
    section: Comments
    token_count: 318
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/","kind":"social-post","date":"2025-12-21","author":"DeesDaSilva237","subreddit":"chatgptcoding"}]
---
# Advice/Suggestions for a Depressed Computer Engineer?

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1psghbz/advicesuggestions_for_a_depressed_computer/)
Posted by **DeesDaSilva237** · **19↑** · **20 comments**

Hi Reddit,

I’m a Brazilian computer engineering graduate and I’m currently unemployed. I don’t enjoy writing code as much, but I really like the technical/theoretical side: debugging, architecture, performance, and reasoning about correctness. I also haven’t coded much in the past \~3 years beyond bug fixes during my internship.

I’ve been dealing with some mental health issues (OCD/anxiety), and I’m trying to get back on track professionally.

I keep seeing mixed opinions about “vibe coding” and AI coding agents. Some people say it produces low-quality code or hallucinations, but I’ve also read comments from folks who treat the agent like a junior dev: clear specs, structured instructions, and forcing it to ask questions when requirements are unclear. That sounds like the direction I want.  


Could you share a practical workflow to use AI tools responsibly and avoid slop/hallucinations, and how to use those tools, like I saw people talking about agentes. md, MCD and skills and other stuff?  


I have a ChatGPT Pro and a Gemini subscriptions and I’m open to paying for other tools (e.g., Cursor AI) if they genuinely help.

The only thing I have ever done with AI and code was ask chatgpt to do stuff on the usual chat, and a they giving some sloopy and broken code that dont do the stuff i needed (It was way back before gpt4)



Thanks.

## Comments

- **AuditMind** (12↑): If you enjoy debugging, reasoning about correctness, architecture, and performance, you are actually a very good fit for working with AI. Just not in the way it’s usually presented.

A lot of frustration comes from treating AI as a replacement for thinking. That almost guarantees sloppy output and hallucinations. A more sustainable mental model is this:

AI is not a peer. It’s a junior assistant that needs structure.

What works well in practice:

1. You think first, AI second

Before asking for code, be explicit about:
- the goal
- what is not allowed
- constraints and edge cases
- what is unclear

If requirements are fuzzy, tell the model to ask questions first. Do not let it guess.

2. Split work into phases

Instead of “build X”, do:
- analysis only
- interface or data model
- edge cases
- implementation
- review or refactor

AI is much better at bounded subproblems than open-ended tasks.

3. Treat output as a draft, not truth

Read it like code from a junior dev. Check assumptions. Ask it to explain decisions. If something feels off, it probably is.

4. Agents, agents.md, skills, etc. are not magic

Most “agent systems” are just structured context and repeatable prompts. The value is not autonomy, it’s discipline and consistency. They help when you already know what you want.

5. Avoid pressure to go faster

If AI makes you feel rushed, confused, or less competent, the setup is wrong. Slowing down and keeping control is not a failure mode, it’s the correct one for correctness-focused work.

One important thing:

The fact that you are worried about hallucinations and correctness already puts you ahead of most people using AI today. That mindset is an asset, not a weakness.
Used this way, AI doesn’t replace problem solving. It removes the boring parts so you can focus on the parts you actually enjoy.
  - **witmann_pl** (2↑): Well said, I wholehearteadly agree.
  - **DeesDaSilva237** (2↑): Thank you! was this kinda of tips and tricks i was looking for!
- **witmann_pl** (3↑): Senior developer who's been using AI coding agents for 1.5 years here. I use them both at work and to build profitable side projects. I barely code manually nowadays. Here's how I'd do things if I had to start over:

You have chatgpt pro, so you have access to Codex. It's a CLI tool or a vscode extension. Start with that. It's powerful and stable. Personally I use it in the vscode extension. Open AI has good docs on Codex - how to use it, how to prompt it, etc. I also recommend reading Anthropic guides on prompting Claude Code. It's a different model and a different tool, but prompting rules are universal.

For starters, come up with an idea for a simple app you want to build. Whatever, even a basic to-do app. Describe the idea to chatgpt (on the web) and ask it to guide you through creating a Project Requirements Document (PRD). In markdown format. Read it and ask for changes if it doesn't fit what you want to build.

Next, create a git repo for your project, clone it to your local drive and put the PRD.md from chatgpt inside the repo.

Now, open Codex, select the gpt-5.1-codex-max or gpt-5.2-codex model, point it at the PRD document and ask it to come up with a list of tasks required to implement this project. Ask it to describe these tasks in detail in separate .md files and put them inside the /tasks folder. Read these files and ask for changes if something is not right.

When the tasks are specified, open a new chat in Codex, point it to both the PRD file and the task 1 file and ask it to implement this task.

When it's done, open a new chat in Codex and ask it to perform a comprehensive code review of the changes. Ask it to evaluate them against the task 1 and PRD documents.

If the code review came up with stuff to fix, copy the response summary and paste it back into the chat that was used for implementing these changes. Codex will fix these issues.

When done, you can ask for another code review in a new chat, but it's optional. Either way, do a manual code review before committing to git.

Then repeat the process for task 2 and others.

This workflow is enough for small and medium-sized projects. For larger, more complex projects I recommend looking into the BMAD Method, but first build a couple of apps without it to get comfortable with agentic AI.

If you have any questions, I'll be happy to help.
  - **DeesDaSilva237** (1↑): Thank you! was this kinda of guidance i was looking for! Probably will be needing more guidance when i'm on a bigger project, since much context will be needed for the IA not to mess things up.
- **verkavo** (4↑): Pick a project, and start building it. Then next project, and so on. The more you build, the better you become. There is no shortcuts.

Start small with AI (eg give it small tasks), and then build experience as you work with it. Free (eg grok free), or inexpensive (eg z.ai) models would be enough.

Good luck! Post here in couple of weeks to share your progress.
  - **mark-haus** (2↑): Seriously I’ve had some serious ruts before too and I can’t think of anything better than powering through a side project. Pick something you will actually use and you’ll get that positive feedback loop of wow I did that every time you use it. When it comes to professions where you actually make things the best motivation is feeling useful, even if it’s just to yourself.
- **viciousdoge** (2↑): The best thing you can do for your career is get involved in some open-source project and network from there.
- **Mental-Telephone3496** (2↑): Before you write code: ask me up to 5 clarifying questions.   
  
If you can proceed with assumptions, list them explicitly and wait for confirmation.
- **life_on_my_terms** (1↑): Use Claude code
- **rebeu-bi_top_21cm** (1↑): CAN that model be declined for depressed intellectual thinking Developpement  people 
 ?
- **[deleted]** (1↑): Get VSCode, download an extension (mine is Roo code because of openrouter selection, you should look for what you like) to use an API key for the business you subscribed to (the internet bot does not include the API most of the time) then use your API key and select a model. Then, you read about the capabilities of the models you are looking at. If you have an idea, you can chat with the “ask” mode and then come up with a plan, or maybe a partial plan first. Then, you bring the plan for the Architect mode for a well known high level architecture project model, or at least a good model. (I’d use Gemini 3 Thinking or Pro, from ChatGPT, 5.2 Codex?? Or you can follow the normal protocol for most, Claude Opus 4.5)

You paste what your project plan is, and you must tell it to make sure everything must be made in their directories. The architect will create a plan, series of steps, how detailed you want you can ask, and then when it’s done it will switch to code, where you can use a less resource intensive model but still good to carry out the coding.
