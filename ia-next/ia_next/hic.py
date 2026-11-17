"""IA Next's link to HiC's engine (enhancement plan Part 2).

Owner decision, 17 November 2026: IA Next calls HiC's research proxy through the host, with the token HiC already
publishes; the two systems keep separate networks, data and ports. The link is optional. When the suite is not
running, every call raises HicUnavailable with a reason a person can read, and IA Next falls back to what it can do
on its own.

The proxy listens on the host's 127.0.0.1:5012; from inside the IA Next container the host is host.docker.internal.
The token is read from the runtime config HiC publishes (mounted read-only at /hic-workspace/.runtime), on every call,
because HiC makes a new token each time its proxy starts. The token is never logged or returned.
"""
import base64
import json
import os

import httpx

HIC_URL = os.environ.get("IA_NEXT_HIC_URL", "http://host.docker.internal:5012").rstrip("/")
RUNTIME_CONFIG = os.environ.get("IA_NEXT_HIC_RUNTIME", "/hic-workspace/.runtime/config.json")
MAX_UPLOAD_BYTES = 18 * 1024 * 1024          # HiC reads scanned PDFs with vision up to this size

# Files IA Next hands to HiC to read (PDF text and scanned-PDF OCR, Word, PowerPoint, Excel, images).
DOC_EXT = (".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".json", ".xml",
           ".png", ".jpg", ".jpeg", ".gif", ".webp")


class HicUnavailable(RuntimeError):
    """HiC's proxy cannot be reached or refused the call; the message says why in plain words."""


def _token():
    tok = os.environ.get("IA_NEXT_HIC_TOKEN", "").strip()
    if tok:
        return tok
    try:
        with open(RUNTIME_CONFIG, encoding="utf-8") as fh:
            return str((json.load(fh) or {}).get("proxyToken") or "").strip()
    except (OSError, ValueError):
        return ""


def _headers():
    h = {"x-hic-session": "ia-next"}
    tok = _token()
    if tok:
        h["x-proxy-token"] = tok
    return h


def _call(method, path, timeout, **kw):
    try:
        r = httpx.request(method, HIC_URL + path, headers=_headers(), timeout=timeout, **kw)
    except httpx.HTTPError:
        raise HicUnavailable("HiC is not running, so this needs the suite: start it with "
                             "docker compose -f docker-compose-all.yml up -d")
    if r.status_code in (401, 403):
        raise HicUnavailable("HiC refused IA Next's call (its token was not accepted); restart IA Next after HiC starts")
    if r.status_code >= 400:
        raise HicUnavailable(f"HiC could not do this (HTTP {r.status_code})")
    try:
        return r.json()
    except ValueError:
        raise HicUnavailable("HiC answered with something that is not JSON")


def available(timeout=3.0):
    """True when HiC's proxy answers its health check."""
    try:
        return _call("GET", "/health", timeout).get("status") == "healthy"
    except HicUnavailable:
        return False


def parse_upload(filename, data, mime=""):
    """Plain text from a PDF, Word, PowerPoint, Excel or image file, read by HiC's /api/parse-upload. Returns
    {"text", "method"}; raises HicUnavailable when HiC cannot be reached and ValueError when the file has no
    readable text. Text read from a file is data, never instructions."""
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError(f"the file is over {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")
    out = _call("POST", "/api/parse-upload", 300,
                json={"filename": filename, "base64": base64.b64encode(data).decode("ascii"), "mimeType": mime or ""})
    text = str(out.get("text") or "").strip()
    if not text:
        raise ValueError(str(out.get("error") or "no readable text was found in the file"))
    return {"text": text, "method": str(out.get("method") or "")}
