"""An approved video is followed to its end and survives a restart; an incomplete recording is refused with the reason
(owner, 25 Nov: "the video pipeline never runs", "the transcriber hasn't run either")."""
import json
import os
import time

import pytest
from fastapi.testclient import TestClient

from ia_next import app as appmod, control, media, store, videotranscript


@pytest.fixture()
def db(tmp_path, monkeypatch):
    store.reset_for_tests(str(tmp_path / "t.db"))
    media._INFLIGHT.clear()
    return TestClient(appmod.app)


def _approved(eid):
    args = {"engagement_id": eid, "prompt": "a forklift crosses a warehouse aisle", "seconds": 5, "sound": "a motor hum"}
    a = control.request("spend", "generate_video", args, "why")
    control.decide(a["id"], True)
    return a["id"], args


def test_an_approved_clip_records_how_it_ended_and_its_card_can_ask(db):
    eid = store.create_engagement("Freight", "o")
    aid, args = _approved(eid)
    assert media.video_state(aid)["state"] == "interrupted"                   # approved, nothing running, nothing made
    seen = {}

    def run(tool, a):
        seen["during"] = (media.video_state(aid)["state"], db.get("/api/busy").json())
        raise RuntimeError("the video engine returned a clip without sound; it was not saved")
    out = media.run_approved(aid, args, run)
    assert seen["during"][0] == "working" and seen["during"][1]["busy"] and seen["during"][1]["media"][0]["approval"] == aid
    assert out["generated"] is False and not db.get("/api/busy").json()["busy"]
    st = db.get(f"/api/approvals/{aid}/video").json()
    assert st["state"] == "failed" and "without sound" in st["error"]
    assert media.recover(start=False) == []                                   # a clip that failed is not made again unasked


def test_a_clip_cut_off_by_a_restart_is_made_again(db):
    eid = store.create_engagement("Freight", "o")
    aid, args = _approved(eid)
    assert media.recover(start=False) == [aid]

    def run(tool, a):
        rel = "results/videos/vid_" + control.call_hash("generate_video", a)[:12] + ".mp4"
        p = store.safe_path(eid, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(b"clip")
        return {"generated": True, "video": rel, "view": "/v"}
    media.run_approved(aid, args, run)
    assert db.get(f"/api/approvals/{aid}/video").json()["state"] == "ready"
    assert media.recover(start=False) == []


def test_a_recording_that_did_not_arrive_whole_is_refused_with_the_reason(tmp_path):
    atom = lambda kind, body: (len(body) + 8).to_bytes(4, "big") + kind + body
    whole = tmp_path / "ok.mov"
    whole.write_bytes(atom(b"ftyp", b"qt  " + bytes(8)) + atom(b"mdat", bytes(64)) + atom(b"moov", bytes(32)))
    assert videotranscript.container_problem(str(whole)) == ""
    cut = tmp_path / "cut.mov"                                               # the sound-and-picture block states more than the file holds
    cut.write_bytes(atom(b"ftyp", b"qt  " + bytes(8)) + (900_000_000).to_bytes(4, "big") + b"mdat" + bytes(5000))
    said = videotranscript.container_problem(str(cut))
    assert "incomplete" in said and "900 MB" in said and "upload it again" in said
    bare = tmp_path / "bare.mp4"                                             # every block whole, the index never written
    bare.write_bytes(atom(b"ftyp", b"isom" + bytes(8)) + atom(b"mdat", bytes(64)))
    assert "the part that describes the recording is missing" in videotranscript.container_problem(str(bare))
    other = tmp_path / "x.webm"
    other.write_bytes(bytes([0x1A, 0x45, 0xDF, 0xA3]) + bytes(60))
    assert videotranscript.container_problem(str(other)) == ""               # other formats are left to the decoder
