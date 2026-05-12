---
url: "https://www.reddit.com/r/deeplearning/comments/1qsfinm/clawbot_is_a_pretty_brutal_reminder_that_local/"
kind: "social-post"
source: "reddit-deep: r/deeplearning"
subreddit: "deeplearning"
title: "Clawbot is a pretty brutal reminder that “local agents” have a totally different security model than chatbots"
author: "Euphoric_Network_887"
date: "2026-01-31T21:55:05.000Z"
score: 64
upvote_ratio: 0.94
num_comments: 18
flair: ""
extracted_at: "2026-05-11T17:26:50.046Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# Clawbot is a pretty brutal reminder that “local agents” have a totally different security model than chatbots

Source: [reddit-deep: r/deeplearning](https://www.reddit.com/r/deeplearning/comments/1qsfinm/clawbot_is_a_pretty_brutal_reminder_that_local/)
Posted by **Euphoric_Network_887** · **64↑** · **18 comments**

Everyone’s hyped about running Clawbot/Moltbot locally, but the scary part is that an agent is a confused deputy: it reads untrusted text (web pages, READMEs, issues, PDFs, emails) and then it has hands (tools) to do stuff on your machine.

Two big failure modes show up immediately:

First: supply chain / impersonation is inevitable. After the project blew up, someone shipped a fake “ClawBot Agent” VS Code extension that was “fully functional” on the surface… while dropping a remote-access payload underneath. That’s the perfect trap: people want convenience + “official” integrations, and attackers only need one believable package listing.

Second: indirect prompt injection is basically built into agent workflows. OWASP’s point is simple: LLM apps process “instructions” and “data” in the same channel, so a random webpage can smuggle “ignore previous instructions / do X” and the model might treat it like a real instruction. With a chatbot, that’s annoying. With an agent that can read files / run commands / make network calls, that’s how you get secret leakage or destructive actions.

And it’s not just one bad tool call. OpenAI’s write-up on hardening their web agent shows why this is nasty: attackers can steer agents through long, multi-step workflows until something sensitive happens, which is exactly how real compromises work.

If you’re running Clawbot/Moltbot locally, “I’m safe because it’s local” is backwards. Local means the blast radius is your laptop unless you sandbox it hard: least-privilege tools, no home directory by default, strict allowlists, no network egress unless you really need it, and human approval for anything that reads secrets or sends data out.

Curious how people here run these: do you treat agents like a trusted dev tool, or like a hostile browser session that needs containment from day one?

## Comments

- **GraciousMule** (10↑): It’s pretty neat that we all get to see the same obvious threat-surface expose itself in real time, all at the same time, amiright!?   ᕕಠ_ಠᕗ
- **DiamondGeeezer** (8↑): are people using docker or are folks just raw dogging credential leaking RCE generators
  - **General-Jaguar-8164** (3↑): Installs itself as systemd service and asks for sudo rights
  - **danteselv** (4↑): You think these LARPers know what docker is? That's an ancient tool for when developers existed. It's all vibes now baby.
    - **DiamondGeeezer** (2↑): well, for the uneducated- when two fellas love each other very much...
  - **Smallpaul** (1↑): The meme is that you run it on a Mac Mini.
- **Ok_Promise_9470** (2↑): I feel this is gonna give a push to AI security further, and we should see some cool products that help make these kind of bots all the more safe. Its like we built the monster but now we're trying to build its cage
- **sailirish7** (1↑): I'm running it in a VM to play with it before I give it permission to anything. Sadly, I haven't been able to set it up correctly yet.
- **AICodeSmith** (1↑): yeah this is the part people keep brushing past. “it’s local so it’s safe” is pure lpgc energy, like people forgot how malware worked the moment you slap an ai label on it. if your agent can read untrusted text and then run tools, that’s literally the same trust model as a browser plus a shell. without sandboxing and least privilege you’re just waiting for prompt injection to turn into real damage.
- **External_Manager6737** (1↑): I really don't get this can someone explain? Are people giving access to everything on their machine to openai and anthropic just to send messages automatically?
  - **No_Afternoon_4260** (1↑): No but people installing/trusting clawdbot do. And prompt injection can be anywhere, also clawdbot can be "misconfigured" by uneducated people which leaves all their secrets exposed even before prompt injection. (Not even talking about that fake vscode extension that embedded backdoor)
    - **External_Manager6737** (1↑): I mean it's much more simple too... don't people realize that they are essentially sharing personal data in an uncontrolled fashion with openai and anthropic? What's stopping them from looking into or using that data lol
- **Smallpaul** (1↑): This is pretty tangential to deep learning. Sad what this subreddit has become.
