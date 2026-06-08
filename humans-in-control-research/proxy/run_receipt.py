"""H1.1 — RunReceipt: structured, per-run telemetry for the HiC proxy (2026-06-02).

The audit's #1 cross-cutting gap was silent degradation + no structured run record:
debugging a thin/failed run meant docker-log archaeology, and the cost meter missed
the dominant proxy generation path entirely. This module is the fail-loud answer for
LOCAL single-user use: one structured receipt per run capturing which model served
each stage, latency, token cost, and EVERY degradation event (provider fallback,
empty/thin corpus, truncation, citation drops, skill-load miss). It persists to the
session dir and is returned in the generate response + a GET endpoint, so the operator
sees why a run degraded without reading logs.

Pure accumulator + JSON persistence; no external deps. Records REAL token counts from
provider usage fields only. COST ACCOUNTING IS DEFERRED — it will come later from actual
account API charge data, not estimates; this module does not estimate dollar cost.
"""
from __future__ import annotations

import json
import os
import time
import uuid

_RECEIPT_DIR = "/hic-workspace/sessions/_run-receipts"

class RunReceipt:
    """One structured record per run. Fail-loud: every degrade appends an event."""

    def __init__(self, kind: str = "", goal: str = "", source: str = "artifact-engine",
                 run_id: str | None = None):
        self.run_id = run_id or uuid.uuid4().hex
        self.kind = kind
        self.goal = (goal or "")[:300]
        self.source = source
        self.started = time.time()
        self.attempts: list[dict] = []      # one per provider/model call attempt
        self.degradations: list[dict] = []  # typed downgrade events (the loud part)
        self.coverage: dict = {}            # corpus/citation/source counters
        self.tokens_in = 0
        self.tokens_out = 0
        self.model_final: str | None = None
        self.status = "ok"                  # ok | degraded | failed

    # ── recording ────────────────────────────────────────────────────────────
    def record_attempt(self, model: str, provider: str, ok: bool, latency_ms: int,
                       tokens_in: int = 0, tokens_out: int = 0, error: str | None = None):
        self.attempts.append({
            "model": model, "provider": provider, "ok": ok,
            "latency_ms": latency_ms, "tokens_in": tokens_in, "tokens_out": tokens_out,
            "error": (error or "")[:200] or None,
        })
        self.tokens_in += tokens_in
        self.tokens_out += tokens_out
        if ok:
            self.model_final = model
        return self

    def add_degradation(self, kind: str, detail: str = "", severity: str = "warn"):
        """Every silent fallback the audit flagged becomes a visible event here."""
        self.degradations.append({"kind": kind, "detail": (detail or "")[:300],
                                  "severity": severity, "at_ms": int((time.time() - self.started) * 1000)})
        if severity == "error" and self.status != "failed":
            self.status = "failed"
        elif self.status == "ok":
            self.status = "degraded"
        return self

    def set_coverage(self, **kw):
        self.coverage.update(kw)
        return self

    # ── output ────────────────────────────────────────────────────────────────
    def finalize(self, status: str | None = None) -> "RunReceipt":
        if status:
            self.status = status
        elif self.degradations and self.status == "ok":
            self.status = "degraded"
        self.duration_ms = int((time.time() - self.started) * 1000)
        return self

    def to_dict(self) -> dict:
        return {
            "run_id": self.run_id,
            "kind": self.kind,
            "goal": self.goal,
            "source": self.source,
            "status": self.status,
            "duration_ms": getattr(self, "duration_ms", int((time.time() - self.started) * 1000)),
            "model_final": self.model_final,
            "totals": {"tokens_in": self.tokens_in, "tokens_out": self.tokens_out,
                       "cost_usd": None},  # deferred: from actual account charge data, not estimated
            "attempts": self.attempts,
            "degradations": self.degradations,
            "coverage": self.coverage,
        }

    def persist(self) -> None:
        try:
            os.makedirs(_RECEIPT_DIR, exist_ok=True)
            with open(os.path.join(_RECEIPT_DIR, f"{self.run_id}.json"), "w", encoding="utf-8") as f:
                json.dump(self.to_dict(), f, indent=2)
        except Exception:
            pass  # telemetry must never break a run


def load_receipt(run_id: str) -> dict | None:
    try:
        p = os.path.join(_RECEIPT_DIR, f"{run_id}.json")
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return None


def list_receipts(limit: int = 50) -> list[dict]:
    out = []
    try:
        if os.path.isdir(_RECEIPT_DIR):
            files = sorted(os.listdir(_RECEIPT_DIR), reverse=True)
            for fn in files[:limit]:
                if fn.endswith(".json"):
                    try:
                        with open(os.path.join(_RECEIPT_DIR, fn), encoding="utf-8") as f:
                            d = json.load(f)
                        out.append({k: d.get(k) for k in ("run_id", "kind", "status",
                                    "duration_ms", "model_final", "totals", "degradations")})
                    except Exception:
                        continue
    except Exception:
        pass
    return out


def extract_anthropic_usage(data: dict) -> tuple[int, int]:
    u = (data or {}).get("usage") or {}
    return int(u.get("input_tokens") or 0), int(u.get("output_tokens") or 0)


def extract_gemini_usage(data: dict) -> tuple[int, int]:
    u = (data or {}).get("usageMetadata") or {}
    return int(u.get("promptTokenCount") or 0), int(u.get("candidatesTokenCount") or 0)
