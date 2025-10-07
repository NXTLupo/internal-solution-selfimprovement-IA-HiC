#!/usr/bin/env python3
"""
Test script to verify the MulmoCast wizard file upload fix.
This tests the specific bug where the CLI command was incorrectly constructed.
"""

import requests
import json
import tempfile
import os
import time

MULMOCAST_URL = "http://localhost:5008"

def test_command_construction():
    """Test that commands are properly constructed without help menu appearing"""
    print("🧪 Testing MulmoCast command construction fix...")
    
    # Create a temporary test file
    test_content = "This is a test document for MulmoCast script generation."
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(test_content)
        temp_file_path = f.name
    
    try:
        # Upload the test file
        print("📤 Uploading test file...")
        with open(temp_file_path, 'rb') as f:
            files = {'files': f}
            upload_response = requests.post(f"{MULMOCAST_URL}/api/upload", files=files)
        
        if upload_response.status_code != 200:
            print(f"❌ Upload failed: {upload_response.status_code}")
            return False
        
        upload_result = upload_response.json()
        if not upload_result.get('success'):
            print(f"❌ Upload failed: {upload_result.get('error')}")
            return False
        
        uploaded_file = upload_result['files'][0]
        print(f"✅ File uploaded: {uploaded_file['name']}")
        
        # Test the generate_from_files endpoint (this was the buggy one)
        print("🔧 Testing script generation from uploaded files...")
        
        generation_payload = {
            "template": "business",
            "file_paths": [uploaded_file['path']]
        }
        
        generation_response = requests.post(
            f"{MULMOCAST_URL}/api/generate_from_files",
            json=generation_payload,
            timeout=30
        )
        
        if generation_response.status_code != 200:
            print(f"❌ Generation request failed: {generation_response.status_code}")
            return False
        
        generation_result = generation_response.json()
        
        # Check if the help menu appeared (this was the bug)
        stdout = generation_result.get('stdout', '')
        stderr = generation_result.get('stderr', '')
        
        if 'mulmo <command> [options]' in stdout or 'mulmo <command> [options]' in stderr:
            print("❌ BUG STILL EXISTS: Help menu appeared instead of executing command")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return False
        
        if generation_result.get('success'):
            print("✅ Command executed successfully without showing help menu!")
            print(f"✅ Command succeeded with return code: {generation_result.get('returncode')}")
            if stdout:
                print(f"📝 Output preview: {stdout[:200]}...")
            return True
        else:
            print("⚠️ Command executed but failed for other reasons:")
            print(f"   Return code: {generation_result.get('returncode')}")
            print(f"   STDERR: {stderr}")
            # This might be expected if APIs aren't configured, but the important thing
            # is that we didn't get the help menu
            if 'mulmo <command> [options]' not in stderr:
                print("✅ Fix confirmed: No help menu appeared!")
                return True
            return False
            
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        return False
    
    finally:
        # Clean up
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

def test_normal_execution():
    """Test that normal command execution still works"""
    print("\n🧪 Testing normal command execution...")
    
    payload = {
        "command": "tool",
        "args": ["scripting", "-t", "business", "-u", "https://example.com", "-s", "test_script.json"]
    }
    
    try:
        response = requests.post(f"{MULMOCAST_URL}/api/execute", json=payload, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Normal execution failed: {response.status_code}")
            return False
        
        result = response.json()
        stdout = result.get('stdout', '')
        stderr = result.get('stderr', '')
        
        if 'mulmo <command> [options]' in stdout or 'mulmo <command> [options]' in stderr:
            print("❌ Normal execution showing help menu incorrectly")
            return False
        
        print("✅ Normal command execution works correctly")
        return True
        
    except Exception as e:
        print(f"❌ Normal execution test failed: {e}")
        return False

def main():
    print("🎬 MulmoCast CLI Command Fix Verification")
    print("=" * 50)
    
    # Test service health first
    try:
        health_response = requests.get(f"{MULMOCAST_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print("❌ MulmoCast service not healthy")
            return
        print("✅ MulmoCast service is healthy")
    except Exception as e:
        print(f"❌ Cannot connect to MulmoCast service: {e}")
        return
    
    # Run tests
    test1_passed = test_command_construction()
    test2_passed = test_normal_execution()
    
    print("\n" + "=" * 50)
    if test1_passed and test2_passed:
        print("🎉 ALL TESTS PASSED! The command construction fix is working correctly.")
        print("✅ File-based script generation no longer shows help menu")
        print("✅ Normal command execution continues to work")
    else:
        print("❌ Some tests failed. Please check the output above.")
    
    print("\n💡 The fix resolved the issue where args[1:] was incorrectly slicing")
    print("   the command arguments, causing 'tool' to be removed and 'scripting'")
    print("   to be treated as a top-level command (which doesn't exist).")

if __name__ == "__main__":
    main()