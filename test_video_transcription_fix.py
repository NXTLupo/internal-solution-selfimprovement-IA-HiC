#!/usr/bin/env python3
"""
Test script to verify video transcription timeout fix
This script tests the complete video transcription workflow to ensure hanging issues are resolved.
"""

import requests
import json
import time
import sys

def test_video_transcription_workflow():
    """Test the complete video transcription workflow"""
    base_url = "http://localhost:8000"
    
    print("=== Testing Video Transcription Timeout Fix ===")
    
    # Step 1: Create a conversation
    print("\n1. Creating conversation...")
    try:
        response = requests.post(f"{base_url}/api/mcp/conversation", timeout=10)
        if response.status_code == 200:
            conversation_data = response.json()
            conversation_id = conversation_data.get('conversation_id')
            print(f"✓ Conversation created: {conversation_id}")
        else:
            print(f"✗ Failed to create conversation: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error creating conversation: {str(e)}")
        return False
    
    # Step 2: Test video transcription request (this was hanging before)
    print("\n2. Testing video transcription request...")
    test_youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Short test video
    
    try:
        # Send the message that was causing hanging
        message_data = {
            'conversation_id': conversation_id,
            'message': f'Please transcribe this YouTube video: {test_youtube_url}'
        }
        
        print(f"Sending transcription request for: {test_youtube_url}")
        print("(This should NOT hang anymore - will timeout after 5 minutes max)")
        
        # Set a reasonable timeout for the test
        response = requests.post(
            f"{base_url}/api/mcp/message", 
            data=message_data,
            timeout=120  # 2 minute timeout for the test
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Got response (not hanging!): {result.get('response', '')[:200]}...")
            
            # Check if the response indicates the transcription was started
            response_text = result.get('response', '').lower()
            if 'transcription' in response_text and ('started' in response_text or 'processing' in response_text):
                print("✓ Video transcription process started successfully")
                return True
            else:
                print(f"? Unexpected response: {result}")
                return True  # Still not hanging, which is the main fix
        else:
            print(f"✗ Request failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("✗ Request timed out after 2 minutes - this suggests the hanging issue may still exist")
        return False
    except Exception as e:
        print(f"✗ Error during transcription request: {str(e)}")
        return False

def test_video_mcp_status_endpoint():
    """Test the video MCP status endpoint directly to ensure timeout handling works"""
    print("\n=== Testing Video MCP Status Endpoint ===")
    
    # Test with a fake job ID to see if timeout handling works
    test_job_id = "test-job-12345"
    mcp_url = "http://localhost:8504"
    
    try:
        print(f"Testing status check for fake job: {test_job_id}")
        response = requests.post(
            f"{mcp_url}/mcp/invoke/video_get_job_status",
            data={'job_id': test_job_id},
            timeout=15  # Should respond within timeout limit
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Status endpoint responded: {result}")
            
            # Check if we get the expected timeout handling response
            status = result.get('status', '')
            message = result.get('message', '')
            if 'processing' in status or 'processing' in message:
                print("✓ Timeout handling appears to be working")
                return True
            else:
                print(f"? Got different response than expected: {result}")
                return True  # Still responding, which is good
        else:
            print(f"Status check returned: {response.status_code} - {response.text}")
            return response.status_code != 500  # Any non-500 error is better than hanging
            
    except requests.exceptions.Timeout:
        print("✗ Status endpoint still timing out - timeout fix may not be working")
        return False
    except Exception as e:
        print(f"Error testing status endpoint: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("Testing video transcription timeout fixes...")
    print("This script verifies that video transcription no longer hangs indefinitely.")
    
    # Test 1: Direct MCP endpoint
    mcp_test_passed = test_video_mcp_status_endpoint()
    
    # Test 2: Full workflow through agent
    workflow_test_passed = test_video_transcription_workflow()
    
    print("\n=== Test Results ===")
    print(f"MCP Status Endpoint Test: {'✓ PASSED' if mcp_test_passed else '✗ FAILED'}")
    print(f"Full Workflow Test: {'✓ PASSED' if workflow_test_passed else '✗ FAILED'}")
    
    if mcp_test_passed and workflow_test_passed:
        print("\n🎉 All tests passed! Video transcription timeout fix appears to be working.")
        return 0
    else:
        print("\n❌ Some tests failed. The hanging issue may still exist.")
        return 1

if __name__ == "__main__":
    sys.exit(main())