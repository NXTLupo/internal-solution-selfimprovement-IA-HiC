"""Screenshots of a prototype's screens, for IA Next's design review (plan Part 8, P5), and 16:9 pages of any finished
artifact for its downloads (owner 2026-11-19: every artifact as pictures, a PDF and 16:9 PowerPoint slides).

A prototype or an artifact is model-written code. It runs here, not in IA Next: this container holds no API keys, no
data volume and no route to the internet (it sits only on an internal Docker network shared with IA Next, and
publishes no host port). Inside the page every request other than data: and blob: is refused, so the page reaches
nothing.

POST /shots {html, screens: [name, ...], width?, height?}
  -> {shots: [{screen, png}], unreachable: [name, ...]}   (png is base64)
A screen is reached by clicking the control whose visible text is its name (exact first, then containing it).

POST /pages {html, mode, selector?, screens?, width?, height?, out_width?, css?, want: [png|pdf|stages], brand?}
  -> {pages: [png, ...], pdf, stages: [html, ...], width, height, truncated, unreachable}
mode "flow" cuts a long page into 16:9 pages without cutting through a line, a picture or a small box; "slides"
makes one page of each element matching selector; "screens" makes one page of each screen of an app (as /shots).
A stage is one page as a 1920x1080 document for HiC's PowerPoint exporter: a picture of the page with its text
hidden, and every line of text laid over it as positioned text, so the slide looks like the page and its words stay
editable. Stages carry no script.
"""
import base64
import re

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="IA Next renderer")
MAX_HTML = 2_000_000
MAX_SCREENS = 8


class ShotRequest(BaseModel):
    html: str
    screens: list[str] = []
    width: int = 1440
    height: int = 900


@app.get("/health")
def health():
    return {"status": "healthy", "service": "ia-next-render"}


def _allow(route):
    url = route.request.url
    if url.startswith(("data:", "blob:", "about:")):
        return route.continue_()
    return route.abort()


def _control(page, name):
    pat_exact = re.compile(rf"^\s*{re.escape(name)}\s*$", re.I)
    pat_part = re.compile(re.escape(name), re.I)
    sel = "a, button, [role=tab], [role=link], [role=button], [role=menuitem], nav li, [data-screen], [data-route]"
    for pat in (pat_exact, pat_part):
        loc = page.locator(sel).filter(has_text=pat)
        if loc.count():
            return loc.first
    return None


_SCRIPT = re.compile(r"(?is)<script\b([^>]*)>(.*?)</script\s*>")
_LOCATE = """async (sources) => {
  const found = [];
  for (const s of sources) {
    const hit = await new Promise((done) => {
      const onErr = (e) => { window.removeEventListener('error', onErr); done({ m: String(e.message), l: e.lineno }); };
      window.addEventListener('error', onErr);
      const el = document.createElement('script');
      el.src = URL.createObjectURL(new Blob(['function __parse_only(){\\n' + s + '\\n}'], { type: 'text/javascript' }));
      el.onload = () => { window.removeEventListener('error', onErr); done(null); };
      document.head.appendChild(el);
      setTimeout(() => done(null), 4000);
    });
    found.push(hit);
  }
  return found;
}"""


def syntax_errors(browser, html):
    """["message at line N"] for each inline script that does not parse, N counted in the whole document. A page set
    through the browser's own write reports a syntax error with no place ("Failed to execute 'write' on 'Document':
    Unexpected token ')'"), and a repair cannot aim at that. Each script is parsed inside a function that is never
    called, so nothing in it runs."""
    blocks = [(m.start(2), m.group(2)) for m in _SCRIPT.finditer(html)
              if "src=" not in m.group(1).lower() and ("type=" not in m.group(1).lower() or "javascript" in m.group(1).lower()
                                                       or "module" in m.group(1).lower())]
    if not blocks:
        return []
    page = browser.new_page()
    try:
        page.set_content("<!doctype html><html><head></head><body></body></html>")
        hits = page.evaluate(_LOCATE, [src for _, src in blocks]) or []
    except Exception:
        return []
    finally:
        page.close()
    out = []
    for (start, _), hit in zip(blocks, hits):
        if hit and "SyntaxError" in hit.get("m", "") and int(hit.get("l") or 0) >= 2:
            line = html.count("\n", 0, start) + 1 + (int(hit["l"]) - 2)      # the wrapper adds one line above the script
            out.append(f"{hit['m'][:200]} at line {line}")
    return out


_SHOWN = """() => {
  const flat = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const all = flat(document.body ? document.body.innerText : '');
  const nav = flat([...document.querySelectorAll('nav, header, [role=tablist], aside')].map((e) => e.innerText).join(' '));
  return Math.max(0, all.length - nav.length);
}"""
MIN_SHOWN = 20           # characters of text outside the navigation. A designed empty state ("No assignment selected") passes; a page whose content was never attached shows none


_SEEN = "() => (document.body ? document.body.innerText : '').replace(/\\s+/g, ' ').trim()"


def seen(page):
    try:
        return str(page.evaluate(_SEEN))
    except Exception:
        return None


_FIRST_ACTION = """() => {
  const found = [];
  const skip = 'nav, header, aside, [role=tablist], [role=dialog], [aria-hidden=true], [class*=crumb], [aria-current]';
  for (const b of document.querySelectorAll('button, [role=button]')) {
    const r = b.getBoundingClientRect();
    const label = (b.innerText || '').replace(/\\s+/g, ' ').trim();
    if (b.closest(skip) || b.disabled || r.width < 8 || r.height < 8 || r.top < 0 || r.top > innerHeight) continue;
    if (label.length < 3 || label.length > 40 || getComputedStyle(b).position === 'fixed') continue;
    if (found.includes(label)) continue;
    b.setAttribute('data-ia-action', String(found.length));
    found.push(label);
    if (found.length >= 3) break;
  }
  return found;
}"""


def dead_action(browser, html, w, h):
    """A sentence when none of the first three differently labelled buttons in the page's content changes any text when
    clicked, else None (one of them may be a filter that is already selected, so one silent button is not a fault).
    20 Nov: a prototype's "Check Policy" button highlighted its card and showed nothing, so the screen the whole page
    exists for could never be reached. Run on a fresh copy of the page so earlier clicks do not colour the result."""
    page = browser.new_page(viewport={"width": w, "height": h})
    try:
        page.route("**/*", _allow)
        page.set_content(html, wait_until="load", timeout=20_000)
        page.wait_for_timeout(1_000)
        labels = page.evaluate(_FIRST_ACTION) or []
        if len(labels) < 2:
            return None                               # one button proves little: it may be the selected filter
        for i in range(len(labels)):                  # up to three buttons with different labels; one live one clears the page
            before = seen(page)
            try:
                page.click(f'[data-ia-action="{i}"]', timeout=2_000)
            except Exception:
                return None                           # the page moved on: something happened
            page.wait_for_timeout(1_000)
            if before is None or seen(page) != before:
                return None
        names = ", ".join('"' + x + '"' for x in labels)
        return (f"the buttons {names} do nothing a person can read: clicking each changes no text on the page. A main "
                f"action must show its result, by opening its screen, a panel or a message")
    except Exception:
        return None
    finally:
        page.close()


def empty_screen(page, name):
    """A sentence when the view shows almost nothing outside its navigation, else None. 20 Nov: a prototype whose
    script ran without an error built every screen and never attached it to the page, and shipped blank."""
    try:
        shown = int(page.evaluate(_SHOWN))
    except Exception:
        return None
    if shown >= MIN_SHOWN:
        return None
    return (f'the screen "{name}" is empty: it shows {shown} characters of text outside the navigation. Every screen '
            f"must put its content on the page; check that the element each screen is built in is attached to the document")


_STACK_AT = re.compile(r":(\d+):\d+\)?\s*$", re.M)


def _placed(e):
    """The error's message with the line its stack trace names first ("... at line 412"), when it names one. A
    run-time error such as "Cannot read properties of null (reading 'addEventListener')" is no use to a repair without
    its place, and the page's own error event is lost when the document is written by the browser driver."""
    msg = str(getattr(e, "message", "") or e)[:240]
    m = _STACK_AT.search(str(getattr(e, "stack", "") or ""))
    return f"{msg} at line {m.group(1)}" if m and " at line " not in msg else msg


@app.post("/shots")
def shots(r: ShotRequest):
    if not r.html or len(r.html) > MAX_HTML:
        raise HTTPException(400, "send one HTML document under 2 MB")
    from playwright.sync_api import sync_playwright
    out, unreachable, errors = [], [], []
    w, h = max(800, min(r.width, 1920)), max(600, min(r.height, 1200))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            ctx = browser.new_context(viewport={"width": w, "height": h}, offline=True, service_workers="block")
            ctx.route("**/*", _allow)
            page = ctx.new_page()
            # A script that does not parse or throws leaves a prototype whose controls do nothing (19 Nov: a prototype
            # shipped with "missing ) after argument list"). The errors are returned so the build can be sent back.
            page.on("pageerror", lambda e: errors.append(_placed(e)))
            # the browser's own error event carries the line and column, which is what a repair needs
            page.add_init_script("window.__errs=[];window.addEventListener('error',function(e){try{window.__errs.push("
                                 "String(e.message).slice(0,200)+' at line '+e.lineno+', column '+e.colno);}catch(_){}});")
            page.set_content(r.html, wait_until="load", timeout=20_000)
            page.wait_for_timeout(1_000)              # first-run skeletons and entrance motion settle
            try:
                located = [str(x)[:260] for x in (page.evaluate("window.__errs || []") or [])]
            except Exception:
                located = []
            if located:
                errors[:] = located + [e for e in errors if not any(e.split(":")[-1].strip()[:40] in x for x in located)]
            out.append({"screen": "first view", "png": base64.b64encode(page.screenshot(type="png")).decode("ascii")})
            blank = [empty_screen(page, "first view")]
            first_seen, dead = seen(page), []
            for name in [s for s in r.screens if str(s).strip()][:MAX_SCREENS]:
                try:
                    ctl = _control(page, str(name).strip())
                    if ctl is None:
                        unreachable.append(name)
                        continue
                    ctl.click(timeout=3_000)
                    page.wait_for_timeout(900)
                    out.append({"screen": name, "png": base64.b64encode(page.screenshot(type="png")).decode("ascii")})
                    blank.append(empty_screen(page, name))
                    if first_seen is not None and seen(page) == first_seen:
                        dead.append(str(name))
                except Exception:
                    unreachable.append(name)
            if errors and not any(" at line " in e for e in errors):
                placed = syntax_errors(browser, r.html)           # a parse error with its line, when the page gave none
                if placed:
                    errors[:] = placed + errors
            errors += [b for b in blank if b][:3]
            # A page whose navigation does nothing shows the first view under every name (20 Nov: three tabs, one
            # screen, no script error). The first named screen may be the starting one, so one match is allowed.
            if not errors:
                idle = dead_action(browser, r.html, w, h)
                if idle:
                    errors.append(idle)
            if len(dead) >= 2:
                errors.append("the controls " + ", ".join('"' + d + '"' for d in dead[:4]) + " change nothing: after each "
                              "click the page shows exactly the first view. Each screen named in the navigation must show "
                              "its own content when its control is clicked, including before anything is selected")
        finally:
            browser.close()
    return {"shots": out, "unreachable": unreachable, "errors": list(dict.fromkeys(errors))[:8]}


# ---- 16:9 pages of a finished artifact ------------------------------------------------------------------------------
MAX_DOC = 40_000_000
MAX_PAGES = 80


class PagesRequest(BaseModel):
    html: str
    mode: str = "flow"                 # flow | slides | screens
    selector: str = ""                 # slides: the element that is one page
    screens: list[str] = []            # screens: the controls to click after the first view
    width: int = 1280                  # the layout width in CSS pixels
    height: int = 0                    # the page height; 0 makes the page 16:9
    out_width: int = 1920              # a page picture's width in pixels
    css: str = ""                      # extra CSS, applied before anything is measured
    want: list[str] = ["png"]          # png, pdf, stages
    brand: str = "nxt"
    max_pages: int = 60


# Every non-blank text node is wrapped once in a span, so the text can be hidden for the background picture while
# list markers, pseudo-element content, pictures and boxes stay painted. Canvases become pictures, so copies of the
# page keep their pixels.
_PREP_JS = r"""
([flat]) => {
  if (flat) {        // a page cut into pages has no viewport to stick to: fixed and sticky parts take their place in the flow
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const p = getComputedStyle(el).position;
      if (p === 'fixed') el.style.setProperty('position', 'absolute', 'important');
      else if (p === 'sticky') el.style.setProperty('position', 'relative', 'important');
    }
  }
  for (const c of Array.from(document.querySelectorAll('canvas'))) {
    try {
      const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
      const img = document.createElement('img'); img.src = c.toDataURL('image/png'); img.className = c.className;
      img.style.cssText = c.style.cssText; img.style.width = r.width + 'px'; img.style.height = r.height + 'px';
      if (cs.display === 'inline') img.style.display = 'inline-block';
      c.replaceWith(img);
    } catch (e) {}
  }
  const skip = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|OPTION|TITLE|TEMPLATE)$/;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (tw.nextNode()) {
    const n = tw.currentNode, p = n.parentElement;
    if (!p || skip.test(p.tagName) || p.closest('svg') || !n.data.trim()) continue;
    nodes.push(n);
  }
  for (const n of nodes) { const s = document.createElement('span'); s.className = 'ia-t'; n.replaceWith(s); s.appendChild(n); }
  const st = document.createElement('style');
  st.textContent = 'html.ia-hide .ia-t{color:transparent!important;-webkit-text-fill-color:transparent!important;'
    + 'text-shadow:none!important;text-decoration-color:transparent!important}';
  document.head.appendChild(st);
  return nodes.length;
}
"""

# Where a long page is cut: never through a line of text, a picture or a box shorter than most of a page; when no such
# cut exists in the lower part of the page, through the smallest leaf instead; the next page starts at the next content.
_PAGINATE_JS = r"""
([W, H, maxPages]) => {
  const sx = scrollX, sy = scrollY;
  const total = Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
  const big = [], leaf = [];
  const atomTag = /^(IMG|svg|VIDEO|HR|INPUT|BUTTON|TR|PICTURE|IFRAME|SELECT|TEXTAREA)$/;
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    const r = el.getBoundingClientRect(); const h = r.height;
    if (h <= 0.5 || r.width <= 0.5) continue;
    const t = r.top + sy, b = r.bottom + sy;
    if (h < 0.85 * H) { big.push([t, b]); if (!el.firstElementChild || atomTag.test(el.tagName) || el.classList.contains('ia-t')) leaf.push([t, b]); }
  }
  // a heading stays with the start of what follows it
  for (const hd of Array.from(document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]'))) {
    const nx = hd.nextElementSibling; if (!nx) continue;
    const a = hd.getBoundingClientRect(), b = nx.getBoundingClientRect();
    if (a.height < 0.5 || b.height < 0.5) continue;
    const t = a.top + sy, e = Math.min(b.bottom, a.bottom + 0.25 * H) + sy;
    if (e - t < 0.85 * H) big.push([t, e]);
  }
  // tops of painted boxes (a fill or a top border): a cut just below one moves up to it, so no sliver of a box shows
  const tops = [];
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const cs = getComputedStyle(el);
    const painted = (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none');
    if (!painted) continue;
    const r = el.getBoundingClientRect(); if (r.height < 2 || r.width < 2) continue;
    tops.push([r.top + sy, r.bottom + sy]);
  }
  // lines of text inside blocks taller than a page
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) {
    const n = tw.currentNode, p = n.parentElement; if (!p || !n.data.trim()) continue;
    const blk = p.closest('p,li,blockquote,td,th,dd,div,section,article') || p;
    if (blk.getBoundingClientRect().height < 0.85 * H) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const lr of Array.from(rg.getClientRects())) if (lr.height > 0.5) { big.push([lr.top + sy, lr.bottom + sy]); leaf.push([lr.top + sy, lr.bottom + sy]); }
  }
  const cutAt = (start, target, atoms, floor) => {
    let cut = target;
    for (let k = 0; k < 80; k++) {
      let m = Infinity;
      for (const [t, b] of atoms) if (t >= start - 1 && t < cut - 1 && b > cut + 1 && t < m) m = t;
      if (m === Infinity) return cut;
      if (m <= floor) return null;
      cut = m;
    }
    return cut;
  };
  const pages = []; let start = 0, truncated = false;
  while (start < total - 4) {
    if (pages.length >= maxPages) { truncated = true; break; }
    const target = start + H;
    let cut = target >= total ? total : (cutAt(start, target, big, start + 0.45 * H) ?? cutAt(start, target, leaf, start + 0.2 * H) ?? target);
    if (cut <= start + 1) cut = target;
    if (cut < total) {
      let m = Infinity;
      for (const [t, b] of tops) if (t > cut - 48 && t < cut - 0.5 && b > cut + 1 && t < m) m = t;
      if (m !== Infinity && m > start + 0.3 * H) cut = m;
    }
    pages.push({ x: 0, y: Math.floor(start), w: W, h: Math.ceil(cut - start) });
    let next = Infinity;
    for (const [t] of leaf) if (t >= cut - 0.5 && t < next) next = t;
    if (next === Infinity) break;
    start = next - cut > 24 ? Math.max(cut, next - 24) : cut;
  }
  return { pages, truncated, total };
}
"""

_SLIDES_JS = r"""
([sel, maxPages]) => {
  const sx = scrollX, sy = scrollY;
  const els = Array.from(document.querySelectorAll(sel)).filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  const pages = els.slice(0, maxPages).map(e => { const r = e.getBoundingClientRect();
    return { x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) }; });
  return { pages, truncated: els.length > maxPages };
}
"""

# The text of one window as positioned runs (the text-walk HiC's PowerPoint exporter uses: one run per stretch of text
# between block children), in window coordinates. A run that a cut crosses keeps only its words inside the window.
_TEXT_JS = r"""
([win]) => {
  const sx = scrollX, sy = scrollY, X0 = win.x, Y0 = win.y, X1 = win.x + win.w, Y1 = win.y + win.h;
  const runs = [];
  const isBlock = (el) => /^(block|flex|grid|table|list-item|flow-root|table-row|table-cell)/.test(getComputedStyle(el).display);
  const style = (el) => { const cs = getComputedStyle(el);
    return { family: cs.fontFamily, size: parseFloat(cs.fontSize) || 16, weight: parseInt(cs.fontWeight) || 400,
      italic: cs.fontStyle === 'italic', color: cs.color, spacing: cs.letterSpacing, transform: cs.textTransform,
      align: cs.textAlign, lh: cs.lineHeight }; };
  const inWin = (r) => r.right + sx > X0 && r.left + sx < X1 && r.bottom + sy > Y0 && r.top + sy < Y1;
  const fully = (r) => r.left + sx >= X0 - 1 && r.right + sx <= X1 + 1 && r.top + sy >= Y0 - 1 && r.bottom + sy <= Y1 + 1;
  const push = (text, r, el) => {
    text = text.replace(/\s+/g, ' ').trim(); if (!text || r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return;
    runs.push(Object.assign({ text, x: r.left + sx - X0, y: r.top + sy - Y0, w: r.width, h: r.height,
      lines: r.lines || 1 }, style(el)));
  };
  const emit = (rg, el) => {
    const txt = rg.toString(); if (!txt.trim()) return;
    const r = rg.getBoundingClientRect(); if (!inWin(r)) return;
    if (fully(r)) { const n = Array.from(rg.getClientRects()).filter(x => x.height > 0.5).length; push(txt, { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom, lines: n }, el); return; }
    // a cut crosses this run: keep the words whose box sits inside the window
    const words = []; let box = null;
    const tw = document.createTreeWalker(rg.commonAncestorContainer.nodeType === 3 ? rg.commonAncestorContainer.parentNode : rg.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      const n = tw.currentNode; if (!rg.intersectsNode(n)) continue;
      const re = /\S+/g; let m;
      while ((m = re.exec(n.data))) {
        const wr = document.createRange(); wr.setStart(n, m.index); wr.setEnd(n, m.index + m[0].length);
        const b = wr.getBoundingClientRect(); if (b.width < 0.5) continue;
        const cy = b.top + sy + b.height / 2;
        if (cy >= Y0 && cy <= Y1 && b.left + sx >= X0 - 1 && b.right + sx <= X1 + 1) {
          words.push(m[0]);
          box = box ? { left: Math.min(box.left, b.left), top: Math.min(box.top, b.top), right: Math.max(box.right, b.right), bottom: Math.max(box.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
        }
      }
    }
    if (box) push(words.join(' '), { left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top, right: box.right, bottom: box.bottom, lines: 2 }, el);
  };
  const walk = (el) => {
    if (el.tagName === 'svg' || el.closest('svg')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && !inWin(r) && cs.position === 'static' && cs.overflow === 'visible' && el.scrollHeight <= el.clientHeight + 2) return;
    // list markers and pseudo-element content are not text nodes: they stay painted in the picture behind the text
    const bounds = Array.from(el.children).filter(k => k.tagName === 'svg' || k.tagName === 'BR' || isBlock(k));
    const rg = document.createRange(); rg.selectNodeContents(el);
    if (bounds.length) rg.setEndBefore(bounds[0]);
    emit(rg, el);
    bounds.forEach((bk, i) => {
      if (bk.tagName !== 'svg' && bk.tagName !== 'BR') walk(bk);
      const after = document.createRange(); after.setStartAfter(bk);
      if (i + 1 < bounds.length) after.setEndBefore(bounds[i + 1]); else after.setEnd(el, el.childNodes.length);
      emit(after, el);
    });
  };
  walk(document.body);
  const fonts = [];
  for (const sh of Array.from(document.styleSheets)) { try { for (const ru of Array.from(sh.cssRules)) if (ru.type === 5) fonts.push(ru.cssText); } catch (e) {} }
  const bg = (() => { for (const el of [document.body, document.documentElement]) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return '#FFFFFF'; })();
  return { runs, fonts, bg };
}
"""

_WIDTH_JS = r"""
() => {
  let extra = 0;
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 8) extra = Math.max(extra, el.scrollWidth - el.clientWidth);
  }
  return [document.documentElement.scrollWidth, extra];
}
"""

_UNSCROLL_JS = r"""
() => {
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 8) {
      el.style.setProperty('overflow-x', 'visible', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    }
  }
}
"""

_SNAPSHOT_JS = r"""
() => {
  const doc = document.documentElement.cloneNode(true);
  doc.querySelectorAll('script,iframe,object,embed,noscript').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
    }
  });
  return '<!doctype html>' + doc.outerHTML;
}
"""

# A paged copy of the page for pictures and the PDF: one window per page, each holding a copy of the page shifted so
# the window shows exactly that page (everything below its cut is clipped away).
_WINDOWS_JS = r"""
([pages, H, bg]) => {
  const body = document.body; const bcs = getComputedStyle(body);
  const pad = ['Top', 'Right', 'Bottom', 'Left'].map(s => (parseFloat(bcs['margin' + s]) || 0) + (parseFloat(bcs['padding' + s]) || 0));
  const docW = Math.max(document.documentElement.scrollWidth, document.documentElement.clientWidth);
  const keep = ['display', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'gap', 'gridTemplateColumns', 'gridTemplateRows'];
  const kids = Array.from(body.childNodes).filter(n => !(n.nodeType === 1 && (/^(SCRIPT|STYLE)$/.test(n.tagName) || n.id === 'ia-spacer')));
  const holder = document.createElement('div'); holder.id = 'ia-pages';
  for (const p of pages) {
    const win = document.createElement('div'); win.className = 'ia-win';
    win.style.cssText = `position:relative;overflow:hidden;width:${p.w}px;height:${H}px;background:${bg};transform:translateZ(0)`;
    const clip = document.createElement('div');
    clip.style.cssText = `position:absolute;left:0;top:0;width:${p.w}px;height:${Math.min(H, p.h)}px;overflow:hidden`;
    const off = document.createElement('div');
    off.style.cssText = `position:absolute;left:${-p.x}px;top:${-p.y}px;width:${docW}px;box-sizing:border-box;padding:${pad.join('px ')}px`;
    for (const k of keep) off.style[k] = bcs[k];
    for (const n of kids) off.appendChild(n.cloneNode(true));
    clip.appendChild(off); win.appendChild(clip); holder.appendChild(win);
  }
  for (const n of kids) n.remove();
  body.style.margin = '0'; body.style.padding = '0'; body.style.display = 'block';
  body.appendChild(holder);
  const st = document.createElement('style');
  st.textContent = '@page{margin:0} html,body{margin:0!important;padding:0!important} .ia-win+.ia-win{break-before:page} .ia-win{break-inside:avoid}';
  document.head.appendChild(st);
  return pages.length;
}
"""


def _stage(win, text, bg_png, out_w, scale, brand):
    """One page as a 1920x1080 document: the text-hidden picture full bleed, every run positioned over it."""
    import html as _h
    k = scale
    out_h = round(win["h_page"] * k)
    avail = out_w / k                 # the window's width in layout pixels
    rows = []
    for r in text["runs"]:
        # A one-line run gets room to grow along its alignment: PowerPoint's faces set a little wider than Chromium's,
        # and a box exactly as wide as its text wraps there (the kicker and source lines collided on the first check).
        if r.get("lines", 1) <= 1:
            grow = r["w"] * 0.18 + 16
            align = r.get("align") or "left"
            if align == "center":
                g = max(0.0, min(grow / 2, r["x"], avail - r["x"] - r["w"]))
                r = dict(r, x=r["x"] - g, w=r["w"] + 2 * g)
            elif align in ("right", "end"):
                g = max(0.0, min(grow, r["x"]))
                r = dict(r, x=r["x"] - g, w=r["w"] + g)
            else:
                r = dict(r, w=r["w"] + max(0.0, min(grow, avail - r["x"] - r["w"] - 2)))
        fam = _h.escape(r["family"], quote=True)
        lh = r["lh"]
        lh_css = f"{float(lh[:-2]) * k:.2f}px" if isinstance(lh, str) and lh.endswith("px") else "normal"
        sp = r["spacing"]
        sp_css = f"{float(sp[:-2]) * k:.2f}px" if isinstance(sp, str) and sp.endswith("px") else "normal"
        single = r.get("lines", 1) <= 1
        rows.append(
            f'<div style="position:absolute;left:{r["x"] * k:.1f}px;top:{r["y"] * k:.1f}px;width:{(r["w"] + 2) * k:.1f}px;'
            f'font-family:{fam};font-size:{r["size"] * k:.2f}px;font-weight:{r["weight"]};'
            f'font-style:{"italic" if r["italic"] else "normal"};color:{_h.escape(r["color"], quote=True)};'
            f'letter-spacing:{sp_css};line-height:{lh_css};text-transform:{_h.escape(r["transform"] or "none", quote=True)};'
            f'text-align:{_h.escape(r["align"] or "left", quote=True)};white-space:{"nowrap" if single else "normal"}">'
            f'{_h.escape(r["text"])}</div>')
    fonts = "\n".join(f for f in text["fonts"] if "url(data:" in f or "local(" in f)
    return (f'<!doctype html><html data-brand="{_h.escape(brand, quote=True)}"><head><meta charset="utf-8"><style>{fonts}\n'
            f'html,body{{margin:0;padding:0;background:#fff}}#stage{{position:relative;width:{out_w}px;height:{out_h}px;'
            f'overflow:hidden;background:{_h.escape(text["bg"], quote=True)}}}#stage>img{{position:absolute;left:0;top:0;'
            f'width:{out_w}px;height:{out_h}px}}</style></head><body><div id="stage">'
            f'<img alt="" src="data:image/png;base64,{bg_png}">{"".join(rows)}</div></body></html>')


def _settle(page):
    try:
        page.evaluate("async () => { await document.fonts.ready; }")
    except Exception:
        pass
    page.wait_for_timeout(700)


class FitRequest(BaseModel):
    html: str
    selector: str = "section.stage"
    width: int = 1920
    height: int = 1080


_FIT_JS = """(sel) => [...document.querySelectorAll(sel)].map((s, i) => {
  const body = s.querySelector('.body') || s;
  const stopEl = s.querySelector('.band') || s.querySelector('.foot');
  const stop = stopEl ? stopEl.getBoundingClientRect().top : s.getBoundingClientRect().bottom;
  const leaves = [...body.querySelectorAll('*')].filter(x => x.children.length === 0 && x.getBoundingClientRect().height > 0 && x.getBoundingClientRect().bottom > stop + 1).length;
  const texts = [...s.querySelectorAll('p,li,h1,h2,h3,td,th')].filter(x => (x.innerText || '').trim());
  const wide = texts.filter(x => x.scrollWidth > x.clientWidth + 2).length;
  const sizes = texts.map(x => parseFloat(getComputedStyle(x).fontSize));
  const title = ((s.querySelector('h1') || {}).innerText || '').trim();
  return {n: i + 1, overflow: Math.round(body.scrollHeight - body.clientHeight), into_footer: leaves, wider_than_box: wide,
          smallest_px: sizes.length ? Math.min(...sizes) : 0, title: title};
})"""


@app.post("/fit")
def fit(r: FitRequest):
    """Per slide: how far its body overflows, how many leaves run into the band or footer, how many texts run out of
    their box sideways, the smallest text size and the title (IA Next Local uplift plan WS-1: the scorecard measures
    every slide deck the way the kit script slides_fit2.py did by hand)."""
    if not r.html or len(r.html) > MAX_DOC:
        raise HTTPException(400, "send one HTML document under 40 MB")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            ctx = browser.new_context(viewport={"width": r.width, "height": r.height}, offline=True, service_workers="block")
            ctx.route("**/*", _allow)
            page = ctx.new_page()
            page.set_content(r.html, wait_until="load", timeout=90_000)
            _settle(page)
            return {"slides": page.evaluate(_FIT_JS, r.selector)}
        finally:
            browser.close()


@app.post("/pages")
def pages(r: PagesRequest):
    if not r.html or len(r.html) > MAX_DOC:
        raise HTTPException(400, "send one HTML document under 40 MB")
    if r.mode not in ("flow", "slides", "screens", "print"):
        raise HTTPException(400, "mode is flow, slides, screens or print")
    if r.mode == "slides" and not r.selector.strip():
        raise HTTPException(400, "slides mode needs a selector")
    want = {w for w in r.want if w in ("png", "pdf", "stages", "dom")} or {"png"}
    from playwright.sync_api import sync_playwright
    W = max(640, min(r.width, 2560))
    H = r.height if r.height > 0 else round(W * 9 / 16)
    H = max(360, min(H, 6000))
    max_pages = max(1, min(r.max_pages, MAX_PAGES))
    out = {"pages": [], "pdf": None, "stages": [], "width": W, "height": H, "truncated": False, "unreachable": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"])
        try:
            def open_page(width, height, scale, unscroll=False):
                ctx = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=scale,
                                          offline=True, service_workers="block")
                ctx.route("**/*", _allow)
                pg = ctx.new_page()
                pg.set_content(r.html, wait_until="load", timeout=90_000)
                if r.css:
                    pg.add_style_tag(content=r.css)
                _settle(pg)
                if unscroll:                          # a sideways scroller shows all of its content on a page
                    pg.evaluate(_UNSCROLL_JS)
                    pg.wait_for_timeout(200)
                return pg

            scale = r.out_width / W
            page = open_page(W, H, scale)
            if r.mode == "flow":
                # content wider than the page, either the page itself or a table scrolling sideways inside it: lay the
                # page out at the width that shows all of it (twice at most: centred content can move when widened)
                unscroll = False
                for _ in range(2):
                    sw, extra = page.evaluate(_WIDTH_JS)
                    unscroll = unscroll or extra > 8
                    need = max(sw, W + extra + (40 if extra else 0))
                    if need <= W + 8 or W >= 2560:
                        break
                    W = min(int(need), 2560)
                    H = r.height if r.height > 0 else round(W * 9 / 16)
                    scale = r.out_width / W
                    page.context.close()
                    page = open_page(W, H, scale, unscroll=unscroll)
                    out["width"], out["height"] = W, H
            if r.mode == "screens":
                return _screens(page, r, W, H, scale, want, out)
            if r.mode == "print":
                # a document already made of whole pages (IA Next's slide pages: each section one 16:9 slide) printed as
                # it is, one page per section, with its text kept as text. 22 Nov: the windowed PDF below painted only
                # the first and last page of a long slide document and left the rest blank.
                page.add_style_tag(content=f"@page{{size:{W}px {H}px;margin:0}}html,body{{margin:0!important;padding:0!important}}"
                                           f"{r.selector or 'section'}{{break-after:page;page-break-after:always;break-inside:avoid}}")
                page.emulate_media(media="screen")
                _settle(page)
                out["pdf"] = base64.b64encode(page.pdf(width=f"{W}px", height=f"{H}px", print_background=True, prefer_css_page_size=True,
                                                       margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})).decode("ascii")
                return out
            if "dom" in want:                         # the page as drawn by its own script, with no script left in it
                out["dom"] = page.evaluate(_SNAPSHOT_JS)
                out["dropped"] = int(page.evaluate("() => +((document.getElementById('stage') || {}).dataset || {}).dropped || 0") or 0)
            page.evaluate(_PREP_JS, [True])
            page.wait_for_timeout(250)
            got = page.evaluate(_PAGINATE_JS, [W, H, max_pages]) if r.mode == "flow" else page.evaluate(_SLIDES_JS, [r.selector, max_pages])
            pages_ = got["pages"]
            out["truncated"] = bool(got.get("truncated"))
            if not pages_:
                raise HTTPException(422, "the page has nothing to show")
            # room below the last page, so every page can be scrolled to the top of the viewport and captured there
            page.evaluate("(h) => { const s = document.createElement('div'); s.id = 'ia-spacer'; s.style.height = h + 'px'; document.body.appendChild(s); }", H)
            if "stages" in want:
                for pg in pages_:
                    ph = H if r.mode == "flow" else pg["h"]
                    win = {"x": pg["x"], "y": pg["y"], "w": pg["w"], "h": pg["h"]}
                    text = page.evaluate(_TEXT_JS, [win])
                    page.evaluate("() => document.documentElement.classList.add('ia-hide')")
                    sy = page.evaluate("(y) => { window.scrollTo(0, y); return scrollY; }", pg["y"])
                    if ph <= H and pg["x"] + pg["w"] <= W + 1:
                        shot = page.screenshot(type="png", clip={"x": pg["x"], "y": pg["y"] - sy, "width": pg["w"], "height": ph})
                    else:
                        shot = page.screenshot(type="png", full_page=True, clip={"x": pg["x"], "y": pg["y"], "width": pg["w"], "height": ph})
                    page.evaluate("() => { document.documentElement.classList.remove('ia-hide'); window.scrollTo(0, 0); }")
                    if pg["h"] < ph:                  # what lies below the cut belongs to the next page: paint it over
                        shot = _blank_below(page, shot, pg, ph, text["bg"], scale)
                    k = r.out_width / pg["w"]
                    out["stages"].append(_stage({**win, "h_page": ph}, text, base64.b64encode(shot).decode("ascii"),
                                                r.out_width, k, r.brand))
            if want & {"png", "pdf"}:
                bg = page.evaluate("() => { for (const el of [document.body, document.documentElement]) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return c; } return '#FFFFFF'; }")
                ph = H if r.mode == "flow" else max(pg["h"] for pg in pages_)
                page.evaluate(_WINDOWS_JS, [pages_ if r.mode == "flow" else [dict(pg, h=pg["h"]) for pg in pages_], ph, bg])
                _settle(page)
                if "png" in want:
                    wins = page.locator(".ia-win")
                    for i in range(wins.count()):
                        out["pages"].append(base64.b64encode(wins.nth(i).screenshot(type="png")).decode("ascii"))
                if "pdf" in want:
                    page.emulate_media(media="screen")
                    pw = max(pg["w"] for pg in pages_)
                    out["pdf"] = base64.b64encode(page.pdf(width=f"{pw}px", height=f"{ph}px", print_background=True,
                                                           margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})).decode("ascii")
        finally:
            browser.close()
    return out


def _blank_below(page, shot, pg, ph, bg, scale):
    """The picture of a page whose cut sits above the page's foot, with the strip below the cut painted in the page's
    background (Chromium paints it, so this container needs no imaging library)."""
    b64 = base64.b64encode(shot).decode("ascii")
    cut = pg["h"]
    return base64.b64decode(page.evaluate(
        """async ([b64, w, ph, cut, bg, k]) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64;
        await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.fillStyle = bg; g.fillRect(0, Math.floor(cut * k), c.width, c.height);
        return c.toDataURL('image/png').split(',')[1]; }""", [b64, pg["w"], ph, cut, bg, scale]))


def _screens(page, r, W, H, scale, want, out):
    """An app's first view and each named screen, one page each (pictures, stages and a PDF of the pictures)."""
    page.evaluate(_PREP_JS, [False])
    page.wait_for_timeout(300)
    names = ["first view"] + [s for s in r.screens if str(s).strip()][:MAX_SCREENS]
    shots = []
    for i, name in enumerate(names):
        if i:
            try:
                ctl = _control(page, str(name).strip())
                if ctl is None:
                    out["unreachable"].append(name)
                    continue
                ctl.click(timeout=3_000)
                page.wait_for_timeout(900)
            except Exception:
                out["unreachable"].append(name)
                continue
        sx, sy = page.evaluate("() => [scrollX, scrollY]")
        win = {"x": sx, "y": sy, "w": W, "h": H}
        if "stages" in want:
            text = page.evaluate(_TEXT_JS, [win])
            page.evaluate("() => document.documentElement.classList.add('ia-hide')")
            bg = page.screenshot(type="png")
            page.evaluate("() => document.documentElement.classList.remove('ia-hide')")
            out["stages"].append(_stage({**win, "h_page": H}, text, base64.b64encode(bg).decode("ascii"), r.out_width, scale, r.brand))
        shots.append(page.screenshot(type="png"))
    if "png" in want:
        out["pages"] = [base64.b64encode(s).decode("ascii") for s in shots]
    if "pdf" in want and shots:
        imgs = "".join(f'<div class="ia-win"><img src="data:image/png;base64,{base64.b64encode(s).decode("ascii")}"></div>' for s in shots)
        page.set_content(f'<!doctype html><html><head><style>@page{{margin:0}}html,body{{margin:0;padding:0}}'
                         f'.ia-win{{width:{W}px;height:{H}px;overflow:hidden}}.ia-win+.ia-win{{break-before:page}}'
                         f'.ia-win img{{display:block;width:{W}px;height:{H}px}}</style></head><body>{imgs}</body></html>',
                         wait_until="load", timeout=60_000)
        out["pdf"] = base64.b64encode(page.pdf(width=f"{W}px", height=f"{H}px", print_background=True,
                                               margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})).decode("ascii")
    return out
