"""Concept-cluster exhibit family (plans/gemini-notebook-parity-closeout-2026-11-09.md WS-D2).

The live Gemini Notebook comparison drew six related mechanisms grouped under two headings, a
shape none of the five earlier infographic families covers (a stat row has no grouping, a process
flow implies sequence, a comparison implies two sides). These tests pin the family's structure
and, more importantly, the icon honesty rules that a live probe forced:

  - match on the node NAME only, because a caption's incidental nouns outscore the concept
    (the probe put a CLOCK on "Proof-based task settlement" via the word "when"),
  - drop function words first (the preposition "over" partial-matched the tag "oversight"),
  - and show icons for the whole exhibit or for none of it, never a partial set.

Run: pytest proxy/test_concept_cluster.py
"""
import os
import re
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import nxt_diagram_render as R  # noqa: E402


PAL = {
    "accent": "#B8B800", "ink": "#141414", "cyan": "#00B7C3", "rail": "#0D0D0D",
    "paper": "#FFFFFF", "kicker": "#00B7C3", "warn": "#CC6644", "wash_warn": "#FAF1EC",
    "wash_cool": "#EBF7F8", "band": "#B8B800", "band_text": "#0D0D0D", "grey": "#73757A",
    "hairline": "#DDDDD6", "title_face": "Archivo", "body_face": "Archivo",
    "mono_face": "IBM Plex Mono", "disp_face": "Saira Condensed",
    "bg": "#FFFFFF", "fg": "#141414", "brand": "nxt",
}

GROUPED = {
    "kind": "concept-cluster", "kicker": "OPERATING MODEL",
    "title": "Agent fleets stay safe through shared memory and human approval",
    "takeaway": "Agents prepare the work; a named human approves every outward action.",
    "groups": [
        {"heading": "Multi-agent architecture", "nodes": [
            {"name": "Shared memory over messaging", "detail": "Agents coordinate through one event log."},
            {"name": "Proof-based task settlement", "detail": "A queue item closes only with proof."}]},
        {"heading": "Human controls", "nodes": [
            {"name": "Mandatory approval gates", "detail": "No agent spends without a human yes."},
            {"name": "Identity-scoped permissions", "detail": "Each agent acts inside its own role."}]},
    ],
}


def render(spec):
    return R.diagram_html(spec, PAL)


class TestStructure:
    def test_every_group_and_node_renders(self):
        html = render(GROUPED)
        assert html.count('class="ccgroup"') == 2
        assert html.count('class="ccnode"') == 4
        assert html.count('class="cch"') == 2

    def test_node_text_is_escaped_not_injected(self):
        spec = dict(GROUPED)
        spec["groups"] = [{"heading": "H", "nodes": [{"name": '<img src=x onerror=alert(1)>', "detail": "d"}]}]
        html = render(spec)
        assert "<img src=x" not in html
        assert "&lt;img" in html

    def test_a_flat_node_list_renders_as_one_group(self):
        html = render({"kind": "cluster", "nodes": [
            {"name": "Alpha", "detail": "a"}, {"name": "Beta", "detail": "b"}, {"name": "Gamma", "detail": "c"}]})
        assert html.count('class="ccnode"') == 3
        assert "ccl one" in html

    def test_an_empty_spec_returns_a_document_rather_than_raising(self):
        assert isinstance(render({"kind": "cluster"}), str)

    def test_the_family_is_reachable_under_each_alias(self):
        for alias in ("concept-cluster", "concept_cluster", "cluster"):
            spec = dict(GROUPED)
            spec["kind"] = alias
            assert 'class="ccl' in render(spec), alias

    def test_layout_is_grid_based_with_no_absolute_node_coordinates(self):
        # The graphic-collision ban: a grid cannot collide, absolute coordinates can.
        html = render(GROUPED)
        body = html[html.index('class="ccl'):]
        assert "grid-template-columns" in html
        assert not re.search(r'\.ccnode\{[^}]*position:absolute', html)


class TestIconHonesty:
    def test_function_words_never_drive_a_match(self):
        # "over" must not reach the tag "oversight".
        assert R._icon_for_concept("Shared memory over messaging", exclude=frozenset()) is None

    def test_a_caption_cannot_outvote_the_concept(self):
        # The live defect: "when ... agent" in the caption put a clock/robot on the node.
        icon = R._icon_for_concept("Proof-based task settlement", exclude=frozenset())
        assert icon not in ("time", "robot")

    def test_a_confident_concept_still_matches(self):
        assert R._icon_for_concept("Identity-scoped permissions", exclude=frozenset()) == "badge"

    def test_exclusion_prevents_the_same_glyph_twice(self):
        assert R._icon_for_concept("Identity-scoped permissions", exclude=frozenset({"badge"})) != "badge"

    def test_an_exhibit_with_any_unmatched_node_shows_no_icons_at_all(self):
        html = render(GROUPED)
        assert html.count('class="ccico"') == 0

    def test_an_exhibit_where_every_node_matches_shows_an_icon_on_each(self):
        spec = {"kind": "concept-cluster", "title": "T", "kicker": "K", "takeaway": "TA",
                "groups": [{"heading": "Controls", "nodes": [
                    {"name": "Identity badge checks", "detail": "d"},
                    {"name": "Budget cost ceilings", "detail": "d"}]}]}
        html = render(spec)
        assert html.count('class="ccnode"') == 2
        assert html.count('class="ccico"') == 2

    def test_no_fallback_glyph_is_ever_substituted(self):
        # Content-true or nothing: an unmatched node must not quietly receive the house glyph.
        spec = {"kind": "cluster", "nodes": [{"name": "Zzzz qqqq wwww", "detail": "no concept here"}]}
        html = render(spec)
        assert html.count('class="ccico"') == 0


class TestHouseStyle:
    def test_no_isometric_depth_or_decorative_shadow(self):
        html = render(GROUPED)
        for banned in ("rotate3d", "perspective(", "skewX", "box-shadow: 0 10px"):
            assert banned not in html, banned

    def test_colour_comes_from_the_palette_not_a_literal(self):
        html = render(GROUPED)
        assert PAL["kicker"] in html and PAL["accent"] in html

    def test_the_takeaway_and_title_survive_into_the_shell(self):
        html = render(GROUPED)
        assert "Agents prepare the work" in html
        assert "Agent fleets stay safe" in html


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
