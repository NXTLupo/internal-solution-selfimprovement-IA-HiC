"""The detail asked for reaches every builder, and thin evidence is said before the work is made (QA 25 Nov, E3, E7)."""
from ia_next import citations, deckstudio, depthlevel, journeymap


def test_the_level_comes_from_the_card_or_the_requests_words():
    assert depthlevel.of({"density": "detailed"}) == "detailed"
    assert depthlevel.of({"depth": "deep"}) == "detailed"
    assert depthlevel.of({}, "Make a detailed deck on port congestion") == "detailed"
    assert depthlevel.of({}, "Make a concise briefing on port congestion") == "concise"
    assert depthlevel.of({}, "Make a deck on port congestion") == "standard"
    assert depthlevel.of({"level": "concise", "depth": "deep"}) == "concise"          # decided once, then kept


def test_thin_evidence_is_named_for_any_kind_of_output():
    said = depthlevel.thin("start_journey_map", "detailed", 6, 9)
    assert "thin for a detailed journey map" in said and "6 sources" in said
    assert depthlevel.thin("start_journey_map", "detailed", 24, 33) == ""
    assert depthlevel.thin("start_deck", "standard", 12, 20) == ""
    assert "deck" in depthlevel.thin("start_deck", "detailed", 12, 20)
    assert depthlevel.thin("generate_image", "detailed", 0, 0) == ""


def test_a_detailed_journey_map_has_more_phases_and_quotes():
    std, det = journeymap.spec("a shift nurse"), journeymap.spec("a shift nurse", "detailed")
    assert "four to six" in std.system and "six to eight" in det.system and "two or three more verbatim quotes" in det.system
    assert journeymap.FRAME["properties"]["phases"]["maxItems"] == 6          # the shared schema is not changed


def test_a_deck_lists_what_it_cites_with_publication_and_date():
    sources = [{"id": f"S{i}", "title": f"Freight Weekly: Port story {i}", "publisher": "Freight Weekly", "date": "2026-11-2%d" % (i % 9), "url": ""} for i in range(1, 10)]
    slides = [{"cites": [], "source_id": ""}, {"cites": ["S1", "S2"], "source_id": ""}, {"cites": ["S3"], "source_id": "S4"},
              {"cites": ["S5", "S6", "S7", "S8"], "source_id": ""}]
    out = deckstudio.sources_slides(slides, sources)
    assert len(out) == 2 and len(out[0]["table"]["rows"]) == 4 and out[0]["layout"] == "table" and out[0]["table"]["columns"] == ["Publication", "Article", "Published"]
    assert out[0]["table"]["rows"][0] == ["Freight Weekly", "Port story 1", "21 November 2026"]
    assert "8 of the 9 sources held" in out[0]["subtitle"]
    assert deckstudio.sources_slides([{"cites": [], "source_id": ""}], sources) == []


def test_a_page_says_what_it_is_built_on():
    page = '<section class="block srcs"><p class="k">Sources</p><ol><li id="src-S1">A</li><li id="src-S2">B</li></ol></section>'
    src = [{"id": "S1", "title": "A", "publisher": "Freight Weekly", "date": "2026-11-03"},
           {"id": "S2", "title": "B", "publisher": "Port Review", "date": "2026-11-24"}, {"id": "S3", "title": "C", "publisher": "X"}]
    out = citations.enrich(page, src, 31)
    assert "Built on 2 of the 3 sources this engagement holds and 31 checked findings, from 2 publications, published 3 November 2026 to 24 November 2026." in out
    assert citations.enrich(out, src, 31) == out


def test_a_document_section_reads_only_the_sources_its_plan_names():
    from ia_next import localartifact
    corpus = ("CHECKED FINDINGS\n- Ports are congested [S1]\n- Rail is slow [S2]\n- A note with no source\n"
              + "".join(f'<source id="S{i}" title="T{i}">text of source {i}</source>\n' for i in (1, 2, 3)))
    own = localartifact.only_sources(corpus, {"S1", "S3"})
    assert "text of source 1" in own and "text of source 3" in own and "text of source 2" not in own
    assert "Ports are congested" in own and "Rail is slow" not in own and "A note with no source" in own
    assert localartifact.only_sources(corpus, {"S9"}) == corpus and localartifact.only_sources("plain text", {"S1"}) == "plain text"


def test_work_made_on_thin_evidence_says_so_on_the_page():
    page = '<section class="block srcs"><ol><li id="src-S1">A</li></ol></section>'
    src = [{"id": "S1", "title": "A", "publisher": "Freight Weekly", "date": "2026-11-03"}]
    out = citations.enrich(page, src, 5, depthlevel.thin("start_journey_map", "detailed", 1, 5))
    assert "This is thin evidence for a detailed journey map" in out
