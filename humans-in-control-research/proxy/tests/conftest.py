"""Shared test setup for the proxy suite.

2026-10-31 (agent-stack plan, found during the WS-C work): importing `app` runs `_write_runtime_config()`, and the
default runtime directory is the LIVE `hic-workspace/.runtime` (bind-mounted into the containers). A host-side test
run with auth disabled published an empty token there; the next import minted a new one, and every SPA, agent and
MCP call to the running proxy got 401 until the proxy restarted. Tests now get their own runtime directory, set here
before any test module imports `app`.
"""
import os
import tempfile

os.environ.setdefault("HIC_RUNTIME_BASE", tempfile.mkdtemp(prefix="hic-proxy-test-runtime-"))
# Same hazard for the eval lane: `_rescore_recent` writes evals/results/_rescore-<day>.json, and a test that did not
# redirect `_EVALS_DIR` replaced the day's real rescore summary with its fixture. Tests that need eval files set
# `_EVALS_DIR` to their own temp dir; nothing reaches the version-controlled evals/ directory.
os.environ.setdefault("HIC_EVALS_DIR", tempfile.mkdtemp(prefix="hic-proxy-test-evals-"))
