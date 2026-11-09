#!/usr/bin/env python3
"""precheck_no_node_require.py - PreToolUse hook (2026-05-26)

Hard-blocks Node-style `require()` calls in browser-bundled TypeScript /
JavaScript files. Vite bundles for the browser have NO `require` global;
any code path that hits a `require()` throws
`ReferenceError: require is not defined` at runtime, silently breaking
the click handler / function that called it.

This hook fires the kind of error that should never reach production but
historically has (today: corpusChatService.ts:1913 used
`require('./hashtagRegistry')` inside extractHashtagDirectives, breaking
every hashtag-routed onClick handler in the chat panel — exactly the
"play whack-a-mole" failure mode this hook exists to prevent).

Scope:
  - .ts, .tsx, .mts, .cts, .js, .jsx files
  - Excludes: anything under proxy/, internal-solutions-*/, mcp-services/,
    scripts/, *.config.{ts,js}, **/*.test.{ts,tsx}, **/*.spec.{ts,tsx},
    .claude/hooks/scripts/ (Python-imports there are fine but the hook
    skips the directory entirely)

Allowed `require` patterns:
  - require.resolve(...)   — Node-only, blocked separately if seen
  - require('node:fs')     — bare Node modules, only allowed in proxy/

Blocked patterns (the actual bug class):
  - require('./relative')  — Node-style module load that won't bundle
  - require("../up/path")  — same
  - require(varname)       — dynamic require, never works in browser

Exit codes:
  0 — clean
  2 — block + show fix recommendation
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, file_path, normalize_path, allow

REQUIRE_RELATIVE_PATTERN = re.compile(
    r"""require\s*\(\s*['"](\.\.?/[^'"]+|@[^'"]*/[^'"]+)['"]\s*\)""",
    re.MULTILINE,
)
REQUIRE_DYNAMIC_PATTERN = re.compile(
    r"""require\s*\(\s*[A-Za-z_$][\w$]*\s*\)""",
    re.MULTILINE,
)

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

    # Scope check: only browser-bundled files
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

    rel_hits = REQUIRE_RELATIVE_PATTERN.findall(content)
    dyn_hits = REQUIRE_DYNAMIC_PATTERN.findall(content)

    if not rel_hits and not dyn_hits:
        allow()

    msg = [
        "[no-node-require] Detected Node-style `require(...)` in a browser-bundled file.",
        "",
        "Vite bundles for the browser have NO `require` global. Any code path that",
        "hits one of these patterns throws `ReferenceError: require is not defined`",
        "at runtime, silently breaking the click handler or function that called it.",
        "",
        "On 2026-05-26 this exact bug shipped in corpusChatService.ts:1913 and broke",
        "every hashtag-routed onClick in the chat panel until it was caught manually.",
        "",
        "FIX — replace with one of:",
        "",
        "  1. Static ESM import at the top of the file:",
        "       import { thing } from './module';",
        "     (preferred — no circular risk if the target module is leaf)",
        "",
        "  2. Dynamic ESM import (returns a Promise):",
        "       const { thing } = await import('./module');",
        "     (only inside async functions; respects code-splitting)",
        "",
        "  3. Type-only import if you only need types:",
        "       import type { Thing } from './module';",
        "     (zero runtime cost)",
        "",
    ]
    if rel_hits:
        msg.append("Relative-path requires detected:")
        for h in rel_hits[:6]:
            msg.append(f"  - require('{h}')")
        msg.append("")
    if dyn_hits:
        msg.append("Dynamic-identifier requires detected (never work in browser):")
        for h in dyn_hits[:6]:
            msg.append(f"  - {h}")
        msg.append("")
    msg.append("Edit blocked. Replace the require with a static or dynamic ESM import.")

    print("\n".join(msg), file=sys.stderr)
    return 2  # block


if __name__ == "__main__":
    sys.exit(main())
