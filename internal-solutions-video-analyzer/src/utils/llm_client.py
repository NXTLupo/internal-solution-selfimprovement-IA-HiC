import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
import json

logger = logging.getLogger("video-analyzer.llm_client")

# Load environment variables
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

async def anthropic_completion(messages: List[Dict[str, str]], max_tokens: int = 4000) -> str:
    """
    Get completion from Anthropic Claude API.
    
    Args:
        messages: List of message dictionaries (role, content)
        max_tokens: Maximum tokens to generate
        
    Returns:
        Generated text response
    """
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    logger.info(f"Sending request to Anthropic API (model: {ANTHROPIC_MODEL})")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens
                },
                timeout=60.0  # Longer timeout for large responses
            )
            
            if response.status_code != 200:
                logger.error(f"Error from Anthropic API: {response.text}")
                raise Exception(f"Error from Anthropic API: {response.text}")
                
            result = response.json()
            logger.info(f"Received response from Anthropic API ({len(result['content'][0]['text'])} chars)")
            return result["content"][0]["text"]
    except Exception as e:
        logger.error(f"Error calling Anthropic API: {str(e)}")
        raise

async def local_llm_completion(prompt: str, system_prompt: str) -> str:
    """
    Get completion from local LLM (using Ollama).
    
    Args:
        prompt: User prompt
        system_prompt: System prompt
        
    Returns:
        Generated text response
    """
    try:
        logger.info("Sending request to local LLM (Ollama)")
        
        # Assume Ollama is running locally
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "llama3:13b", # or other available model
                    "prompt": f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]",
                    "stream": False
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                logger.error(f"Error from local LLM: {response.text}")
                raise Exception(f"Error from local LLM: {response.text}")
                
            result = response.json()
            logger.info(f"Received response from local LLM ({len(result['response'])} chars)")
            return result["response"]
    except Exception as e:
        # Fallback to backup model
        logger.warning(f"Error with primary local LLM: {str(e)}")
        logger.info("Falling back to backup model...")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "http://localhost:11434/api/generate",
                    json={
                        "model": "mistral:7b", # Fallback model
                        "prompt": f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]",
                        "stream": False
                    },
                    timeout=120.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Error from backup LLM: {response.text}")
                    raise Exception(f"Error from backup LLM: {response.text}")
                    
                result = response.json()
                logger.info(f"Received response from backup LLM ({len(result['response'])} chars)")
                return result["response"]
        except Exception as e2:
            logger.error(f"Error with backup local LLM: {str(e2)}")
            raise Exception(f"Both primary and backup LLM failed: {str(e2)}")

async def get_llm_completion(prompt: str, system_prompt: str, use_local_llm: bool = False) -> str:
    """
    Get LLM completion using the appropriate method.
    
    Args:
        prompt: User prompt
        system_prompt: System prompt
        use_local_llm: Whether to use local LLM or API
        
    Returns:
        Generated text response
    """
    if use_local_llm:
        return await local_llm_completion(prompt, system_prompt)
    else:
        from .prompts import format_anthropic_messages
        messages = format_anthropic_messages(prompt, system_prompt)
        return await anthropic_completion(messages)