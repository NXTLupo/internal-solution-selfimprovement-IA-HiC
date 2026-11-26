"""An attached recording is a request of its conversation (owner, 25 Nov, E14 and E15): its transcript is tied to the
conversation it was attached in, and a question about it is answered from the records in plain words, for any number of
recordings. The transcript is never described as other work standing in the person's way."""
import time

import pytest
from fastapi.testclient import TestClient

from ia_next import agent, app as appmod, store, videotranscript


@pytest.fixture()
def db(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.db"))
    return TestClient(appmod.app)


def _task(eid, cid, title, status, summary="", error="", note=""):
    tid, _ = store.create_task(eid, "video_transcript", {"title": title, "upload_path": "/x"}, 0.0)
    store.link_task(cid, tid)
    store.update_task(tid, status=status, **({"summary": summary} if summary else {}), **({"error": error} if error else {}))
    return tid


def test_an_upload_ties_its_transcript_to_the_conversation_it_was_attached_in(db, monkeypatch, tmp_path):
    eid = store.create_engagement("Interviews", "o")
    cid = db.post("/api/conversations").json()["id"]
    monkeypatch.setattr(videotranscript, "model_ready", lambda: True)
    monkeypatch.setattr(videotranscript, "container_problem", lambda p: "")
    started = {}

    def start(e, brief, idem_key=None):
        tid, _ = store.create_task(e, "video_transcript", brief, 0.0)
        started[tid] = brief
        return tid, True
    monkeypatch.setattr(videotranscript, "start", start)
    for name in ("interview one.mov", "interview two.mp4", "interview three.mov"):       # any number of recordings
        r = db.post(f"/api/engagements/{eid}/uploads", files={"file": (name, b"0" * 64, "video/quicktime")}, data={"title": name, "conversation": cid})
        assert r.status_code == 200 and r.json()["kind"] == "video_transcript" and r.json()["title"] == name
    assert sorted(store.conversation_task_ids(cid)) == sorted(started)
    assert len(started) == 3


def test_a_question_about_attached_recordings_is_answered_from_their_records(db):
    eid = store.create_engagement("Interviews", "o")
    cid = "conv_x"
    _task(eid, cid, "interview one.mov", "done",
          summary="Transcript ready: interview one.mov (23:56), 284 segments in 17 paragraphs, by Whisper; stored as S7 with 12 manifest chunks")
    _task(eid, cid, "interview two.mov", "running")
    _task(eid, cid, "interview three.mov", "failed",
          error="InvalidDataError: [Errno 1094995529] Invalid data found when processing input: '/data/x.MOV'")
    said = agent.recordings_reply(cid, "transcribe the attached video files")
    assert '"interview one.mov" is transcribed (23:56 of sound) and stored in this engagement as S7' in said
    assert '"interview two.mov" is in line' in said
    assert '"interview three.mov" was not transcribed: the file could not be read as a recording' in said
    assert "Invalid data found" not in said and "Errno" not in said and "studio is still working" not in said
    assert "Ask me about them here" in said
    assert agent.recordings_reply(cid, "have you transcribed the video I uploaded yet?")
    # an order for work made from a transcript is not a question about the transcription
    assert agent.recordings_reply(cid, "make a study guide from the transcription of the interview") == ""
    assert agent.recordings_reply(cid, "what are the themes in AI this week") == ""
    assert agent.recordings_reply(cid, "transcribe https://www.youtube.com/watch?v=abc") == ""
    assert agent.recordings_reply("conv_other", "transcribe the attached video") == ""    # another conversation's work is not this one's


def test_a_failed_transcript_is_explained_in_words_a_person_can_act_on():
    assert "incomplete" in agent.plain_failure("This file is incomplete: it holds 9.1 MB of a recording of about 198 MB, so it cannot be played.")
    assert "attach it again" in agent.plain_failure("interrupted by a restart; start it again")
    assert agent.plain_failure("no speech was found in the recording") == "no speech was found in the recording"


def test_the_busy_line_names_a_running_transcript_by_its_recording(db):
    eid = store.create_engagement("Interviews", "o")
    tid = _task(eid, "c", "interview two.mov", "running")
    said = agent.desk_reply([store.get_task(tid)], "make a deck on clinic staffing")
    assert 'a transcript of "interview two.mov"' in said
