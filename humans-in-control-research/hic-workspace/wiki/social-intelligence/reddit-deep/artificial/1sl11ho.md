---
id: social-intelligence/reddit-deep/artificial/1sl11ho.md
url: "https://www.reddit.com/r/artificial/comments/1sl11ho/about_mythos_ai/"
kind: "social-post"
source: "reddit-deep: r/artificial"
subreddit: "artificial"
title: "about mythos AI"
author: "BlueSky-69"
date: "2026-04-14T06:53:46.000Z"
score: 25
upvote_ratio: 0.64
num_comments: 44
flair: "Cybersecurity"
extracted_at: "2026-05-11T17:27:04.782Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
industries: [ai_research]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c0"
    char_span: [0, 2404]
    sentence_count: 28
    key_terms: [vulnerabilities, cost, exploit, mythos, found, bug, chaining, vulnerability]
    token_count: 503
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c1"
    char_span: [2406, 5089]
    sentence_count: 23
    key_terms: [going, report, doing, security, humans, mythos, triage, vulnerability]
    token_count: 503
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c2"
    char_span: [5091, 6908]
    sentence_count: 21
    key_terms: [anthropic, models, people, field, understand, technical, question, security]
    token_count: 346
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c3"
    char_span: [6923, 9013]
    sentence_count: 17
    key_terms: [opinion, mythos, "don't", analysts, judgment, year-old, because, openbsd]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c4"
    char_span: [9015, 10385]
    sentence_count: 3
    key_terms: [read, gonna, definitely, acrolith, detector, people, solid, write]
    section: Comments
    token_count: 379
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c5"
    char_span: [10387, 11663]
    sentence_count: 1
    key_terms: [manager, officer, director, engineer, chief, marketing, product, analyst]
    section: Comments
    token_count: 244
  - id: "social-intelligence/reddit-deep/artificial/1sl11ho.md#c6"
    char_span: [11665, 13266]
    sentence_count: 10
    key_terms: [integer, improvement, conditions, overflow, security, mythos, subtle, far-eagle7029]
    section: Comments
    token_count: 396
---
# about mythos AI

Source: [reddit-deep: r/artificial](https://www.reddit.com/r/artificial/comments/1sl11ho/about_mythos_ai/)
Posted by **BlueSky-69** · **25↑** · **44 comments**

I spent my Sunday reading Anthropic's full technical report on their new AI model Mythos. I study Cyber Security and honestly this one kept me thinking all day.

Everyone is sharing the headline. Nobody is reading what's actually inside. So I did, all of it, and here's what stood out.

Anthropic's previous best model tried to exploit a Firefox vulnerability hundreds of times and succeeded twice. Mythos succeeded 181 times. That's not a small improvement. That's a completely different machine.

It found a 27-year-old bug in OpenBSD, an OS literally known for its security, by chaining two subtle integer overflow conditions that no human connected in nearly three decades. It found a 16-year-old bug in FFmpeg that survived millions of fuzzing runs and years of expert review. It wrote a complete remote code execution exploit for FreeBSD from scratch with zero human help. It broke into Linux by chaining three separate bugs together in sequence. It found vulnerabilities in every major web browser and built working exploits that escape both the browser sandbox and the OS sandbox.

Now here's where it gets real, the actual costs.

Finding the OpenBSD bug cost under $50 per run, around $20,000 total across roughly 1,000 runs. FFmpeg vulnerabilities cost around $10,000 for several hundred runs. A complete Linux privilege escalation exploit built from a known CVE cost under $1,000 and took half a day. A more complex exploit chaining two separate bugs cost under $2,000 and took under a day.

For large companies this is a no-brainer. A single critical vulnerability in production can cost millions in damages and fines. Paying $10,000 to find dozens of real bugs before attackers do isn't even a debate. Traditional human penetration testing costs more, takes longer, and covers far less ground.

The part that convinced me this wasn't just marketing was when they admitted where Mythos failed. Linux kernel defenses stopped it from building remote exploits. A virtual machine bug was found but couldn't be turned into a working attack. They also published SHA-3 cryptographic commitments to vulnerabilities they haven't released yet because the software is still unpatched. Real PR doesn't include the failures.

Now the questions a lot of people in this field are quietly asking.

Will human cybersecurity professionals still matter?

Here's my honest read after going through this report carefully.

Penetration testers who only run tools and write templated reports are already becoming less relevant. If Mythos can find and exploit a 27-year-old bug autonomously for $50, a junior pen tester doing the same job manually at $5,000 a week is hard to justify. That part of the market is going to compress significantly over the next few years.

SOC analysts doing first-level alert triage are in a similar position. Anthropic themselves listed it in their report AI can already triage alerts, summarize events, prioritize what needs human attention, and run proactive threat hunts in parallel. The analyst who spends eight hours reviewing logs that a model could process in minutes is going to have a difficult time explaining their value.

Compliance auditors doing checkbox security reviews, vulnerability scanners doing basic CVSS scoring, report writers. all of these roles are going to shrink, and they're going to shrink faster than most people in the industry are comfortable admitting.

But here's what the report also made clear, and this part gets less attention.

Mythos was built by humans, directed by humans, and its most dangerous outputs are still being judged and controlled by humans. Every vulnerability it found went through a professional human triagers before being disclosed. The researchers had to understand the findings deeply enough to know which SHA-3 commitments to publish, which bugs were critical versus noise, and which exploits were sophisticated enough to demonstrate publicly. Anthropic said it themselves, they are still figuring out how to use these tools effectively, and it takes time.

The roles that will grow are the ones that sit at the intersection of deep security knowledge and AI fluency. Threat intelligence analysts who can interpret what AI-generated findings actually mean in a real business context. Red team leads who design the scaffolds and prompts that make models like Mythos useful rather than just pointing them at a codebase and hoping. Incident responders who can work alongside AI triage tools and make judgment calls that models genuinely cannot  legal exposure, regulatory context, business risk, stakeholder communication. Security architects who understand both the technical depth to evaluate what AI finds and the strategic depth to decide what to do about it.

These roles aren't going away. They're becoming more important and more demanding at the same time.

So how do you stay relevant in a field that's moving this fast?

Stop treating certifications as the destination. A CEH or Security+ will get you in the door but it won't keep you there if you don't understand what's happening around you. Read the actual technical reports, not just the summaries. The Anthropic red team paper I'm referencing here is publicly available and most people in this field haven't read it.

Get comfortable using current frontier models for security tasks code review, vulnerability analysis, log summarisation, writing detection rules. The researchers at Anthropic said most companies haven't even started doing this with existing models. If you understand how to work with these tools better than your peers, that gap becomes your advantage.

Go deeper on the things AI still struggles with. Business context. Legal and regulatory judgment. Cross-team communication during a live incident. Adversarial thinking about what an attacker would actually want to achieve, not just which vulnerabilities exist. These require human understanding of human systems in a way that current models genuinely cannot replicate.

And finally, don't wait for your company or university to prepare you for this. The people who will matter in this field five years from now are the ones who are studying the technical papers today, building side projects, and actively thinking about where the gaps are not the ones waiting to be trained on whatever curriculum gets updated last.

I'm just starting out. But reading something like this makes it clear that the question is no longer whether AI will change cybersecurity. It already has. The only question is whether the people in this field are willing to change with it.

Most aren't moving fast enough. That's either a threat or an opportunity depending on what you do next.

https://red.anthropic.com/2026/mythos-preview/

## Comments

- **frankster** (19↑): don't have time for 15 pages of LLM verbosity
- **avbrodie** (24↑): lol bro do u even have an opinion? This is just ai slop. And not even edited or curated ai slop.
  - **BlueSky-69** (-11↑): Actually I have an opinion and write a post regarding that opinion with AI because I am too lazy to write big paragraph
    - **Personal-Dev-Kit** (6↑): Remember people on reddit don't want to read an essay, let alone an AI essay.

2 phases of condensing with sonnet. 90% of your posts meaning in a lot less words. 

---

**about mythos AI**

Spent my Sunday actually reading Anthropic's full Mythos technical report so you don't have to.

Their previous best model exploited a Firefox vuln twice. Mythos did it 181 times. It found a 27-year-old OpenBSD bug, a 16-year-old FFmpeg flaw that survived millions of fuzzing runs, and built a complete FreeBSD RCE exploit from scratch with zero human help.

The costs are wild. Full Linux privilege escalation from a known CVE: under $1,000, half a day. Finding the OpenBSD bug: ~$20k total. Traditional pen testing costs more, takes longer, and covers less ground.

You know it's legit because they published where it *failed* too. Real PR doesn't include the failures.

**What this means for the field:**

Junior pen testers running tools, SOC analysts doing first-level triage, compliance checkbox auditors — these roles are compressing fast. The roles growing are the ones that combine deep security knowledge with AI fluency: red team leads, threat intel analysts, incident responders making judgment calls models can't.

Certs get you in the door. They won't keep you there. Read the actual papers, get comfortable using these tools now, and go deeper on what AI still can't do — business context, legal judgment, real adversarial thinking.

The people who matter in 5 years are studying this stuff today.

https://red.anthropic.com/2026/mythos-preview/
    - **CanadianWithCamera** (1↑): Why would I care about what a lazy bum has to say?
- **Acrolith** (38↑): >Learn how to use AI as a tool before it learns to replace you.

No, YOU learn to use AI properly, so the next time you have it do your writing for you it doesn't end up as unreadable slop.
  - **Lost_Promotion_3395** (5↑): lmao
  - **veginoodle** (0↑): AI detector says it was 100% human written, though...
    - **Acrolith** (2↑): then your AI detector is useless, because this is definitely AI
  - **BlueSky-69** (-32↑): I am too lazy to write this big paragraph 😭
    - **Acrolith** (3↑): We're not really interested in the thoughts of someone too lazy to write them down.
    - **Ok_Nectarine_4445** (4↑): I read it just fine. It was nice breakdown of the different exploits and costs to find them.
    - **DirectJob7575** (1↑): Classic AI user lol.
- **Obvious-Treat-4905** (3↑): this was honestly a really solid read, the part that hits is not ai replaces security but how it reshapes where humans actually add value, feels like the low level repetitive work is getting squeezed, but judgment, context and decision making are becoming even more important, definitely more of a shift than a replacement, and people who adapt early are gonna have a big edge
  - **Kind_Cheetah_2043** (1↑): Solid read and it's AI...
    - **RazzmatazzSuch7459** (1↑): It doesn’t read as AI.
- **TheOnlyVibemaster** (3↑): But like what do people think these companies are gonna be lol, is google gonna be ran by a single guy? Nah, one guy can’t do:

CEO, President, Chief Financial Officer (CFO), Chief Operating Officer (COO), Chief Technology Officer (CTO), Chief Product Officer (CPO), Chief Marketing Officer (CMO), Chief Information Security Officer (CISO), VP of Engineering, VP of Sales, VP of Marketing, VP of Human Resources, VP of Finance, VP of Legal, VP of Product Management, VP of Operations, Director of Engineering, Director of Product, Director of Sales, Director of Marketing, Director of HR, Director of Finance, Senior Engineer, Software Engineer, Product Manager, Data Scientist, UX Designer, Marketing Manager, Sales Manager, HR Manager, Financial Analyst, Accountant, Legal Counsel, Compliance Officer, Business Analyst, Quality Assurance Engineer, DevOps Engineer, Security Engineer, Solutions Architect, Account Manager, Customer Success Manager, Content Strategist, Social Media Manager, Brand Manager, Communications Manager, Technical Writer, IT Manager, Systems Administrator, Network Engineer, Database Administrator, Help Desk Support, Recruiter, Training & Development Specialist, Compensation & Benefits Specialist, Office Manager, Facilities Manager, Procurement Manager, Supply Chain Analyst, Logistics Coordinator, Administrative Assistant, Executive Assistant, Receptionist​​​​​​​​​​​​​​​​

Most of the things I listed are needed per region with some cases hundreds of people, simply because the monitoring of the task is important.
- **Far_Note6719** (2↑): While this is interesting in general, I take Mythos with a grain of salt. At the end it is marketing.
  - **openchakras** (1↑): ha, yes and no.  Believe it or not, the world is about to change rapidly.
    - **Far_Note6719** (1↑): I don’t doubt that.
  - **waltercrypto** (1↑): I’ve gone into the technical details into mythos and sadly it’s not hype and the method is easily replicated by competitors. The only good news it’s domain specific, so subjects like programming, maths and science big improvement and in less structured areas, very little improvement expected.
- **Far-Eagle7029** (2↑): I'll keep waiting when all the cooling methods become unusable
- **khantot** (2↑): When everything else fails, turn off power.
- **therealwench** (2↑): \> It found a 27-year-old bug in OpenBSD, an OS literally known for its security, by chaining two subtle integer overflow conditions that no human connected in nearly three decades.

  
And this is where I stopped reading. 

  
As someone who has worked SWE and MLEng for 10+ years, this is classic, "I want to sound smart but have no idea wtf I'm talking about" 

  
Two subtle integer overflow conditions ahhaha 

  
What does that even mean? Integer overflows on the Heap? Integer exceeds the size of the bit definition? Memory out of bounds? 

How is this a security issue rather than a "Will cause an unhandled exception 1/100000"
- **Useful_Market1609** (2↑): already leaked btw
