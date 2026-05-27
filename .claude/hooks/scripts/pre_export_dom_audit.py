#!/usr/bin/env python3
"""
Pre-Export DOM Audit — Stop hook (fires when an export is about to run).

Evidence from STRATEGY_DECK_PIPELINE_AUDIT.md:
  - "Export strips backgrounds, shows interactive UI"
  - Delete/Edit buttons visible in the exported PDF

This hook is the static-analysis side of the export-mode contract. The
runtime side lives in the export-paint-sync skill (sets body[data-export-mode]
before html2canvas). This hook validates the CSS contract itself exists
in the codebase, AND validates that every component which renders editor
affordances includes the .editor-only class (or data-editor-only attribute)
so the export-mode CSS rule actually hides them.

Two failure modes this catches:
  1. Someone removes/renames the body[data-export-mode] CSS rule, breaking
     ALL exports silently.
  2. Someone adds a new editor button/menu without the .editor-only class,
     so the export-mode flag doesn't hide it.

This is a STATIC AUDIT, not a runtime check. It runs as a Stop hook when
the model has just written export-adjacent files. It does NOT inspect
runtime DOM — that's the export-render-verifier subagent's job.

Reads JSON deliverable / metadata from stdin (Stop hook contract). If the
metadata indicates an export-related session, audits the codebase for the
CSS contract.

Exit 0 = pass. Exit 2 = block.
"""
import sys
import os
import re
import json

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HIC_ROOT = os.path.join(REPO_ROOT, 'humans-in-control-research')

# Files most likely to touch the export contract
EXPORT_RELATED_GLOBS = (
    os.path.join(HIC_ROOT, 'services', 'exportService.ts'),
    os.path.join(HIC_ROOT, 'components', 'slideTemplates', 'web.tsx'),
    os.path.join(HIC_ROOT, 'components', 'slideTemplates', 'pptx.ts'),
)

# The CSS files that should declare the export-mode contract
CSS_SEARCH_DIRS = (
    os.path.join(HIC_ROOT, 'styles'),
    os.path.join(HIC_ROOT, 'public', 'nu-design-gallery'),
)

# What we expect to find in the stylesheet
EXPORT_MODE_SELECTOR_RE = re.compile(
    r'body\[data-export-mode\][\s\S]{0,200}\.editor-only',
    re.MULTILINE
)

# Editor affordances we expect to be class-tagged
EDITOR_AFFORDANCE_PATTERNS = (
    re.compile(r'>\s*(Delete|Edit|Save|Cancel|Remove)\s*<', re.IGNORECASE),
    re.compile(r'aria-label="(delete|edit|remove)"', re.IGNORECASE),
    re.compile(r'contentEditable\s*=\s*[{"\']true', re.IGNORECASE),
)

# Things that signal a JSX element has the editor-only class
EDITOR_ONLY_TAG_RE = re.compile(
    r'(className|class)=\s*[{"\'][^}"\']*(editor-only|data-editor-only)',
    re.IGNORECASE
)


def is_export_session(data):
    """Heuristic: does the deliverable metadata indicate an export was
    just generated or is about to run?"""
    if not isinstance(data, dict):
        return False
    blob = json.dumps(data, default=str).lower()
    return any(kw in blob for kw in (
        'export', 'pptxgenjs', 'html2canvas', 'jspdf',
        '.pptx', '.pdf', 'download_url', 'exported_at'
    ))


def find_css_contract():
    """Search for the body[data-export-mode] rule in stylesheets."""
    matches = []
    for d in CSS_SEARCH_DIRS:
        if not os.path.isdir(d):
            continue
        for root, _, files in os.walk(d):
            for f in files:
                if not f.endswith('.css'):
                    continue
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8') as fp:
                        content = fp.read()
                    if EXPORT_MODE_SELECTOR_RE.search(content):
                        matches.append(path)
                except Exception:
                    pass
    return matches


def find_orphan_editor_affordances():
    """Find JSX/TSX elements that render an editor affordance but lack
    the editor-only class. Returns list of (file, line, snippet)."""
    findings = []
    # Search the components dir
    components_root = os.path.join(HIC_ROOT, 'components')
    if not os.path.isdir(components_root):
        return findings

    for root, _, files in os.walk(components_root):
        for f in files:
            if not (f.endswith('.tsx') or f.endswith('.jsx')):
                continue
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8') as fp:
                    lines = fp.readlines()
            except Exception:
                continue

            for idx, line in enumerate(lines, start=1):
                for pat in EDITOR_AFFORDANCE_PATTERNS:
                    if pat.search(line):
                        # Look at this line + 3 lines of context above
                        ctx_start = max(0, idx - 4)
                        ctx = ''.join(lines[ctx_start:idx])
                        if not EDITOR_ONLY_TAG_RE.search(ctx):
                            findings.append((
                                os.path.relpath(path, REPO_ROOT),
                                idx,
                                line.strip()[:140]
                            ))
                        break

    return findings


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    if not is_export_session(data):
        # Not an export session; nothing to audit
        sys.exit(0)

    failures = []

    # Check 1: the CSS contract exists
    css_hits = find_css_contract()
    if not css_hits:
        failures.append(
            "MISSING_EXPORT_MODE_CSS: no stylesheet declares "
            "`body[data-export-mode] .editor-only { ... }`. The export-paint-sync "
            "skill sets the body attribute, but without the CSS rule the editor "
            "affordances will still show in exports."
        )

    # Check 2: editor affordances without .editor-only class
    orphans = find_orphan_editor_affordances()
    if orphans:
        failures.append(
            f"ORPHAN_EDITOR_AFFORDANCES: {len(orphans)} JSX element(s) render "
            f"editor UI (Delete/Edit/Save/contentEditable) without the "
            f"`editor-only` class. These will appear in exported PDFs/PPTX."
        )
        for path, line, snippet in orphans[:5]:
            failures.append(f"    - {path}:{line}: {snippet}")
        if len(orphans) > 5:
            failures.append(f"    ... and {len(orphans) - 5} more")

    if failures:
        sys.stderr.write("PRE-EXPORT DOM AUDIT FAILED:\n")
        for f in failures:
            sys.stderr.write(f"  - {f}\n")
        sys.stderr.write(
            "\nGuidance: every interactive editor element rendered inside a slide / "
            "deliverable must carry className=\"editor-only\" (or data-editor-only). "
            "The export-paint-sync skill sets body[data-export-mode]='true' before "
            "capture; the CSS rule `body[data-export-mode] .editor-only { display: "
            "none !important; }` then hides them. Both pieces must exist together — "
            "this hook checks that they do.\n"
        )
        sys.exit(2)
    sys.exit(0)


if __name__ == '__main__':
    main()
