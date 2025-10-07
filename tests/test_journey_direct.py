#!/usr/bin/env python3
"""
Direct test of journey mapping process to isolate issues
"""

import requests
import json
import time

def test_journey_mapper_direct():
    """Test the journey mapper directly"""
    print("🗺️  Testing Journey Mapper Direct API...")
    
    journey_mapper_url = "http://localhost:8080"
    
    try:
        # Read the test file
        test_file_path = "/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/test_journey.txt"
        
        with open(test_file_path, "rb") as f:
            files = {"files": ("test_journey.txt", f, "text/plain")}
            data = {
                "title": "Test Journey Map",
                "description": "Direct test of journey mapping",
                "journey_type": "customer_journey",
                "llm_model": "claude-3-7-sonnet-20250219"
            }
            
            print(f"📤 Sending request to {journey_mapper_url}/api/analyze...")
            start_time = time.time()
            
            response = requests.post(
                f"{journey_mapper_url}/api/analyze",
                files=files,
                data=data,
                timeout=60  # 1 minute timeout for direct test
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"⏱️  Request completed in {duration:.2f} seconds")
            
            if response.status_code == 200:
                result = response.json()
                journey_id = result.get("journey_id")
                print(f"✅ Journey map created successfully!")
                print(f"🆔 Journey ID: {journey_id}")
                return True
            else:
                print(f"❌ Journey mapper returned error: {response.status_code}")
                print(f"📄 Response: {response.text}")
                return False
                
    except requests.exceptions.ReadTimeout:
        print("⏰ Journey mapper request timed out (>60 seconds)")
        return False
    except Exception as e:
        print(f"❌ Error testing journey mapper: {e}")
        return False

def test_journey_mcp_direct():
    """Test the journey MCP service directly"""
    print("\n🔧 Testing Journey MCP Direct API...")
    
    journey_mcp_url = "http://localhost:8503"
    
    try:
        # Read the test file
        test_file_path = "/Users/jonathanlupo/Documents/NXT HUMANS_AI_CX_WORKBENCH/test_journey.txt"
        
        with open(test_file_path, "rb") as f:
            files = {"file": ("test_journey.txt", f, "text/plain")}
            data = {
                "journey_name": "Test Journey Map via MCP",
                "description": "Direct test of MCP service"
            }
            
            print(f"📤 Sending request to {journey_mcp_url}/mcp/invoke/journey_generate_map...")
            start_time = time.time()
            
            response = requests.post(
                f"{journey_mcp_url}/mcp/invoke/journey_generate_map",
                files=files,
                data=data,
                timeout=90  # 90 seconds timeout for MCP test
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"⏱️  Request completed in {duration:.2f} seconds")
            
            if response.status_code == 200:
                result = response.json()
                journey_id = result.get("journey_id")
                print(f"✅ Journey MCP processed successfully!")
                print(f"🆔 Journey ID: {journey_id}")
                return journey_id
            else:
                print(f"❌ Journey MCP returned error: {response.status_code}")
                print(f"📄 Response: {response.text}")
                return None
                
    except requests.exceptions.ReadTimeout:
        print("⏰ Journey MCP request timed out (>90 seconds)")
        return None
    except Exception as e:
        print(f"❌ Error testing journey MCP: {e}")
        return None

def test_journey_results(journey_id):
    """Test getting journey results"""
    print(f"\n📋 Testing Journey Results for ID: {journey_id}...")
    
    journey_mcp_url = "http://localhost:8503"
    
    try:
        data = {"journey_id": journey_id}
        
        response = requests.post(
            f"{journey_mcp_url}/mcp/invoke/journey_get_results",
            data=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Journey results retrieved successfully!")
            print(f"🔗 Visualization URL: {result.get('visualization_url', 'Not provided')}")
            return True
        else:
            print(f"❌ Failed to get journey results: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error getting journey results: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Direct Journey Mapping Tests\n")
    
    # Test 1: Direct journey mapper
    print("=" * 50)
    direct_success = test_journey_mapper_direct()
    
    # Test 2: Journey MCP service  
    print("=" * 50)
    journey_id = test_journey_mcp_direct()
    
    if journey_id:
        # Test 3: Get results
        print("=" * 50)
        results_success = test_journey_results(journey_id)
        
        if results_success:
            print("\n🎉 All direct tests passed!")
        else:
            print("\n⚠️ MCP processing worked, but results retrieval failed")
    elif direct_success:
        print("\n⚠️ Direct journey mapper works, but MCP wrapper has issues")
    else:
        print("\n❌ Journey mapper itself is having issues")