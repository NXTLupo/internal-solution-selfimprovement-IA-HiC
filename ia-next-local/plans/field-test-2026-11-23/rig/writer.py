"""Writer alone: tokens per second for the current writer file at 32K context, plus card memory. Changes no setting."""
import json, subprocess, sys, urllib.request
O = "http://127.0.0.1:11434"
M = sys.argv[1] if len(sys.argv) > 1 else "qwen3.8:27b-q4_K_M"
P = "Explain in plain words why hospitals track nurse turnover, in about 200 words."


def gpu():
    return subprocess.run(["nvidia-smi", "--query-gpu=memory.used,temperature.gpu", "--format=csv,noheader"], capture_output=True, text=True).stdout.strip()


running = [t["id"] for t in json.load(urllib.request.urlopen("http://127.0.0.1:9460/api/tasks"))["tasks"] if t["status"] not in ("done", "failed", "cancelled")]
print("tasks not finished:", running)
print("gpu before:", gpu())
for i in range(2):
    b = json.dumps({"model": M, "messages": [{"role": "user", "content": P}], "stream": False, "keep_alive": "2m",
                    "options": {"num_predict": 220, "num_ctx": 32768}}).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request(O + "/api/chat", b, {"Content-Type": "application/json"}), timeout=900))
    print("run", i + 1, M, round(r["eval_count"] / (r["eval_duration"] / 1e9), 1), "tok/s, load", round(r.get("load_duration", 0) / 1e9, 1), "s")
ps = json.load(urllib.request.urlopen(O + "/api/ps"))["models"]
print("resident:", [(m["name"], round(m["size"] / 1e9, 1), round(m.get("size_vram", 0) / 1e9, 1)) for m in ps])
print("gpu after:", gpu())
