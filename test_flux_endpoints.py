#!/usr/bin/env python3
"""
Test FLUX LoRA Studio endpoints to diagnose 404 issues
"""
import requests
import json

def test_endpoints():
    """Test specific endpoints that are failing"""
    base_url = "http://localhost:5006"
    
    print("🔍 Testing FLUX LoRA Studio Endpoints")
    print("=" * 50)
    
    # Test health endpoint first
    print("\n1️⃣ Health Check:")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            health = response.json()
            print(f"   Service: {health.get('service', 'unknown')}")
            print(f"   Mode: {health.get('training_mode', 'unknown')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test root endpoint
    print("\n2️⃣ Root Endpoint:")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text[:200]}...")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test API endpoints that are failing
    failing_endpoints = [
        "/api/start-colab-training",
        "/api/colab-status", 
        "/api/system-info",
        "/api/projects"
    ]
    
    print(f"\n3️⃣ Testing API Endpoints:")
    for endpoint in failing_endpoints:
        try:
            if endpoint == "/api/start-colab-training":
                # POST endpoint - test with mock data
                mock_data = {
                    "project_id": "test-123",
                    "project_name": "test",
                    "trigger_word": "test",
                    "train_steps": 100,
                    "learning_rate": 1e-4,
                    "lora_rank": 16,
                    "colab_runtime": "t4",
                    "config_format": "json",
                    "enable_sample_generation": True,
                    "enable_logging": True,
                    "auto_download": False
                }
                response = requests.post(
                    f"{base_url}{endpoint}",
                    headers={"Content-Type": "application/json"},
                    json=mock_data,
                    timeout=5
                )
            else:
                # GET endpoint
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
            
            print(f"   {endpoint}: {response.status_code}")
            if response.status_code not in [200, 404, 422]:  # 422 is validation error, expected for mock data
                print(f"      Error: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   {endpoint}: Error - {e}")
    
    print(f"\n4️⃣ Test Manual API Discovery:")
    try:
        # Try to get OpenAPI docs
        response = requests.get(f"{base_url}/docs", timeout=5)
        print(f"   /docs: {response.status_code}")
        
        response = requests.get(f"{base_url}/openapi.json", timeout=5)
        print(f"   /openapi.json: {response.status_code}")
        if response.status_code == 200:
            openapi = response.json()
            print(f"   Available paths: {len(openapi.get('paths', {}))}")
            
    except Exception as e:
        print(f"   API docs error: {e}")
    
    print(f"\n" + "=" * 50)
    print("💡 Troubleshooting suggestions:")
    print("   1. Check if Docker container is running: docker ps")
    print("   2. Check container logs: docker logs flux-lora-studio")
    print("   3. Restart container: docker compose restart flux-lora-studio")
    print("   4. Check if port 5006 is accessible: curl http://localhost:5006/health")

if __name__ == "__main__":
    test_endpoints()