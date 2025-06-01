#!/usr/bin/env python3
import os
import requests
import json
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def claude4_api_call(prompt, model="claude-sonnet-4-20250514", max_tokens=64000, temperature=0.3, system="You are Claude, an AI assistant with expertise in journey mapping, data analysis, visualization, and WCAG accessibility standards. Use your expertise to create highly detailed, informative, and visually appealing journey maps that maximize content depth and maintain accessibility best practices. Generate content up to the maximum token limits."):
    """
    Wrapper for Anthropic API using Claude 4 (claude-sonnet-4-20250514)
    """
    # Use user's API key
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in environment variables")

    # Set headers for Anthropic API
    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key,
        "anthropic-version": "2023-06-01"
    }

    # Check if model is explicitly set to Claude 4 (already validated)
    is_claude4 = "claude-sonnet-4" in model or "claude-4" in model.lower()
    
    # Claude 4 system message enhancement for extended thinking
    if is_claude4 and "extended thinking" not in system.lower() and "thinking mode" not in system.lower():
        system += " When faced with complex problems, use extended thinking to explore multiple perspectives, consider tradeoffs, and reach well-reasoned conclusions."

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

    # Print key parameters
    logger.info(f"\n🔄 API Request Details:")
    logger.info(f" - Model: {model}")
    logger.info(f" - Max tokens: {max_tokens}")
    logger.info(f" - Temperature: {temperature}")
    logger.info(f" - Prompt length: {len(prompt)} characters")
    
    # Set timeout to 30 minutes (1,800,000 ms)
    timeout = 1800  # 30 minutes in seconds
    logger.info(f" - Timeout: {timeout}s")
    
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
                logger.warning(f" - SSL connection error, retrying in {retry_delay}s (attempt {attempt+1}/{max_retries})")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                raise  # Reraise on final attempt
    
    if response.status_code != 200:
        error_msg = f"API call failed with status {response.status_code}"
        try:
            error_detail = response.json().get("error", {}).get("message", "Unknown error")
            error_msg += f": {error_detail}"
        except:
            pass
        raise Exception(error_msg)
    
    # Extract and return text response
    result = response.json()
    
    # Log response details
    logger.info(f"\n✅ API Response Details:")
    usage = result.get("usage", {})
    
    # Extract token counts if available
    if usage:
        input_tokens = usage.get("input_tokens", "unknown")
        output_tokens = usage.get("output_tokens", "unknown")
        logger.info(f" - Input tokens: {input_tokens}")
        logger.info(f" - Output tokens: {output_tokens}")
        logger.info(f" - Total tokens: {input_tokens + output_tokens if isinstance(input_tokens, int) and isinstance(output_tokens, int) else 'unknown'}")
    
    text = result.get("content", [{}])[0].get("text", "")
    logger.info(f" - Response length: {len(text)} characters")
    
    # Check for refusal (new in Claude 4)
    stop_reason = result.get("stop_reason", "")
    if stop_reason == "stop_sequence":
        logger.info(f" - Stop reason: Normal completion")
    elif stop_reason == "max_tokens":
        logger.warning(f" - Stop reason: Max tokens reached")
    elif stop_reason == "refusal":
        logger.warning(f" - Stop reason: Refusal - Claude 4 refused to respond to this prompt")
        refusal_warning = "\n⚠️ WARNING: Claude 4 refused to respond to this prompt. The response may be incomplete or missing."
        text = refusal_warning + "\n\n" + text
    
    return text