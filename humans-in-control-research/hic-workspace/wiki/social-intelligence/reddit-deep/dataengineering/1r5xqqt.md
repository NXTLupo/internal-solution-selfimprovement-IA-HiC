---
id: social-intelligence/reddit-deep/dataengineering/1r5xqqt.md
url: "https://www.reddit.com/r/dataengineering/comments/1r5xqqt/how_often_do_you_make_webhooks_and_apis_as_a_data/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "How often do you make webhooks and APIs as a data engineer?"
author: "ketopraktanjungduren"
date: "2026-02-16T02:43:09.000Z"
score: 40
upvote_ratio: 0.94
num_comments: 32
flair: "Help"
extracted_at: "2026-06-11T18:58:17.219Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1r5xqqt.md#c0"
    char_span: [0, 1244]
    sentence_count: 10
    key_terms: [work, data, dataengineering, webhook, app, automate, comments, engineer]
    concepts: [dataengineering, webhook, automate, comments, engineer]
    token_count: 290
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1r5xqqt/how_often_do_you_make_webhooks_and_apis_as_a_data/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1r5xqqt.md#c1"
    char_span: [1258, 3226]
    sentence_count: 12
    key_terms: [python, backend, ketopraktanjungduren, learning, redditreader2020, token, engineering, data]
    concepts: [python, ketopraktanjungduren, backend, redditreader2020, learning]
    section: Comments
    token_count: 466
  - id: "social-intelligence/reddit-deep/dataengineering/1r5xqqt.md#c2"
    char_span: [3229, 5050]
    sentence_count: 8
    key_terms: [data, software, engineering, themselves, analysis, development, engineers, frontend]
    concepts: [engineering, software, themselves, analysis, development]
    section: Comments
    token_count: 414
  - id: "social-intelligence/reddit-deep/dataengineering/1r5xqqt.md#c3"
    char_span: [5052, 7138]
    sentence_count: 11
    key_terms: [work, code, lot, management, endpoint, honestly, webhooks, deleted]
    concepts: [management, endpoint, honestly, webhooks, deleted]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/dataengineering/1r5xqqt.md#c4"
    char_span: [7140, 7719]
    sentence_count: 1
    key_terms: [problem, "you're", indefinitely, development, integration, maintaining, immediate, marketing]
    concepts: [problem, "you're"]
    section: Comments
    token_count: 107
---
# How often do you make webhooks and APIs as a data engineer?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1r5xqqt/how_often_do_you_make_webhooks_and_apis_as_a_data/)
Posted by **ketopraktanjungduren** · **40↑** · **32 comments**

Hey,

I work primarily with dbt and Snowflake but now have to wrestle with Flask (and possibly Django) which makes my life a lot harder (as for now)

We use a CRM that can integrate with WhatsApp Business but we can only get the historical chat data with webhooks. The platform requires us to have a webhook URL(s) to receive a set of data so I look for a free webhook URL service.

The next step is to make endpoints and automate all of these. I realize that I need some kind of an app and fortunately Python has Flask and Django. So build one to satisfy my user (automate lead collection etc).

But the concepts involved in building the app is rather unfamiliar to me: tunneling, TCP, content-type, etc I rarely heard any of them. I suspect they are not common in data engineering work thus the app I build is not DE at all; this seems to be the work for backend engineers.

How often do you make webhook at work? Is it true that this work is for backend engineer?

## Comments

- **redditreader2020** (95↑): A well rounded data engineer is a software engineer that likes working with data.

Learn all you can about backend software engineering.
  - **ketopraktanjungduren** (6↑): I'm learning backend engineering btw. Do you think BE with focus on Python is good or should I try Typescript/Go?
    - **redditreader2020** (10↑): Python is fine. Just learning the concept is key, after more experience switching languages is easy.
    - **Online_Matter** (3↑): Python is fine for small backends. I find it's lack of first-class type safety becomes an issue as the code becomes more complex.


Go is quite a nice language but still a bit niche (at least in my area). I'd also take a look at C# which has really nice frameworks for APIs.
    - **bass_bungalow** (1↑): Python works. If you’ve never worked with a compiled language, it might be worth learning some basic go/c++/rust/java but definitely not required
    - **Shadilan** (1↑): Typescript is not good choice for de imho. Go is better but have questions too. Python, Java/Scala/Kotlin more familiar to data world. And Rust for high load may be.
- **calimovetips** (11↑): pretty common if your team owns ingestion, but usually it’s “build a thin receiver” and hand off to the warehouse, not a full backend app. if you just need to catch webhooks, a tiny flask endpoint plus queue or object storage is enough, you don’t need to learn django for that. it can be DE work, but if it grows into auth, retries, complex business logic, and uptime guarantees, that’s when backend usually takes it. how much volume are you expecting and do they require a public https endpoint with signature verification?
  - **ketopraktanjungduren** (1↑): It's tiny but I have to figure out how to secure the connection. I'm trying url token parameter ('?token=...') then compare it with the SECRET variable but the platform sometimes posts without token so I have to find other ways to authenticate the connection.


The volume is maybe around 3-5 posts per hour, and yes I think it requires signature verification. Could you please give me advice to this problem?
    - **Odhdbdyebsksbx** (1↑): Commenting because I also want to know what's a good solution for this.
- **MonochromeDinosaur** (14↑): This is why people always say data engineering is a specialization of software engineering. 

You need skills from backend, frontend, devops, data analysis, MLE/data science to be well rounded. Even systems might be helpful depending on your performance requirements.

I did web development, data analysis, and data science/MLE before becoming a data engineer so I am familiar with all these concepts and every team I’ve worked on has been a software engineering first team. Everyone is expert at SQL but can just as easily switch to writing application code.
  - **ketopraktanjungduren** (3↑): Yeah, I can grasp what you said. I learnt the ML requires a lot of SWE skills other than statistics and ML


Thanks for reminding me
  - **TodayEasy949** (1↑): How was your transition from frontend to data analysis? Was it an internal shift or you upskilled in that domain and changed the org?
- **SmallAd3697** (12↑): do data engineers ever think of themselves as software developers?  it is a pet peeve when data engineers limit themselves to learning to use/ configure someone's software, and they aren't able to write any code themselves.

web api's are about as simple as it gets when it comes to software development.  the only thing that may be simpler is writing a hello world console app.  challenge yourself.
  - **drunkenboy_** (10↑): 90% of people here forgets that Data Engineering is just Software Engineering applied to data.

it makes sense when you see that most is used to work with already built tools, such as dbt and such.

that's why we also see that huge gap in infrastructure and architecture knowledge in many posts on this forum.
  - **[deleted]** (-1↑): I dont seem myself as a swe as I also work a lot with business units. there's only so much I can do
  - **ketopraktanjungduren** (0↑): Thanks a lot!
- **JohnPaulDavyJones** (2↑): APIs? Couple of times in the last few years, but I bet dollars to donuts that I’m the only one on my current team who has done that.

Webhooks? Literally never.
- **Thinker_Assignment** (2↑): We basically see 2 camps
- g cloud function/aws gateway+lambda webhook
- self hosted app (less scalable more management slightly cheaper)
- **[deleted]** (1↑): It’s great for utility and monitoring. Like cicd and other forms of ”glue code”. It can also be a consumption interface that’s more suitable then direct database access etc.
- **Shadilan** (1↑): You can use apache nifi as less code tool, but it's rather heavy. But you can make http endpoint with no code in it.
- **Bananaramaaaaa** (1↑): I would say it depends a bit on the scale of data, how often you work with these. But agree with the other posters that this can be expected as it is fairly basic software engineering.

And if you really only need a webhook endpoint to process some data, maybe AWS Lamda could be a good fit.

Amd otherwise I'd always say FastAPI over Flask nowadays, it is just the cleaner, more modern version of it. If you use Django, you get user management and a nice ORM, but boilerplate or async processing can become headaches.
- **drag8800** (1↑): yeah this comes up a lot. the line between DE and backend is fuzzy and honestly depends more on the team structure than any official boundary. i work primarily with snowflake and dbt too and ended up building internal APIs a few times when nobody else was going to do it.

the tcp/tunneling stuff you're mentioning is real. webhooks touch networking concepts that don't come up much when you're writing sql all day. but it's learnable, and honestly flask is pretty minimal once you get past the initial wtf of understanding how routes work.

the bigger question is whether this should be your problem at all. if this is a one-off integration that marketing needs yesterday, sometimes you just build the thing. if you're going to be maintaining multiple webhooks indefinitely, that's closer to a backend service and someone should probably be thinking about ownership and on-call.

for the immediate problem you could look at something like ngrok for local testing instead of figuring out tunneling yourself. makes the development loop way less painful when you're trying to debug what the webhook is actually sending you.
