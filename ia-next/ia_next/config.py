"""Configuration for IA Next, the personal-agent system (docs/INTELLIGENCE_AUGMENTATION_TRANSFORMATION_PLAN.md).

IA Next runs as a completely separate system from the existing Intelligence Augmentation suite: its own
compose project (`ia-next`), its own network, its own data volume and its own port range (9400 and up).
It never calls an existing suite service; it talks to the model providers directly with the same keys.
"""
import os

PORT = int(os.environ.get("IA_NEXT_PORT", "9400"))
DATA_DIR = os.environ.get("IA_NEXT_DATA", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"))
DB_PATH = os.path.join(DATA_DIR, "ia_next.sqlite3")
ENGAGEMENTS_DIR = os.path.join(DATA_DIR, "engagements")
MEMORY_DIR = os.path.join(DATA_DIR, "memory")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# The owner's seat matrix of 2026-11-10 (plan 6.10), as probed on 2026-11-11. No Grok, by the owner.
# OpenAI Sora is shut down (2026-09-24), so video has a Google primary only.
SEATS = {
    "orchestration": {"primary": "claude-opus-5-5", "secondary": "gemini-4-carbon"},
    "deep_reasoning": {"primary": "gpt-6-astra", "secondary": "claude-fable-5-2"},   # owner, 2026-11-11, after the 3-run bake-off
    "research": {"primary": "gemini-4-carbon", "secondary": "claude-opus-5-5"},
    "search": {"primary": "gemini-4-argon", "secondary": None},
    "artifact": {"primary": "claude-opus-5-5", "secondary": "claude-sonnet-5-5"},
    "analysis": {"primary": "claude-sonnet-5-5", "secondary": "gpt-6.1-terra"},
    "fast": {"primary": "gpt-6-luna", "secondary": "claude-haiku-5-5"},
    "image": {"primary": "gpt-image-2.6-flare", "secondary": "gemini-nano-banana-2.1"},
    "video": {"primary": "gemini-omni-1.2-flash", "secondary": None},
    # The verifier is a rule, not an id: a vendor different from the author's (plan 6.5).
    "verifier": {"primary": "gemini-4-carbon", "secondary": "gpt-6-astra"},
}

# List prices per million tokens (input, output) where published; used for the budget meter.
PRICES = {
    "claude-opus-5-5": (4.00, 20.0), "claude-sonnet-5-5": (2.00, 10.0), "claude-haiku-5-5": (0.10, 0.50),
    "claude-fable-5-2": (10.0, 50.0),
}
UNPRICED = (5.00, 20.0)   # deliberately conservative for models without a recorded price

# Spend above this many US dollars for one task needs the person's approval (approval class "spend").
TASK_SPEND_APPROVAL_USD = float(os.environ.get("IA_NEXT_TASK_SPEND_APPROVAL_USD", "3.00"))


def vendor_of(model: str) -> str:
    m = (model or "").lower()
    if m.startswith("claude-"):
        return "anthropic"
    if m.startswith(("gpt-", "o1", "o3", "o4")):
        return "openai"
    return "google"


def ensure_dirs():
    for d in (DATA_DIR, ENGAGEMENTS_DIR, MEMORY_DIR):
        os.makedirs(d, exist_ok=True)
