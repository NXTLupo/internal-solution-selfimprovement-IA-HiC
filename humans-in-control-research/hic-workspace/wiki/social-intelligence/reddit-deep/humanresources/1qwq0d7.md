---
id: social-intelligence/reddit-deep/humanresources/1qwq0d7.md
url: "https://www.reddit.com/r/humanresources/comments/1qwq0d7/roast_my_screening_process_am_i_automating_too/"
kind: "social-post"
source: "reddit-deep: r/humanresources"
subreddit: "humanresources"
title: "Roast my screening process: Am I automating too much? (Founder doing his own hiring) [N/A]"
author: "Anxious_Departure_34"
date: "2026-02-05T16:32:26.000Z"
score: 0
upvote_ratio: 0.38
num_comments: 42
flair: "Recruitment & Talent Acquisition"
extracted_at: "2026-08-13T16:56:19.274Z"
extraction_method: "praw-deep"
research_goal: "Analyze the executive search industry to map current trends against DSG Global's specific operational pain points (as well as market research validated industry-wide use cases), producing a structured assessment of targeted AI use cases, their implementation feasibility, and expected efficiency gains to address these challenges."
engagement: "analyze-the-executive-search-industry-to-map-current-trends"
chunks:
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c0"
    char_span: [0, 1986]
    sentence_count: 10
    key_terms: [candidates, agent, technical, founder, humanresources, final, instantly, questions]
    concepts: [candidates, technical, agent, humanresources, founder]
    token_count: 493
    sources: [{"n":"reddit-deep: r/humanresources","u":"https://www.reddit.com/r/humanresources/comments/1qwq0d7/roast_my_screening_process_am_i_automating_too/"}]
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c1"
    char_span: [2001, 4082]
    sentence_count: 22
    key_terms: [candidates, whatsapp, applicants, rejections, quality, startup, losing, async]
    concepts: [candidates, whatsapp, applicants, rejections, quality]
    section: Comments
    token_count: 485
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c2"
    char_span: [4084, 5765]
    sentence_count: 13
    key_terms: [candidates, drop-off, human, engineers, interview, technical, whatsapp, because]
    concepts: [candidates, drop-off, human, engineers, interview]
    section: Comments
    token_count: 404
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c3"
    char_span: [5767, 7717]
    sentence_count: 15
    key_terms: [culture, candidates, end, time, want, experience, rejection, feedback]
    concepts: [candidates, culture, experience, rejection, feedback]
    related_chunks: ["social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c6"]
    section: Comments
    token_count: 451
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c4"
    char_span: [7719, 9625]
    sentence_count: 17
    key_terms: [technical, superchilltraveller, right, recruiter, workflow, garbage, "haven't", good]
    concepts: [technical, superchilltraveller, recruiter, right, workflow]
    related_chunks: ["social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c5"]
    section: Comments
    token_count: 469
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c5"
    char_span: [9627, 11643]
    sentence_count: 16
    key_terms: [recruiter, human, screening, technical, contract, going, chat, "i'm"]
    concepts: [recruiter, human, screening, technical, contract]
    related_chunks: ["social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c4"]
    section: Comments
    token_count: 489
  - id: "social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c6"
    char_span: [11645, 13985]
    sentence_count: 15
    key_terms: [candidates, need, candidate, person, good, like, time, experience]
    concepts: [candidates, candidate, person, experience, process]
    related_chunks: ["social-intelligence/reddit-deep/humanresources/1qwq0d7.md#c3"]
    section: Comments
    token_count: 512
---
# Roast my screening process: Am I automating too much? (Founder doing his own hiring) [N/A]

Source: [reddit-deep: r/humanresources](https://www.reddit.com/r/humanresources/comments/1qwq0d7/roast_my_screening_process_am_i_automating_too/)
Posted by **Anxious_Departure_34** · **0↑** · **42 comments**

I’m a technical founder bootstrapping a team, so I don't have an HR lead yet. I’ve been drowning in applications for our latest Full Stack role, so I built a semi-automated workflow to handle the volume.

It’s working incredibly well for *me* (saving about 15 hours a week), but some of my founder friends think it’s too "cold/impersonal."

I wanted to ask the actual pros here: **Is this workflow efficient or dystopian?**

**Current Process:**

1. **Inbound:** Candidate applies via form.
2. **The "Silent" Review:** An AI agent instantly scans their CV and—crucially—visits their GitHub/Portfolio links. It checks if their code actually matches the complexity we need (e.g., checks for unit tests, specific libraries).
3. **The "Pre-Screen" Chat:** If they pass the code check, the agent sends a dynamic WhatsApp/Email invite for a 5-minute chat. The agent asks 3 specific cultural fit questions and 2 technical logic questions based on their resume.
4. **My Involvement:** I **only** see the candidates who pass this. I get a summary: *"Match score 8/10. Good React skills, but weak on testing. Cultural fit: High."*
5. **Final Step:** I book the final interview.

**The Results:**

* I went from reviewing 200+ resumes to only looking at the top 15 candidates.
* Candidates actually seem *happier* because they get a rejection or next-step notification instantly (within 1 hour) instead of being ghosted for weeks.
* **But:** I technically don't speak to a human until they are in the final 10%.

**My Question:** As recruiters, would you hate this? Am I filtering out "hidden gems" by trusting the agent on the technical validation? Be honest, roast me if this is bad practice.

## Comments

- **malicious_joy42** (15↑): Using WhatsApp is generally an immediate giant red flag to applicants. How many are you losing on this step?

An AI interview is usually going to filter out a lot of applicants, as well. Not communicating with a human until the final 10% is going to cause a significant loss of potentially quality candidates.
  - **Anxious_Departure_34** (-1↑): This is great feedback.

**On WhatsApp:** You are 100% right. I learned the hard way that this is highly regional. In LatAm or Asia, WhatsApp is standard for business. In the US/UK, it screams 'Scam.' I’ve actually updated the workflow to be **Email-first** for US/EU candidates for exactly this reason, with SMS/WhatsApp only as an opt-in for speed.

**On losing quality candidates:** It is definitely a trade-off. I am essentially betting that:

1. The 'False Negatives' (good candidates who leave because they hate AI) are a smaller number than the 'False Positives' (bad candidates who talk a good game but can't code).
2. Since we are a remote, async-heavy startup, a candidate who refuses to use an async digital tool might struggle with our actual work style.

But I admit this is a 'War Time' startup strategy. If I were hiring for a traditional enterprise or a non-tech role, this funnel would probably kill my talent pool.

Do you think an email-based async screen (no chat bot, just smart forms) feels less 'red flaggy' than the conversational agent?
- **Hunterofshadows** (19↑): Are you capable of making comments without AI? 

You get that we can tell right? 


I don’t know about your specific industry but if I get screened by AI, I’m out. Not working for a company that does that. You are absolutely costing yourself candidates.  Now in fairness, that’s not automatically a bad thing. As someone else put it, you are setting expectations and culture. 

Sending out rejections is great, honestly. I stress to managers that rejections are better than ghosting for sure.
  - **Anxious_Departure_34** (1↑): Lol, ouch. No AI writing this, just a tired founder typing on my phone between calls. 😅

But you're right about the self-selection. If a candidate sees an async technical screen as a dealbreaker, they would probably hate working here (we are fully remote/async). So I’d rather we both find that out at Step 1 than Month 3.

Glad we agree on the ghosting part though. That’s the main bar I’m trying to clear.
    - **Hunterofshadows** (7↑): I want you to go read your other comments, look at the formatting and then read the one you just gave me. 

Let me know if you think a human wrote the other ones.
- **goodvibezone** (9↑): You need to A/B test on leakage at the AI/Whatsapp screening stage. You could have a large number of qualified people - particularly with engineers - who don't want to do this.
  - **Anxious_Departure_34** (0↑): 100%. This was my biggest anxiety when I turned it on. 'Am I filtering out the laziness or the talent?'

I actually looked at the drop-off data last week:

* **Junior/Mid candidates:** Zero drop-off. They actually engaged *more* with the WhatsApp/Chat because it felt faster than a cover letter.
* **Staff/Principal Engineers:** You are right. I saw a \~15% drop-off on the initial 'invite' screen.

**However**, when I compared the downstream interview data: The 'AI Screened' candidates had a **90% pass rate** on the first human technical interview. The 'Direct Apply' candidates (from my control group) had a **40% pass rate**—mostly because I was letting in people who looked good on paper but couldn't code.

**My current fix:** I’m experimenting with a 'Skip to Human' button for candidates who have verified open-source contributions or Ex-FAANG on their resume. Basically, letting the 'high status' talent bypass the bot.

Do you think a 'Skip' button solves the ego problem, or is the mere presence of a bot a turn-off?
    - **RAthowaway** (3↑): Honestly, for sr level & up kind of talent the bot itself is a turn off and I don’t think the button will solve it.
- **mamalo13** (11↑): How do you KNOW candidates seem happier? If you saved all that time NOT reviewing 200 candidates, did you use that time to call them back personally and walk through their experience and ask their feedback?  Or are you just going by the people who you end up speaking to who have a vested interested in making you think they are a team player? 

At the end of the day as a leader you need to understand that your entire culture is connected to every step of the employee experience. Your culture is being created and defined here. If you want a more impersonal/technical culture then it sounds like you are crafting that. If you want a collaborative, thoughtful culture, I think you're showing you don't value those things so you would want to insert some human back into the process. 

I
  - **Anxious_Departure_34** (0↑): This is such a fair challenge. You hit the nail on the head regarding culture, it’s something I struggle with.

To answer your question on **'How do I know?'**: I actually did two things:

1. I added a simple 'thumbs up/down' feedback option at the end of the rejection notification.
2. I’ve had multiple candidates reply to the automated rejection email saying, *'Honestly, thanks for just telling me now instead of ghosting me for 2 weeks.'*

My philosophy (and I might be wrong here) is that the worst thing in recruiting isn't **automation**, it's **uncertainty**.

By automating the screen, I’ve reinvested that saved time into the candidates who pass. Instead of spending 10 minutes skimming 200 CVs, I now spend 60 minutes preparing for the interview with the top 5. The 'human' part has just moved further down the funnel where I think it adds more value.

But you are right, it sets a specific tone. We are a high-paced technical startup, so a rigorous technical gate feels 'on brand' for us, but I can see how this wouldn't work for a relationship-heavy role.
    - **mamalo13** (4↑): I think you're right, and we're seeing this a lot all over social media.........the idea of being ghosted is a VERY hot button topic right now and candidates are taking it very seriously.  But are you sure it's a net positive? Someone might feel glad to know the outcome, and also feel uncomfortable with the sterile nature of the the process. Both can be true. 

As someone who's worked in start ups for several years........my advice is to watch out for what you don't know.
- **SuperChillTraveller** (4↑): In this post you are a technical founder, in another post you are a lead recruiter. Make up your mind already. And we get it, you are here to sell your garbage recruitment workflow and this post serves as marketing for you
  - **Anxious_Departure_34** (-1↑): Fair call out on the titles, but that’s the reality of a 2-person bootstrapped startup.

On Monday I’m the 'Technical Founder' writing code. On Tuesday I’m the 'Lead Recruiter' screening 300 CVs. On Wednesday I’m the Janitor. Right now, the 'Recruiter' part of my job is the one that is broken, so that is what I am posting about.

As for selling: I haven't posted a link, I haven't asked for money, and I haven't named a company. I’m sharing a workflow I built to survive the inbox flood. If the workflow is garbage to you, that’s totally fine, stick to the manual way. But it saved my week.
    - **SuperChillTraveller** (7↑): Reddit needs to do something about these bot accounts trying to peddle their garbage n8n workflows
- **Next-Drummer-9280** (6↑): If you want to have a good employee experience in your company, it HAS TO start with good candidate experience.  Quick rejections don't equal good CX.

What you should do is find a contract technical recruiter for 20 hours a week to do a human review of your applications which can then be augmented with AI, not replaced by AI, to narrow the field.  Then they can do a phone screen - an actual human, not a WhatsApp chat (which, BTW, screams scam) - to further narrow the pool of folks you'll talk to.

Speaking with a human > chatting with a chat bot.

HUMANS make for a good CX, not AI.
  - **Anxious_Departure_34** (1↑): In an ideal world (or maybe after our Series A), I would do exactly that. I agree that a great human recruiter is unbeatable.

**The constraints I’m working with right now:**

1. **Budget:** I’m bootstrapping. A decent technical contract recruiter is expensive. If I pay them, I have less runway to pay the engineers I’m trying to hire.
2. **Technical Validity:** This is the big one. In the past, when I used non-technical contract recruiters, they would pass candidates who had great interpersonal skills but couldn't explain a basic API architecture. They were screening for 'vibes,' not skill.

The agent is definitely colder, but it actually reads the GitHub repos and code samples. It screens for *competence*, which feels like a fairer trade-off for me right now than screening for *keywords* or *charisma*.

(And fully agree on the WhatsApp point, I’ve already killed that for the US/EU pipeline based on the feedback in this thread. Good call out.)
    - **Next-Drummer-9280** (7↑): It seems like you missed the part where the AI AUGMENTS the human.

As an HR pro, I'm never going to advocate for solely AI screening.

As a potential candidate (not for your company; in general), I'm going to nope out of a process that requires a one way chat with a bot.  I'm also going to name and shame.

If you won't hire a recruiter, then spend some of those 15 hours on actually reviewing resumes.
- **KennyGaming** (6↑): Are you writing all these comments with AI too?
- **Prize-Meeting1779** (2↑): a) I saw AI and I was immediately turned off

b) Sending a response back within an hour doesn't really seem like you (the company) is taking the time to really take in what you learned about the person. We normally use Indeed and I have the rejection message set for 3 days after marking no so that candidates at least feel seen. Obviously there are occasions where we really like someone and will want to schedule the next step right away but still good to sleep on it.

c) I fear that this "streamlined" process can lead to a higher turnover rate, it's good to take time to find the right people vs save time now to have to offboard and rehire

  
If you are drowning in applicants, it could be that you need to revise the listing so you weed out the immediate no's. I like to revisit listings at least once a week and tweak them slightly to see if it changes candidate quality.
- **Delicious_Style_2676** (2↑): Automation can reduce ghosting, but the candidate experience depends on how transparent and reversible it feels. I’d add a simple human-review path for edge cases, tell candidates what the screen is measuring, and periodically review rejected candidates to make sure the filter isn’t quietly excluding good people.
- **babybambam** (1↑): \#2: I see this causing a lot of false negatives.  You could be screening out a lot of great candidates because the AI misinterpreted something.  I suggest having a scaled "no" for this that allows for weak-to-moderate rejections go through a personal touch process.

\#3: This needs to be done by a real person.  They don't need to be HR but they need to be a live person and it needs to be 15 minutes.  You need to get the candidate chatting in a real conversation to see if they'll be someone that the rest of the team can tolerate.  Note: If that isn't so much of a concern, then none of this step is really needed.  e.g. If they just need to hit production targets and they don't really need to interact with peers...there's no reason to gauge a culture fit.

Final Thoughts: This is not a system I would implement in my organization. Even at the C-suite level, I remain hands-on with recruiting for certain roles. The current version of this product communicates a cold, algorithmic experience that undermines trust and makes candidates feel dehumanized rather than valued.

You're welcome for the free consulting work, I guess.
