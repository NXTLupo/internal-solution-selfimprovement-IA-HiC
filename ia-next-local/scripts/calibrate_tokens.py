"""Characters per token for each model that builds or answers (uplift plan 2026-11-23, WS-5 step 1).

Ollama 0.40.16 has no tokenizer endpoint (/api/tokenize answers 404, checked 23 Nov), so evidence budgets use a measured
characters-per-token figure. Each model reads three real kinds of text (source prose from the engagements, a builder's
JSON schema, and a page of quoted markdown) with a one-token reply; the template's own tokens are measured with an
empty message and subtracted. Calls use each model's fixed context (config.CTX_FLOOR), so nothing is reloaded twice.

    docker exec -e PYTHONPATH=/app ia-next-local python /app/scripts/calibrate_tokens.py
Writes /data/token_calibration.json and prints a table.
"""
import glob
import json
import os
import time

import httpx

from ia_next import config, localartifact

MODELS = [config.QWEN, config.NEMOTRON, config.MINICPM]


def samples():
    prose = []
    for p in sorted(glob.glob(os.path.join(config.DATA_DIR, "engagements", "*", "results", "sources.json")))[:6]:
        try:
            for s in (json.load(open(p, encoding="utf-8")).get("sources") or [])[:3]:
                prose.append(str(s.get("text") or "")[:4000])
        except (OSError, ValueError):
            continue
    prose = "\n\n".join(x for x in prose if x)[:24000]
    schema = json.dumps([localartifact.SCHEMA, localartifact.PERSONA_SCHEMA, localartifact.COMPETITIVE_SCHEMA,
                         localartifact.ARCH_SCHEMA], indent=1)[:12000]
    quoted = "\n\n".join(f'> "{line.strip()}" [Source: S{i % 9 + 1}]' for i, line in enumerate(prose.split(". ")[:120]) if line.strip())
    return {"prose": prose, "schema": schema, "quoted": quoted[:12000]}


def count(model, text):
    body = {"model": model, "messages": [{"role": "user", "content": text}], "stream": False, "think": False,
            "options": {"num_predict": 1, "num_ctx": config.CTX_FLOOR.get(model, 32768)}, "keep_alive": config.KEEP_ALIVE}
    r = httpx.post(config.OLLAMA_URL + "/api/chat", json=body, timeout=600)
    r.raise_for_status()
    return int(r.json().get("prompt_eval_count") or 0)


def main():
    texts = samples()
    out = {"measured_at": time.time(), "ollama": httpx.get(config.OLLAMA_URL + "/api/version", timeout=10).json().get("version"),
           "chars": {k: len(v) for k, v in texts.items()}, "models": {}}
    for model in MODELS:
        try:
            base = count(model, ".")
            rows = {k: round(len(v) / max(1, count(model, v) - base), 3) for k, v in texts.items() if v}
        except httpx.HTTPError as e:
            print(f"{model}: {type(e).__name__}", flush=True)
            continue
        out["models"][model] = {"per_kind": rows, "worst": min(rows.values())}
        print(f"{model:40} " + "  ".join(f"{k} {v:.2f}" for k, v in rows.items()) + f"  worst {min(rows.values()):.2f}", flush=True)
    with open(os.path.join(config.DATA_DIR, "token_calibration.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)


if __name__ == "__main__":
    main()
