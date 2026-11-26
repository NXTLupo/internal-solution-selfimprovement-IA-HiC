"""One citation line for a source, on every output (QA 25 Nov, E2: "claims with NO CITATIONS"; a journey map listed
its sources with no date and no link).

The house citation protocol (.claude/CLAUDE.md, the evidence-curator and source-ranker skills) asks for a real, named
source on every claim: the publication and the article title, never a generic reference. Every builder already puts
the source's name in its Sources list as <li id="src-S3">. This module completes that row, in one place, for every
kind of page: the publication, the date it was published, and the address of the original. It runs when a piece of
work finishes, after the checks, and never changes a claim, a quote or a number.
"""
import html
import os
import re

from . import config, currency, store

_MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")
_HOST = re.compile(r"[a-z0-9.-]+\.[a-z]{2,}")
SKIP_KINDS = ("prototype",)          # a prototype is a product screen, and its page is checked for outside addresses


def publication(source):
    """The publication's own name: the publisher field, else the part of the title before its colon."""
    pub = " ".join(str(source.get("publisher") or "").split())
    title = " ".join(str(source.get("title") or "").split())
    if pub and not _HOST.fullmatch(pub.lower()):
        return pub
    if ": " in title and len(title.split(": ", 1)[0]) <= 48:
        return title.split(": ", 1)[0]
    return pub


def published(source):
    """"12 November 2026", or "" when the source carries no date."""
    d = currency.parse_date(source.get("date"))
    if not d:
        return ""
    return f"{int(d[8:10])} {_MONTHS[int(d[5:7]) - 1]} {d[:4]}" if len(d) >= 10 else d[:4]


def line(source):
    """"Publication, 12 November 2026" for a source; the parts it has."""
    return ", ".join(x for x in (publication(source), published(source)) if x)


def meta_html(source):
    e = html.escape
    url = str(source.get("url") or "")
    bits = [e(x) for x in (publication(source), published(source) or "undated") if x]
    if url.startswith(("https://", "http://")):
        shown = re.sub(r"^https?://(www\.)?", "", url).rstrip("/")
        shown = shown if len(shown) <= 70 else shown[:67] + "..."
        bits.append(f'<a href="{e(url, quote=True)}" target="_blank" rel="noopener noreferrer">{e(shown)}</a>')
    if not bits:
        return ""
    return ('<span class="srcmeta" style="display:block;font-size:12px;line-height:1.4;opacity:.78;word-break:break-word">'
            + " · ".join(bits) + "</span>")


_ROW = re.compile(r'(<li\b[^>]*\bid="src-([A-Za-z0-9_.-]+)"[^>]*>)(.*?)(</li>)', re.S)


_SECTION = re.compile(r'<section\b[^>]*class="[^"]*\b(?:srcs|sources)\b[^"]*"[^>]*>')


KIND_TOOL = {"deck": "start_deck", "journey_map": "start_journey_map", "artifact": "start_artifact", "diagram": "start_diagram",
             "audio_overview": "start_audio_overview", "datatable": "start_datatable", "themes": "start_themes"}


def built_on(page, by_id, findings=None, thin=""):
    """One line above the Sources list saying how much the page rests on: the sources it cites out of those held, the
    publications, and the dates they span (QA 25 Nov, E7: an output did not say how much evidence was behind it)."""
    if 'class="builton"' in page:
        return page
    m = _SECTION.search(page)
    cited = [by_id[i] for i in dict.fromkeys(re.findall(r'id="src-([A-Za-z0-9_.-]+)"', page)) if i in by_id]
    if not m or not cited:
        return page
    pubs = {publication(s) for s in cited if publication(s)}
    dates = sorted(d for d in (currency.parse_date(s.get("date")) for s in cited) if d)
    span = ""
    if dates:
        a, b = published({"date": dates[0]}), published({"date": dates[-1]})
        span = f", published {a}" + (f" to {b}" if b != a else "")
    text = (f"Built on {len(cited)} of the {len(by_id)} sources this engagement holds"
            + (f" and {findings} checked findings" if findings else "")
            + (f", from {len(pubs)} publications" if pubs else "") + span + "."
            + (" " + thin.replace("That is thin", "This is thin evidence") if thin else ""))
    line = f'<p class="builton" style="font-size:13px;line-height:1.45;opacity:.82;margin:0 0 10px">{html.escape(text)}</p>'
    return page[:m.end()] + line + page[m.end():]


def enrich(page, sources, findings=None, thin=""):
    """The page with every Sources row completed. A row already completed is left as it is."""
    by_id = {str(s.get("id")): s for s in sources or [] if s.get("id")}

    def fix(m):
        if "srcmeta" in m.group(3) or m.group(2) not in by_id:
            return m.group(0)
        return m.group(1) + m.group(3) + meta_html(by_id[m.group(2)]) + m.group(4)
    out = _ROW.sub(fix, str(page or ""))
    return built_on(out, by_id, findings, thin)


def on_done(tid):
    """Complete the Sources rows of a finished page. Never raises: a citation line never fails a piece of work."""
    try:
        if not getattr(config, "CITE_PAGES", True):
            return False
        t = store.get_task(tid)
        path = str((t or {}).get("result_path") or "")
        if not t or t["kind"] in SKIP_KINDS or not path.endswith(".html") or not os.path.isfile(path):
            return False
        from . import secondbrain
        with open(path, encoding="utf-8") as f:
            page = f.read()
        if 'id="src-' not in page:
            return False
        try:
            from . import material
            n_find = len(material.load(t["engagement_id"], {})[0] or [])
        except Exception:
            n_find = None
        held = secondbrain.all_sources(t["engagement_id"])
        thin = ""
        try:                                     # work made on less than its level needs says so (QA 25 Nov, E7)
            from . import depthlevel
            thin = depthlevel.thin(KIND_TOOL.get(t["kind"], ""), depthlevel.for_task(tid), len(held), n_find or 0)
        except Exception:
            pass
        new = enrich(page, held, n_find, thin)
        if new == page:
            return False
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new)
        return True
    except Exception:
        return False
