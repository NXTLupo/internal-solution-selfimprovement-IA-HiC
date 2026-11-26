"""The local journey map: the standalone Journey Mapper's method in steps, quotes checked by code, a drawn curve."""
import json

from ia_next import artifacts, journeymap, providers

SOURCES = [{"id": "S1", "title": "r/college: Tips for syllabus week", "url": "", "text": "I read the syllabus twice before I open the chatbot. Honestly the rule is different in every class I take."},
           {"id": "S2", "title": "Higher Ed Dive: How to navigate AI adoption", "url": "", "text": "Students said they were never told how to disclose what the tool did. Faculty asked for examples."}]
PHASES = [{"name": "Reading the course rule", "window": "The first week of term", "mindset": "I need to know what I am allowed to do.", "level": "low", "emotion": "Wary", "reason": "each course states a different rule"},
          {"name": "Drafting with the tool open", "window": "The night before", "mindset": "I just need an outline.", "level": "neutral", "emotion": "Focused", "reason": "the tool explains the reading"},
          {"name": "Submitting and disclosing", "window": "Deadline day", "mindset": "Do I have to say I used it?", "level": "very low", "emotion": "Anxious", "reason": "nobody said how to disclose"}]
DETAIL = {"actions": ["The student reads the syllabus rule before opening the tool [S1].", "The student asks a classmate what the instructor allows [S1].", "The student saves the rule to check later [S1]."],
          "touchpoints": ["The syllabus", "ChatGPT"], "highs": ["The tool explains the reading in plain words [S2]."],
          "pains": [{"pain": "Each course states a different rule", "severity": "high", "frequency": "Every student in more than one course, every term",
                     "quote": {"text": "Honestly the rule is different in every class I take.", "source_id": "S2"}},
                    {"pain": "A made-up pain", "severity": "low", "frequency": "Rarely", "quote": {"text": "This sentence appears in no source at all anywhere.", "source_id": "S1"}}],
          "quotes": [{"text": "I read the syllabus twice before I open the chatbot.", "source_id": "S1"}],
          "moment_of_truth": "", "opportunities": ["The provost's office publishes one disclosure standard [S2]."]}


def _ask(model, msg, schema, ledger):
    keys = set(schema["properties"])
    assert msg.startswith("<material>")
    if "phases" in keys:
        return {"title": "Students cannot find the rule they are asked to follow", "standfirst": "The rule changes by course [S1].",
                "persona": {"name": "The rule-checking first-year", "who": "A first-year in a writing course.", "goals": ["Stay inside the rule [S1]."],
                            "quote": {"text": "I read the syllabus twice before I open the chatbot.", "source_id": "S1"}, "portrait": "A student at a library table."},
                "phases": json.loads(json.dumps(PHASES))}
    if "actions" in keys:
        if "Drafting with the tool open" in msg.split("for one phase only")[1]:
            raise providers.ProviderError("down")
        d = json.loads(json.dumps(DETAIL))
        if "Submitting and disclosing" in msg.split("for one phase only")[1]:
            d["moment_of_truth"] = "The student decides whether to say the tool was used [S2]."
        return d
    return {"overall_pains": [{"pain": "Rules differ by course", "why": "Each instructor writes their own [S1]."}],
            "opportunities": [{"opportunity": "One disclosure standard", "addresses": "Rules differ by course", "owner": "The provost's office"}], "takeaway": "Publish one rule [S2]."}


def test_the_journey_is_written_in_steps_checked_and_drawn():
    j = journeymap.compose("The rule-checking first-year", "AI in coursework", "corpus", "m", ask=_ask)
    assert [p["name"] for p in j["phases"]] == ["Reading the course rule", "Submitting and disclosing"]      # the failed phase is left out
    j, kept, dropped = journeymap.check(j, SOURCES)
    assert (kept, dropped) == (5, 2)
    first = j["phases"][0]["pains"]
    assert first[0]["quote"]["source_id"] == "S1"                 # found in another source: the id is corrected
    assert first[1]["quote"] is None and first[1]["pain"] == "A made-up pain"
    page = journeymap.page(j, SOURCES, "nxt")
    assert artifacts.unverified_quotes(page, SOURCES) == []
    assert page.count('class="phase"') == 2 and "<polyline" in page and 'class="dot k-friction"' in page and 'class="dot k-truth"' in page
    for lane in ("Mindset", "What they do", "Touchpoints", "What goes well", "Experience", "Emotional read", "Pain points", "In their words", "Opportunities"):
        assert lane in page
    assert "High severity" in page and "Moment of truth" in page and "The pains that persist" in page and 'id="src-S1"' in page
    assert "—" not in page


def test_a_repeated_citation_is_settled_and_moments_of_truth_are_two_at_most():
    from ia_next import localartifact
    assert localartifact.calm("because policies vary by instructor [S78]. [S83]. [S84]. [S84]. [S84]. [S84].") == "because policies vary by instructor [S78] [S83]."
    assert localartifact.calm("One rule [S1] and another [S2].") == "One rule [S1] and another [S2]."
    ph = [dict(p, moment_of_truth="A decisive moment.", pains=[{"pain": "x", "severity": "high" if i == 2 else "low", "frequency": "f", "quote": None}],
               emotion="quietly anxious today", reason="nobody said how to disclose [S2]. [S2]. [S2]. And more.") for i, p in enumerate(json.loads(json.dumps(PHASES)))]
    j, _, _ = journeymap.check({"persona": {"name": "n"}, "phases": ph}, SOURCES)
    assert [bool(p["moment_of_truth"]) for p in j["phases"]].count(True) == 2 and j["phases"][2]["moment_of_truth"]
    assert j["phases"][0]["emotion"] == "Quietly anxious" and j["phases"][0]["reason"] == "nobody said how to disclose [S2]."


def test_the_editable_powerpoint_is_whole_slides_and_the_page_is_unchanged():
    from ia_next import slidepage
    import test_docpage as D
    j = journeymap.compose("p", "s", "corpus", "m", ask=_ask)
    j, _, _ = journeymap.check(j, SOURCES)
    before = journeymap.page(json.loads(json.dumps(j)), SOURCES, "nxt")
    slides = slidepage.journey(j, SOURCES, "nxt")
    synth = bool(j.get("overall_pains")) + bool(j.get("opportunities"))
    pained = sum(1 for p in j["phases"] if p.get("pains") or p.get("opportunities"))
    assert slides.count('<section class="stage">') == 1 + len(j["phases"]) + pained + synth   # overview, two slides a phase, the synthesis
    assert chr(0x2026) not in slides                                                           # every sentence whole
    assert "Phase 01 of 02" in slides and "Pain points" in slides and "[S1]" not in slides and "<script" not in slides
    assert journeymap.page(json.loads(json.dumps(j)), SOURCES, "nxt") == before
    assert slidepage.personas(json.loads(json.dumps(D.PERSONAS)), D.TITLES, "nxt").count('<section class="stage">') == 6      # overview, where each sits, two slides a persona
    assert slidepage.competitive(json.loads(json.dumps(D.COMPETITIVE)), D.TITLES, "nxt").count('<section class="stage">') == 7      # title, who is compared, matrix, evidence, cases, gaps
    assert slidepage.architecture(json.loads(json.dumps(D.ARCH)), D.TITLES, "nu").count('<section class="stage">') == 4      # zones, connections, weak points, changes
    assert slidepage.document(json.loads(json.dumps(D.DOCUMENT)), "Recommendations", D.TITLES, "nxt").count('<section class="stage">') == 5


def test_a_powerpoint_text_box_cannot_rewrap_in_another_face():
    import io as _io, zipfile
    from ia_next import exporter
    one = ('<p:sp><p:spPr><a:xfrm><a:off x="1" y="1"/><a:ext cx="366270" cy="132714"/></a:xfrm></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" lIns="0"/>'
           '<a:p><a:pPr><a:lnSpc><a:spcPts val="844"/></a:lnSpc></a:pPr><a:r><a:rPr sz="800" b="1"/><a:t>GOALS</a:t></a:r></a:p></p:txBody></p:sp>')
    many = ('<p:sp><p:spPr><a:xfrm><a:off x="1" y="9"/><a:ext cx="2793930" cy="363220"/></a:xfrm></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="t" lIns="0"/>'
            '<a:p><a:pPr><a:lnSpc><a:spcPts val="1329"/></a:lnSpc></a:pPr><a:r><a:rPr sz="950"/><a:t>Complete all assigned coursework efficiently without spending excessive time.</a:t></a:r></a:p></p:txBody></p:sp>')
    buf = _io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("ppt/slides/slide1.xml", "<p:sld>" + one + many + "</p:sld>")
        z.writestr("ppt/presentation.xml", "<p/>")
    data, locked, fitted = exporter.steady(buf.getvalue())
    x = zipfile.ZipFile(_io.BytesIO(data)).read("ppt/slides/slide1.xml").decode()
    assert (locked, fitted) == (1, 1)
    assert x.count('wrap="none"') == 1 and "GOALS" in x.split('wrap="none"')[1][:400]          # the one-line label never wraps
    assert '<a:normAutofit fontScale="90000"/></a:bodyPr>' in x and x.count('wrap="square"') == 1  # the paragraph keeps its box and fits


def test_an_outline_the_agent_invented_does_not_shorten_the_deck():
    from ia_next import deckstudio
    req = "Make a slide deck for a provost: how college students use AI today and what the university should do about it #slides"
    invented = ["Current state of AI use by college students in coursework", "Key findings from research on AI use in academic work",
                "University response strategies and policy recommendations", "Implementation priorities for AI integration",
                "Future outlook and governance framework"]
    assert not deckstudio.own_outline(invented, req)
    mine = "Make a deck: 1. Where students use AI in coursework 2. What faculty policies say 3. Three actions for the provost"
    assert deckstudio.own_outline(["Where students use AI in coursework", "What faculty policies say", "Three actions for the provost"], mine)
    assert deckstudio.own_outline(["Anything"], "")          # no record of the request: the outline is kept


def test_slides_are_set_in_type_a_room_can_read():
    import re as _re
    from ia_next import slidepage
    import test_docpage as D
    html_ = slidepage.personas(json.loads(json.dumps(D.PERSONAS)), D.TITLES, "nxt")
    css = html_[html_.index(slidepage.CSS[:40]):]
    sizes = [int(x) for x in _re.findall(r"font:[^;]*?(\d+)px", slidepage.CSS)] + [int(x) for x in _re.findall(r"font-size:(\d+)px", slidepage.CSS)]
    assert min(sizes) >= 20 and "font:400 28px" in slidepage.CSS                              # body 14 pt, nothing under 10 pt
    assert slidepage._clip("A majority of U.S. students report it. More.", 30) == "A majority of U.S. students…" or         slidepage._clip("A majority of U.S. students report it. More.", 40) == "A majority of U.S. students report it."


def test_a_video_index_moves_in_front_of_its_media_with_offsets_moved():
    from ia_next import narrated
    def box(typ, body):
        return (8 + len(body)).to_bytes(4, "big") + typ + body
    media = b"X" * 100
    stco = box(b"stco", b"\0\0\0\0" + (1).to_bytes(4, "big") + (40).to_bytes(4, "big"))       # one chunk at offset 40
    moov = box(b"moov", box(b"trak", box(b"mdia", box(b"minf", box(b"stbl", stco)))))
    ftyp = box(b"ftyp", b"isom" + b"\0" * 12)
    data = ftyp + box(b"mdat", media) + moov
    out = narrated.faststart(data)
    assert out.find(b"moov") < out.find(b"mdat") and len(out) == len(data)
    i = out.find(b"stco")
    assert int.from_bytes(out[i + 12:i + 16], "big") == 40 + len(moov)                           # the chunk moved with the media
    assert narrated.faststart(out) == out                                                        # already in front: unchanged

