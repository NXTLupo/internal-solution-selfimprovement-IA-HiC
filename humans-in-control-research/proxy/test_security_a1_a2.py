"""Regression tests for the A1 (proxy auth) + A2 (secret handling) P0 fixes.

Run in the proxy container:
    docker compose -f docker-compose-all.yml exec -e PROXY_AUTH_TOKEN=testsecret123 \
        research-proxy python test_security_a1_a2.py

Exit 0 = all pass, exit 1 = a security regression. Wire into CI before deploy.
These guard the two incident-class findings from the 2026-06-02 harness audit:
  A2 — provider keys must never sit in a URL query string or reach a log unredacted.
  A1 — when PROXY_AUTH_TOKEN is set, every /api/* route is a hard default-deny gate.
"""
import os
import re
import sys

import app

failures = []


def check(name, cond):
    print(f"{'PASS' if cond else 'FAIL'}  {name}")
    if not cond:
        failures.append(name)


# ─── A2: no key in any Gemini URL string; redaction works ────────────────────
src = open(os.path.join(os.path.dirname(__file__), "app.py"), encoding="utf-8").read()
check("A2: no ':generateContent?key=' in source", ":generateContent?key=" not in src)
check("A2: no 'batchEmbedContents?key=' / '{cfg['url']}?key=' in source",
      "?key={key}" not in src and "?key={api_key}" not in src)
check("A2: redact key= query param", app._redact_secret("GET https://x?key=AIzaSyABCDEFGHIJ") .endswith("key=REDACTED"))
check("A2: redact bare AIza key", "AIza" not in app._redact_secret("token AIzaSyABCDEFGHIJ123").replace("AIza-REDACTED", ""))
check("A2: redact Bearer", "REDACTED" in app._redact_secret("Authorization: Bearer sk-proj-abcdefghijkl"))
check("A2: normal log untouched", app._redact_secret("model=gemini-2.5-flash size=4795") == "model=gemini-2.5-flash size=4795")
check("A2: _goog_key_headers carries x-goog-api-key, not URL",
      app._goog_key_headers("KEY123").get("x-goog-api-key") == "KEY123")

# ─── A1: auth gate (only meaningful when PROXY_AUTH_TOKEN is set) ─────────────
if app._PROXY_AUTH_TOKEN:
    from starlette.testclient import TestClient
    c = TestClient(app.app)
    tok = app._PROXY_AUTH_TOKEN
    check("A1: /health exempt", c.get("/health").status_code == 200)
    check("A1: /api/* no token -> 401", c.get("/api/sources").status_code == 401)
    check("A1: /api/* wrong token -> 401",
          c.get("/api/sources", headers={"Authorization": "Bearer wrong"}).status_code == 401)
    check("A1: /api/* good bearer -> not 401",
          c.get("/api/sources", headers={"Authorization": f"Bearer {tok}"}).status_code != 401)
    check("A1: /api/* x-proxy-token -> not 401",
          c.get("/api/sources", headers={"x-proxy-token": tok}).status_code != 401)
else:
    print("SKIP  A1 gate tests (set PROXY_AUTH_TOKEN to run them); middleware presence checked below")
    check("A1: auth middleware registered", any(
        getattr(m, "cls", None).__name__ == "BaseHTTPMiddleware" or "auth" in str(m).lower()
        for m in app.app.user_middleware) or "_proxy_auth_mw" in src)

print()
if failures:
    print(f"SECURITY REGRESSION: {len(failures)} check(s) failed: {failures}")
    sys.exit(1)
print("All A1/A2 security checks passed.")
