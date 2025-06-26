#!/usr/bin/env python3
"""
Test script for the Presentation Generator service upload functionality
"""

import requests
import json
import os
from pathlib import Path

# Service URL
SERVICE_URL = "http://localhost:5007"

def test_health():
    """Test the health endpoint"""
    try:
        response = requests.get(f"{SERVICE_URL}/health")
        print(f"Health Check Status: {response.status_code}")
        print(f"Health Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_upload():
    """Test file upload functionality"""
    try:
        # Create a test file
        test_file_path = "/tmp/test_presentation_content.txt"
        with open(test_file_path, "w") as f:
            f.write("""
            Test Presentation Content
            
            This is a test document for the presentation generator.
            
            Key Points:
            - Point 1: Introduction to the topic
            - Point 2: Main findings and analysis
            - Point 3: Recommendations and next steps
            
            Conclusion:
            This test document should be processed by the AI presentation generator.
            """)
        
        # Upload the file
        with open(test_file_path, "rb") as f:
            files = {"files": ("test_content.txt", f, "text/plain")}
            response = requests.post(f"{SERVICE_URL}/upload", files=files)
        
        print(f"Upload Status: {response.status_code}")
        print(f"Upload Response: {response.json()}")
        
        # Clean up
        os.remove(test_file_path)
        
        return response.status_code == 200, response.json()
        
    except Exception as e:
        print(f"Upload test failed: {e}")
        return False, None

def test_generate(file_ids):
    """Test presentation generation"""
    try:
        # Send request with proper structure
        payload = {
            "file_ids": file_ids,
            "options": {
                "theme": "professional",
                "template": "default"
            }
        }
        response = requests.post(f"{SERVICE_URL}/generate", json=payload)
        
        print(f"Generate Status: {response.status_code}")
        print(f"Generate Response: {response.json()}")
        
        return response.status_code == 200, response.json()
        
    except Exception as e:
        print(f"Generation test failed: {e}")
        return False, None

def test_status(job_id):
    """Test status checking"""
    try:
        response = requests.get(f"{SERVICE_URL}/status/{job_id}")
        
        print(f"Status Check Status: {response.status_code}")
        print(f"Status Response: {response.json()}")
        
        return response.status_code == 200, response.json()
        
    except Exception as e:
        print(f"Status check failed: {e}")
        return False, None

def main():
    """Run all tests"""
    print("=== Testing Presentation Generator Service ===\n")
    
    # Test 1: Health check
    print("1. Testing Health Endpoint:")
    if not test_health():
        print("Health check failed - service may not be running")
        return
    print("✅ Health check passed\n")
    
    # Test 2: File upload
    print("2. Testing File Upload:")
    upload_success, upload_data = test_upload()
    if not upload_success:
        print("❌ Upload test failed")
        return
    print("✅ Upload test passed\n")
    
    # Test 3: Presentation generation
    print("3. Testing Presentation Generation:")
    print(f"Upload data keys: {list(upload_data.keys()) if upload_data else 'None'}")
    if upload_data:
        # Handle both possible response formats
        if 'file_ids' in upload_data:
            file_ids = upload_data['file_ids']
        elif 'files' in upload_data:
            file_ids = [f['id'] for f in upload_data['files']]
        else:
            print("❌ No file IDs found in upload response")
            return
        generate_success, generate_data = test_generate(file_ids)
        if not generate_success:
            print("❌ Generation test failed")
            return
        print("✅ Generation test passed\n")
        
        # Test 4: Status checking
        print("4. Testing Status Check:")
        if generate_data and 'job_id' in generate_data:
            job_id = generate_data['job_id']
            status_success, status_data = test_status(job_id)
            if not status_success:
                print("❌ Status check failed")
                return
            print("✅ Status check passed\n")
    
    print("=== All tests completed successfully! ===")

if __name__ == "__main__":
    main()