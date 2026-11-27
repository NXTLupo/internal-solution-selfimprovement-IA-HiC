"""Data currency, decided in code (field test 2026-11-23, workstream 0).

Every case in the field test failed on currency: "today's news" cited pages from 2025, the search planner wrote "2024"
into its queries because no prompt told it the date, web pages were stored with no published date, and nothing checked
the dates of what was collected. The owner's rule: a request for today means today's calendar date, and research with
no stated period means the last 30 days.

This module owns that rule. `window(text)` reads the period a request implies; `stamp()` is the line that tells a model
the date; `parse_date` and `page_date` give every source a published date in one format (YYYY-MM-DD, in the owner's
time zone); `inside` and `spread` say how a set of sources sits against a window. Nothing here calls a model.
"""
import datetime as _dt
import html as _html
import json
import os
import re
from email.utils import parsedate_to_datetime

try:
    import zoneinfo
except ImportError:                                  # pragma: no cover
    zoneinfo = None

TZ_NAME = os.environ.get("IA_NEXT_TZ", "America/New_York")
RESEARCH_DAYS = 30           # research with no stated period
RESEARCH_BAR = 0.8           # share of a research corpus that must sit inside its window
UNDATED_CAP = 0.2            # undated pages a research corpus may hold, as a share
BACKGROUND_CAP = 0.2         # older, labelled background pages, as a share


def tz():
    try:
        return zoneinfo.ZoneInfo(TZ_NAME) if zoneinfo else _dt.timezone.utc
    except Exception:
        return _dt.timezone.utc


def now():
    return _dt.datetime.now(tz())


def today():
    return now().date()


def stamp():
    """The sentence every planning and writing prompt carries."""
    d = today()
    return f"Today's date is {d.strftime('%A')} {d.day} {d.strftime('%B %Y')}."


_NUM = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "twelve": 12, "a": 1, "couple of": 2, "few": 3}
_UNIT = {"day": 1, "week": 7, "month": 30, "quarter": 91, "year": 365}
_SPAN = re.compile(r"(?i)\b(?:last|past|previous|within(?: the)?(?: last| past)?)\s+(\d{1,3}|" + "|".join(_NUM) +
                   r")?\s*(day|week|month|quarter|year)s?\b")
# the same period said other ways (owner, 25 Nov: "collect data 90 days out"): "going back 90 days", "a 90-day window",
# "90 days out", "three months of coverage"
_SPAN_LEAD = re.compile(r"(?i)\b(?:going back|go(?:es)? back|dating back|reaching back|looking back|covering|spanning)\s+(?:the\s+)?"
                        r"(?:last\s+|past\s+)?(\d{1,3}|" + "|".join(_NUM) + r")\s*(day|week|month|quarter|year)s?\b")
_SPAN_TAIL = re.compile(r"(?i)\b(\d{1,3}|" + "|".join(_NUM) + r")[- ]?(day|week|month|quarter|year)s?[- ]"
                        r"(?:out|back|window|period|look-?back|span|range|horizon|"
                        r"of (?:data|news|coverage|evidence|sources|research|articles|posts|reporting))\b")
_RULES = [
    (r"(?i)\b(today|today'?s|tonight|this (morning|afternoon|evening))\b", 1, "today"),
    (r"(?i)\b(yesterday|last 24 hours|past 24 hours|overnight)\b", 2, "since yesterday"),
    (r"(?i)\b(this week|this week'?s|past few days|last few days)\b", 7, "the last 7 days"),
    (r"(?i)\b(this month|this month'?s)\b", 30, "the last 30 days"),
    (r"(?i)\b(this quarter)\b", 91, "the last 3 months"),
    (r"(?i)\b(this year|this year'?s|year to date)\b", 365, "the last 12 months"),
]
_OPEN = re.compile(r"(?i)\b(history|historical|historically|over time|over the years|evolution of|all[- ]time|origins? of|"
                   r"timeline|chronology|since the beginning|decades?)\b")
_YEAR = re.compile(r"(?i)\b(?:since|from|after|in|during|back to)\s+((?:19|20)\d{2})\b")


_DEFAULT = object()


def window(text, default_days=_DEFAULT):
    """The period a request implies: {"days", "since", "label", "why", "strict"}. days is None when the request asks
    for history (no window). `strict` marks a calendar-day request ("today"), where every item must carry that date.
    default_days applies when the request names no period (30 for research; pass None for a plain lookup)."""
    t = str(text or "")
    d0 = today()
    if default_days is _DEFAULT:
        default_days = RESEARCH_DAYS

    def make(days, label, why, strict=False):
        since = (d0 - _dt.timedelta(days=max(0, days - 1))).isoformat() if days else ""
        return {"days": days, "since": since, "until": d0.isoformat(), "label": label, "why": why, "strict": strict}

    for rx, days, label in _RULES:
        m = re.search(rx, t)
        if m:
            return make(days, label, f"the request says \"{m.group(0).lower()}\"", strict=days == 1)
    m = _SPAN.search(t) or _SPAN_LEAD.search(t) or _SPAN_TAIL.search(t)
    if m:
        n = m.group(1)
        n = int(n) if n and n.isdigit() else _NUM.get((n or "a").lower(), 1)
        days = max(1, n * _UNIT[m.group(2).lower()])
        return make(days, f"the last {days} days" if days < 60 else f"the last {round(days / 30)} months",
                    f"the request says \"{m.group(0).lower()}\"")
    m = _YEAR.search(t)
    if m and 1990 <= int(m.group(1)) <= d0.year:
        days = (d0 - _dt.date(int(m.group(1)), 1, 1)).days + 1
        return make(days, f"since {m.group(1)}", f"the request says \"{m.group(0).lower()}\"")
    if _OPEN.search(t):
        return make(None, "any date", f"the request asks for history (\"{_OPEN.search(t).group(0).lower()}\")")
    if default_days is None:
        return make(None, "any date", "the request names no period")
    return make(default_days, f"the last {default_days} days", "no period was named, so the default applies")


PERIOD_CHOICES = ("1", "7", "30", "90", "365", "any")     # what the plan card offers


def for_choice(choice):
    """The window for a period chosen on the plan card ("1", "7", "30", "90", "365" or "any")."""
    c = str(choice or "").strip().lower()
    if c == "any":
        return window("the history of this subject")
    if c == "1":
        return window("today")
    try:
        n = int(c)
    except ValueError:
        return window("")
    return dict(window(f"in the last {n} days"), why="chosen on the plan card")


def choice_of(w):
    """The plan-card choice nearest a window: its days when offered, else the next longer one, "any" for none."""
    days = (w or {}).get("days")
    if not days:
        return "any"
    return next((c for c in ("1", "7", "30", "90", "365") if days <= int(c)), "any")


def search_range(w):
    """The search engine's time range for a window: day, week, month, year, or "" for none."""
    days = (w or {}).get("days")
    if not days:
        return ""
    return "day" if days <= 2 else "week" if days <= 7 else "month" if days <= 31 else "year"


# ---- dates on sources -------------------------------------------------------------------------------------------------
_MONTHS = {m: i for i, m in enumerate(("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"), 1)}
_ISO = re.compile(r"((?:19|20)\d{2})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?)?")
_WORDY = re.compile(r"(?i)\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+((?:19|20)\d{2})\b|"
                    r"\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+((?:19|20)\d{2})\b")


def _valid(y, m, d):
    try:
        got = _dt.date(int(y), int(m), int(d))
    except (TypeError, ValueError):
        return None
    return got if _dt.date(1990, 1, 1) <= got <= today() + _dt.timedelta(days=2) else None


def parse_date(raw):
    """YYYY-MM-DD in the owner's time zone from the forms sources use (ISO with or without a time, RFC 2822 feed dates,
    "23 November 2026", "Nov 23, 2026", epoch seconds or milliseconds); "" when it is not a date. A timestamp with a
    zone is converted, so an item published at 02:00 UTC counts on the owner's previous evening."""
    if raw is None:
        return ""
    if isinstance(raw, (int, float)) or (isinstance(raw, str) and raw.strip().isdigit() and len(raw.strip()) >= 10):
        try:
            n = float(raw)
            got = _dt.datetime.fromtimestamp(n / 1000 if n > 1e11 else n, tz()).date()
            return got.isoformat() if _valid(got.year, got.month, got.day) else ""
        except (ValueError, OverflowError, OSError):
            return ""
    s = str(raw).strip()
    if not s:
        return ""
    m = _ISO.search(s)
    if m:
        y, mo, d, hh, mm, ss, zone = m.groups()
        if hh and zone and not (int(hh) == 0 and int(mm or 0) == 0 and int(ss or 0) == 0):
            # (26 Nov) 00:00:00 with a zone is how feeds write a date with no time: its calendar day is kept, not moved
            # to the owner's previous evening
            try:
                z = "+00:00" if zone == "Z" else (zone if ":" in zone else zone[:3] + ":" + zone[3:])
                got = _dt.datetime.fromisoformat(f"{y}-{mo}-{d}T{hh}:{mm}:{ss or '00'}{z}").astimezone(tz()).date()
                return got.isoformat() if _valid(got.year, got.month, got.day) else ""
            except ValueError:
                pass
        got = _valid(y, mo, d)
        return got.isoformat() if got else ""
    if re.search(r"(?i)\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*,\s", s) or re.search(r"\d{1,2}:\d{2}", s):
        try:
            dt = parsedate_to_datetime(s)
            midnight = (dt.hour, dt.minute, dt.second) == (0, 0, 0)
            got = (dt.astimezone(tz()) if dt.tzinfo and not midnight else dt).date()
            return got.isoformat() if _valid(got.year, got.month, got.day) else ""
        except (TypeError, ValueError, IndexError):
            pass
    m = _WORDY.search(s)
    if m:
        d, mon, y = (m.group(1), m.group(2), m.group(3)) if m.group(1) else (m.group(5), m.group(4), m.group(6))
        mo = _MONTHS.get(mon[:3].lower())
        got = _valid(y, mo, d) if mo else None
        return got.isoformat() if got else ""
    m = re.search(r"\b(\d{4})/(\d{1,2})/(\d{1,2})\b", s)      # 2026/10/05
    if m:
        got = _valid(*m.groups())
        return got.isoformat() if got else ""
    m = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", s)      # 06/02/2026 (month first, as US sites write it)
    if m:
        got = _valid(m.group(3), m.group(1), m.group(2))
        return got.isoformat() if got else ""
    return ""


_META_KEYS = ("article:published_time", "og:article:published_time", "article:published", "datepublished", "date_published",
              "publishdate", "publish-date", "publish_date", "pubdate", "publication_date", "parsely-pub-date",
              "sailthru.date", "dc.date.issued", "dc.date", "dcterms.created", "dcterms.issued", "citation_publication_date",
              "citation_online_date", "citation_date", "date", "og:published_time", "article.published", "cxenseparse:recs:publishtime")
_META = re.compile(r"""(?is)<meta\b[^>]*?(?:name|property|itemprop)\s*=\s*["']([^"']{3,60})["'][^>]*?content\s*=\s*["']([^"']{6,60})["']|"""
                   r"""<meta\b[^>]*?content\s*=\s*["']([^"']{6,60})["'][^>]*?(?:name|property|itemprop)\s*=\s*["']([^"']{3,60})["']""")
_JSONLD = re.compile(r'(?is)"(datePublished|dateCreated|uploadDate)"\s*:\s*"([^"]{6,40})"')
_TIME = re.compile(r"""(?is)<time\b[^>]*?datetime\s*=\s*["']([^"']{6,40})["']""")
_BYLINE = re.compile(r"(?i)\b(?:published|posted|updated|date)\b[:\s|-]{0,6}(?:on\s+)?((?:\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}\.?,?\s+(?:19|20)\d{2})|"
                     r"(?:[a-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2})|(?:(?:19|20)\d{2}-\d{2}-\d{2}))")
_URL_DATE = re.compile(r"/((?:19|20)\d{2})[/-](\d{1,2})[/-](\d{1,2})(?:[/-]|$)")


def page_date(raw_html="", url="", headers=None):
    """(date, basis) for a fetched page: its metadata, then JSON-LD, then a <time> element, then a date in the address,
    then the Last-Modified header. basis names which one answered ("" with "" when none did): a Last-Modified date says
    when the file changed, so callers treat that basis as weak."""
    head = (raw_html or "")[:400_000]
    found = {}
    for m in _META.finditer(head):
        key, val = (m.group(1), m.group(2)) if m.group(1) else (m.group(4), m.group(3))
        found.setdefault(key.strip().lower(), _html.unescape(val))
    for key in _META_KEYS:
        got = parse_date(found.get(key))
        if got:
            return got, "page metadata"
    for m in _JSONLD.finditer(head):
        got = parse_date(m.group(2))
        if got:
            return got, "page metadata"
    m = _TIME.search(head)
    if m and parse_date(m.group(1)):
        return parse_date(m.group(1)), "page time element"
    m = _URL_DATE.search(url or "")
    if m:
        got = _valid(*m.groups())
        if got:
            return got.isoformat(), "page address"
    # A byline date in the page's own opening text ("Published November 20, 2026", "By A. Writer | Nov 20, 2026").
    # Measured 24 Nov: 27 pages of one run had no date in their metadata and were left out as undated.
    body = re.sub(r"(?is)<(script|style|nav|footer|header|aside)\b.*?</\1>", " ", head)
    body = _html.unescape(re.sub(r"(?s)<[^>]+>", " ", body))
    start = re.sub(r"\s+", " ", body)[:2500]
    m = _BYLINE.search(start) or _WORDY.search(start[:1200])
    if m:
        got = parse_date(m.group(0))
        if got:
            return got, "page text"
    lm = (headers or {}).get("last-modified") or (headers or {}).get("Last-Modified")
    if lm and parse_date(lm):
        return parse_date(lm), "last modified"
    return "", ""


def age_days(date_iso):
    got = parse_date(date_iso)
    return (today() - _dt.date.fromisoformat(got)).days if got else None


def inside(date_iso, w):
    """True when the date sits in the window, False when it is older, None when the source has no date. A window with
    no period (history) holds every dated source."""
    got = parse_date(date_iso)
    if not got:
        return None
    if not (w or {}).get("since"):
        return True
    return got >= w["since"]


def spread(sources, w):
    """How a set of sources sits against a window: {"total", "inside", "older", "undated", "share", "text"}."""
    n_in = n_old = n_none = 0
    for s in sources:
        r = inside(s.get("date") if isinstance(s, dict) else s, w)
        n_in, n_old, n_none = n_in + (r is True), n_old + (r is False), n_none + (r is None)
    total = n_in + n_old + n_none
    label = (w or {}).get("label") or "any date"
    bits = [f"{n_in} from {label}"] if (w or {}).get("since") else [f"{n_in} dated"]
    if n_old:
        bits.append(f"{n_old} older")
    if n_none:
        bits.append(f"{n_none} undated")
    return {"total": total, "inside": n_in, "older": n_old, "undated": n_none,
            "share": round(n_in / total, 3) if total else 0.0, "text": f"{total} sources: " + ", ".join(bits)}


def tier(date_iso, w):
    """current, background (older than the window) or undated: the label a source carries through the run."""
    r = inside(date_iso, w)
    return "current" if r else "undated" if r is None else "background"


def show(date_iso):
    """A date as a reader sees it: 23 Nov 2026; "undated" when there is none."""
    got = parse_date(date_iso)
    if not got:
        return "undated"
    d = _dt.date.fromisoformat(got)
    return f"{d.day} {d.strftime('%b %Y')}"


def to_json(w):
    return json.dumps(w or {}, ensure_ascii=False)
