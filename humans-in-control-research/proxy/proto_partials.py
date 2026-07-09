# proto_partials.py
#
# 2026-07-08 - Critique-rigor P0-c2: FULL-FIDELITY, TOKEN-BOUND mirrors of the Figma
# proto/* UI component library, harvested via Figma MCP get_design_context on
# 2026-07-08 (file iSQhAVM7SI4QHAWB7y9C2z, page 403:2 et al.). Each partial
# re-expresses one component's REAL anatomy exactly as #proto builds screens:
#   - every color / font / type-size resolves through a CSS VARIABLE hydrated from
#     the ACTUAL Figma token mirror (figma-tokens.json -> token_css carrier); the
#     var() fallbacks are the values the harvest captured. ZERO invented styling.
#   - geometry (paddings, gaps, per-component radii) is the component's own harvested
#     anatomy - literal per Method A, exactly like slideComposer's ARCHETYPE_SPECS.
#   - content SLOTS bind the screen's real inventory (labels, items, VALUES). A
#     neutral sample bar renders ONLY where no real value exists, visibly marked -
#     a bar where a value existed is a parity failure upstream (checkContentParity).
# Icons render as small inline token-colored SVG glyphs (the harvest's icon assets
# are ephemeral MCP URLs; the glyphs mirror their role, not their bytes).
# Re-harvest when the library changes - same lifecycle as figma-tokens.json.
#
# Registry consumed by: proposed_screen_render (composition + fidelity axes), the
# figma-node-map "PROPOSED-RENDER REGISTRY" wiki page (manifest-chunked), and the
# shape-based shortlist in the App seam.

from __future__ import annotations

import html as _html
from typing import Any, Dict, List, Tuple

# Pattern classes for the fidelity axes
NAV_PATTERNS = {"nav-bar", "breadcrumb", "tabs", "bottom-nav", "footer", "mega-menu", "sidebar"}
ACTION_BEARING = {"hero", "form-card", "pricing", "cta-row", "button", "search", "nav-bar", "product", "profile", "empty", "form"}


def _e(s: Any) -> str:
    return _html.escape(str(s or "").strip())


def _items(sec: Dict[str, Any], cap: int = 6) -> List[str]:
    xs = sec.get("items")
    if not isinstance(xs, list):
        return []
    return [str(x).strip() for x in xs if str(x or "").strip()][:cap]


def _values(sec: Dict[str, Any], cap: int = 6) -> List[str]:
    xs = sec.get("values")
    if not isinstance(xs, list):
        return []
    return [str(x).strip() if x is not None else "" for x in xs][:cap]


def token_css(tokens: Dict[str, Any]) -> str:
    """The token CARRIER: hydrate the ACTUAL Figma token mirror into CSS variables,
    mirroring how #proto injects the design-token carrier into built prototypes.
    Token paths map 1:1 to var names (color/paper -> --color-paper; type.scale.nano ->
    --type-scale-nano; font.title -> --font-title). Values come from figma-tokens.json,
    never hardcoded here (the fallback chain lives in the partials' var() defaults)."""
    color = tokens.get("color", {}) or {}
    font = tokens.get("font", {}) or {}
    scale = (tokens.get("type", {}) or {}).get("scale", {}) or {}
    radius = tokens.get("radius", {}) or {}
    lines: List[str] = []
    for k, v in color.items():
        if isinstance(v, str) and v.startswith("#"):
            lines.append(f"--color-{k}: {v};")
    for k, v in font.items():
        if isinstance(v, str) and not k.endswith("weight"):
            lines.append(f"--font-{k}: '{v}';")
    for k, v in scale.items():
        if isinstance(v, (int, float)):
            # proto/* components are WEB-density surfaces: the mirror carries stage px
            # (1920-space); web = px/2 per the type-system note - but the micro tiers
            # (nano 11 / micro 13 / label 17 / kicker 22 / name 30 / body 21) are already
            # web-density values in the Brand Tokens variables the components bind.
            lines.append(f"--type-scale-{k}: {v}px;")
    for k, v in radius.items():
        if isinstance(v, (int, float)):
            lines.append(f"--radius-{k}: {v}px;")
    return ":root{" + "".join(lines) + "}"


# ---- shared micro-styles (token refs with the HARVESTED fallbacks) ------------------
_F_HEAD = "font-family:var(--font-title,'Archivo'),sans-serif"
_F_BODY = "font-family:var(--font-body,'Archivo'),sans-serif"
_F_DISP = "font-family:var(--font-display,'Saira Condensed'),sans-serif"
_F_MONO = "font-family:var(--font-mono,'IBM Plex Mono'),monospace"
_INK = "var(--color-ink,#141414)"
_GREY = "var(--color-grey,#73757a)"
_PAPER = "var(--color-paper,#ffffff)"
_HAIR = "var(--color-hairline,#ddddd6)"
_ACCENT = "var(--color-accent,#b8b800)"
_RAIL = "var(--color-rail,#0d0d0d)"
_ECRU = "var(--color-ecru,#f2f1ea)"
_CYAN = "var(--color-cyan,#00b7c3)"
_RUST = "var(--color-rust,#cc6644)"
_SUCCESS = "var(--color-success,#0cce6b)"
_NANO = "font-size:var(--type-scale-nano,11px)"
_MICRO = "font-size:var(--type-scale-micro,13px)"
_LABEL = "font-size:var(--type-scale-label,15px)"
_KICK = "font-size:var(--type-scale-kicker,22px)"
_NAME = "font-size:var(--type-scale-name,30px)"
_BODYSZ = "font-size:var(--type-scale-body,21px)"


class _Ctx:
    """Binding telemetry for the fidelity `content` axis: real-value slots vs sample bars."""
    def __init__(self) -> None:
        self.bound = 0
        self.sample = 0


def _sample_bar(ctx: _Ctx, w: str = "64%", h: int = 14) -> str:
    """A visibly-marked sample bar - legal ONLY where the inventory has no real value."""
    ctx.sample += 1
    return (f'<span style="display:inline-flex;align-items:center;gap:5px">'
            f'<span style="display:inline-block;width:{w};min-width:44px;height:{h}px;'
            f'background:{_HAIR};border-radius:2px"></span>'
            f'<span style="{_F_MONO};font-size:8px;letter-spacing:.5px;color:{_GREY}">SAMPLE</span></span>')


def _val(ctx: _Ctx, v: str, style: str) -> str:
    if v:
        ctx.bound += 1
        return f'<span style="{style}">{_e(v)}</span>'
    return _sample_bar(ctx)


def _glyph(color: str = _GREY, size: int = 15) -> str:
    """Minimal token-colored glyph standing in for the component's icon slot."""
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 16 16" style="flex:none">'
            f'<rect x="2" y="2" width="12" height="12" rx="3" fill="none" stroke="{color}" stroke-width="1.6"/>'
            f'<circle cx="8" cy="8" r="2.2" fill="{color}"/></svg>')


# ==== the 21 harvested partials =======================================================

def p_nav_bar(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/NavBar 440:2 - paper bar, brand label, links (first active ink, rest grey),
    accent Sign-up chip right."""
    label = _e(sec.get("label") or "Product")
    items = _items(sec, 5) or ["Overview"]
    links = ""
    for i, it in enumerate(items):
        c, f, w = (_INK, _F_HEAD, 500) if i == 0 else (_GREY, _F_BODY, 400)
        links += f'<span style="{f};font-weight:{w};{_MICRO};color:{c};white-space:nowrap">{_e(it)}</span>'
    cta = _e(sec.get("cta") or "Sign up")
    return (f'<div style="background:{_PAPER};border-bottom:1px solid {_HAIR};display:flex;gap:18px;'
            f'align-items:center;padding:12px 16px;width:100%">'
            f'<span style="{_F_HEAD};font-weight:600;{_LABEL};color:{_INK};white-space:nowrap">{label}</span>'
            f'{links}<span style="flex:1"></span>'
            f'<span style="background:{_ACCENT};padding:7px 12px;border-radius:3px;{_F_HEAD};font-weight:500;'
            f'{_NANO};color:{_RAIL};white-space:nowrap">{cta}</span></div>')


def p_breadcrumb(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Breadcrumb 441:2 - grey trail, hairline separators, ink current."""
    items = _items(sec, 4) or [_e(sec.get("label") or "Home")]
    out = f'<div style="background:{_PAPER};display:flex;gap:8px;align-items:center;padding:12px 16px">'
    for i, it in enumerate(items):
        last = i == len(items) - 1
        c, f, w = (_INK, _F_HEAD, 500) if last else (_GREY, _F_BODY, 400)
        out += f'<span style="{f};font-weight:{w};{_MICRO};color:{c}">{_e(it)}</span>'
        if not last:
            out += f'<span style="{_F_BODY};{_MICRO};color:{_HAIR}">/</span>'
    return out + "</div>"


def p_tabs(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Tabs 441:8 - underline tabs, active = ink + 2px accent underline."""
    items = _items(sec, 5) or [_e(sec.get("label") or "Overview")]
    tabs = ""
    for i, it in enumerate(items):
        active = i == 0
        c, f, w = (_INK, _F_HEAD, 500) if active else (_GREY, _F_BODY, 400)
        u = _ACCENT if active else "transparent"
        tabs += (f'<span style="display:inline-flex;flex-direction:column;gap:8px;align-items:center;'
                 f'padding:10px 6px"><span style="{f};font-weight:{w};{_MICRO};color:{c};white-space:nowrap">'
                 f'{_e(it)}</span><span style="height:2px;width:100%;background:{u}"></span></span>')
    return (f'<div style="background:{_PAPER};width:100%"><div style="border-bottom:1px solid {_HAIR};'
            f'display:flex;gap:4px;padding:0 16px">{tabs}</div></div>')


def p_hero(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Hero 465:57 - ecru panel, display headline, grey sub, accent + outline CTAs."""
    label = _e(sec.get("label") or "")
    items = _items(sec, 3)
    sub = _e(items[0]) if items else ""
    cta1 = _e(items[1]) if len(items) > 1 else "Get started"
    cta2 = _e(items[2]) if len(items) > 2 else ""
    sub_html = (f'<div style="{_F_BODY};{_MICRO};color:{_GREY};text-align:center">{sub}</div>' if sub else "")
    cta2_html = (f'<span style="background:{_PAPER};border:1px solid {_HAIR};padding:9px 16px;border-radius:4px;'
                 f'{_F_HEAD};font-weight:500;{_MICRO};color:{_INK}">{cta2}</span>' if cta2 else "")
    return (f'<div style="background:{_ECRU};display:flex;flex-direction:column;gap:10px;align-items:center;'
            f'padding:30px 28px;border-radius:8px;margin:12px 16px">'
            f'<div style="{_F_DISP};font-weight:600;{_NAME};color:{_INK};text-align:center;line-height:1.1">{label}</div>'
            f'{sub_html}<div style="display:flex;gap:8px;justify-content:center">'
            f'<span style="background:{_ACCENT};padding:9px 16px;border-radius:4px;{_F_HEAD};font-weight:500;'
            f'{_MICRO};color:{_RAIL}">{cta1}</span>{cta2_html}</div></div>')


def p_stat(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Stat 454:39 (row of) - paper card r8, nano grey label, kicker semibold value,
    nano delta line. VALUES BIND from the inventory; sample bar only where none exists."""
    items = _items(sec, 6) or [_e(sec.get("label") or "Metric")]
    vals = _values(sec, 6)
    subs = sec.get("subs") if isinstance(sec.get("subs"), list) else []
    tiles = ""
    for i, it in enumerate(items):
        v = vals[i] if i < len(vals) else ""
        sub = _e(str(subs[i])) if i < len(subs) and subs[i] else ""
        vhtml = _val(ctx, v, f"{_F_HEAD};font-weight:600;{_KICK};color:{_INK};white-space:nowrap")
        sub_html = (f'<div style="{_F_BODY};{_NANO};color:{_GREY}">{sub}</div>' if sub else "")
        tiles += (f'<div style="flex:1 1 22%;min-width:22%;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
                  f'padding:14px 16px;display:flex;flex-direction:column;gap:4px">'
                  f'<div style="{_F_BODY};{_NANO};color:{_GREY}">{_e(it)}</div>{vhtml}{sub_html}</div>')
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:8px">{label}</div>' if label and len(items) > 1 else "")
    return f'<div style="padding:14px 16px">{head}<div style="display:flex;flex-wrap:wrap;gap:10px">{tiles}</div></div>'


def p_card_grid(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Card 454:27 (grid of) - paper card r8, ecru media well, category pill,
    semibold title, grey support, accent + outline actions."""
    items = _items(sec, 6) or [_e(sec.get("label") or "Card")]
    subs = sec.get("subs") if isinstance(sec.get("subs"), list) else []
    cards = ""
    for i, it in enumerate(items):
        sub = _e(str(subs[i])) if i < len(subs) and subs[i] else ""
        sub_html = (f'<div style="{_F_BODY};{_MICRO};color:{_GREY};line-height:1.35">{sub}</div>' if sub else "")
        cards += (f'<div style="flex:1 1 30%;min-width:30%;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
                  f'padding:14px;display:flex;flex-direction:column;gap:9px">'
                  f'<div style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{_e(it)}</div>{sub_html}'
                  f'<div style="display:flex;gap:7px;margin-top:auto">'
                  f'<span style="background:{_ACCENT};padding:7px 12px;border-radius:4px;{_F_HEAD};'
                  f'font-weight:500;{_NANO};color:{_RAIL}">Open</span></div></div>')
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:8px">{label}</div>' if label else "")
    return f'<div style="padding:14px 16px">{head}<div style="display:flex;flex-wrap:wrap;gap:10px">{cards}</div></div>'


def p_list(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/List 454:2 - paper card r8, hairline-separated rows: glyph, medium title +
    nano grey meta, trailing glyph. VALUES bind as the meta line."""
    # 2026-07-08 dense-screen capacity (NFP live failure): lists are the primary carrier
    # for data-dense screens' inventories; 10 rows, never fewer slots than the content.
    items = _items(sec, 10) or [_e(sec.get("label") or "Item")]
    vals = _values(sec, 10)
    rows = ""
    for i, it in enumerate(items):
        border = f'border-top:1px solid {_HAIR};' if i else ""
        v = vals[i] if i < len(vals) else ""
        meta = _val(ctx, v, f"{_F_BODY};{_NANO};color:{_GREY}") if (v or sec.get("values") is not None) else ""
        rows += (f'<div style="{border}display:flex;gap:11px;align-items:center;padding:11px 13px">'
                 f'{_glyph(_GREY, 18)}<div style="flex:1;display:flex;flex-direction:column;gap:1px">'
                 f'<span style="{_F_HEAD};font-weight:500;{_MICRO};color:{_INK}">{_e(it)}</span>{meta}</div>'
                 f'{_glyph(_HAIR, 15)}</div>')
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin:0 16px 8px">{label}</div>' if label else "")
    return (f'<div style="padding:14px 0">{head}<div style="background:{_PAPER};border:1px solid {_HAIR};'
            f'border-radius:8px;margin:0 16px">{rows}</div></div>')


def p_table(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """Tabular anatomy per the evidence-row convention (List variant): uppercase nano
    headers over an ink rule, hairline rows; cells bind real values or sample bars."""
    heads = _items(sec, 5) or ["Column"]
    rows_data = sec.get("rows") if isinstance(sec.get("rows"), list) else []
    ths = "".join(f'<th style="text-align:left;{_F_HEAD};font-weight:600;{_NANO};letter-spacing:.6px;'
                  f'text-transform:uppercase;color:{_GREY};padding:8px 10px;'
                  f'border-bottom:2px solid {_INK}">{_e(h)}</th>' for h in heads)
    body = ""
    n_rows = max(len(rows_data), 3) if not rows_data else len(rows_data[:12])
    for r in range(n_rows):
        row = rows_data[r] if r < len(rows_data) and isinstance(rows_data[r], list) else []
        tds = ""
        for c in range(len(heads)):
            cell = str(row[c]).strip() if c < len(row) and row[c] is not None else ""
            tds += (f'<td style="padding:10px;{_F_BODY};{_MICRO};color:{_INK}">'
                    + _val(ctx, cell, f"{_F_BODY};{_MICRO};color:{_INK}") + "</td>")
        body += f'<tr style="border-bottom:1px solid {_HAIR}">{tds}</tr>'
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:8px">{label}</div>' if label else "")
    return (f'<div style="padding:14px 16px">{head}'
            f'<table style="width:100%;border-collapse:collapse"><tr>{ths}</tr>{body}</table></div>')


def p_form_card(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/FormCard 448:25 - paper card r8 p20, semibold label title, nano field labels,
    hairline r6 inputs with grey placeholder, full-width accent submit."""
    label = _e(sec.get("label") or "Get started")
    items = _items(sec, 4) or ["Email"]
    fields = ""
    for it in items:
        fields += (f'<div style="display:flex;flex-direction:column;gap:5px;width:100%">'
                   f'<span style="{_F_HEAD};font-weight:500;{_NANO};color:{_INK}">{_e(it)}</span>'
                   f'<div style="background:{_PAPER};border:1px solid {_HAIR};border-radius:6px;'
                   f'padding:9px 11px;{_F_BODY};{_MICRO};color:{_GREY}">{_e(it)}...</div></div>')
    cta = _e(sec.get("cta") or "Continue")
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
            f'padding:20px;display:flex;flex-direction:column;gap:10px;max-width:340px">'
            f'<div style="{_F_HEAD};font-weight:600;{_LABEL};color:{_INK}">{label}</div>{fields}'
            f'<div style="background:{_ACCENT};border-radius:4px;padding:10px 0;text-align:center;'
            f'{_F_HEAD};font-weight:500;{_MICRO};color:{_RAIL}">{cta}</div></div>')


def p_field(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Field 448:2 - labeled inputs (text + search-with-glyph variants)."""
    items = _items(sec, 3) or [_e(sec.get("label") or "Field")]
    fields = ""
    for it in items:
        fields += (f'<div style="display:flex;flex-direction:column;gap:6px;width:100%">'
                   f'<span style="{_F_HEAD};font-weight:500;{_NANO};color:{_INK}">{_e(it)}</span>'
                   f'<div style="background:{_PAPER};border:1px solid {_HAIR};border-radius:6px;'
                   f'padding:9px 11px;display:flex;gap:8px;align-items:center;{_F_BODY};{_MICRO};'
                   f'color:{_GREY}">{_glyph(_GREY, 15)}{_e(it)}...</div></div>')
    return f'<div style="padding:14px 16px;display:flex;flex-direction:column;gap:14px;max-width:320px">{fields}</div>'


def p_stepper(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Stepper 441:36 - 22px round steps: done=accent fill, current=accent ring,
    upcoming=ecru; nano labels."""
    items = _items(sec, 5) or [_e(sec.get("label") or "Step")]
    cur = max(0, min(len(items) - 1, int(sec.get("current") or min(1, len(items) - 1))))
    steps = ""
    for i, it in enumerate(items):
        if i < cur:
            disc = f"background:{_ACCENT};color:{_RAIL};border:none"
            tcol = _GREY
        elif i == cur:
            disc = f"background:{_PAPER};color:{_INK};border:2px solid {_ACCENT}"
            tcol = _INK
        else:
            disc = f"background:{_ECRU};color:{_GREY};border:none"
            tcol = _GREY
        steps += (f'<span style="display:inline-flex;gap:7px;align-items:center">'
                  f'<span style="width:22px;height:22px;border-radius:11px;{disc};display:inline-flex;'
                  f'align-items:center;justify-content:center;{_F_HEAD};font-weight:500;{_NANO}">{i + 1}</span>'
                  f'<span style="{_F_BODY};{_NANO};color:{tcol}">{_e(it)}</span></span>')
    return f'<div style="background:{_PAPER};display:flex;gap:10px;align-items:center;padding:14px 16px">{steps}</div>'


def p_button_row(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Button 462:21 - accent primary r4 + hairline secondary; labeled STATES."""
    items = _items(sec, 3) or [_e(sec.get("label") or "Continue")]
    btns = ""
    for i, it in enumerate(items):
        if i == 0:
            st = f"background:{_ACCENT};color:{_RAIL}"
        else:
            st = f"border:1px solid {_HAIR};color:{_INK};background:{_PAPER}"
        btns += (f'<span style="{st};padding:8px 13px;border-radius:4px;{_F_HEAD};font-weight:500;'
                 f'{_MICRO};white-space:nowrap">{_e(it)}</span>')
    return f'<div style="padding:14px 16px;display:flex;gap:8px;flex-wrap:wrap">{btns}</div>'


def p_alert(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Alert 450:6 - paper r6, 3px colored left border + colored semibold lead."""
    label = _e(sec.get("label") or "Heads up.")
    items = _items(sec, 1)
    body = _e(items[0]) if items else ""
    tone = str(sec.get("tone") or "info")
    col = {"info": _CYAN, "warn": _RUST, "error": _RUST}.get(tone, _CYAN)
    return (f'<div style="margin:10px 16px;background:{_PAPER};border:1px solid {_HAIR};'
            f'border-left:3px solid {col};border-radius:6px;padding:10px 12px;display:flex;gap:10px;'
            f'align-items:flex-start">{_glyph(col, 16)}'
            f'<span style="{_MICRO}"><span style="{_F_HEAD};font-weight:600;color:{col}">{label}</span> '
            f'<span style="{_F_BODY};color:{_INK}">{body}</span></span></div>')


def p_cite(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Cite 408:2 - mono uppercase kicker, body with [n] markers, numbered source
    cards (17px accent-bordered numeral chip + source + title). Sources BIND real
    attributions from the inventory."""
    label = _e(sec.get("label") or "")
    items = _items(sec, 4)
    vals = _values(sec, 4)
    body = _e(sec.get("body") or "")
    cards = ""
    for i, it in enumerate(items):
        v = vals[i] if i < len(vals) else ""
        title = _val(ctx, v, f"{_F_BODY};{_NANO};color:{_INK};line-height:1.4") if v else ""
        cards += (f'<div style="flex:1;background:{_PAPER};border:1px solid {_HAIR};border-radius:6px;'
                  f'padding:8px;display:flex;flex-direction:column;gap:3px;min-width:0">'
                  f'<div style="display:flex;gap:5px;align-items:center">'
                  f'<span style="width:17px;height:17px;background:{_ECRU};border:1px solid {_ACCENT};'
                  f'border-radius:4px;display:inline-flex;align-items:center;justify-content:center;'
                  f'{_F_BODY};font-weight:600;{_NANO};color:{_ACCENT}">{i + 1}</span>'
                  f'<span style="{_F_BODY};{_NANO};color:{_GREY};overflow:hidden;text-overflow:ellipsis;'
                  f'white-space:nowrap">{_e(it)}</span></div>{title}</div>')
    kick = (f'<div style="{_F_MONO};font-weight:600;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY}">{label}</div>' if label else "")
    body_html = (f'<div style="{_F_BODY};{_MICRO};color:{_INK};line-height:1.5">{body}</div>' if body else "")
    return (f'<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">{kick}{body_html}'
            f'<div style="display:flex;gap:7px">{cards}</div></div>')


def p_accordion(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Accordion 455:2 - stacked paper r6 cards, semibold Q + grey +/- toggle,
    first item expanded with grey body."""
    items = _items(sec, 8) or [_e(sec.get("label") or "Question")]
    vals = _values(sec, 8)
    cards = ""
    for i, it in enumerate(items):
        openrow = i == 0
        toggle = "-" if openrow else "+"
        body = ""
        if openrow:
            v = vals[i] if i < len(vals) else ""
            inner = _val(ctx, v, f"{_F_BODY};{_MICRO};color:{_GREY}") if v else _sample_bar(ctx, "80%", 10)
            body = f'<div style="padding:0 12px 11px">{inner}</div>'
        cards += (f'<div style="background:{_PAPER};border:1px solid {_HAIR};border-radius:6px;width:100%">'
                  f'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px">'
                  f'<span style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{_e(it)}</span>'
                  f'<span style="{_F_HEAD};font-weight:500;{_LABEL};color:{_GREY}">{toggle}</span></div>{body}</div>')
    return f'<div style="padding:14px 16px;display:flex;flex-direction:column;gap:6px">{cards}</div>'


def p_footer(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Footer 444:2 - paper panel, semibold column heads over grey links, hairline
    top-rule copyright row."""
    items = _items(sec, 4) or ["Product", "Company", "Resources", "Legal"]
    cols = ""
    for it in items:
        cols += (f'<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">'
                 f'<span style="{_F_HEAD};font-weight:600;{_NANO};color:{_INK}">{_e(it)}</span>'
                 f'<span style="{_F_BODY};{_NANO};color:{_GREY}">Link</span>'
                 f'<span style="{_F_BODY};{_NANO};color:{_GREY}">Link</span></div>')
    label = _e(sec.get("label") or "")
    return (f'<div style="background:{_PAPER};border-top:1px solid {_HAIR};padding:18px 18px 16px;'
            f'display:flex;flex-direction:column;gap:12px;width:100%">'
            f'<div style="display:flex;gap:14px">{cols}</div>'
            f'<div style="border-top:1px solid {_HAIR};padding-top:10px;{_F_BODY};{_NANO};'
            f'color:{_GREY}">{label}</div></div>')


def p_bottom_nav(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/BottomNav 442:19 - hairline top rule, glyph+nano label items, first active ink."""
    items = _items(sec, 4) or ["Home", "Search", "Saved", "You"]
    cells = ""
    for i, it in enumerate(items):
        c, f, w = (_INK, _F_HEAD, 500) if i == 0 else (_GREY, _F_BODY, 400)
        cells += (f'<span style="display:inline-flex;flex-direction:column;gap:4px;align-items:center">'
                  f'{_glyph(c, 18)}<span style="{f};font-weight:{w};{_NANO};color:{c}">{_e(it)}</span></span>')
    return (f'<div style="background:{_PAPER};border-top:1px solid {_HAIR};display:flex;'
            f'justify-content:space-between;padding:9px 20px;width:100%">{cells}</div>')


def p_mega_menu(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/MegaMenu 444:26 - paper r4 panel, semibold trigger row, ecru r3 tile grid."""
    label = _e(sec.get("label") or "Products")
    items = _items(sec, 6) or ["Item"]
    tiles = "".join(
        f'<span style="background:{_ECRU};border-radius:3px;padding:9px 12px 9px 10px;display:inline-flex;'
        f'gap:8px;align-items:center;width:120px">{_glyph(_GREY, 14)}'
        f'<span style="{_F_BODY};{_NANO};color:{_INK};white-space:nowrap;overflow:hidden;'
        f'text-overflow:ellipsis">{_e(x)}</span></span>' for x in items)
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:4px;'
            f'padding:14px 16px;display:flex;flex-direction:column;gap:12px;max-width:420px">'
            f'<span style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{label}</span>'
            f'<div style="display:flex;flex-wrap:wrap;gap:10px">{tiles}</div></div>')


def p_search(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Cmd 462:34 - paper r10 palette: hairline-ruled input row, ecru-highlighted
    first result, plain rows after."""
    label = _e(sec.get("label") or "Search...")
    items = _items(sec, 5)
    rows = ""
    for i, it in enumerate(items):
        bg = f"background:{_ECRU};" if i == 0 else ""
        f, w = (_F_HEAD, 500) if i == 0 else (_F_BODY, 400)
        rows += (f'<div style="{bg}border-radius:6px;padding:8px 11px;{f};font-weight:{w};{_MICRO};'
                 f'color:{_INK}">{_e(it)}</div>')
    body = f'<div style="display:flex;flex-direction:column;gap:2px;padding:6px">{rows}</div>' if rows else ""
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:10px;'
            f'overflow:hidden;max-width:420px"><div style="border-bottom:1px solid {_HAIR};display:flex;'
            f'gap:10px;align-items:center;padding:13px 14px">{_glyph(_GREY, 16)}'
            f'<span style="{_F_BODY};{_MICRO};color:{_GREY}">{label}</span></div>{body}</div>')


def _chart_svg(kind: str, accent: str, ink: str, hair: str) -> str:
    """Token-colored native SVG chart (the Figma component's chart region re-expressed
    natively per D17 - never a raster asset, no fabricated axis numbers)."""
    if kind == "line":
        return ('<svg width="100%" height="100" viewBox="0 0 220 100" preserveAspectRatio="none">'
                f'<polyline points="0,78 36,62 72,68 108,42 144,48 180,20 220,26" fill="none" '
                f'stroke="{accent}" stroke-width="2.5"/>'
                f'<line x1="0" y1="97" x2="220" y2="97" stroke="{ink}" stroke-width="1.5"/></svg>')
    bars = ""
    for i, h in enumerate([44, 72, 56, 86, 64]):
        x = 8 + i * 42
        fill = accent if h == 86 else hair
        bars += f'<rect x="{x}" y="{100 - h}" width="26" height="{h}" fill="{fill}"/>'
    return (f'<svg width="100%" height="104" viewBox="0 0 220 104" preserveAspectRatio="none">{bars}'
            f'<line x1="0" y1="102" x2="220" y2="102" stroke="{ink}" stroke-width="1.5"/></svg>')


def p_chart_bar(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Bar 460:2 - paper card r8, nano grey title, chart region (native SVG)."""
    label = _e(sec.get("label") or "By category")
    legend = "".join(f'<span style="margin-right:12px;{_F_BODY};{_NANO};color:{_GREY}">{_e(x)}</span>'
                     for x in _items(sec, 4))
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
            f'padding:13px 14px;display:flex;flex-direction:column;gap:9px">'
            f'<span style="{_F_HEAD};font-weight:500;{_NANO};color:{_GREY}">{label}</span>'
            + _chart_svg("bar", _ACCENT, _INK, _HAIR)
            + (f'<div>{legend}</div>' if legend else "") + "</div>")


def p_chart_line(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Line 460:11 - paper card r8, nano grey title, line chart region (native SVG)."""
    label = _e(sec.get("label") or "Trend over time")
    legend = "".join(f'<span style="margin-right:12px;{_F_BODY};{_NANO};color:{_GREY}">{_e(x)}</span>'
                     for x in _items(sec, 4))
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
            f'padding:13px 14px;display:flex;flex-direction:column;gap:9px">'
            f'<span style="{_F_HEAD};font-weight:500;{_NANO};color:{_GREY}">{label}</span>'
            + _chart_svg("line", _ACCENT, _INK, _HAIR)
            + (f'<div>{legend}</div>' if legend else "") + "</div>")


def p_pricing(sec: Dict[str, Any], ctx: _Ctx) -> str:
    """proto/Pricing 465:20 - 3 plan cards (center accent-bordered + Popular pill),
    semibold names, body-size prices (BIND from values), nano features, Choose CTAs."""
    items = _items(sec, 3) or ["Plan"]
    vals = _values(sec, 3)
    cards = ""
    for i, it in enumerate(items):
        popular = i == 1 and len(items) > 1
        border = f"border:1.5px solid {_ACCENT}" if popular else f"border:1px solid {_HAIR}"
        pill = (f'<span style="background:{_ACCENT};border-radius:999px;padding:2px 7px;{_F_HEAD};'
                f'font-weight:500;{_NANO};color:{_RAIL};align-self:flex-start">Popular</span>' if popular else "")
        v = vals[i] if i < len(vals) else ""
        price = _val(ctx, v, f"{_F_HEAD};font-weight:600;{_BODYSZ};color:{_INK}")
        cta_bg = f"background:{_ACCENT};color:{_RAIL}" if popular else f"background:{_PAPER};border:1px solid {_HAIR};color:{_INK}"
        cards += (f'<div style="flex:1;background:{_PAPER};{border};border-radius:8px;padding:13px;'
                  f'display:flex;flex-direction:column;gap:6px">{pill}'
                  f'<span style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{_e(it)}</span>{price}'
                  f'<div style="{cta_bg};border-radius:4px;padding:7px 0;text-align:center;{_F_HEAD};'
                  f'font-weight:500;{_NANO};margin-top:auto">Choose</div></div>')
    return f'<div style="padding:14px 16px;display:flex;gap:10px">{cards}</div>'


# ==== registry (consumed by the renderer, the wiki registry page, and the shortlist) ==



# ==== 2026-07-08 harvest extension (owner: full Figma #proto library, higher fidelity) ====
# Anatomy from the design-time harvest doc (wiki design-system/proto-component-manifest.md,
# verified against page 403:2). Same token discipline: every color/font/size via var();
# geometry is the component's own harvested anatomy.

_SB_ICONS = {
    "home": '<path d="M3 11l9-7 9 7M5 10v10h14V10" fill="none" stroke="CUR" stroke-width="1.7"/>',
    "chart": '<path d="M4 20V10M10 20V4M16 20v-8" fill="none" stroke="CUR" stroke-width="1.7"/>',
    "users": '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a4 4 0 0 0 0-8M18 21a7 7 0 0 0 4-3" fill="none" stroke="CUR" stroke-width="1.7"/>',
    "gear": '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M19.1 4.9L17 7M7 17l-2.1 2.1" fill="none" stroke="CUR" stroke-width="1.5"/>',
}

def _sb_icon(kind, color, size=16):
    body = _SB_ICONS.get(kind, _SB_ICONS["home"]).replace("CUR", color)
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" style="flex:none">{body}</svg>'


def p_sidebar(sec, ctx):
    """proto/Sidebar 442:2 - vertical primary nav rail 220w: paper surface, hairline
    border, rows [icon 16 + micro label]; active row ecru wash + ink."""
    items = _items(sec, 7) or ["Overview"]
    kinds = ["home", "chart", "users", "gear"]
    rows = ""
    for i, it in enumerate(items):
        active = i == 0
        c = _INK if active else _GREY
        bg = f"background:{_ECRU};" if active else ""
        w = 500 if active else 400
        rows += (f'<div style="{bg}display:flex;gap:10px;align-items:center;border-radius:3px;'
                 f'padding:8px 10px">{_sb_icon(kinds[i % 4], c)}'
                 f'<span style="{_F_HEAD};font-weight:{w};{_MICRO};color:{c}">{_e(it)}</span></div>')
    head = ""
    if sec.get("label"):
        head = (f'<div style="{_F_MONO};{_NANO};letter-spacing:1px;text-transform:uppercase;'
                f'color:{_GREY};padding:4px 10px 8px">{_e(sec.get("label"))}</div>')
    return (f'<nav style="width:220px;min-width:220px;background:{_PAPER};border-right:1px solid {_HAIR};'
            f'padding:12px 10px;display:flex;flex-direction:column;gap:2px;align-self:stretch">{head}{rows}</nav>')


def p_feature_grid(sec, ctx):
    """proto/FeatureGrid 465:65 - wrap of feature cells: accent glyph 18 + semibold
    micro title + nano grey desc."""
    items = _items(sec, 6) or [_e(sec.get("label") or "Feature")]
    subs = sec.get("subs") if isinstance(sec.get("subs"), list) else []
    cells = ""
    for i, it in enumerate(items):
        d = _e(str(subs[i])) if i < len(subs) and subs[i] else ""
        cells += (f'<div style="flex:1 1 30%;min-width:30%;border:1px solid {_HAIR};border-radius:6px;'
                  f'padding:13px;display:flex;flex-direction:column;gap:6px">{_glyph(_ACCENT, 18)}'
                  f'<span style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{_e(it)}</span>'
                  + (f'<span style="{_F_BODY};{_NANO};color:{_GREY};line-height:1.4">{d}</span>' if d else "")
                  + "</div>")
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:8px">{label}</div>' if label else "")
    return f'<div style="padding:14px 16px">{head}<div style="display:flex;flex-wrap:wrap;gap:10px">{cells}</div></div>'


def p_testimonial(sec, ctx):
    """proto/Testimonial 467:16 - figure card: blockquote + avatar/name/role caption."""
    quote = _e(sec.get("label") or (sec.get("items") or ["Quote"])[0])
    items = _items(sec, 3)
    name = _e(items[0]) if items else "Client"
    role = _e(items[1]) if len(items) > 1 else ""
    return (f'<figure style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
            f'padding:18px 20px;display:flex;flex-direction:column;gap:12px">'
            f'<blockquote style="margin:0;{_F_BODY};font-size:14px;line-height:1.5;color:{_INK}">&ldquo;{quote}&rdquo;</blockquote>'
            f'<figcaption style="display:flex;gap:10px;align-items:center">'
            f'<span style="width:34px;height:34px;border-radius:50%;background:{_ECRU};display:inline-flex;'
            f'align-items:center;justify-content:center;{_F_HEAD};font-weight:600;{_NANO};color:{_GREY}">{name[:1]}</span>'
            f'<span style="display:flex;flex-direction:column"><span style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{name}</span>'
            + (f'<span style="{_F_BODY};{_NANO};color:{_GREY}">{role}</span>' if role else "")
            + "</span></figcaption></figure>")


def p_bento(sec, ctx):
    """proto/Bento 467:2 - mixed-size ecru tile grid: wide feature + stat/logo pair,
    quote band + image well."""
    items = _items(sec, 5) or [_e(sec.get("label") or "Feature")]
    subs = sec.get("subs") if isinstance(sec.get("subs"), list) else []
    def tile(i, extra=""):
        t = _e(items[i]) if i < len(items) else ""
        d = _e(str(subs[i])) if i < len(subs) and subs[i] else ""
        if not t:
            return f'<div style="flex:1;background:{_ECRU};border-radius:6px;min-height:64px;{extra}"></div>'
        return (f'<div style="flex:1;background:{_ECRU};border-radius:6px;padding:14px;display:flex;'
                f'flex-direction:column;gap:5px;{extra}"><span style="{_F_HEAD};font-weight:600;{_MICRO};'
                f'color:{_INK}">{t}</span>'
                + (f'<span style="{_F_BODY};{_NANO};color:{_GREY};line-height:1.4">{d}</span>' if d else "")
                + "</div>")
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:8px">{label}</div>' if label else "")
    return (f'<div style="padding:14px 16px">{head}<div style="display:flex;flex-direction:column;gap:10px">'
            f'<div style="display:flex;gap:10px">{tile(0, "flex:2;min-height:96px")}'
            f'<div style="flex:1;display:flex;flex-direction:column;gap:10px">{tile(1)}{tile(2)}</div></div>'
            f'<div style="display:flex;gap:10px">{tile(3, "flex:2")}{tile(4)}</div></div></div>')


def p_timeline(sec, ctx):
    """proto/Timeline 455:34 - accent 9px dot + 2px hairline connector rail per event;
    semibold title + nano time."""
    items = _items(sec, 6) or [_e(sec.get("label") or "Event")]
    vals = _values(sec, 6)
    rows = ""
    for i, it in enumerate(items):
        last = i == len(items) - 1
        line = "" if last else f'<span style="width:2px;flex:1;background:{_HAIR};margin-top:3px"></span>'
        t = _e(vals[i]) if i < len(vals) and vals[i] else ""
        pb = 0 if last else 16
        rows += (f'<div style="display:flex;gap:12px"><span style="display:flex;flex-direction:column;'
                 f'align-items:center;width:10px"><span style="width:9px;height:9px;border-radius:50%;'
                 f'background:{_ACCENT};margin-top:4px"></span>{line}</span>'
                 f'<div style="display:flex;flex-direction:column;gap:2px;padding-bottom:{pb}px">'
                 f'<span style="{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}">{_e(it)}</span>'
                 + (f'<time style="{_F_BODY};{_NANO};color:{_GREY}">{t}</time>' if t else "")
                 + "</div></div>")
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:10px">{label}</div>' if label else "")
    return f'<div style="padding:14px 16px">{head}<div style="display:flex;flex-direction:column">{rows}</div></div>'


def p_kanban(sec, ctx):
    """proto/Kanban 456:2 - ecru columns 150w with semibold title + paper cards
    (subs[i] holds pipe-separated card titles)."""
    items = _items(sec, 4) or ["To do", "In progress", "Done"]
    subs = sec.get("subs") if isinstance(sec.get("subs"), list) else []
    cols = ""
    for i, it in enumerate(items):
        cards = ""
        raw = str(subs[i]) if i < len(subs) and subs[i] else ""
        card_titles = [c.strip() for c in raw.split("|") if c.strip()] or ["Item"]
        for card in card_titles:
            cards += (f'<div style="background:{_PAPER};border:1px solid {_HAIR};border-radius:4px;'
                      f'padding:9px 8px;{_F_BODY};font-size:12px;color:{_INK}">{_e(card)}</div>')
        cols += (f'<div style="flex:1;min-width:150px;background:{_ECRU};border-radius:6px;padding:9px;'
                 f'display:flex;flex-direction:column;gap:8px">'
                 f'<span style="{_F_HEAD};font-weight:600;font-size:12px;color:{_INK}">{_e(it)}</span>{cards}</div>')
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin-bottom:8px">{label}</div>' if label else "")
    return f'<div style="padding:14px 16px">{head}<div style="display:flex;gap:10px">{cols}</div></div>'


def p_logo_cloud(sec, ctx):
    """proto/LogoCloud 467:24 - centered muted caption + wrap of text wordmarks."""
    items = _items(sec, 8) or ["Partner"]
    caption = _e(sec.get("label") or "Trusted by teams at")
    marks = "".join(
        f'<span style="{_F_HEAD};font-weight:600;{_LABEL};color:{_GREY};opacity:.75;white-space:nowrap">{_e(n)}</span>'
        for n in items)
    return (f'<div style="padding:18px 16px;display:flex;flex-direction:column;gap:12px;align-items:center">'
            f'<span style="{_F_BODY};{_NANO};color:{_GREY}">{caption}</span>'
            f'<div style="display:flex;flex-wrap:wrap;gap:14px 26px;justify-content:center">{marks}</div></div>')


def p_tree(sec, ctx):
    """proto/Tree 455:17 - folder/file rows indented by depth (prefix > per level)."""
    items = _items(sec, 8) or [_e(sec.get("label") or "Folder")]
    rows = ""
    for it in items:
        depth = len(it) - len(it.lstrip(">"))
        text = _e(it.lstrip("> ").strip())
        pl = 8 + depth * 20
        rows += (f'<div style="display:flex;gap:8px;align-items:center;padding:5px 8px;'
                 f'padding-left:{pl}px">{_glyph(_GREY, 15)}'
                 f'<span style="{_F_BODY};{_MICRO};color:{_INK}">{text}</span></div>')
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin:0 16px 6px">{label}</div>' if label else "")
    return (f'<div style="padding:14px 0">{head}<div style="background:{_PAPER};border:1px solid {_HAIR};'
            f'border-radius:8px;margin:0 16px;padding:6px 4px">{rows}</div></div>')


def p_empty(sec, ctx):
    """proto/Empty 450:44 - centered paper card: muted glyph 30 + semibold title +
    guidance + accent action."""
    title = _e(sec.get("label") or "No items yet")
    items = _items(sec, 2)
    guide = _e(items[0]) if items else ""
    cta = _e(sec.get("cta") or (items[1] if len(items) > 1 else "")) or "Get started"
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
            f'padding:24px 28px;display:flex;flex-direction:column;gap:9px;align-items:center;text-align:center">'
            f'{_glyph(_GREY, 30)}<span style="{_F_HEAD};font-weight:600;font-size:14px;color:{_INK}">{title}</span>'
            + (f'<span style="{_F_BODY};font-size:12.5px;color:{_GREY};max-width:320px">{guide}</span>' if guide else "")
            + f'<span style="background:{_ACCENT};border-radius:4px;padding:9px 16px;{_F_HEAD};font-weight:500;'
              f'{_MICRO};color:var(--color-on-accent,#0d0d0d)">{cta}</span></div>')


def p_product(sec, ctx):
    """proto/Product 465:2 - product card 210w: 1:1 ecru image well, nano category,
    semibold name, stock line, price (BINDS), accent add-to-cart."""
    name = _e(sec.get("label") or (sec.get("items") or ["Product"])[0])
    items = _items(sec, 3)
    cat = _e(items[1]) if len(items) > 1 else ""
    vals = _values(sec, 2)
    price = vals[0] if vals else ""
    price_html = _val(ctx, price, f"{_F_HEAD};font-weight:600;font-size:16px;color:{_INK}")
    cta = _e(sec.get("cta") or "Add to cart")
    return (f'<div style="margin:12px 16px;width:210px;background:{_PAPER};border:1px solid {_HAIR};'
            f'border-radius:8px;overflow:hidden;display:flex;flex-direction:column">'
            f'<div style="width:100%;aspect-ratio:1;background:{_ECRU};display:flex;align-items:center;'
            f'justify-content:center">{_glyph(_GREY, 26)}</div>'
            f'<div style="padding:12px;display:flex;flex-direction:column;gap:5px">'
            + (f'<span style="{_F_BODY};{_NANO};color:{_GREY};text-transform:uppercase;letter-spacing:.5px">{cat}</span>' if cat else "")
            + f'<span style="{_F_HEAD};font-weight:600;font-size:13.5px;color:{_INK}">{name}</span>'
            f'<span style="{_F_BODY};{_NANO};color:{_SUCCESS}">In stock</span>{price_html}'
            f'<div style="display:flex;gap:7px;margin-top:4px"><span style="flex:1;background:{_ACCENT};'
            f'border-radius:4px;padding:8px 0;text-align:center;{_F_HEAD};font-weight:500;{_NANO};'
            f'color:var(--color-on-accent,#0d0d0d)">{cta}</span></div></div></div>')


def p_profile(sec, ctx):
    """proto/Profile 466:78 - accent cover band 54h, ringed avatar 50, name + handle,
    accent follow, stat row (BINDS real stats)."""
    name = _e(sec.get("label") or "Member")
    items = _items(sec, 4)
    handle = _e(items[0]) if items else ""
    vals = _values(sec, 3)
    subs = sec.get("subs") if isinstance(sec.get("subs"), list) else []
    stats = ""
    for i, v in enumerate(vals):
        cap = _e(str(subs[i])) if i < len(subs) and subs[i] else ""
        stats += ('<span style="display:flex;gap:5px;align-items:baseline">'
                  + _val(ctx, v, f"{_F_HEAD};font-weight:600;{_MICRO};color:{_INK}")
                  + (f'<span style="{_F_BODY};{_NANO};color:{_GREY}">{cap}</span>' if cap else "")
                  + "</span>")
    follow = _e(sec.get("cta") or "Follow")
    return (f'<div style="margin:12px 16px;background:{_PAPER};border:1px solid {_HAIR};border-radius:8px;'
            f'overflow:hidden"><div style="height:54px;background:{_ACCENT}"></div>'
            f'<div style="padding:0 16px 14px;display:flex;flex-direction:column;gap:8px">'
            f'<span style="width:50px;height:50px;border-radius:50%;background:{_ECRU};border:3px solid {_PAPER};'
            f'margin-top:-25px;display:inline-flex;align-items:center;justify-content:center;'
            f'{_F_HEAD};font-weight:600;{_MICRO};color:{_GREY}">{name[:1]}</span>'
            f'<div style="display:flex;align-items:center;gap:10px"><span style="display:flex;flex-direction:column">'
            f'<span style="{_F_HEAD};font-weight:600;font-size:14px;color:{_INK}">{name}</span>'
            + (f'<span style="{_F_BODY};{_NANO};color:{_GREY}">{handle}</span>' if handle else "")
            + f'</span><span style="margin-left:auto;background:{_ACCENT};border-radius:4px;padding:7px 14px;'
              f'{_F_HEAD};font-weight:500;{_NANO};color:var(--color-on-accent,#0d0d0d)">{follow}</span></div>'
            + (f'<div style="display:flex;gap:16px">{stats}</div>' if stats else "")
            + "</div></div>")


def p_toast(sec, ctx):
    """proto/Toast 450:2 - rail pill: success check + paper message text."""
    msg = _e(sec.get("label") or (sec.get("items") or ["Saved"])[0])
    return (f'<div style="margin:12px 16px;display:inline-flex;gap:9px;align-items:center;background:{_RAIL};'
            f'border-radius:8px;padding:11px 14px;max-width:fit-content">'
            f'<svg width="15" height="15" viewBox="0 0 24 24" style="flex:none"><path d="M5 12l4.5 4.5L19 7" '
            f'fill="none" stroke="{_SUCCESS}" stroke-width="2.2"/></svg>'
            f'<span style="{_F_BODY};font-size:13px;color:{_PAPER}">{msg}</span></div>')


def p_notif_list(sec, ctx):
    """proto/NotifList 450:51 - paper card rows: muted glyph + medium title/nano time,
    accent unread dot on the first two."""
    items = _items(sec, 5) or [_e(sec.get("label") or "Notification")]
    vals = _values(sec, 5)
    rows = ""
    for i, it in enumerate(items):
        border = f'border-top:1px solid {_HAIR};' if i else ""
        t = _e(vals[i]) if i < len(vals) and vals[i] else ""
        dot = (f'<span style="width:8px;height:8px;border-radius:50%;background:{_ACCENT};flex:none"></span>'
               if i < 2 else "")
        rows += (f'<div style="{border}display:flex;gap:11px;align-items:center;padding:11px 13px">'
                 f'{_glyph(_GREY, 18)}<div style="flex:1;display:flex;flex-direction:column;gap:1px">'
                 f'<span style="{_F_HEAD};font-weight:500;font-size:13px;color:{_INK}">{_e(it)}</span>'
                 + (f'<span style="{_F_BODY};{_NANO};color:{_GREY}">{t}</span>' if t else "")
                 + f"</div>{dot}</div>")
    label = _e(sec.get("label") or "")
    head = (f'<div style="{_F_HEAD};font-weight:500;{_NANO};letter-spacing:1px;text-transform:uppercase;'
            f'color:{_GREY};margin:0 16px 8px">{label}</div>' if label else "")
    return (f'<div style="padding:14px 0">{head}<div style="background:{_PAPER};border:1px solid {_HAIR};'
            f'border-radius:8px;margin:0 16px">{rows}</div></div>')


REGISTRY: Dict[str, Dict[str, Any]] = {
    "nav-bar":    {"node": "440:2",  "fn": p_nav_bar,    "use": "top navigation: brand + links + primary action"},
    "breadcrumb": {"node": "441:2",  "fn": p_breadcrumb, "use": "location trail on deep pages"},
    "tabs":       {"node": "441:8",  "fn": p_tabs,       "use": "peer-view switching within a page"},
    "bottom-nav": {"node": "442:19", "fn": p_bottom_nav, "use": "mobile primary navigation"},
    "footer":     {"node": "444:2",  "fn": p_footer,     "use": "site footer: link columns + legal"},
    "mega-menu":  {"node": "444:26", "fn": p_mega_menu,  "use": "large catalog navigation"},
    "hero":       {"node": "465:57", "fn": p_hero,       "use": "page opener: headline + sub + CTAs"},
    "kpi-row":    {"node": "454:39", "fn": p_stat,       "use": "metric tiles; BINDS real stat values"},
    "card-grid":  {"node": "454:27", "fn": p_card_grid,  "use": "browsable item cards"},
    "list":       {"node": "454:2",  "fn": p_list,       "use": "stacked records with meta"},
    "table":      {"node": "454:2",  "fn": p_table,      "use": "columnar data; BINDS real cell values"},
    "form":       {"node": "448:25", "fn": p_form_card,  "use": "signup/intake with labeled fields + submit"},
    "field":      {"node": "448:2",  "fn": p_field,      "use": "standalone labeled inputs"},
    "stepper":    {"node": "441:36", "fn": p_stepper,    "use": "multi-step progress"},
    "cta-row":    {"node": "462:21", "fn": p_button_row, "use": "primary + secondary actions with real labels"},
    "alert":      {"node": "450:6",  "fn": p_alert,      "use": "inline status/notice band"},
    "cite":       {"node": "408:2",  "fn": p_cite,       "use": "claims with numbered verifiable sources; BINDS attributions"},
    "accordion":  {"node": "455:2",  "fn": p_accordion,  "use": "FAQ / disclosure list"},
    "chart-bar":  {"node": "460:2",  "fn": p_chart_bar,  "use": "categorical comparison chart"},
    "chart-line": {"node": "460:11", "fn": p_chart_line, "use": "trend over time chart"},
    "search":     {"node": "462:34", "fn": p_search,     "use": "search / command entry"},
    "sidebar":      {"node": "442:2",  "fn": p_sidebar,      "use": "left vertical primary navigation rail (expandable menu)"},
    "feature-grid": {"node": "465:65", "fn": p_feature_grid, "use": "feature/benefit cells with accent glyphs"},
    "testimonial":  {"node": "467:16", "fn": p_testimonial,  "use": "customer quote with attributed speaker"},
    "bento":        {"node": "467:2",  "fn": p_bento,        "use": "mixed-size highlight tile grid"},
    "timeline":     {"node": "455:34", "fn": p_timeline,     "use": "ordered events with times"},
    "kanban":       {"node": "456:2",  "fn": p_kanban,       "use": "workflow board columns with cards"},
    "logo-cloud":   {"node": "467:24", "fn": p_logo_cloud,   "use": "partner/customer wordmark band"},
    "tree":         {"node": "455:17", "fn": p_tree,         "use": "hierarchy/folder tree (prefix > per level)"},
    "empty":        {"node": "450:44", "fn": p_empty,        "use": "empty state with guidance + action"},
    "product":      {"node": "465:2",  "fn": p_product,      "use": "product card; BINDS real price"},
    "profile":      {"node": "466:78", "fn": p_profile,      "use": "member/profile header; BINDS real stats"},
    "toast":        {"node": "450:2",  "fn": p_toast,        "use": "transient confirmation pill"},
    "notif-list":   {"node": "450:51", "fn": p_notif_list,   "use": "notification rows with unread dots"},
    "pricing":    {"node": "465:20", "fn": p_pricing,    "use": "plan comparison with real prices"},
}


def render_sections(sections: List[Dict[str, Any]], tokens: Dict[str, Any],
                    max_sections: int = 10) -> Tuple[str, Dict[str, Any]]:
    """Compose the proposed screen from registry partials + the token carrier.
    Returns (html_doc, fidelity_report). fidelity axes per severity-and-fidelity.md:
      components: 1 iff EVERY section resolved to a registry partial
      nav: 1 iff any nav-class pattern present
      primary_action: 1 iff any action-bearing pattern present
      content: bound-slot ratio rides in the report (final parity is gated upstream
               against the contentInventory by checkContentParity)"""
    ctx = _Ctx()
    body = ""
    unknown: List[str] = []
    used: List[str] = []
    has_nav = False
    has_action = False
    for sec in sections[:max_sections]:
        if not isinstance(sec, dict):
            continue
        kind = str(sec.get("pattern") or "").strip().lower()
        entry = REGISTRY.get(kind)
        if not entry:
            unknown.append(kind or "(empty)")
            entry = REGISTRY["list"]
            kind = "list"
        used.append(f"proto/{kind} {entry['node']}")
        if kind in NAV_PATTERNS:
            has_nav = True
        if kind in ACTION_BEARING:
            has_action = True
        body += "@@RAIL-SENTINEL@@" + entry["fn"](sec, ctx) if kind == "sidebar" else entry["fn"](sec, ctx)
    # PAGE-SHELL composition (2026-07-08 fidelity uplift): a sidebar section becomes a
    # true left rail with the remaining sections in a content column - the screen reads
    # as an application page, not a stacked wireframe strip. nav-bar stays full-width on
    # top of the content column.
    if "@@RAIL-SENTINEL@@" in body:
        parts = body.split("@@RAIL-SENTINEL@@")
        pre = parts[0]
        rail_and_rest = parts[1]
        rail_end = rail_and_rest.index("</nav>") + len("</nav>")
        rail = rail_and_rest[:rail_end]
        rest = rail_and_rest[rail_end:]
        body = (f'<div style="display:flex;align-items:stretch;min-height:560px">{rail}'
                f'<div style="flex:1;min-width:0;display:flex;flex-direction:column">{pre}{rest}</div></div>')
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><style>
{token_css(tokens)}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ background: var(--color-grey,#73757a); }}
.exhibit {{ width:760px; background: var(--color-paper,#ffffff);
  border:1px solid var(--color-hairline,#ddddd6); overflow:hidden; }}
</style></head><body><div class="exhibit">{body}</div></body></html>"""
    total_slots = ctx.bound + ctx.sample
    fidelity = {
        "components": 0 if unknown else 1,
        "nav": 1 if has_nav else 0,
        "primary_action": 1 if has_action else 0,
        "bound_slots": ctx.bound,
        "sample_slots": ctx.sample,
        "content_ratio": (ctx.bound / total_slots) if total_slots else 1.0,
        "used_patterns": used,
        "unknown_patterns": unknown,
    }
    return doc, fidelity
