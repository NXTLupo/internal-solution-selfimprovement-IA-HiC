---
id: social-intelligence/reddit-deep/dataengineering/1o88lxr.md
url: "https://www.reddit.com/r/dataengineering/comments/1o88lxr/is_azure_blob_storage_slow_as_fuck/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Is Azure blob storage slow as fuck?"
author: "wtfzambo"
date: "2025-10-16T15:05:09.000Z"
score: 1
upvote_ratio: 0.54
num_comments: 70
flair: "Help"
extracted_at: "2026-06-11T18:58:17.215Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c0"
    char_span: [0, 2086]
    sentence_count: 9
    key_terms: [data, synapse, "i'm", storage, dataengineering, azure, notebooks, situation]
    token_count: 484
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c1"
    char_span: [2088, 3073]
    sentence_count: 1
    key_terms: [calls, total, avg, max, min, transform, includes, quality]
    token_count: 504
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c2"
    char_span: [3075, 4787]
    sentence_count: 8
    key_terms: [data, environments, local, code, total, minutes, calls, took]
    token_count: 518
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c3"
    char_span: [4802, 6651]
    sentence_count: 15
    key_terms: [time, synapse, code, data, cluster, problem, spark, take]
    section: Comments
    token_count: 448
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c4"
    char_span: [6653, 8317]
    sentence_count: 14
    key_terms: [write, container, takes, code, data, wtfzambo, storage, polars]
    section: Comments
    token_count: 434
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c5"
    char_span: [8319, 9870]
    sentence_count: 14
    key_terms: [reading, synapse, spark, data, repeatedly, iteration, wtfzambo, dataset]
    section: Comments
    token_count: 370
  - id: "social-intelligence/reddit-deep/dataengineering/1o88lxr.md#c6"
    char_span: [9872, 11781]
    sentence_count: 15
    key_terms: [region, synapse, code, storage, considerationok8231, pyspark, resources, involved]
    section: Comments
    token_count: 455
---
# Is Azure blob storage slow as fuck?

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1o88lxr/is_azure_blob_storage_slow_as_fuck/)
Posted by **wtfzambo** · **1↑** · **70 comments**

Hello,

I'm seeking help with a bad situation I have with Synapse + Azure storage (ADLS2).

The situation: I'm forced to use Synapse notebooks for certain data processing jobs; a couple of weeks ago I was asked to create a pipeline to download some financial data from a public repository and output it to Azure storage.

Said data is very small, a few Megabytes at most. So I first developed the script locally, used Polars for dataframe interface and once I verified everything worked, I put it online.

# Edit

Apparently I failed to explain myself since nearly everyone who answered, implicitly thinks I'm an idiot, so while I'm not ruling that option out I'll just simplify:

* I have some code that reads data from an online API and writes it somewhere.
* The data is a few MBs.
* I'm using Polars, not Pyspark
* Locally it runs in one minute.
* On Synapse it runs in 7 minutes.
* Yes, I did account for pool spin up time, it takes 7 minutes after the pool is ready.
* Synapse and storage account are in the same region.
* I am FORCED to use Synapse notebooks by the organization I'm working for.
* I don't have details about networking at the moment as I wasn't involved in the setup, I'd have to collect them.

Now I understand that data transfer goes over the network, so it's gotta be slower than writing to disk, but what the fuck? 5 to 10 times slower is insane, for such a small amount of data.

This also makes me think that the Spark jobs that run in the same environment would be MUCH faster in a different setup.

So this said, the question is, is there anything I can do to speed up this shit?

# Edit 2

Under suggestion of some of you I then profiled every component of the pipeline, which eventually confirmed the suspicion that the bottleneck is in the I/O part.

Here's the relevant profiling results if anyone is interested:


### local

```
_write_parquet:
  Calls: 1713
  Total: 52.5928s
  Avg:   0.0307s
  Min:   0.0003s
  Max:   1.0037s

_read_parquet (this is an extra step used for data quality check):
  Calls: 1672
  Total: 11.3558s
  Avg:   0.0068s
  Min:   0.0004s
  Max:   0.1180s

download_zip_data:
  Calls: 22
  Total: 44.7885s
  Avg:   2.0358s
  Min:   1.6840s
  Max:   2.2794s

unzip_data:
  Calls: 22
  Total: 1.7265s
  Avg:   0.0785s
  Min:   0.0577s
  Max:   0.1197s

read_csv:
  Calls: 2074
  Total: 17.9278s
  Avg:   0.0086s
  Min:   0.0004s
  Max:   0.0410s

transform (includes read_csv time):
  Calls: 846
  Total: 20.2491s
  Avg:   0.0239s
  Min:   0.0012s
  Max:   0.2056s
```

### synapse

```
_write_parquet:
  Calls: 1713
  Total: 848.2049s
  Avg:   0.4952s
  Min:   0.0428s
  Max:   15.0655s

_read_parquet:
  Calls: 1672
  Total: 346.1599s
  Avg:   0.2070s
  Min:   0.0649s
  Max:   10.2942s

download_zip_data:
  Calls: 22
  Total: 14.9234s
  Avg:   0.6783s
  Min:   0.6343s
  Max:   0.7172s

unzip_data:
  Calls: 22
  Total: 5.8338s
  Avg:   0.2652s
  Min:   0.2044s
  Max:   0.3539s

read_csv:
  Calls: 2074
  Total: 70.8785s
  Avg:   0.0342s
  Min:   0.0012s
  Max:   0.2519s

transform (includes read_csv time):
  Calls: 846
  Total: 82.3287s
  Avg:   0.0973s
  Min:   0.0037s
  Max:   1.0253s
```

### context:

`_write_parquet`: writes to local storage or adls.

`_read_parquet`: reads from local storage or adls.

`download_zip_data`: downloads the data from the public source to a local `/tmp/data` directory. Same code for both environments.

`unzip_data`: unpacks the content of downloaded zips under the same local directory. The content is a bunch of CSV files. Same code for both environments.

`read_csv`: Reads the CSV data from local `/tmp/data`. Same code for both environments.

`transform`: It calls `read_csv` several times so the actual wall time of just the transformation is its total minus the total time of read_csv. Same code for both environments.

\---

old message:

>!~~The problem was in the run times. For the same exact code and data:~~!<

* >!~~Locally, writing data to disk, took about 1 minute~~!<
* >!~~On Synapse notebook, writing data to ADLS2 took about 7 minutes~~!<

>!~~Later on I had to add some data quality checks to this code and the situation became even worse:~~!<

* >!~~Locally only took 2 minutes.~~!<
* >!~~On Synapse notebook, it took 25 minutes.~~!<

>!~~Remember, we're talking about a FEW Megabytes of data. Under suggestion of my team lead I tried to change destination an used a blob storage of premium tier (this one in the red).~~!<

>!~~It did have some improvements, but only went down to about 10 minutes run (vs again the 2 mins local).~~!<

## Comments

- **dasnoob** (9↑): The fact adding data quality checks to your code made the transfer that much slower makes me think the problem is your code.
  - **wtfzambo** (4↑): The code was slow on Synapse even before the data quality check. 1 minute locally and 7 minutes on Synapse, code being EXACTLY the same, how can the code be the problem?
    - **OkCapital** (0↑): If you use a spark cluster… start up time. Same shit with databricks. Starting up can take a while and it depends on how quickly resources are available. Does it take 7 minutes if you execute your notebook again? A job compute in databricks for example only gets executed per unique run for a flow. Synapse, now with the implementation of fabric, could behave similar. I am leaning towards spark cluster startup time.
- **reallyserious** (5↑): Have you confirmed it's actually the writes that take more time?
  - **wtfzambo** (0↑): If the same exact code with the same exact data source takes 1 minute locally and 10 minutes on synapse, what else could it be? Mind it, the data is loaded directly from the source, which is an online API, so the only thing that changes is the destination (well, and the compute machine).
    - **reallyserious** (8↑): So you haven't confirmed it.
- **RustOnTheEdge** (9↑): Well no, your time is not spend on writing data to storage, because a few MB from synapse would take a second, like literally a second. 

Your problem is likely in your spark cluster. Start up time, weird joins, something like that.
  - **wtfzambo** (4↑): > Your problem is likely in your spark cluster. Start up time, weird joins, something like that.

I already accounted for the start-up time. The execution time I reported already subtracts it from the total. No weird join is going on. The first iteration was a simple read from an API and write locally / to object storage.

Locally it takes 1 minute. On synapse it takes 7. Same data. Same code.
- **anxiouscrimp** (3↑): Quite interested to see the resolution here. What about if you save the data into a separate container in ADLS and then write from there? How fast is that? Can you post some of the code you’re using?
  - **wtfzambo** (2↑): I tried with different containers but the result didn't change except when I switched to the "premium" version of storage account, which did reduce the runtime a little bit, but nowhere close to the local execution time.

Unfortunately I cannot post the code, but it's nothing fancy: read data from some public website, perform some basic cleaning, write to adls. Really basic shit.
    - **anxiouscrimp** (2↑): So if you used your code to transfer files from container a to container b in the same storage account, then it takes more than a second or two to execute?
- **BelottoBR** (2↑): I have been struggling to write data too. Specifically when writing, polars usually relay on sqlalchemy which is not know for performance. 

Now I am writing the parquet files with polars and using spark just do write the sql database
  - **wtfzambo** (1↑): > polars usually relay on sqlalchemy which is not know for performance.

Even to write to storage container 🤯?
    - **BelottoBR** (2↑): I mean a “to_sql”. If you use parquet, etc. it’s quite fast.
- **Repulsive-Hurry8172** (2↑): Are they on the same VNET?
  - **wtfzambo** (1↑): I'll have to double check on Monday as I wasn't the one who set the whole thing up, I merely inherited it. I would hope they are 🤔
- **Hofi2010** (1↑): I would isolate if it is the read or write that takes the time. 

A few megabyte of data shouldn’t even take a second. Not sure your algorithm, but why do you need a spark cluster for a few MB? Regular compute would be sufficient
  - **wtfzambo** (1↑): I don't, like I said I'm *forced* to use Synapse notebooks. It's not a choice I made, it's mandated by the organization I'm working for and I cannot do otherwise. We're literally prevented from using anything else.
- **Simple_Journalist_46** (1↑): I suspect an issue (not the only one perhaps) is in your use of polars. I have never run it in synapse so I could be wrong but I have never had the issue described while using pyspark. (Not that there aren’t slow things about adls/synapse, just data loading MBs is not one of them)

Also, since you did see speed increases with Premium storage, are you repeatedly looping over your dataset and reading it many times? If so, that is an antipattern. It may work locally but cause issues in the cloud. 

Really to get any further you would need to post your data reading and writing code. And probably your polars loading approach. And as others said some information about your networking between the resources (and regions)
  - **wtfzambo** (1↑): > are you repeatedly looping over your dataset and reading it many times? 

In the second iteration of the code there is an extra read yes, but like I said, locally it takes only 1 or 2 minutes (depending on the iteration) while on Synapse it takes 7 and above. Accounting for spark pool start up time.

TBH, even reading small datasets with spark is slow in that setup.

I don't have access to info about networking at the moment, I wasn't involved when it was set up but I'll try to take a look. The only thing I know is that both synapse and storage are in the same region. Is there any "red flag" that I should be looking for, in the network configurations?
    - **Simple_Journalist_46** (2↑): Yes, you need to know if for instance the resources are in different virtual networks, and/or if traffic between the resources goes through a network virtual appliance for filtering/monitoring/routing. Check how the linked service is set up - is it the default storage for the workspace? Does synapse connect to a private endpoint on the storage account? Is there any customer managed keys involved?

If you run the code interactively in Synapse you should be able to able to spot the cell that is slow. If you have all your code in one cell, or are using a job configuration, migrate your code to a notebook and step through it piece by piece until you’ve found the slowest part.
- **tecedu** (1↑): ignoring your code issues and stuff.

Which region and availability zones do you have your storage account in; is it in the same region as synapse. In region you have about 40Gbps bandwidth by default and 0.2ms worst case latency. Cross region its a shitshow
  - **wtfzambo** (1↑): Same region as Synapse :/
    - **tecedu** (1↑): Can you check other code to benchmark, i think the compute might be bad culprit here especially if other code is slower.
- **ConsiderationOk8231** (1↑): Would there be differences writing down as csv format vs parquet format? I suspect some weird partitioning behaviour distributing the work across threads unevenly. Also is notebook running Python or pyspark? Pyspark translates Python to spark also adds some overhead.
  - **wtfzambo** (1↑): I skipped pyspark, I'm using Polars.
    - **ConsiderationOk8231** (2↑): Good luck. Sorry I can’t help you.
