"""Deep reading (26 Nov): a page's main text keeps its paragraphs; a landing page is followed to the PDF or the article
behind it; a bot wall is never kept as text; nothing here reaches the web (each test stands in pagetext._get)."""
import pytest

from ia_next import pagetext

ARTICLE = """<html><head><title>Colleges rewrite AI rules | Campus Weekly</title>
<meta property="article:published_time" content="2026-11-20"></head><body>
<nav><a href="/">Home</a> <a href="/news">News</a> <a href="/subscribe">Subscribe</a></nav>
<article><h1>Colleges rewrite AI rules</h1>
<p>Faculty at three public universities voted this month to replace blanket bans on generative AI with course-level rules
that each instructor states in the syllabus, after students said the old policy left them guessing.</p>
<p>The new rules ask instructors to name the tools allowed, the tasks they may be used for, and how a student should say
when a tool helped. Several departments have already published examples for their introductory courses.</p>
<p>Student leaders welcomed the change but asked for one shared template, so that a student taking five courses does not
have to read five different policies written five different ways.</p>
</article><footer>Copyright Campus Weekly. All rights reserved. Privacy. Terms. Cookie settings.</footer></body></html>"""


def _pdf_bytes(paragraphs):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for p in paragraphs:
        rect = fitz.Rect(60, y, 552, y + 220)
        assert page.insert_textbox(rect, p, fontsize=9) >= 0        # a negative result means the text did not fit
        y += 230
    data = doc.tobytes()
    doc.close()
    return data


class R:
    def __init__(self, url, status=200, ctype="text/html; charset=utf-8"):
        self.url, self.status_code, self.headers, self.encoding = url, status, {"content-type": ctype}, "utf-8"


def _web(pages):
    def get(url):
        if url not in pages:
            return R(url, 404), b"not found"
        body, ctype = pages[url]
        return R(url, 200, ctype), body
    return get


def test_the_main_text_keeps_its_paragraphs_and_drops_menus_and_footers():
    text = pagetext.html_text(ARTICLE, "https://campusweekly.example/ai-rules")
    assert "course-level rules" in text and "one shared template" in text
    assert text.count("\n\n") >= 2                                   # paragraphs survive
    assert "Cookie settings" not in text and "Subscribe" not in text


def test_a_landing_page_is_followed_to_its_pdf(monkeypatch):
    landing = """<html><head><title>State of student AI use 2026</title>
    <meta name="citation_pdf_url" content="/files/student-ai-2026.pdf"></head><body><p>Our annual survey of 4,000 students.</p>
    <a href="/files/student-ai-2026.pdf">Download the full report (PDF)</a></body></html>"""
    paras = ["Students in the survey used AI tools most for summarizing readings and checking citations before handing work in. " * 2,
             "Most respondents said their courses gave no clear rule on which tools were allowed, and many asked for one. " * 2,
             "Career offices reported more students drafting resumes with an assistant and then rewriting them by hand. " * 2]
    monkeypatch.setattr(pagetext, "_get", _web({
        "https://research.example/report": (landing.encode(), "text/html"),
        "https://research.example/files/student-ai-2026.pdf": (_pdf_bytes(paras), "application/pdf")}))
    got = pagetext.read("https://research.example/report")
    assert got["ok"] and got["via"] == "linked PDF" and got["kind"] == "pdf"
    assert got["landing"] == "https://research.example/report" and got["url"].endswith("student-ai-2026.pdf")
    assert "summarizing readings" in got["text"] and "Career offices" in got["text"]
    assert got["text"].count("\n\n") >= 2


def test_a_teaser_is_followed_to_the_full_article(monkeypatch):
    teaser = """<html><head><title>Colleges rewrite AI rules</title></head><body><p>Faculty voted to replace blanket bans with course-level
    rules. <a href="https://campusweekly.example/ai-rules">Read the full article</a></p></body></html>"""
    monkeypatch.setattr(pagetext, "_get", _web({
        "https://feed.example/item/9": (teaser.encode(), "text/html"),
        "https://campusweekly.example/ai-rules": (ARTICLE.encode(), "text/html")}))
    got = pagetext.read("https://feed.example/item/9")
    assert got["via"] == "linked article" and "one shared template" in got["text"]
    assert got["followed"] == ["https://campusweekly.example/ai-rules"]


def test_a_full_article_is_not_followed_anywhere(monkeypatch):
    long_article = ARTICLE.replace("</article>", "<p>" + "More detail on how departments wrote their rules. " * 80 + "</p></article>")
    calls = []
    web = _web({"https://campusweekly.example/ai-rules": (long_article.encode(), "text/html")})
    monkeypatch.setattr(pagetext, "_get", lambda u: calls.append(u) or web(u))
    got = pagetext.read("https://campusweekly.example/ai-rules")
    assert got["ok"] and got["via"] == "page" and calls == ["https://campusweekly.example/ai-rules"]


def test_a_bot_wall_is_never_kept_as_text(monkeypatch):
    wall = b"<html><head><title>Are you a robot?</title></head><body><p>Are you a robot? Please verify you are human.</p></body></html>"
    monkeypatch.setattr(pagetext, "_get", _web({"https://news.example/a": (wall, "text/html")}))
    got = pagetext.read("https://news.example/a")
    assert not got["ok"] and "bot check" in got["reason"]


def test_doorway_links_rank_the_declared_pdf_first_and_skip_share_links():
    raw = """<meta name="citation_pdf_url" content="https://journal.example/p/12.pdf">
    <a href="https://twitter.com/intent/tweet?url=x">Share</a><a href="/about">About</a>
    <a href="/p/12/full">Full text</a><a href="/files/appendix.pdf">Appendix</a>"""
    links = pagetext.doorway_links(raw, "https://journal.example/p/12")
    assert links[0][1] == "https://journal.example/p/12.pdf"
    urls = [u for _s, u, _l in links]
    assert "https://journal.example/p/12/full" in urls and not any("twitter" in u for u in urls)
    assert pagetext.doorway_links("", "https://arxiv.org/abs/2601.13268")[0][1] == "https://arxiv.org/pdf/2601.13268"


def test_home_pages_section_indexes_and_listings_are_not_doorways():
    assert pagetext.is_index("https://www.climatehubs.usda.gov/") and pagetext.is_index("https://news.adobe.com/news/")
    assert not pagetext.is_index("https://www.ams.usda.gov/services/transportation-analysis/gtr")
    listing = "".join(f'<a href="/news/story-{i}">Read more</a>' for i in range(6))
    assert pagetext.follow_links(listing, "https://brand.example/marketing/campaign") == []
    teaser = '<p>Short teaser.</p><a href="/2026/11/full-story">Read the full article</a>'
    assert [u for _s, u, _l in pagetext.follow_links(teaser, "https://feed.example/item/9")] == ["https://feed.example/2026/11/full-story"]
    declared = '<meta name="citation_pdf_url" content="/p/report.pdf">' + listing
    assert [u for _s, u, _l in pagetext.follow_links(declared, "https://brand.example/news/")] == ["https://brand.example/p/report.pdf"]


def _web_with_status(pages):
    def get(url):
        if url not in pages:
            return R(url, 404), b"not found"
        body, ctype, status = pages[url]
        return R(url, status, ctype), body
    return get


def test_a_page_the_site_refuses_is_read_in_a_browser(monkeypatch):
    monkeypatch.setattr(pagetext, "READER_URL", "http://reader.test")
    monkeypatch.setattr(pagetext, "_get", _web_with_status({"https://campusweekly.example/ai-rules": (b"Forbidden", "text/html", 403)}))
    asked = []
    monkeypatch.setattr(pagetext, "_browse", lambda u: asked.append(u) or {"ok": True, "url": u, "status": 200, "title": "Colleges rewrite AI rules",
                                                                         "html": ARTICLE, "clicked": ["Accept all"], "reason": ""})
    got = pagetext.read("https://campusweekly.example/ai-rules")
    assert got["ok"] and got["rendered"] and got["clicked"] == ["Accept all"] and "course-level rules" in got["text"]
    assert asked == ["https://campusweekly.example/ai-rules"]


def test_a_bot_check_in_the_browser_is_reported_not_got_past(monkeypatch):
    monkeypatch.setattr(pagetext, "READER_URL", "http://reader.test")
    monkeypatch.setattr(pagetext, "_get", _web_with_status({"https://news.example/a": (b"Forbidden", "text/html", 403)}))
    monkeypatch.setattr(pagetext, "_browse", lambda u: {"ok": False, "url": u, "status": 403, "title": "Just a moment...", "html": "",
                                                        "clicked": [], "reason": "the site showed a bot check; the reader does not get past those"})
    got = pagetext.read("https://news.example/a")
    assert not got["ok"] and "403" in got["reason"] and "in a browser: the site showed a bot check" in got["reason"]


def test_missing_pages_slow_down_requests_and_pdfs_never_go_to_the_browser(monkeypatch):
    monkeypatch.setattr(pagetext, "READER_URL", "http://reader.test")
    assert not pagetext.wants_browser({"ok": False, "status": 404, "reason": "the site answered 404"})
    assert not pagetext.wants_browser({"ok": False, "status": 429, "reason": "the site answered 429"})
    assert not pagetext.wants_browser({"ok": True, "kind": "pdf", "text": "x"})
    assert pagetext.wants_browser({"ok": False, "status": 403, "reason": "the site answered 403"})
    shell = '<html><body><div id="root"></div>' + "<script src='/a.js'></script>" * 9 + "</body></html>"
    assert pagetext.wants_browser({"ok": True, "kind": "html", "status": 200, "text": "Loading", "raw": shell})
    assert not pagetext.wants_browser({"ok": True, "kind": "html", "status": 200, "text": "x" * 5000, "raw": shell})
    monkeypatch.setattr(pagetext, "READER_URL", "")
    assert not pagetext.wants_browser({"ok": False, "status": 403, "reason": "the site answered 403"})     # no reader set up


def test_a_read_more_that_lands_on_another_story_is_not_kept(monkeypatch):
    teaser = """<html><head><title>Colleges rewrite AI rules</title></head><body><p>Faculty voted to replace blanket bans with course-level
    rules. <a href="https://campusweekly.example/sponsored/spring-sale">Read more</a></p></body></html>"""
    other = ("<html><head><title>Spring mattress sale ends Sunday</title></head><body><article>"
             + "<p>Our spring mattress sale ends Sunday with discounts on every frame and pillow in the store.</p>" * 30 + "</article></body></html>")
    monkeypatch.setattr(pagetext, "_get", _web({"https://feed.example/item/9": (teaser.encode(), "text/html"),
                                                "https://campusweekly.example/sponsored/spring-sale": (other.encode(), "text/html")}))
    got = pagetext.read("https://feed.example/item/9")
    assert got["via"] == "page" and "mattress" not in got["text"]
    assert pagetext.about_the_same("Colleges rewrite AI rules", {"title": "Colleges rewrite AI rules | Campus Weekly", "text": ""})
    assert not pagetext.about_the_same("Colleges rewrite AI rules", {"title": "Spring mattress sale ends Sunday", "text": "discounts"})


def test_a_doorway_behind_a_doorway_is_followed_to_the_pdf(monkeypatch):
    release = """<html><head><title>New survey on student AI use</title></head><body><p>The institute released its survey of
    student AI use today. <a href="https://research.example/reports/student-ai">Read the full report</a></p></body></html>"""
    report_page = """<html><head><title>Student AI use survey 2026</title></head><body><p>Survey of student AI use.</p>
    <a href="/files/student-ai-survey.pdf">Download the full report (PDF)</a></body></html>"""
    paras = ["Students in the survey used AI tools most for summarizing readings and checking citations before handing work in. " * 2,
             "Most respondents said their courses gave no clear rule on which tools were allowed, and many asked for one. " * 2,
             "Career offices reported more students drafting resumes with an assistant and then rewriting them by hand. " * 2]
    monkeypatch.setattr(pagetext, "_get", _web({
        "https://news.example/release": (release.encode(), "text/html"),
        "https://research.example/reports/student-ai": (report_page.encode(), "text/html"),
        "https://research.example/files/student-ai-survey.pdf": (_pdf_bytes(paras), "application/pdf")}))
    got = pagetext.read("https://news.example/release")
    assert got["ok"] and got["via"] == "linked PDF" and got["url"].endswith("student-ai-survey.pdf")
    assert got["followed"] == ["https://research.example/reports/student-ai", "https://research.example/files/student-ai-survey.pdf"]
    assert "Career offices" in got["text"] and got["landing"] == "https://news.example/release"


def test_site_notices_are_dropped_but_an_article_about_cookies_is_kept():
    text = ("You are using software which is blocking our advertisements (adblocker). Please disable your adblocker.\n\n"
            "Manage Consent To provide the best experiences, we use technologies like cookies to store device information.\n\n"
            "Google delayed its third-party cookie policy again, and retailers that rely on retargeting must plan for it.\n\n"
            "Advertisers said the change shifts budget toward first-party data and retail media networks.")
    kept = pagetext.drop_notices(text)
    assert "adblocker" not in kept and "Manage Consent" not in kept
    assert "third-party cookie policy" in kept and "retail media networks" in kept


def test_the_research_reader_uses_the_deep_reader(monkeypatch):
    from ia_next import studio
    monkeypatch.setattr(pagetext, "_get", _web({"https://campusweekly.example/ai-rules": (ARTICLE.encode(), "text/html")}))
    text, final, title, _when = studio._page_text("https://campusweekly.example/ai-rules")
    assert "course-level rules" in text and "\n\n" in text and final == "https://campusweekly.example/ai-rules"
    assert "Colleges rewrite AI rules" in title
