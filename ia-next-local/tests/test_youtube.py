"""YouTube in deep research (26 Nov): a video is read as its transcript (published captions, else Whisper on this
machine when there is time), found by search inside the run's period, kept by research runs, and stored in the Library
as a Video whose passages open the video at the minute they cover. Nothing here reaches YouTube or a model."""
import pytest

from ia_next import material, pagetext, providers, store, studio, videotranscript as vt, youtube

VID = "dQw4w9WgXcQ"
URL = f"https://www.youtube.com/watch?v={VID}"
SEGS = [{"start": 0.0, "end": 4.0, "text": "Retailers are moving customer service to AI assistants this year."},
        {"start": 4.0, "end": 9.0, "text": "Shoppers say they still want a person when an order goes wrong."},
        {"start": 80.0, "end": 86.0, "text": "The stores that kept a human escalation path saw fewer complaints."}]
META = {"id": VID, "title": "How retailers use AI assistants", "channel": "Retail Weekly", "upload_date": "20261120", "duration": 300}


def test_a_video_is_read_from_its_published_captions(monkeypatch):
    monkeypatch.setattr(vt, "probe", lambda url: dict(META))
    monkeypatch.setattr(vt, "captions", lambda vid: list(SEGS))
    monkeypatch.setattr(vt, "fetch", lambda *a: pytest.fail("the sound is not fetched when captions exist"))
    t = youtube.transcript(f"https://youtu.be/{VID}")
    assert t["ok"] and t["url"] == URL and t["method"] == "the video's published captions"
    assert t["title"] == "How retailers use AI assistants" and t["channel"] == "Retail Weekly" and t["date"] == "2026-11-20"
    assert t["text"].startswith("Transcript of How retailers use AI assistants (Retail Weekly, YouTube, 2026-11-20)")
    assert "\n\n[00:00] Retailers are moving" in t["text"] and "fewer complaints" in t["text"]       # timestamped paragraphs


def test_a_short_video_without_captions_is_transcribed_on_this_machine(monkeypatch, tmp_path):
    monkeypatch.setattr(vt, "probe", lambda url: dict(META))
    monkeypatch.setattr(vt, "model_ready", lambda: True)
    audio = tmp_path / "source.m4a"
    audio.write_bytes(b"x" * 2000)
    monkeypatch.setattr(vt, "fetch", lambda url, folder: (str(audio), dict(META)))
    monkeypatch.setattr(vt, "transcribe", lambda path, on_progress=None: (list(SEGS), {"model": "Whisper large-v3 (test)", "duration": 86}))
    t = youtube.transcript(URL, whisper="auto")
    assert t["ok"] and t["method"] == "Whisper large-v3 (test)" and "fewer complaints" in t["text"]


def test_a_long_video_without_captions_is_not_transcribed_inside_a_run(monkeypatch):
    monkeypatch.setattr(vt, "probe", lambda url: dict(META, duration=3600))
    monkeypatch.setattr(vt, "fetch", lambda *a: pytest.fail("a run does not spend an hour of processor on one video"))
    t = youtube.transcript(URL, whisper="auto")
    assert not t["ok"] and "no published captions" in t["reason"] and "too long" in t["reason"]


def test_the_page_reader_reads_a_youtube_address_as_its_transcript(monkeypatch):
    monkeypatch.setattr(vt, "probe", lambda url: dict(META))
    monkeypatch.setattr(vt, "captions", lambda vid: list(SEGS))
    got = pagetext.read(f"https://m.youtube.com/watch?v={VID}&feature=share")
    assert got["ok"] and got["via"] == "video transcript" and got["kind"] == "video" and got["url"] == URL
    assert got["sitename"] == "YouTube" and got["author"] == "Retail Weekly" and "human escalation" in got["text"]


def test_search_keeps_videos_inside_the_period_that_have_a_transcript(monkeypatch):
    entries = [{"id": "a" * 11, "title": "Retail AI assistants and customer service", "channel": "Retail Weekly", "duration": 400},
               {"id": "b" * 11, "title": "AI assistants in stores: what shoppers want", "channel": "Store Talk", "duration": 900},
               {"id": "c" * 11, "title": "Retail AI in 30 seconds", "channel": "Shorts", "duration": 30},
               {"id": "d" * 11, "title": "Customer service AI for retailers, explained", "channel": "Old News", "duration": 600}]
    dates = {"a" * 11: "20261118", "b" * 11: "20261110", "d" * 11: "20250101"}
    monkeypatch.setattr(youtube, "_search_entries", lambda q, n: [dict(e) for e in entries])
    monkeypatch.setattr(vt, "probe", lambda url: dict(META, id=vt.youtube_id(url), upload_date=dates.get(vt.youtube_id(url), "")))
    monkeypatch.setattr(vt, "captions", lambda vid: list(SEGS) * 3 if vid == "a" * 11 else [])
    window = {"since": "2026-11-01", "until": "2026-11-30", "label": "November 2026"}
    vids, report = youtube.search("retail AI assistants", window, limit=3, objective="AI assistants in retail customer service",
                                  scores=lambda goal, texts: [0.8 for _ in texts])
    assert [v["video_id"] for v in vids] == ["a" * 11]                  # b has no captions, c is a short, d is older
    assert report["too_short_or_long"] == 1 and report["older"] == 1 and report["no_transcript"] == 1 and report["kept"] == 1


def test_youtube_in_the_request_is_a_requested_source():
    want = material.requested("What are YouTube creators saying about AI shopping assistants?")
    assert "youtube" in want and material.describe(want) == "YouTube"
    assert "youtube" in material.requested("x", declared=["youtube"])
    assert "youtube" not in material.requested("Make a video script about AI shopping")


def test_web_search_keeps_youtube_videos_but_not_the_rest_of_youtube():
    from ia_next import localsearch
    assert localsearch._video("https://www.youtube.com/watch?v=" + VID)
    assert not localsearch._video("https://www.youtube.com/@RetailWeekly")


def test_a_research_run_keeps_youtube_videos_as_transcripts(monkeypatch):
    raw = {"candidates": [{"groundingMetadata": {"groundingChunks": [{"web": {"uri": "https://www.retaildive.com/ai", "title": "retaildive.com"}}]}}]}
    monkeypatch.setattr(providers, "gemini_generate", lambda *a, **k: ("summary", None, raw))
    monkeypatch.setattr(studio, "_fetch", lambda uri: ("Retailers are adding AI assistants to customer service. " * 20, uri, "AI in retail service"))
    monkeypatch.setattr("ia_next.secondbrain.reuse", lambda *a, **k: [])
    monkeypatch.setattr("ia_next.secondbrain.archive_all", lambda *a, **k: {})
    monkeypatch.setattr("ia_next.secondbrain.known", lambda *a, **k: False)
    asked = {}

    def fake_search(query, window=None, limit=3, objective="", known=(), say=None, whisper_limit=0, scores=None):
        asked.update(limit=limit, whisper_limit=whisper_limit)
        return [{"url": URL, "video_id": VID, "title": META["title"], "channel": "Retail Weekly", "date": "2026-11-20", "duration": 300.0,
                 "text": "Transcript of How retailers use AI assistants.\n\n[00:00] " + "Shoppers want a person when an order fails. " * 20,
                 "method": "the video's published captions"}], {"found": 1, "kept": 1}
    monkeypatch.setattr(youtube, "search", fake_search)
    monkeypatch.setattr("ia_next.hic.pick_packs", lambda *a, **k: [])
    eid = store.create_engagement("Retail AI service", "o")
    brief = {"goal": "What YouTube creators say about AI assistants in retail customer service", "scope": "", "audience": "leadership",
             "window": {"since": "", "until": "", "label": "any time"}}
    _, summary, sources = studio.research_lead(eid, brief, providers.Ledger(limit_usd=1.0))
    vid = next(s for s in sources if s["url"] == URL)
    assert vid["title"] == "YouTube: Retail Weekly: How retailers use AI assistants" and vid["publisher"] == "YouTube: Retail Weekly"
    assert vid["date"] == "2026-11-20" and "[00:00]" in vid["text"]
    assert asked == {"limit": studio.MAX_YOUTUBE_ASKED, "whisper_limit": youtube.QUICK_WHISPER}      # asked for: more, and short ones transcribed
    assert "1 YouTube video read as transcripts" in summary


def test_every_selected_pack_searches_youtube_in_its_industry(monkeypatch):
    asked = []

    def fake_search(query, window=None, limit=3, objective="", known=(), say=None, whisper_limit=0, scores=None):
        asked.append((query, limit))
        vid = {"retail AI shopping assistants": "r" * 11, "healthcare AI shopping assistants": "h" * 11}.get(query, "g" * 11)
        return [{"url": f"https://www.youtube.com/watch?v={vid}", "video_id": vid, "title": query, "channel": "C", "date": "",
                 "duration": 300.0, "text": "x" * 500, "method": "captions"}], {"kept": 1}
    monkeypatch.setattr(youtube, "search", fake_search)
    vids, reports = youtube.search_packs(["retail", "healthcare"], "AI shopping assistants", per_pack=3, general=2,
                                         names={"retail": "Retail & Commerce", "healthcare": "Healthcare & Life Sciences"})
    assert sorted(asked) == sorted([("AI shopping assistants", 2), ("retail AI shopping assistants", 3),
                                    ("healthcare AI shopping assistants", 3)])
    assert {v["pack"] for v in vids} == {"general", "retail", "healthcare"} and set(reports) == {"general", "retail", "healthcare"}
    assert youtube.pack_query("higher_ed", "Higher Ed", "students AI coursework") == "higher education students AI coursework"
    assert youtube.pack_query("social_listening", "Social Listening", "brand trust") == "brand trust"


def test_youtube_page_reads_pause_when_youtube_asks_to_sign_in(monkeypatch):
    youtube._PROBED.clear()
    youtube._COOL["until"] = 0
    calls = []

    def probe(url):
        calls.append(url)
        raise RuntimeError("ERROR: [youtube] x: Sign in to confirm you're not a bot.")
    monkeypatch.setattr(vt, "probe", probe)
    assert youtube._probe(URL) == {} and youtube._probe("https://www.youtube.com/watch?v=bbbbbbbbbbb") == {}
    assert len(calls) == 1                                                 # the second read waits out the pause
    youtube._COOL["until"] = 0


def test_a_refusal_from_youtube_pauses_every_youtube_read(monkeypatch):
    calls = []

    def blocked(vid):
        calls.append(vid)
        vt.CAPTIONS_ERROR["name"] = "IpBlocked"
        return []
    monkeypatch.setattr(vt, "captions", blocked)
    monkeypatch.setattr(vt, "probe", lambda url: dict(META))
    t = youtube.transcript(URL)
    assert not t["ok"] and t["refused"] and "refusing" in t["reason"] and youtube.refusing()
    assert youtube.transcript("https://www.youtube.com/watch?v=bbbbbbbbbbb")["refused"] and len(calls) == 1
    vids, report = youtube.search("retail AI", None, limit=2)
    assert vids == [] and "refusing" in report["error"]
    youtube._COOL.update(until=0, blocked_until=0)
