import pytest
import os
import sys
from unittest.mock import patch, MagicMock

# Add the backend directory to the path so imports work correctly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

# This is crucial - make Python treat the 'app' directory as a package
app_dir = os.path.join(backend_dir, 'app')
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

# Create a patched version of environmental variables
@pytest.fixture(scope="session", autouse=True)
def patch_env_vars():
    """
    Patch environment variables for testing.
    This ensures tests run with consistent environment values.
    """
    env_vars = {
        'REDDIT_CLIENT_ID': 'test_client_id',
        'REDDIT_CLIENT_SECRET': 'test_client_secret',
        'REDDIT_USER_AGENT': 'test_user_agent',
        'TOPIC_LOG_DIR': './test/logs/test_logs',
        'OPENAI_API_KEY': 'test_openai_key',
        'DATABASE_URL': 'sqlite:///:memory:'
    }
    
    with patch.dict(os.environ, env_vars):
        yield

# Mock the problematic modules to break circular dependencies
@pytest.fixture(scope="session", autouse=True)
def mock_app_modules():
    """
    Mock the problematic app modules to avoid circular imports.
    """
    # Create mock modules 
    mocked_modules = {
        'app.routes.api': MagicMock(),
        'app.routes.api_topic_model': MagicMock(),
        'app.routes.api_llm_analyzer': MagicMock(),
        'util.topic_model.BertTopic': MagicMock(),
        'bertopic': MagicMock(),
        'bertopic.BERTopic': MagicMock(),
        'app.db.config.database': MagicMock(),
        'app.repositories.reddit_repository': MagicMock(),
    }
    
    # Apply mocks
    with patch.dict('sys.modules', mocked_modules):
        yield mocked_modules

# Setup a mock version of topic_model_bp for tests
@pytest.fixture
def mock_topic_model_bp():
    """
    Create a mock topic_model_bp for testing.
    """
    from flask import Blueprint
    mock_bp = Blueprint('topic_model', __name__)
    
    # Add any routes or functionality needed for testing
    
    return mock_bp

# NOTE: Disabling the database patching as it's causing import errors
# Each test should mock their own database dependencies as needed
# @pytest.fixture(scope="session", autouse=True)
# def patch_database_session():
#     """
#     Patch the database SessionLocal to avoid real DB connections.
#     """
#     with patch('app.db.config.database.create_engine'):
#         with patch('app.db.config.database.sessionmaker'):
#             yield

# Ensure our log directories exist
@pytest.fixture(scope="session", autouse=True)
def ensure_log_dirs():
    """
    Ensure log directories exist for tests.
    """
    os.makedirs('./test/logs/test_logs', exist_ok=True)
    os.makedirs('./test/logs/test_logs/topic_sentiment', exist_ok=True)
    yield
    # Optionally clean up after tests (commented out to keep logs for inspection)
    # import shutil
    # shutil.rmtree('./test/logs/test_logs', ignore_errors=True)

# Silence certain warnings during testing
@pytest.fixture(scope="session", autouse=True)
def silence_warnings():
    """
    Silence specific warnings that might clutter test output.
    """
    import warnings
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    warnings.filterwarnings("ignore", category=ResourceWarning)
    yield

# Create a fixture for the mock Reddit API
@pytest.fixture
def mock_reddit():
    """
    Create a mock Reddit API.
    This is useful for tests that need to interact with Reddit.
    """
    # Return a simple MagicMock instead of patching
    return MagicMock() 