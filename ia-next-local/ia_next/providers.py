"""Model calls for IA Next Local. The functions keep the names, arguments and return shapes of IA Next's providers
(claude, openai_text, gemini_generate, openai_image: each returns (text, usage, raw)), so every specialist calls them
unchanged; all of them are answered by open-weight models on this machine.

- Text, tools, JSON-schema output and image input go to Ollama on the host (/api/chat). A reply is handed back in
  the Messages shape the agent's tool loop reads (content blocks of type text and tool_use, stop_reason).
- A seat's model is the first installed model of its chain (config.SEATS); the model that actually answered is the
  one metered, and a substitution is recorded once as an event, never silent.
- Search grounding is the self-hosted search adapter (localsearch.py); pictures are ComfyUI (localmedia.py).
- Nothing here can spend: no key exists in this build, and _install_guard refuses any request, from any module in
  the process, to a metered model host (config.METERED_HOSTS).
Every call is still metered into the caller's ledger: tokens, seconds and model, at 0.00 USD.
"""
import base64
import contextvars
import json
import os
import re
import threading
import time
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

from . import config


class ProviderError(RuntimeError):
    pass


# ---- the guard: this process never talks to a metered model host --------------------------------------------------
def _refuse(url):
    host = (urlparse(str(url)).hostname or "").lower()
    if any(host == h or host.endswith("." + h) for h in config.METERED_HOSTS):
        raise ProviderError(f"IA Next Local refused a request to {host}: this build makes no call to a paid model API")


def _install_guard():
    if getattr(httpx.Client, "_ia_local_guard", False):
        return
    send, asend = httpx.Client.send, httpx.AsyncClient.send

    def guarded(self, request, *a, **k):
        _refuse(request.url)
        return send(self, request, *a, **k)

    async def aguarded(self, request, *a, **k):
        _refuse(request.url)
        return await asend(self, request, *a, **k)
    httpx.Client.send, httpx.AsyncClient.send = guarded, aguarded
    httpx.Client._ia_local_guard = True


_install_guard()


# ---- metering (unchanged shape; local calls cost nothing) ----------------------------------------------------------
@dataclass
class Usage:
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    seconds: float = 0.0
    extra_usd: float = 0.0
    cache_write_tokens: int = 0
    # Plan WS-2 step 1 (uplift plan 2026-11-23): what the local server did with the prompt. Measured 23 Nov on Ollama
    # 0.40.16: prompt_eval_count is the WHOLE prompt even when its prefix comes from the cache (1,819 tokens both
    # times); only prompt_eval_duration drops (0.306 s to 0.005 s). So reuse is read from time: prompt_seconds against
    # the model's full-evaluation rate (cache_report). load_seconds above one second means the model was loaded, and a
    # changed num_ctx reloads it (measured: 3.4 s for the 2B model, the cache lost with it).
    sent_tokens: int = 0
    tokens_per_second: float = 0.0     # generation rate of this call (field test 23 Nov, S1)
    load_seconds: float = 0.0
    prompt_seconds: float = 0.0
    num_ctx: int = 0

    @property
    def usd(self) -> float:
        return 0.0                      # confirmed local inference: no external charge (guide, step 4)


@dataclass
class Ledger:
    """Calls made for one task. Local calls cost 0.00, so the budget never trips; Stop still takes effect after the
    call in flight, and every call lands in the spend table with its tokens, seconds and model."""
    limit_usd: float = config.TASK_SPEND_APPROVAL_USD
    calls: list = field(default_factory=list)
    task_id: str = ""
    purpose: str = ""

    @property
    def spent_usd(self) -> float:
        return round(sum(u.usd for u in self.calls), 6)

    def add(self, u: Usage):
        self.calls.append(u)
        record_spend(u, self.task_id or self.purpose)
        if self.spent_usd > self.limit_usd:
            raise BudgetExceeded(self.spent_usd, self.limit_usd)
        if self.task_id:
            from . import store
            store.check_stop(self.task_id, self.spent_usd)


def _spend_table(c):
    c.execute("CREATE TABLE IF NOT EXISTS spend (ts REAL, model TEXT, input_tokens INTEGER, output_tokens INTEGER, "
              "cache_read_tokens INTEGER, usd REAL, seconds REAL)")
    have = {r[1] for r in c.execute("PRAGMA table_info(spend)")}
    for col, kind in (("cache_write_tokens", "INTEGER DEFAULT 0"), ("label", "TEXT DEFAULT ''"),
                      ("sent_tokens", "INTEGER DEFAULT 0"), ("load_seconds", "REAL DEFAULT 0"),
                      ("prompt_seconds", "REAL DEFAULT 0"), ("num_ctx", "INTEGER DEFAULT 0"), ("trace", "TEXT DEFAULT ''")):
        if col not in have:
            c.execute(f"ALTER TABLE spend ADD COLUMN {col} {kind}")


# The models that actually answered inside the step that is running (store._Stage sets a list here). A step is
# opened with the model its seat names; when a slow or missing model hands the call to another, the card must name
# the one that answered (field test 23 Nov, P2: a prototype card named a model that had not written it).
ANSWERED = contextvars.ContextVar("ia_next_answered", default=None)


def record_spend(u: Usage, label: str = ""):
    seen = ANSWERED.get()
    if seen is not None and getattr(u, "model", ""):
        seen.append(u.model)
    try:
        from . import store
        c = store.conn()
        _spend_table(c)
        c.execute("INSERT INTO spend (ts, model, input_tokens, output_tokens, cache_read_tokens, usd, seconds, "
                  "cache_write_tokens, label, sent_tokens, load_seconds, prompt_seconds, num_ctx, trace) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  (time.time(), u.model, u.input_tokens, u.output_tokens, u.cache_read_tokens, u.usd, u.seconds,
                   u.cache_write_tokens, label or "", getattr(u, "sent_tokens", 0), getattr(u, "load_seconds", 0.0),
                   getattr(u, "prompt_seconds", 0.0), getattr(u, "num_ctx", 0), store.TRACE.get()))
    except Exception:
        pass


def cache_report(label):
    """How the local server treated one task's prompts (plan WS-2 step 1): calls, model loads, prompt tokens sent
    versus evaluated, and the share reused from the prefix cache. {} when the task made no recorded call."""
    try:
        from . import store
        c = store.conn()
        _spend_table(c)
        rows = c.execute("SELECT model, input_tokens, output_tokens, seconds, sent_tokens, load_seconds, prompt_seconds, num_ctx "
                         "FROM spend WHERE label = ? ORDER BY ts", (label,)).fetchall()
    except Exception:
        return {}
    if not rows:
        return {}
    sent = sum(int(r["sent_tokens"] or 0) for r in rows)
    loads = [r for r in rows if float(r["load_seconds"] or 0) > 1.0]
    # A call that loaded its model evaluated its whole prompt: those calls give each model's full rate (tokens a
    # second). Tokens the other calls evaluated afresh = their prompt seconds at that rate; the rest came from the cache.
    rates = {}
    try:
        for r in c.execute("SELECT model, sent_tokens, prompt_seconds FROM spend WHERE load_seconds > 1 AND prompt_seconds > 0.05 "
                           "AND sent_tokens > 200 ORDER BY ts DESC LIMIT 400").fetchall():
            rates.setdefault(r["model"], []).append(int(r["sent_tokens"]) / float(r["prompt_seconds"]))
    except Exception:
        pass
    full = {m: sorted(v)[len(v) // 2] for m, v in rates.items() if v}
    evaluated = 0
    for r in rows:
        tok, secs = int(r["sent_tokens"] or 0), float(r["prompt_seconds"] or 0)
        rate = full.get(r["model"])
        evaluated += tok if (not rate or float(r["load_seconds"] or 0) > 1.0) else min(tok, int(secs * rate))
    by_model = {}
    for r in rows:
        m = by_model.setdefault(r["model"], {"calls": 0, "seconds": 0.0, "output_tokens": 0})
        m["calls"] += 1
        m["seconds"] = round(m["seconds"] + float(r["seconds"] or 0), 1)
        m["output_tokens"] += int(r["output_tokens"] or 0)
    return {"calls": len(rows), "model_loads": len(loads), "load_seconds": round(sum(float(r["load_seconds"] or 0) for r in loads), 1),
            "prompt_tokens_sent": sent, "prompt_tokens_evaluated": evaluated,
            "reused_share": round(max(0.0, 1 - evaluated / sent), 3) if sent and full else None,
            "full_rates": {m: round(v) for m, v in full.items()},
            "contexts": sorted({int(r["num_ctx"] or 0) for r in rows if r["num_ctx"]}), "by_model": by_model}


class BudgetExceeded(RuntimeError):
    def __init__(self, spent, limit):
        super().__init__(f"task spend {spent:.2f} USD passed the approved {limit:.2f} USD")
        self.spent, self.limit = spent, limit


# ---- which model answers -------------------------------------------------------------------------------------------
_TAGS = {"at": 0.0, "names": set(), "caps": {}}
_TOLD = set()


def installed(refresh=False):
    """Names of the models Ollama has, cached for a minute."""
    if refresh or time.time() - _TAGS["at"] > 60:
        try:
            r = httpx.get(config.OLLAMA_URL + "/api/tags", timeout=10)
            _TAGS["names"] = {m["name"] for m in r.json().get("models") or []}
            _TAGS["at"] = time.time()
        except (httpx.HTTPError, ValueError):
            raise ProviderError("the local model server (Ollama) is not answering; start Ollama on this machine")
    return _TAGS["names"]


def capabilities(model):
    if model not in _TAGS["caps"]:
        try:
            r = httpx.post(config.OLLAMA_URL + "/api/show", json={"model": model}, timeout=20)
            _TAGS["caps"][model] = set(r.json().get("capabilities") or [])
        except (httpx.HTTPError, ValueError):
            return set()
    return _TAGS["caps"][model]


def _chain_for(model):
    for seat in config.SEATS.values():
        if seat.get("primary") == model and seat.get("chain"):
            return seat["chain"]
    for seat in config.SEATS.values():
        if model in (seat.get("chain") or []):
            return seat["chain"]
    return config.SEATS["artifact"]["chain"]          # a model id from another build (a recorded prompt): the author seat


def resolve(model, need=()):
    """The installed model that answers for `model`: itself when installed, else the next in its seat's chain. `need`
    names capabilities the call requires ("vision", "tools")."""
    have = installed()
    order = ([model] if model in have else []) + [m for m in _chain_for(model) if m != model]
    for m in order:
        if m in have and all(c in capabilities(m) for c in need):
            if m != model and (model, m) not in _TOLD:
                _TOLD.add((model, m))
                try:
                    from . import store
                    store.event("local_model_substituted", {"wanted": model, "answered": m,
                                                            "why": "not installed" if model not in have else "lacks " + ", ".join(need)})
                except Exception:
                    pass
            return m
    raise ProviderError(f"no installed local model can answer for {model}"
                        + (f" with {', '.join(need)}" if need else "") + "; run scripts/pull_models.ps1")


# ---- speed watch (field test 23 Nov, S1) ------------------------------------------------------------------------------
# The server reports a model as fully on the graphics card while the driver has spilled part of it into shared memory,
# so the only honest signal is the generation rate of each call. It is recorded for every call; a slow one moves that
# model's work to its smaller file for a while and tells the person why.
_SPEED = {}          # model -> {"tps", "at", "slow_until", "fallback"}


def speed():
    """What the last calls measured: {model: {"tps", "at", "slow", "fallback"}}. Read by the health route and the page."""
    now = time.time()
    return {m: {"tps": s.get("tps"), "at": s.get("at"), "slow": s.get("slow_until", 0) > now, "fallback": s.get("fallback") or ""}
            for m, s in _SPEED.items()}


NORMAL_TPS = float(__import__("os").environ.get("IA_NEXT_NORMAL_TPS", "28"))      # the writer on an idle card (measured 23 and 24 Nov: 27 to 31)
RATE_FRESH_SECONDS = 900


def slow_factor(model=None, now=None):
    """How many times longer than usual model work takes right now: 1.0 on a healthy card, more when the writer's last
    measured rate (within fifteen minutes) is well under its normal one, never more than 4. A plan's estimate is the
    median of earlier runs times this, so a card shared with another program says so before Start (field test 23 Nov,
    S4: an estimate of 1 minute for 33 minutes of work while the card was shared)."""
    model = model or config.SEATS["artifact"]["primary"]
    s = _SPEED.get(model) or {}
    tps, at = s.get("tps"), s.get("at") or 0
    if not tps or (now or time.time()) - at > RATE_FRESH_SECONDS or tps >= 0.7 * NORMAL_TPS:
        return 1.0
    return round(min(4.0, NORMAL_TPS / max(tps, 1.0)), 2)


def _unload(model):
    try:
        httpx.post(config.OLLAMA_URL + "/api/generate", json={"model": model, "keep_alive": 0}, timeout=20)
    except httpx.HTTPError:
        pass


def _note_speed(model, tokens, seconds, on_processor=False):
    """Record a call's generation rate; on a slow one, switch that model to its smaller file and say so once."""
    if on_processor or tokens <= 0 or seconds <= 0:
        return 0.0
    tps = round(tokens / seconds, 1)
    s = _SPEED.setdefault(model, {})
    s.update(tps=tps, at=time.time())
    if tokens < config.SLOW_MIN_TOKENS:
        return tps
    if tps < config.SLOW_TOKENS_PER_SECOND:
        small = config.SMALLER.get(model)
        was_slow = s.get("slow_until", 0) > time.time()
        s["slow_until"] = time.time() + config.SLOW_HOLD_SECONDS
        s["fallback"] = small if small and small in _TAGS["names"] else ""
        if not was_slow:
            try:
                from . import store
                store.event("model_slow", {"model": model, "tokens_per_second": tps, "fallback": s["fallback"],
                                           "why": "another program is holding graphics memory, so part of the model sits in "
                                                  "slower shared memory"})
            except Exception:
                pass
            if s["fallback"]:
                _unload(model)                    # the two files never sit on the card together
    elif s.get("slow_until"):
        s["slow_until"] = 0
    return tps


def _fast_enough(model):
    """The model to load for `model` right now: its smaller file while the larger one is measured slow."""
    s = _SPEED.get(model) or {}
    if s.get("slow_until", 0) > time.time() and s.get("fallback"):
        return s["fallback"]
    if s.get("slow_until") and s.get("fallback") and s["slow_until"] <= time.time():
        s["slow_until"] = 0                       # the hold is over: the larger file is tried again
        _unload(s["fallback"])
    return model


# ---- Messages shape in, Ollama chat, Messages shape out ------------------------------------------------------------
class Block(dict):
    """A content block that reads like the SDK's (b.type, b.text, b.id, b.name, b.input) and like a dict."""
    __getattr__ = dict.get

    def model_dump(self, exclude_none=True):
        return {k: v for k, v in self.items() if not (exclude_none and v is None)}


@dataclass
class _UsageView:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0


@dataclass
class Response:
    content: list
    stop_reason: str
    model: str
    usage: _UsageView
    raw: dict = field(default_factory=dict)


def _to_ollama(system, messages):
    out, names = [], {}
    if system:
        out.append({"role": "system", "content": system})
    for m in messages or []:
        role, content = m.get("role"), m.get("content")
        if isinstance(content, str):
            out.append({"role": role, "content": content})
            continue
        text, images, calls, results = [], [], [], []
        for b in content or []:
            b = dict(b) if isinstance(b, dict) else getattr(b, "model_dump", lambda **k: {})()
            t = b.get("type")
            if t == "text":
                text.append(b.get("text") or "")
            elif t == "image":
                src = b.get("source") or {}
                if src.get("type") == "base64" and src.get("data"):
                    images.append(src["data"])
            elif t == "tool_use":
                names[b.get("id")] = b.get("name")
                calls.append({"function": {"name": b.get("name"), "arguments": b.get("input") or {}}})
            elif t == "tool_result":
                c = b.get("content")
                if isinstance(c, list):
                    c = "\n".join(x.get("text", "") for x in c if isinstance(x, dict))
                results.append({"role": "tool", "content": str(c if c is not None else ""),
                                "tool_name": names.get(b.get("tool_use_id")) or ""})
            # thinking blocks belong to the model that wrote them and are not replayed
        out.extend(results)
        if text or images or calls or not results:
            msg = {"role": role, "content": "\n".join(x for x in text if x)}
            if images:
                msg["images"] = images
            if calls:
                msg["tool_calls"] = calls
            out.append(msg)
    return out


def _tools(tools):
    return [{"type": "function", "function": {"name": t["name"], "description": t.get("description", ""),
                                              "parameters": t.get("input_schema") or {"type": "object", "properties": {}}}}
            for t in tools or []]


_CTX_STEPS = (16384, 32768, 65536, 131072)
_TOO_LONG = re.compile(r"request \((\d+) tokens\) exceeds the available context size")


class _TooLong(Exception):
    def __init__(self, tokens):
        super().__init__(tokens)
        self.tokens = tokens


def prompt_tokens(chars, model=None, json_chars=0):
    """The prompt's size in tokens: text at the model's measured characters per token with a tenth spare, JSON (tools,
    tool calls) at the denser JSON figure (uplift plan WS-5 step 1). An unmeasured model: characters over three."""
    cpt = config.CHARS_PER_TOKEN.get(model)
    if not cpt:
        return int(chars / 3.0)
    return int(max(0, chars - json_chars) / (cpt * 0.9) + json_chars / (config.CHARS_PER_TOKEN_JSON * 0.9))


def context_for(chars, max_tokens, model=None, json_chars=0):
    """The context window a call needs, from its size: the prompt's tokens (prompt_tokens), the reply's room and a
    margin, rounded up to a step so the model is not reloaded for every small change. A call that cannot fit is
    refused. The count is an estimate: when the server says a prompt is larger than the window (measured 23 Nov: Ollama
    0.40.16 answers 400 "request (N tokens) exceeds the available context size", it never cuts), chat sends it once
    more at the step that holds N."""
    need = max(prompt_tokens(chars, model, json_chars) + min(int(max_tokens), 12000) + 512, config.CTX_FLOOR.get(model, 0))
    for step in _CTX_STEPS:
        if need <= step and step <= config.MAX_CTX:
            return step
    raise ProviderError(f"this request needs about {need:,} tokens of context, over the local limit of {config.MAX_CTX:,}; "
                        "use fewer or shorter sources, or raise IA_NEXT_MAX_CTX")


# (harness WS-H5, 26 Nov) The resident window. A chat call reserved its whole reply allowance (16,000 tokens, counted
# as 12,512) on top of the prompt, so any conversation prompt over about 20,250 tokens asked for a 64K window: Ollama
# reloaded the pinned Qwen at 65,536 (measured 18 s, predicted 29.2 GiB on a 23.9 GiB card, so part of it ran from
# system memory) and the prompt cache was lost (17.5 s to read 20,372 tokens again). A call now keeps the model's
# resident window when the prompt and a working reply of RESIDENT_MIN_REPLY tokens fit; the reply's limit becomes the
# room left. Only a reply that really runs out of room is asked again at the larger window, and that is an event.
RESIDENT_MIN_REPLY = 4000


def fit_resident(chars, predict, model, json_chars=0):
    """(num_ctx, num_predict, kept): the model's resident window (config.CTX_FLOOR) with the reply's limit cut to the room
    left, when the prompt and RESIDENT_MIN_REPLY tokens fit in it; otherwise the window the call needs (context_for)."""
    want = context_for(chars, predict, model, json_chars)
    resident = config.CTX_FLOOR.get(model)
    if not resident or want <= resident:
        return want, predict, False
    room = resident - prompt_tokens(chars, model, json_chars) - 512
    if room >= min(int(predict), RESIDENT_MIN_REPLY):
        return resident, min(int(predict), room), True
    return want, predict, False


# True while a call must not touch the graphics card: the conversation's small model answers from system memory
# while a studio task holds the card (agent._turn).
ON_PROCESSOR = contextvars.ContextVar("ia_next_on_processor", default=False)

# Uplift plan WS-2 step 5: inside a visible step (store.stage) a call streams, and this callback hears how many
# tokens have been written so far, so a long write shows progress instead of only elapsed time.
PROGRESS = contextvars.ContextVar("ia_next_progress", default=None)
PROGRESS_EVERY = 3.0              # seconds between progress reports
# streaming chat answers (26 Nov): a callback that hears the reply's text so far while the model writes it
STREAM_TEXT = contextvars.ContextVar("ia_next_stream_text", default=None)
STREAM_TEXT_EVERY = 0.5

THINK_ALLOWANCE = 4000            # tokens of reasoning allowed on top of the answer when a model thinks
MAX_PREDICT = 32000


# Every local call samples with seed 7 so a run can be reproduced. A measurement of run-to-run variation (the noise band
# of an evaluation or a skill re-check) must change it for its repeat run: with one seed, two runs are identical by
# construction and the band reads 0 (27 Nov: eight re-check baselines all showed 0.00).
SEED = contextvars.ContextVar("ia_next_seed", default=7)


class seed_as:
    """Sample with another seed for the length of a `with` block (this thread)."""
    def __init__(self, seed):
        self.seed = int(seed)

    def __enter__(self):
        self.tok = SEED.set(self.seed)
        return self.seed

    def __exit__(self, *exc):
        SEED.reset(self.tok)


def chat(model, system, messages, ledger=None, max_tokens=8000, tools=None, json_schema=None, effort="medium",
         images=None, need=()):
    """One local chat call. Returns (text, usage, Response)."""
    need = tuple(need) + (("tools",) if tools else ())
    msgs = _to_ollama(system, messages)
    if images:
        for m in reversed(msgs):
            if m["role"] == "user":
                m.setdefault("images", []).extend(base64.b64encode(b).decode("ascii") for _, b in images)
                break
    if any(m.get("images") for m in msgs):
        need = need + ("vision",)
    used = resolve(model, need)
    if not ON_PROCESSOR.get():
        used = resolve(_fast_enough(used), need)
    otools = _tools(tools)
    json_chars = sum(len(json.dumps(m.get("tool_calls") or "")) for m in msgs) + len(json.dumps(otools))
    chars = sum(len(m.get("content") or "") for m in msgs) + json_chars
    chars += 3000 * sum(len(m.get("images") or []) for m in msgs)
    think = "thinking" in capabilities(used) and effort in ("high", "xhigh", "max")
    # A model that thinks spends its reasoning out of the same allowance as its answer, so the answer gets its full
    # allowance on top (19 Nov: a report's JSON was cut at 7,000 tokens and the whole run died in the parser).
    predict = int(max_tokens) + (THINK_ALLOWANCE if think else 0)
    ctx, fit_predict, kept_resident = fit_resident(chars, predict, used, json_chars)
    # truncate False (26 Nov): Ollama 0.40.18 (auto-updated after a restart) cuts a prompt longer than the window and
    # answers 200, where 0.40.16 refused with a 400; measured, a 3,011-token prompt became 514 tokens. With the flag the
    # 400 "request (N tokens) exceeds the available context size" returns, and the window is grown instead (_TooLong).
    body = {"model": used, "messages": msgs, "stream": False, "keep_alive": keep_alive(used), "truncate": False,
            "options": {"num_ctx": ctx, "num_predict": fit_predict, "temperature": 0.2, "seed": SEED.get()}}
    if "thinking" in capabilities(used):
        body["think"] = think
    on_processor = ON_PROCESSOR.get()
    if on_processor:
        body["options"]["num_gpu"] = 0
    elif used == resolve(config.SEATS["orchestration"]["primary"], ()):
        LAST_CTX[used] = body["options"]["num_ctx"]
    if otools:
        body["tools"] = otools
    if json_schema:
        body["format"] = json_schema
    t0 = time.time()
    try:
        from . import store as _store
        _store.note_model(used)
    except Exception:
        pass

    progress = PROGRESS.get()

    def _post():
        """The call, holding the card lane (lanes.py). A call on the processor takes no card. The clock starts when
        the card is free, so waiting in line is never read as a slow card."""
        nonlocal t0
        if on_processor:
            return _post_card()
        from . import lanes
        with lanes.card("writer" if used == config.SEATS["artifact"]["primary"] else "other_model",
                        holder=getattr(ledger, "task_id", None) or None):
            t0 = time.time()
            return _post_card()

    def _post_card():
        done = threading.Event()
        try:
            if not on_processor:
                _room()
                if is_loaded(used) is False:          # the model server's own idle models make way first (see make_room_for)
                    make_room_for(used)
                    _note_load_wait(used, done)
            if progress is not None or STREAM_TEXT.get() is not None:
                return _post_streaming()
            r = httpx.post(config.OLLAMA_URL + "/api/chat", json=body, timeout=httpx.Timeout(3600.0, connect=15.0))
        except httpx.TimeoutException as e:
            if isinstance(e, httpx.ConnectTimeout):
                raise ProviderError("the local model server (Ollama) did not answer; check that it is running") from e
            raise ProviderError("the writing model was still working after an hour on one step, so the step was stopped. "
                                "This usually means another program is holding graphics memory; close it and try again") from e
        except httpx.HTTPError as e:
            raise ProviderError(f"the local model server (Ollama) could not be reached ({type(e).__name__})") from e
        finally:
            done.set()
        if r.status_code == 400 and _TOO_LONG.search(r.text or ""):
            raise _TooLong(int(_TOO_LONG.search(r.text).group(1)))
        if r.status_code != 200:
            raise ProviderError(f"{used} returned {r.status_code}: {r.text[:300]}")
        return r.json()

    def _post_streaming():
        """The same call streamed: parts are joined into the one reply the non-streaming call returns; the final line
        carries the counts. The callback hears the running token count every few seconds."""
        sbody = dict(body, stream=True)
        content, thinking, calls, final, written, last = [], [], [], {}, 0, time.time()
        text_cb, last_text = STREAM_TEXT.get(), 0.0
        with httpx.stream("POST", config.OLLAMA_URL + "/api/chat", json=sbody, timeout=httpx.Timeout(3600.0, connect=15.0)) as r:
            if r.status_code != 200:
                said = r.read().decode("utf-8", "replace")
                if r.status_code == 400 and _TOO_LONG.search(said):
                    raise _TooLong(int(_TOO_LONG.search(said).group(1)))
                raise ProviderError(f"{used} returned {r.status_code}: {said[:300]}")
            for line in r.iter_lines():
                if not line.strip():
                    continue
                try:
                    part = json.loads(line)
                except ValueError:
                    continue
                m = part.get("message") or {}
                if m.get("content"):
                    content.append(m["content"])
                    written += 1
                    if text_cb is not None and time.time() - last_text >= STREAM_TEXT_EVERY:
                        last_text = time.time()
                        try:
                            text_cb("".join(content))
                        except Exception:
                            pass
                if m.get("thinking"):
                    thinking.append(m["thinking"])
                    written += 1
                if m.get("tool_calls"):
                    calls.extend(m["tool_calls"])
                if part.get("done"):
                    final = part
                    break
                if progress is not None and time.time() - last >= PROGRESS_EVERY:
                    last = time.time()
                    try:
                        progress(written)
                    except Exception:
                        pass
        d = dict(final)
        d["message"] = {"role": "assistant", "content": "".join(content), **({"tool_calls": calls} if calls else {}),
                        **({"thinking": "".join(thinking)} if thinking else {})}
        return d

    try:
        d = _post()
    except _TooLong as e:                          # the estimate was short (WS-5 step 1): the server's count decides
        need = e.tokens + min(predict, 12000) + 512
        bigger = next((s for s in _CTX_STEPS if s >= need and s > body["options"]["num_ctx"] and s <= config.MAX_CTX), None)
        if not bigger:
            raise ProviderError(f"this request needs about {need:,} tokens of context, over the local limit of "
                                f"{config.MAX_CTX:,}; use fewer or shorter sources, or raise IA_NEXT_MAX_CTX") from None
        body["options"]["num_ctx"] = bigger
        try:
            d = _post()
        except _TooLong as e2:
            raise ProviderError(f"{used} refused a {e2.tokens:,}-token prompt at a {bigger:,}-token context") from None
    if kept_resident and d.get("done_reason") == "length" and not (d.get("message") or {}).get("tool_calls"):
        # the reply needed more than the room left in the resident window: asked once more at the window it needs
        grown = context_for(chars, predict, used, json_chars)
        try:
            from . import store
            store.event("model_window_grown", {"conversation": (store.TURN.get() or {}).get("conversation"),
                                               "model": used, "from": body["options"]["num_ctx"], "to": grown,
                                               "why": "the reply needed more room than the resident window had left"})
        except Exception:
            pass
        body["options"]["num_ctx"], body["options"]["num_predict"] = grown, predict
        d = _post()
    if json_schema and d.get("done_reason") == "length":
        # structured output that ran out of room is not valid JSON: ask once more with twice the room, never truncate
        body["options"]["num_predict"] = min(predict * 2, MAX_PREDICT)
        body["options"]["num_ctx"] = max(body["options"]["num_ctx"], context_for(chars, body["options"]["num_predict"], used, json_chars))
        if body["options"]["num_predict"] > predict:
            d = _post()
    if d.get("done_reason") == "length" and (d.get("message") or {}).get("tool_calls"):
        # a tool call whose reply was cut off at the length limit may parse while incomplete (Harness Engineering p.15,
        # Pi's truncation guard): ask once more with twice the room; if it is cut off again, its calls are not run
        if body["options"].get("num_predict", predict) < MAX_PREDICT:
            body["options"]["num_predict"] = min(int(body["options"].get("num_predict", predict)) * 2, MAX_PREDICT)
            body["options"]["num_ctx"] = max(body["options"]["num_ctx"], context_for(chars, body["options"]["num_predict"], used, json_chars))
            d = _post()
        if d.get("done_reason") == "length" and (d.get("message") or {}).get("tool_calls"):
            d = dict(d, message=dict(d["message"], tool_calls=[],
                                     content=(d["message"].get("content") or "") + "\n(The reply was cut off before its tool call was complete, so the call was not made.)"))
            try:
                from . import store
                store.event("tool_call_truncated", {"model": used})
            except Exception:
                pass
    msg = d.get("message") or {}
    blocks = []
    if msg.get("content"):
        blocks.append(Block(type="text", text=msg["content"]))
    for i, c in enumerate(msg.get("tool_calls") or []):
        fn = c.get("function") or {}
        args = fn.get("arguments")
        if isinstance(args, str):
            try:
                args = json.loads(args)
            except ValueError:
                args = {}
        blocks.append(Block(type="tool_use", id=f"toolu_local_{int(t0 * 1000)}_{i}", name=fn.get("name"), input=args or {}))
    stop = "tool_use" if any(b["type"] == "tool_use" for b in blocks) else ("max_tokens" if d.get("done_reason") == "length" else "end_turn")
    u = Usage(used, int(d.get("prompt_eval_count") or 0), int(d.get("eval_count") or 0), 0, round(time.time() - t0, 2))
    u.sent_tokens = int(d.get("prompt_eval_count") or chars / 3.5)
    u.tokens_per_second = _note_speed(used, int(d.get("eval_count") or 0), float(d.get("eval_duration") or 0) / 1e9, on_processor)
    u.load_seconds = round(float(d.get("load_duration") or 0) / 1e9, 2)          # Ollama reports nanoseconds
    u.prompt_seconds = round(float(d.get("prompt_eval_duration") or 0) / 1e9, 2)
    u.num_ctx = int(body["options"].get("num_ctx") or 0)
    resp = Response(blocks, stop, used, _UsageView(u.input_tokens, u.output_tokens), d)
    if ledger is not None:
        ledger.add(u)
    return "".join(b["text"] for b in blocks if b["type"] == "text"), u, resp


def claude_body(model, system, messages, max_tokens=16000, effort="medium", tools=None, json_schema=None,
                cache_messages=False):
    """Kept for callers and tests that build a body: the request as it goes to the local server."""
    return {"model": model, "max_tokens": max_tokens, "system": system, "messages": messages, "tools": tools,
            "json_schema": json_schema, "effort": effort}


def claude(model, system, messages, ledger: Ledger = None, max_tokens=16000, effort="medium", tools=None,
           json_schema=None, cache_messages=False):
    """The author, analyst and orchestration calls. Same arguments as IA Next; `cache_messages` has no meaning here
    (the local server keeps a prompt's prefix in memory between calls on its own)."""
    return chat(model, system, messages, ledger, max_tokens=max_tokens, tools=tools, json_schema=json_schema, effort=effort)


def openai_text(model, prompt, ledger: Ledger = None, system=None, max_output_tokens=4096):
    text, u, resp = chat(model, system, [{"role": "user", "content": prompt}], ledger, max_tokens=max_output_tokens)
    return text, u, resp.raw


def gemini_generate(model, prompt, ledger: Ledger = None, system=None, search=False, json_schema=None, max_output_tokens=8192,
                    images=None, window=None):
    """Structured output and picture review, and with search=True the grounded search the Research Lead uses: the
    self-hosted search adapter finds pages and the reply carries them where the caller reads them
    (candidates[0].groundingMetadata.groundingChunks, each {"web": {"uri", "title"}})."""
    if search:
        from . import localsearch
        return localsearch.grounded(model, prompt, ledger, system=system, max_output_tokens=max_output_tokens, window=window)
    text, u, resp = chat(model, system, [{"role": "user", "content": prompt}], ledger, max_tokens=max_output_tokens,
                         json_schema=json_schema, images=images)
    return text, u, {"candidates": [{"content": {"parts": [{"text": text}]},
                                     "finishReason": "MAX_TOKENS" if resp.stop_reason == "max_tokens" else "STOP"}],
                     "model": resp.model}


def openai_image(model, prompt, ledger: Ledger = None, size="1536x1024"):
    """One still image from the local image engine. Returns (PNG bytes, usage)."""
    from . import localmedia
    from . import lanes
    with lanes.card("image"):                    # a picture and a writing call never share the card
        t0 = time.time()
        png, engine = localmedia.image(prompt, size)
    u = Usage(engine, 0, 0, 0, round(time.time() - t0, 2))
    if ledger is not None:
        ledger.add(u)
    return png, u


# Root cause of the 26 Nov stall (13:01): a research run called MiniCPM, which was not loaded, while the conversation
# model (pinned in memory, keep_alive -1) and the embedding model (kept busy by the Library's background embedding) were
# resident. The model server judged that MiniCPM would not fit beside them (its free-memory reading on this machine goes
# stale: "GPU discovery watchdog timed out ... using old values"), queued the load until a resident model was
# released, and neither ever was: the call waited 23 minutes with no error, and two test calls hung the same way.
# Unloading the idle embedding model let MiniCPM load in 11 seconds (and at a 32K context, beside the conversation
# model, in 14). So before a model that is not loaded is called, every idle model other than the pinned conversation
# model is released (the embedding model reloads in about a second and a half); background embedding pauses while a
# language-model call waits (lanes.model_call_active), so the embedding model is idle and can go.
EMBED_MODELS = ("qwen3-embedding:0.6b",)
LOAD_WAIT_NOTE = 90               # seconds a load may wait before the event log says what is resident


def make_room_for(model):
    """Release the model server's idle models other than `model` and the pinned conversation model when `model` is not
    loaded. Returns the names released. Never raises."""
    try:
        from . import lanes, store
        ps = httpx.get(config.OLLAMA_URL + "/api/ps", timeout=5).json().get("models") or []
        names = [m.get("name") for m in ps]
        if model in names:
            return []
        pinned = {resolve(config.SEATS["orchestration"]["primary"], ())}
        others = sorted((m for m in ps if m.get("name") not in pinned and m.get("name") != model),
                        key=lambda m: (m.get("name") not in EMBED_MODELS, m.get("size_vram") or 0))
        gone = []
        for m in others:
            name = m.get("name")
            if name in EMBED_MODELS:                 # wait for the background embedding batch in flight to finish
                t0 = time.time()
                while lanes.embeds_running() and time.time() - t0 < 30:
                    time.sleep(0.25)
                httpx.post(config.OLLAMA_URL + "/api/embed", json={"model": name, "input": "", "keep_alive": 0}, timeout=30)
            else:
                httpx.post(config.OLLAMA_URL + "/api/generate", json={"model": name, "keep_alive": 0}, timeout=30)
            gone.append(name)
        if gone:
            turn = store.TURN.get() or {}
            store.event("models_released_for_load", {"loading": model, "released": gone, "kept": sorted(pinned & set(names)),
                                                     "conversation": turn.get("conversation", "")})
            store.say(f"making room on the graphics card for {model.rsplit('/', 1)[-1]}: released {', '.join(g.rsplit('/', 1)[-1] for g in gone)}")
        return gone
    except Exception:
        return []


def _note_load_wait(model, done):
    """If a load is still waiting after LOAD_WAIT_NOTE seconds, the event log says which models are resident."""
    try:
        from . import store as _store
        turn = _store.TURN.get() or {}
    except Exception:
        turn = {}

    def watch():
        if done.wait(LOAD_WAIT_NOTE):
            return
        try:
            from . import store
            ps = httpx.get(config.OLLAMA_URL + "/api/ps", timeout=5).json().get("models") or []
            if model not in [m.get("name") for m in ps]:
                try:
                    from . import papercuts
                    papercuts.file("model server", f"load {model}", "the model loads within a minute and a half",
                                   f"the load was still waiting after {LOAD_WAIT_NOTE} seconds",
                                   "check what is resident on the graphics card (event model_load_waiting)")
                except Exception:
                    pass
                store.event("model_load_waiting", {"model": model, "seconds": LOAD_WAIT_NOTE, "conversation": turn.get("conversation", ""),
                                                   "resident": [{"name": m.get("name"), "gb": round((m.get("size_vram") or 0) / 2**30, 1)}
                                                                for m in ps]})
        except Exception:
            pass
    threading.Thread(target=watch, daemon=True, name="load-wait-note").start()


def _room():
    """The picture and video engine shares the one graphics card. It must let go before a language model answers."""
    try:
        from . import localmedia, store
        left = localmedia.make_room()
        if left:
            store.event("gpu_shared", {"held_gb": round(left, 1), "by": "the picture and video engine"})
    except Exception:
        pass


# ---- the assistant is always ready (QA 25 Nov, E8) ---------------------------------------------------------------------
# Work that makes pictures, or that uses another large model, pushes the conversation model off the graphics card, and
# nothing brought it back: the next message waited about a minute and a half for it to load. Now the load happens in
# the background, the moment the studio goes quiet, and once when the app starts. It is for any conversation model on
# any card: the model comes from the orchestration seat, the context from the size its calls use.
LAST_CTX = {}                     # model -> the context window its last call on the card used
_READY = {"busy": False, "last": 0.0}


def ready_soon(reason="", delay=4.0):
    """Load the conversation model in the background when nothing is making and the card is free. Never raises."""
    if os.environ.get("IA_NEXT_KEEP_READY", "1") == "0" or _READY["busy"]:
        return False
    _READY["busy"] = True

    def run():
        try:
            from . import lanes, store
            time.sleep(delay)
            model = resolve(config.SEATS["orchestration"]["primary"], ())
            for _ in range(60):                  # wait for a quiet studio, at most five minutes
                snap = lanes.snapshot()
                if not snap["studio"]["making"] and not snap["card"]["running"] and not snap["card"]["waiting"]:
                    break
                time.sleep(5)
            else:
                return
            if is_loaded(model) is not False:
                return
            try:
                from . import localmedia
                localmedia.make_room(max_wait=30)
            except Exception:
                pass
            t0 = time.time()
            ctx = LAST_CTX.get(model) or config.CTX_FLOOR.get(model) or 16384
            with lanes.card("writer", holder="ready"):
                if is_loaded(model) is False:
                    httpx.post(config.OLLAMA_URL + "/api/generate", timeout=600,
                               json={"model": model, "prompt": "", "keep_alive": keep_alive(model), "options": {"num_ctx": ctx}})
            store.event("model_ready", {"model": model, "seconds": round(time.time() - t0, 1), "why": reason[:80], "num_ctx": ctx})
        except Exception as e:
            try:
                from . import store
                store.event("model_ready_failed", {"error": f"{type(e).__name__}: {str(e)[:200]}", "why": reason[:80]})
            except Exception:
                pass
        finally:
            _READY["busy"] = False
            _READY["last"] = time.time()

    threading.Thread(target=run, daemon=True, name="model-ready").start()
    return True


def keep_alive(model):
    """How long the model server keeps a model after its last call. The conversation model stays (-1): an idle night
    cost the owner's first message a minute and a half of loading (26 Nov). The picture and video engine unloads it
    explicitly when it needs the card (localmedia), and ready_soon brings it back. Other models keep the set time."""
    return -1 if model == config.SEATS["orchestration"]["primary"] else config.KEEP_ALIVE


def keep_ready_watch(every=600):
    """Every ten minutes: when the conversation model is not in memory and nothing is making, load it in the
    background (a large model loaded for other work can push it out)."""
    if os.environ.get("IA_NEXT_KEEP_READY", "1") == "0":
        return

    def run():
        while True:
            time.sleep(every)
            try:
                if is_loaded(config.SEATS["orchestration"]["primary"]) is False:
                    ready_soon("the conversation model was not in memory", delay=1.0)
            except Exception:
                pass
    threading.Thread(target=run, daemon=True, name="keep-ready").start()


def is_loaded(model):
    """True when the model that would answer is already in memory, False when it must be loaded first, None when the
    model server did not say. Loading a large model takes a minute or two, and the page says so while it happens."""
    try:
        used = resolve(model, ())
        names = [m.get("name") for m in httpx.get(config.OLLAMA_URL + "/api/ps", timeout=3).json().get("models") or []]
        return used in names
    except Exception:
        return None


def repair_json(t):
    """A JSON object cut off mid-way, closed at the last complete value: what was fully written is kept and the
    unfinished tail is dropped. Returns the repaired text, or raises ValueError when nothing complete remains."""
    stack, in_str, esc, safe = [], False, False, []      # safe: (index after a complete value, stack copy)
    for i, ch in enumerate(t):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
                safe.append((i + 1, list(stack), "str"))
            continue
        if ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append(ch)
        elif ch in "}]":
            if not stack:
                break
            stack.pop()
            safe.append((i + 1, list(stack), "close"))
            if not stack:
                return t[:i + 1]
        elif ch == ",":
            safe.append((i, list(stack), "comma"))
    # walk back to the last point that leaves valid JSON once the open brackets are closed
    for cut, open_stack, kind in reversed(safe):
        head = t[:cut].rstrip()
        if kind == "str":                                  # a string may be a key with no value yet: skip those
            before = head[:head.rfind('"', 0, len(head) - 1)].rstrip() if head.count('"') >= 2 else ""
            if open_stack and open_stack[-1] == "{" and before.endswith(("{", ",")):
                continue
        head = head.rstrip(",").rstrip()
        if head.endswith(":"):
            continue
        cand = head + "".join("}" if b == "{" else "]" for b in reversed(open_stack))
        try:
            json.loads(cand)
            return cand
        except ValueError:
            continue
    raise ValueError("no complete JSON value in reply")


def parse_json(text, repair=True):
    """Parse a JSON object from model text; tolerate a fenced block. A reply cut off mid-object is closed at its
    last complete value (repair_json) so finished work is kept. Raises ValueError when no object is there."""
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        t = t.rsplit("```", 1)[0]
    start, end = t.find("{"), t.rfind("}")
    if start < 0:
        raise ValueError("no JSON object in reply")
    try:
        if end <= start:
            raise ValueError("unterminated JSON object")
        return json.loads(t[start:end + 1])
    except ValueError:
        if not repair:
            raise
        return json.loads(repair_json(t[start:]))
