"""Lane test on the owner's machine: does the writer stay resident while processor-only helpers run, what does a
concurrent helper cost the writer, and how fast is the smaller writer quantization. Reads Ollama only; changes no setting."""
import json, threading, time, urllib.request, subprocess
O = "http://127.0.0.1:11434"
QWEN, QWEN_XS, MINI = "qwen3.8:27b-q4_K_M", "qwen3.8:27b-ud-iq4_xs", "hf.co/openbmb/MiniCPM5-2B-GGUF:Q4_K_M"
P = "Explain in plain words why hospitals track nurse turnover, in about 200 words."


def chat(model, opts, n=220, keep="10m"):
    b = json.dumps({"model": model, "messages": [{"role": "user", "content": P}], "stream": False, "keep_alive": keep,
                    "options": dict(num_predict=n, **opts)}).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request(O + "/api/chat", b, {"Content-Type": "application/json"}), timeout=900))
    return {"gen_tok_s": round(r["eval_count"] / (r["eval_duration"] / 1e9), 1), "load_s": round(r.get("load_duration", 0) / 1e9, 1), "tokens": r["eval_count"]}


def ps():
    return [(m["name"][-28:], round(m["size"] / 1e9, 1), round(m.get("size_vram", 0) / 1e9, 1), m.get("context_length"))
            for m in json.load(urllib.request.urlopen(O + "/api/ps"))["models"]]


def gpu():
    return subprocess.run(["nvidia-smi", "--query-gpu=memory.used,temperature.gpu,power.draw", "--format=csv,noheader"], capture_output=True, text=True).stdout.strip()


print("gpu before:", gpu())
print("1 writer alone (32K):", chat(QWEN, {"num_ctx": 32768}), ps(), gpu())
print("2 helper on processor while writer idle:", chat(MINI, {"num_gpu": 0, "num_ctx": 8192}, keep="5m"))
print("  resident after helper:", ps())
out = {}
th = threading.Thread(target=lambda: out.setdefault("h", [chat(MINI, {"num_gpu": 0, "num_ctx": 8192}, n=200, keep="5m") for _ in range(3)]))
th.start()
out["w"] = chat(QWEN, {"num_ctx": 32768}, n=300)
th.join()
print("3 writer with 3 helper calls running beside it:", out["w"], "| helpers:", [h["gen_tok_s"] for h in out["h"]])
print("  resident:", ps(), gpu())
out2 = {}
ths = [threading.Thread(target=lambda i=i: out2.__setitem__(i, chat(MINI, {"num_gpu": 0, "num_ctx": 8192}, n=150, keep="5m"))) for i in range(3)]
t0 = time.time(); [t.start() for t in ths]; [t.join() for t in ths]
print("4 three helper calls sent at once (one slot):", [out2[i]["gen_tok_s"] for i in range(3)], "wall", round(time.time() - t0, 1), "s")
print("5 smaller writer quantization (32K):", chat(QWEN_XS, {"num_ctx": 32768}), ps(), gpu())
