---
id: social-intelligence/reddit-deep/cscareerquestions/1nvbsz6.md
url: "https://www.reddit.com/r/cscareerquestions/comments/1nvbsz6/canada_no_growth_would_online_bs_in_software/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "Canada | No Growth | Would Online BS in Software Engineering Help? | Ageism | Future"
author: "hepennypacker1131"
date: "2025-10-01T15:45:52.000Z"
score: 15
upvote_ratio: 0.94
num_comments: 20
flair: ""
extracted_at: "2026-05-22T23:33:42.258Z"
extraction_method: "praw-deep"
research_goal: "Develop a comprehensive new co-op strategy for Northeastern University (NU) to significantly enhance learners' access to meaningful experiential learning opportunities across their entire academic journey, from pre-enrollment through graduate school. This strategy must integrate insights from NU's current statement of work, prior projects, and a fresh industry analysis of experiential learning and co-op engagement tactics."
industries: [higher_ed, workforce]
industry_method: deterministic
chunks:
  - id: "social-intelligence/reddit-deep/cscareerquestions/1nvbsz6.md#c0"
    char_span: [0, 1304]
    sentence_count: 13
    key_terms: [getting, cscareerquestions, career, engineering, interviews, companies, canadian, comments]
    token_count: 298
  - id: "social-intelligence/reddit-deep/cscareerquestions/1nvbsz6.md#c1"
    char_span: [1318, 3273]
    sentence_count: 12
    key_terms: [like, people, particularly, jwt, coherently, management, whatever, problem]
    section: Comments
    token_count: 434
  - id: "social-intelligence/reddit-deep/cscareerquestions/1nvbsz6.md#c2"
    char_span: [3275, 5186]
    sentence_count: 14
    key_terms: [degree, engineering, idempotency, like, projects, openapi, postman, design]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/cscareerquestions/1nvbsz6.md#c3"
    char_span: [5188, 7467]
    sentence_count: 23
    key_terms: [engineering, electrical, bachelor, canada, companies, germany, here, lol]
    section: Comments
    token_count: 516
  - id: "social-intelligence/reddit-deep/cscareerquestions/1nvbsz6.md#c4"
    char_span: [7469, 8424]
    sentence_count: 11
    key_terms: [get, deleted, education, software, degree, doing, hepennypacker1131, pixelphoenixforce]
    section: Comments
    token_count: 236
---
# Canada | No Growth | Would Online BS in Software Engineering Help? | Ageism | Future

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1nvbsz6/canada_no_growth_would_online_bs_in_software/)
Posted by **hepennypacker1131** · **15↑** · **20 comments**

Hey everyone, I'd really appreciate any advice. I am sort at a crossroads in my career I guess. I’m based in Canada and don't have a degree in CS. I’ve been working in tech for about 10 years, mostly on backend REST APIs and some frontend for small Canadian companies. Was fortunate to start my career in Siemens. The pay has generally been below market rates. Back in 2022, I was atleast getting interviews (though I couldn’t convert them since I lacked React/front-end skills). These days, I’m hardly getting any interviews at all.

At this stage, would getting a BS in Software Engineering improve my career prospects? I’m considering options like WGU, or a Canadian university program that has a co-op component and try getting internships in big companies? Also with ageism and offshoring, I am becoming disillusioned with tech. I was really passionate but not anymore and was wondering swtiching careers like getting another bachelors in Civil or something.

Any advice would be greatly appreciated.

## Comments

- **BigCardiologist3733** (8↑): no
- **lhorie** (7↑): Speaking as someone who interviews candidates, I’m not going to be paying much attention if any to the education section of a resume for someone with 10YOE.

My guess is your problem is likely some combination of pigeonholing into a scope that is too narrow and not keeping abreast of modern practices within your general area of engineering (web, in your case). Imma guess you also haven’t done much to branch out of strict IC work into people management.

Ideally you should’ve been gradually working towards growth, e.g. react isn’t particularly hard to pick up, and hopefully you can also speak coherently about idempotency or optimistic updates or JWT or db normalization or whatever. And surely you would have had at least some technical mentoring opportunities by now. Or maybe you do have all of that under your belt, but your resume just doesn’t reflect it
  - **hepennypacker1131** (3↑): Thanks so much for the detailed advice. Like you mentioned, I think my main problem is that I’m not able to articulate concepts like OAuth, JWT, etc. coherently. I’ve been blindly building REST APIs and doing some front end work and I think I am lacking some of the fundamentals. Do you think pursuing a degree would help with this, or would it be better to just study these topics more deeply on my own?

Also I don’t think people management is the right path for me since I’m not particularly good in that area, so I’d prefer to stay on the IC track. Any advice would be greatly appreciated.
    - **lhorie** (7↑): AFAIK school doesn’t cover things like oauth, or really much of anything that might come up in a senior/staff level system design interview. People usually recommend things like the Designing Data Intensive Applications book and similar resources for high level architecture stuff, and you kinda have to tinker if you want to grok JWT or ARIA or GraphQL or whatever specific technology 

Full on people management is definitely not everyone’s cup of tea, but to be super blunt, it is one of the most realistic forms of upward mobility, especially in “follower” markets like Canada, and at a very minimum, the senior+ IC ladder involves progressively more technical leadership as you go up (things like establishing engineering practices and getting them actually adopted by eng teams/orgs)
    - **Key-Boat-7519** (4↑): Skip the degree; do focused self-study and ship one or two real projects that prove you know auth and API design.

Plan for 6–8 weeks: pick FastAPI or NestJS with Postgres and Redis. Build a REST API with OAuth (Auth0) and JWT (access/refresh, rotation), RBAC, pagination, rate limiting, idempotency keys, request validation, and tests. Generate an OpenAPI spec, add a Postman collection, deploy on [Fly.io](http://Fly.io) or Render, wire basic logs/metrics, and write a clear README with tradeoffs.

Drill fundamentals until you can explain them simply: OAuth flows vs JWT, 401 vs 403, ETags and cache-control, optimistic concurrency vs idempotency, n+1 queries, and safe rollback strategies. Do one system design a week (feed, search, notifications). Do 2 LeetCode mediums/day for three weeks to shake off rust.

Resume: link the live demo, OpenAPI, and repo; use problem-impact-tech bullets. IC growth without managing: own standards, write ADRs, mentor via PRs, lead small migrations.

I’ve used Postman for collections and Kong for gateway policies; DreamFactory helped me fast-generate CRUD APIs from a legacy DB during a prototype spike.

A degree won’t move the needle here; targeted practice, projects, and proof will.
- **543254447** (3↑): I had a coworker who did george Tech online master for CS. That could also be an option.

I don't have a CS degree and so far have no issue with a job for data engineering. I'm not sure what it is like for backend roles, though. 

If you have any bachelor degree,  that will probably check the box for a lot of companies.
  - **gill_bates_iii** (3↑): There's quite a few. Aside from GATech, there's also UIUC, CU Boulder, UT Austin, etc.
- **CyberEd-ca** (2↑): Do you have any post-secondary education (complete or incomplete)?
- **[deleted]** (2↑): Exchange Canada with Germany and it’s the same story here

>I’m also becoming pretty disillusioned with tech

exactly my fear

>like getting another bachelors in Civil or something.

Have you looked into Electrical Engineering?

I think Electrical Engineering is an excellent choice for the future, especially since you already have a CS bachelor. You can do traditional engineering, but also hardware and embedded work in IT.

No idea how it’s structured in Canada, but here in Germany it’s \~50% engineering and \~50% CS modules. So you can get a lot of credits recognized with a bachelor in CS.

But I’m biased since I enrolled in a CS master full-time and a part-time Electrical Engineering bachelor.
  - **hepennypacker1131** (2↑): Hey, yeah I keep hearing Germany is even worse. Sorry you are having to go through this. My first internship was at the Uni of Stuttgart lol and loved my time there haha.

And thanks for the advice. I haven't looked into electrical and will definitely look into it. It does sound really interesting. I will need to look what electrical engineering graduates are doing now. Many move to the US through the TN visa which is easy and only for Canadians. The issue here in Canada is that we don't many cutting edge tech companies and most of the work comes from the US lol. All of our clients are American companies.
    - **[deleted]** (2↑): Engineering is really refreshing to study.

The math is actually enjoyable because it focuses on calculations with real numbers rather than abstract proofs. It´s cool that you can apply it.  

I didn’t like the math in CS much. Sure, it´s nice that you can prove a statement, but it felt useless because you can not apply it.

>My first internship was at the Uni of Stuttgart lol and loved my time there haha.

awesome 😃

Canada is amazing too! 

I wish I could migrate there one day, but I am too old to get enough immigration points. It´s fine, Europe has amazing countries as well.

>Hey, yeah I keep hearing Germany is even worse.

Yeah it is pretty bad, especially for beginners like me.

But I think a bad economy is the best time to focus on education. So we will be ahead once things eventually improve.
- **[deleted]** (2↑): Go into a trade. Software is doomed.
- **[deleted]** (2↑): Degree is the least useful thing in software engineering. I have heard a lot people from CS major don’t know how to code after 4 years of education.
- **[deleted]** (2↑): You're not going to get a substantial boost in pay above market rates for employees unless you get really lucky.  Even then,  you'll just get taxed at a much higher rate.

What's your current degree?

Switch gears into doing contract or starting your own firm if you want to make more money.  The window slowly starts to close on you as you get older for doing this.
- **PixelPhoenixForce** (1↑): no lol
  - **hepennypacker1131** (1↑): Sorry? Doesn't make sense to get a BS? :)
