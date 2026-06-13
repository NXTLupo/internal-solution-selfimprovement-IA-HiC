---
id: social-intelligence/reddit-deep/dataengineering/1rbk3ov.md
url: "https://www.reddit.com/r/dataengineering/comments/1rbk3ov/new_cto_has_joined_and_is_ignoring_me/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "New CTO has joined and is ignoring me"
author: "anxiouscrimp"
date: "2026-02-22T12:00:41.000Z"
score: 134
upvote_ratio: 0.92
num_comments: 87
flair: "Discussion"
extracted_at: "2026-06-11T18:58:17.198Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c0"
    char_span: [0, 2078]
    sentence_count: 18
    key_terms: [people, everything, cto, data, dataengineering, estate, years, move]
    token_count: 464
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c1"
    char_span: [2080, 2672]
    sentence_count: 8
    key_terms: [behaviour, disrespectful, understanding, challenges, sidelining, obviously, outlining, approach]
    token_count: 128
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c2"
    char_span: [2687, 4847]
    sentence_count: 15
    key_terms: [cto, data, time, already, flag, get, red, situation]
    section: Comments
    token_count: 493
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c3"
    char_span: [4849, 6970]
    sentence_count: 16
    key_terms: [available, new, been, challenge, decisions, executive, technical, because]
    section: Comments
    token_count: 467
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c4"
    char_span: [6972, 7990]
    sentence_count: 11
    key_terms: [communicate, scattered, hired, boss, get, good, new, thisfunnieguy]
    section: Comments
    token_count: 244
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c5"
    char_span: [7992, 10091]
    sentence_count: 12
    key_terms: [cto, change, get, good, talk, pointless, contacts, company]
    section: Comments
    token_count: 505
  - id: "social-intelligence/reddit-deep/dataengineering/1rbk3ov.md#c6"
    char_span: [10093, 12118]
    sentence_count: 13
    key_terms: [contract, company, big, down, fact, need, use, experience]
    section: Comments
    token_count: 503
---
# New CTO has joined and is ignoring me

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1rbk3ov/new_cto_has_joined_and_is_ignoring_me/)
Posted by **anxiouscrimp** · **134↑** · **87 comments**

Keen for any thoughts or feedback.

Background - I’ve worked at my current employer, a mid-sized luxury retailer. We turn over about £200m annually. I’m the sole BI architect and have been for the last 5 years or so. I’ve been with the company for 11 years. I do everything - requirements, building out the data warehouse, building and maintaining the cubes, some SSRS development. In the last two years I’ve designed and built a new ELT framework for us to move away from SSIS and integrate to all of our various disparate systems - ERP, CRM, GA4, digital marketing platforms etc etc. Then I’ve cleaned all of this data, modelled it and built a PBI semantic model on top to bring everything together. That’s the first (and biggest) phase of replacing our existing estate.

Challenge - I had a very good relationship with our previous CTO. Now a new CTO (a contractor) has joined and he seems to be completely ignoring me. We’ve barely had any interaction. He’s worked with GCP in the past and immediately has set up meetings with a google partner. In the first meeting they opened with ‘so we understand that you’ve got a very fractured data estate with no single source of truth’ which is just totally untrue. But this CTO seems to have no interest in engaging with me in the slightest and I’m hearing from other people that he just wants to ‘move us to bigquery’. We’re entirely on Microsoft for everything - not just BI - so this is an enormous piece of work without a clear benefit. In my opinion the issues we have are generally people based - not enough people and certainly not enough people translating data into something actionable or understandable. I’m open to the idea of moving some or part of our estate to GCP - but shouldn’t such a large move like this be considered in the context of ‘what problem are we trying to solve?’

I’m feeling pretty upset - I’ve given a lot to this company over the years and this behaviour feels disrespectful and weird. I’m keen to hear from anyone if they’ve seen this behaviour in the past and how to approach it. At the moment my plan is to write a document outlining our current data estate for him to read and then talk him through. Obviously I’ll also update my CV.

TLDR: new contract CTO has joined and is ignoring and sidelining me. He seems very intent on moving us to GCP despite not really understanding any of our actual challenges. Why is he doing this? Is this a strategy?

## Comments

- **ThroughTheWire** (260↑): contract cto is already a yellow/red flag

being ignored entirely is a red flag.

cto trying to make sweeping architectural changes within weeks of joining without understanding the context is a red flag.

i think you can see already that there isn't much hope in this situation which is why you're gonna update your resume. I wouldn't waste my time too much trying to make their life any easier if they've already been ignoring you this much so far - they're just gonna ignore whatever output you give them. why waste your energy that could be spent on literally anything else?
  - **dknconsultau** (26↑): Sage advice. The winds of change can not be stopped. The only upside is to do the GCP project get the experience and certs then leave.
- **financialthrowaw2020** (152↑): If the CTO intends and succeeds to migrate to Google it'll take a long time and you'll have a job at least for that duration of time. Use that time to start looking for work. The CTO has come into this job thinking you are the problem. Not much you can do about this, I'm sorry it's happening. Usually, when migrations to new stacks occur, they focus on hiring experts in that stack, which is why he's writing you off early.
  - **anxiouscrimp** (39↑): Yeah this is exactly my thoughts/fear!
    - **chock-a-block** (23↑): Don’t burn daylight. Update the resume and burn every hour of PTO before GTFO. 

Do not look back. Do not put any effort for the transition. If the CTO is that unskilled, they made their bed.
- **kitsunde** (48↑): Reading your post at face value, it’s pretty common for C-level executives to show up on the back of whatever he’s heard interviewing (data issues, we need to leverage data more, it’s hard to get a data picture bla bla) and get frustrated in an unfamiliar situation. Second system syndrome is incredibly common at all levels.

You can try to document everything, and particularly provide metrics around how things are running to make a case that it’s actually in hand. I would assume there’s a deeper issue with data access that you aren’t fully informed about, so you might not even know what you’re arguing against.

Ultimately these decisions are completely out of your hands, a C-level executive that’s recently hired has absolute authority to start changing things entirely by opinion. It’s going to take several quarters for wrong decisions impact to be felt to the point of them being blamed for them.

If your new CTO doesn’t buy what you’re selling, and you’re not willing to go along for the ride with an open heart, absolutely look for the quickest exit.

I say all this as the C-level executive. It’s also very possible the new CTO is seeing/know something you don’t, and what you’re reacting to is the first step in a long term plan that they themselves can’t clearly articulate because they are new.

If you do stay on, you should try to build a new relationship and pull in the same direction for the next year before passing judgement. Good luck!
  - **anxiouscrimp** (11↑): Thanks for the reply! Yeah I do think we’ve got an issue with data being translated/available to the highest levels and I expect that’s what he’s been told. I’m just not sure why his solution is to go full speed onto a technical answer when he doesn’t understand the underlying problems. I’ll try and be open-minded and challenge the points empirically - and just scream into a pillow privately.
    - **RyanTheTourist** (7↑): Let's consider the other C-Suite members, are they able to draw insights from what is available to them? It NOT would surprise me if part of the issue is their inability to infer what actions to take when looking at the available metrics and viz.
If this is the case do you have capacity to make a "given we observe a,b,c - options x,y,z are worth considering" - reposition yourself from technical resource to strategic partner.

But also start working on your next step, the well may already be poisoned against you. I'm sorry it sucks, been there and in time better things do come along

(edited - missed the NOT)
    - **thatguydr** (7↑): Don't do that. Don't challenge anything.

They hired him *because he said he could fix the problem they perceived.* The problem isn't him - it's the people you've been working for.

Your clout is mostly gone. Just polish the resume and wait to be let go. Sorry about that.
  - **randrews1886** (2↑): I can clearly see this with our new head of. My issue is with comms. They seem so scattered and uninformative. I would have thought recruiting someone at that level would mean their comm skills would have to be good. Saying they can't articulate because they are new seems very poor to me
    - **kitsunde** (2↑): I suppose, but you don’t really get hired on how you communicate with your reports. You get hired by how you communicate with your peers and the boss. Some people are also really brilliant on a narrow part of the job, and it makes up for the parts they aren’t good at.

If your boss is unclear and scattered, they might need some help and it can be a great opportunity for you to feed them whatever direction you want. Turn a problem into an advantage if you can, that’s what I do.
  - **thisfunnieguy** (1↑): How much power to change things do you think a CTO that’s on a contract has?

This person is a short timer.
- **reditcyclist** (85↑): We had this with a contract CTO who could talk the talk but.... Anyway it took a good 18mths for the CEO to get rid. If you have other contacts in C suite keep those active and open.
- **reviverevival** (26↑): I feel like every time a new CTO comes in they have to change things for the sake of changing things in order to justify their own position.
  - **WallyMetropolis** (6↑): If the org makes a leadership change, it means they've decided they want to change things. A new CTO who doesn't make any changes is pointless.
  - **my-sweet-fracture** (1↑): A tale as old as time
- **Hulainn** (18↑): I have seen this before.  My advice - if the CTO won't talk to you, you are cooked.  I am sorry to say it, but he is already planning to get rid of you, otherwise your input would be valued.  Don't assume that a long tenure of good work, or good relationships elsewhere in the company, will save you - if your reporting line is against you, it's over (unless you can move laterally within the org, but you would likely have to substantially change roles to get out from under the CTO.)  Your performance reviews are about to get worse as well, due to downward pressure to push you out.  They do not have to be fair, and defiance is pointless - if the CTO wants it, a "case" will be built for removing you, even if it takes months or years.

The safest bet is to update your resume and reach out to contacts you trust.  Presumably you have those, from former coworkers happy with what you accomplished.  It is far easier to change your environment than to change the nature of a CTO who is not interested in engaging with you on goals, tech, costs, etc. on their merits.  I am sorry you are dealing with this, but you should not pass up outside opportunities while holding onto "hope" that something gets better there.
- **kthejoker** (15↑): In BI your most important job security is making business friends in high places who either directly benefit from the value of your work or see you as an ally pushing the company in the right direction.

One thing you didn't mention is how the business perceived all of this ELT framework and Power BI model. Does everyone in the company use it every day? How long does it take to make a change? Are they knocking down your door asking for more?

If all you have is a tech stack and your own interpretation of the value you provide, you are going to be easily waylaid by either a smooth talking chav or someone who actually can potentially 10x a company.

Tale as old as time.
- **TodosLosPomegranates** (12↑): The fact that they hired a contract CTO kind of tells you all you need to know. He’s going to try and make big bold moves so he either gets a good recommendation for his next contract role and maybe a bonus or he’s making a big bet so that he can become full time cto. You’re in his way with your common sense objections based on experience and fact. And there’s nothing you can really do about it. 

Leadership is taking a big swing on this guy and they need him to succeed as much as the guy himself wants to “succeed” and they want to move fast. That contract is a constraint that ensures he’ll put his head down ignore the things that usually slow teams down (like rationality) and do something “bold”

Don’t waste your energy. Document everything,earn what you can (GCP on your resume is a good thing) and get prepared to leave.
- **RBeck** (9↑): In my experience a contract CTO's mission is to hire as many people from their company as possible, until they are fully embedded and hard to remove.

I'd start looking for a job.
  - **MrLyttleG** (2↑): Je valide à 100% pour l'avoir vécu !
- **Budget-Juggernaut-68** (15↑): You all move 200mil only and need bigQuery?
  - **anxiouscrimp** (16↑): Yeah and our biggest fact table is probably only 500m rows
    - **tomrosmono** (12↑): 500m rows is a small DHW and any modern tool can manage that volume.
    - **Sufficient_Example30** (-2↑): Which means your  warehouse  isn't even a couple terabytes and he wants to be on cloud ,use a data warehouse and use bigquery
