import os
import openai
from dotenv import load_dotenv, find_dotenv

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Model: GPT-6.1 Terra, falling back to GPT-5.5 (both verified callable on 2026-11-10).
# OPENAI_MODEL still overrides the primary. Note: the workbench root .env pins
# OPENAI_MODEL=o3; compose does not pass it into the container, but a local run whose
# find_dotenv() reaches the root .env will pick it up.
DEFAULT_OPENAI_MODEL = "gpt-6.1-terra"
FALLBACK_OPENAI_MODEL = "gpt-5.5"


def get_openai_model() -> str:
    # IA plan Phase 0: the routing authority's `analysis` seat secondary (GPT-6.1 Terra by the owner's matrix).
    from util.llm_models.seats import seat_model
    return seat_model("OPENAI_MODEL", ("seat_matrix", "analysis", "secondary"), DEFAULT_OPENAI_MODEL, "gpt-")


def _accepts_temperature(model: str) -> bool:
    """Reasoning families (o-series, GPT-5 and later) reject a non-default temperature."""
    return model.startswith(("gpt-4", "gpt-3.5"))


# Function to refresh OpenAI API key - useful if container was restarted
def refresh_openai_api_key():
    """Return the OpenAI API key from the environment, or None. Never logs the key."""
    key = os.getenv("OPENAI_API_KEY") or os.getenv("CHATGPT5_API_KEY")
    if key:
        openai.api_key = key
        return key
    return None


# Initial setup
openai_api_key = refresh_openai_api_key()


def _create_json_completion(model: str, messages: list, temperature: float) -> str:
    """One chat.completions call in JSON mode. Raises on an API error or an empty reply."""
    kwargs = dict(model=model, messages=messages, response_format={"type": "json_object"})
    if _accepts_temperature(model):
        kwargs["temperature"] = temperature
    response = openai.chat.completions.create(**kwargs)
    choice = response.choices[0]
    content = choice.message.content or ""
    if not content.strip():
        raise RuntimeError(f"empty reply from {model} (finish_reason={choice.finish_reason})")
    return content


def get_openai_completion(messages: list, temperature: float = 1) -> str:
    """Get a JSON-mode chat completion from OpenAI (primary model, then fallback).

    `temperature` is sent only to model families that accept it (gpt-4*, gpt-3.5*).
    Returns the reply text, or a JSON error string if both models fail.
    """
    if not refresh_openai_api_key():
        return '{"error": "OPENAI_API_KEY not found."}'

    model_name = get_openai_model()
    try:
        print(f"[openai.py] Using model: {model_name}")
        return _create_json_completion(model_name, messages, temperature)
    except Exception as e:
        if model_name == FALLBACK_OPENAI_MODEL:
            return '{"error": "' + str(e).replace('"', '\'') + '"}'
        print(f"[openai.py] Error with model {model_name}: {type(e).__name__}: {e}; falling back to {FALLBACK_OPENAI_MODEL}")

    try:
        return _create_json_completion(FALLBACK_OPENAI_MODEL, messages, temperature)
    except Exception as fallback_error:
        print(f"[openai.py] Error with fallback model {FALLBACK_OPENAI_MODEL}: {type(fallback_error).__name__}: {fallback_error}")
        return '{"error": "' + str(fallback_error).replace('"', '\'') + '"}'


def test_api():
    """Test the API with a simple message."""
    messages = [{"role": "user", "content": "Say hello as a JSON object with a 'greeting' field."}]
    response = get_openai_completion(messages, temperature=0.3)
    print(f"Response: {response}")


if __name__ == "__main__":
    test_api()
