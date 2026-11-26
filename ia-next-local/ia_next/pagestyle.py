"""The page style IA Next's own HTML artifacts share (the themes page and the journey map), taken from the overview
pages the owner approved on 2026-11-17 as the standard for every IA Next and HiC HTML artifact: a mono kicker over a
plain statement heading, a standfirst, hairline panels, mono labels and quiet captions. Light only: a white page with
dark ink. Every color and font comes from deck.brand_kit's tokens, so the NXT and Northeastern brands both hold.
HiC-made documents get the same standard from HiC's own engine (its mechanism-figure grammar)."""

MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

CSS = """
body{font-family:var(--font-body);margin:0;color:var(--ink);background:#FFFFFF;-webkit-font-smoothing:antialiased}
.page{max-width:1180px;margin:0 auto;padding:32px 24px 56px}
.masthead{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.masthead .k{margin:0}
.brand-mark{height:26px;width:auto;color:var(--ink)}
.hero{padding:36px 0 8px}
.kicker{font:500 12px/1 MONO;letter-spacing:.14em;text-transform:uppercase;color:var(--deep);margin:0 0 12px}
h1{font:600 clamp(30px,4vw,44px)/1.08 var(--font-display);margin:0;max-width:28ch;text-wrap:balance;text-transform:var(--title-transform)}
.standfirst{color:var(--muted);font-size:17px;line-height:1.55;margin:14px 0 0;max-width:70ch}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 24px;margin:24px 0 0;max-width:820px}
.fact{border-top:1px solid var(--line);padding-top:8px;min-width:0}
.fact span{display:block;font:500 11px/1.4 MONO;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.fact strong{font-weight:600;font-size:15px}
.section{margin-top:36px;padding-top:32px;border-top:1px solid var(--line)}
.panel{background:#FFFFFF;border:1px solid var(--line);border-radius:var(--radius);padding:18px}
.k{font:500 11px/1.4 MONO;letter-spacing:.06em;text-transform:uppercase;color:var(--deep)}
.caption{color:var(--muted);font-size:14px;line-height:1.55;margin-top:12px;max-width:80ch}
a{color:var(--deep)}
""".replace("MONO", MONO)
