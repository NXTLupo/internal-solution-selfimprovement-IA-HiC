"""
Integration tests for topic model API endpoints.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from flask import Flask

# Import the real blueprint to test actual implementation
from app.routes.api_topic_model import topic_model_bp

# Test suite for the topic model API endpoints
class TestTopicModelEndpoint:
    """Test the topic model API endpoints."""
    
    @patch('app.routes.api_topic_model.JobsRepository')
    @patch('app.routes.api_topic_model.SessionLocal')
    @patch('app.routes.api_topic_model.generate_job_id')
    @patch('app.routes.api_topic_model.Thread')
    @patch('app.routes.api_topic_model.Event')
    @patch.dict('app.routes.api_topic_model.running_jobs', {})
    def test_analyze_async_endpoint_success(self, mock_event, mock_thread, mock_generate_job_id, mock_session_local, mock_jobs_repo_class, client):
        """Test the /analyze-async endpoint with valid input data."""
        # Setup mock job ID
        mock_job_id = "test-job-123"
        mock_generate_job_id.return_value = mock_job_id
        
        # Setup mock event for job cancellation
        mock_event_instance = MagicMock()
        mock_event.return_value = mock_event_instance
        
        # Setup mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Setup mock repository instance and bypass database operations
        mock_jobs_repo = MagicMock()
        mock_jobs_repo_class.return_value = mock_jobs_repo
        
        # Create a mock job that we'll return directly without touching the database
        mock_job = create_mock_job(job_id=mock_job_id)
        
        # Important: We're bypassing the actual database operation completely
        def mock_create_job(job_id, user_id, parameters, analysis_id=None):
            return mock_job
            
        mock_jobs_repo.create_job.side_effect = mock_create_job
        
        # Mock Thread so we don't actually start a background thread
        mock_thread_instance = MagicMock()
        mock_thread.return_value = mock_thread_instance
        
        # Test data
        test_data = {
            "subreddit": "python",
            "num_posts": 10,
            "max_comments": 2,
            "sort": "new",
            "user_id": "123",
            "project_id": "test-project-123"
        }
        
        # Make the request
        response = client.post(
            '/api/topic-model/analyze-async',
            json=test_data,
            content_type='application/json'
        )
        
        # Check the response
        assert response.status_code == 202
        response_data = json.loads(response.data)
        
        # Verify response structure
        assert 'job_id' in response_data
        assert 'status' in response_data
        assert response_data['status'] == "pending"
        assert response_data['job_id'] == mock_job_id
        
        # Verify mock_thread was started for background processing
        mock_thread_instance.start.assert_called_once()
    
    def test_analyze_async_endpoint_missing_subreddit(self, client):
        """Test the /analyze-async endpoint with missing subreddit field."""
        # Test data with missing subreddit
        test_data = {
            "num_posts": 10,
            "max_comments": 2,
            "user_id": "123"
        }
        
        # Make the request
        response = client.post(
            '/api/topic-model/analyze-async',
            json=test_data,
            content_type='application/json'
        )
        
        # Check the response
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'error' in response_data
        assert 'Subreddit name is required' in response_data['error']

# Fixtures for test setup
@pytest.fixture
def app():
    """Create and configure a Flask app for testing"""
    app = Flask(__name__)
    app.register_blueprint(topic_model_bp, url_prefix='/api/topic-model')
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Create a test client for the app"""
    return app.test_client()

# Mock data helper functions
def create_mock_job(job_id="test-job-123", status="pending", message="Job submitted", progress=0, error=None):
    """Create a mock job for testing"""
    job = MagicMock()
    job.id = job_id
    job.status = status
    job.message = message
    job.progress = progress
    job.error = error
    job.created_at = MagicMock()
    job.created_at.isoformat.return_value = "2023-01-01T00:00:00"
    job.updated_at = MagicMock()
    job.updated_at.isoformat.return_value = "2023-01-01T00:01:00"
    job.analysis_id = None if status in ["pending", "processing", "failed"] else "analysis-123"
    job.user_id = "123"
    return job

def create_mock_reddit_result(analysis_id="test-project-123"):
    """Create a mock reddit analysis result"""
    result = MagicMock()
    result.id = analysis_id
    result.user_id = "123"
    result.data = {}
    result.created_at = MagicMock()
    result.created_at.isoformat.return_value = "2023-01-01T00:00:00"
    return result
