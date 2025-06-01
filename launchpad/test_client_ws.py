import asyncio
import websockets
import json
import sys

async def test_client_connection():
    # This URL mimics what the browser would connect to
    ws_url = "ws://localhost:8000/ws-proxy/test-debug-client"
    print(f"Attempting to connect to launchpad proxy: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print(f"✅ Connected to {ws_url}")
            
            # Wait for initial connection status message
            try:
                initial_msg = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"Received status message: {initial_msg}")
                
                # Send a test message
                test_message = json.dumps({
                    "type": "message",
                    "content": "Test message from client"
                })
                print(f"Sending message: {test_message}")
                await websocket.send(test_message)
                
                # Wait for response with timeout
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10)
                    print(f"Received response: {response}")
                    return True
                except asyncio.TimeoutError:
                    print("⚠️ No response received after 10 seconds")
                    return False
            except asyncio.TimeoutError:
                print("⚠️ No initial status message received after 5 seconds")
                return False
                
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    asyncio.run(test_client_connection())
