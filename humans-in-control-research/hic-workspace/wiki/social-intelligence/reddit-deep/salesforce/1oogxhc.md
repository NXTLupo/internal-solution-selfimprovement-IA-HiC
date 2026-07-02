---
id: social-intelligence/reddit-deep/salesforce/1oogxhc.md
url: "https://www.reddit.com/r/salesforce/comments/1oogxhc/has_anyone_done_a_serious_migration_to_salesforce/"
kind: "social-post"
source: "reddit-deep: r/salesforce"
subreddit: "salesforce"
title: "Has anyone done a serious migration to Salesforce before?"
author: "ballon_hacker"
date: "2025-11-04T19:35:24.000Z"
score: 7
upvote_ratio: 0.77
num_comments: 24
flair: "getting started"
extracted_at: "2026-06-23T20:32:01.768Z"
extraction_method: "praw-deep"
research_goal: "Analyze case studies of private equity firms and holding companies (such as Medforth) that build repeatable AI capabilities once and scale them across higher education portfolio companies. Deliver an operational playbook detailing the shared-service models, governance frameworks, and deployment strategies used to scale AI across admissions workflows, student communications, and enrollment operations to accelerate long enrollment cycles."
engagement: "analyze-case-studies-of-private-equity-firms-and-holding-com"
chunks:
  - id: "social-intelligence/reddit-deep/salesforce/1oogxhc.md#c0"
    char_span: [0, 1114]
    sentence_count: 14
    key_terms: [salesforce, migration, using, did, done, comments, thinking, service]
    concepts: [salesforce, migration, using, comments, thinking]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1oogxhc.md#c1"]
    token_count: 257
    sources: [{"n":"reddit-deep: r/salesforce","u":"https://www.reddit.com/r/salesforce/comments/1oogxhc/has_anyone_done_a_serious_migration_to_salesforce/"}]
  - id: "social-intelligence/reddit-deep/salesforce/1oogxhc.md#c1"
    char_span: [1128, 2164]
    sentence_count: 11
    key_terms: [salesforce, use, migration, files, peice, sucks, tools, brilliant-pie5207]
    concepts: [salesforce, migration, files, peice, sucks]
    related_chunks: ["social-intelligence/reddit-deep/salesforce/1oogxhc.md#c0"]
    section: Comments
    token_count: 233
  - id: "social-intelligence/reddit-deep/salesforce/1oogxhc.md#c2"
    char_span: [2166, 4211]
    sentence_count: 19
    key_terms: [data, salesforce, doing, like, implementation, enough, years, "it's"]
    concepts: [salesforce, doing, implementation, enough, years]
    section: Comments
    token_count: 461
  - id: "social-intelligence/reddit-deep/salesforce/1oogxhc.md#c3"
    char_span: [4213, 6424]
    sentence_count: 25
    key_terms: [data, salesforce, zendesk, start, done, map, need, sure]
    concepts: [salesforce, zendesk, start, convinced, important]
    section: Comments
    token_count: 482
  - id: "social-intelligence/reddit-deep/salesforce/1oogxhc.md#c4"
    char_span: [6426, 8498]
    sentence_count: 15
    key_terms: [email, external, sure, salesforce, order, ids, sandbox, zendesk]
    concepts: [external, email, salesforce, order, deliverability]
    section: Comments
    token_count: 457
  - id: "social-intelligence/reddit-deep/salesforce/1oogxhc.md#c5"
    char_span: [8500, 9639]
    sentence_count: 9
    key_terms: [data, lot, salesforce, easy, dataloader, spending, tools, here]
    concepts: [salesforce, dataloader, spending, tools]
    section: Comments
    token_count: 268
---
# Has anyone done a serious migration to Salesforce before?

Source: [reddit-deep: r/salesforce](https://www.reddit.com/r/salesforce/comments/1oogxhc/has_anyone_done_a_serious_migration_to_salesforce/)
Posted by **ballon_hacker** · **7↑** · **24 comments**

We are thinking of migrating to Salesforce since Zendesk Sell is shutting down. We have nearly 4 years' worth of data. Our engineering team is kinda small and were thinking of using some migration tool. Has anyone done this before? Which service or tool did you use? How did it go? Also, we recently started using Zendesk, <1year, we are planning on shifting that to Salesforce Service Cloud as well. Not as worried about this as the CRM data, if you have done this before, highly appreciate your input.

Update 1: A bunch of you gave me some very good suggestions, thanks for everyone who accepted my dm.?

Update 2: Migrations are pricier than i thought. Tried using an automated solution, didnt go well. Consulted with a few companies and the only price that made sense was of clonepartner. They did a pretty good job now that the migration is complete.

## Comments

- **DeltaForceFish** (13↑): Salesforce makes it pretty easy to migrate too. You just need to make sure to really map out what you have with where its going. Plan ahead for what is an account vs contact vs lead (if you plan to use them). There are a lot of migration tools you can use or you can use the standard demand tools or workbench and upload in batches. Dont stress too much. As long as you can get your data into an excel file and save it as a csv you can get it into salesforce super quick. The most challenging peice is typically if you have files and attachments on your accounts that you also want to move over. That peice sucks.
  - **Brilliant-Pie5207** (3↑): Files and attachment migration absolutely sucks (unless there is some new tool to use).  I second the advice to sit down and map things out first. Settle on your architecture and take the opportunity to clean up old tech debt- don’t just throw it all into Salesforce.  Document decisions and designs so you have something g to fall back on people agreeing with. 

For real, it’s crazy but I really like doing implementations. :)
    - **Strong-Dinner-1367** (1↑): This.
  - **ballon_hacker** (1↑): Honestly, I have never used Salesforce. Choosing Salesforce was influenced by a couple senior directors. They hired some implementation partner and are in charge of the implementation process. But for some reason, that partner doesn't do data migrations and this project fell into my bucket. I thought of just finding some vendor and getting them to deal with everything. But after getting a few quotes, I'm thinking of doing it in house. Salesforce definitely has a learning curve. I haven't even gotten to attachments and this already feels like its too much.
- **Decent-Impress6388** (3↑): Did a similar migration about 2 years back, not from Zendesk but from another CRM with about 5 years of data and here are the few things that helped:
Don’t just pick a CRM and expect it to perform in the bestest way instantly. Map your data first. This sounds basic but saves headaches later when things doesn’t line up properly.
Data loader helps a lot and solves the most of it. Some paid tools like Celigo exist but felt like overwork for us. 
Honestly, the hardest part was cleaning up the old data before moving it. 5 years means duplicates and messy records. Spent more time on that than the actual migration.
For the Zendesk to Service Cloud move, should be easier since it’s fresher data.
Big mistake made by us was mot testing enough with real users beforehand. I would recommend doing a pilot if possible. How many records are you looking at roughly?
- **Known-Sea-1342** (2↑): Doing one right now and it's easy enough to create a custom connection or export and import data if it's a simple enough setup.
- **0razor1** (1↑): I've done it about 50 times over, single handedly. Had aux support on large imports (basically, small batch size, millions of rows.)

It's easy, relatively, and good practices around vlookups and conditional formatting in excel go a long way in foreseeing issues before they happen.

Sadly, even as I work as a tech arch, often I am the one who has to roll up his sleeves to get data loads done. When you've done as many as I have, you have a better grip on what can and may go wrong as one proceeds.
- **Interesting_Button60** (1↑): What do you need input on? 

  
Are you building Salesforce yourselves or through a partner? That's an important distinction on the type of advice you might need. 

Regardless of which approach, before you make any decision clearly map out all processes that need to be facilitated by Salesforce and then ensure you scope and build to that. 

Start with clear MVP goals so you are up and running asap.

Pre-review all your data points and data you want to migrate. The biggest challenges in shifting will be there. For example, some things that are one table in Zen might be multiple in Salesforce or vice versa. Those data transformations will drive configuration requirements.

Make sure you include users in the design and build so when they switch it's not new to everyone. How big is your team?
- **RainbowAdmin** (1↑): I've done this a few times. 

Start with some data mapping. What fields in ZenDesk can be mapped to Salesforce and which object (Account, Contact, Case). Also, figure out their percentage of usage and how/if the data is being used before migrating over. This is especially important before you start creating new, custom fields.

Make sure to create a legacy ID field on each object to map it back to ZenDesk. This will save you a lot of headaches. 

Do some data cleaning, you are already in the weeds with the data so try and clear out any bad data before bringing it over. 

Find your Subject Matter Experts (SMEs) a good SME is worth their weight in gold. I'm not kidding about this, I had a Customer Service Rep lead who was so amazing during our ZenDesk migration that I convinced her to join my team. Even though she only had experience as a SF user, I knew she could quickly make up the gap in knowledge if we hired her as an Admin. Convinced leadership to make it a Jr. Role and worked with her to get certified. 

The sandbox will be your friend when attempting to upload and map data so make sure you test it out beforehand. 

Give yourself time for an overlap. Cut off everyone's Create and Edit access in ZenDesk but make sure they can still read records. There will be some back and forth data cleanup, so make sure to give yourself some wiggle room.

Make sure to test email-to-case in a sandbox, just grab the server address and you can email it directly. Just make sure you are mindful of turning in and off email deliverability.
  - **Adventurous-Date9971** (3↑): Nail mapping, external IDs, and a staged load order; that’s what keeps these migrations sane.

\+1 on legacy IDs. Also add External ID fields and use upsert everywhere so references stick (Account, Contact, Opportunity, Case). Load order that works: users/owners first (map by email), then Accounts, Contacts, Opportunities/Leads, Cases, then Activities/Emails/Attachments. Ask Salesforce for “Set Audit Fields” so you can keep CreatedDate/ClosedDate. In sandbox, set email deliverability to System email only, test email-to-case with the long address, and disable auto-responses during tests.

Dedup before you import: domain-based Account keys and email-based Contact keys; run Duplicate Rules in sandbox to see what will get blocked. For overlap, make Zendesk read-only and run nightly diffs until cutover.

I’ve used Fivetran to pull Zendesk and dbt to standardize stages/owners; DreamFactory helped by exposing Snowflake/SQL exports as REST so a simple Python script could upsert by External IDs.

Get the mapping, external IDs, and load order right, and the rest is cleanup and comms.
- **Voxmanns** (1↑): Unless you have a well seasoned and organized in house team of Salesforce specialists fitting the size of the task (depends on volume and complexity) you're going to want a Salesforce partner for this. 

You're going to want to vet them intensely, and make 100% sure they're actually understanding your business and not just order taking the tickets for builds. Trust me, you'll hate it more than spreadsheets if you leave it to a partner who is technically sound but ambivalent to your business goals and strategy. 

Relatively speaking, Salesforce makes this easy. But don't conflate the word 'easy' with 'small level of effort and complexity'. It's easier to go from Zen to Salesforce than vice versa. Both require a lot of strategy, project management, EA, and cross department coordination.
- **piccler** (1↑): Done it a few times from SAP to SF, did most of the conversion programs in SAP ABAP. Clean up after the fact using Mulesoft tools.
- **Low_Relative_8295** (1↑): Map your data first, do u have a lot of relational data? it might be worth spending on [Dataloader.io](http://Dataloader.io) if you have a lot of relations/build something custom else the standard data loader is perfect. Then there is sf cli that can also import related data properly but you need some expertise/dev efforts there. A lot of options but 1st step -> Map your data (spending time here saves a lot of pain down the line), 2nd Step -> Is it simple data structure or complex, tools vary here but are plenty. Hope it helps
- **ear_tickler** (1↑): This is not easy. Highly recommend you enlist a Salesforce partner to either perform the work or hold your hand through it.
