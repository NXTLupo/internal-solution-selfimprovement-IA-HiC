import os
import sys

# Make `util` and `app` importable when pytest runs from the backend directory or above.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# util.llm_models.claude builds an Anthropic client at import time, which needs some key
# value. Tests mock every model call, so a placeholder is enough when no key is set.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-placeholder-not-a-real-key")
