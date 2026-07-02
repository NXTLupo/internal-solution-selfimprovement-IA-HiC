---
id: social-intelligence/reddit-deep/dataengineering/1p6l4mf.md
url: "https://www.reddit.com/r/dataengineering/comments/1p6l4mf/wanted_to_share_a_simple_data_pipeline_that/"
kind: "social-post"
source: "reddit-deep: r/dataengineering"
subreddit: "dataengineering"
title: "Wanted to share a simple data pipeline that powers my TUI tool"
author: "digitalghost-dev"
date: "2025-11-25T19:00:24.000Z"
score: 5
upvote_ratio: 0.86
num_comments: 0
flair: "Personal Project Showcase"
extracted_at: "2026-06-29T14:40:47.210Z"
extraction_method: "praw-deep"
research_goal: "Define the 2026 \"state of the Art\" operational and technological benchmarks for \"The State of Data & Distribution in Asset Management\". Synthesize key developments across data infrastructure, distribution enablement, and AI governance frameworks to identify leading industry capabilities and compliance standards."
engagement: "define-the-2026-state-of-the-art-operational-and-technologic"
chunks:
  - id: "social-intelligence/reddit-deep/dataengineering/1p6l4mf.md#c0"
    char_span: [0, 1763]
    sentence_count: 11
    key_terms: [data, digitalghost-dev, https, pipeline, poke-cli, com, supabase, db793403fd7c4655bc69934c385b9d7f09bc55de]
    concepts: [digitalghost-dev, https, pipeline, poke-cli, dataengineering]
    token_count: 468
    sources: [{"n":"reddit-deep: r/dataengineering","u":"https://www.reddit.com/r/dataengineering/comments/1p6l4mf/wanted_to_share_a_simple_data_pipeline_that/"}]
---
# Wanted to share a simple data pipeline that powers my TUI tool

Source: [reddit-deep: r/dataengineering](https://www.reddit.com/r/dataengineering/comments/1p6l4mf/wanted_to_share_a_simple_data_pipeline_that/)
Posted by **digitalghost-dev** · **5↑** · **0 comments**

[Diagram of data pipeline architecture](https://preview.redd.it/ke9d2cvw9g3g1.png?width=4279&format=png&auto=webp&s=db793403fd7c4655bc69934c385b9d7f09bc55de)

# Steps:

1. TCGPlayer pricing data and TCGDex card data are called and processed through a data pipeline orchestrated by Dagster and hosted on AWS.
2. When the pipeline starts, Pydantic validates the incoming API data against a pre-defined schema, ensuring the data types match the expected structure.
3. Polars is used to create DataFrames.
4. The data is loaded into a Supabase staging schema.
5. Soda data quality checks are performed.
6. `dbt` runs and builds the final tables in a Supabase production schema.
7. Users are then able to query the [`pokeapi.co`](http://pokeapi.co) or `supabase` APIs for either video game or trading card data, respectively.
8. It runs at 2PM PST daily.

This is what the TUI looks like:

https://i.redd.it/mdfmtxmy9g3g1.gif

Repository: [https://github.com/digitalghost-dev/poke-cli](https://github.com/digitalghost-dev/poke-cli)

You can try it with Docker (**the terminal must support Sixel, I am planning on using the Kitty Graphics Protocol as well**).

I have a small section of [tested terminals](https://github.com/digitalghost-dev/poke-cli?tab=readme-ov-file#tested-terminals) in the `README`.

    docker run --rm -it digitalghostdev/poke-cli:v1.8.0 card

Right now, only Scarlet & Violet and Mega Evolution eras are available but I am adding more eras soon.

Thanks for checking it out!
