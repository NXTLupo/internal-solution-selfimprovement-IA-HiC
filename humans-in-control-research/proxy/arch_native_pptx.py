"""#arch as a NATIVE, editable PowerPoint diagram (2026-11-16).

Owner: "It is NOT a diagram!" and then "explore a mermaid to pptx option that improves upon the hybrid approach and
remains editable in powerpoint". The exploration (Downloads/IA-Next-UX-Audit-2026-11-16/S-arch-diagram) found
Mermaid's dagre layout unfit for layered architecture (it sprawled the layer groups and ignored right-angle edges),
so the layout is HiC's own layered geometry (nxt_diagram_render.archflow_geometry: one row per layer, boxes sized to
fit, right-angle arrows routed through the gaps between rows, a side lane for links that skip a layer, notes on
clear tracks). This module writes that geometry as PowerPoint objects: a typed autoshape per component (cylinder
for a data store, hexagon for AI, dark box for an external system), real text, freeform polylines with arrowheads
for the connections, and text-box notes. Nothing is a picture, so every box, word and arrow can be edited.
Colours and faces come from the brand palette (tokens), never literals in this file.
"""
import re

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml import parse_xml
from pptx.oxml.ns import nsdecls
from pptx.util import Inches, Pt

import nxt_diagram_render as R

SHAPE = {"experience": MSO_SHAPE.RECTANGLE, "service": MSO_SHAPE.ROUNDED_RECTANGLE, "ai": MSO_SHAPE.HEXAGON,
         "store": MSO_SHAPE.CAN, "external": MSO_SHAPE.RECTANGLE}


def _hex(v, fb):
    v = str(v or "").lstrip("#")
    return v.upper() if re.fullmatch(r"[0-9A-Fa-f]{6}", v) else fb


def _kind(nd):
    t = (nd.get("type") or "").lower()
    if "external" in t or re.search(r"\b(crm|erp|sis|saas|system of record)\b", t):
        return "external"
    if R._ARCH_STORE_RE.search(t + " " + (nd.get("name") or "")):
        return "store"
    if re.search(r"\b(ai|ml|llm|model)\b", t):
        return "ai"
    if re.search(r"experience|app|portal|screen|ui|view", t):
        return "experience"
    return "service"


def _para(tf, text, size, color, face, bold=False, first=True, align=PP_ALIGN.CENTER):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    r = p.add_run()
    r.text = text
    r.font.size, r.font.bold, r.font.name = Pt(size), bold, face
    r.font.color.rgb = RGBColor.from_string(color)


def build_arch_pptx(spec: dict, pal: dict, out_path: str, notes: str = "") -> dict:
    """spec: the diagram spec (layers with nodes {name, type, description}, connections, title, flowSummary or subtitle)."""
    geo = R.archflow_geometry(spec, pal)
    if not geo:
        raise ValueError("the architecture needs at least two layers and one connection between named components")
    ink, paper, grey = _hex(pal.get("ink"), "141414"), _hex(pal.get("paper"), "FFFFFF"), _hex(pal.get("grey"), "73757A")
    kick, rail, accent = _hex(pal.get("kicker"), "00B7C3"), _hex(pal.get("rail"), "0D0D0D"), _hex(pal.get("accent"), "B8B800")
    hair, cool, warm = _hex(pal.get("hairline"), "DDDDD6"), _hex(pal.get("wash_cool"), "EBF7F8"), _hex(pal.get("wash_warn"), "FAF1EC")
    warn, teal = _hex(pal.get("warn"), "CC6644"), _hex(pal.get("teal") or pal.get("rail"), rail)
    title_face, body_face = pal.get("title_face") or "Archivo", pal.get("body_face") or "Archivo"
    mono_face = pal.get("mono_face") or body_face
    style = {"experience": (cool, kick, ink), "service": (paper, kick, ink), "ai": (warm, warn, ink),
             "store": (paper, grey, ink), "external": (rail, rail, paper)}

    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    lay = next((l for l in prs.slide_layouts if l.name == "Title Only"), prs.slide_layouts[5])
    s = prs.slides.add_slide(lay)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = RGBColor.from_string(paper)
    kicker = R._s(spec.get("kicker")) or "ARCHITECTURE"
    kb = s.shapes.add_textbox(Inches(0.6), Inches(0.28), Inches(8), Inches(0.3))
    kb.name = "Kicker"
    _para(kb.text_frame, kicker.upper(), 11, kick, mono_face, bold=True, align=PP_ALIGN.LEFT)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = Inches(0.6), Inches(0.55), Inches(12.1), Inches(0.62)
    t.text_frame.word_wrap = True
    _para(t.text_frame, R._s(spec.get("title")), 24, ink, title_face, bold=True, align=PP_ALIGN.LEFT)
    sub = R._s(spec.get("subtitle")) or R._s(spec.get("flowSummary"))
    if sub:
        sb = s.shapes.add_textbox(Inches(0.6), Inches(1.2), Inches(12.1), Inches(0.55))
        sb.name = "Subtitle"
        sb.text_frame.word_wrap = True
        _para(sb.text_frame, sub, 13, grey, body_face, align=PP_ALIGN.LEFT)

    ax, ay, aw, ah = 0.6, 1.85, 12.13, 5.4
    k = min(aw / geo["W"], ah / geo["H"])
    ox, oy = ax + (aw - geo["W"] * k) / 2, ay + (ah - geo["H"] * k) / 2
    X, Y, L = (lambda v: Inches(ox + v * k)), (lambda v: Inches(oy + v * k)), (lambda v: Inches(v * k))
    PT = lambda u: max(6.5, round(u * k * 72, 1))
    NH, LW = geo["NH"], geo["LW"]
    counts = {"components": 0, "connections": 0, "notes": 0}

    for li, ly in enumerate(geo["layers"]):
        ry = geo["rowy"][li]
        if li % 2 == 0:
            band = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, X(0), Y(ry - 6), L(geo["W"]), L(NH + 12))
            band.name = f"Layer band {li + 1}"
            band.fill.solid()
            band.fill.fore_color.rgb = RGBColor.from_string(cool)
            band.line.fill.background()
            band.shadow.inherit = False
        lab = s.shapes.add_textbox(X(0), Y(ry), L(LW), L(NH))
        lab.name = f"Layer {li + 1}"
        lab.text_frame.word_wrap = True
        lab.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
        _para(lab.text_frame, ly["name"].upper(), PT(10.5), grey, mono_face, bold=True, align=PP_ALIGN.LEFT)
        for ni, nd in enumerate(ly["nodes"]):
            kd = _kind(nd)
            fill, stroke, txt = style[kd]
            x, w = geo["rows"][li]["x"][ni], geo["rows"][li]["w"]
            sh = s.shapes.add_shape(SHAPE[kd], X(x), Y(ry), L(w), L(NH))
            sh.name = nd["name"]
            sh.fill.solid()
            sh.fill.fore_color.rgb = RGBColor.from_string(fill)
            sh.line.color.rgb = RGBColor.from_string(stroke)
            sh.line.width = Pt(1.25)
            sh.shadow.inherit = False
            if kd == "ai":
                sh.adjustments[0] = 0.12
            tf = sh.text_frame
            tf.word_wrap = True
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            tf.margin_left = tf.margin_right = Inches(0.08)
            tf.margin_top = Inches(0.16) if kd == "store" else Inches(0.03)
            tf.margin_bottom = Inches(0.03)
            _para(tf, nd["name"], PT(13.5), txt, body_face, bold=True)
            if nd.get("type"):
                _para(tf, nd["type"].upper(), PT(8), accent if kd == "external" else kick, mono_face, first=False)
            if nd.get("desc"):
                _para(tf, nd["desc"], PT(10.5), txt if kd == "external" else grey, body_face, first=False)
            counts["components"] += 1

    for e in geo["edges"]:
        pts = e["pts"]
        fb = s.shapes.build_freeform(X(pts[0][0]), Y(pts[0][1]), scale=1.0)
        fb.add_line_segments([(X(px), Y(py)) for px, py in pts[1:]], close=False)
        ln = fb.convert_to_shape()
        ln.name = "Connection " + (e.get("label") or "")
        ln.fill.background()
        ln.line.color.rgb = RGBColor.from_string(teal)
        ln.line.width = Pt(1.5)
        ln.shadow.inherit = False
        ln.line._get_or_add_ln().append(parse_xml(f'<a:tailEnd {nsdecls("a")} type="triangle" w="med" len="med"/>'))
        counts["connections"] += 1
    for e in geo["edges"]:
        n = e.get("note")
        if not n:
            continue
        tb = s.shapes.add_textbox(X(n["x"] - n["w"] / 2), Y(n["y"] - 8), L(n["w"]), L(16))
        tb.name = "Note " + e["label"]
        tb.fill.solid()
        tb.fill.fore_color.rgb = RGBColor.from_string(paper)
        tb.line.color.rgb = RGBColor.from_string(hair)
        tb.line.width = Pt(0.5)
        tf = tb.text_frame
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        _para(tf, e["label"], PT(10), ink, mono_face)
        counts["notes"] += 1
    if notes:
        s.notes_slide.notes_text_frame.text = notes[:4000]
    prs.save(out_path)
    return counts
