---
id: social-intelligence/reddit-deep/cscareerquestions/1odgohr.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1odgohr/new_grad_made_a_big_mistake_at_my_first_job/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "New Grad. Made a BIG Mistake at my First Job! Should I Start Thinking about Leaving?"
author: "Fearless-Cellist-245"
date: "2025-10-22T18:40:29.000Z"
score: 258
upvote_ratio: 0.93
num_comments: 140
flair: "New Grad"
extracted_at: "2026-05-20T03:56:10.737Z"
extraction_method: "praw-deep"
research_goal: "Develop a comprehensive co-op strategy for NU, integrating insights from current SOW, past projects, and fresh industry analysis of experiential learning and engagement tactics. The strategy must enhance learners' access to meaningful experiential opportunities from pre-enrollment through graduate school."
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c0"
    char_span: [0, 1497]
    sentence_count: 14
    key_terms: [cscareerquestions, everyone, thinking, mistake, branch, start, did, new]
    token_count: 340
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c1"
    char_span: [1511, 3444]
    sentence_count: 16
    key_terms: [time, biggest, company, deleted, accidentally, dev, something, college]
    section: Comments
    token_count: 499
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c2"
    char_span: [3446, 5311]
    sentence_count: 16
    key_terms: [company, because, "it's", like, something, yourself, without, branch]
    section: Comments
    token_count: 435
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c3"
    char_span: [5313, 7353]
    sentence_count: 16
    key_terms: [branch, merge, walkslikeaduck08, changes, without, access, review, able]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c4"
    char_span: [7070, 7693]
    sentence_count: 5
    key_terms: [engineer, process, always, right, etc, appropriate, engineering, incorrectly]
    section: Comments
    token_count: 132
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c5"
    char_span: [7695, 9990]
    sentence_count: 14
    key_terms: [branch, because, without, prevent, process, devops, review, regardless]
    section: Comments
    token_count: 504
  - id: "social-intelligence/reddit-deep/cscareerquestions/1odgohr.md#c6"
    char_span: [9992, 11542]
    sentence_count: 11
    key_terms: [branch, changes, mistake, process, deploy, devops, merged, pushed]
    section: Comments
    token_count: 371
---
# New Grad. Made a BIG Mistake at my First Job! Should I Start Thinking about Leaving?

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1odgohr/new_grad_made_a_big_mistake_at_my_first_job/)
Posted by **Fearless-Cellist-245** · **258↑** · **140 comments**

I graduated about 4 months ago and started immediately at a company I interned for. Was doing well at first but I made a pretty big mistake last week. I pushed a bad PR and commits that caused some issues to an important branch. Nothing in prod was affected but a couple engineers had to spend a day or two fixing my mistake and it did end up being a high priority issue that blocked some people. Mostly everyone was nice except a devops engineer who found the issue and was thorough about letting everyone know in every chat that I was the cause of the block. So its pretty well known to everyone that I messed up big-time. I merged a PR to the wrong branch without getting a review because I thought it wasnt required for this branch. 

I wouldnt usually be worried but we did have layoffs recently and I know an Eng2 who did get laid off during that cycle due to "performance issues." So this has me thinking im on the top of the list for the next lay offs. Maybe its best to get ahead of this now and start interviewing at other companies sooner than later? Its my fault so im thinking i should try to leave ASAP and start fresh somewhere new?

Note: New Grad Eng1 that started 4 months ago

## Comments

- **500_successful** (703↑): First time break something heh? First time but not last time, just chill, not your fault.
  - **bluegrassclimber** (179↑): this will happen again hahaha. 

Talk to any senior dev on your team how you feel bad about this, if they are nice they'll tell you about something they did that was similar
    - **ThatCakeIsDone** (2↑): Just the other day I accidentally deleted rm -rf /etc/systemd/system .... Thankfully it was on a sandbox machine and we could restore from yesterday's image....
  - **JaleyHoelOsment** (72↑): yup! your first time breaking prod is a rite of passage
    - **YetMoreSpaceDust** (42↑): He said he didn't break prod this time, so that's still on the horizon.
  - **KrispyKreme725** (34↑): My first screwup I deleted the entire security access table to a dev system. You could log on but had zero permissions. 

Senior dev showed me how to undo the mistake.  Never made the same one again. 

Everyone screws up. As long as learn from it no one cares.
    - **PlanktonPlane5789** (2↑): 2001, straight out of college - maybe a week into my first job - and our codebases were just on shared drives. No source control at all. I deleted it all by mistake.

Luckily it was ~10AM and they take nightly backups so we only lost 7 developers' work, each at ~1.5hrs.
  - **TeddyBearFet1sh** (14↑): Bro my first time cost my company 15k 💀
    - **vert1s** (4↑): The biggest problem I caused (at least partially) cost at least forty engineers two weeks to fix. It became known as a zombie apocalypse within the company, I was with the company for many years after that.
  - **HenryFordEscape** (11↑): IYKYK. A year or so out of college I took down one of the biggest services for one of the biggest cloud providers for an entire region. It wasn't *really* my fault; someone had accidentally changed some config that was going into a deployment I was running. But damn did I feel the adrenaline. 

I eventually learned that these things happen, and if a new grad is able to do something like that without oversight, it's the system that is broken.
  - **[deleted]** (4↑): The only way to not break things is to not do anything.
  - **vert1s** (1↑): This. You will break things. You will piss people off. You will be pissed off by other people breaking things. You’ll give them the benefit of the doubt just because you know that you’ve done something similar in the past. Welcome to programming.
- **theanxiousprogrammer** (734↑): It's their fault for not having mandatory review protection on that branch before being able to push.
  - **FlyingRhenquest** (127↑): I'm sure devops would really appreciate the ol "If you really think about it, this is kinda YOUR fault" speech. I mean, because it's true. And how often in your career do you really get to whip that one out? Not very often, if you're in a company with good processes and locked main branches!
  - **Spidey677** (26↑): I prefer having a dev looking over pull requests and approving them before they go into a development branch. Every place is different but I always like that extra step.
    - **PmButtPics4ADrawing** (2↑): Any company that doesn't make this standard practice is playing with fire. At my current company it literally blocks you from merging without two approvals
- **Zornp** (120↑): Be the best part of the remediation. Use it as an opportunity to learn. But I stress this, because in this post it sounds like you might have this tendency, do NOT overly blame yourself. 

You don’t need to harp on it, but use it as a learning experience. Perf issues are larger than just pushing one bad PR. If your team and company is reasonable, they’ll care a lot more about the fact that you won’t make this mistake again, and that you’re comporting yourself with professional responsibility. 

In the first year at one of my jobs, I caused a MASSIVE cloud service outage for about 1m users. But I took charge of the post mortem, and it actually got me my promotion because of my work on mitigating this in the future.
- **SnooDrawings405** (127↑): Why does a new grad have merge access is the real question we should be discussing. And you’re probably fine. Just don’t make a habit of doing these kinds of things.
  - **YetMoreSpaceDust** (24↑): He said he's been there 4 months, he ought to have merge access by now.  He's working in a branch (not in master), so it's not unreasonable for him to be able to commit to it without review.
    - **HenryFordEscape** (41↑): Merge access, sure - but to be able to merge without review to some "important branch" that could cause multiple engineers to spend multiple days to fix? That seems like a process problem.
- **Unlucky_Kale340** (43↑): That DevOps engineer needs a course in teamwork, clearly your first mistake and already calling you out.
- **walkslikeaduck08** (46↑): How'd you push a bad PR without it going through code review? Also it didn't go into main, so why didn't they just revert?
  - **Fearless-Cellist-245** (12↑): It was a very weird issue tbh that took a while to fix. When you make changes to this repo, you have to manually make PRs and push the changes to branch A -> B -> C, and then deploy in C so that it can be tested. I didnt know this and just pushed my changes to branch A -> C. In the process, somehow C was merged -> B. I dont know how this happened tbh. I think it may be because I solved the conflicts within github. Idk, I should have looked more closely. Then I merged this pr and it caused a ton of issues.
    - **walkslikeaduck08** (53↑): It just sounds like your company doesn’t have the appropriate controls and processes in place. But regardless, can you now articulate what you did incorrectly and would change in retrospect? If it’s an issue, I’d bring that up and show that you’re able to learn.
    - **TheTarquin** (32↑): That is a broken process and they should have guardrails to prevent these kinds of breakages. And engineering process that relies on every engineer always taking only the right actions and always in the right order will inevitably fail. If it wasn't you, it would have been another engineer who was new to the team and/or tired and/or distracted, etc. etc.

The process is broken, you just uncovered the impact of that brokenness.
    - **mikeemes** (12↑): If the devops eng was placing the focus on you and not the specific ticket or PR, I’m willing to bet everybody was rolling their eyes at that devops eng.
    - **reallyreallyreason** (5↑): Regardless, you should just be able to revert the changes. It's what git is designed to do and if you have some process where merging a branch to any "designated" branch other than a production release branch causes damage that requires manual intervention beyond just a simple reversion, your company's ops architecture is broken.
    - **throwaway_dddddd** (1↑): > I didn’t know this

You might feel guilty about this, and maybe you should have known better, but there’s always a bigger idiot and any organization needs to plan for that.  Even the best carpenters lose a finger sometimes.

How do you think the board would feel if their operating budget needed to increase with no increased revenue because nobody thought to add some failsafes or checks on people’s code changes?  They literally require code reviews (among other things) because they need a guarantee that things won’t break (and lose investors’ money).

If it wasn’t you then it would have been someone else.  If the process isn’t fixed then this will happen again, and that’s worse because now it’s known that there’s a problem.

The main thing to be worried about is whether you’ll be used as a scapegoat by whoever was supposed to prevent this problem or knew about it and didn’t do anything to prevent it.
- **Brief-Translator1370** (24↑): You're probably fine, shit happens even to experienced engineers. It shouldn't even be possible to do that without a review. In a lot of companies that's on DevOps for not implementing something very simple like that
- **PitiRR** (25↑): Baptized in fire, welcome

>I merged a PR to the wrong branch without getting a review because I thought it wasnt required for this  
branch.

That's weird, you shouldn't be able to merge without a review regardless if you think you need one or not. Did you explicitly select a message like "*Merge without waiting for requirements to be met (bypass rules)*"?

You can remediate this mistake by proposing a solution to prevent this happening again. Namely:

1. no direct commits to main
2. always need an approval review to merge branch
3. if your mistake could have been caught by an automated check like unit tests, improve your CI

Honestly that's on the devops guy, he's paid to prevent mistakes like these.
  - **Fearless-Cellist-245** (3↑): It was a very weird issue tbh that took a while to fix. When you make changes to this repo, you have to manually make PRs and push the changes to branch A -> B -> C, and then deploy in C so that it can be tested. I didnt know this and just pushed my changes to branch A -> C. In the process, somehow C was merged -> B. I dont know how this happened tbh. I think it may be because I solved the conflicts within github. Idk, I should have looked more closely. Then I merged this pr and it caused a ton of issues.
    - **PitiRR** (12↑): I hate nested branches, trunk-based development is way better for most scenarios. No wonder there was a human mistake in the process.

"I didn't know this" suggests the deployment process isn't documented or communicated enough, if your team doesn't want to change how you deploy I'd make a markdown file detailing how to contribute correctly.
- **Peephole-stalker** (8↑): How were you able to push to that branch if review was required? Ask that to the devops guy
- **coffee_swallower** (6↑): i did something similar as an intern, except it got pushed to prod and halted production until it was fixed. i still got a return offer, these things happen and its how you learn, youll be fine. you wont get laid off for one mistake
