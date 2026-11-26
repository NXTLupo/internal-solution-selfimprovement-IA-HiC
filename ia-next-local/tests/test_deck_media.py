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


import base64 as _b64
PNG = _b64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')


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


def _studio_slide(layout, title, **kw):
    base = {"layout": layout, "kicker": "", "title": title, "subtitle": "", "takeaway": "Partners should decide where AI stops.",
            "points": [], "cards": [], "table": {"columns": [], "rows": []}, "steps": [],
            "arch": {"sources": [], "layer": {"name": "", "items": []}, "views": []},
            "quote": "", "source_id": "", "cites": ["S1"], "image_prompt": "", "notes": "Say the point plainly."}
    base.update(kw)
    return base


def test_deck_task_end_to_end_with_a_fake_model(monkeypatch):
    """The Deck Studio: outline honoured, typed native layouts, pointers stripped, fabricated quote dropped, a bad title
    repaired (never dropped), photos only in photo panels, every output under results/decks/<task id>/."""
    from ia_next import deckstudio
    eid = store.create_engagement("Executive search", "How should search firms use AI in assessment?")
    _write_research(eid)
    raw = [
        _studio_slide("cover", "Search firms split on letting AI judge finalists", subtitle="Clients pay for partner judgment.",
                      takeaway="", image_prompt="partners reviewing a shortlist at a table"),
        _studio_slide("cards", "Firms already use AI to prepare candidate shortlists", kicker="problem statement",
                      subtitle="Sourcing tools draft the long list; partners still judge who reaches the client.",
                      image_prompt="a recruiter's desk with a printed shortlist and a laptop",
                      cards=[{"heading": "Sourcing is automated", "body": "Firms prepare shortlists with AI [articles/client-uploads/x.md#c0]."},
                             {"heading": "Judgment is not", "body": "Partners \u2014 not software \u2014 judge finalists."}]),
        _studio_slide("table", "Firms cut screening time by 40 percent",
                      table={"columns": ["Stage", "AI role", "Partner role"],
                             "rows": [["Sourcing", "Builds the long list", "Approves it"], ["Assessment", "Summarises interviews", "Judges finalists"]]}),
        _studio_slide("quote", "Partners disagree on whether AI can assess finalists", quote="Partners hate every AI tool they have tried.",
                      source_id="S1", points=["Clients expect human judgment."]),
        _studio_slide("architecture", "One shared record feeds every partner view",
                      arch={"sources": [{"name": "Applicant tracker", "detail": "candidates"}, {"name": "Interview notes", "detail": "assessments"}],
                            "layer": {"name": "Shared candidate record", "items": ["Deduplicated profiles"]},
                            "views": [{"name": "Partner shortlist", "detail": "finalists"}]}),
    ]
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        if kw["json_schema"] in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG):
            seen["msg"] = messages[0]["content"]
            assert model == config.SEATS["artifact"]["primary"] and "<source id=\"S1\"" in messages[0]["content"]
            return json.dumps({"deck_title": "Search firms and AI", "answer": "AI prepares, partners judge.", "slides": raw}), None, None
        return json.dumps({"titles": [{"index": 2, "title": "Firms screen candidates faster with AI shortlists"}]}), None, None

    photos = []
    monkeypatch.setattr(providers, "claude", fake)
    monkeypatch.setattr(providers, "openai_image", lambda model, prompt, ledger=None, size="1536x1024": (photos.append(prompt) or (PNG, None)))
    tid, _ = store.create_task(eid, "deck", {"audience": "managing partners", "outline": ["Problem", "Roles table", "Tension", "Data flow"]}, 3.0)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert "OUTLINE (one slide per item" in seen["msg"] and "4. Data flow" in seen["msg"]
    assert t["result_path"].endswith(f"results/decks/{tid}/deck.html") and t["nodes"][0]["result_path"].endswith(f"decks/{tid}/deck.pptx")
    data = json.load(open(store.safe_path(eid, f"results/decks/{tid}/deck.json"), encoding="utf-8"))
    assert [s["layout"] for s in data["slides"]] == ["cover", "cards", "table", "bullets", "architecture"]   # quote slide lost its fabricated quote
    assert data["dropped_quotes_not_in_source"] == 1 and data["titles_rewritten"] == 1 and len(data["slides"]) == 5
    assert data["slides"][2]["title"] == "Firms screen candidates faster with AI shortlists" and data["images"] == 2 and len(photos) == 2
    assert "technical line illustration" in photos[1] and "technical line illustration" not in photos[0]   # cover photo, then the illustration
    assert all("No text anywhere" in p for p in photos)
    text = json.dumps(data, ensure_ascii=False) + open(t["result_path"], encoding="utf-8").read()
    assert "\u2014" not in text and ".md#c0" not in text and data["slides"][1]["kicker"] == "PROBLEM STATEMENT"
    prs = Presentation(t["nodes"][0]["result_path"])
    assert len(prs.slides) == 5
    pics = [sh for sl in prs.slides for sh in sl.shapes if sh.shape_type == 13]
    assert len(pics) == 2 and {p.name for p in pics} == {"Photo"}
    assert any(sh.has_table for sh in prs.slides[2].shapes)
    cover = prs.slides[0]           # the title is the first shape and nothing full-slide is drawn over it
    assert list(cover.shapes)[0] == cover.shapes.title and cover.shapes.title.text_frame.text.startswith("Search firms")
    assert not [sh for sh in cover.shapes if sh.width >= prs.slide_width * 0.95 and sh.height >= prs.slide_height * 0.95]
    assert any(sh.name == "Subtitle" for sh in prs.slides[1].shapes)


def test_deck_label_and_layers_fallback():
    from ia_next import deckstudio
    assert deckstudio.label({"title": "01_Advancement_Farmers_Demo_Product_Brief.txt"}) == "Advancement Farmers Demo Product Brief"
    s = deckstudio.normalize([{"layout": "layers", "title": "t", "layers": [{"label": "Only one", "body": "b"}]}], [])
    assert s[0]["layout"] == "bullets"          # a stack needs three bands; too few falls back rather than render empty


def test_deck_task_without_research_fails_clearly():
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "deck", {"audience": "a"}, 1.0)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    # the message names every kind of evidence, so the agent collects what was asked for (18 Nov: "run a research
    # report first" made it swap the person's Reddit listening for web news)
    assert t["status"] == "failed" and "no evidence yet" in t["error"] and "start_social_analysis" in t["error"]
    assert t["nodes"][0]["state"] == "failed"


def test_start_deck_tool_validates_and_is_idempotent(monkeypatch):
    started = []
    monkeypatch.setattr(deck, "start_deck_task", lambda *a: (started.append(a) or ("task_x", len(started) == 1)))
    assert "no such engagement" in deck.execute("start_deck", {"engagement_id": "eng_nope", "audience": "a"})["error"]
    eid = store.create_engagement("e", "o")
    out = deck.execute("start_deck", {"engagement_id": eid, "audience": "partners"})
    assert out["task_id"] == "task_x" and started[0][2] == deck.DECK_BUDGET_USD
    assert started[0][3] == hashlib.sha256(json.dumps({"audience": "partners", "engagement_id": eid}, sort_keys=True).encode()).hexdigest()
    # non-strict since 17 Nov (source_ids and whole_engagement are optional; the strict grammar has a size limit)
    schema = deck.TOOLS[0]["input_schema"]
    assert deck.TOOLS[0]["strict"] is False and schema["required"] == ["engagement_id", "audience", "outline", "brand"]
    assert {"source_ids", "whole_engagement"} <= set(schema["properties"]) and schema["additionalProperties"] is False
    assert started[0][6] == []                                     # no files named: the whole engagement
    assert "outline must be a list" in deck.execute("start_deck", {"engagement_id": eid, "audience": "p", "outline": "x"})["error"]


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


def test_deck_renders_in_the_nu_brand_and_restores_nxt(tmp_path):
    """16 Nov audit: "#nu" produced an NXT deck. A deck rendered in the NU brand uses Lato and NU red with white text
    on the accent band, and the NXT palette is back afterwards."""
    import zipfile
    from ia_next import deckstudio
    slides = deckstudio.normalize([_studio_slide("cover", "Annual Giving needs one governed cohort workflow"),
                                   _studio_slide("bullets", "Teams lose a week to manual joins", points=["Excel joins every Monday"])], [])
    out = str(tmp_path / "nu.pptx")
    with deck.use_brand("nu"):
        deckstudio.write_pptx(slides, [], out, "NU deck", "NU deck")
    xml = "".join(zipfile.ZipFile(out).read(n).decode("utf-8", "ignore") for n in zipfile.ZipFile(out).namelist() if n.startswith("ppt/slides/slide"))
    assert 'typeface="Lato"' in xml and "C8102E" in xml
    assert "Saira Condensed" not in xml and 'typeface="Archivo"' not in xml
    assert deck.ACCENT == "B8B800" and deck.BODY_FONT == "Archivo" and deck.ON_ACCENT == deck.RAIL


# ---- brand system parity with HiC (plan Part 7: BR1 to BR5) ---------------------------------------------
HIC_TOKENS = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                          "humans-in-control-research", "hic-workspace", "design-system", "figma-tokens.json")


def test_brands_come_from_the_hic_token_copy():
    """BR1: colours, faces and the logo vectors come from brand_tokens.json (HiC's design system), not hand values;
    when HiC's file is present the copy matches it."""
    nu, nxt = deck.BRANDS["nu"], deck.BRANDS["nxt"]
    assert (nu["ACCENT"], nu["RAIL"], nu["ON_ACCENT"], nu["DISPLAY_FONT"], nu["BODY_FONT"]) == ("C8102E", "0E1626", "FFFFFF", "Lato", "Lato")
    assert (nxt["ACCENT"], nxt["DISPLAY_FONT"], nxt["BODY_FONT"], nxt["ON_ACCENT"]) == ("B8B800", "Saira Condensed", "Archivo", "0D0D0D")
    assert nu["CYAN"] == "C8102E"                    # HiC's NU kicker is red
    assert deck.contrast(nu["KICKER_ON_DARK"], nu["RAIL"]) >= 4.5 and deck.contrast(nxt["KICKER_ON_DARK"], nxt["RAIL"]) >= 4.5
    assert nu["LOGO"]["light"] == "C8102E" and nu["LOGO"]["viewbox"] == [0, 0, 64, 53] and nxt["LOGO"]["viewbox"][2:] == [300, 86]
    assert nu["TITLE_PANOSE"] == deck.PANOSE_ARIAL and nxt["TITLE_PANOSE"] == deck.PANOSE_ARIAL_NARROW and nu["TITLE_WIDTH"] > nxt["TITLE_WIDTH"]
    assert deck.brand_id("NU") == "nu" and deck.brand_id("deciem") == "deciem" and deck.brand_id("other") == "nxt" and deck.brand_id(None) == "nxt"
    if os.path.isfile(HIC_TOKENS):
        hic = json.load(open(HIC_TOKENS, encoding="utf-8"))
        for ours, theirs in (("nu", "NU"), ("nxt", "NXT")):
            assert deck.BRANDS[ours]["ACCENT"] == hic[theirs]["color"]["accent"].lstrip("#").upper()
            assert deck.BRANDS[ours]["DISPLAY_FONT"] == hic[theirs]["font"]["display"]
        assert deck.BRANDS["nu"]["LOGO"]["paths"] == [hic["NU"]["logo"]["monogram_path"]]


def test_missing_token_file_falls_back_to_the_hand_palettes(tmp_path):
    b = deck.load_brands(str(tmp_path / "absent.json"))
    assert b["nu"]["ACCENT"] == "C8102E" and b["nxt"]["ACCENT"] == "B8B800" and b["nu"]["LOGO"] is None


def test_svg_path_flattening_handles_absolute_relative_and_curves():
    from ia_next import deckstudio
    sq = deckstudio.svg_contours("M0 0H10V10H0Z m20 0 l5 0 l0 5 z")
    assert sq[0] == [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)] and sq[1] == [(20.0, 0.0), (25.0, 0.0), (25.0, 5.0)]
    curve = deckstudio.svg_contours("M0 0C0 10 10 10 10 0Z", steps=4)[0]
    assert len(curve) == 5 and curve[-1] == (10.0, 0.0) and max(y for _, y in curve) == pytest.approx(7.5)
    assert deckstudio.svg_contours("M1e1 0L2.5e1 0L2.5e1 1e1Z")[0][1] == (25.0, 0.0)
    nu = deckstudio.svg_contours(deck.BRANDS["nu"]["LOGO"]["paths"][0])
    assert nu and all(0 <= x <= 64 and 0 <= y <= 53 for c in nu for x, y in c)


def test_every_slide_carries_the_brand_mark_as_an_editable_vector(tmp_path):
    """BR2: the brand's own mark on the cover and every slide, as a native freeform (never a picture), red for NU and
    ink or paper for the NXT wordmark; the file check accepts it and the HTML preview shows the same vector."""
    from ia_next import deckstudio
    slides = deckstudio.normalize([_studio_slide("cover", "Annual Giving needs one governed cohort workflow"),
                                   _studio_slide("bullets", "Teams lose a week to manual joins", points=["Excel joins every Monday"]),
                                   _studio_slide("closing", "Approve the cohort pilot this term", points=["Name an owner"])], SOURCES)
    for brand, light, dark in (("nu", "C8102E", "C8102E"), ("nxt", "141414", "FFFFFF")):
        out = str(tmp_path / f"{brand}.pptx")
        with deck.use_brand(brand):
            deckstudio.write_pptx(slides, SOURCES, out, "Deck", "Deck")
            assert deckstudio.verify_pptx(out, [s["title"] for s in slides]) == []
            page = deckstudio.render_html("Deck", slides, SOURCES, "Deck")
        prs = Presentation(out)
        marks = [[sh for sh in sl.shapes if sh.name == "Brand mark"] for sl in prs.slides]
        assert all(len(m) == 1 and m[0].shape_type == MSO_SHAPE_TYPE.FREEFORM for m in marks)
        assert [str(m[0].fill.fore_color.rgb) for m in marks] == [dark, light, dark]
        cover_mark, body_mark = marks[0][0], marks[1][0]
        assert cover_mark.left < prs.slide_width / 2 and body_mark.left > prs.slide_width * 0.8 and body_mark.top < 914400 * 0.65
        assert page.count('class="mark"') == 3 and ("Northeastern University" in page) == (brand == "nu")
    assert deck.LOGO is deck.BRANDS["nxt"]["LOGO"]


def test_a_stray_freeform_still_fails_the_file_check(tmp_path):
    from ia_next import deckstudio
    slides = deckstudio.normalize([_studio_slide("bullets", "Teams lose a week to manual joins", points=["Excel joins"])], SOURCES)
    out = str(tmp_path / "d.pptx")
    deckstudio.write_pptx(slides, SOURCES, out, "Deck", "Deck")
    prs = Presentation(out)
    fb = prs.slides[0].shapes.build_freeform(0, 0, scale=1000)
    fb.add_line_segments([(100, 0), (100, 100)], close=True)
    fb.convert_to_shape().name = "Doodle"
    prs.save(out)
    assert any("FREEFORM" in p for p in deckstudio.verify_pptx(out, [slides[0]["title"]]))


def _finished_deck(monkeypatch, brand="nxt"):
    eid = store.create_engagement("Advancement", "Where do alumni drop off?")
    _write_research(eid)
    raw = [_studio_slide("cover", "Alumni drop off where no team owns the handoff", subtitle="One owner per stage.", takeaway=""),
           _studio_slide("cards", "Each stage needs one named owner", cards=[{"heading": "Events", "body": "No follow-up owner."},
                                                                             {"heading": "Giving", "body": "No shared record."}]),
           _studio_slide("quote", "Partners disagree on whether AI can assess finalists", quote=REAL, source_id="S1", cites=["S1", "S2"])]
    monkeypatch.setattr(providers, "claude", lambda model, system, messages, ledger, **kw:
                        (json.dumps({"deck_title": "Alumni handoffs", "answer": "Name owners.", "slides": raw}), None, None))
    monkeypatch.setattr(providers, "openai_image", lambda *a, **k: (PNG, None))
    tid, _ = store.create_task(eid, "deck", {"audience": "advancement leaders", "outline": [], "brand": brand}, 3.0)
    deck.run_deck_task(tid)
    assert store.get_task(tid)["status"] == "done", store.get_task(tid)["error"]
    return eid, tid


def _slide_xml(path):
    import zipfile
    z = zipfile.ZipFile(path)
    return "".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.startswith("ppt/slides/slide"))


def test_rebrand_rerenders_a_finished_deck_with_no_model_call(monkeypatch):
    """BR3: "make that deck Northeastern" re-renders the same slides in the NU brand: no model or image call, same
    titles, source lines and notes, the brief and deck record now say nu, and the tool reports zero spend."""
    from ia_next import deckstudio
    eid, tid = _finished_deck(monkeypatch)
    pptx = store.safe_path(eid, f"results/decks/{tid}/deck.pptx")
    before = deckstudio._footer_lines(pptx)
    titles = [sl.shapes.title.text_frame.text for sl in Presentation(pptx).slides]
    assert 'typeface="Archivo"' in _slide_xml(pptx)
    monkeypatch.setattr(providers, "claude", lambda *a, **k: pytest.fail("a model was called"))
    monkeypatch.setattr(providers, "openai_image", lambda *a, **k: pytest.fail("an image was made"))
    out = deck.execute("rebrand_deck", {"task_id": tid, "brand": "nu"})
    assert out["brand"] == "nu" and out["spent_usd"] == 0 and "Northeastern University brand" in out["message"]
    xml = _slide_xml(pptx)
    assert 'typeface="Lato"' in xml and "C8102E" in xml and 'typeface="Archivo"' not in xml
    assert [sl.shapes.title.text_frame.text for sl in Presentation(pptx).slides] == titles
    assert deckstudio._footer_lines(pptx) == before
    t = store.get_task(tid)
    assert t["brief"]["brand"] == "nu" and t["status"] == "done"
    assert json.load(open(store.safe_path(eid, f"results/decks/{tid}/deck.json"), encoding="utf-8"))["brand"] == "nu"
    assert "Northeastern University" in open(t["result_path"], encoding="utf-8").read()
    assert not os.path.exists(pptx + ".rebrand.pptx")
    back = deck.execute("rebrand_deck", {"task_id": tid, "brand": "nxt"})
    assert back["brand"] == "nxt" and 'typeface="Archivo"' in _slide_xml(pptx)


def test_rebrand_refuses_what_it_cannot_reproduce(monkeypatch):
    eid, tid = _finished_deck(monkeypatch)
    assert "no deck with that task id" in deck.execute("rebrand_deck", {"task_id": "task_nope", "brand": "nu"})["error"]
    other, _ = store.create_task(eid, "deck", {"audience": "a"}, 1.0)
    assert "only a finished deck" in deck.execute("rebrand_deck", {"task_id": other, "brand": "nu"})["error"]
    # a deck made before decks kept their own source copy, after the engagement's sources changed: refused, file untouched
    folder = store.safe_path(eid, f"results/decks/{tid}")
    os.remove(os.path.join(folder, "sources.json"))
    changed = [dict(SOURCES[0], title="A different report"), SOURCES[1]]
    with open(store.safe_path(eid, "results/sources.json"), "w", encoding="utf-8") as fh:
        json.dump({"sources": changed}, fh)
    pptx = os.path.join(folder, "deck.pptx")
    stamp = open(pptx, "rb").read()
    err = deck.execute("rebrand_deck", {"task_id": tid, "brand": "nu"})["error"]
    assert "sources changed" in err and open(pptx, "rb").read() == stamp and store.get_task(tid)["brief"]["brand"] == "nxt"
    # with the engagement's sources as they were, the same legacy deck re-renders and keeps a copy from then on
    _write_research(eid)
    assert deck.execute("rebrand_deck", {"task_id": tid, "brand": "nu"})["brand"] == "nu"
    assert os.path.isfile(os.path.join(folder, "sources.json"))


def test_brand_requests_reach_the_brand_field():
    """BR4: the tool says which words mean the NU brand and that the brand never goes in the audience text."""
    spec = {t["name"]: t for t in deck.TOOLS}
    d = spec["start_deck"]["description"]
    assert all(w in d for w in ("Northeastern", "NU", "#nu", "never in audience"))
    assert spec["rebrand_deck"]["strict"] and spec["rebrand_deck"]["input_schema"]["required"] == ["task_id", "brand"]
    assert spec["start_deck"]["input_schema"]["properties"]["brand"]["enum"] == ["deciem", "nu", "nxt"]


def test_card_and_step_text_is_fitted_to_its_box_by_the_brand_face():
    """17 Nov render: in the NU brand (real Lato) the flow slide's step text ran to the panel's bottom edge, because
    sizes were set from character counts tuned on a narrower substitute face. Text is now fitted to the box."""
    from ia_next import deckstudio
    body = "Filters a cohort, previews deduplicated count and completeness, exports if permitted, and drafts reviewed outreach."
    assert deckstudio._wrap_lines("one two three four", 9) == 3 and deckstudio._wrap_lines("one two three", 13) == 1
    assert deckstudio._wrap_lines("", 10) == 1
    with deck.use_brand("nu"):
        size = deckstudio._fit_box(body, 2.135, 1.55, 15)
        per_line = int((2.135 - 0.2) / (deck.BODY_WIDTH * size))
        assert size < 15 and deckstudio._wrap_lines(body, per_line) * size * 1.2 / 72 <= 1.45
    assert deckstudio._fit_box("Short.", 2.0, 1.5, 15) == 15


def test_closing_kicker_reads_on_its_panel_in_every_brand():
    for b in deck.BRANDS.values():
        assert deck.contrast(b["CLOSING_KICKER"], b["TEAL"]) >= 4.5
    assert deck.BRANDS["nu"]["CLOSING_KICKER"] != deck.BRANDS["nu"]["ACCENT"]     # red on navy does not read


# ---- revise one slide in place (plan Part 6) -------------------------------------------------------------
def test_revise_changes_only_the_named_slide_keeps_its_picture_and_the_previous_version(monkeypatch):
    """16 Nov audit: "change slide 3" rebuilt all nine slides and reworded untouched ones. One slide is rewritten; the
    others stay exactly as they were; a fabricated quote is still dropped; the cost lands on the deck task."""
    from ia_next import deckstudio
    eid, tid = _finished_deck(monkeypatch)
    folder = store.safe_path(eid, f"results/decks/{tid}")
    before = json.load(open(os.path.join(folder, "deck.json"), encoding="utf-8"))
    seen = {}

    def reviser(model, system, messages, ledger, **kw):
        if kw.get("json_schema") is deckstudio.REVISE_SCHEMA:
            seen["msg"] = messages[0]["content"]
            ledger.add(providers.Usage(model=model, input_tokens=5000, output_tokens=800))
            return json.dumps({"slide": _studio_slide(
                "table", "Each stage needs one named owner and a handoff date", kicker="owners",
                table={"columns": ["Stage", "Owner"], "rows": [["Events", "Alumni Relations"], ["Giving", "Annual Giving"]]},
                quote="Partners hate every AI tool they have tried.", source_id="S1")}), None, None
        raise AssertionError("only the revision call is expected")
    monkeypatch.setattr(providers, "claude", reviser)
    monkeypatch.setattr(providers, "openai_image", lambda *a, **k: pytest.fail("a new image was made"))
    out = deck.execute("revise_slide", {"task_id": tid, "slide_number": 2, "instruction": "Make slide 2 a table of owners"})
    assert "slide 2 revised" in out["message"] and out["spent_usd"] > 0, out
    assert "Make slide 2 a table of owners" in seen["msg"] and '"layout": "cards"' in seen["msg"]
    after = json.load(open(os.path.join(folder, "deck.json"), encoding="utf-8"))
    assert after["slides"][0] == before["slides"][0] and after["slides"][2] == before["slides"][2]
    s2 = after["slides"][1]
    assert s2["layout"] == "table" and s2["title"] == "Each stage needs one named owner and a handoff date"
    assert s2["quote"] == "" and after["revisions"][0]["dropped_quotes_not_in_source"] == 1      # not in its source
    assert s2["image"] == before["slides"][1]["image"]
    assert json.load(open(os.path.join(folder, "deck.v1.json"), encoding="utf-8")) == before
    prs = Presentation(os.path.join(folder, "deck.pptx"))
    assert len(prs.slides) == 3 and prs.slides[1].shapes.title.text_frame.text == s2["title"]
    assert any(sh.has_table for sh in prs.slides[1].shapes)
    t = store.get_task(tid)
    assert t["spent_usd"] > 0 and "slide 2 revised" in t["summary"] and t["status"] == "done"


def test_revise_refuses_what_it_cannot_do(monkeypatch):
    eid, tid = _finished_deck(monkeypatch)
    monkeypatch.setattr(providers, "claude", lambda *a, **k: pytest.fail("a model was called"))
    assert "slides 1 to 3" in deck.execute("revise_slide", {"task_id": tid, "slide_number": 9, "instruction": "x"})["error"]
    assert "say what to change" in deck.execute("revise_slide", {"task_id": tid, "slide_number": 2, "instruction": "  "})["error"]
    assert "no deck with that task id" in deck.execute("revise_slide", {"task_id": "task_nope", "slide_number": 1, "instruction": "x"})["error"]
    spec = next(t for t in deck.TOOLS if t["name"] == "revise_slide")
    assert spec["strict"] is False and spec["input_schema"]["required"] == ["task_id", "slide_number", "instruction"]


def test_deck_renders_in_the_deciem_brand(tmp_path):
    """Part 7 BR6: DECIEM from the token copy: Poppins Bold capitals (a font attribute, so the text and the file check
    are unchanged), Josefin Sans body, pink accent, no rail or dot mark, the typeset lockup on the cover."""
    import zipfile
    from ia_next import deckstudio
    b = deck.BRANDS["deciem"]
    assert (b["DISPLAY_FONT"], b["BODY_FONT"], b["ACCENT"], b["TITLE_CAPS"], b["CHROME_RAIL"]) == ("Poppins", "Josefin Sans", "FB48C4", True, False)
    assert b["LOCKUP"] == ["THE ABNORMAL BEAUTY COMPANY.", "DECIEM"] and b["LOGO"] is None
    slides = deckstudio.normalize([_studio_slide("cover", "Barrier repair leads the routine conversation"),
                                   _studio_slide("bullets", "Shoppers ask for fewer steps", points=["Two-step routines"])], SOURCES)
    out = str(tmp_path / "deciem.pptx")
    with deck.use_brand("deciem"):
        deckstudio.write_pptx(slides, SOURCES, out, "Deck", "Deck")
        assert deckstudio.verify_pptx(out, [s["title"] for s in slides]) == []
        page = deckstudio.render_html("Deck", slides, SOURCES, "Deck")
    prs = Presentation(out)
    names = [[sh.name for sh in sl.shapes] for sl in prs.slides]
    assert "Brand lockup" in names[0] and "Rail" not in names[1] and "Dot mark" not in names[1]
    xml = "".join(zipfile.ZipFile(out).read(n).decode("utf-8", "ignore") for n in zipfile.ZipFile(out).namelist() if n.startswith("ppt/slides/slide"))
    assert 'typeface="Poppins"' in xml and 'cap="all"' in xml and "FB48C4" in xml
    assert prs.slides[1].shapes.title.text_frame.text == "Shoppers ask for fewer steps"          # text unchanged
    assert "text-transform:uppercase" in page and "THE ABNORMAL BEAUTY COMPANY." in page and "border-left:0 solid" in page
    assert deck.ACCENT == "B8B800" and deck.CHROME_RAIL is True and deck.LOCKUP is None             # NXT restored


def test_a_deck_reads_new_uploads_before_it_is_written(monkeypatch):
    """17 Nov owner failure: three documents attached for a product vision deck went into an engagement whose findings
    came from an old test interview; the deck was built from those findings and had nothing to do with the documents.
    Uploads the findings do not cover are now analysed first, as a visible step, and the deck is composed from them."""
    from ia_next import deckstudio, transcripts
    eid = store.create_engagement("Pipeline check", "o")
    transcripts.add_text_source(eid, "Partner interview (test)", "The partner said researchers use AI to build the longlist.", "transcript")
    old, _ = store.create_task(eid, "transcript", {"objective": "o"}, 1.0)
    for name, data in (("findings.json", {"findings": [{"claim": "AI builds longlists", "quote": "researchers use AI to build the longlist",
                                                        "source_id": "S1", "claim_type": "SUPPORTED_FACT"}]}),
                       ("sources.json", {"sources": [{"id": "S1", "title": "Partner interview (test)", "url": "", "text": "x"}]})):
        with open(store.safe_path(eid, f"results/{name}"), "w", encoding="utf-8") as fh:
            json.dump(data, fh)
    store.update_task(old, status="done")
    import time as _t
    _t.sleep(0.01)
    brief_text = "Annual Giving cannot see donor retention by cohort without manual Excel joins."
    transcripts.add_text_source(eid, "01_Advancement_Farmers_Demo_Product_Brief.docx", brief_text, "document")
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        if kw.get("json_schema") is transcripts.TRANSCRIPT_FINDINGS_SCHEMA:     # the analysis reads every upload, the old one too
            return json.dumps({"findings": [
                {"claim": "Retention is invisible without manual joins", "quote": "cannot see donor retention by cohort",
                 "source_id": "S2", "claim_type": "SUPPORTED_FACT", "speaker": ""},
                {"claim": "AI builds longlists", "quote": "researchers use AI to build the longlist",
                 "source_id": "S1", "claim_type": "SUPPORTED_FACT", "speaker": ""}]}), None, None
        if kw.get("json_schema") in (deckstudio.SCHEMA, deckstudio.SCHEMA_LONG):
            seen["msg"] = messages[0]["content"]
            return json.dumps({"deck_title": "Farmers demo", "answer": "a", "slides": [
                _studio_slide("cover", "Annual Giving needs cohort retention without manual joins")]}), None, None
        return json.dumps({"titles": []}), None, None
    monkeypatch.setattr(providers, "claude", fake)
    monkeypatch.setattr(providers, "openai_image", lambda *a, **k: (PNG, None))
    # the agent passes the attached file's id (C2/C3); the deck is built from it alone
    tid, _ = store.create_task(eid, "deck", {"audience": "product leadership", "outline": [], "brand": "nu", "source_ids": ["S2"]}, 2.5)
    deck.run_deck_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert [n["specialist"] for n in t["nodes"]] == ["Transcript Analyst", "Deck Composer"]
    assert "cannot see donor retention by cohort" in seen["msg"] and "researchers use AI to build the longlist" not in seen["msg"]
    assert "Partner interview" not in seen["msg"]             # neither its findings nor its source text
    assert transcripts.unanalysed_uploads(eid) == []          # the next deck does not analyse again
    sources = json.load(open(store.safe_path(eid, f"results/decks/{tid}/sources.json"), encoding="utf-8"))["sources"]
    assert [s["id"] for s in sources] == ["S2"]               # revisions and re-brands keep the same scope


def _engagement_with_old_and_new_uploads():
    from ia_next import transcripts
    eid = store.create_engagement("Pipeline check", "o")
    transcripts.add_text_source(eid, "Partner interview (test)", "The partner said researchers use AI to build the longlist.", "transcript")
    transcripts.add_text_source(eid, "02_Solution_Vision.docx", "One view of donor retention by cohort for Annual Giving.", "document")
    return eid


def test_source_ids_are_checked_against_the_engagement():
    eid = _engagement_with_old_and_new_uploads()
    assert deck.clean_source_ids(eid, ["s2"]) == ["S2"] and deck.clean_source_ids(eid, "S1, S2") == ["S1", "S2"]
    assert deck.clean_source_ids(eid, []) == []
    with pytest.raises(ValueError) as e:
        deck.clean_source_ids(eid, ["S2", "S9"])
    assert "S9" in str(e.value) and "S1, S2" in str(e.value)        # the error names what the engagement has


def test_work_cannot_ignore_files_attached_with_the_message():
    """C2: with files attached to this message, the agent must name them in source_ids, or say the person asked for the
    whole engagement; the deck is never silently built from something else."""
    from ia_next import attachments
    eid = _engagement_with_old_and_new_uploads()
    files = attachments.verified([{"engagement_id": eid, "source_id": "S2", "fresh": True, "title": "forged title"},
                                  {"engagement_id": eid, "source_id": "S7", "fresh": True},         # no such upload: dropped
                                  {"engagement_id": "eng_nope", "source_id": "S1", "fresh": True}])
    assert files == [{"engagement_id": eid, "source_id": "S2", "title": "02_Solution_Vision.docx", "fresh": True}]
    started = []
    import threading as _th

    class NoThread:
        def __init__(self, *a, **k):
            started.append(k.get("args"))

        def start(self):
            pass
    orig = _th.Thread
    deck.threading.Thread = NoThread
    try:
        with attachments.scope(files):
            refused = deck.execute("start_deck", {"engagement_id": eid, "audience": "a", "outline": [], "brand": "nu"})
            assert "02_Solution_Vision.docx" in refused["error"] and "S2" in refused["error"] and not started
            ok = deck.execute("start_deck", {"engagement_id": eid, "audience": "a", "outline": [], "brand": "nu", "source_ids": ["S2"]})
            assert ok.get("started") is True
            assert store.get_task(ok["task_id"])["brief"]["source_ids"] == ["S2"]
            whole = deck.execute("start_deck", {"engagement_id": eid, "audience": "b", "outline": [], "brand": "nu", "whole_engagement": True})
            assert whole.get("started") is True and "source_ids" not in store.get_task(whole["task_id"])["brief"]
            bad = deck.execute("start_deck", {"engagement_id": eid, "audience": "c", "outline": [], "brand": "nu", "source_ids": ["S5"]})
            assert "not a source of this engagement: S5" in bad["error"]
        # files attached earlier in the conversation (not fresh) do not block work on the whole engagement
        with attachments.scope([dict(files[0], fresh=False)]):
            assert deck.execute("start_deck", {"engagement_id": eid, "audience": "d", "outline": [], "brand": "nu"}).get("started")
    finally:
        deck.threading.Thread = orig


def test_the_agent_sees_the_attached_files_and_the_guard_holds_in_a_turn(monkeypatch):
    from types import SimpleNamespace
    from ia_next import agent
    eid = _engagement_with_old_and_new_uploads()
    monkeypatch.setattr(deck.threading, "Thread", lambda *a, **k: SimpleNamespace(start=lambda: None))
    calls = []

    def fake(model, system, messages, ledger, **kw):
        calls.append(messages[-1]["content"])
        if len(calls) == 1:
            return "", None, SimpleNamespace(stop_reason="tool_use", content=[SimpleNamespace(
                type="tool_use", id="t1", name="start_deck", input={"engagement_id": eid, "audience": "a", "outline": [], "brand": "nu"},
                model_dump=lambda **k: {"type": "tool_use", "id": "t1", "name": "start_deck", "input": {}})])
        return "ok", None, SimpleNamespace(stop_reason="end_turn", content=[{"type": "text", "text": "ok"}])
    cid = agent.new_conversation()
    agent.turn(cid, "Using the attached document, make a deck", call=fake,
               attachments=[{"engagement_id": eid, "source_id": "S2", "fresh": True}])
    first = calls[0]
    assert "\"02_Solution_Vision.docx\" is source S2 in engagement " + eid + " (attached with this message)" in first
    assert "02_Solution_Vision.docx" in json.dumps(calls[1]) and "source_ids" in json.dumps(calls[1])   # the refusal came back


def test_journey_and_prototype_use_only_the_named_sources(monkeypatch):
    from ia_next import journey, prototype
    eid = _engagement_with_old_and_new_uploads()
    for name, data in (("findings.json", {"findings": [
            {"claim": "old", "quote": "researchers use AI to build the longlist", "source_id": "S1", "claim_type": "SUPPORTED_FACT"},
            {"claim": "new", "quote": "One view of donor retention by cohort", "source_id": "S2", "claim_type": "SUPPORTED_FACT"}]}),
            ("sources.json", {"sources": [{"id": "S1", "title": "Partner interview (test)", "url": "", "text": "researchers use AI to build the longlist"},
                                          {"id": "S2", "title": "02_Solution_Vision.docx", "url": "", "text": "One view of donor retention by cohort"}]})):
        with open(store.safe_path(eid, f"results/{name}"), "w", encoding="utf-8") as fh:
            json.dump(data, fh)
    assert [f["source_id"] for f in prototype._findings(eid, ["S2"])] == ["S2"]
    assert len(prototype._findings(eid)) == 2
    seen = {}

    def fake(model, system, messages, ledger, **kw):
        seen["msg"] = messages[0]["content"]
        raise providers.ProviderError("stop here")
    monkeypatch.setattr(providers, "claude", fake)
    with pytest.raises(providers.ProviderError):
        journey.build(eid, "Annual Giving officer", "retention", providers.Ledger(limit_usd=1), source_ids=["S2"])
    assert "donor retention" in seen["msg"] and "longlist" not in seen["msg"]


# ---- a slide states patterns, never a figure of its own, in digits or in words (19 Nov local deck) -------------------
def test_a_deck_line_that_states_a_figure_is_rewritten_once_and_a_stubborn_sentence_is_dropped(monkeypatch):
    from ia_next import deckstudio
    blank = lambda **kw: {"title": "T", "subtitle": "", "takeaway": "", "points": [], "cards": [], "layers": [], "steps": [],
                          "table": {"columns": [], "rows": []}, "arch": {"sources": [], "layer": {"name": "", "items": []}, "views": []},
                          "quote": "", "source_id": "", "cites": [], **kw}
    slides = [blank(subtitle="Fifty-eight percent of students say they lack the skills.",
                    points=["Students ask assistants to explain hard concepts.", "Daily users cheat nearly four times as often. Instructors rarely know."],
                    cards=[{"heading": "Skill gap", "body": "About 92% of students use it weekly."}],
                    quote="The survey found that 86% of students use it.", source_id="S1")]
    replies = ['{"lines": [{"n": 1, "text": "Most students say they lack the skills."}, '
               '{"n": 2, "text": "Daily users cheat four times as often. Instructors rarely know."}, '
               '{"n": 3, "text": "Nearly all students use it weekly."}]}']
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (replies[0], None, None))
    done, still = deckstudio.fix_figures(slides, None, "m")
    s = slides[0]
    assert s["subtitle"] == "Most students say they lack the skills." and s["cards"][0]["body"] == "Nearly all students use it weekly."
    assert s["points"] == ["Students ask assistants to explain hard concepts.", "Instructors rarely know."]   # the rewrite kept a figure: that sentence went
    assert done == 2 and still == [] and s["quote"].startswith("The survey found that 86%")                   # the quote keeps its figure


def test_a_source_name_in_a_footer_is_never_cut_inside_a_word():
    from ia_next import deckstudio
    long = {"id": "S1", "title": "libguides.usc.edu: USC AI Beat - Research Guides at University of Southern California", "url": "https://libguides.usc.edu/x"}
    got = deckstudio.label(long)
    assert len(got) <= 64 and not got.endswith("Universi") and got.split()[-1] in long["title"].split()
    assert deckstudio.label({"id": "S2", "title": "Higher Ed Dive: Faculty lag", "url": "https://x.example"}) == "Higher Ed Dive: Faculty lag"

