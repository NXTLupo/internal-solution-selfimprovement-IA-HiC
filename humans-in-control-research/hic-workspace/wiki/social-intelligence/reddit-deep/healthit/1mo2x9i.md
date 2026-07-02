---
id: social-intelligence/reddit-deep/healthit/1mo2x9i.md
url: "https://www.reddit.com/r/healthIT/comments/1mo2x9i/after_a_year_trying_to_build_a_healthcare_app_ive/"
kind: "social-post"
source: "reddit-deep: r/healthit"
subreddit: "healthit"
title: "After a year trying to build a healthcare app, I've made the process short for all of you in 5 steps"
author: "GroundOld5635"
date: "2025-08-12T08:15:18.000Z"
score: 184
upvote_ratio: 0.94
num_comments: 110
flair: ""
extracted_at: "2026-06-22T20:50:35.548Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive strategic assessment of the \"State of the Healthcare and Life Sciences Industry in 2026 as it relates to AI Adoption for Providers, Consumers, Caregivers, and Payers,\" analyzing key adoption drivers, barriers, and high-impact use cases for each cohort."
engagement: "deliver-a-comprehensive-strategic-assessment-of-the-state-of"
chunks:
  - id: "social-intelligence/reddit-deep/healthit/1mo2x9i.md#c0"
    char_span: [0, 1549]
    sentence_count: 17
    key_terms: [step, months, app, compliance, healthcare, comments, healthit, thought]
    concepts: [months, compliance, healthcare, comments, healthit]
    token_count: 388
    sources: [{"n":"reddit-deep: r/healthit","u":"https://www.reddit.com/r/healthIT/comments/1mo2x9i/after_a_year_trying_to_build_a_healthcare_app_ive/"}]
  - id: "social-intelligence/reddit-deep/healthit/1mo2x9i.md#c1"
    char_span: [1563, 3292]
    sentence_count: 13
    key_terms: [clicks, click, extra, workflow, billing, epic, developers, features]
    concepts: [clicks, click, extra, workflow, billing]
    section: Comments
    token_count: 428
  - id: "social-intelligence/reddit-deep/healthit/1mo2x9i.md#c2"
    char_span: [3294, 4987]
    sentence_count: 10
    key_terms: [complaining, people, compliance, understand, building, problems, "didn't", hipaa]
    concepts: [complaining, compliance, understand, people, building]
    section: Comments
    token_count: 388
  - id: "social-intelligence/reddit-deep/healthit/1mo2x9i.md#c3"
    char_span: [4989, 7125]
    sentence_count: 19
    key_terms: [app, name, failures, people, does, characters, healthcare, compliant]
    concepts: [failures, people, characters, healthcare, compliant]
    section: Comments
    token_count: 497
  - id: "social-intelligence/reddit-deep/healthit/1mo2x9i.md#c4"
    char_span: [7127, 8140]
    sentence_count: 12
    key_terms: [research, selekt86, "don't", field, right, write, code, data]
    concepts: [research, selekt86, "don't", field, right]
    section: Comments
    token_count: 235
---
# After a year trying to build a healthcare app, I've made the process short for all of you in 5 steps

Source: [reddit-deep: r/healthit](https://www.reddit.com/r/healthIT/comments/1mo2x9i/after_a_year_trying_to_build_a_healthcare_app_ive/)
Posted by **GroundOld5635** · **184↑** · **110 comments**

Alright so I'm an idiot who thought building a healthcare app would be like any other startup. Spoiler alert: it's not.

**Step 1: Figure out HIPAA .** Thought patient data was just regular data. Nope. $15k for compliance stuff before I even wrote code. Now I have a 47-page document I pretend to understand.

**Step 2: Integrations.** Epic wants $25k just to talk to them. Took 8 months to get approved. Best part? Our app crashed every time someone with an apostrophe in their name tried to log in. Thanks O'Connor.

**Step 3: Timeline.** Told everyone we'd ship in 3 months. That was 14 months ago. Every simple feature becomes a compliance nightmare. Lost my first developer after the third audit.

**Step 4: Money disappears faster than you think.** AWS went from $500 to $3k a month. Had to hire a DevOps guy at $5k/month because everything kept breaking. Burned through $220k way faster than expected.

**Step 5: User research.** Spent 8 months on this beautiful interface. First doctor said it doesn't fit their workflow at all. Apparently clicking 5 times to schedule something is too much work.

Turns out there are pre-built components for all this . Would've saved me a year of pain and most of my money if I'd known that from the start.

## Comments

- **timbo1615** (165↑): The extra clicks really is a huge thing
  - **Danimal_House** (52↑): It’s the *only* thing, really. That and charging/RVUs if it’s integrated. Everything else can suck, but if they have less clicks and get paid, docs are (mostly) happy
    - **Turk-February** (12↑): The (mostly) is call.  Besides clicks and RVUs, If you can figure out how they be on-call less, you don’t need any other features.
  - **ElleGee5152** (13↑): I used to work for a practice management company in their in-house medical billing department. I worked with developers on projects related to new billing features fairly often as part of my job. I can't tell you how many times I sat with developers while they counted clicks for a billing task. Clicks matter.
    - **Rich_Reputation_7202** (0↑): Can you explain the need for extra clicks? Is it a money thing? More clicks more profit?
  - **Snarffalita** (12↑): Epic analyst here. I once had a doctor complain about one extra click in a workflow. He used the phrase "death by a thousand clicks." We removed the extra click.
  - **BookwormAP** (9↑): It's amazing how many people don't understand clicks = bad user experience
  - **AnEpicShitposter** (2↑): One of the metrics Epic tracks is the number of clicks performed by all users in all workflows, and when a workflow is changed or optimized, Epic compares the before and after effects.

Sometimes reducing a workflow by a single click will total up to billions of seconds saved across every doctor at every healthcare org. Multiple lifetimes worth of time saved just from the reduction/automation of a click.
  - **Feeling_Inside_1020** (1↑): Working for an EMR first in support now documentation, it's all about the clicks.

Also you get someone complaining about A, you evaluate the pros/cons and change it, then people B reach out complaining it changed. It's a never ending complaining game when tens of thousands of users a day sign in lol.
- **arkatron5000** (40↑): this hits close to home for anyone who's tried building in healthcare. That HIPAA rabbit hole is real  I've seen teams burn through their entire budget just trying to understand compliance before writing a single line of code.

Have you looked into platforms like specode? They've got pre-built HIPAA-compliant components (scheduling, video calls, EHR integration, etc.) that you can basically drag and drop together. Might've saved you from that $15k compliance deep dive
- **zodomere** (37↑): You're supposed to do the user research first. Sounds like you didn't plan your app very well or understand the requirements and dependencies very well.
  - **sonamata** (14↑): This drives me bananas & I'm the only person on my team that does this work. I've made a few good tools that previously resistant people use daily without issue. My team members make more tools that nobody uses, which have functional gaps because they didn't actually understand the full business process, the data type inputs/outputs, etc.
  - **Initial_Excuse2258** (1↑): what problems "burning hair" problems do you think do people have in the field right now (im similar to OP guy to this post)
- **uconnboston** (25↑): These are all the points that experienced Redditors here give the people who start “building my own EMR” threads. You didn’t even touch on security.
  - **WorkingInAColdMind** (12↑): They bought the HIPAA compliance document, so now it must be secure.

Edit: worked for a startup building medical app, and I swear the boss thought as soon as he clicked the “yes” box on a compliance form that said “we do X”, that it was magically true and the app was secure. I literally had to tell him “you can’t check the box until we’ve actually done the work.”
- **ComplicatedSyrup** (20↑): Yep. I’ve seen this exact story play out a few times. Everyone looks at the major tech companies that have entered and promptly left healthcare because of the challenge and think their own project will be different somehow.
- **senexii** (19↑): Why didn't you talk to your customers first?🥲
- **SIEMstress** (16↑): Gosh. HIPAA is important. But for the love of god, you can have a hipaa compliant app that is a shitshow security-wise. Broken access control, cryptographic failures, software and data integrity failures, logging failures, etc.

What you paid for and the security of your app are two different things. Please ensure you find the correct people to evaluate your product and provide it maintenance. Apps are not a create it and forget it thing.

I’ve evaluated thousands of healthcare products for my org and the amount of time the product is subpar is too often. And the people selling it say “well I got this paper I paid for that says I’m compliant” that is essentially an excel doc with no legal ramifications for inaccuracy.
  - **Over-Evening-3615** (1↑): Who does a good job?
- **polymath-nc** (13↑): If your code had a problem with apostrophes in names, I assure you that you are hiring junior developers with little experience, and you don't have enough QA techs.  It's essential to have the best senior analyst and the best QA who understand how to write requirements documents and how to use top-grade QA software with a solid plan for automatic regression testing.

For example:  Can a name be two words with a space between (Joe Bob)?  Does the name have a minimum number of characters (I've known people with a single letter for a given name)?  Does it require a given name *and* a surname (Cher)?  Hyphenated names (Smith-Jones)?  Accented characters (Renée)?  I could keep going. 

Don't write all the code, look for snippets from places that have vetted code.

Don't write your own email checks, either.  

Make sure to test every field against the appropriate ISO standard.
- **Biometrics_Engineer** (14↑): Isn't one supposed to bootstrap and pretest before applying for the compliance certifications to meet required standards?
- **selekt86** (24↑): I see some fundamental issues in execution. Why would you do user research after building the app? Thought patient data was regular data? You don’t need to know HIPAA deeply to figure that out. You needed a devops guy? For what kind of traffic? Are you sure you’re using the right services the right way? Over engineered maybe?
  - **sonamata** (6↑): I've done exactly 1 day's worth of reading in an Intro to Health IT textbook, and I understood your post, and where this guy went wrong. This is a failure to do basic subject matter research. Relatively, this is not a lightly regulated field.
    - **selekt86** (2↑): Mind sharing which book
