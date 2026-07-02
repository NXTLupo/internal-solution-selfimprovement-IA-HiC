---
id: social-intelligence/reddit-deep/dataengineering/1tpnr8n.md
url: "https://www.reddit.com/r/dataengineering/comments/1tpnr8n/fresh_grad_dropped_into_a_data_swamp_20_tools/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Fresh grad dropped into a data swamp. ~20 tools (that I know of), very little (and highly fragmented) documentation, and a black-box warehouse. How do I reverse-engineer this?"
author: "HelpMeMapData"
date: "2026-05-28T00:29:37.000Z"
score: 52
upvote_ratio: 0.94
num_comments: 39
flair: "Help"
extracted_at: "2026-06-29T14:40:47.213Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c0"
    char_span: [0, 2188]
    sentence_count: 12
    key_terms: [data, department, warehouse, different, dataengineering, documentation, tools, fragmented]
    concepts: [department, warehouse, different, dataengineering, documentation]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c4"]
    token_count: 469
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1tpnr8n/fresh_grad_dropped_into_a_data_swamp_20_tools/"},{"n":"Data is being pulled into the cloud warehouse from at least two different SaaS p","u":""}]
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c1"
    char_span: [2190, 3820]
    sentence_count: 11
    key_terms: [data, use, interviewing, like, department, everything, everyone, specific]
    concepts: [interviewing, department, everything, everyone, specific]
    token_count: 340
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c2"
    char_span: [3834, 5156]
    sentence_count: 21
    key_terms: [data, noonecanfindmenow, start, team, business, database, account, house]
    concepts: [noonecanfindmenow, start, business, database, account]
    section: Comments
    token_count: 306
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c3"
    char_span: [5158, 7373]
    sentence_count: 17
    key_terms: [data, business, processes, company, fundamentals, map, work, businesses]
    concepts: [business, processes, company, fundamentals, businesses]
    section: Comments
    token_count: 496
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c4"
    char_span: [7375, 9505]
    sentence_count: 15
    key_terms: [warehouse, github, documentation, helpmemapdata, data, org, use, governance]
    concepts: [warehouse, documentation, helpmemapdata, github, governance]
    related_chunks: ["social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c0"]
    section: Comments
    token_count: 512
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c5"
    char_span: [9507, 11652]
    sentence_count: 27
    key_terms: [need, "don't", lot, step, take, management, company, message]
    concepts: ["don't", management, company, message, months]
    section: Comments
    token_count: 507
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c6"
    char_span: [11654, 13799]
    sentence_count: 31
    key_terms: [data, step, start, products, steps, tools, need, want]
    concepts: [start, products, steps, tools, processes]
    section: Comments
    token_count: 510
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c7"
    char_span: [13801, 15754]
    sentence_count: 25
    key_terms: [good, governance, inventory, identify, manager, column, create, github]
    concepts: [governance, inventory, identify, manager, column]
    section: Comments
    token_count: 465
  - id: "social-intelligence/reddit-deep/dataengineering/1tpnr8n.md#c8"
    char_span: [15756, 17814]
    sentence_count: 14
    key_terms: [company, governance, access, get, new, use, anything, allowed]
    concepts: [company, governance, access, anything, allowed]
    section: Comments
    token_count: 462
---
# Fresh grad dropped into a data swamp. ~20 tools (that I know of), very little (and highly fragmented) documentation, and a black-box warehouse. How do I reverse-engineer this?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tpnr8n/fresh_grad_dropped_into_a_data_swamp_20_tools/)
Posted by **HelpMeMapData** · **52↑** · **39 comments**

Hello reddit,

I’m a fresh college grad and a brand-new hire in the Data Analytics department at a large-ish company (\~5K employees or so). My initial onboarding task was to create "data governance recommendations," which I thought was pretty vague and confused me in regards to what was actually expected. But I did my best to try to look into things and quickly realized that this was going to be a pretty impossible task. I managed to convince my department head of the current reality of the department, which is that we can't possibly govern what we don't understand. And right now, literally nobody in our department actually understands our data pipelines work :/



The current situation:

* Our black box warehouse: The company recently paid outside consultants to set up a new cloud data warehouse and spent months migrating data into it. But last week, I literally overheard a data engineer distressed because they have zero idea how to use it.
* Tech stack that seems very confusing and redundant?: We don’t actually do much coding here (that I know of...). Although there is a decent amount of SQL I think is happening. Instead, we have a massive, fragmented ecosystem of tools. I’ve been gradually building a list of what I hear mentioned as being used, and I'm pushing 20+ different pipeline orchestration tools, DBMSs, and SaaS sources (think Alteryx, Talend, IBM CDC, Control-M, etc.).
* A bunch of data sources: Data is being pulled into the cloud warehouse from at least two different SaaS platforms and multiple on-prem databases running on at least two different DBMSs. 
* Documentation??: Knowledge is basically completely siloed. Whatever data dictionaries we might have exist as random excel files on one person's computer or buried three directories deep on some SharePoint page.

My issue is that since the consultants built everything and left behind a total black box, nobody trusts the new cloud data warehouse. The department is still treating the original on-prem databases and SaaS platforms as the fragmented "sources of truth," which completely defeates the purpose of the expensive migration, doesn't it?



My current survival plan is to schedule interviews with absolutely anyone and everyone who touches data so I can try to manually reverse-engineer these pipelines and map out our data lineage.

As a fresh grad, I feel incredibly out of my depth. I want to use this as an opportunity to add real value, but I need some guidance (please help me guys, IDK what I'm doing).

\-- Is interviewing everyone (i.e. starting with one person, then interviewing whoever they point me to, and so on) the right first step? Or is there a smarter, less painful way to go about this?

\-- When knowledge is this siloed, what specific questions should I be asking to piece everything back together?

\-- What should the end product look like? I'm thinking an official "data catalog" (although I don't really know how to go about creating one). Are there specific frameworks I should use to document this disaster so the department can actually benefit from this? My current best idea is a giant directed graph of data flow (a la Neo4j or something like that. then we could use a graph query language to analyze things, which seems pretty useful.)

Oh also, these is currently no version control being used. In theory we have a GitHub, but nobody uses it. Like somebody literally said "oh yeah, I don't use that".

## Comments

- **Noonecanfindmenow** (45↑): Always start with your inputs and outputs. 

What data are you consuming? What does your company do? Do you have in house apps? Do you scrape various data from the web? If it's I house apps there is a database somewhere. There is a team that manages that database. There is an account (hopefully a service account) that will data engineering uses to ingest data. 


Where are you writing to? Do you have a datamart? What are the most frequently looked at reports or tools that rely on the datawarehouse? What are the most critical ones? Find the team that developed it, ask to see the code behind it or at the very least see where the data is coming from. 

Don't have any of this? Talk to people. "hi I'm new. I've been asked to take on a new data initiative and I want to start by understanding a bit more on what your team does and how you guys use data. But really I'm just wanting to learn more about the business"

You have your start. You have your end. You will eventually figure out the links in between.
  - **Noonecanfindmenow** (13↑): Your end product should firstly be a super high level overview/diagram about what tools talk to which and for which business unit. 

If your data is as messy as you say, you will likely need a tool like data dog that helps you track everything.

It should also be to create mappings of the new cloud data warehouse to what it was intended to replace. And then build dashboards to flag discrepancies so that they can be resolved and your users can start trusting it
    - **CheesecakeAsleep897** (2↑): First just figure out what your company does.  Then google / LLM how these companies' work in general ie the business model, ontology,   knwoeldge grpah, semantic terms, typical schemas.  If you're just doing this for day to day processes then google "'Core business processes" ie "Q2C" "Procure 2 pay etc". understand how your businesses and businesses in general work.  There's nothing worse then finding some crazy flowcharts that a bucnh of people re-made 5x times for a business process that's basically been the same for 100+ years and then you just take it for granted.  Once you understand the fundamentals you can do your interviews or whatever.  Map then work up from the ppl, processes technology involved and map it to these business fundamentals.  Nothing your company is doing hasn't done before -- THey're definitely not as bad as you think. Check out the first 90 days book as well.  You need to walk before you run, watch before you execute, and build bridges with the people who will actually help you get those first wins under your belt
  - **HelpMeMapData** (1↑): No web scraping. I believe we are attempting to have a datamart, but it hasn't really actualized. Idk exactly what you mean by "in-house app," but we definitely have loads of software tools used internally that in theory we pull data from. The managers of those databases are not inside my department, for whatever reason. We have a data department (that I'm in), but the actual data "reality" appears to be very fragmented throughout the company.

  
I think a big challenge is that our reports that rely on the data warehouse are not centralized in one location to my knowledge. So I will have to figure that out. Thank you for your advice though :).
- **spoopypoptartz** (18↑): unironically if you have access to LLM coding agents like Claude Code or Codex go to the actual source code for the data sources and the pipelines and use them to help you map out the structure.

if you do this before meeting with anyone you will go in much more prepared and be able to take full advantage.

if you have more time long term, build a knowledge base for the data warehouse. i believe there are a few open source solutions that approach it in different ways (Meta and OpenAI have articles detailing their approach and people have used those to create their own solutions).
  - **spoopypoptartz** (6↑): otherwise my advice would be to bumrush the process I detail above manually. but thats painful.
    - **HelpMeMapData** (3↑): They are definitely not gonna let me put any code into Claude or Codex sadly. My org is very big on \~security\~
- **Bunkerman91** (11↑): This is the real world for most companies. Data is messy, documentation is sparse, and nobody has the whole picture.

A good data engineer will do exactly what you’re doing. Interview everyone, map things out, write documentation, and establish version control.

The warehouse is built. The value you bring to the table is making that warehouse something the company can use and understand. It’s a challenge but it seems like you’re on the right track.
  - **HelpMeMapData** (2↑): How do I build that buy-in for version control, though? Today there was confusion over the fact that GitHub is not the same thing as git (by a senior person who should really know the difference, imo), and another person was like "why would we want to use GitHub?"
    - **Illustrious-Win4432** (3↑): “Why would we want to use GitHub?” Is the winner. Frame that and hang it on the wall when you take your bosses job.

Your company isn’t worried about security as much as they are the perception of it. The lack of governance you called out is evidence. Governance is just as much about understanding risk as it is about permissions. Has the smell of fear more than a desire to understand the tools they bought
- **liprais** (13↑): welcome to the gronw-up's world.
  - **wmru5wfMv** (8↑): You’re gonna hate it
    - **liprais** (6↑): well,it sucks for sure.
  - **teddythepooh99** (6↑): My previous org has < 200 employees. Now, I work in an org with 30k+ employees.

None of OPs's challenges are surprising. This is not unique to DE: you will encounter very little written documentation, if at all, throughout your career that would spell everything out for you.

OP: this is how you grow as a professional, insofar as navigating ambiguity and making sense out of the chaos. If you are still overwhelmed after six months up to a year, then maybe the role is not a good fit.
    - **AndrewLucksFlipPhone** (8↑): Meh my company has paid a lot of people a lot of money for a lot of years and has still not solved the problems OP described. He ain't gonna solve them in 6 months or a year.
- **marketlurker** (4↑): Slow your roll a bit. You need to take a few and just breathe. This is important. You are in full on panic mode and you don't need to be or need to be seen freaking out. It will be tempting to talk to anyone. Don't.

Being a bit corny, "Let's start at the very beginning, a very good place to start..." (If you don't know where this comes from, Google it.)

Step 1, you need to come up with a plan and, at this stage, a message to your management on what the issue is **and how you intend to handle it**. This shouldn't take long and should be high level. Do NOT show up with "the sky is falling." Divide the problem into 3 or 4 parts that are doable. You can't swallow the whole thing at once without looking like you are floundering. Take some time to make the message crystal clear.

Step 2, the company didn't spend money on a consultant for nothing. You need to know why they built it. This will be a business, not a technical, reason. You can make this the opening of the meeting you need to have with the management. What did they hope to get out of the DW? You will be REALLY tempted to run into the weeds and talk tools. Avoid that inclination. As a tech background person, this will be very uncomfortable for you. You are going to have to suck it up and ignore your instincts on this part.

Step 3, if you don't already have it, get the access you need for the entire warehouse. Every password, every IP/DNS for all the systems. Be ready to justify some of these to the people who have them.

Step 4, breathe again. The hard part is over.

Step 5, now you need to identify all of the domains in the warehouse. What chunks of the business are flowing into it. How are they connected to each other? If you are lucky you will have a decent entity relationship diagram. It not, now is the time to create it. This is not table level. This is stuff like "customers buy products, products consist of ...". I have always found a big sheet of paper and a pencil work better than an laptop for this. it doesn't have to be 100% before you start, it will grow to that.

Step 6, now start looking for where the data for each domain comes from. Which system? What source systems? Which are the systems of record? If you notice, we didn't start at the DW, we started on the outside and are working our way in. Going straight to the DW without context is a great way to spin your wheels and waste time.

Step 7, notice we haven't talked about tools yet? That's because tools are the least important. Next up is take the information you gathered in step 5 and 6 and compare it to what is in the DW now. You should be able to map every object in the DW back to the domain and feed. If you can't then you need to flush out steps 5 and 6 some more. It is an iterative process.

There are your first few steps and that should get you started. When you get that far (and it will only take a few weeks) come back and we can go farther. DM me if you want. The following steps will start to dive into things such as,

**Governance** \- Who is responsible for the data? (Hint, it isn't IT.) What are the processes used to validate correct data? How are you handling sensitive data (PII, PHI, etc.) What do you do if there is a breach?

**Tools** \- Why were they selected? Are they the best for what you want to accomplish?

**Proccesses** \- What sort of ELT/ETL processes do you need to meet your SLAs? Yes, you have to design SLAs for the inputs and outputs of the DW.

**Data Products** \- What are the deliverables? You want to deliver more than what they already have. To the business, delivering the same capability is like rebuying the car you already own.

The first steps will give you an understanding of the DW beast you have. Until you have a solid grasp on that, you can't deliver the next steps.
- **bugtank** (2↑): Hi. Don’t worry about a graph database for tracking sources and inputs. Just use a simple flow chart.
- **Atticus_Taintwater** (2↑): Don't put too much on your shoulders.


As a fresh grad you aren't expected to unfuck the data ecosystem of a 5k head count company.


Prioritize quick wins that make you look good rather than trying to sort out some strategic thing.


If your manager is good, those ends will be compatible. If your manager is not good, these problems preceded you and will succeed you, it's not on you.
  - **HelpMeMapData** (1↑): Would you be able to provide some examples of "quick wins that would make me look good"? I'm not sure I know enough about the system yet to figure out what would be a "shiny but easy" thing to fix.
- **Illustrious-Win4432** (2↑): This is why people think we’re magicians in small/medium sized business outside of the tech bubble. Embrace the chaos, the lack of governance isn’t all bad. You’re fresh out of school and you get the opportunity to define the governance you’ll be subject to. 

My thoughts: 
1. You have GitHub, start using it. 
2. Have IT create a service account svc-spelunker@yourco.com with READ access to any system you can get.
3. Have IT create a VM
4. Download and install VS Code with the GitHub cli on the VM. For now GHCP is still a bargain. I run all day in sessions there while Claude waits for his new token drop a couple times a day.
5. Partner with GHCP and take inventory. Live in YAML, JSON, and markdown for a month. Start a bill of materials working backwards from each endpoint. Identify gates and grains. Do not limit your inventory to physical architecture, leave a column on your BoM that points to docs. Null in that column is a work list.
6. Build a pipeline auditor prompt and have it identify gaps.

This is actually an exciting opportunity if you think about it. I don’t know what company you work for but any outfit that onboards a new fella and asked them to recommend a governance framework is kinda wild. It tells me that if you do this right, you can probably gain outsized influence for a new guy.

Congrats on finding a job in the first place! Sounds like the world is your oyster there too if you play your cards right! There’s a decent chance management is finally talking about “governance” due to AI hype. If that’s the case, make sure you talk a lot about AI primitives, you do not want an executive team that has never worried about governance to open up the door to agents without contracts, registries, etc.
  - **HelpMeMapData** (2↑): Oh yeah, 100% the governance push is due to the AI hype train. At the same time, the only AI we're allowed to use inside this company is a nerfed version of Copilot with no internet search access (the company is in a relatively highly regulated industry where everything moves slowly and "security" is always a big discussion; we can't even use new code libraries without them going through a whole process and being deemed safe... which, yikes imo.) I'll see if we're allowed to use the CLI though.

  
I will do my best to get an account with read access to anything I can get my hands on, hopefully they grant me access!!!
- **GreyHairedDWGuy** (1↑): wow. You've been put is a difficult spot.   Does your company not have a team to maintain this DW solution or is it just you?  If it's just you, you're going to get buried alive.

The tools you listed are not too unusual for a large company.

I don't have any recommendations other than you will first need to dig in and understand the architecture and where data comes from, how it is transformed before you do anything else.
- **PrestigiousDepletion** (1↑): Start by mapping out which tools actually touch production data vs which are just sitting there unused, that'll cut your 20 down to like 5 real quick and save you from documenting dead weight.
