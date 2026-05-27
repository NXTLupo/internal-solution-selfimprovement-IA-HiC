#!/usr/bin/env python3
"""validate_freeform_structure.py — Stop hook (2026-05-25)

Structural conformance validator for freeform-HTML artifacts (journey,
blueprint, org, arch, roadmap, mindmap, brief-dialog, meta-themes,
research-plan). Catches the class of defect that produced the journey-map
"slop" disaster: the SKILL DOCUMENTS a contract that the RENDERED ARTIFACT
then omits.

Scans the most-recent FreeformArtifact written to the design-desk store
(or, in shadow mode, scans any *.html in hic-workspace/sample-artifacts/
that was modified within the hour) and checks per-kind structural rules:

  journey   — .opportunity-row present, .activity child-count per
              .activities matches phase column count, .emotion-arc SVG
              rendered, no .ph-eye metadata stamps, no .tphase tiles,
              no `[Life]/[Experience]/[Functional]` debug brackets.
  blueprint — both lov-row + loii-row rendered, .pain or .gain on every
              FAIL/GAIN claim, no debug-arrow tethers.
  persona   — role ≤ 80 chars, primaryTask present, no debug bracket
              prefixes in goals, no "(composite)" suffix in name.

Shadow mode: exit 0 always, log hits to
hic-workspace/wiki/synthesis/structural-shadow-log.md. After 1-2 weeks
of false-positive review, promote per-rule severity to exit 2.
"""

from __future__ import annotations
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[3]
LOG_PATH = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "wiki" / "synthesis" / "structural-shadow-log.md"
SAMPLE_DIR = REPO_ROOT / "humans-in-control-research" / "hic-workspace" / "sample-artifacts"


# ─── Journey (2026-05-25 second pass: depth-contract enforcement ported from
#     the Intelligence Augmentation Journey Mapper into the grid-table layout)
def check_journey(html: str) -> list[tuple[str, str, str]]:
    """Return list of (rule_id, severity, message).

    2026-05-25 second pass — depth contract per
    exemplar-skills/diagrams/journey-illustrator/SKILL.md §5:
      • Verbatim quote density (.vq across cells) — warn-floor 30%, target 40%
      • Named touchpoint density (.tp) — warn-floor 50%, target 60%
      • Emotion specificity (.emo) — warn-floor 60%, target 80%
      • Dashboard presence (kpi-dashboard / personas / overall-pain /
        overall-opp / kpi-tile) — ≥3 of 5 signals
    Below warn-floor returns a 'high' hit (the renderer-side runtime check in
    chatToFreeform.ts::checkKindSpecificDepth blocks the artifact at the same
    floor; this Stop hook is the second-line defense + audit trail).
    """
    hits: list[tuple[str, str, str]] = []

    # Heuristic: file is a journey if it has 'journey map' in the title or kicker
    if "journey map" not in html.lower() and "journey-illustrator" not in html.lower():
        return hits

    # Rule J1 — RETIRED swimlane layout. The 2026-05-24 grid was deprecated;
    # any presence of the old elements is a regression and auto-rejects.
    deprecated_classes = [
        '.phase-strip',
        '.lanes ',
        '.activities',
        '.emotion-arc',
        '.opportunity-row',
        '.voice-row',
        '.synthesis-band',
        '.lane-track',
    ]
    for cls in deprecated_classes:
        # Look for class="<name>" in the rendered HTML (ignoring the CSS-selector form)
        bare = cls.strip().lstrip('.')
        if f'class="{bare}"' in html or f"class='{bare}'" in html:
            hits.append(("J1", "high",
                f"Journey uses the deprecated swimlane element '.{bare}'. Migrated to the blueprint grid-table layout 2026-05-25."))

    # Rule J2 — required new layout primitives
    if 'class="grid"' not in html and 'class="rp-grid"' not in html:
        hits.append(("J2", "medium",
            "Journey lacks the required '.grid' container of the blueprint-shared layout."))

    # Rule J3 — no .ph-eye metadata stamps (reporting-depth metadata, banned 2026-05-25)
    if 'class="ph-eye"' in html:
        hits.append(("J3", "high",
            "Journey contains .ph-eye phase metadata stamps. Removed permanently 2026-05-25 as reporting-depth metadata."))

    # Rule J4 — no .tphase tile mini-stamps
    if 'class="tphase"' in html:
        hits.append(("J4", "high",
            "Metric tiles contain .tphase mini-tags. Removed 2026-05-25; phase reference belongs in tile prose."))

    # Rule J5 — focal phase: must be EXACTLY one .phase-head.focal in the new layout
    focal_count = len(re.findall(r'class="phase-head focal"', html))
    if focal_count > 1:
        hits.append(("J5", "high", f"Journey has {focal_count} .phase-head.focal; must be exactly 1."))

    # ─── Depth contract (Journey Mapper-derived discipline ported into HiC) ──

    # Cell count is the denominator for density floors. Count both class="cell"
    # and class="cell focal" so the focal cell is included.
    cell_re = re.compile(r'class="(?:[^"]*\s)?cell(?:\s[^"]*)?"')
    cell_count = len(cell_re.findall(html))

    if cell_count >= 4:
        # J6 — Verbatim quote density (≥30% warn-floor, target 40%)
        vq_count = len(re.findall(r'<blockquote\b[^>]*class="(?:[^"]*\s)?vq(?:\s[^"]*)?"', html))
        vq_ratio = vq_count / cell_count
        if vq_ratio < 0.30:
            hits.append(("J6", "high",
                f"Verbatim-quote density {vq_ratio*100:.0f}% ({vq_count} .vq / {cell_count} cells). Contract minimum 40% (warn-floor 30%). Add corpus quotes to cells; never fabricate."))

        # J7 — Named touchpoint density (≥50% warn-floor, target 60%)
        tp_count = len(re.findall(r'class="(?:[^"]*\s)?tp(?:\s[^"]*)?"', html))
        tp_ratio = tp_count / cell_count
        if tp_ratio < 0.50:
            hits.append(("J7", "high",
                f"Named-touchpoint density {tp_ratio*100:.0f}% ({tp_count} .tp / {cell_count} cells). Contract minimum 60% (warn-floor 50%). Add named channels (DIGITAL/PORTAL/IN-PERSON/etc.) to cells."))

        # J8 — Emotion specificity (≥60% warn-floor, target 80%)
        emo_count = len(re.findall(r'class="(?:[^"]*\s)?emo(?:\s[^"]*)?"', html))
        emo_ratio = emo_count / cell_count
        if emo_ratio < 0.60:
            hits.append(("J8", "high",
                f"Emotion specificity {emo_ratio*100:.0f}% ({emo_count} .emo / {cell_count} cells). Contract minimum 80% (warn-floor 60%). Add per-cell emotion + intensity (0-100)."))

    # J9 — Dashboard presence (≥3 of 5 signals)
    dash_signals = [
        bool(re.search(r'class="(?:[^"]*\s)?kpi-dashboard(?:\s[^"]*)?"', html)),
        len(re.findall(r'class="(?:[^"]*\s)?kpi-tile(?:\s[^"]*)?"', html)) >= 3,
        bool(re.search(r'class="(?:[^"]*\s)?personas?(?:\s[^"]*)?"', html)),
        bool(re.search(r'class="(?:[^"]*\s)?overall-pain(?:\s[^"]*)?"', html)),
        bool(re.search(r'class="(?:[^"]*\s)?overall-opp(?:\s[^"]*)?"', html)),
    ]
    if sum(dash_signals) < 3:
        hits.append(("J9", "medium",
            f"Journey dashboard underbuilt: {sum(dash_signals)}/5 signals (kpi-dashboard, kpi-tiles, personas, overall-pain, overall-opp). Dashboard is required above the grid per the JM-depth pattern."))

    return hits


# ─── Blueprint ────────────────────────────────────────────────────────────────
def check_blueprint(html: str) -> list[tuple[str, str, str]]:
    hits: list[tuple[str, str, str]] = []
    if "service blueprint" not in html.lower() and "blueprint" not in html.lower():
        return hits
    # Heuristic: blueprint files mention "future state" or have .lov-row/.loii-row
    is_blueprint = (
        "future state" in html.lower()
        or 'class="lov-row"' in html
        or 'class="loii-row"' in html
        or 'class="lov-row "' in html
    )
    if not is_blueprint:
        return hits

    if 'class="lov-row"' not in html and 'class="lov-row "' not in html:
        hits.append(("B1", "high",
            "Blueprint missing Line of Visibility row (.lov-row). Shostack canonical — required."))
    if 'class="loii-row"' not in html and 'class="loii-row "' not in html:
        hits.append(("B2", "medium",
            "Blueprint missing Line of Internal Interaction row (.loii-row) — required when Support Processes lane exists."))

    return hits


# ─── Persona ──────────────────────────────────────────────────────────────────
def check_persona_json(data: dict) -> list[tuple[str, str, str]]:
    hits: list[tuple[str, str, str]] = []
    if data.get("type") != "persona":
        return hits

    role = data.get("role", "")
    if isinstance(role, str) and len(role) > 80:
        hits.append(("P1", "high",
            f"role field is {len(role)} chars (max 80). Longer context belongs in citations[]."))

    name = data.get("name", "")
    if isinstance(name, str) and ("(composite)" in name.lower() or "(synthetic)" in name.lower()):
        hits.append(("P2", "high",
            f"name field contains debug suffix '(composite)' or '(synthetic)'. Removed 2026-05-25."))

    goals = data.get("goals", [])
    if isinstance(goals, list):
        for i, g in enumerate(goals):
            if isinstance(g, str) and re.match(r"^\s*\[(Life|Experience|Functional)\]", g, re.I):
                hits.append(("P3", "high",
                    f"goals[{i}] starts with debug tier-bracket '[Life]/[Experience]/[Functional]'. Tier must be implicit in prose."))

    # Quotes must be verbatim with named source
    quotes = data.get("quotes", [])
    if isinstance(quotes, list):
        for i, q in enumerate(quotes):
            if isinstance(q, dict):
                src = q.get("source", "")
                if src in ("synthesis", "composite", "ai", "model"):
                    hits.append(("P4", "high",
                        f"quotes[{i}].source is '{src}' — quotes must come from named corpus, never synthesis."))

    return hits


# ─── General checks (ALL artifact kinds) ─────────────────────────────────────
def check_general_html(html: str, path_name: str) -> list[tuple[str, str, str]]:
    """Checks that apply to every freeform HTML artifact regardless of kind."""
    hits: list[tuple[str, str, str]] = []

    # Strip <style> blocks and HTML comments before scanning visible content.
    visible = re.sub(r"<style[^>]*>[\s\S]*?</style>", "", html, flags=re.I)
    visible = re.sub(r"<!--[\s\S]*?-->", "", visible)

    # Rule G1 — em-dash hard ban (2026-05-25). The em-dash character (U+2014)
    # is the single strongest AI-writing rhythm tell. Per slidePostProcessor
    # stripEmDashes(), runtime strips it. If any em-dash reaches a written
    # artifact, the generation pipeline bypassed the post-processor or the
    # artifact was hand-authored without running through the cleanup.
    em_count = visible.count("—")
    if em_count > 0:
        hits.append(("G1", "high",
            f"{em_count} em-dash character(s) in visible content. Em-dashes are auto-stripped by slidePostProcessor.stripEmDashes — none should ship to artifact files. Use comma, semicolon, colon, period, or parenthesis instead."))

    # Rule G2 — Unicode bold/italic stylization (mathematical glyph plane)
    if re.search(r"[\U0001D400-\U0001D7FF]", visible):
        hits.append(("G2", "high",
            "Visible content contains Unicode mathematical bold/italic glyphs (e.g. mathematical bold script). AI-tell artifact; use HTML <strong>/<em> instead."))

    # Rule G3 — ChatGPT artifact tags
    if re.search(r"\b(oaicite|oai_citation|contentReference|attached_file|turn\d+search\d+)\b", visible, re.I):
        hits.append(("G3", "high",
            "Visible content contains ChatGPT artifact-tag leakage (oaicite / oai_citation / contentReference / turn0search0). Strip before ship."))

    # Rule G4 — graphic-collision heuristic. SVG paths/lines that connect
    # explicit (x1,y1)->(x2,y2) coordinates spanning a large delta are a
    # routing risk. We flag SVG diagrams where 3+ <line> elements have
    # large coordinate spans AND no midpoint routing — heuristic that the
    # author should reconsider CSS grid layout.
    svg_lines = re.findall(r'<line\s+x1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*y1="([\d.]+)"[^>]*y2="([\d.]+)"', html)
    long_lines = 0
    for x1, x2, y1, y2 in svg_lines:
        dx = abs(float(x2) - float(x1))
        dy = abs(float(y2) - float(y1))
        if dx > 300 and dy > 100:
            long_lines += 1
    if long_lines >= 3 and "<path" not in html:
        hits.append(("G4", "medium",
            f"{long_lines} long SVG lines with no <path> midpoint routing. Likely collision risk; consider CSS grid layout (see arch artifact pattern)."))

    return hits


# ─── Driver ───────────────────────────────────────────────────────────────────
def collect_recent_artifacts() -> list[tuple[Path, str]]:
    """Return list of (path, kind) for recently-modified artifacts.
    Now covers ALL freeform artifact kinds, not just journey/blueprint/persona."""
    found: list[tuple[Path, str]] = []
    if not SAMPLE_DIR.exists():
        return found
    cutoff = datetime.now(timezone.utc).timestamp() - 3600  # last hour
    for p in SAMPLE_DIR.rglob("*"):
        try:
            if not p.is_file() or p.stat().st_mtime <= cutoff:
                continue
            name = p.name.lower()
            if name.endswith(".json") and "persona" in name:
                found.append((p, "persona"))
            elif name.endswith(".html"):
                # Classify by filename hints
                if "journey" in name:
                    found.append((p, "journey"))
                elif "blueprint" in name:
                    found.append((p, "blueprint"))
                else:
                    # Every HTML artifact still gets general checks
                    found.append((p, "general"))
        except Exception:
            continue
    return found


def append_to_log(hits: list[tuple[str, str, str, str]], turn_id: str) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(f"\n## {ts} · turn {turn_id} · {len(hits)} structural defect(s)\n\n")
        for source, rule_id, severity, message in hits:
            tag = "HIGH" if severity == "high" else "MED"
            f.write(f"- **{tag}** `{rule_id}` in `{source}` — {message}\n")


def main() -> int:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception:
        payload = {}

    all_hits: list[tuple[str, str, str, str]] = []  # (source, rule, severity, message)

    for path, kind in collect_recent_artifacts():
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        rule_hits: list[tuple[str, str, str]] = []
        if kind == "journey":
            rule_hits = check_journey(content) + check_general_html(content, path.name)
        elif kind == "blueprint":
            rule_hits = check_blueprint(content) + check_general_html(content, path.name)
        elif kind == "general":
            rule_hits = check_general_html(content, path.name)
        elif kind == "persona":
            try:
                rule_hits = check_persona_json(json.loads(content))
            except json.JSONDecodeError:
                rule_hits = [("P0", "high", "persona JSON is not parseable")]
        for r in rule_hits:
            all_hits.append((path.name, *r))

    if not all_hits:
        return 0

    turn_id = str(payload.get("turn_id") or payload.get("session_id") or "shadow")
    try:
        append_to_log(all_hits, turn_id)
    except Exception:
        pass

    return 0  # shadow mode


if __name__ == "__main__":
    sys.exit(main())
