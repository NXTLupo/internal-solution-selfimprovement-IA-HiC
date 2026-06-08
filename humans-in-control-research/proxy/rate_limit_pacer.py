"""rate_limit_pacer.py — provider-aware adaptive concurrency for HiC proxy.

Implementation of the .claude/skills/rate-limit-pacer/SKILL.md contract.
Replaces the process-wide semaphore=3 pattern that caused one provider's 429
to throttle every other provider. Each provider gets its own token bucket;
a 429 on Gemini drops Gemini's concurrency by 50% but does NOT touch
OpenAI or Anthropic.

Design notes:
- In-memory state per provider (no persistence; resets on proxy restart).
- Asyncio-native: uses asyncio.Semaphore + asyncio.Lock.
- Composable with the existing per-call retry in fetch_with_retry and
  the new per-batch retry in wiki_regrade_relevance — the pacer adds
  PROVIDER-isolation; the retry adds per-call resilience. Different layers,
  different jobs.
- Honors Retry-After headers when the upstream sends them.
- Caps maximum total wait per call so a stuck provider can't tie up a
  request forever.
- Emits structured log lines on every 429 + every ease-up transition so
  the user can trace pacing decisions in the proxy log.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional, TypeVar

log = logging.getLogger("rate_limit_pacer")

T = TypeVar("T")


@dataclass
class ProviderConfig:
    """Per-provider bucket parameters (see SKILL.md provider registry)."""
    name: str
    initial_concurrency: int = 8
    min_concurrency: int = 1
    on_429_factor: float = 0.5
    backoff_ms_initial: int = 1000
    backoff_ms_max: int = 60_000
    ease_up_after_successes: int = 20
    fairness_window_ms: int = 30_000
    max_attempts: int = 4

    @property
    def max_total_wait_ms(self) -> int:
        # Hard rule #4: never wait more than 2 * backoff_ms_max in a single call.
        return self.backoff_ms_max * 2


# ---------------------------------------------------------------------------
# Provider registry — match the SKILL.md table.
# ---------------------------------------------------------------------------

PROVIDER_REGISTRY: dict[str, ProviderConfig] = {
    "gemini": ProviderConfig(name="gemini", initial_concurrency=8),
    "anthropic": ProviderConfig(name="anthropic", initial_concurrency=4,
                                 backoff_ms_initial=2000, ease_up_after_successes=15),
    "openai": ProviderConfig(name="openai", initial_concurrency=6),
    "deepseek": ProviderConfig(name="deepseek", initial_concurrency=5),
    "jina_reader": ProviderConfig(name="jina_reader", initial_concurrency=3,
                                   on_429_factor=0.33, backoff_ms_initial=5000,
                                   backoff_ms_max=120_000, ease_up_after_successes=30,
                                   fairness_window_ms=60_000),
    "openalex": ProviderConfig(name="openalex", initial_concurrency=10, min_concurrency=2,
                                backoff_ms_max=30_000, ease_up_after_successes=50),
    "crossref": ProviderConfig(name="crossref", initial_concurrency=8, min_concurrency=2,
                                backoff_ms_max=30_000, ease_up_after_successes=40),
    "semantic_scholar": ProviderConfig(name="semantic_scholar", initial_concurrency=6,
                                        backoff_ms_initial=2000),
    "arxiv": ProviderConfig(name="arxiv", initial_concurrency=4, backoff_ms_initial=2000),
}


def _get_config(provider: str) -> ProviderConfig:
    """Return the registered config for `provider`, or a sensible default."""
    cfg = PROVIDER_REGISTRY.get(provider.lower())
    if cfg is None:
        log.warning(f"[pacer] unknown provider '{provider}' — using default config")
        cfg = ProviderConfig(name=provider.lower())
    return cfg


# ---------------------------------------------------------------------------
# Per-provider bucket state — concurrency, success streak, last-429 time.
# ---------------------------------------------------------------------------

@dataclass
class _BucketState:
    """Mutable per-provider state. Created lazily on first use."""
    cfg: ProviderConfig
    current_concurrency: int = field(init=False)
    sem: asyncio.Semaphore = field(init=False)
    lock: asyncio.Lock = field(init=False)
    success_streak: int = 0
    consecutive_429s: int = 0
    last_429_ts: float = 0.0
    last_ease_up_ts: float = 0.0
    total_calls: int = 0
    total_429s: int = 0
    total_retries: int = 0

    def __post_init__(self):
        self.current_concurrency = self.cfg.initial_concurrency
        self.sem = asyncio.Semaphore(self.current_concurrency)
        self.lock = asyncio.Lock()


# Lazy global bucket map. Keyed by provider name (lower case).
_BUCKETS: dict[str, _BucketState] = {}
_BUCKETS_LOCK = asyncio.Lock()


async def _get_bucket(provider: str) -> _BucketState:
    """Lazy-create the per-provider bucket. Acquire the global lock briefly."""
    key = provider.lower()
    if key in _BUCKETS:
        return _BUCKETS[key]
    async with _BUCKETS_LOCK:
        if key not in _BUCKETS:
            _BUCKETS[key] = _BucketState(cfg=_get_config(key))
        return _BUCKETS[key]


# ---------------------------------------------------------------------------
# Slot acquire / release — the actual concurrency throttle.
# ---------------------------------------------------------------------------

async def acquire_slot(provider: str) -> _BucketState:
    """Block until a concurrency slot opens for `provider`. Returns the bucket
    so the caller can release the same slot they acquired (important when the
    bucket's `current_concurrency` shrinks mid-call due to a 429)."""
    bucket = await _get_bucket(provider)
    await bucket.sem.acquire()
    bucket.total_calls += 1
    return bucket


def release_slot(bucket: _BucketState) -> None:
    """Release a slot previously acquired via `acquire_slot`."""
    try:
        bucket.sem.release()
    except ValueError:
        # Semaphore release imbalance — shouldn't happen but never raise from
        # the release path.
        log.warning(f"[pacer] release_slot imbalance on {bucket.cfg.name}")


# ---------------------------------------------------------------------------
# Bucket adjustments — record outcomes, adjust concurrency, log transitions.
# ---------------------------------------------------------------------------

async def record_success(bucket: _BucketState) -> None:
    """Record a successful call. If the success streak crosses the ease-up
    threshold and concurrency is below initial, raise concurrency by 1."""
    async with bucket.lock:
        bucket.success_streak += 1
        bucket.consecutive_429s = 0
        # Ease-up: every N consecutive successes lift concurrency by 1.
        if (bucket.success_streak >= bucket.cfg.ease_up_after_successes
                and bucket.current_concurrency < bucket.cfg.initial_concurrency):
            old = bucket.current_concurrency
            bucket.current_concurrency += 1
            # Replace semaphore (asyncio doesn't let you mutate a Semaphore's
            # max value; cheapest correct path is to replace the object).
            bucket.sem = asyncio.Semaphore(bucket.current_concurrency)
            bucket.success_streak = 0
            bucket.last_ease_up_ts = time.time()
            log.info(
                f"[pacer] ease-up: {bucket.cfg.name} concurrency {old} -> {bucket.current_concurrency} "
                f"(after {bucket.cfg.ease_up_after_successes} clean successes)"
            )
        # Full-reset path: if it's been 3x fairness_window since the last 429,
        # restore concurrency to initial immediately.
        elapsed_since_429_ms = (time.time() - bucket.last_429_ts) * 1000
        if (bucket.last_429_ts > 0
                and elapsed_since_429_ms > bucket.cfg.fairness_window_ms * 3
                and bucket.current_concurrency < bucket.cfg.initial_concurrency):
            old = bucket.current_concurrency
            bucket.current_concurrency = bucket.cfg.initial_concurrency
            bucket.sem = asyncio.Semaphore(bucket.current_concurrency)
            log.info(
                f"[pacer] full reset: {bucket.cfg.name} concurrency {old} -> "
                f"{bucket.current_concurrency} (no 429s for {bucket.cfg.fairness_window_ms * 3 / 1000:.0f}s)"
            )


async def record_rate_limit(bucket: _BucketState, status: int = 429, detail: str = "") -> None:
    """Record a 429 (or other rate-limit-class outcome). Shrinks concurrency
    by on_429_factor, never below min_concurrency."""
    async with bucket.lock:
        bucket.consecutive_429s += 1
        bucket.success_streak = 0
        bucket.last_429_ts = time.time()
        bucket.total_429s += 1
        old = bucket.current_concurrency
        new = max(bucket.cfg.min_concurrency,
                  int(bucket.current_concurrency * bucket.cfg.on_429_factor))
        if new < old:
            bucket.current_concurrency = new
            bucket.sem = asyncio.Semaphore(bucket.current_concurrency)
            log.warning(
                f"[pacer] 429: {bucket.cfg.name} concurrency {old} -> {new} "
                f"(consecutive_429s={bucket.consecutive_429s}, detail={detail[:120]})"
            )
        else:
            log.warning(
                f"[pacer] 429: {bucket.cfg.name} already at min concurrency {old}; "
                f"consecutive_429s={bucket.consecutive_429s}"
            )


def compute_backoff_ms(bucket: _BucketState, attempt: int, retry_after_s: Optional[float] = None) -> int:
    """Compute backoff in ms for `attempt` (1-based). Honors Retry-After when
    provided. Otherwise: exponential with jitter, capped at backoff_ms_max."""
    if retry_after_s is not None and retry_after_s > 0:
        return min(int(retry_after_s * 1000), bucket.cfg.backoff_ms_max)
    base = bucket.cfg.backoff_ms_initial * (2 ** (attempt - 1))
    jitter = random.randint(0, 500)
    return min(base + jitter, bucket.cfg.backoff_ms_max)


# ---------------------------------------------------------------------------
# Public wrapper — the single function callers use.
# ---------------------------------------------------------------------------

async def with_rate_limit(
    provider: str,
    fn: Callable[[], Awaitable[T]],
    *,
    is_rate_limit_response: Callable[[T], tuple[bool, Optional[float], str]] = None,
    is_rate_limit_exception: Callable[[BaseException], tuple[bool, Optional[float], str]] = None,
) -> T:
    """Wrap an async callable in provider-aware adaptive concurrency.

    Args:
      provider: name from PROVIDER_REGISTRY (or a sensible-default new name).
      fn: a no-arg async callable that performs the actual HTTP request.
      is_rate_limit_response: optional predicate inspecting the success-shape
        result for app-level 429 (e.g. when the upstream returned 200 with a
        JSON body containing {"error": "rate_limit"}). Returns
        (is_429, retry_after_s, detail).
      is_rate_limit_exception: optional predicate inspecting a raised exception
        for rate-limit class (e.g. httpx.HTTPStatusError with .status_code == 429).
        Returns (is_429, retry_after_s, detail).

    Hard ceiling on total wait: 2 * backoff_ms_max per call.
    """
    cfg = _get_config(provider)
    started = time.time()
    attempt = 0
    bucket = None
    last_exc: Optional[BaseException] = None
    last_429_detail = ""
    while True:
        attempt += 1
        if attempt > cfg.max_attempts:
            if last_exc:
                raise last_exc
            raise RuntimeError(f"[pacer] {provider} exhausted {cfg.max_attempts} attempts: {last_429_detail}")
        elapsed_ms = (time.time() - started) * 1000
        if elapsed_ms > cfg.max_total_wait_ms:
            raise RuntimeError(
                f"[pacer] {provider} total wait {elapsed_ms:.0f}ms exceeded ceiling {cfg.max_total_wait_ms}ms"
            )

        bucket = await acquire_slot(provider)
        try:
            result = await fn()
        except BaseException as e:
            release_slot(bucket)
            last_exc = e
            is_429 = False
            retry_after = None
            detail = ""
            if is_rate_limit_exception is not None:
                try:
                    is_429, retry_after, detail = is_rate_limit_exception(e)
                except Exception:
                    is_429 = False
            if is_429:
                last_429_detail = detail
                await record_rate_limit(bucket, status=429, detail=detail)
                bucket.total_retries += 1
                wait_ms = compute_backoff_ms(bucket, attempt, retry_after_s=retry_after)
                log.info(f"[pacer] {provider} 429-exception attempt {attempt}/{cfg.max_attempts}; sleeping {wait_ms}ms")
                await asyncio.sleep(wait_ms / 1000)
                continue
            # Non-429 exception — propagate
            raise

        # Got a result. Optionally inspect it for app-level 429.
        is_app_429 = False
        retry_after = None
        detail = ""
        if is_rate_limit_response is not None:
            try:
                is_app_429, retry_after, detail = is_rate_limit_response(result)
            except Exception:
                is_app_429 = False

        if is_app_429:
            release_slot(bucket)
            last_429_detail = detail
            await record_rate_limit(bucket, status=429, detail=detail)
            bucket.total_retries += 1
            wait_ms = compute_backoff_ms(bucket, attempt, retry_after_s=retry_after)
            log.info(f"[pacer] {provider} app-level 429 attempt {attempt}/{cfg.max_attempts}; sleeping {wait_ms}ms")
            await asyncio.sleep(wait_ms / 1000)
            continue

        # Success.
        await record_success(bucket)
        release_slot(bucket)
        return result


# ---------------------------------------------------------------------------
# Default predicate factories — usable directly with httpx responses.
# ---------------------------------------------------------------------------

def httpx_response_is_rate_limited(resp) -> tuple[bool, Optional[float], str]:
    """Predicate for `with_rate_limit(is_rate_limit_response=...)` when `fn`
    returns an httpx.Response. Honors `Retry-After` header if present."""
    if resp is None:
        return (False, None, "")
    status = getattr(resp, "status_code", None)
    if status == 429:
        retry_after_hdr = None
        try:
            retry_after_hdr = resp.headers.get("Retry-After")
        except Exception:
            pass
        retry_after_s = None
        if retry_after_hdr:
            try:
                retry_after_s = float(retry_after_hdr)
            except (TypeError, ValueError):
                retry_after_s = None
        body_excerpt = ""
        try:
            body_excerpt = (resp.text or "")[:120]
        except Exception:
            pass
        return (True, retry_after_s, body_excerpt)
    return (False, None, "")


def httpx_exception_is_rate_limited(exc: BaseException) -> tuple[bool, Optional[float], str]:
    """Predicate for `with_rate_limit(is_rate_limit_exception=...)` when `fn`
    might raise an httpx.HTTPStatusError. Detects 429 via the .response attr."""
    resp = getattr(exc, "response", None)
    if resp is not None:
        return httpx_response_is_rate_limited(resp)
    return (False, None, "")


# ---------------------------------------------------------------------------
# Telemetry surface — read by quota-monitor subagent and Reasoning Stream.
# ---------------------------------------------------------------------------

def snapshot() -> dict:
    """Return a snapshot of every bucket's current state. Used by
    /api/pacer/status to surface live concurrency + 429 counts."""
    out = {}
    for name, bucket in _BUCKETS.items():
        elapsed_since_429 = (time.time() - bucket.last_429_ts) if bucket.last_429_ts > 0 else None
        out[name] = {
            "initial_concurrency": bucket.cfg.initial_concurrency,
            "current_concurrency": bucket.current_concurrency,
            "min_concurrency": bucket.cfg.min_concurrency,
            "success_streak": bucket.success_streak,
            "consecutive_429s": bucket.consecutive_429s,
            "total_calls": bucket.total_calls,
            "total_429s": bucket.total_429s,
            "total_retries": bucket.total_retries,
            "elapsed_since_last_429_s": round(elapsed_since_429, 1) if elapsed_since_429 else None,
            "ease_up_after_successes": bucket.cfg.ease_up_after_successes,
        }
    return out
