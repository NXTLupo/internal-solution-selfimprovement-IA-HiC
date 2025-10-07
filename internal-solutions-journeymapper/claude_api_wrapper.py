#!/usr/bin/env python3
import os
import requests
import json
import time

def claude_api_call(prompt, model="claude-3-7-sonnet-20250219", max_tokens=64000, temperature=0.3, system="You are Claude, an AI assistant with expertise in journey mapping, data analysis, visualization, and WCAG accessibility standards. Use your expertise to create highly detailed, informative, and visually appealing journey maps that maximize content depth and maintain accessibility best practices. Generate content up to the maximum token limits."):
    """
    Simple wrapper for Anthropic API that doesn't use the SDK
    """
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
        try:
            error_detail = response.json().get("error", {}).get("message", "Unknown error")
            error_msg += f": {error_detail}"
        except:
            pass
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
    text = result.get("content", [{}])[0].get("text", "")
    print(f" - Response length: {len(text)} characters")
    return text
