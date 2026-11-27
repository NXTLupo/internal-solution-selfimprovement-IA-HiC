"""The whole text of a web page or a PDF, with its paragraphs, following a landing page to the document it introduces.

Owner, 26 Nov 2026: the old research system stored many articles cut short, and stopped at doorway pages (a report's
landing page, an abstract, a feed teaser) instead of reading the PDF or the full article behind them. "I want deep
crawling where HiC may have stopped at a doorway/landing page, instead of finding links to download full pdfs, or read
full articles."

What this module does, for one address:
- reads the page and keeps its main text with paragraph breaks (trafilatura), not the menus, cookie notices and footers
  a tag-stripper keeps; a PDF is read page by page with PyMuPDF, block by block, so its paragraphs survive too;
- when the page is a doorway (little main text, or a teaser that ends in "read more", or an abstract page that declares
  its PDF), it follows the links that lead to the full document: the page's declared PDF (citation_pdf_url), an arXiv
  abstract's PDF, links that end in .pdf, and links labelled "download", "full report", "full text", "read more";
  the longest genuine text wins, and the result records the landing page and the document actually read;
- says plainly when a page cannot be read (a bot wall, a paywall, an error), so a caller never keeps a wall as evidence.

Owner's crawling guide (26 Nov), the parts added on top:
- a real browser for pages a plain fetch cannot read: when the site refuses the plain fetch, or the page builds its text
  with JavaScript, or a doorway leads nowhere, the reader container (reader/app.py, Chromium) opens it, clicks a cookie,
  age or disclaimer gate the way a person would, scrolls, and hands back the rendered page. Bot checks and CAPTCHAs are
  reported, never got past;
- depth two: a doorway's link may land on a second doorway (a report page behind a press release); that page's declared
  PDF, PDF links and same-site full-text links are tried too, within one small budget of addresses per read;
- a followed page must be about the same thing: a linked article (not a declared PDF) is kept only when it shares most
  of the landing page's title words, so a "read more" that lands on a sponsored post or another story is dropped.

It sends an honest user agent and reads one address at a time; callers decide the pace.
"""
import io
import os
import re
import threading
from urllib.parse import urljoin, urlparse

import httpx

UA = {"User-Agent": "Mozilla/5.0 (compatible; ia-next-local/0.2; research reader)",
      "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5", "Accept-Language": "en-US,en;q=0.8"}
TIMEOUT = httpx.Timeout(18.0, connect=8.0)
MAX_HTML_BYTES = 8 * 1024 * 1024
MAX_PDF_BYTES = 40 * 1024 * 1024
DOORWAY_CHARS = 2500             # main text shorter than this may be a doorway to the real document
FOLLOW = 3                       # links tried behind one doorway
BUDGET = 5                       # addresses read behind one doorway, both depths together
READER_URL = os.environ.get("IA_NEXT_READER_URL", "").rstrip("/")
DECLARED = ("citation_pdf_url", "pdf alternate", "arXiv PDF")

BLOCKED = re.compile(r"(?i)\b(are you a robot|verify (?:that )?you are (?:a )?human|access denied|enable javascript and cookies|"
                     r"captcha|request unsuccessful|attention required|just a moment\.\.\.|unusual (?:traffic|activity) from your|"
                     r"subscribe to (?:continue|read)|this content is (?:only )?available to subscribers|403 forbidden|page not found|404 not found|"
                     r"robot challenge|checking the site connection|ddos protection by)\b")
TEASER_END = re.compile(r"(?i)(read more|continue reading|read the full (?:story|article|report|study)|download (?:the )?(?:full )?(?:report|pdf|study|paper)|"
                        r"view (?:the )?(?:full )?(?:report|pdf))[\s.…»>-]*$")
LINK_WORDS = re.compile(r"(?i)\b(download|full report|full[- ]text|read the (?:full )?(?:report|study|paper|article)|view (?:the )?(?:pdf|report)|"
                        r"get the (?:report|study)|read more|continue reading|read full|pdf)\b")
SKIP_LINK = re.compile(r"(?i)^(?:mailto:|javascript:|tel:|#)|/(?:login|signin|sign-in|subscribe|register|account|cart|share)\b|"
                       r"(?:facebook|twitter|x|linkedin|pinterest|reddit|whatsapp)\.com/(?:share|sharer|intent)")
_A = re.compile(r"""(?is)<a\b[^>]*\bhref\s*=\s*["']([^"'#][^"']*)["'][^>]*>(.*?)</a>""")
_META_PDF = re.compile(r"""(?i)<meta[^>]+name=["']citation_pdf_url["'][^>]*content=["']([^"']+)""")
_ALT_PDF = re.compile(r"""(?i)<link[^>]+type=["']application/pdf["'][^>]*href=["']([^"']+)""")


def _host(url):
    h = (urlparse(url).hostname or "").lower()
    return h[4:] if h.startswith("www.") else h


def _site(url):
    parts = _host(url).split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else _host(url)


def tidy(text):
    """Paragraphs kept, spaces inside lines collapsed, runs of blank lines folded to one."""
    lines = [re.sub(r"[ \t ]+", " ", ln).strip() for ln in str(text or "").replace("\r", "").split("\n")]
    out, blank = [], False
    for ln in lines:
        if not ln:
            if out and not blank:
                out.append("")
            blank = True
            continue
        out.append(ln)
        blank = False
    return "\n".join(out).strip()


def _strip_tags(raw):
    """The fallback reader: block ends become paragraph breaks, then tags go."""
    t = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header|form|aside)[^>]*>.*?</\1>", " ", raw or "")
    t = re.sub(r"(?i)</(p|div|h[1-6]|li|tr|section|article|blockquote)>|<br\s*/?>", "\n\n", t)
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    import html as _html
    return tidy(_html.unescape(t))


def _blocks_from_xml(xml):
    """Paragraphs from trafilatura's XML: a heading, a paragraph or a quote is one paragraph; a list keeps one line per
    item; a table keeps one line per row, its cells joined by " | "."""
    from lxml import etree
    root = etree.fromstring(xml.encode("utf-8"))
    main = root.find(".//main")
    main = main if main is not None else root
    flat = lambda el: " ".join("".join(el.itertext()).split())
    out = []
    for el in main:
        tag = el.tag if isinstance(el.tag, str) else ""
        if tag == "list":
            items = [flat(i) for i in el.iter("item") if flat(i)]
            if items:
                out.append("\n".join("- " + i for i in items))
        elif tag == "table":
            rows = [" | ".join(flat(c) for c in r.iter("cell")) for r in el.iter("row")]
            rows = [r for r in rows if r.strip(" |")]
            if rows:
                out.append("\n".join(rows))
        elif tag:
            t = flat(el)
            if t:
                out.append(t)
    return "\n\n".join(out)


_NOTICE = re.compile(r"(?i)(blocking our advert|disable your ad ?blocker|ad ?blocker (?:is )?(?:detected|enabled)|whitelist (?:us|this site|our site)|"
                     r"\b(?:we|this (?:web)?site) uses? (?:cookies|technologies like cookies)\b|to provide the best experiences, we use|"
                     r"by continuing to (?:use|browse) (?:this|our) (?:web)?site|^\s*manage (?:cookie )?consent\b|"
                     r"^\s*skip to (?:main )?content\b|^\s*listen to this article\b)")


def drop_notices(text):
    """Paragraphs that are a site's notices to the reader (ad-blocker requests, cookie banners, "skip to content"), not
    the document, are dropped. Only banner wording addressed to the reader matches, and only in short paragraphs, so an
    article about cookie policy or ad blockers keeps its text."""
    paras = str(text or "").split("\n\n")
    keep = [p for p in paras if not (len(p) < 700 and _NOTICE.search(p))]
    return "\n\n".join(keep) if keep else str(text or "")


def html_text(raw, url=""):
    """The page's main text with paragraphs (trafilatura), or the fallback reader's when trafilatura finds none; a
    site's notices to the reader are dropped either way."""
    text = ""
    try:
        import trafilatura
        xml = trafilatura.extract(raw, url=url or None, include_comments=False, include_tables=True, favor_recall=True,
                                  output_format="xml", deduplicate=True) or ""
        text = _blocks_from_xml(xml) if xml else ""
    except Exception:
        text = ""
    text = tidy(text)
    if len(text) < 200:
        alt = _strip_tags(raw)
        if len(alt) > len(text):
            text = alt
    return drop_notices(text)


def html_meta(raw, url=""):
    """{title, date, author, sitename} from the page's own metadata; empty strings when it holds none."""
    out = {"title": "", "date": "", "author": "", "sitename": ""}
    try:
        from trafilatura.metadata import extract_metadata
        m = extract_metadata(raw, default_url=url or None)
        if m is not None:
            for k in out:
                out[k] = str(getattr(m, k, "") or "").strip()
    except Exception:
        pass
    if not out["title"]:
        mt = re.search(r"(?is)<title[^>]*>(.*?)</title>", raw or "")
        if mt:
            import html as _html
            out["title"] = _html.unescape(re.sub(r"\s+", " ", mt.group(1))).strip()[:300]
    return out


def pdf_text(data):
    """(text, title) of a PDF: each page read block by block, a block's lines joined, hyphenated line ends mended."""
    import fitz
    doc = fitz.open(stream=data, filetype="pdf")
    paras = []
    for page in doc:
        for b in page.get_text("blocks"):
            if len(b) > 6 and b[6] != 0:          # an image block
                continue
            t = str(b[4] or "")
            t = re.sub(r"-\n(?=[a-z])", "", t)    # "informa-\ntion" -> "information"
            t = re.sub(r"\s*\n\s*", " ", t).strip()
            if t:
                paras.append(t)
    title = str((doc.metadata or {}).get("title") or "").strip()
    if not title or len(title) < 4 or title.lower().startswith(("microsoft word", "untitled")):
        title = next((p for p in paras[:6] if 8 <= len(p) <= 200), "")
    return tidy("\n\n".join(paras)), title[:300]


def doorway_links(raw, url):
    """[(score, absolute url, label)] of the links that may lead from a landing page to its full document, best first."""
    cands = {}

    def add(href, score, label=""):
        if not href or SKIP_LINK.search(href):
            return
        u = urljoin(url, href.strip())
        if not u.startswith("http") or u.split("#")[0] == url.split("#")[0]:
            return
        if _site(u) == _site(url):
            score += 1
        if u not in cands or cands[u][0] < score:
            cands[u] = (score, label)
    m = _META_PDF.search(raw or "")
    if m:
        add(m.group(1), 10, "citation_pdf_url")
    m = _ALT_PDF.search(raw or "")
    if m:
        add(m.group(1), 9, "pdf alternate")
    if re.search(r"arxiv\.org/abs/", url):
        add(re.sub(r"/abs/", "/pdf/", url), 9, "arXiv PDF")
    for href, inner in _A.findall(raw or ""):
        label = re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", inner)).strip()[:120]
        path = urlparse(href).path.lower()
        is_pdf = path.endswith(".pdf") or ".pdf?" in href.lower()
        worded = bool(LINK_WORDS.search(label))
        if is_pdf:
            add(href, 6 + (2 if worded else 0), label or "PDF")
        elif worded and len(label) <= 60:
            add(href, 4, label)
    return sorted(((s, u, lab) for u, (s, lab) in cands.items()), key=lambda x: -x[0])


INDEX_WORDS = {"news", "blog", "blogs", "press", "articles", "insights", "research", "resources", "publications", "reports",
               "newsroom", "stories", "latest", "topics", "category", "tag", "media"}


def is_index(url):
    """True for a site's home page or a section index ("/", "/news/", "/blog/category/x"): many documents, not one."""
    path = urlparse(url).path or "/"
    segs = [s for s in path.split("/") if s]
    return (not segs or (len(segs) == 1 and path.endswith("/")) or segs[-1].lower() in INDEX_WORDS
            or any(s.lower() in ("category", "tag", "topics") for s in segs))


def follow_links(raw, url):
    """The doorway links worth trying: a declared PDF always; from a home page or section index nothing else; from a
    listing (more than two "read more" style links) only PDF links."""
    links = doorway_links(raw, url)
    declared = [l for l in links if l[2] in ("citation_pdf_url", "pdf alternate", "arXiv PDF")]
    if is_index(url):
        return declared
    pdfs = [l for l in links if l[2] in ("citation_pdf_url", "pdf alternate", "arXiv PDF") or urlparse(l[1]).path.lower().endswith(".pdf")]
    worded = [l for l in links if l not in pdfs]
    return links if len(worded) <= 2 else pdfs


def is_blocked(text):
    """True when the text is a bot wall, a paywall or an error page rather than the document."""
    t = str(text or "")
    return bool(BLOCKED.search(t[:1500])) and len(t) < 6000


def looks_like_doorway(text, raw=""):
    t = str(text or "").strip()
    return (len(t) < DOORWAY_CHARS or bool(TEASER_END.search(t[-200:]))
            or (bool(_META_PDF.search(raw or "")) and len(t) < 8000))


_TITLE_STOP = {"with", "from", "that", "this", "their", "they", "your", "what", "when", "where", "which", "about", "into", "over",
               "after", "before", "will", "have", "more", "most", "than", "news", "home", "page", "blog", "report", "article",
               "read", "full", "story", "says", "said", "show", "shows", "2024", "2025", "2026", "2027"}


def _title_words(title, url=""):
    site = set(re.findall(r"[a-z]{4,}", _host(url)))
    return {w[:6] for w in re.findall(r"[a-z0-9]{4,}", str(title or "").lower()) if w not in _TITLE_STOP and w not in site}


def about_the_same(landing_title, got, url=""):
    """True when a followed page is about what the landing page announced: at least 40% of the landing title's words
    (first six letters, so plurals match) are in the followed page's title or opening. A landing title of fewer than two
    such words says too little to judge, so the page passes."""
    want = _title_words(landing_title, url)
    if len(want) < 2:
        return True
    have = _title_words(f"{got.get('title', '')} {str(got.get('text') or '')[:2000]}")
    return sum(w in have for w in want) / len(want) >= 0.4


_JS_SHELL = re.compile(r"""(?i)enable javascript|requires javascript|javascript is (?:required|disabled)|<div id=["'](?:root|app|__next)["']>\s*</div>""")


def wants_browser(r):
    """True when a real browser may read what the plain fetch could not: the site refused it (401, 403, 5xx), the
    address did not answer, the page showed a check or held no text, or the page builds its text with JavaScript.
    Never for a PDF, a missing page (404, 410), a paywall (402) or a site asking us to slow down (429)."""
    if not READER_URL or r.get("kind") == "pdf" or r.get("rendered"):
        return False
    st = int(r.get("status") or 0)
    if st in (402, 404, 410, 429):           # 26 Nov: 29 paywalled 402 pages went to the browser, which cannot pay either
        return False
    if not r.get("ok"):
        reason = str(r.get("reason") or "")
        return not reason.startswith(("the file is larger", "the address holds", "the PDF"))
    raw, text = r.get("raw") or "", r.get("text") or ""
    return len(text) < 800 and (raw.count("<script") >= 8 or bool(_JS_SHELL.search(raw)))


# The reader renders four pages at a time. Its callers (research and the Library's retry, eight workers) used to send
# more, so requests queued inside the reader and the 60-second timeout ran out while they waited: the papercuts showed
# "the browser reader did not answer" 29 times while the reader logged every page it rendered as done (26 Nov). The
# client now holds the same four slots, so the timeout measures the rendering, not the queue.
READER_SLOTS = 4
_READER_SEM = threading.BoundedSemaphore(READER_SLOTS)
READER_WAIT_SECONDS = 600


def _browse(url):
    """The reader container's rendering of the address: {ok, url, status, title, html, clicked, reason}, or None when no
    reader is set up or it did not answer."""
    if not READER_URL:
        return None
    if not _READER_SEM.acquire(timeout=READER_WAIT_SECONDS):
        return None
    try:
        r = httpx.post(f"{READER_URL}/read", json={"url": url, "wait_ms": 2000}, timeout=httpx.Timeout(60.0, connect=5.0))
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None
    finally:
        _READER_SEM.release()


_browse_impl = _browse                           # the real function, for tests (the shared test setup stubs _browse)


def _read_browser(url):
    """_read_one's answer, from the page as a browser rendered it."""
    out = {"ok": False, "url": url, "kind": "", "text": "", "title": "", "date": "", "author": "", "sitename": "", "raw": "",
           "headers": {}, "status": 0, "reason": "", "rendered": True, "clicked": []}
    got = _browse(url)
    if not got:
        out["reason"] = "the browser reader did not answer"
        return out
    out.update(url=got.get("url") or url, status=int(got.get("status") or 0), clicked=got.get("clicked") or [])
    if not got.get("ok") or not got.get("html"):
        out["reason"] = got.get("reason") or "no readable text"
        return out
    raw = got["html"]
    out.update(kind="html", raw=raw, text=html_text(raw, out["url"]), **html_meta(raw, out["url"]))
    out["title"] = out["title"] or str(got.get("title") or "")
    if is_blocked(out["text"]):
        out["reason"] = "the site showed a bot check, a paywall or an error page instead of the document"
        return out
    out["ok"] = bool(out["text"])
    out["reason"] = "" if out["ok"] else "no readable text"
    return out


def _get(url):
    """(response, body bytes) or (None, b"") on any network failure. Bodies past the size limits are not read."""
    try:
        with httpx.stream("GET", url, headers=UA, timeout=TIMEOUT, follow_redirects=True) as r:
            limit = MAX_PDF_BYTES if "pdf" in r.headers.get("content-type", "").lower() else MAX_HTML_BYTES
            body = b""
            for chunk in r.iter_bytes():
                body += chunk
                if len(body) > limit:
                    return r, b""
            return r, body
    except Exception:
        return None, b""


def _read_one(url):
    """{ok, url, kind, text, title, date, author, sitename, raw, headers, status, reason} for one address, no following."""
    r, body = _get(url)
    out = {"ok": False, "url": url, "kind": "", "text": "", "title": "", "date": "", "author": "", "sitename": "", "raw": "",
           "headers": {}, "status": 0, "reason": ""}
    if r is None:
        out["reason"] = "the address could not be reached"
        return out
    out.update(url=str(r.url), status=r.status_code, headers=dict(r.headers))
    if r.status_code != 200:
        out["reason"] = f"the site answered {r.status_code}"
        return out
    if not body:
        out["reason"] = "the file is larger than the reader takes"
        return out
    ctype = r.headers.get("content-type", "").lower()
    if "pdf" in ctype or body[:5] == b"%PDF-":
        try:
            text, title = pdf_text(body)
        except Exception:
            out["reason"] = "the PDF could not be read"
            return out
        out.update(kind="pdf", text=text, title=title)
    elif "html" in ctype or "xml" in ctype or "text" in ctype or not ctype:
        raw = body.decode(r.encoding or "utf-8", errors="replace")
        out.update(kind="html", raw=raw, text=html_text(raw, out["url"]), **html_meta(raw, out["url"]))
    else:
        out["reason"] = f"the address holds {ctype.split(';')[0] or 'an unknown type'}, not a page or a PDF"
        return out
    if is_blocked(out["text"]):
        out["reason"] = "the site showed a bot check, a paywall or an error page instead of the document"
        return out
    out["ok"] = bool(out["text"])
    if not out["ok"]:
        out["reason"] = "no readable text"
    return out


def _clearly_more(got, have):
    return bool(got.get("ok")) and len(got.get("text") or "") > max(int(have * 1.3), have + 400)


def read(url, deep=True, browser=True, video="auto"):
    """The fullest genuine text behind an address: the page itself, or the document its doorway leads to.
    Returns {ok, url (the document read), landing (the address asked for), via ("page", "pdf", "linked article",
    "linked PDF", "video transcript"), kind, text, title, date, author, sitename, raw (the landing page's html), headers,
    status, reason, followed: [addresses tried], rendered (a browser read the landing page), clicked: [gate buttons
    pressed]}. A YouTube video is read as its transcript (youtube.py; video: "never", "auto" or "always" Whisper)."""
    from . import videotranscript
    if videotranscript.youtube_id(url):
        from . import youtube
        return youtube.as_page(url, whisper=video)
    first = _read_one(url)
    if browser and wants_browser(first):
        seen_by_browser = _read_browser(url)
        if (seen_by_browser["ok"] and len(seen_by_browser["text"]) > len(first.get("text") or "") + 200
                and about_the_same(seen_by_browser.get("title", ""), {"title": "", "text": seen_by_browser["text"]}, url)):
            first = seen_by_browser
        elif not first.get("ok") and seen_by_browser.get("reason"):
            first = dict(first, reason=f"{first.get('reason')}; in a browser: {seen_by_browser['reason']}")
    best = dict(first, landing=url, via=("pdf" if first.get("kind") == "pdf" else "page"), followed=[])
    best.setdefault("rendered", False)
    best.setdefault("clicked", [])
    if not deep or first.get("kind") != "html" or not first.get("raw"):
        return best
    if not looks_like_doorway(first["text"], first["raw"]):
        return best
    landing_title = first.get("title", "")
    queue = [(link, label, 1) for _s, link, label in follow_links(first["raw"], first["url"])[:FOLLOW]]
    seen, budget = {url, first["url"]}, BUDGET
    while queue and budget > 0:
        link, label, depth = queue.pop(0)
        if link in seen:
            continue
        seen.add(link)
        budget -= 1
        best["followed"].append(link)
        got = _read_one(link)
        if not got["ok"]:
            continue
        if got["kind"] == "html" and label not in DECLARED and not about_the_same(landing_title, got, url):
            continue                                       # a "read more" that lands on another story
        if _clearly_more(got, len(best["text"] or "")):
            keep = {k: best[k] for k in ("landing", "followed", "raw", "headers", "rendered", "clicked")}
            best = dict(got, **keep, via=("linked PDF" if got["kind"] == "pdf" else "linked article"))
            best["title"] = best["title"] or first.get("title", "")
            best["date"] = best["date"] or first.get("date", "")
            best["sitename"] = best["sitename"] or first.get("sitename", "")
        if depth == 1 and got["kind"] == "html" and got.get("raw") and looks_like_doorway(got["text"], got["raw"]):
            for _s, l2, lab2 in follow_links(got["raw"], got["url"])[:2]:     # a doorway behind a doorway
                is_pdf = lab2 in DECLARED or urlparse(l2).path.lower().endswith(".pdf")
                if l2 not in seen and (is_pdf or _site(l2) == _site(url)):
                    queue.append((l2, lab2, 2))
    if not best["ok"] and first["ok"]:
        best = dict(first, landing=url, via="page", followed=best["followed"], rendered=first.get("rendered", False),
                    clicked=first.get("clicked", []))
    if (browser and best["via"] == "page" and best.get("ok") and not best.get("rendered") and READER_URL
            and looks_like_doorway(best["text"], best.get("raw", ""))):
        seen_by_browser = _read_browser(url)               # the doorway led nowhere: the page may build its text in script
        # the rendering carries the same page title, so its text alone must be about that title (a site that appends its
        # next story as you read would otherwise hand back the next story)
        if (_clearly_more(seen_by_browser, len(best["text"] or ""))
                and about_the_same(landing_title or seen_by_browser.get("title", ""), {"title": "", "text": seen_by_browser["text"]}, url)):
            keep = {k: best[k] for k in ("landing", "followed", "headers")}
            best = dict(seen_by_browser, **keep, via="page")
    return best
