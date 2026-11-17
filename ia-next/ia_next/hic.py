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
    try:
        r = httpx.request(method, HIC_URL + path, headers=_headers(), timeout=timeout, **kw)
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
MAX_PACK_SOURCES = 120          # sources searched across the chosen packs (three multi-search batches of 40)


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


def pack_items(pack_ids, query, keep=12):
    """The most relevant recent items from HiC's data packs for a query: [{"title", "url", "date", "content",
    "publisher", "pack", "tier", "score"}], best first. Words of the query count by how rare they are among the
    candidates, so "nurse retention" outranks "hospital"; an item must contain at least one distinctive word.
    Raises HicUnavailable when HiC cannot be reached."""
    import math
    ids, owner = [], {}
    for pid in [p for p in pack_ids if p in PACKS]:
        for sid in _call("GET", f"/api/source-packs/{pid}", 20).get("sourceIds") or []:
            if sid not in owner:
                owner[sid] = pid
                ids.append(sid)
    ids = ids[:MAX_PACK_SOURCES]
    want = _terms(query)
    items, seen = [], set()
    for i in range(0, len(ids), 40):
        batch = ids[i:i + 40]
        out = _call("GET", "/api/multi-search", 240, params={"q": query[:200], "sources": ",".join(batch), "limit": 2})
        for res, sid in zip(out.get("results") or [], batch):
            for it in res.get("items") or []:
                url = str(it.get("url") or "")
                if not url.startswith("https://") or url in seen:
                    continue
                seen.add(url)
                items.append({"title": str(it.get("title") or "").strip(), "url": url, "date": _iso_date(it.get("date")),
                              "content": str(it.get("content") or ""), "publisher": str(res.get("source") or sid),
                              "pack": owner.get(sid, ""), "tier": int(res.get("credibilityTier") or 3),
                              "_terms": _terms(f"{it.get('title', '')} {it.get('content', '')}") & want})
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
    return [x for x in items if x["score"] > 0 and x["score"] >= 0.5 * top][:keep]
