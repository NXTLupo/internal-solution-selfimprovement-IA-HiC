"""The HiC second brain migrated into the Library (26 Nov): pages labelled, cleaned, de-duplicated, stored whole, cut into
passages, searched by words and meaning, restored from their addresses by the deep reader, browsable with their kind and
provenance, added to an engagement with their passages, and recalled by the chat. A small wiki stands in for the old one;
no test reaches the web or a model."""
import hashlib
import json
import os

import pytest

from ia_next import chunking, config, currency, hicmigrate, libraryview, librarysearch, secondbrain, store

ART = ("Faculty at three public universities voted this month to replace blanket bans on generative AI with course-level "
       "rules that each instructor states in the syllabus, after students said the old policy left them guessing. ") * 3


def page(root, path, front, body):
    full = os.path.join(root, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    fm = "\n".join(f"{k}: {json.dumps(v) if isinstance(v, str) else v}" for k, v in front.items())
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(f"---\n{fm}\nchunks:\n  - id: \"{path}#c0\"\n    char_span: [0, 10]\n---\n{body}")


@pytest.fixture
def wiki(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    librarysearch._READY = None
    librarysearch._MAT.update(key=None, ids=None, m=None)
    librarysearch._META_CACHE.update(key=None, rows={})
    root = str(tmp_path / "wiki")
    page(root, "articles/campus-weekly/a1.md", {"url": "https://campusweekly.example/ai-rules?utm_source=rss", "source": "Campus Weekly (RSS)",
                                                "title": "Colleges rewrite AI rules", "date": "Wed, 04 Nov 2026 00:00:00 GMT", "chars": 10000,
                                                "engagement": "1-understand-college-student-ai-behaviors"},
         "# Colleges rewrite AI rules\n\nSource: [Campus Weekly](https://campusweekly.example/ai-rules)\n\n" + ART + "\n\n" + ART)
    page(root, "social-intelligence/s1.md", {"url": "https://www.reddit.com/r/college/comments/abc/ai_rules/", "source": "reddit-deep: r/college",
                                              "title": "Every class has a different AI rule", "kind": "social-post", "subreddit": "college",
                                              "date": "2026-11-10"}, "Every class has a different AI rule and nobody explains which one applies. " * 3)
    page(root, "articles/reddit-deep-r-college/s1b.md", {"url": "https://reddit.com/r/college/comments/abc/ai_rules", "source": "Reddit Deep: r/college",
                                                         "title": "Every class has a different AI rule", "kind": "article"}, "Every class has a different AI rule. " * 2)
    doc = "Stakeholder interview notes: advisors want one view of every student's co-op deadlines and AI use. " * 4
    page(root, "uploads/u1.md", {"url": "upload://x", "source": "client upload", "title": "Advisor interview", "kind": "upload"}, doc)
    page(root, "articles/client-uploads/u1-copy.md", {"url": "upload://y", "source": "client upload", "title": "Advisor interview", "kind": "upload"}, doc)
    page(root, "articles/nxt-insight/i1.md", {"url": "nxt://insight/1", "source": "nxt-insight", "title": "Insight: students want one rule"},
         "Students want one AI rule across courses, a model wrote this synthesis from the research. " * 3)
    page(root, "synthesis/lint-2026-05-26.md", {"title": "lint report"}, "lint " * 50)
    page(root, "engagements/e1.md", {"title": "engagement memory"}, "state " * 50)
    page(root, "articles/bloomberg/b1.md", {"url": "https://bloomberg.example/x", "source": "Bloomberg", "title": "Bloomberg - Are you a robot?"},
         "Are you a robot? Please verify you are human.")
    page(root, "articles/gemini/g1.md", {"url": "https://vertexaisearch.cloud.google.com/grounding/abc", "source": "gemini", "title": "nursing.example"},
         "Final URL: https://nursing.example/staffing-study\n\nA model summary of a nurse staffing study. " * 2)
    page(root, "articles/campus-weekly/alias.md", {"alias_of": "articles/campus-weekly/a1.md", "title": "alias"}, "")
    return root


def fake_vec(text):
    words = ["rule", "ai", "student", "class", "advisor", "nurse", "staffing", "faculty", "syllabus", "deadline", "model", "robot"]
    t = text.lower()
    return [float(t.count(w)) + 0.01 for w in words]


def test_the_chunker_keeps_sections_and_sentences_whole():
    text = "# Methods\n\n" + ("We surveyed students at three colleges about AI. " * 50) + "\n\n## Findings\n\nMost students asked for one rule."
    parts = chunking.chunk(text)
    assert all(p["text"].strip()[-1] in ".!?" or p["text"].startswith(("#", "Most")) for p in parts[:-1])
    assert parts[0]["text"].startswith("# Methods") and parts[-1]["section"] == "Findings"
    assert any("We surveyed" in p["text"] for p in parts[1:])               # a long paragraph is split, never mid-word
    assert all(len(p["text"]) <= chunking.MAX_CHARS + 200 for p in parts)


def test_a_date_written_as_midnight_utc_keeps_its_day():
    assert currency.parse_date("Wed, 04 Nov 2026 00:00:00 GMT") == "2026-11-04"
    assert currency.parse_date("2026-11-09T00:00:00+00:00") == "2026-11-09"
    assert currency.parse_date("Tue, 06/02/2026 - 11:13") == "2026-06-02"
    assert currency.parse_date("2026/10/05") == "2026-10-05"


def test_the_import_labels_cleans_and_collapses_duplicates(wiki):
    recs, skipped = hicmigrate.scan(wiki)
    kinds = {r["path"]: r["kind"] for r in recs}
    assert kinds["social-intelligence/s1.md"] == "reddit" and kinds["articles/reddit-deep-r-college/s1b.md"] == "reddit"
    assert kinds["articles/nxt-insight/i1.md"] == "analysis" and kinds["uploads/u1.md"] == "document"
    assert kinds["articles/gemini/g1.md"] == "analysis"                      # a model summary until the page is read again
    assert "synthesis/lint-2026-05-26.md" not in kinds and "engagements/e1.md" not in kinds and "articles/campus-weekly/alias.md" not in kinds
    a1 = next(r for r in recs if r["path"] == "articles/campus-weekly/a1.md")
    assert a1["date"] == "2026-11-04" and a1["publisher"] == "Campus Weekly" and "cut at 10,000 characters" in a1["flags"]
    assert a1["url"] == "https://campusweekly.example/ai-rules"                 # the link without its tracking parameter
    assert "bot wall or error page" in next(r for r in recs if r["path"] == "articles/bloomberg/b1.md")["flags"]
    win = hicmigrate.dedupe(recs)
    paths = {w["path"] for w in win}
    assert "social-intelligence/s1.md" in paths and "articles/reddit-deep-r-college/s1b.md" not in paths     # one Reddit post
    assert sum(1 for w in win if w["kind"] == "document") == 1                                             # one document
    g = next(w for w in win if w["path"] == "articles/gemini/g1.md")
    assert g["url"] == "https://nursing.example/staffing-study"


def test_pages_are_stored_whole_cut_into_passages_and_searched(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    got = hicmigrate.run(phases=("import", "embed"), root=wiki)
    assert got["import"]["added"] == 6 and got["embed"]["embedded"] > 0          # 9 readable pages, 3 duplicates or copies
    c = store.conn()
    text = c.execute("SELECT e.text FROM evidence e JOIN library_meta m ON m.evidence_id = e.id WHERE m.wiki_path = 'articles/campus-weekly/a1.md'").fetchone()[0]
    assert "Source: [" not in text and not text.startswith("# Colleges")                # the repeated lines are gone
    hits = librarysearch.search("faculty syllabus AI rule", k=5)
    assert hits and hits[0]["title"] == "Colleges rewrite AI rules" and hits[0]["pointer"].startswith("lib/articles/campus-weekly/a1.md#c")
    assert all(h["kind"] != "analysis" for h in hits)                                   # model-written pages are not evidence
    assert librarysearch.passage(hits[0]["pointer"])["text"]
    again = hicmigrate.run(phases=("import",), root=wiki)
    assert again["import"]["added"] == 0 and again["import"]["unchanged"] == 6          # running again changes nothing


def test_restoring_replaces_cut_text_only_with_the_same_document(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    hicmigrate.run(phases=("import",), root=wiki)
    full = ART * 6 + "Student leaders asked for one shared template."

    def read(url, deep=True):
        if "campusweekly" in url:
            return {"ok": True, "text": full, "via": "page", "url": url, "title": "Colleges rewrite AI rules"}
        if "nursing.example" in url:
            return {"ok": True, "text": "Nurse staffing study. " * 80, "via": "linked PDF", "url": "https://nursing.example/study.pdf",
                    "title": "Nurse staffing study"}
        return {"ok": False, "reason": "the site showed a bot check"}
    counts = hicmigrate.restore(workers=2, read=read)
    assert counts["restored"] == 2 and counts["failed"] >= 1
    c = store.conn()
    m = dict(c.execute("SELECT * FROM library_meta WHERE wiki_path = 'articles/campus-weekly/a1.md'").fetchone())
    assert json.loads(m["restored"])["status"] == "restored" and "cut at 10,000 characters" not in m["flags"]
    assert "shared template" in c.execute("SELECT text FROM evidence WHERE id = ?", (m["evidence_id"],)).fetchone()[0]
    g = dict(c.execute("SELECT * FROM library_meta WHERE wiki_path = 'articles/gemini/g1.md'").fetchone())
    assert g["kind"] == "article" and g["document_url"] == "https://nursing.example/study.pdf"        # now a real source
    assert hicmigrate.restore(workers=2, read=read) == {"restored": 0, "kept": 0, "failed": 0}       # never fetched twice


def test_refused_and_redirected_articles_are_tried_again_once(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    hicmigrate.run(phases=("import",), root=wiki)
    first = {"campusweekly": {"ok": False, "status": 403, "reason": "the site answered 403"},
             "nursing.example": {"ok": False, "status": 404, "reason": "the site answered 404"},
             "bloomberg": {"ok": False, "status": 403, "reason": "the site answered 403; in a browser: the site showed a bot check"}}
    pick = lambda url: next(v for k, v in first.items() if k in url)
    hicmigrate.restore(workers=2, read=lambda url, deep=True: dict(pick(url), url=url))
    again = {r["url"] for r in hicmigrate.retry_candidates()}
    assert again == {"https://campusweekly.example/ai-rules"}          # not the missing page, not the page a browser already tried
    full = ART * 6 + "Student leaders asked for one shared template."
    counts = hicmigrate.restore(
        workers=2, rows=hicmigrate.retry_candidates(),
        read=lambda url, deep=True: {"ok": True, "text": full, "via": "page", "url": url, "title": "Colleges rewrite AI rules",
                                     "rendered": True, "clicked": ["Accept all"]})
    assert counts["restored"] == 1
    rec = json.loads(store.conn().execute("SELECT restored FROM library_meta WHERE wiki_path = 'articles/campus-weekly/a1.md'").fetchone()[0])
    assert rec["status"] == "restored" and rec["rendered"] and rec["gate"]
    assert hicmigrate.retry_candidates() == []


def test_home_pages_are_never_replaced_and_engagement_ids_read_as_titles(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    eid = store.create_engagement("Grocery automation 90 days", "o")
    page(wiki, "articles/vertical-farm/v1.md", {"url": "https://www.verticalfarm.example/", "source": "Vertical Farm Daily",
                                                "title": "Vertical Farm Daily", "engagement": eid},
         "Vertical farms in the Netherlands added lettuce lines this autumn as growers cut heating costs. " * 4)
    hicmigrate.run(phases=("import",), root=wiki)
    c = store.conn()
    m = dict(c.execute("SELECT * FROM library_meta WHERE wiki_path = 'articles/vertical-farm/v1.md'").fetchone())
    assert json.loads(m["projects"]) == ["Grocery automation 90 days"]
    asked = []
    hicmigrate.restore(workers=1, read=lambda url, deep=True: asked.append(url) or {"ok": False, "reason": "x"})
    assert "https://www.verticalfarm.example/" not in asked                    # a home page is never read again
    rec = c.execute("SELECT status, reason FROM library_restore WHERE url = 'https://www.verticalfarm.example/'").fetchone()
    assert rec["status"] == "kept" and "home page" in rec["reason"]
    c.execute("UPDATE library_meta SET projects = ? WHERE evidence_id = ?", (json.dumps(["Eng " + eid[4:]]), m["evidence_id"]))
    assert hicmigrate.tidy()["projects_named"] == 1                            # rows written before the fix are named too
    assert json.loads(c.execute("SELECT projects FROM library_meta WHERE evidence_id = ?", (m["evidence_id"],)).fetchone()[0]) == ["Grocery automation 90 days"]


def test_a_reddit_post_saved_as_an_article_is_a_reddit_post_and_never_read_as_a_page(wiki, monkeypatch):
    page(wiki, "articles/ins-reddit-insurance/r1.md", {"url": "https://www.reddit.com/r/Insurance/comments/1abc/claims_took_months/",
                                                       "source": "Reddit r/Insurance", "title": "Claims took months"},
         "My claim took four months and nobody at the agency called back once. " * 4)
    recs, _ = hicmigrate.scan(wiki)
    assert next(r for r in recs if r["path"] == "articles/ins-reddit-insurance/r1.md")["kind"] == "reddit"
    hicmigrate.run(phases=("import",), root=wiki)
    c = store.conn()
    ev = c.execute("SELECT evidence_id FROM library_meta WHERE wiki_path = 'articles/ins-reddit-insurance/r1.md'").fetchone()[0]
    c.execute("UPDATE library_meta SET kind = 'article', publisher = 'reddit.com' WHERE evidence_id = ?", (ev,))   # as the first import filed it
    assert hicmigrate.tidy()["reddit_posts_refiled"] == 1
    m = dict(c.execute("SELECT * FROM library_meta WHERE evidence_id = ?", (ev,)).fetchone())
    assert m["kind"] == "reddit" and m["publisher"] == "Reddit r/Insurance" and m["subreddit"] == "Insurance"
    asked = []
    hicmigrate.restore_one(ev, dict(m, kind="article"), read=lambda url, deep=True: asked.append(url) or {"ok": False})
    assert asked == []


def test_a_video_hic_kept_as_a_description_is_transcribed_and_its_passages_open_the_video(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    page(wiki, "articles/yt-retail/v1.md", {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "source": "yt-retail",
                                            "title": "How retailers use AI assistants"},
         "How retailers use AI assistants (12min, 4,000 views)")
    hicmigrate.run(phases=("import",), root=wiki)
    c = store.conn()
    m = dict(c.execute("SELECT * FROM library_meta WHERE wiki_path = 'articles/yt-retail/v1.md'").fetchone())
    assert m["kind"] == "video" and "not transcribed yet" in m["flags"]
    assert [r["url"] for r in hicmigrate.video_candidates()] == ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]
    assert all("youtube" not in r["url"] for r in hicmigrate.restore_candidates())      # never read as a web page
    text = "Transcript of How retailers use AI assistants (Retail Weekly, YouTube, 2026-11-20).\n\n" + "\n\n".join(
        f"[{i:02d}:00] Retail staff said the AI assistant answered order questions while a person handled refunds, minute {i}. " * 3
        for i in range(12))
    fake = lambda url, whisper="always": {"ok": True, "url": url, "title": "How retailers use AI assistants", "channel": "Retail Weekly",
                                          "date": "2026-11-20", "duration": 720.0, "text": text, "method": "Whisper large-v3 (test)"}
    assert hicmigrate.transcribe_one(m["evidence_id"], m, transcript=fake) == "restored"
    m = dict(c.execute("SELECT * FROM library_meta WHERE evidence_id = ?", (m["evidence_id"],)).fetchone())
    assert m["kind"] == "video" and m["publisher"] == "YouTube: Retail Weekly" and "not transcribed yet" not in m["flags"]
    assert json.loads(m["restored"])["method"] == "Whisper large-v3 (test)" and hicmigrate.video_candidates() == []
    assert hicmigrate.whisper_candidates() == []                           # already heard by Whisper: no upgrade pending
    hicmigrate.run(phases=("embed",), root=wiki)
    hits = [h for h in librarysearch.search("AI assistant refunds order questions", k=10) if h["kind"] == "video"]
    assert hits and hits[0]["moment"].startswith("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=")
    assert libraryview.item(m["evidence_id"])["kind_label"] == "Video"


def test_the_library_shows_kind_and_provenance_and_adds_with_passages(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    hicmigrate.run(phases=("import", "embed"), root=wiki)
    res = libraryview.search(limit=50)
    kinds = {f["value"] for f in res["facets"]["kind"]}
    assert {"article", "reddit", "document", "analysis"} <= kinds
    assert {f["value"] for f in res["facets"]["collection"]} == {"HiC library"}
    only = libraryview.search(kind="reddit")
    assert only["items"] and all(i["kind"] == "reddit" for i in only["items"])
    art = next(i for i in res["items"] if i["title"] == "Colleges rewrite AI rules")
    it = libraryview.item(art["id"])
    assert it["kind_label"] == "Article" and it["projects"] and it["wiki_path"] == "articles/campus-weekly/a1.md"
    eid = store.create_engagement("Course AI rules", "o")
    got = libraryview.add([art["id"]], eid)
    assert got["added"] == ["S1"]
    m = secondbrain._map(eid)["S1"]
    assert m["wiki_path"].startswith("lib/") and m["chunks"] and m["chunks"][0]["pointer"].startswith("lib/articles/campus-weekly/a1.md#c")


def test_the_chat_recalls_from_the_library_first(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    hicmigrate.run(phases=("import", "embed"), root=wiki)

    def no_hic(*a, **k):
        raise AssertionError("HiC was asked although the Library answered")
    monkeypatch.setattr(secondbrain, "_hic_recall", no_hic)
    got = secondbrain.recall("which AI rule applies in each class", k=3)
    assert got and got[0]["via"] == "the Library" and got[0]["pointer"].startswith("lib/")


def test_captions_come_first_and_whisper_upgrades_them_one_at_a_time(wiki, monkeypatch):
    monkeypatch.setattr(librarysearch, "embed", lambda texts, query=False: [fake_vec(t) for t in texts])
    page(wiki, "articles/yt-retail/v2.md", {"url": "https://www.youtube.com/watch?v=aaaaaaaaaaa", "source": "yt-retail",
                                            "title": "Store staff and AI"}, "Store staff and AI (8min)")
    hicmigrate.run(phases=("import",), root=wiki)
    c = store.conn()
    m = dict(c.execute("SELECT * FROM library_meta WHERE wiki_path = 'articles/yt-retail/v2.md'").fetchone())
    said = "[00:00] " + "Store staff said the assistant handled stock questions so they could help shoppers on the floor. " * 8
    from ia_next import youtube
    monkeypatch.setattr(youtube, "transcript", lambda url, whisper="never", whisper_limit=0: {
        "ok": True, "url": url, "title": "Store staff and AI", "channel": "Retail Weekly", "date": "2026-11-12", "duration": 480.0,
        "text": "Transcript of Store staff and AI.\n\n" + (said.lower() if whisper == "never" else said),
        "method": "the video's published captions" if whisper == "never" else "Whisper large-v3 (test)"})
    assert hicmigrate.transcribe_videos(whisper="never", pause=0)["restored"] == 1
    assert [r["evidence_id"] for r in hicmigrate.whisper_candidates()] == [m["evidence_id"]]
    assert hicmigrate.transcribe_videos(whisper="always", upgrade=True, pause=0)["restored"] == 1
    text = c.execute("SELECT text FROM evidence WHERE id = ?", (m["evidence_id"],)).fetchone()[0]
    assert "Store staff said" in text and hicmigrate.whisper_candidates() == []


def test_a_refusal_from_youtube_stops_the_video_pass_and_keeps_the_videos_queued(wiki, monkeypatch):
    for n in ("v3", "v4"):
        page(wiki, f"articles/yt-retail/{n}.md", {"url": f"https://www.youtube.com/watch?v={n * 5}x", "source": "yt-retail",
                                                  "title": f"Video {n}"}, f"Video {n} (5min)")
    hicmigrate.run(phases=("import",), root=wiki)
    asked = []
    from ia_next import youtube
    monkeypatch.setattr(youtube, "transcript", lambda url, whisper="never", whisper_limit=0: asked.append(url) or {
        "ok": False, "refused": True, "reason": youtube.REFUSED})
    got = hicmigrate.transcribe_videos(pause=0)
    assert len(asked) == 1 and got["left"] == len(hicmigrate.video_candidates())     # stopped at the first refusal
    assert store.conn().execute("SELECT count(*) FROM library_restore WHERE via = 'video transcript'").fetchone()[0] == 0
