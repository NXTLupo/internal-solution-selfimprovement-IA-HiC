#!/usr/bin/env python
"""Gold-language HTML -> EDITABLE PowerPoint (.pptx).

The runtime home of the proven exporter from scripts/eval/gold_to_pptx_hybrid.py.
Given a self-contained 1920x1080 gold-language HTML string (#stage), produce a .pptx whose
GRAPHIC layer is a pixel-exact background (rail, dot mark, cell fills, lines/bands, SVG
curves, accent borders, rendered with HTML text hidden) and whose TEXT layer is real,
EDITABLE PowerPoint text, deterministically sized to fit (no collisions), with the gold
fonts embedded. "graphics as graphics, text as text."

Critical constant: the 1920px stage = 144 px/in, so px->pt = px*0.5 (PX2PT). Using the
1280px exporter's 0.75 oversizes every glyph 1.5x and causes the text collisions.
"""
import os
import tempfile
import pathlib

W, H = 1920, 1080
EMU = 914400
PX2PT = 13.333 * 72.0 / W   # = 0.5 for W=1920 (144 px/in stage)
_FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "static")

RESET = ("<style>html,body{margin:0!important;padding:0!important;overflow:visible!important;background:#fff}"
         "#stage{transform:none!important;left:0!important;top:0!important;position:absolute!important}</style>")
HIDE_TEXT = ("#stage *:not(svg):not(svg *){color:transparent !important;"
             "text-shadow:none !important;-webkit-text-stroke:0 !important;}")

MEASURE = r"""
() => {
  const stage = document.querySelector('#stage');
  if(!stage) return {runs:[]};
  const sr = stage.getBoundingClientRect();
  const toHex = (c) => { if(!c) return null; const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null;
    const p=m[1].split(',').map(s=>parseFloat(s.trim())); if(p.length>=4&&p[3]===0) return null;
    const h=n=>('0'+Math.round(n).toString(16)).slice(-2); return (h(p[0])+h(p[1])+h(p[2])).toUpperCase(); };
  const isBlock=(el)=>{const d=getComputedStyle(el).display;
    return /^(block|flex|grid|table|list-item|flow-root)/.test(d);};
  const runs=[];
  const emit=(rg, el)=>{
    const txt=rg.toString().replace(/\s+/g,' ').trim();
    if(!txt) return;
    const rb=rg.getBoundingClientRect();
    if(rb.width<1 || rb.height<1) return;
    const cs=getComputedStyle(el);
    const eb=el.getBoundingClientRect();
    runs.push({text:txt, x:rb.left-sr.left, y:rb.top-sr.top, w:rb.width, h:rb.height, tw:rb.width,
      eright:eb.right-sr.left, ebottom:eb.bottom-sr.top,
      size:parseFloat(cs.fontSize)||16, weight:parseInt(cs.fontWeight)||400, color:toHex(cs.color)||'141414',
      align:cs.textAlign||'left', transform:cs.textTransform||'none',
      family:(cs.fontFamily||'').split(',')[0].replace(/['"]/g,'').trim(), spacing:cs.letterSpacing,
      italic:cs.fontStyle==='italic', lh:parseFloat(cs.lineHeight)||0});
  };
  const walk=(el)=>{
    if(el.tagName==='svg' || el.closest('svg')) return;
    const bounds=Array.from(el.children).filter(k=>k.tagName==='svg' || isBlock(k));
    const rg=document.createRange(); rg.selectNodeContents(el);
    if(bounds.length) rg.setEndBefore(bounds[0]);
    emit(rg, el);
    bounds.forEach((bk,i)=>{
      if(bk.tagName!=='svg') walk(bk);
      const after=document.createRange(); after.setStartAfter(bk);
      if(i+1<bounds.length) after.setEndBefore(bounds[i+1]); else after.setEnd(el, el.childNodes.length);
      emit(after, el);
    });
  };
  walk(stage);
  return {runs};
}
"""


def html_to_editable_pptx(html: str, out_path: str) -> dict:
    """Render ONE gold-language HTML stage to an editable .pptx at out_path. Returns a small report.

    For multi-slide decks, use `html_list_to_editable_pptx` — it shares one Playwright browser
    + one pptx Presentation across N stages and embeds fonts once at the end, which is
    materially cheaper than calling this single-slide entry N times.
    """
    from pptx import Presentation
    from pptx.util import Emu

    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(int(13.333 * EMU)), Emu(int(7.5 * EMU))
    run_total = _render_into_presentation(prs, [html])[0]
    prs.save(out_path)
    _embed_gold_fonts(out_path)
    return {"path": out_path, "runs": run_total}


def html_list_to_editable_pptx(html_list: list, out_path: str) -> dict:
    """Render a LIST of #stage HTML stages into a single N-slide editable .pptx.

    This is the structural primitive behind the chat's "Export Deck PPTX" button. Every
    PPTX path in HiC routes through this entry, NOT through a parallel pptxgenjs template
    renderer. The chat preview (slideTemplates/web.tsx) is the source of truth for layout;
    this exporter captures the rendered DOM as a #stage 1920x1080 HTML doc and emits
    pixel-accurate editable text. One renderer, one set of brand tokens, one source of
    truth — no drift between preview and export.

    The browser context + the Presentation object are shared across all stages so:
      - browser startup cost is paid once, not N times
      - brand fonts are embedded once at the end, not N times
      - net cost is roughly proportional to total text frames, not slide count

    Returns: {path, slides:[{runs:int}], total_runs:int}
    """
    from pptx import Presentation
    from pptx.util import Emu

    if not isinstance(html_list, list) or len(html_list) == 0:
        raise ValueError("html_list must be a non-empty list of HTML strings")

    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(int(13.333 * EMU)), Emu(int(7.5 * EMU))
    per_slide_runs = _render_into_presentation(prs, html_list)
    prs.save(out_path)
    _embed_gold_fonts(out_path)
    return {
        "path": out_path,
        "slides": [{"runs": r} for r in per_slide_runs],
        "total_runs": sum(per_slide_runs),
    }


def _render_into_presentation(prs, html_list: list) -> list:
    """Shared core: open one Playwright browser, iterate over each HTML, screenshot +
    measure, append one slide to `prs` per HTML. Returns the per-slide run count list.

    Single-slide entry: pass [html]. Multi-slide entry: pass [html1, html2, ...].
    Browser is launched ONCE for the whole list, which is the cost win.
    """
    from playwright.sync_api import sync_playwright
    from pptx.util import Emu, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import MSO_ANCHOR, PP_ALIGN

    def ex(px): return Emu(int(px / W * 13.333 * EMU))
    def ey(px): return Emu(int(px / H * 7.5 * EMU))
    ALIGN = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "justify": PP_ALIGN.JUSTIFY}

    per_slide_runs = []
    tmp_paths = []
    bg_paths = []

    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            try:
                for stage_html in html_list:
                    doc = stage_html.replace("</head>", RESET + "</head>", 1) if "</head>" in stage_html else RESET + stage_html
                    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
                    tmp.write(doc); tmp.close(); tmp_paths.append(tmp.name)
                    bgfile = tempfile.NamedTemporaryFile(suffix=".png", delete=False); bgfile.close()
                    bg_paths.append(bgfile.name)

                    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
                    pg.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
                    try:
                        pg.evaluate("async () => { await document.fonts.ready; }")
                    except Exception:
                        pass
                    pg.wait_for_timeout(500)
                    m = pg.evaluate(MEASURE)
                    pg.add_style_tag(content=HIDE_TEXT)
                    pg.wait_for_timeout(120)
                    pg.screenshot(path=bgfile.name, clip={"x": 0, "y": 0, "width": W, "height": H})
                    pg.close()

                    slide = prs.slides.add_slide(prs.slide_layouts[6])
                    slide.shapes.add_picture(bgfile.name, 0, 0, width=Emu(int(13.333 * EMU)), height=Emu(int(7.5 * EMU)))

                    for r in m.get("runs", []):
                        txt = r["text"]
                        if not txt.strip():
                            continue
                        # 2026-06-05 — Out-of-bounds clip. Belt-and-suspenders
                        # against any future template that overflows the 1920x1080
                        # stage. Universal rule: a text run whose origin sits
                        # outside the slide rectangle is silently dropped (with
                        # a debug log if it spilled past the bottom — those are
                        # the high-signal density problems to catch). Pairs with
                        # the #stage{overflow:hidden} guard in slideToStageHtml.ts.
                        if r["x"] >= W or r["y"] >= H or r["x"] < -16 or r["y"] < -16:
                            continue
                        if r.get("transform") == "uppercase":
                            txt = txt.upper()
                        _lh = r.get("lh") or (r["size"] * 1.3)
                        _align = r.get("align", "left")
                        eright = min(r.get("eright", r["x"] + r["w"]), W - 24)
                        # Clamp ebottom to slide bottom so a too-tall textbox
                        # doesn't render past the visible slide area.
                        ebottom = min(r.get("ebottom", r["y"] + r["h"]), H - 12)
                        bx = r["x"]; bw = max(8.0, eright - bx); bh = max(_lh, ebottom - r["y"], 12.0)
                        right_anchored = (r["y"] < 100) and (r["x"] + r["w"] > W * 0.9) and (r["w"] < W * 0.5)
                        if right_anchored:
                            _align = "right"; bx = r["x"] - 20; bw = (W - 24) - bx
                        PW = 1.14
                        tw = r.get("tw") or r["w"]
                        target_lines = max(1, round(bh / _lh)) if _lh else 1
                        scale = min(1.0, (target_lines * bw) / max(tw * PW, 1.0))
                        _size_px = r["size"] * scale
                        bh = max(bh, target_lines * (_lh * scale) + 4)
                        tb = slide.shapes.add_textbox(ex(bx), ey(r["y"]), ex(bw), ey(bh))
                        tf = tb.text_frame; tf.word_wrap = True; tf.auto_size = None
                        tf.vertical_anchor = MSO_ANCHOR.TOP
                        for mgn in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
                            setattr(tf, mgn, 0)
                        pp = tf.paragraphs[0]; pp.alignment = ALIGN.get(_align, PP_ALIGN.LEFT)
                        lh = (r.get("lh") or 0) * scale
                        pp.line_spacing = Pt(lh * PX2PT) if lh else 1.0
                        pp.space_before = Pt(0); pp.space_after = Pt(0)
                        run = pp.add_run(); run.text = txt
                        run.font.name = r.get("family") or "Archivo"
                        run.font.size = Pt(max(5, _size_px * PX2PT))
                        run.font.bold = (r.get("weight", 400) >= 600)
                        run.font.italic = bool(r.get("italic"))
                        run.font.color.rgb = RGBColor.from_string(r.get("color") or "141414")
                        sp = r.get("spacing")
                        if sp and sp not in ("normal",):
                            try:
                                run._r.get_or_add_rPr().set("spc", str(int(float(str(sp).replace("px", "")) * PX2PT * 100)))
                            except Exception:
                                pass
                    per_slide_runs.append(len(m.get("runs", [])))
            finally:
                try: b.close()
                except Exception: pass
    finally:
        for pth in tmp_paths + bg_paths:
            try: pathlib.Path(pth).unlink(missing_ok=True)
            except Exception: pass

    return per_slide_runs


def _embed_gold_fonts(pptx_path: str) -> None:
    """Embed Lora / IBM Plex Mono (plus the brand families already in pptx_export) so the
    editable text renders faithfully on machines without the gold fonts installed."""
    try:
        import pptx_export as pe
        extra = [
            {"typeface": "Lora", "pitchFamily": 18, "charset": 0, "regular": "Lora.ttf"},
            {"typeface": "IBM Plex Mono", "pitchFamily": 49, "charset": 0,
             "regular": "IBMPlexMono-Regular.ttf", "bold": "IBMPlexMono-SemiBold.ttf"},
        ]
        have = {f.get("typeface") for f in pe.FONT_FAMILIES}
        pe.FONT_FAMILIES = pe.FONT_FAMILIES + [f for f in extra if f["typeface"] not in have]
        pe.embed_brand_fonts(pptx_path)
    except Exception:
        pass
