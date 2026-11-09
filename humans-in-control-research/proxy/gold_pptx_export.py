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
from render_sandbox import sandboxed_page  # WS-0 S3 (2026-10-30): network-sandboxed renders
import re
import tempfile
import pathlib
import logging

logger = logging.getLogger("gold_pptx_export")
from brand_fonts import export_fallbacks as _export_fallbacks
_TOKEN_FALLBACKS = _export_fallbacks()

W, H = 1920, 1080
EMU = 914400
PX2PT = 13.333 * 72.0 / W   # = 0.5 for W=1920 (144 px/in stage)
_FONTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "static")
_HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# BRAND-AWARE PRESENTATION SOURCE (2026-10-01, DECIEM third brand mode)
# NXT and NU decks start from python-pptx's default Presentation() exactly as before.
# A DECIEM deck (stage HTML <html data-brand="deciem">) starts FROM the dissected DECIEM
# template (34 layouts, zero slides) so the exported file inherits the template master,
# theme and layouts; the per-variant chrome layouts are then cloned from the template's
# own BLANK layout instead of the default template's index 6.
# ---------------------------------------------------------------------------
_STAGE_BRAND_RE = re.compile(r'<html\b[^>]*\bdata-brand=["\']([A-Za-z0-9_-]+)["\']', re.I)
_DECIEM_TEMPLATE_CANDIDATES = (
    "/hic-workspace/design-system/deciem/deciem-template.pptx",
    os.path.join(_HERE, "..", "hic-workspace", "design-system", "deciem", "deciem-template.pptx"),
)
_SIZE_TOLERANCE_EMU = 2000   # ~0.002 in: 13.333in (12191695) vs the template's 12192000


def stage_brand(html_list) -> str:
    """Lower-case brand id carried by the FIRST stage document's <html data-brand="...">.
    Unknown or missing -> 'nxt' (the pre-DECIEM behaviour)."""
    if not html_list:
        return "nxt"
    first = html_list[0] if isinstance(html_list, (list, tuple)) else html_list
    m = _STAGE_BRAND_RE.search(first or "")
    b = (m.group(1).strip().lower() if m else "nxt")
    return b if b in ("nxt", "nu", "deciem") else "nxt"


def deciem_template_path():
    """Container path first, repo-relative fallback (same order as the token loader).
    Returns None when neither exists."""
    for c in _DECIEM_TEMPLATE_CANDIDATES:
        if os.path.isfile(c):
            return os.path.normpath(c)
    return None


def _blank_layout_index(prs, default: int = 6) -> int:
    """Index of the layout to clone per-variant chrome onto: a layout named like
    'Blank' first, else the first layout carrying no placeholders, else `default`."""
    layouts = list(prs.slide_layouts)
    for i, lay in enumerate(layouts):
        if (lay.name or "").strip().lower() == "blank":
            return i
    for i, lay in enumerate(layouts):
        try:
            if len(lay.placeholders) == 0:
                return i
        except Exception:
            continue
    return default if default < len(layouts) else 0


def _strip_embedded_fonts(prs) -> int:
    """Remove a template's own <p:embeddedFontLst> and its font relationships so the
    export's embedder (pptx_export.embed_brand_fonts, which writes ppt/fonts/fontN.fntdata
    by index and appends ONE embeddedFontLst) does not collide with template parts or
    produce a second font list. The unreferenced .fntdata parts are not serialized.
    Returns the number of font relationships dropped."""
    from pptx.oxml.ns import qn
    dropped = 0
    try:
        el = prs.part._element
        for lst in el.findall(qn("p:embeddedFontLst")):
            el.remove(lst)
    except Exception:
        pass
    try:
        font_rt = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"
        rels = prs.part.rels
        for rId in [r for r in list(rels.keys()) if getattr(rels[r], "reltype", "") == font_rt]:
            try:
                prs.part.drop_rel(rId)
                dropped += 1
            except Exception:
                pass
    except Exception:
        pass
    return dropped


def new_presentation(brand: str = "nxt"):
    """(prs, blank_layout_index) for the brand. NXT / NU: default Presentation() sized
    13.333x7.5in with blank layout 6 (unchanged). DECIEM: the template file when present
    (size verified, not resized when already 13.333x7.5in; template fonts stripped so the
    manifest embedder owns the font list), else the default with a warning."""
    from pptx import Presentation
    from pptx.util import Emu
    target_w, target_h = int(13.333 * EMU), int(7.5 * EMU)
    if brand == "deciem":
        tp = deciem_template_path()
        if tp:
            prs = Presentation(tp)
            if abs(int(prs.slide_width) - target_w) > _SIZE_TOLERANCE_EMU or abs(int(prs.slide_height) - target_h) > _SIZE_TOLERANCE_EMU:
                logger.warning(f"[gold-pptx] DECIEM template is {prs.slide_width}x{prs.slide_height} EMU; resizing to 13.333x7.5in")
                prs.slide_width, prs.slide_height = Emu(target_w), Emu(target_h)
            _strip_embedded_fonts(prs)
            return prs, _blank_layout_index(prs)
        logger.warning("[gold-pptx] DECIEM template not found at any candidate path; exporting on the default master")
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(target_w), Emu(target_h)
    return prs, 6

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
  // 2026-10-05: the stage fit script may set CSS zoom on the canvas; Chromium reports the UN-zoomed font size, so
  // the effective zoom (product over ancestors) scales size and line height to the rendered geometry.
  const zoomOf=(el)=>{let z=1;for(let a=el;a&&a.nodeType===1;a=a.parentElement){const v=parseFloat(getComputedStyle(a).zoom);if(v&&isFinite(v))z*=v;}return z;};
  const emit=(rg, el)=>{
    const txt=rg.toString().replace(/\s+/g,' ').trim();
    if(!txt) return;
    const rb=rg.getBoundingClientRect();
    if(rb.width<1 || rb.height<1) return;
    const cs=getComputedStyle(el);
    const eb=el.getBoundingClientRect();
    runs.push({text:txt, x:rb.left-sr.left, y:rb.top-sr.top, w:rb.width, h:rb.height, tw:rb.width,
      eright:eb.right-sr.left, ebottom:eb.bottom-sr.top, etop:eb.top-sr.top,
      size:(parseFloat(cs.fontSize)||16)*zoomOf(el), weight:parseInt(cs.fontWeight)||400, color:toHex(cs.color)||null,
      align:cs.textAlign||'left', transform:cs.textTransform||'none',
      family:(cs.fontFamily||'').split(',')[0].replace(/['"]/g,'').trim(), spacing:cs.letterSpacing,
      italic:cs.fontStyle==='italic', lh:(parseFloat(cs.lineHeight)||0)*zoomOf(el)});
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
  const push=(x,y,w,h,col,chrome,ov)=>{
    if(!col||col.a===0||w<0.5||h<0.5) return;
    const rec={x:x-sr.left,y:y-sr.top,w:w,h:h,fill:hex(col),alpha:col.a,chrome:!!chrome};
    // WS-1e (2026-07-09) - OVERLAY tagging: elements carrying class 'pptx-overlay' or a
    // data-pptx-overlay attribute are absolutely-positioned annotation shapes that must sit
    // ABOVE pictures (numbered discs, badges). The assembly loop places them AFTER all
    // pictures; data-pptx-overlay="oval" renders as a native OVAL instead of a rect.
    if(ov){rec.overlay=true; rec.shape=(String(ov).toLowerCase()==='oval')?'oval':'rect';}
    rects.push(rec);
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
      if(b.width>=2&&b.height>=2){
        const _svgrec={x:b.left-sr.left,y:b.top-sr.top,w:b.width,h:b.height,chrome:!!chrome};
        // WS-1c (2026-07-09) - TRUE VECTOR for ALL structural SVGs (logo, dot-mark, charts),
        // not just .brandlogo: carry the serialized markup so the exporter embeds a TRUE
        // VECTOR picture (SVG blip + PNG fallback). Guard: serialized markup above 200KB
        // (huge diagram SVGs) stays raster-only - the clip-screenshot remains the fallback
        // blip either way, exactly like the original logo path.
        try{
          const _ser=new XMLSerializer().serializeToString(el);
          if(_ser && _ser.length<=200000) _svgrec.svg=_ser;
        }catch(e){}
        svgRegions.push(_svgrec);
      }
      return;
    }
    // 2026-06-25 - IMG capture: emit each <img> (illustrator slot art: journey phase
    // thumbnails, cover/section/thesis panels) as a REAL, swappable PowerPoint picture
    // at its slot bounds. Capture pixels via canvas->data-URI so it works for data-URIs
    // AND same-origin URLs regardless of how the renderer carried the src.
    // 2026-07-02 - BROKEN images are SKIPPED outright (a broken glyph or an empty frame
    // must never reach the deck), and SVG payloads the canvas cannot rasterize fall back
    // to the clip-screenshot tier (data-pptx-shot marks them so the img-hide rule spares
    // them and the region shot captures the icon exactly as the browser painted it).
    // The raw-src passthrough is limited to http(s): python-pptx cannot embed SVG bytes,
    // and passing them through was the root of the empty-placeholder epidemic.
    if(el.tagName==='IMG'){
      const b=el.getBoundingClientRect();
      if(b.width>=2&&b.height>=2){
        const src0=el.currentSrc||el.src||el.getAttribute('src')||'';
        const svgSrc=/^data:image\/svg/i.test(src0);
        if(!el.complete||(el.naturalWidth===0&&!svgSrc)) return;
        let data='';
        try{
          const cv=document.createElement('canvas');
          cv.width=Math.max(1,Math.round(el.naturalWidth||b.width));
          cv.height=Math.max(1,Math.round(el.naturalHeight||b.height));
          cv.getContext('2d').drawImage(el,0,0,cv.width,cv.height);
          const d=cv.toDataURL('image/png');
          if(d&&d.length>100) data=d;
        }catch(e){}
        if(!data&&svgSrc){
          el.setAttribute('data-pptx-shot','1');
          svgRegions.push({x:b.left-sr.left,y:b.top-sr.top,w:b.width,h:b.height,chrome:!!chrome});
          return;
        }
        if(!data&&/^https?:/i.test(src0)) data=src0;
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
    // 2026-10-27 (run 44 PowerPoint render: no rail, wordmark or dot-mark on any slide): the deck composer paints its
    // canvas on a full-stage wrapper div INSIDE #stage, so that wrapper is the canvas too, not a slide-level rect over
    // the layout chrome.
    const isStageRoot = (el===stage) || (el.parentElement===stage && b.left<=sr.left+1 && b.top<=sr.top+1
      && b.width>=sr.width-2 && b.height>=sr.height-2);
    // WS-1e overlay marker: attribute value wins (e.g. "oval"); bare class means rect.
    const ov=(el.getAttribute&&el.getAttribute('data-pptx-overlay'))
      ||((el.classList&&el.classList.contains('pptx-overlay'))?'rect':null);
    if(bg&&bg.a>0) push(b.left,b.top,b.width,b.height,bg, chrome || isStageRoot, ov);
    const lw=parseFloat(cs.borderLeftWidth)||0, rw=parseFloat(cs.borderRightWidth)||0,
          tw=parseFloat(cs.borderTopWidth)||0, bw=parseFloat(cs.borderBottomWidth)||0;
    if(lw>=0.5&&cs.borderLeftStyle!=='none') push(b.left,b.top,lw,b.height,parse(cs.borderLeftColor),chrome,ov);
    if(rw>=0.5&&cs.borderRightStyle!=='none') push(b.right-rw,b.top,rw,b.height,parse(cs.borderRightColor),chrome,ov);
    if(tw>=0.5&&cs.borderTopStyle!=='none') push(b.left,b.top,b.width,tw,parse(cs.borderTopColor),chrome,ov);
    if(bw>=0.5&&cs.borderBottomStyle!=='none') push(b.left,b.bottom-bw,b.width,bw,parse(cs.borderBottomColor),chrome,ov);
    for(const k of el.children) walk(k,chrome);
  };
  walk(stage,false);
  return {rects, images, svgRegions, hasSvg: !!stage.querySelector('svg')};
}
"""


def _raster_bytes(src: str):
    """Decode an <img> src (data URI or http URL) to raster bytes, or None when the payload is
    not an image format PowerPoint can embed (SVG markup, HTML error pages, truncated data).
    python-pptx raises on non-raster bytes; validating the magic number UP FRONT means a bad
    payload is skipped cleanly instead of half-inserting anything."""
    import base64 as _b64
    raw = None
    try:
        if src.startswith("data:"):
            raw = _b64.b64decode(src.split(",", 1)[1])
        elif src.startswith("http"):
            import urllib.request as _u
            raw = _u.urlopen(src, timeout=10).read()
    except Exception:
        return None
    if not raw or len(raw) < 24:
        return None
    if (raw.startswith(b"\x89PNG") or raw.startswith(b"\xff\xd8\xff")
            or raw[:6] in (b"GIF87a", b"GIF89a") or raw[:2] == b"BM"
            or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")):
        return raw
    return None


def _png_or_jpeg_dims(raw: bytes):
    """Native pixel dimensions of a PNG or JPEG payload, or (0, 0) when unreadable.
    Used to translate the stage's object-fit:cover into a PPTX a:srcRect center-crop."""
    import struct as _st
    try:
        if raw[:8] == b"\x89PNG\r\n\x1a\n":
            w, h = _st.unpack(">II", raw[16:24])
            return int(w), int(h)
        if raw[:2] == b"\xff\xd8":
            i = 2
            while i < len(raw) - 9:
                if raw[i] != 0xFF:
                    break
                marker = raw[i + 1]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3):
                    h, w = _st.unpack(">HH", raw[i + 5:i + 9])
                    return int(w), int(h)
                i += 2 + _st.unpack(">H", raw[i + 2:i + 4])[0]
    except Exception:
        pass
    return 0, 0


def _place_geo_images(slide, images, ex, ey, W, H):
    """Place each GEO-walked <img> (title-slide background, persona thumbnails, infographic panels,
    portraits) as a FILLED NATIVE PICTURE PLACEHOLDER at its slot bounds, so the consultant can swap
    it via PowerPoint's native 'Change Picture' placeholder UI (owner directive 2026-07-03).

    SAFE re: the empty-placeholder epidemic: the placeholder lives ON THE SLIDE (added after add_slide)
    and is FILLED (a <p:pic>, never an empty <p:sp>). add_slide only clones LAYOUT placeholders, so a
    slide-level filled pic is never duplicated onto other slides, and _strip_empty_picture_placeholders
    (which targets empty <p:sp ph=pic>) never touches it. Each pic gets a UNIQUE idx within the slide.
    Non-raster payloads (SVG bytes PowerPoint cannot embed) are skipped - a broken frame is worse than
    none."""
    import io as _io
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls, qn
    # start idx above any placeholder inherited from the layout so there is no collision
    _idx = 20 + len(slide.shapes._spTree.findall(".//" + qn("p:ph")))
    for im in (images or []):
        if im["x"] >= W or im["y"] >= H:
            continue
        raw = _raster_bytes(im.get("src") or "")
        if raw is None:
            continue
        try:
            pic = slide.shapes.add_picture(_io.BytesIO(raw), ex(im["x"]), ey(im["y"]),
                                           ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)))
            # COVER-CROP PARITY (2026-07-10): the stage HTML renders slot images with
            # object-fit:cover, but a bare add_picture STRETCHES the bitmap to the slot
            # bounds (persona portraits: 1.83 image into a 2.37 slot = 30% horizontal
            # squash). Translate the CSS crop into a native a:srcRect center-crop whenever
            # the aspect ratios diverge, so the export matches the preview pixel-for-pixel.
            try:
                iw, ih = _png_or_jpeg_dims(raw)
                bw, bh = max(im["w"], 1.0), max(im["h"], 1.0)
                if iw and ih:
                    img_ar, box_ar = iw / ih, bw / bh
                    if abs(img_ar - box_ar) / img_ar > 0.02:
                        blip_fill = pic._element.find(qn("p:blipFill"))
                        if img_ar > box_ar:   # image wider than slot: crop left/right
                            frac = (1.0 - box_ar / img_ar) / 2.0
                            rect = f'<a:srcRect {nsdecls("a")} l="{int(frac * 100000)}" r="{int(frac * 100000)}"/>'
                        else:                 # image taller than slot: crop top/bottom
                            frac = (1.0 - img_ar / box_ar) / 2.0
                            rect = f'<a:srcRect {nsdecls("a")} t="{int(frac * 100000)}" b="{int(frac * 100000)}"/>'
                        blip_fill.insert(1, parse_xml(rect))
            except Exception:
                pass
            # promote the filled picture to a swappable picture PLACEHOLDER (owner directive)
            try:
                nvPr = pic._element.find(qn("p:nvPicPr")).find(qn("p:nvPr"))
                nvPr.insert(0, parse_xml(f'<p:ph {nsdecls("p")} type="pic" idx="{_idx}"/>'))
                _idx += 1
            except Exception:
                pass
        except Exception:
            pass


def _strip_empty_picture_placeholders(prs) -> int:
    """Remove every UNFILLED picture placeholder from every slide. A filled slot is a <p:pic>;
    a <p:sp> whose nvPr carries `ph type="pic"` has no image and renders in PowerPoint as an
    empty 'insert picture' prompt box. None are created on the current path, but placeholders
    cloned by add_slide from any layout (or left by older exports feeding through this module)
    must never survive to the saved deck. Returns the number removed."""
    from pptx.oxml.ns import qn
    removed = 0
    for slide in prs.slides:
        sp_tree = slide.shapes._spTree
        for sp in list(sp_tree.findall(qn("p:sp"))):
            ph = sp.find(f'{qn("p:nvSpPr")}/{qn("p:nvPr")}/{qn("p:ph")}')
            if ph is not None and ph.get("type") == "pic":
                sp_tree.remove(sp)
                removed += 1
    return removed


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


def _clone_blank_layout(prs, name, blank_idx: int = 6):
    """Clone the blank layout (default template idx 6; the DECIEM template's BLANK layout via
    `blank_idx`) into a NEW registered slide layout and return it. The clone is a clean blank
    canvas (no Microsoft placeholders leak because the source is the blank layout) onto which a
    variant's chrome is appended. Registered in the master's sldLayoutIdLst + rels so the
    package is valid on reopen."""
    import copy
    from pptx.oxml.ns import nsdecls, qn
    from pptx.oxml import parse_xml
    from pptx.parts.slide import SlideLayoutPart
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT, CONTENT_TYPE as CT
    master = prs.slide_masters[0]
    src = prs.slide_layouts[blank_idx]
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


def _layout_add_svg_picture(lay, png_stream, svg_bytes, x_emu, y_emu, cx_emu, cy_emu, sid, name):
    """Append the brand LOGO to a LAYOUT as a TRUE VECTOR picture: an <a:blip> whose PNG fallback
    (png_stream) carries an asvg:svgBlip extension pointing at the embedded SVG part. PowerPoint 2016+
    renders the crisp SVG; older viewers fall back to the PNG. This is why the exported wordmark is the
    token SVG (Figma 31:17), never a rasterized screenshot. The SVG part is created manually because
    python-pptx's image machinery only sniffs raster formats."""
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from pptx.opc.package import Part
    png_part, rId_png = lay.part.get_or_add_image_part(png_stream)
    pkg = lay.part.package
    partname = pkg.next_partname("/ppt/media/image%d.svg")
    svg_part = Part(partname, "image/svg+xml", pkg, svg_bytes)
    rId_svg = lay.part.relate_to(svg_part, RT.IMAGE)
    pic = parse_xml(
        f'<p:pic {nsdecls("p", "a", "r")}>'
        f'<p:nvPicPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>'
        f'<p:blipFill><a:blip r:embed="{rId_png}">'
        f'<a:extLst><a:ext uri="{{96DAC541-7B7A-43D3-8B79-37D633B846F1}}">'
        f'<asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="{rId_svg}"/>'
        f'</a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="{int(x_emu)}" y="{int(y_emu)}"/><a:ext cx="{max(1, int(cx_emu))}" cy="{max(1, int(cy_emu))}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
    lay.shapes._spTree.append(pic)


def _slide_add_svg_picture(slide, png_stream, svg_bytes, x_emu, y_emu, cx_emu, cy_emu, sid, name):
    """Same TRUE-VECTOR logo embed as _layout_add_svg_picture, but ON A SLIDE (used above a full-bleed
    background so the vector wordmark stays visible over the photo)."""
    from pptx.oxml import parse_xml
    from pptx.oxml.ns import nsdecls
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from pptx.opc.package import Part
    png_part, rId_png = slide.part.get_or_add_image_part(png_stream)
    pkg = slide.part.package
    partname = pkg.next_partname("/ppt/media/image%d.svg")
    svg_part = Part(partname, "image/svg+xml", pkg, svg_bytes)
    rId_svg = slide.part.relate_to(svg_part, RT.IMAGE)
    pic = parse_xml(
        f'<p:pic {nsdecls("p", "a", "r")}>'
        f'<p:nvPicPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>'
        f'<p:blipFill><a:blip r:embed="{rId_png}">'
        f'<a:extLst><a:ext uri="{{96DAC541-7B7A-43D3-8B79-37D633B846F1}}">'
        f'<asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="{rId_svg}"/>'
        f'</a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="{int(x_emu)}" y="{int(y_emu)}"/><a:ext cx="{max(1, int(cx_emu))}" cy="{max(1, int(cy_emu))}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')
    slide.shapes._spTree.append(pic)


def _chrome_signature(chrome_rects, chrome_svgs, chrome_imgs):
    """Stable key for a variant's chrome so slides with identical chrome share ONE cloned layout.
    Rounds bounds to 2px so sub-pixel jitter does not fork layouts."""
    def r(items, keys):
        return tuple(sorted(tuple(round(float(i.get(k, 0)) / 2) * 2 for k in keys) + (str(i.get("fill", "")),) for i in (items or [])))
    return repr((r(chrome_rects, ("x", "y", "w", "h")), r(chrome_svgs, ("x", "y", "w", "h")), r(chrome_imgs, ("x", "y", "w", "h"))))


def validate_pptx_native(prs) -> dict:
    """WS-I (2026-06-30): verify a rendered deck is NATIVE-EDITABLE, not rasterized. Flags (a) any slide
    that is a single full-slide PICTURE with no other shapes (a flattened html2canvas bitmap - the
    '27 blank slides' failure class) and (b) a deck with zero native text runs. Returns a report; the
    caller logs it. Read-only - never mutates the deck. python-pptx MSO_SHAPE_TYPE.PICTURE == 13."""
    picture_only: list[int] = []
    total_runs = 0
    for idx, slide in enumerate(prs.slides, start=1):
        pics, non_pic = 0, 0
        for shape in slide.shapes:
            try:
                if getattr(shape, "has_text_frame", False) and shape.has_text_frame:
                    for p in shape.text_frame.paragraphs:
                        total_runs += len(p.runs)
                st = getattr(shape, "shape_type", None)
                is_pic = st is not None and int(st) == 13
                if is_pic:
                    pics += 1
                else:
                    non_pic += 1
            except Exception:
                non_pic += 1
        if pics >= 1 and non_pic == 0:
            picture_only.append(idx)
    failures: list[str] = []
    if picture_only:
        failures.append(f"{len(picture_only)} full-slide picture-only (rasterized) slide(s): {picture_only[:8]}")
    if total_runs == 0:
        failures.append("zero native text runs across the deck")
    return {"native": len(failures) == 0, "failures": failures,
            "total_runs": total_runs, "picture_only_slides": picture_only}


def html_to_editable_pptx(html: str, out_path: str) -> dict:
    """Render ONE gold-language HTML stage to an editable .pptx at out_path. Returns a small report.

    For multi-slide decks, use `html_list_to_editable_pptx` — it shares one Playwright browser
    + one pptx Presentation across N stages and embeds fonts once at the end, which is
    materially cheaper than calling this single-slide entry N times.
    """
    brand = stage_brand([html])
    prs, blank_idx = new_presentation(brand)
    used_families = set()
    run_total = _render_into_presentation(prs, [html], blank_idx=blank_idx, brand=brand, used_families=used_families)[0]
    _native = validate_pptx_native(prs)
    if not _native["native"]:
        # E9 (plans/hic-world-class-uplift-audit-and-plan-2026-09-30.md, Stage 2.5): the single-slide
        # route (SlideCanvas per-slide download) used to WARN and ship a picture-only / zero-run
        # file. validate_pptx_native is a HARD GATE on every path, same as the multi-slide route.
        raise RuntimeError(f"non-native slide refused: {'; '.join(_native['failures'])}")
    prs.save(out_path)
    _embed_gold_fonts(out_path, brand=brand, used_families=used_families)
    return {"path": out_path, "runs": run_total, "native": _native, "brand": brand}


def stamp_provenance(prs, line: str) -> bool:
    """WS-C C2 (2026-10-31): the source run and version, first in the first slide's notes, so a shared file names
    the run it came from. Notes only: the slides themselves stay the finished artifact."""
    if not line or not len(prs.slides):
        return False
    tf = prs.slides[0].notes_slide.notes_text_frame
    existing = tf.text or ""
    tf.text = line + ("\n\n" + existing if existing.strip() else "")
    return True


def html_list_to_editable_pptx(html_list: list, out_path: str, provenance: str = "") -> dict:
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
    if not isinstance(html_list, list) or len(html_list) == 0:
        raise ValueError("html_list must be a non-empty list of HTML strings")

    brand = stage_brand(html_list)
    prs, blank_idx = new_presentation(brand)
    used_families = set()
    per_slide_runs = _render_into_presentation(prs, html_list, blank_idx=blank_idx, brand=brand, used_families=used_families)
    _native = validate_pptx_native(prs)
    if not _native["native"]:
        # WS-0b (2026-07-09 uplift plan): the native guarantee is a HARD GATE, not a
        # warning - a picture-only slide or zero-run deck must never ship silently.
        raise RuntimeError(f"non-native deck refused: {'; '.join(_native['failures'])}")
    # WS-0a: slide-count integrity is asserted against the request, and re-verified on
    # the WRITTEN FILE after the font-embed rewrite (the zip is re-authored there).
    if len(prs.slides) != len(html_list):
        raise RuntimeError(f"slide-count mismatch before save: built {len(prs.slides)} of {len(html_list)} requested")
    stamp_provenance(prs, provenance)
    prs.save(out_path)
    _embed_gold_fonts(out_path, brand=brand, used_families=used_families)
    import zipfile as _zf
    import re as _zre
    with _zf.ZipFile(out_path) as _z:
        _n = len([x for x in _z.namelist() if _zre.match(r"ppt/slides/slide\d+\.xml$", x)])
    if _n != len(html_list):
        raise RuntimeError(f"slide-count mismatch in written file: {_n} of {len(html_list)} requested survived the save")
    return {
        "path": out_path,
        "slides": [{"runs": r} for r in per_slide_runs],
        "total_runs": sum(per_slide_runs),
        "native": _native,
        "brand": brand,
    }


def _render_into_presentation(prs, html_list: list, blank_idx: int = 6, brand: str = "nxt", used_families=None) -> list:
    """Shared core: open one Playwright browser, iterate over each HTML, screenshot +
    measure, append one slide to `prs` per HTML. Returns the per-slide run count list.

    Single-slide entry: pass [html]. Multi-slide entry: pass [html1, html2, ...].
    Browser is launched ONCE for the whole list, which is the cost win.

    `blank_idx` is the layout the per-variant chrome layouts are cloned from (6 on the
    default template; the DECIEM template's BLANK layout otherwise). `brand` selects the
    token fallbacks for unattributed runs and the DECIEM background guard; `used_families`
    (a set, optional) collects every measured font family so the embedder can include the
    DECIEM faces only when a deck uses them.
    """
    from playwright.sync_api import sync_playwright
    from pptx.util import Emu, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import MSO_ANCHOR, PP_ALIGN

    _fb = _TOKEN_FALLBACKS if brand != "deciem" else _export_fallbacks("DECIEM")
    _is_deciem = brand == "deciem"

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
                    # D15 (2026-07-02): no per-slide bg raster temp file - the full-bleed raster
                    # tier is deleted; bg_paths kept (empty) only for the shared cleanup loop.

                    pg = sandboxed_page(b, viewport={"width": W, "height": H}, device_scale_factor=2)
                    pg.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
                    try:
                        pg.evaluate("async () => { await document.fonts.ready; }")
                    except Exception:
                        pass
                    pg.wait_for_timeout(500)
                    m = pg.evaluate(MEASURE)
                    geo = pg.evaluate(GEO)
                    # 2026-10-02 - SPEAKER NOTES: renderers park overflow detail (persona JTBD, day in
                    # the life, full pain evidence, the full gap list) in an inert
                    # <template class="pptx-notes"> so the slide face stays legible; its text lands
                    # in the PPTX notes page. A <template> has no layout and no child nodes, so the
                    # MEASURE / GEO walks never paint it.
                    try:
                        _notes = pg.evaluate("() => Array.from(document.querySelectorAll('template.pptx-notes')).map(t => (t.content && t.content.textContent) || '').join(String.fromCharCode(10)).trim()")
                    except Exception:
                        _notes = ''
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
                    # WS-1e (2026-07-09) - overlay shapes (pptx-overlay / data-pptx-overlay) are
                    # pulled OUT of the normal rect pass and placed AFTER all pictures so native
                    # discs/badges sit above photos and screenshots (z-order = shape-tree order).
                    overlay_rects = [r for r in content_rects if r.get("overlay")]
                    content_rects = [r for r in content_rects if not r.get("overlay")]
                    all_imgs = geo.get("images", [])
                    content_imgs = [i for i in all_imgs if not i.get("chrome")]
                    chrome_imgs = [i for i in all_imgs if i.get("chrome")]
                    # A full-bleed background picture (cover / agenda) sits ON THE SLIDE and would COVER
                    # the layout-inherited chrome; such slides re-draw their chrome on the slide above the
                    # bg (below), so their chrome svg pics must be captured even on repeat variants.
                    _has_bg = any(i["x"] <= 4 and i["y"] <= 4 and i["w"] >= W - 8 and i["h"] >= H - 8
                                  for i in content_imgs)
                    all_svgs = geo.get("svgRegions", [])
                    # D15 (E3, 2026-07-02): the empty-geometry FULL-SLIDE RASTER fallback is REMOVED
                    # (phase 9: every PPTX native + editable from every path). A slide whose geometry
                    # walk finds no rects still exports NATIVE: text -> native runs, <img> -> native
                    # pictures, each <svg> -> its OWN tokenized native picture at its bounds, chrome
                    # inherited from the per-variant layout. There is no full-bleed screenshot tier.
                    sig = _chrome_signature(chrome_rects, [s for s in all_svgs if s.get("chrome")], chrome_imgs)
                    need_chrome = sig not in sig_to_layout
                    content_svg_pics = []
                    chrome_svg_pics = []
                    # Hide non-svg text + <img> so neither bakes into a per-svg region shot
                    # (text is native runs; <img> are native pictures). HIDE_TEXT keeps <svg>
                    # visible, so each region screenshot captures the tokenized vector as-is.
                    pg.add_style_tag(content=HIDE_TEXT)
                    if all_imgs:
                        # data-pptx-shot marks <img> elements the walker routed to the
                        # clip-screenshot tier (SVG data-URIs the canvas could not rasterize);
                        # they must stay visible so their region shot captures the glyph.
                        pg.add_style_tag(content="#stage img:not([data-pptx-shot]){visibility:hidden !important}")
                    pg.wait_for_timeout(80)
                    import base64 as _b64svg
                    for _r in all_svgs:
                        _is_chrome = bool(_r.get("chrome"))
                        if _is_chrome and not need_chrome and not _has_bg:
                            continue  # variant chrome layout already built (and no bg to re-draw over)
                        try:
                            _shot = pg.screenshot(clip={"x": max(0, _r["x"]), "y": max(0, _r["y"]),
                                                        "width": max(1, _r["w"]), "height": max(1, _r["h"])})
                            _rec = {"x": _r["x"], "y": _r["y"], "w": _r["w"], "h": _r["h"],
                                    "src": "data:image/png;base64," + _b64svg.b64encode(_shot).decode()}
                            if _r.get("svg"):
                                _rec["svg"] = _r["svg"]   # logo -> embed as true vector (SVG blip)
                            (chrome_svg_pics if _is_chrome else content_svg_pics).append(_rec)
                        except Exception:
                            pass
                    pg.close()

                    # GET-OR-CREATE the per-variant LAYOUT carrying this slide's chrome (defined once,
                    # inherited by every slide of this variant). First time a chrome signature is seen,
                    # clone the blank layout and append its chrome: rail/dot-mark -> native shapes,
                    # logo -> native picture. Subsequent same-variant slides reuse it (no duplication).
                    layout = sig_to_layout.get(sig)
                    if layout is None:
                        layout = _clone_blank_layout(prs, f"GOLD variant {len(sig_to_layout) + 1}", blank_idx)
                        from pptx.oxml import parse_xml as _px  # noqa: F401 (kept for symmetry)
                        for _ci, rc in enumerate(chrome_rects):
                            if rc["x"] >= W or rc["y"] >= H:
                                continue
                            layout.shapes._spTree.append(_rect_sp(
                                8000 + _ci, "GOLD chrome", ex(rc["x"]), ey(rc["y"]),
                                ex(max(rc["w"], 1.0)), ey(max(rc["h"], 1.0)), rc["fill"]))
                        import io as _ioch
                        for _ci, im in enumerate(list(chrome_imgs) + chrome_svg_pics):
                            if im["x"] >= W or im["y"] >= H:
                                continue
                            _raw = _raster_bytes(im.get("src") or "")
                            if _raw is None:
                                continue
                            try:
                                if im.get("svg"):
                                    # brand LOGO -> true vector (SVG blip + PNG fallback)
                                    _layout_add_svg_picture(
                                        layout, _ioch.BytesIO(_raw), im["svg"].encode("utf-8"),
                                        ex(im["x"]), ey(im["y"]), ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)),
                                        8500 + _ci, "GOLD chrome logo")
                                else:
                                    _layout_add_picture(layout, _ioch.BytesIO(_raw), ex(im["x"]), ey(im["y"]),
                                                        ex(max(im["w"], 1.0)), ey(max(im["h"], 1.0)),
                                                        8500 + _ci, "GOLD chrome logo")
                            except Exception:
                                pass
                        sig_to_layout[sig] = layout
                    slide = prs.slides.add_slide(layout)
                    if _notes:
                        try:
                            slide.notes_slide.notes_text_frame.text = _notes
                        except Exception as _nerr:
                            logger.warning(f"[gold-pptx] speaker notes not written: {_nerr}")
                    if True:
                        # NATIVE GEOMETRY tier (the ONLY tier post-D15): every fill and border bar is
                        # a real PPTX rectangle a consultant can recolor/move/resize. An empty
                        # content_rects list simply adds no shapes - the slide still carries its
                        # inherited chrome layout, native text runs, and native pictures.
                        from pptx.enum.shapes import MSO_SHAPE
                        try:
                            from pptx_export import _set_solid_fill_with_alpha, _suppress_effects
                        except Exception as _helpers_err:
                            # WS-0b (2026-07-09): these helpers are load-bearing - without
                            # them every translucent wash renders opaque and shapes risk the
                            # Office-blue theme fallback. Hard-require, never degrade silently.
                            raise RuntimeError(f"pptx fill/effect helpers unavailable: {_helpers_err}")
                        # 2026-07-03 z-order (slides-imagery uplift): FULL-BLEED background
                        # photographs sit UNDER the geometry. Images are normally added last
                        # (slot art floats above panels), which buried the agenda's translucent
                        # scrim panels beneath the cover scene. A content <img> covering the
                        # whole stage is a BACKGROUND: place it first, then rects, then the
                        # remaining slot art, then text.
                        _bg_imgs = [im for im in content_imgs
                                    if im["x"] <= 4 and im["y"] <= 4
                                    and im["w"] >= W - 8 and im["h"] >= H - 8]
                        if _bg_imgs:
                            content_imgs = [im for im in content_imgs if im not in _bg_imgs]
                            _place_geo_images(slide, _bg_imgs, ex, ey, W, H)
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
                        # WS-1c (2026-07-09) - content SVGs carrying serialized markup embed as TRUE
                        # VECTOR pictures (SVG blip + the clip-screenshot PNG as the fallback blip),
                        # the same path the chrome logo already uses. Only markup-less regions (the
                        # >200KB guard, serialization failures, data-pptx-shot <img> fallbacks) go
                        # through the plain raster placement.
                        _vector_svg_pics = [s for s in content_svg_pics if s.get("svg")]
                        _raster_svg_pics = [s for s in content_svg_pics if not s.get("svg")]
                        _place_geo_images(slide, list(content_imgs) + _raster_svg_pics, ex, ey, W, H)
                        import io as _iosv
                        for _ci, _sv in enumerate(_vector_svg_pics):
                            if _sv["x"] >= W or _sv["y"] >= H:
                                continue
                            _raw = _raster_bytes(_sv.get("src") or "")
                            if _raw is None:
                                continue
                            try:
                                _slide_add_svg_picture(
                                    slide, _iosv.BytesIO(_raw), _sv["svg"].encode("utf-8"),
                                    ex(_sv["x"]), ey(_sv["y"]), ex(max(_sv["w"], 1.0)), ey(max(_sv["h"], 1.0)),
                                    9500 + _ci, "GOLD content vector")
                            except Exception as _sverr:
                                # vector embed failed for THIS svg only: keep the deck native by
                                # placing the clip-screenshot PNG (the fallback blip) instead.
                                logger.warning(f"[gold-pptx] svg vector embed failed, PNG fallback: {_sverr}")
                                _place_geo_images(slide, [_sv], ex, ey, W, H)
                        # 2026-07-03: a full-bleed background picture (cover / agenda) sits on the slide
                        # and COVERS the layout-inherited chrome. Re-draw THIS slide's chrome (dot-mark +
                        # vector logo) ON THE SLIDE, above the background, so it stays visible - matching
                        # the ideal deck. Only fires for bg slides; content-rail slides keep layout chrome.
                        if _bg_imgs:
                            import io as _iobg
                            for _rc in chrome_rects:
                                if _rc["x"] >= W or _rc["y"] >= H:
                                    continue
                                # The #stage paper canvas is tagged chrome. Re-drawing that full-stage
                                # rect above the background picture hides the picture: DECIEM first
                                # (2026-10-01, no rail / dot-mark), then every brand (2026-10-02: a
                                # full-bleed diagram exhibit exported as a picture placeholder buried
                                # under a white full-slide rectangle, the "blank journey slide").
                                if _rc["x"] <= 4 and _rc["y"] <= 4 and _rc["w"] >= W - 8 and _rc["h"] >= H - 8:
                                    continue
                                _csh = slide.shapes.add_shape(
                                    MSO_SHAPE.RECTANGLE, ex(_rc["x"]), ey(_rc["y"]),
                                    ex(max(_rc["w"], 1.0)), ey(max(_rc["h"], 1.0)))
                                _csh.shadow.inherit = False
                                _csh.line.fill.background()
                                _csh.fill.solid()
                                _csh.fill.fore_color.rgb = RGBColor.from_string(_rc["fill"])
                                if _suppress_effects is not None:
                                    try:
                                        _suppress_effects(_csh._element.spPr)
                                    except Exception:
                                        pass
                                try:
                                    _st = _csh._element.find('{http://schemas.openxmlformats.org/presentationml/2006/main}style')
                                    if _st is not None:
                                        _csh._element.remove(_st)
                                except Exception:
                                    pass
                            for _ci, _im in enumerate(chrome_svg_pics):
                                if _im["x"] >= W or _im["y"] >= H:
                                    continue
                                _raw = _raster_bytes(_im.get("src") or "")
                                if _raw is None:
                                    continue
                                try:
                                    if _im.get("svg"):
                                        _slide_add_svg_picture(
                                            slide, _iobg.BytesIO(_raw), _im["svg"].encode("utf-8"),
                                            ex(_im["x"]), ey(_im["y"]), ex(max(_im["w"], 1.0)), ey(max(_im["h"], 1.0)),
                                            9000 + _ci, "GOLD chrome logo")
                                    else:
                                        slide.shapes.add_picture(_iobg.BytesIO(_raw), ex(_im["x"]), ey(_im["y"]),
                                                                 ex(max(_im["w"], 1.0)), ey(max(_im["h"], 1.0)))
                                except Exception:
                                    pass
                        # WS-1e (2026-07-09) - OVERLAY pass: place tagged annotation shapes AFTER
                        # every picture so they sit on top (shape-tree order = z-order). Unlocks
                        # native numbered discs (data-pptx-overlay="oval" -> MSO_SHAPE.OVAL) and
                        # badges above photos/screenshots; their text lands via the run pass below,
                        # which is already appended after all shapes.
                        for _oi, rc in enumerate(overlay_rects):
                            if rc["x"] >= W or rc["y"] >= H:
                                continue
                            _oshape = MSO_SHAPE.OVAL if rc.get("shape") == "oval" else MSO_SHAPE.RECTANGLE
                            _osh = slide.shapes.add_shape(
                                _oshape, ex(rc["x"]), ey(rc["y"]),
                                ex(max(rc["w"], 1.0)), ey(max(rc["h"], 1.0)))
                            _osh.shadow.inherit = False
                            _osh.line.fill.background()
                            if _set_solid_fill_with_alpha is not None and rc.get("alpha", 1) < 1:
                                _set_solid_fill_with_alpha(_osh.fill._xPr, rc["fill"], rc["alpha"])
                            else:
                                _osh.fill.solid()
                                _osh.fill.fore_color.rgb = RGBColor.from_string(rc["fill"])
                            if _suppress_effects is not None:
                                try:
                                    _suppress_effects(_osh._element.spPr)
                                except Exception:
                                    pass
                            try:
                                _ost = _osh._element.find(
                                    '{http://schemas.openxmlformats.org/presentationml/2006/main}style')
                                if _ost is not None:
                                    _osh._element.remove(_ost)
                            except Exception:
                                pass
                    # D15 (E3, 2026-07-02): the full-bleed raster tier (slide-sized screenshot picture)
                    # is DELETED. Every slide - including one whose geometry walk found no rects - now
                    # exports on the native path above (phase 9: native + editable from every path).

                    _all_runs = [q for q in m.get("runs", []) if q.get("text", "").strip()]
                    for r in m.get("runs", []):
                        txt = r["text"]
                        if not txt.strip():
                            continue
                        if used_families is not None and r.get("family"):
                            used_families.add(r.get("family"))
                        # 2026-06-05 — Out-of-bounds clip. Belt-and-suspenders
                        # against any future template that overflows the 1920x1080
                        # stage. Universal rule: a text run whose origin sits
                        # outside the slide rectangle is silently dropped (with
                        # a debug log if it spilled past the bottom — those are
                        # the high-signal density problems to catch). Pairs with
                        # the #stage{overflow:hidden} guard in slideToStageHtml.ts.
                        # 2026-10-27 (run 44: the divider numerals "01".."04" were missing from every PPTX): a display
                        # numeral at line-height 1 has a glyph box taller than its line, so its range starts above the
                        # slide although its element sits inside it. Such a run takes its element's top.
                        # Run 45: the same holds on the page (an 80 px divider title's box started 35 px above its
                        # element and its cap tops covered the WORK kicker in PowerPoint): a run whose range starts
                        # above its element starts at the element.
                        if r.get("etop") is not None and 0 <= r["etop"] < H and r["y"] < r["etop"] - 1:
                            r["y"] = r["etop"]
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
                            # 1.14 = the PW wrap allowance below; a narrower cap made scale < 1 for
                            # every run wider than 600px and shrank 12 pt type to 11.9 pt.
                            bw = min(bw, max(_tw0 * 1.14 + 24.0, 60.0))
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
                        # 2026-10-02 - SINGLE-LINE NO-SHRINK. A shrink-wrapped element (flex child,
                        # inline-block label, table header) has eright == text right, so bw == tw and
                        # the PW wrap allowance below scaled the type to 1/1.14 (24px labels exported
                        # at 10.5-11.8 pt). A single line grows its BOX by the allowance instead,
                        # on the side its alignment leaves free, and keeps its measured size.
                        if _lh and r["h"] <= _lh * 1.6 and bw < tw * PW + 2:
                            # grow only into free space: up to the nearest run on the same line band
                            # (and inside the slide); any remainder falls back to the scale below.
                            _band = [q for q in _all_runs if q is not r
                                     and min(r["y"] + r["h"], q["y"] + q["h"]) - max(r["y"], q["y"]) > 1]
                            # keep a 12px gutter to the neighbour: cell borders sit between runs
                            _rlim = min([q["x"] - 12.0 for q in _band if q["x"] >= r["x"] + r["w"] - 1] + [W - 8.0])
                            _llim = max([q["x"] + q["w"] + 12.0 for q in _band if q["x"] + q["w"] <= r["x"] + 1] + [8.0])
                            _grow = tw * PW + 2 - bw
                            if _align == "right":
                                _g = max(0.0, min(_grow, bx - _llim)); bx -= _g; bw += _g
                            elif _align == "center":
                                _g = max(0.0, min(_grow / 2.0, bx - _llim, _rlim - (bx + bw))); bx -= _g; bw += 2 * _g
                            else:
                                bw += max(0.0, min(_grow, _rlim - (bx + bw)))
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
                        # 2026-10-02 - DE-COLLISION. The one line of slack above is headroom for
                        # font-metric rewrap, but it must not reach into the run painted directly
                        # below (pain label over its evidence line, quote over the next label: the
                        # owner's "colliding text fields"). Clamp the box to stop above the nearest
                        # lower run that shares its columns; never below the measured text height.
                        _below = [q["y"] for q in _all_runs
                                  if q is not r and q["y"] > r["y"] + 2
                                  and min(bx + bw, q["x"] + q["w"]) - max(bx, q["x"]) > 1]
                        if _below:
                            bh = max(min(bh, min(_below) - r["y"] - 1.0), min(bh, r["h"]))
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
                        run.font.name = r.get("family") or _fb["body_font"]
                        # 2026-06-14 - editable-overlay floor raised 5->8pt to match the
                        # redesign's 8.5pt legibility floor (the renderer now sizes all text
                        # at >=17 stage px); guarantees the PPTX text layer never undercuts it.
                        # round to 0.01 pt: PX2PT is 0.49999 (13.333 in), and python-pptx truncates
                        # to centipoints, so a 24px run landed at 11.99 pt instead of 12.
                        run.font.size = Pt(round(max(8, _size_px * PX2PT), 2))
                        run.font.bold = (r.get("weight", 400) >= 600)
                        run.font.italic = bool(r.get("italic"))
                        run.font.color.rgb = RGBColor.from_string(r.get("color") or _fb["ink"])
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

    # 2026-07-02 - final gate: no empty 'insert picture' prompt box ever ships.
    try:
        _stripped = _strip_empty_picture_placeholders(prs)
        if _stripped:
            logger.warning(f"[gold-pptx] stripped {_stripped} empty picture placeholder(s) before save")
    except Exception:
        pass

    return per_slide_runs


def _embed_gold_fonts(pptx_path: str, brand: str = "nxt", used_families=None) -> None:
    """Embed Lora / IBM Plex Mono (plus the brand families already in pptx_export) so the
    editable text renders faithfully on machines without the gold fonts installed.

    DECIEM (2026-10-01): the Poppins / Josefin Sans / Questrial / Nunito manifest entries
    (brand_fonts.DECIEM_TYPEFACES) are added for the duration of the call when the deck is
    DECIEM or a measured run used one of them; NXT and NU decks embed exactly the set they
    embedded before."""
    # WS-0g (2026-07-09): ONE font manifest (brand_fonts.FONT_MANIFEST) - the
    # runtime-monkeypatch era ended after Saira Condensed went silently missing and
    # every title substituted Calibri. Embed failure is LOUD (fonts are part of the
    # editable-export contract), never a silent pass.
    import pptx_export as pe
    from brand_fonts import FONT_MANIFEST, DECIEM_TYPEFACES
    have = {f.get("typeface") for f in pe.FONT_FAMILIES}
    pe.FONT_FAMILIES = pe.FONT_FAMILIES + [
        f for f in FONT_MANIFEST if f["typeface"] not in have and f["typeface"] not in DECIEM_TYPEFACES]
    want_deciem = (brand == "deciem") or bool(set(used_families or ()) & set(DECIEM_TYPEFACES))
    if not want_deciem:
        pe.embed_brand_fonts(pptx_path)
        return
    have_now = {f.get("typeface") for f in pe.FONT_FAMILIES}
    extra = [f for f in FONT_MANIFEST if f["typeface"] in DECIEM_TYPEFACES and f["typeface"] not in have_now]
    base = pe.FONT_FAMILIES
    pe.FONT_FAMILIES = base + extra
    try:
        pe.embed_brand_fonts(pptx_path)
    finally:
        pe.FONT_FAMILIES = base
