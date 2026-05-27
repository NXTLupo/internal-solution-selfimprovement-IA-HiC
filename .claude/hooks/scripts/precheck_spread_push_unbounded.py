#!/usr/bin/env python3
"""precheck_spread_push_unbounded.py - PreToolUse hook (2026-05-26)

Warns on `array.push(...otherArray)` patterns in TS/TSX files where the
spread source is not visibly bounded by a slice/take/.slice() call.

Why a hook?
  The V8 stack-overflow at ~125,000 spread arguments is invisible in
  small-fixture tests and only surfaces when the spread source grows past
  the limit in production. wikiLintService.ts on 2026-05-26 had 11 such
  push-spread sites; the broken-link checker emitted 17,775 findings and
  the spread blew the stack as `RangeError: Maximum call stack size
  exceeded`.

  The fix is mechanical (replace `arr.push(...big)` with a bounded helper
  that uses `.concat()` when `big.length >= 1000`), but only IF someone
  catches the pattern at write time. This hook is that catch.

False-positive policy:
  The hook WARNS but does NOT block (exit 0 always). The user can spread
  hundreds of items safely; the danger zone is thousands. We don't know
  the actual array size at write time, so blocking would be over-eager.
  A warning that surfaces the pattern + the recommended fix is sufficient.

Scope:
  Fires on Edit and Write for `.ts` and `.tsx` files. Skips Markdown,
  JSON, and Python — those don't have this V8 quirk.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib import read_event, tool_name, file_path, normalize_path, allow

# Match `<ident>.push(...<ident>)` where the spread source is a bare identifier.
# We intentionally do NOT match `arr.push(...other.slice(0, N))` or
# `arr.push(...other.filter(...))` — those are explicitly bounded by the
# slice/filter operation, so the V8 stack-overflow risk is minimal.
PUSH_SPREAD_BARE = re.compile(
    r"\b([A-Za-z_$][\w$]*)\.push\(\s*\.\.\.\s*([A-Za-z_$][\w$]*)\s*\)"
)


def main() -> None:
    event = read_event()
    if tool_name(event) not in {"Edit", "Write"}:
        allow()

    path = file_path(event)
    p = normalize_path(path)
    if not (p.endswith(".ts") or p.endswith(".tsx")):
        allow()

    # Read the proposed new_string (Edit) or content (Write) and scan.
    # The exact key varies by harness version; check the common ones.
    tool_input = event.get("tool_input") or event.get("toolInput") or {}
    content = (
        tool_input.get("new_string")
        or tool_input.get("content")
        or tool_input.get("newString")
        or ""
    )
    if not content:
        allow()

    hits = PUSH_SPREAD_BARE.findall(content)
    if not hits:
        allow()

    # Deduplicate by (target, source) pair so we don't spam the user when
    # the same call appears 10 times.
    unique_hits = sorted(set(hits))[:6]
    msg_lines = [
        "[spread-push-unbounded] Detected `arr.push(...other)` in a TypeScript file.",
        "",
        "This pattern blows V8's argument-count stack at ~125,000 spread items.",
        "On 2026-05-26 it caused `RangeError: Maximum call stack size exceeded`",
        "in wikiLintService.ts when the broken-link checker emitted 17,775",
        "findings. Small-fixture tests passed; production-scale data crashed.",
        "",
        "Recommended fix — replace with a bounded helper:",
        "",
        "  const append = (arr: T[]) => {",
        "      if (!arr || arr.length === 0) return;",
        "      if (arr.length < 1000) target.push(...arr);",
        "      else target = target.concat(arr);",
        "  };",
        "",
        "Or `target = target.concat(otherArray)` directly.",
        "",
        "Suspected sites in this edit:",
    ]
    for target, source in unique_hits:
        msg_lines.append(f"  - {target}.push(...{source})")
    msg_lines.append("")
    msg_lines.append("This is a WARNING only. The edit will proceed.")
    msg_lines.append("If `" + unique_hits[0][1] + "` is guaranteed bounded (size cap), ignore.")

    # Emit warning to stderr but exit 0 so the edit proceeds. The user sees
    # the warning; nothing is blocked.
    print("\n".join(msg_lines), file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    main()
