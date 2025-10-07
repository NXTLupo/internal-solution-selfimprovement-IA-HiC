"""
Validate parameter naming fix for journey mapper file uploads

This script tests the parameter naming fix for the journey.upload_file tool.
It directly calls the agent's execute_tool_call method with both parameter names
to ensure the conversion is working properly.
"""

import asyncio
import requests
import json
import base64
import os
import uuid
import tempfile

# Configuration
AGENT_URL = "http://localhost:8500"

async def test_parameter_fix():
    """Test the parameter naming fix for journey.upload_file"""
    # Create a test conversation
    response = requests.post(f"{AGENT_URL}/api/chat/conversation")
    if response.status_code != 200:
        print(f"Error creating conversation: {response.text}")
        return
    
    conversation_id = response.json().get("conversation_id")
    print(f"Created conversation: {conversation_id}")
    
    # Create a sample test file
    test_file_path = os.path.join(tempfile.gettempdir(), f"test_file_{uuid.uuid4()}.txt")
    with open(test_file_path, "w") as f:
        f.write("This is a test file for journey mapping.\n")
        f.write("Customer Journey:\n")
        f.write("1. Awareness - Customer discovers the product through advertising\n")
        f.write("2. Consideration - Customer researches product features and pricing\n")
        f.write("3. Purchase - Customer buys the product online\n")
        f.write("4. Onboarding - Customer sets up and starts using the product\n")
        f.write("5. Usage - Customer uses the product regularly\n")
        f.write("6. Support - Customer contacts support for help with issues\n")
        f.write("7. Renewal - Customer decides whether to continue using the product\n")
    
    print(f"Created test file: {test_file_path}")
    
    # Upload the file
    with open(test_file_path, "rb") as f:
        file_data = f.read()
        
        files = {"file": (os.path.basename(test_file_path), file_data)}
        data = {"conversation_id": conversation_id, "message": "I'm uploading a journey mapping file."}
        
        upload_response = requests.post(f"{AGENT_URL}/api/chat/message", files=files, data=data)
        
        if upload_response.status_code != 200:
            print(f"Error uploading file: {upload_response.text}")
            return
        
        print(f"File uploaded: {upload_response.json()}")
    
    # Send a message to process the file with explicit instructions to test both parameter formats
    test_message = """
    Please help me test the file parameter handling in journey.upload_file. 
    
    First, try to use the file I just uploaded with the following FORMAT A:
    ```json
    {
      "tool_calls": [
        {
          "name": "journey.upload_file",
          "parameters": {
            "file_id": "UPLOADED_FILE_ID"
          }
        }
      ]
    }
    ```
    
    After that, check if the following FORMAT B would also work:
    ```json
    {
      "tool_calls": [
        {
          "name": "journey.upload_file",
          "parameters": {
            "file": "UPLOADED_FILE_ID"
          }
        }
      ]
    }
    ```
    
    Which format works for you?
    """
    
    message_response = requests.post(
        f"{AGENT_URL}/api/chat/message", 
        data={"conversation_id": conversation_id, "message": test_message}
    )
    
    if message_response.status_code != 200:
        print(f"Error sending message: {message_response.text}")
        return
    
    print(f"Agent response: {message_response.json()}")
    
    # Clean up
    os.unlink(test_file_path)
    print(f"Removed test file: {test_file_path}")
    print("Test completed!")

if __name__ == "__main__":
    asyncio.run(test_parameter_fix())