#!/usr/bin/env python3
"""precheck_no_custom_scheme_fetch.py - PreToolUse hook (2026-05-26)

Hard-blocks browser-bundled `fetch()` calls against non-http(s) URL
schemes. Browsers reject custom schemes like `inline://`, `file://`,
`chrome-extension://`, or made-up schemes with:

    Fetch API cannot load <scheme>://<rest>. URL scheme "<scheme>" is not supported.

Today's failure: corpusChatService.ts called fetch(skill.path) where
skill.path was "inline://case-study-template" (a sentinel for an
in-memory skill body, not a real URL). The fetch threw, the skill
loaded with empty body, and the chat fell into a degraded path.

This hook catches the pattern at write time. Same shape as the no-Node-
require hook; same browser-vs-Node trap.

Allowed schemes:
  - http(s)://       — normal HTTP fetch
  - blob:            — Blob URLs
  - data:            — Data URIs
  - relative paths   — fine (Vite resolves)
  - absolute paths   — fine (/api/..., /skills/..., etc.)

Blocked schemes:
  - inline://        — sentinel for in-memory templates
  - file://          — local files (browsers reject)
  - node:            — Node-only module URIs
  - any other custom scheme not in the allowed list

Scope: same as precheck_no_node_require.py — .ts/.tsx/.js/.jsx files
that ship in the Vite browser bundle.

Exit codes:
  0 — clean
  2 — block
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, file_path, normalize_path, allow

# Match fetch("<scheme>://...") OR fetch(`<scheme>://...`) — string OR
# template literal. Captures the scheme so we can allowlist standard ones.
FETCH_SCHEME_PATTERN = re.compile(
    r"""fetch\s*\(\s*[`'"]([A-Za-z][A-Za-z0-9+\-.]*)://""",
)

ALLOWED_SCHEMES = {"http", "https", "blob", "data"}

BROWSER_FILE_EXTS = (".ts", ".tsx", ".mts", ".cts", ".js", ".jsx")
SKIP_PATH_FRAGMENTS = (
    "proxy/",
    "internal-solutions-",
    "mcp-services/",
    "scripts/",
    ".claude/hooks/scripts/",
    "/node_modules/",
)
SKIP_FILE_SUFFIXES = (
    ".test.ts", ".test.tsx", ".test.js",
    ".spec.ts", ".spec.tsx", ".spec.js",
    ".config.ts", ".config.js",
    "vite.config.ts", "vitest.config.ts",
)


def main() -> int:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write"}:
        allow()

    path = file_path(event)
    p = normalize_path(path)

    if not p.endswith(BROWSER_FILE_EXTS):
        allow()
    if any(frag in p for frag in SKIP_PATH_FRAGMENTS):
        allow()
    if any(p.endswith(suf) for suf in SKIP_FILE_SUFFIXES):
        allow()

    tool_input = event.get("tool_input") or event.get("toolInput") or {}
    content = (
        tool_input.get("new_string")
        or tool_input.get("content")
        or tool_input.get("newString")
        or ""
    )
    if not content:
        allow()

    hits: list[str] = []
    for m in FETCH_SCHEME_PATTERN.finditer(content):
        scheme = m.group(1).lower()
        if scheme in ALLOWED_SCHEMES:
            continue
        # Capture a snippet around the hit
        start = max(0, m.start() - 20)
        end = min(len(content), m.end() + 30)
        snippet = content[start:end].replace("\n", " ")
        hits.append(f"{scheme}:// in ...{snippet}...")

    if not hits:
        allow()

    unique = list(dict.fromkeys(hits))[:6]
    msg = [
        "[no-custom-scheme-fetch] Detected fetch() against a non-http(s) URL scheme in a browser-bundled file.",
        "",
        "Browsers reject custom URL schemes with:",
        "  Fetch API cannot load <scheme>://<rest>. URL scheme \"<scheme>\" is not supported.",
        "",
        "On 2026-05-26 corpusChatService.ts:loadSkillContext called fetch('inline://case-study-template')",
        "treating the manifest-side 'inline://' sentinel as a real URL. The fetch threw silently,",
        "the skill loaded with empty body, and the chat fell into a degraded path.",
        "",
        "FIX — handle the custom scheme BEFORE the fetch:",
        "",
        "  if (path.startsWith('inline://')) {",
        "    const template = path.slice('inline://'.length);",
        "    return INLINE_TEMPLATES[template] ?? defaultBody;",
        "  }",
        "  // ... only now fetch the path",
        "  const resp = await fetch(path);",
        "",
        "Allowed schemes: " + ", ".join(sorted(ALLOWED_SCHEMES)) + ".",
        "",
        "Hits in this edit:",
    ]
    for h in unique:
        msg.append(f"  - {h}")
    msg.append("")
    msg.append("Edit blocked. Branch on the scheme before calling fetch().")
    print("\n".join(msg), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
