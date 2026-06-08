"""Shared slide-twin kit for HiC gold-standard exemplars.
Brand furniture (rail + 3x3 dot mark + wordmark + insight band + accent rotation),
title/closing frames, and the .nxt-slide document shell built from the REAL design
system (nxt-artifact-system.css + class=nxt-nu). Deliverable builders import this and
add only their deliverable-specific body layout. PPTX is rendered 1:1 by
proxy/nxt_slide_export.py. Same vein as the approved journey twins.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "hic-workspace", "wiki", "eval", "exemplars")
os.makedirs(OUT, exist_ok=True)
CSS_SYSTEM = open(os.path.join(ROOT, "public", "nxt-design-gallery", "nxt-artifact-system.css"), encoding="utf-8").read()

# PURPOSEFUL COLOR (2026-06-04), not alternating. Semantic roles, brand-aware via
# vars defined in FURNITURE: --struct (neutral identity/structure), --pain (problems,
# frustrations, the wall), --need (needs, fixes, opportunities, the positive move).
# Figures/structure use --struct by default; a deliverable opts a column into --pain
# or --need where the MEANING calls for it. No rotation.
ACCENTS = ["var(--struct)"] * 6  # default: neutral structural ink, identical per item
PAIN = "var(--pain)"
NEED = "var(--need)"
STRUCT = "var(--struct)"

BRAND = "nu"  # set via set_brand(); 'nu' = Northeastern, 'nxt' = NXT Humans
_WORDMARK = {"nu": "NORTHEASTERN", "nxt": "NXT HUMANS"}


def set_brand(b):
    global BRAND
    BRAND = b if b in _WORDMARK else "nu"

# brand furniture shared by every deliverable twin
FURNITURE = """
.nxt-slide{margin:0 auto 28px;padding:48px 56px 40px 116px;justify-content:flex-start;}
.nxt-slide--title,.nxt-slide--closing,.nxt-slide--divider{padding-left:116px;}
/* PURPOSEFUL COLOR TOKENS (semantic, brand-aware). --struct neutral identity,
   --pain problems/frustrations, --need needs/fixes/opportunities. */
.nxt-slide{--struct:#141414;--pain:#CC6644;--need:#115054;}
.nxt-nu .nxt-slide{--struct:#0B1326;--pain:#C8102E;--need:#115054;}
/* brand furniture: NXT defaults (near-black rail, chartreuse dots); .nxt-nu overrides to NU */
.rail{position:absolute;left:0;top:0;bottom:0;width:76px;background:#141414;}
.nxt-nu .rail{background:#0B1326;}
.dots{position:absolute;left:26px;bottom:34px;display:grid;grid-template-columns:repeat(3,7px);grid-auto-rows:7px;gap:5px;}
.dots span{width:7px;height:7px;background:#CACA20;}
.nxt-nu .dots span{background:#C8102E;}
.wordmark{position:absolute;top:30px;right:48px;width:260px;text-align:right;white-space:nowrap;font-family:var(--nxt-mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;}
.wordmark--ink{color:var(--nxt-ink);} .wordmark--white{color:#fff;}
.ov-title{font-size:36px!important;line-height:1.05!important;margin:4px 0 8px!important;}
/* convergent insight / so-what band */
.insight{margin-top:18px;background:var(--nxt-lime-tint);border-left:3px solid var(--nxt-teal);padding:14px 20px;}
.insight__l{font-family:var(--nxt-mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--nxt-teal);font-weight:600;display:block;margin-bottom:6px;}
.insight__t{display:block;font-size:13px;line-height:1.5;color:var(--nxt-ink);font-weight:300;}
/* overview columns: no boxes, light-gray hairline between items, big accent figure */
.cols{display:grid;grid-auto-flow:row;overflow:visible;gap:0;margin-top:8px;}
.col{padding:2px 20px 14px;border:0;background:transparent;}
.col:first-child{padding-left:0;}
.col:not(:first-child){border-left:1px solid var(--nxt-line);}
.col-fig{font-family:var(--nxt-display);font-size:34px;line-height:1;color:var(--acc);margin:10px 0 2px;}
.col-eyebrow2{font-family:var(--nxt-mono);font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--nxt-muted);}
.col-name{font-family:var(--nxt-display);font-weight:600;font-size:14px;line-height:1.18;color:var(--nxt-ink);margin:5px 0 12px;min-height:34px;}
.k{font-family:var(--nxt-mono);font-size:8px;letter-spacing:.07em;text-transform:uppercase;color:var(--acc);font-weight:600;display:block;margin-bottom:3px;}
.t{display:block;font-size:10px;line-height:1.4;color:var(--nxt-ink);margin-bottom:11px;}
.q{display:block;font-family:var(--nxt-display);font-style:italic;font-size:10px;line-height:1.35;color:var(--nxt-ink-2);}
.qsrc{display:block;font-family:var(--nxt-mono);font-style:normal;font-size:7.5px;letter-spacing:.04em;color:var(--acc);margin-top:4px;font-weight:600;}
.chiprow .chip{display:inline-block;font-family:var(--nxt-mono);font-size:8px;letter-spacing:.06em;text-transform:uppercase;color:var(--acc);border:1px solid var(--nxt-line);padding:4px 8px;margin-top:4px;}
/* detail slide: two-pane grid + cards */
.dgrid{display:grid;grid-template-columns:1.1fr 0.9fr;gap:22px;margin-top:14px;}
.dpair{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.drail{display:grid;gap:13px;align-content:start;}
.card{background:var(--nxt-white);border:1px solid var(--nxt-line);padding:16px 18px;}
.card--accent{border-left:3px solid var(--acc);}
.card--teal{border-left:3px solid var(--nxt-teal);}
.lab{font-family:var(--nxt-mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin:0 0 10px;}
.lab2{font-family:var(--nxt-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--nxt-muted);margin:0 0 8px;}
.sev{font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.05em;color:var(--acc);font-weight:600;display:block;margin-bottom:7px;}
.bodytext{display:block;font-size:12px;line-height:1.45;color:var(--nxt-ink);font-weight:300;margin-bottom:12px;}
.bq{display:block;border-left:2px solid var(--acc);padding-left:12px;}
.bq__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:14px;line-height:1.35;color:var(--nxt-ink-2);}
.bq__src{display:block;font-family:var(--nxt-mono);font-style:normal;font-size:9px;letter-spacing:.05em;color:var(--acc);margin-top:7px;font-weight:600;}
.bul{list-style:none;margin:0;padding:0;}
.bul li{position:relative;padding:0 0 8px 14px;font-size:11.5px;line-height:1.4;color:var(--nxt-ink);font-weight:300;}
.bul li::before{content:"";position:absolute;left:0;top:8px;width:6px;height:1px;background:var(--acc);}
.chip{display:inline-block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.04em;text-transform:uppercase;background:var(--nxt-paper);border:1px solid var(--nxt-line);color:var(--nxt-ink);padding:4px 8px;margin:0 5px 6px 0;}
.tag{font-family:var(--nxt-mono);font-size:8.5px;letter-spacing:.05em;color:var(--nxt-teal);font-weight:600;display:block;margin-top:9px;}
.dfig{font-family:var(--nxt-display);font-size:64px;line-height:.9;color:var(--acc);}
/* ---- CLEAN HOUSE STYLE (2026-06-04): large, human, no metadata labels ---- */
.col-fig{font-size:40px;}
.ov-name{font-family:var(--nxt-display);font-weight:600;font-size:18px;line-height:1.2;color:var(--nxt-ink);margin:8px 0 3px;min-height:46px;}
.ov-sub{font-family:var(--nxt-mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--nxt-muted);margin-bottom:12px;}
.ov-desc{display:block;font-size:14px;line-height:1.55;color:var(--nxt-ink);font-weight:300;margin-bottom:16px;}
.ov-q{display:block;border-left:2px solid var(--acc);padding-left:12px;margin-bottom:12px;}
.ov-q__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:14px;line-height:1.4;color:var(--nxt-ink-2);}
.ov-q__s{display:block;font-family:var(--nxt-mono);font-style:normal;font-size:9px;letter-spacing:.04em;color:var(--acc);margin-top:6px;font-weight:600;}
.band{margin-top:24px;border-left:3px solid var(--nxt-teal);padding:6px 0 6px 20px;}
.band span{display:block;font-family:var(--nxt-display);font-style:italic;font-size:17px;line-height:1.45;color:var(--nxt-ink);}
.dt-grid{display:grid;grid-template-columns:1.05fr 0.95fr;gap:48px;margin-top:24px;align-items:start;}
.dt-lead{font-size:18px;line-height:1.62;color:var(--nxt-ink);font-weight:300;}
.dt-q{display:block;border-left:3px solid var(--acc);padding-left:18px;margin-bottom:22px;}
.dt-q__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:21px;line-height:1.36;color:var(--nxt-ink-2);}
.dt-q__s{display:block;font-family:var(--nxt-mono);font-size:10px;letter-spacing:.05em;color:var(--acc);margin-top:9px;font-weight:600;}
.dt-close{margin-top:30px;border-left:3px solid var(--need);padding:4px 0 4px 18px;font-family:var(--nxt-display);font-style:italic;font-size:18px;line-height:1.5;color:var(--need);max-width:82ch;}
/* ---- HIGH-CONTRAST GRAPHITE HIGHLIGHTS (2026-06-04): anchor key content in dark
   tiles with white text, both brands; accent (var(--nxt-lime)) = red on NU,
   chartreuse on NXT. The exporter reliably renders filled boxes >4px. ---- */
.gt{background:#23262E;padding:18px 20px;}
.gt-h{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--nxt-lime);font-weight:600;margin:0 0 10px;white-space:nowrap;}
.gt-b{display:block;font-size:13.5px;line-height:1.5;color:#FFFFFF;font-weight:300;}
.gt-q{display:block;font-family:var(--nxt-display);font-style:italic;font-size:15px;line-height:1.42;color:#FFFFFF;}
.gt-s{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.04em;color:var(--nxt-lime);margin-top:8px;font-weight:600;}
.gt-list{list-style:none;margin:0;padding:0;}
.gt-list li{position:relative;padding:0 0 8px 14px;font-size:13px;line-height:1.45;color:#FFFFFF;font-weight:300;}
.gt-list li:last-child{padding-bottom:0;}
.gt-list li::before{content:"";position:absolute;left:0;top:9px;width:6px;height:1px;background:var(--nxt-lime);}
.gband{margin-top:22px;background:#23262E;padding:16px 24px;}
.gband__h{display:block;font-family:var(--nxt-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--nxt-lime);font-weight:600;margin-bottom:7px;white-space:nowrap;}
.gband span,.gband__t{display:block;font-family:var(--nxt-display);font-style:italic;font-size:16px;line-height:1.45;color:#FFFFFF;}
"""


def gtile_q(quote, src):
    """A graphite pull-quote tile (white text)."""
    return f'<div class="gt"><span class="gt-q">&ldquo;{quote}&rdquo;</span><span class="gt-s">Source: {src}</span></div>'


def gband(text, label=None):
    h = f'<span class="gband__h">{label}</span>' if label else ""
    return f'<div class="gband">{h}<span class="gband__t">{text}</span></div>'

DOTS = '<div class="dots">' + "".join("<span></span>" for _ in range(9)) + "</div>"


def rail():
    return f'<div class="rail"></div>{DOTS}'


def wordmark(tone="ink"):
    return f'<span class="wordmark wordmark--{tone}">{_WORDMARK[BRAND]}</span>'


def insight(label, text):
    return f'<div class="insight"><span class="insight__l">{label}</span><span class="insight__t">{text}</span></div>'


def frame_title(kicker, title, body):
    return f"""<section class="nxt-slide nxt-slide--title">{rail()}{wordmark('white')}
  <p class="nxt-slide__kicker">{kicker}</p>
  <h2 class="nxt-slide__title">{title}</h2>
  <p class="nxt-slide__body">{body}</p>
</section>"""


def frame_divider(kicker, title):
    return f"""<section class="nxt-slide nxt-slide--divider">{rail()}{wordmark('white')}
  <p class="nxt-slide__kicker">{kicker}</p>
  <h2 class="nxt-slide__title">{title}</h2>
</section>"""


def frame_closing(kicker, title, body):
    return f"""<section class="nxt-slide nxt-slide--closing">{rail()}{wordmark('white')}
  <p class="nxt-slide__kicker">{kicker}</p>
  <h2 class="nxt-slide__title">{title}</h2>
  <p class="nxt-slide__body">{body}</p>
</section>"""


def doc(frames, extra_css="", brand=None):
    brand = brand or BRAND
    body_cls = "nxt-nu" if brand == "nu" else ""  # default (no class) = NXT stark-white brand
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>HiC slide twin</title>
<style>{CSS_SYSTEM}</style><style>{FURNITURE}{extra_css}</style>
</head><body class="{body_cls}" style="background:#fff;padding:24px;">
{frames}
</body></html>"""


def write(name, html):
    p = os.path.join(OUT, name)
    open(p, "w", encoding="utf-8").write(html)
    return p
