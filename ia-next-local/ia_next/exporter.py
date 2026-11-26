"""Every finished artifact as pictures, a PDF and 16:9 PowerPoint slides (owner 2026-11-19: "EVERY artifact
(including Mind Maps, Journey Maps, Architectural Diagrams, Infographics) should be able to be downloaded as images,
PDFs, and PPTX format (ideal for 16:9 slides)").

One page per artifact is the source of all three: the page a person opens (a report is set in the brand's page style
first; transcript findings get a page of their own). The offline renderer (render/app.py, /pages) lays it out at
1280 CSS pixels and cuts it into 16:9 pages without cutting through a line, a picture or a small box; a deck makes
one page per slide and a prototype one page per screen.
- Image: one page is a PNG (1920x1080); several pages are a ZIP of PNGs. A diagram is its own picture.
- PDF: the same pages, printed by Chromium, so the text stays text.
- PowerPoint: 13.333 x 7.5 inch slides, always editable (owner 2026-11-19: a mind map or a simple diagram is never
  a picture on a slide). A deck is the native deck IA Next already wrote. A diagram is native shapes and editable
  text: a mind map is its drawn page, every other family is HiC's own exhibit for its spec (/api/ai/diagram-pptx),
  an infographic one slide per exhibit. Any other page goes to HiC's exporter as a stage per page: the page with its
  text hidden as the picture, every line of text laid over it, so each slide looks like the page and its words stay
  editable. When HiC cannot be reached, the export says so and makes no file; it never falls back to pictures.
Exports are kept in the task folder (results/tasks/<task>/exports/) under a hash of what they were made from.
"""
import base64
import hashlib
import html
import io
import json
import os
import re
import zipfile

import httpx

from . import config, deck, hic, store

VERSION = "8"                # bump when the export layout changes, so kept exports are made again
LAYOUT_W, OUT_W = 1280, 1920
FORMATS = ("png", "pdf", "pptx")
MEDIA = {"png": "image/png", "zip": "application/zip", "pdf": "application/pdf",
         "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"}
KIND_WORD = {"research_report": "report", "journey_map": "journey-map", "deck": "deck", "social": "social-listening",
             "transcript": "findings", "prototype": "prototype", "artifact": "document", "themes": "themes",
             "diagram": "diagram", "datatable": "table", "audio_overview": "audio-transcript", "video_transcript": "transcript"}
DECK_CSS = ("body{padding:0!important;margin:0!important;background:#FFFFFF!important}h1{display:none!important}"
            ".deck{max-width:none!important;margin:0!important;gap:0!important}details{display:none!important}"
            "article{margin:0!important}")


class ExportError(Exception):
    """Why an export could not be made, in words for the person."""


# ---- the page each artifact is made from --------------------------------------------------------------------------
def _read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def _title_of(doc):
    m = re.search(r"(?is)<title[^>]*>(.*?)</title>", doc or "")
    t = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else ""
    return re.sub(r"^(Diagram|Infographic|Mind map|Artifact|Prototype)\s*:\s*", "", t)


def with_faces(doc, brand, drop_google=True):
    """The brand's faces embedded in the page (and Google Fonts links dropped: the renderer and the sandboxes refuse
    them, and the faces are embedded instead)."""
    faces = deck.brand_kit(brand or "nxt")["fonts_css"]
    if drop_google:
        doc = re.sub(r'(?is)<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*', "", doc)
        doc = re.sub(r'(?is)@import\s+url\(["\']?https://fonts\.googleapis\.com[^)]*\)\s*;?', "", doc)
    if not faces:
        return doc
    style = f"<style>{faces}</style>"
    m = re.search(r"(?i)<head[^>]*>", doc)
    return doc[:m.end()] + style + doc[m.end():] if m else style + doc


def _esc(s):
    return html.escape(str(s or ""), quote=True)


def _inline(s):
    """Markdown inline marks on escaped text (the same marks web/md.js renders): links, code, bold, italic, [S1]."""
    keep = []

    def hold(x):
        keep.append(x)
        return f"\u0000{len(keep) - 1}\u0000"
    t = _esc(s)
    t = re.sub(r"\[([^\]\n]{1,300})\]\((https?://[^\s)]+)\)", lambda m: hold(f'<a href="{m.group(2)}">{m.group(1)}</a>'), t)
    t = re.sub(r"`([^`\n]+)`", lambda m: hold(f"<code>{m.group(1)}</code>"), t)
    t = re.sub(r"\*\*([^*\n]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(^|[\s(])\*([^*\s][^*\n]*?)\*(?=[\s).,;:!?]|$)", r"\1<i>\2</i>", t)
    t = re.sub(r"\[(S\d+)\]", r'<sup class="cite">\1</sup>', t)
    return re.sub("\u0000(\\d+)\u0000", lambda m: keep[int(m.group(1))], t)


_BLOCK = re.compile(r"^(#{1,6}\s|\||>\s?|\s*([-*]|\d+\.)\s|---+\s*$|\s*`{3,})")


def md_html(md):
    """A report's Markdown as HTML: everything escaped first, then headings, lists, tables, quotes, rules, fenced
    blocks and paragraphs (the subset web/md.js renders in the reader)."""
    out, lines, i = [], str(md or "").replace("\r\n", "\n").split("\n"), 0
    while i < len(lines):
        ln = lines[i]
        if re.match(r"^\s*`{3,}", ln):
            body, i = [], i + 1
            while i < len(lines) and not re.match(r"^\s*`{3,}\s*$", lines[i]):
                body.append(lines[i])
                i += 1
            out.append(f"<pre><code>{_esc(chr(10).join(body))}</code></pre>")
            i += 1
            continue
        if re.match(r"^#{1,6}\s", ln):
            n = min(len(re.match(r"^#+", ln).group(0)) + 1, 6)
            head = _inline(re.sub(r"^#+\s*", "", ln))
            out.append(f"<h{n}>{head}</h{n}>")
            i += 1
            continue
        if re.match(r"^---+\s*$", ln):
            out.append("<hr>")
            i += 1
            continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            rows = [r for r in rows if not re.match(r"^\|\s*:?-", r)]
            cells = lambda r: [c.strip() for c in re.sub(r"^\||\|\s*$", "", r).split("|")]
            out.append("<table>" + "".join("<tr>" + "".join((f"<th>{_inline(c)}</th>" if k == 0 else f"<td>{_inline(c)}</td>")
                                                            for c in cells(r)) + "</tr>" for k, r in enumerate(rows)) + "</table>")
            continue
        if re.match(r"^>\s?", ln):
            q = []
            while i < len(lines) and re.match(r"^>\s?", lines[i]):
                q.append(re.sub(r"^>\s?", "", lines[i]))
                i += 1
            out.append(f"<blockquote>{_inline(' '.join(q))}</blockquote>")
            continue
        if re.match(r"^\s*([-*]|\d+\.)\s", ln):
            ordered = bool(re.match(r"^\s*\d+\.", ln))
            items = []
            while i < len(lines) and re.match(r"^\s*([-*]|\d+\.)\s", lines[i]):
                item = _inline(re.sub(r"^\s*([-*]|\d+\.)\s", "", lines[i]))
                items.append(f"<li>{item}</li>")
                i += 1
            out.append(("<ol>" if ordered else "<ul>") + "".join(items) + ("</ol>" if ordered else "</ul>"))
            continue
        if ln.strip():
            para = []
            while i < len(lines) and lines[i].strip() and not _BLOCK.match(lines[i]):
                para.append(lines[i])
                i += 1
            if not para:
                para.append(lines[i])
                i += 1
            out.append(f"<p>{_inline(' '.join(para))}</p>")
            continue
        i += 1
    return "\n".join(out)


_IDS = re.compile(r"(?<![/\w])(task|eng|appr|sched|conv|node)_[0-9a-f]{8,}\b")


def _source_titles(eid, folder):
    """S-id to a readable source name: the report's own sources first, then the engagement's."""
    from . import secondbrain
    names = {}
    for path in (os.path.join(folder, "sources.json"), store.safe_path(eid, "results/sources.json"),
                 store.safe_path(eid, "results/uploaded_sources.json")):
        try:
            d = json.loads(_read(path))
        except (OSError, ValueError):
            continue
        for s in (d.get("sources") if isinstance(d, dict) else d) or []:
            if isinstance(s, dict) and s.get("id") and s["id"] not in names:
                names[s["id"]] = secondbrain._readable_title(s)
    return names


_PAGE_CSS = """
.doc{max-width:900px}
.doc h2{font:600 34px/1.12 var(--font-display);margin:28px 0 14px;text-transform:var(--title-transform)}
.doc h3{font:600 23px/1.22 var(--font-display);margin:30px 0 10px;text-transform:var(--title-transform)}
.doc h4,.doc h5,.doc h6{font:600 18px/1.3 var(--font-body);margin:22px 0 8px}
.doc p,.doc li{font-size:17px;line-height:1.6}.doc p{margin:0 0 14px}
.doc ul,.doc ol{margin:0 0 14px;padding-left:24px}.doc li{margin-bottom:6px}
.doc blockquote{margin:16px 0;padding:4px 0 4px 18px;border-left:3px solid var(--accent);color:var(--ink);font-style:italic}
.doc table{border-collapse:collapse;width:100%;margin:12px 0 18px;font-size:15px}
.doc th,.doc td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
.doc th{background:var(--panel)}
.doc sup.cite{font:500 11px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--deep);margin-left:2px}
.doc pre{background:var(--panel);padding:12px;overflow:hidden;white-space:pre-wrap;font-size:13px}
.srcs ol{margin:8px 0 0;padding-left:0;list-style:none;display:grid;gap:6px;font-size:14px;color:var(--muted)}
.srcs b{font:500 12px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--deep);margin-right:8px}
.finding{border-top:1px solid var(--line);padding:16px 0}
.finding .claim{font-size:18px;line-height:1.5;margin:0 0 8px}
.finding blockquote{margin:0 0 8px;padding-left:16px;border-left:3px solid var(--accent);font-style:italic;color:var(--ink)}
.finding .who{font-size:13px;color:var(--muted);margin:0}
"""


def _doc_page(title, kicker, body, brand, sources=None):
    from . import pagestyle
    kit = deck.brand_kit(brand)
    src = ""
    if sources:
        src = ('<section class="section srcs"><p class="k">Sources</p><ol>'
               + "".join(f"<li><b>{_esc(k)}</b>{_esc(v)}</li>" for k, v in sources) + "</ol></section>")
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{_esc(title)}</title><style>'
            f'{kit["fonts_css"]}\n{kit["css"]}\n{pagestyle.CSS}\n{_PAGE_CSS}</style></head><body><div class="page">'
            f'<header class="masthead"><span class="k">IA Next</span>{kit["mark"]}</header>'
            f'<section class="hero"><p class="kicker">{_esc(kicker)}</p><h1>{_esc(title)}</h1></section>'
            f'<section class="section doc">{body}</section>{src}</div></body></html>')


def report_page(t):
    md = _IDS.sub("", _read(t["result_path"]))
    lines = md.split("\n")
    title = ""
    for k, ln in enumerate(lines):                       # the report's first heading is the page title
        if re.match(r"^#{1,3}\s", ln):
            title = re.sub(r"^#+\s*", "", ln).replace("**", "").strip()
            del lines[k]
            break
    eng = store.get_engagement(t["engagement_id"]) or {}
    title = title or eng.get("title") or "Research report"
    srcs = []
    if not re.search(r"(?im)^#{1,6}\s*(sources|references|works cited)\b", md):   # the report's own list wins
        cited = list(dict.fromkeys(re.findall(r"\[(S\d+)\]", md)))
        names = _source_titles(t["engagement_id"], os.path.dirname(t["result_path"]))
        srcs = [(c, names[c]) for c in sorted(cited, key=lambda x: int(x[1:])) if c in names]
    return title, _doc_page(title, "Research report", md_html("\n".join(lines)), (t.get("brief") or {}).get("brand") or "nxt", srcs)


def findings_page(t):
    d = json.loads(_read(t["result_path"]))
    names = _source_titles(t["engagement_id"], os.path.dirname(t["result_path"]))
    rows = []
    for f in d.get("findings") or []:
        who = ", ".join(x for x in (f.get("speaker"), names.get(f.get("source_id"))) if x)
        rows.append(f'<div class="finding"><p class="claim">{_esc(f.get("claim"))}</p>'
                    + (f"<blockquote>{_esc(f.get('quote'))}</blockquote>" if f.get("quote") else "")
                    + (f'<p class="who">{_esc(who)}</p>' if who else "") + "</div>")
    eng = store.get_engagement(t["engagement_id"]) or {}
    title = f"What the transcripts say: {eng.get('title')}" if eng.get("title") else "What the transcripts say"
    return title, _doc_page(title, "Transcript findings", "".join(rows) or "<p>No findings.</p>", "nxt")


def source(t):
    """What an export is made from: {"kind": page|deck|diagram, "title", "brand", "sig", ...}. A task that saved its
    page laid out again as slides (slides.html: a journey map, a persona set, an architecture, a document) also
    carries "slides_html"; only the editable PowerPoint is made from it, and the page itself is untouched."""
    src = _source(t)
    try:
        sp = os.path.join(os.path.dirname(t.get("result_path") or ""), "slides.html")
        if src.get("kind") == "page" and t["kind"] in ("journey_map", "artifact", "video_transcript") and os.path.isfile(sp):
            slides = _read(sp)
            again = relayout(t, os.path.dirname(sp), src.get("brand") or "nxt")
            if again:                             # laid out again from the saved data, so a fix to the slide template
                slides = again                    # reaches work that is already finished
            src = dict(src, slides_html=slides, sig=hashlib.sha256((src["sig"] + slides).encode()).hexdigest())
    except (OSError, KeyError, ValueError, TypeError):
        pass
    return src


def _photos(page_html):
    """The photographs a page carries, in order (data URIs); a persona set's and a journey's saved data name the
    picture's brief but keep no bytes, so the slides take each picture from the page it was drawn on."""
    return re.findall(r'<img[^>]+src="(data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+)"', page_html or "")


def relayout(t, folder, brand):
    """The slides of a finished journey map, persona set, competitive analysis or architecture made again from its
    saved data with today's template, or "" when the data was not kept."""
    from . import slidepage
    titles = _source_titles(t["engagement_id"], folder)
    jp = os.path.join(folder, "journey.json")
    if t["kind"] == "journey_map" and os.path.isfile(jp):
        j = json.loads(_read(jp))
        pics = _photos(_read(os.path.join(folder, "journey.html"))) if os.path.isfile(os.path.join(folder, "journey.html")) else []
        if pics and isinstance(j.get("persona"), dict):
            j["persona"]["image"] = pics[0]
        sources = [{"id": k, "title": v} for k, v in titles.items()]
        return slidepage.journey(j, sources, brand)
    dp = os.path.join(folder, "data.json")
    if not os.path.isfile(dp):
        return ""
    data = json.loads(_read(dp))
    if data.get("matrix"):
        return slidepage.competitive(data, titles, brand)
    if data.get("zones"):
        return slidepage.architecture(data, titles, brand)
    if data.get("personas"):
        pics = _photos(_read(os.path.join(folder, "artifact.html"))) if os.path.isfile(os.path.join(folder, "artifact.html")) else []
        people = [x for x in data["personas"] if isinstance(x, dict)]
        if len(pics) >= len(people):
            for x, pic in zip(people, pics):
                x["image"] = pic
        return slidepage.personas(data, titles, brand)
    return ""


def _file_digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.digest()


def _source(t):
    from . import prototype
    k, tid, eid = t["kind"], t["id"], t["engagement_id"]
    rp = t.get("result_path") or ""
    folder = os.path.dirname(rp)
    brand = deck.brand_id((t.get("brief") or {}).get("brand"))
    if k == "diagram":
        d = json.loads(_read(os.path.join(folder, "diagram.json")))
        brand = deck.brand_id(d.get("brand"))
        with open(os.path.join(folder, d["picture"]), "rb") as fh:
            pic = fh.read()
        from .diagram import SLIDE_PAGE
        sp = os.path.join(folder, SLIDE_PAGE)
        slide = _read(sp) if os.path.isfile(sp) else ""
        secs = d.get("sections") or []
        if d.get("mode") != "infographic":
            secs = secs[:1]
        sig = hashlib.sha256(pic + slide.encode() + json.dumps(secs, sort_keys=True, default=str).encode()).hexdigest()
        return {"kind": "diagram", "title": d.get("title") or "Diagram", "brand": brand, "picture": pic, "sections": secs,
                "slide_page": slide, "sig": sig, "drawn_by": d.get("drawn_by") or ""}
    if k == "deck":
        per_task = os.path.join(folder, "deck.pptx")
        pptx = per_task if rp and os.path.isfile(per_task) else store.safe_path(eid, "results/deck.pptx")
        doc = _read(rp)
        return {"kind": "deck", "title": _title_of(doc) or "Deck", "brand": brand, "html": doc, "mode": "slides",
                "selector": "section.slide", "css": DECK_CSS, "pptx_path": pptx,
                # the PowerPoint file is part of what the export is made from: a deck redrawn with no change to its page
                # (22 Nov: a larger source line) was still served from the old kept copy
                "sig": hashlib.sha256(doc.encode() + (_file_digest(pptx) if os.path.isfile(pptx) else b"")).digest().hex()}
    if k == "prototype":
        path = prototype.html_path_for_task(tid)
        if not path:
            raise ExportError("this prototype has no page to export")
        meta = {}
        try:
            meta = json.loads(_read(os.path.join(os.path.dirname(path), "prototype.json")))
        except (OSError, ValueError):
            pass
        doc = with_faces(_read(path), meta.get("brand") or brand, drop_google=False)
        screens = [str(s.get("name") or "").strip() for s in (meta.get("direction") or {}).get("screens") or [] if isinstance(s, dict)]
        return {"kind": "page", "title": _title_of(doc) or meta.get("experience") or "Prototype", "brand": meta.get("brand") or brand,
                "html": doc, "mode": "screens", "screens": [s for s in screens if s], "sig": hashlib.sha256(doc.encode()).hexdigest()}
    if k == "artifact":
        from . import artifacts
        from . import docpage
        doc = docpage.for_export(with_faces(_read(artifacts.html_path_for_task(tid)), brand))
        label = artifacts.label((t.get("brief") or {}).get("kind", ""))
        return {"kind": "page", "title": _title_of(doc) or label.capitalize(), "brand": brand, "html": doc, "mode": "flow",
                "sig": hashlib.sha256(doc.encode()).hexdigest()}
    if k == "research_report":
        title, doc = report_page(t)
    elif k == "transcript":
        title, doc = findings_page(t)
    elif rp.endswith(".html"):
        if k == "social":
            from . import social
            doc = social.labelled_page(t)
        else:
            doc = _read(rp)
        title = _title_of(doc)
    else:
        raise ExportError("this kind of work has no page to export")
    return {"kind": "page", "title": title or KIND_WORD.get(k, k).replace("-", " ").capitalize(), "brand": brand,
            "html": doc, "mode": "flow", "sig": hashlib.sha256(doc.encode()).hexdigest()}


# ---- making the files ---------------------------------------------------------------------------------------------
def _render(src, want):
    body = {"html": src["html"], "mode": src.get("mode", "flow"), "selector": src.get("selector", ""),
            "screens": src.get("screens") or [], "css": src.get("css", ""), "width": src.get("width") or LAYOUT_W, "out_width": src.get("out_width") or OUT_W, "height": src.get("height") or 0,
            "want": want, "brand": src.get("brand") or "nxt", "max_pages": 60}
    try:
        r = httpx.post(config.RENDER_URL.rstrip("/") + "/pages", json=body, timeout=600)
    except httpx.HTTPError as ex:
        raise ExportError(f"the page renderer could not be reached ({type(ex).__name__}); start ia-next-render")
    if r.status_code != 200:
        detail = ""
        try:
            detail = str(r.json().get("detail") or "")
        except ValueError:
            pass
        raise ExportError(f"the page renderer could not lay this out (HTTP {r.status_code}{': ' + detail if detail else ''})")
    return r.json()


def _zip(pngs, stem):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
        for i, p in enumerate(pngs, 1):
            z.writestr(f"{stem}-{i:02d}.png", p)
    return buf.getvalue()


def _pdf_from_pictures(pngs):
    from PIL import Image
    imgs = [Image.open(io.BytesIO(p)).convert("RGB") for p in pngs]
    buf = io.BytesIO()
    imgs[0].save(buf, "PDF", save_all=True, append_images=imgs[1:], resolution=144.0)
    return buf.getvalue()


def _diagram_slides(src):
    """The editable slides of a diagram, in order: a mind map is its drawn page (drawn again from the saved spec, with
    no model call, when it was made before mind maps had one); every other section is its spec, which HiC draws in its
    full exhibit frame and exports as native shapes and editable text (owner 2026-11-19: never a picture)."""
    from . import diagram
    if src.get("drawn_by") == "illustrated" and src.get("slide_page"):
        return [{"html": src["slide_page"]}]     # the canvas as drawn: its text stays text, each illustration a picture
    items = []
    for s in src["sections"]:
        spec = s.get("spec") or {}
        if s.get("family") == "mindmap":
            page = src["slide_page"] if (src.get("slide_page") and len(src["sections"]) == 1) else ""
            if not page:
                try:
                    page = diagram._draw_mindmap(s, src["title"], src["brand"])[1]
                except ValueError as ex:
                    raise ExportError(str(ex))
            items.append({"html": page})
        elif spec:
            items.append({"spec": dict(spec, title=s.get("heading") or src["title"], takeaway=s.get("takeaway") or "")})
    if not items:
        raise ExportError("this diagram has no section left to draw as slides")
    return items


_SP = re.compile(r"<p:sp>.*?</p:sp>", re.S)
FIT = 90000                         # multi-line text is stored at this share of its size (thousandths of a percent)


def steady(data):
    """The PowerPoint file with its text boxes made safe against re-wrapping. The exporter writes each text box at
    the exact width the browser measured, in the brand's face. PowerPoint substitutes another face when the brand's
    is not installed, its lines run wider, and text wraps where it did not in the browser: a one-line label breaks
    onto the title below it, a paragraph gains a line and lands on the next block (owner, 20 Nov: "weird word
    wrapping issues on these slides"). Two rules, applied to every text box after the file is made:
    - a box that held ONE line in the browser never wraps (wrap="none"): its words stay on one line in any face;
    - a box that held SEVERAL lines keeps its width and stores a fit of 90 percent, so a line that would have wrapped
      still fits and the box keeps its height.
    Returns (bytes, how many one-line boxes were locked, how many multi-line boxes were fitted)."""
    import zipfile
    src = zipfile.ZipFile(io.BytesIO(data))
    out = io.BytesIO()
    locked = fitted = 0

    def fix(m):
        nonlocal locked, fitted
        sp = m.group(0)
        if "<a:t>" not in sp or 'wrap="square"' not in sp:
            return sp
        ext = re.search(r'<a:ext cx="(\d+)" cy="(\d+)"', sp)
        size = re.search(r'<a:rPr[^>]*\bsz="(\d+)"', sp)
        if not ext or not size:
            return sp
        line = re.search(r'<a:lnSpc><a:spcPts val="(\d+)"', sp)
        line_emu = (int(line.group(1)) if line else int(size.group(1)) * 1.2) / 100.0 * 12700
        lines = int(ext.group(2)) / max(1.0, line_emu)
        if sp.count("<a:p>") + sp.count("<a:p ") <= 1 and lines < 1.6:
            locked += 1
            return sp.replace('wrap="square"', 'wrap="none"', 1)
        body = re.search(r"<a:bodyPr([^>]*)/>", sp)
        if body:
            fitted += 1
            return sp.replace(body.group(0), f'<a:bodyPr{body.group(1)}><a:normAutofit fontScale="{FIT}"/></a:bodyPr>', 1)
        return sp
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for item in src.infolist():
            raw = src.read(item.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", item.filename):
                raw = _SP.sub(fix, raw.decode("utf-8")).encode("utf-8")
            z.writestr(item, raw)
    return out.getvalue(), locked, fitted


def _hic_pptx(stages=None, name="slides.pptx", items=None, brand="nxt"):
    """Editable slides from HiC's exporter: stages (#stage pages) through /api/gold/export-pptx-multi, or diagram items
    ({"spec"} or {"html"}) through /api/ai/diagram-pptx. Raises ExportError: an editable file or none, never pictures."""
    try:
        if items is not None:
            data = hic.call_bytes("POST", "/api/ai/diagram-pptx", 900, json={"items": items, "brand": brand, "filename": name})
        else:
            data = hic.call_bytes("POST", "/api/gold/export-pptx-multi", 900, json={"slides": stages, "filename": name})
    except hic.HicUnavailable as ex:
        raise ExportError(f"editable PowerPoint slides are made by HiC's exporter, and {str(ex)[:1].lower()}{str(ex)[1:]}")
    if not data.startswith(b"PK"):
        raise ExportError("HiC's exporter answered with something that is not a PowerPoint file")
    return data


def slug(text, n=70):
    s = re.sub(r"[^a-z0-9]+", "-", str(text or "").lower()).strip("-")
    return s[:n].rstrip("-")


def make(t, fmt):
    """(bytes, file name, media type) for one finished task in one format. Raises ExportError."""
    if fmt not in FORMATS:
        raise ExportError("the formats are png, pdf and pptx")
    if not t or t.get("status") != "done":
        raise ExportError("this work is not finished, so there is nothing to export yet")
    try:
        src = source(t)
    except (OSError, ValueError, KeyError) as ex:
        raise ExportError(f"the finished work could not be read ({type(ex).__name__})")
    stem = slug(src["title"]) or KIND_WORD.get(t["kind"], "artifact")
    cache = store.safe_path(t["engagement_id"], f"results/tasks/{t['id']}/exports")
    key = hashlib.sha256(f"{VERSION}|{fmt}|{src['sig']}".encode()).hexdigest()[:20]
    for name in (os.listdir(cache) if os.path.isdir(cache) else []):
        if name.startswith(key + "."):
            ext = name.rsplit(".", 1)[1]
            with open(os.path.join(cache, name), "rb") as fh:
                return fh.read(), f"{stem}.{ext}", MEDIA[ext]
    data, ext = _build(t, src, fmt, stem)
    os.makedirs(cache, exist_ok=True)
    for name in os.listdir(cache):                       # one kept export per format
        if name.split(".", 1)[0] != key and name.startswith(tuple("0123456789abcdef")) and (
                name.endswith("." + ext) or (fmt == "png" and name.endswith((".png", ".zip")))):
            try:
                os.remove(os.path.join(cache, name))
            except OSError:
                pass
    with open(os.path.join(cache, f"{key}.{ext}"), "wb") as fh:
        fh.write(data)
    return data, f"{stem}.{ext}", MEDIA[ext]


def _build(t, src, fmt, stem):
    if src["kind"] == "diagram":
        if fmt == "png":
            return src["picture"], "png"
        if fmt == "pdf":
            return _pdf_from_pictures([src["picture"]]), "pdf"
        return _hic_pptx(name=f"{stem}.pptx", items=_diagram_slides(src), brand=src["brand"]), "pptx"
    if fmt == "pptx" and src["kind"] == "deck":
        if not os.path.isfile(src["pptx_path"]):
            raise ExportError("this deck's PowerPoint file is missing; make the deck again")
        with open(src["pptx_path"], "rb") as fh:
            return fh.read(), "pptx"
    if fmt == "png":
        got = _render(src, ["png"])
        pngs = [base64.b64decode(p) for p in got.get("pages") or []]
        if not pngs:
            raise ExportError("the renderer returned no pages")
        return (pngs[0], "png") if len(pngs) == 1 else (_zip(pngs, stem), "zip")
    slides = dict(src, html=src["slides_html"], mode="slides", selector="section.stage", width=1920, out_width=1920) if src.get("slides_html") else None
    if fmt == "pdf":
        # 22 Nov, the owner: the PDF of a persona set or an architecture was the long page cut into pieces, sections split
        # across pages and sentences cut off. A page that has slides prints its slides, one whole slide to a page.
        if slides:
            got = _render(dict(slides, mode="print", height=1080), ["pdf"])
        elif src["kind"] == "deck":           # a deck's slides are 16:9 at the page's width: one slide a page, printed as it is
            got = _render(dict(src, mode="print", width=1280, height=720, out_width=1280), ["pdf"])
        else:
            got = _render(src, ["pdf"])
        if not got.get("pdf"):
            raise ExportError("the renderer returned no PDF")
        return base64.b64decode(got["pdf"]), "pdf"
    if slides:                                   # whole slides, one thing on each, never the page cut by height
        got = _render(slides, ["stages"])
    else:
        got = _render(src, ["stages"])
    stages = got.get("stages") or []
    if not stages:
        raise ExportError("the renderer returned no pages")
    return steady(_hic_pptx(stages, f"{stem}.pptx"))[0], "pptx"      # every text box checked against re-wrapping
