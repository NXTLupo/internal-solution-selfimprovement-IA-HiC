import os
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await websocket.accept()
    await websocket.send_json({"type": "status", "status": "connected", "message": "WebSocket test connection successful"})
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "message", "content": f"Echo: {data}"})
    except Exception as e:
        print(f"WebSocket error: {e}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8500))
    uvicorn.run(app, host="0.0.0.0", port=port)
