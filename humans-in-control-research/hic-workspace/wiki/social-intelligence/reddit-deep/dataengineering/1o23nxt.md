---
id: social-intelligence/reddit-deep/dataengineering/1o23nxt.md
url: "https://www.reddit.com/r/dataengineering/comments/1o23nxt/im_sick_of_the_misconceptions_that_laymen_have/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "I'm sick of the misconceptions that laymen have about data engineering"
author: "wtfzambo"
date: "2025-10-09T11:43:03.000Z"
score: 489
upvote_ratio: 0.96
num_comments: 198
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.196Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c0"
    char_span: [0, 1979]
    sentence_count: 12
    key_terms: [data, business, case, dataengineering, conversation, engineering, ask, cdc]
    token_count: 462
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c1"
    char_span: [1994, 3297]
    sentence_count: 7
    key_terms: [real-time, millisecond, handling, almost, revolutionary-two457, start, mean, sure]
    section: Comments
    token_count: 307
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c2"
    char_span: [3299, 5102]
    sentence_count: 15
    key_terms: [real-time, real, time, realtime, data, day, like, want]
    section: Comments
    token_count: 475
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c3"
    char_span: [5104, 7153]
    sentence_count: 13
    key_terms: [going, engineering, millisecond, understand, engineers, real-time, handling, without]
    section: Comments
    token_count: 477
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c4"
    char_span: [7155, 9229]
    sentence_count: 13
    key_terms: [functional-data-engineering-a-modern-paradigm-for-batch-data-processing-2327ec32c42a, able, being, cdc, case, data, time, want]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c5"
    char_span: [9231, 11381]
    sentence_count: 17
    key_terms: [data, sure, need, asking, requirements, "don't", excel, ask]
    section: Comments
    token_count: 492
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c6"
    char_span: [11383, 12820]
    sentence_count: 9
    key_terms: [approach, possible, ask, lot, need, "doesn't", involve, built]
    section: Comments
    token_count: 340
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c7"
    char_span: [12822, 14793]
    sentence_count: 16
    key_terms: [possible, promised, client, impossible, something, data, conversations, like]
    section: Comments
    token_count: 457
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c8"
    char_span: [14795, 17072]
    sentence_count: 11
    key_terms: [data, times, distributed, replication, need, customer, universe, already]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c9"
    char_span: [17074, 19326]
    sentence_count: 18
    key_terms: [cdc, experience, business, database, changes, tables, configuration, build]
    section: Comments
    token_count: 498
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c10"
    char_span: [19328, 21563]
    sentence_count: 22
    key_terms: [cdc, database, debezium, straightforward, records, major, nightmarish, replication]
    section: Comments
    token_count: 500
  - id: "social-intelligence/reddit-deep/dataengineering/1o23nxt.md#c11"
    char_span: [21565, 23064]
    sentence_count: 13
    key_terms: [tables, database, isolation, cdc, relatively, crazy, "we're", get]
    section: Comments
    token_count: 344
---
# I'm sick of the misconceptions that laymen have about data engineering

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1o23nxt/im_sick_of_the_misconceptions_that_laymen_have/)
Posted by **wtfzambo** · **489↑** · **198 comments**

(disclaimer: this is a rant).

***"Why do I need to care about what the business case is?"***

This sentence was just told to me two hours ago when discussing the data """""strategy""""" of a client.

The conversation happened between me and a backend engineer, and went more or less like this*.* 

*"...and so here we're using CDC to extract data."*  
*"Why?"*  
*"The client said they don't want to lose any data"*  
*"Which data in specific they don't want to lose?"*  
*"Any data"*  
*"You should ask why and really understand what their goal is. Without understanding the business case you're just building something that most likely will be over-engineered and not useful."*  
***"Why do I need to care about what the business case is?"***

The conversation went on for 15 more minutes but the theme didn't change. For the millionth time, I stumbled upon the usual cdc + spark + kafka bullshit stack built without any rhyme nor reason, and nobody knows or even dared to ask how the data will be used and what is the business case.

And then when you ask *"ok but what's the business case",* you ALWAYS get the most boilerplate Skyrim-NPC answer like: "reporting and analytics".

Now tell me Johnny, does a business that moves slower than my grandma climbs the stairs need real-time reporting? Are they going to make real-time, sub-minute decision with all this CDC updates that you're spending so much money to extract? No? Then why the fuck did you set up a system that requires 5 engineers, 2 project managers and an exorcist to manage?

I'm so fucking sick of this idea that data engineering only consists of Scooby Doo-ing together a bunch of expensive tech and call it a day. JFC.

Rant over.

## Comments

- **Revolutionary-Two457** (219↑): A lot of times when I encounter this it’s specifically because “real-time” made it on the requirements list when it’s absolutely should not have
  - **javanperl** (39↑): As someone who’s done work in domains where speed really mattered, it irks me when “real-time” is loosely defined. There is a vast difference between the engineering involved for handling 100K transactions with millisecond latency and handling the same volume in say 5 minutes.  You’re not getting down to those millisecond levels without designing for it from the start, and just scaling up isn’t going to help you that much.
    - **jcachat** (4↑): ya agreed this is over-engineered - sounds like nightly batch would be just fine. 

the again, understanding the business use case would be needed to know that for sure.
    - **LucasThePatator** (1↑): Real time means almost nothing in itself I have been fighting this term for a long time. Give me a precise delay and frequency and I can work.
  - **reelznfeelz** (37↑): My experience is clients say “real-time” and just mean daily.  Almost always.  You habe to ask “do you mean actual real-time as in instantly updates the dashboard when Bob makes a sale?  Or just make sure you have all the sales up to yesterday by the start of the next day?  

I then explain that true real-time is possible, if all the systems have a way to get it out that fast, but it’s more complex and expensive setup that what we would need if we”updates a few times a day” is sufficient, so we should be sure that true real time beings some real value.
    - **adgjl12** (14↑): Pretty much. My company was very happy when they asked for “real-time” and I asked if every 5 minutes is enough real-time. They were ecstatic. What they had before were daily updates.
    - **jcachat** (1↑): 💯💯💯
  - **Cynot88** (56↑): Ohhh man could I rant about "realtime" requirements. 🤦‍♂️
    - **naijaboiler** (63↑): I always tell people, the more realtime you want it, the more expensive it is to build and maintain. Exponentially too. That relationship is not linear.   
  
Immediately you bring the cost into the conversation, business end-users suddenly discover their use cases are okay with data that is  1hour behind realtime.
    - **Responsible_Act4032** (3↑): Confluent snake oil.
    - **InternationalMany6** (2↑): Sometimes it feels like “real-time” is just code for “we want the dashboard to look fancy”. Then nobody has a use case past staring at it.
    - **Affalt** (1↑): Often, just-in-time is adequate.
  - **Bunkerman91** (19↑): 90% of the time I just schedule the job to run hourly and nobody knows the difference.
  - **nfigo** (17↑): That's when you break out the

"What does real time mean to you?"

"Is the real time in the room with us right now?"
    - **LJonReddit** (18↑): I like this take.

Are we talking milliseconds?  Seconds? Minutes?  Hours?  Daily?  How often is this data queried?

I usually get something like, " Well I load my spreadsheet first thing in the morning, then sometimes I want updated data later in the day."  

"Do you do this every day?"  

"No, just once a week/month/whatever."
  - **Resquid** (8↑): My favorite answer is "You can't afford real-time"
  - **Visionexe** (3↑): Haha. I feel this one. I have a background in electrical engineering, and 99.99% of the people that bring it up have no clue what it actually means, even a lot of software engineers actually don't understand it.
  - **TheElusiveFox** (1↑): I would add that I think lay people don't really understand their needs for how "up to date" their data is, and the nature of managers/directors/etc is to push for real time because very few engineers are capable of pushing back and explaining that data from an hour ago or even a day ago isn't going to break your reporting.
  - **Skie** (1↑): I encountered a team once where they manually refreshed reports every hour.

The underlying database was only ever updated at 1am. And they had been doing this for years without noticing nothing changed. I guess the odd time that the overnight refresh got stuck and we had to fix it then run it at 9am made them think things could change, but it was such a weird revelation when they showed me their workflow.
  - **javanperl** (1↑): As someone who’s done work in domains where speed really mattered, it irks me when “real-time” is loosely defined. There is a vast difference between the engineering involved for handling 100K transactions with millisecond latency and handling the same volume in say 5 minutes.  You’re not getting down to those millisecond levels without designing for it from the start, and just scaling up isn’t going to help you that much.
- **raginjason** (79↑): Fair points. And although this is a rant, I’ll offer a counter point: the customer doesn’t usually know what they actually want either. This is where PMs and leads need to manage stakeholders and try to tease that out. Even then, it will probably be wrong first and that’s why we should expect to iterate.

As an engineer, if you don’t explicitly state that you don’t want CDC, I’m going to go with it. It’s too painful to introduce CDC later.

Real time reporting is almost always a bullshit requirement. In my 15 years of data engineering I’ve encountered exactly 1 valid use case for it. Ironically that project was canceled so I’ve yet to see it actually happen. Everyone thinks they want it until they see the price tag
  - **SufficientTry3258** (15↑): Agree with you on the CDC part. I agree with the general sentiment of the OP, but they seem to have a very narrow understanding of use cases for CDC data beyond real-time. Like being able to rebuild the state of a given object at a certain point in time or being able to build out type 2 SCD tables.
    - **Sex4Vespene** (2↑): Or just being able to properly reproduce the data at all. If you are pulling from a transactions system with updates and deletes, how do you propose to relocate them in your destination without a CDC solution reading from the bin log? We are using airbyte for daily syncs for exactly this case.
    - **wtfzambo** (-7↑): > Like being able to rebuild the state of a given object at a certain point in time or being able to build out type 2 SCD tables.

My rant towards CDC has nothing to do with real-time, it's two separate ideas.

What you're saying technical masturbation, not a business case. WHY do you need to be able to rebuild such and such?

Unless there is a strong and validated case of why a business needs CDC-grain snapshots of all their data at any given time in the past, CDC is unnecessary, and full dimension snapshots are enough.

This was true back then and is even more true today:

https://maximebeauchemin.medium.com/functional-data-engineering-a-modern-paradigm-for-batch-data-processing-2327ec32c42a

https://youtu.be/shW8iQedAXA?si=adUWpKoE7EFfGoQ7&t=1314
  - **Responsible_Act4032** (2↑): Agree on the customer not knowing what they want, that's why solid product mgmt skills, deployed by whoever, to actually ask them why they want the solution they are prescribing to you, generally gets everyone on the same page.
  - **wtfzambo** (1↑): > the customer doesn’t usually know what they actually want either.

I'm well aware of it, which is half the reason this rant exists. But too often I don't see anybody ask "ok, why this? Why that?". They just go.

But I disagree of starting with CDC as the default option if I don't have a strong case of needing CDC.

It's way more annoying to build and maintain than full snapshots partitioned by date.

Don't build a Lambo if all you need is a skateboard kinda idea.
    - **raginjason** (2↑): Yeah i agree They need to be asking more “why” questions to at least get close to target. In my experience asking why and brings that questioning stakeholder requirements doesn’t come until senior or lead levels of career progression.

Maybe a hot take but if they are engaging a data engineer they are not asking for a skateboard. Theirs are plenty of software engineers writing terrible SQL queries on transactional databases out there, they don’t need me for that. There are plenty of BI people plugging their BI tool into that same system and crashing it during peak hours because they ran a report. They don’t need me to manage their excel file for they call an “executive dashboard”. They usually already had Bob from accounting mashing 15 excel sheets together to do that. By the time it gets to “bring in a data engineer “, they are generally over their head and part of my job is to take it to the next level. I fully agree they may not want a Lambo though.
  - **Tepavicharov** (1↑): Or until you ask them what automated processes would you have in place to do something with that real time data...usually there isn't one and they quickly realize starring at constantly changing numbers isn't beneficial.
- **kathaklysm** (19↑): I get the rant, no, I _feel_ it.

Yet I've also been in the situation to ask those questions and be told by stakeholders:

- not sure about which data, just fetch everything;
- not sure about the data model, just keep the same as in the source;
- not sure about the size, just make sure it works for A (this 1 excel file) and also B (this 1 TB table);
- not sure about the frequency, just fetch it asap;
- etc.

And worse, requirements _changing_ after implementing a given approach.

So you bet I'm going to take the pessimistic approach that should cover as many possible future requests as possible.
  - **wtfzambo** (3↑): > So you bet I'm going to take the pessimistic approach that should cover as many possible future requests as possible. 

I've been in your same exact shoes but concluded the opposite because even if they ASK those things, doesn't mean they need them. I have built stuff under specific request of "we absolutely need such and such", and 8 times out of 10 it ended up being unused after 1 week.

That's why I say "ask why a lot, and challenge assumptions". Often times the ask doesn't reflect the actual need.
    - **Ok-Yogurt2360** (4↑): I learned to limit these questions to the situations where it will hard/costly to change the details or where i see huge opportunities for improvement. But you need to know a bit of everything and be good at predicting challenges to use this approach. 

A lot of engineers tend to :

a) built what is asked (the not my responsibility approach)

b) built for what can happen, just to be sure. (Safe but prone to overengineering
- **[deleted]** (28↑): I have this issue with stakeholders. They're telling what they want in terms of data and our project manager doesn't ask what it's for or involve engineers in that discussion.


It's like if you involve us we could save a lot of time.
  - **wtfzambo** (4↑): > if you involve us we could save a lot of time. 

YES. I see this often, I don't understand why data engs are excluded from those conversations. Then they do a suprised pikachu face when the system is a patchwork of 83 different pieces of tech stitched together by hopes and dreams, totally ignoring Conway's law.
    - **JimmyTango** (4↑): Agree whole heartedly with this as well. DEs should be able to interface with the end consumer of they work. Putting the game of telephone in play is the worst and drives lots of folks crazy on both sides.
  - **Responsible_Act4032** (1↑): Yup, good product management early on, from whoever, will help so many save time and effort.
  - **ilikedmatrixiv** (1↑): At my first job I worked for a company that sold their data consulting services to other businesses. Give us your data and we will get insights out of it for you.

The problem was that the consultants who went to convince other businesses to buy our services were not technical. They just went there and promised them whatever to get a sale.

Then they'd come to me and tell me all the fairy tales they sold the client. Sometimes it was possible. When it was possible, it was usually pretty easy too. Sometimes however, it was not possible. This could be because we didn't have the necessary data or granularity or something. Or it could be literally mathematically impossible. I've had quite a few conversations during those days that went something like

\> Idiot Consultant (IC): So, I promised the client we can do X.

\> Me: no we can't.

\> IC: but I've already promised the client

\> Me: you shouldn't promise something without checking with us if it's actually possible.

\> IC: yeah, but is it impossible or just really difficult? (like so many of their other idiotic promises I made happen)

\> Me: literally impossible.

\> IC: but I promised the client already.

\> Me: I know, you shouldn't have.

\> IC: How am I going to explain this to them?

\> Me: I don't know. That sounds like your problem though.

I wouldn't have been so callous and snarky about it if that shit didn't happen constantly and I hadn't warned them dozens of times not to promise shit without consulting me on the technical possibilities. They didn't listen, wanted to score points for being good salesmen and got fucked and humiliated a few times because of it.

Oh well.
    - **[deleted]** (1↑): Wonder if they were on commission. That's the sort of behavior it incentivises.
- **_Flavor_Dave_** (9↑): I had to write an article for our internal knowledge base because we (data platform team) keep getting asked to “turn on” multi master replication for the apps we sell. I send it to meeting organizers when I inevitably get invited to a Sales Engineering call where they already told the customer they could do it. 

Replication is the easy part, making the app play nice while incorporating data from distributed locations is the kicker. 

It is sad watching the SE’s eyes glaze over while they absorb the complexity of what they are asking for and the fact that the apps would need to be built with that in mind from the start - or modified to handle cases around distributed updates. After a few minutes of discussion of PKs and data conflicts they get the picture that they need to talk to the dev team and not us.
  - **wtfzambo** (4↑): > where they already told the customer they could do it.

Reminds me of this video https://www.youtube.com/watch?v=BKorP55Aqvg
- **Infamous_Ruin6848** (8↑): Pretty much why PM/PO or analysts are quite important and the good ones are golden for both the business and the execution teams.

Sadly many are paid like jira monkeys.
- **Welcome2B_Here** (13↑): In many cases, "they" want to see the whole menu before deciding what they want/need. They don't really know what to ask for in specifics so they ask for "everything." "They" also don't fundamentally understand the mechanics of "joining disparate datasets."

Sometimes it's easier to lie about the universe of options and what's available, but other times it's better to just import the entire universe of data to anticipate the downstream questions without having to re-stitch something together later on.
- **domscatterbrain** (4↑): CDC for ingestion is the best solution for not losing any data by mistakes.

The real "business" issues start after that.

Do your stakeholders really, really needs those "real time analytics" or they just [read an ad from the trade magazine](https://de.pinterest.com/pin/431219733046510579/)
  - **wtfzambo** (1↑): > CDC for ingestion is the best solution for not losing any data by mistakes. 

Ok, is that data so important that absolutely ANY change must be captured, or can you afford losing some changes because it doesn't really matter? It boils down to this.
    - **domscatterbrain** (2↑): I mean the mistakes from whoever handles the backend production database.

I've met many cases like the undocumented changes on them i.e. mass update, deletion, and even schema changes. You'll never know what has changed until you see the anomaly on the business reports.
- **RangePsychological41** (4↑): I disagree with this. Doing CDC correctly gives massive value, and the earlier it is done the better.

The CDC data also doesn't have to go to die somewhere in cold storage, there are very practical use cases. For instance, the configuration of everything on the platform, and I mean everything, can be kept in Flink's queryable state and whenever some business event occurs in any domain, these can be enriched with the exact configuration for that event. And this can all be done without the individual domain services caring about it. It's very powerful.

Also, CDC isn't supposed to give you a headache. It's supposed to be straightforward.
  - **wtfzambo** (2↑): I have a feeling that my experience when dealing with CDC strongly differs with your experience with CDC.

But my gripe isn't really against CDC per se, but more against using it indiscriminately regardless of the use case, i.e., without asking questions about why. That is the gist of the rant. I see a lot of engineers that just build build build but don't stop for a minute to check if what's being built is required.

Now regarding CDC in specific, my experience has been the following: I inherited a system where the CDC is applied to all columns of all tables of the database, in a "one size fits all approach". The database counts about 300 tables, and so far the analyst on this project has been using only 2-3 tables, and always the latest snapshot.

More so, the CDC ingestion was custom made instead of bought from a vendor, and is in my opinion relatively brittle.

To add insult to injury, a lot of CDC updates are actual garbage. There's one table in specific that due to IDK what nonsense is happening in the client's backend, switches the entries of a column from UPPERCASE to lowercase and viceversa continuously. This generates hundres of millions of records each month for a table that has about 6 millions records in total.

The size of this table's CDC records is now 100GB on disk and it keeps growing by the day.

It's absolutely demented.

---

You can obviously say "this is a shit system and shouldn't count as an example of CDC" and I would totally agree with you, but it's exactly the result of what I'm ranting about in this post: nobody asking any question before building.

---

> CDC isn't supposed to give you a headache. It's supposed to be straightforward. 

In regards to this, would you like to share with me some resource that can change my mind on this? 'Cause my experience so far has been nightmarish.
    - **RangePsychological41** (2↑): Okay, now I fully understand where you're coming from.

>In regards to this, would you like to share with me some resource that can change my mind on this? 'Cause my experience so far has been nightmarish.

There's a caveat here. I've had one big nightmare myself, but that's not longer an issue. Story time:

We started using Debezium about 4 years ago for CDC. It was very simple and straightforward. Also, at our company we have automated database upgrades - you just update the Terraform config and the database upgrade is taken care of.

The issue with this was that with Postgres at the time, a logical replication slot, which is required for Debezium, can't be present during a major version database upgrade. It has to be deleted manually. We automate everything, so this is a major deal breaker. In addition, if a mistake is made then the data is lost forever. We dropped Debezium because of this.

Fast forward, and with Postgres 17 the logical replication slot doesn't have to be deleted for major version upgrades, so we're sorted. We're doing Flink CDC mostly now since we've invested heavily in Flink.

>I inherited a system where the CDC is applied to all columns of all tables of the database, in a "one size fits all approach". The database counts about 300 tables, and so far the analyst on this project has been using only 2-3 tables, and always the latest snapshot.

Yes that sounds crazy. Batshit insane crazy. I get your point now. We're a relatively large Fintech and we do CDC for a couple of dozen tables or so. In old systems a lot of tables are full of trash and weird schema histories.

>More so, the CDC ingestion was custom made instead of bought from a vendor, and is in my opinion relatively brittle.

lol what? Was this done by hooking into the binlog/WAL? What kinda of psychopath thinks it's a good idea to do that? Debezium is free and battle tested.

>It's absolutely demented.

Indeed!
- **georgewfraser** (3↑): When the source is a database and someone asks for sub second replication I like to ask them how are you thinking about isolation levels? And the answer is invariably “isolation what?” When you’re reading from a database that allows multiple concurrent transactions the timeline is a fiction that is constructed after the fact, so it gets complicated to even define what super short latencies mean.
  - **wtfzambo** (2↑): > “isolation what?”

ahahahaha, I felt that! You're so right tho, I hope I will never have to deal with a situation like that because I already get confused with normal datetime shenanigans, let alone when we're talking sub-second replications.
