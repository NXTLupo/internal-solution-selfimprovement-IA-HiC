#!/usr/bin/env python3
"""
Test the chatbot API to identify issues
"""
import requests
import json

def test_conversation_creation():
    """Test creating a conversation"""
    url = "http://localhost:8000/api/chat/conversation"
    
    response = requests.post(url, json={})
    print(f"Conversation creation: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        return data.get("conversation_id")
    return None

def test_message_sending(conversation_id):
    """Test sending a message"""
    url = "http://localhost:8000/api/chat/message"
    
    # Test with form data (like the frontend does)
    data = {
        'conversation_id': conversation_id,
        'message': 'Hello, can you help me test the chatbot?'
    }
    
    response = requests.post(url, data=data)
    print(f"Message sending: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    return response.status_code == 200

def test_models_endpoint():
    """Test getting available models"""
    url = "http://localhost:8000/api/chat/models"
    
    response = requests.get(url)
    print(f"Models endpoint: {response.status_code}")
    print(f"Response: {response.text}")
    
    return response.status_code == 200

if __name__ == "__main__":
    print("Testing Chatbot API...")
    print("=" * 50)
    
    # Test conversation creation
    conversation_id = test_conversation_creation()
    
    if conversation_id:
        print(f"✅ Conversation created: {conversation_id}")
        
        # Test message sending
        if test_message_sending(conversation_id):
            print("✅ Message sent successfully")
        else:
            print("❌ Message sending failed")
    else:
        print("❌ Conversation creation failed")
    
    # Test models endpoint
    if test_models_endpoint():
        print("✅ Models endpoint working")
    else:
        print("❌ Models endpoint failed")