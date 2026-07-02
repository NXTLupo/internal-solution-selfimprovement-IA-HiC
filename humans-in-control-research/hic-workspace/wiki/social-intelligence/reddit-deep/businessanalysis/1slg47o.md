---
id: social-intelligence/reddit-deep/businessanalysis/1slg47o.md
url: "https://www.reddit.com/r/businessanalysis/comments/1slg47o/a_massive_project_in_a_large_organization/"
kind: "social-post"
source: "reddit-deep: r/businessanalysis"
subreddit: "businessanalysis"
title: "A massive project in a large organization"
author: "Aaaaadriannnnn"
date: "2026-04-14T17:52:44.000Z"
score: 6
upvote_ratio: 1
num_comments: 9
flair: ""
extracted_at: "2026-06-23T20:32:15.458Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/businessanalysis/1slg47o.md#c0"
    char_span: [0, 1725]
    sentence_count: 17
    key_terms: [organization, project, businessanalysis, implementing, management, comments, redesign, because]
    concepts: [organization, project, businessanalysis, implementing, management]
    related_chunks: ["social-intelligence/reddit-deep/businessanalysis/1slg47o.md#c1"]
    token_count: 371
    sources: [{"n":"reddit-deep: r/businessanalysis","u":"https://www.reddit.com/r/businessanalysis/comments/1slg47o/a_massive_project_in_a_large_organization/"}]
  - id: "social-intelligence/reddit-deep/businessanalysis/1slg47o.md#c1"
    char_span: [1739, 3876]
    sentence_count: 14
    key_terms: [demystifying-business-analysis-for-business-owners-a-beginners-guide, message, project, best, here, businessanalysis, sponsor, https]
    concepts: [message, project, businessanalysis, sponsor, reddiquette]
    related_chunks: ["social-intelligence/reddit-deep/businessanalysis/1slg47o.md#c0"]
    section: Comments
    token_count: 508
  - id: "social-intelligence/reddit-deep/businessanalysis/1slg47o.md#c2"
    char_span: [3878, 4991]
    sentence_count: 6
    key_terms: [document, project, using, data, implementations, inconsistent, organization, unstructured]
    concepts: [document, project, using]
    section: Comments
    token_count: 223
---
# A massive project in a large organization

Source: [reddit-deep: r/businessanalysis](https://www.reddit.com/r/businessanalysis/comments/1slg47o/a_massive_project_in_a_large_organization/)
Posted by **Aaaaadriannnnn** · **6↑** · **9 comments**

I am working on implementing an electronic document management system (EDMS) in our organization. We employ 3,500 people. So far, everything has been going smoothly; the business side has been cooperative and eager to move forward. Suddenly, out of the blue, I had a conversation with a member of the management team that completely derailed the project.

Why? Because, according to them, implementing it in stages will not bring any benefits. They believe the PROJECT is a single entity, so we should address the entire organization and redesign all processes at once.

My idea was to start with the "piece of the pie" that would provide the most value - that first phase alone would generate annual savings in the hundreds of thousands, with an upward trend. The project would pay for itself within two years at most (assuming we did nothing beyond that first part). But no - apparently, that’s not enough. Since these changes won't result in firing a single person (LOL), it’s deemed not worth it. The logic is: if there’s no headcount reduction, the system is useless to us.

So, what am I supposed to do now? Mapping out every process in the organization will take an enormous amount of time. In many cases, it will require a complete process redesign because, unfortunately, the organization is outdated. I thought it was sensible to tackle this problem in stages, starting with what brings the most benefit, but it turns out I was wrong.

What would you do in my position?

## Comments

- **AutoModerator** (1↑): Welcome to /r/businessanalysis the best place for Business Analysis discussion.

Here are some tips for the best experience here.

You can find [reading materials on business analysis here](https://betterauds.com/businesses/demystifying-business-analysis-for-business-owners-a-beginners-guide/). 

Also here are the rules of the sub:

Subreddit Rules

* Keep it Professional.
* Do not advertise goods/services.
* Follow [Reddiquette.](https://www.reddithelp.com/en/categories/reddit-101/reddit-basics/reddiquette)
* Report Spam!


This is an automated message so if you need to contact the mods, please [Message the Mods](https://www.reddit.com/message/compose?to=%2Fr%2Fbusinessanalysis) for assistance.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/businessanalysis) if you have any questions or concerns.*
- **KetoNED** (10↑): Wo is the owner or sponsor of the project? The one that holds the bag of money is the one wo can derail a project.

Next to that talk to him and explain the consequences of his actions and showcase the money earned if you don’t follow his big bang release idea.
  - **Aaaaadriannnnn** (1↑): Boss and the boss is a good friend of the person who wants to derail the project. I’ll say this up front - I can’t talk to him because it’s impossible to get close to him. Literally. 
I know for sure that they don't know anything about all this, but they keep butting in.
    - **KetoNED** (4↑): Ok, but who is your manager? That person should then talk to these people.
- **crankysorc** (1↑): Your role  isn’t to make the decision on what provides the most value , nor on what the best approach is to achieve that value. 

However you do have the critical role in understanding the value that the project sponsor wanted and recommending the best approach to achieve it.

If someone proposes a change in scope or strategy then  depending upon the organization it can be up to a CAB - a board, or the sponsor - but you should be clarifying/ comparing the advantages/ disadvantages/risks of their options.

It is delusional ( not to say that you are 😉) to think that politics won’t factor in, prior to that meeting I recommend running it by someone with some power so you get their backing and input.
- **UBIAI** (1↑): EDMS implementations at that scale live or die on how well you handle unstructured document ingestion - that's where most projects stall. The mistake I see constantly is teams spending months manually mapping document types and fields before they've even validated what data they actually need downstream. What's worked better in my experience is starting with automated extraction pipelines that can pull structured data from messy, inconsistent docs on day one, then refining from there. There are tools we've been using that handles exactly this without heavy IT lift - the difference in project velocity was significant.
- **grimview** (1↑): How does the part of the project that "provide the most value" not "address the entire organization"? You are both basically saying the same thing, but using different terminology. Adopt this person's terms so it can understand what you are trying to say.
