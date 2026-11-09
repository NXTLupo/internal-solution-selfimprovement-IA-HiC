---
id: social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md
url: "https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/"
kind: "social-post"
source: "reddit-deep: r/chatgptcoding"
subreddit: "chatgptcoding"
title: "How one engineer uses AI coding agents to ship 118 commits/day across 6 parallel projects"
author: "QThellimist"
date: "2026-02-26T14:47:10.000Z"
score: 0
upvote_ratio: 0.43
num_comments: 70
flair: "Interaction"
extracted_at: "2026-10-09T16:37:34.754Z"
extraction_method: "praw-deep"
research_goal: "Analyze the 2026 AI software development and consulting landscape to identify the root causes of traditional agency decline, and deliver a differentiated value proposition narrative for NXT Humans that positions its AI-native tools, accelerators, and processes as the modern solution."
engagement: "analyze-the-2026-ai-software-development-and-consulting-landscape-to-identify-th"
chunks:
  - id: "social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md#c0"
    char_span: [0, 1274]
    sentence_count: 7
    key_terms: [agents, built, commits, chatgptcoding, different, comments, engineer, across]
    concepts: [agents, built, chatgptcoding, commits, different]
    token_count: 309
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/","kind":"social-post","date":"2026-02-26","author":"QThellimist","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md#c1"
    char_span: [1289, 2948]
    sentence_count: 13
    key_terms: [glorifying, "can't", qthellimist, back, good, "it's", like, bragging]
    concepts: [glorifying, qthellimist, "can't", bragging, openclaw]
    section: Comments
    token_count: 455
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/","kind":"social-post","date":"2026-02-26","author":"QThellimist","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md#c2"
    char_span: [2950, 4942]
    sentence_count: 19
    key_terms: ["it's", repos, read, github, https, wikipedia, eufemiapiccio77, able]
    concepts: [repos, github, wikipedia, eufemiapiccio77, https]
    section: Comments
    token_count: 510
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/","kind":"social-post","date":"2026-02-26","author":"QThellimist","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md#c3"
    char_span: [4944, 6957]
    sentence_count: 16
    key_terms: [probably, without, people, month, qthellimist, code, lol, per]
    concepts: [probably, without, people, qthellimist, month]
    section: Comments
    token_count: 492
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/","kind":"social-post","date":"2026-02-26","author":"QThellimist","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md#c4"
    char_span: [6959, 8294]
    sentence_count: 11
    key_terms: [training-flan8092, qthellimist, everything, workflow, realize, better, reddit, anti]
    concepts: [training-flan8092, qthellimist, everything, workflow, realize]
    section: Comments
    token_count: 354
    sources: [{"n":"reddit-deep: r/chatgptcoding","u":"https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/","kind":"social-post","date":"2026-02-26","author":"QThellimist","subreddit":"chatgptcoding"}]
  - id: "social-intelligence/reddit-deep/chatgptcoding/1rfc26z.md#c5"
    char_span: [8296, 9465]
    sentence_count: 10
    key_terms: [qthellimist, setup, years, etc, less, need, engineering, environment]
    concepts: [qthellimist, setup, years]
    section: Comments
    token_count: 274
    sources: [{"n":"senior director and principal engineer 1200+ person org.","u":""}]
---
# How one engineer uses AI coding agents to ship 118 commits/day across 6 parallel projects

Source: [reddit-deep: r/chatgptcoding](https://www.reddit.com/r/ChatGPTCoding/comments/1rfc26z/how_one_engineer_uses_ai_coding_agents_to_ship/)
Posted by **QThellimist** · **0↑** · **70 comments**

I studied Peter Steinberger's workflow - the guy who built OpenClaw (228K GitHub stars in under 3 months, fastest-growing OSS project ever).



His approach: run 5-10 AI coding agents simultaneously, each working on different repos for up to 2 hours per task. He's the architect and reviewer, agents do implementation.



But the interesting part is the meta-tooling. Every time an agent hit a limitation, he built a tool to fix it:



\- Agents can't test macOS UI - built Peekaboo (screen capture + UI element reading)

\- Build times too slow - built Poltergeist (automatic hot reload)

\- Agent stuck in a loop - built Oracle (sends code to a different AI for review)

\- Agents need external access - built CLIs for iMessage, WhatsApp, Gmail



His quote: "I don't design codebases to be easy to navigate for me. I engineer them so agents can work in them efficiently."

Result: 8,471 commits across 48 repos in 72 days. \~118 commits/day.

  
Has anyone done something similar?

## Comments

- **pete_68** (8↑): I can't write fast enough to manage 5 coding agents. I've done 2 at a time working on 2 separate projects, though and I had a few long waits in there, I might have been able to get a third in.

But I just don't have that kind of energy anymore at 57. Back in my 20s, I could see myself doing something similar. I was super-productive back then (autism with ADHD can be a hell of a thing for a programmer).
  - **just_damz** (6↑): 5 agents here: speech to text is the key
    - **pete_68** (3↑): I can't dictate. I used to play around with dragon voice dictation back in the late '90s (it did a pretty decent job with a good headset and training), but I can't think and talk at the same time like that and never could dictate nearly as fast as I can type.  
  
I think it's an autistic thing. It's very frustrating for me at work. I'm very good at getting my thoughts together in an e-mail but struggle to verbalize them as well. These days people are too lazy to read e-mails. They'll call me and say, "I see you sent me an e-mail, what's up?"  Makes me want to scream.
  - **QThellimist** (1↑): with family + age + responsibilities, I think that's a unfair expectation

Do what feels correct - skip the FOMO 💪
- **creaturefeature16** (6↑): Good god, who seriously gives a shit?

Bragging about LoC and commit count is like bragging how heavy you made your airplane, or how much salt you used in a recipe.

The best commit I've ever made *removed* 1000 LoC.
- **Artanox** (20↑): Hm why are you guys glorifying openclaw like is not a hot mess vibe coded?
  - **QThellimist** (-13↑): this is not glorifying openclaw - it's glorifying Peter. 

He is actually amazing. If you read his github repos, you'll understand
    - **TuberTuggerTTV** (1↑): You don't have objective reality. Just because you've read something and formed an opinion, doesn't mean it's universal truth and someone else reading the same repos would come to the same conclusions.

Saying "read and you'll understand" is a fantastic way to let everyone around you know you're low intelligence. That you're running off dunning-krugger vibes.

Assume ambiguity and individual experience exist. You can have two people watch the same thing and form conflicting opinions complete with logic and high-intelligence understanding.

For example, the bullet points you gave in the main post seem incredibly obvious and unimpressive to me. If you've worked with agents before, ya, you make those things out of necessity. I've done it too. It's not clever. It's obvious roadblocks and you just ask the agent to make the tool so it can get past it's own roadblock.
    - **WolfeheartGames** (1↑): I've read his github repos. He's cutting too many corners on everything. Nothing is properly designed. The problem isn't Ai, it's the user.
- **eufemiapiccio77** (3↑): Right so it’s just a bot probably fake stars on GitHub as well. Completely meaningless metric.
  - **pete_68** (0↑): No doubt it's bots discussing the Wikipedia page for it as well. [https://en.wikipedia.org/wiki/Talk:OpenClaw](https://en.wikipedia.org/wiki/Talk:OpenClaw)

He's got quite the smoke screen going on. Surely it's all fake. /s
  - **QThellimist** (-2↑): LOL check the table here on github stars

[https://x.com/thellimist/status/2027031462575231143](https://x.com/thellimist/status/2027031462575231143)

It's not one repo it's 48 repos
    - **eufemiapiccio77** (1↑): Oh wow that’s impressive 48 repos
- **amarao_san** (1↑): I won't be able to read so much. Without reading it, I want be able to keep context and competence in the domain. Without competence I won't be able to judge if it good or not.

At the end, the code you write, either matter or  not. If it does not matter, well, okay. If it matters, I would prefer the guy writing software for elevator or for car breaks logic to have competence in that domain.
  - **QThellimist** (1↑): He built tools so he reads less and less. Every build effectively decreases that amount of reading. 

But I agree, I (1) do not work 19 hours per day (2) haven't automatized that much so still many things to read

He is an example that it is possible if you are the extreme. Probably next year we'll see more of these 100x engineers popping up
- **Cordyceps_purpurea** (1↑): You can do this but the main bottleneck here is mainly token use. I can't handle more than 2 agents at a time without burning thru my subscription access. My lab can't afford more than 20 dollars a month lol
  - **QThellimist** (1↑): Correct. he mentioned somewhere he is using like $10-20k per month on tokens. 

Probably he has many codex, claude code plans too..
    - **Cordyceps_purpurea** (1↑): That's stupid as fuck to be honest and signals more towards "bruteforcing" rather than meaningful agent work. But yeah I gotta hand it to him he won that $1B prize lol

I can probably get more things done with $40 worth of subscriptions per month than these people than these people even without coding manually  lol. These people are likely constantly writing and erasing their codebases many times over without auditing what their agents had done/redone at any given time.
- **Training-Flan8092** (1↑): I’m running 5-7 builds at a time because of my work and side projects. 

I think it’s a mindset thing. I am actively building my workstation to be complimentary of my aggressive workflow. 

I’ve basically forked fancy windows and have to do lists in zones on my desktop. I have notes to make sure I don’t lose anything in context switching. 

I have an agent that is specifically built to modify open code’s GUI and back end to fix blindspots or augment with things I feel it should have. 

You have to see everything as either complimenting your workflow or dragging it. Once you get there and you realize everything you need can be open source and as such can be built better… you just make sure that if you find something that drags, you fix it in your stack.

Also this sub used to be solid prior to Claude Code, now it’s just anti-AI SWEs. This post would probably get better engagement in r/vibecoding or one of those subs
  - **QThellimist** (1↑): yeah, 42 comments and negative likes. I didn't realize how anti AI SWE this reddit is
    - **Training-Flan8092** (2↑): There’s a few of them where after Reddit went Anti AI the community just didn’t push back hard enough so it seems mods just abandoned ship? 

Vibecode has a healthy mix to where it doesn’t feel like an echo chamber
  - **ciaoshescu** (1↑): Do you mind diving a bit deeper into your workflow?
    - **Training-Flan8092** (1↑): Which part, sorry. 

Like how to manage many builds?
- **Evilkoikoi** (1↑): You know his software is extremely buggy? Huge security risks and people are getting their entire mailboxes purged?
  - **QThellimist** (1↑): that's openclaw - his CLIs are pretty good
- **TuberTuggerTTV** (1↑): I run a couple at once. It can be strong. You just have to treat them as a team of interns. They'll make mistakes or need clarification. 

I do prefer a parallel working environment with multiple projects running at once. Wouldn't consider it anything special. It's just ADHD + new tech. I suspect it'll be incredibly common over the next couple years. No need to glaze it.
  - **QThellimist** (1↑): agreed - I actually think one more layer on top. Software engineering will be coded with words in a few years. They'll be more "non-code" tools designed for PMs etc. where they don't need to care about infra stuff that SWE do, but still produce extremely valuable products that actually work
- **smirk79** (1↑): There are many like us. I have been doing agentic programming since well before CC existed and have a whole slew of CLIs, MCPs etc in the code base to do all sorts of fantastic things including semantic search, server control, scaffolding component hierarchies, sso to atlassian and msgraph that are ten times better than the official versions and enable wildly efficient workflows.  Source: senior director and principal engineer 1200+ person org.
  - **QThellimist** (1↑): curious, does your setup come close to 100x or less? 

My setup is definitely less than 100x, but more than 10x right now
