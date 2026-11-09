#!/usr/bin/env python3
"""
Framework Page Existence Validator — Stop hook.

Evidence from 2026-05-24 Northeastern run:
  - :5011/hic-workspace/wiki/frameworks/case-study.md — 404 (Not Found)

The case-study framework page that loadGenerationContext() expects does
not exist. Without it, every case-study slide is generated without the
framework's evidence-density floor, anti-patterns, content budgets, and
brand-token rules. The pipeline did not fail loudly — it generated anyway,
producing the visually broken slides documented in
wiki/synthesis/export-failures.md.

This hook walks the deliverable for `template=<name>` references and
verifies a corresponding `wiki/frameworks/<name>.md` exists on disk.
For each slide, also verifies the anti-patterns/<name>.md exists.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import os
import re
import json

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HIC_ROOT = os.path.join(REPO_ROOT, 'humans-in-control-research')
FRAMEWORKS_DIR = os.path.join(HIC_ROOT, 'hic-workspace', 'wiki', 'frameworks')
ANTI_PATTERNS_DIR = os.path.join(HIC_ROOT, 'hic-workspace', 'wiki', 'anti-patterns')

# Template name appears in :::slide template=X brand=Y blocks
# AND in slide objects with `template: "X"` field
SLIDE_TEMPLATE_RE = re.compile(r'template\s*[=:]\s*["\']?([\w-]+)', re.IGNORECASE)

# Map deliverable-type names to framework page names
DELIVERABLE_TYPE_TO_FRAMEWORK = {
    'personas': 'personas',
    'persona_set': 'personas',
    'themes': 'themes',
    'theme_set': 'themes',
    'recommendations': 'recommendations',
    'recommendation_set': 'recommendations',
    'gap_analysis': 'gap-analysis',
    'gap_set': 'gap-analysis',
    'roadmap': 'roadmap',
    'roadmap_items': 'roadmap',
    'journey_map': 'journey-map',
    'journey': 'journey-map',
    'service_blueprint': 'service-blueprint',
    'blueprint': 'service-blueprint',
    'competitive_analysis': 'competitive-analysis',
    'competitive_set': 'competitive-analysis',
    'tech_audit': 'tech-audit',
    'tech_architecture': 'tech-architecture',
    'prd': 'prd',
}


def find_template_refs(obj):
    """Yield every slide template name referenced in the deliverable."""
    out = set()
    if isinstance(obj, dict):
        # Explicit slide field
        v = obj.get('template') or obj.get('templateId') or obj.get('layout')
        if isinstance(v, str) and v.strip():
            out.add(v.strip().lower())
        # Slide-formatted blocks may live as strings
        for k, val in obj.items():
            if isinstance(val, str):
                for m in SLIDE_TEMPLATE_RE.findall(val):
                    out.add(m.strip().lower())
            elif isinstance(val, (dict, list)):
                out |= find_template_refs(val)
    elif isinstance(obj, list):
        for item in obj:
            out |= find_template_refs(item)
    elif isinstance(obj, str):
        for m in SLIDE_TEMPLATE_RE.findall(obj):
            out.add(m.strip().lower())
    return out


def find_deliverable_types(obj):
    """Identify which deliverable-type generators ran by looking at top-level
    keys: themes, personas, recommendations, etc."""
    types = set()
    if isinstance(obj, dict):
        for key in obj.keys():
            normalized = key.strip().lower()
            if normalized in DELIVERABLE_TYPE_TO_FRAMEWORK:
                types.add(normalized)
        for v in obj.values():
            if isinstance(v, dict):
                types |= find_deliverable_types(v)
    return types


def framework_exists(name):
    """Check whether wiki/frameworks/<name>.md exists."""
    path = os.path.join(FRAMEWORKS_DIR, f"{name}.md")
    return os.path.isfile(path), path


def antipattern_exists(name):
    """Check whether wiki/anti-patterns/<name>.md exists."""
    path = os.path.join(ANTI_PATTERNS_DIR, f"{name}.md")
    return os.path.isfile(path), path


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    failures = []
    # Collect framework names from both surfaces
    needed_frameworks = set()

    # Slide templates each need their own framework page
    template_refs = find_template_refs(data)
    for t in template_refs:
        needed_frameworks.add(t)

    # Deliverable types
    deliverable_types = find_deliverable_types(data)
    for dt in deliverable_types:
        fw = DELIVERABLE_TYPE_TO_FRAMEWORK.get(dt)
        if fw:
            needed_frameworks.add(fw)

    if not needed_frameworks:
        sys.exit(0)

    missing_frameworks = []
    missing_antipatterns = []

    for name in needed_frameworks:
        fw_exists, fw_path = framework_exists(name)
        if not fw_exists:
            missing_frameworks.append((name, fw_path))
        ap_exists, ap_path = antipattern_exists(name)
        if not ap_exists:
            missing_antipatterns.append((name, ap_path))

    if missing_frameworks:
        failures.append(
            f"MISSING_FRAMEWORK_PAGES: {len(missing_frameworks)} deliverable "
            f"type(s) referenced this generation but have no framework page:"
        )
        for name, path in missing_frameworks:
            failures.append(
                f"    - wiki/frameworks/{name}.md (resolved path: {path})"
            )

    if missing_antipatterns and not missing_frameworks:
        # Missing anti-patterns alone is a warning, not a hard fail
        failures.append(
            f"MISSING_ANTI_PATTERN_PAGES: {len(missing_antipatterns)} type(s) "
            f"missing anti-pattern guidance. Less critical than missing frameworks "
            f"but generation will lack failure-mode awareness:"
        )
        for name, path in missing_antipatterns:
            failures.append(f"    - wiki/anti-patterns/{name}.md")

    if missing_frameworks:
        sys.stderr.write("FRAMEWORK PAGE EXISTENCE VALIDATION FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nThis matches the 2026-05-24 Northeastern failure where "
            ":5011/hic-workspace/wiki/frameworks/case-study.md returned 404. "
            "loadGenerationContext() depends on these framework pages to inject "
            "evidence-density rules, content budgets, brand tokens, and "
            "anti-patterns into the generation prompt. Missing framework page = "
            "deliverable generated without its quality discipline.\n\n"
            "Create the missing pages following the schema in hic-workspace/AGENTS.md "
            "before regenerating.\n"
        )
        sys.exit(2)

    if missing_antipatterns:
        sys.stderr.write("FRAMEWORK PAGE EXISTENCE WARNING:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        # Warning only — exit 0
    sys.exit(0)


if __name__ == '__main__':
    main()
