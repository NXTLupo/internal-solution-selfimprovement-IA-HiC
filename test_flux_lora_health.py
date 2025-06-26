#!/usr/bin/env python3
"""
Test FLUX LoRA Studio and Image Captioner connectivity from host
Run this from the host machine to check Docker service status
"""
import requests
import json
import time

def test_service_health(service_name, url, timeout=10):
    """Test health of a service"""
    print(f"\n=== Testing {service_name} ===")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=timeout)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2)}")
                return True
            except:
                text = response.text
                print(f"Response: {text[:200]}...")
                return True
        else:
            print(f"Error: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"Connection failed: {type(e).__name__}: {e}")
        return False

def main():
    """Main test function"""
    print("🎨 FLUX LoRA Studio & A11y Image Captioner Service Test")
    print("=" * 60)
    
    services = [
        ("A11y Image Captioner", "http://localhost:5005/health"),
        ("FLUX LoRA Studio", "http://localhost:5006/health"),
        ("Launchpad (Main Hub)", "http://localhost:8000/health"),
    ]
    
    results = {}
    
    for service_name, url in services:
        results[service_name] = test_service_health(service_name, url)
        time.sleep(1)  # Brief pause between tests
    
    print("\n" + "=" * 60)
    print("📋 SUMMARY")
    print("=" * 60)
    
    all_healthy = True
    for service_name, is_healthy in results.items():
        status = "✅ HEALTHY" if is_healthy else "❌ FAILED"
        print(f"{service_name}: {status}")
        if not is_healthy:
            all_healthy = False
    
    if all_healthy:
        print("\n🎉 All services are healthy! Auto-captioning should work properly.")
    else:
        print("\n⚠️  Some services are not responding. Check Docker logs:")
        print("   docker compose -f docker-compose-all.yml logs flux-lora-studio")
        print("   docker compose -f docker-compose-all.yml logs image-captioner")
    
    print("\n🐳 Docker Commands:")
    print("   Start: ./launch.sh")
    print("   Logs:  docker compose -f docker-compose-all.yml logs -f")
    print("   Stop:  docker compose -f docker-compose-all.yml down")

if __name__ == "__main__":
    main()