"""Screenshots of a prototype's screens, for IA Next's design review (plan Part 8, P5).

A prototype is model-written code. It runs here, not in IA Next: this container holds no API keys, no data volume
and no route to the internet (it sits only on an internal Docker network shared with IA Next, and publishes no host
port). Inside the page every request other than data: and blob: is refused, so the page reaches nothing.

POST /shots {html, screens: [name, ...], width?, height?}
  -> {shots: [{screen, png}], unreachable: [name, ...]}   (png is base64)
A screen is reached by clicking the control whose visible text is its name (exact first, then containing it).
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


@app.post("/shots")
def shots(r: ShotRequest):
    if not r.html or len(r.html) > MAX_HTML:
        raise HTTPException(400, "send one HTML document under 2 MB")
    from playwright.sync_api import sync_playwright
    out, unreachable = [], []
    w, h = max(800, min(r.width, 1920)), max(600, min(r.height, 1200))
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            ctx = browser.new_context(viewport={"width": w, "height": h}, offline=True, service_workers="block")
            ctx.route("**/*", _allow)
            page = ctx.new_page()
            page.set_content(r.html, wait_until="load", timeout=20_000)
            page.wait_for_timeout(1_000)              # first-run skeletons and entrance motion settle
            out.append({"screen": "first view", "png": base64.b64encode(page.screenshot(type="png")).decode("ascii")})
            for name in [s for s in r.screens if str(s).strip()][:MAX_SCREENS]:
                try:
                    ctl = _control(page, str(name).strip())
                    if ctl is None:
                        unreachable.append(name)
                        continue
                    ctl.click(timeout=3_000)
                    page.wait_for_timeout(900)
                    out.append({"screen": name, "png": base64.b64encode(page.screenshot(type="png")).decode("ascii")})
                except Exception:
                    unreachable.append(name)
        finally:
            browser.close()
    return {"shots": out, "unreachable": unreachable}
