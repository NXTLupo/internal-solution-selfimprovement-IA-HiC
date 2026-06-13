---
id: social-intelligence/reddit-deep/businessintelligence/1ow8wcq.md
url: "https://www.reddit.com/r/BusinessIntelligence/comments/1ow8wcq/our_international_expansion_broke_all_our_power/"
kind: "social-post"
source: "reddit-deep: r/businessintelligence"
subreddit: "businessintelligence"
title: "Our international expansion broke all our Power BI reports"
author: "Tatt00ey"
date: "2025-11-13T18:30:33.000Z"
score: 4
upvote_ratio: 0.61
num_comments: 11
flair: ""
extracted_at: "2026-06-11T18:57:56.379Z"
extraction_method: "praw-deep"
research_goal: "Deliver a strategic market analysis answering \"What is The State of Data & Distribution in Asset Management, in 2026?.\" Focus on how global asset managers leverage FinTech innovation, economic drivers, and advanced data infrastructure to optimize distribution channels, intermediary targeting, and client acquisition."
engagement: "deliver-a-strategic-market-analysis-answering-what-is-the-st"
chunks:
  - id: "social-intelligence/reddit-deep/businessintelligence/1ow8wcq.md#c0"
    char_span: [0, 1607]
    sentence_count: 12
    key_terms: [businessintelligence, reports, entity, international, consolidated, transactions, local, power]
    token_count: 313
  - id: "social-intelligence/reddit-deep/businessintelligence/1ow8wcq.md#c1"
    char_span: [1622, 3728]
    sentence_count: 14
    key_terms: [currency, financial, local, consolidation, ytd, month, sales, quarter-end]
    section: Comments
    token_count: 442
  - id: "social-intelligence/reddit-deep/businessintelligence/1ow8wcq.md#c2"
    char_span: [3730, 5820]
    sentence_count: 16
    key_terms: [local, data, end, erp, look, need, sng, currency]
    section: Comments
    token_count: 506
  - id: "social-intelligence/reddit-deep/businessintelligence/1ow8wcq.md#c3"
    char_span: [5822, 7437]
    sentence_count: 7
    key_terms: [currency, column, currencies, table, like, usd, something, inserted]
    section: Comments
    token_count: 364
---
# Our international expansion broke all our Power BI reports

Source: [reddit-deep: r/businessintelligence](https://www.reddit.com/r/BusinessIntelligence/comments/1ow8wcq/our_international_expansion_broke_all_our_power/)
Posted by **Tatt00ey** · **4↑** · **11 comments**

We launched entities in Singapore and UK last quarter, and now our executive dashboards are showing completely wrong numbers. Currency conversions are messed up, intercompany transactions are double-counted, and our revenue recognition is a disaster.

The legal side was smooth - we used [InCorp ](https://www.incorp.com/)to handle the company registrations. But nobody warned us about the BI nightmare that would follow.

Right now we're dealing with:

Singapore reports showing USD amounts as SGD

UK entity transactions appearing in both local and consolidated views

Different quarter-end dates breaking all our YTD calculations

Compliance reports that don't match local filing requirements

How have other BI teams handled this transition? Specifically:

What's the best way to handle multiple currencies in Power BI without killing performance?

How do you manage security when executives need consolidated views but local teams only see their entity?

Any tools or connectors that simplify multi-entity reporting?

How much of this should be handled in the data warehouse vs Power BI?

We're considering rebuilding everything from scratch, but worried we'll just create new problems.

For those with international clients - what entity structure worked best for you? How much time and money do you spend annually on compliance?

## Comments

- **balrog687** (11↑): There are specific tools to do financial consolidation.

 SAP BPC and Oracle FCC are good examples.

Intercompany transaction elimination and currency conversion are the base components of any financial consolidation process.

Another alternative is to report entities completely separated from each other.

But if you want a single financial statement on a top entity, you must do financial consolidation first.
- **Mdayofearth** (7↑): I'm going to be blunt.

Some of these are CFO, CEO and board level decisions, and sits in the realm of financial governance which is dictated to you as someone working in BI; i.e., you have no opinion.

This is not something you fix in a BI stack.

> Different quarter-end dates breaking all our YTD calculations

One decision companies make is to have one quarter-end date for all locations, and restate various figures based on local regulations.

Another is to leave the dates alone, and really f over your local counterparts by doubling their workload (i.e., they have to close a quarter locally, then close it for HQ on a different date).

Again, this is not something you fix in a BI stack.

That said, for home office reporting

I would replicate your existing data structure in local currency to the location the data came from, for each location. Then at the report level, convert each figure into home-country currency using exchange rates provided by finance\accounting, while adding in a currency gain\loss for figures that need it. For example, if you need to show YTD sales, broken out by month, you would need to sum each month in local currency, and the YTD sales in local currency; then convert each month and that calculated YTD sales in local currency into home-office currency, adding in a currency gain\loss equal to YTD minus the sum of each month's converted figure. Why? If you're using the same FX rate for each month, you're doing it wrong, your sales are so low that monthly variances disappear, or it's pegged 100% to your home office (which doesn't happen between the UK and Singapore, and what I am assuming is USD).

Whether you do this in the BI stack is up to you, but this should be programmed into the ERP end of things, not the reporting end.
  - **Middle_Currency_110** (1↑): I have done all this before, but I used a more powerful BI tool.
- **Ok-Sail-7574** (7↑): Don't use Power BI for these things. You could look at what your ERP vendor has to offer for this if or if you have heterogeneous financial systems you could look at IBM controller as a mature solution. But there is lot's of stuff for this. Check out Gartner. PBI is definitely "unsafe at any speed" for this type of work.
- **Boulavogue** (3↑): One size fits none. And your local entities need local reports that they look at, no point in having an exec rollup if no one is looking at the local figures being rolled up.


Build for the locals, signoff. In one local base currency. Let the local ERP sort the conversion to SNG, but don't try and manage INR because of one sale. 


Then convert the SNG to USD in your DW/DL or model using the sqlbi currency blogs. At some point you'll need to take away FX headwinds so you'll need a calculation group or an equivalent approach to differentiate SNG:USD daily/monthly rate vs yearly rate.


Time zones can be a gotcha also, refreshing at different times/days due local times and holidays. A working days calc or custom protation can be needed
- **astrutz** (3↑): This is a strange problem to have. I didn’t realize companies with an international presence didn’t use a consolidation system before presenting data in BI tools. Seems like you’re missing a key system in your steps here.
- **parkerauk** (2↑): This is an odd statement (almost a pun). If each region submitted results in group gaap and flagged intercompany eliminations there really should not be a problem.
- **edimaudo** (1↑): hmm I am confused, was there no review of the data and prototyping before it went live?
- **turbo_dude** (1↑): Sam Altman will have all the answers here I’m sure 

But seriously, do you have master data for all your FX rates and have you agreed on which you’re using (date, end of month/quarter)

Ditto your dates table/dimension
- **No_Wish5780** (1↑): consider using Power Query for currency conversion logic; keeps it dynamic.

check your inbox.
- **sjcuthbertson** (1↑): How much should be handled in the data warehouse? The answer is given by [Roche's Maxim](https://ssbipolar.com/2021/05/31/roches-maxim/). That should _probably_ lead you to a conclusion that much of this should be handled even further upstream than the DW, but YMMV. 

In practical terms, I've always found currency problems are avoided in DW & BI contexts by always naming fact table currency columns like Amount_GBP or ExtendedPrice_SGD or OrderValue_USD or whatever. 

I.e. as soon as you start defining table structures that aren't given to you by the source application vendor, never ever design a column that will contain more than one currency. Then it's impossible to do any aggregates that combine currencies *unintentionally*, and much easier to remember to label and format visuals and report outputs with the right currency symbol/code. 

You can still have reports that work for different currencies flexibly, using DAX: something like SWITCH( SELECTEDVALUE(SomeCurrencyColumn), 'USD', [Total Value USD], 'SGD', .... )

By suffixing the currency on the column name, it's also easier to spot mistakes in data processing where some intermediate USD column values are inserted into an SGD final fact table, or a source column without a currency suffix (maybe holding 2+ currencies) is inserted into a GBP column without something like a "where CurrCode = 'GBP'" in the same query (or a case statement etc doing the same thing).
