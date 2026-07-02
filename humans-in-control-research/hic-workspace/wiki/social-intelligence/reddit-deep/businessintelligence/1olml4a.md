---
id: social-intelligence/reddit-deep/businessintelligence/1olml4a.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1olml4a/which_part_of_dashboard_building_takes_up_most_of/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Which part of dashboard building takes up most of your time?"
author: "stupidlegend"
date: "2025-11-01T12:29:27.000Z"
score: 39
upvote_ratio: 0.88
num_comments: 46
flair: ""
extracted_at: "2026-06-11T18:57:56.373Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c0"
    char_span: [0, 1406]
    sentence_count: 11
    key_terms: [building, businessintelligence, tools, like, time, experiences, feel, dashboards]
    concepts: [building, businessintelligence, tools, experiences, dashboards]
    related_chunks: ["social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c4"]
    token_count: 303
    sources: [{"n":"reddit-deep: r/businessintelligence","u":"https://www.reddit.com/r/BusinessIntelligence/comments/1olml4a/which_part_of_dashboard_building_takes_up_most_of/"}]
  - id: "social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c1"
    char_span: [1420, 3496]
    sentence_count: 22
    key_terms: [data, tableau, requirements, stakeholders, based, build, etc, set]
    concepts: [tableau, requirements, stakeholders, automation, based]
    section: Comments
    token_count: 488
  - id: "social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c2"
    char_span: [3498, 5561]
    sentence_count: 16
    key_terms: [feedback, use, scope, back, keep, users, easy, experience]
    concepts: [feedback, scope, experience, users, objective]
    section: Comments
    token_count: 452
  - id: "social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c3"
    char_span: [5563, 7832]
    sentence_count: 16
    key_terms: [data, questions, making, functionality, right, users, analytics, analysts]
    concepts: [questions, functionality, making, right, users]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c4"
    char_span: [7834, 10097]
    sentence_count: 17
    key_terms: [like, time, building, requirements, logic, takes, tools, bit]
    concepts: [building, requirements, logic, takes, tools]
    related_chunks: ["social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c0"]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/businessintelligence/1olml4a.md#c5"
    char_span: [10099, 11304]
    sentence_count: 6
    key_terms: [data, model, users, want, controls, general, graphs, report]
    concepts: [model, users, controls, general, graphs]
    section: Comments
    token_count: 278
---
# Which part of dashboard building takes up most of your time?

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1olml4a/which_part_of_dashboard_building_takes_up_most_of/)
Posted by **stupidlegend** · **39↑** · **46 comments**

**Quick background**  
  
I started my career in analytics, spent a lot of time building dashboards and reports, and then moved to product management where I ended up leading AI initiatives like building customer support agents and automation tools. 

I have a fair sense of limitations of AI but still feel there is ground to be covered to be building a better self-service analytics tool for the non-technical business community. There are new players in the market but I feel like we are just scratching the surface. And given the nature of tools like Tableau, even their new agentic layers are not geared towards being completely self serve. 

**Would love to get your opinions on** \- 

1. Where do you spend the most time on building dashboards? Data structuring, cleaning, calculated fields or something else? 
2. What are your most used features from any of the BI tools that you use?
3. What are the more frustrating experiences of using these tools that you feel like can be much simpler? 

Would love to hear your experiences here or even hop on a quick call if you’re open to chatting. Thanks a lot for your time!

## Comments

- **RedditIsGay_8008** (103↑): 1. Convincing stakeholders that their requirements don’t make sense because they don’t know what they want

2. DAX

3. DAX
  - **VaramoKarmana** (1↑): Short and accurate
  - **Rangorsen** (1↑): How about creating a way for them to download the raw data, so they can do their own "analysis"?
  - **Pale_Squash_4263** (1↑): In Tableau land: LOD calculations
- **HargorTheHairy** (39↑): Cleaning filthy data
- **haonguyenprof** (20↑): Hardest part is usually just getting requirements and finding nuanced data.

My approach:
1. Set up meetings with stakeholders and collect questions they aim to answer.  Pushing back on kitchen sink reports,  driving people to see the report as actionable/decision making focused.  Lots of times I draw up a wire frame in excel to help them visualize it and get feedback until a design is agreed on.

2. Creating the code based on the feedback.  If they want time series data, develop monthly data; dimensions added to aggregate,  all metric components added, etc.  Usually doesn't take long to build, run, QA.

3. Load into Tableau and build out the calculated fields, parameters, etc.  Leverage the wireframe to start building out the tool.  This goes much faster with a pre determined wire frame.  I tend to keep things high level and story based.  Summary tables, YOY, benchmarking, bar charts for time based, state maps for location analysis, and plenty of parameter dimension cut by tables for easier drill downs on the same page.  Forces them to focus on a specific metric and combination of dimensions than providing too many things at the same time.

4. Build in interactivity: layering in dashboard actions, documentation hovers for education,  adding relevant links to other supporting tools that make sense as a logical next step.

5. Considering automation.  Is the program going into the tool set up for automation.  Can I set the tableau refresh extract to execute every month etc.  The data powering the report, is it run through a SQL connection and doesn't require me to execute codes manually. 

6. Setting up meetings to introduce the new report or tool and get feedback and really push for objective reactions.  9 out of 10 times they will say they love it but you have to drive the conversation to see what is missing that is critical to the story.  And you always push back to additions that are nice to haves or are already in other tools.  Always keep it within scope.

7.  Setting up a reasonable use window where they use the tool and after several months track usage and then go back and gather feedback on user experience and tweak where it can be better: added filters, broken dashboard actions, missing functionality etc.

The longest part for me depends on the complexity of the metrics and scope.   But I have found that if the data isnt super accessible then it takes longer. 

Writing code is pretty easy but often can be very tedious so that can take a few days with QA.  Tableau building is fairly quick with blue prints and experience.   Gather feedback are just a few 1 hour meetings.
  - **VaramoKarmana** (2↑): Thank you for that list. I just came back after a 4 month break and I appreciate the reminders, notably on pushing back against scope creep, focusing on actionable insights and insisting for objective feedback.
    - **haonguyenprof** (2↑): No worries!  It's so easy for people to ask to add 100 things to a report that only 2 people will use and the rest will avoid because it intimidates the hell put of them.

Best advice I ever learned was put yourself in the users perspective: keep it simple, keep it clean, make it easy to use.  The quicker they get to the decision they need to make, the quicker they can do what they do best.

Ideally I want to make reports so clean and powerful that users know they can find their needed insight in less than 30 minutes so they can spend the rest of their time succeeding in their role.

If it takes someone hours to use my tools, that's  a problem and I don't want my users to try to be analysts when they aren't so that point on scope helps keep everything basic and intentional. 

(Also saves on the headaches of trying to build a unicorn report.  Sometimes people forget we can just say "no" haha)
  - **Own_Ability_1418** (1↑): Curious if you think AI will help with this process or are you looking into ways to speed it up? I’ve been struggling with the effort to extract the real question the user wants and if a dashboard is actually the right thing. Thinking an agent may help with those types of questions.
    - **haonguyenprof** (1↑): I've seen some of the AI functionality within Tableau an other BI tools and the problem is users dont always know the right questions to ask the LLM and then not knowing whether the insight is accurate.

In a perfect world, users have the best data and know the exact question and it gives them exactly what they need.  But we all can't be naive to think that's always going to be the case.

And we also have to assume that functionality willcosts businesses a ton of money like licenses to use all of these tools.  And if their data is bad, its garbage in and garbage out.  And if users have terrible data literacy, they may come to the wrong conclusions.

Couple that with making the wrong decisions and it leading to terrible outcomes, it could lead to even less reporting adoption and worse situations. 

You would have to train the LLM so much nuance and business acumen with clean data to get somewhere and then train tons of non analyst staff to think and ask questions like analysts.  And knowing non analysts,  they don't have the time to sit down and do their own analytics even if its just asking prompts.

I work for a data driven company who is trying to invest in their own AI analytics platform to provide summary based reports based on user input and after testing it, it is incredibly flawed and nowhere near broad use.

Maybe that changes in a few years but right now, it probably wont be replacing analyst roles unless there are people making cuts and messing up their business haha

What I see AI helping with is just code optimization or asking for ideas around what type of visuals are important for the task at hand.  Making suggestions on efficient ways to condense and simplify stories.   But even then I take those with a grain of salt and still do what experience tells me to do.

And honestly, I would prefer getting requirements from people anyways.  Data analysts have to be strong communicators.  Its where we build rapport, get buy in for our work, and learn about what our users actually need.  I know there are tons of introverts in the industry, but we cant just relay all of our meetings to AI.

It should simplify the technical aspects, but we need to handle the communicative, creative and critical thinking aspects.

At least thats how I feel about it based in my experience with AI.
- **nikz_7** (15↑): Honestly, the biggest time sink is always _data structuring_. You think you’re just building a dashboard, but suddenly you’re deep in semantic layer purgatory, chasing down column definitions no one documented. Tools like Tableau/PBI/FineBI helps with some of that by surfacing field logic cleanly, but even then, getting the logic business-ready takes iteration. Most-used features? Drill-downs, cross-filters, and calculated fields. Most frustrating? Rebuilding the same logic across dashboards because shared models or reusable metrics are either missing or too rigid.
- **nineteen_eightyfour** (16↑): For me it’s always, “hey we want something like money over start and end date” okay easy. Except end date isn’t filled out 60% of the time and sometimes when it is it’s like “2090” then we spend a year fixing that and then I usually find another job that pays better
  - **bruisedandbroke** (3↑): and it's in a SharePoint list 😓
- **Asleep_Dark_6343** (6↑): The actual dashboard building takes very little time, it’s the breakdown of business requirements and the building of the data models that takes time / skill.

I’m a bit confused about what the target is for the self serve tools currently being released is to be honest.

Most end users don’t want self service analytics, similar functionality has existed for years and take-up has been minimal, and the tools are  not flexible / good enough for developers.

The Co-Pilot narratives in power bi are great and I definitely see a future for them, but trying to sell something like Pulse as game changing AI insights is a bit of a stretch.
  - **Oleoay** (1↑): Agreed. "Self-service analytics tool for the non-technical business community" is a bit of a contradiction.

Generally, you have power users who like to dive deep to row level detail and want lots of ways to self-serve, you have general report users who want a few different filters on a few graphs and maybe something they can output to excel, then you have executive level kpi reporting which is graphs and a few numbers. One dashboard really can't work for all three because controls for power users will overwhelm others, executives may not want all the controls or crosstabs or specific metrics and general report users either also get overwhelmed or don't have enough controls to do what they want (so they make an ad hoc request).
- **GhostPatrol31** (6↑): 80% of your time should be spent on the data model. The data model is literally the most important part of the application. A good data model reduces complexity of DAX, and then it’s just design of the front-end. 

If you’re writing really complicated DAX, chances are high that your model is not good.
- **tee2k** (3↑): Going back to whoever came up with the requirements
- **chalrune** (2↑): It depends.
- **parkerauk** (2↑): AI is only limited by timeliness and quality of data, and how the data, as context is presented. GraphRAG over Vector RAG.
