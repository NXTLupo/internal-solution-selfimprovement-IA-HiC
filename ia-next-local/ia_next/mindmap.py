"""The mind map, drawn in IA Next's own 16:9 frame (owner 2026-11-19: the branch copy must state each theme in full;
the old radial picture held fragments in 200-pixel boxes, so ideas arrived as clipped bullets).

The frame is one 1920x1080 #stage document in the brand's tokens: a statement title, the subject in a hub at the
centre, one card per theme on either side (a plain claim and two or three complete sentences), connectors drawn from
the hub to each card, the takeaway band and the named sources. A fit pass in the page shrinks the type together and,
only when the smallest type still overflows, drops a card's last sentence; a sentence is never cut. The page runs in
the offline renderer, which returns the picture and the page as drawn (scripts removed). That page is also the
editable PowerPoint slide: HiC's exporter reads it into native shapes and text.
"""
import base64
import html

import httpx

from . import config, deck

W, H = 1920, 1080

_CSS = """
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#FFFFFF}
#stage{position:relative;width:1920px;height:1080px;overflow:hidden;background:#FFFFFF;display:grid;
  grid-template-columns:46px 1fr;font-family:var(--font-body);color:var(--ink);--k:1}
.rail{background:var(--rail);position:relative}
.rail .dotmark{position:absolute;left:14px;top:58px;width:18px;height:18px;background:var(--accent)}
.main{display:grid;grid-template-rows:auto auto 1fr auto auto;padding:50px 72px 26px 64px;min-height:0;min-width:0}
.kicker{font:500 15px/1 ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:.16em;
  text-transform:uppercase;color:var(--deep);margin:0 0 16px}
h1{font:600 calc(44px * var(--tk,1))/1.1 var(--font-display);margin:0;color:var(--ink);max-width:1500px;
  text-transform:var(--title-transform)}
.body{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 300px minmax(0,1fr);column-gap:72px;
  min-height:0;margin:30px 0 22px}
.col{display:grid;row-gap:16px;min-height:0;position:relative;z-index:1}
.cell{display:flex;align-items:center;min-height:0}
.card{width:100%;background:#FFFFFF;border:1.5px solid var(--line);border-left:5px solid var(--accent);
  border-radius:3px;padding:calc(14px * var(--k)) 20px}
.card h2{font:600 calc(22px * var(--k))/1.24 var(--font-body);margin:0;color:var(--ink)}
.card ul{list-style:none;margin:calc(8px * var(--k)) 0 0;padding:0;display:grid;row-gap:calc(6px * var(--k))}
.card li{display:grid;grid-template-columns:8px 1fr;column-gap:11px;align-items:start;
  font:400 calc(17.5px * var(--k))/1.38 var(--font-body);color:var(--ink)}
.card li i{display:block;width:7px;height:7px;background:var(--accent);margin-top:calc(9px * var(--k))}
.hubcell{display:flex;align-items:center;justify-content:center;position:relative;z-index:1}
.hub{width:100%;background:var(--rail);color:#FFFFFF;border-radius:4px;padding:26px 24px;text-align:center;
  font:600 calc(27px * var(--hk,1))/1.16 var(--font-display);text-transform:var(--title-transform)}
.links{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible}
.band{display:grid;grid-template-columns:8px 1fr;column-gap:22px;align-items:center;background:var(--rail);
  color:#FFFFFF;border-radius:2px;padding:18px 26px 18px 0;font:400 20px/1.4 var(--font-body)}
.band i{display:block;align-self:stretch;background:var(--accent)}
.foot{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-top:14px;
  font:400 14px/1.3 var(--font-body);color:var(--muted)}
.foot .mm-mark{height:22px;width:auto;color:var(--ink);flex:0 0 auto;display:inline-flex}
.foot .mm-mark svg{height:22px;width:auto}
"""

# Fit, then draw the connectors from the hub's edge to each card's edge. Deterministic: the same words give the same
# page. Leaves data-dropped on #stage with the number of sentences that did not fit (they stay on the diagram page).
_FIT = """
(() => {
  const st = document.getElementById('stage');
  const over = () => Array.from(document.querySelectorAll('.cell')).some(c => c.firstElementChild && c.firstElementChild.offsetHeight > c.clientHeight + 1);
  const t = document.querySelector('h1'); let tk = 1;
  while (t && t.offsetHeight > 2.3 * 44 * 1.1 * tk && tk > 0.72) { tk -= 0.04; st.style.setProperty('--tk', tk); }
  const hub = document.querySelector('.hub'); let hk = 1;
  while (hub && hub.offsetHeight > 330 && hk > 0.7) { hk -= 0.05; st.style.setProperty('--hk', hk); }
  let k = 1;
  while (over() && k > 0.8) { k = Math.round((k - 0.03) * 100) / 100; st.style.setProperty('--k', k); }
  let dropped = 0;
  for (let guard = 0; over() && guard < 40; guard++) {
    let worst = null, most = 0;
    for (const c of document.querySelectorAll('.cell')) {
      const card = c.firstElementChild; if (!card) continue;
      const lis = card.querySelectorAll('li'); const ex = card.offsetHeight - c.clientHeight;
      if (ex > 1 && lis.length > 1 && ex > most) { most = ex; worst = lis[lis.length - 1]; }
    }
    if (!worst) break;
    worst.remove(); dropped++;
  }
  st.setAttribute('data-dropped', String(dropped));
  const body = document.querySelector('.body'), svg = document.querySelector('.links');
  const br = body.getBoundingClientRect(), hr = hub.getBoundingClientRect();
  const ns = 'http://www.w3.org/2000/svg';
  svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
  for (const card of document.querySelectorAll('.card')) {
    const r = card.getBoundingClientRect();
    const left = r.right <= hr.left;
    const x1 = (left ? hr.left : hr.right) - br.left, y1 = hr.top + hr.height / 2 - br.top;
    const x2 = (left ? r.right : r.left) - br.left, y2 = r.top + r.height / 2 - br.top;
    const mx = (x1 + x2) / 2;
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', getComputedStyle(st).getPropertyValue('--muted').trim() || '#6B6B6B');
    p.setAttribute('stroke-width', '2'); svg.appendChild(p);
    const d = document.createElementNS(ns, 'circle');
    d.setAttribute('cx', x2); d.setAttribute('cy', y2); d.setAttribute('r', '5');
    d.setAttribute('fill', getComputedStyle(st).getPropertyValue('--accent').trim() || '#B8B800'); svg.appendChild(d);
  }
})();
"""


def _card(node):
    e = html.escape
    pts = "".join(f"<li><i></i><span>{e(p)}</span></li>" for p in node.get("points") or [])
    return f'<div class="cell"><div class="card"><h2>{e(node["label"])}</h2>{f"<ul>{pts}</ul>" if pts else ""}</div></div>'


def page(spec, brand):
    """The 1920x1080 page for one mind map. spec: {hub, nodes: [{label, points}], title, takeaway, sources}."""
    e = html.escape
    kit = deck.brand_kit(brand)
    nodes = list(spec.get("nodes") or [])[:8]
    half = (len(nodes) + 1) // 2
    left, right = nodes[:half], nodes[half:]
    rows_l, rows_r = max(1, len(left)), max(1, len(right))
    cols = (f'<div class="col" style="grid-template-rows:repeat({rows_l},minmax(0,1fr))">{"".join(_card(n) for n in left)}</div>'
            f'<div class="hubcell"><div class="hub">{e(spec.get("hub") or "")}</div></div>'
            f'<div class="col" style="grid-template-rows:repeat({rows_r},minmax(0,1fr))">{"".join(_card(n) for n in right)}</div>')
    band = f'<div class="band"><i></i><span>{e(spec["takeaway"])}</span></div>' if spec.get("takeaway") else "<div></div>"
    srcs = [s for s in spec.get("sources") or [] if s][:4]
    src_line = (("Source: " if len(srcs) == 1 else "Sources: ") + "; ".join(srcs)) if srcs else ""
    mark = f'<span class="mm-mark">{kit["mark"]}</span>' if kit.get("mark") else f'<span>{e(kit["name"])}</span>'
    return (f'<!doctype html><html lang="en" data-brand="{e(kit["brand"])}"><head><meta charset="utf-8">'
            f'<title>{e(spec.get("title") or "Mind map")}</title><style>{kit["fonts_css"]}\n{kit["css"]}\n{_CSS}</style></head>'
            f'<body><div id="stage"><div class="rail"><div class="dotmark"></div></div><div class="main">'
            f'<p class="kicker">Mind map</p><h1>{e(spec.get("title") or "")}</h1>'
            f'<div class="body"><svg class="links" aria-hidden="true"></svg>{cols}</div>{band}'
            f'<div class="foot"><span>{e(src_line)}</span>{mark}</div></div></div>'
            f'<script>{_FIT}</script></body></html>')


def draw(spec, brand):
    """(png bytes at 2560x1440, the page as drawn for the PowerPoint exporter, sentences dropped by the fit) or raises
    RuntimeError when the renderer cannot draw it."""
    doc = page(spec, brand)
    try:
        r = httpx.post(config.RENDER_URL.rstrip("/") + "/pages", timeout=180,
                       json={"html": doc, "mode": "slides", "selector": "#stage", "width": W, "height": H,
                             "out_width": 2560, "want": ["png", "dom"], "max_pages": 1})
    except httpx.HTTPError as ex:
        raise RuntimeError(f"the renderer could not be reached ({type(ex).__name__})")
    if r.status_code != 200:
        raise RuntimeError(f"the renderer could not draw the mind map (HTTP {r.status_code})")
    d = r.json()
    if not d.get("pages"):
        raise RuntimeError("the renderer returned no picture of the mind map")
    return base64.b64decode(d["pages"][0]), d.get("dom") or "", int(d.get("dropped") or 0)
