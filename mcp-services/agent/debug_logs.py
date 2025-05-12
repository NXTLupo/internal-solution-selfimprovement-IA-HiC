import logging
import websockets

# Enable extended WebSocket debug logging
logging.basicConfig(level=logging.DEBUG)
ws_logger = logging.getLogger("websockets")
ws_logger.setLevel(logging.DEBUG)
ws_logger.addHandler(logging.StreamHandler())
