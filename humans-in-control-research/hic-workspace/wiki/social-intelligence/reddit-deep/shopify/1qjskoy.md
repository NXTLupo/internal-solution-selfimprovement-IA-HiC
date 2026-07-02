---
id: social-intelligence/reddit-deep/shopify/1qjskoy.md
url: "https://www.reddit.com/r/shopify/comments/1qjskoy/changing_variable_prices/"
kind: "social-post"
source: "reddit-deep: r/shopify"
subreddit: "shopify"
title: "Changing Variable Prices"
author: "RisaLisa95"
date: "2026-01-22T11:54:34.000Z"
score: 4
upvote_ratio: 1
num_comments: 7
flair: "Products"
extracted_at: "2026-06-24T22:14:23.474Z"
extraction_method: "praw-deep"
research_goal: "Identify the top AI adoption trends in the global retail sector for 2026, focusing on high-impact use cases, deployment barriers, and measurable ROI benchmarks."
engagement: "identify-the-top-ai-adoption-trends-in-the-global-retail-sec"
chunks:
  - id: "social-intelligence/reddit-deep/shopify/1qjskoy.md#c0"
    char_span: [0, 1677]
    sentence_count: 9
    key_terms: [position, shopify, imgur, apps, without, https, com, comments]
    concepts: [position, shopify, imgur, without, https]
    token_count: 424
    sources: [{"n":"reddit-deep: r/shopify","u":"https://www.reddit.com/r/shopify/comments/1qjskoy/changing_variable_prices/"}]
  - id: "social-intelligence/reddit-deep/shopify/1qjskoy.md#c1"
    char_span: [1691, 3835]
    sentence_count: 12
    key_terms: [product, products, options, shopify, variants, create, automatically, price]
    concepts: [product, products, options, shopify, variants]
    section: Comments
    token_count: 470
---
# Changing Variable Prices

Source: [reddit-deep: r/shopify](https://www.reddit.com/r/shopify/comments/1qjskoy/changing_variable_prices/)
Posted by **RisaLisa95** · **4↑** · **7 comments**

Hello,

im forced to check Shopify in the 3 Day trial to see if its useful for my Boss, which is highly above my Paygrade, but im a nice Person and am interested in it myself.

I tried to Google for existing Posts, checked the Youtube Videos and the build-in Ai said it couldnt help me, said i should use Apps, tried the Apps, to complicated, not even sure they are what i need.

I cannot add a Photo so its an exmaple per Text i guess:

Lets say you can Order a Print in 20x30cm or 30x40cm. It could come with an extra white Border in 1 cm or 5 cm or 10cm.  
How can i change Price Variables for 1cm to have it simply just +1 € for every single Size Position, without being forced to go into Every.Single.Size.Position myself and add the +1 € to each exsiting price? There are supposed to be multiple sizes to chose from and other additional things for Customer to chose from. That would take one hours to finish 1 product.

This was easy possible to do in the ancient old Joomla without Apps, there is no way Shopify is unable to have it done simply without looking for Apps as well?

Edit: Here is a Screenshot with what i try to convey: [Click me its on imgur](https://imgur.com/a/Mjs0Ixt)

Edit2: This i what i want, i want each Position to **automatically** calculate the Extra Charge and **not** me doing it **by Hand** for every Position, which will be 15-20 Sizes to Choose from - because that would take hours and is chaotic: [Click me im on imgur](https://imgur.com/a/64rxVPp)

## Comments

- **AutoModerator** (1↑): To keep this community relevant to the Shopify community, store reviews and external blog links will be removed. Users soliciting personal contact, sales, or services in any form will result in a permanent ban.

*I am a bot, and this action was performed automatically. Please [contact the moderators of this subreddit](/message/compose/?to=/r/shopify) if you have any questions or concerns.*
- **Downbadge69** (2↑): The kind of pricing automation you are looking for is quite unique and not built into Shopify by default. There may be apps that offer this, but it's quite niche.

My recommendation would be to create all your products and variants and then export it all to a CSV file. Then you can update all the prices in the CSV using Google Sheets or a similar spreadsheet editor and then upload them all in one go: [Using CSV files to import and export products](https://help.shopify.com/en/manual/products/import-export/using-csv).

If a lot of the information/prices between the products is the same, you could also create a draft product as a duplication template. So whenever you create a new product, you start by duplicating this draft product and then you only need to update the relevant fields.

Edit: Just to add, if you are not married to the variant system, you can use a product options app, like this one here:  [SC Product Options](https://apps.shopify.com/product-options). These apps usually have settings to add paid options. So if a customer chooses a certain option value, it automatically adds your target price to the product price. This is usually used when you store inventory for the base product only, and don't actually want separate variants with their own inventory for the options chosen by the customer.
  - **RisaLisa95** (1↑): Ty ill try it out.
- **ShopDocStudios** (1↑): I don’t think I’m understanding, do you have a link to another store as an example of what you want?
- **MaximilianTerm** (1↑): Look up variants I think it could help you solve your problem.
(go to products and scroll down)
also there are options to set different pricing models (price for every gram etc.)
