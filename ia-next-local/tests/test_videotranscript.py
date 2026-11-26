"""Video transcription (owner 22 Nov: YouTube links and uploaded videos, the local equivalent of the standalone tool's
Whisper, chunked into the second brain with manifest pointers, transcripts to download)."""
import json
import os

from ia_next import store, videotranscript as vt

SEGS = [{"start": 0.0, "end": 4.2, "text": "Students open the assistant before the syllabus."},
        {"start": 4.2, "end": 40.0, "text": "Most of them ask it to explain a reading."},
        {"start": 40.0, "end": 80.5, "text": "Few of them check what it says against the source."},
        {"start": 80.5, "end": 130.0, "text": "Faculty rarely say what is allowed."},
        {"start": 130.0, "end": 3725.0, "text": "That gap is where the risk sits."}]


def test_youtube_links_of_every_shape_are_recognised():
    for u in ("https://www.youtube.com/watch?v=jNQXAC9IVRw", "https://youtu.be/jNQXAC9IVRw?t=3", "youtube.com/shorts/jNQXAC9IVRw",
              "https://m.youtube.com/watch?feature=share&v=jNQXAC9IVRw", "https://www.youtube.com/live/jNQXAC9IVRw"):
        assert vt.youtube_id(u) == "jNQXAC9IVRw", u
    assert vt.youtube_id("https://example.com/video.mp4") == ""


def test_times_are_written_for_people_and_for_subtitles():
    assert vt.stamp(65) == "01:05" and vt.stamp(3725) == "01:02:05"
    assert vt.stamp(3725.25, srt=True) == "01:02:05,250" and vt.stamp(5.5, vtt=True) == "00:00:05.500"


def test_segments_become_minute_paragraphs_broken_at_sentences():
    paras = vt.paragraphs(SEGS)
    assert len(paras) >= 2 and paras[0]["start"] == 0.0 and paras[-1]["end"] == 3725.0
    assert all(p["text"].rstrip().endswith(".") for p in paras)
    assert " ".join(p["text"] for p in paras) == " ".join(s["text"] for s in SEGS)


def test_each_manifest_chunk_gets_the_times_it_covers_and_a_link_to_that_moment():
    chunks = [{"pointer": "articles/ia-next/abc.md#c1", "text": "Transcript of X.\n\n[00:00] Students open ... [01:20] Faculty"},
              {"pointer": "articles/ia-next/abc.md#c2", "text": "rarely say what is allowed."},
              {"pointer": "articles/ia-next/abc.md#c3", "text": "[1:02:00] That gap is where the risk sits."}]
    rows = vt.chunk_times(chunks, 3725, "jNQXAC9IVRw")
    assert [r["start"] for r in rows] == [0, 0, 3720] and rows[0]["end"] == 0 and rows[-1]["end"] == 3725
    assert rows[2]["link"].endswith("&t=3720s") and rows[1]["pointer"].endswith("#c2")


def test_the_transcript_files_and_the_page_with_its_download_links(tmp_path):
    meta = {"title": "How students use AI", "channel": "Campus Voices", "webpage_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
            "upload_date": "20261101", "youtube_id": "jNQXAC9IVRw", "published": "2026-11-01"}
    info = {"language": "en", "duration": 3725.0, "model": "Whisper large-v3 (faster-whisper, int8, on this machine)"}
    paras = vt.paragraphs(SEGS)
    got = vt.files(str(tmp_path), meta, SEGS, paras, info)
    assert set(got) == {"transcript.txt", "transcript.srt", "transcript.vtt", "transcript.md", "segments.json"}
    txt = open(got["transcript.txt"], encoding="utf-8").read()
    assert txt.startswith("How students use AI") and "Channel: Campus Voices" and "[00:00] Students open" in txt
    srt = open(got["transcript.srt"], encoding="utf-8").read()
    assert srt.startswith("1\n00:00:00,000 --> 00:00:04,200\nStudents open")
    assert open(got["transcript.vtt"], encoding="utf-8").read().startswith("WEBVTT")
    assert json.load(open(got["segments.json"], encoding="utf-8"))["segments"][0]["text"].startswith("Students")
    text = vt.source_text(meta, paras)
    assert text.startswith("Transcript of How students use AI (Campus Voices, YouTube, 2026-11-01).") and "\n\n[00:00] " in text
    chunks = vt.chunk_times([{"pointer": "articles/x.md#c1", "text": text}], 3725, "jNQXAC9IVRw")
    html_ = vt.page("eng_1", "task_1", meta, info, paras, chunks, "S12", "1 manifest chunks")
    for f in ("transcript.txt", "transcript.md", "transcript.srt", "transcript.vtt", "segments.json"):
        assert f"/api/engagements/eng_1/files/results/tasks/task_1/{f}" in html_
    assert "articles/x.md#c1" in html_ and "watch?v=jNQXAC9IVRw&amp;t=0s" in html_ and "S12" in html_
    slides = vt.slides(meta, info, paras)
    assert slides.count('<section class="stage">') >= 2 and "…" not in slides


def test_the_chat_tool_needs_a_link_and_the_weights():
    eid = store.create_engagement("Video test", "Transcribe a video")
    assert "link" in vt.execute("transcribe_video", {"engagement_id": eid, "url": "please transcribe it"})["error"]
    if not vt.model_ready():
        assert "weights" in vt.execute("transcribe_video", {"engagement_id": eid, "url": "https://youtu.be/jNQXAC9IVRw"})["error"]


def test_the_agent_offers_the_tool_and_a_hashtag_names_it():
    from ia_next import agent, plan
    assert "transcribe_video" in {t["name"] for t in agent.TOOLS}
    assert agent.hashtag_tool("Transcribe this #transcribe https://youtu.be/jNQXAC9IVRw")[1] == "transcribe_video"
    assert "transcribe_video" in plan.KINDS and any("Whisper" in s[1] for s in plan.KINDS["transcribe_video"][1])


def test_a_source_keeps_its_address_and_attribution():
    from ia_next import transcripts
    eid = store.create_engagement("Video source", "x")
    sid = transcripts.add_text_source(eid, "How students use AI", "Transcript of How students use AI.\n\n[00:00] Words here and more words.",
                                      "transcript", origin="video:youtube:jNQXAC9IVRw", url="https://www.youtube.com/watch?v=jNQXAC9IVRw",
                                      extra={"publisher": "YouTube: Campus Voices", "date": "2026-11-01", "id": "ignored"})
    row = next(u for u in transcripts.uploaded_sources(eid) if u["id"] == sid)
    assert row["url"].endswith("jNQXAC9IVRw") and row["publisher"] == "YouTube: Campus Voices" and row["id"] == sid


def test_a_link_with_a_question_mark_does_not_make_a_request_a_question():
    from ia_next import plan
    assert not plan.is_question("Please transcribe this talk and keep it in the second brain: https://www.youtube.com/watch?v=UF8uR6Z6KLc")
    assert plan.is_question("What did the speaker say about failure?")


def test_word_timings_become_subtitle_lines_cut_at_sentences():
    class W:
        def __init__(self, s, e, w):
            self.start, self.end, self.word = s, e, w
    words = [W(0.0, 0.4, " Students"), W(0.4, 0.8, " open"), W(0.8, 1.2, " the"), W(1.2, 1.9, " assistant."),
             W(2.0, 2.3, " Most"), W(2.3, 2.6, " ask")] + [W(2.6 + i * 0.5, 3.0 + i * 0.5, " more") for i in range(14)]
    got = vt.cues(words)
    assert got[0] == {"start": 0.0, "end": 1.9, "text": "Students open the assistant."}
    assert all(c["end"] - c["start"] <= vt.CUE_SECONDS + 0.5 for c in got) and len(got) >= 3
    assert " ".join(c["text"] for c in got) == "".join(w.word for w in words).strip()

