# proposed_screen_render.py
#
# 2026-07-08 v2 (critique-rigor P0-c2) - REWRITTEN on the harvested proto/* partials.
# v1 hand-coded wireframe approximations with invented inline sizes; that was the
# grey-box failure in nicer clothes (R15) and violated the token doctrine. v2 composes
# the proposed screen EXACTLY the way #proto builds prototypes:
#   - proto_partials.REGISTRY: full-fidelity, token-bound mirrors of the actual Figma
#     proto/* components (design-time MCP harvest, node ids carried).
#   - proto_partials.token_css: the ACTUAL Figma token mirror hydrated as CSS variables
#     (the same token carrier #proto injects) - zero literal hex/px in the partials.
#   - Content slots BIND the screen's real inventory (labels, items, values, sources);
#     visibly-marked sample bars are legal only where no real value exists.
#   - Emits the severity-and-fidelity.md fidelity axes + floor_met so the gate
#     (auditGate.checkFloor / checkContentParity) can block below-floor proposals.
# Chromium contract unchanged (sync API in a worker thread; fail-open None).

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import proto_partials
from render_sandbox import sandboxed_page  # WS-0 S3 (2026-10-30): network-sandboxed renders

FRAME_W = 760          # matches the slides:screen-redesign proposed image slot
MAX_SECTIONS = 10   # 2026-07-08: dense screens need more carriers (NFP live failure)

# Back-compat: the KNOWN_PATTERNS name is consumed by callers/tests.
KNOWN_PATTERNS = set(proto_partials.REGISTRY.keys())


def proposed_html(sections: List[Dict[str, Any]], tokens: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    return proto_partials.render_sections(sections, tokens, MAX_SECTIONS)


def compute_fidelity(sections: List[Dict[str, Any]], tokens: Dict[str, Any]) -> Dict[str, Any]:
    """Fidelity axes without rendering (used by tests + pre-checks)."""
    _, fid = proto_partials.render_sections(sections, tokens, MAX_SECTIONS)
    return fid


def render_proposed_png(sections: List[Dict[str, Any]], tokens: Dict[str, Any]
                        ) -> Tuple[Optional[bytes], Dict[str, Any]]:
    """Rasterize the proposed-experience composition to PNG (2x) + fidelity report.
    Fail-open (None, fidelity) when Chromium is unavailable."""
    doc, fidelity = proposed_html(sections, tokens)
    # floor per severity-and-fidelity.md: axes 1-4 (content finalized upstream against
    # the inventory; here content=1 means no sample bar displaced a known value, which
    # the renderer cannot know alone -> report ratio, gate decides).
    fidelity["floor_axes"] = {
        "components": fidelity["components"],
        "nav": fidelity["nav"],
        "primary_action": fidelity["primary_action"],
    }
    try:
        from playwright.sync_api import sync_playwright
    except Exception:
        return None, fidelity
    import os
    import tempfile
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(doc)
    tmp.close()
    out = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
            page = sandboxed_page(browser, viewport={"width": FRAME_W + 40, "height": 900}, device_scale_factor=2)
            page.goto("file://" + tmp.name.replace("\\", "/"), wait_until="networkidle", timeout=30000)
            try:
                page.wait_for_timeout(300)
            except Exception:
                pass
            el = page.query_selector(".exhibit")
            out = (el.screenshot(type="png") if el else page.screenshot(type="png"))
            browser.close()
    except Exception:
        return None, fidelity
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
    return out, fidelity
