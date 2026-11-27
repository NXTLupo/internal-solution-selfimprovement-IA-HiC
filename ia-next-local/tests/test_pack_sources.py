"""Every kind of pack source reached by the path that works for it (26 Nov): RSS, APIs and data portals through HiC's
multi-search; site searches through IA Next's own engine; landing pages crawled for their feed or article links;
Reddit feeds through Reddit's API; dead connectors not asked. Nothing here reaches the web or HiC."""
from ia_next import config, packindex, packsources, store

REG = {"rss_a": {"kind": "rss", "url": "https://news.example/feed"},
       "site_a": {"kind": "web_search", "domain": "retailwire.example", "name": "Retail Wire"},
       "page_a": {"kind": "static_url", "url": "https://brand.example/newsroom/", "name": "Brand Newsroom"},
       "page_b": {"kind": "static_url", "url": "https://maker.example/insights/", "name": "Maker Insights"},
       "reddit_a": {"kind": "reddit_feed", "url": "https://www.reddit.com/r/retail/.rss"},
       "inv_a": {"kind": "invidious"}}

FEED = b"""<?xml version="1.0"?><rss><channel><title>Brand news</title>
<item><title>Brand launches AI shopping assistant for stores</title><link>https://brand.example/news/2026/11/ai-assistant</link>
<pubDate>Tue, 18 Nov 2026 10:00:00 GMT</pubDate><description>The assistant answers stock questions.</description></item>
<item><title>Quarterly results</title><link>https://brand.example/news/2026/11/results</link><pubDate>Tue, 18 Nov 2026 10:00:00 GMT</pubDate>
<description>Revenue grew.</description></item>
<item><title>Old AI pilot</title><link>https://brand.example/news/2024/01/pilot</link><pubDate>Mon, 08 Jan 2024 10:00:00 GMT</pubDate>
<description>An AI shopping assistant pilot.</description></item></channel></rss>"""
LANDING_WITH_FEED = b'<html><head><link rel="alternate" type="application/rss+xml" href="/newsroom/feed.xml"></head><body>News</body></html>'
LANDING_LINKS = b"""<html><body><a href="/">Home</a><a href="/insights/">Insights</a>
<a href="/insights/2026/11/how-stores-use-ai-shopping-assistants">How stores use AI shopping assistants this holiday season</a>
<a href="/insights/2026/10/warehouse-robots">Warehouse robots move into regional distribution centers</a>
<a href="https://other.example/story/ai">An AI shopping story on another site entirely here</a></body></html>"""
WINDOW = {"since": "2026-11-01", "until": "2026-11-30", "days": 30}


class R:
    def __init__(self, status=200):
        self.status_code, self.encoding = status, "utf-8"


def _web(pages):
    return lambda url: (R(), pages[url]) if url in pages else (R(404), b"")


def test_each_kind_of_source_has_its_path(monkeypatch):
    monkeypatch.setattr(packsources, "_CACHE", {"reg": REG})
    assert [packsources.route(s) for s in ("rss_a", "site_a", "page_a", "reddit_a", "inv_a", "unknown")] == \
        ["multi", "site", "crawl", "reddit", "skip", "multi"]
    assert packsources.multi_only(list(REG) + ["unknown"]) == ["rss_a", "unknown"]


def test_a_landing_page_feed_is_read_inside_the_period_and_on_the_subject(monkeypatch):
    monkeypatch.setattr(packsources, "_CACHE", {"reg": REG})
    state = {}
    get = _web({"https://brand.example/newsroom/": LANDING_WITH_FEED, "https://brand.example/newsroom/feed.xml": FEED})
    items = packsources.crawl_items([("page_a", "retail")], ["AI shopping assistant"], WINDOW, get=get, state=state)
    assert [i["url"] for i in items] == ["https://brand.example/news/2026/11/ai-assistant"]      # results and the 2024 pilot left out
    assert items[0]["date"] == "2026-11-18" and items[0]["pack"] == "retail" and items[0]["publisher"] == "Brand Newsroom"
    assert state == {"page_a": "https://brand.example/newsroom/feed.xml"}                         # remembered for the next run
    again = packsources.crawl_items([("page_a", "retail")], ["AI shopping assistant"], WINDOW,
                                    get=_web({"https://brand.example/newsroom/feed.xml": FEED}), state=state)
    assert len(again) == 1                                                                       # the feed is read without the landing page


def test_a_landing_page_without_a_feed_gives_its_article_links(monkeypatch):
    monkeypatch.setattr(packsources, "_CACHE", {"reg": REG})
    items = packsources.crawl_items([("page_b", "retail")], ["AI shopping assistants"], WINDOW,
                                    get=_web({"https://maker.example/insights/": LANDING_LINKS}), state={})
    urls = [i["url"] for i in items]
    assert urls[0] == "https://maker.example/insights/2026/11/how-stores-use-ai-shopping-assistants"
    assert not any("other.example" in u for u in urls) and not any(u.endswith("/insights/") for u in urls)
    assert all(i["date"] >= "2026-11-01" for i in items)                                         # October's link is outside the period


def test_a_site_search_source_is_searched_with_our_engine(monkeypatch):
    monkeypatch.setattr(packsources, "_CACHE", {"reg": REG})
    asked = []

    def search(q, limit=10, time_range=""):
        asked.append((q, time_range))
        return [{"url": "https://www.retailwire.example/ai-assistants-in-stores/", "title": "AI assistants in stores", "snippet": "Retailers say",
                 "date": "2026-11-12"},
                {"url": "https://elsewhere.example/x", "title": "Not this site", "snippet": "", "date": "2026-11-12"}]
    items = packsources.site_items([("site_a", "retail")], ["AI shopping assistants"], WINDOW, search=search)
    assert asked == [("site:retailwire.example AI shopping assistants", "month")]
    assert [i["url"] for i in items] == ["https://www.retailwire.example/ai-assistants-in-stores/"]
    assert items[0]["publisher"] == "Retail Wire" and items[0]["pack"] == "retail"


def test_what_is_found_joins_the_local_pack_index(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    monkeypatch.setattr(packindex, "_READY", None)
    monkeypatch.setattr(packsources, "_CACHE", {"reg": REG})
    call = lambda method, path, timeout, **kw: {"sourceIds": list(REG)}
    get = _web({"https://brand.example/newsroom/": LANDING_WITH_FEED, "https://brand.example/newsroom/feed.xml": FEED,
                "https://maker.example/insights/": LANDING_LINKS})
    search = lambda q, limit=10, time_range="": [{"url": "https://retailwire.example/ai-shopping", "title": "AI shopping assistants grow",
                                                  "snippet": "x", "date": "2026-11-15"}]
    report = packsources.read_other_kinds(["retail"], call, ["AI shopping assistants"], WINDOW, budget_seconds=20, search=search, get=get)
    assert report["by_route"] == {"multi": 1, "site": 1, "crawl": 2, "reddit": 1, "skip": 1}
    assert report["site"]["items"] == 1 and report["crawl"]["items"] >= 2 and report["kept"] >= 3
    hits = packindex.search(["retail"], "shopping assistants")
    assert {h["url"] for h in hits} >= {"https://brand.example/news/2026/11/ai-assistant", "https://retailwire.example/ai-shopping"}


CHANNEL_FEED = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<entry><title>How our alumni office uses AI to plan reunions</title><link rel="alternate" href="https://www.youtube.com/watch?v=aaaaaaaaaaa"/>
<published>2026-11-14T15:00:00+00:00</published></entry>
<entry><title>Homecoming highlights</title><link rel="alternate" href="https://www.youtube.com/watch?v=bbbbbbbbbbb"/>
<published>2026-11-10T15:00:00+00:00</published></entry></feed>"""


def test_a_packs_youtube_channels_give_their_videos_on_the_subject(monkeypatch):
    reg = dict(REG, yt_channel_UC1={"kind": "youtube_channel", "packs": ["higher_ed"], "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC1",
                                    "name": "YouTube: Cornell (Alumni engagement)"})
    monkeypatch.setattr(packsources, "_CACHE", {"reg": reg})
    items = packsources.channel_items([("yt_channel_UC1", "higher_ed")], ["alumni AI"], WINDOW,
                                      get=_web({"https://www.youtube.com/feeds/videos.xml?channel_id=UC1": CHANNEL_FEED}))
    assert [i["url"] for i in items] == ["https://www.youtube.com/watch?v=aaaaaaaaaaa"]
    assert items[0]["date"] == "2026-11-14" and items[0]["pack"] == "higher_ed" and items[0]["publisher"].startswith("YouTube: Cornell")
    from ia_next import youtube
    youtube._COOL["blocked_until"] = 9e18
    try:
        assert packsources.channel_items([("yt_channel_UC1", "higher_ed")], ["alumni AI"], WINDOW,
                                         get=lambda u: (_ for _ in ()).throw(AssertionError("YouTube is not asked while refusing"))) == []
    finally:
        youtube._COOL["blocked_until"] = 0


def test_the_shipped_registry_names_every_kind_of_pack_source():
    import json
    with open(packsources.REGISTRY, encoding="utf-8") as fh:
        reg = json.load(fh)["sources"]
    kinds = {}
    for s in reg.values():
        kinds[s["kind"]] = kinds.get(s["kind"], 0) + 1
    assert len(reg) >= 3000 and {"rss", "static_url", "web_search", "reddit_feed", "youtube_channel", "rest"} <= set(kinds)
    assert sum(1 for s in reg.values() if s["kind"] == "web_search" and (s["domain"] or s["url"])) >= 200
    assert sum(1 for s in reg.values() if s["kind"] == "static_url" and s["url"]) >= 1500

