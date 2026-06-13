---
id: social-intelligence/reddit-deep/dataengineering/1tqd0db.md
url: "https://www.reddit.com/r/dataengineering/comments/1tqd0db/help_with_old_scala_pipeline_integration_with/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Help with Old Scala Pipeline integration with DataHub ( with no existing store for metadata other than normal field name + type)"
author: "Agile-Flower420"
date: "2026-05-28T19:03:24.000Z"
score: 11
upvote_ratio: 1
num_comments: 4
flair: "Help"
extracted_at: "2026-06-11T18:58:17.194Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1tqd0db.md#c0"
    char_span: [0, 2135]
    sentence_count: 14
    key_terms: [datahub, pipeline, like, something, dataengineering, output, descriptions, field]
    token_count: 463
  - id: "social-intelligence/reddit-deep/dataengineering/1tqd0db.md#c1"
    char_span: [2137, 3946]
    sentence_count: 19
    key_terms: [metadata, datahub, started, been, code, here, "i'm", "it's"]
    token_count: 390
  - id: "social-intelligence/reddit-deep/dataengineering/1tqd0db.md#c2"
    char_span: [3961, 5423]
    sentence_count: 9
    key_terms: [learning, find, dataengineering, resources, sometimes, metadata, because, classes]
    section: Comments
    token_count: 336
---
# Help with Old Scala Pipeline integration with DataHub ( with no existing store for metadata other than normal field name + type)

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1tqd0db/help_with_old_scala_pipeline_integration_with/)
Posted by **Agile-Flower420** · **11↑** · **4 comments**

So... currently we're trying to integrate with DataHub to use as our catalog. The issue is that we don't HAVE any metadata (other than obvious field names and types), there is literally no place where we're storing in any way shape or form things like descriptions or tags or really anything like that for any of the data sets and fields anywhere in the pipeline. Of course we could just manually create these artifacts/files for consumption in DataHub OR we could author them IN DataHub... but that doesn't seem like it's the best option here.

The closest thing we have are Scala case classes used during transformations and outputs. This is the only thing REMOTELY close to something even resembling what we'd need to output for ingestion to 'flesh out' these data models.

Currently my plan is to create emitters in each pipeline app that will read any annotated "@DataContract" case class then output the field names, types, and any annotated 'descriptions', tags, etc of these things on outputs. Then we will have an nice little packet to live with the parquet files at the file root for reading by anything.. including DataHub.

My issue here is, well number 1, we can't change the shape of EVERYTHING... so things like dbt and other complete changes to the code base are out. But also... I don't want yet another 'duplication' of data that is untethered to actual code.

I feel like creating emitters for each of our pipeline apps to emit an almost 'delivery package' at output using annotations ( which can then also be used in the code as well) is a good idea either way... but I keep getting stuck. I keep thinking.. there's GOT to be a a better way to do this... I mean... how is this not something that already exists? Or is this something that is just usually done in practice anyway.

Any ideas?! I feel so dumb right now. lol I just started in Scala about 5 years ago ( so I admittedly have no idea what I'm doing). And I started Scala with this same code base I'm talking about here.... and it's been just plugging along for probably 10 years. Whoever built it, is no longer here, and wasn't here for a while even before I started.... and there is zero documentation on it.. so we've just been going along with it as best we can for a while now. It's not bad per-se just not ideal.

I feel like I'm overthinking too... Should I just let this go and advise just doing all of this in the DataHub UI? That just seems yucky though... Ugh.. I just don't know.

Side note: This DataHub project is pretty big(important). While it's NOT my first priority, any wins I can get in the code clean up/standardization department because of the scope and visibility and priority of this project would be an AWESOME 'bonus', and I want to try to lean in that direction where possible/needed... but obviously I have to be careful not to make that my main focus so that I can keep everything as 'in scope' as possible.

Edit: I think I figured out the direction we’re going to take.

Ideally, we’d refactor pipelines to use strongly-typed outputs and generate metadata directly from code. A more practical middle ground would have been adding annotations to output classes and generating metadata from those. However, after digging deeper into DataHub, we’re leaning toward creating a formal metadata/data dictionary repository as the source of truth, ingesting that into DataHub, and using lineage and metadata propagation to carry context downstream.

Appreciate all the feedback. It’s nice get to talk these things through with other people who also love this stuff! Everybody wins because everybody learns!

## Comments

- **AutoModerator** (1↑): You can find a list of community-submitted learning resources here: https://dataengineering.wiki/Learning+Resources

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/dataengineering) if you have any questions or concerns.*
- **Appropriate-Sir-3264** (2↑): honestly ur approach sounds pretty solid for a legacy pipeline. using annotated scala case classes as metadata source feels way better than manually maintaining everything in datahub ui. feels less like overengineering and more like practical “metadata as code” tbh.
  - **Agile-Flower420** (1↑): Thank you for the feedback! I sometimes find myself doubting a design choice sometimes because I think…. “SURELY there’s already an established way to handle this?!?!” Only to find out that there isn’t really? I mean I guess that sort of speaks to how varied all our modern architecture is. And how, more times than not, we’re often all inheriting layers of legacy code bases. So most of the solutions tend to be some crazy thing we’ve had to cobble together in the most creative ways we can find.  LOL 

I ‘accidentally’ got to be a DE because ~15 years ago I fell in love with sql…. So learning SQL was probably the closest I ever got to ‘formal’ learning. Since then it’s just been figuring it out… so I’m ALWAYS of the mindset that, if I’d ever taken any classes I’d just know exactly what to do.
