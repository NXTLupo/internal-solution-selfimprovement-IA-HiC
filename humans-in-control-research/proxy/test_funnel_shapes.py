"""Containment and proportion shapes (closeout plan E2 items 3-4, 2026-11-09).

The owner's reference slide ("The Architecture of Agency", slide 2) is an inverted funnel whose three
bands each carry a label AND its explanation INSIDE the geometry. HiC could not draw that at all: the
brick canon was grids, rows and arcs, and the kind "funnel" was aliased to a journey swimlane. These
pins cover the new families and the routing fix.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nxt_diagram_render as R  # noqa: E402

PAL = {
    "accent": "#B8B800", "ink": "#141414", "cyan": "#00B7C3", "rail": "#0D0D0D",
    "paper": "#FFFFFF", "kicker": "#00B7C3", "warn": "#CC6644", "wash_warn": "#FAF1EC",
    "wash_cool": "#EBF7F8", "band": "#B8B800", "band_text": "#0D0D0D", "grey": "#73757A",
    "hairline": "#DDDDD6", "teal": "#115054", "title_face": "Archivo", "body_face": "Archivo",
    "mono_face": "IBM Plex Mono", "disp_face": "Saira Condensed",
    "bg": "#FFFFFF", "fg": "#141414", "brand": "nxt",
}

FUNNEL = {
    "kind": "funnel", "kicker": "SCREENING", "title": "Most applications never reach a human reader",
    "takeaway": "Knockout questions reject before any reader opens the file.",
    "stages": [
        {"name": "Hard knockout questions", "detail": "Location, work authorisation and an experience floor reject the file first."},
        {"name": "Keyword matching", "detail": "The tracking system scores the resume against the posting."},
        {"name": "Human review", "detail": "A recruiter reads what survives."},
    ],
}


class TestRouting:
    def test_funnel_is_a_funnel_not_a_journey_swimlane(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert 'class="fnl"' in html
        assert 'class="jmap"' not in html
        assert "Customer Journey" not in html

    def test_journey_still_routes_to_the_journey_body(self):
        html = R.diagram_html({"kind": "journey", "title": "T", "stages": [{"name": "A"}, {"name": "B"}]}, PAL)
        assert 'class="fnl"' not in html

    @pytest.mark.parametrize("kind", ["funnel", "pyramid", "nested"])
    def test_each_new_kind_is_registered(self, kind):
        assert kind in R._INFO_BODIES


class TestFunnelGeometry:
    def test_every_stage_renders_a_band(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert html.count('class="fband') == 3

    def test_labels_and_details_sit_inside_the_band(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert "Hard knockout questions" in html
        assert "reject the file first" in html
        band = html[html.index('class="fband"'):]
        assert 'class="fbl"' in band and 'class="fbd"' in band

    def test_bands_narrow_downward_so_the_shape_carries_the_claim(self):
        html = R.diagram_html(FUNNEL, PAL)
        import re
        # Each band emits clip-path AND -webkit-clip-path, so take every other match.
        clips = re.findall(r'polygon\(([\d.]+)% 0', html)[::2]
        assert len(clips) == 3
        assert float(clips[0]) < float(clips[1]) < float(clips[2])

    def test_a_pyramid_widens_downward(self):
        import re
        html = R.diagram_html({**FUNNEL, "kind": "pyramid"}, PAL)
        clips = re.findall(r'polygon\(([\d.]+)% 0', html)[::2]
        assert float(clips[0]) > float(clips[-1])

    def test_bands_are_near_empty_dark_panels_per_the_funnelFlow_canon(self):
        # 2026-11-09 v3, read from the REAL design-system component (NXT Humans viz/funnelFlow,
        # node 764:349): bands are cyan hairline OUTLINES over a barely-lifted dark fill. v1 filled
        # every band with a saturated brand hue, which is what read as childish.
        tints = R._band_tints(PAL, 3)
        expected = [R._hex_tint(PAL["rail"], 0.10 + (0.05 * i / 2)) for i in range(3)]
        assert tints == expected
        for t in tints:
            assert t.startswith("#") and len(t) == 7

    def test_only_the_final_band_spends_the_accent(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert html.count('class="fband last"') == 1
        exhibit = html.split('class="fnl"')[1]
        assert exhibit.count(PAL["accent"]) == 1

    def test_the_exhibit_sits_on_the_rail_with_registration_marks(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert PAL["rail"] in html
        for corner in ("reg tl", "reg tr", "reg bl", "reg br"):
            assert corner in html

    def test_each_band_edge_is_a_hairline_outline_in_the_brand_cyan(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert html.count('class="fedge"') == 2  # every band but the filled last one
        assert f'stroke="{PAL["cyan"]}"' in html

    def test_text_is_inset_to_the_band_narrow_edge_so_it_cannot_clip(self):
        # live v3 defect: "...against the postin" ran outside the trapezoid and was clipped.
        html = R.diagram_html(FUNNEL, PAL)
        assert "padding-left:calc(" in html and "padding-right:calc(" in html

    def test_tinting_keeps_the_hue_and_only_lightens(self):
        assert R._hex_tint("#115054", 0.0) == "#115054"
        assert R._hex_tint("#115054", 1.0) == "#FFFFFF"
        mid = R._hex_tint("#115054", 0.5)
        assert mid != "#115054" and mid != "#FFFFFF"

    def test_tinting_survives_a_malformed_colour(self):
        assert R._hex_tint("nonsense", 0.5) == "nonsense"

    def test_a_single_stage_draws_nothing_rather_than_a_fake_funnel(self):
        assert R._funnel_body({"stages": [{"name": "Only one"}]}, PAL) == ""

    def test_accepts_the_steps_spelling_callers_already_use(self):
        html = R.diagram_html({"kind": "funnel", "title": "T", "steps": [{"name": "A"}, {"name": "B"}]}, PAL)
        assert html.count('class="fband') == 2

    def test_stage_text_is_escaped(self):
        html = R.diagram_html({**FUNNEL, "stages": [{"name": "<img src=x onerror=1>"}, {"name": "B"}]}, PAL)
        assert "<img src=x" not in html
        assert "&lt;img" in html

    def test_caps_at_five_bands_so_the_tip_stays_legible(self):
        many = [{"name": f"Stage {i}"} for i in range(9)]
        html = R.diagram_html({"kind": "funnel", "title": "T", "stages": many}, PAL)
        assert html.count('class="fband') == 5


class TestNested:
    def test_layers_nest_outermost_first_with_the_core_innermost(self):
        html = R.diagram_html({"kind": "nested", "title": "T", "layers": [
            {"name": "Institution"}, {"name": "Service"}, {"name": "Student record"}]}, PAL)
        assert html.count('class="nring"') == 2
        assert html.index("Institution") < html.index("Service") < html.index("Student record")
        assert 'class="ncore"' in html

    def test_fewer_than_two_layers_draws_nothing(self):
        assert R._nested_body({"layers": [{"name": "Alone"}]}, PAL) == ""


class TestHouseStyle:
    def test_no_absolute_node_coordinates_so_collisions_are_impossible(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert ".fband{position:relative" in html.replace("\n", "")

    def test_the_takeaway_and_title_survive(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert "Most applications never reach a human reader" in html
        assert "Knockout questions reject" in html


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))


class TestArchConnectors:
    """E2 item 5: the architecture exhibit could not say WHAT moves between tiers."""

    ARCH = {
        "kind": "arch", "title": "T", "kicker": "K", "flowSummary": "S",
        "layers": [
            {"name": "Experience", "nodes": [{"label": "Student Hub"}], "flowTo": "signed session cookie"},
            {"name": "Gateway", "nodes": [{"label": "Identity Gateway"}], "flowTo": "trusted identity headers"},
            {"name": "Services", "nodes": [{"label": "Co-op Service"}]},
        ],
    }

    def test_each_declared_flow_renders_a_connector_label(self):
        html = R.diagram_html(self.ARCH, PAL)
        assert "signed session cookie" in html
        assert "trusted identity headers" in html
        assert html.count('class="tcl"') == 2

    def test_a_layer_without_a_flow_still_gets_a_plain_arrow(self):
        spec = {**self.ARCH, "layers": [
            {"name": "A", "nodes": [{"label": "N1"}]},
            {"name": "B", "nodes": [{"label": "N2"}]},
        ]}
        html = R.diagram_html(spec, PAL)
        assert html.count('class="tierconn"') == 1
        assert 'class="tcl"' not in html

    def test_the_label_lives_in_the_connector_cell_not_over_a_node(self):
        html = R.diagram_html(self.ARCH, PAL)
        seg = html[html.index('class="tierconn"'):]
        assert seg.index('class="tcl"') < seg.index('class="tier"')

    def test_flow_text_is_escaped(self):
        spec = {**self.ARCH, "layers": [
            {"name": "A", "nodes": [{"label": "N1"}], "flowTo": "<img src=x onerror=1>"},
            {"name": "B", "nodes": [{"label": "N2"}]},
        ]}
        html = R.diagram_html(spec, PAL)
        assert "<img src=x" not in html
        assert "&lt;img" in html


class TestBrandIsolation:
    """2026-11-09 (owner: "why are you using Deciem rules in NXT template?" / "#NXT!").

    No DECIEM colour or face was ever APPLIED to an NXT exhibit, but every exhibit used to REGISTER
    all three brands' @font-face blocks, so an NXT document declared DECIEM and NU type. Registration
    is now scoped to the active brand.
    """

    NU = {**PAL, "brand": "nu", "accent": "#C8102E", "rail": "#0E1626", "teal": "#16233C"}
    DECIEM = {**PAL, "brand": "deciem", "accent": "#FB48C4", "rail": "#000000"}

    def _families(self, pal):
        import re
        html = R.diagram_html(FUNNEL, pal)
        return set(re.findall(r"@font-face\{font-family:'([^']+)'", html))

    def test_an_nxt_exhibit_registers_only_nxt_faces(self):
        fams = self._families(PAL)
        assert fams and all(f.startswith("NXT ") for f in fams), fams

    def test_an_nu_exhibit_registers_only_nu_faces(self):
        fams = self._families(self.NU)
        assert fams and all(f.startswith("NU ") for f in fams), fams

    def test_a_deciem_exhibit_registers_only_deciem_faces(self):
        fams = self._families(self.DECIEM)
        assert fams and all(f.startswith("DECIEM ") for f in fams), fams

    def test_no_deciem_colour_reaches_an_nxt_exhibit(self):
        html = R.diagram_html(FUNNEL, PAL)
        for deciem_hex in ("#FB48C4", "#00FACC", "#8A69D4", "#FF6C2F"):
            assert deciem_hex not in html

    def test_an_unknown_brand_still_gets_every_face_rather_than_none(self):
        fams = self._families({**PAL, "brand": "mystery"})
        assert any(f.startswith("NXT ") for f in fams)


class TestExhibitArtwork:
    """2026-11-09 (owner: the exhibit "does not yet have the illustrative richness").

    Each stage may carry a generated illustration. It renders in the GUTTER, where the column width
    is constant, so artwork is never clipped by the narrowing shape.
    """

    def _with_art(self):
        stages = []
        for i, (nm, dt) in enumerate([("Knockout questions", "Form filters."),
                                      ("Keyword matching", "Scored."),
                                      ("Human review", "A recruiter reads.")]):
            stages.append({"name": nm, "detail": dt, "image": f"data:image/png;base64,AAA{i}"})
        return {**FUNNEL, "stages": stages}

    def test_each_stage_artwork_renders_in_the_gutter(self):
        html = R.diagram_html(self._with_art(), PAL)
        assert html.count('class="aw"') == 3
        assert html.count("data:image/png;base64,AAA") == 3
        assert 'class="fnlgrid withart"' in html

    def test_artwork_sits_outside_the_clipped_shape(self):
        html = R.diagram_html(self._with_art(), PAL)
        assert html.index('class="fnlart"') < html.index('class="fnl"')

    def test_an_exhibit_without_artwork_keeps_the_three_column_layout(self):
        html = R.diagram_html(FUNNEL, PAL)
        assert 'class="aw"' not in html
        # the .withart CSS rule always ships; the GRID ELEMENT must not carry the class
        assert 'class="fnlgrid withart"' not in html
        assert 'class="fnlgrid"' in html

    def test_a_hostile_artwork_src_is_escaped(self):
        spec = {**FUNNEL, "stages": [{"name": "A", "image": '"><script>alert(1)</script>'},
                                     {"name": "B"}, {"name": "C"}]}
        html = R.diagram_html(spec, PAL)
        assert "<script>alert(1)" not in html
