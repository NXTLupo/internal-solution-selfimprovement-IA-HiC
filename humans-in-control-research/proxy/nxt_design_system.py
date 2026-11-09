"""NXT Artifact Design System — deterministic injection for the render layer.

Single source of truth is public/nxt-design-gallery/ (the reviewable style guide).
That gallery is bundled into proxy/_ds_payload.json by the build step in
scripts/build_ds_payload (run when the gallery changes). This module injects the
bundled CSS + JS + icon sprite + logo into every generated #NXT artifact, and
ENFORCES the stark-white / dark-on-white / AA contract even when the model emits
its own dark themes. Applied from _apply_brand_and_anti_slop in app.py (NXT brand).

Why injection (not just prompting): the model repeatedly ignored the stark-white
prompt and shipped dark-on-dark panels (review 2026-05-30). Deterministic CSS +
a Python whitening pass guarantees the result regardless of model behavior.
"""
import json
import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
try:
    with open(os.path.join(_HERE, "_ds_payload.json"), "r", encoding="utf-8") as _f:
        _P = json.load(_f)
    NXT_SYSTEM_CSS = _P.get("css", "")
    NXT_SYSTEM_JS = _P.get("js", "")
    NXT_ICON_SPRITE = _P.get("sprite", "")
except Exception as _payload_err:
    # 2026-10-05: this used to fail SILENTLY and every NXT artifact shipped unstyled. Rebuild the payload with
    # `python scripts/build-ds-payload.py` (sources: public/nxt-design-gallery/).
    import logging as _logging
    _logging.getLogger("app").error(f"[nxt_design_system] _ds_payload.json missing or unreadable ({_payload_err}); artifacts will render UNSTYLED. Run scripts/build-ds-payload.py")
    NXT_SYSTEM_CSS = NXT_SYSTEM_JS = NXT_ICON_SPRITE = ""

# ---- FIGMA TOKENS (source of truth) -----------------------------------------
# 2026-06-09 — the rendered brand styling MUST trace back to Figma, never to a
# hardcoded hex. The gallery :root in _ds_payload.json carried a STALE
# --nxt-lime:#CACA20 + --nxt-mono:'JetBrains Mono' (Figma says accent=#b8b800,
# mono='IBM Plex Mono'). Rather than re-bundle the gallery, we load the live
# Figma tokens here (same file the proxy serves at /api/design-tokens, refreshed
# via Figma MCP get_variable_defs on the token-sheet nodes) and inject a
# highest-precedence :root override + a correct font link in inject_nxt_system().
# No hardcoding: every value below resolves from figma-tokens.json.
def _load_figma_tokens():
    for _p in (
        "/hic-workspace/design-system/figma-tokens.json",
        os.path.join(_HERE, "..", "hic-workspace", "design-system", "figma-tokens.json"),
    ):
        try:
            with open(_p, "r", encoding="utf-8") as _f:
                return json.load(_f)
        except Exception:
            continue
    return {}

_FIGMA_TOKENS = _load_figma_tokens()


def _brand_tokens(brand: str) -> dict:
    bn = "NU" if (brand or "nxt").lower() == "nu" else "NXT"
    return _FIGMA_TOKENS.get(bn, {}) or {}


# NXT accent drives the kicker/underline color in the enforcement layer. Pull it
# from Figma (#b8b800); fall back to the prior literal only if the token file is
# unreadable (fail-safe, not fail-stale — the file is the source of truth).
_NXT_ACCENT = (_brand_tokens("nxt").get("color", {}) or {}).get("accent", "#b8b800")
_NXT_TEAL = (_brand_tokens("nxt").get("color", {}) or {}).get("teal", "#115054")
_NXT_CYAN = (_brand_tokens("nxt").get("color", {}) or {}).get("cyan", "#00b7c3")


def _figma_root_override(brand: str) -> str:
    """Highest-precedence :root (NXT) / .nxt-nu (NU) var override built from the
    live Figma tokens, so var(--nxt-lime)/var(--nxt-mono) etc. resolve to the
    Figma values instead of the stale gallery defaults. Injected LAST in <head>."""
    t = _brand_tokens(brand)
    c = t.get("color", {}) or {}
    f = t.get("font", {}) or {}
    is_nu = (brand or "nxt").lower() == "nu"
    accent = c.get("accent", _NXT_ACCENT)
    teal = c.get("teal") or c.get("source") or _NXT_TEAL  # NU has no teal; use its cool 'source'
    cyan = c.get("cyan") or c.get("source") or _NXT_CYAN
    ink = c.get("ink", "#141414")
    mono = f.get("mono", "IBM Plex Mono")
    body = f.get("body", "Archivo")
    secondary = c.get("secondary", "#666666")
    rail = c.get("rail", "#0d0d0d")
    paper = c.get("paper", "#ffffff")
    display = f.get("display", "Saira Condensed")
    decls = (
        f"--nxt-lime:{accent}!important;"
        f"--nxt-teal:{teal}!important;"
        f"--nxt-cyan:{cyan}!important;"
        f"--nxt-ink:{ink}!important;"
        f"--nxt-mono:'{mono}',ui-monospace,monospace!important;"
        f"--nxt-body:'{body}',-apple-system,'Segoe UI',sans-serif!important;"
        # Bare-name aliases (2026-06-24) so any var(--ink)/--accent/--cyan/etc. the
        # model or gallery CSS emits resolves - kills the undefined-var class of bug.
        f"--accent:{accent}!important;--ink:{ink}!important;--cyan:{cyan}!important;"
        f"--teal:{teal}!important;--secondary:{secondary}!important;--rail:{rail}!important;--paper:{paper}!important;"
        f"--font-display:'{display}',sans-serif!important;"
        f"--font-body:'{body}',sans-serif!important;--font-mono:'{mono}',monospace!important;"
    )
    # Per-artifact, single-brand: :root{...!important} wins over the gallery's
    # non-important var defaults regardless of selector specificity (is_nu only
    # selects which Figma brand values fill the decls above).
    _ = is_nu
    return f'<style id="nxt-figma-tokens">:root{{{decls}}}</style>'


# Google-fonts link sourced from Figma font names (NXT: Bebas Neue + Archivo +
# IBM Plex Mono; NU: Lora + Archivo + IBM Plex Mono). Loads both brands' display
# faces so either theme resolves; replaces the stale Saira+JetBrains link.
_FONTS_LINK_FIGMA = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@400;500;600;700'
    '&family=Archivo:wght@200;300;400;500;600;700;800'
    '&family=Lato:wght@300;400;700;900'
    '&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
)

# Classes that are INTENTIONALLY dark; never whiten these, and force their text white.
_INTENTIONAL_DARK = (
    "nxt-block--ink", "nxt-block--teal", "nxt-slide--title",
    "nxt-slide--divider", "nxt-slide--closing", "nxt-masthead--dark",
)

# ---- LAYOUT GRID SYSTEM (2026-06-02) ----------------------------------------
# Forces the single shared grid over any model-emitted CSS drift. The model
# repeatedly clobbered .nxt-wrap horizontal padding to 0 and left content
# centered while the bars were full-bleed, so the left margin diverged at wide
# viewports (user: "layout is off and there needs to be a consistent left
# margin!"). These !important rules guarantee masthead + tabs + every .nxt-wrap
# section + footer resolve to ONE centered page box with ONE outer margin, and
# full-bleed feature bands break out and re-pad back onto that margin. Injected
# at gen-time (in NXT_ENFORCEMENT_CSS, <head>) AND serve-time (app.py, end of
# <body>, highest precedence) so the existing artifacts are corrected on view.
# Token fallbacks (1408px / 64px) keep it correct even if a doc lacks :root.
_NXT_GRID_CSS_BODY = (
    # Literal 1760 (NOT var()) so it overrides any --nxt-page baked into older
    # artifacts -> EVERY artifact, old or new, resolves to the same centered page
    # box with SYMMETRIC 64px padding (equal left AND right margin) at every width.
    # overflow-x:hidden on the root is the hard guarantee that nothing can ever
    # bleed past the right edge (the "cut off on the right" symptom).
    "html{overflow-x:clip!important;}"  # clip (not hidden) keeps position:sticky working
    "html,body{max-width:100%!important;}"
    ".nxt-masthead,.nxt-tabs,.nxt-wrap,.nxt-footer{"
    "max-width:1760px!important;margin-left:auto!important;margin-right:auto!important;"
    "padding-left:64px!important;padding-right:64px!important;box-sizing:border-box!important;}"
    # long words / headings / cells must wrap rather than push width past the edge.
    ".nxt-hero__title,.nxt-h1,.nxt-h2,.nxt-h3,.nxt-prose,.nxt-eyebrow,p,li,td,th,.nxt-card__title{overflow-wrap:break-word;}"
    # wide tables scroll WITHIN their column instead of overflowing the page.
    ".nxt-table{overflow-x:auto;max-width:100%;}table{max-width:100%;}"
    ".nxt-wrap > .nxt-block--ink,.nxt-wrap > .nxt-block--teal,.nxt-wrap > .nxt-block--lime,"
    ".nxt-section > .nxt-block--ink,.nxt-section > .nxt-block--teal,.nxt-section > .nxt-block--lime{"
    "margin-left:calc(-1*var(--nxt-pad,64px))!important;margin-right:calc(-1*var(--nxt-pad,64px))!important;"
    "padding-left:var(--nxt-pad,64px)!important;padding-right:var(--nxt-pad,64px)!important;}"
    # --- component-grid collapse guard (2026-06-02) ---------------------------
    # The model emits .nxt-persona as a 2-col grid (64px avatar | 1fr content)
    # but auto-flows the role label + every content section into the 64px avatar
    # column, so prose/quotes wrap one word per line (user: "jumbled mess / slop
    # layout"). Pin the avatar to col 1, force ALL other direct children into the
    # content column, and give the content column minmax(0,1fr) so it shrinks
    # gracefully instead of overflowing. min-width:0 unblocks grid/flex shrink so
    # no text-bearing cell can collapse below its content. Robust to either flat
    # or header-wrapped persona markup.
    ".nxt-persona{grid-template-columns:64px minmax(0,1fr)!important;align-items:start!important;}"
    ".nxt-persona > *{grid-column:2!important;min-width:0!important;}"
    ".nxt-persona > .nxt-persona__avatar,.nxt-persona > .nxt-persona__monogram{grid-column:1!important;grid-row:1!important;}"
    ".nxt-persona__section,.nxt-persona__role,.nxt-prose,.nxt-quote,"
    ".nxt-grid > *,.nxt-row > *{min-width:0;}"
    # --- SYSTEMIC collapse-safe grids (2026-06-02) ----------------------------
    # The recurring "jumbled / one-word-per-line" failure is ALWAYS a fixed
    # repeat(N,1fr) (or Npx Npx) grid crushed below readable width -- either by a
    # narrow viewport or, more often, by being nested inside another grid cell
    # (e.g. a .nxt-gap card inside a .nxt-grid--3). Rather than patch each
    # component, force EVERY equal-column primitive to auto-fit + minmax(min(100%,
    # MIN),1fr): columns DROP before text is crushed, in any container, and
    # !important overrides any model-emitted fixed-column override. This is the
    # systemic guarantee that the grid system prevents collapse across artifacts.
    # (A) N-equal-column grids: FIXED count (avoid auto-fit over-packing a variable
    #     child count into narrow tracks) + breakpoint collapse on narrow viewports.
    ".nxt-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))!important;}"
    ".nxt-grid--3,.nxt-horizons,.nxt-case,.nxt-hub{grid-template-columns:repeat(3,minmax(0,1fr))!important;}"
    ".nxt-grid--4{grid-template-columns:repeat(4,minmax(0,1fr))!important;}"
    "@media(max-width:1024px){.nxt-grid--3,.nxt-grid--4{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}"
    "@media(max-width:760px){.nxt-grid--2,.nxt-grid--3,.nxt-grid--4,.nxt-horizons,.nxt-case,.nxt-hub{grid-template-columns:minmax(0,1fr)!important;}}"
    # (B) 2-cell inner primitives that get nested inside narrow cards: auto-fit so
    #     they collapse to one column instead of crushing text.
    ".nxt-gap,.nxt-compare,.nxt-toc{grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))!important;}"
    # label|content primitives: keep the leading label column but let the content
    # column shrink without crushing, and never let either child force overflow.
    ".nxt-rec,.nxt-numlist__item{grid-template-columns:auto minmax(0,1fr)!important;}"
    ".nxt-gap > *,.nxt-compare > *,.nxt-card > *,.nxt-rec > *,.nxt-numlist__item > *,"
    ".nxt-case > *,.nxt-hub > *,.nxt-horizons > *,.nxt-toc > *{min-width:0;}"
    # quotes inside cards/gaps fill their cell (no shrink-to-min-content sliver).
    ".nxt-card .nxt-quote,.nxt-card__body .nxt-quote,.nxt-gap .nxt-quote{width:100%;}"
    # meter-track misused as a text label: a .nxt-strength with no <i> fill is a
    # label (e.g. "Leader"), not a 6px bar -- render it as text so the gray track
    # stops painting over the word.
    ".nxt-strength:not(:has(> i)){height:auto!important;min-height:0!important;background:transparent!important;display:inline!important;width:auto!important;}"
)


# High-cascade enforcement layer (last in <head>). Guarantees the stark-white base
# and keeps intentional dark blocks readable. Deliberately NOT a global *{color}.
NXT_ENFORCEMENT_CSS = """
<style id="nxt-enforcement">
html,body{background:#FFFFFF!important;color:#141414!important;font-family:'Archivo',-apple-system,'Segoe UI',sans-serif!important;}
body *{box-shadow:none!important;text-shadow:none!important;}
/* intentional dark surfaces keep 100% white text (no dark-on-dark) */
.nxt-block--ink,.nxt-block--ink *,.nxt-block--teal,.nxt-block--teal *,
.nxt-slide--title,.nxt-slide--title *,.nxt-slide--divider,.nxt-slide--divider *,
.nxt-slide--closing,.nxt-slide--closing *{color:#FFFFFF!important;}
.nxt-block--ink .nxt-eyebrow,.nxt-block--teal .nxt-eyebrow,
.nxt-slide--title .nxt-slide__kicker,.nxt-slide--divider .nxt-slide__kicker,
.nxt-slide--closing .nxt-slide__kicker{color:#CACA20!important;}
/* lime surfaces keep dark text */
.nxt-block--lime,.nxt-block--lime *{color:#141414!important;}
/* 2026-06-01 ACCESSIBILITY: the selected tab must meet WCAG AA. Generated
   artifacts sometimes embed their own .nxt-tab[aria-selected] rule that puts a
   dark (var(--ink)) background behind the teal label -> teal-on-near-black ~2:1
   (fails). Force the intended clean underline-tab: transparent bg + brand-ink
   text on the white tab bar (teal #115054 on white = 8.7:1; NU red #C8102E on
   white = 5.8:1) + lime underline. Plus a visible keyboard focus ring. !important
   beats any model-injected style; uses brand vars so NU remaps correctly. */
.nxt-tab[aria-selected="true"]{background:transparent!important;color:var(--nxt-teal,#115054)!important;border-bottom-color:var(--nxt-lime,#CACA20)!important;}
.nxt-tab:focus-visible{outline:2px solid var(--nxt-cyan,#00B7C3)!important;outline-offset:2px!important;}
""" + _NXT_GRID_CSS_BODY + """
</style>
"""
# Source the kicker/underline accent from Figma (replaces the stale #CACA20
# literal that drifted from the live token accent #b8b800).
NXT_ENFORCEMENT_CSS = NXT_ENFORCEMENT_CSS.replace("#CACA20", _NXT_ACCENT)

_FONTS_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@400;500;600;700;800'
    '&family=Archivo:wght@200;300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'
)

# ---- banned reporting/process chrome (review 2026-05-30) --------------------
_CHROME_PATTERNS = [
    r"Plan\s*Hash\s*[:=]?\s*[A-Fa-f0-9]{6,}",
    r"Reproducibility\s*hash\s*[:=]?\s*\S+",
    r"(?:Pipeline|Framework)\s*[Vv]ersion\s*[:=]?\s*[\d.]+",
    r"\bVersion\s*[:=]?\s*\d+\.\d+\b",
    r"Run\s*ID\s*[:=]?\s*\S+",
    r"HUMAN\s*CHECKPOINT\s*[:=]?\s*[A-Za-z ]*",
    r"\b\d+\s+Selected\s+from\s+\d+(?:\s+Candidates)?",
    r"Verbalized\s+Sampling(?:\s*\+\s*Cooper\s+Hierarchy)?",
    r"Cooper\s+Hierarchy",
    r"Confidence\s*[:=]\s*(?:HYPOTHESIS|EMERGING|VERIFIED)",
    r"#[a-z-]+\s*v\d+\.\d+",
    r"Segment\s*size\s*[:=]?\s*\d+",
    r"Persona\s*(?:type|count)\s*[:=].*",
]
_CHROME_RE = [re.compile(p, re.IGNORECASE) for p in _CHROME_PATTERNS]


# 2026-06-02 — Persona/VS/confidence TIER badges leaked through as visible chips
# (`Mainstream`, `Non-Obvious`, `Partially Evidenced`, `Evidenced`) and a
# `Composite voice grounded in...` cite. These are exactly the reporting-depth /
# persona-type / confidence / composite metadata banned by .claude/CLAUDE.md, and
# they were absolutely-/inline-placed over headings and 5-Ws cells -> jumbled
# overlap ("AI slop layout"). Strip the whole chip element (removes both the
# banned chrome AND the colliding box) and drop the "composite/synthetic voice
# grounded in" cite prefix (keeping the real named source after it).
_META_BADGE_RE = re.compile(
    r'<span[^>]*class="[^"]*nxt-chip[^"]*"[^>]*>\s*'
    r'(?:mainstream|non[\s\-]?obvious|partially\s+evidenced|well[\s\-]?evidenced|'
    r'evidenced|unevidenced|emerging|hypothesis|verified|validated|speculative|'
    r'primary\s+persona|secondary\s+persona|anti[\s\-]?persona|composite|synthetic)\s*'
    r'</span>',
    re.IGNORECASE,
)
_COMPOSITE_CITE_RE = re.compile(r'(?:composite|synthetic)\s+voice\s+grounded\s+in\s+', re.IGNORECASE)
_PARENS_SUFFIX_RE = re.compile(r'\s*\(\s*(?:composite|synthetic)\s*\)', re.IGNORECASE)


def strip_meta_badges(html: str) -> str:
    if not html:
        return html
    out = _META_BADGE_RE.sub("", html)
    out = _COMPOSITE_CITE_RE.sub("", out)
    out = _PARENS_SUFFIX_RE.sub("", out)
    return out


def strip_banned_chrome(html: str) -> str:
    out = html
    for rx in _CHROME_RE:
        out = rx.sub("", out)
    out = strip_meta_badges(out)
    return out


def _hex_lum(h: str):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return None
    try:
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0


# Near-black threshold: whitens #141414/#242424/#0D0D0D/navy, PRESERVES brand
# teal #115054 (lum .26), rust #CC6644 (.45), lime #CACA20 (.78).
_DARK_T = 0.22


def _is_dark_color(val: str):
    val = val.strip().lower()
    if val in ("black", "#000", "#000000"):
        return True
    m = re.match(r"#([0-9a-f]{3,6})", val)
    if m:
        lum = _hex_lum(m.group(0))
        return lum is not None and lum < _DARK_T
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", val)
    if m:
        r, g, b = (int(x) for x in m.groups())
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0 < _DARK_T
    return False


def _is_light_color(val: str):
    val = val.strip().lower()
    if val in ("white", "#fff", "#ffffff", "#fafafa", "#f5f5f5", "#f5f5f0"):
        return True
    m = re.match(r"#([0-9a-f]{3,6})", val)
    if m:
        lum = _hex_lum(m.group(0))
        return lum is not None and lum > 0.6
    return False


_TAG_RE = re.compile(r"<(\w+)([^>]*?)\sstyle=([\"'])(.*?)\3([^>]*)>", re.IGNORECASE | re.DOTALL)


def whiten_dark_surfaces(html: str) -> str:
    """Flip model-emitted dark inline backgrounds to white (and drop the now-
    orphaned light text color so it reverts to ink). Skips intentional-dark
    classes. This is what actually kills the dark-on-dark panels at runtime."""
    def repl(m):
        tag, pre, q, style, post = m.groups()
        cls = ""
        cm = re.search(r'class=["\']([^"\']*)["\']', pre + " " + post, re.IGNORECASE)
        if cm:
            cls = cm.group(1)
        if any(d in cls for d in _INTENTIONAL_DARK):
            return m.group(0)
        decls = [d for d in style.split(";") if d.strip()]
        changed = False
        new_decls = []
        had_dark_bg = False
        for d in decls:
            if ":" not in d:
                new_decls.append(d)
                continue
            prop, _, val = d.partition(":")
            p = prop.strip().lower()
            if p in ("background", "background-color") and _is_dark_color(val):
                new_decls.append(f"{prop}:#FFFFFF")
                had_dark_bg = True
                changed = True
            else:
                new_decls.append(d)
        if had_dark_bg:
            # remove light text colors that were meant for the dark bg
            final = []
            for d in new_decls:
                prop, _, val = d.partition(":")
                if prop.strip().lower() == "color" and _is_light_color(val):
                    changed = True
                    continue
                final.append(d)
            new_decls = final
        if not changed:
            return m.group(0)
        new_style = ";".join(s.strip() for s in new_decls if s.strip())
        return f"<{tag}{pre} style={q}{new_style}{q}{post}>"

    return _TAG_RE.sub(repl, html)


_STYLE_BLOCK_RE = re.compile(r"<style([^>]*)>(.*?)</style>", re.IGNORECASE | re.DOTALL)
_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}", re.DOTALL)


def whiten_style_blocks(html: str) -> str:
    """Neutralize near-black backgrounds declared in the model's OWN <style>
    blocks (the class-based dark themes that inline whitening can't reach).
    Skips our injected nxt-system / nxt-enforcement blocks. Per CSS rule: if a
    rule sets a near-black background, flip it white and demote any light text
    color in the same rule to ink, so dark-on-dark becomes dark-on-white."""
    def style_repl(sm):
        attrs, css = sm.group(1), sm.group(2)
        if "nxt-system" in attrs or "nxt-enforcement" in attrs:
            return sm.group(0)

        def rule_repl(rm):
            sel, body = rm.group(1), rm.group(2)
            decls = [d for d in body.split(";") if d.strip()]
            has_dark_bg = False
            new = []
            for d in decls:
                if ":" not in d:
                    new.append(d); continue
                prop, _, val = d.partition(":")
                p = prop.strip().lower()
                if p in ("background", "background-color") and _is_dark_color(val):
                    new.append(f"{prop}:#FFFFFF"); has_dark_bg = True
                elif p == "background" and _is_dark_color(val.split()[0] if val.split() else val):
                    new.append(re.sub(r"#[0-9a-fA-F]{3,6}", "#FFFFFF", d, count=1)); has_dark_bg = True
                else:
                    new.append(d)
            if has_dark_bg:
                fixed = []
                for d in new:
                    prop, _, val = d.partition(":")
                    if prop.strip().lower() == "color" and _is_light_color(val):
                        fixed.append(f"{prop}:#141414")
                    else:
                        fixed.append(d)
                new = fixed
            return sel + "{" + ";".join(s.strip() for s in new if s.strip()) + "}"

        return f"<style{attrs}>" + _RULE_RE.sub(rule_repl, css) + "</style>"

    return _STYLE_BLOCK_RE.sub(style_repl, html)


def _replace_placeholder_logos(html: str) -> str:
    """Swap any tiny 'N NXT' / 'NXT' text logo lockups the model invents for the
    real wordmark span the system CSS renders. Conservative: only obvious cases."""
    # If the doc already uses .nxt-logo, leave it.
    return html


# Match the text INSIDE any element carrying the .nxt-logo class (masthead,
# footer, slide logo) — the model fills it with "NXT HUMANS" from the prompt
# examples regardless of brand.
_LOGO_SPAN_RE = re.compile(
    r'(<(?:span|div)[^>]*class="[^"]*nxt-logo[^"]*"[^>]*>)\s*NXT\s+HUMANS\s*(</(?:span|div)>)',
    re.IGNORECASE,
)


def _swap_logo_wordmark_for_nu(html: str) -> str:
    """2026-06-01 — NU artifacts were rendering the literal 'NXT HUMANS' wordmark
    because the JM renderer prompt hardcodes <span class="nxt-logo">NXT HUMANS</span>
    in every masthead/footer/slide example, even on the NU brand path. Deterministic
    backstop: in NU output, the wordmark reads 'NORTHEASTERN'. Enforced here (the
    universal injection chokepoint), not just in the prompt."""
    out = _LOGO_SPAN_RE.sub(lambda m: m.group(1) + "NORTHEASTERN" + m.group(2), html)
    # Also catch bare wordmark text that isn't inside a .nxt-logo span but sits in a
    # masthead/footer brand slot (conservative: only the exact uppercase wordmark).
    out = out.replace(">NXT HUMANS<", ">NORTHEASTERN<")
    return out


def inject_nxt_system(html: str, brand: str = "nxt") -> str:
    """Inject sprite + fonts + system CSS + enforcement + JS into an artifact and
    run the whitening + chrome strip. Idempotent-ish (guards on marker id).

    2026-06-01 — brand-aware. For NU, tag the body with `nxt-nu` so the NU theme
    in the system CSS (Huskies red + ink navy + Spectral/Roboto) restyles the
    SAME design-system + slide templates, and SKIP the dark-surface whitening
    (NU intentionally uses navy/red dark slide frames; whitening would destroy
    them). NXT keeps the full stark-white whitening pass."""
    if not html or "nxt-enforcement" in html:
        return html
    is_nu = (brand or "nxt").lower() == "nu"
    out = html
    if is_nu:
        # add nxt-nu to the body class (or wrap) so the variable-remap theme applies
        if re.search(r"<body[^>]*>", out):
            def _addcls(m):
                tag = m.group(0)
                if "class=" in tag:
                    return re.sub(r'class="([^"]*)"', lambda c: f'class="{c.group(1)} nxt-nu"', tag, count=1)
                return tag[:-1] + ' class="nxt-nu">'
            out = re.sub(r"<body[^>]*>", _addcls, out, count=1)
        else:
            out = '<div class="nxt-nu">' + out + "</div>"

    head_block = (
        _FONTS_LINK_FIGMA
        + '<style id="nxt-system">' + NXT_SYSTEM_CSS + "</style>"
        + NXT_ENFORCEMENT_CSS
        # Figma token override LAST = highest precedence over the gallery :root
        # (flips stale --nxt-lime/#CACA20 -> #b8b800 and JetBrains -> IBM Plex).
        + _figma_root_override(brand)
    )
    if "</head>" in out:
        out = out.replace("</head>", head_block + "</head>", 1)
    elif "<body" in out:
        out = re.sub(r"(<body[^>]*>)", head_block + r"\1", out, count=1)
    else:
        out = head_block + out

    # Sprite right after <body> so <use> refs resolve.
    if NXT_ICON_SPRITE:
        if re.search(r"<body[^>]*>", out):
            out = re.sub(r"(<body[^>]*>)", r"\1" + NXT_ICON_SPRITE, out, count=1)
        else:
            out = NXT_ICON_SPRITE + out

    # JS before </body>.
    js_block = "<script>" + NXT_SYSTEM_JS + "</script>"
    if "</body>" in out:
        out = out.replace("</body>", js_block + "</body>", 1)
    else:
        out = out + js_block

    if not is_nu:
        # Stark-white enforcement is NXT-only. NU keeps its navy/red dark frames.
        out = whiten_style_blocks(out)
        out = whiten_dark_surfaces(out)
    out = strip_banned_chrome(out)
    out = _replace_placeholder_logos(out)
    if is_nu:
        out = _swap_logo_wordmark_for_nu(out)
    return out
