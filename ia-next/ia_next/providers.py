"""Model calls for IA Next, one function per vendor, each returning (text, usage, raw).

Body rules learned by the 2026-11-11 seat probe are enforced here, at the only place requests are built:
- Claude 5.x (Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.2): no temperature/top_p/top_k, no thinking budget,
  no forced tool_choice, no prefill. Thinking is adaptive; depth is `output_config.effort`.
- GPT-6 family and gpt-5.5: no temperature.
- Gemini: sampling allowed but not needed; search grounding through the `google_search` tool.
Every call is metered into the caller's ledger (plan 6.7: a meter the agent reads, not a count it keeps).
"""
import base64
import json
import time
from dataclasses import dataclass, field

import anthropic
import httpx

from . import config

_anthropic_client = None


def anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY or None, max_retries=3, timeout=600.0)
    return _anthropic_client


@dataclass
class Usage:
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    seconds: float = 0.0
    extra_usd: float = 0.0     # per-call charges that are not token-priced (images, video)

    @property
    def usd(self) -> float:
        inp, out = config.PRICES.get(self.model, config.UNPRICED)
        return round(self.input_tokens / 1e6 * inp + self.output_tokens / 1e6 * out
                     + self.cache_read_tokens / 1e6 * inp * 0.1 + self.extra_usd, 6)


@dataclass
class Ledger:
    """Spend for one task. `limit_usd` is the approved budget; going over raises BudgetExceeded."""
    limit_usd: float = config.TASK_SPEND_APPROVAL_USD
    calls: list = field(default_factory=list)

    @property
    def spent_usd(self) -> float:
        return round(sum(u.usd for u in self.calls), 6)

    def add(self, u: Usage):
        self.calls.append(u)
        record_spend(u)
        if self.spent_usd > self.limit_usd:
            raise BudgetExceeded(self.spent_usd, self.limit_usd)


def record_spend(u: Usage):
    """Every metered call lands in the spend table, so spend by day and by model is visible (plan 6.7).
    Recording never breaks a call."""
    try:
        from . import store
        c = store.conn()
        c.execute("CREATE TABLE IF NOT EXISTS spend (ts REAL, model TEXT, input_tokens INTEGER, output_tokens INTEGER, "
                  "cache_read_tokens INTEGER, usd REAL, seconds REAL)")
        c.execute("INSERT INTO spend VALUES (?,?,?,?,?,?,?)",
                  (time.time(), u.model, u.input_tokens, u.output_tokens, u.cache_read_tokens, u.usd, u.seconds))
    except Exception:
        pass


class BudgetExceeded(RuntimeError):
    def __init__(self, spent, limit):
        super().__init__(f"task spend {spent:.2f} USD passed the approved {limit:.2f} USD")
        self.spent, self.limit = spent, limit


class ProviderError(RuntimeError):
    pass


CLAUDE_REJECTED = ("temperature", "top_p", "top_k")


def claude_body(model, system, messages, max_tokens=16000, effort="medium", tools=None, json_schema=None):
    """Build a Messages body that the Claude 5.x family accepts. Pure, so it is unit-tested."""
    body = {
        "model": model, "max_tokens": max_tokens, "messages": messages,
        "thinking": {"type": "adaptive"},
        "output_config": {"effort": effort},
    }
    if system:
        # Stable system prompt first, cached; volatile content always comes after it (plan 6.7).
        body["system"] = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]
    if tools:
        body["tools"] = tools
        body["tool_choice"] = {"type": "auto"}
    if json_schema:
        body["output_config"]["format"] = {"type": "json_schema", "schema": json_schema}
    for k in CLAUDE_REJECTED:
        body.pop(k, None)
    return body


def claude(model, system, messages, ledger: Ledger = None, **kw):
    """One Claude call. Returns (text, usage, response). Raises ProviderError on refusal or API failure."""
    body = claude_body(model, system, messages, **kw)
    t0 = time.time()
    try:
        if body["max_tokens"] > 16000:
            with anthropic_client().messages.stream(**body) as s:
                resp = s.get_final_message()
        else:
            resp = anthropic_client().messages.create(**body)
    except anthropic.BadRequestError as e:
        raise ProviderError(f"{model} rejected the request: {e.message}") from e
    except anthropic.RateLimitError as e:
        raise ProviderError(f"{model} rate limited") from e
    except anthropic.APIStatusError as e:
        raise ProviderError(f"{model} returned {e.status_code}") from e
    except anthropic.APIConnectionError as e:
        raise ProviderError(f"{model} unreachable") from e
    u = Usage(model, resp.usage.input_tokens, resp.usage.output_tokens,
              getattr(resp.usage, "cache_read_input_tokens", 0) or 0, round(time.time() - t0, 2))
    if ledger is not None:
        ledger.add(u)
    if resp.stop_reason == "refusal":
        cat = getattr(getattr(resp, "stop_details", None), "category", None)
        raise ProviderError(f"{model} declined the request (category {cat})")
    text = "".join(b.text for b in resp.content if b.type == "text")
    return text, u, resp


def openai_body(model, prompt, max_output_tokens=4096, system=None):
    body = {"model": model, "input": prompt, "max_output_tokens": max_output_tokens}
    if system:
        body["instructions"] = system
    # GPT-6 and gpt-5.5 reject temperature; nothing here sends it, for any model.
    return body


def openai_text(model, prompt, ledger: Ledger = None, system=None, max_output_tokens=4096):
    body = openai_body(model, prompt, max_output_tokens, system)
    t0 = time.time()
    r = httpx.post("https://api.openai.com/v1/responses", json=body, timeout=300,
                   headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"})
    if r.status_code != 200:
        raise ProviderError(f"{model} returned {r.status_code}: {r.text[:200]}")
    d = r.json()
    text = d.get("output_text") or "".join(
        c.get("text", "") for it in d.get("output", []) for c in (it.get("content") or []) if c.get("type") in ("output_text", "text"))
    us = d.get("usage") or {}
    u = Usage(model, us.get("input_tokens", 0), us.get("output_tokens", 0), 0, round(time.time() - t0, 2))
    if ledger is not None:
        ledger.add(u)
    return text, u, d


def gemini_generate(model, prompt, ledger: Ledger = None, system=None, search=False, json_schema=None, max_output_tokens=8192):
    """generateContent. With search=True the google_search tool grounds the answer; the grounding
    chunks (uri, title) and supports (text segment -> chunk indices) come back in raw."""
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_output_tokens}}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if search:
        body["tools"] = [{"google_search": {}}]
    if json_schema and not search:
        body["generationConfig"]["responseMimeType"] = "application/json"
        body["generationConfig"]["responseSchema"] = json_schema
    t0 = time.time()
    r = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", json=body,
                   timeout=300, headers={"x-goog-api-key": config.GEMINI_API_KEY})
    if r.status_code != 200:
        raise ProviderError(f"{model} returned {r.status_code}: {r.text[:200]}")
    d = r.json()
    cand = (d.get("candidates") or [{}])[0]
    text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []) if not p.get("thought"))
    um = d.get("usageMetadata") or {}
    u = Usage(model, um.get("promptTokenCount", 0), (um.get("candidatesTokenCount", 0) or 0) + (um.get("thoughtsTokenCount", 0) or 0),
              um.get("cachedContentTokenCount", 0) or 0, round(time.time() - t0, 2))
    if ledger is not None:
        ledger.add(u)
    return text, u, d


def openai_image(model, prompt, ledger: Ledger = None, size="1536x1024"):
    """One still image. Returns PNG bytes."""
    t0 = time.time()
    r = httpx.post("https://api.openai.com/v1/images/generations", timeout=300,
                   headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
                   json={"model": model, "prompt": prompt, "size": size, "n": 1})
    if r.status_code != 200:
        raise ProviderError(f"{model} returned {r.status_code}: {r.text[:200]}")
    d = r.json()
    item = (d.get("data") or [{}])[0]
    if item.get("b64_json"):
        png = base64.b64decode(item["b64_json"])
    elif item.get("url"):
        png = httpx.get(item["url"], timeout=120).content
    else:
        raise ProviderError(f"{model} returned no image")
    u = Usage(model, 0, 0, 0, round(time.time() - t0, 2), extra_usd=0.10)
    if ledger is not None:
        ledger.add(u)
    return png, u


def parse_json(text):
    """Parse a JSON object from model text; tolerate a fenced block. Raises ValueError when absent."""
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        t = t.rsplit("```", 1)[0]
    start, end = t.find("{"), t.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in reply")
    return json.loads(t[start:end + 1])
