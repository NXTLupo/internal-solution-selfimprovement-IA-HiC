"""The reader: a real browser for pages a plain fetch cannot read (owner, 26 Nov: deep research past doorway pages).

Some pages build their text with JavaScript, or sit behind a cookie, age or disclaimer gate, so a plain fetch gets an
empty shell or the gate. This container opens such a page in Chromium, clicks the gate's accept button the way a
person would, lets the page finish loading, and returns the page as rendered. It does not scroll: a site that appends
its next story as the reader scrolls would hand back the next story instead of this one. IA Next
then reads the main text from it as from any page.

What it does not do: it does not solve or evade bot checks or CAPTCHAs; a page that shows one is reported as such. It
sends Chromium's own headless user agent. It holds no keys and no data (no volume), publishes no host port, and is
reached only by IA Next on its own Docker network. Each page gets a fresh browser context (no cookies kept).

A page it opens is untrusted: every request the page makes to a private, loopback or link-local address, or to a
single-label name such as another container's, is refused, so a page cannot reach IA Next or anything else on the
machine's networks through this browser.

POST /read {url, wait_ms?} -> {ok, url, status, title, html, clicked: [label], reason}
"""
import asyncio
import ipaddress
import re
import socket
from urllib.parse import urlsplit

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="IA Next reader")
_STATE = {"browser": None, "pw": None}
_SEM = asyncio.Semaphore(4)
GATE_TEXTS = ["Accept all", "Accept All", "Accept all cookies", "Accept cookies", "Accept", "I agree", "I Agree", "Agree",
              "Allow all", "Allow all cookies", "Got it", "OK", "Continue", "Continue to site", "I understand", "Yes, I am over 18",
              "I am over 18", "Enter site", "Proceed"]
GATE_SELECTORS = ["#onetrust-accept-btn-handler", "button#accept-cookies", ".fc-cta-consent", "#didomi-notice-agree-button",
                  "button[aria-label='Accept all']", "button[aria-label='Accept cookies']", "[data-testid='accept-button']",
                  ".cc-allow", ".qc-cmp2-summary-buttons button[mode='primary']"]
CHALLENGE = re.compile(r"(?i)(verify you are human|are you a robot|captcha|checking your browser|just a moment\.\.\.|attention required|"
                       r"unusual traffic|access denied|robot challenge|checking the site connection|ddos protection|security check)")


_PUBLIC = {}


async def public_host(host):
    """True when every address the name resolves to is a public internet address (cached per name)."""
    host = (host or "").strip("[]").lower()
    if not host or "." not in host and ":" not in host or host == "localhost" or host.endswith((".internal", ".local", ".localhost")):
        return False
    if host in _PUBLIC:
        return _PUBLIC[host]
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
        ips = {ipaddress.ip_address(i[4][0].split("%")[0]) for i in infos}
        ok = bool(ips) and all(ip.is_global for ip in ips)
    except Exception:
        ok = False
    if len(_PUBLIC) > 5000:
        _PUBLIC.clear()
    _PUBLIC[host] = ok
    return ok


class ReadRequest(BaseModel):
    url: str
    wait_ms: int = 2500


async def _browser():
    if _STATE["browser"] is None:
        from playwright.async_api import async_playwright
        _STATE["pw"] = await async_playwright().start()
        _STATE["browser"] = await _STATE["pw"].chromium.launch(args=["--disable-dev-shm-usage"])
    return _STATE["browser"]


@app.get("/health")
def health():
    return {"status": "healthy", "service": "ia-next-local-reader"}


async def _click_gates(page):
    clicked = []
    for sel in GATE_SELECTORS:
        try:
            el = page.locator(sel).first
            if await el.count() and await el.is_visible():
                await el.click(timeout=1500)
                clicked.append(sel)
                return clicked
        except Exception:
            pass
    for label in GATE_TEXTS:
        try:
            el = page.get_by_role("button", name=label, exact=True).first
            if await el.count() and await el.is_visible():
                await el.click(timeout=1500)
                clicked.append(label)
                return clicked
        except Exception:
            pass
    return clicked


@app.post("/read")
async def read(req: ReadRequest):
    url = req.url.strip()
    if not re.match(r"(?i)^https?://", url):
        return {"ok": False, "url": url, "status": 0, "title": "", "html": "", "clicked": [], "reason": "not a web address"}
    if not await public_host(urlsplit(url).hostname):
        return {"ok": False, "url": url, "status": 0, "title": "", "html": "", "clicked": [], "reason": "not a public web address"}
    async with _SEM:
        browser = await _browser()
        ctx = await browser.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=False, java_script_enabled=True)
        page = await ctx.new_page()

        async def block(route):                   # pictures, media and fonts are not needed; private addresses never
            req = route.request
            if req.resource_type in ("image", "media", "font"):
                await route.abort()
            elif not req.url.startswith(("http://", "https://")) and not req.url.startswith(("data:", "blob:")):
                await route.abort()
            elif req.url.startswith(("http://", "https://")) and not await public_host(urlsplit(req.url).hostname):
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", block)
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            status = resp.status if resp else 0
            ctype = (resp.headers.get("content-type", "") if resp else "").lower()
            if "pdf" in ctype:
                return {"ok": False, "url": page.url, "status": status, "title": "", "html": "", "clicked": [], "reason": "pdf"}
            await page.wait_for_timeout(min(max(req.wait_ms, 500), 6000))
            clicked = await _click_gates(page)
            if clicked:
                try:
                    await page.wait_for_load_state("networkidle", timeout=5000)
                except Exception:
                    pass
            # no scrolling: sites that append the next story as you scroll would hand back the next story
            html = await page.content()
            title = await page.title()
            body = await page.inner_text("body") if await page.locator("body").count() else ""
            if CHALLENGE.search((title or "") + " " + (body or "")[:1500]) and len(body or "") < 6000:
                return {"ok": False, "url": page.url, "status": status, "title": title, "html": "", "clicked": clicked,
                        "reason": "the site showed a bot check; the reader does not get past those"}
            return {"ok": status < 400 and bool(body.strip()), "url": page.url, "status": status, "title": title, "html": html[:8_000_000],
                    "clicked": clicked, "reason": "" if status < 400 else f"the site answered {status}"}
        except Exception as e:
            return {"ok": False, "url": url, "status": 0, "title": "", "html": "", "clicked": [], "reason": f"the page did not load ({type(e).__name__})"}
        finally:
            await ctx.close()
