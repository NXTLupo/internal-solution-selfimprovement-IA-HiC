"""The in-slide architecture family (2026-11-16).

The owner's #slides "Data Architecture" slide was drawn as a Mermaid flowchart: edge labels printed over the
PRODUCT VIEWS label and four product views crammed into one node. Named sources feeding one governed layer
feeding named views is drawn as three CSS-grid columns with every label inside its box (the Gemini Notebook
diagram grammar). The full-page tiered "architecture" exhibit (a layers-of-nodes spec) must keep its own body.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nxt_diagram_render as R  # noqa: E402
from test_funnel_shapes import PAL  # noqa: E402

ARCH = {
    "kind": "data-architecture", "chrome": "none", "frame": {"w": 1600, "h": 560},
    "sources": [{"name": "Ascend", "detail": "gifts, donors, affiliations"}, {"name": "Cvent", "detail": "event attendance"},
                {"name": "Salesforce Marketing Cloud", "detail": "sends and clicks"}],
    "layer": {"name": "Governed data layer", "items": ["Match constituents on stable keys", "Suppress unsafe rates"]},
    "views": [{"name": "Leadership Pulse", "detail": "are we on track"}, {"name": "Audience Workbench", "detail": "approved audiences"}],
}


def test_every_source_and_view_is_its_own_labelled_box():
    html = R.diagram_html(ARCH, PAL)
    assert 'class="archx"' in html
    for name in ("Ascend", "Cvent", "Salesforce Marketing Cloud", "Leadership Pulse", "Audience Workbench", "Governed data layer"):
        assert f"<b>{name}</b>" in html
    assert html.count('class="anode aview"') == 2 and html.count('class="anode "') == 3
    assert "mermaid" not in html                  # never the flowchart lane


def test_architecture_kind_with_sources_and_views_routes_to_the_columns():
    html = R.diagram_html({**ARCH, "kind": "architecture"}, PAL)
    assert 'class="archx"' in html


def test_tiered_architecture_exhibit_keeps_its_own_body():
    html = R.diagram_html({"kind": "architecture", "title": "T", "layers": [
        {"name": "Experience", "nodes": [{"label": "Portal"}]}, {"name": "Data", "nodes": [{"label": "Warehouse"}]}]}, PAL)
    assert 'class="tree"' in html and 'class="archx"' not in html


def test_too_few_parts_draw_nothing_rather_than_a_hollow_frame():
    assert R._architecture_body({"sources": [{"name": "Only one"}], "views": [{"name": "V"}]}, PAL) == ""
