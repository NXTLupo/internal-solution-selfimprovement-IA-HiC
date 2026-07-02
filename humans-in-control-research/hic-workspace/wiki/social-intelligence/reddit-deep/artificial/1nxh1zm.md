---
id: social-intelligence/reddit-deep/artificial/1nxh1zm.md
url: "https://www.reddit.com/r/artificial/comments/1nxh1zm/are_we_actually_becoming_better_engineers_with_ai/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "Are we actually becoming better engineers with AI code assistants, or just faster copy-pasters?"
author: "Softwaredeliveryops"
date: "2025-10-04T01:27:50.000Z"
score: 10
upvote_ratio: 0.81
num_comments: 33
flair: "Discussion"
extracted_at: "2026-05-11T16:53:08.149Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1nxh1zm.md#c0"
    char_span: [0, 1338]
    sentence_count: 10
    key_terms: [assistants, better, faster, tools, artificial, assistant, different, engineers]
    concepts: [assistants, better, faster, artificial, tools]
    token_count: 295
    sources: [{"n":"reddit-deep: r/artificial","u":"https://www.reddit.com/r/artificial/comments/1nxh1zm/are_we_actually_becoming_better_engineers_with_ai/"}]
  - id: "social-intelligence/reddit-deep/artificial/1nxh1zm.md#c1"
    char_span: [1352, 3081]
    sentence_count: 14
    key_terms: [companies, going, like, llm, absolutely, production, pushing, output]
    concepts: [companies, absolutely, going, production, pushing]
    section: Comments
    token_count: 382
  - id: "social-intelligence/reddit-deep/artificial/1nxh1zm.md#c2"
    char_span: [3083, 4954]
    sentence_count: 15
    key_terms: [code, get, level, software, actual, coding, commas, higher]
    concepts: [level, software, actual, coding, commas]
    section: Comments
    token_count: 431
  - id: "social-intelligence/reddit-deep/artificial/1nxh1zm.md#c3"
    char_span: [4956, 7009]
    sentence_count: 15
    key_terms: [code, coding, using, use, providing, language, because, design]
    concepts: [coding, using, providing, language, because]
    section: Comments
    token_count: 485
---
# Are we actually becoming better engineers with AI code assistants, or just faster copy-pasters?

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1nxh1zm/are_we_actually_becoming_better_engineers_with_ai/)
Posted by **Softwaredeliveryops** · **10↑** · **33 comments**

I have been using different assistants (GitHub Copilot, Cursor, Windsurf, Augment Code) across real projects. No doubt, the speed boost is insane with the power from these tools to generate boilerplate, test cases, even scaffolding full features in minutes. 

But I keep asking myself:

Am I actually *learning* more as an engineer… or am I outsourcing the thinking and just verifying outputs?

When I was coding before these tools, debugging forced me to deeply understand the problem. Now, I sometimes skip that grind because the assistant “suggests” something good enough. Great for delivery velocity, but maybe risky for long-term skill growth.

On the flip side, I have also noticed assistants push me into new frameworks and libraries faster, so these days I explore things I wouldn’t have touched otherwise. So maybe “better” just looks different now?

Curious where you stand:

* Do these tools make us *better engineers*, or just *faster shippers*?
* And what happens when the assistant is wrong — are we equipped to catch it?

## Comments

- **CanvasFanatic** (13↑): It’s absolutely making us worse. It’s encouraging us to ignore important implementation details. No, it is not like other forms of abstract because the output isn’t deterministic. Traditional compilers and computer languages have a well-developed theory about how their input becomes their output. LLM’s are more or less a slot machine. You pull the lever till the app seems to work. 

Anyone who tells you otherwise wasn’t a very good programmer to begin with.
  - **stevefuzz** (8↑): As someone who has coded for like 20+ years professionally, and has fully embraced LLM tools as part of my workflow, you are absolutely right. There are going to be a lot of terrible codebases going into production. It's going to be an absolute nightmare for the companies pushing heavy LLM usage.
    - **Softwaredeliveryops** (2↑): Yeah, that’s the part that worries me too and the scale of what’s being shipped. A single junior dev cutting corners with AI isn’t new (we’ve all seen bad copy-paste from Stack Overflow), but now you can have entire teams generating volumes of code at speed, which multiplies the technical debt risk.

The irony is, the same tools that generate the mess could also help manage it e.g., automated reviews, static analysis with LLMs, even “AI auditors” that flag risky patterns before code hits production. But most companies are pushing adoption faster than they’re building those guardrails.

Feels like we’re in a phase where velocity is being prioritized over longevity. The bill for that will come due, and the companies thinking ahead about quality controls will be the ones that survive it.
  - **shinobushinobu** (1↑): now more than ever is the best time to get into cybersec.

inb4 an entire generation of software developers enters the workforce who don't know how their code works. Prime target for software vulnerabilties
- **raharth** (7↑): No, it doesn't make us better engineers, more likely worse tbh.
  - **jlsilicon9** (1↑): For you
    - **HuckleberryPlastic35** (1↑): Yeah thats what was already said
- **Jolly_Reserve** (2↑): The whole idea of coding large chunks of an application by hand is a bit romantic anyways. We have higher level programming languages, libraries, low/no-code, etc. now also AI that helps write the parts of code that remain to be required. I think in a not too distant future actual coding will only be done in highly optimized scientific environments.
- **Alex_1729** (2↑): It's about the same. The only thing that changed is the abstraction level. You no longer have to worry about syntax, and you get to bring ideas to fruition faster. So you get to operate from a higher level.

You can still learn when debugging, but you also get to create more sophisticated systems, sleeker designs, and your testing can get much more thorough. It's all up to you what you do with it. You're simply in a transition period.
  - **Ok_Individual_5050** (1↑): The syntax actually matters. It is what gets run. If you don't care about the actual behaviour of your code, you're on a road to disaster
    - **Alex_1729** (1↑): We have VS Code and extensions for those that help with well-written code. AI worrying about commas is just one of those tools. Or are you suggesting one cannot write good code unless they also worry about fixing commas?
- **MannieOKelly** (1↑): Sounds like you've been promoted to programmer reviewer.

For sure you will have to get expert at functional requirements specification and understanding the details and potential vulnerabilities of the business process the code is supposed to implement.

And a question for you, please:  I'm a programming dilettante but I have an application idea. I played around with ChatGPT a few years back and got it to generate some code for a game I was trying to modify.  A decidedly mixed experience: it did some simple things OK but failed or had to be tweaked on most. Anyhow that was a few years ago. 

I'd really love to be able to have an AI coder for a more serious project. I don't have the time or skills to code it myself. I see my role as providing "prompts" (requirements, adjustments, clarifications) but not actually coding or reviewing the code except from a functional testing perspective: providing test data to verify it does what is expected.  What would you say is the best tool now for me to use as a coder?
- **Slight_Republic_4242** (1↑): it is up to user how he was using ai assistants for help and finding errors it works great make the task simpler but in terms copy pasting it won't add value to your projects like i myself using dograh ai for cold calling for my real estate business and it do add value save lot of time
- **frank26080115** (1↑): it lets me design better with more freedom, because I am not tied to my capabilities with whatever language I am using.

Before, I would design according to my abilities.

But if I don't have to care so much if I know the language, I can be much more adventurous and creative.
- **jlsilicon9** (1↑): Would you rather do mech / carpentry work -without pliers or power saw ... ?

I find AI great for quicker coding.
- **Own_Dependent_7083** (1↑): I feel this. AI tools make coding faster, but it’s easy to lose that deep understanding you get from solving problems yourself. I try to use them for the repetitive stuff but still do the thinking on my own.
- **Left_Contribution833** (1↑): I am actually learning as I use it. But that's mostly because I learn from the code/scripting patterns and operators that I hardly ever used in some of the answers. I do have to actively look up and think *why* they are used and what difference they make.
