---
id: social-intelligence/reddit-deep/dataengineering/1qqm5vk.md
url: "https://www.reddit.com/r/dataengineering/comments/1qqm5vk/being_the_data_guy_need_career_advice/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Being the \"data guy\", need career advice"
author: "jonfromthenorth"
date: "2026-01-29T21:47:36.000Z"
score: 154
upvote_ratio: 0.96
num_comments: 49
flair: "Career"
extracted_at: "2026-06-11T18:58:17.203Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c0"
    char_span: [0, 847]
    sentence_count: 13
    key_terms: [data, dataengineering, engineering, need, analytics, comments, career, salary]
    concepts: [dataengineering, engineering, analytics, comments, career]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c2"]
    token_count: 219
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1qqm5vk/being_the_data_guy_need_career_advice/"}]
  - id: "social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c1"
    char_span: [861, 2721]
    sentence_count: 13
    key_terms: [automate, data, business, dataengineering, get, job, list, resources]
    concepts: [automate, dataengineering, business, resources, learning]
    section: Comments
    token_count: 437
  - id: "social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c2"
    char_span: [2723, 4663]
    sentence_count: 12
    key_terms: [maybe, automate, data, "don't", engineering, analytics, instamarq, trending]
    concepts: [automate, maybe, engineering, "don't", analytics]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c0"]
    section: Comments
    token_count: 441
  - id: "social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c3"
    char_span: [4665, 6652]
    sentence_count: 13
    key_terms: [repulsive-beyond6877, data, useful-bug9391, python, "you're", using, developer, already]
    concepts: [repulsive-beyond6877, useful-bug9391, python, "you're", using]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/dataengineering/1qqm5vk.md#c4"
    char_span: [6654, 8238]
    sentence_count: 13
    key_terms: ["you're", like, paid, business, company, "they'll", better, immediate-pair-4290]
    concepts: ["you're", business, company, "they'll", better]
    section: Comments
    token_count: 387
---
# Being the "data guy", need career advice

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1qqm5vk/being_the_data_guy_need_career_advice/)
Posted by **jonfromthenorth** · **154↑** · **49 comments**

I started in the company around 7 months ago as a Junior Data Analyst, my first job. I am one of the 3 data analysts. However, I have become the "data guy". Marketing needs a full ETL pipeline and insights? I do it. Product team need to analyze sales data? I do it. Need to set up PowerBI dashboards, again, it's me.

  
I feel like I do data engineering, analytics engineering, and data analytics. Is this what the industry is now? I am not complaining, I love the end-to-end nature of my job, and I am learning a lot. But for long-term career growth and salary, I don't know what to do.

  
Salary: 60k

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **instamarq** (132↑): Automate as much of your job as you can, then start actively seeking out people's pain points and solving them with data. Keyword is "active" here, i.e. talk to people, chat it up. Once you feel like you've established yourself as more of a problem solver who's an asset to the business and less of a "data guy", ask for a sizable raise and pull out your list of solved business problems.

If you don't get your way, start looking for somewhere else to go and take that big list of wins into an interview. Do that and you'll move in very much the right direction.
  - **slayerzerg** (4↑): This. Don’t be afraid to automate your job. Obviously this may automate other steps in the pipeline / jobs in that business but thats when upper management starts seeing your value as that is what data engineering is about tbh esp as you scale. If you get stuck just being the data guy and do a lot of stuck work it may actually be worse
  - **Illustrious_Fun1436** (2↑): As a new junior in the field, how can one "automate" their job? What I work with are sql files and a new task comes in every week. I'm not sure how automation goes (may look like a naive question,  but I'm looking for others' experiences)
    - **lost_in_santa_carla** (1↑): Hmm, any patterns in the transforms / aggs that you do regularly? Could be an opportunity to refine the dataset into something easier to use. If not, would your org get any value from a semantic layer that they could access themselves with little or no input from you?

Sounds like automating yourself out of a job but in reality tends to be the opposite imo
    - **instamarq** (1↑): You must have _some_ repetitive tasks? In my case, if there was a task that took me hours due to multiple steps, I would at the very least create a script of some sort that would consolidate that process into one step. Maybe you can't automate a whole ingestion pipeline yet because no one is asking you to do that, but look at your own process and see where you can replace manual work.

Maybe you don't want to automate the writing of your SQL with AI, but you can perhaps automate how that SQL ends up in the final destination. **The main takeaway is to save yourself time and reinvest the savings in finding valuable problems to solve**.
  - **dark_dagger99** (2↑): 100% agree, I got a 35k raise in my first year doing exactly this
  - **[deleted]** (1↑): Solving with data I love the phrase could you give me an example
    - **instamarq** (1↑): Let's say your business is trying to figure out how to keep revenue growth going, despite sales figures trending lower. If you don't already know, figure out why sales are trending lower with the data you have access to and find perhaps a missed opportunity. Maybe a particular product segment could use a small price increase. Maybe there's hidden waste in a product return policy.

It doesn't have to be this in depth, maybe you automate an alert for some issue that finance is having trouble with based on some check data. All kinds of ways to do this.
- **x1084** (32↑): >I feel like I do data engineering, analytics engineering, and data analytics. Is this what the industry is now?

You wear more hats at smaller companies and on smaller teams. GenAI is also enabling a lot of people to attempt to expand their skillsets and take on tasks that would've previously been outside of their wheelhouse.

>But for long-term career growth and salary, I don't know what to do.

In a vacuum, if you're strictly talking about growth and salary you probably want to consider pivoting into DE from DA. In fact if you search the subreddit you'll find a ton of posts from people trying to do the same. In some ways you're in an advantageous spot because you're already getting hands on with more technical tasks.
  - **LeonardMcWhoopass** (5↑): I actually do the same now. I don’t expect I’ll get any significant raises but they’re talking about grooming me for leadership. Something about potential. Already know it’s not a long term fit for me with the BS I don’t like putting up with but it’s fine
    - **Useful-Bug9391** (2↑): I really wish to be in that situation to be honest. 

Once you feel that you have scratched the limit of problem solving for that company and reached dilution... You should look for your way out as you will be packed with arsenal of multiple hat skills and that too on a senior profile. 

You are getting exposure to those things ... It's really helpful.
- **MikeDoesEverything** (16↑): >60k

Currency and location really helps people.
  - **LoaderD** (7↑): Canada , cad.

It’s sadly not horrible salary for jr DA, it’s dog shit for any DE (Data Developer in Canada)
    - **Useful-Bug9391** (1↑): What's data developer now??
- **Repulsive-Beyond6877** (8↑): When you say ETL pipes, what are you using to build, test, and deploy?
  - **jonfromthenorth** (17↑): GCP, using python scripts to ingest data from various sources into BigQuery, testing is also python

jobs are containerized and run on Cloud Run

For the display and insights layer, it's Sheets of PowerBI, and R for statistical analysis
    - **Repulsive-Beyond6877** (3↑): I’d say if DE is your desired path then go somewhere else to play with tools that are used in bigger companies. Spark, Beam, Airflow, etc. just showing you know how to deal with data at scale and how to orchestrate it and recover from disasters.

Python is handy, although depends on how you’re using it.

The role you’re currently in is definitely exploiting you and you’re not being compensated correctly.
    - **bradcoles-dev** (4↑): How big is the company? This feels like shadow IT to me. This approach wouldn't be overly attractive to a DE hiring manager. If your org has its own enterprise data platform, e.g. established, governed, cloud tooling, you need to get involved in that. If they don't have that and you want a DE career, you're better off finding a new employer.
- **Big-Touch-9293** (5↑): I do everything you say for what it’s worth to you
- **Murder_1337** (3↑): This all seems about right. They got you doing all the work cuz you’re the JR with talent. The better you are at your job the more work you will have to do. Keep this up so they see you as a all star and try to get to the point where you can be Sr. then you can slack off
- **Immediate-Pair-4290** (3↑): Yes this is the industry now. They expect you to be a super hero while they follow garbage manual processes. Make sure you are being paid  handsomely for it or leave.
- **Sharp_Conclusion9207** (2↑): If you're at a regular company, almost no one else at your business has done anything half as cognitively demanding as building out end to end business reporting. And you're getting paid peanuts.
- **SaintTimothy** (2↑): Sounds like youre up for a promotion. Here's the thing though, they'll never see you as the engineer once they paid you like an analyst.


Best thing I've seen some folks do is hop to consulting for a year and then come back if they'll have you, at a properly market adjusted rate.
