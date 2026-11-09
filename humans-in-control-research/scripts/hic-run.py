#!/usr/bin/env python3
"""Start one HiC deliverable through the proxy's signed inbound webhook and, optionally, wait for the result.

2026-10-31 (agent-stack plan WS-D D3). The client half of POST /api/webhooks/run: signs the body with the
source's secret (HMAC-SHA256 over "<timestamp>.<raw body>"), queues the job, and either hands the result to a
callback URL or polls GET /api/jobs/{id} when --wait is given and a proxy token is available.

  HIC_WEBHOOK_SOURCE=partner-agent HIC_WEBHOOK_SECRET=... \\
    python scripts/hic-run.py --kind recs --goal "..." --corpus-file corpus.txt [--brand nxt]
                              [--callback-url https://...] [--proxy http://127.0.0.1:5012] [--wait 540]
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.request

# the artifact engine's kinds (the same list research-mcp run_deliverable accepts)
KINDS = ["journey", "blueprint", "persona", "gap-analysis", "roadmap", "recommendation", "strategy-slide",
         "org", "arch", "prd", "tech-audit", "competitive", "report"]


def sign(secret: str, ts: str, raw: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), ts.encode("utf-8") + b"." + raw, hashlib.sha256).hexdigest()


def _token(proxy_dir: str) -> str:
    tok = os.environ.get("PROXY_AUTH_TOKEN", "")
    if tok:
        return tok
    try:
        with open(os.path.join(proxy_dir, "..", "hic-workspace", ".runtime", "config.json"), encoding="utf-8") as f:
            return str(json.load(f).get("proxyToken") or "")
    except Exception:
        return ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--kind", required=True, choices=KINDS)
    ap.add_argument("--goal", required=True)
    ap.add_argument("--corpus-file", required=True)
    ap.add_argument("--brand", default="nxt", choices=["nxt", "nu", "deciem"])
    ap.add_argument("--callback-url", default="")
    ap.add_argument("--proxy", default=os.environ.get("HIC_PROXY_URL", "http://127.0.0.1:5012"))
    ap.add_argument("--wait", type=float, default=0.0, help="poll the job up to this many seconds (needs the proxy token)")
    a = ap.parse_args()
    source, secret = os.environ.get("HIC_WEBHOOK_SOURCE", ""), os.environ.get("HIC_WEBHOOK_SECRET", "")
    if not source or not secret:
        print("set HIC_WEBHOOK_SOURCE and HIC_WEBHOOK_SECRET (create one with scripts/webhook-secret.py)")
        return 2
    with open(a.corpus_file, encoding="utf-8") as f:
        corpus = f.read()
    payload = {"op": "/api/artifact/generate", "body": {"kind": a.kind, "goal": a.goal, "corpus": corpus, "brand": a.brand}}
    if a.callback_url:
        payload["callback_url"] = a.callback_url
    raw = json.dumps(payload).encode("utf-8")
    ts = str(int(time.time()))
    req = urllib.request.Request(a.proxy.rstrip("/") + "/api/webhooks/run", data=raw, method="POST", headers={
        "Content-Type": "application/json", "X-HiC-Source": source, "X-HiC-Timestamp": ts,
        "X-HiC-Signature": sign(secret, ts, raw)})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            queued = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"refused: HTTP {e.code} {e.read().decode('utf-8', 'replace')[:300]}")
        return 1
    print(json.dumps(queued))
    if a.wait <= 0:
        return 0
    tok = _token(os.path.dirname(os.path.abspath(__file__)))
    if not tok:
        print("no proxy token for polling; use --callback-url instead")
        return 0
    deadline = time.time() + min(a.wait, 3600)
    while time.time() < deadline:
        st_req = urllib.request.Request(f"{a.proxy.rstrip('/')}/api/jobs/{queued['job_id']}", headers={"x-proxy-token": tok})
        with urllib.request.urlopen(st_req, timeout=30) as r:
            st = json.loads(r.read().decode("utf-8"))
        if st.get("status") not in ("running", "queued"):
            res = st.get("result") if isinstance(st.get("result"), dict) else {}
            print(json.dumps({"status": st.get("status"), "artifact_id": res.get("artifact_id"),
                              "launcher_url": res.get("launcher_url"), "error": st.get("error") or res.get("error")}))
            return 0 if st.get("status") == "done" else 1
        time.sleep(5)
    print("still running; poll GET /api/jobs/" + queued["job_id"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
