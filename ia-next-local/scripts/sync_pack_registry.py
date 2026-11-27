"""A read-only copy of HiC's data-pack registry with each source's type, address and site (26 Nov 2026), so IA Next can
reach every kind of source a pack holds by the path that works for it:

- RSS feeds, REST APIs and government data portals go through HiC's multi-search, as before;
- "web_search" sources (a site HiC searches with a keyless engine that no longer answers) are searched with IA Next's
  own engine as `site:` queries;
- "static_url" sources (a newsroom, blog or report index HiC returns as its landing page) are crawled: the page's feed
  and its newest article links are read;
- Reddit feeds are searched through Reddit's API with the pack's other subreddits (packsocial.py);
- dead connectors (Invidious) are not asked at all.

HiC's API lists each source's id, name, type and packs but not its address, so the address is read from the source
definitions in HiC's proxy code (one line each). Run it again when HiC's registry changes (like sync_brand_tokens.py):

  python scripts/sync_pack_registry.py
"""
import glob
import json
import os
import re
import urllib.request

HIC = "http://127.0.0.1:5012"
PROXY = r"D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research\proxy"
CONFIG = r"D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research\hic-workspace\.runtime\config.json"
CHANNELS = r"D:\NXT-HUMANS_AI_CX_WORKBENCH\humans-in-control-research\hic-workspace\youtube-channels.json"
CHANNEL_PACKS = ["higher_ed", "fundraising"]     # HiC's channel list is higher-ed and advancement (59 universities, 16 peers, 25 bodies)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ia_next", "pack_registry.json")
LINE = re.compile(r"""^\s*["']([a-z0-9_]+)["']\s*:\s*(\{[^\n]*\})\s*,?\s*$""", re.M)


def _get(path):
    tok = json.load(open(CONFIG, encoding="utf-8")).get("proxyToken") or ""
    req = urllib.request.Request(HIC + path, headers={"x-proxy-token": tok, "x-hic-session": "ia-next-registry"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    cats = _get("/api/sources").get("categories") or {}
    live = {}
    for c in (cats.values() if isinstance(cats, dict) else cats):
        for s in (c.get("sources") if isinstance(c, dict) else c) or []:
            if isinstance(s, dict) and s.get("id"):
                live[s["id"]] = {"name": s.get("name") or s["id"], "type": s.get("type") or "", "packs": s.get("packs") or []}
    found = {}
    for f in sorted(glob.glob(os.path.join(PROXY, "*.py"))):
        if ".bak" in f or os.path.basename(f).startswith("test"):
            continue
        for m in LINE.finditer(open(f, encoding="utf-8", errors="replace").read()):
            sid, body = m.group(1), m.group(2)
            if sid in live and sid not in found:
                g = lambda k: (re.search(r"""["']%s["']\s*:\s*["']([^"']*)["']""" % k, body) or [None, ""])[1]
                found[sid] = {"url": g("url"), "domain": g("domain")}
    out = {}
    for sid, s in live.items():
        a = found.get(sid) or {}
        url, domain = a.get("url") or "", a.get("domain") or ""
        kind = s["type"]
        if kind == "rss" and re.search(r"reddit\.com/r/", url):
            kind = "reddit_feed"
        out[sid] = dict(s, kind=kind, url=url, domain=domain)
    try:                                          # HiC's YouTube channels (its channel poller's list), read by their RSS feeds
        chans = json.load(open(CHANNELS, encoding="utf-8")).get("channels") or []
    except (OSError, ValueError):
        chans = []
    for c in chans:
        if c.get("channel_id") and c.get("rss_feed_primary"):
            who = " ".join(x for x in (c.get("institution"), f"({c['focus']})" if c.get("focus") else "") if x)
            out[f"yt_channel_{c['channel_id']}"] = {"name": f"YouTube: {who}".strip(), "type": "youtube_channel", "kind": "youtube_channel",
                                                     "packs": CHANNEL_PACKS, "url": c["rss_feed_primary"], "domain": "youtube.com"}
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump({"sources": out}, fh, indent=0, ensure_ascii=False, sort_keys=True)
    from collections import Counter
    print(len(out), "sources;", dict(Counter(v["kind"] for v in out.values())), ";",
          sum(1 for v in out.values() if v["url"] or v["domain"]), "with an address")


if __name__ == "__main__":
    main()
