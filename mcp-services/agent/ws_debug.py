# Add this to the agent-orchestrator codebase to enable WebSocket debugging
import logging
logging.basicConfig(level=logging.DEBUG)

# Create a special WebSocket logger
websockets_logger = logging.getLogger('websockets')
websockets_logger.setLevel(logging.DEBUG)
websockets_logger.addHandler(logging.StreamHandler())
