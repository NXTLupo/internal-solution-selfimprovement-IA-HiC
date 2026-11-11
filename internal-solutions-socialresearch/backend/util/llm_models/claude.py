import os
import anthropic
import json
from dotenv import load_dotenv, find_dotenv

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Every analysis call in this service (topic summaries, sentiment evidence, image
# descriptions, RAG chat, LLM analyzer chunks and merges) goes through this module.
#
# Model: Claude Opus 5.5. Override with SOCIAL_RESEARCH_CLAUDE_MODEL. The legacy
# CLAUDE4_MODEL variable is deliberately NOT read: the workbench root .env pins it to
# the retired claude-sonnet-4-20250514 snapshot, which 404s and (2026-06-17) silently
# blanked every topic summary.
DEFAULT_CLAUDE_MODEL = "claude-opus-5-5"
DEFAULT_EFFORT = "medium"
DEFAULT_MAX_TOKENS = 16000  # thinking counts toward max_tokens on Opus 5.5

# Server-side refusal fallback: a request the safety classifiers decline is re-run on
# Anthropic's recommended fallback model inside the same call.
_FALLBACK_BETA = "server-side-fallback-2026-07-01"
_FALLBACK_MODELS = ("claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5")


def get_claude_model() -> str:
    # IA plan Phase 0: the routing authority's reasoning seat (Opus 5.5 today, unchanged behavior).
    from util.llm_models.seats import seat_model
    return seat_model("SOCIAL_RESEARCH_CLAUDE_MODEL", ("seats", "reasoning"), DEFAULT_CLAUDE_MODEL, "claude-")


# Function to refresh Claude API key - useful if container was restarted
def refresh_claude_api_key():
    # Try environment variable from multiple places
    key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY") or os.getenv("CLAUDE4_API_KEY")
    if key:
        print("Claude API key loaded")  # 2026-11-11: never print key characters, not even a prefix
        return key
    return None

# Get the current API key
api_key = refresh_claude_api_key()

# Initialize the Claude client
client = anthropic.Anthropic(
    api_key=api_key
)


def _create_message(messages: list, effort: str, max_tokens: int, label: str) -> str:
    """Send one request to Claude and return the concatenated text blocks.

    Opus 5.5 rejects temperature/top_p/top_k and always thinks, so responses start with
    a thinking block: text is read by block type, never by position. Returns "" on any
    failure (callers treat "" as no result) after logging the model, error and request id.
    """
    api_key = refresh_claude_api_key()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not found")

    model_name = get_claude_model()
    print(f"[claude.py] {label}: model={model_name} effort={effort}")
    client = anthropic.Anthropic(api_key=api_key, max_retries=3)

    kwargs = dict(
        model=model_name,
        max_tokens=max_tokens,
        messages=messages,
        output_config={"effort": effort},
    )
    if model_name in _FALLBACK_MODELS:
        response = client.beta.messages.create(betas=[_FALLBACK_BETA], fallbacks="default", **kwargs)
    else:
        response = client.messages.create(**kwargs)

    if response.stop_reason == "refusal":
        details = getattr(response, "stop_details", None)
        print(f"[claude.py] {label}: REFUSED model={response.model} category={getattr(details, 'category', None)} request_id={response._request_id}")
        return ""
    if response.stop_reason == "max_tokens":
        print(f"[claude.py] {label}: WARNING hit max_tokens={max_tokens}, output may be truncated (request_id={response._request_id})")
    if response.model != model_name:
        print(f"[claude.py] {label}: served by fallback model {response.model}")

    return "".join(block.text for block in response.content if block.type == "text")


def _log_api_error(label: str, e: Exception):
    request_id = getattr(e, "request_id", None)
    status = getattr(e, "status_code", None)
    print(f"[claude.py] {label}: ERROR model={get_claude_model()} {type(e).__name__} status={status} request_id={request_id}: {e}")


def get_claude_completion(messages: list, temperature: float = 1, effort: str = None,
                          max_tokens: int = DEFAULT_MAX_TOKENS) -> str:
    """Get chat completion from Anthropic's Claude API.

    `temperature` is accepted for caller compatibility and ignored (Opus 5.5 rejects it).
    """
    try:
        return _create_message(messages, effort or DEFAULT_EFFORT, max_tokens, "completion")
    except Exception as e:
        _log_api_error("completion", e)
        return ""


def get_claude_completion_with_json(messages: list, temperature: float = 1, effort: str = None,
                                    max_tokens: int = DEFAULT_MAX_TOKENS) -> str:
    """Get a JSON completion from Claude, re-asking once if the reply is not valid JSON.

    `temperature` is accepted for caller compatibility and ignored (Opus 5.5 rejects it).
    """
    response_text = ""
    for attempt in range(2):
        try:
            response_text = _create_message(messages, effort or DEFAULT_EFFORT, max_tokens, "json")
        except Exception as e:
            _log_api_error("json", e)
            return ""
        if not response_text:
            return ""
        processed_text = process_llm_response(response_text)
        try:
            json.loads(processed_text)
            return processed_text
        except json.JSONDecodeError as e:
            print(f"[claude.py] json: attempt {attempt + 1}/2 returned invalid JSON: {e}")
    print("[claude.py] json: no valid JSON after 2 attempts, returning raw response")
    return response_text


def get_image_description_completion(image_url: str, prompt_text: str) -> str:
    """Describe an image (by URL) for the Reddit image-processing step. Returns "" on failure."""
    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "url", "url": image_url}},
            {"type": "text", "text": prompt_text},
        ],
    }]
    try:
        return _create_message(messages, "low", 4000, "image")
    except Exception as e:
        _log_api_error("image", e)
        return ""


def process_llm_response(response_text):
    """Process LLM response to extract JSON content"""
    # Remove the thinking section if present
    if "<think>" in response_text and "</think>" in response_text:
        response_text = response_text.split("</think>")[1].strip()

    # Remove markdown code block formatting if present
    response_text = response_text.replace("```json", "").replace("```", "").strip()

    # Find JSON content if it's embedded in other text
    json_start = response_text.find('{')
    json_end = response_text.rfind('}') + 1

    if json_start >= 0 and json_end > json_start:
        return response_text[json_start:json_end]

    return response_text

def test_api():
    """Test the API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_claude_completion(messages)
    print(f"Response: {response}")

if __name__ == "__main__":
    test_api()
