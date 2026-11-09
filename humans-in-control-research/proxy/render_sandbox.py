"""render_sandbox.py - 2026-10-30 (plan harness-capability-curve-uplift, WS-0 S3)

ONE place that decides what a headless Chromium page may fetch while the proxy
renders model-generated HTML (layout measurement, slide and diagram rendering, the
PPTX exporter, the prototype render gate).

Before this module every render site called `browser.new_page()` with the network
wide open, so a slide or prototype written by the model (or lifted from a poisoned
corpus) could make the proxy's browser fetch any URL: an exfiltration channel and an
SSRF path into the Docker network. The renders only need:
  - the page itself (file:// temp file, data:, blob:, about:blank);
  - the two Google Fonts hosts the stage HTML links (fonts.googleapis.com,
    fonts.gstatic.com), so measured geometry matches the browser;
  - the proxy's own origins, for images the stage HTML references by proxy URL
    (those requests carry the shared proxy token since 2026-10-31, see `proxy_token`).
Everything else is aborted. Blocked requests are counted on the page object
(`page._hic_blocked`) so callers can log them.

`--no-sandbox` stays on the launch line where it already was: the container runs
Chromium as root without user namespaces. That flag is about the OS sandbox; this
module is about the network boundary.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Iterable, Optional
from urllib.parse import urlparse

logger = logging.getLogger("render-sandbox")

ALLOWED_SCHEMES = {"file", "data", "blob", "about", "chrome-error"}
ALLOWED_HOSTS = {"fonts.googleapis.com", "fonts.gstatic.com"}
PROXY_HOSTS = {"127.0.0.1:5012", "localhost:5012", "research-proxy:5012"}


def request_allowed(url: str, extra_hosts: Optional[Iterable[str]] = None) -> bool:
    try:
        p = urlparse(url)
    except Exception:
        return False
    if p.scheme in ALLOWED_SCHEMES:
        return True
    if p.scheme not in ("http", "https"):
        return False
    host = (p.hostname or "").lower()
    hostport = f"{host}:{p.port}" if p.port else host
    if host in ALLOWED_HOSTS:
        return True
    if hostport in PROXY_HOSTS:
        return True
    if extra_hosts and (host in extra_hosts or hostport in extra_hosts):
        return True
    return False


def proxy_token() -> str:
    """The shared proxy token (auth is on by default since WS-0). Rendered slides fetch design assets, logos
    and exhibit images from the proxy's /api/* routes; without the token every such request returned 401 and
    the screenshot the vision critic judged had blank logo and image slots (2026-10-31 live UI test). Read
    from PROXY_AUTH_TOKEN, else from the runtime config the proxy publishes."""
    tok = os.environ.get("PROXY_AUTH_TOKEN", "").strip()
    if tok:
        return tok
    for base in ("/hic-workspace", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "hic-workspace")):
        try:
            with open(os.path.join(base, ".runtime", "config.json"), "r", encoding="utf-8") as f:
                tok = str((json.load(f) or {}).get("proxyToken") or "")
            if tok:
                return tok
        except Exception:
            continue
    return ""


def _is_proxy_url(url: str) -> bool:
    try:
        p = urlparse(url)
    except Exception:
        return False
    host = (p.hostname or "").lower()
    hostport = f"{host}:{p.port}" if p.port else host
    return hostport in PROXY_HOSTS


def sandboxed_page(browser: Any, extra_hosts: Optional[Iterable[str]] = None, **page_kwargs: Any) -> Any:
    """Create a page whose every request passes `request_allowed`. Drop-in for
    `browser.new_page(**kwargs)` (sync Playwright API). Requests to the proxy itself carry the shared
    auth token so asset and exhibit fetches render in the screenshot."""
    page = browser.new_page(**page_kwargs)
    blocked: list[str] = []
    setattr(page, "_hic_blocked", blocked)
    allow = set(extra_hosts or ())
    tok = proxy_token()

    def _route(route: Any, request: Any) -> None:
        url = request.url
        if request_allowed(url, allow):
            if tok and _is_proxy_url(url):
                try:
                    headers = dict(getattr(request, "headers", {}) or {})
                    headers["x-proxy-token"] = tok
                    route.continue_(headers=headers)
                    return
                except TypeError:
                    pass   # a stub route without the keyword (tests)
            route.continue_()
            return
        blocked.append(url)
        if len(blocked) <= 5:
            logger.warning(f"[render-sandbox] blocked {request.resource_type} request to {url[:160]}")
        route.abort("blockedbyclient")

    page.route("**/*", _route)
    return page
