"""HiC PPTX export — RenderSpec[] → native editable PowerPoint with embedded brand fonts.

Pipeline:
  1. SPA's domToPptx.ts walks the rendered iframe and produces RenderSpec[] —
     a list of rect/oval/line/text/path/gradient/image objects with slide-inch
     coordinates and computed styles.
  2. SPA POSTs RenderSpec[] to /api/export-pptx in app.py.
  3. This module converts each spec to a native PPTX shape via python-pptx,
     dropping to raw XML for things python-pptx doesn't expose (custGeom paths,
     arrow heads, dash patterns, charSpacing, gradients).
  4. After python-pptx writes the .pptx, we inject the brand fonts (Archivo,
     Fraunces, Inter, JetBrains Mono) wrapped in EOT format. PowerPoint's
     installer accepts EOT — raw TTF triggers "General Failure".

Slide canvas: 13.333" x 7.5" (16:9 widescreen, matches SLIDE_W_IN / SLIDE_H_IN
in design-desk/services/domToPptx.ts).
"""
from __future__ import annotations

import base64
import io
import logging
import os
import shutil
import struct
import zipfile
from typing import Any

from fontTools.ttLib import TTFont
from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

logger = logging.getLogger(__name__)

# Slide canvas — must match design-desk/services/domToPptx.ts
SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5

# OOXML namespaces
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_CT = "http://schemas.openxmlformats.org/package/2006/content-types"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
FONT_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"

# Brand font registry — TTF files in proxy/fonts/static/, mapped to OOXML slots.
# Up to 4 slots per typeface (regular, bold, italic, boldItalic) — OOXML limit.
# JetBrains Mono Medium (weight 500) goes in the "bold" slot so any text using
# JetBrains Mono with bold=True picks up the medium-weight cut.
FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "static")

FONT_FAMILIES = [
    {
        "typeface": "Archivo",
        "pitchFamily": 34,  # swiss + variable
        "charset": 0,
        "regular":    "Archivo-Regular.ttf",
        "bold":       "Archivo-Bold.ttf",
        "italic":     "Archivo-Italic.ttf",
        "boldItalic": "Archivo-BoldItalic.ttf",
    },
    {
        "typeface": "Fraunces",
        "pitchFamily": 18,  # roman + variable
        "charset": 0,
        "regular": "Fraunces-Regular.ttf",
        "bold":    "Fraunces-Bold.ttf",
        "italic":  "Fraunces-Italic.ttf",
    },
    {
        "typeface": "Inter",
        "pitchFamily": 34,
        "charset": 0,
        "regular": "Inter-Regular.ttf",
        "bold":    "Inter-Bold.ttf",
    },
    {
        "typeface": "JetBrains Mono",
        "pitchFamily": 49,  # modern + fixed
        "charset": 0,
        "regular": "JetBrainsMono-Regular.ttf",
        "bold":    "JetBrainsMono-Medium.ttf",
    },
]


# ============================================================================
# TTF -> EOT (Embedded OpenType) — what PowerPoint expects in ppt/fonts/*.fntdata
# ============================================================================

EOT_MAGIC_NUMBER = 0x504C
EOT_VERSION = 0x00020001
EOT_FLAGS = 0x00000000


def _utf16le(s: str) -> bytes:
    return s.encode("utf-16-le")


def _name_record(name_table, name_id: int, default: str = "") -> str:
    rec = name_table.getName(name_id, 3, 1, 0x409)  # Windows English
    if rec is None:
        rec = name_table.getName(name_id, 1, 0, 0)  # Mac Roman English
    if rec is None:
        for r in name_table.names:
            if r.nameID == name_id:
                rec = r
                break
    if rec is None:
        return default
    try:
        return rec.toUnicode()
    except UnicodeDecodeError:
        return default


def ttf_to_eot(ttf_bytes: bytes) -> bytes:
    """Wrap raw TTF in an EOT header. PowerPoint's font installer rejects raw TTF
    with 'General Failure' but accepts EOT-wrapped TTF.

    Spec: https://www.w3.org/Submission/EOT/  (version 0x00020001 with empty RootString)
    """
    font = TTFont(io.BytesIO(ttf_bytes))
    os2 = font["OS/2"]
    head = font["head"]
    name = font["name"]

    panose_obj = os2.panose
    panose = bytes([
        panose_obj.bFamilyType, panose_obj.bSerifStyle, panose_obj.bWeight,
        panose_obj.bProportion, panose_obj.bContrast, panose_obj.bStrokeVariation,
        panose_obj.bArmStyle, panose_obj.bLetterForm, panose_obj.bMidline, panose_obj.bXHeight,
    ])

    family_name = _utf16le(_name_record(name, 1, "Unknown"))
    style_name = _utf16le(_name_record(name, 2, "Regular"))
    version_name = _utf16le(_name_record(name, 5, "Version 1.0"))
    full_name = _utf16le(_name_record(name, 4, "Unknown"))
    root_string = b""

    body = b"".join([
        struct.pack("<HH", 0, len(family_name)), family_name,
        struct.pack("<HH", 0, len(style_name)), style_name,
        struct.pack("<HH", 0, len(version_name)), version_name,
        struct.pack("<HH", 0, len(full_name)), full_name,
        struct.pack("<HH", 0, len(root_string)), root_string,
    ])

    fixed_header_size = 4 * 4 + 10 + 1 + 1 + 4 + 2 + 2 + 4 * 6 + 4 + 4 * 4
    eot_size = fixed_header_size + len(body) + len(ttf_bytes)
    italic = 0x01 if (os2.fsSelection & 0x01) else 0x00

    header = struct.pack(
        "<IIII" "10s" "BB" "I" "HH" "IIIIII" "I" "IIII",
        eot_size, len(ttf_bytes), EOT_VERSION, EOT_FLAGS,
        panose,
        0x01, italic,                    # Charset (DEFAULT_CHARSET), Italic
        os2.usWeightClass,
        os2.fsType, EOT_MAGIC_NUMBER,
        os2.ulUnicodeRange1, os2.ulUnicodeRange2, os2.ulUnicodeRange3, os2.ulUnicodeRange4,
        os2.ulCodePageRange1, os2.ulCodePageRange2,
        head.checkSumAdjustment & 0xFFFFFFFF,
        0, 0, 0, 0,
    )
    return header + body + ttf_bytes


# ============================================================================
# Font embedding into a python-pptx-generated .pptx (in-place)
# ============================================================================

def embed_brand_fonts(pptx_path: str, base_rel_id: int = 1000) -> None:
    """Inject FONT_FAMILIES into pptx_path as EOT-wrapped <p:embeddedFont> entries."""
    with zipfile.ZipFile(pptx_path, "r") as src:
        parts = {n: src.read(n) for n in src.namelist()}

    plan = []
    rel_id = base_rel_id
    font_index = 1
    for fam in FONT_FAMILIES:
        for slot in ("regular", "bold", "italic", "boldItalic"):
            ttf_name = fam.get(slot)
            if not ttf_name:
                continue
            ttf_path = os.path.join(FONTS_DIR, ttf_name)
            if not os.path.exists(ttf_path):
                logger.warning("font missing, skipping: %s", ttf_path)
                continue
            with open(ttf_path, "rb") as f:
                ttf_bytes = f.read()
            eot_bytes = ttf_to_eot(ttf_bytes)
            part_path = f"ppt/fonts/font{font_index}.fntdata"
            parts[part_path] = eot_bytes
            plan.append({
                "family": fam, "slot": slot,
                "rel_id": f"rId{rel_id}",
                "rel_target": f"fonts/font{font_index}.fntdata",
            })
            rel_id += 1
            font_index += 1

    if not plan:
        logger.warning("no brand fonts found in %s — skipping embedding", FONTS_DIR)
        return

    # 1) [Content_Types].xml
    ct_root = etree.fromstring(parts["[Content_Types].xml"])
    if not any(d.get("Extension") == "fntdata" for d in ct_root.findall(f"{{{NS_CT}}}Default")):
        d = etree.SubElement(ct_root, f"{{{NS_CT}}}Default")
        d.set("Extension", "fntdata")
        d.set("ContentType", "application/x-fontdata")
    parts["[Content_Types].xml"] = etree.tostring(ct_root, xml_declaration=True, encoding="UTF-8", standalone=True)

    # 2) presentation.xml.rels — relationships per font part
    rels_path = "ppt/_rels/presentation.xml.rels"
    rels_root = etree.fromstring(parts[rels_path])
    for entry in plan:
        rel = etree.SubElement(rels_root, f"{{{NS_PKG_REL}}}Relationship")
        rel.set("Id", entry["rel_id"])
        rel.set("Type", FONT_REL_TYPE)
        rel.set("Target", entry["rel_target"])
    parts[rels_path] = etree.tostring(rels_root, xml_declaration=True, encoding="UTF-8", standalone=True)

    # 3) presentation.xml — embedTrueTypeFonts="1" + <p:embeddedFontLst>
    pres_root = etree.fromstring(parts["ppt/presentation.xml"])
    pres_root.set("embedTrueTypeFonts", "1")
    efl = etree.Element(f"{{{NS_P}}}embeddedFontLst")
    for fam in FONT_FAMILIES:
        entries = [e for e in plan if e["family"] is fam]
        if not entries:
            continue
        ef = etree.SubElement(efl, f"{{{NS_P}}}embeddedFont")
        font_el = etree.SubElement(ef, f"{{{NS_P}}}font")
        font_el.set("typeface", fam["typeface"])
        font_el.set("pitchFamily", str(fam["pitchFamily"]))
        font_el.set("charset", str(fam["charset"]))
        for slot in ("regular", "bold", "italic", "boldItalic"):
            for e in entries:
                if e["slot"] == slot:
                    el = etree.SubElement(ef, f"{{{NS_P}}}{slot}")
                    el.set(f"{{{NS_R}}}id", e["rel_id"])
                    break
    default_text_style = pres_root.find(f"{{{NS_P}}}defaultTextStyle")
    if default_text_style is not None:
        default_text_style.addprevious(efl)
    else:
        pres_root.append(efl)
    parts["ppt/presentation.xml"] = etree.tostring(pres_root, xml_declaration=True, encoding="UTF-8", standalone=True)

    # 4) Re-zip
    tmp = pptx_path + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as out:
        for name, data in parts.items():
            out.writestr(name, data)
    shutil.move(tmp, pptx_path)
    logger.info("embedded %d EOT-wrapped fonts across %d typefaces into %s",
                len(plan), sum(1 for f in FONT_FAMILIES if any(f.get(s) for s in ("regular","bold","italic","boldItalic"))),
                pptx_path)


# ============================================================================
# RenderSpec → PPTX shape rendering
# ============================================================================

def _hex_to_rgb(hex_str: str) -> RGBColor:
    """'C8102E' -> RGBColor(0xC8, 0x10, 0x2E). Accepts with or without leading #."""
    h = hex_str.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"bad hex color: {hex_str!r}")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _alpha_to_transparency(alpha: float | None) -> int | None:
    """0..1 alpha -> PowerPoint transparency 0..100000 (0 = opaque, 100000 = transparent).
    Returns None for fully opaque (no override needed)."""
    if alpha is None or alpha >= 0.999:
        return None
    if alpha <= 0:
        return 100000
    return int((1.0 - alpha) * 100000)


def _set_solid_fill_with_alpha(spPr_or_fill, hex_color: str, alpha: float | None) -> None:
    """Build <a:solidFill><a:srgbClr val="..."><a:alpha val="..."/></a:srgbClr></a:solidFill>
    on the given spPr or replace its existing fill child."""
    pass  # Implemented inline where used — kept here for documentation


def _apply_dash(ln_element, dash: str | None) -> None:
    """Apply dash pattern to an <a:ln> element via raw XML."""
    if not dash or dash == "solid":
        return
    dash_map = {"dash": "dash", "sysDot": "sysDot", "dashDot": "dashDot"}
    val = dash_map.get(dash, "dash")
    prst = etree.SubElement(ln_element, qn("a:prstDash"))
    prst.set("val", val)


def _apply_arrow(ln_element, arrow_start: bool, arrow_end: bool) -> None:
    if arrow_start:
        head = etree.SubElement(ln_element, qn("a:headEnd"))
        head.set("type", "triangle")
        head.set("w", "med")
        head.set("len", "med")
    if arrow_end:
        tail = etree.SubElement(ln_element, qn("a:tailEnd"))
        tail.set("type", "triangle")
        tail.set("w", "med")
        tail.set("len", "med")


def _set_solid_fill(spPr, hex_color: str, alpha: float | None) -> None:
    """Replace any existing fill in spPr with <a:solidFill> carrying the given color + alpha."""
    # Drop any existing fill children
    for tag in ("a:solidFill", "a:noFill", "a:gradFill", "a:blipFill", "a:pattFill"):
        for el in spPr.findall(qn(tag)):
            spPr.remove(el)
    sf = etree.SubElement(spPr, qn("a:solidFill"))
    clr = etree.SubElement(sf, qn("a:srgbClr"))
    clr.set("val", hex_color.upper().lstrip("#"))
    t = _alpha_to_transparency(alpha)
    if t is not None:
        a_el = etree.SubElement(clr, qn("a:alpha"))
        a_el.set("val", str(t))


def _set_no_fill(spPr) -> None:
    for tag in ("a:solidFill", "a:noFill", "a:gradFill", "a:blipFill", "a:pattFill"):
        for el in spPr.findall(qn(tag)):
            spPr.remove(el)
    etree.SubElement(spPr, qn("a:noFill"))


def _emit_no_line(spPr) -> None:
    """Append <a:ln><a:noFill/></a:ln> — the schema-valid 'no stroke' marker.

    PptxGenJS's killer bug was emitting EMPTY <a:ln></a:ln> at scale, which
    PowerPoint's repair dialog rejected. <a:ln> with a single <a:noFill/>
    child is non-empty and unambiguous: 'this shape has no border'.
    Older workaround was <a:ln w="0"> with a white solidFill, which some
    PowerPoint versions render as a faint hairline.
    """
    ln = etree.SubElement(spPr, qn("a:ln"))
    etree.SubElement(ln, qn("a:noFill"))


def _suppress_effects(spPr) -> None:
    """Append <a:effectLst/> to override theme-inherited shape effects.

    python-pptx's auto-emitted <p:style> includes <a:effectRef idx="2">,
    which references the theme's moderate effect style — typically a drop
    shadow. <a:effectLst/> (empty) at the spPr level overrides that
    reference: 'this shape has no effects'. This kills shadows, glows,
    and reflections inherited from the theme on every shape we emit,
    giving the flat minimal look the brand requires.
    """
    for tag in ("a:effectLst", "a:effectDag"):
        for el in spPr.findall(qn(tag)):
            spPr.remove(el)
    etree.SubElement(spPr, qn("a:effectLst"))


def _is_tiny_icon_stroke(spec: dict, max_dim_in: float = 0.18) -> bool:
    """Tiny shapes (<0.18" on both axes) that have only a white stroke and no
    fill are exemplar icon decorations (24x24px CSS icons inside stat tiles,
    bullet markers, etc). They were drawn over translucent containers we
    already culled — without that backdrop they're orphan glyphs. Cull."""
    w = float(spec.get("w") or 0)
    h = float(spec.get("h") or 0)
    if w > max_dim_in or h > max_dim_in:
        return False
    fill_hex = spec.get("fillHex")
    stroke_hex = (spec.get("strokeHex") or "").upper().lstrip("#")
    fill_alpha = spec.get("fillAlpha")
    has_meaningful_fill = bool(fill_hex) and (fill_alpha is None or fill_alpha >= 0.25)
    return not has_meaningful_fill and stroke_hex == "FFFFFF"


def _is_visually_empty_shape(spec: dict, alpha_floor: float = 0.25) -> bool:
    """A rect/oval/path is visually empty if it has no fill (or near-transparent)
    AND no stroke. Such shapes are atmospheric blobs, layout placeholders, or
    icon containers that don't carry the gradient/blur the source CSS implies.
    Cull them for a flat minimal export."""
    fill_hex = spec.get("fillHex")
    fill_alpha = spec.get("fillAlpha")
    stroke_hex = spec.get("strokeHex")
    stroke_w = spec.get("strokeWidth")

    has_fill = bool(fill_hex) and (fill_alpha is None or fill_alpha >= alpha_floor)
    has_stroke = bool(stroke_hex) and bool(stroke_w) and float(stroke_w) > 0
    return not has_fill and not has_stroke


def _is_off_slide(spec: dict) -> bool:
    """True if the shape's bbox falls entirely outside the 13.333 x 7.5 canvas
    (atmospheric blobs are explicitly positioned off-canvas)."""
    x = float(spec.get("x") or 0)
    y = float(spec.get("y") or 0)
    w = float(spec.get("w") or 0)
    h = float(spec.get("h") or 0)
    return (x + w <= 0) or (y + h <= 0) or (x >= SLIDE_W_IN) or (y >= SLIDE_H_IN)


def _is_off_slide_partial(spec: dict, margin: float = 0.5) -> bool:
    """True if the shape extends >margin inches outside the canvas — also a
    strong signal of an atmospheric blob deliberately positioned off-edge."""
    x = float(spec.get("x") or 0)
    y = float(spec.get("y") or 0)
    w = float(spec.get("w") or 0)
    h = float(spec.get("h") or 0)
    return (x < -margin) or (y < -margin) or (x + w > SLIDE_W_IN + margin) or (y + h > SLIDE_H_IN + margin)


def _add_rect(slide, spec: dict) -> None:
    rx = float(spec.get("rxIn") or 0)
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rx > 0 else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(
        shape_type,
        Inches(spec["x"]), Inches(spec["y"]),
        Inches(spec["w"]), Inches(spec["h"]),
    )
    spPr = shape._element.find(qn("p:spPr"))

    # Fill
    fill_hex = spec.get("fillHex")
    if fill_hex:
        _set_solid_fill(spPr, fill_hex, spec.get("fillAlpha"))
    else:
        _set_no_fill(spPr)

    # Line
    stroke_hex = spec.get("strokeHex")
    stroke_w = spec.get("strokeWidth")
    if stroke_hex and stroke_w and float(stroke_w) > 0:
        ln = etree.SubElement(spPr, qn("a:ln"))
        ln.set("w", str(int(float(stroke_w) * 12700)))
        sf = etree.SubElement(ln, qn("a:solidFill"))
        clr = etree.SubElement(sf, qn("a:srgbClr"))
        clr.set("val", stroke_hex.upper().lstrip("#"))
        _apply_dash(ln, spec.get("dash"))
    else:
        _emit_no_line(spPr)

    _suppress_effects(spPr)


def _add_oval(slide, spec: dict) -> None:
    shape = slide.shapes.add_shape(
        MSO_SHAPE.OVAL,
        Inches(spec["x"]), Inches(spec["y"]),
        Inches(spec["w"]), Inches(spec["h"]),
    )
    spPr = shape._element.find(qn("p:spPr"))
    fill_hex = spec.get("fillHex")
    if fill_hex:
        _set_solid_fill(spPr, fill_hex, spec.get("fillAlpha"))
    else:
        _set_no_fill(spPr)
    stroke_hex = spec.get("strokeHex")
    stroke_w = spec.get("strokeWidth")
    if stroke_hex and stroke_w and float(stroke_w) > 0:
        ln = etree.SubElement(spPr, qn("a:ln"))
        ln.set("w", str(int(float(stroke_w) * 12700)))
        sf = etree.SubElement(ln, qn("a:solidFill"))
        clr = etree.SubElement(sf, qn("a:srgbClr"))
        clr.set("val", stroke_hex.upper().lstrip("#"))
    else:
        _emit_no_line(spPr)

    _suppress_effects(spPr)


def _add_line(slide, spec: dict) -> None:
    # Line spec uses (x, y) as start; (x+w, y+h) as end; w/h can be negative.
    start_x = Inches(spec["x"])
    start_y = Inches(spec["y"])
    end_x = Inches(spec["x"] + spec["w"])
    end_y = Inches(spec["y"] + spec["h"])
    connector = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, start_x, start_y, end_x, end_y)
    line = connector.line
    line.color.rgb = _hex_to_rgb(spec["strokeHex"])
    sw = float(spec.get("strokeWidth") or 1)
    line.width = Pt(sw * 0.75)  # px -> pt for line widths

    ln = line._get_or_add_ln()
    _apply_dash(ln, spec.get("dash"))
    _apply_arrow(ln, bool(spec.get("arrowStart")), bool(spec.get("arrowEnd")))

    spPr = connector._element.find(qn("p:spPr"))
    if spPr is not None:
        _suppress_effects(spPr)


def _add_text(slide, spec: dict) -> None:
    box = slide.shapes.add_textbox(
        Inches(spec["x"]), Inches(spec["y"]),
        Inches(spec["w"]), Inches(spec["h"]),
    )
    spPr = box._element.find(qn("p:spPr"))
    if spPr is not None:
        _suppress_effects(spPr)
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Emu(0)
    tf.margin_right = Emu(0)
    tf.margin_top = Emu(0)
    tf.margin_bottom = Emu(0)

    valign = spec.get("valign", "top")
    if valign == "middle":
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    elif valign == "bottom":
        tf.vertical_anchor = MSO_ANCHOR.BOTTOM
    else:
        tf.vertical_anchor = MSO_ANCHOR.TOP

    align = spec.get("align", "left")
    p = tf.paragraphs[0]
    p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}.get(align, PP_ALIGN.LEFT)

    runs = spec.get("runs") or []
    for run_spec in runs:
        r = p.add_run()
        r.text = run_spec.get("text", "")
        font = r.font
        family = run_spec.get("fontFamily")
        if family:
            font.name = family
        size_pt = run_spec.get("fontSizePt")
        if size_pt:
            font.size = Pt(float(size_pt))
        weight = int(run_spec.get("fontWeight", 400))
        font.bold = weight >= 600
        font.italic = bool(run_spec.get("italic", False))
        if run_spec.get("underline"):
            font.underline = True
        color_hex = run_spec.get("colorHex")
        if color_hex:
            font.color.rgb = _hex_to_rgb(color_hex)

        # charSpacing — raw XML on rPr (PptxGenJS uses 1/100pt; OOXML spec is 1/100pt)
        char_spacing = run_spec.get("charSpacing")
        if char_spacing:
            rPr = r._r.get_or_add_rPr()
            rPr.set("spc", str(int(float(char_spacing) * 100)))


def _add_path(slide, spec: dict) -> None:
    """SVG path → <a:custGeom> with native moveTo/lnTo/cubicBezTo/quadBezTo/close.

    Path coords from RenderSpec are normalized to 0..1 within the shape bbox.
    Custom geometry uses 0..100000 by convention (the path 'w' and 'h' values).
    """
    # Use a rectangle as the geometry holder, then replace its prstGeom with custGeom
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(spec["x"]), Inches(spec["y"]),
        Inches(spec["w"]), Inches(spec["h"]),
    )
    spPr = shape._element.find(qn("p:spPr"))

    # Remove the auto-emitted prstGeom
    for prst in spPr.findall(qn("a:prstGeom")):
        spPr.remove(prst)

    # Build custGeom — must be inserted AFTER xfrm but BEFORE fill in the spPr child order
    custGeom = etree.Element(qn("a:custGeom"))
    etree.SubElement(custGeom, qn("a:avLst"))
    etree.SubElement(custGeom, qn("a:gdLst"))
    etree.SubElement(custGeom, qn("a:ahLst"))
    etree.SubElement(custGeom, qn("a:cxnLst"))
    rect_el = etree.SubElement(custGeom, qn("a:rect"))
    rect_el.set("l", "0")
    rect_el.set("t", "0")
    rect_el.set("r", "100000")
    rect_el.set("b", "100000")
    pathLst = etree.SubElement(custGeom, qn("a:pathLst"))
    path_el = etree.SubElement(pathLst, qn("a:path"))
    path_el.set("w", "100000")
    path_el.set("h", "100000")

    def _pt(parent, x: float, y: float):
        pt = etree.SubElement(parent, qn("a:pt"))
        pt.set("x", str(int(max(0, min(1, x)) * 100000)))
        pt.set("y", str(int(max(0, min(1, y)) * 100000)))

    for cmd in spec.get("points") or []:
        kind = cmd.get("type")
        if kind == "move":
            mt = etree.SubElement(path_el, qn("a:moveTo"))
            _pt(mt, cmd["x"], cmd["y"])
        elif kind == "line":
            lt = etree.SubElement(path_el, qn("a:lnTo"))
            _pt(lt, cmd["x"], cmd["y"])
        elif kind == "curve":
            cb = etree.SubElement(path_el, qn("a:cubicBezTo"))
            _pt(cb, cmd["cx1"], cmd["cy1"])
            _pt(cb, cmd["cx2"], cmd["cy2"])
            _pt(cb, cmd["x"], cmd["y"])
        elif kind == "quadratic":
            qb = etree.SubElement(path_el, qn("a:quadBezTo"))
            _pt(qb, cmd["cx"], cmd["cy"])
            _pt(qb, cmd["x"], cmd["y"])
        elif kind == "close":
            etree.SubElement(path_el, qn("a:close"))

    # Insert custGeom right after xfrm (canonical order: xfrm, geom, fill, ln)
    xfrm = spPr.find(qn("a:xfrm"))
    if xfrm is not None:
        xfrm.addnext(custGeom)
    else:
        spPr.insert(0, custGeom)

    # Apply fill / line (overwriting whatever python-pptx put there)
    fill_hex = spec.get("fillHex")
    if fill_hex:
        _set_solid_fill(spPr, fill_hex, spec.get("fillAlpha"))
    else:
        _set_no_fill(spPr)

    # Replace any existing <a:ln>
    for ln_el in spPr.findall(qn("a:ln")):
        spPr.remove(ln_el)
    stroke_hex = spec.get("strokeHex")
    stroke_w = spec.get("strokeWidth")
    if stroke_hex and stroke_w and float(stroke_w) > 0:
        ln = etree.SubElement(spPr, qn("a:ln"))
        ln.set("w", str(int(float(stroke_w) * 12700)))
        sf = etree.SubElement(ln, qn("a:solidFill"))
        clr = etree.SubElement(sf, qn("a:srgbClr"))
        clr.set("val", stroke_hex.upper().lstrip("#"))
    else:
        _emit_no_line(spPr)

    _suppress_effects(spPr)


def _add_gradient(slide, spec: dict) -> None:
    """Linear or radial gradient as a rect with <a:gradFill>."""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(spec["x"]), Inches(spec["y"]),
        Inches(spec["w"]), Inches(spec["h"]),
    )
    spPr = shape._element.find(qn("p:spPr"))

    # Drop existing fill
    for tag in ("a:solidFill", "a:noFill", "a:gradFill", "a:blipFill", "a:pattFill"):
        for el in spPr.findall(qn(tag)):
            spPr.remove(el)

    grad = etree.SubElement(spPr, qn("a:gradFill"))
    grad.set("flip", "none")
    grad.set("rotWithShape", "1")
    gsLst = etree.SubElement(grad, qn("a:gsLst"))
    for stop in spec.get("stops") or []:
        gs = etree.SubElement(gsLst, qn("a:gs"))
        gs.set("pos", str(int(max(0, min(1, stop.get("offset", 0))) * 100000)))
        clr = etree.SubElement(gs, qn("a:srgbClr"))
        clr.set("val", str(stop.get("colorHex", "000000")).upper().lstrip("#"))
        a = stop.get("alpha", 1.0)
        if a < 0.999:
            a_el = etree.SubElement(clr, qn("a:alpha"))
            a_el.set("val", str(int(max(0, a) * 100000)))

    if spec.get("kind") == "radial":
        path = etree.SubElement(grad, qn("a:path"))
        path.set("path", "circle")
    else:
        lin = etree.SubElement(grad, qn("a:lin"))
        angle_deg = float(spec.get("angle") or 0)
        # OOXML angles are 60000ths of a degree, measured clockwise from horizontal
        lin.set("ang", str(int(angle_deg * 60000) % 21600000))
        lin.set("scaled", "1")

    # Suppress any auto-emitted line
    for ln_el in spPr.findall(qn("a:ln")):
        spPr.remove(ln_el)
    _emit_no_line(spPr)
    _suppress_effects(spPr)


def _add_image(slide, spec: dict) -> None:
    data_url = spec.get("dataUrl") or ""
    if not data_url.startswith("data:"):
        logger.warning("image spec without data URL — skipping")
        return
    # data:[<mediatype>][;base64],<data>
    try:
        header, b64 = data_url.split(",", 1)
        if ";base64" not in header:
            logger.warning("image data URL not base64 — skipping")
            return
        raw = base64.b64decode(b64)
    except Exception as e:
        logger.warning("failed to decode image data URL: %s", e)
        return
    slide.shapes.add_picture(
        io.BytesIO(raw),
        Inches(spec["x"]), Inches(spec["y"]),
        Inches(spec["w"]), Inches(spec["h"]),
    )


# Dispatch table
_DISPATCH = {
    "rect": _add_rect,
    "oval": _add_oval,
    "line": _add_line,
    "text": _add_text,
    "path": _add_path,
    "gradient": _add_gradient,
    "image": _add_image,
}


def _render_specs_into_slide(slide, specs: list[dict], counts: dict[str, int], skipped: list[str], culled: dict[str, int]) -> None:
    """Internal: render a sorted-by-z RenderSpec list into an existing slide.
    Mutates `counts`, `skipped`, `culled`. Used by both the single-slide and
    multi-slide entry points."""
    sorted_specs = sorted(specs, key=lambda s: s.get("z", 0))

    def _bump_culled(reason: str) -> None:
        culled[reason] = culled.get(reason, 0) + 1

    for s in sorted_specs:
        kind = s.get("type")

        # Cull noise for a flat, minimal export. We strip three categories of
        # specs that the walker captures but PowerPoint renders as ghost
        # rectangles or phantom borders:
        #   1. Visually empty shapes — no fill AND no stroke (atmospheric blobs,
        #      icon containers without their CSS gradient/blur)
        #   2. Off-slide shapes — bbox entirely outside 13.333 x 7.5 (deliberate
        #      atmospheric positioning past the canvas edge)
        #   3. Mostly-off-slide blobs — bbox extends >0.5 inches outside (also
        #      atmospheric overlays meant to fade past the edge)
        if kind in ("rect", "oval", "path"):
            if _is_off_slide(s):
                _bump_culled(f"{kind}:off_slide")
                continue
            if _is_visually_empty_shape(s):
                _bump_culled(f"{kind}:no_fill_no_stroke")
                continue
            if _is_off_slide_partial(s):
                _bump_culled(f"{kind}:off_slide_partial")
                continue
            if _is_tiny_icon_stroke(s):
                _bump_culled(f"{kind}:tiny_icon")
                continue

        fn = _DISPATCH.get(kind)
        if not fn:
            skipped.append(kind or "<unknown>")
            continue
        try:
            fn(slide, s)
            counts[kind] = counts.get(kind, 0) + 1
        except Exception as e:
            logger.exception("failed to render spec type=%s: %s", kind, e)
            skipped.append(f"{kind}:{type(e).__name__}")


def render_specs_to_pptx(specs: list[dict], out_path: str) -> dict:
    """Convert a sorted-by-z RenderSpec list to a native PPTX with embedded fonts.

    Single-slide entry point — used by Design Desk freeform artifact export.
    For multi-slide presentation export, see render_multi_slide_pptx().
    """
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W_IN)
    prs.slide_height = Inches(SLIDE_H_IN)
    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)

    counts: dict[str, int] = {}
    skipped: list[str] = []
    culled: dict[str, int] = {}

    _render_specs_into_slide(slide, specs, counts, skipped, culled)

    prs.save(out_path)
    embed_brand_fonts(out_path)

    return {
        "out_path": out_path,
        "rendered": counts,
        "skipped": skipped,
        "culled": culled,
        "total_specs": len(specs),
        "slide_count": 1,
        "file_size": os.path.getsize(out_path),
    }


def render_multi_slide_pptx(slides: list[dict], out_path: str) -> dict:
    """Convert a multi-slide payload (one section per slide) to a native PPTX.

    2026-05-06 — Used by the interactive presentation exporter. Each entry in
    `slides` is `{title: str, specs: RenderSpec[]}`. Produces one editable
    PowerPoint slide per entry, with all the same culling and brand-font
    embedding as the single-slide path.
    """
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W_IN)
    prs.slide_height = Inches(SLIDE_H_IN)
    blank_layout = prs.slide_layouts[6]

    counts: dict[str, int] = {}
    skipped: list[str] = []
    culled: dict[str, int] = {}
    total_specs = 0

    for slide_payload in slides:
        slide_specs = slide_payload.get("specs") or []
        title = str(slide_payload.get("title") or "Untitled Slide")
        total_specs += len(slide_specs)

        slide = prs.slides.add_slide(blank_layout)
        _render_specs_into_slide(slide, slide_specs, counts, skipped, culled)

        # Set the slide's notes/title metadata so PowerPoint's outline pane and
        # accessibility readers have something to anchor on. We don't add a
        # visible title shape because the section's own h1/h2 is already
        # captured as a TextSpec by the walker.
        try:
            notes = slide.notes_slide.notes_text_frame
            notes.text = title
        except Exception:
            pass

    prs.save(out_path)
    embed_brand_fonts(out_path)

    return {
        "out_path": out_path,
        "rendered": counts,
        "skipped": skipped,
        "culled": culled,
        "total_specs": total_specs,
        "slide_count": len(slides),
        "file_size": os.path.getsize(out_path),
    }
