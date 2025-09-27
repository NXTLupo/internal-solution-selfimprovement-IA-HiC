"""
LLM Analyzer Module for Amazon Product Analysis
"""

from util.llm_models import LLM_PROVIDERS
from util.prompts import get_analysis_prompt, get_chat_prompt, get_analysis_prompt_json
import logging
import os
import json
import time
from dotenv import load_dotenv, find_dotenv

# Load environment variables from the nearest .env if present
_env_path = find_dotenv(usecwd=True)
if _env_path:
    load_dotenv(dotenv_path=_env_path, override=True)

# Configure logging
logger = logging.getLogger(__name__)

def analyze_product_data(product_data, query, llm_provider='claude'):
    """
    Analyze product data using the specified LLM provider.
    
    Args:
        product_data: List of product dictionaries
        query: Original search query
        llm_provider: LLM provider to use ('claude', 'openai', or 'gemini')
        
    Returns:
        Analysis result from the LLM
    """
    # Log the analysis request
    logger.info(f"Analyzing products for query: {query} using {llm_provider}")
    
    # Validate the LLM provider
    if llm_provider not in LLM_PROVIDERS:
        logger.error(f"Unknown LLM provider: {llm_provider}")
        return {
            "error": f"Unknown LLM provider: {llm_provider}",
            "available_providers": list(LLM_PROVIDERS.keys())
        }
    
    # Check if the API key is available
    env_var = LLM_PROVIDERS[llm_provider]['env_var']
    api_key = os.getenv(env_var)
    if not api_key:
        logger.error(f"API key not found for {llm_provider} ({env_var})")
        return {
            "error": f"API key not found for {llm_provider}",
            "env_var": env_var
        }
    
    # Generate the prompt
    prompt = get_analysis_prompt(product_data, query)
    
    # Log the prompt
    logger.info(f"Generated analysis prompt for {llm_provider}")
    
    # Call the LLM API
    try:
        # Get the appropriate function for the LLM provider
        llm_function = LLM_PROVIDERS[llm_provider]['function']
        
        # Call the LLM API
        messages = [{"role": "user", "content": prompt}]
        start_time = time.time()
        analysis_result = llm_function(messages, temperature=0.7)
        end_time = time.time()
        
        # Log the completion time
        logger.info(f"LLM analysis completed in {end_time - start_time:.2f} seconds")
        
        # Return the analysis result
        return {
            "analysis": analysis_result,
            "query": query,
            "provider": LLM_PROVIDERS[llm_provider]['name'],
            "product_count": len(product_data)
        }
    except Exception as e:
        logger.error(f"Error during LLM analysis: {str(e)}")
        return {
            "error": f"Error during analysis: {str(e)}",
            "query": query,
            "provider": LLM_PROVIDERS[llm_provider]['name']
        }

def get_structured_analysis(product_data, query, llm_provider='claude'):
    """
    Get a structured analysis of product data in JSON format.
    
    Args:
        product_data: List of product dictionaries
        query: Original search query
        llm_provider: LLM provider to use ('claude', 'openai', or 'gemini')
        
    Returns:
        Structured analysis in JSON format
    """
    # Log the analysis request
    logger.info(f"Getting structured analysis for query: {query} using {llm_provider}")
    
    # Validate the LLM provider
    if llm_provider not in LLM_PROVIDERS:
        logger.error(f"Unknown LLM provider: {llm_provider}")
        return {
            "error": f"Unknown LLM provider: {llm_provider}",
            "available_providers": list(LLM_PROVIDERS.keys())
        }
    
    # Check if the API key is available
    env_var = LLM_PROVIDERS[llm_provider]['env_var']
    api_key = os.getenv(env_var)
    if not api_key:
        logger.error(f"API key not found for {llm_provider} ({env_var})")
        return {
            "error": f"API key not found for {llm_provider}",
            "env_var": env_var
        }
    
    # Generate the prompt
    prompt = get_analysis_prompt_json(product_data, query)
    
    # Log the prompt
    logger.info(f"Generated structured analysis prompt for {llm_provider}")
    
    # Call the LLM API
    try:
        # Get the appropriate function for the LLM provider
        llm_function = LLM_PROVIDERS[llm_provider]['json_function']
        
        # Call the LLM API
        messages = [{"role": "user", "content": prompt}]
        start_time = time.time()
        analysis_result = llm_function(messages, temperature=0.7)
        end_time = time.time()
        
        # Log the completion time
        logger.info(f"Structured LLM analysis completed in {end_time - start_time:.2f} seconds")
        
        # Parse the JSON response
        try:
            analysis_json = json.loads(analysis_result)
            return analysis_json
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {str(e)}")
            return {
                "error": f"Error parsing JSON response: {str(e)}",
                "raw_response": analysis_result
            }
    except Exception as e:
        logger.error(f"Error during structured analysis: {str(e)}")
        return {
            "error": f"Error during structured analysis: {str(e)}",
            "query": query,
            "provider": LLM_PROVIDERS[llm_provider]['name']
        }

def answer_question(product_data, query, user_question, llm_provider='claude'):
    """
    Answer a user question about product data using the specified LLM provider.
    
    Args:
        product_data: List of product dictionaries
        query: Original search query
        user_question: User's question about the data
        llm_provider: LLM provider to use ('claude', 'openai', or 'gemini')
        
    Returns:
        Answer from the LLM
    """
    # Log the question answering request
    logger.info(f"Answering question about products for query: {query} using {llm_provider}")
    
    # Validate the LLM provider
    if llm_provider not in LLM_PROVIDERS:
        logger.error(f"Unknown LLM provider: {llm_provider}")
        return {
            "error": f"Unknown LLM provider: {llm_provider}",
            "available_providers": list(LLM_PROVIDERS.keys())
        }
    
    # Check if the API key is available
    env_var = LLM_PROVIDERS[llm_provider]['env_var']
    api_key = os.getenv(env_var)
    if not api_key:
        logger.error(f"API key not found for {llm_provider} ({env_var})")
        return {
            "error": f"API key not found for {llm_provider}",
            "env_var": env_var
        }
    
    # Generate the prompt
    prompt = get_chat_prompt(product_data, query, user_question)
    
    # Log the prompt
    logger.info(f"Generated Q&A prompt for {llm_provider}")
    
    # Call the LLM API
    try:
        # Get the appropriate function for the LLM provider
        llm_function = LLM_PROVIDERS[llm_provider]['function']
        
        # Call the LLM API
        messages = [{"role": "user", "content": prompt}]
        start_time = time.time()
        answer_result = llm_function(messages, temperature=0.7)
        end_time = time.time()
        
        # Log the completion time
        logger.info(f"LLM answer completed in {end_time - start_time:.2f} seconds")
        
        # Return the answer
        return {
            "answer": answer_result,
            "question": user_question,
            "query": query,
            "provider": LLM_PROVIDERS[llm_provider]['name']
        }
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        return {
            "error": f"Error answering question: {str(e)}",
            "question": user_question,
            "query": query,
            "provider": LLM_PROVIDERS[llm_provider]['name']
        }