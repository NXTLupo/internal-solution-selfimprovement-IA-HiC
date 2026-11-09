"""
Rebuild proxy/_ds_payload.json, the design-system payload proxy/nxt_design_system.py injects into every NXT artifact
(component CSS, behavior JS, icon sprite).

2026-10-05: the payload was missing from the checkout (never tracked). nxt_design_system swallowed the load error, so
every NXT engine artifact (Designer #persona/#gap/#case-study/#recommendations, HTML deliverables) shipped with an
EMPTY <style id="nxt-system"> and rendered unstyled with a giant logo. The sources are the published gallery files:

    public/nxt-design-gallery/nxt-artifact-system.css   -> "css"
    public/nxt-design-gallery/nxt-artifact-system.js    -> "js"     (tabs and other interactive modules)
    public/nxt-design-gallery/icon-sprite.html           -> "sprite" (the <svg> block of <symbol id="i-...">)

Run:  python scripts/build-ds-payload.py   then restart research-proxy (the module reads the file at import).
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GALLERY = os.path.join(ROOT, "public", "nxt-design-gallery")
OUT = os.path.join(ROOT, "proxy", "_ds_payload.json")


def read(name: str) -> str:
    path = os.path.join(GALLERY, name)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def main() -> int:
    css = read("nxt-artifact-system.css")
    js = read("nxt-artifact-system.js") if os.path.exists(os.path.join(GALLERY, "nxt-artifact-system.js")) else ""
    sprite_html = read("icon-sprite.html")
    m = re.search(r"<svg[^>]*>\s*(?:<defs>)?\s*<symbol[\s\S]*?</svg>", sprite_html)
    sprite = m.group(0) if m else ""
    if not css.strip():
        print("nxt-artifact-system.css is empty; refusing to write an empty payload", file=sys.stderr)
        return 1
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"css": css, "js": js, "sprite": sprite}, f, ensure_ascii=False)
    print(f"wrote {OUT}: css={len(css)} js={len(js)} sprite={len(sprite)} symbols={sprite.count('<symbol')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
