"""Offline tests for the Deck Composer and the Media Producer: no network, no model calls."""
import base64
import hashlib
import io
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, control, deck, media, providers, store  # noqa: E402

from pptx import Presentation  # noqa: E402
from pptx.enum.shapes import MSO_SHAPE_TYPE  # noqa: E402


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


REAL = "Search firms are divided on whether AI can assess finalist candidates."
SOURCES = [
    {"id": "S1", "title": "Firm report", "url": "https://example.com/firms",
     "text": f"Intro text. {REAL} Retained search firms use AI to prepare shortlists for partners."},
    {"id": "S2", "title": "Partner survey", "url": "https://example.org/survey",
     "text": "Partners said clients still expect a human judgment on every finalist they meet."},
]
FINDINGS = [
    {"claim": "Firms disagree on AI in finalist assessment", "quote": REAL, "source_id": "S1", "claim_type": "SUPPORTED_FACT"},
    {"claim": "Clients expect human judgment", "quote": "clients still expect a human judgment on every finalist they meet",
     "source_id": "S2", "claim_type": "SUPPORTED_FACT"},
]


def _slide(layout, title, points=None, quote="", source_id="", cites=None, notes="Say the point plainly."):
    return {"layout": layout, "title": title, "points": points if points is not None else ["Firms prepare shortlists with AI", "Partners still judge finalists"],
            "quote": quote, "source_id": source_id, "cites": cites if cites is not None else ["S1"], "notes": notes}


def _good_slides():
    return [
        _slide("title", "Search firms split on letting AI judge finalists"),
        _slide("bullets", "Firms already use AI to prepare candidate shortlists", quote=REAL, source_id="S1"),
        _slide("quote", "Partners disagree on whether AI can assess finalists", quote=REAL, source_id="S1"),
        _slide("two-column", "Clients want human judgment on every finalist they meet",
               points=["Firms automate sourcing", "Firms automate shortlists", "Partners judge finalists", "Clients expect that judgment"],
               cites=["S1", "S2"]),
        _slide("bullets", "Shortlist automation frees partner time for client meetings"),
        _slide("closing", "The firm must decide where AI stops in assessment"),
    ]


# ---- deck: the verbatim quote check -----------------------------------------------------------------
def test_deck_quote_check_drops_a_fabricated_quote():
    slides = deck.normalize([
        _slide("quote", "Partners disagree on whether AI can assess finalists", quote="Partners hate every AI tool they have tried.", source_id="S1"),
        _slide("bullets", "Firms already use AI to prepare candidate shortlists", quote=REAL, source_id="S1"),
        _slide("bullets", "Clients want human judgment on every finalist", quote=REAL, source_id="S9"),
    ], SOURCES)
    out, dropped = deck.check_quotes(slides, SOURCES)
    assert dropped == 2                                      # fabricated text, and a real quote cited to an unknown source
    assert out[0]["quote"] == "" and out[0]["layout"] == "bullets"   # a quote slide without its quote becomes bullets
    assert out[1]["quote"] == REAL and out[1]["source_id"] == "S1"
    assert out[2]["quote"] == "" and out[2]["source_id"] == ""


# ---- deck: titles -----------------------------------------------------------------------------------
def test_title_rule_rejects_digits_length_labels_and_slop():
    assert deck.title_problems("Firms already use AI to prepare candidate shortlists") == []
    assert any("digit" in p for p in deck.title_problems("Firms cut screening time by 40 percent"))
    long_title = "Search firms that adopt AI for sourcing and shortlisting still keep partners in every finalist decision"
    assert any("words" in p for p in deck.title_problems(long_title))
    assert any("topic label" in p for p in deck.title_problems("Key Findings"))
    assert any("banned phrase" in p for p in deck.title_problems("AI is a game-changer for search firms everywhere"))


def test_failing_titles_are_rewritten_once_and_still_failing_slides_are_dropped(monkeypatch):
    slides = deck.normalize(_good_slides() + [
        _slide("bullets", "Firms cut screening time by 40 percent in 2026"),
        _slide("bullets", "Search firms that adopt AI for sourcing and shortlisting still keep partners in every decision"),
    ], SOURCES)
    seen = []

    def fake(model, system, messages, ledger, **kw):
        seen.append(messages[0]["content"])
        assert kw["json_schema"] is deck.TITLE_FIX_SCHEMA
        return json.dumps({"titles": [
            {"index": 6, "title": "Firms screen candidates faster with AI shortlists"},
            {"index": 7, "title": "Search firms that adopt AI for sourcing and shortlisting still keep partners deciding"},
        ]}), None, None

    monkeypatch.setattr(providers, "claude", fake)
    out, rewritten, dropped = deck.fix_titles(slides, providers.Ledger(limit_usd=1.0))
    titles = [s["title"] for s in out]
    assert len(seen) == 1 and rewritten == 2 and dropped == 1
    assert "Firms screen candidates faster with AI shortlists" in titles
    assert all(not deck.title_problems(t) for t in titles)


# ---- deck: the native PowerPoint --------------------------------------------------------------------
def test_written_pptx_reopens_with_right_count_and_only_text_and_shapes(tmp_path):
    slides, _ = deck.check_quotes(deck.normalize(_good_slides(), SOURCES), SOURCES)
    path = str(tmp_path / "deck.pptx")
    deck.write_pptx(slides, SOURCES, path, "Search firms and AI", kicker="Executive search")
    assert deck.verify_pptx(path, [s["title"] for s in slides]) == []
    prs = Presentation(path)
    assert len(prs.slides) == len(slides)
    assert abs(prs.slide_width / prs.slide_height - 16 / 9) < 0.01
    for i, s in enumerate(prs.slides):
        assert s.shapes.title.text_frame.text == slides[i]["title"]           # real, editable title text
        for sh in s.shapes:
            assert sh.shape_type in (MSO_SHAPE_TYPE.AUTO_SHAPE, MSO_SHAPE_TYPE.TEXT_BOX, MSO_SHAPE_TYPE.PLACEHOLDER)
        assert not s._element.xpath(".//p:pic")
        assert "Sources:" in s.notes_slide.notes_text_frame.text
    assert "https://example.com/firms" in prs.slides[1].notes_slide.notes_text_frame.text
    fonts = {r.font.name for s in prs.slides for sh in s.shapes if sh.has_text_frame for p in sh.text_frame.paragraphs for r in p.runs}
    assert {"Saira Condensed", "Archivo"} <= fonts


def test_pptx_check_catches_a_picture_and_a_wrong_count(tmp_path):
    from PIL import Image
    from pptx.util import Inches
    slides, _ = deck.check_quotes(deck.normalize(_good_slides(), SOURCES), SOURCES)
    path = str(tmp_path / "deck.pptx")
    deck.write_pptx(slides, SOURCES, path, "t")
    png = io.BytesIO()
    Image.new("RGB", (8, 8), (13, 13, 13)).save(png, "PNG")
    png.seek(0)
    prs = Presentation(path)
    prs.slides[2].shapes.add_picture(png, Inches(1), Inches(1))
    prs.save(path)
    problems = deck.verify_pptx(path, [s["title"] for s in slides] + ["one more"])
    assert any("picture" in p for p in problems) and any("composed" in p for p in problems)


def test_deck_html_escapes_text():
    slides = deck.normalize([_slide("bullets", "<script>alert(1)</script> wins the shortlist", points=["<img src=x onerror=1>", "b"])], SOURCES)
    page = deck.render_html("<b>t</b>", slides, SOURCES)
    assert "<script>alert" not in page and "<img src=x" not in page and "&lt;script&gt;" in page


def _write_research(eid):
    for name, data in (("findings.json", {"findings": FINDINGS}), ("sources.json", {"sources": SOURCES})):
        with open(store.safe_path(eid, f"results/{name}"), "w", encoding="utf-8") as fh:
            json.dump(data, fh)


def test_deck_task_end_to_end_with_a_fake_model(monkeypatch):
    eid = store.create_engagement("Executive search", "How should search firms use AI in assessment?")
    _write_research(eid)
    raw = _good_slides()
    raw[2]["quote"] = "Partners hate every AI tool they have tried."           # fabricated: dropped
    raw.insert(5, _slide("bullets", "Firms cut screening time by 40 percent"))   # digit: rewritten
    raw[1]["points"] = ["Firms prepare shortlists with AI [S1]", "Partners \u2014 not software \u2014 judge finalists"]

    def fake(model, system, messages, ledger, **kw):
        if kw["json_schema"] is deck.DECK_SCHEMA:
            assert model == config.SEATS["artifact"]["primary"] and "<source id=\"S1\"" in messages[0]["content"]
            return json.dumps({"deck_title": "Search firms and AI", "slides": raw}), None, None
        return json.dumps({"titles": [{"index": 5, "title": "Firms screen candidates faster with AI shortlists"}]}), None, None

    monkeypatch.setattr(providers, "claude", fake)
    tid, _ = store.create_task(eid, "deck", {"audience": "managing partners"}, 1.0)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert t["nodes"][0]["state"] == "available" and t["nodes"][0]["result_path"].endswith("deck.pptx")
    assert t["result_path"].endswith("deck.html")
    data = json.load(open(store.safe_path(eid, "results/deck.json"), encoding="utf-8"))
    assert data["dropped_quotes_not_in_source"] == 1 and data["titles_rewritten"] == 1 and len(data["slides"]) == 7
    text = json.dumps(data, ensure_ascii=False) + open(t["result_path"], encoding="utf-8").read()
    assert "\u2014" not in text and "[S1]" not in data["slides"][1]["points"][0]
    assert len(Presentation(t["nodes"][0]["result_path"]).slides) == 7


def test_deck_task_without_research_fails_clearly():
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "deck", {"audience": "a"}, 1.0)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "failed" and "no finished research" in t["error"] and t["nodes"][0]["state"] == "failed"


def test_start_deck_tool_validates_and_is_idempotent(monkeypatch):
    started = []
    monkeypatch.setattr(deck, "start_deck_task", lambda *a: (started.append(a) or ("task_x", len(started) == 1)))
    assert "no such engagement" in deck.execute("start_deck", {"engagement_id": "eng_nope", "audience": "a"})["error"]
    eid = store.create_engagement("e", "o")
    out = deck.execute("start_deck", {"engagement_id": eid, "audience": "partners"})
    assert out["task_id"] == "task_x" and started[0][2] == deck.DECK_BUDGET_USD
    assert started[0][3] == hashlib.sha256(json.dumps({"audience": "partners", "engagement_id": eid}, sort_keys=True).encode()).hexdigest()
    assert deck.TOOLS[0]["strict"] and deck.TOOLS[0]["input_schema"]["required"] == ["engagement_id", "audience"]


# ---- media: video needs approval, images run directly -----------------------------------------------
def _no_network(*a, **k):
    raise AssertionError("the network was called")


def test_video_without_approval_is_pending_and_never_calls_the_network(monkeypatch):
    monkeypatch.setattr(media.httpx, "post", _no_network)
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    eid = store.create_engagement("e", "o")
    args = {"engagement_id": eid, "prompt": "A recruiter reviews a shortlist at a desk", "seconds": 5}
    out = media.execute("generate_video", args)
    assert out["approval"] == "pending" and out["generated"] is False and out["approval_id"]
    assert control.status_for("generate_video", args) == "pending"
    again = media.execute("generate_video", args)                 # asking again does not open a second approval
    assert again["approval_id"] == out["approval_id"] and len(control.pending()) == 1
    assert not os.path.isdir(store.safe_path(eid, "results/videos"))


def test_denied_video_returns_a_refusal(monkeypatch):
    monkeypatch.setattr(media.httpx, "post", _no_network)
    eid = store.create_engagement("e", "o")
    args = {"engagement_id": eid, "prompt": "A recruiter reviews a shortlist at a desk", "seconds": 5}
    first = media.execute("generate_video", args)
    control.decide(first["approval_id"], False)
    out = media.execute("generate_video", args)
    assert out == {"approval": "denied", "generated": False, "message": "the person denied this; do not try another way"}


def test_video_seconds_out_of_range_asks_nothing(monkeypatch):
    monkeypatch.setattr(media.httpx, "post", _no_network)
    eid = store.create_engagement("e", "o")
    out = media.execute("generate_video", {"engagement_id": eid, "prompt": "p", "seconds": 30})
    assert "seconds" in out["error"] and control.pending() == []


class _Resp:
    def __init__(self, status, payload):
        self.status_code, self._p = status, payload

    def json(self):
        return self._p


def test_approved_video_runs_once_and_mirrors_the_interactions_request(monkeypatch):
    calls = []
    clip = b"\x00\x00\x00\x18ftypmp42fake-mp4-bytes"

    def fake_post(url, json=None, timeout=None, headers=None):
        calls.append((url, json, headers))
        return _Resp(200, {"status": "completed", "steps": [
            {"type": "model_output", "content": [{"type": "text", "text": "done"},
                                                 {"type": "video", "mime_type": "video/mp4", "data": base64.b64encode(clip).decode()}]}]})

    monkeypatch.setattr(media.httpx, "post", fake_post)
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    eid = store.create_engagement("e", "o")
    args = {"engagement_id": eid, "prompt": "A recruiter reviews a shortlist at a desk", "seconds": 4}
    control.decide(media.execute("generate_video", args)["approval_id"], True)
    out = media.execute("generate_video", args)
    assert out["generated"] and not out["reused"] and out["video"].startswith("results/videos/vid_")
    assert out["view"] == f"/api/engagements/{eid}/files/{out['video']}"
    assert abs(out["spent_usd"] - 0.40) < 1e-9
    url, body, headers = calls[0]
    assert url == "https://generativelanguage.googleapis.com/v1beta/interactions" and headers["x-goog-api-key"] == "test-key"
    assert body["model"] == "gemini-omni-1.2-flash" and body["background"] is False and body["store"] is False
    assert body["response_format"] == {"type": "video", "aspect_ratio": "16:9", "resolution": "360p", "duration": "4s"}
    assert "No on-screen text" in body["input"]
    with open(store.safe_path(eid, out["video"]), "rb") as fh:
        assert fh.read() == clip
    repeat = media.execute("generate_video", args)                # the approval covers one clip; no second charge
    assert repeat["reused"] and repeat["video"] == out["video"] and len(calls) == 1


def test_video_reply_without_inline_data_fails(monkeypatch):
    monkeypatch.setattr(media.httpx, "post", lambda *a, **k: _Resp(200, {"status": "failed", "steps": []}))
    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    eid = store.create_engagement("e", "o")
    with pytest.raises(providers.ProviderError, match="returned no video"):
        media.generate_video(eid, "p", 3, providers.Ledger(limit_usd=1.0))


def test_image_runs_directly_asks_for_no_text_and_saves_a_png(monkeypatch):
    seen = {}
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32

    def fake_image(model, prompt, ledger=None, size="1536x1024"):
        seen.update(model=model, prompt=prompt, limit=ledger.limit_usd)
        u = providers.Usage(model, extra_usd=0.10)
        ledger.add(u)
        return png, u

    monkeypatch.setattr(providers, "openai_image", fake_image)
    monkeypatch.setattr(media.httpx, "post", _no_network)
    eid = store.create_engagement("e", "o")
    out = media.execute("generate_image", {"engagement_id": eid, "prompt": "A recruiter at a desk reviewing a shortlist"})
    assert seen["model"] == "gpt-image-2.6-flare" and seen["limit"] == 0.5
    assert "No text anywhere in the image" in seen["prompt"] and "documentary photography" in seen["prompt"]
    assert out["image"].startswith("results/images/img_") and out["image"].endswith(".png")
    assert out["view"] == f"/api/engagements/{eid}/files/{out['image']}" and control.pending() == []
    with open(store.safe_path(eid, out["image"]), "rb") as fh:
        assert fh.read() == png


def test_media_tools_are_strict_and_validate_the_engagement():
    assert [t["name"] for t in media.TOOLS] == ["generate_image", "generate_video"] and all(t["strict"] for t in media.TOOLS)
    assert "no such engagement" in media.execute("generate_image", {"engagement_id": "eng_nope", "prompt": "p"})["error"]
