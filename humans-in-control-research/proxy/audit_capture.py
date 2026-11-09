# audit_capture.py
#
# 2026-07-05 - Heuristic-audit uplift Phase 0 (plans/heuristic-audit-live-prototype-uplift-2026-07-05.md).
# Deterministic ground-truth capture for the UX/accessibility audit pipeline: multi-viewport
# Playwright screenshots + axe-core WCAG scan + ARIA snapshot + CDP timing metrics.
#
# Design contract (from the plan + .claude/CLAUDE.md evidence rules):
#   - axe-core is VENDORED (vendor/axe.min.js, pinned 4.10.3) - no CDN fetch at runtime.
#   - The browser context is created with bypass_csp=True so the axe script injection
#     cannot be blocked by the audited site's Content-Security-Policy. This is the
#     documented Playwright mechanism (context-level CSP bypass), verified against real
#     sites in the Phase-0 gate before anything builds on it.
#   - BOTH axe `violations` AND `incomplete` are returned: the incomplete set is exactly
#     what the analysis engine flags `needs_manual_review=true` (never silently dropped).
#   - Screenshots are JPEG (quality 80) capped to MAX_CAPTURE_HEIGHT_PX so an
#     infinite-scroll page cannot produce a 40MB payload; the cap is REPORTED in the
#     result (`truncated: true`) so the analysis prompt knows the capture is partial -
#     a silent cap would read as "covered everything" when it didn't.
#   - No Lighthouse: the research-proxy container has no Node runtime (verified
#     2026-07-05). Basic navigation timing rides along from the browser instead;
#     a Node sidecar is a Phase-3 owner decision.
#
# Reuses the same sync_playwright pattern as gold_pptx_export.py / nxt_diagram_render.py
# (FastAPI runs sync endpoints in its threadpool).

from __future__ import annotations

import base64
import json
import os
from flow_capture import _assert_public_http
from urllib.parse import urlparse as _urlparse
import ipaddress as _ipaddress
import socket as _socket
import time
from typing import Any, Dict, List, Optional

_VENDOR_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor")
_AXE_PATH = os.path.join(_VENDOR_DIR, "axe.min.js")

# The three audit viewports (proposal section 2; mobile-first WCAG 2.2 posture).
AUDIT_VIEWPORTS: Dict[str, Dict[str, int]] = {
    "mobile":  {"width": 390,  "height": 844},
    "tablet":  {"width": 820,  "height": 1180},
    "desktop": {"width": 1440, "height": 900},
}

# WCAG 2.2 AA tag set for axe.run (the operative legal target - EAA/EN 301 549 scope).
AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]

MAX_CAPTURE_HEIGHT_PX = 6000       # full-page cap (see header note - reported, never silent)
NAV_TIMEOUT_MS = 45_000
AXE_TIMEOUT_MS = 60_000

_axe_source_cache: Optional[str] = None


def _axe_source() -> str:
    global _axe_source_cache
    if _axe_source_cache is None:
        with open(_AXE_PATH, "r", encoding="utf-8") as f:
            _axe_source_cache = f.read()
    return _axe_source_cache


def _slim_axe_nodes(nodes: List[Dict[str, Any]], cap: int = 8) -> List[Dict[str, Any]]:
    """Keep the fields the analysis engine cites (selector, summary, snippet) and cap
    node lists so a 400-violation page doesn't produce a megabyte of JSON per rule."""
    slim = []
    for n in nodes[:cap]:
        slim.append({
            "target": n.get("target"),
            "html": (n.get("html") or "")[:300],
            "failureSummary": (n.get("failureSummary") or "")[:400],
        })
    return slim


def _slim_axe_results(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for r in items:
        out.append({
            "id": r.get("id"),
            "impact": r.get("impact"),
            "tags": [t for t in (r.get("tags") or []) if t.startswith("wcag") or t == "best-practice"],
            "description": r.get("description"),
            "help": r.get("help"),
            "helpUrl": r.get("helpUrl"),
            "nodeCount": len(r.get("nodes") or []),
            "nodes": _slim_axe_nodes(r.get("nodes") or []),
        })
    return out


def capture_url(url: str, viewports: Optional[List[str]] = None) -> Dict[str, Any]:
    """Capture screenshots + axe scan + ARIA snapshot + timing for `url` at each viewport.

    Returns {url, capturedAt, viewports: {name: {screenshot_b64, screenshot_mime, truncated,
    page_height, violations, incomplete, passes_count, aria_snapshot, timing}}, errors: []}.
    Fail-open per viewport: one viewport failing does not kill the others.
    """
    from playwright.sync_api import sync_playwright

    wanted = [v for v in (viewports or list(AUDIT_VIEWPORTS.keys())) if v in AUDIT_VIEWPORTS]
    if not wanted:
        wanted = list(AUDIT_VIEWPORTS.keys())

    result: Dict[str, Any] = {
        "url": url,
        "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "axeVersion": "4.10.3",
        "axeTags": AXE_TAGS,
        "viewports": {},
        "errors": [],
    }

    # WS-0 S4 (2026-10-30): the capture lane must never become an SSRF path into the
    # Docker network or the host. Same guard as flow_capture; raises ValueError.
    _assert_public_http(url)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--disable-dev-shm-usage"])
        try:
            for name in wanted:
                vp = AUDIT_VIEWPORTS[name]
                try:
                    result["viewports"][name] = _capture_one(browser, url, name, vp)
                except Exception as e:  # fail-open per viewport
                    result["errors"].append(f"{name}: {type(e).__name__}: {e}")
        finally:
            browser.close()

    if not result["viewports"]:
        raise RuntimeError(
            f"audit capture produced no viewports for {url}: {'; '.join(result['errors']) or 'unknown error'}")
    return result



def _abort_private_targets(route, request) -> None:
    """Request-level SSRF guard for subresources of a captured public page."""
    try:
        host = (_urlparse(request.url).hostname or "").lower()
        if not host or host in ("localhost", "host.docker.internal", "research-proxy"):
            route.abort("blockedbyclient")
            return
        for info in _socket.getaddrinfo(host, None):
            ip = _ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                route.abort("blockedbyclient")
                return
    except Exception:
        route.abort("blockedbyclient")
        return
    route.continue_()

def _capture_one(browser: Any, url: str, name: str, vp: Dict[str, int]) -> Dict[str, Any]:
    # bypass_csp=True is load-bearing: it lets the vendored axe source inject on
    # CSP-strict sites (the Phase-0 verification gate exercises this on real sites).
    ctx = browser.new_context(
        viewport={"width": vp["width"], "height": vp["height"]},
        device_scale_factor=2,
        bypass_csp=True,
        user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    )
    try:
        page = ctx.new_page()
        # WS-0 S4: a public page may still embed subresources that point at private
        # addresses; abort those at the request level.
        page.route("**/*", _abort_private_targets)
        t0 = time.time()
        page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
        # networkidle is nice-to-have; many marketing sites never go idle (analytics
        # beacons), so wait briefly and move on rather than failing the capture.
        try:
            page.wait_for_load_state("networkidle", timeout=8_000)
        except Exception:
            pass
        nav_seconds = round(time.time() - t0, 2)

        page_height = int(page.evaluate("() => document.documentElement.scrollHeight") or 0)
        truncated = page_height > MAX_CAPTURE_HEIGHT_PX

        shot_kwargs: Dict[str, Any] = {"type": "jpeg", "quality": 80}
        if truncated:
            shot_kwargs["clip"] = {"x": 0, "y": 0, "width": vp["width"], "height": MAX_CAPTURE_HEIGHT_PX}
        else:
            shot_kwargs["full_page"] = True
        shot = page.screenshot(**shot_kwargs)

        # axe-core scan (vendored source; context bypasses CSP)
        page.add_script_tag(content=_axe_source())
        axe_raw = page.evaluate(
            """async (tags) => {
                const res = await window.axe.run(document, {
                    runOnly: { type: 'tag', values: tags },
                    resultTypes: ['violations', 'incomplete'],
                });
                return { violations: res.violations, incomplete: res.incomplete,
                         passes: (res.passes || []).length };
            }""",
            AXE_TAGS,
        )

        # ARIA snapshot (structural accessibility tree, YAML-ish string)
        aria = ""
        try:
            aria = page.locator("body").aria_snapshot(timeout=10_000)
        except Exception:
            pass
        if aria and len(aria) > 20_000:
            aria = aria[:20_000] + "\n... [aria snapshot truncated at 20k chars]"

        # 2026-07-08 critique-rigor P0-d (R3): navigation presence is DERIVED, never
        # model-guessed - role=navigation / <nav> / a skip link. Absence on a live
        # multi-screen experience must surface as a wayfinding finding downstream.
        nav_present = False
        try:
            nav_present = bool(page.evaluate(
                """() => !!(document.querySelector('nav, [role=\\'navigation\\']')
                    || Array.from(document.querySelectorAll('a[href^=\\'#\\']')).some(
                         a => /skip/i.test(a.textContent || '')))"""))
        except Exception:
            pass

        # 2026-07-08 critique-rigor P0-c1 (owner hard requirement, TOTAL content parity):
        # the deterministic CONTENT INVENTORY - every visible detail a proposal must
        # carry (headings, standalone stats/values, captions, links, buttons, list
        # items). DOM-derived for captures; uploads get theirs from the vision pass.
        inventory: List[Dict[str, str]] = []
        try:
            inventory = page.evaluate(
                """() => {
                    const out = [];
                    const seen = new Set();
                    const push = (kind, text) => {
                        const t = (text || '').replace(/\\s+/g, ' ').trim().slice(0, 200);
                        if (!t || t.length < 2) return;
                        const key = kind + '|' + t.toLowerCase();
                        if (seen.has(key)) return;
                        seen.add(key);
                        out.push({ kind, text: t });
                    };
                    document.querySelectorAll('h1,h2,h3,h4').forEach(h => push('heading', h.textContent));
                    document.querySelectorAll('a[href],button,[role=button],input[type=submit]').forEach(
                        b => push('action', b.textContent || b.value));
                    document.querySelectorAll('p,li,figcaption,caption,dt,dd,th').forEach(p => {
                        const t = (p.textContent || '').trim();
                        if (t && t.length <= 220) push(/\\d/.test(t) ? 'value' : 'text', t);
                    });
                    return out.slice(0, 60);
                }""") or []
        except Exception:
            pass

        timing = {}
        try:
            timing = page.evaluate(
                """() => {
                    const nav = performance.getEntriesByType('navigation')[0];
                    if (!nav) return {};
                    return {
                        ttfb_ms: Math.round(nav.responseStart),
                        domContentLoaded_ms: Math.round(nav.domContentLoadedEventEnd),
                        load_ms: Math.round(nav.loadEventEnd),
                        transferSize_bytes: nav.transferSize || 0,
                    };
                }"""
            ) or {}
        except Exception:
            pass
        timing["navigation_wall_seconds"] = nav_seconds

        return {
            "viewport": vp,
            "screenshot_b64": base64.b64encode(shot).decode("ascii"),
            "screenshot_mime": "image/jpeg",
            "page_height": page_height,
            "truncated": truncated,
            "violations": _slim_axe_results(axe_raw.get("violations") or []),
            "incomplete": _slim_axe_results(axe_raw.get("incomplete") or []),
            "passes_count": axe_raw.get("passes") or 0,
            "aria_snapshot": aria,
            "nav_present": nav_present,
            "content_inventory": inventory,
            "timing": timing,
        }
    finally:
        ctx.close()


def capture_summary(result: Dict[str, Any]) -> Dict[str, Any]:
    """Compact per-viewport counts for logging / the SPA progress line."""
    out = {}
    for name, v in (result.get("viewports") or {}).items():
        out[name] = {
            "violations": len(v.get("violations") or []),
            "incomplete": len(v.get("incomplete") or []),
            "passes": v.get("passes_count", 0),
            "truncated": v.get("truncated", False),
        }
    return out
