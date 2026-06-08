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

  return {
    clientWidth: iw,
    horizScroll: document.documentElement.scrollWidth > iw+2,
    crush: crush.slice(0,12), crushCount: crush.length,
    overflow: overflow.slice(0,12), overflowCount: overflow.length,
    asymmetry, meterMisuse: meter, overlapCount: overlap,
  };
}
"""


def _enforcement_style() -> str:
    try:
        import nxt_design_system as _nds
        return "<style id='nxt-qa-enforce'>" + _nds._NXT_GRID_CSS_BODY + "</style>"
    except Exception:
        return ""


def audit_html(html: str, viewport: int = 1440, height: int = 1000) -> dict:
    """Render `html` in headless Chromium and return a structured defect report.
    Renders WITH the serve-time enforcement CSS so it audits exactly what the user
    sees. Returns {available: False, ...} if Chromium is unavailable (never raises)."""
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
            page = browser.new_page(viewport={"width": viewport, "height": height}, device_scale_factor=1)
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
    defects = {
        "crush": data.get("crushCount", 0),
        "overflow": data.get("overflowCount", 0),
        "overlap": data.get("overlapCount", 0),
        "meter_misuse": len(data.get("meterMisuse", [])),
        "margin_asymmetry": asym.get("delta", 0) if asym else 0,
        "horizontal_scroll": bool(data.get("horizScroll")),
    }
    passed = (defects["crush"] == 0 and defects["overflow"] == 0 and defects["overlap"] == 0
              and defects["meter_misuse"] == 0 and defects["margin_asymmetry"] <= 8
              and not defects["horizontal_scroll"])
    return {
        "available": True,
        "passed": passed,
        "defects": defects,
        "detail": {
            "crush": data.get("crush", []),
            "overflow": data.get("overflow", []),
            "meterMisuse": data.get("meterMisuse", []),
            "asymmetry": asym,
            "clientWidth": data.get("clientWidth"),
        },
    }
