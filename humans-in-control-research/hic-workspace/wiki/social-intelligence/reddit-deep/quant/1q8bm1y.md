---
id: social-intelligence/reddit-deep/quant/1q8bm1y.md
url: "https://www.reddit.com/r/quant/comments/1q8bm1y/should_i_share_l3_crypto_data/"
kind: "social-post"
source: "reddit-deep: r/quant"
subreddit: "quant"
title: "Should I share L3 crypto data?"
author: "derroitionman"
date: "2026-01-09T15:42:30.000Z"
score: 50
upvote_ratio: 0.92
num_comments: 16
flair: "Data"
extracted_at: "2026-06-29T14:40:47.209Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/quant/1q8bm1y.md#c0"
    char_span: [0, 830]
    sentence_count: 5
    key_terms: [dydx, https, data, perpetualmarkets, crypto, comments, indexer, orders]
    concepts: [perpetualmarkets, https, crypto, comments, indexer]
    token_count: 216
    sources: [{"n":"reddit-deep: r/quant","u":"https://www.reddit.com/r/quant/comments/1q8bm1y/should_i_share_l3_crypto_data/"}]
  - id: "social-intelligence/reddit-deep/quant/1q8bm1y.md#c1"
    char_span: [832, 2256]
    sentence_count: 1
    key_terms: [subaccountid, clobpairid, clientid, quantums, orderid, goodtilblock, blockheight, timeinforce]
    concepts: [subaccountid, clobpairid, clientid, quantums, goodtilblock]
    related_chunks: ["social-intelligence/reddit-deep/quant/1q8bm1y.md#c2"]
    token_count: 512
  - id: "social-intelligence/reddit-deep/quant/1q8bm1y.md#c2"
    char_span: [2066, 3295]
    sentence_count: 1
    key_terms: [goodtilblock, subaccountid, blockheight, clobpairid, clientid, quantums, subticks, orderid]
    concepts: [goodtilblock, subaccountid, blockheight, clobpairid, clientid]
    related_chunks: ["social-intelligence/reddit-deep/quant/1q8bm1y.md#c1"]
    token_count: 447
  - id: "social-intelligence/reddit-deep/quant/1q8bm1y.md#c3"
    char_span: [3302, 4175]
    sentence_count: 10
    key_terms: [data, dataset, publishing, maybe, worth, synchronized, dataloaders, forecasting]
    concepts: [dataset, publishing, maybe, worth]
    token_count: 193
  - id: "social-intelligence/reddit-deep/quant/1q8bm1y.md#c4"
    char_span: [4189, 5758]
    sentence_count: 7
    key_terms: [how-i-optimized-my-dydx-v4-non-validating-node-to-save-my-nvme-5f192bd3f347, ramdisk, https, com, dydx, blockchain, publicnode, snapshots]
    concepts: [how-i-optimized-my-dydx-v4-non-validating-node-to-save-my-nvme-5f192bd3f347, ramdisk, https, blockchain, publicnode]
    related_chunks: ["social-intelligence/reddit-deep/quant/1q8bm1y.md#c5"]
    section: Comments
    token_count: 437
  - id: "social-intelligence/reddit-deep/quant/1q8bm1y.md#c5"
    char_span: [5760, 7725]
    sentence_count: 11
    key_terms: [data, what-is-tbw-and-how-it-affects-your-m-2-nvme-ssd-purchase, derroitionman, hyperliquid, researchers, blockchain, ramdisk, without]
    concepts: [derroitionman, hyperliquid, researchers, blockchain, ramdisk]
    related_chunks: ["social-intelligence/reddit-deep/quant/1q8bm1y.md#c4"]
    section: Comments
    token_count: 494
---
# Should I share L3 crypto data?

Source: [reddit-deep: r/quant](https://www.reddit.com/r/quant/comments/1q8bm1y/should_i_share_l3_crypto_data/)
Posted by **derroitionman** · **50↑** · **16 comments**

Hi all,

  
As part of my research, I am capturing L3 raw data from a dYdX node. [dYdX](https://www.dydx.xyz/) is a decentralized, non-custodial crypto trading platform (DEX) focused on perpetual futures and derivatives of crypto markets. Here's the complete list of products: [https://indexer.dydx.trade/v4/perpetualMarkets](https://indexer.dydx.trade/v4/perpetualMarkets)

  
I run a dYdX full node and capture real-time L3 including individual orders, updates, and cancellations, directly from the protocol. The most interesting thing is that the data includes the owner's address in all orders.

  
The data looks like this:

    {"orderId": {"subaccountId": {"owner": "dydxADDRESS_A"}, "clientId": 39505163, "clobPairId": 0}, "side": "SIDE_BUY", "quantums": "339000000", "subticks": "8757200000", "goodTilBlock": 69763571, "timeInForce": "TIME_IN_FORCE_POST_ONLY", "blockHeight": 69763554, "time": 1767222000.798007, "tick_ask": 8758300000, "tick_bid": 8757100000, "type": "matchMaker", "filled_amount": "339000000"}
    {"orderId": {"subaccountId": {"owner": "dydxADDRESS_B"}, "clientId": 1315387955, "clobPairId": 0}, "side": "SIDE_SELL", "quantums": "1311000000", "subticks": "8757200000", "goodTilBlock": 69763556, "timeInForce": "TIME_IN_FORCE_IOC", "clientMetadata": 1315387955, "blockHeight": 69763554, "time": 1767222000.798007, "tick_ask": 8758300000, "tick_bid": 8757100000, "type": "matchTaker", "filled_amount": "153000000"}
    {"orderId": {"subaccountId": {"owner": "dydxADDRESS_B"}, "clientId": 1307264263, "clobPairId": 0}, "side": "SIDE_BUY", "quantums": "216000000", "subticks": 8757100000, "goodTilBlock": 69763563, "timeInForce": "TIME_IN_FORCE_POST_ONLY", "clientMetadata": 1307264263, "type": "orderRemove", "blockHeight": 69763554, "time": 1767222000.79902, "tick_ask": 8758300000, "tick_bid": 8757100000, "filled_quantums": 0, "removalStatus": "ORDER_REMOVAL_STATUS_BEST_EFFORT_CANCELED"}
    {"orderId": {"subaccountId": {"owner": "dydxADDRESS_C"}, "clientId": 2654452608, "clobPairId": 1}, "side": "SIDE_BUY", "quantums": "171000000", "subticks": 2972400000, "goodTilBlock": 69763555, "timeInForce": "TIME_IN_FORCE_POST_ONLY", "type": "orderPlace", "blockHeight": 69763554, "time": 1767222000.800953, "tick_ask": 2974100000, "tick_bid": 2974000000, "filled_quantums": 0}
    {"orderId": {"subaccountId": {"owner": "dydxADDRESS_D"}, "clientId": 1055122890, "clobPairId": 1}, "side": "SIDE_BUY", "quantums": "15000000000", "subticks": 2947400000, "goodTilBlock": 69763562, "type": "orderPlace", "blockHeight": 69763554, "time": 1767222000.802037, "tick_ask": 2974100000, "tick_bid": 2974000000, "filled_quantums": 0}
    {"orderId": {"subaccountId": {"owner": "dydxADDRESS_C"}, "clientId": 2654452607, "clobPairId": 1}, "side": "SIDE_SELL", "quantums": "171000000", "subticks": 2975300000, "goodTilBlock": 69763555, "timeInForce": "TIME_IN_FORCE_POST_ONLY", "type": "orderRemove", "blockHeight": 69763554, "time": 1767222000.802037, "tick_ask": 2974100000, "tick_bid": 2974000000, "filled_quantums": 0, "removalStatus": "ORDER_REMOVAL_STATUS_BEST_EFFORT_CANCELED"}
    

So it's pretty verbose. But it makes it possible to understand the strategies behind each address, which is quite cool.

  
Currently, I am only capturing the data for BTC-USD, ETH-USD, SOL-USD, DOGE-USD and the data is fully synchronized betwen products, with millisecond resolution.

Anyway, I managed to get around 3 weeks of continuous data already, which accouunts for \~100GB gzip compressed.

  
Now my question is, do you guys think it would be worth publishing this data? I have looked for similar datasets and I didn't find any and it seems that most people capture their data themselves but do not publish it. 

I was thinking of maybe publishing a full-month dataset in kaggle, a dataset report in arxiv, and dataloaders and maybe a simple forecasting baseline in github.

  
What do you think? Is it worth the effort? How usefull would be this dataset for you?

## Comments

- **[deleted]** (17↑): That's pretty cool. 
Update if you make the dataset public.
- **Quantum270** (10↑): Sure post it and let us know where you did. Would be interesting
- **ApogeeSystems** (5↑): Cool, I don't necessarily see a big disadvantage in sharing so go ahead.
  - **thelittletroll2** (4↑): Noooooo now the public is going to have this super secret data that only we’ve had access to and they’re going to make the markets efficient eliminating our alpha
- **sultanrush04** (2↑): What was the compute cost like for you to be able to do this?
  - **derroitionman** (2↑): I have a AMD Ryzen 7 5700G (8 cores with hyperthreading) with 128 GB of RAM, although the dydx node uses around 20 GB only. CPU load average is around 7.5 \~ 8.

I use a 64 GB ramdisk for the dydx blockchain to not wear off the nvme and then later store the captured data directly on a HDD in standard compressed gzip files. The procedure to create the ramdisk and what to move to the ramdisk is reported here: [https://medium.com/@ml\_enthusiast/how-i-optimized-my-dydx-v4-non-validating-node-to-save-my-nvme-5f192bd3f347](https://medium.com/@ml_enthusiast/how-i-optimized-my-dydx-v4-non-validating-node-to-save-my-nvme-5f192bd3f347)

After 3 weeks I am only using 24 GB of the ramdisk for the dydx blockchain, so I could go for more than two months without having to clear the ramdisk. There's an update for the dYdX node binary every month or two anyway, and I use that time to download a new small chain snapshot from [https://publicnode.com/snapshots](https://publicnode.com/snapshots)

Now that RAM is so expensive, I guess that a 64 GB or even 32 GB server is already good enough if you are willing to have more frequent maintainance downtime to clear the ramdisk. Or even without it. The ramdisk is totally optional, but without it the blockchain just wears the nvme off in a year or year and a half, since it is writing non-stop and the nvme has a maximum number of writes [TBW](https://johnmakphotography.com/what-is-tbw-and-how-it-affects-your-m-2-nvme-ssd-purchase/) (Terabytes Written). Blockchain in HDD doesn't work well and your node will lag behind.
- **magnetichira** (2↑): Why not hyperliquid? Dydx only has a fraction of volume of HL.
  - **derroitionman** (2↑): Its on my list, I just started with dYdX which seems to have less HW requirements, but I will explore it too.
- **Ok-Cat-9189** (2↑): can you do this for hyperliquid please
- **umdred11** (1↑): That would be incredible
- **Commercial_Soup2126** (1↑): Yes!
- **undercoverlife** (-2↑): What would you benefit from publishing it? It’s pretty valuable data that a lot of vendors charge people to use. Keep it for yourself, especially if it can provide you any meaningful edge.
  - **derroitionman** (1↑): Yes, this is what I have been thinking so far and I guess this is what pretty much everyone else thinks. But now I think that sharing the data as benchmark and an arxiv paper could give some citations and on the other hand it could put me in contact with other quants and researchers. This is why I asked here if there was really such an interest for this kind of data.

  
The data is actually just the tip of the iceberg anyway, there are so many things necessary to make a working forecasting model, like filtering, normalization, featurization, reward signals, time windows, etc. The data will only attract researchers and amateurs, and more the merrier anyway.
    - **CarefulEmphasis5464** (1↑): Hey, are you still gathering data?
  - **SandwormWhisperer** (0↑): Stfu
