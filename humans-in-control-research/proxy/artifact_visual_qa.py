"""Automated visual-QA gate for generated artifacts (2026-06-02).

The recurring "jumbled / cut-off / overlapping" defects share one root: the model
writes freeform HTML and misuses design-system primitives in new ways. CSS guards
added after a human spots each one are reactive (whack-a-mole). This module closes
the loop: it renders the FINAL artifact HTML in the proxy's headless Chromium and
runs the SAME detector used during manual debugging, so defects are caught
automatically -- before the user sees them -- including misuse classes not seen
before. It also gives the export path a parity oracle (same renderer the PPTX/PDF
exporter uses), satisfying "exports must match their previews".

Pure detection + structured report. It does not mutate the artifact; the parent
logs the report, can surface a warning, and (future) trigger a one-shot revision.
Browser-free fallback: if Chromium is unavailable, returns {available: False}.
"""
from __future__ import annotations
from render_sandbox import sandboxed_page  # WS-0 S3 (2026-10-30): network-sandboxed renders

# Detector mirrors the live Playwright probes that diagnosed the persona collapse,
# the gap-card crush, the meter-bar misuse, the asymmetric margin, and right overflow.
_QA_JS = r"""
() => {
  const vis = el => { const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && el.offsetParent!==null; };
  const dt = el => { let s=''; for (const n of el.childNodes) if (n.nodeType===3) s+=n.textContent; return s.trim(); };
  const iw = document.documentElement.clientWidth;

  // 1. CRUSH: a text-bearing element (>=5 words of its OWN text) squeezed below a
  //    readable width -> the one-word-per-line failure. Exclude elements that are
  //    intentionally compact (chips / tags / badges / mono micro-labels / source
  //    names), which legitimately wrap a short phrase and are not "crushed prose".
  const COMPACT = /chip|tag|badge|pill|eyebrow|kicker|__k\b|sname|label|__role|stat__|metric__|__n\b|__sub\b|process__|__num|__step|horizon__label/i;
  const crush = [];
  document.querySelectorAll('p,td,th,li,blockquote,.nxt-prose,.nxt-quote__text,.nxt-h2,.nxt-h3,.nxt-card__title,.nxt-hero__title').forEach(el=>{
    if(!vis(el)) return;
    const cls=(el.className||el.tagName).toString();
    if(COMPACT.test(cls)) return;
    const t=dt(el); const w=el.getBoundingClientRect().width;
    if(t.split(/\s+/).filter(Boolean).length>=5 && w>0 && w<170)
      crush.push({cls:cls.slice(0,28), w:Math.round(w), txt:t.slice(0,32)});
  });

  // 2. OVERFLOW: any element bleeding past the right viewport edge (no right margin).
  const overflow = [];
  document.querySelectorAll('body *').forEach(el=>{
    const cs=getComputedStyle(el); if(cs.position==='fixed') return;
    const r=el.getBoundingClientRect();
    if(r.right>iw+2 && r.width>0)
      overflow.push({cls:(el.className||el.tagName).toString().slice(0,28), right:Math.round(r.right)});
  });

  // 3. ASYMMETRY: the content column's left and right margins must match. Measure
  //    the masthead (always visible, sticky, governed by the SAME page-box rule as
  //    .nxt-wrap), or fall back to an on-screen full-width wrap. A hidden / off-
  //    screen tab-panel wrap would otherwise give a spurious delta.
  let asymmetry=null;
  let ref=document.querySelector('.nxt-masthead');
  if(!ref || !vis(ref) || ref.getBoundingClientRect().width<400){
    ref=[...document.querySelectorAll('.nxt-wrap')].find(el=>{const r=el.getBoundingClientRect(); return vis(el)&&r.width>400&&r.left>=-2&&r.right<=iw+2;});
  }
  if(ref){ const r=ref.getBoundingClientRect(); const l=Math.round(r.left), rr=Math.round(iw-r.right); asymmetry={left:l,right:rr,delta:Math.abs(l-rr)}; }

  // 4. METER MISUSE: a .nxt-strength used as a text label but still painting a <10px bar.
  const meter=[];
  document.querySelectorAll('.nxt-strength').forEach(el=>{
    if(!vis(el)) return;
    const hasFill=!!el.querySelector(':scope > i');
    const t=dt(el); const h=el.getBoundingClientRect().height;
    if(!hasFill && t.length>0 && h<12)
      meter.push({txt:t.slice(0,20), h:Math.round(h)});
  });

  // 5. OVERLAP: two text/heading boxes overlapping by a meaningful area.
  let overlap=0;
  const T=[...document.querySelectorAll('.nxt-eyebrow,.nxt-h2,.nxt-h3,.nxt-hero__title,.nxt-persona__name,td,th')].filter(vis);
  for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++){
    const a=T[i],b=T[j]; if(a.contains(b)||b.contains(a))continue;
    const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    const ox=Math.max(0,Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left));
    const oy=Math.max(0,Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top));
    if(ox*oy>150)overlap++;
  }

  // 6. BLANK (2026-06-16): "nothing rendered" is a layout defect too. After JS has
  //    run, the mount target must carry real content. A blank prototype (React failed
  //    to mount, no root component, or an empty App) shows ~0 visible text and only a
  //    stray icon. Measure the mount root (#root for prototypes, else body): visible
  //    text length + the count of rendered, visible, non-chrome element nodes.
  const mount = document.getElementById('root') || document.body;
  const mountText = (mount && (mount.innerText || '').trim()) || '';
  let mountEls = 0;
  if (mount) mount.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    if (vis(el)) mountEls++;
  });
  // 7. RUNTIME ERROR: the /view wrapper appends a .__hic_proto_error block on any
  //    window error (Babel/React mount failure). Its presence is a hard defect.
  const protoError = document.querySelector('.__hic_proto_error');

  // 8. LAYOUT DENSITY (E3 2026-07-02, artifact-total-elevation): the fraction of the content
  //    region NOT covered by any visible content leaf (own text / img / svg / canvas). A card
  //    whose interior is dead ivory wash marks no cells -> a template that underfills its
  //    containers reports a high emptyBodyFrac (the 366:2 "big gaps" failure, evidence E-3).
  //    Panel backgrounds/borders deliberately do NOT count as content.
  let emptyBodyFrac = null;
  {
    const region = document.querySelector('[data-stage-body], .gold-body, .slide-body, .stage-body, main') || mount;
    if (region) {
      const rb = region.getBoundingClientRect();
      if (rb.width > 200 && rb.height > 150) {
        const GX = 48, GY = 27;
        const grid = new Uint8Array(GX * GY);
        const mark = (r) => {
          if (r.width <= 0 || r.height <= 0) return;
          const x0 = Math.max(0, Math.floor((r.left - rb.left) / rb.width * GX));
          const x1 = Math.min(GX - 1, Math.ceil((r.right - rb.left) / rb.width * GX) - 1);
          const y0 = Math.max(0, Math.floor((r.top - rb.top) / rb.height * GY));
          const y1 = Math.min(GY - 1, Math.ceil((r.bottom - rb.top) / rb.height * GY) - 1);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * GX + x] = 1;
        };
        region.querySelectorAll('*').forEach(el => {
          if (!vis(el)) return;
          const tag = el.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE') return;
          if (tag === 'IMG' || tag === 'svg' || tag === 'SVG' || tag === 'CANVAS' || tag === 'VIDEO') { mark(el.getBoundingClientRect()); return; }
          if (dt(el).length >= 2) mark(el.getBoundingClientRect());
        });
        let filled = 0; for (const v of grid) if (v) filled++;
        emptyBodyFrac = Math.round((1 - filled / (GX * GY)) * 1000) / 1000;
      }
    }
  }

  return {
    clientWidth: iw,
    horizScroll: document.documentElement.scrollWidth > iw+2,
    crush: crush.slice(0,12), crushCount: crush.length,
    overflow: overflow.slice(0,12), overflowCount: overflow.length,
    asymmetry, meterMisuse: meter, overlapCount: overlap,
    mountTextLen: mountText.length, mountEls: mountEls,
    protoError: protoError ? (protoError.textContent || '').slice(0, 400) : null,
    emptyBodyFrac,
  };
}
"""


def _enforcement_style() -> str:
    try:
        import nxt_design_system as _nds
        return "<style id='nxt-qa-enforce'>" + _nds._NXT_GRID_CSS_BODY + "</style>"
    except Exception:
        return ""


# Per-screen re-check after a nav click: did the mount error, or go blank?
_NAV_CHECK_JS = r"""
() => {
  const m = document.getElementById('root') || document.body;
  const t = (m && (m.innerText || '').trim()) || '';
  let els = 0;
  if (m) m.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) els++;
  });
  const err = document.querySelector('.__hic_proto_error');
  return { textLen: t.length, els: els, protoError: err ? (err.textContent || '').slice(0, 300) : null };
}
"""


def _probe_nav(page, max_clicks: int = 12) -> dict:
    """Click each distinct nav/interactive control and re-check the mount. Catches screens that
    render or interact only on navigation - the gate's blind spot (it only renders the landing
    screen). The /view wrapper appends .__hic_proto_error on ANY window error and never clears it,
    so the FIRST click that errors is the culprit; we record it and stop. Best-effort + bounded;
    a click that can't fire (covered/detached) is skipped, not a defect."""
    out = {"clicked": 0, "screens": [], "error_label": None, "blank_label": None}
    # Prefer chrome nav; fall back to any button/link. Pod apps route via AppLayout nav buttons.
    selectors = (
        'nav button, nav a, aside button, aside a, [class*="rail"] button, [class*="sidebar"] button, '
        '[class*="nav"] button, [role="tab"], [role="button"]'
    )
    try:
        handles = page.query_selector_all(selectors)
    except Exception:
        handles = []
    if not handles:
        try:
            handles = page.query_selector_all('button, a[href]')
        except Exception:
            handles = []
    seen = set()
    for h in handles:
        if out["clicked"] >= max_clicks:
            break
        try:
            label = (h.inner_text() or "").strip()[:48]
        except Exception:
            label = ""
        key = label or f"_h{len(seen)}"
        if key in seen:
            continue
        seen.add(key)
        try:
            h.click(timeout=1500)
            page.wait_for_timeout(180)
            r = page.evaluate(_NAV_CHECK_JS)
        except Exception:
            continue  # could not click (covered/detached) - not a defect
        out["clicked"] += 1
        out["screens"].append({"label": label, "textLen": r.get("textLen"), "els": r.get("els"), "err": bool(r.get("protoError"))})
        if r.get("protoError"):
            out["error_label"] = label
            out["error_detail"] = r.get("protoError")
            break  # error block is sticky; first culprit found, stop
        if (r.get("textLen") or 0) < 40 and (r.get("els") or 0) < 8 and not out["blank_label"]:
            out["blank_label"] = label
    return out


def audit_html(html: str, viewport: int = 1440, height: int = 1000, click_through: bool = False,
               density_max: float | None = None) -> dict:
    """Render `html` in headless Chromium and return a structured defect report.
    Renders WITH the serve-time enforcement CSS so it audits exactly what the user
    sees. click_through=True (set for kind='proto') additionally clicks each nav/interactive
    control and re-checks the mount, so a screen that errors or goes blank ONLY on navigation is
    caught - the gate previously verified the landing screen alone.
    density_max (E3 2026-07-02): when set (e.g. 0.25 for slide/stage audits), an empty-body
    fraction above it counts as a layout_density defect; when None the metric is REPORT-ONLY
    (threshold calibration is the owner-gated U6 item). Returns {available: False, ...}
    if Chromium is unavailable (never raises)."""
    if not html:
        return {"available": False, "reason": "empty html"}
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        return {"available": False, "reason": f"playwright import: {e}"}

    import os, tempfile
    enforce = _enforcement_style()
    doc = html.replace("</head>", enforce + "</head>", 1) if "</head>" in html else enforce + html
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc); tmp.close()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            page = sandboxed_page(browser, viewport={"width": viewport, "height": height}, device_scale_factor=1)
            page.goto("file://" + tmp.name, wait_until="networkidle", timeout=30000)
            try:
                page.wait_for_timeout(350)
            except Exception:
                pass
            # activate every tab panel so hidden content is measured too
            try:
                page.evaluate("() => { document.querySelectorAll('.nxt-tab').forEach(t=>{try{t.click()}catch(e){}}); }")
                page.wait_for_timeout(120)
            except Exception:
                pass
            data = page.evaluate(_QA_JS)
            nav = _probe_nav(page) if click_through else None
            browser.close()
    except Exception as e:
        return {"available": False, "reason": f"render: {e}"}
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass

    if not data:
        return {"available": False, "reason": "no data"}
    asym = data.get("asymmetry") or {}
    # BLANK: after JS, the mount carries essentially no content (React failed to mount,
    # no root component, empty App). A real artifact/prototype has hundreds of chars +
    # many visible nodes; a blank shows ~0 text and a stray icon or two.
    mount_text = data.get("mountTextLen", 0)
    mount_els = data.get("mountEls", 0)
    blank = 1 if (mount_text < 40 and mount_els < 8) else 0
    runtime_error = 1 if data.get("protoError") else 0
    # NAV COVERAGE: a screen that errors/blanks only AFTER navigation (the gate's blind spot).
    nav_runtime_error = 1 if (nav and nav.get("error_label") is not None) else 0
    nav_blank = 1 if (nav and nav.get("blank_label")) else 0
    # LAYOUT DENSITY (E3): empty-body fraction from the DOM-geometry probe. Gated only when the
    # caller supplies density_max; otherwise reported for calibration (owner-gated U6).
    empty_frac = data.get("emptyBodyFrac")
    density_defect = 1 if (density_max is not None and isinstance(empty_frac, (int, float))
                           and empty_frac > density_max) else 0
    defects = {
        "blank": blank,
        "runtime_error": runtime_error,
        "nav_runtime_error": nav_runtime_error,
        "nav_blank": nav_blank,
        "crush": data.get("crushCount", 0),
        "overflow": data.get("overflowCount", 0),
        "overlap": data.get("overlapCount", 0),
        "meter_misuse": len(data.get("meterMisuse", [])),
        "margin_asymmetry": asym.get("delta", 0) if asym else 0,
        "horizontal_scroll": bool(data.get("horizScroll")),
        "layout_density": density_defect,
    }
    passed = (defects["blank"] == 0 and defects["runtime_error"] == 0
              and defects["nav_runtime_error"] == 0 and defects["nav_blank"] == 0
              and defects["crush"] == 0 and defects["overflow"] == 0 and defects["overlap"] == 0
              and defects["meter_misuse"] == 0 and defects["margin_asymmetry"] <= 8
              and not defects["horizontal_scroll"] and defects["layout_density"] == 0)
    return {
        "available": True,
        "passed": passed,
        "defects": defects,
        "detail": {
            "blank": {"mount_text_len": mount_text, "mount_els": mount_els},
            "runtime_error": data.get("protoError"),
            "nav": nav,
            "crush": data.get("crush", []),
            "overflow": data.get("overflow", []),
            "meterMisuse": data.get("meterMisuse", []),
            "asymmetry": asym,
            "clientWidth": data.get("clientWidth"),
            "empty_body_frac": empty_frac,
            "density_max": density_max,
        },
    }
