#!/usr/bin/env python3
import os
import logging
import json
import time
from typing import Dict, Any, List, Optional, Union
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables to cache state and avoid repeated API calls
_AVAILABLE_MODELS = None
_ORGANIZATION_VERIFIED_FOR_O3 = None
_USING_FALLBACK_MODEL = False  # Track when we've fallen back from o3 to gpt-4o

def openai_api_call(
    prompt: str,
    model: str = "o3",  # Using o3 - OpenAI's specialized reasoning model
    max_tokens: int = 4000,
    temperature: float = 0.7,
    system_message: str = "You are a helpful assistant.",
    reasoning_effort: str = "medium",  # Options: "low", "medium", "high"
    retry_count: int = 3,
    retry_delay: int = 5,
    json_mode: bool = False
) -> Union[Dict[str, Any], str]:
    """
    Make an API call to OpenAI's o3 reasoning model or fallback model.
    
    Args:
        prompt (str): The user's prompt
        model (str): OpenAI model to use (default: o3)
        max_tokens (int): Maximum tokens to generate
        temperature (float): Temperature parameter for generation
        system_message (str): System message to define assistant behavior
        reasoning_effort (str): Reasoning effort level ("low", "medium", "high")
        retry_count (int): Number of times to retry on failure
        retry_delay (int): Delay between retries in seconds
        json_mode (bool): Whether to request a JSON response
        
    Returns:
        Union[Dict[str, Any], str]: Response from OpenAI API
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    # Initialize the client
    client = OpenAI(api_key=api_key)
    
    # Check if o-series model is available if not already verified
    original_model = model  # Store original model request for tracking
    global _ORGANIZATION_VERIFIED_FOR_O3, _USING_FALLBACK_MODEL
    
    # NO FALLBACKS - use exactly the model requested or fail with a clear error
    if model.startswith("o"):
        logger.info(f"Using {model} model directly as requested")
        
        # Only check if model is in available models list - no verification
        available_models = get_available_models(force_refresh=True)
        if model not in available_models:
            error_message = "The selected model '" + str(model) + "' is not available with your current API key. Available models: " + ", ".join(available_models)
            logger.error(error_message)
            raise ValueError(error_message)
            
        # Still update this for legacy code compatibility, but don't use it for fallbacks
        if model == "o3":
            _ORGANIZATION_VERIFIED_FOR_O3 = True
    
    # Prepare the messages
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": prompt}
    ]
    
    # Configure responses API parameters for o-series models
    if model.startswith("o"):
        # o3 uses the responses API with reasoning parameters
        for attempt in range(retry_count):
            try:
                logger.info("Making OpenAI " + str(model) + " API call (attempt " + str(attempt + 1) + "/" + str(retry_count) + ")")
                
                # Prepare messages in responses API format
                response_messages = [
                    {"role": "user", "content": prompt}
                ]
                
                # For JSON mode (if needed)
                response_format = {"type": "json_object"} if json_mode else None
                
                # Call the responses API with reasoning parameters
                # Use the correct parameters for responses API
                try:
                    # Build a minimal parameter set that should work with all o-series models
                    api_params = {
                        "model": model,
                        "reasoning": {"effort": reasoning_effort, "summary": "auto"},
                        "input": response_messages
                    }
                    
                    # Add additional parameters for specific o-series models
                    if model.startswith("o1"):
                        # o1 models benefit from higher reasoning effort
                        api_params["reasoning"] = {"effort": "high", "summary": "auto"}
                    
                    # These parameters are not supported in all o-series models
                    # So we'll try to add them, but be prepared to remove them if they fail
                    optional_params = {}
                    
                    # Add response format if needed
                    if response_format:
                        optional_params["response_format"] = response_format
                        
                    # Try adding max_tokens parameter - will be used by the SDK if appropriate
                    if max_tokens:
                        optional_params["max_tokens"] = max_tokens
                        
                    # Try adding temperature if provided and not disabled for o-series models
                    disable_temp_for_o = os.environ.get("DISABLE_O_SERIES_TEMPERATURE", "").lower() == "true"
                    if temperature and temperature != 0.7 and not (disable_temp_for_o and model.startswith("o")):  # Only add if appropriate
                        optional_params["temperature"] = temperature
                    
                    # First try with all parameters
                    try:
                        response = client.responses.create(**{**api_params, **optional_params})
                    except Exception as param_error:
                        error_msg = str(param_error).lower()
                        if "temperature" in error_msg and "not supported" in error_msg:
                            # Remove temperature and try again
                            logger.info("Temperature not supported with this model, removing parameter")
                            optional_params.pop("temperature", None)
                            try:
                                response = client.responses.create(**{**api_params, **optional_params})
                            except Exception as e2:
                                # Still having issues, try minimal parameters
                                logger.warning(f"Still having parameter issues: {str(e2)}")
                                response = client.responses.create(**api_params)
                        elif "max_tokens" in error_msg or "unexpected keyword" in error_msg:
                            # Remove max_tokens and try again
                            logger.info("max_tokens not supported or unexpected, removing parameter")
                            optional_params.pop("max_tokens", None)
                            try:
                                response = client.responses.create(**{**api_params, **optional_params})
                            except Exception as e2:
                                # Still having issues, try minimal parameters
                                logger.warning(f"Still having parameter issues: {str(e2)}")
                                response = client.responses.create(**api_params)
                        else:
                            # Try with just the minimal parameters
                            logger.warning(f"Parameter error: {error_msg}, using minimal parameters")
                            response = client.responses.create(**api_params)
                except Exception as e:
                    # Last resort: try with the absolute minimal parameter set
                    logger.error(f"Error in responses API call: {str(e)}. Trying with minimal parameters.")
                    response = client.responses.create(
                        model=model,
                        reasoning={"effort": reasoning_effort},
                        input=response_messages
                    )
                
                # Log token usage statistics for cost management
                try:
                    if hasattr(response, "usage"):
                        # Safely extract token usage - o1 models might have different attributes
                        total_tokens = getattr(response.usage, "total_tokens", 0)
                        
                        # Handle completion tokens safely
                        completion_tokens = 0
                        try:
                            if hasattr(response.usage, "completion_tokens"):
                                completion_tokens = getattr(response.usage, "completion_tokens", 0)
                            else:
                                logger.info("No completion_tokens attribute found in response.usage")
                        except Exception as e:
                            logger.warning(f"Error accessing completion_tokens: {str(e)}")
                        
                        # Handle reasoning tokens safely
                        reasoning_tokens = 0
                        try:
                            if hasattr(response.usage, "completion_tokens_details"):
                                completion_details = getattr(response.usage, "completion_tokens_details", None)
                                if completion_details and hasattr(completion_details, "reasoning_tokens"):
                                    reasoning_tokens = getattr(completion_details, "reasoning_tokens", 0)
                        except Exception as e:
                            logger.warning(f"Error accessing reasoning_tokens: {str(e)}")
                        
                        logger.info("Token usage - Total: " + str(total_tokens) + ", "
                                    "Completion: " + str(completion_tokens) + ", "
                                    "Reasoning: " + str(reasoning_tokens))
                except Exception as e:
                    logger.warning(f"Could not log token usage: {str(e)}")
                
                # Return formatted response with content and metadata
                return {
                    "content": response.output_text,
                    "model": model,
                    "usage": getattr(response, "usage", {}),
                    "finish_reason": "stop"  # Default since responses API doesn't always provide this
                }
                
            except Exception as e:
                logger.warning(f"o3 API call error: {str(e)}")
                
                error_msg = str(e).lower()
                if "not authorized" in error_msg or "not available" in error_msg or "not a member" in error_msg:
                    logger.warning(str(model) + " not available for this organization, falling back to alternative")
                    
                    # For o3 specifically, update the global verification flag
                    if model == "o3":
                        _ORGANIZATION_VERIFIED_FOR_O3 = False
                        
                    # Try to find best alternative model
                    available_models = get_available_models(force_refresh=True)
                    o_series_alternatives = [m for m in available_models if m.startswith("o") and m != model]
                    
                    if o_series_alternatives:
                        model = sorted(o_series_alternatives, 
                                      key=lambda x: (x.split('-')[0].replace('o',''), '-mini' not in x), 
                                      reverse=True)[0]
                        logger.warning("Falling back to alternative o-series model: " + str(model))
                    else:
                        model = "gpt-4o"
                        logger.warning("No o-series models available, falling back to gpt-4o")
                        
                    _USING_FALLBACK_MODEL = True
                    break  # Exit loop to use fallback model
                elif "rate_limit" in str(e).lower():
                    logger.warning("Rate limit reached, waiting before retry")
                    time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    continue
                elif attempt < retry_count - 1:
                    logger.info(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    logger.error(f"Failed after {retry_count} attempts: {str(e)}")
                    raise
    
    # Fallback to standard completions API for other models
    # Use the chat completions API for other models (gpt-4o, gpt-4, etc.)
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    
    # Add response_format if json_mode is True
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    
    # Retry logic
    for attempt in range(retry_count):
        try:
            logger.info(f"Making OpenAI API call to model {model} (attempt {attempt + 1}/{retry_count})")
            
            # Use the client's chat completions API
            response = client.chat.completions.create(**payload)
            
            if hasattr(response.choices, "__getitem__") and len(response.choices) > 0:
                content = response.choices[0].message.content
                return {
                    "content": content,
                    "model": model,
                    "usage": getattr(response, "usage", {}),
                    "finish_reason": getattr(response.choices[0], "finish_reason", "stop")
                }
            else:
                logger.error(f"Unexpected OpenAI API response structure: {response}")
                raise ValueError("Unexpected response structure from OpenAI API")
            
        except Exception as e:
            logger.warning(f"OpenAI API error: {str(e)}")
            
            error_str = str(e).lower()
            if "rate_limit" in error_str or "429" in error_str:
                # Rate limit error
                logger.warning("OpenAI API rate limit reached, waiting before retry")
                # Use longer delay for rate limits
                time.sleep((retry_delay * 2) * (attempt + 1))  # Exponential backoff with longer delays
                continue
                
            elif attempt < retry_count - 1:
                # Server error, retry
                logger.warning(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                continue
                
            else:
                # Other errors after all retries
                logger.error(f"Failed after {retry_count} attempts: {str(e)}")
                raise
    
    # If we get here, all retries failed
    raise ValueError(f"OpenAI API call failed after {retry_count} attempts")


def get_available_models(force_refresh=False) -> List[str]:
    """
    Get a list of OpenAI models that are actually available to this organization.
    Caches results to avoid repeated API calls.
    
    Args:
        force_refresh: If True, ignores cached results and forces a new API call
        
    Returns:
        List[str]: List of model IDs that are available
    """
    global _AVAILABLE_MODELS
    
    # Return cached results if available and not forcing refresh
    if _AVAILABLE_MODELS is not None and not force_refresh:
        return _AVAILABLE_MODELS
    
    # Get API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY environment variable not set")
        return ["gpt-4o", "gpt-4", "gpt-3.5-turbo"]  # Default fallback list
    
    try:
        # Initialize the client
        client = OpenAI(api_key=api_key)
        
        # Get the list of models
        models = client.models.list()
        
        # Extract model IDs and filter for relevant models
        model_ids = [model.id for model in models.data]
        
        # Check for all o-series and gpt models we're interested in
        available_models = []
        
        # Add all o-series models (Tier 4 account includes these)
        o_series_models = ["o1", "o1-preview", "o1-mini", "o1-pro", "o3-mini", "o3", "o4-mini"]
        for o_model in o_series_models:
            if o_model in model_ids:
                available_models.append(o_model)
        
        # Also include standard GPT models as fallbacks
        for model_id in model_ids:
            if model_id.startswith("gpt-"):
                # Add most common GPT models but avoid duplicates and fine-tuned models
                if any(model_part in model_id for model_part in ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]) and "ft:" not in model_id:
                    available_models.append(model_id)
        
        # Remove duplicates and sort
        available_models = sorted(list(set(available_models)))
        
        # Cache results
        _AVAILABLE_MODELS = available_models
        
        logger.info(f"Available models: {available_models}")
        return available_models
        
    except Exception as e:
        logger.error(f"Error fetching available models: {str(e)}")
        return ["gpt-4o", "gpt-4", "gpt-3.5-turbo"]  # Default fallback list


def is_using_fallback_model() -> bool:
    """
    This function is kept for backward compatibility.
    We no longer use fallbacks as they are forbidden.
    """
    return False


def check_organization_verification(force_check=False, model="o3") -> bool:
    """
    Checks if the current OpenAI organization is verified for access to a specific model.
    Returns True if verified, False if not.
    
    Args:
        force_check: If True, ignores cached result and forces a new check
        model: The model to check access for (default: "o3")
    """
    global _ORGANIZATION_VERIFIED_FOR_O3
    
    # Return cached result if available and not forcing a new check
    if _ORGANIZATION_VERIFIED_FOR_O3 is not None and not force_check:
        return _ORGANIZATION_VERIFIED_FOR_O3
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY environment variable not set")
        _ORGANIZATION_VERIFIED_FOR_O3 = False
        return False
        
    # Check if key looks valid (basic format check)
    if not (api_key.startswith('sk-') or len(api_key) >= 40):
        logger.error("OPENAI_API_KEY appears to be in incorrect format")
        _ORGANIZATION_VERIFIED_FOR_O3 = False
        return False
    
    try:
        # Initialize the client
        client = OpenAI(api_key=api_key)
        
        # First try a direct API call to the specified model - most reliable method
        try:
            # Try a small test call
            logger.info(f"Testing {model} access with direct API call")
            
            # Different API endpoints for different model types
            if model.startswith("o"):  # o-series models use responses API
                # Use absolute minimal parameters for verification
                # o1, o3, and o4 all support these basic parameters
                response = client.responses.create(
                    model=model,
                    reasoning={"effort": "low"},
                    input=[{"role": "user", "content": "Hello"}]
                )
            else:  # Standard models use chat completions API
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": "Hello"}],
                    max_tokens=10
                )
                
            logger.info(f"✅ Organization is verified for {model} access (verified by direct API call)")
            
            if model == "o3":  # Still maintain backward compatibility
                _ORGANIZATION_VERIFIED_FOR_O3 = True
                
            # Update cached available models to include this model
            if _AVAILABLE_MODELS is not None and model not in _AVAILABLE_MODELS:
                _AVAILABLE_MODELS.append(model)
                # Keep the list sorted with o-series models first
                _AVAILABLE_MODELS.sort(key=lambda x: (0 if x.startswith("o") else 1, x))
            return True
        except Exception as api_error:
            error_msg = str(api_error).lower()
            if "not authorized" in error_msg or "not available" in error_msg or "not a member" in error_msg:
                logger.warning(f"❌ Organization not verified for {model} access. The {model} model is not available.")
                
                if model == "o3":  # Maintain backward compatibility
                    _ORGANIZATION_VERIFIED_FOR_O3 = False
                    
                # Update cached available models to remove the model
                if _AVAILABLE_MODELS is not None and model in _AVAILABLE_MODELS:
                    _AVAILABLE_MODELS.remove(model)
                return False
            elif "rate limit" in error_msg or "rate_limit" in error_msg:
                logger.warning("⚠️ Rate limit reached during o3 verification. Trying alternative method.")
                # Fall through to model list check
            elif "server_error" in error_msg or "internal_error" in error_msg:
                logger.warning("⚠️ Server error during o3 verification. Trying alternative method.")
                # Fall through to model list check
            else:
                # If the error is not related to authorization, assume it's a temporary issue
                logger.warning(f"⚠️ Error during o3 verification, but not authorization-related: {error_msg}")
                # Fall through to model list check
        
        # Fallback: try to list models
        model_list = get_available_models(force_refresh=True)
        
        # Check if the requested model is in the available models
        model_available = model in model_list
        
        if model_available:
            logger.info(f"✅ Organization is verified for {model} access (from model list)")
            
            if model == "o3":  # Maintain backward compatibility
                _ORGANIZATION_VERIFIED_FOR_O3 = True
                
            return True
        else:
            logger.warning(f"❌ Organization not verified for {model} access (from model list)")
            
            if model == "o3":  # Maintain backward compatibility
                _ORGANIZATION_VERIFIED_FOR_O3 = False
                
            return False
            
    except Exception as e:
        logger.error(f"Error checking organization verification: {str(e)}")
        _ORGANIZATION_VERIFIED_FOR_O3 = False
        return False