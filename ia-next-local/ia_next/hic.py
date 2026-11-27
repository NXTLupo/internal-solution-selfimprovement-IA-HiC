"""IA Next's link to HiC's engine (enhancement plan Part 2).

Owner decision, 17 November 2026: IA Next calls HiC's research proxy through the host, with the token HiC already
publishes; the two systems keep separate networks, data and ports. The link is optional. When the suite is not
running, every call raises HicUnavailable with a reason a person can read, and IA Next falls back to what it can do
on its own.

The proxy listens on the host's 127.0.0.1:5012; from inside the IA Next container the host is host.docker.internal.
The token is read from the runtime config HiC publishes (mounted read-only at /hic-workspace/.runtime), on every call,
because HiC makes a new token each time its proxy starts. The token is never logged or returned.
"""
import base64
import json
import re
import os

import httpx

HIC_URL = os.environ.get("IA_NEXT_HIC_URL", "http://host.docker.internal:5012").rstrip("/")
RUNTIME_CONFIG = os.environ.get("IA_NEXT_HIC_RUNTIME", "/hic-workspace/.runtime/config.json")
MAX_UPLOAD_BYTES = 18 * 1024 * 1024          # HiC reads scanned PDFs with vision up to this size

# Files IA Next hands to HiC to read (PDF text and scanned-PDF OCR, Word, PowerPoint, Excel, images).
DOC_EXT = (".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".json", ".xml",
           ".png", ".jpg", ".jpeg", ".gif", ".webp")


class HicUnavailable(RuntimeError):
    """HiC's proxy cannot be reached or refused the call; the message says why in plain words."""


def _token():
    tok = os.environ.get("IA_NEXT_HIC_TOKEN", "").strip()
    if tok:
        return tok
    try:
        with open(RUNTIME_CONFIG, encoding="utf-8") as fh:
            return str((json.load(fh) or {}).get("proxyToken") or "").strip()
    except (OSError, ValueError):
        return ""


def _headers():
    h = {"x-hic-session": "ia-next"}
    tok = _token()
    if tok:
        h["x-proxy-token"] = tok
    return h


def _call(method, path, timeout, **kw):
    # IA Next Local: a route that can reach a paid model inside HiC is answered on this machine or refused (localhic)
    from . import localhic
    try:
        local = localhic.intercept(method, path, kw, _forward)
    except localhic.Refused as e:
        raise HicUnavailable(str(e))
    if local is not None:
        return local
    return _forward(method, path, timeout, **kw)


def _forward(method, path, timeout, **kw):
    headers = dict(_headers(), **(kw.pop("headers", None) or {}))
    try:
        r = httpx.request(method, HIC_URL + path, headers=headers, timeout=timeout, **kw)
    except httpx.TimeoutException as e:
        # 22 Nov: a long backfill call timed out and was reported as "HiC is not running" while HiC was up.
        if isinstance(e, httpx.ConnectTimeout):
            raise HicUnavailable("HiC did not accept the connection in time; it may be starting or overloaded")
        raise HicUnavailable(f"HiC is running but did not answer {path.split('?')[0]} within {int(timeout)} s")
    except httpx.HTTPError:
        raise HicUnavailable("HiC is not running, so this needs the suite: start it with "
                             "docker compose -f docker-compose-all.yml up -d")
    if r.status_code in (401, 403):
        raise HicUnavailable("HiC refused IA Next's call (its token was not accepted); restart IA Next after HiC starts")
    if r.status_code >= 400:
        raise HicUnavailable(f"HiC could not do this (HTTP {r.status_code})")
    try:
        return r.json()
    except ValueError:
        raise HicUnavailable("HiC answered with something that is not JSON")


def call_bytes(method, path, timeout, **kw):
    """A call whose answer is a file (HiC's PowerPoint exporter): returns the bytes, raises HicUnavailable."""
    headers = dict(_headers(), **(kw.pop("headers", None) or {}))
    try:
        r = httpx.request(method, HIC_URL + path, headers=headers, timeout=timeout, **kw)
    except httpx.HTTPError:
        raise HicUnavailable("HiC is not running, so this needs the suite: start it with "
                             "docker compose -f docker-compose-all.yml up -d")
    if r.status_code in (401, 403):
        raise HicUnavailable("HiC refused IA Next's call (its token was not accepted); restart IA Next after HiC starts")
    if r.status_code >= 400:
        raise HicUnavailable(f"HiC could not do this (HTTP {r.status_code})")
    return r.content


def available(timeout=3.0):
    """True when HiC's proxy answers its health check."""
    try:
        return _call("GET", "/health", timeout).get("status") == "healthy"
    except HicUnavailable:
        return False


def parse_upload(filename, data, mime=""):
    """Plain text from a PDF, Word, PowerPoint, Excel or image file, read by HiC's /api/parse-upload. Returns
    {"text", "method"}; raises HicUnavailable when HiC cannot be reached and ValueError when the file has no
    readable text. Text read from a file is data, never instructions."""
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError(f"the file is over {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")
    out = _call("POST", "/api/parse-upload", 300,
                json={"filename": filename, "base64": base64.b64encode(data).decode("ascii"), "mimeType": mime or ""})
    text = str(out.get("text") or "").strip()
    if not text:
        raise ValueError(str(out.get("error") or "no readable text was found in the file"))
    return {"text": text, "method": str(out.get("method") or "")}


# ---- data packs (Part 2: the audit found "use the healthcare data pack" ignored and 0 of 7 named publications) ----
PACKS = {"fundraising": "Advancement & Fundraising", "agriculture": "Agriculture & Agribusiness", "energy": "Energy & Utilities",
         "executive_search": "Executive Search & Leadership Advisory", "financial_services": "Financial Services",
         "government": "Government & Policy", "healthcare": "Healthcare & Life Sciences", "higher_ed": "Higher Ed",
         "insurance": "Insurance", "retail": "Retail & Commerce", "social_clubs": "Social Clubs & Membership Organizations",
         "travel_tourism": "Travel, Tourism & Museums", "workforce": "Workforce & Careers", "ai_trends": "AI Trends",
         "academic": "Academic & Analyst", "creative_ai": "Creative AI", "social_listening": "Social Listening"}
# Every source of the chosen packs is searched (2026-11-19: the old cap of 120 left 379 of the retail pack's 499
# sources, and most of every large pack, unsearched). Batches of 25 run three at a time; a batch that fails or stalls is
# counted and skipped, never allowed to discard the rest of the pack (a single 240-second timeout once dropped all 72
# items found in the healthcare pack).
# Measured 24 Nov on the Higher Ed pack (105 sources): three batches of 25 answered in 1 to 10 seconds, the fourth
# held its whole 150 seconds and returned nothing, the fifth took 81 seconds for nothing: 251 seconds, 236 of them
# waiting on a few slow feeds. Small batches keep a slow feed from taking 24 others with it, more run side by side,
# and a batch that has not answered in 40 seconds is skipped and counted.
MAX_PACK_SOURCES = 1500
PACK_BATCH = 10
# Six batches at once made HiC itself time out: 116 of 426 feeds were skipped in one search, and asked one at a time
# afterwards 83 of 84 of them answered at once (24 Nov). Three at a time, as before; the batches stay small.
PACK_WORKERS = 3
PACK_BATCH_TIMEOUT = 40
# The live search has a time budget. Batches of ten still timed out inside HiC with three at a time (90 of 426 feeds,
# 172 seconds, 24 Nov) although 115 of 116 of those feeds answer when asked alone. So the feeds that returned items
# most recently are asked first, the search stops at the budget, and the feeds not reached are served from the local
# index, which the idle pass refreshes three feeds at a time.
PACK_SEARCH_BUDGET = 75


def _terms(text):
    return {w for w in "".join(c.lower() if c.isalnum() else " " for c in str(text or "")).split() if len(w) > 3}


def _iso_date(raw):
    """YYYY-MM-DD from the date formats packs return (ISO, RFC 2822 feed dates); "" when unknown."""
    raw = str(raw or "").strip()
    if len(raw) >= 10 and raw[:4].isdigit() and raw[4] == "-":
        return raw[:10]
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(raw).strftime("%Y-%m-%d")
    except (TypeError, ValueError, IndexError):
        return ""


_GENERAL = {"ids": None, "at": 0.0, "in_pack": 0}


def general_source_ids():
    """HiC's sources that sit in no pack (news wires, GDELT, Hacker News, Bluesky, ...), read live from HiC's registry so a
    source added later is included; cached for an hour. [] when HiC is down."""
    import time as _t
    if _GENERAL["ids"] is not None and _t.time() - _GENERAL["at"] < 3600:
        return list(_GENERAL["ids"])
    try:
        cats = _call("GET", "/api/sources", 30).get("categories") or {}
        every = [s.get("id") if isinstance(s, dict) else s
                 for c in (cats.values() if isinstance(cats, dict) else cats)
                 for s in ((c.get("sources") if isinstance(c, dict) else c) or [])]
        inpack = set()
        for pid in (p["id"] for p in _call("GET", "/api/source-packs", 20).get("packs") or []):
            inpack.update(_call("GET", f"/api/source-packs/{pid}", 20).get("sourceIds") or [])
        # Archival lookups answer a URL, not a query; they are not search sources
        ids = [i for i in every if i and i not in inpack and not str(i).startswith("wayback")]
    except Exception:          # the general sources are a bonus: research never fails for want of them
        return []
    _GENERAL.update(ids=ids, at=_t.time(), in_pack=len(inpack & set(every)))
    return list(ids)


def pack_source_count():
    """How many distinct HiC sources sit in at least one pack (a source in two packs counts once); 0 when HiC is down."""
    general_source_ids()
    return int(_GENERAL.get("in_pack") or 0)


def pick_packs(text, ledger=None):
    """The HiC packs a research request is about, chosen by the fast model from HiC's live pack registry (names,
    industries, descriptions), when the agent named none. [] when nothing fits or HiC or the model is unavailable."""
    try:
        packs = _call("GET", "/api/source-packs", 20).get("packs") or []
    except Exception:
        return []
    if not packs or not str(text or "").strip():
        return []
    from . import config, providers
    listing = "\n".join(f"- {p['id']}: {p['name']}. {p.get('description', '')} Industries: {', '.join(p.get('industries') or [])}"
                         for p in packs)
    schema = {"type": "object", "additionalProperties": False, "required": ["packs"],
              "properties": {"packs": {"type": "array", "items": {"type": "string", "enum": [p["id"] for p in packs]}}}}
    try:
        raw, _, _ = providers.claude(config.SEATS["fast"]["secondary"],
                                     "You choose the data packs a research request needs. Pick the one to three packs whose "
                                     "industry or theme the request is about; pick none when no pack fits. Return JSON.",
                                     [{"role": "user", "content": f"Request: {str(text)[:1500]}\n\nPacks:\n{listing}"}],
                                     ledger, max_tokens=300, json_schema=schema)
        got = providers.parse_json(raw).get("packs") or []
    except Exception:
        return []
    return [p for p in dict.fromkeys(got) if p in {x["id"] for x in packs}][:3]


# ---- packs picked from the request's own words, in code (field test 23 Nov: "packs picked automatically shown as
# removable chips"). The model picker (pick_packs) needs a second model loaded; a plan card must appear in under a
# second. These word lists place a request on the card at once, the person can drop a pack or all of them there, and
# the model picker still runs when the words place nothing.
PACK_WORDS = {
    "higher_ed": "university universities college colleges campus student students faculty undergraduate undergraduates provost enrollment higher-ed tuition",
    "healthcare": "hospital hospitals nurse nurses nursing patient patients clinical clinician health healthcare physician physicians medical pharma",
    "ai_trends": "ai artificial-intelligence llm llms generative chatgpt openai anthropic gemini agents agentic chatbot chatbots machine-learning",
    "retail": "retail retailer retailers shopper shoppers store stores ecommerce e-commerce grocery merchandising checkout",
    "financial_services": "bank banks banking fintech lending payments wealth brokerage credit mortgage",
    "insurance": "insurance insurer insurers claims underwriting policyholder policyholders actuarial",
    "government": "government federal agency agencies regulation regulator public-sector municipal legislature policy",
    "workforce": "workforce hiring jobs career careers employer employers skills labor talent upskilling internship internships",
    "fundraising": "fundraising donor donors advancement alumni giving philanthropy endowment",
    "energy": "energy utility utilities grid renewable renewables oil gas solar wind electricity",
    "agriculture": "agriculture farm farms farming crop crops agribusiness livestock",
    "travel_tourism": "travel tourism museum museums hotel hotels airline airlines hospitality visitor visitors",
    "executive_search": "executive-search recruiting recruiter recruiters headhunter succession ceo board",
    "social_clubs": "club clubs membership member members association associations",
    "creative_ai": "image images video design creative illustration art music",
}
_PACK_WORDS = {p: set(w.split()) for p, w in PACK_WORDS.items()}


def quick_packs(text, limit=2):
    """The packs whose own words the request uses, most hits first (at most `limit`); [] when it uses none of them.
    No model call. "higher education" counts for Higher Ed; one stray word never picks a pack on its own unless it is
    the pack's subject word (ai, hospital, university...)."""
    try:                                         # the subject picks the packs, never the audience or the brand (E9:
        from . import router                     # "for the board" picked the leadership-advisory pack for insurance)
        text = router.presentation_free(text)[0] or text
    except Exception:
        pass
    t = " " + re.sub(r"[^a-z0-9\-]+", " ", str(text or "").lower()) + " "
    t = t.replace(" higher education ", " higher-ed ").replace(" higher ed ", " higher-ed ").replace(" artificial intelligence ", " ai ")
    t = t.replace(" machine learning ", " machine-learning ").replace(" public sector ", " public-sector ").replace(" executive search ", " executive-search ")
    words = t.split()
    hits = {p: sum(1 for w in words if w in ws) for p, ws in _PACK_WORDS.items() if p in PACKS}
    ranked = sorted((p for p, n in hits.items() if n), key=lambda p: (-hits[p], list(_PACK_WORDS).index(p)))
    return ranked[:limit]


def packs_for_choice(choice, text, picked=None):
    """The packs a plan card's "Data packs" choice stands for: "auto" (the agent's picks when it made any, else the
    code's), "only:<pack id>", or "none" ([] and no picking at all). Returns (packs, no_packs)."""
    c = str(choice or "").strip()
    if c == "none":
        return [], True
    if c.startswith("only:") and c[5:] in PACKS:
        return [c[5:]], False
    return [p for p in (picked or []) if p in PACKS] or quick_packs(text), False


def pack_owner():
    """{feed id: pack id} across every pack, for the idle probe (HiC's sources outside every pack map to "general")."""
    owner = {}
    for pid in PACKS:
        try:
            for sid in _call("GET", f"/api/source-packs/{pid}", 20).get("sourceIds") or []:
                owner.setdefault(sid, pid)
        except HicUnavailable:
            continue
    for sid in general_source_ids() or []:
        owner.setdefault(sid, "general")
    return owner


def pack_items(pack_ids, query, keep=12, report=None, extra_ids=None, loose=(), queries=None, live=True):
    """The most relevant recent items from HiC's data packs for a query: [{"title", "url", "date", "content",
    "publisher", "pack", "tier", "score"}], best first. Every source of the chosen packs is searched, plus extra_ids
    (HiC's sources outside every pack). Words of the query count by how rare they are among the candidates, so
    "nurse retention" outranks "hospital"; an item must contain at least one distinctive word. `report` (a dict) is
    filled with sources searched, answered and skipped. Raises HicUnavailable only when HiC cannot be reached at all.
    `loose` names packs the person selected: their items are returned whether or not they share a distinctive word
    with the query (field test 23 Nov, E3 and E7: a pack chosen for "themes in AI" lost VentureBeat AI, Import AI and
    the OpenAI blog to a word match, and 2 of 10 sources came from it). The caller checks their dates and relevance."""
    import math
    from concurrent.futures import ThreadPoolExecutor
    ids, owner = [], {}
    for pid in [p for p in pack_ids if p in PACKS]:
        for sid in _call("GET", f"/api/source-packs/{pid}", 20).get("sourceIds") or []:
            if sid not in owner:
                owner[sid] = pid
                ids.append(sid)
    for sid in extra_ids or []:
        if sid not in owner:
            owner[sid] = "general"
            ids.append(sid)
    ids = ids[:MAX_PACK_SOURCES]
    # (26 Nov) only the sources HiC's multi-search answers well are sent to it: a pack's site searches and landing pages
    # are read by packsources.py, its Reddit feeds through Reddit's API (packsocial.py), and dead connectors not at all
    try:
        from . import packsources
        other = packsources.counts(ids)
        ids = packsources.multi_only(ids)
    except Exception:
        other = {}
    # feeds that hung when asked alone are left out of the live search (packindex.probe); the index still serves them
    try:
        from . import packindex as _pi
        aside = set(_pi.set_aside())
    except Exception:
        aside = set()
    asked_ids = [s for s in ids if s not in aside]
    try:
        gave = _pi.productive()
        asked_ids.sort(key=lambda s: -float(gave.get(s, 0)))         # most recently productive feeds first (stable)
    except Exception:
        pass
    more = [q for q in (queries or []) if q and q != query]
    want = _terms(" ".join([query] + more))
    loose_packs = set(loose or ())
    items, seen = [], set()
    batches = [asked_ids[i:i + PACK_BATCH] for i in range(0, len(asked_ids), PACK_BATCH)] if live else []

    def run(batch):
        try:
            return batch, _call("GET", "/api/multi-search", PACK_BATCH_TIMEOUT,
                                params={"q": query[:200], "sources": ",".join(batch),
                                        # a pack the person selected gives more of each feed, so more of it can match
                                        "limit": 5 if any(owner.get(s) in loose_packs for s in batch) else 2}), None
        except HicUnavailable as e:
            return batch, None, str(e)[:160]

    rep = report if isinstance(report, dict) else {}
    rep.update(sources=len(ids), searched=0, answered=0, skipped=0, skipped_batches=0, local=0, set_aside=len(ids) - len(asked_ids),
               by_route=other)
    from concurrent.futures import as_completed, TimeoutError as _Late
    pool = ThreadPoolExecutor(max_workers=PACK_WORKERS)
    futs = [pool.submit(run, b) for b in batches]
    done = []
    try:
        for f in as_completed(futs, timeout=PACK_SEARCH_BUDGET):
            done.append(f.result())
    except _Late:
        pass
    late = [b for f, b in zip(futs, batches) if not f.done()]
    for f in futs:
        f.cancel()
    pool.shutdown(wait=False)
    rep["left_to_index"] = sum(len(b) for b in late)
    # the local index (packindex.py): everything earlier searches and the idle pass have read from these packs,
    # searched by the question's own words. It answers even when HiC does not.
    from . import packindex
    chosen_packs = [p for p in pack_ids if p in PACKS]
    try:
        packindex.used(chosen_packs)
        local_hits, got_urls = [], set()
        for q in [query] + more:                     # every question of the research plan, not one keyword string
            for hit in packindex.search(chosen_packs + ["general"], q, limit=max(60, keep)):
                if hit["url"] not in got_urls:
                    got_urls.add(hit["url"])
                    local_hits.append(hit)
    except Exception:
        local_hits = []
    if batches and all(out is None for _, out, _ in done) and not local_hits:
        raise HicUnavailable((done[0][2] if done else "") or "HiC did not answer the pack search")
    for batch, out, err in done:
        if out is None:
            rep["skipped"] += len(batch)
            rep["skipped_batches"] += 1
            continue
        rep["searched"] += len(batch)
        results = out.get("results") or []
        rep["answered"] += sum(1 for r in results if r.get("items"))
        try:
            packindex.productive([sid for res, sid in zip(results, batch) if res.get("items")])
        except Exception:
            pass
        for res, sid in zip(results, batch):
            for it in res.get("items") or []:
                url = str(it.get("url") or "")
                if not url.startswith("https://") or url in seen:
                    continue
                seen.add(url)
                items.append({"title": str(it.get("title") or "").strip(), "url": url, "date": _iso_date(it.get("date")),
                              "content": str(it.get("content") or ""), "publisher": str(res.get("source") or sid),
                              "pack": owner.get(sid, ""), "tier": int(res.get("credibilityTier") or 3),
                              "_terms": _terms(f"{it.get('title', '')} {it.get('content', '')}") & want})
    try:
        packindex.remember(items)
        failed = [s for batch, out, _ in done if out is None for s in batch]
        if failed and len(failed) < len(asked_ids):          # some batches answered, so HiC is up: these feeds are suspects
            packindex.suspects(failed)
    except Exception:
        pass
    for it in local_hits:
        if it["url"] in seen:
            continue
        seen.add(it["url"])
        rep["local"] += 1
        items.append({"title": it["title"] or "", "url": it["url"], "date": it["date"] or "", "content": it["content"] or "",
                      "publisher": it["publisher"] or "", "pack": it["pack"], "tier": int(it["tier"] or 3),
                      "_terms": _terms(f"{it['title']} {it['content']}") & want})
    n = len(items) or 1
    df = {w: sum(1 for x in items if w in x["_terms"]) for w in want}
    weight = {w: math.log((n + 1) / (df[w] + 0.5)) for w in want if df[w]}
    distinctive = {w for w in weight if df[w] <= max(1, 0.3 * n)}
    for x in items:
        x["score"] = round(sum(weight.get(w, 0) for w in x["_terms"]), 3) if x["_terms"] & distinctive else 0
        del x["_terms"]
    items.sort(key=lambda x: (-x["score"], x["tier"], -(int(x["date"][:4]) if x["date"][:4].isdigit() else 0)))
    top = items[0]["score"] if items else 0
    # pack feeds return their latest items, not matches to the query: keep only those close to the best match
    loose = set(loose or ())
    matched = [x for x in items if x["score"] > 0 and x["score"] >= 0.5 * top]
    rest = [x for x in items if x["pack"] in loose and x not in matched]
    rest.sort(key=lambda x: (x["score"], x["date"] or ""), reverse=True)        # best match, then newest
    return (matched + rest)[:keep]


def named_publications(names, query, engagement="", per_name=3):
    """Pages about the query from each publication the person named, through HiC's source registry
    (/api/sources/named): [{"name", "status": found|nothing|unresolved, "host", "registry", "note", "items": [{"title",
    "url", "published", "content", "wikiPath"}]}]. HiC archives each page into the second brain with the publication
    as its source and the page's own published date. Raises HicUnavailable when HiC cannot be reached."""
    names = [str(n).strip() for n in names or [] if str(n or "").strip()]
    if not names:
        return []
    got = _call("POST", "/api/sources/named", 200, json={"names": names, "query": str(query or "")[:300],
                                                         "engagement": engagement or "", "per_name": per_name})
    return got.get("publications") or []
