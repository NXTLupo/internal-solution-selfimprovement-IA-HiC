"""Plan Part 6 studio outputs: diagrams and infographics (S8, S4), data tables (S7) and audio overviews (S1), each built
from the engagement's manifest chunks with every label, cell and spoken line checked against its passage. No network:
the second brain, the model and HiC are replaced (conftest points HiC at a closed port for everything else)."""
import base64
import io
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ia_next import (agent, audio, config, control, datatable, diagram, hic, providers, secondbrain,  # noqa: E402
                     store, studiokit)

P1 = ("Annual Giving cannot see donor retention by cohort without manual Excel joins. The Ascend CRM holds gift records "
      "while Snowflake holds engagement history, and 42 percent of alumni have no email on file.")
P2 = ("ITS proposes one governed layer that joins Ascend, Snowflake and Cvent so Annual Giving acts on trusted numbers. "
      "Cvent records event attendance for reunion weekends.")


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


def _engagement(monkeypatch):
    eid = store.create_engagement("Giving demo", "What blocks Annual Giving?")
    with open(store.safe_path(eid, "results/sources.json"), "w", encoding="utf-8") as fh:
        json.dump({"sources": [{"id": "S1", "title": "Product brief", "url": "", "text": P1},
                               {"id": "S2", "title": "Solution vision", "url": "", "text": P2}]}, fh)
    passages = [{"source_id": "S1", "title": "Product brief", "pointer": f"uploads/{eid}/brief.md#c0", "text": P1},
                {"source_id": "S2", "title": "Solution vision", "pointer": f"uploads/{eid}/vision.md#c0", "text": P2}]
    monkeypatch.setattr(secondbrain, "material", lambda eid_, sources, objective, budget=0: (passages, {"via": {"S1": "manifest"}}))
    return eid, passages


def _item(label, quote, pointer, detail="", group="", value=""):
    return {"label": label, "detail": detail, "group": group, "value": value, "evidence": [{"quote": quote, "pointer": pointer}]}


# ---- diagrams --------------------------------------------------------------------------------------------------------
def test_a_mind_map_is_drawn_in_ia_next_frame_from_checked_labels_only(monkeypatch):
    """Owner 2026-11-19: a mind map states each theme in full and exports as an editable slide, so it is drawn in IA
    Next's own frame (mindmap.draw), never HiC's radial picture, and its drawn page is kept for the PowerPoint."""
    from ia_next import mindmap
    eid, ps = _engagement(monkeypatch)
    a, b = ps[0]["pointer"], ps[1]["pointer"]
    sent = []

    def fake_draw(spec, brand):
        assert brand == "nu"
        sent.append(spec)
        return _png(), '<!doctype html><html data-brand="nu"><body><div id="stage">map</div></body></html>', 0
    monkeypatch.setattr(mindmap, "draw", fake_draw)
    monkeypatch.setattr(hic, "_call", lambda *a, **k: pytest.fail("a mind map is not sent to HiC's radial renderer"))

    def fake_claude(model, system, messages, ledger, **kw):
        assert kw["json_schema"] is diagram.SPEC_SCHEMA and "<passage pointer=" in messages[0]["content"]
        # the first call asks for the picture; a map below the bar gets one more call that asks for what is missing
        assert "exactly one section" in messages[0]["content"] or "This mind map is not finished" in messages[0]["content"]
        return json.dumps({"title": "Annual Giving lacks a joined view of donors", "standfirst": "Three systems hold the record.",
                           "sections": [{"heading": "Donor data sits in separate systems", "family": "mindmap",
                                         "hub": "Donor record", "takeaway": "", "edges": [], "items": [
                               _item("Ascend holds gifts", "The Ascend CRM holds gift records", a, "Gift history; pledges"),
                               _item("Snowflake holds engagement", "Snowflake holds engagement history", a),
                               _item("Cvent holds events", "Cvent records event attendance for reunion weekends", b),
                               _item("Invented system", "a sentence found in no passage at all", b),
                               _item("90 percent lack email", "Annual Giving cannot see donor retention", a)]}]}), None, None
    monkeypatch.setattr(providers, "claude", fake_claude)
    tid, _ = store.create_task(eid, "diagram", {"goal": "Where does donor data live?", "mode": "diagram", "brand": "nu",
                                               "orientation": "landscape"}, 1.0)
    diagram.run_diagram_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    spec = sent[0]
    assert spec["kind"] == "mindmap" and spec["hub"] == "Donor record" and spec["title"] == "Donor data sits in separate systems"
    labels = [n["label"] for n in spec["nodes"]]
    assert labels == ["Ascend holds gifts", "Snowflake holds engagement", "Cvent holds events"]   # invented label dropped
    assert spec["nodes"][0]["points"] == ["Gift history", "Pledges"]
    assert spec["sources"] and "Product brief" in spec["sources"]
    assert os.path.getsize(store.safe_path(eid, f"results/tasks/{tid}/diagram.png")) > 0
    assert "id=\"stage\"" in open(store.safe_path(eid, f"results/tasks/{tid}/{diagram.SLIDE_PAGE}"), encoding="utf-8").read()
    page = open(t["result_path"], encoding="utf-8").read()
    assert "data:image/png;base64," in page and "Product brief" in page and "Solution vision" in page
    assert "IA Next's mind map frame" in page
    assert "2 themes left out" in t["summary"] and "from 2 sources" in t["summary"] and "mind map of 3 themes" in t["summary"]


def test_an_infographic_poster_is_composed_here_with_counted_bars(monkeypatch):
    eid, ps = _engagement(monkeypatch)
    a, b = ps[0]["pointer"], ps[1]["pointer"]
    sent = []

    def fake_hic(method, path, timeout, **kw):
        spec = kw["json"]["spec"]
        sent.append(spec)
        f = spec["frame"]
        return {"dataUri": "data:image/png;base64," + base64.b64encode(_png(f["w"] * 2, f["h"] * 2)).decode()}
    monkeypatch.setattr(hic, "_call", fake_hic)
    two = {"label": "Data is split", "detail": "", "group": "", "value": "",
           "evidence": [{"quote": "Snowflake holds engagement history", "pointer": a},
                        {"quote": "joins Ascend, Snowflake and Cvent", "pointer": b}]}
    monkeypatch.setattr(providers, "claude", lambda *x, **k: (json.dumps({
        "title": "Annual Giving needs one governed layer", "standfirst": "",
        "sections": [
            {"heading": "Gift officers join files by hand", "family": "process-flow", "hub": "", "takeaway": "", "edges": [], "items": [
                _item("Export from Ascend", "The Ascend CRM holds gift records", a),
                _item("Join in Excel", "without manual Excel joins", a)]},
            {"heading": "The split data is the most cited problem", "family": "ranked-bars", "hub": "", "takeaway": "", "edges": [], "items": [
                two, _item("No cohort view", "cannot see donor retention by cohort", a)]},
            {"heading": "A mind map is not allowed on a poster", "family": "mindmap", "hub": "x", "takeaway": "", "edges": [], "items": []}]}),
        None, None))
    tid, _ = store.create_task(eid, "diagram", {"goal": "Why one layer?", "mode": "infographic", "brand": "nxt",
                                               "orientation": "portrait", "density": "concise"}, 1.0)
    diagram.run_diagram_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    assert [s["kind"] for s in sent] == ["process-flow", "ranked-bars"]
    assert all(s["chrome"] == "none" and s["frame"]["w"] >= 900 for s in sent)
    bars = sent[1]["items"]
    assert bars[0] == {"label": "Data is split", "score": 2, "note": ""} and bars[1]["score"] == 1      # counted, not written
    from PIL import Image
    poster = Image.open(store.safe_path(eid, f"results/tasks/{tid}/infographic.png"))
    assert poster.size == (1080 * 2, 1620 * 2)
    assert "infographic with 2 sections" in t["summary"]


def test_a_stat_tile_keeps_only_a_figure_inside_its_checked_quote(monkeypatch):
    eid, ps = _engagement(monkeypatch)
    a = ps[0]["pointer"]
    sec = {"heading": "Alumni contact data is incomplete", "family": "stat-row", "hub": "", "takeaway": "", "edges": [], "items": [
        _item("Alumni without email", "42 percent of alumni have no email on file", a, value="42 percent"),
        _item("Retention visibility", "cannot see donor retention by cohort", a, value="90 percent")]}
    ok, dropped = diagram.check_section(sec, {p["pointer"]: p for p in ps})
    assert [it["label"] for it in ok["items"]] == ["Alumni without email"] and dropped == 1
    assert diagram.family_spec(ok) is None          # one tile is too little for a stat row; it is not drawn


def test_numbers_in_labels_must_come_from_the_passage(monkeypatch):
    eid, ps = _engagement(monkeypatch)
    sec = {"heading": "Contact data gaps", "family": "process-flow", "hub": "", "takeaway": "", "edges": [], "items": [
        _item("Find 42 percent", "42 percent of alumni have no email on file", ps[0]["pointer"], detail="About 77 percent lapse"),
        _item("Find 13 records", "Cvent records event attendance", ps[1]["pointer"])]}
    ok, dropped = diagram.check_section(sec, {p["pointer"]: p for p in ps})
    assert [it["label"] for it in ok["items"]] == ["Find 42 percent"] and ok["items"][0]["detail"] == "" and dropped == 1


def test_diagram_tool_is_non_strict_and_checks_its_fields(monkeypatch):
    eid, _ = _engagement(monkeypatch)
    spec = next(t for t in agent.TOOLS if t["name"] == "start_diagram")
    assert spec["strict"] is False and agent.MODULE_FOR_TOOL["start_diagram"] is diagram
    assert "goal" in diagram.execute("start_diagram", {"engagement_id": eid, "goal": "", "mode": "diagram", "brand": "nxt"})["error"]
    assert "family" in diagram.execute("start_diagram", {"engagement_id": eid, "goal": "x", "mode": "diagram", "brand": "nxt",
                                                         "family": "pie"})["error"]


# ---- data tables -----------------------------------------------------------------------------------------------------
def test_a_data_table_keeps_named_entities_and_checked_cells(monkeypatch):
    eid, ps = _engagement(monkeypatch)
    a, b = ps[0]["pointer"], ps[1]["pointer"]

    def fake_claude(model, system, messages, ledger, **kw):
        assert kw["json_schema"] is datatable.TABLE_SCHEMA and "Columns the person asked for, in order: Holds; Owner" in messages[0]["content"]
        return json.dumps({"title": "Three systems hold the donor record", "standfirst": "", "columns": ["ignored"], "rows": [
            {"entity": "Ascend", "cells": [{"column": "Holds", "value": "Gift records", "quote": "The Ascend CRM holds gift records", "pointer": a},
                                           {"column": "Owner", "value": "Advancement", "quote": "owned by advancement services", "pointer": a}]},
            {"entity": "Cvent", "cells": [{"column": "Holds", "value": "Event attendance for 12 reunions",
                                           "quote": "Cvent records event attendance for reunion weekends", "pointer": b}]},
            {"entity": "Salesforce", "cells": [{"column": "Holds", "value": "Leads", "quote": "The Ascend CRM holds gift records", "pointer": a}]},
            {"entity": "Snowflake", "cells": [{"column": "Holds", "value": "Engagement history", "quote": "Snowflake holds engagement history", "pointer": a}]}]}), None, None
    monkeypatch.setattr(providers, "claude", fake_claude)
    tid, _ = store.create_task(eid, "datatable", {"goal": "Which systems hold donor data?", "columns": ["Holds", "Owner"], "brand": "nxt"}, 1.0)
    datatable.run_datatable_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    out = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/datatable.json"), encoding="utf-8"))
    assert [r["entity"] for r in out["rows"]] == ["Ascend", "Snowflake"]       # Salesforce is named nowhere; Cvent's only cell had an unsupported number
    assert out["columns"] == ["Holds"] and "Owner" not in out["rows"][0]["cells"]
    csv_text = open(store.safe_path(eid, f"results/tasks/{tid}/datatable.csv"), encoding="utf-8").read()
    assert csv_text.startswith("﻿Entity,Holds,Sources") and "Gift records,Product brief" in csv_text
    page = open(t["result_path"], encoding="utf-8").read()
    assert "The Ascend CRM holds gift records" in page and "datatable.csv" in page
    assert "2 rows by 1 columns" in t["summary"]


# ---- audio overviews -------------------------------------------------------------------------------------------------
def _script(a, b):
    return {"title": "Annual Giving works from three separate systems", "turns": [
        {"speaker": "a", "text": "Why can't the team see who stopped giving?", "pointer": "", "quote": ""},
        {"speaker": "b", "text": 'The brief says it plainly: "Annual Giving cannot see donor retention by cohort".', "pointer": a,
         "quote": "Annual Giving cannot see donor retention by cohort"},
        {"speaker": "a", "text": "So what would fix it?", "pointer": "", "quote": ""},
        {"speaker": "b", "text": 'ITS wants "one governed layer that joins Ascend, Snowflake and Cvent".', "pointer": b,
         "quote": "one governed layer that joins Ascend, Snowflake and Cvent"},
        {"speaker": "a", "text": 'They said "a phrase that is in neither passage".', "pointer": b, "quote": "a phrase that is in neither passage"},
        {"speaker": "b", "text": "About 60 percent of donors lapse each year.", "pointer": a, "quote": ""},
        {"speaker": "a", "text": 'And contact data? "42 percent of alumni have no email on file".', "pointer": a,
         "quote": "42 percent of alumni have no email on file"},
        {"speaker": "b", "text": "That gap is what the governed layer has to close first.", "pointer": b, "quote": ""}]}


def test_an_audio_script_is_checked_and_the_voices_wait_for_approval(monkeypatch):
    # the strict form, where the model says each quotation itself (IA Next); the local form has its own test below
    monkeypatch.setattr(config, "LOCAL", False)
    eid, ps = _engagement(monkeypatch)
    monkeypatch.setattr(providers, "claude", lambda *x, **k: (json.dumps(_script(ps[0]["pointer"], ps[1]["pointer"])), None, None))
    tid, _ = store.create_task(eid, "audio_overview", {"goal": "Explain the donor data problem", "format": "critique",
                                                      "length": "short", "brand": "nxt"}, 1.0)
    audio.run_audio_task(tid)
    t = store.get_task(tid)
    assert t["status"] == "done", t["error"]
    script = json.load(open(store.safe_path(eid, f"results/tasks/{tid}/script.json"), encoding="utf-8"))
    texts = [x["text"] for x in script["turns"]]
    assert len(texts) == 6 and not any("neither passage" in x or "60 percent" in x for x in texts)    # two turns cut
    assert script["speakers"] == {"a": "Skeptical Partner", "b": "Curious Strategist"}
    assert "2 turns cut" in t["summary"] and "need your approval" in t["summary"]
    page = open(t["result_path"], encoding="utf-8").read()
    assert "Product brief" in page and "Curious Strategist" in page and "<audio" not in page

    first = audio.execute("render_audio_overview", {"task_id": tid})
    assert first["approval"] == "pending" and first["estimate_usd"] > 0
    assert "USD per 1,000 characters" in control.pending()[0]["reason"]      # the strict path under test here is IA Next's
    assert not os.path.exists(store.safe_path(eid, f"results/tasks/{tid}/audio.mp3"))

    control.decide(first["approval_id"], True)
    calls = []

    def fake_hic(method, path, timeout, **kw):
        assert path == "/api/tts/dialogue"
        calls.append(kw["json"])
        slug = kw["json"]["slug"] + "-2"                       # HiC suffixes a slug it already holds
        return {"url": f"/api/artifacts/audio/{slug}.mp3", "slug": slug, "bytes": 4, "turns": len(kw["json"]["turns"]),
                "voices": 2, "provider": "elevenlabs", "seconds": 1.0,
                "characters": sum(len(x["text"]) for x in kw["json"]["turns"]), "cost_usd": 0.12}
    monkeypatch.setattr(hic, "_call", fake_hic)
    fetched = []
    monkeypatch.setattr(audio, "_fetch", lambda url: fetched.append(url) or b"ID3x")
    done = audio.execute("render_audio_overview", {"task_id": tid})
    assert done["rendered"] is True and done["spent_usd"] == 0.12           # HiC's own price, not the estimate
    assert fetched == [f"/api/artifacts/audio/ia-{tid}-critique-p1-2.mp3"]
    assert calls[0]["slug"] == f"ia-{tid}-critique-p1" and {x["speaker"] for x in calls[0]["turns"]} == {"a", "b"}
    assert open(store.safe_path(eid, f"results/tasks/{tid}/audio.mp3"), "rb").read() == b"ID3x"
    t = store.get_task(tid)
    assert t["summary"].startswith("Audio ready") and t["spent_usd"] >= done["spent_usd"]
    assert "<audio" in open(t["result_path"], encoding="utf-8").read()
    again = audio.execute("render_audio_overview", {"task_id": tid})
    assert again["reused"] is True and len(calls) == 1                     # never paid twice


def test_speech_turns_respect_hics_limits():
    long_turn = {"speaker": "a", "text": " ".join(["This sentence is about donor retention by cohort."] * 80)}
    batches = audio.tts_turns([long_turn] + [{"speaker": "b", "text": "Short reply."}] * 45)
    flat = [x for b in batches for x in b]
    assert all(len(x["text"]) <= audio.TTS_MAX_TURN_CHARS for x in flat)
    assert all(len(b) <= audio.TTS_MAX_TURNS for b in batches) and len(batches) == 2
    assert "".join(x["text"] for x in flat if x["speaker"] == "a").replace(" ", "") == long_turn["text"].replace(" ", "")


def test_studio_tools_are_registered_and_non_strict():
    names = {"start_diagram", "start_datatable", "start_audio_overview", "render_audio_overview"}
    specs = {t["name"]: t for t in agent.TOOLS if t["name"] in names}
    assert set(specs) == names and not any(s["strict"] for s in specs.values())
    assert agent._paid_estimate("start_diagram", {}) is None and agent._paid_estimate("render_audio_overview", {}) is None   # nothing is spend here


def test_typographic_quotes_still_match_their_passage():
    p = {"pointer": "x#c0", "source_id": "S1", "title": "T", "text": "The team said “we join files by hand” every week."}
    assert studiokit.check_quote('the team said "we join files by hand" every week', "x#c0", {"x#c0": p})


# ---- the mind map bar (Gemini Notebook, measured 9 Nov: six branches, three to five children each) -------------------
def _mm_item(label, detail, ptr="p1"):
    return {"label": label, "detail": detail, "group": "", "value": "", "evidence": [{"quote": "q", "pointer": ptr}]}


def test_a_mind_map_below_the_bar_says_why_and_merging_fills_it():
    from ia_next import diagram
    three = "Advisors answer late in the term; Students ask classmates before staff; Departments publish rules in separate places"
    base = {"family": "mindmap", "hub": "h", "heading": "", "takeaway": "", "edges": [], "items": [
        _mm_item("Students use assistants to draft coursework", "Professors see drafts written with assistants"),
        _mm_item("Universities publish uneven rules on assistants", three),
        _mm_item("Career offices teach prompt writing", three)]}
    assert "3 branches" in diagram.mind_thin(base)
    more = {"family": "mindmap", "items": [
        _mm_item("Students use assistants to draft coursework", "Students check assistant output against the reading; Tutors ask for the prompts used", "p2"),
        _mm_item("Employers screen applications with software", three, "p3"),
        _mm_item("Libraries license assistants for every student", three, "p4")]}
    merged = diagram.merge_branches(base, more)
    assert [it["label"] for it in merged["items"]][-2:] == ["Employers screen applications with software", "Libraries license assistants for every student"]
    first = merged["items"][0]
    assert len(diagram.branch_points(first["label"], first["detail"])) == 3            # one sentence kept, two added
    assert {e["pointer"] for e in first["evidence"]} == {"p1", "p2"}                   # and the passages behind them
    assert diagram.mind_thin(merged) == ""                                             # five branches, three sentences each
    assert diagram.MIND_RE.search("Draw a mind map of students #mindmap") and not diagram.MIND_RE.search("draw a funnel")


# ---- the illustrated infographic (Gemini Notebook's: six nodes in two groups, an illustration and a sentence each) ----
def test_an_illustrated_canvas_groups_ideas_gives_each_a_picture_and_keeps_text_as_text(monkeypatch):
    from ia_next import illustrated, localmedia, providers
    it = lambda label, group: {"label": label, "detail": "Students check drafts against the reading before they submit; a second clause",
                               "group": group, "value": "", "evidence": [{"quote": "q", "pointer": "p"}]}
    sections = [{"heading": "How students work", "family": "concept-cluster", "takeaway": "t",
                 "items": [it(f"Idea {c} about study habits and much more text", "") for c in "ABCDE"]},
                {"heading": "How universities respond", "family": "concept-cluster", "takeaway": "",
                 "items": [it(f"Response {c}", "") for c in "ABCDE"]}]
    groups = illustrated.pick(sections, "standard")
    assert [g["heading"] for g in groups] == ["How students work", "How universities respond"]
    assert sum(len(g["nodes"]) for g in groups) == 6                         # the standard density, split across the two groups
    node = groups[0]["nodes"][0]
    assert len(node["label"].split()) <= 7 and node["caption"] == "Students check drafts against the reading before they submit."
    assert node["evidence"] == [{"quote": "q", "pointer": "p"}]              # the passage it was checked against stays with it
    echo = groups[0]["nodes"][1]
    scene = lambda n, who, doing, where: '{"n": %d, "who": "%s", "doing": "%s", "where": "%s"}' % (n, who, doing, where)
    replies = iter(['{"scenes": [' + scene(1, "A woman", "compares a printed page with an open book", "at a library desk") + ", "
                    + scene(2, echo["label"], echo["caption"].rstrip("."), "somewhere") + "]}",
                    '{"scenes": [' + scene(2, "A lecturer", "hands back marked papers", "in a seminar room") + "]}", '{"scenes": []}'])
    monkeypatch.setattr(providers, "claude", lambda *a, **k: (next(replies, '{"scenes": []}'), None, None))
    illustrated.subjects(groups, "g")
    assert groups[0]["nodes"][0]["subject"] == "A woman compares a printed page with an open book at a library desk"
    assert groups[0]["nodes"][1]["subject"].startswith("A lecturer hands back")          # the idea's own sentence was refused and asked for again
    assert groups[1]["nodes"][0]["subject"].startswith("Two people at a table")          # never the idea's words as the picture
    assert "university" not in groups[1]["nodes"][0]["subject"]                          # the plain scene belongs to any subject
    # an idea that carries a figure, in digits or words, stays off the canvas; an abbreviation does not end a sentence
    fig = [{"heading": "h", "family": "concept-cluster", "takeaway": "", "items": [
        it("Weekly use", ""), {**it("Weekly use two", ""), "detail": "Fifty-seven percent of U.S. college students use it every week."},
        {**it("Policy lag", ""), "detail": "Most U.S. colleges leave the rules to each instructor. A second sentence."}]}]
    picked = illustrated.pick(fig, "standard")[0]["nodes"]
    assert [n["label"] for n in picked] == ["Weekly use", "Policy lag"]
    assert picked[1]["caption"] == "Most U.S. colleges leave the rules to each instructor."
    asked = []
    monkeypatch.setattr(localmedia, "image", lambda prompt, size, negative=None: asked.append((prompt, size, negative)) or (b"\x89PNG-bytes", "comfyui:sd3.5-large"))
    illustrated.illustrate(groups, brand="deciem")
    assert len(asked) == 6 and all(illustrated.style("deciem") in p and s == "768x768" for p, s, _ in asked)   # one style for every picture
    assert all("illustration" not in neg for _, _, neg in asked)             # the photograph's refusals are not sent for a drawing
    assert "pink" in illustrated.style("deciem") and "yellow-green" in illustrated.style("nxt") and "red" in illustrated.style("nu")
    # owner, 25 Nov: an illustration always accompanies an idea, with or without a quotation, on every shape and brand
    quoted = [{"heading": g["heading"], "nodes": [dict(n, proof={"quote": "A sentence a source wrote about this idea in full.", "source": "Freight Weekly"})
                                                    for n in g["nodes"]]} for g in groups]
    for shape in ("landscape", "portrait", "square"):
        for b in ("nxt", "deciem", "nu"):
            assert illustrated.page({"title": "T", "groups": quoted, "takeaway": "t"}, b, shape).count("<img ") == 6
    page = illustrated.page({"title": "Students lean on assistants", "subtitle": "What they do and how schools answer",
                             "groups": groups, "takeaway": "t", "sources": ["A", "B"]}, "nxt", "landscape")
    assert page.count("<img ") == 6 and "<h2>Idea A about study habits and much</h2>" in page and 'id="stage"' in page
    assert "Students check drafts against the reading before they submit." in page and "width:1920px;height:1080px" in page
    assert "image" not in json.dumps(illustrated.record(groups))             # picture bytes are not saved in the data file


# ---- the audio script on this machine: the model's own words, the quote spoken by code with its source named ---------
def test_a_local_audio_turn_speaks_its_checked_quote_after_its_own_words_and_names_the_source():
    from ia_next import audio
    said = "Students most often describe the assistant as a form of academic support."
    by_ptr = {"p1": {"pointer": "p1", "source_id": "S1", "title": "libguides.usc.edu: USC AI Beat - Research Guides", "text": "Intro. " + said + " More."},
              "p2": {"pointer": "p2", "source_id": "S2", "title": "Higher Ed Dive: Faculty lag behind", "text": "Faculty use it rarely in class."}}
    raw = {"turns": [
        {"speaker": "a", "text": "Students treat the assistant as study support.", "pointer": "p1", "quote": said},
        {"speaker": "b", "text": "And faculty?", "pointer": "", "quote": ""},
        {"speaker": "a", "text": "Faculty use it far less.", "pointer": "p2", "quote": "Faculty never use it at all."},      # not in the passage
        {"speaker": "b", "text": "About sixty percent of them avoid it.", "pointer": "p2", "quote": ""},                    # its own figure
        {"speaker": "c", "text": "x", "pointer": "", "quote": ""}]}
    turns, cut = audio.check_script_local(raw, by_ptr)
    assert cut == 2 and [t["speaker"] for t in turns] == ["a", "b", "a"]
    assert turns[0]["text"] == f'Students treat the assistant as study support. The piece titled USC AI Beat puts it this way: "{said}"'
    assert turns[0]["quote"] == said and turns[0]["source_id"] == "S1"
    assert turns[2]["text"] == "Faculty use it far less." and turns[2]["quote"] == ""       # the unfound quote is not spoken
    assert audio.spoken_source("Higher Ed Dive: Faculty lag behind") == "Higher Ed Dive"
    assert audio.spoken_source("Survey: 86% of Students Already Use AI -- Campus Technology") == "Survey"


# ---- the video overview: the checked voices over the engagement's own slides ------------------------------------------
def test_a_video_overview_is_the_voices_over_the_slides_and_says_what_is_missing(monkeypatch, tmp_path):
    av = pytest.importorskip("av")
    import numpy as np
    from PIL import Image
    from ia_next import narrated
    monkeypatch.setattr(config, "ENGAGEMENTS_DIR", str(tmp_path / "engagements"))
    store.reset_for_tests(str(tmp_path / "t.sqlite3"))
    config.ensure_dirs()
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "audio_overview", {}, 1.0, "a1")
    store.update_task(tid, status="done")
    t = store.get_task(tid)
    with pytest.raises(narrated.NotReady, match="make the voices"):
        narrated.build(t)
    buf = io.BytesIO()                                       # four seconds of a tone as the "voices"
    with av.open(buf, "w", format="mp3") as c:
        a = c.add_stream("mp3", rate=44100)
        wave = (np.sin(np.arange(44100 * 4) * 2 * np.pi * 330 / 44100) * 0.3 * 32767).astype("int16")
        for s in range(0, len(wave), 1152):
            chunk = wave[s:s + 1152]
            fr = av.AudioFrame.from_ndarray(chunk.reshape(1, -1), format="s16", layout="mono")
            fr.sample_rate, fr.pts = 44100, s
            for pk in a.encode(fr):
                c.mux(pk)
        for pk in a.encode():
            c.mux(pk)
    p = store.safe_path(eid, f"results/tasks/{tid}/audio.mp3")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as fh:
        fh.write(buf.getvalue())
    with pytest.raises(narrated.NotReady, match="make a deck or a picture"):
        narrated.build(t)

    def png(color):
        b = io.BytesIO()
        Image.new("RGB", (640, 360), color).save(b, "PNG")
        return b.getvalue()
    monkeypatch.setattr(narrated, "stills", lambda e: ([png("white"), png("teal")], "the 2 slides of the newest deck"))
    data, name, where = narrated.build(t)
    assert name == "video-overview.mp4" and where.startswith("the 2 slides")
    with av.open(io.BytesIO(data)) as c:
        kinds = sorted(s.type for s in c.streams)
        v = c.streams.video[0]
        frames = sum(1 for _ in c.decode(v))
    assert kinds == ["audio", "video"] and (v.codec_context.width, v.codec_context.height) == (1280, 720)
    assert abs(frames / narrated.FPS - 4) <= 1                                   # as long as the voices
    assert narrated.build(t)[0] == data                                          # kept: the second request reads the file

