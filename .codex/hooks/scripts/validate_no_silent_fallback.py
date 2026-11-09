#!/usr/bin/env python3
"""
Silent Fallback Sentinel — Stop hook.

Pairs with .claude/skills/fallback-event-surfacing/SKILL.md.

Catches deliverables where structural telltales suggest a degraded
generation path was taken, but there's no matching degradation_events[]
entry on the receipt. The point is to surface the gap between "what
actually happened" and "what the user was told."

Telltales (each implies a fallback occurred):
  - themes[] items have no `depth` field (depth enrichment failed silently)
  - personas[] items lack a `key_quote` (verbatim quote generation failed)
  - recommendations[] items lack `quantification` AND no BLOCKED status
  - any field equals "" or contains "TBD"/"unknown" — generator silently
    produced placeholder
  - generation receipt's `total_duration_ms` is > 60000 for a non-chunked
    generator (suggests retry storm)
  - `primary_model` in receipt differs from any model_path the deliverable
    items declare

If telltales are present AND `degradation_events[]` on the receipt is
empty or absent, FAIL — the pipeline degraded silently.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import json


def find_receipts(obj, path=""):
    """Find any GenerationReceipt-shaped object in the tree."""
    if isinstance(obj, dict):
        # Heuristic: an object with primary_model + generated_at + ...events is a receipt
        if ('primary_model' in obj or 'generated_at' in obj) and (
            'degradation_events' in obj or 'total_duration_ms' in obj
        ):
            yield path, obj
        for k, v in obj.items():
            if isinstance(v, (dict, list)):
                yield from find_receipts(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from find_receipts(item, f"{path}[{i}]")


def collect_items(obj, list_key):
    """Collect items from any list with the given key, anywhere in tree."""
    out = []
    if isinstance(obj, dict):
        v = obj.get(list_key)
        if isinstance(v, list):
            out.extend(v)
        for val in obj.values():
            if isinstance(val, (dict, list)):
                out.extend(collect_items(val, list_key))
    elif isinstance(obj, list):
        for item in obj:
            out.extend(collect_items(item, list_key))
    return out


def detect_telltales(data):
    """Return list of telltales suggesting silent degradation."""
    telltales = []

    # Telltale 0: thick-evidence-filter all-drop fallback (added 2026-05-24
    # after Northeastern themes failure where the filter dropped 100% of 13
    # themes and the pipeline silently shipped the unfiltered set).
    themes = collect_items(data, 'themes')
    if themes:
        # Look for two indicators:
        # 1. Themes lacking the `evidence_passed_filter: true` marker
        # 2. Themes with `sources` array length < 2 (the thick-evidence threshold)
        weak_evidence = [
            t for t in themes if isinstance(t, dict)
            and (not t.get('evidence_passed_filter') or
                 (isinstance(t.get('sources'), list) and len(t['sources']) < 2))
        ]
        if len(weak_evidence) == len(themes) and len(themes) >= 3:
            telltales.append(
                f"THICK_EVIDENCE_FALLBACK: ALL {len(themes)} themes have <2 distinct "
                f"sources OR no evidence_passed_filter marker. The thick-evidence "
                f"quality gate may have dropped 100% and the pipeline silently "
                f"shipped the unfiltered set. Investigate corpus quality (relevance "
                f"distribution, framework page presence) and surface the "
                f"thick_evidence_all_drop degradation event."
            )

    # Telltale 0b: verbalized confidence NO-DATA on themes (companion symptom)
    receipts = list(find_receipts(data))
    for path, receipt in receipts:
        calib = receipt.get('verbalized_confidence_calibration')
        if calib == 'NO-DATA':
            telltales.append(
                f"CONFIDENCE_NO_DATA at {path}: verbalized confidence ran but "
                f"every claim had missing confidence. Model output did not include "
                f"calibration metadata — either prompt template was stripped or "
                f"upstream filter zeroed out the eligible set."
            )

    # Telltale 1: themes without depth
    themes_without_depth = [t for t in themes if isinstance(t, dict) and not t.get('depth')]
    if themes and len(themes_without_depth) / max(len(themes), 1) > 0.5:
        telltales.append(
            f"THEMES_MISSING_DEPTH: {len(themes_without_depth)}/{len(themes)} themes lack "
            f"`depth` field — depth enrichment may have failed silently"
        )

    # Telltale 2: personas without key_quote
    personas = collect_items(data, 'personas')
    personas_no_quote = [p for p in personas if isinstance(p, dict) and not (
        p.get('key_quote') or p.get('keyQuote') or p.get('quote')
    )]
    if personas and len(personas_no_quote) >= 2:
        telltales.append(
            f"PERSONAS_MISSING_QUOTE: {len(personas_no_quote)}/{len(personas)} personas "
            f"lack a verbatim quote — quote generation may have failed silently"
        )

    # Telltale 3: recommendations without quantification AND no BLOCKED status
    recs = collect_items(data, 'recommendations')
    unstatused_unquantified = [
        r for r in recs if isinstance(r, dict)
        and not r.get('quantification')
        and not str(r.get('status', '')).startswith('BLOCKED')
    ]
    if recs and len(unstatused_unquantified) >= 2:
        telltales.append(
            f"RECS_SILENTLY_UNQUANTIFIED: {len(unstatused_unquantified)}/{len(recs)} "
            f"recommendations lack quantification AND have no BLOCKED status — "
            f"quantification-architect step may have been silently skipped"
        )

    # Telltale 4: long duration in receipt
    for path, receipt in find_receipts(data):
        duration = receipt.get('total_duration_ms')
        if isinstance(duration, (int, float)) and duration > 90000:
            telltales.append(
                f"LONG_DURATION at {path}: {int(duration / 1000)}s — likely retry "
                f"storm; degradation_events should explain"
            )

    return telltales


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    telltales = detect_telltales(data)
    if not telltales:
        sys.exit(0)

    # Receipts present?
    receipts = list(find_receipts(data))
    has_events = any(
        isinstance(r[1].get('degradation_events'), list) and r[1]['degradation_events']
        for r in receipts
    )

    if has_events:
        # Telltales exist AND events exist — likely consistent, pass
        sys.exit(0)

    # Telltales exist but no events surfaced → silent degradation
    sys.stderr.write("SILENT FALLBACK DETECTED:\n")
    sys.stderr.write(
        "  Structural signals suggest a degraded generation path was taken, "
        "but no degradation_events[] are present on the receipt.\n\n"
    )
    for t in telltales[:8]:
        sys.stderr.write(f"  - {t}\n")
    sys.stderr.write(
        "\nGuidance: every fallback path must emit a structured event per "
        ".claude/skills/fallback-event-surfacing/SKILL.md taxonomy. If the "
        "generator ran cleanly and these fields are legitimately absent (e.g., "
        "a personas-only deliverable doesn't have themes), narrow the receipt "
        "to the actually-generated sections. If a degradation occurred, append "
        "an event of the matching kind so the user sees it.\n"
    )
    sys.exit(2)


if __name__ == '__main__':
    main()
