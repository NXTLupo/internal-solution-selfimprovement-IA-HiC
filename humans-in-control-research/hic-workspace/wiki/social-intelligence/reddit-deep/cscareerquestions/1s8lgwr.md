---
url: "https://www.reddit.com/r/cscareerquestions/comments/1s8lgwr/i_analyzed_11k_available_dev_jobs_to_find_out/"
kind: "social-post"
source: "reddit-deep: r/cscareerquestions"
subreddit: "cscareerquestions"
title: "I analyzed 11k available dev jobs to find out what skills employers are looking for right now"
author: "obolli"
date: "2026-03-31T12:03:03.000Z"
score: 1190
upvote_ratio: 0.97
num_comments: 184
flair: ""
extracted_at: "2026-05-26T12:54:26.385Z"
extraction_method: "praw-deep"
research_goal: "Identify emerging needs in the remote work sector."
---

# I analyzed 11k available dev jobs to find out what skills employers are looking for right now

Source: [reddit-deep: r/cscareerquestions](https://www.reddit.com/r/cscareerquestions/comments/1s8lgwr/i_analyzed_11k_available_dev_jobs_to_find_out/)
Posted by **obolli** · **1190↑** · **184 comments**

A couple of months ago I created a site for the Bolt Hackathon, users could input any career page or job aggregator and I’d scrape and notify them via email if a page or search they saved posted a new job.

That ended up not being scalable with just a few hundred users and urls being scraped daily.

But the scrapers are still running, and I have the data.

I wanted to see what companies are actually asking for, not just what people say is in demand.

I filtered by dev jobs because I lack the domain knowledge to really think of the questions for other types of jobs. And for it to be meaningful, I felt I should start small.

I extracted skills from job descriptions and separated them into required vs preferred when that was available. Then I grouped them by role.

So for example, I have categories like:

* AI engineer
* Machine learning engineer
* Data scientist
* Backend engineer
* Frontend engineer
* Mobile developer
* Full-stack engineer
* Software engineer
* Cloud architect
* Data engineer
* DevOps/SRE
* Quantitative engineer
* Research engineer
* Security engineer
* Systems admin/SysOps
* Vibe coder

And then I also grouped the skills into categories like:

* Languages
* Frameworks and libraries
* Cloud platforms and services
* AI/ML concepts
* AI/ML frameworks
* Architecture and capabilities
* CMS and web platforms
* Compliance and regulatory
* Containers and orchestration
* Data platforms
* Databases
* Developer tools
* DevOps and CI/CD
* Domain knowledge
* Embedded and hardware
* Message brokers
* Methodology
* Operating systems
* Protocols, APIs, and standards
* Security and networking
* Technical capabilities

I wrote a little bit about it on my blog and you can explore or try the dashboard if you like, you can input your skill sets and see what jobs you match with and what you could learn to match with more jobs.

Below is the raw data.
I do ML/AI by trade so I was most interested in that and things that stood out to me was something I have been feeling. 

- Machine Learning Engineers have really been taking over by building LLM apps.
- Python is everywhere, but that is mostly because there are more jobs available that need python than other roles. 
- Frontend is not looking for python at all but you have much fewer available positions. Mobile Developers too.

- Vibe Coding has become a job, and the skills and platforms they're looking for I don't know, and some of them I've never heard about, yet. Prompt engineering is a skill that's upcoming.

There are some skills that match very broadly across all CS roles.

And there are some platforms that are much more valuable to know.
Tensorflow isn't dying (interestingly). AWS is still more popular than Azure but not for all roles.

Sadly people look for Data Scientists that know Tableau and Power BI more and more.

RAG, Prompt Engineering are more sought after than traditional ML skills.

---

## Top 30 Skills Overall

| Rank | Skill | Category | Jobs | % of all jobs |
|---:|---|---|---:|---:|
| 1 | Python | Language | 2,815 | 41.1% |
| 2 | AWS | Cloud | 1,425 | 20.8% |
| 3 | React | Framework | 1,201 | 17.5% |
| 4 | TypeScript | Language | 1,138 | 16.6% |
| 5 | Docker | Container | 1,111 | 16.2% |
| 6 | SQL | Database | 1,100 | 16.0% |
| 7 | JavaScript | Language | 1,035 | 15.1% |
| 8 | Kubernetes | Container | 1,033 | 15.1% |
| 9 | Java | Language | 1,004 | 14.6% |
| 10 | Git | Developer Tool | 844 | 12.3% |
| 11 | Azure | Cloud | 796 | 11.6% |
| 12 | Node.js | Framework | 705 | 10.3% |
| 13 | PostgreSQL | Database | 670 | 9.8% |
| 14 | HTML | Protocol/API | 576 | 8.4% |
| 15 | Terraform | DevOps/CI-CD | 568 | 8.3% |
| 16 | CI/CD | DevOps/CI-CD | 566 | 8.3% |
| 17 | CSS | Protocol/API | 524 | 7.6% |
| 18 | GCP | Cloud | 524 | 7.6% |
| 19 | PyTorch | AI/ML Framework | 500 | 7.3% |
| 20 | C++ | Language | 496 | 7.2% |
| 21 | REST | Protocol/API | 435 | 6.3% |
| 22 | C# | Language | 422 | 6.2% |
| 23 | Angular | Framework | 403 | 5.9% |
| 24 | Linux | Operating System | 388 | 5.7% |
| 25 | TensorFlow | AI/ML Framework | 373 | 5.4% |
| 26 | MySQL | Database | 355 | 5.2% |
| 27 | Go | Language | 350 | 5.1% |
| 28 | Kafka | Message Broker | 301 | 4.4% |
| 29 | PHP | Language | 295 | 4.3% |
| 30 | LLMs | AI/ML Concept | 284 | 4.1% |

---

## Top 10 Skills per Role Family

### AI Engineer (813 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 422 | 51.9% |
| 2 | SQL | Database | 111 | 13.7% |
| 3 | LangChain | AI/ML Framework | 108 | 13.3% |
| 4 | JavaScript | Language | 92 | 11.3% |
| 5 | AWS | Cloud | 92 | 11.3% |
| 6 | LLMs | AI/ML Concept | 85 | 10.5% |
| 7 | Azure | Cloud | 84 | 10.3% |
| 8 | Docker | Container | 83 | 10.2% |
| 9 | PyTorch | AI/ML Framework | 80 | 9.8% |
| 10 | Kubernetes | Container | 77 | 9.5% |

### ML Engineer (1,083 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 804 | 74.2% |
| 2 | PyTorch | AI/ML Framework | 330 | 30.5% |
| 3 | SQL | Language | 269 | 24.8% |
| 4 | AWS | Cloud | 268 | 24.7% |
| 5 | TensorFlow | AI/ML Framework | 250 | 23.1% |
| 6 | Docker | Container | 230 | 21.2% |
| 7 | Kubernetes | Container | 189 | 17.5% |
| 8 | Azure | Cloud | 166 | 15.3% |
| 9 | scikit-learn | AI/ML Framework | 129 | 11.9% |
| 10 | GCP | Cloud | 124 | 11.4% |

### Backend Engineer (1,122 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 381 | 34.0% |
| 2 | AWS | Cloud | 357 | 31.8% |
| 3 | Docker | Container | 318 | 28.3% |
| 4 | PostgreSQL | Database | 297 | 26.5% |
| 5 | Java | Language | 293 | 26.1% |
| 6 | Kubernetes | Container | 287 | 25.6% |
| 7 | TypeScript | Language | 271 | 24.2% |
| 8 | React | Framework | 251 | 22.4% |
| 9 | Node.js | Framework | 224 | 20.0% |
| 10 | Git | Developer Tool | 183 | 16.3% |

### Software Engineer (762 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 303 | 39.8% |
| 2 | Java | Language | 208 | 27.3% |
| 3 | TypeScript | Language | 187 | 24.5% |
| 4 | React | Framework | 170 | 22.3% |
| 5 | JavaScript | Language | 151 | 19.8% |
| 6 | AWS | Cloud | 146 | 19.2% |
| 7 | C++ | Language | 142 | 18.6% |
| 8 | Kubernetes | Container | 128 | 16.8% |
| 9 | Docker | Container | 123 | 16.1% |
| 10 | Git | Developer Tool | 116 | 15.2% |

### Full Stack Engineer (712 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | React | Framework | 402 | 56.5% |
| 2 | TypeScript | Language | 306 | 43.0% |
| 3 | Node.js | Language | 263 | 36.9% |
| 4 | JavaScript | Language | 229 | 32.2% |
| 5 | Python | Language | 198 | 27.8% |
| 6 | AWS | Cloud | 194 | 27.2% |
| 7 | Docker | Container | 158 | 22.2% |
| 8 | PostgreSQL | Database | 144 | 20.2% |
| 9 | HTML | Protocol/API | 132 | 18.5% |
| 10 | Git | Developer Tool | 130 | 18.3% |

### Frontend Engineer (626 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | JavaScript | Language | 255 | 40.7% |
| 2 | React | Framework | 250 | 39.9% |
| 3 | HTML | Protocol/API | 239 | 38.2% |
| 4 | CSS | Protocol/API | 237 | 37.9% |
| 5 | TypeScript | Language | 200 | 31.9% |
| 6 | Git | Developer Tool | 134 | 21.4% |
| 7 | Angular | Framework | 110 | 17.6% |
| 8 | Vue.js | Framework | 87 | 13.9% |
| 9 | Node.js | Language | 67 | 10.7% |
| 10 | Tailwind | Framework | 61 | 9.7% |

### Mobile Developer (197 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Swift | Language | 112 | 56.9% |
| 2 | Kotlin | Language | 78 | 39.6% |
| 3 | SwiftUI | Framework | 58 | 29.4% |
| 4 | Git | Developer Tool | 49 | 24.9% |
| 5 | Java | Language | 48 | 24.4% |
| 6 | MVVM | Architecture | 41 | 20.8% |
| 7 | Objective-C | Language | 37 | 18.8% |
| 8 | UIKit | Framework | 34 | 17.3% |
| 9 | REST | Protocol/API | 27 | 13.7% |
| 10 | Xcode | Developer Tool | 26 | 13.2% |

### Cloud Architect (196 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | AWS | Cloud | 87 | 44.4% |
| 2 | Terraform | DevOps/CI-CD | 67 | 34.2% |
| 3 | Azure | Cloud | 52 | 26.5% |
| 4 | Kubernetes | Container | 48 | 24.5% |
| 5 | Python | Language | 40 | 20.4% |
| 6 | CI/CD | DevOps/CI-CD | 35 | 17.9% |
| 7 | Docker | Container | 27 | 13.8% |
| 8 | microservices | Architecture | 25 | 12.8% |
| 9 | Infrastructure as Code | DevOps/CI-CD | 21 | 10.7% |
| 10 | TOGAF | Architecture | 20 | 10.2% |

### Quantitative Engineer (190 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 163 | 85.8% |
| 2 | C++ | Language | 71 | 37.4% |
| 3 | SQL | Database | 45 | 23.7% |
| 4 | Java | Language | 35 | 18.4% |
| 5 | Pandas | Framework | 23 | 12.1% |
| 6 | Linux | Operating System | 22 | 11.6% |
| 7 | NumPy | Framework | 21 | 11.1% |
| 8 | AWS | Cloud | 21 | 11.1% |
| 9 | CI/CD | DevOps/CI-CD | 16 | 8.4% |
| 10 | R | Language | 14 | 7.4% |

### Data Engineer (178 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 141 | 79.2% |
| 2 | SQL | Language | 139 | 78.1% |
| 3 | Snowflake | Database | 52 | 29.2% |
| 4 | Airflow | DevOps/CI-CD | 47 | 26.4% |
| 5 | Spark | Framework | 40 | 22.5% |
| 6 | AWS | Cloud | 40 | 22.5% |
| 7 | dbt | Framework | 37 | 20.8% |
| 8 | Databricks | Data Platform | 35 | 19.7% |
| 9 | Azure | Cloud | 35 | 19.7% |
| 10 | Scala | Language | 33 | 18.5% |

### Research Engineer (182 jobs)

| Rank | Skill | Category | Jobs | % |
|---:|---|---|---:|---:|
| 1 | Python | Language | 46 | 25.3% |
| 2 | thermodynamics | Domain Knowledge | 34 | 18.7% |
| 3 | quantum concepts | Domain Knowledge | 33 | 18.1% |
| 4 | classical mechanics | Domain Knowledge | 33 | 18.1% |
| 5 | E&M | Domain Knowledge | 33 | 18.1% |
| 6 | PyTorch | Framework | 20 | 11.0% |
| 7 | reinforcement learning | AI/ML Concept | 13 | 7.1% |
| 8 | JAX | Framework | 13 | 7.1% |
| 9 | C++ | Language | 13 | 7.1% |
| 10 | machine learning | AI/ML Concept | 9 | 4.9% |

### Systems Admin / SysOps (181 jobs)

| Rank

## Comments

- **lunargoblin** (235↑): This is genuinely an excellent data post. Feels like one of those quality posts from the old good days. I also wanted to share another[ post ](https://www.reddit.com/r/RemoteJobseekers/comments/1fdpeg2/how_i_landed_multiple_remote_job_offers_my_remote/)that might help people get away from job boards a bit and turn their skills into actual work, since it’s a list of recruitment firms for remote roles. Not on the same level as your data work, but it can still be useful for some people.
  - **obolli** (27↑): Thanks a lot for the compliment and sharing! This is quite a coincidence, the data I got and the page where it's hosted was originally me wanting to try to get people away from job boards (and onto company career pages) too.   
Ironically (and a happy coincidence) people submitted urls with query parameters so I have lots of custom linkedin searches etc too which enabled me to make this a broad scan.
  - **izamaverick** (-3↑): Why am I constantly seeing comments just like this now, am I the only one noticing this crap?
    - **0xjvm** (5↑): Yeah I mean I see this style of post ALL the time. 

The ‘google maps strategy’

Tbf I don’t think it’s a terrible idea and probably a net positive compared to just spam applying. But it’s still something seems to be almost copy pasta at this point.

Wonder who’s selling what at the end of it
- **isospeedrix** (78↑): Crazy how dead mobile dev is when everyone’s on their phones and using apps
  - **Holiday_Clue_1577** (37↑): Leaner teams in most companies
  - **obolli** (12↑): I can't say for sure, I think mobile might be more distributed as compared to the past, i.e. you might have someone doing UX, someone building Api and serving systems etc. and they do this for mobile apps but also other platforms.

I wouldn't know for sure, it's just that I built apps and in the end I use the same backends that I used for my web, desktop apps and I just do the UI again in swift/kotlin.

maybe some actual mobile devs could chime in here
    - **Holiday_Clue_1577** (5↑): Just leaner teams honestly
    - **isospeedrix** (3↑): No mobile devs chiming in LOL speaks for itself
    - **doingittodeath** (2↑): I’m a former mobile dev. We used to have two separate teams, iOS and Android, and recently they merged it into one team handling both platforms. 

I saw the writing on the wall when I was going through interviews a few years ago. I’ve been making the transition to leave and am currently in nursing school going through Psych rotations. I hope this helps!
  - **0xjvm** (7↑): What I’ve seen is typical companies focus on the web experience, and outsource/contract mobile apps. 

Now days 99% of the code is shared between web and mobile so it’s just glue to make it mobile ready, so these devs typically jump companies and aren’t a longer term role.
  - **SunJ_** (3↑): Iirc most are kinda like web apps. Plus the main ones already work and can't be dethroned, so not much work can be done to them.
Eg. You ain't going to delete WhatsApp for a new global messaging app
- **mile-high-guy** (76↑): Backend engineer needs to know everything. Even frontend
  - **0xjvm** (14↑): I think it makes sense, a good backend engineer can get by on the frontend typically - won’t be pretty or perfect, but passable. 

In my experience ‘frontend’ engineers are way more data flow/UI driven, and the inverse can’t be said for them at all. Many just don’t even care to learn backend principles
    - **mile-high-guy** (7↑): Just call the role full stack
    - **flexonyou97** (2↑): People are not a fan of my terminal gui
  - **Mental_Gur9512** (1↑): am a Java developer, but I don’t have the energy to learn frontend. I’m tired of studying and improving all the time. What are my options?
  - **8004612286** (-2↑): ?? React and Node are bottom 3 in a top 10 list
    - **mile-high-guy** (6↑): Look at Unique Skill Counts per Role
- **ImportantSquirrel** (59↑): A lot of these are easily transferable skills. For example are we gonna pretend that any decent JavaScript developer can't learn TypeScript and become productive in it in practically no time? Or a dev with experience in Docker can't learn Kubernetes? Or a dev with experience in GCP can't learn AWS? Or anyone with a half a brain can't learn Git? Unfortunately recruiters are too dumb to realize this and won't give you a chance if you don't have the exact skills on the job description. All this accomplishes is filters for unscrupulous candidates who are willing to lie about their experience.
  - **BuySellHoldFinance** (11↑): People want someone who can plug and play. Pick up a bug day one and solve it.
    - **GasVarGames** (8↑): The worst thing is that any competent dev with some AI will be able to do this.
    - **ImportantSquirrel** (1↑): Yeah, but that's short term thinking. Someone who ticks all the boxes might be more effective on day one, but someone who is a better developer but lacks experience in one or two areas will likely be more effective in a few months after he ramps up.
    - **NotRote** (1↑): I work at a startup, never worked in the stack prior to this job, picked up my first bug on my 3rd day had it solved the next day. Engineering is engineering regardless of stack, hell my previous stack was completely proprietary and predates C and now I’m a typescript dev
    - **theprogrammingsteak** (1↑): Pre AI, I started a job in going with 0 go experience. I was solving simple tasks right away. Its not that complicated
  - **fmmmf** (5↑): The issue is with the recruitment layer- if recruiters/AI resume filtering is NOT knowledgeable about how different languages /software can translate to another,  you're screwed as a candidate. I've spoken with more than enough recruiters who didn't know shit about tech - those are the ones who absolutely would say oooh you know Javascript but not Typescript sorry. Eyeroll.
    - **ImportantSquirrel** (2↑): Unfortunately that's been my experience with recruiters too.
  - **TheMemeExpertExpert** (3↑): i’d argue in favor of languages & clouds but docker and k8s are 2 different beasts
    - **ImportantSquirrel** (2↑): Fair enough, but I still think a developer with containerization experience could learn it pretty quick.
  - **commonsearchterm** (2↑): > are we gonna pretend... 

> Unfortunately recruiters are too dumb to realize this 

Answered your own questions
- **papayon10** (96↑): Finally a useful post here like the good old times
  - **obolli** (45↑): I used to hang out here a lot in my undergrads, people were really helpful.
  - **ImpostureTechAdmin** (5↑): u/papayon10 u/obolli For real, this sub (and ITcareerquestions) used to be awesome back before 2022. Tons of helpful advice, high effort posts, etc. Thank you OP for this post :)
    - **obolli** (2↑): thanks a lot, I didn't know about ITCareerquestions but I remembered this sub (I think I'm also still in the discord) from when I started CS. It was like a helpful and friendly version of meta stackoverflow lol. I haven't been here for a while but I posted it here because of my fond memories.
- **Amr_Yasser** (24↑): Python seems to be dominating
  - **darwinn_69** (39↑): Has been for a while. Its become the industry standard "let me whip up something real quick" tool.
    - **Vemyx** (7↑): It's also the most lenient to vibe-code with
  - **Spez_is-a-nazi** (12↑): The most popular AI frameworks are almost all in python.
    - **8004612286** (1↑): Most people aren't writing PyTorch code though
  - **obolli** (2↑): Yeah that was pretty crazy for me to see.   
But if you look further, that's mostly because AI and ML Jobs are dominating overall dev jobs. 

And I guess for backends that makes sense too because of the most popular libraries we have.
  - **Baxkit** (2↑): It is widely available, well maintained, multipurpose, and often the first and easiest language people learn. I find it interesting it is still so strong considering that AI/vibe can, and eventually will, decimate these roles. Anyone using python never cared about performance, scale, or elaborate engineering - so you find someone barely literate to sit in front of Claude or GPT, and they can pump out a fully functioning python app within minutes.
- **[deleted]** (19↑): This is very cool, thank you for sharing!
  - **obolli** (11↑): Thanks for saying that. I'm happy if it's useful to you.
    - **[deleted]** (6↑): It is, I’ve tried to push devs who have worked for me to get certs in the more widely adopted tech.

I.e. Get Databricks over Confluent because Confluent is more niche but I never had numbers to go off of.  I just guessed at which tech would be more widely used.

Cool to actually see numbers
- **YetMoreSpaceDust** (6↑): Wow, surprised to see Java so far down on the lists.
  - **butt-fucker-9000** (3↑): For Backend and Software Engineer, it's the second programming language, so I think for these roles it's well placed.

For mobile dev I was expecting it to be higher, but at the same time am not surprised, given that Google advises to use kotlin instead of Java for mobile development
- **utricularian** (5↑): RIP My Rails career
- **TheJrDevYT** (58↑): Surprising c# .net isn't making any significant number. Did you mean country and area your research is based in
  - **Sp00kyC4py** (62↑): ^^^ This. C#/.NET absolutely dominates backend for roles available onsite and hybrid (aka, the roles most realistically available) in Dallas Fort Worth. Java is actually behind here and used by very legacy corporations like some banks.

I see few if any Node backend roles besides for remote roles at startups.
    - **PromiseHefty** (22↑): It's the same for the Midwest but I'm talking about Kansas City here. Almost every role I see in KC has C#
    - **OnceOnThisIsland** (30↑): I'm in NYC and I have C# experience. I get contacted for C#/.NET jobs in this region often. I think major tech hubs have a wider variety of languages in job posts but most established companies here still use Java or C#. Node and Python just aren't as common as the list suggests.
    - **butt-fucker-9000** (1↑): How about C# vs Java for full remote  jobs? That's what I think most people are interested in.
  - **obolli** (22↑): Ah, I meant to add it you, can filter by country but I only considered Europe and United States + Canada jobs here.
    - **butt-fucker-9000** (1↑): Did you notice any differences between what companies look for in NA vs Europe?
  - **no_onions_pls_ty** (1↑): Im thinking that there isn't enough context and variable context around the statistical analysis.  C# is enterprise.  Enterprise has more linear roles- junior middle senior, staff/principal, architect, etc.   There are obviously less EA and Principal roles out there than sys admin.  Its an obvious data point. There are less ceo positions than call center roles available.  

In this way certain skillets are skewed or devalued in the analysis but not the market.

More of a - if your in school or out of work here are some paths that might be valuable, rather than here is the current state of the market.
  - **[deleted]** (-33↑): c# .net

These are old tech, anything you see for this is legacy.

From a sheer numbers standpoint new companies and new orgs are going to use modern tech so you’ll see a lot more jobs created using Python and Cloud

Any jobs that are c# .net are likely swapping out employees rather than net new jobs
    - **Jay_D826** (15↑): I don’t even know what to say to this. I don’t even intend to search for a C# job because I don’t care for Microsoft but to call it “old tech” only for legacy projects is kind of insane lol. 

C# is still insanely popular and used by a ton of legitimate and modern companies. Same with Java. Saying “you’ll see a lot more jobs created using Python and Cloud” is also strange. Most projects and companies reaching for C# don’t really have a reason to replace it with “Python and Cloud” because those technologies (cloud being a VERY broad term and not specific at all) are typically used for what C# is used for.
    - **Walrus_Pubes** (10↑): You have no idea what you're talking about, bud.
    - **FSNovask** (3↑): > These are old tech, anything you see for this is legacy.

.NET moves so much faster these days than the old .NET Framework.

There are valid criticisms of how MS has handled their products that are built with .NET though, like the native desktop frameworks.
    - **Sp00kyC4py** (3↑): Nope. C#/.NET is excellent for strongly-typed, business-logic-heavy systems that need strong support for containerization OR for Azure hosted services and/or async architectures and/or real-time architectures and/or serverless environments.

I liked NodeJS during my startup stint, especially for its strong compatibility with AWS. But when working with Azure, their support for C#/.NET is top-tier.
