---
id: social-intelligence/reddit-deep/cscareerquestions/1vkotck.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1vkotck/can_a_complex_game_dev_project_help_when_applying/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Can a complex game dev project help when applying for general SWE roles as a new grad?"
author: "withExtraDip"
date: "2026-08-10T15:57:11.000Z"
score: 2
upvote_ratio: 0.67
num_comments: 13
flair: "New Grad"
extracted_at: "2026-10-01T20:49:45.677Z"
extraction_method: "praw-deep"
research_goal: "Generate a comprehensive product requirements document (PRD) for Northeastern University's Experiential Learning Hub that synthesizes functional, technical, and UX specifications. Ground the requirements in the provided NXT Human SOWs, internal design comp feedback, and external competitor benchmarks, focusing on data integration, student companion features, and dashboard utility."
engagement: "generate-a-comprehensive-product-requirements-document-prd-for-northeastern-univ"
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1vkotck.md#c0"
    char_span: [0, 2115]
    sentence_count: 13
    key_terms: [project, structures, cscareerquestions, swe, general, destructible, professional, roles]
    concepts: [project, structures, cscareerquestions, general, destructible]
    token_count: 414
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1vkotck/can_a_complex_game_dev_project_help_when_applying/","kind":"social-post","date":"2026-08-10","author":"withExtraDip","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1vkotck.md#c1"
    char_span: [2130, 3951]
    sentence_count: 14
    key_terms: [projects, "you're", types, dev, web, relevant, complex, explain]
    concepts: [projects, "you're", types, relevant, complex]
    section: Comments
    token_count: 416
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1vkotck/can_a_complex_game_dev_project_help_when_applying/","kind":"social-post","date":"2026-08-10","author":"withExtraDip","subreddit":"cscareerquestions"}]
  - id: "social-intelligence/reddit-deep/cscareerquestions/1vkotck.md#c2"
    char_span: [3953, 6095]
    sentence_count: 17
    key_terms: [web, experience, customers, relevant, backend, ideally, project, someone]
    concepts: [experience, customers, relevant, backend, ideally]
    section: Comments
    token_count: 494
    sources: [{"n":"reddit-deep: r/cscareerquestions","u":"https://www.reddit.com/r/cscareerquestions/comments/1vkotck/can_a_complex_game_dev_project_help_when_applying/","kind":"social-post","date":"2026-08-10","author":"withExtraDip","subreddit":"cscareerquestions"}]
---
# Can a complex game dev project help when applying for general SWE roles as a new grad?

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1vkotck/can_a_complex_game_dev_project_help_when_applying/)
Posted by **withExtraDip** · **2↑** · **13 comments**

I'm a new CS grad with no internships or professional SWE experience. I have several full-stack projects and a game on Steam, but the project I've put the most engineering effort into is a Unity developer tool/package that I'm about to release.

I don't want to link the actual project, but it's essentially a tool for creating and simulating destructible structures. Users can visually build arbitrary structures in the editor, and the tool generates the geometry and data needed to make them destructible at runtime.

The destruction system tracks how structures are connected and supported, handles localized damage, and dynamically separates disconnected sections. It also simulates structural stress and visualizes how loads propagate through a structure, allowing users to identify weak points and understand why failures occur. I put significant work into runtime performance, including object pooling and a scheduling system that spreads expensive calculations across frames to prevent hitches during large destruction events. I also built the surrounding infrastructure needed to make it usable as a developer package, including a scripting API, configuration and validation systems, debugging tools, and documentation.

My concern is that I'm mostly applying to general SWE roles, particularly backend/full-stack/web. Obviously Unity-specific knowledge isn't directly relevant to most of those jobs, and I don't expect a project to substitute for professional experience.

For people who hire/interview juniors: would a project like this meaningfully strengthen a new-grad resume for general SWE roles, or does the game/Unity domain limit its value?

And if it is useful, how would you describe it on a resume so the transferable engineering stands out rather than it just looking like a game-dev project?

## Comments

- **kevinossia** (3↑): If it’s meaningfully complex then yes it could help. 

Describe it however you like, as long as it’s not embellished.
- **Icy_Cartographer5466** (2↑): I think it’s mainly valuable as something to talk about in an interview. Most places don’t have time to evaluate side projects and these days the default assumption is that it was all vibecoded anyway. But in a conversation you’d be able to demonstrate your involvement. I think actually shipping it is important though. Then it becomes an example of your ability to complete projects, which is more compelling than a technical demo where you’ve done mainly the fun parts. And having real users of course validates your work.
  - **MC_Hemsy** (2↑): I do hate how vibe coding has greatly taken away the validity of reviewing online hosted side projects, for the small crowd that still engage in that.
- **Chili-Lime-Chihuahua** (2↑): I think it's useful, but there are some caveats.

* How relevant is it to the types of roles you're applying for? If you just want a generic web app dev job, it would be cool, signal you're a geek with actual interest in the industry, but how relevant are you actual skills? It would be more of a bonus than anything.
* How complex is it, and how difficult would it be to explain the project? It could make you look worse if you struggle to explain it, if you're given the opportunity. 
* It would be very useful for certain types of roles. Not just game dev places but adjacent as well. I used to work for an agency (think consulting but more of an advertising focus). There were projects that were boring web app stuff, but they wanted to do more interesting projects with things like 3D, Unity, etc. It would be great for those types of positions, but I assume they are less common than a standard web dev job. 

I think you should include/feature the project, but try to decide where you want your focus to be. At the agency I worked at, there wasn't much overlap for the different kinds of teams/projects. You could joke there are the ones that were kind of neat/interesting, and there were the ones that made money for the company.
- **usmr_kanec** (2↑): Did you release demo? Did it have players/users? If so you can describe as a software with customers. "I made this project which was used by this many customers with this rating (if good)". If not then you can still probably sell it in the CV if written well, but take this advice with grain of salt. I do not have enough experience to tell you the correct solution.
- **my_peen_is_clean** (2↑): it absolutely helps if you frame it right focus on systems: scheduling, perf tuning, data modeling, apis, tooling, docs mention scale, constraints, measurable impact still wild that even with stuff like this it’s hard to get a foot in the door now
- **lhorie** (2↑): As someone on the hiring side for backendy/webby stuff, can't say I see gamedev resumes making through to final stages. For most of the industry, Unity isn't relevant at all, the closest domains usually require C++. For generic backend/web stuff, it's very much not relevant and might even give out flight risk vibes.
  - **withExtraDip** (2↑): I do have web apps on my resume. They aren't extremely impressive but I do have experience in web development. It is just really hard to make a web app standout on a resume these days. With the Unity package, I was at least hoping it would complement the web stuff by showing that I can make something novel, used by other developers, and most importantly can't be vibecoded
    - **lhorie** (1↑): Employers don't select for creative snowflakes, they want someone who can come in and hit the ground running doing [whatever needs to be done for that role]. If that's React stuff, then ideally you know the ecosystem. If it's SpringBoot, then ideally all your backend experience isn't just using FastAPI. Etc.

That's why I keep hammering on the relevance point, it really is that important.
