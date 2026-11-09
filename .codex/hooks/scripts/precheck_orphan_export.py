#!/usr/bin/env python3
"""
Orphan Export Precheck — PostToolUse hook on Edit/Write of *.ts/*.tsx files.

Catches new orphan exports at write-time so the weekly orphan-code-auditor
subagent has less to clean up. Specifically: when an Edit/Write produces
a new exported symbol in humans-in-control-research/services/ that has no
caller anywhere in the codebase, the hook emits a warning (non-blocking)
so the user can wire it before the orphan accumulates.

Reads the tool result from stdin (PostToolUse contract). Inspects the
written content for new exports; greps the rest of the codebase for
imports of those names. Warns on net-new orphans.

This is a WARNING hook, not a BLOCKING hook (exit 0 with stderr notice).
Blocking writes on this would prevent legitimate "ship file first, wire
in next commit" workflows.
"""
import sys
import os
import re
import json

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HIC_ROOT = os.path.join(REPO_ROOT, 'humans-in-control-research')
SERVICES_DIR = os.path.join(HIC_ROOT, 'services')

EXPORT_PATTERNS = (
    re.compile(r'^export\s+(?:async\s+)?function\s+(\w+)', re.MULTILINE),
    re.compile(r'^export\s+(?:const|let|var)\s+(\w+)', re.MULTILINE),
    re.compile(r'^export\s+class\s+(\w+)', re.MULTILINE),
    re.compile(r'^export\s+(?:abstract\s+)?(?:class|interface|type)\s+(\w+)', re.MULTILINE),
)


def get_file_path_and_content(tool_input):
    """Extract written file path + content from PostToolUse payload."""
    if not isinstance(tool_input, dict):
        return None, None
    # PostToolUse nests tool_response inside the payload sometimes
    args = tool_input.get('tool_input') or tool_input.get('toolInput') or {}
    file_path = args.get('file_path') or args.get('filePath')
    if not file_path:
        return None, None

    # Get the resulting content; for Write it's `content`, for Edit it's the file post-edit
    # We'll just re-read the file (it's been written by the tool already)
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return file_path, f.read()
        except Exception:
            pass
    return file_path, None


def is_services_ts(path):
    if not path:
        return False
    norm = os.path.normpath(path).replace('\\', '/')
    return '/humans-in-control-research/services/' in norm and (
        norm.endswith('.ts') or norm.endswith('.tsx')
    )


def extract_exports(content):
    """Return list of exported symbol names."""
    if not content:
        return []
    names = set()
    for pat in EXPORT_PATTERNS:
        for m in pat.finditer(content):
            names.add(m.group(1))
    return sorted(names)


def has_caller(symbol, exclude_file):
    """Check if any other file in HIC_ROOT imports this symbol."""
    if not symbol or len(symbol) < 3:
        return True  # too short, can't safely check
    # Grep for `<symbol>` as a word in *.ts/*.tsx files outside exclude_file
    pattern = re.compile(r'\b' + re.escape(symbol) + r'\b')
    for root, dirs, files in os.walk(HIC_ROOT):
        # Skip node_modules / dist / build outputs
        if 'node_modules' in root or 'dist' in root or 'build' in root:
            continue
        for f in files:
            if not (f.endswith('.ts') or f.endswith('.tsx')
                    or f.endswith('.js') or f.endswith('.jsx')):
                continue
            path = os.path.join(root, f)
            if os.path.abspath(path) == os.path.abspath(exclude_file):
                continue
            try:
                with open(path, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                if pattern.search(content):
                    return True
            except Exception:
                continue
    return False


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    file_path, content = get_file_path_and_content(payload)
    if not is_services_ts(file_path) or not content:
        sys.exit(0)

    exports = extract_exports(content)
    if not exports:
        sys.exit(0)

    orphans = []
    for sym in exports:
        if not has_caller(sym, file_path):
            orphans.append(sym)

    if orphans:
        sys.stderr.write(
            f"ORPHAN EXPORT WARNING: {len(orphans)} new export(s) in "
            f"{os.path.relpath(file_path, REPO_ROOT)} have no caller in the codebase:\n"
        )
        for sym in orphans[:10]:
            sys.stderr.write(f"  - {sym}()\n")
        if len(orphans) > 10:
            sys.stderr.write(f"  ... and {len(orphans) - 10} more\n")
        sys.stderr.write(
            "\nThis is a non-blocking warning. If you intend to wire these in a "
            "follow-up edit, no action needed. If they are leftover scaffolding "
            "from an abandoned approach, delete them before committing. The "
            "orphan-code-auditor subagent will catch them weekly if not wired.\n"
        )
        # Exit 0 — this is a warning, not a block. Writes proceed.
    sys.exit(0)


if __name__ == '__main__':
    main()
