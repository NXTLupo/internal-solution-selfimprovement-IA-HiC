import os
import json
import time
from dotenv import load_dotenv, find_dotenv

# google-genai is the SDK pinned in requirements.txt. The legacy google.generativeai
# package this module used to import is not installed in the image, so the import failed
# and llm_provider fell back to its "Gemini not available" stub. An ImportError here still
# lets llm_provider take that fallback.
from google import genai
from google.genai import types

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Model: Gemini 4 Carbon, falling back to Gemini 3.1 Pro (both verified callable on
# 2026-11-10). Override the primary with SOCIAL_RESEARCH_GEMINI_MODEL.
DEFAULT_GEMINI_MODEL = "gemini-4-carbon"
FALLBACK_GEMINI_MODEL = "gemini-3.1-pro-preview"
_ATTEMPTS_PER_MODEL = 2


def get_gemini_model() -> str:
    # IA plan Phase 0: the routing authority's `research` seat (Gemini 4 Carbon by the owner's matrix);
    # the env override first, the constant only when the proxy cannot be read.
    from util.llm_models.seats import seat_model
    return seat_model("SOCIAL_RESEARCH_GEMINI_MODEL", ("seat_matrix", "research", "primary"), DEFAULT_GEMINI_MODEL, "gemini-")


def _models_to_try() -> list:
    primary = get_gemini_model()
    return [primary] if primary == FALLBACK_GEMINI_MODEL else [primary, FALLBACK_GEMINI_MODEL]


def refresh_gemini_api_key():
    """Return the Gemini API key from the environment, or None. Never logs the key."""
    return os.getenv("GEMINI_API_KEY") or None


# Kept for callers that read the module attribute
gemini_api_key = refresh_gemini_api_key()


def _generate(prompt: str, model: str, json_mode: bool) -> str:
    """One generate_content call. Raises on an API error or an empty reply.

    Temperature is not sent: Gemini 3 and later recommend the default and can loop or
    degrade below it, so the `temperature` argument on the public functions is accepted
    for caller compatibility and ignored.
    """
    api_key = refresh_gemini_api_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not found")
    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(response_mime_type="application/json") if json_mode else None
    response = client.models.generate_content(model=model, contents=prompt, config=config)
    text = response.text or ""
    if not text.strip():
        finish = None
        if getattr(response, "candidates", None):
            finish = getattr(response.candidates[0], "finish_reason", None)
        raise RuntimeError(f"empty reply from {model} (finish_reason={finish})")
    return text


def _complete(messages: list, json_mode: bool, label: str):
    """Try the primary model, then the fallback. Returns (text, None) or (None, error)."""
    prompt = "\n".join(msg["content"] for msg in messages)
    last_error = None
    for model in _models_to_try():
        for attempt in range(_ATTEMPTS_PER_MODEL):
            try:
                print(f"[gemini.py] {label}: model={model} attempt={attempt + 1}/{_ATTEMPTS_PER_MODEL}")
                return _generate(prompt, model, json_mode), None
            except Exception as e:
                last_error = e
                print(f"[gemini.py] {label}: model={model} attempt {attempt + 1} failed: {type(e).__name__}: {e}")
                if attempt < _ATTEMPTS_PER_MODEL - 1:
                    time.sleep(2 ** attempt)
    return None, last_error


def get_gemini_completion(messages: list, temperature: float = 0.3) -> str:
    """Get a chat completion from Gemini (primary, then fallback model).

    Args:
        messages: List of message dictionaries with 'content' keys
        temperature: accepted for caller compatibility and ignored (see _generate)

    Returns:
        The raw response text, or a JSON error string if every attempt failed.
    """
    if not refresh_gemini_api_key():
        return '{"error": "GEMINI_API_KEY not found."}'
    text, error = _complete(messages, json_mode=False, label="completion")
    if text is None:
        print("[gemini.py] completion: all models failed")
        return '{"error": "Failed to call Gemini API: ' + str(error).replace('"', '\'') + '"}'
    return text


def process_llm_response(response_text: str) -> str:
    """Process LLM response to extract JSON content."""
    # Remove Gemini <thinking> tags if present
    if "<thinking>" in response_text and "</thinking>" in response_text:
        thinking_start = response_text.find("<thinking>")
        thinking_end = response_text.find("</thinking>", thinking_start) + len("</thinking>")
        response_text = response_text[:thinking_start] + response_text[thinking_end:]
        response_text = response_text.strip()

    # Remove markdown code block formatting if present
    response_text = response_text.replace("```json", "").replace("```", "").strip()

    # Find JSON content if it's embedded in other text
    json_start = response_text.find('{')
    json_end = response_text.rfind('}') + 1
    if json_start >= 0 and json_end > json_start:
        return response_text[json_start:json_end]

    return response_text


def get_gemini_json_completion(messages: list, temperature: float = 0.3) -> str:
    """Get a JSON completion from Gemini (JSON response mode, primary then fallback)."""
    if not refresh_gemini_api_key():
        return '{"error": "GEMINI_API_KEY not found."}'

    # Make sure the last message requests JSON format (on a copy; the caller's list is untouched)
    messages = [dict(m) if isinstance(m, dict) else m for m in messages]
    if messages and isinstance(messages[-1], dict) and 'content' in messages[-1]:
        last_message = messages[-1]['content']
        if not last_message.strip().endswith('JSON'):
            messages[-1]['content'] = f"{last_message}\nPlease format the response as valid JSON."

    text, error = _complete(messages, json_mode=True, label="json")
    if text is None:
        print("[gemini.py] json: all models failed")
        return '{"error": "Failed to call Gemini API."}'

    processed_text = process_llm_response(text)
    try:
        json.loads(processed_text)
        return processed_text
    except json.JSONDecodeError as e:
        print(f"[gemini.py] json: reply is not valid JSON ({e}), returning raw response")
        return text


def test_api():
    """Test the Gemini API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_gemini_completion(messages)
    print(f"Response: {response}")

    json_messages = [{"role": "user", "content": "Say hello and format your response as a JSON object with a 'greeting' field."}]
    json_response = get_gemini_json_completion(json_messages)
    print(f"JSON Response: {json_response}")


if __name__ == "__main__":
    test_api()
