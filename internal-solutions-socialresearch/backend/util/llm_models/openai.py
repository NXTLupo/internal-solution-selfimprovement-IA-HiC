import os
import logging

# Set Azure HTTP logging policy to ERROR level to disable request/response logging
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.ERROR)

# Check if we should use mock Azure services (default to True for safety)
USE_MOCK = os.getenv('MOCK_AZURE_SERVICES', 'true').lower() == 'true' or os.getenv('SKIP_AZURE_AUTH', 'true').lower() == 'true'

# Initialize client as None first
project = None
client = None

# Only try to connect to Azure if not using mock services
if not USE_MOCK:
    try:
        from azure.ai.projects import AIProjectClient
        from azure.identity import DefaultAzureCredential
        
        conn_str = os.getenv('PROJECT_CONNECTION_STRING')
        if conn_str:
            project = AIProjectClient.from_connection_string(
                conn_str=conn_str,
                credential=DefaultAzureCredential()
            )
            client = project.inference.get_chat_completions_client()
            print("Successfully connected to Azure AI Project")
        else:
            print("PROJECT_CONNECTION_STRING not provided, using mock OpenAI service")
    except Exception as e:
        print(f"Error connecting to Azure AI Project: {e}")
        print("Falling back to mock OpenAI service")
else:
    print("Using mock OpenAI service (MOCK_AZURE_SERVICES=true or SKIP_AZURE_AUTH=true)")

def get_openai_completion(messages: list, temperature: float = 1) -> str:
    """Get chat completion from Azure OpenAI or mock service."""
    if client and not USE_MOCK:
        try:
            response = client.complete(
                model="gpt-4o", 
                messages=messages,
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error in get_completion: {e}")
            return _get_mock_response(messages)
    else:
        return _get_mock_response(messages)

def _get_mock_response(messages: list) -> str:
    """Provide a mock response when Azure OpenAI is not available."""
    last_message = messages[-1]["content"] if messages else ""
    
    # Simple mock responses based on the content
    if "hello" in last_message.lower() or "hi" in last_message.lower():
        return "Hello! I'm a mock AI assistant. How can I help you today?"
    
    if "sentiment" in last_message.lower() or "analyze" in last_message.lower():
        return "This text appears to have a neutral to slightly positive sentiment. There are elements of both factual information and subjective opinion, with moderate emotional content."
    
    if "summary" in last_message.lower() or "summarize" in last_message.lower():
        return "This content discusses various aspects of product experiences and user feedback. Key points include feature requests, usability issues, and general satisfaction levels."
    
    # Default response for any other query
    return "I've processed your request. As this is running in mock mode, I've generated this placeholder response. In production, this would be a detailed analysis from Azure OpenAI."

def test_api():
    """Test the API with a simple message."""
    messages = [{"role": "user", "content": "Say hello!"}]
    response = get_openai_completion(messages, temperature=0.3)
    print(f"Response: {response}")

if __name__ == "__main__":
    test_api()

