"""
flow_capture.py - W1 of plans/browseros-live-capture-2026-07-13.md.

PUBLIC-lane live-flow capture for heuristic analysis: walk a URL flow in the
proxy's headless Chromium (the same Playwright stack the gold exporter uses)
and return one capture per step: viewport PNG (data URI), the step's URL, the
action taken, the page title, and the visible text (citation provenance per
the every-source-real-attribution rule).

This lane is DETERMINISTIC - no LLM interprets the steps (the agentic
natural-language lane is W3, which runs in BrowserOS on the consultant's own
machine, never here). STEP GRAMMAR, one step per line:

    goto <url>
    click "<visible text>"
    fill "<label|placeholder|name>" "<value>"
    press <Enter|Tab|Escape|...>
    scroll
    wait <seconds, max 10>

Blank lines and '# comment' lines are ignored. An unparseable or failing step
ends the session GRACEFULLY with everything captured so far (plan contract:
partial captures are usable artifacts; a broken step never zeroes the run).
"""
from __future__ import annotations

import base64
import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse

logger = logging.getLogger("flow_capture")

VIEWPORT = {"width": 1920, "height": 1080}
STEP_TIMEOUT_MS = 15_000
MAX_SHOTS_CEILING = 12          # plan contract 4: hard cap, runaway flows cannot flood a run
VISIBLE_TEXT_BUDGET = 4_000     # chars of innerText carried as provenance per step

_STEP_RE = {
    "goto": re.compile(r'^goto\s+(\S+)$', re.I),
    "click": re.compile(r'^click\s+"([^"]{1,120})"$', re.I),
    "fill": re.compile(r'^fill\s+"([^"]{1,120})"\s+"([^"]{0,300})"$', re.I),
    "press": re.compile(r'^press\s+([A-Za-z][A-Za-z0-9+]{0,20})$', re.I),
    "scroll": re.compile(r'^scroll$', re.I),
    "wait": re.compile(r'^wait\s+(\d{1,2})$', re.I),
}


def _assert_public_http(url: str) -> None:
    """Only http/https to public hosts. The capture lane must never become an
    SSRF path into the Docker network or the host (localhost, RFC1918, link-local)."""
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        raise ValueError(f"only http/https URLs are capturable (got {p.scheme or 'none'})")
    host = p.hostname or ""
    if not host:
        raise ValueError("URL has no host")
    if host.lower() in ("localhost", "host.docker.internal"):
        raise ValueError("localhost targets are not capturable")
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError as e:
        raise ValueError(f"host does not resolve: {host}") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError(f"host resolves to a non-public address: {host}")


def parse_steps(steps_text: str) -> list[dict]:
    """Parse the step script into typed actions. Raises ValueError naming the
    first bad line so the intake can show exactly what to fix."""
    steps: list[dict] = []
    for lineno, raw in enumerate((steps_text or "").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        for kind, rx in _STEP_RE.items():
            m = rx.match(line)
            if m:
                steps.append({"kind": kind, "args": list(m.groups()), "line": line})
                break
        else:
            raise ValueError(f"line {lineno}: unrecognized step '{line}' "
                             f"(grammar: goto/click/fill/press/scroll/wait)")
    return steps


def capture_flow(start_url: str, steps_text: str = "", max_shots: int = MAX_SHOTS_CEILING) -> dict:
    """Walk the flow and capture. Returns {"captures": [...], "stopped": str|None}.
    Each capture: {step, action, url, title, png (data URI), visibleText}."""
    from playwright.sync_api import sync_playwright

    _assert_public_http(start_url)
    steps = parse_steps(steps_text)
    max_shots = max(1, min(int(max_shots or MAX_SHOTS_CEILING), MAX_SHOTS_CEILING))

    captures: list[dict] = []
    stopped: str | None = None

    def shoot(page, action: str) -> None:
        png = page.screenshot(type="png")
        text = ""
        try:
            text = page.evaluate("() => document.body ? document.body.innerText : ''") or ""
        except Exception:
            pass
        captures.append({
            "step": len(captures) + 1,
            "action": action,
            "url": page.url,
            "title": (page.title() or "")[:200],
            "png": "data:image/png;base64," + base64.b64encode(png).decode(),
            "visibleText": " ".join(text.split())[:VISIBLE_TEXT_BUDGET],
        })

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
            page = ctx.new_page()
            page.set_default_timeout(STEP_TIMEOUT_MS)
            page.goto(start_url, wait_until="domcontentloaded")
            page.wait_for_timeout(1200)  # settle fonts/late paints
            shoot(page, f"loaded {start_url}")

            for st in steps:
                if len(captures) >= max_shots:
                    stopped = f"capture cap reached ({max_shots})"
                    break
                kind, args = st["kind"], st["args"]
                try:
                    if kind == "goto":
                        _assert_public_http(args[0])
                        page.goto(args[0], wait_until="domcontentloaded")
                    elif kind == "click":
                        page.get_by_text(args[0], exact=False).first.click()
                        page.wait_for_load_state("domcontentloaded")
                    elif kind == "fill":
                        target, value = args[0], args[1]
                        loc = page.get_by_label(target, exact=False)
                        if loc.count() == 0:
                            loc = page.get_by_placeholder(target, exact=False)
                        if loc.count() == 0:
                            loc = page.locator(f'[name="{target}"]')
                        loc.first.fill(value)
                    elif kind == "press":
                        page.keyboard.press(args[0])
                        page.wait_for_load_state("domcontentloaded")
                    elif kind == "scroll":
                        page.mouse.wheel(0, VIEWPORT["height"])
                    elif kind == "wait":
                        page.wait_for_timeout(min(int(args[0]), 10) * 1000)
                    page.wait_for_timeout(800)
                    shoot(page, st["line"])
                except Exception as e:
                    stopped = f"step '{st['line']}' failed: {str(e).splitlines()[0][:160]}"
                    logger.warning(f"[flow-capture] {stopped}")
                    break
        finally:
            browser.close()

    return {"captures": captures, "stopped": stopped}
