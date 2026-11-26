"""Speech on this machine: Piper speaks (where IA Next paid ElevenLabs through HiC) and Whisper listens (where IA
Next paid OpenAI). Both run on the processor inside the container, from weights already on this laptop, mounted
read-only: Piper voices under config.SPEECH_DIR and the faster-whisper weights in the Hugging Face cache.

dialogue() answers HiC's /api/tts/dialogue: {"url", "bytes", "turns", "voices", "provider", "cost_usd"}. The url is
"local:<file>", which audio._fetch reads from disk. transcribe() returns segments with times.
"""
import glob
import io
import os
import threading
import wave

from . import config

_VOICES = {}
_WHISPER = {}
_LOCK = threading.Lock()
PREFERRED = ("en_US-lessac-medium", "en_US-ryan-medium")       # two distinct speakers for a two-voice overview


def voice_files():
    found = sorted(glob.glob(os.path.join(config.SPEECH_DIR, "**", "*.onnx"), recursive=True))
    by_name = {os.path.basename(f)[:-5]: f for f in found}
    ordered = [by_name[n] for n in PREFERRED if n in by_name] + [f for n, f in by_name.items() if n not in PREFERRED]
    return ordered


def _voice(path):
    with _LOCK:
        if path not in _VOICES:
            from piper import PiperVoice
            _VOICES[path] = PiperVoice.load(path)
        return _VOICES[path]


# Kokoro (an open speech model, run on the processor) when its files are in the speech folder: its voices read as
# people talking, where Piper's read as announcements (owner, 20 Nov, on Gemini's overview: "their audio podcast is
# amazing"). Piper stays as the fallback.
KOKORO_VOICES = ("af_heart", "am_michael", "af_bella", "am_fenrir")


def _kokoro():
    d = os.path.join(config.SPEECH_DIR, "kokoro")
    m, v = os.path.join(d, "kokoro-v1.0.onnx"), os.path.join(d, "voices-v1.0.bin")
    if not (os.path.exists(m) and os.path.exists(v)):
        return None
    with _LOCK:
        if "kokoro" not in _VOICES:
            try:
                from kokoro_onnx import Kokoro
                _VOICES["kokoro"] = Kokoro(m, v)
            except Exception:
                _VOICES["kokoro"] = None
        return _VOICES["kokoro"]


def _speak_kokoro(k, name, text):
    import numpy as np
    samples, rate = k.create(text, voice=name, speed=1.0, lang="en-us")
    pcm = (np.clip(np.asarray(samples, dtype="float32"), -1.0, 1.0) * 32767.0).astype("<i2").tobytes()
    return pcm, int(rate), 1, 2


def _speak(voice, text):
    """PCM frames for one turn: (bytes, sample rate, channels, sample width)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        if hasattr(voice, "synthesize_wav"):
            voice.synthesize_wav(text, w)
        else:
            voice.synthesize(text, w)
    buf.seek(0)
    with wave.open(buf, "rb") as r:
        return r.readframes(r.getnframes()), r.getframerate(), r.getnchannels(), r.getsampwidth()


def dialogue(turns, slug):
    from . import providers
    files = voice_files()
    kokoro = _kokoro()
    if not files and not kokoro:
        raise providers.ProviderError("no speech voice is installed under the speech folder, so the voices cannot be made")
    speakers = []
    for t in turns:
        if t.get("speaker") not in speakers:
            speakers.append(t.get("speaker"))
    if kokoro:
        assign = {s: KOKORO_VOICES[i % len(KOKORO_VOICES)] for i, s in enumerate(speakers)}
        files = list(KOKORO_VOICES)
    else:
        assign = {s: files[i % len(files)] for i, s in enumerate(speakers)}
    import lameenc
    mp3, rate_used, chars, seconds = bytearray(), None, 0, 0.0
    enc = None
    for t in turns:
        text = str(t.get("text") or "").strip()
        if not text:
            continue
        if kokoro:
            pcm, rate, ch, width = _speak_kokoro(kokoro, assign[t.get("speaker")], text)
        else:
            pcm, rate, ch, width = _speak(_voice(assign[t.get("speaker")]), text)
        if enc is None:
            enc = lameenc.Encoder()
            enc.set_bit_rate(96)
            enc.set_in_sample_rate(rate)
            enc.set_channels(ch)
            enc.set_quality(5)
            rate_used = rate
        if rate != rate_used:               # voices of different rates: this one is skipped rather than played wrong
            continue
        gap = 0.2 if len(text) < 60 else 0.38          # a quick reaction follows closely; a full turn gets a breath
        pause = b"\x00" * (int(rate * gap) * ch * width)
        mp3 += enc.encode(pcm + pause)
        chars += len(text)
        seconds += len(pcm) / (rate * ch * width) + gap
    if enc is None:
        raise providers.ProviderError("there was no text to speak")
    mp3 += enc.flush()
    out_dir = os.path.join(config.DATA_DIR, "speech")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "".join(c for c in slug if c.isalnum() or c in "-_")[:120] + ".mp3")
    with open(path, "wb") as fh:
        fh.write(bytes(mp3))
    return {"url": "local:" + path, "slug": slug, "bytes": len(mp3), "turns": len(turns),
            "voices": {str(s): (f if kokoro else os.path.basename(f)[:-5]) for s, f in assign.items()},
            "provider": "kokoro (local)" if kokoro else "piper (local)",
            "degraded": "" if len(files) >= len(speakers) else "one voice speaks for every speaker: a second voice is not installed",
            "seconds": round(seconds, 1), "characters": chars, "cost_usd": 0.0}


def read_local(url):
    with open(url[len("local:"):], "rb") as fh:
        return fh.read()


def transcribe(path, size="small"):
    """[{start, end, text}] for an audio or video file, by faster-whisper on the processor (weights from the cache)."""
    from . import providers
    with _LOCK:
        if size not in _WHISPER:
            try:
                from faster_whisper import WhisperModel
                _WHISPER[size] = WhisperModel(size, device="cpu", compute_type="int8")
            except Exception as e:
                raise providers.ProviderError(f"the local speech-to-text model could not be loaded ({type(e).__name__}: {str(e)[:160]})")
        model = _WHISPER[size]
    segments, info = model.transcribe(path, vad_filter=True, beam_size=5)
    return [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments], \
        {"language": info.language, "duration": round(info.duration, 1), "model": f"faster-whisper-{size}"}
