#!/usr/bin/env python3
"""
No-Truncation Validator - content-side enforcement of the no-truncation contract
(2026-06-15). Runs as a Stop-hook validator. Exit 0 = pass, exit 2 = block.

The contract: the model summarizes each field to a COMPLETE thought within its
physical export budget at GENERATION time; the renderer NEVER truncates/clamps.
This hook is the durable guard: it flags any slide field that (a) exceeds its
per-field char budget (which would force the renderer/export to cut it), or
(b) already ends in an ellipsis (a truncation tell). Both signals are exact
(deterministic char count / suffix match), so blocking is high-precision.

Single source of truth for budgets: humans-in-control-research/services/
slideFieldBudgets.json (also imported by the TS summarize-to-budget re-ask in
corpusChatService). Keep the two in lockstep - do NOT hardcode budgets here.
"""
import sys
import json
import re
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))
_BUDGETS_PATH = os.path.join(_REPO, "humans-in-control-research", "services", "slideFieldBudgets.json")

# Identity / attribution keys that are not body content (mirror the TS SKIP set).
SKIP = {"source", "attribution", "url", "date", "id", "model", "template", "brand", "value", "number"}
_WS = re.compile(r"\s+")


def _load_budgets():
    try:
        with open(_BUDGETS_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def _budget_for(budgets, template, field):
    tpl = budgets.get((template or "").lower(), {}) if isinstance(budgets.get((template or "").lower()), dict) else {}
    if isinstance(tpl.get(field), (int, float)):
        return int(tpl[field])
    common = budgets.get("__common", {})
    if isinstance(common.get(field), (int, float)):
        return int(common[field])
    return None


def _norm_len(s):
    return len(_WS.sub(" ", s).strip())


def walk(node, template, budgets, failures, path="$"):
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str):
                if k in SKIP:
                    continue
                t = v.strip()
                if t.endswith("...") or t.endswith("…"):
                    failures.append(f'{path}.{k} ends in an ellipsis (truncation tell): "{t[-50:]}"')
                budget = _budget_for(budgets, template, k)
                if budget is not None and _norm_len(v) > budget:
                    failures.append(f'{path}.{k} is {_norm_len(v)} chars, over its {budget}-char budget (summarize to a complete thought): "{t[:70]}"')
            else:
                walk(v, template, budgets, failures, f"{path}.{k}")
    elif isinstance(node, list):
        for i, item in enumerate(node):
            walk(item, template, budgets, failures, f"{path}[{i}]")


def validate(data, budgets):
    failures = []
    slides = data if isinstance(data, list) else data.get("slides", [])
    if not slides and isinstance(data, dict):
        slides = [data]
    for idx, slide in enumerate(slides or []):
        template = (slide.get("template") if isinstance(slide, dict) else "") or ""
        walk(slide, template, budgets, failures, f"slide[{idx}]")
    return failures[:20]


def main():
    budgets = _load_budgets()
    if not budgets:
        # No budget table available -> cannot enforce; do not block.
        sys.exit(0)
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    failures = validate(data, budgets)
    if failures:
        sys.stderr.write("NO-TRUNCATION VALIDATION FAILED (fields exceed budget / end truncated):\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write("\nContract: summarize each field to a COMPLETE thought within its budget at generation time; the renderer never truncates. Budgets: humans-in-control-research/services/slideFieldBudgets.json.\n")
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
