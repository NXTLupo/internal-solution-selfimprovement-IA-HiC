"""Pictures on this machine, through IA Next Local's own image engine: a dedicated ComfyUI on D: (scripts/
start_image_engine.ps1, port 8189, loopback only, core nodes only), reading the Stable Diffusion 3.5 Large weights
already on disk through its extra_model_paths.yaml. The graph below is the one pinned in workflows/image.api.json,
verified on 2026-11-19 (one 1344x768 photograph in about 50 seconds).

Video is the same engine with one reviewed extension, the official Kandinsky 6 nodes (see the video section).

Only the prompt and the size are set by a request; the graph, its nodes and its links are fixed here. When the engine
is not running, image() says so plainly: a deck is then made without photographs, and nothing falls back to a paid
image service. The language models are asked to release the graphics memory first, and the engine frees it after.
"""
import json
import os
import time
import uuid

import httpx

from . import config

CHECKPOINT = "sd3.5_large_fp8_scaled.safetensors"       # one file with its text encoders: the simplest reliable graph
NEGATIVE = "text, watermark, logo, caption, deformed hands, extra fingers, cgi, 3d render, illustration, futuristic"


def available(wait=0):
    """True when the engine answers. `wait` seconds are allowed for an engine that is restarting (its start script
    restarts it when it sits idle holding graphics memory)."""
    deadline = time.time() + wait
    while True:
        try:
            if httpx.get(config.COMFY_URL + "/system_stats", timeout=4).status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        if time.time() >= deadline:
            return False
        time.sleep(3)


def held_gb():
    """Graphics memory the picture and video engine holds right now, in GB. 0 when it is not running."""
    try:
        d = httpx.get(config.COMFY_URL + "/system_stats", timeout=3).json()["devices"][0]
        return float(d.get("torch_vram_total") or 0) / 1e9
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        return 0.0


ROOM_GB = 2.0
ENGINE_WAIT = 90                    # seconds allowed for an engine that is restarting


def make_room(max_wait=75):
    """Before a language model answers: the engine must not be holding graphics memory, or the model runs from system
    memory at about one word a second (measured 2026-11-19: a mind map took 14 minutes behind a finished video).
    Asks the engine to let go and waits for it. Returns the GB still held (0 when there is room)."""
    held = held_gb()
    if held < ROOM_GB:
        return 0.0
    try:
        httpx.post(config.COMFY_URL + "/free", json={"unload_models": True, "free_memory": True}, timeout=15)
    except httpx.HTTPError:
        pass
    deadline = time.time() + max_wait
    while time.time() < deadline:
        time.sleep(3)
        held = held_gb()
        if held < ROOM_GB:
            return 0.0
    return held


def _graph(prompt, width, height, seed, negative=None):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": prompt}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": negative or NEGATIVE}},
        "4": {"class_type": "EmptySD3LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0],
                                                    "latent_image": ["4", 0], "seed": seed, "steps": 28, "cfg": 4.5,
                                                    "sampler_name": "dpmpp_2m", "scheduler": "sgm_uniform", "denoise": 1.0}},
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": "ia-next-local"}},
    }


# ---- the image seat: MOSS-Image-SFT (owner's decision, 25 Nov) ---------------------------------------------------------
# The build brief of 19 Nov named OpenMOSS MOSS-Image-SFT; the build used Stable Diffusion 3.5 Large because its weights
# were on disk. Measured side by side on this card on 25 Nov (same prompts, 1024 by 1024): SD 3.5 Large 27 to 32 s a
# picture, MOSS-Image-SFT at full precision about 5 s more, the same graphics memory; MOSS-Image followed the prompts and
# drew hands correctly where SD 3.5 did not. The graph is ComfyUI's own template (image_moss_image_t2i.json) without
# its optional prompt enhancer. The 8-bit transformer is slower on this card and is not used.
MOSS_UNET = "moss_image_sft_bf16.safetensors"
MOSS_CLIP = "qwen3.5_9b_w4a8_gptq.safetensors"
MOSS_VAE = "flux2-vae_small.safetensors"
MOSS_STEPS = int(os.environ.get("IA_NEXT_MOSS_STEPS", "14"))
_MOSS = {"at": 0.0, "ok": False}


def _moss_graph(prompt, width, height, seed):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": MOSS_UNET, "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": MOSS_CLIP, "type": "moss_image", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": MOSS_VAE}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": ""}},
        "6": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "15": {"class_type": "SkipLayerGuidanceDiTSimple", "inputs": {"model": ["1", 0], "double_layers": "", "single_layers": "22",
                                                                        "start_percent": 0.0, "end_percent": 0.5}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["15", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0],
                                                    "seed": seed, "steps": MOSS_STEPS, "cfg": 2.5, "sampler_name": "er_sde",
                                                    "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": "ia-next-local"}},
    }


def moss_ready():
    """True when the engine holds the three MOSS-Image files and knows the model. Asked at most every ten minutes."""
    if os.environ.get("IA_NEXT_IMAGE_MODEL", "moss").lower() in ("sd35", "sd3.5"):
        return False
    if time.time() - _MOSS["at"] < 600:
        return _MOSS["ok"]
    ok = False
    try:
        u = httpx.get(config.COMFY_URL + "/object_info/UNETLoader", timeout=8).json()["UNETLoader"]["input"]["required"]["unet_name"][0]
        c = httpx.get(config.COMFY_URL + "/object_info/CLIPLoader", timeout=8).json()["CLIPLoader"]["input"]["required"]
        v = httpx.get(config.COMFY_URL + "/object_info/VAELoader", timeout=8).json()["VAELoader"]["input"]["required"]["vae_name"][0]
        ok = MOSS_UNET in u and MOSS_CLIP in c["clip_name"][0] and "moss_image" in c["type"][0] and MOSS_VAE in v
    except Exception:
        ok = False
    _MOSS.update(at=time.time(), ok=ok)
    return ok


def _free_language_models():
    """The picture model needs the graphics memory the language model holds: ask Ollama to let go of what it has loaded."""
    try:
        from . import lanes
        room = lanes.CARD_GB - lanes.COST_GB.get("image", 12.0)
        loaded = sorted(httpx.get(config.OLLAMA_URL + "/api/ps", timeout=10).json().get("models") or [],
                        key=lambda m: -float(m.get("size_vram") or m.get("size") or 0))
        held = sum(float(m.get("size_vram") or m.get("size") or 0) for m in loaded) / 1e9
        for m in loaded:                          # largest first, and only until the picture fits (QA 25 Nov, E8)
            if held <= room:
                break
            httpx.post(config.OLLAMA_URL + "/api/generate", json={"model": m["name"], "keep_alive": 0}, timeout=30)
            held -= float(m.get("size_vram") or m.get("size") or 0) / 1e9
    except (httpx.HTTPError, ValueError, ImportError, AttributeError):
        pass


def _run(graph, kinds, minutes, what):
    """Queue one fixed graph, wait for it, return the bytes of its first saved file of the given output kinds."""
    from . import providers
    _free_language_models()
    cid = uuid.uuid4().hex
    r = httpx.post(config.COMFY_URL + "/prompt", json={"prompt": graph, "client_id": cid}, timeout=60)
    if r.status_code != 200:
        raise providers.ProviderError(f"the {what} engine refused the request ({r.status_code}): {r.text[:300]}")
    pid = r.json()["prompt_id"]
    deadline = time.time() + minutes * 60
    while time.time() < deadline:
        time.sleep(3)
        hist = httpx.get(f"{config.COMFY_URL}/history/{pid}", timeout=30).json().get(pid)
        if not hist:
            continue
        if (hist.get("status") or {}).get("status_str") == "error":
            raise providers.ProviderError(f"the {what} engine failed: " + json.dumps(hist["status"].get("messages"))[:400])
        for out in (hist.get("outputs") or {}).values():
            for kind in kinds:
                for f in out.get(kind) or []:
                    got = httpx.get(config.COMFY_URL + "/view", params={"filename": f["filename"], "subfolder": f.get("subfolder", ""),
                                                                        "type": f.get("type", "output")}, timeout=300)
                    try:
                        httpx.post(config.COMFY_URL + "/free", json={"unload_models": True, "free_memory": True}, timeout=30)
                    except httpx.HTTPError:
                        pass
                    if got.status_code != 200 or not got.content:
                        raise providers.ProviderError(f"the {what} engine saved a file that could not be read back")
                    return got.content
        if (hist.get("status") or {}).get("completed"):
            raise providers.ProviderError(f"the {what} engine finished without saving a file")
    raise providers.ProviderError(f"the {what} engine did not finish within {minutes} minutes")


def image(prompt, size="1536x1024", negative=None):
    """(PNG bytes, engine name). Raises ProviderError when no local image engine is running. `negative` replaces the
    photograph's own list of things to avoid (that list refuses "illustration", which a drawn picture asks for)."""
    from . import providers
    if not available(wait=ENGINE_WAIT):
        raise providers.ProviderError(
            "pictures are not set up in IA Next Local yet: no image engine answers at " + config.COMFY_URL +
            " (start it with scripts/start_image_engine.ps1). Nothing was sent to a paid image service")
    try:
        w, h = (int(x) for x in size.lower().split("x"))
    except ValueError:
        w, h = 1536, 1024
    k = min(1.0, 1344 / max(w, h))                      # SD 3.5 Large is trained near one megapixel
    w, h = int(w * k) // 16 * 16, int(h * k) // 16 * 16
    if moss_ready():
        try:
            return _run(_moss_graph(prompt, w, h, 7), ("images",), 15, "image"), "comfyui:moss-image-sft"
        except Exception as e:                           # the picture is still made: the earlier model takes over, and says so
            from . import store
            store.event("local_model_substituted", {"seat": "image", "wanted": "comfyui:moss-image-sft", "used": "comfyui:sd3.5-large",
                                                    "why": f"{type(e).__name__}: {str(e)[:200]}"})
            _MOSS.update(at=time.time(), ok=False)
    return _run(_graph(prompt, w, h, 7, negative), ("images",), 15, "image"), "comfyui:sd3.5-large"


# ---- video: Kandinsky 6.0 Lite Distill, five seconds with sound ----------------------------------------------------
# The official Kandinsky 6 nodes (github.com/kandinskylab/kandinsky-6, commit 73b892b7), the only extension the engine
# loads. The graph is the publisher's text-to-video template with its super-resolution and prompt-beautifier branches
# removed, at the publisher's Lite Distill settings: 10 steps, CFG 1, denoise 1, audio scaling 0.417, 864x480, 121
# frames at 24 frames a second. It is pinned in workflows/video.api.json.
VIDEO_TRANSFORMER = "Kandinsky-6.0-Lite-distill-5s-Diffusers/transformer/diffusion_pytorch_model.safetensors"
VIDEO_NEGATIVE = ("Static, 2D cartoon, cartoon, 2d animation, paintings, images, worst quality, low quality, ugly, deformed, "
                  "walking backwards, on-screen text, captions, watermark, logo")
VIDEO_SECONDS, VIDEO_FPS, VIDEO_FRAMES, VIDEO_SIZE = 5, 24, 121, (864, 480)
VIDEO_ENGINE = "comfyui:kandinsky-6.0-lite-distill"


def _video_graph(video_caption, audio_caption, seed, transformer=None):
    w, h = VIDEO_SIZE
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": transformer or VIDEO_TRANSFORMER, "weight_dtype": "default"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "qwen_2.5_vl_7b.safetensors", "clip_name2": "clip_l.safetensors",
                                                         "type": "kandinsky5", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "hunyuan_video_vae_bf16.safetensors"}},
        "4": {"class_type": "Kandinsky6AudioVAELoader", "inputs": {"tod_vae": "v1-44.pth", "bigvgan_dir": "bigvgan_vocoder",
                                                                   "mode": "44k", "scaling_factor": 0.417}},
        "5": {"class_type": "Kandinsky6TextEncode", "inputs": {"clip": ["2", 0], "video_caption": video_caption,
                                                               "audio_caption": audio_caption}},
        "6": {"class_type": "Kandinsky6TextEncode", "inputs": {"clip": ["2", 0], "video_caption": VIDEO_NEGATIVE, "audio_caption": ""}},
        "7": {"class_type": "Kandinsky6EmptyLatent", "inputs": {"width": w, "height": h, "length": VIDEO_FRAMES,
                                                                "fps": float(VIDEO_FPS), "batch_size": 1}},
        "8": {"class_type": "Kandinsky6Sampler", "inputs": {"model": ["1", 0], "seed": seed, "steps": 10, "cfg": 1.0,
                                                            "sampler_name": "euler", "scheduler": "simple", "positive": ["5", 0],
                                                            "negative": ["6", 0], "latent_image": ["7", 0], "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "Kandinsky6AudioVAEDecode", "inputs": {"audio_vae": ["4", 0], "joint_latent": ["8", 0]}},
        "11": {"class_type": "CreateVideo", "inputs": {"images": ["9", 0], "audio": ["10", 0], "fps": ["7", 1]}},
        "12": {"class_type": "SaveVideo", "inputs": {"video": ["11", 0], "filename_prefix": "ia-next-local/clip",
                                                     "format": "mp4", "codec": "h264"}},
    }


def _video_transformer():
    """The Lite Distill transformer under the name the engine lists it by (Windows lists it with backslashes), or None
    when the engine has no Kandinsky nodes or no Lite Distill weights."""
    try:
        if not httpx.get(config.COMFY_URL + "/object_info/Kandinsky6Sampler", timeout=8).json().get("Kandinsky6Sampler"):
            return None
        names = httpx.get(config.COMFY_URL + "/object_info/UNETLoader", timeout=8).json()["UNETLoader"]["input"]["required"]["unet_name"][0]
        names = names.get("value", names) if isinstance(names, dict) else names
        return next((n for n in names if n.replace("\\", "/") == VIDEO_TRANSFORMER), None)
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None


def video_available():
    return _video_transformer() is not None


def inspect_video(mp4):
    """What the file really holds, read with PyAV: {"video": {...}, "audio": {...} or None, "seconds": float}.
    Raises ProviderError when the bytes are not a decodable video."""
    import io

    import av

    from . import providers
    try:
        with av.open(io.BytesIO(mp4)) as c:
            v = next((s for s in c.streams if s.type == "video"), None)
            has_audio = any(s.type == "audio" for s in c.streams)
            if v is None:
                raise providers.ProviderError("the video engine returned a file with no video stream")
            rate = float(v.average_rate or VIDEO_FPS)
            info = {"codec": v.codec_context.name, "width": v.codec_context.width, "height": v.codec_context.height, "fps": rate}
            frames = sum(1 for _ in c.decode(v))
        out = {"video": dict(info, frames=frames), "audio": None, "seconds": round(frames / rate, 3)}
        if has_audio:
            with av.open(io.BytesIO(mp4)) as c:
                a = next(s for s in c.streams if s.type == "audio")
                peak, n = 0.0, 0
                for fr in c.decode(a):
                    arr = fr.to_ndarray()
                    n += arr.shape[-1]
                    if arr.size:
                        peak = max(peak, float(abs(arr.astype("float64")).max()) / (32768.0 if arr.dtype.kind == "i" else 1.0))
                rate_a = a.codec_context.sample_rate
                out["audio"] = {"codec": a.codec_context.name, "rate": rate_a, "seconds": round(n / rate_a, 3) if rate_a else 0,
                                "peak": round(peak, 4)}
        return out
    except providers.ProviderError:
        raise
    except Exception as e:                                # PyAV raises its own error family for damaged files
        raise providers.ProviderError(f"the video engine returned a file that does not decode ({type(e).__name__})") from e


def video(video_caption, audio_caption="", seed=7):
    """(MP4 bytes, engine name, facts). One five-second clip with sound. The file is decoded before it is returned: a
    clip with no audio stream, a silent track or the wrong length is refused, never passed off as the requested clip."""
    from . import providers
    if not available(wait=ENGINE_WAIT):
        raise providers.ProviderError(
            "video is not set up in IA Next Local: no engine answers at " + config.COMFY_URL +
            " (start it with scripts/start_image_engine.ps1). Nothing was sent to a paid video service")
    transformer = _video_transformer()
    if not transformer:
        raise providers.ProviderError("video is not set up in IA Next Local: the engine is running without the Kandinsky 6 "
                                      "nodes or the Lite Distill weights. Nothing was sent to a paid video service")
    mp4 = _run(_video_graph(video_caption, audio_caption, seed, transformer), ("video", "videos", "images", "gifs"), 40, "video")
    facts = inspect_video(mp4)
    if not facts["audio"]:
        raise providers.ProviderError("the video engine returned a clip without sound; it was not saved")
    if facts["audio"]["peak"] < 0.003:
        raise providers.ProviderError("the video engine returned a clip with a silent sound track; it was not saved")
    if abs(facts["seconds"] - VIDEO_SECONDS) > 0.25:
        raise providers.ProviderError(f"the video engine returned a {facts['seconds']}-second clip, not {VIDEO_SECONDS} seconds")
    return mp4, VIDEO_ENGINE, facts
