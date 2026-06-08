#!/usr/bin/env python
"""Shared GOLD furniture, extracted verbatim from the user's hand-authored gold slides
(01-13). Emits the canonical NU 1920x1080 stage: navy rail, red 3x3 dot mark, NORTHEASTERN
wordmark, IBM Plex Mono kicker, Lora h1, dark Lora takeaway band, fit-to-viewport script.
Authoring the 14 MISSING gold exemplars through this kit keeps them pixel-consistent with
the user's set AND make_nxt-compatible (same var names, fonts, NORTHEASTERN wordmark). This
is also the prototype of the unified htmlComposer (render-pipeline-unification plan)."""

FONT_LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
             '<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400'
             '&family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">')

FURNITURE = """
:root{
  --navy:#0E1626; --ink:#16233C; --red:#D41B2C; --teal:#1D6E64;
  --paper:#FFFFFF; --ecru:#EFEDE5; --ecru2:#E7E4DA; --pink:#FBEDEE;
  --grey:#7C828D; --hair:#D9D5CA;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#0B0F17;overflow:hidden}
#stage{position:absolute;width:1920px;height:1080px;background:var(--paper);transform-origin:top left;font-family:'Archivo',sans-serif;color:var(--ink)}
.rail{position:absolute;left:0;top:0;width:92px;height:100%;background:var(--navy)}
.canvas{position:absolute;left:92px;top:0;right:0;bottom:0;padding:54px 88px 44px 80px}
.brand{position:absolute;top:56px;right:88px;font-family:'IBM Plex Mono',monospace;font-size:17px;letter-spacing:8px;color:var(--ink)}
.kicker{font-family:'IBM Plex Mono',monospace;font-size:19px;font-weight:600;letter-spacing:6px;color:var(--red)}
h1{font-family:'Lora',serif;font-weight:500;font-size:54px;line-height:1.1;color:var(--ink);margin:18px 0 30px}
.takeaway{position:absolute;left:172px;right:88px;bottom:38px;background:var(--ink);color:#F3EFE5;font-family:'Lora',serif;font-size:23.5px;line-height:1.45;padding:26px 44px}
.takeaway b{color:#fff;font-weight:600}
.dots{position:absolute;left:30px;bottom:42px;width:54px;height:54px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;z-index:5}
.dots i{background:var(--red);width:12px;height:12px}
"""

FIT = ("<script>\nfunction fit(){var s=Math.min(innerWidth/1920,innerHeight/1080),e=document.getElementById('stage');\n"
       "e.style.transform='scale('+s+')';e.style.left=((innerWidth-1920*s)/2)+'px';e.style.top=((innerHeight-1080*s)/2)+'px';}\n"
       "addEventListener('resize',fit);fit();\n</script>")

DOTS = '<div class="dots">' + '<i></i>' * 9 + '</div>'


def page(title, kicker, h1, body, takeaway, extra_css=""):
    """Assemble a full canonical NU gold slide. `body` is the canvas content under the h1;
    `takeaway` is the dark bottom band text (may contain <b>...</b>)."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
{FONT_LINK}
<style>{FURNITURE}{extra_css}</style>
</head>
<body>
<div id="stage">
  <div class="rail"></div>
  {DOTS}
  <div class="brand">NORTHEASTERN</div>
  <div class="canvas">
    <div class="kicker">{kicker}</div>
    <h1>{h1}</h1>
{body}
  </div>
  <div class="takeaway">{takeaway}</div>
</div>
{FIT}
</body>
</html>"""
