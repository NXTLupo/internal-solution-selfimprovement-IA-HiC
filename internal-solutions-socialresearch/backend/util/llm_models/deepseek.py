import os
from azure.ai.inference import ChatCompletionsClient
from azure.core.credentials import AzureKeyCredential
from typing import List, Dict, Optional
import logging

# Set Azure HTTP logging policy to ERROR level to disable request/response logging
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.ERROR)

_logger = logging.getLogger(__name__)


AZURE_DEEPSEEK_KEY = os.getenv('AZURE_DEEPSEEK_KEY')
if not AZURE_DEEPSEEK_KEY:

    raise ValueError(
        "AZURE_DEEPSEEK_KEY not found in environment variables")



def get_single_deepseek_completion(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,  # Note: Temperature parameter is not supported by DeepSeek, will be ignored
    max_tokens: int = 4096,
    return_json: bool = False,  # Note: return_json parameter is not supported by DeepSeek, will be ignored
    schema: str = None,
) -> Optional[str]:
    """
    Get a single completion from DeepSeek using Azure AI Inference.

    Args:
        messages: List of message dictionaries with 'role' and 'content'
        model: Model name (not used, kept for compatibility)
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens in response
        attempt_time: Number of retry attempts
        return_json: Whether to request JSON response
        schema: JSON schema for structured output

    Returns:
        str: Model response or None if failed
    """
    
    try:
        client = ChatCompletionsClient(
            endpoint='https://DeepSeek-R1-jqkzz.eastus2.models.ai.azure.com',
            credential=AzureKeyCredential(AZURE_DEEPSEEK_KEY),
        )

        # Prepare the payload
        payload = {
            "messages": messages,
            "max_tokens": max_tokens,
            # Note: Temperature is not supported by DeepSeek API
            "temperature": temperature
        }

        # Add JSON formatting instruction if requested
        if return_json:
            if schema:
                messages.append({
                    "role": "system",
                    "content": f"Please provide response in JSON format following this schema: {schema}"
                })
            else:
                messages.append({
                    "role": "system",
                    "content": "Please provide response in JSON format."
                })

        response = client.complete(payload)
        print("Usage:")
        print("\tPrompt tokens:", response.usage.prompt_tokens)
        print("\tTotal tokens:", response.usage.total_tokens)
        print("\tCompletion tokens:", response.usage.completion_tokens)
        
        if response and response.choices:
            return response.choices[0].message.content
        return None

    except Exception as e:
        _logger.error(
            f"Failed to get response from DeepSeek API\n"
            f"messages: {messages}\n"
            f"error: {str(e)}"
        )
        return None


def get_json_deepseek_completion(messages, max_tokens=4096, temperature=0.7, stream=False):
    try:
        client = ChatCompletionsClient(
            endpoint='https://DeepSeek-R1-jqkzz.eastus2.models.ai.azure.com',
            credential=AzureKeyCredential(AZURE_DEEPSEEK_KEY),
        )

        # Prepare the payload with JSON format instruction
        messages.append({
            "role": "system",
            "content": "Please provide response in JSON format."
        })

        payload = {
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream  # Add stream parameter
        }

        response = client.complete(payload)
        
        if stream:
            # For streaming, yield each chunk
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        else:
            # Original non-streaming behavior
            print("Usage:")
            print("\tPrompt tokens:", response.usage.prompt_tokens)
            print("\tTotal tokens:", response.usage.total_tokens)
            print("\tCompletion tokens:", response.usage.completion_tokens)
            
            print("[deepseek] raw response:", response)
            if response and response.choices:
                return response.choices[0].message.content
            return None

    except Exception as e:
        _logger.error(
            f"Failed to get JSON response from DeepSeek API\n"
            f"messages: {messages}\n"
            f"error: {str(e)}"
        )
        return None


def test_deepseek():
    """Test DeepSeek API with different approaches."""

    # Test 1: Basic response
    messages = [{"role": "user", "content": "What is 2+2?"}]
    response = get_single_deepseek_completion(messages)
    print(f"Basic response: {response}\n")

    # Test 2: JSON response
    messages = [{"role": "user", "content": "List 3 European capitals"}]
    response = get_single_deepseek_completion(
        messages,
        return_json=True,
        schema='{"capitals": [{"city": "string", "country": "string"}]}'
    )
    print(f"JSON response: {response}\n")


if __name__ == "__main__":
    test_deepseek()
