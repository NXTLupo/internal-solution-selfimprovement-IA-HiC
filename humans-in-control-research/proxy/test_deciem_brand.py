"""DECIEM third-brand proxy tests (2026-10-01). Offline: no network, no container, no
Playwright. Covers the token contract, the font manifest, the design-assets guard, the
template-backed PPTX presentation source, and the diagram renderer's brand font stacks.

Run from humans-in-control-research/:  python -m pytest proxy/test_deciem_brand.py -q
"""
import json
import os
import re
import sys
import tempfile
import zipfile

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

TOKENS_PATH = os.path.join(HERE, "..", "hic-workspace", "design-system", "figma-tokens.json")
FONTS_DIR = os.path.join(HERE, "fonts", "static")
DECIEM_DIR = os.path.join(HERE, "..", "hic-workspace", "design-system", "deciem")


@pytest.fixture(scope="module")
def tokens():
    with open(TOKENS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------- (a) token contract

def test_deciem_token_block_shape(tokens):
    blk = tokens.get("DECIEM")
    assert isinstance(blk, dict), "figma-tokens.json must carry a top-level DECIEM block"
    for key in ("color", "font", "space", "type", "radius", "logo", "art"):
        assert key in blk, f"DECIEM block missing '{key}'"
    fonts = blk["font"]
    assert fonts["display"] == "Poppins"
    assert fonts["title"] == "Poppins"
    assert fonts["body"] == "Josefin Sans"
    assert fonts["mono"] == "Nunito"
    assert fonts["label"] == "Poppins"
    color = blk["color"]
    assert color["accent"].upper() == "#FB48C4"
    assert color["cyan"].upper() == "#00FACC"
    assert color["rail"].upper() == "#000000"
    assert color["paper"].upper() == "#FFFFFF"
    assert blk["art"]["assetsRoute"] == "/api/design-assets/deciem/"
    assert blk["logo"]["lockup_lines"] == ["THE ABNORMAL BEAUTY COMPANY.", "DECIEM"]


def test_deciem_template_assets_exist(tokens):
    art = tokens["DECIEM"]["art"]
    assert os.path.isfile(os.path.join(HERE, "..", art["templatePptx"]))
    assert os.path.isfile(os.path.join(DECIEM_DIR, art["cover"]["background"]))
    for bg in art["bodyBackgrounds"]:
        assert os.path.isfile(os.path.join(DECIEM_DIR, bg["file"])), bg["file"]


# ---------------------------------------------------------------- (b) font manifest

def test_font_manifest_deciem_files_exist():
    from brand_fonts import FONT_MANIFEST, DIAGRAM_FONT_FACES, DECIEM_TYPEFACES
    by_name = {f["typeface"]: f for f in FONT_MANIFEST}
    for face in ("Poppins", "Josefin Sans", "Questrial", "Nunito"):
        assert face in by_name, f"FONT_MANIFEST missing {face}"
        assert face in DECIEM_TYPEFACES
        entry = by_name[face]
        assert entry["pitchFamily"] == 34 and entry["charset"] == 0
        for slot in ("regular", "bold", "italic", "boldItalic"):
            fn = entry.get(slot)
            if fn:
                assert os.path.isfile(os.path.join(FONTS_DIR, fn)), f"{face} {slot} -> {fn} missing"
    assert by_name["Poppins"]["regular"] == "Poppins-Regular.ttf"
    assert by_name["Poppins"]["bold"] == "Poppins-Bold.ttf"
    assert by_name["Josefin Sans"]["regular"] == "JosefinSans-Variable.ttf"
    assert by_name["Questrial"]["regular"] == "Questrial-Regular.ttf"
    deciem_faces = [(fam, fn, wt) for fam, fn, wt in DIAGRAM_FONT_FACES if fam.startswith("DECIEM")]
    assert ("DECIEM Display", "Poppins-Bold.ttf", 700) in deciem_faces
    assert ("DECIEM Display", "Poppins-Regular.ttf", 400) in deciem_faces
    assert ("DECIEM Body", "JosefinSans-Variable.ttf", 400) in deciem_faces
    assert ("DECIEM Mono", "Nunito-Variable.ttf", 400) in deciem_faces
    assert ("DECIEM Label", "Poppins-Bold.ttf", 700) in deciem_faces
    for _, fn, _ in deciem_faces:
        assert os.path.isfile(os.path.join(FONTS_DIR, fn)), fn


def test_every_manifest_file_exists():
    """The embedder raises on any missing file; every declared face must be on disk."""
    from brand_fonts import FONT_MANIFEST
    for fam in FONT_MANIFEST:
        for slot in ("regular", "bold", "italic", "boldItalic"):
            fn = fam.get(slot)
            if fn:
                assert os.path.isfile(os.path.join(FONTS_DIR, fn)), f"{fam['typeface']} {slot} -> {fn}"


def test_export_fallbacks_brand_aware():
    from brand_fonts import export_fallbacks
    nxt = export_fallbacks()
    assert nxt["body_font"] == "Archivo"
    dec = export_fallbacks("DECIEM")
    assert dec["body_font"] == "Josefin Sans"
    assert dec["ink"].upper() == "000000"


# ---------------------------------------------------------------- (c) design-assets guard

@pytest.mark.parametrize("bad", ["../x.jpg", "a/b.jpg", "x.exe", "a\\b.png", "", ".jpg", "x.JPG.exe", "..jpg"])
def test_design_asset_guard_rejects(bad):
    from design_assets import is_safe_asset_name
    assert is_safe_asset_name(bad) is False


@pytest.mark.parametrize("good", ["layout11-title-slide-background.jpg", "layout27-11-custom-layout-logo.png",
                                  "layout-assets.json", "deciem-template.pptx"])
def test_design_asset_guard_accepts(good):
    from design_assets import is_safe_asset_name, media_type_for
    assert is_safe_asset_name(good) is True
    assert media_type_for(good) != "application/octet-stream"


def test_design_asset_resolution():
    from design_assets import resolve_design_asset
    hit = resolve_design_asset("deciem", "layout11-title-slide-background.jpg")
    assert hit is not None
    path, mt = hit
    assert os.path.isfile(path) and mt == "image/jpeg"
    assert resolve_design_asset("deciem", "../figma-tokens.json") is None
    assert resolve_design_asset("deciem", "does-not-exist.jpg") is None
    assert resolve_design_asset("nxt", "layout11-title-slide-background.jpg") is None


# ---------------------------------------------------------------- (d) PPTX presentation source

def test_stage_brand_detection():
    from gold_pptx_export import stage_brand
    assert stage_brand(['<!doctype html><html lang="en" data-brand="deciem"><head></head></html>']) == "deciem"
    assert stage_brand(['<html data-brand="nu">']) == "nu"
    assert stage_brand(['<html lang="en">']) == "nxt"
    assert stage_brand(['<html data-brand="other">']) == "nxt"
    assert stage_brand([]) == "nxt"


def test_default_presentation_unchanged_for_nxt():
    from gold_pptx_export import new_presentation, _blank_layout_index, EMU
    prs, blank_idx = new_presentation("nxt")
    assert blank_idx == 6
    assert prs.slide_layouts[6].name == "Blank"
    assert _blank_layout_index(prs) == 6
    assert int(prs.slide_width) == int(13.333 * EMU)
    assert int(prs.slide_height) == int(7.5 * EMU)
    assert len(prs.slide_layouts) == 11


def test_deciem_presentation_from_template():
    from pptx import Presentation
    from pptx.oxml.ns import qn
    from gold_pptx_export import new_presentation, deciem_template_path, _clone_blank_layout, EMU
    assert deciem_template_path() is not None
    prs, blank_idx = new_presentation("deciem")
    assert len(prs.slide_layouts) == 34
    assert len(prs.slides) == 0
    assert prs.slide_layouts[blank_idx].name.strip().lower() == "blank"
    # template is already 13.333x7.5in: not resized
    assert int(prs.slide_width) == 12192000 and int(prs.slide_height) == 6858000
    # template fonts stripped: no embeddedFontLst, no font rels left on the presentation part
    assert prs.part._element.find(qn("p:embeddedFontLst")) is None
    font_rt = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"
    assert not any(getattr(r, "reltype", "") == font_rt for r in prs.part.rels.values())
    # per-variant chrome layout clones from the template BLANK layout and registers cleanly
    lay = _clone_blank_layout(prs, "GOLD variant 1", blank_idx)
    assert len(prs.slide_layouts) == 35
    slide = prs.slides.add_slide(lay)
    # BLANK carries only a slide-number placeholder, which add_slide never clones
    assert len(slide.placeholders) == 0
    with tempfile.TemporaryDirectory() as td:
        out = os.path.join(td, "deciem.pptx")
        prs.save(out)
        re_prs = Presentation(out)
        assert len(re_prs.slide_layouts) == 35
        assert len(re_prs.slides) == 1
        with zipfile.ZipFile(out) as z:
            names = z.namelist()
            assert not any(n.startswith("ppt/fonts/") for n in names), "template font parts must not survive the strip"
            px = z.read("ppt/presentation.xml").decode("utf-8")
            assert "embeddedFontLst" not in px


def test_deciem_embed_adds_brand_faces_once():
    """Save a template-backed deck, run the manifest embedder, and verify ONE font list
    carrying the DECIEM faces (no duplicate embeddedFontLst, no template collision)."""
    import pptx_export as pe
    from gold_pptx_export import new_presentation, _clone_blank_layout, _embed_gold_fonts
    prs, blank_idx = new_presentation("deciem")
    lay = _clone_blank_layout(prs, "GOLD variant 1", blank_idx)
    prs.slides.add_slide(lay)
    before = list(pe.FONT_FAMILIES)
    with tempfile.TemporaryDirectory() as td:
        out = os.path.join(td, "deciem.pptx")
        prs.save(out)
        _embed_gold_fonts(out, brand="deciem", used_families={"Poppins", "Josefin Sans"})
        with zipfile.ZipFile(out) as z:
            px = z.read("ppt/presentation.xml").decode("utf-8")
            assert px.count("<p:embeddedFontLst") == 1
            faces = re.findall(r'<p:font typeface="([^"]+)"', px)
            for face in ("Poppins", "Josefin Sans", "Questrial", "Nunito"):
                assert face in faces, f"{face} not embedded"
            assert faces.count("Poppins") == 1
            fonts = [n for n in z.namelist() if n.startswith("ppt/fonts/")]
            assert len(fonts) == len(re.findall(r'<p:(?:regular|bold|italic|boldItalic) r:id=', px))
    # the DECIEM faces are transient: pptx_export's list is restored after the call
    after_names = {f["typeface"] for f in pe.FONT_FAMILIES}
    assert "Poppins" not in after_names
    assert {f["typeface"] for f in before} <= after_names


def test_nxt_embed_excludes_deciem_faces():
    import pptx_export as pe
    from gold_pptx_export import new_presentation, _clone_blank_layout, _embed_gold_fonts
    prs, blank_idx = new_presentation("nxt")
    lay = _clone_blank_layout(prs, "GOLD variant 1", blank_idx)
    prs.slides.add_slide(lay)
    with tempfile.TemporaryDirectory() as td:
        out = os.path.join(td, "nxt.pptx")
        prs.save(out)
        _embed_gold_fonts(out, brand="nxt", used_families={"Archivo", "Saira Condensed"})
        with zipfile.ZipFile(out) as z:
            px = z.read("ppt/presentation.xml").decode("utf-8")
            faces = re.findall(r'<p:font typeface="([^"]+)"', px)
            assert "Saira Condensed" in faces and "Archivo" in faces
            for face in ("Poppins", "Josefin Sans", "Questrial", "Nunito"):
                assert face not in faces
    assert "Poppins" not in {f["typeface"] for f in pe.FONT_FAMILIES}


# ---------------------------------------------------------------- (e) diagram renderer faces

def _pal(**extra):
    base = {"accent": "#FB48C4", "ink": "#000000", "cyan": "#00FACC", "rail": "#000000", "paper": "#FFFFFF",
            "kicker": "#FB48C4", "warn": "#FF6C2F", "wash_warn": "#FFEFE7", "wash_cool": "#E5FFF9",
            "band": "#000000", "band_text": "#FFFFFF", "grey": "#6B6B6B", "hairline": "#E3E3E3",
            "title_face": "Poppins", "body_face": "Josefin Sans", "mono_face": "Nunito", "disp_face": "Poppins",
            "bg": "#FFFFFF", "fg": "#000000"}
    base.update(extra)
    return base


SPEC = {"kind": "journey", "title": "Shoppers abandon the routine builder at the ingredient step",
        "kicker": "JOURNEY", "takeaway": "The ingredient step needs a plain-language explainer",
        "phases": [{"name": "Discover", "activities": ["Reads a regimen guide"], "pain": "Jargon"},
                   {"name": "Build", "activities": ["Adds serums"], "opportunity": "Guided pairing"}]}


def test_diagram_html_deciem_faces():
    import nxt_diagram_render as ndr
    pal = _pal(css_body="'DECIEM Body'", css_title="'DECIEM Display'", css_disp="'DECIEM Display'",
               css_mono="'DECIEM Mono'", title_transform="uppercase")
    doc = ndr.diagram_html(SPEC, pal)
    # the @font-face block declares every registered slot (NXT + NU + DECIEM); the brand
    # check is on the RULE css after it, where the shell picks the families it uses
    rules = doc.split("*{box-sizing", 1)[1]
    assert "'DECIEM Display'" in rules and "'DECIEM Body'" in rules and "'DECIEM Mono'" in rules
    assert "'Archivo'" not in rules and "'Saira Condensed'" not in rules and "'NXT Mono'" not in rules
    assert "text-transform:uppercase;color:#000000" in doc.replace("\n  ", "")
    assert "font-family:'DECIEM Display';font-weight:700;font-style:normal;src:url(" in doc
    assert "font-family:'DECIEM Body';font-weight:400;font-style:normal;src:url(" in doc
    assert "font-family:'DECIEM Mono';font-weight:400;font-style:normal;src:url(" in doc
    assert "Poppins-Bold.ttf" in doc and "JosefinSans-Variable.ttf" in doc and "Nunito-Variable.ttf" in doc


def test_diagram_html_nxt_faces_unchanged():
    import nxt_diagram_render as ndr
    doc = ndr.diagram_html(SPEC, _pal())
    rules = doc.split("*{box-sizing", 1)[1]
    assert "'Archivo'" in rules and "'Saira Condensed'" in rules and "'NXT Mono'" in rules
    assert "'DECIEM Body'" not in rules and "'DECIEM Display'" not in rules and "'DECIEM Mono'" not in rules
    # 2026-11-09 FONT BUG FIX: the CSS used to request 'Archivo', a family @font-face never
    # registered, so every NXT and NU exhibit fell back to the default serif. It now leads with the
    # REGISTERED family and keeps the real font name as a fallback. This test pinned the bug.
    assert "font-family:'NXT Title','Archivo'" in doc
    assert "font-weight:700;font-size:33px" in doc
    assert "text-transform:none" not in doc
    info = ndr.diagram_html({"kind": "stat-row", "stats": [{"value": "Quote", "label": "Reddit r/SkincareAddiction"}],
                             "chrome": "none", "frame": {"w": 984, "h": 580}}, _pal())
    assert "font-family:'NXT Body','Archivo',system-ui,sans-serif" in info
    assert "__FBODY__" not in info and "__FTITLE__" not in info and "__FDISP__" not in info and "__FMONO__" not in info


# ---------------------------------------------------------------- (f) app.py brand helpers (AST-extracted)
# app.py cannot be imported offline (feedparser and other service deps), so the brand
# helpers under test are lifted out of the source by name and executed in isolation.

_APP_HELPERS = ("_TOKEN_BRANDS", "_BRAND_IDS", "_BRAND_DISPLAY_NAME", "_norm_brand", "_brand_token_block",
                "_load_figma_tokens", "_design_token_block", "_design_grid_block", "build_design_tokens_prompt",
                "_design_token_css_vars", "_BRAND_TOKENS", "_brand_tokens", "_ILLUS_LINEART", "_illus_palette",
                "_diagram_palette", "_DIAGRAM_STYLE_VERSION")


@pytest.fixture(scope="module")
def app_helpers():
    import ast
    src = open(os.path.join(HERE, "app.py"), "r", encoding="utf-8").read()
    tree = ast.parse(src)
    wanted = []
    for node in tree.body:
        names = []
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            names = [node.name]
        elif isinstance(node, ast.Assign):
            names = [t.id for t in node.targets if isinstance(t, ast.Name)]
        if any(n in _APP_HELPERS for n in names):
            wanted.append(node)
    found = set()
    for node in wanted:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            found.add(node.name)
        else:
            found.update(t.id for t in node.targets if isinstance(t, ast.Name))
    assert set(_APP_HELPERS) <= found, f"missing from app.py: {set(_APP_HELPERS) - found}"
    mod = ast.Module(body=wanted, type_ignores=[])
    ns = {"os": os, "re": re, "__file__": os.path.join(HERE, "app.py"), "__name__": "app_helpers_under_test"}
    exec(compile(mod, "app.py", "exec"), ns)
    return ns


def test_norm_brand(app_helpers):
    nb = app_helpers["_norm_brand"]
    assert nb("deciem") == "deciem" and nb("DECIEM") == "deciem" and nb(" Deciem ") == "deciem"
    assert nb("nu") == "nu" and nb("NXT") == "nxt"
    assert nb("other") == "nxt" and nb(None) == "nxt" and nb("", default="nu") == "nu"
    assert app_helpers["_TOKEN_BRANDS"] == ("NXT", "NU", "DECIEM")


def test_brand_token_block_and_css_vars(app_helpers):
    blk = app_helpers["_brand_token_block"]("deciem")
    assert blk["font"]["display"] == "Poppins"
    assert app_helpers["_brand_token_block"]("nope")["font"]["display"] == app_helpers["_brand_token_block"]("NXT")["font"]["display"]
    css = app_helpers["_design_token_css_vars"]("deciem")
    assert "--accent: #FB48C4 !important;" in css
    assert "--font-display: 'Poppins', sans-serif !important;" in css
    assert "--font-body: 'Josefin Sans', sans-serif !important;" in css
    assert "--font-mono: 'Nunito', monospace !important;" in css
    nxt_css = app_helpers["_design_token_css_vars"]("nxt")
    assert "--accent: #B8B800 !important;" in nxt_css
    assert app_helpers["_design_token_css_vars"]("NU") == app_helpers["_design_token_css_vars"]("nu")


def test_design_tokens_prompt_brands(app_helpers):
    build = app_helpers["build_design_tokens_prompt"]
    dec = build("DECIEM")
    assert dec.startswith("=== DESIGN TOKENS (DECIEM)")
    assert "TEXT LOCKUP" in dec and "THE ABNORMAL BEAUTY COMPANY." in dec
    assert "Poppins" in dec and "Josefin Sans" in dec
    assert build("deciem") == dec
    nxt = build("NXT")
    assert nxt.startswith("=== DESIGN TOKENS (NXT)") and "DECIEM" not in nxt.split("\n")[0]
    both = build("")
    assert both.count("=== DESIGN TOKENS (") == 3
    assert both.index("(NXT)") < both.index("(NU)") < both.index("(DECIEM)")


def test_brand_tokens_legacy_shape(app_helpers):
    bt = app_helpers["_brand_tokens"]
    dec = bt("deciem")
    assert dec["primary"].upper() == "#FB48C4" and dec["secondary"].upper() == "#00FACC"
    assert dec["font_display"] == "'Poppins', sans-serif" and dec["font_body"] == "'Josefin Sans', sans-serif"
    nxt = bt("nxt")
    assert nxt["primary"].upper() == "#B8B800" and nxt["font_display"] == "'Saira Condensed', sans-serif"
    assert bt("unknown")["primary"] == nxt["primary"]
    assert "deciem" in app_helpers["_BRAND_TOKENS"]


def test_diagram_and_illustration_palettes(app_helpers):
    dp = app_helpers["_diagram_palette"]
    pal = dp("deciem", "light")
    assert pal["accent"].upper() == "#FB48C4" and pal["rail"].upper() == "#000000" and pal["paper"].upper() == "#FFFFFF"
    assert pal["cyan"].upper() == "#00FACC" and pal["warn"].upper() == "#FF6C2F"
    # the diagram CSS mono slot carries kickers / row labels / tags, which the template sets in Poppins Bold
    assert pal["css_title"] == "'DECIEM Display'" and pal["css_body"] == "'DECIEM Body'" and pal["css_mono"] == "'DECIEM Label'"
    assert pal["label_weight"] == "700" and pal["label_transform"] == "uppercase"
    assert pal["title_transform"] == "uppercase"
    assert pal["title_face"] == "Poppins" and pal["body_face"] == "Josefin Sans"
    dark = dp("DECIEM", "dark")
    assert dark["bg"].upper() == "#000000" and dark["fg"].upper() == "#FFFFFF"
    nxt = dp("nxt", "light")
    assert "css_title" not in nxt and nxt["accent"].upper() == "#B8B800"
    nu = dp("nu", "light")
    assert "css_title" not in nu and nu["accent"].upper() == "#C8102E"
    assert app_helpers["_DIAGRAM_STYLE_VERSION"] != "v21-content-first-scenes"
    ip = app_helpers["_illus_palette"]
    d = ip("deciem", "dark")
    assert "#FB48C4" in d["line"] and "#00FACC" in d["blobs"] and "#8A69D4" in d["blobs"]
    l = ip("deciem", "light")
    assert "#000000" in l["line"] and "#FB48C4" in l["blobs"]
    assert "#B8B800" in ip("nxt", "dark")["line"]
    assert "deciem" in app_helpers["_ILLUS_LINEART"]
