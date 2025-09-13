import asyncio
import websockets
import json
import sys

async def test_connection(ws_url):
    print(f"Attempting to connect to: {ws_url}")
    try:
        async with websockets.connect(ws_url, ping_interval=30, ping_timeout=10, close_timeout=5) as websocket:
            print(f"✅ Connected to {ws_url}")
            
            # Send a test message
            test_message = json.dumps({
                "type": "message",
                "content": "Test message from debug script"
            })
            print(f"Sending message: {test_message}")
            await websocket.send(test_message)
            
            # Wait for a response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"Received response: {response}")
                return True
            except asyncio.TimeoutError:
                print("⚠️ No response received after 10 seconds")
                return False
                
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

async def main():
    # Test with different URLs
    urls_to_test = [
        "ws://agent-orchestrator:8500/ws/test-debug",
        "ws://agent-orchestrator:8500/ws",
        "ws://agent-orchestrator:8500/socket/test-debug",
        "ws://agent-orchestrator:8500/websocket/test-debug",
        "ws://agent-orchestrator:8500/test-debug",
        "ws://agent-orchestrator:8500/"
    ]
    
    for url in urls_to_test:
        success = await test_connection(url)
        print(f"URL {url}: {'Success' if success else 'Failed'}")
        print("-" * 50)
        
        # If we found a working connection, no need to test further
        if success:
            print(f"Found working WebSocket URL: {url}")
            break

if __name__ == "__main__":
    asyncio.run(main())
