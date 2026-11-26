"""Owner 2026-11-19: (1) a mind map states each theme in full, never as clipped bullets; (2) every artifact downloads as
pictures, a PDF and 16:9 PowerPoint slides, and a mind map or simple diagram is EDITABLE in PowerPoint, never a picture
on a slide. No network: the renderer and HiC are replaced (conftest points both at a closed port)."""
import io
import json
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import config, diagram, exporter, hic, mindmap, store  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture(autouse=True)
def fresh(tmp_path):
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    yield


def _png(w=64, h=36):
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (200, 200, 200)).save(buf, "PNG")
    return buf.getvalue()


# ---- (1) mind map copy ---------------------------------------------------------------------------------------------
def test_words_are_cut_between_words_never_inside_one():
    s = "Students describe running every problem set through the assistant before office hours"
    out = diagram.clip_words(s, 40)
    assert len(out) <= 40 and s.startswith(out) and not out.endswith("...")
    assert s[len(out)] == " "                          # the cut fell on a space
    assert diagram.clip_words("short", 40) == "short"


def test_a_branch_keeps_whole_sentences_and_drops_restated_labels():
    pts = diagram.branch_points(
        "Using AI tools provided to students",
        "Using AI tools provided by or available to students; students on the free tier run out during exam weeks; "
        "students on the free tier run out during exam weeks; a CS student says code from AI fails the autograder")
    assert pts == ["Students on the free tier run out during exam weeks.",
                   "A CS student says code from AI fails the autograder."]
    assert diagram.branch_points("Switching from Data Science to AI",
                                 "Switching from Data Science to the AI major and AI degree programs; a senior asks if it helps jobs") \
        == ["A senior asks if it helps jobs."]
    four = "; ".join(f"Sentence number {n} names a separate fact about advisors" for n in "abcd")
    assert len(diagram.branch_points("Advisors lack a shared view", four)) == 4


def test_a_mind_map_detail_is_never_truncated_and_numbers_are_checked_per_sentence():
    p = "uploads/x/brief.md#c0"
    text = ("Annual Giving cannot see donor retention by cohort without manual Excel joins, so gift officers call lapsed "
            "alumni a year late and the reunion team plans events without the giving history it needs.")
    by_ptr = {p: {"pointer": p, "text": text, "title": "Product brief", "source_id": "S1"}}
    long_a = "Gift officers call lapsed alumni a year late because retention by cohort is invisible without Excel joins"
    sec = {"heading": "Giving lacks a joined view", "family": "mindmap", "hub": "Donor record", "takeaway": "", "edges": [],
           "items": [{"label": "Annual Giving cannot see retention by cohort", "group": "", "value": "",
                      "detail": f"{long_a}; Officers lose 40 percent of lapsed donors each year",
                      "evidence": [{"quote": "Annual Giving cannot see donor retention by cohort", "pointer": p}]}]}
    ok, dropped = diagram.check_section(sec, by_ptr)
    assert dropped == 0
    pts = diagram.branch_points(ok["items"][0]["label"], ok["items"][0]["detail"])
    assert pts == [long_a + "."]                       # whole sentence kept (over 100 characters); the unsupported figure went


def test_the_designer_skill_asks_for_plain_claims_and_full_sentences_for_mind_maps():
    s = diagram.DESIGNER_SYSTEM
    assert "five to ten words" in s and "complete sentences" in s and "Never restate the label" in s
    assert "Outside a mind map, labels are at most six words" in s
    assert "—" not in s and "quote" in s.lower() and "pointer" in s.lower()


def test_the_mind_map_page_carries_every_theme_and_sentence_in_the_brand():
    spec = {"hub": "How students use AI <tools>", "title": "Students rely on AI daily", "takeaway": "Teach verification first.",
            "sources": ["Reddit: r/NEU", "Campus Tech"],
            "nodes": [{"label": f"Theme {i} states a plain claim", "points": [f"Sentence {i} adds one specific fact."]} for i in range(6)]}
    page = mindmap.page(spec, "nu")
    assert 'id="stage"' in page and "width:1920px;height:1080px" in page
    assert "How students use AI &lt;tools&gt;" in page              # escaped
    assert all(f"Theme {i} states a plain claim" in page and f"Sentence {i} adds one specific fact." in page for i in range(6))
    assert "Sources: Reddit: r/NEU; Campus Tech" in page and "Teach verification first." in page
    assert 'data-brand="nu"' in page and "brandlogo" not in page      # the mark stays on the slide, not the layout
    assert page.count("<script>") == 1                                 # only the fit pass


# ---- (2) exports -------------------------------------------------------------------------------------------------
def _diagram_task(mode="diagram", family="mindmap"):
    eid = store.create_engagement("Giving demo", "What blocks Annual Giving?")
    tid, _ = store.create_task(eid, "diagram", {"goal": "g", "mode": mode, "brand": "nu"}, 1.0)
    sub = f"results/tasks/{tid}/"
    os.makedirs(store.safe_path(eid, sub), exist_ok=True)
    pic = _png(128, 72)
    with open(store.safe_path(eid, sub + "diagram.png"), "wb") as fh:
        fh.write(pic)
    ev = [{"quote": "q", "pointer": "p#c0", "title": "Product brief", "source_id": "S1"}]
    items = [{"label": f"Theme {i} names who acts", "detail": f"Sentence {i} adds a specific fact here", "group": "",
              "value": "", "evidence": ev} for i in range(3)]
    spec = ({"kind": "mindmap", "hub": "Donor record", "nodes": [{"label": it["label"], "points": [it["detail"]]} for it in items]}
            if family == "mindmap" else {"kind": "process-flow", "steps": [{"name": it["label"], "description": it["detail"]} for it in items]})
    out = {"mode": mode, "brand": "nu", "title": "Donor data sits apart", "standfirst": "", "picture": "diagram.png",
           "sections": [{"heading": "Donor data sits apart", "family": family, "hub": "Donor record", "takeaway": "Join it.",
                         "items": items, "edges": [], "spec": spec}], "sources": [{"title": "Product brief"}]}
    with open(store.safe_path(eid, sub + "diagram.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh)
    hp = store.safe_path(eid, sub + "diagram.html")
    open(hp, "w", encoding="utf-8").write("<html><title>Diagram: Donor data sits apart</title></html>")
    store.update_task(tid, status="done", result_path=hp)
    return store.get_task(tid), pic


def test_a_diagram_downloads_as_its_own_picture_and_a_pdf():
    t, pic = _diagram_task()
    data, name, media = exporter.make(t, "png")
    assert data == pic and name == "donor-data-sits-apart.png" and media == "image/png"
    data, name, media = exporter.make(t, "pdf")
    assert data.startswith(b"%PDF") and name.endswith(".pdf")


def test_a_mind_map_powerpoint_is_its_drawn_page_through_hic_never_a_picture(monkeypatch):
    t, _ = _diagram_task()
    drawn, sent = [], []
    monkeypatch.setattr(mindmap, "draw", lambda spec, brand: drawn.append(spec) or (_png(), '<html><div id="stage">m</div></html>', 0))

    def fake_bytes(method, path, timeout, **kw):
        sent.append((path, kw["json"]))
        return b"PK\x03\x04editable"
    monkeypatch.setattr(hic, "call_bytes", fake_bytes)
    data, name, media = exporter.make(t, "pptx")
    assert data.startswith(b"PK") and name.endswith(".pptx") and "presentation" in media
    path, body = sent[0]
    assert path == "/api/ai/diagram-pptx" and body["brand"] == "nu" and body["items"] == [{"html": '<html><div id="stage">m</div></html>'}]
    # a mind map made before mind maps kept their page is drawn again from its saved words, with today's checks
    assert [n["label"] for n in drawn[0]["nodes"]] == [f"Theme {i} names who acts" for i in range(3)]
    assert drawn[0]["nodes"][0]["points"] == ["Sentence 0 adds a specific fact here."]


def test_a_simple_diagram_powerpoint_is_hic_exhibit_spec_with_its_title_and_takeaway(monkeypatch):
    t, _ = _diagram_task(family="process-flow")
    sent = []
    monkeypatch.setattr(hic, "call_bytes", lambda m, p, to, **kw: sent.append(kw["json"]) or b"PK\x03\x04x")
    exporter.make(t, "pptx")
    item = sent[0]["items"][0]
    assert item["spec"]["kind"] == "process-flow" and item["spec"]["title"] == "Donor data sits apart"
    assert item["spec"]["takeaway"] == "Join it."


def test_no_picture_fallback_when_hic_is_down(monkeypatch):
    t, _ = _diagram_task(family="process-flow")

    def down(*a, **k):
        raise hic.HicUnavailable("HiC is not running")
    monkeypatch.setattr(hic, "call_bytes", down)
    with pytest.raises(exporter.ExportError, match="HiC's exporter"):
        exporter.make(t, "pptx")
    assert "pictures_pptx" not in open(os.path.join(ROOT, "ia_next", "exporter.py"), encoding="utf-8").read()


def test_exports_are_kept_and_reused(monkeypatch):
    t, _ = _diagram_task(family="process-flow")
    calls = []
    monkeypatch.setattr(hic, "call_bytes", lambda *a, **k: calls.append(1) or b"PK\x03\x04x")
    exporter.make(t, "pptx")
    exporter.make(t, "pptx")
    assert len(calls) == 1
    assert any(n.endswith(".pptx") for n in os.listdir(store.safe_path(t["engagement_id"], f"results/tasks/{t['id']}/exports")))


def test_an_unfinished_task_or_unknown_format_is_refused():
    t, _ = _diagram_task()
    with pytest.raises(exporter.ExportError):
        exporter.make(t, "gif")
    store.update_task(t["id"], status="running")
    with pytest.raises(exporter.ExportError, match="not finished"):
        exporter.make(store.get_task(t["id"]), "png")


def test_a_long_page_goes_to_the_renderer_as_16_9_pages(monkeypatch):
    eid = store.create_engagement("Report demo", "Why?")
    tid, _ = store.create_task(eid, "research_report", {"goal": "g"}, 1.0)
    rp = store.safe_path(eid, "results/report.md")
    open(rp, "w", encoding="utf-8").write("# Staffing shortfalls lengthen ED stays\n\nNurses report gaps [S1].\n\n## Sources\n\n- S1 Medical Care")
    store.update_task(tid, status="done", result_path=rp)
    seen = []

    class R:
        status_code = 200

        def __init__(self, body):
            self.body = body

        def json(self):
            return self.body
    import base64
    page = base64.b64encode(_png(1920, 1080)).decode()
    monkeypatch.setattr(exporter.httpx, "post", lambda url, json=None, timeout=None: seen.append(json) or R({"pages": [page, page]}))
    data, name, media = exporter.make(store.get_task(tid), "png")
    assert media == "application/zip" and name == "staffing-shortfalls-lengthen-ed-stays.zip"
    body = seen[0]
    assert body["mode"] == "flow" and body["width"] == 1280 and body["out_width"] == 1920
    assert "<h1>Staffing shortfalls lengthen ED stays</h1>" in body["html"]
    assert body["html"].count(">Sources<") == 1                       # the report's own list, not a second one
    assert '<sup class="cite">S1</sup>' in body["html"]


def test_markdown_is_escaped_before_it_is_rendered():
    out = exporter.md_html("## Title <script>x</script>\n\n- a **b** [S2]\n\n| h1 | h2 |\n|---|---|\n| c | d |")
    assert "<script>" not in out and "&lt;script&gt;" in out
    assert "<h3>" in out and "<li>a <b>b</b> <sup class=\"cite\">S2</sup></li>" in out and "<th>h1</th>" in out


def test_every_finished_artifact_card_offers_the_three_downloads():
    js = open(os.path.join(ROOT, "web", "app.js"), encoding="utf-8").read()
    kinds = re.search(r"const EXPORT_KINDS = \[([^\]]+)\]", js).group(1)
    opened = re.search(r"const OPEN_WORDS = \{(.*?)\};", js, re.S).group(1)
    for k in re.findall(r"(\w+):", opened):
        assert f"'{k}'" in kinds, f"{k} has no downloads"
    assert "['png', 'Image'], ['pdf', 'PDF'], ['pptx', 'PowerPoint']" in js
    assert "/export/${fmt}" in js and "Download the picture" not in js


def test_the_renderer_stage_keeps_text_editable_and_carries_no_script():
    sys.path.insert(0, os.path.join(ROOT, "render"))
    import importlib.util
    spec = importlib.util.spec_from_file_location("render_app", os.path.join(ROOT, "render", "app.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    text = {"runs": [{"text": "RESEARCH <REPORT>", "x": 10, "y": 20, "w": 100, "h": 14, "lines": 1, "family": "'Archivo'",
                      "size": 12, "weight": 500, "italic": False, "color": "rgb(0, 0, 0)", "spacing": "1.5px",
                      "transform": "uppercase", "align": "left", "lh": "14px"}],
            "fonts": ["@font-face{font-family:A;src:url(data:font/woff2;base64,AAA)}", "@font-face{src:url(https://x/y.woff)}"],
            "bg": "rgb(255, 255, 255)"}
    doc = mod._stage({"x": 0, "y": 0, "w": 1280, "h": 720, "h_page": 720}, text, "AAAA", 1920, 1.5, "nu")
    assert 'id="stage"' in doc and "width:1920px;height:1080px" in doc and 'data-brand="nu"' in doc
    assert "RESEARCH &lt;REPORT&gt;" in doc and "<script" not in doc and "https://x" not in doc
    w = float(re.search(r"top:30\.0px;width:([\d.]+)px", doc).group(1))
    assert w > 102 * 1.5                                              # a one-line run has room to grow in PowerPoint
