# Every pack source wired into deep research (26 Nov 2026)

Owner: "make sure that all selected data packs crawl youtube (as part of each data pack) when deep research runs are
called from the chat UI, articles, news, youtube, sub-reddits (use HiC to auto identify the top 25 or 50 sub-reddits for
each industry data pack), RSS feeds, etc. Do not skimp on external data sources. Scour HiC's data packs to ensure you
have everything wired into IA Next Local."

## What the audit of HiC's packs found

HiC holds 17 packs and 3,033 sources. Measured against HiC's own connector log for November and a live check on the
Retail pack ("AI shopping assistants", 14 sources, GET only):

| Kind of source | Count | How HiC answers a question | What IA Next reached before |
|---|---|---|---|
| RSS news feeds | 750 | the feed's latest entries that match the words, expanded to full text | 25 to 43% of a pack's sources inside the 240 s deep budget |
| Reddit feeds | 238 (249 subreddits, 13 packs) | RSS of a subreddit; about 1% returned anything, and Reddit's 429s stalled HiC's proxy | nearly nothing |
| Static pages | 1,735 | the landing page itself: undated, the same text for every question | at most six landing pages per dated run |
| Site searches | 244 | `site:` search through a keyless engine: 0 of 3,616 calls answered in November | nothing |
| REST APIs | 49 | JSON APIs (academic, government, health) | about half answered |
| Government data portals | 13 | dataset titles and notes | yes |
| Invidious (YouTube) | 2 | every instance failed | nothing |
| GDELT | 1 | headlines, 4% of calls | almost nothing |
| YouTube channel feeds | 24 in Creative AI, plus HiC's poller list of 100 higher-ed and advancement channels | RSS of a channel; the poller list was not a pack source | the 24 only, as titles |

HiC picks subreddits only through its "Suggest from goal" button (Gemini Flash in the browser); no pack carried a
subreddit list beyond its feeds.

## What a deep research run now reads, for every selected pack

| Kind | Path now | Where |
|---|---|---|
| RSS, APIs, data portals, GDELT | HiC's multi-search, as before, now with the whole budget (the dead kinds are no longer sent, so they no longer stall a batch) | hic.pack_items, packindex.read_whole |
| Site searches | IA Next's own engine (SearXNG): `site:` query for each of the run's questions, inside the period | packsources.site_items |
| Static pages | the landing page is crawled: its declared RSS or Atom feed is read (remembered for the next run), otherwise its newest same-site article links that carry the question's words; the articles are read in full like any pack item | packsources.crawl_items |
| Reddit | the pack's 25 to 50 subreddits (HiC's Suggest from goal plus the pack's own Reddit feeds, each checked with Reddit; PACK-SUBREDDITS.md) searched through Reddit's API, 25 subreddits to a request, inside the period; the posts most about the goal kept with their top comments; no listening task needed first | packsocial.py |
| YouTube | a search in the pack's industry (and one in the subject at large), inside the period, each video read as its transcript; a YouTube link from any feed, page or search is read as its transcript too; the Higher Ed and Fundraising packs also read HiC's 97 higher-ed and advancement channel feeds | youtube.search_packs, packsources.channel_items, pagetext.read |
| Invidious | not asked (YouTube is searched directly) | packsources.route |

Everything found goes into the local pack index under its pack, so dates, relevance, the per-publisher cap and full-text
reading apply to it as to every pack item, and the run's summary counts it with its pack.

The registry copy (`ia_next/pack_registry.json`, each source's kind, address and site) is refreshed from HiC with
`python scripts/sync_pack_registry.py`; the subreddit lists with the three scripts named in PACK-SUBREDDITS.md.

## Limits, stated plainly

- YouTube: this machine read 55 videos' details eight at a time on 26 Nov and YouTube began refusing its captions
  requests ("IpBlocked"). IA Next now pauses every YouTube request for an hour when YouTube refuses, never works around
  it, and keeps the videos queued; transcripts resume when the refusal lifts.
- Static pages with neither a feed nor article links on the landing page (some brand sites build their pages in
  script) give nothing; the browser reader is not used for this crawl, to keep a deep run inside its budget.
- One fix belongs to HiC and is the owner's call: HiC's `fetch_with_retry` waits with a blocking sleep on a 429, which
  freezes its whole proxy while a slow feed retries.
