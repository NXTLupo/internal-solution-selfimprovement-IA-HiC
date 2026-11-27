"""Every kind of source a HiC data pack holds, reached by the path that works for it (owner, 26 Nov 2026: "Do not skimp
on external data sources. Scour HiC's data packs to ensure you have everything wired into IA Next Local").

An audit of HiC's 17 packs (3,033 sources) and of IA Next's pack reading found:
- RSS feeds, REST APIs and government data portals answer through HiC's multi-search: they stay on that path;
- "web_search" sources (244) are a site HiC searches with a keyless engine that returned nothing in November: here each
  is searched with IA Next's own engine as a `site:` query for the run's questions, inside the period;
- "static_url" sources (1,735, the largest group) come back from HiC as their landing page, undated and the same for
  every question, so the articles behind them were never read: here the landing page is crawled. Its declared RSS or
  Atom feed is read when it has one (remembered per source), otherwise its newest same-site article links that carry the
  question's words; the articles are then read by the research run like any pack item;
- Reddit feeds (238) answered about 1% of the time: their subreddits are searched through Reddit's API with the pack's
  other subreddits (packsocial.py), so they are not sent to HiC;
- Invidious (YouTube) connectors were dead: YouTube is searched per pack by youtube.py.

Everything found is kept in the local pack index (packindex.py) under its pack, so the run's search, dates, relevance
and reading treat it as any other pack item. pack_registry.json (each source's type, address and site) is a read-only
copy of HiC's registry, refreshed by scripts/sync_pack_registry.py.
"""
import json
import os
import re
import threading
import time
from urllib.parse import urljoin, urlparse

REGISTRY = os.path.join(os.path.dirname(__file__), "pack_registry.json")
_CACHE = {}
_LOCK = threading.Lock()
PER_FEED, PER_PAGE = 10, 5          # items kept from one source's feed, or from its landing page's links
_ALT = re.compile(r"""<link\b[^>]*\btype=["']application/(?:rss|atom)\+xml["'][^>]*>""", re.I)
_HREF = re.compile(r"""\bhref=["']([^"']+)["']""", re.I)
_A = re.compile(r"""(?is)<a\b[^>]*\bhref\s*=\s*["']([^"'#][^"']*)["'][^>]*>(.*?)</a>""")
_DATE_IN_PATH = re.compile(r"/(20\d\d)[/-](\d{1,2})(?:[/-](\d{1,2}))?/")


def registry():
    if "reg" not in _CACHE:
        try:
            with open(REGISTRY, encoding="utf-8") as fh:
                _CACHE["reg"] = (json.load(fh) or {}).get("sources") or {}
        except (OSError, ValueError):
            _CACHE["reg"] = {}
    return _CACHE["reg"]


def route(sid):
    """How a source is reached: "multi" (HiC's multi-search), "site" (a site: search here), "crawl" (its landing page
    crawled here), "reddit" (its subreddit searched through Reddit's API), or "skip" (a dead connector)."""
    s = registry().get(sid)
    if not s:
        return "multi"
    k = s.get("kind") or s.get("type") or ""
    if k == "web_search":
        return "site" if s.get("domain") or s.get("url") else "skip"
    if k == "static_url":
        return "crawl" if s.get("url") else "multi"
    if k == "reddit_feed":
        return "reddit"
    if k == "invidious":
        return "skip"
    if k == "youtube_channel":
        return "channel"
    return "multi"


def multi_only(ids):
    """The sources HiC's multi-search answers; the rest are reached here."""
    return [s for s in ids if route(s) == "multi"]


def counts(ids):
    out = {}
    for s in ids:
        r = route(s)
        out[r] = out.get(r, 0) + 1
    return out


def _words(q):
    return [w.lower() for w in re.findall(r"[A-Za-z][A-Za-z0-9]{2,}", str(q or "")) if w.lower() not in
            ("the", "and", "for", "with", "from", "that", "this", "how", "what", "are", "news")]


def _time_range(window):
    days = (window or {}).get("days")
    if not (window or {}).get("since") or not days:
        return ""
    return "day" if days <= 1 else "week" if days <= 7 else "month" if days <= 31 else "year" if days <= 366 else ""


def _inside(day, window):
    if not day or not (window or {}).get("since"):
        return True
    return window["since"] <= day <= (window.get("until") or "9999-12-31")


# ---- web_search sources: a site: search with IA Next's own engine ----------------------------------------------------
def site_items(pairs, queries, window=None, search=None, budget_seconds=90, workers=4):
    """[(source id, pack)] of web_search sources -> pack items found by `site:` searches for each question."""
    from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as _Late
    if search is None:
        from . import localsearch
        search = localsearch.search
    reg = registry()
    jobs = []
    for sid, pid in pairs:
        s = reg.get(sid) or {}
        where = (s.get("domain") or urlparse(s.get("url") or "").netloc or "").strip().rstrip("/")
        if not where:
            continue
        host, _, path = where.partition("/")
        extra = " ".join(re.findall(r"[A-Za-z0-9]{3,}", path))[:60]
        for q in list(dict.fromkeys(queries))[:2]:
            jobs.append((sid, pid, host.lower().removeprefix("www."), f"site:{host} {extra} {q}".replace("  ", " ").strip(), s.get("name") or sid))
    items, t0 = [], time.time()
    rng = _time_range(window)

    def one(job):
        sid, pid, host, q, name = job
        try:
            return job, search(q, limit=8, time_range=rng)
        except Exception:
            return job, []
    pool = ThreadPoolExecutor(max_workers=workers)
    futs = [pool.submit(one, j) for j in jobs]
    try:
        for f in as_completed(futs, timeout=max(5, budget_seconds - (time.time() - t0))):
            (sid, pid, host, q, name), got = f.result()
            for r in got or []:
                u = str(r.get("url") or "")
                h = (urlparse(u).hostname or "").lower().removeprefix("www.")
                if not u.startswith("https://") or not (h == host or h.endswith("." + host)):
                    continue
                if not _inside(str(r.get("date") or "")[:10], window):
                    continue
                items.append({"title": str(r.get("title") or "").strip(), "url": u, "date": str(r.get("date") or "")[:10],
                              "content": str(r.get("snippet") or ""), "publisher": name, "pack": pid, "tier": 2, "via": "site search"})
    except _Late:
        pass
    for f in futs:
        f.cancel()
    pool.shutdown(wait=False)
    return items


# ---- static_url sources: the landing page's feed, else its newest article links --------------------------------------
def feed_items(xml, base=""):
    """[{title, url, date, content}] from an RSS or Atom document (lxml, forgiving of broken markup)."""
    from lxml import etree
    from . import currency
    try:
        root = etree.fromstring(xml if isinstance(xml, bytes) else str(xml).encode("utf-8"), etree.XMLParser(recover=True, huge_tree=True))
    except Exception:
        return []
    if root is None:
        return []
    out = []
    local = lambda el: el.tag.split("}")[-1].lower() if isinstance(el.tag, str) else ""
    for it in root.iter():
        if local(it) not in ("item", "entry"):
            continue
        f = {}
        for ch in it:
            name = local(ch)
            if name == "link":
                href = ch.get("href") or (ch.text or "").strip()
                if href and (ch.get("rel") in (None, "alternate")):
                    f.setdefault("url", urljoin(base, href.strip()))
            elif name in ("title", "pubdate", "published", "updated", "date", "description", "summary", "content", "encoded"):
                f.setdefault(name, " ".join("".join(ch.itertext()).split()))
        url = f.get("url") or ""
        if not url.startswith("http"):
            continue
        out.append({"title": f.get("title") or "", "url": url,
                    "date": currency.parse_date(f.get("pubdate") or f.get("published") or f.get("updated") or f.get("date") or "") or "",
                    "content": re.sub(r"<[^>]+>", " ", f.get("encoded") or f.get("content") or f.get("description") or f.get("summary") or "")[:4000]})
    return out


def landing_links(raw, base, words):
    """Same-site links from a landing page that read like articles (a headline of four to thirty words, a path deeper
    than a section), the ones that carry the question's words first: [{title, url, date}]."""
    from . import pagetext
    site = (urlparse(base).hostname or "").lower().removeprefix("www.")
    seen, out = set(), []
    for href, inner in _A.findall(raw or ""):
        text = " ".join(re.sub(r"(?s)<[^>]+>", " ", inner).split())
        u = urljoin(base, href.strip()).split("#")[0]
        h = (urlparse(u).hostname or "").lower().removeprefix("www.")
        path = urlparse(u).path or "/"
        if u in seen or not u.startswith("http") or not (h == site or h.endswith("." + site)) or pagetext.is_index(u):
            continue
        if not (4 <= len(text.split()) <= 30) or len([p for p in path.split("/") if p]) < 2 or pagetext.SKIP_LINK.search(u):
            continue
        seen.add(u)
        m = _DATE_IN_PATH.search(path)
        day = f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3) or 1):02d}" if m else ""
        hits = sum(w in text.lower() for w in words)
        out.append({"title": text[:200], "url": u, "date": day, "content": text, "_hits": hits})
    out.sort(key=lambda x: (x["_hits"], x["date"] or ""), reverse=True)     # the question's words first, then the newest
    for x in out:
        x.pop("_hits", None)
    return out


def crawl_items(pairs, queries, window=None, get=None, budget_seconds=150, workers=12, state=None):
    """[(source id, pack)] of static_url sources -> pack items from each landing page's feed or article links. `state`
    is a dict of feed addresses already found ({source id: feed url or ""}), updated in place."""
    from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as _Late
    from . import pagetext
    get = get or pagetext._get
    reg = registry()
    state = state if state is not None else {}
    words = list(dict.fromkeys(w for q in queries for w in _words(q)))[:16]
    t0 = time.time()

    def body(url):
        r, b = get(url)
        if r is None or getattr(r, "status_code", 0) != 200 or not b:
            return ""
        return b.decode(getattr(r, "encoding", None) or "utf-8", errors="replace")

    def one(pair):
        sid, pid = pair
        s = reg.get(sid) or {}
        page = s.get("url") or ""
        name = s.get("name") or sid
        found = []
        feed = state.get(sid)
        raw = ""
        if feed is None:                                  # first visit: read the landing page, look for its feed
            raw = body(page)
            feed = ""
            for tag in _ALT.findall(raw or ""):
                m = _HREF.search(tag)
                if m:
                    feed = urljoin(page, m.group(1))
                    break
        if feed:
            xml = body(feed)
            entries = feed_items(xml, feed)
            for e in entries:
                text = f"{e['title']} {e['content']}".lower()
                if words and not any(w in text for w in words):
                    continue
                if not _inside(e["date"], window):
                    continue
                found.append(e)
                if len(found) >= PER_FEED:
                    break
        if not found and not feed:
            raw = raw or body(page)
            links = [x for x in landing_links(raw, page, words) if _inside(x["date"], window)]
            matched = [x for x in links if any(w in x["title"].lower() for w in words)]
            found = (matched or links)[:PER_PAGE]
        for x in found:
            x.update(publisher=name, pack=pid, tier=2, via="feed" if feed else "landing page")
        return sid, feed, found

    items = []
    pool = ThreadPoolExecutor(max_workers=workers)
    futs = [pool.submit(one, p) for p in pairs]
    try:
        for f in as_completed(futs, timeout=max(5, budget_seconds - (time.time() - t0))):
            try:
                sid, feed, found = f.result()
            except Exception:
                continue
            state[sid] = feed or state.get(sid) or ""
            items += [x for x in found if str(x.get("url") or "").startswith("https://")]
    except _Late:
        pass
    for f in futs:
        f.cancel()
    pool.shutdown(wait=False)
    return items


def channel_items(pairs, queries, window=None, get=None, budget_seconds=90, workers=2, per_channel=3):
    """[(source id, pack)] of YouTube channels -> their videos inside the period whose titles carry the question's words
    (each channel's public RSS feed; the research run reads each video as its transcript). Nothing is asked of YouTube
    while it is refusing this machine's requests."""
    from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as _Late
    from . import pagetext, youtube
    if youtube.refusing():
        return []
    get = get or pagetext._get
    reg = registry()
    words = list(dict.fromkeys(w for q in queries for w in _words(q)))[:16]
    t0 = time.time()

    def one(pair):
        sid, pid = pair
        s = reg.get(sid) or {}
        r, b = get(s.get("url") or "")
        if r is None or getattr(r, "status_code", 0) != 200 or not b:
            return []
        out = []
        for e in feed_items(b, s.get("url") or ""):
            if not _inside(e["date"], window) or (words and not any(w in e["title"].lower() for w in words)):
                continue
            out.append(dict(e, publisher=s.get("name") or sid, pack=pid, tier=2, via="YouTube channel"))
            if len(out) >= per_channel:
                break
        return out
    items = []
    pool = ThreadPoolExecutor(max_workers=workers)
    futs = [pool.submit(one, p) for p in pairs]
    try:
        for f in as_completed(futs, timeout=max(5, budget_seconds - (time.time() - t0))):
            try:
                items += [x for x in f.result() if str(x.get("url") or "").startswith("https://")]
            except Exception:
                continue
    except _Late:
        pass
    for f in futs:
        f.cancel()
    pool.shutdown(wait=False)
    return items


def read_other_kinds(pack_ids, call, queries, window=None, budget_seconds=180, say=None, search=None, get=None):
    """For the chosen packs, every source HiC's multi-search cannot answer well: web_search sources by site: search,
    static_url sources by crawling, into the local pack index. Returns a report by kind."""
    from . import packindex
    t0 = time.time()
    pairs, seen = [], set()
    for pid in pack_ids:
        try:
            for sid in call("GET", f"/api/source-packs/{pid}", 20).get("sourceIds") or []:
                if sid not in seen:
                    seen.add(sid)
                    pairs.append((sid, pid))
        except Exception:
            continue
    for sid, s in registry().items():                # HiC's YouTube channels belong to packs here, not in HiC's registry
        for pid in pack_ids:
            if s.get("kind") == "youtube_channel" and pid in (s.get("packs") or []) and sid not in seen:
                seen.add(sid)
                pairs.append((sid, pid))
    by = {k: [p for p in pairs if route(p[0]) == k] for k in ("site", "crawl", "channel")}
    report = {"sources": len(pairs), "by_route": counts([p[0] for p in pairs])}
    qs = [q for q in dict.fromkeys(" ".join(str(q or "").split()) for q in queries or []) if q][:3]
    if say:
        say(f"searching {len(by['site'])} pack sites, crawling {len(by['crawl'])} pack landing pages"
            + (f" and reading {len(by['channel'])} YouTube channels" if by["channel"] else ""))
    with _LOCK:
        state = dict(packindex._get("feeds", {}) or {})
    out = {}

    def site():
        out["site"] = site_items(by["site"], qs, window, search=search, budget_seconds=budget_seconds * 0.6)

    def crawl():
        out["crawl"] = crawl_items(by["crawl"], qs, window, get=get, budget_seconds=budget_seconds, state=state)
    def channels():
        out["channel"] = channel_items(by["channel"], qs, window, get=get, budget_seconds=budget_seconds * 0.6) if by["channel"] else []
    threads = [threading.Thread(target=site, daemon=True), threading.Thread(target=crawl, daemon=True),
               threading.Thread(target=channels, daemon=True)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=budget_seconds + 15)
    kept = 0
    for k in ("site", "crawl", "channel"):
        got = out.get(k) or []
        kept += packindex.remember(got)
        report[k] = {"sources": len(by[k]), "items": len(got), "answered": len({x["publisher"] for x in got})}
    with _LOCK:
        packindex._set("feeds", state)
    report.update(kept=kept, feeds_known=sum(1 for v in state.values() if v), seconds=round(time.time() - t0, 1))
    return report
