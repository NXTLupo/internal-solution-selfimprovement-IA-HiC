#!/usr/bin/env python3
"""
Test script for AI Presentation Generator
Tests the core functionality with sample data
"""

import requests
import json
import time
import os
from pathlib import Path

# Test configuration
PRESENTATION_GENERATOR_URL = "http://localhost:5007"
TEST_DATA_DIR = Path("test_data")

def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{PRESENTATION_GENERATOR_URL}/health")
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Health Check Passed")
            print(f"   Service: {health_data.get('service')}")
            print(f"   Status: {health_data.get('status')}")
            print(f"   Anthropic API: {'✅' if health_data.get('apis_configured', {}).get('anthropic') else '❌'}")
            print(f"   OpenAI API: {'✅' if health_data.get('apis_configured', {}).get('openai') else '❌'}")
            return True
        else:
            print(f"❌ Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health Check Error: {str(e)}")
        return False

def create_test_journey_map():
    """Create a test journey map JSON file"""
    journey_map = {
        "title": "Customer Support Journey Map",
        "customer_persona": {
            "name": "Sarah, Frustrated Customer",
            "demographics": "Age 35, Tech-savvy professional",
            "needs": "Quick resolution of technical issues"
        },
        "journey_stages": [
            {
                "stage": "Awareness",
                "touchpoints": ["Website error message", "Search for help"],
                "customer_actions": ["Encounters 404 error", "Searches for support"],
                "emotions": ["Confused", "Slightly annoyed"],
                "pain_points": ["Unclear error message", "Hard to find support"],
                "opportunities": ["Clear error messaging", "Prominent help links"]
            },
            {
                "stage": "Consideration", 
                "touchpoints": ["Support portal", "Live chat widget"],
                "customer_actions": ["Browses FAQ", "Initiates chat"],
                "emotions": ["Hopeful", "Impatient"],
                "pain_points": ["Long chat queue", "Generic responses"],
                "opportunities": ["Predictive FAQ", "Smart routing"]
            },
            {
                "stage": "Resolution",
                "touchpoints": ["Support agent", "Follow-up email"],
                "customer_actions": ["Explains issue", "Follows instructions"],
                "emotions": ["Relief", "Satisfaction"],
                "pain_points": ["Multiple explanations needed"],
                "opportunities": ["Agent training", "Knowledge base improvement"]
            }
        ],
        "insights": [
            "Customers need immediate clarity when encountering errors",
            "Self-service options reduce support load",
            "Follow-up communication builds trust"
        ],
        "recommendations": [
            "Implement intelligent error messages with direct help links",
            "Create interactive troubleshooting guides",
            "Establish proactive follow-up workflows"
        ]
    }
    
    # Create test data directory
    TEST_DATA_DIR.mkdir(exist_ok=True)
    
    # Save journey map
    journey_file = TEST_DATA_DIR / "test_journey_map.json"
    with open(journey_file, 'w') as f:
        json.dump(journey_map, f, indent=2)
    
    return journey_file

def test_presentation_generation(file_path):
    """Test presentation generation with a file"""
    try:
        print(f"🧪 Testing presentation generation with: {file_path.name}")
        
        # Upload file and start generation
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/json')}
            data = {'presentation_type': 'professional'}
            
            response = requests.post(f"{PRESENTATION_GENERATOR_URL}/api/upload", files=files, data=data)
        
        if response.status_code != 200:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
        
        upload_result = response.json()
        job_id = upload_result.get('job_id')
        
        if not job_id:
            print("❌ No job ID returned")
            return False
        
        print(f"✅ Upload successful. Job ID: {job_id}")
        
        # Poll for completion
        max_wait = 300  # 5 minutes
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status_response = requests.get(f"{PRESENTATION_GENERATOR_URL}/api/status/{job_id}")
            
            if status_response.status_code != 200:
                print(f"❌ Status check failed: {status_response.status_code}")
                return False
            
            status_data = status_response.json()
            status = status_data.get('status')
            stage = status_data.get('stage', 'unknown')
            
            print(f"📊 Status: {status} - Stage: {stage}")
            
            if status == 'completed':
                print("✅ Presentation generation completed!")
                
                # Test download
                download_response = requests.get(f"{PRESENTATION_GENERATOR_URL}/api/download/{job_id}")
                
                if download_response.status_code == 200:
                    output_file = TEST_DATA_DIR / f"generated_presentation_{job_id}.pptx"
                    with open(output_file, 'wb') as f:
                        f.write(download_response.content)
                    print(f"✅ Presentation downloaded: {output_file}")
                    
                    # Test analysis endpoint
                    analysis_response = requests.get(f"{PRESENTATION_GENERATOR_URL}/api/analysis/{job_id}")
                    if analysis_response.status_code == 200:
                        analysis_data = analysis_response.json()
                        analysis = analysis_data.get('analysis', {})
                        print(f"✅ Analysis retrieved: {len(analysis.get('slides', []))} slides generated")
                    
                    return True
                else:
                    print(f"❌ Download failed: {download_response.status_code}")
                    return False
            
            elif status == 'failed':
                error = status_data.get('error', 'Unknown error')
                print(f"❌ Generation failed: {error}")
                return False
            
            time.sleep(5)  # Wait 5 seconds before next check
        
        print("❌ Generation timed out")
        return False
        
    except Exception as e:
        print(f"❌ Test error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing AI Presentation Generator")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Health Check Test")
    if not test_health_check():
        print("❌ Health check failed. Is the service running?")
        return
    
    # Test 2: Create test data
    print("\n2. Creating Test Data")
    try:
        journey_file = create_test_journey_map()
        print(f"✅ Test journey map created: {journey_file}")
    except Exception as e:
        print(f"❌ Failed to create test data: {str(e)}")
        return
    
    # Test 3: Presentation Generation
    print("\n3. Presentation Generation Test")
    if test_presentation_generation(journey_file):
        print("✅ All tests passed!")
    else:
        print("❌ Presentation generation test failed")

if __name__ == "__main__":
    main()