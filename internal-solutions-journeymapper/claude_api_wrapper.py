#!/usr/bin/env python3
import os
import re
import requests
import json
import time

from model_seats import reasoning_model

# 2026-11-11 (IA plan Phase 0, section 6.10): the Claude 4.6+ / 5.x request contract, mirrored from the platform
# chokepoint (humans-in-control-research/proxy/model_registry.py CLAUDE_ADAPTIVE_RE). These models reject
# temperature / top_p / top_k with a 400.
_NO_SAMPLING_RE = re.compile(r"claude-(opus-4-[6-9]|opus-5|sonnet-4-6|sonnet-5|haiku-5|fable|mythos)", re.I)


def _model_deprecates_temperature(model: str) -> bool:
    """Reasoning models reject the `temperature` parameter (400 error): every Claude 4.6+ / 5.x model, and any
    explicitly-tagged reasoning model. The 400 retry below is the backstop for anything this misses."""
    m = (model or "").lower()
    if _NO_SAMPLING_RE.search(m):
        return True
    if "-reasoning" in m or "-thinking" in m:
        return True
    return False


def claude_api_call(prompt, model=None, max_tokens=64000, temperature=0.3, system="You are Claude, an AI assistant with expertise in journey mapping, data analysis, visualization, and WCAG accessibility standards. Use your expertise to create highly detailed, informative, and visually appealing journey maps that maximize content depth and maintain accessibility best practices. Generate content up to the maximum token limits."):
    """
    Simple wrapper for Anthropic API that doesn't use the SDK
    """
    # No model passed: the routing authority's reasoning seat (model_seats.py).
    model = model or reasoning_model()
    # Use user's API key
    api_key = os.environ.get("ANTHROPIC_API_KEY", os.environ.get("ANTHROPIC_API_KEY", ""))
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in environment variables")
    # If extended thinking is desired, enhance the system prompt
    if "extended thinking" in system.lower() or "thinking mode" in system.lower():
        # System prompt already contains extended thinking instructions
        pass
    else:
        # Default to adding basic extended thinking instructions
        system += " Take your time to think deeply about the problems presented."
    # Set headers for anthropic API
    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key,
        "anthropic-version": "2023-06-01"
    }
    # Create request body
    data = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "system": system,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    # Reasoning models (Opus 4.7+) deprecate the `temperature` parameter and
    # return a 400 if it is sent. Rather than maintain an allowlist that rots
    # every time a new reasoning model ships, drop temperature pre-emptively
    # for any model we know deprecates it, and additionally retry-without it on
    # the specific 400 below. Belt and suspenders so this can never whack-a-mole.
    if temperature is None or _model_deprecates_temperature(model):
        data.pop("temperature", None)
    # Print key parameters
    print(f"\n🔄 API Request Details:")
    print(f" - Model: {model}")
    print(f" - Max tokens: {max_tokens}")
    print(f" - Temperature: {temperature}")
    print(f" - Prompt length: {len(prompt)} characters")
    # Set timeout to 30 minutes (1,800,000 ms)
    timeout = 1800000 # 30 minutes
    print(f" - Timeout: {timeout}ms")
    # API call with retry logic for SSL connection issues
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data,
                timeout=timeout
            )
            break  # Success, exit retry loop
        except requests.exceptions.SSLError as ssl_err:
            if attempt < max_retries - 1:  # Don't sleep on the last attempt
                print(f" - SSL connection error, retrying in {retry_delay}s (attempt {attempt+1}/{max_retries})")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                raise  # Reraise on final attempt
    if response.status_code != 200:
        error_msg = f"API call failed with status {response.status_code}"
        error_detail = ""
        try:
            error_detail = response.json().get("error", {}).get("message", "Unknown error")
            error_msg += f": {error_detail}"
        except:
            pass
        # Backstop: if the model rejected `temperature`, strip it and retry
        # once. This auto-adapts to any reasoning model that deprecates the
        # parameter without needing a name allowlist.
        if response.status_code == 400 and "temperature" in error_detail.lower() and "temperature" in data:
            print(" - Model rejected `temperature`; retrying once without it")
            data.pop("temperature", None)
            try:
                response = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=data,
                    timeout=timeout
                )
            except requests.exceptions.SSLError:
                raise Exception(error_msg)
            if response.status_code != 200:
                raise Exception(error_msg)
        else:
            raise Exception(error_msg)
    # Extract and return text response
    result = response.json()
    # Log response details
    print(f"\n✅ API Response Details:")
    usage = result.get("usage", {})
    # Extract token counts if available
    if usage:
        input_tokens = usage.get("input_tokens", "unknown")
        output_tokens = usage.get("output_tokens", "unknown")
        print(f" - Input tokens: {input_tokens}")
        print(f" - Output tokens: {output_tokens}")
        print(f" - Total tokens: {input_tokens + output_tokens if isinstance(input_tokens, int) and isinstance(output_tokens, int) else 'unknown'}")
    # Claude 5.x models think by default, so the reply can open with a thinking block (empty text under the default
    # display); the answer is the concatenation of the text blocks, never content[0].
    text = "".join(
        block.get("text", "") for block in result.get("content", []) or []
        if isinstance(block, dict) and block.get("type") == "text"
    )
    print(f" - Response length: {len(text)} characters")
    return text
