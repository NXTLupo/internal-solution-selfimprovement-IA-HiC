"""The pages locally written documents are shown on: a persona set, a competitive gap analysis, any other document."""
import json

from ia_next import artifacts, docpage, localartifact, providers

TITLES = {"S1": "Higher Ed Dive: How to navigate AI adoption", "S2": "r/college: Tips for syllabus week", "S3": "Pew Research Center: How Teens Use and View AI"}

PERSONAS = {
    "title": "Students split by how they treat the rules, not by how much they use AI",
    "standfirst": "Three kinds of student use the same tools for different jobs [S1].",
    "dimensions": [{"name": "What AI is for", "low": "Understanding", "high": "Finishing"},
                   {"name": "Treatment of rules", "low": "Checks first", "high": "Acts first"}],
    "personas": [
        {"name": "The rule-checking first-year", "who": "A first-year in a writing course who fears a misconduct charge [S1].",
         "quote": {"text": "I read the syllabus twice before I open the chatbot.", "source_id": "S2"},
         "positions": [{"dimension": "What AI is for", "value": 1}, {"dimension": "treatment of rules", "value": 1}],
         "goals": ["Understand a reading before class [S1].", "Stay inside the course rule [S2]."],
         "behaviours": ["Asks the tool to explain a concept, then checks the textbook [S1]."],
         "frustrations": ["Each course states a different rule [S2]."], "needs": ["One place that says what each course allows [S2]."],
         "tools": ["ChatGPT", "The syllabus"], "scenario": "She opens the assignment. She reads the rule. She asks for an outline and writes the draft herself [S1].",
         "implications": ["Publish each course's rule where assignments are posted [S2]."]},
        {"name": "The deadline-driven senior", "who": "A senior with a job and four courses [S3].",
         "quote": {"text": "I use it when I have two hours left.", "source_id": "S2"},
         "positions": [{"dimension": "What AI is for", "value": 5}, {"dimension": "Treatment of rules", "value": 4}],
         "goals": ["Submit on time [S3].", "Keep the grade [S3]."], "behaviours": ["Drafts with the tool the night before [S3]."],
         "frustrations": [], "needs": ["Assignments that say why the work matters [S1]."], "tools": [], "scenario": "",
         "implications": ["Design assessments around the process [S1]."]}],
    "closing": {"heading": "The set asks for rules a student can find", "paragraphs": ["Both personas lose time to unclear rules [S1] [S2]."]}}

COMPETITIVE = {
    "title": "Peer universities publish AI rules a typical university still leaves to each syllabus",
    "standfirst": "Named peers set a disclosure standard and train faculty [S1].", "takeaways": ["Peers lead on disclosure [S1].", "Training is the widest gap [S3]."],
    "subject": {"name": "A typical university", "summary": "Rules live in each syllabus [S2]."},
    "competitors": [{"name": "Arizona State University", "kind": "Public university", "summary": "Signed a campus licence [S1]."},
                    {"name": "University of Michigan", "kind": "Public university", "summary": "Built its own assistant [S3]."}],
    "matrix": [{"capability": "Rules a student can find", "why_it_matters": "Students act on the rule they can see [S2].", "cells": [
                    {"who": "A typical university", "rating": "behind", "evidence": "Each instructor sets a rule [S2]."},
                    {"who": "Arizona State University", "rating": "leads", "evidence": "One standard applies to every course [S1]."},
                    {"who": "University of Michigan", "rating": "no evidence", "evidence": ""}]},
               {"capability": "Faculty training", "why_it_matters": "", "cells": [
                   {"who": "a typical university", "rating": "on par", "evidence": "Workshops run each term [S1]."}]},
               {"capability": "Assessment redesign", "why_it_matters": "", "cells": [{"who": "A typical university", "rating": "behind", "evidence": "Essays are unchanged [S3]."}]}],
    "case_studies": [{"organization": "Arizona State University", "what_they_did": "Licensed a tool for all students [S1].", "what_changed": "Access evened out [S1].",
                      "what_transfers": "A licence removes the paid-tier gap [S1].", "quote": {"text": "Every student has the same tool on day one.", "source_id": "S1"}}],
    "gaps": [{"gap": "Findable rules", "today": "In each syllabus [S2].", "leaders_do": "One standard [S1].", "close_it_by": "The provost sets a standard [S1].", "priority": "first"},
             {"gap": "Training", "today": "Optional [S3].", "leaders_do": "Required [S1].", "close_it_by": "Deans fund it [S1].", "priority": "later"}],
    "closing": {"heading": "Rules come before training", "paragraphs": ["Start with the standard [S1]."]}}

DOCUMENT = {"title": "The provost should set one disclosure standard", "standfirst": "A single rule ends the guessing [S1].",
            "takeaways": ["Set one standard [S1].", "Train faculty next [S3]."],
            "sections": [{"heading": "Students cannot find the rule", "key_point": "Each course states a different rule [S2].",
                          "paragraphs": ["Instructors set rules course by course [S2].", "Students ask peers [S1]."],
                          "quotes": [{"text": "I read the syllabus twice before I open the chatbot.", "source_id": "S2"}],
                          "table": {"columns": ["Decision", "Owner"], "rows": [["Set the standard [S1]", "Provost"], ["Train faculty", "Deans"], ["a", "b"], ["c", "d"], ["e", "f"]]}},
                         {"heading": "Faculty need training", "key_point": "Training is optional today [S3].", "paragraphs": ["x [S3]."], "quotes": [], "table": {"columns": [], "rows": []}},
                         {"heading": "Assessment must change", "key_point": "", "paragraphs": ["y [S1]."], "quotes": [], "table": {"columns": [], "rows": []}}]}
SOURCES = [{"id": "S2", "text": "I read the syllabus twice before I open the chatbot. I use it when I have two hours left."},
           {"id": "S1", "text": "Every student has the same tool on day one."}]


def test_a_persona_set_is_drawn_as_research_persona_cards():
    page = docpage.personas(json.loads(json.dumps(PERSONAS)), "Personas", "nxt", TITLES)
    assert page.count('role="tab"') == 3 and page.count('data-panel="p') == 2 and 'data-panel="compare"' in page
    for part in ("What they do", "What blocks them", "What they need", "A typical episode", "Design for this persona", "Tools and channels"):
        assert part in page
    assert page.count('class="dim"') == 4                       # two dimensions on each of two personas, matched whatever the case
    assert 'aria-label="What AI is for: 5 of 5' in page
    assert artifacts.unverified_quotes(page, SOURCES) == []      # the quote check reads every quote on the page
    assert 'href="#src-S2"' in page and 'id="src-S2"' in page


def test_a_competitive_gap_analysis_is_tables_cases_and_gaps():
    page = docpage.competitive(json.loads(json.dumps(COMPETITIVE)), "Competitive gap analysis", "nxt", TITLES)
    assert page.count("<tr data-behind=") == 3 and page.count('<tr data-behind="1"') == 2
    assert page.count('<details><summary><span class="rate') >= 4
    assert "r-no-evidence" in page and "Case study" in page and page.count("data-priority=") == 2
    assert "What transfers" in page and "How to close it" in page
    assert artifacts.unverified_quotes(page, SOURCES) == []


def test_any_document_folds_to_its_points_and_filters_its_tables():
    page = docpage.document(json.loads(json.dumps(DOCUMENT)), "Recommendations", "nu", TITLES)
    assert page.count('<details class="block sec"') == 3 and page.count(" open>") == 3   # complete without scripts
    assert "The points to take away" in page and 'data-filter="t1"' in page and "data-fold" in page
    assert 'data-brand="nu"' in page and artifacts.unverified_quotes(page, SOURCES) == []


def test_structured_documents_are_checked_for_shape_and_cleared_of_figures(monkeypatch):
    bad = json.loads(json.dumps(PERSONAS))
    bad["personas"] = bad["personas"][:1]
    assert localartifact.shaped_ok("personas", bad)
    assert localartifact.shaped_ok("personas", json.loads(json.dumps(PERSONAS))) == ""
    assert localartifact.shaped_ok("gap", json.loads(json.dumps(COMPETITIVE))) == ""
    doc = json.loads(json.dumps(PERSONAS))
    doc["personas"][0]["goals"][0] = "About 92% of students want to understand a reading before the class meets [S1]."
    doc["personas"][0]["quote"]["text"] = "I applied to 60 co-ops and heard back from 4."
    monkeypatch.setattr(providers, "chat", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))
    out = localartifact.no_figures(doc, "", "m")
    assert out["personas"][0]["goals"] == ["Stay inside the course rule [S2]."]            # the sentence with the figure is gone
    assert out["personas"][0]["quote"]["text"].startswith("I applied to 60")               # a quote keeps its figure
    assert out["personas"][0]["name"] == "The rule-checking first-year"


def test_an_export_shows_every_section_open_with_no_controls():
    page = docpage.document(json.loads(json.dumps(DOCUMENT)), "Recommendations", "nxt", TITLES)
    out = docpage.for_export(page.replace(" open>", ">", 1))
    assert "<script" not in out and out.count("<details") == out.count(" open>") == 3
    assert ".bar,.tabs,.toolrow" in out and artifacts.unverified_quotes(out, SOURCES) == []


def test_a_persona_set_is_written_in_steps_and_survives_a_failed_step():
    calls = []

    def ask(model, system, msg, schema):
        calls.append((msg, sorted(schema["properties"])))
        assert msg.startswith("<material>")                       # the material first, so its reading is reused
        if "detail for one persona" not in msg:
            return json.dumps({"title": PERSONAS["title"], "standfirst": "s", "dimensions": PERSONAS["dimensions"], "closing": PERSONAS["closing"],
                               "personas": [{"name": p["name"], "who": p["who"], "positions": p["positions"]} for p in PERSONAS["personas"]]})
        if "deadline-driven" in msg.split("one persona only")[1]:
            raise providers.ProviderError("down")
        p = PERSONAS["personas"][0]
        return json.dumps({k: p[k] for k in ("quote", "goals", "behaviours", "frustrations", "needs", "tools", "scenario", "implications")})
    doc = localartifact._steps("personas", "g", "corpus", "m", ask)
    assert len(calls) == 3 and "personas" in calls[0][1] and "goals" in calls[1][1]
    assert doc["personas"][0]["goals"] and "goals" not in doc["personas"][1]
    assert localartifact.shaped_ok("personas", doc)               # one whole persona is not a set: said, never shown thin


def test_a_competitive_analysis_is_written_in_three_steps():
    seen = []

    def ask(model, system, msg, schema):
        keys = sorted(schema["properties"])
        seen.append(keys)
        return json.dumps({k: COMPETITIVE[k] for k in keys})
    doc = localartifact._steps("gap", "g", "corpus", "m", ask)
    assert seen[1] == ["matrix"] and seen[2] == ["case_studies", "gaps"] and localartifact.shaped_ok("gap", doc) == ""


def test_a_persona_with_a_lifestyle_photograph_leads_with_it(monkeypatch):
    from ia_next import localmedia, media
    doc = json.loads(json.dumps(PERSONAS))
    doc["personas"][0]["portrait"] = "A first-year in a hooded sweatshirt reads a printed syllabus at a library table by a window, pen in hand."
    asked = []
    monkeypatch.setattr(localmedia, "available", lambda wait=0: True)
    monkeypatch.setattr(media, "image_prompt", lambda s: s)
    monkeypatch.setattr(localmedia, "image", lambda prompt, size: (asked.append(prompt) or b"not-a-real-png", "test"))
    assert localartifact.lifestyle_images(doc) == 2 and "hooded sweatshirt" in asked[0] and "deadline-driven senior" in asked[1]
    page = docpage.personas(doc, "Personas", "nxt", TITLES)
    assert page.count('class="who life"') == 2 and 'alt="A typical moment for The rule-checking first-year"' in page
    assert artifacts.unverified_quotes(page, SOURCES) == []
    assert all(c is not doc["personas"][0] or k not in ("image", "portrait") for c, k in localartifact.prose_slots(doc))
    monkeypatch.setattr(localmedia, "available", lambda wait=0: False)
    assert localartifact.lifestyle_images(json.loads(json.dumps(PERSONAS))) == 0        # no engine: the set still ships



def test_each_step_of_long_work_is_a_node_the_live_view_can_show():
    from ia_next import store
    eid = store.create_engagement("e", "o")
    tid, _ = store.create_task(eid, "artifact", {"kind": "personas", "goal": "g"}, 1.0)
    store.start_node(tid, "Artifact Studio (local author)", "m", 1)
    with store.stage(tid, "UX Researcher: persona 1 of 3, The rule-checking first-year", "qwen") as st:
        st.say("3 goals, 4 behaviours")
    try:
        with store.stage(tid, "Photographer: lifestyle photograph 1 of 3", "comfyui") as st:
            raise providers.ProviderError("engine down")
    except providers.ProviderError:
        pass
    with store.stage("", "no task", "m") as st:                    # outside a task nothing is recorded and nothing breaks
        st.say("x")
    nodes = store.get_task(tid)["nodes"]
    assert [n["specialist"].split(":")[0] for n in nodes] == ["Artifact Studio (local author)", "UX Researcher", "Photographer"]
    assert nodes[1]["state"] == "available" and nodes[1]["summary"] == "3 goals, 4 behaviours" and nodes[1]["model"] == "qwen"
    assert nodes[2]["state"] == "failed" and "engine down" in nodes[2]["error"]


ARCH = {"title": "Course rules live where no system students use can read them", "standfirst": "s [S1].", "takeaways": ["t [S1]."],
        "zones": [{"name": "People", "role": "r"}, {"name": "Applications", "role": "r"}, {"name": "Data", "role": "r"}],
        "components": [{"name": "Student", "zone": "People", "does": "Writes [S2].", "holds": ""}, {"name": "Canvas", "zone": "applications", "does": "Posts [S1].", "holds": "Assignments"},
                       {"name": "ChatGPT", "zone": "Applications", "does": "Explains [S2].", "holds": ""}, {"name": "Syllabus files", "zone": "Data", "does": "Hold rules [S1].", "holds": "Rules"},
                       {"name": "Orphan", "zone": "Nowhere", "does": "x", "holds": ""}],
        "flows": [{"source": "Student", "target": "Canvas", "carries": "submitted work"}, {"source": "canvas", "target": "Syllabus files", "carries": "rule lookups"},
                  {"source": "Student", "target": "Ghost", "carries": "nothing"}],
        "failures": [{"where": "Syllabus files", "what_fails": "No application reads the rule [S2].", "who_it_hurts": "Students [S2].",
                      "quote": {"text": "I read the syllabus twice before I open the chatbot.", "source_id": "S2"}}],
        "target": [{"change": "Store each rule as data [S1].", "why": "w", "owner": "The registrar"}]}


def test_an_architecture_is_zones_components_and_flows_that_name_real_things():
    assert localartifact.shaped_ok("arch", json.loads(json.dumps(ARCH))) == ""
    page = docpage.architecture(json.loads(json.dumps(ARCH)), "Architecture", "nxt", TITLES)
    assert page.count('class="zone"') == 3 and page.count('class="comp"') == 4            # a component in no zone is not drawn
    assert page.count("<tr data-a=") == 2                                                   # a flow to an unknown component is dropped
    assert '"t": "submitted work"' in page and "What moves" in page and "The registrar" in page
    assert artifacts.unverified_quotes(page, SOURCES) == []
    thin = dict(ARCH, zones=ARCH["zones"][:1])
    assert localartifact.shaped_ok("arch", json.loads(json.dumps(thin)))


def test_a_schema_is_bounded_so_no_field_can_run_on():
    s = localartifact.bounded(localartifact.PERSONA_SCHEMA)
    per = s["properties"]["personas"]["items"]["properties"]
    assert per["scenario"]["maxLength"] == 700 and per["goals"]["maxItems"] == 8 and s["properties"]["personas"]["maxItems"] == 8
    assert per["motivations"]["maxItems"] == 5                                   # a tighter limit already set is kept
    assert "maxLength" not in localartifact.bounded({"type": "string", "enum": ["a"]})
    assert "maxLength" not in localartifact.PERSONA_SCHEMA["properties"]["title"]   # the original is not changed


def test_a_citation_closes_and_sits_after_the_full_stop():
    from ia_next import docpage
    titles = {"S1": "Higher Ed Dive: How to navigate AI adoption", "__order__": []}
    out = docpage.cite("Rules live in each syllabus [S1]. Many institutions discourage AI use [S1].", titles)
    assert out.count("<sup") == out.count("</sup>") == 2                 # every footnote closes
    assert "syllabus.<sup" in out and "use.<sup" in out                  # the number follows the full stop
    assert not any(ord(c) < 32 for c in out)
    assert "</sup> Many" in out                                           # and the next sentence keeps its space


def test_a_quote_split_by_pdf_spacing_is_not_flagged_and_a_long_flagged_quote_is_kept_whole():
    from ia_next import artifacts
    long_q = "Educators of first-year writing may opt for a restrictive or critical engagement model, ensuring students develop core writing skills before introducing AI into the process."
    src = [{"id": "S1", "text": "How to Use This Guide Educators of first-year writing may opt for a r estrictive or critical engagement model, ensuring students develop core writing skills before introducing AI into the process."}]
    page = "<p>\u201c" + long_q + "\u201d</p>"
    assert artifacts.unverified_quotes(page, src) == []
    made_up = "This sentence was never written by anyone in any source at all, and it runs well past one hundred and sixty characters so that it would have been cut short."
    got = artifacts.unverified_quotes("<p>\u201c" + made_up + "\u201d</p>", src)
    assert got == [made_up]                                                    # whole, so the repair can find it on the page
    doc, restored, unquoted = artifacts.repair_quotes("<p>\u201c" + made_up + "\u201d</p>", src, got)
    assert unquoted == 1 and "\u201c" not in doc


def test_an_organization_with_no_summary_is_described_by_its_own_evidence():
    from ia_next import slidepage
    doc = {"matrix": [{"capability": "Access", "cells": [{"who": "SJSU", "rating": "leads", "evidence": "SJSU launched AI Everywhere [S1]."}]}]}
    assert slidepage.org_summary(doc, {"name": "SJSU", "summary": ""}) == "SJSU launched AI Everywhere [S1]."
    assert slidepage.org_summary(doc, {"name": "SJSU", "summary": "Own words."}) == "Own words."

