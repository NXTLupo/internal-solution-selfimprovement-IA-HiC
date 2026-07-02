---
id: social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md
url: "https://www.reddit.com/r/FulfillmentByAmazon/comments/1tliz36/verified_purchase_reviews_disappearing/"
kind: "social-post"
source: "reddit-deep: r/fulfillmentbyamazon"
subreddit: "fulfillmentbyamazon"
title: "Verified purchase reviews disappearing"
author: "NewWaveHuman"
date: "2026-05-23T15:07:13.000Z"
score: 3
upvote_ratio: 0.81
num_comments: 17
flair: "SEARCH RANKING"
extracted_at: "2026-06-18T13:35:39.712Z"
extraction_method: "praw-deep"
research_goal: "Deliver a comprehensive 2026 outlook report on the global retail and e-commerce sector, detailing emerging market trends, structural challenges, and the specific operational and customer-experience impacts of AI integration."
engagement: "deliver-a-comprehensive-2026-outlook-report-on-the-global-re"
chunks:
  - id: "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c0"
    char_span: [0, 1564]
    sentence_count: 11
    key_terms: [reviews, verified, support, review, fulfillmentbyamazon, sku, product, vine]
    concepts: [reviews, verified, fulfillmentbyamazon, support, review]
    related_chunks: ["social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c1", "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c2", "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c3"]
    token_count: 344
    sources: [{"n":"reddit-deep: r/fulfillmentbyamazon","u":"https://www.reddit.com/r/FulfillmentByAmazon/comments/1tliz36/verified_purchase_reviews_disappearing/"}]
  - id: "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c1"
    char_span: [1578, 3970]
    sentence_count: 8
    key_terms: [review, backend, fulfillmentbyamazon, issue, variation, fba, deleted, discord]
    concepts: [review, fulfillmentbyamazon, backend, variation, issue]
    related_chunks: ["social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c0", "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c2"]
    section: Comments
    token_count: 513
  - id: "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c2"
    char_span: [3972, 6424]
    sentence_count: 14
    key_terms: [asin, review, different, variation, fbm, sku, catalog, support]
    concepts: [review, different, variation, catalog, support]
    related_chunks: ["social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c0", "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c1"]
    section: Comments
    token_count: 509
  - id: "social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c3"
    char_span: [6426, 8279]
    sentence_count: 18
    key_terms: [reviews, product, account, amazon, review, health, ratings, units]
    concepts: [reviews, product, account, amazon, review]
    related_chunks: ["social-intelligence/reddit-deep/fulfillmentbyamazon/1tliz36.md#c0"]
    section: Comments
    token_count: 407
---
# Verified purchase reviews disappearing

Source: [reddit-deep: r/fulfillmentbyamazon](https://www.reddit.com/r/FulfillmentByAmazon/comments/1tliz36/verified_purchase_reviews_disappearing/)
Posted by **NewWaveHuman** · **3↑** · **17 comments**

My product listing had 10 verified purchase reviews and 9 Vine reviews, and last month overnight, all verified reviews disappeared, leaving me with 9 Vine reviews, and I believe the listing is unable to gain new reviews. 

Of course, I have opened a couple cases with seller support, account health support, and brand support, and I get the same response of the list of reasons why a review may disappear. I do have a seller support case ongoing that is being escalated and transferred so I will update on that. 

I personally believe that there is a backend issue going on here because the product is a part of a very similar variation (they share the review pool). I initially sold this product as an FBM SKU (a couple of early reviews came to this SKU) then created an FBA SKU. I then deleted the FBM SKU when I permanently switched it to FBA to keep my inventory dashboard clean. 

I'm not too worried about my previous reviews being lost, but I just want to make sure I can gain new reviews. We sold about 80 units of this ASIN since the mass review deletion, and we received a single verified review on it last week, but it was deleted 24 hours after it appeared so we are still at only 9 Vine reviews and zero customer reviews. Something just does not seem right.

Any advice will be greatly appreciated. Thanks!

## Comments

- **AutoModerator** (1↑): #####[Join the r/FulfillmentByAmazon Discord Server!](https://discord.gg/VcRZTsS)

We created a Discord server for our community and would like to invite all of you to join! You'll be able to discuss FBA with users around the world and discuss events in real time!

There are separate channels for many FBA topics which you can opt in and out of, including;  
PPC, Listing Optimization, Logistics, Jobs, Advanced FBA, Top Secret/Insider Info, Off-Topic


*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/FulfillmentByAmazon) if you have any questions or concerns.*
- **vadimsoin** (2↑): yeah the deleted FBM SKU is almost certainly the issue. when you delete a parent or child variation that was part of a review pool, it can mess up the review aggregation on the remaining SKUs. Amazon's backend doesn't always clean that up gracefully.

the fact that a new review appeared and then got deleted within 24 hours tells me the system is actively suppressing reviews on that ASIN, not just a one time glitch. that's different from reviews disappearing due to policy violations, which is what seller support keeps defaulting to.

a few things worth trying, keep pushing on the escalation but specifically ask them to check if the ASIN has a review block flag on the backend. generic support won't catch this, you need someone with actual catalog access. also ask them to look at whether the deleted FBM SKU created an orphaned review association.

if you have brand registry, try reaching out through the brand support channel directly and frame it as a catalog integrity issue, not a review issue. sometimes that gets routed to a different team that can actually look at the backend.

80 units with almost no new reviews is a red flag that something structural is broken. keep that case open and document every interaction. this one probably needs a few more escalations before someone with the right access actually looks at it.
- **ArbitrageAndy_UK** (2↑): This sounds frustrating but your instinct about a backend variation issue is probably right.

I've seen similar problems when listings have had SKU changes or variation family modifications. The review pool can get confused, especially when you've got both FBM and FBA SKUs in the mix with variations.

Few things worth trying:

- Check if your ASIN is still properly linked to the variation family in your catalog. Sometimes deleting SKUs can break the parent-child relationship on Amazon's end even if it looks fine to you.

- Try opening a case specifically asking them to check the "review aggregation" for your ASIN rather than just asking about missing reviews. Different team handles that.

- If you have Brand Registry, the Brand Support route is actually your best bet here - they have more visibility into catalog issues than regular seller support.

The fact it happened overnight suggests a system glitch rather than review removal for policy reasons. Keep pushing that escalation, these do get resolved but it takes persistence.
- **Civil-Eye2691** (1↑): deleting the fbm sku might have confused their system when you had shared review pool - i've seen similar issues where backend gets messed up after sku changes and reviews just stop sticking to the listing
- **ArbitrageAndy_UK** (1↑): This sounds frustrating but your instinct about a backend variation issue is probably right.

I've seen similar problems when listings have had SKU changes or variation family modifications. The review pool can get confused, especially when you've got both FBM and FBA SKUs in the mix with variations.

Few things worth trying:

- Check if your ASIN is still properly linked to the variation family in your catalog. Sometimes deleting SKUs can break the parent-child relationship on Amazon's end even if it looks fine to you.

- Try opening a case specifically asking them to check the "review aggregation" for your ASIN rather than just asking about missing reviews. Different team handles that.

- If you have Brand Registry, the Brand Support route is actually your best bet here - they have more visibility into catalog issues than regular seller support.

The fact it happened overnight suggests a system glitch rather than review removal for policy reasons. Keep pushing that escalation, these do get resolved but it takes persistence.
- **Sohail_Qurban** (1↑): I have 3 questions to break this problem down  
\-  FBM SKU you deleted belonged to the same ASIN or different ASIN. (there is difference between an offer to same ASIN and a different product )   
\- What is the price of your product?   
 \- Did you ask friends and family for ratings?
  - **NewWaveHuman** (1↑): 1. The FBM SKU that was deleted belonged to the same ASIN. It was the same exact product but FBM.

2. Price of product currently is $15.99

3. I did not ask friends and family but i do have a social media following that most likely purchased and left reviews. Some of my instagram posts link to my product on Amazon directly.
    - **Sohail_Qurban** (1↑): Rule out direct link to SKU deletion because reviews/ratings are shared on ASIN level. 

Pricing range has effect on units vs ratings ratio. At this price range, your review to units sold ratio is high, I would suggest talking directly to Amazon account health rep about this situation. Amazon usually do tolerate review velocity during launch phase of a product. 

Check account performance notifications in the account health section as well. Amazon usually sends an email before flagging review manipulation.
    - **Sohail_Qurban** (1↑): Couple more things I would like to add. When you are on call with account health rep, do mention that they check the status of your product on backend if it is able to receive ratings/reviews. 

Increase sales velocity using PPC or creator connections. Once you are ranking organically and units are consistently sold, everything will get back to normal.
- **Educational_Cloud358** (1↑): 10 reviews out of 80 product sold is most likely being flagged.  The average review rate is 1-2%
  - **NewWaveHuman** (2↑): Only one review in 80 orders since the mass deletion. The rest of reviews that came previous to that were from around 200 orders. I assume some of those came from social media following though.
- **SellOnAmazon** (1↑): Hey! Glad to hear Account Health confirmed no flags on your listing. Since reviews are able to come in, keep monitoring over the next few weeks as things normalise. Our [Customer Product Reviews](https://sellercentral.amazon.com/help/hub/reference/G201972140) help page may also provide some useful context in the meantime.
