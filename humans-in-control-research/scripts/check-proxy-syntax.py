#!/usr/bin/env python3
"""L2 obligation: the proxy must parse. (Inline python -c quoting is mangled by
the Windows shell, so this lives in a file.)"""
import ast
import sys

PATHS = ["proxy/app.py", "proxy/gold_pptx_export.py", "proxy/nxt_diagram_render.py"]

failed = 0
for p in PATHS:
    try:
        ast.parse(open(p, encoding="utf-8").read())
        print(f"OK   {p}")
    except FileNotFoundError:
        print(f"SKIP {p} (not present)")
    except SyntaxError as e:
        print(f"FAIL {p}: {e}")
        failed += 1
sys.exit(1 if failed else 0)
