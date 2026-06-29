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
    // <br> is a RUN boundary: a Range's toString() drops <br>, so two <br>-separated lines
    // (e.g. OWNED OUTCOMES list items) glue into one word ("sessionOutput"). Treat <br> like a
    // block split so each line emits as its OWN run with its own geometry -> separate lines, no glue.
    const bounds=Array.from(el.children).filter(k=>k.tagName==='svg' || k.tagName==='BR' || isBlock(k));
    const rg=document.createRange(); rg.selectNodeContents(el);
    if(bounds.length) rg.setEndBefore(bounds[0]);
    emit(rg, el);
    bounds.forEach((bk,i)=>{
      if(bk.tagName!=='svg' && bk.tagName!=='BR') walk(bk);
      const after=document.createRange(); after.setStartAfter(bk);
      if(i+1<bounds.length) after.setEndBefore(bounds[i+1]); else after.setEnd(el, el.childNodes.length);
      emit(after, el);
    });
  };
  walk(stage);
  return {runs};
}
"""


# 2026-06-10 - NATIVE GEOMETRY tier (the 1-to-1 editable contract). Walks the
# stage and emits every visible background fill and per-side border as a rect
# spec, in DOM paint order. Slides without SVG render as FULLY NATIVE shapes +
# editable text (no raster at all); stages containing SVG (journey emotion
# curves) keep the proven raster graphic layer for the SVG fidelity.
GEO = r"""
() => {
  const stage = document.querySelector('#stage');
  if(!stage) return {rects:[], hasSvg:false};
  const sr = stage.getBoundingClientRect();
  const parse=(c)=>{const m=(c||'').match(/rgba?\(([^)]+)\)/); if(!m) return null;
    const p=m[1].split(',').map(s=>parseFloat(s.trim()));
    return {r:p[0],g:p[1],b:p[2],a:p.length>=4?p[3]:1};};
  const hex=(o)=>{const h=n=>('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2);
    return (h(o.r)+h(o.g)+h(o.b)).toUpperCase();};
  const rects=[];
  const images=[];
  const svgRegions=[];
  const push=(x,y,w,h,col,chrome)=>{
    if(!col||col.a===0||w<0.5||h<0.5) return;
    rects.push({x:x-sr.left,y:y-sr.top,w:w,h:h,fill:hex(col),alpha:col.a,chrome:!!chrome});
  };
  // 2026-06-27 - CHROME tagging: rail / dot-mark / logo are REPEATING brand chrome that the
  // exporter hoists onto a per-variant slide LAYOUT (defined once, inherited). Tag every item
  // under .rail/.dotmark/.brandlogo so the per-slide passes can EXCLUDE it (no doubles).
  const walk=(el,inChrome)=>{
    const chrome = inChrome || (el.classList && (el.classList.contains('rail') || el.classList.contains('dotmark') || el.classList.contains('brandlogo')));
    // 2026-06-27 - SVG capture: record each <svg>'s bounds (logo monogram, dot-mark,
    // diagrams) so the exporter can clip-screenshot it to a TOKENIZED native picture at
    // its slot bounds, instead of flattening the whole slide to one immovable raster.
    // The in-HTML SVG is the Figma-component mirror (hydrated from /api/design-tokens),
    // so the captured picture is brand-correct with no runtime Figma call. Do not recurse.
    if(el.tagName==='svg'){
      const b=el.getBoundingClientRect();
      if(b.width>=2&&b.height>=2) svgRegions.push({x:b.left-sr.left,y:b.top-sr.top,w:b.width,h:b.height,chrome:!!chrome});
      return;
    }
    // 2026-06-25 - IMG capture: emit each <img> (illustrator slot art: journey phase
    // thumbnails, cover/section/thesis panels) as a REAL, swappable PowerPoint picture
    // at its slot bounds. Capture pixels via canvas->data-URI so it works for data-URIs
    // AND same-origin URLs regardless of how the renderer carried the src; a tainted
    // (cross-origin) canvas falls back to the raw src for the python side to fetch.
    if(el.tagName==='IMG'){
      const b=el.getBoundingClientRect();
      if(b.width>=2&&b.height>=2){
        let data='';
        try{
          const cv=document.createElement('canvas');
          cv.width=(el.naturalWidth||b.width); cv.height=(el.naturalHeight||b.height);
          cv.getContext('2d').drawImage(el,0,0,cv.width,cv.height);
          data=cv.toDataURL('image/png');
        }catch(e){ data=el.getAttribute('src')||el.src||''; }
        if(data) images.push({x:b.left-sr.left,y:b.top-sr.top,w:b.width,h:b.height,src:data,chrome:!!chrome});
      }
      return;
    }
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden') return;
    const b=el.getBoundingClientRect();
    const bg=parse(cs.backgroundColor);
    // 2026-06-27 - The #stage root's OWN background is the paper CANVAS, not slide content. Tag it
    // chrome so it lands on the per-variant LAYOUT as the bottom-most shape (behind rail/dot-mark/
    // logo). Otherwise it renders as a full-page rect ON THE SLIDE that COVERS the inherited master
    // chrome (the bug: rail/logo hidden behind a white box on every content slide).
    const isStageRoot = (el===stage);
    if(bg&&bg.a>0) push(b.left,b.top,b.width,b.height,bg, chrome || isStageRoot);
    const lw=parseFloat(cs.borderLeftWidth)||0, rw=parseFloat(cs.borderRightWidth)||0,
          tw=parseFloat(cs.borderTopWidth)||0, bw=parseFloat(cs.borderBottomWidth)||0;
    if(lw>=0.5&&cs.borderLeftStyle!=='none') push(b.left,b.top,lw,b.height,parse(cs.borderLeftColor),chrome);
    if(rw>=0.5&&cs.borderRightStyle!=='none') push(b.right-rw,b.top,rw,b.height,parse(cs.borderRightColor),chrome);
    if(tw>=0.5&&cs.borderTopStyle!=='none') push(b.left,b.top,b.width,tw,parse(cs.borderTopColor),chrome);
    if(bw>=0.5&&cs.borderBottomStyle!=='none') push(b.left,b.bottom-bw,b.width,bw,parse(cs.borderBottomColor),chrome);
    for(const k of el.children) walk(k,chrome);
  };
  walk(stage,false);
  return {rects, images, svgRegions, hasSvg: !!stage.querySelector('svg')};
}
"""


def _insert_native_picture(slide, stream, x_emu, y_emu, w_emu, h_emu, idx, cid):
    """Insert an image as a NATIVE, LAYOUT-BACKED PowerPoint PICTURE placeholder (user can 'Change
    Picture' natively) at the given slot bounds. A slide placeholder only RENDERS if a matching
    placeholder exists on its slideLayout, so we add a `<p:ph type="pic" idx>` to BOTH the layout
    (the backing) and the slide, then fill the slide one via insert_picture. Returns the inserted
    picture, or None on failure (caller falls back to add_picture)."""
    from pptx.oxml import parse_xml
    P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
    A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    ox, oy, cx, cy = int(x_emu), int(y_emu), int(max(w_emu, 1)), int(max(h_emu, 1))

    def ph_sp(name, cid_):
        return parse_xml((
            '<p:sp xmlns:p="%s" xmlns:a="%s">'
            '<p:nvSpPr><p:cNvPr id="%d" name="%s %d"/>'
            '<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>'
            '<p:nvPr><p:ph type="pic" idx="%d"/></p:nvPr></p:nvSpPr>'
            '<p:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
            '</p:sp>'
        ) % (P, A, cid_, name, idx, idx, ox, oy, cx, cy))

    # 1) ensure the LAYOUT has a matching picture placeholder (the backing that makes it render)
    layout = slide.slide_layout
    if not any(pl.placeholder_format is not None and pl.placeholder_format.idx == idx for pl in layout.placeholders):
        layout.shapes._spTree.append(ph_sp('Picture Placeholder', 90000 + idx))
    # 2) add the SLIDE picture placeholder (same idx) + fill it
    slide.shapes._spTree.append(ph_sp('Picture Placeholder', cid))
    ph = None
    for p in slide.placeholders:
        if p.placeholder_format is not None and p.placeholder_format.idx == idx:
            ph = p
            break
    if ph is None:
        return None
    pic = ph.insert_picture(stream)
    try:
        pic.crop_left = pic.crop_right = pic.crop_top = pic.crop_bottom = 0
    except Exception:
        pass
    return pic


def _place_geo_images(slide, images, ex, ey, W, H):
    """Place each GEO-walked <img> as a REAL native PowerPoint picture at its slot bounds: a
    layout-backed Picture Placeholder ('Change Picture') first, plain add_picture on fallback.
    Used by BOTH tiers - the native geometry tier and the raster (SVG) tier - so slot art
    (journey phase thumbs, cover/section panels, the mind-map hub glyph, per-pattern marks) is a
    swappable native picture in every export, never baked into a flat raster."""
    import base64 as _b64, io as _io
    for _ii, im in enumerate(images or []):
        if im["x"] >= W or im["y"] >= H:
            continue
        src = im.get("src") or ""
        stream = None
        try:
            if src.startswith("data:"):
                stream = _io.BytesIO(_b64.b64decode(src.split(",", 1)[1]))
            elif src.startswith("http"):
                import urllib.request as _u
                stream = _io.BytesIO(_u.urlopen(src, timeout=10).read())
        except Exception:
            stream = None
        if stream is None:
            continue
        _pidx, _pcid = 100 + _ii, 9000 + _ii
        try:
            _r = _insert_native_picture(slide, stream, ex(im["x"]), ey(im["y"]),
                                        ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)), _pidx, _pcid)
            if _r is None:
                stream.seek(0)
                slide.shapes.add_picture(stream, ex(im["x"]), ey(im["y"]),
                                         ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)))
        except Exception:
            try:
                stream.seek(0)
                slide.shapes.add_picture(stream, ex(im["x"]), ey(im["y"]),
                                         ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)))
            except Exception:
                pass


# ---------------------------------------------------------------------------
# PER-VARIANT MASTER LAYOUTS (2026-06-27)
# A #slides deck mixes slide variants (cover / divider / content / journey / org ...). Each
# variant's REPEATING brand chrome (rail + dot-mark + logo) is hoisted ONCE onto its OWN cloned
# layout; content slides of that variant inherit it (defined once, editable once, not duplicated
# per slide, and the content slides are normal slides, not masters). Spike-proven: clone is valid
# on reopen, shapes + pictures on a layout inherit, slides carry no chrome copy.
# ---------------------------------------------------------------------------

def _rect_sp(sid, name, x_emu, y_emu, cx_emu, cy_emu, hexcol):
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls
    return parse_xml(
        f'<p:sp {nsdecls("p", "a")}>'
        f'<p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{int(x_emu)}" y="{int(y_emu)}"/><a:ext cx="{max(1, int(cx_emu))}" cy="{max(1, int(cy_emu))}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
        f'<a:solidFill><a:srgbClr val="{hexcol}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>'
        f'<p:txBody><a:bodyPr/><a:p/></p:txBody></p:sp>')


def _clone_blank_layout(prs, name):
    """Clone the blank layout (idx 6) into a NEW registered slide layout and return it. The clone
    is a clean blank canvas (no Microsoft placeholders leak because the source is the blank layout)
    onto which a variant's chrome is appended. Registered in the master's sldLayoutIdLst + rels so
    the package is valid on reopen."""
    import copy
    from pptx.oxml.ns import nsdecls, qn
    from pptx.oxml import parse_xml
    from pptx.parts.slide import SlideLayoutPart
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT, CONTENT_TYPE as CT
    master = prs.slide_masters[0]
    src = prs.slide_layouts[6]
    new_el = copy.deepcopy(src._element)
    try:
        new_el.get_or_add_cSld().set("name", name)
    except Exception:
        pass
    pkg = prs.part.package
    partname = pkg.next_partname("/ppt/slideLayouts/slideLayout%d.xml")
    new_part = SlideLayoutPart(partname, CT.PML_SLIDE_LAYOUT, pkg, new_el)
    rId = master.part.relate_to(new_part, RT.SLIDE_LAYOUT)
    new_part.relate_to(master.part, RT.SLIDE_MASTER)
    lst = master._element.get_or_add_sldLayoutIdLst()
    ids = [int(x.get("id")) for x in lst.findall(qn("p:sldLayoutId"))] or [2147483648]
    lst.append(parse_xml(f'<p:sldLayoutId {nsdecls("p", "r")} id="{max(ids) + 1}" r:id="{rId}"/>'))
    return new_part.slide_layout


def _layout_add_picture(lay, stream, x_emu, y_emu, cx_emu, cy_emu, sid, name):
    """Append a picture to a LAYOUT's shape tree (inherited by every slide using the layout). Uses
    the layout part's image-part machinery + a p:pic element (no friendly add_picture on layouts)."""
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls
    image_part, rId = lay.part.get_or_add_image_part(stream)
    pic = parse_xml(
        f'<p:pic {nsdecls("p", "a", "r")}>'
        f'<p:nvPicPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>'
        f'<p:blipFill><a:blip r:embed="{rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="{int(x_emu)}" y="{int(y_emu)}"/><a:ext cx="{max(1, int(cx_emu))}" cy="{max(1, int(cy_emu))}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
    lay.shapes._spTree.append(pic)


def _chrome_signature(chrome_rects, chrome_svgs, chrome_imgs):
    """Stable key for a variant's chrome so slides with identical chrome share ONE cloned layout.
    Rounds bounds to 2px so sub-pixel jitter does not fork layouts."""
    def r(items, keys):
        return tuple(sorted(tuple(round(float(i.get(k, 0)) / 2) * 2 for k in keys) + (str(i.get("fill", "")),) for i in (items or [])))
    return repr((r(chrome_rects, ("x", "y", "w", "h")), r(chrome_svgs, ("x", "y", "w", "h")), r(chrome_imgs, ("x", "y", "w", "h"))))


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


def html_list_to_faithful_pptx(html_list: list, out_path: str) -> dict:
    """FAITHFUL render (the #proto workflow): each composed 1920x1080 HTML stage is rendered in a
    real browser with fonts loaded, then captured as ONE full-bleed image per slide - NO graphics/
    text split, NO native-text re-render, NO font substitution. The exported pixels are identical to
    the Analyst Desk preview because they ARE the same rendered HTML (logo SVG, Saira/Archivo/Lato,
    every archetype layout - all baked from the actual render). This is the unified-vision / prototype
    contract: the composed HTML is the single source of truth and the artifact is a faithful capture
    of it, never a re-interpretation. Trade-off: the slide text is not natively editable (it is the
    rendered image) - fidelity over editability, exactly as #proto.
    """
    from playwright.sync_api import sync_playwright
    from pptx import Presentation
    from pptx.util import Emu

    if not isinstance(html_list, list) or len(html_list) == 0:
        raise ValueError("html_list must be a non-empty list of HTML strings")

    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(int(13.333 * EMU)), Emu(int(7.5 * EMU))
    shots = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            try:
                for stage_html in html_list:
                    doc = stage_html.replace("</head>", RESET + "</head>", 1) if "</head>" in stage_html else RESET + stage_html
                    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
                    tmp.write(doc); tmp.close()
                    shot = tempfile.NamedTemporaryFile(suffix=".png", delete=False); shot.close()
                    shots.append((tmp.name, shot.name))
                    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2)
                    pg.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
                    try:
                        pg.evaluate("async () => { await document.fonts.ready; }")
                    except Exception:
                        pass
                    pg.wait_for_timeout(500)   # let webfonts + the inline logo SVG settle before capture
                    pg.screenshot(path=shot.name, clip={"x": 0, "y": 0, "width": W, "height": H})
                    pg.close()
            finally:
                b.close()
        for _html_tmp, shot_png in shots:
            slide = prs.slides.add_slide(prs.slide_layouts[6])
            slide.shapes.add_picture(shot_png, 0, 0, width=Emu(int(13.333 * EMU)), height=Emu(int(7.5 * EMU)))
        prs.save(out_path)
    finally:
        for html_tmp, shot_png in shots:
            for f in (html_tmp, shot_png):
                try:
                    os.unlink(f)
                except Exception:
                    pass
    return {"path": out_path, "slides": [{"runs": 0} for _ in html_list], "total_runs": 0, "mode": "faithful"}


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
                sig_to_layout = {}
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
                    geo = pg.evaluate(GEO)
                    # 2026-06-27 - SVG no longer forces a full-slide raster. ANY slide with geometry
                    # goes NATIVE: solid Gold decoration -> movable native shapes (direct
                    # interpretation, token colour + bounds), text -> native runs, each <svg>
                    # (logo / dot-mark / diagram) -> its OWN tokenized native picture at its bounds
                    # (clip-screenshot of the Figma-component mirror in the HTML). The all-or-nothing
                    # raster that baked every decorative element into one immovable image is gone;
                    # the raster path remains ONLY as a fallback when the geometry walk is empty.
                    # PARTITION chrome (repeating brand decoration -> per-variant LAYOUT) from
                    # content (per-slide). Chrome was tagged by the GEO walker (.rail/.dotmark/.brandlogo).
                    all_rects = geo.get("rects", [])
                    content_rects = [r for r in all_rects if not r.get("chrome")]
                    chrome_rects = [r for r in all_rects if r.get("chrome")]
                    all_imgs = geo.get("images", [])
                    content_imgs = [i for i in all_imgs if not i.get("chrome")]
                    chrome_imgs = [i for i in all_imgs if i.get("chrome")]
                    all_svgs = geo.get("svgRegions", [])
                    native = bool(all_rects)
                    sig = _chrome_signature(chrome_rects, [s for s in all_svgs if s.get("chrome")], chrome_imgs)
                    need_chrome = native and sig not in sig_to_layout
                    content_svg_pics = []
                    chrome_svg_pics = []
                    if native:
                        # Hide non-svg text + <img> so neither bakes into a per-svg region shot
                        # (text is native runs; <img> are native pictures). HIDE_TEXT keeps <svg>
                        # visible, so each region screenshot captures the tokenized vector as-is.
                        pg.add_style_tag(content=HIDE_TEXT)
                        if all_imgs:
                            pg.add_style_tag(content="#stage img{visibility:hidden !important}")
                        pg.wait_for_timeout(80)
                        import base64 as _b64svg
                        for _r in all_svgs:
                            _is_chrome = bool(_r.get("chrome"))
                            if _is_chrome and not need_chrome:
                                continue  # this variant's chrome layout already built
                            try:
                                _shot = pg.screenshot(clip={"x": max(0, _r["x"]), "y": max(0, _r["y"]),
                                                            "width": max(1, _r["w"]), "height": max(1, _r["h"])})
                                _rec = {"x": _r["x"], "y": _r["y"], "w": _r["w"], "h": _r["h"],
                                        "src": "data:image/png;base64," + _b64svg.b64encode(_shot).decode()}
                                (chrome_svg_pics if _is_chrome else content_svg_pics).append(_rec)
                            except Exception:
                                pass
                    else:
                        # Fallback: geometry walk empty -> keep the proven full-bleed raster.
                        pg.add_style_tag(content=HIDE_TEXT)
                        if all_imgs:
                            pg.add_style_tag(content="#stage img{visibility:hidden !important}")
                        pg.wait_for_timeout(120)
                        pg.screenshot(path=bgfile.name, clip={"x": 0, "y": 0, "width": W, "height": H})
                    pg.close()

                    # GET-OR-CREATE the per-variant LAYOUT carrying this slide's chrome (defined once,
                    # inherited by every slide of this variant). First time a chrome signature is seen,
                    # clone the blank layout and append its chrome: rail/dot-mark -> native shapes,
                    # logo -> native picture. Subsequent same-variant slides reuse it (no duplication).
                    layout = sig_to_layout.get(sig)
                    if layout is None:
                        layout = _clone_blank_layout(prs, f"GOLD variant {len(sig_to_layout) + 1}")
                        if native:
                            from pptx.oxml import parse_xml as _px  # noqa: F401 (kept for symmetry)
                            for _ci, rc in enumerate(chrome_rects):
                                if rc["x"] >= W or rc["y"] >= H:
                                    continue
                                layout.shapes._spTree.append(_rect_sp(
                                    8000 + _ci, "GOLD chrome", ex(rc["x"]), ey(rc["y"]),
                                    ex(max(rc["w"], 1.0)), ey(max(rc["h"], 1.0)), rc["fill"]))
                            import base64 as _b64ch, io as _ioch
                            for _ci, im in enumerate(list(chrome_imgs) + chrome_svg_pics):
                                if im["x"] >= W or im["y"] >= H:
                                    continue
                                _src = im.get("src") or ""
                                try:
                                    if _src.startswith("data:"):
                                        _st = _ioch.BytesIO(_b64ch.b64decode(_src.split(",", 1)[1]))
                                    elif _src.startswith("http"):
                                        import urllib.request as _uch
                                        _st = _ioch.BytesIO(_uch.urlopen(_src, timeout=10).read())
                                    else:
                                        continue
                                    _layout_add_picture(layout, _st, ex(im["x"]), ey(im["y"]),
                                                        ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)),
                                                        8500 + _ci, "GOLD chrome logo")
                                except Exception:
                                    pass
                        sig_to_layout[sig] = layout
                    slide = prs.slides.add_slide(layout)
                    if native:
                        # NATIVE GEOMETRY tier: every fill and border bar is a real
                        # PPTX rectangle a consultant can recolor/move/resize.
                        from pptx.enum.shapes import MSO_SHAPE
                        try:
                            from pptx_export import _set_solid_fill_with_alpha, _suppress_effects
                        except Exception:
                            _set_solid_fill_with_alpha = None
                            _suppress_effects = None
                        for rc in content_rects:
                            if rc["x"] >= W or rc["y"] >= H:
                                continue
                            shp = slide.shapes.add_shape(
                                MSO_SHAPE.RECTANGLE, ex(rc["x"]), ey(rc["y"]),
                                ex(max(rc["w"], 1.0)), ey(max(rc["h"], 1.0)))
                            shp.shadow.inherit = False
                            shp.line.fill.background()
                            if _set_solid_fill_with_alpha is not None and rc.get("alpha", 1) < 1:
                                _set_solid_fill_with_alpha(shp.fill._xPr, rc["fill"], rc["alpha"])
                            else:
                                shp.fill.solid()
                                shp.fill.fore_color.rgb = RGBColor.from_string(rc["fill"])
                            if _suppress_effects is not None:
                                try:
                                    _suppress_effects(shp._element.spPr)
                                except Exception:
                                    pass
                            # 2026-06-11 - remove <p:style> entirely. Its
                            # fillRef/lnRef point at theme accent1; whenever an
                            # explicit fill is missing or schema-invalid,
                            # PowerPoint falls back to it and paints the shape
                            # OFFICE BLUE (the journey-map deck corruption).
                            # Explicit spPr carries everything we need.
                            try:
                                _sp = shp._element
                                _style = _sp.find(
                                    '{http://schemas.openxmlformats.org/presentationml/2006/main}style')
                                if _style is not None:
                                    _sp.remove(_style)
                            except Exception:
                                pass
                        # 2026-06-25 - place IMG slot art (journey phase thumbnails, cover/
                        # section/thesis panels) as REAL, movable, swappable PowerPoint picture
                        # objects at their slot bounds. The GEO walker captured each <img> as a
                        # data-URI (or raw src). The native tier has no bg raster, so images must
                        # be added explicitly; they sit ABOVE the geometry (added last). This closes
                        # the long-standing gap where the editable tier silently DROPPED every image.
                        # 2026-06-25 - NATIVE picture placeholders: each generated image (viz/
                        # illustrator slot art) goes in as a real PowerPoint PICTURE PLACEHOLDER so
                        # the user can swap it via 'Change Picture' natively. Falls back to a plain
                        # add_picture only if the placeholder injection fails.
                        # 2026-06-27 - svg_pics = each <svg> region (logo / dot-mark / diagram) as its
                        # OWN tokenized native picture at its bounds (no full-slide raster). Placed
                        # alongside the <img> slot art so every decorative vector is movable/swappable.
                        _place_geo_images(slide, list(content_imgs) + content_svg_pics, ex, ey, W, H)
                    else:
                        slide.shapes.add_picture(bgfile.name, 0, 0, width=Emu(int(13.333 * EMU)), height=Emu(int(7.5 * EMU)))
                        # 2026-06-27 - SVG (raster) tier: the HTML <img> overlays were HIDDEN in the
                        # raster capture above, so re-place each as a REAL native picture over the
                        # raster (the mind-map hub glyph, any slot art on a diagram stage). SVG-embedded
                        # marks (<image> inside <svg>) stay in the diagram raster by design.
                        _place_geo_images(slide, content_imgs, ex, ey, W, H)

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
                        # 2026-06-11 - BOX-SLOP TIGHTENING. (a) A single-line run
                        # does not need its element's full width: cap the box at
                        # the text width + slack so left-aligned kickers never
                        # overlap the right-anchored wordmark box. (b) Never let
                        # the line-count rounding extend the box materially past
                        # the element bottom - phantom tail rows were tripping
                        # box-overlap assertions against the sources strip.
                        _tw0 = r.get("tw") or r["w"]
                        if r["h"] <= _lh * 1.6 and (r.get("align", "left") or "left") in ("left", "start"):
                            bw = min(bw, max(_tw0 * 1.10 + 24.0, 60.0))
                            # Single-line runs also cap HEIGHT at their own line:
                            # table cells / flex parents otherwise donate their
                            # full container bottom (header text inheriting the
                            # cell's definition-row height), creating phantom
                            # tall boxes that trip overlap assertions.
                            bh = min(bh, max(r["h"] + 6.0, _lh * 1.05))
                        right_anchored = (r["y"] < 100) and (r["x"] + r["w"] > W * 0.9) and (r["w"] < W * 0.5)
                        if right_anchored:
                            _align = "right"; bx = r["x"] - 20; bw = (W - 24) - bx
                        PW = 1.14
                        tw = r.get("tw") or r["w"]
                        target_lines = max(1, round(bh / _lh)) if _lh else 1
                        scale = min(1.0, (target_lines * bw) / max(tw * PW, 1.0))
                        _size_px = r["size"] * scale
                        bh = max(bh, target_lines * (_lh * scale) + 4)
                        # Global cap: a run never inherits more than ONE line of
                        # slack beyond its measured text height. Container
                        # bottoms (table cells, flex parents) otherwise donate
                        # phantom depth; one line is enough headroom for
                        # PowerPoint font-metric rewrap drift.
                        bh = min(bh, r["h"] + _lh)
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
                        # 2026-06-14 - editable-overlay floor raised 5->8pt to match the
                        # redesign's 8.5pt legibility floor (the renderer now sizes all text
                        # at >=17 stage px); guarantees the PPTX text layer never undercuts it.
                        run.font.size = Pt(max(8, _size_px * PX2PT))
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
            # NXT display/title face. Was MISSING from FONT_FAMILIES, so PowerPoint substituted
            # Calibri/Arial for every Saira-Condensed title in the editable export.
            {"typeface": "Saira Condensed", "pitchFamily": 34, "charset": 0,
             "regular": "SairaCondensed-Regular.ttf", "bold": "SairaCondensed-SemiBold.ttf"},
        ]
        have = {f.get("typeface") for f in pe.FONT_FAMILIES}
        pe.FONT_FAMILIES = pe.FONT_FAMILIES + [f for f in extra if f["typeface"] not in have]
        pe.embed_brand_fonts(pptx_path)
    except Exception:
        pass
