"""Configuration for IA Next Local: the same personal-agent system, with every model call answered on this machine.

Owner goal, 2026-11-19: "a free, local version of IA Next that works exactly as designed but without any token cost or
API cost", mapped from the IA Next local model guide (Puget C160-G, RTX 5090 Laptop GPU 24 GB, 96 GB RAM).

- No provider key is read here and none is passed to the container (see ia-next-local.compose.yml). providers.py
  refuses any request to a metered model host, so a mistake fails loudly instead of spending.
- A seat names open-weight models served by Ollama on the host (OLLAMA_MODELS lives on D:). "chain" is tried in
  order: the first model that is installed answers, so the build works today on what is already on disk and takes up
  the guide's preferred model as soon as its download lands. What actually answered is recorded with every call.
- It is a separate system from IA Next: its own compose project (`ia-next-local`), networks, data volume and port
  (9460). It never writes to IA Next's data.
"""
import os

LOCAL = True
PORT = int(os.environ.get("IA_NEXT_PORT", "9460"))
DATA_DIR = os.environ.get("IA_NEXT_DATA", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"))
DB_PATH = os.path.join(DATA_DIR, "ia_next.sqlite3")
ENGAGEMENTS_DIR = os.path.join(DATA_DIR, "engagements")
MEMORY_DIR = os.path.join(DATA_DIR, "memory")

# Kept as names so shared code that asks "is a key set" reads False; nothing in this build sends them anywhere.
ANTHROPIC_API_KEY = GEMINI_API_KEY = OPENAI_API_KEY = ""

RENDER_URL = os.environ.get("IA_NEXT_RENDER_URL", "http://ia-next-local-render:9500")
OLLAMA_URL = os.environ.get("IA_NEXT_OLLAMA_URL", "http://host.docker.internal:11434").rstrip("/")
SEARCH_URL = os.environ.get("IA_NEXT_SEARCH_URL", "http://ia-next-local-search:8080").rstrip("/")      # SearXNG, self-hosted
COMFY_URL = os.environ.get("IA_NEXT_COMFY_URL", "http://host.docker.internal:8189").rstrip("/")         # images
SPEECH_DIR = os.environ.get("IA_NEXT_SPEECH_DIR", "/models/speech")                                     # Piper voices, Whisper

NEMOTRON = "hf.co/ggml-org/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-GGUF:Q4_0"
QWEN = "qwen3.8:27b-q4_K_M"
QWEN_SMALL = "qwen3.8:27b-ud-iq4_xs"          # the same model in 14 GB: leaves room for a long context on 24 GB
ORNITH = "hf.co/ornith-ai/Ornith-1.5-35B-A3B-GGUF:Q4_K_M"
MINICPM = "hf.co/openbmb/MiniCPM5-2B-GGUF:Q4_K_M"
QWEN_9B = "qwen3.5:9b"
QWEN_4B = "qwen3:4b"

# The guide's allocation. primary/secondary keep the shape the rest of the code reads; chain is the install fallback.
SEATS = {
    # Owner's decision, 23 Nov, from the orchestration bake-off (scripts/bakeoff_orchestration.py): Qwen alone holds the
    # conversation, so chat and the studio share one resident model (median 3.4 s vs 11.9 s; model loads 0.3 s vs 250.6 s)
    "orchestration": {"primary": QWEN, "secondary": NEMOTRON, "chain": [QWEN, QWEN_SMALL, NEMOTRON, QWEN_9B]},
    "deep_reasoning": {"primary": QWEN, "secondary": NEMOTRON, "chain": [QWEN, QWEN_SMALL]},          # dormant (DORMANT_SEATS)
    "research": {"primary": QWEN, "secondary": NEMOTRON, "chain": [QWEN, QWEN_SMALL]},               # dormant (DORMANT_SEATS)
    # QWEN_SMALL kept in this chain: since the conversation seat moved to Qwen (23 Nov), Nemotron's fallback is read here
    # Field test 23 Nov (S6): the search planner ran on Nemotron, so every research run loaded a second 18 GB model
    # for three short calls (5 loads, 104 s of loading, 455 s for 1,677 tokens). It now runs on the resident model.
    "search": {"primary": QWEN, "secondary": QWEN_SMALL, "chain": [QWEN, QWEN_SMALL, QWEN_9B]},
    "artifact": {"primary": QWEN, "secondary": QWEN_SMALL, "chain": [QWEN, QWEN_SMALL, QWEN_9B]},
    "analysis": {"primary": QWEN, "secondary": NEMOTRON, "chain": [QWEN, QWEN_SMALL, QWEN_9B]},
    "fast": {"primary": MINICPM, "secondary": MINICPM, "chain": [MINICPM, QWEN_4B, QWEN_9B]},
    # In use: the Prototyper writes with Ornith (measured 23 Nov: 36 calls, 13 prototype steps). The uplift plan of 23
    # Nov called this path unused; it is not, so it stays.
    "prototype": {"primary": ORNITH, "secondary": QWEN, "chain": [ORNITH, QWEN, QWEN_SMALL]},
    # owner's decision, 25 Nov: the model the brief recommended, after a side by side on this card (localmedia.py)
    "image": {"primary": "comfyui:moss-image-sft", "secondary": "comfyui:sd3.5-large"},
    "video": {"primary": "comfyui:kandinsky-6.0-lite-distill", "secondary": None},
    # The verifier is a rule, not an id: a publisher different from the author's (plan 6.5, guide step 3).
    # QWEN_SMALL and QWEN_9B close this chain: it is the first seat whose primary is Nemotron, so Nemotron's fallback
    # is read here now that the search seat is Qwen's
    "verifier": {"primary": NEMOTRON, "secondary": QWEN, "chain": [NEMOTRON, QWEN, QWEN_SMALL, QWEN_9B]},
    "vision": {"primary": QWEN, "secondary": QWEN_9B, "chain": [QWEN, QWEN_SMALL, QWEN_9B]},
}

# Uplift plan WS-6: seats no code reads (checked 23 Nov). They keep IA Next's seat table whole; nothing loads them,
# and the deep health check does not wait on them.
DORMANT_SEATS = ("deep_reasoning", "research")

# Largest context a call may ask for. Past what fits in 24 GB, Ollama places layers in system memory: slower, never cut.
MAX_CTX = int(os.environ.get("IA_NEXT_MAX_CTX", "65536"))
KEEP_ALIVE = os.environ.get("IA_NEXT_KEEP_ALIVE", "2h")      # was 30m: an idle half hour cost the next message a load (E8)
# Field test 23 Nov (S1): when another app holds graphics memory, the 17.7 GB writer spills into shared memory and
# runs at 1 to 6 tokens a second (measured: 5.8 with Figma holding 7.6 GB; the 14.9 GB file ran at 33.8 in the same
# minute). A call slower than SLOW_TOKENS_PER_SECOND moves that model's work to SMALLER[model] for SLOW_HOLD_SECONDS,
# then the larger file is tried again.
SLOW_TOKENS_PER_SECOND = float(os.environ.get("IA_NEXT_SLOW_TPS", "10"))
# Field test 23 Nov (S2): the deck is planned in one short call and written three slides at a time, each saved.
DECK_STEPS = os.environ.get("IA_NEXT_DECK_STEPS", "1") != "0"
REPORT_STEPS = os.environ.get("IA_NEXT_REPORT_STEPS", "1") != "0"      # the report: an outline call, then a call per section
# Field test 23 Nov (speed against quality): two depths. Fast is the default: the report is written once, checked by the
# rules in code (every quote found in its source, citations, banned wording) and repaired once if they find anything.
# Deep adds the second model from another publisher as reviewer, which costs two loads of an 18 GB model per review.
# A request that says deep, thorough, exhaustive or comprehensive gets deep. IA_NEXT_DEPTH=deep makes it the default.
# findings are checked against the population the request is about (evidencequality.scope): one short call
DOC_STEPS = os.environ.get("IA_NEXT_DOC_STEPS", "1") != "0"      # localartifact.generate_in_steps: plan, then a call per section
DECK_FIGURES_SLIDE = os.environ.get("IA_NEXT_DECK_FIGURES_SLIDE", "1") != "0"   # deckstudio.figures_slide
AUDIO_EXCHANGES = os.environ.get("IA_NEXT_AUDIO_EXCHANGES", "1") != "0"   # audio.liven: the other speaker comes in
SCOPE_CHECK = os.environ.get("IA_NEXT_SCOPE_CHECK", "1") != "0"
DEFAULT_DEPTH = os.environ.get("IA_NEXT_DEPTH", "fast").strip().lower()
# QA 25 Nov (E2): a deep request reads every source of the chosen packs, the way HiC does, before it chooses
DEEP_WHOLE_PACK = os.environ.get("IA_NEXT_DEEP_WHOLE_PACK", "1") != "0"
DEEP_PACK_SOURCES = int(os.environ.get("IA_NEXT_DEEP_PACK_SOURCES", "60"))       # pack sources a deep run may keep
DEEP_PER_PUBLISHER = int(os.environ.get("IA_NEXT_DEEP_PER_PUBLISHER", "4"))
DEEP_PACK_SECONDS = int(os.environ.get("IA_NEXT_DEEP_PACK_SECONDS", "240"))      # time allowed to read the packs whole
DOC_SECTION_SOURCES = os.environ.get("IA_NEXT_DOC_SECTION_SOURCES", "1") != "0"  # localartifact.only_sources
DECK_SOURCES_SLIDE = os.environ.get("IA_NEXT_DECK_SOURCES_SLIDE", "1") != "0"   # deckstudio.sources_slides
CITE_PAGES = os.environ.get("IA_NEXT_CITE_PAGES", "1") != "0"                     # citations.py: date and link on every source
SLOW_MIN_TOKENS = 60               # a rate is only judged on a reply at least this long
SLOW_HOLD_SECONDS = 900
SMALLER = {QWEN: QWEN_SMALL}
# Uplift plan WS-2 step 2: a changed num_ctx reloads the model and drops its prompt cache (measured 23 Nov on Ollama
# 0.40.16: 3.4 s for the 2B model). Each model therefore starts at one fixed context, its floor, and moves up a step
# only for a call too large for it. 32k holds the largest stepped writing call measured (material plus a 12k reply).
CTX_FLOOR = {QWEN: 32768, QWEN_SMALL: 32768, NEMOTRON: 32768, ORNITH: 32768, QWEN_9B: 16384, QWEN_4B: 16384, MINICPM: 16384}

# Uplift plan WS-5 step 1: characters per token, measured 23 Nov on source evidence quoted as the builders quote it
# (scripts/calibrate_tokens.py, /data/token_calibration.json). Ollama 0.40.16 has no tokenizer endpoint. JSON is denser:
# 2.94 (Qwen) to 3.56 characters per token, so tool and schema text is counted at CHARS_PER_TOKEN_JSON. A model not
# measured is counted at three characters per token, the old safe figure.
CHARS_PER_TOKEN = {QWEN: 4.09, QWEN_SMALL: 4.09, NEMOTRON: 4.10, MINICPM: 4.25}
CHARS_PER_TOKEN_JSON = 2.9

# Local inference has no token price. The meter still records tokens, seconds and the model that answered.
PRICES = {}
UNPRICED = (0.0, 0.0)

# Kept so approvals, budgets and the session limit behave as designed; local calls cost 0.00, so they never trip.
TASK_SPEND_APPROVAL_USD = float(os.environ.get("IA_NEXT_TASK_SPEND_APPROVAL_USD", "3.00"))
SESSION_SPEND_LIMIT_USD = float(os.environ.get("IA_NEXT_SESSION_LIMIT_USD", "15.00"))

# Hosts this build must never call. providers._guard raises before any request to one of them leaves the process.
METERED_HOSTS = ("api.anthropic.com", "api.openai.com", "generativelanguage.googleapis.com", "api.elevenlabs.io",
                 "api.replicate.com", "api.deepseek.com", "openai.azure.com", "aiplatform.googleapis.com")


def vendor_of(model: str) -> str:
    """The publisher of a model's weights. Judge independence is by publisher (guide: "Enforce publisher identity
    across the actual author and judge"); a derivative counts as its base family's publisher."""
    m = (model or "").lower()
    if "nemotron" in m:
        return "nvidia"
    if "qwen" in m or "bonsai" in m:
        return "alibaba"
    if "ornith" in m:
        return "ornith"
    if "minicpm" in m:
        return "openbmb"
    if "sensenova" in m:
        return "sensetime"
    if "llama" in m:
        return "meta"
    return "local"


def ensure_dirs():
    for d in (DATA_DIR, ENGAGEMENTS_DIR, MEMORY_DIR):
        os.makedirs(d, exist_ok=True)

# QA 25 Nov (E16): a plan on an engagement that holds nothing keeps its research step on instead of failing later
KEEP_RESEARCH_WHEN_EMPTY = True
