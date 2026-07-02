---
id: social-intelligence/reddit-deep/productmanagement/1sifecx.md
url: "https://www.reddit.com/r/ProductManagement/comments/1sifecx/update_on_product_driven_development_experiment/"
kind: "social-post"
source: "reddit-deep: r/productmanagement"
subreddit: "productmanagement"
title: "Update on Product Driven Development (Experiment - transformation) /3"
author: "Independent_Pitch598"
date: "2026-04-11T10:24:49.000Z"
score: 13
upvote_ratio: 0.74
num_comments: 24
flair: ""
extracted_at: "2026-06-24T22:14:23.450Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/productmanagement/1sifecx.md#c0"
    char_span: [0, 1978]
    sentence_count: 4
    key_terms: [productmanagement, comments, sprints, new, experiment, reddit, https, com]
    concepts: [productmanagement, comments, experiment, sprints, reddit]
    token_count: 520
    sources: [{"n":"reddit-deep: r/productmanagement","u":"https://www.reddit.com/r/ProductManagement/comments/1sifecx/update_on_product_driven_development_experiment/"}]
  - id: "social-intelligence/reddit-deep/productmanagement/1sifecx.md#c1"
    char_span: [1980, 4155]
    sentence_count: 6
    key_terms: [agents, product, agent, however, developer, attached, anyone, review]
    concepts: [agents, product, agent, however, developer]
    token_count: 482
  - id: "social-intelligence/reddit-deep/productmanagement/1sifecx.md#c2"
    char_span: [4157, 5646]
    sentence_count: 13
    key_terms: [build, issues, interesting, dev, developer, building, everyone, company]
    concepts: [build, issues, interesting, developer, building]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1sifecx.md#c4"]
    token_count: 325
  - id: "social-intelligence/reddit-deep/productmanagement/1sifecx.md#c3"
    char_span: [5660, 7623]
    sentence_count: 14
    key_terms: [code, review, quality, measuring, metrics, release, agents, core]
    concepts: [review, quality, measuring, metrics, release]
    section: Comments
    token_count: 487
  - id: "social-intelligence/reddit-deep/productmanagement/1sifecx.md#c4"
    char_span: [7625, 8801]
    sentence_count: 7
    key_terms: [building, interesting, code, approach, feature, request, review, solid-aardvark-4590]
    concepts: [building, interesting, approach, feature, request]
    related_chunks: ["social-intelligence/reddit-deep/productmanagement/1sifecx.md#c2"]
    section: Comments
    token_count: 301
---
# Update on Product Driven Development (Experiment - transformation) /3

Source: [reddit-deep: r/productmanagement](https://www.reddit.com/r/ProductManagement/comments/1sifecx/update_on_product_driven_development_experiment/)
Posted by **Independent_Pitch598** · **13↑** · **24 comments**

This is the 3rd part of my notes regarding experiment(s) that we are having in my org.

**The main goal of experiment that my org decided to launch more than 2 month ago:** 

`Can SDLC (Software Development Cycle) be updated to AI era?` 

`And if yes - How? What are the new roles of Devs and PMs?`

**Previous parts:**

1. [https://www.reddit.com/r/ProductManagement/comments/1r4h4r3/it\_becomes\_much\_easier\_and\_faster\_to\_explain\_what/](https://www.reddit.com/r/ProductManagement/comments/1r4h4r3/it_becomes_much_easier_and_faster_to_explain_what/) \- Initial trial start, Can PMs do work of coders? Initial SDLC updates
2. [https://www.reddit.com/r/ProductManagement/comments/1rnasz9/update\_on\_product\_driven\_development\_experiment/](https://www.reddit.com/r/ProductManagement/comments/1rnasz9/update_on_product_driven_development_experiment/) Result of \~Month trial, New business metrics, New team sizes

**TLDR:**

* New SDLC with smaller teams in the whole company
* 1W/2D sprints
* Defined Responsibilities
* Board for Agents
* Anyone can Build

After last experiment, it was decided on company level to apply new approach to almost all teams, it means that now we have:

 **Product/Feature teams:**

* Product Manager + 2 Senior Developers + 8 Agents + 1 QA

Previously we were experimenting with another Ratio like 1/5 1/3, but this setup works very good. 

One of devs in the team must be AI experienced, the second can be not, the duty of the first will be to teach another one how to do new SDLC with agents.

**Sprints**:

* 2W --> 1 Week sprints
* Experimental teams (Apps, Frontend oriented) works with 2D sprints (2 sprints in a week + 1 day for cleanup/align)

**Responsibilities in the team:**

* **Product Manager**: 
   * Owner of the Product and/or feature - all decisions made by him, he owns P&L and align with stakeholders, however full ownership and "final word" is with PM. 
   * Create requirements for changes, launch agents by himself or assign requirements to developer.
   * Approve PRs/changes from other teams (that was not requested by him)
   * Bonus attached to: Revenue
* **Developers**: 
   * Help Product Manager to succeed with implementing his plan
   * Review what agents produced (in auto/manual) way, fully responsible for anything that goes into prod, regardless if it was written by him or not agent.
   * Configure harness for agents, update Agent Skills
   * Review PRs from other teams towards product that he work on
   * Bonus attached to: SLA, TTM.
* **QA:**
   * Configure agents to do verification and launching feedback loop that creates a PR for auto-fix issues
   * Fully responsible for quality of the product. 
   * Bonus attached to: Critical Bug ratio.

This setup is no more experiments but it is regular work.

  
However **more experiments** running that i'd like to tell you:

* Board for Agents
* Anyone can Build

**Board for Agents**

Currently we use Jira MCP to provide context for agents and allow agents to automatically take task, get context, move task to review when it is done. However we are exploring better options (if you know what is better - let me know, if feels like it is a missing part of fully automated SDLC)

However even with Jira it works fine, we have flows that triggers different agents based on ticket status. 

* Building - developer agent
* Testing - QA agent
* Deploy & Monitor - DevOPS agent

**Anyone can Build**

This is a cool experiment that is already 3 weeks running - our CEO decided that it would be great to allow everyone in company to build things and change things in existing products.

As a result now we have a policy: Open Repository - it means that anyone, janitor, HR, PM or developer can raise a PR. 

Then this PR will be reviewed by owner of the system and if it makes sense - merged.

**How it is possible?**

Actually - quite easy.

1. All in company got access to Claude Code or Codex
2. Training started on "what is GIT" how it works - basically we are doing bootcamp for everyone in the company
3. We allow everyone to build internal software for themself
4. Before final production deploy - to goes to final review by Reviewers team (developers do - review and help others to build, looks very much like devops)
5. Bonus program for the best feature + Open roadmap with features - it means that during free time lawyer can take feature from the board, build it and provide PR to PM for approval. 

This pilot is even more existing to my opinion in comparison to Agent-First teams (PDDQ - PM+Dev+Dev+QA). 

I already see quire interesting results - other departments starting to fix issues in products that they new was done badly but no one fixed it due to low priority or lack of resources.

Another interesting change that i can see: it is no more enough to be dev to succeed, you need to know domain where do you building. Because otherwise we see that lawyer build better thinks faster than developer (result can have issues in arch or in underwood design - but it is fixed by our "Janitor" team).

If this experiment will be successful: We are thinking to outline/change the main purpose of Developer: Facilitate other to build, verify that it was done properly, help with issues, speed up with agents. Basically removing "building/coding" as a main responsibility from Devs. 

  
Next update in one/two month(s).

## Comments

- **igharios** (3↑): One to two month?  I can't wait that long!

This is very interesting. I would love to know what are the metrics you are measuring and areas you keeping an eye on?

Someone asked about customer value on the other thread, what about quality? or who produces the "best" code?

I look forward to learning more about this!
  - **Independent_Pitch598** (2↑): > I would love to know what are the metrics you are measuring and areas you keeping an eye on?

**Metrics:**

* TTM
* NPS 
* TCO/P&L (reduction of L)
* Churn 
* Bug fix time (from identification to fix)
* Bugs/Release ratio

>Someone asked about customer value on the other thread, what about quality? or who produces the "best" code?

We have tiers of review for different part of the code/system:

(Level of criticality / % of changes)

* LOW / 60%
   *  It means that if it is landing page designer/PM can push straight to prod, after auto-review by agent (accepting risks). Agent can block release and invite dev for manual review. 
* Medium / 20% 
   * APIs but not a core function, mostly facades. Review by 2 agents + one Developer required. any of 3 can block release.
* High / 15%
   * Core functionality. Review by 3 agents + 2 Developers.
* Max / 5%
   * DB changes that impacts core logic, payments or billing. 3 agents 2 devs + approve by SRE.

One of the goal of SRE+Devs - to reduce systems in high/Max levels via changing architecture. so even failure of service don't do full degradation of service.

Regarding quality: We decided stop measuring quality of the code according to human/legacy pattern, only verify via different tests. Because our VP Of development understand that in next 2 years no one will be reading code manually/raw.
- **TomfromLondon** (2↑): So a PM approves code PRs? This is the only bit that doesn't make sense to me
  - **Independent_Pitch598** (2↑): From Product point of view - yes, as soon as it is approved it will go to Developer for review.

This approach is for - if change originated from outside to initial product team.
    - **TomfromLondon** (3↑): Ahh so not approving the pull request, as in the code?
- **Solid-Aardvark-4590** (2↑): Interesting approach, can't wait to see the results! 

What's the engineers perspective on this? Is it drivinga 'code review' bottleneck with 'slop' PRs? 

I'm building in a very simmilar space, would love to have a chat!
  - **Independent_Pitch598** (1↑): They were not happy because they lost some power and exclusivity on "build". 

But that was the goal - to remove monopoly of building from one department and enable everyone.

I wouldn't say we have a lot of "slop" PRs, one of the goal for devs is to do Agent SKILLS and harness for agents so they generate code that they want.
- **Kancityshuffle_aw** (1↑): What are some downsides of the experiment so far?
  - **Independent_Pitch598** (1↑): Quality of PM should be really high, as a result hiring process are slower.
- **Thecrow05** (1↑): This is so interesting. So now PMs are moving from intaking and building feature request to review and approve complete feature..
  - **Independent_Pitch598** (1↑): PMs does both.
