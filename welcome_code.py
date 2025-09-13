#!/usr/bin/env python3
"""
Welcome Message Code for Agent WebSocket
---------------------------------------
This code adds a welcome message to the agent's WebSocket endpoint.
"""

WELCOME_CODE = """
    # Initialize conversation if needed
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)
        
    # Send initial welcome message
    logger.info(f"Sending welcome message to conversation {conversation_id}")
    try:
        await websocket.send_json({
            "type": "message",
            "content": "I'm the NXT Humans Customer Experience Workbench Assistant. I can help you analyze customer experiences using our specialized tools. How can I assist you today?"
        })
    except Exception as e:
        logger.error(f"Error sending welcome message: {str(e)}")
    
    try:
"""

ORIGINAL_CODE = """
    # Initialize conversation if needed
    if conversation_id not in conversations:
        await initialize_conversation(conversation_id)
    
    try:
"""

if __name__ == "__main__":
    print(f"ORIGINAL_CODE = '''{ORIGINAL_CODE}'''")
    print()
    print(f"WELCOME_CODE = '''{WELCOME_CODE}'''")