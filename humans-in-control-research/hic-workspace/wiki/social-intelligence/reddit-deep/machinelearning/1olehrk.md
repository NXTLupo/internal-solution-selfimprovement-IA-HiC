---
url: "https://www.reddit.com/r/MachineLearning/comments/1olehrk/d_realized_i_like_the_coding_and_ml_side_of_my/"
kind: "social-post"
source: "reddit-deep: r/machinelearning"
subreddit: "machinelearning"
title: "[D] Realized I like the coding and ML side of my PhD way more than the physics"
author: "PurpleCardiologist11"
date: "2025-11-01T03:56:20.000Z"
score: 69
upvote_ratio: 0.92
num_comments: 16
flair: "Discussion"
extracted_at: "2026-05-11T17:27:06.580Z"
extraction_method: "praw-deep"
research_goal: "Identify the most modern approaches to AI-assisted code development as of May 11, 2026, and no earlier than April 2026, such that the highly technical approaches to AI model context, determinism, instructing, and prompting can be extracted and applied to research and AI development tools"
---

# [D] Realized I like the coding and ML side of my PhD way more than the physics

Source: [reddit-deep: r/machinelearning](https://www.reddit.com/r/MachineLearning/comments/1olehrk/d_realized_i_like_the_coding_and_ml_side_of_my/)
Posted by **PurpleCardiologist11** · **69↑** · **16 comments**

Hey everyone, I’m a 2nd-year ChemE PhD student working on granular media with ML, so, technically, my research is about the physics of these systems. But lately I’ve realized I get way more excited about the numerical modeling and machine learning part than the physics itself.   
  
I love building models, debugging, testing new architectures, running simulations… but when it comes to actually digging into the physical interpretation, I kinda lose interest   
  
The thing is, I don’t have a CS background, and I usually write “prototype” code that works, but it’s not what you’d call clean software. I never learned data structures, algorithms, or how to structure large projects properly.   
  
After my PhD, I think I’d like to move more toward computational or ML-heavy work, something like scientific computing, data-driven modeling, or applied AI for physical systems.   
  
For anyone who’s gone down a similar path:   
\- What kind of skills should I start developing now?   
\- How important is it to learn formal CS stuff (like algorithms and software design)?   
  
Would love to hear what worked for you. I feel like I’m starting to see where I actually fit, and I just wanna steer myself in the right direction.

## Comments

- **LetsTacoooo** (33↑): ML is a very empirical field so do lots of applications so you learn lots of techniques. 
Take internships in software positions so you learn design. Don't focus too much on the algorithms/data structures, read more modern dev books and focus on getting those computational papers (that's your PhD currency).
  - **TajineMaster159** (7↑): >modern dev books

do you have recommendations?
- **boccaff** (9↑): Often, everything but our thesis become interesting, especially with new things. If prototyping ML is fun, with time you will also reach the boring and uninteresting parts of empirical ML. All the memes about cleaning the house and organizing drawers are there for a reason.
- **umboose** (8↑): I was in a very similar position ~10 years ago (just replace chemistry with medical imaging)


I am currently an AI engineer (LLMs) for the day job, and do open source AI development (more physics based AI) for fun/community spirit.


I would suggest that as a PhD student, your top priority skill is learning how to learn. Then pick and choose what you need depending on what you want to do.


This means that you can approach a larger set of problems with less fear, and have a better idea of what advice to follow and what to drop. As you gain more experience, you'll very quickly be able to grok a new system and understand tradeoffs.


On writing "production-level" code - it very much depends on the consequences of it breaking. The best way to learn how to do this is an internship/actual job as a software engineer, I have a very dim view of courses/youtube/textbooks in this space, the signal-to-noise ratio is very low. Basically you need to be writing code for long enough that your decisions come back to bite you in the butt - the shorter that feedback cycle the faster you'll learn
- **SuperGeilerKollege** (2↑): I‘d stick with physics. Job market for SDEs is collapsing and MLEs have maybe a runway of 3 years left.
  - **fnands** (4↑): How do you reckon? That's somewhat of a bold statement
    - **SuperGeilerKollege** (2↑): You‘re right, perhaps a bit too bold for not providing any supporting evidence.

Regarding SDE job market, it’s the rolling layoffs at major companies (msft, amzn, …)

There are also some articles covering how hard it is for junior graduates to find a job. https://www.seattletimes.com/business/college-graduates-face-toughest-job-market-in-more-than-a-decade-as-hiring-slows/

My company, and a previous is very focus on hiring senior engineers, who then use Claude code or similar, instead of junior developers.

Then there are very dark predictions like these: https://www.lesswrong.com/posts/bb5Tnjdrptu89rcyY/what-s-the-short-timeline-plan
  - **boccaff** (4↑): +1
Physics have a nice balance on developing advanced math skills and learning how to express/develop an underlying model of phenomena. Those skills are way more important than "structuring a project" or whatever "clean" thing some devs push.
- **cinnamon-passion** (1↑): I did my PhD in Nuclear Engineering and was exactly in the same spot. I just started focusing on the ML/AI and software engineering side more. Took a bunch of Coursera courses to get familiar with the fundamentals and did a part time job as a software developer. I am now very happily on my third job in the AI / Software side (no longer work on physics or academia)

Learning formal is good to have but not generally needed. Most of the interviews I went through when I graduated on 2021 here in San Francisco where on the general applied ML knowledge.
- **fnands** (1↑): Somewhat similar path here: I went Physics PhD to ML Engineer. I was also liking ML more than the physics.  


I would say some baseline software skills are helpful. You don't need to be as good as straight SWEs, but just knowing basic best practice helps.  I.e. containers, linting etc.   

If you are going for MLE roles at companies you might run into leetcode style questions during interviews, so helpful to have at least an idea of DSA. When applying for my first role after my PhD I failed one interview badly due to not expecting DSA. 

Data Scientist roles might have fewer coding requirements.   If you stay in academia the requirements might be less strict.   

But I would say just trying to get up to speed with basic software best practices will help, and then focus on the type of ML you want to do, i.e. NLP, CV, time series, or whatever it is you want to work in.
- **corgibestie** (1↑): Same. I did a PhD in a chem-adjacent field, did a postdoc applying ML to my domain, realized I like coding a lot more than being in the lab, now I'm a data scientist in my domain. 

The most important thing is getting that domain experience. There are a ton of people with the SWE skills, but not a lot with domain experience AND (even just a little) experience writing code. Find a domain you want to specialize in (or several) and build projects (esp. papers since these are even better than projects).

As for software skills that helped me, it's mostly clean code and moving from jupyter notebooks to orchestratable .py files. Learn to used the cloud. I don't directly use algos and systems design, but they are very useful ways to think so I recommend you learn it. I've had junior engineers who wrote code that works but were horribly inefficient, and understanding which parts of their code are the bottleneck steps helped me a lot.

Caveat, I am currently taking a part-time MS CS. This helped me a LOT in finding DS jobs (my combo of PhD in my domain + MS CS make me a "perfect" DS candidate) but the skills aren't as useful at work.
- **drc1728** (1↑): It sounds like you’re drawn to building and iterating models, the computational side, rather than the underlying physics. That’s a valuable insight and aligns well with careers in scientific computing, ML for physical systems, or applied AI.

I’d focus on solid coding practices, algorithms, data structures, and software design. Even “prototype” code benefits from modular structure and efficiency. Strengthen your numerical methods, statistics, and ML pipelines. Side projects or open-source contributions, like building small AI agents or workflows similar to what CoAgent (coa.dev) showcases, can give practical experience and make the transition smoother.
