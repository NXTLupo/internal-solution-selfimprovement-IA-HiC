"""
Common test fixtures for API testing.
"""
import pytest
from unittest.mock import MagicMock, patch
import os
from flask import Flask

# Fixtures for API testing
@pytest.fixture
def app_with_mock_services():
    """
    Create a Flask app with mocked services for testing.
    This fixture avoids actual service initialization by mocking them.
    """
    from app.routes.api_topic_model import topic_model_bp
    
    # Mock services needed by the app
    with patch('app.routes.api_topic_model.reddit', new=MagicMock()), \
         patch('app.routes.api_topic_model.JobsRepository', new=MagicMock()), \
         patch('app.routes.api_topic_model.RedditRepository', new=MagicMock()):
        
        # Create app and register blueprint
        app = Flask(__name__)
        app.register_blueprint(topic_model_bp, url_prefix='/api/topic-model')
        app.config['TESTING'] = True
        
        yield app

@pytest.fixture
def client(app_with_mock_services):
    """Create a test client for the Flask app"""
    return app_with_mock_services.test_client()

@pytest.fixture
def mock_db_session():
    """Create a mock database session"""
    mock_session = MagicMock()
    
    with patch('app.routes.api_topic_model.SessionLocal', return_value=mock_session):
        yield mock_session

@pytest.fixture
def mock_job_repo():
    """Create a mock jobs repository"""
    mock_repo = MagicMock()
    
    def mock_create_job(job_id, user_id, parameters):
        """Mock implementation of create_job"""
        return {
            'job_id': job_id,
            'user_id': user_id,
            'status': 'pending',
            'parameters': parameters
        }
    
    def mock_update_job_status(job_id, status, message, progress=None, analysis_id=None, error=None):
        """Mock implementation of update_job_status"""
        return {
            'job_id': job_id,
            'status': status,
            'message': message,
            'progress': progress,
            'analysis_id': analysis_id,
            'error': error
        }
    
    # Set up mock methods
    mock_repo.create_job.side_effect = mock_create_job
    mock_repo.update_job_status.side_effect = mock_update_job_status
    mock_repo.get_job.return_value = None
    
    with patch('app.routes.api_topic_model.JobsRepository', return_value=mock_repo):
        yield mock_repo

# Integration test fixtures
@pytest.fixture
def mock_topic_model():
    """Create a mock topic model"""
    mock_model = MagicMock()
    
    # Set up mock methods for topic model
    topic_info = MagicMock()
    topic_info.nlargest.return_value = topic_info
    topic_info.itertuples.return_value = [
        type('obj', (object,), {'Topic': 1, 'Count': 10, 'Name': 'Topic 1'}),
        type('obj', (object,), {'Topic': 2, 'Count': 8, 'Name': 'Topic 2'})
    ]
    
    mock_model.get_topic_info.return_value = topic_info
    mock_model.get_topic.return_value = [("term1", 0.8), ("term2", 0.6)]
    
    return mock_model

@pytest.fixture
def mock_analyze_topics():
    """Mock analyze_topics function from BertTopic"""
    mock_topic_model = MagicMock()
    mock_topic_info = MagicMock()
    
    with patch('util.topic_model.BertTopic.analyze_topics', 
               return_value=(mock_topic_model, [1, 2], None)):
        yield

@pytest.fixture
def sample_reddit_data():
    """
    Provide sample Reddit data for tests.
    This avoids making actual API calls to Reddit.
    """
    return [
        {
            "id": "post1",
            "title": "Sample Post 1",
            "selftext": "This is a sample post for testing",
            "author": "user1",
            "created_utc": 1620000000,
            "score": 10,
            "comments": [
                {
                    "id": "comment1",
                    "body": "This is a comment",
                    "author": "user2",
                    "created_utc": 1620000100,
                    "score": 5
                }
            ]
        },
        {
            "id": "post2",
            "title": "Sample Post 2",
            "selftext": "Another sample post",
            "author": "user3",
            "created_utc": 1620100000,
            "score": 15,
            "comments": []
        }
    ] 