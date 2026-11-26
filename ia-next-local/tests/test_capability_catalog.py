"""The page's capability catalog stays true to what the agent can do (2026-11-19 information architecture pass).

web/catalog.js is the one list the home page, the composer's Make menu and the composer coaching read. These checks
fail when the agent gains an artifact kind the page does not offer, or when the page's request templates would send an
unfilled slot, so the interface never under- or over-states the agent."""
import os
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")


def _read(name):
    path = os.path.join(WEB, name)
    if not os.path.exists(path):
        pytest.skip("web folder not mounted")
    return open(path, encoding="utf-8").read()


def test_every_artifact_kind_the_agent_makes_is_offered_on_the_page():
    from ia_next import artifacts
    js = _read("catalog.js")
    docs = re.search(r"export const DOCS = \[(.*?)\];", js, re.S).group(1)
    offered = set(re.findall(r"\['([a-z-]+)', '", docs))
    assert offered == set(artifacts.KINDS) - {"mindmap"}          # the mind map has its own item
    assert "#mindmap" in js


def test_the_catalog_covers_each_kind_of_work_the_agent_starts():
    js = _read("catalog.js")
    for word in ("Researched report", "Reddit listening", "Your files", "Slide deck", "Documents", "Journey map", "Themes",
                 "Mind map or infographic", "Data table", "Audio overview", "Clickable prototype", "Images", "Short video clip",
                 "Scheduled watch", "Memory", "Email a result"):
        assert f"title: '{word}'" in js, word


def test_every_slot_in_a_request_template_is_bracketed_and_short():
    js = _read("catalog.js")
    asks = re.findall(r"ask: '([^']*)'", js) + re.findall(r'ask: "([^"]*)"', js)
    assert len(asks) >= 15
    for a in asks:
        assert a.count("[") == a.count("]"), a
        assert all(len(s) <= 48 for s in re.findall(r"\[([^\]]*)\]", a)), a


def test_the_page_wires_the_make_menu_coaching_and_slots():
    page = _read("index.html")
    for el in ('id="makeBtn"', 'id="coach"', 'id="packBtn"', 'id="attachBtn"'):
        assert el in page, el
    # one panel paradigm: nothing opens over the chat; Make and Data packs open the right-hand flyout
    assert 'class="popover' not in page and 'id="packPanel"' not in page and 'id="studio"' not in page
    assert "openSheet" in _read("make.js") and "openSheet" in _read("packs.js")
    # the engagement a request is for is chosen in the message box (owner, 2026-11-19)
    assert 'id="engBtn"' in page and "openEngagementPicker" in _read("app.js") and "'/api/engagements', { method: 'POST'" in _read("app.js")
    app = _read("app.js")
    assert "from './catalog.js'" in app and "from './make.js'" in app
    assert "selectSlot(e.shiftKey)" in app and "slotRanges(text)" in app        # Tab moves; an open slot is never sent


def test_every_choice_the_old_studio_tiles_offered_lives_in_a_capability_panel():
    """2026-11-19 (owner): the Studio tiles repeated the home tiles, so they were folded into each capability's panel.
    Every steering choice they had must still be there: deck style and brand, audio format and length, mind map or
    infographic with orientation and detail, the table's comparison, the prototype's audience, and the report formats
    (now document kinds)."""
    js = _read("catalog.js")
    opts = js[js.index("export const OPTIONS = {"):js.index("/** HiC's artifact studio kinds")]
    for choice in ("'Detailed', 'Presenter'", "'NXT', 'Northeastern', 'DECIEM'", "'Deep dive', 'Brief', 'Critique', 'Debate'",
                   "'Default', 'Short', 'Long'", "'Mind map', 'Infographic'", "'Landscape', 'Portrait', 'Square'",
                   "'Standard', 'Concise', 'Detailed'", "['compare', null", "['for', null"):
        assert choice in opts, choice
    for kind in ("'brief', 'Executive brief'", "'explainer', 'Explainer'", "'whitepaper', 'White paper'", "'report', 'Report'"):
        assert kind in js, kind
    studio = _read("studio.js")
    assert "TILES" not in studio and "studioSection" not in studio          # the right panel is Sources only
    assert "capDetail" in _read("app.js") and "D.detail(" in _read("make.js")  # home tiles and Make share one panel
