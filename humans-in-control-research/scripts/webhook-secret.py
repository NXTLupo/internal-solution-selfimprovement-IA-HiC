#!/usr/bin/env python3
"""Create, list or revoke the per-source secrets for the proxy's signed inbound webhook (POST /api/webhooks/run).

2026-10-31 (agent-stack plan WS-D D3, owner decision 5: no secret, no endpoint). The proxy answers 404 on the
webhook until at least one source has a secret here. Secrets live in hic-workspace/.runtime/webhook-secrets.json
(gitignored; nginx denies .runtime). A new secret is printed ONCE; give it to the calling platform and keep it
out of chat, commits and tickets.

  python scripts/webhook-secret.py create partner-agent     # creates or rotates, prints the secret once
  python scripts/webhook-secret.py list                     # source names only
  python scripts/webhook-secret.py revoke partner-agent
"""
from __future__ import annotations

import json
import os
import re
import secrets
import sys

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "hic-workspace", ".runtime", "webhook-secrets.json")


def _load() -> dict:
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            data = json.load(f) or {}
    except FileNotFoundError:
        data = {}
    data.setdefault("sources", {})
    return data


def _save(data: dict) -> None:
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    tmp = PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, PATH)


def main(argv: list) -> int:
    if not argv or argv[0] not in ("create", "list", "revoke"):
        print(__doc__)
        return 2
    data = _load()
    if argv[0] == "list":
        for name in sorted(data["sources"]):
            print(name)
        return 0
    if len(argv) < 2 or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{1,63}", argv[1]):
        print("source must be 2-64 chars of a-z 0-9 . _ -")
        return 2
    src = argv[1]
    if argv[0] == "revoke":
        existed = data["sources"].pop(src, None) is not None
        _save(data)
        print(f"revoked {src}" if existed else f"{src} had no secret")
        return 0
    secret = secrets.token_urlsafe(32)
    data["sources"][src] = secret
    _save(data)
    print(f"source: {src}\nsecret: {secret}\n(shown once; the proxy reads it on the next request, no restart)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
